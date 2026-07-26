# Auditoria de Ownership e Autorização por Recurso — Backend Prescreve-AI

Data: 2026-07-25
Escopo: acesso horizontal (IDOR) a todo recurso clínico persistido — pacientes, consultas, diagnósticos, prescrições, risk scores, auditorias, documentos.

## Contexto

Esta auditoria roda em cima de uma correção de IDOR já aplicada em sessão anterior (`AUTHORIZATION_SECURITY_AUDIT_REPORT.md`, commit `68a7a21`), que havia:
- corrigido `salvarRiskScore` (gravava `RiskScore` em qualquer `consulta_id` do cliente, sem checar ownership);
- introduzido `RolesGuard`/`@Roles()` de fato aplicado (antes existiam no código mas nunca eram usados);
- bloqueado escalada de privilégio no cadastro público.

O objetivo desta rodada foi (1) re-verificar cada endpoint clínico linha por linha contra o critério "conhecer um ID nunca é suficiente", (2) fechar a lacuna de prova real (e2e HTTP, não só unitário/mockado) para os fluxos de diagnóstico e prescrição, e (3) entregar a matriz endpoint→recurso→ownership→role→resultado.

## 1. Inventário de recursos clínicos e onde vivem

| Modelo Prisma | Ownership real | Observação |
|---|---|---|
| `Consulta` | `usuario_id` (campo direto) | Fonte da verdade de ownership para todo o resto |
| `Diagnostico` | via `consulta_id → Consulta.usuario_id` | Sem `usuario_id` próprio — ownership é sempre indireto pela consulta |
| `Prescricao` | via `consulta_id → Consulta.usuario_id` | idem |
| `RiskScore` | via `consulta_id → Consulta.usuario_id` | idem |
| `MedicalTrust` | via `consulta_id → Consulta.usuario_id` | idem — nenhum endpoint de escrita exposto hoje (ver §4) |
| `GuidelineConflict` | via `diagnostico_id → Diagnostico → Consulta.usuario_id` | Nenhum endpoint de escrita exposto |
| `RecommendationRegistry` | via `prescricao_id → Prescricao → Consulta.usuario_id` | Nenhum endpoint de escrita exposto |
| `Paciente` | **Não é owned por um usuário** — chave é `hash_identidade` (hash do CPF), compartilhado entre médicos que atendem o mesmo paciente. Design intencional (comentado no schema) | Nenhum endpoint lê/lista `Paciente` diretamente por id — só é criado/reaproveitado via `upsert` dentro de `criarConsulta` |
| `Auditoria` | `usuario_id` opcional | **Sem controller exposto hoje** — ver §4 (achado) |
| Documento | **Modelo inexistente no schema atual** | Não há entidade "documento" persistida — nada a auditar |

## 2. Matriz endpoint × recurso × ownership × role × resultado esperado

| Endpoint | Recurso | Ownership exigido | Role necessária | Resultado esperado |
|---|---|---|---|---|
| `POST /api/consulta` | `Consulta` (criação) | N/A (cria como o próprio chamador — `usuario_id` sempre do JWT, nunca do body) | autenticado | 201 sempre para o próprio usuário |
| `GET /api/consultas` | `Consulta` (listagem) | Implícito — `where.usuario_id = <do JWT>` | autenticado | 200, lista **só** as consultas do chamador |
| `GET /api/consulta/:id` | `Consulta` (leitura) | `findFirst({id, usuario_id})` | autenticado; dono | 200 se dono · **404** se pertence a outro · **404** se `:id` não existe (mesma resposta — não vaza existência) |
| `GET /api/timeline` | `Consulta` (listagem) | Implícito — `where.usuario_id = <do JWT>` | autenticado | 200, só do chamador |
| `POST /api/diagnostico` | `Diagnostico` (criação, vinculado a `consulta_id`) | `findFirst({id: consulta_id, usuario_id})` antes de criar | autenticado; dono da consulta alvo | 201 se dono da consulta · **403** se a consulta pertence a outro (ou não existe) |
| `POST /api/prescricao` | `Prescricao` (criação, vinculado a `consulta_id`) | idem | autenticado; dono da consulta alvo | 201 se dono · **403** se não |
| `POST /api/risco` | `RiskScore` (criação, vinculado a `consulta_id`) | idem | autenticado; dono da consulta alvo | 200 se dono · **403** se não |
| `GET /api/evidence/:cid` | `Evidencia` (leitura) | N/A — dado de referência clínica compartilhado (guideline por CID), não pertence a nenhum usuário | autenticado | 200 para qualquer usuário autenticado |
| `GET /api/rwe/:cid` | `RWE` (leitura) | N/A — mesmo motivo | autenticado | 200 para qualquer usuário autenticado |
| `POST /api/migration` | `Consulta`/`Prescricao`/`MedicalValidation` (criação em lote) | Sempre grava com `usuario_id`/`validador_id = <do JWT>` — nunca aceita id de terceiro | autenticado | 201, dados sempre atribuídos ao próprio chamador |
| `GET /api/migration/status` | idem (leitura agregada) | `where: { usuario_id / validador_id: <do JWT> }` | autenticado | 200, contagem só do chamador |
| `POST /auth/register` | `Usuario` (criação, perfil MEDICO fixo) | N/A | público | 201, sempre `perfil: MEDICO` — `perfil` no payload é **rejeitado com 400** (não apenas ignorado) |
| `POST /auth/admin/usuarios` | `Usuario` (criação, qualquer perfil) | N/A | **ADMIN** (`JwtAuthGuard + RolesGuard + @Roles(ADMIN)`) | 201 só para ADMIN · **403** para qualquer outro perfil autenticado · **401** sem token |
| `POST /auth/login` | `Usuario`/`RefreshToken` | N/A | público (rate-limited 10/min) | 200/401 conforme credenciais |
| `POST /auth/refresh` | `RefreshToken` | Implícito — token hash único, rotação de posse | público, mas exige posse do refresh token (rate-limited 10/min) | 200 se válido/não revogado/não expirado · 401 caso contrário |
| `POST /auth/logout` | `RefreshToken` | `usuario_id = <do JWT>` | autenticado | 200, revoga só as sessões do próprio chamador |
| `POST /auth/mfa/setup` \| `/ativar` \| `/desativar` | `Usuario.mfa_*` | `usuario_id = <do JWT>` (nunca recebido no body) | autenticado | 200/201 sempre sobre o próprio usuário |
| **Atualização de qualquer recurso clínico (`PATCH`/`PUT`)** | — | — | — | **Endpoint não existe no backend atual** (`grep` por `@Patch`/`@Put` = 0 ocorrências) — sem superfície de ataque a auditar |
| **Exclusão de qualquer recurso clínico (`DELETE`)** | — | — | — | **Endpoint não existe no backend atual** (`grep` por `@Delete` = 0 ocorrências) — sem superfície de ataque a auditar. Os campos `deletado_em` existem no schema (soft delete), mas nenhuma rota os aciona hoje |
| **Leitura/exportação de `Auditoria` (papel AUDITOR)** | `Auditoria` | `AuditService.buscarAuditoria()`/`exportarAuditoria()` existem no código, mas **nenhum controller os expõe** | — | Não testável em HTTP hoje porque não há rota — ver achado §4 |

## 3. Correções verificadas linha por linha (pedido explícito do usuário)

| Item pedido | Estado encontrado | Ação |
|---|---|---|
| `salvarRiskScore` | Já corrigido em sessão anterior (`findFirst({id, usuario_id})` + `ForbiddenException`) | Confirmado correto; reforçado com prova e2e HTTP real (antes só havia prova unitária + 1 caso e2e) |
| Criação de prescrição | Ownership já correto no service | **Bug de validação encontrado e corrigido** (não era um IDOR — ver §4) + prova e2e HTTP real adicionada (não existia nenhuma) |
| Criação de diagnóstico | Ownership já correto no service | Prova e2e HTTP real adicionada (antes só havia teste unitário com Prisma mockado direto no service, sem passar pelos guards/pipes reais) |
| Consulta por ID | Ownership já correto (`findFirst({id, usuario_id})` + `NotFoundException`) | Confirmado; adicionado teste explícito garantindo que "existe mas é de outro" e "nunca existiu" retornam o **mesmo** status e formato de resposta (não vaza enumeração de IDs) |
| Atualização | — | Não existe endpoint — nada a corrigir |
| Exclusão | — | Não existe endpoint — nada a corrigir |
| Endpoints administrativos | `POST /auth/admin/usuarios` já protegido por `RolesGuard + @Roles(ADMIN)` | Confirmado; teste e2e adicionado provando que ADMIN **não** ganha acesso irrestrito a recursos clínicos de terceiros só por ter a role (RolesGuard não é bypass de ownership) |

## 4. Achados desta rodada

### 4.1 — 🟠 Bug funcional em `POST /api/prescricao` (não é IDOR, mas bloqueava o próprio fluxo sob auditoria)

Ao escrever o teste e2e real (HTTP completo, `ValidationPipe` global ativa) para provar ownership de `criarPrescricao`, a criação de prescrição **na própria consulta do usuário** falhava com `400 Bad Request`, antes mesmo de chegar à checagem de ownership.

**Causa:** `CriarPrescricaoDto.medicamentos` não tinha **nenhum** decorator de `class-validator`. Com `whitelist: true` (`main.ts`), o `ValidationPipe` trata uma propriedade sem qualquer metadata de validação registrada como desconhecida e a remove/rejeita — isso não é uma falha de ownership, mas quebrava o endpoint inteiro para qualquer chamada legítima. Não foi pego antes porque o teste unitário existente chama `ConsultaService.criarPrescricao()` diretamente (Prisma mockado), pulando a `ValidationPipe` por completo — só um teste e2e HTTP real (guards + pipes reais) revela esse tipo de bug.

**Correção:** `src/modules/consulta/dto/consulta.dto.ts` — novo `ItemMedicamentoDto` (com `@IsString()` em cada campo) e `medicamentos` agora decorado com `@IsArray() @ValidateNested({each:true}) @Type(() => ItemMedicamentoDto)`. `src/modules/consulta/consulta.service.ts` — persiste `dto.medicamentos.map((m) => ({...m}))` (objetos JSON simples, não instâncias de classe) para satisfazer o tipo `Json` do Prisma.

Esse achado reforça a lição já registrada nesta sessão: testes unitários com o service chamado diretamente não substituem prova via HTTP real com os guards/pipes de produção.

### 4.2 — 🟡 `AuditService.buscarAuditoria()`/`exportarAuditoria()` sem enforcement de ownership, mas também sem rota exposta

`buscarAuditoria(filtros)` aceita um `usuario_id` arbitrário como filtro, sem nenhuma restrição a "só posso ver a minha própria auditoria" nem a uma role (`AUDITOR`/`ADMIN`). **Não é uma vulnerabilidade explorável hoje** — confirmado via busca em todos os controllers (`grep -rn "AuditService" src --include="*.controller.ts"` = 0 ocorrências) que nenhuma rota HTTP chama esses métodos.

É, porém, uma armadilha para quem conectar essa rota no futuro sem lembrar de adicionar a checagem. Registrado como risco residual (não corrigido nesta auditoria — não há endpoint real para testar, e criar um endpoint de auditoria não estava no pedido). Recomendação: quando esse endpoint for implementado, restringir por padrão a `usuario_id = <do JWT>` para perfis comuns, e exigir `@Roles(ADMIN, AUDITOR)` explicitamente para consultar auditoria de terceiros.

### 4.3 — 🟡 Perfil `AUDITOR` existe no enum mas nenhum endpoint o utiliza

`Perfil.AUDITOR` é um valor válido (criável via `POST /auth/admin/usuarios`), mas **nenhuma rota atual** tem `@Roles(...)` incluindo `AUDITOR`. O cenário de teste "auditor autorizado" pedido pelo usuário não é implementável contra o código atual porque não existe nenhuma funcionalidade que essa role desbloqueie — é um gap de **cobertura de funcionalidade**, não de autorização (não há nada para o AUDITOR estar "autorizado" ou "não autorizado" a fazer). Fica documentado aqui como decisão de escopo, seguindo o mesmo princípio já usado nesta sessão para "recuperação de senha": não fabricar um endpoint novo fora do pedido original.

### 4.4 — 🟢 `Paciente` confirmadamente não é um recurso "owned" por usuário — por design

`Paciente` é resolvido por `hash_identidade` (hash do CPF) e compartilhado entre qualquer médico que trate o mesmo paciente — não há endpoint que liste ou busque um `Paciente` por `id` diretamente (só é tocado internamente dentro de `criarConsulta`, via `upsert`). Não há, portanto, superfície de acesso horizontal a auditar neste modelo isoladamente; o controle de acesso relevante é sempre no nível da `Consulta`.

## 5. Testes adicionados (prova real de HTTP, não apenas de service mockado)

**Novo arquivo:** `test/ownership-authorization.e2e-spec.ts` — 14 testes, aplicação Nest real (guards, `ValidationPipe`, controllers reais), `PrismaService` totalmente mockado:

| # | Cenário | Resultado esperado | Status |
|---|---|---|---|
| 1 | B (dono) lê a própria consulta | 200 | ✅ |
| 2 | A lê a consulta de B só por conhecer o id | 404 | ✅ |
| 3 | Recurso inexistente vs. recurso de outro usuário — mesmo status e mesmo formato de resposta | 404 idêntico nos dois casos | ✅ |
| 4 | ADMIN lê a consulta de um médico (RolesGuard não é bypass de ownership) | 404 | ✅ |
| 5 | A cria diagnóstico na própria consulta | 201 | ✅ |
| 6 | A cria diagnóstico na consulta de B | 403 | ✅ |
| 7 | ADMIN cria diagnóstico na consulta de um médico | 403 | ✅ |
| 8 | A cria prescrição na própria consulta | 201 | ✅ |
| 9 | A cria prescrição na consulta de B | 403 | ✅ |
| 10 | ADMIN cria prescrição na consulta de um médico | 403 | ✅ |
| 11 | A grava risk score na própria consulta | 200 | ✅ |
| 12 | A grava risk score na consulta de B | 403 | ✅ |
| 13 | ADMIN grava risk score na consulta de um médico | 403 | ✅ |
| 14 | Listagem de consultas sempre filtrada por `usuario_id` do chamador | filtro confirmado no Prisma | ✅ |

Complementa (sem duplicar) os testes já existentes de sessão anterior: `test/authorization.e2e-spec.ts` (escalada de privilégio no cadastro, criação de usuário privilegiado por não-ADMIN, acesso sem autenticação/token forjado) e `src/modules/consulta/consulta.service.spec.ts` (unitário, mesma cobertura de ownership no nível de service).

## 6. Resultado dos gates

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ limpo |
| `npx eslint` (arquivos alterados/criados) | ✅ 0 erros/avisos |
| `npx jest` (unitário) | ✅ **69/69** (7 suítes) |
| `npx jest --config ./test/jest-e2e.json` (e2e) | ✅ **41/41** (5 suítes — 4 pré-existentes + `ownership-authorization.e2e-spec.ts` novo) |
| `npm run build` | ✅ exit 0 |
| `node -e "require('./dist/src/app.module.js')"` | ✅ `APP_MODULE_LOADED_OK` |

## 7. Critério de aceitação (checklist do usuário)

| Requisito | Onde está provado |
|---|---|
| A não acessa consulta de B | teste 2 |
| A não altera consulta de B | não aplicável — não existe endpoint de alteração (§2) |
| A não adiciona RiskScore à consulta de B | teste 12 |
| A não cria prescrição na consulta de B | teste 9 |
| A não exclui dados de B | não aplicável — não existe endpoint de exclusão (§2) |
| ADMIN autorizado | teste `POST /auth/admin/usuarios` (arquivo anterior) — 201 para ADMIN |
| Auditor autorizado | não aplicável hoje — nenhuma funcionalidade usa a role `AUDITOR` (achado §4.3) |
| Usuário sem permissão | teste `POST /auth/admin/usuarios` com MEDICO — 403 (arquivo anterior) |
| Recurso inexistente | teste 3 — 404, indistinguível de "pertence a outro" |

## 8. Arquivos alterados/criados

**Novos:**
- `test/ownership-authorization.e2e-spec.ts`
- `OWNERSHIP_AUTHORIZATION_AUDIT_REPORT.md` (este arquivo)

**Modificados:**
- `src/modules/consulta/dto/consulta.dto.ts` — novo `ItemMedicamentoDto`; `CriarPrescricaoDto.medicamentos` agora validado (`@IsArray`, `@ValidateNested`, `@Type`); `validade_dias` ganhou `@IsInt()` explícito
- `src/modules/consulta/consulta.service.ts` — `criarPrescricao()` persiste `medicamentos` como objetos JSON simples (compatível com o novo DTO tipado)

## 9. Riscos residuais

1. **`AuditService.buscarAuditoria`/`exportarAuditoria` sem rota** — precisa de enforcement de ownership/role no dia em que for exposto (§4.2).
2. **Role `AUDITOR` sem funcionalidade associada** — nenhuma vulnerabilidade, mas também nenhum valor de negócio até que algum endpoint a utilize (§4.3).
3. **`MedicalValidation` via `POST /api/migration`** — já registrado no relatório anterior: qualquer usuário autenticado pode autoatestar uma "validação médica" para si mesmo (`validador_id` sempre é o próprio chamador — não é acesso horizontal a terceiros, mas é uma fraqueza de integridade de dados fora do escopo desta auditoria de ownership).
4. **Ausência de endpoints de atualização/exclusão** é uma limitação de produto, não uma falha de segurança — mas caso sejam implementados no futuro, devem obrigatoriamente seguir o mesmo padrão `findFirst({id, usuario_id})` já usado em todo o restante do `ConsultaService`.
