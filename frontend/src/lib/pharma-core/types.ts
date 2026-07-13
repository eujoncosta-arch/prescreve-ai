// ============================================================
// PRESCREVE-AI — RM-06: Single Source of Truth (pharma-core)
// Entidade farmacológica canônica única.
//
// Esta é a ÚNICA representação oficial de um medicamento no sistema.
// Toda consulta deve passar pelo Drug Repository Layer (./repository).
// Construída sobre a governança RM-00 (IDs canônicos + proveniência).
// ============================================================

import type { DataProvenance } from '../governance/data-governance';

/** Princípio ativo canônico (salt-agnóstico via molecule_id do RM-00). */
export interface ActiveIngredient {
  /** `mol:<dcb-slug>` canônico (RM-00). */
  moleculeId: string;
  /** Denominação comum (DCB) exibível. */
  name: string;
  /** Nome genérico completo, incluindo o sal, quando aplicável. */
  fullName?: string;
  /** Código ATC (classificação WHO). */
  atc?: string;
  sinonimos?: string[];
}

/** Laboratório fabricante canônico (RM-00 LABORATORY_REGISTRY). */
export interface Laboratory {
  /** `lab:<slug>` canônico. */
  laboratoryId: string;
  slug: string;
  name: string;
  cnpj?: string;
}

/** Marca comercial canônica. */
export interface Brand {
  /** `brand:<lab>:<slug>` canônico. */
  brandId: string;
  name: string;
  laboratoryId: string;
  /** true quando os dados vieram de fonte oficial verificada (bula do fabricante). */
  verified: boolean;
  bulaPaciente?: string;
  bulaProfissional?: string;
}

/** Apresentação/embalagem canônica. */
export interface Presentation {
  concentration: string;
  form: string;
  packaging?: string;
  /** Registro ANVISA (nunca fabricado — presente só quando verificado na fonte). */
  registroAnvisa?: string;
  /** Marca à qual esta apresentação pertence (brandId), quando rastreável. */
  brandId?: string;
}

export type InteractionSeverity = 'leve' | 'moderada' | 'grave' | 'contraindicado';

export interface Interaction {
  with: string;
  severity: InteractionSeverity;
  description: string;
}

export type DosagePopulation =
  | 'adulto'
  | 'pediatrico'
  | 'renal'
  | 'hepatico'
  | 'gestante'
  | 'lactante';

/** Regra de dose estruturada por população. */
export interface DosageRule {
  population: DosagePopulation;
  /** Resumo textual (ex.: dose habitual, ajuste por TFG). */
  summary: string;
  route?: string;
  unit?: string;
  /** Detalhe estruturado adicional (campos específicos da população). */
  detail?: Record<string, string | number | boolean | undefined>;
}

export type ReferenceType =
  | 'ATC'
  | 'GUIDELINE'
  | 'BULA'
  | 'EVIDENCIA'
  | 'PGX'
  | 'BEERS'
  | 'STOPP'
  | 'START';

export interface Reference {
  type: ReferenceType;
  value: string;
  url?: string;
}

export type PregnancyUse = 'seguro' | 'risco' | 'contraindicado' | 'avaliar';

/**
 * DRUG ENTITY — a fonte única de verdade para um medicamento.
 * Campos exigidos pela especificação RM-06 + envelope de proveniência RM-00.
 */
export interface DrugEntity {
  /** ID canônico estável (`drug:<lab>:<slug>` ou id legado quando genérico). */
  id: string;
  /** ID original na base legada (QuickDrug.id) — para rastreabilidade da migração. */
  legacyId: string;

  activeIngredient: ActiveIngredient;

  category: string;
  therapeuticClass: string;
  subclass?: string;
  /** RM-01 MED-01: contexto clínico quando há variantes da mesma molécula. */
  clinicalContext?: string;

  brands: Brand[];
  laboratories: Laboratory[];
  presentations: Presentation[];
  concentrations: string[];

  indications: string[];
  contraindications: string[];
  interactions: Interaction[];
  dosageRules: DosageRule[];
  references: Reference[];

  alerts: string[];
  pregnancy: PregnancyUse;
  lactation: PregnancyUse;
  /** RM-01 BAIXO-01. */
  pediatricUse?: 'nao_aplicavel';

  /** Envelope de governança/proveniência (RM-00). Obrigatório. */
  provenance: DataProvenance;
}

/** Versão da camada canônica. */
export const RM06_VERSION = '1.0.0';
