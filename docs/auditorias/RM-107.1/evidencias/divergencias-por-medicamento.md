# RM-107.1 — Divergências por medicamento (Etapa 3)

Sigla dos engines: **A** = `dosing-engine` (tela `/dosagem`); **B** = `pediatric-engine` (sem tela: só validadores, simulações e testes); **C** = `dose-calculator` + catálogo `QuickDrug` (tela principal `/prescricao-rapida`, via `DoseCalcCard`).
Dados: `matriz-regras-dose.json|csv` (488 linhas) e `resultados-comparados-pacientes-padrao.json` (10 medicamentos × 7 pacientes-padrão). Pacientes: neonato 14 d/3,5 kg; lactente 6 m/8 kg; criança 4 a/15 kg; criança 9 a/30 kg; adolescente 14 a/50 kg; adulto 40 a/70 kg; idoso 75 a/70 kg.

**Regras deste documento.** Nenhuma divergência foi corrigida nem "escolhida". A coluna *Causa provável* classifica **o que se observa nos dados** (indicação, faixa etária, tomada × dia, frequência, formulação, máximo, fonte, cadastro, contexto), mas **nenhuma causa foi confirmada contra fonte primária**: qualquer valor "correto" é pendência clínica. "Inconsistência real" = divergência que persiste mesmo comparando indicação, população e apresentação declaradas.
Todas as doses abaixo estão em **mg** salvo indicação; "mg/kg/dia" é normalizado por cálculo desta auditoria (dose por tomada × tomadas/dia).

## 1. Cefalexina (pediátrico: 25 × 50 mg/kg/dia)
| | A | B | C |
|---|---|---|---|
| Dose pediátrica | 25 mg/kg/dia, 6/6 h (lactente e pediátrico), sem indicação | 50 mg/kg/dia, 6/6 h, ≥ 1 mês, indicação "pele e partes moles / ITU", máx 500 mg/tomada | **não existe** (sem `dose_pediatrica`) |
| Adulto | 500 mg 6/6 h (idoso 500 mg 8/8 h) | — | 500 mg 6/6 h (texto "q6h padrão / q8h leves") |
- Resultado criança 15 kg: A 93,8 mg/tomada (375/dia); B 187,5 mg/tomada (750/dia); **C 500 mg/tomada (2.000/dia — dose adulta)** sem alerta. Neonato 3,5 kg: A bloqueia (sem regra), B bloqueia (< 1 mês), **C calcula 500 mg 6/6 h sem alerta**.
- Causas observadas: **ausência de contexto** (A não declara indicação), **fonte diferente** (A: diretriz agregada; B: lista de fontes), **ausência de regra pediátrica em C**. A diferença 25 × 50 persiste mesmo sem conhecer a indicação de A → **inconsistência real sem resolução**.

## 2. Amoxicilina (intervalo 8/8 × 12/12 h; adulto 500 mg 8/8 × 875 mg 12/12)
| | A | B | C |
|---|---|---|---|
| Pediátrico | 50 mg/kg/dia, **8/8 h**, aplicável a neonato + lactente + pediátrico (inclui < 28 d) | 50 mg/kg/dia **12/12 h** (OMA/IVAS, faringoamigdalite); **90 mg/kg/dia** 12/12 h (pneumonia); ≥ 1 mês; máx 500 mg/tomada | 45 mg/kg/dia, **12/12 h** (faixa textual "25 a 45", 2 m–12 a) |
| Adulto | 500 mg **8/8 h** (idoso 500 mg 12/12 h) | — | 875 mg **12/12 h** (frequências cadastradas "2x/dia / 3x/dia") |
- Resultado criança 15 kg: A 250 mg/tomada ×3 (750/dia); B 375 mg ×2 (750/dia); C 337,5 mg ×2 (675/dia). **A e B têm a mesma dose diária (50) e intervalos diferentes (8 × 12 h)**; C usa 45.
- Neonato 14 d: A calcula (175 mg/dia 8/8 h); B bloqueia (idade mínima 1 mês); C calcula (157,5 mg/dia).
- **C ignora a apresentação escolhida**: com 500 mg ou 875 mg selecionados, calcula 875 mg 12/12 h (verificação pontual). A RM-100 resolveu só A (amoxicilina + clavulanato) e só no `dosing-engine`.
- Causas: **frequência diferente** (8 × 12 h); **indicação diferente** (B separa pneumonia 90); **dose máxima diferente**; **adulto: apresentação/posologia diferentes** (sem `formulacao_ids` na amoxicilina simples); **inconsistência real sem resolução** (intervalo e dose adulta).

## 3. Amoxicilina + clavulanato (45 × 70 mg/kg/dia)
| | A | B | C |
|---|---|---|---|
| Pediátrico | 45 mg/kg/dia 12/12 h, suspensão 400 (indicação "germes β-lactamase +"), lactente/pediátrico | **70 mg/kg/dia** 12/12 h, ≥ 2 m, indicação "resistentes (PRSP, H. influenzae β-lact+)", suspensão 400/57 (7:1), máx 875 mg/tomada | 45 mg/kg/dia, 12/12 h (texto "25 a 45", bula Eurofarma) |
| Adulto | 875/125 mg 12/12 h (comp. 875) **ou** 500/125 mg 8/8 h (comp. 500) (RM-100) | — | 875/125 mg, frequências "2x/dia / 3x/dia", **ignora a apresentação** |
- Resultado criança 15 kg: A e C 337,5 mg/tomada; B 525 mg/tomada (1.050/dia).
- Causas: **indicação diferente + formulação diferente** (B declara "resistentes" e razão 7:1): provável explicação **não confirmada por fonte**; **faixa etária** (A: lactente ≥ 28 d; B/C ≥ 2 m); **máximo diferente** (A 2.000 mg/dia; B 875 mg/tomada; C 1.750 mg). Adulto: A consistente com RM-100, **C não** (não distingue 500/125 de 875/125).
- Classificação: divergência pediátrica **explicável por indicação/apresentação, sem validação** → pendência clínica; adulto em C → **erro cadastral/limitação de contrato** (apresentação não entra no cálculo).

## 4. Ibuprofeno
| | A | B | C |
|---|---|---|---|
| Pediátrico | 10 mg/kg 8/8 h (30 mg/kg/dia), "≥ 1 ano", máx 400 mg/tomada; lactente 6–11 m **bloqueado** | Febre 5 mg/kg/dose; dor 7,5 mg/kg/dose; 6–8 h; **≥ 6 m**; máx 400 mg/tomada e 40 mg/kg/dia; artrite 30 mg/kg/dia ≥ 12 m; **neonatal (PDA)** 0–1 m, esquema D1–D3 IV | 7,5 mg/kg/dose × 3, **≥ 6 m VO** (texto), máx 40 mg/kg/dia |
| Adulto | 400 mg 8/8 h (anti-inflamatório "600–800 mg 8/8 h" em texto); idoso 200 mg 8/8 h | — | 400–600 mg/dose; computa 400 mg 6/6 h (1.600/dia); máx 2.400 |
- Resultado criança 15 kg: A 150 mg/tomada ×3; B 75 mg/tomada (a cada 6–8 h); C 112,5 mg ×3. Lactente 8 kg: A bloqueia; B 40 mg; C 60 mg. Neonato: A bloqueia; **B retorna esquema de PDA**; **C calcula 26,3 mg × 3 por via oral**, com unidade rotulada "mg/kg/dose" para um valor absoluto em mg.
- Causas: **indicação diferente** (febre × dor × artrite × PDA), **faixa etária** (≥ 12 m × ≥ 6 m), **frequência** (8 h × 6–8 h), **dose máxima** (400 mg/tomada × 40 mg/kg/dia), **ausência de contexto** em A (sem indicação para a regra pediátrica), **rótulo de unidade inconsistente em C**. Adulto: dose/frequência diferentes entre A e C.

## 5. Omeprazol
| | A | B | C |
|---|---|---|---|
| Pediátrico | 1 mg/kg 24/24 h (DRGE/esofagite), máx **40 mg/dia**, lactente/pediátrico | 1 mg/kg/dose 1×/dia, máx **20 mg/tomada**, sem idade mínima (0 m) | **0,7 mg/kg/dia** (texto "> 1 ano: 0,7–3,3 mg/kg/dia"), máx 20 |
| Adulto | 20 mg 24/24 h, máx 40 | — | 20 mg 1×/dia (ou 2×/dia H. pylori), máx 40 |
- Resultado criança 9 anos/30 kg: **A 30 mg**; B 20 mg; C 20 mg. Criança 15 kg: A/B 15 mg; **C 10,5 mg**.
- Causas: **dose por kg diferente** (1 × 0,7; C escolheu um valor dentro de uma faixa textual 0,7–3,3), **dose máxima diferente** (A 40 mg/dia × B/C 20 mg), **faixa etária** (B sem mínimo × C "> 1 ano"). **Inconsistência real sem resolução**.

## 6. Dipirona
| | A | B | C |
|---|---|---|---|
| Pediátrico | 15 mg/kg 6/6 h (60 mg/kg/dia), máx 1.000 mg/tomada e 4.000/dia; **contraindicada < 90 dias** | 15 mg/kg/dose 6/6 h, máx 1.000 mg/tomada e **60 mg/kg/dia**; **contraindicada < 3 meses** | **10 mg/kg/dose** × 4 (40/dia), máx **50 mg/kg/dia**; texto "> 3 meses", **sem bloqueio por idade** |
| Adulto | 500 mg 6/6 h (idoso 500 mg 8/8 h); regra hospitalar 1.000 mg 8/8 h | — | 1.000 mg, frequência "6–8 h" (faixa → **frequência a confirmar**) |
- **Lactente de 60 dias/5 kg (verificação pontual): A BLOQUEIA ("contraindicado < 90 dias"), B BLOQUEIA (idade mínima 3 meses), C CALCULA 50 mg por tomada (200 mg/dia) sem alerta.** Neonato 14 d: A sem regra; B calcula com alerta 🚨; **C calcula 35 mg sem alerta**.
- Causas: **frequência/dose por kg diferentes** (15 × 10 mg/kg), **dose máxima diferente** (60 × 50 mg/kg/dia), **contraindicação etária ausente em C** (inconsistência de segurança), **adulto: dose diferente** (500 × 1.000 mg).

## 7. Sulfametoxazol + trimetoprima
| | A | B | C |
|---|---|---|---|
| Pediátrico | **8 mg/kg/dia de TMP** 12/12 h, máx 320 mg/dia (lactente/pediátrico) | **6 mg/kg/dia** (ITU/PCP) 12/12 h, ≥ 2 m, máx 12 mg/kg/dia | **não existe** |
| Adulto | 160 mg (**base TMP**) 12/12 h | — | "800/160 mg … q12h" (o motor lê 800 → **SMX ou combinado**) |
- Resultado criança 15 kg: A 60 mg/tomada; B 45 mg/tomada; **C 800 mg/tomada (dose adulta; 1.600 mg/dia) sem alerta**. Neonato 3,5 kg: A e B bloqueiam; **C calcula 800 mg 12/12 h**.
- Causas: **dose diferente** (8 × 6 mg/kg/dia), **substância de referência diferente** (TMP × combinação: 160 × 800 mg no adulto), **ausência de regra pediátrica em C**, **indicação** (B inclui PCP). Risco de unidade/base **não resolvido**.

## 8. Metformina
| | A | B | C |
|---|---|---|---|
| Pediátrico | regra "pediátrico" (1–11 a): 500 mg 12/12 h, indicação "> 10 anos com DM2", **sem idade mínima aplicada** | **sem regra** | `dose_pediatrica.dose_por_kg = 0` → motor cai na dose adulta |
| Adulto | 500 mg 12/12 h, máx **2.550** (idoso máx **2.000**) | — | 850 mg ("2x/dia / 3x/dia"), máx **3.000** |
- Resultado criança 4 a/15 kg: **A 500 mg 12/12 h**; **C 850 mg 12/12 h** (lactente 6 m e neonato também recebem 850 mg em C).
- Causas: **faixa etária** (bucket 1–11 a × "> 10 anos"), **dose máxima diferente** (2.550 × 2.000 × 3.000), **apresentação habitual diferente** (500 × 850), **ausência de bloqueio etário** em A e C.

## 9. Paracetamol (divergência adicional identificada)
- Neonato: A 10 mg/kg/tomada 6/6 h (regra própria); B e C 15 mg/kg/dose (B cita "RN a termo 10–15" em texto). Máximo diário: A 60 mg/kg/dia; **B 75 mg/kg/dia**; C 60 mg/kg/dia. Adulto: A 750 mg 6/6 h (máx 4.000); C 500 mg "4–6 h" → **frequência a confirmar**; B (motor pediátrico) devolve 1.000 mg/tomada para adulto de 70 kg.
- Causas: **população neonatal**, **dose máxima diferente**, **frequência diferente (faixa)**, **B sem limite superior de idade**.

## 10. Azitromicina (controle)
Dose diária pediátrica concorda nos três (10 mg/kg/dia, máx 500 mg) mas B descreve esquema **D1 10 mg/kg → D2–D5 5 mg/kg**, enquanto A e C aplicam 10 mg/kg/dia sem redução. Divergência de **esquema (dose de ataque × manutenção)**, não de valor inicial.

## Síntese das causas
| Causa | Casos |
|---|---|
| Indicação diferente | amoxicilina (pneumonia 90), amox-clav (resistentes 70), ibuprofeno (febre/dor/artrite/PDA), SMZ-TMP (PCP), azitromicina (esquema) |
| Faixa etária diferente / sem limite aplicado | ibuprofeno (≥ 12 × ≥ 6 m), dipirona (C sem bloqueio), metformina (A, C), omeprazol, amoxicilina (neonato) |
| Tomada × dia | não identificada como causa nos 10 medicamentos analisados (a RM-103 alinhou a semântica de A; os outros medicamentos não foram revistos nesta RM); **risco estrutural permanece** em C: rótulo "mg/kg/dose" aplicado a valor já em mg (ibuprofeno) e campo `max` do adulto sem período declarado (152 de 382 sem período) |
| Frequência diferente | amoxicilina (8 × 12 h), paracetamol/dipirona adulto (faixa → bloqueio em C), ibuprofeno |
| Formulação/concentração/apresentação | amox-clav (7:1), amoxicilina e amox-clav em C (ignora apresentação), SMZ-TMP (TMP × combinado), metformina (500 × 850) |
| Dose máxima diferente | paracetamol (60 × 75), dipirona (60 × 50 mg/kg/dia), omeprazol (40 × 20 mg), ibuprofeno, metformina |
| Fonte diferente | todos (A: diretrizes agregadas em 37 de 54 regras; B: fontes por entrada; C: nenhuma) |
| Erro cadastral provável / limitação de contrato | C: rótulo de unidade, `dose_por_kg = 0`, ausência de regra pediátrica, apresentação ignorada |
| Ausência de contexto | cefalexina (A sem indicação), omeprazol |
| Inconsistência real ainda sem resolução | cefalexina, amoxicilina (intervalo e adulto), omeprazol, dipirona (dose/kg e máximo), metformina (máximos), paracetamol (máximo diário) |

---

## Errata (acrescentada na conclusão documental da RM-107.1; o texto histórico acima foi preservado)
Evidências: `evidencias/catalogo-dose-calculator-resumo.json`, `evidencias/catalogo-dose-calculator-por-paciente.csv`, `evidencias/catalogo-uso-pediatrico-vs-calculo.json`, `evidencias/inventario-D1-por-medicamento.csv`, `evidencias/matriz-regras-dose.csv`.
1. **Medicamentos sem dose pediátrica (362 de 382).** Para neonato (14 d), lactente (6 m) e criança (4 a): **207** calculam dose adulta **sem bloqueio**; **125** bloqueiam **somente por frequência indeterminada** (o comportamento após a confirmação manual da frequência é leitura de código, não executado); **30** não têm dose numérica ou receberam alerta crítico. Onde este documento afirma que o `dose-calculator` aplica dose adulta "para os 362" sem alerta, leia-se esta decomposição.
2. **Regra pediátrica não utilizada.** **5 dos 20** medicamentos com `dose_pediatrica` não usam essa regra (metformina, salbutamol, budesonida, montelucaste, vitamina K1 neonatal) e recebem o caminho adulto (criança de 4 anos).
3. **`uso_pediatrico = nao_aplicavel`.** O campo está presente em **66** medicamentos, mas **não é consultado** pelo cálculo; **55** desses estão entre os **207** que calculam dose adulta sem bloqueio.
4. **Amoxicilina + clavulanato — idade mínima em A.** O motor A (`dosing-engine`) tem `contraindicado_ate_dias = 60` nessa regra pediátrica: a idade mínima identificada é **60 dias**, e não 28 dias; **A e B concordam** (≈ 2 meses) nesse ponto.
Nenhuma conclusão foi ampliada além do demonstrado. Nenhuma divergência foi resolvida; todas as decisões D1–D14 permanecem **PENDENTES**.
