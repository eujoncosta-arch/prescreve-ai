# RM-76 — Corrige citação desatualizada da diretriz de HAS (7ª → 8ª edição SBC)

**Origem:** achado descoberto durante a investigação da decisão de
consolidação do RM-60 §10 item 5 (reconciliar `/repositorio` contra
`/evidence`, ver `docs/RM-74-CATALOG-EVIDENCE-CONSOLIDATION-DECISION.md`).
Ao comparar os DOIs das 14 citações de `scientific-repository.ts` contra
`evidence-engine.ts`, ficou claro que a **7ª Diretriz Brasileira de
Hipertensão Arterial (SBC 2020, DOI 10.36660/abc.20201238)** já foi
substituída pela **8ª edição (2024, DOI 10.36660/abc.20240209)** —
`evidence-engine.ts` já indexava a 8ª edição desde antes desta correção
(entrada `dbha8` em `EVIDENCE_DB['has'].diretrizes`), mas 3 outros
arquivos reais ainda citavam a edição superada.

**Escopo desta RM:** corrigir só o risco de dado desatualizado (decisão
explícita do dono do produto), sem executar a fusão completa de páginas
do item 5, que continua adiada.

## Onde a citação desatualizada foi encontrada

| Arquivo | Uso | Risco |
|---|---|---|
| `frontend/src/lib/scientific-repository.ts` | Conteúdo de `/repositorio` (browsable) | Médico vê a 7ª edição como se fosse a diretriz vigente |
| `frontend/src/lib/clinical-therapeutics.ts` | **Motor real de sugestão terapêutica** — evidência citada para 2 condutas de HAS (enalapril, hidroclorotiazida) | Mais sério: citação desatualizada anexada a uma sugestão de conduta real, não só a uma página de referência |
| `frontend/src/lib/mock-data.ts` | Dado de demonstração (`MOCK_*`, gated por `IS_DEMO_MODE`) | Menor — só aparece em modo demo |
| `frontend/src/lib/governance.ts` | Workflow de governança de versão (`/evidencias`) — marca DBHA-7 como `status: 'vigente'` | **Não corrigido nesta RM** (ver §"O que ficou de fora") |

## O que foi corrigido

Em `scientific-repository.ts`, `clinical-therapeutics.ts` (2 ocorrências)
e `mock-data.ts` (2 ocorrências): título, ano, DOI e citação atualizados
de "7ª Diretriz Brasileira de Hipertensão Arterial" (2020) para "8ª
Diretriz Brasileira de Hipertensão Arterial" (2024), alinhados 1:1 com a
entrada `dbha8` já curada em `evidence-engine.ts`.

**A recomendação clínica em si não mudou** — enalapril/HCTZ como
anti-hipertensivos de 1ª linha é uma recomendação estável entre as duas
edições; só a referência bibliográfica estava desatualizada.

**Nota sobre a string de citação**: o texto `citacao` (formato
autor/revista/volume/página) da 7ª edição citava "Barroso WKS et al. Arq
Bras Cardiol. 2021;116(3):516-658" — dados bibliográficos específicos que
eu não tenho como verificar para a 8ª edição. Para não fabricar
volume/edição/páginas não confirmados, a citação da 8ª edição foi escrita
de forma mais simples ("Sociedade Brasileira de Cardiologia. Arq Bras
Cardiol. 2024.") — apoiada apenas no DOI, que É verificado (já usado em
`evidence-engine.ts` antes desta RM).

## O que ficou de fora (não corrigido, documentado para RM futura)

`frontend/src/lib/governance.ts` (`GUIDELINES_SEED`, consumido por
`/evidencias` e `/governanca`) ainda marca a 7ª edição como
`status: 'vigente'`, com um único registro de versão (`versoes: [{numero:
'7.0', ...}]`, incluindo `alteracoes`/`evidencias` detalhadas daquela
versão específica). Diferente das outras 3 correções (só metadado de
citação), corrigir isso corretamente exigiria adicionar uma entrada real
de versão 8.0 com `alteracoes`/`evidencias` específicas do que mudou da 7ª
para a 8ª edição — conteúdo que eu não tenho fonte verificada para
escrever sem fabricar. Registrado aqui como achado real, não corrigido
por disciplina de não inventar conteúdo clínico.

## Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **62 arquivos / 1102 testes** — todos passando (nenhum teste dependia dos textos alterados) |
| `npm run test:coverage` | ✅ Exit 0 |
| `npm run build` | ✅ Sucesso — `RM-23: 381 entidades, 0 inconsistências`; `RM-24: aceitos=0`; `RM-49: integridade textual OK`; `RM-62: 0 BLOCKING_ERROR` |

`DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md`, regenerados
como efeito colateral do build, foram revertidos (`git checkout --`).

## O que NÃO foi alterado

Nenhuma recomendação clínica, dose, contraindicação ou regra de
segurança — só metadados de citação (título/ano/DOI/texto de referência).
`evidence-engine.ts` não foi tocado (já estava correto). `governance.ts`
não foi tocado (ver acima). A fusão completa de `/repositorio` em
`/evidence` (RM-60 §10 item 5) continua adiada.

---

## Arquivos alterados

**Novo:**
- `docs/RM-76-STALE-GUIDELINE-CITATION-FIX.md` (este relatório)

**Modificados:**
- `frontend/src/lib/scientific-repository.ts`
- `frontend/src/lib/clinical-therapeutics.ts`
- `frontend/src/lib/mock-data.ts`

---

Não foi feito commit, push ou deploy nesta RM.
