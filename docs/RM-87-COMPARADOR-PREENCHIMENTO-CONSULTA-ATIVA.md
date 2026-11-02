# RM-87 — Pré-preenchimento de `/comparador` a partir da consulta ativa

**Origem:** item de baixo esforço explicitamente registrado e nunca
executado no roadmap `docs/RM-60-SCIENTIFIC-INTELLIGENCE-ROADMAP.md` (§9):
*"Integrar `/comparador` (pré-preenchimento) — Só popular estado inicial;
motor não muda."* O usuário escolheu esta direção ao ser perguntado "por
onde avançar na construção" após o fechamento do RM-86.

## O que foi feito

`/comparador` sempre abria vazio, mesmo quando havia uma consulta em
atendimento com plano terapêutico já calculado — o médico precisava
buscar manualmente as mesmas moléculas que o motor real já tinha
sugerido, para comparar entre si. Mesmo padrão já resolvido para
`/explicabilidade` no RM-65 (consulta ativa → dado real, sem
demonstração), agora aplicado ao comparador.

### `frontend/src/lib/comparador-context.ts` (novo)

`resolverPreenchimentoComparador(activeConsultation, moleculesDb)` —
função pura e testável, mesmo padrão de `explicabilidade-context.ts`:

1. Lê `activeConsultation.plano_terapeutico.farmacologico` (sugestões
   reais já calculadas pelo motor terapêutico, RM-26).
2. Ordena por prioridade clínica real (`preferencial` → `primeira_linha`
   → `contextual` → não classificado), nunca pela ordem bruta do array.
3. Casa cada sugestão contra o catálogo do comparador (`MOLECULES_DB`,
   `drug-comparator.ts`) por **nome exato de molécula (DCI)**, normalizado
   (minúsculas, sem acento) — nunca por substring, para não casar
   incorretamente "Valsartana" com a combinação "Sacubitril + Valsartana".
4. Retorna até 2 moléculas (A e B). Se só 1 sugestão tiver correspondência
   no catálogo (hoje limitado a 14 moléculas, cardio/DM2/lipídios), ou
   nenhuma, preenche só o que existe — nunca inventa a segunda para
   completar o par.

### `frontend/src/app/comparador/page.tsx`

- Pré-preenchimento disparado **uma vez por consulta** (quando o id da
  consulta ativa muda, ex.: o médico abre um novo paciente), via ajuste de
  estado durante o render (mesmo padrão já usado no RM-84 para evitar o
  lint `set-state-in-effect` — nunca `useEffect`). Clicar "Limpar" na
  mesma consulta não dispara o preenchimento de novo, porque o id da
  consulta não muda.
- Novo selo verde ("Pré-preenchido da consulta ativa...", mesmo estilo do
  badge já usado em `/explicabilidade`) aparece só enquanto A e B
  continuam exatamente os que foram pré-preenchidos — some sozinho assim
  que o médico troca qualquer lado manualmente, sem precisar de uma flag
  separada para manter sincronizada.
- Sem consulta ativa (ou sem correspondência no catálogo): comparador
  continua exatamente como era antes desta RM — vazio, seleção manual.

## O que NÃO foi alterado

Nenhum motor terapêutico, de priorização ou de comparação. `MOLECULES_DB`
e `gerarComparativo()` não foram tocados — só a decisão de QUAL estado
inicial popular a UI, exatamente como o item do roadmap previa ("só
popular estado inicial; motor não muda").

## Testes novos

`rm87-comparador-preenchimento-consulta-ativa.test.ts` (6 testes,
integração com dados reais — `getTherapeuticForCondition` real,
`MOLECULES_DB` real, nunca mocks, mesmo padrão de
`explicabilidade-integration-rm65.test.ts`):

1. Consulta ativa com plano real (HAS, TFG 90) → pré-preenche A com a
   sugestão de maior prioridade clínica real.
2. Prioriza por `prioridade.tier` (RM-26), não pela ordem bruta do array.
3. Casamento por nome exato — "Valsartana" isolada não casa com a
   combinação "Sacubitril + Valsartana".
4. Sem consulta ativa → `fonte: 'nenhuma'`, nada pré-selecionado.
5. Consulta ativa sem plano terapêutico ainda → `fonte: 'nenhuma'`, nunca
   inventa seleção.
6. Só 1 sugestão com correspondência no catálogo → preenche só A, nunca
   inventa B.

## Verificação manual

Servidor de desenvolvimento iniciado via preview do navegador embutido;
`/comparador` carrega normalmente sem consulta ativa (14 moléculas
listadas, sem selo — comportamento idêntico ao anterior a esta RM,
confirmado via leitura da página renderizada). Teste de clique
interativo (par rápido) não pôde ser concluído nesta sessão — o
navegador embutido não conseguiu capturar tela para o clique
(`"the page did not finish rendering in time"`, limitação do ambiente
de preview, não do código). A cobertura funcional do fluxo de
pré-preenchimento em si está nos 6 testes automatizados acima, que
exercitam a função real com dados reais.

## Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **67 arquivos / 1140 testes** (1 timeout de ambiente em `text-integrity-rm49.test.ts`, confirmado flake — passa isolado em 1,2s) |
| `npm run build` | ✅ Sucesso — 50 rotas geradas |

---

## Arquivos alterados

**Novo:**
- `docs/RM-87-COMPARADOR-PREENCHIMENTO-CONSULTA-ATIVA.md` (este relatório)
- `frontend/src/lib/comparador-context.ts`
- `frontend/src/tests/rm87-comparador-preenchimento-consulta-ativa.test.ts`

**Modificado:**
- `frontend/src/app/comparador/page.tsx`

---

Não foi feito commit, push ou deploy nesta RM.
