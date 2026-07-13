# Drug Consistency Engine — RM-23

**Camada:** RM-23 · **Status:** implementada · **Módulo:** [`frontend/src/validation/drug-consistency/`](../frontend/src/validation/drug-consistency)
**Gate de build:** `prebuild` → [`scripts/check-drug-consistency.mjs`](../frontend/scripts/check-drug-consistency.mjs)

> Detecta automaticamente inconsistências farmacológicas na cadeia
> **Marca → Princípio ativo → Concentração → Dose sugerida → Indicação**,
> sobre a base canônica (RM-06 / `drugRepository`). Read-only.

---

## 1. Regras validadas

| Regra | Erro detectado | Gravidade |
|---|---|---|
| `ATIVO_MALFORMADO` | princípio ativo sem `molecule_id` canônico | **critical** |
| `CONCENTRACAO_AUSENTE` | apresentação com concentração vazia | high |
| `DOSE_AUSENTE` | sem dose adulto sugerida | high |
| `MARCA_ATIVO_ERRADO` | mesma marca → 2 princípios ativos distintos | high |
| `MARCA_LAB_DIVERGENTE` | mesma marca → 2 laboratórios | high |
| `APRESENTACAO_INEXISTENTE` | marca(s) sem nenhuma apresentação | medium |
| `CONCENTRACAO_DIVERGENTE` | nenhuma concentração agregada apesar de marcas | medium |
| `SEM_INDICACAO` | medicamento sem indicação cadastrada | medium |

Cada inconsistência retorna: **erro · gravidade · local (drug id + campo) · correção sugerida**.

---

## 2. Execução automática no build

`package.json` → `"prebuild": "tsx scripts/check-drug-consistency.mjs"`.
O `npm run build` roda o engine **antes** do `next build`:

- **Bloqueia o build** (exit 1) se houver qualquer inconsistência `critical`.
- `high`/`medium`/`low` são reportadas como avisos (não bloqueiam).
- Gera [`RM23_DRUG_CONSISTENCY_REPORT.md`](../RM23_DRUG_CONSISTENCY_REPORT.md) a cada execução.

Também roda em `npm test` (`src/tests/drug-consistency.test.ts`), incluindo um teste
de sanidade que injeta uma entidade quebrada e confirma a detecção.

Uso manual: `npm run check:consistency`.

---

## 3. Resultado atual

**355 entidades · 0 inconsistências** (critical/high/medium/low = 0). A base canônica
está íntegra na cadeia completa — resultado das camadas RM-01 (dados) e RM-06 (SSOT +
unificação de laboratórios).

---

*Documento — Prescreve-AI · RM-23 Drug Consistency Engine.*
