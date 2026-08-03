// ============================================================
// ACHADO-01 — proteção de leitura do risco agregado (`risco_global`)
//
// Achado original: RM-64 (docs/RM-64-CLINICAL-JOURNEY-ACCEPTANCE.md, seção 6,
// confirmado em CJ-001). `risco_global` é uma MÉDIA PONDERADA das 6 dimensões
// (CV 25% + Renal 20% + Hemorrágico 15% + Farmacológico 20% + Interação 10%
// + Terapêutico 10%) — por design, não um bug de cálculo. Mas isso significa
// que uma dimensão isoladamente elevada (ex.: cardiovascular em 'alto') pode
// ficar diluída no rótulo agregado exibido em destaque ('baixo'), se as
// demais dimensões estiverem em zero — risco de leitura clínica.
//
// Correção aplicada NESTA RM: exclusivamente na camada de UX
// (frontend/src/app/consulta/nova/page.tsx) — `avaliarRiscoClinico` e a
// fórmula de `score_global`/`risco_global` permanecem INALTERADOS, por
// decisão explícita, até haver decisão formal de produto sobre a fórmula
// em si.
//
// `dimensoesAcimaDoRiscoGlobal` (clinical-risk-engine.ts) é a função pura e
// testável que sustenta essa proteção: identifica quais dimensões têm nível
// individual estritamente maior que o `risco_global` agregado. A UI usa o
// resultado para nunca exibir o rótulo agregado sozinho quando a lista não
// está vazia (banner superior + card "Score Global de Risco" na aba Risco
// Clínico).
//
// Limitação de cobertura declarada (mesmo padrão do CJ-009, RM-64): o
// projeto não usa @testing-library/react — a renderização condicional do
// badge/alert em page.tsx NÃO é testada por montagem de componente. O que é
// testado é a função pura que decide QUANDO a proteção deve aparecer, que é
// exatamente a lógica de decisão consumida pela UI (a JSX em si é só
// apresentação condicional trivial sobre essa lista).
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  dimensoesAcimaDoRiscoGlobal,
  type AvaliacaoRiscoClinico,
  type DimensaoRisco,
  type NivelRisco,
} from '@/lib/clinical-risk-engine';

function dimensaoVazia(): DimensaoRisco {
  return { nivel: 'baixo', score: 0, fatores: [], protecoes: [], acoes: [] };
}

function dimensao(nivel: NivelRisco, score = 0): DimensaoRisco {
  return { nivel, score, fatores: [], protecoes: [], acoes: [] };
}

function baseAvaliacao(overrides: Partial<AvaliacaoRiscoClinico> = {}): AvaliacaoRiscoClinico {
  return {
    timestamp: new Date().toISOString(),
    risco_cardiovascular: dimensaoVazia(),
    risco_renal: dimensaoVazia(),
    risco_hemorragico: dimensaoVazia(),
    risco_farmacologico: dimensaoVazia(),
    risco_interacao: dimensaoVazia(),
    risco_terapeutico: dimensaoVazia(),
    risco_global: 'baixo',
    score_global: 0,
    alerta_vermelho: false,
    justificativa_global: '',
    recomendacoes_prioritarias: [],
    ...overrides,
  };
}

describe('ACHADO-01 — dimensoesAcimaDoRiscoGlobal', () => {
  it('CJ-001 real: CV "alto" isolado com demais dimensões zeradas → risco_global dilui para "baixo", mas a função detecta a dimensão CV como acima do agregado', () => {
    // Reproduz exatamente o cenário confirmado na RM-64 (CJ-001): CV=alto
    // (score >= 50), demais em zero → score_global pela média ponderada
    // (50*0.25 = 12.5, arredondado) cai na faixa 'baixo' de nivelPorScore.
    const avaliacao = baseAvaliacao({
      risco_cardiovascular: dimensao('alto', 60),
      risco_global: 'baixo',
      score_global: 15,
    });
    const elevadas = dimensoesAcimaDoRiscoGlobal(avaliacao);
    expect(elevadas).toHaveLength(1);
    expect(elevadas[0]).toMatchObject({ chave: 'risco_cardiovascular', nivel: 'alto', label: 'Cardiovascular' });
  });

  it('nenhuma dimensão excede o agregado → lista vazia (rótulo agregado já reflete corretamente a pior dimensão)', () => {
    const avaliacao = baseAvaliacao({
      risco_cardiovascular: dimensao('intermediario', 30),
      risco_renal: dimensao('intermediario', 30),
      risco_global: 'intermediario',
      score_global: 30,
    });
    expect(dimensoesAcimaDoRiscoGlobal(avaliacao)).toEqual([]);
  });

  it('todas as dimensões vazias (baixo) e risco_global "baixo" → lista vazia (nenhuma dimensão é estritamente maior que o agregado)', () => {
    expect(dimensoesAcimaDoRiscoGlobal(baseAvaliacao())).toEqual([]);
  });

  it('dimensão no MESMO nível do agregado (empate) não entra na lista — só estritamente maior conta', () => {
    const avaliacao = baseAvaliacao({
      risco_cardiovascular: dimensao('alto', 55),
      risco_global: 'alto',
      score_global: 55,
    });
    expect(dimensoesAcimaDoRiscoGlobal(avaliacao)).toEqual([]);
  });

  it('múltiplas dimensões acima do agregado → todas retornadas, cada uma com seu próprio nível', () => {
    const avaliacao = baseAvaliacao({
      risco_cardiovascular: dimensao('muito_alto', 80),
      risco_hemorragico: dimensao('alto', 55),
      risco_global: 'intermediario',
      score_global: 35,
    });
    const elevadas = dimensoesAcimaDoRiscoGlobal(avaliacao);
    expect(elevadas.map(d => d.chave).sort()).toEqual(['risco_cardiovascular', 'risco_hemorragico'].sort());
  });

  it('risco_global "critico" (nível máximo) nunca tem dimensão acima dele — lista sempre vazia nesse caso', () => {
    const avaliacao = baseAvaliacao({
      risco_cardiovascular: dimensao('muito_alto', 95),
      risco_global: 'critico',
      score_global: 100,
    });
    expect(dimensoesAcimaDoRiscoGlobal(avaliacao)).toEqual([]);
  });
});
