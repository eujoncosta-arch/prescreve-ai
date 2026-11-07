# RM-107.2 — Contrato unificado de dose e adaptadores de leitura

> **Unificar a representação não unifica nem escolhe valores clínicos.** Nenhum motor foi substituído, nenhuma tela foi alterada, nenhuma dose, posologia, regra, indicação, contraindicação ou dado farmacológico foi modificado, nenhuma implementação antiga foi apagada, nenhuma divergência foi resolvida. **Nenhuma regra importada é clinicamente validada.** O módulo novo **não é usado por nenhuma tela**. Sem commit, push ou deploy. **Nenhuma migração de tela ou cálculo foi iniciada.**

## 1. Pré-condições verificadas
| Item | Situação |
|---|---|
| Branch / HEAD | `main` / `b36c639`; 12 arquivos rastreados com alterações locais de etapas anteriores (preservados) |
| RM-107.1 | Concluída documentalmente (relatório, matrizes, inventário, fontes, lacunas, registro, errata, índice) |
| RM-107.1.1 (contenção) | **Somente o plano existe** (`docs/auditorias/RM-107.1.1/PLANO-DE-CONTENCAO.md`); a contenção **não foi implementada nem aprovada**. Motivo: aguarda sua autorização expressa e a aprovação formal de D1/D2/D3/D4/D10/D13. A RM-107.2 **não depende** dela porque não altera nenhum comportamento existente; **os riscos ativos (fallback adulto, regras pediátricas ignoradas, apresentação ignorada, rótulos de validação) continuam existindo nas telas** |
| Decisões D1–D14 | **0 aprovadas, 14 pendentes** (`REGISTRO-DE-DECISOES-PENDENTES.md`) → toda regra permanece pendente; nenhuma lacuna foi preenchida por inferência |
| Fontes primárias consultadas | **0** (`MATRIZ-DE-FONTES-E-EVIDENCIAS.md`) → nenhuma regra pode ser "fonte consultada" ou "validada" |

## 2. Contratos criados (`frontend/src/lib/dose-contract/`, arquivos novos)
| Arquivo | Conteúdo |
|---|---|
| `types.ts` | **DoseRequest** (entidade, apresentação, princípio ativo, concentração, forma, via, idade `{valor, unidade}`, IG, idade pós-natal, idade pós-menstrual, peso atual, peso ao nascer, altura, indicação, função renal + método, função hepática + classificação, dados complementares, confirmações do prescritor); **DoseRule** (id, entidade, indicação, população, faixa etária em dias com limites explícitos, unidade, **base temporal** por tomada/dia/indeterminada, substância de referência, frequência estruturada, limites por tomada/dia/kg/absoluto/mínimo, forma, via, apresentações compatíveis, ajustes renal/hepático, restrições, dados obrigatórios, governança com fontes/versão/seção/estado de revisão/aprovação formal, pendências e incompatibilidades); **DoseResult** (estado do cálculo × estado da regra, resultado numérico, unidade, base temporal, frequência, quantidade por administração, alertas, bloqueios, dados ausentes, fonte utilizada, limitações, passo a passo, `homologacao_clinica: false` literal) |
| `governance.ts` | `estadoDaRegra`: estado **derivado**, nunca apenas declarado; só `regra_clinicamente_validada` com status declarado + **aprovação formal completa** (responsável, cargo, data, parecer) + **fonte verificada completa**; faltou algo ⇒ rebaixa |
| `rules.ts` | `validarRegra`, `relacaoDeFaixas` (sobrepõe/disjuntas/indeterminado), `compararRegras`, `detectarSobreposicoes` — registram diferenças, **não escolhem** |
| `units.ts` | conversão mg/mcg/g; unidade não mássica nunca é convertida |
| `evaluate.ts` | `avaliarDose`: aritmética e estados sobre regras estruturadas, sem autoridade clínica |
| `adapters.ts` | adaptadores de **leitura** A, B e C |
| `compat.ts` | `paraDoseEstruturada` (DTO), `frequenciaParaDto`, `envelopeLegado` |
| `index.ts` | reexporta o módulo |

### Estados implementados
**Cálculo:** `calculo_realizado` · `dados_insuficientes` · `entrada_invalida` · `regra_inexistente` · `regra_incompativel` · `multiplas_regras_candidatas` · `calculo_bloqueado`.
**Regra:** `regra_sem_fonte` · `fonte_candidata` · `fonte_consultada_aguardando_revisao` · `regra_clinicamente_validada` (inatingível sem aprovação formal).
**Apresentação:** `calculo_com_regra_nao_validada` · `calculo_com_regra_validada` · `nao_calculado`.

### Decisões de projeto (preservam a pendência, não a resolvem)
- Regra **sem escopo etário declarado** nunca é aplicada ⇒ **não há fallback adulto** (o contrato não reproduz o comportamento de risco do `dose-calculator`).
- Mais de uma regra aplicável ⇒ `multiplas_regras_candidatas`, **nenhuma dose**; o sistema não escolhe.
- Limite excedido (D7 pendente): a dose **não é reduzida**; gera alerta crítico (ou bloqueio, se a política `bloquear` for escolhida pelo chamador).
- Superfície corporal por m²: exige que a **regra declare a fórmula** (D11 pendente); sem isso, `dados_insuficientes`.
- Frequência variável/não estruturada: exige **confirmação explícita** do prescritor.
- Sem arredondamento (D10 pendente); quantidade por apresentação devolvida bruta com `arredondamento_aplicado: null`.
- Ajuste renal/hepático em texto: sempre declarado como **não aplicado**.

## 3. Adaptadores implementados (leitura; evidência: `evidencias/importacao-por-motor.json`)
Princípios verificados por teste: valores originais **preservados** (valor, unidade, frequência, texto); **nenhuma fusão** de regras; **nenhuma regra descartada** (488 importadas); origem preservada em cada regra; snapshot dos dados dos motores idêntico antes/depois; regras sem fonte marcadas pendentes.
O catálogo C é **injetado** pelo chamador (`adaptarMotorC(drugs)`) e o vínculo de IDs usa `pharma-core` — o módulo **não importa** a base legada (regra RM-06 do ESLint respeitada, sem alterar a configuração).

### Regras importadas por motor
| Motor | Regras | Calculáveis tecnicamente | Incompatíveis | Sem fonte | Fonte candidata (texto não conferido) | Sem escopo etário | Validadas |
|---|---|---|---|---|---|---|---|
| A `dosing-engine` | 54 | 54 | 0 | 17 | 37 | 0 | **0** |
| B `pediatric-engine` | 32 | 31 | 1 | 0 | 32 | 0 | **0** |
| C catálogo (adulto 382 + pediátrico 20) | 402 | 84 | **318** | 402 | 0 | **402** | **0** |
| **Total** | **488** | 169 | 319 | 419 | 69 | 402 | **0** |
- **Entidades:** 382 com regras; **29** com regras de mais de um motor; vínculos por alias de auditoria: `amoxicilina_clavulanato`, `smz_tmp`; **não resolvidos: 3 regras de B (`dexametasona`)** — não se presumiu equivalência.
- **Pares de regras da mesma entidade:** 271 (176 entre motores diferentes). Escopo etário: 56 sobrepõem, 63 disjuntas, **152 indeterminadas** (uma das regras sem faixa declarada; 132 dos 176 pares entre motores). Todos ficam **separados** e comparáveis (`detectarSobreposicoes`/`compararRegras`).

### Regras pendentes (resumo das pendências detectadas)
- **A:** população por balde do motor (54); indicação não declarada (27); ajuste só como flag (11); associação sem substância de referência (6, SMZ-TMP); sem fonte (17).
- **B:** frequência, via e apresentação não estruturadas (32); idade corrigida aplicada pelo motor (32); sem limite superior de idade (30); 1 pendência de limite declarada no dado (domperidona).
- **C:** escopo etário não declarado (402); sem fonte (402); `max` em texto sem período garantido (382); faixa etária pediátrica em texto livre (20); marcador `uso_pediatrico = nao_aplicavel` preservado como informação (66; **não é decisão**); motor trata unidade com base temporal/peso/superfície como por tomada (44 regras).

### Regras incompatíveis (preservadas, **não corrigidas**)
- **C:** 318 — `valor_nao_numerico_puro` 311 (o `habitual` não é um número puro, ex.: "800/160 mg …", "5–60 mg/dia"; o adaptador **não** replica o `parseFloat` do motor); `base_temporal_nao_declarada_na_unidade` 38; `unidade_nao_suportada` 16 (infusões/taxas); `calculo_nao_reconhecido` 7 e `dose_por_kg_nao_positiva` 5 nas regras pediátricas.
- **Regras pediátricas de C incompatíveis (7):** metformina, salbutamol, budesonida, montelucaste, vitamina K1 neonatal (as 5 que o motor não usa, RM-107.1) **e** cafeína citrato e fenobarbital neonatal (texto de cálculo "mg/kg (cafeína citrato)"/"mg/kg (ataque IV)", que o motor C trata como `mg/kg/dia`; o contrato **não presume**). Demais 13 regras pediátricas calculáveis.
- **B:** 1 indicação sem valor de dose estruturado.
- Nota: `incompativel` aqui significa "não interpretável com segurança pelo contrato", **não** "clinicamente errada".

### Divergências preservadas
Todas as divergências da RM-107.1 continuam como **regras separadas** por motor. Exemplos testados: cefalexina A (25 mg/kg/dia) × B (50 mg/kg/dia) × C (ramo adulto sem escopo etário) — `avaliarDose` para criança de 4 anos resulta em `multiplas_regras_candidatas` (A e B) e, só com C, em `regra_incompativel`; **nenhuma dose**.

## 4. Compatibilidade
- **`DoseEstruturada`/DTO:** `paraDoseEstruturada` só converte `calculo_realizado`; recusa incompleto/bloqueado/sem regra/ambíguo, unidade sem equivalente e via ausente; frequência para o enum (`a_cada_Nh`, `Nx/dia`, `dose_unica`, `outro` + detalhe).
- **Protocolos antigos/favoritos:** `envelopeLegado` apenas **envolve** o item (mesma referência, sem mutação, `nao_avaliado_pelo_contrato`); **nada foi migrado**.
- **Catálogo QuickDrug / identificadores canônicos:** `entidade_id` = id do `pharma-core` (testado: cobre todo o catálogo).
- **Telas e fluxos de prescrição:** inalterados.

## 5. Testes
`frontend/src/tests/rm1072-contrato-unificado-de-dose.test.ts` — **56 testes**, dados **sintéticos** para a matemática e os estados (medicamento fictício; **não são evidência de correção clínica**); os testes dos adaptadores usam os dados reais apenas para provar preservação, origem, estados e detecção.
Cobrem: conversão de unidades; idade/unidade (sem unidade, inválida, negativa; 365 d = 12 m = 1 a); limites de idade (inclusivo/exclusivo); restrição etária bloqueante; dados obrigatórios neonatais; base temporal (por tomada × por dia, por kg, por m² com fórmula declarada); dose por tomada × diária; substância de referência; apresentação e concentração (sem arredondamento); regras sobrepostas, divergentes e inválidas; ausência de regra; dados incompletos; limites máximos (por tomada, dia, kg/dia, absoluto; unidade não comparável); compatibilidade com DTO; preservação de protocolo antigo; proveniência e estado de validação (nenhuma regra importada validada; rebaixamento por aprovação/fonte incompleta); ausência de fallback adulto; regras incompatíveis do catálogo; não modificação dos dados dos motores.

## 6. Resultados dos gates
| Gate | Resultado |
|---|---|
| `tsc --noEmit` | 0 erros |
| `eslint src` | 0 problemas (regra RM-06 respeitada sem alterar a configuração) |
| Vitest completo | **92 arquivos, 1.847 testes aprovados** (antes: 91 / 1.791; +56); nenhuma regressão |
| Cobertura do módulo `dose-contract` (v8, execução do teste novo) | linhas **95,3%** · funções 94,9% · statements 89,7% · branches 82,5% |
| `next build` | sucesso, 50/50 páginas |
| Relatórios da raiz | restaurados (`git checkout --` em `DATABASE_SYNC_REPORT.md`, `RM23_DRUG_CONSISTENCY_REPORT.md`) |

## 7. Riscos residuais
1. **Os riscos ativos nas telas permanecem** (fallback adulto em `/prescricao-rapida`, regras pediátricas ignoradas, apresentação ignorada, rótulos "validada/sugerida", caminho manual com padrões adultos): a RM-107.2 **não os resolve**; dependem da RM-107.1.1 e das decisões D1/D2/D3/D4/D10/D13.
2. **A maioria das regras de C é "incompatível" para o contrato (318/402)** por dados em texto livre; ativar o contrato em telas sem curadoria bloquearia/deixaria incompleto grande parte do catálogo (comportamento **mais conservador** que o atual) — exige decisão de produto/clínica e curadoria por profissional.
3. Escopo etário das regras de C não é declarado: o contrato **recusa** aplicá-las (por desenho); isso é intencional e precisará de dados aprovados.
4. Vínculo de IDs por alias de auditoria (2) e 3 regras de B sem vínculo (dexametasona): requer curadoria.
5. Aritmética do avaliador não foi comparada numericamente com os três motores (diferenças de arredondamento, limites e idade corrigida existem entre eles).
6. Idade corrigida de B, fórmulas de BSA/TFG, política de limites, arredondamento e ajuste renal/hepático **não estão implementados** (dependem de D7, D9, D10, D11, D12).
7. Cobertura de branches 82,5%: ramos de erro menos comuns sem teste dedicado.
8. Nenhuma fonte foi consultada: todos os estados de fonte são "sem fonte" ou "candidata".

## 8. Estratégia de rollback
Mudança **puramente aditiva**: pasta nova `src/lib/dose-contract/` e um arquivo de teste novo, sem importadores no restante do código, sem alteração de motores, telas, catálogo ou configuração. Rollback = remover essa pasta e o arquivo de teste (ou não incorporá-los). Nenhum dado, protocolo ou DTO foi alterado, portanto não há migração a reverter.

## 9. Confirmações
Nenhuma tela migrada · nenhum motor substituído ou apagado · nenhuma dose/posologia/indicação/contraindicação/biblioteca farmacológica alterada · nenhuma divergência resolvida · nenhuma decisão D1–D14 aprovada · nenhuma regra marcada como validada · nenhum commit, push ou deploy.

Aguardo sua autorização antes de qualquer migração de tela ou cálculo (e para a implementação da RM-107.1.1).
