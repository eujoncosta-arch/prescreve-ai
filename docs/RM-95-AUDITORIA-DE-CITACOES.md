# RM-95 — Auditoria de citações das condições antigas contra o Crossref

**Origem:** o usuário aprovou a opção 1 do roadmap: aplicar às condições
antigas a mesma verificação ativa que encontrou erros reais na RM-93. Esta
RM audita **todos** os DOIs do código, não só os de HAS/DM2.

## Método

1. Script extrai todos os DOIs de `frontend/src` (excluindo testes) com a
   linha de contexto — o que o código **afirma** que cada DOI é.
2. Cada DOI é consultado na API do Crossref (título, autor, ano, revista).
3. DOIs que não resolvem: busca por título/autor para achar o DOI real, e
   cada candidato é reconferido direto no Crossref antes de ser usado.
4. DOIs que resolvem: comparação título/ano do Crossref × estudo citado.

**Resultado:** 115 DOIs únicos → 92 resolviam, **23 não existiam**, e **6 dos
que resolviam apontavam para outro artigo**. Depois das correções: 106
resolvem; restam 6 (1 é comentário, 5 aguardam decisão abaixo).

## Corrigido (todas as substituições confirmadas no Crossref)

| Citação | DOI errado | Problema | DOI correto |
|---|---|---|---|
| CURE | `NEJMoa010039` | inexistente | `NEJMoa010746` |
| COPERNICUS | `NEJMoa010130` e `NEJMoa010195` | inexistentes (2 DOIs diferentes inventados para o mesmo estudo) | `NEJM200105313442201` |
| FREEDOM | `NEJMoa0809652` | inexistente | `NEJMoa0809493` |
| CHANCE | `NEJMoa1215228` | inexistente | `NEJMoa1215340` |
| SYGMA 1 | `NEJMoa1715222` | inexistente | `NEJMoa1715274` |
| SYGMA 2 | `NEJMoa1715368`, `NEJMoa1715224` | inexistentes | `NEJMoa1715275` |
| Novel START | `NEJMoa1906801` | inexistente | `NEJMoa1901963` |
| EMPEROR-Preserved | `NEJMoa2107522` | inexistente | `NEJMoa2107038` |
| DELIVER | `NEJMoa2205197` | inexistente | `NEJMoa2206286` |
| ASTEROID | `jama.295.13.1556` | inexistente | `jama.295.13.jpc60002` |
| GUIDE-HF | `S0140-6736(21)01822-1` | inexistente | `S0140-6736(21)01754-2` |
| ISIS-2 | `S0140-6736(88)90114-9` | inexistente | `S0140-6736(88)92833-4` |
| MESA (CAC) | `NEJMoa040901` | inexistente; ano 2004 → 2008 | `NEJMoa072100` |
| SUNSET | `rccm.201806-1152OC` | inexistente | `rccm.201803-0405OC` |
| SPRINT-CKD | `ASN.2016010017` | inexistente | `ASN.2017020148` |
| **HORIZON-PFT** | `NEJMoa066838` | **resolvia para artigo de temsirolimus em carcinoma renal** | `NEJMoa067312` |
| Law 2009 (BMJ) | `bmj.b2840` | **resolvia para artigo de influenza H1N1** | `bmj.b1665` |
| FIDELITY | `eurheartj/ehac244` (2 arquivos) | **resolvia para diretriz ESC de cardio-oncologia** | `eurheartj/ehab777` |
| Rosuvastatina (EVIDENCIA_DB) | `ehae497`, "ESC/EAS 2024" | diretriz que não existe; DOI era de outro artigo | ESC/EAS **2019**, `ehz455` |
| GINA 2025 / GINA 2023 | `congress-2025`, `00406-2019` | DOIs inexistentes (o relatório GINA não tem DOI) | removidos |

**Farmacogenômica (`precision-medicine.ts`) — os 6 DOIs de diretrizes CPIC
resolviam para artigos sem relação** (segurança de fármacos por redes,
educação em farmacologia, culturas neuronais, regulação da EMA...):

| Molécula / gene | Correto (CPIC) |
|---|---|
| clopidogrel / CYP2C19 | `cpt.2526` (Lee 2022) |
| varfarina / VKORC1 | `cpt.668` (Johnson 2017) |
| codeína / CYP2D6 | `cpt.2149` (Crews 2021) |
| sinvastatina / SLCO1B1 | `cpt.2557` (Cooper-DeHoff 2022) |
| carbamazepina / HLA-B*15:02 | `cpt.1004` (Phillips 2018) |
| abacavir / HLA-B*57:01 | `clpt.2014.38` (Martin 2014) |

Também corrigidos: títulos de SYGMA 1/2 (SYGMA 2 citava um título que não
existe) e a atribuição de coautoria `GINA / SBPT` e `ESC / EAS / SBC` a
sociedades que não publicaram esses documentos.

## Decisões do usuário, aplicadas (todas conferidas no PubMed/Crossref)

1. **SURMOUNT-MMO** (ensaio em andamento, resultado inventado) → substituído por
   **SURPASS-CVOT** (Nicholls, NEJM 2025, `10.1056/NEJMoa2505928`): tirzepatida
   *não inferior* à dulaglutida em MACE (12,2% vs 13,1%; HR 0,92; IC 95,3% 0,83–1,01;
   superioridade p=0,09) e **SURMOUNT-2** (Garvey, Lancet 2023, n=938: −12,8%/−14,7%
   vs −3,2% de peso). O texto "SURMOUNT-4 … benefício CV" e "redução de eventos CV"
   da tirzepatida foram corrigidos; SELECT passa a dizer que a população não tinha diabetes.
2. **FLASH-DM2** (inexistente) → **meta-análise de Jancev, Diabetologia 2024**
   (12 ECRs, n=1.248: HbA1c −0,31%; TIR +6,36 pp; hipoglicemia grave sem diferença
   significativa) e **MOBILE** (Martens, JAMA 2021, n=175: HbA1c −0,4%; TIR 59% vs 43%).
   O "−40% de hipoglicemia" não tem fonte e foi removido.
3. **SMART (ERJ 2010)** → **Cochrane CD007313 (Cates 2013)**: 13 ECRs, 13.152 adultos;
   OR 0,83 (corticoide oral vs melhor prática), OR 0,54 (vs ICS em dose maior),
   internação sem significância; mais descontinuações por EA. O "−45%" foi removido.
4. **PAC "SBPT/AMIB 2022"** → **SBPT 2018, Corrêa et al.** (`10.1590/S1806-37562018000000130`,
   J Bras Pneumol 2018;44(5):405-423). AMIB não é coautora. Nível de evidência ajustado para
   **C** (consenso, revisão não sistemática). Resumo reescrito conforme o Quadro 5 da diretriz.
5. **Conteúdo × fonte primária**:
   - SYGMA 1: era "não inferior à budesonida diária"; na verdade superior à terbutalina no controle
     (34,4% vs 31,1%) e **inferior** à budesonida de manutenção (44,4%); exacerbações RR 0,36 vs
     terbutalina e 0,83 (0,59–1,16) vs manutenção. NNT 16 removido (não computável do resumo).
   - SYGMA 2: não tem braço só-SABA. Real: 0,11 vs 0,12 exacerbações/ano (RR 0,97), controle de
     sintomas inferior. "45% vs SABA, NNT 8" removido; tipo corrigido para duplo-cego.
   - **PMIDs trocados** de SYGMA 1/2 (29768140→29768149; 29768142→29768147).
   - MESA: n 6814→6722; seguimento mediano 3,8 anos — a frase "CAC=0 → <5% em 10 anos" não vinha deste artigo.
   - SUNSET: n 1089→1053; resultado real VEF1 −26 mL (não inferioridade não atendida), exacerbações RR 1,08.
   - Enalapril/ramipril: rótulo agora é a diretriz ESC 2024 de hipertensão (a que o DOI aponta).
     **NNTs recalculados** a partir dos percentuais publicados: CONSENSUS 44%→26% (NNT 6, não 4);
     SOLVD 39,7%→35,2% (NNT 23, não 14); HOPE 17,8%→14,0% (NNT 27, não 26); HOPE "25%" → 22%.
     MICRO-HOPE ganhou DOI (`10.1016/S0140-6736(99)12323-7`); NNT 30 removido (sem fonte).
   - `BeneficioRisco.nnt` passou a ser opcional: sem NNT verificável o valor é omitido (a tela
     de explicabilidade oculta o cartão) e o componente de score fica neutro (50), nunca favorável.

## Pendências / limites

- Valores de **NNH** em várias entradas de `EVIDENCIA_DB` (50, 80, 200, 10000…) não têm fonte
  e não foram auditados; só os NNH que removi junto com os blocos corrigidos.
- A diretriz SBPT 2018 não traz dose de amoxicilina simples; o Quadro 6 lista amoxicilina-clavulanato
  875/125 mg **a cada 8 h** (o código usa 2x/dia em alternativas). Não alterei a posologia.
- Metoprolol e omeprazol (CPIC) continuam sem `doi_referencia`.

## Limites da auditoria

Ela confere **identidade** (o DOI existe e é o estudo citado). **Não**
confere se os números dentro de cada entrada (n, HR, %) estão corretos — só
os casos do item 5 foram notados de passagem. Uma auditoria de conteúdo
exigiria ler o texto completo de cada artigo.

## Testes

`rm95-auditoria-dois.test.ts` (38 testes, offline): 28 DOIs errados nunca
voltam ao código (a trava já pegou uma ocorrência que a troca manual
perdeu); mapeamento molécula→CPIC; títulos/atribuições corrigidos.
`rm88-...` atualizado (atribuição antiga `GINA / SBPT`, `SBC / ESC` e NNT 14 do SOLVD). Novo `rm96-decisoes-auditoria-fontes-verificadas.test.ts` (11 testes) trava as decisões acima.

## Gates

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` | ✅ **76 arquivos / 1304 testes** |
| `npm run build` | ✅ |

---

Não foi feito commit, push ou deploy nesta RM.
