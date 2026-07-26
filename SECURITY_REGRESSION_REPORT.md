# SECURITY_REGRESSION_REPORT

**Gerado:** 2026-07-26 · **Objetivo:** transformar os requisitos de segurança do Prescreve-AI em testes automatizados de regressão, com evidência de comportamento real (nunca "a função existe").

## Resultado consolidado

| Suíte | Arquivos | Testes | Resultado |
|---|---|---|---|
| Backend — unit (Jest) | 11 | 115 | ✅ 115/115 |
| Backend — e2e (Jest + supertest, HTTP real) | 9 | 87 | ✅ 87/87 |
| Frontend (Vitest) | 16 | 410 | ✅ 410/410 |
| **Total** | **36** | **612** | **✅ 612/612** |

Gates adicionais executados: `tsc --noEmit` (limpo), `eslint --fix` (limpo), `npm run build` (sucesso), verificação de carregamento do bundle compilado via `node -e "require('./dist/src/app.module.js')"` com os 4 secrets obrigatórios definidos (sucesso).

Trabalho novo neste ciclo:
- `backend/test/auth-flows.e2e-spec.ts` (novo, 11 testes) — fecha a lacuna de ciclo de vida de refresh token/logout/rate limiting de MFA e refresh via HTTP real.
- `backend/src/config/environment.util.spec.ts` (novo, 17 testes) — fecha a lacuna de teste direto do fail-safe de ambiente de produção.
- `backend/src/auth/auth.service.ts` — correção de um bug real de produção encontrado ao escrever o teste de rotação de refresh token (ver seção "Bug encontrado").

---

## 1. AUTENTICAÇÃO

| Requisito | Teste(s) | Evidência de comportamento real |
|---|---|---|
| login válido | `auth-flows.e2e-spec.ts` › "credenciais válidas → 200 com access_token e refresh_token reais"; `mfa.e2e-spec.ts` › "MFA desativado + login válido → sucesso" | HTTP real, decodifica o JWT retornado e valida claims |
| senha inválida | `auth-flows.e2e-spec.ts` › "senha incorreta → 401, nenhum token emitido" | Verifica 401 E ausência de qualquer token no corpo |
| MFA inválido | `mfa.e2e-spec.ts` › "MFA ativo + código inválido → falha (401)"; "MFA ativo + código ausente → falha (401)" | Envia TOTP real gerado incorretamente, confirma rejeição criptográfica (não checagem de presença) |
| MFA válido | `mfa.e2e-spec.ts` › "MFA ativo + código válido → sucesso (200, com tokens)" | Gera TOTP real (RFC 6238) com a lib `otplib`, confirma aceitação |
| refresh | `auth-flows.e2e-spec.ts` › "refresh válido → 200 com NOVO par de tokens; o token antigo passa a ser inválido (rotação real)" | 3 chamadas HTTP sequenciais: login → refresh → reuso do token antigo, confirma rotação genuína (não apenas reemissão) |
| logout | `auth-flows.e2e-spec.ts` › "logout revoga a sessão — o refresh_token emitido no login deixa de funcionar depois"; "logout sem autenticação → 401" | Login → logout → tenta refresh com o token emitido antes do logout → 401 |
| token revogado | `auth-flows.e2e-spec.ts` › "REUSO de um refresh token já rotacionado (apresentado 2x) → 401 na segunda vez" | Prova a detecção de reuso (sinal de token roubado), não apenas "token não existe" |
| token expirado | `auth-flows.e2e-spec.ts` › "refresh token EXPIRADO → 401, mesmo sem ter sido usado ainda" | Registro com `expira_em` no passado, nunca usado — confirma checagem de expiração é independente da checagem de uso |

## 2. AUTORIZAÇÃO

| Requisito | Teste(s) |
|---|---|
| usuário A acessando recurso de B | `ownership-authorization.e2e-spec.ts` › consulta/diagnóstico/prescrição/risco — "A NÃO consegue ler/criar/gravar ... de B" (4 recursos × leitura+escrita) |
| usuário comum tentando ADMIN | `authorization.e2e-spec.ts` › "(c) ... MEDICO autenticado recebe 403 ao tentar criar um usuário ADMIN via fluxo administrativo" |
| alteração de role | `authorization.e2e-spec.ts` › "(b) POST /auth/register com perfil=ADMIN ... é REJEITADO (400)"; "... com role=ADMIN (nome alternativo) ... REJEITADO (400)" |
| endpoint administrativo | `authorization.e2e-spec.ts` › "(c)/(d)" — MEDICO 403, ADMIN 201 em `/auth/admin/usuarios`, sem Authorization → 401 |
| ownership de consulta | `ownership-authorization.e2e-spec.ts` › `GET /api/consulta/:id` (3 testes: dono lê, não-dono 404, inexistente 404 idêntico, ADMIN também 404) |
| ownership de prescrição | `ownership-authorization.e2e-spec.ts` › `POST /api/prescricao` (3 testes: dono cria, não-dono 403, ADMIN também 403) |
| ownership de RiskScore | `ownership-authorization.e2e-spec.ts` › `POST /api/risco` (3 testes: dono grava, não-dono 403, ADMIN também 403) |

Cobertura extra já existente (não pedida explicitamente, mas relevante): JWT forjado/secret errado (401), token estilo demo do frontend nunca aceito no backend (401), ADMIN não é bypass geral de ownership.

## 3. RATE LIMITING

| Requisito | Teste(s) | Evidência de comportamento real |
|---|---|---|
| login | `hardening.e2e-spec.ts` › "POST /auth/login tem limite próprio de 10/min — a 11ª requisição recebe 429" | 11 requisições HTTP sequenciais reais contra `ThrottlerGuard` real (não mockado) |
| MFA | `auth-flows.e2e-spec.ts` › "POST /auth/mfa/setup tem limite próprio de 5/min — a 6ª requisição recebe 429" | 6 requisições autenticadas reais |
| refresh | `auth-flows.e2e-spec.ts` › "POST /auth/refresh tem limite próprio de 10/min — a 11ª requisição recebe 429" | 11 requisições reais |
| endpoints gerais | `auth-flows.e2e-spec.ts` › "endpoints SEM @Throttle específico herdam o limite GLOBAL — a (limite+1)-ésima requisição recebe 429" | `ThrottlerModule` configurado com limite=5 só para este teste, prova herança do default global via `GET /api/consultas` |

Nota de estabilidade: os 3 testes de rate limiting fazem 6–12 requisições HTTP sequenciais reais e usam o timeout padrão do Jest (5s). Sob execução paralela com outras suítes pesadas, "POST /auth/login ... 429" pode estourar esse timeout por contenção de CPU (observado uma vez nesta rodada) — o teste passa de forma consistente quando executado isolado ou com `--runInBand`. Não é uma falha de comportamento de segurança, é sensibilidade de timing do ambiente de CI local; considerar subir o timeout desse describe block se voltar a ocorrer.

## 4. VALIDAÇÃO

Todos cobertos por `input-validation.e2e-spec.ts` (23 testes), com asserção de 400 real vindo do `ValidationPipe` (whitelist + forbidNonWhitelisted):

| Requisito | Teste(s) |
|---|---|
| payload inválido | "sem 'descricao'/'medicamentos'/'score' (obrigatório) é rejeitado (400)" (×3) |
| campos desconhecidos | "com campo extra não declarado no DTO é rejeitado (400)" (×2, incluindo campo aninhado dentro de array) |
| payload excessivo | "string acima do limite" (×2), "array acima do limite" (×2) |
| enum inválido | "risco_global fora do enum NivelRisco é rejeitado (400 — nunca chega ao INSERT do Prisma)" |
| tipos incorretos | "confianca como string em vez de número" / "medicamentos como objeto em vez de array" / "score_global como string" (×3) |

Extra: número fora de intervalo (score negativo/>100, confiança fora de [0,1]), paginação (limite acima do teto, "pagina" não numérico — regressão de um bug real onde um valor não numérico virava `NaN` e seguia sem checagem para o Prisma).

## 5. PERSISTÊNCIA

| Requisito | Teste(s) |
|---|---|
| backend indisponível | `frontend/src/tests/sync-engine.test.ts` — mock rejeita com `ApiErrorFake(503, 'indisponível')`, motor de sync trata como retryable |
| timeout | `sync-engine.test.ts` › "408 (timeout do servidor) e 429 (rate limit) são retryable"; "syncResource() ... orquestração completa (status + retry + timeout)" com `timeoutMs` real e `vi.advanceTimersByTimeAsync` |
| retry | `sync-engine.test.ts` (retry automático com backoff); `persistence-integrity.e2e-spec.ts` › "recuperação posterior: falha simulada na 1ª tentativa seguida de retry com a MESMA chave" |
| idempotência | `persistence-integrity.e2e-spec.ts` › "reenviar a MESMA prescrição (mesma idempotency_key) 3x cria APENAS 1 registro"; "chaves DIFERENTES criam registros diferentes" |
| falha de sincronização | `sync-engine.test.ts` › "FALHA PARCIAL: duas chamadas independentes têm estados independentes — uma sincroniza, outra falha"; "RECUPERAÇÃO POSTERIOR: uma sincronização que falhou pode ser retentada manualmente mais tarde" |

Nota de escopo: os cenários de rede (indisponibilidade/timeout/retry) são testados no motor de sincronização do **frontend** (`sync-engine.ts`, camada que efetivamente lida com rede instável contra o backend). A idempotência no **backend** (garantia de não duplicar no banco) é testada separadamente em `persistence-integrity.e2e-spec.ts`. As duas camadas juntas cobrem o requisito ponta a ponta.

## 6. CONFIGURAÇÃO

| Requisito | Teste(s) |
|---|---|
| secrets ausentes | `hardening.e2e-spec.ts` › "Test.createTestingModule(...).compile() REJEITA quando JWT_SECRET está ausente"; `jwt-secrets.util.spec.ts`, `identifier-hash.util.spec.ts` (IDENTIFIER_HMAC_KEY), `mfa.service.spec.ts` (MFA_ENCRYPTION_KEY) — todos os 4 secrets obrigatórios têm teste de "lança ao construir sem o secret" |
| CORS inválido | `hardening.e2e-spec.ts` › "origem NÃO AUTORIZADA ... NÃO recebe o header — bloqueada"; `cors.util.spec.ts` (9 testes: allowlist por ambiente, sem wildcard/regex, staging fail-closed sem config) |
| ambiente de produção | **NOVO** `environment.util.spec.ts` (17 testes) — `resolveAppEnv()` testado diretamente: produção/staging/development explícitos, fallback APP_ENV→NODE_ENV→'development', valor desconhecido/typo/vazio → SEMPRE 'production' (nunca 'development'), normalização de espaço/maiúscula. Complementa `frontend/src/tests/app-mode.test.ts` (mesma lógica no lado do cliente, incluindo a matriz completa de decisão do modo demo) |

## 7. PRIVACIDADE

Todos cobertos por `privacy-audit.e2e-spec.ts` (7 testes) com HTTP real e spy em `Logger.prototype.log/error/warn`:

| Requisito | Teste(s) |
|---|---|
| dados sensíveis não aparecem em logs | "POST /auth/register com senha e CRM reais: nenhuma linha de log contém a senha nem o CRM"; "login com senha errada: log de auditoria de falha não vaza a senha tentada"; "POST /api/consulta com CPF real: nenhuma linha de log contém o CPF"; "log HTTP real contém método/rota/status mas nunca o corpo da requisição" |
| respostas não expõem secrets | "POST /auth/register nunca retorna senha_hash"; "... nunca retorna crm_hash"; `mfa.e2e-spec.ts` › "segredo MFA nunca é exposto na resposta de login"; "/auth/mfa/setup retorna otpauth_url/secret_base32, nunca o valor criptografado armazenado" |
| dados de outro usuário não são retornados | Coberto de forma cruzada pela seção AUTORIZAÇÃO/ownership acima (A nunca recebe payload de B, nem em 403/404) |
| formato exato da resposta | "a resposta de registro contém APENAS os campos de token esperados — nenhum campo extra do Usuario" |

---

## Bug real encontrado durante a escrita dos testes

Ao escrever o teste de rotação de refresh token (`auth-flows.e2e-spec.ts`), o teste falhou de um jeito inesperado: o `refresh_token` retornado por `POST /auth/refresh` era **idêntico** ao token original, e o teste de detecção de reuso também falhava (esperava 401, recebia 200).

**Causa raiz:** `gerarTokens()` em `auth.service.ts` assinava o JWT com payload `{sub, email, perfil}`. O claim `iat` (issued-at) de um JWT tem granularidade de **segundos**. Dois tokens emitidos para o **mesmo usuário** dentro do **mesmo segundo** (ex.: duplo clique, retry automático do cliente, ou — como aqui — duas chamadas HTTP sequenciais em um teste rápido) produzem `iat`/`exp`/assinatura idênticos, logo o JWT inteiro é byte-a-byte idêntico. Como `RefreshToken.token_hash` é `@unique` no schema Prisma, isso é um risco real de produção: um segundo `create()` com o mesmo hash pode colidir com uma constraint de unicidade, ou — pior, como visto no teste — mascarar silenciosamente a rotação (o "novo" token é o mesmo que o antigo).

**Correção:** adicionado um claim `jti` (`crypto.randomUUID()`) ao payload em `backend/src/auth/auth.service.ts:259-268`, garantindo que cada token emitido é sempre único, mesmo no mesmo segundo, para o mesmo usuário. Comentário explicativo deixado no código. Reverificado: todos os 11 testes de `auth-flows.e2e-spec.ts` passam após a correção, incluindo o de reuso.

Este é exatamente o tipo de achado que o requisito "os testes devem demonstrar comportamento real" busca — um teste de existência de função (`expect(typeof refresh).toBe('function')`) jamais capturaria isso.

---

## Áreas SEM cobertura de teste automatizado (gaps honestos)

- **Rate limiting sob carga concorrente real** (múltiplas requisições verdadeiramente paralelas, não sequenciais) — os testes atuais fazem requisições HTTP sequenciais via `supertest`; não há teste de condição de corrida no `ThrottlerGuard` com requisições disparadas em paralelo.
- **Expiração de access_token em uso** (não apenas refresh_token) — não há teste e2e que gere um access_token, aguarde/simule sua expiração (15 min) e confirme que um endpoint protegido rejeita com 401. A expiração de refresh_token está coberta; a de access_token não.
- **CSRF** — não avaliado nesta rodada; a API é stateless (Bearer token, sem cookies de sessão), o que reduz a superfície, mas isso não foi verificado explicitamente com um teste.
- **Recuperação de senha ("esqueci minha senha")** — funcionalidade não existe no backend atual (confirmado em auditoria anterior desta sessão); não há o que testar.
- **Papel AUDITOR em fluxos de leitura/relatório** — o perfil existe no schema e é testado no fluxo de criação administrativa, mas não há endpoints de leitura/relatório específicos para AUDITOR ainda implementados para testar.
- **Timeout real de rede contra o backend em produção** (fora do mock do `sync-engine.test.ts`) — o teste de timeout usa timers falsos (`vi.useFakeTimers`), não uma conexão TCP real interrompida.

## Arquivos alterados/criados nesta rodada

- `backend/src/auth/auth.service.ts` — fix do bug de colisão de `jti` (linhas 259-268)
- `backend/test/auth-flows.e2e-spec.ts` (novo) — 11 testes
- `backend/src/config/environment.util.spec.ts` (novo) — 17 testes

Nenhuma migração de schema Prisma foi necessária (o fix de `jti` é só no payload do JWT, não em um campo de banco).
