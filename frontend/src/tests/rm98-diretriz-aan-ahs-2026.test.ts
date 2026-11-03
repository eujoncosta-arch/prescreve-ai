// ============================================================
// RM-98 — Diretriz AAN/AHS 2026 de profilaxia da enxaqueca
//
// A diretriz de 2026 (Potrebic, Neurology, doi 10.1212/WNL.0000000000214881)
// substitui a de 2012 (Silberstein). Para propranolol e topiramato o nível
// passa de A para B (evidência de confiança moderada na revisão sistemática
// Pringsheim 2026, doi 10.1212/WNL.0000000000218112). Níveis conferidos em
// Guideline Central e NeurologyLive (texto completo bloqueado: 403).
// Teste offline: trava que a citação de 2012 / "Nível A" / "1ª linha
// estabelecida" não volte para essas duas moléculas.
// ============================================================

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { gerarWHY, gerarALTERNATIVAS } from '@/lib/explainable-ai-v2';
import { buscarCondicao } from '@/lib/second-opinion';
import { getMoleculeById } from '@/lib/drug-comparator';

const DOI_2026 = '10.1212/WNL.0000000000214881';
const DOI_SR_2026 = '10.1212/WNL.0000000000218112';
const DOI_2012 = '10.1212/WNL.0b013e3182535d20';

const plano = getTherapeuticForCondition('enxaqueca', 'Enxaqueca (G43)')!;
const molecula = (nome: string) => plano.farmacologico.find(s => s.molecula === nome)!;

describe('RM-98 — nenhuma camada de código cita mais a diretriz de 2012', () => {
  it('o DOI de Silberstein 2012 não aparece em lib/ (só em testes históricos)', () => {
    const LIB = path.resolve(__dirname, '../lib');
    const achados = fs.readdirSync(LIB).filter(f => f.endsWith('.ts'))
      .filter(f => fs.readFileSync(path.join(LIB, f), 'utf8').includes(DOI_2012));
    expect(achados).toEqual([]);
  });
});

describe('RM-98 — gerarWHY(): propranolol e topiramato citam a diretriz 2026 em Nível B', () => {
  it.each(['Propranolol', 'Topiramato'])('%s: doi, ano, nível e classe', (nome) => {
    const j = gerarWHY(molecula(nome)).justificativas_diretriz[0];
    expect(j.doi).toBe(DOI_2026);
    expect(j.ano).toBe(2026);
    expect(j.nivel_evidencia).toBe('B');
    expect(j.diretriz).toBe('Pharmacologic Treatment for Migraine Prevention in Adults Practice Guideline Recommendations');
  });

  it.each(['Propranolol', 'Topiramato'])('%s: força de evidência do benefício é B e cita a revisão sistemática 2026', (nome) => {
    const why = gerarWHY(molecula(nome));
    expect(why.beneficio_risco.forca_evidencia).toBe('B');
    expect(why.estudos_pivotais.some(e => e.doi === DOI_SR_2026)).toBe(true);
  });

  it('a revisão sistemática não carrega NNT nem n inventado (217 estudos, não pacientes)', () => {
    for (const nome of ['Propranolol', 'Topiramato']) {
      const sr = gerarWHY(molecula(nome)).estudos_pivotais.find(e => e.doi === DOI_SR_2026)!;
      expect(sr.nnt).toBeUndefined();
      expect(sr.n_pacientes).toBeUndefined();
    }
  });

  it('NNTs não mudaram (vêm de ECRs/meta-análises, não da diretriz)', () => {
    expect(gerarWHY(molecula('Topiramato')).beneficio_risco.nnt).toBe(4);
    expect(gerarWHY(molecula('Propranolol')).beneficio_risco.nnt).toBe(6);
  });

  it('topiramato: resumo traz as salvaguardas da diretriz (teratogênico, contraceptivo > 200 mg/dia)', () => {
    const r = gerarWHY(molecula('Topiramato')).justificativas_diretriz[0].resumo_recomendacao;
    expect(r).toContain('teratogênico');
    expect(r).toContain('200 mg/dia');
  });

  it('propranolol: resumo traz a ressalva da gestação (Nível C) e não diz "Nível A"', () => {
    const r = gerarWHY(molecula('Propranolol')).justificativas_diretriz[0].resumo_recomendacao;
    expect(r).toContain('Nível C');
    expect(r).not.toContain('Nível A');
  });
});

describe('RM-98 — clinical-therapeutics, second-opinion e drug-comparator alinhados', () => {
  it('clinical-therapeutics: evidência 2026, nível B, sem "1ª linha estabelecida"', () => {
    for (const nome of ['Propranolol', 'Topiramato']) {
      const ev = molecula(nome).evidencia;
      expect(ev.doi).toBe(DOI_2026);
      expect(ev.ano).toBe(2026);
      expect(ev.nivel_evidencia.nivel).toBe('B');
      expect(ev.nivel_evidencia.descricao).not.toMatch(/1ª linha estabelecida/);
    }
  });

  it('second-opinion: propranolol e topiramato citam Potrebic 2026, nível B', () => {
    const c = buscarCondicao('enxaqueca')!;
    for (const id of ['propranolol_enxaqueca', 'topiramato']) {
      const d = c.opcoes.find(o => o.id === id)!.diretriz;
      expect(d.ano).toBe(2026);
      expect(d.nivel).toBe('B');
      expect(d.recomendacao).toContain(DOI_2026);
    }
  });

  it('drug-comparator: nível B e diretriz principal 2026', () => {
    for (const id of ['propranolol', 'topiramato']) {
      const m = getMoleculeById(id)!;
      expect(m.nivel_evidencia).toBe('B');
      expect(m.diretriz_principal).toContain('2026');
    }
  });
});

describe('RM-98 — ALTERNATIVAS_DB (G43): o tratamento AGUDO não cita mais a diretriz de profilaxia', () => {
  const alt = gerarALTERNATIVAS('G43').alternativas;
  const por = (trecho: string) => alt.find(a => a.molecula.includes(trecho))!;

  it('naproxeno e sumatriptano citam só o consenso AHS 2021', () => {
    for (const m of ['Naproxeno', 'Sumatriptano']) {
      expect(por(m).diretriz).toContain('10.1111/head.14153');
      expect(por(m).diretriz).not.toContain('WNL');
    }
  });

  it('propranolol e topiramato citam a diretriz 2026 com força B', () => {
    for (const m of ['Propranolol', 'Topiramato']) {
      expect(por(m).diretriz).toContain(DOI_2026);
      expect(por(m).forca_evidencia).toBe('B');
    }
  });

  it('topiramato avisa sobre contraceptivo hormonal > 200 mg/dia', () => {
    expect(por('Topiramato').desvantagem_principal).toContain('contraceptivo hormonal');
  });
});
