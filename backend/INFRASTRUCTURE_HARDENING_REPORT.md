# Relatório de Hardening de Infraestrutura — Backend Prescreve-AI

Data: 2026-07-25
Escopo: JWT/refresh secrets, CORS, rate limiting, refresh tokens, headers de segurança, configuração de ambiente.

## Resumo executivo

Todas as 6 áreas do escopo foram auditadas e corrigidas. A vulnerabilidade mais crítica encontrada foi o CORS aceitar **qualquer** subdomínio `*.vercel.app` com `credentials: true` — isso permitiria que um atacante hospedando um projeto Vercel próprio fizesse requisições autenticadas (com cookies/credenciais) contra esta API em nome de um usuário logado. Foi substituído por uma allowlist explícita, sem regex/wildcard.

Cada controle novo foi acompanhado de um teste que exercita o comportamento real (não apenas asserções de configuração), conforme exigido. Resultado dos gates:

- `tsc --noEmit`: limpo
- `eslint` (arquivos do hardening): limpo
- Testes unitários: **69/69 passando** (7 suítes)
- Testes e2e: **27/27 passando** (4 suítes)
- `npm run build`: sucesso
- `node -e "require('./dist/src/app.module.js')"`: `APP_MODULE_LOADED_OK` (verificação do bundle compilado real, não só do Jest — lição do incidente de produção anterior nesta mesma sessão, em que um erro `ERR_REQUIRE_ESM` só aparecia no runtime real da Vercel e era mascarado pelo Jest)

---

## 1. JWT_SECRET / JWT_REFRESH_SECRET

**Antes:** já existia uma função (`getRequiredSecret`, de sessão anterior) que falhava se a env var estivesse ausente, mas sem validação de força/entropia, sem checagem de segredos duplicados, e sem teste que provasse que a mensagem de erro nunca vaza o valor do segredo.

**Depois** (`src/auth/jwt-secrets.util.ts`):
- Continua falhando no startup (não numa requisição) se `JWT_SECRET`/`JWT_REFRESH_SECRET` estiverem ausentes ou vazios — chamado eagerly em 3 pontos de construção: `jwt.strategy.ts`, `auth.module.ts` (`JwtModule.registerAsync`) e `auth.service.ts`.
- **Comprimento mínimo:** 32 caracteres.
- **Entropia mínima (heurística):** pelo menos 12 caracteres distintos — rejeita valores repetitivos (`'a'.repeat(40)`) ou sequências numéricas triviais repetidas.
- **Blocklist de placeholders conhecidos:** valores como `changeme`, `secret`, `password`, e os placeholders literais que já existiam no `.env.example`/código antigo do projeto.
- **Nova checagem:** `validarSegredosDistintos()` — `JWT_SECRET` e `JWT_REFRESH_SECRET` não podem ter o mesmo valor. Chamada no bootstrap (`main.ts`) antes de qualquer outra coisa.
- **Nunca logado:** nenhuma mensagem de erro interpola o valor do segredo — apenas o nome da variável e seu comprimento (número, não a string). Testado explicitamente.

**Testes:** `src/auth/jwt-secrets.util.spec.ts` (11 testes) — ausente/vazio/curto/placeholder/baixa-entropia (dois casos) todos lançam; segredo forte é aceito; erro nunca contém o segredo; segredos idênticos lançam; segredos distintos passam; falha de um dos dois se propaga.

---

## 2. CORS

**Antes:** `origin: [FRONTEND_URL, /\.vercel\.app$/]` com `credentials: true`. A regex aceitava **qualquer** subdomínio `*.vercel.app` de **qualquer** conta Vercel do mundo — vulnerabilidade real de CSRF/roubo de sessão via credenciais cross-origin.

**Depois** (`src/config/cors.util.ts` + `src/config/environment.util.ts`, novos):
- Allowlist **explícita e literal** por ambiente, nunca regex/wildcard:
  - **Produção:** 3 domínios estáveis conhecidos do frontend (não URLs de preview com hash aleatório — o tráfego real frontend↔backend em produção é same-origin via rewrite `/api/backend/*` da Vercel, então CORS cross-origin só é relevante para casos especiais/futuros).
  - **Staging:** vazio por padrão — precisa ser configurado explicitamente via `CORS_ALLOWED_ORIGINS`/`FRONTEND_URL`. Falha segura: nunca herda produção nem abre geral.
  - **Desenvolvimento:** `localhost:3000`/`3001` por padrão.
  - Extensível via `CORS_ALLOWED_ORIGINS` (CSV explícito), somado às origens padrão do ambiente.
- `APP_ENV` inválido/desconhecido é tratado como **produção** (mais restritivo), nunca como `development` — impede que uma configuração incorreta relaxe silenciosamente o CORS.
- `credentials: true` mantido, mas agora seguro porque o handler de origin (`buildCorsOriginHandler`) faz comparação **exata** contra um `Set`, nunca prefixo/sufixo/regex.
- Requisições sem header `Origin` (server-to-server, health checks) são permitidas — não são requisições de navegador sujeitas a CORS.

**Testes:**
- `src/config/cors.util.spec.ts` (11 testes) — produção contém os domínios esperados e explicitamente **não** contém um subdomínio `*.vercel.app` arbitrário; nenhuma entrada é regex/wildcard; `CORS_ALLOWED_ORIGINS` soma corretamente; staging sem config retorna `[]`; `APP_ENV` inválido cai em produção; handler aceita origem exata, rejeita origem não listada, permite ausência de `Origin`, e rejeita subdomínio semelhante mas não idêntico.
- `test/hardening.e2e-spec.ts` — teste HTTP real: `OPTIONS /auth/register` com `Origin` autorizada recebe o header `Access-Control-Allow-Origin` correspondente; com `Origin` não autorizada (`atacante-qualquer.vercel.app`), o header vem `undefined` (bloqueado pelo navegador). O log `[ExceptionsHandler] ERROR ... Origem não autorizada` que aparece durante esse teste é **esperado** — é a prova de que o bloqueio ocorreu.

---

## 3. Rate limiting

**Antes (confirmado, de sessão anterior):** `ThrottlerModule.forRoot(...)` estava configurado em `app.module.ts` mas o `ThrottlerGuard` nunca era registrado como guard efetivo — configuração morta, sem efeito real. Isso já havia sido corrigido em sessão anterior via `{ provide: APP_GUARD, useClass: ThrottlerGuard }`, e essa correção foi **confirmada intacta** nesta auditoria.

**Estado atual (auditado + 1 lacuna corrigida):**
- Limite global: 60 req/min (via `APP_GUARD`).
- `/auth/login`: 10/min (já existia de sessão anterior de MFA).
- `/auth/mfa/*` (ativar, confirmar, verificar): já tinham throttles mais restritivos de sessão anterior.
- `/auth/refresh`: **não tinha override** — corrigido para 10/min (`src/auth/auth.controller.ts`).
- Recuperação de senha: **não existe endpoint no código atual** (`grep -rn "recuperar|reset.*senha|forgot|esqueci"` não retornou nenhuma rota). Decisão explícita: não foi criado um fluxo de recuperação de senha do zero — está fora do escopo de hardening de infraestrutura existente; se o produto precisar dessa funcionalidade, deve ser uma feature própria, com seu próprio throttle definido junto da implementação.

**Teste que prova bloqueio real (não apenas "guard registrado"):** `test/hardening.e2e-spec.ts` monta uma aplicação Nest real com `ThrottlerModule.forRoot(...)` + `APP_GUARD` real (não mockado) e dispara **12 requisições HTTP sequenciais reais** contra `POST /auth/login` com senha errada. Resultado: as 10 primeiras retornam `401` (credenciais inválidas — não é rate limit), e a lista de status contém `429` a partir da 11ª. Isso prova execução real do throttling, não apenas a presença de um decorator.

---

## 4. Refresh tokens

Auditoria dos 6 aspectos pedidos:

| Aspecto | Estado antes | Estado depois |
|---|---|---|
| Armazenamento | Já seguro: só o hash SHA-256 (`token_hash`, único) é persistido, nunca o token em texto puro | Sem alteração — já correto |
| Expiração | Já existia: `expira_em`, 7 dias | Sem alteração — já correto |
| Rotação | Já existia: token antigo marcado `revogado: true` a cada refresh bem-sucedido, novo par emitido | Sem alteração — já correto |
| Invalidação após logout | Já existia (fora do escopo desta revisão de `refresh()`, não alterado) | Sem alteração |
| Revogação | Existia revogação individual | Sem alteração — já correto |
| **Reuso** | **Não era tratado** — apresentar um token já revogado apenas falhava com 401, sem qualquer resposta de segurança adicional | **Corrigido**: reuso de um token revogado agora é tratado como sinal de comprometimento — revoga **todas** as sessões ativas daquele usuário (`updateMany` em `revogado: false`) e grava uma entrada de auditoria (`tipo: 'acesso_negado'`, reaproveitando enum existente, sem migração de schema) |

**Arquivo alterado:** `src/auth/auth.service.ts`, método `refresh()`.

**Testes:** novo bloco em `src/auth/auth.service.spec.ts` — `describe('refresh() — hardening: rotação, revogação, reuso e expiração')`, 5 casos:
1. Token revogado → 401 + `updateMany` chamado corretamente + entrada de auditoria `acesso_negado` encontrada.
2. Mesmo token apresentado duas vezes → segunda chamada rejeitada.
3. Token expirado → 401, `update` nunca chamado.
4. Token inexistente → 401.
5. Token válido → sucesso, `update` revoga o antigo, `create` persiste o novo (rotação real).

---

## 5. Headers de segurança

**Antes:** nenhum middleware de headers de segurança — `helmet` não estava instalado nem usado.

**Depois:** `helmet` (`^8.3.0`) adicionado e aplicado em `main.ts`:
```ts
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
```
- `contentSecurityPolicy: false` — deliberado: este é um backend de API pura (sem HTML renderizado), uma CSP restritiva aqui não protege nada e poderia interferir em respostas de erro de um proxy/gateway na frente.
- `crossOriginResourcePolicy: 'cross-origin'` — necessário porque o frontend consome esta API cross-origin em alguns cenários (preview URLs, chamadas diretas fora do rewrite same-origin da Vercel).
- Headers obtidos automaticamente: HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Referrer-Policy`, remoção de `X-Powered-By`, entre outros padrões do Helmet.
- Verificado que a aplicação continua respondendo normalmente após a mudança (suíte e2e completa passando, incluindo os testes de CORS que dependem de headers de resposta específicos).

---

## 6. Configuração de ambiente

**Antes:** não havia uma função central de resolução de ambiente; CORS usava uma env var solta.

**Depois** (`src/config/environment.util.ts`, novo):
- `resolveAppEnv()`: lê `APP_ENV`, com fallback para `NODE_ENV`, com fallback para `'development'` apenas quando **nenhuma das duas** está definida.
- Qualquer valor fora de `{development, staging, production}` cai em **`production`** — a opção mais restritiva, nunca a mais permissiva. Isso garante que erro de digitação ou variável ausente em produção nunca relaxe CORS/logging para o comportamento de desenvolvimento.
- Usado por `cors.util.ts` e logado (nome do ambiente, não segredos) no startup em `main.ts`.
- `parseCsvEnv()`: helper para listas separadas por vírgula (`CORS_ALLOWED_ORIGINS`), usado pelo CORS.

---

## Cobertura dos testes exigidos (checklist original)

| Requisito do usuário | Onde está provado |
|---|---|
| Startup sem `JWT_SECRET` deve falhar | `test/hardening.e2e-spec.ts` — `Test.createTestingModule(...).compile()` rejeita com `/JWT_SECRET/` quando a env var é removida antes do `compile()` |
| Origem não autorizada deve ser bloqueada | `test/hardening.e2e-spec.ts` (HTTP real, `OPTIONS`) + `src/config/cors.util.spec.ts` (unitário) |
| Origem autorizada deve funcionar | idem — mesmo teste HTTP, caso positivo |
| Excesso de requests deve ser bloqueado | `test/hardening.e2e-spec.ts` — 12 requisições reais contra `ThrottlerGuard` real, `429` confirmado na 11ª |
| Refresh token revogado deve falhar | `src/auth/auth.service.spec.ts` — bloco `refresh()` hardening, caso 1 |
| Refresh token reutilizado deve falhar | idem, caso 2 (chamada dupla do mesmo token) |

## Confirmação das restrições "NÃO"

- **Nenhum fallback de secret** foi usado em código de produção — `getRequiredSecret` sempre lança se a env var estiver ausente; os únicos valores de teste ficam em arquivos de teste (`test/setup-e2e.ts`, specs), nunca no código de runtime.
- **Nenhum subdomínio Vercel arbitrário é aceito** — a regex `/\.vercel\.app$/` foi completamente removida; a allowlist é uma lista literal de strings, testada explicitamente para rejeitar `*.vercel.app` genérico.
- **Rate limiting só é declarado funcional porque há um teste HTTP real** disparando 12 requisições sequenciais contra um `ThrottlerGuard` não mockado e observando um `429` de fato.

## Arquivos alterados/criados

**Novos:**
- `src/auth/jwt-secrets.util.spec.ts`
- `src/config/environment.util.ts`
- `src/config/cors.util.ts`
- `src/config/cors.util.spec.ts`
- `test/hardening.e2e-spec.ts`

**Modificados:**
- `src/auth/jwt-secrets.util.ts` (validação de força/entropia/placeholder + `validarSegredosDistintos`)
- `src/main.ts` (helmet, CORS via allowlist, log de ambiente, `validarSegredosDistintos` no bootstrap)
- `src/auth/auth.service.ts` (`refresh()` — detecção de reuso)
- `src/auth/auth.controller.ts` (`@Throttle` em `/auth/refresh`)
- `src/auth/auth.service.spec.ts` (novos testes de `refresh()`)
- `test/setup-e2e.ts` (secrets de teste fortalecidos para passar na nova validação)
- `package.json` (dependência `helmet`)

## Riscos residuais / recomendações futuras

- A blocklist de placeholders conhecidos é finita — não impede todo valor fraco imaginável, apenas os padrões conhecidos deste projeto e senhas triviais óbvias. A checagem de entropia (caracteres distintos) cobre a maioria dos casos restantes, mas não é uma medida formal de entropia de Shannon.
- `staging` depende de configuração manual de `CORS_ALLOWED_ORIGINS`/`FRONTEND_URL` — se um ambiente de staging for provisionado sem essa env var, o CORS ficará fechado (fail-safe), o que é intencional mas pode ser confundido com um bug se não documentado para quem provisiona o ambiente.
- Não existe endpoint de recuperação de senha no sistema atual — nenhuma decisão de rate limiting foi tomada para essa função por não existir; deve ser endereçado quando a feature for implementada.
