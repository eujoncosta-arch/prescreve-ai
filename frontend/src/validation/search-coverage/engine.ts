// ============================================================
// PRESCREVE-AI — RM-63: Contrato de Cobertura Total da Busca (engine)
//
// Lê o catálogo consolidado (`getAllDrugs()`) diretamente — mesma
// justificativa de RM-24/RM-40/RM-62 na allowlist do RM-06: esta é uma
// auditoria READ-ONLY do catálogo em si, não uma feature de produto que
// deveria consumir `pharma-core`/`drugRepository`.
// ============================================================

import { getAllDrugs, searchDrugs, type QuickDrug, type QuickBrand } from '@/lib/pharma-database';
import type {
  SearchCoverageException,
  SearchCoverageFailure,
  SearchCoverageMetrics,
  SearchCoverageReport,
} from './types';

/**
 * RM-63: definição explícita de "pesquisável". Não existe hoje, na base
 * real, nenhum sinal estrutural (campo/flag) de entidade "somente
 * interna"/não pesquisável — toda entidade com `id`, `molecula` e um
 * array de `marcas` (mesmo vazio) é, por política, pesquisável. Se uma
 * futura entidade precisar ser excluída, o critério aqui deve mudar
 * explicitamente (nunca silenciosamente via allowlist externa).
 */
export function isSearchableEntity(drug: QuickDrug): boolean {
  return !!drug.id && !!drug.molecula && Array.isArray(drug.marcas);
}

/**
 * Toda marca cadastrada é, por política, "ativa"/pesquisável — não há
 * hoje campo de descontinuação/inativação em `QuickBrand`. Mantido como
 * função (não `true` inline) para que uma extensão futura do tipo com um
 * campo de status real só precise mudar aqui.
 */
export function isSearchableBrand(_brand: QuickBrand): boolean {
  return true;
}

/**
 * `searchDrugs()` recusa por design consultas com menos de 2 caracteres
 * (`if (!query || query.length < 2) return [];`) — um alias/sinônimo mais
 * curto que isso NUNCA poderia ser encontrado, não por bug, mas por
 * contrato explícito do próprio motor de busca. Isso é uma EXCEÇÃO
 * DECLARADA (ver `explainAliasException`), nunca ignorada silenciosamente.
 */
export function isSearchableAlias(alias: string): boolean {
  return alias.trim().length >= 2;
}

/** Declara o motivo de uma exceção de alias — nunca um "skip" silencioso. */
export function explainAliasException(drugId: string, alias: string): SearchCoverageException | null {
  if (isSearchableAlias(alias)) return null;
  return {
    tipo: 'ALIAS_CURTO_DEMAIS',
    drugId,
    valor: alias,
    motivo: `searchDrugs() recusa consultas com menos de 2 caracteres por design ("${alias}" tem ${alias.trim().length}) — nunca encontrável, não é uma falha de cobertura.`,
  };
}

function stripAccentsForCheck(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Molécula normalizada sem acento é diferente da original → o teste de acento é "aplicável". */
function accentTestAplicavel(molecula: string): boolean {
  return stripAccentsForCheck(molecula) !== molecula.toLowerCase();
}

interface EntidadeCheckResult {
  failures: SearchCoverageFailure[];
  encontradaPorNome: boolean;
  marcasPesquisaveis: number;
  marcasEncontradas: number;
  aliasesPesquisaveis: number;
  aliasesEncontrados: number;
}

/**
 * "Resultados não retornam entidades incompatíveis com a consulta": em vez
 * de exigir que a PRÓPRIA entidade fique no topo do ranking (heurística que
 * gera falso-positivo real contra produtos combinados — ex.: buscar
 * "Semaglutida" legitimamente também retorna "Semaglutida 2,4 mg" e
 * "etinilestradiol + desogestrel" legitimamente aparece ao buscar
 * "desogestrel", sem que isso seja incompatibilidade), verificamos que TODO
 * resultado retornado tem uma justificativa textual real para a consulta —
 * replica exatamente os mesmos critérios de match de `searchDrugs()`
 * (substring livre em molécula/nome genérico/marca/laboratório; início de
 * palavra em sinônimo/classe/indicação). Um resultado sem NENHUMA dessas
 * justificativas seria, esse sim, incompatível.
 */
function resultadoTemJustificativa(resultado: QuickDrug, query: string): boolean {
  const q = stripAccentsForCheck(query.trim());
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wordRe = new RegExp(`(?:^|[\\s\\-\\/+®,(\\[])${esc}`, 'i');
  const wordMatch = (text: string) => wordRe.test(stripAccentsForCheck(text));

  if (stripAccentsForCheck(resultado.molecula).includes(q)) return true;
  if (stripAccentsForCheck(resultado.nome_generico).includes(q)) return true;
  if (resultado.sinonimos.some((s) => wordMatch(s) || stripAccentsForCheck(s) === q)) return true;
  if (wordMatch(resultado.classe)) return true;
  if (resultado.marcas.some((b) => stripAccentsForCheck(b.nome).includes(q) || stripAccentsForCheck(b.laboratorio).includes(q))) return true;
  if (resultado.indicacoes_principais.some((i) => wordMatch(i))) return true;
  return false;
}

function checarEntidade(drug: QuickDrug): EntidadeCheckResult {
  const failures: SearchCoverageFailure[] = [];

  // ── Teste 1: nome canônico (molécula) ──
  const porNome = searchDrugs(drug.molecula);
  const encontradaPorNome = porNome.some((d) => d.id === drug.id);
  if (!encontradaPorNome) {
    failures.push({
      tipo: 'ENTIDADE_NAO_ENCONTRADA',
      drugId: drug.id,
      molecula: drug.molecula,
      query: drug.molecula,
      detalhe: `Buscar pelo nome canônico "${drug.molecula}" não retornou a própria entidade.`,
    });
  }

  for (const resultado of porNome) {
    if (!resultadoTemJustificativa(resultado, drug.molecula)) {
      failures.push({
        tipo: 'RESULTADO_INCOMPATIVEL',
        drugId: drug.id,
        molecula: drug.molecula,
        query: drug.molecula,
        detalhe: `Busca por "${drug.molecula}" retornou "${resultado.molecula}" (${resultado.id}) sem nenhuma justificativa textual (substring/word-match) — resultado incompatível com a consulta.`,
      });
    }
  }

  // ── Teste 2: nome sem acento (quando aplicável) ──
  if (accentTestAplicavel(drug.molecula)) {
    const semAcento = stripAccentsForCheck(drug.molecula);
    if (semAcento.length >= 2) {
      const porNomeSemAcento = searchDrugs(semAcento);
      if (!porNomeSemAcento.some((d) => d.id === drug.id)) {
        failures.push({
          tipo: 'ENTIDADE_NAO_ENCONTRADA',
          drugId: drug.id,
          molecula: drug.molecula,
          query: semAcento,
          detalhe: `Busca pelo nome normalizado sem acento ("${semAcento}", derivado de "${drug.molecula}") não encontrou a entidade.`,
        });
      }
    }
  }

  // ── Teste 3: cada marca ativa ──
  let marcasPesquisaveis = 0;
  let marcasEncontradas = 0;
  for (const brand of drug.marcas) {
    if (!isSearchableBrand(brand)) continue;
    marcasPesquisaveis++;
    if (brand.nome.trim().length < 2) continue; // mesmo contrato de 2 chars do motor
    const porMarca = searchDrugs(brand.nome);
    if (porMarca.some((d) => d.id === drug.id)) {
      marcasEncontradas++;
    } else {
      failures.push({
        tipo: 'MARCA_NAO_ENCONTRADA',
        drugId: drug.id,
        molecula: drug.molecula,
        query: brand.nome,
        detalhe: `Buscar pela marca "${brand.nome}" não retornou a molécula "${drug.molecula}" à qual pertence.`,
      });
    }
  }

  // ── Teste 4: cada alias/sinônimo pesquisável ──
  let aliasesPesquisaveis = 0;
  let aliasesEncontrados = 0;
  for (const alias of drug.sinonimos ?? []) {
    if (!isSearchableAlias(alias)) continue; // exceção declarada — ver explainAliasException
    aliasesPesquisaveis++;
    const porAlias = searchDrugs(alias);
    if (porAlias.some((d) => d.id === drug.id)) {
      aliasesEncontrados++;
    } else {
      failures.push({
        tipo: 'ALIAS_NAO_ENCONTRADO',
        drugId: drug.id,
        molecula: drug.molecula,
        query: alias,
        detalhe: `Buscar pelo alias/sinônimo "${alias}" não retornou a molécula "${drug.molecula}" à qual pertence.`,
      });
    }
  }

  return { failures, encontradaPorNome, marcasPesquisaveis, marcasEncontradas, aliasesPesquisaveis, aliasesEncontrados };
}

function normalizarMolecula(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Teste 6 (duplicidade): duas entidades com o MESMO nome de molécula só são
 * legítimas se representarem variantes de CONTEXTO CLÍNICO distintas
 * (`indicacao_contexto` não-vazio e diferente entre si — convenção RM-01
 * MED-01, ex.: "midazolam" geral vs. UTI vs. paliativo). Qualquer outro caso
 * é uma duplicidade indevida.
 */
export function checkUnduePharmaDuplicates(drugs: QuickDrug[]): SearchCoverageFailure[] {
  const porMolecula = new Map<string, QuickDrug[]>();
  for (const d of drugs) {
    const chave = normalizarMolecula(d.molecula);
    const arr = porMolecula.get(chave);
    if (arr) arr.push(d); else porMolecula.set(chave, [d]);
  }

  const failures: SearchCoverageFailure[] = [];
  for (const grupo of porMolecula.values()) {
    if (grupo.length < 2) continue;
    const contextos = grupo.map((d) => d.indicacao_contexto?.trim() || '');
    const todosPreenchidos = contextos.every((c) => c.length > 0);
    const todosUnicos = new Set(contextos).size === contextos.length;
    if (!todosPreenchidos || !todosUnicos) {
      failures.push({
        tipo: 'DUPLICIDADE_INDEVIDA',
        drugId: grupo.map((d) => d.id).join(', '),
        molecula: grupo[0].molecula,
        detalhe:
          `${grupo.length} entidades compartilham o nome de molécula "${grupo[0].molecula}" ` +
          `(ids: ${grupo.map((d) => d.id).join(', ')}) sem todas terem \`indicacao_contexto\` ` +
          'preenchido e distinto entre si — duplicidade indevida (não é uma variante de contexto legítima).',
      });
    }
  }
  return failures;
}

export interface BuildSearchCoverageReportOptions {
  drugs?: QuickDrug[];
}

export function buildSearchCoverageReport(opts: BuildSearchCoverageReportOptions = {}): SearchCoverageReport {
  const drugs = opts.drugs ?? getAllDrugs();
  const failures: SearchCoverageFailure[] = [];

  let entidadesPesquisaveis = 0;
  let entidadesEncontradasPorNome = 0;
  let marcasPesquisaveis = 0;
  let marcasEncontradas = 0;
  let aliasesPesquisaveis = 0;
  let aliasesEncontrados = 0;

  for (const drug of drugs) {
    if (!isSearchableEntity(drug)) continue;
    entidadesPesquisaveis++;
    const r = checarEntidade(drug);
    if (r.encontradaPorNome) entidadesEncontradasPorNome++;
    marcasPesquisaveis += r.marcasPesquisaveis;
    marcasEncontradas += r.marcasEncontradas;
    aliasesPesquisaveis += r.aliasesPesquisaveis;
    aliasesEncontrados += r.aliasesEncontrados;
    failures.push(...r.failures);
  }

  failures.push(...checkUnduePharmaDuplicates(drugs));

  const pct = (found: number, total: number) => (total === 0 ? 100 : Math.round((found / total) * 10000) / 100);

  const metrics: SearchCoverageMetrics = {
    entidadesTotais: drugs.length,
    entidadesPesquisaveis,
    entidadesEncontradasPorNome,
    marcasPesquisaveis,
    marcasEncontradas,
    aliasesPesquisaveis,
    aliasesEncontrados,
    coberturaEntidadesPct: pct(entidadesEncontradasPorNome, entidadesPesquisaveis),
    coberturaMarcasPct: pct(marcasEncontradas, marcasPesquisaveis),
    coberturaAliasesPct: pct(aliasesEncontrados, aliasesPesquisaveis),
  };

  return {
    timestamp: new Date().toISOString(),
    metrics,
    failures,
    contractOk:
      metrics.coberturaEntidadesPct === 100 &&
      metrics.coberturaMarcasPct === 100 &&
      metrics.coberturaAliasesPct === 100,
  };
}
