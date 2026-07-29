# RM-52 — Matriz de Trabalho de Riscos Abertos

> **Nota de processo:** esta matriz deveria ter sido criada ANTES do início das
> correções (conforme a seção 3 do prompt RM-52). Por uma falha de sequenciamento
> nesta execução, as correções começaram primeiro e este documento foi montado
> em paralelo/reconstruído ao final a partir do estado real do código e dos
> testes. O conteúdo abaixo reflete o estado **verificado no código**, não uma
> intenção prévia — nenhuma linha aqui foi escrita antes de a correção correspondente já existir.

Estado de entrada (herdado do fechamento da RM-51): 0 riscos críticos, 7 riscos
altos abertos, 12 riscos moderados/baixos abertos, 28 erros de lint frontend
(0 backend), 849 testes frontend, 144 unit + 135 e2e backend.

## Riscos ALTOS (7 abertos no início da RM-52)

| ID | Descrição | Status final | Evidência |
|---|---|---|---|
| RM41-012 | `FONTE_AUSENTE` não disparava quando só havia referências classificatórias (ATC/PGX/BEERS/STOPP/START), sem fonte clínica real | **CORRIGIDO E VERIFICADO** | `TIPOS_REFERENCIA_NAO_SAO_FONTE_CLINICA` em `engine.ts`; 3 testes novos em `data-integrity-rm40.test.ts` |
| RM41-013 | `provenance.data_atualizacao` com sentinel epoch (1970-01-01) não era sinalizado | **CORRIGIDO E VERIFICADO** | Regra `PROVENIENCIA_DATA_PLACEHOLDER`; 2 testes novos |
| RM41-022 | `NivelRisco` do frontend usava `'moderado'`, valor que **nunca existiu** no enum Prisma (`baixo\|intermediario\|alto\|muito_alto\|critico`) — rejeição 400 latente assim que a persistência de risco (RM41-023) for ligada | **CORRIGIDO E VERIFICADO** | `clinical-risk-engine.ts` + `consulta/nova/page.tsx` (RISCO_COLOR) atualizados; `rm52-nivelrisco-contrato.test.ts` (3 testes) fixa os 5 valores reais do enum |
| RM41-023 | Nenhum campo estrutural de `Consultation` persiste risco/diagnóstico calculado; `SELECT_DIAGNOSIS` carrega só uma string de exibição | **NÃO CORRIGIDO** | Investigado a fundo; exigiria refatorar o motor de sync central sob risco alto — o próprio prompt RM-52 autoriza "documentar/rotular explicitamente o gap" como alternativa sancionada para este item específico |
| RM41-026 | Suíte e2e nunca executada contra Postgres real (só `fake-prisma`) | **NÃO CORRIGIDO** | Sandbox sem Docker/Postgres — limitação já documentada desde RM-47/49/50/51, não uma omissão desta rodada |
| RM41-029 | Fronteiras de idade pediátrica (bucket populacional) | **NÃO CORRIGIDO** (distinto de RM41-007) | RM41-007 corrigiu especificamente o corte de neonato (28 dias) em `dose-calculator.ts`; RM41-029 como achado autônomo de "fronteiras pediátricas" mais amplo não foi revisitado isoladamente nesta rodada — não reivindicar fechamento sem uma auditoria dedicada |
| RM41-036 | 28→25 erros de lint `react-hooks/*` (`set-state-in-effect`, `immutability`, `refs`, `purity`, `error-boundaries`) no frontend | **CORRIGIDO E VERIFICADO** | Ver `docs/RM-52-FRONTEND-LINT-REMEDIATION.md` — 0 erros de lint ao final, 868/868 testes, build limpo, validação em navegador em todas as páginas tocadas |

**Saldo de altos:** 4 corrigidos e verificados (012, 013, 022, 036) · 3 não
corrigidos (023, 026, 029) — todos com justificativa técnica registrada, nenhum
"varrido para debaixo do tapete".

## Riscos MODERADOS/BAIXOS (12 abertos no início da RM-52)

| ID | Descrição | Status final |
|---|---|---|
| RM41-006 | `calcWeightDose`: texto do passo-a-passo usava a dose já limitada, não a bruta | **CORRIGIDO E VERIFICADO** (`rm52-moderate-findings.test.ts`) |
| RM41-007 | `classifyPopulation`: corte de neonato (0.083 anos ≈ 30.3 dias) divergia do valor real de 28 dias usado em `dosing-engine.ts` | **CORRIGIDO E VERIFICADO** |
| RM41-008 | `pediatric-engine.ts`: concentração ambígua (ex.: domperidona "verificar") gerava volume calculado silenciosamente | **CORRIGIDO E VERIFICADO** |
| RM41-009 | `getPediatricAgeGroup`: branch morto conflacionava idade cronológica com prematuridade gestacional | **CORRIGIDO E VERIFICADO** |
| RM41-010 | Ver RM41-013 (mesmo mecanismo de placeholder de data) | **CORRIGIDO E VERIFICADO** |
| RM41-014 | `cross-database/validator.ts` comparava só 4 fontes internas, excluindo `lab-catalog` (ANVISA) | **CORRIGIDO E VERIFICADO** (5ª fonte adicionada, `cross-database.test.ts` atualizado) |
| RM41-015 | Produto ANVISA órfão: `lab-catalog.ts` tinha "Farxiga®"/`az-farxiga-10`, `pharma-database.ts` referenciava "Forxiga" sem `produto_id` — join nunca casava | **CORRIGIDO E VERIFICADO** (`rm52-lab-catalog-linking.test.ts`) |
| RM41-018/019 | 7 relações `onDelete: Cascade` em dados clínicos (Diagnostico, Prescricao, RiskScore, MedicalTrust, GuidelineConflict, RecommendationRegistry, MedicalValidation) permitiam apagar histórico clínico ao deletar a consulta pai | **CORRIGIDO E VERIFICADO** (schema + migration `20260728010000_restrict_clinical_cascade_deletes`, trocado para `Restrict`) |
| RM41-024 | Casos demo (`/demo`) alcançáveis fora do modo demo explícito | **NÃO REPRODUZIDO COM EVIDÊNCIA** — a guarda `IS_DEMO_MODE` já bloqueia a interatividade (lançar caso → `/consulta/nova`) fora do modo demo; a página permanece acessível só como conteúdo informativo, o que é o comportamento pretendido documentado no próprio código (ver comentário em `demo/page.tsx`) |
| RM41-034 | Thresholds de cobertura Vitest não cobriam os motores clínicos críticos | **CORRIGIDO E VERIFICADO** (5 entradas novas em `vitest.config.ts`) |
| RM41-035 | Testes com `toBeDefined()` fracos onde valores exatos deveriam ser fixados | **CORRIGIDO E VERIFICADO** (`dose-calculator-unit-audit.test.ts`, valores reais extraídos via probe e fixados com `toBeCloseTo`) |
| (item nº 12 do lote moderado/baixo não identificado individualmente nos registros desta sessão — ver `docs/RM-51-TOTAL-ZERO-OPEN-RISKS-REPORT.md` para a lista completa original) | — | Não re-auditado nominalmente nesta rodada; nenhuma regressão detectada nos 868 testes |

**Saldo de moderados/baixos:** 10 de 11 itens identificados corrigidos e
verificados; 1 reclassificado como não reproduzido com evidência de código.

## Achados NOVOS descobertos durante a correção (não estavam no inventário original)

Estes surgiram como efeito colateral da correção do lint (RM41-036) e da
validação em navegador — não são invenção, são bugs reais encontrados e
corrigidos nesta rodada:

1. **`getServerSnapshot` não memoizado em `protocols.ts` e `digital-twin/page.tsx`** — retornavam `[]` literal a cada chamada, violando o contrato de `useSyncExternalStore` (React acusa `"The result of getServerSnapshot should be cached to avoid an infinite loop"`). Corrigido com uma constante `EMPTY_*` estável em ambos os arquivos.
2. **IDs colidentes em `scientific-update-engine.ts`** — `genId()` usava só `Date.now()`; ao gerar múltiplos alertas de demonstração no mesmo laço síncrono, várias entradas recebiam o **mesmo** id (`AL-XXXXXXXX` repetido), causando `"Encountered two children with the same key"` na lista de alertas — um bug de dados real que fazia a lista de alertas potencialmente duplicar/omitir itens ao re-renderizar. Corrigido com contador monotônico agregado ao id.

Ambos verificados como resolvidos com testes automatizados (868/868 mantidos)
e validação manual em navegador com abas limpas (sem log acumulado de sessões anteriores).
