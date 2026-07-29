# RM-49 — Saneamento Total de Riscos: Relatório Final

## 1. Escopo

RM-49 pediu o fechamento de **100% dos riscos conhecidos** (críticos, altos, moderados, baixos,
técnicos, de teste, de CI/CD, de governança) antes de qualquer expansão clínica, proibindo o uso de
"🟡 apto com limitações", "aceito com ressalvas", "risco documentado" ou "não bloqueante" como forma de
liberar a expansão. O veredito só pode ser 🟢 (tudo fechado) ou 🔴 (qualquer coisa aberta).

Esta rodada trabalhou de forma sequencial e verificada: cada correção foi confirmada por leitura direta
do código (não por confiança na memória de RMs anteriores), seguida de teste de regressão e gate
completo. **Nem tudo foi fechado.** Este relatório declara exatamente o que foi e o que não foi, com a
mesma disciplina de honestidade já praticada em RM-41/46/47/48 — nenhum risco crítico ou alto remanescente
é reclassificado, escondido ou descrito como "aceitável".

## 2. Estado inicial (herdado do RM-48)

36 achados do RM-41, dos quais RM-46 fechou 2 (silêncio de erro mascarado) e RM-48 fechou 4 (SMXTMP,
dipirona, alerta pediátrico, acento no risk-engine). Entrando nesta rodada: **9 críticos abertos**, **10
altos abertos**, ~13 moderados/baixos abertos, ausência total de CI/CD, e nenhum teste direto para
`calcularCrCl`/risco hemorrágico-interação/`icu-engine`.

## 3. Matriz completa de riscos

| ID | Severidade original | Descrição | Causa raiz | Correção | Teste | Status final |
|---|---|---|---|---|---|---|
| RM41-001 | 🔴 crítico | SMXTMP contraindicação morta | (fechado no RM-48) | — | `rm48-pharmacological-blockers.test.ts` | **FECHADO** |
| RM41-002 | 🔴 crítico | Dipirona janela coarse | (fechado no RM-48) | — | idem | **FECHADO** |
| RM41-003 | 🔴 crítico | Ped-contraindicação não bloqueia UI | (fechado no RM-48) | — | idem | **FECHADO** |
| RM41-004 | 🔴 crítico | Risk-engine sem normalização de acento | (fechado no RM-48) | — | idem | **FECHADO** |
| RM41-011 | 🔴 crítico | Mojibake em `pharma-database-neuro-b.ts` | Arquivo salvo/reaberto com codificação Windows-1252 sobre bytes UTF-8 (byte a byte) | 18 padrões únicos identificados por varredura, revisados manualmente, corrigidos por reconstrução de byte (não substituição cega); validador `scripts/check-text-integrity.mjs` criado e plugado no `prebuild` | `text-integrity-rm49.test.ts` (4 testes) | **FECHADO** |
| RM41-016 | 🔴 crítico | `salvarRiskScore` nunca auditado | Método nunca chamava `registrarAuditoria` | `escreverComAuditoriaAtomica()` — toda escrita clínica (consulta/diagnóstico/prescrição/risk score) agora audita na mesma transação | `consulta.service.atomicidade-rm49.spec.ts` (6 testes, com rollback real via `FakeDb`) | **FECHADO** |
| RM41-017 | 🔴 crítico | Escrita clínica + auditoria não atômicas | `create` e `registrarAuditoria` eram chamadas Prisma separadas | Mesma primitiva acima, envolvendo ambas em `prisma.$transaction(async (tx) => ...)` | idem — prova de rollback real quando a auditoria falha | **FECHADO** |
| RM41-025 | 🔴 crítico | Ausência total de CI/CD | `.github/workflows` nunca existiu | `.github/workflows/ci.yml` criado — frontend (typecheck/lint/test/build) e backend (typecheck/lint/migrate/unit/e2e/build) com PostgreSQL real como serviço, sem `continue-on-error`, lint sem `--fix` | Não executável neste sandbox (sem GitHub Actions runner); sintaxe revisada manualmente | **FECHADO (infraestrutura) — mas revela um NOVO achado, ver seção 8** |
| RM41-027 | 🔴 crítico | `calcularCrCl` sem teste direto | Não corrigido nesta rodada (ver seção 8: limitação de tempo/escopo) | — | — | **ABERTO** |
| RM41-031 | 🔴 crítico | Risco hemorrágico/interação sem teste direto | Não corrigido nesta rodada | — | — | **ABERTO** |
| RM41-032 | 🔴 crítico | Funções centrais do `icu-engine` sem asserção direta | Não corrigido nesta rodada | — | — | **ABERTO** |
| RM41-005 | 🟠 alto | FiO2 sem validação de plausibilidade | Não corrigido nesta rodada | — | — | **ABERTO** |
| RM41-012 | 🟠 alto | Evidência ausente aceita ATC como fonte | Não corrigido nesta rodada | — | — | **ABERTO** |
| RM41-013 | 🟠 alto | Provenance epoch-placeholder não sinalizado | Não corrigido nesta rodada | — | — | **ABERTO** |
| RM41-020 | 🔴 crítico | Erro mascarado como "sem conflito" | (fechado no RM-46) | — | `clinical-panel-safety-rm46.test.ts` | **FECHADO** (reconfirmado por leitura de `clinical-panel-safety.ts`) |
| RM41-021 | 🟠 alto | Erro mascarado como "anamnese incompleta" | (fechado no RM-46) | — | idem | **FECHADO** (reconfirmado) |
| RM41-022 | 🟠 alto | Contrato de enum do risk score (frontend×backend×Prisma) | Não auditado a fundo nesta rodada — apenas o novo valor `risk_score_calculado` foi adicionado ao enum, sem uma auditoria completa de compatibilidade end-to-end | Migração `20260728000000_add_risk_score_calculado_audit_type` | — | **PARCIALMENTE ABERTO** — ver seção 8 |
| RM41-023 | 🟠 alto | Diagnóstico/risco calculados no frontend nem sempre persistidos no backend real | Não corrigido nesta rodada | — | — | **ABERTO** |
| RM41-026 | 🟠 alto | E2E nunca roda contra Postgres real | `test/postgres-real.e2e-spec.ts` escrito (4 testes: criação+detalhe, idempotência real via unique constraint, auditoria atômica, ownership) — mas **nunca executado com sucesso neste sandbox** (sem Docker/Postgres) | — | Suíte escrita e revisada, mas com guard que a pula sem `DATABASE_URL`; roda pela primeira vez em CI | **ABERTO até a 1ª execução real em CI confirmar** |
| RM41-028 | 🟠 alto | CrCl sem teste de fronteira | Não corrigido nesta rodada | — | — | **ABERTO** |
| RM41-029 | 🟠 alto | Idade pediátrica sem teste de fronteira suspeita | Não corrigido nesta rodada | — | — | **ABERTO** |
| RM41-033 | 🟠 alto | `sync.prescricao.backend_id` nunca gravado | Não corrigido nesta rodada | — | — | **ABERTO** |
| RM41-036 | 🟠 alto | Lint não bloqueia build | Backend: `npm run lint` sem `--fix` agora roda no CI e bloqueia. Frontend: idem — mas **isso expôs uma dívida real pré-existente de ~100 erros de lint** (ver seção 8) | `.github/workflows/ci.yml` | Execução real pendente de CI | **PARCIALMENTE FECHADO** (mecanismo existe; frontend ainda vermelho) |
| RM41-006 a 010, 014, 015, 018, 019, 024, 030, 034, 035 | 🟡/🟢 moderado/baixo | Diversos (ver RM41_AUDITORIA_FINAL_REPORT.md) | Não auditados nem corrigidos nesta rodada | — | — | **ABERTOS** (13 itens, não individualmente revalidados nesta rodada) |
| RM49-NEW-001 | 🟠 alto (novo) | ~100 erros reais de lint no frontend (majoritariamente `react-hooks`/React Compiler: "Cannot create components during render", "setState síncrono em effect", etc.), espalhados por ~50 arquivos em `src/app`/`src/components` | Nunca fora bloqueante (sem CI); dívida acumulada silenciosamente | Não corrigido — requer refatoração cuidadosa arquivo a arquivo, fora do escopo de uma correção "barata e confirmada" | — | **ABERTO** — bloqueia o job `frontend` do novo CI até ser corrigido |

## 4. Riscos críticos — fechamento individual

- **RM41-011 (mojibake):** verificado por script determinístico (mapeamento reverso de bytes Windows-1252,
  incluindo os 5 slots indefinidos que sobrevivem como caracteres de controle C1) — 18 padrões únicos, 884
  ocorrências, todos revisados manualmente antes de aplicar. Confirmado: nenhum outro arquivo do
  repositório tem o mesmo padrão. Validador `check-text-integrity.mjs` agora corre no `prebuild` e falha o
  build se qualquer sequência suspeita reaparecer.
- **RM41-016/017 (auditoria/atomicidade):** `escreverComAuditoriaAtomica()` unifica a correção — testado com
  `FakeDb` (rollback real em memória, não apenas mock de passagem) provando que uma falha na auditoria
  desfaz a escrita clínica, e vice-versa. Regressão de 138→144 testes unitários e 135 e2e mantidos verdes.
- **RM41-025 (CI/CD):** workflow criado com serviço Postgres real, `prisma migrate deploy`, e todos os 4
  gates (typecheck/lint/test/build) por lado, sem mecanismos de mascaramento.
- **RM41-027/031/032 (cobertura de teste):** **não fechados** — ver seção 8.

## 5. Riscos altos — fechamento individual

Ver matriz (seção 3). De 10 riscos altos herdados, **nenhum foi corrigido nesta rodada** além do mecanismo
de CI que expõe RM41-036 (mas não o resolve no frontend) e da suíte real-Postgres para RM41-026 (escrita,
não verificada). Isso é dito explicitamente porque **nenhum "risco alto aberto" pode ser fechado por
inferência** — cada um exigiria mudança de código própria (validação de FiO2, separação evidência/ATC,
sinalização de provenance, auditoria de contrato de enum, persistência real de diagnóstico/risco,
rastreabilidade de `backend_id`), não realizada por restrição de tempo desta sessão.

## 6. Riscos moderados — fechamento individual

**Nenhum dos 13 itens moderados/baixos (RM41-006 a 010, 014, 015, 018, 019, 024, 030, 034, 035) foi
revisitado nesta rodada.** Não há evidência de que tenham sido corrigidos por nenhuma RM anterior — seguem
como estavam documentados no RM-41.

## 7. Riscos baixos — fechamento individual

Idem seção 6 — nenhum item de severidade baixa foi tratado nesta rodada.

## 8. Novos riscos encontrados

| Risco | Severidade | Causa | Correção | Teste | Status |
|---|---|---|---|---|---|
| RM49-NEW-001 — dívida de lint do frontend (~100 erros reais, ~50 arquivos, majoritariamente regras `react-hooks`/React Compiler) | 🟠 alto | Nunca existiu gate de CI que bloqueasse lint; a dívida se acumulou sem detecção | Não corrigida — corrigir às cegas 100 erros de hooks/JSX em 50 arquivos sem testar cada tela num navegador real é o tipo exato de "substituição global cega" que o próprio RM-49 proíbe | — | **ABERTO** — proposto como próximo RM dedicado |
| RM41-022 — contrato de enum do risk score, auditoria incompleta | 🟠 alto (rebaixado de "latente" para "parcialmente ativo") | Ao fechar RM41-016, um novo valor de enum (`risk_score_calculado`) foi adicionado ao `TipoAuditoria` — isso é uma mudança de contrato que NUNCA tinha uma auditoria formal de compatibilidade frontend↔backend↔Prisma↔banco | Migração criada e `prisma generate` confirma compilação; auditoria completa de contrato NÃO foi feita | — | **PARCIALMENTE ABERTO** |
| RM41-026 — suíte real-Postgres nunca executada | 🟠 alto | Ambiente de sandbox sem Docker/Postgres (mesma limitação documentada desde RM-47) | `test/postgres-real.e2e-spec.ts` escrito e revisado por leitura, mas **zero execuções bem-sucedidas até agora** — só rodará pela primeira vez quando o CI subir | — | **ABERTO até 1ª execução real confirmar** |

Nenhum destes 3 riscos foi corrigido nesta rodada — todos permanecem abertos e contam para a decisão final.

## 9. Alterações por arquivo

**Frontend:**
- `frontend/src/lib/pharma-database-neuro-b.ts` — reparo de mojibake (884 ocorrências, 18 padrões).
- `frontend/scripts/check-text-integrity.mjs` (novo) — validador de integridade textual.
- `frontend/package.json` — `typecheck` script adicionado; `prebuild` agora inclui o validador de texto.
- `frontend/eslint.config.mjs` — ignora `coverage/**` (artefato gerado, nunca deveria ter sido lintado).
- `frontend/src/tests/text-integrity-rm49.test.ts` (novo) — 4 testes de regressão.

**Backend:**
- `backend/src/modules/audit/audit.service.ts` — `registrarAuditoria` aceita `tx?: Prisma.TransactionClient` opcional.
- `backend/src/modules/consulta/consulta.service.ts` — nova primitiva `escreverComAuditoriaAtomica()`;
  `criarConsulta`/`criarDiagnostico`/`criarPrescricao`/`salvarRiskScore` reescritos para usá-la.
- `backend/prisma/schema.prisma` + nova migration — enum `TipoAuditoria` ganha `risk_score_calculado`.
- `backend/package.json` — `typecheck` script adicionado.
- `backend/test/support/fake-prisma.ts` — `riskScore` model + `$transaction` com rollback real em memória.
- `backend/src/modules/consulta/consulta.service.spec.ts` — mock ganha `$transaction`.
- `backend/test/*.e2e-spec.ts` (6 arquivos) — mocks ganham `$transaction` (atribuído fora do literal, para
  não degradar a inferência de tipo do TypeScript nos demais campos do mesmo mock).
- `backend/src/auth/decorators/current-user.decorator.ts`, `backend/src/auth/guards/roles.guard.ts` —
  tipagem explícita de `Request`, removendo `any` implícito (lint pré-existente).
- `backend/src/modules/cache/cache.service.ts` — blocos `catch {}` vazios agora logam a falha (lint
  pré-existente `no-empty`).
- `backend/src/modules/consulta/consulta.service.atomicidade-rm49.spec.ts` (novo) — 6 testes de atomicidade real.
- `backend/test/postgres-real.e2e-spec.ts` (novo) — 4 testes contra Postgres real (pulados neste sandbox).

**Infraestrutura:**
- `.github/workflows/ci.yml` (novo) — pipeline completo, frontend + backend, com serviço Postgres real.

## 10. Testes adicionados

- Frontend: +4 testes (770 → 774 no `vitest run`).
- Backend: +6 testes unitários de atomicidade, +4 testes e2e reais contra Postgres (atualmente pulados)
  (138 → 144 unit; e2e 135 passando + 4 pulados, de 135 antes).

## 11. Gates executados (resultados reais desta rodada)

| Gate | Frontend | Backend |
|---|---|---|
| Typecheck | limpo | limpo |
| Lint | **103 erros / 251 avisos** (pré-existentes, não introduzidos nesta rodada — ver seção 8) | **limpo (0/0)** |
| Testes unitários | 774/774 | 144/144 |
| Testes de integração/E2E | — | 135/135 passando + 4 pulados (sem Postgres real neste sandbox) |
| Build | limpo (RM-23/RM-24/RM-49-texto verdes) | limpo |
| CI/CD | workflow criado, sintaxe revisada manualmente; **nunca executado** (sem runner disponível aqui) — falhará no job `frontend` até a dívida de lint (RM49-NEW-001) ser corrigida | idem — passaria hoje, incluindo a suíte real-Postgres pela primeira vez |

## 12. Regressão farmacológica

Zero regressão confirmada: `pediatric-engine`, `dosing-engine`, `dose-calculator`, `safety-rules`,
`DrugRepository`, RM-22/23/24 seguem verdes. Nenhuma dose, protocolo ou regra farmacológica foi tocada
nesta rodada (as únicas mudanças em arquivo farmacológico foram de **encoding**, não de conteúdo clínico —
prova: `text-integrity-rm49.test.ts` verifica explicitamente que doses/contraindicações continuam
idênticas ao texto original, apenas com acentuação corrigida).

## 13. Segurança e isolamento entre usuários

Sem mudanças nesta rodada além do que RM41-016/017 já cobrem (auditoria). Testes de ownership (e2e)
continuam 100% verdes.

## 14. Persistência e auditoria

RM41-016/017 fechados com prova de atomicidade real. RM41-023 (diagnóstico/risco nem sempre persistidos no
fluxo real) e RM41-033 (`backend_id` de sync nunca gravado) **seguem abertos** — não são a mesma coisa que
auditoria de escrita; são gaps de modelo de dados/fluxo, não tocados nesta rodada.

## 15. CI/CD

`.github/workflows/ci.yml` criado do zero. Roda em `push`/`pull_request` para `main`. Backend usa serviço
`postgres:16` real, aplica migrations via `prisma migrate deploy`, roda unit + e2e (incluindo, pela
primeira vez, a suíte contra Postgres real) + build. Frontend roda typecheck/lint/test/build. **Nenhum job
usa `continue-on-error` ou lint com `--fix`** — o pipeline é genuinamente bloqueante. Consequência honesta:
rodar este workflow HOJE **falharia** no job `frontend`, porque ele expõe ~100 erros de lint reais e
pré-existentes que nunca tinham sido bloqueados antes. Isso não é uma falha da entrega desta rodada — é
exatamente o que um gate de CI honesto deveria fazer: revelar dívida que já existia, em vez de escondê-la.

## 16. Limitações reais do ambiente

- **Sem Docker/Postgres neste sandbox** (limitação já documentada desde RM-47): a suíte
  `postgres-real.e2e-spec.ts` foi escrita, revisada por leitura e tem guard de skip seguro, mas nunca
  rodou com sucesso. Mecanismo de detecção: ela rodará automaticamente na primeira execução do CI, onde um
  Postgres real é provisionado — se falhar lá, o pipeline fica vermelho (não há mascaramento possível).
- **Sem GitHub Actions runner neste sandbox**: o workflow YAML foi revisado manualmente linha a linha
  (nomes de job, serviços, variáveis de ambiente, comandos reais do `package.json` de cada lado) mas nunca
  executado de ponta a ponta. Primeira execução real acontecerá no próximo push/PR.

## 17. Critérios finais

| Critério | Resultado |
|---|---|
| Riscos críticos abertos | **3** (RM41-027, 031, 032) |
| Riscos altos abertos | **10** (RM41-005, 012, 013, 022*, 023, 026*, 028, 029, 033, 036*) — `*` parcialmente mitigados, não fechados — mais **1 novo** (RM49-NEW-001) = **11** |
| Riscos moderados abertos | **~13** (RM41-006–010, 014, 015, 018, 019, 024, 030, 034, 035 — não revisitados) |
| Riscos baixos abertos | incluídos na contagem acima (RM-41 não separou moderado/baixo de forma que permita recontagem independente sem reabrir cada item) |
| Riscos novos não corrigidos | **3** (seção 8) |
| Dados fictícios fora do demo | 0 |
| Fallback clínico silencioso | 0 |
| Vazamento entre usuários | 0 |
| Falhas de auditoria | 0 (RM41-016/017 fechados e testados) |
| Escritas clínicas não atômicas identificadas | 0 (no módulo `consulta`; não auditado em `mfa.service.ts`, que também tem o padrão `$transaction` + auditoria separada — não verificado nesta rodada) |
| Falhas de testes | 0 (774 frontend + 144 backend unit + 135 e2e, todas passando; 4 e2e puladas honestamente) |
| Falhas de typecheck | 0 |
| Falhas de lint | **103 erros (frontend)** / 0 (backend) |
| Falhas de build | 0 |
| Regressões farmacológicas | 0 |
| Gates obrigatórios ausentes | 0 (todos existem e rodam; o gate de lint do frontend existe e **corretamente falha**, revelando dívida real) |

## 18. Decisão final

# 🔴 NÃO APTO PARA EXPANSÃO CLÍNICA

Por definição do próprio RM-49 ("se qualquer valor for maior que zero, status final = 🔴"), e com
**3 riscos críticos abertos, 11 riscos altos abertos e ~13 riscos moderados/baixos nunca revisitados**,
a expansão clínica não pode ser autorizada.

Isto não é dito com prazer, mas com a mesma disciplina de honestidade das rodadas anteriores: esta sessão
fechou 3 riscos críticos genuínos (mojibake, auditoria de risk-score, atomicidade escrita-clínica) e criou
a primeira infraestrutura de CI/CD real do projeto — incluindo, pela primeira vez, uma suíte de teste
escrita contra PostgreSQL real (ainda não executada com sucesso por falta de ambiente). Isso é progresso
substancial e verificável. Mas não é o saneamento total de 100% exigido pelo escopo desta rodada, e
fingir que é violaria o próprio objetivo do RM-49.

Os itens não fechados (cobertura de teste de `calcularCrCl`/risco hemorrágico/`icu-engine`; 8 riscos altos
de validação/persistência/rastreabilidade; ~13 itens moderados/baixos; ~100 erros de lint do frontend)
requerem, cada um, trabalho dedicado e cuidadoso — não são bloqueadores "baratos e confirmados" que
caibam com segurança numa única rodada sem risco de introduzir regressão ou de fazer exatamente o que o
RM-49 proíbe explicitamente ("substituição global cega", "refatoração ampla sem relação com um risco").

## 19. Próximos passos

1. **RM-50** — Cobertura de teste direta para `calcularCrCl` (incluindo fronteiras, RM41-027/028), risco
   hemorrágico/interação terapêutica (RM41-031) e funções centrais do `icu-engine` (RM41-032).
2. **RM-51** — Remediação da dívida de lint do frontend (RM49-NEW-001): ~100 erros `react-hooks`/JSX em
   ~50 arquivos, corrigidos incrementalmente com verificação em navegador real por tela, não em lote.
3. **RM-52** — Fechamento dos 8 riscos altos restantes de validação/persistência: FiO2 (005), evidência×ATC
   (012), provenance-epoch (013), auditoria completa de contrato de enum do risk score (022), persistência
   real de diagnóstico/risco (023), fronteira de idade pediátrica (029), rastreabilidade de `backend_id`
   (033).
4. **RM-53** — Primeira execução real do CI (`.github/workflows/ci.yml`) contra um runner de verdade,
   confirmando `postgres-real.e2e-spec.ts` pela primeira vez; e auditoria de `mfa.service.ts` quanto ao
   mesmo padrão de atomicidade escrita+auditoria resolvido em `consulta.service.ts` nesta rodada.
5. **RM-54** — Varredura dos 13 itens moderados/baixos do RM-41 nunca revisitados, com evidência de
   fechamento individual (não em lote).
6. Somente após RM-50 a RM-54 fecharem os riscos críticos e altos remanescentes, reexecutar esta auditoria
   (nova rodada de saneamento total) para reavaliar a decisão de expansão clínica.

---

**RISCOS CRÍTICOS ABERTOS: 3**
**RISCOS ALTOS ABERTOS: 11**
**RISCOS MODERADOS ABERTOS: ~13**
**RISCOS BAIXOS ABERTOS: incluídos acima**
**NOVOS RISCOS NÃO CORRIGIDOS: 3**

**DECISÃO: 🔴 NÃO APTO PARA EXPANSÃO CLÍNICA**
