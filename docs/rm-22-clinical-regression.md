# Clinical Regression Suite — RM-22

**Camada:** RM-22 · **Status:** implementada · **Módulo:** [`frontend/src/clinical-tests/`](../frontend/src/clinical-tests)
**Runner:** [`src/tests/clinical-regression.test.ts`](../frontend/src/tests/clinical-regression.test.ts) (Vitest — roda a cada `npm test`)

> Garante que qualquer alteração futura (dados ou motores) **não cause regressões clínicas**. Cada caso simula um cenário real de paciente e verifica, contra os motores reais, que o alerta/decisão esperado continua sendo produzido.

---

## 1. Como funciona

Cada **caso clínico** (`ClinicalCase`) declara os campos exigidos:

| Campo | Conteúdo |
|---|---|
| **Caso clínico** | paciente + contexto (ex.: "65 anos, HAS + DM + DRC") |
| **Entrada** | o que é submetido ao motor (moléculas, TFG, K+, idade…) |
| **Resultado esperado** | o alerta/decisão que deve ocorrer |
| **Resultado obtido** | produzido em tempo real pelo motor |
| **Status** | `PASS` / `FAIL` |

O `assert()` de cada caso chama o **motor real** e compara — nada é mockado:

- **safety-rules** (`runSafetyCheck`, já sobre o `pharma-core`) → interações, contraindicações, gestante, idoso, renal, ARM/K+.
- **pediatric-engine** (`calcDosePediatrica`) → dose pediátrica.
- **dose-calculator** (`calcWeightDose`, `checkBeersCriteria`, `classifyPopulation`) → capagem de dose, Beers, população.
- **drugRepository** (`pharma-core`) → invariantes da base canônica.
- **controlled-substances** (Portaria 344/98) → reconhecimento de controlados.

---

## 2. Cobertura (8 categorias exigidas)

| Categoria | Casos | Exemplos |
|---|---|---|
| interações | 4 | nitrato+iPDE5, lítio+tiazídico, IMAO+ISRS, polifarmácia 65a |
| contraindicações | 3 | montelucaste (FDA), ARM sem K+, ARM+hipercalemia+TFG |
| gestantes | 3 | enalapril, varfarina, isotretinoína |
| idosos | 3 | Beers (amitriptilina, diazepam), classificação geriátrica |
| insuficiência renal | 3 | metformina TFG 10, pemetrexede TFG 20, controle negativo |
| pediatria | 3 | dose paracetamol/amoxicilina, adulto-only não aplicável |
| dose incorreta | 2 | capagem no teto máximo, dose dentro do teto |
| controlados | 4 | morfina, clonazepam, metilfenidato, controle negativo |

**Total: 25 casos + 2 metatestes** (cobertura das categorias + ids únicos). Sempre verdes; um `FAIL` aponta a regressão exata (caso, entrada, esperado, obtido).

---

## 3. Execução automática

- **A cada alteração:** `npm test` (Vitest) roda toda a suíte — a RM-22 falha o build de testes se uma regressão clínica surgir.
- **Relatório sob demanda:** `formatReportMarkdown(runClinicalRegression())` gera [`RM22_CLINICAL_REGRESSION_REPORT.md`](../RM22_CLINICAL_REGRESSION_REPORT.md) com o quadro Caso/Entrada/Esperado/Obtido/Status.

## 4. Como adicionar um caso

Acrescente um `ClinicalCase` em `src/clinical-tests/cases.ts` com `assert()` chamando o motor real e devolvendo `{ obtido, status }`. O runner Vitest o executa automaticamente (um teste por caso).

---

*Documento — Prescreve-AI · RM-22 Clinical Regression Suite.*
