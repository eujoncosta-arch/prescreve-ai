// ============================================================
// RM-96 — Decisões da auditoria RM-95: dados substituídos por fontes verificadas
//
// Cada valor abaixo foi conferido contra o resumo do artigo no PubMed
// (e o DOI no Crossref). Teste offline: trava que as afirmações não
// verificadas removidas (SURMOUNT-MMO, FLASH-DM2, SMART ERJ 2010, diretriz
// SBPT "2022", NNTs do SYGMA 2 etc.) não voltem ao código.
// ============================================================

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SCIENTIFIC_REPOSITORY } from '@/lib/scientific-repository';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { gerarWHY } from '@/lib/explainable-ai-v2';

const LIB = path.resolve(__dirname, '../lib');
const fontes = fs.readdirSync(LIB).filter(f => f.endsWith('.ts')).map(f => ({ f, src: fs.readFileSync(path.join(LIB, f), 'utf8') }));
const ler = (nome: string) => fontes.find(x => x.f === nome)!.src;
const emNenhum = (re: RegExp) => fontes.filter(({ src }) => re.test(src)).map(x => x.f);

describe('RM-96 — itens 1 e 2: evidências não verificadas removidas de guideline-updates', () => {
  it('SURMOUNT-MMO e FLASH-DM2 não existem mais', () => {
    expect(emNenhum(/SURMOUNT-MMO/)).toEqual([]);
    expect(emNenhum(/FLASH-DM2/)).toEqual([]);
    expect(emNenhum(/10\.2337\/dc23-1847/)).toEqual([]);
  });

  it('substitutos reais: SURPASS-CVOT, SURMOUNT-2, meta-análise Diabetologia e MOBILE', () => {
    const g = ler('guideline-updates.ts');
    for (const doi of ['10.1056/NEJMoa2505928', '10.1016/S0140-6736(23)01200-X', '10.1007/s00125-024-06107-6', '10.1001/jama.2021.7444']) {
      expect(g).toContain(doi);
    }
    expect(g).toContain('HR 0,92'); // SURPASS-CVOT: não inferior, sem superioridade
    expect(g).toContain('p=0,09 para superioridade');
    expect(g).not.toMatch(/SURMOUNT-4 confirmou/);
  });
});

describe('RM-96 — item 3: SMART passa a citar a revisão Cochrane real', () => {
  it('entrada Cochrane CD007313 (2013), sem o DOI inexistente nem o "45%"', () => {
    const e = SCIENTIFIC_REPOSITORY.find(x => x.id === 'sci-smart-cochrane-2013');
    expect(e?.doi).toBe('10.1002/14651858.CD007313.pub3');
    expect(e?.ano).toBe(2013);
    expect(e?.resumo).toContain('13.152');
    expect(e?.resumo).not.toContain('45%');
    expect(SCIENTIFIC_REPOSITORY.some(x => x.id === 'sci-smart-2010')).toBe(false);
    expect(emNenhum(/10\.1183\/09031936\.00095109/)).toEqual([]);
  });
});

describe('RM-96 — item 4: diretriz de PAC é a SBPT 2018 (a "2022/AMIB" não existe)', () => {
  it('nenhuma referência a SBPT/AMIB 2022 nem aos DOIs errados', () => {
    expect(emNenhum(/SBPT\s*\/\s*AMIB/)).toEqual([]);
    expect(emNenhum(/PAC 2022/)).toEqual([]);
    expect(emNenhum(/e20210406|e20210597/)).toEqual([]);
  });

  it('repositório cita Corrêa 2018 com DOI verificado e nível de consenso', () => {
    const e = SCIENTIFIC_REPOSITORY.find(x => x.id === 'sci-sbpt-pac-2018');
    expect(e?.doi).toBe('10.1590/S1806-37562018000000130');
    expect(e?.ano).toBe(2018);
    expect(e?.nivel_evidencia).toBe('C');
    expect(SCIENTIFIC_REPOSITORY.some(x => x.id === 'sci-sbpt-pac-2022')).toBe(false);
  });
});

describe('RM-96 — item 5: números conferidos contra a fonte primária', () => {
  it('SYGMA: PMIDs corretos e sem NNT/"45% vs SABA" não verificáveis', () => {
    expect(emNenhum(/29768140|29768142/)).toEqual([]);
    const ai = ler('explainable-ai-v2.ts');
    const i = ai.indexOf("'budesonida/formoterol': {");
    const bloco = ai.slice(i, i + 3500);
    expect(bloco).not.toMatch(/nnt:\s*8/);
    expect(bloco).not.toContain('45% redução vs. SABA');
    expect(bloco).toContain('razão de taxas 0,97');
  });

  it('budesonida/formoterol não inventa NNT: benefício sem NNT, score neutro (50) e 2 estudos verificados', () => {
    const sug = getTherapeuticForCondition('asma', 'Asma (J45)')!.farmacologico.find(m => /budesonida/i.test(m.molecula))!;
    const why = gerarWHY(sug);
    expect(why.beneficio_risco.nnt).toBeUndefined();
    expect(why.estudos_pivotais.map(e => e.nome)).toEqual(['SYGMA 2', 'SYGMA 1']);
    expect(why.estudos_pivotais.every(e => e.nnt === undefined)).toBe(true);
  });

  it('SYGMA 1 não é descrito como "não inferior à budesonida diária" no controle', () => {
    expect(emNenhum(/não inferior a budesonida diária/)).toEqual([]);
    expect(ler('evidence-engine.ts')).toContain('inferior à budesonida de manutenção');
  });

  it('MESA: n=6.722, sem "CAC=0 → risco <5% em 10 anos"', () => {
    const g = ler('guideline-updates.ts');
    expect(g).toContain('n_pacientes: 6722');
    expect(g).not.toContain('risco < 5% em 10 anos');
    expect(g).toContain('7,7×');
  });

  it('SUNSET: n=1.053 e resultado real (VEF1 −26 mL; exacerbações RR 1,08)', () => {
    const g = ler('guideline-updates.ts');
    expect(g).toContain('n_pacientes: 1053');
    expect(g).not.toContain('n_pacientes: 1089');
    expect(g).toContain('razão de taxas 1,08');
    expect(g).not.toContain('reduziu pneumonias');
  });

  it('enalapril/ramipril: rótulo da diretriz bate com o DOI (ESC 2024 hipertensão)', () => {
    const ai = ler('explainable-ai-v2.ts');
    expect(ai).not.toContain('VI Diretrizes Brasileiras de Hipertensão / ESC 2024');
    expect(ai).not.toContain('ESC 2024 Guidelines for CVD prevention');
  });
});
