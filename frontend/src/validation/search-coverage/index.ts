// ============================================================
// PRESCREVE-AI — RM-63: Contrato de Cobertura Total da Busca (público)
// ============================================================

export type {
  SearchCoverageException,
  SearchCoverageFailure,
  SearchCoverageMetrics,
  SearchCoverageReport,
} from './types';
export {
  isSearchableEntity,
  isSearchableBrand,
  isSearchableAlias,
  explainAliasException,
  checkUnduePharmaDuplicates,
  buildSearchCoverageReport,
} from './engine';
