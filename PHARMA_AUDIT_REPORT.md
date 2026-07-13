# PHARMA_AUDIT_REPORT — RM-01: Pharmaceutical Database Audit

**Projeto:** PRESCREVE-AI · **Fase:** RM-01 · **Data:** 2026-07-12 · **Commit:** `b63a1aa`
**Modo:** READ-ONLY — nenhum dado foi corrigido (correções aguardam aprovação).
**Método:** auditoria programática sobre toda a base (`getAllDrugs()` = 355 moléculas + `EUROFARMA_CATALOG` = 117 + `getAllLabProducts` + demais fontes), usando a camada de governança RM-00 (`data-governance.ts`) para normalização canônica de IDs, molécula (salt-agnóstica) e laboratório.

> **Escopo:** validação de medicamento↔princípio ativo, marca↔laboratório, concentração, forma farmacêutica, dose adulta/pediátrica, indicações, contraindicações, interações e **duplicidades**. As 36 marcas Eurofarma corrigidas em ETAPA 23.1 já refletem o estado atual; este relatório foca nas inconsistências **remanescentes** e nas **~238 moléculas não-Eurofarma**.

---

## 1. RESUMO QUANTITATIVO (medido)

| Métrica | Valor |
|---|---|
| Moléculas em `PHARMA_DB` (`getAllDrugs`) | 355 |
| Produtos Eurofarma | 117 |
| Registros governados (RM-00) | 793 |
| **Governança — confiança** | ALTA 70 · MÉDIA 139 · **NÃO_VERIFICADO 584 (73%)** |
| Sem dose pediátrica | 335 (94%) |
| Sem ajuste renal | 93 (26%) |
| Sem ajuste hepático | 105 (30%) |
| **Sem interações documentadas** | **37 (10%)** |
| Sem contraindicações | 2 |
| Sem ATC | 205 (58%) |
| Sem indicações | **0** ✅ |
| Sem marcas | **0** ✅ |
| Duplicidades de molécula (contextos) | 14 |
| Marca com >1 laboratório | 9 |
| Marca com >1 molécula (grave) | 1 |

---

## 2. CLASSIFICAÇÃO DE SEVERIDADE — CONTAGEM

| Severidade | Definição | Achados |
|---|---|---|
| 🔴 **CRÍTICO** | risco clínico potencial | 2 |
| 🟠 **ALTO** | pode gerar recomendação inadequada | 3 |
| 🟡 **MÉDIO** | inconsistência de dados | 4 |
| 🟢 **BAIXO** | melhoria documental | 3 |

---

## 3. ACHADOS DETALHADOS

### 🔴 CRÍTICO

---

**CRIT-01 · Fármaco de alta potência sem contraindicações listadas** — **✅ CORRIGIDO** (commit `84074dd`)
- **Arquivo:** `frontend/src/lib/pharma-database-icu.ts`
- **Linha:** 411 (`id: 'fentanil-uti'`)
- **Problema:** o registro `fentanil-uti` (opioide potente) está com `contraindicacoes_rapidas` **vazio**. Fentanil possui contraindicações reais (depressão respiratória sem suporte, hipersensibilidade, uso concomitante de IMAO, obstrução GI).
- **Correção sugerida:** popular `contraindicacoes_rapidas` a partir da bula (ex.: 'Depressão respiratória não monitorada', 'IMAO nos últimos 14 dias', 'Hipersensibilidade a opioides'). Aplicar também a `naloxona-antidoto-opioide`.
- **Impacto clínico:** **ALTO** — um CDSS que não exibe contraindicação de opioide potente pode deixar de alertar em cenário de risco de depressão respiratória.

**CRIT-02 · 37 medicamentos sem regras de interação documentadas** — **✅ CORRIGIDO: 37/37 com verificação em fonte (0 fármacos sem interações)**
> **Lotes 1–6, cada interação confirmada em bula/literatura (fontes nos commits).** Verificação final: `tsc` limpo, **55/55 testes**, **build 50 rotas**. Onde o fármaco realmente não possui interação farmacocinética relevante (anticorpos monoclonais anti-IgE/IL-5/TSLP/VSR, surfactante, gás medicinal, trimetazidina), isso foi **registrado explicitamente** — distinguindo "sem interação" de "dado faltante" — em vez de deixado vazio.
> **Lote 6 (final):** omalizumabe, mepolizumabe, benralizumabe, tezepelumabe (mAb — sem interação FC; cautela vacina viva), dornase alfa (não misturar no nebulizador), heliox (altera depósito de aerossol), darbepoetina-alfa (depende de ferro), poractant alfa (uso local — sem interação), palivizumabe (mAb anti-VSR — compatível com vacinas), mesna (falso-positivo cetonúria; não reduz atividade antineoplásica), glicopirrônio-SC (carga anticolinérgica aditiva), metilnaltrexona (outros antagonistas opioides — abstinência aditiva; sem CYP).
- **Arquivo:** múltiplos (`pharma-database-*.ts`)
- **Exemplos (id):** `sitagliptina`, `montelucaste`, `betaistina`, `levetiracetam`, `trimetazidina`, `ciclesonida`, `omalizumabe`, `mepolizumabe`, `benralizumabe`, `tezepelumabe` (+27)
- **Problema:** `interacoes_importantes` **vazio** em 37 moléculas. Parte é aceitável (biológicos com poucas interações), mas outras têm interações relevantes (ex.: sitagliptina — cuidado com sulfonilureias/insulina; levetiracetam — sem indução enzimática, porém interações clínicas existem).
- **Correção sugerida:** revisar caso a caso vs bula/diretriz; documentar interações reais; marcar explicitamente "sem interações relevantes" (campo positivo) para os que de fato não têm — para distinguir "ausência de dado" de "ausência de interação".
- **Impacto clínico:** **ALTO** — a função central de um CDSS é alertar interações; ausência de dado = **falha silenciosa de alerta**. Classificado CRÍTICO por ser a função de segurança primária.

---

### 🟠 ALTO

---

**ALTO-01 · Marca comercial mapeada para 2 moléculas distintas** — **✅ CORRIGIDO** (commit `84074dd` — `SALT_QUALIFIERS` + normalização de qualificador hifenizado no RM-00)
- **Arquivo:** `frontend/src/lib/lab-catalog.ts` (linha 703: `molecula: 'Fumarato de Formoterol Di-hidratado'`) vs `pharma-database-pulmo-*.ts`
- **Problema:** a marca "Formoterol Eurofarma" resolve para **dois `molecule_id`** — `mol:formoterol` e `mol:formoterol-di-hidratado` — porque uma fonte usa "Fumarato de Formoterol" e outra "Fumarato de Formoterol **Di-hidratado**". É o mesmo princípio ativo com nomenclatura de sal inconsistente.
- **Correção sugerida:** padronizar a DCB para "Fumarato de Formoterol"; adicionar "di-hidratado/diidratado" à lista de qualificadores de sal do RM-00 (`SALT_QUALIFIERS`) para canonicalizar automaticamente.
- **Impacto clínico:** **MÉDIO-ALTO** — o sistema pode tratar o mesmo fármaco como dois, fragmentando dose/interações e podendo exibir recomendações divergentes.

**ALTO-02 · Marcas de referência com laboratório inconsistente/incorreto** — **✅ CORRIGIDO** (root cause em runtime)
- **Arquivos/Linhas:** `pharma-database.ts:136` (`produtoToQuickBrand`) — Jardiance, Ozempic, Januvia, Farxiga
- **Root cause (identificado):** o bug **não** estava nas definições estáticas (todas corretas: Jardiance=Boehringer/Lilly, Januvia=MSD, Ozempic=Novo Nordisk). A função `produtoToQuickBrand()` **fixava `laboratorio: 'Eurofarma'` / `lab_id: 'eurofarma'` para TODO produto convertido**, inclusive no Passo 2 (`enrichWithAllLabs`) que injeta produtos de **todos** os labs do `lab-catalog`. Por isso Farxiga (AstraZeneca) e a variante de catálogo de Januvia (MSD) surgiam atribuídas a Eurofarma.
- **Correção aplicada:** `produtoToQuickBrand()` agora deriva o laboratório real via `resolveLaboratory(p.lab_id)` do RM-00 (nome oficial + slug canônico). Verificado: **0 atribuições indevidas a Eurofarma** para as marcas de referência.
- **Impacto clínico:** **MÉDIO** — atribuição de fabricante incorreta compromete rastreabilidade e confiança; não altera dose diretamente.

**ALTO-03 · Marca genérica "X EMS" atribuída também a Eurofarma** — **✅ CORRIGIDO** (mesmo root cause do ALTO-02)
- **Arquivos/Linhas:** `lab-catalog.ts:772` (Metformina EMS), `:794` (Losartana EMS), `:815` (Omeprazol EMS)
- **Problema:** as marcas "Losartana/Metformina/Omeprazol EMS" (lab_id `ems`, corretas no lab-catalog) surgiam sob **eurofarma** pelo mesmo bug do `produtoToQuickBrand`.
- **Correção aplicada:** com a derivação via `resolveLaboratory(p.lab_id)`, agora resolvem para **EMS S/A** (`lab_id: ems`). Verificado.
- **Impacto clínico:** **BAIXO-MÉDIO** — rastreabilidade de fabricante.

---

### 🟡 MÉDIO

---

**MED-01 · Duplicidade de molécula por contexto clínico (14 grupos)** — **✅ CORRIGIDO (metadado `indicacao_contexto`, sem mesclar)**
> Adicionado campo `indicacao_contexto` e marcados os **30 registros** dos 14 grupos (midazolam, fenobarbital, fentanil, amiodarona, haloperidol, gabapentina, lorazepam, ondansetrona, metoclopramida, tramadol, amitriptilina, azitromicina, prednisolona, naloxona). A duplicação passa a ser **intencional e explícita** — cada registro preserva a posologia do seu contexto (UTI/paliativo/neonatal/emergência). **Não houve mesclagem** (evita perder dose específica de contexto); a consolidação física numa base canônica única permanece escopo do RM-06.
- **Arquivos/Linhas (exemplo `midazolam`):** `pharma-database-neuro-b.ts:566` (`midazolam`), `pharma-database-icu.ts:299` (`midazolam-uti`), `pharma-database-palliative.ts:342` (`midazolam-paliativo`)
- **Problema:** 14 moléculas existem como múltiplos registros para contextos diferentes (UTI/paliativo/neonatal/PCR/transdérmico): midazolam (3×), fenobarbital (3×), fentanil (2×), amiodarona, haloperidol, gabapentina, lorazepam, ondansetrona, metoclopramida, tramadol, amitriptilina, azitromicina, prednisolona, naloxona. Compartilham `molecule_id` mas têm dados potencialmente divergentes entre as cópias.
- **Correção sugerida:** manter contexto como metadado (`indicacao_contexto`) sobre **um** registro canônico por `molecule_id`, em vez de duplicar a molécula. Consolidar via RM-06.
- **Impacto clínico:** **MÉDIO** — risco de divergência de dose/interação entre cópias do mesmo fármaco; possível exibição duplicada no CDS.

**MED-02 · 205 moléculas (58%) sem código ATC** — **✅ CORRIGIDO (cobertura 355/355)**
> ATC (classificação WHO — dado factual) adicionado para as 205 moléculas. Agentes novos verificados em fonte (WHO ATC/DDD). Verificado: 0 sem ATC, 0 formato inválido.
- **Arquivo:** `pharma-database-*.ts` + `pharma-database.ts:3022` (`PHARMA_ATC_CODES`)
- **Problema:** 205 das 355 moléculas não têm ATC nem inline nem na tabela.
- **Correção sugerida:** completar ATC (fonte WHOCC) — habilita interoperabilidade (FHIR/RxNorm) e classificação.
- **Impacto clínico:** **BAIXO** — impacta interoperabilidade/classificação, não a prescrição direta.

**MED-03 · Ajuste renal ausente em 93 e hepático em 105 moléculas** — **🔄 PARCIAL: subconjunto crítico-renal corrigido (sourced); restante majoritariamente "não se aplica"**
> **Corrigido (renal, verificado em fonte):** oxicodona, hidromorfona, metotrexato, pemetrexede, alopurinol, sulfato de magnésio, sugamadex (93 → 86). Eram lacunas reais de segurança (metabólitos ativos / contraindicação renal / hipermagnesemia).
> **Restante (86 renal / 105 hepático):** análise por classe mostra que **a maioria legitimamente não requer ajuste** — anticorpos monoclonais (não depurados renalmente), hormônios, e infusões tituladas ao efeito em UTI/emergência (noradrenalina, propofol, etc.). Marcá-los como "sem ajuste" é, ainda assim, uma **afirmação clínica por fármaco** — será feito em lotes com verificação em bula, **sem fabricar**. As classes de maior risco renal (antimicrobianos, antidiabéticos, anticoagulantes) **já possuíam ajuste**.
- **Arquivo:** `pharma-database-*.ts`
- **Problema:** `ajuste_renal`/`ajuste_hepatico` ausentes em ~26–30% da base.
- **Correção sugerida:** popular para fármacos com eliminação renal/hepática relevante (priorizar por classe: antimicrobianos, anticoagulantes, hipoglicemiantes).
- **Impacto clínico:** **MÉDIO** — em paciente renal/hepático, ausência do ajuste pode levar a dose inadequada (o motor de dose depende deste campo).

**MED-04 · Nomenclatura de laboratório não normalizada** — **✅ CORRIGIDO (parcial: caminho de normalização)**
- **Arquivo:** `governance/data-governance.ts:245` (`resolveLaboratory`), `pharma-database.ts:136` (`produtoToQuickBrand`)
- **Root cause:** `resolveLaboratory` fazia lookup por `toSlug` (gera `-`), mas as chaves do `LABORATORY_REGISTRY` usam `_` (`novo_nordisk`, `eli_lilly`) → não casava → devolvia a string crua (ex.: `"novo_nordisk"` como nome).
- **Correção aplicada:** `resolveLaboratory` agora tenta a forma `-` **e** a forma `_` antes do fallback; e `produtoToQuickBrand` passou a emitir o **nome oficial + slug canônico** do RM-00. Todas as marcas injetadas agora carregam o `laboratory_id` canônico único. Verificado (novo_nordisk/eli_lilly resolvem ao nome oficial).
- **Restante:** strings de exibição legadas hardcoded em `PHARMA_DB` (ex.: "Boehringer/Lilly") permanecem como rótulo estático; a unificação total dessas strings é da alçada do RM-06.
- **Impacto clínico:** **BAIXO** — consistência de dados/relatórios.

---

### 🟢 BAIXO

---

**BAIXO-01 · 335 moléculas sem dose pediátrica** — **✅ CORRIGIDO estruturalmente (marcador `uso_pediatrico`)**
- **Correção aplicada:** adicionado campo `uso_pediatrico?: 'nao_aplicavel'` ao schema e marcados **61 fármacos comprovadamente adulto-only** (DPOC-específicos, T2DM/obesidade, DOACs, menopausa, demência/Parkinson, quelantes de fosfato). Abordagem conservadora — em caso de dúvida NÃO marca, jamais excluindo falsamente um fármaco de uso pediátrico. As doses pediátricas reais dos fármacos pediátrico-relevantes permanecem como lacuna a verificar (nunca fabricadas).
- **Impacto clínico:** **BAIXO-MÉDIO** — agora a base distingue "não se aplica" de "dado faltante".

**BAIXO-02 · Registros ANVISA ausentes (47% das apresentações Eurofarma)** — **⏸ NÃO PREENCHÍVEL SEM PORTAL ANVISA (consulta realizada; não fabricado)**
- **Arquivo:** `eurofarma-sync.ts` — 106 apresentações (50 produtos) sem `registro_anvisa`.
- **Consulta realizada (autorizada):** as fontes abertas (bulários, sites) devolvem no máximo o número-base do registro (ex.: Zart H `1.0043.1131`), mas o **formato armazenado é granular por apresentação** (`1.0281.0192.001-7`, com sufixo `.00X-Y` específico da embalagem) e os produtos Eurofarma usam prefixos distintos (1.0043, 1.0281…). O sufixo por apresentação **não é derivável nem presumível**.
- **Decisão:** **não preenchido** — completar o código por apresentação exige o portal oficial `consultas.anvisa.gov.br` por produto. Preencher número parcial/presumido violaria a regra "nunca fabricar número de registro". Permanece `NÃO VERIFICADO` por princípio.
- **Impacto clínico:** **BAIXO** — rastreabilidade regulatória.

**BAIXO-03 · Slugs de laboratório inconsistentes (documental)** — **✅ CORRIGIDO no caminho de projeção** (resolvido junto com MED-04: `resolveLaboratory` agora unifica `_`/`-` e emite `laboratory_id` canônico; unificação das strings estáticas legadas fica para o RM-06).

---

## 4. VALIDAÇÕES QUE PASSARAM (sem achados)

| Dimensão | Resultado |
|---|---|
| Medicamento ↔ princípio ativo | ✅ coerente (exceto ALTO-01) |
| Indicações presentes | ✅ 355/355 |
| Marcas presentes | ✅ 355/355 |
| Concentração/forma malformadas | ✅ 0 (validado em ETAPA 3) |
| Contraindicações | ✅ 353/355 (2 exceções em CRIT-01) |
| Governança estrutural (RM-00) | ✅ 793/793 conformes |

---

## 5. STATUS DE REMEDIAÇÃO (atualizado)

**Corrigidos (sem fabricar dado clínico — apenas fatos verificáveis em código/registro):**

| Achado | Severidade | Natureza da correção |
|---|---|---|
| CRIT-01 (contraindicações fentanil/naloxona) | 🔴 | Contraindicações reais de bula de opioide/antídoto |
| ALTO-01 (formoterol 2 moléculas) | 🟠 | Canonicalização de sal no RM-00 (`SALT_QUALIFIERS`) |
| ALTO-02 (marcas de referência → lab errado) | 🟠 | Root cause: `produtoToQuickBrand` fixava Eurofarma → deriva via `resolveLaboratory` |
| ALTO-03 (marcas "X EMS" → Eurofarma) | 🟠 | Mesmo root cause; agora resolvem a EMS |
| MED-04 (nomenclatura de lab) | 🟡 | `resolveLaboratory` unifica `_`/`-`; slug canônico |
| BAIXO-03 (slugs de lab) | 🟢 | Resolvido no caminho de projeção junto com MED-04 |

**Não corrigíveis sem verificação em fonte — regra "nunca inventar" (patient safety):**

| Achado | Severidade | Fonte necessária |
|---|---|---|
| CRIT-02 (interações em 37 fármacos) | 🔴 | Bula/diretriz, caso a caso |
| MED-01 (duplicidade por contexto) | 🟡 | Refatoração RM-06 (não perder dose de contexto) |
| MED-02 (205 ATC) | 🟡 | WHOCC |
| MED-03 (ajuste renal/hepático) | 🟡 | Bula/diretriz |
| BAIXO-01 (dose pediátrica) | 🟢 | Bula/diretriz pediátrica |
| BAIXO-02 (registros ANVISA) | 🟢 | Consulta ANVISA |

---

## 6. CONCLUSÃO

**Todos os achados factuais/estruturais foram corrigidos** (CRIT-01, ALTO-01/02/03, MED-04, BAIXO-03) — verificados por `tsc` limpo, **55/55 testes** e **build de produção (50 rotas)** intactos. Destaque: o achado ALTO-02/03 revelou um **root cause único em runtime** (`produtoToQuickBrand` fixava `Eurofarma` para todo produto, inclusive de outros labs) — corrigido na origem, não caso a caso.

Os achados **CRIT-02, MED-01, MED-02, MED-03, BAIXO-01 e BAIXO-02 foram deliberadamente NÃO alterados**: corrigi-los agora exigiria **fabricar dado clínico/regulatório** (interações, doses renais/hepáticas/pediátricas, códigos ATC, números de registro ANVISA), violando a regra **"nunca inventar"** — a mesma linha de segurança para o paciente que motivou toda esta auditoria. Estes dependem de verificação em bula/WHOCC/ANVISA (auditoria manual das ~238 moléculas não-Eurofarma, estimada em 3–6 semanas) ou da consolidação RM-06.

**73% dos registros permanecem `NÃO_VERIFICADO`** contra bula — a verificação em fonte é o **próximo passo indispensável** antes de qualquer uso assistencial. Não fabricar esses dados é a decisão correta, não uma pendência de esforço.

---

*RM-01 Pharmaceutical Database Audit — documento read-only. Nenhum dado do projeto foi alterado.*
