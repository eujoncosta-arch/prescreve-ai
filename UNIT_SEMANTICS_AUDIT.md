# UNIT_SEMANTICS_AUDIT

**Gerado:** 2026-07-26 · **Escopo:** varredura estrutural de todo o código de dose/prescrição (`frontend/src/lib/*.ts`) por padrões perigosos de confusão de unidade (idade×peso, mg×mg/kg, mL×gotas, arredondamento, limites por dose×por dia).

## Metodologia

Busca dirigida por 8 categorias de padrão perigoso (ver prompt da auditoria RM-36) em `dose-calculator.ts`, `dosing-engine.ts`, `pediatric-engine.ts`, `icu-engine.ts`, `geriatric-engine.ts`, `obstetric-engine.ts`, `prognostic-engine.ts` e consumidores de UI (`DoseCalcCard.tsx`, `app/dosagem/page.tsx`).

## Achados confirmados

### 🔴 UNIT-AUDIT-01 — Crítico — Dose por superfície corporal (BSA) sem altura caía silenciosamente para a dose adulta
- **Arquivo:** `frontend/src/lib/dose-calculator.ts`, função `calcFullDose` (ramo `mg/m²`/`mcg/m²` sem `alturaFinal`)
- **Evidência (antes):**
  ```js
  if (!alturaFinal || alturaFinal <= 0) {
    alertas.push(`⚠ Informe a altura para calcular dose por superfície corporal (${ped.calculo})`);
    dosePorTomada = parseFloat(drug.dose_adulto.habitual) || 0; // fallback: dose ADULTA
    ...
  }
  ```
- **Comportamento observado:** sem altura, o motor calculava e retornava a DOSE ADULTA INTEIRA como se fosse a posologia pediátrica sugerida, com um alerta prefixado `⚠` (aviso).
- **Comportamento esperado:** nunca substituir uma dose pediátrica por superfície corporal (tipicamente usada para quimioterápicos) pela dose adulta — bloquear o cálculo até que a altura seja informada.
- **Impacto clínico:** `DoseCalcCard.tsx` só desabilita o botão "Aplicar esta posologia" quando existe um alerta prefixado `🚨` (`hasCritical`). Um alerta `⚠` mantinha o botão HABILITADO — um médico podia, com um único clique, aplicar a dose adulta completa de um quimioterápico numa criança sem que o sistema exigisse a altura.
- **Reprodução:** `calcFullDose(drogaBSA, 5, 18, '500 mg', ..., alturaM: undefined)` retornava `dose_por_tomada: 500` (dose adulta) antes da correção.
- **Correção:** o ramo agora NUNCA calcula uma dose substituta — bloqueia (`dose_por_tomada: 0`) e emite um alerta `🚨` (crítico), desabilitando o botão de aplicar.
- **Teste de regressão:** `frontend/src/tests/dose-calculator-unit-audit.test.ts` — 3 testes.

### 🟠 UNIT-AUDIT-02 — Alto — Validação de "dose excede o máximo" era calculada DEPOIS do corte automático, sempre falsa
- **Arquivo:** `frontend/src/lib/dosing-engine.ts`, função `calcularDosagem`
- **Evidência (antes):**
  ```js
  if (regra.dose_maxima_por_dia_mg && dose_total_dia_mg > regra.dose_maxima_por_dia_mg) {
    dose_total_dia_mg = regra.dose_maxima_por_dia_mg; // corta ANTES
  }
  ...
  const excede_dose_maxima_dia = !!(regra.dose_maxima_por_dia_mg && dose_total_dia_mg > regra.dose_maxima_por_dia_mg * 1.01); // compara o JÁ CORTADO
  ```
- **Comportamento observado:** `dose_total_dia_mg`/`dose_por_dose_mg` eram clampados (`Math.min`) ANTES de `excede_dose_maxima_dia`/`_dose` serem calculados — ou seja, os booleanos comparavam o valor JÁ REDUZIDO contra o mesmo teto, o que matematicamente quase nunca é verdadeiro.
- **Comportamento esperado:** os booleanos deveriam refletir se a dose PRESCRITA (antes de qualquer correção automática) excedia o máximo seguro.
- **Impacto clínico:** `app/dosagem/page.tsx` usa esses booleanos para exibir um selo verde "Dose validada"/"Dose diária validada". Com o bug, o selo aparecia verde mesmo quando a prescrição original excedia brutalmente o máximo seguro — o sistema reduzia a dose silenciosamente e ainda assim mostrava "validado", escondendo do médico que uma intervenção automática de segurança havia ocorrido.
- **Reprodução:** medicamento sintético com `100 mg/kg/dia` e `dose_maxima_por_dia_mg: 1000`; para um paciente de 70kg (dose bruta 7000mg/dia), `excede_dose_maxima_dia` retornava `false` antes da correção.
- **Correção:** os valores BRUTOS (pré-clamp) são capturados antes do `Math.min` e usados para calcular os booleanos de validação; o clamp em si (a dose realmente aplicada) continua respeitando o teto normalmente.
- **Teste de regressão:** `frontend/src/tests/dosing-engine-unit-audit.test.ts` — 3 testes.

### 🟡 UNIT-AUDIT-03 — Médio — Conversão mL→gotas hardcoded (20 gtt/mL) para qualquer formulação líquida
- **Arquivo:** `frontend/src/lib/dose-calculator.ts` (`convertDose`, `mL_to_drops`) e `calcFullDose` (linha ~624 histórica)
- **Evidência:** `const drops = value * 20;` aplicado a qualquer líquido com `tipo: 'liquido'`, incluindo suspensões/xaropes comuns (ex.: amoxicilina 250mg/5mL) que nunca são administrados por contagem de gotas e não têm gtt/mL definido. `dosing-engine.ts`, em contraste, já modela `gotas_por_mL` por formulação corretamente, restrito a `tipo: 'gotas_oral'`.
- **Impacto clínico:** `DoseCalcCard.tsx` exibe um toggle "Gotas" para qualquer líquido e mostra uma cifra de "X gotas por dose" fabricada para suspensões nunca validadas para gtt/mL — se alguém contar gotas usando essa cifra para uma suspensão, a dose real administrada diverge da calculada (conta-gotas/copo medidor de suspensões não são padronizados em 20 gtt/mL).
- **Status:** **não corrigido nesta rodada.** Justificativa: a correção correta exige diferenciar, em `dose-calculator.ts`, formulações `gotas_oral` (com `gotas_por_mL` explícito) de formulações líquidas genéricas — uma mudança de modelo de dados mais ampla que replica o que `dosing-engine.ts` já faz corretamente, e que toca a lógica de exibição de UI (`DoseCalcCard.tsx`) que não foi auditada exaustivamente nesta rodada. Risco documentado para correção dedicada.

### 🟡 UNIT-AUDIT-04 — Médio — `maxDoseMgKgDia` (domperidona) inconsistente com alerta em texto livre; campo sem `divisoes`
- **Arquivo:** `frontend/src/lib/pediatric-engine.ts`, entrada `domperidona`
- **Evidência:** campo estruturado `maxDoseMgKgDia: 0.75`, mas o alerta em texto livre diz `'Máx 2,4 mg/kg/dia'` — divergência de ~3,2× entre o dado estruturado e o texto.
- **Impacto:** o teto agora É consultado pela correção do PED-AUDIT-03 (`PEDIATRIC_DOSE_AUDIT_MATRIX.md`), mas com o valor 0,75 mg/kg/dia potencialmente incorreto (dependendo de qual figura — 0,75 ou 2,4 — é a clinicamente correta), a proteção poderia estar mais restritiva do que deveria (falso-positivo de bloqueio) ou o texto estar simplesmente desatualizado.
- **Status:** **não corrigido nesta rodada** — requer confirmação clínica de qual valor (0,75 ou 2,4 mg/kg/dia) é o correto antes de alterar dado estruturado ou texto; correção de dado, não de lógica. Documentado para revisão farmacêutica dedicada.

## Itens "precisa revisão humana" (ambíguos, não confirmados como bug)

1. **`peso === 0`/`idade === 0` tratados como ausência de dado** (`dose-calculator.ts:53`, `prognostic-engine.ts` várias linhas) — `if (!params.peso || !params.idade) return null;`. Peso 0 nunca é clinicamente válido (seguro). Idade 0 (recém-nascido no dia 1 de vida) também aciona o mesmo guard — provavelmente intencional (fórmulas de Cockcroft-Gault/BSA não valem para neonatos), mas não confirmado explicitamente nos comentários do código.
2. **Fallbacks `?? default` em sinais vitais não medidos** (`icu-engine.ts` — `patient.lactato ?? 0`, `patient.pamMMHg ?? 80`, `patient.temperaturaC ?? 37`) — trata "não medido" como "normal", o que pode mascarar um valor crítico realmente não medido como se fosse tranquilizador. Não é confusão de unidade, mas um risco correlato de "valor ausente interpretado como seguro" — mesma família de risco do `||`/`??` mencionada no escopo desta auditoria.
3. **Inferência de frequência por substring** (`dose-calculator.ts:601-608` — `frequencias[0]?.includes('2x')`, `'12/12h'` etc.) — qualquer string de frequência que não bata nesses padrões cai silenciosamente em `tomadas = 1`, subestimando a dose total diária. Não verificado exaustivamente contra todo o corpus `pharma-database-*.ts` por strings não conformes.
4. **`doseFixa` sem sufixo de unidade explícito** — a correção desta auditoria depende de `faixa.includes('anos')`/`'meses'`/`'kg'`. Qualquer entrada FUTURA adicionada a `PEDIATRIC_DOSES` sem um desses sufixos na chave cairia silenciosamente no ramo de peso. Recomenda-se um teste de lint/schema que rejeite chaves de `doseFixa` sem unidade explícita.
5. **Validação de dose no boundary do backend** (`backend/src/modules/consulta/dto/consulta.dto.ts` — campo `dose: string` livre, sem validação numérica/unidade) — toda a proteção de unidade hoje vive no frontend; o backend aceita qualquer string. Fora do escopo desta auditoria (focada no núcleo farmacológico do frontend), mas sinalizado para consciência.

## Resumo de cobertura

- 2 achados corrigidos e testados nesta rodada (UNIT-AUDIT-01 🔴, UNIT-AUDIT-02 🟠).
- 2 achados médios documentados como não corrigidos, com justificativa (UNIT-AUDIT-03, UNIT-AUDIT-04).
- 5 itens "precisa revisão humana" listados explicitamente, não escondidos como se tivessem sido verificados.
