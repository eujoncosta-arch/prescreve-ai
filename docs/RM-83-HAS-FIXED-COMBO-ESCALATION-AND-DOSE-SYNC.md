# RM-83 — Holmes H®/Zart H® como escalonamento contextual em HAS + corrige dose não sincronizando com a concentração selecionada

**Origem:** dois achados reportados pelo usuário na sequência do RM-83
(adição do Holmes H® ao catálogo):

1. "Holmes H está associado aos outros módulos do sistema e é sugerido de
   acordo com as diretrizes?" — investigação honesta revelou que **não**:
   Holmes H® e Zart H® (associações fixas BRA+tiazídico) estavam no
   catálogo/busca/checagem de interações (herdado automaticamente via
   `getAllDrugs()`), mas **nunca eram sugeridos proativamente** por nenhum
   motor terapêutico quando um paciente precisava escalonar de monoterapia
   para combinação fixa.
2. Ao testar no navegador: selecionar uma concentração diferente (ex.:
   40/12,5 mg) no card de prescrição não atualizava o campo Dose, que
   continuava mostrando o valor da concentração anterior.

## Achado 1 — Holmes H®/Zart H® nunca eram sugeridos por nenhum motor

Rastreamento do código confirmou:
- **Associado automaticamente** (correto, sem ação necessária): `getAllDrugs()`
  → `buildCanonicalDatabase()` → `drugRepository` (RM-06) alimenta busca,
  comparador, prescrição por marca e `safety-rules.ts` (checagem de
  interação por substring em `molecula`/`classe`/`sinonimos` — nenhum
  registro manual necessário).
- **NÃO sugerido** (achado real): `clinical-therapeutics.ts` (motor de
  sugestão terapêutica) e `guideline-class-validation.ts` (RM-27,
  governança de papel clínico) nunca referenciavam essas moléculas —
  zero ocorrências de `losartana_hidroclorotiazida`/`olmesartana_hidroclorotiazida`/
  `zart h`/`holmes h` em nenhum dos dois.

### Correção

Seguindo exatamente o padrão já usado para ARM/diurético de alça/
betabloqueador em HAS (RM-30 — classes contextuais, habilitadas só por
contexto real do paciente, nunca para todo paciente com a condição):

- **`therapeutic-class-expansion.ts`**: nova classe contextual
  `BRA_TIAZIDICO_FIXO` mapeada da string real `'BRA + Diurético Tiazídico
  (Associação)'` (já usada nas duas entradas do catálogo). Nova função
  `hasMonotherapyInUseContext()` habilita a classe **somente** quando o
  paciente já tem, em `Anamnesis.medicamentos_em_uso` (campo real
  pré-existente, nenhum dado novo), um IECA/BRA ou tiazídico — sinal real
  de monoterapia em curso, nunca uma heurística inferida (ex.: contagem de
  medicamentos, explicitamente rejeitada pelo próprio RM-30 para o caso
  de HAS resistente).
- Resultado: Holmes H® e Zart H® agora aparecem como opção de
  escalonamento quando o contexto sustenta — e continuam ausentes para
  HAS não complicada, exatamente como as outras classes contextuais.

8 testes novos (`rm83-has-fixed-combo-escalation.test.ts`) provam: não
aparecem para HAS não complicada; aparecem quando já em uso de BRA,
tiazídico OU IECA; não aparecem por medicamento não relacionado (ex.
Anlodipino); continuam funcionando junto com o contexto de HAS resistente
(sem interferência); excluídas corretamente em gestante (mesma checagem
de elegibilidade que já protegia Losartana/Enalapril).

## Achado 2 — Dose não sincronizava com a concentração selecionada

**`frontend/src/app/prescricao-rapida/page.tsx`**: o botão de
concentração (`onClick={() => setSelectedConcentration(c)}`) só
atualizava `selectedConcentration`, nunca `customDose` — bug real para
QUALQUER medicamento multi-concentração, não só combinações.

### Correção

Novo helper `stripUnit()` extrai a porção numérica/fração de uma
concentração (`"40/12,5 mg"` → `"40/12,5"`; `"40 mg"` → `"40"`). O
handler do botão agora sincroniza `customDose` com a nova concentração
**somente quando o campo ainda estava no valor "automático"** (igual ao
`stripUnit()` da concentração anterior) — nunca sobrescreve uma dose que
o médico já editou manualmente.

Verificado em produção via navegador: Holmes H® (20/12,5 → 40/12,5 mg) e
Zart H® (50/12,5 → 100/25 mg) ambos sincronizam corretamente.

## O que NÃO foi alterado

Nenhuma dose, contraindicação, interação ou classificação de prioridade
existente. `isEligible()`/checagem de contraindicação (RM-25.1) continua
sendo a mesma camada de segurança — a nova classe contextual passa por
ela normalmente (confirmado pelo teste de gestante).

## Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **64 arquivos / 1125 testes** |
| `npm run build` | ✅ Sucesso — 50 rotas geradas |

---

## Arquivos alterados

**Novo:**
- `docs/RM-83-HAS-FIXED-COMBO-ESCALATION-AND-DOSE-SYNC.md` (este relatório)
- `frontend/src/tests/rm83-has-fixed-combo-escalation.test.ts`

**Modificados:**
- `frontend/src/lib/therapeutic-class-expansion.ts`
- `frontend/src/app/prescricao-rapida/page.tsx`

---

Commit `a30e222` (combinado com RM-84 no mesmo commit) — push e deploy
confirmados em produção nesta sessão.
