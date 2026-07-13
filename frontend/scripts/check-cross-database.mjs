// ============================================================
// PRESCREVE-AI — RM-24: gate de publicação (Cross Database Validator)
//
// Executado via `prebuild`. IMPEDE a publicação (exit 1) quando há qualquer
// achado CRÍTICO na comparação entre as fontes. Gera DATABASE_SYNC_REPORT.md.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSyncReport, formatSyncMarkdown } from '../src/validation/cross-database/index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const report = buildSyncReport();

const out = path.resolve(__dirname, '../../DATABASE_SYNC_REPORT.md');
fs.writeFileSync(out, formatSyncMarkdown(report));

console.log(
  `[RM-24] cross-db: total=${report.totalAnalisado} compatíveis=${report.compativeis} ` +
    `divergentes=${report.divergentes} críticos=${report.criticos}`,
);

if (!report.publishOk) {
  console.error(
    `[RM-24] ❌ PUBLICAÇÃO BLOQUEADA: ${report.criticos} conflito(s) CRÍTICO(s) entre fontes. Ver DATABASE_SYNC_REPORT.md`,
  );
  process.exit(1);
}
console.log('[RM-24] ✅ fontes sincronizadas (sem conflitos críticos) — publicação liberada.');
