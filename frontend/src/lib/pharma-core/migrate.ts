// ============================================================
// PRESCREVE-AI — RM-06: Migração das bases legadas → base canônica
//
// Constrói a Single Source of Truth (DrugEntity[]) a partir das fontes
// existentes, SEM alterá-las. Esta é a ÚNICA função autorizada a ler as
// bases legadas — o resto do sistema consome apenas o Drug Repository.
//
// Fonte primária: getAllDrugs() (PHARMA_DB, já enriquecido com marcas de
// Eurofarma + lab-catalog). Enriquecimento de apresentações (registro ANVISA,
// bulas) via os catálogos ProdutoComercial. IDs e proveniência via RM-00.
// ============================================================

import { getAllDrugs, getATCCode } from '../pharma-database';
import type { QuickDrug } from '../pharma-database';
import { EUROFARMA_CATALOG } from '../eurofarma-sync';
import { getAllLabProducts } from '../lab-catalog';
import type { ProdutoComercial } from '../types';
import {
  toSlug,
  toMoleculeId,
  toBrandId,
  toDrugId,
  resolveLaboratory,
} from '../governance/data-governance';
import type { DataProvenance, ConfidenceLevel, DataOrigin } from '../governance/data-governance';
import type {
  DrugEntity,
  Brand,
  Laboratory,
  Presentation,
  Interaction,
  DosageRule,
  Reference,
} from './types';

function labSlugOf(b: { lab_id?: string; laboratorio?: string }): string {
  return toSlug(b.lab_id || b.laboratorio || 'generico');
}

/** Índices dos catálogos ProdutoComercial (para enriquecer apresentações). */
function buildProductIndex(): Map<string, ProdutoComercial> {
  const byBrandId = new Map<string, ProdutoComercial>();
  let all: ProdutoComercial[] = [...EUROFARMA_CATALOG];
  try {
    all = all.concat(getAllLabProducts());
  } catch {
    /* lab-catalog indisponível no SSR estático — segue só com Eurofarma */
  }
  for (const p of all) {
    const brandId = toBrandId(p.nome_comercial, p.lab_id);
    // primeiro a registrar vence (Eurofarma antes dos demais)
    if (!byBrandId.has(brandId)) byBrandId.set(brandId, p);
  }
  return byBrandId;
}

function inferConfidence(hasAnvisa: boolean, verified: boolean, hasAtc: boolean): ConfidenceLevel {
  if (hasAnvisa) return 'ALTA';
  if (verified || hasAtc) return 'MEDIA';
  return 'NAO_VERIFICADO';
}

function buildDosageRules(d: QuickDrug): DosageRule[] {
  const rules: DosageRule[] = [];
  if (d.dose_adulto) {
    rules.push({
      population: 'adulto',
      summary: d.dose_adulto.habitual,
      route: d.dose_adulto.via,
      unit: d.dose_adulto.unidade,
      detail: {
        min: d.dose_adulto.min,
        max: d.dose_adulto.max,
        frequencias: (d.dose_adulto.frequencias || []).join(' | '),
        instrucoes: d.dose_adulto.instrucoes,
      },
    });
  }
  if (d.dose_pediatrica) {
    const p = d.dose_pediatrica;
    rules.push({
      population: 'pediatrico',
      summary: `${p.dose_por_kg} ${p.unidade} (${p.faixa_etaria})`,
      unit: p.unidade,
      detail: {
        calculo: p.calculo,
        dose_por_kg: p.dose_por_kg,
        frequencia_divisoes: p.frequencia_divisoes,
        max_dose_dia: p.max_dose_dia,
        max_dose_dia_unidade: p.max_dose_dia_unidade,
        observacao: p.observacao,
      },
    });
  } else if (d.uso_pediatrico === 'nao_aplicavel') {
    rules.push({ population: 'pediatrico', summary: 'Não se aplica (fármaco de uso adulto)' });
  }
  if (d.ajuste_renal) {
    const r = d.ajuste_renal;
    rules.push({
      population: 'renal',
      summary: `TFG 30–60: ${r.tfg_60_30}; TFG 15–30: ${r.tfg_30_15}; TFG <15: ${r.tfg_lt_15}`,
      detail: {
        normal: r.normal,
        tfg_60_30: r.tfg_60_30,
        tfg_30_15: r.tfg_30_15,
        tfg_lt_15: r.tfg_lt_15,
        dialisavel: r.dialisavel,
      },
    });
  }
  if (d.ajuste_hepatico) {
    const h = d.ajuste_hepatico;
    rules.push({
      population: 'hepatico',
      summary: `Child A: ${h.child_a}; Child B: ${h.child_b}; Child C: ${h.child_c}`,
      detail: { child_a: h.child_a, child_b: h.child_b, child_c: h.child_c },
    });
  }
  if (d.uso_gestante) rules.push({ population: 'gestante', summary: d.uso_gestante });
  if (d.uso_lactante) rules.push({ population: 'lactante', summary: d.uso_lactante });
  return rules;
}

function buildReferences(d: QuickDrug, atc?: string): Reference[] {
  const refs: Reference[] = [];
  if (atc) refs.push({ type: 'ATC', value: atc });
  for (const g of d.guidelines_referencia ?? []) refs.push({ type: 'GUIDELINE', value: g });
  if (d.nivel_evidencia || d.grau_recomendacao) {
    const partes = [
      d.nivel_evidencia ? `Nível ${d.nivel_evidencia}` : '',
      d.grau_recomendacao ? `Classe ${d.grau_recomendacao}` : '',
    ].filter(Boolean);
    refs.push({ type: 'EVIDENCIA', value: partes.join(' · ') });
  }
  if (d.beers_criteria) refs.push({ type: 'BEERS', value: d.beers_criteria });
  if (d.stopp) refs.push({ type: 'STOPP', value: d.stopp });
  if (d.start) refs.push({ type: 'START', value: d.start });
  for (const gene of d.pgx_genes ?? []) refs.push({ type: 'PGX', value: gene });
  return refs;
}

function toEntity(d: QuickDrug, prodByBrandId: Map<string, ProdutoComercial>): DrugEntity {
  const moleculeId = toMoleculeId(d.molecula || d.nome_generico);
  const atc = d.atc_code ?? getATCCode(d.id);

  const brands: Brand[] = [];
  const labById = new Map<string, Laboratory>();
  const presentations: Presentation[] = [];
  const concentrationSet = new Set<string>();
  let anyAnvisa = false;
  let anyVerified = false;

  for (const b of d.marcas ?? []) {
    const slug = labSlugOf(b);
    const lab = resolveLaboratory(slug);
    const brandId = toBrandId(b.nome, slug);
    if (!labById.has(lab.laboratory_id)) {
      labById.set(lab.laboratory_id, {
        laboratoryId: lab.laboratory_id,
        slug: lab.slug,
        name: lab.nome,
        cnpj: lab.cnpj,
      });
    }
    const verified = !!b.verificado;
    anyVerified = anyVerified || verified;
    brands.push({
      brandId,
      name: b.nome,
      laboratoryId: lab.laboratory_id,
      verified,
      bulaPaciente: b.bula_paciente,
      bulaProfissional: b.bula_profissional,
    });

    const prod = prodByBrandId.get(brandId);
    if (prod && prod.apresentacoes?.length) {
      for (const a of prod.apresentacoes) {
        if (a.registro_anvisa) anyAnvisa = true;
        concentrationSet.add(a.concentracao);
        presentations.push({
          concentration: a.concentracao,
          form: a.forma_farmaceutica,
          packaging: a.embalagem,
          registroAnvisa: a.registro_anvisa,
          brandId,
        });
      }
    } else {
      const forma = (b.formas ?? [])[0] ?? 'comprimido';
      for (const c of b.concentracoes ?? []) {
        concentrationSet.add(c);
        presentations.push({ concentration: c, form: forma, brandId });
      }
    }
  }

  const interactions: Interaction[] = (d.interacoes_importantes ?? []).map((i) => ({
    with: i.com,
    severity: i.severidade,
    description: i.descricao,
  }));

  const origem: DataOrigin = anyAnvisa ? 'ANVISA' : anyVerified ? 'BULA_FABRICANTE' : 'LEGADO';
  const provenance: DataProvenance = {
    origem,
    fonte_url: d.marcas?.find((b) => b.bula_profissional || b.bula_paciente)?.bula_profissional,
    data_atualizacao: '1970-01-01T00:00:00.000Z',
    responsavel: 'rm06:migracao',
    nivel_confianca: inferConfidence(anyAnvisa, anyVerified, !!atc),
    observacao: `Migrado de PHARMA_DB (id legado: ${d.id})`,
  };

  return {
    id: d.id,
    legacyId: d.id,
    activeIngredient: {
      moleculeId,
      name: d.molecula,
      fullName: d.nome_generico,
      atc,
      sinonimos: d.sinonimos ?? [],
    },
    category: d.categoria,
    therapeuticClass: d.classe,
    subclass: d.subclasse,
    clinicalContext: d.indicacao_contexto,
    brands,
    laboratories: [...labById.values()],
    presentations,
    concentrations: [...concentrationSet],
    indications: d.indicacoes_principais ?? [],
    contraindications: d.contraindicacoes_rapidas ?? [],
    interactions,
    dosageRules: buildDosageRules(d),
    references: buildReferences(d, atc),
    alerts: d.alertas_especiais ?? [],
    pregnancy: d.uso_gestante,
    lactation: d.uso_lactante,
    pediatricUse: d.uso_pediatrico,
    provenance,
  };
}

/**
 * Constrói a base canônica única a partir de todas as fontes legadas.
 * Idempotente e puro — não muta nenhuma fonte.
 */
export function buildCanonicalDatabase(): DrugEntity[] {
  const prodByBrandId = buildProductIndex();
  return getAllDrugs().map((d) => toEntity(d, prodByBrandId));
}
