# RM-45 — Resilient Consultation Sync, Retry & Offline Recovery

**Pré-requisitos:** RM-42, RM-43, RM-44 concluídos. Nenhuma lógica terapêutica foi alterada; nenhuma expansão clínica foi iniciada.

---

## 1. Máquina de estados encontrada (auditoria)

Arquivos auditados: `frontend/src/lib/store.tsx`, `frontend/src/lib/api-client.ts`, `frontend/src/lib/sync-engine.ts`, `frontend/src/components/modules/PrescriptionPanel.tsx` (único componente que exibe status de sync), fluxo de logout, persistência local existente.

**Ciclo real confirmado (antes desta RM):**

```
local → syncing → synced
local → syncing → failed → retry (manual ou automático) → syncing → synced
```

- `ResourceSyncState.status`: `'local' | 'syncing' | 'synced' | 'failed'` (`types.ts`) — já corretamente modelado.
- `syncResource()`/`withRetry()` (`sync-engine.ts`): já implementa retry com backoff exponencial (3 tentativas, base 1s), timeout por tentativa (15s), e `isRetryable()` já diferencia corretamente rede/timeout (retryable), 5xx/408/429 (retryable) de 4xx restante — incluindo 400/401/403/404/409 (NÃO retryable). **Nenhuma mudança foi necessária em `isRetryable()`/`syncResource()` — já estavam corretos.**
- Idempotência: `Consulta.idempotency_key`/`Prescricao.idempotency_key` (Prisma, `@unique`) + `criarComIdempotenciaSobColisao()` (backend, trata corrida de duas requisições com a mesma chave) — **já existia e já é suficiente**. Confirmado por leitura direta do backend (`consulta.service.ts`), não assumido.
- `retrySync()`/`sincronizarConsulta()` (`store.tsx`): já reutilizava a mesma `idempotency_key` entre tentativas (`c.sync?.consulta?.idempotency_key ?? newIdempotencyKey()`).

**O que NÃO existia (gaps reais encontrados):**
1. Nenhum guard contra duas chamadas **concorrentes** de `sincronizarConsulta` para a mesma consulta.
2. Nenhum guard de **sessão** — uma sincronização podia completar/continuar após logout+login de outro usuário.
3. Nenhum guard contra **re-sincronizar** uma consulta já `synced`.
4. `state.consultations` vivia **somente em memória React** — nunca persistido em `localStorage`.
5. Nenhuma recuperação automática ao voltar a ficar online.

---

## 2. Riscos identificados

### RISCO A — Duplicação por corrida de concorrência (🔴 crítico, corrigido)
Nada impedia um duplo clique em "tentar novamente" (ou um retry manual sobrepondo o auto-sync) de disparar **duas chamadas simultâneas** de `sincronizarConsulta` para a mesma consulta. Se ambas lessem `c.sync?.consulta?.idempotency_key` **antes** de qualquer dispatch da primeira tentativa aterrissar no estado, cada uma gerava uma `idempotency_key` **diferente** via `newIdempotencyKey()` — e a deduplicação do backend é por **igualdade de chave**, não por conteúdo. Duas chaves diferentes = dois POSTs reais = duplicação genuína no backend.

**Correção:** `podeSincronizar(c, emAndamento)` — um `Set<string>` de ids em sincronização (`emSincronizacaoRef`, no `AppProvider`) verificado **antes** de qualquer chamada de rede. Uma segunda chamada para o mesmo id, enquanto a primeira está em voo, é recusada como no-op.

### RISCO B — Vazamento de dado clínico entre usuários (🔴 crítico, corrigido)
`apiFetch()` lê o token de `localStorage` **no momento da chamada**, não antes. Se uma sincronização do usuário A ficasse pendente (rede lenta) e, nesse meio-tempo, A fizesse logout e B fizesse login no mesmo navegador, a chamada de **prescrição** (que depende do resultado da consulta) seria enviada usando o token **de B**, mas com os dados clínicos **de A** — uma escrita de dado de um paciente na conta errada.

**Correção:** o mesmo mecanismo de "sessão válida" já introduzido em RM-44 para paginação (`sessaoEpochRef`, incrementado a cada logout/troca real de usuário) foi estendido à sincronização. `sessaoValida()` é verificada:
- antes de cada dispatch de progresso (`onStatusChange`);
- antes do dispatch explícito de `backend_id`;
- **antes de iniciar a chamada de rede da prescrição** — o ponto crítico: se a sessão mudou, `criarPrescricao()` **nunca é chamado**, e o resultado é reportado como `prescricao: 'nao_tentada'`.

A chamada da CONSULTA já em voo não pode ser cancelada (não há `AbortController` nesta versão), mas seu resultado — que é um fato real ocorrido sob a sessão que a originou corretamente — nunca é aplicado ao estado local de uma sessão que já não é mais a atual (nenhum dispatch ocorre), e nenhuma chamada **subsequente** é iniciada sob a sessão errada.

### RISCO C — Re-sincronizar o que já sincronizou (🟡 médio, corrigido)
Sem um guard de status, um clique perdido em "tentar novamente" numa consulta já `synced` reenviaria o POST — inofensivo graças à idempotency_key (o backend retorna o registro existente), mas desperdiça uma chamada de rede e pisca o estado para `syncing` sem necessidade.

**Correção:** `podeSincronizar()` recusa quando `status === 'synced'` **ou** `status === 'syncing'` (esta segunda condição também cobre defensivamente uma consulta restaurada do localStorage — ver seção 5 — antes de ser normalizada).

### RISCO D — Perda de dado local em reload/crash (🔴 crítico, corrigido)
`state.consultations` nunca era persistido fora da memória React. Uma consulta `local`/`syncing`/`failed` — por definição, ainda **não confirmada pelo backend** — desaparecia por completo ao recarregar a página, fechar a aba por engano, ou uma queda de conexão que force o navegador a descartar o estado. Isso violava diretamente a regra "uma falha de rede não pode apagar a consulta local": embora a falha em si não apagasse nada, a AUSÊNCIA de qualquer persistência significava que qualquer evento de reload subsequente apagava.

**Correção:** ver seção 5 (persistência mínima).

### Risco considerado e descartado — 401/expiração de sessão
`apiFetch()` já: tenta refresh automático uma vez; se falhar, `clearTokens()` + redireciona para `/login` — nunca mantém o item como `synced` (confirmado: `isRetryable()` trata qualquer 4xx exceto 408/429 como não-retryable, então um 401 que sobrevive ao refresh vira `failed` imediatamente, nunca `synced`). Avaliei se a consulta pendente deveria **sobreviver** a esse evento (persistir através do 401) e decidi que **não**: a política de segurança já estabelecida do projeto (RM-38/FE-03 — nenhum dado clínico deve sobreviver a um logout numa estação compartilhada) trata a expiração forçada de sessão como equivalente a um logout para este efeito. A mesma chave de `localStorage` usada para a recuperação mínima (seção 5) tem o prefixo `prescreve_ai_`, então `clearTokens()` já a limpa automaticamente neste evento — nenhuma linha de código adicional foi necessária, e a garantia de privacidade permanece intacta.

---

## 3. Estratégia de idempotência (auditada, não reinventada)

Conforme instruído, o contrato existente foi **confirmado antes de qualquer implementação**:

| Pergunta | Resposta confirmada |
|---|---|
| Existe idempotency key? | Sim — `Consulta.idempotency_key`/`Prescricao.idempotency_key`, `@unique` no Prisma, gerada no CLIENTE (`newIdempotencyKey()`, UUID v4) |
| Existe client-generated ID? | Não para `Consulta`/`Prescricao` (`id` é `cuid()` do servidor) — a chave de idempotência É o identificador estável de origem |
| Existe deduplicação por identificador de origem? | Sim — `buscarPorIdempotencyKey()` + `criarComIdempotenciaSobColisao()` (trata corrida entre duas requisições com a MESMA chave: a perdedora recebe o registro já criado pela vencedora, não um erro) |
| O frontend pode repetir um POST cujo resultado já foi persistido? | Sim, com segurança — reenviar com a MESMA chave retorna o registro existente, nunca duplica |

**Nenhuma solução nova de idempotência foi inventada** — o mecanismo já era suficiente. O único gap real era no FRONTEND: garantir que a MESMA chave seja sempre reutilizada mesmo sob concorrência (Risco A, corrigido) — a chave em si já era corretamente reutilizada em retries sequenciais desde antes desta RM.

---

## 4. Política de retry

| Cenário | Comportamento |
|---|---|
| Erro de rede (sem `status`) | Retryable — até 3 tentativas, backoff exponencial (1s, 2s) |
| Timeout (15s por tentativa) | Retryable — mesma política |
| 5xx | Retryable |
| 408, 429 | Retryable (exceção dentro da faixa 4xx) |
| 400, 401, 403, 404, 409 | **NÃO retryable** — falha após 1 tentativa, nunca reenvia o mesmo payload |
| Retry manual (`retrySync`) | Sempre permitido para `local`/`failed`; recusado (no-op) para `synced`/`syncing` |
| Múltiplos cliques em retry | Segundo clique enquanto o primeiro está em voo é recusado (`podeSincronizar`) |
| Logout durante sync | `sessaoEpochRef` invalidado; nenhum dispatch/chamada subsequente ocorre sob a sessão encerrada |

Nenhum loop infinito é possível: `withRetry` (já existente) tem um teto fixo de 3 tentativas; o retry MANUAL é sempre uma ação explícita do usuário (clique) ou do evento `online` (não um poller).

---

## 5. Comportamento offline (mínimo necessário — sem PWA/service worker)

Verificado antes de implementar: **não existia nenhuma infraestrutura de offline** além do que `syncResource` já fazia (retry com backoff, que tolera uma queda de rede breve). Implementado apenas o mínimo pedido:

1. **Persistência de consultas pendentes** (`persistirConsultasPendentes`/`restaurarConsultasPendentes`, `store.tsx`) — grava em `localStorage` (chave `prescreve_ai_consultas_pendentes`) o subconjunto de `state.consultations` com `sync.consulta.status !== 'synced'`, a cada mudança de estado. Restaurado uma vez ao montar `AppProvider` (nunca em modo demo). Uma consulta restaurada com status `syncing` é normalizada para `failed` (o reload interrompeu a tentativa real; mostrar um spinner permanente seria enganoso — `failed` com retry explícito é honesto).
2. **Detecção de indisponibilidade / recuperação ao reconectar**: um único listener do evento nativo `window.addEventListener('online', ...)` — ao reconectar, dispara `sincronizarConsulta` para toda consulta `failed`. Sem polling, sem Service Worker, sem cache de rede — exatamente o evento que o navegador já oferece.

Ambos os mecanismos reutilizam os MESMOS guards (`podeSincronizar`, `sessaoValida`) já corrigidos — nenhuma superfície nova de risco foi introduzida.

---

## 6. Comportamento em logout

- `RESET_SESSION_DATA` (reducer) já limpava `consultations`/`activeConsultation`/`consultationDetailStatus`/`consultationsPagination` (RM-42/43/44) — inalterado.
- `logout()` (`AppProvider`) incrementa `sessaoEpochRef` **antes** de despachar `RESET_SESSION_DATA` — qualquer sincronização em voo iniciada pela sessão que está encerrando passa a falhar em `sessaoValida()` a partir deste ponto.
- `clearTokens()` (`api-client.ts`, já existente desde FE-03) continua limpando **todas** as chaves `prescreve_ai_*` — incluindo a nova chave de consultas pendentes (seção 5) — sem necessidade de nenhuma alteração nesse arquivo. A garantia "nenhum dado clínico sobrevive a um logout numa estação compartilhada" permanece válida e agora cobre também a fila de sincronização pendente.

---

## 7. Testes adicionados

### `frontend/src/tests/store-sync-resilience-rm45.test.ts` — 26 testes cobrindo os 20 cenários obrigatórios

| # | Cenário exigido | Teste |
|---|---|---|
| 1 | Sucesso | "1. sucesso" |
| 2 | Timeout com resposta eventualmente persistida | "2. timeout com resposta eventualmente persistida" |
| 3 | Retry sem duplicação | "3. retry sem duplicação" |
| 4 | Erro de rede | "4. erro de rede" |
| 5 | Erro 500 | "5. erro 500" |
| 6 | Erro 409 | "6. erro 409" |
| 7 | Erro 400 | "7. erro 400" |
| 8 | Erro 401 | "8. erro 401" |
| 9 | Consulta permanece local | "9. usuário não autenticado" + "9/11." (`podeSincronizar`) + persistência (seção "9/10.") |
| 10 | Failed preserva dados | "10. consulta 'failed' preserva TODOS os dados clínicos" |
| 11 | Retry manual | "9/11." (`podeSincronizar` permite local/failed) |
| 12 | Retry bem-sucedido | "12. retry bem-sucedido" |
| 13 | Múltiplos cliques em retry | "13/14." (`podeSincronizar` recusa mesmo id em andamento) |
| 14 | Sincronização simultânea | "13/14." (ids diferentes não se bloqueiam) |
| 15 | Logout durante sync | "15. logout durante sync" |
| 16 | Troca de usuário | "16. troca de usuário" |
| 17 | Resposta tardia | "17. resposta tardia" |
| 18 | backend_id gravado uma única vez | "18." (`podeSincronizar`) + teste 1 (dispatch único com backend_id) |
| 19 | Hidratação posterior não duplica | "19. hidratação posterior (RM-44) não duplica" |
| 20 | Dados locais não são sobrescritos | "20. dados locais não são sobrescritos por... OUTRA consulta" |

Testes adicionais: persistência/restauração local (4 testes, incluindo a normalização `syncing→failed`), `RESTORE_PENDING_CONSULTATIONS` (reducer), e um caso de "medicamento sem dose estruturada" (regressão do RM-36, preservada).

---

## 8. Resultados dos gates

| Gate | Resultado |
|---|---|
| Frontend `vitest run` (suíte completa) | ✅ **745/745** passando (35 arquivos — 26 novos do RM-45, 719 pré-existentes inalterados) |
| Frontend `tsc --noEmit` | ✅ limpo |
| Frontend `eslint` (arquivos alterados) | ✅ limpo |
| Frontend `npm run build` | ✅ sucesso (RM-23: 0 inconsistências; RM-24: 0 conflitos críticos) |
| Backend `tsc --noEmit` | ✅ limpo (nenhuma alteração de backend nesta RM) |
| Backend `jest` (unit) | ✅ 138/138 |
| Backend `jest` (e2e) | ✅ 128/128 |

Testes de RM-42/RM-43/RM-44 (`store-hydration-rm42`, `store-consultation-detail-rm43`, `store-pagination-rm44`) reverificados — **nenhuma alteração de asserção**, todos continuam passando.

---

## 9. Riscos remanescentes

- **Sem `AbortController`**: uma requisição de consulta já enviada não pode ser cancelada no meio do caminho — se o usuário fizer logout com uma sincronização em voo, o POST original ainda completará no backend com os dados corretos do usuário original (não é um risco de segurança, já que o token usado foi capturado no momento do envio), mas o navegador não pode "desistir" ativamente da requisição já em trânsito. Isso é aceitável dado que nenhum dado é enviado incorretamente — apenas potencialmente "tarde" — mas uma versão futura poderia usar `AbortController` para liberar recursos de rede mais cedo.
- **Persistência local não é criptografada**: a fila de consultas pendentes em `localStorage` está em texto plano, como todo o resto do armazenamento local deste app (mesmo nível de proteção que já existe para outros dados clínicos client-side — não é uma regressão, mas também não é uma melhoria de postura de segurança).
- **Evento `online` não cobre "conexão instável mas tecnicamemte online"**: o navegador só dispara `online`/`offline` em mudanças reais de conectividade de rede detectadas pelo SO; uma rede "capturada" (portal cativo) ou latência extrema não dispara esses eventos — nesses casos, a recuperação depende do retry manual do usuário, que continua disponível e funcional.
- **`emSincronizacaoRef`/`sessaoEpochRef` são refs em memória** (não sobrevivem a um reload) — isso é correto/esperado: o guard de concorrência só precisa existir enquanto a aba está viva; após um reload, a consulta restaurada tem seu status normalizado (`syncing`→`failed`) e uma nova tentativa começa do zero, sem nenhum "em andamento" fantasma.

---

## 10. Arquivos alterados

- `frontend/src/lib/store.tsx` — `podeSincronizar()`, `executarSincronizacaoConsulta()` + tipos (`SincronizarConsultaDeps`, `ResultadoSincronizacaoConsulta`) extraídos como funções puras testáveis; `persistirConsultasPendentes()`/`restaurarConsultasPendentes()`; ação/reducer `RESTORE_PENDING_CONSULTATIONS`; `AppProvider`: `emSincronizacaoRef` (guard de concorrência), `sincronizarConsulta` reescrito como wrapper fino sobre a função pura, efeitos de restauração/persistência local, efeito de recuperação ao reconectar (`online`), `logout()` agora incrementa `sessaoEpochRef`.
- `frontend/src/tests/store-sync-resilience-rm45.test.ts` — novo, 26 testes.

---

*RM-45 concluída. Nenhuma lógica terapêutica foi alterada; nenhuma expansão clínica foi iniciada.*
