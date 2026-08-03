# Fluxo Oficial de Banco de Dados (RM-37)

Racional completo da auditoria: [`docs/rm-37-database-integrity.md`](../docs/rm-37-database-integrity.md).

## Stack

- **PostgreSQL** (Neon, serverless, em produção/staging; Postgres local via Docker em desenvolvimento).
- **Prisma ORM** com driver adapter (`@prisma/adapter-pg`) — `src/prisma/prisma.service.ts`.
- Schema declarado em `prisma/schema.prisma`; **migrations versionadas** em `prisma/migrations/` (a partir de RM-37 — antes disso, o schema era sincronizado via `prisma db push`, sem histórico).

## Desenvolvimento local

```bash
# 1. Suba um Postgres local (uma vez, ou sempre que precisar)
docker compose up -d

# 2. Configure o .env
cp .env.example .env
# DATABASE_URL="postgresql://prescreve:prescreve@localhost:5432/prescreve_ai?schema=public"

# 3. Aplique as migrations (cria o schema do zero num banco vazio)
npm run db:migrate:dev

# 4. (Opcional) usuário de demonstração para login local
npm run db:seed
```

`db:migrate:dev` cria uma migration nova SEMPRE que o `schema.prisma` divergir do
histórico de migrations aplicadas — nunca sincroniza silenciosamente. Se você editar
o schema, rode `npm run db:migrate:dev` de novo para gerar a migration correspondente,
revise o SQL gerado, e comite o novo diretório em `prisma/migrations/`.

## CI / ambiente de teste

Os testes automatizados (unit + e2e) usam `PrismaService` **mockado**
(`overrideProvider(PrismaService).useValue(prismaMock)`) — não tocam um banco real, e
por isso não precisam de `DATABASE_URL`/migrations para rodar:

```bash
npm test          # unit
npm run test:e2e  # e2e (HTTP real, guards reais, Prisma mockado)
```

Se algum dia for necessário um teste de integração contra um Postgres real (não existe
hoje neste projeto), o fluxo seria: subir `docker compose up -d`, rodar
`npm run db:migrate:deploy` contra esse banco efêmero, então rodar os testes.

## Produção (deploy determinístico)

**Nunca mais `prisma db push` em produção.** O fluxo oficial:

```bash
# Antes de cada deploy que inclua mudança de schema:
DATABASE_URL="<url de produção>" npm run db:migrate:deploy
```

`prisma migrate deploy`:
- Aplica **apenas** as migrations versionadas em `prisma/migrations/` que ainda não
  foram registradas na tabela `_prisma_migrations` do banco-alvo — idempotente por
  natureza (rodar de novo com nada pendente é um no-op seguro).
- **Nunca** gera uma migration nova nem infere alterações — só aplica o que já está
  commitado e revisado. Nenhuma alteração de schema acontece "silenciosamente": toda
  mudança já passou por `migrate dev` localmente e por revisão de código.
- Deve ser rodado como um passo **explícito e auditável** (manualmente ou num step de
  CI dedicado) — deliberadamente **não** está encadeado em `npm run build`/`postinstall`,
  para nunca aplicar uma migration como efeito colateral de um build/deploy de código
  que não deveria alterar schema.

### Adoção única do baseline (banco de produção já existente)

O Neon de produção já tem todas as tabelas (criadas historicamente via `db push`,
antes desta auditoria). Rodar `migrate deploy` **direto** falharia (`relation already
exists`). Antes do PRIMEIRO `migrate deploy` real, rode **uma única vez**, contra a
produção:

```bash
DATABASE_URL="<url de produção>" npx prisma migrate resolve --applied 20260727000000_baseline_schema_atual
```

Isso marca a migration baseline como já aplicada **sem executá-la** — a partir daí,
`migrate deploy` volta a ser o fluxo normal para toda migration nova.

### Vercel

O `vercel.json` na raiz do monorepo aponta o serviço `backend` para
`backend/src/main.ts`. O build da Vercel roda `npm run build` (`prisma generate && nest
build`) — **não** aplica migrations automaticamente, por design (ver acima). Rode
`npm run db:migrate:deploy` manualmente (ou via CI, gatilhado no merge para `main`)
**antes** de cada deploy que inclua uma migration nova.

## Rollback

Prisma Migrate é **forward-only** por design — não gera down-migrations
automaticamente. Estratégias práticas:

1. **Preferencial**: escrever uma nova migration corretiva (`migrate dev`) que reverte
   a alteração — mantém o histórico linear e auditável.
2. **Emergência** (dado já corrompido/perdido): restore point-in-time do Neon
   (recurso nativo do provedor), fora do escopo do Prisma.

## Backup e Restore (produção)

**Gap de prontidão de produção fechado nesta seção**: não havia, em nenhum lugar do
repositório, um registro de como restaurar o banco de produção em caso de perda ou
corrupção de dado. O mecanismo abaixo já existe na infraestrutura (Neon), mas nunca
tinha sido documentado nem verificado.

- **Mecanismo nativo do Neon**: recuperação point-in-time (PITR) — o Neon mantém um
  histórico de mudanças do banco e permite restaurar (ou criar um branch a partir de)
  qualquer instante dentro da janela de retenção do plano contratado. Isso cobre o
  cenário mais comum de emergência ("um deploy/migration ruim corrompeu dado às
  14:32, restaurar para 14:30").
- **Ação pendente, fora do escopo desta RM** (requer acesso ao painel Neon do projeto
  real, que este agente não tem): confirmar qual é a janela de retenção efetivamente
  contratada (varia por plano — pode ser tão curta quanto 24h nos planos de entrada)
  e decidir se essa janela é suficiente para o RPO (Recovery Point Objective) clínico
  aceitável deste sistema. Se não for, complementar com o backup lógico abaixo.
- **Backup lógico complementar recomendado** (independe do plano do Neon, cobre
  retenção mais longa e permite restaurar em QUALQUER Postgres, não só Neon):
  ```bash
  # Dump completo (schema + dados), rodar contra a produção com uma connection
  # string de leitura — nunca a partir de uma máquina de desenvolvedor sem
  # controle de acesso; preferir um job agendado com credenciais de serviço.
  pg_dump "$DATABASE_URL" --format=custom --file="backup-$(date +%Y%m%d).dump"

  # Restore (para um banco NOVO — nunca sobrescrever produção diretamente
  # sem antes validar o dump num ambiente isolado):
  pg_restore --dbname="$DATABASE_URL_DESTINO" --clean --if-exists backup-XXXXXXXX.dump
  ```
  Isso ainda não está automatizado (nenhum cron/job agendado existe hoje) — registrar
  como pendência explícita para uma RM futura de infraestrutura, não coberta por este
  repositório de aplicação.
- **Nunca testado neste projeto**: um restore real (nem do PITR do Neon, nem de um
  `pg_dump`) nunca foi exercitado de ponta a ponta. Um plano de backup nunca verificado
  por um restore real é, na prática, não confiável — recomendação: agendar um "restore
  drill" (restaurar para um banco de teste e validar integridade) antes de depender
  deste mecanismo numa emergência real.

## Connection Pooling (produção serverless)

**Gap de prontidão de produção fechado nesta seção**: `PrismaService`
(`src/prisma/prisma.service.ts`) cria seu próprio `pg.Pool` (via `@prisma/adapter-pg`)
dentro do processo Node — isso agrupa conexões DENTRO de uma única instância do
backend, mas não protege contra o Postgres ficar sem conexões disponíveis quando
MÚLTIPLAS instâncias/invocações rodam ao mesmo tempo (o caso normal em produção na
Vercel, que pode escalar o serviço backend horizontalmente).

- **Connection string atual** (`DATABASE_URL`, ver `.env.example`) deve ser, em
  produção, a **string de conexão pooled do Neon** (endpoint com `-pooler` no host,
  modo `transaction` do PgBouncer gerenciado pelo próprio Neon) — não a connection
  string direta ao Postgres. Isso deixa o Neon responsável por multiplexar muitas
  conexões lógicas de aplicação sobre um número pequeno de conexões físicas reais ao
  Postgres, que é o recurso finito.
- **Ação pendente, fora do escopo desta RM** (requer confirmar no painel Neon/nas
  variáveis de ambiente reais de produção, inacessíveis a este agente): verificar se
  `DATABASE_URL` de produção já aponta para o endpoint pooled ou para o direto. Se for
  o direto, trocar para o pooled é a mudança de maior impacto/menor risco disponível
  para este gap.
- **Migrations continuam precisando da connection direta** (não pooled) em alguns
  cenários — o modo `transaction` do PgBouncer não suporta certas operações de sessão
  que `prisma migrate deploy` pode exigir. Se a string pooled causar falha específica
  em `migrate deploy`, usar a string direta apenas para esse comando pontual (nunca
  para o tráfego normal da aplicação).

## Seed

```bash
npm run db:seed
```

- Cria **um único** usuário de demonstração (`dev-seed@prescreve.local`) + seu registro
  de médico associado — **nunca** paciente/consulta/prescrição/dado clínico real.
- **Idempotente**: rodar quantas vezes quiser nunca duplica nem sobrescreve.
- **Bloqueado em produção por padrão** — falha explicitamente se o ambiente resolver
  como `production` (ou desconhecido/ausente), a menos que
  `ALLOW_SEED_IN_PRODUCTION=true` seja definido conscientemente.

## Variáveis de ambiente relevantes

| Variável | Obrigatória | Efeito |
|---|---|---|
| `DATABASE_URL` | Sim | Connection string PostgreSQL. Validada no startup (`src/config/database-url.util.ts`) — app nunca sobe sem ela. |
| `APP_ENV` | Não (fallback: `NODE_ENV`, depois `'development'`) | Controla CORS, rate limiting e o bloqueio de seed em produção. Valor desconhecido é tratado como `'production'` (falha segura). |
| `ALLOW_SEED_IN_PRODUCTION` | Não | Só relevante para `npm run db:seed`; deve ser `"true"` literal para permitir rodar o seed quando `APP_ENV`/`NODE_ENV` resolve como produção. |
