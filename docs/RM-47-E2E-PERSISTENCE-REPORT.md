# RM-47 — End-to-End Clinical Persistence & User Isolation

**Pré-requisitos:** RM-42 a RM-46 concluídos. Nenhuma expansão clínica foi iniciada.

---

## 1. Limitação de infraestrutura (verificada, declarada antes de qualquer implementação)

Antes de escrever qualquer teste, verifiquei o que este ambiente realmente suporta:

- `docker`: **não instalado** (`docker: command not found`).
- `psql`: **não instalado**.
- Nenhuma dependência de teste de banco embutido (`pg-mem`, `better-sqlite3`, `testcontainers`) no `package.json` do backend.
- Nenhum framework de automação de navegador (`playwright`, `cypress`) no `package.json` do frontend.
- O servidor `next dev` neste sandbox retorna 404 em toda rota (limitação já registrada em RM-43/44 — confirmada novamente, não é uma regressão desta RM).

**Consequência honesta:** não é possível rodar a suíte contra o PostgreSQL real de produção/desenvolvimento neste ambiente, nem contra um navegador real. Construir essa infraestrutura do zero (subir um Postgres, escrever um driver de automação de navegador) seria inventar infraestrutura que este ambiente não tem — o que a própria RM proíbe.

**O que foi construído em vez disso** (e por que é genuinamente E2E, não "mais testes de unidade do reducer"):

1. **Camada backend** (`backend/test/e2e-clinical-persistence.e2e-spec.ts`): requisições HTTP **reais** via `supertest`, contra uma aplicação NestJS **real** (guards, pipes de validação, DTOs, controllers, services — TODOS reais), com a persistência substituída por um fake **realista e com estado** (`backend/test/support/fake-prisma.ts`) que implementa fielmente unicidade de `idempotency_key` (erro `P2002` real do `@prisma/client`), filtragem por `usuario_id`, ordenação/paginação. Este é o MESMO padrão já usado pelos e2e-specs pré-existentes do projeto (`ownership-authorization.e2e-spec.ts` etc.) — não é uma redução de rigor introduzida agora.
2. **Camada frontend** (`frontend/src/tests/e2e-logout-race-rm47.test.ts`): `fetch()` **real** do `api-client.ts` contra um servidor HTTP **real** (Node `http`, na mesma máquina), provando o comportamento do cliente sob uma condição de corrida **real** (não simulada por um mock que resolve na ordem escolhida pelo teste).

O que isso **não prova**: comportamento específico do PostgreSQL sob concorrência real de conexões, nem cliques reais de mouse num navegador. Essas duas lacunas são registradas explicitamente na seção 7 (Limitações), não escondidas.

---

## 2. Cenários — resultado

| # | Cenário | Onde foi provado | Resultado |
|---|---|---|---|
| 1 | Persistência entre sessões | Backend E2E — login real → `POST /api/consulta` → `POST /api/prescricao` → nova requisição HTTP independente ("recarregar") → `GET /api/consultas` → `GET /api/consulta/:id` | ✅ Passou — consulta e itens REAIS da prescrição confirmados |
| 2 | Outro dispositivo/sessão | Backend E2E — segundo login (token diferente) → `GET /api/consultas`/`GET /api/consulta/:id` com o segundo token | ✅ Passou — histórico e prescrição recuperados, nenhum dado fictício |
| 3 | Isolamento entre usuários | Backend E2E — A cria consulta → logout de A → login de B → B nunca vê a consulta de A (nem na lista, nem por acesso direto ao id — 404) | ✅ Passou |
| 4 | Consulta local pendente | **Ver seção 3** — coberto parcialmente por suítes já existentes (RM-45), não uma suíte nova nesta RM | ⚠️ Ver limitação abaixo — não fabricado |
| 5 | Paginação | Backend E2E — 25 consultas reais, páginas de 10, sem duplicatas, ordem `criado_em desc` correta, página além do fim vazia | ✅ Passou |
| 6 | Logout durante requisição | Frontend E2E (fetch real) — hidratação em voo + logout real antes da resposta chegar + resposta liberada depois → descartada | ✅ Passou (+ teste de controle confirmando que, sem logout, a mesma hidratação aplica normalmente) |
| 7 | Erro e recuperação | Backend E2E — 401 (sem token/token forjado), 500 (falha real simulada na persistência — consulta NUNCA gravada), retry com a mesma `idempotency_key` (mesmo registro, nunca duplicado) | ✅ Passou |

---

## 3. Cenário 4 — por que não foi "inventado"

O cenário pede explicitamente: *"Não assumir persistência após reload se ela não existir. Nesse caso, registrar como limitação e não inventar comportamento."*

A persistência de consultas pendentes **existe** (RM-45: `persistirConsultasPendentes`/`restaurarConsultasPendentes`, `frontend/src/lib/store.tsx`), mas já é testada em `frontend/src/tests/store-sync-resilience-rm45.test.ts` usando o `localStorage` **real** do ambiente jsdom (uma implementação genuína da Web Storage API, não um mock manual) — persistir, "recarregar" (nova chamada de `restaurarConsultasPendentes()` simulando um novo carregamento de módulo) e confirmar que os dados clínicos voltam, incluindo a normalização `syncing→failed`.

**O que não foi possível provar nesta RM:** um reload de página **real**, num navegador **real**, preservando o estado React inteiro via localStorage. Isso exigiria um navegador de verdade automatizado — a ferramenta de Browser deste ambiente já demonstrou (RM-43/44) que o `next dev` local retorna 404 em qualquer rota aqui, tornando essa verificação impraticável neste sandbox especificamente. **Registrado como limitação (seção 7), não simulado com um resultado inventado.**

O "retry sem duplicação" do cenário 4 **foi** verificado de ponta a ponta nesta RM — tanto no backend (Cenário 7, reenvio da mesma `idempotency_key`) quanto já extensivamente no frontend (RM-45, `podeSincronizar`).

---

## 4. Evidências

### Backend — `npm run test:e2e` (suíte completa, incluindo os 10 arquivos existentes + o novo desta RM)

```
Test Suites: 10 passed, 10 total
Tests:       135 passed, 135 total
```

Novo arquivo (`e2e-clinical-persistence.e2e-spec.ts`) isolado: **7/7 passando**.

### Frontend — `npx vitest run` (suíte completa)

```
Test Files  38 passed (38)
Tests  762 passed (762)
```

Novo arquivo (`e2e-logout-race-rm47.test.ts`) isolado: **2/2 passando**.

### Logs relevantes (sem dados sensíveis)

Os únicos logs de erro observados durante a execução são **esperados** — são o `console.error` do próprio Nest ao processar a falha simulada de 500 (Cenário 7) e o reenvio de `idempotency_key` colidido (comportamento correto de `criarComIdempotenciaSobColisao`, já documentado em RMs anteriores). Nenhum e-mail/senha/dado clínico real aparece em nenhum log — todos os dados de teste são sintéticos (`*.teste.local`, "Amoxicilina 500mg" genérico, sem nome de paciente real).

### Dados de teste

- E-mails: `medico.a@teste.local`, `medico.b@teste.local`, `medico.a3@teste.local`, `medico.b3@teste.local`, `medico.pag@teste.local`, `medico.erro@teste.local`, `medico.retry@teste.local` — sintéticos, existem SOMENTE dentro de cada teste (`FakeDb` recriado do zero em `beforeEach`).
- Senhas: strings de teste óbvias (`SenhaForte123!`), nunca reaproveitadas fora da suíte.
- Nenhum paciente real, nenhum nome fictício "de produto" (tipo "Maria Santos" usado no modo demo) — os dados clínicos de teste são deliberadamente genéricos ("Febre", "Dor", "Tosse", "Amoxicilina").

---

## 5. Falhas encontradas durante a construção da suíte (e correções)

Nenhuma FALHA DE PRODUTO foi encontrada por esta suíte — os 7 cenários passaram já na primeira versão funcionalmente correta do fake de persistência. As correções feitas foram exclusivamente na PRÓPRIA suíte de teste (bugs de escrita do teste, não do sistema sob teste):

1. Um helper (`criarPrescricao`) declarado `async` desnecessariamente retornava uma `Promise` em vez do objeto encadeável do `supertest` — corrigido removendo `async`.
2. Status HTTP esperado para `POST /auth/logout` estava errado no teste (`201` em vez do real `200`, que o controller define explicitamente via `@HttpCode(HttpStatus.OK)`) — corrigido após ler o controller.
3. No teste de "logout durante requisição" (frontend), uma variável de controle (`segurarResposta`) não inicializada (`undefined`) fazia a asserção `not.toBeNull()` passar incorretamente, já que `undefined !== null` — corrigido inicializando explicitamente como `null` e checando `typeof === 'function'`.

Nenhuma dessas é uma correção de comportamento do produto — são exclusivamente ajustes da suíte de teste em construção, documentados aqui por transparência.

---

## 6. Gates

| Gate | Resultado |
|---|---|
| Backend `tsc --noEmit` | ✅ limpo |
| Backend `eslint` (arquivos novos) | ✅ limpo |
| Backend `jest` (unit) | ✅ 138/138 (inalterado) |
| Backend `jest --config test/jest-e2e.json` (e2e, todos os 10 arquivos) | ✅ 135/135 (+7 novos) |
| Backend `npm run build` | ✅ sucesso |
| Frontend `tsc --noEmit` | ✅ limpo |
| Frontend `eslint` (arquivos novos) | ✅ limpo |
| Frontend `vitest run` (suíte completa) | ✅ 762/762 (+2 novos) |
| Frontend `npm run build` | ✅ sucesso (RM-23: 0 inconsistências; RM-24: 0 conflitos críticos) |
| Isolamento entre testes | ✅ `FakeDb` recriado em `beforeEach` (backend); nenhuma variável de módulo compartilhada entre `it()`s (frontend) |
| Independência de ordem de execução | ✅ cada teste semeia seus próprios usuários/consultas com e-mails/chaves únicos — nenhum depende de estado deixado por outro |
| Nenhuma dependência do banco de desenvolvimento | ✅ `FakeDb` é 100% em memória, por processo de teste — nunca toca `DATABASE_URL` real |

---

## 7. Limitações (declaradas, não escondidas)

1. **Sem PostgreSQL real neste ambiente** — a suíte backend prova o comportamento de TODA a camada HTTP/aplicação real, mas a persistência é um fake em memória fiel ao contrato usado (idempotência, ownership, ordenação), não o banco real. Idêntico ao padrão já aceito nos e2e-specs pré-existentes do projeto.
2. **Sem navegador real neste ambiente** — nenhum clique real, nenhuma verificação de reload real de página. O Cenário 6 (logout durante requisição) foi provado com `fetch()` real, mas dentro do processo Node do Vitest, não dentro de um Chrome/Firefox real.
3. **Cenário 4 (reload real preservando consulta pendente)** não pôde ser verificado num navegador real por essa mesma limitação — a persistência em si (via `localStorage` real do jsdom) já é testada em RM-45; a integração completa com um reload de página real fica como lacuna explícita, não uma afirmação de que "funciona" sem prova.
4. **Concorrência real de múltiplas conexões de banco** (ex.: duas requisições HTTP verdadeiramente simultâneas escrevendo no MESMO Postgres) não é exercitada — o fake em memória é single-threaded por natureza do Node, então uma corrida de escrita real só pode ser validada contra um Postgres de verdade.

---

## 8. Prontidão

Com os 7 cenários provados (6 de ponta a ponta com HTTP/fetch real; 1 — persistência pendente pós-reload real de navegador — com uma lacuna explícita e não fabricada), e nenhuma falha de produto encontrada (apenas bugs da própria suíte, corrigidos), a conclusão é:

**APTO**, condicionado a duas ressalvas registradas (não bloqueadoras do estado atual, mas relevantes para qualquer decisão de investimento em infraestrutura de teste futura):
- Antes de uma expansão que dependa de garantias reais de concorrência de banco (ex.: alto volume de escrita simultânea), validar contra um PostgreSQL real (mesmo que via CI, já que este ambiente de desenvolvimento não suporta).
- Antes de depender de comportamento de reload de navegador real como uma garantia testada (não apenas assumida), investir em uma ferramenta de automação de navegador que funcione neste conjunto de ambientes (o `next dev` local deste sandbox está com uma limitação pré-existente que impede isso hoje).

---

## 9. Arquivos criados

- `backend/test/support/fake-prisma.ts` — fake de persistência realista (novo).
- `backend/test/e2e-clinical-persistence.e2e-spec.ts` — 7 testes E2E de backend (novo).
- `frontend/src/tests/e2e-logout-race-rm47.test.ts` — 2 testes E2E de frontend com fetch real (novo).
- `docs/RM-47-E2E-PERSISTENCE-REPORT.md` — este documento.

---

*RM-47 concluída. Nenhuma expansão clínica foi iniciada.*
