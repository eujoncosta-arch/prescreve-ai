# RM-80 — Decisões finais do RM-74: `/repositorio`/`/evidence` diferenciadas, `/farmalib` fundida em `/biblioteca`

**Origem:** execução da decisão-alvo do RM-74 (6 → 4 páginas de
catálogo/evidência), que havia ficado adiada para reconciliação de dado
real antes de qualquer remoção de nav.

## Parte 1 — `/repositorio` vs. `/evidence`: reconciliação revelou que NÃO são fundíveis com segurança

Comparei as 14 citações de `scientific-repository.ts` uma a uma contra
`EVIDENCE_DB` (`evidence-engine.ts`):

| Situação | Entradas |
|---|---|
| Duplicata real confirmada (mesmo DOI) | SPRINT, HOPE, EMPA-REG, RALES |
| Já corrigidas por staleness (RM-76/77) | HAS 7ª→8ª edição, ESC-HF 2021→2023 |
| Representada indiretamente (via `conflitos_diretrizes`, sem DOI próprio) | ESC/ESH 2018 (HAS) |
| Sem equivalente estruturado em `/evidence` | ADA 2024/SBD 2023 (DM2, sem `DiretrizEvidencia` dedicada além de ADA), **UKPDS 33** (braço sulfonilureia/insulina — `/evidence` só tem UKPDS 34/metformina, DOI diferente), **COPERNICUS** (citado só em prosa em `guideline-class-validation.ts`, sem `Estudo` estruturado) |
| **Condição inteira ausente** | **Pneumonia (CID J18)** — diretriz SBPT, nenhum `DiagnosticoEvidencia` correspondente existe |

**Decisão: manter separadas, diferenciadas por escopo** (mesmo padrão do
RM-71). Migrar as citações exclusivas exigiria criar uma categoria de
diagnóstico nova (Pneumonia) com `Estudo`s estruturados (N, NNT, HR,
desfechos) — dado que eu não tenho fonte verificada para escrever sem
risco real de fabricar estatística clínica. `/repositorio` continua
cobrindo mais condições de forma mais rasa; `/evidence` continua com
análise em profundidade (incluindo conflitos entre diretrizes) das 12
condições mais prevalentes.

**O que foi feito**: só texto — labels do menu e subtítulos das duas
páginas agora declaram explicitamente o escopo de cada uma e apontam
uma para a outra.

## Parte 2 — `/farmalib` → fundida em `/biblioteca` (segura, sem perda)

Diferente do par acima, aqui a fusão era segura: `pharma-library.ts`
(`LABORATORIOS`) já importa `EUROFARMA_CATALOG` de `eurofarma-sync.ts`
— nunca duplica dado de produto. A única coisa exclusiva de
`/farmalib` era o framing "enterprise multi-laboratório" (11
laboratórios cadastrados, 1 ativo — Eurofarma — e 10 `em_breve`).

**Achado bônus**: `/biblioteca` já tinha uma seção "Outros laboratórios"
própria — mas era uma lista **hardcoded de 8 nomes** (faltavam Sanofi,
Roche, GSK) com uma nota de implementação **desatualizada** ("cada
laboratório é ativado via `LABS[id].ativo = true`", um padrão de código
que não existe — o real é `LABORATORIOS[i].status: StatusLab`).

**O que foi feito**: a seção de `/biblioteca` agora usa o dado real de
`LABORATORIOS` (todos os 10 laboratórios `em_breve`, com `title` mostrando
a descrição real de cada um) em vez da lista hardcoded incompleta, e a
nota de implementação foi corrigida para refletir o mecanismo real
(sincronização de catálogo, não uma flag `.ativo`). Nenhum conteúdo de
`/farmalib` ficou para trás. `/farmalib` removida de
`clinical-nav-registry.ts` (rota/código permanecem no repositório,
apenas fora do menu — mesmo padrão do RM-70/72).

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

## Estado final do RM-74 (6 → 4, com uma correção de rota)

- `/evidence` — biblioteca de evidência em profundidade (12 condições).
- `/repositorio` — biblioteca de evidência de cobertura ampla (mantida,
  não fundida — achado desta RM contradiz a suposição original do RM-74
  de que seria uma fusão segura).
- `/biblioteca` — catálogo de produto único (agora com a seção
  multi-lab migrada de `/farmalib`).
- `/eurofarma` — dashboard operacional do pipeline de sync (mantida,
  nunca foi candidata a fusão).

Resultado real: **5 páginas**, não 4 — a contagem-alvo original do
RM-74 estava certa para o cluster catálogo (3→2) mas errada para o
cluster evidência (3→2 não é seguro; ficou 3→3, só renomeadas/
diferenciadas).

## O que NÃO foi alterado

Nenhum motor clínico, dado farmacológico, ou estudo/citação fabricados.
`evidence-engine.ts` não foi tocado. Nenhuma condição nova (Pneumonia)
foi criada — decisão explícita de não fabricar dado de estudo sem fonte.

---

## Arquivos alterados

**Novo:**
- `docs/RM-80-CATALOG-EVIDENCE-FINAL-DECISIONS.md` (este relatório)

**Modificados:**
- `frontend/src/lib/clinical-nav-registry.ts`
- `frontend/src/app/repositorio/page.tsx`
- `frontend/src/app/evidence/page.tsx`
- `frontend/src/app/biblioteca/page.tsx`

---

Não foi feito commit, push ou deploy nesta RM.
