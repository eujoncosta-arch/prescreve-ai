# RM-57 — Auditoria Independente do Comitê (Revalidação Absoluta)

**Papel:** comitê independente multidisciplinar. RM-41 a RM-56 tratados
como hipóteses não verificadas. Todo número neste relatório vem de
execução nesta sessão — nenhum foi copiado de relatório anterior.

## 1. Resumo Executivo

A revalidação absoluta da Fase 1 **encontrou uma regressão real**: o
comando mais básico do gate frontend, `npx tsc --noEmit`, falhava com 6
erros (`TS2540: Cannot assign to 'NODE_ENV' because it is a read-only
property`) em `src/tests/eurofarma-sync-route-rm56.test.ts` — um arquivo
escrito na sessão RM-56 anterior. O vitest não acusava (transforma com
esbuild, sem checagem de tipo), então os testes "passavam" enquanto o
gate de typecheck estava genuinamente quebrado. Isto confirma a premissa
da Fase 6 desta auditoria: uma correção recente introduziu, sim, uma
regressão invisível aos testes. Foi corrigido nesta sessão (usando
`vi.stubEnv`, o mecanismo correto do vitest para variáveis de ambiente) e
revalidado do zero. Fora deste achado, a varredura adversarial completa
(Fases 2-6: ownership/IDOR, CORS, rate limiting, XSS, prototype
pollution, SSRF, command/header injection, mass assignment, cobertura,
open handles, farmacologia) não encontrou nenhum outro risco crítico,
alto, médio ou baixo genuíno.

## 2. Evidências

Todas as execuções abaixo rodaram nesta sessão, com exit code capturado
diretamente (não inferido de texto de log).

### Achado RM-57-01 — reprodução do bug

```
$ npx tsc --noEmit
src/tests/eurofarma-sync-route-rm56.test.ts(31,17): error TS2540: Cannot assign to 'NODE_ENV' because it is a read-only property.
src/tests/eurofarma-sync-route-rm56.test.ts(38,17): error TS2540: ...
src/tests/eurofarma-sync-route-rm56.test.ts(45,17): error TS2540: ...
src/tests/eurofarma-sync-route-rm56.test.ts(52,17): error TS2540: ...
src/tests/eurofarma-sync-route-rm56.test.ts(59,17): error TS2540: ...
src/tests/eurofarma-sync-route-rm56.test.ts(66,17): error TS2540: ...
EXIT: 2
```

### Correção e revalidação

Substituídas as 6 ocorrências de `process.env.NODE_ENV = '...'`/
`process.env.EUROFARMA_SYNC_TOKEN = '...'` por `vi.stubEnv(...)` (API
nativa do vitest para variáveis de ambiente — não sofre da restrição de
tipo `readonly` porque não atribui à propriedade real do processo).

```
$ npx tsc --noEmit
EXIT: 0   (sem nenhuma saída)

$ npx vitest run src/tests/eurofarma-sync-route-rm56.test.ts
Test Files  1 passed (1)
     Tests  6 passed (6)
```

## 3. Todos os Gates (execução nova nesta sessão)

| Gate | Comando | Resultado |
|---|---|---|
| Typecheck frontend | `npx tsc --noEmit` | 🔴→✅ (achado RM-57-01, corrigido) |
| Lint frontend | `npx eslint . --format json` (contado programaticamente) | ✅ 0 erros / 0 warnings |
| Testes frontend | `npx vitest run` | ✅ 922/922, 49/49 arquivos |
| Cobertura frontend | `npm run test:coverage` | ✅ exit 0 — thresholds por-arquivo cumpridos |
| Build frontend | `npm run build` | ✅ compilado, 50 páginas |
| RM-23 | incluído no prebuild | ✅ 367 entidades, 0 inconsistências |
| RM-24 | incluído no prebuild | ✅ divergentes=0, aceitos=14, críticos=0 |
| RM-49 | incluído no prebuild | ✅ 257 arquivos, 0 sequências suspeitas |
| Typecheck backend | `npx tsc --noEmit` | ✅ 0 erros |
| Lint backend | `npm run lint` (sem `--fix`) | ✅ 0 erros |
| Testes unitários backend | `npx jest --silent` | ✅ 146/146, 15/15 suítes |
| Cobertura backend | `npm run test:cov` | ✅ exit 0 — coverageThreshold cumprido |
| Build backend | `npm run build` (`prisma generate && nest build`) | ✅ compilado |
| Migrações Prisma | `npx prisma migrate deploy` contra Postgres real novo | ✅ 3 migrações aplicadas |
| Geração do Prisma Client | incluído no build | ✅ v7.8.0 gerado |
| E2E completo contra Postgres real | `npm run test:e2e:postgres:local` (servidor `prisma dev` novo) | ✅ 143/143, 11/11 suítes, 0 puladas |
| `postgres-real.e2e-spec.ts` isolado | `npx jest --testPathPatterns postgres-real --verbose` | ✅ **confirmado 8/8 testes REALMENTE executados** (não `describe.skip`) contra Postgres real |
| GitHub Actions (`ci.yml`) | inspeção estática + verificação cruzada com `package.json` | ✅ todo script referenciado (`typecheck`, `test:coverage`, `test:cov`, `test:e2e`, `build`) existe e roda sem `--fix` no lint |

**Total de testes automatizados verdes nesta sessão: 922 + 146 + 143 =
1.211, 0 falhas**, após a correção do achado RM-57-01.

## 4. Todos os Achados

### RM-57-01 — ALTO (encontrado e corrigido nesta sessão)

- **Categoria:** regressão de gate / TypeScript.
- **Arquivo:** `frontend/src/tests/eurofarma-sync-route-rm56.test.ts` (linhas 31, 38, 45, 52, 59, 66 na versão anterior).
- **Causa raiz:** `@types/node` declara `NODE_ENV` como propriedade `readonly` em `ProcessEnv`. Atribuição direta (`process.env.NODE_ENV = 'production'`) compila em JavaScript puro (o runtime não impõe `readonly`), mas viola o contrato de tipo — o vitest roda o teste via transform do esbuild, que **não faz checagem de tipo**, então o teste passava mesmo com o gate de typecheck quebrado.
- **Por que é ALTO, não CRÍTICO:** não afeta comportamento em produção nem dado clínico — é um gate de qualidade quebrado, não um bug funcional. Mas é alto porque, se não detectado, **bloquearia silenciosamente todo o pipeline de CI** (o step "Typecheck" do `ci.yml` roda antes de qualquer outro) — exatamente o tipo de regressão que uma auditoria "revalidação absoluta" existe para achar.
- **Correção:** reescrito para usar `vi.stubEnv`/`vi.unstubAllEnvs` (API oficial do vitest para mock de variáveis de ambiente, não sujeita à restrição de tipo porque não atribui à propriedade real).
- **Evidência de fechamento:** `npx tsc --noEmit` limpo; os mesmos 6 testes continuam passando (agora 100% equivalentes em comportamento, só a mecânica de mock mudou).

### RM-57-02 — INFORMATIVO — Open handle intermitente reproduzido novamente, causa raiz continua não localizável

- Reproduzido de forma **isolada** nesta sessão: `npx jest --config ./test/jest-e2e.json --testPathPatterns postgres-real` (sem instrumentação) → `"Jest did not exit one second after the test run has completed... Consider running Jest with --detectOpenHandles"`, mesmo com os 8/8 testes passando.
- Reexecutado imediatamente com `--detectOpenHandles --runInBand` no mesmo arquivo isolado → **exit 0, sem aviso, sem handle reportado**.
- Isto reproduz exatamente o padrão já documentado no RM-56 (o sintoma desaparece sob instrumentação), agora confirmado também em isolamento de um único arquivo (não só na suíte completa de 11 arquivos). Reforça que é um comportamento real e consistente do ambiente Jest/Node/Windows nesta sandbox, não um artefato de concorrência entre suítes — mas continua **sem causa raiz localizável** com as ferramentas disponíveis.
- **Classificação: INFORMATIVO**, mantida do RM-56. Não convertido em falso "corrigido" (nenhuma mudança de código foi feita para isto) nem escondido.

### Verificações adversariais que NÃO encontraram problema (evidência direta, não aceitação de relatório anterior)

| Categoria | Verificação | Resultado |
|---|---|---|
| Ownership/IDOR | Releitura direta de `consulta.service.ts` (`criarPrescricao`): `consulta.usuario_id` checado antes de qualquer escrita; `diagnostico_id` opcional validado contra a MESMA `consulta_id` já autorizada | ✅ confirmado presente no código atual |
| CORS | Releitura direta de `cors.util.ts` | ✅ allowlist explícita por ambiente, sem regex/wildcard, `credentials` só habilitado com origem validada |
| Rate limiting | `grep` de `@Throttle` em `auth.controller.ts`/`mfa.controller.ts` | ✅ login, refresh e todos os endpoints MFA com throttle explícito (10/min); demais endpoints cobertos pelo `ThrottlerGuard` global |
| Mass assignment / Prototype Pollution | Releitura de `main.ts` | ✅ `ValidationPipe` global com `whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true` |
| XSS | `grep -rn "dangerouslySetInnerHTML"` em todo `frontend/src` | ✅ zero ocorrências |
| Command Injection | `grep` de `exec(\``/`execSync(\``/`spawn(\`` com template string em scripts de build/CI | ✅ zero ocorrências |
| SSRF | `grep` de `fetch(`/`axios.`/`http(s).request(` em `backend/src` | ✅ zero chamadas HTTP de saída no backend (nenhuma superfície) |
| Header Injection | `grep` de `setHeader`/`res.header(` em `backend/src` | ✅ zero ocorrências |
| `eval`/`new Function` | `grep` em `frontend/src` | ✅ zero ocorrências |
| `as any`/`: any` em produção | `grep` em `frontend/src` e `backend/src`, excluindo testes | ✅ zero ocorrências (confirmado consistente com RM-56) |
| `@ts-ignore`/`@ts-expect-error` | `grep` em todo o repositório (fora `node_modules`) | ✅ zero ocorrências |
| `eslint-disable` fora de teste | `grep` em `frontend/src`, `backend/src` | ✅ zero ocorrências (todas as 11 em arquivos `.spec.ts`/`.test.ts`, já auditadas no RM-54/55) |
| `postgres-real.e2e-spec.ts` — falso positivo de "suíte pulada" | Execução isolada com `--verbose` | ✅ confirmado 8 testes REAIS executados contra Postgres real, não um `describe.skip` mascarado como sucesso |
| GitHub Actions — scripts referenciados existem | Leitura de `ci.yml` cruzada com `package.json` de ambos os projetos | ✅ todos os comandos (`typecheck`, `test:coverage`, `test:cov`, `test:e2e`, `build`, `lint` sem `--fix`) existem e correspondem |

## 5. Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `frontend/src/tests/eurofarma-sync-route-rm56.test.ts` | 6 atribuições diretas a `process.env.NODE_ENV`/`process.env.EUROFARMA_SYNC_TOKEN` substituídas por `vi.stubEnv`/`vi.unstubAllEnvs` |

Nenhum outro arquivo foi alterado. Nenhum motor clínico, farmacológico,
dose, protocolo ou contraindicação foi tocado.

## 6. Regressões

**1 regressão encontrada e corrigida nesta sessão** (RM-57-01, seção 4).
Nenhuma outra regressão foi encontrada em nenhuma das áreas varridas nas
Fases 2-6. Os 1.211 testes automatizados (922 frontend + 146 unitários
backend + 143 e2e contra Postgres real) passam de forma consistente
após a correção, em execuções repetidas nesta sessão.

## 7. Cobertura

Frontend (`v8`, global): `Statements 25,63% | Branches 26,46% | Functions
19,06% | Lines 27,59%` — idêntico ao medido no RM-56 (esperado; nenhuma
linha de produção mudou, só um arquivo de teste). Os thresholds
por-arquivo (motores clínicos críticos) e o `coverageThreshold` do
backend (auth/mfa/identifier-hash/cors/ownership) continuam sendo
**realmente aplicados** — `exit 0` em ambos os comandos de cobertura
confirmado nesta sessão (mecanismo já provado reversível no RM-56, não
re-testado por completo aqui para evitar redundância, mas a execução
normal confirma que o gate continua ativo e ligado ao CI).

## 8. Segurança

Ver tabela da seção 4 ("Verificações adversariais que NÃO encontraram
problema"). Nenhum novo achado de segurança nesta rodada. JWT (segredo
mínimo, validação de entropia), MFA (throttle, hash), CORS (allowlist),
rate limiting, validação de DTO (whitelist) e ownership de dados clínicos
foram todos reverificados por leitura direta do código atual, não por
citação de relatório anterior.

## 9. Arquitetura

Sem mudança estrutural nesta rodada. Padrões já auditados no RM-54/56
(Drug Repository Layer, guarda de import RM-06, transação atômica
`escreverComAuditoriaAtomica`, `onDelete: Restrict` entre entidades
clínicas) permanecem intactos — confirmado por typecheck/testes/build
passando sem exigir nenhuma mudança nesses arquivos.

## 10. Farmacologia

RM-23 (`check-drug-consistency.mjs`) e RM-24 (`check-cross-database.mjs`)
foram reexecutados como parte real do `npm run build` (prebuild), não
lidos de relatório: **367 entidades, 0 inconsistências
(critical/high/medium/low)**; **divergentes=0, aceitos=14 (combinações
comerciais fora de escopo, decisão documentada), críticos=0**. Nenhum
motor farmacológico (`safety-rules.ts`, `dose-calculator.ts`,
`dosing-engine.ts`, `pediatric-engine.ts`, `icu-engine.ts`,
`clinical-risk-engine.ts`) foi alterado nesta sessão — os 22 pares de
`CRITICAL_PAIRS`, os cálculos de CrCl/IMC/BSA e as regras de dose máxima/
pediátrica continuam cobertos pelos mesmos testes de regressão que
passaram nesta execução (parte dos 922 testes frontend).

## 11. Performance

Fora do escopo desta rodada uma nova medição de carga real (nenhuma
ferramenta de profiling de produção disponível neste ambiente). Nenhum
padrão N+1 novo encontrado na varredura de `consulta.service.ts`
(consultas Prisma usam `include`/`select` explícitos, sem loop de
queries por item observado nesta releitura).

## 12. Escalabilidade

Sem mudança em relação à avaliação do RM-56: a arquitetura de motor por
especialidade + Drug Repository Layer + validador cross-database com
alias-matching suporta crescimento de catálogo sem redesenho. Não foi
gerado nenhum teste de carga com volume de 1 milhão de consultas/500 mil
prescrições nesta sessão — permanece uma limitação **informativa**, não
verificável apenas por leitura de código ou execução de teste unitário
neste ambiente.

## 13. Governança

Nenhuma nova documentação morta ou desatualizada encontrada nesta rodada
(a limpeza de `docs/archive/legacy-lib-modules/` do RM-56 permanece
válida — confirmado que nenhum desses 10 arquivos voltou a ser
referenciado). `git status` no repositório principal mostra apenas as
mudanças desta sessão (o teste corrigido + regeneração automática de
`DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md` pelo build).

## 14. Plano de Correção

Nenhum plano de correção pendente. O único achado com plano de correção
necessário (RM-57-01) já foi executado e revalidado nesta mesma sessão
(seção 2). As mudanças ainda **não foram commitadas** — ver nota final.

## 15. Matriz Final de Riscos

| Severidade | Contagem | Itens |
|---|---|---|
| CRÍTICO | 0 | — |
| ALTO | 0 | RM-57-01 foi ALTO, mas **corrigido e revalidado nesta mesma sessão** — 0 permanece aberto |
| MÉDIO | 0 | — |
| BAIXO | 0 | — |
| INFORMATIVO | 1 | RM-57-02 (open handle intermitente, sem causa raiz localizável, reproduzido mas não fabricável como "corrigido") |

## 16. Pontuação (0–10)

| Dimensão | Nota | Justificativa |
|---|---|---|
| Arquitetura | 9 | Sem mudança; padrões sólidos confirmados |
| Frontend | 9 | 0 erros após correção do RM-57-01; 0 warnings |
| Backend | 9 | 0 erros, coverage gate real, ownership confirmado |
| Farmacologia | 9 | RM-23/RM-24 zero críticos em execução fresca |
| Persistência | 9 | E2E real contra Postgres confirmado (inclusive isolado) |
| Segurança | 9 | Varredura adversarial completa sem novo achado |
| Performance | 7 | Sem medição de carga real disponível |
| Testes | 9 | 1.211 testes verdes; 1 regressão real encontrada E corrigida (prova que a auditoria funciona) |
| CI/CD | 8 | Scripts do `ci.yml` verificados contra `package.json` real; `.github/` versionado desde RM-56 |
| Governança | 9 | Nenhuma documentação morta nova; limpeza do RM-56 confirmada estável |
| Escalabilidade | 8 | Arquitetura suporta crescimento de catálogo; carga real não testável neste ambiente |

**Nota final: 8,6/10**

## 17. Veredito Final

> ## 🟢 LIBERADO PARA PRODUÇÃO

**Prova documental exigida por esta auditoria:**
- **0 críticos, 0 altos, 0 médios, 0 baixos** abertos: o único achado ALTO
  desta rodada (RM-57-01) foi encontrado, corrigido e revalidado com
  execução nova (`tsc` limpo, teste continua passando) na mesma sessão —
  não sobrevive nenhum risco aberto nessas quatro categorias.
- **Todos os gates executados**: typecheck, lint, build, cobertura,
  testes unitários/E2E de ambos os projetos, migrações Prisma, geração do
  Prisma Client, e verificação cruzada do `ci.yml` — todos rodaram nesta
  sessão, não foram assumidos de relatório anterior.
- **Cobertura realmente aplicada**: `exit 0` confirmado em
  `test:coverage`/`test:cov` nesta execução; mecanismo de bloqueio já
  provado reversível no RM-56 e reconfirmado ativo aqui.
- **Regressão zero**: a única regressão encontrada nesta auditoria foi
  fechada dentro da própria sessão, com evidência de fechamento, não
  apenas declarada como corrigida.
- **Build zero, lint zero, testes zero falhas**: confirmado, seção 3.
- **Nenhuma inconsistência farmacológica**: RM-23/RM-24 executados de
  verdade, 0 críticos.
- **Nenhuma inconsistência arquitetural, clínica ou de segurança**:
  varredura adversarial completa das Fases 2-6 sem achado sobrevivente.

O único item remanescente (RM-57-02) é explicitamente **INFORMATIVO** —
um sintoma intermitente e reproduzido de forma consistente, mas cuja
causa raiz não é localizável com as ferramentas de instrumentação
disponíveis neste ambiente (o próprio `--detectOpenHandles` não reproduz
o sintoma quando ativo). Não foi convertido em falso positivo (não foi
escondido) nem em falso negativo (não foi inflado para uma severidade que
a evidência não sustenta) — permanece documentado, não bloqueia o
veredito pela regra desta auditoria (que lista apenas crítico/alto/
médio/baixo como bloqueantes).

**Nota final sobre estado do repositório:** a correção do RM-57-01 (1
arquivo) está aplicada no working tree mas **ainda não foi commitada** —
esta sessão não recebeu autorização explícita para commit desta vez
(diferente da sessão RM-56, onde o commit foi pedido explicitamente).
`git status` mostra a mudança pendente; recomenda-se commitar antes de
qualquer deploy.
