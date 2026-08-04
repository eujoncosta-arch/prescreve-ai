# Legenda — `RM-67-metrics-spreadsheet.csv`

Uma linha por (participante × tarefa) — 11 linhas por participante (T1–T11).
O arquivo modelo já vem com as 11 linhas de `P01`; duplicar o bloco para
`P02`...`P10` (ou quantos participantes a rodada tiver) ao abrir em uma
planilha (Excel/Google Sheets/LibreOffice).

| Coluna | Tipo/valores válidos | Preenchido a partir de |
|---|---|---|
| `sessao_codigo` | `P01`, `P02`, ... — nunca nome do participante | Termo de orientação |
| `especialidade` | texto livre curto (ex.: "clínica médica", "cardiologia") | Ficha de observação, cabeçalho |
| `tempo_pratica` | `residente` / `<5anos` / `5-15anos` / `>15anos` | Ficha de observação, cabeçalho |
| `tarefa` | `T1`...`T11` (ver seção 6 do protocolo principal) | — |
| `concluiu` | `sim_sem_ajuda` / `sim_1_dica` / `sim_ajuda_significativa` / `nao_concluiu` | Ficha de observação, por tarefa |
| `tempo_segundos` | número inteiro | Cronômetro, ficha de observação |
| `num_erros` | número inteiro | Ficha de observação |
| `num_pedidos_ajuda` | número inteiro | Ficha de observação |
| `interpretacao_incorreta` | `sim` / `nao` | Ficha de observação |
| `confianca_indevida` | `sim` / `nao` — **métrica crítica, nunca deixar em branco** | Ficha de observação + entrevista |
| `abandono` | `sim` / `nao` | Ficha de observação |
| `gravidade_problema_ux` | `nenhum` / `baixo` / `medio` / `alto` / `critico` | Ficha de observação, seção 11 do protocolo |
| `descricao_problema` | texto livre | Ficha de observação |

## Fórmulas de agregação sugeridas (ao consolidar em planilha)

- **Taxa de conclusão por tarefa** = contagem de `concluiu` ∈
  {`sim_sem_ajuda`, `sim_1_dica`} ÷ total de participantes daquela tarefa.
- **Tempo médio por tarefa** = média de `tempo_segundos`, agrupado por
  `tarefa` (calcular também a mediana — tempos de usabilidade costumam ter
  outliers que distorcem a média).
- **Taxa de confiança indevida** = contagem de `confianca_indevida = sim` ÷
  total de linhas — reportar tanto agregado quanto por tarefa (uma tarefa
  concentrando a maioria dos casos é um achado por si só).
- **Problemas críticos únicos** = contagem de combinações únicas de
  (`tarefa`, `descricao_problema`) com `gravidade_problema_ux = critico` —
  não contar o mesmo problema relatado por vários participantes como
  problemas distintos; contar quantos PARTICIPANTES o reproduziram como uma
  métrica separada de recorrência.

Estas fórmulas alimentam diretamente a seção de métricas do
`RM-67-report-template.md`.
