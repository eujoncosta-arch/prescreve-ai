# RM-100 — Amoxicilina-clavulanato: a posologia depende da apresentação

**Origem:** item 3 do roadmap. A pendência registrada era "posologia da amoxicilina-clavulanato
no código (2x/dia) versus SBPT (8/8h)". O usuário esclareceu: **500/125 mg é de 8/8h; 875/125 mg é de 12/12h**
(o usuário escreveu "800+125"; a apresentação comercial e todo o projeto usam **875/125**, e assumi isso).

## O que estava errado

1. **O motor ignorava a apresentação.** `calcularDosagem` escolhia a regra só por população e via. Ao selecionar o
   comprimido de **500/125 mg**, o motor aplicava a regra de 875 mg de 12/12h (resultado: 1,75 comprimido).
2. **Regra geriátrica incoerente:** 500 mg de 12/12h com teto de 1500 mg/dia (500 mg × 3 = 1500 pressupõe 8/8h).
3. **Ajuste renal errado em `pharma-database.ts`:** "TFG 30–60: 500/125 mg 2x/dia" (a bula não pede ajuste acima de
   30) e "TFG 15–30: 500/125 mg/dia".
4. **Faixa pediátrica:** o texto dizia "> 3 meses"; a bula Eurofarma é a partir de **2 meses**, e a dose alta é **45–70 mg/kg/dia**
   (o projeto citava 90 mg/kg/dia).
5. **Rótulo "(ES)" na suspensão 400/57 mg/5 mL** (`pediatric-engine.ts`): 400/57 é a proporção 7:1, não a formulação ES (14:1).

## Fontes

| Fonte | Papel |
|---|---|
| Bula profissional Eurofarma (pó p/ suspensão 400 mg + 57 mg/5 mL), pasta `Genéricos Eurofarma` | 25/3,6–45/6,4 mg/kg/dia (leve) e 45/6,4–70/10 mg/kg/dia (grave), em 2 doses; uso a partir de 2 meses; TFG > 30 sem ajuste; TFG < 30 "não recomendável" |
| Bula do Sinot Clav 875/125 (Araújo/CliqueFarma) | 1 comprimido 2x/dia; mesma regra renal |
| Rótulo FDA do Augmentin (DailyMed `174cc098-fe49-4f1a-87e2-601c7573f0db`) | 875 mg de 12/12h; TFG < 30 não usa 875 mg; TFG 10–30 → 500 mg de 12/12h; TFG < 10 → 500 mg de 24/24h |
| Usuário (prática brasileira) | 500/125 mg de 8/8h |

**Limite:** não há bula oral de comprimido na pasta (o arquivo "comprimido" é o pó injetável IV 1 g + 200 mg). O
esquema 500/125 de 8/8h vem da orientação do usuário; o rótulo FDA dá 500 mg de **12/12h** para os EUA. As duas
fontes sobre TFG 10–30 divergem (bula Eurofarma: "não recomendável"; FDA: 500 mg 12/12h) — o texto cita as duas.

## O que mudou

- **`dosing-engine.ts`**
  - Nova propriedade opcional `RegraDoagem.formulacao_ids`: a regra só vale para as apresentações listadas e tem prioridade sobre as genéricas.
    Para os demais medicamentos o comportamento é idêntico ao anterior (confirmado pela suíte inteira).
  - Regras da amoxicilina-clavulanato: **comprimido 875/125 → 12/12h (1750 mg/dia)**, **comprimido 500/125 → 8/8h (1500 mg/dia)**,
    ambas para adolescente, adulto e geriátrico (a regra geriátrica solta foi removida), com `ajuste_renal` e a observação da TFG.
  - Suspensão: regra pediátrica presa à suspensão, com `contraindicado_ate_dias: 60` (sem posologia < 2 meses) e observação 45–70 mg/kg/dia.
  - Adulto com a suspensão, ou criança com comprimido: **sem regra** ("Não há posologia definida") em vez de reaproveitar uma regra de outra apresentação.
- **`pharma-database.ts`**: instruções com a frequência de cada apresentação; ajuste renal corrigido; faixa pediátrica ≥ 2 meses e 45–70 mg/kg/dia.
- **`pediatric-engine.ts`**: suspensão 400/57 deixa de ser "(ES)"; **a dose da indicação de infecções resistentes passou de 90 para 70 mg/kg/dia** (teto da bula para a apresentação 7:1) e o texto cita que 90/6,4 mg/kg/dia (AAP 2013, `10.1542/peds.2012-3488`) pressupõe a formulação ES 14:1; alerta mantido.
- **`eurofarma-sync.ts`**: posologia aprovada cita a dose alta (45–70 mg/kg/dia), o uso a partir de 2 meses e a TFG < 30.

Verificado no navegador (`/dosagem`, adulto 40 anos, 70 kg): **875/125 → 1 comprimido 12/12h, 875 mg/tomada, 1,75 g/dia;
500/125 → 1 comprimido 8/8h, 500 mg/tomada, 1,5 g/dia.**

## Achado que virou a RM-103

No motor, `unidade: 'mg'` e `'mg/kg'` eram tratadas como total do dia, mas os dados estão por tomada (dipirona 500 mg 6/6h saía 125 mg por dose; subdose de 2–4×). A correção geral é a [RM-103](RM-103-SEMANTICA-DA-UNIDADE-DE-DOSE-NO-MOTOR.md).
Nesta RM, a amoxicilina-clavulanato foi inicialmente codificada com os totais do dia (1750 e 1500 mg) só para sair certa sob a convenção antiga; **com a RM-103 esses valores voltaram a 875 mg (12/12h) e 500 mg (8/8h)**.

## O que NÃO mudei

- **Formulação ES 14:1:** não foi adicionada ao catálogo, pois a disponibilidade no Brasil não foi conferida. A AAP 2013 (confirmada só por fontes secundárias: o texto original não é de acesso aberto) recomenda 90 mg/kg/dia de amoxicilina com 6,4 mg/kg/dia de clavulanato (14:1); a bula Eurofarma limita a suspensão 400/57 (7:1) a 70/10 mg/kg/dia. Decisão tomada: usar o teto da bula para o que está no catálogo.
- Amoxicilina simples (875 mg 2x/dia ou 500 mg 3x/dia): ambos os esquemas são legítimos; não toquei.
- `clinical-therapeutics`, `oncology-engine` e as simulações citam "875/125 mg 12/12h": já corretos.

## Testes

- **Novo** `rm100-amoxicilina-clavulanato-por-apresentacao.test.ts` (15 testes): 875 → 12/12h e 500 → 8/8h pelo motor real, geriátrico,
  adulto × suspensão sem regra, exemplo pediátrico da bula (27 kg → 607,5 mg ≈ 7,6 mL), < 2 meses bloqueado, ajuste renal e rótulo "(ES)".

## Gates

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` | ✅ **82 arquivos / 1379 testes** (RM-100 + RM-101 + RM-102) |
| `npm run build` | ✅ 50/50 páginas |

---

Commit `a0110f2` (RM-100/101/102) enviado ao `main`; deploy automático na Vercel.
