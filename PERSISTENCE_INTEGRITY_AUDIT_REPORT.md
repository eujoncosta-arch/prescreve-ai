# Auditoria de Integridade de Persistência — Fluxos Clínicos Prescreve-AI

Data: 2026-07-26
Escopo: full-stack (frontend Next.js + backend NestJS/Prisma) — criação de consulta, anamnese, diagnóstico, prescrição, RiskScore, timeline, documentos clínicos.

## 1. Resumo executivo

O frontend tinha um fluxo híbrido localStorage + sincronização "best-effort" com o backend, e o problema era exatamente o que o pedido descreve: **uma falha de sincronização era tratada de forma indistinguível de sucesso**. O botão "Finalizar e Emitir Prescrição" mostrava `toast.success('Consulta concluída e prescrição emitida!')` de forma **incondicional**, sem nenhuma chamada de rede síncrona — a persistência real no backend só era tentada depois, em segundo plano, por um `useEffect` cujo `catch` estava **vazio** (`// best-effort: falha de sync não interrompe o fluxo em memória`). Diagnóstico e RiskScore nunca eram enviados ao backend em nenhum fluxo de UI. Não havia idempotência: reenviar a mesma prescrição (retry, fila, reenvio de migração) criava um registro duplicado — confirmado e corrigido também no backend (`migration.service.ts` tinha um hash de deduplicação que incluía `Date.now()`, então nunca detectava reenvio).

Esta auditoria implementou:
- **Status de persistência explícito** (`local | syncing | synced | failed`) por recurso clínico, nunca inferido do estado local da UI.
- **Idempotency key** gerada no cliente, reutilizada em todo retry, com upsert-por-chave no backend (Consulta/Diagnóstico/Prescrição/RiskScore) — nunca duplica por reenvio.
- **Retry com backoff exponencial**, mas só para erros retryable (rede/timeout/5xx) — um 400 de validação nunca é retentado.
- **Feedback visual real**: o badge de status na tela de prescrição mostra exatamente o que o servidor confirmou (ou não), com botão de retry manual quando falha.
- **Correção do bug de duplicação na migração** (hash instável + falta de checagem de idempotência).

## 2. Auditoria por fluxo clínico

| Fluxo | Estado ANTES | Estado DEPOIS |
|---|---|---|
| **Criação de consulta** | `POST /api/consulta` só era chamado em background, sem idempotência; falha = catch vazio | Idempotency key + retry+backoff; `status` explícito rastreado por consulta |
| **Anamnese** | Só localStorage (`AnamneseForm.tsx`) — nunca enviada ao backend em nenhum fluxo real; `analyzeClinical()` roda 100% client-side | Sem mudança de fluxo (está fora do escopo desta correção pontual — é client-side por design, o dado vai ao backend embutido no payload de `criarConsulta`). Documentado como tal, não fabricado um novo endpoint |
| **Diagnóstico** | `criarDiagnostico` existe no `api-client.ts` mas **nunca é chamado por nenhum componente** — diagnóstico nunca chega ao backend | Idempotência implementada no backend (pronta para uso); gap de UI documentado como risco residual (§7) — não fabricada uma nova tela fora do pedido |
| **Prescrição** | `handleFinalize` — sucesso incondicional, sem chamada de rede síncrona; sync real em background com catch vazio; sem idempotência (duplicava por retry) | `PrescriptionSyncBadge` mostra o status real; `sincronizarConsulta` usa `syncResource` (retry+backoff+timeout); idempotency key gerada uma vez e reaproveitada; backend nunca duplica |
| **RiskScore** | `salvarRisco` existe no `api-client.ts` mas **nunca é chamado por nenhum componente** — nenhuma tela computa e anexa um risk score à consulta ativa | Idempotência implementada no backend (pronta para uso); gap de UI documentado como risco residual (§7) |
| **Timeline** | `useTimeline()` (`lib/timeline.ts`) é um read-model 100% local, sem persistência própria no backend — não há endpoint de escrita para eventos de timeline arbitrários | Confirmado como modelo derivado — a fonte da verdade é a própria Consulta/Diagnóstico/Prescrição sincronizada; nenhuma mudança fabricada |
| **Documentos clínicos** | Não existe um modelo `Documento` no schema do backend (confirmado em auditoria anterior desta mesma sessão) | N/A — sem superfície a corrigir |

## 3. Diagrama textual — ANTES

```
[Médico clica "Finalizar e Emitir Prescrição"]
              │
              ▼
   dispatch(UPDATE_PRESCRIPTION)  ──────────────► localStorage / estado em memória
              │
              ▼
   toast.success("Consulta concluída e prescrição emitida!")   ◄── SEMPRE, incondicional
              │
              ▼
       onComplete() — avança a UI
              │
              │   (em paralelo, minutos depois, sem o médico ver)
              ▼
   useEffect detecta status === 'concluida'
              │
              ▼
   sincronizarConsulta(c)
              │
              ├─ consultaApi.criar(...)  ──► POST /api/consulta
              │        │
              │        ├─ sucesso ──► segue
              │        └─ FALHA ────► catch {}  ← SILENCIOSO, sem log, sem UI, sem retry
              │
              └─ consultaApi.criarPrescricao(...) ──► POST /api/prescricao
                       │
                       ├─ sucesso ──► (ninguém percebe, UI já seguiu em frente)
                       └─ FALHA ────► catch {}  ← SILENCIOSO — prescrição nunca existiu no
                                                   servidor, e o médico nunca soube

   PROBLEMA: se o retry do fetch travar/reenviar, cada tentativa cria um
   NOVO registro (sem idempotency key) — duplicação garantida.
```

## 4. Diagrama textual — DEPOIS

```
[Médico clica "Finalizar e Emitir Prescrição"]
              │
              ▼
   dispatch(UPDATE_PRESCRIPTION)  ──────────────► localStorage / estado em memória
              │                                    (status.prescricao = ainda não setado)
              ▼
   toast.success("Prescrição registrada. Sincronizando com o servidor...")
              │                                    ← HONESTO: não afirma persistência real
              ▼
       onComplete() — avança a UI
              │
              ▼
   useEffect dispara sincronizarConsulta() EXATAMENTE 1x por consulta (ref-guard)
              │
              ├─ backend indisponível / não autenticado?
              │        └─ SET_SYNC_STATE(consulta, {status:'local'}) — FIM, sem tentativa de rede
              │
              ▼ (backend disponível)
   idempotencyKey = reaproveita se já existir, senão newIdempotencyKey()
              │
              ▼
   syncResource({ attemptFn: consultaApi.criar(..., idempotency_key) })
              │
              ├─ SET_SYNC_STATE(consulta, {status:'syncing', attempts:N})  ← visível na UI
              │
              ├─ tentativa falha, retryable (rede/timeout/5xx)?
              │        └─ backoff exponencial (1s, 2s, 4s...) → tenta de novo, MESMA key
              │
              ├─ tentativa falha, NÃO retryable (400)?
              │        └─ desiste imediatamente — reenviar não muda o resultado
              │
              ├─ todas as tentativas se esgotam
              │        └─ SET_SYNC_STATE(consulta, {status:'failed', error})
              │           toast.error("Falha ao sincronizar... dados só neste dispositivo")
              │           PrescriptionSyncBadge mostra alerta vermelho + botão "Tentar novamente"
              │           (retrySync reaproveita a MESMA idempotency key)
              │
              └─ sucesso confirmado pelo servidor (resposta 2xx real)
                       └─ SET_SYNC_STATE(consulta, {status:'synced', backend_id})
                          │
                          ▼ (só então, com consulta_id REAL do backend)
                   syncResource({ attemptFn: consultaApi.criarPrescricao(..., idempotency_key) })
                          │
                          ├─ falha → SET_SYNC_STATE(prescricao,{status:'failed'})
                          │          toast.error("...prescrição NÃO foi confirmada pelo servidor")
                          │          badge vermelho + retry manual
                          │
                          └─ sucesso → SET_SYNC_STATE(prescricao,{status:'synced'})
                                       badge verde "Prescrição confirmada no servidor"

   GARANTIA: reenviar a MESMA operação (retry automático OU manual) sempre
   usa a MESMA idempotency_key — o backend faz upsert-por-chave e retorna
   o registro já existente em vez de criar um duplicado (provado em
   backend/test/persistence-integrity.e2e-spec.ts).
```

## 5. Alterações — Backend

| Arquivo | Alteração |
|---|---|
| `backend/prisma/schema.prisma` | `idempotency_key String? @unique` em `Consulta`, `Diagnostico`, `Prescricao`, `RiskScore` |
| `backend/src/modules/consulta/dto/consulta.dto.ts` | `idempotency_key` opcional (validado: string, 8–100 chars) em `CriarConsultaDto`, `CriarDiagnosticoDto`, `CriarPrescricaoDto`, `SalvarRiscoDto` |
| `backend/src/modules/consulta/consulta.service.ts` | Novo helper privado `buscarPorIdempotencyKey()` — se a chave já existe, retorna o registro existente (verificando que pertence ao mesmo dono/escopo) em vez de criar; aplicado em `criarConsulta`, `criarDiagnostico`, `criarPrescricao`, `salvarRiskScore` |
| `backend/src/modules/consulta/consulta.controller.ts` | `POST /api/risco` passa `body.idempotency_key` ao service |
| `backend/src/modules/migration/migration.service.ts` | **Bug corrigido**: hash de integridade incluía `ts: Date.now()` (nunca reproduzível — reenviar o mesmo lote sempre duplicava). Agora o hash é estável (determinístico pelo conteúdo) e uma `idempotency_key` (`migracao:${usuarioId}:${item.id ?? hash}`) é checada antes de criar — reenviar o mesmo lote de localStorage nunca duplica |

## 6. Alterações — Frontend

| Arquivo | Alteração |
|---|---|
| `frontend/src/lib/sync-engine.ts` **(novo)** | Motor puro e testável: `PersistenceStatus`/`SyncState`, `newIdempotencyKey()`, `withTimeout()`, `withRetry()` (backoff exponencial, só retryable), `isRetryable()` (classifica 4xx vs. 5xx/rede/timeout), `syncResource()` (orquestra tudo — NUNCA reporta `synced` sem confirmação real) |
| `frontend/src/lib/types.ts` | Novo `ResourceSyncState`/`ConsultationSync`; `Consultation.sync?: ConsultationSync` |
| `frontend/src/lib/api-client.ts` | `consultaApi.criar/criarDiagnostico/criarPrescricao/salvarRisco` aceitam `idempotency_key` |
| `frontend/src/lib/store.tsx` | Nova action `SET_SYNC_STATE`; `sincronizarConsulta` reescrita — usa `syncResource`, gera/reaproveita idempotency key, **nunca engole erro** (`toast.error` explícito em toda falha), consulta e prescrição têm status independentes (falha parcial não contamina o outro). Novo `retrySync(consultaId)` para reconciliação manual. Guard por `useRef` evita loop de re-sincronização a cada atualização de status |
| `frontend/src/components/modules/PrescriptionPanel.tsx` | Novo `<PrescriptionSyncBadge>` — mostra o estado REAL (`local`/`syncing`/`synced`/`failed`) com botão "Tentar novamente" quando falha; `toast.success` do clique deixou de afirmar "emitida" (agora: "registrada... sincronizando") |

## 7. Testes adicionados

### Backend — `src/modules/consulta/consulta.service.spec.ts` (+7 testes)
Idempotência: mesma chave retorna o registro existente sem chamar `create` de novo (consulta/diagnóstico/prescrição/risco); chave pertencente a outro usuário é rejeitada; ausência de chave preserva o comportamento normal (sem checagem).

### Backend — `src/modules/migration/migration.service.spec.ts` (novo, 3 testes)
Hash estável (não depende de `Date.now()`); reenviar o mesmo lote não cria uma segunda prescrição; itens sem `id` local usam hash de conteúdo como chave.

### Backend — `test/persistence-integrity.e2e-spec.ts` (novo, 3 testes, HTTP real)
Reenviar a mesma prescrição 3x seguidas cria **apenas 1** registro; chaves diferentes criam registros diferentes (idempotência não bloqueia operações distintas); **recuperação posterior** — falha simulada na 1ª tentativa (sem persistir nada), retry com sucesso, reenvio tardio pós-sucesso não duplica.

### Frontend — `src/tests/sync-engine.test.ts` (novo, 21 testes)
Cobre explicitamente os 7 cenários exigidos:
- **backend disponível**: sucesso na 1ª tentativa, sem retry.
- **backend indisponível**: erro de rede em todas as tentativas → `status: 'failed'`, nunca `'synced'`.
- **timeout**: tentativa que nunca resolve conta como falha retryable.
- **retry**: falhas transitórias seguidas de sucesso, backoff exponencial confirmado (delays dobrando).
- **duplicação**: prova indireta na classificação — a MESMA `attemptFn`/key é reaproveitada pelo `withRetry` (a prova direta de não-duplicação está nos testes de backend, camada onde a deduplicação realmente acontece).
- **falha parcial**: duas chamadas `syncResource` independentes (consulta e prescrição) têm status independentes — uma sincroniza, outra falha, sem contaminação cruzada.
- **recuperação posterior**: uma sincronização que falhou pode ser retentada manualmente mais tarde e ter sucesso.

### Verificação manual (browser, servidor de desenvolvimento local)
Fluxo completo Paciente → Anamnese → Diagnóstico → Terapêutico → Prescrição percorrido ponta a ponta; `PrescriptionSyncBadge` confirmado renderizando corretamente **"Modo local — backend não configurado; prescrição salva apenas neste dispositivo"** (sem `NEXT_PUBLIC_API_URL` configurado neste ambiente); zero erros no console; fluxo avançou normalmente até a etapa de Validação.

## 8. Resultado dos gates

| Comando | Resultado |
|---|---|
| Backend `npx tsc --noEmit` | ✅ limpo |
| Backend `npx eslint` (arquivos alterados) | ✅ 0 erros/avisos |
| Backend `npx jest` (unitário) | ✅ **78/78** (8 suítes) |
| Backend `npx jest --config ./test/jest-e2e.json` | ✅ **67/67** (7 suítes) |
| Backend `npm run build` + `require('./dist/src/app.module.js')` | ✅ `APP_MODULE_LOADED_OK` |
| Frontend `npx tsc --noEmit` | ✅ limpo |
| Frontend `npx eslint` (arquivos alterados) | ✅ 0 erros (3 avisos pré-existentes não relacionados) |
| Frontend `npx vitest run` | ✅ **388/388** (14 suítes) |
| Frontend `npm run build` | ✅ sucesso, 50 rotas geradas |
| Verificação manual em navegador | ✅ fluxo completo sem erros de console |

## 9. Confirmação das regras obrigatórias

- **"Uma prescrição não pode ser marcada como persistida se o backend falhou"** — `PrescriptionSyncBadge` só mostra "confirmada no servidor" quando `sync.prescricao.status === 'synced'`, que só é setado dentro do `.then` de sucesso real de `syncResource` (nunca no catch).
- **"Falha de sincronização deve ser visível ao usuário"** — `toast.error` explícito + badge vermelho persistente com botão de retry.
- **"Operações clínicas críticas devem ter estado explícito de persistência"** — `ConsultationSync` com status por recurso (`consulta`/`diagnostico`/`prescricao`).
- **"Não esconder erros em catch silencioso"** — o `catch {}` original foi removido; `syncResource` sempre captura e reporta o erro real.
- **"Retry seguro"** — `withRetry` com backoff exponencial, só para erros retryable.
- **"Evitar duplicação por retry utilizando idempotência"** / **"Não duplicar prescrições em caso de reenvio"** — idempotency key + upsert-por-chave no backend, provado em `persistence-integrity.e2e-spec.ts`.

## 10. Riscos residuais

1. **Diagnóstico e RiskScore não são chamados por NENHUM componente de UI hoje** — `criarDiagnostico`/`salvarRisco` existem no `api-client.ts` e agora têm idempotência pronta no backend, mas nenhuma tela do frontend os invoca (confirmado por busca exaustiva). Não é uma regressão desta auditoria — já era assim antes. Corrigir isso exigiria decidir QUAL fluxo de UI deveria disparar essas chamadas (o diagnóstico é hoje só um `apoio_diagnostico` client-side; não há uma ação explícita de "salvar diagnóstico" na UI) — uma decisão de produto fora do escopo de uma auditoria de integridade de persistência. Documentado, não fabricado.
2. **Teste de integração React (`store.tsx`/`AppProvider`) não foi escrito** — o projeto não tem `@testing-library/react` instalado; adicionar essa dependência seria uma mudança de infraestrutura de teste maior que o escopo desta auditoria. A lógica que `store.tsx` orquestra (retry/backoff/idempotência/classificação de erro) está 100% coberta em `sync-engine.test.ts`; `store.tsx` foi verificado por leitura de código, `tsc`, e teste manual em navegador.
3. **Fila de sincronização persistente (offline queue) não foi implementada** — se o usuário fechar a aba com uma sincronização `failed`, o estado de retry não sobrevive ao reload (não há persistência de `sync` em localStorage). O dado clínico em si (`Consultation`) já é local via o estado da aplicação; adicionar uma fila durável (IndexedDB/localStorage) para retomar sincronizações entre sessões é um incremento razoável para uma iteração futura, mas não estava quebrado antes (o comportamento anterior era pior — nem havia estado nenhum) e não foi pedido como obrigatório ("SE COMPATÍVEL").
4. **Reconciliação automática em background** (ex.: verificar periodicamente por consultas locais não sincronizadas) não foi implementada — hoje a reconciliação é manual (botão "Tentar novamente"). Suficiente para o critério de aceite ("nunca sugerir persistência não confirmada"), mas uma versão futura poderia adicionar um job periódico.
5. **`.claude/launch.json`** foi criado nesta sessão para permitir a verificação manual em navegador (não existia antes) — arquivo de configuração de desenvolvimento, sem impacto em produção.
