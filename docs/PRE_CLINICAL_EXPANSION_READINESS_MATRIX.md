# Matriz de Prontidão Pré-Expansão Clínica (RM-48)

Pré-requisitos auditados: RM-38, RM-42, RM-43, RM-44, RM-45, RM-46, RM-47.
Esta matriz cobre os 6 eixos obrigatórios do RM-48 e os 14 critérios de aprovação.
Status: `PASS` | `PASS_WITH_LIMITATION` | `FAIL`. Nenhuma linha usa `PASS` havendo falha conhecida no seu escopo.

## 1. Dados clínicos

| Domínio | Critério | Evidência | Status | Bloqueador? | Observação |
|---|---|---|---|---|---|
| Dados clínicos | Ausência de dados fictícios fora do modo demo | RM-38 (`rm-38-fallback-demo-mode.md`); modo demo isolado por flag | PASS | Não | Reconfirmado nesta rodada, nenhum arquivo tocado altera isolamento demo |
| Dados clínicos | Ausência de fallback clínico silencioso | RM-46 criou `clinical-panel-safety.ts` (`avaliarRiscoSeguro`/`avaliarConflitosSeguro`), fechando RM41-020/021 (erro mascarado como "sem conflito"/"anamnese incompleta") | PASS | Não | Confirmado existente em `frontend/src/lib/clinical-panel-safety.ts` |
| Dados clínicos | Integridade entre frontend e backend | RM-43/RM-47: detalhe de consulta e prescrição recuperados do backend real (fixture `fake-prisma.ts`), sem tela usando apenas estado local | PASS_WITH_LIMITATION | Não (para expansão), Sim (para produção real) | RM-47 já documentou: sem Postgres real e sem navegador real neste sandbox — testes cobrem contrato, não o banco real |
| Dados clínicos | Ausência de fabricação de dados ausentes | RM-48 corrigiu 4 bloqueadores onde contraindicação/alerta documentado no dado não era aplicado (RM41-001, 002, 003, 004) — não fabricação, mas *não-aplicação* de dado real | PASS | Não | Ver seção "Correções" no relatório final |
| Dados clínicos | Integridade textual dos dados (mojibake) | RM41-011: `pharma-database-neuro-b.ts` — 354 ocorrências de sequência `Ã` (corrupção de acentuação UTF-8/Latin-1) reconfirmadas por grep nesta rodada | **FAIL** | **Sim** | Não corrigido neste RM (fora do escopo de "bloqueador confirmado barato"; correção requer reescrita cuidadosa de ~20 entradas para não introduzir novo erro) |

## 2. Persistência

| Domínio | Critério | Evidência | Status | Bloqueador? | Observação |
|---|---|---|---|---|---|
| Persistência | Criação | RM-47 e2e: `criarConsulta`/`salvarRiskScore`/prescrição — 135/135 e2e passando | PASS | Não | |
| Persistência | Sincronização | RM-45 (`RM-45-SYNC-RESILIENCE-REPORT.md`): fila de sync com retry e idempotência | PASS_WITH_LIMITATION | Não | RM-46 documentou que `sync.prescricao.backend_id` nunca é gravado de volta no estado local após sync bem-sucedido — gap de rastreabilidade, não de perda de dado |
| Persistência | Recuperação | RM-43: `buscarConsulta` retorna detalhe real via `usuario_id` + `deletado_em: null` | PASS | Não | |
| Persistência | Paginação | RM-44 (`RM-44-PAGINATION-CONSISTENCY-REPORT.md`): paginação consistente frontend/backend | PASS | Não | |
| Persistência | Detalhe | RM-43: tela de detalhe usa dado real do backend, não estado stale da lista | PASS | Não | RM-46 nota que a anamnese completa do detalhe não é 100% aproveitada na reavaliação de risco — limitação de UX, não de integridade |
| Persistência | Prescrição | `criarComIdempotenciaSobColisao` cobre criação de prescrição; e2e RM-47 valida | PASS | Não | |
| Persistência | Retry | `criarComIdempotenciaSobColisao` (dosing/consulta/prescrição/riskScore) trata colisão de retry via `idempotency_key` | PASS | Não | |
| Persistência | Idempotência | Idem acima — testado em unit + e2e | PASS | Não | |

## 3. Segurança entre usuários

| Domínio | Critério | Evidência | Status | Bloqueador? | Observação |
|---|---|---|---|---|---|
| Segurança | Logout | RM-47 (`e2e-logout-race-rm47.test.ts`): requisições em voo são descartadas no logout | PASS | Não | |
| Segurança | Troca de conta | `sessaoEpochRef` (RM-42/46) invalida respostas de sessão anterior | PASS | Não | |
| Segurança | Respostas atrasadas | Mesmo mecanismo de epoch cobre resposta atrasada pós-troca de sessão/logout | PASS | Não | |
| Segurança | Sessão expirada | Fluxo de expiração testado em RM-46/47 | PASS | Não | |
| Segurança | Autorização do backend | `salvarRiskScore`/`buscarConsulta` checam `usuario_id` no `findFirst` — RM41 já havia achado e corrigido gap de IDOR (comentário em `consulta.service.ts:438-441`) | PASS | Não | Corrigido em rodada anterior a esta, reconfirmado por leitura direta do código nesta auditoria |
| Segurança | Ausência de vazamento de dados | Toda query de leitura filtra por `usuario_id`; nenhuma rota de detalhe/lista encontrada sem esse filtro nesta auditoria | PASS | Não | Auditoria limitada ao módulo `consulta`; não houve nova varredura de todos os módulos nesta rodada |

## 4. Estado do frontend

| Domínio | Critério | Evidência | Status | Bloqueador? | Observação |
|---|---|---|---|---|---|
| Frontend | Reducers | `store.tsx` — RM-42/46, sem teste de regressão quebrado (770/770 vitest) | PASS | Não | |
| Frontend | Efeitos | Hidratação/paginação/sync cobertos por RM-42–45 | PASS | Não | |
| Frontend | Dependências | Sem novo achado de dependência de efeito quebrada nesta rodada | PASS | Não | Não houve auditoria exaustiva nova de todos os `useEffect`; herdado de RM-42–46 |
| Frontend | Race conditions | `sessaoEpochRef`, testes e2e de logout/race (RM-47) | PASS | Não | |
| Frontend | Requisições duplicadas | Idempotência client-side via `idempotency_key` gerado uma vez por operação | PASS | Não | |
| Frontend | Estados de loading | Cobertos em RM-43/44 (detalhe/paginação) | PASS | Não | |
| Frontend | Erros | `clinical-panel-safety.ts` (RM-46) elimina os 2 casos de erro mascarado como sucesso | PASS | Não | |
| Frontend | Retry | Fila de sync com retry (RM-45) | PASS | Não | |
| Frontend | Limpeza | Cleanup de listeners/effects herdado de RM-42–46, sem regressão nos 770 testes | PASS | Não | |

## 5. Backend

| Domínio | Critério | Evidência | Status | Bloqueador? | Observação |
|---|---|---|---|---|---|
| Backend | Autenticação | JWT guard em rotas de consulta/prescrição, testado em e2e | PASS | Não | |
| Backend | Autorização | `usuario_id` obrigatório em toda query (`findFirst`/`findMany`) do módulo consulta | PASS | Não | |
| Backend | DTOs / validação | `RiskScorePayloadDto`, `CriarConsultaDto` com `class-validator`, testado | PASS | Não | |
| Backend | Paginação | RM-44 | PASS | Não | |
| Backend | Ownership | Idem "Autorização" acima | PASS | Não | |
| Backend | Tratamento de erros | `ForbiddenException` em ownership; erros de idempotência tratados via `criarComIdempotenciaSobColisao` | PASS | Não | |
| Backend | Integridade das relações | Schema Prisma com relações consulta→diagnóstico/prescrição/riskScore | PASS | Não | |
| Backend | Auditoria de escrita clínica (RM41-016) | `salvarRiskScore` (`consulta.service.ts:443-484`) não chama `registrarAuditoria` — reconfirmado por leitura direta nesta rodada | **FAIL** | **Sim** | Risk score gravado sem trilha de auditoria — não corrigido neste RM |
| Backend | Atomicidade escrita+auditoria (RM41-017) | `criarConsulta` (`consulta.service.ts:235-258`): `prisma.consulta.create` e `audit.registrarAuditoria` são chamadas separadas, **fora** de `$transaction` — reconfirmado nesta rodada (grep de `$transaction` só encontra uso em `mfa.service.ts`, nunca em `consulta.service.ts`) | **FAIL** | **Sim** | Falha entre as duas escritas perde permanentemente o registro de auditoria da consulta criada |
| Backend | Diagnóstico/risco persistidos de fato no fluxo real | RM-46 documentou que diagnóstico e risco clínico calculados no frontend não são persistidos no backend em todos os fluxos (RM41-023) | PASS_WITH_LIMITATION | Não (bloqueia expansão de **dados**, não a arquitetura atual) | Já documentado como risco aberto em RM-46; não corrigido |
| Backend | CI/CD | `ls .github/workflows` → diretório inexistente, reconfirmado nesta rodada | **FAIL** | **Sim** | Nenhum gate automatizado impede merge de regressão; todos os gates desta auditoria foram rodados manualmente |

## 6. Regressão farmacológica

| Domínio | Critério | Evidência | Status | Bloqueador? | Observação |
|---|---|---|---|---|---|
| Farmacologia | `pediatric-engine` sem regressão | 8 novos testes RM-48 + suíte pediátrica pré-existente, 770/770 vitest | PASS | Não | |
| Farmacologia | `dosing-engine`/`dose-calculator` sem regressão | `tsc --noEmit` limpo após remoção do cast morto; suíte completa passando | PASS | Não | |
| Farmacologia | `safety-rules` sem regressão | `stripAccents` apenas exportada (sem mudança de comportamento); suíte passando | PASS | Não | |
| Farmacologia | `DrugRepository` sem regressão | Nenhum arquivo de repositório de fármaco tocado nesta rodada; build backend limpo | PASS | Não | |
| Farmacologia | RM-22/23/24 preservados | Build do frontend reexecuta os gates RM-23 ("0 inconsistências") e RM-24 ("0 conflitos críticos") no prebuild — ambos verdes nesta rodada | PASS | Não | |
| Farmacologia | Suítes clínicas/farmacológicas executadas | Frontend: `vitest run` 770/770 (39 arquivos). Backend: `jest` unit 138/138, `test:e2e` 135/135 | PASS | Não | |
| Farmacologia | Cobertura de funções críticas (RM41-027/031/032) | `calcularCrCl` sem teste direto; funções de risco hemorrágico/interação terapêutica sem teste direto; funções do `icu-engine` testadas só por scripts sem asserção — reconfirmado, nenhuma dessas lacunas foi fechada em RM-42–48 | **FAIL** | **Sim** | Gap de cobertura pré-existente (RM-41), não introduzido nesta rodada, mas segue aberto |

## Cobertura dos 14 critérios de aprovação

| # | Critério | Atendido? |
|---|---|---|
| 1 | Nenhum risco crítico aberto | **NÃO** — RM41-011, 016, 017, 025, 027, 031, 032 seguem críticos e abertos |
| 2 | Nenhum risco alto aberto | **NÃO** — RM41-005,012,013,022,023,026,028,029,033,036 seguem altos e abertos |
| 3 | Nenhuma mistura de dados entre usuários | SIM |
| 4 | Consultas persistidas recuperáveis | SIM |
| 5 | Prescrições persistidas recuperáveis pelo detalhe real | SIM |
| 6 | Paginação consistente | SIM |
| 7 | Sincronização sem duplicação conhecida | SIM (com limitação de rastreabilidade de `backend_id`, não duplicação) |
| 8 | Testes unitários passando | SIM (frontend 770/770, backend 138/138) |
| 9 | Testes de integração passando | SIM (backend e2e 135/135) |
| 10 | Testes E2E passando | SIM (mesma suíte acima; sem navegador real — limitação documentada desde RM-47) |
| 11 | Typecheck limpo | SIM (frontend e backend) |
| 12 | Lint limpo | SIM nos arquivos tocados; RM41-036 (lint não bloqueia build) segue aberto como gap de processo |
| 13 | Builds limpos | SIM (frontend e backend) |
| 14 | Regressão farmacológica preservada | SIM |

**Critérios 1 e 2 não são atendidos.** Por definição do próprio RM-48 ("A expansão clínica só pode ser liberada se... nenhum risco crítico aberto... nenhum risco alto aberto"), a expansão **não pode** ser liberada neste momento.
