# RM-90 — Nova condição: Enxaqueca (Migrânea, G43)

**Origem:** expansão de cobertura clínica — direção escolhida pelo
usuário após o fechamento integral dos itens do roadmap RM-60 (§9). Entre
3 candidatas apresentadas (Enxaqueca, Gota, DRGE), o usuário escolheu
Enxaqueca.

## Escopo e limite de confiança nas citações

Diferente da maioria dos protocolos deste arquivo (que citam um
documento-fonte único verificado — ex.: a DBHA 2025 usada em HAS,
verificada linha a linha no RM-81), esta RM não tinha um PDF de diretriz
fornecido pelo usuário para verificar DOI/edição/página exatos. Para
nunca repetir o padrão de citação fabricada já corrigido nas RM-76/77/79/81
(DOI inventado ou desatualizado), as doses/classes/contraindicações usadas
são farmacologia básica amplamente estabelecida (mesmo nível de confiança
já usado para doses de Enalapril/Carvedilol nos protocolos existentes),
e o campo `citacao` cita as sociedades de referência (SBCe, American
Headache Society, International Headache Society) **sem DOI específico**
— `doi` deixado `undefined` (campo opcional) em vez de inventado. Teste
dedicado trava isso (`evidencia.doi` ausente em todas as sugestões desta
RM).

## O que foi feito — 3 camadas amarradas

Mesma disciplina já cobrada nas RM-58/66/69: uma condição clínica só é
real no sistema se estiver amarrada em TODAS as camadas que a consulta
real percorre, nunca só numa fonte isolada.

### 1. `frontend/src/lib/clinical-decision-support.ts` — motor diagnóstico

Nova regra `enxaqueca` (CID G43) na base `BASE_CLINICA`, critérios
baseados na ICHD-3 (International Classification of Headache Disorders,
3ª edição — critérios clínicos estáveis, sem substituto nacional
divergente): cefaleia pulsátil, unilateral, náusea/vômito,
fotofobia/fonofobia, piora com atividade física, aura visual, padrão
episódico recorrente. Red flags (critérios SNOOP de cefaleia secundária):
início após os 50 anos, início súbito/thunderclap ("pior dor de cabeça da
vida"), déficit neurológico focal, sinais meníngeos/febre, mudança de
padrão.

### 2. `frontend/src/lib/clinical-therapeutics.ts` — motor terapêutico

Novo protocolo `enxaqueca`, cobrindo tratamento agudo e profilático:

- **Naproxeno** (AINE) — 1ª linha para crise leve-moderada.
- **Sumatriptano** (triptano) — crise moderada-grave; contraindicações
  cardiovasculares completas (coronariopatia, AVC prévio, HAS não
  controlada, enxaqueca hemiplégica/basilar).
- **Propranolol** (betabloqueador) — 1ª linha de profilaxia.
- **Topiramato** (anticonvulsivante) — alternativa de 1ª linha,
  contraindicação de gravidez explícita (teratogênico).

Cada sugestão segue exatamente a mesma estrutura (`dose`,
`posologia_completa`, `contraindicacoes`, `efeitos_adversos`,
`monitoramento`, `alternativas`, `evidencia`) de todos os outros
protocolos do arquivo. `nao_farmacologico`/`monitorizacao`/`encaminhamento`
cobrem identificação de gatilhos, diário de cefaleia, e critério explícito
de encaminhamento a especialista.

### 3. Join entre as camadas

`DiagnosticPanel.tsx` (consulta real) busca o plano terapêutico por
`hipotese.id` primeiro, com fallback para `hipotese.cid10` — o `id:
'enxaqueca'` da nova regra diagnóstica casa exatamente com a chave
`enxaqueca:` do novo protocolo terapêutico, sem precisar de mapeamento
adicional. `CID_CONDITION_MAP` (usado por `/explicabilidade`, RM-65)
ganhou a entrada `G43: 'enxaqueca'`.

## O que NÃO foi alterado / fora de escopo desta RM

- `second-opinion.ts` (`/segunda-opiniao`) e `EVIDENCIA_DB`/`ALTERNATIVAS_DB`/
  `WHATIF_DB` de `explainable-ai-v2.ts` **não** ganharam entrada para
  enxaqueca — ambos têm fallback honesto já testado (RM-87/88/89): sem
  entrada curada, o sistema cai graciosamente no caminho genérico/"nenhuma
  correspondência", nunca quebra, nunca inventa conteúdo. Expandir esses
  catálogos para a nova condição fica para uma RM futura dedicada, se
  decidido.
- Nenhum motor clínico pré-existente (dose, segurança, priorização,
  comparador) foi alterado — só adição de dado novo.

## Testes novos

`rm90-enxaqueca-coverage.test.ts` (13 testes):

- Motor diagnóstico: quadro típico reconhecido com CID correto;
  diagnóstico prévio via comorbidade; anamnese vazia nunca sugere a
  condição (sem critério de ausência); red flags (início súbito, déficit
  neurológico) disparam `encaminhamento_urgente`; quadro típico sem red
  flag não dispara urgência.
- Motor terapêutico: protocolo cobre as 4 moléculas; contraindicações
  cardiovasculares do triptano; contraindicação de gravidez do
  topiramato; nenhum DOI fabricado; CID não reconhecido continua `null`.
- Join: `hipotese.id` → `getTherapeuticForCondition` encontra o protocolo
  real, mesmo padrão de `DiagnosticPanel.tsx`; `CID_CONDITION_MAP.G43`
  correto.

## Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **70 arquivos / 1196 testes** |
| `npm run build` | ✅ Sucesso — 50 rotas; RM-23/24 (validador cross-database) sem novas inconsistências (0 críticos/divergentes) |

---

## Arquivos alterados

**Novo:**
- `docs/RM-90-ENXAQUECA-NOVA-CONDICAO.md` (este relatório)
- `frontend/src/tests/rm90-enxaqueca-coverage.test.ts`

**Modificados:**
- `frontend/src/lib/clinical-decision-support.ts` — nova regra diagnóstica `enxaqueca` (G43).
- `frontend/src/lib/clinical-therapeutics.ts` — novo protocolo terapêutico `enxaqueca`.
- `frontend/src/lib/explicabilidade-context.ts` — `CID_CONDITION_MAP` ganhou `G43: 'enxaqueca'`.

---

Não foi feito commit, push ou deploy nesta RM.
