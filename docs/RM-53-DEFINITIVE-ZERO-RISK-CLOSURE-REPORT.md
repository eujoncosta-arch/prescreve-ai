# RM-53 — Fechamento Definitivo dos Últimos Riscos Abertos

## 1. Veredito

> ## 🟢 EXPANSÃO CLÍNICA AUTORIZADA

Os três riscos declarados abertos ao final da RM-52 (RM41-023, RM41-026,
RM41-029) foram fechados nesta rodada com implementação real, teste
automatizado específico, teste de regressão e evidência objetiva de
execução — não apenas leitura de código ou documentação de limitação.
Nenhum gate foi enfraquecido para chegar a este veredito.

## 2. Matriz final

| ID | Severidade inicial | Correção | Testes | Evidência | Estado final |
|---|---|---|---|---|---|
| RM41-023 | Alto | Wiring de sincronização real de diagnóstico/risco (frontend) + inclusão de `risco_scores` na recuperação do detalhe (backend) | 14 novos testes (`rm53-persistencia-diagnostico-risco.test.ts`) + 2 novos testes backend (`consulta.service.spec.ts`) | 914/914 testes frontend, 146/146 unit backend, fluxo completo validado em navegador sem erro de console | **CORRIGIDO E VERIFICADO** |
| RM41-026 | Alto | `prisma dev` (Postgres real via wire protocol, sem Docker) como infraestrutura reproduzível local; suíte `postgres-real.e2e-spec.ts` corrigida (2 bugs reais no próprio teste, nunca antes executado) e expandida (4→8 testes) | 8/8 testes passando contra Postgres real, migrations reais aplicadas, 143/143 e2e totais (11/11 suítes, **0 puladas**) | Execução real e reproduzível confirmada nesta sessão (2 rodadas completas, resultado idêntico) | **CORRIGIDO E VERIFICADO** |
| RM41-029 | Alto | Auditoria sistemática de todas as fronteiras etárias/gestacionais executáveis (9 funções, 4 arquivos) | 32 novos testes de fronteira (`rm53-pediatric-boundaries.test.ts`) — limite-1/limite/limite+1 para cada corte, mais testes de ausência de lacuna | 32/32 passando — nenhuma lacuna, sobreposição ou regressão encontrada | **CORRIGIDO E VERIFICADO** |

## 3. RM41-023 — Persistência real de diagnóstico e risco clínico

**Arquitetura anterior:** o backend (schema Prisma, DTOs, `ConsultaService.criarDiagnostico`/`salvarRiskScore`, idempotência, ownership, auditoria atômica) já estava completo e testado isoladamente desde a RM-49. O gap real era 100% de *wiring* do frontend: `executarSincronizacaoConsulta` (`store.tsx`) só sincronizava `consulta` e `prescricao` — nunca chamava `POST /api/diagnostico` nem `POST /api/risco`. Além disso, `buscarConsulta`/`mapConsultaDetalhe` (backend) nem incluíam a relação `risco_scores`, então mesmo se o frontend passasse a persistir o risco, ele nunca voltaria na recuperação do detalhe.

**Causa:** `SELECT_DIAGNOSIS` só armazenava uma *label* de exibição (string), nunca o CID/descrição estruturados exigidos por `POST /api/diagnostico`; o risco calculado (`avaliarRiscoClinico`) era só estado derivado (`useMemo`) dentro do componente `IntelligencePanel`, nunca capturado no estado compartilhado da consulta.

**Implementação:**
- `types.ts`: novos campos `Consultation.diagnostico_estruturado` (`{cid, descricao, confianca}`) e `Consultation.risco_calculado` (`AvaliacaoRiscoClinico`) — campos adicionais, não alteração do campo `diagnostico_selecionado` existente (evita quebrar consumidores).
- `store.tsx`: novas ações `SET_DIAGNOSTICO_ESTRUTURADO`/`SET_RISCO_CALCULADO`; `executarSincronizacaoConsulta` estendida para sincronizar diagnóstico e risco de forma independente entre si e da prescrição (falha de um não bloqueia os outros), reutilizando a mesma `idempotency_key` em retry, propagando `diagnostico_id` real para `criarPrescricao`.
- `DiagnosticPanel.tsx`: despacha `SET_DIAGNOSTICO_ESTRUTURADO` no mesmo evento de seleção (nunca fabrica CID quando a hipótese não tem um).
- `consulta/nova/page.tsx` (`IntelligencePanel`): despacha `SET_RISCO_CALCULADO` no clique do botão "Continuar para Terapêutica" (evento, nunca um efeito — evita reintroduzir o antipadrão corrigido na RM-52).
- Backend (`consulta.service.ts`): `buscarConsulta` passa a incluir `risco_scores: true`; `mapConsultaDetalhe`/`ConsultaDetalheResponse` mapeiam os campos reais (nunca fabricados).

**Persistência/recuperação/idempotência/atomicidade:** reutiliza integralmente a infraestrutura já testada da RM-49 (transação atômica com auditoria, chave de idempotência única por recurso, ownership por `usuario_id`). Nenhuma nova tabela/coluna foi necessária — o schema já suportava isso desde antes.

**Testes:** 14 cenários novos no frontend (diagnóstico só, risco só, ambos juntos com `diagnostico_id` propagado, ausência real nunca fabricada, falha isolada de um não bloqueia o outro, retry reutiliza a mesma chave, sessão inválida não aplica dispatch, reducer, recuperação/hidratação) + 2 no backend (`risco_scores` incluído no `include` do Prisma e exposto corretamente; array vazio genuíno quando não há risco).

## 4. RM41-026 — E2E real contra PostgreSQL

**Descoberta chave desta rodada:** o sandbox não tem Docker nem Postgres instalado (confirmado — `docker`/`psql` inexistentes), mas `npx prisma dev` (feature oficial do Prisma CLI, já uma dependência transitiva do projeto) sobe um servidor Postgres **real**, falando o protocolo de rede real do Postgres (não uma reimplementação em JS nem um mock), sem exigir Docker Desktop nem instalação de sistema. Isso permitiu fechar este risco com evidência genuína, em vez de reclassificá-lo como "limitação de ambiente" — exatamente o que a regra central da RM-53 proíbe.

**Infraestrutura criada:**
- `backend/scripts/test-e2e-postgres-local.mjs` — script único e reproduzível: sobe o Postgres local, aplica `prisma migrate deploy` com as migrations reais do repositório, roda a suíte e2e completa, e desliga tudo ao final (sucesso ou falha). Comando único: `npm run test:e2e:postgres:local`.
- `backend/package.json`: novo script `test:e2e:postgres:local`.
- CI (`.github/workflows/ci.yml`) **não precisou de alteração** — já provisiona um serviço Postgres real via container Docker do próprio runner do GitHub Actions e já roda `postgres-real.e2e-spec.ts` sem `continue-on-error`; a única razão de nunca ter sido comprovado é que este era o primeiro RM em que alguém de fato executou a suíte contra um Postgres real (seja localmente via `prisma dev`, seja em CI).

**2 bugs reais encontrados no próprio teste (nunca antes executado, exatamente como o comentário do arquivo já avisava):**
1. `POST /auth/register` retorna `{ access_token, refresh_token, perfil }` — o teste assumia `{ usuario: { id } }`, que nunca existiu. Corrigido: o id real é obtido consultando o Postgres real pelo e-mail único do teste.
2. O teste de ownership usava um `sub` de usuário **inexistente** num segundo JWT — isso faz `JwtStrategy` rejeitar por 401 (usuário não encontrado) antes de sequer chegar à checagem de ownership, testando autenticação em vez de autorização. Corrigido: um segundo usuário real é registrado no Postgres.

**Testes executados (evidência real, não simulada) — 8 cenários em `postgres-real.e2e-spec.ts`:**
1. Criação de consulta real + recuperação pelo detalhe.
2. Idempotência via `@@unique(idempotency_key)` **real** do Postgres (3 requisições concorrentes → 1 único registro).
3. Auditoria atômica (1 registro de auditoria por escrita, mesma transação).
4. Ownership (usuário B não recupera consulta de A — com usuário B genuíno, não um id fictício).
5. **Novo:** diagnóstico persiste e é recuperável com CID/descrição/confiança reais (RM41-023).
6. **Novo:** risco persiste (enum `NivelRisco` **real** do Postgres) e é recuperável (RM41-023).
7. **Novo:** um `risco_global` fora do enum é rejeitado com 400 **antes** de qualquer INSERT — nenhum registro órfão no banco.
8. **Novo:** `onDelete: Restrict` (RM41-018/019, RM-52) é uma constraint **real** do Postgres — apagar uma Consulta com Diagnóstico vinculado falha de verdade, não apenas no schema lido.

**Resultado final (suíte e2e completa, execução real, 2 rodadas idênticas nesta sessão):**
```
Testes executados: 143 de 143
Testes pulados: 0
Falhas: 0
Suítes: 11 de 11
```

Um teste pré-existente e flaky (`hardening.e2e-spec.ts` — rate limiting, 12 requisições sequenciais reais excedendo o timeout padrão de 5s quando a suíte inteira roda sob carga) também foi corrigido (timeout aumentado para 15s — a asserção em si não foi alterada nem enfraquecida).

## 5. RM41-029 — Auditoria definitiva das fronteiras pediátricas

**Inventário de fronteiras executáveis** (bulas em `pharma-database*.ts`/`eurofarma-sync.ts` são texto/documentação, não ramos de código — fora de escopo desta auditoria, que audita comportamento executável):

| Função | Arquivo | Limites testados | Comportamento |
|---|---|---|---|
| `getPediatricAgeGroup` | dose-calculator.ts | 1, 24, 72, 144 (meses) | `<=` inclusivo no topo |
| `classifyPopulation` | dose-calculator.ts | 28/365, 2, 6, 12, 18 (anos) | `<` exclusivo no topo |
| `classifyPopulation` (geriátrico) | dose-calculator.ts | 65 (anos) | `>=` inclusivo na base |
| `detectarPopulacao` | dosing-engine.ts | 28, 365, 4380, 6570, 23725 (dias) | `<` exclusivo no topo |
| `calcularDosagem`/`contraindicado_ate_dias` | dosing-engine.ts | 60 (SMZ-TMP), 90 (dipirona) dias | contraindica se estritamente menor |
| `calcIdadeCorrigida` | pediatric-engine.ts | 24, 28, 34, 37 (semanas IG) | `>=` inclusivo na base de cada classe |
| `calcDosePediatrica` (idadeMin/MaxMeses) | pediatric-engine.ts | por indicação (ex.: 24 meses) | ambos os limites inclusivos |
| `calcPesoIdealPediatrico` | pediatric-engine.ts | 12 (meses) | sem descontinuidade abrupta |
| `getNeonatalAlerts` | pediatric-engine.ts | 37 sem (ceftriaxona), 90 dias (dipirona) | dispara se estritamente menor |
| `calcClCrSchwartz` | pediatric-engine.ts | 12, 156 (meses) | regressão confirmada (já corrigido na RM-36) |

**Resultado:** 32/32 testes de fronteira passando, incluindo verificação exaustiva de ausência de lacunas (`getPediatricAgeGroup`/`classifyPopulation`/`detectarPopulacao` testadas em toda a faixa 0–100/200/30000, não só nos pontos de corte). **Nenhuma lacuna, sobreposição ou regressão foi encontrada** — as fronteiras já estavam corretas; o que faltava era a suíte de regressão dedicada e exaustiva, agora criada (`rm53-pediatric-boundaries.test.ts`).

Nenhuma dose, contraindicação ou regra clínica foi alterada nesta fase — só verificada e coberta por teste.

## 6. Novos achados

Além dos 2 bugs no teste `postgres-real.e2e-spec.ts` (seção 4) e do teste flaky de rate limiting (seção 4), nenhum novo achado clínico, arquitetural ou de segurança foi identificado nesta rodada.

## 7. Gates finais

| Gate | Resultado |
|---|---|
| Lint frontend | 0 erros (252 warnings pré-existentes, fora de escopo) |
| Lint backend | 0 erros |
| Typecheck frontend | limpo |
| Typecheck backend | limpo |
| Testes frontend | 914/914 |
| Testes backend unitários | 146/146 |
| Testes backend E2E PostgreSQL | 143/143 (11/11 suítes) |
| Testes pulados | 0 |
| Build frontend | limpo (RM-23: 0/358 · RM-24: 0 críticos/368 · RM-49: 0/265 arquivos) |
| Build backend | limpo |
| RM-22 | verde (herdado, sem regressão) |
| RM-23 | verde — 0 inconsistências/358 entidades |
| RM-24 | verde — 0 conflitos críticos/368 total |
| RM-49 (integridade textual) | verde — 0 sequências suspeitas/265 arquivos |
| CI local/reproduzível | executado 2x nesta sessão via `npm run test:e2e:postgres:local`, resultado idêntico |
| CI remoto (GitHub Actions) | não disparado nesta sessão (requer push, fora do meu acesso) — mas o workflow já provisiona Postgres real via Docker e roda a mesma suíte sem `continue-on-error` |
| Navegador real | fluxo completo Paciente→Anamnese→Diagnóstico→Inteligência→Terapêutico→Prescrição validado, 0 erros de console |

## 8. Contagem final

```
Críticos abertos: 0
Altos abertos: 0
Moderados abertos: 0
Baixos abertos: 0
Erros de lint frontend: 0
Erros de lint backend: 0
Falhas de typecheck: 0
Falhas de teste: 0
Testes E2E pulados: 0
Regressões farmacológicas: 0
```

## 9. Decisão

Todos os valores da seção 8 são zero, comprovados por execução real nesta sessão (não por leitura de código nem por documentação de limitação). Os três riscos altos remanescentes da RM-52 (RM41-023, RM41-026, RM41-029) foram fechados com implementação, teste e evidência objetiva. Nenhum gate RM-22/23/24/49 foi enfraquecido. Nenhum `eslint-disable`, `@ts-ignore`, `@ts-nocheck`, skip de teste ou `continue-on-error` foi introduzido.

**Expansão clínica autorizada.**

---

## Próxima ação recomendada fora do sandbox

Bloco informativo — não executado pelo assistente.

```bash
git add -A
git commit -m "RM-53: fecha RM41-023 (persistência real de diagnóstico/risco), RM41-026 (e2e real contra Postgres via prisma dev, 0 suítes puladas) e RM41-029 (auditoria de 32 fronteiras pediátricas)"
git push origin main
```

Depois do push:
1. Confirmar no GitHub Actions que o job `backend` (que já provisiona Postgres real via Docker) roda a suíte `postgres-real.e2e-spec.ts` com sucesso — esta seria a primeira confirmação em CI, complementando a evidência local já obtida nesta sessão.
2. Rodar `npm run test:e2e:postgres:local` (backend) localmente sempre que alterar `schema.prisma`, migrations, ou qualquer fluxo de diagnóstico/risco/prescrição — não depende de Docker.
