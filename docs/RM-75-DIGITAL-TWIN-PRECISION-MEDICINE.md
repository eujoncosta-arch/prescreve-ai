# RM-75 — Fecha as 2 últimas decisões do RM-60 §10 (`digital-twin`, `medicina-precisao`)

**Origem:** `docs/RM-60-SCIENTIFIC-INTELLIGENCE-ROADMAP.md`, §10 itens 8 e
9 — as duas últimas decisões pendentes do inventário RM-60.

## Item 8 — `/digital-twin`: investir em dado longitudinal real?

**Investigação:** `frontend/src/app/digital-twin/page.tsx` só oferece um
botão "Criar demonstração", que sempre chama `criarTwin()` com um perfil
inteiramente fixo e hardcoded (idade 62, PA 152/96 mmHg, HbA1c 7.8 etc. —
`src/app/digital-twin/page.tsx:61-69`). Não existe formulário para inserir
dados de um paciente real, nem persistência de série temporal (peso/PA/
labs ao longo do tempo) ligada a uma consulta ou paciente do sistema. O
motor por trás (`patient-digital-twin.ts`) reaproveita `prognosis-engine.ts`/
`outcome-engine.ts`/`clinical-risk-engine.ts` reais — o cálculo em si não é
fabricado, só a entrada é sempre a mesma.

**Decisão: fica demonstrativo permanentemente.** Não há caminho de baixo
esforço — tornar isso real exigiria construir persistência de série
temporal por paciente (schema novo, captura de sinais vitais/labs ao
longo do tempo), infraestrutura que este produto não tem hoje e que é um
projeto de escopo próprio, não um ajuste desta RM. Nenhuma mudança de
código feita — a classificação `demonstracao` já estava correta.

## Item 9 — `/medicina-precisao`: investir em integração com laboratório de genotipagem?

**Investigação (achado que mudou a pergunta):** diferente do
`digital-twin`, `/medicina-precisao` já é uma calculadora real e editável.
Na aba Genótipo, o usuário altera `alelo1`/`alelo2`/`fenotipo` de cada gene
diretamente na UI (`src/app/medicina-precisao/page.tsx:137-147`,
`updateGenotipo`), e o cálculo de dose/resposta (`avaliarFarmacogenomica`,
`calcularDoseGenotipada`) consulta `FARMACOGENOMICA_DB`
(`precision-medicine.ts`), que tem DOIs reais de guidelines CPIC (ex.
`10.1002/cpt.1750`). O único gap real é a **importação automática** de um
resultado de laboratório — não a funcionalidade de cálculo em si, que já
funciona com entrada manual (mesmo padrão de `/dosagem`, classificada
`referencia`). Estava classificada `demonstracao`, o que subestimava o
que a página já faz.

**Decisão: reclassificar para `hibrido`** (não investir em integração de
laboratório agora — decisão separada, maior escopo). `hibrido` é o
enquadramento correto porque a página combina um ponto de partida de
exemplo (igual ao modo antes) com edição manual real que já produz
resultado clinicamente válido — o mesmo padrão já usado em
`/explicabilidade`.

## O que foi feito

- `frontend/src/lib/clinical-nav-registry.ts`: `/medicina-precisao`
  `classification: 'demonstracao'` → `'hibrido'`. Comentário de cabeçalho
  documentando as duas decisões (RM-60 → RM-75).
- `frontend/src/app/medicina-precisao/page.tsx`: `<DemoDataNotice />`
  genérico substituído por `<DemoDataNotice variant="hybrid"
  description="..." />` com texto específico — explicita que o genótipo
  inicial é editável e a evidência é real, e que falta só a importação
  automática de laboratório.
- `frontend/src/tests/clinical-nav-registry-rm59.test.ts`: teste "apenas
  /explicabilidade é hibrido" atualizado para "exatamente /explicabilidade
  e /medicina-precisao".

`/digital-twin` não teve nenhuma alteração de código — a decisão foi só
confirmar e documentar que a classificação atual já está certa.

## Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **62 arquivos / 1102 testes** — todos passando |
| `npm run test:coverage` | ✅ Exit 0 |
| `npm run build` | ✅ Sucesso — `RM-23: 381 entidades, 0 inconsistências`; `RM-24: aceitos=0`; `RM-49: integridade textual OK`; `RM-62: 0 BLOCKING_ERROR` |

`DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md`, regenerados
como efeito colateral do build, foram revertidos (`git checkout --`).

## O que NÃO foi alterado

Nenhum motor clínico (`patient-digital-twin.ts`, `precision-medicine.ts`),
nenhum dado farmacológico. Nenhuma integração real com laboratório de
genotipagem ou persistência longitudinal foi construída — ambas
permanecem decisões de investimento futuras, agora com o porquê
documentado.

---

## Arquivos alterados

**Novo:**
- `docs/RM-75-DIGITAL-TWIN-PRECISION-MEDICINE.md` (este relatório)

**Modificados:**
- `frontend/src/lib/clinical-nav-registry.ts`
- `frontend/src/app/medicina-precisao/page.tsx`
- `frontend/src/tests/clinical-nav-registry-rm59.test.ts`

---

Não foi feito commit, push ou deploy nesta RM.
