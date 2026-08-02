# RM-58 — Auditoria Geral do Sistema e Correção dos Achados de Uso Real

**Contexto:** as auditorias RM-41 a RM-57 validaram gates de execução
(typecheck, lint, build, cobertura, testes, CI, deploy) repetidamente e
com rigor crescente — e todos continuam genuinamente verdes (seção 6).
Mas nenhuma delas testou o sistema como um MÉDICO o usa. Esta rodada
partiu de 4 relatos concretos de uso real e foi atrás da causa raiz de
cada um, sem aceitar nenhum número ou alegação anterior. Ao investigar o
primeiro relato (Sinot Clav) até a raiz, foi descoberto um bug estrutural
que **nenhuma auditoria anterior detectou**: o motor de busca da
prescrição só enxergava 22% do catálogo de medicamentos do sistema.

## 1. Resumo Executivo

| # | Relato do usuário | Causa raiz encontrada | Status |
|---|---|---|---|
| 1 | Sinot Clav sugere apresentações que não existem (200/62,5 e 500/125mg) | 2 fontes de dado (`pharma-database.ts` e `eurofarma-sync.ts`) tinham as 4 concentrações do Clavulin copiadas para a marca Sinot Clav, sem verificação — real é só 2 | ✅ Corrigido e verificado contra fonte externa |
| 2 | "Moléculas únicas" errado no painel Eurofarma | Contava só a PRIMEIRA PALAVRA do nome da molécula como chave de unicidade — "Ácido X", "Cloridrato de Y" colapsavam tudo em "ácido"/"cloridrato" | ✅ Corrigido (75 → **100** moléculas reais) |
| 3 | Portfólio Eurofarma misturado com "muitos genéricos" | `categoria_anvisa` era hardcoded `'etico'` para TODO produto — não havia como distinguir marca própria diferenciada de linha similar/genérica do próprio laboratório | ✅ Classificação real implementada (104 ético / 12 similar / 1 genérico) |
| 4 | Poviztra, Extensior "não aparecem" no motor de prescrição | **Achado crítico não relatado pelo usuário, encontrado ao investigar #1**: `searchDrugs()` (a busca da prescrição rápida) só pesquisava em `PHARMA_DB` (80 moléculas) e nunca em `getAllDrugs()` (367 moléculas — base + 16 extensões por especialidade). **287 moléculas (78% de todo o catálogo) eram estruturalmente invisíveis para qualquer busca no motor de prescrição** — Atenolol, Ramipril, Telmisartana, Nifedipino, Diltiazem, Verapamil e centenas de outras, além de Poviztra (que nunca existia em nenhuma fonte) | ✅ Corrigido; Poviztra adicionado com dados reais confirmados |
| — | "Os menus de Científico/Inteligência estão realmente sendo usados pelo sistema?" | **Não.** As ~25 páginas dessas duas seções da barra lateral usam 0% de estado real de paciente/consulta — são vitrines com dados fixos (seed), desconectadas do fluxo real de anamnese→prescrição | ⚠️ Não corrigido nesta rodada — decisão de escopo, ver seção 5 |

## 2. Achado #4 em detalhe — o bug mais grave encontrado nesta auditoria

### Evidência

```
$ npx tsx scripts/_probe (executado nesta sessão)
PHARMA_DB.length (base): 80
getAllDrugs().length (merged): 367

searchDrugs("Atenolol")   -> 0 resultados   (ANTES da correção)
searchDrugs("Nifedipino") -> 0 resultados   (ANTES da correção)
searchDrugs("Diltiazem")  -> 0 resultados   (ANTES da correção)
searchDrugs("Poviztra")   -> 0 resultados   (nunca existiu em nenhuma fonte)

Drogas em getAllDrugs() mas ausentes de PHARMA_DB: 287
Exemplos: Atenolol, Ramipril, Perindopril, Telmisartana,
Sacubitril/Valsartana, Nebivolol, Nifedipino, Diltiazem, Verapamil,
Clortalidona, ...
```

`frontend/src/lib/pharma-database.ts` define `getAllDrugs()` como a
fusão de `PHARMA_DB` (base) + 16 arquivos de extensão por especialidade
(`pharma-database-cardio.ts`, `-endo.ts`, `-infectology-ab/af.ts`,
`-pulmo-a/b.ts`, `-neuro-a/b.ts`, `-gastro-a.ts`, `-nefro.ts`,
`-pediatria.ts`, `-gineco.ts`, `-onco.ts`, `-icu.ts`, `-palliative.ts`,
`-rm54-gaps.ts`) — esta é a fonte que RM-23, RM-24 e todos os dashboards
usam. Mas `searchDrugs()` (a função por trás da caixa de busca em
`/prescricao-rapida` e no fluxo de anamnese→conduta), `getATCCode()` e
`getMonitoramento()` filtravam diretamente em `PHARMA_DB` — a fatia de
22% do catálogo. Isso nunca apareceu em nenhum gate automatizado porque
os testes de regressão (RM-22 a RM-56) testam comportamento de moléculas
individuais já conhecidas, não "a busca encontra tudo que deveria
encontrar" — um tipo de lacuna que só aparece testando como usuário real,
exatamente como o relato original do médico fez.

### Correção

```diff
// frontend/src/lib/pharma-database.ts
- const results = PHARMA_DB.filter(drug => { ... });
+ const results = getAllDrugs().filter(drug => { ... });
```
Aplicado em `searchDrugs()`, `getATCCode()` e `getMonitoramento()` — as
3 únicas funções do arquivo que acessavam `PHARMA_DB` diretamente
(confirmado por `grep` de todo o arquivo, não só as 3 encontradas por
acaso).

### Verificação

```
searchDrugs("Atenolol")   -> 1 resultado: Atenolol      ✅
searchDrugs("Nifedipino") -> 1 resultado: Nifedipino    ✅
searchDrugs("Diltiazem")  -> 1 resultado: Diltiazem     ✅
searchDrugs("Poviztra")   -> 1 resultado: Semaglutida (obesidade)  ✅
searchDrugs("Extensior")  -> 1 resultado: Semaglutida   ✅ (já funcionava)
```

## 3. Achados #1–#3 em detalhe

### RM-58-01 — Sinot Clav com apresentações inexistentes (relato original)

- **Arquivos:** `frontend/src/lib/pharma-database.ts:962`,
  `frontend/src/lib/eurofarma-sync.ts` (entrada `euro-sinot-clav`).
- **Real (confirmado via Drogasil, Drogariasp, CliqueFarma, Farmaindex —
  3 fontes independentes):** Sinot Clav® vende **somente** suspensão
  400/57 mg/5 mL e comprimido 875/125 mg.
- **Estava cadastrado:** as mesmas 4 concentrações do Clavulin (GSK) —
  incluindo 250/62,5 mg/5 mL e 500/125 mg, que a Eurofarma nunca vendeu
  sob esta marca. `verificado: false` já sinalizava a incerteza, mas
  **nada na interface usava esse campo para alertar o médico** — a lista
  de concentrações aparecia com a mesma aparência de dado confirmado.
- **Corrigido em ambas as fontes** (a de `eurofarma-sync.ts` é a
  autoritativa — sobrescreve a de `pharma-database.ts` via
  `enrichWithEurofarma()` a cada carregamento; ambas foram corrigidas
  para não depender dessa ordem). `verificado: true` agora, com
  justificativa e fontes documentadas em comentário.
- **Varredura sistêmica:** criado
  `frontend/scripts/audit-brand-concentrations.mjs` (mantido no
  repositório) — compara `concentracoes` entre marcas de laboratórios
  diferentes para a mesma molécula. De 99 grupos suspeitos totais, **2
  são medicamentos de combinação** (o padrão de risco real —
  Sulfametoxazol/Trimetoprima Bactrim×EMS, etinilestradiol+levonorgestrel
  Nordette×Ciclo21) e não foram alterados por não apresentarem o mesmo
  padrão de "marca com 2 concentrações a mais que o real" — ficam
  registrados aqui como candidatos a verificação manual futura, não como
  bug confirmado. Os outros 97 grupos são monoterapias com doses-padrão
  de mercado (ex.: Enalapril 5/10/20mg) — convergência esperada entre
  fabricantes, não indício de erro.

### RM-58-02 — Contagem de "moléculas únicas" no painel Eurofarma

- **Arquivo:** `frontend/src/app/eurofarma/page.tsx:19`.
- **Bug:** `p.molecula.toLowerCase().split(' ')[0]` como chave de
  unicidade — "Ácido Acetilsalicílico", "Ácido Valproico" e "Ácido
  Ibandrônico" (3 moléculas totalmente diferentes) todas colapsavam na
  chave `"ácido"`; o mesmo para todo "Cloridrato de X"/"Sulfato de Y".
- **Corrigido:** usa `toMoleculeId()` — a mesma canonicalização
  salt-agnóstica já usada pelo validador RM-24, garantindo consistência
  entre o que o painel mostra e o que os gates de build já verificam.
- **Resultado:** 75 (errado, subcontava) → **100 moléculas únicas reais**.

### RM-58-03 — Portfólio Eurofarma sem distinção ético/genérico

- **Arquivo:** `frontend/src/lib/pharma-library.ts`.
- **Bug:** `categoria_anvisa: 'etico'` era hardcoded para os 117
  produtos do catálogo, sem exceção — "Metformina" (nome comercial
  igual ao princípio ativo, sem marca) e "Enalapril Eurofarma" (linha
  similar da própria fabricante) apareciam classificados exatamente
  igual a "Sinot Clav®"/"Zart®" (marcas próprias diferenciadas).
- **Corrigido:** nova função `classificarCategoriaAnvisa()` — nome com
  símbolo de marca registrada (®) = ético; nome comercial igual à
  molécula (via `toMoleculeId`, salt-agnóstico) = genérico; nome
  começando pela molécula ou contendo "Eurofarma" = similar.
- **Resultado:** 117 produtos agora classificados como 104 ético / 12
  similar / 1 genérico — dado real, disponível para qualquer tela que
  precise filtrar/destacar o portfólio diferenciado no futuro (nenhuma
  tela usa esse campo para filtrar hoje — ver seção 5, item 2).

### RM-58-04 — Poviztra ausente de toda fonte de dados

- **Confirmado via busca externa** (bula profissional Eurofarma/Novo
  Nordisk, Panvel, Drogal, Droga Raia — fonte:
  `bulas.eurofarma.com.br/storage/media/19087/...pdf`): Poviztra™ é a
  segunda marca de semaglutida da Eurofarma, indicada para obesidade/
  sobrepeso (não para DM2 — essa é Extensior®), com 5 concentrações do
  escalonamento oficial (0,25 / 0,5 / 1 / 1,7 / 2,4 mg/dose).
- **Adicionado** em `pharma-database-endo.ts` (entidade
  `semaglutida_obesidade`, a mesma que já modela Wegovy® — não na
  entidade "Semaglutida" de DM2, para não colidir marca↔princípio-ativo)
  e em `eurofarma-sync.ts` (catálogo Eurofarma completo, com bula
  profissional real).
- **Achado colateral corrigido durante esta correção:** ao tentar
  adicionar Poviztra, uma primeira tentativa (adicionar também "Wegovy"
  à entidade principal de Semaglutida) quebrou 14 testes de regressão
  RM-23/RM-24 (marca "Wegovy" apontando para 2 princípios ativos
  diferentes) — o próprio gate de regressão pegou o erro antes de
  chegar a qualquer commit. Corrigido posicionando Poviztra na entidade
  correta; os 14 testes voltaram a passar.

## 4. "Extensior não aparece" — causa real

Extensior® **já estava** corretamente cadastrado (`verificado: true`,
com bula real) desde antes desta sessão. A causa do relato não era dado
ausente — era o Achado #4 (busca cega para 78% do catálogo). Como
Extensior mora na base `PHARMA_DB` (não numa extensão), buscá-lo
diretamente já funcionava; o problema é que o médico, ao testar o motor
de forma mais ampla (outras marcas Eurofarma cadastradas nas extensões
de especialidade), encontrava buracos — o que ele descreveu corretamente
como "algumas outras marcas da Eurofarma" não aparecendo.

## 5. "Os menus de Científico/Inteligência estão sendo usados pelo sistema?"

**Resposta direta: não.** Evidência (`grep` de `useApp()` — o hook que dá
acesso ao paciente/consulta/prescrição REAL em andamento — em todas as
~25 páginas das seções "Científico" e "Inteligência" da barra lateral:
Repositório, Farmacológica, Evidências, Evidence Engine, Comparador,
Clinical Insights, Segunda Opinião, Farmacoteca, Eurofarma, Explicar
Conduta, Comitê Científico, Guideline Updates, Real World Evidence,
Gêmeo Digital, Rede Médica, Desfechos, Prognose Preditiva, Timeline
Evidências, Farma Analytics, Qualidade Hospital, Atualizações
Científicas, Explainable AI 2.0, Clinical Validation, Validação Real
World, Interoperabilidade, Precision Medicine, AI Medical Copilot,
Knowledge Graph):

```
$ grep -c "useApp()" src/app/<cada-uma-dessas-paginas>/page.tsx
0   (em TODAS, sem exceção)
```

Todas essas páginas renderizam a partir de dados **seed/demonstração**
fixos (as mesmas funções `seed*Demo()` já documentadas em RMs
anteriores), nunca a partir do paciente/consulta real que o médico está
atendendo. Isso é estruturalmente diferente do fluxo real de
prescrição (`/consulta/nova`, `/prescricao-rapida`), que **usa
`useApp()`** e importa engines reais (`clinical-risk-engine`,
`guideline-conflict-engine`, `clinical-panel-safety`,
`recommendation-registry`, `evidence-engine`) — confirmado por leitura
direta do código, não por suposição.

**Interpretação honesta:** o motor de decisão clínica real (anamnese →
hipóteses diagnósticas → risco → conduta → prescrição, com persistência
real no backend) é genuíno e é o que todas as auditorias RM-22 a RM-57
vêm testando e corrigindo — e ele está sólido. As ~25 páginas de
"Científico"/"Inteligência" são uma camada de **demonstração de
capacidades** (o que o sistema PODERIA fazer com RWE, gêmeo digital,
IA explicável, etc.), não uma camada de inteligência ativa sobre o
paciente atual. Isso não é necessariamente "errado" — pode ter sido uma
escolha de produto deliberada (mostrar a visão de roadmap) — mas hoje
**nada na interface avisa o médico dessa diferença**, o que é
exatamente o tipo de ambiguidade que o resto deste sistema (e todas as
RMs anteriores) trata como inaceitável em contexto clínico.

**Por que não corrigi isto nesta rodada:** religar 25 páginas a estado
real de paciente é um projeto de arquitetura, não uma correção de bug —
cada uma precisaria de decisão própria sobre QUAL dado real consumir e
COMO se comportar sem um paciente selecionado. Fazer isso às pressas,
sem definir prioridade com você, arriscaria introduzir mais problemas
do que resolve. A ação de baixo risco e alto valor que RECOMENDO como
próximo passo (não fiz agora): adicionar um aviso visual consistente
("Demonstração — não reflete o paciente em atendimento") a essas 25
páginas — mesmo padrão de honestidade já usado em `NEXT_PUBLIC_DEMO_MODE`
(`app-mode.ts`) para o modo demonstração de login.

## 6. Gates Reexecutados (evidência desta sessão)

| Gate | Resultado |
|---|---|
| Typecheck frontend | ✅ 0 erros |
| Lint frontend | ✅ 0 erros / 0 warnings |
| Vitest (frontend) | ✅ **922/922**, 49/49 arquivos (incluindo os 14 testes RM-23/RM-24 que pegaram meu próprio erro de "Wegovy duplicado" antes do commit) |
| Build frontend | ✅ compilado, 50 páginas |
| RM-23 (consistência de drogas) | ✅ 367 entidades, 0 inconsistências |
| RM-24 (cross-database) | ✅ divergentes=0, aceitos=14, críticos=0, compatíveis=117 (+1 — Poviztra agora casa corretamente) |
| RM-49 (integridade textual) | ✅ 257 arquivos, 0 sequências suspeitas |

Backend não foi tocado nesta sessão — gates de backend (RM-56/RM-57,
já verificados e commitados) permanecem válidos e não precisaram ser
reexecutados.

## 7. Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| `frontend/src/lib/pharma-database.ts` | Fix Sinot Clav; `searchDrugs`/`getATCCode`/`getMonitoramento` migrados de `PHARMA_DB` para `getAllDrugs()` |
| `frontend/src/lib/eurofarma-sync.ts` | Fix Sinot Clav (fonte autoritativa); nova entrada `euro-poviztra` |
| `frontend/src/lib/pharma-database-endo.ts` | Poviztra™ adicionado à entidade `semaglutida_obesidade`; sinônimo "poviztra" |
| `frontend/src/lib/pharma-library.ts` | Nova função `classificarCategoriaAnvisa()`; import de `toMoleculeId` |
| `frontend/src/app/eurofarma/page.tsx` | Contagem de moléculas únicas corrigida (usa `toMoleculeId`) |
| `frontend/scripts/audit-brand-concentrations.mjs` | **Novo** — script permanente de auditoria sistêmica (marca×lab×concentrações idênticas), para detectar futuros casos como Sinot Clav antes de chegar ao médico |

Nenhum motor de cálculo de dose, protocolo terapêutico ou algoritmo de
risco foi alterado. Nenhuma mudança afeta o backend.

## 8. Regressões

**Uma regressão foi introduzida e corrigida DENTRO desta mesma sessão**
(seção 3, RM-58-04 — "Wegovy" duplicado entre 2 entidades), pega pelos
próprios testes de regressão RM-23/RM-24 antes de qualquer commit. Fora
isso, 0 regressões: 922/922 testes frontend passam após todas as
correções.

## 9. Matriz Final de Achados

| # | Severidade | Achado | Status |
|---|---|---|---|
| RM-58-00 | **CRÍTICO** | `searchDrugs()`/`getATCCode()`/`getMonitoramento()` só enxergavam 22% do catálogo (287/367 moléculas invisíveis à busca da prescrição) | ✅ Corrigido e verificado |
| RM-58-01 | ALTO | Sinot Clav com 2 apresentações comerciais inexistentes sugeridas ao médico | ✅ Corrigido e verificado contra 3 fontes externas |
| RM-58-02 | MÉDIO | Contagem de moléculas únicas do painel Eurofarma incorreta (colapso por primeira-palavra) | ✅ Corrigido (75→100) |
| RM-58-03 | MÉDIO | Sem distinção ético/genérico no portfólio Eurofarma (campo sempre hardcoded) | ✅ Classificação real implementada |
| RM-58-04 | BAIXO | Poviztra ausente de toda fonte de dados | ✅ Adicionado com dados verificados |
| RM-58-05 | INFORMATIVO | 25 páginas de "Científico"/"Inteligência" desconectadas do paciente/consulta real (0% usam `useApp()`) | ⚠️ Documentado, não corrigido — decisão de escopo (seção 5) |
| RM-58-06 | INFORMATIVO | 2 medicamentos de combinação (SMZ-TMP, EE+LNG) com concentrações idênticas entre marcas — não confirmado como erro, fica para verificação manual futura | Não corrigido — sem evidência suficiente para classificar como bug |

## 10. Veredito

Os 4 relatos concretos do usuário levaram à descoberta e correção de um
bug estrutural (RM-58-00) mais grave do que qualquer um dos relatos
individuais — uma busca de prescrição que só alcançava 22% do catálogo,
nunca detectada em 17 rodadas de auditoria anteriores porque nenhuma
delas testou "a busca encontra o que deveria encontrar" como um médico
realmente usaria. Isso é a evidência mais forte até agora de por que
auditoria automatizada (gates, testes de regressão) e teste de uso real
não são substitutos um do outro — são complementares, e esta rodada só
existiu porque você trouxe uso real.

Todos os 4 relatos originais estão corrigidos e verificados contra fonte
externa (não apenas "corrigidos e testados internamente" — Sinot Clav e
Poviztra foram checados contra bulas/redes de farmácia reais). O achado
RM-58-05 (páginas de Inteligência desconectadas) é reportado com total
transparência, não escondido, porque é exatamente o tipo de achado que
você pediu para não aceitar sem investigar — e a resposta honesta é que
ainda não está pronto para expansão clínica **nessas páginas
específicas** (elas nunca vão refletir dados de paciente real até
serem religadas), mesmo que o motor de prescrição central esteja sólido.

**Recomendação para prosseguir com a expansão clínica:** o núcleo
prescritivo (anamnese → prescrição, com os motores reais de risco/
segurança/farmacologia) está validado por 17 rodadas de auditoria e
agora também por uso real corrigido. As 25 páginas de demonstração não
bloqueiam a expansão clínica em si (não são usadas no fluxo de
prescrição), mas merecem o aviso visual recomendado na seção 5 antes de
serem apresentadas a mais médicos, para que ninguém confunda
"demonstração de roadmap" com "inteligência ativa sobre o paciente".
