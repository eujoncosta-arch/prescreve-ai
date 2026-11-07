# RM-107.1 — Auditoria comparativa e desenho do contrato unificado dos engines de dosagem

> **RM de auditoria e especificação. Nenhuma unificação foi implementada.** Nenhuma dose, posologia, intervalo, limite etário, regra clínica, calculadora, catálogo ou contraindicação foi alterado; nenhum engine foi tocado (`git status` vazio para `dosing-engine`, `dose-calculator`, `pediatric-engine`, `pharma-database*`, `pharma-core`).
> Nenhuma divergência foi resolvida por conveniência técnica: não se escolheu a maior, a menor, a mais frequente, a do engine mais completo nem a da tela principal. Toda dose "correta" é **pendência clínica**.
> **Aprovação técnica ≠ validação clínica ≠ homologação regulatória.**
> Estado: branch `main`, HEAD `b36c639`, alterações locais das RM-104 a RM-106.1 preservadas. Sem commit, push ou deploy. **RM-107.2 não iniciada.**

## Resumo executivo (o que exige atenção antes de qualquer unificação)
1. **A tela principal (`/prescricao-rapida`) usa só o `dose-calculator` + catálogo `QuickDrug`.** O `dosing-engine` alimenta apenas `/dosagem`; o `pediatric-engine` **não tem nenhuma tela** (só validadores, simulações e testes). "Unificar" muda, na prática, o comportamento da tela principal.
2. **Achado de segurança (não corrigido): para os 362 de 382 medicamentos sem `dose_pediatrica` no catálogo, o `dose-calculator` aplica a dose adulta a neonatos e crianças e não emite nenhum alerta de idade** (alertas próprios do medicamento, quando existem, continuam aparecendo; o comportamento foi medido em 3 medicamentos e decorre do mesmo caminho de código para todos). Exemplos medidos: cefalexina 500 mg 6/6 h para 3,5 kg/14 d; SMZ-TMP 800 mg 12/12 h para 3,5 kg; metformina 850 mg para 4 anos. Os outros dois engines bloqueiam ou calculam por kg nesses casos. Recomendo que o responsável decida se isso merece tratamento **antes** da RM-107.2 (ver Decisão D1).
3. **Bloqueio etário divergente (dipirona):** aos 60 dias/5 kg, o `dosing-engine` bloqueia (contraindicada < 90 dias), o `pediatric-engine` bloqueia (≥ 3 meses) e o `dose-calculator` **calcula 50 mg por tomada sem alerta**.
4. **O `dose-calculator` ignora a apresentação escolhida** (amoxicilina e amoxicilina + clavulanato dão 875 mg 12/12 h com 500 mg selecionado); a RM-100 corrigiu só o `dosing-engine`.
5. **Rótulos de validação sem lastro:** `/dosagem` exibe "Dose/tomada validada" e "Dose diária validada" (significa apenas "não excede o máximo"); `DoseCalcCard` pinta de verde e rotula "Prescrição Sugerida" qualquer resultado sem alerta, sem mostrar fonte ou status de validação.
6. **Fontes:** 0 das 402 linhas do catálogo têm fonte; 37 de 54 regras do `dosing-engine` citam uma diretriz agregada em texto; as 32 do `pediatric-engine` listam fontes em texto. **Nenhuma fonte foi verificada contra o documento original** nesta RM (ver §6).
7. Não existe ID comum entre os engines e o catálogo (3 grafias para SMZ-TMP; 2 para amoxicilina + clavulanato) e os validadores existentes (`cross-database`, `data-integrity`) **não comparam doses numéricas entre engines** (usam rótulos de texto "(regra de cálculo de dose)").

---

## 1. Inventário dos engines

### 1.1 Os três mecanismos
| | A — `dosing-engine` (794 l.) | B — `pediatric-engine` (1.201 l.) | C — `dose-calculator` (1.083 l.) + catálogo |
|---|---|---|---|
| Fonte de dados | `MEDICAMENTOS_DOSAGEM`: 18 medicamentos, 54 regras | `PEDIATRIC_DOSES`: 21 medicamentos, 32 indicações | **Não tem dados próprios**: usa `QuickDrug` (382 entidades; 20 com `dose_pediatrica`; 364 com ajuste renal; 382 com ajuste hepático) |
| Função de cálculo | `calcularDosagem(peso, altura, idadeDias, med, formulacaoId)` | `calcDosePediatrica(drugId, paciente, indicacao?)` | `calcFullDose(drug, idadeAnos, peso, concentração, crcl?, childPugh?, gestante?, lactante?, altura?, freqConfirmada?)` |
| Idade (unidade) | dias | meses (cronológica; ou corrigida se IG + dias pós-natais) | anos (float) |
| População | `detectarPopulacao(dias)`: neonato < 28 d; lactente < 365 d; pediátrico < 12 a; adolescente < 18 a; adulto < 65 a; geriátrico | sem baldes: `idadeMinMeses/idadeMaxMeses` por indicação; `idadeCorrigida` p/ prematuros (IG + pós-natal) | `classifyPopulation(anos)`: neonato < 28/365; lactente < **2 a**; pré-escolar < 6; escolar < 12; adolescente < 18; adulto; idoso ≥ 65 |
| Estrutura da regra | `RegraDoagem`: populações[], dose, unidade, `frequencia_horas`, máx. por tomada/dia, mín. por tomada, via, indicação, `formulacao_ids`, `contraindicado_em`, `contraindicado_ate_dias`, flags renal/hepático | `PediatricDoseEntry.indicacoes[]`: `doseMgKg`/`doseMgKgDia`/`doseMcgKg`/`doseMgM2`/`doseFixa` (faixas tipadas), frequência **texto** + `divisoes`, `maxDoseMg`, `maxDoseMgKgDia`, idade mín./máx., `fontes[]`, `maxDoseMgKgDiaPendenteValidacao` | `dose_adulto` (habitual **string**, `max` string, unidade, via, `frequencias[]` texto) e `dose_pediatrica` (`calculo` texto, `dose_por_kg`, `frequencia_divisoes`, `max_dose_dia`, `faixa_etaria` **texto livre**) |
| Semântica da unidade | por tomada, **exceto** `mg/kg/dia` (RM-103) | `doseMgKg` por tomada; `doseMgKgDia` por dia | depende do campo `calculo` (`mg/kg/dose` por tomada; padrão = por dia); `habitual` adulto por tomada |
| BSA | Mosteller | Mosteller e DuBois | delega a A (Mosteller) |
| Concentração → mL/gotas/comprimidos | por formulação cadastrada (`concentracao_mg`, `volume_ref_mL`, `gotas_por_mL` **obrigatório** p/ gotas, RM-36) | texto (`formulacoes[].concentracao`, "1 gota = 10 mg") | `parseConcentration`/`convertDose`; gotas só com `mg_por_gota` explícito |
| Arredondamento | nenhum no valor; gotas `Math.round` | nenhum no valor; `toFixed(0)` na exibição | `Math.round(x·10)/10` |
| Máximos | por tomada e por dia (mg); `excede_*` calculado sobre o valor bruto | por tomada (mg) e por kg/dia | pediátrico: máx. diário (mg ou /kg); **adulto: `max` apenas exibido, não aplicado** (152 de 382 sem período declarado) |
| Frequência | numérica (horas) | texto + `divisoes` | texto interpretado por `parseFrequencia`; faixa/PRN/contínuo ⇒ **bloqueio até confirmação** (RM-84) |
| Duração | não existe | não existe | não existe (só `PrescriptionItem.duracao` em texto livre) |
| Ajuste renal | flag booleana (10 de 54 regras) — não calcula | não há (`calcClCrSchwartz` sem chamadores) | texto por faixa de TFG (364/382), exibido como alerta; `calcCrCl` Cockcroft-Gault |
| Ajuste hepático | flag (1 de 54) | não há | texto Child-Pugh A/B/C (382/382), só alerta |
| Contraindicações/bloqueios | `contraindicado_em` (populações) e `contraindicado_ate_dias` (3 regras); sem posologia ⇒ `ok:false` | idade mín./máx. ⇒ alerta 🚨; `contraindPediatrica` (texto) | alertas gestação/lactação, `alertas_especiais` que começam com ⚠/🚨; **`contraindicacoes_rapidas` não são usadas no cálculo**; bloqueio só por altura ausente (mg/m²) e frequência indeterminada |
| Marcação de validação | `diretriz`/`evidencia` em texto (37/54) | `fontes[]` em texto (32/32); **1** pendência declarada (domperidona) | nenhuma |

### 1.2 Funções auxiliares e módulos adjacentes
- **A**: `detectarPopulacao`, `idadeDias(anos, meses, dias)` (**mês = 30 d**), `labelPopulacao`, `calcularBSA`, `buscarMedicamento`, `getMedicamentoById`, `isDoseCalculavel`, `getDoseIndisponivelMsg`, `formatarDose/Volume`.
- **B**: `calcBSA/calcBSADuBois`, `calcIdadeCorrigida`, `calcClCrSchwartz` (sem chamadores), `validarFaixasDoseFixa` (valida no carregamento), `getNeonatalAlerts`, `PEDIATRIC_FORMULATION_GUIDE`, `calcPesoIdealPediatrico`, `sumarizePediatricPatient`.
- **C**: `calcCrCl`, `calcBSA`, `calcIMC`, `calcWeightDose`, `convertDose` (mg↔mL, mL→gotas, mg→comprimidos, mcg↔mg, g↔mg, UI→mL), `getAdjustmentForCrCl`, `getPediatricAgeGroup` (**terceira classificação etária, sem chamadores**), `idadeEmMeses`, `checkBeersCriteria`, `classifyPopulation`, `parseConcentration`, `parseFrequencia`, `mapFrequenciaParaContrato`, `mapUnidadeParaContrato`.
- **Dados**: `pharma-database*.ts` (catálogo QuickDrug, incl. `pharma-database-pediatria.ts` com 364 linhas), `pharma-core` (`DrugEntity.dosageRules`, derivadas do mesmo catálogo).
- **Adjacentes fora do escopo da unificação (a decidir)**: `palliative-engine` (`calcBreakthroughDose`, `calcOpioidRotation`), `icu-engine` (`calcVasopressorInfusion`), `oncology-engine` (BSA Mosteller e DuBois — 5ª e 6ª implementações de BSA), `geriatric-engine` (Cockcroft), `clinical-calculators` (CKD-EPI, MDRD), `drug-comparator`, `bula-database`.
- **Persistência**: front `DoseEstruturada` ↔ back `DoseEstruturadaDto` (unidades e frequências em enum; `dose_por_kg_dia`, `dose_por_tomada`).

## 2. Mapa de dependências e consumidores
| Consumidor | Engine | Caminho |
|---|---|---|
| **`/prescricao-rapida`** (tela principal) | **C** | `DoseCalcCard` → `calcFullDose`; a página também usa `calcCrCl`, `calcBSA`, `calcIMC`, `calcWeightDose`, `convertDose`, `getAdjustmentForCrCl`, `checkBeersCriteria`; idade entra por `age-contract` (dias) e é convertida a anos (float) |
| **`/dosagem`** | **A** | `buscarMedicamento`, `calcularDosagem`, `detectarPopulacao`, `idadeDias(a, m, d)` |
| **`/consulta/nova`** (`PrescriptionPanel`) | C (só auxiliares) | `mapFrequenciaParaContrato`, `mapUnidadeParaContrato` → `DoseEstruturada` → backend |
| `age-contract`, `safety-context` | C | `classifyPopulation`, `PatientPopulation` (faixa etária do contexto de segurança) |
| **B (`pediatric-engine`)** | — | **nenhuma tela.** Consumidores: `validation/cross-database`, `validation/data-integrity`, `clinical-tests/cases`, `simulation-phase22-3`, `stress-test-phase22-4`, `validate-extreme-data` |
| A em validadores/simulações | A | `simulation-phase22-3`, `stress-test-phase22-4`, `validate-extreme-data`, `validate-full-patient-flow`, `validate-incomplete-data`, `validate-reproducibility` |
| Testes | A 8 · B 13 · C 12 arquivos | (lista em `src/tests`: ex. `rm100`, `rm103`, `rm53-pediatric-boundaries`, `dose-calculator-unit-audit`, `pediatric-dose-fixa`) |
- Dependência cruzada: C importa `calcularBSA` de A; `age-contract` importa `classifyPopulation` de C. Não há outra importação entre os três.
- **Os dois engines não são executados em conjunto hoje**: cada tela tem um único engine. O risco de recomendações conflitantes é **entre telas** (o mesmo paciente/medicamento em `/dosagem` e em `/prescricao-rapida`) e **entre testes/validadores e telas**.

## 3. Matriz comparativa
Arquivos: `evidencias/matriz-regras-dose.csv` e `.json` (**488 linhas**: 54 A + 32 B + 402 C [382 adulto + 20 pediátrico]) com os 24 campos pedidos (entidade, molécula, apresentação, engine, população, faixa etária, peso, indicação, dose, unidade, dose/kg, dose/m², máximo diário, frequência, intervalo, duração, via, forma, ajuste renal/hepático, contraindicações, fonte, status). Campos que **não existem** em um engine ficam vazios (p.ex. duração em todos; faixa etária estruturada em C). `evidencias/cobertura-engines.json` traz a cobertura.
- **Cobertura**: A ∩ B = 9 medicamentos (amoxicilina, amoxicilina + clavulanato, azitromicina, cefalexina, SMZ-TMP, paracetamol, ibuprofeno, dipirona, omeprazol); A ∩ C(pediátrico) = 10; B ∩ C(pediátrico) = 8; só A = 6 (prednisona, atenolol, losartana, pramipexol, fenitoína, dienogeste); só B = 11 (ceftriaxona, metronidazol, fluconazol, aciclovir, oseltamivir, albendazol, ivermectina, ondansetrona, domperidona, lactulose, dexametasona); C pediátrico sem A nem B = 9 (anlodipino, furosemida, budesonida, cafeína, poractanto, vitamina K1, palivizumabe, sildenafil neonatal, fenobarbital neonatal).
- **IDs diferentes entre engines**: `amoxicilina-clavulanato` (A, B) × `amoxicilina_clavulanato` (catálogo); `sulfametoxazol-trimetoprim` (A) × `smz-tmp` (B) × `smz_tmp` (catálogo). O vínculo desta auditoria é uma tabela manual (não existe no sistema). Dexametasona (B) **não** foi ligada ao catálogo (há variantes por contexto); não se presumiu equivalência.
- **Resultados comparados** (`resultados-comparados-pacientes-padrao.json`, 70 execuções = 10 medicamentos × 7 pacientes) mostram o que cada engine **calcula/bloqueia** para o mesmo paciente; o motor foi executado em modo leitura. Em A, para cada paciente foi escolhida a primeira formulação aplicável (as regras de amoxicilina + clavulanato dependem da apresentação).

## 4. Divergências por medicamento
Detalhe completo em `evidencias/divergencias-por-medicamento.md`. Cada divergência foi classificada pela causa **observável** (indicação, faixa etária, tomada × dia, frequência, formulação, máximo, fonte, cadastro, contexto), **sem** confirmar causas contra fontes primárias.

| Medicamento | Divergência medida | Causa provável (não confirmada) | Estado |
|---|---|---|---|
| Cefalexina | 25 (A) × 50 (B) mg/kg/dia; C sem regra pediátrica (500 mg a criança) | ausência de contexto em A; fonte; lacuna em C | **inconsistência real sem resolução** |
| Amoxicilina | A 8/8 h × B/C 12/12 h (50 × 50 × 45 mg/kg/dia); adulto 500 mg 8/8 h (A) × 875 mg 12/12 h (C); C ignora a apresentação; A calcula em neonato, B bloqueia | frequência; indicação (B: 90 mg/kg em pneumonia); apresentação; máximo | **inconsistência real sem resolução** |
| Amoxicilina + clavulanato | 45 (A, C) × 70 (B) mg/kg/dia; C adulto ignora 500/125 × 875/125 | indicação ("resistentes") + formulação (7:1) — **provável, sem fonte**; C não considera apresentação | pendência clínica + limitação de contrato |
| Ibuprofeno | A 10 mg/kg 8/8 h (≥ 1 a) × B 5–7,5 mg/kg 6–8 h (≥ 6 m) × C 7,5 mg/kg 8/8 h; neonato: A bloqueia, B devolve esquema de PDA, **C calcula dose oral**; rótulo "mg/kg/dose" em valor absoluto | indicação; faixa etária; máximo; erro de rótulo em C | pendência clínica + **erro cadastral/rótulo em C** |
| Omeprazol | 1 (A, B) × 0,7 (C) mg/kg; máx. 40 mg/dia (A) × 20 mg (B, C); 30 kg: A 30 mg × B/C 20 mg | dose/kg; máximo; faixa textual (0,7–3,3) em C | **inconsistência real sem resolução** |
| Dipirona | 15 (A, B) × 10 (C) mg/kg/dose; máx. 60 × 50 mg/kg/dia; **C sem bloqueio etário** (A e B bloqueiam < 90 d/< 3 m); adulto 500 × 1.000 mg | dose/kg; máximo; **contraindicação ausente em C** | **inconsistência real + risco de segurança** |
| Sulfametoxazol + trimetoprima | 8 (A) × 6 (B) mg/kg/dia de TMP; C sem regra pediátrica (800 mg a criança); adulto 160 mg (TMP) × "800/160" (C lê 800) | dose; **substância de referência (TMP × combinação)**; lacuna em C | **inconsistência real + risco de unidade** |
| Metformina | A calcula 500 mg 12/12 h a criança de 4 a (indicação "> 10 anos", sem mínimo); C 850 mg; máx. 2.550 × 2.000 × 3.000 | faixa etária sem limite; máximo; apresentação | pendência clínica + lacuna de bloqueio |
| Paracetamol (adicional) | neonato 10 (A) × 15 (B, C) mg/kg; máx. diário 60 (A, C) × 75 (B) mg/kg; B devolve 1.000 mg a adulto | população neonatal; máximo; **B sem limite superior de idade** | pendência clínica |
| Azitromicina (controle) | mesma dose diária; B descreve D1 10 → D2–D5 5 mg/kg | esquema (ataque × manutenção) | divergência de esquema |
**Causas por categoria**: tomada × dia (não identificada nos 10 casos após a RM-103; risco estrutural persiste em C); frequência; indicação; faixa etária; formulação/apresentação; máximo; fonte; cadastro/contrato; contexto — todas documentadas em `divergencias-por-medicamento.md`.

## 5. Divergências etárias e populações especiais
Evidência: `classificacao-etaria-comparada.json`, `verificacoes-pontuais.json`.
| Ponto | A | B | C |
|---|---|---|---|
| Neonato | < 28 d | idade mínima/máxima por indicação (meses); corrigida se IG + dias | < 28/365 a |
| Lactente | 28–364 d | — | 28 d – < **2 anos** |
| Pediátrico | 1–11 a (um só balde) | — | pré-escolar 2–5 a; escolar 6–11 a |
| Adolescente | 12–17 a (regras costumam ser "adolescente\|adulto") | — | 12–17 a e **`usar_dose_pediatrica = false`** (dose adulta) |
| Idoso | ≥ 65 a | — | ≥ 65 a (alerta Beers) |
- **Divergência de fronteira real**: de 365 a 729 dias, A diz "pediátrico" e C diz "lactente" (o que muda a regra de dose ao menos onde C tem `dose_pediatrica`).
- **Conversão de meses**: `idadeDias` (A, tela `/dosagem`) usa 1 mês = 30 d; o contrato canônico (RM-105.2.2) usa 365/12 d. "12 meses" = **360 d** em A (→ *lactente*) × **365 d** canônicos (→ *pediátrico*); 11 m: 330 × 334,58; 6 m: 180 × 182,5; 1 m: 30 × 30,42.
- **Idade gestacional / pós-natal / pós-menstrual / peso ao nascer**: só B usa IG e dias pós-natais (idade corrigida = IG + pós-natal − 40 sem; meses = ⌊sem/4,33⌋, aplicada a *qualquer* paciente que informe os dois, inclusive a termo). **Idade pós-menstrual** e **peso ao nascer** não existem em nenhum engine. A e C usam só idade cronológica. Cálculos neonatais dependem apenas da idade em A e C.
- **Idade cronológica isolada**: insuficiente para neonatologia/prematuridade; o contrato proposto exige IG e idade pós-natal quando a regra tiver escopo neonatal.
- `getPediatricAgeGroup` (C) é uma terceira classificação (≤ 1 m neonato; ≤ 24 m lactente; ≤ 72 m; ≤ 144 m; adolescente), **sem chamadores**.
- O contrato canônico de idade em dias (RM-105.2.2) é **preservado**; a classificação populacional da tela **não** é validação clínica de dose pediátrica/neonatal. Nenhum novo limite clínico foi estabelecido.

## 6. Lacunas de fonte (governança)
- **Cobertura de fonte**: C 0/402 linhas; A 37/54 regras (13 diretrizes agregadas em texto: IDSA 2022/2019/2014/2010, SBI 2022, SBU 2021, SBP 2023, Micromedex, GINA 2023, ARIA 2021, ACR 2022, ESC/ESH 2023, SBC 2023, ADA 2024, SBD 2023, MDS/ABN, ESHRE/FEBRASGO); B 32/32 em texto (17 rótulos: AAP 2023, AAP Red Book 2024, ANVISA 2023, CDC 2024, Cochrane 2021, ESPGHAN 2022, FDA Labeling, GINA 2024, IDSA 2023, IPNA 2020, Nelson 21ª ed., OMS 2022, PCNS 2023, Red Book 2024, SBP 2023…).
- **Nenhuma dessas fontes foi aberta/verificada** nesta RM; **não existe** por regra: documento, versão, data, seção, trecho que sustenta a dose, população, via, limitações ou status de revisão. São **fontes candidatas (texto declarado no dado)**, não fundamentação. Não foram inventadas referências nem DOI.
- **Estado de validação**: só B declara pendência (domperidona, `maxDoseMgKgDiaPendenteValidacao`); nenhum engine tem status estruturado.
- **Priorização proposta para verificação futura** (documentos primários): rótulos regulatórios (Anvisa/FDA) das 10 moléculas divergentes (§4), diretrizes citadas por A/B para as mesmas indicações; verificação com seção + trecho + versão antes de qualquer regra mudar. Tabelas de dose pediátrica/neonatal exigem fonte própria por faixa.
- Para o catálogo de interações a RM-106.1 já separou "fontes verificadas" de "candidatas"; o mesmo padrão é proposto (`estado_de_revisao: candidata | verificada`).

## 7. Contrato unificado proposto
Especificação completa em `evidencias/contrato-unificado-proposto.md` (**não implementada**). Pontos-chave:
- **Seis camadas separadas**: informado pelo prescritor · recuperado do catálogo · regra clínica · dado calculado · resultado · alertas/bloqueios; cada número carrega `origem` (`informado`, `confirmado_pelo_prescritor`, `catalogo`, `regra`, `calculado`).
- **Entrada** (`DoseRequest`): identidade por `entidade_id` (RM-105.1), apresentação, idade `{valor, unidade}` (RM-105.2.2), IG/pós-natal/pós-menstrual, peso atual/ao nascer, altura, função renal (método explícito), Child-Pugh, indicação, via, forma, concentração, duração, `dose_informada` (modo "verificar") e `confirmacoes_do_prescritor` (padrão RM-84). **Campo ausente é ausente, nunca valor-padrão.**
- **Regra** (`DoseRule`): escopo por **faixas em dias** (população é só rótulo), `base_tempo` obrigatório (por tomada × por dia), `substancia_referencia` (TMP × combinado), frequência estruturada (intervalo, vezes/dia, faixa, esquema), limites e arredondamento explícitos, ajustes renal/hepático estruturados, restrições com `bloqueia`, e **governança** (fontes completas + `status_validacao`).
- **Resultado** (`DoseResult`): `estado_calculo` (realizado · incompleto · dados inválidos · regra inexistente · bloqueado) **×** `estado_regra` (sem fonte · pendente de validação clínica · fonte verificada com revisão pendente · validada clinicamente), `rotulo_apresentacao` e `homologacao_clinica: false`. Mapeamento dos 7 estados pedidos no §4.1 do documento do contrato.
- **Invariante de apresentação**: o rótulo `dose_validada` só existe com regra `validada_clinicamente` **e** cálculo realizado; caso contrário a UI exibe "dose calculada pela regra cadastrada — não validada clinicamente", sem verde, sem "recomendada/segura/validada".
- **Proibições de projeto** (derivadas dos achados): nunca cair na dose adulta quando falta regra pediátrica; nunca escolher "a primeira regra" quando várias casam (⇒ `calculo_incompleto` pedindo indicação); nunca limitar a dose em silêncio (`limites_aplicados` visível); ajuste renal/hepático em texto aparece como `nao_aplicado_texto_informativo`.
- **Compatibilidade**: adaptador de saída para `DoseEstruturada`/`DoseEstruturadaDto` (frequência via `mapFrequenciaParaContrato`; recusa de persistência quando o cálculo não foi realizado); mesma `entidade_id` do módulo de interações.

## 8. Estratégia de migração (não executada; nenhum consumidor foi migrado)
**Princípio:** um único motor "autoritativo" por tela, nunca dois recomendando ao mesmo tempo.
1. **Fase 0 (RM-107.2) — contrato + validadores, sem consumidores**: tipos, validador de regras (sem sobreposição, `base_tempo`, fonte completa) e **adaptadores somente-leitura** que convertem A, B e C para `DoseRule` com `estado_regra = sem_fonte` e **sem consolidar valores** (regras coexistem; divergência vira `regras_candidatas` ⇒ incompleto).
2. **Fase 1 — modo sombra**: o motor novo roda em paralelo em testes/CI e (opcional) em log local; **a tela continua exibindo o motor legado**. Comparação automática legado × novo em corpus fixo (os 10 medicamentos × 7 pacientes desta RM e o catálogo completo) com **lista de diferenças aceitas**, cada uma ligada a uma decisão clínica (D1…D12); diferença fora da lista **reprova o CI**.
3. **Fase 2 — `/dosagem` (A)**: único consumidor, menor risco; feature flag por tela.
4. **Fase 3 — `/prescricao-rapida` (C)**: maior impacto; migra com a nova UI de estados (sem verde, rótulos do §4); o gating "regra inexistente ⇒ não calcula" muda o comportamento para 362 medicamentos (decisão D1/D2).
5. **Fase 4 — B**: sem tela; passa a ser fonte de regras pediátricas já com status.
- **Evitar conflito simultâneo**: a flag é por consumidor, nunca por usuário; em modo sombra o resultado novo **não** é exibido; telas diferentes ainda podem divergir enquanto convivem (documentado e visível pela lista de diferenças).
- **Protocolos antigos** (`RxItem` com `posologia`/`dose` em texto; favoritos em `localStorage`; `DoseEstruturada` persistida): **não são recalculados nem reescritos**; recebem marca "calculado pelo motor legado" e, se reaplicados, passam pelo motor vigente com confirmação. Campos novos do contrato são **aditivos/opcionais** (`contrato_versao`).
- **Detecção de divergência**: testes diferenciais (legado × novo) + o validador `cross-database` estendido para comparar **valores** (hoje não compara); relatório automático por medicamento.
- **Rollback**: desligar a flag restaura o motor legado (que permanece intacto até a aposentadoria planejada); sem migração de dados irreversível; o armazenamento de regras novo é separado do catálogo atual.

## 9. Estratégia de testes
Princípio: **nenhuma expectativa de dose clínica sem fonte validada.** Os testes do motor novo usam **regras sintéticas** (medicamentos fictícios, números triviais) para verificar aritmética, estados e bloqueios; as doses reais só entram como **testes de caracterização** (registram o que o legado faz hoje, marcados "não é prova de correção") e como diferença aceita pela decisão clínica.
| Área | Casos propostos (resultado esperado = estrutura/aritmética, não dose clínica) |
|---|---|
| Dose por kg / por m² / por tomada / diária | `valor × peso`; `valor × BSA` com fórmula declarada; `base_tempo` por tomada × por dia converte corretamente; mg/kg/dose × mg/kg/dia sem confusão |
| Dose máxima/mínima | clamp reportado em `limites_aplicados` (antes/depois); `excede_*` sobre o valor bruto (já corrigido em UNIT-AUDIT-02) |
| Conversões | mg↔mcg↔g; mg→mL; mL→gotas **só com fator da apresentação**; mg→comprimidos; UI |
| Concentração/apresentação | regra presa a `apresentacao_ids` não casa com outra apresentação (RM-100 generalizada); apresentação ausente ⇒ incompleto quando a regra depende dela |
| Arredondamento | passo/modo por regra; valor bruto e arredondado ambos no resultado |
| Frequência/intervalo/duração | intervalo numérico; faixa ⇒ incompleto até confirmação; PRN/contínuo; duração opcional/obrigatória por regra |
| Ajuste renal/hepático | falta de TFG/Child-Pugh ⇒ `nao_avaliado_falta_dado`; texto não estruturado ⇒ `nao_aplicado_texto_informativo` |
| Idade/peso/neonatologia/prematuridade | fronteiras em dias (inclusivo/exclusivo explícitos); idade sem unidade ⇒ inválida; escopo neonatal sem IG/pós-natal ⇒ incompleto; peso ≤ 0 inválido; BSA sem altura ⇒ incompleto |
| Dados ausentes/inválidos/limites | nenhum valor-padrão; NaN/negativo/infinito inválidos; 1 dia antes/depois de cada fronteira |
| Contraindicações/bloqueios | restrição `bloqueia` ⇒ `bloqueado_por_seguranca`; **regra inexistente ⇒ nunca dose adulta** (cobre cefalexina/SMZ-TMP/metformina) |
| Múltiplas regras | duas regras casam ⇒ `calculo_incompleto` com `regras_candidatas`; nunca "primeira" |
| Estados de apresentação | `dose_validada` só com regra validada; fonte incompleta nunca valida (padrão RM-106.1) |
| Compatibilidade | adaptador → `DoseEstruturada` aceito pelo DTO do backend; recusa de persistir sem cálculo realizado |
| Regressão da migração | corpus desta RM (70 execuções) como linha de base; toda diferença exige decisão registrada |
Testes legados existentes (A 8, B 13, C 12 arquivos) permanecem como rede de proteção durante a migração.

## 10. Riscos técnicos
1. **Segurança de C** (dose adulta para crianças sem `dose_pediatrica`; dipirona sem bloqueio etário; apresentação ignorada; máximo adulto não aplicado; rótulo de unidade). Presentes **hoje**, independentes da unificação.
2. **Rótulos que sugerem validação** ("Dose validada", "Prescrição Sugerida" em verde).
3. Unificar muda o comportamento da tela principal (e potencialmente protocolos favoritos); exige comunicação e testes de aceitação clínicos.
4. IDs sem vínculo entre engines → mapeamento manual propenso a erro (dexametasona, SMZ-TMP).
5. Texto livre no catálogo (`faixa_etaria`, `habitual`, `max`, frequências) → conversão para estrutura exige curadoria; automatizar por parsing pode introduzir erro (já houve bugs de parser; RM-84).
6. Conversão de meses divergente (30 d × 365/12 d) afeta fronteiras.
7. Duas semânticas de `mg` coexistem (por tomada em A/C, base de referência TMP × combinado em SMZ-TMP).
8. Muitas implementações de BSA/TFG (6 de BSA; 4 de TFG) sem decisão de fórmula.
9. Validadores atuais não detectam divergência numérica entre engines.
10. Escopo: motores adjacentes (paliativo, UTI, oncologia) têm regras próprias; incluí-los sem decisão ampliaria o risco.

## 11. Pendências clínicas (decisões que exigem aprovação de médico/farmacêutico clínico)
| # | Decisão | Por quê |
|---|---|---|
| D1 | O que fazer quando não há regra pediátrica: bloquear, exigir confirmação ou manter dose adulta (hoje: dose adulta silenciosa) | segurança; afeta 362 medicamentos |
| D2 | Tratamento do adolescente (< 18 a) em C usa dose adulta; A agrupa "adolescente\|adulto" | critério de população |
| D3 | Fronteira do lactente (1 × 2 anos) e definição de pré-escolar/escolar | os engines divergem |
| D4 | Idade mínima por medicamento (dipirona, ibuprofeno, metformina, omeprazol, amoxicilina em neonato) | bloqueios divergentes |
| D5 | Dose pediátrica por indicação e peso: cefalexina, amoxicilina, amoxicilina + clavulanato, ibuprofeno, omeprazol, dipirona, SMZ-TMP, paracetamol | §4 |
| D6 | Intervalos: amoxicilina 8/8 × 12/12; ibuprofeno 6–8 h; paracetamol 4–6 h | frequência |
| D7 | Doses máximas (diária/por tomada/por kg) de paracetamol, dipirona, omeprazol, metformina, ibuprofeno | §4 |
| D8 | Substância de referência de SMZ-TMP (TMP × combinação) e unidade de exibição | risco de unidade |
| D9 | Regras neonatais/prematuros: quais exigem IG/idade pós-natal/pós-menstrual/peso ao nascer | neonatologia |
| D10 | Arredondamento (passo e modo) por forma farmacêutica | aplicabilidade |
| D11 | Fórmula de BSA e de TFG (por população) | 6 BSA, 4 TFG |
| D12 | Quais ajustes renais/hepáticos viram cálculo (hoje texto) e com que método | ajuste |
| D13 | Texto da interface para dose não validada (e se o verde deve ser removido) | apresentação |
| D14 | Incluir ou não paliativo/UTI/oncologia na unificação | escopo |
Todas exigem **fonte primária verificada** (rótulo/diretriz com seção e trecho) antes de mudar qualquer valor.

## 12. Critérios de aceitação da futura RM-107.2 (proposta)
1. Contrato (`DoseRequest/DoseRule/DoseResult`) implementado **sem alterar** nenhuma dose, intervalo, limite, regra ou calculadora existente; engines legados intactos.
2. Validador de regras com testes (sem sobreposição de faixas, `base_tempo` obrigatório, status/fonte consistentes); fonte incompleta nunca gera `validada_clinicamente`.
3. Adaptadores A/B/C → `DoseRule` somente-leitura, com `estado_regra = sem_fonte` quando não há fonte; **divergências preservadas** como regras candidatas, nunca "fundidas".
4. Resultado distingue os 7 estados; teste prova que **regra inexistente nunca produz dose** e que várias regras possíveis ⇒ `calculo_incompleto`.
5. Invariante de UI: nenhum rótulo "validada/recomendada/segura" nem verde sem `validada_clinicamente`; teste de componente/fluxo.
6. Idade: usa **exclusivamente** o contrato canônico em dias; testes de fronteira (inclusivo/exclusivo) e de conversão de meses; neonatal sem IG/pós-natal ⇒ incompleto.
7. Modo sombra com corpus fixo desta RM; relatório de diferenças; **0 diferenças não explicadas** no CI.
8. Compatibilidade provada com `DoseEstruturada`/DTO do backend e com protocolos antigos (sem reescrita).
9. Rollback por flag documentado e testado; nenhum consumidor migrado sem aprovação expressa.
10. Todos os gates verdes (tsc, ESLint, Vitest completo, build) e relatório com a lista de decisões clínicas **ainda abertas** (nenhuma resolvida por conveniência técnica).

---

## Entrega
**Arquivos analisados (leitura):** `lib/dosing-engine.ts`, `lib/dose-calculator.ts`, `lib/pediatric-engine.ts`, `lib/age-contract.ts`, `lib/safety-context.ts`, `lib/pharma-database.ts` (+ bancos por especialidade), `lib/pharma-core/types.ts`, `lib/types.ts` (`DoseEstruturada`, `PrescriptionItem`), `lib/palliative-engine.ts`, `lib/oncology-engine.ts`, `lib/icu-engine.ts`, `app/prescricao-rapida/page.tsx`, `app/dosagem/page.tsx`, `components/modules/DoseCalcCard.tsx`, `components/modules/PrescriptionPanel.tsx`, `validation/cross-database/validator.ts`, `validation/data-integrity/engine.ts`, `backend/src/modules/consulta/dto/consulta.dto.ts`.
**Evidências (`docs/auditorias/RM-107.1/evidencias/`):** `matriz-regras-dose.csv|json`, `cobertura-engines.json`, `classificacao-etaria-comparada.json`, `resultados-comparados-pacientes-padrao.json`, `verificacoes-pontuais.json`, `divergencias-por-medicamento.md`, `contrato-unificado-proposto.md`, sondas (`sonda-matriz.test.ts.txt`, `sonda-resultados-pacientes-padrao.test.ts.txt`) e gates (`gate-tsc.txt`, `gate-lint.txt`, `gate-vitest.txt`).
**Testes/gates executados:** `tsc --noEmit` 0 erros · ESLint 0 problemas · Vitest completo **91 arquivos / 1.791 testes aprovados** (igual à RM-106.1: confirma que nada mudou) · `next build` não reexecutado (sem alterações em `src/`). As sondas foram executadas e **removidas** de `src/tests` (arquivadas como `.txt`).
**Alterações no código:** nenhuma. Alterações em documentação: apenas `docs/auditorias/RM-107.1/`.
**Limitações desta auditoria:** o mapeamento de IDs entre engines é manual; as causas das divergências são **observadas, não confirmadas**; nenhuma fonte foi aberta; os 10 medicamentos × 7 pacientes são amostra (não todo o catálogo); a matriz cobre dados, não comportamento de toda a UI.
**Confirmações:** RM-107.2 não iniciada · nenhum commit, push ou deploy · alterações locais anteriores preservadas.

Aguardo sua aprovação (e as decisões D1–D14, em especial **D1/D2**, que tratam de um comportamento de segurança existente hoje) antes de implementar qualquer unificação.

---

## Errata (acrescentada na conclusão documental da RM-107.1; o texto histórico acima foi preservado)
Evidências: `evidencias/catalogo-dose-calculator-resumo.json`, `evidencias/catalogo-dose-calculator-por-paciente.csv`, `evidencias/catalogo-uso-pediatrico-vs-calculo.json`, `evidencias/inventario-D1-por-medicamento.csv`, `evidencias/matriz-regras-dose.csv`.
1. **Medicamentos sem dose pediátrica (362 de 382).** Para neonato (14 d), lactente (6 m) e criança (4 a): **207** calculam dose adulta **sem bloqueio**; **125** bloqueiam **somente por frequência indeterminada** (o comportamento após a confirmação manual da frequência é leitura de código, não executado); **30** não têm dose numérica ou receberam alerta crítico. Onde este documento afirma que o `dose-calculator` aplica dose adulta "para os 362" sem alerta, leia-se esta decomposição.
2. **Regra pediátrica não utilizada.** **5 dos 20** medicamentos com `dose_pediatrica` não usam essa regra (metformina, salbutamol, budesonida, montelucaste, vitamina K1 neonatal) e recebem o caminho adulto (criança de 4 anos).
3. **`uso_pediatrico = nao_aplicavel`.** O campo está presente em **66** medicamentos, mas **não é consultado** pelo cálculo; **55** desses estão entre os **207** que calculam dose adulta sem bloqueio.
4. **Amoxicilina + clavulanato — idade mínima em A.** O motor A (`dosing-engine`) tem `contraindicado_ate_dias = 60` nessa regra pediátrica: a idade mínima identificada é **60 dias**, e não 28 dias; **A e B concordam** (≈ 2 meses) nesse ponto.
Nenhuma conclusão foi ampliada além do demonstrado. Nenhuma divergência foi resolvida; todas as decisões D1–D14 permanecem **PENDENTES**.
