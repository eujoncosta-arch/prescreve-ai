# RM-107.1 — Matriz de testes por decisão (Tarefa 3)

> **Documental. Nenhum teste foi criado ou executado nesta etapa.** Os testes abaixo só poderão ser implementados **depois** da aprovação da decisão correspondente e **da autorização expressa** da etapa de implementação. Todas as decisões estão **PENDENTES**.
> **Resultado esperado = comportamento técnico** (estado do resultado, bloqueio, campo preenchido, rastreabilidade). **Nenhum valor de dose clínica é esperado.** Doses reais só aparecem como **testes de caracterização do comportamento atual** (registram o que o código faz hoje, marcados "não é prova de correção"). Quando um teste exigir um valor clínico, ele usa **regra sintética** (medicamento fictício, números triviais) ou fica **condicionado à decisão/fonte aprovada**.
> Vocabulário de estados esperados (do contrato proposto, RM-107.1): `calculo_realizado`, `calculo_incompleto`, `dados_invalidos`, `regra_inexistente`, `bloqueado_por_seguranca`; estado da regra: `sem_fonte`, `pendente_validacao_clinica`, `fonte_verificada_revisao_clinica_pendente`, `validada_clinicamente`.

## 1. Catálogo de cenários reproduzidos na RM-107.1 (prioritários)
Medidos em modo leitura (`evidencias/resultados-comparados-pacientes-padrao.json`, `verificacoes-pontuais.json`, `catalogo-dose-calculator-por-paciente.csv`). "Comportamento atual" = apenas caracterização.
| ID | Entrada | Comportamento atual (A / B / C) | Decisões |
|---|---|---|---|
| S-01 | cefalexina, neonato 14 d, 3,5 kg | A sem regra (bloqueia) · B sem regra (idade < 1 m) · **C calcula 500 mg/tomada (dose adulta), sem alerta** | D1 D4 |
| S-02 | SMZ-TMP, neonato 14 d, 3,5 kg | A bloqueia · B bloqueia · **C calcula 800 mg/tomada** | D1 D4 D8 |
| S-03 | metformina, criança 4 a, 15 kg | A 500 mg 12/12 h · B sem regra · **C 850 mg** | D1 D2 D4 |
| S-04 | dipirona, lactente 60 d, 5 kg | **A bloqueia (< 90 d) · B bloqueia (≥ 3 m) · C calcula 50 mg/tomada sem alerta** | D4 |
| S-05 | amoxicilina + clavulanato adulto, apresentação 500/125 | A (comprimido 500) 500 mg 8/8 h · **C calcula 875 mg 12/12 h** | D6 D10 |
| S-06 | amoxicilina adulto, apresentações 500 mg × 875 mg | **C: mesmo resultado (875 mg 12/12 h) nas duas** | D10 |
| S-07 | ibuprofeno, neonato 14 d, 3,5 kg | A sem regra · B esquema PDA (IV) · **C calcula dose oral; unidade rotulada `mg/kg/dose` em valor absoluto** | D4 D9 D10 |
| S-08 | omeprazol, criança 9 a, 30 kg | A 30 mg · B 20 mg · C 20 mg | D5 D7 |
| S-09 | idade "12 meses" (`/dosagem`) | `idadeDias` = 360 d (lactente) × contrato canônico 365 d | D3 |
| S-10 | idade 365–729 d | A pediátrico × C lactente | D3 |
| S-11 | catálogo, 207 medicamentos sem `dose_pediatrica` | C calcula dose adulta para pediátrico sem bloqueio | D1 |
| S-12 | 66 medicamentos `uso_pediatrico = nao_aplicavel` | o campo não é consultado pelo cálculo | D1 |
| S-13 | 266 medicamentos com ≥ 2 concentrações | dose por tomada não muda com a concentração (C) | D10 |
| S-14 | adolescente 14 a, 20 medicamentos com `dose_pediatrica` | C não usa a regra pediátrica (0/20) | D2 |
| S-15 | lítio `900 mg/dia`, 2x/dia | C calcula total 1.800 (valor tratado por tomada) | D5 D7 |
| S-16 | UI: resultado sem alertas | cartão verde "Prescrição Sugerida"; `/dosagem` "Dose validada" | D13 |

## 2. Testes por decisão
Convenção por linha: **V** entrada válida · **I** entrada inválida · **A** ausência de informação · **L** limite populacional · **P** apresentação (quando aplicável) · **R** regressão. "Esperado" = comportamento técnico condicionado à decisão **se aprovada**; antes disso, apenas a caracterização atual.

### D1 — Ausência de regra pediátrica
| Tipo | Teste | Esperado (técnico, condicionado à aprovação) |
|---|---|---|
| V | paciente pediátrico + medicamento **com** regra pediátrica aplicável (regra sintética) | `calculo_realizado`; `regra_aplicada` preenchida; `estado_regra` ≠ `validada_clinicamente` salvo regra marcada |
| I | pediátrico com idade sem unidade / peso ≤ 0 | `dados_invalidos`; nenhuma dose |
| A | pediátrico + medicamento **sem** regra pediátrica (S-01, S-02, S-03, S-11) | `regra_inexistente`/`calculo_incompleto` com mensagem "regra pediátrica não cadastrada"; **nenhum** `posologia`; nenhum fallback adulto |
| L | idade de fronteira (um dia antes/depois do corte populacional aprovado) | o escopo da regra muda de forma determinística; sem fallback |
| P | apresentação selecionada não coberta pela regra | `calculo_incompleto` com `dados_ausentes`/restrição |
| R | caracterização do comportamento atual dos 207/125/30/5 (`catalogo-dose-calculator-por-paciente.csv`) como linha de base; após a mudança, **toda** mudança deve estar na lista aprovada | diff legado × novo = somente casos listados |
| R | medicamento com regra pediátrica utilizável (15) não muda | resultado idêntico ao legado (ou diferença aprovada) |
| R | `uso_pediatrico = nao_aplicavel` (66) | tratamento conforme decisão (a decidir); teste só após aprovação |

### D2 — Adolescentes
| V | adolescente com regra específica do medicamento (sintética) | seleciona a regra pelo escopo declarado, não pelo rótulo |
|---|---|---|
| I | idade em unidade inválida | `dados_invalidos` |
| A | adolescente sem regra para o medicamento | `regra_inexistente`; sem dose adulta implícita |
| L | 11 a 364 d / 12 a / 17 a 364 d / 18 a (fronteiras em dias) | transição só onde a regra declara; sem transição universal |
| P | regra adulta restrita a apresentação sólida em adolescente leve | restrição respeitada |
| R | S-14 (0/20 usam regra pediátrica aos 14 a) como linha de base | mudança somente conforme decisão |

### D3 — Faixas etárias
| V | idade `{valor, unidade}` normalizada em dias (contrato RM-105.2.2) | `idade_dias` canônica; faixas derivadas versionadas |
|---|---|---|
| I | idade sem unidade, negativa, NaN | `dados_invalidos` (como hoje na tela principal) |
| A | idade não informada | `calculo_incompleto` |
| L | 27/28 d; 364/365 d; 729/730 d; 4379/4380 d; 6569/6570 d; 23724/23725 d (inclusive/exclusivo explícito) | classificação determinística e igual para todos os consumidores |
| R | S-09 (12 meses = 360 × 365 d) e S-10 (365–729 d) | divergências registradas como linha de base; resolução conforme decisão |
| R | `classifyPopulation` existente (testes `rm53-pediatric-boundaries`, `age-contract`) | não regride |

### D4 — Idade mínima
| V | idade ≥ mínimo da regra (sintética) | calcula |
|---|---|---|
| I | idade inválida | `dados_invalidos` |
| A | idade não informada com regra que tem mínimo | `calculo_incompleto` |
| L | mínimo − 1 dia / mínimo / mínimo + 1 dia (inclusivo/exclusivo explícito) | `bloqueado_por_seguranca` abaixo do mínimo |
| P | restrição etária por via/forma (ex.: só IV) | respeita o escopo por via/forma |
| R | S-04 (dipirona 60 d), S-07 (ibuprofeno neonato), S-03 (metformina 4 a), omeprazol neonato, amoxicilina neonato | caracterização atual; após aprovação, bloqueio onde a restrição for aprovada |
| R | restrições já existentes (`contraindicado_ate_dias` de A: 3 regras; alertas 🚨 de B) | continuam bloqueando |

### D5 — Dose pediátrica por indicação e peso
| V | regra sintética por kg (valor × peso) | aritmética exata; `base_tempo` respeitada; origem dos números registrada |
|---|---|---|
| I | peso ≤ 0, NaN, não numérico | `dados_invalidos` |
| A | indicação não informada com mais de uma regra possível | `calculo_incompleto` pedindo indicação; **nunca a primeira regra** |
| L | peso nas fronteiras de faixa de peso; idade na fronteira de indicação | exatamente uma regra casa |
| P | regra presa à apresentação (A `formulacao_ids`; 8 regras) | só casa com a apresentação |
| R | S-08 e a tabela de 4 a/15 kg (`resultados-comparados-...json`) | caracterização; diferenças só se aprovadas; **nenhum valor clínico esperado** |
| R | testes existentes (`rm100`, `rm103`, `dosing-engine-unit-audit`, `pediatric-dose-fixa`, `dose-calculator-unit-audit`) | não regridem |

### D6 — Intervalos e frequência
| V | frequência estruturada (intervalo em horas ou vezes/dia) | converte para tomadas/dia sem texto livre |
|---|---|---|
| I | frequência 0, negativa, ambígua | `dados_invalidos` |
| A | frequência em faixa/PRN/contínuo sem confirmação (125 medicamentos, adulto de paracetamol/dipirona em C) | `calculo_incompleto`; confirmação explícita do prescritor exigida (padrão RM-84) |
| L | 1×/dia e 24/24 h; 3×/dia × 8/8 h; faixa [min, max] | equivalências explícitas e testadas; sem conversão automática entre esquemas |
| P | frequência dependente de apresentação (amox-clav 500/125 × 875/125) | frequência vem da regra da apresentação (S-05) |
| R | `dose-calculator-frequencia-parser` e testes RM-84 | não regridem |

### D7 — Dose máxima
| V | dose abaixo de todos os máximos (sintético) | `calculo_realizado`; `limites_aplicados` vazio |
|---|---|---|
| I | máximo negativo/zero no cadastro (validação de regra) | rejeição na carga |
| A | regra sem máximo declarado | `limites` ausentes visíveis; **nunca "dose máxima validada"** |
| L | valor = máximo; valor = máximo + ε (por tomada, diário, por kg, absoluto) | clamp ou bloqueio conforme política aprovada, **sempre registrado** |
| P | máximo dependente de apresentação | respeita escopo |
| R | `excede_*` sobre valor bruto (UNIT-AUDIT-02) e teto adulto de C (hoje não aplicado) | caracterização; mudança só se aprovada |
| R | rótulo "validada" (S-16) | nenhum rótulo de validação sem regra validada |

### D8 — SMZ-TMP
| V | regra sintética com `substancia_referencia = componente A` | resultado e exibição declaram a substância |
|---|---|---|
| I | regra sem `substancia_referencia` para associação | rejeição na carga |
| A | dose informada sem substância | `calculo_incompleto` |
| L | conversão entre base componente e base associação com razão declarada | só com razão declarada na regra |
| P | apresentações 200/40, 400/80, 800/160 | exibe quantidade de cada componente |
| R | S-02/SMZ-TMP: A 160 mg (base TMP) × C "800/160" (lê 800) | caracterização; resolução conforme D8 |

### D9 — Neonatologia/prematuridade
| V | regra neonatal sintética com IG, idade pós-natal, peso ao nascer informados | `calculo_realizado` somente com todos os dados exigidos |
|---|---|---|
| I | IG fora de intervalo plausível; idade pós-natal negativa | `dados_invalidos` |
| A | regra neonatal sem IG/pós-natal/peso ao nascer | `calculo_incompleto`; lista de `dados_ausentes`; sem presumir termo |
| L | corte de IG (ex.: limite de prematuridade definido pela regra) e de idade pós-menstrual | determinístico, declarado pela regra |
| P | apresentação neonatal (ex.: IV diluída) | respeita escopo |
| R | S-07 (ibuprofeno neonato), idade corrigida de B (`calcIdadeCorrigida`) | caracterização; `ped-audit-06` não regride |

### D10 — Arredondamento e apresentação
| V | dose divisível exatamente pela apresentação (sintética) | resultado sem arredondamento; unidade de dispensação correta |
|---|---|---|
| I | concentração 0/NaN | `dados_invalidos` |
| A | apresentação não informada quando a regra depende dela | `calculo_incompleto` |
| L | dose entre dois múltiplos mensuráveis (comprimido, 0,1 mL, gotas) | arredondamento conforme política aprovada, **sempre sinalizado**; incompatibilidade sinalizada |
| P | mudança de apresentação altera/valida a regra (S-05, S-06, S-13) | a regra casa por apresentação; mudar a concentração muda o resultado quando a regra assim declarar |
| R | gotas exigem fator explícito (UNIT-AUDIT-03); `convertDose` | não regridem |

### D11 — Superfície corporal e função renal
| V | peso/altura válidos | BSA com fórmula declarada no resultado |
|---|---|---|
| I | peso/altura/creatinina inválidos | `dados_invalidos` |
| A | altura ausente com regra por m² | `calculo_incompleto` (comportamento já existente em C; manter) |
| L | peso/altura extremos aceitos/rejeitados | limites declarados |
| P | não aplicável | — |
| R | equivalência entre as 6 implementações de BSA e 5 de ClCr na mesma entrada | detectar e registrar divergência numérica (sonda), sem alterar fórmulas até decisão |

### D12 — Ajustes renais/hepáticos
| V | regra com ajuste estruturado sintético + TFG informada | `ajustes[].estado = aplicado` e valores registrados |
|---|---|---|
| I | TFG/Child-Pugh inválidos | `dados_invalidos` |
| A | ajuste exigido sem TFG | `nao_avaliado_falta_dado`; sem dose "normal" apresentada como ajustada |
| L | fronteiras de TFG (15, 30, 60) | bandas determinísticas |
| P | ajuste dependente de apresentação | respeita escopo |
| R | texto de ajuste de C (364/382) | `nao_aplicado_texto_informativo`; **nunca** apresentado como cálculo |

### D13 — Linguagem e interface
| V | regra `validada_clinicamente` com aprovação registrada | rótulo "clinicamente validada" permitido |
|---|---|---|
| I | regra com status incompleto | nunca rotulada validada |
| A | regra sem fonte | rótulo "regra sem fonte"/"não validada"; sem verde, sem "validada/segura/recomendada" |
| L | transição de estado (sem fonte → fonte consultada → validada) | rótulo muda só com registro formal |
| P | não aplicável | — |
| R | S-16: "Dose/tomada validada", "Dose diária validada", "Prescrição Sugerida", cartão/botão verdes | substituídos conforme política aprovada; teste de componente/fluxo na tela real |

### D14 — Escopo dos motores especializados
| V | módulos incluídos no escopo inicial exercitam o contrato comum | conformidade com o contrato |
|---|---|---|
| I | entrada inválida em cada módulo incluído | `dados_invalidos` |
| A | módulo fora do escopo | continua operando como hoje (sem regressão) |
| L | n/a | — |
| P | n/a | — |
| R | suites existentes de paliativo (`rm85-opioid-rotation-safety`), UTI, oncologia, geriatria | não regridem |

## 3. Testes transversais (após qualquer aprovação)
1. **Ausência de fallback clínico silencioso**: nenhuma combinação (idade, medicamento) retorna dose por caminho não declarado.
2. **Comparação legado × novo** (modo sombra) sobre o catálogo completo e os 70 casos de `resultados-comparados`: lista de diferenças aprovadas; qualquer outra diferença reprova.
3. **Compatibilidade**: `DoseEstruturada`/DTO do backend e protocolos/favoritos legados.
4. **Rollback**: desligar a flag restaura o comportamento anterior (teste de flag por consumidor).
5. **Rastreabilidade**: toda dose exibida mostra regra, versão, estado de fonte e estado de validação.
6. **Interface**: capturas e verificação de linguagem/cor nas telas afetadas (padrão RM-106.1).
