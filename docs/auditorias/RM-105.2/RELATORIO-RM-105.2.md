# RM-105.2 — Alergias, avaliação contextual e anexo técnico exclusivo do prescritor (opção B)

Estado: implementada e verificada tecnicamente. **Sem commit, push ou deploy. RM-106 não iniciada.** Aprovação técnica não é homologação clínica.

## 1. Estado inicial do repositório

Branch `main`, commit `b36c639`. Havia alterações locais não commitadas das RM-104, RM-105 e RM-105.1 (todas preservadas). Lidos os relatórios RM-104, RM-105 e RM-105.1 e inspecionados `runSafetyCheck`, `safety-targets.ts`, `RxItem`/`entidade_id`, a tela de prescrição e a impressão.

Achados do diagnóstico que orientaram o desenho:
- A tela de prescrição rápida **não tinha campo de alergias**; a anamnese completa tem (`Allergy`), mas nenhuma regra as consumia.
- Gestante/lactante eram `Switch` booleanos (padrão `false` sempre enviado como "informado"); a idade vazia virava `Number('') >= 65` = "não idoso". Ou seja, ausência era lida como "não".
- Não havia nenhum CSS de impressão: `window.print()` imprimia a página inteira; só os controles tinham `print:hidden`. A `PrintPreview` era um modal `fixed` com `max-h-[90vh]`.
- Persistência: só os **favoritos** (`localStorage`, `prescreve-ai-favoritos`) guardam itens (`RxItem[]`, agora com `entidade_id`). Dados do paciente, alergias, resultado da avaliação e anexo **não são persistidos**.

## 2. Arquivos alterados

Novos: `lib/safety-allergy.ts`, `lib/safety-annex.ts`, `components/modules/ReceitaPaciente.tsx`, `AnexoTecnicoPrescritor.tsx`, `PrescriptionPrintPreview.tsx`, `tests/rm1052-alergias-contexto-e-anexo-tecnico.test.tsx` (69 testes).
Alterados: `lib/safety-rules.ts`, `lib/safety-context.ts`, `lib/safety-coverage.ts`, `lib/safety-targets.ts` (só exporta `componentesDeNome`), `app/prescricao-rapida/page.tsx` (função `PrintPreview` removida, tri-state, bloco de alergias), `app/globals.css` (bloco de impressão), `tests/cj-009-…`, `tests/rm104-…`, `tests/rm105-…`.
Não alterados: doses, contraindicações, posologias, severidade das regras existentes, matriz de interações, catálogo, identidade molecular da RM-105.1, dados de sinônimos.

## 3. Arquitetura

```
runSafetyCheck(input + alergias + idade_anos + peso_kg + sexo)
   ├─ avaliação molecular (RM-104/105/105.1, inalterada)
   ├─ avaliarAlergias()  → avaliacao_alergias + alertas tipo 'alergia'
   ├─ avaliarCoberturaContextual() → estados + pendências + incoerências
   └─ avaliacao_integral = cobertura molecular completa E contextos exigidos avaliados
safety-annex.ts (puro) → AnexoTecnico  → AnexoTecnicoPrescritor  (parte 2, nova página)
ReceitaPaciente (sem acesso ao motor)                             (parte 1)
PrescriptionPrintPreview: portal em <body> (#print-root) + CSS @media print
```
O resultado ganhou `avaliacao_alergias` e `versao_contrato` (`RM-105.2`).

## 4. Contrato de avaliação de alergias

Entrada: `alergias?: { status: 'nao_informado' | 'sem_alergias_conhecidas' | 'informadas'; registros?: RegistroAlergia[] }`. Campo ausente = `nao_informado`. Não há booleano.
Registro: `substancia`, `tipo`, `gravidade`, `reacao`, `origem`, `registrado_em`, `entidade_id` (todos opcionais exceto substância; nada é inventado).

Estados (`avaliacao_alergias.estado`): `nao_informado`, `ausencia_informada` (declaração, não verificação), `avaliada`, `parcial`, `invalida`, `nao_avaliada` (erro).
Identificação do alérgeno por registro: `confirmada`, `nao_confirmada`, `classe_farmacologica`, `desconhecida`, `nao_aplicavel` (não medicamentosa). Uma alergia sem identificação molecular **nunca** vira molecularmente confirmada.

Cruzamento (só por identidade molecular: mesma molécula, ou o alérgeno é componente de uma combinação prescrita):
| Resultado | Quando | Efeito |
|---|---|---|
| `correspondencia_molecular` | identificação confirmada | alerta `alergia`, crítico, confirmado |
| `correspondencia_nao_confirmada` | mesma molécula, alérgeno não confirmado | alerta de atenção, **não confirmado** |
| `sem_correspondencia_molecular` | moléculas distintas | sem alerta; a mensagem diz que a reatividade cruzada não foi avaliada |
| `nao_conclusivo` | alérgeno desconhecido/classe/ambíguo; combinação sem componente definido; **medicamento não identificado** | sem alerta; estado geral `parcial` |

Não existe regra de reatividade cruzada nesta versão. Alergias a classe (ex.: "AINE") não viram molécula e ficam não conclusivas.

## 5. Estados dos contextos

Mantidos: `informado`, `nao_informado`, `nao_aplicavel`, `invalido`, `nao_avaliado`. Cada item agora tem `exigido` e há lista de `inconsistencias`.
- Gestação/lactação: tri-state na tela (`Não informado` / `Não` / `Sim`); vazio vira `undefined`. Informada para sexo masculino → `invalido`.
- Idade: `idade_anos` validada (0–120) deriva o indicador geriátrico da regra existente; ausente nunca vira "não idoso"; idade e `idoso` contraditórios → `invalido`.
- Peso: validado (0–500 kg), **não exigido** (nenhuma regra de segurança o usa); inválido é listado como incoerência.
- Função renal e potássio (só com antagonista de aldosterona): como antes.
- Alergias: derivadas da avaliação acima (`ausencia_informada`/`avaliada` → informado; `parcial` → não avaliado).
Os limites 0–120 anos e 0–500 kg são **limites de validade de entrada** (detectar erro de digitação/unidade), não critérios clínicos.

## 6. Avaliação integral

`avaliacao_integral = verificacao_completa && cobertura_contextual.completa`. Só é verdadeira com todas as moléculas identificadas e todos os contextos **exigidos** informados e válidos (inclusive alergias avaliadas ou ausência explicitamente informada). Testes derrubam a condição um campo por vez (gestação, lactação, idade, função renal, alergias; potássio com ARM) e com cobertura molecular parcial ou alergias não conclusivas. Mesmo verdadeira, a mensagem diz "não equivale a validação clínica".

## 7. Receita e anexo (opção B)

- **Parte 1** `ReceitaPaciente`: markup idêntico ao anterior; não recebe nem importa nada do motor (teste lê o código-fonte e falha se importar).
- **Parte 2** `AnexoTecnicoPrescritor`: título `ANEXO TÉCNICO — USO EXCLUSIVO DO PRESCRITOR`, aviso "não se destina ao paciente", 9 seções: identificação (data/hora e versão do contrato), situação, identificados, não identificados, combinações não avaliadas, alertas (gravidade, origem, estado de confirmação), contextos, alergias, limitações. Alerta que depende de entrada não verificada é rotulado **NÃO confirmado**.
- Linguagem descritiva; teste varre todos os cenários contra "prescrição segura/liberada/sem riscos/certificada".
- Erro do motor: anexo mostra "Erro de avaliação", "NÃO é uma avaliação sem alertas" e "Alertas indisponíveis". A impressão **não é bloqueada** (comportamento anterior preservado).
- Caixa "Incluir anexo técnico do prescritor na impressão" (marcada por padrão, só na tela) permite imprimir só a receita.
- CSS (`globals.css`): `@page A4`, oculta tudo fora de `#print-root`, `break-before: page` no anexo, seções sem quebra interna.

## 8. Evidências de separação

- Testes: o texto da `ReceitaPaciente` não contém nenhum dos 24 termos técnicos; receita e anexo são irmãos sem contenção mútua, com o anexo depois; o aviso de tela não está em nenhuma das partes; desmarcar o anexo remove-o e a receita permanece byte a byte igual.
- Navegador: texto da via do paciente sem nenhum termo técnico; `#print-root` filho de `<body>`; com o anexo desmarcado, `data-print-annex="off"` e receita idêntica.

## 9. Testes

Novos: 69 (`rm1052-…`): estados e valores ambíguos de alergia, mesma molécula, nome comercial, componente de combinação, não confirmada, desconhecida, classe, medicamento sem identificação, registros inválidos (7 tipos), vários medicamentos × vários registros, contextos ausentes/inválidos/incoerentes, parcial × integral, erro do motor, conteúdo do anexo, separação, CSS, tela.
Ajustados por mudança intencional (justificada): `rm105` (alergias sem informação passam de `nao_avaliado` para `nao_informado`), `rm104` (pré-visualização extraída para componentes), `cj-009` (gestante/lactante deixam de ser switches).
Resultado: **87 arquivos, 1.652 testes passando** (antes: 86 / 1.583).

## 10. TypeScript, lint e build

`tsc --noEmit` exit 0; `npm run lint` exit 0 sem avisos; `npm run build` exit 0 (50/50 páginas). Os relatórios regenerados pelo build foram restaurados.

## 11. Testes visuais (navegador embutido, servidor de desenvolvimento)

| Item | Resultado |
|---|---|
| Receita sem anexo | OK (caixa desmarcada) |
| Receita com anexo | OK (receita, separador tracejado, anexo titulado) |
| Com alertas | OK (Varfarina + AINE, crítico; marcado "baseado em moléculas identificadas") |
| Avaliação parcial | OK via protocolo antigo: aviso na tela, anexo "cobertura parcial", combinação não avaliada |
| Alergia registrada | OK (alerta "Alergia registrada: Ibuprofeno × ibuprofeno", alergias saem das pendências) |
| Contexto não informado | OK (gestação, lactação, função renal listados como NÃO informado) |
| Persistência e protocolo antigo sem `entidade_id` | OK: protocolo novo grava `entidade_id`; o antigo foi recuperado sem perder itens, `parcial`, Midazolam com 3 variantes listadas |
| A4, quebra de página, isolamento | **Emulação, não impressão real**: as 7 regras de impressão foram confirmadas carregadas no navegador, aplicadas como regras de tela em 794 px; `break-before: page` no anexo, resto da aplicação oculto, controles ocultos, sem cortes |
| Console | sem erros |

Defeito encontrado e corrigido: o `Select` exibia o valor cru (`nao_informado`) em vez do rótulo.

**Limitações da validação:** não houve impressão real nem exportação para PDF (as ferramentas disponíveis não a executam), então a quebra física de página e a paginação do anexo (cerca de 910 px de altura, mais que uma folha A4 com margens se houver muitos alertas) não foram vistas em papel/PDF. O estado "erro do motor" foi coberto por testes automatizados, não pelo navegador (não há como provocá-lo na interface). Os dados de teste inseridos no navegador foram removidos.

## 12. Fontes clínicas

Nenhuma fonte bibliográfica foi usada ou adicionada. As regras de alergia são de **identidade** (mesma molécula/componente), sem reatividade cruzada.

## 13. Pendências para validação de médicos ou farmacêuticos

1. A gravidade dos alertas de alergia (confirmada = crítico; não confirmada = atenção) é decisão de apresentação minha, sem fonte; precisa de aprovação clínica.
2. Se o cruzamento por componente de combinação (alergia a amoxicilina × amoxicilina + clavulanato) é aceitável como "mesma molécula".
3. Tratamento de alergias não medicamentosas (alimento, ambiental): hoje fora do cruzamento e **não bloqueiam** a avaliação integral, porque excipientes não são avaliados.
4. Reatividade cruzada (ex.: classes de antibióticos, AINEs): sem regra; exige decisão e fonte antes de qualquer implementação.
5. Limites de validade de idade (0–120) e peso (0–500 kg) e o limiar de idoso (65 anos, já usado pelo sistema).

## 14. Riscos residuais

- Dados do paciente e alergias da tela não são persistidos nem recuperados (só os itens dos favoritos). O anexo não é armazenado; fica dito nele.
- Quem deixar a caixa do anexo marcada imprime o anexo no mesmo documento: a separação depende de destacar a última página antes de entregar a via ao paciente. Mitigação: a caixa permite imprimir só a receita; a decisão de padrão (ligado/desligado) é sua.
- Protocolos antigos com nomes de variantes ficam `parcial` até reselecionar o medicamento (já documentado na RM-105.1).
- A verificação molecular e a de alergias dependem da identificação por nome/ID; marca não verificada fica "não confirmada".

## 15. Itens não implementados e justificativas

- Alergias na **anamnese completa** (`Allergy[]`) não foram ligadas ao motor: o fluxo de consulta não chama `runSafetyCheck`; ligar é outra etapa.
- Persistência das alergias do paciente/anexo no prontuário: não existe prontuário nesse fluxo; apenas documentado.
- Regras de reatividade cruzada: sem fonte documentada.
- Bloquear impressão em caso de erro: não implementado, por falta de aprovação.

## 16. RM-106

Não foi iniciada.

## 17. Commit, push e deploy

Não houve commit, push ou deploy.
