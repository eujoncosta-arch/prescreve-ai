# RM-94 — `EVIDENCIA_DB`/`WHATIF_DB` para Enxaqueca/Gota/DRGE: só o que passou na verificação

**Origem:** o usuário pediu para completar `EVIDENCIA_DB` e `WHATIF_DB` das 3
condições (RM-90/91/92), agora com busca ativa, **aplicando a regra: só
entra o que for confirmado em 2+ fontes**. Esta RM aplica a regra de forma
estrita; o resultado é que **só 1 de 8 moléculas passou**, e isso é o
comportamento correto, não uma falha.

## Resultado da verificação, molécula por molécula

| Molécula | Veredito | Motivo |
|---|---|---|
| **Topiramato** | ✅ Entrou | Dois ECRs independentes, cada número confirmado em fonte primária (PubMed): MIGR-002 (PMID 14982912): 49% vs 23%, n=483. MIGR-001 (PMID 15096395): 54,0% vs 22,6%, n=487. |
| Propranolol | ❌ | 2 meta-análises concordam no efeito (RR 1,65 e RR 1,4), mas o NNT derivado diverge (≈6 vs ≈9). Uma delas tem contagem de pacientes inconsistente no próprio texto (592 vs 982). |
| Sumatriptano | ❌ | NNT 6,1 (50 mg, livre de dor em 2h) vem de um único documento (revisão Cochrane CD008615), mesmo visto em espelhos. Não é 2 fontes independentes. |
| Alopurinol | ❌ | O ensaio disponível (CONFIRMS) compara com febuxostate, não com placebo: sem NNT calculável. |
| Omeprazol / Famotidina | ❌ | Cochrane CD002095 só reporta RR (0,37 e 0,71), sem taxas absolutas nem NNT; o texto completo retornou 403. |
| Naproxeno | ❌ | Nenhum ensaio com números verificados encontrado. |

### Discrepância encontrada e resolvida antes de usar

A 1ª busca atribuiu números diferentes ao que pareciam ser o mesmo estudo
(49% vs 23% e 54,0% vs 22,6%). Verificação em fonte primária mostrou que
são **dois ensaios distintos** (MIGR-002 em JAMA, MIGR-001 em Arch
Neurol), cada um com seu n. O RM-93 tinha só o n do MIGR-002; o n do
MIGR-001 (487) foi confirmado agora e adicionado.

## O que foi feito

- **`explainable-ai-v2.ts`**: nova entrada `EVIDENCIA_DB.topiramato` com os
  dois ensaios e NNT computado (não inventado): MIGR-002 ARR 26,0 pp → NNT
  3,85; MIGR-001 ARR 31,4 pp → NNT 3,18; adotado NNT 4 (arredondado para
  cima). `gerarWHY()` agora usa o caminho curado para topiramato.
- **`second-opinion.ts`** e **`drug-comparator.ts`**: `n` do MIGR-001 (487),
  taxas de resposta reais e NNT nos dois ensaios, consistentes entre as 3
  camadas (travado por teste).

## O que NÃO entrou e por quê

- **`WHATIF_DB`** continua sem entrada para G43/M10/K21. Uma comparação "o
  que acontece se eu escolher outro tratamento" exige ≥ 2 cenários com NNT
  verificado; cada condição tem, no máximo, 1 (topiramato em G43,
  colchicina em M10, nenhum em K21). Um cenário único não é uma
  comparação honesta. Além disso, o campo `trust_score` das entradas
  existentes é uma nota editorial sem método publicado — não vou
  atribuí-la sem base.
- As 7 moléculas acima mantêm o fallback honesto já testado (RM-88),
  agora com **trava de regressão**: teste garante que continuam sem NNT
  fabricado.

## Como destravar o restante

Qualquer item acima passa a entrar assim que houver uma segunda fonte
independente. Candidatos mais próximos: propranolol (reconciliar as 2
meta-análises abrindo os dados por ensaio) e sumatriptano (achar uma
segunda revisão sistemática independente, ex.: meta-análise de triptanos
com NNT por dose).

## Testes

`rm94-evidencia-topiramato-verificada.test.ts` (10 testes): estudos e n
corretos; NNT recomputável das taxas reais; RAR bate com a diferença
real; consistência entre as 3 camadas; e **travas negativas** — 6
moléculas continuam sem entrada curada e `WHATIF_DB` continua vazio para
as 3 condições.

## Gates

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` | ✅ **74 arquivos / 1255 testes** |
| `npm run build` | ✅ 50 rotas |

## Arquivos

**Novos:** `docs/RM-94-EVIDENCIA-DB-TOPIRAMATO-VERIFICADO.md`,
`frontend/src/tests/rm94-evidencia-topiramato-verificada.test.ts`

**Modificados:** `frontend/src/lib/explainable-ai-v2.ts`,
`frontend/src/lib/second-opinion.ts`, `frontend/src/lib/drug-comparator.ts`

---

Não foi feito commit, push ou deploy nesta RM.
