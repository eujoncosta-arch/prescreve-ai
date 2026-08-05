# RM-79 — Corrige as 6 citações desatualizadas em guideline-class-validation.ts

**Origem:** continuação direta do achado do RM-77 — o mesmo DOI
desatualizado da diretriz de IC (`10.1093/eurheartj/ehab368`, edição-base
de 2021) aparecia em mais 6 lugares em
`frontend/src/lib/guideline-class-validation.ts` (módulo real de
governança clínica do RM-27, que classifica o papel clínico — "1ª linha"
vs. "modificador de prognóstico" vs. "controle de congestão" — de
relações condição→classe, com fonte citada).

## Investigação

Li as 6 ocorrências uma a uma (todas `conditionId: 'icc'`) antes de
qualquer edição, para confirmar que a citação é isolada dos dados de
evidência e não haveria risco de desalinhar argumento clínico:

| Classe (`classKey`) | `papel_clinico` | O que a entrada afirma |
|---|---|---|
| ARNI | `prognostic_modifier` | Sacubitril/valsartana reduz mortalidade/hospitalização (PARADIGM-HF) |
| BRA | `prognostic_modifier` | Alternativa quando IECA/ARNI não tolerados (CHARM-Alternative, Val-HeFT) |
| BETABLOQUEADOR | `prognostic_modifier` | Benefício de molécula específica (CIBIS-II, MERIT-HF, COPERNICUS) |
| ARM | `prognostic_modifier` | Espironolactona/eplerenona (RALES, EMPHASIS-HF) |
| DIURETICO_ALCA | `congestion_control` | Controle de congestão, sem evidência robusta de mortalidade |
| SGLT2 | `prognostic_modifier` | Dapagliflozina/empagliflozina (DAPA-HF, EMPEROR-Reduced) |

**Achado confirmatório**: o mesmo arquivo já tinha, para a entrada `IECA`
(mesmo `conditionId: 'icc'`), a citação **correta** — "2023 Focused
Update of the 2021 ESC Guidelines..." (DOI `ehad195`) — provando que a
correção certa já era conhecida e aplicada em uma entrada, só não
propagada às outras 6.

**Conclusão da leitura**: em todos os 6 casos, a citação é usada
exclusivamente para atribuir a FONTE da diretriz — nenhuma das
descrições de `contexto` (achados de trial, papel clínico) depende do
ano/edição específica da diretriz; os trials pivotais citados
(PARADIGM-HF, CHARM-Alternative, CIBIS-II, RALES, DAPA-HF etc.)
continuam os mesmos e válidos na atualização de 2023. Seguro corrigir
sem risco de desalinhar o argumento clínico.

## O que foi corrigido

Todas as 6 entradas (`ARNI`, `BRA`, `BETABLOQUEADOR`, `ARM`,
`DIURETICO_ALCA`, `SGLT2`) tiveram `fonte.titulo`/`fonte.ano`/
`fonte.identificador` atualizados de "2021 ESC Guidelines..." (DOI
`ehab368`) para "2023 Focused Update of the 2021 ESC Guidelines..." (DOI
`ehad195`) — texto idêntico ao já usado corretamente na entrada `IECA`
do mesmo arquivo. `papel_clinico`, `status_validacao` e todo o `contexto`
clínico permanecem inalterados.

## Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **62 arquivos / 1102 testes** — todos passando |
| `npm run test:coverage` | ✅ Exit 0 |
| `npm run build` | ✅ Sucesso — `RM-23: 381 entidades, 0 inconsistências`; `RM-24: aceitos=0`; `RM-49: integridade textual OK`; `RM-62: 0 BLOCKING_ERROR` |

`DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md`, regenerados
como efeito colateral do build, foram revertidos (`git checkout --`).

## O que ainda fica pendente

`governance.ts` (`GUIDELINES_SEED`) continua citando DBHA-7 (HAS) como
`status: 'vigente'`, sem uma entrada de versão 8.0 — não corrigido desde
o RM-76, pelo mesmo motivo: exigiria fabricar `alteracoes`/`evidencias`
específicas do que mudou entre edições, sem fonte verificada. É o único
lugar restante conhecido com o padrão de staleness deste grupo de RMs
(76/77/79).

## O que NÃO foi alterado

Nenhuma classificação de papel clínico (`papel_clinico`), nenhum
`status_validacao`, nenhum dado de trial/desfecho. `evidence-engine.ts`
não foi tocado (já estava correto, é a fonte de verdade que usei para
confirmar a citação certa).

---

## Arquivos alterados

**Novo:**
- `docs/RM-79-GUIDELINE-CLASS-VALIDATION-CITATION-FIX.md` (este relatório)

**Modificado:**
- `frontend/src/lib/guideline-class-validation.ts`

---

Não foi feito commit, push ou deploy nesta RM.
