# RM-60 — Inventário Estratégico e Decisão de Destino das Páginas Científico/Inteligência

**Data:** 2026-08-02
**Papel assumido:** arquiteto de produto clínico, UX e engenharia.
**Natureza:** auditoria de produto/arquitetura. Nenhuma integração, motor, dado farmacológico ou remoção foi executada nesta sessão.
**Escopo investigado:** as 30 páginas dos grupos de navegação "Científico" (14) e "Inteligência" (16) definidos em [`frontend/src/lib/clinical-nav-registry.ts`](../frontend/src/lib/clinical-nav-registry.ts) (registro criado na RM-59).

---

## 0. Método

Para cada página, li o `page.tsx` completo nesta sessão (não copiei conclusões da RM-58/RM-59, exceto a classificação `PageClassification` já estabelecida, que reuso como ponto de partida e **revalido** com evidência própria). Também rodei:

- `grep -rl "useApp(" frontend/src/app --include=page.tsx` → confirma que **nenhuma** das 30 páginas Científico/Inteligência usa `useApp()` (apenas `/`, `/consulta/nova`, `/prescricao-rapida`, `/historico`, `/prescricoes`, `/login`, `/configuracoes`, `/demo` usam — todas fora do escopo desta RM, exceto `/demo` que é do grupo "Clínico").
- Contagem de arquivos de teste em `src/tests` que referenciam cada motor/lib por trás de cada página (`grep -rl "<nome-do-motor>" src/tests`), para o critério "maturidade/testes".
- `grep` por SDKs de analytics/telemetria (PostHog, GA, Mixpanel, `track(`) em todo `src/` → **nenhum resultado real de instrumentação de uso** foi encontrado. Por isso, o critério "frequência potencial de uso" é marcado `NÃO VERIFICADO` para todas as páginas — o sistema não tem telemetria alguma, então qualquer número de "frequência de uso" seria inventado.

---

## 1. Inventário completo

| # | Rota | Título | Finalidade aparente | Fonte de dados | `useApp`/paciente/consulta/prescrição | Seed/mock? | Motor(es) importado(s) | Estado atual |
|---|---|---|---|---|---|---|---|---|
| 1 | `/repositorio` | Repositório Científico | Navegar diretrizes/RCTs/meta-análises catalogadas | `SCIENTIFIC_REPOSITORY` (estático) | Nenhum | Não (catálogo curado real) | `scientific-repository.ts` | Funcional, busca+filtro por CID/tipo |
| 2 | `/biblioteca` | Biblioteca Farmacológica Eurofarma | Catálogo de produtos Eurofarma + correlação diagnóstico→classe→molécula→marca | `EUROFARMA_CATALOG`, `CORRELACAO_TERAPEUTICA` | Nenhum | Não (sync real com `eurofarma-sync.ts`, RM-56/58 corrigido) | `eurofarma-sync.ts` | Funcional, tem audit trail e status de sync |
| 3 | `/evidencias` | Evidências Científicas | Navegar diretrizes com rastreabilidade evidência→estudo | `useGovernance()` hook | Nenhum | Estado seed via hook (`governance.ts`, 0% cobertura de teste) | `governance.ts` | Funcional, mas dado subjacente não validado por teste |
| 4 | `/evidence` | Evidence Engine | Navegar diagnóstico→diretriz→terapia→estudos | `EVIDENCE_DB` (estático) | Nenhum | Não (curado, mas sem teste) | `evidence-engine.ts` | Funcional |
| 5 | `/comparador` | Comparador | Comparar 2 moléculas lado a lado (radar, tabela) | `MOLECULES_DB` (estático) | Nenhum | Não (curado, sem teste) | `drug-comparator.ts` | Funcional, ferramenta interativa |
| 6 | `/insights` | Clinical Insights | Analytics agregado de padrões de prescrição | `listarAudits()` + `seedInsightsDemo()` | Nenhum | **Sim** (RM-59: `demonstracao`) | `clinical-insights.ts`, `medical-audit.ts` | Demo — dado agregado fictício |
| 7 | `/segunda-opiniao` | Second Opinion Engine | Usuário escolhe condição+conduta, recebe alternativas | `listarCondicoes()` (estático) | Nenhum | Não (curado, sem teste) | `second-opinion.ts` | Funcional, fluxo em 3 passos |
| 8 | `/dosagem` | Calculadora de Dosagem | Calcular dose por peso/idade/forma farmacêutica | `MEDICAMENTOS_DOSAGEM` (estático) | Nenhum | Não | `dosing-engine.ts` (4 arquivos de teste referenciam) | Funcional, o motor mais testado do lote |
| 9 | `/farmalib` | Biblioteca Farmacológica Enterprise | Catálogo multi-laboratório (só Eurofarma ativo) | `BIBLIOTECA_FARMACEUTICA` | Nenhum | Não | `pharma-library.ts` | Funcional, mas 1 de N labs realmente ativo |
| 10 | `/eurofarma` | Eurofarma | Painel dashboard do portfólio Eurofarma | `eurofarma-sync.ts` | Nenhum | Não | `eurofarma-sync.ts` | Funcional (corrigido nas RM-52/58) |
| 11 | `/explicar` | Por que esta recomendação? | Racional clínico curado por condição/conduta | `RACIONAIS_CLINICOS` (estático) | Nenhum | Não (curado, sem teste) | `clinical-reasoning.ts` | Funcional |
| 12 | `/governanca` | Governança Científica | Versionamento de diretrizes, revisões, auditoria | `useGovernance()` hook | Nenhum | **Sim** (RM-59: `demonstracao`) | `governance.ts`, `governance-dashboard.ts` | Demo — workflow de revisão não é real |
| 13 | `/comite` | Comitê Científico | Validação de recomendações por especialistas | `useComite()` hook | Nenhum | **Sim** (RM-59: `demonstracao`) — especialistas fictícios com CRM/ORCID fabricados | `comite.ts` | Demo — risco de credencial fabricada (ver §8) |
| 14 | `/atualizacoes` | Guideline Update Center | O que mudou nas diretrizes (diffs versão a versão) | `GUIDELINE_UPDATES` (estático) | Nenhum | Não (curado, com evidências e DOIs reais) | `guideline-updates.ts` | Funcional |
| 15 | `/rwe` | Real World Evidence | Efetividade agregada "mundo real" | `rwe-engine.ts` | Nenhum | **Sim** (RM-59: `demonstracao`) | `rwe-engine.ts` | Demo |
| 16 | `/digital-twin` | Gêmeo Digital | Simulação de trajetória de um paciente fictício | `patient-digital-twin.ts` | Nenhum | **Sim** (RM-59: `demonstracao`) | `patient-digital-twin.ts` | Demo |
| 17 | `/rede-medica` | Rede de Aprendizado Médico | Simula rede de médicos compartilhando padrões | `learning-network.ts` | Nenhum | **Sim** (RM-59: `demonstracao`) | `learning-network.ts` | Demo |
| 18 | `/outcomes` | Desfechos Terapêuticos (NNT/NNH) | NNT/NNH/ARR/RRR por molécula/CID | `OUTCOME_DB` (estático, com `fonte` citável, ex. ALLHAT 2002) | Nenhum | Não (RM-59: `referencia`) | `outcome-engine.ts` | Funcional |
| 19 | `/prognostico` | Prognose Preditiva | Prognóstico de desfechos 30d/6m/1a/5a | `prognosis-engine.ts` | Nenhum | **Sim** (`PERFIL_DEMO` hardcoded) | `prognosis-engine.ts` (0 testes) | Demo |
| 20 | `/evidence-timeline` | Timeline de Evidências | Linha do tempo histórica de marcos científicos por condição | `evidence-timeline.ts` | Nenhum | Não (RM-59: `referencia`, marcos históricos reais) | `evidence-timeline.ts` | Funcional |
| 21 | `/farma-analytics` | Analytics Farmacêutico | Padrões de prescrição agregados por CID | `pharma-analytics.ts` + `seedPharmaAnalyticsDemo()` | Nenhum | **Sim** (RM-59: `demonstracao`) | `pharma-analytics.ts` | Demo |
| 22 | `/qualidade-hospital` | Qualidade Hospitalar | Ranking de hospitais por indicadores de qualidade | `hospital-quality.ts` + `seedHospitalQualityDemo()` | Nenhum | **Sim** (RM-59: `demonstracao`) — hospitais fictícios | `hospital-quality.ts` | Demo — risco de identidade (ver §8) |
| 23 | `/atualizacoes-cientificas` | Atualizações Científicas | Alertas de mudança de diretrizes + diretrizes vigentes | `scientific-update-engine.ts` + `seedScientificUpdateDemo()` | Nenhum | **Sim** (RM-59: `demonstracao`, aba "alertas") | `scientific-update-engine.ts` | Demo, sobrepõe `/atualizacoes` |
| 24 | `/explicabilidade` | Explainable AI 2.0 | WHY/WHY NOT/WHAT IF/alternativas/evidências/confiança para uma recomendação | `explainable-ai-v2.ts` + `useLocalStorage('prescreve_ai_anamnese', ...)` | **Nenhum `useApp()`, mas lê a mesma chave que `AnamneseForm.tsx` grava no fluxo real** | Parcial (RM-59: `hibrido`) — `DEMO_ANAMNESE` como fallback | `explainable-ai-v2.ts` (0 testes dedicados) | Funcional, o mais próximo de dado real |
| 25 | `/validacao-clinica` | Clinical Validation Suite | Roda 500 cenários sintéticos de teste automatizado | `clinical-validator.ts` | Nenhum | Sim, mas são **cenários de teste de QA**, não dados de paciente | `clinical-validator.ts` (referenciado em `clinical-validation.test.ts`) | Funcional como dashboard de QA — não é uma página clínica |
| 26 | `/validacao-real` | Real World Medical Validation | Kappa/concordância entre validadores médicos fictícios | `multicentric-validation.ts` | Nenhum | **Sim** (fabrica hospitais, validadores, casos, Kappa) | `multicentric-validation.ts` | Demo — risco de identidade alto (ver §8) |
| 27 | `/interoperabilidade` | Interoperabilidade Hospitalar | Exportar/importar FHIR R4, converter HL7, gerar guia TISS | `interoperability-engine.ts` + `DEMO_PACIENTE` fixture | Nenhum | Parcial — as **transformações são reais e funcionais**, só o paciente de exemplo é fixo | `interoperability-engine.ts` (real: `exportarFHIR`, `importarFHIR`, `validarFHIR`, `gerarGuiaTISS`, `converterHL7`) | Funcional como sandbox técnico, não como página clínica |
| 28 | `/medicina-precisao` | Precision Medicine Engine | Farmacogenômica CPIC/DPWG, dose genotipada | `precision-medicine.ts` (`FARMACOGENOMICA_DB` real/curado) | Nenhum | **Sim** (genótipos de exemplo hardcoded como estado inicial) | `precision-medicine.ts` | Demo — dado de entrada (genótipo) não existe no sistema |
| 29 | `/copilot` | AI Medical Copilot | Gera SOAP, resumo, diferenciais, 2ª opinião, discussão, evolução | `medical-copilot.ts` + `DEMO_CTX` fixture | Nenhum | **Sim** (`DEMO_CTX` hardcoded) | `medical-copilot.ts` (funções reais, input fixo) | Demo, mas `ContextoClinico` mapeia quase 1:1 com campos reais da consulta |
| 30 | `/knowledge-graph` | Medical Knowledge Graph | Grafo de entidades médicas (diagnóstico↔medicamento↔mecanismo↔estudo) | `medical-knowledge-graph.ts` | Nenhum | Não (RM-59: `referencia`, grafo curado) | `medical-knowledge-graph.ts` | Funcional, SVG interativo com zoom/pan |

---

## 2. Matriz de avaliação (0–5, exceto onde indicado)

Legenda das colunas: **VC**=valor clínico direto · **FREQ**=frequência potencial de uso · **DEC**=capacidade de apoiar decisão · **MAT**=maturidade do motor/dado · **FAC**=facilidade de integração ao contexto real · **RISCO**=risco de interpretação enganosa (quanto maior, pior) · **CUSTO**=custo estimado de manutenção (quanto maior, mais caro).

**FREQ é `NV` (NÃO VERIFICADO) em todas as linhas** — não existe telemetria de uso no sistema (confirmado por grep, §0). Qualquer valor numérico aqui seria inventado; a coluna some da tabela por esse motivo e é substituída por uma nota textual quando relevante.

| # | Página | VC | DEC | MAT | FAC | RISCO | CUSTO | Decisão |
|---|---|---|---|---|---|---|---|---|
| 1 | repositorio | 3 | 2 | 4 | 3 | 1 | 2 | `FERRAMENTA_INDEPENDENTE` |
| 2 | biblioteca | 3 | 2 | 4 | 3 | 1 | 2 | `FERRAMENTA_INDEPENDENTE` |
| 3 | evidencias | 3 | 2 | 2 | 2 | 2 | 3 | `FERRAMENTA_INDEPENDENTE` |
| 4 | evidence | 3 | 2 | 3 | 2 | 1 | 2 | `FERRAMENTA_INDEPENDENTE` |
| 5 | comparador | 4 | 4 | 3 | 4 | 2 | 2 | `FERRAMENTA_INDEPENDENTE` (candidata futura) |
| 6 | insights | 2 | 1 | 2 | 1 | 3 | 3 | `MANTER_DEMO` |
| 7 | segunda-opiniao | 4 | 4 | 3 | 4 | 2 | 2 | `FERRAMENTA_INDEPENDENTE` (candidata futura) |
| 8 | dosagem | 4 | 3 | 4 | 4 | 1 | 2 | `FERRAMENTA_INDEPENDENTE` |
| 9 | farmalib | 2 | 1 | 2 | 2 | 1 | 3 | `FERRAMENTA_INDEPENDENTE` |
| 10 | eurofarma | 3 | 2 | 4 | 2 | 1 | 2 | `FERRAMENTA_INDEPENDENTE` |
| 11 | explicar | 3 | 3 | 3 | 3 | 2 | 2 | `PRECISA_DE_DECISÃO_DE_PRODUTO` |
| 12 | governanca | 2 | 1 | 1 | 1 | 3 | 3 | `MANTER_DEMO` |
| 13 | comite | 2 | 1 | 1 | 1 | 5 | 3 | `PRECISA_DE_DECISÃO_DE_PRODUTO` |
| 14 | atualizacoes | 3 | 2 | 3 | 2 | 2 | 2 | `FERRAMENTA_INDEPENDENTE` |
| 15 | rwe | 2 | 1 | 1 | 1 | 3 | 3 | `MANTER_DEMO` |
| 16 | digital-twin | 2 | 1 | 1 | 1 | 4 | 3 | `PRECISA_DE_DECISÃO_DE_PRODUTO` |
| 17 | rede-medica | 1 | 0 | 1 | 1 | 3 | 3 | `MANTER_DEMO` (candidata a arquivar) |
| 18 | outcomes | 3 | 3 | 3 | 3 | 1 | 2 | `FERRAMENTA_INDEPENDENTE` |
| 19 | prognostico | 3 | 2 | 2 | 2 | 3 | 2 | `MANTER_DEMO` |
| 20 | evidence-timeline | 2 | 1 | 3 | 1 | 1 | 2 | `FERRAMENTA_INDEPENDENTE` |
| 21 | farma-analytics | 2 | 1 | 1 | 1 | 3 | 3 | `MANTER_DEMO` |
| 22 | qualidade-hospital | 1 | 0 | 1 | 0 | 4 | 3 | `PRECISA_DE_DECISÃO_DE_PRODUTO` (candidata a arquivar) |
| 23 | atualizacoes-cientificas | 2 | 1 | 1 | 1 | 3 | 3 | `PRECISA_DE_DECISÃO_DE_PRODUTO` |
| 24 | explicabilidade | 4 | 4 | 3 | 4 | 2 | 2 | **`INTEGRAR`** (piloto) |
| 25 | validacao-clinica | 1 | 0 | 3 | 1 | 2 | 2 | `ARQUIVAR` (do nav clínico) |
| 26 | validacao-real | 1 | 0 | 1 | 0 | 5 | 3 | `PRECISA_DE_DECISÃO_DE_PRODUTO` (candidata a arquivar) |
| 27 | interoperabilidade | 2 | 0 | 4 | 2 | 2 | 2 | `FERRAMENTA_INDEPENDENTE` (reclassificar como sandbox técnico) |
| 28 | medicina-precisao | 3 | 2 | 3 | 1 | 3 | 2 | `PRECISA_DE_DECISÃO_DE_PRODUTO` |
| 29 | copilot | 3 | 3 | 3 | 3 | 4 | 3 | `PRECISA_DE_DECISÃO_DE_PRODUTO` |
| 30 | knowledge-graph | 2 | 1 | 3 | 1 | 1 | 3 | `FERRAMENTA_INDEPENDENTE` |

---

## 3. Classificação — evidências e justificativa

### `INTEGRAR` (1 página)

**`/explicabilidade`** — única página do lote que já lê um canal de dado real: `useLocalStorage<Anamnesis | null>('prescreve_ai_anamnese', null)`, a MESMA chave gravada por `AnamneseForm.tsx` no fluxo real `/consulta/nova` (confirmado por leitura de código nesta e na RM-59). O motor (`explainable-ai-v2.ts`) já recebe `(molécula, CID, anamnese)` como entrada estruturada — a integração restante é trocar o CID escolhido manualmente e a "primeira molécula do plano" pela consulta/plano terapêutico realmente ativos, não construir uma engine nova.

### `MANTER_DEMO` (8 páginas)

`insights`, `governanca`, `rwe`, `rede-medica`, `prognostico`, `farma-analytics` — todas fabricam dado agregado/institucional ou perfil de paciente fictício, e a integração real exigiria ou (a) volume real de eventos institucionais que o sistema ainda não acumula (insights, farma-analytics), ou (b) um workflow editorial real de governança que não existe (governanca), ou (c) dados que este produto não coleta hoje (prognóstico populacional, mundo real agregado). Nenhuma tem motor com maturidade suficiente (a maioria tem 0 arquivos de teste dedicados) para virar fonte de decisão clínica confiável no curto prazo.

### `FERRAMENTA_INDEPENDENTE` (14 páginas)

`repositorio`, `biblioteca`, `evidencias`, `evidence`, `comparador`, `segunda-opiniao`, `dosagem`, `farmalib`, `eurofarma`, `atualizacoes`, `outcomes`, `evidence-timeline`, `interoperabilidade`, `knowledge-graph` — ferramentas de referência/cálculo/comparação cujo valor **não depende** de estar amarrado a um paciente específico (uma calculadora de dose, um comparador de moléculas ou uma biblioteca de bulas são úteis mesmo sem consulta ativa). `comparador` e `segunda-opiniao` têm nota mais alta em VC/DEC/FAC e por isso são as duas candidatas futuras de integração (§5) — mas continuam plenamente úteis mesmo sem integração.

`interoperabilidade` merece nota à parte: tecnicamente é a engine mais madura do lote (funções reais de exportação/importação FHIR, conversão HL7, geração TISS), mas seu público real é **integração de sistemas**, não o médico individual decidindo uma conduta — por isso não é candidata a `INTEGRAR` no sentido desta RM (ligar a paciente/consulta), mesmo sendo tecnicamente "pronta".

### `PRECISA_DE_DECISÃO_DE_PRODUTO` (7 páginas)

- **`explicar`** — sobrepõe conceitualmente `/explicabilidade` ("por que esta recomendação?"). Risco de duas respostas divergentes para o mesmo caso. Decisão do dono do produto: fundir com `/explicabilidade`, ou manter como biblioteca de racional geral por condição (sem consulta ativa) e diferenciar claramente o propósito de cada uma.
- **`comite`** — especialistas fictícios com CRM e ORCID **fabricados**, apresentados como "Validação por Especialistas". Isso é o achado de maior risco de todo o levantamento: um usuário pode confundir com validação institucional real. Decisão do dono do produto: remover credenciais fabricadas (manter só o conceito, sem simular CRM real), ou arquivar a página.
- **`digital-twin`** — conceito mais alinhado a "integrar com paciente real" entre os P12, mas bloqueado por falta de dado longitudinal real (o sistema não persiste série temporal de sinais vitais/labs hoje). Decisão: investir na coleta de dado longitudinal (fora do escopo desta RM) ou manter como demonstração educativa permanente.
- **`atualizacoes-cientificas`** — sobrepõe `/atualizacoes`; a aba "alertas" é 100% fabricada enquanto `/atualizacoes` é curada com DOIs reais. Decisão: consolidar em uma página, ou transformar `atualizacoes-cientificas` em consumidor de um feed real (RSS/API de sociedades médicas) — que é um tipo de integração diferente de `useApp()`.
- **`qualidade-hospital`** — ranking de hospitais fictícios; mesmo risco de identidade que `comite`/`validacao-real`. Decisão: arquivar ou reformular sem nomes/rankings que pareçam reais.
- **`validacao-real`** — Kappa/concordância entre "validadores médicos" e "hospitais" inteiramente fabricados, apresentados com rigor estatístico (IC95%, Kappa de Fleiss) que implica um estudo real nunca realizado. Maior risco de todo o inventário empatado com `comite`. Decisão: arquivar, ou não expor externamente até (e a menos que) o programa real de validação exista.
- **`medicina-precisao`** — motor e base CPIC/DPWG são reais e curados; o que falta é o dado de ENTRADA (genótipo real do paciente), que este sistema não coleta (não há integração com laboratório de genotipagem). Diferente de `explicabilidade`, isso não é "1 hook de `useApp()` faltando" — é uma fonte de dado externa inexistente. Decisão: definir se/quando construir essa integração de laboratório.
- **`copilot`** — o motor (`medical-copilot.ts`) já aceita um `ContextoClinico` cujos campos mapeiam quase 1:1 com dados reais de consulta (queixa, HDA, antecedentes, medicamentos em uso, exames, CIDs ativos), tornando-o arquiteturalmente pronto — mas é também o de **maior risco de escopo**: gera nota SOAP completa, "2ª opinião", "discussão clínica" e "evolução" de forma automática, o que se aproxima de documentação/julgamento clínico autônomo, não apenas apoio pontual. Decisão do dono do produto necessária **antes** de qualquer integração: definir explicitamente que o copiloto é uma ferramenta de auxílio à redação (o médico revisa e edita tudo) e nunca uma sugestão de conduta autônoma.

### `ARQUIVAR` (1 página, do nav clínico — não do código)

- **`validacao-clinica`** — é, na prática, um dashboard de execução da suíte de testes automatizados (`clinical-validator.ts`, 500 cenários sintéticos), não uma página de apoio à decisão clínica para o médico. Expô-la no menu "Científico" ao lado de ferramentas de decisão real confunde o público-alvo. Recomendação: mover para uma rota interna/QA (ou remover do nav clínico), mantendo o motor e os testes intactos — **isso não foi executado nesta RM**, é uma recomendação sujeita a autorização explícita.

---

## 4. Achados de sobreposição (cross-cutting)

Seis páginas fazem essencialmente a mesma coisa — "navegar/buscar evidência ou catálogo de bulas" — com implementações e fontes de dados diferentes e nenhuma ligação entre si: `repositorio`, `biblioteca`, `evidencias`, `evidence`, `farmalib`, `eurofarma`. Isso não impede nenhuma delas de funcionar isoladamente, mas representa custo de manutenção duplicado e risco de divergência de conteúdo entre catálogos (ex.: se uma correção de bula for feita em `biblioteca` mas não em `farmalib`). Esta RM não decide qual consolidar — fica registrado como decisão pendente do produto (§9).

Da mesma forma, `explicar` e `explicabilidade`, e `atualizacoes`/`atualizacoes-cientificas`, são pares conceitualmente sobrepostos (ver §3).

---

## 5. Recomendação de prioridade

### 1 página prioritária para integração real: **`/explicabilidade`**

- **Qual problema clínico ela resolve?** Explicita o racional por trás de uma recomendação terapêutica (por que esta classe, por que esta molécula, o que aconteceria com outra escolha, quais as alternativas e evidências) — ajuda o médico a entender e defender uma conduta diante de um CID específico.
- **Qual dado real consome?** A última anamnese salva no navegador pela consulta real (`useLocalStorage('prescreve_ai_anamnese', ...)`, mesma chave que `AnamneseForm.tsx` grava em `/consulta/nova`), quando existe.
- **Qual resultado produz?** Um `ExplainableAIv2Result`: score de explicabilidade, score de segurança, seção WHY/WHY NOT/WHAT IF, alternativas clínicas, evidências citadas e nível de confiança.
- **Qual decisão pode apoiar?** Se e por que prescrever uma molécula específica para aquele CID, dado o perfil do paciente.
- **Como se comporta sem paciente selecionado?** Usa `DEMO_ANAMNESE` (perfil fictício) como fallback, mostra "Modo demonstração — dados simulados" e (desde a RM-59) o `DemoDataNotice` variante `hybrid`.
- **Qual o risco de apresentar informação incorreta?** Médio: hoje o CID é escolhido manualmente por um seletor fixo (I10/E11/I50/J45), sem qualquer verificação de que corresponde ao diagnóstico real da anamnese carregada — se a anamnese real for de HAS mas o usuário selecionar J45, o WHY/WHY NOT gerado será para uma condição que não é a do paciente. Isso precisa ser endereçado nos critérios de aceite (§6), não apenas na integração.

### 2 páginas candidatas futuras

1. **`/segunda-opiniao`** — o fluxo já pede exatamente "qual condição, qual conduta você escolheu" como entrada manual; mapear automaticamente a partir do `diagnostico_selecionado`/`plano_terapeutico` da consulta ativa transformaria a página de "treino/simulação" em "segunda opinião real sobre este caso". Exige criar um mapeamento entre a classe terapêutica real escolhida e os IDs de `CondutaOpcao` do motor (trabalho de mapeamento de dados, não de motor novo).
2. **`/comparador`** — pré-preencher as colunas A/B com a molécula prescrita e uma alternativa da mesma classe (quando a consulta ativa tiver um plano terapêutico definido) daria contexto imediato ("por que esta e não aquela") sem exigir nenhuma mudança no motor de comparação, só popular o estado inicial.

### Páginas que devem permanecer demonstrativas

`insights`, `governanca`, `rwe`, `rede-medica`, `prognostico`, `farma-analytics`, `medicina-precisao`, `atualizacoes-cientificas` (até decisão de consolidação) — nenhuma tem caminho de integração de baixo esforço; todas dependem de dado que o sistema não coleta hoje (volume real de eventos, workflow editorial real, ou fonte de dado externa como genótipo).

### Páginas a considerar para remoção/arquivamento

`comite`, `validacao-real`, `qualidade-hospital` — maior risco de interpretação enganosa (credenciais/estatísticas fabricadas apresentadas com rigor formal) e menor valor clínico direto do lote inteiro. `validacao-clinica` — não é uma página clínica, é um dashboard de QA que não deveria estar no menu do médico. Nenhuma foi removida nesta sessão; a decisão final é do dono do produto (§9).

---

## 6. Critérios de aceite para a futura integração de `/explicabilidade`

1. Quando existir uma consulta ativa (`useApp()`/`state.activeConsultation`) com `diagnostico_selecionado` definido, o CID deve ser alimentado automaticamente a partir dela; o seletor manual de CID passa a ser um override explícito, não o caminho padrão.
2. Quando a consulta ativa tiver um `plano_terapeutico` com ao menos uma molécula, essa molécula substitui o atual `plano.farmacologico[0]` (hoje sempre a primeira do catálogo estático da condição).
3. Sem consulta ativa e sem anamnese salva, o comportamento demo atual (com `DemoDataNotice`) permanece inalterado.
4. A página deve indicar explicitamente qual fonte alimentou o resultado exibido — "consulta ativa", "anamnese salva" ou "demonstração" — não apenas o aviso genérico atual de dado demonstrativo.
5. Se o CID da consulta ativa não tiver um plano terapêutico mapeado no motor (`getTherapeuticForCondition` retorna `null`), a página deve comunicar isso claramente, nunca cair silenciosamente no fallback demo sem avisar.
6. Testes automatizados novos cobrindo pelo menos: (a) consulta ativa presente → usa dado real; (b) sem consulta ativa mas com anamnese salva → comportamento atual preservado; (c) nenhum dos dois → fallback demo; (d) CID sem plano mapeado → mensagem explícita, não fallback silencioso.
7. Gates completos (`tsc`, lint, suite de testes, build, RM-23/RM-24/RM-49) passando antes de considerar a integração concluída.
8. Aprovação explícita do dono do produto antes de remover ou ocultar o seletor manual de CID — pode ser preferível mantê-lo como override mesmo após a integração.

---

## 7. Riscos

- **`explainable-ai-v2.ts` não tem nenhum arquivo de teste dedicado** hoje. Antes de se tornar fonte alimentada por dado real de paciente, merece a mesma cobertura de regressão que os demais motores clínicos (`dose-calculator.ts`, `pediatric-engine.ts`, etc. têm thresholds de cobertura configurados; `explainable-ai-v2.ts` não tem nenhum).
- Pacientes com múltiplas comorbidades/CIDs ativos geram ambiguidade sobre qual CID priorizar automaticamente — não é uma decisão trivial de engenharia, é uma decisão clínica/de produto.
- Risco de confusão do usuário durante a transição entre "modo híbrido atual" (anamnese salva) e "modo integrado" (consulta ativa) se a UI não deixar claro qual fonte está em uso (endereçado no critério de aceite 4).
- Os achados de risco reputacional/legal de `comite` e `validacao-real` (credenciais e estatísticas fabricadas) não são exclusivos desta RM — foram introduzidos em fases anteriores do produto (badges "Phase 15/16" no registro de navegação) e persistem até haver decisão explícita do dono do produto.

## 8. Nota específica de risco — credenciais e estatísticas fabricadas

`comite` apresenta especialistas fictícios com **CRM e ORCID fabricados** (`Especialista` inclui campos `crm`, `uf_crm`, `orcid`, `titulacao`, `instituicao`) como se fossem membros reais de um comitê científico. `validacao-real` apresenta hospitais, validadores e casos fictícios com métricas estatísticas reais (Kappa de Cohen/Fleiss, IC95%) como se representassem um estudo de validação médica multicêntrico real. `qualidade-hospital` apresenta ranking de hospitais fictícios com nomes que soam institucionais. Estes três casos são qualitativamente diferentes de "dado demonstrativo" comum (como um paciente fictício de exemplo) porque simulam **identidades e credenciais formais** (registro profissional, afiliação institucional, rigor estatístico de um estudo real) — o tipo de conteúdo que, se mal-entendido, pode ser tomado como endosso institucional real. A RM-59 já sinaliza essas três páginas com `DemoDataNotice`, mas esta RM registra que a sinalização visual pode não ser suficiente dado o nível de detalhe fabricado (CRM com formato válido, DOI-like statistics) — recomenda-se avaliação específica do dono do produto/jurídico, não apenas UX.

## 9. Esforço relativo (ordem de grandeza, não estimativa de horas)

| Item | Esforço relativo | Motivo |
|---|---|---|
| Integrar `/explicabilidade` (piloto) | **Médio** | Motor já pronto e no formato certo; principal trabalho é mapeamento de dados + testes novos + indicador de fonte na UI |
| Integrar `/segunda-opiniao` | Médio-alto | Precisa de tabela de mapeamento classe-terapêutica → `CondutaOpcao.id` que não existe hoje |
| Integrar `/comparador` (pré-preenchimento) | Baixo | Só popular estado inicial; motor não muda |
| Consolidar páginas de catálogo/evidência (6 páginas) | Alto | Decisão de produto primeiro; depois trabalho de migração de dados e remoção de rotas |
| Resolver risco de `comite`/`validacao-real`/`qualidade-hospital` | Baixo (técnico) / Alto (decisão) | Tecnicamente é remover/reescrever texto; a parte difícil é a decisão de produto/jurídica |
| Cobrir `explainable-ai-v2.ts` com testes dedicados | Médio | Nenhum teste existe hoje; motor tem 6 seções (WHY/WHY NOT/WHAT IF/alternativas/evidências/confiança) a cobrir |

## 10. Decisões que precisam do proprietário do produto

_Legenda: ✅ = decidido e executado, com RM e data. Itens sem marca continuam em aberto._

1. ✅ `comite`: remover credenciais fabricadas (CRM/ORCID) ou arquivar a página inteira? → **Remover credenciais fabricadas, manter a página.** Executado em `docs/RM-70-DEMO-PAGE-DECISIONS.md` (2026-08-04).
2. ✅ `validacao-real`: arquivar, ou investir no programa real de validação multicêntrica que a página finge existir? → **Arquivar do menu clínico.** Executado em RM-70 (2026-08-04).
3. ✅ `qualidade-hospital`: arquivar, ou redesenhar sem nomes/rankings que soem institucionais reais? → **Arquivar do menu clínico.** Executado em RM-70 (2026-08-04).
4. ✅ `validacao-clinica`: mover para rota interna/QA, fora do menu do médico, ou manter como está? → **Removida do menu clínico.** Executado em RM-70 (2026-08-04).
5. ✅ Consolidar `repositorio`/`biblioteca`/`evidencias`/`evidence`/`farmalib`/`eurofarma` (6 páginas de catálogo/evidência sobrepostas) em quantas páginas? → **Resultado final: 5 páginas** (não 4, como a contagem-alvo original do RM-74 previa). Executado em `docs/RM-80-CATALOG-EVIDENCE-FINAL-DECISIONS.md` (2026-08-05): reconciliação item a item de `/repositorio` (14 citações) contra `EVIDENCE_DB` revelou conteúdo real exclusivo (Pneumonia/J18 sem categoria equivalente, UKPDS 33, COPERNICUS) que migrar com segurança exigiria fabricar estatística de estudo sem fonte verificada — `/repositorio` e `/evidence` foram **diferenciadas, não fundidas** (mesmo padrão do item 6). `/farmalib` → `/biblioteca` foi executada com segurança (mesma fonte de dado, sem duplicação) e corrigiu de quebra uma lista hardcoded incompleta já existente em `/biblioteca`.
6. ✅ Fundir ou diferenciar explicitamente `explicar` vs. `explicabilidade`? → **Diferenciar** — investigação mostrou que resolvem problemas diferentes (biblioteca por condição vs. explicabilidade por paciente), a sobreposição era só de nome. Executado em `docs/RM-71-EXPLICAR-VS-EXPLICABILIDADE.md` (2026-08-04): labels de menu e títulos de página ajustados, nenhum motor tocado.
7. ✅ Fundir ou diferenciar explicitamente `atualizacoes` vs. `atualizacoes-cientificas`? → **Consolidar em `/atualizacoes`** — aqui a sobreposição era real (não só de nome): a aba "Diretrizes ativas" duplicava conteúdo mais raso do que `/atualizacoes` já cobre, e a aba "Alertas" simulava monitoramento de 15 sociedades sem nenhuma integração real por trás. Executado em `docs/RM-72-ATUALIZACOES-CONSOLIDATION.md` (2026-08-04): `/atualizacoes-cientificas` removida do menu (não do código).
8. ✅ Investir em coleta de dado longitudinal real para eventualmente integrar `digital-twin`, ou mantê-lo demonstrativo permanentemente? → **Fica demonstrativo permanentemente** — sem caminho de baixo esforço (precisaria de persistência de série temporal que não existe). Confirmado em `docs/RM-75-DIGITAL-TWIN-PRECISION-MEDICINE.md` (2026-08-04); nenhuma mudança de código (classificação já estava correta).
9. ✅ Investir em integração com laboratório de genotipagem para eventualmente integrar `medicina-precisao`, ou mantê-lo demonstrativo permanentemente? → **Achado que mudou a pergunta**: a página já é uma calculadora real (genótipo editável + evidência CPIC com DOI real) — só falta a importação automática de laboratório. Reclassificada de `demonstracao` para `hibrido` em `docs/RM-75-DIGITAL-TWIN-PRECISION-MEDICINE.md` (2026-08-04); integração de laboratório continua não construída.
10. ✅ Definir explicitamente o escopo de `copilot` (ferramenta de auxílio à redação vs. algo mais autônomo) antes de qualquer integração futura. → **Ferramenta de auxílio à redação.** Executado em `docs/RM-73-COPILOT-SCOPE.md` (2026-08-04): label do menu, título e novo banner de aviso na página reforçam que todo conteúdo é rascunho a revisar/editar, nunca uso direto. Nenhuma integração com dado real foi construída.
11. ✅ Aprovar (ou não) a integração piloto de `/explicabilidade` descrita nesta RM, incluindo se o seletor manual de CID deve ou não ser removido após a integração. → **Aprovado.** A integração já havia sido implementada e testada em `docs/RM-65-REAL-CLINICAL-PAGE-INTEGRATION.md` (14 testes dedicados, todos os 8 critérios de aceite do §6 cumpridos), mas ficava formalmente pendente da aprovação explícita exigida pelo critério de aceite 8. Dono do produto aprovou em 2026-08-04, incluindo manter o seletor manual de CID como override (não removido).

**As 11 decisões deste §10 estão fechadas** (2026-08-04). Ver RM-70 a
RM-75 para a execução de cada uma. Trabalho futuro combinado que ficou
explicitamente registrado, não executado: reconciliação de dado entre
`/repositorio`↔`/evidence` e `/farmalib`↔`/biblioteca` (item 5, RM-74);
consolidação de `/explicar`↔`/explicabilidade` permanece "diferenciar",
não fundir (item 6, RM-71); persistência longitudinal para `/digital-twin`
e integração de laboratório para `/medicina-precisao` permanecem fora de
escopo (itens 8/9, RM-75).

---

## Validação executada

Nenhuma alteração de código de produção foi feita nesta RM (somente este documento e a leitura/investigação de arquivos existentes). Os gates abaixo foram executados apenas para confirmar que a criação deste documento **não** introduziu nenhum problema:

- `npx tsc --noEmit` — ✅ sem erros (nenhum arquivo `.ts`/`.tsx` foi alterado).
- `git status` — confirma que o único artefato novo é `docs/RM-60-SCIENTIFIC-INTELLIGENCE-ROADMAP.md`.

Não foi necessário rodar lint, suite de testes, cobertura ou build completos, pois nenhum arquivo de código-fonte foi alterado — apenas leitura e um novo documento Markdown.

---

## Arquivos alterados

**Novo:**
- `docs/RM-60-SCIENTIFIC-INTELLIGENCE-ROADMAP.md` (este relatório)

Nenhum arquivo de código (`frontend/src/**`) foi criado, alterado ou removido nesta RM. Nenhuma página foi integrada a `useApp()`. Nenhum motor clínico, de dose, protocolo, segurança, farmacológico ou backend foi alterado. Nenhuma página foi removida ou arquivada — apenas recomendada para avaliação do dono do produto.
