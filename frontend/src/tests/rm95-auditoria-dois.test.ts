// ============================================================
// RM-95 — Auditoria de citações: DOIs conferidos contra o Crossref
//
// Auditoria completa dos DOIs do código (115 únicos) contra a API do
// Crossref: 23 não existiam e 6 resolviam para um artigo diferente do
// afirmado (ex.: o ensaio HORIZON apontava para um artigo de
// temsirolimus; as 6 diretrizes CPIC apontavam para artigos sem relação).
// Cada substituição abaixo foi confirmada no Crossref (título, autor e
// ano batem com o estudo citado).
//
// Este teste é offline (sem rede): trava que os DOIs errados nunca
// voltem e que o mapeamento molécula→diretriz CPIC fique correto.
// ============================================================

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { FARMACOGENOMICA_DB } from '@/lib/precision-medicine';

const LIB = path.resolve(__dirname, '../lib');
const fontes = fs.readdirSync(LIB).filter(f => f.endsWith('.ts')).map(f => ({ f, src: fs.readFileSync(path.join(LIB, f), 'utf8') }));

/** DOI errado → o que ele realmente era / por que foi removido. */
const DOIS_PROIBIDOS: Record<string, string> = {
  '10.1056/NEJMoa010039': 'CURE (correto: NEJMoa010746)',
  '10.1056/NEJMoa010130': 'COPERNICUS (inexistente)',
  '10.1056/NEJMoa010195': 'COPERNICUS (inexistente)',
  '10.1056/NEJMoa0809652': 'FREEDOM (inexistente)',
  '10.1056/NEJMoa1215228': 'CHANCE (inexistente)',
  '10.1056/NEJMoa1715222': 'SYGMA 1 (inexistente)',
  '10.1056/NEJMoa1715224': 'SYGMA 2 (inexistente)',
  '10.1056/NEJMoa1715368': 'SYGMA 2 (inexistente)',
  '10.1056/NEJMoa1906801': 'Novel START (inexistente)',
  '10.1056/NEJMoa2107522': 'EMPEROR-Preserved (inexistente)',
  '10.1056/NEJMoa2205197': 'DELIVER (inexistente)',
  '10.1056/NEJMoa066838': 'HORIZON-PFT — na verdade um artigo de temsirolimus em carcinoma renal',
  '10.1056/NEJMoa040901': 'MESA (inexistente)',
  '10.1001/jama.295.13.1556': 'ASTEROID (inexistente)',
  '10.1016/S0140-6736(21)01822-1': 'GUIDE-HF (inexistente)',
  '10.1016/S0140-6736(88)90114-9': 'ISIS-2 (inexistente)',
  '10.1164/rccm.201806-1152OC': 'SUNSET (inexistente)',
  '10.1681/ASN.2016010017': 'SPRINT-CKD (inexistente)',
  '10.1136/bmj.b2840': 'Law 2009 — na verdade um artigo sobre influenza H1N1',
  '10.1093/eurheartj/ehac244': 'FIDELITY — na verdade a diretriz ESC 2022 de cardio-oncologia',
  '10.1093/eurheartj/ehae497': 'ESC/EAS dislipidemias 2024 — diretriz que não existe; DOI é de outro artigo',
  '10.1183/13993003.congress-2025': 'GINA 2025 — DOI fabricado (o relatório GINA não tem DOI)',
  '10.1183/13993003.00406-2019': 'GINA 2023 — DOI inexistente (o relatório GINA não tem DOI)',
  '10.1002/cpt.1750': 'CPIC CYP2C19 — na verdade um artigo de segurança de fármacos por redes',
  '10.1002/cpt.1652': 'CPIC varfarina — na verdade um artigo de educação em farmacologia clínica',
  '10.1002/cpt.1718': 'CPIC CYP2D6 — na verdade um artigo de culturas neuronais',
  '10.1002/cpt.1639': 'CPIC SLCO1B1 — na verdade um artigo de regulação da EMA',
  '10.1002/cpt.1617': 'CPIC HLA-B*15:02 — na verdade um artigo de regulação EMA/FDA',
  '10.1002/cpt.1728': 'CPIC HLA-B*57:01 — na verdade um artigo de desenvolvimento de antiinfecciosos',
};

describe('RM-95 — DOIs errados auditados nunca voltam ao código', () => {
  for (const [doi, motivo] of Object.entries(DOIS_PROIBIDOS)) {
    it(`${doi} ausente (${motivo})`, () => {
      const onde = fontes.filter(({ src }) => new RegExp(doi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w\\-])').test(src)).map(x => x.f);
      expect(onde).toEqual([]);
    });
  }
});

describe('RM-95 — farmacogenômica: cada molécula aponta para a SUA diretriz CPIC', () => {
  const doiDe = (molecula: string, gene: string) =>
    FARMACOGENOMICA_DB.find(e => e.molecula === molecula && e.gene === gene)?.doi_referencia;

  it.each([
    ['clopidogrel', 'CYP2C19', '10.1002/cpt.2526'],      // Lee CR, CPT 2022
    ['varfarina', 'VKORC1', '10.1002/cpt.668'],          // Johnson JA, CPT 2017
    ['codeina', 'CYP2D6', '10.1002/cpt.2149'],           // Crews KR, CPT 2021
    ['sinvastatina', 'SLCO1B1', '10.1002/cpt.2557'],     // Cooper-DeHoff RM, CPT 2022
    ['carbamazepina', 'HLA-B*15:02', '10.1002/cpt.1004'],// Phillips EJ, CPT 2018
    ['abacavir', 'HLA-B*57:01', '10.1038/clpt.2014.38'], // Martin MA, CPT 2014
  ])('%s (%s) → %s', (molecula, gene, esperado) => {
    expect(doiDe(molecula, gene)).toBe(esperado);
  });
});

describe('RM-95 — correções de identidade do estudo (não só do DOI)', () => {
  const lerLib = (nome: string) => fontes.find(x => x.f === nome)!.src;

  it('SYGMA 1 e SYGMA 2 têm o título real do artigo (SYGMA 2 citava um título que não existe)', () => {
    const ee = lerLib('evidence-engine.ts');
    expect(ee).toContain('As-Needed Budesonide–Formoterol versus Maintenance Budesonide in Mild Asthma');
    expect(ee).not.toContain('Twice-Daily Budesonide–Formoterol and Asthma Exacerbations');
  });

  it('rosuvastatina cita a diretriz ESC/EAS de 2019 (a "2024" não existe) e sem coautoria indevida da SBC', () => {
    const ai = lerLib('explainable-ai-v2.ts');
    const bloco = ai.slice(ai.indexOf('rosuvastatina: {'), ai.indexOf('rosuvastatina: {') + 700);
    expect(bloco).toContain('ehz455');
    expect(bloco).toContain('ano: 2019');
    expect(bloco).not.toMatch(/SBC/);
  });

  it('GINA não tem mais DOI fabricado e não atribui coautoria à SBPT', () => {
    const ai = lerLib('explainable-ai-v2.ts');
    const bloco = ai.slice(ai.indexOf("'budesonida/formoterol': {"), ai.indexOf("'budesonida/formoterol': {") + 400);
    expect(bloco).not.toContain('doi:');
    expect(bloco).not.toMatch(/SBPT/);
  });
});
