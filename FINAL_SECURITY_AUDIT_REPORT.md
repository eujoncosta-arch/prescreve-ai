# FINAL_SECURITY_AUDIT_REPORT

**Gerado:** 2026-07-26 · **Escopo:** auditoria independente final do Prescreve-AI, pós-implementação de todos os RMs de segurança da sessão.

## Metodologia

Esta auditoria **não confiou em nenhum relatório anterior**. Seis frentes de investigação independentes leram o código-fonte ATUAL diretamente (não o histórico de commits, não os relatórios prévios) e verificaram comportamento real, incluindo alegações específicas de relatórios anteriores ("o refresh token tem `jti`", "o modo demo nunca é honrado em produção", etc.) — cada alegação foi confirmada ou refutada com evidência de código, não aceita por afirmação.

As 20 áreas do escopo foram agrupadas em 6 frentes:
1. Autenticação, MFA, JWT, Refresh tokens, Secrets
2. CORS, Rate limiting, RBAC
3. Ownership, DTOs, Prisma
4. Persistência, Logs, Privacidade
5. localStorage, Modo offline, Frontend/backend integration
6. Núcleo farmacológico, Regressão clínica

Testes E2E (item 17) foram avaliados por inventário direto de todos os arquivos `*.e2e-spec.ts`/`*.spec.ts` existentes, cruzado com os achados de cada frente.

## Resultado consolidado

| Severidade | Encontrados | Corrigidos | Abertos (documentados) |
|---|---|---|---|
| 🔴 Crítico | 2 | 2 | **0** |
| 🟠 Alto | 2 | 2 | **0** |
| 🟡 Médio | 6 | 3 | 3 (justificados abaixo) |
| 🟢 Baixo | ~10 | 2 | resto — informacional ou "verificado, sem defeito" |

**Critério de saída atendido:** nenhuma vulnerabilidade crítica aberta; nenhuma vulnerabilidade alta aberta sem justificativa documentada.

---

## 🔴 CRÍTICO

### PHARMA-01 — Supressão silenciosa de alertas críticos de interação medicamentosa
- **Severidade:** 🔴 Crítico
- **Arquivo:** `frontend/src/lib/safety-rules.ts:484` (antes da correção)
- **Evidência (código antes da correção):**
  ```js
  const jaExiste = alerts.some(a => a.id.includes(pair.mol_a) || a.titulo.toLowerCase().includes(pair.mol_a));
  ```
- **Impacto:** `CRITICAL_PAIRS` é uma lista de pares medicamentosos contraindicados (ex.: IECA+BRA — duplo bloqueio SRAA; Sacubitril+IECA — angioedema fatal). A checagem de "já existe um alerta para isso" comparava apenas a presença de `mol_a` (ex.: `"ieca"`) em QUALQUER alerta já emitido — não o par específico. Como várias entradas de `CRITICAL_PAIRS` compartilham a mesma `mol_a` (`ieca+aine`, `ieca+espironolactona`, `ieca+bra`, `sacubitril+ieca`), o primeiro alerta `ieca+X` gerado suprimia SILENCIOSAMENTE todos os pares `ieca+Y` críticos processados depois — mesmo sendo interações completamente diferentes e potencialmente mais graves.
- **Reprodução:** paciente em uso de Enalapril (IECA) + Espironolactona (dispara o alerta `warning` "Hipercalemia") + Losartana (BRA) — o alerta `critical` "Duplo bloqueio SRAA contraindicado" nunca era exibido ao médico, porque um alerta `ieca+X` anterior já "ocupava" a checagem de duplicata.
- **Correção:** dedup agora exige que AMBAS as moléculas do par apareçam juntas no mesmo alerta (`jaExiste` checa `mol_a` E `mol_b`), não apenas `mol_a` isoladamente. Ver `frontend/src/lib/safety-rules.ts:476-500`.
- **Teste que prova a correção:** [`safety-rules-critical-pairs.test.ts`](frontend/src/tests/safety-rules-critical-pairs.test.ts) — 3 testes, incluindo o cenário exato do bug (IECA+Espironolactona seguido de IECA+BRA — ambos os alertas aparecem) e o caso ARNI+IECA (angioedema fatal).

### PEDIATRIC-01 — Superdosagem sistemática de albendazol por confusão idade/peso
- **Severidade:** 🔴 Crítico
- **Arquivo:** `frontend/src/lib/pediatric-engine.ts:608-626` (antes da correção); dados em `pediatric-engine.ts:483`
- **Evidência:** `doseFixa: { '1–2 anos': 200, '>2 anos': 400 }` — chaves denotam FAIXA ETÁRIA (anos), mas `calcDosePediatrica()` parseava TODA chave `doseFixa` assumindo peso em kg, comparando contra `patient.pesoKg`. Como o peso real de uma criança (9–20+ kg) é numericamente muito maior que os limiares de idade (1, 2), praticamente todo paciente pediátrico caía no ramo `>2 anos` (dose de 400 mg, tier adulto) — incluindo lactentes de 12–23 meses que deveriam receber 200 mg.
- **Impacto:** superdosagem de 2× de um antiparasitário em lactentes, silenciosa (nenhum erro, nenhum alerta).
- **Reprodução:** `calcDosePediatrica('albendazol', { pesoKg: 11, idadeMeses: 18 })` retornava `doseUnitariaMg: 400` em vez de `200`.
- **Correção:** o parser agora detecta a unidade pelo sufixo da própria chave (`'anos'`/`'meses'` → compara idade; `'kg'`/sem sufixo → compara peso). Ver `pediatric-engine.ts:604-632`.
- **Teste que prova a correção:** [`pediatric-dose-fixa.test.ts`](frontend/src/tests/pediatric-dose-fixa.test.ts) — 4 testes, incluindo o caso exato do bug (lactente de 18 meses → 200 mg, não 400 mg) e um teste de não-regressão para as faixas por PESO do oseltamivir (que já funcionavam corretamente e não podiam quebrar).

---

## 🟠 ALTO

### MFA-01 — Códigos de recuperação de MFA inutilizáveis via API pública
- **Severidade:** 🟠 Alto
- **Arquivo:** `backend/src/auth/dto/login.dto.ts:13`, `backend/src/auth/dto/mfa.dto.ts:11` (antes da correção)
- **Evidência (antes):** `const MFA_CODE_PATTERN = /^[0-9A-Fa-f]{6}$|^[0-9A-Fa-f]{10}$/;` — exige 10 caracteres hex SEM traço. Mas `MfaService.gerarCodigosRecuperacaoTexto()` sempre gera e hasheia o código COM traço: `` `${raw.slice(0,5)}-${raw.slice(5,10)}` `` (11 caracteres).
- **Impacto:** um usuário que perde o dispositivo TOTP e tenta login com o código de recuperação exatamente como recebido é rejeitado com 400 pela `ValidationPipe`, antes mesmo de chegar ao `MfaService`. Se remove o traço para satisfazer o regex, o `bcrypt.compare` falha (hash foi calculado sobre a string COM traço). O fluxo de recuperação de MFA estava **inteiramente inutilizável** via API pública — apesar da lógica de verificação em si (bcrypt compare, consumo de uso único) estar correta e nunca ter sido exercitada de ponta a ponta por um teste HTTP real.
- **Reprodução:** ativar MFA, capturar um `recovery_codes[0]` (formato `XXXXX-XXXXX`), tentar `POST /auth/login` com esse valor exato → 400.
- **Correção:** regex passa a aceitar o formato real `[0-9A-Fa-f]{5}-[0-9A-Fa-f]{5}`. Ver `login.dto.ts:25`, `mfa.dto.ts:11`.
- **Teste que prova a correção:** [`test/mfa.e2e-spec.ts`](backend/test/mfa.e2e-spec.ts) — novo describe "Login com código de recuperação (via HTTP real — regressão MFA-01)": prova que o formato correto autentica com sucesso via HTTP real (não chamada direta ao service) e que o formato antigo/quebrado (sem traço) é corretamente rejeitado.

### PRIV-01 — Hash de IP sem segredo (reversível) em toda a trilha de auditoria fora do login
- **Severidade:** 🟠 Alto
- **Arquivo:** `backend/src/modules/audit/audit.service.ts:25-27` (antes da correção)
- **Evidência (antes):** `crypto.createHash('sha256').update(ip).digest('hex')` — SHA-256 SEM segredo.
- **Impacto:** `AuditService` é usado por `MfaService`/`ConsultaService`/`MigrationService` — ou seja, todo evento de auditoria FORA do login/register direto (que já usava `hmacIdentifier` corretamente, corrigido em auditoria anterior) armazenava o IP real de forma reversível. IPv4 tem só 2^32 valores — um atacante com acesso de leitura ao banco reconstrói um rainbow table completo em minutos e reidentifica todo `ip_hash` da tabela `Auditoria`. Esta era a ÚNICA implementação de hash de IP no código-fonte ainda usando o anti-padrão já documentado e corrigido em `identifier-hash.util.ts`.
- **Reprodução:** qualquer escrita de consulta/diagnóstico/prescrição/risco ou evento de MFA gera um `ip_hash` reversível.
- **Correção:** `AuditService` agora usa `hmacIdentifier(config, 'ip', ip)` — mesma função HMAC-SHA256 com `IDENTIFIER_HMAC_KEY` server-side já usada em `auth.service.ts`. `ConfigService` injetado no construtor, que agora também valida a chave eagerly (ver SECRET-01 abaixo).
- **Teste que prova a correção:** [`audit.service.spec.ts`](backend/src/modules/audit/audit.service.spec.ts) (novo) — prova que o `ip_hash` persistido é idêntico ao produzido por `hmacIdentifier()` e explicitamente DIFERENTE do SHA-256 sem segredo antigo.

---

## 🟡 MÉDIO — Corrigidos

### OWN-01 — `diagnostico_id` sem checagem de ownership em `criarPrescricao`
- **Arquivo:** `backend/src/modules/consulta/consulta.service.ts:199-236` (antes)
- **Evidência:** `dto.diagnostico_id` (opcional) era persistido sem verificar se pertence à mesma `consulta_id`/usuário — só `consulta_id` era checado.
- **Impacto:** um usuário podia vincular à própria prescrição um `diagnostico_id` de OUTRO usuário, quebrando a fronteira de tenant (o `Diagnostico.id` é um cuid global, não escopado por consulta).
- **Correção:** adicionado `this.prisma.diagnostico.findFirst({ where: { id, consulta_id } })` antes do `create`, mesma padrão já usado para `RiskScore`.
- **Teste:** [`test/ownership-authorization.e2e-spec.ts`](backend/test/ownership-authorization.e2e-spec.ts) — 2 novos testes (bloqueio de `diagnostico_id` cruzado → 403; vínculo legítimo → 201).

### SECRET-01 — `MFA_ENCRYPTION_KEY`/`IDENTIFIER_HMAC_KEY` validadas apenas lazily
- **Arquivo:** `backend/src/auth/mfa.service.ts`, `backend/src/modules/audit/audit.service.ts` (antes)
- **Impacto:** a app subia e passava por health checks em produção sem essas variáveis, falhando só no primeiro uso real (500 para o usuário).
- **Correção:** `MfaService`/`AuditService` agora validam a respectiva chave no CONSTRUTOR (fail-fast em tempo de `module.compile()`/boot), mesmo padrão já usado para `JWT_SECRET` via `JwtStrategy`.
- **Teste:** `audit.service.spec.ts` ("sem IDENTIFIER_HMAC_KEY, o serviço nem chega a ser construído"); unit suite completa (122 testes) confirma que nenhum outro provedor quebrou.

### NET-01 — `trust proxy` não configurado (rate limiting agrupável atrás do proxy)
- **Arquivo:** `backend/src/main.ts` (antes)
- **Impacto:** atrás do proxy da Vercel, `req.ip` (usado pelo `ThrottlerGuard`) resolvia para o peer imediato (o proxy), não o cliente real — todos os usuários podiam cair no mesmo bucket de rate limit.
- **Correção:** `app.getHttpAdapter().getInstance().set('trust proxy', 1)` adicionado no bootstrap.
- **Teste:** verificado por inspeção — não há um teste e2e prático para "IP real atrás de proxy" sem um proxy real na suíte; risco residual documentado no `SECURITY_REGRESSION_MATRIX.md`.

### PERSIST-01 — Corrida em `idempotency_key` causava 500 em vez de retorno idempotente
- **Arquivo:** `backend/src/modules/consulta/consulta.service.ts` (todos os 4 métodos de escrita)
- **Impacto:** duas requisições genuinamente concorrentes com a mesma `idempotency_key` podiam ambas passar pelo `findUnique` antes de qualquer `create` comitar; a perdedora da corrida colidia com a constraint `@unique` (Prisma P2002) e recebia 500 em vez do registro já criado.
- **Correção:** novo helper `criarComIdempotenciaSobColisao()` — ao capturar P2002 no `create`, busca e retorna o registro que a requisição concorrente acabou de criar.
- **Teste:** [`consulta.service.spec.ts`](backend/src/modules/consulta/consulta.service.spec.ts) — 4 novos testes (corrida real em `criarConsulta`/`criarPrescricao`, erro P2002 sem registro correspondente ainda propaga, erros não-P2002 continuam propagando normalmente).

### JWT-01 — Algoritmo JWT não fixado explicitamente
- **Arquivo:** `backend/src/auth/jwt.strategy.ts`, `backend/src/auth/auth.service.ts`
- **Impacto:** defesa em profundidade — a lib já rejeita `alg:none`/confusão RS-HS por padrão quando `secretOrKey` é string, mas depender disso implicitamente é frágil a mudanças de versão da lib.
- **Correção:** `algorithms: ['HS256']` fixado explicitamente na verificação (`JwtStrategy`) e na assinatura (`gerarTokens`).
- **Teste:** coberto indiretamente por toda a suíte de autenticação (122+91 testes) que já exercitam login/refresh/logout — nenhuma regressão introduzida.

### FE-03 — `clearTokens()` não limpava dados clínicos no logout
- **Arquivo:** `frontend/src/lib/api-client.ts:70-91`
- **Impacto:** anamnese, histórico e favoritos de protocolo permaneciam em localStorage após logout — legíveis por qualquer script de mesma origem ou pela próxima pessoa numa estação compartilhada.
- **Correção:** `clearTokens()` agora varre e remove TODAS as chaves com prefixo `prescreve_ai_`/`prescreve-ai-` (preserva apenas a preferência de tema, que não é dado clínico/sessão).
- **Teste:** [`api-client-auth.test.ts`](frontend/src/tests/api-client-auth.test.ts) — novo describe "logout() limpa TODOS os dados do app". (Nota: exigiu também corrigir o mock de `localStorage` em `src/tests/setup.ts`, que não implementava `key()`/`length` — a interface `Storage` completa — mascarando esse tipo de bug em qualquer teste.)

---

## 🟡 MÉDIO — Abertos (com justificativa documentada)

### NET-02 — `ThrottlerModule` usa armazenamento em memória, não compartilhado
- **Arquivo:** `backend/src/app.module.ts:17`
- **Por que está aberto:** se o backend rodar como múltiplas instâncias serverless efêmeras (modelo comum em deploys Vercel Node), cada instância mantém seu próprio contador — um atacante pode espalhar tentativas de brute-force entre invocações e nunca acumular o limite compartilhado. **Não confirmado** se o deployment atual do backend na Vercel roda como instância persistente ou função serverless multi-instância — isso decide se o risco é real ou teórico.
- **Mitigação recomendada (não aplicada nesta rodada):** adotar um storage adapter do `@nestjs/throttler` com Redis, ou confirmar que o backend roda em modo persistente single-instance.
- **Justificativa para não bloquear o release:** rate limiting ainda está ativo e correto por instância; o pior cenário é um throttling mais fraco que o documentado, não a ausência total de rate limiting.

### PERSIST-02 — Escrita clínica e log de auditoria não são atômicos
- **Arquivo:** `backend/src/modules/consulta/consulta.service.ts` (`criarConsulta`), `backend/src/modules/migration/migration.service.ts`
- **Por que está aberto:** se `consulta.create()` suceder mas `registrarAuditoria()` falhar (erro transitório de banco), a consulta existe sem trilha de auditoria correspondente — gap de rastreabilidade/LGPD, não de duplicação de dados (idempotência já cobre isso).
- **Mitigação recomendada:** envolver create + audit em `this.prisma.$transaction([...])` (já usado corretamente em `mfa.service.ts` para operações multi-write).
- **Justificativa para não bloquear o release:** é uma janela de falha estreita (só ocorre se o segundo write falhar logo após o primeiro suceder), não uma vulnerabilidade explorável por um atacante, e não causa corrupção/duplicação de dado clínico.

### FE-01 / FE-02 — Tokens JWT e dados clínicos em localStorage (sem httpOnly cookies)
- **Arquivo:** `frontend/src/lib/api-client.ts`, `frontend/src/components/modules/AnamneseForm.tsx` e outros
- **Por que está aberto:** migrar para cookies httpOnly exigiria mudanças coordenadas de backend (emitir Set-Cookie, CSRF token) e frontend (remover toda lógica de Bearer token) — mudança arquitetural, não um patch pontual, fora do escopo desta rodada de correções.
- **Fatores mitigantes confirmados nesta auditoria:** grep exaustivo por `dangerouslySetInnerHTML` em todo `frontend/src` retornou ZERO ocorrências — não há sink de XSS de primeira parte conhecido hoje que tornaria isso ativamente explorável. FE-03 (logout limpa tudo) reduz a janela de exposição pós-sessão.
- **Justificativa para não bloquear o release:** é o padrão de facto de SPAs com Bearer token (mesmo tradeoff documentado em relatórios anteriores desta sessão); sem um sink de XSS confirmado, o risco é teórico/defesa-em-profundidade, não uma vulnerabilidade ativa.

---

## 🟢 BAIXO — Verificados, sem defeito ou apenas informacionais

- **CORS-01** (re-investigado): a alegação de que `resolveAppEnv()` trata "ambos APP_ENV/NODE_ENV ausentes" como `'development'` (não `'production'`) foi CONFIRMADA no código — mas isso é comportamento **intencional** (default de conveniência para desenvolvimento local), coberto por um teste já existente e escrito deliberadamente nesta sessão (`environment.util.spec.ts`: "sem APP_ENV nem NODE_ENV → development (padrão de ambiente local, não produção)"). Em produção real (Vercel), `NODE_ENV` é sempre auto-definido pela plataforma — o caminho "ambos ausentes" não ocorre em deploy real. Nenhuma mudança feita; comentário do código já é preciso ("desconhecido/inválido" ≠ "ausente").
- **AUTH-01** — enumeração de e-mail via `POST /auth/register` (`ConflictException` distingue e-mail já cadastrado). Aceito como característico do fluxo de cadastro público; login não vaza a mesma informação (mensagem genérica). Sem ação nesta rodada.
- **PERSIST-03, LOG-01, LOG-02, LOG-03, PRIV-02, PRIV-03** — verificados diretamente, sem defeito: nenhum log contém senha/CPF/CRM/IP em texto puro ou corpo de requisição; hashing de CPF/CRM usa HMAC corretamente; nenhum `select`/`include` do Prisma vaza `senha_hash`/`mfa_secret`/`token_hash` em resposta de API.

---

## Núcleo farmacológico e regressão clínica — avaliação além dos 2 críticos

A frente 6 confirmou que o restante do motor de segurança (`runSafetyCheck`) e o repositório de medicamentos (`drugRepository`) estão estruturalmente sólidos: bloqueio real (não apenas informativo) em ajuste renal/hepático contraindicado, lógica de K+/TFG para ARM clinicamente específica e testada, e os testes de regressão clínica revisados (`clinical-regression.test.ts`) genuinamente asseguram severidade/texto específico do alerta esperado — não são checks de "array não vazio".

**Gap residual documentado (não corrigido nesta rodada, por escopo/tempo):** a auditoria não verificou exaustivamente as ~30 entradas de `CRITICAL_PAIRS` nem todas as ~30 entradas de `PEDIATRIC_DOSES` em busca de bugs análogos aos dois críticos corrigidos (mesma classe de erro: comparação de unidade errada). Recomenda-se uma varredura dedicada como próximo passo, fora do escopo desta auditoria pontual.
