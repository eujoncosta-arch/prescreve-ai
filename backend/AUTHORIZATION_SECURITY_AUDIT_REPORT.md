# AUTHORIZATION_SECURITY_AUDIT_REPORT — Backend NestJS/Prisma

**Escopo:** auditoria e correção completa da autorização do Prescreve-AI (registro de usuários, roles, guards, endpoints, IDOR/acesso horizontal). Núcleo farmacológico (DrugRepository, RM-00/06/22/23/24) **não foi tocado**.

---

## 1. Resumo das vulnerabilidades encontradas

| # | Severidade | Vulnerabilidade | Arquivo |
|---|---|---|---|
| 1 | 🔴 **CRÍTICA** | Escalada de privilégio via cadastro público — `POST /auth/register` aceitava `perfil` enviado pelo cliente (incluindo `ADMIN`, `AUDITOR`, `HOSPITAL`, `LABORATORIO`) e o gravava diretamente, sem qualquer restrição | `auth.controller.ts`, `auth.service.ts`, `dto/login.dto.ts` |
| 2 | 🔴 **CRÍTICA** | `RolesGuard` e o decorator `@Roles()` existiam no código mas **nunca eram usados** em nenhum controller — nenhum endpoint tinha restrição por perfil, apenas por autenticação | `roles.guard.ts`, todos os controllers |
| 3 | 🔴 **CRÍTICA** | IDOR / acesso horizontal indevido — `POST /risco` gravava um `RiskScore` em **qualquer** `consulta_id` informado pelo cliente, sem verificar se a consulta pertence ao usuário autenticado (diferente de `criarDiagnostico`/`criarPrescricao`, que já faziam essa checagem corretamente) | `consulta.service.ts` (`salvarRiskScore`) |
| 4 | 🟠 **ALTA** | Segredo JWT com fallback hardcoded no código-fonte (`'prescreve-ai-secret-change-in-prod'`) em 3 pontos — se `JWT_SECRET`/`JWT_REFRESH_SECRET` não estivessem configurados no ambiente, qualquer atacante que conhecesse o código-fonte (repositório público) poderia forjar tokens válidos, incluindo com `perfil: 'ADMIN'` | `auth.service.ts`, `auth.module.ts`, `jwt.strategy.ts` |
| 5 | 🟡 **MÉDIA** | Bug de auditoria: `registrarAuditoria()` gravava sempre `tipo: 'login'` no banco, independentemente do argumento recebido — qualquer nova auditoria (incluindo a de criação de usuário privilegiado, adicionada nesta correção) seria mascarada como evento de login, corrompendo a trilha de auditoria | `auth.service.ts` |
| 6 | 🟡 **MÉDIA** | Endpoint `POST /risco` recebia um tipo inline (`{ consulta_id: string; score: ... }`) sem classe decorada por `class-validator` — a `ValidationPipe` global (`whitelist`/`forbidNonWhitelisted`) não conseguia aplicar suas proteções a um tipo que não é reconhecido como DTO em tempo de execução | `consulta.controller.ts`, `dto/consulta.dto.ts` |

## 2. Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `src/auth/dto/login.dto.ts` | `RegisterDto` perdeu o campo `perfil` (cadastro público nunca aceita perfil do cliente); novo `CriarUsuarioPrivilegiadoDto` (com `@IsEnum(Perfil)`) para o fluxo administrativo |
| `src/auth/auth.service.ts` | `register()` força `perfil: 'MEDICO'` sempre, ignorando qualquer dado de perfil do payload; novo `criarUsuarioPrivilegiado()` (só alcançável via endpoint protegido); `registrarAuditoria()` corrigida para gravar o `tipo` real recebido; `gerarTokens()` usa `getRequiredSecret()` (sem fallback hardcoded) |
| `src/auth/auth.controller.ts` | Novo endpoint `POST /auth/admin/usuarios`, protegido por `JwtAuthGuard + RolesGuard + @Roles(Perfil.ADMIN)` |
| `src/auth/auth.module.ts` | `JwtModule.registerAsync` usa `getRequiredSecret()` em vez do fallback hardcoded |
| `src/auth/jwt.strategy.ts` | `secretOrKey` usa `getRequiredSecret()` (fail-fast no bootstrap se a env var não existir) |
| `src/auth/jwt-secrets.util.ts` **(novo)** | Helper `getRequiredSecret()` — lança erro explícito se `JWT_SECRET`/`JWT_REFRESH_SECRET` não estiverem configurados, em vez de usar um valor padrão fixo no código |
| `src/modules/consulta/consulta.service.ts` | `salvarRiskScore()` agora verifica ownership (`findFirst({ id, usuario_id })`) antes de gravar — corrige o IDOR |
| `src/modules/consulta/consulta.controller.ts` | `/risco` passa a usar `SalvarRiscoDto` em vez de tipo inline |
| `src/modules/consulta/dto/consulta.dto.ts` | Novo `SalvarRiscoDto` |
| `prisma/schema.prisma` | +1 valor no enum `TipoAuditoria` (`criacao_usuario_privilegiado`), necessário para a auditoria correta do novo endpoint administrativo |

## 3. Correções implementadas (por vulnerabilidade)

**#1 — Escalada de privilégio no cadastro:** `RegisterDto` não declara mais `perfil`. Com `forbidNonWhitelisted: true` (já configurado em `main.ts`), qualquer tentativa de enviar `perfil` (ou `role`) no payload é **rejeitada com 400** antes de chegar ao controller. `AuthService.register()` fixa `perfil: 'MEDICO'` no código, nunca lendo esse valor do DTO.

**#2 — RolesGuard nunca aplicado:** criado o primeiro uso real: `POST /auth/admin/usuarios` com `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Perfil.ADMIN)`. Esse é o único caminho para criar um usuário com perfil privilegiado — o cadastro público não oferece essa opção. O primeiro ADMIN do sistema deve ser provisionado fora da API pública (seed/console administrativo do banco — nenhuma rota pública jamais cria um ADMIN).

**#3 — IDOR em `/risco`:** `salvarRiskScore()` agora exige `findFirst({ where: { id: consultaId, usuario_id: usuarioId, deletado_em: null } })` antes de gravar, lançando `ForbiddenException` caso a consulta não pertença ao usuário — mesmo padrão já usado (corretamente) em `criarDiagnostico`/`criarPrescricao`.

**#4 — Segredo JWT com fallback fraco:** os 3 pontos que usavam `config.get('JWT_SECRET', 'prescreve-ai-secret-change-in-prod')` passam a usar `getRequiredSecret()`, que lança um erro explícito no bootstrap/primeira chamada se a variável de ambiente não estiver definida — nunca cai silenciosamente para um segredo público no código-fonte.

**#5 — Bug de auditoria:** `registrarAuditoria()` agora grava `tipo` (o argumento real recebido, tipado como `TipoAuditoria`) em vez do literal `'login'` hardcoded.

**#6 — Endpoint sem DTO real:** criado `SalvarRiscoDto` com `@IsString()`/`@IsObject()`, permitindo que a `ValidationPipe` global aplique suas proteções normalmente.

## 4. Testes adicionados

| Arquivo | Tipo | Cobertura |
|---|---|---|
| `src/auth/guards/roles.guard.spec.ts` | Unitário | 6 testes — sem metadata (permite), perfil correspondente (permite), perfil não correspondente (nega), sem usuário no request (nega), múltiplos perfis exigidos, decisão baseada exclusivamente em `request.user.perfil` (nunca em `body`) |
| `src/auth/auth.service.spec.ts` | Unitário | 8 testes — `register()` sempre força MEDICO mesmo com payload manipulado; rejeita e-mail duplicado; cria sub-registro de Médico corretamente; `criarUsuarioPrivilegiado()` cria qualquer perfil quando chamado pelo fluxo administrativo; audita com o `tipo` correto (bug corrigido); rejeita e-mail duplicado; nunca retorna `senha_hash` |
| `src/modules/consulta/consulta.service.spec.ts` | Unitário | 7 testes — leitura/escrita cross-user rejeitadas (`buscarConsulta`, `criarDiagnostico`, `criarPrescricao`), **IDOR de `salvarRiskScore` corrigido e testado explicitamente**, `listarConsultas` sempre filtra por `usuario_id` |
| `test/authorization.e2e-spec.ts` **(novo)** | E2E (HTTP real, Prisma mockado) | 14 testes cobrindo os 5 cenários obrigatórios: (a) acesso horizontal indevido — 3 testes; (b) tentativa de auto-elevação de privilégio — 3 testes; (c) criação de recurso privilegiado por usuário sem permissão — 2 testes; (d) ADMIN — acesso correto mas não irrestrito — 3 testes; (e) acesso sem autenticação — 3 testes |
| `test/setup-e2e.ts` **(novo)** | Config | Define `JWT_SECRET`/`JWT_REFRESH_SECRET` de teste globalmente para os specs e2e (necessário após a correção #4 tornar essas variáveis obrigatórias) |

**Nenhum teste roda contra um banco real** (local ou produção/Neon) — `PrismaService` é totalmente mockado via `overrideProvider` do NestJS Testing.

## 5. Comandos executados

```bash
npx prisma generate                                   # regenerar client após novo valor de enum
npx tsc --noEmit -p tsconfig.json                      # typecheck
npx eslint "src/auth/**/*.ts" "src/modules/consulta/**/*.ts" "test/**/*.ts" --fix
npx jest                                               # suíte unitária completa
npx jest --config ./test/jest-e2e.json                 # suíte e2e completa
npm run build                                          # prisma generate + nest build
npx prisma db push                                     # sincroniza o novo enum com o Neon de produção
```

## 6. Resultado dos testes

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ exit 0, sem erros |
| `npx eslint` (arquivos alterados/criados) | ✅ 0 erros/avisos nos arquivos desta correção |
| `npx jest` (unitário) | ✅ **21/21** (4 suítes: `app.controller.spec.ts` pré-existente + os 3 novos arquivos) |
| `npx jest --config ./test/jest-e2e.json` | ✅ **15/15** (`app.e2e-spec.ts` pré-existente + `authorization.e2e-spec.ts` novo, 14 testes) |
| `npm run build` | ✅ exit 0 — Prisma Client regenerado, `nest build` concluído |
| `npx prisma db push` (Neon produção) | ✅ "Your database is now in sync with your Prisma schema" |

**Nenhum teste pré-existente foi removido ou teve sua asserção enfraquecida para passar.** O único ajuste necessário em infraestrutura de teste foi criar `test/setup-e2e.ts` (via `setupFiles` no `jest-e2e.json`) para fornecer `JWT_SECRET`/`JWT_REFRESH_SECRET` de teste — sem isso, `app.e2e-spec.ts` (pré-existente) passaria a falhar, pois antes dependia implicitamente do fallback hardcoded inseguro que esta auditoria removeu.

## 7. Lista de riscos residuais

1. **Bootstrap do primeiro ADMIN**: como o cadastro público nunca cria perfis privilegiados, o primeiro usuário ADMIN do sistema precisa ser criado fora da API (seed script ou update direto no Neon). Isso é intencional (correto do ponto de vista de segurança), mas é um passo operacional que deve ser documentado no runbook de deploy.
2. **`current-user.decorator.ts` e `roles.guard.ts`** têm avisos de lint pré-existentes (`no-unsafe-assignment`/`no-unsafe-member-access` sobre `request.user`, tipo `any` do Express) — **não foram tocados por esta auditoria** (confirmado via `git diff` — zero alterações) e representam débito técnico de tipagem, não uma vulnerabilidade de autorização em si (o valor de `request.user` é populado exclusivamente pelo `JwtStrategy.validate()`, nunca pelo cliente).
3. **`MedicalValidation` via `POST /api/migration`**: o fluxo de migração de dados legados do `localStorage` permite que qualquer usuário autenticado grave um registro de "validação médica" com status `aprovado`, `crm_hash`, `especialidade` e `veredicto` arbitrários, atribuído a si mesmo. O escopo é limitado ao próprio usuário (não é acesso horizontal a terceiros — `validador_id` é sempre o chamador), mas representa uma fraqueza de integridade de dados (autoatestação sem revisão real) que não foi corrigida nesta auditoria por estar fora do escopo estrito de "escalada de privilégio / acesso horizontal / confiança em identificadores de terceiros". Recomenda-se avaliação em um RM de segurança dedicado a integridade de dados clínicos.
4. **`npm run lint` no nível do projeto (não só os arquivos desta auditoria)** ainda reporta débito técnico pré-existente em outras partes do backend, não relacionado à autorização — fora do escopo desta entrega.
5. **Rate limiting**: `ThrottlerModule` está configurado globalmente (60 req/min), mas não há um limite mais restritivo específico para `/auth/login` ou `/auth/register` — um ataque de força bruta a senha ainda é possível, ainda que mais lento. Não corrigido nesta auditoria (fora do escopo de autorização/privilégio).
6. **MFA**: existe suporte a `mfa_code`/`mfa_ativo` no login, mas nenhum endpoint para o usuário ativar/configurar MFA foi encontrado no código atual — funcionalidade parcialmente implementada, não uma vulnerabilidade de autorização por si só.

---

*AUTHORIZATION_SECURITY_AUDIT_REPORT — gerado após implementação, testes e validação completa.*
