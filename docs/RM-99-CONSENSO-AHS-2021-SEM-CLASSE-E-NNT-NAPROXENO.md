# RM-99 — O consenso AHS 2021 deixa de ser rotulado "Classe I" e o naproxeno ganha o NNT real

**Origem:** item 1 das pendências da RM-97/98. O consenso da AHS (Ailani, Headache
2021, doi `10.1111/head.14153`) é, nas palavras do próprio documento, publicado
"na ausência de uma diretriz formal". Ainda assim, quatro entradas de tratamento
agudo da enxaqueca o apresentavam como **"Classe I / Nível A"** (`second-opinion.ts`,
`clinical-therapeutics.ts`), e o `ALTERNATIVAS_DB` o citava como "AHS 2021" sem
dizer que é consenso.

## Achado novo: naproxeno

Ao procurar a evidência de nível A que sustentaria o naproxeno, encontrei a revisão
Cochrane específica (**Law, Derry, Moore — CD009455, 2013**, PMID 24142263; DOI conferido no
Crossref `10.1002/14651858.CD009455.pub2`). Resumo oficial (PubMed):

- 6 estudos, 1.241 participantes com naproxeno 275–825 mg; 1.092 com placebo.
- Naproxeno 500/825 mg > placebo: **NNT 11** para livre de dor em 2 h (17% vs 8%;
  qualidade moderada) e NNT 6,0 para alívio da cefaleia em 2 h (45% vs 29%).
- Conclusão dos autores: estatisticamente superior ao placebo, mas o NNT de 11
  "sugere que não é clinicamente útil" como analgésico isolado.

O projeto descrevia o naproxeno como **"1ª linha estabelecida"**. Isso é a leitura
do consenso, mas omitia a magnitude real do efeito. Agora as três camadas dizem as duas coisas.

## O que mudou

- **Tipos:** `grau` ganhou o valor `'Consenso'` em `EvidenceLevel` (`types.ts`) e em
  `GrauRecomendacao` (`second-opinion.ts`), com cor própria em `GRAU_COR`.
  `therapeutic-class-expansion.ts` passou a derivar o tipo de `ScientificReference`
  em vez de repetir a união.
- **`clinical-therapeutics.ts`** (naproxeno e sumatriptano): `grau: 'Consenso'`, descrição
  "sem graduação formal de classe"; nível A mantido, agora explicado como a evidência dos ECRs
  (Cochrane CD009455 para o naproxeno, CD008615 para o sumatriptano).
- **`second-opinion.ts`** (as duas opções agudas): mesma correção na `diretriz`.
- **`ALTERNATIVAS_DB` G43:** "Consenso AHS 2021" + Cochrane; naproxeno deixa de dizer
  "1ª linha estabelecida" e traz o NNT 11.
- **`drug-comparator.ts`:** linha de eficácia de enxaqueca do naproxeno cita NNT 11 e a Cochrane.

## O que NÃO mudei, e por quê

- **`EVIDENCIA_DB` do naproxeno:** não criei entrada. Com a Cochrane e a ausência de uma
  segunda fonte independente de NNT para a mesma dose, não cumpre a regra "2+ fontes";
  segue no fallback honesto.
- **O `grau_recomendacao: 'I'` do naproxeno no comparador** vale também para a gota (ACR),
  que não foi auditada aqui. Só mexi na linha de enxaqueca.
- **"Sem risco cardiovascular"** na vantagem do naproxeno (`ALTERNATIVAS_DB`): é uma
  afirmação absoluta que não verifiquei. O naproxeno tem risco CV menor que outros AINEs,
  mas "sem risco" é exagero. Fica como pendência.
- **"ACR/EULAR 2020 (gota)"** no `diretriz_principal` do naproxeno: a diretriz de 2020 é do
  ACR; a atribuição conjunta não foi conferida.

## Limites

- O consenso AHS 2021 foi lido apenas como referência (resumo/DOI); não revi o texto completo.
- "Grau Consenso" aparece nos selos como "Grau Consenso" — correto, mas visualmente
  diferente do padrão. Vale decidir se a interface deve esconder a palavra "Grau" nesse caso.

## Testes

- **Novo** `rm99-consenso-ahs-2021-sem-classe.test.ts` (10 testes): grau Consenso nas duas
  camadas, ausência de "1ª linha estabelecida", NNT 11 e DOI da Cochrane presentes.
- Nenhum teste antigo precisou mudar.

## Gates

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` | ✅ **79 arquivos / 1344 testes** |
| `npm run build` | ✅ |

---

Não foi feito commit, push ou deploy nesta RM.
