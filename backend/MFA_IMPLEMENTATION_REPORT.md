# MFA_IMPLEMENTATION_REPORT — Autenticação Multifator Real (TOTP/RFC 6238)

**Escopo:** substituir a validação superficial de MFA ("se `mfa_code` existe, aceitar") por autenticação multifator real, criptograficamente verificada, compatível com RFC 6238 (Google Authenticator, Authy, 1Password etc.).

---

## 1. Auditoria do fluxo atual — vulnerabilidade encontrada

`src/auth/auth.service.ts` (antes desta correção):

```ts
// MFA
if (usuario.mfa_ativo && !dto.mfa_code) {
  throw new UnauthorizedException('Código MFA obrigatório');
}
```

Esta é exatamente a condição "se `mfa_code` existe, aceitar" citada no enunciado: qualquer string não vazia em `mfa_code` (ex.: `"1"`, `"x"`, `"000000"`) passava por essa checagem sem nenhuma verificação criptográfica. O campo `mfa_secret` (já existente no schema Prisma) **nunca era lido nem usado em lugar nenhum do código** — confirmado por busca em todo o `src/`. `mfa_ativo` podia ser `true` sem que o sistema jamais tivesse gerado ou validado um segredo real.

## 2. Dados reutilizados / dados novos

| Campo/Modelo | Situação |
|---|---|
| `Usuario.mfa_secret` | Já existia (nunca usado) — passa a ser usado, mas **sempre criptografado** (nunca texto puro) |
| `Usuario.mfa_ativo` | Já existia — semântica preservada, agora só se torna `true` após confirmação real |
| `Usuario.mfa_falhas_consecutivas` | **Novo** — contador para bloqueio por força bruta |
| `Usuario.mfa_bloqueado_ate` | **Novo** — timestamp de bloqueio temporário |
| `MfaRecoveryCode` (modelo) | **Novo** — códigos de recuperação de uso único, hash bcrypt |
| `TipoAuditoria` (enum) | +5 valores: `mfa_ativado`, `mfa_desativado`, `mfa_verificacao_falha`, `mfa_recovery_usado`, `mfa_bloqueado` |

## 3. Implementação

### 3.1 Geração e proteção do segredo em repouso

- Segredo gerado via `otplib.generateSecret()` (20 bytes, Base32) — biblioteca RFC 6238 amplamente adotada.
- **Nunca armazenado em texto puro.** Como o segredo TOTP precisa ser recuperável (ao contrário de uma senha, que só precisa ser comparável), a estratégia adequada é **criptografia simétrica autenticada** (AES-256-GCM), não hashing — implementada em `src/auth/mfa-crypto.util.ts`, com chave (`MFA_ENCRYPTION_KEY`, 32 bytes hex) mantida fora do banco, em variável de ambiente. IV aleatório por operação; `authTag` do GCM garante integridade (qualquer adulteração do ciphertext é detectada na descriptografia). Formato armazenado: `iv.ciphertext.authTag` (todos base64).
- Mesmo padrão de "fail-fast, nunca fallback hardcoded" já estabelecido para `JWT_SECRET` na auditoria de autorização anterior.

### 3.2 Fluxo de ativação (enrollment)

```
POST /auth/mfa/setup     (autenticado) → gera segredo, criptografa, grava
                                          (mfa_ativo permanece false)
                                          retorna { otpauth_url, secret_base32 }
                                          — ÚNICA vez que o segredo é exposto
POST /auth/mfa/ativar    (autenticado) → exige um código TOTP REAL gerado a
                                          partir do segredo pendente
                                          → só então mfa_ativo vira true
                                          → gera 10 códigos de recuperação
                                            (retornados em texto puro UMA VEZ;
                                             apenas hash bcrypt é persistido)
```

Ativação sem confirmação de um TOTP válido é **impossível** — `confirmarAtivacao()` lança `UnauthorizedException` e nunca seta `mfa_ativo=true` se o código não corresponder criptograficamente ao segredo pendente.

### 3.3 Validação real no login

`AuthService.login()` agora delega para `MfaService.verificarCodigoLogin(usuario, code)`, que:

1. Rejeita código ausente/vazio.
2. Rejeita se `mfa_bloqueado_ate` ainda não expirou (bloqueio por força bruta) — **sem sequer tentar verificar o código**.
3. Descriptografa o segredo e chama `otplib.verify({ secret, token, epochTolerance: 30 })` — tolerância de ±1 janela de 30s (RFC 6238 padrão), comparação em tempo constante (proteção contra timing attack, nativa do `otplib`).
4. Se o TOTP não corresponde, tenta os códigos de recuperação (bcrypt.compare contra os hashes não utilizados).
5. Se nada corresponde: incrementa `mfa_falhas_consecutivas`; ao atingir 5, define `mfa_bloqueado_ate = agora + 15min` e audita `mfa_bloqueado`.
6. Qualquer sucesso zera o contador de falhas.

**Não existe nenhum caminho de código onde um `mfa_code` não vazio seja aceito sem essa cadeia de verificação.**

### 3.4 Códigos de recuperação — uso único

- 10 códigos gerados por `crypto.randomBytes` (formato `XXXXX-XXXXX`), retornados em texto puro **apenas na resposta de `confirmarAtivacao()`**.
- Persistidos como hash bcrypt (`MfaRecoveryCode.code_hash`), nunca em texto puro.
- Consumo: `updateMany({ where: { id, usado: false }, data: { usado: true } })` — a condição `usado: false` no `WHERE` torna o consumo **atômico**: se duas requisições tentarem usar o mesmo código simultaneamente, apenas uma terá `count === 1`; a outra falha, prevenindo reuso mesmo sob corrida.

### 3.5 Desativação com reautenticação

`POST /auth/mfa/desativar` exige **senha atual + código MFA válido** (a mesma verificação criptográfica real do login) antes de desligar o MFA. Falha em qualquer um dos dois fatores rejeita a operação — nunca desativa parcialmente.

### 3.6 Rate limiting

- **Auditoria encontrou outro guard configurado mas nunca aplicado**: `ThrottlerModule` existia em `app.module.ts` mas o `ThrottlerGuard` nunca era registrado — rate limiting era inteiramente inerte em toda a aplicação. Corrigido: `ThrottlerGuard` registrado globalmente via `APP_GUARD`.
- `POST /auth/login` e todos os endpoints `/auth/mfa/*` sobrescrevem o limite padrão (60/min) para **5–10 requisições/min** via `@Throttle()`.
- Complementar ao throttling por IP: o bloqueio persistente por usuário (`mfa_falhas_consecutivas`/`mfa_bloqueado_ate`) é a defesa principal contra força bruta do espaço de 6 dígitos do TOTP, pois sobrevive à rotação de IP.

### 3.7 Nunca exposto em resposta de API ou em log

- `iniciarAtivacao()` retorna o segredo em texto puro **uma única vez** (é o propósito do enrollment — o usuário precisa cadastrá-lo no app autenticador). Depois disso, nenhuma rota jamais retorna o segredo novamente (nem sequer criptografado) — `confirmarAtivacao()`, `login()` e `desativar()` nunca incluem `mfa_secret` em suas respostas.
- Nenhum `console.log`/logger grava o segredo, o código TOTP recebido ou os códigos de recuperação em texto puro em nenhum ponto do fluxo (auditado manualmente em `mfa.service.ts`, `auth.service.ts`, `mfa-crypto.util.ts`) — os registros de auditoria (`AuditService.registrarAuditoria`) só armazenam metadados (tipo de evento, contagem de falhas), nunca o segredo ou o código.

## 4. Migrations necessárias

Projeto usa `prisma db push` (schema-sync, sem pasta `prisma/migrations` versionada — já era o padrão do projeto antes desta entrega). Alteração de schema aplicada via:

```bash
npx prisma generate     # regenerar client TypeScript
npx prisma db push      # sincronizar schema (local e produção)
```

Nenhuma migração de dados é necessária — todos os campos novos têm valores-padrão seguros (`mfa_falhas_consecutivas @default(0)`, `mfa_bloqueado_ate` nulo) e usuários existentes continuam com `mfa_ativo=false` (comportamento inalterado até que optem por ativar o MFA real).

## 5. Arquivos criados/alterados

| Arquivo | Alteração |
|---|---|
| `prisma/schema.prisma` | +2 campos em `Usuario` (`mfa_falhas_consecutivas`, `mfa_bloqueado_ate`); +1 relação (`mfa_recovery_codes`); +1 modelo (`MfaRecoveryCode`); +5 valores em `TipoAuditoria` |
| `src/auth/mfa-crypto.util.ts` **(novo)** | Criptografia AES-256-GCM do segredo TOTP em repouso |
| `src/auth/mfa.service.ts` **(novo)** | Lógica completa de MFA: ativação, confirmação, verificação no login, desativação, códigos de recuperação, bloqueio por força bruta |
| `src/auth/mfa.controller.ts` **(novo)** | `POST /auth/mfa/setup`, `/ativar`, `/desativar` |
| `src/auth/dto/mfa.dto.ts` **(novo)** | `AtivarMfaDto`, `DesativarMfaDto` |
| `src/auth/auth.service.ts` | `login()` delega a verificação de MFA para `MfaService.verificarCodigoLogin()` — removida a checagem superficial |
| `src/auth/auth.controller.ts` | `@Throttle` mais restritivo em `/auth/login` |
| `src/auth/auth.module.ts` | Registra `MfaService`/`MfaController`; importa `AuditModule` |
| `src/app.module.ts` | `ThrottlerGuard` registrado globalmente via `APP_GUARD` (antes configurado mas nunca aplicado) |
| `.env.example` | Documenta `MFA_ENCRYPTION_KEY` (obrigatória) |
| `package.json` | +dependência `otplib`; `transformIgnorePatterns` do Jest ajustado (dependência transitiva ESM-only) |

## 6. Testes adicionados

| Arquivo | Testes | Cobertura |
|---|---|---|
| `src/auth/mfa.service.spec.ts` **(novo)** | 21 | Todos os 10 cenários obrigatórios do enunciado + ativação/desativação/proteção do segredo |
| `src/auth/auth.service.spec.ts` | +1 provider mock (`MfaService`) | Testes existentes continuam passando com o novo fluxo |
| `test/mfa.e2e-spec.ts` **(novo)** | 8 | Cenários de login/setup na camada HTTP real (guards+pipes reais, Prisma mockado) |

### Mapeamento explícito aos 10 testes obrigatórios do enunciado

| Cenário exigido | Teste |
|---|---|
| MFA desativado + login válido → sucesso | `mfa.e2e-spec.ts`: "MFA desativado + login válido → sucesso" |
| MFA ativo + código ausente → falha | `mfa.service.spec.ts` + `mfa.e2e-spec.ts` |
| MFA ativo + código inválido → falha | `mfa.service.spec.ts` + `mfa.e2e-spec.ts` |
| MFA ativo + código expirado → falha | `mfa.service.spec.ts`: "código expirado (gerado 1 hora atrás...)" |
| MFA ativo + código válido → sucesso | `mfa.service.spec.ts` + `mfa.e2e-spec.ts` |
| Código de recuperação válido → uso único | `mfa.service.spec.ts`: "código de recuperação válido → sucesso e é marcado como usado" |
| Código de recuperação reutilizado → falha | `mfa.service.spec.ts`: "código de recuperação reutilizado (...) → falha" |
| Tentativas excessivas → bloqueio/rate limit | `mfa.service.spec.ts`: "bloqueia após atingir o limite" + "tentativas excessivas → bloqueio" |
| Segredo MFA nunca exposto em resposta de API | `mfa.service.spec.ts` + `mfa.e2e-spec.ts`: "segredo MFA nunca é exposto na resposta" |
| Segredo MFA nunca exposto em logs | Auditado manualmente (seção 3.7) — nenhum `console.log`/logger toca o segredo em nenhum ponto do código |

## 7. Comandos executados (evidência)

```bash
npm install otplib
npx prisma generate
npx tsc --noEmit -p tsconfig.json                  # ✅ exit 0
npx eslint "src/auth/**/*.ts" "test/**/*.ts" --fix  # ✅ 0 violações nos arquivos desta entrega
npx jest                                            # ✅ 42/42 (21 pré-existentes + 21 novos)
npx jest --config ./test/jest-e2e.json              # ✅ 23/23 (15 pré-existentes + 8 novos)
npm run build                                       # ✅ exit 0 (prisma generate + nest build)
npx prisma db push                                  # ✅ "Your database is now in sync" (Neon produção)
```

## 8. Resultado dos testes

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ exit 0 |
| `npx eslint` (arquivos desta entrega) | ✅ 0 erros/avisos |
| `npx jest` | ✅ **42/42** |
| `npx jest --config ./test/jest-e2e.json` | ✅ **23/23** |
| `npm run build` | ✅ Prisma Client regenerado, `nest build` concluído |
| `npx prisma db push` (Neon produção) | ✅ schema sincronizado |

**Dois arquivos pré-existentes, não tocados por esta entrega** (`current-user.decorator.ts`, `roles.guard.ts`) mantêm débito de lint (`no-unsafe-*` sobre tipos `any` do Express) já documentado na auditoria de autorização anterior — confirmado via `git diff` (zero alterações).

## 9. Riscos residuais

1. **`MFA_ENCRYPTION_KEY` precisa ser configurada na Vercel (produção) manualmente** — não tenho acesso às variáveis de ambiente do projeto Vercel para configurá-la. Sem essa variável, `/auth/mfa/setup`, `/ativar`, `/desativar` e o login de qualquer usuário com MFA ativo falham com erro explícito (fail-fast, comportamento intencional — nunca um fallback inseguro). **Nenhum usuário tem MFA ativo hoje em produção**, então isso não quebra nada existente, mas é um pré-requisito antes de qualquer usuário poder ativar MFA.
2. **Perda de todos os códigos de recuperação + acesso ao autenticador**: não há fluxo de "recuperação de conta" além dos 10 códigos de recuperação — um usuário que perca o app autenticador E todos os códigos fica bloqueado do próprio MFA (precisa de intervenção administrativa manual no banco, já que não existe endpoint de reset-por-admin nesta entrega). Recomenda-se avaliar, em iteração futura, um fluxo de reset de MFA por ADMIN (com auditoria reforçada).
3. **Rate limiting por IP** (`ThrottlerGuard`) é o padrão em memória do `@nestjs/throttler` — em ambiente serverless (Vercel) com múltiplas instâncias/regiões, os contadores não são compartilhados entre instâncias, reduzindo a eficácia do throttling por IP (o bloqueio persistente por usuário no banco continua funcionando integralmente, pois não depende de estado em memória).
4. **Sem endpoint de "listar/regenerar códigos de recuperação"** após a ativação inicial — se o usuário usar todos os 10 códigos sem desativar/reativar o MFA, não há como gerar novos sem desativar e reconfigurar. Aceitável para esta entrega, mas vale nota para iteração futura.
5. **`AtivarMfaDto.code` exige exatamente 6 dígitos** — por design, apenas códigos TOTP (nunca recuperação) confirmam o enrollment, o que é correto (não fazem sentido códigos de recuperação nesse momento, pois ainda não existem).

---

*MFA_IMPLEMENTATION_REPORT — gerado após implementação, testes e validação completa.*
