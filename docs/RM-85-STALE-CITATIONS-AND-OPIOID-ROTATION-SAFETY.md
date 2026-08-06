# RM-85 — Nova varredura de qualidade: citações de HAS remanescentes + fator de rotação de opioide sem guarda

**Origem:** o usuário pediu explicitamente uma nova varredura de qualidade
(mesmo padrão RM-54/RM-82), sem achado específico em mãos. Gates
reexecutados do zero (todos verdes) e delegada uma investigação read-only
(Explore) instruída a NÃO reauditar `clinical-decision-support.ts`,
`clinical-risk-engine.ts` ou o motor de ICU (já limpos), focando em
arquivos ainda não revisados nesta série de sessões.

## Achados confirmados e corrigidos

### 1. Citação de HAS desatualizada — 5 locais adicionais

O mesmo padrão de citação obsoleta corrigido no RM-81/RM-82 (agora todos
apontando para **Diretriz Brasileira de Hipertensão Arterial – 2025**,
DBHA 2025, SBC/SBN/SBH, DOI `10.36660/abc.20250624`) tinha sobrado em mais
5 lugares:

- **`pharma-database-cardio.ts:1466`** — a própria entrada Zart H®
  (Losartana + Hidroclorotiazida), adicionada NESTA MESMA série de sessões
  (RM-83), citava "7ª Diretriz... SBC 2020" enquanto a entrada irmã Holmes
  H®, 9 linhas abaixo, já citava DBHA 2025 corretamente — duas entradas de
  combinação quase idênticas discordando entre si.
- **`clinical-reasoning.ts:110,161`** — duas entradas do motor de
  raciocínio clínico citavam "Diretrizes Brasileiras de HAS 2023" (SBC).
- **`pharma-library.ts:868`** — mesma citação de 2023, na lista de
  diretrizes associadas ao Holmes® (monoterapia).
- **`eurofarma-sync.ts:3150`** — `CORRELACAO_TERAPEUTICA` (mapa real
  Diagnóstico→Diretriz→Classe→Molécula→Marcas, o mesmo array em que o
  RM-83 registrou `euro-holmes-h`) citava "VII Diretriz Brasileira de HAS
  — SBC/SBH/SBN 2016".

Todas corrigidas para DBHA 2025, mesmo formato usado no RM-81.

**Não corrigido, propositalmente:** `medical-audit.ts:564,574` também cita
a diretriz de 2020, mas essa é uma entrada de **log de auditoria
simulado** (`gerarIdPacienteAnonimo('demo-2')`, timestamp `dataDe(0)`),
representando um atendimento datado no passado — citar a diretriz vigente
naquela data simulada é correto, não um bug. Corrigir isso seria
introduzir um anacronismo (o "médico" do registro teria citado uma
diretriz que ainda não existia).

### 2. `calcOpioidRotation()` — fator de conversão sem guarda (achado de maior severidade)

`palliative-engine.ts` — a calculadora de rotação de opioides usava
`?? 1` quando a via informada não tinha fator de conversão cadastrado na
tabela `toMorfinaOral` (que só mapeia vias realmente documentadas: ex.
fentanil só tem TD/IV, buprenorfina só TD, codeína só VO). Isso tratava
**silenciosamente qualquer combinação opioide/via não mapeada como
equipotente à morfina oral** — para fentanil (fator real ~100), isso
subestimaria a dose equianalgésica em ~100 vezes, sem nenhum aviso.
Mesmo antipadrão já corrigido em `clinical-decision-support.ts` (RM-82),
`clinical-risk-engine.ts` (RM-39) e no motor de ICU — aqui alcançando uma
calculadora de dose de opioide.

A função não tem nenhum chamador ainda no código (não está wireada a
nenhuma UI), o que reduz o risco imediato, mas o padrão do projeto é nunca
deixar um default perigoso mesmo em código ainda não integrado.

**Corrigido:**
- Tabela de fatores extraída para `TO_MORFINA_ORAL` (nível de módulo) e
  tipo `OpioidRoute` (`'VO' | 'SC' | 'IV' | 'TD'`) exportado — antes, os
  parâmetros da função só aceitavam `'VO' | 'SC' | 'IV'`, tornando
  inatingíveis via tipo as combinações TD de fentanil/buprenorfina (bug de
  tipo latente, também corrigido).
- Quando `fatorAtual` ou `fatorAlvo` é `undefined`, a função agora
  **bloqueia o cálculo** (`bloqueado: true`, `dose_equi_mg: 0`) e retorna
  uma instrução `🚨 BLOQUEADO` explicando qual opioide/via não tem fator
  cadastrado e listando as vias válidas — nunca mais calcula com fator 1
  silenciosamente.
- Campo novo `bloqueado: boolean` no retorno, para uma futura UI poder
  desabilitar a aplicação da dose calculada (mesmo padrão já usado em
  `FullDoseResult.frequencia_indeterminada`).

## Achados investigados e não confirmados como bug (sem ação)

- **`explainable-ai-v2.ts:780`** (`trust_score ?? 70`) — só afeta a
  exibição de confiança do motor de explicabilidade, não uma decisão de
  dose/segurança. Registrado, mas de severidade baixa o suficiente para
  não justificar ação nesta RM.
- **`prognostic-engine.ts`** (escores CURB-65/CHA₂DS₂-VASc/HAS-BLED/Wells/
  Child-Pugh/PEWS/FRAX usando `?? 0` em critérios booleanos) — são campos
  de formulário Sim/Não explícitos, não medições de dispositivo
  silenciosamente ausentes; o risco só existiria se a UI permitisse
  calcular com campos não respondidos — não verificado nesta RM, fica
  registrado para investigação futura.
- **`dosing-engine.ts`** (`volume_ref_mL ?? 1`) — revisado, é a convenção
  padrão de referência de concentração, não uma medição mascarada.
- Nenhum bug de UI da mesma classe do RM-83/84 (seleção não sincronizando
  estado dependente) foi encontrado em `dosagem/page.tsx`,
  `comparador/page.tsx` ou `PrescriptionPanel.tsx`.
- Nenhuma combinação de catálogo ausente (do tipo Holmes H) foi encontrada
  em `pharma-database*.ts` além do que já foi fechado no RM-83.

## Testes novos

`frontend/src/tests/rm85-opioid-rotation-safety.test.ts` (6 testes):
prova que vias sem fator cadastrado (fentanil SC, buprenorfina IV,
codeína IV) bloqueiam o cálculo com `bloqueado: true`/`dose_equi_mg: 0`,
que vias reais e mapeadas (fentanil TD, morfina VO → oxicodona VO)
continuam calculando corretamente sem regressão, e que a mensagem de
bloqueio identifica exatamente qual opioide/via está sem fator.

## Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo (antes e depois das correções) |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **65 arquivos / 1131 testes** — todos passando (64/1125 antes + 1 arquivo novo/6 testes novos) |
| `npm run build` | ✅ Sucesso — 50 rotas geradas, nenhum erro |

`DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md`, regenerados
como efeito colateral do build, foram revertidos (`git checkout --`).

---

## Arquivos alterados

**Novo:**
- `docs/RM-85-STALE-CITATIONS-AND-OPIOID-ROTATION-SAFETY.md` (este relatório)
- `frontend/src/tests/rm85-opioid-rotation-safety.test.ts`

**Modificados:**
- `frontend/src/lib/pharma-database-cardio.ts`
- `frontend/src/lib/clinical-reasoning.ts`
- `frontend/src/lib/pharma-library.ts`
- `frontend/src/lib/eurofarma-sync.ts`
- `frontend/src/lib/palliative-engine.ts`

---

Não foi feito commit, push ou deploy nesta RM.
