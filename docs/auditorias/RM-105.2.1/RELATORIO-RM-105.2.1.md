# RM-105.2.1 — Estabilização da impressão, transparência de alergias e integridade contextual

Estado: implementada e verificada tecnicamente. **Sem commit, push ou deploy. RM-106 não iniciada.** Aprovação técnica não é homologação clínica.

## 1. Estado inicial

Branch `main`, commit `b36c639`, com alterações locais não commitadas das RM-104, RM-105, RM-105.1 e RM-105.2 (todas preservadas). Riscos residuais herdados da RM-105.2: o anexo saía por padrão no mesmo documento da receita, a separação dependia de destacar a última página, nada de impressão real havia sido validado (só emulação de CSS) e as alergias não avaliadas ainda podiam coexistir com o selo verde de "nenhum alerta".

## 2. Arquivos modificados

Novos: `components/modules/AlergiasNotice.tsx`; `tests/rm10521-impressao-alergias-idade-e-recuperacao.test.tsx` (33 testes); `docs/auditorias/RM-105.2.1/` (este relatório e `evidencias-impressao/`).
Alterados: `components/modules/PrescriptionPrintPreview.tsx` (reescrito), `ReceitaPaciente.tsx` (só classes de quebra), `app/globals.css` (bloco de impressão), `lib/safety-allergy.ts` (rótulos e transparência), `lib/safety-annex.ts`, `lib/safety-coverage.ts`, `lib/safety-context.ts`, `app/prescricao-rapida/page.tsx` (aviso de recuperação e alergias), e os testes `cj-009`, `rm104`, `rm105`, `rm1052`.
Não alterados: doses, posologias, contraindicações, matriz de interações, severidade das regras (inclusive dos alertas de alergia), identidade molecular, catálogo, regras de reatividade cruzada.

## 3. Alterações realizadas

**Impressão (prioridade máxima).** Dois comandos independentes, cada um gera um trabalho de impressão próprio (`#print-root[data-print-mode]`):
- **Imprimir receita do paciente** (botão principal, padrão): o anexo nunca existe no papel, mesmo se estiver aberto na tela (o CSS o oculta no modo receita).
- **Ver anexo técnico do prescritor** (abre na tela) e **Imprimir anexo técnico (uso exclusivo do prescritor)**: gera um documento só com o anexo, sem a receita.
- A caixa "incluir anexo na impressão" foi removida. O anexo só entra no DOM após ação explícita; depois de imprimir o anexo (`afterprint`) o modo volta a "receita".
- A proteção deixou de depender de o usuário separar páginas: receita e anexo **nunca saem no mesmo documento**. A opção B está preservada (o anexo continua existindo, em página/trabalho separado, exclusivo do prescritor).
- CSS: `@page` A4 com margem de 14 mm; itens da receita, assinatura, seções e itens do anexo sem quebra interna; título de seção nunca fica órfão.

**Transparência de alergias** (tela e anexo usam a mesma fonte de texto, `safety-allergy.ts`; nenhuma regra, gravidade ou contraindicação nova):
- alérgeno identificado molecularmente × não identificado × classe ("informação relevante AINDA NÃO avaliada molecularmente") × não medicamentosa ("fora do escopo do cruzamento molecular atual; excipientes não são avaliados");
- novo painel `AlergiasNotice` na aba Segurança; ausência de avaliação sempre aparece como "não indica ausência de risco"; "sem alergias conhecidas" é descrito como declaração;
- o selo verde "nenhum alerta" **não aparece mais** quando as alergias não foram avaliadas (só com alergias avaliadas ou ausência informada). Os dois testes antigos que afirmavam o selo com alergias não informadas foram ajustados por essa mudança intencional.

**Idade.** Ver §7. Recuperação de protocolo: ver §8.

## 4. Evidências de impressão (PDF real)

Método: o estado foi montado pela própria interface (Chrome dirigido por protocolo CDP, com cliques de mouse reais nos seletores de alergia); o DOM resultante foi capturado com o CSS embutido e **impresso em PDF real pelo Chrome** (`--print-to-pdf`, que aplica `@media print` e `@page`). `Page.printToPDF` via CDP não está disponível nesses navegadores ("Printing is not available"); por isso o caminho foi instantâneo do DOM + impressão do Chrome. O texto de cada PDF foi extraído com `pdftotext` e analisado por página.

| PDF | Páginas | Tamanho | Conteúdo verificado |
|---|---|---|---|
| S1 receita padrão (Varfarina + ibuprofeno) | 1 | A4 (595×842 pt) | só receita; 0 ocorrências de "ANEXO" ou termos técnicos |
| S1b anexo aberto na tela + "imprimir receita" | 1 | A4 | só receita (anexo isolado pelo modo) |
| S2 anexo (com alergia registrada) | 1 | A4 | só anexo; 0 ocorrências de "RECEITA MÉDICA" |
| S3 anexo com 10 alertas e 18 medicamentos | 3 | A4 | seções inteiras por página; "Alertas encontrados" abre a página 2; "Limitações" abre a 3 |
| S3b receita com 18 itens | 2 | A4 | 13 itens na p.1; item 13 inteiro na p.2 (após a correção) |
| S4 anexo, 8 moléculas não identificadas | 3 | A4 | todas listadas como "não reconhecido" |
| S5 anexo, avaliação parcial | 2 | A4 | "cobertura parcial" e combinações não avaliadas |
| S6 anexo, erro de avaliação | 1 | A4 | status real `erro`; "Erro de avaliação", "Alertas indisponíveis"; sem "Não foram identificados alertas" |

Verificado em todos: quebras de página, ausência de título órfão, ausência de item dividido entre páginas, ausência de estouro lateral (checagem em mídia de impressão com a largura útil A4 de 688 px: 0 elementos fora da largura), margens de 14 mm (A4 confirmado pelo `MediaBox`), isolamento da receita e do anexo, nenhum outro elemento da aplicação visível na impressão.

**Defeito real encontrado e corrigido:** na receita de 18 itens, o item 13 ficou com o nome no fim da página 1 e a posologia no início da página 2. Corrigido com `break-inside: avoid` nos itens e na assinatura (sem alterar o conteúdo) e conferido de novo no PDF.

Arquivos: `evidencias-impressao/*.pdf`, `*.txt` (texto extraído), `geometria.json`, `resumo.json`, `_snapshots/` (DOM capturado) e `scripts/` (`pdfval.mjs`, `layout-check.mjs`) para reproduzir.

## 5. Resultado dos testes

Novos: 33 (`rm10521-…`): impressão padrão só da receita; comandos explícitos e independentes; modo no instante da impressão; retorno a "receita" após `afterprint`; ausência de vazamento técnico com o anexo fechado ou aberto; alergia por classe, desconhecida, identificada e não medicamentosa; aviso de excipientes só quando pertinente; avaliação parcial; ausência de falsa avaliação integral; idade em anos, meses e dias (como fração de ano); recuperação de protocolo antigo; avaliação não herdada entre protocolos.
Ajustados por mudança intencional (justificada em cada teste): `rm104`/`rm105` (selo), `rm1052` (anexo por ação explícita, CSS por modo, idade 0), `cj-009` (botão de fechar com rótulo).

| Gate | Resultado |
|---|---|
| `tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 |
| `vitest run` | ver §5.1 |
| `npm run build` | exit 0, 50/50 páginas |

§5.1 — Resultado final da suíte: **88 arquivos, 1.686 testes, todos passando** (antes da RM-105.2.1: 87 / 1.652). Uma falha apareceu na primeira rodada (CJ-009, botão de fechar sem rótulo); foi corrigida e a suíte completa foi repetida com 0 falhas. `tsc`, lint e build foram executados antes dessa correção de teste (que não alterou código de produção).

## 6. Persistência e recuperação (documentado)

- **Persistido** (`localStorage`, chave `prescreve-ai-favoritos`): somente protocolos favoritos: `id`, `nome`, `descricao` (texto do diagnóstico), `criado_em` e `itens` (os itens da receita, com `entidade_id` nos protocolos novos). Teste confere que o arquivo salvo tem exatamente essas chaves e nenhuma menção a alergia, gestação, lactação, avaliação ou cobertura.
- **Não persistido** (vive só na memória da tela e se perde ao recarregar): dados do paciente (nome, idade, sexo, peso, altura, creatinina, Child-Pugh), gestação, lactação, alergias, resultado da avaliação de segurança, data/hora da avaliação, anexo técnico e receita impressa.
- **Recuperado de protocolo antigo:** apenas os itens. Sem `entidade_id`, o nome que casa com uma só entidade é confirmado; nomes com várias variantes ficam "identidade não confirmada" (avaliação parcial).
- **Nova avaliação de alergias:** sempre. A avaliação é recalculada a cada mudança de itens ou de dados e a cada protocolo carregado; as alergias precisam ser informadas de novo para cada paciente.
- **Como a tela comunica:** ao carregar um protocolo aparece o aviso "Apenas os itens da prescrição fazem parte do protocolo. Alergias, gestação, lactação, idade, função renal e a avaliação de segurança NÃO são recuperados…", com a contagem de itens sem identificação de entidade e orientação para reselecionar; o painel de alergias mostra "não informadas — não avaliadas".
- **Não herda avaliação antiga:** a avaliação nunca é gravada; teste carrega dois protocolos em sequência e confirma que o alerta do primeiro desaparece no segundo.
- **Limite não corrigido:** os dados do paciente exibidos na tela continuam sendo os da sessão atual; carregar um protocolo não os apaga. O aviso pede para confirmar que pertencem ao paciente; apagá-los automaticamente descartaria dados digitados e não foi decidido.

## 7. Contexto de idade (inspeção)

Três representações coexistem e **nenhuma alimenta a verificação de segurança além de anos decimais**:
- Tela de prescrição rápida: campo único "Idade (anos)", numérico (aceita decimais). Alimenta a verificação (`idade_anos`) e a calculadora de dose.
- Calculadora de dose (`dose-calculator.ts`): classifica por anos decimais; corte neonatal em 28/365 ano (`classifyPopulation`); a tela só abre a calculadora quando idade e peso estão preenchidos.
- `dosing-engine.ts` usa **dias** (neonato < 28 dias) e `pediatric-engine.ts` usa **meses**; nenhum deles é chamado por esta tela.

Resultado por faixa (testado): adulto e idoso (limiar 65 anos, regra geriátrica já existente); crianças e adolescentes aceitos; lactentes e neonatos só como fração de ano (1 mês = 0,083; 10 dias = 0,027); **0 anos** passou de "inválido" (era incoerente com a calculadora, que o trata como neonato) para válido com limitação; valores negativos, acima de 120 e não numéricos seguem inválidos; campos `idade_dias`/`idade_meses` não existem no contrato e **não são interpretados** (teste).
Para idade abaixo de 18 anos, a verificação passa a declarar a limitação: idade só em anos, neonato/lactente/criança não distinguidos com precisão, e a verificação de segurança não possui regras específicas por faixa pediátrica (só a regra geriátrica usa a idade). A limitação aparece na tela, no resultado e no anexo e **não bloqueia** a avaliação integral (nada é estratificado).
Evolução proposta (separada): informar idade com unidade (dias/meses/anos), normalizar em dias, alimentar `classifyPopulation`/`detectarPopulacao` e acrescentar a faixa etária ao contexto; decisão clínica prévia sobre se a verificação de segurança deve ter regras pediátricas.

## 8. Limitações técnicas

- O `Page.printToPDF` por CDP não funcionou nos navegadores disponíveis; a impressão foi feita pelo Chrome sobre um instantâneo do DOM real. O instantâneo é estático (sem JavaScript), mas o DOM, o CSS e o estado vêm da aplicação em execução.
- Cabeçalhos e rodapés: os PDFs foram gerados sem eles. Num diálogo de impressão do navegador, "Cabeçalhos e rodapés" (URL, data, título) é uma opção do usuário e pode aparecer na margem de 14 mm; não há como desligá-la por CSS sem perder a margem nas páginas seguintes. Recomenda-se desmarcá-la ao imprimir.
- Não foi impresso em impressora física nem testada a impressão por outros navegadores (Edge, Firefox, Safari).
- Não há como converter PDF em imagem neste ambiente; a inspeção de layout foi geométrica/textual (páginas, primeiras e últimas linhas, estouro lateral) e não visual. Os PDFs estão disponíveis para conferência visual.
- O estado "erro do motor" foi provocado de forma real na aplicação (falha injetada que o motor lê), mas não há como disparar esse estado pela interface normal.
- Seções do anexo não se partem: quando uma seção não cabe, vai inteira para a página seguinte, deixando espaço em branco no fim da anterior (ex.: página 1 do S3).

## 9. Pendências clínicas

1. Gravidade dos alertas de alergia (crítico se confirmada, atenção se não confirmada) segue sem aprovação clínica; não foi alterada.
2. Alergia a **classe** continua sem avaliação molecular: exige decisão e fonte antes de qualquer regra de reatividade cruzada.
3. Se alergias não medicamentosas (alimento, ambiental) devem ser cruzadas com excipientes: hoje não são, e isso é declarado.
4. Necessidade de regras de segurança específicas por faixa etária pediátrica/neonatal.
5. Limites de validade (0–120 anos, 0–500 kg) e limiar de idoso (65 anos).

## 10. Riscos residuais

- Quem usar o comando de imprimir anexo e entregar o papel ao paciente expõe o anexo; a proteção é de processo (comando separado e rotulado "uso exclusivo do prescritor"), não técnica.
- Dados de paciente e alergias da tela não persistem; uma recarga perde tudo e exige reentrada.
- Dados do paciente de uma sessão podem permanecer ao carregar protocolo de outro paciente (aviso exibido, sem limpeza automática).
- Idade fracionária em anos é frágil para neonatos (ex.: digitar "28" achando que são dias).
- Protocolos antigos com nomes de variantes ficam em avaliação parcial até reselecionar o medicamento.

## 11. Confirmações

- **RM-106:** não foi iniciada.
- **Commit, push e deploy:** não houve. O HEAD continua em `b36c639`; os relatórios regenerados pelo build foram restaurados com `git checkout`.
