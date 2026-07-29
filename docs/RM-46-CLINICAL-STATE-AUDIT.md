# RM-46 — Clinical State Lifecycle Audit

**Pré-requisitos:** RM-42 a RM-45 concluídos. Rodada de **auditoria e correção arquitetural** — nenhuma cobertura clínica foi expandida, nenhum protocolo/dose/recomendação foi alterado.

---

## 1. Escopo auditado

Mapeado o ciclo completo (login → restauração de sessão → hidratação → criação → edição → geração de prescrição → sincronização → falha → retry → paginação → detalhe → logout → troca de usuário → reload → expiração de sessão → resposta atrasada) através de:

- `frontend/src/lib/store.tsx` (reducer, ações, `AppProvider`, todas as funções puras extraídas em RM-43/44/45)
- `frontend/src/lib/api-client.ts`, `frontend/src/lib/sync-engine.ts`
- `frontend/src/app/consulta/nova/page.tsx` (o componente onde anamnese/diagnóstico/risco/conflitos/prescrição são efetivamente computados e editados)
- `frontend/src/app/{historico,prescricoes,page}.tsx`, `frontend/src/components/modules/PrescriptionPanel.tsx`
- `backend/src/modules/consulta/*`, `backend/src/modules/auth/*` (reconfirmação de achados já auditados em rodadas anteriores — JWT/refresh/MFA, ownership)
- `backend/prisma/schema.prisma`

A matriz completa está em [`docs/CLINICAL_STATE_LIFECYCLE_MATRIX.md`](CLINICAL_STATE_LIFECYCLE_MATRIX.md).

---

## 2. Achados e correções

### RM-46-01 — Erro no motor de risco clínico disfarçado de "anamnese incompleta"
- **Severidade:** 🔴 crítico
- **Arquivo:** `frontend/src/app/consulta/nova/page.tsx` (era inline; extraído para `frontend/src/lib/clinical-panel-safety.ts::avaliarRiscoSeguro`)
- **Causa:** `try { return avaliarRiscoClinico(anamnese, suggestions); } catch { return null; }` — uma exceção do motor (bug interno, formato de dado inesperado) produzia o MESMO `null` que "anamnese ainda não preenchida", e a UI mostrava a mensagem neutra "Anamnese incompleta — dados insuficientes para avaliação de risco" em ambos os casos.
- **Impacto:** um médico vendo essa mensagem com uma anamnese genuinamente completa não tinha como saber que o motor de risco *quebrou* em vez de simplesmente "ainda não ter dados suficientes" — poderia prosseguir prescrevendo sem NENHUMA avaliação de risco calculada, acreditando que só faltava preencher mais campos.
- **Correção:** `avaliarRiscoSeguro()` retorna um resultado de 3 estados (`sem_anamnese` / `erro` / `ok`); a UI agora mostra um alerta destrutivo explícito ("Erro ao calcular o risco clínico — não confie neste painel; revise manualmente") quando o motor falha, nunca a mensagem de dado ausente.
- **Teste de regressão:** `clinical-panel-safety-rm46.test.ts` — 3 testes, incluindo o caso-chave (motor lança exceção com anamnese PRESENTE → `status: 'erro'`, nunca `'sem_anamnese'`).

### RM-46-02 — Erro no motor de conflitos entre diretrizes disfarçado de "sem conflitos"
- **Severidade:** 🔴 crítico
- **Arquivo:** idem (`avaliarConflitosSeguro`)
- **Causa:** mesmo padrão — `catch { return []; }` fazia `conflitos.length === 0` renderizar um card **verde**, com ícone de sucesso, afirmando "Sem conflitos entre diretrizes — as principais sociedades científicas apresentam concordância" mesmo quando `detectarConflitos()` nunca terminou de rodar.
- **Impacto:** este é o achado mais grave da auditoria — uma falha de cálculo virava uma **afirmação de segurança positiva explícita** (não apenas neutra, como no caso do risco). Já havia sido identificado na auditoria RM-41 (achado `silent-error-masked-as-no-conflict`) mas não corrigido até esta rodada.
- **Correção:** mesmo padrão de 3 estados; erro agora mostra "Não foi possível verificar conflitos entre diretrizes para este diagnóstico — a checagem falhou, revise manualmente antes de prescrever", nunca o card verde.
- **Teste de regressão:** `clinical-panel-safety-rm46.test.ts` — 3 testes, incluindo o caso-chave (motor lança exceção → `status: 'erro'`, nunca `'ok'` com array vazio).

### RM-46-03 — Carregamento de detalhe sem guard de sessão (resposta tardia após troca de usuário)
- **Severidade:** 🟡 médio
- **Arquivo:** `frontend/src/lib/store.tsx` (`executarCarregamentoDetalhe`)
- **Causa:** RM-44 (paginação) e RM-45 (sincronização) já receberam o guard `sessaoValida()` contra resposta atrasada de uma sessão que não é mais a atual; RM-43 (carregamento de detalhe de consulta) foi implementado ANTES desse padrão existir e nunca foi retroativamente atualizado.
- **Impacto:** uma resposta de `GET /api/consulta/:id` chegando depois de um logout+login de outro usuário no mesmo navegador despacharia `HYDRATE_CONSULTATION_DETAIL`/`SET_CONSULTATION_DETAIL_STATUS` contra o estado do NOVO usuário. Na prática o impacto é baixo (o `backendId` usado como chave é um cuid globalmente único do Prisma — nunca colide com uma consulta do novo usuário — e `RESET_SESSION_DATA` já limpa `consultations`/`consultationDetailStatus` no logout), mas é uma inconsistência de padrão que deixava uma janela de corrida sem a MESMA defesa em profundidade aplicada em todo o resto do pipeline.
- **Correção:** `sessaoValida?()` adicionado como dependência opcional (compatível com chamadores existentes, default sempre válido); `AppProvider` agora passa o mesmo `sessaoEpochRef` já usado por paginação/sincronização.
- **Teste de regressão:** 3 novos testes em `store-consultation-detail-rm43.test.ts` (compatibilidade sem o parâmetro, resposta tardia descartada em sucesso e em erro).

### RM-46-04 — Identificador local de consulta instável (`Date.now().toString()`)
- **Severidade:** 🟠 alto
- **Arquivo:** `frontend/src/app/consulta/nova/page.tsx` (`initConsultation`)
- **Causa:** o `id` local de uma nova consulta era gerado por `Date.now().toString()` — resolução de 1 milissegundo. Como TODO o pipeline de merge/dedup/sincronização (RM-42/44/45) usa `id` como identificador ESTÁVEL (`podeSincronizar`, `emSincronizacaoRef`, `mesclarConsultasHidratadas`, o reducer inteiro via `consultations.map(c => c.id === updated.id ? updated : c)`), uma colisão de `id` entre duas consultas criadas no mesmo milissegundo faria o sistema tratá-las como a MESMA consulta — edição de uma sobrescrevendo a outra no array, ou o guard de concorrência de uma bloqueando indevidamente a sincronização da outra.
- **Impacto:** dado clínico de dois pacientes DIFERENTES sendo silenciosamente fundido/sobrescrito sob uma colisão de timing (duplo clique, duplo disparo de evento, automação).
- **Correção:** reutiliza `newIdempotencyKey()` (`@/lib/sync-engine`) — já testado para unicidade (100 chamadas, todas únicas) em `sync-engine.test.ts` — em vez de duplicar lógica de geração de UUID.
- **Teste de regressão:** nenhum teste NOVO necessário — a propriedade de unicidade relevante já é coberta pelo teste existente de `newIdempotencyKey()`; reutilizar a função testada é, em si, a correção mais defensável (evita duplicar E teria a mesma cobertura).

---

## 3. Itens investigados e considerados NÃO ser problemas confirmados (não corrigidos)

Por instrução explícita ("corrigir somente problemas confirmados", "evitar refatoração ampla sem benefício comprovado"), os seguintes achados foram investigados e **deliberadamente não alterados**:

- **Diagnóstico/RiskScore nunca persistidos no backend** (já documentado em RM-43: `criarDiagnostico`/`salvarRisco` nunca chamados pelo fluxo real). Reconfirmado nesta auditoria. Corrigir isso é uma expansão de contrato de sincronização, não uma correção pontual — permanece como risco aberto, documentado na matriz.
- **`sync.prescricao.backend_id` nunca gravado** (assimetria com `sync.consulta.backend_id`, que É gravado explicitamente). Nenhum consumidor atual lê esse campo — corrigir sem um consumidor real seria refatoração especulativa. Documentado como risco aberto na matriz.
- **Detalhe de consulta (`GET /api/consulta/:id`) traz `anamnese` real, mas o mapeamento atual só extrai `prescricoes`** — dado recuperável não aproveitado, mas não é um bug (nenhuma tela hoje precisa da anamnese histórica). Documentado como oportunidade futura, não corrigido.
- **Efeitos duplicados / closures desatualizadas**: revisados todos os `useCallback`/`useEffect` de `store.tsx` (dependências, refs, guards por `Set`) — nenhuma stale closure ou efeito duplicado confirmado. `sincronizarConsulta` tem deps `[]` intencional (só usa `dispatch`/refs estáveis).
- **Ausência de `AbortController`** nas chamadas de rede — já documentado como risco aceito em RM-45 (nenhum dado é enviado incorretamente, apenas potencialmente mais tarde que o ideal).
- **Lint pré-existente** (103 erros de React Compiler documentados em RM-41, incluindo 1 no próprio arquivo tocado nesta RM, linha 634, não relacionado às mudanças) — fora do escopo desta auditoria de ciclo de vida; corrigir em massa seria a "refatoração ampla" que a RM explicitamente pede para evitar.

---

## 4. Invariantes testadas (transição de estado + metamórficas)

Novo arquivo `frontend/src/tests/state-lifecycle-invariants-rm46.test.ts` (6 testes) cobrindo as invariantes mínimas exigidas que as suítes de RM-42/43/44/45 ainda não verificavam diretamente:

| Invariante | Coberta em |
|---|---|
| Logout remove todos os dados clínicos do usuário | `state-lifecycle-invariants-rm46` (verificação cruzada) + suítes RM-42/43/44/45 |
| Troca de usuário não mistura dados | Suítes RM-44/45 (`sessaoEpochRef`) |
| Hidratação não remove consulta pendente | Suíte RM-42/44 (`mesclarConsultasHidratadas`) |
| Sincronização não duplica consulta | Suíte RM-45 (`podeSincronizar`) |
| **Ordem de chegada das respostas não altera o estado final correto** | `state-lifecycle-invariants-rm46` — **novo**, metamórfico (A→B produz o mesmo conjunto que B→A) |
| **Carregar a mesma página duas vezes é idempotente** | `state-lifecycle-invariants-rm46` — **novo** |
| **Carregar o mesmo detalhe duas vezes é idempotente** | `state-lifecycle-invariants-rm46` — **novo** |
| Falha seguida de retry preserva o conteúdo | Suíte RM-45 |
| Ausência de detalhe não vira prescrição vazia | Suíte RM-43 + verificação cruzada nesta RM |

---

## 5. Gates — contagem antes/depois

| Gate | Antes (fim do RM-45) | Depois (RM-46) |
|---|---|---|
| Frontend `vitest run` | 745 testes, 35 arquivos | **760 testes, 37 arquivos** (+15: 6 `clinical-panel-safety-rm46` + 6 `state-lifecycle-invariants-rm46` + 3 novos em `store-consultation-detail-rm43`) |
| Frontend `tsc --noEmit` | limpo | limpo |
| Frontend `eslint` (arquivos alterados) | — | limpo (só o erro pré-existente não relacionado, linha 634 de `consulta/nova/page.tsx`) |
| Frontend `npm run build` | sucesso | sucesso (RM-23: 0 inconsistências; RM-24: 0 conflitos críticos) |
| Backend `tsc --noEmit` | limpo | limpo (nenhuma alteração de backend nesta RM) |
| Backend `jest` (unit) | 138/138 | 138/138 |
| Backend `jest` (e2e) | 128/128 | 128/128 |

Todas as suítes de RM-42/43/44/45 foram reverificadas e continuam passando **sem nenhuma alteração de asserção** — só os 3 testes novos foram adicionados a `store-consultation-detail-rm43.test.ts`.

---

## 6. Riscos abertos (não corrigidos nesta rodada, com justificativa)

1. **Diagnóstico e avaliação de risco nunca persistidos no backend** — expansão de contrato, fora de escopo ("não expandir cobertura clínica").
2. **`sync.prescricao.backend_id` nunca gravado** — sem consumidor real hoje; correção especulativa evitada.
3. **Anamnese recuperável do detalhe não é aproveitada pelo mapeamento atual** — oportunidade futura, não um bug.
4. **Offset pagination pode, em teoria, pular um item sob escrita concorrente entre duas chamadas de "carregar mais"** — já documentado em RM-44; mudaria o contrato de paginação do backend (cursor em vez de skip/take) para eliminar completamente, fora de escopo de uma correção pontual.
5. **103 erros de lint do React Compiler pré-existentes** (RM-41) — não relacionados ao ciclo de vida clínico; corrigir em massa seria refatoração ampla sem relação direta com esta auditoria.

---

## 7. Decisão de prontidão

O ciclo de vida do estado clínico, após RM-42 a RM-46, está **estruturalmente coerente**: identificadores estáveis, merge nunca por nome/data/diagnóstico, isolamento de sessão consistente em TODOS os três subsistemas assíncronos (paginação, sincronização, carregamento de detalhe), persistência mínima e honesta de dados pendentes, e — com as correções desta rodada — **nenhum fallback clínico silencioso conhecido** nos dois motores mais sensíveis (risco e conflitos entre diretrizes).

Os riscos remanescentes (seção 6) são gaps de **cobertura de persistência** (dados que o backend já modela mas que o fluxo atual não envia) ou de **robustez teórica sob condições raras de concorrência** — nenhum deles é um fallback silencioso, uma duplicação ativa, ou um vazamento de dado entre usuários.

**Recomendação: APTO PARA CONTINUAR**, condicionado a tratar os itens 1–2 da seção 6 (persistência de diagnóstico/risco) antes de qualquer feature que dependa desses dados estarem no servidor (ex.: auditoria clínica centralizada, segunda opinião remota, relatórios regulatórios) — não são bloqueadores do estado atual do produto, mas são bloqueadores de qualquer expansão que assuma que esses dados já chegam ao backend.

---

## 8. Arquivos alterados

- `frontend/src/lib/clinical-panel-safety.ts` — **novo**: `avaliarRiscoSeguro()`, `avaliarConflitosSeguro()` (RM-46-01/02).
- `frontend/src/app/consulta/nova/page.tsx` — usa as funções acima; UI de erro explícita nas abas de risco/conflitos; `initConsultation` usa `newIdempotencyKey()` (RM-46-04).
- `frontend/src/lib/store.tsx` — `executarCarregamentoDetalhe` ganha `sessaoValida?()` opcional; `carregarDetalheConsulta` passa `sessaoEpochRef` (RM-46-03).
- `frontend/src/tests/clinical-panel-safety-rm46.test.ts` — novo, 6 testes.
- `frontend/src/tests/state-lifecycle-invariants-rm46.test.ts` — novo, 6 testes.
- `frontend/src/tests/store-consultation-detail-rm43.test.ts` — +3 testes (guard de sessão).
- `docs/CLINICAL_STATE_LIFECYCLE_MATRIX.md` — novo.
- `docs/RM-46-CLINICAL-STATE-AUDIT.md` — este documento.

---

*RM-46 concluída. Nenhuma expansão de cobertura clínica, protocolo terapêutico, dose ou recomendação foi alterada.*
