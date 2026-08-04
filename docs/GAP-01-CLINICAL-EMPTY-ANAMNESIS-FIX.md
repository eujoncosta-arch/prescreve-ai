# GAP-01 — Correção: Anamnese Vazia Não Deve Gerar Hipótese Espúria

**Origem do achado:** RM-64 (`docs/RM-64-CLINICAL-JOURNEY-MATRIX.md`, CJ-010),
documentado e deliberadamente não corrigido naquela RM (suíte de aceitação,
não de correção de motor clínico). Corrigido aqui como RM própria e isolada,
por solicitação explícita.

**Escopo:** exclusivamente o motor de hipóteses diagnósticas
(`clinical-decision-support.ts`). Nenhum outro motor, dado farmacológico,
protocolo terapêutico ou regra de segurança foi tocado.

---

## 1. Causa raiz (confirmada por leitura de código, não suposta)

A regra `faringoamigdalite` (`BASE_CLINICA`) tinha 2 dos seus 6 critérios
baseados em **ausência** de sintoma:

```ts
{
  descricao: 'Ausência de tosse (critério de Centor — aumenta probabilidade bacteriana)',
  check: a => !has(txt(a.queixa_principal, a.hda), 'tosse'),
  peso: 3,
},
{
  descricao: 'Ausência de sintomas virais (coriza, conjuntivite, úlceras orais)',
  check: a => !has(txt(a.queixa_principal, a.hda), 'coriza', 'conjuntivite', 'úlcera', 'afta', 'herpes'),
  peso: 3,
},
```

`has(text, ...keywords)` é `keywords.some(k => text.includes(k))`. Com
`queixa_principal`/`hda` vazios, `txt(...)` produz `''`, e
`''.includes('tosse')` é `false` — a negação (`!has(...)`) vira `true`.
Resultado: **dado não coletado** (`''`) era indistinguível de **sintoma
explicitamente negado**, e os dois critérios somavam 3+3=6 pontos, cruzando
`peso_minimo_para_incluir: 5` da regra **sozinhos**, sem nenhum outro dado
real de suporte.

Confirmado por execução direta antes da correção (via
`clinical-journey-acceptance-rm64.test.ts`, teste original do CJ-010):
`analyzeClinical(anamneseVazia).hipoteses` continha 1 entrada
(`faringoamigdalite`, `grau_confianca: 22`, `probabilidade: 'baixa'`).

**Verificado nesta sessão:** este é o **único** lugar do motor com esse
padrão — `grep` por `!has(` em todo `clinical-decision-support.ts` retornou
exatamente essas 2 ocorrências, ambas na mesma regra. Nenhuma outra das
demais condições de `BASE_CLINICA` usa negação de `has()` como critério.

## 2. Correção aplicada

Novo helper `absenceOf(text, ...keywords)`, ao lado de `has`/`txt`:

```ts
const absenceOf = (text: string, ...keywords: string[]) =>
  text.trim().length > 0 && !has(text, ...keywords);
```

Exige que **haja texto real preenchido** antes de contar a ausência da
palavra-chave como evidência — "campo vazio" deixa de produzir `true`
silenciosamente. Os 2 critérios da regra `faringoamigdalite` foram
atualizados para usar `absenceOf(...)` em vez de `!has(...)`.

**O que NÃO mudou:** nenhuma regra clínica nova foi criada, nenhuma
palavra-chave foi adicionada/removida, nenhum peso foi alterado, nenhum
outro critério (positivo ou de outras condições) foi tocado. A mudança é
estritamente "quando `text` está vazio, o critério de ausência não conta
mais como verdadeiro" — o comportamento para texto preenchido é idêntico ao
anterior.

## 3. Verificação de não-regressão (dado real preenchido continua igual)

Testado explicitamente (não assumido):

| Cenário | Antes | Depois |
|---|---|---|
| Anamnese 100% vazia | 1 hipótese espúria (`faringoamigdalite`, 22%) | `hipoteses: []` |
| Queixa real de dor de garganta + febre + exsudato, sem menção a tosse | `faringoamigdalite`, `'alta'` | **Idêntico** — `faringoamigdalite`, `'alta'` |
| Mesmo caso, mas queixa MENCIONA tosse | Critério de ausência não pontuava (comportamento já correto) | **Idêntico** — confiança comprovadamente menor que o caso sem menção a tosse |
| Anamnese fraca (2 critérios reais de HAS, sem PA medida) | Hipótese, se presente, nunca `'alta'` | **Idêntico** |

## 4. Testes

- **Novo arquivo dedicado:** `frontend/src/tests/gap-01-absence-criteria.test.ts`
  (6 testes) — cobre anamnese vazia, anamnese parcialmente vazia (só sinais
  vitais), e 3 cenários de não-regressão com dado real preenchido.
- **`clinical-journey-acceptance-rm64.test.ts` (CJ-010) atualizado:** o teste
  que documentava o gap como "LACUNA CLÍNICA (GAP-01)" com
  `expect(apoio.hipoteses.length).toBeGreaterThan(0)` agora afirma o
  comportamento corrigido: `expect(apoio.hipoteses).toEqual([])`. Título e
  comentários atualizados para refletir a correção, sem apagar o histórico
  do achado original.
- **Docs RM-64 atualizadas** (`RM-64-CLINICAL-JOURNEY-MATRIX.md`,
  `RM-64-CLINICAL-JOURNEY-ACCEPTANCE.md`): seções de GAP-01 marcadas como
  corrigidas, com link para esta RM e para o novo arquivo de teste — o
  registro histórico do achado original foi preservado, não removido.

## 5. Gates executados nesta sessão

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npx eslint .` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **59 arquivos / 1082 testes** — todos passando (6 novos desta correção; os 1076 pré-existentes continuam verdes, confirmando que nenhum outro teste dependia do comportamento com bug) |
| `npm run test:coverage` | ✅ Exit 0 |
| `npm run build` | ✅ Sucesso — `[RM-23]` 368 entidades/0 inconsistências · `[RM-24]` 0 críticos · `[RM-49]` 0 sequências suspeitas · `[RM-62]` `BLOCKING_ERROR=0` (nenhum destes gates tem relação com o motor de hipóteses, mas todos permanecem verdes) |

`DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md`, regenerados
como efeito colateral do build, foram revertidos (`git checkout --`).

## 6. Arquivos alterados

**Modificados:**
- `frontend/src/lib/clinical-decision-support.ts` — novo helper `absenceOf`; 2 critérios da regra `faringoamigdalite` migrados de `!has(...)` para `absenceOf(...)`
- `frontend/src/tests/clinical-journey-acceptance-rm64.test.ts` — teste do CJ-010 atualizado para o comportamento corrigido
- `docs/RM-64-CLINICAL-JOURNEY-MATRIX.md` — seção GAP-01 marcada como corrigida
- `docs/RM-64-CLINICAL-JOURNEY-ACCEPTANCE.md` — seção GAP-01, tabela de métricas e lista de próximos passos atualizadas

**Novos:**
- `frontend/src/tests/gap-01-absence-criteria.test.ts`
- `docs/GAP-01-CLINICAL-EMPTY-ANAMNESIS-FIX.md` (este relatório)

Nenhum dado farmacológico, protocolo terapêutico, motor de risco/segurança/
dose ou arquivo de configuração foi alterado.

---

Não foi feito commit, push ou deploy nesta RM.
