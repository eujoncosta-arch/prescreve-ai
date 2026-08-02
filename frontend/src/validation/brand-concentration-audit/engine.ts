// ============================================================
// PRESCREVE-AI — RM-62: Gate de Integridade Comercial Farmacológica (engine)
//
// Substitui a auditoria manual de RM-58 (`audit-brand-concentrations.mjs`,
// que nunca retornava exit code não-zero) por 3 regras determinísticas:
//
//  1. PRODUTO_ID_CONCENTRACAO_DIVERGENTE (BLOCKING_ERROR) — uma marca que
//     se declara vinculada a um produto do catálogo verificado
//     (`produto_id`) mas cujas concentrações hardcoded contradizem a fonte
//     verificada. Este é o formato EXATO do bug real do Sinot Clav®: dado
//     comercial hardcoded divergindo da fonte que deveria governá-lo.
//     `enrichWithEurofarma()` já corrige isso automaticamente para
//     PHARMA_DB base — mas NÃO para as extensões por especialidade
//     (pharma-database-endo.ts, -cardio.ts etc.), que também podem conter
//     marcas com `produto_id` hardcoded sem essa correção automática.
//
//  2. MARCA_DUPLICADA_LABS_INCOMPATIVEIS (BLOCKING_ERROR) — o mesmo nome
//     comercial atribuído a 2+ laboratórios CANÔNICOS diferentes (após
//     resolver aliases via `resolveLaboratory`) para a mesma molécula —
//     estruturalmente incompatível, salvo um caso documentado de
//     co-marketing (que deveria então virar uma ACCEPTED_EXCEPTION).
//
//  3. CONCENTRACAO_IDENTICA_ENTRE_LABS (REVIEW_REQUIRED por padrão,
//     ACCEPTED_EXCEPTION quando casar com uma exceção documentada) — a
//     heurística original da RM-58: mesma assinatura de concentração para
//     a mesma molécula em laboratórios diferentes. NUNCA é promovida
//     automaticamente a erro — genéricos regulatoriamente equivalentes ao
//     medicamento de referência LEGITIMAMENTE compartilham a mesma
//     concentração (essa é a norma, não a exceção).
//
// Determinístico: nenhuma aleatoriedade, nenhuma dependência de Date.now()
// para decidir classificação (só para o timestamp do relatório), e toda
// lista de achados é explicitamente ordenada — não depende da ordem de
// iteração de Map/Set nem da ordem de import dos módulos de origem.
// ============================================================

import { getAllDrugs, type QuickDrug, type QuickBrand } from '@/lib/pharma-database';
import { EUROFARMA_CATALOG } from '@/lib/eurofarma-sync';
import { getAllLabProducts } from '@/lib/lab-catalog';
import { resolveLaboratory } from '@/lib/governance/data-governance';
import type { ProdutoComercial } from '@/lib/types';
import { ACCEPTED_EXCEPTIONS } from './exceptions';
import type {
  BrandConcentrationException,
  BrandConcentrationFinding,
  BrandConcentrationReport,
} from './types';

/**
 * Normaliza para comparação por CONJUNTO (não lista) — `ProdutoComercial.apresentacoes`
 * pode ter múltiplas linhas com a MESMA concentração (embalagens/formas
 * diferentes, ex.: "20 mg" em caixa de 30 e caixa de 60 comprimidos), o que
 * NÃO é uma divergência de concentração real. Comparar arrays ordenados
 * sem deduplicar geraria falso-positivo só pela contagem de repetições.
 */
function normalizarConcentracoes(lista: string[]): string[] {
  return [...new Set(lista.map((c) => c.trim()))].sort();
}

function chaveMolecula(molecula: string): string {
  return molecula.trim().toLowerCase();
}

function labelMarca(m: QuickBrand): string {
  return `${m.nome} (${m.laboratorio})`;
}

function ordenarAchados(achados: BrandConcentrationFinding[]): BrandConcentrationFinding[] {
  return [...achados].sort((a, b) =>
    a.regra.localeCompare(b.regra) ||
    a.molecula.localeCompare(b.molecula) ||
    (a.marcas[0] ?? '').localeCompare(b.marcas[0] ?? ''),
  );
}

function excecaoAplicavel(
  molecula: string,
  concentracoes: string[],
  excecoes: BrandConcentrationException[],
): BrandConcentrationException | undefined {
  const chaveMol = chaveMolecula(molecula);
  const chaveConc = normalizarConcentracoes(concentracoes).join('|');
  return excecoes.find(
    (e) => chaveMolecula(e.molecula) === chaveMol && normalizarConcentracoes(e.concentracoes).join('|') === chaveConc,
  );
}

/**
 * Constrói o índice `produto_id → ProdutoComercial` a partir dos catálogos
 * verificados. Eurofarma tem precedência (mesma convenção de
 * `pharma-core/migrate.ts` `buildProductIndex()`) — o primeiro a registrar
 * um `id` vence, para os dois catálogos poderem se sobrepor sem conflito.
 */
export function buildCatalogIndex(products: ProdutoComercial[]): Map<string, ProdutoComercial> {
  const byId = new Map<string, ProdutoComercial>();
  for (const p of products) {
    if (!byId.has(p.id)) byId.set(p.id, p);
  }
  return byId;
}

/** REGRA 1 — `produto_id` hardcoded divergente da fonte verificada. */
export function checkProdutoIdMismatch(
  drugs: QuickDrug[],
  catalogById: Map<string, ProdutoComercial>,
): BrandConcentrationFinding[] {
  const achados: BrandConcentrationFinding[] = [];
  for (const d of drugs) {
    for (const m of d.marcas) {
      if (!m.produto_id) continue;
      const produto = catalogById.get(m.produto_id);
      if (!produto) continue; // produto_id não resolve a nenhum catálogo conhecido — fora do escopo desta regra

      const hardcoded = normalizarConcentracoes(m.concentracoes);
      const verificado = normalizarConcentracoes(produto.apresentacoes.map((a) => a.concentracao));
      if (JSON.stringify(hardcoded) !== JSON.stringify(verificado)) {
        achados.push({
          classification: 'BLOCKING_ERROR',
          regra: 'PRODUTO_ID_CONCENTRACAO_DIVERGENTE',
          molecula: d.molecula,
          concentracoes: hardcoded,
          marcas: [labelMarca(m)],
          mensagem:
            `Marca "${m.nome}" declara produto_id="${m.produto_id}" (vínculo a fonte verificada) mas suas ` +
            `concentrações hardcoded [${hardcoded.join(', ')}] divergem das concentrações reais do catálogo ` +
            `verificado [${verificado.join(', ')}] para este produto.`,
        });
      }
    }
  }
  return ordenarAchados(achados);
}

/** REGRA 2 — mesmo nome comercial em laboratórios canônicos diferentes. */
export function checkDuplicateBrandAcrossLabs(drugs: QuickDrug[]): BrandConcentrationFinding[] {
  const achados: BrandConcentrationFinding[] = [];
  for (const d of drugs) {
    const porNome = new Map<string, QuickBrand[]>();
    for (const m of d.marcas) {
      const chave = m.nome.trim().toLowerCase();
      const arr = porNome.get(chave);
      if (arr) arr.push(m); else porNome.set(chave, [m]);
    }
    for (const marcas of porNome.values()) {
      if (marcas.length < 2) continue;
      const labsCanonicos = new Set(marcas.map((m) => resolveLaboratory(m.lab_id || m.laboratorio).laboratory_id));
      if (labsCanonicos.size < 2) continue; // mesmo laboratório (ou alias do mesmo) — não é duplicidade real
      achados.push({
        classification: 'BLOCKING_ERROR',
        regra: 'MARCA_DUPLICADA_LABS_INCOMPATIVEIS',
        molecula: d.molecula,
        concentracoes: normalizarConcentracoes(marcas.flatMap((m) => m.concentracoes)),
        marcas: marcas.map(labelMarca),
        mensagem:
          `O nome comercial "${marcas[0].nome}" está atribuído a ${labsCanonicos.size} laboratórios ` +
          `canônicos DIFERENTES ([${[...labsCanonicos].join(', ')}]) para a mesma molécula — estruturalmente ` +
          'incompatível, a menos que seja um caso documentado de co-marketing (registrar como ACCEPTED_EXCEPTION).',
      });
    }
  }
  return ordenarAchados(achados);
}

/** REGRA 3 — heurística original RM-58: concentração idêntica entre labs → REVIEW_REQUIRED (nunca BLOCKING por si só). */
export function checkConcentrationOverlap(
  drugs: QuickDrug[],
  excecoes: BrandConcentrationException[],
): BrandConcentrationFinding[] {
  const achados: BrandConcentrationFinding[] = [];
  for (const d of drugs) {
    const porAssinatura = new Map<string, QuickBrand[]>();
    for (const m of d.marcas) {
      const chave = normalizarConcentracoes(m.concentracoes).join('|');
      const arr = porAssinatura.get(chave);
      if (arr) arr.push(m); else porAssinatura.set(chave, [m]);
    }
    for (const marcas of porAssinatura.values()) {
      if (marcas.length < 2) continue;
      const labsCanonicos = new Set(marcas.map((m) => resolveLaboratory(m.lab_id || m.laboratorio).laboratory_id));
      if (labsCanonicos.size < 2) continue; // mesmo laboratório repetindo a mesma marca — não é o padrão sob auditoria

      const concentracoes = normalizarConcentracoes(marcas[0].concentracoes);
      const excecao = excecaoAplicavel(d.molecula, concentracoes, excecoes);
      achados.push({
        classification: excecao ? 'ACCEPTED_EXCEPTION' : 'REVIEW_REQUIRED',
        regra: 'CONCENTRACAO_IDENTICA_ENTRE_LABS',
        molecula: d.molecula,
        concentracoes,
        marcas: marcas.map(labelMarca),
        mensagem: excecao
          ? `Concentrações idênticas entre laboratórios diferentes — exceção aceita "${excecao.id}": ${excecao.justificativa} (referência: ${excecao.referencia})`
          : `Concentrações idênticas entre ${labsCanonicos.size} laboratórios diferentes para a mesma molécula — ` +
            'pode ser bioequivalência regulatória legítima (norma para genéricos) OU dado copiado sem verificação. ' +
            'Requer revisão humana; não bloqueia o build por si só.',
        exceptionId: excecao?.id,
      });
    }
  }
  return ordenarAchados(achados);
}

export interface RunAuditOptions {
  drugs?: QuickDrug[];
  catalogProducts?: ProdutoComercial[];
  excecoes?: BrandConcentrationException[];
}

/** Ponto de entrada único — combina as 3 regras num relatório determinístico. */
export function runBrandConcentrationAudit(opts: RunAuditOptions = {}): BrandConcentrationReport {
  const drugs = opts.drugs ?? getAllDrugs();
  const excecoes = opts.excecoes ?? ACCEPTED_EXCEPTIONS;

  let catalogProducts = opts.catalogProducts;
  if (!catalogProducts) {
    catalogProducts = [...EUROFARMA_CATALOG];
    try {
      catalogProducts = catalogProducts.concat(getAllLabProducts());
    } catch {
      /* lab-catalog indisponível (ex.: SSR estático) — segue só com Eurofarma */
    }
  }
  const catalogById = buildCatalogIndex(catalogProducts);

  const findings: BrandConcentrationFinding[] = [
    ...checkProdutoIdMismatch(drugs, catalogById),
    ...checkDuplicateBrandAcrossLabs(drugs),
    ...checkConcentrationOverlap(drugs, excecoes),
  ];

  const bySeverity: BrandConcentrationReport['bySeverity'] = {
    BLOCKING_ERROR: 0,
    REVIEW_REQUIRED: 0,
    ACCEPTED_EXCEPTION: 0,
  };
  for (const f of findings) bySeverity[f.classification]++;

  return {
    timestamp: new Date().toISOString(),
    totalDrugs: drugs.length,
    totalBrands: drugs.reduce((s, d) => s + d.marcas.length, 0),
    findings,
    bySeverity,
    buildOk: bySeverity.BLOCKING_ERROR === 0,
  };
}
