# RM-43 — Consultation Detail Hydration & Real Prescription Recovery

**Escopo:** carregamento sob demanda do detalhe completo de uma consulta persistida (incluindo a prescrição real), sem fabricar dados e sem sobrecarregar a hidratação inicial da lista (RM-42). Não houve alteração de protocolos terapêuticos, núcleo farmacológico, nem início de expansão clínica.

---

## 1. Contrato encontrado (Etapa 1 — auditoria)

Antes de escrever qualquer código, o backend/frontend existentes foram inspecionados:

- **`GET /api/consulta/:id`** já existia (`consulta.controller.ts:51-57` → `ConsultaService.buscarConsulta`), protegido por `@UseGuards(JwtAuthGuard)` no nível do controller, já filtrando por `usuario_id` (`findFirst({ where: { id, usuario_id: usuarioId, deletado_em: null } })`) e já lançando `NotFoundException` (404) tanto para "não existe" quanto para "pertence a outro usuário" — sem vazar existência. Coberto por `ownership-authorization.e2e-spec.ts` (4 testes já existentes, todos verificados como passando após a mudança).
- **`Prescricao.medicamentos`** (Prisma, `schema.prisma:261`) já é um campo `Json` contendo o array real de `ItemMedicamentoDto` exatamente como enviado pelo cliente em `POST /api/prescricao` (`consulta.service.ts` grava via `JSON.parse(JSON.stringify(dto.medicamentos))`, sem transformação). Esta é a fonte de verdade real da prescrição — nunca havia necessidade de reconstruí-la de outro lugar.
- **`GET /api/consultas`** (listagem paginada, RM-42) já incluía `prescricoes: { take: 1, select: { id, status } }` — um resumo real (existe/não existe prescrição), mas sem os itens.
- **Frontend**: `consultaApi.buscar(id)` já existia em `api-client.ts` (definido, mas sem nenhum call site real fora de testes) e já tinha o comportamento correto de modo demo/erro. `store.tsx` (RM-42) já hidratava a lista via `consultaApi.listar()`, com merge que preserva consultas locais não sincronizadas e deduplica por `backend_id`.
- **Páginas**: `/historico` e `/prescricoes` (`frontend/src/app/`) consomem `state.consultations`; `/prescricoes` antes filtrava só por `c.prescricao` (objeto completo, só presente para consultas criadas na sessão atual).

**Conclusão da auditoria:** nenhum endpoint novo era necessário — o contrato certo já existia e só precisava ser (a) levemente reformatado na resposta (remover campos internos) e (b) conectado ao frontend de forma correta e testável.

---

## 2. Endpoint reutilizado (não foi criado nenhum novo)

`GET /api/consulta/:id` foi mantido na mesma rota, mesmo guard, mesma checagem de ownership. Única mudança: a resposta agora passa por `mapConsultaDetalhe()` (`consulta.service.ts`), uma função de mapeamento explícita que:

- remove campos puramente internos do servidor: `usuario_id` (redundante ao contexto de autenticação), `idempotency_key` (mecanismo de dedup do servidor) e `hash_integridade` (integridade interna) — tanto da consulta quanto de cada prescrição;
- remove `risco_scores`/`trust_scores` do `include` da query (não utilizados por este endpoint nesta RM — reduz overfetching; nenhum consumidor dependia deles);
- preserva 100% dos dados clínicos reais: `anamnese`, `diagnosticos[]` (cid/descrição/confiança/selecionado/criado_em) e `prescricoes[]` (id/status/**medicamentos**/orientações/validade_dias/diagnostico_id/criado_em).

### Campos retornados (`ConsultaDetalheResponse`)

```ts
{
  id: string;
  status: string;
  anamnese: JsonValue;
  criado_em: Date;
  atualizado_em: Date;
  diagnosticos: { id, cid, descricao, confianca, selecionado, criado_em }[];
  prescricoes: { id, status, medicamentos: MedicamentoPrescrito[], orientacoes, validade_dias, diagnostico_id, criado_em }[];
}
```

---

## 3. Estratégia de carregamento sob demanda

- **Nunca eager**: a hidratação da lista (`GET /api/consultas`, RM-42) permanece limitada ao resumo (`{id, status}` da prescrição) — nenhuma das 50 consultas tem seu detalhe completo buscado automaticamente.
- **Sob demanda real**: o detalhe só é buscado quando `carregarDetalheConsulta(consultaId)` é chamado — hoje disparado pelo botão "Carregar detalhes" em `/prescricoes` (ver seção 7), reutilizável por qualquer outra tela futura (histórico, painel de detalhe) sem duplicar lógica.
- **Granularidade por consulta**: `state.consultationDetailStatus: Record<backendId, 'idle'|'loading'|'loaded'|'failed'>` — nunca um loading global; abrir/carregar uma consulta não afeta o estado de nenhuma outra.

---

## 4. Estratégia anti-duplicação

Implementada em `executarCarregamentoDetalhe()` (função pura, `store.tsx`), chamada pelo callback `carregarDetalheConsulta` do `AppProvider`:

1. Resolve o **`backend_id` real** da consulta (via `sync.consulta.backend_id`) — nunca dispara sem ele (consulta ainda local/syncing/failed não tem detalhe para buscar).
2. Se o status atual para esse `backend_id` já é `'loading'`, **não dispara nova requisição** (evita corrida de cliques duplos).
3. Se já é `'loaded'`, **reutiliza o estado** — não refaz a busca (o histórico clínico já emitido não muda depois).
4. Se é `'failed'`, uma nova chamada **tenta novamente** (retry explícito, nunca bloqueado).

---

## 5. Regras de preservação de estado local

- `HYDRATE_CONSULTATION_DETAIL` só escreve no campo **novo e independente** `prescricoesRecuperadas` — nunca toca em `c.prescricao` (o objeto completo criado pelo assistente de prescrição ATIVO nesta sessão). Uma prescrição local pendente/recém-criada nunca é substituída por uma resposta do backend.
- A consulta afetada é localizada pelo **`backend_id`**, nunca pelo `id` local — necessário porque uma consulta criada nesta sessão e já sincronizada tem `id` local (UUID do cliente) diferente do `id` do servidor.
- `RESET_SESSION_DATA` (logout) agora também limpa `consultationDetailStatus` — sem isso, o estado de carregamento (chaveado por `backend_id`) do usuário que saiu ficaria sem significado nenhum para o próximo login na mesma aba, e um `'loaded'` residual poderia mascarar a ausência real de dado carregado para a nova sessão.

---

## 6. Regras de integridade anti-fabricação (aplicadas)

- `PrescricaoRecuperada` (novo tipo, `types.ts`) é **deliberadamente distinto** de `Prescription` (usado pelo assistente de prescrição ativo). `Prescription` exige `tipo`/`paciente`/`medico`/itens com `concentracao`/`forma_farmaceutica`/`quantidade`/`posologia` — campos que o backend **nunca armazenou** para uma prescrição já emitida. Forçá-los exigiria fabricar (nome padrão, string vazia, valor inferido) exatamente o que a RM proíbe. `PrescricaoRecuperada` expõe só os campos reais: `medicamentos: MedicamentoPrescrito[]` (a mesma estrutura real enviada originalmente), `orientacoes`, `validade_dias`, `diagnostico_id`, `criado_em`.
- `temPrescricaoNoBackend` é um **fato real de três estados** (`true`/`false`/`undefined`) vindo do resumo já existente na listagem — nunca inferido da ausência de dado.
- Resposta `null`/erro do endpoint de detalhe **nunca** vira `prescricoesRecuperadas: []` — vira status `'failed'`, distinto de `'loaded'` com array vazio genuíno (consulta que realmente não tem prescrição).
- UI (`/prescricoes`) mostra texto explícito para cada estado — `idle`: "Prescrição registrada no servidor — detalhes da prescrição ainda não carregados."; `loading`: "Carregando…"; `failed`: "Não foi possível carregar os detalhes desta prescrição." + botão de retry; `loaded`: lista real dos medicamentos (molécula/dose estruturada formatada/duração/observações, todos dados reais).

---

## 7. Limitação de escopo de UI (documentada, não escondida)

`/historico` **não** ganhou uma tela de detalhe/clique nesta RM — a infraestrutura de carregamento sob demanda (store + tipos + API) está pronta e testada, mas o único ponto de UI conectado é `/prescricoes` (a página cuja limitação motivou originalmente o achado do RM-38/RM-42). Justificativa: construir uma nova rota de detalhe de consulta é uma feature de UI maior, não estritamente necessária para provar/entregar a infraestrutura de carregamento sob demanda pedida, e arriscaria expandir escopo além do "menor passo necessário". `carregarDetalheConsulta`/`state.consultationDetailStatus` estão prontos para reuso imediato por uma futura tela de detalhe de `/historico`.

---

## 8. Testes adicionados

### Backend (`consulta.service.spec.ts`) — 3 novos, todos no bloco `buscarConsulta()`
1. Expõe os medicamentos **reais** de cada prescrição vinculada, com `idempotency_key`/`hash_integridade` explicitamente ausentes da resposta.
2. Nunca expõe `usuario_id`/`idempotency_key` da própria consulta.
3. Consulta sem nenhuma prescrição retorna array vazio real (não fabricado, não omitido).

Os 2 testes de ownership já existentes (`buscarConsulta`) foram reverificados e continuam passando sem alteração.

### Frontend (`store-consultation-detail-rm43.test.ts`) — 20 testes, cobrindo os 13 cenários obrigatórios
| # | Cenário exigido | Teste(s) |
|---|---|---|
| 1 | Consulta persistida sem detalhe inicial | "1. consulta persistida sem detalhe inicial" |
| 2 | Carregamento bem-sucedido | "2. carregamento bem-sucedido do detalhe" |
| 3 | Recuperação dos itens reais | "3. recupera os itens REAIS" |
| 4 | Consulta sem prescrição real | "4. consulta sem prescrição real" |
| 5 | Erro do endpoint | "5. erro do endpoint" |
| 6 | Retry após erro | "6. retry após erro" |
| 7 | Evitar requisição duplicada | "7." e "7b." (loading e loaded) |
| 8 | Preservar consulta local `local` | "8." |
| 9 | Preservar consulta `syncing` | "9." |
| 10 | Preservar consulta `failed` | "10." |
| 11 | Impedir acesso a consulta de outro usuário | reforçado no backend (ownership e2e, já existente); no frontend, "11. nunca busca detalhe de uma consulta que não pertence à lista/ativa" |
| 12 | Não converter dado ausente em prescrição vazia | "12." (resposta `null` → `failed`, nunca `loaded` com array vazio) |
| 13 | Logout durante/após carregamento | "13." e "13b." |

Testes adicionais de reducer (`SET_CONSULTATION_DETAIL_STATUS`, `HYDRATE_CONSULTATION_DETAIL` localizando por `backend_id`, nunca tocando em `prescricao`) e de `mapBackendConsultaToConsultation` (`temPrescricaoNoBackend` como fato de 3 estados) também incluídos.

`store-hydration-rm42.test.ts` foi ajustado (campo `consultationDetailStatus` adicionado ao fixture `baseState`) para continuar compilando com o novo campo de estado — sem alteração de comportamento testado.

### Integração/e2e do backend
A arquitetura já tinha o padrão (`ownership-authorization.e2e-spec.ts`) cobrindo `GET /api/consulta/:id` por HTTP real (guards + pipes + controller reais, Prisma mockado) com os 4 cenários relevantes (dono lê 200, terceiro lê 404, inexistente responde igual a "de outro usuário", ADMIN não é bypass de ownership) — reverificado e passando sem necessidade de novos casos, já que a mudança desta RM foi só no formato da resposta, não na lógica de autorização.

---

## 9. Resultados dos gates

| Gate | Resultado |
|---|---|
| Frontend `vitest run` (suíte completa) | ✅ 698/698 passando (33 arquivos) |
| Backend `jest` (unit) | ✅ 138/138 passando (14 suítes) |
| Backend `jest` (e2e) | ✅ 128/128 passando (9 suítes) |
| Frontend `tsc --noEmit` | ✅ limpo |
| Backend `tsc --noEmit` | ✅ limpo |
| Frontend `eslint` (arquivos alterados) | ✅ limpo |
| Backend `eslint` (arquivos alterados) | ✅ limpo |
| Frontend `npm run build` | ✅ sucesso (inclui gates RM-23: 0 inconsistências; RM-24: 0 conflitos críticos) |
| Backend `npm run build` | ✅ sucesso (`prisma generate` + `nest build`) |

Verificação visual em navegador (`next dev`) não foi conclusiva neste ambiente — o servidor de desenvolvimento retornou 404 em **toda** rota testada, inclusive `/login` (nunca tocada nesta RM), confirmando que é uma particularidade do ambiente de sandbox e não uma regressão introduzida. O build de produção (`npm run build`) gerou `/prescricoes` como página estática com sucesso, o sinal autoritativo disponível para esta verificação.

---

## 10. Limitações restantes

- `/historico` não tem um ponto de entrada de UI para `carregarDetalheConsulta` (ver seção 7) — a infraestrutura está pronta, falta só a conexão de UI numa RM futura.
- Uma consulta pode ter mais de uma `Prescricao` no modelo do backend; `prescricoesRecuperadas` já é modelado como array por isso, mas a UI atual apenas concatena os medicamentos de todas em uma lista única (sem agrupar visualmente por prescrição/data de emissão) — suficiente para o objetivo desta RM (provar que os dados reais são recuperáveis), mas uma UI mais rica poderia separar por prescrição.
- Não há invalidação de cache de detalhe: uma vez `'loaded'`, o detalhe nunca é re-buscado automaticamente. Isso é intencional (histórico clínico já emitido não muda), mas se uma feature futura permitir editar uma prescrição já emitida, será necessário um mecanismo de invalidação explícito.
- Verificação end-to-end em navegador real (não apenas testes unitários/build) não foi possível neste ambiente de sandbox (ver seção 9).

---

## 11. Arquivos alterados

### Backend
- `backend/src/modules/consulta/consulta.service.ts` — `buscarConsulta()` agora retorna `ConsultaDetalheResponse` via `mapConsultaDetalhe()`; novos tipos `ConsultaDetalheResponse`/`DiagnosticoDetalheResponse`/`PrescricaoDetalheResponse`/`ConsultaComRelacoes`.
- `backend/src/modules/consulta/consulta.service.spec.ts` — 3 novos testes no bloco `buscarConsulta()`.

### Frontend
- `frontend/src/lib/types.ts` — novos tipos `ConsultationDetailStatus`, `PrescricaoRecuperada`; `Consultation` ganha `temPrescricaoNoBackend?`/`prescricoesRecuperadas?`.
- `frontend/src/lib/api-client.ts` — `consultaApi.buscar()` agora tipado (`ConsultaDetalheResponse | null`, sem `any`).
- `frontend/src/lib/store.tsx` — `AppState.consultationDetailStatus`; ações `SET_CONSULTATION_DETAIL_STATUS`/`HYDRATE_CONSULTATION_DETAIL`; `mapBackendConsultaToConsultation` ganha `temPrescricaoNoBackend`; `RESET_SESSION_DATA` limpa o novo estado; função pura exportada `executarCarregamentoDetalhe()`; callback `carregarDetalheConsulta` exposto via `useApp()`.
- `frontend/src/app/prescricoes/page.tsx` — inclui consultas históricas com `temPrescricaoNoBackend`, novo componente `PrescricaoRecuperadaCard` com os 4 estados explícitos (idle/loading/loaded/failed) e botão de carregar/retry.
- `frontend/src/tests/store-consultation-detail-rm43.test.ts` — novo, 20 testes.
- `frontend/src/tests/store-hydration-rm42.test.ts` — ajuste de fixture (`consultationDetailStatus: {}`) para compilar com o novo campo de estado.

---

*RM-43 concluída. Nenhuma expansão clínica, alteração de protocolo terapêutico ou do núcleo farmacológico foi realizada.*
