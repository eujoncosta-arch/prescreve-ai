# RM-88 — Cobertura de testes dedicados para `explainable-ai-v2.ts`

**Origem:** item do roadmap `docs/RM-60-SCIENTIFIC-INTELLIGENCE-ROADMAP.md`
(§9, esforço "Médio") nunca fechado por completo: o motor Explainable AI
2.0 (WHY / WHY NOT / WHAT IF / ALTERNATIVAS / Explainability Score) nunca
teve testes dedicados — só o componente "Adequação ao Paciente" do score
foi coberto pelo RM-86. O usuário escolheu esta direção ao ser perguntado
"o que mais falta avançar no roadmap".

## O que foi feito

Escritos **34 novos testes** cobrindo as 6 seções do motor com dados
reais (`getTherapeuticForCondition`, protocolos reais de
`clinical-therapeutics.ts`) — nunca mocks, mesmo padrão já usado em
`rm86-*`/`rm87-*`:

- **`gerarWHY`**: entrada curada vs. fallback honesto, cálculo de
  `score_evidencia`.
- **`gerarWHYNOT`**: cada tipo de restrição (gestação, TFG em 3 faixas,
  hiperpotassemia em 2 faixas, bradicardia, hipotensão, asma,
  Child-Pugh, interações IECA+ARM/ARNI+IECA), ajuste de dose, textos de
  resumo, `alternativa_sugerida`.
- **`gerarWHATIF`**: cenários reais por CID, bônus/penalidade de
  adequação ao paciente, CID sem cenários mapeados (sem exceção), CID
  com sufixo.
- **`gerarALTERNATIVAS`**: lista real por CID, CID não mapeado (lista
  vazia honesta, nunca inventada), disclaimer de hierarquia clínica.
- **`calcularExplainabilityScore`**: soma ponderada exata, limiares de
  nível/cor, `confiavel_para_prescricao`, completude de dados clínicos,
  bucket de NNT.
- **`gerarExplainableAIv2`** (orquestrador): integração das 4 seções +
  score, funciona sem anamnese.

## Achados corrigidos ao escrever a cobertura

Escrever os testes — em vez de só documentar o comportamento existente —
expôs dois bugs reais que a ausência de testes dedicados deixava
invisíveis:

### 1. Segundo caso do antipadrão `trust_score` do RM-86, em `gerarWHYNOT`

`gerarWHYNOT` tinha um bloco de restrição "Trust Score baixo" que lia
`(med as unknown as Record<string, unknown>).trust_score` — exatamente o
mesmo cast mascarando a ausência do campo que o RM-86 corrigiu, só que
numa função diferente (`gerarWHYNOT`, não `calcularExplainabilityScore`)
e por isso não detectado naquela RM. Como `TherapeuticSuggestion` nunca
teve `trust_score`, este bloco era **código morto desde sempre** — nunca
executou em produção, para nenhuma sugestão, nunca.

**Correção**: removido. Não corrigido para "funcionar de verdade" porque
não existe hoje um trust score real por sugestão terapêutica para
substituir — inventar um fabricaria um dado inexistente, violando a
disciplina do projeto contra fabricação de dado clínico. Comportamento
observável é idêntico (o branch nunca disparava).

### 2. Normalização de nome de molécula em `gerarWHY` tornava combinações inatingíveis

`EVIDENCIA_DB` usa `"/"` como separador para combinações (ex.:
`"sacubitril/valsartana"`, `"budesonida/formoterol"`), mas o motor real
de terapêutica (`clinical-therapeutics.ts`) grava `molecula` com `"+"`
(ex.: `"Sacubitril + Valsartana"`, `"Budesonida + Formoterol"`). A
normalização antiga de `gerarWHY` só removia espaços — nunca casava `"+"`
com `"/"`. Resultado: os verbetes curados dessas 2 combinações (com
estudos pivotais reais, mecanismo, DOI) eram **inatingíveis** para
qualquer `TherapeuticSuggestion` real — todo paciente com asma em
Budesonida+Formoterol, por exemplo, sempre caía no fallback genérico em
vez de usar a entrada curada do GINA 2025.

**Correção**: nova função `normalizeMolecula()` que reduz ambos os lados
(chave do `EVIDENCIA_DB` e `med.molecula`) só a letras/dígitos antes de
comparar, via um mapa `EVIDENCIA_DB_NORMALIZADO` construído uma vez.
Confirmado pelo teste dedicado: `gerarWHY(BUDESONIDA_FORMOTEROL)` agora
usa a entrada curada (estudo SYGMA 2, sociedade GINA/SBPT).

### 3. (Achado, não corrigido) Violação do guard RM-06 em `comparador-context.ts`

Ao rodar o gate de lint desta RM, apareceu um erro que já existia desde o
RM-87 e não tinha sido detectado antes (o lint daquela RM rodou em
background e seu resultado não foi lido linha a linha, só o código de
saída): `comparador-context.ts` (novo, RM-87) importava o tipo
`MoleculaComparavel` diretamente de `drug-comparator.ts` — módulo na
lista restrita do guard RM-06 (`no-restricted-imports`), cuja allowlist
deliberadamente **não** inclui arquivos novos de `src/lib/**` (só
`src/app/comparador/page.tsx`, consumidor pré-existente).

**Correção**: `resolverPreenchimentoComparador` tornada genérica
(`<T extends { id: string; molecula: string }>`) em vez de importar o
tipo concreto — elimina o import proibido sem duplicar a definição do
tipo. `page.tsx` (que já é allowlisted) continua importando
`MoleculaComparavel` normalmente e o TypeScript infere `T` a partir do
array `MOLECULES_DB` passado na chamada.

## O que NÃO foi alterado

Nenhum dado clínico (EVIDENCIA_DB, ALTERNATIVAS_DB, WHATIF_DB), nenhuma
regra de segurança/contraindicação, nenhum cálculo de score além dos 2
bugs acima. A API pública das 6 funções exportadas não mudou de
assinatura (exceto `resolverPreenchimentoComparador`, agora genérica, de
forma compatível com todo uso existente).

## Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas (1 erro real encontrado e corrigido durante esta RM — ver achado #3) |
| `npx vitest run` (suíte completa) | ✅ **68 arquivos / 1174 testes** |
| `npm run build` | ✅ Sucesso — 50 rotas geradas |

---

## Arquivos alterados

**Novo:**
- `docs/RM-88-EXPLAINABLE-AI-V2-DEDICATED-TEST-COVERAGE.md` (este relatório)
- `frontend/src/tests/rm88-explainable-ai-v2-coverage.test.ts`

**Modificados:**
- `frontend/src/lib/explainable-ai-v2.ts` — remoção do bloco morto de
  `trust_score` em `gerarWHYNOT`; `normalizeMolecula()` +
  `EVIDENCIA_DB_NORMALIZADO` em `gerarWHY`.
- `frontend/src/lib/comparador-context.ts` — `resolverPreenchimentoComparador`
  tornada genérica para não violar o guard RM-06 (achado desta RM, não
  do RM-87 original, mas corrigido no mesmo arquivo).

---

Não foi feito commit, push ou deploy nesta RM.
