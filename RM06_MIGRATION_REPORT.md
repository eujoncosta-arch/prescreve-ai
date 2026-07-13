# RM06_MIGRATION_REPORT — Single Source of Truth (pharma-core)

**Camada:** RM-06 · **Gerado:** 2026-07-13T21:54:32.368Z · **Modo:** read-only (bases legadas preservadas)

> Valida a migração das bases farmacológicas legadas para a base canônica única (`DrugEntity`) exposta pelo **Drug Repository Layer** (`src/lib/pharma-core`). Nenhuma base antiga foi alterada ou apagada.

---

## 1. Registros migrados

| Métrica | Valor |
|---|---|
| QuickDrugs na fonte (getAllDrugs) | 355 |
| DrugEntity migrados | **355** |
| Paridade fonte↔canônico | ✅ 1:1 |
| Marcas canônicas indexadas | 676 |
| Apresentações canônicas | 1358 |
| Regras de interação migradas | 807 |
| Apresentações com registro ANVISA | 63 entidades |

## 2. Conflitos

**Marca atribuída a mais de um laboratório:** 0

✅ Nenhum conflito marca↔laboratório (root cause do ALTO-02/03 já corrigido no RM-01).

## 3. Duplicidades

**IDs canônicos repetidos:** 0 ✅

**Molécula em múltiplos registros (variantes de contexto — esperado, RM-01 MED-01):** 14 grupos

| molecule_id | Registros | Contextos |
|---|---|---|
| mol:azitromicina | azitromicina, azitromicina_dpoc | Infecção aguda (esquema padrão) / Profilaxia de exacerbação na DPOC (uso prolongado) |
| mol:prednisolona | prednisolona, prednisolona_asma | Corticoterapia geral (anti-inflamatório/imunossupressor) / Exacerbação de asma (curso curto) |
| mol:tramadol | tramadol, tramadol-paliativo | Dor aguda moderada (geral) / Dor em cuidados paliativos |
| mol:amiodarona | amiodarona, amiodarona-pcr | Antiarrítmico crônico (FA/flutter) / PCR / arritmia — protocolo de emergência |
| mol:amitriptilina | amitriptilina, amitriptilina-paliativa | Depressão / dor neuropática (psiquiatria) / Dor neuropática em cuidados paliativos |
| mol:haloperidol | haloperidol, haloperidol-paliativo | Psicose / agitação (psiquiatria) / Náusea / delirium em cuidados paliativos |
| mol:gabapentina | gabapentina, gabapentina-paliativa | Epilepsia / dor neuropática (geral) / Dor neuropática em cuidados paliativos |
| mol:fenobarbital | fenobarbital, fenobarbital-neonatal, fenobarbital-paliativo | Epilepsia (geral) / Convulsão neonatal / Sedação paliativa / convulsão refratária |
| mol:midazolam | midazolam, midazolam-uti, midazolam-paliativo | Sedação / ansiólise (geral) / Sedação contínua em UTI / Sedação paliativa |
| mol:lorazepam | lorazepam, lorazepam-paliativo | Ansiedade / status epilepticus (psiquiatria) / Ansiedade / agitação em cuidados paliativos |
| mol:ondansetrona | ondansetrona, ondansetrona-paliativa | Náusea / vômito (geral) / Náusea em cuidados paliativos |
| mol:metoclopramida | metoclopramida, metoclopramida-paliativa | Náusea / gastroparesia (geral) / Náusea / obstrução intestinal em cuidados paliativos |
| mol:fentanil | fentanil-uti, fentanil-transdermico | Analgossedação em UTI (IV contínuo) / Dor crônica — adesivo transdérmico |
| mol:naloxona | naloxona, naloxona-antidoto-opioide | Reversão de opioide — emergência / Reversão de opioide — cuidados paliativos |

> Estes NÃO são erros: são variantes clínicas intencionais (UTI/paliativo/neonatal) marcadas com `clinicalContext`. A consolidação preserva cada dose de contexto — nenhuma foi mesclada.

## 4. Dados ausentes (lacunas de completude)

| Campo | Entidades sem o dado |
|---|---|
| Sem interações | 0 |
| Sem regras de dose | 0 |
| Sem indicações | 0 |
| Sem contraindicações | 0 |
| Sem ATC | 0 |
| Sem apresentações | 0 |
| Com apresentação mas sem registro ANVISA | 292 |

## 5. Smoke test do Drug Repository Layer

| Consulta | Resultado |
|---|---|
| `getById(enalapril)` | Enalapril |
| `count()` | 355 |
| `getByActiveIngredient(midazolam)` | 3 registros: midazolam, midazolam-uti, midazolam-paliativo |
| `getByBrand(Jardiance)` | Empagliflozina | labs: Boehringer Ingelheim do Brasil; EMS S/A |
| `search("losartana")` | losartana |

## 6. Conclusão

- **355 registros** migrados 1:1 da fonte para a base canônica.
- **0 conflitos** marca↔laboratório.
- **0 IDs duplicados**; 14 grupos de variantes de contexto (intencionais).
- **0 entidades** com alguma lacuna clínica (interação/dose/indicação/contraindicação).

**Bases legadas preservadas** — nenhuma foi apagada. A remoção só deve ocorrer após a migração de todos os consumidores para o `drugRepository` e nova validação.

---

*RM-06 Single Source of Truth · pharma-core v1.0.0 · relatório gerado por `pharma-core/validate.ts`.*