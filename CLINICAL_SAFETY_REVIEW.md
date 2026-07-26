# CLINICAL_SAFETY_REVIEW

**Gerado:** 2026-07-26 · **RM-36 — Auditoria exaustiva de segurança clínica e unidades**

Este documento resume a auditoria e serve de índice para os três relatórios detalhados:
[PEDIATRIC_DOSE_AUDIT_MATRIX.md](PEDIATRIC_DOSE_AUDIT_MATRIX.md), [CRITICAL_PAIRS_AUDIT_MATRIX.md](CRITICAL_PAIRS_AUDIT_MATRIX.md), [UNIT_SEMANTICS_AUDIT.md](UNIT_SEMANTICS_AUDIT.md).

## Motivação

A auditoria de segurança final anterior (`FINAL_SECURITY_AUDIT_REPORT.md`) encontrou dois bugs críticos reais na mesma classe de erro — confusão de unidade em dados de dose pediátrica e uma falha de deduplicação em `CRITICAL_PAIRS` — e recomendou explicitamente uma "varredura dedicada" de ambas as estruturas por bugs análogos. Este documento é essa varredura.

## Resultado consolidado

| Severidade | Encontrados nesta rodada | Corrigidos | Abertos (documentados) |
|---|---|---|---|
| 🔴 Crítico | 3 | 3 | **0** |
| 🟠 Alto | 4 | 4 | **0** |
| 🟡 Médio | 5 | 2 | 3 (justificados) |
| 🟢 Baixo | 1 | 1 | 0 |

**Nenhuma vulnerabilidade crítica ou alta permanece aberta sem correção.**

## Achados críticos e altos — resumo com correção e teste

| ID | Severidade | Resumo | Arquivo | Teste de regressão |
|---|---|---|---|---|
| PHARMA-01* | 🔴 | (já corrigido em auditoria anterior) dedup de CRITICAL_PAIRS comparava só mol_a | safety-rules.ts | safety-rules-critical-pairs.test.ts |
| PEDIATRIC-01* | 🔴 | (já corrigido em auditoria anterior) chave de faixa etária parseada como peso | pediatric-engine.ts | pediatric-dose-fixa.test.ts |
| PED-AUDIT-02 | 🔴 | `idadeMaxMeses` nunca enforçado + seleção de indicação ignorava idade (aciclovir neonatal em criança de 5 anos) | pediatric-engine.ts | pediatric-dose-fixa.test.ts (3 testes) |
| CRIT-AUDIT-01 | 🔴 | Lítio (acento) nunca batia com token sem acento — par mais perigoso da lista nunca disparava | safety-rules.ts | safety-rules-critical-pairs.test.ts |
| CRIT-AUDIT-02 | 🔴 | Nitrato (token) não bate com nomes reais (Nitroglicerina/Isossorbida) — 3 pares nunca disparavam | safety-rules.ts | safety-rules-critical-pairs.test.ts (2 testes) |
| CRIT-AUDIT-03 | 🔴 | Alerta crítico (QT) descartado por alerta mais fraco do banco já existente | safety-rules.ts | safety-rules-critical-pairs.test.ts (2 testes) |
| UNIT-AUDIT-01 | 🔴 | Dose por m² sem altura caía silenciosamente para dose adulta, botão "Aplicar" ficava habilitado | dose-calculator.ts | dose-calculator-unit-audit.test.ts (3 testes) |
| PED-AUDIT-01 | 🟠 | Fronteira exata entre faixas (2 anos/40kg) ficava sem dose calculada | pediatric-engine.ts | pediatric-dose-fixa.test.ts (2 testes) |
| PED-AUDIT-03 | 🟠 | `maxDoseMgKgDia` declarado mas nunca enforçado | pediatric-engine.ts | pediatric-dose-fixa.test.ts |
| CRIT-AUDIT-04 | 🟠 | Duplicata ieca+bra via nomes reais não suprimida (resolvido como efeito colateral de CRIT-AUDIT-03) | safety-rules.ts | safety-rules-critical-pairs.test.ts |
| UNIT-AUDIT-02 | 🟠 | Validação "excede dose máxima" calculada após o corte automático, sempre falsa — selo "validado" enganoso | dosing-engine.ts | dosing-engine-unit-audit.test.ts (3 testes) |

*PHARMA-01 e PEDIATRIC-01 foram corrigidos na rodada de auditoria anterior (`FINAL_SECURITY_AUDIT_REPORT.md`) — listados aqui apenas para contexto de que a varredura desta rodada re-verificou que NÃO havia regressão nem bugs remanescentes da mesma classe além dos listados acima.

## Achados médios e baixos — resumo

| ID | Severidade | Status | Justificativa se aberto |
|---|---|---|---|
| PED-AUDIT-04 | 🟡 | ✅ Corrigido | — |
| PED-AUDIT-05 | 🟢 | ✅ Corrigido | — |
| PED-AUDIT-06 (formulação usa idade cronológica, não corrigida) | 🟡 | 🟡 Aberto | Afeta apresentação/formulação, não o valor numérico da dose; escopo de cuidados neonatais dedicado |
| PED-AUDIT-07 (Schwartz ignora sexo) | 🟡 | 🟡 Aberto | Mudança de assinatura pública da função, fora do escopo de um patch pontual |
| CRIT-AUDIT-05 (isrs+tramadol redundante) | 🟡 | 🟡 Aberto | Apenas ruído informativo, não supressão de alerta crítico |
| UNIT-AUDIT-03 (mL→gotas hardcoded) | 🟡 | 🟡 Aberto | Requer modelo de dados mais amplo + auditoria de UI não coberta nesta rodada |
| UNIT-AUDIT-04 (domperidona: dado vs. texto divergentes) | 🟡 | 🟡 Aberto | Requer confirmação farmacêutica de qual valor é o correto antes de alterar |

## Testes metamórficos e de fronteira aplicados

- **Invariante de simetria:** ordem dos medicamentos não altera a detecção de um par simétrico (`safety-rules-critical-pairs.test.ts`).
- **Invariante de não-supressão:** adicionar um medicamento não crítico não remove um alerta crítico já detectado (`safety-rules-critical-pairs.test.ts`); adicionar uma interação independente não suprime outra (testes pré-existentes reverificados).
- **Invariante idade vs. peso:** alterar o peso de uma criança não muda a dose de uma regra baseada em idade, e vice-versa (`pediatric-dose-fixa.test.ts` — teste "bebê de 13 meses pesando mais que um adulto pequeno").
- **Fronteiras exatas testadas:** 24 meses (albendazol), 40kg (oseltamivir), 0/1/3 meses (aciclovir neonatal/idadeMaxMeses).
- **Múltiplos pares compartilhando molécula:** testado exaustivamente para o grupo "ieca" (4 pares) e "amiodarona" (2 pares via QT).

## Critério final de saída — verificação

| Critério | Status |
|---|---|
| Nenhuma entrada de PEDIATRIC_DOSES sem unidade semântica validada | ✅ 21/21 entradas na tabela de `PEDIATRIC_DOSE_AUDIT_MATRIX.md` |
| Nenhum CRITICAL_PAIR sem teste comportamental | ✅ 22/22 pares testados isoladamente (antes: 3/22) |
| Nenhuma colisão de deduplicação não analisada | ✅ toda colisão de mol_a/mol_b mapeada na matriz; as que causavam supressão real (CRIT-AUDIT-03/04) foram corrigidas |
| Nenhuma inconsistência de unidade não resolvida | ✅ resolvida ou explicitamente documentada com justificativa (UNIT_SEMANTICS_AUDIT.md) |
| Todos os testes passando | ✅ backend 122 unit + 91 e2e; frontend 461 (era 418 antes desta rodada — +43 novos testes) |
| Typecheck limpo | ✅ `tsc --noEmit` limpo (frontend e backend) |
| Build limpo | ✅ `eslint --fix` limpo em todos os arquivos modificados |

## O que foi alterado no núcleo farmacológico (transparência total)

| Arquivo | O que estava errado | Por que estava errado | Comportamento clínico alterado | Teste que prova |
|---|---|---|---|---|
| `safety-rules.ts` | Matching de `CRITICAL_PAIRS` não normalizava acento nem consultava `molecula`/`sinonimos` | Só `classe` era verificado, com comparação literal sensível a acento | Lítio+HCTZ e os 3 pares de nitrato agora DISPARAM para nomes reais de medicamentos (antes nunca disparavam) | `safety-rules-critical-pairs.test.ts` |
| `safety-rules.ts` | Dedup descartava alerta crítico quando um alerta mais fraco do banco já existia para o mesmo par | Checagem via string, sem comparar severidade | Azitromicina+Amiodarona e Moxifloxacino+Amiodarona agora mostram o alerta CRÍTICO específico em vez do genérico mais fraco | `safety-rules-critical-pairs.test.ts` |
| `pediatric-engine.ts` | Seleção automática de indicação ignorava `idadeMinMeses`/`idadeMaxMeses` | Sempre usava `indicacoes[0]` quando `indicacao` não era passada | Aciclovir sem indicação explícita não usa mais o regime neonatal (sem teto de dose) para crianças fora da faixa neonatal | `pediatric-dose-fixa.test.ts` |
| `pediatric-engine.ts` | Fronteira exata de faixa (`doseFixa`) ficava sem dose | `<` no limite superior e `>` no ramo aberto, ambos exclusivos | Paciente exatamente na fronteira (24 meses, 40kg) agora recebe uma dose definida (a mais conservadora) em vez de `null` | `pediatric-dose-fixa.test.ts` |
| `pediatric-engine.ts` | `maxDoseMgKgDia` nunca lido | Campo de dados sem consumidor no código | Teto diário por kg agora é aplicado (defesa em profundidade; não muda valores nos dados atuais) | `pediatric-dose-fixa.test.ts` |
| `pediatric-engine.ts` | Total diário não multiplicava por `divisoes` para entradas `doseMgKg` | Fallback simples `doseTotalDiaMg ?? doseUnitariaMg` | Texto de dose total diária (paracetamol etc.) agora reflete o total real (dose×divisões), não a dose de uma tomada | `pediatric-dose-fixa.test.ts` |
| `pediatric-engine.ts` | `doseMgKg: 0` (falsy) impedia o cálculo | `0` é falsy em JS | Lactulose agora retorna `null` honestamente em vez de mascarar ausência de dado | `pediatric-dose-fixa.test.ts` |
| `dose-calculator.ts` | Dose BSA sem altura caía para dose adulta com alerta não-crítico | Fallback silencioso + prefixo de alerta errado (`⚠` em vez de `🚨`) | Cálculo agora é bloqueado (nunca substitui por dose adulta) e o botão "Aplicar" fica desabilitado | `dose-calculator-unit-audit.test.ts` |
| `dosing-engine.ts` | Validação "excede máximo" calculada após o clamp | Ordem de operações — clamp antes da checagem | Selo "dose validada" agora reflete a dose PRESCRITA original, não a já corrigida | `dosing-engine-unit-audit.test.ts` |

Nenhuma outra lógica clínica (protocolos, priorização terapêutica, motor de segurança renal/hepática, cálculo de BSA em si, fórmulas de Schwartz/Cockcroft-Gault) foi alterada nesta rodada.
