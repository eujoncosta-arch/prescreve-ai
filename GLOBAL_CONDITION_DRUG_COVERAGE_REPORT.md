# GLOBAL_CONDITION_DRUG_COVERAGE_REPORT — RM-29

**Nome:** RM-29 — Global Condition–Drug Coverage Audit
**Escopo:** auditoria reversa (todas as condições × todas as classes × todas as moléculas do DrugRepository) generalizando o padrão de lacuna encontrado no RM-28 (SGLT2/ICC). Nenhuma condição, molécula, marca, apresentação ou arquitetura nova.

---

## 1. Objetivo do RM-29

Responder, de forma sistemática e para todas as 10 condições estruturadas: *"existe molécula já no DrugRepository, com indicação própria para uma condição já coberta, que permanece invisível ao fluxo de recomendação porque sua classe não está conectada àquela condição em `CONDITION_CLASS_KEYS`?"*

## 2. Relação com RM-25.1

O RM-29 opera exclusivamente sobre `CONDITION_CLASS_KEYS` (RM-25.1) — mecanismo de descoberta (`expandTherapeuticPlan`, `isEligible`, `entityCoversCondition`) inalterado.

## 3. Relação com RM-26

`classifyPriority`/`prioritizeTherapeuticPlan` não foram alterados — as novas moléculas descobertas passam pela mesma árvore de decisão determinística já existente.

## 4. Relação com RM-26.1

Comportamento de Nível 1 (preferencial)/Nível 2 (primeira_linha)/Nível 3 (contextual) inalterado — verificado por regressão (HAS+DRC continua elevando Losartana a preferencial).

## 5. Relação com RM-27

Mesmo mecanismo (`getValidatedClassRole`/`isRoleFirstLine`) reaproveitado — 7 overrides novos adicionados seguindo exatamente o padrão de override já estabelecido (SABA/asma-DPOC).

## 6. Relação com RM-27.1

Os novos overrides de SCA usam os mesmos valores de `ClinicalRole` já introduzidos no RM-27.1 (`prognostic_modifier`) — nenhum valor novo de papel clínico foi criado.

## 7. Relação com RM-28

O RM-28 corrigiu um caso específico (SGLT2/ICC) desse exato padrão de lacuna. O RM-29 é a generalização sistemática dessa auditoria para todas as condições, revelando 8 relações adicionais do mesmo tipo.

## 8. Arquitetura auditada

`therapeutic-class-expansion.ts` (`CONDITION_CLASS_KEYS`, `CLASS_KEY_MAP`, `CLASS_LABELS`, `entityCoversCondition`, `isEligible`, `expandTherapeuticPlan`), `therapeutic-prioritization.ts` (`classifyPriority`), `guideline-class-validation.ts` (`CLASS_ROLE_OVERRIDES`), `pharma-core` (`drugRepository`, `DrugEntity`), `clinical-therapeutics.ts` (`PROTOCOLOS`, `getTherapeuticForCondition`).

## 9. Condições auditadas

Todas as 10 condições em `CONDITION_CLASS_KEYS`: has, dm2, dislipidemia, asma, dpoc, icc, sca, hipotireoidismo, faringoamigdalite, pac. Condições sem protocolo estruturado (nenhuma foi encontrada fora dessas 10 no fluxo real de recomendação) não foram auditadas — fora de escopo (Fase 2 do enunciado).

## 10. Classes auditadas

Todas as classes canônicas resolvíveis por `classKeyOf()` presentes em pelo menos uma `DrugEntity` (24 chaves de classe, listadas em `CLASS_LABELS`).

## 11. Moléculas auditadas

Todas as `DrugEntity` do `drugRepository.getAll()` (358 entidades) foram varridas programaticamente por um script de auditoria (comparando `classKeyOf(entity.therapeuticClass)` contra `CONDITION_CLASS_KEYS` de cada condição e testando as indicações próprias contra os tokens de condição já usados por `entityCoversCondition`), gerando 38 candidatos a gap — cada um avaliado manualmente contra a Fase 9 (falsos positivos) antes de qualquer decisão.

## 12. Matriz global de cobertura (resumo — candidatos gerados pelo script de auditoria)

| Condição | Molécula | Classe candidata | Indicação própria (trecho) | Classificação |
|---|---|---|---|---|
| has | Carvedilol/Bisoprolol/Succinato Metoprolol/Atenolol/Nebivolol | BETABLOQUEADOR | "HAS" | GAP DE MODELO — requer novo RM |
| has | Espironolactona | ARM | "HAS resistente" | POSSÍVEL FALSO POSITIVO — subgrupo |
| has | Furosemida | DIURETICO_ALCA | "HAS (DRC avançada)" | POSSÍVEL FALSO POSITIVO — subgrupo |
| has | Levotiroxina | HORMONIO_TIREOIDIANO | "Hashimoto" (colisão de substring com "has") | FALSO POSITIVO — erro de tokenização |
| has | Semaglutida 2,4 mg | GLP1 | "com HAS" (comorbidade em obesidade) | FALSO POSITIVO — indicação de comorbidade |
| dm2 | Irbesartana | BRA | "Nefropatia diabética (DM2 + HAS)" | FALSO POSITIVO — indicação de complicação renal, não de tratamento glicêmico |
| dm2 | Fenofibrato | HIPOLIPEMIANTE | "Complemento a estatina em DM2 com TG alto" | FALSO POSITIVO — já coberto por dislipidemia |
| dislipidemia | Semaglutida 2,4 mg | GLP1 | "dislipidemia" (comorbidade em obesidade) | FALSO POSITIVO |
| asma | Tiotrópio | LAMA | "Asma — terapia adicional em GINA step 4-5" | **GAP DE MAPEAMENTO — CORRIGIDO** |
| asma | Formoterol/Salmeterol/Indacaterol | LABA | "Asma — em combinação com ICS" | NÃO CORRIGIR — LABA monoterapia contraindicada em asma |
| asma | Ipratrópio | SAMA | "Crise asmática grave (protocolo de emergência)" | FORA DO ESCOPO — manejo agudo, não fluxo crônico |
| dpoc | Fluticasona Propionato/Furoato, Budesonida/Formoterol, Fluticasona/Salmeterol, Fluticasona Furoato/Vilanterol, Beclometasona/Formoterol | ICS, ICS_LABA | "DPOC com eosinofilia (GOLD)" | **GAP DE MAPEAMENTO — CORRIGIDO (somente ICS_LABA; ICS isolado NÃO corrigido — ver seção 15)** |
| icc | Clortalidona, Indapamida | TIAZIDICO | "IC (retenção volêmica leve)" | NÃO CORRIGIR — uso adjuvante, não indicação primária estruturada |
| sca | Enalapril, Ramipril | IECA | "Pós-IAM" | **GAP DE MAPEAMENTO — CORRIGIDO** |
| sca | Valsartana | BRA | "IC-FEr pós-IAM" | **GAP DE MAPEAMENTO — CORRIGIDO** |
| sca | Atorvastatina, Rosuvastatina | ESTATINA | "Síndrome coronariana aguda" | **GAP DE MAPEAMENTO — CORRIGIDO** |
| sca | Succinato de Metoprolol, Atenolol | BETABLOQUEADOR | "Pós-IAM" | **GAP DE MAPEAMENTO — CORRIGIDO** |
| sca | Eplerenona | ARM | "IC-FEr pós-IAM (FE ≤ 40%) — EPHESUS" | **GAP DE MAPEAMENTO — CORRIGIDO** |
| sca | Liraglutida | GLP1 | "DM tipo 2 ... benefício CV — LEADER trial" | FALSO POSITIVO — tratamento de DM2, não farmacoterapia de SCA |
| pac | Ciclesonida | ICS | "vantagem em candidíase orofaríngea" (asma) | FALSO POSITIVO — sem relação com PAC |

## 13. Lista de gaps identificados

38 candidatos gerados pelo script de auditoria (varredura completa). Após aplicação da Fase 9 (regra de falsos positivos), **8 relações condição→classe** foram confirmadas como GAP DE MAPEAMENTO real.

## 14. Classificação de cada gap

- **GAP DE MAPEAMENTO (corrigido):** 8 — sca/ESTATINA, sca/BETABLOQUEADOR, sca/IECA, sca/BRA, sca/ARM, asma/LAMA, dpoc/ICS_LABA (7 relações classe→condição, cobrindo as 8 moléculas citadas acima já elegíveis dentro delas).
- **FALSO POSITIVO (não corrigir, sem necessidade de novo RM):** 9 — Levotiroxina/has (colisão textual), Semaglutida/has, Semaglutida/dislipidemia, Irbesartana/dm2, Fenofibrato/dm2, Liraglutida/sca, Ciclesonida/pac, LABA (Formoterol/Salmeterol/Indacaterol)/asma, Ipratrópio/asma.
- **GAP DE MODELO / REQUER NOVO RM:** 3 grupos — BETABLOQUEADOR/has, ARM/has, DIURETICO_ALCA/has (todas dependem de subgrupo — resistente/DRC avançada/edema leve — não representável sem um campo estruturado adicional na anamnese; ver seção 18).
- **PENDENTE DE SOURCING:** 0 — nenhum candidato ficou nessa categoria; todos tinham fonte suficiente para decisão (corrigir ou não corrigir) ou foram claramente identificados como falso positivo.

## 15. Gaps corrigidos

| Condição | Classe adicionada | Papel clínico (RM-27/27.1) | Fonte |
|---|---|---|---|
| sca | ESTATINA | prognostic_modifier (secundário universal) | ESC 2023 ACS Guidelines (doi.org/10.1093/eurheartj/ehad191) |
| sca | BETABLOQUEADOR | prognostic_modifier (fe_reduzida) | ESC 2023 ACS Guidelines |
| sca | IECA | prognostic_modifier (fe_reduzida) | ESC 2023 ACS Guidelines |
| sca | BRA | prognostic_modifier (fe_reduzida, alternativa a IECA) | ESC 2023 ACS Guidelines (VALIANT) |
| sca | ARM | prognostic_modifier (fe_reduzida + diabetes) | ESC 2023 ACS Guidelines (EPHESUS) |
| asma | LAMA | contextual (add-on Step 4-5) | GINA 2024 |
| dpoc | ICS_LABA | contextual (Grupo E, eosinofilia) | GOLD 2024/2025 |

Nota: `dpoc/ICS` (isolado) foi **deliberadamente excluído** desta correção — ver seção 21.

## 16. Gaps não corrigidos

Ver seção 14 ("FALSO POSITIVO") — 9 relações, cada uma com justificativa específica na matriz da seção 12. Resumo dos padrões de falso positivo encontrados (mapeados aos exemplos de risco da Fase 9 do enunciado):
- **Colisão textual de substring:** "Hashimoto" contém "has" (Levotiroxina) — puramente um artefato do script de varredura automática, não uma indicação real.
- **Indicação de comorbidade ≠ indicação da condição principal:** Semaglutida ("com HAS/dislipidemia" no contexto de obesidade), Liraglutida ("benefício CV" no contexto de DM2).
- **Indicação de complicação ≠ indicação da condição principal:** Irbesartana ("Nefropatia diabética" é complicação renal do DM2, não terapia glicêmica do DM2 em si).
- **Já coberto por outra condição estruturada:** Fenofibrato (já elegível via dislipidemia).
- **Risco de segurança explícito:** LABA isolado em asma (contraindicação de monoterapia — bula/GINA), ICS isolado em DPOC (GOLD contraindica monoterapia).
- **Fora do cenário clínico do fluxo (agudo/emergência vs. crônico):** Ipratrópio em asma (uso é em protocolo de crise aguda, não no plano terapêutico ambulatorial gerado pelo sistema).
- **Sem relação real:** Ciclesonida/PAC (indicação é de asma, candidiase orofaríngea não tem relação com PAC).

## 17. Gaps pendentes de sourcing

Nenhum.

## 18. Gaps que requerem novo RM

**BETABLOQUEADOR/has, ARM/has, DIURETICO_ALCA/has** — todos possuem indicação textual real citando "HAS", mas restrita a subgrupo (HAS resistente para espironolactona; HAS em DRC avançada para furosemida; betabloqueador não é mais recomendação de 1ª linha geral para HAS não complicada segundo ESC/ESH 2023, sendo reservado a indicações compelidas — IC, doença coronariana, arritmia). Adicionar essas classes a `CONDITION_CLASS_KEYS['has']` sem um mecanismo de filtro por subgrupo (ex.: "HAS resistente", "DRC avançada" como estado clínico estruturado) arriscaria apresentar essas classes como opção de 1ª linha para TODO paciente com HAS, o que contraria a evidência atual — risco de falso positivo clinicamente relevante, não apenas de cobertura. **Decisão: não corrigir neste RM; registrar como candidato a RM futuro** que avalie se o padrão textual `populacao` (RM-27.1) é suficiente ou se exige um campo estruturado novo (ex.: HAS resistente/DRC como estado clínico).

## 19. Evidência clínica de cada gap corrigido

Ver seção 15 (tabela com organização, referência e identificador). Todas as fontes citadas (ESC 2023 ACS Guidelines, GINA 2024, GOLD 2024/2025) são diretrizes de sociedades médicas reconhecidas, hierarquia 1 do RM-29.

## 20. Alterações de código

| Arquivo | Alteração |
|---|---|
| `src/lib/therapeutic-class-expansion.ts` | `CONDITION_CLASS_KEYS['sca']` ganha `ESTATINA`, `BETABLOQUEADOR`, `IECA`, `BRA`, `ARM`; `CONDITION_CLASS_KEYS['asma']` ganha `LAMA`; `CONDITION_CLASS_KEYS['dpoc']` ganha `ICS_LABA`. Nenhuma classe nova criada em `CLASS_KEY_MAP`/`CLASS_LABELS` — todas já existiam (usadas por outras condições). |
| `src/lib/guideline-class-validation.ts` | +7 entradas em `CLASS_ROLE_OVERRIDES` (5 sca, 1 asma, 1 dpoc), reaproveitando os mesmos valores de `ClinicalRole` do RM-27.1 (`prognostic_modifier`, `contextual`) — nenhum valor novo. |

## 21. Alterações deliberadamente não realizadas

- `dpoc/ICS` (isolado) **não foi adicionado** — apenas `dpoc/ICS_LABA` (combinação fixa). GOLD contraindica ICS em monoterapia em DPOC (sem benefício comprovado, risco aumentado de pneumonia); adicionar a classe `ICS` isolada permitiria que Fluticasona Propionato/Furoato/Ciclesonida (moléculas ICS puras) fossem sugeridas indevidamente como monoterapia em DPOC.
- `asma/LABA` (isolado) **não foi adicionado** — apenas `asma/LAMA`. LABA em monoterapia é contraindicado em asma (risco de exacerbação grave/morte — alerta de bula/GINA); a classe combinada `ICS_LABA` já cobre o uso seguro dessas moléculas em combinação fixa.
- `has/BETABLOQUEADOR`, `has/ARM`, `has/DIURETICO_ALCA` — não adicionados (ver seção 18, requer novo RM).
- `icc/TIAZIDICO` — não adicionado (uso adjuvante em retenção leve, não indicação estruturada primária).
- `asma/SAMA` (Ipratrópio) — não adicionado (uso é em crise aguda, fora do escopo do fluxo de plano terapêutico crônico).
- `sca/GLP1` (Liraglutida) — não adicionado (indicação é de tratamento de DM2, não farmacoterapia pós-SCA).
- `dm2/BRA` (Irbesartana) — não adicionado (indicação é de complicação renal — nefropatia diabética —, não de tratamento glicêmico do DM2).
- `dm2/HIPOLIPEMIANTE` (Fenofibrato) — não adicionado a DM2 (já corretamente descoberto via dislipidemia).
- Nenhuma alteração em `DrugRepository`, `DrugEntity`, `isEligible()`, `entityCoversCondition()`, `classifyPriority()`, motor de segurança, RM-23, RM-24.

## 22. Testes criados

`src/tests/global-condition-drug-coverage-29.test.ts` — **38 testes**, cobrindo os 34 itens obrigatórios da Fase 13 (todas as condições auditáveis; classes de `CONDITION_CLASS_KEYS` mapeáveis; molécula com indicação própria descoberta quando a classe está conectada — Atorvastatina/Enalapril/Tiotrópio/combinações ICS_LABA; molécula sem indicação própria não descoberta — Perindopril/Umeclidínio/Glicopirrônio/Aclidínio; classe não promovida automaticamente para todas as condições — ICS isolado fora de DPOC, LABA isolado fora de asma; indicação de subgrupo não generalizada — BETABLOQUEADOR/ARM/DIURETICO_ALCA não em HAS; indicação de comorbidade não confundida — GLP1 não em SCA/HAS, BRA não em DM2; falso positivo textual descartado — Levotiroxina não em HAS; combinações comerciais preservadas; determinismo; sem duplicidade; contraindicação/alergia/interação/ajuste renal-hepático prevalecem; RM-23/24/25.1/26/26.1/27/27.1/28 íntegros; nenhuma condição/molécula/marca/apresentação/dado fabricado).

## 23. Testes alterados

`src/tests/guideline-class-validation-27.test.ts` — 2 ajustes: (1) o teste "demais classes de asma/DPOC permanecem primeira_linha" agora exclui explicitamente LAMA do conjunto de comparação, já que essa classe passou a ter override contextual próprio no RM-29 (mesmo padrão do SABA, documentado no próprio teste); (2) o teste "condições sem overrides" removeu `sca` da lista, já que essa condição passou a ter overrides no RM-29 (comentário atualizado apontando para os testes específicos). Ambos os ajustes documentam a razão inline e não alteram nenhuma asserção de comportamento anterior — apenas atualizam a lista de condições/classes usada como controle negativo.

## 24. Resultado dos gates

| Verificação | Resultado |
|---|---|
| `tsc --noEmit` | ✅ limpo |
| `npm run lint` | ✅ 0 violações |
| `npx vitest run` | ✅ **315/315** (277 pré-existentes, 2 asserções ajustadas intencionalmente + 38 novos) |
| `npx vitest run --coverage` | ✅ sem violação de meta |
| RM-23 (via `npm run build`) | ✅ 358 entidades, 0 crítico/alto |
| RM-24 (via `npm run build`) | ✅ 365 analisados, 0 crítico, publicação liberada |
| `npm run build` | ✅ compilado, 50 rotas |

## 25. Limitações

- A varredura automática usa os mesmos tokens de `entityCoversCondition` (substring matching) — sujeita a falsos positivos textuais (ex.: "Hashimoto"⊃"has"), todos identificados e descartados manualmente nesta rodada, mas o mecanismo em si continua sendo heurístico, não um parser semântico de indicação clínica.
- A auditoria cobriu as 10 condições estruturadas; condições apenas textuais (sem `PROTOCOLO`/`CONDITION_CLASS_KEYS`) não foram auditadas, por estarem fora do escopo do fluxo real de recomendação (Fase 2 do enunciado).
- `has/BETABLOQUEADOR`, `has/ARM`, `has/DIURETICO_ALCA` permanecem como lacunas de modelo — sem um campo estruturado de subgrupo (HAS resistente, DRC avançada), corrigir apenas por cobertura arriscaria generalizar uma indicação de subgrupo.

## 26. Próximos pontos de sourcing

- Avaliar RM dedicado para representar subgrupos de HAS (resistente, DRC avançada) de forma estruturada, permitindo reconsiderar `has/BETABLOQUEADOR`, `has/ARM`, `has/DIURETICO_ALCA` com segurança.
- Reavaliar `icc/TIAZIDICO` (Clortalidona/Indapamida) se/quando houver fonte mais robusta para uso em retenção volêmica leve como parte do plano estruturado (hoje tratado como adjuvante, fora de escopo).
- Repetir esta auditoria global periodicamente conforme novas moléculas/classes/condições forem incorporadas à base canônica, para detectar recorrências do mesmo padrão de lacuna (SGLT2/ICC, agora generalizado).

---

**Resumo quantitativo:** 10 condições auditadas · 24 classes auditadas · 358 moléculas auditadas (varredura completa do DrugRepository) · 38 candidatos a gap gerados · 8 gaps reais confirmados e corrigidos · 9 falsos positivos identificados e descartados · 3 gaps classificados como "requer novo RM" (subgrupo de HAS) · 0 pendentes de sourcing · 2 alterações de arquivo de código (`therapeutic-class-expansion.ts`, `guideline-class-validation.ts`), reaproveitando 100% da arquitetura já existente.

---

*GLOBAL_CONDITION_DRUG_COVERAGE_REPORT — gerado após implementação e validação completa (RM-29).*
