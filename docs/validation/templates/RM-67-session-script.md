# Roteiro de Sessão — Validação de Usabilidade Prescreve-AI

Uso: ler as falas entre aspas quase literalmente (adaptar tom, não o
conteúdo). Texto fora de aspas são instruções ao facilitador. Duração-alvo
total: 60–70 min.

---

## Preparação (antes do participante chegar)

- [ ] Ambiente do sistema no commit estável (gates verdes — ver critérios
      para iniciar no protocolo principal, seção 14).
- [ ] Sessão de teste sem histórico de outro participante (sem paciente,
      consulta ou localStorage de sessão anterior — evitar contaminação de
      dados residuais entre participantes).
- [ ] Termo de orientação impresso/pronto para envio.
- [ ] Ficha de observação e cronômetro prontos.
- [ ] Casos simulados A, B e C revisados (`RM-67-simulated-cases.md`).
- [ ] Gravação testada (se aplicável).

## Fase 1 — Abertura e consentimento (5 min)

> "Obrigado(a) por participar. Isto é uma sessão de teste de usabilidade de
> um sistema de apoio à decisão clínica que ainda está em desenvolvimento —
> chamado Prescreve-AI. Vou te pedir para realizar algumas tarefas nele,
> usando casos clínicos simulados, e para você ir descrevendo em voz alta o
> que está pensando e vendo enquanto faz isso.
>
> É importante deixar claro: estamos testando o SISTEMA, não você. Não existe
> resposta certa. Se você travar, ficar confuso, ou achar algo estranho —
> isso é exatamente o tipo de coisa que precisamos descobrir.
>
> Isto não é um estudo clínico e nenhuma decisão tomada aqui afeta um
> paciente real. Vou te dar um termo por escrito com esses mesmos pontos —
> pode ler com calma e perguntar qualquer coisa antes de começarmos."

Entregar termo de orientação. Aguardar leitura e assinatura/marcação.
Confirmar verbalmente:

> "Você tem alguma dúvida sobre o que vamos fazer? Você autoriza a gravação
> de tela? [Se sim] Vou iniciar a gravação agora."

## Fase 2 — Aquecimento (3 min)

> "Antes de entrarmos no sistema: me conta rapidamente, no seu dia a dia,
> como você normalmente decide uma conduta para um caso comum — usa papel,
> memória, algum sistema, protocolo impresso?"

Objetivo: entender o baseline do participante, não avaliar o Prescreve-AI
ainda. Não interromper, não guiar a resposta.

## Fase 3 — Execução das tarefas (30–40 min)

Abrir o sistema na tela inicial. Não dar nenhuma instrução de navegação
além do enunciado da tarefa.

> "Agora vou te passar uma situação simulada e uma tarefa. Por favor, pense
> em voz alta enquanto trabalha — o que você está procurando, o que espera
> encontrar, se algo te surpreende."

Para cada tarefa (ver lista completa e mapeamento em `RM-67-simulated-cases.md`
e na seção 6 do protocolo principal):

1. Ler o enunciado da tarefa.
2. Iniciar o cronômetro.
3. Observar em silêncio — só intervir se o participante:
   - pedir ajuda diretamente (registrar como 1 pedido de ajuda; dar a dica
     mínima possível, nunca resolver a tarefa pelo participante);
   - ficar em silêncio/parado por mais de ~30s sem progresso (perguntar "o
     que você está pensando agora?" — não é uma dica, é para manter o
     protocolo de pensar em voz alta).
4. Parar o cronômetro ao concluir (ou ao abandonar/pular).
5. Registrar na ficha de observação: tempo, nº de erros, nº de pedidos de
   ajuda, se concluiu, qualquer interpretação incorreta verbalizada.
6. Antes de passar à próxima tarefa, 1 pergunta rápida de checagem (não
   substitui a entrevista da Fase 4):
   > "Em uma frase, o que você entendeu que essa tela estava te dizendo?"

Ordem sugerida (ver justificativa na seção 6 do protocolo principal):
T1 → T2 → T3 → T4 → T8 → T5 → T6 → T7 → T9 → T10 → T11.

Se o tempo estiver se esgotando antes de todas as tarefas, priorizar
concluir T1–T9 (núcleo clínico) e T11 (dados incompletos) sobre T10.

## Fase 4 — Entrevista pós-uso (10–15 min)

Fazer as 9 perguntas obrigatórias da seção 7 do protocolo principal, nesta
ordem, sempre abertas primeiro (sem sugerir opções):

1. "O que você entende que o sistema está afirmando, nesta tela?" (repetir
   para hipótese, risco e conduta se ainda não tiver ficado claro nas
   checagens da Fase 3)
2. "Que dado especificamente fez você confiar (ou não) na recomendação que
   apareceu?"
3. "O que pareceu personalizado ao paciente que você atendeu?"
4. "O que pareceu genérico, como se fosse igual para qualquer paciente?"
5. "Você percebeu alguma informação demonstrativa ou simulada em algum
   momento? Onde?"
6. "Em que momento, se algum, você deixaria de confiar no sistema?"
7. "O que você faria se discordasse de uma recomendação do sistema?"
8. "Qual etapa, se alguma, você não entendeu?"
9. "Você usaria isso na prática? Em quais condições isso mudaria?"

Sondas permitidas: "pode me mostrar onde na tela?", "o que você esperava que
acontecesse?", "isso te surpreendeu?".

## Fase 5 — Questionário pós-uso (5 min)

> "Por último, um formulário rápido e curto por escrito — sem certo ou
> errado, é sua percepção mesmo."

Entregar `RM-67-post-use-questionnaire.md`. Aguardar preenchimento em
silêncio.

## Fase 6 — Encerramento (2 min)

> "Muito obrigado(a) pelo seu tempo. Isso vai nos ajudar a encontrar
> problemas antes de expor o sistema a mais médicos. Não posso te dar um
> resultado individual desta sessão agora — os achados são analisados em
> conjunto com as outras sessões. Alguma dúvida ou comentário final antes de
> encerrarmos?"

Parar gravação (se houver). Agradecer novamente. Arquivar a ficha de
observação com o código de sessão (nunca com o nome do participante).

---

## Checklist pós-sessão (facilitador, sozinho)

- [ ] Ficha de observação completa e legível.
- [ ] Questionário pós-uso anexado.
- [ ] Gravação (se houver) salva com o código de sessão, nunca com o nome.
- [ ] Termo de consentimento arquivado separadamente da ficha de observação
      (nunca no mesmo arquivo que os dados de desempenho).
- [ ] Ambiente do sistema resetado antes da próxima sessão (sem dado
      residual do participante anterior).
