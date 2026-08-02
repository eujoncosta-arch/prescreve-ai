// ============================================================
// PRESCREVE-AI — RM-62: Gate de Integridade Comercial Farmacológica (público)
// ============================================================

export type {
  BrandConcentrationClassification,
  BrandConcentrationException,
  BrandConcentrationFinding,
  BrandConcentrationReport,
} from './types';
export {
  buildCatalogIndex,
  checkConcentrationOverlap,
  checkDuplicateBrandAcrossLabs,
  checkProdutoIdMismatch,
  runBrandConcentrationAudit,
} from './engine';
export { ACCEPTED_EXCEPTIONS } from './exceptions';

import type { BrandConcentrationReport } from './types';
import { runBrandConcentrationAudit } from './engine';

const ROTULO: Record<string, string> = {
  BLOCKING_ERROR: '❌ BLOCKING_ERROR',
  REVIEW_REQUIRED: '⚠️  REVIEW_REQUIRED',
  ACCEPTED_EXCEPTION: '✅ ACCEPTED_EXCEPTION',
};

/** Formata o relatório para console/CI — nunca oculta um achado. */
export function formatBrandConcentrationReport(report: BrandConcentrationReport = runBrandConcentrationAudit()): string {
  const L: string[] = [];
  L.push('[RM-62] Auditoria de Integridade Comercial (marcas/concentrações)');
  L.push(`[RM-62] Marcas analisadas: ${report.totalBrands} · Medicamentos: ${report.totalDrugs}`);
  L.push(
    `[RM-62] BLOCKING_ERROR=${report.bySeverity.BLOCKING_ERROR} · ` +
      `REVIEW_REQUIRED=${report.bySeverity.REVIEW_REQUIRED} · ` +
      `ACCEPTED_EXCEPTION=${report.bySeverity.ACCEPTED_EXCEPTION}`,
  );
  L.push('');

  for (const f of report.findings) {
    L.push(`${ROTULO[f.classification] ?? f.classification} [${f.regra}] ${f.molecula}`);
    L.push(`   concentrações: ${f.concentracoes.join(' | ')}`);
    for (const m of f.marcas) L.push(`   - ${m}`);
    L.push(`   ${f.mensagem}`);
    L.push('');
  }

  if (report.buildOk) {
    L.push('[RM-62] ✅ Sem BLOCKING_ERROR — build/CI liberado.');
  } else {
    L.push(`[RM-62] ❌ BUILD BLOQUEADO: ${report.bySeverity.BLOCKING_ERROR} erro(s) bloqueante(s). Ver achados acima.`);
  }
  return L.join('\n');
}
