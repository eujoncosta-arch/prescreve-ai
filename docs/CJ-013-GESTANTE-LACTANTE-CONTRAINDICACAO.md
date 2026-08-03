# CJ-013 — Gestante/Lactante com Contraindicação Farmacológica Real

**Origem do achado:** RM-64 (`docs/RM-64-CLINICAL-JOURNEY-ACCEPTANCE.md`, seção 8,
item 5) registrou "cenário de gestante/lactante com contraindicação farmacológica"
como item prioritário não coberto pelos 10 cenários mínimos, notando explicitamente
que `eligibilityContextFromAnamnesis`/`EligibilityContext` já suportam
`gestante`/`lactante` — reaproveitável sem inventar regra clínica nova. Fechado aqui
como RM própria e isolada, por solicitação explícita, seguindo a priorização do
roadmap pós-consolidação (item 5, após GAP-01, ACHADO-01, CJ-009 e a cobertura de
"exames" via CJ-012).

**Escopo:** exclusivamente um novo cenário de teste de integração (CJ-013), seguindo
o mesmo padrão dos CJ-001 a CJ-012. Nenhum código de produção foi alterado — nenhuma
regra clínica nova, nenhum motor, nenhuma tela.

---

## 1. Cenário adicionado — CJ-013

Novo `describe` em `frontend/src/tests/clinical-journey-acceptance-rm64.test.ts`,
4 testes, encadeando funções reais já existentes com um contexto de
gestante/lactante:

1. **Protocolo curado não é re-filtrado:** `getTherapeuticForCondition('has', ...,
   ctxGestante)` ainda retorna Enalapril (1ª linha curada de `PROTOCOLOS.has`, o
   mesmo medicamento validado em CJ-001) mesmo com `gestante: true` no contexto —
   confirma, por execução real, que a âncora do protocolo não passa por
   `isEligible`.
2. **Expansão por classe exclui corretamente:** a mesma chamada retorna
   `opcoes_excluidas` contendo Losartana (classe BRA, mesma classe do Enalapril,
   descoberta por `CONDITION_CLASS_KEYS['has']`) com o motivo REAL retornado por
   `isEligible` ("Contraindicado na gestação").
3. **`runSafetyCheck` protege a âncora:** `runSafetyCheck({ moleculas: ['enalapril'],
   gestante: true })` gera um alerta real `tipo: 'gestante'`, `severidade:
   'critical'`, ação "substituir" — a mesma molécula que o protocolo ofereceu sem
   filtro é bloqueada na camada de segurança em tempo de prescrição.
4. **Lactante, mesma classe:** `runSafetyCheck({ moleculas: ['losartana'], lactante:
   true })` gera alerta real `tipo: 'lactante'`, `severidade: 'danger'`.

## 2. Achado confirmado por execução (defesa em profundidade)

O ponto central do cenário — descoberto ao investigar `expandTherapeuticPlan`
(`therapeutic-class-expansion.ts:455-517`) antes de escrever o teste: a função
itera apenas sobre moléculas **descobertas por classe** (`candidates`), nunca
reavalia a elegibilidade da(s) sugestão(ões) já presentes em `plan.farmacologico`
(o `Set already` as pula via `continue`). Isso significa que **a âncora curada do
protocolo nunca é filtrada por gestante/lactante** — um comportamento real do
software, não um bug introduzido aqui, e não alterado por esta RM.

A proteção real para esse caso específico já existia e já era exercida por outros
cenários da própria RM-64 (CJ-004 renal, CJ-005/CJ-006 interação): `runSafetyCheck`,
chamado em tempo de prescrição, verifica CADA molécula prescrita contra
`uso_gestante`/`uso_lactante`, independentemente de ter vindo do protocolo curado ou
da expansão por classe. CJ-013 é o primeiro cenário a provar isso explicitamente
para gestante/lactante, por execução real (não por leitura de código).

Nenhuma correção foi feita — o comportamento é seguro (o alerta real da camada
correta dispara), mas a governança do sistema deveria estar ciente de que a camada
de geração do plano terapêutico, isoladamente, NÃO é suficiente para gestante/lactante;
depende de `runSafetyCheck` rodar antes da prescrição ser finalizada.

## 3. Gates executados nesta sessão

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **61 arquivos / 1099 testes** — todos passando (4 novos desta correção; os 1095 pré-existentes continuam verdes) |
| `npm run test:coverage` | ✅ Exit 0 |
| `npm run build` | ✅ Sucesso — `[RM-23]`/`[RM-24]`/`[RM-49]`/`[RM-62]` prebuild gates verdes; compilação Next.js concluída, todas as 50 rotas geradas |

`DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md`, regenerados como
efeito colateral do build, foram revertidos (`git checkout --`).

## 4. Arquivos alterados

**Modificados:**
- `frontend/src/tests/clinical-journey-acceptance-rm64.test.ts` — novo `describe`
  CJ-013 (4 testes), reaproveitando fixtures/imports já existentes no arquivo
  (`baseAnamnesis`, `eligibilityContextFromAnamnesis`, `getTherapeuticForCondition`,
  `runSafetyCheck`).
- `docs/RM-64-CLINICAL-JOURNEY-MATRIX.md` — nova seção CJ-013.
- `docs/RM-64-CLINICAL-JOURNEY-ACCEPTANCE.md` — item 5 dos próximos passos e
  métricas atualizados para refletir o fechamento.

**Novos:**
- `docs/CJ-013-GESTANTE-LACTANTE-CONTRAINDICACAO.md` (este relatório)

Nenhum dado farmacológico, protocolo terapêutico, motor de risco/segurança/dose,
ou componente de UI foi alterado.

---

Não foi feito commit, push ou deploy nesta RM.
