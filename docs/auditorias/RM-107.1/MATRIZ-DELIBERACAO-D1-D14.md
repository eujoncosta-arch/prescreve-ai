# RM-107.1 — Matriz de deliberação clínica D1–D14 (levantamento por decisão)

> **Documento de apoio à deliberação profissional. Exclusivamente documental.** Nenhuma decisão foi tomada, sugerida como aprovada ou presumida: **todas as D1–D14 permanecem PENDENTE**. Nenhum motor foi apontado como "correto". Nenhuma dose foi pesquisada, inserida, calculada como recomendada ou classificada como clinicamente validada. Nenhum código, dado clínico, calculadora, tela ou catálogo foi alterado.
> Referências: `RELATORIO-RM-107.1.md` (auditoria), documento de decisões D1–D14 (v1.0) e evidências em `evidencias/`.
> Motores: **A** = `dosing-engine` (tela `/dosagem`) · **B** = `pediatric-engine` (sem tela) · **C** = `dose-calculator` + catálogo `QuickDrug` (tela `/prescricao-rapida`).
> **Legenda de evidência:** `[EXEC]` medido executando o código em modo leitura (arquivo citado) · `[COD]` leitura de código-fonte (não executado) · `[DADO]` valor cadastrado nos dados · `[NC]` **NÃO CONFIRMADO** (relação não demonstrada com código ou dados auditados).
> "mg/kg/dia derivado" = dose por tomada × tomadas/dia, calculada **por esta auditoria** apenas para comparar formas de cadastro; **não é dose recomendada**.

## Correções à RM-107.1 identificadas nesta etapa (errata)
1. **D1 — contagem refinada.** A RM-107.1 afirmou que o `dose-calculator` aplica dose adulta a neonatos/crianças "para os 362 de 382 medicamentos sem dose pediátrica". A medição catálogo-inteiro (`catalogo-dose-calculator-resumo.json`) mostra, para cada um dos pacientes pediátricos testados (neonato 14 d, lactente 6 m, criança 4 a): **207** calculam dose adulta **sem bloqueio**; **125** param por frequência indeterminada (faixa/PRN/contínuo; bloqueio até confirmação manual); **30** não têm dose numérica calculável (dose 0) ou receberam alerta crítico. Além disso, **5 dos 20** medicamentos com `dose_pediatrica` não a usam (ver D1). A frase "362 … sem alerta" deve ser lida com esta decomposição.
2. **Amoxicilina + clavulanato — idade mínima em A.** A RM-107.1 escreveu "faixa etária (A: lactente ≥ 28 d; B/C ≥ 2 m)". O `dosing-engine` possui `contraindicado_ate_dias = 60` nessa regra pediátrica `[DADO]` (matriz: `contraindicado_em = "<60d"`); A e B concordam em ~2 meses de idade mínima. A divergência de idade mínima **não** existe nesse par de motores para esse medicamento.
3. **Cobertura:** foi corrigida na RM-107.1 (A ∩ B = 9; só A = 6; só B = 11).
(As correções 1 e 2 foram acrescentadas como errata ao final de `RELATORIO-RM-107.1.md` e de `evidencias/divergencias-por-medicamento.md`.)

---

## D1 — Ausência de regra pediátrica `CRÍTICA`
1. **Problema (RM-107.1):** sem regra pediátrica, `calcFullDose` cai na dose adulta.
2. **Medicamentos afetados:**
   - **[EXEC] 207 medicamentos** (de 362 sem `dose_pediatrica`) calculam dose adulta sem bloqueio para neonato, lactente e criança (lista: `evidencias/catalogo-dose-calculator-por-paciente.csv`, colunas `*_fonte = adulto_fixo`, `*_bloqueio = 0`, `*_freq_indet = false`, `*_dia > 0`). Exemplos medidos: cefalexina 500 mg/tomada (3,5 kg/14 d), sulfametoxazol + trimetoprima 800 mg/tomada (3,5 kg), metformina 850 mg/tomada (4 a/15 kg).
   - **[EXEC] 125** medicamentos com frequência indeterminada: o cálculo **para** até confirmação manual de frequência. O que ocorre **após** a confirmação (uso da dose adulta) é **[COD]**, não executado.
   - **[EXEC] 30** sem dose numérica calculável (`habitual` não numérico → dose 0) ou com alerta crítico (ex.: lítio, isotretinoína, digoxina, varfarina, insulinas, quimioterápicos, opioides paliativos; lista no CSV).
   - **[EXEC] 5 dos 20** com `dose_pediatrica` cadastrada que o motor **não usa** e caem na dose adulta em criança de 4 anos: metformina (`dose_por_kg = 0`, cálculo `mg/dia`), salbutamol (`jatos`), budesonida (`mcg/dia (dose total)`), montelucaste (`dose fixa por faixa`), vitamina K1 neonatal (`dose fixa`).
   - **[DADO/EXEC]** O catálogo tem **66** medicamentos com `uso_pediatrico = 'nao_aplicavel'`; o cálculo **não consulta** esse campo `[COD]`. Desses, **55 estão entre os 207 que calculam** dose adulta, 9 entre os 125 e 2 entre os 30 (`catalogo-uso-pediatrico-vs-calculo.json`). Os outros **152** dos 207 **não** têm marca de uso pediátrico (informação ausente, não "ausência de contraindicação").
   - Não se classifica aqui quais desses medicamentos têm uso pediátrico clínico válido: **[NC]**.
3. **Apresentações:** o catálogo traz concentrações por marca (campo `marcas[].concentracoes`); para este item a apresentação não altera o resultado `[EXEC]` (ver D10).
4. **Motores:** C (efeito principal); A bloqueia com "Não há posologia definida" quando nenhuma regra cobre a população (só 18 medicamentos) `[EXEC]`; B devolve `null` fora das 21 entradas `[COD]`.
5. **Comportamento atual:** C — dose adulta sem alerta de idade (alertas próprios do medicamento, se houver, continuam); A — bloqueia; B — sem regra.
6. **Divergências demonstradas:** cefalexina (A 25 mg/kg/dia, B 50, C = 500 mg adulto); SMZ-TMP (A 8, B 6, C = 800 mg); metformina (A 500 mg 12/12 h para 4 anos, C 850 mg) — ver `COMPARATIVO-TRES-MOTORES.md`.
7. **Risco:** técnico e clínico — resultado numérico com aparência de posologia pediátrica; interface exibe cartão verde "Prescrição Sugerida" quando não há alerta `[COD]`.
8. **Informações ausentes:** indicação de uso pediátrico por medicamento (152 dos 207 sem marca); idade mínima por medicamento; confirmação, pelo catálogo, de quais dos 207 têm uso pediátrico previsto.
9. **Fonte primária necessária:** bula profissional (posologia em pediatria/restrições etárias) e diretriz pediátrica de cada molécula, por medicamento. Ver `MATRIZ-DE-FONTES-E-EVIDENCIAS.md`.
10. **Testes após aprovação:** `MATRIZ-DE-TESTES.md` § D1.

## D2 — Adolescentes e transição para dose adulta `ALTA`
1. **Problema:** os motores separam criança/adolescente/adulto de formas diferentes.
2. **Medicamentos afetados:** **[DADO]** A tem **20 regras** que mencionam "adolescente", **todas agrupadas com "adulto"** (nenhuma regra específica de adolescente) — amoxicilina, amoxicilina-clavulanato, azitromicina, cefalexina, sulfametoxazol-trimetoprim, paracetamol, ibuprofeno, dipirona, prednisona, salbutamol, montelucaste, atenolol, losartana, metformina, omeprazol, fenitoina, dienogeste. **[EXEC]** C: aos 14 anos/50 kg, **0 dos 20** medicamentos com `dose_pediatrica` usam a regra pediátrica (`adolescente_14a_50kg_fonte` ≠ `pediatrica_*` nos 20) — todos recebem o caminho adulto. **[DADO]** B: nenhuma indicação define "adolescente"; só 2 indicações têm idade máxima (ibuprofeno-canal arterial, 1 m; aciclovir-neonatal, 3 m); as demais são abertas no topo (resultado de B para 14 a/50 kg e para adultos: `resultados-comparados-pacientes-padrao.json`).
3. **Apresentações:** não aplicável a esta decisão `[NC]`.
4. **Motores:** A, B, C.
5. **Comportamento:** A — regra "adolescente + adulto" única (dose fixa em mg, ex.: 500 mg); B — dose por kg sem limite superior (ex.: 14 a/50 kg); C — `usar_dose_pediatrica = false` abaixo de 18 anos (`classifyPopulation`).
6. **Divergências demonstradas:** adolescente 50 kg: paracetamol A 750 mg/tomada × B 750 × C bloqueia por frequência indeterminada; ibuprofeno A 400 × B 250 × C 400; omeprazol A/B/C 20 mg; SMZ-TMP A 160 × B 150 × C 800 `[EXEC]`.
7. **Risco:** transição de dose adulta definida por convenção técnica; não demonstrado qual é adequada **[NC]**.
8. **Informações ausentes:** critério clínico de transição por medicamento/indicação; peso/maturidade como critério.
9. **Fonte:** bula/diretriz por molécula (população adolescente).
10. **Testes:** `MATRIZ-DE-TESTES.md` § D2.

## D3 — Faixas etárias e classificação populacional `ALTA`
1. **Problema:** classificações diferentes entre motores.
2. **Afetados:** qualquer medicamento com regra por população: A tem regra neonato (amoxicilina, paracetamol, fenitoína), lactente (12 medicamentos), pediátrico 1–11 a (15 medicamentos) `[DADO]`; C usa `classifyPopulation` em todo o catálogo `[COD]`; B não usa baldes `[COD]`.
3. **Apresentações:** não aplicável.
4–5. **Comportamento (evidência `classificacao-etaria-comparada.json`, `verificacoes-pontuais.json`):**

| Dias de vida | A (`detectarPopulacao`) | C (`classifyPopulation`) | B |
|---|---|---|---|
| 0–27 | neonato | neonato | idade em meses (mín./máx. por indicação) |
| 28–364 | lactente | lactente | idem |
| 365–729 | **pediátrico** | **lactente** (< 2 anos) | idem |
| 730–2189 | pediátrico | pré-escolar | idem |
| 2190–4379 | pediátrico | escolar | idem |
| 4380–6569 | adolescente | adolescente | idem |
| 6570–23724 | adulto | adulto | idem |
| ≥ 23725 | geriátrico | geriátrico (alerta Beers) | idem |

   Conversão de meses: `/dosagem` usa 1 mês = 30 d (12 meses = 360 d → "lactente"); contrato canônico RM-105.2.2 usa 365/12 d (12 meses = 365 d → "pediátrico") `[EXEC]`. Existe ainda `getPediatricAgeGroup` (≤ 1 m; ≤ 24 m; ≤ 72 m; ≤ 144 m) **sem chamadores** `[COD]`.
6. **Divergência demonstrada:** 365–729 dias (A pediátrico × C lactente); conversão de meses; terceira classificação não usada.
7. **Risco:** rótulo populacional pode selecionar regra diferente conforme o motor; a classificação técnica não valida dose.
8. **Ausentes:** faixas institucionais aprovadas ou critério por medicamento.
9. **Fonte:** protocolo institucional + bula/diretriz por medicamento (definições pediátricas variam por fonte).
10. **Testes:** `MATRIZ-DE-TESTES.md` § D3.

## D4 — Idade mínima por medicamento `CRÍTICA`
1. **Problema:** divergências de idade mínima; regras sem limite suficiente.
2. **Afetados (demonstrados):** dipirona, ibuprofeno, metformina, omeprazol, amoxicilina em neonato; também SMZ-TMP e amoxicilina + clavulanato (A e B concordam em ~2 meses — ver errata). Tabela `[DADO]`:

| Medicamento | Motor A (restrição estruturada de idade; populações cobertas) | Motor B (idade por indicação) | Motor C (faixa etária — texto livre, **não aplicada como limite**) |
|---|---|---|---|
| cefalexina | nenhuma estruturada<br>*populações com regra:* lactente + pediatrico · adolescente + adulto · geriatrico | Infecções de pele e partes moles: mín. 1 m | sem regra pediátrica |
| amoxicilina | nenhuma estruturada<br>*populações com regra:* neonato + lactente + pediatrico · adolescente + adulto · geriatrico | Otite média aguda / Rinosinusite: mín. 1 m<br>Pneumonia ambulatorial: mín. 1 m<br>Faringoamigdalite por estreptoco: mín. 1 m | 2 meses a 12 anos: 25 mg/kg/dia (leve) ou 45 mg/kg/dia (grave) em 2 doses. > 40 kg: dose a |
| amoxicilina + clavulanato | lactente + pediatrico: contraind. <60d<br>*populações com regra:* lactente + pediatrico · adolescente + adulto + geriatrico | Infecções resistentes (PRSP, H. : mín. 2 m | ≥ 2 meses (bula Eurofarma): 25 a 45 mg/kg/dia (infecção leve a moderada) ou 45 a 70 mg/kg/ |
| ibuprofeno | nenhuma estruturada<br>*populações com regra:* pediatrico · adolescente + adulto · geriatrico | Febre: mín. 6 m<br>Dor leve a moderada: mín. 6 m<br>Artrite juvenil idiopática: mín. 12 m<br>Fechamento de canal arterial (ne: mín. 0 m / máx. 1 m | ≥ 6 meses VO | Neonatal: apenas IV em protocolo PCA (D1: 10 mg/kg → D2: 5 mg/kg → D3: 5 mg |
| omeprazol | nenhuma estruturada<br>*populações com regra:* lactente + pediatrico · adolescente + adulto · geriatrico | DRGE / Esofagite / Profilaxia de: mín. 0 m | > 1 ano: 0,7-3,3 mg/kg/dia; adulto: 20-40 mg/dia |
| dipirona | lactente + pediatrico: contraind. neonato <90d<br>*populações com regra:* lactente + pediatrico · adolescente + adulto · geriatrico | Febre e dor: mín. 3 m | > 3 meses: 10-15 mg/kg/dose; VO: 1 gota/kg/dose |
| SMZ-TMP | lactente + pediatrico: contraind. neonato <60d<br>*populações com regra:* lactente + pediatrico · adolescente + adulto · geriatrico | ITU / Pneumocistose (PCP): mín. 2 m | sem regra pediátrica |
| metformina | nenhuma estruturada<br>*populações com regra:* pediatrico · adolescente + adulto · geriatrico | sem regra | ≥ 10 anos: iniciar 500 mg 2x/dia |
| paracetamol | nenhuma estruturada<br>*populações com regra:* neonato · lactente + pediatrico · adolescente + adulto · geriatrico | Febre e dor: mín. 0 m | Todas as idades: 10-15 mg/kg/dose a cada 4-6h |
| azitromicina | nenhuma estruturada<br>*populações com regra:* lactente + pediatrico · adolescente + adulto · geriatrico | Pneumonia atípica / Coqueluche /: mín. 6 m | > 6 meses: 10 mg/kg/dia × 3 dias (máx 500 mg/dia). Otite: 30 mg/kg dose única. Astro® Susp |


   - **[EXEC]** dipirona 60 d/5 kg: A bloqueia (< 90 d), B bloqueia (≥ 3 m), **C calcula 50 mg/tomada sem alerta**. Ibuprofeno lactente 6 m/8 kg: A bloqueia; B 40 mg; C 60 mg. Metformina 4 a/15 kg: A 500 mg 12/12 h; B sem regra; C 850 mg. Amoxicilina neonato 14 d: A calcula; B bloqueia (mín. 1 m); C calcula. Omeprazol neonato: A bloqueia (sem regra); B 3,5 mg; C 2,4 mg.
   - **[COD]** B possui `NEONATAL_ALERTS` com contraindicações por idade para ceftriaxona, SMZ-TMP (< 2 m), dipirona (< 3 m, `idadeMinDias: 90`) e ibuprofeno (VO < 3 m) — usadas por `getNeonatalAlerts`, que **não tem chamadores** fora do próprio arquivo `[COD]`.
3. **Apresentações:** o catálogo de C e as formulações de A/B por faixa (B `faixaMeses`) — não alteram os limites etários `[COD]`.
4–5. Ver tabela e execuções acima.
6. **Divergências:** dipirona (C sem bloqueio), ibuprofeno (A ≥ 12 m × B/C ≥ 6 m), metformina (nenhum limite aplicado em A e C; texto "≥ 10 anos"), omeprazol (B sem mínimo; C "> 1 ano" em texto), amoxicilina (A permite neonato; B ≥ 1 m; C "2 meses a 12 anos" em texto).
7. **Risco:** cálculo e exibição de dose em idade que outro motor considera contraindicada.
8. **Ausentes:** idade mínima estruturada em C para todo o catálogo; critério por via/formulação/indicação.
9. **Fonte:** bula profissional (contraindicações/restrições por faixa etária) de cada medicamento.
10. **Testes:** `MATRIZ-DE-TESTES.md` § D4.

## D5 — Dose pediátrica por indicação e peso `CRÍTICA`
1. **Problema:** doses divergentes entre motores.
2. **Afetados (demonstrados `[DADO]` e `[EXEC]`):** cefalexina, amoxicilina, amoxicilina + clavulanato, ibuprofeno, omeprazol, dipirona, SMZ-TMP, paracetamol. Não confirmados com divergência numérica: azitromicina (dose diária igual; B descreve D1 10 → D2–D5 5 mg/kg).

| Medicamento | Motor A (mg/kg/dia derivado · dose fixa/dia derivada) | Motor B (mg/kg/dia derivado, por indicação) | Motor C pediátrico (mg/kg/dia derivado) · Motor C adulto (mg/dia derivado do habitual × 1ª frequência) |
|---|---|---|---|
| cefalexina | lactente + pediatrico: 25 mg/kg/dia<br>adolescente + adulto: 2000 mg/dia (fixa)<br>geriatrico: 1500 mg/dia (fixa) | Infecções de pele e partes moles: 50 mg/kg/dia | ped: sem regra<br>adulto: 2000 mg/dia (habitual "500 mg VO q6h") |
| amoxicilina | neonato + lactente + pediatrico: 50 mg/kg/dia (Infecções leves a moderadas)<br>adolescente + adulto: 1500 mg/dia (fixa) (Infecções leves a moderadas)<br>geriatrico: 1000 mg/dia (fixa) | Otite média aguda / Rinosinusite: 50 mg/kg/dia<br>Pneumonia ambulatorial: 90 mg/kg/dia<br>Faringoamigdalite por estreptoco: 50 mg/kg/dia | ped: 45 mg/kg/dia (mg/kg/dia)<br>adulto: 1750 mg/dia (habitual "875") |
| amoxicilina + clavulanato | lactente + pediatrico: 45 mg/kg/dia (Infecções por germes beta-la)<br>adolescente + adulto + geriatrico: 1750 mg/dia (fixa)<br>adolescente + adulto + geriatrico: 1500 mg/dia (fixa) | Infecções resistentes (PRSP, H. : 70 mg/kg/dia | ped: 45 mg/kg/dia (mg/kg/dia)<br>adulto: 1750 mg/dia (habitual "875/125") |
| ibuprofeno | pediatrico: 30 mg/kg/dia (≥ 1 ano. Febre e dor. Lacten)<br>adolescente + adulto: 1200 mg/dia (fixa) (Anti-inflamatório: 600–800mg)<br>geriatrico: 600 mg/dia (fixa) | Febre: 15 mg/kg/dia<br>Dor leve a moderada: 22.5 mg/kg/dia<br>Artrite juvenil idiopática: 30 mg/kg/dia<br>Fechamento de canal arterial (ne: esquema/dose por faixa (10 mg/kg/dose) | ped: 22.5 mg/kg/dia (mg/kg/dose)<br>adulto: 1600 mg/dia (habitual "400–600 mg/dose") |
| omeprazol | lactente + pediatrico: 1 mg/kg/dia (DRGE / esofagite péptica)<br>adolescente + adulto: 20 mg/dia (fixa) (Profilaxia GI com AINE/AAS; )<br>geriatrico: 20 mg/dia (fixa) | DRGE / Esofagite / Profilaxia de: esquema/dose por faixa (1 mg/kg/dose) | ped: 0.7 mg/kg/dia (mg/kg/dia)<br>adulto: 20 mg/dia (habitual "20") |
| dipirona | lactente + pediatrico: 60 mg/kg/dia<br>adolescente + adulto: 2000 mg/dia (fixa)<br>geriatrico: 1500 mg/dia (fixa)<br>adolescente + adulto: 3000 mg/dia (fixa) (Dor intensa hospitalar / IV ) | Febre e dor: 60 mg/kg/dia | ped: 40 mg/kg/dia (mg/kg/dose)<br>adulto: não derivável (habitual "1000") |
| SMZ-TMP | lactente + pediatrico: 8 mg/kg/dia (Dose baseada em TMP. ITU/Inf)<br>adolescente + adulto: 320 mg/dia (fixa) (ITU não complicada: 3–7 dias)<br>geriatrico: 320 mg/dia (fixa) | ITU / Pneumocistose (PCP): 6 mg/kg/dia | ped: sem regra<br>adulto: 1600 mg/dia (habitual "800/160 mg (1 cp dupla dose) V") |
| metformina | pediatrico: 1000 mg/dia (fixa) (> 10 anos com DM2)<br>adolescente + adulto: 1000 mg/dia (fixa) (Iniciar 500 mg 12/12h; titul)<br>geriatrico: 1000 mg/dia (fixa) | sem regra | ped: — (mg/dia)<br>adulto: 1700 mg/dia (habitual "850") |
| paracetamol | neonato: 40 mg/kg/dia<br>lactente + pediatrico: 60 mg/kg/dia<br>adolescente + adulto: 3000 mg/dia (fixa)<br>geriatrico: 1500 mg/dia (fixa) | Febre e dor: 60 mg/kg/dia | ped: 60 mg/kg/dia (mg/kg/dose)<br>adulto: não derivável (habitual "500") |
| azitromicina | lactente + pediatrico: 10 mg/kg/dia (5 dias (dose única diária))<br>adolescente + adulto: 500 mg/dia (fixa)<br>geriatrico: 500 mg/dia (fixa) | Pneumonia atípica / Coqueluche /: esquema/dose por faixa (10 mg/kg/dose) | ped: 10 mg/kg/dia (mg/kg/dia)<br>adulto: 500 mg/dia (habitual "500") |


   - Resultados calculados (criança 4 a/15 kg, `resultados-comparados-pacientes-padrao.json`, em mg por tomada): cefalexina A 93,8 · B 187,5 · C 500 (adulto); amoxicilina A 250 · B 375 · C 337,5; amox-clav A 337,5 · B 525 · C 337,5; ibuprofeno A 150 · B 75 · C 112,5; omeprazol A 15 · B 15 · C 10,5; dipirona A 225 · B 225 · C 150; SMZ-TMP A 60 · B 45 · C 800; paracetamol A 225 · B 225 · C 225.
3. **Apresentações:** A (formulações por medicamento) e B (`formulacoes[]` por peso/idade) diferem de C (concentrações de marca); amox-clav: A 400, B 400/57 (7:1) `[DADO]`.
4–5. Ver tabelas e `COMPARATIVO-TRES-MOTORES.md`.
6. **Divergências:** detalhadas em `evidencias/divergencias-por-medicamento.md` (causas observadas, não confirmadas).
7. **Risco:** fatores de diferença entre motores na dose diária derivada (cefalexina 2×, amox-clav ≈ 1,6×, dipirona 1,5×, omeprazol ≈ 1,4×, SMZ-TMP ≈ 1,3×, entre A, B e C), exibidos em telas diferentes para o mesmo paciente/medicamento.
8. **Ausentes:** indicação em A (cefalexina, omeprazol, ibuprofeno pediátrico); regra pediátrica em C (cefalexina, SMZ-TMP); peso de referência (atual × ideal) `[NC]`.
9. **Fonte:** bula profissional por indicação/população + diretriz de cada indicação.
10. **Testes:** `MATRIZ-DE-TESTES.md` § D5.

**Achado adicional C (base temporal, `[EXEC]`; classificação clínica pendente):** em 19 medicamentos a unidade cadastrada tem base temporal, peso ou superfície (`mg/dia`, `mg/kg`, `mg/m²`, …) e o motor a trata como valor **por tomada** no ramo adulto, multiplicando pelo número de tomadas. Exemplos medidos (adulto 70 kg): lítio `900 mg/dia` × 2x/dia → total calculado 1.800; levetiracetam `1000 mg/dia` × 2x/dia → 2.000; tramadol `50 mg/dia` × 4x/dia → 200; isotretinoína `0,5-1 mg/kg/dia` → 0,5 com unidade `mg/kg/dia`. Outros 98 medicamentos têm `habitual` com faixa numérica (ex.: prednisona "5–60 mg/dia" → 5) e o motor usa o primeiro número. **Não se afirma que o valor esteja clinicamente errado**: pode ser convenção de cadastro; a conferência contra a fonte é pendente (arquivo `catalogo-dose-calculator-por-paciente.csv`).

## D6 — Intervalos e frequência `ALTA`
1. **Problema:** frequências divergentes; frequência em texto livre.
2. **Afetados:** amoxicilina (8/8 × 12/12 h), ibuprofeno, paracetamol `[DADO]`; adulto paracetamol e dipirona em C (faixa → bloqueio) `[EXEC]`. Demais: ver tabela.

| Medicamento | Motor A (horas) | Motor B (texto + divisões) | Motor C (texto) |
|---|---|---|---|
| cefalexina | lactente + pediatrico: 6/6h<br>adolescente + adulto: 6/6h<br>geriatrico: 8/8h | 6/6h (4×/dia) | adulto: q6h (padrão) / q8h (infecções leves) |
| amoxicilina | neonato + lactente + pediatrico: 8/8h<br>adolescente + adulto: 8/8h<br>geriatrico: 12/12h | 12/12h (2×/dia) | ped: 2 tomada(s)/dia<br>adulto: 2x/dia / 3x/dia |
| amoxicilina + clavulanato | lactente + pediatrico: 12/12h<br>adolescente + adulto + geriatrico: 12/12h<br>adolescente + adulto + geriatrico: 8/8h | 12/12h (2×/dia) | ped: 2 tomada(s)/dia<br>adulto: 2x/dia / 3x/dia |
| ibuprofeno | pediatrico: 8/8h<br>adolescente + adulto: 8/8h<br>geriatrico: 8/8h | a cada 6–8h (3×/dia)<br>3–4×/dia (4×/dia)<br>D1: 10 mg/kg IV → D2: 5 mg/kg → D3: 5 mg/kg | ped: 3 tomada(s)/dia<br>adulto: 6/6h / 8/8h |
| omeprazol | lactente + pediatrico: 24/24h<br>adolescente + adulto: 24/24h<br>geriatrico: 24/24h | 1×/dia (30 min antes do café) | ped: 1 tomada(s)/dia<br>adulto: 1x/dia (30 min antes café) / 2x/dia (H. pylori) |
| dipirona | lactente + pediatrico: 6/6h<br>adolescente + adulto: 6/6h<br>geriatrico: 8/8h<br>adolescente + adulto: 8/8h | a cada 6h (4×/dia) | ped: 4 tomada(s)/dia<br>adulto: A cada 6-8h |
| SMZ-TMP | lactente + pediatrico: 12/12h<br>adolescente + adulto: 12/12h<br>geriatrico: 12/12h | 12/12h (2×/dia) | adulto: q12h (ITU, MRSA pele) / PCP tratamento: q6–8h / Profilaxia: 1x/dia |
| metformina | pediatrico: 12/12h<br>adolescente + adulto: 12/12h<br>geriatrico: 12/12h | sem regra | ped: 2 tomada(s)/dia<br>adulto: 2x/dia / 3x/dia |
| paracetamol | neonato: 6/6h<br>lactente + pediatrico: 6/6h<br>adolescente + adulto: 6/6h<br>geriatrico: 8/8h | a cada 4–6h (4×/dia) | ped: 4 tomada(s)/dia<br>adulto: A cada 4-6h / A cada 8h |
| azitromicina | lactente + pediatrico: 24/24h<br>adolescente + adulto: 24/24h<br>geriatrico: 24/24h | D1: 10 mg/kg → D2–D5: 5 mg/kg 1×/dia | ped: 1 tomada(s)/dia<br>adulto: 1x/dia |


3. **Apresentações:** amox-clav adulto — A 12/12 h (875) × 8/8 h (500) por apresentação; C não distingue (frequências cadastradas "2x/dia / 3x/dia", usa a 1ª) `[EXEC]`.
4–5. **Comportamento:** A: horas numéricas; B: texto + `divisoes`; C: `parseFrequencia` do texto; faixa/PRN/contínuo ⇒ `frequencia_indeterminada` e bloqueio até confirmação (RM-84) `[COD/EXEC]`; **no catálogo, 125 de 362 medicamentos sem regra pediátrica caem nesse bloqueio** `[EXEC]`.
6. **Divergências:** amoxicilina 8 × 12 h (dose diária 50 em A e B); ibuprofeno 8 h (A) × 6–8 h (B); paracetamol "4–6 h" (B, C) × 6/6 h (A).
7. **Risco:** mesma dose diária repartida em intervalos diferentes; texto livre exige interpretação.
8. **Ausentes:** frequência estruturada em B e C; critério para faixas.
9. **Fonte:** bula e diretriz por medicamento/indicação/população.
10. **Testes:** `MATRIZ-DE-TESTES.md` § D6.

## D7 — Dose máxima `CRÍTICA`
1. **Problema:** máximos divergentes e de natureza diferente.
2. **Afetados:** paracetamol, dipirona, omeprazol, metformina, ibuprofeno `[DADO]` (e demais da tabela).

| Medicamento | Motor A (máx/tomada · máx/dia, mg) | Motor B (máx/tomada mg · máx mg/kg/dia) | Motor C (pediátrico: máx dia · adulto: campo `max` em texto) |
|---|---|---|---|
| cefalexina | lactente + pediatrico: — · 4000<br>adolescente + adulto: — · 4000<br>geriatrico: — · 2000 | Infecções de pele e partes m: 500 mg · 100 mg/kg/dia | ped: sem regra<br>adulto: "4 g/dia" |
| amoxicilina | neonato + lactente + pediatrico: — · 3000<br>adolescente + adulto: — · 3000<br>geriatrico: — · 2000 | Otite média aguda / Rinosinu: 500 mg · 90 mg/kg/dia<br>Pneumonia ambulatorial: 500 mg · — mg/kg/dia<br>Faringoamigdalite por estrep: 500 mg · — mg/kg/dia | ped: 3000 mg/dia<br>adulto: "875" |
| amoxicilina + clavulanato | lactente + pediatrico: — · 2000<br>adolescente + adulto + geriatrico: — · 1750<br>adolescente + adulto + geriatrico: — · 1500 | Infecções resistentes (PRSP,: 875 mg · — mg/kg/dia | ped: 1750 mg/dia<br>adulto: "875/125" |
| ibuprofeno | pediatrico: 400 · 2400<br>adolescente + adulto: — · 2400<br>geriatrico: — · 1200 | Febre: 400 mg · 40 mg/kg/dia<br>Dor leve a moderada: 400 mg · 40 mg/kg/dia<br>Artrite juvenil idiopática: 800 mg · 40 mg/kg/dia<br>Fechamento de canal arterial: — mg · — mg/kg/dia | ped: 40 mg/kg/dia<br>adulto: "2400 mg/dia" |
| omeprazol | lactente + pediatrico: — · 40<br>adolescente + adulto: — · 40<br>geriatrico: — · 40 | DRGE / Esofagite / Profilaxi: 20 mg · — mg/kg/dia | ped: 20 mg/dia<br>adulto: "40" |
| dipirona | lactente + pediatrico: 1000 · 4000<br>adolescente + adulto: 1000 · 4000<br>geriatrico: — · 2000<br>adolescente + adulto: 2500 · 5000 | Febre e dor: 1000 mg · 60 mg/kg/dia | ped: 50 mg/kg/dia<br>adulto: "1000" |
| SMZ-TMP | lactente + pediatrico: — · 320<br>adolescente + adulto: — · 320<br>geriatrico: — · 320 | ITU / Pneumocistose (PCP): — mg · 12 mg/kg/dia | ped: sem regra<br>adulto: "15–20 mg/kg/dia de TMP (PCP grave IV)" |
| metformina | pediatrico: — · 2000<br>adolescente + adulto: — · 2550<br>geriatrico: — · 2000 | sem regra | ped: 2000 mg<br>adulto: "3000" |
| paracetamol | neonato: — · —<br>lactente + pediatrico: 1000 · 4000<br>adolescente + adulto: 1000 · 4000<br>geriatrico: — · 2000 | Febre e dor: 1000 mg · 75 mg/kg/dia | ped: 60 mg/kg/dia<br>adulto: "1000" |
| azitromicina | lactente + pediatrico: 500 · 500<br>adolescente + adulto: — · 500<br>geriatrico: — · 500 | Pneumonia atípica / Coqueluc: 500 mg · — mg/kg/dia | ped: 500 mg/dia<br>adulto: "1000" |


3. **Apresentações:** não aplicável `[NC]`.
4–5. **Comportamento:** A aplica máximo por tomada e por dia (mg) e reporta `excede_*` sobre o valor bruto; B aplica `maxDoseMg` (tomada) e `maxDoseMgKgDia`; C aplica `max_dose_dia` no ramo pediátrico e **não aplica o campo `max` adulto** (apenas o exibe) `[COD]`; **152 de 382** campos `max` adulto não declaram período `[DADO]`.
6. **Divergências:** paracetamol (teto por kg: B 75 × C 60 mg/kg/dia; A só tem teto absoluto de 4.000 mg/dia); dipirona (teto por kg: B 60 × C 50 mg/kg/dia; A só tem teto absoluto de 4.000 mg/dia); omeprazol (A 40 mg/dia × B, C 20); metformina (A 2.550/2.000 × C 3.000); ibuprofeno (A 400/tomada × B 400/40 mg/kg/dia × C 40 mg/kg/dia). Resultado medido: omeprazol 9 a/30 kg A 30 mg × B/C 20 mg `[EXEC]`.
7. **Risco:** `/dosagem` rotula "Dose/tomada validada" e "Dose diária validada" quando o valor não excede o máximo cadastrado `[COD]` — o selo não indica validação clínica.
8. **Ausentes:** máximos por população/indicação/via; máximo absoluto; período do `max` em C.
9. **Fonte:** bula profissional (dose máxima) por medicamento.
10. **Testes:** `MATRIZ-DE-TESTES.md` § D7.

## D8 — SMZ-TMP: substância de referência `CRÍTICA`
1. **Problema:** tratamento não uniforme TMP × combinação.
2. **Afetado:** sulfametoxazol + trimetoprima (único; **[NC]** para outras associações — não auditadas).
3. **Apresentações `[DADO]`:** A — suspensão "200/40 mg/5 mL", comprimido "400/80", comprimido forte "800/160", com `concentracao_mg` = componente **TMP** (40, 80, 160); B — suspensão 200/40 mg/5 mL; comprimido 400/80 ou 800/160; C — concentrações de marca (400/80, 800/160…).
4. **Motores/comportamento:** A: "Dose baseada em TMP" (pediátrico 8 mg/kg/dia), adulto 160 mg, observação "Dose expressa em componente TMP" `[DADO]`; B: "Dose em mg/kg de TMP", 6 mg/kg/dia (ITU/PCP; PCP 15–20 mg/kg/dia TMP em texto), máx 12 mg/kg/dia `[DADO]`; C: `habitual = "800/160 mg (1 cp dupla dose) VO q12h"`, unidade `mg`, e o motor lê `parseFloat` → **800**; campo `max` em texto "15–20 mg/kg/dia de TMP (PCP grave IV)" `[DADO]`.
5. **Resultados medidos `[EXEC]`:** criança 15 kg — A 60 mg/tomada, B 45 mg/tomada, C 800 mg/tomada (dose adulta; sem regra pediátrica em C). Adulto 70 kg — A 160 mg/tomada, B 210 mg/tomada, C 800 mg/tomada.
6. **Divergência:** A/B declaram a base **TMP**; C não declara qual substância o número 800 representa (o texto traz "800/160").
7. **Risco:** confusão entre TMP e combinação; não demonstrado qual substância o 800 de C representa **[NC]**.
8. **Ausentes:** campo de substância de referência em C; convenção de exibição.
9. **Fonte:** bula profissional das apresentações comerciais (composição por unidade) e diretriz por indicação.
10. **Testes:** `MATRIZ-DE-TESTES.md` § D8.

## D9 — Neonatologia e prematuridade `CRÍTICA`
1. **Problema:** classificação neonatal simplificada; dados gestacionais não uniformes.
2. **Afetados `[DADO]`:** A — regra neonato em 3 medicamentos (amoxicilina, paracetamol, fenitoína); B — indicações neonatais com idade máxima: ibuprofeno-canal arterial (0–1 m) e aciclovir-neonatal (0–3 m); `NEONATAL_ALERTS` para ceftriaxona, SMZ-TMP, dipirona, ibuprofeno, domperidona, metronidazol, fluconazol, aciclovir, `cafeine-citrate` (id diferente do catálogo `cafeina-citrato`) e vancomicina (sem entrada de dose em B); C — registros neonatais com regra pediátrica: cafeína citrato, poractanto alfa, vitamina K1 neonatal, sildenafil neonatal, fenobarbital neonatal (só em C; sem A nem B).
3. **Apresentações:** não aplicável `[NC]`.
4–5. **Comportamento `[COD]`:** B é o único motor que recebe IG e idade pós-natal (`idadeGestacionalSemanas`, `idadePostNatalDias`) e calcula idade corrigida (IG + pós-natal − 40 sem; meses = ⌊sem/4,33⌋), **aplicada a qualquer paciente que informe os dois** (inclusive a termo); **idade pós-menstrual e peso ao nascer não existem em nenhum motor**; A e C usam só idade cronológica.
6. **Divergências:** paracetamol neonato: A 10 mg/kg/tomada × B/C 15 `[DADO]`; ibuprofeno neonato: A bloqueia × B esquema PDA IV × C calcula dose oral `[EXEC]`.
7. **Risco:** tratar neonatos como grupo homogêneo; cálculo sem IG/pós-natal.
8. **Ausentes:** dados obrigatórios por medicamento/indicação; definição de prematuridade por regra; id comum para `NEONATAL_ALERTS`.
9. **Fonte:** bula, diretriz neonatal e parecer de especialista em neonatologia.
10. **Testes:** `MATRIZ-DE-TESTES.md` § D9.

## D10 — Arredondamento e apresentação farmacêutica `ALTA`
1. **Problema:** arredondamento/conversão podem não corresponder à apresentação.
2. **Afetados:** **[EXEC] C ignora a concentração selecionada para a dose**: nos **266 medicamentos** com ≥ 2 concentrações cadastradas, a dose por tomada (e tomadas/dia) **não muda com a concentração escolhida** (266/266; `catalogo-dose-calculator-resumo.json` → `d10`). Demonstração clínica relevante: amoxicilina (500 mg × 875 mg → 875 mg 12/12 h) e amoxicilina + clavulanato (500/125 × 875/125 → 875 mg 12/12 h), enquanto A distingue 500/125 8/8 h × 875/125 12/12 h (RM-100). Para os demais 264 **[NC]** se a dose depende da apresentação.
3. **Apresentações:** campo `marcas[].concentracoes`/`formas` (C); `formulacoes[]` (A, com `formulacao_ids` por regra em 8 regras); `formulacoes[]` textuais (B).
4–5. **Comportamento `[COD]`:** A — sem arredondamento do valor; `comprimidos_por_dose` fracionário **sem arredondamento nem alerta**; gotas `Math.round`; gotas só com `gotas_por_mL` explícito. B — `toFixed(0)` apenas na exibição; formulação por faixa de peso/idade. C — `Math.round(x·10)/10`; volume em mL e gotas só com `mg_por_gota` explícito; **C não calcula comprimidos/cápsulas** (`FullDoseResult` só traz volume e gotas).
6. **Divergências:** critérios de arredondamento distintos (nenhum/0,1/exibição); apresentação respeitada só em A.
7. **Risco:** quantidade impraticável ou não sinalizada; apresentação não respeitada.
8. **Ausentes:** passo de arredondamento por forma/dispositivo; relação dose × apresentação em C.
9. **Fonte:** bula (forma farmacêutica/administração) + parecer farmacêutico.
10. **Testes:** `MATRIZ-DE-TESTES.md` § D10.

## D11 — Superfície corporal e função renal `ALTA`
1. **Problema:** implementações e critérios diferentes.
2. **Afetados `[COD]`:**
   - **BSA (6 implementações):** `dosing-engine.calcularBSA` (Mosteller); `pediatric-engine.calcBSA` (Mosteller) e `calcBSADuBois`; `dose-calculator.calcBSA` (Mosteller, delega ao `dosing-engine`, arredonda a 2 casas); `oncology-engine.calcBSAMosteller` e `calcBSADuBois`.
   - **Função renal:** `dose-calculator.calcCrCl` (Cockcroft-Gault, com peso ajustado em obesidade; usado na tela principal) `[COD]`; `utils.calcCrCl` (Cockcroft-Gault simplificado; chamadores **[NC]** fora da definição); `geriatric-engine.calcClCrCockcroft`; `pediatric-engine.calcClCrSchwartz` (**sem chamadores**); `clinical-calculators.calcCKDEPI` e `calcMDRD` (sem chamadores de dose).
3. **Apresentações:** não aplicável.
4–5. **Comportamento:** a tela principal usa `calcCrCl` e `calcBSA` de C; `/dosagem` usa `calcularBSA` de A; B usa `superficieCorporal` informada ou `calcBSA` próprio `[COD]`. Nenhum motor expõe a fórmula em campo **estruturado** do resultado de dose; A e C a registram no texto do passo a passo (C cita "Mosteller"); B: **[NC]** `[COD]`.
6. **Divergências demonstradas:** múltiplas implementações com fórmulas potencialmente distintas (DuBois × Mosteller em B e oncologia); **não foi executada** comparação numérica de BSA/TFG nesta etapa **[NC]**.
7. **Risco:** método de TFG/BSA não declarado por regra.
8. **Ausentes:** método por população/finalidade; dados necessários declarados.
9. **Fonte:** referência farmacológica/diretriz de função renal e BSA por população; bula quando a dose depender do método.
10. **Testes:** `MATRIZ-DE-TESTES.md` § D11.

## D12 — Ajustes renais e hepáticos `CRÍTICA`
1. **Problema:** texto de ajuste ≠ ajuste calculado.
2. **Afetados `[DADO]`:** A — flag `ajuste_renal` em 10 regras (amoxicilina, amoxicilina-clavulanato, cefalexina, sulfametoxazol-trimetoprim, ibuprofeno, atenolol, losartana, metformina, pramipexol) e `ajuste_hepatico` em 1 (fenitoína); C — texto de ajuste renal em **364 de 382** e hepático em **382 de 382** medicamentos; B — nenhum.
3. **Apresentações:** não aplicável.
4–5. **Comportamento `[COD]`:** A — flag apenas exibe selo "Ajustar em DRC" (não altera dose); C — se `crcl` for informado, mostra texto da faixa de TFG como alerta (`⚠ Ajuste renal necessário` quando < 60) e o mesmo para Child-Pugh B/C; **não altera dose**; B — sem ajuste.
6. **Divergências:** A (flag) × C (texto) × B (nada) para o mesmo medicamento.
7. **Risco:** texto informativo pode parecer ajuste aplicado; dose exibida não muda com a função renal.
8. **Ausentes:** ajuste estruturado (método, faixa, ação, parâmetros); distinção "não cadastrado" × "sem ajuste".
9. **Fonte:** bula (populações especiais — insuficiência renal/hepática) e diretriz.
10. **Testes:** `MATRIZ-DE-TESTES.md` § D12.

## D13 — Linguagem e sinalização da interface `CRÍTICA`
1. **Problema:** termos e cores que sugerem validação.
2. **Locais `[COD]` (rótulos e cores):**
   - `/dosagem` (`app/dosagem/page.tsx:341-342`): "Dose/tomada validada" e "Dose diária validada", selo verde (`bg-emerald-100`) quando o valor **não excede** o máximo cadastrado; âmbar quando excede. Blocos "diretriz" e "evidência" exibem o texto declarado no dado (sem verificação), a "evidência" em verde.
   - `DoseCalcCard` (`components/modules/DoseCalcCard.tsx`): cartão e ícone verdes quando não há alerta; título "Prescrição Sugerida"; botão verde "Aplicar esta posologia" (desabilitado só se houver alerta `🚨`); campo de resultado `posologia_sugerida`.
   - Nenhuma tela exibe o **estado de validação** da regra, a fonte ou a ausência de fonte `[COD]`.
3. **Apresentações:** não aplicável.
4. **Motores:** A (selos), C (cartão); B sem tela.
5. **Comportamento:** o estado visual deriva da **ausência de alerta**, não de validação.
6. **Divergência:** os dois rótulos de "validação" têm significados diferentes e nenhum é validação clínica.
7. **Risco:** transmissão de segurança não demonstrada.
8. **Ausentes:** política de linguagem e estados aprovados (os 6 do D13).
9. **Fonte:** política institucional de governança clínica (não há fonte clínica; é decisão de governança).
10. **Testes:** `MATRIZ-DE-TESTES.md` § D13.

## D14 — Escopo dos demais motores especializados (decisão de produto/governança)
1. **Problema:** módulos especializados podem exigir regras próprias.
2. **Mecanismos de dose identificados `[COD]`:** `palliative-engine` (`calcBreakthroughDose`, `calcOpioidRotation`, tabela equianalgésica, com bloqueios da RM-85); `icu-engine` (`calcVasopressorInfusion`); `oncology-engine` (BSA Mosteller/DuBois; demais funções de oncologia **não avaliadas** quanto a dose **[NC]**); `geriatric-engine` (`calcClCrCockcroft`, critérios PIM); `obstetric-engine`: **[NC]** (nenhuma função de cálculo de dose demonstrada na varredura); "pediatria" = `pediatric-engine` (B), já no escopo.
3. **Apresentações:** não aplicável.
4–5. **Comportamento:** não executados nesta etapa **[NC]**; consumidores: simulações/validações e telas próprias `[NC]`.
6. **Divergências demonstradas:** apenas BSA (cópias) e TFG (cópias); nenhuma divergência de dose demonstrada **[NC]**.
7. **Risco:** incorporar sem decisão ampliaria o escopo; dados do catálogo paliativo/UTI/oncologia aparecem entre os 207 que calculam dose adulta (ex.: oncologia 13 medicamentos) `[EXEC]`.
8. **Ausentes:** inventário completo de funções de dose desses módulos; consumidores.
9. **Fonte:** protocolos institucionais/diretrizes de cada especialidade.
10. **Testes:** `MATRIZ-DE-TESTES.md` § D14.
