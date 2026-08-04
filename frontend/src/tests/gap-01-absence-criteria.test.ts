// ============================================================
// GAP-01 — Critérios de AUSÊNCIA de sintoma não podem tratar "dado não
// coletado" como "sintoma explicitamente negado"
//
// Achado original: RM-64 (docs/RM-64-CLINICAL-JOURNEY-MATRIX.md, CJ-010).
// Causa raiz: a regra 'faringoamigdalite' (clinical-decision-support.ts)
// tinha 2 critérios usando `!has(texto, 'palavra')` para pontuar "ausência
// de sintoma" — como `''.includes(qualquerCoisa)` é sempre `false`, a
// negação de um campo simplesmente VAZIO (`queixa_principal`/`hda` nunca
// preenchidos) virava `true` e pontuava como se o médico tivesse
// ativamente descartado o sintoma. Uma anamnese totalmente vazia cruzava
// `peso_minimo_para_incluir` só com esses 2 critérios (3+3=6 ≥ 5) e
// gerava uma hipótese sem nenhum dado real de suporte.
//
// Correção: `absenceOf()` (novo helper interno) exige texto não-vazio
// antes de contar a ausência da palavra-chave como evidência. Nenhuma
// regra clínica nova foi criada — só a condição de "dado ausente" deixou
// de ser tratada como "sintoma negado".
// ============================================================

import { describe, it, expect } from 'vitest';
import type { Anamnesis } from '@/lib/types';
import { analyzeClinical } from '@/lib/clinical-decision-support';

function baseAnamnesis(overrides: Partial<Anamnesis> = {}): Anamnesis {
  return {
    queixa_principal: '', hda: '', hpp: '', historia_familiar: '',
    habitos_vida: {}, exame_fisico: '', sinais_vitais: {}, laboratorio: {},
    imagem: '', comorbidades: [], medicamentos_em_uso: [], alergias: [],
    gestante: false, lactante: false, funcao_renal: {}, funcao_hepatica: {},
    ...overrides,
  };
}

describe('GAP-01 — anamnese vazia não gera mais hipótese espúria', () => {
  it('anamnese 100% vazia → zero hipóteses (comportamento corrigido; antes gerava faringoamigdalite espúria)', () => {
    const apoio = analyzeClinical(baseAnamnesis());
    expect(apoio.hipoteses).toEqual([]);
    expect(apoio.encaminhamento_urgente).toBe(false);
  });

  it('anamnese com sinais_vitais preenchidos mas queixa_principal/hda vazios → nenhuma hipótese baseada em texto ausente (só critérios com dado real pontuam)', () => {
    // PA normal, sem febre — nenhum critério objetivo de nenhuma regra deveria disparar,
    // e os 2 critérios de "ausência de sintoma" da faringoamigdalite continuam corretamente
    // inertes porque queixa_principal/hda seguem vazios.
    const apoio = analyzeClinical(baseAnamnesis({ sinais_vitais: { pa_sistolica: 120, pa_diastolica: 80, temperatura: 36.5 } }));
    expect(apoio.hipoteses.some(h => h.id === 'faringoamigdalite')).toBe(false);
  });

  it('exame_fisico vazio não ativa os critérios de ausência baseados em exame_fisico de OUTRAS regras (checagem de que a correção não vazou para campos não tocados)', () => {
    // A correção só mudou os 2 critérios de queixa_principal/hda da faringoamigdalite —
    // este teste documenta que nenhum outro `has()`/`!has()` do motor foi alterado.
    const apoio = analyzeClinical(baseAnamnesis());
    expect(apoio.hipoteses).toEqual([]);
  });
});

describe('GAP-01 — dado real preenchido continua funcionando exatamente como antes (sem regressão)', () => {
  it('queixa de dor de garganta real, sem menção a tosse → "ausência de tosse" ainda pontua (critério de Centor real, não quebrado pela correção)', () => {
    const anamnese = baseAnamnesis({
      queixa_principal: 'Dor de garganta intensa há 2 dias, com febre',
      hda: 'Paciente refere odinofagia importante',
      exame_fisico: 'Exsudato amigdaliano bilateral, adenomegalia cervical dolorosa',
      sinais_vitais: { temperatura: 38.5 },
    });
    const apoio = analyzeClinical(anamnese);
    const faringo = apoio.hipoteses.find(h => h.id === 'faringoamigdalite');
    expect(faringo).toBeDefined();
    expect(faringo!.probabilidade).toBe('alta');
  });

  it('queixa real que MENCIONA tosse → critério de ausência de tosse corretamente NÃO pontua (o texto está presente e contém a palavra-chave)', () => {
    const comTosse = baseAnamnesis({
      queixa_principal: 'Dor de garganta e tosse seca há 3 dias, com febre',
      exame_fisico: 'Exsudato amigdaliano, adenomegalia cervical',
      sinais_vitais: { temperatura: 38.2 },
    });
    const semTosse = baseAnamnesis({
      queixa_principal: 'Dor de garganta intensa há 3 dias, com febre',
      exame_fisico: 'Exsudato amigdaliano, adenomegalia cervical',
      sinais_vitais: { temperatura: 38.2 },
    });
    const apoioComTosse = analyzeClinical(comTosse);
    const apoioSemTosse = analyzeClinical(semTosse);
    const faringoComTosse = apoioComTosse.hipoteses.find(h => h.id === 'faringoamigdalite');
    const faringoSemTosse = apoioSemTosse.hipoteses.find(h => h.id === 'faringoamigdalite');
    expect(faringoComTosse).toBeDefined();
    expect(faringoSemTosse).toBeDefined();
    // Prova real de que a presença da palavra "tosse" no texto reduz a confiança
    // (critério de ausência não pontua) comparado ao mesmo caso sem menção a tosse.
    expect(faringoSemTosse!.grau_confianca ?? 0).toBeGreaterThan(faringoComTosse!.grau_confianca ?? 0);
  });

  it('caso ambíguo com poucos critérios reais preenchidos (não vazio, mas fraco) continua produzindo, no máximo, confiança baixa/média — nunca certeza indevida', () => {
    const fraco = baseAnamnesis({
      queixa_principal: 'Cefaleia leve ocasional',
      hda: 'Sensação de pressão na cabeça às vezes',
    });
    const apoio = analyzeClinical(fraco);
    expect(apoio.hipoteses.every(h => h.probabilidade !== 'alta')).toBe(true);
    expect(apoio.encaminhamento_urgente).toBe(false);
  });
});
