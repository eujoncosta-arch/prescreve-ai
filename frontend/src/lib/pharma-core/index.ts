// ============================================================
// PRESCREVE-AI — RM-06: pharma-core (Single Source of Truth)
//
// SUPERFÍCIE PÚBLICA da base farmacológica canônica.
// Consuma SEMPRE `drugRepository` — nunca importe as bases legadas
// (pharma-database, eurofarma-sync, lab-catalog, drug-database, etc.)
// diretamente em funcionalidades. Somente a camada de migração
// (interna) tem permissão de ler as fontes antigas.
// ============================================================

export type {
  DrugEntity,
  ActiveIngredient,
  Laboratory,
  Brand,
  Presentation,
  Interaction,
  InteractionSeverity,
  DosageRule,
  DosagePopulation,
  Reference,
  ReferenceType,
  PregnancyUse,
} from './types';

export { RM06_VERSION } from './types';
export { drugRepository } from './repository';
