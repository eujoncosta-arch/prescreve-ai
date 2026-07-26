# Auditoria de Validação de Entrada — Backend Prescreve-AI

Data: 2026-07-25
Escopo: todos os DTOs do backend — strings, arrays aninhados, enums, números, datas, IDs, campos clínicos, prescrições, medicamentos, scores, anamnese, filtros e paginação.

## Resumo executivo

A `ValidationPipe` global (`whitelist`/`forbidNonWhitelisted`/`transform`) já estava ativa desde sessão anterior, mas vários DTOs tinham campos **sem nenhum decorator de tipo/limite** — aceitos apenas porque `@IsOptional()` (ou nada) bastava para sobreviver ao whitelist, sem checar tipo, formato, tamanho ou intervalo. O caso mais grave era `POST /api/risco`: o campo `score` inteiro era `Record<string, unknown>` — um blob sem validação nenhuma, incluindo `risco_global` (um enum do Prisma) aceito como qualquer string e só "validado" tarde, no `INSERT` do banco (erro 500 de runtime em vez de 400 de validação). `POST /api/migration` usava um tipo inline (não uma classe decorada), então a `ValidationPipe` não tinha efeito nenhum sobre ele — campos desconhecidos, arrays sem limite e strings sem limite passavam livremente.

Todos os DTOs foram reescritos com: tipo explícito, `@MaxLength` em toda string, `@ArrayMaxSize`/`@ArrayMinSize` em todo array, `@IsEnum` contra o enum real do Prisma (nunca uma string solta), `@Min`/`@Max` em todo número, e `@ValidateNested` + `@Type()` em todo objeto aninhado. Paginação (`GET /api/consultas`) passou de parsing manual (`Number(query)`, sem checagem — uma entrada não numérica virava `NaN` e seguia para o Prisma) para um DTO validado com teto explícito. IDs em `@Param()` (fora do alcance de DTOs) ganharam um pipe dedicado.

Ao escrever os testes reais (HTTP, `ValidationPipe` ativa), um novo bug real foi encontrado e corrigido: `POST /api/risco` sem o campo `score` chegava a um `500` (crash no service, `undefined.risco_global`) em vez de `400` — corrigido com `@IsObject()` explícito.

## 1. DTOs auditados

| DTO | Arquivo | Endpoint(s) |
|---|---|---|
| `LoginDto` | `src/auth/dto/login.dto.ts` | `POST /auth/login` |
| `RefreshDto` | `src/auth/dto/login.dto.ts` | `POST /auth/refresh` |
| `RegisterDto` | `src/auth/dto/login.dto.ts` | `POST /auth/register` |
| `CriarUsuarioPrivilegiadoDto` | `src/auth/dto/login.dto.ts` | `POST /auth/admin/usuarios` |
| `AtivarMfaDto` | `src/auth/dto/mfa.dto.ts` | `POST /auth/mfa/ativar` |
| `DesativarMfaDto` | `src/auth/dto/mfa.dto.ts` | `POST /auth/mfa/desativar` |
| `CriarConsultaDto` | `src/modules/consulta/dto/consulta.dto.ts` | `POST /api/consulta` |
| `CriarDiagnosticoDto` | `src/modules/consulta/dto/consulta.dto.ts` | `POST /api/diagnostico` |
| `ItemMedicamentoDto` (nested) | `src/modules/consulta/dto/consulta.dto.ts` | dentro de `CriarPrescricaoDto.medicamentos` |
| `CriarPrescricaoDto` | `src/modules/consulta/dto/consulta.dto.ts` | `POST /api/prescricao` |
| `RiskScorePayloadDto` (nested, **novo**) | `src/modules/consulta/dto/consulta.dto.ts` | dentro de `SalvarRiscoDto.score` |
| `SalvarRiscoDto` | `src/modules/consulta/dto/consulta.dto.ts` | `POST /api/risco` |
| `PaginacaoQueryDto` (**novo**) | `src/modules/consulta/dto/consulta.dto.ts` | `GET /api/consultas` |
| `LocalPrescricaoDto` (nested, **novo**) | `src/modules/migration/dto/migration.dto.ts` | dentro de `MigrarHistoricoDto.prescricoes` |
| `LocalValidacaoDto` (nested, **novo**) | `src/modules/migration/dto/migration.dto.ts` | dentro de `MigrarHistoricoDto.validacoes` |
| `MigrarHistoricoDto` (**novo** — substitui tipo inline sem validação) | `src/modules/migration/dto/migration.dto.ts` | `POST /api/migration` |

`GET /api/evidence/:cid`, `GET /api/rwe/:cid`, `GET /api/consulta/:id` não usam DTO de corpo (são `@Param()`) — tratados na seção 3.

## 2. Alterações por DTO

### `LoginDto` / `RefreshDto` / `RegisterDto` / `CriarUsuarioPrivilegiadoDto`
- `email`: `+@MaxLength(254)` (RFC 5321 — teto padrão de e-mail).
- `senha`: `+@MaxLength(72)` — bcrypt trunca/ignora acima de 72 bytes; sem teto, um cliente podia enviar uma string gigante só para forçar hashing caro.
- `mfa_code` (Login): antes `@IsString()` livre; agora `@Matches(/^[0-9A-Fa-f]{6}$|^[0-9A-Fa-f]{10}$/)` — aceita TOTP (6 dígitos) ou código de recuperação (10 hex), nunca uma string arbitrária.
- `refresh_token`: `+@MaxLength(2000)`.
- `crm`/`especialidade`: `+@MaxLength` (20/100).
- `uf`: antes livre; agora `@Matches(/^[A-Za-z]{2}$/)` — sigla de estado, 2 letras (case-insensitive: nenhum uso de `uf` em maiúsculas forçadas foi confirmado no frontend, então a checagem não exige caixa específica — evita repetir o bug encontrado abaixo com `medicamentos`).

### `AtivarMfaDto` / `DesativarMfaDto`
- `AtivarMfaDto.code`: já tinha `@Length(6,6)`; adicionado `@Matches(/^\d{6}$/)` — garante dígitos, não apenas 6 caracteres quaisquer.
- `DesativarMfaDto.senha`: `+@MaxLength(72)`.
- `DesativarMfaDto.code`: antes `@IsString()` livre (podia aceitar qualquer string); agora mesmo padrão TOTP-ou-recuperação do `LoginDto`.

### `CriarConsultaDto`
- `paciente_hash`: antes `@IsString()` livre; agora `@Matches(/^[a-fA-F0-9]{64}$/)` — é um hash SHA-256, sempre 64 hex.
- `anamnese`: continua `Record<string, unknown>` **deliberadamente** — é um campo clínico de forma variável por fluxo (idade, sexo, comorbidades, texto livre, etc.); redesenhar seu schema está fora do escopo desta auditoria de validação de entrada. Ganhou, porém, `@MaxJsonSize(50_000)` (novo decorator custom) — teto de 50KB serializado, impedindo payload-bomba mesmo sem validar a forma exata.

### `CriarDiagnosticoDto`
- `consulta_id`: `+@IsNotEmpty() +@MaxLength(100)`.
- `cid`: `+@IsNotEmpty() +@MaxLength(10)` (códigos CID têm no máximo ~7 caracteres).
- `descricao`: `+@IsNotEmpty() +@MaxLength(500)`.
- `confianca`: antes só `@IsOptional()` — **nenhum tipo validado**; agora `@IsNumber() @Min(0) @Max(1)`.
- `selecionado`: antes só `@IsOptional()`; agora `@IsBoolean()`.

### `ItemMedicamentoDto` (novo, nested em `CriarPrescricaoDto`)
- Todos os campos (`molecula`, `dose`, `via`, `frequencia`, `duracao`, `observacoes`) ganharam `@IsNotEmpty()` (exceto o opcional `observacoes`) e `@MaxLength` (200/100/50/100/100/1000 respectivamente) — antes eram strings sem teto nenhum.

### `CriarPrescricaoDto`
- `medicamentos`: já tinha sido corrigido na auditoria de ownership anterior (bug: sem NENHUM decorator, endpoint inteiro quebrado por `whitelist`). Nesta auditoria, ganhou `@ArrayMinSize(1)` (uma prescrição sem medicamento não faz sentido) e `@ArrayMaxSize(50)`.
- `orientacoes`: `+@MaxLength(5000)`.
- `validade_dias`: antes só `@IsInt()`; agora `+@Min(1) @Max(365)` — impede validade negativa ou absurda (ex.: 999999 dias).
- `diagnostico_id`: `+@MaxLength(100)`.

### `RiskScorePayloadDto` (novo) / `SalvarRiscoDto`
Antes, `score` era `Record<string, unknown>` — **zero validação**: qualquer tipo, qualquer valor, `risco_global` aceito como qualquer string e só castado no service. Reescrito como objeto tipado e aninhado:
- `risco_global`: `@IsEnum(NivelRisco)` — validado contra o enum REAL do Prisma (`baixo | intermediario | alto | muito_alto | critico`), nunca mais um cast cego de string.
- `score_global`: `@IsNumber() @Min(0) @Max(100)` — confirmado contra a escala real usada no motor de risco do frontend (`frontend/src/lib/clinical-risk-engine.ts`: "média ponderada 0–100").
- `alerta_vermelho`: `@IsOptional() @IsBoolean()`.
- `risco_cardiovascular`/`risco_renal`/`risco_hemorragico`/`risco_farmacologico`/`risco_interacao`/`risco_terapeutico`: continuam `Record<string, unknown>` (estrutura interna de cada dimensão de risco não é fixa — não redesenhada aqui), mas cada um ganhou `@MaxJsonSize(5_000)`.
- `recomendacoes_prioritarias`: `@IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({each:true})`.
- `SalvarRiscoDto.score`: ganhou `@IsObject()` além de `@ValidateNested()`+`@Type()` — **achado real** durante os testes desta auditoria: sem `@IsObject()`, enviar a requisição SEM o campo `score` não era rejeitado pela pipe (passava como `undefined`) e derrubava o service com `500` (`Cannot read properties of undefined`). Corrigido.
- `consulta_id`: `+@IsNotEmpty() @MaxLength(100)`.

`src/modules/consulta/consulta.service.ts` foi atualizado para consumir os campos já tipados (`score.risco_global` etc.) em vez de castar um blob solto — o `INSERT` no Prisma agora só recebe dados já validados na borda.

### `PaginacaoQueryDto` (novo)
Antes, `listarConsultas` recebia `@Query('pagina')`/`@Query('limite')` como strings soltas, convertidas manualmente via `Number(x ?? padrão)` — sem checagem nenhuma. Uma query `?pagina=abc` virava `NaN`, seguindo para o Prisma sem qualquer validação (comportamento indefinido/erro tardio). Novo DTO com `@Type(() => Number) @IsInt() @Min(1)` (pagina) e `@Min(1) @Max(100)` (limite) — agora **rejeitado com 400** antes de chegar ao service, e o teto de 100 impede um cliente de pedir uma página com um `limite` arbitrariamente grande.

### `MigrarHistoricoDto` / `LocalPrescricaoDto` / `LocalValidacaoDto` (novos)
`POST /api/migration` usava um **tipo inline** (`{ prescricoes?: unknown[]; ... }`) — não uma classe decorada por `class-validator`. A `ValidationPipe` global não tem efeito nenhum sobre um tipo que só existe em tempo de compilação: campos desconhecidos, arrays de tamanho arbitrário e strings sem limite passavam livremente para o service (que já tratava erros por item em try/catch, mas sem NENHUMA validação de forma/tamanho de entrada). Substituído por 3 DTOs reais:
- `MigrarHistoricoDto.prescricoes`/`.validacoes`: `@ArrayMaxSize(200)` cada, `@ValidateNested({each:true})`.
- `LocalPrescricaoDto`/`LocalValidacaoDto`: todo campo string ganhou `@MaxLength`; `medicamentos` (array livre, dado histórico) ganhou `@ArrayMaxSize(50)`.
- `consultas`: continua `unknown[]` (blob histórico de anamneses migradas, forma livre por natureza — mesmo raciocínio de `anamnese`), mas ganhou `@ArrayMaxSize(500)`.

## 3. IDs fora de DTO (`@Param()`) — novo `ParseSafeIdPipe`

`GET /api/consulta/:id`, `GET /api/evidence/:cid`, `GET /api/rwe/:cid` recebem o identificador como parâmetro de rota — fora do alcance de qualquer DTO/`ValidationPipe`. Antes, um `@Param('id') id: string` aceitava literalmente qualquer string, de qualquer tamanho, direto ao Prisma. Como os IDs deste projeto são `cuid()` (não UUID — `ParseUUIDPipe` do Nest não se aplica) e os `cid` são códigos CID (podem conter ponto, ex. `"E11.9"`), foi criado `src/common/pipes/parse-safe-id.pipe.ts`: um alfabeto seguro (`[a-zA-Z0-9_.-]`) com teto de 64 caracteres, aplicado via `@Param('id', ParseSafeIdPipe)`. Não valida formato exato de cuid (evitando quebrar IDs legítimos por um regex frágil demais) — apenas impõe um teto de forma/tamanho, rejeitando com `400` antes de qualquer consulta ao banco.

## 4. Configuração global (`main.ts`)

| Item | Antes | Depois |
|---|---|---|
| `whitelist`/`forbidNonWhitelisted` | Já ativos (sessão anterior) | Mantidos |
| `forbidUnknownValues` | Não declarado explicitamente | `true` explícito — protege contra objetos sem NENHUMA metadata de validação passando despercebidos |
| Teto de tamanho de corpo de requisição | Nenhum limite explícito (dependia do default implícito do body-parser interno do Nest) | `app.use(json({ limit: '1mb' }))` + `app.use(urlencoded({ extended: true, limit: '1mb' }))` — explícito e documentado, nunca mais implícito |

## 5. Novo utilitário: `@MaxJsonSize` (`src/common/validators/max-json-size.validator.ts`)

Decorator customizado de `class-validator` para campos Json intencionalmente livres em FORMA (`anamnese`, blocos `risco_*`) — impõe um teto no tamanho **serializado** do valor (`Buffer.byteLength(JSON.stringify(value))`), rejeitando objetos profundamente aninhados ou strings gigantes disfarçadas de JSON, sem exigir um schema fixo para cada campo clínico.

## 6. Testes adicionados

**Novo arquivo:** `test/input-validation.e2e-spec.ts` — 23 testes, aplicação Nest real (`ValidationPipe` real, guards reais, Prisma mockado), cobrindo os 8 cenários obrigatórios:

| Cenário exigido | Testes | Endpoint(s) exercitado(s) |
|---|---|---|
| Payload válido | 3 | diagnóstico (201), prescrição (201), risco (200) |
| Payload incompleto | 3 | diagnóstico sem `descricao`, prescrição sem `medicamentos`, risco sem `score` |
| Tipo incorreto | 3 | `confianca` string, `medicamentos` objeto em vez de array, `score_global` string |
| Campo desconhecido | 2 | campo extra no nível raiz do diagnóstico; campo extra dentro de um item aninhado de `medicamentos` |
| String excessiva | 2 | `descricao` de diagnóstico > 500 chars; `orientacoes` de prescrição > 5000 chars |
| Array excessivo | 2 | 51 medicamentos (limite 50); 21 `recomendacoes_prioritarias` (limite 20) |
| Enum inválido | 1 | `risco_global` fora de `NivelRisco` |
| Número fora do intervalo | 4 | `score_global` > 100, `score_global` negativo, `confianca` fora de [0,1], `validade_dias` > 365 |
| Paginação (extra) | 3 | `limite` dentro do permitido (200), `limite` acima do teto (400), `pagina` não numérico (400 — antes virava `NaN` sem checagem) |

Todos os 23 exercitam a `ValidationPipe` REAL via HTTP (`supertest`), não uma chamada direta ao service — prova que a rejeição acontece na borda, antes de qualquer lógica de negócio.

**Complementa** (sem duplicar) a suíte já existente: `test/authorization.e2e-spec.ts` e `test/ownership-authorization.e2e-spec.ts` continuam cobrindo IDOR/autorização; `test/hardening.e2e-spec.ts` continua cobrindo CORS/rate limiting/JWT. Um teste pré-existente (`authorization.e2e-spec.ts`, cenário de IDOR em `/risco`) tinha um payload `{ risco_global: 'alto' }` sem `score_global` — corrigido para incluir `score_global: 90`, já que esse campo passou a ser obrigatório (o objetivo do teste, bloqueio por ownership, continua sendo o que é verificado; só a fixture ficou realista).

## 7. Resultado dos gates

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ limpo |
| `npx eslint` (arquivos alterados/criados) | ✅ 0 erros/avisos |
| `npx jest` (unitário) | ✅ **69/69** (7 suítes) |
| `npx jest --config ./test/jest-e2e.json` (e2e) | ✅ **64/64** (6 suítes — 5 pré-existentes + `input-validation.e2e-spec.ts` novo) |
| `npm run build` | ✅ exit 0 |
| `node -e "require('./dist/src/app.module.js')"` | ✅ `APP_MODULE_LOADED_OK` |

## 8. Confirmação das restrições "NÃO"

- **Não confiar em validação apenas no frontend**: todo campo auditado é validado no backend, na `ValidationPipe` global, independentemente do que o frontend envie ou deixe de enviar.
- **Não aceitar campos desconhecidos silenciosamente**: `forbidNonWhitelisted: true` (já ativo) + `forbidUnknownValues: true` (endurecido nesta auditoria) + `MigrarHistoricoDto` substituindo o tipo inline que não tinha proteção nenhuma — confirmado por teste explícito (`campo_nao_existe_no_dto` → 400).
- **Não permitir payloads ilimitados**: toda string tem `@MaxLength`, todo array tem `@ArrayMaxSize`, campos Json livres têm `@MaxJsonSize`, e o corpo da requisição inteiro agora tem um teto explícito de 1MB no `main.ts`.

## 9. Riscos residuais

1. **`anamnese` e blocos `risco_*` continuam sem validação de FORMA** (apenas de tamanho) — são campos clínicos genuinamente variáveis; impor um schema rígido exigiria redesenhar a anamnese/motor de risco, fora do escopo desta auditoria de validação de entrada. Mitigado por `@MaxJsonSize`, não eliminado.
2. **`consultas` em `MigrarHistoricoDto` continua `unknown[]`** pelo mesmo motivo (dado histórico de forma livre) — mitigado por `@ArrayMaxSize(500)`.
3. **`ParseSafeIdPipe` não valida formato exato de `cuid()`** — deliberado (evita rejeitar IDs legítimos por um regex frágil), então ainda é possível enviar uma string de até 64 caracteres alfanuméricos que nunca corresponderá a um registro real; isso já resulta em `404`/lista vazia por design (não é uma vulnerabilidade, apenas uma checagem de forma mais permissiva que o ideal).
4. **Limite de corpo de 1MB é uma escolha própria, não derivada de um requisito de produto documentado** — generoso o suficiente para o maior payload legítimo hoje (lote de migração), mas deve ser revisto se um fluxo futuro precisar de payloads maiores (ex.: anexos/documentos, que não existem no schema atual).
5. **Datas**: nenhum DTO atual do backend aceita uma data como entrada direta do cliente (os únicos campos de data — `criado_em`, `expira_em`, etc. — são gerados no servidor via Prisma `@default(now())`/lógica interna, nunca recebidos no `Body`). Item do escopo ("validar datas") confirmado como não aplicável ao estado atual do código — nenhum DTO precisou de `@IsDateString()`/`@IsDate()`.
