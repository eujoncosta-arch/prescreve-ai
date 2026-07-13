// ============================================================
// PRESCREVE-AI — RM-24: Cross Database Validator (tipos)
//
// Compara as fontes farmacológicas internas entre si:
//   PHARMA_DB · Eurofarma · Clinical rules (pediatria) · Prescription engine
// e detecta: medicamentos ausentes, divergência de doses, divergência de
// nomes e conflitos.
// ============================================================

export type SyncSeverity = 'critical' | 'high' | 'medium' | 'low';

export type SyncFindingType =
  | 'medicamento_ausente'
  | 'divergencia_dose'
  | 'divergencia_nome'
  | 'conflito';

export interface SyncFinding {
  tipo: SyncFindingType;
  gravidade: SyncSeverity;
  /** chave canônica (molecule_id) ou marca envolvida. */
  chave: string;
  /** fontes envolvidas na divergência. */
  fontes: string;
  detalhe: string;
  correcaoSugerida: string;
}

export interface SyncReport {
  timestamp: string;
  /** universo de princípios ativos analisados (união das fontes). */
  totalAnalisado: number;
  /** presentes e consistentes em ≥ 2 fontes. */
  compativeis: number;
  /** chaves com ≥ 1 divergência (não-crítica). */
  divergentes: number;
  /** total de achados críticos. */
  criticos: number;
  bySource: Record<string, number>;
  findings: SyncFinding[];
  /** true quando não há achado crítico — libera a publicação. */
  publishOk: boolean;
}
