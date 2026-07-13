// ============================================================
// PRESCREVE-AI — RM-23: verificação de consistência no BUILD
//
// Executado automaticamente via `prebuild` (npm run build). Falha o build
// (exit 1) se houver qualquer inconsistência de gravidade `critical`.
// Gera RM23_DRUG_CONSISTENCY_REPORT.md a cada execução.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConsistencyReport, formatConsistencyMarkdown } from '../src/validation/drug-consistency/index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const report = buildConsistencyReport();

// Relatório na raiz do repositório (um nível acima de /frontend).
const out = path.resolve(__dirname, '../../RM23_DRUG_CONSISTENCY_REPORT.md');
fs.writeFileSync(out, formatConsistencyMarkdown(report));

const { critical, high, medium, low } = report.bySeverity;
console.log(
  `[RM-23] consistência: ${report.totalEntities} entidades · ${report.totalInconsistencies} inconsistências ` +
    `(critical=${critical} high=${high} medium=${medium} low=${low})`,
);

if (!report.buildOk) {
  console.error(`[RM-23] ❌ BUILD BLOQUEADO: ${critical} inconsistência(s) CRÍTICA(s). Ver RM23_DRUG_CONSISTENCY_REPORT.md`);
  process.exit(1);
}

if (high > 0) {
  console.warn(`[RM-23] ⚠ ${high} inconsistência(s) de gravidade HIGH — revisar (não bloqueia o build).`);
}
console.log('[RM-23] ✅ consistência OK (sem inconsistências críticas).');
