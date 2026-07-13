// ============================================================
// PRESCREVE-AI — RM-24: Cross Database Validator (público)
// ============================================================

export type { SyncFinding, SyncReport, SyncSeverity, SyncFindingType } from './types';
export { compareSources, buildSyncReport } from './validator';

import { buildSyncReport } from './validator';

/** Gera o DATABASE_SYNC_REPORT.md. */
export function formatSyncMarkdown(report = buildSyncReport()): string {
  const L: string[] = [];
  L.push('# DATABASE_SYNC_REPORT');
  L.push('');
  L.push(`**Gerado:** ${report.timestamp} · **Publicação:** ${report.publishOk ? '✅ liberada' : '❌ BLOQUEADA (crítico)'}`);
  L.push('');
  L.push('## Resumo');
  L.push('');
  L.push('| Métrica | Valor |');
  L.push('|---|---|');
  L.push(`| Total analisado | ${report.totalAnalisado} |`);
  L.push(`| Compatíveis | ${report.compativeis} |`);
  L.push(`| Divergentes | ${report.divergentes} |`);
  L.push(`| Críticos | ${report.criticos} |`);
  L.push('');
  L.push('## Fontes comparadas');
  L.push('');
  L.push('| Fonte | Princípios ativos |');
  L.push('|---|---|');
  for (const [s, n] of Object.entries(report.bySource)) L.push(`| ${s} | ${n} |`);
  L.push('');
  if (report.findings.length === 0) {
    L.push('✅ Nenhuma divergência entre as fontes.');
  } else {
    L.push('## Achados');
    L.push('');
    L.push('| Gravidade | Tipo | Chave | Fontes | Detalhe | Correção sugerida |');
    L.push('|---|---|---|---|---|---|');
    for (const f of report.findings) {
      const esc = (s: string) => s.replace(/\|/g, '/');
      L.push(`| ${f.gravidade} | ${f.tipo} | ${esc(f.chave)} | ${esc(f.fontes)} | ${esc(f.detalhe)} | ${esc(f.correcaoSugerida)} |`);
    }
  }
  L.push('');
  L.push('---');
  L.push('');
  L.push('*RM-24 Cross Database Validator · impede a publicação quando há achado crítico.*');
  return L.join('\n');
}
