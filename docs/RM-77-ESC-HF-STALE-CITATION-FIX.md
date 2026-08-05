# RM-77 — Corrige citação desatualizada da diretriz de IC (ESC-HF 2021 → 2023 Focused Update)

**Origem:** continuação da reconciliação `/repositorio` vs. `/evidence`
(RM-74/RM-76). Ao comparar `scientific-repository.ts` entrada por entrada
contra `evidence-engine.ts`, achado o MESMO padrão de staleness da diretriz
de HAS (RM-76), agora na diretriz de Insuficiência Cardíaca: `evidence-engine.ts`
já indexava a **ESC Guidelines for Heart Failure — 2023 Focused Update**
(DOI `10.1093/eurheartj/ehad195`) como `esc-hf-2023`, mas
`scientific-repository.ts` ainda citava a edição-base de 2021 (DOI
`10.1093/eurheartj/ehab368`).

## O que foi corrigido

`scientific-repository.ts`: entrada `sci-esc-ic-2021` → `sci-esc-ic-2023`,
título/ano/DOI atualizados para o "2023 Focused Update", alinhados 1:1
com a entrada `esc-hf-2023` já curada em `evidence-engine.ts`. Conteúdo
clínico (quarteto terapêutico IECA/ARNI + betabloqueador + ARM + SGLT-2)
confirmado idêntico entre as duas versões — só a referência bibliográfica
estava desatualizada.

## Achado NÃO corrigido: o padrão é mais amplo do que 2 arquivos

Buscando o DOI antigo (`ehab368`) em todo o repositório, encontrei **mais
6 ocorrências em `guideline-class-validation.ts`** (módulo real de
governança clínica do RM-27, que classifica o papel clínico — "1ª linha"
vs. "alternativa" vs. "resgate" — de relações condição→classe com fonte
citada), além da já conhecida em `governance.ts` (não corrigida desde o
RM-76, pelo mesmo motivo).

Diferente das correções já feitas (troca de metadado isolada, sem
depender de contexto), `guideline-class-validation.ts` tem 6 ocorrências
que provavelmente estão cada uma ancorada a uma classificação clínica
específica (ex.: "betabloqueador é resgate, não 1ª linha, na condição X,
segundo a diretriz Y") — corrigir o DOI sem entender o que cada
ocorrência está de fato citando arrisca desalinhar a citação do
argumento clínico que ela sustenta. Isso exige leitura linha a linha do
arquivo antes de qualquer edição seletiva, o que não foi feito nesta RM.

**Decisão**: parar aqui e reportar, em vez de continuar editando às
cegas. A reconciliação completa `/repositorio` ↔ `/evidence` (RM-74)
continua maior do que uma correção pontual de citação — agora confirmado
que toca pelo menos 5 arquivos reais (`scientific-repository.ts`,
`clinical-therapeutics.ts`, `mock-data.ts`, `governance.ts`,
`guideline-class-validation.ts`), não só as 2 páginas originalmente
cogitadas para fusão.

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

## O que NÃO foi alterado

`governance.ts` e `guideline-class-validation.ts` — ambos continuam
citando a diretriz de IC 2021. Nenhuma recomendação clínica alterada.
`evidence-engine.ts` não foi tocado (já estava correto).

---

## Arquivos alterados

**Novo:**
- `docs/RM-77-ESC-HF-STALE-CITATION-FIX.md` (este relatório)

**Modificado:**
- `frontend/src/lib/scientific-repository.ts`

---

Não foi feito commit, push ou deploy nesta RM.
