// ============================================================
// RM-97 — EVIDENCIA_DB (sumatriptano, propranolol) e WHATIF_DB (G43)
//
// Cada número abaixo foi conferido no PubMed/Crossref. NNT nunca é
// inventado: é o valor da fonte, arredondado para cima (convenção
// conservadora das RMs anteriores). Teste offline.
// ============================================================

import { describe, it, expect } from 'vitest';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { gerarWHY, gerarWHATIF } from '@/lib/explainable-ai-v2';
import { buscarCondicao } from '@/lib/second-opinion';
import { getMoleculeById } from '@/lib/drug-comparator';

const plano = getTherapeuticForCondition('enxaqueca', 'Enxaqueca (G43)')!;
const molecula = (nome: string) => plano.farmacologico.find(s => s.molecula === nome)!;

describe('RM-97 — Sumatriptano: gerarWHY() usa a entrada curada', () => {
  const why = gerarWHY(molecula('Sumatriptano'));

  it('NNT é o da Cochrane (6,1 para 50 mg), arredondado para cima', () => {
    expect(Math.ceil(6.1)).toBe(7);
    expect(why.beneficio_risco.nnt).toBe(7);
  });

  it('taxas absolutas do overview Cochrane (28% vs 11%) são consistentes com o NNT', () => {
    const arr = 0.28 - 0.11; // 17 pp
    expect(1 / arr).toBeGreaterThan(5.5);
    expect(1 / arr).toBeLessThan(6.9);
  });

  it('cita 4 fontes independentes com DOI verificado no Crossref', () => {
    const dois = why.estudos_pivotais.map(e => e.doi);
    expect(dois).toEqual([
      '10.1002/14651858.CD008615.pub2',
      '10.1002/14651858.CD009108.pub2',
      '10.1016/S0140-6736(01)06711-3',
      '10.1136/bmj-2024-080107',
    ]);
  });

  it('Ferrari 2001 e BMJ 2024 não carregam NNT (o resumo não traz a taxa do placebo / só tem odds ratio)', () => {
    const ferrari = why.estudos_pivotais.find(e => e.nome.startsWith('Ferrari'))!;
    const bmj = why.estudos_pivotais.find(e => e.nome.startsWith('Karlsson'))!;
    expect(ferrari.nnt).toBeUndefined();
    expect(bmj.nnt).toBeUndefined();
    expect(ferrari.n_pacientes).toBe(24089);
    expect(bmj.n_pacientes).toBe(89445);
  });

  it('o consenso AHS 2021 não é apresentado como diretriz formal', () => {
    const j = why.justificativas_diretriz[0];
    expect(j.classe_recomendacao).toBe('Consenso');
    expect(j.resumo_recomendacao).toContain('na ausência de uma diretriz formal');
  });
});

describe('RM-97 — Propranolol: gerarWHY() usa a entrada curada', () => {
  const why = gerarWHY(molecula('Propranolol'));

  it('NNT 6 = ceil(5,3) da Tabela 3 de Jackson 2019 (não o 4,5 do texto, mais favorável)', () => {
    expect(Math.ceil(5.3)).toBe(6);
    expect(why.beneficio_risco.nnt).toBe(6);
  });

  it('guideline AAN/AHS 2026 (Nível B, RM-98) e DOIs verificados', () => {
    expect(why.justificativas_diretriz[0].doi).toBe('10.1212/WNL.0000000000214881');
    expect(why.justificativas_diretriz[0].ano).toBe(2026);
    expect(why.estudos_pivotais.map(e => e.doi)).toEqual([
      '10.1371/journal.pone.0212785',
      '10.1007/s00415-004-0464-6',
      '10.1212/WNL.0000000000218112',
    ]);
  });

  it('meta-análise não informa o total de pacientes: n_pacientes fica indefinido em vez de inventado', () => {
    expect(why.estudos_pivotais.find(e => e.nome.startsWith('Jackson'))!.n_pacientes).toBeUndefined();
    expect(why.estudos_pivotais.find(e => e.nome.startsWith('MIGR-003'))!.n_pacientes).toBe(575);
  });

  it('MIGR-003 não carrega NNT (o resumo não traz taxas de resposta)', () => {
    expect(why.estudos_pivotais.find(e => e.nome.startsWith('MIGR-003'))!.nnt).toBeUndefined();
  });

  it('a Cochrane retirada do propranolol (CD003225) não é citada', () => {
    expect(JSON.stringify(why)).not.toContain('CD003225');
  });
});

describe('RM-97 — WHATIF_DB para G43: 2 cenários de profilaxia', () => {
  const w = gerarWHATIF('G43');

  it('tem topiramato (NNT 4) e propranolol (NNT 6), nada de agudo misturado', () => {
    expect(w.cenarios.map(c => c.molecula)).toEqual(['Topiramato', 'Propranolol']);
    expect(w.cenarios.map(c => c.nnt)).toEqual([4, 6]);
  });

  it('NNTs batem com as entradas de EVIDENCIA_DB (mesma fonte, sem divergência)', () => {
    expect(w.cenarios[0].nnt).toBe(gerarWHY(molecula('Topiramato')).beneficio_risco.nnt);
    expect(w.cenarios[1].nnt).toBe(gerarWHY(molecula('Propranolol')).beneficio_risco.nnt);
  });

  it('não atribui trust_score (nota editorial sem método publicado)', () => {
    expect(w.cenarios.every(c => c.trust_score === undefined)).toBe(true);
    expect(w.melhor_perfil_paciente).toBe('');
  });

  it('avisa que a vantagem de NNT do topiramato é indireta (comparação direta MIGR-003 foi similar)', () => {
    expect(w.cenarios[0].desvantagens.join(' ')).toContain('comparação indireta');
  });

  it('custo/SUS iguais aos de ALTERNATIVAS_DB', () => {
    expect(w.cenarios[0].custo_mensal_brl).toBe(40);
    expect(w.cenarios[0].disponivel_sus).toBe(false);
    expect(w.cenarios[1].custo_mensal_brl).toBe(10);
    expect(w.cenarios[1].disponivel_sus).toBe(true);
  });
});

describe('RM-97 — consistência entre as 3 camadas', () => {
  it('second-opinion: sumatriptano e propranolol citam as mesmas fontes com n verificado', () => {
    const c = buscarCondicao('enxaqueca')!;
    const suma = c.opcoes.find(o => o.id === 'sumatriptano')!.evidencia.estudos;
    expect(suma.find(e => e.nome.includes('Ferrari'))!.n).toBe(24089);
    expect(suma.find(e => e.nome.includes('Overview'))!.n).toBe(6447);
    const prop = c.opcoes.find(o => o.id === 'propranolol_enxaqueca')!.evidencia.estudos;
    expect(prop.map(e => e.ano)).toEqual([2019, 2004]);
    expect(prop.find(e => e.nome.includes('MIGR-003'))!.n).toBe(575);
  });

  it('drug-comparator: NNT do sumatriptano 7 e do propranolol 6, iguais ao EVIDENCIA_DB', () => {
    const suma = getMoleculeById('sumatriptano')!;
    expect(suma.eficacia.find(e => e.nnt !== undefined)!.nnt).toBe(7);
    const prop = getMoleculeById('propranolol')!;
    expect(prop.eficacia.find(e => e.nnt !== undefined)!.nnt).toBe(6);
  });
});
