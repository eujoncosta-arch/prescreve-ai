# CLINICAL_CONTEXTUAL_ROLE_REFINEMENT_REPORT — RM-27.1

**Escopo:** refinamento da granularidade do PAPEL CLÍNICO, restrito a DM2 e ICC. Nenhuma condição, molécula, marca ou arquitetura nova.

---

## 1. Objetivo do RM-27.1

O RM-27 validou se uma classe é "1ª linha para a condição". O RM-27.1 vai um nível mais fundo: dentro das classes já confirmadas como 1ª linha, distingue **por que** cada uma é recomendada — objetivo terapêutico (controle glicêmico vs. benefício cardiorrenal vs. redução de peso, em DM2) ou papel funcional (modificador de prognóstico vs. controle de congestão, em ICC) — sem promover, rebaixar ou inventar nada além do que já era verdade na literatura.

Pergunta respondida por classe: *"esta classe deve ser apresentada como opção genérica de 1ª linha, ou seu papel depende de um objetivo terapêutico/fenótipo/subgrupo específico?"*

## 2. Relação com RM-25.1, RM-26, RM-26.1 e RM-27

```
RM-25.1 → descoberta de moléculas elegíveis (inalterado)
RM-26.1 → prioridade individual do paciente (inalterado)
RM-27   → papel "1ª linha vs. não-1ª-linha" por classe (3 overrides — inalterados)
RM-27.1 → dentro do papel "1ª linha", qual o OBJETIVO/FUNÇÃO da classe (9 overrides novos)
```

`getValidatedClassRole()` e `isRoleFirstLine()` (RM-27) são reaproveitados sem alteração de assinatura. `classifyPriority()` (RM-26.1) não foi duplicado — apenas o texto do `motivo` no Passo 5 (Nível 2) foi enriquecido quando há override.

## 3. Escopo

Exclusivamente DM2 (BIGUANIDA, SGLT2, GLP1, DPP4) e ICC (ARNI, BRA, BETABLOQUEADOR, ARM, DIURETICO_ALCA — IECA do RM-27 não foi tocado). Nenhuma outra condição foi alterada.

## 4. Metodologia

Para cada classe já presente em `CONDITION_CLASS_KEYS['dm2']`/`['icc']`, avaliada a pergunta "esta classe é 1ª linha universal ou seu papel é mais específico (objetivo terapêutico/função)?" contra ADA Standards of Care 2024 (DM2) e ESC 2021/2023 Heart Failure Guidelines (ICC). Apenas quando o papel real é mais específico do que "1ª linha genérica" foi adicionado um override — igual ao critério do RM-27 (menor alteração, nunca promove).

## 5. Matriz de auditoria — DM2

| Classe | Papel anterior | Papel validado | Objetivo terapêutico | População/contexto | Fonte | Ação |
|---|---|---|---|---|---|---|
| BIGUANIDA | first_line (implícito) | first_line | controle glicêmico, terapia inicial | geral | ADA Standards of Care 2024, Seção 9 (doi.org/10.2337/dc24-S009) | manter, override explícito |
| SGLT2 | first_line (implícito) | **renal_benefit** | benefício renal (DRC/albuminúria) + cardiovascular (IC) | drc, diabetes | ADA Standards of Care 2024, Seção 9 | reclassificar rótulo (tier mantido) |
| GLP1 | first_line (implícito) | **cardiovascular_benefit** | redução de MACE em ASCVD + benefício ponderal | diabetes | ADA Standards of Care 2024, Seção 9 | reclassificar rótulo (tier mantido) |
| DPP4 | first_line (implícito) | first_line | controle glicêmico, peso-neutro, baixo risco de hipoglicemia | geral, idoso | ADA Standards of Care 2024, Seção 9 (SAVOR-TIMI 53/EXAMINE/TECOS — neutros) | manter, override explícito (evita herdar rótulo de SGLT2/GLP1) |

## 6. Matriz de auditoria — ICC

| Classe | Papel anterior | Papel validado | Objetivo terapêutico | População/contexto | Fonte | Ação |
|---|---|---|---|---|---|---|
| IECA | first_line (RM-27, ressalva) | first_line (**inalterado**) | — | fe_reduzida | ESC 2023 Focused Update (RM-27, não tocado neste RM) | manter (menor alteração) |
| ARNI | first_line (implícito) | **prognostic_modifier** | reduz mortalidade/hospitalização, superior a IECA (PARADIGM-HF) | fe_reduzida | ESC 2021 HF Guidelines (doi.org/10.1093/eurheartj/ehab368) | reclassificar rótulo |
| BRA | first_line (implícito) | **prognostic_modifier** | reduz mortalidade/hospitalização; alternativa quando IECA/ARNI intolerado | fe_reduzida | ESC 2021 HF Guidelines | reclassificar rótulo, contexto de alternativa explicitado |
| BETABLOQUEADOR | first_line (implícito) | **prognostic_modifier** | reduz mortalidade — benefício de MOLÉCULA específica (bisoprolol/succinato de metoprolol/carvedilol) | fe_reduzida | ESC 2021 HF Guidelines (CIBIS-II, MERIT-HF, COPERNICUS) | reclassificar rótulo |
| ARM | first_line (implícito) | **prognostic_modifier** | reduz mortalidade/hospitalização (RALES, EMPHASIS-HF) | fe_reduzida | ESC 2021 HF Guidelines | reclassificar rótulo |
| DIURETICO_ALCA | first_line (implícito) | **congestion_control** | alívio de congestão/sintomas; SEM evidência de redução de mortalidade | geral | ESC 2021 HF Guidelines | reclassificar rótulo |

## 7. Estado anterior

Todas as 9 classes auditadas herdavam apenas o papel implícito "1ª linha para a condição" (RM-26.1/RM-27), sem distinção de objetivo terapêutico — SGLT2, GLP-1, DPP-4 e biguanida apareciam com o mesmo rótulo em DM2; ARNI, IECA, BRA, betabloqueador, ARM e diurético de alça apareciam com o mesmo rótulo em ICC.

## 8. Estado validado

9 overrides novos adicionados a `CLASS_ROLE_OVERRIDES` (`guideline-class-validation.ts`), todos com `isRoleFirstLine() === true` — **nenhuma classe foi rebaixada de tier**. O `motivo` de cada sugestão em Nível 2 agora inclui, quando aplicável, a frase *"Objetivo terapêutico documentado (RM-27.1): ..."* com o contexto sourced.

## 9. Papel clínico

6 novos valores de `ClinicalRole` (aditivos): `cardiovascular_benefit`, `renal_benefit`, `weight_benefit` (não usado nesta rodada — nenhuma classe teve perda de peso como diferencial isolado suficiente para reclassificação; permanece disponível para sourcing futuro, ex. GLP-1 combinado), `prognostic_modifier`, `congestion_control`, `symptom_control` (não usado nesta rodada).

## 10. População/contexto

DM2: `drc`, `diabetes`, `geral`, `idoso`. ICC: `fe_reduzida` em todas as 6 classes — nenhuma classe foi documentada para `fe_preservada` (ver Limitações, seção 17).

## 11. Fonte

ADA Standards of Care in Diabetes 2024, Seção 9 (doi.org/10.2337/dc24-S009) para DM2. ESC 2021 Guidelines for the diagnosis and treatment of acute and chronic heart failure (doi.org/10.1093/eurheartj/ehab368) para ICC (ARNI/BRA/BETABLOQUEADOR/ARM/DIURETICO_ALCA) — o override pré-existente de IECA (RM-27) usa a atualização ESC 2023 e não foi tocado.

## 12. Alterações realizadas

| Arquivo | Alteração |
|---|---|
| `src/lib/guideline-class-validation.ts` | +6 valores em `ClinicalRole`; +9 entradas em `CLASS_ROLE_OVERRIDES` (4 DM2, 5 ICC); comentário de `isRoleFirstLine()` atualizado explicando por que os novos papéis não entram em `NON_FIRST_LINE_ROLES`. |
| `src/lib/therapeutic-prioritization.ts` | Passo 5 (Nível 2) do `classifyPriority()`: quando há `validatedRole`, o `motivo` passa a incluir o objetivo terapêutico documentado; novo item `objetivo_terapeutico_rm27_1` em `fatores_considerados`. Nenhuma mudança de precedência ou de tier. |

## 13. Alterações deliberadamente não realizadas

- `CONDITION_CLASS_KEYS` **não foi tocado** — iSGLT2 continua fora da lista de classes elegíveis para ICC (ver Limitações, item 18).
- `IECA/ICC` (override original do RM-27) **não foi alterado** — já estava correto, mudar seria risco desnecessário para um resultado já validado.
- Nenhuma mudança em `NON_FIRST_LINE_ROLES` — nenhuma das 9 classes foi rebaixada de tier.
- `Anamnesis`/`EligibilityContext` **não ganharam campo de fração de ejeção** — ver Limitações.
- `weight_benefit` e `symptom_control` foram definidos no tipo, mas não aplicados nesta rodada (nenhuma classe teve essa dimensão como diferencial suficiente sourced para justificar reclassificação isolada).

## 14. Classes que permanecem first_line (sem objetivo terapêutico específico documentado)

DM2: BIGUANIDA, DPP4. ICC: IECA (inalterado do RM-27).

## 15. Classes reclassificadas (rótulo, não tier)

DM2: SGLT2 → renal_benefit; GLP1 → cardiovascular_benefit. ICC: ARNI, BRA, BETABLOQUEADOR, ARM → prognostic_modifier; DIURETICO_ALCA → congestion_control.

## 16. Classes com papel contextual

Nenhuma nova — as únicas classes com papel `contextual` continuam sendo as do RM-27 (SABA em asma/DPOC). RM-27.1 não introduziu nenhuma classe `contextual`/`alternative`/`not_first_line` — todas as 9 reclassificações mantiveram `isRoleFirstLine() === true`.

## 17. Limitações do modelo atual

- **Sem campo estruturado de fração de ejeção (FE).** `Anamnesis`/`EligibilityContext` não possuem `fe_percentual` ou equivalente. A população `fe_reduzida` documentada nos overrides de ICC é **contexto textual da evidência**, não um filtro programático — o sistema não distingue hoje, por dado estruturado, um paciente com FE preservada de um com FE reduzida. Corrigir isso exigiria um novo campo em `Anamnesis` (mudança de escopo maior que "menor alteração" — não implementado nesta entrega, registrado como recomendação separada).
- **`fe_preservada` não é representável.** Nenhuma classe foi documentada para IC-FEp porque o modelo atual não distingue esse fenótipo — em vez de inventar uma distinção sem lastro programático, a auditoria deixou o campo vazio (ver item 6, tabela ICC — nenhuma linha cita `fe_preservada`).
- **iSGLT2 em ICC não está em `CONDITION_CLASS_KEYS['icc']`** — dapagliflozina/empagliflozina têm evidência robusta de redução de mortalidade/hospitalização em IC-FEr (DAPA-HF, EMPEROR-Reduced), mas hoje só são descobertas via DM2, nunca expandidas para o plano de ICC. Corrigir isso é escopo do RM-25.1 (`CONDITION_CLASS_KEYS`), não do RM-27.1 — registrado como próximo ponto de sourcing.

## 18. Evidência que não pode ser representada adequadamente pela arquitetura atual

- Diferenciação por FE (reduzida/levemente reduzida/preservada) como **filtro de elegibilidade/priorização programático** — hoje só existe como texto de contexto.
- Diferenciação por classe funcional (NYHA) — não há campo correspondente em `Anamnesis`.
- Benefício ponderal (`weight_benefit`) como dimensão isolada e mensurável (ex.: % de perda de peso) — o modelo atual não armazena essa magnitude estruturadamente; permanece qualitativo no texto do `motivo`.

## 19. Testes criados ou alterados

- **Novo:** `src/tests/guideline-class-validation-27-1.test.ts` — 27 testes cobrindo os itens obrigatórios DM2 (1–11) e ICC (1–13), incluindo: papel de SGLT2/GLP1/DPP4/BIGUANIDA distinto e estável independente de comorbidade do paciente; diurético de alça permanece Nível 2 mas com rótulo `congestion_control` distinto de `prognostic_modifier`; ARNI vs. IECA/BRA; Atenolol continua excluído (RM-25.1 prevalece); contraindicação prevalece sobre qualquer papel; marca/apresentação não carregam papel clínico; determinismo; iSGLT2/ICC documentado como limitação (não implementado).
- **Alterado:** `src/tests/guideline-class-validation-27.test.ts` — 1 asserção ajustada (item 4) para refletir que `dm2` agora tem overrides no RM-27.1 (mudança intencional, sourced, documentada nesta seção — `dislipidemia`/`sca` continuam sem overrides).

## 20. Resultado de todos os gates

| Verificação | Resultado |
|---|---|
| `tsc --noEmit` | ✅ limpo |
| `npm run lint` | ✅ 0 violações |
| `npx vitest run` | ✅ **245/245** (218 pré-existentes, 1 asserção ajustada intencionalmente + 27 novos) |
| `npx vitest run --coverage` | ✅ sem violação de meta |
| RM-23 (via `npm run build`) | ✅ 358 entidades, 0 crítico/alto |
| RM-24 (via `npm run build`) | ✅ 365 analisados, 0 crítico, publicação liberada |
| `npm run build` | ✅ compilado, 50 rotas |

---

*CLINICAL_CONTEXTUAL_ROLE_REFINEMENT_REPORT — gerado após implementação e validação completa (RM-27.1).*
