# RM-70 — Decisões do dono do produto sobre as páginas de demonstração (RM-60 §10, itens 1–4)

**Origem:** `docs/RM-60-SCIENTIFIC-INTELLIGENCE-ROADMAP.md`, seção 10 —
11 decisões de produto pendentes sobre o destino das páginas dos grupos
"Científico"/"Inteligência". Esta RM executa as 4 decisões de maior risco
reputacional/legal e de organização de menu, já aprovadas explicitamente
pelo dono do produto. As demais 7 decisões do §10 (consolidação de
catálogos sobrepostos, `explicar` vs. `explicabilidade`, investimento em
dado longitudinal/genotipagem, escopo do `copilot`) permanecem em aberto.

---

## 1. Decisões executadas

| Página | Decisão do dono do produto | Execução |
|---|---|---|
| `/comite` | Remover credenciais fabricadas, manter a página | CRM, UF do CRM, ORCID, Lattes, e-mail institucional e contagem de publicações removidos do tipo `Especialista` e da UI. Nomes trocados para "Especialista fictício — <especialidade>"; `instituicao` deixou de referenciar hospitais/universidades reais (InCor-FMUSP, Hospital das Clínicas FMUSP, UERJ, UNIFESP, UFMG, Anvisa) e passou a dizer "Comitê científico de demonstração (Prescreve-AI)". |
| `/validacao-real` | Arquivar do menu clínico | Removida de `NAV_GROUPS` (`clinical-nav-registry.ts`). Rota/código permanecem no repositório, só não aparecem mais na barra lateral. |
| `/qualidade-hospital` | Arquivar do menu clínico | Idem. |
| `/validacao-clinica` | Mover para fora do menu clínico | Idem — é um dashboard de execução de 500 cenários de teste automatizado (QA), não uma ferramenta de apoio à decisão clínica; não deveria ficar ao lado de ferramentas reais no menu do médico. |

Nenhuma página foi deletada do código-fonte — apenas desvinculada da
navegação visível (mesma convenção que a própria RM-60 já usava para
"arquivar do nav clínico — não do código").

## 2. Detalhe — `/comite`

**Antes:** `Especialista` incluía `crm`, `uf_crm`, `titulacao`, `instituicao`
(nomes reais de hospitais/universidades), `orcid`, `lattes_url`,
`email_institucional`, `publicacoes_indexadas` — para 6 especialistas
inteiramente fictícios. A UI renderizava "CRM-SP 123456", links clicáveis
para `orcid.org/<id fabricado>`, link Lattes, e um agregado "Publicações
totais" somando números fabricados.

**Depois:** `Especialista` mantém apenas campos que descrevem um *papel*
demonstrativo (especialidade, titulação, área de atuação), sem simular
registro profissional verificável nem afiliação institucional real. O
agregado "Publicações totais" foi substituído por "Validações aprovadas"
(derivado dos dados de demonstração já existentes, não uma nova métrica
fabricada).

Arquivos alterados: `frontend/src/lib/comite.ts`,
`frontend/src/app/comite/page.tsx`.

## 3. Detalhe — remoção do menu

`frontend/src/lib/clinical-nav-registry.ts`: removidas as 3 entradas do
grupo "Inteligência" (`/validacao-real`, `/qualidade-hospital`,
`/validacao-clinica`). Comentário adicionado no cabeçalho do arquivo
documentando a decisão e sua origem (RM-60 → RM-70), para quem ler o
registro no futuro sem o contexto desta sessão.

Ícone `Hospital` (usado só por `/qualidade-hospital`) removido do import —
não usado em nenhum outro lugar do arquivo.

## 4. Testes ajustados

- `frontend/src/tests/clinical-nav-registry-rm59.test.ts` — lista
  hardcoded de páginas que exigem `DemoDataNotice` caiu de 17 para 14
  (removidas as 3 páginas desvinculadas do registro).
- `frontend/src/tests/demo-notice-coverage-rm59.test.ts` — não precisou de
  alteração: deriva a lista de páginas a testar diretamente de
  `NAV_GROUPS`, então as 3 páginas removidas simplesmente saem da
  suíte automaticamente (nenhuma asserção hardcoded a corrigir).

## 5. Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **62 arquivos / 1103 testes** — todos passando (3 a menos que a rodada anterior: os `it.each` de `demo-notice-coverage-rm59.test.ts` para as 3 páginas removidas do registro deixaram de ser gerados, não uma falha) |
| `npm run test:coverage` | ✅ Exit 0 |
| `npm run build` | ✅ Sucesso — `RM-23: 381 entidades, 0 inconsistências`; `RM-24: aceitos=0`; `RM-49: integridade textual OK`; `RM-62: 0 BLOCKING_ERROR` |

`DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md`, regenerados
como efeito colateral do build, foram revertidos (`git checkout --`).

## 6. O que NÃO foi alterado

Nenhum motor clínico, dado farmacológico, regra de dose/segurança, ou
prescrição real. As rotas `/validacao-real`, `/qualidade-hospital` e
`/validacao-clinica` continuam existindo no código e acessíveis por URL
direta — apenas não aparecem mais na navegação. Nenhuma das 7 decisões
restantes do RM-60 §10 (itens 5–11) foi executada nesta RM.

## 7. Decisões do RM-60 §10 ainda pendentes

5. Consolidar `repositorio`/`biblioteca`/`evidencias`/`evidence`/`farmalib`/`eurofarma` (6 páginas de catálogo/evidência sobrepostas) em quantas páginas?
6. Fundir ou diferenciar explicitamente `explicar` vs. `explicabilidade`?
7. Fundir ou diferenciar explicitamente `atualizacoes` vs. `atualizacoes-cientificas`?
8. Investir em coleta de dado longitudinal real para eventualmente integrar `digital-twin`, ou mantê-lo demonstrativo permanentemente?
9. Investir em integração com laboratório de genotipagem para eventualmente integrar `medicina-precisao`, ou mantê-lo demonstrativo permanentemente?
10. Definir explicitamente o escopo de `copilot` (ferramenta de auxílio à redação vs. algo mais autônomo) antes de qualquer integração futura.
11. Aprovar (ou não) a integração piloto de `/explicabilidade` descrita no RM-60, incluindo se o seletor manual de CID deve ou não ser removido após a integração.

---

## Arquivos alterados

**Novo:**
- `docs/RM-70-DEMO-PAGE-DECISIONS.md` (este relatório)

**Modificados:**
- `frontend/src/lib/comite.ts` — credenciais fabricadas removidas do tipo e da seed.
- `frontend/src/app/comite/page.tsx` — UI ajustada para os campos removidos.
- `frontend/src/lib/clinical-nav-registry.ts` — 3 entradas removidas + comentário de contexto.
- `frontend/src/tests/clinical-nav-registry-rm59.test.ts` — lista de 17 → 14 páginas.

---

Não foi feito commit, push ou deploy nesta RM.
