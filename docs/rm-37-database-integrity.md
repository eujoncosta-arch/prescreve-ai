# Integridade de Persistência e Banco de Dados — RM-37

**Camada:** RM-37 · **Status:** implementada · **Módulo:** [`backend/prisma/`](../backend/prisma), [`backend/src/database/`](../backend/src/database), [`backend/src/config/`](../backend/src/config)
**Fluxo operacional:** [`backend/README-DATABASE.md`](../backend/README-DATABASE.md)

> Elimina os riscos de persistência, schema drift e inicialização não determinística
> encontrados na auditoria: ausência de migrations versionadas (`prisma db push` direto
> em produção), ausência de seed, e falha tardia/silenciosa por `DATABASE_URL` ausente.

---

## 1. Auditoria — estado encontrado

| Item auditado | Estado encontrado | Risco |
|---|---|---|
| `prisma/migrations/` | **Inexistente** (nenhum arquivo, tracked ou não) | **Crítico** |
| Deploy de schema em produção | `npx prisma db push` manual contra o Neon de produção (documentado em `AUTHORIZATION_SECURITY_AUDIT_REPORT.md`, `MFA_IMPLEMENTATION_REPORT.md`) | **Crítico** |
| Seed (`prisma/seed.ts`) | Inexistente | Médio |
| Docker | Inexistente (nenhum `docker-compose.yml`/`Dockerfile`) | Médio |
| Inicialização (`main.ts`) | Não altera schema silenciosamente (confirmado — nenhuma chamada a `$executeRaw`/migrate em `bootstrap()`) | — |
| `DATABASE_URL` | Sem validação no startup — ausente, `PrismaService` construía o adapter como `undefined` silenciosamente; app subia e só falhava (de forma confusa) na 1ª query real | **Alto** |
| `APP_ENV` | Usado em `environment.util.ts`/CORS/rate-limit, mas nunca documentado em `.env.example` | Baixo |
| Testes contra banco real | Nenhum — todos os testes (unit + e2e) usam `PrismaService` mockado (`overrideProvider`); nenhuma migration jamais foi exercitada contra um Postgres de verdade | Alto (não descoberto antes por falta de cobertura) |

### 1.1 Por que `db push` é um risco aqui

`prisma db push` sincroniza o schema **diretamente**, sem histórico, sem revisão, sem
possibilidade de rollback e sem garantia de que o que roda em produção é o que foi
testado/revisado em outro ambiente. Cada alteração de schema dependia de alguém lembrar
de rodar o comando manualmente contra o Neon de produção — dois exemplos reais
documentados nos relatórios anteriores (`MFA_IMPLEMENTATION_REPORT.md`,
`AUTHORIZATION_SECURITY_AUDIT_REPORT.md`) confirmam esse padrão em uso.

Isso é exatamente "schema drift": nada garante que o schema de produção, staging e
local estejam de fato sincronizados — a única fonte de verdade era a memória de quem
fez o último `db push`.

## 2. Correção

### 2.1 Migration baseline

Gerada com `prisma migrate diff --from-empty --to-schema=prisma/schema.prisma --script`
(comando 100% determinístico e offline — não precisa de conexão com um banco real,
apenas traduz o `schema.prisma` atual em SQL equivalente):

```
backend/prisma/migrations/
├── migration_lock.toml                              # provider = "postgresql"
└── 20260727000000_baseline_schema_atual/
    └── migration.sql                                # DDL completo do schema atual
```

Esta migration representa uma **fotografia** do schema que já estava em produção via
`db push` — não uma alteração nova. Ela serve dois papéis, dependendo do estado do
banco-alvo:

- **Banco novo/vazio** (local, CI, banco de teste): `prisma migrate deploy` a aplica
  normalmente, criando o schema inteiro do zero.
- **Banco já existente com essas tabelas** (Neon de produção, que já tem tudo via
  `db push`): a migration NUNCA deve ser executada literalmente (falharia com
  `relation already exists`) — deve ser marcada como já aplicada com
  `prisma migrate resolve --applied 20260727000000_baseline_schema_atual`,
  um procedimento **oficial** do Prisma para adotar migrations versionadas em um banco
  gerenciado anteriormente por `db push`. Ver passo a passo em `README-DATABASE.md`.

Depois desse baseline único, **toda alteração de schema futura é uma nova migration**
(`prisma migrate dev` gera o SQL, versiona, comita) — nunca mais `db push` solto.

### 2.2 Seed idempotente e explicitamente identificado

`backend/prisma/seed.ts` (entrypoint fino) + `backend/src/database/seed.util.ts`
(lógica real, testável com o mesmo runner Jest do resto do backend):

- Cria **exatamente um** registro: um usuário de demonstração
  (`dev-seed@prescreve.local`, claramente identificável, nunca um e-mail que colidiria
  com um médico real) + seu registro `Medico` associado.
- **Nunca** cria `Paciente`, `Consulta`, `Diagnostico`, `Prescricao`, `RiskScore` ou
  qualquer outro dado clínico.
- **Idempotente por construção**: usa `prisma.usuario.upsert`/`prisma.medico.upsert`
  chaveados pelos campos `@unique` do schema (`email`, `usuario_id`) — nunca
  `.create()` puro. Rodar o script 1×, 10× ou 100× produz exatamente o mesmo estado;
  `update: {}` garante que um registro existente **nunca é sobrescrito**.
- **Bloqueado em produção por padrão**: recusa-se a rodar quando o ambiente resolve
  para `'production'` (incluindo ambiente desconhecido/ausente — mesma política
  fail-safe de `environment.util.ts`), a menos que `ALLOW_SEED_IN_PRODUCTION=true` seja
  definido explicitamente por quem está operando o deploy.

Testes: `backend/src/database/seed.util.spec.ts` (7 testes — bloqueio de produção,
banco vazio, segunda execução/idempotência, ausência de `.create()` direto).

### 2.3 Inicialização determinística — `DATABASE_URL`

Novo `backend/src/config/database-url.util.ts` (`validarDatabaseUrlConfigurada`),
chamado em `main.ts` junto aos demais fail-fasts já existentes
(`validarSegredosDistintos`, `validarChaveMfaConfigurada`, `validarChaveHmacConfigurada`):
valida no **startup** — nunca numa requisição já em produção — que `DATABASE_URL` está
presente e tem forma de connection string PostgreSQL. Mesmo padrão já usado para os
segredos JWT/MFA/HMAC.

Testes: `backend/src/config/database-url.util.spec.ts` (6 testes).

### 2.4 Docker para desenvolvimento local

Novo `backend/docker-compose.yml` — Postgres 16 local isolado, elimina divergência de
versão entre o Postgres de cada desenvolvedor e o Neon de produção. Documentado no
fluxo oficial. **Apenas para desenvolvimento** — produção continua usando Neon
(serverless, gerenciado), nunca este container.

## 3. Testes executados (o que foi e não foi possível verificar)

Este ambiente de execução **não tem Docker nem um binário Postgres disponível** — não
foi possível levantar um Postgres real para rodar `prisma migrate deploy` de ponta a
ponta neste sandbox. O que foi verificado:

| Cenário exigido | Como foi verificado |
|---|---|
| Schema válido | `prisma validate` (offline, sem DB) — ✅ válido |
| Migration fiel ao schema | Gerada via `migrate diff --from-empty --to-schema` (tradução direta do schema, sem intervenção manual — não há divergência possível por construção) |
| Seed idempotente (banco vazio, banco existente, 2ª execução) | Testes unitários com `PrismaClient` mockado — provam que o código usa `upsert` chaveado, nunca `create` puro, e nunca duas chamadas com chaves diferentes |
| Bloqueio de seed em produção | Testado diretamente (`deveBloquearSeed`) para os 3 ambientes × 2 estados da flag |
| `DATABASE_URL` ausente/inválida → falha no startup | Testado diretamente (`validarDatabaseUrlConfigurada`) |
| Rollback | Não aplicável a testar automaticamente — Prisma Migrate é **forward-only** por design (não gera down-migrations); estratégia documentada em `README-DATABASE.md` (nova migration corretiva, ou restore point-in-time do Neon) |
| `migrate deploy` real contra banco vazio/existente/segunda execução (idempotência do PRÓPRIO Prisma Migrate, via tabela `_prisma_migrations`) | **Não executado neste ambiente** (sem Postgres disponível) — comandos exatos documentados em `README-DATABASE.md` para quem tiver acesso a um Postgres/Neon branch de teste rodar antes do primeiro deploy real |

Full suite do backend (unit + e2e) após as mudanças: **135 unit + 124 e2e** passando
(1 teste de rate-limiting pré-existente, `hardening.e2e-spec.ts`, é sensível a timing
e já era intermitente antes desta auditoria — confirmado não relacionado, passa
isoladamente).

## 4. Fora de escopo / não alterado

- Nenhuma regra clínica foi tocada.
- `prisma/seed.ts` nunca roda automaticamente (não está em `postinstall`/`build`) —
  precisa ser invocado explicitamente (`npm run db:seed`).
- Migrations futuras (`prisma migrate deploy`) também não foram automaticamente
  encadeadas ao `build`/`postinstall` — ver `README-DATABASE.md` para o porquê dessa
  escolha (auditabilidade: aplicar schema deve ser um passo consciente e explícito,
  não um efeito colateral de todo build).
