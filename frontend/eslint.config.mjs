import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ── RM-06: guarda "catraca" da Single Source of Truth ────────────────────────
// Bloqueia imports diretos das bases farmacológicas legadas. Toda funcionalidade
// deve consultar `@/lib/pharma-core` (Drug Repository Layer). Os importadores
// atuais estão na allowlist abaixo (dívida de migração) — arquivos NOVOS que
// tentarem acessar as bases diretamente falham o lint. Reduza a allowlist à
// medida que cada consumidor for migrado.
// Bases de DADOS farmacológicos superseded pelo pharma-core. (dosing-engine é
// motor de cálculo de dose, não base de dados — fora de escopo.)
const LEGACY_PHARMA_BASES = [
  "**/pharma-database",
  "**/eurofarma-sync",
  "**/lab-catalog",
  "**/drug-database",
  "**/drug-comparator",
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
  // RM-24 Cross Database Validator — compara as fontes legadas entre si (read-only)
  "src/validation/cross-database/**",
  // RM-40 Data Integrity Validator — audita a base legada diretamente (read-only)
  "src/validation/data-integrity/**",
  // RM-62 Brand Concentration Audit — compara QuickBrand.concentracoes
  // hardcoded contra EUROFARMA_CATALOG/lab-catalog (read-only). Precisa ler
  // as fontes legadas diretamente porque pharma-core/migrate.ts já
  // AUTO-CORRIGE `DrugEntity.presentations` a partir do catálogo quando o
  // nome da marca casa com um produto (mascarando exatamente o tipo de
  // divergência hardcoded-vs-catálogo que esta auditoria existe para pegar,
  // como o bug real do Sinot Clav® que motivou a RM-58/RM-62).
  "src/validation/brand-concentration-audit/**",
  // RM-63 Search Coverage Contract — audita searchDrugs()/getAllDrugs()
  // diretamente (read-only) para provar que a busca cobre o catálogo
  // consolidado inteiro (RM-58: 78% do catálogo era invisível quando a
  // busca só lia PHARMA_DB). DrugEntity/pharma-core não expõe sinônimos
  // nem o `nome_generico` bruto usados pela busca — precisa da fonte real.
  "src/validation/search-coverage/**",
  // Testes
  "src/tests/**",
  // ── Acoplamento INTENCIONAL à fonte (navegadores especializados) ──
  // Estas telas exibem metadados específicos da fonte (bulas PDF, produtos
  // comerciais, dados FK/FD) que o DrugEntity não modela — não são dívida.
  "src/app/api/sync/eurofarma/route.ts",     // endpoint de sync do catálogo Eurofarma
  "src/app/biblioteca/page.tsx",             // navegador do catálogo Eurofarma
  "src/app/comparador/page.tsx",             // comparador FK/FD (MOLECULES_DB próprio)
  "src/components/modules/BulaViewer.tsx",    // visualizador de bula (ProdutoComercial/PDF)
  "src/components/modules/PrescricaoPorMarca.tsx", // escolha de marca verificada + bula
  "src/components/modules/TherapeuticPanel.tsx",   // bula Eurofarma contextual + prognóstico
  // ── Dívida de migração real (dado clínico; migrar para drugRepository) ──
  // prescricao-rapida lê o MESMO PHARMA_DB que alimenta o repositório canônico
  // → já é consistente com o motor de decisão; migração é melhoria, não urgência.
  "src/app/prescricao-rapida/page.tsx",
  "src/app/dosagem/page.tsx",
  // clinical-simulation-etapa8.ts / clinical-stress-etapa9.ts / drug-resolver.ts
  //   — RM-56.2: eram código morto (zero imports em todo o repo) e foram
  //   arquivados em docs/archive/legacy-lib-modules/; delistados.
  // dose-calculator.ts — só importava dosing-engine (fora de escopo agora); delistado.
  "src/lib/pharma-library.ts",
  // safety-rules.ts — MIGRADO para pharma-core (RM-06 piloto); delistado.
  // simulation-phase22-3.ts — MIGRADO (drugRepository.count); delistado.
  // Harnesses de QA que testam PROPOSITALMENTE a API legada getAllDrugs
  // (benchmark/cache/integridade da fonte) — leitura legítima da fonte.
  "src/lib/stress-test-phase22-4.ts",
  "src/lib/validate-integrity-22-5.ts",
  // validate-extreme-data.ts / validate-incomplete-data.ts — não importam base
  //   restrita; removidos da allowlist (eram entradas desnecessárias).
  // validate-full-patient-flow.ts / validate-reproducibility.ts — MIGRADOS.
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
      // RM-54: reconhece a convenção já usada no código (`const { x: _, ...rest }`
      // para omitir um campo de uma desestruturação; parâmetros `_foo` para
      // indicar "intencionalmente não lido") em vez de remover o padrão.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" },
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
    // RM-49: artefato gerado por `vitest run --coverage` — nunca código-fonte.
    "coverage/**",
  ]),
]);

export default eslintConfig;
