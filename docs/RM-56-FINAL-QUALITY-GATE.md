# RM-56 — Zero Open Items (Gate Final Absoluto)

**Papel:** Arquiteto-Chefe e Auditor Principal. Nenhum número de RM-41 a
RM-55 foi aceito sem revalidação nesta sessão. Todo gate foi reexecutado
do zero após cada correção, com evidência de exit code, não apenas
inspeção visual de configuração.

## 1. Escopo

Encerrar as pendências ainda abertas identificadas no RM-55
(RM-55-01 a RM-55-05): ativar de fato o gate de cobertura, remover
documentação-como-código morta e desatualizada, padronizar scripts de
lint (check vs. fix), investigar os open handles do e2e backend, e
limpar o repositório. Nenhuma expansão clínica foi iniciada; nenhum
motor farmacológico, protocolo, dose ou contraindicação foi alterado.

## 2. Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| `frontend/vitest.config.ts` | Nenhuma mudança permanente — usado apenas para um teste reversível de prova (ver seção 4) |
| `frontend/package.json` | Adicionado script `lint:fix` (o `lint` já era check-only) |
| `backend/package.json` | `lint` deixou de rodar `--fix` (novo script `lint:fix` criado para isso); adicionado bloco `jest.coverageThreshold` com metas reais para 8 módulos de segurança/persistência |
| `.github/workflows/ci.yml` | Os steps de teste de frontend e backend agora rodam `npm run test:coverage`/`npm run test:cov` (antes rodavam sem cobertura) |
| `frontend/eslint.config.mjs` | Removidas 2 entradas obsoletas do `RM06_ALLOWLIST` apontando para arquivos que não existem mais em `src/` |
| `frontend/src/lib/pharma-database.ts` | Corrigido 1 comentário que citava um módulo (`drug-resolver`) já arquivado |
| `backend/.gitignore` | **Novo arquivo** — `backend/` não tinha `.gitignore` próprio; `dist/`/`coverage/`/`node_modules/` nunca deveriam ter sido versionados |
| `docs/archive/legacy-lib-modules/*.ts` | **10 arquivos movidos** de `frontend/src/lib/` para fora da árvore compilável (ver seção 3) |
| `backend/dist/**` | Destaged do índice do git (`git rm --cached`) — os arquivos continuam em disco, só deixaram de ser versionados |

Nenhum arquivo de motor clínico (`safety-rules.ts`, `dose-calculator.ts`,
`dosing-engine.ts`, `pediatric-engine.ts`, `icu-engine.ts`,
`clinical-risk-engine.ts`, `pharma-core/**`) foi alterado nesta rodada.

## 3. Correções Realizadas

### RM-56.1 — Gate real de cobertura (era RM-55-01, agora fechado)

- **Frontend:** os thresholds por-arquivo já existiam em
  `vitest.config.ts` (RM-52/RM-54), mas nenhum comando de CI passava
  `--coverage`. `ci.yml` agora roda `npm run test:coverage` no lugar de
  `npm test`.
- **Backend:** não existia **nenhum** `coverageThreshold` no Jest do
  backend — pior do que o frontend. Adicionado um bloco cobrindo os 8
  arquivos mais sensíveis a segurança/ownership:
  `auth/jwt-secrets.util.ts`, `common/crypto/identifier-hash.util.ts`,
  `auth/auth.service.ts`, `auth/mfa.service.ts`,
  `auth/mfa-crypto.util.ts`, `config/cors.util.ts`,
  `config/environment.util.ts`, `modules/consulta/consulta.service.ts`
  (o arquivo com a lógica de ownership/IDOR). `ci.yml` agora roda
  `npm run test:cov` no lugar de `npm test`.
- Todos os valores de threshold são **o piso real medido nesta sessão**,
  não metas aspiracionais — nenhuma cobertura foi reduzida para caber em
  uma meta; a meta é que se ajusta ao que já está coberto, igual ao
  padrão já usado no frontend desde a RM-52.

### RM-56.2 — Documentação morta (era RM-55-02, agora fechado)

Um script de varredura de grafo de imports (escrito nesta sessão)
identificou **10 arquivos** em `frontend/src/lib/` com **zero**
referência de import em todo o repositório — nem de app, nem de
componente, nem de script `package.json`, nem de teste:

- `final-report-etapa14.ts`, `final-report-etapa22-6e.ts`,
  `final-report-etapa22-6e-v3.ts` (já identificados no RM-55, com
  conteúdo comprovadamente desatualizado/falso)
- `clinical-simulation-etapa8.ts`, `clinical-stress-etapa9.ts`,
  `explainable-ai-test-etapa12.ts`, `integrity-test-etapa10.ts`,
  `interoperability-test-etapa11.ts`, `performance-audit-etapa13.ts`
  (**achado novo** — módulos que só exportam funções `executar*`/
  `gerarRelatorio*`/`sanityCheck*` nunca chamadas por nada; diferentes
  dos seus "irmãos" `stress-test-phase22-4.ts`/`validate-integrity-22-5.ts`,
  que **não** foram movidos por terminarem em `main().catch(...)` —
  scripts autoexecutáveis legítimos, já reconhecidos como tal no
  `RM06_ALLOWLIST` do `eslint.config.mjs`)
- `drug-resolver.ts` (**achado novo** — ficou 100% órfão como efeito
  colateral da própria limpeza de lint da sessão RM-54, que removeu seu
  último import restante em `prescricao-rapida/page.tsx`)

Todos os 10 foram movidos (`git mv`, preservando histórico) para
`docs/archive/legacy-lib-modules/`, fora de `src/`, fora do escopo de
`tsc`/`eslint`/`vitest`. Confirmado por reexecução completa de
typecheck/lint/testes/build (seção 5) que a remoção não quebrou nada —
consistente com serem, de fato, código morto.

### RM-56.3 — Padronização de scripts (novo, não estava no RM-55)

- `backend/package.json`: `"lint"` não roda mais `--fix` (script novo
  `"lint:fix"` criado para isso). O frontend já era check-only
  (`"lint": "eslint"`); ganhou `"lint:fix": "eslint --fix"` para simetria.
- `ci.yml` já usava a invocação sem `--fix` diretamente (RM-55-03), então
  não havia inconsistência real de comportamento — mas agora o script
  `npm run lint` local também é check-only, eliminando o risco descrito
  no RM-55-03 (mutação silenciosa de arquivos ao rodar "lint" localmente).

### RM-56.4 — Open handles (era RM-55-04)

Investigado com `--detectOpenHandles` e `--runInBand`, isolado e
combinado, contra um servidor Postgres real novo (`prisma dev`), fora do
wrapper script (`scripts/test-e2e-postgres-local.mjs`), para eliminar
qualquer interferência do próprio wrapper:

1. `npx jest --config ./test/jest-e2e.json --detectOpenHandles --runInBand` → **143/143 passam, exit 0, nenhum handle reportado, nenhuma mensagem de "failed to exit gracefully".**
2. `npx jest --config ./test/jest-e2e.json --detectOpenHandles` (paralelo, sem `--runInBand`) → **143/143 passam, exit 0, nenhum handle reportado, nenhuma mensagem de aviso.**

**Conclusão honesta:** a mensagem "A worker process has failed to exit
gracefully" observada em 2 execuções anteriores (RM-54 e RM-55) **não
foi reproduzida** nestas 2 novas execuções instrumentadas, mesmo com o
mesmo comando (`npm run test:e2e:postgres:local`) rodado uma terceira vez
nesta sessão sem instrumentação (ver seção 5 — apareceu de novo lá).
Foram descartadas como causa: nenhum timer/interval em código de
aplicação (`grep` de `setInterval`/`setTimeout` em `src/` retornou zero
resultados fora de testes); `CacheService` implementa `OnModuleDestroy` e
fecha o cliente Redis corretamente quando existe; `@nestjs/throttler`
v6.5.0 não usa `setInterval` em sua implementação atual (verificado no
código-fonte do pacote). **Não foi possível identificar "quem abriu/quem
não fechou"** porque a instrumentação do próprio Jest não encontra nada
para reportar quando ativada — a evidência disponível não sustenta a
existência de um vazamento de recurso determinístico no código da
aplicação. Isto é reportado como **INFORMATIVO**, não como "corrigido":
não há causa raiz identificável no código para corrigir, e seria
fabricação afirmar uma correção para um problema cuja instrumentação não
consegue localizar.

### RM-56.5 — Limpeza do repositório

- **`backend/dist/` (121 arquivos) estava versionado no git** — artefato
  de build sendo tratado como código-fonte. Criado `backend/.gitignore`
  (não existia nenhum) e executado `git rm -r --cached backend/dist`
  (arquivos continuam em disco; apenas deixaram de ser rastreados; nada
  foi commitado — ver seção 9 sobre por que não commitei).
- **Worktree `.claude/worktrees/laughing-herschel-4c4577/` — NÃO
  removido.** O RM-55 (achado RM-55-05) o classificou como "artefato de
  ferramenta de agente", sugerindo remoção segura. Investigação mais
  profunda nesta sessão (`git status` dentro do worktree) mostrou que
  ele contém **alterações não commitadas reais** (`clinical-decision-support.ts`,
  `clinical-risk-engine.ts`, `icu-engine.ts` modificados + um teste novo
  `missing-vital-masking.test.ts` nunca visto neste working tree
  principal). Isto **não é lixo órfão** — é trabalho em andamento de
  outra sessão/branch (`claude/laughing-herschel-4c4577`) que seria
  destruído por uma remoção automática. Corrijo aqui a classificação do
  RM-55: **não removi, e recomendo que nenhuma automação remova.**
- Nenhum log, snapshot antigo, ou pasta temporária foi encontrado no
  restante do repositório (`find` direcionado por extensão/nome, fora de
  `node_modules`).

## 4. Evidências (o mecanismo de cobertura é real, não apenas configuração)

Testado de forma reversível: um threshold foi temporariamente elevado
acima do valor real medido, o comando foi executado, o resultado foi
capturado, e a mudança foi revertida e comparada byte-a-byte com o
backup antes de prosseguir.

| Teste | Comando | Resultado |
|---|---|---|
| Frontend — threshold elevado artificialmente (`safety-rules.ts` statements 88→99) | `npm run test:coverage` | **exit 1** — `ERROR: Coverage for statements (96.15%) does not meet "src/lib/safety-rules.ts" threshold (99%)` |
| Frontend — revertido | `diff` contra backup | Idêntico, confirmado |
| Backend — threshold elevado artificialmente (`environment.util.ts` branches 85→99) | `npm run test:cov` | **exit 1** — `Jest: Coverage for branches (87.5%) does not meet ".../environment.util.ts" threshold (99%)` |
| Backend — revertido | `diff` contra backup | Idêntico, confirmado |

Isto prova que o mecanismo bloqueia de fato quando a cobertura cai abaixo
da meta — não é uma configuração inerte.

## 5. Gates Executados (após todas as correções, do zero)

| Gate | Resultado |
|---|---|
| Frontend Typecheck | ✅ 0 erros |
| Frontend Lint | ✅ 0 erros / 0 warnings |
| Frontend Coverage (`npm run test:coverage`) | ✅ exit 0 — thresholds por-arquivo cumpridos |
| Frontend Vitest | ✅ 916/916, 48/48 arquivos |
| Frontend Build (+ RM-23/24/49) | ✅ compilado, 50 páginas |
| RM-23 | ✅ 367 entidades, 0 inconsistências |
| RM-24 | ✅ divergentes=0, aceitos=14, críticos=0 |
| RM-49 | ✅ 256 arquivos verificados (era 266 — os 10 arquivos arquivados saíram de `src/`), 0 sequências suspeitas |
| Backend Typecheck | ✅ 0 erros |
| Backend Lint (agora sem `--fix`) | ✅ 0 erros |
| Backend Coverage (`npm run test:cov`) | ✅ exit 0 — thresholds cumpridos (novo gate) |
| Backend Jest unitário | ✅ 146/146, 15/15 suítes |
| Backend E2E contra Postgres real (`prisma dev`, servidor novo) | ✅ 143/143, 11/11 suítes — **mensagem "failed to exit gracefully" reapareceu nesta execução específica** (ver seção 9) |
| Backend Build | ✅ compilado |

Nenhuma regressão farmacológica, clínica ou de segurança: todos os 1.205
testes (916+146+143) continuam verdes; a lógica de ownership em
`consulta.service.ts`, o cascade/restrict do Prisma, e a validação de
`JWT_SECRET` não foram tocados.

## 6. Cobertura Real Executada

- Frontend: `Statements 25,63% | Branches 26,46% | Functions 19,06% | Lines 27,59%` (global, `v8`). O aumento em relação ao número reportado no RM-54/RM-55 (~20%) é explicado inteiramente pela remoção dos 10 arquivos órfãos do denominador — nenhuma linha nova foi testada, o denominador é que ficou mais honesto.
- Os thresholds por-arquivo (a parte que realmente importa para um
  sistema clínico) **passam** para todos os 7 motores frontend e os 8
  módulos backend cobertos — confirmado por exit code 0 em ambos os
  comandos.

## 7. Open Handles Encontrados

Ver seção 3 (RM-56.4) para a investigação completa. Resumo: **nenhum
handle foi encontrado quando instrumentado** (`--detectOpenHandles`, com
e sem `--runInBand`). A mensagem de aviso reapareceu de forma
intermitente na execução via wrapper script sem instrumentação (seção 5)
— classificado como **INFORMATIVO**, não determinístico, sem causa raiz
localizável nesta sessão. Nenhum `forceExit` foi adicionado para
silenciar o sintoma (proibido pelo próprio RM-56.4).

## 8. Limpeza do Repositório

Ver seção 3 (RM-56.5). Resumo: `backend/dist/` destaged do git +
`.gitignore` criado; worktree órfão investigado e **preservado**
(continha trabalho não commitado real). Nenhum log, cache ou snapshot
adicional encontrado para remover.

## 9. Achados Remanescentes

### RM-56-01 — CRÍTICO — O repositório inteiro está, em sua maioria, fora do controle de versão

- **Evidência:** `git status --short` no diretório raiz retorna **312
  entradas** (arquivos modificados, novos ou removidos em relação ao
  último commit). `git log -1` mostra o último commit em
  `2026-07-26 19:51:02`. A pasta `.github/` inteira — incluindo
  `.github/workflows/ci.yml`, o próprio pipeline que RM-49 a RM-56
  citam repetidamente como "o gate bloqueante real" — está listada como
  `??` (nunca adicionada ao git, em nenhum commit, em nenhum branch:
  `git log --all -- .github/workflows/ci.yml` não retorna nenhum
  resultado).
- **Impacto:** toda alegação de RM-49 até este RM-56 sobre "CI real",
  "pipeline bloqueante", "branch protection" descreve um arquivo que
  **nunca existiu do ponto de vista do controle de versão** — ele só
  existe no diretório de trabalho local desta sessão. Se este repositório
  fosse clonado do remoto agora, **não haveria CI nenhum**. Isso não é um
  problema teórico: a maior parte do código-fonte da aplicação
  (motores clínicos, testes, o próprio `.github/workflows/ci.yml`, os
  relatórios RM-4x/RM-5x) também está nesta mesma situação — 119 arquivos
  modificados e 62 novos nunca foram commitados. O trabalho de todas as
  auditorias anteriores (incluindo a fixação de gates que só entrega
  valor real se rodar no CI de um repositório remoto compartilhado) só
  "existe" localmente até que alguém commite e faça push.
- **Por que não corrigi isto diretamente:** commitar (e principalmente
  fazer *push*) é uma ação que as minhas instruções operacionais tratam
  como exigindo autorização explícita do usuário a cada vez — e commitar
  312 entradas de uma vez é uma ação de escala e impacto altos demais
  para presumir consentimento a partir de um comando de auditoria. Reporto
  isto como o achado mais importante desta rodada, mas a ação corretiva
  (revisar o diff e commitar/push) é uma decisão do usuário, não minha.
- **Classificação: CRÍTICO.** Isoladamente, este achado impede o
  veredito 🟢 pela regra absoluta desta auditoria.

### RM-56-02 — BAIXO — Endpoint de sync (`/api/sync/eurofarma`) tem checagem de autorização que verifica apenas presença do header, não validade

- **Arquivo:** `frontend/src/app/api/sync/eurofarma/route.ts:25-30`
- **Evidência:** `if (!authHeader && process.env.NODE_ENV === 'production')` só rejeita a requisição quando o header `Authorization` está **totalmente ausente** e o ambiente é produção; qualquer valor não-vazio (ex.: `Authorization: x`) passa, e fora de produção a checagem é pulada inteiramente. O comentário adjacente ("Validação básica de autorização") sugere mais proteção do que existe.
- **Impacto real:** nulo — o `POST` deste endpoint nunca lê nem escreve dado clínico real; a resposta é sempre uma simulação estática e o próprio payload de retorno já declara `"nota": "Sync simulado — integração real requer backend com acesso ao portal Eurofarma"`. Não há dado de paciente, prescrição ou credencial em risco.
- **Classificação: BAIXO** — código-morto-funcional com comentário que superestima a proteção existente, não uma vulnerabilidade explorável com consequência real.

### RM-56-03 — INFORMATIVO — Cobertura global do frontend permanece baixa fora dos módulos com threshold explícito

- Muitos arquivos de página (`src/app/**`) e motores de demonstração têm
  0% de cobertura de linha — esperado, já que o threshold do RM-25/RM-52
  foi desenhado deliberadamente para proteger só a camada de decisão
  clínica canônica, não o app inteiro. Não é um risco novo; é uma
  decisão de escopo já documentada, citada aqui apenas para registro
  completo da matriz de cobertura.

## 10. Regressões

Nenhuma regressão de comportamento clínico, farmacológico ou de
segurança foi encontrada. 1.205/1.205 testes automatizados passam
(916 frontend + 146 unitários backend + 143 e2e contra Postgres real,
em execução nova desta sessão). Nenhum motor, protocolo, dose,
contraindicação ou algoritmo de risco foi alterado.

## 11. Matriz Final

| Severidade | Contagem | Itens |
|---|---|---|
| CRÍTICO | 1 | RM-56-01 (repositório majoritariamente fora do controle de versão, incluindo o próprio CI) |
| ALTO | 0 | — |
| MÉDIO | 0 | — |
| BAIXO | 1 | RM-56-02 (auth stub do endpoint de sync eurofarma) |
| INFORMATIVO | 2 | RM-56.4 (open handle intermitente, sem causa raiz localizável); RM-56-03 (cobertura global baixa fora do escopo protegido, decisão já documentada) |

## 12. Pontuação

| Dimensão | Nota | Justificativa |
|---|---|---|
| Arquitetura | 9 | Sem mudança estrutural nova; padrões consistentes |
| Frontend | 9 | 0 erros, 0 warnings, coverage gate agora real |
| Backend | 9 | 0 erros, coverage gate novo cobrindo módulos de segurança |
| Farmacologia | 9 | RM-23/RM-24 continuam 0 críticos; nenhum motor alterado |
| Persistência | 9 | E2E real contra Postgres, ownership e cascade/restrict intactos |
| Segurança | 7 | JWT/MFA/ownership sólidos, mas RM-56-02 (baixo, impacto nulo) |
| Performance | 7 | Sem medição de carga real disponível nesta sessão |
| Testes | 9 | Coverage gate real em ambos os projetos; 1.205 testes verdes |
| CI/CD | **2** | O próprio arquivo de CI nunca foi commitado (RM-56-01) — a nota reflete que, do ponto de vista do repositório versionado, não há CI funcionando hoje |
| Governança | 6 | Documentação morta removida/arquivada nesta rodada, mas RM-56-01 é uma falha de governança de repositório muito maior que qualquer achado de documentação |
| Escalabilidade | 8 | Arquitetura suporta crescimento de catálogo; ressalva de CI/versionamento não é um problema de escala, é um problema de existência do pipeline |

**Nota final: 7,6/10** (rebaixada pela CI/CD e Governança, per RM-56-01)

## 13. Veredito Final

> ## 🔴 NÃO LIBERADO

**Justificativa:** todos os gates que rodam localmente nesta sessão são
genuinamente verdes — typecheck, lint, coverage (agora real e
comprovadamente bloqueante), testes unitários e e2e contra Postgres real,
e ambos os builds. Nenhuma regressão farmacológica ou clínica foi
introduzida ou encontrada. Porém, esta rodada encontrou **1 risco
CRÍTICO genuíno e não reportado por nenhuma auditoria anterior**
(RM-56-01): o próprio pipeline de CI que RM-49 a RM-55 tratam como "o
gate bloqueante oficial" nunca foi commitado ao controle de versão, e a
maior parte do restante do código-fonte está na mesma situação. Pela
regra absoluta desta auditoria — qualquer risco crítico, alto, médio ou
baixo aberto impede o veredito 🟢 — e havendo aqui um crítico, o veredito
correto é 🔴, mesmo com todos os números de execução local sendo reais e
positivos.

**Para virar 🟢 na próxima rodada:** o usuário precisa revisar o `git
status` completo (312 entradas) e decidir explicitamente o que commitar
e enviar ao remoto — isto está fora do que esta sessão pode decidir
unilateralmente. Depois disso: resolver RM-56-02 (validação real de
token no endpoint de sync, ou removê-lo se não for necessário) fecha o
único achado BAIXO restante.
