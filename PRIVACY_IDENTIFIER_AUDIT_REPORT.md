# Auditoria de Privacidade e Proteção de Identificadores — Prescreve-AI

Data: 2026-07-26
Escopo: CPF, CRM, nome, e-mail, telefone, identificadores de pacientes, logs, auditoria, banco, localStorage, respostas de API.

## 1. Resumo executivo

O achado mais grave: **o CRM de médicos era protegido, em produção, com `djb2Hash()` — um hash de 32 bits somado bit a bit, não criptográfico, trivialmente reversível e com colisões frequentes** (`backend/src/auth/auth.service.ts`, fluxo real de `POST /auth/register`). Isso não é "hash fraco" — é, na prática, texto reversível disfarçado de proteção, pior do que não ter nenhuma, porque cria uma falsa sensação de segurança (o próprio código do projeto tinha uma página de "maturity report" afirmando "CRM hash SHA256 — já implementado", o que nunca foi verdade).

O segundo achado: o design de pseudonimização de CPF (`Paciente.hash_identidade`) delegava o cálculo do hash ao **cliente** — um SHA-256 simples, sem segredo, de um valor de baixíssima entropia (CPF tem ~10⁹ combinações matematicamente válidas após os dígitos verificadores). Um hash sem segredo de um valor de baixa entropia é quebrável por rainbow table em minutos, e — mais fundamental — **um segredo nunca pode viver em código de frontend público**, então esse design nunca poderia ter sido corrigido apenas trocando o algoritmo no cliente. Felizmente, nenhum fluxo de UI atualmente conectado chegou a enviar esse campo (confirmado por busca exaustiva) — o gap existia no design/DTO, não estava ativamente explorável ainda, mas seria a próxima coisa quebrada assim que alguém conectasse a tela de identificação de paciente.

IP de auditoria (`ip_hash`) tinha o mesmo problema: SHA-256 sem segredo — IPv4 tem só 2³² valores, um rainbow table completo é trivial.

**Todos os três foram corrigidos com HMAC-SHA256 e uma chave exclusivamente server-side (`IDENTIFIER_HMAC_KEY`)**, seguindo o mesmo padrão fail-fast já estabelecido nesta base de código para `JWT_SECRET`/`MFA_ENCRYPTION_KEY`.

## 2. Mapa de dados sensíveis

| Dado | Onde vive | Classificação | Proteção ANTES | Proteção DEPOIS |
|---|---|---|---|---|
| **CPF de paciente** | `Paciente.hash_identidade` (Postgres) | Identificador direto de baixa entropia | SHA-256 simples, calculado no CLIENTE (design nunca ativado em produção) | HMAC-SHA256 com chave server-side, CPF recebido em texto puro só em memória (nunca persistido/logado), calculado no `ConsultaService.criarConsulta` |
| **CRM de médico** | `Medico.crm_hash` (Postgres) | Identificador direto de baixa entropia | `djb2Hash()` — hash NÃO criptográfico, 32 bits, reversível | HMAC-SHA256 com chave server-side (`auth.service.ts`) |
| **CNPJ de laboratório/hospital** | `Laboratorio.cnpj_hash`/`Hospital.cnpj_hash` (Postgres) | Identificador direto de baixa entropia | Campo existe no schema, mas **nenhum fluxo de código o calcula hoje** (não wired) | `hmacIdentifier(config, 'cnpj', ...)` já disponível e pronto para quando o cadastro de Laboratório/Hospital for implementado |
| **IP de origem de login/auditoria** | `Usuario`/`Auditoria.ip_hash` (Postgres) | Identificador de baixa entropia (IPv4 = 2³² valores) | SHA-256 simples sem segredo | HMAC-SHA256 com chave server-side |
| **Senha** | `Usuario.senha_hash` | Credencial | bcrypt (custo 12) — já correto, sem alteração | Sem alteração — já correto |
| **Segredo TOTP (MFA)** | `Usuario.mfa_secret` | Segredo criptográfico | AES-256-GCM, chave server-side — já correto | Sem alteração |
| **Refresh token** | `RefreshToken.token_hash` | Segredo de alta entropia (~256 bits) | SHA-256 simples | Sem alteração — deliberado (ver §3, "aplicável") |
| **E-mail** | `Usuario.email` (Postgres) | PII direta | Texto puro (necessário — é o identificador de login) | Sem alteração — minimizado nas respostas de API (§5) |
| **Nome** | `Medico.nome_social` (opcional, Postgres); `Prescription.paciente.nome`/`medico.nome` (frontend, só na prescrição impressa) | PII direta | Texto puro | Sem alteração — inerente ao propósito (documento médico precisa de nome legível); minimizado no que é persistido no backend (anamnese/prescrição não persistem nome de paciente por padrão) |
| **Telefone** | Não encontrado em nenhum modelo Prisma nem fluxo de coleta ativo | — | N/A | N/A — documentado como não aplicável ao estado atual do código |
| **Anamnese (texto clínico livre)** | `Consulta.anamnese` (Json, Postgres) | Dado clínico sensível, forma livre | Sem limite de tamanho, sem redação (corrigido tamanho na auditoria de validação de entrada anterior) | Nunca aparece em log de aplicação (confirmado por teste e2e); continua sem estrutura fixa — decisão de escopo, não fabricar um redesenho da anamnese |
| **Medicamentos/diagnóstico/justificativa** | `Prescricao.medicamentos`, `Diagnostico.descricao`, `MedicalValidation.justificativa` (Postgres) | Dado clínico sensível | Sem redação de log | Nunca aparecem em log de aplicação (confirmado por teste); `redact.util.ts` disponível para qualquer ponto futuro de log estruturado |
| **JWT (access/refresh token)** | `localStorage` (frontend) | Segredo de sessão | Texto puro em localStorage (padrão SPA comum) | Sem alteração — ver riscos residuais (§7) |
| **Anamnese/histórico local** | `localStorage` (`prescreve_ai_anamnese`, `prescreve_ai_historico`, digital-twin, etc.) | Dado clínico | Texto puro em localStorage | Sem alteração — ver riscos residuais (§7) |

## 3. O que foi implementado

### 3.1 — `backend/src/common/crypto/identifier-hash.util.ts` (novo)

`hmacIdentifier(config, domain, value)` — HMAC-SHA256 com:
- **Chave exclusivamente server-side** (`IDENTIFIER_HMAC_KEY`, 32 bytes hex, fail-fast se ausente/mal formatada — mesmo padrão de `getRequiredSecret`).
- **Normalização** antes do hash (remove pontuação, minúsculas) — variações de formatação do mesmo CPF/CRM produzem sempre o mesmo hash.
- **Separação de domínio** (`cpf:`, `crm:`, `cnpj:`, `ip:` como prefixo) — o mesmo valor bruto usado em contextos diferentes nunca colide.

Aplicado em:
- `auth.service.ts` — `crm_hash` (registro público e fluxo administrativo) e `ip_hash` (auditoria de login/refresh).
- `consulta.service.ts` — `hash_identidade` de `Paciente`, a partir de um novo campo `CriarConsultaDto.paciente_cpf` (CPF em texto puro, validado por formato, nunca persistido — só a variável local com o hash toca o banco).

**Por que não HMAC em tudo**: `RefreshToken.token_hash` e `hash_integridade` (Prescricao/Auditoria/RecommendationRegistry) continuam SHA-256 simples, **deliberadamente** — são hashes de segredos aleatórios de alta entropia gerados pelo próprio servidor (tokens JWT, ~256 bits) ou hashes de integridade/checksum (não escondem nada, só detectam adulteração). HMAC não traria proteção adicional nesses casos — "quando aplicável" significa identificadores pessoais de baixa entropia, não qualquer `createHash`.

### 3.2 — Separação identificador interno vs. público

- **Interno** (nunca sai da API): `Usuario.id`, `Paciente.id`, `Consulta.id` — cuids opacos, gerados pelo Prisma, sem relação matemática com CPF/CRM/e-mail.
- **Público/de busca** (`hash_identidade`, `crm_hash`): usados SÓ como chave de upsert/lookup interno (`WHERE hash_identidade = ...`) — nunca retornados em nenhuma resposta HTTP (confirmado por teste, §6).

### 3.3 — Minimização de dados

`auth.service.ts` — `register()`, `criarUsuarioPrivilegiado()` e `refresh()` buscavam o `Usuario`/`Medico` completo do banco (`include: { medico: true }` / `include: { usuario: true }`) mesmo só usando `id`/`email`/`perfil` depois — `senha_hash` e `mfa_secret` chegavam à memória do processo sem necessidade. Trocado por `select` explícito nos três pontos — nunca mais que o necessário sai do banco, não só da resposta HTTP.

### 3.4 — Redação de logs

`backend/src/common/logging/redact.util.ts` (novo) — `redact(obj)` remove recursivamente qualquer campo cujo nome contenha `senha`, `cpf`, `crm`, `token`, `secret`, `anamnese`, `medicamentos`, `diagnostico`, `justificativa`, etc. Disponível para qualquer ponto futuro que precise logar um objeto estruturado.

`HttpLoggingInterceptor` — auditado e confirmado: já loga **somente** método, rota, status HTTP e duração — nunca corpo de requisição/resposta nem headers. Reforçado com comentário explícito proibindo estender esse comportamento sem passar por `redact()`. Corrigidos también 4 erros de lint pré-existentes de tipagem `any` neste arquivo (tipagem `Request`/`Response` do Express) — estava sinalizado como débito técnico desde sessão anterior; corrigido agora por estar diretamente no escopo desta auditoria.

### 3.5 — Revisão de respostas de API

Confirmado (por leitura de código + teste e2e real): nenhum endpoint retorna `senha_hash`, `mfa_secret`, `crm_hash` ou `hash_identidade`. `POST /auth/register`/`criarUsuarioPrivilegiado` retornam exatamente `{access_token, refresh_token, perfil}` / `{id, email, perfil}` — nunca o objeto `Usuario` bruto.

## 4. Confirmação das restrições "NÃO"

- **"Não usar hash rápido não criptográfico para proteção de identificadores"** — `djb2Hash()` foi completamente removido do código-fonte (não existe mais nenhuma chamada). Todo identificador de baixa entropia (CPF, CRM, CNPJ, IP) usa `hmacIdentifier()`.
- **"Não registrar CPF, dados clínicos ou secrets em logs"** — confirmado por 4 testes e2e reais (`test/privacy-audit.e2e-spec.ts`) que disparam requisições HTTP reais com CPF/senha/CRM reais no corpo e capturam TUDO que qualquer `Logger` da aplicação emite durante a requisição, verificando que nenhum desses valores aparece em nenhuma linha.

## 5. Testes adicionados

| Arquivo | Testes | Cobre |
|---|---|---|
| `src/common/crypto/identifier-hash.util.spec.ts` (novo) | 9 | Fail-fast sem chave; determinismo; formato do hash; normalização; separação de domínio; **prova direta de resistência a rainbow table** (simula um atacante enumerando 1000 candidatos de CPF com SHA-256 simples — o algoritmo antigo — contra o hash HMAC real: nunca acerta) |
| `src/common/logging/redact.util.spec.ts` (novo) | 7 | Redação de campos diretos, aninhados, em arrays; preserva campos não sensíveis; nunca lança |
| `src/modules/consulta/consulta.service.spec.ts` (+4) | — | CPF nunca persistido em texto puro; mesma pessoa com formatações diferentes de CPF resolve ao mesmo paciente; CPFs diferentes nunca colidem; ausência de CPF não gera chamada ao Prisma |
| `test/privacy-audit.e2e-spec.ts` (novo, HTTP real) | 7 | **Dados sensíveis nunca em log** (registro com senha+CRM reais; login com senha errada; consulta com CPF real; confirma que o log HTTP real continua funcionando — método/rota/status — sem vazar o corpo). **Respostas de API não expõem campos internos** (sem `senha_hash`, sem `crm_hash`, resposta de registro contém EXATAMENTE os 3 campos esperados, nada a mais) |

## 6. Resultado dos gates

| Comando | Resultado |
|---|---|
| Backend `npx tsc --noEmit` | ✅ limpo |
| Backend `npx eslint` (arquivos alterados) | ✅ 0 erros/avisos (inclusive 4 erros pré-existentes corrigidos em `http-logging.interceptor.ts`) |
| Backend `npx jest` (unitário) | ✅ **98/98** (10 suítes) |
| Backend `npx jest --config ./test/jest-e2e.json` | ✅ **76/76** (8 suítes) |
| Backend `npm run build` + `require('./dist/src/app.module.js')` | ✅ `APP_MODULE_LOADED_OK` |
| Frontend `npx tsc --noEmit` | ✅ limpo |
| Frontend `npx eslint` (arquivo alterado) | ✅ 0 erros |
| Frontend `npx vitest run` | ✅ **410/410** (16 suítes, sem alteração — mudança de tipo sem impacto funcional) |
| Frontend `npm run build` | ✅ sucesso |

## 7. Riscos residuais

0. **⚠️ MIGRAÇÃO NECESSÁRIA — `crm_hash` de médicos JÁ CADASTRADOS em produção continua com o algoritmo antigo (`djb2Hash`)**: esta correção troca o algoritmo para HMAC-SHA256 apenas em NOVOS cadastros — é uma transformação de mão única, então não há como recalcular retroativamente o hash de um médico já cadastrado sem pedir o CRM de novo (o valor original nunca foi armazenado). Como `crm_hash` não é usado hoje em nenhuma consulta por igualdade fora da criação (confirmado por busca no código), isso não quebra nenhum fluxo funcional — mas os registros antigos continuam com a proteção fraca até serem re-cadastrados. Se isso for uma preocupação real dado o volume de médicos já em produção, a ação recomendada é um script de migração único que peça re-confirmação de CRM aos médicos ativos (fora do escopo desta auditoria de código).
1. **JWT em `localStorage`** — padrão comum de SPA, mas vulnerável a XSS (um script malicioso injetado poderia ler o token). Migrar para cookie `httpOnly` é uma mudança de arquitetura de autenticação maior, fora do escopo desta auditoria pontual de identificadores — documentado, não implementado.
2. **Anamnese/histórico em `localStorage` em texto puro** — inerente ao design "local-first" já auditado na sessão anterior (integridade de persistência); criptografia em repouso no navegador (ex.: `crypto.subtle` com uma chave derivada da sessão) reduziria o risco em caso de acesso físico ao dispositivo, mas é um redesenho maior do armazenamento local, não implementado aqui.
3. **`cnpj_hash` de Laboratório/Hospital** — pronto (`hmacIdentifier(config, 'cnpj', ...)`), mas nenhum fluxo de cadastro os usa ainda; quando implementado, deve seguir o mesmo padrão do CPF (texto puro só em memória, nunca persistido).
4. **Motores locais do frontend com hash não criptográfico** (`hashStr()` — djb2-like, em `patient-digital-twin.ts`, `physician-validation-engine.ts`, `rwe-engine.ts`, `clinical-stress-etapa9.ts`) — usados **só com dados sintéticos de demonstração** (seeds hardcoded, ex. `'SP-123456'`), nunca com CPF/CRM real de usuário (confirmado por busca exaustiva — são módulos 100% locais, nunca sincronizados com o backend). Não corrigidos nesta auditoria por não processarem dado real, mas a página `frontend/src/app/maturity-report/page.tsx` afirma "CRM hash SHA256 — já implementado" de forma imprecisa (mistura os motores de demonstração com o backend real) — vale revisar essa página de conteúdo numa iteração de documentação, não de segurança.
5. **Telefone** não existe em nenhum modelo Prisma nem fluxo de coleta hoje — se um cadastro de telefone for adicionado no futuro, deve ser tratado com a mesma disciplina (nunca texto puro em log, considerar necessidade real de persistência).
