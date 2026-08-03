# ACHADO-01 — Proteção de Leitura do Risco Agregado (`risco_global`)

**Origem do achado:** RM-64 (`docs/RM-64-CLINICAL-JOURNEY-MATRIX.md`, cenário CJ-001;
`docs/RM-64-CLINICAL-JOURNEY-ACCEPTANCE.md`, seção 6), documentado e deliberadamente
não corrigido naquela RM (suíte de aceitação, não de correção de motor/UX). Corrigido
aqui como RM própria e isolada, por solicitação explícita, com escopo restrito à
camada de apresentação (UX) — **o motor de cálculo de risco não foi alterado**.

**Escopo:** exclusivamente a camada de apresentação do risco agregado
(`frontend/src/lib/clinical-risk-engine.ts`, função nova e pura; e
`frontend/src/app/consulta/nova/page.tsx`, componente `IntelligencePanel`). Nenhum
dado farmacológico, motor de risco/segurança/dose, ou fórmula de `avaliarRiscoClinico`
foi tocado.

---

## 1. Causa raiz (confirmada por leitura de código, não suposta)

`risco_global` é uma **média ponderada** das 6 dimensões independentes de risco
clínico (CV 25% + Renal 20% + Hemorrágico 15% + Farmacológico 20% + Interação 10% +
Terapêutico 10%, `clinical-risk-engine.ts:576-583`), seguida de classificação por
faixa (`nivelPorScore`, linha 65-70). Isso é **comportamento de design documentado**,
não um bug de cálculo.

Consequência confirmada empiricamente pela RM-64 (CJ-001): com
`risco_cardiovascular.nivel === 'alto'` (score ≥ 50) e as demais 5 dimensões ainda em
zero nesta etapa da jornada, a média ponderada produz `score_global` baixo o
suficiente para `risco_global === 'baixo'` — o rótulo agregado, se exibido isolado,
dilui uma dimensão individualmente grave. Risco de **leitura clínica**: um médico que
veja só "Risco Global: BAIXO" em destaque pode subestimar um risco cardiovascular já
real, sem abrir os detalhes de cada dimensão.

## 2. Correção aplicada

**Decisão explícita de escopo:** a fórmula de `score_global`/`risco_global` em
`avaliarRiscoClinico` permanece **inalterada**, até haver decisão formal de produto
sobre a fórmula em si. A correção é inteiramente uma proteção de apresentação.

Nova função pura e exportada, ao lado de `avaliarRiscoClinico`
(`clinical-risk-engine.ts`):

```ts
export function dimensoesAcimaDoRiscoGlobal(avaliacao: AvaliacaoRiscoClinico): DimensaoAcimaDoGlobal[]
```

Identifica quais das 6 dimensões têm `nivel` estritamente maior (na ordem
`baixo < intermediario < alto < muito_alto < critico`) que `risco_global` — nunca
vazia quando a leitura do rótulo agregado sozinho seria enganosa; vazia quando o
agregado já reflete corretamente a pior dimensão.

A UI (`consulta/nova/page.tsx`, `IntelligencePanel`) consome essa lista via
`dimensoesElevadas = useMemo(() => risco ? dimensoesAcimaDoRiscoGlobal(risco) : [], [risco])`
em **dois pontos** onde `risco_global` é exibido:

1. **Banner superior** ("Clinical Decision Intelligence") — badge vermelho adicional
   ao lado do badge de risco global, visível antes mesmo de abrir qualquer aba.
2. **Card "Score Global de Risco"** (aba Risco Clínico) — `<Alert>` vermelho logo
   abaixo da barra de progresso do score, visível a quem só abre essa aba sem reparar
   no banner.

Em ambos, o texto lista cada dimensão elevada com seu próprio nível (ex.:
"⚠ Cardiovascular: ALTO").

**O que NÃO mudou:** nenhuma fórmula de risco, nenhum peso, nenhuma dimensão
individual, nenhum outro dado exibido. A mudança é estritamente "quando alguma
dimensão excede o agregado, um aviso adicional aparece ao lado do rótulo agregado" —
o rótulo agregado em si continua sendo calculado e exibido exatamente como antes.

## 3. Verificação em navegador (dev server real)

Fluxo real testado manualmente via `preview_start`/browser: paciente com PA 190/120,
queixa de "hipertensão arterial descompensada... dislipidemia grave, tabagista,
obesidade" → anamnese → hipótese HAS (I10, 56%) selecionada → módulo Inteligência.

Resultado observado (dimensões farmacológica/hemorrágica/renal em zero nesta etapa da
jornada, sem medicamentos ainda selecionados):

- `Risco Global: BAIXO` (score 9/100) — cálculo inalterado, confirmado.
- Badge de atenção no banner: `⚠ Interação: INTERMEDIÁRIO · Terapêutico: INTERMEDIÁRIO`.
- Alerta correspondente no card "Score Global de Risco": *"Atenção: o risco global
  (BAIXO) não reflete a dimensão mais grave — Interação: INTERMEDIÁRIO · Terapêutico:
  INTERMEDIÁRIO"*.

Confirma que a proteção aparece nos dois pontos de exibição sempre que alguma
dimensão excede o agregado, sem alterar o valor do agregado em si.

## 4. Testes

- **Novo arquivo dedicado:**
  `frontend/src/tests/achado-01-risco-global-protecao.test.ts` (6 testes) — cobre o
  cenário real do CJ-001 (CV alto isolado), nenhuma dimensão acima do agregado (lista
  vazia), todas as dimensões vazias, empate de nível (não entra na lista, só
  estritamente maior conta), múltiplas dimensões elevadas simultaneamente, e o caso
  de `risco_global === 'critico'` (nível máximo, lista sempre vazia).
- **Limitação de cobertura declarada** (mesmo padrão do CJ-009, RM-64): o projeto não
  usa `@testing-library/react` — a renderização condicional do badge/alerta em
  `page.tsx` não é testada por montagem de componente. O que é testado é a função
  pura que decide QUANDO a proteção deve aparecer — a lógica de decisão real
  consumida pela UI, sendo a JSX apenas apresentação condicional trivial sobre essa
  lista. Verificação funcional completa foi feita em navegador real (seção 3).
- **Docs RM-64 atualizadas** (`RM-64-CLINICAL-JOURNEY-MATRIX.md`,
  `RM-64-CLINICAL-JOURNEY-ACCEPTANCE.md`): seções de ACHADO-01 marcadas como
  protegidas, com link para esta RM e para o novo arquivo de teste — o registro
  histórico do achado original foi preservado, não removido.

## 5. Gates executados nesta sessão

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npx eslint .` (arquivos alterados + suíte completa via `npm run lint`) | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **60 arquivos / 1088 testes** — todos passando (6 novos desta correção; 1 teste de outro arquivo — `text-integrity-rm49.test.ts` — teve timeout de 5s numa execução em paralelo por contenção de CPU, não relacionado a esta mudança; reexecutado isoladamente e passou em 694ms) |
| `npm run test:coverage` | ✅ Exit 0 |
| `npm run build` | ✅ Sucesso — `[RM-23]`/`[RM-24]`/`[RM-49]`/`[RM-62]` prebuild gates verdes; compilação Next.js concluída, todas as 50 rotas geradas |

`DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md`, regenerados como efeito
colateral do build, foram revertidos (`git checkout --`).

## 6. Arquivos alterados

**Modificados:**
- `frontend/src/lib/clinical-risk-engine.ts` — nova função pura exportada
  `dimensoesAcimaDoRiscoGlobal` + tipos de suporte (`DimensaoAcimaDoGlobal`,
  `ORDEM_NIVEL_RISCO`, `LABEL_DIMENSAO`); `avaliarRiscoClinico` e a fórmula de
  `score_global`/`risco_global` permanecem inalterados.
- `frontend/src/app/consulta/nova/page.tsx` — import de `dimensoesAcimaDoRiscoGlobal`;
  `dimensoesElevadas` (`useMemo`) no `IntelligencePanel`; badge de atenção no banner
  superior; `<Alert>` de atenção no card "Score Global de Risco" (aba Risco Clínico).
- `docs/RM-64-CLINICAL-JOURNEY-MATRIX.md` — seção ACHADO-01 marcada como protegida.
- `docs/RM-64-CLINICAL-JOURNEY-ACCEPTANCE.md` — seção ACHADO-01, tabela de métricas,
  riscos e lista de próximos passos atualizadas.

**Novos:**
- `frontend/src/tests/achado-01-risco-global-protecao.test.ts`
- `docs/ACHADO-01-RISCO-GLOBAL-UX-PROTECTION.md` (este relatório)

Nenhum dado farmacológico, protocolo terapêutico, motor de risco/segurança/dose,
fórmula de `avaliarRiscoClinico`, ou arquivo de configuração foi alterado.

---

Não foi feito commit, push ou deploy nesta RM.
