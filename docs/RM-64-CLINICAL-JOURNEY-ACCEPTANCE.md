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
    silenciosamente contornado.

## 5. Métricas (RM-64, seção "Métricas")

| Métrica | Valor |
|---|---|
| Número de jornadas | 11 (CJ-001 a CJ-011) |
| Número de etapas cobertas | 10 das 12 etapas da jornada descrita na RM ("exames" não tem cenário dedicado — ver seção 7; "persistência/reabertura" coberta por CJ-011 via reducer, não via Postgres real, que já tem cobertura própria) |
| Módulos envolvidos | `clinical-decision-support.ts`, `clinical-risk-engine.ts`, `clinical-therapeutics.ts`, `therapeutic-class-expansion.ts`, `safety-rules.ts`, `dose-calculator.ts`, `pediatric-engine.ts`, `pharma-database.ts` (+ `pharma-database-cardio.ts`/`-endo.ts`), `store.tsx` |
| Cenários aprovados | 11/11 CJs, 24/24 testes |
| Cenários pendentes | 0 cenários mínimos pendentes; 1 limitação de cobertura declarada (CJ-009, sub-teste de `dispatch` é nota de rastreabilidade, não asserção de componente) |
| Lacunas clínicas identificadas | GAP-01 (hipótese espúria de anamnese vazia); ACHADO-01 (risco_global dilui dimensão CV elevada); nota estrutural (prescrição rápida não integra com `store`) |

Número de testes (24) é reportado apenas como unidade de execução — a métrica de
qualidade real é a cobertura de jornada (11/11) e de lacunas identificadas (3), não
a contagem de `it()`.

## 6. Lacunas

### GAP-01 — Hipótese espúria em anamnese vazia (motor clínico, não corrigido nesta RM)

`clinical-decision-support.ts:788-823` (regra `faringoamigdalite`) usa critérios de
**ausência** de sintoma (`!has(queixa_principal, hda, 'tosse')`) que tratam campo
vazio como "sintoma confirmadamente ausente". Uma anamnese totalmente vazia cruza
`peso_minimo_para_incluir` e gera 1 hipótese (`grau_confianca=22`, `'baixa'`). Fora de
escopo de correção nesta RM (suíte de aceitação, não RM de motor clínico) — a suíte
garante que, apesar do gap, nenhuma certeza indevida escapa (`probabilidade` nunca
`'alta'`, `encaminhamento_urgente` sempre `false`). **Risco:** baixo por si só (nunca
vira certeza), mas indica que o motor não distingue "dado não coletado" de "sintoma
negativo" — pode compor com outros gaps futuros.

### ACHADO-01 — `risco_global` dilui uma dimensão CV elevada

Confirmado em CJ-001: com `risco_cardiovascular.nivel === 'alto'` (score ≥ 50) mas
as demais 5 dimensões ainda em zero nesta etapa da jornada, `risco_global` calcula
`'baixo'` pela média ponderada (`clinical-risk-engine.ts:576-583`). Comportamento
atual do software, não um bug — mas é uma **expectativa de UX não atendida**: o
rótulo agregado, se exibido com destaque isolado, pode levar um médico a subestimar
um risco cardiovascular já real. **Risco:** médio — depende de como a UI apresenta
`risco_global` vs. as dimensões individuais (fora do escopo desta RM auditar a UI).

### Nota estrutural — `prescricao-rapida` não integra com o `store`

Confirmado por investigação de código (não por teste de componente): o fluxo de
prescrição rápida opera inteiramente fora de `Consultation`/`Anamnesis`/`dispatch`.
Isso é **intencional e documentado** no próprio fluxo (uso rápido sem anamnese
completa é o requisito do cenário CJ-009), mas significa que nenhuma prescrição
emitida por esse caminho é persistida ou fica disponível para reabertura — uma
limitação arquitetural real, não uma lacuna clínica.

## 7. Riscos

- **Cobertura de "exames"**: a etapa "exames" da jornada descrita na RM-64 não tem
  um cenário dedicado — os cenários existentes usam dados de exame (creatinina, PA,
  IMC) como entrada de anamnese/dose, mas nenhum CJ testa uma tela ou fluxo de
  solicitação/interpretação de exames como conduta própria. Não foi encontrado
  módulo equivalente formalizado no sistema para reaproveitar (por isso não foi
  inventado um cenário) — registrado aqui como risco de cobertura, não como lacuna
  clínica.
- **CJ-005 não fixa o `tipo` exato do alerta IECA+AINE** — a asserção verifica "pelo
  menos um alerta real", não a classificação fina. Suficiente para aceitação, mas uma
  regressão futura no `tipo` retornado não seria pega por este teste.
- **CJ-009 (`dispatch` não é chamado)** é documentado por investigação de código, não
  testado diretamente — uma futura mudança que integrasse acidentalmente o
  `dispatch` ao fluxo rápido não quebraria este teste.
- **ACHADO-01** é um risco de leitura clínica na UI, não coberto por este teste de
  integração (que só vê os dados, não a apresentação visual).

## 8. Próximos cenários prioritários

1. Cenário dedicado a "exames" (etapa da jornada sem cobertura própria) — assim que
   existir um módulo formalizado de solicitação/interpretação de exames a reaproveitar.
2. Teste de componente (não integração) para CJ-009, montando `prescricao-rapida/page.tsx`
   e confirmando que `useApp().dispatch` nunca é chamado durante o fluxo — fecha a
   limitação declarada na seção 5.
3. Teste de UI/apresentação para o ACHADO-01: garantir que a tela de risco nunca
   exiba só `risco_global` sem as dimensões individuais quando alguma delas estiver
   `'alto'`/`'muito_alto'`/`'critico'`.
4. Avaliar (em RM futura, fora do escopo de aceitação) corrigir GAP-01 no motor de
   `clinical-decision-support.ts`, distinguindo "campo vazio" de "sintoma negativo
   confirmado" nos critérios de ausência.
5. Cenário de gestante/lactante com contraindicação farmacológica (não coberto pelos
   10 cenários mínimos, mas `eligibilityContextFromAnamnesis` e `EligibilityContext`
   já suportam `gestante`/`lactante` — reaproveitável sem inventar regra nova).

---

Não foi feito commit, push ou deploy nesta RM.
