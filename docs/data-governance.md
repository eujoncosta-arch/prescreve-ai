# Clinical Data Governance — RM-00

**Camada:** RM-00 · **Versão:** 1.0.0 · **Status:** implementada (fundação aditiva, read-only sobre as fontes)
**Módulo:** [`frontend/src/lib/governance/data-governance.ts`](../frontend/src/lib/governance/data-governance.ts)

> RM-00 é a **fundação de governança de dados farmacológicos** do Prescreve-AI. Estabelece identificadores canônicos, separação clara de campos e um envelope de proveniência auditável para **toda** a base — **sem migrar nem alterar** as fontes existentes. As correções de dados (RM-01) e a consolidação das bases (RM-06) construirão sobre esta camada.

---

## 1. Motivação (diagnóstico que originou o RM-00)

A base atual possui **6 fontes farmacológicas paralelas** com convenções de ID divergentes e proveniência parcial:

| Fonte | Estrutura | `id` | Proveniência |
|---|---|---|---|
| `PHARMA_DB` (`pharma-database.ts`) | `QuickDrug` (355) | slug da molécula (`ramipril`) | só `marcas[].verificado?` |
| `EUROFARMA_CATALOG` (`eurofarma-sync.ts`) | `ProdutoComercial` (117) | `euro-zart-50` | parcial (data/versão/fonte) |
| `lab-catalog.ts` (13 labs) | `ProdutoComercial` | `euro-zart-50` (colide) | parcial |
| `DRUG_DATABASE` (`drug-database.ts`) | `MoleculeEntry`/CID | slug | nenhuma |
| `MEDICAMENTOS_DOSAGEM` (`dosing-engine.ts`) | dosagem | slug | nenhuma |
| `MOLECULES_DB` (`drug-comparator.ts`) | `MoleculaComparavel` | slug | nenhuma |

**Problemas:** sem esquema único de ID; risco de colisão (`euro-*`); campos misturados (molécula+marca+apresentação); proveniência não-uniforme; 27 duplicatas de sal; 13 laboratórios sem registro canônico.

**Medição da dívida (via `auditarGovernanca`):** de **793 registros** projetados, **584 (73%) são `NÃO_VERIFICADO`/LEGADO**; apenas 70 têm confiança **ALTA** e 139 **MÉDIA**.

---

## 2. Identificadores canônicos

Toda entidade recebe um ID namespaced e determinístico:

| Entidade | Campo | Formato | Exemplo |
|---|---|---|---|
| Laboratório | `laboratory_id` | `lab:<slug>` | `lab:eurofarma` |
| Princípio ativo | `molecule_id` | `mol:<dcb-slug>` (**salt-agnóstico**) | `mol:anlodipino` |
| Marca comercial | `brand_id` | `brand:<lab>:<slug>` | `brand:eurofarma:zart` |
| Produto (medicamento) | `drug_id` | `drug:<lab>:<slug>` | `drug:eurofarma:zart` |

- **Salt-agnóstico:** `toMoleculeId("Besilato de Anlodipino") === toMoleculeId("Anlodipino") === "mol:anlodipino"`. Resolve as **27 duplicatas de sal** com um ID canônico único.
- **Determinístico:** o mesmo produto sempre gera o mesmo `drug_id` (idempotente), viabilizando deduplicação entre as 6 fontes.
- **Decomponível:** `parseDrugId("drug:eurofarma:zart") → { laboratory: "eurofarma", brand: "zart" }`.

Funções: `toSlug`, `toLaboratoryId`, `toMoleculeId`, `toBrandId`, `toDrugId`, `parseDrugId`.

---

## 3. Separação de campos (modelo governado)

Cada preocupação vira um tipo distinto (fim da mistura molécula+marca+apresentação):

- **`GovernedLaboratory`** — `laboratory_id`, `slug`, `nome`, `cnpj?`, `ativo`.
- **`GovernedMolecule`** — `molecule_id`, `dcb`, `sal_original?`, `sinonimos`, `atc?`, `classe_terapeutica?`.
- **`GovernedBrand`** — `brand_id`, `nome_comercial`, `laboratory_id`, `molecule_id`.
- **`GovernedPresentation`** — `concentracao`, `forma_farmaceutica`, `via?`, `embalagem`, `registro_anvisa?`.
- **`GovernedTargetPopulation`** — `adulto`, `pediatrico`, `neonatal`, `geriatrico`, `gestante`, `lactante`, `renal`, `hepatico`.
- **`GovernedDrugRecord`** — agregado canônico: os 4 IDs + molécula + marca + apresentações + população-alvo + `_governanca`.

---

## 4. Envelope de proveniência (controle de origem / data / responsável / confiança)

Todo `GovernedDrugRecord` carrega `_governanca: DataProvenance`:

```ts
interface DataProvenance {
  origem: DataOrigin;          // de onde veio o dado
  fonte_url?: string;          // bula/DOI/registro
  data_atualizacao: string;    // ISO
  responsavel: string;         // quem validou (pessoa/equipe/processo)
  nivel_confianca: ConfidenceLevel;
  observacao?: string;
  hash_integridade?: string;   // reservado p/ auditoria futura
}
```

### Taxonomia de origem (`DataOrigin`)
`BULA_FABRICANTE` · `BULA_PROFISSIONAL` · `BULA_PACIENTE` · `ANVISA` · `DIRETRIZ_OFICIAL` · `DERIVADO` · `LEGADO` · `NAO_VERIFICADO`.

### Nível de confiança (`ConfidenceLevel`)
`ALTA` (fonte regulatória + registro confirmado) · `MEDIA` (fonte regulatória **ou** verificado) · `BAIXA` (marcado não-verificado) · `NAO_VERIFICADO` (sem fonte).

A confiança é **inferida** de sinais existentes (`fonte_regulatoria`, `registro_anvisa`, `verificado`) via `inferConfianca()`, e pode ser sobrescrita por validação humana.

---

## 5. Adaptadores read-only

Projetam as fontes atuais no modelo governado **sem mutá-las**:

- `fromProdutoComercial(p)` → 1 `GovernedDrugRecord` (Eurofarma/lab-catalog). Origem `ANVISA` quando `fonte_regulatoria==='ANVISA'`.
- `fromQuickDrug(d)` → N registros (um por marca; genérico se sem marca). Origem `BULA_FABRICANTE` se `verificado`, senão `LEGADO`.

Isto permite a coexistência: as engines continuam usando as fontes originais; a governança observa por cima.

---

## 6. Auditabilidade

- `validarRegistro(r)` → checa padrão dos IDs, coerência marca↔molécula, presença de proveniência e apresentações.
- `auditarGovernanca(registros)` → relatório agregado: total, conformes, não-conformes, distribuição por confiança e por origem, lista de falhas.

**Resultado atual (medido):** 793 registros · **793 conformes** · distribuição de confiança `{ALTA:70, MEDIA:139, BAIXA:0, NAO_VERIFICADO:584}` · por origem `{ANVISA:117, BULA_FABRICANTE:92, LEGADO:584}`.

O campo `hash_integridade` está reservado para a assinatura criptográfica dos registros (integração futura com a trilha de auditoria `medical-audit.ts`).

---

## 7. Registro canônico de laboratórios

`LABORATORY_REGISTRY` normaliza os 13 `lab_id` conhecidos com nome oficial e CNPJ (quando disponível): eurofarma, ems, sanofi, astrazeneca, bayer, bms, boehringer, novartis, msd, eli_lilly, roche, novo_nordisk, ache. `resolveLaboratory()` faz fallback seguro para labs desconhecidos.

---

## 8. Escopo e limites do RM-00

**RM-00 faz:** IDs canônicos, separação de campos, proveniência, adaptadores read-only, auditoria estrutural, registro de laboratórios, documentação.

**RM-00 NÃO faz (fases seguintes):**
- **RM-01** — corrigir os dados farmacológicos (validação vs bula das ~238 moléculas não verificadas).
- **RM-06** — consolidar as 6 fontes numa base canônica única usando os IDs do RM-00.
- Assinatura criptográfica dos registros (`hash_integridade`) e trilha de auditoria persistida.
- Migração das engines para consumir o modelo governado.

**Garantia:** RM-00 é **aditivo e não-destrutivo** — nenhuma fonte existente foi alterada; a compilação (`tsc`) permanece sem erros e o build de produção intacto.

---

*Documento de governança — Prescreve-AI · RM-00 v1.0.0 · gerado como parte da camada de Clinical Data Governance.*
