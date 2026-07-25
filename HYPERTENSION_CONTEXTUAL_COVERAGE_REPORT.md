# HYPERTENSION_CONTEXTUAL_COVERAGE_REPORT — RM-30

**Nome:** RM-30 — Contextual Hypertension Subgroup Coverage
**Escopo:** habilitar ARM, DIURETICO_ALCA e BETABLOQUEADOR na descoberta de `has` **exclusivamente por contexto do paciente** — nunca genericamente. Nenhuma condição, molécula, marca, apresentação, base de dados ou arquitetura nova.

---

## 1. Lacuna original identificada no RM-29

O RM-29 encontrou que Espironolactona (ARM), Furosemida (DIURETICO_ALCA) e Carvedilol/Bisoprolol/Succinato de Metoprolol/Atenolol/Nebivolol (BETABLOQUEADOR) já possuem indicação própria sourced citando "HAS" — mas classificou a adição dessas classes a `CONDITION_CLASS_KEYS['has']` como **"requer novo RM"**, porque cada uma só é apropriada para um SUBGRUPO de HAS (resistente, DRC avançada, indicação CV concomitante), não para a população geral. Adicionar estaticamente arriscaria apresentá-las como opção de 1ª linha para todo paciente com HAS.

## 2. Dados clínicos já existentes utilizados

| Subgrupo | Campo já existente | Origem |
|---|---|---|
| HAS resistente | `Anamnesis.comorbidades[]` (texto documentado pelo clínico) | já usado desde o RM-26 |
| DRC avançada | `Anamnesis.funcao_renal.tfg` (TFG < 30) e `Anamnesis.funcao_renal.ckd_stage` (G4/G5) | já existiam na `Anamnesis`; `ckd_stage` nunca havia sido propagado para `EligibilityContext` — passou a ser (campo pré-existente, apenas conectado) |
| Indicação cardiovascular concomitante | `Anamnesis.comorbidades[]` (texto: IC, coronariopatia/IAM, arritmia) | já usado desde o RM-26 |

Nenhum campo novo foi criado em `Anamnesis` ou `EligibilityContext` (exceto `ckdStage`, que apenas expõe um campo que já existe em `Anamnesis.funcao_renal.ckd_stage` e nunca havia sido propagado ao `EligibilityContext` — não é dado novo coletado, é fiação de dado já coletado).

## 3. Dados que não existiam (e não foram criados)

- **"Necessidade de controle volêmico" isolada** (sem DRC avançada) — não há campo estruturado de edema/estado volêmico na anamnese. **Não implementado** — apenas o caminho DRC avançada (TFG<30 ou ckd_stage G4/G5) foi habilitado.
- **Definição estruturada de "HAS resistente"** (nº de fármacos em doses otimizadas + PA não controlada) — não existe na anamnese. **Deliberadamente não inferido por heurística** (ex.: contar `medicamentos_em_uso`) — apenas reconhecido quando documentado explicitamente como comorbidade/diagnóstico pelo clínico.
- **Classe funcional NYHA, fração de ejeção estruturada** — idem RM-27.1/RM-28, não criados.

## 4. Classes contextualizadas

| Classe | Condição de habilitação | Função (`resolveContextualClassKeys`) |
|---|---|---|
| ARM | comorbidade contém "resistente" + "hipertens"/"has" | `hasResistantHypertensionContext()` |
| DIURETICO_ALCA | `ckdStage` ∈ {G4, G5} OU `tfg` < 30 | `advancedCkdContext()` |
| BETABLOQUEADOR | comorbidade compatível com IC/coronariopatia-IAM/arritmia | `cardiovascularIndicationContext()` |

## 5. Moléculas descobertas (quando o contexto se aplica)

- **HAS resistente:** Espironolactona (indicação própria "HAS resistente" — Nível 1, vantagem individual verificável). Eplerenona (ARM sem essa indicação específica) também é descoberta, mas permanece Nível 3 (contextual) — nunca Nível 1/2 sem vantagem individual real.
- **DRC avançada:** Furosemida (Nível 3, contextual — congestão, sem promoção a prognóstico universal).
- **Indicação CV concomitante:** Carvedilol/Bisoprolol/Nebivolol/Succinato de Metoprolol (IC-FEr própria — Nível 1 quando comorbidade é IC), Atenolol (Pós-IAM próprio — Nível 1 quando comorbidade é IAM/coronariopatia). Cada molécula só sobe a Nível 1 quando sua PRÓPRIA indicação cobre o contexto documentado — caso contrário, permanece Nível 3.

## 6. Moléculas deliberadamente não descobertas

- Qualquer betabloqueador em HAS sem nenhuma comorbidade CV documentada.
- Qualquer ARM em HAS sem "resistente" documentado (Espironolactona/Eplerenona não aparecem).
- Furosemida em HAS sem DRC avançada documentada (TFG≥30 e sem ckd_stage G4/G5).
- Nenhuma outra classe de HAS foi tocada (IECA/BRA/BCC/TIAZIDICO permanecem exatamente como antes do RM-30).

## 7. Critérios de cada contexto

- **HAS resistente:** `comorbidades[]` normalizado contém `/resistente/` **e** `/hipertens|has\b/` na mesma entrada — reconhece apenas texto explícito, nunca infere por número de medicamentos em uso (regra absoluta do enunciado).
- **DRC avançada:** `ckdStage` (KDIGO) ∈ {G4, G5} **ou** `tfg` < 30 mL/min/1,73m² — o mesmo limiar (30) já usado nos brackets de ajuste renal pré-existentes na base canônica (`tfg_30_15`, `tfg_lt_15`).
- **Indicação CV concomitante:** `comorbidades[]` normalizado contém termo de IC, doença coronariana/IAM ou arritmia — mesmo conjunto de sinônimos clínicos já reconhecido pelo motor de comorbidade do RM-26 (`COMORBIDITY_SYNONYMS`).

## 8. Fontes clínicas utilizadas

| Classe/contexto | Fonte |
|---|---|
| ARM em HAS resistente | ESC/ESH 2023 Guidelines for the management of arterial hypertension (PATHWAY-2) — doi.org/10.1097/HJH.0000000000003480 |
| DIURETICO_ALCA em DRC avançada | ESC/ESH 2023 Guidelines for the management of arterial hypertension — doi.org/10.1097/HJH.0000000000003480 |
| BETABLOQUEADOR em indicação CV concomitante | ESC/ESH 2023 Guidelines for the management of arterial hypertension — doi.org/10.1097/HJH.0000000000003480 |

## 9. Alterações de código

| Arquivo | Alteração |
|---|---|
| `src/lib/therapeutic-class-expansion.ts` | +`ckdStage` em `EligibilityContext` (mapeado de `Anamnesis.funcao_renal.ckd_stage`, já existente); +3 funções privadas (`hasResistantHypertensionContext`, `advancedCkdContext`, `cardiovascularIndicationContext`) e `resolveContextualClassKeys()`; `expandTherapeuticPlan()` passa a unir `CONDITION_CLASS_KEYS[conditionId]` (estático) com `resolveContextualClassKeys()` (contextual) antes de iterar candidatos — `CONDITION_CLASS_KEYS['has']` em si **não foi alterado**. |
| `src/lib/guideline-class-validation.ts` | +2 valores em `PopulationContext` (`has_resistente`, `indicacao_cardiovascular_concomitante`); +3 entradas em `CLASS_ROLE_OVERRIDES` (has/ARM, has/DIURETICO_ALCA, has/BETABLOQUEADOR — todas `papel_clinico: 'contextual'`), garantindo que, mesmo descobertas, essas classes nunca caiam no fallback conservador (que promoveria a Nível 2). |
| `src/lib/therapeutic-prioritization.ts` | **Correção de bug pré-existente, necessária e exposta pelo RM-30:** `COMORBIDITY_SYNONYMS` tinha a chave `has: ['hipertensao']` — qualquer comorbidade contendo a substring "has" (incluindo a nova "HAS resistente") colapsava para o sinônimo genérico "hipertensao", que combina com a indicação de QUALQUER anti-hipertensivo, promovendo indevidamente moléculas não relacionadas (ex.: Irbesartana) a Nível 1 apenas por o paciente ter "HAS resistente" documentado. Corrigido adicionando a chave mais específica `'has resistente': ['hipertensao resistente', 'resistente']`, verificada antes de `'has'` na ordem de inserção (`Object.entries().find()` respeita ordem de inserção em JS). |

## 10. Alterações deliberadamente não realizadas

- `CONDITION_CLASS_KEYS['has']` (lista estática) **não foi alterada** — continua `['IECA', 'BRA', 'BCC', 'TIAZIDICO']`, verificado por teste dedicado.
- Nenhum campo novo em `Anamnesis` (FE, NYHA, estado volêmico, definição estruturada de HAS resistente).
- `DrugRepository`, `DrugEntity`, `isEligible()`, `entityCoversCondition()`, motor de segurança, `TherapeuticPanel`, RM-00, RM-06, RM-22, RM-23, RM-24 — não alterados.
- "Necessidade de controle volêmico" isolada (fora de DRC avançada) — não implementada, sem dado estruturado suficiente.
- Nenhuma heurística de "HAS resistente por contagem de medicamentos em uso" — deliberadamente rejeitada (regra absoluta do enunciado), testada explicitamente (item "não infere resistência por contagem de fármacos").

## 11. Testes

`src/tests/hypertension-contextual-coverage-30.test.ts` — **38 testes**: HAS não complicada (5, incluindo verificação de que `CONDITION_CLASS_KEYS['has']` estático é intocado); HAS resistente (9, incluindo o bug de sinonímia corrigido, contraindicação, alergia, ajuste renal, marcas/apresentações, sem duplicidade); DRC avançada/controle volêmico (6, TFG e `ckdStage` como caminhos independentes, DRC leve não habilita); indicação cardiovascular concomitante (8, IC/IAM/arritmia, Atenolol não promovido automaticamente, indicação própria sempre prevalece); prioridade clínica (3, papel contextual confirmado, nunca Nível 2 automático); determinismo (1); regressão RM-23 a RM-29 (6).

Testes pré-existentes ajustados (3, todos com justificativa inline): `guideline-class-validation-27.test.ts` (item 18), `guideline-class-validation-27-1.test.ts` (regressão), `global-condition-drug-coverage-29.test.ts` (item 11) — todos assumiam que todo `classKey` em `CLASS_ROLE_OVERRIDES` precisa estar em `CONDITION_CLASS_KEYS` estático; passaram a excluir explicitamente as 3 novas relações contextuais de HAS (documentado no próprio teste, com o motivo: essas classes são intencionalmente descobertas fora da lista estática).

## 12. Resultados dos gates

| Verificação | Resultado |
|---|---|
| `tsc --noEmit` | ✅ limpo |
| `npm run lint` | ✅ 0 violações |
| `npx vitest run` | ✅ **353/353** (315 pré-existentes, 3 asserções ajustadas intencionalmente + 38 novos) |
| `npx vitest run --coverage` | ✅ sem violação de meta |
| RM-23 (via `npm run build`) | ✅ 358 entidades, 0 crítico/alto |
| RM-24 (via `npm run build`) | ✅ 365 analisados, 0 crítico, publicação liberada |
| `npm run build` | ✅ compilado, 50 rotas |

## 13. Impacto sobre RM-25.1 a RM-29

- **RM-25.1** (`expandTherapeuticPlan`/`isEligible`/`entityCoversCondition`): mecanismo reaproveitado sem alteração de assinatura ou de comportamento para as demais condições — apenas a lista de `classKeys` iterada para `has` passou a poder incluir classes contextuais quando aplicável.
- **RM-26/RM-26.1** (`classifyPriority`/`prioritizeTherapeuticPlan`): nenhuma alteração de árvore de decisão — as novas moléculas contextuais passam pela mesma precedência (cautela → vantagem individual → 1ª linha da condição → papel validado → fallback), e o bug de sinonímia corrigido só afeta comorbidades contendo "has", tornando o comportamento mais correto (não menos), sem regressão nos testes existentes.
- **RM-27/RM-27.1** (`getValidatedClassRole`/`isRoleFirstLine`): reaproveitados sem alteração de assinatura; 3 overrides novos seguem exatamente o padrão já estabelecido.
- **RM-28/RM-29**: nenhuma classe ou condição tocada por este RM — verificado por teste de regressão dedicado (SGLT2/DM2, SGLT2/ICC, SCA).

## 14. Limitações

- **HAS resistente depende de documentação textual explícita.** Se o clínico não registrar "HAS resistente" (ou variação equivalente) como comorbidade, ARM não é habilitado — mesmo que o paciente clinicamente se qualifique. Esta é uma limitação deliberada e conservadora (a alternativa — inferir por contagem de medicamentos — foi explicitamente rejeitada por risco clínico).
- **"Necessidade de controle volêmico" isolada não é representável** sem um campo estruturado de estado volêmico/edema.
- **Betabloqueador contextual é gated por CLASSE, não por subtipo de indicação CV** — ou seja, qualquer comorbidade CV reconhecida (IC, IAM, arritmia) habilita a classe inteira; a diferenciação fina por molécula (Carvedilol só para IC, Atenolol só para pós-IAM) já é feita corretamente a jusante pela checagem de indicação própria (RM-25.1) + comorbidade individual (RM-26.1), não pelo gate de classe em si — comportamento correto, mas vale registrar que o gate em si é mais amplo que a indicação final apresentada ao usuário.

## 15. Próximos pontos de sourcing

- Avaliar, em RM futuro, um campo estruturado para "HAS resistente confirmada" (nº de classes em uso + adesão + PA de consultório/MAPA) caso o produto queira detectar o subgrupo sem depender de texto livre do clínico.
- Avaliar campo estruturado de estado volêmico/edema para representar "necessidade de controle volêmico" independente de DRC avançada.
- Repetir a auditoria de subgrupo (padrão RM-30) para outras condições onde o RM-29 identificou "requer novo RM" por dependência de contexto não estruturado.

---

*HYPERTENSION_CONTEXTUAL_COVERAGE_REPORT — gerado após implementação e validação completa (RM-30).*
