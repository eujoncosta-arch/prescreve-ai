# RM-71 — `/explicar` vs. `/explicabilidade`: diferenciar, não fundir (RM-60 §10, item 6)

**Origem:** `docs/RM-60-SCIENTIFIC-INTELLIGENCE-ROADMAP.md`, §10 item 6 —
"Fundir ou diferenciar explicitamente `explicar` vs. `explicabilidade`?".

## Investigação

Leitura completa de `frontend/src/app/explicar/page.tsx` (500 linhas,
motor `clinical-reasoning.ts`) e `frontend/src/app/explicabilidade/page.tsx`
(752 linhas, motor `explainable-ai-v2.ts` + `explicabilidade-context.ts` do
RM-65) mostrou que as duas páginas resolvem problemas diferentes — a
sobreposição do inventário RM-60 era de nome/framing, não de motor ou dado:

| | `/explicar` | `/explicabilidade` |
|---|---|---|
| Nível | Por **condição** (CID/molécula) | Por **paciente** (consulta ativa) |
| Dado real | Nunca — biblioteca estática (`RACIONAIS_CLINICOS`) | Desde o RM-65: `activeConsultation` real quando existe |
| Personalização | Nenhuma — mesmo conteúdo para qualquer usuário | WHY NOT verifica contraindicação contra o perfil real do paciente |
| Uso sem paciente | Sempre disponível (é o modo normal) | Cai para anamnese salva / demonstração, com aviso explícito |
| Classificação (nav) | `referencia` | `hibrido` |
| Pergunta que responde | "Por que esta conduta é geralmente indicada para esta condição?" | "Por que esta molécula específica, para este paciente específico, agora?" |

Fundir exigiria ou (a) forçar a biblioteca de condições a virar
paciente-específica (perdendo a navegação/busca livre sem consulta ativa)
ou (b) misturar dois modelos de dado incompatíveis em uma página só. Nenhum
dos dois foi pedido nem resolve um problema real — a decisão foi
**diferenciar explicitamente**, não fundir.

## O que foi alterado

Apenas texto/label — nenhum motor, dado clínico ou lógica de resolução de
contexto foi tocado.

- `frontend/src/lib/clinical-nav-registry.ts`:
  - `/explicar`: label `'Explicar Conduta'` → `'Racional por Condição'`.
  - `/explicabilidade`: label `'Explainable AI 2.0'` → `'Explicabilidade da Consulta'`.
  - Comentário de cabeçalho documentando a decisão (RM-60 → RM-71).
- `frontend/src/app/explicar/page.tsx`:
  - H1: `"Por que esta recomendação?"` → `"Racional Clínico por Condição"`.
  - Subtítulo agora declara explicitamente "não usa dados de nenhum
    paciente específico" e referencia a outra página pelo novo nome.
- `frontend/src/app/explicabilidade/page.tsx`:
  - H1: `"Explainable AI 2.0"` → `"Explicabilidade da Consulta"`.
  - Subtítulo agora declara "explicação personalizada para o paciente
    desta consulta (ou demonstração...)" e referencia a outra página.

## Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **62 arquivos / 1103 testes** — todos passando (nenhum teste dependia dos textos alterados) |
| `npm run test:coverage` | ✅ Exit 0 |
| `npm run build` | ✅ Sucesso — `RM-23: 381 entidades, 0 inconsistências`; `RM-24: aceitos=0`; `RM-49: integridade textual OK`; `RM-62: 0 BLOCKING_ERROR` |

`DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md`, regenerados
como efeito colateral do build, foram revertidos (`git checkout --`).

## O que NÃO foi alterado

Nenhum motor clínico (`clinical-reasoning.ts`, `explainable-ai-v2.ts`,
`explicabilidade-context.ts`), nenhum dado farmacológico, nenhuma regra de
segurança/dose. Nenhuma rota foi criada, removida ou movida.

---

## Arquivos alterados

**Novo:**
- `docs/RM-71-EXPLICAR-VS-EXPLICABILIDADE.md` (este relatório)

**Modificados:**
- `frontend/src/lib/clinical-nav-registry.ts`
- `frontend/src/app/explicar/page.tsx`
- `frontend/src/app/explicabilidade/page.tsx`

---

Não foi feito commit, push ou deploy nesta RM.
