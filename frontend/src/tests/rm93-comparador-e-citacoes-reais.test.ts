// ============================================================
// RM-93 — Completa /comparador para Enxaqueca/Gota/DRGE + substitui
// citações sem DOI (RM-90/91/92) por fontes reais, verificadas por
// busca ativa (periódicos indexados, diretrizes de sociedades médicas).
//
// Fontes verificadas nesta RM (DOI confirmado via busca):
// - Ailani J et al. Headache. 2021;61(7):1021-1039. doi:10.1111/head.14153
// - Silberstein SD et al. Neurology. 2012;78(17):1337-1345. doi:10.1212/WNL.0b013e3182535d20
// - Brandes JL et al. JAMA. 2004;291(8):965-973. doi:10.1001/jama.291.8.965 (MIGR-002, n=483)
// - Silberstein SD et al. Arch Neurol. 2004;61(4):490-495. doi:10.1001/archneur.61.4.490 (MIGR-001)
// - Derry CJ et al. Cochrane Database Syst Rev. 2012. doi:10.1002/14651858.CD008615.pub2
// - FitzGerald JD et al. Arthritis Care Res. 2020;72(6):744-760. doi:10.1002/acr.24180
// - Terkeltaub RA et al. Arthritis Rheum. 2010;62(4):1060-1068. doi:10.1002/art.27327 (AGREE, n=185)
// - Katz PO et al. Am J Gastroenterol. 2022;117(1):27-56. doi:10.14309/ajg.0000000000001538
//
// EVIDENCIA_DB/WHATIF_DB de explainable-ai-v2.ts continuam fora de
// escopo onde exigiriam um nnt/mortalidade quantificado que eu não
// tenho uma fonte verificada para computar (exceto Colchicina, cujo
// NNT=5 é calculado diretamente dos percentuais reais do AGREE Trial:
// ARR = 37,8% − 15,5% = 22,3 pontos percentuais → NNT = 1/0,223 ≈ 4,48 → 5).
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  MOLECULES_DB,
  getMoleculeById,
  searchMoleculas,
  gerarComparativo,
  CATEGORIA_LABEL,
  CATEGORIA_COR,
} from '@/lib/drug-comparator';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { buscarCondicao } from '@/lib/second-opinion';
import { gerarWHY } from '@/lib/explainable-ai-v2';

const NOVAS_MOLECULAS_IDS = ['naproxeno', 'sumatriptano', 'propranolol', 'topiramato', 'colchicina', 'alopurinol', 'omeprazol', 'famotidina'];

describe('RM-93 — /comparador: 8 novas moléculas (Enxaqueca/Gota/DRGE)', () => {
  it('todas as 8 moléculas existem no catálogo com dados completos', () => {
    for (const id of NOVAS_MOLECULAS_IDS) {
      const mol = getMoleculeById(id);
      expect(mol, `molécula "${id}" deveria existir`).toBeDefined();
      expect(mol!.farmacocinetica.meia_vida_h).toBeGreaterThan(0);
      expect(mol!.eficacia.length).toBeGreaterThan(0);
    }
  });

  it('categorias novas (neurologia, reumatologia, gastroenterologia) têm label e cor definidos', () => {
    expect(CATEGORIA_LABEL.neurologia).toBe('Neurologia');
    expect(CATEGORIA_LABEL.reumatologia).toBe('Reumatologia');
    expect(CATEGORIA_LABEL.gastroenterologia).toBe('Gastroenterologia');
    expect(CATEGORIA_COR.neurologia).toBeTruthy();
    expect(CATEGORIA_COR.reumatologia).toBeTruthy();
    expect(CATEGORIA_COR.gastroenterologia).toBeTruthy();
  });

  it('searchMoleculas() encontra as novas moléculas por nome', () => {
    expect(searchMoleculas('sumatriptano').some(m => m.id === 'sumatriptano')).toBe(true);
    expect(searchMoleculas('alopurinol').some(m => m.id === 'alopurinol')).toBe(true);
    expect(searchMoleculas('omeprazol').some(m => m.id === 'omeprazol')).toBe(true);
  });

  it('gerarComparativo() funciona de ponta a ponta: Sumatriptano vs. Naproxeno (enxaqueca)', () => {
    const sumatriptano = getMoleculeById('sumatriptano')!;
    const naproxeno = getMoleculeById('naproxeno')!;
    const scores = gerarComparativo(sumatriptano, naproxeno);
    expect(scores.length).toBeGreaterThan(0);
    expect(scores.every(s => ['A', 'B', 'igual'].includes(s.vantagem))).toBe(true);
  });

  it('gerarComparativo() funciona de ponta a ponta: Colchicina vs. Alopurinol (gota — crise vs. ULT, comparação pedagógica)', () => {
    const colchicina = getMoleculeById('colchicina')!;
    const alopurinol = getMoleculeById('alopurinol')!;
    const scores = gerarComparativo(colchicina, alopurinol);
    expect(scores.length).toBeGreaterThan(0);
  });

  it('gerarComparativo() funciona de ponta a ponta: Omeprazol vs. Famotidina (DRGE)', () => {
    const omeprazol = getMoleculeById('omeprazol')!;
    const famotidina = getMoleculeById('famotidina')!;
    const scores = gerarComparativo(omeprazol, famotidina);
    expect(scores.length).toBeGreaterThan(0);
  });

  it('Naproxeno é compartilhado entre enxaqueca (G43) e gota (M10) — mesma molécula, 2 indicações reais', () => {
    const naproxeno = getMoleculeById('naproxeno')!;
    expect(naproxeno.cids_principais).toContain('G43');
    expect(naproxeno.cids_principais).toContain('M10');
  });

  it('Alopurinol explicita no catálogo do comparador que não deve ser iniciado durante crise aguda (consistência com clinical-therapeutics.ts)', () => {
    const alopurinol = getMoleculeById('alopurinol')!;
    expect(alopurinol.contraindicacoes.some(c => c.toLowerCase().includes('não iniciar durante crise') || c.toLowerCase().includes('nao iniciar durante crise'))).toBe(true);
  });

  it('nenhuma molécula nova duplica um id já existente no catálogo', () => {
    const ids = MOLECULES_DB.map(m => m.id);
    const idsUnicos = new Set(ids);
    expect(idsUnicos.size).toBe(ids.length);
  });
});

describe('RM-93 — clinical-therapeutics.ts: DOIs reais e verificados', () => {
  it('Enxaqueca: Naproxeno/Sumatriptano citam Ailani 2021; Propranolol/Topiramato citam Potrebic 2026', () => {
    const plano = getTherapeuticForCondition('enxaqueca', 'Enxaqueca (G43)')!;
    const naproxeno = plano.farmacologico.find(s => s.molecula === 'Naproxeno')!;
    const sumatriptano = plano.farmacologico.find(s => s.molecula === 'Sumatriptano')!;
    const propranolol = plano.farmacologico.find(s => s.molecula === 'Propranolol')!;
    const topiramato = plano.farmacologico.find(s => s.molecula === 'Topiramato')!;

    expect(naproxeno.evidencia.doi).toBe('10.1111/head.14153');
    expect(sumatriptano.evidencia.doi).toBe('10.1111/head.14153');
    // RM-98: a diretriz AAN/AHS 2026 (Potrebic) substituiu a de 2012 (Silberstein)
    expect(propranolol.evidencia.doi).toBe('10.1212/WNL.0000000000214881');
    expect(topiramato.evidencia.doi).toBe('10.1212/WNL.0000000000214881');
    expect(topiramato.evidencia.citacao).toMatch(/MIGR-002/);
  });

  it('Gota: todas as 3 sugestões citam FitzGerald 2020 (ACR)', () => {
    const plano = getTherapeuticForCondition('gota', 'Gota (M10)')!;
    for (const s of plano.farmacologico) {
      expect(s.evidencia.doi).toBe('10.1002/acr.24180');
    }
  });

  it('DRGE: Omeprazol cita Katz 2022 (ACG)', () => {
    const plano = getTherapeuticForCondition('drge', 'DRGE (K21)')!;
    const omeprazol = plano.farmacologico.find(s => s.molecula === 'Omeprazol')!;
    expect(omeprazol.evidencia.doi).toBe('10.14309/ajg.0000000000001538');
  });
});

describe('RM-93 — second-opinion.ts: estudos reais onde verificados', () => {
  it('Sumatriptano cita a revisão Cochrane real (Derry 2012)', () => {
    const opcao = buscarCondicao('enxaqueca')!.opcoes.find(o => o.id === 'sumatriptano')!;
    expect(opcao.evidencia.estudos[0].nome).toMatch(/Cochrane/);
    expect(opcao.evidencia.estudos[0].resultado).toMatch(/10\.1002\/14651858\.CD008615\.pub2/);
  });

  it('Topiramato cita MIGR-001 e MIGR-002 com n real', () => {
    const opcao = buscarCondicao('enxaqueca')!.opcoes.find(o => o.id === 'topiramato')!;
    const migr002 = opcao.evidencia.estudos.find(e => e.nome.includes('MIGR-002'))!;
    expect(migr002.n).toBe(483);
    expect(migr002.ano).toBe(2004);
  });

  it('Colchicina cita o AGREE Trial com n=185 real', () => {
    const opcao = buscarCondicao('gota')!.opcoes.find(o => o.id === 'colchicina')!;
    const agree = opcao.evidencia.estudos.find(e => e.nome.includes('AGREE'))!;
    expect(agree.n).toBe(185);
    expect(agree.ano).toBe(2010);
  });

  it('nenhum orgao de diretriz atribui coautoria indevida a sociedade brasileira não envolvida na publicação original', () => {
    for (const condId of ['enxaqueca', 'gota', 'drge']) {
      const condicao = buscarCondicao(condId)!;
      for (const opcao of condicao.opcoes) {
        expect(opcao.diretriz.orgao).not.toMatch(/SBCe|SBR|FBG/);
      }
    }
  });
});

describe('RM-93 — explainable-ai-v2.ts: EVIDENCIA_DB ganha Colchicina com NNT real computado', () => {
  it('gerarWHY() para Colchicina usa a entrada curada (AGREE Trial), não o fallback genérico', () => {
    const plano = getTherapeuticForCondition('gota', 'Gota (M10)')!;
    const colchicina = plano.farmacologico.find(s => s.molecula === 'Colchicina')!;
    const why = gerarWHY(colchicina);
    expect(why.estudos_pivotais.some(e => e.nome === 'AGREE Trial')).toBe(true);
    expect(why.beneficio_risco.nnt).toBe(5); // computado: ARR 22,3pp → NNT ≈ 4,48 → 5
  });
});
