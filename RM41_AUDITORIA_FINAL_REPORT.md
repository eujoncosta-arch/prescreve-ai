# RM-41 — Auditoria Final Independente de Prontidão para Expansão Clínica

**Papel:** auditor final independente (somente leitura — nenhum código foi alterado nesta RM).
**Data:** 2026-07-27.
**Escopo:** frontend, backend, Prisma, PostgreSQL, autenticação/autorização, persistência, APIs, motores clínicos (dose/pediatria/geriatria/gestação/renal/hepático/UTI/interações/CRITICAL_PAIRS), fontes de dados (marca↔molécula/classe/ATC/guideline/evidência/proveniência), contrato frontend↔backend, fallback/demo/offline, testes, CI/CD, build.

---

## 1. Relatório Executivo

Esta auditoria releu, do zero e de forma independente, todo o código atual (não a memória de auditorias anteriores) nas 30 áreas solicitadas, dividida em 5 frentes paralelas: (1) motores clínicos, (2) fontes de dados farmacológicos, (3) backend/Prisma/auth/persistência, (4) contrato frontend↔backend e fallback/demo/offline, (5) testes/CI/CD/build. Além disso, os gates de build (`tsc`, `eslint`, testes, `npm run build`) foram executados diretamente nesta sessão, não apenas delegados.

**Resultado:** o sistema tem uma base de engenharia clínica genuinamente madura (centenas de testes de regressão específicos, gates RM-23/RM-24 de consistência rodando no `prebuild`, MFA/JWT/CORS/rate-limit bem implementados, DTOs validados). Mas esta auditoria encontrou **11 achados 🔴 críticos** ainda abertos — incluindo dados de contraindicação "mortos" (nunca lidos pelo motor de cálculo), uma correção de bug de acentuação aplicada em um motor mas não replicada em outro paralelo, um arquivo de dados neurológicos com corrupção de encoding que torna alertas de segurança ilegíveis, dois gaps de trilha de auditoria (uma escrita clínica sem log de auditoria algum, e outra cujo log pode se perder permanentemente numa retentativa), um erro silencioso na UI que é mostrado ao médico como "sem conflitos entre diretrizes" quando na verdade o motor de verificação falhou, e **ausência total de pipeline de CI/CD** — nenhum dos gates de qualidade (tsc, eslint, testes, build, RM-23/24) é executado automaticamente em push/PR, dependendo 100% de disciplina manual.

Adicionalmente, o lint atual falha com **103 erros no frontend e 93 no backend** (majoritariamente regras novas do React Compiler não endereçadas, mais alguns erros reais de tipo `any` não seguro em guards de autorização) — o critério de saída "lint deve passar" **não é atendido hoje**.

**Conclusão: NÃO APTO para iniciar uma nova fase de expansão clínica.** Os motores de cálculo em si (dose, pediatria, UTI, interações) são majoritariamente sólidos e bem testados nas trilhas já auditadas em RM-01 a RM-40, mas os achados desta RM-41 mostram um padrão recorrente e estrutural: **correções de bug já identificadas e corrigidas em um motor não são sistematicamente replicadas nos motores paralelos que implementam a mesma lógica de forma independente** (ex.: normalização de acento, gating de contraindicação por prefixo de alerta, plausibilidade de sinais vitais). Esse padrão, mais os dois gaps de trilha de auditoria no backend e a ausência de CI, são bloqueadores diretos de expansão — expandir a base de dados/funcionalidades agora replicaria esses mesmos gaps estruturais para mais fármacos e mais cenários antes de serem corrigidos na base.

---

## 2. Matriz de Riscos

| Domínio | 🔴 Crítico | 🟠 Alto | 🟡 Médio | 🟢 Baixo | Total |
|---|---|---|---|---|---|
| Motores clínicos (dose/pediatria/UTI/interações) | 4 | 1 | 3 | 2 | 10 |
| Fontes de dados (marca/molécula/ATC/evidência/proveniência) | 1 | 2 | 2 | 0 | 5 |
| Backend/Prisma/persistência/auth | 2 | 0 | 1 | 1 | 4 |
| Contrato frontend↔backend / fallback / demo | 1 | 3 | 0 | 1 | 5 |
| Testes/qualidade de cobertura | 2 | 4 | 3 | 0 | 9 |
| CI/CD e build | 1 | 0 | 1 | 1 | 3 |
| **Total** | **11** | **10** | **10** | **5** | **36** |

**Critérios de saída não atendidos hoje:**
- ❌ Não há 🔴 aberto → **FALSO** (11 abertos).
- ❌ Não há 🟠 aberto → **FALSO** (10 abertos).
- ❌ Todos os defaults clínicos perigosos eliminados → **FALSO** (contraindicações "mortas"/incompletas em 3 motores; erro silencioso mascarado como "sem conflito").
- ❌ Nenhum fallback fictício em produção → **PARCIAL** (fallback demo/offline em si está bem isolado e rotulado — ver seção 3.4 — mas o `catch { return [] }` de conflitos de diretriz é um fallback fictício de fato).
- ⚠️ Persistência determinística → **PARCIAL** (idempotência e transações de MFA corretas; mas escrita clínica + log de auditoria não são atômicas em `consulta.service.ts`).
- ❌ Dose e unidade semanticamente validadas → **PARCIAL** (RM-40 cobre a base de dados; mas 2 motores de dose ainda têm bugs de unidade/contraindicação ativos).
- ❌ Todos os motores críticos com testes de fronteira → **FALSO** (CrCl/Cockcroft-Gault, 4 de 6 dimensões de risco clínico, e todas as funções de UTI sem teste real).
- ⚠️ Frontend/backend com contratos coerentes → **PARCIAL** (contrato de dose é coerente; contrato de nível de risco diverge; diagnóstico/risco nunca chegam a ser persistidos no backend).
- ✅ Todos os testes passam → **VERDADEIRO** (frontend 666/666, backend unit 135/135, e2e 128/128).
- ✅ Typecheck passa → **VERDADEIRO** (frontend e backend `tsc --noEmit` limpos).
- ❌ Lint passa → **FALSO** (103 erros frontend, 93 backend).
- ✅ Build passa → **VERDADEIRO** (`npm run build` do frontend sucesso, incluindo gates RM-23/24; porém build atual **não invoca eslint**, então os erros de lint não são hoje um bloqueador automático do build — o que é, em si, um gap de gate).

---

## 3. Lista Completa de Achados

### 3.1 Motores clínicos

#### RM41-001 — SMXTMP-CONTRAINDICACAO-MORTA
- **Severidade:** 🔴 crítico
- **Arquivo:linha:** `frontend/src/lib/dosing-engine.ts:430` (dado), `:173` (enforcement)
- **Reprodução:** `calcularDosagem(peso_kg, altura_cm, idade_dias=45, medicamento_smx_tmp, 'smxtmp-susp')` para um lactente de 45 dias.
- **Impacto:** SMX-TMP é contraindicado em &lt; 2 meses (kernicterus por deslocamento de bilirrubina — documentado no próprio `alerta_especial` do registro). O campo gravado é `contraindicacoes: ['neonato']`, mas a interface `MedicamentoDosagem` só lê `contraindicado_em`. O objeto compila apenas por um `as MedicamentoDosagem` que mascara o erro de tipo. Resultado: o motor calcula e retorna uma dose normalmente aplicável para um lactente de 45 dias — a contraindicação nunca é, de fato, verificada em código.
- **Causa raiz:** Campo com nome divergente (`contraindicacoes` vs. `contraindicado_em`) forçado através do type-checker via cast, tornando o dado morto.
- **Correção recomendada:** Renomear para `contraindicado_em: ['neonato','lactente']` e remover o cast `as MedicamentoDosagem`.
- **Teste necessário:** paciente de 45 dias + SMX-TMP → `ok:false` com mensagem de contraindicação, nunca dose calculada.
- **Status:** aberto.

#### RM41-002 — DIPIRONA-JANELA-CONTRAINDICACAO-COARSE
- **Severidade:** 🔴 crítico
- **Arquivo:linha:** `frontend/src/lib/dosing-engine.ts:487` (regra), `:173` (enforcement)
- **Reprodução:** `calcularDosagem(4, undefined, 60, medicamento_dipirona, 'dip-gotas')` — lactente de 60 dias (&lt; 3 meses).
- **Impacto:** A observação da regra diz "contraindicado &lt; 3 meses ou &lt; 5 kg", mas `contraindicado_em: ['neonato']` só bloqueia o bucket 0–27 dias. Um lactente de 28–89 dias (bucket `'lactente'`, 28–364 dias) não é bloqueado — o sistema de contraindicação só opera em granularidade de bucket populacional, incapaz de expressar um corte em dias/meses dentro de um mesmo bucket.
- **Causa raiz:** `contraindicado_em?: Populacao[]` é a única primitiva de contraindicação; falta verificação numérica de idade complementar (padrão que já existe em `pediatric-engine.ts` via `idadeMinMeses`/`idadeMaxMeses`).
- **Correção recomendada:** Adicionar `idadeMinDias`/`idadeMinMeses` em `RegraDoagem` e checá-los em `calcularDosagem()`.
- **Teste necessário:** paciente de 60 dias + dipirona gotas → `ok:false`.
- **Status:** aberto.

#### RM41-003 — PED-CONTRAINDICACAO-NAO-BLOQUEIA-APLICACAO
- **Severidade:** 🔴 crítico
- **Arquivo:linha:** `frontend/src/lib/pediatric-engine.ts:902-907`
- **Reprodução:** `calcDosePediatrica('aciclovir', { pesoKg: 20, idadeMeses: 60 }, 'Herpes neonatal')` (indicação neonatal forçada para criança de 5 anos).
- **Impacto:** Quando `idadeEfetiva` viola `idadeMinMeses`/`idadeMaxMeses`, o código faz `alertas.unshift('⚠ CONTRAINDICADO: ...')` mas continua calculando e retornando dose normalmente — não zera nem bloqueia. O padrão já estabelecido em `dose-calculator.ts` (correção UNIT-AUDIT-01) mostra que a UI (`DoseCalcCard.tsx`) só desabilita "Aplicar" para alertas prefixados "🚨", não "⚠" — prefixo usado aqui. Um médico pode aplicar com um clique uma dose fora da faixa etária segura sem bloqueio.
- **Causa raiz:** Inconsistência entre dois motores quanto ao contrato de severidade de alerta que efetivamente bloqueia a UI.
- **Correção recomendada:** Trocar prefixo para "🚨 CONTRAINDICADO" nas linhas 903/906; considerar zerar a dose quando a violação for contraindicação absoluta.
- **Teste necessário:** `idadeEfetiva` fora de `idadeMinMeses`/`idadeMaxMeses` → dose nula ou alerta com prefixo crítico consistente.
- **Status:** aberto.

#### RM41-004 — RISK-ENGINE-ACENTO-NAO-NORMALIZADO
- **Severidade:** 🔴 crítico
- **Arquivo:linha:** `frontend/src/lib/clinical-risk-engine.ts:434` (dado), `:449` (`contemTermo`, sem `stripAccents`)
- **Reprodução:** anamnese com `medicamentos_em_uso: [{ nome: 'Litio 900mg' }]` (sem acento) + nova prescrição de classe "diurético".
- **Impacto:** `avaliarRiscoInteracao()` usa `PARES_INTERACAO` com entrada `{a:'lítio', b:'diurético', gravidade:'alto'}` e `contemTermo` faz `.includes(termo)` sem normalizar acentos. `safety-rules.ts` já documenta e corrigiu exatamente esse bug (RM-36, `stripAccents`) — mas essa correção não foi replicada em `clinical-risk-engine.ts`, que mantém uma lista de pares paralela e independente. Como `medicamentos_em_uso` é texto livre digitado pelo médico, grafia sem acento é o caso comum — o par lítio+diurético (toxicidade por lítio, grave) deixa de contribuir ao score de risco.
- **Causa raiz:** Duplicação de lógica de matching entre `safety-rules.ts` (corrigido) e `clinical-risk-engine.ts` (não corrigido).
- **Correção recomendada:** Aplicar `stripAccents` em `clinical-risk-engine.ts`, ou eliminar a duplicação reaproveitando a lógica já corrigida.
- **Teste necessário:** medicamento em uso "litio" (sem acento) + prescrição "Diurético tiazídico" → fator `'Interação LÍTIO + DIURÉTICO'` presente.
- **Status:** aberto.

#### RM41-005 — ICU-FIO2-SEM-VALIDACAO-PLAUSIBILIDADE
- **Severidade:** 🟠 alto
- **Arquivo:linha:** `frontend/src/lib/icu-engine.ts:1056-1064` (cálculo PaO₂/FiO₂) vs. `:939-953` (`VitalCampo`, que não inclui `pao2`/`fio2`)
- **Reprodução:** `assessICUPatient({..., pao2: 90, fio2: 21})` (FiO₂ digitada como percentual inteiro em vez de fração).
- **Impacto:** Todos os demais sinais vitais passaram pelo tratamento RM-36 (`readVital`/faixas plausíveis); `pao2`/`fio2` ficaram de fora e são usados brutos, só protegidos por `>0`. Com FiO₂=21 em vez de 0,21, o resultado (90/21≈4,3) dispara falsamente "🚨 PaO₂/FiO₂ ... ARDS grave" — falso-positivo de alarme grave por erro de unidade não detectado.
- **Causa raiz:** `pao2`/`fio2` ficaram fora do refactor RM-36.
- **Correção recomendada:** Adicionar ambos a `VitalCampo`/`VITAL_PLAUSIBLE_RANGES` (`fio2: 0.21–1.0`, `pao2: 20–600`) e usar `readVital` antes de calcular a razão.
- **Teste necessário:** `assessICUPatient` com FiO₂=21 não deve gerar alerta de ARDS sem primeiro reportar FiO₂ implausível.
- **Status:** aberto.

#### RM41-006 — DOSE-CALC-PASSO-A-PASSO-INVERTIDO
- **Severidade:** 🟡 médio
- **Arquivo:linha:** `frontend/src/lib/dose-calculator.ts:149-164` (`calcWeightDose`)
- **Reprodução:** `calcWeightDose(20, 100, 2, 1000, 'mg')` → bruto 2000mg/dia > máximo 1000mg/dia.
- **Impacto:** `totalDia = Math.min(dosePerKg*peso, maxDiaDose)` já aplica o cap antes da checagem textual `if (totalDia > dosePerKg*peso)` — condição matematicamente sempre falsa. O texto do "passo a passo" sempre afirma "sem ajuste necessário" mesmo quando a dose foi de fato reduzida — contradiz o valor real. O campo `aviso` está correto; só o texto explicativo mente.
- **Causa raiz:** Comparação feita após o clamp, na ordem errada — mesma classe de bug já corrigida em `dosing-engine.ts` (UNIT-AUDIT-02), não replicada aqui.
- **Correção recomendada:** Trocar para `if (dosePerKg * peso > maxDiaDose)`.
- **Teste necessário:** `calcWeightDose(20,100,2,1000,'mg').passo_a_passo` deve conter aviso de excedente.
- **Status:** aberto.

#### RM41-007 — POPULACAO-BUCKET-INCONSISTENTE-ENTRE-MOTORES
- **Severidade:** 🟡 médio
- **Arquivo:linha:** `frontend/src/lib/dose-calculator.ts:357` (corte neonato `idadeAnos < 0.083` ≈ 30,3 dias) vs. `frontend/src/lib/dosing-engine.ts:50` (corte `idade_dias < 28`)
- **Reprodução:** paciente com 29 dias de vida.
- **Impacto:** classificado como `'neonato'` em um motor e `'lactente'` no outro — o mesmo paciente recebe rótulo populacional (e potencialmente regras de dose/contraindicação) diferente dependendo de qual motor a tela usa.
- **Causa raiz:** Duas implementações independentes da mesma classificação clínica.
- **Correção recomendada:** Unificar numa função compartilhada, ou corrigir `0.083` para `28/365=0.0767`.
- **Teste necessário:** paciente de 28 dias exatos → mesma classificação em ambos os motores.
- **Status:** aberto.

#### RM41-008 — DOMPERIDONA-CONCENTRACAO-AMBIGUA-SEM-PARSE
- **Severidade:** 🟡 médio
- **Arquivo:linha:** `frontend/src/lib/pediatric-engine.ts:731` (dado), `:1030-1042` (`volumeCalculado`, regex)
- **Reprodução:** `calcDosePediatrica('domperidona', {pesoKg:10, idadeMeses:6})`.
- **Impacto:** concentração cadastrada como `'1 mg/mL (10 mg/mL alguns frascos — verificar)'` — o próprio dado sinaliza ambiguidade de 10×. O regex de parsing não casa com "mg/mL" sem denominador numérico explícito. `volumeCalculado` fica `undefined` silenciosamente, sem aviso ao prescritor.
- **Causa raiz:** Regex incompleto + dado fonte inerentemente ambíguo.
- **Correção recomendada:** Resolver a ambiguidade da concentração real; ajustar regex; ou emitir alerta explícito de "conversão indisponível — concentração ambígua".
- **Teste necessário:** regressão garantindo `volumeCalculado` preenchido ou alerta explícito.
- **Status:** aberto.

#### RM41-009 — GETPEDIATRICAGEGROUP-DEAD-CODE-BUG-LATENTE
- **Severidade:** 🟢 baixo
- **Arquivo:linha:** `frontend/src/lib/dosing-engine.ts:309-316`
- **Impacto:** conflacia "idade cronológica < 1 mês" com "prematuridade" (conceito gestacional, não cronológico). Sem chamadores hoje (código morto), mas pronto para rotular incorretamente se for consumido no futuro.
- **Correção recomendada:** corrigir texto ou remover a função.
- **Status:** aberto (baixa prioridade).

#### RM41-010 — MIGRATE-DATA-ATUALIZACAO-EPOCH-PLACEHOLDER
- **Severidade:** 🟢 baixo (unificado com RM41-013, mesma raiz — ver seção fontes de dados)
- **Arquivo:linha:** `frontend/src/lib/pharma-core/migrate.ts:208`
- **Status:** aberto.

---

### 3.2 Fontes de dados (marca↔molécula, classe, ATC, evidência, proveniência)

_Baseline confirmado: `RM40_DATA_INTEGRITY_REPORT.md` — 737 entidades, 0 erro, 1 warning, 287 info_incompleta, 449 validado. Achados abaixo são gaps de cobertura do próprio RM-40 e da base subjacente, não contradições ao relatório._

#### RM41-011 — NEURO-B-MOJIBAKE-CORRUPTION
- **Severidade:** 🔴 crítico
- **Arquivo:linha:** `frontend/src/lib/pharma-database-neuro-b.ts:2-922` (arquivo inteiro; 324 ocorrências)
- **Reprodução:** `grep -c 'â€\|Ã£\|Ã©\|Ã³\|Ã¡\|Ã§' frontend/src/lib/pharma-database-neuro-b.ts` → 324 matches (0 em todos os arquivos irmãos). Ex.: lamotrigina linha 209/220, texto de alerta SJS/Stevens-Johnson e titulação lenta aparecem como `'RASH\SJS: titulaÃ§Ã£o MUITO lenta Ã© mandatÃ³ria'`.
- **Impacto:** ~20 entidades ativas (anticonvulsivantes, antidemenciais, benzodiazepínicos, lurasidona) têm `alertas_especiais`/`interacoes_importantes`/`subclasse` corrompidos — exatamente os campos de alerta de segurança que o app existe para exibir de forma legível ao prescritor. RM-40 nunca inspeciona integridade de encoding em campos de texto livre.
- **Causa raiz:** dupla codificação UTF-8 (bytes já UTF-8 reinterpretados como Latin-1/CP1252 e regravados) em algum ponto do histórico do arquivo.
- **Correção recomendada:** reparo de mojibake (decodificar UTF-8→recodificar Latin-1→decodificar UTF-8) sobre o arquivo; adicionar regra RM-40 `TEXTO_MOJIBAKE`.
- **Teste necessário:** regra que varre todos os campos de texto livre por assinatura de mojibake e falha com `erro`; teste de regressão de zero ocorrências em todos os `pharma-database*.ts`.
- **Status:** aberto.

#### RM41-012 — FONTE-AUSENTE-ACEITA-ATC-COMO-EVIDENCIA
- **Severidade:** 🟠 alto
- **Arquivo:linha:** `frontend/src/validation/data-integrity/engine.ts:122-131` (regra FONTE_AUSENTE) + `frontend/src/lib/pharma-core/migrate.ts:124-140` (`buildReferences`)
- **Reprodução:** ~130+ entradas (ex.: alprazolam, zolpidem, paracetamol, dipirona, prednisona) não têm `guidelines_referencia`/`nivel_evidencia`/`beers_criteria` mas têm um código ATC — `buildReferences()` cria uma `Reference{type:'ATC'}`, então `references.length===1` e `FONTE_AUSENTE` nunca dispara.
- **Impacto:** ATC é classificação da OMS, não evidência clínica. Substâncias controladas (benzodiazepínicos/Z-drugs) passam no "tem fonte" só por classificação, dando falsa sensação de dado auditado.
- **Correção recomendada:** `FONTE_AUSENTE` deve exigir referência do tipo `GUIDELINE`/`BULA`/`EVIDENCIA`, excluindo `ATC`/`PGX`/`BEERS`/`STOPP`/`START`.
- **Teste necessário:** entidade só com referência `ATC` ainda deve disparar `FONTE_AUSENTE` (ou uma regra `SEM_EVIDENCIA_REAL` separada).
- **Status:** aberto.

#### RM41-013 — PROVENANCE-EPOCH-PLACEHOLDER-NAO-SINALIZADO
- **Severidade:** 🟠 alto
- **Arquivo:linha:** `frontend/src/lib/pharma-core/migrate.ts:208`, `frontend/src/lib/governance/data-governance.ts:142,385`
- **Reprodução:** toda entidade migrada recebe `provenance.data_atualizacao: '1970-01-01T00:00:00.000Z'` fixo; nenhum validador checa esse sentinel.
- **Impacto:** qualquer feature futura que confie nesse campo para responder "esse dado está atualizado?" (banner de obsolescência, badge de "última verificação") não pode confiar nele hoje, e nada avisa um data steward disso.
- **Correção recomendada:** tornar o campo opcional (propagar `undefined`) ou adicionar regra `PROVENIENCIA_DATA_PLACEHOLDER`.
- **Teste necessário:** entidade com o sentinel epoch deve gerar achado em `checarBaseCanonica`/`validarRegistro`.
- **Status:** aberto.

#### RM41-014 — CROSS-DATABASE-EXCLUI-LAB-CATALOG
- **Severidade:** 🟡 médio
- **Arquivo:linha:** `frontend/src/validation/cross-database/validator.ts:8-27`
- **Impacto:** RM-24 afirma comparar "as 4 fontes internas" mas `lab-catalog.ts` (13 laboratórios, 1422 linhas) nunca é incluído em `extract()`/`SOURCES`, embora `migrate.ts` já o use na construção canônica — conflitos de marca/molécula introduzidos por essa 5ª fonte são invisíveis ao gate RM-24.
- **Correção recomendada:** adicionar `LAB_CATALOG` a `SOURCES`/`extract()`.
- **Status:** aberto.

#### RM41-015 — ORPHANED-VERIFIED-ANVISA-CATALOG-ENTRIES
- **Severidade:** 🟡 médio
- **Arquivo:linha:** `frontend/src/lib/lab-catalog.ts:1038-1057` (`az-farxiga-10`) vs. `frontend/src/lib/pharma-database.ts:1263-1266`
- **Impacto:** registro ANVISA verificado para dapagliflozina sob o nome `'Farxiga®'` (nome americano — bug de dados em si, já que o nome BR/EU real é "Forxiga") nunca é alcançado pela app porque `pharma-database.ts` lista a marca como `'Forxiga'` sem `produto_id`; matching estrito por `toBrandId` nunca casa. Mesmo padrão em Busonid®/Formoterol Eurofarma/Metformina EMS/Omeprazol EMS.
- **Correção recomendada:** corrigir a grafia em `lab-catalog.ts`; adicionar rule RM-24/40 de "produto lab-catalog órfão".
- **Status:** aberto.

---

### 3.3 Backend / Prisma / PostgreSQL / autenticação / autorização / persistência

#### RM41-016 — RISK-SCORE-NEVER-AUDITED
- **Severidade:** 🔴 crítico
- **Arquivo:linha:** `backend/src/modules/consulta/consulta.service.ts:343-388` (`salvarRiskScore`)
- **Reprodução:** `POST /api/risco` com `alerta_vermelho: true` — registro é criado via `prisma.riskScore.create(...)`.
- **Impacto:** ao contrário de todo método irmão (`criarConsulta`, `criarDiagnostico`, `criarPrescricao`, login, MFA), `salvarRiskScore` nunca chama `audit.registrarAuditoria(...)`. Persistir um risco crítico ("alerta vermelho") não deixa NENHUM traço na tabela `Auditoria` — quebra a garantia de trilha de auditoria LGPD que o próprio schema documenta.
- **Causa raiz:** chamada de auditoria simplesmente omitida ao extrair/corrigir este método (o fix de IDOR documentado não incluiu o requisito de auditoria).
- **Correção recomendada:** adicionar `audit.registrarAuditoria(...)` após a criação, idealmente na mesma transação (ver RM41-017).
- **Teste necessário:** asserção de que `audit.registrarAuditoria` é chamado exatamente uma vez após `salvarRiskScore` bem-sucedido, incluindo quando `alerta_vermelho:true`.
- **Status:** aberto.

#### RM41-017 — CLINICAL-WRITE-AUDIT-NOT-ATOMIC-PERMANENT-GAP-ON-RETRY
- **Severidade:** 🔴 crítico
- **Arquivo:linha:** `backend/src/modules/consulta/consulta.service.ts:98-162` (`criarConsulta`), `:200-244` (`criarDiagnostico`), `:248-330` (`criarPrescricao`)
- **Reprodução:** create clínico e `registrarAuditoria` são statements separados, não em `$transaction`. Se o segundo falhar (erro transitório de DB), o registro clínico já está commitado mas sem log de auditoria.
- **Impacto:** o cliente recebe erro e retenta com o mesmo `idempotency_key` — mas `buscarPorIdempotencyKey` retorna o registro existente e `return`s antes de rechamar a auditoria. Uma vez perdido, o log de auditoria é perdido **permanentemente** para aquela prescrição/diagnóstico/consulta — nenhuma retentativa pode recriá-lo.
- **Causa raiz:** duas escritas relacionadas que deveriam ser atômicas emitidas como statements independentes, combinadas com um atalho de idempotência que assume "registro existe ⇒ tudo sobre sua criação teve sucesso".
- **Correção recomendada:** envolver `create` + `registrarAuditoria` em um único `prisma.$transaction([...])` (como já é feito corretamente em `MfaService`).
- **Teste necessário:** forçar o insert de auditoria a lançar exceção e assertar que o registro clínico NÃO foi commitado (hoje seria).
- **Status:** aberto.

#### RM41-018 — CASCADE-DELETE-CHAIN-PODE-DESTRUIR-REGISTROS-CLINICOS-E-DE-AUDITORIA
- **Severidade:** 🟡 médio (dormente — nenhum endpoint de delete hard existe hoje, mas é uma mina de schema)
- **Arquivo:linha:** `backend/prisma/schema.prisma:237,257,440,462,480,496`
- **Impacto:** `Diagnostico`, `Prescricao`, `RiskScore`, `MedicalTrust` cascateiam de `Consulta`; um hard-delete futuro de uma `Consulta` destruiria toda a árvore clínica associada, inconsistente com o design de soft-delete (`deletado_em`) já adotado.
- **Correção recomendada:** trocar cascades da cadeia clínica para `Restrict`, forçando soft-delete auditado.
- **Status:** aberto.

#### RM41-019 — MEDICAL-VALIDATION-SILENTLY-ORPHANED-ON-PRESCRIPTION-DELETE
- **Severidade:** 🟢 baixo (mesma dormência de RM41-018)
- **Arquivo:linha:** `backend/prisma/schema.prisma:553` (`onDelete: SetNull`)
- **Status:** aberto.

---

### 3.4 Contrato frontend↔backend, fallback, demo, offline

_Baseline confirmado: docs RM-37/RM-38 continuam corretos na leitura do código atual — `IS_DEMO_MODE`/`API_URL_CONFIGURED` corretamente separados, `AuthConfigError` nunca fabrica sucesso, `isRetryable()` exclui 4xx corretamente, idempotency key reutilizada entre retries, `/demo` claramente rotulado._

#### RM41-020 — SILENT-ERROR-MASKED-AS-NO-CONFLICT
- **Severidade:** 🔴 crítico
- **Arquivo:linha:** `frontend/src/app/consulta/nova/page.tsx:119-122, 296-305`
- **Reprodução:** `detectarConflitos(diagnosticoId)` lança exceção por qualquer motivo → `catch { return []; }` → `conflitos.length===0` renderiza card verde "Sem conflitos entre diretrizes — as principais sociedades científicas apresentam concordância".
- **Impacto:** um crash na detecção de conflito de diretriz é indistinguível de um "sem conflitos" genuinamente checado. O médico vê uma afirmação de segurança positiva quando o check nunca foi concluído — exatamente o antipadrão de fail-open/null-coalescing já corrigido em CDS/risk-engine/icu-engine, mas não aqui.
- **Correção recomendada:** estado tri-valorado (`'checked-none' | 'checked-conflicts' | 'error'`); em erro, renderizar card neutro/de aviso "conflito não verificado", nunca o card verde.
- **Teste necessário:** forçar `detectarConflitos` a lançar exceção e assertar que a UI NÃO renderiza o card verde.
- **Status:** aberto.

#### RM41-021 — RISK-ERROR-MASKED-AS-INCOMPLETE-ANAMNESIS
- **Severidade:** 🟠 alto
- **Arquivo:linha:** `frontend/src/app/consulta/nova/page.tsx:113-117, 182-183`
- **Impacto:** `avaliarRiscoClinico` lançando exceção com anamnese completa é tratado igual a "anamnese incompleta" — mensagem enganosa (dado ausente vs. bug de sistema).
- **Correção recomendada:** distinguir `anamnese==null` de exceção capturada com um estado de erro distinto.
- **Status:** aberto.

#### RM41-022 — RISK-SCORE-ENUM-CONTRACT-MISMATCH
- **Severidade:** 🟠 alto (latente — hoje inatingível, mas quebra no dia em que a persistência de risco for ligada ao fluxo real)
- **Arquivo:linha:** `frontend/src/lib/clinical-risk-engine.ts:12` vs. `backend/src/modules/consulta/dto/consulta.dto.ts:146-159`, `backend/prisma/schema.prisma:26-32`
- **Impacto:** frontend `NivelRisco` = `'baixo'|'moderado'|'alto'|'muito_alto'`; backend Prisma enum = `baixo|intermediario|alto|muito_alto|critico`. Frontend nunca produz `intermediario`/`critico`, e enviaria `'moderado'` (inválido no backend) — o nível `critico` do backend nunca pode ser representado pelo frontend.
- **Correção recomendada:** fonte única de verdade para o enum de risco antes de ligar a persistência real.
- **Status:** aberto.

#### RM41-023 — RISK-AND-DIAGNOSTIC-NEVER-PERSISTED
- **Severidade:** 🟠 alto
- **Arquivo:linha:** `frontend/src/lib/store.tsx` (nenhum call site), `frontend/src/lib/api-client.ts:341-357`
- **Impacto:** `criarDiagnostico`/`salvarRisco` só são referenciados em testes — `sincronizarConsulta` só chama `criar`/`criarPrescricao`. Diagnóstico selecionado e risco calculado nunca chegam ao backend — qualquer auditoria/segunda opinião/registro legal do raciocínio diagnóstico ou estratificação de risco fica incompleta no servidor.
- **Correção recomendada:** estender `sincronizarConsulta` (após corrigir RM41-022), ou documentar/rotular explicitamente o gap.
- **Status:** aberto.

#### RM41-024 — DEMO-NAV-REACHABILITY
- **Severidade:** 🟢 baixo
- **Status:** observação de UX, não acionável com urgência.

---

### 3.5 Testes / cobertura / qualidade

_Regra do usuário aplicada: testes passando ≠ segurança; cobertura ≠ correção clínica. Achados abaixo são sobre o que NÃO é testado, não sobre falhas de teste existentes._

#### RM41-025 — AUSENCIA-TOTAL-DE-CI-CD
- **Severidade:** 🔴 crítico
- **Arquivo:linha:** N/A — ausência confirmada de `.github/workflows/`, `.gitlab-ci.yml`, `azure-pipelines.yml`, `Jenkinsfile`, `.circleci/` em todo o repositório.
- **Impacto:** nada do que este relatório verifica manualmente (tsc, eslint, testes, build, gates RM-23/24) roda automaticamente em push/PR. Um push direto para `main` com testes quebrados ou gates de consistência falhando passaria sem bloqueio algum. Toda a rede de segurança construída depende de disciplina manual.
- **Correção recomendada:** criar workflow de CI rodando `tsc --noEmit` (frontend+backend), `eslint`, `vitest run`, `jest`+`jest-e2e`, `npm run build` (ambos) e os scripts `check:consistency`/`check:sync`; configurar branch protection exigindo o workflow.
- **Status:** aberto.

#### RM41-026 — E2E-BACKEND-NUNCA-USA-POSTGRES-REAL
- **Severidade:** 🟠 alto
- **Arquivo:linha:** todos os specs com side-effects em `backend/test/*.e2e-spec.ts` — todos usam `PrismaService` mockado em memória.
- **Impacto:** apesar do nome "persistence-integrity", nenhum e2e testa contra Postgres real. Drift de migration, violação de constraint, atomicidade de transação e race conditions reais não seriam detectados por nenhum teste existente.
- **Correção recomendada:** adicionar ao menos um e2e real contra Postgres (testcontainers ou serviço no CI).
- **Status:** aberto.

#### RM41-027 — CALCCRCL-SEM-NENHUM-TESTE
- **Severidade:** 🔴 crítico
- **Arquivo:linha:** `frontend/src/lib/dose-calculator.ts:53-106` (Cockcroft-Gault)
- **Impacto:** usada em produção (`prescricao-rapida/page.tsx:162`) para estadiamento renal (G1-G5) que orienta ajuste de dose. Zero teste cobre fronteiras exatas de estágio, creatinina=0 (divisão por zero → Infinity/NaN sem tratamento), ou o ramo de ajuste de peso/IBW para obesidade.
- **Correção recomendada:** tabela de casos parametrizada em cada fronteira de estágio + casos inválidos.
- **Status:** aberto.

#### RM41-028 — GETSTAGELABEL-GETADJUSTMENTFORCRCL-SEM-TESTE
- **Severidade:** 🟠 alto
- **Arquivo:linha:** `frontend/src/lib/dose-calculator.ts:287-305`
- **Status:** aberto.

#### RM41-029 — GETPEDIATRICAGEGROUP-DOSE-CALC-SEM-TESTE-FRONTEIRA-SUSPEITA
- **Severidade:** 🟠 alto
- **Arquivo:linha:** `frontend/src/lib/dose-calculator.ts:309-316`
- **Impacto:** fronteira neonato/neonato-prematuro usa `idadeMeses` (granularidade grosseira) para representar um corte de 28 dias; zero teste de fronteira exata.
- **Status:** aberto.

#### RM41-030 — CALCIMC-CALCCRCL-DUPLICADOS-EM-UTILS-COM-UNIDADES-DIVERGENTES
- **Severidade:** 🟡 médio
- **Arquivo:linha:** `frontend/src/lib/utils.ts:8-11,26-29` vs. `frontend/src/lib/dose-calculator.ts:110-138`
- **Impacto:** `utils.ts calcIMC` espera altura em metros; `dose-calculator.ts calcIMC` espera centímetros — hoje cada chamador usa a versão certa, mas o nome idêntico é uma mina para erro futuro de import. `utils.ts calcCrCl` é código morto sem estadiamento e sem teste.
- **Status:** aberto.

#### RM41-031 — RISCO-HEMORRAGICO-FARMACOLOGICO-INTERACAO-TERAPEUTICO-SEM-TESTE
- **Severidade:** 🔴 crítico
- **Arquivo:linha:** `frontend/src/lib/clinical-risk-engine.ts:306-525` (`avaliarRiscoHemorragico`, `avaliarRiscoFarmacologico`, `avaliarRiscoInteracao`, `avaliarRiscoTerapeutico`)
- **Impacto:** 4 de 6 dimensões do motor de risco nunca são inspecionadas por nenhum teste (o único teste do motor, RM-39, só cobre renal e cardiovascular). Regra clínica "AINE + antitrombótico — contraindicado" e a lógica de dupla antitrombótica não têm nenhum caso de teste que monte o cenário e verifique o disparo.
- **Correção recomendada:** testes dedicados por dimensão (positivo/negativo/fronteira), replicando o padrão RM-39.
- **Status:** aberto.

#### RM41-032 — ICU-ENGINE-FUNCOES-CRITICAS-SO-TESTADAS-POR-SCRIPTS-SEM-ASSERCAO
- **Severidade:** 🔴 crítico
- **Arquivo:linha:** `frontend/src/lib/icu-engine.ts` — `calcSofa`, `calcVasopressorInfusion`, `calcEpinephrinePCR`, `calcPPI`, `calcVCAlvo`, `calcDrivingPressure`
- **Impacto:** nenhuma dessas funções aparece em testes Vitest reais; são exercitadas apenas por scripts standalone (`simulation-phase22-3.ts` etc.) cujo `tryStep()` só captura try/catch — "ok" significa apenas "não lançou exceção", nunca "retornou o valor clínico correto". Um erro de fórmula na dose de epinefrina em PCR ou na taxa de vasopressor passaria despercebido indefinidamente.
- **Correção recomendada:** mover casos relevantes para testes reais com `expect()` sobre valores numéricos exatos; tratar os scripts exploratórios como não-gating explicitamente.
- **Status:** aberto.

#### RM41-033 — DOSING-ENGINE-DETECCAO-POPULACAO-SEM-TESTE-DIRETO
- **Severidade:** 🟠 alto
- **Arquivo:linha:** `frontend/src/lib/dosing-engine.ts:49-119` (`detectarPopulacao`, `idadeDias`, `calcularBSA`)
- **Status:** aberto.

#### RM41-034 — METAS-DE-COBERTURA-NAO-COBREM-OS-MOTORES-CLINICOS-DIRETOS
- **Severidade:** 🟡 médio
- **Arquivo:linha:** `frontend/vitest.config.ts` (`coverage.thresholds`)
- **Impacto:** `dose-calculator.ts`, `dosing-engine.ts`, `icu-engine.ts`, `pediatric-engine.ts`, `clinical-risk-engine.ts` — todos os motores no escopo desta auditoria — não têm threshold configurado; quedas de cobertura neles nunca falham `test:coverage`.
- **Status:** aberto.

#### RM41-035 — ASSERCOES-FRACAS-TOBEDEFINED-EM-VALORES-NUMERICOS
- **Severidade:** 🟡 médio
- **Arquivo:linha:** `frontend/src/tests/dose-calculator-unit-audit.test.ts:86,173,179,196`
- **Impacto:** `expect(resultado.bsa_m2).toBeDefined()`/`volume_por_tomada.toBeDefined()` nunca verificam o valor calculado — um erro aritmético na conversão mg→mL passaria sem detecção.
- **Correção recomendada:** substituir por `toBeCloseTo(valorEsperado, precisão)`.
- **Status:** aberto.

---

### 3.6 CI/CD e build

#### RM41-036 — LINT-FALHA-E-NAO-BLOQUEIA-O-BUILD
- **Severidade:** 🟠 alto
- **Evidência (verificada diretamente nesta sessão):**
  - Frontend `npx eslint .` → **107 problemas (103 erros)**: 37 `react-hooks/static-components` ("Cannot create components during render"), 23 `react-hooks/set-state-in-effect`, 16 `react-hooks/set-state-in-render` ("pode causar loop infinito"), 17 `react/no-unescaped-entities`, mais alguns `prefer-const`/`no-unused-vars`.
  - Backend `npx eslint .` → **94 problemas (93 erros)**: parte é erro de configuração (lint rodando sobre `dist/`, artefato compilado, que deveria estar no `.eslintignore`), parte é erro real: `no-unsafe-assignment`/`no-unsafe-member-access` de valor `any` em `current-user.decorator.ts` e `roles.guard.ts` (exatamente os pontos de extração de usuário autenticado/perfil para autorização), e `no-empty` em `cache.service.ts`.
  - `npm run build` (frontend) **passa** porque `next build` não invoca eslint como parte do build atual — ou seja, os 103 erros não são hoje um gate automático.
- **Impacto:** os erros de "setState em render/effect" do React Compiler podem causar re-renders em cascata/loop, potencialmente mostrando um valor de UI transitório/inconsistente antes de estabilizar (não confirmado como causando dado clínico incorreto persistente, mas é uma classe de bug de UI real). Os `no-unsafe-*` no backend em `current-user.decorator.ts`/`roles.guard.ts` são preocupantes por estarem exatamente nos pontos de extração de identidade/perfil para decisões de autorização — um `any` não verificado ali reduz a garantia estática que o restante do sistema de auth (já bem avaliado nesta auditoria) depende.
- **Correção recomendada:** (a) configurar `.eslintignore` para excluir `backend/dist/`; (b) corrigir os `no-unsafe-*` reais tipando corretamente o `Request` autenticado; (c) endereçar os 103 erros do React Compiler no frontend por lote (a maioria concentrada em poucos componentes, conforme a distribuição de 37+23+16); (d) decidir explicitamente se `eslint` deve ser um gate de build/CI (ver RM41-025).
- **Teste necessário:** N/A — configuração de gate, não teste de código.
- **Status:** aberto.

---

## 4. Itens Corrigidos Nesta Auditoria

**Nenhum.** Esta RM-41 foi explicitamente definida como auditoria somente-leitura ("não implemente novas funcionalidades clínicas"). Todos os 36 achados listados na seção 3 estão **abertos** e pendentes de remediação em uma RM futura dedicada.

## 5. Itens Ainda Abertos

Todos os achados RM41-001 a RM41-036 (seção 3) — 11 críticos, 10 altos, 10 médios, 5 baixos.

## 6. Bloqueadores da Expansão Clínica

Os seguintes achados são bloqueadores diretos — expandir a base/funcionalidades antes de corrigi-los replicaria o mesmo gap estrutural para mais fármacos/cenários:

1. **RM41-001, RM41-002, RM41-003** — três motores de dose/pediatria com contraindicação documentada no dado mas não enforced no código (campo morto, granularidade insuficiente, ou alerta de severidade errada). Expandir novos fármacos usando esses mesmos motores herdaria o mesmo gap de enforcement.
2. **RM41-004** — correção de normalização de acento (RM-36) não replicada em `clinical-risk-engine.ts`; qualquer nova regra de interação adicionada só a um dos dois motores paralelos perpetua a divergência.
3. **RM41-011** — corrupção de encoding em arquivo de dados neurológicos ativo em produção — bloqueador imediato independente de expansão.
4. **RM41-016, RM41-017** — gaps de trilha de auditoria no backend (uma escrita clínica sem log algum; outra que pode perder o log permanentemente numa retentativa) — bloqueador de conformidade antes de qualquer expansão de volume de prescrições.
5. **RM41-020** — erro silencioso mascarado como "sem conflito" na tela central de nova consulta — bloqueador de confiança clínica.
6. **RM41-025** — ausência total de CI/CD — bloqueador estrutural: sem isso, toda e qualquer correção feita para os itens acima (ou nova funcionalidade da expansão) corre o risco de regressão não detectada no primeiro push que pular a checagem manual.
7. **RM41-027, RM41-031, RM41-032** — gaps de cobertura em funções clinicamente centrais (CrCl, 4 dimensões de risco, motor de UTI inteiro) — expandir a superfície clínica sobre um motor não testado nessas dimensões aumenta a área não coberta, não a reduz.

## 7. Recomendação Final

# 🔴 NÃO APTO

O sistema **não** deve iniciar uma nova fase de expansão clínica no estado atual. A base de engenharia é sólida (666+135+128 testes passando, typecheck limpo, gates RM-23/24 funcionando, MFA/JWT/CORS bem implementados), mas os 11 achados críticos — concentrados em exatamente os pontos que o próprio processo de auditoria contínua deste projeto (RM-01 a RM-40) já identificou como classe de risco recorrente (contraindicação não enforced, normalização de texto não replicada entre motores paralelos, trilha de auditoria não atômica, erro mascarado como resultado normal) — mostram que o padrão de correção pontual, motor por motor, não está sendo sistematicamente propagado. Adicionar mais fármacos, mais população, ou mais volume de prescrições sobre essa base amplificaria a superfície desses gaps antes de fechá-los.

**Caminho recomendado para reavaliação:** corrigir os 7 blocos da seção 6 (bloqueadores), reexecutar RM-40 (para confirmar RM41-011/012/013 endereçados) mais a suíte completa de gates, e então repetir esta auditoria (RM-42) focada em confirmar zero 🔴/🟠 abertos antes de liberar expansão.
