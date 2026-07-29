# Eliminação de Fallback/Demo/Dados Fictícios Fora de Modo Explícito — RM-38

**Camada:** RM-38 · **Status:** implementada · **Módulo:** [`frontend/src/lib/api-client.ts`](../frontend/src/lib/api-client.ts), [`frontend/src/lib/store.tsx`](../frontend/src/lib/store.tsx), [`frontend/src/app/demo/page.tsx`](../frontend/src/app/demo/page.tsx), [`frontend/src/components/modules/DiagnosticPanel.tsx`](../frontend/src/components/modules/DiagnosticPanel.tsx)
**Complementa:** [`OFFLINE_DEMO_MODE_AUDIT_REPORT.md`](../OFFLINE_DEMO_MODE_AUDIT_REPORT.md) (auditoria anterior de autenticação/login) — corrige uma reivindicação desatualizada nesse relatório (ver nota no topo dele).

> Audita todo uso de demo/mock/offline/fallback/localStorage/dados simulados no
> frontend e elimina os caminhos que retornavam dados fictícios FORA de um modo
> demo explicitamente habilitado — incluindo em produção mal configurada.

---

## 1. Classificação de todos os fluxos auditados

| Fluxo | Classificação | Estado |
|---|---|---|
| `authApi.login/register/logout`, `getCurrentUser()` | Produção real | Já corrigido em auditoria anterior — login simulado só existe atrás de `IS_DEMO_MODE` explícito |
| `DemoModeBanner`, badges "MODO DEMONSTRAÇÃO" (login, PrescriptionPanel) | Demo explicitamente habilitado | Correto — só renderiza quando `auth.demoMode` |
| `/demo` (Casos Clínicos) — navegação/listagem | Demo explicitamente habilitado, mas **alcançável em qualquer modo** (informativo) | Mantido acessível (produto/tour), ação de "lançar caso" agora bloqueada fora do modo demo (ver §2) |
| `/demo` — `launchCase()` (injeta consulta fictícia) | **Encontrado rodando como produção sem checagem** | **Corrigido** — bloqueado fora de `IS_DEMO_MODE` |
| `consultaApi.criar/listar/buscar/timeline/criarDiagnostico/criarPrescricao/salvarRisco/buscarEvidencias/buscarRWE` | **Fallback ambíguo** (mesmo ramo para demo E produção quebrada) | **Corrigido** — separa `IS_DEMO_MODE` (dado demo) de `!API_URL_CONFIGURED` fora de demo (`AuthConfigError`) |
| `migracaoApi.verificarStatus` | Mesmo problema acima | **Corrigido** |
| `migracaoApi.migrarLocalStorage` | Retorno "soft" (contagem 0 + motivo) — não fabrica sucesso | Mantido, mensagens diferenciadas por causa |
| `store.tsx` → `sincronizarConsulta()` guarda de curto-circuito | **Mascarava produção quebrada como "status: local" benigno** | **Corrigido** — só demo/não-autenticado curto-circuitam; produção sem backend segue adiante e falha explicitamente |
| `store.tsx` → `initialState.consultations = MOCK_CONSULTATIONS` | **Dado fictício incondicional** (3 pacientes fictícios sempre presentes) | **Corrigido** — só em `IS_DEMO_MODE`; caso contrário `[]` |
| `DiagnosticPanel.tsx` → `dispatch(UPDATE_SAFETY, MOCK_SAFETY)` | **Dado fictício incondicional** (safety-check fabricado, todo modo) | **Corrigido** — só em `IS_DEMO_MODE`; fora dele, nenhum safety-check fabricado é mostrado |
| `mock-data.ts` (`MOCK_DIAGNOSTIC/MOCK_THERAPEUTIC/MOCK_SAFETY`) usado por `demo-cases.ts` | Demo explicitamente habilitado | Correto — consumido só pelos casos de `/demo`, agora também gated (ver acima) |
| `localStorage` (tokens, anamnese, histórico, migração) | Persistência offline legítima | Já auditado (RM anterior — FE-03, sync-engine) — fora do escopo desta rodada |
| Backend (NestJS) | — | Nenhum uso de mock/fallback/demo encontrado — já hardened em auditorias anteriores (fail-fast em todos os segredos/config) |

## 2. Correções

### 2.1 `api-client.ts` — `consultaApi`/`migracaoApi` nunca mais retornam sucesso fabricado fora de demo

Antes: `if (!USE_REAL_BACKEND) return {dado fictício}` — `USE_REAL_BACKEND = !IS_DEMO_MODE && API_URL_CONFIGURED` tratava "produção mal configurada" e "modo demo" como o MESMO caso.

Depois: cada método distingue explicitamente:
```ts
if (IS_DEMO_MODE) return { id: `demo-...` };          // dado demo, rotulado, nunca enviado à rede
if (!API_URL_CONFIGURED) throwBackendObrigatorio(...); // AuthConfigError — nunca sucesso fabricado
return apiFetch(...);                                  // backend real
```
`AuthConfigError` agora estende `NonRetryableError` (`sync-engine.ts`) — o motor de sincronização nunca reintenta uma falha de configuração (só uma mudança de configuração resolve, não um retry).

### 2.2 `store.tsx` — `sincronizarConsulta()` não mascara mais produção quebrada como "offline temporário"

A guarda de curto-circuito usava `!useRealBackend` (== demo OU config ausente) para pular a tentativa de rede e marcar `status: 'local'` — indistinguível de "vai sincronizar depois". Agora só `IS_DEMO_MODE` e usuário não autenticado curto-circuitam; produção/dev real sem backend configurado segue adiante, `consultaApi.criar()` lança `AuthConfigError`, e o resultado vira `status: 'failed'` com mensagem clara (já exibida pela UI existente, `PrescriptionSyncBadge`).

Defesa em profundidade adicionada: `isDemoConsultationId()` (`sync-engine.ts`) — qualquer consulta com id `demo_...` nunca é sincronizada com o backend real, independentemente do modo no momento da tentativa.

### 2.3 `store.tsx` — estado inicial não injeta mais pacientes fictícios incondicionalmente

`initialState.consultations` era sempre `MOCK_CONSULTATIONS` (pacientes "Maria Santos", "João Oliveira", "Ana Costa") — visível em `/historico`, `/prescricoes` e no dashboard em QUALQUER modo, inclusive produção, misturado com consultas reais (não há hoje uma chamada que hidrate essa lista a partir do backend — gap arquitetural maior, registrado à parte). Agora: `IS_DEMO_MODE ? MOCK_CONSULTATIONS : []`.

### 2.4 `DiagnosticPanel.tsx` — safety-check fabricado não é mais mostrado fora de demo

`MOCK_SAFETY` (exemplo fixo — "Enalapril", monitorização renal por IECA) era despachado **incondicionalmente** a cada seleção de hipótese diagnóstica, em todo modo — um médico via um "check de segurança" completamente desconectado do paciente/prescrição reais. Agora só despachado em `IS_DEMO_MODE`; fora dele, nenhum safety-check fictício aparece (`TherapeuticPanel` já trata a ausência graciosamente). Integração de um safety-check real (`runSafetyCheck`, `safety-rules.ts`) a este fluxo requer trabalho de mapeamento de tipos e é um item separado, não incluído nesta correção (que é sobre eliminar dado fictício, não sobre construir a integração real).

### 2.5 `/demo` (Casos Clínicos) — lançar caso bloqueado fora do modo demo

`launchCase()` injetava uma consulta/paciente/prescrição inteiramente fictícios em `state.consultations` — o MESMO array de pacientes reais — sem NENHUMA checagem de modo. Em produção, um usuário podia lançar um caso, prosseguir a `/consulta/nova`, gerar uma "prescrição" e o fluxo de sincronização tentaria enviá-la ao backend real (mitigado adicionalmente por §2.2's `isDemoConsultationId`). Corrigido: `launchCase()` recusa-se a rodar fora de `IS_DEMO_MODE`, mostrando um toast explicativo; a página permanece navegável/informativa (lista de casos) em qualquer modo.

## 3. Testes

- `frontend/src/tests/api-client-rm38-fallback.test.ts` (13 testes): produção sem backend → todo método de `consultaApi`/`migracaoApi` lança/retorna falha honesta; desenvolvimento real sem backend → mesmo bloqueio; modo demo → dados demo continuam funcionando (regressão); produção com backend real → chamadas reais funcionam (regressão); `AuthConfigError` é `NonRetryableError`.
- `frontend/src/tests/sync-engine.test.ts` (+4 testes): `isDemoConsultationId()`.
- Suite completa do frontend após as mudanças: **615/615** passando. `tsc --noEmit` limpo. Build (`npm run build`) bem-sucedido.
- Backend: nenhuma mudança necessária — auditoria confirmou ausência de mock/fallback/demo (já hardened em rodadas anteriores).

## 4. Vercel

`vercel.json` roteia `/api/backend/*` ao serviço backend e todo o resto ao frontend — nenhuma lógica de fallback/mock no roteamento em si. As variáveis relevantes (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_DEMO_MODE`) já são `NEXT_PUBLIC_*` (compiladas em build time, não alteráveis em runtime por um usuário) e documentadas em `frontend/.env.example`. Nenhuma variável de ambiente do Vercel pode ativar demo em produção — `resolveAppMode()` ignora a flag sempre que o ambiente resolvido é `production`, uma garantia estrutural, não de configuração.

## 5. Fora de escopo (registrado, não corrigido nesta rodada)

- Integração de um safety-check REAL (não fictício) ao fluxo de seleção diagnóstica (`DiagnosticPanel.tsx`) — requer reconciliar os tipos de `QuickSafetyAlert` (`safety-rules.ts`) com `SafetyAlert`/`SafetyCheck` (`types.ts`).
- Hidratação de `state.consultations` a partir do backend real via `consultaApi.listar()` — hoje a lista só reflete o que foi criado na sessão atual do navegador (flagado como task separada).
