# RM-92 — Aprofunda Enxaqueca, Gota e DRGE em `/segunda-opiniao` e `/explicabilidade`

**Origem:** RM-90/91 amarraram as 3 condições (Enxaqueca G43, Gota M10,
DRGE K21) ao motor diagnóstico e terapêutico reais, mas deixaram
explicitamente fora de escopo `second-opinion.ts`
(`/segunda-opiniao`) e as bases `EVIDENCIA_DB`/`ALTERNATIVAS_DB`/
`WHATIF_DB` de `explainable-ai-v2.ts` (`/explicabilidade`) — funcionais
via fallback honesto (já testado nas RM-87/88/89), mas rasas: sem
entrada curada, nenhuma das duas páginas tinha conteúdo real para essas
3 condições. O usuário pediu explicitamente para aprofundar.

## Escopo desta RM e limite de confiança mantido

Mesma disciplina do RM-90/91: sem documento-fonte único verificado linha
a linha para nenhuma das 3 condições. Diferente de várias entradas
pré-existentes em `second-opinion.ts`/`explainable-ai-v2.ts` (que citam
trials específicos com `n_pacientes`/resultado quantificado, ex. FLOW,
SPARCL, CAPRIE), as entradas desta RM **não citam nenhum trial com
número específico não verificado**:

- `second-opinion.ts`: `evidencia.estudos: []` em todas as novas opções (testado).
- `explainable-ai-v2.ts` `ALTERNATIVAS_DB`: campo opcional `nnt` nunca preenchido para as 3 condições (testado).

Por isso, **`EVIDENCIA_DB`** (que exige `estudos: EstudoPivotal[]` com
`n_pacientes`/`resultado` obrigatórios) e **`WHATIF_DB`** (que exige
`mortalidade_relativa`/`nnt` quantificados por cenário) ficaram
deliberadamente **fora do escopo** desta RM — adicioná-los exigiria
inventar números de estudo não verificados, o mesmo padrão de fabricação
já corrigido nas RM-76/77/79/81. `gerarWHY()` continua usando o fallback
honesto já testado (RM-88) para essas 3 condições.

## O que foi feito

### 1. `frontend/src/lib/second-opinion.ts` — `/segunda-opiniao`

3 novas `CondicaoClinica` (`enxaqueca`, `gota`, `drge`), cada uma com
2–4 `CondutaOpcao` (Naproxeno/Sumatriptano/Propranolol/Topiramato para
enxaqueca; Colchicina/Naproxeno/Alopurinol para gota; Omeprazol/
Famotidina para DRGE), com benefícios/riscos/contraindicações/diretriz
honestos e completos.

As `moleculas` de cada `CondutaOpcao` usam exatamente os mesmos nomes
DCI já cadastrados em `clinical-therapeutics.ts` (RM-90/91) — mesmo join
key reusado nas RM-87/89, confirmado por teste dedicado.

### 2. `frontend/src/lib/explainable-ai-v2.ts` — `/explicabilidade`

3 novas entradas em `ALTERNATIVAS_DB` (`G43`, `M10`, `K21`), cada uma
com as mesmas moléculas/classes já documentadas, sem `nnt` fabricado.
`gerarALTERNATIVAS()` agora retorna conteúdo real para essas 3 condições
em vez da lista vazia com nota genérica.

### 3. Efeito colateral positivo confirmado: RM-89 agora resolve conduta completa

O resolver `resolverPreenchimentoSegundaOpiniao` (RM-89) já existia e já
tentava casar a molécula de maior prioridade do plano terapêutico contra
`CondutaOpcao.moleculas` — mas, antes desta RM, `enxaqueca`/`gota`/`drge`
não tinham nenhuma `CondicaoClinica` cadastrada, então o resolver só
conseguia (na melhor das hipóteses) achar a condição e retornar
`condutaId: null`. Com as novas entradas, uma consulta real com uma
dessas 3 condições agora pré-preenche **condição E conduta completas**
em `/segunda-opiniao` — sem nenhuma mudança no código do resolver em si,
confirmado por 3 novos testes.

## O que NÃO foi alterado

Nenhum motor clínico pré-existente, nenhum dado de condições já
cobertas. `EVIDENCIA_DB` e `WHATIF_DB` de `explainable-ai-v2.ts`
permanecem sem entrada para as 3 condições (fallback honesto, ver acima).

## Testes novos

`rm92-enxaqueca-gota-drge-deepening.test.ts` (13 testes): as 3
`CondicaoClinica` existem com CID correto; nenhuma opção cita estudo
específico; `gerarSegundaOpiniao()` funciona de ponta a ponta para as 3;
moléculas batem com o motor real; `resolverPreenchimentoSegundaOpiniao`
(RM-89) agora resolve `condutaId` completo para as 3 (regressão
positiva, antes só `condicaoId`); `gerarALTERNATIVAS()` retorna conteúdo
real para as 3 CIDs; nenhum `nnt` fabricado.

## Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **72 arquivos / 1228 testes** |
| `npm run build` | ✅ Sucesso — 50 rotas; RM-23/24 sem novas inconsistências |

---

## Arquivos alterados

**Novo:**
- `docs/RM-92-ENXAQUECA-GOTA-DRGE-APROFUNDAMENTO.md` (este relatório)
- `frontend/src/tests/rm92-enxaqueca-gota-drge-deepening.test.ts`

**Modificados:**
- `frontend/src/lib/second-opinion.ts` — 3 novas `CondicaoClinica` (enxaqueca, gota, drge).
- `frontend/src/lib/explainable-ai-v2.ts` — 3 novas entradas em `ALTERNATIVAS_DB`.

---

Não foi feito commit, push ou deploy nesta RM.
