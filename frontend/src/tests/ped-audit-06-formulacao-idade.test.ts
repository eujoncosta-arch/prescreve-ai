import { describe, it, expect } from 'vitest';
import { calcDosePediatrica, calcIdadeCorrigida } from '@/lib/pediatric-engine';

// ============================================================
// RM-36 — resolução PED-AUDIT-06: `getFormulacaoPediatrica` usava idade
// CRONOLÓGICA (`patient.idadeMeses`) para selecionar a formulação por
// faixa etária, enquanto a elegibilidade de dose (idadeMinMeses/
// idadeMaxMeses, faixas de doseFixa por idade) já usa idade CORRIGIDA
// (`idadeEfetiva`) quando há dados gestacionais. Um prematuro cuja idade
// corrigida e cronológica caíam em faixas diferentes podia receber uma
// dose calculada para um estágio de maturidade e uma formulação sugerida
// para outro.
//
// REGRA CLÍNICA IMPLEMENTADA (ver comentário completo em
// pediatric-engine.ts, dentro de calcDosePediatrica):
//   - Faixa etária de formulação (`faixaMeses`) agora usa a MESMA base já
//     usada para elegibilidade de dose — idade CORRIGIDA quando há dados
//     gestacionais (paciente prematuro), cronológica caso contrário.
//   - Faixa de PESO de formulação (`faixaKg`) SEMPRE usa peso atual/medido
//     — não existe "peso corrigido" em pediatria.
//   - Quando a base corrigida muda QUAL formulação seria escolhida
//     (comparado à cronológica), um alerta explícito é emitido.
//   - `baseIdadeUsada` reflete se dados gestacionais foram EFETIVAMENTE
//     usados (flag explícita), nunca inferido comparando os dois números
//     por igualdade — um RN prematuro pode ter idade corrigida
//     numericamente igual à cronológica por coincidência (ambas 0 meses).
//
// Amoxicilina é usada como fixture principal por ter tanto faixas por
// IDADE quanto por PESO na mesma entrada:
//   formulacoes: [{faixaMeses:[1,24], Gotas}, {faixaMeses:[6,144], Suspensão oral},
//                 {faixaKg:[25,999], Comprimido/Cápsula}]
// ============================================================

describe('getFormulacaoPediatrica (via calcDosePediatrica) — base de idade correta e rastreável (PED-AUDIT-06)', () => {
  it('PACIENTE NÃO PREMATURO (sem dados gestacionais): formulação usa idade cronológica — comportamento anterior preservado', () => {
    const r = calcDosePediatrica('amoxicilina', { pesoKg: 12, idadeMeses: 30 });
    expect(r).not.toBeNull();
    expect(r?.formulacaoBaseIdade).toBe('cronologica');
    // 30 meses: fora da faixa [1,24) de Gotas, dentro de [6,144) de Suspensão oral.
    expect(r?.formulacaoRecomendada).toBe('Suspensão oral');
    expect(r?.alertas.some((a) => a.includes('CORRIGIDA') && a.includes('cronológica'))).toBe(false);
  });

  it('RECÉM-NASCIDO PREMATURO: base "corrigida" é reportada mesmo quando idade corrigida e cronológica COINCIDEM numericamente (nunca inferida por comparação de números)', () => {
    // IG 30 semanas, 105 dias de vida → idade corrigida = 1 mês (dentro do
    // idadeMinMeses:1 da amoxicilina). Idade cronológica informada
    // separadamente como 1 mês também — mesmo valor numérico, mas a
    // ORIGEM é diferente (uma foi calculada por correção, a outra não).
    const idadeCorrigida = calcIdadeCorrigida(30, 105);
    expect(idadeCorrigida.mesesCorrigidos).toBe(1);

    const r = calcDosePediatrica('amoxicilina', {
      pesoKg: 4,
      idadeMeses: 1, // coincide numericamente com a idade corrigida
      idadeGestacionalSemanas: 30,
      idadePostNatalDias: 105,
    });
    expect(r).not.toBeNull();
    // Mesmo com os dois valores numericamente iguais, a base relatada deve
    // ser 'corrigida' — porque dados gestacionais FORAM usados no cálculo,
    // não porque os números por acaso diferem.
    expect(r?.formulacaoBaseIdade).toBe('corrigida');
  });

  it('PREMATURO cuja idade corrigida e cronológica CRUZAM faixas diferentes: formulação segue a idade CORRIGIDA, divergência é explicitada em alerta', () => {
    // IG 28 semanas, 756 dias pós-natal (~25 meses cronológicos) →
    // idade corrigida = 22 meses.
    const idadeCorrigida = calcIdadeCorrigida(28, 756);
    expect(idadeCorrigida.mesesCorrigidos).toBe(22);
    expect(idadeCorrigida.ehPrematuro).toBe(true);

    const patient = {
      pesoKg: 11,
      idadeMeses: 25, // cronológico: FORA da faixa [1,24) de Gotas
      idadeGestacionalSemanas: 28,
      idadePostNatalDias: 756,
    };

    const r = calcDosePediatrica('amoxicilina', patient);
    expect(r).not.toBeNull();
    expect(r?.formulacaoBaseIdade).toBe('corrigida');

    // Pela idade CORRIGIDA (22 meses — dentro de [1,24)), a formulação
    // correta é Gotas — NÃO Suspensão oral (que seria selecionada pela
    // idade cronológica de 25 meses).
    expect(r?.formulacaoRecomendada).toBe('Gotas');
    expect(r?.concentracaoComum).toBe('50 mg/mL');

    // A divergência é tornada EXPLÍCITA — nunca uma troca silenciosa de base.
    const alertaDivergencia = r?.alertas.find((a) => a.includes('CORRIGIDA') && a.includes('cronológica'));
    expect(alertaDivergencia).toBeDefined();
    expect(alertaDivergencia).toMatch(/22 meses/);
    expect(alertaDivergencia).toMatch(/25 meses/);
    expect(alertaDivergencia).toMatch(/Gotas/);
    expect(alertaDivergencia).toMatch(/Suspensão oral/);
  });

  it('PREMATURO cuja idade corrigida e cronológica NÃO cruzam faixas diferentes: base corrigida é usada, mas SEM alerta de divergência de formulação (mesma formulação nos dois casos)', () => {
    // IG 34 semanas (prematuro tardio), 133 dias de vida — correção
    // pequena, ambas as idades ficam dentro da mesma faixa [1,24) de Gotas.
    const idadeCorrigida = calcIdadeCorrigida(34, 133);
    expect(idadeCorrigida.ehPrematuro).toBe(true);
    expect(idadeCorrigida.mesesCorrigidos).toBe(3);

    const patient = {
      pesoKg: 6,
      idadeMeses: 4, // cronológico — também dentro de [1,24)
      idadeGestacionalSemanas: 34,
      idadePostNatalDias: 133,
    };

    const r = calcDosePediatrica('amoxicilina', patient);
    expect(r?.formulacaoBaseIdade).toBe('corrigida');
    expect(r?.formulacaoRecomendada).toBe('Gotas');
    // Mesma formulação em ambas as bases — nenhum alerta de divergência necessário.
    expect(r?.alertas.some((a) => a.includes('CORRIGIDA') && a.includes('cronológica'))).toBe(false);
  });

  it('formulação por FAIXA DE PESO (faixaKg) NUNCA depende da idade — nem corrigida, nem cronológica', () => {
    // Ambas as idades (0 meses) ficam ABAIXO do menor limiar de faixaMeses
    // da amoxicilina (Gotas começa em 1 mês, Suspensão em 6) — só o
    // bracket de PESO (faixaKg:[25,999], Comprimido/Cápsula) pode casar.
    // Peso escolhido apenas para isolar o comportamento do bracket de
    // peso (não representa uma combinação clínica real de idade/peso).
    const semDadosGestacionais = calcDosePediatrica('amoxicilina', { pesoKg: 30, idadeMeses: 0 });
    expect(semDadosGestacionais?.formulacaoRecomendada).toBe('Comprimido / Cápsula');
    expect(semDadosGestacionais?.formulacaoBaseIdade).toBe('cronologica');

    // Mesmo resultado de formulação COM dados gestacionais presentes — a
    // seleção por peso é idêntica independentemente de idade corrigida
    // estar disponível, provando que faixaKg nunca usa idade.
    const comDadosGestacionais = calcDosePediatrica('amoxicilina', {
      pesoKg: 30,
      idadeMeses: 0,
      idadeGestacionalSemanas: 24,
      idadePostNatalDias: 5,
    });
    expect(comDadosGestacionais?.formulacaoRecomendada).toBe('Comprimido / Cápsula');
    expect(comDadosGestacionais?.concentracaoComum).toBe(semDadosGestacionais?.concentracaoComum);
  });

  it('calcIdadeCorrigida() em si — sanity check do cálculo usado como base (não deve ser alterado nesta correção)', () => {
    // Recém-nascido a termo: sem necessidade de correção.
    const termo = calcIdadeCorrigida(40, 5);
    expect(termo.ehPrematuro).toBe(false);
    expect(termo.classificacao).toBe('termo');
  });
});
