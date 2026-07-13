// ============================================================
// PRESCREVE-AI — RM-23: Drug Consistency Engine (público)
// ============================================================

export type { Inconsistency, ConsistencyReport, ConsistencySeverity } from './types';
export { checkDrugConsistency, buildConsistencyReport } from './engine';

import { buildConsistencyReport } from './engine';

/** Formata o relatório de consistência em Markdown. */
export function formatConsistencyMarkdown(report = buildConsistencyReport()): string {
  const L: string[] = [];
  L.push('# RM23_DRUG_CONSISTENCY_REPORT');
  L.push('');
  L.push(
    `**Gerado:** ${report.timestamp} · **Entidades:** ${report.totalEntities} · **Inconsistências:** ${report.totalInconsistencies} · **Build:** ${report.buildOk ? '✅ OK' : '❌ BLOQUEADO (crítico)'}`,
  );
  L.push('');
  L.push('| Gravidade | Qtde |');
  L.push('|---|---|');
  for (const [sev, n] of Object.entries(report.bySeverity)) L.push(`| ${sev} | ${n} |`);
  L.push('');
  L.push('| Regra | Qtde |');
  L.push('|---|---|');
  for (const [rule, n] of Object.entries(report.byRule)) L.push(`| ${rule} | ${n} |`);
  L.push('');
  if (report.inconsistencies.length === 0) {
    L.push('✅ Nenhuma inconsistência detectada na cadeia Marca → Ativo → Concentração → Dose → Indicação.');
  } else {
    L.push('## Inconsistências');
    L.push('');
    L.push('| Gravidade | Regra | Local | Erro | Correção sugerida |');
    L.push('|---|---|---|---|---|');
    for (const i of report.inconsistencies) {
      L.push(`| ${i.gravidade} | ${i.rule} | ${i.local} | ${i.erro.replace(/\|/g, '/')} | ${i.correcaoSugerida.replace(/\|/g, '/')} |`);
    }
  }
  L.push('');
  L.push('---');
  L.push('');
  L.push('*RM-23 Drug Consistency Engine · executado automaticamente no build (prebuild) e nos testes.*');
  return L.join('\n');
}
