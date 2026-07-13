# Cross Database Validator — RM-24

**Camada:** RM-24 · **Status:** implementada · **Módulo:** [`frontend/src/validation/cross-database/`](../frontend/src/validation/cross-database)
**Gate de publicação:** `prebuild` → [`scripts/check-cross-database.mjs`](../frontend/scripts/check-cross-database.mjs)

> Compara todas as fontes farmacológicas internas entre si e detecta divergências
> antes da publicação. Read-only sobre as fontes legadas.

---

## 1. Fontes comparadas

| Fonte | Origem |
|---|---|
| **PHARMA_DB** | `getAllDrugs()` (base clínica principal) |
| **Eurofarma** | `EUROFARMA_CATALOG` (catálogo comercial) |
| **Clinical rules (pediatria)** | `PEDIATRIC_DOSES` (regras de dose pediátrica) |
| **Prescription engine** | `MEDICAMENTOS_DOSAGEM` (motor de cálculo de dose) |

A chave de comparação é o **`molecule_id` canônico** (RM-00, salt-agnóstico).

## 2. Detecções

| Tipo | Descrição | Gravidade |
|---|---|---|
| `conflito` | marca → 2 princípios ativos distintos entre fontes | **critical** |
| `medicamento_ausente` | regra clínica / motor de prescrição referencia ativo ausente no PHARMA_DB | high |
| `medicamento_ausente` | produto Eurofarma cujo ativo não está no PHARMA_DB | medium |
| `divergencia_dose` | posologia presente em apenas uma das fontes | medium |
| `divergencia_nome` | mesmo `molecule_id`, grafia da DCB diferente | low |

Cada achado retorna: **tipo · gravidade · chave · fontes · detalhe · correção sugerida**.

## 3. Relatório

[`DATABASE_SYNC_REPORT.md`](../DATABASE_SYNC_REPORT.md), gerado a cada execução, com:

```
Total analisado:
Compatíveis:
Divergentes:
Críticos:
```

+ tabela de fontes e de achados.

## 4. Gate de publicação

`package.json` → `"prebuild": "... && tsx scripts/check-cross-database.mjs"`.
O `npm run build` **impede a publicação (exit 1) quando há qualquer achado crítico**
(marca com ativo divergente entre fontes). Também roda em `npm test`
(`src/tests/cross-database.test.ts`). Uso manual: `npm run check:sync`.

## 5. Resultado atual

**Total 367 · Compatíveis 59 · Divergentes 59 · Críticos 0** → publicação liberada.

Os 4 conflitos críticos iniciais eram falsos-positivos de normalização (mesma
molécula com qualificadores distintos entre fontes: *oxalato de escitalopram*,
*clavulanato de potássio*, *paracetamol (acetaminofeno)*) — corrigidos na raiz,
melhorando o `toMoleculeId` do RM-00 (strip de parênteses + qualificadores
`oxalato`/`potassio`). As 59 divergências restantes são não-críticas (grafias de
DCB e ausências pontuais entre fontes) e ficam registradas para alinhamento.

---

*Documento — Prescreve-AI · RM-24 Cross Database Validator.*
