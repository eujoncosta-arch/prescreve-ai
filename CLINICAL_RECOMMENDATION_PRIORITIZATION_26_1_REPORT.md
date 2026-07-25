# CLINICAL_RECOMMENDATION_PRIORITIZATION_26_1_REPORT — RM-26.1

**Escopo:** refinamento da árvore de decisão de priorização (RM-26) — nenhuma molécula nova, nenhuma condição nova, nenhuma alteração de arquitetura. · **Modo:** evolução incremental, determinística, auditável.

---

## 1. Limitação do RM-26 que motivou o RM-26.1

Em `therapeutic-prioritization.ts`, o **Nível 1** só era alcançado quando:

```ts
if (s.hasComorbidityMatch.length > 0 && s.hasStructuredGuideline) { tier = 'preferencial' }
```

— comorbidade **E** diretriz estruturada, simultaneamente. O **Nível 2** era o `else` residual — nunca havia uma checagem **positiva** de "esta classe é reconhecida como 1ª linha para a condição". Isso era conservador (nunca promovia sem justificativa), mas conceitualmente incompleto: um paciente **sem comorbidade** via todas as opções empilhadas no mesmo nível sem o sistema declarar explicitamente que aquela classe é, de fato, respaldada como 1ª linha para a condição em si — a distinção pedida no enunciado (HAS sem comorbidade → IECA/BRA/BCC/Tiazídico continuam reconhecidos como Nível 2, não deveria depender de comorbidade) não era representada como um julgamento próprio.

## 2. Diferença entre prioridade individual e prioridade da condição

| | Pergunta | Fonte de dado |
|---|---|---|
| **Prioridade da condição** (Nível A) | A classe desta molécula é uma das classes já reconhecidas como elegíveis/1ª linha para esta condição? | `CONDITION_CLASS_KEYS[condição]` (RM-25.1, reaproveitado — mesma estrutura que já seleciona quais classes expandir) |
| **Prioridade individual** (Nível B) | A indicação **própria** da molécula (dado real, sourced) cita a comorbidade **real** deste paciente? | `DrugEntity.indications[]` vs. `Anamnesis.comorbidades[]` |

Uma diretriz **genérica da condição** (ex.: "ESC/ESH 2023 HAS — IECA 1ª linha") justifica **Nível 2**, nunca **Nível 1** sozinha — só uma característica **individual verificável** eleva a Nível 1, exatamente como pedido.

## 3. Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `src/lib/therapeutic-class-expansion.ts` | 3 identificadores privados (`classKeyOf`, `CONDITION_CLASS_KEYS`, `CLASS_LABELS`) passam a `export` — **nenhuma lógica alterada**, apenas visibilidade, para reuso sem duplicar |
| `src/lib/therapeutic-prioritization.ts` | Árvore de decisão reescrita: novo passo positivo "1ª linha da condição"; Nível 1 não exige mais diretriz; novo detector `detectEvidenceScope` (classe vs. molécula); ordenação por evidência mais aplicável |
| `src/lib/types.ts` | +1 tipo (`EvidenceScope`) e +1 campo **opcional** (`ClinicalPriority.evidencia_escopo?`) — aditivo, retrocompatível |
| `src/lib/clinical-therapeutics.ts` | **Não alterado** |
| `src/components/modules/TherapeuticPanel.tsx` | **Não alterado** |
| RM-00/06/22/23/24, `safety-rules.ts`, `pharma-core/*` | **Não alterados** |

## 4. Dados utilizados (todos já existentes — nenhum novo)

- `DrugEntity.therapeuticClass` (via `classKeyOf`, RM-25.1) → prioridade da condição.
- `DrugEntity.indications[]` vs. `Anamnesis.comorbidades[]` (com tabela de sinônimos bounded, RM-26) → prioridade individual.
- `DrugEntity.dosageRules[renal|hepatico]`, `interactions[]` → cautela (Nível 3, inalterado do RM-26).
- `DrugEntity.references[type=GUIDELINE|EVIDENCIA]` (texto sourced, RM-25) → `detectEvidenceScope`: presença do padrão **"Estudo <Nome>"** ou sigla de ensaio (ex.: "EMPA-REG", "RALES") no texto real classifica como evidência **de molécula**; ausência desse padrão, mas com `GUIDELINE` presente, classifica como evidência **de classe**. Nenhum dado inventado — apenas classificação do texto já sourced.

## 5. Critérios para Nível 1 (Preferencial para este paciente)

Indicação **própria** da molécula cita a comorbidade real do paciente (via sinônimos bounded) — **sozinho**, sem exigir diretriz adicional. Quando há, adicionalmente, evidência específica da molécula (`evidencia_escopo === 'molecula'`), isso reforça a justificativa textual, mas não é pré-requisito.

## 6. Critérios para Nível 2 (Primeira linha para a condição)

Checagem **positiva**: `classKeyOf(entity.therapeuticClass)` pertence a `CONDITION_CLASS_KEYS[condição]` — a classe já é uma das reconhecidas como 1ª linha para a condição (estrutura curada pelo time clínico, RM-25.1) — **independente de comorbidade**. Fallback conservador (classe não mapeável) também recai em Nível 2, nunca inventando nem promovendo.

## 7. Critérios para Nível 3 (Contextual)

Inalterado do RM-26: cautela renal/hepática ativa (texto real do `dosageRules`, não contraindicação) ou interação **não-contraindicada** com medicação em uso.

## 8. Critérios para Nível 4 (Excluída)

Inalterado — resolvido inteiramente a montante, no RM-25.1 (`isEligible` + `entityCoversCondition`). O RM-26.1 **nunca** reintroduz uma opção excluída (testado explicitamente).

## 9. Exemplos antes/depois

### HAS, paciente sem comorbidade

| | RM-26 | RM-26.1 |
|---|---|---|
| Preferencial | 0 | 0 |
| Primeira linha | 15 (por exclusão/fallback, sem checagem positiva) | **15 (checagem positiva: IECA/BRA/BCC/Tiazídico são `CONDITION_CLASS_KEYS['has']`)** |

Comportamento final idêntico em contagem, mas agora **declarado explicitamente** — cada sugestão traz `motivo: "Classe terapêutica reconhecida como opção de 1ª linha para esta condição..."` em vez de um fallback silencioso.

### HAS, paciente com DRC + Diabetes

| Molécula | RM-26 | RM-26.1 |
|---|---|---|
| Losartana | Preferencial (comorbidade **+** guideline) | Preferencial (comorbidade — `evidencia_escopo: "molecula"`, Estudo LIFE) |
| Enalapril | Preferencial (comorbidade **+** guideline) | Preferencial (comorbidade — `evidencia_escopo: "classe"`, sem ensaio nomeado próprio) |
| Olmesartana | Primeira linha | Primeira linha (sem indicação sourced para DRC — corretamente não promovida) |

A diferença relevante: **Enalapril agora expõe honestamente** que sua evidência é de classe, não um ensaio específico — antes essa distinção não existia.

## 10. Condições avaliadas

HAS, DM2, Dislipidemia, Asma, DPOC, ICC, SCA — nenhum protocolo novo, nenhuma molécula nova.

## 11. Impacto na quantidade de opções por nível

| Condição | Total | Pref. (sem contexto) | 1ª linha (sem contexto) | Pref. (com comorbidade) | 1ª linha (com comorbidade) | Excluídas |
|---|---|---|---|---|---|---|
| HAS | 15 | 0 | **15** | 5 | 10 | 0 |
| DM2 | 5 | 0 | **5** | 2 | 3 | 2 |
| Dislipidemia | 4 | 0 | **4** | 0 | 4 | 0 |
| Asma | 13 | 0 | **13** | 0 | 13 | 0 |
| DPOC | 14 | 0 | **14** | 0 | 14 | 0 |
| ICC | 13 | 0 | **13** | 4 | 9 | 4 |
| SCA | 3 | 0 | **3** | 0 | 3 | 0 |

**Sem contexto, 100% das opções elegíveis agora são explicitamente Nível 2** (antes, o mesmo resultado numérico existia, mas por fallback silencioso, não por checagem positiva) — exatamente o comportamento pedido: "o sistema não deve deixar todas essas opções sem prioridade apenas porque não existe uma comorbidade".

## 12. Testes adicionados

`src/tests/therapeutic-prioritization-26-1.test.ts` — **30 testes**, cobrindo os 20 itens obrigatórios: HAS sem comorbidade atinge Nível 2 sem exigir comorbidade; comorbidade eleva a Nível 1; molécula sem vantagem individual permanece Nível 2; cautela não bloqueante permanece Nível 3; contraindicação permanece Nível 4 (nunca reintroduzida); ausência de indicação permanece excluída; ausência de diretriz não inventa evidência; evidência de classe não é apresentada como da molécula; todas as opções elegíveis presentes; nenhuma exclusão por Nível 1 de outra molécula; determinismo; sem duplicidade; marcas/apresentações corretas; motor de segurança operante; expansão RM-25.1 preservada; retrocompatibilidade RM-26; RM-23/RM-24 íntegros; nenhuma marca influencia o nível.

## 13. Resultados dos gates

| Verificação | Resultado |
|---|---|
| `tsc --noEmit` | ✅ limpo |
| `npm run lint` (guard RM-06) | ✅ 0 violações |
| `npm test` | ✅ **197/197** (167 preexistentes + 30 novos) |
| `npm run test:coverage` | ✅ sem violação de meta |
| RM-23 (Drug Consistency) | ✅ 358 entidades, 0 crítico/alto |
| RM-24 (Cross Database) | ✅ 365 analisados, 0 crítico, publicação liberada |
| `npm run build` (com gates `prebuild`) | ✅ compilado, 50 rotas |

**Nota:** todos os 167 testes pré-existentes (incluindo os 28 do RM-26 original) passaram **sem nenhuma alteração** — a evolução foi comportamentalmente compatível com as asserções já escritas.

## 14. Limitações conhecidas

- **Detecção de escopo (classe vs. molécula) é heurística sobre texto livre** (`detectEvidenceScope`): busca o padrão "Estudo <Nome>" ou sigla de ensaio no texto sourced. Cobre os casos reais já citados no RM-25 (LIFE, RALES, EMPA-REG, HOPE, COPERNICUS, MERIT-HF, CIBIS-II, HOT, SPRINT...), mas não é um parser de citação científica completo — referências futuras que não sigam esse padrão textual serão classificadas como "evidência de classe" por padrão conservador (nunca o inverso).
- **Nível 1 sem contexto de comorbidade nunca é atingido** (correto e esperado — não existe vantagem individual a reconhecer sem dado de paciente).
- Mesma limitação herdada do RM-26/RM-25.1: correspondência comorbidade↔indicação por substring + sinônimos bounded (não é um motor terminológico completo tipo SNOMED).

## 15. Impacto arquitetural

- **0 novas bases de dados, 0 segunda fonte de verdade, 0 duplicação do DrugRepository.**
- **0 alterações estruturais** em RM-00/06/22/23/24.
- **3 identificadores existentes exportados** (mudança de visibilidade apenas — zero duplicação de lógica).
- **1 tipo novo + 1 campo opcional** (`evidencia_escopo`) — aditivo, retrocompatível, zero breaking change.
- Prioridade continua decidida **inteiramente na camada de molécula**, antes de qualquer marca — verificado por teste dedicado (marcas nunca carregam campo de prioridade).

---

*CLINICAL_RECOMMENDATION_PRIORITIZATION_26_1_REPORT — gerado após implementação e validação completa.*
