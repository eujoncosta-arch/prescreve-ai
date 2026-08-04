# RM-66 — Framework de Expansão Clínica Controlada

## 1. Por que este framework existe

O [RM-58](RM-58-AUDITORIA-GERAL-E-CORRECOES.md) encontrou, a partir de 4 relatos
concretos de uso real, um padrão recorrente de erro na expansão do catálogo
farmacológico deste sistema:

| Erro real do RM-58 | Causa raiz | Consequência |
|---|---|---|
| Sinot Clav® com 2 apresentações que nunca existiram | Concentrações copiadas de outra marca (Clavulin) sem verificação contra fonte externa | Médico via sugestão de apresentação comercial inexistente |
| 287/367 moléculas (78% do catálogo) invisíveis à busca da prescrição | `searchDrugs()` lia só `PHARMA_DB` (a base), nunca `getAllDrugs()` (base + 16 extensões de especialidade) | Um produto podia estar 100% cadastrado e ainda assim nunca aparecer para o médico |
| Poviztra™ ausente de toda fonte de dados | Produto real nunca cadastrado em nenhuma das bases | Busca vazia para uma marca real que o médico esperava encontrar |
| Contagem de "moléculas únicas" incorreta | Canonicalização ingênua (primeira palavra do nome) | Métrica exibida ao usuário estava simplesmente errada |

O fio condutor comum: **cada erro só foi descoberto reativamente**, por um
médico relatando um problema real, nunca por um gate automatizado — porque
nenhum gate testava "o catálogo é internamente coerente E alcançável pelos
motores que o consomem", só "esta molécula específica que eu já sei que
existe está correta". Esta RM (RM-66) não corrige mais bugs pontuais — cria um
**processo repetível** para que a expansão futura do catálogo não reintroduza
o mesmo padrão de erro, e valida esse processo contra um lote piloto pequeno
e real (ver [relatório do lote piloto](RM-66-PILOT-BATCH-LOSARTANA-HCTZ.md)).

**Esta RM não expande o catálogo em massa.** Adiciona exatamente 1 entidade
piloto, para provar o processo — não "centenas de medicamentos".

## 2. Definição de lote

Todo lote de expansão futuro (adição de 1 ou mais entidades ao catálogo
farmacológico) deve ser declarado com os seguintes campos, ANTES de qualquer
código ser escrito:

| Campo | Descrição | Exemplo (lote piloto) |
|---|---|---|
| **Especialidade** | A qual extensão de especialidade o lote pertence (`pharma-database-<especialidade>.ts`) | Cardiologia (`pharma-database-cardio.ts`) |
| **Escopo** | O que exatamente está incluído/excluído deste lote — nunca implícito | 1 entidade: combinação Losartana Potássica + Hidroclorotiazida. Não inclui novas moléculas isoladas nem outras combinações. |
| **Entidades novas** | IDs/nomes exatos das entidades `QuickDrug` a adicionar | `losartana_hidroclorotiazida` |
| **Marcas** | Marcas comerciais reais a vincular, com laboratório | Zart H® (Eurofarma), Losartana + Hidroclorotiazida Medley (Medley) |
| **Apresentações** | Concentrações/formas farmacêuticas reais, citadas por fonte | 50/12,5 mg e 100/25 mg, comprimido revestido |
| **Fontes** | De onde cada fato clínico veio — nunca "conhecimento geral" sem citação | `eurofarma-sync.ts` (`euro-zart-h`, bula ANVISA já curada) + verificação externa (bulas Eurofarma/Medley/Geolab) |
| **Responsável pela revisão** | Quem (papel, não necessariamente nome) faz a revisão manual (etapa 11) | Esta sessão de engenharia clínica — revisão manual documentada na seção 5 do relatório do lote |
| **Status de verificação** | `verificado` / `pendente_revisão` / `rejeitado`, por entidade | `verificado` (dado já curado internamente + confirmado externamente) |
| **Testes** | Quais arquivos de teste cobrem o lote | `rm66-pilot-batch-losartana-hctz.test.ts` |
| **Critérios de aceite** | O que precisa ser verdade para o lote fechar (ver seção 4) | Ver seção 4 |
| **Relatório de fechamento** | Documento de fechamento específico do lote | [RM-66-PILOT-BATCH-LOSARTANA-HCTZ.md](RM-66-PILOT-BATCH-LOSARTANA-HCTZ.md) |

## 3. Pipeline obrigatório

Todo lote deve passar pelas 12 etapas, nesta ordem. Cada etapa referencia o
gate/script/convenção JÁ EXISTENTE no sistema — este framework não cria motores
novos, organiza os já existentes em uma sequência obrigatória e documentada.

| # | Etapa | Mecanismo real no sistema | Critério de passagem |
|---|---|---|---|
| 1 | Cadastro estruturado | Nova entrada `QuickDrug` em `pharma-database-<especialidade>.ts` (nunca em `pharma-database.ts` diretamente, salvo moléculas sem especialidade clara) | `npx tsc --noEmit` limpo (o tipo `QuickDrug` já obriga os campos mínimos) |
| 2 | Proveniência | Cada fato clínico (contraindicação, ajuste renal/hepático, interação) deve ser rastreável a uma fonte real já existente no sistema (`eurofarma-sync.ts`, `lab-catalog.ts`) ou a uma verificação externa documentada nesta sessão (bula/ANVISA/rede de farmácias) | Fonte citada inline no código E no relatório do lote — nunca "conhecimento geral" sem citação |
| 3 | Validação de tipo | `npx tsc --noEmit` | 0 erros |
| 4 | RM-23 | `npx tsx scripts/check-drug-consistency.mjs` | 0 inconsistências critical/high |
| 5 | RM-24 | `npx tsx scripts/check-cross-database.mjs` | críticos=0; toda nova entidade sai da categoria "aceito"/fora-de-escopo quando promovida corretamente (ver achado da seção 6) |
| 6 | Gate de integridade comercial | `npx tsx scripts/audit-brand-concentrations.mjs` (RM-62) | 0 `BLOCKING_ERROR`; todo `REVIEW_REQUIRED` novo introduzido pelo lote é explicado no relatório de fechamento (nunca ignorado silenciosamente) |
| 7 | Cobertura de busca | `searchDrugs()`/`getAllDrugs()` (RM-58/RM-63) — testar busca por marca, por nome genérico, por marca de laboratório genérico | Toda via de busca real (marca, DCB, sinônimo) que um médico usaria encontra a entidade |
| 8 | Testes de dose | `dose-calculator.ts`/`pediatric-engine.ts` conforme aplicável — ajuste renal/hepático do cadastro exercitado com `getAdjustmentForCrCl`/`calcCrCl` reais | Pelo menos 1 teste de integração encadeando cálculo real → ajuste real do cadastro |
| 9 | Testes de segurança | `runSafetyCheck()` (`safety-rules.ts`) via `drugRepository` (pharma-core) — nunca direto no `QuickDrug` bruto | A entidade é resolvível pela Single Source of Truth e gera os alertas reais esperados (gestante/lactante/renal/interação) |
| 10 | Jornada clínica relevante | Teste de integração ponta-a-ponta (padrão RM-64: busca → avaliação clínica → ajuste de dose → segurança), reaproveitando motores reais, nunca simulado | Pelo menos 1 teste de jornada completa passando |
| 11 | Revisão manual | Humano (ou sessão de engenharia com papel explícito) revisa: fonte de cada fato, se marcas/concentrações batem entre fontes, se o `REVIEW_REQUIRED` do RM-62 é bioequivalência esperada ou erro de cópia | Documentado no relatório do lote — nunca implícito |
| 12 | Relatório | Relatório de fechamento do lote (seção 2 desta doc) | Publicado em `docs/RM-66-PILOT-BATCH-<nome>.md` (ou o nome do lote correspondente em rodadas futuras) |

**Regra dura:** nenhuma etapa pode ser pulada porque "é óbvio que vai passar".
O ponto de um pipeline obrigatório é que ele roda mesmo quando a entrada
parece trivial — foi exatamente esse tipo de suposição ("é só uma marca a
mais") que produziu o bug do Sinot Clav no RM-58.

## 4. Critérios de bloqueio (nenhum lote é aprovado se houver)

- **Fonte ausente** — qualquer fato clínico sem proveniência rastreável.
- **Marca sem rastreabilidade** — marca comercial citada sem laboratório e
  sem concentração confirmada contra ao menos 1 fonte real.
- **Concentração não verificada** — apresentação comercial sem confirmação
  cruzada (mesmo padrão do bug Sinot Clav: nunca copiar concentrações de
  outra marca "porque parece razoável").
- **Falha de busca** — qualquer via de busca esperada (marca, DCB, sinônimo
  comum) que não encontra a entidade.
- **Inconsistência RM-23/RM-24** — qualquer achado `critical`/`high` não
  resolvido.
- **Cálculo de dose sem teste** — ajuste renal/hepático cadastrado mas nunca
  exercitado por um teste real.
- **Comportamento clínico não documentado** — qualquer contraindicação,
  interação ou alerta especial que não apareça no relatório do lote com sua
  fonte.
- **Divergência crítica não resolvida** — qualquer `conflito`
  (marca → múltiplos princípios ativos) do RM-24, que é sempre `critical` e
  bloqueante por definição.

## 5. Critérios de revisão (itens pendentes)

Um item pode permanecer **pendente** (não rejeitado, não bloqueante) somente
quando **todas** as condições abaixo são verdadeiras simultaneamente:

1. **Não é apresentado como verificado** — o campo de status do lote diz
   explicitamete `pendente_revisão`, nunca `verificado`.
2. **Não é usado em recomendação ativa** — a entidade pendente não aparece em
   nenhum `PROTOCOLOS`/`ALTERNATIVAS_DB` que o motor de conduta terapêutica
   ofereça como sugestão real ao médico.
3. **Está explicitamente documentado** — o relatório do lote nomeia o item
   pendente e o motivo (ex.: "concentração X não confirmada contra fonte
   externa — aguardando verificação").

O `REVIEW_REQUIRED` do RM-62 (concentrações idênticas entre laboratórios) É
exatamente este tipo de item pendente por padrão: não bloqueia o build
(`BLOCKING_ERROR=0`), mas cada ocorrência introduzida por um lote precisa ser
explicitamente resolvida (confirmada como bioequivalência esperada, ou
corrigida) no relatório de fechamento — nunca deixada sem menção.

## 6. Achado desta sessão: um "aceite" automático pode mascarar um gap real

Durante a validação do pipeline contra o lote piloto, foi descoberto que o
validador RM-24 (`cross-database/validator.ts`) trata **toda** combinação
comercial cujo nome contenha `"+"` como automaticamente `aceito: true` /
`gravidade: 'low'` — presumindo, por uma heurística de nome de string
(`/\+/.test(nome)`), que "combinações estão fora do escopo do PHARMA_DB, que
indexa moléculas isoladas" (decisão formalizada no
[RM-54](RM-54-FINAL-RELEASE-AUDIT-REPORT.md)).

Só que o PHARMA_DB **já contém**, hoje, múltiplas combinações reais como
entidades de primeira classe — só usando `"/"` em vez de `"+"` como separador
(`Sacubitril/Valsartana`, `Sulfametoxazol/Trimetoprima`,
`Budesonida/Formoterol`, entre outras). Ou seja: a heurística de aceite
automático não reflete uma decisão de arquitetura real e consistente — reflete
uma convenção de nomenclatura acidental (`"+"` vs `"/"`). Isso significa que
**qualquer combinação real e clinicamente relevante nomeada com `"+"` nas
fontes externas (Eurofarma/lab-catalog) é automaticamente classificada como
"fora de escopo, sem risco" pelo gate, mesmo quando deveria ser promovida ao
PHARMA_DB** — exatamente o tipo de blind spot estrutural que o RM-58
encontrou (uma exclusão sistemática silenciosa, nunca antes questionada).

**Não corrigido nesta RM** (mudar a política de aceite do RM-24 é uma decisão
de arquitetura/produto — quais combinações merecem virar entidade de primeira
classe — não uma correção de bug pontual, e está fora do escopo desta RM de
"criar o processo e validar um piloto pequeno"). Registrado aqui como
**recomendação prioritária para uma futura rodada de expansão**: revisar os
demais itens hoje marcados `aceito: true` no relatório RM-24 (havia 14 antes
desta sessão, 13 após a promoção do lote piloto) um a um, com o mesmo padrão
de revisão manual aplicado ao lote piloto (seção 5 do
[relatório do lote](RM-66-PILOT-BATCH-LOSARTANA-HCTZ.md)), em vez de aceitar
a heurística de nome como decisão final.

## 7. Fluxo de decisão resumido

```
Novo lote proposto
    │
    ▼
Declarar campos da seção 2 (especialidade, escopo, entidades, marcas,
apresentações, fontes, responsável, status)
    │
    ▼
Etapas 1–6 (cadastro → RM-23 → RM-24 → RM-62)  ──── falha ────▶ BLOQUEADO
    │ passa
    ▼
Etapas 7–10 (busca → dose → segurança → jornada clínica)  ── falha ──▶ BLOQUEADO
    │ passa
    ▼
Etapa 11 (revisão manual — inclui resolver todo REVIEW_REQUIRED novo)
    │
    ▼
Etapa 12 (relatório de fechamento do lote, com status final por item)
    │
    ▼
Lote aprovado (ou parcialmente aprovado, com itens pendentes documentados
                per critérios da seção 5)
```

## 8. Relação com o lote piloto

Este framework foi validado nesta mesma sessão contra 1 lote piloto real e
pequeno — não um exercício teórico. Ver
[docs/RM-66-PILOT-BATCH-LOSARTANA-HCTZ.md](RM-66-PILOT-BATCH-LOSARTANA-HCTZ.md)
para: a entidade escolhida e por quê, evidência de cada uma das 12 etapas
executadas, o achado da seção 6 acima (descoberto justamente ao rodar a
etapa 5 do pipeline contra o piloto), e o veredito de fechamento.

---

Não foi feito commit, push ou deploy nesta RM. Nenhuma expansão em massa do
catálogo foi realizada — apenas 1 entidade piloto, através do pipeline completo.
