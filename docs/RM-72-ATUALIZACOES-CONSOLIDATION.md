# RM-72 — Consolidar `/atualizacoes-cientificas` em `/atualizacoes` (RM-60 §10, item 7)

**Origem:** `docs/RM-60-SCIENTIFIC-INTELLIGENCE-ROADMAP.md`, §10 item 7 —
"Fundir ou diferenciar explicitamente `atualizacoes` vs.
`atualizacoes-cientificas`?".

## Investigação

Diferente do par `/explicar`/`/explicabilidade` (RM-71, onde a sobreposição
era só de nome), aqui a sobreposição é **real**:

| | `/atualizacoes` (`guideline-updates.ts`) | `/atualizacoes-cientificas` (`scientific-update-engine.ts`) |
|---|---|---|
| Conteúdo | Changelog curado de mudanças de diretrizes, com DOI, nível de evidência (A/B/C) e grau de recomendação por mudança individual | Aba "Diretrizes ativas": lista as mesmas ~10 diretrizes reais (SBC, ADA, ESC, GINA...), mas sem DOI nem detalhamento por mudança — mais rasa |
| | | Aba "Alertas": inbox de notificações (`DELTAS_DEMO`, literalmente nomeado `_DEMO` no código-fonte) simulando monitoramento contínuo de 15 sociedades médicas |
| Monitoramento real? | Não se propõe a ser — é um changelog estático, atualizado manualmente | A aba "Alertas" finge ser um sistema de vigilância ativa, mas não há nenhuma integração real de feed/RSS/API por trás (confirmado no RM-60 §0: nenhuma instrumentação de uso existe no sistema) |
| Classificação | `referencia` | `demonstracao` |

A aba "Diretrizes ativas" é redundância genuína (mesmo conteúdo, coberto
melhor por `/atualizacoes`). A aba "Alertas" é uma funcionalidade fabricada
que apresenta um risco real: um médico pode assumir que existe vigilância
ativa de diretrizes quando não existe nenhuma.

## Decisão

**Consolidar em `/atualizacoes`** — não construir a alternativa (transformar
`/atualizacoes-cientificas` em consumidor de feed real via RSS/API), que é
uma decisão de investimento maior e separada, fora do escopo desta RM.

## O que foi feito

`frontend/src/lib/clinical-nav-registry.ts`: entrada `/atualizacoes-cientificas`
removida de `NAV_GROUPS` (mesmo padrão do RM-70 — "arquivar do nav
clínico, não do código"). Ícone `Bell` removido do import (não usado em
mais nenhum lugar do arquivo). Comentário de cabeçalho documentando a
decisão.

A rota/página `/atualizacoes-cientificas` continua existindo no
código-fonte e acessível por URL direta — apenas não aparece mais na
navegação.

## Testes ajustados

`frontend/src/tests/clinical-nav-registry-rm59.test.ts` — lista hardcoded
de páginas que exigem `DemoDataNotice` caiu de 14 para 13.

`frontend/src/tests/demo-notice-coverage-rm59.test.ts` — não precisou de
alteração (deriva a lista de `NAV_GROUPS` dinamicamente, mesma razão do
RM-70).

## Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **62 arquivos / 1102 testes** — todos passando (1 a menos que a rodada anterior: o `it.each` de `demo-notice-coverage-rm59.test.ts` para a página removida deixou de ser gerado, não uma falha) |
| `npm run test:coverage` | ✅ Exit 0 |
| `npm run build` | ✅ Sucesso — `RM-23: 381 entidades, 0 inconsistências`; `RM-24: aceitos=0`; `RM-49: integridade textual OK`; `RM-62: 0 BLOCKING_ERROR` |

`DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md`, regenerados
como efeito colateral do build, foram revertidos (`git checkout --`).

## O que NÃO foi alterado

Nenhum motor clínico, dado farmacológico ou regra de dose/segurança.
`scientific-update-engine.ts` não foi tocado — a decisão de eventualmente
transformá-lo em consumidor de feed real permanece em aberto (RM-60 §3,
não decidida nesta RM).

---

## Arquivos alterados

**Novo:**
- `docs/RM-72-ATUALIZACOES-CONSOLIDATION.md` (este relatório)

**Modificados:**
- `frontend/src/lib/clinical-nav-registry.ts`
- `frontend/src/tests/clinical-nav-registry-rm59.test.ts`

---

Não foi feito commit, push ou deploy nesta RM.
