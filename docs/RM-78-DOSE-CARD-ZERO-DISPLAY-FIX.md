# RM-78 — Corrige exibição enganosa "0x/dia = 0 mL/dia" no card de cálculo de dose

**Origem:** achado reportado pelo usuário testando a calculadora de dose
para Hidroxizina (frequência cadastrada "3–4×/dia", uma frequência
variável não determinável automaticamente). O card mostrava:

```
12,5 mL por dose × 0x/dia = 0 mL/dia
Total diário: 0 mL/dia (limitado ao máximo)
```

## Diagnóstico

`dose-calculator.ts` já tinha, desde o RM-36, um invariante explícito e
documentado: quando a frequência não pode ser determinada com segurança
(PRN, contínuo, variável como "3–4×/dia", ou texto não reconhecido),
`tomadas_dia` é setado como **sentinela 0** e um comentário no próprio
código diz literalmente "nunca rotulado como '0x/dia', que induziria o
leitor a pensar que uma frequência real foi determinada" — e a string
`posologia_sugerida` principal já respeita isso (mostra "frequência a
confirmar" em vez de "0x/dia").

**O bug**: esse invariante não tinha sido propagado para uma segunda
linha de exibição em `DoseCalcCard.tsx` (o card visual usado em
`/prescricao-rapida` e outros fluxos), que interpolava
`{tomadas_dia}x/dia` e `{volume × tomadas}` diretamente — produzindo
exatamente o "0x/dia = 0 mL/dia" que o comentário original dizia para
nunca acontecer.

**Segundo problema, relacionado**: a flag `limitado_por_dose_max` era
reaproveitada para DOIS sentidos diferentes — "dose total excedeu o
máximo diário" (o significado do nome) E "frequência indeterminada,
dose total nunca calculada" (RM-36) — fazendo a UI rotular "Total diário:
0 mL/dia" com "(limitado ao máximo)", que é factualmente errado nesse
caso: não foi limitado a máximo nenhum, simplesmente não foi calculado.

**Risco de segurança avaliado e descartado**: o botão "Aplicar esta
posologia" já é desabilitado (`disabled={hasCritical}`) sempre que há um
alerta 🚨 — e a branch de frequência indeterminada sempre gera um alerta
🚨. Confirmado em `prescricao-rapida/page.tsx`: `applyDoseCalc()` nunca é
chamado nesse estado, então o texto errado nunca chegava a uma
prescrição real — era estritamente um problema de exibição no card,
como o usuário identificou ("a sugestão de dose... está imprecisa").

## O que foi corrigido

- `frontend/src/lib/dose-calculator.ts`: novo campo dedicado
  `frequencia_indeterminada: boolean` em `FullDoseResult`, setado `true`
  apenas na branch onde `tomadas = 0` por frequência não determinável.
  `limitado_por_dose_max` não foi alterado (mantém seu comportamento e
  os testes existentes que já dependiam dele).
- `frontend/src/components/modules/DoseCalcCard.tsx`: as 3 linhas de
  exibição (mL/dia, gotas/dia, total diário) agora checam
  `frequencia_indeterminada` primeiro e mostram texto preciso
  ("frequência a confirmar — total diário não calculado") em vez de
  "0x/dia = 0 mL/dia" ou "(limitado ao máximo)".

## Achado sobre a classificação de Hidroxizina (não corrigido — não é bug)

O usuário também questionou se Hidroxizina deveria ser "Ansiolítico" ou
"Anti-histamínico". Investigado: é intencional, não um erro. O cadastro
(`pharma-database-neuro-b.ts`) já documenta os dois — `classe:
'Ansiolítico'` reflete o uso clínico aprovado (bula Atarax® inclui
ansiedade de curto prazo como indicação), e `subclasse: 'Anti-histamínico
H1 de 1ª geração...'` documenta o mecanismo farmacológico real. Nenhuma
alteração feita.

## Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **62 arquivos / 1102 testes** — todos passando (4 asserções novas em testes existentes, nenhum teste novo) |
| `npm run test:coverage` | ✅ Exit 0 |
| `npm run build` | ✅ Sucesso — `RM-23: 381 entidades, 0 inconsistências`; `RM-24: aceitos=0`; `RM-49: integridade textual OK`; `RM-62: 0 BLOCKING_ERROR` |

`DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md`, regenerados
como efeito colateral do build, foram revertidos (`git checkout --`).

## O que NÃO foi alterado

Nenhuma lógica de cálculo de dose, nenhuma regra de segurança/bloqueio —
o botão "Aplicar" já bloqueava corretamente este caso antes desta RM.
Nenhum dado farmacológico (incluindo a classificação de Hidroxizina).
`prescricao-rapida/page.tsx` não precisou de alteração (o caminho de
aplicação real nunca é alcançado neste estado).

---

## Arquivos alterados

**Novo:**
- `docs/RM-78-DOSE-CARD-ZERO-DISPLAY-FIX.md` (este relatório)

**Modificados:**
- `frontend/src/lib/dose-calculator.ts`
- `frontend/src/components/modules/DoseCalcCard.tsx`
- `frontend/src/tests/dose-calculator-frequencia-parser.test.ts`

---

Não foi feito commit, push ou deploy nesta RM.
