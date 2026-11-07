# RM-105 — Identidade farmacológica, sinônimos e completude da verificação

**Base:** RM-104 (contrato `SafetyCheckResult`, ainda sem commit). **Natureza:** predominantemente diagnóstica e de reconciliação.
**Sem commit, push ou deploy. Não iniciei a RM-106.**

## 0. Resumo

| Etapa | Resultado | Mudou comportamento? |
|---|---|---|
| 1. Sinônimos | 1.833 sinônimos (1.723 termos distintos) classificados; **610 termos** (classe, indicação, sintoma, termo genérico/sigla ambígua) deixam de **identificar** uma molécula | Sim, só na identidade da entrada. **Nenhum dado foi apagado** |
| 2. 18 variantes | tabela completa; 1 monofármaco→combinação (alto), 16 variantes de contexto (moderado), 1 forma/sal (moderado) | Não: só rastreabilidade (`composicao`, `contexto`, `variantes_mesma_molecula`, `identificacao`) |
| 3. Regras fixas | escopo e origem documentados; **achado:** casam texto por substring nos dois sentidos | Não: alertas preservados; passam a ter `rastreio_alertas` |
| 4. Contexto | contrato independente de 5 estados, integrado ao resultado | Não cria regra; só descreve se o dado existe |
| 5. Receita impressa | investigada; proposta visual + técnica em [maquete HTML](RM-105-evidencias/proposta-receita-impressa.html) | **Não modificada** |

Nenhuma dose, interação, contraindicação ou severidade foi alterada.

## 1. Inventário

| Item | Quantidade |
|---|---|
| Entidades farmacológicas (`drugRepository`) | 382 |
| Sinônimos cadastrados (entidade × termo) | 1.833 (1.731 normalizados; **1.723** após a normalização da auditoria) |
| Entidades com sinônimos | 382 de 382 |
| Termos que casam com >1 entidade | 89 (medido na RM-104) |
| Regras fixas de interação (`CRITICAL_PAIRS`) | 22 |
| Outras regras fixas por texto | ARM (K+), montelucaste |
| Casos do baseline de alertas | 539 (382 nomes da base + termos de classe/indicação × 5 parceiros + 25 pares reais) |

## 2. Etapa 1 — Auditoria dos sinônimos

### 2.1 Método
Classificação **heurística e conservadora**, com evidência e confiança por linha (CSV completo em [`sinonimos-classificacao.csv`](RM-105-evidencias/sinonimos-classificacao.csv), script em `classificador-sinonimos.cjs.txt`). Ordem das regras: (1) ambiguidade medida nos dados (o termo casa com moléculas de nome ativo diferente); (2) igual ao nome/sal do próprio princípio ativo; (3) marca cadastrada em `brands`; (4) sigla inequívoca documentada; (5) DCI/USAN alternativo documentado ou variante ortográfica do próprio nome; (6) léxico de classe terapêutica; (7) léxico de indicação/sintoma; (8) termo genérico/sigla ambígua; (9) **tudo o que não é comprovável fica `nao_validado`**.

### 2.2 Classificação

| Categoria | Linhas | Exemplos | Confiança |
|---|---:|---|---|
| Nome comercial (marca cadastrada) | 382 | `zart`→losartana, `cozaar`, `diovan`, `benicar` | alta 66 (marca verificada) · média 316 (marca não verificada) |
| Sinônimo farmacológico válido | 369 | `losartan`, `valsartan`, `amlodipine`, `metformin`, nomes com sal | alta 213 · média 156 |
| Abreviação inequívoca | 7 | `hctz`, `aas`, `ptu`, `5-FU`, `DDP` | alta |
| **Classe terapêutica** | 363 | `ieca`, `isrs`, `bcc`, `estatina`, `tiazidico`, `anticoagulante` | média |
| **Indicação clínica** | 159 | `diabetes`, `gastrite`, `parkinson`, `herpes`, `tabagismo` | média/baixa |
| **Sintoma** | 10 | `vertigem`, `nausei`, `dor moderada`, `arritmia` | alta |
| **Termo genérico / sigla ambígua** | 39 | `controlado`, `multimodal`, `tab`, `add`, `ne`, `da`, `dex` | média |
| Ambíguo (casa com moléculas diferentes) | 145 | `ieca`, `bra`, `isrs`, `analgesico`, `corticosteroide` | alta (medido) |
| **Não validado** | 359 | `renitec`, `glucoformin`, `amoxiclav`, `espirono`, `lunesta` | baixa |
| **Total** | **1.833** | | |

Observação: 61 dos 145 ambíguos são, pela natureza do termo, classe (61), indicação (17) ou sintoma (4); os demais são ambíguos entre moléculas reais ou marcas e **já eram tratados como parciais pela RM-104**.

### 2.3 O que mudou (sem apagar dados)

- Novo módulo [`synonym-governance.ts`](../frontend/src/lib/synonym-governance.ts): lista dos **610 termos** não moleculares (classe 388, indicação 171, termo genérico 39, sintoma 12) e dos **371 sinônimos validados** (`entidade|termo`). Gerado a partir da classificação; **revisão clínica obrigatória**.
- O verificador **não aceita** esses termos como identidade: a entrada fica `não verificada` com motivo `termo_nao_molecular` e a categoria. Os termos continuam cadastrados como sinônimo (nas 337 entidades afetadas, **678 linhas** de sinônimo seguem nos dados) e a **pertinência à classe** usada pelas regras fixas (ex.: "nitrato") não foi tocada.
- Segurança do bloqueio: **0** termos bloqueados coincidem com nome ativo, nome completo ou marca de qualquer entidade (teste de integridade); as 382 moléculas da base seguem reconhecidas (só `desogestrel` e `bicarbonato de sódio` ficam parciais, por ambiguidade real).
- Identidade rastreável: cada molécula verificada agora informa `identificacao` (`nome_ativo`, `sinonimo_validado`, `nome_comercial_verificado`, `nome_comercial_nao_verificado`, `sinonimo_nao_validado`) e `identidade_confirmada`. **Não altera o status**: marca comercial não verificada continua reconhecida, mas aparece como "identidade não confirmada" na mensagem e no aviso da tela.

### 2.4 Impacto (todas as diferenças em relação ao estado anterior)
Sobre 539 casos: **527 idênticos; 12 diferem, todos em entradas que contêm um termo de classe/indicação/sintoma tomado antes como molécula.** Nenhum caso sem esses termos mudou (nem os 382 nomes da base, nem os 25 pares reais).

| Entrada | Alerta removido | Gravidade | Alerta acrescentado | Por que mudou |
|---|---|---|---|---|
| `ieca + enalapril` | `dup-IECA` — Duplicidade terapêutica: IECA | warning | — | "ieca" era tomado como molécula |
| `bra + enalapril` | `inter-olmesartana-enalapril` | danger | — | "bra" era tomado como olmesartana |
| `isrs + varfarina` | `inter-sertralina-varfarina` | warning | — | "isrs" era tomado como sertralina |
| `isrs + tramadol` | `critical-pair-sertralina-tramadol` (Sertralina + Tramadol) | danger | `critical-pair-isrs-tramadol` (ISRS + Tramadol), **mesma gravidade** | "isrs" era tomado como sertralina |
| `isrs + sertralina` | `dup-ISRS…` (duplicidade) | warning | — | "isrs" e "sertralina" viravam a mesma molécula duas vezes: duplicidade falsa |
| `antibiotico + varfarina` | `inter-amoxicilina-varfarina` | warning | — | "antibiotico" era tomado como amoxicilina |
| `analgesico + varfarina` | `inter-paracetamol-varfarina` | warning | — | "analgesico" era tomado como paracetamol |
| `febre + varfarina` | `inter-paracetamol-varfarina` | warning | — | "febre" era tomado como paracetamol |
| `ansiedade + tramadol` | `critical-pair-escitalopram-tramadol` | danger | — | "ansiedade" era tomado como escitalopram |
| `antidepressivo + varfarina` | `inter-sertralina-varfarina` | warning | — | "antidepressivo" era tomado como sertralina |
| `antidepressivo + tramadol` | `critical-pair-sertralina-tramadol` | danger | — | "antidepressivo" era tomado como sertralina |
| `antidepressivo + sertralina` | `dup-ISRS…` | warning | — | duplicidade falsa (mesma molécula duas vezes) |

**Não é silencioso:** em todos esses casos o termo aparece em `moleculas_nao_verificadas` com `termo_nao_molecular`, o status é `parcial`/`molecula_nao_reconhecida` e `verificacao_completa` é falso. Trade-off assumido: um médico que digitasse "febre" **não** recebe mais a interação de "paracetamol + varfarina", porque "febre" não nomeia o medicamento — o sistema diz que não verificou. Arquivo completo: [`diferencas-baseline-rm104.json`](RM-105-evidencias/diferencas-baseline-rm104.json).

> **Cuidado metodológico (registrado):** a primeira tentativa de baseline foi contaminada, porque uma sonda temporária foi reexecutada dentro da suíte e sobrescreveu o arquivo com resultados do código novo (parecia "zero diferenças"). Reconstruí o baseline do estado RM-104 a partir do `HEAD` + scripts da RM-104 e **fixei o resultado como fixture** (`src/tests/fixtures/rm105-baseline-rm104.json`) para o teste de preservação.

## 3. Etapa 2 — Reconciliação das 18 variantes

Variantes = entidades cujo nome (como a tela a envia) resolve, hoje, para **outro** identificador. A tela de prescrição identifica o item só pelo nome (`rxItems.map(i => i.molecula)`; o `RxItem` não guarda o id da entidade), então a variante escolhida pelo médico **perde a identidade** e a verificação usa a primeira entrada do repositório.

| # | ID original | ID resolvido | Molécula (orig → resolvido) | Composição | Apresentação (orig → resolvido) | Contexto (orig → resolvido) | Rota | Gestação/lactação | Interações (orig→res; Jaccard) | Tipo | Risco |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `prednisolona_asma` | `prednisolona` | Prednisolona | mono→mono | 5 mg / 20 mg / 3 mg/mL xarope → 5 / 20 / 40 mg | Exacerbação de asma (curso curto) → Corticoterapia geral | VO→VO | avaliar/seguro → avaliar/avaliar | 3→3; 0,2 | contexto | **MODERADO** |
| 2 | `azitromicina_dpoc` | `azitromicina` | Azitromicina | mono→mono | 250 / 500 / 600 mg/15 mL → 500 mg / 200 mg/5 mL | Profilaxia na DPOC (uso prolongado) → Infecção aguda | VO→VO | avaliar/avaliar (igual) | 3→2; 0,25 | contexto | **MODERADO** |
| 3 | `fenobarbital-neonatal` | `fenobarbital` | Fenobarbital | mono→mono | 40 e 100 mg/mL IV → 50 / 100 mg comprimido | Convulsão neonatal → Epilepsia geral | **IV→VO** | risco/risco (igual) | 2→4; 0 | contexto | **MODERADO** |
| 4 | `desogestrel-75mcg` | `etinilestradiol-desogestrel` | desogestrel → **etinilestradiol + desogestrel** | **mono→combinação** | 75 mcg → 20/30 mcg EE + 150 mcg | — | VO→VO | contraindicado/seguro → contraindicado/contraindicado | 2→2; 1 | **monofármaco → combinação** | **ALTO** |
| 5 | `midazolam-uti` | `midazolam` | Midazolam | mono→mono | 5 mg/mL, 1 mg/mL IV → 5 / 1 mg/mL IV/IM | Sedação contínua em UTI → Sedação/ansiólise geral | IV→IV | risco/risco (igual) | 2→3; 0 | contexto | **MODERADO** |
| 6 | `amiodarona-pcr` | `amiodarona` | Amiodarona | mono→mono | 150 mg/3 mL IV → 100 / 200 mg comprimido | PCR/arritmia (emergência) → Antiarrítmico crônico | **IV→VO** | risco/contraindicado → contraindicado/contraindicado | 3→6; 0,29 | contexto | **MODERADO** |
| 7 | `bicarbonato-sodio-pcr` | `bicarbonato-sodio-oral` | bicarbonato de sódio → Bicarbonato de Sódio **Oral** | mono→mono | 8,4% / 4,2% IV → 500 / 1000 / 840 mg | — | **IV→VO** | avaliar/seguro (igual) | 2→2; 0 | forma/sal (nome ativo diferente) | **MODERADO** |
| 8 | `tramadol-paliativo` | `tramadol` | Tramadol | mono→mono | 50 mg cápsula / 100 / 200 LP → 50 / 100 mg | Dor em paliativos → Dor aguda geral | VO→VO | contraindicado (igual) | 3→3; 0 | contexto | **MODERADO** |
| 9 | `fentanil-transdermico` | `fentanil-uti` | fentanil | mono→mono | **adesivo 12/25/50 mcg/h → ampola IV 50 mcg/mL** | Dor crônica (adesivo) → Analgossedação em UTI (IV) | **TD→IV** | contraindicado/contraindicado → risco/risco | 2→2; 0 | contexto | **MODERADO** |
| 10 | `midazolam-paliativo` | `midazolam` | midazolam | mono→mono | ampola SC/IV → IV/IM | Sedação paliativa → geral | SC→IV | risco/contraindicado → risco/risco | 2→3; 0 | contexto | **MODERADO** |
| 11 | `fenobarbital-paliativo` | `fenobarbital` | fenobarbital | mono→mono | 100 mg/mL IV/SC → comprimidos | Sedação paliativa → Epilepsia geral | SC→VO | contraindicado/contraindicado → risco/risco | 1→4; 0 | contexto | **MODERADO** |
| 12 | `haloperidol-paliativo` | `haloperidol` | haloperidol | mono→mono | 5 mg/mL SC/IV/IM → 1 / 5 mg comprimido | Náusea/delirium paliativo → Psicose/agitação | SC→VO | risco/contraindicado → risco/risco | 2→4; 0 | contexto | **MODERADO** |
| 13 | `lorazepam-paliativo` | `lorazepam` | lorazepam | mono→mono | 1 mg/mL / 1–2 mg sublingual → 1 / 2 mg | Ansiedade/agitação paliativa → Ansiedade/status epilepticus | Sublingual→VO | risco/contraindicado → risco/risco | 1→2; 0 | contexto | **MODERADO** |
| 14 | `metoclopramida-paliativa` | `metoclopramida` | metoclopramida | mono→mono | ampola SC/IV → comprimido / IV | Náusea/obstrução paliativa → Náusea/gastroparesia | SC→VO | risco/risco (igual) | 1→4; 0 | contexto | **MODERADO** |
| 15 | `ondansetrona-paliativa` | `ondansetrona` | ondansetrona | mono→mono | ampola IV/SC → 4 / 8 mg | Náusea paliativa → Náusea/vômito geral | SC→VO | avaliar/risco (igual) | 1→3; 0,33 | contexto | **MODERADO** |
| 16 | `gabapentina-paliativa` | `gabapentina` | gabapentina | mono→mono | 100/300/400 mg (igual) | Dor neuropática paliativa → Epilepsia/dor neuropática geral | VO→VO | risco/risco (igual) | 2→3; 0 | contexto | **MODERADO** |
| 17 | `amitriptilina-paliativa` | `amitriptilina` | amitriptilina | mono→mono | 10/25/75 mg (igual) | Dor neuropática paliativa → Depressão/dor neuropática | VO→VO | risco/risco (igual) | 2→5; 0,17 | contexto | **MODERADO** |
| 18 | `naloxona-antidoto-opioide` | `naloxona` | naloxona | mono→mono | 0,4 mg/mL IV/SC/IM → + spray nasal | Reversão de opioide (paliativos) → emergência | IV→IV | avaliar/risco (igual) | 2→2; 1 | contexto | **BAIXO** |

Dados completos: [`variantes.json`](RM-105-evidencias/variantes.json). Justificativa da correspondência (todas): o resolvedor devolve a **primeira** entidade cujo nome ativo, nome completo ou sinônimo é igual ao texto, na ordem do repositório; nenhuma correspondência foi confirmada por critério clínico.

### Conclusões
- **Não unir entidades só porque compartilham uma molécula.** Em 16 das 18 variantes, as listas de interações quase não se sobrepõem (Jaccard 0–0,33), a via difere em 10 e a classificação de gestação/lactação difere em 8 (das 18). São entidades legitimamente distintas.
- **#4 é o caso de maior risco:** a entrada "desogestrel" (pílula só de progestágeno, 75 mcg) resolve para a **combinação com etinilestradiol** (150 mcg + 20/30 mcg EE). Mono × combinação têm identidade, dose e riscos diferentes. Já é `parcial` (ambiguidade, RM-104) e agora também informa `composicao: 'combinacao'`.
- **#9 e #6 mostram o risco prático:** o adesivo de fentanil resolve para a ampola IV de UTI; a amiodarona de PCR (IV) resolve para o comprimido crônico (VO).
- **Correção estrutural recomendada (não feita):** o item da receita deve guardar o `id` da entidade escolhida e o verificador deve aceitá-lo. Isso mudaria quais alertas aparecem para essas variantes, e por isso depende de aprovação clínica.
- **Feito nesta RM (rastreabilidade, sem mudar a resolução):** `MoleculaVerificada` agora informa `id`, `composicao` (monofármaco/combinação), `contexto` (ex.: "Sedação contínua em UTI") e `variantes_mesma_molecula` (ex.: `midazolam` → `midazolam-uti`, `midazolam-paliativo`).

## 4. Etapa 3 — Regras fixas

### 4.1 Inventário e escopo

| Regra | Base do acionamento | Pode avaliar entrada **não reconhecida**? | Origem no resultado |
|---|---|---|---|
| 22 pares `CRITICAL_PAIRS` | texto bruto (substring nos **dois** sentidos) **e** classe/nome/sinônimo das moléculas resolvidas | **Sim** (por texto) | `regra_fixa_par` |
| ARM — K+ (`arm-*`) | `moleculas.some(m => m.includes('espironolactona'\|'eplerenona'\|'finerenona'))` | **Sim** (por texto) | `regra_fixa_arm` |
| Montelucaste | texto contém `montelucaste`/`montelukast` | **Sim** (por texto) | `regra_fixa_montelucaste` |
| Interação, duplicidade, gestação, lactação, geriatria, renal | moléculas **resolvidas** na base | **Não** | `base_cadastrada` |

Pares fixos (do código): ieca+aine, bra+aine, ieca+espironolactona, azitromicina+amiodarona, azitromicina+haloperidol, hidroxicloroquina+azitromicina, isrs+tramadol, sertralina+tramadol, escitalopram+tramadol, metformina+contraste, lítio+hidroclorotiazida, varfarina+aine, prednisolona+aine, moxifloxacino+amiodarona, ieca+bra, imao+isrs, fenelzina+sertralina, fenelzina+fluoxetina, nitrato+tadalafila, nitrato+sildenafila, nitrato+vardenafila, sacubitril+ieca (gravidades: 12 critical, 7 danger, 3 warning).

### 4.2 Achado (não corrigido): correspondência aproximada por substring
`m.includes(alvo) || alvo.includes(m)` aceita **trechos de texto** como identidade. Medido: em **650 pares de letras isoladas, 460 (71%) disparam ao menos um alerta** (média 6,4; máximo 22); `a` + `b` geram **19 alertas, 10 críticos**; `tra` casa com `tramadol` (par sertralina+tramadol) e `isr` com `isrs`. [`regras-fixas-substring.json`](RM-105-evidencias/regras-fixas-substring.json). Efeito na tela atual: baixo (a tela só envia nomes completos da base), mas qualquer outro chamador recebe alertas críticos espúrios e **identidade por prefixo**. Remover o comportamento mudaria alertas, por isso **não foi alterado**; fica como decisão (ver §10).

### 4.3 O que foi feito
- **`rastreio_alertas`**: para cada alerta, `origem`, `entradas_avaliadas`, `texto_bruto` e `envolve_entrada_nao_verificada`. Os alertas de regra fixa nas entradas não verificadas ficam marcados; a UI/receita pode distingui-los.
- **Status independente dos alertas:** alertas de regra fixa nunca tornam a verificação "completa" (testado com `ieca + aine`, `a + b`).
- Nenhum alerta existente foi removido (exceto os 12 documentados em §2.4, que só existiam pela identificação indevida).

## 5. Etapa 4 — Contexto clínico

### 5.1 Mapa de dependências (existentes)

| Dado | Onde é usado | Regra dependente | Estado hoje na tela de prescrição |
|---|---|---|---|
| Idade | `runSafetyCheck.idoso` (seção 5); `calcFullDose(idadeAnos)`; `dosing-engine(idade_dias)` | alertas geriátricos; faixa etária da dose | `idoso = Number(idade) >= 65` é **sempre booleano** (vazio vira "não idoso") |
| Peso | `calcFullDose(pesoKg)`; `dosing-engine`; Cockcroft-Gault | dose por kg; função renal | não usado por `runSafetyCheck` |
| Função renal | `crclValue` (seção 6 e ARM); `calcFullDose(crcl)` | ajuste/contraindicação renal | calculada pela tela a partir de idade, peso, creatinina e sexo; sem esses dados fica `undefined` |
| Gestação | `gestante` (seção 3); `calcFullDose` | contraindicação/risco na gestação | `useState` inicial `false`: **nunca "não informado"** |
| Lactação | `lactante` (seção 4) | contraindicação na lactação | idem |
| Potássio | `potassiumLevel` (regra ARM) | pré-requisito de K+ | **a tela não envia** (o alerta "K+ não informado" é sempre emitido com ARM) |
| **Alergias** | **nenhuma regra em `safety-rules`, `dose-calculator` ou `dosing-engine`** | — | o modelo `Anamnesis` tem `alergias`, mas **nada na verificação as consome**; a prescrição rápida nem tem o campo |

### 5.2 Contrato proposto (implementado em [`safety-context.ts`](../frontend/src/lib/safety-context.ts))

Estados: `informado` · `nao_informado` (ausente: regra não avaliada; ausência ≠ "não") · `nao_aplicavel` · `invalido` (NaN, negativo, tipo errado: regra não avaliada) · `nao_avaliado` (não existe regra).

`avaliarCoberturaContextual(entrada, { usaARM })` → `{ itens[], pendencias[], completa }`. O resultado de `runSafetyCheck` passa a trazer `cobertura_contextual` e `avaliacao_integral = verificacao_completa && contexto completo`. **Hoje `avaliacao_integral` é sempre falso** (alergias não são avaliadas), e a mensagem da verificação completa diz isso: "Cobertura molecular completa NÃO equivale a avaliação clínica integral — contexto não avaliado: …". Nenhuma regra nova foi criada.

## 6. Etapa 5 — Receita impressa (investigação e proposta; nada modificado)

**Como a receita é montada:** `PrintPreview` (dentro de `prescricao-rapida/page.tsx`) renderiza `#print-area` com cabeçalho do médico, dados do paciente, título "RECEITA MÉDICA", lista de itens (nome comercial/molécula, concentração, dose, via, frequência, duração, uso contínuo, instruções) e rodapé ("Gerado por PRESCREVE-AI", data, assinatura). Imprime via `window.print()`; o painel de controles é `print:hidden`. Ele recebe `patient`, `items` e `medico`; **não recebe nenhuma informação de segurança** (o aviso da RM-104 é só de tela).

**Opções** (maquete: [`proposta-receita-impressa.html`](RM-105-evidencias/proposta-receita-impressa.html)):
- **A — linha no rodapé:** "Verificação de segurança: moléculas COMPLETA · avaliação clínica não integral (contexto não avaliado: …)" / "PARCIAL — não verificadas: X" / "NÃO REALIZADA".
- **B — anexo em página separada (recomendada):** a via do paciente fica limpa; o anexo do prescritor lista verificadas, não verificadas, combinações não avaliadas, alertas, estado de cada dado de contexto e a versão das regras.
- **C — só na tela (atual).**

**Técnica:** `PrintPreview` recebe o `SafetyCheckResult` e a hora da verificação; uma função pura `resumirVerificacaoParaReceita` em `safety-coverage.ts` gera `{ rotulo, nivel, linhas[] }` (testável sem renderizar a página); o anexo usa `break-before: page`. **Decisões necessárias:** A, B ou A+B; o rótulo aparece na via do paciente?; o anexo vai para o prontuário?; bloquear a impressão em `erro` ou só avisar? **Pré-requisito:** a tela hoje sempre envia `gestante`/`lactante`/`idoso` como booleanos; para a linha de contexto ser fiel, esses campos precisam poder ficar vazios.

## 7. Contrato de retorno (campos acrescentados à RM-104)

`MoleculaVerificada`: `identificacao`, `identidade_confirmada`, `composicao`, `contexto?`, `variantes_mesma_molecula`. `MoleculaNaoVerificada`: motivo novo `termo_nao_molecular` + `categoria_termo`. `SafetyCheckResult`: `rastreio_alertas[]`, `cobertura_contextual`, `avaliacao_integral`. Invariantes testados: `verificacao_completa ⇔ status === 'completa'`; `avaliacao_integral ⇒ verificacao_completa`; mensagem coerente com o status; todo item não verificado aparece na mensagem.

## 8. Arquivos

| Arquivo | Mudança |
|---|---|
| `lib/synonym-governance.ts` *(novo)* | 610 termos não moleculares + 371 sinônimos validados; normalização |
| `lib/safety-context.ts` *(novo)* | contrato de cobertura contextual |
| `lib/safety-rules.ts` | resolvedor com governança e identidade rastreável; `rastrearAlertas`; integração do contexto; corpo das regras intocado |
| `lib/safety-coverage.ts` | aviso mostra identidade não confirmada e contexto não avaliado |
| `tests/safety-rules-critical-pairs.test.ts` | caso `isrs+tramadol`: agora o par genérico, mesma gravidade (explicado no comentário) |
| `tests/rm104-…test.tsx` | 3 testes de classe atualizados para a nova semântica |
| `tests/rm105-identidade-sinonimos-e-contexto.test.tsx` *(novo)* · `tests/fixtures/rm105-baseline-rm104.json` *(novo)* | 54 testes + baseline |
| `docs/RM-105-evidencias/*` | CSV dos 1.833 sinônimos, variantes, diferenças, substring, classificador, maquete |

## 9. Testes e resultados

**54 testes novos**, cobrindo os obrigatórios: classe ≠ molécula (7 termos); indicação e sintoma (6); sinônimo farmacológico inequívoco e nome comercial verificado/não verificado; combinação × monofármaco; variante de contexto; regras fixas com moléculas desconhecidas (origem e texto bruto); dados ausentes; dados inválidos; **preservação dos alertas anteriores** (527 casos idênticos e 12 diferenças documentadas, exatas); coerência status × mensagem × cobertura (invariantes sobre 73 entradas); integridade (nenhum termo bloqueado coincide com nome/marca verificada).

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` | ✅ **85 arquivos / 1.514 testes** (eram 84 / 1.460 na RM-104; nenhum teste antigo falhou; 1 caso de `safety-rules-critical-pairs` e 3 do RM-104 foram atualizados de propósito) |
| `npm run build` | ✅ exit 0, 50/50 páginas; consistência, cross-db e marcas passam |
| Tela `/prescricao-rapida` | paracetamol → "Nenhum alerta nas regras cadastradas… Contexto não avaliado: função renal, alergias." |

## 10. Riscos residuais e pendências clínicas

**Decisões que exigem autorização (não executadas):**
1. **Substring nas regras fixas** (§4.2): trocar por correspondência exata/por palavra inteira, com tamanho mínimo; remove alertas espúrios e a identidade por prefixo.
2. **Identidade por id:** o item da receita deve guardar o `id` da variante (§3); muda quais alertas aparecem para 16 variantes.
3. **Revisão clínica da classificação:** os 610 termos bloqueados e os 359 `nao_validado` (marcas como `renitec`, siglas como `ne`, `da`, `dex`) são heurísticos; confirmar, e só então apagar ou reclassificar sinônimos nos dados.
4. **Marcas e sinônimos não validados** (359 + 316 marcas não verificadas): continuam reconhecidos, mas marcados como identidade não confirmada; decidir se devem tornar a verificação `parcial`.
5. **Receita impressa:** escolher A, B ou A+B (§6).
6. **Contexto na tela:** permitir "não informado" para gestação/lactação/idade; enviar potássio; decidir o tratamento de **alergias**, hoje coletadas na consulta e não consumidas por nenhuma verificação.

**Riscos residuais:** `aine`, `estatina` e outros rótulos de classe fora da lista bloqueada ainda podem resolver para uma molécula se não forem detectados (a lista é heurística); regras fixas continuam avaliando texto bruto; "verificação completa" refere-se a **moléculas**, nunca a avaliação clínica integral; o aviso na tela depende do que a página envia.

**Não alterado nesta RM:** doses, interações, contraindicações, severidades, dados de sinônimos, receita impressa, matriz clínica.

---

Sem commit, push ou deploy. Não iniciei a RM-106.
