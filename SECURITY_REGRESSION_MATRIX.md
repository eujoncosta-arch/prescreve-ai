# SECURITY_REGRESSION_MATRIX

**Gerado:** 2026-07-26 · Mapeia cada uma das 20 áreas auditadas e cada achado a um teste automatizado que prova o comportamento (real, não existência de função) e falha se a regressão voltar.

## Resultado da suíte completa (referência para todas as linhas abaixo)

| Suíte | Testes | Resultado |
|---|---|---|
| Backend unit (Jest) | 122 | ✅ 122/122 |
| Backend e2e (Jest + supertest, HTTP real) | 91 | ✅ 91/91 |
| Frontend (Vitest) | 418 | ✅ 418/418 |
| **Total** | **631** | **✅ 631/631** |

Gates: `tsc --noEmit` (backend + frontend, limpo) · `eslint --fix` (limpo) · `npm run build` (backend, sucesso) · bundle compilado carrega (`require('./dist/src/app.module.js')`, sucesso).

---

## Matriz área → achado → teste

| # | Área | Achados nesta rodada | Teste(s) que prova(m) o comportamento |
|---|---|---|---|
| 1 | Autenticação | — (login válido/inválido já cobertos por auditorias anteriores) | `test/auth-flows.e2e-spec.ts`, `test/mfa.e2e-spec.ts` |
| 2 | MFA | **MFA-01** 🟠 corrigido | `test/mfa.e2e-spec.ts` → describe "Login com código de recuperação (via HTTP real — regressão MFA-01)" (2 testes) |
| 3 | JWT | **JWT-01** 🟢 corrigido (algoritmo pinado) | Suíte completa de auth (sem regressão); `jwt.strategy.ts`/`auth.service.ts` alterados, 122 unit + 91 e2e continuam verdes |
| 4 | Refresh tokens | — (jti/rotação/reuso já auditados e confirmados corretos nesta rodada) | `test/auth-flows.e2e-spec.ts` (11 testes — rotação, reuso, expiração, logout) |
| 5 | Secrets | **SECRET-01** 🟡 corrigido | `backend/src/modules/audit/audit.service.spec.ts` ("sem IDENTIFIER_HMAC_KEY, o serviço nem chega a ser construído"); `mfa.service.spec.ts` (MFA_ENCRYPTION_KEY já validado no teste existente) |
| 6 | CORS | **CORS-01** 🟢 investigado, comportamento intencional confirmado, sem mudança | `backend/src/config/cors.util.spec.ts`, `backend/src/config/environment.util.spec.ts` |
| 7 | Rate limiting | **NET-01** 🟡 corrigido; **NET-02** 🟡 aberto (documentado) | `test/hardening.e2e-spec.ts` (login 10/min → 429 real); `test/auth-flows.e2e-spec.ts` (MFA 5/min, refresh 10/min, global 60/min → 429 real). NET-01 (trust proxy) não tem teste e2e prático (exigiria proxy real na suíte) — risco residual documentado |
| 8 | RBAC | — (nenhum achado; auditado e confirmado correto) | `test/authorization.e2e-spec.ts` (endpoint administrativo, RolesGuard) |
| 9 | Ownership | **OWN-01** 🟡 corrigido | `test/ownership-authorization.e2e-spec.ts` (2 novos testes: diagnostico_id cruzado → 403; vínculo legítimo → 201) |
| 10 | DTOs | — (nenhum achado; auditado e confirmado correto) | `test/input-validation.e2e-spec.ts` (23 testes) |
| 11 | Prisma | — (nenhum achado; sem `$queryRaw`/`$executeRaw`, sem field leakage) | Cobertura indireta via todos os specs que verificam `select`/respostas de API |
| 12 | Persistência | **PERSIST-01** 🟡 corrigido; **PERSIST-02** 🟡 aberto (documentado) | `backend/src/modules/consulta/consulta.service.spec.ts` (4 novos testes de corrida P2002); `test/persistence-integrity.e2e-spec.ts` (idempotência via HTTP real) |
| 13 | localStorage | **FE-01**/**FE-02** 🟡 abertos (documentados); **FE-03** 🟢 corrigido | `frontend/src/tests/api-client-auth.test.ts` (logout limpa todos os dados do app) |
| 14 | Modo offline | — (confirmado: demo nunca honrado em produção, sem fabricação de sessão) | `frontend/src/tests/app-mode.test.ts`, `api-client-auth.test.ts` |
| 15 | Logs | — (nenhum achado; grep exaustivo confirma ausência de PII/tokens em logs) | `test/privacy-audit.e2e-spec.ts` (7 testes com spy em Logger real) |
| 16 | Privacidade | **PRIV-01** 🟠 corrigido | `backend/src/modules/audit/audit.service.spec.ts` (3 novos testes — HMAC real, fail-fast sem chave, sem IP não hasheia) |
| 17 | Testes E2E | Cobertura consolidada e ampliada nesta rodada | Ver tabela de suítes acima — 631/631 |
| 18 | Frontend/backend integration | — (nenhum achado; Bearer sempre anexado, refresh substitui ambos os tokens, sem `credentials:'include'` indevido) | `frontend/src/tests/api-client-auth.test.ts` |
| 19 | Núcleo farmacológico | **PHARMA-01** 🔴 corrigido | `frontend/src/tests/safety-rules-critical-pairs.test.ts` (3 testes) |
| 20 | Regressão clínica | **PEDIATRIC-01** 🔴 corrigido | `frontend/src/tests/pediatric-dose-fixa.test.ts` (4 testes) |

---

## Achados por severidade (referência cruzada)

| ID | Severidade | Status | Teste de regressão |
|---|---|---|---|
| PHARMA-01 | 🔴 Crítico | ✅ Corrigido | `safety-rules-critical-pairs.test.ts` |
| PEDIATRIC-01 | 🔴 Crítico | ✅ Corrigido | `pediatric-dose-fixa.test.ts` |
| MFA-01 | 🟠 Alto | ✅ Corrigido | `test/mfa.e2e-spec.ts` |
| PRIV-01 | 🟠 Alto | ✅ Corrigido | `audit.service.spec.ts` |
| OWN-01 | 🟡 Médio | ✅ Corrigido | `test/ownership-authorization.e2e-spec.ts` |
| SECRET-01 | 🟡 Médio | ✅ Corrigido | `audit.service.spec.ts`, `mfa.service.spec.ts` |
| NET-01 | 🟡 Médio | ✅ Corrigido | Sem teste automatizado direto (ver nota abaixo) |
| PERSIST-01 | 🟡 Médio | ✅ Corrigido | `consulta.service.spec.ts` |
| JWT-01 | 🟢 Baixo | ✅ Corrigido | Suíte de auth completa (não-regressão) |
| FE-03 | 🟢 Baixo | ✅ Corrigido | `api-client-auth.test.ts` |
| NET-02 | 🟡 Médio | 🟡 Aberto (documentado) | N/A — depende de confirmação de infraestrutura |
| PERSIST-02 | 🟡 Médio | 🟡 Aberto (documentado) | N/A — requer refatoração para `$transaction` |
| FE-01 | 🟡 Médio | 🟡 Aberto (documentado) | N/A — requer migração arquitetural para httpOnly cookies |
| FE-02 | 🟡 Médio | 🟡 Aberto (documentado) | N/A — mitigado parcialmente por FE-03 |
| CORS-01 | 🟢 Baixo | ✅ Investigado — comportamento intencional | `environment.util.spec.ts` (teste já cobre o caso) |
| AUTH-01 | 🟢 Baixo | 🟢 Aceito, sem ação | N/A |

**Nota sobre NET-01:** a correção (`trust proxy`) é uma linha de configuração do Express verificável por inspeção de código, mas provar seu efeito exigiria uma requisição HTTP real atravessando um proxy reverso configurado — infraestrutura que a suíte e2e atual (supertest direto contra a app in-process) não simula. Risco residual de falta de cobertura documentado; não bloqueia o release porque a mudança em si é de baixo risco de regressão (uma linha, comportamento padrão do Express).

## Cobertura por arquivo de teste novo/modificado nesta rodada

- `frontend/src/tests/safety-rules-critical-pairs.test.ts` (novo, 3 testes)
- `frontend/src/tests/pediatric-dose-fixa.test.ts` (novo, 4 testes)
- `frontend/src/tests/api-client-auth.test.ts` (+1 describe, 1 teste)
- `frontend/src/tests/setup.ts` (mock de localStorage corrigido — `key()`/`length` agora implementados, sem o que o teste de FE-03 não seria possível)
- `backend/test/mfa.e2e-spec.ts` (+1 describe, 2 testes)
- `backend/test/ownership-authorization.e2e-spec.ts` (+2 testes, +1 mock `diagnostico.findFirst`)
- `backend/src/modules/audit/audit.service.spec.ts` (novo, 3 testes)
- `backend/src/modules/consulta/consulta.service.spec.ts` (+4 testes)
