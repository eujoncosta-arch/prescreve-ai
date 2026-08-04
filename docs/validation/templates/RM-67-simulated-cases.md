# Casos Clínicos Simulados — Validação de Usabilidade Prescreve-AI

**Nenhum destes casos representa um paciente real.** Nomes são placeholders
genéricos. Nenhum CPF, cartão de saúde, data de nascimento real ou qualquer
identificador de pessoa real deve ser usado ao adaptar estes casos.

Casos escolhidos por sobreporem-se a jornadas já validadas internamente
(ver `docs/RM-64-CLINICAL-JOURNEY-MATRIX.md`) — não são cenários inventados
para a sessão, são variações de cenários que o sistema já demonstrou
suportar, o que permite observar a USABILIDADE de um fluxo que já existe, sem
confundir "o sistema não sabe fazer isso" com "o médico não conseguiu
operar isso".

---

## Caso A — HAS com obesidade e comorbidades (dado suficiente)

Usado nas tarefas T1–T9.

**Paciente Simulado 1** — sexo feminino, 58 anos.

| Campo da anamnese | Valor a inserir |
|---|---|
| Queixa principal | "Cefaleia occipital e tontura há 1 semana" |
| HDA | "Refere pressão alta em casa, cefaleia occipital pela manhã" |
| História familiar | "Pai com infarto aos 55 anos, mãe hipertensa" |
| Sinais vitais | PA 168/102 mmHg, FC 82 bpm |
| Comorbidades | Hipertensão Arterial |
| Hábitos de vida | Sedentarismo, tabagismo ativo |
| Peso / altura | 95 kg / 1,70 m |

**Instrução ao participante (T1–T2):** "Este é um paciente simulado que
chegou para uma consulta de rotina. Crie a consulta e registre a anamnese
abaixo." (entregar a tabela acima em papel/cartão, não pedir para o
participante inventar dados).

**O que esperar do sistema (não mostrar ao participante — referência do
facilitador):** hipótese de Hipertensão Arterial Sistêmica com probabilidade
alta; dimensão de risco cardiovascular elevada; conduta terapêutica com IECA
como primeira linha.

---

## Caso B — Idoso com polifarmácia e função renal reduzida

Usado na tarefa T7 (alerta de segurança) e para reforçar T4 (risco).

**Paciente Simulado 2** — sexo masculino, 78 anos.

| Campo da anamnese | Valor a inserir |
|---|---|
| Queixa principal | "Dor lombar crônica, uso contínuo de vários remédios" |
| Medicamentos em uso | Amitriptilina, Tramadol, Sertralina |
| Função renal | Creatinina 2,8 mg/dL |
| Idade / sexo / peso | 78 anos / M / 70 kg |

**Instrução ao participante (T7):** "Este paciente está em uso dos
medicamentos listados. Use a busca de prescrição para verificar se há algum
alerta relevante ao considerar continuar ou ajustar esse tratamento."

**O que esperar do sistema (referência do facilitador):** alerta de
interação (síndrome serotoninérgica, sertralina + tramadol), alertas
geriátricos (critérios de Beers para amitriptilina/tramadol), e — se o
participante calcular a função renal — alerta renal pela creatinina elevada.

---

## Caso C — Anamnese deliberadamente incompleta

Usado exclusivamente na tarefa T11, sempre como última tarefa da sessão.

**Paciente Simulado 3** — dados mínimos, propositalmente.

| Campo da anamnese | Valor a inserir |
|---|---|
| Queixa principal | "Cefaleia leve ocasional" |
| Sinais vitais | (deixar em branco — não inserir PA) |
| Comorbidades | (nenhuma) |
| Exames/laboratório | (nenhum) |

**Instrução ao participante:** "Este paciente chegou com muito pouca
informação disponível — é o que temos por enquanto. Registre o que puder e
veja o que o sistema mostra. Depois me diga: você confiaria no que aparece
aqui? Por quê?"

**O que esperar do sistema (referência do facilitador):** o sistema pode
gerar uma hipótese de baixa confiança mesmo com dados mínimos (ver achado
GAP-01, `docs/RM-64-CLINICAL-JOURNEY-MATRIX.md`, CJ-010) — o ponto desta
tarefa não é se o sistema erra, é se o PARTICIPANTE percebe e verbaliza a
fragilidade da informação, ou se trata a hipótese/recomendação como se
tivesse a mesma força do Caso A. Esta é uma das oportunidades mais diretas de
observar "confiança indevida" (ver seção 9 do protocolo principal).

---

## Mapeamento caso → tarefa

| Caso | Tarefas |
|---|---|
| A | T1, T2, T3, T4, T5, T6, T8, T9 (e T10 pode ser inserida em qualquer ponto natural, navegando para uma página do grupo Científico/Inteligência) |
| B | T7 (e reforço de T4) |
| C | T11 (sempre por último) |
