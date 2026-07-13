// ============================================================
// PRESCREVE-AI — RM-22: Clinical Regression Suite (público)
// ============================================================

export * from './framework';
export { CLINICAL_CASES } from './cases';
export { isControlled, controlledInfo, CONTROLLED_SUBSTANCES } from './controlled-substances';

import { CLINICAL_CASES } from './cases';
import { runSuite, type SuiteResult } from './framework';

/** Executa toda a suíte de regressão clínica. */
export function runClinicalRegression(): SuiteResult {
  return runSuite(CLINICAL_CASES);
}
