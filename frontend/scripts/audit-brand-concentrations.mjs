// ============================================================
// PRESCREVE-AI — RM-62: Gate de Integridade Comercial Farmacológica (CLI)
//
// Wrapper fino sobre `src/validation/brand-concentration-audit/` (mesmo
// padrão de scripts/check-drug-consistency.mjs e
// scripts/check-cross-database.mjs — a lógica testável vive em
// `src/validation`, o script só executa e define o exit code).
//
// Histórico: RM-58 criou este script como auditoria MANUAL — sempre
// retornava exit code 0 e classificava toda concentração idêntica entre
// laboratórios como "suspeita" (incluindo casos de bioequivalência
// regulatória legítima). RM-62 substitui isso por 3 classificações
// determinísticas (BLOCKING_ERROR / REVIEW_REQUIRED / ACCEPTED_EXCEPTION)
// — ver src/validation/brand-concentration-audit/types.ts.
//
// Executado via `npm run audit:brand-concentrations` (local, ad-hoc — mesma
// convenção de `check:consistency`/`check:sync`/`check:text-integrity`) E
// como parte do `prebuild` (mesma convenção de RM-23/RM-24/RM-49) — uma
// ÚNICA execução por `npm run build`/CI, nunca duas: o job de CI chama só
// `npm run build`, que já invoca este script via prebuild. Adicionar um
// segundo step de CI chamando `npm run audit:brand-concentrations`
// diretamente duplicaria a execução na mesma esteira — por isso NÃO existe
// um step de CI separado, só o script dedicado disponível para uso local.
// ============================================================

import { runBrandConcentrationAudit, formatBrandConcentrationReport } from '../src/validation/brand-concentration-audit/index.ts';

const report = runBrandConcentrationAudit();
console.log(formatBrandConcentrationReport(report));

process.exit(report.buildOk ? 0 : 1);
