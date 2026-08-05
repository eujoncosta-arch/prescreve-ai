# RM-81 — Corrige citação provavelmente fabricada da diretriz de HAS, usando a fonte real fornecida pelo usuário

**Origem:** o usuário pediu para corrigir o achado do RM-76/77 em
`governance.ts` (diretriz de HAS marcada como vigente desde 2020, sem
versão mais recente), fornecendo o PDF oficial da **Diretriz Brasileira
de Hipertensão Arterial – 2025** (Arq Bras Cardiol. 2025;122(9):e20250624,
DOI `10.36660/abc.20250624`, SBC/SBN/SBH) e o DOI correspondente.

## Achado mais sério do que o esperado

Antes de aplicar a correção, a leitura do PDF revelou que a citação já
presente em `evidence-engine.ts` desde antes desta sessão — **"8ª
Diretriz Brasileira de Hipertensão Arterial", SBC 2024, DOI
`10.36660/abc.20240209`** — provavelmente **nunca correspondeu a uma
diretriz real**. O documento real de 2025 se compara explicitamente à
**"DBHA de 2020"** como sua predecessora direta ("A nova classificação da
PA proposta por esta diretriz apresenta algumas alterações importantes em
relação às DBHA de 2020"), nunca a uma edição de 2024.

Isso significa que o RM-76 (que eu executei nesta mesma sessão) **tratou
uma citação já fabricada em `evidence-engine.ts` como fonte de verdade e
a propagou** para `scientific-repository.ts`, `clinical-therapeutics.ts` e
`mock-data.ts` — um erro real, hoje corrigido com a fonte verificada.
(Os DOIs `ehab368`/`ehad195` da diretriz de Insuficiência Cardíaca,
corrigidos nos RM-77/79, são de uma diretriz *diferente* — ESC Heart
Failure — e não são afetados por este achado.)

## O que foi corrigido (5 arquivos)

Em todos os locais que citavam "8ª Diretriz.../2024/DOI 20240209",
substituído por: **"Diretriz Brasileira de Hipertensão Arterial – 2025"
/ 2025 / DOI `10.36660/abc.20250624` / SBC, SBN, SBH**.

1. **`evidence-engine.ts`** (nunca tocado antes — tratado como fonte de
   verdade em RMs anteriores): entrada `dbha8` → `dbha2025`; `resumo_clinico`
   do diagnóstico HAS atualizado para refletir a meta `< 130/80 mmHg`
   agora aplicada a **todos** os hipertensos, independentemente do risco
   CV (mudança real da DBHA 2025 vs. a formulação anterior, que restringia
   a meta agressiva a pacientes de risco moderado-alto). 4 entradas de
   `conflitos_diretrizes` também corrigidas — uma delas (`has-meta-idosos`)
   exigiu correção de **conteúdo clínico real**, não só de citação: a DBHA
   2025 recomenda `< 130/80 mmHg` para a maioria dos idosos (incluindo
   ≥ 80 anos), o que a aproxima do ACC/AHA — não mais do ESC/ESH como a
   entrada antiga (incorretamente) agrupava.
2. **`scientific-repository.ts`**: entrada `sci-sbchi-2024` → `sci-dbha-2025`,
   resumo reescrito com as mudanças reais verificadas.
3. **`clinical-therapeutics.ts`**: 2 ocorrências (enalapril, HCTZ) —
   citação corrigida, recomendação clínica inalterada.
4. **`mock-data.ts`**: 2 ocorrências — mesma correção.
5. **`governance.ts`** (pedido original do usuário): `Guideline['g1']`
   atualizada (`titulo`/`sigla`/`ano_publicacao`/`url_oficial`/
   `doi_referencia`/`versao_atual`) para a DBHA 2025. Nova entrada de
   versão `g1v3` (`numero: '2025'`) com `alteracoes: GuidelineChange[]`
   real, extraída diretamente da seção "Principais Destaques" do PDF
   (7 mudanças documentadas, cada uma com `campo`/`anterior`/`novo`/
   `justificativa`). `g1v2` (2020) e `g1v1` (2010) preservadas como
   histórico real, não alteradas. `evidencias: []` — nenhuma entrada de
   `Estudo` nova foi inventada, pois o PDF não atribui N/NNT/HR a um
   trial específico para essas recomendações (evita fabricar estatística
   que a própria fonte não fornece).

## Mudanças clínicas reais capturadas (verificadas por leitura do PDF, seção "Principais Destaques")

- Meta pressórica `< 130/80 mmHg` agora para **todos** os hipertensos, independente do risco CV (antes: só alto risco).
- Reclassificação da pré-hipertensão: remove "PA ótima" (absorvida em "PA normal", PAS < 120/PAD < 80); nova faixa de pré-hipertensão 120–139/80–89 mmHg.
- Escore de risco CV: PREVENT (Predicting Risk of Cardiovascular Disease Events).
- Três classes preferenciais explícitas: diurético tiazídico/similar, IECA ou BRA, BCC — betabloqueador reservado a situações específicas.
- Início do tratamento: associação dupla em dose baixa para a maioria; monoterapia só em subgrupos específicos.
- Espironolactona/eplerenona formalizada para HA resistente/refratária após falha de 3 classes iniciais.
- Primeira edição com capítulo dedicado ao manejo da HA no SUS (~75% dos pacientes hipertensos no Brasil).

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

Nenhuma dose, contraindicação ou regra de segurança. `evidence-engine.ts`
teve conteúdo clínico tocado em **um único ponto justificado** (o conflito
`has-meta-idosos`, reclassificado por divergência real confirmada na
fonte) — todo o resto foi correção de metadado de citação. Nenhuma nova
entidade `Estudo` com estatística de trial foi inventada.

## Licão para RMs futuras

O achado central desta RM: uma citação tratada como "já verificada" só
porque já estava presente e consistente entre múltiplos arquivos do
código **não é o mesmo que uma citação real**. Consistência interna não
substitui verificação contra a fonte primária. Da próxima vez que uma
citação parecer suspeita (ano/DOI que não bate com o que a própria fonte
mais recente referencia como predecessora), vale desconfiar mesmo que ela
já esteja "estabelecida" em vários lugares do código.

---

## Arquivos alterados

**Novo:**
- `docs/RM-81-FABRICATED-CITATION-FIX-DBHA-2025.md` (este relatório)

**Modificados:**
- `frontend/src/lib/evidence-engine.ts`
- `frontend/src/lib/scientific-repository.ts`
- `frontend/src/lib/clinical-therapeutics.ts`
- `frontend/src/lib/mock-data.ts`
- `frontend/src/lib/governance.ts`

---

Não foi feito commit, push ou deploy nesta RM.
