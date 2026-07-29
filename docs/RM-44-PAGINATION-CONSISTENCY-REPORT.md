# RM-44 — Pagination, Incremental History & Data Consistency

**Pré-requisito:** executada após RM-43 (aprovada). Nenhum protocolo terapêutico, núcleo farmacológico ou expansão clínica foi alterado.

---

## 1. Contrato real (auditoria inicial)

Antes de qualquer código, `GET /api/consultas` (`backend/src/modules/consulta/consulta.service.ts::listarConsultas`) foi lido linha a linha:

```ts
async listarConsultas(usuarioId: string, pagina = 1, limite = 20) {
  const skip = (pagina - 1) * limite;
  const [total, consultas] = await Promise.all([
    this.prisma.consulta.count({ where: { usuario_id: usuarioId, deletado_em: null } }),
    this.prisma.consulta.findMany({
      where: { usuario_id: usuarioId, deletado_em: null },
      orderBy: { criado_em: 'desc' },
      skip, take: limite,
      include: { diagnosticos: {...}, prescricoes: {...} },
    }),
  ]);
  return { total, pagina, limite, consultas };
}
```

**Confirmado (nada assumido sem checar):**
- **Formato real da resposta:** `{ total: number, pagina: number, limite: number, consultas: [...] }`. **Não existem** `totalPaginas`/`hasNextPage`/metadados equivalentes no backend — o frontend precisa derivá-los de `total`/`limite`/`pagina`.
- **`pagina`/`limite`:** validados por `PaginacaoQueryDto` (`consulta.dto.ts:407-421`) — `pagina` mínimo 1 (default 1), `limite` mínimo 1 e **máximo 100** (default **20**). Usei `20` como `pageSize` padrão do frontend, batendo com o default real do backend (o RM-43 tinha usado `50` arbitrariamente — corrigido aqui para refletir o contrato real).
- **Ordenação:** `orderBy: { criado_em: 'desc' }` — mais recente primeiro, fixa, sem parâmetro de ordenação alternativa exposto.
- **Filtros:** só `usuario_id` (implícito, via JWT) e `deletado_em: null` — nenhum filtro de data/status/texto é aceito pelo endpoint hoje.
- **Página vazia:** `findMany` com `skip` além do fim retorna `[]`; `count` retorna o total real inalterado. Resposta 200 normal, `consultas: []`, `total` correto — nunca um erro ou 404.
- Nenhuma alteração foi feita no backend nesta RM — o contrato já era suficiente.

---

## 2. Modelo de paginação implementado

`frontend/src/lib/store.tsx` — `ConsultationsPaginationState`, adaptado ao modelo real do projeto (`AppState`/`Action`/reducer já existentes, sem uma lib de data-fetching):

```ts
export interface ConsultationsPaginationState {
  currentPage: number;      // 0 = nenhuma página carregada com sucesso ainda
  pageSize: number;
  total: number | null;     // null = backend ainda não confirmou (nunca fabricado como 0)
  totalPages: number | null;
  hasNextPage: boolean;
  isLoading: boolean;       // carregando a PRIMEIRA página
  isLoadingMore: boolean;   // carregando uma página seguinte
  error: string | null;         // erro na carga INICIAL
  loadMoreError: string | null; // erro ao carregar MAIS — independente do anterior
}
```

`total`/`totalPages` usam `null` (não `0`) como "ainda não sabemos" — a mesma convenção anti-fabricação já usada em `temPrescricaoNoBackend` (RM-43): um valor real de zero (histórico genuinamente vazio) nunca é indistinguível de "não verificado ainda". `error`/`loadMoreError` são campos independentes propositalmente: uma falha ao carregar mais nunca reexibe/confunde com uma falha antiga da carga inicial (que pode já ter sido superada por um retry bem-sucedido).

`totalPages`/`hasNextPage` são **calculados no frontend** a cada resposta (`Math.ceil(total/limite)`, `pagina < totalPages`) — nunca confiados a um campo que o backend não envia.

---

## 3. Estratégia de merge

Extraída para uma função pura compartilhada, `mesclarConsultasHidratadas()` (`store.tsx`), usada tanto pela ação legada `HYDRATE_CONSULTATIONS` (RM-42, mantida intacta por compatibilidade) quanto pela nova `HYDRATE_CONSULTATIONS_PAGE`:

1. **Consulta local nunca sincronizada** (`sync.consulta.status !== 'synced'`, ou seja `local`/`syncing`/`failed`) é **sempre preservada tal como está** — a hidratação nunca a toca.
2. **Consulta já sincronizada** cujo `id`/`backend_id` aparece no lote atual é **atualizada** com os dados frescos do backend — mas **preserva `prescricoesRecuperadas`** (RM-43, detalhe carregado sob demanda) se já existia localmente, já que o resumo paginado nunca traz esse campo (sem essa regra, uma consulta cujo detalhe já foi carregado perderia esse detalhe silenciosamente na primeira atualização de página seguinte).
3. **Consulta já sincronizada de uma página anterior**, não revisitada pelo lote atual, é preservada — nunca duplicada nem descartada.
4. **Consultas novas do backend** são adicionadas ao final, preservando a ordem relativa retornada (mais recentes primeiro).

**Identificadores usados para deduplicar: exclusivamente `id` e `sync.consulta.backend_id`.** Nunca nome do paciente, data isolada, diagnóstico ou texto da consulta — confirmado por leitura do código (`mesclarConsultasHidratadas` só compara por essas duas chaves) e coberto pelo teste #10 (mesma consulta reaparecendo em duas páginas — cenário real de offset pagination sob escrita concorrente — nunca duplica).

---

## 4. Controle de concorrência

Duas camadas de proteção, ambas na orquestração pura (`executarCarregamentoPaginaInicial`/`executarCarregarMaisConsultas`, testáveis sem renderizar componente):

- **Prevenção de chamada duplicada/simultânea:** `executarCarregamentoPaginaInicial` recusa (`'skipped'`) se `isLoading` já é `true`; `executarCarregarMaisConsultas` recusa se `isLoading` OU `isLoadingMore` já é `true`, OU se `hasNextPage` já é `false` (fim explícito — nunca busca além do que o backend confirmou existir).
- **Bloqueio por página:** como o estado `isLoading`/`isLoadingMore` é único por lista (não por número de página), duas chamadas de "carregar mais" disparadas antes da primeira resolver são estruturalmente impedidas de coexistir — a segunda vê `isLoadingMore === true` e é recusada antes de qualquer requisição de rede.
- **Retry explícito:** um erro (`error`/`loadMoreError` preenchido) NUNCA bloqueia uma nova tentativa — só `isLoading`/`isLoadingMore` bloqueiam. Iniciar uma nova tentativa (`SET_PAGINATION_LOADING true`) já limpa o erro anterior imediatamente no reducer, antes mesmo da resposta chegar.

---

## 5. Isolamento entre usuários/sessões

Mecanismo introduzido: `sessaoEpochRef` (um contador em `useRef` dentro de `AppProvider`), incrementado:
- a cada `logout()` explícito;
- a cada detecção de uma NOVA sessão real (uid diferente do último processado, no mesmo efeito que já fazia essa checagem para a hidratação do RM-42) — cobre tanto logout→login quanto uma restauração de sessão diferente ao montar.

Cada chamada de `carregarPrimeiraPagina()`/`carregarMaisConsultas()` captura o epoch **no início** (`const epoch = sessaoEpochRef.current`) e só aplica o resultado se `sessaoEpochRef.current === epoch` no momento em que a resposta (ou erro) chega — verificado ANTES de qualquer `dispatch` de dado ou erro. Se a sessão mudou nesse meio-tempo, a resposta é **descartada silenciosamente** (nem dado é hidratado, nem erro é reportado — reportar um erro de uma sessão que não é mais a atual seria tão enganoso quanto reportar sucesso).

`RESET_SESSION_DATA` (logout) também zera `consultationsPagination` para `INITIAL_PAGINATION` — total/páginas de uma conta nunca sobrevivem para a próxima, mesmo sem uma resposta atrasada envolvida.

---

## 6. UI (`/historico`)

Estados diferenciados explicitamente (nenhum deles reutiliza a mensagem de outro):

| Estado | Condição | Texto |
|---|---|---|
| Carregamento inicial | `isLoading && currentPage === 0` | "Carregando histórico de consultas…" (spinner) |
| Falha ao carregar (inicial) | `error && currentPage === 0` | "Não foi possível carregar o histórico de consultas." + botão "Tentar novamente" |
| Histórico vazio | lista filtrada vazia, sem busca ativa, e não em loading/erro inicial | "Nenhuma consulta encontrada" |
| Resultado parcial / carregando mais | `isLoadingMore` | "Carregando mais…" |
| Falha ao carregar mais | `loadMoreError` | "Não foi possível carregar mais consultas." + botão "Tentar novamente" |
| Fim do histórico | `!hasNextPage && currentPage > 0` | "Fim do histórico." |
| "Carregar mais" disponível | `hasNextPage && !isLoadingMore && !loadMoreError` | botão "Carregar mais" |

**Nunca** mostra "Nenhuma consulta encontrada" durante `carregandoPrimeiraVez` ou `falhouCargaInicial` — essas duas condições são checadas e excluídas antes de renderizar a lista/estado vazio (guard explícito no JSX). O cabeçalho da página passa a mostrar o **total real confirmado pelo backend** (`total` consultas no total) em vez de `state.consultations.length` (que é só o que já foi carregado localmente) sempre que a paginação está ativa.

Paginação só é exibida quando `auth.backendMode && !auth.demoMode` — em modo demo (dado fictício, RM-38) a lista inteira já está disponível localmente e a paginação nunca roda (comportamento inalterado nesse modo).

---

## 7. Testes adicionados

### `frontend/src/tests/store-pagination-rm44.test.ts` — 21 testes cobrindo os 19 cenários obrigatórios

| # | Cenário exigido | Teste |
|---|---|---|
| 1 | Primeira página | "1. primeira página" |
| 2 | Segunda página | "2. segunda página" |
| 3 | Múltiplas páginas | "3. múltiplas páginas" |
| 4 | Fim da paginação | "4. fim da paginação" |
| 5 | Página vazia | "5. página vazia" |
| 6 | Erro inicial | "6. erro inicial" |
| 7 | Erro ao carregar mais | "7. erro ao carregar mais" |
| 8 | Retry | "8. retry" |
| 9 | Prevenção de requisição duplicada | "9a." e "9b." |
| 10 | Deduplicação entre páginas | "10." |
| 11 | Preservação de consulta local | "11." |
| 12 | Preservação de syncing | "12." |
| 13 | Preservação de failed | "13." |
| 14 | Atualização de consulta já sincronizada | "14." (preserva `prescricoesRecuperadas`) |
| 15 | Logout | "15." |
| 16 | Troca de usuário | "16." |
| 17 | Resposta atrasada da conta anterior | "17." e "17b." (caminho de sucesso e de erro) |
| 18 | Ordenação mantida | "18." |
| 19 | Total e metadados corretos | "19." (casos não-exatos: total=7, limite=3) |

### Compatibilidade com RM-42/RM-43

`store-hydration-rm42.test.ts` e `store-consultation-detail-rm43.test.ts` foram ajustados **só no fixture** (`consultationsPagination: INITIAL_PAGINATION` adicionado ao `baseState()`, exigido pelo novo campo do `AppState`) — **nenhuma asserção de comportamento foi alterada**. Os 32 testes desses dois arquivos continuam passando sem modificação de lógica.

---

## 8. Resultados dos gates

| Gate | Resultado |
|---|---|
| Frontend `vitest run` (suíte completa) | ✅ **719/719** passando (34 arquivos — 21 novos do RM-44, 32 do RM-42/RM-43 inalterados) |
| Frontend `tsc --noEmit` | ✅ limpo |
| Frontend `eslint` (arquivos alterados) | ✅ limpo |
| Frontend `npm run build` | ✅ sucesso (RM-23: 0 inconsistências; RM-24: 0 conflitos críticos) |
| Backend `tsc --noEmit` | ✅ limpo (nenhuma alteração de backend nesta RM) |
| Backend `jest` (unit) | ✅ 138/138 |
| Backend `jest` (e2e) | ✅ 128/128 |

---

## 9. Limitações restantes

- **Offset pagination (skip/take):** se consultas forem criadas/deletadas concorrentemente entre duas chamadas de "carregar mais", um item pode teoricamente deslocar de página (limitação inerente a `skip`/`take`, não introduzida nem corrigida por esta RM). A deduplicação por `id`/`backend_id` garante que isso nunca produz uma DUPLICATA visível, mas não garante que nenhum item seja pulado nesse cenário raro — uma paginação por cursor (`criado_em`+`id`) seria mais robusta a isso, mas exigiria mudança de contrato no backend, fora do escopo desta RM.
- **`pageSize` fixo (20):** não há UI para o usuário escolher quantos itens por página; segue o default real do backend.
- **`/prescricoes` não tem paginação própria:** continua consumindo `state.consultations` (compartilhado), então se beneficia automaticamente de mais páginas carregadas via `/historico`, mas não tem seu próprio "carregar mais" independente — não fazia parte do escopo desta RM (que é sobre a lista/paginação em si, já resolvida uma vez no estado global).
- Verificação end-to-end em navegador real não foi possível neste ambiente de sandbox (mesma limitação já registrada no relatório do RM-43 — o servidor de desenvolvimento retorna 404 em toda rota, incluindo rotas não tocadas por esta RM). Verificação feita via testes unitários (719 passando) e build de produção bem-sucedido.

---

## 10. Arquivos alterados

- `frontend/src/lib/store.tsx` — `ConsultationsPaginationState`/`INITIAL_PAGINATION`; ações `SET_PAGINATION_LOADING`/`SET_PAGINATION_LOADING_MORE`/`SET_PAGINATION_ERROR`/`SET_PAGINATION_LOAD_MORE_ERROR`/`HYDRATE_CONSULTATIONS_PAGE`/`RESET_PAGINATION`; `mesclarConsultasHidratadas()` (merge compartilhado, extraído de `HYDRATE_CONSULTATIONS`); `RESET_SESSION_DATA` agora também reinicia a paginação; funções puras exportadas `executarCarregamentoPaginaInicial`/`executarCarregarMaisConsultas`; `sessaoEpochRef` para isolamento entre sessões; `carregarPrimeiraPagina`/`carregarMaisConsultas` expostos via `useApp()`; efeito de hidratação inicial (RM-42) substituído para usar o novo fluxo de paginação real em vez da busca fixa de 50 registros.
- `frontend/src/app/historico/page.tsx` — estados explícitos de carregamento inicial/erro inicial/carregando mais/erro ao carregar mais/fim do histórico/"carregar mais", cabeçalho mostrando o total real do backend.
- `frontend/src/tests/store-pagination-rm44.test.ts` — novo, 21 testes.
- `frontend/src/tests/store-hydration-rm42.test.ts` — fixture atualizado (`consultationsPagination`), sem mudança de asserção.
- `frontend/src/tests/store-consultation-detail-rm43.test.ts` — fixture atualizado (`consultationsPagination`), sem mudança de asserção.

---

*RM-44 concluída. Nenhuma expansão clínica foi iniciada.*
