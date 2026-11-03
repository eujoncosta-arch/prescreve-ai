# RM-97 — `EVIDENCIA_DB` de sumatriptano e propranolol + `WHATIF_DB` de enxaqueca

**Origem:** na RM-94 só o topiramato passou na regra "2+ fontes". O usuário
pediu a opção 2 ("propranolol e sumatriptano") e, depois, instruiu:
*"implemente tudo desde que as fontes sejam confiáveis e de elevada
relevância"*. Esta RM aplica esse critério: revisões Cochrane, meta-análises
em revistas de grande relevância e diretrizes de sociedades médicas, cada
número conferido no PubMed/Crossref.

## Fontes usadas (todas verificadas)

### Sumatriptano — NNT 7 (50 mg, livre de dor em 2 h)

| Fonte | Verificado | Papel |
|---|---|---|
| Derry, **Cochrane CD008615** (2012) — 61 estudos, 37.250 participantes | DOI/Crossref + resumo PubMed 22336849 | NNT vs placebo para livre de dor em 2 h: **6,1** (50 mg) e **4,7** (100 mg); alívio da cefaleia 4,0 e 3,5 |
| Derry, **Cochrane CD009108** (2014, overview) | PubMed 24865446 | taxas absolutas: 28% vs 11% (NNT 6,1; IC 95% 5,5–6,9; n=6.447) |
| **Ferrari, Lancet 2001** — 53 ECRs, 24.089 pacientes | PubMed 11728541 | independente das Cochrane: 100 mg → 29% livres de dor e 59% com resposta em 2 h |
| **Karlsson, BMJ 2024** — rede de 137 ECRs, 89.445 participantes | PubMed 39293828 + texto completo (PMC11409395) | todas as intervenções ativas superiores ao placebo; sumatriptano entre os 4 triptanos de melhor perfil |

NNT adotado = ceil(6,1) = **7** (dose inicial do protocolo; convenção
conservadora de arredondar para cima). O NNT de 100 mg (4,7) fica no texto.

**Limite assumido:** Ferrari 2001 e BMJ 2024 confirmam a *direção e magnitude*
da eficácia por fontes independentes das Cochrane, mas **não** trazem a taxa
do placebo no resumo (Ferrari) ou só dão odds ratio (BMJ) — nenhum NNT é
derivado deles. O NNT vem só da Cochrane (que usa os mesmos ECRs da rede do
BMJ). É o menor grau de independência deste conjunto, e está dito no código.

### Propranolol — NNT 6

| Fonte | Verificado | Papel |
|---|---|---|
| **AAN/AHS 2012 (Silberstein, Neurology)** | PubMed 22529202 | Nível A: propranolol, metoprolol, timolol, topiramato e divalproato devem ser oferecidos |
| **Jackson, PLoS One 2019** — 108 ECRs | PubMed 30893319 + texto completo (PMC6426199) | RR 1,4 (IC 95% 1,1–1,7) para redução ≥50%; −1,5 crises/mês em 8 semanas; evidência de alta qualidade |
| **Diener 2004 (MIGR-003)** — n=575 | PubMed 15316798 | propranolol 160 mg como controle ativo: eficácia similar à do topiramato 100 mg |

**Inconsistência encontrada e tratada:** no mesmo artigo (Jackson 2019) a
Tabela 3 traz NNT **5,3** (IC 3,4–11,4) e o texto traz **4,5** (IC 2,8–12,9) a
12 semanas. Adotei o maior (5,3 → arredondado para cima = **6**), nunca o
mais favorável. Está escrito no comentário do código e travado por teste.

**Descartada:** a revisão Cochrane do propranolol (Linde, CD003225) foi
**RETIRADA** em 2017 (PubMed 28212466) e não é usada nem citada.

### Ressalvas de classificação

- **Consenso AHS 2021 (Ailani)** é um consenso, não uma diretriz: o próprio
  documento diz que é publicado "na ausência de uma diretriz formal". Na
  entrada do sumatriptano a classe é `'Consenso'` e o nível `A` se refere à
  evidência das revisões Cochrane. (As demais camadas do projeto ainda rotulam
  esse consenso como Classe I; não mexi nelas — ver "Pendências".)
- A diretriz **AAN 2000** (Silberstein) de tratamento agudo está marcada como
  *[RETIRED]* no PubMed e **não** foi usada.

## O que foi feito

- **`explainable-ai-v2.ts`**
  - Novas entradas `EVIDENCIA_DB.sumatriptano` (4 estudos) e `EVIDENCIA_DB.propranolol` (2 estudos).
  - **`WHATIF_DB.G43`** com **2 cenários de profilaxia** (topiramato NNT 4,
    propranolol NNT 6). Agudo (sumatriptano) × preventivo não é comparação
    honesta, então o sumatriptano não entra. Custo e SUS reaproveitam os valores
    de `ALTERNATIVAS_DB` (topiramato R$40/sem SUS; propranolol R$10/com SUS).
  - Os dois cenários avisam que a vantagem de NNT do topiramato vem de comparação
    **indireta** entre ensaios; na comparação direta (MIGR-003) a eficácia foi similar.
  - `CenarioClinco.trust_score` passou a **opcional**: é uma nota editorial sem
    método publicado e não será atribuída sem base (nos 2 cenários de G43 fica
    indefinida). `gerarWHATIF` ignora cenários sem nota para `melhor_perfil_paciente`.
  - `EstudoPivotal.n_pacientes` passou a **opcional**: a meta-análise de
    Jackson não informa o total de participantes no que consegui acessar, e não
    vou inventar.
- **`explicabilidade/page.tsx`**: oculta o cartão "Trust" e o "n = …" quando ausentes.
- **`second-opinion.ts`** e **`drug-comparator.ts`**: mesmas fontes e mesmos NNTs
  (sumatriptano 7, propranolol 6), consistentes entre as 3 camadas.

## Testes

- **Novo** `rm97-evidencia-sumatriptano-propranolol.test.ts` (16 testes):
  NNTs recomputáveis (ceil de 6,1 e 5,3); DOIs; Ferrari/BMJ/MIGR-003 sem NNT;
  consenso AHS não apresentado como diretriz; Cochrane retirada não citada;
  WHATIF G43 com 2 cenários sem `trust_score`; consistência entre as 3 camadas.
- `rm94-...`: travas negativas ajustadas (sumatriptano/propranolol saem da lista
  de "sem entrada curada"; WHATIF continua vazio só para M10/K21).
- `rm92-...`: propranolol passa a ter estudos; Naproxeno, Alopurinol, Omeprazol e
  Famotidina continuam sem estudo fabricado.
- `rm88-...`: acessos a `trust_score` ajustados para o tipo opcional.

## Pendências / limites

- **NNT do sumatriptano** vem de uma única família de fontes (Cochrane); sem
  segunda fonte independente com taxa de placebo, ele fica como o menos robusto.
- **NNT do propranolol** vem de uma única meta-análise com inconsistência interna
  (5,3 vs 4,5); adotado o valor mais conservador.
- **Rótulo "Classe I / Nível A" do consenso AHS 2021** ainda aparece em
  `second-opinion.ts`, `clinical-therapeutics.ts` e `ALTERNATIVAS_DB` (herdado de
  RMs anteriores). Vale revisar: um consenso sem diretriz formal não é "Classe I".
- Existe uma **atualização de 2026 da diretriz AAN/AHS** de profilaxia
  (Pringsheim, Neurology 2026; PubMed 42673559) que o projeto ainda não cita
  (a entrada do topiramato e a do propranolol usam a de 2012). Não li o
  conteúdo; revisar antes de dizer que a diretriz de 2012 é a vigente.
- WHATIF de M10 (gota) e K21 (DRGE) segue vazio: cada um ainda tem no máximo 1
  molécula com NNT verificável.

## Gates

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` | ✅ **77 arquivos / 1319 testes** |
| `npm run build` | ✅ |

---

Não foi feito commit, push ou deploy nesta RM.
