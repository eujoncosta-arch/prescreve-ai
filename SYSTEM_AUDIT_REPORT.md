# SYSTEM_AUDIT_REPORT — Prescreve-AI

**Gerado:** 2026-07-13T23:00:29.445Z · **Escopo:** auditoria geral do sistema farmacológico (camadas RM-00 → RM-24)

> Relatório consolidado e reproduzível, com métricas extraídas ao vivo das camadas de dados, governança, testes e gates de publicação.

---

## 1. Base farmacológica canônica (RM-06)

| Métrica | Valor |
|---|---|
| Entidades canônicas (DrugEntity) | **355** |
| Migração fonte↔canônico | ✅ 1:1 |
| IDs duplicados | 0 |
| Conflitos marca↔laboratório | 0 |
| Marcas indexadas | 676 |
| Apresentações | 1358 |
| Variantes de contexto (intencionais) | 14 grupos |

## 2. Cobertura clínica (RM-01)

| Campo | Cobertura |
|---|---|
| Código ATC | 355/355 (100%) |
| Indicações | 355/355 (100%) |
| Contraindicações | 355/355 (100%) |
| Interações | 355/355 (100%) |
| Dose adulto | 355/355 (100%) |
| Ajuste renal | 355/355 (100%) |
| Ajuste hepático | 355/355 (100%) |
| Pediatria (dose ou "não se aplica") | 81/355 (23%) |
| Apresentações com registro ANVISA | 63/355 entidades |

**Proveniência (RM-00):** MEDIA=292 · ALTA=63

## 3. Integridade de dados (RM-23)

| Métrica | Valor |
|---|---|
| Entidades validadas | 355 |
| Inconsistências (crit/high/med/low) | 0/0/0/0 |
| Gate de build | ✅ liberado |

## 4. Sincronia entre fontes (RM-24)

| Métrica | Valor |
|---|---|
| Total analisado | 367 |
| Compatíveis | 90 |
| Divergentes | 28 |
| Críticos | 0 |
| Gate de publicação | ✅ liberado |

Fontes comparadas: PHARMA_DB (339) · Eurofarma (100) · Clinical rules (pediatria) (21) · Prescription engine (18).

## 5. Regressão clínica (RM-22)

| Métrica | Valor |
|---|---|
| Casos clínicos | 37 |
| PASS | 37/37 |
| Categorias | 9 |

Cobertura por categoria: interacoes 7/7 · contraindicacoes 5/5 · gestantes 3/3 · idosos 3/3 · renal 4/4 · pediatria 4/4 · dose 3/3 · controlados 6/6 · hepatico 2/2.

## 6. Gates de proteção ativos

| Gate | Quando | Bloqueia |
|---|---|---|
| Guard de lint (RM-06) | `npm run lint` | novos imports diretos das bases legadas |
| RM-23 Drug Consistency | `prebuild` + `npm test` | inconsistência `critical`/`high` na cadeia Marca→Ativo→Conc→Dose→Indicação |
| RM-24 Cross Database | `prebuild` + `npm test` | conflito crítico entre as 4 fontes |

## 7. Achados residuais (documentados, não fabricados)

- **RM-24:** 28 divergências não-críticas — combinações comerciais fora do escopo do PHARMA_DB e 5 agentes isolados que o motor de prescrição referencia e o PHARMA_DB não cadastra (ex.: prednisona, atenolol, dienogeste). Não fabricados — dependem de fonte clínica.
- **BAIXO-02 (ANVISA):** registros por apresentação exigem o portal oficial (não fabricados).
- **Verificação clínica exaustiva** das moléculas não-Eurofarma contra bula permanece trabalho de fonte contínuo.

## 8. Conclusão

Estado geral: **✅ ÍNTEGRO**. Base canônica única (355 entidades) com cobertura clínica alta, 
0 inconsistências críticas/altas, 0 conflitos críticos entre fontes e 37/37 casos de regressão clínica aprovados. 
Três gates automáticos protegem contra regressões futuras. Os achados residuais são gaps de completude documentados — nunca preenchidos por fabricação, conforme a regra de segurança "nunca inventar".

---

*SYSTEM_AUDIT_REPORT · gerado por `scripts/gen-system-audit.mjs` · métricas ao vivo.*