# RM-103 — Semântica da unidade de dose no `dosing-engine.ts`

**Origem:** achado fora do escopo da [RM-100](RM-100-AMOXICILINA-CLAVULANATO-POSOLOGIA-POR-APRESENTACAO.md). Em `calcularDosagem`, as
unidades `mg` e `mg/kg` eram tratadas como **total do dia** e divididas pelas tomadas, mas os dados estão escritos **por tomada**.
O trabalho foi feito numa sessão separada e **consolidado nesta sessão**, junto com a reconciliação com a RM-100.

## O problema (medido na tela `/dosagem`)

Dipirona 500 mg 6/6h → 125 mg por dose; paracetamol 750 mg 6/6h → 187,5 mg; amoxicilina 500 mg 8/8h → 166,7 mg; ibuprofeno 400 mg 8/8h → 133,3 mg;
metformina 500 mg 12/12h → 250 mg. **Subdose sistemática de 2–4×.**

## O que mudou

- **Semântica única:** todas as unidades são **por tomada**, exceto `mg/kg/dia`, que é o total do dia (a frequência o divide em tomadas).
  Total diário = dose por tomada × tomadas/dia; os tetos e os selos `excede_dose_maxima_*` comparam valores brutos coerentes com essa semântica.
- **Teste RM-54 corrigido** (`dosing-engine-unit-audit.test.ts`): ele fixava "10 mg/kg × 10 kg ÷ 3 doses" = 7 gotas, que era justamente a divisão indevida;
  o valor correto é 100 mg por dose → 1 mL → **20 gotas**.
- **Dados corrigidos junto** (fontes citadas no código e nos testes pela sessão que implementou; **não foram reverificadas nesta consolidação**):
  - **Fenitoína:** passou a `mg/kg/dia` (a fonte é por dia); manutenção neonatal 4–8 mg/kg/dia, sem o teto absoluto de 20 mg/dia (sem fonte).
  - **Paracetamol neonato:** removido o teto absoluto de 40 mg que era, na verdade, 40 mg/kg/dia.
  - **Dienogeste:** 2 mg **1x/dia** (antes 12/12h) em `dosing-engine.ts` e em `pharma-library.ts`, alinhado a `pharma-database-gineco` e ao catálogo Eurofarma.
  - **Salbutamol:** regras por apresentação (nebulização em mg × aerossol de 100 mcg/jato), com `dose_minima_por_dose_mg` (piso de 2,5 mg por tomada na nebulização pediátrica).

## Reconciliação com a RM-100 (sem conflito, sem duplicidade)

- **Um único `formulacao_ids`** em `RegraDoagem` (o da RM-100) e **uma única** lógica de seleção de regra (`aplicaveis`, com prioridade para a regra presa à apresentação).
  A versão paralela da outra linha de trabalho foi descartada.
- **Amoxicilina-clavulanato:** os totais do dia que a RM-100 usava (1750 e 1500 mg, necessários só sob a convenção antiga) voltaram a **875 mg (12/12h)** e **500 mg (8/8h)**.
  O comentário "neste motor `mg` é o total do dia" foi removido.
- **Numeração:** este trabalho foi renomeado de RM-101 para **RM-103** (RM-101 é a auditoria de NNH).
- Um teste do RM-103 assumia a antiga regra geriátrica da amoxicilina-clavulanato (500 mg 12/12h); foi ajustado para a regra por apresentação da RM-100 (500/125 mg 8/8h = 1500 mg/dia).

## Descartado por ser duplicado

Uma terceira sessão (defaults clínicos em `clinical-decision-support.ts`, `clinical-risk-engine.ts` e `icu-engine.ts`) tinha alterações sem commit para o mesmo anti-padrão
"dado ausente tratado como normal". O `main` já corrige isso com outro desenho (`dadosAusentes` na UTI, RM-39 no motor de risco, RM-82 no CDS, com testes próprios).
Importá-las duplicaria a lógica e conflitaria; **não foram integradas** e continuam intactas na worktree `laughing-herschel-4c4577`.

## Testes

- **Novo** `rm103-semantica-unidade-dose.test.ts` (39 testes): adultos, pediatria, neonato, tetos e flags, dienogeste, salbutamol e fenitoína.
- `dosing-engine-unit-audit.test.ts` e `rm100-…` mantidos e passando.

## Gates

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` | ✅ **83 arquivos / 1418 testes** |
| `npm run build` | ✅ 50/50 páginas |
