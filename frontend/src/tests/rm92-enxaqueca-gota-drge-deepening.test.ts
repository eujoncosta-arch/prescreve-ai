// ============================================================
// RM-92 — Aprofunda Enxaqueca (G43), Gota (M10) e DRGE (K21) em
// /segunda-opiniao e /explicabilidade
//
// RM-90/91 amarraram as 3 condições ao motor diagnóstico + terapêutico
// real, mas deixaram `second-opinion.ts` e as bases
// EVIDENCIA_DB/ALTERNATIVAS_DB/WHATIF_DB de `explainable-ai-v2.ts` sem
// entrada — funcional via fallback honesto, mas raso. Esta RM adiciona
// entradas reais em `second-opinion.ts` (CONDICOES) e
// `explainable-ai-v2.ts` (ALTERNATIVAS_DB).
//
// Mesmo limite de confiança em citação do RM-90/91: sem documento-fonte
// único verificado linha a linha, nenhum trial específico com
// n_pacientes/resultado quantificado foi citado — `estudos: []` em
// second-opinion.ts, nenhum `nnt` fabricado em ALTERNATIVAS_DB.
// ============================================================

import { describe, it, expect } from 'vitest';
import type { Consultation } from '@/lib/types';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { listarCondicoes, buscarCondicao, gerarSegundaOpiniao } from '@/lib/second-opinion';
import { resolverPreenchimentoSegundaOpiniao } from '@/lib/second-opinion-context';
import { gerarALTERNATIVAS } from '@/lib/explainable-ai-v2';

const CONDICOES = listarCondicoes();

function baseConsultation(overrides: Partial<Consultation> = {}): Consultation {
  return {
    id: 'rm92-c1',
    status: 'terapeutico',
    paciente_nome: 'Paciente RM-92',
    data: new Date().toISOString(),
    ...overrides,
  };
}

describe('RM-92 — second-opinion.ts: novas CondicaoClinica', () => {
  it('"enxaqueca" (G43), "gota" (M10) e "drge" (K21) existem com cid10 correto', () => {
    expect(buscarCondicao('enxaqueca')?.cid10).toBe('G43');
    expect(buscarCondicao('gota')?.cid10).toBe('M10');
    expect(buscarCondicao('drge')?.cid10).toBe('K21');
  });

  it('RM-93: opções com trial verificado (Sumatriptano, Topiramato, Colchicina) agora citam estudos reais; as demais continuam sem estudo não verificado', () => {
    const sumatriptano = buscarCondicao('enxaqueca')!.opcoes.find(o => o.id === 'sumatriptano')!;
    expect(sumatriptano.evidencia.estudos.length).toBeGreaterThan(0);
    expect(sumatriptano.evidencia.estudos[0].nome).toMatch(/Cochrane/);

    const topiramato = buscarCondicao('enxaqueca')!.opcoes.find(o => o.id === 'topiramato')!;
    expect(topiramato.evidencia.estudos.some(e => e.nome.includes('MIGR-002') && e.n === 483)).toBe(true);

    const colchicina = buscarCondicao('gota')!.opcoes.find(o => o.id === 'colchicina')!;
    expect(colchicina.evidencia.estudos.some(e => e.nome.includes('AGREE') && e.n === 185)).toBe(true);

    // Opções sem trial individual verificado (Naproxeno, Propranolol, Alopurinol, Omeprazol, Famotidina) continuam sem estudo fabricado.
    const semEstudoVerificado = ['naproxeno_enxaqueca', 'propranolol_enxaqueca', 'naproxeno_gota', 'alopurinol', 'omeprazol', 'famotidina'];
    for (const condId of ['enxaqueca', 'gota', 'drge']) {
      const condicao = buscarCondicao(condId)!;
      for (const opcao of condicao.opcoes) {
        if (semEstudoVerificado.includes(opcao.id)) {
          expect(opcao.evidencia.estudos).toEqual([]);
        }
      }
    }
  });

  it('gerarSegundaOpiniao() funciona de ponta a ponta para enxaqueca (Sumatriptano vs. alternativas)', () => {
    const resultado = gerarSegundaOpiniao('enxaqueca', 'sumatriptano');
    expect(resultado).not.toBeNull();
    expect(resultado!.escolhida.id).toBe('sumatriptano');
    expect(resultado!.alternativas.length).toBeGreaterThan(0);
  });

  it('gerarSegundaOpiniao() funciona de ponta a ponta para gota (Alopurinol vs. alternativas)', () => {
    const resultado = gerarSegundaOpiniao('gota', 'alopurinol');
    expect(resultado).not.toBeNull();
    expect(resultado!.escolhida.id).toBe('alopurinol');
  });

  it('gerarSegundaOpiniao() funciona de ponta a ponta para DRGE (Omeprazol vs. alternativas)', () => {
    const resultado = gerarSegundaOpiniao('drge', 'omeprazol');
    expect(resultado).not.toBeNull();
    expect(resultado!.escolhida.id).toBe('omeprazol');
  });

  it('moléculas de cada CondutaOpcao usam o mesmo nome DCI do motor real de terapêutica (join key RM-87/89)', () => {
    const planoEnxaqueca = getTherapeuticForCondition('enxaqueca', 'Enxaqueca (G43)')!;
    const sumatriptanoReal = planoEnxaqueca.farmacologico.find(s => s.molecula === 'Sumatriptano');
    expect(sumatriptanoReal).toBeDefined();
    expect(buscarCondicao('enxaqueca')!.opcoes.find(o => o.id === 'sumatriptano')!.moleculas).toContain('Sumatriptano');
  });
});

describe('RM-92 — RM-89 agora resolve condutaId completo para as 3 condições (antes só condicaoId)', () => {
  it('consulta ativa com enxaqueca + Sumatriptano no plano → resolve condicaoId E condutaId', () => {
    const plano = getTherapeuticForCondition('enxaqueca', 'Enxaqueca (G43)')!;
    const consulta = baseConsultation({
      diagnostico_estruturado: { cid: 'G43', descricao: 'Enxaqueca', confianca: 0.8 },
      plano_terapeutico: plano,
    });
    const resultado = resolverPreenchimentoSegundaOpiniao(consulta, CONDICOES);
    expect(resultado.fonte).toBe('consulta_ativa');
    expect(resultado.condicaoId).toBe('enxaqueca');
    expect(resultado.condutaId).not.toBeNull();
  });

  it('consulta ativa com gota + Alopurinol no plano → resolve condicaoId E condutaId', () => {
    const plano = getTherapeuticForCondition('gota', 'Gota (M10)')!;
    const consulta = baseConsultation({
      diagnostico_estruturado: { cid: 'M10', descricao: 'Gota', confianca: 0.8 },
      plano_terapeutico: plano,
    });
    const resultado = resolverPreenchimentoSegundaOpiniao(consulta, CONDICOES);
    expect(resultado.condicaoId).toBe('gota');
    expect(resultado.condutaId).not.toBeNull();
  });

  it('consulta ativa com DRGE + Omeprazol no plano → resolve condicaoId E condutaId', () => {
    const plano = getTherapeuticForCondition('drge', 'DRGE (K21)')!;
    const consulta = baseConsultation({
      diagnostico_estruturado: { cid: 'K21', descricao: 'DRGE', confianca: 0.8 },
      plano_terapeutico: plano,
    });
    const resultado = resolverPreenchimentoSegundaOpiniao(consulta, CONDICOES);
    expect(resultado.condicaoId).toBe('drge');
    expect(resultado.condutaId).not.toBeNull();
  });
});

describe('RM-92 — explainable-ai-v2.ts: ALTERNATIVAS_DB cobre as 3 condições', () => {
  it('gerarALTERNATIVAS("G43") retorna alternativas reais (não mais lista vazia)', () => {
    const res = gerarALTERNATIVAS('G43');
    expect(res.alternativas.length).toBeGreaterThan(0);
    expect(res.alternativas.some(a => a.molecula.includes('Sumatriptano'))).toBe(true);
  });

  it('gerarALTERNATIVAS("M10") retorna alternativas reais', () => {
    const res = gerarALTERNATIVAS('M10');
    expect(res.alternativas.length).toBeGreaterThan(0);
    expect(res.alternativas.some(a => a.molecula.includes('Alopurinol'))).toBe(true);
  });

  it('gerarALTERNATIVAS("K21") retorna alternativas reais', () => {
    const res = gerarALTERNATIVAS('K21');
    expect(res.alternativas.length).toBeGreaterThan(0);
    expect(res.alternativas.some(a => a.molecula.includes('Omeprazol'))).toBe(true);
  });

  it('nenhuma alternativa das 3 novas condições tem nnt fabricado (campo omitido, nunca inventado)', () => {
    for (const cid of ['G43', 'M10', 'K21']) {
      const res = gerarALTERNATIVAS(cid);
      for (const alt of res.alternativas) {
        expect(alt.nnt).toBeUndefined();
      }
    }
  });
});
