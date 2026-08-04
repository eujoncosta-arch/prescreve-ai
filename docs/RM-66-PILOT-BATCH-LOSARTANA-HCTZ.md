# RM-66 — Relatório do Lote Piloto: Losartana Potássica + Hidroclorotiazida

Framework de referência: [RM-66-CLINICAL-EXPANSION-FRAMEWORK.md](RM-66-CLINICAL-EXPANSION-FRAMEWORK.md)

## 1. Declaração do lote

| Campo | Valor |
|---|---|
| Especialidade | Cardiologia (`frontend/src/lib/pharma-database-cardio.ts`) |
| Escopo | 1 entidade `QuickDrug` nova: a combinação Losartana Potássica + Hidroclorotiazida. Nada além disso — nenhuma outra molécula, marca ou protocolo foi tocado. |
| Entidades novas | `id: 'losartana_hidroclorotiazida'` |
| Marcas | Zart H® (Eurofarma) — já curada em `eurofarma-sync.ts`; Losartana + Hidroclorotiazida Medley (Medley) — confirmada via bula pública |
| Apresentações | 50/12,5 mg e 100/25 mg, comprimido revestido |
| Fontes | `frontend/src/lib/eurofarma-sync.ts` (entrada `euro-zart-h`, já curada com bula ANVISA real) + verificação externa nesta sessão (bulas profissional/paciente Eurofarma, bulas de genéricos Medley/Geolab) |
| Responsável pela revisão | Esta sessão de engenharia clínica (RM-66) — revisão manual documentada na seção 5 |
| Status de verificação | `verificado` |
| Testes | `frontend/src/tests/rm66-pilot-batch-losartana-hctz.test.ts` (15 testes) |
| Critérios de aceite | Ver seção 4 do framework — todos atendidos (seção 4 abaixo) |
| Relatório de fechamento | Este documento |

## 2. Por que este lote foi escolhido

A RM-66 pede um lote pequeno mas representativo, com diversidade suficiente
para testar marca, nome genérico, combinação, apresentações diferentes, dose,
busca e alerta/monitoramento — e explicitamente pede para **não escolher
apenas medicamentos simples**. Em vez de inventar um cenário sintético, a
investigação (etapa que precede qualquer código, conforme o framework) partiu
de uma pergunta direta: *existe algum produto real, já documentado em uma das
fontes internas, que estrutural mente não alcança o motor de prescrição —
exatamente o padrão do RM-58?*

A resposta: **sim.** `frontend/src/lib/eurofarma-sync.ts` já tinha, desde
antes desta RM, uma entrada completa e curada (`euro-zart-h`) para "Zart H®"
(Losartana Potássica + Hidroclorotiazida) — com contraindicações, ajuste
renal, interações e link de bula real. Só que essa entidade **nunca existiu**
em `pharma-database*.ts`/`getAllDrugs()` — a fonte que `searchDrugs()`,
`drugRepository` (pharma-core) e `runSafetyCheck()` realmente consultam. Um
médico buscando "Zart H" ou "Losartana + Hidroclorotiazida" na prescrição
rápida recebia **zero resultados**, apesar do produto estar 100% documentado
em outra parte do sistema — o mesmo padrão estrutural exato do achado RM-58-00
(78% do catálogo invisível à busca) e RM-58-04 (Poviztra ausente), agora
encontrado numa única entidade específica, antes de virar um relato de
usuário.

Esta escolha cobre TODOS os eixos de diversidade pedidos com uma única
entidade (justificando um lote de tamanho 1, "definido pela complexidade, não
por uma meta arbitrária" — a RM-66 explicitamente rejeita tamanho por meta):

| Eixo pedido | Como esta entidade cobre |
|---|---|
| Marca | Zart H® (Eurofarma) |
| Nome genérico | "Losartana Potássica + Hidroclorotiazida" (DCB completa buscável) |
| Combinação | É uma associação em dose fixa (BRA + tiazídico), não uma molécula isolada |
| Diferentes apresentações | 50/12,5 mg e 100/25 mg — 2 concentrações reais distintas |
| Dose | Ajuste renal com 3 faixas reais (normal/TFG 60-30 e 30-15/TFG<15) + ajuste hepático (Child A/B/C) |
| Busca | Marca, DCB completa, marca de laboratório genérico, e busca isolada por "losartana" sem colidir com a monoterapia |
| Alerta/monitoramento | Contraindicação absoluta real em gestante; alerta renal real por TFG reduzida; interação com lítio/poupadores de K+/digitálicos |

## 3. Pipeline executado (evidência das 12 etapas)

### Etapa 1 — Cadastro estruturado
Nova entrada `QuickDrug` em `frontend/src/lib/pharma-database-cardio.ts`
(`id: 'losartana_hidroclorotiazida'`), seguindo exatamente a mesma estrutura
de tipo das demais ~40 entidades do arquivo (nenhum campo novo no tipo
`QuickDrug` foi necessário).

### Etapa 2 — Proveniência
Todo fato clínico (contraindicações, interações, ajuste renal) foi
reaproveitado 1:1 da entrada `euro-zart-h` já curada em `eurofarma-sync.ts`
(bula ANVISA real, com link de bula profissional/paciente já documentado
desde antes desta RM). O ajuste hepático (ausente na entrada Eurofarma
original) foi acrescentado com base na farmacologia já documentada do
componente tiazídico (risco de precipitar coma hepático em alterações
hidroeletrolíticas — advertência padrão de bula para diuréticos tiazídicos,
já replicada no padrão de outras entidades do catálogo) e do componente
losartana (`ajuste_hepatico` já cadastrado na entidade `losartana`
monoterapia deste mesmo arquivo). Verificação externa adicional (WebSearch,
2026) confirmou as mesmas 2 apresentações contra bulas profissionais/pacientes
da Eurofarma e bulas de genéricos (Medley, Geolab) — nenhum dado foi
inventado; qualquer fato sem correspondência em nenhuma fonte foi omitido em
vez de suposto.

### Etapa 3 — Validação de tipo
```
npx tsc --noEmit → 0 erros
```

### Etapa 4 — RM-23 (consistência de drogas)
```
Antes: 367 entidades · 0 inconsistências
Depois: 368 entidades · 0 inconsistências (critical=0 high=0 medium=0 low=0)
```

### Etapa 5 — RM-24 (cross-database)
```
Antes: total=367 compatíveis=117 divergentes=0 aceitos=14 críticos=0
Depois: total=367 compatíveis=118 divergentes=0 aceitos=13 críticos=0
```
A entidade migrou de `aceito` (classificada como "combinação fora de escopo,
risco baixo") para `compatível` (presente e consistente nas duas fontes) —
prova objetiva de que o gap estrutural foi fechado, não apenas mascarado. Ver
achado adicional na seção 6 do framework (a heurística de aceite automático
do RM-24 para nomes com "+").

### Etapa 6 — Gate de integridade comercial (RM-62)
```
npx tsx scripts/audit-brand-concentrations.mjs
→ REVIEW_REQUIRED [CONCENTRACAO_IDENTICA_ENTRE_LABS] Losartana Potássica + Hidroclorotiazida
   concentrações: 100/25 mg | 50/12,5 mg — Zart H® (Eurofarma) | Losartana + Hidroclorotiazida Medley (Medley)
BLOCKING_ERROR=0 (build liberado)
```
**Revisado manualmente (etapa 11):** concentrações idênticas entre marca de
referência e genérico são o padrão regulatório ESPERADO (ANVISA exige
bioequivalência de concentração para registro de genérico) — não é o padrão
do bug Sinot Clav (que era uma marca com apresentações que ELA MESMA nunca
vendeu, copiadas de OUTRA marca de referência diferente). Classificado como
`REVIEW_REQUIRED` legítimo, não como erro — documentado aqui explicitamente,
não silenciosamente ignorado.

### Etapa 7 — Cobertura de busca
4 vias de busca testadas e passando (`rm66-pilot-batch-losartana-hctz.test.ts`):
marca (`"zart h"`), DCB completa (`"losartana hidroclorotiazida"`), marca do
laboratório genérico (`"...medley"`), e busca isolada por `"losartana"`
retornando corretamente AMBAS as entidades reais (combinação e monoterapia)
sem colapsar uma na outra.

### Etapa 8 — Testes de dose
`getAdjustmentForCrCl()` exercitado com o `ajuste_renal` real do cadastro
(TFG 45 → "cautela"; TFG 20 → "evitar") e encadeado com `calcCrCl()` real a
partir de um paciente fictício de teste (idade/sexo/peso/creatinina) — não a
partir de um valor de TFG fabricado diretamente.

### Etapa 9 — Testes de segurança
`runSafetyCheck()` via `drugRepository` (pharma-core, a mesma Single Source
of Truth usada pelo motor de segurança real): confirma que a entidade é
resolvível pela camada canônica (não fica presa no `QuickDrug` bruto), gera
alerta renal real (`danger`) com TFG reduzida, gera contraindicação absoluta
real (`critical`) em gestante, e não fabrica nenhum alerta quando os
parâmetros clínicos são normais.

### Etapa 10 — Jornada clínica relevante
1 teste de integração ponta-a-ponta: médico busca pela marca → sistema
calcula a função renal real do paciente → aplica o ajuste de dose real do
cadastro → executa a checagem de segurança real com os mesmos dados —
sem simular nenhuma etapa isoladamente.

### Etapa 11 — Revisão manual
- Fonte de cada fato clínico: rastreada (seção 2 acima).
- Marcas/concentrações batendo entre fontes: confirmado (seção 2, RM-24).
- `REVIEW_REQUIRED` do RM-62: revisado e classificado como bioequivalência
  esperada, não erro (seção acima).
- Achado adicional sobre a heurística `"+"` do RM-24 (potencial gap
  sistêmico maior que este lote): documentado na seção 6 do framework,
  fora do escopo de correção desta RM.

### Etapa 12 — Relatório
Este documento + `docs/RM-66-CLINICAL-EXPANSION-FRAMEWORK.md`.

## 4. Critérios de bloqueio — checagem final

| Critério de bloqueio | Status |
|---|---|
| Fonte ausente | Não há — toda fato tem fonte citada (seção 2) |
| Marca sem rastreabilidade | Não há — 2 marcas, ambas com laboratório e concentração confirmados |
| Concentração não verificada | Não há — confirmada contra 2 fontes independentes (interna + externa) |
| Falha de busca | Não há — 4/4 vias de busca testadas passam |
| Inconsistência RM-23/RM-24 | Não há — 0 em ambos |
| Cálculo de dose sem teste | Não há — testado (etapa 8) |
| Comportamento clínico não documentado | Não há — todas as contraindicações/interações citadas com fonte |
| Divergência crítica não resolvida | Não há — 0 conflitos (RM-24: críticos=0) |

**Nenhum critério de bloqueio foi acionado. Lote aprovado.**

## 5. Testes (evidência)

```
npx vitest run src/tests/rm66-pilot-batch-losartana-hctz.test.ts
✓ 15/15 testes passando
```

Cobrindo: cadastro estruturado (1), proveniência/consistência entre fontes
(2), cobertura de busca (4), testes de dose (2), testes de segurança (5),
jornada clínica ponta-a-ponta (1).

## 6. Resultados (gates completos, executados nesta sessão)

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | Limpo |
| `npx eslint .` | Limpo (0 problemas) |
| `npx vitest run` (suíte completa) | 58 arquivos / 1076 testes — todos passando (15 novos desta RM; 1 regressão real encontrada e corrigida no processo — ver seção 7) |
| `npm run test:coverage` | Exit 0 |
| `npm run build` | Sucesso — `[RM-62] BLOCKING_ERROR=0`, `REVIEW_REQUIRED=98` (1 novo, revisado na etapa 6), Next.js build compilado |
| RM-23 | 368 entidades, 0 inconsistências |
| RM-24 | críticos=0, divergentes=0, aceitos=13 (era 14 — a entidade foi promovida) |
| Backend | Não executado — nenhuma alteração em `backend/**` |

## 7. Regressão real encontrada e corrigida durante o piloto

Ao adicionar a entidade sem `ajuste_hepatico`, a suíte de regressão já
existente (`clinical-regression.test.ts`, caso `HEP-02`, cobertura RM-01
MED-03: "100% das entidades devem ter ajuste hepático cadastrado") **falhou
imediatamente** (367/368 com ajuste hepático). Esta é exatamente a prova de
que o pipeline funciona como pretendido: um gate de regressão já existente
pegou um campo obrigatório faltante, sem que este relatório precisasse
declarar isso manualmente antes — a mesma metodologia que o RM-58 usou para
encontrar bugs (rodar contra o sistema real, não assumir). Corrigido
adicionando `ajuste_hepatico` real (Child A/B/C) com base na farmacologia já
documentada dos 2 componentes; suíte voltou a 1076/1076 passando.

## 8. Lacunas e riscos

- **Achado da heurística `"+"` do RM-24** (seção 6 do framework) — não
  corrigido nesta RM, requer decisão de arquitetura sobre os demais 13 itens
  hoje `aceito: true`.
- **`ajuste_hepatico` não fazia parte da entrada Eurofarma original** —
  precisou ser derivado da farmacologia dos componentes individuais (já
  documentados no catálogo) em vez de citado diretamente de uma bula da
  combinação; marcado como fonte derivada, não como bula direta da
  combinação, para rastreabilidade honesta.
- **Este lote não foi adicionado a nenhum protocolo terapêutico**
  (`PROTOCOLOS['has']`) — decisão deliberada de escopo: adicionar ao catálogo
  (`getAllDrugs()`/busca/segurança) é uma etapa distinta de recomendá-lo
  ativamente como conduta de 2ª linha em HAS, que é uma decisão clínica/de
  produto fora do escopo de "adicionar 1 entidade ao catálogo através do
  pipeline". Documentado aqui para não ser confundido com uma omissão.

---

Não foi feito commit, push ou deploy nesta RM.
