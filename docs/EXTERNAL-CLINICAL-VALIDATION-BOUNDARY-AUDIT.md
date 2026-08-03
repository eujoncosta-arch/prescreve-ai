# Auditoria de Fronteira: Validação Clínica Externa (Demo vs. Real)

**Origem:** roadmap pós-consolidação (RM-62/63/64), item "validação clínica
externa". Investigação prévia (ver histórico da sessão) confirmou que validação
clínica externa **real** — sessões com médicos/hospitais reais, coleta de dados
reais — é uma ação humana/organizacional (execução do protocolo já pronto em
`docs/validation/RM-67-MEDICAL-USER-VALIDATION-PROTOCOL.md`), não algo que uma RM
de código possa completar sozinha. Escopo decidido com o usuário: **auditoria de
fronteiras demo vs. real** — garantir que nada no sistema hoje possa ser confundido
com validação clínica externa real.

**Escopo:** auditoria (frontend + backend, incluindo o que a RM-59 deixou
explicitamente fora do escopo dela — "backend"), com uma correção pontual quando
um achado justificou. Nenhuma regra clínica, motor de dose/segurança, ou dado
farmacológico foi alterado.

---

## 1. Ponto de partida — o que já estava coberto

A RM-59 (`docs/RM-59-DEMO-TRANSPARENCY.md`) já auditou e rotulou **17 páginas
frontend** (`demonstracao`/`hibrido`) com `<DemoDataNotice>`, incluindo
`/validacao-clinica` (500 cenários sintéticos) e `/validacao-real` (Kappa/
validadores/hospitais fabricados por gerador pseudoaleatório determinístico). Essa
cobertura é sólida e não foi reaberta aqui. O que a RM-59 deixou **explicitamente
fora de escopo**, por instrução própria: qualquer alteração de backend. Esta
auditoria cobre exatamente essa lacuna, mais uma verificação de cross-contaminação
que a RM-59 não fez (uso de geradores fabricados fora das próprias páginas já
auditadas).

## 2. Achado principal — endpoint real de RWE, honesto mas desconectado

Investigação de `backend/src/modules/consulta/consulta.service.ts`
(`buscarRWE()`) e do schema Prisma:

- Existe um endpoint real, `GET /api/rwe/:cid`, apoiado numa tabela Postgres real
  (`model RWE`, com campos como `taxa_sucesso`, `mortalidade`, `eventos_adversos`,
  `adesao_guideline`) — não fabricado, um caminho genuinamente honesto.
- **Confirmado por `prisma/seed.ts`:** essa tabela nunca é populada — nenhuma
  menção a "rwe" (case-insensitive) no script de seed. Hoje, `buscarRWE(cid)`
  retorna `[]` para qualquer CID em qualquer ambiente.
- **Confirmado por grep:** `consultaApi.buscarRWE()` (o cliente frontend deste
  endpoint) só aparece em `api-client-rm38-fallback.test.ts` — nenhum componente
  React o chama. A página `/rwe` (nav "Real World Evidence") usa exclusivamente
  `frontend/src/lib/rwe-engine.ts`, um gerador de dados **inteiramente fabricado**,
  completamente desconectado deste endpoint real.

**Avaliação:** não há violação de transparência hoje — nada renderiza este
endpoint, então não há risco de estatística vazia ser confundida com real, nem de
estatística fabricada vazar como se fosse do backend real. O achado é
arquitetural: dois sistemas chamados "RWE" (um real e honestamente vazio, um
fabricado e já rotulado como demo) coexistem sob o mesmo nome, sem nenhuma
salvaguarda que impeça uma RM futura de reconectar `/rwe` ao endpoint real
assumindo (incorretamente) que ele já contém dado curado, ou de alguém popular a
tabela com dado fabricado sem essa fabricação ficar visível na camada de serviço.

## 3. Correção aplicada — trava de honestidade no endpoint real

Novo `describe` em `backend/src/modules/consulta/consulta.service.spec.ts`
(`ConsultaService.buscarRWE()`, 3 testes) documentando e travando, por execução
real (não por comentário), que `buscarRWE()` é um **pass-through puro** do Prisma:

1. Tabela vazia para o CID → retorna `[]` — nunca fabrica uma estatística de
   fallback quando não há dado real.
2. A consulta ao Prisma filtra exatamente pelo CID e ordena por `criado_em desc`
   — nunca por um critério que pudesse priorizar um resultado "mais favorável".
3. Quando existem linhas reais, o resultado retornado é EXATAMENTE o que o Prisma
   devolveu — nenhum campo recalculado, arredondado "para melhor" ou substituído.

Se uma RM futura reconectar `/rwe` a este endpoint, ou alguém tentar popular a
tabela com dado sintético "para preencher a demo", este teste é o primeiro gate
que documentaria/travaria qualquer desvio desse comportamento honesto.

## 4. Verificação de cross-contaminação (nenhum achado adicional)

Grep de cada função geradora de dado fabricado já identificada pela RM-59
(`gerarKappaSimulado`, `gerarMedicalValidationReport`, `executarSuiteValidacao`,
`gerarPainelRWE`, `seedRWEDemo`, `seedPharmaAnalyticsDemo`,
`seedHospitalQualityDemo`, `seedScientificUpdateDemo`, `seedInsightsDemo`,
`gerarVereditoAleatorio`) e de cada constante `DEMO_*`/`PERFIL_DEMO` em TODO o
`frontend/src/`, não só nas páginas já auditadas:

- Todos os usos ficam contidos na própria página já rotulada `demonstracao` (RM-59)
  e no módulo `lib/` que a implementa. Nenhum consumidor novo encontrado.
- Única exceção: `gerarPainelRWE`/`listarRWE` também são importados por
  `frontend/src/lib/stress-test-phase22-4.ts` — confirmado ser um script de
  benchmark de performance executado via CLI/Node (`tsx`), sem nenhum consumidor
  em componente React nem rota Next.js. Não é uma superfície de UI, revisado e
  descartado como risco.
- `evidence-engine.ts`/`evidence-timeline.ts` (que sustentam `/evidencias` e
  `/evidence`, classificadas `referencia` pela RM-59) foram inspecionados
  diretamente: nenhum padrão de geração aleatória/fabricação encontrado — conteúdo
  estático de citações reais, consistente com a classificação existente.

## 5. Veredito da auditoria

**Nenhuma nova página ou fluxo de UI expõe dado fabricado sem aviso.** A cobertura
de transparência da RM-59 permanece válida e completa para o frontend. O único
achado real (endpoint backend real, honestamente vazio, desconectado da UI
fabricada de mesmo nome) não era uma violação — foi transformado em uma garantia
testada para que continue não sendo uma, mesmo se reconectado no futuro.

**Este documento não substitui, nem tenta se aproximar de, validação clínica
externa real.** Isso continua exigindo a execução do protocolo RM-67 com médicos e
casos reais fora do time — uma ação humana/organizacional, registrada como
pendência, não fechada por este trabalho.

## 6. Gates executados nesta sessão

| Gate | Resultado |
|---|---|
| `backend: npm run typecheck` | ✅ Limpo |
| `backend: npm run lint` | ✅ 0 problemas (1 erro de formatação `prettier` corrigido via `--fix` durante a sessão) |
| `backend: npx jest` (suíte completa) | ✅ **15 suítes / 149 testes** — todos passando (3 novos desta auditoria; os 146 pré-existentes continuam verdes) |
| `backend: npm run build` | ✅ Exit 0 (`prisma generate` + `nest build`) |

`backend/test/postgres-real.e2e-spec.ts` não foi executado — mesma limitação de
ambiente já documentada em RMs anteriores (sem `DATABASE_URL` apontando para um
Postgres real neste ambiente); o teste novo desta RM é unitário (Prisma mockado),
não depende de banco real.

## 7. Arquivos alterados

**Modificados:**
- `backend/src/modules/consulta/consulta.service.spec.ts` — novo `describe`
  `ConsultaService.buscarRWE()` (3 testes).

**Novos:**
- `docs/EXTERNAL-CLINICAL-VALIDATION-BOUNDARY-AUDIT.md` (este relatório)

Nenhum motor clínico, de dose, protocolo, segurança, dado farmacológico, ou
componente de UI foi alterado. Nenhuma página frontend foi modificada.

---

Não foi feito commit, push ou deploy nesta RM.
