# RM-84 — Volume em mL escondido + falta de confirmação manual de frequência no cálculo de dose (Hidroxizina/Pergo®)

**Origem:** o usuário testou a calculadora de dose para Hidroxizina/Pergo®
(formulação líquida, 8 anos/24 kg, frequência de bula "3–4×/dia") e
reportou dois problemas: "não aparece o volume em mL" e "não dá a opção
de adicionar a frequência em nenhum lugar".

## Investigação

Rastreamento do cálculo (`calcFullDose()`) mostrou que o volume em mL
**já estava sendo calculado corretamente** (25 mg ÷ 2 mg/mL = 12,5 mL) —
o cálculo independe da frequência. O problema real: a linha principal de
posologia (`posologia_sugerida`, exibida em destaque no `DoseCalcCard`)
tinha um branch `if (tomadas === 0)` que só mostrava `"25 mg"`, ignorando
por completo o volume já calculado — que só aparecia escondido numa linha
secundária pequena.

O segundo ponto era uma lacuna real: quando a frequência cadastrada é uma
faixa reconhecida (ex.: "3–4x/dia"), o sistema corretamente bloqueia o
cálculo do total diário (RM-36/RM-78 — nunca assumir automaticamente) mas
**não oferecia nenhuma forma de o médico confirmar manualmente** qual
valor usar para destravar o cálculo.

## Correções (`dose-calculator.ts` + `DoseCalcCard.tsx`)

1. **Volume visível na linha principal**: quando `tomadas === 0`
   (frequência indeterminada) mas `volumePorTomada` foi calculado, a
   posologia principal agora mostra `⚠ 12.5 mL (25 mg) VO por
   administração — ...` em vez de só `⚠ 25 mg VO ...`.
2. **Confirmação manual de frequência**: `parseFrequencia()` já extraía
   `tomadasFaixa: [min, max]` para faixas reconhecidas (ex. `[3, 4]`) mas
   esse dado nunca saía da função. Agora exposto como `tomadas_faixa` em
   `FullDoseResult`. Novo 11º parâmetro `frequenciaConfirmadaTomadasDia`
   em `calcFullDose()`: quando informado (só aceito quando a UI passa
   explicitamente, nunca adivinhado pelo motor), destrava o cálculo do
   total diário usando o valor confirmado — a dose por administração
   continua a mesma, só a multiplicação pela frequência deixa de estar
   bloqueada.
3. **UI**: `DoseCalcCard.tsx` agora renderiza botões "3x/dia"/"4x/dia"
   (gerados dinamicamente a partir de `tomadas_faixa`) quando a frequência
   está indeterminada. Ao confirmar, o card recalcula com a frequência
   escolhida, o alerta 🚨 desaparece e o botão "Aplicar" (antes desabilitado
   por `hasCritical`) fica habilitado.

Verificado em produção via navegador: Hidroxizina/Pergo®, 8 anos/24 kg —
antes da confirmação mostra `⚠ 12.5 mL (25 mg) VO por administração...`;
ao clicar "4x/dia", recalcula para `12.5 mL VO a cada 6 horas (= 25
mg/dose)`, `Total diário: 100 mg`, botão "Aplicar esta posologia"
habilitado.

## O que NÃO foi alterado

Nenhuma dose por administração, nenhum limiar de segurança. A frequência
NUNCA é assumida automaticamente — o botão de confirmação só aparece
quando `tomadas_faixa` existe (faixa numérica real conhecida, ex.
"3–4x/dia"), nunca para PRN/uso contínuo/texto não reconhecido (que
continuam bloqueados sem alternativa, corretamente, pois não há um
"número certo" a oferecer nesses casos).

## Testes novos

`dose-calculator-frequencia-parser.test.ts` ganhou 7 testes novos: volume
calculado independe da frequência; posologia principal mostra o volume;
`tomadas_faixa` exposto corretamente; sem confirmação o total continua
bloqueado; confirmação de "4x/dia" e "3x/dia" produzem totais diferentes
e corretos (100 mg vs. 75 mg); confirmação é ignorada quando a frequência
já era calculável normalmente (nunca sobrepõe um valor real).

## Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas (incluindo correção de um `set-state-in-effect` — resolvido com o padrão "ajustar estado durante o render" em vez de `useEffect`) |
| `npx vitest run` (suíte completa) | ✅ **64 arquivos / 1125 testes** |
| `npm run build` | ✅ Sucesso — 50 rotas geradas |

---

## Arquivos alterados

**Novo:**
- `docs/RM-84-DOSE-CALC-VOLUME-VISIBILITY-AND-MANUAL-FREQUENCY-CONFIRMATION.md` (este relatório)

**Modificados:**
- `frontend/src/lib/dose-calculator.ts`
- `frontend/src/components/modules/DoseCalcCard.tsx`
- `frontend/src/tests/dose-calculator-frequencia-parser.test.ts`

---

Commit `a30e222` (combinado com RM-83 no mesmo commit) — push e deploy
confirmados em produção nesta sessão.
