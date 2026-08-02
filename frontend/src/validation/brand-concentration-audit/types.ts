// ============================================================
// PRESCREVE-AI — RM-62: Gate de Integridade Comercial Farmacológica
//
// Origem: RM-58 (bug real do Sinot Clav® exibindo concentrações do
// Clavulin/Augmentin — dado comercial copiado sem verificação por marca).
// O script original (`scripts/audit-brand-concentrations.mjs`) era
// auditoria manual: nunca retornava exit code não-zero e classificava
// TODA concentração idêntica entre laboratórios como "suspeita", mesmo
// quando é bioequivalência regulatória legítima (a norma para genéricos).
//
// RM-62 transforma isso num gate determinístico com 3 classificações
// explícitas — nunca convertendo automaticamente um padrão suspeito em
// erro confirmado, e nunca aceitando uma exceção sem justificativa e
// referência.
// ============================================================

/**
 * - `BLOCKING_ERROR`   — inconsistência comprovada (estrutura inválida, dado
 *                        comercial que contradiz uma fonte verificada, ou
 *                        marca duplicada de forma logicamente incompatível).
 *                        Falha o build/CI.
 * - `REVIEW_REQUIRED`  — padrão suspeito (ex.: mesma assinatura de
 *                        concentração entre laboratórios diferentes) que
 *                        PODE ser bioequivalência regulatória legítima —
 *                        nunca é automaticamente promovido a erro. Não
 *                        falha o build.
 * - `ACCEPTED_EXCEPTION` — um `REVIEW_REQUIRED` que já foi revisado
 *                        humanamente e documentado com justificativa e
 *                        referência em `exceptions.ts`. Continua visível
 *                        no relatório (nunca oculto), só muda de rótulo.
 */
export type BrandConcentrationClassification =
  | 'BLOCKING_ERROR'
  | 'REVIEW_REQUIRED'
  | 'ACCEPTED_EXCEPTION';

export interface BrandConcentrationFinding {
  classification: BrandConcentrationClassification;
  /** Identificador estável da regra que disparou o achado. */
  regra: string;
  molecula: string;
  concentracoes: string[];
  /** "Nome (Laboratório)" de cada marca envolvida no achado. */
  marcas: string[];
  mensagem: string;
  /** Preenchido apenas quando `classification === 'ACCEPTED_EXCEPTION'`. */
  exceptionId?: string;
}

/**
 * Exceção documentada — nunca genérica. Todos os campos são obrigatórios;
 * `exceptions.ts` valida isso em tempo de carga (falha alto e cedo, nunca
 * silenciosamente).
 */
export interface BrandConcentrationException {
  /** Identificador estável, único, referenciável (ex. em revisão de PR). */
  id: string;
  molecula: string;
  concentracoes: string[];
  /** Por que este caso é legítimo (nunca "ok"/"revisado" sem detalhe). */
  justificativa: string;
  /** URL, nº de bula, RDC, ou outra fonte verificável — nunca vazio. */
  referencia: string;
  /** Quem/qual processo decidiu aceitar esta exceção. */
  decididoPor: string;
  /** Data ISO da decisão. */
  data: string;
}

export interface BrandConcentrationReport {
  timestamp: string;
  totalDrugs: number;
  totalBrands: number;
  findings: BrandConcentrationFinding[];
  bySeverity: Record<BrandConcentrationClassification, number>;
  /** true quando não há nenhum `BLOCKING_ERROR`. */
  buildOk: boolean;
}
