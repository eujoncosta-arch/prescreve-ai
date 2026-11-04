// ============================================================
// RM-99 — O consenso AHS 2021 (Ailani, doi 10.1111/head.14153) não é diretriz
// formal: o próprio documento diz ter sido publicado "na ausência de uma
// diretriz formal". Nenhuma camada pode rotulá-lo como "Classe/Grau I".
// Naproxeno: a Cochrane CD009455 (Law 2013) dá NNT 11 para livre de dor em 2 h
// e o considera pouco útil como analgésico isolado — "1ª linha estabelecida"
// não pode ser a única mensagem. Teste offline.
// ============================================================

import { describe, it, expect } from 'vitest';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { gerarALTERNATIVAS } from '@/lib/explainable-ai-v2';
import { buscarCondicao } from '@/lib/second-opinion';
import { getMoleculeById } from '@/lib/drug-comparator';

const DOI_AHS = '10.1111/head.14153';
const DOI_COCHRANE_NAPROXENO = '10.1002/14651858.CD009455.pub2';

const plano = getTherapeuticForCondition('enxaqueca', 'Enxaqueca (G43)')!;
const molecula = (nome: string) => plano.farmacologico.find(s => s.molecula === nome)!;
const condicao = buscarCondicao('enxaqueca')!;

describe('RM-99 — clinical-therapeutics: consenso AHS 2021 sem "Grau I"', () => {
  it.each(['Naproxeno', 'Sumatriptano'])('%s: grau Consenso, nível A, sem "1ª linha estabelecida"', (nome) => {
    const ev = molecula(nome).evidencia;
    expect(ev.doi).toBe(DOI_AHS);
    expect(ev.nivel_evidencia.grau).toBe('Consenso');
    expect(ev.nivel_evidencia.nivel).toBe('A');
    expect(ev.nivel_evidencia.descricao).toContain('sem graduação formal de classe');
    expect(ev.nivel_evidencia.descricao).not.toMatch(/1ª linha estabelecida/);
  });

  it('naproxeno: descrição traz o NNT 11 da Cochrane', () => {
    const d = molecula('Naproxeno').evidencia.nivel_evidencia.descricao;
    expect(d).toContain(DOI_COCHRANE_NAPROXENO);
    expect(d).toContain('NNT é 11');
  });
});

describe('RM-99 — second-opinion: consenso AHS 2021 sem "Grau I"', () => {
  it.each(['naproxeno_enxaqueca', 'sumatriptano'])('%s', (id) => {
    const op = condicao.opcoes.find(o => o.id === id);
    if (!op) return;
    expect(op.diretriz.grau).toBe('Consenso');
    expect(op.diretriz.recomendacao).toContain('sem graduação formal de classe');
    expect(op.diretriz.recomendacao).toContain(DOI_AHS);
  });

  it('as opções de tratamento agudo existem e foram cobertas', () => {
    const agudas = condicao.opcoes.filter(o => o.diretriz.recomendacao.includes(DOI_AHS));
    expect(agudas.length).toBeGreaterThanOrEqual(2);
    for (const o of agudas) expect(o.diretriz.grau).toBe('Consenso');
  });
});

describe('RM-99 — ALTERNATIVAS_DB (G43): consenso e NNT do naproxeno', () => {
  const alt = gerarALTERNATIVAS('G43').alternativas;
  const por = (t: string) => alt.find(a => a.molecula.includes(t))!;

  it('naproxeno e sumatriptano citam "Consenso AHS 2021", não "AHS 2021" solto', () => {
    for (const m of ['Naproxeno', 'Sumatriptano']) {
      expect(por(m).diretriz).toContain('Consenso AHS 2021');
      expect(por(m).diretriz).toContain(DOI_AHS);
    }
  });

  it('naproxeno: vantagem não diz mais "1ª linha estabelecida" e traz NNT 11', () => {
    expect(por('Naproxeno').vantagem_principal).not.toMatch(/1ª linha estabelecida/);
    expect(por('Naproxeno').vantagem_principal).toContain('NNT 11');
    expect(por('Naproxeno').diretriz).toContain('CD009455');
  });

  it('sumatriptano: cita a Cochrane CD008615 (NNT 6,1)', () => {
    expect(por('Sumatriptano').diretriz).toContain('CD008615');
  });
});

describe('RM-99 — drug-comparator: naproxeno com NNT e sem "1ª linha estabelecida" na enxaqueca', () => {
  it('linha de eficácia de enxaqueca cita Cochrane e consenso', () => {
    const m = getMoleculeById('naproxeno')!;
    const linha = m.eficacia.find(e => e.desfecho.includes('enxaqueca'))!;
    expect(linha.reducao).toContain('NNT 11');
    expect(linha.reducao).not.toMatch(/1ª linha estabelecida/);
    expect(linha.estudo).toContain(DOI_COCHRANE_NAPROXENO);
    expect(linha.estudo).toContain('consenso AHS');
  });
});
