# RM-98 — Diretriz AAN/AHS 2026 de profilaxia da enxaqueca substitui a de 2012

**Origem:** item 1 do roadmap. Na RM-97 registrei que existe uma atualização
de 2026 da diretriz AAN/AHS que o projeto não citava. O projeto inteiro
descrevia propranolol e topiramato como **"1ª linha estabelecida, Nível A"**
com base na diretriz de 2012 (Silberstein).

## O que a diretriz de 2026 diz

| Documento | Verificado | Conteúdo relevante |
|---|---|---|
| **Potrebic et al., Neurology 2026;107(7):e214881** — recomendações | PubMed 42673560 + DOI no Crossref `10.1212/WNL.0000000000214881` | substitui as recomendações de 2012; critérios para iniciar profilaxia e escolher o fármaco |
| **Pringsheim et al., Neurology 2026;107(7):e218112** — revisão sistemática (217 estudos, buscas até 06/2024) | PubMed 42673559 + Crossref `10.1212/WNL.0000000000218112` | propranolol, topiramato e valproato: **confiança moderada** na enxaqueca episódica; galcanezumab e erenumab: **alta confiança**; comparações entre ativos: confiança baixa/muito baixa |

**Níveis de recomendação** (texto completo bloqueado — 403, fora do PMC;
conferidos em **Guideline Central** e **NeurologyLive**, que concordam entre si):

- **Propranolol — Nível B** (oferecer a quem prioriza eficácia na enxaqueca episódica; e a quem teme danos de longo prazo, por ser de uso prolongado). **Nível C** na gestação, se o nifedipino não for opção ou for ineficaz.
- **Topiramato — Nível B** (episódica e crônica; também **Nível B** se IMC elevado). **Nível A**: evitar se possível em pessoas com potencial de engravidar (teratogênico) e avisar que reduz a eficácia de contraceptivo hormonal acima de 200 mg/dia.
- **Metoprolol:** só confiança baixa (Nível B para não respondedores a opções de maior confiança); Nível C na gestação.

**Mudança em relação a 2012:** de "Nível A, devem ser oferecidos" para
**Nível B, evidência de confiança moderada**. A diretriz de 2026 organiza a escolha por prioridade do
paciente (eficácia, tolerabilidade, segurança de longo prazo, situações
especiais), não por "linhas" de tratamento.

## O que mudou no código

- **`explainable-ai-v2.ts`**: `EVIDENCIA_DB.propranolol` e `.topiramato` passam a citar Potrebic 2026
  (ano 2026, nível B, DOI novo), cada uma com um novo estudo (Pringsheim 2026, sem NNT e sem `n_pacientes` —
  são 217 estudos, não pacientes). `forca_evidencia` do benefício: A → B. O resumo do topiramato ganhou as
  salvaguardas verificadas (teratogênico; contraceptivo > 200 mg/dia). A nota de Jackson 2019
  ("evidência de alta qualidade") agora diz que é a avaliação dos autores e que a AAN/AHS 2026 classifica como moderada.
- **`ALTERNATIVAS_DB` (G43)**: propranolol e topiramato citam a diretriz de 2026 com força B; texto
  "1ª linha de profilaxia" trocado por "Recomendado pela AAN/AHS 2026 (Nível B)"; aviso de contraceptivo no topiramato.
  A nota da condição deixou de dizer "1ª linha equivalentes".
- **Erro antigo corrigido:** naproxeno e sumatriptano (tratamento **agudo**) citavam também a diretriz de 2012,
  que trata só de **profilaxia**. Agora citam apenas o consenso AHS 2021.
- **`clinical-therapeutics.ts`**, **`second-opinion.ts`**, **`drug-comparator.ts`**: mesma citação, nível B
  e mesmo texto, consistentes entre as camadas. O DOI de 2012 não aparece mais em `lib/`.
- **NNTs não mudaram** (topiramato 4, propranolol 6): vêm de ECRs e da meta-análise de Jackson, não da diretriz.

## O que NÃO mudei, e por quê

- Os campos `indicacao` ("Profilaxia de enxaqueca — 1ª linha quando crises frequentes…") e o rótulo
  `linha: '1a_linha'/'2a_linha'` do `ALTERNATIVAS_DB` são enquadramento do próprio projeto, não atribuído
  à diretriz. Mantive; a diretriz de 2026 não usa "linhas", então vale revisar o enquadramento.
- **O limiar "≥ 4 dias de crise/mês"** para iniciar profilaxia: a diretriz de 2026 traz critérios próprios de
  quando iniciar, mas não consegui ler o texto completo. Não alterei sem conferir.
- Outras opções que a diretriz agora lista e o projeto não tem: atogepant, anticorpos anti-CGRP
  (erenumab, fremanezumab, galcanezumab, eptinezumab), valproato. Ficaram fora do escopo.

## Limite desta RM

Os **níveis B/C/A** vêm de duas fontes secundárias consistentes entre si, não do texto da diretriz (403). O
resumo oficial do PubMed e as DOIs foram conferidos, mas a leitura de cada recomendação não foi feita no
original. Vale conferir no PDF da AAN antes de uso clínico real.

## Testes

- **Novo** `rm98-diretriz-aan-ahs-2026.test.ts` (14 testes): DOI de 2012 ausente de `lib/`;
  propranolol e topiramato em 2026/nível B/DOI novo; revisão sistemática sem NNT nem n inventado; NNTs
  inalterados; salvaguardas do topiramato; ressalva da gestação no propranolol; 3 camadas alinhadas;
  agudo (naproxeno/sumatriptano) sem diretriz de profilaxia.
- `rm90`, `rm93`, `rm97`: expectativas de DOI/ano atualizadas para a diretriz de 2026.

## Gates

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` | ✅ **78 arquivos / 1334 testes** |
| `npm run build` | ✅ 50 rotas |

---

Não foi feito commit, push ou deploy nesta RM.
