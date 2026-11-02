# RM-89 — Integração de `/segunda-opiniao` com a consulta ativa

**Origem:** item do roadmap `docs/RM-60-SCIENTIFIC-INTELLIGENCE-ROADMAP.md`
(§9), classificado como esforço "médio-alto" porque, segundo o próprio
documento, "precisa de tabela de mapeamento classe-terapêutica →
`CondutaOpcao.id` que não existe hoje". O usuário escolheu esta direção
após o fechamento do RM-88.

## Achado — a tabela de mapeamento já existia, implícita

Investigação de `second-opinion.ts` mostrou que a premissa do RM-60
estava desatualizada (mesmo padrão de descoberta das RM-87/RM-88: reusar
um join key real já existente em vez de construir um novo):

- Cada `CondutaOpcao.moleculas: string[]` já lista nomes DCI reais (ex.:
  `['Enalapril', 'Ramipril', 'Perindopril', ...]`) — **no mesmo formato**
  usado por `TherapeuticSuggestion.molecula` do motor real de terapêutica
  (`clinical-therapeutics.ts`). Confirmado item a item: Enalapril,
  Losartana, Hidroclorotiazida, Espironolactona, Anlodipino — todos os
  nomes do protocolo real de HAS aparecem exatamente nas listas de
  moléculas de `/segunda-opiniao`.
- Cada `CondicaoClinica.cid10` já é o CID real (`I10`, `E11`, `I50`,
  `E78`, `I48`, `N18`) — não precisa de mapa novo, só casar contra
  `diagnostico_estruturado.cid` da consulta ativa.

Não era necessário inventar uma tabela classe→id — bastava casar por
**nome de molécula**, exatamente como o RM-87 já fez para `/comparador`.

## O que foi feito

### `frontend/src/lib/second-opinion-context.ts` (novo)

`resolverPreenchimentoSegundaOpiniao(activeConsultation, condicoes)` —
função pura e testável, mesmo padrão de `explicabilidade-context.ts`
(RM-65) e `comparador-context.ts` (RM-87):

1. Casa `diagnostico_estruturado.cid` (CID principal, sem sufixo) contra
   `CondicaoClinica.cid10`. Sem CID reconhecido → `fonte: 'nenhuma'`,
   página se comporta exatamente como antes.
2. Dentro da condição encontrada, procura — por prioridade clínica real
   (RM-26, mesma ordenação do RM-87), nunca pela ordem bruta do array —
   a primeira sugestão do plano terapêutico cujo nome de molécula bate
   **exatamente** (normalizado, nunca por substring — "Nifedipino"
   isolado não casa com "Nifedipino GITS") com alguma
   `CondutaOpcao.moleculas`.
3. CID reconhecido mas nenhuma molécula do plano mapeada entre as
   condutas cadastradas → resolve só a condição (`condutaId: null`).
   Nunca inventa uma conduta para completar o fluxo.

### `frontend/src/app/segunda-opiniao/page.tsx`

- Pré-preenchimento disparado **uma vez por consulta** (ajuste de estado
  durante o render, não `useEffect` — mesmo padrão do RM-87/RM-84, evita
  o lint `set-state-in-effect`). Clicar "Nova consulta" (reiniciar) na
  mesma consulta não refaz o preenchimento, porque o id da consulta não
  muda.
- Quando condição **e** conduta são resolvidas: pula direto para o passo
  3 (segunda opinião pronta). Quando só a condição é resolvida: pula
  para o passo 2 (conduta já filtrada pela condição certa, médico escolhe
  manualmente). Sem resolução: comportamento idêntico ao anterior
  (passo 1, seleção manual completa).
- Selo verde ("Pré-preenchido da consulta ativa...", mesmo estilo dos
  selos de `/explicabilidade` e `/comparador`) some sozinho assim que o
  médico muda a seleção manualmente ou reinicia — sem flag separada,
  comparando o estado atual contra o que foi auto-preenchido.

## O que NÃO foi alterado

Nenhum dado clínico de `second-opinion.ts` (CONDICOES, evidências,
riscos, diretrizes). Nenhum motor terapêutico ou de priorização.
`gerarSegundaOpiniao()` continua exatamente a mesma função — só o estado
inicial da UI muda.

## Testes novos

`rm89-segunda-opiniao-preenchimento-consulta-ativa.test.ts` (9 testes,
integração com dados reais — `getTherapeuticForCondition` real,
`listarCondicoes()` real, nunca mocks):

1. CID reconhecido (I10/HAS) + plano real → resolve condição E conduta.
2. Prioriza por `prioridade.tier` (RM-26), não pela ordem bruta.
3. CID reconhecido sem molécula mapeada → só condição, conduta null.
4. CID não coberto por `/segunda-opiniao` (ex.: J45/Asma) → `fonte: 'nenhuma'`.
5. Sem consulta ativa → `fonte: 'nenhuma'`.
6. Sem diagnóstico estruturado ainda → `fonte: 'nenhuma'`.
7. CID com sufixo (`I10.0`) usa o CID principal.
8. Casamento por nome exato — "Nifedipino" isolado não casa com "Nifedipino GITS".
9. "Olmesartana" casa corretamente com a opção "bra".

## Verificação manual

Servidor de desenvolvimento iniciado via preview do navegador embutido;
`/segunda-opiniao` carrega normalmente sem consulta ativa (6 condições
listadas, sem selo — comportamento idêntico ao anterior a esta RM,
confirmado via leitura da página renderizada). A cobertura funcional do
fluxo de pré-preenchimento em si está nos 9 testes automatizados acima.

## Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **69 arquivos / 1183 testes** |
| `npm run build` | ✅ Sucesso — 50 rotas geradas |

---

## Arquivos alterados

**Novo:**
- `docs/RM-89-SEGUNDA-OPINIAO-PREENCHIMENTO-CONSULTA-ATIVA.md` (este relatório)
- `frontend/src/lib/second-opinion-context.ts`
- `frontend/src/tests/rm89-segunda-opiniao-preenchimento-consulta-ativa.test.ts`

**Modificado:**
- `frontend/src/app/segunda-opiniao/page.tsx`

---

Não foi feito commit, push ou deploy nesta RM.
