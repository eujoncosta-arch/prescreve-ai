# RM-64 — Matriz de Cenários de Jornada Clínica

Suíte: [`frontend/src/tests/clinical-journey-acceptance-rm64.test.ts`](../frontend/src/tests/clinical-journey-acceptance-rm64.test.ts)

Cada cenário (`CJ-XXX`) testa a jornada real **paciente → anamnese → dados clínicos →
hipóteses → estratificação de risco → exames → conduta → seleção farmacológica →
alertas → cálculo de dose → prescrição → persistência/reabertura** encadeando as
funções reais do sistema (nível de integração), nunca simulando comportamento.

Nenhuma conduta, dose, protocolo ou interação foi inventada para este documento —
toda expectativa cita o arquivo:linha do sistema que a implementa.

---

## CJ-001 — Hipertensão com obesidade e risco cardiovascular

| Campo | Conteúdo |
|---|---|
| Dados de entrada | PA 168/102, comorbidade "Hipertensão Arterial", tabagismo ativo, sedentarismo, IMC≈32.9 (obesidade grau I), HF de infarto paterno aos 55 anos |
| Ação do usuário | Submete anamnese → seleciona hipótese HAS → sistema calcula risco |
| Resultado esperado | Hipótese HAS (CID I10) com probabilidade `'alta'`; `getTherapeuticForCondition('has', ...)` retorna Enalapril (IECA, 1ª linha) |
| Alertas esperados | Dimensão `risco_cardiovascular.nivel` ∈ {`'alto'`, `'muito_alto'`, `'critico'`}, score ≥ 50 |
| Alertas que não devem aparecer | `encaminhamento_urgente = false` (PA < 180/110, não é emergência hipertensiva) |
| Comportamento permitido | `risco_global`/`score_global` permanecer em `[0,100]` mesmo com uma dimensão elevada |
| Comportamento proibido | Score fabricado fora de `[0,100]` |
| Fonte da expectativa | `clinical-decision-support.ts:74-166` (BASE_CLINICA['has'], 7ª Diretriz SBC 2020); `clinical-therapeutics.ts:24` (PROTOCOLOS.has); `clinical-risk-engine.ts` (avaliarRiscoCV, nivelPorScore:65-70) |
| Classificação | Regra clínica confirmada (critérios HAS) + comportamento atual do software (score ponderado) |

**ACHADO-01 (mesmo cenário, teste separado) — PROTEGIDO NA UX (RM dedicada, posterior
à RM-64):** `risco_cardiovascular.nivel === 'alto'` mas `risco_global === 'baixo'`,
porque `risco_global` é média ponderada de 6 dimensões (CV 25%, Renal 20%,
Hemorrágico 15%, Farmacológico 20%, Interação 10%, Terapêutico 10% —
`clinical-risk-engine.ts:576-583`). Com as outras 5 dimensões ainda em zero nesta etapa
da jornada, o agregado dilui o risco CV real. **Não é bug — é o design documentado do
motor** — a fórmula permanece inalterada. Era uma expectativa de UX não atendida: um
médico que lesse só o rótulo `risco_global` podia subestimar um risco CV já elevado.
Corrigido na camada de apresentação: `dimensoesAcimaDoRiscoGlobal()`
(`clinical-risk-engine.ts`) identifica dimensões acima do agregado; a UI
(`consulta/nova/page.tsx`) nunca exibe `risco_global` sozinho quando a lista não está
vazia. Ver `docs/ACHADO-01-RISCO-GLOBAL-UX-PROTECTION.md` e
`frontend/src/tests/achado-01-risco-global-protecao.test.ts`.

---

## CJ-002 — Idoso com polifarmácia

| Campo | Conteúdo |
|---|---|
| Dados de entrada | Paciente idoso em uso de Amitriptilina + Tramadol + Sertralina |
| Ação do usuário | Sistema checa critérios de Beers por medicamento + `runSafetyCheck` com `idoso:true` |
| Resultado esperado | 2 alertas de Beers reais (Amitriptilina: "Anticolinérgico"; Tramadol: "síndrome serotoninérgica maior em idosos") |
| Alertas esperados | Interação sertralina+tramadol → severidade `'danger'`, descrição menciona "serotonin" |
| Alertas que não devem aparecer | Nenhum alerta afirmando a combinação como "segura" |
| Comportamento permitido | Múltiplos alertas simultâneos (Beers + interação) para o mesmo par de fármacos |
| Comportamento proibido | Suprimir o alerta de interação por já existir um alerta de Beers (ou vice-versa) |
| Fonte da expectativa | `dose-calculator.ts:351-374` (BEERS_DRUGS, checkBeersCriteria); `safety-rules.ts:361-374` (CRITICAL_PAIRS sertralina/isrs+tramadol) |
| Classificação | Regra clínica confirmada (critérios de Beers 2023 + par crítico documentado) |

---

## CJ-003 — Paciente pediátrico com dose baseada em peso

| Campo | Conteúdo |
|---|---|
| Dados de entrada | Criança de 4 anos (48 meses), 20kg vs. mesma idade com 35kg |
| Ação do usuário | `calcDosePediatrica('oseltamivir', paciente, 'Influenza A e B...')` |
| Resultado esperado | 20kg → 45mg/dose (faixa 15-23kg); 35kg → 60mg/dose (faixa 23-40kg) |
| Alertas esperados | `frequenciaTexto` contém "2" (2x/dia) |
| Alertas que não devem aparecer | Mesma dose para pesos diferentes na mesma idade |
| Comportamento permitido | Dose variar exclusivamente por faixa de peso |
| Comportamento proibido | Motor usar idade como proxy de peso |
| Fonte da expectativa | `pediatric-engine.ts:511-531` (PEDIATRIC_DOSES.oseltamivir, faixaKg real) |
| Classificação | Regra clínica confirmada (bula/protocolo de oseltamivir pediátrico já catalogado) |

---

## CJ-004 — Paciente com insuficiência renal grave

| Campo | Conteúdo |
|---|---|
| Dados de entrada | 70 anos, 60kg, creatinina 4.5 mg/dL, em uso de perindopril |
| Ação do usuário | `calcCrCl` → `getAdjustmentForCrCl` → `runSafetyCheck` |
| Resultado esperado | CrCl < 15 mL/min; ajuste renal do perindopril = "Contraindicado"; alerta tipo `'renal'` severidade `'critical'` |
| Alertas esperados | `acao` do alerta contém "substituir" |
| Alertas que não devem aparecer | Severidade rebaixada (`'warning'`/`'info'`) para TFG < 15 com contraindicação documentada |
| Comportamento permitido | Alerta crítico bloqueante para faixa de TFG mais grave |
| Comportamento proibido | Silenciar o alerta por falta de dado de posologia manual |
| Fonte da expectativa | `pharma-database-cardio.ts:135-165` (perindopril.ajuste_renal); `dose-calculator.ts:315` (getAdjustmentForCrCl); `safety-rules.ts:232-245` (regra renal) |
| Classificação | Regra clínica confirmada (bula perindopril + estadiamento TFG) |

---

## CJ-005 — Interação medicamentosa relevante (IECA + AINE)

| Campo | Conteúdo |
|---|---|
| Dados de entrada | Enalapril (IECA) + Ibuprofeno (AINE) em uso concomitante |
| Ação do usuário | `runSafetyCheck({moleculas:['enalapril','ibuprofeno']})` |
| Resultado esperado | Pelo menos 1 alerta real gerado (interação, duplicidade ou renal) |
| Alertas esperados | Alerta não-vazio relacionado ao par IECA+AINE |
| Alertas que não devem aparecer | Lista de alertas vazia silenciosa |
| Comportamento permitido | Classificação exata do `tipo` do alerta pode variar (não fixada neste teste — ver lacuna abaixo) |
| Comportamento proibido | Nenhum alerta para uma combinação nefrotóxica documentada |
| Fonte da expectativa | `safety-rules.ts:317-322` (CRITICAL_PAIRS ieca+aine, "Risco nefrotóxico") |
| Classificação | Regra clínica confirmada; **limitação de teste declarada**: a asserção não fixa o `tipo` exato do alerta (não relemos a lógica completa de classificação de classe) — cobertura suficiente para aceitação, não para regressão fina de categoria |

---

## CJ-006 — Contraindicação/alerta crítico (QT prolongado)

| Campo | Conteúdo |
|---|---|
| Dados de entrada | Azitromicina + Amiodarona |
| Ação do usuário | `runSafetyCheck` |
| Resultado esperado | Alerta severidade `'critical'`, descrição contém "qt", ação contém "evitar" |
| Alertas esperados | Todos os alertas com o mesmo título permanecem `'critical'` (nunca rebaixados) |
| Alertas que não devem aparecer | Qualquer alerta desta combinação classificado como `'info'`/`'warning'` |
| Comportamento permitido | — |
| Comportamento proibido | Rebaixamento de severidade para uma combinação de risco de morte súbita documentada |
| Fonte da expectativa | `safety-rules.ts:339-345` (CRITICAL_PAIRS azitromicina+amiodarona) |
| Classificação | Regra clínica confirmada |

---

## CJ-007 — Obesidade: semaglutida DM2 vs. obesidade

| Campo | Conteúdo |
|---|---|
| Dados de entrada | Busca por "poviztra" (marca de obesidade) |
| Ação do usuário | `searchDrugs('poviztra')` |
| Resultado esperado | Retorna `semaglutida_obesidade`; nunca retorna `semaglutida` (DM2) |
| Alertas esperados | Contraindicações da entidade obesidade contêm "carcinoma medular" (de tireoide) |
| Alertas que não devem aparecer | Sobreposição de marcas comerciais entre as duas entidades |
| Comportamento permitido | Duas entidades catalográficas distintas para a mesma molécula com indicações diferentes |
| Comportamento proibido | Busca por marca de obesidade retornar a apresentação de DM2 (ou vice-versa) — risco de erro de indicação/dose |
| Fonte da expectativa | `pharma-database.ts:1278` (semaglutida, DM2); `pharma-database-endo.ts:927` (semaglutida_obesidade) — já usado como âncora em RM-63 |
| Classificação | Regra clínica confirmada (bulas Ozempic®/Wegovy®) + comportamento atual do software (separação catalográfica) |

---

## CJ-008 — Busca por marca comercial menos óbvia

| Campo | Conteúdo |
|---|---|
| Dados de entrada | Busca "glifage", busca "aldactone" |
| Ação do usuário | `searchDrugs(query)` |
| Resultado esperado | "glifage" → Metformina; "aldactone" → Espironolactona |
| Alertas esperados | N/A (cenário de busca, não de alerta clínico) |
| Alertas que não devem aparecer | N/A |
| Comportamento permitido | Busca por sinônimo de marca sem relação lexical com a molécula |
| Comportamento proibido | Lista vazia para marca comercial real cadastrada |
| Fonte da expectativa | Reaproveitado de `search-coverage-contract-rm63.test.ts` (RM-63) |
| Classificação | Comportamento atual do software (contrato de cobertura de busca, RM-63) |

---

## CJ-009 — Prescrição rápida sem anamnese completa

| Campo | Conteúdo |
|---|---|
| Dados de entrada | Idade/sexo/peso/creatinina apenas (sem `Anamnesis`) |
| Ação do usuário | `searchDrugs` → `calcCrCl` → `runSafetyCheck`, sem objeto `Anamnesis` |
| Resultado esperado | Todas as chamadas funcionam sem exigir anamnese |
| Alertas esperados | Lista de alertas válida (`Array.isArray`), podendo ser vazia |
| Alertas que não devem aparecer | Erro/exceção por ausência de anamnese |
| Comportamento permitido | Fluxo de prescrição rápida operar isolado do restante da jornada |
| Comportamento proibido | — |
| Fonte da expectativa | Investigação de código confirmada: `prescricao-rapida/page.tsx` não usa `Consultation`/`Anamnesis`/`store` |
| Classificação | Comportamento atual do software (arquitetural, confirmado por leitura de código) |

**Limitação de cobertura declarada:** o segundo teste deste cenário (`expect(true).toBe(true)`)
é uma nota de rastreabilidade, não uma asserção de comportamento de componente — provar
que `dispatch` nunca é chamado exigiria montar o componente React (fora do escopo de
integração desta suíte). Ver "Cenários pendentes" no relatório.

---

## CJ-010 — Caso ambíguo: sem certeza indevida

| Campo | Conteúdo |
|---|---|
| Dados de entrada | (a) anamnese fraca (2 critérios de HAS, sem PA medida); (b) anamnese totalmente vazia |
| Ação do usuário | `analyzeClinical(anamnese)` |
| Resultado esperado | (a) hipótese, se presente, nunca `'alta'`; (b) ver GAP-01 abaixo |
| Alertas esperados | `encaminhamento_urgente === false` em ambos os casos |
| Alertas que não devem aparecer | Probabilidade `'alta'` fabricada a partir de dado ausente/fraco |
| Comportamento permitido | Motor gerar hipótese de baixa confiança |
| Comportamento proibido | Apresentar certeza (`'alta'`) sem critérios suficientes |
| Fonte da expectativa | `clinical-decision-support.ts:1002-1006` (gradesFromScore, corte pct<35→'baixa') |
| Classificação | Regra clínica confirmada (corte de confiança) |

**GAP-01 — CORRIGIDO (RM dedicada, posterior à RM-64):** uma anamnese
**totalmente vazia** gerava 1 hipótese espúria (`faringoamigdalite`,
`grau_confianca=22`, `probabilidade='baixa'`). Causa raiz: a regra
`clinical-decision-support.ts` usava critérios de **ausência** de sintoma
(`!has(queixa_principal, hda, 'tosse')` etc.) que tratavam "campo vazio" como
"sintoma confirmadamente ausente" — os dois eram indistinguíveis, e a soma de
pesos (3+3=6) cruzava o `peso_minimo_para_incluir` (5). **Não foi corrigido
dentro do escopo original da RM-64** (suíte de aceitação, não correção de
motor clínico) — permaneceu documentado como lacuna até uma RM dedicada
("start GAP-01 as its own RM") introduzir o helper `absenceOf()`, que exige
texto real preenchido antes de contar a ausência da palavra-chave como
evidência. Nenhuma regra clínica nova foi criada — só a condição "dado não
coletado" deixou de ser tratada como "sintoma negado". Comportamento atual
(já correto): anamnese vazia → `hipoteses: []`. Regressão coberta por
`frontend/src/tests/gap-01-absence-criteria.test.ts` e pelo teste
`CJ-010` atualizado nesta mesma suíte.

---

## CJ-011 — Persistência/reabertura (máquina de estados)

| Campo | Conteúdo |
|---|---|
| Dados de entrada | Consulta completa: anamnese HAS → diagnóstico → risco → terapêutica → prescrição |
| Ação do usuário | Encadeia `NEW_CONSULTATION → UPDATE_ANAMNESIS → UPDATE_DIAGNOSTIC → SELECT_DIAGNOSIS → SET_DIAGNOSTICO_ESTRUTURADO → SET_RISCO_CALCULADO → UPDATE_THERAPEUTIC → UPDATE_PRESCRIPTION` no `reducer` real |
| Resultado esperado | Status final `'concluida'`; todos os dados de etapas anteriores (`anamnese`, `apoio_diagnostico`, `risco_calculado`, `plano_terapeutico`, `prescricao`) preservados simultaneamente |
| Alertas esperados | N/A (teste de integridade de estado, não de alerta clínico) |
| Alertas que não devem aparecer | N/A |
| Comportamento permitido | Transições sucessivas de `status` (`anamnese→diagnostico→terapeutico→prescricao→concluida`) |
| Comportamento proibido | Qualquer transição apagar dado de etapa anterior |
| Fonte da expectativa | `store.tsx` (reducer real, mesmas ações usadas por `consulta/nova/page.tsx`) |
| Classificação | Comportamento atual do software (máquina de estados do reducer) |

**Nota de escopo:** a persistência real em Postgres (idempotência, ownership, cascade
delete) já é coberta por `backend/test/postgres-real.e2e-spec.ts` — **não duplicada
aqui**; CJ-011 garante especificamente a integridade da máquina de estados do
frontend com as funções reais (reducer real, não mock).
