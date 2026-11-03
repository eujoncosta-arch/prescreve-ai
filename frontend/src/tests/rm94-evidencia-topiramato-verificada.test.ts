// ============================================================
// RM-94 — EVIDENCIA_DB: Topiramato com NNT computado de dois ECRs
// pivotais, cada número confirmado em fonte primária (PubMed).
//
// Regra aplicada (definida pelo usuário): só entra dado confirmado em
// 2+ fontes independentes. Resultado da verificação:
//   ENTROU    Topiramato — MIGR-001 (PMID 15096395) e MIGR-002
//             (PMID 14982912), dois ensaios independentes.
//   (RM-97: Propranolol e Sumatriptano passaram a ter entrada curada, após o
//   usuário aceitar fontes de alta relevância — ver rm97-*.test.ts.)
//   NÃO ENTROU Alopurinol — CONFIRMS compara com febuxostate, não com
//             placebo: não há NNT calculável.
//   NÃO ENTROU Omeprazol/Famotidina — Cochrane CD002095 só traz RR, sem
//             taxas absolutas nem NNT.
// ============================================================

import { describe, it, expect } from 'vitest';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { gerarWHY, gerarWHATIF } from '@/lib/explainable-ai-v2';
import { buscarCondicao } from '@/lib/second-opinion';
import { getMoleculeById } from '@/lib/drug-comparator';

const plano = getTherapeuticForCondition('enxaqueca', 'Enxaqueca (G43)')!;
const molecula = (nome: string) => plano.farmacologico.find(s => s.molecula === nome)!;

describe('RM-94 — Topiramato: gerarWHY() usa a entrada curada com NNT computado', () => {
  const why = gerarWHY(molecula('Topiramato'));

  it('cita os dois ECRs pivotais com n verificado em fonte primária', () => {
    const migr002 = why.estudos_pivotais.find(e => e.nome === 'MIGR-002')!;
    const migr001 = why.estudos_pivotais.find(e => e.nome === 'MIGR-001')!;
    expect(migr002.n_pacientes).toBe(483);
    expect(migr001.n_pacientes).toBe(487);
    expect(migr002.doi).toBe('10.1001/jama.291.8.965');
    expect(migr001.doi).toBe('10.1001/archneur.61.4.490');
  });

  it('NNT é recomputável a partir das taxas de resposta reais (nunca um número solto)', () => {
    const nntMigr002 = 1 / (0.49 - 0.23);   // 3,85
    const nntMigr001 = 1 / (0.540 - 0.226); // 3,18
    expect(Math.ceil(nntMigr002)).toBe(4);
    expect(Math.ceil(nntMigr001)).toBe(4);
    expect(why.beneficio_risco.nnt).toBe(4);
  });

  it('RAR registrado em cada estudo bate com a diferença real das taxas', () => {
    const migr002 = why.estudos_pivotais.find(e => e.nome === 'MIGR-002')!;
    const migr001 = why.estudos_pivotais.find(e => e.nome === 'MIGR-001')!;
    expect(migr002.rar).toBeCloseTo(26, 5);
    expect(migr001.rar).toBeCloseTo(31.4, 5);
  });
});

describe('RM-94 — consistência entre as 3 camadas que citam MIGR-001/002', () => {
  it('second-opinion.ts e drug-comparator.ts usam os mesmos n verificados', () => {
    const opcao = buscarCondicao('enxaqueca')!.opcoes.find(o => o.id === 'topiramato')!;
    expect(opcao.evidencia.estudos.find(e => e.nome.includes('MIGR-001'))!.n).toBe(487);
    expect(opcao.evidencia.estudos.find(e => e.nome.includes('MIGR-002'))!.n).toBe(483);

    const mol = getMoleculeById('topiramato')!;
    expect(mol.eficacia.find(e => e.estudo.includes('Silberstein'))!.n_pacientes).toBe(487);
    expect(mol.eficacia.find(e => e.estudo.includes('Brandes'))!.n_pacientes).toBe(483);
  });
});

describe('RM-94 — o que NÃO entrou continua no fallback honesto (nunca NNT fabricado)', () => {
  it.each(['Naproxeno'])('%s (enxaqueca) não tem entrada curada: gerarWHY() cai no fallback genérico', (nome) => {
    const why = gerarWHY(molecula(nome));
    expect(why.estudos_pivotais).toEqual([]);
    expect(why.beneficio_risco.nnt).toBe(25); // placeholder documentado do fallback, não um NNT real
  });

  it.each([
    ['gota', 'Alopurinol'],
    ['drge', 'Omeprazol'],
  ])('%s/%s não tem entrada curada (sem NNT verificável)', (condId, nome) => {
    const p = getTherapeuticForCondition(condId, condId)!;
    const why = gerarWHY(p.farmacologico.find(s => s.molecula === nome)!);
    expect(why.estudos_pivotais).toEqual([]);
  });

  it('WHATIF_DB continua sem entrada para M10/K21 (G43 passou a ter 2 cenários na RM-97): só 1 cenário verificável por condição não forma uma comparação honesta', () => {
    for (const cid of ['M10', 'K21']) {
      expect(gerarWHATIF(cid).cenarios).toEqual([]);
    }
  });
});
