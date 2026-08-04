# RM-65 — Integração Clínica Real da Página Prioritária

## Pré-condição confirmada

O RM-60 ([`docs/RM-60-SCIENTIFIC-INTELLIGENCE-ROADMAP.md`](RM-60-SCIENTIFIC-INTELLIGENCE-ROADMAP.md))
já havia sido executado nesta sessão e classificou explicitamente **`/explicabilidade`**
como `INTEGRAR` (a única página com essa classificação entre as 30 investigadas),
com justificativa objetiva: é a única página do lote "Científico/Inteligência"
que já lê um canal de dado real (`useLocalStorage('prescreve_ai_anamnese', ...)`,
a mesma chave gravada por `AnamneseForm.tsx` no fluxo real `/consulta/nova`), e o
motor por trás dela (`explainable-ai-v2.ts`) já recebe `(molécula, CID, anamnese)`
como entrada estruturada — não confirmado por suposição, mas relido diretamente do
relatório RM-60 (§3 "Classificação — evidências e justificativa") antes de iniciar
qualquer código.

## Página escolhida e motivo

**`/explicabilidade`** — Explainable AI 2.0. Motivo (do RM-60, §5): explicita o
racional clínico por trás de uma recomendação terapêutica (WHY/WHY NOT/WHAT
IF/alternativas/evidências/confiança), ajudando o médico a entender e defender uma
conduta diante de um CID específico — e é a integração de menor esforço relativo
do lote (motor já pronto e no formato certo).

## Investigação obrigatória — mapeamento realizado

| Item | Achado |
|---|---|
| Implementação atual | `frontend/src/app/explicabilidade/page.tsx` — CID sempre escolhido manualmente (padrão fixo `I10`), sempre usava `plano.farmacologico[0]` do protocolo ESTÁTICO daquele CID, nunca a conduta real de nenhuma consulta |
| Dados seed | `DEMO_ANAMNESE` (perfil fictício hardcoded) — usado como fallback quando não há anamnese no localStorage |
| Motores existentes | `explainable-ai-v2.ts` (WHY/WHY NOT/WHAT IF/ALTERNATIVES/Explainability Score — não alterado nesta RM) + `clinical-therapeutics.ts` (`getTherapeuticForCondition`, `PROTOCOLOS`) |
| `useApp()` | **Não era usado** nesta página antes da RM-65 (confirmado no RM-60, §0: grep `useApp(` não retornava `/explicabilidade` entre as 30 páginas investigadas) |
| Paciente/consulta | `state.activeConsultation` (`Consultation`) via `useApp()` — não lido antes desta RM |
| Diagnósticos | `activeConsultation.diagnostico_estruturado.cid` (RM-53/RM41-023) — dado estruturado real, nunca lido por esta página antes |
| Medicamentos | `activeConsultation.plano_terapeutico.farmacologico[]` (`TherapeuticSuggestion[]`) — o plano REAL já calculado por `DiagnosticPanel.tsx` no fluxo `/consulta/nova`, nunca lido por esta página antes |
| Exames | Já cobertos indiretamente pela `Anamnesis.laboratorio`/`funcao_renal`/`funcao_hepatica` consumida por `gerarWHYNOT` — sem mudança no motor, apenas agora alimentada pela anamnese REAL da consulta quando existe |
| Riscos | Fora do escopo desta integração (a página não exibe `risco_calculado`; o motor `explainable-ai-v2.ts` não o consome) — não alterado |
| Prescrições | Fora do escopo — página é consultiva/explicativa, não gera prescrição |
| Estados sem contexto | Antes: sempre demo. Depois: 3 níveis reais — consulta ativa / anamnese salva / demonstração completa, com indicação explícita de qual está em uso |
| Estados de carregamento | `useApp().state.loading` (flag global real do app) — usado para não renderizar prematuramente um estado "sem dado" enquanto o app ainda sincroniza |
| Estados de erro | Novo: `computarExplicabilidade()` captura exceções reais do motor (`gerarExplainableAIv2`) e as distingue de "sem plano mapeado" (que é esperado, não um erro) |

## Definição funcional

1. **Qual pergunta a página responde?** "Por que esta classe/molécula é indicada para este CID, o que a contraindicaria neste paciente, o que aconteceria com outra escolha, quais as alternativas e evidências por trás?"
2. **Quais dados reais utiliza?** Quando há consulta ativa com diagnóstico: `activeConsultation.anamnese` (a anamnese real da consulta) + `activeConsultation.diagnostico_estruturado.cid` + `activeConsultation.plano_terapeutico.farmacologico[0]` (a molécula que o médico realmente conduziu). Sem consulta ativa: a última anamnese salva no navegador (comportamento híbrido pré-existente, preservado).
3. **Quais dados NÃO utiliza?** `risco_calculado`, `seguranca` (SafetyCheck), `prescricao` da consulta — o motor `explainable-ai-v2.ts` não os consome; não foi construída nenhuma integração nova com eles nesta RM (fora do escopo: "transformar UMA página", não expandir o motor).
4. **Qual resultado produz?** Um `ExplainableAIv2Result`: explicação (WHY), restrições de segurança (WHY NOT), comparação de cenários (WHAT IF), alternativas terapêuticas, evidências citadas e um score de explicabilidade — inalterado, motor não tocado.
5. **Natureza do resultado:** predominantemente **informação + comparação**; a aba WHY NOT também produz **alertas** (restrições/contraindicações) quando o perfil clínico os ativa. Nunca uma **hipótese diagnóstica** (a página não diagnostica, consome um diagnóstico já definido em outra etapa) nem uma **recomendação autônoma** (todo o conteúdo é rotulado como CDSS — suporte, decisão médica soberana, texto de disclaimer inalterado).
6. **Como expressa incerteza?** `explainability_score.nivel`/`interpretacao` (já existente, não alterado) + `confiavel_para_prescricao: false` sempre que há contraindicação absoluta ativa ou dados insuficientes — comportamento do motor, agora alimentado por dado real em vez de seed fixo, o que MUDA o valor exibido de acordo com o paciente real (não muda a lógica do score em si).
7. **Como funciona sem paciente/consulta?** Cai para o comportamento híbrido/demo pré-existente — anamnese salva no navegador se houver, senão `DEMO_ANAMNESE`, com aviso `<DemoDataNotice>` explícito indicando a natureza do dado.
8. **Quais limitações devem aparecer?** (a) se a consulta tem diagnóstico mas ainda não tem plano terapêutico definido, mensagem explícita "sem conduta terapêutica mapeada ainda" — nunca cai silenciosamente em demonstração; (b) se o motor lançar uma exceção real, mensagem de erro distinta, nunca uma tela em branco.

## Regras clínicas — como foram respeitadas

- **Não apresentar hipótese como diagnóstico confirmado**: a página nunca gerou hipótese; consome um `diagnostico_estruturado` já confirmado pelo médico em `/consulta/nova` (etapa anterior da jornada). Nenhuma mudança nessa garantia.
- **Não apresentar recomendação genérica como personalizada**: corrigido um problema real pré-existente — o header sempre mostrava `variant="hybrid"` mesmo no modo 100% demonstrativo (sem nenhuma anamnese salva), sugerindo uma personalização parcial que não existia. Agora `DemoDataNotice` usa `variant="demo"` quando é puramente demonstrativo e `variant="hybrid"` só quando há uma anamnese real salva, e um indicador verde dedicado ("Consulta ativa") quando o dado é 100% real da consulta em atendimento.
- **Não inventar evidência**: nenhuma entrada nova foi adicionada a `EVIDENCIA_DB`/`ALTERNATIVAS_DB`/`WHATIF_DB` (`explainable-ai-v2.ts`) — motor intocado.
- **Não usar seed como se fosse dado do paciente**: `DEMO_ANAMNESE` só é usada quando não há nem consulta ativa nem anamnese salva; a fonte em uso é sempre declarada explicitamente na UI (badge/`DemoDataNotice`).
- **Não produzir certeza clínica onde faltam dados**: quando a consulta tem diagnóstico mas nenhum plano terapêutico, a página comunica a lacuna explicitamente (`planoIndisponivel: true` → mensagem dedicada) em vez de silenciosamente computar uma "explicação" para uma molécula que não é a real conduta do médico.
- **Manter rastreabilidade das regras e fontes**: `CID_CONDITION_MAP` documenta inline a correção do bug de mapeamento (ver abaixo); `resolverContextoExplicabilidade`/`computarExplicabilidade` documentam a ordem de prioridade das fontes.
- **Não permitir que a página contorne o motor de segurança**: `gerarWHYNOT` (não alterado) continua sendo a única fonte das restrições exibidas; a integração desta RM só mudou QUAL anamnese/medicamento é passado a ele, nunca sua lógica interna.

## Bug pré-existente corrigido durante a investigação

A investigação do mapeamento CID→protocolo revelou que `I50` (Insuficiência
Cardíaca) apontava para a chave `'ic'`, que **nunca existiu** em `PROTOCOLOS`
(`clinical-therapeutics.ts`) — a chave real é `'icc'`. Isso significava que
selecionar "I50 — Insuficiência Cardíaca" no seletor manual da página **sempre**
caía silenciosamente em "nenhuma recomendação disponível", desde que essa opção
foi adicionada. `I25` (Doença Arterial Coronariana) tinha o mesmo problema,
apontando para `'dac'` — uma chave que também nunca existiu; removida do mapa em
vez de inventar um protocolo novo (fora do escopo desta RM). Isso não é uma regra
clínica nova: é a correção de um erro de digitação/wiring que impedia o acesso a
um protocolo já real e existente.

## Dados reais utilizados

- `useApp().state.activeConsultation` (paciente/consulta em atendimento).
- `activeConsultation.diagnostico_estruturado.cid` (diagnóstico estruturado real, RM-53/RM41-023).
- `activeConsultation.anamnese` (a anamnese real desta consulta especificamente — não mais o localStorage genérico quando há consulta ativa, eliminando um risco de vazamento entre pacientes: o localStorage `'prescreve_ai_anamnese'` é uma chave global do navegador, não por consulta).
- `activeConsultation.plano_terapeutico.farmacologico[0]` (a molécula real que o médico conduziu nesta consulta, calculada por `DiagnosticPanel.tsx` via `getTherapeuticForCondition`).
- `useApp().state.loading` (estado de carregamento global real).

## Dados demonstrativos removidos

- O `DEMO_ANAMNESE` **não foi removido** — continua sendo o fallback de último
  recurso quando não há nem consulta ativa nem anamnese salva. Removê-lo
  eliminaria o modo de demonstração da página para visitantes/onboarding sem
  paciente, o que não foi pedido nem é desejável (RM-65: "se parte da página
  continuar demonstrativa, sinalizar claramente" — não "eliminar toda
  demonstração").
- O que foi removido foi o **uso enganoso do dado demonstrativo**: antes, mesmo
  no modo 100% demo, o header sempre exibia `variant="hybrid"` (que sugere um
  dado parcialmente real). Agora a variante reflete com precisão a fonte real
  (`demo` vs. `hybrid` vs. o novo indicador `consulta_ativa`).
- O seletor manual de CID **não foi removido** (critério de aceite RM-60 §6.8:
  requer aprovação explícita do dono do produto antes de remover) — foi
  reclassificado como um override explícito: por padrão segue a consulta ativa
  quando ela existe; ao ser usado manualmente, desliga o modo consulta ativa
  para aquela visualização e mostra "(override manual)" nas opções.

## Comportamento sem paciente/consulta

Idêntico ao comportamento híbrido pré-existente (preservado, não regredido):
anamnese salva no navegador se houver (`variant="hybrid"`), senão demonstração
completa com `DEMO_ANAMNESE` (`variant="demo"`) — ambos com `<DemoDataNotice>`
visível e o aviso "Preencha a anamnese na aba Consulta ou selecione um CID de
demonstração" quando não há medicamento mapeado.

## Limitações

- **Estado de carregamento não tem teste de renderização de componente**: o
  projeto não usa `@testing-library/react` nem monta páginas client-side em
  teste (convenção já estabelecida, ver `demo-data-notice-rm59.test.ts`); o
  check `if (state.loading) return <Spinner/>` é uma leitura direta e trivial
  de um flag global real (`useApp().state.loading`), sem lógica adicional a
  testar isoladamente. Declarado como limitação, não testado por render.
- **`explainable-ai-v2.ts` continua sem testes dedicados ao motor em si**
  (achado já registrado no RM-60, §7) — esta RM testa a NOVA camada de
  resolução de contexto (`explicabilidade-context.ts`) de ponta a ponta contra
  o motor real, mas não audita exaustivamente a base `EVIDENCIA_DB`/
  `ALTERNATIVAS_DB`/`WHATIF_DB` em si (fora do escopo: "não construir engine
  nova").
- **Ambiguidade de múltiplos CIDs ativos**: se uma consulta tiver mais de um
  diagnóstico/comorbidade relevante, a página usa apenas o CID salvo em
  `diagnostico_estruturado.cid` (o diagnóstico único selecionado pelo médico em
  `DiagnosticPanel.tsx`) — não há mecanismo de múltiplos diagnósticos
  concorrentes nesta consulta hoje; não é uma lacuna desta RM, é uma limitação
  herdada do modelo de dados de `Consultation`.

## Testes

Arquivo: [`frontend/src/tests/explicabilidade-integration-rm65.test.ts`](../frontend/src/tests/explicabilidade-integration-rm65.test.ts)
(14 testes, nível de integração — chama `getTherapeuticForCondition` e
`gerarExplainableAIv2` reais, nunca mocks).

| Cenário pedido pela RM-65 | Teste |
|---|---|
| Paciente com dados suficientes | Consulta ativa completa (anamnese + diagnóstico + plano real) → `fonte: 'consulta_ativa'`, usa a mesma molécula/anamnese da consulta |
| Paciente com dados incompletos | Diagnóstico presente, plano terapêutico ausente → `planoIndisponivel: true`, `status: 'sem_plano'`, nunca cai em demo |
| Ausência de consulta | `activeConsultation: null` + sem anamnese salva → `fonte: 'demonstracao'` |
| Ausência de diagnóstico | Consulta existe mas sem `diagnostico_estruturado.cid` → não ativa modo consulta_ativa |
| Dados contraditórios / comportamento de segurança | `gestante: true` + Enalapril (contraindicação real de gravidez) → `tem_contraindicacao_absoluta: true`, `confiavel_para_prescricao: false`, nunca omitido |
| Estado de carregamento | Não coberto por teste de render (ver "Limitações") |
| Erro | Medicamento malformado força exceção real no motor → `status: 'erro'`, distinto de `'sem_plano'` |
| Resultado real diferente do seed anterior | Consulta de HAS vs. consulta de DM2 produzem moléculas/indicações diferentes, ambas vindas do plano real de cada consulta (nunca mais sempre `I10`/primeira molécula estática) |
| Ausência de vazamento entre pacientes | Duas resoluções sucessivas para dois pacientes diferentes (uma delas gestante) não compartilham dados; recalcular o primeiro paciente depois do segundo prova ausência de cache/estado global |
| Prova de mudança por contexto real | Plano terapêutico reordenado deliberadamente (molécula não é a "primeira do protocolo padrão") → resolver usa exatamente a molécula real na posição 0 do plano da consulta, provando que não recalcula do zero por CID |
| Override manual de CID | Consulta ativa com diagnóstico, mas usuário seleciona outro CID manualmente → desliga modo consulta ativa (critério de aceite RM-60 §6.1) |
| Bug de mapeamento corrigido | `CID_CONDITION_MAP.I50 === 'icc'` (não mais `'ic'`) e `I25` removido do mapa |

## Resultados (gates executados nesta sessão)

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | Limpo |
| `npx eslint .` | Limpo (0 problemas) |
| `npx vitest run` (suíte completa) | 57 arquivos / 1061 testes — todos passando (14 novos desta RM) |
| `npm run test:coverage` | Exit 0 |
| `npm run build` | Sucesso — 4 gates de prebuild verdes ([RM-23]/[RM-24]/[RM-49]/[RM-62], nenhum `BLOCKING_ERROR`); Next.js build compilado com sucesso, `/explicabilidade` presente na lista de rotas estáticas geradas |
| Backend | Não executado — esta RM não alterou nenhum endpoint/API do backend (`backend/**` intocado) |

Os artefatos incidentais `DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md`,
regenerados com timestamp novo como efeito colateral do `npm run build`, foram
revertidos (`git checkout --`) para manter o diff desta RM restrito ao trabalho real.

## Riscos

- **Migração de comportamento visível**: médicos que já usavam a página no modo
  manual (CID fixo) verão, ao abrir `/explicabilidade` durante uma consulta com
  diagnóstico já definido, o conteúdo mudar automaticamente para refletir a
  consulta ativa em vez do último CID que haviam escolhido manualmente — é o
  comportamento pretendido pela RM-60/RM-65, mas é uma mudança de UX perceptível
  que vale comunicar à equipe antes de expor amplamente.
- **`plano_terapeutico` pode ficar defasado** dentro da mesma consulta se o
  médico voltar à etapa Terapêutica e trocar a conduta depois de já ter
  visitado `/explicabilidade` — como a leitura é sempre do `state.activeConsultation`
  atual (via `useApp()`, não uma cópia), qualquer atualização por
  `UPDATE_THERAPEUTIC` já reflete automaticamente na próxima renderização; não
  há risco de dado obsoleto persistente, apenas o comportamento normal de
  estado reativo.
- **Cobertura de teste do motor em si permanece baixa** (achado herdado do
  RM-60, não desta RM) — se `explainable-ai-v2.ts` for expandido no futuro
  (novas moléculas em `EVIDENCIA_DB`, novos CIDs), essa expansão continuará sem
  rede de segurança de teste dedicada até uma RM futura cobri-la.

---

Não foi feito commit, push ou deploy nesta RM.
