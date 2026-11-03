# RM-91 — Novas condições: Gota (M10) e DRGE (K21)

**Origem:** continuação da expansão de cobertura clínica iniciada no
RM-90. O usuário pediu explicitamente para adicionar as outras duas
candidatas apresentadas originalmente (Gota, DRGE), que não tinham sido
escolhidas na rodada anterior (Enxaqueca).

## Escopo e limite de confiança nas citações

Mesma disciplina do RM-90: sem documento-fonte único verificado linha a
linha fornecido pelo usuário, as doses/classes/contraindicações usadas
são farmacologia básica amplamente estabelecida, e o campo `citacao`
cita as sociedades de referência (ACR/EULAR/SBR para gota, ACG/FBG para
DRGE) **sem DOI específico** — `doi` deixado `undefined` em todas as
sugestões desta RM, nunca inventado. Teste dedicado trava isso.

## O que foi feito — mesmas 3 camadas do RM-90

### 1. `frontend/src/lib/clinical-decision-support.ts` — motor diagnóstico

**Gota (M10)**: critérios ACR/EULAR 2015 — podagra (1º MTF), dor
articular aguda monoarticular de início súbito, sinais inflamatórios
(rubor/calor/edema), tofos, hiperuricemia laboratorial (`acido_urico` >
6,8 mg/dL — chave já usada em `interoperability-engine.ts`, LOINC
3084-1), fatores de risco (etilismo, diurético em uso, obesidade). Red
flag: monoartrite aguda + febre → suspeita de artrite séptica, exige
investigação urgente (aspiração articular) antes de tratar como gota.

**DRGE (K21)**: critérios clínicos típicos — pirose/azia retroesternal,
regurgitação ácida, piora pós-prandial/ao deitar, sintomas atípicos
(tosse crônica, rouquidão). Red flags (ACG "alarm features"): disfagia/
odinofagia, perda de peso não intencional, sangramento GI, idade > 60
com sintomas novos.

### 2. `frontend/src/lib/clinical-therapeutics.ts` — motor terapêutico

**Gota**: tratamento agudo (Colchicina em esquema de baixa dose —
superior em segurança ao esquema antigo de alta dose, AGREE trial;
Naproxeno) + terapia hipouricemiante/ULT (Alopurinol). A sugestão de
Alopurinol explicita no próprio texto da `indicacao` e nas
`contraindicacoes` que **nunca** deve ser iniciado durante a crise aguda
(pode prolongá-la ou precipitar nova crise) — regra clínica real,
testada.

**DRGE**: Omeprazol (IBP) como 1ª linha, com alternativas (Pantoprazol,
Famotidina, Domperidona adjuvante). Medidas não farmacológicas completas
(elevação de cabeceira, evitar deitar pós-prandial, gatilhos
alimentares, cessação de tabagismo).

### 3. Join entre as camadas

`CID_CONDITION_MAP` (usado por `/explicabilidade`) ganhou `M10: 'gota'`
e `K21: 'drge'`. `hipotese.id` do motor diagnóstico (`'gota'`, `'drge'`)
casa exatamente com as chaves `gota:`/`drge:` do motor terapêutico, sem
mapeamento adicional — mesmo padrão do RM-90.

## O que NÃO foi alterado / fora de escopo

Mesmo limite já documentado no RM-90: `second-opinion.ts` e
`EVIDENCIA_DB`/`ALTERNATIVAS_DB`/`WHATIF_DB` de `explainable-ai-v2.ts`
não ganharam entradas para gota/DRGE — fallback honesto já testado,
nunca quebra. Nenhum motor clínico pré-existente foi alterado.

## Testes novos

`rm91-gota-drge-coverage.test.ts` (19 testes): quadro típico reconhecido
com CID correto para as duas condições; critério laboratorial de
hiperuricemia; red flags (artrite séptica, disfagia, sangramento GI)
disparam `encaminhamento_urgente`; quadro típico sem red flag não
dispara urgência; anamnese vazia nunca sugere nenhuma das duas
condições; protocolos terapêuticos cobrem as moléculas esperadas;
Alopurinol nunca indicado para início em crise aguda; Colchicina
contraindica interação com CYP3A4; nenhum DOI fabricado; join
diagnóstico→terapêutico funciona para as duas condições;
`CID_CONDITION_MAP` correto.

## Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **71 arquivos / 1215 testes** |
| `npm run build` | ✅ Sucesso — 50 rotas; RM-23/24 sem novas inconsistências |

---

## Arquivos alterados

**Novo:**
- `docs/RM-91-GOTA-DRGE-NOVAS-CONDICOES.md` (este relatório)
- `frontend/src/tests/rm91-gota-drge-coverage.test.ts`

**Modificados:**
- `frontend/src/lib/clinical-decision-support.ts` — novas regras diagnósticas `gota` (M10) e `drge` (K21).
- `frontend/src/lib/clinical-therapeutics.ts` — novos protocolos terapêuticos `gota` e `drge`.
- `frontend/src/lib/explicabilidade-context.ts` — `CID_CONDITION_MAP` ganhou `M10: 'gota'` e `K21: 'drge'`.

---

Não foi feito commit, push ou deploy nesta RM.
