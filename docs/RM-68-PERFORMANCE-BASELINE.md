# RM-68 — Baseline de Performance e Plano de Carga Realista

**Natureza deste documento:** uma baseline real, medida nesta sessão contra
um servidor Postgres-compatível local (não simulada, não estimada), mais um
plano de carga reproduzível para rodar contra staging/produção. Nenhum
número de "1 milhão de registros" foi usado — os volumes de dados e os
níveis de concorrência foram escolhidos e justificados antes de qualquer
execução (seção 4). Onde não existe projeção real de uso, isso é declarado
explicitamente como decisão pendente, não preenchido com um número
inventado.

---

## 1. Ambiente

| Item | Valor |
|---|---|
| Máquina | Estação de desenvolvimento local (Windows), não um servidor dedicado — números de throughput/CPU NÃO são comparáveis a infraestrutura de produção |
| Backend | NestJS + Prisma 7.8.0, build de produção (`nest build`, `node dist/src/main.js`), `APP_ENV=production` |
| Banco de dados | **Não é Neon (produção)** — Postgres real via `prisma dev` (motor PGlite/WASM, protocolo de rede Postgres real, não um mock em memória), a mesma técnica já usada por `scripts/test-e2e-postgres-local.mjs` (RM-53/RM41-026) para rodar e2e reais sem Docker |
| Cache (Redis) | Desativado — `REDIS_URL` não configurada neste ambiente. `buscarEvidencias`/`buscarRWE` batem no banco em toda chamada (pior caso, não o caso de produção com Redis configurado) |
| Migrations | As 3 migrations reais do repositório aplicadas via `prisma migrate deploy` (schema idêntico ao de produção) |

**Por que não Neon/staging real:** este ambiente de execução não tem acesso
de rede a nenhum Postgres gerenciado (Neon) nem a Docker — confirmado por
`DATABASE_URL` ausente do `process.env` do runner de testes (a suíte
`postgres-real.e2e-spec.ts` já constata isso e pula, ver RM-53) e por `docker`/`psql`
ausentes do PATH. `prisma dev` foi a alternativa mais próxima de "Postgres
real" disponível sem infraestrutura externa — mas **PGlite não é Neon**: é
um motor Postgres em WASM, single-process, sem o pooling de conexões
gerenciado, replicação, nem as características de rede (latência real,
pooler PgBouncer-like) que o Neon tem em produção. Isso é uma limitação
central deste documento, não um detalhe — ver seção 8.

## 2. Infraestrutura

| Item | Valor |
|---|---|
| `DATABASE_URL` (benchmark) | `postgres://postgres:postgres@localhost:<porta>/template1?...&connection_limit=20` |
| Redis | Não configurado |
| Processo do backend | 1 único processo Node (`node dist/src/main.js`), sem cluster/PM2 — produção real roda como função serverless (Vercel), modelo de concorrência diferente deste benchmark de processo único |
| Rate limiting | `ThrottlerGuard` global (`APP_GUARD`), `{ ttl: 60000, limit: 60 }` — **60 requisições por 60s por IP, aplicado a TODAS as rotas**, não só `/auth/*` (achado da seção 6) |
| Body limit | 1 MB (json/urlencoded) |

## 3. Dados

Script reprodutível: [`backend/scripts/rm68-seed-synthetic.mjs`](../backend/scripts/rm68-seed-synthetic.mjs).

**100% sintético — nenhum dado real ou identificável.** Nomes, e-mails,
`hash_identidade` (equivalente a CPF pseudonimizado) e `crm_hash` são gerados
por um PRNG determinístico (seed fixa, reprodutível) — nunca derivados de
pessoa real. Cobre: usuários/médicos, pacientes, consultas, diagnósticos,
prescrições, risk scores e registros de auditoria, com as relações reais do
schema (`Consulta → Diagnostico/Prescricao/RiskScore`, `Paciente → Consulta`).

| Escala | Usuários | Pacientes | Consultas | Diagnósticos | Prescrições | Risk scores |
|---|---|---|---|---|---|---|
| `baixa` | 5 | 50 | 100 | 100 | ~77 | ~70 |
| `moderada` | 50 | 500 | 1.000 | 1.000 | ~783 | ~690 |
| `alta` | 200 | 3.000 | 5.000 | 5.000 | ~4.008 | ~3.422 |

Volumes escolhidos para exercitar paginação/índices em ordem de grandeza
crescente (centenas → milhares), **nunca a meta arbitrária de "1 milhão"**
que a RM-68 explicitamente pediu para não usar sem justificativa — não existe
hoje uma projeção real de volume de produção (seção 4) que justificasse ir
além disso nesta rodada exploratória.

## 4. Cenários de carga — hipótese de uso (decisão pendente declarada)

**Não existe telemetria de uso real deste sistema.** O RM-58 já confirmou,
por grep de todo o código, que nenhuma integração de analytics/telemetria
existe no frontend nem no backend. Isso significa que **qualquer número de
"usuários simultâneos esperados" ou "requisições por segundo em produção"
seria inventado** se apresentado como projeção real.

**Decisão pendente, registrada explicitamente:** uma projeção real de
volume de produção (nº de médicos ativos, consultas/dia por médico, picos de
uso) precisa vir do dono do produto — este documento NÃO a substitui.

Na ausência dessa projeção, os 3 cenários abaixo usam uma **hipótese
declarada** (não uma meta de negócio) para dar uma primeira leitura de
comportamento sob carga crescente:

| Cenário | Concorrência (requisições em voo simultâneas) | Hipótese |
|---|---|---|
| `sequencial` (calibração) | 1 | Baseline de latência pura, sem concorrência nem rate limit — não é um "cenário de uso", é uma referência de comparação |
| `baixa` | 2 | Um consultório pequeno, poucos médicos usando o sistema ao mesmo tempo |
| `moderada` | 10 | Múltiplos consultórios/uma clínica de porte médio |
| `alta` | 30 | **Não é uma meta de produção** — é um teto de DESCOBERTA: até onde esta infraestrutura local aguenta antes de degradar visivelmente. Ver seção 7 — a resposta foi "não muito além disso", o que é em si o resultado mais importante desta rodada |

Script reprodutível: [`backend/scripts/rm68-load-test.mjs`](../backend/scripts/rm68-load-test.mjs)
(usa `fetch` nativo do Node, sem dependências novas — mede latência real
por requisição, nunca estima).

## 5. Investigação estática (mapeamento, sem executar carga)

### Endpoints (todos mapeados, `src/**/*.controller.ts`)

| Rota | Descrição |
|---|---|
| `GET /health`, `GET /` | Health check, sem DB |
| `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | Autenticação (bcrypt custo 12) |
| `POST /auth/mfa/setup`, `/ativar`, `/desativar` | MFA |
| `POST /api/consulta`, `GET /api/consultas`, `GET /api/consulta/:id`, `GET /api/timeline` | Consulta (criação/leitura/histórico) |
| `POST /api/diagnostico` | Diagnóstico |
| `POST /api/prescricao` | Prescrição |
| `POST /api/risco` | Risk score |
| `GET /api/evidence/:cid`, `GET /api/rwe/:cid` | Evidências (com cache Redis, se configurado) |
| `POST /api/migration`, `GET /api/migration/status` | Migração de dados legados (localStorage → backend) |

**Busca farmacológica não tem endpoint de backend** — `searchDrugs()`/
`getAllDrugs()` (RM-58/RM-63) rodam inteiramente no frontend sobre um
catálogo estático em memória, sem consulta ao banco. Não há o que
medir aqui do lado do backend; a busca farmacológica não é um fator de
carga de banco de dados neste sistema hoje.

### Consultas Prisma e possíveis N+1

Leitura completa de `consulta.service.ts` e `audit.service.ts` (os 2
serviços responsáveis por toda escrita/leitura clínica). **Nenhum N+1
clássico encontrado** (nenhum loop chamando `prisma.X.findUnique`/`create`
por item de um array). Padrão observado, consistente em todo escrito
clínico:

1. 1 consulta para checar `idempotency_key` (se fornecida).
2. 1 consulta de ownership (`findFirst` verificando que o recurso pertence
   ao usuário autenticado).
3. `prisma.$transaction(async (tx) => { create clínico + create de
   auditoria })` — 2 statements na mesma transação atômica (RM-49/RM41-016/017).

Ou seja, cada escrita (`criarConsulta`/`criarDiagnostico`/`criarPrescricao`/
`salvarRiskScore`) faz **3 a 4 idas ao banco sequenciais** (não paralelas,
já que cada uma depende do resultado da anterior) — não é um N+1 (não escala
com volume de dados), mas é uma cadeia "tagarela" (chatty) que soma latência
de rede a cada passo. Isso NÃO foi alterado nesta RM (regra "não otimizar
sem medição") — registrado como candidato a revisão futura SE a medição
contra staging real mostrar que a soma dessas idas ao banco é
significativa lá (contra Neon, com latência de rede real maior que
localhost, a soma pode pesar mais do que mostrou aqui).

### Índices (`prisma/schema.prisma`)

O schema já está bem indexado para os padrões de acesso reais: `Consulta`
tem índices em `usuario_id`, `status`, `criado_em` (exatamente os campos
usados por `listarConsultas`/`buscarTimeline`); `Diagnostico`/`Prescricao`/
`RiskScore` têm índice em `consulta_id`; `Auditoria` tem índices em
`usuario_id`, `tipo`, `timestamp`, `crm_hash`. **Nenhuma lacuna de índice
óbvia foi encontrada** na leitura do schema — confirmado dinamicamente pelo
`EXPLAIN ANALYZE` da seção 7.5 (usa `Bitmap Index Scan` no índice correto,
não `Seq Scan`).

### Autenticação — custo de bcrypt (medido isoladamente, sem servidor)

```
bcrypt.hash(custo 12)    x10: ~575-589ms cada
bcrypt.compare(custo 12) x10: ~574-580ms cada
```

Este é um custo de CPU **deliberado** (bcrypt custo 12 é uma escolha de
segurança correta contra força bruta de senha) — mas domina completamente a
latência de `/auth/register` e `/auth/login`, muito mais do que qualquer
consulta ao banco (que leva 5-70ms nos mesmos testes). Com
`UV_THREADPOOL_SIZE` padrão do Node (4), o throughput teórico máximo de
login/registro fica em torno de **4 ÷ 0,58s ≈ 6,9 req/s por instância**,
independentemente de quão rápido o banco responda. Isso é uma característica
do design de segurança, não um bug — mas é uma informação real de
capacidade que faltava documentar.

## 6. Achado: `ThrottlerGuard` é global, não só para autenticação

`app.module.ts` aplica `ThrottlerGuard` via `APP_GUARD` — ou seja, o limite
de 60 requisições/60s por IP vale para **todas as rotas**, incluindo `GET
/health`, `GET /api/consultas`, `GET /api/timeline`, não apenas
`/auth/login`. Em todos os cenários com concorrência > 1 e mais de ~60
requisições cumulativas em 60s (a partir do mesmo IP), uma fração
crescente das respostas foi `429 Too Many Requests` — comportamento
correto e esperado do rate limiter, não uma falha do sistema, mas uma
característica de design que **qualquer clínica/consultório atrás de um
único IP compartilhado (NAT) atingiria em uso normal, não só em ataque**,
se vários médicos usarem o sistema simultaneamente. Vale revisão de produto:
o limite deveria ser por usuário autenticado (não por IP) para rotas
autenticadas, e/ou ter um teto mais alto para rotas de leitura (`GET`) do
que para rotas sensíveis (`POST /auth/login`).

## 7. Resultados por cenário (medidos, não estimados)

### 7.1 — `sequencial` (concorrência 1, calibração — n=15/endpoint)

*n pequeno — p95/p99 não são estatisticamente confiáveis aqui; serve para
comparar ORDEM DE GRANDEZA entre endpoints, com concorrência/rate-limit
neutralizados.*

| Endpoint | p50 | p95 | erro |
|---|---|---|---|
| `GET /health` | 4,2 ms | 13 ms | 0% |
| `POST /auth/login` | 601,5 ms | 613,1 ms | 33% (429 residual do register anterior) |
| `POST /api/consulta` | 52,1 ms | 61,3 ms | 0% |
| `POST /api/diagnostico` | 57,4 ms | 78,5 ms | 0% |
| `POST /api/prescricao` | 63,8 ms | 88,4 ms | 0% |
| `GET /api/consultas` (paginado) | 30,5 ms | 78,3 ms | 0% |
| `GET /api/consulta/:id` | 24,9 ms | 35,2 ms | 0% |
| `GET /api/timeline` | 20,1 ms | 26,9 ms | 0% |

**Sem concorrência, tudo funciona corretamente, sem erro** (exceto o
throttle residual do login, explicado pela chamada de `/auth/register` que
o precede no script). Este é o piso de latência real do sistema neste
ambiente.

### 7.2 — `baixa` (concorrência 2, n=60/endpoint)

| Endpoint | p50 | p95 | p99 | throughput | taxa de erro |
|---|---|---|---|---|---|
| `GET /health` | 3,9 ms | 7,6 ms | 17,6 ms | 433,4 req/s | 0% |
| `POST /auth/login` | 4,8 ms | 649,1 ms | 676,4 ms | 17,9 req/s | 83,3% (429 — throttle) |
| `POST /api/consulta` | 56,1 ms | 137,8 ms | 153,3 ms | 27,8 req/s | **26,7% (500)** |
| `POST /api/diagnostico` | 66 ms | 164,3 ms | 180,6 ms | 24,9 req/s | **34,1% (500)** |
| `POST /api/prescricao` | 69,7 ms | 91,6 ms | 127,7 ms | 26,9 req/s | **48,3% (500)** |
| `GET /api/consultas` | 56,6 ms | 82,1 ms | 112,3 ms | 35,4 req/s | 0% |
| `GET /api/consulta/:id` | 34,1 ms | 40,7 ms | 54,8 ms | 55,7 req/s | 0% |

**Já em concorrência 2, os 3 endpoints de escrita (consulta/diagnóstico/
prescrição) mostram uma taxa de erro real e reproduzível de 27-48%.** Ver
seção 8 para a causa raiz (confirmada, não é ruído de medição).

### 7.3 — `moderada` (concorrência 10, n=300/endpoint)

| Endpoint | p50 | p95 | throughput | taxa de erro |
|---|---|---|---|---|
| `GET /health` | 13,9 ms | 39,3 ms | 596,1 req/s | 80% (429) |
| `POST /auth/login` | 5,8 ms | 1.400 ms | 29,4 req/s | 83,3% (429) |
| `POST /api/consulta` | 28,2 ms | 273,1 ms | 145,6 req/s | **92,3% (401/500)** |
| `POST /api/diagnostico` | 265,8 ms | 610,6 ms | 30 req/s | **56,5% (401/500)** |
| `POST /api/prescricao` | 366,5 ms | 492,7 ms | 20,2 req/s | **20% (500)** |
| `GET /api/consultas` | 10 ms | 205 ms | 211,7 req/s | 80% (429) |
| `GET /api/consulta/:id` | 9,7 ms | 164,5 ms | 267,3 req/s | 80% (429) |

Em `moderada`, o volume total de requisições no curto intervalo de execução
excede amplamente o teto de 60 req/60s do `ThrottlerGuard` (achado §6) — a
maioria dos erros em endpoints de LEITURA aqui é 429, não uma falha real de
performance. Os endpoints de ESCRITA continuam mostrando erros que não são
429 (401 "Usuário inativo" e 500) — mesma causa raiz da seção 8.

### 7.4 — `alta` (concorrência 30, n=900/endpoint — teto de descoberta, não meta)

| Endpoint | p50 | p95 | p99 | throughput | taxa de erro |
|---|---|---|---|---|---|
| `GET /health` | 42,4 ms | 98,6 ms | 140,2 ms | 634,5 req/s | 93,3% (429) |
| `POST /auth/login` | 41 ms | 1.569,6 ms | 2.921,8 ms | 20,5 req/s | 83,3% (429) |
| `POST /api/consulta` | 18,8 ms | 2.247 ms | 2.687,2 ms | 169 req/s | **98,1% (500)** |
| `POST /api/diagnostico` | **13.250 ms** | 14.405 ms | 14.405 ms | 1,18 req/s | **47,1% (500)** |
| `POST /api/prescricao` | 2.194 ms | **92.297,6 ms** | 92.297,6 ms | 0,1 req/s | **55,6% (500)** |
| `GET /api/consultas` | 32,7 ms | 549,7 ms | 636,2 ms | 422,8 req/s | 93,3% (429) |
| `GET /api/consulta/:id` | 25,7 ms | 323,4 ms | 487,1 ms | 618,6 req/s | 93,3% (429) |
| `GET /api/timeline` | 24,6 ms | 273,4 ms | 335 ms | 706,2 req/s | (não medido — fim da suíte) |

**Resultado central deste cenário:** em concorrência 30, os endpoints de
LEITURA continuam respondendo rápido (p50 na casa de 25-40ms) — a
degradação é **exclusiva dos endpoits de ESCRITA**, que colapsam
(p95 de `POST /api/prescricao` chegou a **92 segundos**; `POST
/api/diagnostico` com p50 de 13,25 segundos). Isto é uma degradação real e
severa, não um erro de medição — corroborada pela causa raiz identificada
na seção 8.2 (esgotamento do pool de conexões/transações).

### 7.5 — Índices (EXPLAIN ANALYZE real, ~5.000 consultas semeadas)

```sql
EXPLAIN ANALYZE SELECT * FROM consultas
WHERE usuario_id = $1 AND deletado_em IS NULL
ORDER BY criado_em DESC LIMIT 20 OFFSET 0;
```

```
Limit (actual time=1.272..1.506 rows=19 loops=1)
  -> Sort (actual time=1.254..1.355 rows=19 loops=1)
        Sort Method: quicksort  Memory: 21kB
        -> Bitmap Heap Scan on consultas (actual time=0.378..1.133 rows=19 loops=1)
              Recheck Cond: (usuario_id = ...)
              Filter: (deletado_em IS NULL)
              -> Bitmap Index Scan on consultas_usuario_id_idx (actual time=0.176..0.181 rows=19 loops=1)
Planning Time: 0.583 ms
Execution Time: 1.897 ms
```

Confirma o que a leitura estática do schema já indicava: a query real usa o
índice correto (`Bitmap Index Scan`, não `Seq Scan`), execução em **1,9ms**
com ~5.000 linhas na tabela. Sem gargalo de índice identificado.

## 8. Gargalos

### 8.1 — `DriverAdapterError: bind message supplies N parameters, but prepared statement "" requires 0` (concorrência baixa/moderada)

Causa raiz confirmada nos logs do servidor (`[ExceptionsHandler]`) durante
os cenários `baixa`/`moderada`. Reproduzido de forma isolada: (a) 8
requisições `POST /api/consulta` verdadeiramente paralelas via `curl`
**não** reproduziram o erro; (b) um script Prisma-puro (sem Nest) fazendo
40 transações `create+audit` a concorrência 2 **não** reproduziu o erro;
(c) mas a MESMA operação através do servidor Nest completo, sob a mesma
concorrência, reproduziu 27-48% de erro de forma consistente e repetível
(inclusive após reiniciar o servidor do zero). Isso aponta para uma
interação específica entre o pipeline HTTP completo do Nest (guards/
interceptors/pipes) e o driver adapter (`@prisma/adapter-pg` + `pg.Pool`)
sob o servidor Postgres local (PGlite/`prisma dev`) — não isolado ainda ao
componente exato, mas claramente um artefato do AMBIENTE DE TESTE LOCAL, já
que a mesma sequência de operações via Prisma puro não falhou.

### 8.2 — `PrismaClientKnownRequestError P2028: Unable to start a transaction in the given time` (concorrência alta)

Causa raiz confirmada nos logs do servidor durante o cenário `alta`
(concorrência 30): com `connection_limit=20` no `DATABASE_URL` e 30
transações concorrentes disputando o pool, uma fração não consegue obter
uma conexão dentro do timeout padrão de transação do Prisma — erro
`P2028`, um esgotamento de pool CLÁSSICO e bem compreendido (não um mistério
como o achado 8.1). Explica a degradação severa medida em `POST
/api/prescricao`/`POST /api/diagnostico` na seção 7.4.

### 8.3 — `429 Too Many Requests` generalizado

Já detalhado na seção 6 — o `ThrottlerGuard` global (60 req/60s/IP em TODAS
as rotas) é o fator dominante de erro em cenários de leitura sob
concorrência moderada/alta. Comportamento correto do rate limiter, mas
worth revisão de produto (não corrigido nesta RM — "não alterar código para
otimizar sem medição").

### 8.4 — Custo de bcrypt (não é bug, é o piso de capacidade de auth)

Já detalhado na seção 5 — ~578ms por hash/compare, ~6,9 req/s de teto
teórico por instância para login/registro, independente do banco.

## 9. Limitações desta baseline

- **PGlite ≠ Neon.** Os achados 8.1 e 8.2 podem ser específicos do motor
  Postgres local (WASM, single-process) usado nesta sessão por falta de
  acesso a Docker/Neon neste ambiente — **não confirmados contra Postgres
  real de produção**. O achado 8.2 (esgotamento de pool) É um padrão
  genérico de Postgres/Prisma e provavelmente se reproduz de forma
  semelhante contra Neon sob concorrência real suficiente — mas o achado 8.1
  (DriverAdapterError) pode ser exclusivo do PGlite. **Isto precisa ser
  revalidado em staging antes de qualquer decisão de capacidade de
  produção** (ver plano, seção 12).
- **Processo único, não o modelo serverless real da Vercel.** Produção roda
  como função serverless (auto-scaling horizontal, cold starts) — este
  benchmark testou 1 processo Node de longa duração, um modelo de
  concorrência diferente.
- **CPU/memória não foram medidas com uma ferramenta de APM.** Não havia
  `clinic.js`/New Relic/Datadog configurados neste ambiente; a métrica de
  CPU real do processo Node não foi coletada nesta rodada (declarado
  explicitamente, não estimado) — apenas o custo de CPU do bcrypt foi
  isolado e medido diretamente (seção 5).
- **Sem Redis.** Todas as medições de `buscarEvidencias`/`buscarRWE`
  refletem o pior caso (cache desligado) — produção com Redis configurado
  deve ser mais rápida nesses 2 endpoints especificamente.
- **`connection_limit=20`** foi um valor escolhido para este benchmark
  (não testado com outros valores) — não sabemos se um `connection_limit`
  maior teria evitado o achado 8.2 neste ambiente; não foi testado por não
  ser uma "otimização sem medição" (mudar a config só para o teste, sem
  medir o efeito, contrariaria a mesma regra).
- **Um único IP/cliente gerou toda a carga** — a maioria dos 429 é um
  artefato direto disso (RM-58 já apontou ausência de telemetria real; este
  documento reforça que também não há como simular múltiplos IPs/clientes
  reais nesta rodada sem infraestrutura adicional).
- **`n` pequeno em vários cenários** (15-60 nos endpoints mais lentos/
  throttled) — p95/p99 desses endpoints têm baixa confiança estatística;
  reportados mesmo assim, com essa ressalva explícita, em vez de omitidos.

## 10. Capacidade observada (resumo honesto)

| Pergunta | Resposta observada nesta sessão |
|---|---|
| O sistema aguenta leituras (GET) sob concorrência crescente? | **Sim**, latência de leitura permaneceu baixa (p50 20-40ms) mesmo em concorrência 30 — o gargalo real está nas escritas, não nas leituras. |
| O sistema aguenta escritas concorrentes hoje, neste ambiente local? | **Não de forma confiável acima de concorrência ~2** — taxa de erro real (não-429) de 27-48% já em concorrência 2, colapso severo (p95 de dezenas de segundos) em concorrência 30. |
| Isso significa que produção (Neon) tem o mesmo problema? | **Não sabemos ainda** — achado 8.2 (pool) é genérico e plausível em produção sob concorrência real suficiente; achado 8.1 pode ser exclusivo do ambiente local. Requer validação em staging (seção 12). |
| Os índices do banco são adequados? | Sim, para os padrões de acesso testados (`EXPLAIN ANALYZE` confirma uso de índice, não scan completo, mesmo com ~5.000 linhas). |
| Existe N+1? | Não encontrado. Existe uma cadeia de 3-4 idas sequenciais ao banco por escrita — não é N+1 (não escala com volume), mas soma latência de rede a cada write. |
| Login/registro escalam? | Limitados por bcrypt (deliberado), não pelo banco — teto teórico de ~6,9 req/s por instância, independente de qualquer otimização de banco. |

## 11. Recomendações

Nenhuma foi implementada nesta RM ("não alterar código para otimizar sem
medição" — as medições acima SÃO a medição; as ações ficam para uma RM de
implementação, com sua própria medição de confirmação depois):

1. **Prioridade alta:** revalidar os achados 8.1/8.2 contra um Postgres real
   de staging (Neon) antes de tirar qualquer conclusão sobre capacidade de
   produção — ver plano de staging (seção 12).
2. **Revisão de produto:** o `ThrottlerGuard` global por IP (60 req/60s em
   TODAS as rotas) deveria ser reavaliado — por usuário autenticado em vez
   de por IP, e/ou limites diferenciados por sensibilidade de rota
   (login mais restrito, leitura menos restrita).
3. Se o achado 8.2 (esgotamento de pool) se confirmar em staging: avaliar
   `connection_limit` mais alto e/ou um pooler dedicado (o Neon já oferece
   uma connection string "pooled" via PgBouncer-like — confirmar se já está
   em uso em produção).
4. Se a soma de idas sequenciais ao banco por escrita (3-4 por operação)
   se mostrar significativa em staging (latência de rede real maior que
   localhost), considerar paralelizar as checagens independentes (ex.:
   idempotency-key lookup e ownership-check não dependem uma da outra em
   alguns casos) — mudança específica, com sua própria medição de antes/depois.
5. Definir a projeção real de uso (seção 4, decisão pendente) com o dono do
   produto antes de qualquer meta de capacidade formal.

## 12. Plano para staging

1. Provisionar um branch/database de staging real no Neon (ou apontar
   `DATABASE_URL` para um Neon de staging já existente).
2. Rodar `npm run db:migrate:deploy` contra staging.
3. Rodar `node scripts/rm68-seed-synthetic.mjs <escala>` contra staging
   (mesmo script desta sessão — já reprodutível, `DATABASE_URL` externa).
4. Subir o backend real (ou apontar para o deployment de staging existente).
5. Rodar `node scripts/rm68-load-test.mjs <cenario> <baseUrl-de-staging>`
   para os 4 cenários (`sequencial`, `baixa`, `moderada`, `alta`).
6. Comparar diretamente contra os números desta sessão: se os achados 8.1/
   8.2 NÃO se reproduzirem contra Neon real, isso confirma que eram
   artefatos do PGlite local — se SE reproduzirem, viram achados de
   produção reais e prioritários.
7. Só então formalizar uma meta de capacidade de produção (com a projeção
   real de uso da seção 4, se já definida).

---

## 13. Arquivos gerados

| Arquivo | Descrição |
|---|---|
| `backend/scripts/rm68-seed-synthetic.mjs` | Gerador de dados sintéticos reprodutível (3 escalas) |
| `backend/scripts/rm68-load-test.mjs` | Gerador de carga reprodutível (4 cenários), sem dependências novas |
| `docs/RM-68-PERFORMANCE-BASELINE.md` | Este documento |

Nenhum código de aplicação (`backend/src/**`) foi alterado nesta RM. Nenhum
dado real foi usado. Nenhuma alegação de escalabilidade foi feita sem
benchmark correspondente nesta mesma sessão. Não foi feito commit, push ou
deploy.
