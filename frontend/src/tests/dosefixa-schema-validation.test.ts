import { describe, it, expect } from 'vitest';
import {
  calcDosePediatrica,
  validarFaixasDoseFixa,
  PEDIATRIC_DOSES,
  type FaixaDoseFixa,
} from '@/lib/pediatric-engine';

// ============================================================
// RM-36 — resolução do risco estrutural de doseFixa: a semântica da
// unidade (kg/meses/anos) dependia de PARSING TEXTUAL da chave da faixa
// (ex.: "3–15kg", "1–2 anos"). Uma entrada futura como `"0-2": 100`, sem
// sufixo de unidade, seria silenciosamente tratada como PESO — sem
// nenhuma validação estrutural capaz de rejeitá-la.
//
// Corrigido substituindo as chaves de string livre por `FaixaDoseFixa[]`
// — `unidade: 'kg' | 'meses' | 'anos'` é agora um campo TIPADO e
// OBRIGATÓRIO, nunca inferido de texto. `validarFaixasDoseFixa()` roda em
// tempo de carga do módulo (fail-fast) e é exercida diretamente aqui com
// dados propositalmente inválidos para provar que cada categoria de erro
// estrutural é realmente rejeitada, independentemente do TypeScript.
// ============================================================

describe('validarFaixasDoseFixa — validação estrutural obrigatória (RM-36)', () => {
  it('faixa válida (kg, semiaberta, sem sobreposição): nenhum erro', () => {
    const faixas: FaixaDoseFixa[] = [
      { unidade: 'kg', minimo: 0, maximo: 15, doseMg: 30 },
      { unidade: 'kg', minimo: 15, maximo: 23, doseMg: 45 },
      { unidade: 'kg', minimo: 23, doseMg: 60 },
    ];
    expect(validarFaixasDoseFixa(faixas, 'teste')).toEqual([]);
  });

  it('REJEITA chave/campo sem unidade (unidade undefined)', () => {
    const faixas = [{ minimo: 0, maximo: 2, doseMg: 100 }] as unknown as FaixaDoseFixa[];
    const erros = validarFaixasDoseFixa(faixas, 'teste');
    expect(erros.some(e => /unidade/i.test(e) && /ausente|desconhecida/i.test(e))).toBe(true);
  });

  it('REJEITA unidade desconhecida (ex.: "lbs", que não é kg/meses/anos)', () => {
    const faixas = [{ unidade: 'lbs', minimo: 0, maximo: 2, doseMg: 100 }] as unknown as FaixaDoseFixa[];
    const erros = validarFaixasDoseFixa(faixas, 'teste');
    expect(erros.some(e => /unidade/i.test(e) && /lbs/.test(e))).toBe(true);
  });

  it('REJEITA faixa invertida (maximo < minimo)', () => {
    const faixas: FaixaDoseFixa[] = [{ unidade: 'kg', minimo: 10, maximo: 5, doseMg: 100 }];
    const erros = validarFaixasDoseFixa(faixas, 'teste');
    expect(erros.some(e => /invertida/i.test(e))).toBe(true);
  });

  it('REJEITA faixa vazia (maximo === minimo — intervalo (min,max] vazio)', () => {
    const faixas: FaixaDoseFixa[] = [{ unidade: 'kg', minimo: 10, maximo: 10, doseMg: 100 }];
    const erros = validarFaixasDoseFixa(faixas, 'teste');
    expect(erros.some(e => /invertida|vazia/i.test(e))).toBe(true);
  });

  it('REJEITA limite mínimo inválido (negativo, NaN, ou não numérico)', () => {
    const negativo = validarFaixasDoseFixa([{ unidade: 'kg', minimo: -5, maximo: 10, doseMg: 100 }], 'teste');
    expect(negativo.some(e => /minimo inválido/i.test(e))).toBe(true);

    const naoNumerico = validarFaixasDoseFixa(
      [{ unidade: 'kg', minimo: '0' as unknown as number, maximo: 10, doseMg: 100 }],
      'teste',
    );
    expect(naoNumerico.some(e => /minimo inválido/i.test(e))).toBe(true);

    const infinito = validarFaixasDoseFixa([{ unidade: 'kg', minimo: NaN, maximo: 10, doseMg: 100 }], 'teste');
    expect(infinito.some(e => /minimo inválido/i.test(e))).toBe(true);
  });

  it('REJEITA limite máximo inválido (não numérico ou infinito, quando presente)', () => {
    const erros = validarFaixasDoseFixa(
      [{ unidade: 'kg', minimo: 0, maximo: Infinity, doseMg: 100 }],
      'teste',
    );
    expect(erros.some(e => /maximo inválido/i.test(e))).toBe(true);
  });

  it('REJEITA dose ausente, zero ou negativa', () => {
    const ausente = validarFaixasDoseFixa(
      [{ unidade: 'kg', minimo: 0, maximo: 10 } as unknown as FaixaDoseFixa],
      'teste',
    );
    expect(ausente.some(e => /dose ausente/i.test(e))).toBe(true);

    const zero = validarFaixasDoseFixa([{ unidade: 'kg', minimo: 0, maximo: 10, doseMg: 0 }], 'teste');
    expect(zero.some(e => /dose ausente/i.test(e))).toBe(true);

    const negativa = validarFaixasDoseFixa([{ unidade: 'kg', minimo: 0, maximo: 10, doseMg: -50 }], 'teste');
    expect(negativa.some(e => /dose ausente/i.test(e))).toBe(true);
  });

  it('REJEITA sobreposição ambígua entre duas faixas da mesma unidade (ex.: (0,15] e (10,20] se cruzam em (10,15])', () => {
    const faixas: FaixaDoseFixa[] = [
      { unidade: 'kg', minimo: 0, maximo: 15, doseMg: 30 },
      { unidade: 'kg', minimo: 10, maximo: 20, doseMg: 45 },
    ];
    const erros = validarFaixasDoseFixa(faixas, 'teste');
    expect(erros.some(e => /sobrep/i.test(e))).toBe(true);
  });

  it('REJEITA sobreposição ambígua reproduzindo o bug real anterior: faixas ambas min/max INCLUSIVOS "3–15kg" e "15–23kg" (mesmo valor de fronteira em duas faixas)', () => {
    // Representa a faixa antiga min/max-inclusivo-em-ambos-os-lados como
    // duas faixas semiabertas SOBREPOSTAS deliberadamente em 15 — exatamente
    // o cenário que causava o bug de superdosagem silenciosa por
    // "last-write-wins" no parser antigo.
    const faixas: FaixaDoseFixa[] = [
      { unidade: 'kg', minimo: 2, maximo: 15, doseMg: 30 }, // representa "3–15kg" com fronteira inclusiva nos dois lados
      { unidade: 'kg', minimo: 15, maximo: 23, doseMg: 45 }, // "15–23kg" — minimo=15 tratado como INCLUSIVO aqui de propósito
    ];
    // Como o teste força minimo=15 (em vez de exclusivo >15), simulamos a
    // condição de dupla-inclusão do bug antigo alterando manualmente a
    // interpretação: usamos maximo da primeira faixa igual ao minimo da
    // segunda MENOS margem, o que É válido no nosso schema (semiaberto).
    // Para provar que o validador realmente pega sobreposição, usamos um
    // caso genuinamente sobreposto abaixo em vez de um falso-positivo.
    const semiAbertoValido = validarFaixasDoseFixa(faixas, 'teste-semiaberto');
    expect(semiAbertoValido).toEqual([]); // (2,15] e (15,23] são adjacentes, não sobrepostas — correto

    const comSobreposicaoReal: FaixaDoseFixa[] = [
      { unidade: 'kg', minimo: 2, maximo: 15, doseMg: 30 },
      { unidade: 'kg', minimo: 14, maximo: 23, doseMg: 45 }, // minimo=14 < maximo da faixa anterior (15) → sobrepõe em (14,15]
    ];
    const erros = validarFaixasDoseFixa(comSobreposicaoReal, 'teste-sobreposto');
    expect(erros.some(e => /sobrep/i.test(e))).toBe(true);
  });

  it('NÃO rejeita faixas adjacentes de unidades DIFERENTES com números coincidentes (kg vs. anos não se confundem)', () => {
    const faixas: FaixaDoseFixa[] = [
      { unidade: 'kg', minimo: 0, maximo: 15, doseMg: 30 },
      { unidade: 'anos', minimo: 0, maximo: 15, doseMg: 999 },
    ];
    expect(validarFaixasDoseFixa(faixas, 'teste')).toEqual([]);
  });

  it('todas as entradas REAIS de PEDIATRIC_DOSES (oseltamivir, albendazol) passam na validação — nenhum erro estrutural em produção', () => {
    const erros: string[] = [];
    for (const entry of PEDIATRIC_DOSES) {
      for (const indic of entry.indicacoes) {
        if (indic.doseFixa) erros.push(...validarFaixasDoseFixa(indic.doseFixa, `${entry.drugId}/${indic.nome}`));
      }
    }
    expect(erros).toEqual([]);
  });
});

describe('calcDosePediatrica() — fronteiras exatas com o novo schema tipado (RM-36)', () => {
  it('oseltamivir — EXATAMENTE 15 kg: faixa (0,15], NÃO (15,23] — corrige o bug real de fronteira dupla-inclusiva (paciente de 15kg recebia 45mg, deveria receber 30mg)', () => {
    const r = calcDosePediatrica('oseltamivir', { pesoKg: 15, idadeMeses: 60 });
    expect(r?.doseUnitariaMg).toBe(30);
  });

  it('oseltamivir — 15,01 kg (logo acima da fronteira): já cai na faixa (15,23] → 45mg', () => {
    const r = calcDosePediatrica('oseltamivir', { pesoKg: 15.01, idadeMeses: 60 });
    expect(r?.doseUnitariaMg).toBe(45);
  });

  it('oseltamivir — EXATAMENTE 23 kg: faixa (15,23], NÃO (23,40] — mesma correção de fronteira dupla-inclusiva', () => {
    const r = calcDosePediatrica('oseltamivir', { pesoKg: 23, idadeMeses: 96 });
    expect(r?.doseUnitariaMg).toBe(45);
  });

  it('oseltamivir — EXATAMENTE 40 kg: faixa (23,40], NÃO faixa aberta (40,∞) — regressão PED-AUDIT-01', () => {
    const r = calcDosePediatrica('oseltamivir', { pesoKg: 40, idadeMeses: 120 });
    expect(r?.doseUnitariaMg).toBe(60);
  });

  it('oseltamivir — 40,01 kg (logo acima): cai na faixa aberta (40,∞) → 75mg', () => {
    const r = calcDosePediatrica('oseltamivir', { pesoKg: 40.01, idadeMeses: 120 });
    expect(r?.doseUnitariaMg).toBe(75);
  });

  it('albendazol — EXATAMENTE 24 meses (2 anos): faixa (0,2] anos, NÃO a faixa aberta (2,∞) — regressão PED-AUDIT-01', () => {
    const r = calcDosePediatrica('albendazol', { pesoKg: 13, idadeMeses: 24 });
    expect(r?.doseUnitariaMg).toBe(200);
  });

  it('albendazol — 25 meses (logo acima de 2 anos): cai na faixa aberta (2,∞) → 400mg', () => {
    const r = calcDosePediatrica('albendazol', { pesoKg: 13, idadeMeses: 25 });
    expect(r?.doseUnitariaMg).toBe(400);
  });

  it('limite aberto no topo (sem `maximo`): qualquer valor acima do último limiar cadastrado sempre resolve para uma dose, nunca null', () => {
    const r = calcDosePediatrica('oseltamivir', { pesoKg: 200, idadeMeses: 216 });
    expect(r?.doseUnitariaMg).toBe(75);
  });
});
