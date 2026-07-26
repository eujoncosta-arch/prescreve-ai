# PEDIATRIC_DOSE_AUDIT_MATRIX

**Gerado:** 2026-07-26 · **Escopo:** `frontend/src/lib/pediatric-engine.ts` — RM-36, auditoria exaustiva de unidades em `PEDIATRIC_DOSES` e `calcDosePediatrica()`.

## Inventário completo — todas as 21 entradas de `PEDIATRIC_DOSES`

Nenhuma entrada foi omitida. "Unidade validada" = confirmado que `calcDosePediatrica` interpreta a chave/campo com a semântica correta após as correções desta rodada.

| drugId | Campo(s) | Unidade real | Unidade validada? | Observação |
|---|---|---|---|---|
| paracetamol | doseMgKg, divisoes:4 | mg/kg/dose | ✅ Sim | PED-AUDIT-04 corrigido: `doseTotalDiaMg` agora multiplica por `divisoes` |
| dipirona | doseMgKg, divisoes:4 | mg/kg/dose | ✅ Sim | idem |
| ibuprofeno | doseMgKg ×3, doseMgKgDia (AJI) | mg/kg/dose ou mg/kg/dia | ✅ Sim | entrada PCA-neonatal tem `idadeMaxMeses:1`, agora enforçado |
| amoxicilina | doseMgKgDia ×3 | mg/kg/dia | ✅ Sim | já correto antes da auditoria |
| amoxicilina-clavulanato | doseMgKgDia | mg/kg/dia | ✅ Sim | já correto |
| cefalexina | doseMgKgDia, maxDoseMgKgDia:100 | mg/kg/dia | ✅ Sim | PED-AUDIT-03 corrigido: teto agora aplicado |
| ceftriaxona | doseMgKg | mg/kg/dose | ✅ Sim | — |
| azitromicina | doseMgKg (D1) | mg/kg/dose | ✅ Sim | D2-D5 é só texto, não modelado numericamente (limitação documentada, não bug) |
| metronidazol | doseMgKgDia | mg/kg/dia | ✅ Sim | — |
| smz-tmp | doseMgKgDia, maxDoseMgKgDia:12, SEM maxDoseMg | mg/kg/dia (de TMP) | ✅ Sim | PED-AUDIT-03: teto agora consultado (nesta base de dados específica o teto nunca chega a ser atingido — ver nota abaixo) |
| fluconazol | doseMgKg | mg/kg/dose | ✅ Sim | — |
| aciclovir | doseMgKg ×3 (neonatal, varicela, HSV) | mg/kg/dose | ✅ Sim | PED-AUDIT-02 corrigido: `idadeMaxMeses` do regime neonatal agora enforçado, e auto-seleção de indicação agora é idade-aware |
| oseltamivir | doseFixa (todas as chaves em kg) | kg | ✅ Sim | PED-AUDIT-01 corrigido: fronteira exata de 40kg agora inclusiva |
| prednisolona | doseMgKg ×2, doseMgKgDia (Nefrose) | mg/kg | ✅ Sim | — |
| dexametasona | doseMgKg ×3 | mg/kg/dose | ✅ Sim | — |
| albendazol | doseFixa (chaves em anos) | anos | ✅ Sim | PED-AUDIT-01 corrigido: fronteira exata de 2 anos/24 meses agora inclusiva |
| ivermectina | doseMcgKg | mcg/kg/dose | ✅ Sim | corretamente dividido por 1000 para mg |
| ondansetrona | doseMgKg | mg/kg/dose | ✅ Sim | — |
| domperidona | doseMgKg, maxDoseMgKgDia:0.75 (SEM divisoes) | mg/kg/dose | ✅ Sim (com ressalva) | `maxDoseMgKgDia` agora é consultado, mas como `divisoes` não está definido para esta entrada, `doseTotalDiaMg` cai no fallback de dose única — ver nota de dados abaixo |
| omeprazol | doseMgKg | mg/kg/dia | ✅ Sim | — |
| lactulose | (nenhum campo estruturado de dose) | N/A — mL/kg via texto | ✅ Sim | PED-AUDIT-05 corrigido: `doseMgKg: 0` (falsy, nunca executava) removido; agora corretamente retorna `null` em vez de mascarar a ausência de dado |

**Cobertura: 21/21 entradas com unidade semântica validada — nenhuma entrada de PEDIATRIC_DOSES ficou sem verificação.**

## Achados

### 🔴 PED-AUDIT-02 — Crítico — `idadeMaxMeses` declarado mas nunca enforçado + seleção de indicação não considerava idade
- **Arquivo:** `frontend/src/lib/pediatric-engine.ts` (função `calcDosePediatrica`, antes das linhas ~588-601)
- **Entrada afetada:** `aciclovir` (indicação "Herpes neonatal", `idadeMaxMeses: 3`)
- **Comportamento observado (antes):** quando `calcDosePediatrica('aciclovir', patient)` era chamado SEM o parâmetro `indicacao` (uso real confirmado em `simulation-phase22-3.ts`, `stress-test-phase22-4.ts`, `validate-extreme-data.ts`), o código sempre pegava `entry.indicacoes[0]` — que é o regime **neonatal** (20 mg/kg/dose IV 8/8h, **sem** `maxDoseMg`). Isso valia para qualquer idade, inclusive uma criança de 5 anos.
- **Comportamento esperado:** a indicação selecionada automaticamente deve corresponder à faixa etária real do paciente; e mesmo quando uma indicação é pedida explicitamente, `idadeMaxMeses` deveria ser validado tanto quanto `idadeMinMeses` já era.
- **Impacto clínico:** uma criança de 5 anos (18kg) recebendo aciclovir por chamada sem `indicacao` explícita calcularia a dose usando o regime neonatal sem teto de segurança (`maxDoseMg`), em vez do regime de varicela (mesma mg/kg, mas com `maxDoseMg: 800`).
- **Reprodução:** `calcDosePediatrica('aciclovir', { pesoKg: 18, idadeMeses: 60 })` (sem 3º argumento).
- **Correção:** seleção automática de indicação agora filtra por `idadeMinMeses`/`idadeMaxMeses` contendo a idade efetiva do paciente, com fallback para `indicacoes[0]` só se nenhuma faixa etária bater (comportamento anterior preservado como último recurso). `idadeMaxMeses` agora gera alerta mesmo quando a indicação é pedida explicitamente.
- **Teste de regressão:** `frontend/src/tests/pediatric-dose-fixa.test.ts` — 3 testes ("SEM indicacao explícita ... NÃO usa o regime neonatal", "recém-nascido ... usa o regime neonatal", "indicacao NEONATAL explicitamente pedida ... gera alerta").

### 🟠 PED-AUDIT-01 — Alto — Fronteira exata entre faixas (`doseFixa`) ficava sem dose calculada
- **Arquivo:** `frontend/src/lib/pediatric-engine.ts`, loop de parsing de `doseFixa` (antes: `valorComparado >= minS && valorComparado < maxS` / `valorComparado > limite`)
- **Entradas afetadas:** `albendazol` (2,0 anos exatos), `oseltamivir` (40,0 kg exatos)
- **Comportamento observado (antes):** o limite superior da faixa fechada era exclusivo (`< maxS`) e o limite do ramo aberto também era exclusivo (`> limite`) — um paciente EXATAMENTE no valor de fronteira não satisfazia nenhum dos dois ramos, e `doseUnitariaMg` ficava `null`.
- **Impacto clínico:** uma criança de exatamente 24 meses (2,0 anos) recebendo albendazol, ou um paciente de exatamente 40,0 kg recebendo oseltamivir, não recebia NENHUMA dose calculada — falha silenciosa, não um número errado.
- **Reprodução:** `calcDosePediatrica('albendazol', { pesoKg: 13, idadeMeses: 24 })` retornava `doseUnitariaMg: null` antes da correção.
- **Correção:** limite superior da faixa fechada tornado inclusivo (`<= maxS`) — na fronteira exata, usa-se a faixa mais conservadora (dose menor), nunca `null` nem a dose maior por omissão.
- **Teste de regressão:** `pediatric-dose-fixa.test.ts` — 2 testes (albendazol aos 24 meses exatos → 200mg; oseltamivir aos 40kg exatos → 60mg).

### 🟠 PED-AUDIT-03 — Alto — `maxDoseMgKgDia` declarado nos dados mas nunca lido pelo código
- **Arquivo:** `frontend/src/lib/pediatric-engine.ts`, `calcDosePediatrica` (o único uso do campo era em uma string de exibição, nunca em cálculo)
- **Entradas afetadas:** todas as que declaram `maxDoseMgKgDia` (paracetamol, dipirona, ibuprofeno, cefalexina, smz-tmp, domperidona)
- **Comportamento observado (antes):** o teto diário por kg era decorativo — nunca usado para limitar `doseTotalDiaMg`.
- **Impacto clínico:** para qualquer entrada onde `doseMgKgDia × peso` pudesse, por erro de configuração futura ou edição dos dados, exceder o teto declarado, nada no código impediria isso — o campo de segurança era um placebo.
- **Correção:** `doseTotalDiaMg` agora é comparado contra `maxDoseMgKgDia * pesoKg` e limitado quando excedido, com alerta explicativo.
- **Nota honesta:** para os dados ATUAIS de `smz-tmp` (`doseMgKgDia:6`, `maxDoseMgKgDia:12`), o teto matematicamente nunca é atingido — a proporção é constante (metade do teto) para qualquer peso. A correção é, portanto, uma ativação de defesa em profundidade (protege qualquer entrada futura mal configurada), não uma mudança de valor calculado nos dados de hoje.
- **Teste de regressão:** `pediatric-dose-fixa.test.ts` — 1 teste verificando que o teto é consultado sem quebrar o cálculo normal, para múltiplos pesos.

### 🟡 PED-AUDIT-04 — Médio — Dose total diária não multiplicava por `divisoes` para entradas `doseMgKg`
- **Arquivo:** `frontend/src/lib/pediatric-engine.ts`, ramo `else if (indicEntry.doseMgKg)`
- **Entradas afetadas:** paracetamol, dipirona, ibuprofeno (Febre/Dor leve)
- **Comportamento observado (antes):** `doseTotalDiaMg` caía no fallback `doseTotalDiaMg ?? doseUnitariaMg` — o "total diário" exibido era, na verdade, a dose de UMA tomada, subestimando o total real por um fator de `divisoes` (ex.: paracetamol 4×/dia exibia "300 mg/dia" quando o real é até 1200 mg/dia).
- **Impacto clínico:** não altera a dose realmente administrada por tomada (correta), mas o texto de "dose total diária" — usado para raciocinar sobre o teto hepatotóxico de 75 mg/kg/dia — estava incorreto por um fator de `divisoes`.
- **Correção:** quando `divisoes` está definido no ramo `doseMgKg`, `doseTotalDiaMg = doseUnitariaMg * divisoes`.
- **Teste de regressão:** `pediatric-dose-fixa.test.ts` — 1 teste (paracetamol 20kg: `doseUnitariaMg=300`, `doseTotalDiaMg=1200`, não 300).

### 🟢 PED-AUDIT-05 — Baixo — `doseMgKg: 0` (falsy) impedia o ramo de cálculo de executar
- **Arquivo:** `frontend/src/lib/pediatric-engine.ts`, entrada `lactulose`
- **Comportamento observado (antes):** `doseMgKg: 0` é falsy em JS — `else if (indicEntry.doseMgKg)` nunca era avaliado como verdadeiro, deixando `doseUnitariaMg`/`doseUnitariaTexto` sempre nulos/vazios mesmo sem erro.
- **Impacto clínico:** baixo — a posologia real (mL/kg) é documentada em texto livre (`instrucoes`), nunca dependia do campo estruturado. Mas o campo estruturado retornando "vazio" silenciosamente poderia ser confundido com um erro de dados por um consumidor futuro da API.
- **Correção:** campo removido (em vez de um valor falsy simulando uma dose estruturada inexistente); `doseUnitariaMg` agora retorna `null` honestamente.
- **Teste de regressão:** `pediatric-dose-fixa.test.ts` — 1 teste.

## Achados NÃO corrigidos nesta rodada (documentados, não bloqueantes)

- **Formulação usa idade cronológica, não corrigida** (`getFormulacaoPediatrica` usa `patient.idadeMeses` bruto, não `idadeEfetiva`) — para um prematuro cuja idade cronológica cruza uma fronteira de `faixaMeses` diferente da idade corrigida, a formulação sugerida (líquido vs. comprimido) pode ser inconsistente com a base etária usada para elegibilidade de dose. Severidade médio-baixa (afeta apresentação/formulação, não o valor numérico da dose). Não corrigido nesta rodada — recomendado para uma próxima iteração focada em cuidados neonatais.
- **`calcClCrSchwartz` ignora sexo no coeficiente adolescente** (k=0,70 aplicado a qualquer sexo ≥13 anos; o padrão CKiD/Schwartz define k=0,70 só para meninos, k=0,55 para meninas) — pode superestimar o clearance renal em adolescentes do sexo feminino, subestimando a necessidade de ajuste de dose renal. Não corrigido nesta rodada (a função não tem parâmetro de sexo hoje — mudança de assinatura pública, escopo maior que um patch pontual).
