# RM-63 — Contrato de Cobertura Total da Busca Farmacológica

**Data:** 2026-08-02
**Papel assumido:** engenheiro sênior de busca, qualidade farmacológica e testes de regressão.
**Escopo:** `frontend/src/lib/pharma-database.ts` (`searchDrugs()`), novo módulo `frontend/src/validation/search-coverage/`, `frontend/eslint.config.mjs`. Nenhum dado farmacológico (`PHARMA_DB`, extensões) foi alterado — apenas a lógica de busca e uma nova camada de auditoria/teste.

---

## 1. Modelo anterior

Mapeamento executado antes de qualquer mudança:

- **`PHARMA_DB`** — array base com **80 entidades** (confirmado por `PHARMA_DB.length` nesta sessão).
- **`getAllDrugs()`** — agrega `PHARMA_DB` + 16 extensões por especialidade (cardio, endo, infectologia×2, pulmo×2, neuro×2, gastro, nefro, pediatria, gineco, onco, icu, palliative, rm54-gaps), com deduplicação de marcas por nome (mantendo a versão `verificado:true` quando há conflito). Total real: **367 entidades** — confirmado nesta sessão, memoizado via variável de módulo `_allDrugs` (cache simples, sem TTL).
- **`searchDrugs(query, labPreference?)`** — **já consultava `getAllDrugs()`**, não `PHARMA_DB` (a correção da RM-58 já estava em produção). Confirmado lendo o comentário inline no próprio código, que documenta a regressão original e a correção.
- **`getATCCode(id)`/`getMonitoramento(id)`** — idem: já liam `getAllDrugs().find(d => d.id === id)`, com fallback para tabelas estáticas (`PHARMA_ATC_CODES`/`PHARMA_MONITORAMENTO`) só quando a entidade não tem o campo inline.
- **Normalização** — a busca fazia `query.toLowerCase()` mas **não removia acentos**. Sinônimos comparados por `wordMatch` (início de palavra, evita "astro" → "Gastroparesia") ou igualdade exata; molécula/nome genérico/marca/laboratório por substring livre; classe/indicações por início de palavra.
- **Ranking** — score aditivo (molécula startsWith +100/includes +60; marca startsWith +80; sinônimo startsWith +50; preferência de laboratório +30), ordenado por score decrescente (`Array.prototype.sort`, estável desde ES2019).
- **Deduplicação** — `getAllDrugs()` já deduplicava marcas por nome (case-insensitive) dentro de cada entidade, preferindo a versão `verificado:true`.
- **Entidades não pesquisáveis** — **investigado e não encontrado nenhum sinal estrutural** (campo/flag) de entidade "somente interna" na base real. Toda entidade tem `id`, `molecula` e um array de `marcas` (mesmo que vazio — e nenhuma tem `marcas` vazio hoje).

---

## 2. Risco corrigido nesta RM

A regressão original da RM-58 (busca só em `PHARMA_DB`) **já estava corrigida** antes desta RM. A investigação, no entanto, encontrou um **bug real e não relacionado** durante o mapeamento de normalização:

**`searchDrugs()` não era insensível a acento.** Buscar `"acido"` (sem acento — digitação comum em formulários web/mobile) não encontrava nenhuma das ~10 moléculas cujo nome começa com "Ácido" ou contém acento (`Ácido Acetilsalicílico`, `Ácido Valproico`, `ácido fólico`, `ácido tranexâmico`, etc.), mesmo elas existindo corretamente em `getAllDrugs()`. Confirmado por execução direta antes da correção:

```
searchDrugs('acido')  →  ['Bicarbonato de Sódio Oral', 'bicarbonato de sódio', 'Divalproato de Sódio', 'Ácido Ibandrónico']
searchDrugs('ácido')  →  ['ácido fólico', 'ácido tranexâmico', 'Ácido Acetilsalicílico', 'Ácido Valproico / Valproato de Sódio', ...]
```

Corrigido adicionando uma função `dobrarAcentos()`/`normalizarBusca()` (NFD + remoção de marcas diacríticas) aplicada a AMBOS os lados de toda comparação (`query` e cada campo comparado — molécula, nome genérico, sinônimos, classe, marca, laboratório, indicações). Comportamento antigo preservado integralmente para buscas já acentuadas ou sem acento nenhum — a mudança só AMPLIA o conjunto de correspondências, nunca remove uma que já funcionava (confirmado pela suíte de 1023 testes, incluindo os pré-existentes que já buscavam por nomes exatos).

---

## 3. Contrato de cobertura

Novo módulo `frontend/src/validation/search-coverage/` (mesma convenção de RM-23/RM-24/RM-40/RM-62 — lógica testável extraída para `src/validation/`, não inline no script/página).

### Definição de `searchable` (não existia campo prévio — criada explicitamente)

```ts
// Entidade: toda QuickDrug com id + molecula + array de marcas (mesmo vazio) é,
// por política, pesquisável — não há hoje nenhum sinal estrutural de entidade
// "somente interna" na base real.
export function isSearchableEntity(drug: QuickDrug): boolean;

// Marca: toda marca cadastrada é, por política, "ativa"/pesquisável — não há
// campo de descontinuação/inativação em QuickBrand hoje.
export function isSearchableBrand(brand: QuickBrand): boolean; // sempre true hoje

// Alias/sinônimo: searchDrugs() recusa por DESIGN consultas < 2 caracteres —
// um alias mais curto nunca é encontrável, não por bug.
export function isSearchableAlias(alias: string): boolean; // alias.trim().length >= 2
```

`isSearchableBrand`/`isSearchableEntity` são funções (não `true` inline) deliberadamente — se um campo real de status/inativação for adicionado no futuro, só este ponto único precisa mudar.

### As 6 verificações obrigatórias (percorrendo o catálogo real — 367 entidades, 692 marcas, 1795 sinônimos — nunca uma amostra)

1. **Nome canônico** — `searchDrugs(molecula)` deve retornar a própria entidade.
2. **Nome sem acento (quando aplicável)** — só testado quando `stripAccents(molecula) !== molecula.toLowerCase()` (ou seja, só para as moléculas que realmente têm acento — não força o teste em nomes sem acento, onde seria vácuo).
3. **Cada marca pesquisável** — `searchDrugs(nomeDaMarca)` deve retornar a entidade dona.
4. **Cada alias/sinônimo pesquisável** — idem, exceto os com <2 caracteres (exceção declarada, não ignorada — ver §4).
5. **Nenhum resultado incompatível** — todo resultado retornado por uma busca deve ter justificativa textual real (substring/word-match) para a consulta.
6. **Nenhuma duplicidade indevida** — duas entidades com o mesmo nome de molécula só coexistem legitimamente se tiverem `indicacao_contexto` preenchido e distinto entre si (convenção RM-01 MED-01, ex.: "midazolam" geral/UTI/paliativo).

### Achado de desenho durante esta RM — item 5 precisou de 2 tentativas

A primeira versão do item 5 exigia que a PRÓPRIA molécula ficasse no **topo do ranking** para uma busca exata pelo seu nome. Rodar contra a base real produziu **5 falsos positivos**: buscar `"Semaglutida"` legitimamente também retorna `"Semaglutida 2,4 mg"` (produto de obesidade, nome começa com "Semaglutida"); buscar `"desogestrel"` legitimamente retorna `"etinilestradiol + desogestrel"` (combinação hormonal contendo a molécula); idem para `"Budesonida"` → `"Budesonida/Formoterol"`, `"ibuprofeno"` → `"Ibuprofeno + Paracetamol"`, `"bicarbonato de sódio"` → variantes. Nenhum destes é uma incompatibilidade real — são produtos combinados legitimamente relacionados. **Corrigido** trocando o critério de "deve ser o 1º colocado" para "todo resultado retornado deve ter uma justificativa textual real" (replicando os mesmos critérios de match do próprio `searchDrugs()`) — sem falsos positivos, e ainda assim capaz de pegar um resultado genuinamente espúrio caso um futuro refactor solte o critério de match sem justificativa.

---

## 4. Métricas reais (execução desta sessão, catálogo completo — 367 entidades)

```
entidadesTotais:          367
entidadesPesquisaveis:    367
entidadesEncontradasPorNome: 367
marcasPesquisaveis:       692
marcasEncontradas:        692
aliasesPesquisaveis:     1795
aliasesEncontrados:      1795
coberturaEntidadesPct:    100
coberturaMarcasPct:       100
coberturaAliasesPct:      100
falhas:                     0
contractOk:               true
```

Nenhum número acima foi copiado de RM anterior — todos vêm de `buildSearchCoverageReport()` executado nesta sessão contra `getAllDrugs()` real (não uma amostra de 5/10/N marcas).

---

## 5. Exceções

Nenhuma exceção de **conteúdo** foi necessária — 100% de cobertura foi atingido sem precisar excluir nenhuma entidade/marca/alias real do catálogo.

A única exceção **estrutural** declarada no modelo (não uma allowlist de conveniência, mas um contrato explícito do próprio motor de busca):

- **`ALIAS_CURTO_DEMAIS`** — `searchDrugs()` recusa por design (`if (!query || query.length < 2) return [];`) qualquer consulta com menos de 2 caracteres. Um sinônimo cadastrado com 1 caractere nunca seria encontrável — não é uma falha de cobertura, é uma regra estrutural do motor. `isSearchableAlias()`/`explainAliasException()` tornam essa exceção explícita e testável (`explainAliasException()` retorna `null` para qualquer alias válido — nunca suprime um alias real sem motivo). **Não há hoje nenhum alias real no catálogo com menos de 2 caracteres** (verificado: todos os ~1795 sinônimos passam no teste de tamanho).

---

## 6. Testes adicionados

Novo arquivo: `src/tests/search-coverage-contract-rm63.test.ts` (**28 testes**), organizados em 6 grupos:

1. **Contrato de cobertura total** (2 testes) — roda `buildSearchCoverageReport()` contra o catálogo real completo, imprime as métricas reais no output, e assere 100%/100%/100% + 0 falhas + todas as 367 entidades passam em `isSearchableEntity`. Timeout de 60s (ver §7 — não é um teste rápido, é uma varredura exaustiva deliberada).
2. **Proteção arquitetural — teste de COMPORTAMENTO, não grep** (8 testes) — usa `Atenolol`/`Nifedipino`/`Diltiazem` (confirmados por grep **nesta investigação** como existentes SOMENTE nas extensões, ausentes de `PHARMA_DB` base) para provar por COMPORTAMENTO REAL que `searchDrugs()` cobre as extensões: se a função regredir para consultar só `PHARMA_DB`, estes testes falham porque a molécula deixa de ser encontrada — não porque o código-fonte foi inspecionado. Idem para `getATCCode('atenolol')` (código `C07AB03`, inline, sem entrada em nenhuma tabela de fallback — confirmado por grep) e `getMonitoramento('colecalciferol')` (array inline `['25(OH)D sérica', 'Cálcio sérico/urinário']`, idem sem fallback).
3. **Regressões específicas** (8 testes) — Poviztra™/Extensior® (semaglutida obesidade vs. DM2, marcas nunca cruzadas entre as duas entidades), nomes com acento, nomes compostos/combinações, sais farmacêuticos, combinação hormonal, marcas que não se parecem com a molécula (Glifage→Metformina, Aldactone→Espironolactona). Explicitamente NÃO usados como substituto da varredura completa (item 1 já cobre o catálogo inteiro).
4. **Deduplicação** (4 testes) — a base real não tem duplicidade indevida; variantes de contexto clínico legítimas (midazolam geral/UTI/paliativo) não são sinalizadas; e — importante — **2 testes com fixtures sintéticas provando que o detector realmente pega uma duplicata quando ela existe** (não é "sempre verde" só porque a base real está limpa).
5. **Exceções declaradas** (3 testes) — `isSearchableAlias`/`explainAliasException` nunca descartam um alias silenciosamente.
6. **Performance** (2 testes) — ver §7.

---

## 7. Performance medida (sem otimização especulativa)

Medido **antes** de qualquer alteração, conforme pedido ("não otimizar sem medição"):

| Operação | Custo medido | Observação |
|---|---|---|
| `getAllDrugs()` a frio (1ª chamada) | 1,327 ms | Constrói e memoiza o array de 367 entidades uma única vez |
| `getAllDrugs()` aquecido (×1000) | 0,0001 ms/chamada | **Já memoizado** via variável de módulo `_allDrugs` — chamadas repetidas são O(1), não reconstroem nada |
| `searchDrugs()` (×1000, mesma query) | 3,40 ms/chamada | Escaneia as 367 entidades a cada chamada (comportamento correto para busca interativa — não há necessidade de cache aqui, já que o resultado depende da query) |
| Auditoria completa (367 nomes + acento + 692 marcas + 1795 aliases ≈ 3.221 chamadas a `searchDrugs()`) | ~10–13 s | Ver decisão abaixo |

**Decisão: nenhuma otimização foi aplicada.** `getAllDrugs()` — a função que a RM pedia para verificar quanto ao custo de chamadas repetidas — **já está memoizada** e o custo é irrelevante (0,0001 ms/chamada). O custo real está inteiramente em `searchDrugs()` fazer um scan O(catálogo) a cada chamada, o que é o comportamento CORRETO e esperado para uma função de busca interativa de uso único por vez (um médico digitando uma consulta) — não uma função chamada milhares de vezes por segundo em produção. Otimizar `searchDrugs()` internamente (ex.: índice invertido pré-computado) alteraria uma função crítica de segurança clínica só para acelerar esta suíte de testes, o que não se justifica — em vez disso, a suíte de teste generosamente aumenta o timeout do único teste que precisa das ~3.221 chamadas (`60_000ms`, documentado inline no teste).

---

## 8. Resultados reais dos gates (execução desta sessão)

- **`npx tsc --noEmit`** — ✅ sem erros.
- **`npm run lint`** (sem `--fix`) — primeira execução: 4 warnings (`eslint-disable-next-line no-console` desnecessário, o projeto não tem regra `no-console` ativa para testes). Corrigido removendo os comentários. Segunda execução: ✅ 0 problemas.
- **Suite completa (`npx vitest run`)** — ✅ **55 arquivos de teste, 1023 testes**, todos passando (inclui os 28 novos desta RM).
- **Cobertura (`npm run test:coverage`)** — ✅ exit code 0, todos os thresholds configurados mantidos.
- **Build (`npm run build`, inclui prebuild)**:
  - **RM-23**: `367 entidades · 0 inconsistências` — ✅ OK.
  - **RM-24**: `total=367 compatíveis=117 divergentes=0 aceitos=14 críticos=0` — ✅ fontes sincronizadas.
  - **RM-49**: `272 arquivos verificados, 0 sequências suspeitas` — ✅ OK.
  - **RM-62** (gate de integridade comercial, já em produção desde a RM anterior): `BLOCKING_ERROR=0 · REVIEW_REQUIRED=97 · ACCEPTED_EXCEPTION=1` — ✅ OK (não afetado por esta RM).
  - `next build` — ✅ compilado com sucesso.
  - `DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md` foram regenerados pelo build com novo timestamp e revertidos após a execução dos gates, para manter o diff desta RM restrito ao que foi de fato alterado.

---

## 9. Limitações e decisões conscientes

- O novo módulo `src/validation/search-coverage/` foi adicionado à allowlist do guard RM-06 (`no-restricted-imports`) em `eslint.config.mjs`, com a mesma justificativa de RM-24/RM-40/RM-62: é uma auditoria READ-ONLY do catálogo em si (precisa de `sinonimos`/`nome_generico` brutos, que `DrugEntity`/`pharma-core` não expõe), não uma feature de produto.
- O item 5 ("resultados não incompatíveis") verifica justificativa textual, não qualidade de ranking — uma busca por "desogestrel" retornar a combinação hormonal ANTES do produto de progestagênio isolado (ordem de empate no score) é uma nuance de ranking, não uma incompatibilidade, e está fora do escopo desta RM (não foi pedido para redesenhar o algoritmo de scoring).
- A correção de acentuação altera o comportamento observável de `searchDrugs()` (amplia resultados para buscas sem acento) — documentado explicitamente como a única mudança de comportamento desta RM, e coberta por teste de regressão específico.

---

## Arquivos alterados

**Novos:**
- `frontend/src/validation/search-coverage/types.ts`
- `frontend/src/validation/search-coverage/engine.ts`
- `frontend/src/validation/search-coverage/index.ts`
- `frontend/src/tests/search-coverage-contract-rm63.test.ts`
- `docs/RM-63-SEARCH-COVERAGE-CONTRACT.md` (este relatório)

**Modificados:**
- `frontend/src/lib/pharma-database.ts` (`searchDrugs()`: adicionada normalização de acento via `dobrarAcentos()`/`normalizarBusca()`; nenhum outro comportamento alterado)
- `frontend/eslint.config.mjs` (allowlist RM-06 estendida para `src/validation/search-coverage/**`, com justificativa)

Nenhum dado farmacológico (`PHARMA_DB`, extensões, `eurofarma-sync.ts`) foi alterado. Nenhum motor clínico foi alterado.
