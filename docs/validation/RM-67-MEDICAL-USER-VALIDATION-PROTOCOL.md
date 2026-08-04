# RM-67 — Protocolo de Validação Externa com Médicos

**Natureza deste documento:** um protocolo de pesquisa de usabilidade e
fatores humanos, pronto para execução. **Nenhuma sessão foi realizada, nenhum
médico foi consultado e nenhum dado de validação existe até aqui.** Esta RM
prepara o método, os instrumentos e as métricas — não afirma, e não deve ser
lida como afirmando, que o Prescreve-AI foi validado clinicamente.

Modelos reutilizáveis (roteiro, termo de orientação, casos simulados, ficha
de observação, questionário pós-uso, planilha de métricas, modelo de
relatório) estão em [`docs/validation/templates/`](templates/) — ver
[índice completo](#9-entregáveis-e-onde-estão) ao final deste documento.

---

## 1. Objetivo

Criar um processo repetível para colher, de médicos que **não** participaram
da construção do sistema, evidência estruturada sobre:

- se as tarefas centrais do fluxo real (anamnese → hipótese → risco →
  conduta → prescrição) são executáveis sem ajuda excessiva;
- se o médico entende corretamente o que o sistema está e não está
  afirmando (hipótese vs. diagnóstico confirmado; recomendação genérica vs.
  personalizada; dado real vs. demonstrativo);
- se existe algum ponto em que o sistema induz **confiança indevida** —
  o risco mais grave que uma validação de usabilidade em software clínico
  pode detectar antes de um usuário real ser afetado;
- quais problemas de UX são graves o suficiente para bloquear uso real, e
  quais são preferência estética.

## 2. O que esta validação prova e o que ela NÃO prova

Esta seção vem antes do método porque governa a interpretação de qualquer
resultado futuro — não deve ser lida só no fim.

### O que PROVA (com uma amostra de 5–10 médicos)

- Presença de problemas de usabilidade relevantes o suficiente para aparecer
  com poucos usuários (a literatura de teste de usabilidade — Nielsen,
  descoberta de problemas com n pequeno — mostra que a maioria dos problemas
  de usabilidade graves de uma interface aparece já nas primeiras 5
  sessões; problemas raros ou dependentes de perfil específico exigem mais).
- Se a interface comunica ou não, na prática (não na intenção do design),
  a diferença entre dado real e demonstrativo, entre hipótese e diagnóstico,
  entre recomendação genérica e personalizada.
- Pontos concretos onde médicos reais ficam confusos, travam, pedem ajuda,
  ou — o achado mais crítico — confiam mais do que deveriam.
- Uma lista priorizável de problemas de UX para correção antes de uma
  rodada maior.

### O que NÃO PROVA

- **Eficácia clínica.** Nenhuma tarefa desta rodada mede se uma conduta
  sugerida pelo sistema melhora desfecho de paciente real.
- **Segurança clínica em uso real.** Os casos são simulados; nenhuma decisão
  sobre paciente real é tomada ou avaliada.
- **Conformidade regulatória.** Esta rodada não é, não substitui, e não deve
  ser citada como um processo de certificação, registro ANVISA/FDA, estudo
  clínico registrado, ou avaliação de conformidade com qualquer norma
  (ex.: IEC 62366, ISO 14971) — é usabilidade exploratória, sem desenho
  estatístico para inferência populacional.
- **Generalização estatística.** 5–10 participantes não permitem afirmar
  taxas de erro/sucesso da população de médicos em geral — permitem
  descoberta qualitativa e priorização, não prova quantitativa.
- **Ausência de outros problemas.** Não encontrar um problema nesta rodada
  não significa que ele não existe — significa que não apareceu com esta
  amostra, estas tarefas, esta duração de sessão.

Qualquer relatório ou comunicação (interna ou externa) que resultar desta
rodada deve reafirmar estes limites explicitamente — nunca apenas "validado
com médicos".

## 3. Participantes

### Tamanho da amostra

**5 a 10 médicos** na primeira rodada exploratória. Esse tamanho é adequado
para descoberta inicial de problemas de usabilidade (a maior parte dos
problemas de interface que afetam a maioria dos usuários já aparece com essa
quantidade de sessões observadas), mas é **insuficiente** para qualquer
afirmação de eficácia ou segurança clínica — que exigiria desenho de estudo
próprio, com controle, poder estatístico e aprovação ética específica, fora
do escopo desta RM.

### Critérios de inclusão

- Médico com registro ativo (CRM), em qualquer estágio de carreira
  (residente sênior a experiente) — variar deliberadamente.
- **Não participou** do desenvolvimento, design ou revisão clínica do
  Prescreve-AI em nenhuma RM anterior.
- Não teve acesso prévio ao sistema antes da sessão.

### Critérios de exclusão

- Qualquer envolvimento prévio (mesmo indireto, ex.: revisão de conteúdo
  clínico, consultoria informal) no desenvolvimento do produto.
- Ter recebido treinamento prévio no uso específico do Prescreve-AI.

### Diversidade de perfil recomendada (para a rodada de 5–10)

| Perfil | Quantidade sugerida | Por quê |
|---|---|---|
| Clínica médica / medicina de família | 2–3 | Público-alvo primário do fluxo real (`/consulta/nova`) |
| Especialidade com alta carga em condições já cobertas pelo motor (cardiologia OU endocrinologia) | 1–2 | Testa se o médico especialista percebe lacunas que um generalista não notaria |
| Pediatria | 1 | Único perfil que exercitaria especificamente dose por peso/idade |
| Residente (R2–R3) | 1–2 | Perfil com menos tempo de prática — sensível a fricção de interface |
| Médico com > 15 anos de prática | 1–2 | Perfil mais cético a recomendação automatizada — sensível a "confiança indevida" |

Não é necessário atingir esta tabela exatamente — é uma referência de
diversidade, não uma cota rígida. Documentar o perfil real de cada
participante na ficha de observação (nunca por nome — ver seção 5,
privacidade).

### Treinamento

**Sem treinamento excessivo.** Cada participante recebe apenas:
1. O termo de orientação (2–3 min de leitura,
   [`templates/RM-67-participant-briefing.md`](templates/RM-67-participant-briefing.md));
2. Uma frase de contexto oral ("Isto é um sistema de apoio à decisão clínica
   em desenvolvimento; vou pedir que você realize algumas tarefas pensando em
   voz alta; não existe resposta certa, estou testando o sistema, não você").

Nenhum tour guiado da interface, nenhuma demonstração prévia de como usar —
isso mediria a capacidade do facilitador de ensinar, não a usabilidade real
do sistema para um médico chegando sem contexto, que é exatamente o cenário
de adoção real.

## 4. Segurança e ética da sessão

- **Todos os casos clínicos são simulados** ([`templates/RM-67-simulated-cases.md`](templates/RM-67-simulated-cases.md))
  — nenhum dado de paciente real, identificável ou não, é usado em nenhuma
  tarefa.
- **Nenhuma decisão clínica real é solicitada.** O participante interage com
  o sistema como se estivesse atendendo, mas nenhuma prescrição gerada na
  sessão é para um paciente real — isso é explicitado no termo de orientação
  e repetido verbalmente antes de a sessão começar.
- **Nenhuma afirmação de conformidade regulatória** é feita ao participante,
  em nenhum material, sobre este processo ou sobre o sistema.
- **Gravação (se houver) é opcional e consentida explicitamente** — o termo
  de orientação inclui uma pergunta de sim/não separada para gravação de
  tela/áudio, distinta do consentimento de participação.
- **Direito de parar a qualquer momento**, sem necessidade de justificativa,
  sem qualquer prejuízo.
- **Nenhum dado de identificação do participante** (nome, CRM, instituição)
  entra na ficha de observação ou no relatório agregado — usar apenas um
  código de sessão (`P01`, `P02`, ...) e o perfil (especialidade/tempo de
  prática) declarado na seção 3.

## 5. Estrutura da sessão

Roteiro completo, com tempos sugeridos e falas do facilitador, em
[`templates/RM-67-session-script.md`](templates/RM-67-session-script.md).
Resumo:

| Fase | Duração sugerida | Conteúdo |
|---|---|---|
| 1. Abertura e consentimento | 5 min | Termo de orientação, consentimento de gravação, contexto oral |
| 2. Aquecimento | 3 min | 1 pergunta aberta: "Como você usa hoje (papel, sistema, memória) para decidir uma conduta em um caso comum?" — nunca sobre o Prescreve-AI ainda |
| 3. Execução das tarefas (pensando em voz alta) | 30–40 min | Lista de tarefas da seção 6, na ordem do roteiro |
| 4. Entrevista pós-uso (perguntas obrigatórias) | 10–15 min | Seção 7 |
| 5. Questionário pós-uso (escrito) | 5 min | [`templates/RM-67-post-use-questionnaire.md`](templates/RM-67-post-use-questionnaire.md) |
| 6. Encerramento | 2 min | Agradecimento, próximos passos, sem promessa de resultado |

Duração total-alvo: **60–70 minutos por sessão** — deliberadamente curto o
suficiente para não cansar (o que produziria abandono e distorceria as
métricas de tempo/erro) e longo o suficiente para cobrir a jornada completa.

## 6. Tarefas

Cada tarefa é mapeada a uma tela/fluxo real do sistema (não uma tarefa
hipotética) e a um dos casos simulados (seção 8). O facilitador nunca revela
o resultado esperado antes da tentativa do participante.

| # | Tarefa | Onde no sistema (referência interna, não mostrar ao participante) | O que observar |
|---|---|---|---|
| T1 | Criar um novo paciente/consulta | `/consulta/nova` | Encontra o ponto de entrada sem ajuda? |
| T2 | Registrar uma anamnese (queixa, HDA, sinais vitais, comorbidades) | `AnamneseForm` | Entende quais campos são obrigatórios vs. opcionais? |
| T3 | Interpretar a(s) hipótese(s) diagnóstica(s) geradas | `DiagnosticPanel`, `analyzeClinical` | Trata a hipótese como definitiva ou como hipótese? (pergunta-chave de segurança) |
| T4 | Consultar a estratificação de risco | Painel de risco (`avaliarRiscoClinico`) | Entende a diferença entre uma dimensão específica (ex. cardiovascular) e o risco agregado? |
| T5 | Localizar um medicamento pela MARCA comercial (não pelo nome genérico) | Busca de prescrição (`searchDrugs`) | Sucesso na busca por marca menos óbvia? |
| T6 | Verificar as apresentações/concentrações reais de um medicamento | Card do medicamento na busca | Percebe se há mais de uma apresentação e escolhe a correta para o caso? |
| T7 | Analisar um alerta de segurança (interação, contraindicação ou ajuste renal) | `runSafetyCheck`, alertas na tela de prescrição | Entende a gravidade e a ação recomendada, ou ignora/clica através? |
| T8 | Gerar uma conduta terapêutica a partir do diagnóstico | `getTherapeuticForCondition`, painel terapêutico | Entende de onde vem a sugestão (protocolo/evidência) ou trata como "a IA decidiu"? |
| T9 | Criar/revisar uma prescrição final | Painel de prescrição | Completa o fluxo até o objeto de prescrição final? |
| T10 | Identificar se uma página específica é demonstração ou dado real | Uma página do grupo Científico/Inteligência (ex.: `/insights` ou `/prognostico`) vs. o fluxo real (`/consulta/nova`) | Percebe o aviso de dado demonstrativo (`DemoDataNotice`) sem ser instruído a procurá-lo? |
| T11 | Lidar com dados incompletos (anamnese com campos vazios) | Repetir T3/T4 com uma anamnese propositalmente incompleta (caso simulado dedicado) | Percebe a limitação, ou o sistema (ou o próprio médico) preenche a lacuna com certeza indevida? |

Ordem sugerida no roteiro: T1→T2→T3→T4→T8→T5→T6→T7→T9, depois T10 e T11 como
blocos à parte (T10 pode ocorrer em qualquer ponto natural da sessão; T11 é
sempre a tarefa final, pois é a mais sensível a fadiga/aprendizado prévio).

## 7. Perguntas obrigatórias (entrevista pós-uso)

Nunca substituir por "Você gostou?" — essa pergunta não aparece neste
protocolo. Perguntas obrigatórias, nesta ordem, abertas (sem múltipla
escolha nesta fase):

1. O que você entende que o sistema está afirmando, nesta tela? *(repetir
   para pelo menos: hipótese diagnóstica, estratificação de risco, conduta
   terapêutica)*
2. Que dado especificamente fez você confiar (ou não) na recomendação que
   apareceu?
3. O que pareceu personalizado ao paciente que você "atendeu"?
4. O que pareceu genérico, como se fosse igual para qualquer paciente?
5. Você percebeu alguma informação demonstrativa/simulada em algum momento?
   Onde?
6. Em que momento, se algum, você deixaria de confiar no sistema?
7. O que você faria se discordasse de uma recomendação do sistema?
8. Qual etapa, se alguma, você não entendeu?
9. Você usaria isso na prática? Em quais condições isso mudaria (mais dados
   do paciente, mais transparência, revisão por outro médico, etc.)?

Perguntas de sondagem permitidas (não obrigatórias, usar conforme a resposta
do participante): "pode me mostrar onde na tela?", "o que você esperava que
acontecesse?", "isso te surpreendeu?".

## 8. Casos clínicos simulados

3 casos completos, com diversidade deliberada, em
[`templates/RM-67-simulated-cases.md`](templates/RM-67-simulated-cases.md):

1. **Caso A — HAS com obesidade e múltiplas comorbidades** (adulto,
   dado suficiente) — cobre T1–T9 em um caso "limpo".
2. **Caso B — Idoso com polifarmácia e função renal reduzida** (cobre
   alerta de segurança real, ajuste renal, interpretação de risco).
3. **Caso C — Anamnese deliberadamente incompleta** (usado só na T11) —
   sem sinais vitais, sem exames, queixa vaga — para observar se o
   participante ou o sistema preenchem a lacuna com certeza que os dados
   não sustentam.

Nenhum caso usa nome, CPF, data de nascimento real ou qualquer identificador
que pudesse remeter a uma pessoa real — nomes fictícios genéricos ("Paciente
Simulado 1") por convenção.

## 9. Ficha de observação e métricas

Ficha de observação por tarefa/participante:
[`templates/RM-67-observation-form.md`](templates/RM-67-observation-form.md).
Planilha agregada de métricas entre participantes:
[`templates/RM-67-metrics-spreadsheet.csv`](templates/RM-67-metrics-spreadsheet.csv).

### Métricas coletadas (nunca apenas satisfação)

| Categoria | Métrica | Como registrar |
|---|---|---|
| Desempenho | Taxa de conclusão por tarefa | Concluiu sem ajuda / concluiu com ajuda / não concluiu |
| Desempenho | Tempo por tarefa | Cronômetro, início ao fim da tarefa |
| Desempenho | Erros por tarefa | Contagem de ações incorretas/desvios do caminho esperado |
| Desempenho | Necessidade de ajuda | Nº de vezes que o participante pediu ajuda ao facilitador |
| Compreensão | Interpretações incorretas | Registrar toda vez que o participante descrever a tela de forma diferente do que ela realmente representa (ex.: chamar hipótese de "diagnóstico confirmado") |
| Desempenho | Abandono | Se o participante desistiu de uma tarefa antes de concluir |
| Confiança | Confiança declarada | Escala 1–5 na pergunta 2 da entrevista + questionário pós-uso |
| **Segurança** | **Confiança indevida** | Toda vez que o participante expressa confiança maior do que os dados/o sistema sustentam (ex.: trata uma hipótese de baixa probabilidade como certeza, ou não questiona uma recomendação genérica) — **a métrica mais crítica deste protocolo** |
| Compreensão | Compreensão das limitações | Se o participante identificou corretamente dado demonstrativo vs. real (T10) e a limitação da anamnese incompleta (T11) |
| UX | Problemas críticos de UX | Qualquer ponto onde o participante trava, erra de forma que poderia gerar erro clínico real, ou expressa confusão que impediria uso real — classificar por gravidade (seção 11) |

## 10. Critérios de sucesso por tarefa

Uma tarefa é considerada bem-sucedida quando **todas** as condições abaixo
são verdadeiras:

1. O participante conclui a tarefa (com ou sem 1 dica mínima do facilitador
   — mais de 1 dica conta como "concluiu com ajuda significativa", não
   sucesso pleno);
2. O participante descreve corretamente, na entrevista, o que a tela/ação
   representa (não confunde hipótese com diagnóstico, não confunde dado
   real com demonstrativo quando aplicável);
3. Nenhuma confiança indevida foi expressa durante ou após a tarefa;
4. O tempo da tarefa está dentro de uma faixa razoável (definida
   qualitativamente pelo facilitador — não há um limite numérico fixo nesta
   rodada exploratória, mas tempos muito acima da média do grupo são
   marcados para revisão).

## 11. Classificação de gravidade de problemas de UX

| Gravidade | Definição | Ação |
|---|---|---|
| **Crítico** | Pode levar a erro clínico real (confiança indevida, contraindicação não percebida, alerta ignorado por ambiguidade de design) | Bloqueia expansão a mais usuários até correção |
| **Alto** | Impede a conclusão da tarefa sem ajuda do facilitador | Corrigir antes da próxima rodada |
| **Médio** | Gera erro/confusão mas o participante se recupera sozinho | Priorizar, não bloqueante |
| **Baixo** | Preferência estética ou de fluxo, sem impacto em compreensão/segurança | Backlog |

## 12. Questionário pós-uso

Formulário escrito completo em
[`templates/RM-67-post-use-questionnaire.md`](templates/RM-67-post-use-questionnaire.md).
Contém: escalas Likert (1–5) para confiança, clareza, disposição de uso, e
2 perguntas abertas finais de captura livre ("algo que não te perguntamos e
você gostaria de comentar?").

## 13. Modelo de relatório

Estrutura completa em
[`templates/RM-67-report-template.md`](templates/RM-67-report-template.md).
Todo relatório produzido a partir desta rodada deve, obrigatoriamente,
reproduzir a seção 2 deste documento (o que prova / não prova) — nunca
reportar só os números sem o limite de interpretação.

## 14. Critérios para iniciar a rodada

Todos devem ser verdadeiros antes de agendar a primeira sessão:

1. Este protocolo revisado e aprovado por quem responde pelo produto.
2. Ambiente de teste estável: `npx tsc --noEmit`, `npm run lint`, suíte de
   testes e `npm run build` verdes no commit que será usado na sessão (não
   validar usabilidade sobre uma build quebrada).
3. Os 3 casos simulados carregados/prontos para uso na sessão (dado de
   anamnese pré-preenchido ou roteiro claro de como o facilitador o insere).
4. Pelo menos 5 participantes confirmados, com perfis cobrindo ao menos 2
   das linhas da tabela da seção 3.
5. Termo de orientação revisado e disponível para entrega a cada
   participante antes da sessão.
6. Facilitador (quem conduz a sessão) treinado no roteiro — não
   necessariamente a mesma pessoa em todas as sessões, mas cada facilitador
   deve ter lido e seguido o roteiro ao menos 1 vez em ensaio interno antes
   da primeira sessão real.

## 15. Critérios para interromper uma sessão (ou a rodada)

**Interromper uma sessão individual imediatamente se:**
- O participante pedir para parar, por qualquer motivo.
- O participante expressar desconforto além do esperado de uma sessão de
  usabilidade padrão.
- Ocorrer uma falha técnica que impeça a continuidade razoável da tarefa
  (não interromper por um bug menor recuperável — registrar como achado).

**Interromper a RODADA INTEIRA (pausar novas sessões até revisão) se:**
- For observado, em qualquer sessão, um problema classificado como
  **crítico** (seção 11) que sugira risco de confiança indevida sistemático
  (não apenas um usuário individual mal interpretando) — revisar antes de
  expor mais participantes ao mesmo problema sem necessidade.
- For identificado que o ambiente de teste não está estável (regressão de
  build/gate durante a rodada).
- 2 ou mais participantes consecutivos abandonarem a mesma tarefa pelo mesmo
  motivo — sinal de que o problema já foi suficientemente descoberto e
  continuar expondo participantes ao mesmo ponto de fricção sem ajustar não
  agrega dado novo.

## 16. Critérios para priorizar correções após a rodada

Ordem de prioridade para o backlog de correção, do relatório final:

1. **Qualquer achado de confiança indevida** (mesmo com n=1) — tratado como
   prioridade máxima, independentemente de quantos participantes o
   reproduziram, porque é exatamente o tipo de falha que este protocolo
   existe para capturar antes de afetar um usuário real.
2. **Problemas críticos de UX** (seção 11) reproduzidos por ≥ 2
   participantes.
3. **Problemas altos** reproduzidos por ≥ 2 participantes, ou por 1
   participante quando a tarefa afetada é do núcleo clínico (T2–T9).
4. Problemas médios recorrentes (≥ 3 participantes).
5. Problemas baixos — backlog geral, sem urgência.

Um achado reportado por apenas 1 participante NUNCA deve ser descartado
automaticamente por "n=1" quando a categoria é confiança indevida ou
segurança — a amostra pequena desta rodada é adequada para descoberta, não
para exigir replicação antes de agir sobre um risco de segurança.

## 17. Entregáveis e onde estão

| Entregável | Caminho |
|---|---|
| Este protocolo | `docs/validation/RM-67-MEDICAL-USER-VALIDATION-PROTOCOL.md` |
| Roteiro de sessão | `docs/validation/templates/RM-67-session-script.md` |
| Termo de orientação ao participante | `docs/validation/templates/RM-67-participant-briefing.md` |
| Casos clínicos simulados + tarefas | `docs/validation/templates/RM-67-simulated-cases.md` |
| Ficha de observação | `docs/validation/templates/RM-67-observation-form.md` |
| Planilha de métricas (modelo, CSV) | `docs/validation/templates/RM-67-metrics-spreadsheet.csv` |
| Legenda/dicionário de dados da planilha (arquivo adicional gerado nesta RM) | `docs/validation/templates/RM-67-metrics-spreadsheet-legend.md` |
| Questionário pós-uso | `docs/validation/templates/RM-67-post-use-questionnaire.md` |
| Modelo de relatório final | `docs/validation/templates/RM-67-report-template.md` |

Nenhum arquivo de código clínico (`frontend/src/**`, `backend/**`) foi
alterado nesta RM. Nenhuma sessão foi executada. Nenhum commit, push ou
deploy foi realizado.
