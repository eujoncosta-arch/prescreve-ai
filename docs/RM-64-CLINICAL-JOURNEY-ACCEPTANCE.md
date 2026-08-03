# RM-64 — Suíte de Aceitação por Jornadas Clínicas Reais

## 1. Arquitetura da suíte

**Camada escolhida: teste de integração**, encadeando as funções reais do sistema em
sequência (não mocks, não simulação, não passagem por browser/E2E completo):

```
analyzeClinical() → avaliarRiscoClinico() → getTherapeuticForCondition()
    → runSafetyCheck() → calcCrCl()/calcDosePediatrica() → reducer (store.tsx)
```

**Por que integração e não E2E de navegador:** a própria RM-64 instrui "evitar E2E
excessivamente lento quando a mesma garantia puder ser obtida por integração". A
investigação de código (feita antes de escrever qualquer teste) confirmou que:

- Não existe uma função orquestradora única da jornada — o encadeamento é montado
  manualmente por página (`consulta/nova/page.tsx`, máquina de estados por `Step`).
- Todas as funções de decisão clínica (`analyzeClinical`, `avaliarRiscoClinico`,
  `getTherapeuticForCondition`, `runSafetyCheck`, `calcCrCl`, `calcDosePediatrica`) são
  puras/determinísticas e exportadas diretamente — chamá-las em sequência com os
  mesmos dados que a UI passaria reproduz a jornada clínica real sem o custo de subir
  um browser.
- A **persistência real em Postgres** (idempotência, ownership, cascade delete) já é
  garantida por `backend/test/postgres-real.e2e-spec.ts` — não seria reobtida com
  mais garantia por um E2E de frontend, apenas duplicada.
- O **reducer real** de `store.tsx` já é testado isoladamente (`reducer(state, action)`
  exportado para testes desde RM-42) — reaproveitado aqui para validar a máquina de
  estados ponta a ponta (CJ-011) sem montar componentes React.

Onde a garantia dependia de comportamento de componente React (ex.: CJ-009, se
`dispatch` é ou não chamado durante o fluxo de prescrição rápida), isso é declarado
explicitamente como limitação de cobertura, não maquiado como testado.

## 2. Matriz de cenários

Ver [`docs/RM-64-CLINICAL-JOURNEY-MATRIX.md`](RM-64-CLINICAL-JOURNEY-MATRIX.md) —
11 cenários (`CJ-001` a `CJ-011`), cada um com dados de entrada, ação, resultado
esperado, alertas esperados/proibidos, comportamento permitido/proibido e fonte
(arquivo:linha), com regra clínica confirmada separada de comportamento atual do
software e de expectativa de UX.

Todos os 10 cenários mínimos exigidos pela RM-64 foram cobertos 1:1 (hipertensão
+obesidade+risco CV → CJ-001; idoso+polifarmácia → CJ-002; pediátrico por peso →
CJ-003; insuficiência renal → CJ-004; interação relevante → CJ-005; contraindicação
crítica → CJ-006; semaglutida obesidade → CJ-007; marca não óbvia → CJ-008;
prescrição rápida sem anamnese → CJ-009; caso ambíguo sem certeza indevida →
CJ-010), mais CJ-011 (persistência/reabertura via reducer), que a própria RM-64 pede
explicitamente na descrição da jornada ("...prescrição → persistência/reabertura,
quando aplicável").

## 3. Evidências (gates executados nesta sessão, sem reaproveitar resultados antigos)

### Frontend

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | Limpo (0 erros) |
| `npm run lint` | Limpo (0 problemas) |
| `npx vitest run` (suíte completa) | 56 arquivos / 1047 testes — todos passando |
| `npm run test:coverage` | Exit 0 |
| `npm run build` | Sucesso — 4 gates de prebuild verdes: `[RM-23]` 0 inconsistências, `[RM-24]` 0 conflitos críticos, `[RM-49]` 0 sequências suspeitas, `[RM-62]` 0 erros bloqueantes; compilação Next.js concluída |

### Backend

| Gate | Resultado |
|---|---|
| `npm run typecheck` | Limpo |
| `npm run lint` | Limpo |
| `npm run test:cov` | 15 suítes / 146 testes — todos passando |
| `npm run test:e2e` | 10 de 11 suítes passaram (1 auto-ignorada — `postgres-real.e2e-spec.ts`, gate `TEM_DATABASE_URL` ausente neste ambiente); 135 de 143 testes passaram (8 ignorados, mesmo motivo) |

O arquivo de teste novo (`clinical-journey-acceptance-rm64.test.ts`) contribui 24 dos
1047 testes do frontend.

Os artefatos incidentais `DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md`,
regenerados com timestamp novo como efeito colateral do `npm run build`, foram
revertidos (`git checkout --`) para manter o diff desta RM restrito ao trabalho real.

## 4. Resultados

- **24/24 testes da suíte RM-64 passando**, cobrindo 11 jornadas (CJ-001–CJ-011).
- 2 erros de escrita de teste foram encontrados e corrigidos **rodando contra o
  código real** (não assumidos) — ambos documentados na seção 6, e ambos resultaram
  em investigação mais profunda do motor real em vez de ajuste raso da asserção:
  - CJ-001: assertiva inicial confundia o nível da dimensão CV com o rótulo agregado
    `risco_global` — corrigida e complementada com um teste de ACHADO dedicado.
  - CJ-010: assertiva inicial esperava zero hipóteses para anamnese vazia — o
    comportamento real (GAP-01) foi investigado, documentado e testado como é, não
    silenciosamente contornado. **Atualização:** GAP-01 foi corrigido numa RM
    dedicada posterior — a assertiva original (zero hipóteses) hoje reflete o
    comportamento real do software; ver seção 6.

## 5. Métricas (RM-64, seção "Métricas")

| Métrica | Valor |
|---|---|
| Número de jornadas | 11 (CJ-001 a CJ-011) — **12 (+CJ-012) em RM dedicada posterior**, ver seção 6 |
| Número de etapas cobertas | 10 das 12 etapas da jornada descrita na RM ("exames" não tinha cenário dedicado — ver seção 7; "persistência/reabertura" coberta por CJ-011 via reducer, não via Postgres real, que já tem cobertura própria). **Atualização:** "exames" fechada por CJ-012 em RM dedicada posterior — 11/12 etapas cobertas |
| Módulos envolvidos | `clinical-decision-support.ts`, `clinical-risk-engine.ts`, `clinical-therapeutics.ts`, `therapeutic-class-expansion.ts`, `safety-rules.ts`, `dose-calculator.ts`, `pediatric-engine.ts`, `pharma-database.ts` (+ `pharma-database-cardio.ts`/`-endo.ts`), `store.tsx` |
| Cenários aprovados | 11/11 CJs, 24/24 testes |
| Cenários pendentes | 0 cenários mínimos pendentes; 1 limitação de cobertura declarada (CJ-009, sub-teste de `dispatch` era nota de rastreabilidade, não asserção de componente) — **fechada em RM dedicada posterior** |
| Lacunas clínicas identificadas | GAP-01 (hipótese espúria de anamnese vazia) — **corrigido em RM dedicada posterior**; ACHADO-01 (risco_global dilui dimensão CV elevada) — **protegido na UX em RM dedicada posterior**; nota estrutural (prescrição rápida não integra com `store`) — ainda aberta |

Número de testes (24) é reportado apenas como unidade de execução — a métrica de
qualidade real é a cobertura de jornada (11/11) e de lacunas identificadas (3), não
a contagem de `it()`.

## 6. Lacunas

### GAP-01 — Hipótese espúria em anamnese vazia — **CORRIGIDO** (RM dedicada, posterior à RM-64)

`clinical-decision-support.ts` (regra `faringoamigdalite`) usava critérios de
**ausência** de sintoma (`!has(queixa_principal, hda, 'tosse')`) que tratavam campo
vazio como "sintoma confirmadamente ausente". Uma anamnese totalmente vazia cruzava
`peso_minimo_para_incluir` e gerava 1 hipótese (`grau_confianca=22`, `'baixa'`). Fora
do escopo de correção da RM-64 original (suíte de aceitação, não RM de motor
clínico) — permaneceu documentado como lacuna até uma RM dedicada introduzir o
helper `absenceOf()`, que exige texto real preenchido antes de contar a ausência da
palavra-chave como evidência de sintoma negado. Nenhuma regra clínica nova foi
criada. Comportamento atual: anamnese vazia → `hipoteses: []`. Teste `CJ-010`
atualizado para refletir o comportamento corrigido; suíte de regressão dedicada em
`frontend/src/tests/gap-01-absence-criteria.test.ts`.

### ACHADO-01 — `risco_global` dilui uma dimensão CV elevada — **PROTEGIDO NA UX** (RM dedicada, posterior à RM-64)

Confirmado em CJ-001: com `risco_cardiovascular.nivel === 'alto'` (score ≥ 50) mas
as demais 5 dimensões ainda em zero nesta etapa da jornada, `risco_global` calcula
`'baixo'` pela média ponderada (`clinical-risk-engine.ts:576-583`). Comportamento
atual do software, não um bug — mas era uma **expectativa de UX não atendida**: o
rótulo agregado, se exibido com destaque isolado, podia levar um médico a subestimar
um risco cardiovascular já real.

Corrigido exclusivamente na camada de UX, por decisão explícita: a fórmula de
`score_global`/`risco_global` em `avaliarRiscoClinico` **permanece inalterada**, até
haver decisão formal de produto sobre a fórmula em si. Nova função pura e exportada
`dimensoesAcimaDoRiscoGlobal(avaliacao)` (`clinical-risk-engine.ts`) identifica quais
dimensões têm nível individual estritamente maior que o `risco_global` agregado. A
UI (`frontend/src/app/consulta/nova/page.tsx`, componente `IntelligencePanel`) usa o
resultado para nunca exibir o rótulo agregado sozinho: um badge/alerta de atenção
aparece tanto no banner superior quanto no card "Score Global de Risco" da aba Risco
Clínico sempre que a lista não está vazia. Testes: suíte dedicada em
`frontend/src/tests/achado-01-risco-global-protecao.test.ts`, incluindo o cenário
real do CJ-001. Limitação de cobertura declarada (mesmo padrão do CJ-009): o projeto
não usa `@testing-library/react`, então a renderização condicional em `page.tsx` não
é testada por montagem de componente — a função pura que decide a proteção é.

### Nota estrutural — `prescricao-rapida` não integra com o `store` — **PROVADO POR TESTE DE COMPONENTE** (RM dedicada, posterior à RM-64)

Confirmado originalmente por investigação de código (não por teste de componente):
o fluxo de prescrição rápida opera inteiramente fora de
`Consultation`/`Anamnesis`/`dispatch`. Isso é **intencional e documentado** no
próprio fluxo (uso rápido sem anamnese completa é o requisito do cenário CJ-009),
mas significa que nenhuma prescrição emitida por esse caminho é persistida ou fica
disponível para reabertura — uma limitação arquitetural real, não uma lacuna
clínica.

**Atualização:** a suposição foi confirmada por instrumentação real. Nova
dependência de teste `@testing-library/react` adicionada ao projeto (sem impacto em
runtime/produção); `PrescricaoRapida` é montada dentro do `AppProvider` real (mesmo
reducer, mesmo Context) e o fluxo completo é percorrido via interação de usuário
simulada (buscar → selecionar medicamento → preencher dados do paciente incl.
gestante/lactante → adicionar à prescrição → remover item → salvar favorito → gerar
receita). Um `dispatch` real é instrumentado (interceptando apenas a chamada cujo
reducer é o `reducer` exportado por `@/lib/store`, nunca outros usos de
`useReducer`) e provado, por 4 testes, nunca ser chamado em nenhum desses passos.
Ver `frontend/src/tests/cj-009-prescricao-rapida-dispatch.test.tsx`.

## 7. Riscos

- ~~**Cobertura de "exames"**: a etapa "exames" da jornada descrita na RM-64 não tem
  um cenário dedicado — os cenários existentes usam dados de exame (creatinina, PA,
  IMC) como entrada de anamnese/dose, mas nenhum CJ testa uma tela ou fluxo de
  solicitação/interpretação de exames como conduta própria. Não foi encontrado
  módulo equivalente formalizado no sistema para reaproveitar (por isso não foi
  inventado um cenário) — registrado aqui como risco de cobertura, não como lacuna
  clínica.~~ **Concluído (com escopo reduzido, por decisão explícita)** — RM
  dedicada posterior adicionou CJ-012, provando que resultados de exame já fluem
  hoje como dado de decisão real (diagnóstico → risco → dose), SEM construir um
  módulo novo de solicitação/interpretação de exames — esse módulo continua não
  existindo no sistema; ver `docs/RM-64-CLINICAL-JOURNEY-MATRIX.md` (CJ-012).
- **CJ-005 não fixa o `tipo` exato do alerta IECA+AINE** — a asserção verifica "pelo
  menos um alerta real", não a classificação fina. Suficiente para aceitação, mas uma
  regressão futura no `tipo` retornado não seria pega por este teste.
- ~~**CJ-009 (`dispatch` não é chamado)** é documentado por investigação de código, não
  testado diretamente — uma futura mudança que integrasse acidentalmente o
  `dispatch` ao fluxo rápido não quebraria este teste.~~ **Concluído** — ver seção 6
  (nota estrutural `prescricao-rapida`). Agora testado diretamente por montagem de
  componente; uma integração acidental futura do `dispatch` ao fluxo rápido
  QUEBRARIA `cj-009-prescricao-rapida-dispatch.test.tsx`.
- **ACHADO-01** era um risco de leitura clínica na UI, não coberto por este teste de
  integração (que só vê os dados, não a apresentação visual). **Atualização:**
  protegido em RM dedicada posterior — ver seção 6.

## 8. Próximos cenários prioritários

1. ~~Cenário dedicado a "exames" (etapa da jornada sem cobertura própria) — assim que
   existir um módulo formalizado de solicitação/interpretação de exames a reaproveitar.~~
   **Concluído (escopo reduzido)** — CJ-012 fecha a cobertura de dado de exame
   fluindo como decisão real, sem exigir um módulo de solicitação/interpretação
   ainda não construído. Ver `docs/RM-64-CLINICAL-JOURNEY-MATRIX.md` (CJ-012).
2. ~~Teste de componente (não integração) para CJ-009, montando `prescricao-rapida/page.tsx`
   e confirmando que `useApp().dispatch` nunca é chamado durante o fluxo — fecha a
   limitação declarada na seção 5.~~ **Concluído** — ver seção 6 (nota estrutural
   `prescricao-rapida`).
3. ~~Teste de UI/apresentação para o ACHADO-01: garantir que a tela de risco nunca
   exiba só `risco_global` sem as dimensões individuais quando alguma delas estiver
   `'alto'`/`'muito_alto'`/`'critico'`.~~ **Concluído** — ver seção 6 (ACHADO-01).
4. ~~Avaliar (em RM futura, fora do escopo de aceitação) corrigir GAP-01 no motor de
   `clinical-decision-support.ts`, distinguindo "campo vazio" de "sintoma negativo
   confirmado" nos critérios de ausência.~~ **Concluído** — ver seção 6 (GAP-01).
5. Cenário de gestante/lactante com contraindicação farmacológica (não coberto pelos
   10 cenários mínimos, mas `eligibilityContextFromAnamnesis` e `EligibilityContext`
   já suportam `gestante`/`lactante` — reaproveitável sem inventar regra nova).

---

Não foi feito commit, push ou deploy nesta RM.
