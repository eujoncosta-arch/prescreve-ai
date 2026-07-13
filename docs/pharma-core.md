# Single Source of Truth — RM-06 (`pharma-core`)

**Camada:** RM-06 · **Versão:** 1.0.0 · **Status:** implementada (aditiva, read-only sobre as fontes legadas)
**Módulo:** [`frontend/src/lib/pharma-core/`](../frontend/src/lib/pharma-core)

> RM-06 estabelece a **fonte única oficial** de dados farmacológicos do Prescreve-AI: a entidade canônica `DrugEntity`, exposta exclusivamente pelo **Drug Repository Layer**. Constrói sobre a governança RM-00 (IDs canônicos + proveniência) e consolida as correções do RM-01.

---

## 1. Arquitetura

```
                 ┌────────────────────────────────────────────┐
  Funcionalidades│      import { drugRepository } from         │
  (UI, engines) ─┼────────►  '@/lib/pharma-core'   ◄── ÚNICO   │
                 │                  │            ponto de acesso│
                 └──────────────────┼─────────────────────────┘
                                    │ (lazy build, indexado)
                          ┌─────────▼──────────┐
                          │   migrate.ts       │  ← única camada autorizada
                          │ buildCanonical...  │    a ler as bases legadas
                          └─────────┬──────────┘
        ┌────────────────┬──────────┼───────────┬─────────────────┐
   getAllDrugs()   EUROFARMA_CATALOG  lab-catalog   RM-00 (IDs +
   (PHARMA_DB)                                       proveniência)
```

- **`types.ts`** — `DrugEntity` e sub-tipos (a especificação canônica).
- **`migrate.ts`** — `buildCanonicalDatabase()`: projeta as fontes legadas em `DrugEntity[]`. **Única** camada com permissão de importar as bases antigas.
- **`repository.ts`** — `drugRepository`: ponto de acesso único, indexado (id, molécula, marca, categoria, ATC).
- **`validate.ts`** — `validateMigration()`: compara old→new e produz o relatório.
- **`index.ts`** — superfície pública (`drugRepository` + tipos).

---

## 2. DRUG ENTITY (canônica)

```ts
interface DrugEntity {
  id;                 // id canônico estável
  legacyId;           // id na base legada (rastreabilidade)
  activeIngredient;   // { moleculeId (mol:…), name, fullName, atc, sinonimos }
  category; therapeuticClass; subclass?; clinicalContext?;
  brands[];           // { brandId (brand:…), name, laboratoryId, verified, bulas }
  laboratories[];     // { laboratoryId (lab:…), slug, name, cnpj }
  presentations[];    // { concentration, form, packaging, registroAnvisa?, brandId }
  concentrations[];
  indications[]; contraindications[]; interactions[]; dosageRules[]; references[];
  alerts[]; pregnancy; lactation; pediatricUse?;
  provenance;         // envelope RM-00 (origem, confiança, responsável, data)
}
```

`dosageRules[]` estrutura dose por população: `adulto`, `pediatrico`, `renal` (por TFG), `hepatico` (Child-Pugh), `gestante`, `lactante`.

---

## 3. Regra de acesso

**Nenhuma funcionalidade deve importar as bases legadas diretamente**
(`pharma-database`, `eurofarma-sync`, `lab-catalog`, `drug-database`, `drug-comparator`, `dosing-engine`).
Toda leitura passa por:

```ts
import { drugRepository } from '@/lib/pharma-core';

drugRepository.getById('enalapril');
drugRepository.getByActiveIngredient('Besilato de Anlodipino'); // salt-agnóstico
drugRepository.getByBrand('Jardiance');
drugRepository.search('losartana');
drugRepository.getAll();
```

A migração dos consumidores existentes (UI/engines) para o repositório é o passo de rollout — as bases legadas **permanecem intactas até a migração completa e nova validação** (ver §5).

---

## 4. Resultado da migração (medido)

- **355 `DrugEntity`** migrados **1:1** de `getAllDrugs()`.
- **0** IDs canônicos duplicados.
- **0** conflitos marca↔laboratório (os 3 resíduos MED-04 — `boehringer-lilly`/`gsk-novartis`/`cristalia-hipolabor` — foram unificados por aliases canônicos em `resolveLaboratory`).
- **0** lacunas clínicas críticas (interações/dose/indicação/contraindicação) — herança das correções RM-01.
- **14** grupos de molécula em múltiplos registros = variantes de contexto **intencionais** (`clinicalContext`), não duplicidades.

Relatório completo e reproduzível: [`RM06_MIGRATION_REPORT.md`](../RM06_MIGRATION_REPORT.md) (gerado por `validate.ts`).

---

## 5. Limites e não-destruição

**RM-06 faz:** entidade canônica, repositório único, migração das fontes, validação e relatório, unificação de laboratórios residuais.

**RM-06 NÃO faz (rollout seguinte):**
- Reescrever cada consumidor (páginas/engines) para o `drugRepository`.
- Apagar as bases legadas — **proibido até** todos os consumidores migrarem e a validação repetir 0 conflitos.
- Persistir a base canônica (hoje é construída em memória, lazy, a cada boot).

**Garantia:** aditivo e não-destrutivo — nenhuma fonte foi alterada; `tsc` limpo e **66/66 testes** (11 do RM-06).

---

*Documento de arquitetura — Prescreve-AI · RM-06 v1.0.0 · Single Source of Truth.*
