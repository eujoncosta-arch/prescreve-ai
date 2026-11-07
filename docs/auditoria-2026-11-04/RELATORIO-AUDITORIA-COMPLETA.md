# Auditoria completa — Prescreve AI (diagnóstico, sem correções)

**Data:** 2026-11-04 · **Commit auditado:** `b36c639` (`main`) · **Escopo:** frontend, backend, bases farmacológicas, motores de dose, segurança medicamentosa, evidências, governança, interface.
**Regra desta etapa:** somente diagnóstico. Nenhum código, dado ou regra clínica foi alterado. Os scripts e resultados brutos estão em [`evidencias/`](evidencias) e [`scripts/`](scripts).

**Convenção de evidência:** **[FATO]** medido/reproduzido nesta auditoria · **[HIPÓTESE]** plausível, exige conferência com bula/diretriz/farmacêutico · **[LIMITAÇÃO]** o que não foi possível verificar.

---

## 1. Inventário

| Item | Quantidade |
|---|---|
| Arquivos versionados | 571 |
| Frontend `src/`: arquivos TS/TSX | 307 (215 `.ts` + 92 `.tsx`), ~117 mil linhas |
| Páginas (rotas) / route handlers | 46 / 1 |
| Componentes | 40 |
| Módulos em `lib/` | 112 (inclui `pharma-core/`, `governance/`, `lab-adapters/`) |
| Testes frontend | 83 arquivos / 1.418 testes |
| `validation/` e `clinical-tests/` (dentro de `src/`) | 16 + 4 arquivos |
| Backend NestJS | 59 arquivos em `src`, 14 de teste, 22 endpoints (9 GET, 13 POST), 22 modelos Prisma |
| Documentação | 83 `.md` em `docs/` + 28 relatórios `.md` na raiz |

## 2–4. Arquitetura e bases farmacológicas (quantidades reais, medidas em execução)

| Base | Itens | Observação |
|---|---|---|
| `getAllDrugs()` (base unificada) | **382** medicamentos, 366 moléculas distintas | `PHARMA_DB` sozinho tem 80; as demais vêm de 15 módulos temáticos |
| Marcas em `getAllDrugs()` | **710** | 118 com `verificado: true`; **592 sem verificação**; **632 sem link de bula**; 90 com `produto_id` ligado ao catálogo |
| `EUROFARMA_CATALOG` (sync) | 119 produtos / 102 moléculas | `BIBLIOTECA_FARMACEUTICA` tem os **mesmos 119 ids** (cópia) |
| `LAB_CATALOG_REGISTRY` (lab-catalog) | 38 produtos em 13 laboratórios | só **1 id** coincide com `EUROFARMA_CATALOG` |
| `MEDICAMENTOS_DOSAGEM` (motor de `/dosagem`) | 18 | |
| `PEDIATRIC_DOSES` (pediatric-engine) | 21 | |
| `MOLECULES_DB` (comparador) | 22 | |
| `DRUG_DATABASE` (por CID) | 15 | |
| `FARMACOGENOMICA_DB` | 8 | |
| Protocolos terapêuticos | 13 condições, 93 sugestões | |

**Arquitetura [FATO]:** Next.js 16 (Turbopack) estático + NestJS/Prisma sem alvo de deploy. O alias de produção na Vercel **redireciona para o login da Vercel** (proteção de acesso ativa).

## 5. Módulos integrados × desconectados [FATO, grafo de imports]

- **20 dos 112 módulos de `lib/` não são alcançáveis a partir de nenhuma tela.** Entre eles, **7 motores clínicos (~6.000 linhas)**: `clinical-calculators`, `geriatric-engine`, `icu-engine`, `obstetric-engine`, `oncology-engine`, `palliative-engine` e `pediatric-engine` — só são importados por testes e por scripts de simulação/validação (`simulation-phase22-3`, `stress-test-phase22-4`, `validate-*`).
- **Três motores de dose coexistem:** `dosing-engine` (usado em `/dosagem`, 18 fármacos), `dose-calculator` (usado em `/prescricao-rapida`, sobre os 382) e `pediatric-engine` (**não usado por nenhuma tela**).
- **Duas implementações de calculadoras clínicas:** a tela `/calculadoras` usa `prognostic-engine` (12 escores); `clinical-calculators.ts` (15 funções, 903 linhas, 7% de cobertura) não é usado pela interface.
- **Dois catálogos Eurofarma** com ids divergentes (`euro-enalapril` × `euro-enalapril-10`); 3 produtos do `lab-catalog` (amoxicilina, azitromicina, Busonid) não existem no catálogo do sync.
- Falso positivo descartado: `sentry-redact.ts` parece órfão no grafo, mas é usado por `instrumentation-client.ts`.

## 6. Inconsistências entre bases e motores

**6.1 Moléculas usadas por módulos clínicos e ausentes da base unificada [FATO]:** `naproxeno`, `sumatriptano`, `propranolol`, `colchicina` (comparador/terapêutica), `sinvastatina`, `abacavir` (farmacogenômica). Para elas não há dose calculável, marca, apresentação nem checagem de segurança.

**6.2 Posologia divergente da mesma molécula entre motores/bases [FATO]** (detalhe em `evidencias/an3.txt`):

| Molécula | `dosing-engine` | `pediatric-engine` | `PHARMA` (QuickDrug) |
|---|---|---|---|
| Cefalexina (ped.) | 25 mg/kg/dia 6/6h | 50 mg/kg/dia (máx 100) | — |
| Amoxicilina (ped.) | 50 mg/kg/dia **8/8h** | 50 mg/kg/dia **12/12h** (OMA) ou 90 | 45 mg/kg/dia ÷2 |
| Amoxicilina-clavulanato (ped.) | 45 mg/kg/dia | 70 mg/kg/dia | 45 mg/kg/dia, máx 1750 |
| Ibuprofeno (ped.) | 10 mg/kg 8/8h | 5–7,5 mg/kg/dose 6–8h | 7,5 mg/kg/dose ÷3 |
| Omeprazol (ped.) | 1 mg/kg/dia (máx 40) | 1 mg/kg/dose | 0,7 mg/kg/dia (máx 20) |
| Dipirona (ped.) | 15 mg/kg 6/6h | 15 mg/kg máx 60/dia | 10 mg/kg/dose ÷4, máx 50 |
| SMX-TMP (ped.) | 8 mg/kg/dia | 6 mg/kg/dia (TMP) | — |
| Metformina (ped.) | 500 mg 12/12h fixa | — | `dose_por_kg: 0` (valor placeholder) |
| Amoxicilina (adulto) | 500 mg 8/8h | — | 875 mg 2x/dia |

**6.3 Qualidade de dados [FATO]:** `dose_adulto.max` mistura "por dose" e "por dia" entre medicamentos (ex.: amoxicilina "máx 875", metformina "máx 3000"); textos concatenados com unidade duplicada ("500 mg VO q6h mg q6h"); 14 moléculas com variantes de contexto com nomes inconsistentes (`azitromicina_dpoc`, `tramadol-paliativo`…) e 4 marcas compartilhadas entre variantes.

**6.4 Completude da base unificada (382) [FATO]:** sem `atc_code` 373 (97,6%); sem `guidelines_referencia` 241 (63%); sem `nivel_evidencia` 276 (72%); **sem `doi_referencia` 382 (100%)**; sem `ajuste_renal` 18; `dose_pediatrica` em 20 (5,2%).

**6.5 Checks do `prebuild` (existentes) [FATO]:** consistência 382 entidades, 0 inconsistências; cross-db total 368, compatíveis 132, divergentes 0 (o restante não é explicado na saída); auditoria de marcas: 710 marcas, 0 BLOCKING, **98 REVIEW_REQUIRED** (concentrações idênticas entre laboratórios, que podem ser legítimas ou cópia sem verificação), 1 exceção aceita.

## 7. Erros por gravidade

### Críticos (segurança do paciente)
- **C1 — Segurança medicamentosa silenciosa [FATO].** `runSafetyCheck` descarta moléculas que não resolve por nome exato (`.filter(Boolean)`) **sem avisar que não foram verificadas**; `molecula_inexistente + varfarina` → 0 alertas. Numa bateria de 67 interações clássicas, 22 pares tinham alguma molécula não resolvida e, dos 45 resolvidos, **15 (33%) não geraram nenhum alerta**, incluindo benzodiazepínico + opioide (midazolam+fentanil, diazepam+morfina, clonazepam+codeína, lorazepam+tramadol, fenobarbital+morfina, gabapentina+morfina), QT (ondansetrona+haloperidol, azitromicina+ondansetrona, claritromicina+amiodarona, citalopram+ondansetrona), rivaroxabana+AAS, apixabana+ibuprofeno, lítio+enalapril, bupropiona+tramadol. [A lista de pares é de conhecimento clínico geral; deve ser revista por farmacêutico clínico.]
- **C2 — Doses diferentes conforme a rota de uso [FATO].** Ver 6.2: o médico recebe valores diferentes em `/dosagem` e `/prescricao-rapida`; o motor mais fundamentado (`pediatric-engine`) não está ligado à interface.
- **C3 — Fármacos recomendados sem cobertura de segurança [FATO].** Enxaqueca/gota recomendam moléculas que a base de segurança e o calculador não conhecem (6.1).

### Altos
- **A1 — O motor aceita peso inválido [FATO].** `calcularDosagem` devolve `ok: true` com dose 0, −75 mg e NaN para peso 0, −5 e NaN (a interface bloqueia `peso ≤ 0`; o motor não se defende sozinho).
- **A2 — Sem plausibilidade peso × idade [FATO].** Criança de 6 anos com 3 kg ou 120 kg, adulto com 10 kg ou 300 kg e idade negativa são calculados sem aviso (o teto diário aciona em pesos extremos, mas nada sinaliza a implausibilidade).
- **A3 — Fração de cápsula/comprimido sem aviso [FATO].** 125 cenários com frações que não são múltiplas de 1/4 (ex.: 0,03 de cápsula de amoxicilina); em criança de 10 kg, **16 de 24** cenários com fração < 0,5 sem nenhum aviso.
- **A4 — Limites de idade [FATO que calcula; HIPÓTESE que seja inadequado, exige bula].** Metformina, losartana e salbutamol calculam a partir de 1 ano; ibuprofeno bloqueia todo o primeiro ano (inclui 6–11 meses); só 2 de 18 fármacos têm metadados de contraindicação (`contraindicado_em`/`_ate_dias`); `ajuste_hepatico` em 1 de 18.
- **A5 — Neonatologia sem estratificação [HIPÓTESE].** Um único balde `< 28 dias` (1 kg e 3,5 kg recebem o mesmo mg/kg e o mesmo intervalo; amoxicilina neonatal 8/8h); sem idade gestacional/pós-natal. Precisa de conferência com fontes neonatais.
- **A6 — Proveniência fraca da base [FATO].** 592/710 marcas sem verificação; 632 sem bula; 0 DOI na base; **só 11 das 93 sugestões terapêuticas têm DOI** — e o pipeline perde o DOI: `buildEvidencia` (`therapeutic-class-expansion.ts`) monta a evidência das moléculas expandidas sem copiar `doi`/`link` da âncora e deriva ano/nível/grau por regex sobre texto livre.
- **A7 — Texto de interface contradiz o dado [FATO].** `/biblioteca` exibe "Sincronizado com portal oficial", mas `/api/sync/eurofarma` é um stub que retorna sucesso ("Sync simulado") e o catálogo é estático; as datas de sincronização divergem (`lab-catalog` 2026-01-15 × `lab-adapters/eurofarma` 2026-07-01).

### Médios
- **M1 — Dados sintéticos em módulos de produto [FATO].** `Math.random` gera métricas exibidas em `hospital-quality`, `interoperability-engine`, `pharma-analytics` e `physician-learning-network` (ex.: concordância com diretriz "estimativa demo", desfechos sorteados). 13 rotas consomem módulos com dados demonstrativos; `/farma-analytics` traz aviso explícito de demonstração. [HIPÓTESE: `/auditoria`, `/protocolos`, `/regulatorio`, `/timeline`, `/consulta/nova` não sinalizaram demo pela heurística de código; conferir se usam dados reais.]
- **M2 — Interface móvel [FATO, visual confirmado].** Em 375 px, **5 de 6** rotas amostradas têm rolagem horizontal (largura 616 px): a barra lateral de 224 px fica fixa e espreme o conteúdo. `/dosagem` não sofre.
- **M3 — Ciclos de dependência [FATO].** Um ciclo de 29 arquivos (`pharma-core` ↔ `pharma-database*`) e um de 4 (`lab-adapters`).
- **M4 — Severidade inconsistente e alertas duplicados [FATO].** `venlafaxina+tramadol` = warning, `sertralina+tramadol` = danger (mesmo mecanismo serotoninérgico); `fluoxetina+tramadol` gera 2 alertas idênticos.
- **M5 — Calculadoras [FATO/HIPÓTESE].** Verificados à mão e corretos na tela: CKD-EPI 2021 (3 casos), Cockcroft-Gault (2), MELD (2, incl. diálise), Child-Pugh (1), HAS-BLED (1), IMC (cm). [HIPÓTESE] CHA₂DS₂-VASc permite marcar "≥75" (2 pts) **e** "≥65" (1 pt) ao mesmo tempo (soma 3 em vez de 2); IMC com altura em metros dá 228.571 sem alerta de plausibilidade.
- **M6 — Código de simulação/validação dentro de `lib/` [FATO].** 7 arquivos (~2.900 linhas) sem importadores; `validation/` e `clinical-tests/` ficam em `src/`.

### Baixos
- Um DOI não resolvido, em comentário histórico (RM-81), não é conteúdo ativo. 122 de 123 DOIs únicos existem no Crossref.
- 28 relatórios `.md` na raiz e 83 em `docs/` sem índice; aviso de depreciação do Sentry no build; `FINAL_PRODUCTION_READINESS_REPORT.md` declara "production-ready" para critérios de segurança restritos.

## 8. Riscos clínicos e farmacológicos (síntese)
1. Ausência de alerta lida como segurança (C1). 2. Dose diferente por rota (C2). 3. Fármaco recomendado fora da cobertura de segurança (C3). 4. Frações impraticáveis em pediatria (A3). 5. Neonatos e limites de idade (A4/A5). 6. Marcas/apresentações sem verificação aparecendo como catálogo "oficial" (A6/A7).

## 9. Arquitetura e manutenção
Três motores de dose, duas calculadoras, dois catálogos Eurofarma, cópia `BIBLIOTECA` ≡ `EUROFARMA_CATALOG`, 7 motores desconectados, ciclos de dependência, scripts de simulação em `lib/`, 83+28 documentos sem índice.

## 10. Funcionalidades incompletas ou demonstrativas
Sync Eurofarma (stub); métricas sintéticas em qualidade hospitalar, interoperabilidade, analytics farmacêutico, rede médica; `/rwe`, `/comite` e `/demo` com dados de exemplo (sinalizados); motores obstétrico, oncológico, UTI, geriátrico, paliativo e pediátrico sem interface; backend sem deploy.

## 11. Testes e validações executados [FATO]
| Verificação | Resultado |
|---|---|
| `tsc --noEmit` (front) | limpo |
| `eslint` (front) | 0 problemas |
| Vitest (front) | **83 arquivos / 1.418 testes passando** |
| Build de produção | exit 0, 50/50 páginas; prebuild: consistência, cross-db, integridade de texto e marcas passaram |
| Backend `tsc`, `eslint` | limpos |
| Backend Jest | 16 suítes / 160 testes passando |
| DOIs no Crossref | 122 de 123 existem (1 em comentário histórico) |
| Matriz de dosagem | 700 cenários (18 fármacos × formulações × 6 populações) |
| Bateria de interações | 67 pares |
| Grafo de imports | 307 arquivos, 825 arestas |
| Interface (servidor local) | 8 rotas carregadas; responsividade em 6; calculadoras com casos de referência |

## 12. Cobertura e limitações dos testes
**Cobertura do frontend (130 arquivos medidos): 34,0% instruções, 36,3% linhas.** Por módulo (instruções): `safety-rules` 96%, `clinical-decision-support` 95%, `icu-engine` 94%, `therapeutic-class-expansion` 93%, `explainable-ai-v2` 91%, `second-opinion` 91%, `drug-comparator` 87%, `pediatric-engine` 85%, `dose-calculator` 72%, `dosing-engine` 66%, `clinical-risk-engine` 75%, `pharma-database` 57%, `clinical-therapeutics` 39%, `palliative-engine` 24%, **`clinical-calculators` 7%**, **`obstetric-engine` 0%**, **`oncology-engine` 0%**, `clinical-reasoning` 0%, `precision-medicine` ~1% (os testes só inspecionam dados). **45 de 130 módulos com 0%.** Backend: 59% instruções.
**Limitações:** testes verdes não comprovam correção clínica; muitos testes fixam dados, não a evidência; os e2e do backend exigem Postgres e não foram executados.

## 13. Plano de correção priorizado (aguardando sua aprovação)
**P0 — segurança**
1. `runSafetyCheck`: reportar moléculas não resolvidas ("não verificada") e nunca tratá-las como seguras; normalização de nomes/sinônimos.
2. Revisão farmacêutica e ampliação da matriz de interações (benzodiazepínico+opioide, QT, anticoagulantes, serotoninérgicos), com severidade e mecanismo consistentes.
3. Decidir **uma** fonte de posologia (motor único ou reconciliação auditada) e ligar o `pediatric-engine`; resolver as divergências de 6.2 com fonte primária.
4. Incluir na base unificada as moléculas de 6.1 (com fontes verificadas) para que dose, marca e segurança funcionem.

**P1 — motor de dose**
5. Validação de entrada no motor (peso/idade/plausibilidade) e avisos para frações de cápsula/comprimido e apresentação alternativa.
6. Limites inferiores de idade e contraindicações por fármaco, conferidos em bula; estratificação neonatal.
7. Preservar o DOI no pipeline de expansão terapêutica; completar proveniência (nível, diretriz, DOI) da base.

**P2 — dados e governança**
8. Corrigir o texto "Sincronizado com portal oficial" ou implementar o sync; unificar os catálogos Eurofarma e os ids.
9. Etiquetar e isolar dados sintéticos; mover simulação/validação para fora de `lib/`.
10. Revisar os 98 `REVIEW_REQUIRED` e verificar/descartar as 592 marcas não verificadas.

**P3 — qualidade**
11. Layout móvel do `AppShell`; unificar calculadoras; testes de comportamento para `clinical-calculators`, obstétrico, oncológico e `precision-medicine`; quebrar ciclos de dependência; índice dos relatórios.

## 14. Pontuação técnica (julgamento desta auditoria, 0–10)
| Área | Nota | Justificativa |
|---|---|---|
| Engenharia/qualidade técnica | 7,0 | tsc/lint limpos, 1.418 testes, gates de prebuild, trilha de auditoria |
| Testes e cobertura | 5,5 | núcleo de segurança bem coberto; 34% global; vários motores a 0–7% |
| Arquitetura/manutenção | 4,5 | motores triplicados, desconectados e ciclos |
| Base farmacológica | 4,5 | 382 medicamentos, mas 592/710 marcas e 97,6% sem ATC não verificados |
| Motores de dose | 5,0 | cálculo aritmético coerente; sem validação de entrada, limites e neonatologia |
| Segurança medicamentosa | 4,0 | 33% de interações clássicas sem alerta; descarte silencioso |
| Integração entre módulos | 4,0 | bases divergentes, motor pediátrico fora da UI |
| Evidência e rastreabilidade | 5,5 | DOIs reais (122/123) e RMs documentadas; DOI perdido no pipeline |
| Governança e dados demonstrativos | 5,5 | aviso de demo existe; métricas sintéticas e texto "oficial" ainda confundem |
| Interface e responsividade | 5,0 | desktop funcional; móvel quebrado em 5/6 rotas |
| Backend | 6,0 | tipado, testado (59%), sem deploy |

## 15. Parecer geral
O Prescreve AI é um **protótipo avançado de apoio à decisão**, com disciplina de engenharia acima da média (tipagem, lint, 1.418 testes, gates de consistência e um histórico de correções documentadas). **Não está maduro para uso clínico real sem supervisão**: a segurança medicamentosa tem lacunas silenciosas (C1), a posologia depende da rota de uso (C2), parte das recomendações cai fora da cobertura de segurança (C3) e a maior parte do catálogo comercial não tem verificação. A prioridade é **integrar e verificar** o que já existe, antes de ampliar a cobertura clínica.

## Limitações desta auditoria
- Não houve revisão por médico ou farmacêutico clínico; os itens marcados [HIPÓTESE] exigem bula/diretriz.
- DOIs: verificada a **existência** no Crossref, não a correspondência exata de cada citação ao seu texto.
- O alias de produção está atrás do login da Vercel; a interface foi avaliada no servidor local (8 rotas, 6 em viewport móvel).
- E2E do backend (Postgres) não executados; nenhum teste de carga ou de segurança ativa.
- As sondas temporárias de execução (testes `zz-audit-*`) foram removidas após o uso; os resultados e scripts de análise estão em `evidencias/` e `scripts/`.
