# RM-93 — Completa `/comparador` para Enxaqueca/Gota/DRGE + substitui citações sem DOI por fontes reais e verificadas

**Origem:** o usuário pediu explicitamente para (1) completar `/comparador`
para as 3 condições do RM-90/91 (Sumatriptano, Colchicina, Alopurinol,
Omeprazol etc. não estavam no catálogo `MOLECULES_DB`) e (2) buscar
fontes reais — periódicos, diretrizes, artigos de revistas de grande
relevância — para dar embasamento a tudo que ficou sem DOI nas RM-90/91/92
por falta de confiança verificada.

## Método: busca ativa, cada DOI confirmado antes de uso

Diferente das RM-90/91/92 (que usaram apenas conhecimento já internalizado,
sem verificação), esta RM usou busca na web ativamente para cada citação,
cruzando múltiplas fontes antes de aceitar um DOI como real. Nenhuma
citação foi aceita com confirmação de uma fonte só.

### Fontes confirmadas (DOI verificado por busca, cruzado entre ≥ 2 fontes)

| Fonte | Citação completa | DOI |
|---|---|---|
| AHS Consensus 2021 (tratamento agudo) | Ailani J, Burch RC, Robbins MS. Headache. 2021;61(7):1021-1039. | `10.1111/head.14153` |
| AAN/AHS 2012 (profilaxia) | Silberstein SD, Holland S, Freitag F, Dodick DW, Argoff C, Ashman E. Neurology. 2012;78(17):1337-1345. | `10.1212/WNL.0b013e3182535d20` |
| MIGR-002 (topiramato) | Brandes JL et al. JAMA. 2004;291(8):965-973. n=483. | `10.1001/jama.291.8.965` |
| MIGR-001 (topiramato) | Silberstein SD et al. Arch Neurol. 2004;61(4):490-495. | `10.1001/archneur.61.4.490` |
| Cochrane (sumatriptano oral) | Derry CJ, Derry S, Moore RA. Cochrane Database Syst Rev. 2012. | `10.1002/14651858.CD008615.pub2` |
| ACR 2020 (gota) | FitzGerald JD, Dalbeth N, Mikuls T, et al. Arthritis Care Res. 2020;72(6):744-760. | `10.1002/acr.24180` |
| AGREE Trial (colchicina) | Terkeltaub RA et al. Arthritis Rheum. 2010;62(4):1060-1068. n=185. | `10.1002/art.27327` |
| ACG 2022 (DRGE) | Katz PO, Dunbar KB, Schnoll-Sussman FH, et al. Am J Gastroenterol. 2022;117(1):27-56. | `10.14309/ajg.0000000000001538` |
| ICHD-3 (critérios diagnósticos) | Headache Classification Committee of IHS. Cephalalgia. 2018;38(1):1-211. | `10.1177/0333102417738202` |

### Achado ao verificar: atribuição de coautoria indevida corrigida

Ao cruzar as fontes, 3 campos `sociedade`/`orgao` escritos nas RM-90/91/92
atribuíam coautoria a sociedades brasileiras (SBCe, SBR, FBG) que **não
são coautoras** das publicações internacionais reais citadas — eram
suposições razoáveis mas não verificadas, do mesmo tipo que este projeto
já corrigiu antes (RM-76/77/79/81, DOIs fabricados ou desatualizados).
Corrigido em `clinical-decision-support.ts`, `clinical-therapeutics.ts` e
`second-opinion.ts`: atribuição agora cita só a organização real que
publicou cada documento (ex.: "ACR" em vez de "ACR / EULAR / SBR" para o
guideline de 2020, que é só do ACR — EULAR é coautor apenas dos critérios
de classificação de 2015, mantido separado no campo `diretriz`).

### NNT real computado (não inventado) para Colchicina

`explainable-ai-v2.ts` ganhou uma entrada em `EVIDENCIA_DB` para
Colchicina com `nnt: 5` — **calculado diretamente** dos percentuais reais
do AGREE Trial, não um número inventado: resposta ≥50% redução de dor
foi 37,8% (baixa dose) vs. 15,5% (placebo) → ARR = 22,3 pontos
percentuais → NNT = 1/0,223 ≈ 4,48 → arredondado para 5. Esse é o único
NNT computado nesta RM — para as demais 7 moléculas, mantive `estudos: []`
onde não havia um n/resultado específico que eu pudesse verificar com
confiança (ex.: a revisão Cochrane de sumatriptano sintetiza múltiplos
ensaios sem um "n total" único que eu tivesse confiança de citar
corretamente).

## O que foi feito

### 1. `frontend/src/lib/drug-comparator.ts` — `/comparador` completo

8 novas entradas em `MOLECULES_DB`, no mesmo nível de detalhe das 14 já
existentes (farmacocinética completa, interações, custo, adesão, marcas
reais): **Naproxeno** (compartilhado entre enxaqueca e gota — mesma
molécula, `cids_principais: ['G43', 'M10']`), **Sumatriptano**,
**Propranolol**, **Topiramato**, **Colchicina**, **Alopurinol**,
**Omeprazol**, **Famotidina**. `CategoriaComparacao` ganhou 3 categorias
novas (`neurologia`, `reumatologia`, `gastroenterologia`), com
`CATEGORIA_LABEL`/`CATEGORIA_COR` atualizados.

Dados farmacocinéticos (meia-vida, biodisponibilidade, metabolismo,
excreção, mecanismo molecular) são farmacologia básica de bula/livro-texto
— mesmo nível de confiança já usado para as 14 moléculas pré-existentes,
não citações de ensaio clínico.

### 2. `frontend/src/lib/clinical-therapeutics.ts` — DOIs reais

As 8 sugestões terapêuticas de Enxaqueca/Gota/DRGE (RM-90/91) ganharam
`evidencia.doi` real e `citacao` com autor/revista/ano/volume/página
exatos, substituindo o estado "sem DOI" original dessas RMs.

### 3. `frontend/src/lib/second-opinion.ts` — estudos reais onde verificados

Sumatriptano (Cochrane), Topiramato (MIGR-001 + MIGR-002, com `n` real) e
Colchicina (AGREE, `n: 185` real) ganharam `evidencia.estudos` preenchido.
As demais 6 opções mantêm `estudos: []` — honesto, sem trial individual
que eu tivesse confiança para citar com n/resultado específico.

### 4. `frontend/src/lib/explainable-ai-v2.ts`

Nova entrada em `EVIDENCIA_DB` para `colchicina` (NNT real computado, ver
acima) — `gerarWHY()` agora usa o caminho curado para essa molécula, não
mais o fallback genérico. `ALTERNATIVAS_DB` das 3 condições teve o campo
`diretriz` corrigido para as citações reais (autor + DOI).

### 5. `frontend/src/lib/clinical-decision-support.ts`

Links de diretriz corrigidos para URLs resolvíveis por DOI
(`https://doi.org/...`), e atribuição de sociedade corrigida (ver achado
acima).

## O que continua fora de escopo

`WHATIF_DB` de `explainable-ai-v2.ts` continua sem entrada para as 3
condições — exigiria `mortalidade_relativa`/`trust_score` quantificados
por cenário que eu não tenho fonte verificada para computar com
confiança. 7 das 8 moléculas novas continuam sem `estudos` individuais
no motor de evidência (só a citação de diretriz/guideline, que é real e
verificada) — mesma régua de honestidade das RM-90/91/92, agora com o
adicional de que a régua foi **verificada por busca ativa**, não só
"lembrada".

## Testes novos e atualizados

`rm93-comparador-e-citacoes-reais.test.ts` (17 testes novos): catálogo
do comparador completo e funcional (busca, comparação par-a-par,
categorias); DOIs reais em `clinical-therapeutics.ts`; estudos reais com
`n` verificado em `second-opinion.ts`; nenhuma atribuição de coautoria
indevida; NNT real computado da Colchicina usado por `gerarWHY()`.

`rm90-enxaqueca-coverage.test.ts`/`rm91-gota-drge-coverage.test.ts`/
`rm92-enxaqueca-gota-drge-deepening.test.ts` atualizados: as asserções
"DOI/estudo ausente" (que documentavam o limite de confiança daquelas
RMs) foram substituídas por asserções "DOI/estudo real e verificado",
registrando o upgrade.

## Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **73 arquivos / 1245 testes** |
| `npm run build` | ✅ Sucesso — 50 rotas; RM-23/24 sem novas inconsistências (`drug-comparator.ts` não é uma das fontes comparadas por esse validador) |

---

## Arquivos alterados

**Novo:**
- `docs/RM-93-COMPARADOR-E-CITACOES-REAIS.md` (este relatório)
- `frontend/src/tests/rm93-comparador-e-citacoes-reais.test.ts`

**Modificados:**
- `frontend/src/lib/drug-comparator.ts` — 8 novas moléculas + 3 categorias.
- `frontend/src/lib/clinical-therapeutics.ts` — DOIs reais nas 8 sugestões de Enxaqueca/Gota/DRGE.
- `frontend/src/lib/second-opinion.ts` — estudos reais (Sumatriptano, Topiramato, Colchicina) + correção de atribuição de sociedade.
- `frontend/src/lib/explainable-ai-v2.ts` — nova entrada `EVIDENCIA_DB.colchicina` + correção de `ALTERNATIVAS_DB.diretriz`.
- `frontend/src/lib/clinical-decision-support.ts` — links de guideline corrigidos para DOI + correção de atribuição de sociedade.
- `frontend/src/tests/rm90-enxaqueca-coverage.test.ts`, `rm91-gota-drge-coverage.test.ts`, `rm92-enxaqueca-gota-drge-deepening.test.ts` — asserções atualizadas para refletir as citações reais.

---

Não foi feito commit, push ou deploy nesta RM.
