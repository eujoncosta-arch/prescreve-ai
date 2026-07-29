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
  /**
   * RM-54: `true` para um achado que é uma decisão de escopo EXPLÍCITA e
   * permanente (não um risco em aberto) — ex.: uma combinação comercial
   * fora do escopo do PHARMA_DB (que indexa só moléculas isoladas por
   * design). Continua listado no relatório (nunca escondido), mas não
   * conta para `divergentes` — que passa a refletir só divergências
   * genuinamente abertas.
   */
  aceito?: boolean;
}

export interface SyncReport {
  timestamp: string;
  /** universo de princípios ativos analisados (união das fontes). */
  totalAnalisado: number;
  /** presentes e consistentes em ≥ 2 fontes. */
  compativeis: number;
  /** chaves com ≥ 1 divergência (não-crítica, não-aceita) genuinamente aberta. */
  divergentes: number;
  /** RM-54: chaves com achado(s) marcados `aceito` (decisão de escopo documentada, não um risco aberto). */
  aceitos: number;
  /** total de achados críticos. */
  criticos: number;
  bySource: Record<string, number>;
  findings: SyncFinding[];
  /** true quando não há achado crítico — libera a publicação. */
  publishOk: boolean;
}
