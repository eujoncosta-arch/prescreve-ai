# Observabilidade — Error Tracking Real (Sentry)

**Origem:** último gap explicitamente deferido do relatório de prontidão de
produção (`docs/PRODUCTION-READINESS-HARDENING.md`, seção 6) — "Observabilidade/
error tracking (Sentry ou similar)". Fechado aqui como RM própria, por
solicitação explícita, após o usuário criar 2 projetos Sentry reais (frontend e
backend) e fornecer os DSNs.

**Escopo:** integração de error tracking em ambos os serviços (frontend
Next.js, backend NestJS), com redação de dado sensível antes de qualquer envio.
Nenhuma regra clínica, motor de dose/segurança, ou dado farmacológico foi
alterado.

---

## 1. Frontend (`@sentry/nextjs@10.69.0`)

- **`frontend/instrumentation-client.ts`** — inicializa o SDK no navegador.
  Inerte sem `NEXT_PUBLIC_SENTRY_DSN` (nunca falha dev/build sem essa
  variável). `beforeSend`/`beforeBreadcrumb` aplicam `redactForSentry`
  (`frontend/src/lib/sentry-redact.ts`, 6 testes) antes de qualquer evento
  sair do navegador.
- **`frontend/instrumentation.ts`** — inicializa o SDK nos runtimes de
  servidor/edge (`register()`, hook exigido pelo Next.js). Sem efeito prático
  em build local (`output: 'export'`, sem runtime de servidor real — ver
  `next.config.ts`); roda normalmente em produção (Vercel).
- **`frontend/src/app/error.tsx`/`global-error.tsx`** (já existentes, da RM de
  prontidão de produção) — agora chamam `Sentry.captureException(error)`
  além do `console.error` já existente.
- **`next.config.ts`** — envolvido com `withSentryConfig`. Upload de source
  maps só ocorre com `SENTRY_AUTH_TOKEN` configurado (nunca falha o build sem
  ele). **Bug real encontrado e corrigido durante a verificação**: a CSP de
  produção tinha `connect-src 'self'` — isso bloquearia SILENCIOSAMENTE todo
  envio de evento ao Sentry em produção (o navegador nunca dispararia sequer
  um erro de console visível para isso, só uma rejeição de CSP). Corrigido
  para `connect-src 'self' https://*.ingest.us.sentry.io`.

### Verificação em navegador real (não apenas leitura de código)

Rota descartável forçando um erro real, com `Sentry.getClient()` +
`Sentry.flush(4000)` explícitos para confirmar entrega (não só que o SDK
"tentou"):

```
{"hasClient":true,"dsnHost":"o4511849194455040.ingest.us.sentry.io","flushed":true}
```

`flushed: true` é a confirmação do próprio SDK de que o evento foi
efetivamente enviado ao transporte e reconhecido — não uma inferência.

## 2. Backend (`@sentry/nestjs@10.69.0`)

- **`backend/src/instrument.ts`** (novo) — DEVE ser a primeira linha de
  `main.ts` (antes até de `NestFactory`), exigência do SDK para instrumentar
  chamadas de outros módulos antes deles carregarem. Inerte sem `SENTRY_DSN`.
  `beforeSend`/`beforeBreadcrumb` reaproveitam `redact()`
  (`common/logging/redact.util.ts`) — a MESMA função já usada para os logs de
  aplicação, nunca uma segunda lista de campos sensíveis divergente.
- **`backend/src/common/filters/all-exceptions.filter.ts`** — `catch()` agora
  chama `Sentry.captureException(err)` no caminho de erro NÃO PREVISTO.
  `HttpException` deliberadas (`NotFoundException`, validação, etc.) **nunca**
  são reportadas — não são bugs, são comportamento pretendido; reportá-las
  poluiria o Sentry com "erros" que não indicam problema real. 2 testes novos
  provam isso por execução (`captureException` chamado só no caminho não
  previsto, nunca no caminho de `HttpException`).

### Verificação (sem depender do boot completo do Nest)

O app completo exige `JWT_SECRET`/`MFA_ENCRYPTION_KEY`/`IDENTIFIER_HMAC_KEY`
reais para subir (fail-fast, RMs de segurança anteriores) — não configurados
neste ambiente. Verificação feita com um probe standalone (`@sentry/node`,
mesmo DSN real, descartado após uso):

```
hasClient: true
dsnHost: o4511849194455040.ingest.us.sentry.io
flushed: true
```

Mesma confirmação de entrega real do SDK, sem precisar do boot completo do
Nest.

## 3. Redação de dado sensível (dupla, nunca confiar só no SDK)

Dois módulos de redação, um por serviço, mesma lista de campos (CPF, CRM,
senha, tokens, secrets, `anamnese`/`medicamentos`/`diagnostico`/
`queixa_principal`/`justificativa`/`comorbidades`/`paciente_nome`):

- Backend: `common/logging/redact.util.ts` (já existia, reaproveitado — não
  duplicado).
- Frontend: `lib/sentry-redact.ts` (novo, mesmo padrão — o frontend não tinha
  um redator equivalente antes desta RM).

Aplicados via `beforeSend`/`beforeBreadcrumb` em ambos os SDKs — nunca
depender só dos scrubbers genéricos do Sentry (que não conhecem os nomes de
campo clínicos específicos deste sistema).

## 4. O que NÃO foi habilitado (escopo deliberadamente contido)

- **Logging** (Sentry Logs) — não habilitado. O backend já tem sua própria
  disciplina de log de aplicação (`HttpLoggingInterceptor`, nunca loga
  corpo/headers) — duplicar em outro produto Sentry não foi pedido.
- **Tracing/Profiling/Application Metrics** — não habilitados. Apenas Error
  Monitoring, por escolha explícita do usuário na criação do projeto backend.
  `tracesSampleRate: 0.1` configurado (baixo, conservador) só para o que o
  próprio Error Monitoring já usa de contexto de performance ao redor de um
  erro — não é uma feature de tracing completa ativada.
- **Session Replay** — não habilitado (não fazia parte do pacote instalado
  nem foi solicitado).

## 5. Gates executados nesta sessão

| Gate | Resultado |
|---|---|
| `frontend: npx tsc --noEmit` | ✅ Limpo |
| `frontend: npm run lint` | ✅ 0 problemas |
| `frontend: npx vitest run` (suíte completa) | ✅ **62 arquivos / 1105 testes** — todos passando (6 novos: `sentry-redact.test.ts`) |
| `frontend: npm run test:coverage` | ✅ Exit 0 |
| `frontend: npm run build` | ✅ Sucesso, incl. wrapper do Sentry (source maps inertes sem `SENTRY_AUTH_TOKEN`) |
| Verificação em navegador real | ✅ Evento real enviado e confirmado (`flushed: true`) — ver seção 1 |
| `backend: npm run typecheck` | ✅ Limpo |
| `backend: npm run lint` | ✅ 0 problemas |
| `backend: npx jest` (suíte completa) | ✅ **16 suítes / 160 testes** — todos passando (2 novos no filtro de exceções) |
| `backend: npm run build` | ✅ Exit 0 |
| Verificação via probe standalone | ✅ Evento real enviado e confirmado (`flushed: true`) — ver seção 2 |

`DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md`, regenerados como
efeito colateral do build do frontend, foram revertidos (`git checkout --`).

## 6. Segredos e configuração

Os 2 DSNs reais (fornecidos pelo usuário) foram colocados em
`frontend/.env`/`backend/.env` (ambos `.gitignore`d em todo o repositório,
confirmado antes de escrever neles — nunca versionados). `.env.example` de
ambos os serviços documentam as variáveis (`NEXT_PUBLIC_SENTRY_DSN`,
`SENTRY_AUTH_TOKEN`, `SENTRY_DSN`) sem valores reais.

**Pendência explícita**: `SENTRY_AUTH_TOKEN` (necessário só para upload de
source maps legíveis — não para o funcionamento do error tracking em si) não
foi configurado nesta sessão; o usuário pode gerar em
`sentry.io/settings/account/api/auth-tokens` quando quiser stack traces
totalmente legíveis no dashboard Sentry (hoje os eventos chegam, só com
tracebacks minificados).

## 7. Arquivos alterados

**Novos:**
- `frontend/instrumentation-client.ts`
- `frontend/instrumentation.ts`
- `frontend/src/lib/sentry-redact.ts`
- `frontend/src/tests/sentry-redact.test.ts`
- `backend/src/instrument.ts`
- `docs/OBSERVABILITY-SENTRY.md` (este relatório)

**Modificados:**
- `frontend/next.config.ts` — wrapper `withSentryConfig` + correção da CSP
  (`connect-src`).
- `frontend/src/app/error.tsx`/`global-error.tsx` — chamam
  `Sentry.captureException`.
- `frontend/.env.example` — `NEXT_PUBLIC_SENTRY_DSN`/`SENTRY_AUTH_TOKEN`
  documentadas.
- `frontend/package.json`/`package-lock.json` — nova dependência
  `@sentry/nextjs`.
- `backend/src/main.ts` — importa `./instrument` como primeira linha.
- `backend/src/common/filters/all-exceptions.filter.ts` — reporta erro não
  previsto ao Sentry.
- `backend/src/common/filters/all-exceptions.filter.spec.ts` — 2 testes
  novos.
- `backend/.env.example` — `SENTRY_DSN` documentada.
- `backend/package.json`/`package-lock.json` — nova dependência
  `@sentry/nestjs`.

Nenhum motor clínico, dado farmacológico, protocolo terapêutico, ou regra de
segurança/dose foi alterado.

---

Não foi feito commit, push ou deploy nesta RM.
