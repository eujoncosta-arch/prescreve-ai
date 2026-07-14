# Documentação técnica — Prescreve-AI

Índice das camadas de governança de dados, qualidade e interoperabilidade (RM-00 → RM-25).

## Camadas (docs de arquitetura)

| Camada | Documento | Resumo |
|---|---|---|
| RM-00 | [data-governance.md](data-governance.md) | IDs canônicos, proveniência e adaptadores read-only |
| RM-06 | [pharma-core.md](pharma-core.md) | Single Source of Truth + Drug Repository Layer + guard de lint |
| RM-22 | [rm-22-clinical-regression.md](rm-22-clinical-regression.md) | Suíte de regressão clínica (37 casos, 9 categorias) |
| RM-23 | [rm-23-drug-consistency.md](rm-23-drug-consistency.md) | Consistência Marca→Ativo→Conc→Dose→Indicação (gate de build) |
| RM-24 | [rm-24-cross-database.md](rm-24-cross-database.md) | Sincronia entre as 4 fontes (gate de publicação) |
| — | [interoperability.md](interoperability.md) | FHIR R4 / HL7 / RNDS + adaptador DrugEntity→FHIR |

## Relatórios reproduzíveis (raiz do repositório)

| Relatório | Como gerar |
|---|---|
| `RM06_MIGRATION_REPORT.md` | `pharma-core/validate.ts` |
| `RM22_CLINICAL_REGRESSION_REPORT.md` | `runClinicalRegression()` |
| `RM23_DRUG_CONSISTENCY_REPORT.md` | `npm run check:consistency` |
| `DATABASE_SYNC_REPORT.md` | `npm run check:sync` |
| `SYSTEM_AUDIT_REPORT.md` | `npm run audit` |
| `PRODUCTION_READINESS_REPORT.md` | RM-25 (auditoria read-only) |
| `PHARMA_AUDIT_REPORT.md` | RM-01 (achados da base) |

## Scripts de qualidade (gates)

| Comando | Gate |
|---|---|
| `npm run lint` | guard: proíbe import direto das bases legadas (usar `drugRepository`) |
| `npm run build` (`prebuild`) | RM-23 (consistência) **e** RM-24 (cross-database) — bloqueiam em crítico |
| `npm test` | 119 testes (RM-06/22/23/24 + FHIR + validador clínico) |
| `npm run test:coverage` | metas de cobertura na camada de decisão/canônica |
| `npm run audit` | relatório geral do sistema |

## Princípio transversal

**"Nunca inventar":** dados clínicos/regulatórios ausentes são documentados como gaps, nunca fabricados. Toda correção de dado é verificada em fonte (bula/WHO/diretriz/ANVISA).

---

*Prescreve-AI · documentação técnica.*
