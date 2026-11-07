# RM-107.1.1 — Plano de contenção de riscos dos motores de dose

> **Fase de auditoria e planejamento. NADA foi implementado.** Nenhum código, dado farmacológico, regra clínica, tela, teste ou calculadora foi alterado. Nenhum commit, push ou deploy. **Nenhum problema abaixo foi resolvido.** Esta RM **não está concluída** só porque o plano existe: depende da sua autorização expressa e, nos pontos indicados, de aprovação clínica/farmacêutica/de governança (D1–D14 continuam **PENDENTES**).
> Não são escolhidas doses, idades mínimas, uso pediátrico de medicamentos, indicações, frequências, máximos ou contraindicações. Ausência de alerta **não** é indicação de segurança.
> Evidência: `[EXEC]` medido por execução em modo leitura (RM-107.1) · `[COD]` leitura de código (não executado) · `[DADO]` dado cadastrado. Referências: `docs/auditorias/RM-107.1/` (relatório, matriz D1–D14, inventário, evidências CSV/JSON).

## 0. Estado verificado
- Branch `main`, HEAD `b36c639`; 12 arquivos rastreados com alterações locais de etapas anteriores (RM-104 a RM-106.1) e vários arquivos novos não rastreados — **preservados**. Nenhum motor de dose, catálogo ou tela de dose consta como modificado.
- Relatórios RM-107.1 lidos (relatório, matriz D1–D14, inventário, comparativo, fontes, lacunas, registro de decisões, errata).

---

# FASE 1 — Auditoria de contenção (mapeamento; não presume que os casos da RM-107.1 sejam os únicos)

## 1.1 Caminhos que podem produzir dose adulta (ou dose não validada por idade) para paciente pediátrico
| ID | Caminho | Onde | Comportamento atual | Evidência |
|---|---|---|---|---|
| P-01 | Ramo adulto de `calcFullDose` quando `usarPediatrica` é falso (sem `dose_pediatrica`, `dose_por_kg ≤ 0` ou `usar_dose_pediatrica = false`) | `lib/dose-calculator.ts` (`calcFullDose`, ramo `else` "Dose adulto") ← `DoseCalcCard` ← `/prescricao-rapida` | calcula `parseFloat(habitual) × tomadas`; **sem alerta de idade**; 207 medicamentos × (neonato 14 d, lactente 6 m, criança 4 a) | `[EXEC]` `catalogo-dose-calculator-por-paciente.csv`, `inventario-D1-por-medicamento.csv` |
| P-02 | Regra pediátrica cadastrada mas **não utilizável** cai no mesmo ramo adulto | idem | 5 medicamentos: metformina (`dose_por_kg = 0`, cálculo `mg/dia`), salbutamol (`jatos`), budesonida (`mcg/dia (dose total)`), montelucaste (`dose fixa por faixa`), vitamina K1 neonatal (`dose fixa`) | `[EXEC]` |
| P-03 | **Adolescentes (< 18 a)**: `classifyPopulation` define `usar_dose_pediatrica = false` → sempre ramo adulto, mesmo existindo `dose_pediatrica` | `lib/dose-calculator.ts` (`classifyPopulation`) | 0 dos 20 medicamentos com regra pediátrica a usam aos 14 anos | `[EXEC]` |
| P-04 | **Confirmação manual de frequência** converte o bloqueio em dose aplicável | `DoseCalcCard.tsx` (estado `freqConfirmada`, botões por `tomadas_faixa`) → `calcFullDose(..., frequenciaConfirmadaTomadasDia)` | com frequência em faixa reconhecida, o 🚨 "BLOQUEADO" some após a confirmação e o botão "Aplicar esta posologia" é habilitado (`disabled={hasCritical}`); para pediátrico sem regra o resultado aplicado é a dose adulta | `[COD]`; 125 medicamentos (de 362) hoje bloqueiam por frequência indeterminada `[EXEC]`; o desfecho após confirmar **não foi executado** — **[a executar na implementação]** |
| P-05 | **Caminho manual** (idade e/ou peso ausentes): `selectDrug` define a dose padrão como `dose_adulto.habitual`; `addToRx` usa `dose_adulto.unidade`, `via` e `frequencias[0]` adultas, `duracao: '30 dias'` e forma `'Comprimido'` por padrão | `app/prescricao-rapida/page.tsx` (`selectDrug` ~l.282; `addToRx` l.310) | o botão "Adicionar à prescrição" aparece quando falta idade **ou** peso; a dose adulta entra no item sem qualquer estado de avaliação | `[COD]` |
| P-06 | **Cálculo pediátrico automático não condicionado à idade**: em `selectDrug`, `calcWeightDose` roda quando `peso` e `dose_pediatrica` existem, **sem testar a idade** | `page.tsx` ~l.296 | se houver peso sem idade (ou idade adulta), uma dose pediátrica por kg pode preencher `customDose` — **não executado** | `[COD]`; **[a confirmar por teste]** |
| P-07 | `applyDoseCalc` copia `via` adulta, `duracao` padrão (`'7 dias'` se `usar_dose_pediatrica`, senão `'30 dias'`) e mapa de frequência | `page.tsx` l.340–376 | valores padrão não vindos de regra clínica | `[COD]` |
| P-08 | **Motor A** (`/dosagem`): regras "adolescente + adulto" (20 regras), pediátrico 1–11 a sem idade mínima em metformina; amoxicilina com regra neonatal | `lib/dosing-engine.ts` | calcula nesses casos | `[EXEC]/[DADO]` |
| P-09 | **Motor B**: sem limite superior de idade em 30 de 32 indicações (devolve dose mg/kg para adulto de 70 kg) — **sem tela**; só validadores/simulações | `lib/pediatric-engine.ts` | n/a para UI hoje | `[EXEC]`; risco **latente** |
| P-10 | **Protocolos/favoritos e itens persistidos**: `RxItem.dose/frequencia/via/duracao` em texto, reaplicados sem recálculo | `page.tsx` (`aplicarProtocolo`, `localStorage 'prescreve-ai-favoritos'`); `PrescriptionPanel` → `DoseEstruturada` → backend | doses antigas voltam como se fossem atuais; `DoseEstruturada` persistida não tem estado de avaliação | `[COD]` |
Observação: P-01 a P-07 são os caminhos da **tela principal**; P-08 e P-09 dos outros motores. Não se afirma que haja outros; a varredura por `calcFullDose`, `calcWeightDose`, `calcularDosagem`, `calcDosePediatrica` encontrou consumidores apenas em `/dosagem`, `/prescricao-rapida` e `DoseCalcCard` `[COD]`.

## 1.2 Pontos de confirmação manual de frequência
- `DoseCalcCard.tsx`: `freqConfirmada` (estado local), exibido quando `result.frequencia_indeterminada && result.tomadas_faixa` (faixas reconhecidas como "3–4x/dia"); `calcFullDose(..., frequenciaConfirmadaTomadasDia)`. Para frequência indeterminada **sem** faixa reconhecida (PRN, contínuo, texto não reconhecido) não há confirmação: permanece bloqueado `[COD]`.
- Nenhum outro ponto de confirmação manual foi encontrado `[COD]`.

## 1.3 Medicamentos com `uso_pediatrico = nao_aplicavel`
- **66** no catálogo `[DADO]` (`catalogo-uso-pediatrico-vs-calculo.json`); o campo **não é consultado** por `calcFullDose`, `DoseCalcCard` nem pela página `[COD]`. Distribuição: 55 entre os 207 que calculam dose adulta sem bloqueio; 9 entre os 125 bloqueados por frequência; 2 entre os 30 sem dose numérica/alerta crítico; 0 entre os que têm `dose_pediatrica`.
- O comentário do tipo (`pharma-database.ts`) define `nao_aplicavel` como "sem indicação/uso pediátrico estabelecido **nesta base**"; a **ausência** da marca (152 dos 207) **não** significa uso permitido **nem** proibido: é informação ausente.

## 1.4 Regras pediátricas cadastradas, mas ignoradas
5 de 20 (P-02) e, **para ≥ 12 anos**, todas as 20 (P-03). Além disso, a faixa etária da regra pediátrica do catálogo é **texto livre** (20 de 20), **não aplicada** como limite `[DADO]`.

## 1.5 Pontos em que a apresentação escolhida é ignorada
| ID | Local | Comportamento |
|---|---|---|
| A-01 | `calcFullDose` (todos os ramos) | a concentração só entra em volume/gotas (`parseConcentration`); a **dose** não depende dela: 266/266 medicamentos com ≥ 2 concentrações `[EXEC]`; amoxicilina e amoxicilina + clavulanato demonstrados |
| A-02 | `page.tsx` (~l.847–849) caminho manual | ao trocar a concentração, se a dose ainda é a automática, `customDose` passa a ser a **força da apresentação** — comportamento **diferente** do caminho `DoseCalcCard` `[COD]` |
| A-03 | `getPreferredBrandForPatient/Concentration(drug, labPref, idadeAnos)` | escolha padrão de marca/concentração por idade, **sem vínculo com a dose** `[COD]` |
| A-04 | `calcFullDose`: `parseConcentration` pode retornar `tipo: 'desconhecido'` | resultado segue sem volume/gotas, **sem estado** de apresentação não interpretada `[COD]` |
| A-05 | `dosing-engine`: só 8 regras com `formulacao_ids`; `comprimidos_por_dose` fracionário sem arredondamento/alerta | `[DADO]/[COD]` |
| A-06 | `pediatric-engine`: formulação por faixa de peso/idade em texto | `[DADO]` |

## 1.6 Rótulos que sugerem validação ou recomendação
| ID | Local | Texto/sinal | Observação |
|---|---|---|---|
| L-01 | `app/dosagem/page.tsx:341` | "Dose/tomada validada" (selo verde quando não excede o máximo cadastrado) | significa apenas "não excede" |
| L-02 | `app/dosagem/page.tsx:342` | "Dose diária validada" | idem |
| L-03 | `app/dosagem/page.tsx` (blocos `diretriz`/`evidencia`, ~l.389–403) | exibe o texto declarado no dado; a "evidência" em verde | referência **não verificada** (candidata) |
| L-04 | `DoseCalcCard.tsx:205` | "Prescrição Sugerida" (cartão e ícone verdes sem alerta) | sem estado de validação/fonte |
| L-05 | `DoseCalcCard.tsx:352–356` | botão verde "Aplicar esta posologia" | habilitado exceto com 🚨 |
| L-06 | `page.tsx:372` | toast "dose calculada automaticamente" | idem |
| L-07 | `FullDoseResult.posologia_sugerida` | nome do campo | semântica de "sugestão" |
| — | `app/calculadoras/page.tsx` ("Conduta recomendada", "scores validados") | escores clínicos, **não** motores de dose | fora do escopo desta RM; não avaliado |
Nenhuma tela mostra **estado de validação**, **fonte** ou **ausência de fonte** da regra de dose `[COD]`.

## 1.7 Síntese da Fase 1
Os riscos existem em **três camadas independentes**: (i) seleção de regra (P-01–P-04, P-08, P-09), (ii) valores padrão do fluxo manual (P-05–P-07, P-10), (iii) apresentação e linguagem (A-01–A-06, L-01–L-07). **Os comportamentos permanecem ativos** até que implementação aprovada e testada os altere.

---

# FASE 2 — Proposta de contenção (sem implementar)

## 2.1 Estados explícitos (resultado de dose)
Campo **aditivo** `estado_avaliacao` no resultado (compatível com o contrato proposto na RM-107.1), com valores mutuamente exclusivos:
| Estado | Quando |
|---|---|
| `calculo_realizado_regra_nao_validada` | regra aplicável encontrada, cálculo concluído, regra **sem** validação clínica formal (situação de **todas** as regras atuais) |
| `regra_pediatrica_nao_cadastrada` | paciente pediátrico (critério técnico em 2.2) e nenhuma regra pediátrica para o medicamento |
| `regra_pediatrica_incompativel` | regra pediátrica existe mas é incompleta/não calculável (ex.: `dose_por_kg ≤ 0`, tipo de cálculo não suportado) |
| `apresentacao_nao_interpretada` | concentração não interpretável (`tipo: 'desconhecido'`) ou dose dependente de apresentação sem regra por apresentação |
| `calculo_incompleto` | dados necessários ausentes (peso, altura para mg/m², frequência indeterminada sem confirmação, idade) |
| `dados_invalidos` | idade sem unidade, peso ≤ 0 etc. |
| `avaliacao_especifica_necessaria` | adolescente (ver 2.5) |
| `bloqueado_por_seguranca` | 🚨 existente |
Os estados `*_validada*` **não existem** nesta fase: nenhuma regra recebe validação clínica.

## 2.2 Bloqueio sem regra aplicável e autorizada; proibição de fallback adulto
- Em paciente classificado como pediátrico pelo critério **técnico já existente** (`classifyPopulation`: `usar_dose_pediatrica`, hoje < 12 anos), **não** usar o ramo adulto. Sem regra pediátrica utilizável ⇒ `regra_pediatrica_nao_cadastrada`/`regra_pediatrica_incompativel`, `dose_por_tomada` e `dose_total_dia` **não calculadas**, botão "Aplicar" **desabilitado**, mensagem: "Regra pediátrica não cadastrada — cálculo não realizado. Avalie conforme a fonte apropriada. Não há validação clínica."
- **Não** se define aqui quais medicamentos podem ser usados em crianças; o bloqueio é por **ausência de regra**, independente do marcador `uso_pediatrico`.
- O marcador `uso_pediatrico = nao_aplicavel` (66) passa a ser **exibido** como informação ("o cadastro indica uso pediátrico não estabelecido nesta base"), **sem** concluir permissão/proibição. Seu uso como critério de decisão depende de D1.
- A confirmação manual de frequência (P-04) **não** libera dose para os estados acima.

## 2.3 Regra pediátrica incompatível/incompleta
Classificação técnica **objetiva** (sem escolher valores): `dose_por_kg ≤ 0`, `calculo` fora do conjunto que o motor sabe calcular, `max_dose_dia` ausente/zero, `frequencia_divisoes` inválida, unidade incoerente ⇒ `regra_pediatrica_incompativel`. Lista dos 5 casos atuais (P-02) incluída na documentação do estado; **nenhuma regra é corrigida**.

## 2.4 Apresentação não interpretada
- Se a concentração selecionada não puder ser interpretada **ou** o medicamento estiver marcado (após D10) como dependente de apresentação sem regra por apresentação ⇒ `apresentacao_nao_interpretada` / `calculo_incompleto`; sem volume/gotas apresentados como definitivos.
- Neutra e **imediata** (sem decisão clínica): o resultado informa que "a dose cadastrada **não** foi ajustada à apresentação selecionada" quando isso for o caso (A-01).
- Quais medicamentos dependem da apresentação: **decisão farmacêutica (D10)**; não é inferida.

## 2.5 Adolescentes (sem inventar critério de transição)
Alternativas **a deliberar (nenhuma escolhida)**: (a) estado `avaliacao_especifica_necessaria` sem dose automática; (b) manter o comportamento atual com aviso explícito de que a regra pediátrica não foi usada e de que não há critério de transição validado; (c) outra definida em D2. Até a decisão, a contenção técnica **não altera** quem recebe dose adulta; apenas **registra e exibe** o fato (limitação), a menos que D2 aprove (a).

## 2.6 Linguagem neutra
Substituir sugestões de validação por estados neutros, **sem cor de aprovação**: ex. "Dose calculada pela regra cadastrada — **não validada clinicamente**". Remover "validada", "sugerida", "recomendada", "segura" quando não houver validação formal registrada. O texto final e a política visual são **D13** (governança/produto); o plano propõe a estrutura (um rótulo derivado de `estado_avaliacao`), não a redação definitiva.

## 2.7 Registro das limitações de avaliação
Lista de limitações no resultado e no anexo técnico (padrão `limitacoes_conhecidas` da RM-105.2.2): regra sem fonte; regra não validada; apresentação não considerada na dose; ajuste renal/hepático apenas textual; classificação etária técnica (não validação); valores padrão de duração/via/forma não clínicos; idade pós-menstrual e peso ao nascer não considerados.

---

# FASE 3 — Proposta de implementação (por alteração)
**Legenda:** **[T]** técnica possível sem nova decisão clínica (comportamento neutro/aditivo) · **[D]** depende de decisão profissional/governança (item D1–D14 indicado). Nenhuma será implementada sem sua autorização expressa; as **[D]** também exigem a aprovação formal indicada.

| ID | Alteração | Tipo | Arquivos / funções | Comportamento atual → pretendido | Riscos de regressão | Testes unitários | Testes de integração | Testes de interface | Rollback | Dependência |
|---|---|---|---|---|---|---|---|---|---|---|
| C-01 | Campo `estado_avaliacao` e `limitacoes` no resultado (aditivo) | **[T]** | `lib/dose-calculator.ts` (`FullDoseResult`, `calcFullDose`); novo módulo de limitações | sem estado → estado + limitações preenchidos **sem** mudar valores | consumidores que desestruturam o resultado; snapshots | estado por cenário sintético; valores numéricos idênticos ao legado | `DoseCalcCard` recebe estado | exibição do estado | remover campos (aditivos) / flag | nenhuma |
| C-02 | Bloquear dose adulta em pediátrico (critério técnico atual) sem regra pediátrica | **[D]** D1 (+ D3 para definir "pediátrico") | `calcFullDose` (ramo adulto), `DoseCalcCard` (`disabled`) | calcula dose adulta → `regra_pediatrica_nao_cadastrada`, sem dose | muda comportamento de 207+ medicamentos; testes `dose-calculator-unit-audit`, `rm52`, `rm53`, `clinical-journey-rm64` | sem regra ⇒ nenhuma dose; com regra ⇒ idêntico ao legado; fronteira de idade | fluxo pediátrico sem/com regra até o item da receita | botão desabilitado e mensagem | flag `CONTENCAO_PED_SEM_REGRA` desligada | **D1 aprovada formalmente** |
| C-03 | Estado para regra pediátrica incompatível (5 casos) | **[D]** D1 | `calcFullDose` (`usarPediatrica`) | cai no ramo adulto → `regra_pediatrica_incompativel` | metformina/salbutamol/budesonida/montelucaste/vit. K1: mudam para estado sem dose | cada tipo de incompatibilidade; regra sintética válida segue calculando | catálogo inteiro: lista de mudanças = exatamente os 5 | mensagem | flag | D1 (e eventual correção de dados = decisão profissional, **fora** desta RM) |
| C-04 | Frequência confirmada não libera dose em estados bloqueados | **[D]** D1 | `DoseCalcCard` (`freqConfirmada`), `calcFullDose` | confirmar libera dose adulta → confirmar só atua em estado `calculo_incompleto` por frequência | altera RM-84 (testes do parser/frequência) | confirmação em regra válida segue funcionando | pediátrico sem regra + confirmação ⇒ continua bloqueado | botão permanece desabilitado | flag | D1 |
| C-05 | Corrigir caminho manual: não preencher dose adulta nem calcular dose pediátrica sem idade informada | **[D]** D1 (**[T]** para o gate de idade ausente em P-06, após confirmar o comportamento por teste) | `page.tsx` (`selectDrug`, `addToRx`) | dose adulta padrão e `calcWeightDose` sem idade → exigir idade/peso; item sem avaliação não entra como "calculado" | muda UX do fluxo manual; testes `cj-009-prescricao-rapida-dispatch` | gate de idade; ausência de peso/idade | fluxo completo sem idade | botão/mensagem | flag | D1; confirmação de P-06 por teste de caracterização |
| C-06 | Apresentação não interpretada / não considerada | **[T]** (detecção e aviso neutro) + **[D]** D10 (medicamentos dependentes) | `calcFullDose` (`parseConcentration`), `DoseCalcCard` | sem estado → `apresentacao_nao_interpretada` quando `tipo:'desconhecido'`; aviso "dose não ajustada à apresentação" | alerta em excesso (266 medicamentos) — avaliar fadiga | conc. desconhecida; conc. válida sem mudança de dose | fluxo com troca de concentração | aviso | flag | aviso neutro **[T]**; dependência por medicamento **D10** |
| C-07 | Rótulos neutros no `DoseCalcCard` e em `/dosagem` | **[D]** D13 (estrutura **[T]**) | `DoseCalcCard.tsx` (L-04–L-06), `app/dosagem/page.tsx` (L-01–L-03) | "Prescrição Sugerida"/"…validada"/verde → rótulo derivado de `estado_avaliacao`, sem verde | testes de componente existentes; i18n | mapeamento estado→rótulo; **nenhum** estado produz "validada" | n/a | captura/teste: ausência de "validada/sugerida/recomendada" e de cor de aprovação | reverter rótulos | **D13 aprovada** (texto e política) |
| C-08 | Adolescente: registrar/mostrar limitação (e, se D2 aprovar, estado) | **[T]** (registro/aviso) + **[D]** D2 (qualquer mudança de cálculo) | `calcFullDose`, `classifyPopulation` (sem alterar), `DoseCalcCard` | sem aviso → limitação visível; cálculo inalterado | nenhuma alteração de dose | limitação presente para 12–17 a | fluxo adolescente | aviso | flag | aviso **[T]**; cálculo **D2** |
| C-09 | Valores padrão não clínicos (duração `'30 dias'/'7 dias'`, via adulta, forma `'Comprimido'`) | **[D]** produto/clínica | `page.tsx` (`addToRx`, `applyDoseCalc`) | preenchidos silenciosamente → marcados "não informado/padrão não validado" ou exigidos | altera preenchimento; protocolos | campo marcado; item não "completo" sem confirmar | receita gerada | indicação no item | flag | decisão de produto/clínica (a registrar; não está em D1–D14 → **sugerir inclusão**) |
| C-10 | Itens persistidos/protocolos: marcar "calculado por motor legado, sem estado de avaliação" | **[D]** governança | `page.tsx` (`aplicarProtocolo`), `PrescriptionPanel`, `DoseEstruturada` | reaplicados como atuais → marca de origem | compatibilidade com backend | marca presente | carregar protocolo antigo | aviso | remover marca | governança (compatibilidade) |
| C-11 | `/dosagem` (motor A): rótulos e limitações; **sem** mudar regras (idade mínima/adolescente dependem D2/D4) | **[T]** rótulos/limitações; **[D]** regras | `app/dosagem/page.tsx` | idem C-07/C-08 | baixo | idem | idem | idem | reverter | D13 (rótulos) |
| C-12 | Motor B: registrar limite superior de idade ausente como limitação (sem tela) | **[T]** documental | `pediatric-engine.ts` (não alterar regras) | n/a | nenhum | n/a | n/a | n/a | n/a | D4/D9 para regras |

## 3.1 Estratégia geral de testes
1. **Caracterização antes de mudar** (linha de base): reexecutar as sondas da RM-107.1 (70 casos + catálogo × 5 pacientes) e fixar o resultado atual como "não é prova de correção".
2. **Diferença aprovada:** toda mudança entre legado e novo deve estar na lista aprovada (C-02/C-03: exatamente os grupos D1-1 e D1-5; demais idênticos).
3. **Testes com regras sintéticas** para aritmética e estados (nenhuma dose clínica esperada).
4. **Interface:** validação visual real da tela (padrão RM-106.1), incluindo ausência de "validada/sugerida/recomendada" e de verde de aprovação.
5. **Regressão:** suites existentes de C (`dose-calculator-unit-audit`, `dose-calculator-frequencia-parser`, `rm52`, `rm53`, `rm64`, `rm66`, `rm10521`, `rm10522`, `dose-estruturada-contrato`) e A/B.

## 3.2 Rollback
Cada alteração atrás de **flag por consumidor** (padrão: desligada até aprovação), campos novos **aditivos/opcionais**, nenhuma migração de dados; reverter = desligar flag ou reverter commit específico (nenhum commit sem sua autorização). Dados farmacológicos **não** são alterados em nenhuma etapa.

---

# FASE 4 — Critérios de aceite: como cada risco será impedido (a ser demonstrado só após implementação e testes)
| # | Risco | Mecanismo proposto | Prova exigida | Situação |
|---|---|---|---|---|
| 1 | Dose adulta automática em pediátrico sem regra | C-02, C-03, C-04, C-05 | teste: nenhum dos 207+125+30+5 produz dose/aplicação em pediátrico; catálogo inteiro; fluxo manual | **não resolvido** (plano) |
| 2 | Cálculo com regra pediátrica incompatível | C-03 | os 5 casos viram estado sem dose; regra válida inalterada | **não resolvido** |
| 3 | Cálculo com apresentação não interpretada | C-06 | `tipo:'desconhecido'` ⇒ estado; aviso quando dose não ajustada | **não resolvido** |
| 4 | Falsa sinalização de dose validada | C-07, C-11 | nenhum estado produz "validada/sugerida/recomendada"/verde sem validação formal; captura de tela | **não resolvido** |
| 5 | Resultado incompleto liberado como prescrição calculada corretamente | C-01, C-04, C-05, C-09, C-10 | item da receita só recebe dose com `calculo_realizado_*`; incompleto exige confirmação/rotulagem; padrões marcados | **não resolvido** |
**Nenhum destes problemas foi resolvido; todos continuam existentes.**

---

# Separação: o que é técnico × o que depende de profissionais
| Técnico possível (sem decisão clínica nova) | Depende de decisão profissional/governança |
|---|---|
| C-01 estados/limitações (aditivos); detecção de apresentação não interpretada (C-06 parte T); aviso de adolescente/limitações (C-08 parte T); C-11/C-12 rótulos/limitações (estrutura) | **D1** (bloquear/exigir confirmação; uso do marcador `uso_pediatrico`) → C-02, C-03, C-04, C-05 |
| Testes de caracterização e sondas | **D2** (adolescente), **D3** (quem é "pediátrico"), **D4** (idades mínimas) |
| Marca de origem em itens persistidos (estrutura) | **D10** (quais medicamentos dependem da apresentação) |
| | **D13** (texto e política visual) → C-07 |
| | **Produto/clínica** (valores padrão de duração/via/forma — C-09; **sugestão de incluir como nova decisão no registro**) |

# Pendências e limitações do plano
- P-04 (desfecho após confirmar frequência) e P-06 (cálculo pediátrico sem idade) estão **[COD]**: devem ser **confirmados por teste de caracterização** antes de qualquer correção.
- Varredura de rótulos limitou-se a `/dosagem`, `/prescricao-rapida`, `DoseCalcCard`, `PrescriptionPanel` e `calculadoras` `[COD]`; outros módulos especializados (D14) não foram avaliados.
- Não foi avaliada a relevância clínica de nenhum caso; nenhuma fonte foi consultada.
- **RM-107.1.1 não está concluída.** Aguardo sua autorização expressa para (a) implementar apenas as alterações **[T]**, e/ou (b) aguardar aprovação formal de D1/D2/D3/D4/D10/D13 antes das alterações **[D]**.
