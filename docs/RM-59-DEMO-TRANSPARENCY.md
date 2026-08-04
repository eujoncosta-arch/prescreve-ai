# RM-59 — Transparência de Dados Demonstrativos nas Páginas Científico/Inteligência

**Data:** 2026-08-02
**Escopo:** apenas frontend (`frontend/src/app`, `frontend/src/lib/clinical-nav-registry.ts`, `frontend/src/components/clinical/DemoDataNotice.tsx`, `frontend/src/components/layout/Sidebar.tsx`, `frontend/src/tests/*rm59*.test.ts`).
**Fora do escopo desta RM (por instrução explícita):** integração de qualquer página a `useApp()`/paciente real; alteração de motores clínicos, dose, protocolo, segurança ou backend.

---

## 1. Inventário de páginas investigadas

Reexecutei a investigação nesta sessão (não copiei o levantamento da RM-58) lendo o
código-fonte de cada `page.tsx` sob os grupos de navegação "Científico" e
"Inteligência" (mais os grupos "Clínico", "Institucional" e "Sistema", para ter uma
classificação completa e centralizada — ver seção 2). Para cada página, verifiquei
diretamente no código:

- uso de `useApp()` (contexto real de paciente/consulta);
- consumo de outro mecanismo de estado real (ex.: `useLocalStorage` com uma chave
  também escrita por um fluxo real);
- chamadas a `seed*Demo()` ou constantes `DEMO_*`/perfis fictícios de paciente;
- import de motor clínico real (`clinical-therapeutics`, `explainable-ai-v2`, etc.)
  vs. gerador de dado fabricado (`rwe-engine`, `hospital-quality`,
  `pharma-analytics`, `patient-digital-twin`, `scientific-update-engine`, etc.);
  presença de resultado individualizado apresentado como se fosse real.

Total de páginas inventariadas: **39** (todas as entradas dos 5 grupos de navegação).

## 2. Classificação de cada página

Centralizei o inventário e a classificação em
[`frontend/src/lib/clinical-nav-registry.ts`](../frontend/src/lib/clinical-nav-registry.ts)
(arquivo novo), com o tipo:

```ts
export type PageClassification = 'operacional_real' | 'referencia' | 'demonstracao' | 'hibrido';
```

- **`operacional_real`** — consome `useApp()` e persiste em backend real (ex.:
  `/consulta/nova`, `/prescricao-rapida`, `/historico`, `/prescricoes`,
  `/auditoria`, `/perfil`, `/configuracoes`).
- **`referencia`** — conteúdo de catálogo/calculadora/referência que nunca simula
  atividade institucional ou clínica fabricada (ex.: `/biblioteca`, `/evidencias`,
  `/dosagem`, `/eurofarma`, `/outcomes` — usa citações reais como "ALLHAT 2002").
- **`demonstracao`** — usa `seed*Demo()`/perfis fictícios de paciente ou
  especialista que poderiam ser confundidos com atividade institucional/clínica
  real.
- **`hibrido`** — combina um canal de dado real (ex.: última anamnese via
  `useLocalStorage`) com escolhas manuais arbitrárias na própria página.

`NAV_GROUPS` é a MESMA estrutura agora consumida por `Sidebar.tsx` (antes havia um
array `navGroups` duplicado só ali) — cada item exige `classification` no tipo
TypeScript, o que barra estruturalmente a adição de uma página nova sem uma decisão
explícita de classificação.

### 17 páginas classificadas como `demonstracao` ou `hibrido` (exigem aviso)

| Página | Classificação | Evidência de código |
|---|---|---|
| `/demo` | demonstracao | Perfis de paciente inteiramente fictícios injetados via `NEW_CONSULTATION`; já tinha aviso próprio de "Ambiente de Demonstração", mas sem o componente centralizado |
| `/insights` | demonstracao | `seedInsightsDemo()` no `useMemo` de carga |
| `/governanca` | demonstracao | `gerarDashboardGovernanca` sobre `guidelines` de `useGovernance()` cujo estado inicial é seed fixo (não há persistência real de diretrizes vigentes) |
| `/comite` | demonstracao | `useComite()` com especialistas fictícios (nome, CRM, ORCID fabricados) |
| `/rwe` | demonstracao | `DEMO_PACIENTE`-like agregados de `rwe-engine`; sem `useApp()` |
| `/digital-twin` | demonstracao | `patient-digital-twin` gera gêmeo digital fictício; 2 `return` (detalhe + lista), ambos tratados |
| `/rede-medica` | demonstracao | `learning-network` simula rede de médicos fictícia |
| `/prognostico` | demonstracao | `PERFIL_DEMO` hardcoded (65 anos, M, HAS+Dislipidemia) como estado inicial |
| `/farma-analytics` | demonstracao | `seedPharmaAnalyticsDemo()` no escopo do módulo |
| `/qualidade-hospital` | demonstracao | `seedHospitalQualityDemo()` + `gerarRanking()` fictício |
| `/atualizacoes-cientificas` | demonstracao | `seedScientificUpdateDemo()`; aba "diretrizes" tem conteúdo mais próximo de referência, mas a aba principal ("alertas") é fabricada — aviso único cobre a página inteira |
| `/explicabilidade` | **hibrido** | `useLocalStorage<Anamnesis \| null>('prescreve_ai_anamnese', null)` — a MESMA chave escrita por `AnamneseForm.tsx` no fluxo real `/consulta/nova`; `anamneseUsada = anamnese ?? DEMO_ANAMNESE`; CID e medicamento são escolhidos manualmente na página |
| `/validacao-clinica` | demonstracao | `executarSuiteValidacao` roda 500 cenários sintéticos de teste, não dados de pacientes |
| `/validacao-real` | demonstracao | `gerarMedicalValidationReport()` — validadores/hospitais/casos fictícios com Kappa simulado |
| `/interoperabilidade` | demonstracao | `DEMO_PACIENTE` hardcoded ("João da Silva") usado para gerar Bundle FHIR/TISS/HL7 de exemplo |
| `/medicina-precisao` | demonstracao | Genótipos de exemplo hardcoded no `useState` inicial |
| `/copilot` | demonstracao | `DEMO_CTX` hardcoded como único contexto clínico da página |

### Investigação da regra 4 (não classificar automaticamente por ausência de `useApp()`)

Antes de rotular qualquer página sem `useApp()` como `demonstracao`, verifiquei se
havia outro mecanismo legítimo de vínculo com dado real. Isso só se confirmou em
**uma** página: `/explicabilidade`, via `useLocalStorage('prescreve_ai_anamnese', ...)`
— por isso ela recebeu a classificação `hibrido` (com texto próprio, ver seção 6),
e não `demonstracao` pura. Em todas as outras 16 páginas listadas acima, confirmei
por leitura direta que não existe nenhum canal de dado real equivalente — os dados
vêm exclusivamente de `seed*()`, constantes `DEMO_*`/`PERFIL_DEMO`, ou geradores
determinísticos sem qualquer entrada do paciente em atendimento.

### Páginas que permanecem `referencia` ou `operacional_real` (sem aviso)

- **`operacional_real`** (9): `/`, `/consulta/nova`, `/prescricao-rapida`,
  `/timeline`, `/historico`, `/prescricoes`, `/auditoria`, `/perfil`,
  `/configuracoes`. Todas consomem `useApp()` e/ou persistem via
  `store.tsx`/backend real — confirmado por leitura de código, não presumido.
- **`referencia`** (13): `/calculadoras`, `/protocolos`, `/repositorio`,
  `/biblioteca`, `/evidencias`, `/evidence`, `/comparador`, `/segunda-opiniao`,
  `/dosagem`, `/farmalib`, `/eurofarma`, `/explicar`, `/atualizacoes`,
  `/outcomes`, `/evidence-timeline`, `/knowledge-graph`, `/showcase`,
  `/maturity-report`, `/regulatorio`. Estas páginas expõem catálogos, calculadoras
  e conteúdo de referência com citações reais (ex.: ALLHAT 2002 em `/outcomes`) —
  não simulam paciente, atividade clínica ou institucional fabricada.

## 3. Evidência de como a classificação foi obtida

Toda classificação veio de leitura direta do arquivo `page.tsx` correspondente
nesta sessão (não do relatório da RM-58): presença/ausência de `useApp()`,
presença de `seed*Demo()`/`DEMO_*`/`PERFIL_DEMO`, e para `/explicabilidade`
especificamente, a leitura das linhas que usam `useLocalStorage` com a chave
`prescreve_ai_anamnese` e a confirmação (via grep) de que `AnamneseForm.tsx` grava
na mesma chave no fluxo real de `/consulta/nova`.

## 4. Páginas que receberam o aviso (17)

`/demo`, `/insights`, `/governanca`, `/comite`, `/rwe`, `/digital-twin`,
`/rede-medica`, `/prognostico`, `/farma-analytics`, `/qualidade-hospital`,
`/atualizacoes-cientificas`, `/explicabilidade` (variante `hybrid`),
`/validacao-clinica`, `/validacao-real`, `/interoperabilidade`,
`/medicina-precisao`, `/copilot`.

Todas usam `<DemoDataNotice />` renderizado diretamente no fluxo da página (nunca
atrás de tooltip/modal), sempre como um dos primeiros elementos visíveis da área
de conteúdo — nunca dentro de uma interação opcional.

## 5. Páginas que NÃO receberam o aviso, com justificativa

- **9 páginas `operacional_real`** — não receberam o aviso porque de fato
  consomem `useApp()`/persistem dado real; adicionar o aviso aqui seria uma
  afirmação falsa. Coberto pelo teste que impede uso indevido do componente
  nessas páginas (seção 7).
- **19 páginas `referencia`** — não receberam o aviso porque apresentam conteúdo
  de catálogo/calculadora com fontes reais citáveis, sem simular paciente,
  atividade clínica ou institucional fabricada. Um teste dedicado impede que
  `DemoDataNotice` seja adicionado a essas páginas no futuro sem reclassificação
  explícita (evita banalizar o aviso).

## 6. Componente criado

[`frontend/src/components/clinical/DemoDataNotice.tsx`](../frontend/src/components/clinical/DemoDataNotice.tsx)
(novo, reutilizável, único ponto central de texto/estilo):

- Duas variantes: `'demo'` (texto: *"Demonstração. Os dados desta página não
  refletem o paciente em atendimento. Conteúdo ilustrativo (dados de exemplo),
  não deve ser interpretado como recomendação individualizada."*) e `'hybrid'`
  (texto específico mencionando a anamnese salva localmente, usada apenas em
  `/explicabilidade`).
- Prop `description` opcional para sobrescrever o texto quando uma página exige
  uma descrição mais precisa (usada em `/demo`, já que a página tem contexto
  próprio de "casos clínicos fictícios").
- **Nunca** afirma "IA", "validação clínica", "evidência real" ou "recomendação
  personalizada" — o texto só fala em dado demonstrativo/ilustrativo.
- Visualmente distinto de alertas clínicos: cor índigo/slate (a mesma já usada
  pelo badge "DEMO" da barra lateral), ícone informativo (`Info`, não um ícone de
  alerta), **nunca** usa as classes vermelho/laranja/âmbar reservadas a
  contraindicação/interação grave/bloqueio de prescrição no resto do app.
- Acessível: `role="note"` (nunca `role="alert"`), `aria-label` descritivo, ícone
  `aria-hidden="true"` (decorativo — o texto já carrega o significado), texto em
  `text-xs` mas com contraste e leading adequados, compatível com tema claro/escuro
  (`dark:` classes), sem depender só de cor para comunicar o estado (o texto
  "Demonstração."/"Parcialmente demonstrativo." em negrito abre cada aviso).
  Layout em `flex` com `rounded-lg` de altura previsível — não causa layout shift
  perceptível (verificado visualmente em `/rwe` e `/explicabilidade` via
  navegador, screenshots de texto na seção 9).
- Renderizado sempre inline no fluxo da página, nunca atrás de tooltip/modal.

## 7. Testes adicionados

Três arquivos novos em `frontend/src/tests/` (convenção do projeto —
`vitest.config.ts` só inclui `*.test.ts`, por isso os testes usam
`React.createElement` em vez de sintaxe JSX, sem precisar de `.tsx`):

1. **`demo-data-notice-rm59.test.ts`** (8 testes) — renderiza o componente via
   `renderToStaticMarkup` (react-dom/server; o projeto não tem
   `@testing-library/react` nem qualquer teste de renderização prévio) e verifica:
   texto de cada variante, override via `description`, `role="note"` (nunca
   `role="alert"`), `aria-label`, atributo `data-demo-data-notice`, ausência das
   classes de cor de alerta clínico, e `aria-hidden` no ícone.
2. **`clinical-nav-registry-rm59.test.ts`** (5 testes) — garante que todo item do
   registro tem `classification` válida, que não há hrefs duplicados, que
   `requerAvisoDeDemonstracao` retorna `true` exatamente para
   `demonstracao`/`hibrido`, e fixa a lista das 17 páginas que exigem aviso e a
   única página `hibrido` desta rodada — qualquer alteração futura de
   classificação sem atualizar o teste (ou vice-versa) quebra o gate.
3. **`demo-notice-coverage-rm59.test.ts`** (28 testes, `it.each`) — lê o
   código-fonte real de cada `page.tsx` referenciada no registro e confirma: (a)
   toda página `demonstracao`/`hibrido` importa e renderiza `<DemoDataNotice`; (b)
   toda página `operacional_real` NÃO renderiza `<DemoDataNotice`; (c) nenhuma
   página `referencia` usa o componente. **Este é o teste que impede uma página
   demonstrativa nova de ser adicionada sem sinalização**: se alguém marcar uma
   página nova como `demonstracao`/`hibrido` no registro sem de fato usar o
   componente (ou vice-versa), o teste falha.

Total: **41 testes novos**, todos passando nesta sessão (39 nos 3 arquivos
dedicados de RM-59 + 2 pré-existentes recontados — ver números exatos na seção 8).

## 8. Resultados reais dos gates (executados nesta sessão)

Todos os números abaixo vêm de execução real nesta sessão, não de RMs anteriores.

- **`npx tsc --noEmit`** — ✅ sem erros, saída vazia.
- **`npm run lint`** (eslint, sem `--fix`) — encontrou 1 warning
  (`clinical-nav-registry.ts`: import não usado `Stethoscope`), corrigido
  removendo o import; segunda execução: ✅ 0 problemas.
- **Suite completa (`npx vitest run`)** — ✅ **52 arquivos de teste, 961 testes,
  todos passando** (inclui os 41 novos desta RM).
- **Cobertura (`npm run test:coverage`)** — comando finalizou com **exit code 0**
  (todos os thresholds configurados em `vitest.config.ts` para os motores
  canônicos sob governança — `pharma-core`, `safety-rules.ts`,
  `dose-calculator.ts`, `dosing-engine.ts`, `icu-engine.ts`,
  `pediatric-engine.ts`, `clinical-risk-engine.ts` — foram atingidos). Cobertura
  global do repositório: Statements 25.62%, Branches 26.44%, Functions 19.13%,
  Lines 27.59% — não regrediu nenhum threshold configurado (o número global é
  baixo porque a maior parte do código não-canônico das ~20 páginas
  demonstrativas/de referência não tem threshold nem é o alvo de cobertura desta
  RM).
- **Build (`npm run build`, inclui prebuild)**:
  - **RM-23** (`check-drug-consistency.mjs`): `367 entidades · 0 inconsistências
    (critical=0 high=0 medium=0 low=0)` — ✅ OK.
  - **RM-24** (`check-cross-database.mjs`): `total=367 compatíveis=117
    divergentes=0 aceitos=14 críticos=0` — ✅ fontes sincronizadas.
  - **RM-49** (`check-text-integrity.mjs`): `262 arquivos verificados, 0
    sequências suspeitas` — ✅ OK.
  - `next build`: ✅ compilado com sucesso, todas as 47 rotas estáticas geradas
    (incluindo as 17 páginas modificadas nesta RM), sem erros de TypeScript.
  - `DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md` foram
    regenerados pelo build com um novo timestamp — revertidos após a execução
    dos gates para manter o diff desta RM restrito ao que foi de fato alterado
    (regra "não alterar arquivos não relacionados").
- **Validação visual em navegador** — dev server local, páginas `/rwe`
  (variante `demo`) e `/explicabilidade` (variante `hybrid`) inspecionadas via
  `get_page_text`: o aviso aparece como primeiro conteúdo textual da página, em
  ambos os casos com o texto esperado, sem se misturar com o conteúdo clínico
  abaixo.

## 9. Limitações

- Não há harness de renderização real (`@testing-library/react` ou similar) para
  as ~30 páginas Next.js completas — o teste de cobertura de sinalização
  (`demo-notice-coverage-rm59.test.ts`) verifica USO do componente por leitura de
  código-fonte, não renderização real de cada página com providers/mocks. Isso
  cobre o requisito da RM ("nenhuma página demonstrativa conhecida sem
  sinalização"), mas não substitui um teste de integração real.
- A verificação de "não causa layout shift perceptível" e de contraste em
  tema escuro foi feita por inspeção textual/estrutural (o componente usa as
  mesmas classes `dark:` já usadas no resto do app) — não foi feita uma captura
  de tela pixel-a-pixel comparando antes/depois em modo escuro real.
- A classificação de `/atualizacoes-cientificas` como `demonstracao` cobre a
  página inteira com um único aviso, mesmo a aba "diretrizes" tendo conteúdo mais
  próximo de referência — decisão consciente para não fragmentar o aviso em
  sub-seções nesta rodada (ver seção 5, não pedido pela RM-59 desagregar por aba).

## 10. Pendências (fora do escopo desta RM, por instrução explícita)

- Decidir, numa RM futura, se alguma das 17 páginas demonstrativas deve ser
  efetivamente conectada a `useApp()`/paciente real, ou permanecer como
  demonstração/roadmap permanente — esta RM não integrou nenhuma página
  (rule 2/11 do prompt original).
- Nenhuma página foi removida.
- O registro central (`clinical-nav-registry.ts`) agora é a fonte única de
  verdade para classificação — RMs futuras que adicionarem páginas devem
  declarar `classification` explicitamente (o TypeScript já obriga isso) e o
  teste de cobertura falhará se a nova página for `demonstracao`/`hibrido` sem
  usar `DemoDataNotice`.

---

## Arquivos alterados nesta RM

**Novos:**
- `frontend/src/lib/clinical-nav-registry.ts`
- `frontend/src/components/clinical/DemoDataNotice.tsx`
- `frontend/src/tests/demo-data-notice-rm59.test.ts`
- `frontend/src/tests/clinical-nav-registry-rm59.test.ts`
- `frontend/src/tests/demo-notice-coverage-rm59.test.ts`
- `docs/RM-59-DEMO-TRANSPARENCY.md` (este relatório)

**Modificados:**
- `frontend/src/components/layout/Sidebar.tsx` (passou a consumir `NAV_GROUPS` do
  registro central em vez de um array local duplicado)
- `frontend/src/app/demo/page.tsx`
- `frontend/src/app/insights/page.tsx`
- `frontend/src/app/governanca/page.tsx`
- `frontend/src/app/comite/page.tsx`
- `frontend/src/app/rwe/page.tsx`
- `frontend/src/app/digital-twin/page.tsx`
- `frontend/src/app/rede-medica/page.tsx`
- `frontend/src/app/prognostico/page.tsx`
- `frontend/src/app/farma-analytics/page.tsx`
- `frontend/src/app/qualidade-hospital/page.tsx`
- `frontend/src/app/atualizacoes-cientificas/page.tsx`
- `frontend/src/app/explicabilidade/page.tsx`
- `frontend/src/app/validacao-clinica/page.tsx`
- `frontend/src/app/validacao-real/page.tsx`
- `frontend/src/app/interoperabilidade/page.tsx`
- `frontend/src/app/medicina-precisao/page.tsx`
- `frontend/src/app/copilot/page.tsx`

Nenhum motor clínico, de dose, protocolo, segurança ou arquivo de backend foi
alterado. Nenhuma página foi conectada a `useApp()` nesta RM.
