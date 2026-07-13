# PRODUCTION_READINESS_REPORT — RM-25

**Camada:** RM-25 · **Modo:** READ-ONLY (auditoria — nenhum código alterado) · **Base:** 358 entidades canônicas
**Objetivo:** avaliar a prontidão para produção **antes de adicionar novas funcionalidades**, em 7 dimensões, com evidência medida.

---

## Veredito geral

**🟢 APTO PARA PRODUÇÃO no núcleo** (dados, integridade, gates, performance) — **🟡 com 3 pendências recomendadas antes de novas features**:
1. migrar os 7 consumidores de UI/API que ainda leem bases legadas;
2. instrumentar cobertura de testes por módulo;
3. conectar o motor FHIR ao `DrugEntity`.

Nenhuma pendência é bloqueante para o que já está no ar; todas reduzem risco ao **crescer** o sistema.

| # | Dimensão | Status |
|---|---|---|
| 1 | Consistência UI ↔ API ↔ motor de decisão | 🟡 ATENÇÃO |
| 2 | Uso exclusivo do DrugRepository | 🟡 ATENÇÃO (dívida controlada) |
| 3 | Cobertura de testes por módulo | 🟡 ATENÇÃO |
| 4 | Performance do motor de decisão | 🟢 PRONTO |
| 5 | Rastreabilidade de referências científicas | 🟡 ATENÇÃO |
| 6 | Qualidade da documentação técnica | 🟢 PRONTO |
| 7 | Preparação para FHIR/HL7 | 🟡 ATENÇÃO |

---

## 1. Consistência UI ↔ API ↔ motor de decisão — 🟡

**Evidência:** o motor de decisão de segurança (`safety-rules`) já consome a fonte única (`drugRepository`). Porém **7 pontos de UI/API ainda leem bases legadas diretamente**, podendo divergir do motor canônico:

- Páginas: `biblioteca`, `comparador`, `prescricao-rapida`
- Componentes: `BulaViewer`, `PrescricaoPorMarca`, `TherapeuticPanel`
- API: `app/api/sync/eurofarma/route.ts`

**Risco:** a UI pode exibir dado (marca/apresentação/dose) de uma fonte legada enquanto o motor de decisão usa a base canônica → inconsistência percebida pelo usuário.
**Recomendação:** migrar esses 7 consumidores para `drugRepository` (o guard já impede novos). Prioridade: páginas de leitura primeiro (baixo risco), depois componentes de prescrição.

## 2. Uso exclusivo do DrugRepository — 🟡 (dívida controlada)

**Evidência:** guard de lint (`no-restricted-imports`) **ativo e verde** (0 violações novas); qualquer novo import direto de base legada falha o lint. A allowlist contém a dívida atual — os 7 consumidores acima + harnesses de QA que testam a API legada de propósito + camada de migração.
**Risco:** baixo e cercado — a arquitetura está protegida contra regressão; resta pagar a dívida.
**Recomendação:** reduzir a allowlist item a item (já caiu ~8 arquivos nesta série).

## 3. Cobertura de testes por módulo — 🟡

**Evidência:** **115 testes** em 5 suítes (pharma-core/RM-06, RM-22 regressão clínica 37 casos, RM-23, RM-24, validador clínico) — cobertura **funcional/integração** forte das camadas críticas. Porém o provider `@vitest/coverage-v8` **não está instalado** → cobertura por linha/módulo **não é medível** hoje; há **96 módulos** em `src/lib`.
**Risco:** módulos utilitários sem teste unitário dedicado podem regredir sem detecção.
**Recomendação:** adicionar `@vitest/coverage-v8`, definir meta (ex.: ≥ 70% nos módulos de decisão/dose) e publicar o número no CI.

## 4. Performance do motor de decisão — 🟢

**Evidência (medida, 358 entidades):**

| Operação | Tempo |
|---|---|
| `drugRepository.getById` | ~0,0001 ms/op |
| `drugRepository.getByActiveIngredient` | ~0,05 ms/op |
| `runSafetyCheck` (4 fármacos, idoso, TFG, K+) | ~0,05 ms/op |
| `drugRepository.search` | **~4,77 ms/op** |
| RM-23 varredura completa | ~6,7 ms |
| RM-24 cross-db (4 fontes) | ~128 ms (build/test, não runtime) |

**Veredito:** excelente nas consultas indexadas e no motor de segurança. **Ressalva:** `search` faz varredura linear com normalização por campo a cada chamada (~4,77 ms) — aceitável para autocomplete, mas otimizável.
**Recomendação:** pré-computar um índice de busca (haystack normalizado por entidade) no boot do repositório → `search` cairia para <1 ms.

## 5. Rastreabilidade de referências científicas — 🟡

**Evidência:** **358/358** entidades com `references[]` (100% com **ATC**) e **envelope de proveniência RM-00** em todas (confiança: **ALTA 63 · MÉDIA 295 · 0 não-verificado**). Porém: apenas **35** entidades citam **diretriz (guideline)** e **0** carregam **nível de evidência estruturado** no modelo canônico.
**Risco:** rastreabilidade regulatória/ATC boa; rastreabilidade **científica fina** (diretriz/DOI por recomendação) ainda parcial.
**Recomendação:** enriquecer `references[]` com diretriz/DOI nas moléculas de maior uso; mapear `nivel_evidencia`/`grau_recomendacao` (já existentes no schema legado) para o `DrugEntity`.

## 6. Qualidade da documentação técnica — 🟢

**Evidência:** 5 documentos de arquitetura (`data-governance`, `pharma-core`, `rm-22`, `rm-23`, `rm-24`) + **6 relatórios reproduzíveis** na raiz (RM-06 migração, RM-22, RM-23, DATABASE_SYNC, SYSTEM_AUDIT, PHARMA_AUDIT) + comentários de cabeçalho em todos os módulos das camadas RM. Scripts npm documentados (`check:consistency`, `check:sync`, `audit`).
**Lacunas:** falta doc de **interoperabilidade** (FHIR/HL7) e um **índice/README central** das camadas RM.
**Recomendação:** adicionar `docs/interoperability.md` e um `docs/README.md` de índice.

## 7. Preparação para FHIR/HL7 — 🟡

**Evidência:** `interoperability-engine.ts` (**1462 linhas**) implementa **FHIR R4 completo** — Patient, Encounter, Observation, Condition, **MedicationRequest**, AllergyIntolerance, Practitioner, Organization, MedicationStatement, DiagnosticReport, Composition, **Bundle** — além de **TISS** (ANS), mapa **CID→SNOMED** e **exame→LOINC**, com validação de recursos. Base sólida.
**Lacuna:** o motor FHIR **não está conectado ao `DrugEntity`** — não há adaptador `DrugEntity → FHIR Medication/MedicationKnowledge`, então uma prescrição FHIR não herda automaticamente ATC/marca/apresentação canônicos.
**Recomendação:** criar `toFHIRMedication(drugEntity)` / `toMedicationRequest(...)` no `pharma-core` (ou um adaptador) para que a interoperabilidade consuma a fonte única. Isso torna FHIR/HL7 "plug-and-play" para as integrações futuras (RNDS).

---

## Plano de ação priorizado (antes de novas features)

| Prioridade | Ação | Dimensão | Esforço |
|---|---|---|---|
| 1 | Migrar 7 consumidores UI/API → `drugRepository` | 1, 2 | Médio |
| 2 | Adaptador `DrugEntity → FHIR Medication` | 7 | Médio |
| 3 | Instalar `@vitest/coverage-v8` + meta de cobertura | 3 | Baixo |
| 4 | Índice de busca pré-computado no repositório | 4 | Baixo |
| 5 | Enriquecer `references[]` (diretriz/DOI/evidência) | 5 | Contínuo |
| 6 | `docs/interoperability.md` + `docs/README.md` | 6 | Baixo |

**Conclusão:** o núcleo (base canônica única, 3 gates automáticos, 115 testes verdes, performance sub-milissegundo no motor de decisão) está **pronto para produção**. As 6 ações acima são de **redução de risco para o crescimento** — nenhuma bloqueia o que já está publicado, e todas são pré-requisitos saudáveis antes de adicionar novas funcionalidades.

---

*RM-25 Production Readiness Audit · read-only · métricas medidas ao vivo em 2026-07-13.*
