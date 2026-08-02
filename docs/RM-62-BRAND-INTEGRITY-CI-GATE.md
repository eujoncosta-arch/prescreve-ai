# RM-62 — Gate Permanente de Integridade Comercial Farmacológica

**Data:** 2026-08-02
**Papel assumido:** engenheiro de qualidade de dados farmacológicos e CI/CD.
**Escopo:** `frontend/scripts/audit-brand-concentrations.mjs`, novo módulo `frontend/src/validation/brand-concentration-audit/`, `frontend/package.json`, `.github/workflows/ci.yml`, `frontend/eslint.config.mjs`. Nenhum dado farmacológico foi alterado.

---

## 1. Investigação do script atual (antes de alterar)

Executei e li o script original antes de qualquer mudança:

```bash
npx tsx scripts/audit-brand-concentrations.mjs
```

**Saída real:** `Total de marcas no sistema: 692` · `Marcas explicitamente marcadas verificado:false: 0` · `Grupos suspeitos (concentrações idênticas entre labs diferentes): 99` — seguido da listagem dos 99 grupos. **`echo $?` → `0`.**

Respondendo aos 7 pontos exigidos pela investigação:

1. **Executado** — ver acima.
2. **Lógica lida** — o script (`getAllDrugs()` → agrupa `marcas` por `JSON.stringify([...concentracoes].sort())` dentro de cada molécula → reporta qualquer grupo com ≥2 marcas de laboratórios diferentes).
3. **Entradas/saídas/critérios** — entrada: `getAllDrugs()` (367 medicamentos, 692 marcas). Saída: texto em `console.log`. Critério único: mesma assinatura de concentração (ordenada) + ≥2 laboratórios distintos no MESMO grupo `QuickDrug`.
4. **Exit code** — **sempre `0`**, mesmo com 99 grupos "suspeitos" listados. Não há `process.exit(1)` em lugar nenhum do arquivo. Isto é exatamente o problema que a RM-62 pede para corrigir: o script nunca poderia falhar um build, mesmo se reintroduzisse o bug real do Sinot Clav®.
5. **Combinações e exceções** — não existiam. Todo grupo encontrado era tratado de forma idêntica (impresso como "suspeito"), sem nenhuma distinção entre bioequivalência regulatória legítima (a norma para genéricos) e dado copiado sem verificação. Não havia mecanismo de exceção documentada.
6. **Determinismo** — dado um snapshot fixo do código-fonte, a saída é reprodutível (V8 `Map` preserva ordem de inserção), mas a ORDEM da saída dependia inteiramente da ordem de concatenação dos arrays de origem em `getAllDrugs()` (`[...PHARMA_DB, ...PHARMA_DB_CARDIO, ...]`) — nenhuma ordenação explícita. Qualquer refatoração futura na ordem desses arrays mudaria a ordem do relatório sem mudar seu CONTEÚDO, o que é uma fragilidade para comparação de relatórios em CI (diffs ruidosos). Corrigido nesta RM com ordenação explícita por `regra → molécula → primeira marca`.
7. **Dependência de ordem de carregamento** — sim, ver item 6 (a ordem de agrupamento por molécula seguia a ordem de `getAllDrugs()`, sem normalização).

**Achado adicional da investigação (motivou a Regra 1 nova):** ao ler `pharma-database.ts` por completo, confirmei que `enrichWithEurofarma()` (a IIFE que corrigiu o Sinot Clav® original) só percorre `PHARMA_DB` (o array base) — **não** as 16 extensões por especialidade (`pharma-database-endo.ts`, `-cardio.ts` etc.). Uma marca Eurofarma com `produto_id` hardcoded numa extensão (ex.: `Poviztra™` em `pharma-database-endo.ts`, adicionada na RM-58) **não** é auto-corrigida pela IIFE se seus dados divergirem do catálogo verificado (`EUROFARMA_CATALOG`). O script original nunca testava isso — a RM-62 adiciona essa checagem (Regra 1, ver §3).

---

## 2. Comportamento anterior vs. novo

| Aspecto | Antes (RM-58) | Depois (RM-62) |
|---|---|---|
| Exit code em achado suspeito | Sempre `0` | `1` **somente** se houver `BLOCKING_ERROR` |
| Classificação | Nenhuma — tudo "suspeito" | `BLOCKING_ERROR` / `REVIEW_REQUIRED` / `ACCEPTED_EXCEPTION`, explícitas |
| Concentração idêntica entre labs | Tratada como suspeita/possível erro | `REVIEW_REQUIRED` por padrão — nunca promovida a erro automaticamente |
| Divergência hardcoded vs. catálogo verificado | Não detectada | `BLOCKING_ERROR` (Regra 1, nova) |
| Marca duplicada em labs incompatíveis | Não detectada | `BLOCKING_ERROR` (Regra 2, nova) |
| Exceções documentadas | Não existiam | `ACCEPTED_EXCEPTION` com id/justificativa/referência obrigatórios, validados no carregamento |
| Execução | Manual (`npx tsx scripts/...`) | `npm run audit:brand-concentrations` (local) + `prebuild` (automático no build/CI) |
| Testabilidade | Nenhuma (lógica inline no script) | Lógica extraída para `src/validation/brand-concentration-audit/` (testável via import direto, mesmo padrão de RM-23/RM-24/RM-40) |
| Ordem da saída | Dependente da ordem de concatenação dos arrays de origem | Ordenação explícita (`regra → molécula → marca`) — determinística e estável a refatorações |

---

## 3. Classificação dos achados — 3 regras

### Regra 1 — `PRODUTO_ID_CONCENTRACAO_DIVERGENTE` (`BLOCKING_ERROR`)

Uma marca com `produto_id` (vínculo declarado a um produto do catálogo verificado — Eurofarma ou lab-catalog) cujas `concentracoes` hardcoded, como CONJUNTO, divergem das concentrações reais do produto no catálogo. Este é o formato **exato** do bug histórico do Sinot Clav®: dado comercial hardcoded contradizendo a fonte que deveria governá-lo. Comparação por conjunto (não por lista com contagem) — `ProdutoComercial.apresentacoes` pode legitimamente ter a mesma concentração repetida em embalagens diferentes (ex.: "20 mg" em caixa de 30 e de 60), o que não é uma divergência real (corrigido durante o desenvolvimento desta RM — ver §7).

### Regra 2 — `MARCA_DUPLICADA_LABS_INCOMPATIVEIS` (`BLOCKING_ERROR`)

O mesmo nome comercial atribuído a 2+ laboratórios **canônicos** diferentes (após resolver aliases de grafia via `resolveLaboratory()` do RM-00) para a mesma molécula — estruturalmente incompatível, a menos que seja um caso documentado de co-marketing (que deveria então virar uma `ACCEPTED_EXCEPTION`).

### Regra 3 — `CONCENTRACAO_IDENTICA_ENTRE_LABS` (`REVIEW_REQUIRED` por padrão, `ACCEPTED_EXCEPTION` se casar com exceção documentada)

A heurística original da RM-58, preservada mas **rebaixada de classificação**: mesma assinatura de concentração para a mesma molécula em laboratórios diferentes. Por instrução explícita desta RM ("não bloquear por simples igualdade de concentrações entre fabricantes"), isto **nunca** é promovido automaticamente a erro — é a norma regulatória para genéricos/medicamentos de referência (a bioequivalência exige, por definição, a mesma concentração).

Rodando contra a base real (após a correção de §7): **97 grupos `REVIEW_REQUIRED`**, **1 `ACCEPTED_EXCEPTION`**, **0 `BLOCKING_ERROR`**.

---

## 4. Exceções (`ACCEPTED_EXCEPTION`)

Registro em [`src/validation/brand-concentration-audit/exceptions.ts`](../frontend/src/validation/brand-concentration-audit/exceptions.ts). Cada exceção exige `id`, `molecula`, `concentracoes`, `justificativa` (mínimo 20 caracteres — rejeita "ok"/"revisado" genéricos), `referencia` e `decididoPor`/`data` — todos validados em tempo de carregamento do módulo (`validarExcecao()` lança exceção imediatamente se qualquer campo obrigatório faltar, em vez de aceitar silenciosamente).

**Uma única exceção populada nesta RM** (deliberadamente — não populei os outros 96 grupos `REVIEW_REQUIRED` em massa, pois isso seria exatamente a "allowlist sem justificativa" que a RM proíbe):

- `sinot-clav-augmentin-2026-07-rm58` — Sinot Clav® (Eurofarma) vs. Augmentin (GSK), concentrações `400/57 mg/5 mL` e `875/125 mg`. Justificativa: ambas as marcas foram verificadas individualmente contra bula/registro durante a RM-58 (que também corrigiu o próprio Sinot Clav® de 4 para 2 concentrações reais). Referência: `docs/RM-58-AUDITORIA-GERAL-E-CORRECOES.md` (confirmado existente no repositório antes de citar).

Os outros 96 grupos `REVIEW_REQUIRED` continuam **visíveis e não bloqueantes** no relatório — nenhum foi ocultado nem convertido em exceção sem revisão individual.

---

## 5. Integração no fluxo (comando + CI + prebuild)

- **Comando explícito:** `npm run audit:brand-concentrations` (novo em `package.json`), mesma convenção de `check:consistency`/`check:sync`/`check:text-integrity`.
- **`prebuild`:** adicionado ao final da cadeia (`... && tsx scripts/audit-brand-concentrations.mjs`) — mesma convenção de RM-23/RM-24/RM-49, que já rodam ali. Custo confirmado baixo (a auditoria completa das 692 marcas roda em frações de segundo — ver `EXIT_CODE` e tempo no §8).
- **CI:** **não** foi adicionado um step separado no workflow. Decisão explícita: o job `frontend` já chama `npm run build`, que já executa `prebuild` (e portanto o novo gate) automaticamente. Adicionar um segundo step chamando `npm run audit:brand-concentrations` diretamente duplicaria a execução na MESMA esteira — violando a regra explícita "não duplicar execução desnecessariamente". O comentário no topo de `ci.yml` e o nome do step "Build" foram atualizados para citar RM-62 explicitamente, e a saída do script usa o prefixo distintivo `[RM-62]` (mesma convenção de `[RM-23]`/`[RM-24]`/`[RM-49]`) para que o gate seja identificável nos logs do CI sem ambiguidade.
- **Fluxo local:** `npm run audit:brand-concentrations` roda a auditoria isoladamente, sem precisar rodar o build inteiro.

### Confirmações pedidas pela RM

- ✅ O comando existe (`audit:brand-concentrations`).
- ✅ Roda sem `--fix` — não há nenhuma flag de correção automática; o script é read-only (nunca escreve em `PHARMA_DB`/`eurofarma-sync.ts`/etc.).
- ✅ CI falha quando existe `BLOCKING_ERROR` — `process.exit(1)` propaga através do `&&` do prebuild, que propaga através de `npm run build`, que é o comando do step "Build" do job `frontend`.
- ✅ CI não falha por item apenas `REVIEW_REQUIRED` — `buildOk` só considera `BLOCKING_ERROR` (verificado por teste, ver §6).
- ✅ O job aparece de forma clara — linhas `[RM-62] ...` distintas no log do step "Build", mesma convenção dos demais gates.

---

## 6. Testes (fixtures 100% sintéticas — catálogo real nunca alterado)

Novo arquivo: `src/tests/brand-concentration-audit-rm62.test.ts` (18 testes), com fixtures sintéticas cobrindo exatamente os 7 cenários pedidos:

1. **Caso válido** — marca única, ou marcas com concentrações diferentes → nenhum achado.
2. **Caso semelhante ao Sinot Clav** — marca com `produto_id` hardcoded contendo concentrações extras que o catálogo verificado não tem → `BLOCKING_ERROR`; e o caso simétrico (concentrações idênticas ao catálogo, só em ordem/repetição diferente) → nenhum achado (prova de que a comparação é por conjunto, não por lista bruta).
3. **Combinação legítima** — mesma molécula/concentração em 2 labs diferentes → `REVIEW_REQUIRED`; mesmo nome em variantes de grafia do MESMO laboratório (via `resolveLaboratory`) → nenhum achado.
4. **Exceção aceita** — grupo que casa exatamente com uma exceção documentada → `ACCEPTED_EXCEPTION`, nunca oculto da lista; exceção não "vaza" para outro grupo com concentrações diferentes da mesma molécula.
5. **Dado suspeito** — 3 laboratórios compartilhando a mesma concentração → um único achado agregando as 3 marcas, `REVIEW_REQUIRED`.
6. **Erro bloqueante** — mesmo nome comercial em 2 laboratórios canônicos diferentes → `BLOCKING_ERROR`; o mesmo nome no MESMO laboratório (grafia diferente) → nenhum achado.
7. **Saída determinística** — rodar o mesmo conjunto de entrada 2x produz a MESMA lista de achados; a ordem dos achados não depende da ordem de entrada dos `drugs` (prova direta contra o achado do item 6 da investigação, §1).

Mais 1 teste de regressão contra a base real: `runBrandConcentrationAudit()` sem overrides tem `bySeverity.BLOCKING_ERROR === 0` e `buildOk === true`.

---

## 7. Bug encontrado e corrigido durante o desenvolvimento desta própria RM

A primeira versão da Regra 1 comparava `concentracoes` como LISTAS ordenadas (sem deduplicar), e rodar contra a base real produziu **3 falsos `BLOCKING_ERROR`** (Azitromicina/Astro® Suspensão Oral, Prednisolona/Preni®, Tadalafila/Tada®) — todos causados por `ProdutoComercial.apresentacoes` ter a MESMA concentração repetida em linhas diferentes (embalagens/formas diferentes com a mesma força, ex.: "20 mg comprimido caixa 30" e "20 mg comprimido caixa 60"), o que inflava a contagem no catálogo verificado sem representar nenhuma divergência real. Corrigido normalizando ambos os lados para CONJUNTO (`[...new Set(...)]`) antes de comparar — depois da correção, `BLOCKING_ERROR=0` contra a base real, como esperado (nenhuma divergência real existe hoje).

---

## 8. Comandos executados e resultados reais desta sessão

- `npx tsx scripts/audit-brand-concentrations.mjs` (script original, antes de qualquer mudança): `692 marcas`, `99 grupos suspeitos`, **exit code 0** (confirmando o problema).
- `npx tsx scripts/audit-brand-concentrations.mjs` (script novo, após a correção do §7): `692 marcas`, `BLOCKING_ERROR=0 · REVIEW_REQUIRED=97 · ACCEPTED_EXCEPTION=1`, **exit code 0**.
- `npx vitest run src/tests/brand-concentration-audit-rm62.test.ts` — ✅ **18/18 testes passando**.
- `npx tsc --noEmit` — ✅ sem erros.
- `npm run lint` (sem `--fix`) — encontrou 3 erros de `no-restricted-imports` na primeira execução (o novo módulo lê `pharma-database`/`eurofarma-sync`/`lab-catalog` diretamente — guarda RM-06 que impede exatamente isso para código novo). Corrigido adicionando `src/validation/brand-concentration-audit/**` à allowlist do RM-06 em `eslint.config.mjs`, com justificativa explícita no comentário: esta auditoria PRECISA ler as fontes legadas diretamente porque `pharma-core/migrate.ts` já autocorrige `DrugEntity.presentations` a partir do catálogo quando o nome da marca casa com um produto — construir esta checagem sobre `drugRepository`/`DrugEntity` mascararia exatamente o tipo de bug que ela existe para detectar (mesmo raciocínio que já justificou a presença de `cross-database`/`data-integrity` na mesma allowlist). Segunda execução: ✅ 0 problemas.
- **Suite completa (`npx vitest run`)** — ✅ **54 arquivos, 995 testes**, todos passando (inclui os 18 novos).
- **Cobertura (`npm run test:coverage`)** — ✅ exit code 0, todos os thresholds configurados mantidos.
- **Build (`npm run build`, inclui prebuild)** — ✅ compilado; log confirma as 4 linhas `[RM-23]`/`[RM-24]`/`[RM-49]`/`[RM-62]`, todas com veredito ✅; 47 rotas estáticas geradas.
- **Validação de sintaxe do workflow** — `.github/workflows/ci.yml` parseado com sucesso via `js-yaml`/`yaml` (Node), sem erro de sintaxe; chaves de topo confirmadas (`name`, `on`, `jobs`).
- `DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md` foram regenerados pelo build com novo timestamp e revertidos após a execução dos gates, para manter o diff desta RM restrito ao que foi de fato alterado.

---

## 9. Limitações e decisões conscientes

- A Regra 2 (`MARCA_DUPLICADA_LABS_INCOMPATIVEIS`) é escopo específico deste script — RM-23 (`drug-consistency`) já cobre um espectro mais amplo de inconsistências marca↔ativo↔laboratório sobre `DrugEntity`; esta regra é intencionalmente mais estreita (foco em nome+laboratório, não duplica o que RM-23 já faz).
- A Regra 1 só detecta divergência quando a marca tem `produto_id` explícito. Uma marca Eurofarma sem `produto_id` mas com nome que casa com um produto do catálogo continua sendo auto-corrigida silenciosamente por `enrichWithEurofarma()`/`migrate.ts` antes de chegar a qualquer camada superior — não é um "erro escondido" (o dado final é o correto), mas o dado hardcoded na fonte legada pode ainda estar desatualizado sem gerar alerta. Fora do escopo desta RM (exigiria auditar TODA marca hardcoded contra o catálogo por nome, não só por `produto_id` — mudança maior, não a "menor mudança segura" pedida).
- Nenhuma UI foi alterada — este é um gate de CI/build, não uma feature visível ao usuário final.

---

## Arquivos alterados

**Novos:**
- `frontend/src/validation/brand-concentration-audit/types.ts`
- `frontend/src/validation/brand-concentration-audit/exceptions.ts`
- `frontend/src/validation/brand-concentration-audit/engine.ts`
- `frontend/src/validation/brand-concentration-audit/index.ts`
- `frontend/src/tests/brand-concentration-audit-rm62.test.ts`
- `docs/RM-62-BRAND-INTEGRITY-CI-GATE.md` (este relatório)

**Modificados:**
- `frontend/scripts/audit-brand-concentrations.mjs` (de auditoria manual inline para wrapper fino sobre o módulo de validação, com exit code real)
- `frontend/package.json` (novo script `audit:brand-concentrations`; `prebuild` estendido)
- `.github/workflows/ci.yml` (comentário de topo + nome do step "Build" atualizados para citar RM-62)
- `frontend/eslint.config.mjs` (allowlist RM-06 estendida para o novo módulo, com justificativa)

Nenhum dado farmacológico (`PHARMA_DB`, extensões, `eurofarma-sync.ts`, `pharma-library.ts`) foi alterado. Nenhum motor clínico foi alterado.
