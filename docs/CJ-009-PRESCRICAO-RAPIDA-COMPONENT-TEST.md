# CJ-009 — Prova por Teste de Componente: `dispatch` Nunca É Chamado na Prescrição Rápida

**Origem do achado:** RM-64 (`docs/RM-64-CLINICAL-JOURNEY-ACCEPTANCE.md`, seções 1,
5, 6 e 7; `docs/RM-64-CLINICAL-JOURNEY-MATRIX.md`, CJ-009), declarado como
**limitação de cobertura**: a garantia de que `useApp().dispatch` nunca é chamado
durante o fluxo de prescrição rápida dependia de investigação de código, não de
teste de componente — o projeto não tinha `@testing-library/react`. Fechado aqui
como RM própria e isolada, por solicitação explícita, seguindo a priorização do
roadmap pós-consolidação (item 3, após GAP-01 e ACHADO-01).

**Escopo:** exclusivamente infraestrutura de teste. Nenhum código de produção foi
alterado — nem `prescricao-rapida/page.tsx`, nem `store.tsx`, nem qualquer motor
clínico/farmacológico.

---

## 1. Causa raiz da limitação (não um bug — uma lacuna de ferramental)

`frontend/src/app/prescricao-rapida/page.tsx` só lê `const { state } = useApp();`
— nunca desestrutura nem chama `dispatch`. Isso é intencional: uso rápido sem
anamnese completa é o próprio requisito do cenário (RM-64, CJ-009). A RM-64
confirmou isso por leitura de código, mas sem `@testing-library/react` não havia
como MONTAR o componente de fato e provar isso por execução real — a garantia
ficava sujeita a regressão silenciosa (uma futura mudança que integrasse
`dispatch` ao fluxo rápido não quebraria nenhum teste existente).

## 2. Correção aplicada

**Nova dependência de teste** (sem impacto em runtime/produção):
`@testing-library/react@16.3.2`, `@testing-library/user-event@14.6.1`,
`@testing-library/jest-dom@7.0.0` — adicionadas como `devDependencies`.

**Configuração de teste** (`frontend/vitest.config.ts`, `frontend/src/tests/setup.ts`):
- `include` do Vitest passou a reconhecer `*.test.tsx` (antes só `*.test.ts`/`*.spec.ts`).
- `@testing-library/jest-dom/vitest` importado no setup global (matchers como
  `toBeInTheDocument`).
- `globalThis.IS_REACT_ACT_ENVIRONMENT = true` — exigido pelo React 19 para
  reconhecer o Vitest como ambiente de teste válido para `act()`.
- Polyfills de jsdom para montar componentes Radix UI (`Select`/`Tabs`, usados por
  `prescricao-rapida/page.tsx`): `ResizeObserver`,
  `hasPointerCapture`/`setPointerCapture`/`releasePointerCapture`,
  `scrollIntoView` — jsdom não implementa essas APIs e Radix lança em tempo de
  render sem elas, mesmo sem qualquer interação do teste com esses elementos
  específicos.

**Novo teste** `frontend/src/tests/cj-009-prescricao-rapida-dispatch.test.tsx` (4
testes) — monta `PrescricaoRapida` dentro do `AppProvider` **real** (mesmo
reducer, mesmo Context — nada mockado da lógica de store) e percorre o fluxo real
de uso via `@testing-library/user-event`:

1. Montagem do painel.
2. Buscar → selecionar medicamento (Losartana, entrada real de
   `pharma-database.ts`) → adicionar à prescrição → remover item.
3. Preencher dados do paciente, incluindo os switches Gestante/Lactante.
4. Salvar protocolo favorito (via `window.prompt`, mockado) → gerar receita → abrir
   e fechar o modal de pré-visualização de impressão.

**Técnica de instrumentação do `dispatch`:** `vi.mock('react', ...)` envolve
`useReducer`, mas intercepta **somente** a chamada cujo primeiro argumento (a
função reducer) é `===` ao `reducer` exportado por `@/lib/store` — o mesmo reducer
usado pelo `AppProvider` real. Isso evita falsos positivos de outras chamadas de
`useReducer` que possam existir em bibliotecas de terceiros (Radix UI etc.), sem
precisar mockar ou reimplementar a lógica do store. Técnica validada
isoladamente antes de aplicada ao teste real (probe descartado após confirmação).

`next/navigation` e `next/link` são mockados (necessário para montar
`AppShell`/`Sidebar`/`TopBar`, que envolvem `PrescricaoRapida` na árvore real de
componentes, sem depender do contexto interno do App Router do Next 16/Turbopack
em ambiente de teste). `sonner` (toasts) é mockado para manter o teste hermético.

Em todos os 4 testes: `expect(dispatchSpy).not.toHaveBeenCalled()` — provado por
execução real, não assumido por leitura de código.

## 3. Verificação de não-regressão

Nenhum código de produção foi alterado. A suíte completa pré-existente (1088
testes antes desta RM) permanece 100% verde — os 4 novos testes deste arquivo
somam ao total, sem modificar nenhum teste existente.

## 4. Limitações remanescentes (documentadas, não escondidas)

- O teste cobre o fluxo de prescrição rápida tal como hoje existe. Não cobre
  toda a superfície da tela (ex.: calculadora de dose automática via
  `DoseCalcCard`, que só aparece quando idade+peso estão preenchidos — os
  testes deste arquivo deliberadamente NÃO preenchem ambos simultaneamente
  antes de clicar em "Adicionar", para exercitar o caminho manual mais simples;
  o caminho de cálculo automático seria um teste adicional, fora do escopo
  mínimo de "provar que dispatch nunca é chamado").
- Um aviso cosmético do React ("The current testing environment is not
  configured to support act(...)") aparece ocasionalmente durante a execução,
  originado do padrão `queueMicrotask()` usado propositalmente em vários efeitos
  deste componente (RM-52, para evitar "cascading render síncrono" — ver
  comentário em `prescricao-rapida/page.tsx`). Não afeta a correção das
  asserções, que sempre esperam pelo estado assentado da UI antes de verificar
  `dispatchSpy`; não foi perseguido além disso para não alterar o comportamento
  de produção do componente.
- Os 3 testes que exercitam interação de usuário completa (digitação, múltiplos
  cliques) usam `testTimeout` de 15s (padrão do Vitest é 5s) — sob a suíte
  completa rodando em paralelo, a contenção de CPU pode facilmente exceder 5s
  sem indicar problema real no teste (mesmo padrão já observado em
  `text-integrity-rm49.test.ts`).

## 5. Gates executados nesta sessão

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **61 arquivos / 1092 testes** — todos passando (4 novos desta correção; os 1088 pré-existentes continuam verdes) |
| `npm run test:coverage` | ✅ Exit 0 |
| `npm run build` | ✅ Sucesso — `[RM-23]`/`[RM-24]`/`[RM-49]`/`[RM-62]` prebuild gates verdes; compilação Next.js concluída, todas as 50 rotas geradas |

`DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md`, regenerados como
efeito colateral do build, foram revertidos (`git checkout --`).

## 6. Arquivos alterados

**Modificados:**
- `frontend/package.json` / `package-lock.json` — novas `devDependencies`
  (`@testing-library/react`, `@testing-library/user-event`,
  `@testing-library/jest-dom`).
- `frontend/vitest.config.ts` — `include` passa a reconhecer `*.test.tsx`.
- `frontend/src/tests/setup.ts` — `@testing-library/jest-dom/vitest`,
  `IS_REACT_ACT_ENVIRONMENT`, polyfills de jsdom para Radix UI.
- `docs/RM-64-CLINICAL-JOURNEY-ACCEPTANCE.md` — seções de métricas, nota
  estrutural, riscos e próximos passos atualizadas para refletir o fechamento.

**Novos:**
- `frontend/src/tests/cj-009-prescricao-rapida-dispatch.test.tsx`
- `docs/CJ-009-PRESCRICAO-RAPIDA-COMPONENT-TEST.md` (este relatório)

Nenhum dado farmacológico, protocolo terapêutico, motor de risco/segurança/dose,
ou componente de produção (`prescricao-rapida/page.tsx`, `store.tsx`) foi
alterado.

---

Não foi feito commit, push ou deploy nesta RM.
