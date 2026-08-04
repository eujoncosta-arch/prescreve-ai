# RM-61 — Governança de Dados Farmacológicos e Proveniência Obrigatória

**Data:** 2026-08-02
**Papel assumido:** arquiteto de dados clínicos, farmacêutico informático, engenheiro de qualidade.
**Escopo:** apenas metadados de governança/proveniência. Nenhum dado farmacológico, motor clínico ou UI foi alterado.

---

## 1. Mapeamento do modelo atual (passo obrigatório)

Antes de qualquer mudança, mapeei as estruturas existentes:

- **`PHARMA_DB`** ([`pharma-database.ts`](../frontend/src/lib/pharma-database.ts)) — `QuickDrug`/`QuickBrand`. `QuickBrand` já tem um campo `verificado?: boolean` (comentário no código: `true = dados do portal oficial Eurofarma`). Confirmei por `grep`: **só é setado `true` explicitamente** nas ~40 marcas Eurofarma/lab-catalog verificadas; nunca é setado `false` — ausência (`undefined`) é o estado de facto para todo o resto do catálogo, sem distinguir "nunca revisado" de "revisado e rejeitado". Seu único efeito de UI é um `✓` verde em [`prescricao-rapida/page.tsx:599`](../frontend/src/app/prescricao-rapida/page.tsx).
- **Extensões por especialidade** (`pharma-database-endo.ts`, `-cardio.ts`, `-gineco.ts`, `-rm54-gaps.ts`) — mesma forma `QuickBrand`, herdam a mesma limitação.
- **`eurofarma-sync.ts`** — `ProdutoComercial` já tem `data_registro`, `data_ultima_atualizacao`, `versao_bula`, `fonte_regulatoria: 'ANVISA'`, `registro_anvisa?`. É a fonte mais próxima de um envelope de proveniência real, mas não tem status de ciclo de vida nem é usada por `PHARMA_DB` além do enriquecimento de marca.
- **`pharma-library.ts`** — `MarcaFarmaceuticaEnterprise` tem bula estruturada rica (`bula_profissional`, `bula_paciente`, `diretrizes_associadas` com nível/grau), mas **nenhum campo de proveniência/verificação** — nem `verificado`, nem data, nem fonte.
- **Tipos/interfaces canônicos** — já existe uma camada de governança dedicada e **não trivial**: [`frontend/src/lib/governance/data-governance.ts`](../frontend/src/lib/governance/data-governance.ts) (RM-00), que define:
  - `DataProvenance` — envelope com `origem` (`DataOrigin`: `BULA_FABRICANTE | BULA_PROFISSIONAL | BULA_PACIENTE | ANVISA | DIRETRIZ_OFICIAL | DERIVADO | LEGADO | NAO_VERIFICADO`), `fonte_url?`, `data_atualizacao`, `responsavel`, `nivel_confianca` (`ALTA|MEDIA|BAIXA|NAO_VERIFICADO`), `observacao?`, `hash_integridade?`.
  - `GovernedDrugRecord._governanca: DataProvenance` — a projeção governada de `ProdutoComercial`/`QuickDrug`.
  - Adaptadores `fromProdutoComercial()`/`fromQuickDrug()` que já constroem esse envelope a partir das fontes legadas, sem mutá-las.
  - `provenanceLegado()` — proveniência-padrão para dado legado (usa um sentinel `1970-01-01T00:00:00.000Z`).
- **Funções de enriquecimento** — [`pharma-core/migrate.ts`](../frontend/src/lib/pharma-core/migrate.ts) `buildCanonicalDatabase()`/`toEntity()`: constrói `DrugEntity.provenance: DataProvenance` (mesmo tipo do RM-00) a partir de `QuickDrug` + o catálogo `ProdutoComercial` (Eurofarma/lab-catalog), **para toda a base real do sistema** (367 entidades).
- **RM-23** (`scripts/check-drug-consistency.mjs` → `validation/drug-consistency/`) — consome `data-governance.ts` (`fromQuickDrug`) para detectar inconsistências marca↔ativo/marca↔lab. Roda no `prebuild`.
- **RM-24** (`scripts/check-cross-database.mjs` → `validation/cross-database/`) — idem, compara fontes (`fromProdutoComercial`/`fromQuickDrug`) e bloqueia o build em conflito crítico.
- **RM-40/RM-52** (`validation/data-integrity/engine.ts`) — já tinha 2 regras sobre proveniência antes desta RM: `PROVENIENCIA_AUSENTE` (envelope ausente) e `PROVENIENCIA_DATA_PLACEHOLDER` (detecta o sentinel epoch `1970-01-01` e o marca como `info_incompleta`, nunca aceito silenciosamente).

**Conclusão do mapeamento:** já existe uma estrutura parcial reutilizável e efetivamente usada por 2 gates de build (RM-23/RM-24) e por um validador de integridade (RM-40) — o envelope `DataProvenance` (RM-00). Ele cobre origem, data, responsável e confiança, mas **não tem** (a) um status explícito de ciclo de vida de verificação (draft/review/verified/deprecated — distinto de `nivel_confianca`, que mede confiança, não workflow), (b) versão do documento-fonte (`sourceVersion`), nem (c) data de próxima revisão. Por instrução explícita do escopo ("não criar um segundo sistema de metadados se já existir uma estrutura parcial reutilizável"), a decisão foi **estender `DataProvenance`**, não criar um novo tipo paralelo.

---

## 2. Mudança implementada (menor mudança segura)

### 2.1. Extensão do envelope `DataProvenance` ([`data-governance.ts`](../frontend/src/lib/governance/data-governance.ts))

Três campos novos, todos **opcionais** (não quebram nenhum dos ~10 pontos de construção de `DataProvenance` já existentes no código):

```ts
export type VerificationStatus = 'draft' | 'review' | 'verified' | 'deprecated';

export interface DataProvenance {
  // ...campos existentes (origem, fonte_url, data_atualizacao, responsavel,
  // nivel_confianca, observacao, hash_integridade), inalterados...
  verificationStatus?: VerificationStatus;
  sourceVersion?: string;
  proximaRevisao?: string;
}
```

- `verificationStatus` é **ortogonal** a `nivel_confianca`: um mede "o quão bom é o dado" (confiança), o outro mede "este dado já passou por revisão?" (ciclo de vida). `deprecated` nunca é atribuído automaticamente — só um processo humano/editorial decide que um dado está obsoleto (não é um estado derivável de sinais estruturais).
- `sourceVersion` é distinto de `data_atualizacao` (quando o REGISTRO foi validado) — é sobre a versão/data do documento-fonte em si (ex.: `versao_bula` já existente em `ProdutoComercial`).
- `proximaRevisao` é opcional e **não foi preenchido em nenhum ponto de construção** nesta RM — não há cadência de revisão real conhecida hoje no sistema para nenhuma fonte, e inventar uma data seria fabricar precisão inexistente. O campo existe para uso futuro quando essa cadência for conhecida (ex.: renovação de registro ANVISA).

### 2.2. Função de derivação (`deriveVerificationStatus`)

```ts
export function deriveVerificationStatus(
  p: Pick<DataProvenance, 'origem' | 'nivel_confianca' | 'data_atualizacao'>,
): Exclude<VerificationStatus, 'deprecated'>
```

Deriva um `verificationStatus` coerente a partir dos sinais que **já existiam** no envelope (origem, confiança, placeholder de data), para que os ~10 pontos de construção de `DataProvenance` no sistema recebam uma classificação sem exigir reescrita manual de cada um:

- `'verified'` — origem é fonte formal (`BULA_FABRICANTE`/`BULA_PROFISSIONAL`/`BULA_PACIENTE`/`ANVISA`/`DIRETRIZ_OFICIAL`) **e** `nivel_confianca === 'ALTA'` **e** a data não é o sentinel epoch.
- `'draft'` — origem `NAO_VERIFICADO` ou `LEGADO` **e** confiança `NAO_VERIFICADO` **e** data ainda em epoch (dado nunca tocado por nenhum processo de revisão).
- `'review'` — todo o resto (tem algum sinal, mas não o suficiente para ser `verified` nem está totalmente cru).
- `'deprecated'` nunca é retornado por esta função.

### 2.3. Wiring nos pontos de construção existentes (sem criar novos)

- **`provenanceLegado()`** — agora inclui `verificationStatus: 'draft'` (via `deriveVerificationStatus`).
- **`fromProdutoComercial()`** — inclui `verificationStatus` derivado e `sourceVersion: p.versao_bula`.
- **`fromQuickDrug()`** — inclui `verificationStatus` derivado por marca a partir do já existente `b.verificado`.
- **`pharma-core/migrate.ts` `toEntity()`** — a função que constrói `DrugEntity.provenance` para **as 367 entidades reais** da base canônica. Inclui `verificationStatus` derivado e `sourceVersion` (do primeiro produto do catálogo Eurofarma/lab-catalog vinculado à marca, quando existir).

Resultado: **toda `DrugEntity` da base canônica real agora carrega um `verificationStatus` não-nulo**, sem que nenhum dado farmacológico tenha sido alterado — só o envelope de metadados.

### 2.4. Novo gate de consistência (RM-40 `checarBaseCanonica`)

Adicionada a regra `VERIFICATION_STATUS_INCONSISTENTE` ([`validation/data-integrity/engine.ts`](../frontend/src/validation/data-integrity/engine.ts)): dispara `erro` quando `verificationStatus === 'verified'` mas `nivel_confianca !== 'ALTA'` — uma contradição interna do envelope que, se não capturada, poderia futuramente alimentar um selo de UI ("✓ Verificado") sobre um dado que na verdade não tem confiança alta. Protege qualquer atribuição manual futura de `verificationStatus` contra inconsistência lógica.

---

## 3. Por que este é o modelo mínimo e não um "segundo sistema"

O modelo sugerido no prompt (`verificationStatus` + `source: {type, reference, verifiedAt, sourceVersion}`) foi **consolidado**, não implementado literalmente:

| Campo sugerido | Onde já existia / decisão |
|---|---|
| `verificationStatus` | Novo campo, mas **dentro** do envelope `DataProvenance` já existente, não um objeto novo. |
| `source.type` | Já existia como `DataProvenance.origem` (`DataOrigin`). Reaproveitado, não duplicado. |
| `source.reference` | Já existia como `DataProvenance.fonte_url`. Reaproveitado. |
| `source.verifiedAt` | Já existia como `DataProvenance.data_atualizacao`. Reaproveitado (e já tinha um gate RM-40 detectando o sentinel epoch). |
| `source.sourceVersion` | Novo campo `sourceVersion`, adicionado ao MESMO envelope (não um sub-objeto `source` novo). |
| responsável/processo de revisão | Já existia como `DataProvenance.responsavel`. Reaproveitado. |
| validade/revisão futura | Novo campo opcional `proximaRevisao`, **não preenchido** por ninguém nesta RM (nenhuma cadência real conhecida — ver §2.1). |

---

## 4. Testes adicionados

- **`src/tests/data-governance-rm61.test.ts`** (13 testes) — cobre `deriveVerificationStatus()` (todos os ramos: verified/draft/review, nunca deprecated, fonte formal com data epoch não vira verified), `provenanceLegado()`, `fromProdutoComercial()` (propagação de `sourceVersion`, produto sem registro ANVISA nunca vira `verified`), `fromQuickDrug()` (marca verificada vs. não verificada), e 2 testes de regressão contra a **base real** (`buildCanonicalDatabase()`): nenhuma entidade real fica sem `verificationStatus`, e nenhuma tem a contradição `verified` + confiança não-ALTA.
- **`src/tests/data-integrity-rm40.test.ts`** (+3 testes) — cobre a nova regra `VERIFICATION_STATUS_INCONSISTENTE` nos 3 casos: dispara quando inconsistente, não dispara quando `verified`+`ALTA`, e não dispara para `review`/`draft`/ausente mesmo com confiança baixa.

Total: **16 testes novos**, todos passando nesta sessão.

---

## 5. Resultados reais dos gates (executados nesta sessão)

- **`npx tsc --noEmit`** — ✅ sem erros (após corrigir 1 erro de tipo no teste: `forma_farmaceutica` exige minúsculas, ex. `'comprimido'`).
- **`npm run lint`** (sem `--fix`) — ✅ 0 problemas.
- **Suite completa (`npx vitest run`)** — ✅ **53 arquivos de teste, 977 testes**, todos passando (inclui os 16 novos).
- **Cobertura (`npm run test:coverage`)** — ✅ exit code 0, todos os thresholds configurados mantidos. Cobertura global: Statements 26.05%, Branches 27.16%, Functions 19.49%, Lines 28.1%.
- **Build (`npm run build`, inclui prebuild)**:
  - **RM-23**: `367 entidades · 0 inconsistências (critical=0 high=0 medium=0 low=0)` — ✅ OK.
  - **RM-24**: `total=367 compatíveis=117 divergentes=0 aceitos=14 críticos=0` — ✅ fontes sincronizadas.
  - **RM-49**: `263 arquivos verificados, 0 sequências suspeitas` — ✅ OK.
  - `next build` — ✅ compilado, 47 rotas estáticas geradas, sem erros de TypeScript.
  - `DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md` foram regenerados pelo build com novo timestamp e revertidos após a execução dos gates, para manter o diff desta RM restrito ao que foi de fato alterado.

---

## 6. Limitações e pendências

- `proximaRevisao` foi adicionado ao tipo mas **não é preenchido em nenhum ponto** — não há cadência de revisão real conhecida para nenhuma fonte hoje. Preencher exigiria uma decisão de produto/regulatória (ex.: "registros ANVISA são revisados a cada N anos") que está fora do escopo desta RM.
- Nenhuma UI foi alterada. O único efeito visual hoje ligado a este envelope continua sendo o `verificado` booleano em `prescricao-rapida`. Expor `verificationStatus` (ex.: um selo diferenciando "revisado" de "nunca revisado") é uma decisão de produto/UX separada, não incluída nesta RM.
- `verificationStatus` é opcional no tipo — código futuro que construa um `DataProvenance` manualmente (sem passar por `provenanceLegado`/`fromProdutoComercial`/`fromQuickDrug`/`migrate.ts`) pode continuar a omiti-lo. A regra `PROVENIENCIA_AUSENTE` já existente cobre a ausência do envelope inteiro, mas não há hoje uma regra "erro" para `verificationStatus` ausente especificamente (decisão consciente: `undefined` é tratado como "equivalente a derivar", não como erro, para não quebrar retrocompatibilidade — ver comentário no tipo).
- O `verificado: boolean` original em `QuickBrand` **não foi removido nem descontinuado** — continua funcionando exatamente como antes (inclusive o `✓` verde em `prescricao-rapida`). A nova camada é aditiva.

---

## Arquivos alterados

**Modificados:**
- `frontend/src/lib/governance/data-governance.ts` — `VerificationStatus`, extensão de `DataProvenance`, `deriveVerificationStatus()`, wiring em `provenanceLegado`/`fromProdutoComercial`/`fromQuickDrug`.
- `frontend/src/lib/pharma-core/migrate.ts` — wiring de `verificationStatus`/`sourceVersion` em `toEntity()`.
- `frontend/src/validation/data-integrity/engine.ts` — nova regra `VERIFICATION_STATUS_INCONSISTENTE`.
- `frontend/src/tests/data-integrity-rm40.test.ts` — 3 testes novos para a regra acima.

**Novo:**
- `frontend/src/tests/data-governance-rm61.test.ts` — 13 testes novos.
- `docs/RM-61-DATA-PROVENANCE-GOVERNANCE.md` (este relatório).

Nenhum dado farmacológico (`PHARMA_DB`, extensões, `eurofarma-sync.ts`, `pharma-library.ts`) foi alterado. Nenhuma UI foi alterada. Nenhum motor clínico foi alterado.
