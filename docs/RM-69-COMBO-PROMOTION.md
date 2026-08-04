# RM-69 — Fechamento do achado da Seção 6 do RM-66: revisão individual das 13 combinações "aceitas" automaticamente

**Origem:** Seção 6 de `docs/RM-66-CLINICAL-EXPANSION-FRAMEWORK.md` — o
comparador RM-24 (`frontend/src/validation/cross-database/validator.ts`) usa a
heurística `isCombo = /\+/.test(e.name)` para marcar qualquer combinação
comercial cujo nome contenha `"+"` como `aceito: true` / `gravidade: 'low'`,
sob a premissa de que "combinações são fora de escopo do PHARMA_DB (moléculas
isoladas)". Essa premissa — formalizada em RM-54 (achado #2) — nunca havia
sido verificada item a item. RM-66 sinalizou explicitamente essa lacuna ao
promover a Zart H® (losartana + hidroclorotiazida) e descobrir que ela também
se enquadrava na heurística, apesar de ter dados de bula reais e completos.

**Escopo:** revisão manual das 13 combinações restantes que a heurística
aceitava automaticamente, seguindo a mesma metodologia do piloto RM-66
(comparar a profundidade de curadoria contra a régua já estabelecida pela
Zart H®: contraindicações de bula, advertências, interações, populações
especiais). Nenhum motor clínico, regra de dose/segurança, ou dado
farmacológico pré-existente foi alterado — apenas cadastro de novas
entidades.

---

## 1. Resultado da revisão

Nenhuma das 13 era um caso trivial. Todas têm o mesmo nível de curadoria
clínica real da bula ANVISA que qualquer outra entrada já presente no
PHARMA_DB — nenhuma é um placeholder raso. A heurística `"+"` estava
mascarando o mesmo tipo de gap estrutural do achado RM-58 (produto real
invisível ao motor de busca/prescrição por existir em só uma das 5 fontes),
só que em lote.

| # | Molécula | Marca(s) | Classe | id no PHARMA_DB |
|---|---|---|---|---|
| 1 | Formoterol + Fluticasona | Lugano® | ICS+LABA (asma/DPOC) | `formoterol_fluticasona` |
| 2 | Montelucaste + Levocetirizina | Lemont® | Asma + rinite (Black Box neuropsiquiátrico) | `montelucaste_levocetirizina` |
| 3 | Doxazosina + Finasterida | Duomo HP® | HPB | `doxazosina_finasterida` |
| 4 | Tramadol + Paracetamol | Gésico Duo® | Analgesia (opioide) | `tramadol_paracetamol` |
| 5 | Diosmina + Hesperidina | Perivasc® | Insuficiência venosa | `diosmina_hesperidina` |
| 6 | Betametasona (dipropionato + fosfato) | BetaTrinta® | Corticosteroide injetável | `betametasona_dipropionato_fosfato` |
| 7 | Etinilestradiol + Ciproterona | Selene® | Contraceptivo (Cat. X) | `etinilestradiol_ciproterona` |
| 8 | Clormadinona + Etinilestradiol | Amora® | Contraceptivo (Cat. X) | `clormadinona_etinilestradiol` |
| 9 | Desogestrel + Etinilestradiol | Primera 20®/30® | Contraceptivo (Cat. X) | `desogestrel_etinilestradiol` |
| 10 | Cetoconazol + Betametasona | Trok® Creme/Pomada | Dermatológico tópico | `cetoconazol_betametasona` |
| 11 | Betametasona + Gentamicina | Trok-G® | Dermatológico tópico | `betametasona_gentamicina` |
| 12 | Cetoconazol + Betametasona + Neomicina | Trok-N® | Dermatológico tópico | `cetoconazol_betametasona_neomicina` |
| 13 | Tinidazol + Miconazol | Crevagin® | Antiparasitário/antifúngico vaginal | `tinidazol_miconazol` |

(Nota: Zart H®/losartana-hidroclorotiazida, promovida no piloto RM-66,
aparecia como pendente em uma cópia desatualizada de
`DATABASE_SYNC_REPORT.md` commitada antes da regeneração — confirmado, ao
rodar `npm run check:sync` do zero, que ela já não está entre os "aceitos"
desde o piloto. Não fazia parte das 13 revisadas aqui.)

## 2. O que foi feito

- **Novo arquivo** `frontend/src/lib/pharma-database-rm69-combos.ts` — as 13
  entidades `QuickDrug`, com dados portados 1:1 de `eurofarma-sync.ts`
  (posologia, contraindicações, interações, populações especiais, marcas),
  citando o `id` de origem em cada entrada. `molecula` usa exatamente a
  mesma string da fonte, garantindo que `toMoleculeId()` produza a mesma
  chave dos dois lados — fecha a divergência no RM-24 sem duplicar a
  molécula (mesmo padrão de `pharma-database-rm54-gaps.ts`).
- **`ajuste_hepatico`/`ajuste_renal`**: quando a bula de origem não trazia
  valor explícito, o ajuste foi derivado da farmacologia dos componentes
  (mesmo procedimento do piloto RM-66 para a Zart H®) — nunca inventado sem
  base farmacológica; anotado por entrada quando aplicável.
- **4 entidades** (Perivasc®, Trok® Creme, Trok-G®, Trok-N®) tinham bula sem
  nenhuma interação principal listada (uso tópico/oral bem tolerado). O
  gate `pharma-core` (`sem lacunas clínicas críticas`) exige ≥1 interação
  documentada por entidade — adicionada uma nota de cautela farmacológica
  de classe (ex.: risco teórico de ototoxicidade aditiva de aminoglicosídeo
  tópico, supressão adrenal aditiva de corticosteroide tópico), marcada
  explicitamente como não vinda da lista de "interações principais" da
  bula.
- **`frontend/src/lib/pharma-database.ts`** — `PHARMA_DB_RM69_COMBOS`
  importado e agregado em `getAllDrugs()`, mesmo padrão de todas as outras
  extensões temáticas.
- **`frontend/src/tests/cross-database.test.ts`** — o teste da era RM-54
  que exigia `combos.length > 0` (havia combinações aceitas pendentes de
  revisão) foi ajustado: o mecanismo `aceito: true` continua validado para
  casos futuros, e um novo teste trava que `report.aceitos === 0` — nenhuma
  aceitação automática deve permanecer sem revisão individual documentada.

## 3. Verificação

```
[RM-24] cross-db: total=367 compatíveis=131 divergentes=0 aceitos=0 críticos=0
[RM-24] ✅ fontes sincronizadas (sem conflitos críticos) — publicação liberada.
```

`aceitos` caiu de 13 para **0** — todas as combinações antes auto-aceitas
agora existem no PHARMA_DB e são reconhecidas como compatíveis, não mais
como divergência tolerada.

## 4. Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **62 arquivos / 1106 testes** — todos passando (2 testes de `cross-database.test.ts` ajustados/adicionados; falha inicial de `pharma-core.test.ts` — interações ausentes em 4 entidades — corrigida antes desta rodada) |
| `npm run test:coverage` | ✅ Exit 0 |
| `npm run build` | ✅ Sucesso — `RM-23: 381 entidades, 0 inconsistências`; `RM-24: aceitos=0`; `RM-49: integridade textual OK`; `RM-62: 0 BLOCKING_ERROR` |

`DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md`, regenerados
como efeito colateral do build, foram revertidos (`git checkout --`).

## 5. O que NÃO foi alterado

Nenhum motor clínico (dose, segurança, risco), nenhuma regra de prescrição
pré-existente, nenhum dado farmacológico de entidade já cadastrada. Apenas
13 novas entidades `QuickDrug` e o comparador de teste que documentava a
decisão de escopo agora superada.

## 6. Arquivos alterados

**Novos:**
- `frontend/src/lib/pharma-database-rm69-combos.ts`
- `docs/RM-69-COMBO-PROMOTION.md` (este relatório)

**Modificados:**
- `frontend/src/lib/pharma-database.ts` — import + agregação de
  `PHARMA_DB_RM69_COMBOS`.
- `frontend/src/tests/cross-database.test.ts` — teste da era RM-54
  ajustado; novo teste `report.aceitos === 0`.

---

Não foi feito commit, push ou deploy nesta RM.
