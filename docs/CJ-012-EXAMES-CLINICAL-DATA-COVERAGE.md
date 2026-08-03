# CJ-012 — Exames Laboratoriais como Dado Clínico de Decisão

**Origem do achado:** RM-64 (`docs/RM-64-CLINICAL-JOURNEY-ACCEPTANCE.md`, seção 7)
registrou "cobertura de exames" como **risco de cobertura** (não lacuna clínica): a
etapa "exames" da jornada descrita na RM não tinha cenário dedicado, porque não
existe no sistema um módulo formalizado de solicitação/interpretação de exames a
reaproveitar. Fechado aqui como RM própria, por solicitação explícita, com **escopo
deliberadamente reduzido** decidido em conjunto com o usuário: provar que dado de
exame já flui como decisão clínica real, sem construir um módulo novo.

**Escopo:** exclusivamente um novo cenário de teste de integração (CJ-012),
seguindo o mesmo padrão dos CJ-001 a CJ-011. Nenhum código de produção foi
alterado — nenhum motor, nenhuma tela, nenhum módulo novo de exames.

---

## 1. Decisão de escopo (registrada, não assumida)

Apresentadas 3 opções ao usuário:
(a) cenário de aceitação reaproveitando dado de exame já existente na anamnese;
(b) pular para o próximo item do roadmap (jornada gestante/lactante);
(c) escopo diferente, a especificar.

Escolhida a opção (a) — este relatório documenta exatamente essa escolha, para que
uma leitura futura não confunda "cobertura de exames" com "há um módulo de exames
no sistema" (não há).

## 2. Cenário adicionado — CJ-012

Novo `describe` em `frontend/src/tests/clinical-journey-acceptance-rm64.test.ts`,
3 testes, encadeando 3 funções reais a partir do **mesmo dado objetivo de exame**
(sem nenhuma queixa/HDA textual de diabetes):

1. **Diagnóstico:** `analyzeClinical` com `laboratorio: { glicemia: '180', hba1c: '7.8' }`
   → hipótese DM2 (CID E11) presente, citando o critério real "Glicemia de jejum ≥
   126 mg/dL" (`BASE_CLINICA['dm2']`, SBD 2023/ADA 2024) — prova que o exame sozinho,
   sem texto, já cruza `peso_minimo_para_incluir`.
2. **Risco:** `avaliarRiscoClinico` com `funcao_renal: { creatinina: 2.2 }` → a
   dimensão `risco_renal` reflete o valor real medido (fator cita "2.2", score ≥ 40 —
   faixa "disfunção renal moderada" de `avaliarRiscoRenal`).
3. **Dose:** `calcCrCl` usando a **mesma** creatinina do exame (não um valor novo) →
   `getAdjustmentForCrCl` sobre o `ajuste_renal` real da entidade Metformina
   (`pharma-database.ts`, 1ª linha de `PROTOCOLOS.dm2`) → resultado real "TFG 30-60:
   Reduzir, monitorar" (nunca "Contraindicado", que só se aplica abaixo de CrCl 30 —
   cenário já coberto por CJ-004 com o perindopril).

O ponto central do cenário: o **mesmo número objetivo** (creatinina 2.2 mg/dL)
alimenta 2 etapas diferentes do motor (risco e dose) sem duplicar nem divergir —
prova de que o dado de exame é tratado como fonte única de verdade, não recalculado
ou reinventado em cada etapa.

## 3. O que este cenário NÃO faz (limite de escopo explícito)

- Não cria nem simula uma tela de "solicitação de exames" ou "resultado de exames"
  — não existe no sistema hoje.
- Não adiciona nenhum campo novo a `Anamnesis`/`RenalFunction`/`HepaticFunction` —
  `laboratorio`/`funcao_renal` já existiam e já eram consumidos pelo motor
  (`BASE_CLINICA['dm2']`, `avaliarRiscoRenal`); o cenário só prova isso por teste.
- Não fecha a etapa "exames" como "módulo completo" — fecha especificamente a
  garantia de que o dado, quando presente, é tratado como decisão real e não
  ignorado/duplicado.

## 4. Gates executados nesta sessão

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **61 arquivos / 1095 testes** — todos passando (3 novos desta correção; os 1092 pré-existentes continuam verdes) |
| `npm run test:coverage` | ✅ Exit 0 |
| `npm run build` | ✅ Sucesso — `[RM-23]`/`[RM-24]`/`[RM-49]`/`[RM-62]` prebuild gates verdes; compilação Next.js concluída, todas as 50 rotas geradas |

`DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md`, regenerados como
efeito colateral do build, foram revertidos (`git checkout --`).

## 5. Arquivos alterados

**Modificados:**
- `frontend/src/tests/clinical-journey-acceptance-rm64.test.ts` — novo `describe`
  CJ-012 (3 testes), reaproveitando os mesmos imports/fixtures já existentes no
  arquivo (`baseAnamnesis`, `analyzeClinical`, `avaliarRiscoClinico`, `calcCrCl`,
  `getAdjustmentForCrCl`, `getAllDrugs`).
- `docs/RM-64-CLINICAL-JOURNEY-MATRIX.md` — nova seção CJ-012.
- `docs/RM-64-CLINICAL-JOURNEY-ACCEPTANCE.md` — seções de métricas, riscos e
  próximos passos atualizadas para refletir o fechamento (com escopo reduzido).

**Novos:**
- `docs/CJ-012-EXAMES-CLINICAL-DATA-COVERAGE.md` (este relatório)

Nenhum dado farmacológico, protocolo terapêutico, motor de risco/segurança/dose,
ou componente de UI foi alterado.

---

Não foi feito commit, push ou deploy nesta RM.
