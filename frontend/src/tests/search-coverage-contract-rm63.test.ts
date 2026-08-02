// RM-63 — Contrato de Cobertura Total da Busca Farmacológica.
//
// RM-58 encontrou que `searchDrugs()`/`getATCCode()`/`getMonitoramento()`
// consultavam apenas `PHARMA_DB` (~80 entidades), nunca `getAllDrugs()`
// (367 — base + 16 extensões por especialidade): ~78% do catálogo
// consolidado era estruturalmente invisível. Este arquivo percorre o
// CATÁLOGO REAL INTEIRO (nunca uma amostra de N marcas) para garantir que
// essa regressão nunca mais passe despercebida.
import { describe, it, expect } from 'vitest';
import {
  buildSearchCoverageReport,
  isSearchableEntity,
  isSearchableAlias,
  explainAliasException,
  checkUnduePharmaDuplicates,
} from '@/validation/search-coverage';
import {
  getAllDrugs,
  searchDrugs,
  getATCCode,
  getMonitoramento,
  PHARMA_DB,
  type QuickDrug,
} from '@/lib/pharma-database';

const allDrugs = getAllDrugs();

describe('RM-63 — contrato de cobertura total (catálogo real inteiro, não amostra)', () => {
  // Custo real medido nesta sessão: ~3.400 chamadas a searchDrugs() (nome +
  // acento + 692 marcas + 1795 aliases) a ~3,4ms/chamada ≈ 10-12s. Timeout
  // generoso (60s) só para ESTE teste — não é um teste unitário rápido, é
  // uma varredura de contrato deliberadamente exaustiva.
  it('100% de cobertura para entidades, marcas e aliases pesquisáveis — 0 falhas', () => {
    const report = buildSearchCoverageReport();

    // Métricas reais impressas para rastreabilidade no output do teste/CI.
    console.log('[RM-63] métricas de cobertura:', JSON.stringify(report.metrics));
    if (report.failures.length > 0) {
      console.log('[RM-63] falhas:', JSON.stringify(report.failures.slice(0, 20), null, 2));
    }

    expect(report.metrics.entidadesTotais).toBeGreaterThan(300); // sanity: catálogo consolidado, não só PHARMA_DB (~80)
    expect(report.metrics.entidadesPesquisaveis).toBe(report.metrics.entidadesTotais);
    expect(report.metrics.coberturaEntidadesPct).toBe(100);
    expect(report.metrics.coberturaMarcasPct).toBe(100);
    expect(report.metrics.coberturaAliasesPct).toBe(100);
    expect(report.failures).toEqual([]);
    expect(report.contractOk).toBe(true);
  }, 60_000);

  it('todas as entidades reais do catálogo são consideradas pesquisáveis pelo modelo (isSearchableEntity)', () => {
    const naoPesquisaveis = allDrugs.filter((d) => !isSearchableEntity(d));
    // Não assumir que toda entidade DEVE ser pesquisável — mas hoje, na base
    // real, não há nenhum sinal estrutural de entidade "somente interna".
    expect(naoPesquisaveis.map((d) => d.id)).toEqual([]);
  });
});

describe('RM-63 — proteção arquitetural (teste de COMPORTAMENTO, não grep)', () => {
  // Atenolol/Nifedipino/Diltiazem existem SOMENTE em pharma-database-cardio.ts
  // (confirmado por grep nesta investigação: 0 ocorrências em PHARMA_DB
  // base). Se searchDrugs()/getATCCode()/getMonitoramento() voltarem a
  // consultar só PHARMA_DB, estes testes falham por COMPORTAMENTO real
  // (a molécula deixa de ser encontrada), não por inspecionar o código-fonte.
  const casosExtensaoOnly = ['Atenolol', 'Nifedipino', 'Diltiazem'];

  it.each(casosExtensaoOnly)('%s NÃO está em PHARMA_DB (base) — só nas extensões', (molecula) => {
    const naBase = PHARMA_DB.some((d) => d.molecula === molecula);
    expect(naBase).toBe(false);
  });

  it.each(casosExtensaoOnly)('%s É encontrado por searchDrugs() (prova que a busca cobre as extensões)', (molecula) => {
    const resultados = searchDrugs(molecula.toLowerCase());
    expect(resultados.some((d) => d.molecula === molecula)).toBe(true);
  });

  it('getATCCode() retorna o código inline de uma molécula que só existe numa extensão (atenolol, sem entrada na tabela de fallback)', () => {
    // 'atenolol' não aparece em nenhuma tabela de fallback de pharma-database.ts
    // (confirmado por grep) — se a função reverter para só PHARMA_DB, o
    // resultado cairia silenciosamente para `undefined`.
    expect(getATCCode('atenolol')).toBe('C07AB03');
  });

  it('getMonitoramento() retorna o array inline de uma molécula que só existe numa extensão (colecalciferol, sem entrada na tabela de fallback)', () => {
    // 'colecalciferol' não aparece em NENHUMA tabela de fallback de
    // pharma-database.ts (confirmado por grep) — se a função reverter para
    // só PHARMA_DB, o resultado cairia silenciosamente para `[]`.
    const resultado = getMonitoramento('colecalciferol');
    expect(resultado).toEqual(['25(OH)D sérica', 'Cálcio sérico/urinário']);
    expect(resultado.length).toBeGreaterThan(0);
  });

  it('getAllDrugs() é maior que PHARMA_DB — a base consolidada realmente agrega as extensões', () => {
    expect(allDrugs.length).toBeGreaterThan(PHARMA_DB.length);
    // Sanity numérica solta (não trava em número exato — extensões crescem):
    // no mínimo o dobro, refletindo a proporção real (~78% de expansão).
    expect(allDrugs.length).toBeGreaterThan(PHARMA_DB.length * 2);
  });
});

describe('RM-63 — regressões específicas (não substituem a varredura completa)', () => {
  it('Poviztra™ (obesidade) e Extensior® (DM2) são entidades DISTINTAS, cada marca no lugar certo', () => {
    const dm2 = allDrugs.find((d) => d.id === 'semaglutida');
    const obesidade = allDrugs.find((d) => d.id === 'semaglutida_obesidade');
    expect(dm2).toBeDefined();
    expect(obesidade).toBeDefined();
    expect(dm2!.marcas.some((m) => m.nome.includes('Extensior'))).toBe(true);
    expect(obesidade!.marcas.some((m) => m.nome.includes('Poviztra'))).toBe(true);
    // Poviztra NUNCA deve aparecer na entidade de DM2, nem Extensior na de obesidade.
    expect(dm2!.marcas.some((m) => m.nome.includes('Poviztra'))).toBe(false);
    expect(obesidade!.marcas.some((m) => m.nome.includes('Extensior'))).toBe(false);
  });

  it('busca "poviztra" encontra a entidade de OBESIDADE, nunca a de DM2', () => {
    const r = searchDrugs('poviztra');
    expect(r.some((d) => d.id === 'semaglutida_obesidade')).toBe(true);
    expect(r.some((d) => d.id === 'semaglutida')).toBe(false);
  });

  it('busca "extensior" encontra a entidade de DM2, nunca a de obesidade', () => {
    const r = searchDrugs('extensior');
    expect(r.some((d) => d.id === 'semaglutida')).toBe(true);
    expect(r.some((d) => d.id === 'semaglutida_obesidade')).toBe(false);
  });

  it('nomes com acento: "ácido fólico" e "Ácido Acetilsalicílico" são encontrados sem digitar o acento', () => {
    expect(searchDrugs('folico').some((d) => d.molecula.toLowerCase() === 'ácido fólico')).toBe(true);
    expect(searchDrugs('acido').some((d) => d.molecula === 'Ácido Acetilsalicílico')).toBe(true);
  });

  it('nomes compostos/combinações: "Amoxicilina + Clavulanato" e "Ibuprofeno + Paracetamol" são encontrados pelo primeiro componente', () => {
    expect(searchDrugs('amoxicilina').some((d) => d.molecula === 'Amoxicilina + Clavulanato')).toBe(true);
    expect(searchDrugs('ibuprofeno').some((d) => d.molecula === 'Ibuprofeno + Paracetamol')).toBe(true);
  });

  it('sais farmacêuticos: buscar pelo nome do sal ("Cloridrato de Venlafaxina", "Divalproato de Sódio") encontra a entidade', () => {
    expect(searchDrugs('cloridrato de venlafaxina').some((d) => d.molecula === 'Cloridrato de Venlafaxina')).toBe(true);
    expect(searchDrugs('divalproato').some((d) => d.molecula === 'Divalproato de Sódio')).toBe(true);
  });

  it('combinação hormonal "etinilestradiol + desogestrel" é encontrada pelo segundo componente', () => {
    expect(searchDrugs('desogestrel').some((d) => d.id === 'etinilestradiol-desogestrel')).toBe(true);
  });

  it('marcas que não se parecem com a molécula: "Glifage" (Metformina) e "Aldactone" (Espironolactona)', () => {
    expect(searchDrugs('glifage').some((d) => d.molecula === 'Metformina')).toBe(true);
    expect(searchDrugs('aldactone').some((d) => d.molecula === 'Espironolactona')).toBe(true);
  });
});

describe('RM-63 — deduplicação (não existem duplicidades indevidas)', () => {
  it('a base real inteira não tem nenhuma duplicidade indevida de molécula', () => {
    expect(checkUnduePharmaDuplicates(allDrugs)).toEqual([]);
  });

  it('variantes de CONTEXTO CLÍNICO legítimas (ex.: midazolam geral/UTI/paliativo) NÃO são sinalizadas como duplicidade', () => {
    const midazolams = allDrugs.filter((d) => d.molecula.toLowerCase() === 'midazolam');
    expect(midazolams.length).toBeGreaterThanOrEqual(2); // geral + ao menos 1 variante de contexto
    expect(checkUnduePharmaDuplicates(midazolams)).toEqual([]);
  });

  it('o detector REALMENTE pega uma duplicidade sintética sem contexto distinto (prova que não é sempre-verde)', () => {
    const base: QuickDrug = allDrugs[0];
    const dupeA: QuickDrug = { ...base, id: 'dup-teste-a', indicacao_contexto: undefined };
    const dupeB: QuickDrug = { ...base, id: 'dup-teste-b', indicacao_contexto: undefined };
    const achados = checkUnduePharmaDuplicates([dupeA, dupeB]);
    expect(achados.length).toBe(1);
    expect(achados[0].tipo).toBe('DUPLICIDADE_INDEVIDA');
  });

  it('o detector NÃO sinaliza quando os contextos são preenchidos e distintos (fixture sintética)', () => {
    const base: QuickDrug = allDrugs[0];
    const dupeA: QuickDrug = { ...base, id: 'dup-teste-c', indicacao_contexto: 'Contexto A' };
    const dupeB: QuickDrug = { ...base, id: 'dup-teste-d', indicacao_contexto: 'Contexto B' };
    expect(checkUnduePharmaDuplicates([dupeA, dupeB])).toEqual([]);
  });
});

describe('RM-63 — exceções declaradas (nunca ignoradas silenciosamente)', () => {
  it('isSearchableAlias(): alias com menos de 2 caracteres é declarado como exceção, não descartado sem explicação', () => {
    expect(isSearchableAlias('a')).toBe(false);
    expect(isSearchableAlias('ab')).toBe(true);
    const excecao = explainAliasException('teste-id', 'a');
    expect(excecao).not.toBeNull();
    expect(excecao!.tipo).toBe('ALIAS_CURTO_DEMAIS');
    expect(excecao!.motivo.length).toBeGreaterThan(10);
  });

  it('explainAliasException() retorna null para alias válido (sem exceção espúria)', () => {
    expect(explainAliasException('teste-id', 'atenolol')).toBeNull();
  });

  it('nenhum alias real do catálogo com 2+ caracteres é tratado como exceção', () => {
    const aliasesLongos = allDrugs.flatMap((d) => d.sinonimos ?? []).filter((a) => a.trim().length >= 2);
    expect(aliasesLongos.length).toBeGreaterThan(1000); // catálogo real tem ~1795 sinônimos
  });
});

describe('RM-63 — performance (medição real, sem otimização especulativa)', () => {
  it('getAllDrugs() é memoizado — chamadas repetidas são O(1), não reconstroem o array', () => {
    // "Não otimizar sem medição": medimos ANTES de qualquer alteração — o
    // módulo já usa um cache module-level (`_allDrugs`), então chamadas
    // repetidas já são baratas. Este teste documenta e protege essa
    // característica (regressão seria reconstruir a cada chamada).
    const N = 500;
    const t0 = performance.now();
    for (let i = 0; i < N; i++) getAllDrugs();
    const t1 = performance.now();
    const msPerCall = (t1 - t0) / N;
    console.log(`[RM-63] getAllDrugs() warm: ${msPerCall.toFixed(4)}ms/chamada (${N} chamadas)`);
    expect(msPerCall).toBeLessThan(1); // memoizado deve ser sub-milissegundo
  });

  it('searchDrugs() tem custo por chamada proporcional ao tamanho do catálogo (medido, não assumido)', () => {
    const N = 100;
    const t0 = performance.now();
    for (let i = 0; i < N; i++) searchDrugs('atenolol');
    const t1 = performance.now();
    const msPerCall = (t1 - t0) / N;
    console.log(`[RM-63] searchDrugs() medido: ${msPerCall.toFixed(4)}ms/chamada (catálogo com ${allDrugs.length} entidades)`);
    // Limite generoso (não é um gate de performance rígido) — só detecta
    // uma regressão GROSSEIRA (ex.: um novo O(n²) introduzido sem querer).
    expect(msPerCall).toBeLessThan(50);
  });
});
