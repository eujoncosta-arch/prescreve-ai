# RM-74 — Contagem-alvo para as 6 páginas de catálogo/evidência (RM-60 §10, item 5)

**Origem:** `docs/RM-60-SCIENTIFIC-INTELLIGENCE-ROADMAP.md`, §10 item 5 —
"Consolidar `repositorio`/`biblioteca`/`evidencias`/`evidence`/`farmalib`/
`eurofarma` (6 páginas de catálogo/evidência sobrepostas) em quantas
páginas?".

**Natureza desta RM:** só a DECISÃO de contagem-alvo e o porquê. A
migração de dado real necessária para executá-la fica **explicitamente
adiada** para uma RM futura dedicada — o próprio RM-60 (§9) já classificava
essa consolidação como esforço "Alto" ("decisão de produto primeiro; depois
trabalho de migração de dados e remoção de rotas"). Nenhum código foi
alterado nesta RM.

## Por que não fundir agora

Diferente do `/atualizacoes-cientificas` (RM-72), onde a parte redundante
("Alertas") era conteúdo **fabricado** e podia ser removida do menu sem
perda real, aqui as 6 páginas têm dado **curado e real** por trás, com
modelos de dado genuinamente diferentes:

| Página | Motor | Modelo de dado | Papel real |
|---|---|---|---|
| `/repositorio` | `scientific-repository.ts` | `ScientificEntry` — citação simples (diretriz/RCT/meta-análise) | Lista plana, 14 entradas curadas |
| `/evidence` | `evidence-engine.ts` | `DiagnosticoEvidencia` → `DiretrizEvidencia`/`TerapiaEvidencia`/`Estudo`, + `ConflitoDiretrizes` | Grafo mais rico, inclui conflitos entre diretrizes |
| `/evidencias` | `governance.ts` | `GuidelineVersao`/`EvidenciaVersao`/`ReviewStatus` (`validado`/`pendente`/`em_revisao`/`obsoleto`) | Workflow de **governança de versão**, não uma biblioteca de citação — 0% cobertura de teste |
| `/biblioteca` | `eurofarma-sync.ts` | `EUROFARMA_CATALOG` + `CorrelacaoTerapeutica` | Catálogo Eurofarma + correlação diagnóstico→classe→molécula→marca |
| `/farmalib` | `pharma-library.ts` (importa `EUROFARMA_CATALOG` de `eurofarma-sync.ts` — **não duplica dado**) | `Laboratorio` multi-lab, categorias regulatórias ANVISA, classe de controle, risco gestacional | Framing "enterprise multi-laboratório"; só Eurofarma está `status: 'ativo'` hoje |
| `/eurofarma` | `eurofarma-sync.ts` | `SyncStatus`/`AuditEntry` | **Não é um catálogo navegável** — é o dashboard operacional do próprio pipeline de sincronização |

Verificação rápida: `scientific-repository.ts` tem 14 entradas próprias
(`sci-*`), estruturalmente diferentes das entradas aninhadas de
`evidence-engine.ts` (`DiagnosticoEvidencia` → `DiretrizEvidencia[]` →
`Estudo[]`) — não são o mesmo conteúdo reformatado, é curadoria paralela
que precisa de reconciliação item a item antes de qualquer fusão seguir
sem perda de citação real.

## Decisão: contagem-alvo 6 → 4

**Cluster evidência (3 → 2):**
- `/evidence` (Evidence Engine) fica como a página de biblioteca de
  evidência primária — é o modelo mais rico (inclui conflitos entre
  diretrizes, algo que nenhuma das outras duas tem).
- `/evidencias` fica separada — não é uma biblioteca concorrente, é
  workflow de governança de versão (proposito distinto, não uma segunda
  forma de navegar evidência).
- `/repositorio` é candidata a dobrar dentro de `/evidence` numa RM
  futura — suas 14 citações precisam ser reconciliadas (verificar
  duplicidade real vs. complementaridade) contra `EVIDENCE_DB` antes de
  a página ser removida do menu, para não repetir o padrão de "dado
  curado real que vira invisível" (o mesmo tipo de achado do RM-58/RM-66/
  RM-69).

**Cluster catálogo (3 → 2):**
- `/biblioteca` fica como o catálogo de produto primário (mais maduro:
  já tem correlação terapêutica).
- `/eurofarma` fica separada — não é um catálogo concorrente, é o
  dashboard operacional do pipeline de sync (propósito distinto).
- `/farmalib` é a candidata mais segura de dobrar cedo numa RM futura —
  **já reusa a mesma fonte de dado** (`EUROFARMA_CATALOG` importado, não
  duplicado), então o risco de perda de conteúdo ao consolidar é baixo;
  o que falta é decidir o que fazer com o framing "multi-laboratório"
  (mantê-lo dentro de `/biblioteca` como uma seção "outros laboratórios
  (em breve)", ou descartar até existir mais de 1 laboratório `ativo`).

## O que fica para a RM de migração futura

1. Reconciliar as 14 entradas de `scientific-repository.ts` contra
   `EVIDENCE_DB` (`evidence-engine.ts`) — identificar sobreposição real
   vs. citações exclusivas de cada fonte, antes de decidir o que migra
   para onde.
2. Decidir o destino do framing multi-laboratório de `pharma-library.ts`
   dentro de `/biblioteca` (ou não).
3. Só depois disso remover `/repositorio` e `/farmalib` do
   `clinical-nav-registry.ts` — nunca antes da reconciliação de dado,
   para não esconder conteúdo curado real.

## O que NÃO foi alterado nesta RM

Nenhum arquivo de código-fonte. Nenhuma página, motor, rota ou dado foi
tocado — apenas este documento de decisão e a atualização do índice de
decisões do RM-60 §10.

---

## Arquivos alterados

**Novo:**
- `docs/RM-74-CATALOG-EVIDENCE-CONSOLIDATION-DECISION.md` (este relatório)

**Modificado:**
- `docs/RM-60-SCIENTIFIC-INTELLIGENCE-ROADMAP.md` (ledger §10, item 5)

---

Não foi feito commit, push ou deploy nesta RM.
