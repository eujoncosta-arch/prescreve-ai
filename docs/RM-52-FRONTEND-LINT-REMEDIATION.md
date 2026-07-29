# RM-52 — Remediação de Lint do Frontend (RM41-036)

Estado inicial (herdado da RM-51): 25 erros de lint (`react-hooks/*`) em 18
arquivos, mais avisos `@typescript-eslint/no-unused-vars` (fora de escopo —
warnings pré-existentes, não bloqueantes, não tocados nesta rodada). Estado
final: **0 erros de lint** (`npx eslint .` → `0 errors, 252 warnings`).

Nenhum erro foi fechado com `eslint-disable`, `@ts-ignore`, downgrade de
severidade ou supressão — todo item abaixo foi corrigido na causa raiz.

## `react-hooks/set-state-in-effect` (18 erros)

| Arquivo | Causa raiz | Estratégia | Teste/Verificação |
|---|---|---|---|
| `app/page.tsx:44` | `useEffect`+`setState` para calcular saudação por hora do dia no mount | `useSyncExternalStore` (subscribe no-op, snapshot real computa a hora, snapshot de servidor retorna `''`) | build + navegador (dashboard, sem erro de console) |
| `app/digital-twin/page.tsx:27` | seed+load de twins via `useEffect` no mount | Store local com `useSyncExternalStore` (cache + listeners), `invalidateTwins()` substitui `setTwins(listarTwins())` | `criarDemo()` testado em navegador — cria twin e navega para detalhe corretamente |
| `app/auditoria/page.tsx:829,838` | Dois efeitos: seed+load no mount e re-fetch a cada mudança de `filtros` | `useSyncExternalStore` só para o gate `mounted`; `entries` via `useMemo(filtros, version)`; `refresh()` incrementa `version` | eslint 0 erros; navegador sem erro de console |
| `app/consulta/nova/page.tsx:638` | Auto-registro de recomendações no mount escrevia externamente E fazia `setRegistradas` síncrono no mesmo efeito | Escrita externa mantida no efeito (é o uso legítimo); `setRegistradas` adiado via `queueMicrotask` | eslint 0 erros; fluxo de nova consulta validado em navegador (Paciente → Identificação renderiza sem erro) |
| `app/demo/page.tsx:49` | (ver seção `purity` abaixo — mesmo arquivo, causa diferente) | — | — |
| `app/digital-twin/page.tsx` | (já coberto acima) | — | — |
| `app/farma-analytics/page.tsx:21` | seed+load de dashboard no mount | Seed movido para escopo do módulo (idempotente); `dash` via inicializador lazy de `useState` | eslint 0 erros; navegador renderiza dashboard real |
| `app/insights/page.tsx:291` | seed+load de insights no mount | `useSyncExternalStore` só para `mounted`; `insights` via `useMemo` | navegador: 25 eventos, sem erro de console |
| `app/page.tsx` | (já coberto) | — | — |
| `app/prescricao-rapida/page.tsx:129,137,147,162,170` | 5 efeitos de sincronização (favoritos, busca, marca/concentração preferidas, CrCl, alertas de segurança) | Cada `setState` adiado via `queueMicrotask` com flag `cancelado` (cleanup); lógica de derivação preservada 100% | navegador: busca "losartana" retornou resultado real sem erro de console |
| `app/qualidade-hospital/page.tsx:19` | seed+load de ranking no mount | Seed no escopo do módulo; `hospitais`/`selecionado` via `useState` com valor inicial calculado no módulo | navegador: ranking real (2 hospitais) sem erro |
| `app/regulatorio/page.tsx:141` | `refresh()` assíncrono chamado inteiro dentro do efeito (síncrono + depois `await`) | Partes síncronas (seed, `avaliarCompliance`, `listarLogs` etc.) viram inicializadores lazy de `useState`; só o `await testarCriptografia()` fica no efeito (uso legítimo) | navegador: compliance 64%, AES-GCM 256 ✓, sem erro |
| `components/modules/ProtocolEditor.tsx:45` | Formulário sincronizava estado local com prop `initial` via efeito a cada `open`/`initial` | Efeito removido; estado inicializado via inicializadores lazy de `useState(initial?.campo ?? ...)`; chamador (`protocolos/page.tsx`) usa `key={editorOpen ? (editing?.id ?? 'new') : 'closed'}` para forçar remount | navegador: lista de 7 protocolos renderiza, sem erro |
| `components/ui/command-palette.tsx:86` | `setQuery('')`/`setSel(0)` síncronos ao abrir a paleta | `queueMicrotask` para os dois `setState`; `setTimeout` de foco mantido com cleanup | eslint 0 erros |
| `lib/governance.ts:575` | 4 stores (guidelines/reviews/updates/audit) carregados via `useEffect`+`setState` no mount | Mesma factory `createLocalStore` já usada em `comite.ts`/`protocols.ts`; handlers leem via `store.getSnapshot()` em vez de closures de estado | navegador: página `/governanca` renderiza 3 diretrizes reais, 1 revisão pendente, 2 atualizações novas — sem erro |
| `lib/physician-profile.ts:303` | Efeito de "re-sync após hidratação" duplicava a leitura já feita pelo inicializador lazy de `useState` | Efeito removido (era redundante — o inicializador lazy já lê o localStorage real na 1ª renderização do cliente) | navegador: `/perfil` renderiza corretamente |
| `lib/theme.tsx:15` | Tema inicial (localStorage + `matchMedia`) lido via `useEffect`+`setState` no mount | `useSyncExternalStore` para o valor externo; `override` (state) só é setado por ação explícita do usuário (`setTheme`); `theme = override ?? initialTheme` computado no render, sem efeito | eslint 0 erros |

## `react-hooks/immutability` (2 erros)

| Arquivo | Causa raiz | Estratégia | Verificação |
|---|---|---|---|
| `app/atualizacoes-cientificas/page.tsx:23` | `carregar()` referenciada por um `useEffect` antes de sua declaração textual (function declaration hoisted, mas a regra não aceita) | Reordenado: `carregar` declarada antes do efeito. Isso desmascarou um `set-state-in-effect` que estava sendo mascarado pelo erro de immutability — corrigido em seguida com o mesmo padrão de `version`+`useMemo` | eslint 0 erros; navegador: 4 alertas pendentes, sem erro |
| `app/eurofarma/page.tsx:137` | `let offset = 0` mutado dentro de `.map()` para acumular posições de fatias do donut (SVG) | Reescrito com `.reduce()` sem variável mutável externa | eslint 0 erros; navegador: dashboard Eurofarma renderiza, sem erro |

## `react-hooks/refs` (2 erros)

| Arquivo | Causa raiz | Estratégia | Verificação |
|---|---|---|---|
| `app/knowledge-graph/page.tsx:93` | `dragging.current` lido diretamente no JSX (`style={{cursor: ...}}`) durante o render | Estado `isDragging` espelha o ref só para exibição; ref mantido para a checagem síncrona em `handleMouseMove` | eslint 0 erros |
| `app/perfil/page.tsx:649` | Bloco morto: `if (!synced.current) { synced.current = true; /* draft já inicializado */ }` — mutava um ref durante o render sem fazer nada de útil | Bloco removido (dead code — `draft` já é inicializado corretamente pelo `useState({...profile})`) | eslint 0 erros; navegador renderiza perfil |

## `react-hooks/purity` (1 erro)

| Arquivo | Causa raiz | Estratégia | Verificação |
|---|---|---|---|
| `app/demo/page.tsx:49` | `Date.now()` dentro do corpo do componente (mesmo que só chamado por um handler de clique) — análise estática do lint não confirma que nunca roda durante o render | Geração do id extraída para uma função de módulo (`gerarIdCasoDemo`), fora do corpo do componente | eslint 0 erros |

## `react-hooks/error-boundaries` (1 erro)

| Arquivo | Causa raiz | Estratégia | Verificação |
|---|---|---|---|
| `components/ui/client-date.tsx:6` | JSX construído dentro de um bloco `try/catch` | Formatação (que pode lançar) movida para fora do JSX; `try/catch` só computa a string, e o `return <>{formatted}</>` é incondicional | eslint 0 erros |

## Achados extras descobertos durante a correção (bugs reais, não lint)

Ao corrigir o padrão `useSyncExternalStore` em `protocols.ts`/`digital-twin/page.tsx`
e validar em navegador, dois bugs pré-existentes vieram à tona:

1. **`getServerSnapshot` não memoizado** em `protocols.ts` e (na nova versão)
   `digital-twin/page.tsx` — retornavam `[]` literal a cada chamada, o que o
   React acusa como `"The result of getServerSnapshot should be cached to
   avoid an infinite loop"`. Corrigido com uma constante `EMPTY_*` module-level
   estável.
2. **Colisão de IDs em `scientific-update-engine.ts`** — `genId()` usava só
   `Date.now()` (resolução de milissegundo); ao gerar vários alertas de
   demonstração num laço síncrono, IDs colidiam, causando
   `"Encountered two children with the same key"` na lista de alertas.
   Corrigido com um contador monotônico concatenado ao id.

Ambos verificados como resolvidos em abas de navegador limpas (sem log
acumulado de navegações anteriores) e sem regressão nos 868 testes.

## Verificação final

```
npx eslint .        → 0 errors, 252 warnings (warnings pré-existentes, fora de escopo)
npx tsc --noEmit    → limpo
npx vitest run      → 46 arquivos, 868/868 testes passando
npm run build       → RM-23 (0 inconsistências/358 entidades), RM-24 (0 conflitos críticos),
                       RM-49 (0 sequências suspeitas/263 arquivos), build Next.js limpo, 50 páginas estáticas
```
