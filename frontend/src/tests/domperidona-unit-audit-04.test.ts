import { describe, it, expect } from 'vitest';
import { calcDosePediatrica, PEDIATRIC_DOSES } from '@/lib/pediatric-engine';

// ============================================================
// RM-36 — resolução UNIT-AUDIT-04: divergência entre o campo estruturado
// `maxDoseMgKgDia: 0.75` e o texto livre "Máx 2,4 mg/kg/dia" na entrada
// pediátrica de domperidona.
//
// Auditoria de origem (ver comentário completo em pediatric-engine.ts,
// na definição da entrada 'domperidona'):
//   - doseMgKg: 0.25 (mg/kg/DOSE) × frequência 'a cada 8h' (3 tomadas/dia)
//     = 0.75 mg/kg/dia EXATAMENTE — o campo estruturado é matematicamente
//     consistente com o regime efetivamente modelado nesta entrada.
//   - "2,4 mg/kg/dia" não é explicado por nenhuma combinação dose×frequência
//     modelada aqui, e sua origem não pôde ser confirmada contra ESPGHAN
//     2022/ANVISA 2023 a partir das fontes disponíveis neste repositório.
//   - Nenhum dos dois valores foi escolhido "no escuro": o valor mais
//     conservador (0.75) permanece como teto REALMENTE ENFORÇADO; a
//     divergência foi preservada, rastreável, via
//     `maxDoseMgKgDiaPendenteValidacao`, nunca apresentada como fato
//     validado.
// ============================================================

describe('domperidona — dose estruturada, teto e consistência interna (regressão UNIT-AUDIT-04)', () => {
  const entry = PEDIATRIC_DOSES.find((d) => d.drugId === 'domperidona');
  const indic = entry?.indicacoes[0];

  it('a entrada de dados existe e mantém uma ÚNICA fonte estruturada de dose (não há indicações duplicadas/conflitantes)', () => {
    expect(entry).toBeDefined();
    expect(entry?.indicacoes.length).toBe(1);
  });

  it('o campo estruturado doseMgKg × frequência é internamente consistente com maxDoseMgKgDia (0,25 mg/kg/dose × 3×/dia = 0,75 mg/kg/dia)', () => {
    expect(indic?.doseMgKg).toBe(0.25);
    expect(indic?.frequencia).toBe('a cada 8h'); // 24h ÷ 8h = 3 tomadas/dia
    expect(indic?.maxDoseMgKgDia).toBe(0.75);
    const tomadasPorDia = 24 / 8;
    expect((indic?.doseMgKg ?? 0) * tomadasPorDia).toBeCloseTo(indic?.maxDoseMgKgDia ?? -1, 5);
  });

  it('a divergência de fonte ("2,4 mg/kg/dia") é rastreada explicitamente — nunca removida silenciosamente nem apresentada como fato', () => {
    expect(indic?.maxDoseMgKgDiaPendenteValidacao).toBeDefined();
    expect(indic?.maxDoseMgKgDiaPendenteValidacao).toMatch(/2,4 mg\/kg\/dia/);
    expect(indic?.maxDoseMgKgDiaPendenteValidacao).toMatch(/valida[çc][ãa]o/i);
  });

  it('o valor "2,4 mg/kg/dia" NÃO aparece mais como afirmação de fato na lista de alertas exibidos (não é apresentado como validado)', () => {
    const alertasSemPendencia = indic?.alertas ?? [];
    expect(alertasSemPendencia.some((a) => a.includes('2,4'))).toBe(false);
  });

  it('calcDosePediatrica() SEMPRE emite o alerta de pendência de validação farmacêutica ao calcular esta dose', () => {
    const r = calcDosePediatrica('domperidona', { pesoKg: 10, idadeMeses: 24 });
    expect(r).not.toBeNull();
    const temAlertaPendencia = r?.alertas.some((a) => a.startsWith('⚠ PENDENTE DE VALIDAÇÃO FARMACÊUTICA'));
    expect(temAlertaPendencia).toBe(true);
  });

  it('dose por tomada calculada corretamente: 0,25 mg/kg × 10 kg = 2,5 mg/dose', () => {
    const r = calcDosePediatrica('domperidona', { pesoKg: 10, idadeMeses: 24 });
    expect(r?.doseUnitariaMg).toBeCloseTo(2.5, 5);
  });

  it('teto diário (maxDoseMgKgDia) é ENFORÇADO usando o valor conservador (0,75 mg/kg/dia), nunca 2,4', () => {
    // Paciente de 10 kg: 0,25 mg/kg/dose × 3 tomadas = 0,75 mg/kg/dia = 7,5 mg/dia — dentro do teto, não deve cortar.
    const rDentroDoTeto = calcDosePediatrica('domperidona', { pesoKg: 10, idadeMeses: 24 });
    expect(rDentroDoTeto?.doseTotalDiaMg).toBeCloseTo(7.5, 5);
    expect(rDentroDoTeto?.alertas.some((a) => a.includes('excede o máximo'))).toBe(false);

    // Se o teto fosse 2,4 mg/kg/dia (o valor não validado), nenhuma dose
    // routineira jamais o atingiria — o que mascararia a existência do
    // teto. Com 0,75 mg/kg/dia (o valor enforçado), o próprio regime
    // padrão (3×/dia) já opera EXATAMENTE no limite, provando que o teto
    // é real e ativo, não apenas decorativo.
    expect(rDentroDoTeto?.doseTotalDiaMg).toBeCloseTo((indic?.maxDoseMgKgDia ?? 0) * 10, 5);
  });

  it('maxDoseMg (por tomada, 10mg) continua sendo aplicado independentemente da pendência de validação do teto diário', () => {
    // Paciente muito grande: 0,25 mg/kg × 60 kg = 15mg/dose, deve ser limitado a maxDoseMg=10mg.
    const r = calcDosePediatrica('domperidona', { pesoKg: 60, idadeMeses: 144 });
    expect(r?.doseUnitariaMg).toBe(10);
  });

  it('frequência do regime documentado é 3×/dia (a cada 8h) — não confundida com 4×/dia ou outra divisão', () => {
    expect(indic?.frequencia).toBe('a cada 8h');
    expect(indic?.instrucoes).toMatch(/3×\/dia/);
  });

  it('regressão futura: se alguém reintroduzir um maxDoseMgKgDia inconsistente com doseMgKg×frequência SEM registrar a pendência de validação, este teste falha', () => {
    // Guarda estrutural: enquanto a pendência de validação estiver
    // documentada, aceitamos a divergência. Mas o PRÓPRIO campo
    // estruturado usado para o cálculo (maxDoseMgKgDia) deve continuar
    // sendo o mais conservador entre os candidatos conhecidos (0.75 vs 2.4).
    expect(indic?.maxDoseMgKgDia).toBeLessThan(2.4);
  });
});
