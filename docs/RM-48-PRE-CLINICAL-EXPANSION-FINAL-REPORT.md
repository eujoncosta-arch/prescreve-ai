# RM-48 — Relatório Final: Auditoria de Prontidão Pré-Expansão Clínica

## 1. Escopo

Auditoria final de arquitetura, persistência, segurança e integridade antes de qualquer expansão clínica
(novas doenças/protocolos/medicamentos/recomendações/calculadoras/especialidades). Rodada de **verificação,
consolidação e correção apenas de bloqueadores confirmados** — nenhuma expansão de conteúdo clínico foi
realizada ou iniciada.

Pré-requisitos declarados como concluídos: RM-38, RM-42, RM-43, RM-44, RM-45, RM-46, RM-47.

## 2. Versões auditadas

- Frontend (`frontend/`): estado pós RM-47, com as 4 correções desta rodada (RM-48) aplicadas em
  `dosing-engine.ts`, `pediatric-engine.ts`, `safety-rules.ts`, `clinical-risk-engine.ts`.
- Backend (`backend/`): estado pós RM-47, **sem alterações** nesta rodada (nenhum bloqueador confirmado
  barato foi identificado no backend que se enquadrasse no escopo desta rodada; os achados de backend
  abertos — RM41-016, RM41-017, RM41-025 — exigem trabalho de escopo maior, tratados como risco aberto).
- Commit-base: HEAD do branch `main` no início desta rodada (ver `git log`).

## 3. Gates executados

| Gate | Frontend | Backend |
|---|---|---|
| Typecheck (`tsc --noEmit`) | Limpo | Limpo |
| Lint (`eslint`) | Limpo nos arquivos tocados | — (sem alteração) |
| Testes unitários | `vitest run`: 770/770 (39 arquivos; +8 desta rodada) | `jest`: 138/138 |
| Testes de integração/E2E | — (cobertos pelos mesmos 770, sem suíte E2E de navegador) | `test:e2e`: 135/135 |
| Build | `npm run build` — sucesso, incluindo gates de prebuild RM-23 ("0 inconsistências") e RM-24 ("0 conflitos críticos") | `npm run build` — sucesso (Prisma Client gerado, Nest build ok) |

Todos os gates rodaram **manualmente** nesta sessão — não há CI/CD que os execute automaticamente em push/PR
(ver achado RM41-025, aberto).

## 4. Matriz

Ver [`docs/PRE_CLINICAL_EXPANSION_READINESS_MATRIX.md`](./PRE_CLINICAL_EXPANSION_READINESS_MATRIX.md).
Resumo: dos 14 critérios de aprovação, **12 atendidos**, **2 não atendidos** (critérios #1 e #2 — risco
crítico e risco alto abertos).

## 5. Achados

Reconfirmados por leitura direta de código nesta rodada (não apenas por memória de auditorias anteriores):

- **RM41-011** (crítico, aberto): `frontend/src/lib/pharma-database-neuro-b.ts` contém 354 ocorrências da
  sequência `Ã` — corrupção de encoding (mojibake) em texto de alerta/segurança de medicamentos neurológicos.
- **RM41-016** (crítico, aberto): `salvarRiskScore` (`backend/src/modules/consulta/consulta.service.ts:443-484`)
  grava o risk score no banco sem nenhuma chamada a `registrarAuditoria`.
- **RM41-017** (crítico, aberto): `criarConsulta` (mesmo arquivo, linhas 235-258) grava a consulta e só
  depois, em chamada separada, registra a auditoria — nenhuma das duas está dentro de `prisma.$transaction`.
  Falha entre as duas escritas perde permanentemente o registro de auditoria daquela consulta.
- **RM41-025** (crítico, aberto): `.github/workflows` não existe no repositório — ausência total de CI/CD.
- **RM41-027, RM41-031, RM41-032** (críticos, abertos): funções de cálculo de CrCl, risco hemorrágico/interação
  terapêutica, e funções centrais do `icu-engine` seguem sem teste direto com asserção (ou testadas apenas
  por scripts sem assert). Nenhuma dessas lacunas foi fechada por RM-42–48, que focaram em ciclo de vida de
  estado/persistência, não em cobertura destes cálculos específicos.
- **RM41-005, 012, 013, 022, 023, 026, 028, 029, 033, 036** (altos, abertos): validação de plausibilidade de
  FiO2 no `icu-engine`, evidência ausente aceitando ATC como fonte, provenance de epoch-placeholder não
  sinalizado, contrato de enum de risk-score incompatível com persistência real, diagnóstico/risco calculados
  no frontend nem sempre persistidos no fluxo real de backend, e2e nunca roda contra Postgres real, funções
  de CrCl/idade pediátrica sem teste de fronteira, e lint não bloqueando o build.

## 6. Correções aplicadas nesta rodada (RM-48)

Todas as 4 correções abaixo fecham bloqueadores **críticos** confirmados do RM-41, com regressão coberta por
8 novos testes em `frontend/src/tests/rm48-pharmacological-blockers.test.ts`:

1. **RM41-001 (SMXTMP-CONTRAINDICACAO-MORTA)** — `dosing-engine.ts`: campo `contraindicado_ate_dias` (novo,
   day-precise) adicionado à interface `RegraDoagem` e aplicado em `calcularDosagem()`; regra de
   sulfametoxazol-trimetoprim para `['lactente','pediatrico']` agora contraindica `< 60 dias`, e o campo
   morto `contraindicacoes` no nível do medicamento (nunca lido pelo motor, mascarado por `as MedicamentoDosagem`)
   foi removido — `tsc --noEmit` confirma que o objeto satisfaz a interface real sem o cast.
2. **RM41-002 (DIPIRONA-JANELA-CONTRAINDICACAO-COARSE)** — mesma mecânica: `contraindicado_ate_dias: 90`
   aplicado à regra de dipirona, cobrindo o corte de "< 3 meses" que caía dentro do bucket `lactente`
   (28–364 dias), granularidade grossa demais para a contraindicação real.
3. **RM41-003 (PED-CONTRAINDICACAO-NAO-BLOQUEIA-APLICACAO)** — `pediatric-engine.ts`: alertas de
   contraindicação por faixa etária passaram de prefixo `⚠` para `🚨`, o único prefixo que
   `DoseCalcCard.tsx` verifica para desabilitar o botão "Aplicar".
4. **RM41-004 (RISK-ENGINE-ACENTO-NAO-NORMALIZADO)** — `safety-rules.ts` (`stripAccents` exportada) e
   `clinical-risk-engine.ts` (reuso da função): comparação de nomes de medicamento em `medicamentos_em_uso`
   agora normaliza acentos antes de comparar, corrigindo o caso "litio" (sem acento, digitação livre do
   médico) não bater com "lítio" (nome canônico).

Nenhuma dose, protocolo, medicamento ou recomendação nova foi introduzida — todas as 4 correções fazem o
código **aplicar** uma contraindicação/normalização já documentada no próprio dado, que antes era ignorada
silenciosamente.

## 7. Riscos abertos

Ver seção 5 (Achados) — resumo por severidade, reconfirmado por leitura direta de código nesta rodada:

- **Críticos abertos (7):** RM41-011 (mojibake), RM41-016 (risk-score sem auditoria), RM41-017 (escrita
  clínica + auditoria não atômicas), RM41-025 (sem CI/CD), RM41-027/031/032 (funções farmacológicas/ICU
  críticas sem teste direto com asserção).
- **Altos abertos (10):** RM41-005, 012, 013, 022, 023, 026, 028, 029, 033, 036.
- **Médios/baixos abertos:** RM41-006 a 010, 014, 015, 018, 019, 024, 030, 034, 035 — não bloqueiam expansão
  por si só, mas seguem sem correção.

Fechados até esta rodada: RM41-001, 002, 003, 004 (RM-48, esta rodada); RM41-020, 021 (RM-46, via
`clinical-panel-safety.ts`).

## 8. Limitações

| Limitação | Severidade | Bloqueia expansão? | Próximo RM proposto |
|---|---|---|---|
| Corrupção de encoding em `pharma-database-neuro-b.ts` (354 ocorrências) | Crítica | **Sim** | RM-49 — reparo de mojibake + regra de validação de integridade textual (ex.: gate de build que rejeita sequências `Ã`/`Â` fora de contexto válido) |
| Escrita de risk score sem trilha de auditoria | Crítica | **Sim** | RM-50 — instrumentar `salvarRiskScore` com `registrarAuditoria` |
| Escrita clínica + auditoria não atômicas (perda de trilha em falha parcial) | Crítica | **Sim** | RM-50 (mesmo RM) — envolver escrita clínica + auditoria em `prisma.$transaction` nos pontos identificados (`criarConsulta` e análogos) |
| Ausência total de CI/CD | Crítica | **Sim** | RM-51 — workflow de CI (typecheck + lint + testes + build) como gate obrigatório de PR |
| CrCl / risco hemorrágico-interação / funções centrais do `icu-engine` sem teste direto com asserção | Crítica | **Sim** | RM-52 — cobertura de teste direcionada a essas funções específicas (não cobertura geral) |
| Diagnóstico/risco clínico calculados no frontend nem sempre persistidos no fluxo real de backend | Alta | Não bloqueia a arquitetura atual; bloqueia **dados** de expansão que dependam dessa persistência | RM-53 — persistência de diagnóstico/risco no backend real |
| `sync.prescricao.backend_id` nunca gravado de volta no estado local | Alta | Não | Incluir no RM-53 (mesmo eixo de persistência) |
| Sem Postgres real / sem navegador real neste ambiente de teste (já documentado em RM-47) | Alta (infraestrutura de teste) | Não bloqueia arquitetura, mas limita confiança dos gates "verdes" | Resolvido organicamente quando RM-51 (CI/CD) rodar em ambiente com serviços reais |
| Lint não bloqueia o build (RM41-036) | Alta (processo) | Não | Incluir no RM-51 (CI/CD) |

## 9. Regressão farmacológica

- `pediatric-engine`, `dosing-engine`, `dose-calculator`, `safety-rules`, `DrugRepository`: sem regressão.
  Suíte completa do frontend (770/770) e backend (138/138 unit + 135/135 e2e) verde após as correções desta
  rodada.
- RM-22, RM-23, RM-24: gates de prebuild reexecutados no `npm run build` do frontend, ambos verdes ("0
  inconsistências", "0 conflitos críticos").
- As 4 correções desta rodada são estritamente aditivas em comportamento de contraindicação/normalização já
  documentado no dado — nenhuma dose ou regra existente foi relaxada; os 3 casos "não deve bloquear além do
  necessário" (SMX-TMP ≥ 60 dias, dipirona ≥ 90 dias) foram testados explicitamente para confirmar isso.

## 10. Decisão final

# 🟡 APTO COM LIMITAÇÕES

A expansão clínica **não** atende aos critérios #1 e #2 do próprio RM-48 ("nenhum risco crítico aberto",
"nenhum risco alto aberto"): permanecem **7 riscos críticos** e **10 riscos altos** abertos, listados nas
seções 7 e 8, nenhum deles corrigido nesta rodada por estarem fora do escopo de "bloqueador confirmado
barato" de uma rodada de consolidação.

Todos os demais 12 critérios (persistência, isolamento entre usuários, paginação, sincronização sem
duplicação, testes unitário/integração/E2E passando, typecheck, lint nos arquivos tocados, builds, regressão
farmacológica) estão atendidos.

Isto **não** é um veredito de bloqueio total: a arquitetura de estado, persistência e segurança entre
usuários construída em RM-42–47 está sólida e testada. A classificação 🟡 reflete que os riscos críticos
abertos são **conhecidos, delimitados e documentados** — não riscos ocultos descobertos agora — mas que
formalmente ainda impedem a liberação limpa exigida pelos critérios #1/#2.

**Recomendação:** não iniciar expansão de conteúdo clínico (novas doenças/protocolos/medicamentos) até que
RM-49 a RM-52 (mojibake, auditoria de risk-score, atomicidade, CI/CD, cobertura de funções críticas) fechem
os 7 riscos críticos. RM-53 (persistência de diagnóstico/risco) pode ficar em paralelo, pois seus riscos são
altos, não críticos, e não estão na lista de bloqueio direto de dados fictícios/segurança entre usuários.

## 11. Próximos passos

1. **RM-49** — Reparo de mojibake em `pharma-database-neuro-b.ts` + regra de validação de integridade
   textual no pipeline de dados (evitar recorrência).
2. **RM-50** — Instrumentar `salvarRiskScore` com auditoria e envolver escrita clínica + auditoria em
   `prisma.$transaction` nos pontos identificados.
3. **RM-51** — Criar workflow de CI/CD (typecheck + lint + testes + build, frontend e backend) como gate
   obrigatório de PR; incluir lint como bloqueador real do build (fecha RM41-036 também).
4. **RM-52** — Cobertura de teste direcionada para `calcularCrCl`, funções de risco hemorrágico/interação
   terapêutica, e funções centrais do `icu-engine` atualmente sem asserção direta.
5. **RM-53** (pode rodar em paralelo aos anteriores) — Persistência real de diagnóstico/risco clínico no
   backend em todos os fluxos, e gravação de `sync.prescricao.backend_id` após sync bem-sucedido.
6. Somente após RM-49 a RM-52 fecharem os riscos críticos, reexecutar uma auditoria de prontidão (RM-54 ou
   nova rodada do RM-48) para reavaliar os critérios #1/#2 antes de autorizar expansão clínica de conteúdo.
