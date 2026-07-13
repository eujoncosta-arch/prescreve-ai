import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ── RM-06: guarda "catraca" da Single Source of Truth ────────────────────────
// Bloqueia imports diretos das bases farmacológicas legadas. Toda funcionalidade
// deve consultar `@/lib/pharma-core` (Drug Repository Layer). Os importadores
// atuais estão na allowlist abaixo (dívida de migração) — arquivos NOVOS que
// tentarem acessar as bases diretamente falham o lint. Reduza a allowlist à
// medida que cada consumidor for migrado.
const LEGACY_PHARMA_BASES = [
  "**/pharma-database",
  "**/eurofarma-sync",
  "**/lab-catalog",
  "**/drug-database",
  "**/drug-comparator",
  "**/dosing-engine",
];

const RM06_MESSAGE =
  "RM-06: nao importe as bases farmacologicas legadas diretamente. Use `@/lib/pharma-core` (drugRepository). Somente a camada de migracao (pharma-core/migrate) pode ler as bases antigas.";

// Consumidores existentes + internos das bases + camadas de adaptacao/migracao.
// Nestes arquivos o guard fica desligado (ratchet). NAO adicione novos aqui —
// codigo novo deve usar o pharma-core.
const RM06_ALLOWLIST = [
  // Camada canonica + migracao (autorizada a ler as fontes)
  "src/lib/pharma-core/**",
  // Bases legadas e seus modulos internos
  "src/lib/pharma-database*.ts",
  "src/lib/eurofarma-sync.ts",
  "src/lib/lab-catalog.ts",
  "src/lib/drug-database.ts",
  "src/lib/drug-comparator.ts",
  "src/lib/dosing-engine.ts",
  "src/lib/lab-adapters/**",
  // Governanca RM-00 (adaptadores read-only das fontes)
  "src/lib/governance/**",
  // Testes
  "src/tests/**",
  // Consumidores atuais (divida de migracao — migrar para pharma-core)
  "src/app/api/sync/eurofarma/route.ts",
  "src/app/biblioteca/page.tsx",
  "src/app/comparador/page.tsx",
  "src/app/dosagem/page.tsx",
  "src/app/prescricao-rapida/page.tsx",
  "src/components/modules/BulaViewer.tsx",
  "src/components/modules/PrescricaoPorMarca.tsx",
  "src/components/modules/TherapeuticPanel.tsx",
  "src/lib/clinical-simulation-etapa8.ts",
  "src/lib/clinical-stress-etapa9.ts",
  "src/lib/dose-calculator.ts",
  "src/lib/drug-resolver.ts",
  "src/lib/pharma-library.ts",
  // src/lib/safety-rules.ts — MIGRADO para pharma-core (RM-06 piloto); fora da allowlist.
  "src/lib/simulation-phase22-3.ts",
  "src/lib/stress-test-phase22-4.ts",
  "src/lib/validate-extreme-data.ts",
  "src/lib/validate-full-patient-flow.ts",
  "src/lib/validate-incomplete-data.ts",
  "src/lib/validate-integrity-22-5.ts",
  "src/lib/validate-reproducibility.ts",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: LEGACY_PHARMA_BASES, message: RM06_MESSAGE }] },
      ],
    },
  },
  {
    files: RM06_ALLOWLIST,
    rules: { "no-restricted-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
