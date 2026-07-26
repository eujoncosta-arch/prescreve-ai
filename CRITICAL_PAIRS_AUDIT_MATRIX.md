# CRITICAL_PAIRS_AUDIT_MATRIX

**Gerado:** 2026-07-26 · **Escopo:** `frontend/src/lib/safety-rules.ts` — RM-36, auditoria exaustiva das 22 entradas de `CRITICAL_PAIRS`.

## Inventário completo — todas as 22 entradas

| # | mol_a | mol_b | Severidade | Simétrico? | Colisão de mol_a/mol_b com outro par | Testado? (após esta rodada) |
|---|---|---|---|---|---|---|
| 1 | ieca | aine | danger | sim | mol_a com #3,#15,#22; mol_b com #2,#12,#13 | ✅ isolado |
| 2 | bra | aine | danger | sim | mol_a com #15; mol_b com #1,#12,#13 | ✅ isolado |
| 3 | ieca | espironolactona | warning | sim | mol_a com #1,#15,#22 | ✅ isolado + supressão cruzada |
| 4 | azitromicina | amiodarona | critical | sim | mol_a com #5,#6; mol_b com #14 | ✅ isolado + nomes reais + severidade |
| 5 | azitromicina | haloperidol | danger | sim | mol_a com #4,#6 | ✅ isolado |
| 6 | hidroxicloroquina | azitromicina | danger | sim | mol_b com #4,#5 | ✅ isolado |
| 7 | isrs | tramadol | danger | sim | mol_a genérico vs #8/#9 específicos | ✅ isolado |
| 8 | sertralina | tramadol | danger | sim | mol_a é ISRS → overlap #7 | ✅ isolado |
| 9 | escitalopram | tramadol | danger | sim | mol_a é ISRS → overlap #7 | ✅ isolado |
| 10 | metformina | contraste | warning | sim | nenhuma | ✅ isolado |
| 11 | litio | hidroclorotiazida | critical | sim | nenhuma | ✅ isolado + nomes reais (regressão CRIT-AUDIT-01) |
| 12 | varfarina | aine | critical | sim | mol_b com #1,#2,#13 | ✅ isolado |
| 13 | prednisolona | aine | warning | sim | mol_b com #1,#2,#12 | ✅ isolado |
| 14 | moxifloxacino | amiodarona | critical | sim | mol_b com #4 | ✅ isolado + nomes reais + severidade |
| 15 | ieca | bra | critical | sim | mol_a com #1,#3,#22; mol_b com #2 | ✅ isolado + supressão cruzada + simetria |
| 16 | imao | isrs | critical | sim | mol_b compartilha token com #7; mol_a genérico vs #17/#18 | ✅ isolado |
| 17 | fenelzina | sertralina | critical | sim | mol_a com #18 | ✅ isolado |
| 18 | fenelzina | fluoxetina | critical | sim | mol_a com #17 | ✅ isolado |
| 19 | nitrato | tadalafila | critical | sim | mol_a com #20,#21 | ✅ isolado + nomes reais (regressão CRIT-AUDIT-02) |
| 20 | nitrato | sildenafila | critical | sim | mol_a com #19,#21 | ✅ isolado (nome real testado via #19) |
| 21 | nitrato | vardenafila | critical | sim | mol_a com #19,#20 | ✅ isolado |
| 22 | sacubitril | ieca | critical | sim | mol_b com #1,#3,#15 | ✅ isolado + supressão cruzada |

**Cobertura: 22/22 pares com pelo menos um teste comportamental isolado — nenhum CRITICAL_PAIR ficou sem teste.** (Antes desta auditoria: apenas 3/22 tinham teste — ver `CLINICAL_SAFETY_REVIEW.md` para o histórico.)

## Achados

### 🔴 CRIT-AUDIT-01 — Crítico — Lítio (acento) nunca disparava para o nome canônico real
- **Arquivo:** `frontend/src/lib/safety-rules.ts` — função de matching (antes: só verificava `d.classe`, nunca `d.molecula`/`d.sinonimos`, sem normalização de acento)
- **Par afetado:** `litio` + `hidroclorotiazida` (severidade `critical` — o par de maior risco da lista)
- **Comportamento observado (antes):** o nome canônico real no repositório é `"Carbonato de Lítio"` (com acento). `'carbonato de lítio'.includes('litio')` é `false` em JavaScript (í ≠ i em codepoints), e `classe` (`"Estabilizador do Humor — Sal de Lítio"`) também nunca contém a substring sem acento. O par nunca era verificado contra `sinonimos` (que já incluía `'litio'` sem acento) nem `molecula`.
- **Impacto clínico:** uma prescrição real de `["Carbonato de Lítio", "Hidroclorotiazida"]` — associação clássica de risco de toxicidade por lítio — nunca disparava NENHUM alerta desse par.
- **Reprodução:** `runSafetyCheck({ moleculas: ['Carbonato de Lítio', 'Hidroclorotiazida'] })` não retornava o alerta antes da correção.
- **Correção:** função de matching agora normaliza acentos (`stripAccents`) e também consulta `d.molecula` e `d.sinonimos`, não apenas `d.classe`.
- **Teste de regressão:** `frontend/src/tests/safety-rules-critical-pairs.test.ts` — "Carbonato de Lítio + Hidroclorotiazida (nomes reais, com acento) dispara...".

### 🔴 CRIT-AUDIT-02 — Crítico — Pares de nitrato nunca disparavam para moléculas reais
- **Arquivo:** `frontend/src/lib/safety-rules.ts` — mesma função de matching
- **Pares afetados:** `nitrato+tadalafila`, `nitrato+sildenafila`, `nitrato+vardenafila` (todos `critical`)
- **Comportamento observado (antes):** os nomes canônicos reais são `"Nitroglicerina"` e `"Isossorbida Mononitrato"` — nenhum contém a substring `nitrato` em `molecula`, e `classe` (`"Antianginoso"`) também não. O token `'nitrato'` só existe em `sinonimos` (`['ntg','nitroglicerina','nitrato',...]` e `['...,'nitrato prolongado',...]`), nunca consultado pelo matcher.
- **Impacto clínico:** uma prescrição real de `["Isossorbida Mononitrato", "Sildenafila"]` — combinação clássica de hipotensão fatal — nunca disparava o alerta específico com a orientação de washout (24-48h); apenas o alerta genérico do banco de dados (severidade menor, texto menos específico) aparecia.
- **Reprodução:** `runSafetyCheck({ moleculas: ['Nitroglicerina', 'Tadalafila'] })` não retornava o alerta antes da correção.
- **Correção:** mesma correção estrutural do CRIT-AUDIT-01 (consulta `sinonimos`).
- **Teste de regressão:** `safety-rules-critical-pairs.test.ts` — 2 testes (Nitroglicerina+Tadalafila; Isossorbida Mononitrato+Tadalafila).

### 🔴 CRIT-AUDIT-03 — Crítico — Alerta crítico era descartado por um alerta mais fraco já existente
- **Arquivo:** `frontend/src/lib/safety-rules.ts` — lógica de deduplicação (linha ~503, antes desta rodada)
- **Pares afetados:** `azitromicina+amiodarona`, `moxifloxacino+amiodarona` (ambos `critical`)
- **Comportamento observado (antes):** a Seção 1 (interações do banco de dados) roda ANTES da Seção 7 (`CRITICAL_PAIRS`). Azitromicina tem, no banco, uma interação genérica com amiodarona classificada como `grave` (→ severidade `danger`) — esse alerta nasce primeiro. Quando o par crítico "Azitromicina + Amiodarona — QT prolongado" (`critical`, ação específica "EVITAR combinação...") era avaliado depois, a checagem de duplicata via que ambas as moléculas já apareciam num alerta existente e **descartava** o novo — mantendo só o alerta mais fraco e genérico. Mesma falha para moxifloxacino+amiodarona.
- **Impacto clínico:** o médico via só "Avaliar necessidade de substituição ou monitoramento rigoroso" (danger) em vez de "EVITAR combinação. Substituir azitromicina por amoxicilina ou doxiciclina." (critical).
- **Reprodução:** `runSafetyCheck({ moleculas: ['Azitromicina', 'Amiodarona'] })` retornava apenas o alerta `danger` antes da correção.
- **Correção:** a lógica de deduplicação agora compara severidades — quando o par crítico é MAIS GRAVE que o(s) alerta(s) já existente(s) cobrindo o mesmo par, ele SUBSTITUI o(s) mais fraco(s) em vez de ser descartado. Isso também resolveu, como efeito colateral benéfico, o CRIT-AUDIT-04 abaixo (duplicata ieca+bra via nomes de drogas).
- **Teste de regressão:** `safety-rules-critical-pairs.test.ts` — 2 testes (Azitromicina+Amiodarona; Moxifloxacino+Amiodarona), cada um verificando que existe EXATAMENTE 1 alerta cobrindo o par, e que é `critical`.

### 🟠 CRIT-AUDIT-04 — Alto — Duplicata não-suprimida entre alerta de nomes de drogas e alerta de classe (resolvido como efeito colateral da correção acima)
- **Pares afetados:** `ieca+bra` via `Enalapril`+`Losartana`
- **Comportamento observado (antes):** ao contrário do CRIT-AUDIT-03, aqui o alerta do banco (`"Interação: Enalapril + Losartana"`, danger) NÃO continha as substrings `'ieca'`/`'bra'`, então não era detectado como duplicata — o par crítico disparava como um SEGUNDO alerta separado, redundante e com severidade conflitante para a mesma informação clínica.
- **Status:** resolvido pela mesma correção do CRIT-AUDIT-03 — como o par crítico é mais severo, agora SUBSTITUI o alerta mais fraco em vez de coexistir com ele.
- **Teste de regressão:** coberto indiretamente pelos testes de CRIT-AUDIT-03 (mesmo mecanismo).

## Achado documentado, não corrigido (justificativa)

### 🟡 CRIT-AUDIT-05 — Médio — `isrs+tramadol` gera alerta redundante com `sertralina+tramadol`/`escitalopram+tramadol`
- **Por que está aberto:** quando o paciente usa um ISRS específico (ex.: sertralina) + tramadol, tanto o par genérico `isrs+tramadol` quanto o par específico `sertralina+tramadol` podem dispar, e — diferente do CRIT-AUDIT-03/04 — a checagem de duplicata atual não reconhece que ambos cobrem exatamente a mesma interação (o alerta genérico não menciona "sertralina" no título, então não bate a checagem de substring).
- **Impacto:** apenas ruído (dois alertas de mesma severidade `danger` para a mesma informação clínica) — não há supressão de informação crítica nem severidade divergente, ao contrário dos achados corrigidos acima.
- **Mitigação recomendada (não aplicada nesta rodada):** tornar a deduplicação ciente de classe terapêutica (verificar se `d.classe` de um alerta já cobre o classe-token de outro), não apenas substring de texto — mudança mais invasiva que os patches pontuais desta rodada.
- **Justificativa para não bloquear:** severidade médio/baixo impacto clínico (redundância informativa, não supressão), e todos os 22 pares já têm teste comportamental — este item é sobre qualidade da experiência, não sobre segurança do alerta em si.
