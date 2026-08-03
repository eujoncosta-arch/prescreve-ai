# Prontidão de Produção — Fechamento de 4 Gaps Pontuais

**Origem:** último item do roadmap pós-consolidação (RM-62/63/64), "prontidão de
produção". Investigação prévia confirmou que RM-54 já auditou e liberou o sistema
(🟢, 8,7/10) — este não era um item em aberto, e sim uma lista de gaps pontuais que
RM-54 não cobriu. Escopo decidido com o usuário: fechar 4 gaps concretos e
independentes (todos selecionados): error boundaries no frontend, filtro global de
exceções no backend, health check real, e documentação de backup/restore/pooling.

**Escopo:** código + documentação, sem alterar nenhuma regra clínica, motor de
dose/segurança, ou dado farmacológico.

---

## 1. Error boundaries (frontend) — gap: nenhuma tela de erro existia

**Antes:** zero `error.tsx`/`global-error.tsx` em todo o App Router — um erro de
render não tratado em qualquer rota resultava em página em branco, sem fallback.

**Depois:**
- `frontend/src/app/error.tsx` — cobre erros dentro do layout raiz (o caso comum).
  Botões "Tentar novamente" (`reset()`) e "Ir para o início" (`Link` real, respeita
  o `basePath` `/prescreve-ai` da configuração do projeto). Nunca expõe dado clínico
  (o boundary não tem acesso a nenhum estado de anamnese/consulta) — só loga
  `error.message`/`digest` no console do navegador.
- `frontend/src/app/global-error.tsx` — cobre o caso mais raro (erro no próprio
  layout raiz, ex.: falha em `ThemeProvider`/`AppProvider`). Precisa renderizar seu
  próprio `<html>`/`<body>` (substitui o layout inteiro) — por isso usa estilo
  inline em vez de depender de Tailwind/providers da árvore normal.

**Verificado em navegador real** (não apenas por leitura de código): criada uma rota
descartável (`error-boundary-smoke-test/page.tsx`) que lança um erro
incondicionalmente; confirmado via `get_page_text` que `error.tsx` renderiza
("Algo deu errado" + botões); clicado em "Ir para o início" e confirmado que navega
corretamente para o dashboard real. Rota descartável removida após a verificação.

## 2. Filtro global de exceções (backend) — gap: formato de erro não controlado

**Antes:** nenhum `ExceptionFilter` global existia — erros inesperados (bug de
programação, erro de driver não tratado localmente) caíam no tratamento padrão do
Nest, cujo conteúdo/formato não é controlado explicitamente pela aplicação.

**Depois:** `backend/src/common/filters/all-exceptions.filter.ts`
(`AllExceptionsFilter`, registrado globalmente em `main.ts` via
`app.useGlobalFilters`):
- `HttpException` (e subclasses — `NotFoundException`, `ForbiddenException`, erros
  do `ValidationPipe`) passam adiante **inalteradas** — são exceções deliberadas já
  com mensagem pensada para o cliente.
- Qualquer OUTRA exceção (não prevista) vira sempre um 500 com mensagem **genérica**
  — nunca expõe `.message`/stack trace do erro real ao cliente. O detalhe completo é
  logado apenas server-side (`Logger.error`), nunca na resposta HTTP.
- 6 testes novos (`all-exceptions.filter.spec.ts`) provam, por execução real: status
  preservado para `HttpException`; mensagem genérica e sanitizada para erro não
  previsto (nunca contém o texto do erro real); log server-side sempre ocorre (o
  detalhe não desaparece, só não vaza); sobrevive a um valor lançado que não é
  `Error` (string solta); corpo sempre inclui `path`/`timestamp` rastreáveis.

## 3. Health check real (backend) — gap: `/health` nunca checava o banco

**Antes:** `GET /health` sempre respondia `{status: 'ok'}` estático, mesmo com o
Postgres totalmente inacessível.

**Depois:**
- `GET /health` mantido como está — liveness pura, deliberadamente sem dependência
  externa (nunca falha por causa do banco; usada por orquestradores para decidir se
  o processo precisa reiniciar).
- `GET /health/ready` (novo) — executa `SELECT 1` real via Prisma. Se o Postgres
  responde, `200 {status: 'ok', database: 'up'}`. Se falha, `503` com
  `{status: 'error', database: 'down'}` — **nunca propaga o erro real do driver**
  (endereço, porta, usuário) na resposta.
- 3 testes novos em `app.controller.spec.ts` (Prisma mockado): confirmam que
  `/health` nunca chama o Prisma; que `/health/ready` retorna `up`/200 quando o
  `SELECT 1` resolve; e que retorna `503` sanitizado (sem `ECONNREFUSED`/usuário do
  banco no corpo) quando o `SELECT 1` rejeita.

## 4. Backup/restore + connection pooling (documentação) — gap: nenhum registro existia

**Antes:** nenhuma menção no repositório a como restaurar o banco de produção em
caso de perda de dado, nem orientação sobre pooling de conexões para o ambiente
serverless (Vercel) de produção.

**Depois:** duas novas seções em `backend/README-DATABASE.md` (o documento já
existente de operação de banco, RM-37):
- **Backup e Restore**: descreve o mecanismo nativo de PITR do Neon já disponível na
  infraestrutura, mais um fluxo de `pg_dump`/`pg_restore` complementar (com os
  comandos reais). Documenta explicitamente 2 pendências que exigem acesso ao painel
  Neon real (fora do alcance deste agente): confirmar a janela de retenção
  efetivamente contratada, e que **nenhum restore real foi testado** até hoje — uma
  recomendação de "restore drill" antes de depender disso numa emergência real.
- **Connection Pooling**: explica por que o `pg.Pool` interno do
  `PrismaService` não é suficiente sozinho num ambiente serverless com múltiplas
  instâncias (Vercel), recomenda o uso da connection string **pooled** do Neon
  (`-pooler`, modo `transaction`) em produção, e documenta a ressalva de que
  `migrate deploy` pode exigir a connection direta (não pooled) em alguns casos.
  Também documentado como pendência explícita (verificar qual string está
  configurada hoje em produção — fora do alcance deste agente).

## 5. Gates executados nesta sessão

| Gate | Resultado |
|---|---|
| `backend: npm run typecheck` | ✅ Limpo |
| `backend: npm run lint` | ✅ 0 problemas |
| `backend: npx jest` (suíte completa) | ✅ **16 suítes / 158 testes** — todos passando (9 novos desta RM: 6 do filtro + 3 do health check; os 149 pré-existentes continuam verdes) |
| `backend: npm run build` | ✅ Exit 0 |
| `frontend: npx tsc --noEmit` | ✅ Limpo |
| `frontend: npm run lint` | ✅ 0 problemas |
| `frontend: npx vitest run` (suíte completa) | ✅ **61 arquivos / 1099 testes** — todos passando (inalterado; error boundaries do Next.js não têm harness de teste automatizado no projeto, verificados em navegador real — ver seção 1) |
| `frontend: npm run test:coverage` | ✅ Exit 0 |
| `frontend: npm run build` | ✅ Sucesso — todas as 50 rotas geradas |
| Verificação em navegador real | ✅ `error.tsx` renderiza corretamente e o botão "Ir para o início" navega — ver seção 1 |

`DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md`, regenerados como efeito
colateral do build do frontend, foram revertidos (`git checkout --`).

## 6. Limitações e pendências explícitas (não fechadas por esta RM)

- **Observabilidade/error tracking** (Sentry ou similar) — identificado na fase de
  scoping como gap real, mas deliberadamente fora do escopo escolhido (exigiria nova
  dependência + cadastro em serviço externo). Registrado como candidato a uma RM
  futura, não perdido.
- **Backup/restore e connection pooling** foram **documentados**, não
  **automatizados/verificados contra produção real** — ambos dependem de acesso ao
  painel Neon do projeto real, que este agente não tem. As pendências explícitas
  estão registradas em `backend/README-DATABASE.md`.
- Nenhum teste automatizado cobre `error.tsx`/`global-error.tsx` — o projeto não tem
  harness de renderização de Server/Client Components completos do Next.js; a
  verificação foi feita em navegador real (dev server), documentada na seção 1, não
  por um teste que rode em CI.

## 7. Arquivos alterados

**Novos:**
- `frontend/src/app/error.tsx`
- `frontend/src/app/global-error.tsx`
- `backend/src/common/filters/all-exceptions.filter.ts`
- `backend/src/common/filters/all-exceptions.filter.spec.ts`
- `docs/PRODUCTION-READINESS-HARDENING.md` (este relatório)

**Modificados:**
- `backend/src/main.ts` — registra `AllExceptionsFilter` globalmente.
- `backend/src/app.controller.ts` — novo endpoint `GET /health/ready`.
- `backend/src/app.controller.spec.ts` — 3 testes novos para `/health`/`/health/ready`.
- `backend/README-DATABASE.md` — 2 novas seções (Backup e Restore; Connection Pooling).

Nenhum motor clínico, dado farmacológico, protocolo terapêutico, ou regra de
segurança/dose foi alterado.

---

Não foi feito commit, push ou deploy nesta RM.
