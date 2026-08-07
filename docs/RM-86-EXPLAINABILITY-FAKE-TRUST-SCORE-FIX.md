# RM-86 — Investiga os achados de confiança média/baixa do RM-85

**Origem:** o usuário pediu para investigar os dois achados que o RM-85
tinha registrado mas não corrigido (confiança média/baixa, precisavam de
checagem antes de agir).

## Achado 1 (confirmado, corrigido) — "Trust Score" sempre fixo em 70/100

`explainable-ai-v2.ts:780` (função `calcularExplainabilityScore`, usada
pela página `/explicabilidade`): o componente **"Adequação ao Paciente"**
(peso 20% do score total) lia
`(med as unknown as Record<string, unknown>).trust_score`.

Investigação mostrou que isso era **pior** do que o RM-85 registrou: o
tipo `TherapeuticSuggestion` (`types.ts`) **nunca teve** campo
`trust_score` — daí o cast forçado (`as unknown as Record<string,
unknown>`), sinal de que o TypeScript já sabia que a propriedade não
existia. Isso significa que `medTrustScore` caía **sempre** no fallback
`?? 70`, para **toda** sugestão terapêutica, sempre — não era um caso
raro de "dado às vezes ausente", era uma constante disfarçada de valor
calculado, rotulada como `"Trust Score do motor de evidência: 70/100"`
(texto que sugere ao médico um valor específico calculado para aquele
paciente/medicamento).

Confirmado por busca: existe um campo `trust_score` real no código, mas
pertence a um tipo **diferente** (`CenarioComparativo`/entradas
hardcoded de `/explicabilidade` com dados reais de estudo — DECLARE-TIMI,
CREDENCE, PARADIGM-HF etc.) — nunca ao `TherapeuticSuggestion` que
`calcularExplainabilityScore` recebe. O bug era o cast tentando ler uma
propriedade de um tipo errado.

### Correção

Substituído por um sinal **real e por paciente**, já calculado em outro
lugar do sistema: `TherapeuticSuggestion.prioridade` (RM-26, priorização
clínica real — `preferencial`/`primeira_linha`/`contextual`, com
`motivo` textual). Mapeamento ordinal simples (heurística interna de UI,
mesmo padrão já usado para o componente NNT logo abaixo no mesmo
arquivo — não é um dado clínico que precise de citação):

| `prioridade.tier` | valor do componente |
|---|---|
| `preferencial` | 100 |
| `primeira_linha` | 75 |
| `contextual` | 55 |
| não classificado | 65 (neutro — nem penaliza nem beneficia) |

A descrição agora cita a prioridade real e o `motivo` do RM-26 em vez do
texto fixo "Trust Score do motor de evidência".

## Achado 2 (investigado, falso positivo) — critérios de escore com `?? 0`

`prognostic-engine.ts` (CURB-65, CHA₂DS₂-VASc, HAS-BLED, Wells,
Child-Pugh, PEWS, FRAX): todas as funções `calcular()` usam `(v.campo ??
0)` para os critérios booleanos.

Rastreamento até o consumidor real (`app/calculadoras/page.tsx:58-65`,
função `calcular()` do componente `ScoreCard`) mostrou que a UI **já
bloqueia** o cálculo se qualquer variável declarada em `score.variaveis`
não tiver sido respondida:

```
if (raw === undefined || raw === '') {
  setError(`Preencha: "${v.label}"`);
  return;
}
```

Ou seja, `score.calcular()` só é chamado depois que **todas** as
variáveis já têm um valor numérico válido — o `?? 0` dentro de
`prognostic-engine.ts` nunca é alcançado com dado ausente na prática.
Confirmado como não-bug — nenhuma alteração necessária.

## Testes novos

`rm86-explainability-adequacao-paciente.test.ts` (3 testes): prova, via
`gerarExplainableAIv2()` real (não mock) sobre sugestões reais de
`getTherapeuticForCondition('has', ...)`, que o componente "Adequação ao
Paciente" (a) nunca mais é a constante 70, (b) varia entre `preferencial`
(100) e `primeira_linha` (75) — prova de que reflete dado real por
sugestão, (c) a descrição cita "Prioridade clínica", nunca mais "Trust
Score do motor de evidência", e (d) sem prioridade classificada cai no
valor neutro 65 com descrição honesta, nunca fingindo um cálculo.

## Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **66 arquivos / 1134 testes** |
| `npm run build` | ✅ Sucesso — 50 rotas geradas |

---

## Arquivos alterados

**Novo:**
- `docs/RM-86-EXPLAINABILITY-FAKE-TRUST-SCORE-FIX.md` (este relatório)
- `frontend/src/tests/rm86-explainability-adequacao-paciente.test.ts`

**Modificado:**
- `frontend/src/lib/explainable-ai-v2.ts`

---

Não foi feito commit, push ou deploy nesta RM.
