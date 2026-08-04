# RM-73 — Definir escopo do `/copilot` (RM-60 §10, item 10)

**Origem:** `docs/RM-60-SCIENTIFIC-INTELLIGENCE-ROADMAP.md`, §10 item 10 —
"Definir explicitamente o escopo de `copilot` (ferramenta de auxílio à
redação vs. algo mais autônomo) antes de qualquer integração futura."

## Investigação

`frontend/src/lib/medical-copilot.ts` gera, a partir de um contexto clínico
estruturado, uma nota SOAP completa (hipótese diagnóstica principal,
diferenciais, "prescrição sugerida", metas terapêuticas, orientações ao
paciente), resumo de consulta, 2ª opinião, discussão clínica e evolução —
por correspondência de palavra-chave contra uma base pequena de condições
(`CONHECIMENTO_CLINICO`), não um motor de raciocínio real.

`frontend/src/app/copilot/page.tsx` apenas **exibe** essa saída (sem botão
de copiar, editar ou exportar) a partir de um `DEMO_CTX` fixo. O único
aviso existente era uma linha pequena (`aviso_cdss`, "suporte à decisão
clínica... decisão é do médico") — fácil de não notar diante de uma nota
SOAP inteira pronta com hipótese diagnóstica e prescrição sugerida.

Esse é, junto com `comite`/`validacao-real`/`qualidade-hospital` (RM-70),
o maior risco de escopo do inventário RM-60: o conteúdo gerado se aproxima
de documentação/julgamento clínico autônomo se apresentado sem reforço
explícito de que é rascunho.

## Decisão

**Ferramenta de auxílio à redação** — o copiloto gera rascunho; o médico
revisa e edita cada seção antes de qualquer uso real; nunca populariza
prescrição/prontuário automaticamente. Consistente com a postura CDSS já
adotada em todo o resto do sistema ("decisão médica soberana").

## O que foi feito

- `frontend/src/lib/clinical-nav-registry.ts`: label do menu
  `'AI Medical Copilot'` → `'Copiloto — Rascunho Assistido'`. Comentário de
  cabeçalho documentando a decisão.
- `frontend/src/app/copilot/page.tsx`:
  - Título da página: `"AI Medical Copilot"` → `"Copiloto — Rascunho
    Assistido"`.
  - Subtítulo agora declara explicitamente "Gera RASCUNHO... para revisão
    e edição do médico, nunca para uso direto".
  - Novo banner de aviso (âmbar, com ícone), posicionado logo após o
    `<DemoDataNotice />`, antes de qualquer conteúdo gerado: "Ferramenta
    de auxílio à redação. Todo o conteúdo abaixo é um rascunho gerado
    automaticamente — o médico deve revisar e editar cada seção antes de
    qualquer uso clínico real. Nunca aplique este conteúdo diretamente a
    um prontuário ou prescrição sem revisão médica completa." — mais
    visível e específico que o `aviso_cdss` genérico já existente (mantido
    sem alteração).

Nenhum motor (`medical-copilot.ts`) foi alterado — a decisão restringe
como o produto se apresenta e como qualquer integração futura deve
funcionar, não o comportamento atual (que já é 100% demonstrativo,
`DEMO_CTX` fixo, sem `useApp()`).

## Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **62 arquivos / 1102 testes** — todos passando (nenhum teste dependia dos textos alterados) |
| `npm run test:coverage` | ✅ Exit 0 |
| `npm run build` | ✅ Sucesso — `RM-23: 381 entidades, 0 inconsistências`; `RM-24: aceitos=0`; `RM-49: integridade textual OK`; `RM-62: 0 BLOCKING_ERROR` |

`DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md`, regenerados
como efeito colateral do build, foram revertidos (`git checkout --`).

## O que NÃO foi alterado

Nenhum motor clínico, dado farmacológico ou regra de dose/segurança.
Nenhuma integração nova com `useApp()`/consulta real — essa continua sendo
uma decisão futura separada, agora com o escopo formalmente restrito a
"rascunho revisável" antes de acontecer.

---

## Arquivos alterados

**Novo:**
- `docs/RM-73-COPILOT-SCOPE.md` (este relatório)

**Modificados:**
- `frontend/src/lib/clinical-nav-registry.ts`
- `frontend/src/app/copilot/page.tsx`

---

Não foi feito commit, push ou deploy nesta RM.
