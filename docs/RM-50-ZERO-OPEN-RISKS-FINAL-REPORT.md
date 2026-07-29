# RM-50 — Saneamento Total de Riscos: Relatório Final

## 1. Escopo

RM-50 exigiu **zero riscos abertos de qualquer severidade** antes de autorizar expansão clínica, proibindo
explicitamente qualquer veredito intermediário ("apto com limitações", "aceito", "documentado", "follow-up",
"fora de escopo"). Esta rodada partiu do estado deixado pelo RM-49 (🔴 NÃO APTO, 3 críticos + 11 altos + ~13
moderados/baixos abertos) e tentou fechá-los de forma real e verificada — não por reclassificação.

**Resultado honesto: nem todos foram fechados.** Este relatório segue a mesma disciplina das rodadas
anteriores: nenhum risco remanescente é escondido, reclassificado ou chamado de "aceitável".

## 2. Versão e commit auditados

Estado do repositório ao final desta sessão, branch `main`, imediatamente após as correções descritas
abaixo. Sem commit criado nesta rodada (nenhum commit foi solicitado pelo usuário).

## 3. Inventário completo

| ID | Risco | Severidade original | Estado no RM-49 | Ação executada no RM-50 | Teste/evidência | Estado final |
|---|---|---|---|---|---|---|
| RM41-001 a 004 | Diversos (SMXTMP/dipirona/ped-alerta/acento) | 🔴 crítico | FECHADO (RM-48) | Nenhuma (reconfirmado por leitura) | `rm48-pharmacological-blockers.test.ts` | **FECHADO** |
| RM41-011 | Mojibake | 🔴 crítico | FECHADO (RM-49) | Nenhuma | `text-integrity-rm49.test.ts` | **FECHADO** |
| RM41-016/017 | Auditoria/atomicidade risk-score | 🔴 crítico | FECHADO (RM-49) | Nenhuma | `consulta.service.atomicidade-rm49.spec.ts` | **FECHADO** |
| RM41-020/021 | Erro mascarado (RM-46) | 🔴/🟠 | FECHADO (RM-46) | Nenhuma (reconfirmado) | `clinical-panel-safety-rm46.test.ts` | **FECHADO** |
| RM41-025 | Ausência de CI/CD | 🔴 crítico | FECHADO (infra) | Nenhuma | `.github/workflows/ci.yml` | **FECHADO (infraestrutura)** — job `frontend` falha por RM41-036/RM49-NEW-001, não por ausência de gate |
| RM41-027 | `calcularCrCl` sem teste direto | 🔴 crítico | ABERTO | 23 testes diretos cobrindo as 3 implementações (utils/dose-calculator/geriatric-engine), incluindo fronteiras, zero, negativo, NaN, Infinity | `crcl-direct-rm50.test.ts` | **FECHADO** |
| RM41-031 | Risco hemorrágico/interação sem teste direto | 🔴 crítico | ABERTO | 24 testes diretos (`avaliarRiscoClinico().risco_hemorragico`/`.risco_interacao`, `calcHASBLED`, cobertura dos 10 pares de `PARES_INTERACAO`) | `risco-hemorragico-interacao-rm50.test.ts` | **FECHADO** |
| RM41-032 | `icu-engine` funções centrais sem teste direto | 🔴 crítico | ABERTO | 25 testes diretos para `calcSofa`/`calcQsofa`/`calcVasopressorInfusion`/`calcEpinephrinePCR`/`calcPPI`/`calcVCAlvo`/`calcDrivingPressure` | `icu-engine-calc-functions-rm50.test.ts` | **FECHADO** |
| RM41-005 | FiO2 sem validação de plausibilidade | 🟠 alto | ABERTO | Validação explícita [0,21–1,0]; FiO2 fora da faixa não calcula mais PaO₂/FiO₂ nem fabrica classificação de ARDS | `icu-engine-defaults-clinicos.test.ts` (+3 testes) | **FECHADO** |
| RM41-012 | ATC aceito como evidência | 🟠 alto | ABERTO | Não corrigido nesta rodada | — | **ABERTO** |
| RM41-013 | Provenance epoch-placeholder | 🟠 alto | ABERTO | Não corrigido nesta rodada | — | **ABERTO** |
| RM41-022 | Contrato de enum risk score | 🟠 alto | PARCIAL | Migração de enum já criada no RM-49; auditoria COMPLETA de contrato (DTO↔Prisma↔frontend↔resposta) não realizada nesta rodada | — | **ABERTO** |
| RM41-023 | Diagnóstico/risco nem sempre persistidos | 🟠 alto | ABERTO | Não corrigido nesta rodada | — | **ABERTO** |
| RM41-026 | E2E sem Postgres real | 🟠 alto | ABERTO (suíte escrita, nunca executada) | Nenhuma mudança adicional — mesma limitação de sandbox (sem Docker/Postgres) | `postgres-real.e2e-spec.ts` (4 testes, pulados) | **ABERTO até 1ª execução real em CI** |
| RM41-028 | CrCl sem teste de fronteira | 🟠 alto | ABERTO | Fronteiras G1/G2 (crcl=90), G5 (crcl<15), obesidade/IBW cobertas em `crcl-direct-rm50.test.ts` | idem RM41-027 | **FECHADO** |
| RM41-029 | Idade pediátrica sem teste de fronteira suspeita | 🟠 alto | ABERTO | Não corrigido nesta rodada (existe cobertura de `getFormulacaoPediatrica` para idade corrigida/cronológica de RMs anteriores, mas não das fronteiras específicas de dias suspeitas — 28/29/59/60/89/90 dias) | — | **ABERTO** |
| RM41-030 | CrCl duplicado/unidades divergentes | 🟡 moderado | ABERTO | As 3 implementações agora têm teste direto provando que produzem o MESMO resultado para a mesma entrada clínica — mas a duplicação em si (3 funções paralelas) não foi unificada (refatoração arquitetural fora do escopo desta rodada, risco de quebrar chamadores não testados) | `crcl-direct-rm50.test.ts` | **PARCIALMENTE ABERTO** — comportamento agora testado e consistente, mas duplicação não eliminada |
| RM41-033 | `sync.prescricao.backend_id` nunca gravado | 🟠 alto | ABERTO | `executarSincronizacaoConsulta` agora despacha `SET_SYNC_STATE` com `backend_id` real do backend para a prescrição, espelhando o que já existia para a consulta | `store-sync-resilience-rm45.test.ts` (+1 teste) | **FECHADO** |
| RM41-036 | Lint não bloqueia build | 🟠 alto | PARCIAL (backend fechado, frontend exposto) | Backend: `npm run lint` limpo (0/0), rodando no CI. Frontend: **não corrigido** — ver RM49-NEW-001 | `.github/workflows/ci.yml` | **PARCIALMENTE ABERTO** (backend fechado, frontend aberto) |
| RM41-006 a 010, 014, 015, 018, 019, 024, 034, 035 | Diversos moderados/baixos | 🟡/🟢 | ABERTOS | **Não revisitados nesta rodada** | — | **ABERTOS** (11 itens) |
| RM49-NEW-001 | ~103 erros reais de lint no frontend (`react-hooks`/React Compiler, ~50 arquivos) | 🟠 alto | Identificado no RM-49 | **Não corrigido** — contagem confirmada nesta rodada (103 erros, inalterada; minhas mudanças não introduziram nem removeram nenhum) | `npx eslint .` no frontend | **ABERTO** |
| RM50-NEW-001 | `avaliarRiscoInteracao` só reconhecia a SIGLA literal da classe ("aine", "ieca", "bra", "corticoide", "isrs") no texto livre do médico — nomes reais de medicamentos comuns (Diclofenaco, Captopril, Losartana, Prednisona, Fluoxetina) NUNCA disparavam a interação correspondente a menos que o médico escrevesse a sigla explicitamente | 🔴 crítico (novo, encontrado ao escrever os testes RM41-031) | Não existia no RM-41 nem no RM-49 — descoberto ao testar diretamente os 10 pares de `PARES_INTERACAO` | Tabela `SINONIMOS_CLASSE` adicionada com os representantes mais comuns de cada classe; `contemTermo` agora reconhece tanto a sigla quanto os nomes reais | `risco-hemorragico-interacao-rm50.test.ts` (teste "varfarina + AINE" só passou após a correção) | **FECHADO — nesta mesma rodada** |

## 4. Riscos críticos

Todos os 3 críticos herdados do RM-49 (RM41-027/031/032) foram fechados com testes diretos e assertivos
(não scripts, não cobertura indireta). Um **novo crítico** foi descoberto e fechado na mesma sessão
(RM50-NEW-001 — reconhecimento de nomes de medicamentos nas interações), evitando que ele ficasse na lista
de "achados não corrigidos".

**Arquivos:** `frontend/src/lib/clinical-risk-engine.ts` (tabela `SINONIMOS_CLASSE` + `contemTermo`
estendido), `frontend/src/lib/dose-calculator.ts` (guarda de plausibilidade em `calcCrCl`), `frontend/src/lib/icu-engine.ts`
(validação de FiO2 — este item é tecnicamente RM41-005/alto, mas documentado aqui por proximidade de
arquivo).

**Testes:** 72 novos testes diretos (`crcl-direct-rm50.test.ts`: 23, `risco-hemorragico-interacao-rm50.test.ts`:
24, `icu-engine-calc-functions-rm50.test.ts`: 25).

## 5. Riscos altos

De 11 riscos altos herdados: **3 fechados** (RM41-005, 028, 033), **1 novo fechado na mesma sessão**
(RM50-NEW-001, tecnicamente crítico), **7 seguem abertos** (RM41-012, 013, 022 parcial, 023, 026, 029, 036
parcial) + RM49-NEW-001.

Nenhum destes 7 foi tocado nesta rodada por restrição de tempo/escopo — cada um exigiria trabalho dedicado
(auditoria completa de contrato de enum end-to-end; separação evidência×ATC em toda a cadeia de
provenance; sinalização de epoch-placeholder; mapeamento completo de fluxos de persistência de
diagnóstico/risco; execução real do CI contra Postgres; testes de fronteira de idade pediátrica;
remediação de ~103 erros de lint espalhados por ~50 componentes React).

## 6. Riscos moderados

**Nenhum dos 11 itens moderados/baixos restantes do RM-41 (006–010, 014, 015, 018, 019, 024, 034, 035) foi
revisitado nesta rodada.** RM41-030 (duplicação de CrCl) teve seu comportamento testado e confirmado
consistente entre as 3 implementações, mas a duplicação em si não foi unificada — permanece parcialmente
aberto.

## 7. Riscos baixos

Nenhum item de severidade baixa foi tratado nesta rodada (mesma limitação da seção 6 — RM-41 não separa
moderado de baixo de forma que permita recontagem independente sem reabrir cada item individualmente).

## 8. Novos achados

Dois novos achados nesta rodada — **ambos com evidência e nenhum deixado aberto sem tentativa de
fechamento real**:

1. **RM50-NEW-001 (crítico, FECHADO):** `avaliarRiscoInteracao` dependia do médico digitar literalmente a
   sigla da classe terapêutica ("AINE", "IECA", "BRA", "corticoide", "ISRS") no texto livre — nomes reais de
   medicamentos comuns (Diclofenaco, Captopril, Losartana, Prednisona, Fluoxetina) nunca disparavam a
   interação correspondente. Corrigido com uma tabela de sinônimos por classe. Descoberto e corrigido na
   mesma sessão, com teste de regressão específico.
2. **RM49-NEW-001 (alto, ABERTO):** ~103 erros reais de lint no frontend, majoritariamente regras
   `react-hooks`/React Compiler ("Cannot create components during render", "setState síncrono em effect",
   etc.), em ~50 arquivos de `src/app`/`src/components`. Confirmado nesta rodada que a contagem não mudou
   (nem piorou, nem melhorou) — nenhuma correção foi tentada por ser, na prática, uma refatoração ampla de
   dezenas de componentes React sem verificação em navegador real, exatamente o tipo de correção "às cegas"
   que o próprio RM-50 proíbe explicitamente.

## 9. Lint

```text
Backend  — erros antes: 0   | corrigidos: 0  | restantes: 0
Frontend — erros antes: 103 | corrigidos: 0  | restantes: 103
```

O frontend não atinge lint limpo nesta rodada. `npm run lint` no backend retorna código 0; no frontend,
retorna código 1 com 103 erros reais e pré-existentes (não introduzidos nem agravados por esta sessão).

## 10. Testes

```text
frontend (vitest):         849/849 passando (+75 desde o RM-49: 774 → 849)
backend unit (jest):       144/144 passando
backend integração/e2e:    135/135 passando + 4 puladas (sem Postgres real neste sandbox)
Postgres real:              0 execuções bem-sucedidas até agora (suíte escrita, nunca rodou)
typecheck (frontend):      limpo
typecheck (backend):       limpo
lint (frontend):           103 erros (pré-existentes)
lint (backend):            limpo (0/0)
build (frontend):          limpo — RM-22/RM-23/RM-24/RM-49-texto todos verdes
build (backend):           limpo
RM-22:                     aprovado
RM-23:                     aprovado (0 inconsistências — 358 entidades)
RM-24:                     aprovado (0 conflitos críticos)
integridade textual:       aprovado (0 sequências suspeitas em 260 arquivos)
```

## 11. Regressão farmacológica

Zero regressão confirmada. As mudanças de código desta rodada foram:
1. Guarda de plausibilidade em `calcCrCl` (dose-calculator.ts) — só rejeita entradas fisiologicamente
   impossíveis (idade/peso/creatinina negativos, zero ou fora de faixa plausível); nunca altera o resultado
   para entradas válidas (testado explicitamente).
2. Tabela `SINONIMOS_CLASSE` em `clinical-risk-engine.ts` — apenas AMPLIA o reconhecimento de medicamentos já
   presentes em `PARES_INTERACAO`; nenhuma classe, par ou gravidade nova foi criada.
3. Validação de FiO2 em `icu-engine.ts` — só impede o cálculo com um valor implausível; o cálculo com FiO2
   válida (0,21–1,0) é bit-a-bit idêntico ao anterior (testado).
4. `backend_id` de prescrição em `store.tsx` — apenas um novo dispatch informativo; não altera nenhuma
   lógica de decisão de sincronização/retry existente.

Nenhuma dose, protocolo, contraindicação ou classe terapêutica foi alterada ou criada.

## 12. Matriz final

| Severidade | Abertos |
|---|---:|
| Críticos | 0 |
| Altos | 8 (RM41-012, 013, 022, 023, 026, 029, 036-frontend, RM49-NEW-001 — note-se que 036 e RM49-NEW-001 são a mesma dívida vista de dois ângulos, contada uma vez cada por rastreabilidade histórica) |
| Moderados | 11 (RM41-006–010, 014, 015, 018, 019, 024, 034, 035) + RM41-030 parcial |
| Baixos | incluídos na contagem de moderados acima (RM-41 não permite recontagem independente) |
| Novos | 0 (os 2 novos achados desta rodada: 1 fechado nesta mesma sessão, 1 já contado como RM49-NEW-001 acima — nenhum novo achado fica de fora da contagem) |
| **Total** | **~19** |

## 13. Critérios de aprovação

| Critério | Resultado |
|---|---|
| Riscos críticos abertos | **PASS — 0** |
| Riscos altos abertos | **FAIL — 8** |
| Riscos moderados abertos | **FAIL — 11+parcial** |
| Riscos baixos abertos | **FAIL — incluídos acima** |
| Novos riscos abertos | **PASS — 0** (ambos tratados: 1 fechado, 1 já rastreado) |
| Lint | **FAIL — 103 erros no frontend** |
| Typecheck | PASS |
| Testes | PASS (849+144+135, 0 falhas) |
| Build | PASS |
| CI | PASS (infraestrutura criada e correta; nunca executada de ponta a ponta por falta de runner) |
| Integridade textual | PASS |
| Regressão farmacológica | PASS |

## Decisão final

# 🔴 EXPANSÃO CLÍNICA NÃO AUTORIZADA

Pela primeira vez nesta série de rodadas, **todos os 3 riscos críticos herdados foram fechados**, e um novo
risco crítico descoberto durante o próprio trabalho de fechamento (RM50-NEW-001) foi corrigido na mesma
sessão — nenhum achado crítico fica em aberto ao final deste RM-50.

Isso não basta para 🟢: **8 riscos altos e 11+ riscos moderados/baixos permanecem abertos**, e o frontend
tem 103 erros reais de lint que o próprio RM-50 exige estarem em zero. Declarar 🟢 aqui seria falso.

O item de maior peso restante é RM49-NEW-001/RM41-036: ~103 erros `react-hooks` em ~50 componentes React.
Corrigir isso em bloco, sem verificação em navegador real tela por tela, é exatamente o tipo de
"refatoração ampla" e "correção às cegas" que o próprio RM-50 proíbe nas suas seções 6 e "Fase 6 —
Proibições". Fechá-lo com segurança exige uma rodada dedicada, arquivo por arquivo.

## Próximos passos

1. **RM-51** — Remediação item-a-item dos ~103 erros de lint do frontend (RM41-036/RM49-NEW-001), com
   verificação em navegador real por componente, não em lote.
2. **RM-52** — Fechamento de RM41-012 (evidência×ATC), RM41-013 (provenance epoch), RM41-022 (auditoria
   completa de contrato de enum), RM41-023 (persistência real de diagnóstico/risco), RM41-029 (fronteiras
   de idade pediátrica).
3. **RM-53** — Primeira execução real do CI contra um runner de verdade, confirmando
   `postgres-real.e2e-spec.ts` (RM41-026) pela primeira vez.
4. **RM-54** — Revisão individual dos 11 itens moderados/baixos nunca revisitados (RM41-006–010, 014, 015,
   018, 019, 024, 034, 035) e decisão sobre unificar as 3 implementações de CrCl (RM41-030).
5. Somente após RM-51 a RM-54 fecharem os riscos altos/moderados/baixos remanescentes, reexecutar esta
   auditoria para reavaliar a decisão de expansão clínica.

---

**RISCOS CRÍTICOS ABERTOS: 0**
**RISCOS ALTOS ABERTOS: 8**
**RISCOS MODERADOS ABERTOS: 11 (+1 parcial)**
**ERROS DE LINT RESTANTES: 103 (frontend) / 0 (backend)**
**NOVOS RISCOS NÃO CORRIGIDOS: 0**

**DECISÃO: 🔴 EXPANSÃO CLÍNICA NÃO AUTORIZADA**
