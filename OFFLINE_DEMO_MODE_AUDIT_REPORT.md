# Auditoria do Modo Offline/Demo — Prescreve-AI

Data: 2026-07-26
Escopo: frontend Next.js — autenticação, criação de sessão, e a linha divisória entre PRODUCTION / DEVELOPMENT / DEMO MODE.

## 1. Resumo executivo

O frontend tinha exatamente o padrão descrito no pedido: `backend indisponível → login simulado → offline-token → sessão criada`. A condição que decidia isso era `BACKEND_AVAILABLE = !!NEXT_PUBLIC_API_URL` — uma variável de **configuração ausente**, não uma decisão intencional de ninguém. Sempre que essa env var não estivesse definida (inclusive por engano numa implantação de produção), `authApi.login()` fabricava um token (`offline-${Date.now()}`) e criava uma sessão completa, com perfil `MEDICO`, **sem verificar nenhuma credencial**. Isso é fail-open: a ausência de configuração virava a porta de entrada.

Corrigido com um conceito explícito de **modo de aplicação** (`production | development | demo`), resolvido por `frontend/src/lib/app-mode.ts`, com uma regra central e não-negociável: **o modo demo só existe quando ligado explicitamente E o ambiente resolvido não é produção — em produção a flag é sempre ignorada, mesmo se estiver ativa por engano.** Fora do modo demo, ausência/indisponibilidade de backend agora **sempre bloqueia o login com um erro claro**, nunca cria uma sessão.

## 2. Matriz de ambientes e comportamento de autenticação

| Ambiente resolvido | `NEXT_PUBLIC_DEMO_MODE` | Modo efetivo (`AppMode`) | `NEXT_PUBLIC_API_URL` ausente | `NEXT_PUBLIC_API_URL` configurado, backend responde | `NEXT_PUBLIC_API_URL` configurado, backend indisponível/timeout |
|---|---|---|---|---|---|
| `production` | `true` (por engano) | **`production`** — flag ignorada | `AuthConfigError` — login bloqueado, mensagem menciona produção | Login real via `POST /auth/login` | Erro real propagado (`Failed to fetch`/`ApiError`) — login bloqueado |
| `production` | `false`/ausente | **`production`** | `AuthConfigError` — login bloqueado | Login real via `POST /auth/login` | Erro real propagado — login bloqueado |
| `staging` | `true` | **`demo`** | Login simulado local, token `demo-...`, **nenhuma chamada de rede** | Login simulado local — **backend real NUNCA é chamado**, mesmo configurado | Login simulado local — indisponibilidade do backend é irrelevante |
| `staging` | `false`/ausente | **`development`** | `AuthConfigError` — login bloqueado (staging real também exige backend) | Login real | Erro real propagado — login bloqueado |
| `development` | `true` | **`demo`** | Login simulado local, token `demo-...`, faixa "MODO DEMONSTRAÇÃO" sempre visível | Login simulado local — backend real NUNCA é chamado | Login simulado local |
| `development` | `false`/ausente (padrão do `npm run dev` sem `.env.local`) | **`development`** | `AuthConfigError` — login bloqueado, mensagem sugere configurar backend OU ativar `NEXT_PUBLIC_DEMO_MODE=true` | Login real | Erro real propagado — login bloqueado |
| valor desconhecido/corrompido de `NEXT_PUBLIC_APP_ENV` | qualquer | **`production`** (fail-safe) | `AuthConfigError` — login bloqueado | Login real | Erro real propagado |

**Nenhuma célula desta tabela cria uma sessão sem confirmação real do servidor, exceto as marcadas como modo `demo` — e essas são sempre visualmente identificadas (faixa fixa "MODO DEMONSTRAÇÃO" em toda a aplicação) e nunca tocam o backend real, mesmo que `NEXT_PUBLIC_API_URL` esteja configurada nesse ambiente.**

## 3. Pontos que criam sessão local — auditados

| Ponto | Antes | Depois |
|---|---|---|
| `authApi.login()` | Fabricava token `offline-...` sempre que `!BACKEND_AVAILABLE` (= API_URL ausente), sem checar `IS_DEMO_MODE` | Só fabrica token (`demo-...`) quando `IS_DEMO_MODE` é verdadeiro; caso contrário, backend ausente/indisponível lança `AuthConfigError`/`ApiError` — nunca cria sessão |
| `authApi.register()` | Sempre chamava o backend (já era seguro) | Adicionalmente bloqueado com erro claro em modo demo (registro não é uma operação simulável com segurança) e em produção/dev sem backend configurado |
| `getCurrentUser()` | Decodificava qualquer token `offline-...` como usuário demo, incondicionalmente | Só aceita token `demo-...` quando o **build atual** está em modo demo — um token demo remanescente de uma sessão anterior (troca de ambiente no mesmo navegador) é tratado como não autenticado |
| `consultaApi.criar/criarDiagnostico/criarPrescricao/salvarRisco/listar/buscar/timeline` | Retornavam objetos fake (`local-...`) sempre que `!BACKEND_AVAILABLE` | Retornam objetos demo (`demo-...`) apenas quando `!useRealBackend` (nunca em produção/dev real com backend indisponível — nesse caso a chamada real é tentada e propaga erro real, tratado pelo motor de sincronização já existente) |
| `migracaoApi.migrarLocalStorage()` | Silenciosamente "sucesso vazio" sem backend | Mensagem de erro diferenciada: "Backend não disponível" (produção/dev) vs. "Migração desabilitada em modo demonstração" (mensagem explícita, não ambígua) |
| `store.tsx` → `sincronizarConsulta()` | Guardado por `isBackendAvailable` (só refletia presença de `API_URL`, não considerava demo) | Guardado por `useRealBackend` (`!IS_DEMO_MODE && API_URL_CONFIGURED`) — em modo demo, a sincronização automática nunca tenta rede, sempre reporta `status: 'local'` explicitamente |

## 4. Confirmação das regras obrigatórias

1. **"Em produção, ausência ou indisponibilidade do backend não pode criar identidade falsa."** — `authApi.login()` em modo `production` sempre lança `AuthConfigError` (ausência) ou propaga o erro real do `fetch` (indisponibilidade). Nunca chama `setTokens()` nesses casos. Provado em `src/tests/api-client-auth.test.ts`.
2. **"Não permitir login simulado silencioso."** — o login simulado só existe atrás de `NEXT_PUBLIC_DEMO_MODE=true`, uma decisão de quem publica o build — nunca inferido da ausência de configuração. Não há nenhum caminho de UI que ative modo demo em runtime (sem flag de build, não há botão/toggle "entrar em modo demo").
3. **"Se demo mode existir, deve ser explicitamente ativado / exibir claramente DEMO / nunca ser confundido com ambiente clínico real / não persistir dados como se fossem reais."** — `NEXT_PUBLIC_DEMO_MODE=true` explícito; `<DemoModeBanner>` fixo no topo de toda página quando ativo (`src/components/layout/DemoModeBanner.tsx`); badge redundante na tela de login e na tela de prescrição; em modo demo, `useRealBackend` é sempre `false` — nenhum dado é enviado à API real, mesmo que `NEXT_PUBLIC_API_URL` esteja configurada nesse ambiente (isolamento absoluto, testado explicitamente).
4. **"O frontend deve detectar falha de autenticação real."** — `apiFetch()` já lançava `ApiError` em qualquer resposta não-2xx; agora `authApi.login()` também nunca mascara isso com um fallback silencioso.
5. **"O usuário deve receber erro claro."** — `login/page.tsx` já capturava `err.message` e exibia; `AuthConfigError`/`ApiError` têm mensagens específicas e acionáveis ("Backend não configurado nesta implantação de produção... contate o suporte" vs. "...ative NEXT_PUBLIC_DEMO_MODE=true explicitamente"). Confirmado em navegador (ver §6).
6. **"Não usar offline-token em produção."** — impossível estruturalmente: `resolveAppMode()` nunca retorna `'demo'` quando o ambiente resolvido é `'production'`, mesmo com a flag ligada. Adicionalmente, `getCurrentUser()` rejeita um token `demo-...` remanescente fora do modo demo.
7. **"Auditar todos os pontos que criam sessão local."** — tabela completa na seção 3; todo ponto foi revisado.

## 5. Testes adicionados

### Frontend — `src/tests/app-mode.test.ts` (13 testes)
Matriz completa de `resolveAppEnv()`/`resolveAppMode()`: cada `AppEnv` válido resolve corretamente; valor desconhecido de `NEXT_PUBLIC_APP_ENV` cai em produção (fail-safe); produção + flag de demo ligada → produção (flag ignorada); development/staging + flag → demo; ausência da flag → nunca demo por padrão; apenas a string exata `"true"` ativa (não `"1"`/`"yes"`).

### Frontend — `src/tests/api-client-auth.test.ts` (9 testes) — cobre os 5 cenários exigidos
| Cenário exigido | Teste |
|---|---|
| produção + API indisponível → login bloqueado | 3 testes: sem `API_URL` → `AuthConfigError`; mensagem menciona produção; com `API_URL` configurada mas servidor fora do ar (fetch rejeita) → erro real propagado, sem token |
| produção + API disponível → login real | 1 teste: `POST /auth/login` real chamado, tokens reais do servidor salvos |
| demo explicitamente ativado → comportamento isolado | 1 teste: login resolve localmente com token `demo-...`, **zero chamadas a `fetch`** |
| demo não pode acessar dados de produção | 1 teste: mesmo com `NEXT_PUBLIC_API_URL` apontando para produção, modo demo nunca chama `fetch` — `useRealBackend === false` |
| token offline não pode ser aceito pelo backend | coberto no backend (ver abaixo) + 1 teste frontend: token `demo-...` remanescente é ignorado fora do modo demo |
| (extra) registro bloqueado em modo demo | 1 teste |
| (extra) produção com flag de demo ligada por engano nunca vira demo | 1 teste |

### Backend — `test/authorization.e2e-spec.ts` (+2 testes, HTTP real)
`Authorization: Bearer demo-<timestamp>` (formato exato usado pelo modo demo do frontend) → `401`, nunca autentica. String arbitrária malformada (nem 3 segmentos JWT) → `401`, não `500`. Confirma que o `JwtStrategy` (verificação criptográfica real via `passport-jwt`) já rejeitava esses valores — agora com prova explícita e nomeada para este cenário.

### Verificação manual em navegador (`npm run dev`, dois cenários reais)
1. **Sem `.env.local`** (comportamento padrão): tela de login mostra "Backend não configurado neste ambiente — login está bloqueado até a configuração ser corrigida"; ao tentar logar, erro claro é exibido ("Backend não configurado (NEXT_PUBLIC_API_URL ausente)... ative NEXT_PUBLIC_DEMO_MODE=true..."); nenhum token novo é salvo; um token `demo-...` remanescente de um teste anterior no mesmo navegador é corretamente tratado como não autenticado (sidebar mostra "Entrar", não "Sair da sessão").
2. **Com `NEXT_PUBLIC_APP_ENV=development` + `NEXT_PUBLIC_DEMO_MODE=true`**: faixa "MODO DEMONSTRAÇÃO" fixa aparece imediatamente na tela de login e persiste em toda navegação pós-login; login com qualquer e-mail/senha funciona instantaneamente (sem chamada de rede); toggle de "criar conta" fica oculto.

## 6. Resultado dos gates

| Comando | Resultado |
|---|---|
| Frontend `npx tsc --noEmit` | ✅ limpo |
| Frontend `npx eslint` (arquivos alterados) | ✅ 0 erros (3 avisos pré-existentes não relacionados) |
| Frontend `npx vitest run` | ✅ **410/410** (16 suítes) |
| Frontend `npm run build` | ✅ sucesso, 50 rotas |
| Backend `npx tsc --noEmit` | ✅ limpo |
| Backend `npx jest` (unitário) | ✅ **78/78** (8 suítes) |
| Backend `npx jest --config ./test/jest-e2e.json` | ✅ **69/69** (7 suítes) |
| Verificação manual em navegador | ✅ 2 cenários (bloqueado / demo) confirmados visualmente, zero erros de console |

## 7. Arquivos alterados/criados

**Novos:**
- `frontend/src/lib/app-mode.ts` — resolução de `AppEnv`/`AppMode`
- `frontend/src/components/layout/DemoModeBanner.tsx` — faixa persistente
- `frontend/src/tests/app-mode.test.ts`
- `frontend/src/tests/api-client-auth.test.ts`
- `frontend/.env.example` — documenta as novas variáveis

**Modificados:**
- `frontend/src/lib/api-client.ts` — `authApi.login/register`, `getCurrentUser()`, `consultaApi.*`, `migracaoApi.*` reescritos para usar `IS_DEMO_MODE`/`useRealBackend` em vez de `BACKEND_AVAILABLE`; nova `AuthConfigError`
- `frontend/src/lib/store.tsx` — `sincronizarConsulta` usa `useRealBackend`; `auth` expõe `demoMode`/`appMode`
- `frontend/src/app/layout.tsx` — inclui `<DemoModeBanner>`
- `frontend/src/app/login/page.tsx` — mensagens diferenciadas por modo; oculta registro em modo demo
- `frontend/src/components/layout/Sidebar.tsx` — texto do link de login diferenciado
- `frontend/src/components/modules/PrescriptionPanel.tsx` — badge de sync diferencia demo de "backend não configurado"
- `backend/test/authorization.e2e-spec.ts` — 2 testes novos de rejeição de token estilo demo/malformado

## 8. Riscos residuais

1. **Não existe teste de integração de componente React** para `<DemoModeBanner>`/`login/page.tsx` (mesma limitação já documentada na auditoria de persistência anterior — projeto sem `@testing-library/react`). Mitigado por verificação manual em navegador nos dois cenários centrais.
2. **`AuthConfigError` tem `status` implícito de `0`** em alguns pontos onde reaproveitei `ApiError` — não é um problema funcional (a UI já trata pelo `message`, não pelo `status`, para erros de configuração), mas vale padronizar futuramente se algum consumidor passar a inspecionar `status` para essa classe de erro.
3. **Nenhuma UI de administração para alternar `NEXT_PUBLIC_DEMO_MODE`** — é deliberado (é uma decisão de build/deploy, não uma preferência de usuário em runtime), mas significa que qualquer instância "demo" pública precisa ser um deploy Vercel separado com essa env var configurada — não documentado aqui como fazer esse deploy separado (fora do escopo desta auditoria de comportamento de autenticação).
