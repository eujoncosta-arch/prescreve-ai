// ============================================================
// PRESCREVE-AI — RM-23: Drug Consistency Engine (tipos)
//
// Detecta inconsistências farmacológicas na cadeia:
//   Marca → Princípio ativo → Concentração → Dose sugerida → Indicação
// sobre a base canônica (RM-06 / drugRepository).
// ============================================================

export type ConsistencySeverity = 'critical' | 'high' | 'medium' | 'low';

/** Uma inconsistência detectada (erro · gravidade · local · correção sugerida). */
export interface Inconsistency {
  /** Regra que disparou (identificador estável). */
  rule: string;
  /** Descrição do erro. */
  erro: string;
  gravidade: ConsistencySeverity;
  /** Onde ocorre — drug id canônico + campo/detalhe. */
  local: string;
  /** Correção sugerida acionável. */
  correcaoSugerida: string;
}

export interface ConsistencyReport {
  timestamp: string;
  totalEntities: number;
  totalInconsistencies: number;
  bySeverity: Record<ConsistencySeverity, number>;
  byRule: Record<string, number>;
  inconsistencies: Inconsistency[];
  /** true quando não há inconsistência de gravidade `critical`. */
  buildOk: boolean;
}
