# CLINICAL_RECOMMENDATION_PRIORITIZATION_REPORT — RM-26

**Escopo:** priorização clínica das opções elegíveis (não a descoberta/elegibilidade, já resolvidas no RM-25.1) · **Modo:** não-invasivo — arquitetura, `DrugRepository`, RM-00/06/22/23/24 e motor de segurança preservados.

---

## 1. Diagnóstico da ordenação anterior

Após a expansão de cobertura (RM-25.1), `plan.farmacologico` já continha todas as moléculas elegíveis (ex.: HAS = 15), mas a **ordem** era puramente estrutural:

1. Âncoras curadas em `PROTOCOLOS`, na ordem em que foram escritas no código;
2. Moléculas expandidas, na ordem de iteração de `CONDITION_CLASS_KEYS[condição]` (ordem de escrita do array de classes);
3. Dentro de cada classe, na ordem em que `drugRepository.getAll()` devolve as entidades (ordem de construção da base canônica).

Nenhum desses três critérios tem significado clínico. Não existia nenhum mecanismo de prioridade, score ou nível — só a lista de exclusão (`ExcludedOption`, calculada mas **descartada** antes de chegar ao `TherapeuticPlan` retornado).

## 2. Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `src/lib/types.ts` | +2 tipos novos (`ClinicalPriority`, `ExcludedTherapeuticOption`) e 2 campos **opcionais** (`TherapeuticSuggestion.prioridade?`, `TherapeuticPlan.opcoes_excluidas?`) |
| `src/lib/therapeutic-prioritization.ts` | **Novo módulo** — árvore de decisão determinística de priorização |
| `src/lib/therapeutic-class-expansion.ts` | `EligibilityContext` ganha `comorbidades?: string[]` (reuso de `Anamnesis.comorbidades`, já coletado); `ExcludedOption` passa a ser alias de `ExcludedTherapeuticOption` |
| `src/lib/clinical-therapeutics.ts` | `getTherapeuticForCondition` passa a chamar `prioritizeTherapeuticPlan` após `expandTherapeuticPlan`, e anexa `opcoes_excluidas` ao plano retornado |
| `src/components/modules/TherapeuticPanel.tsx` | **Não alterado** — já itera genericamente sobre `plano.farmacologico`; a nova ordem (por prioridade) já se reflete na UI sem qualquer mudança de código |
| `src/lib/pharma-core/*`, `src/lib/safety-rules.ts`, RM-22/23/24 | **Não alterados** |

## 3. Dados utilizados para priorização (auditoria dos campos existentes)

| Fator do enunciado | Campo real usado | Fonte |
|---|---|---|
| A) Adequação à condição | `DrugEntity.indications[]` vs. tokens da condição | RM-06, já usado desde RM-25.1 (`entityCoversCondition`) |
| B) Compatibilidade com paciente | `pregnancy`/`lactation`, `dosageRules[renal/hepatico]`, `Anamnesis.alergias` | RM-06 + Anamnesis (já coletados) |
| C) Evidência | `DrugEntity.references[type=GUIDELINE\|EVIDENCIA]` | RM-25 (139/358 com diretriz sourced) |
| D) Adequação à comorbidade | `Anamnesis.comorbidades[]` vs. `DrugEntity.indications[]` (com tabela de sinônimos bounded — ex.: "DRC" ↔ "nefropatia diabética") | Anamnesis (novo uso) + RM-06 |
| E) Segurança | `DrugEntity.contraindications[]`, `interactions[].severity` | RM-06, já usado na exclusão (RM-25.1) |
| F) Compatibilidade com terapia atual | `interactions[]` vs. `Anamnesis.medicamentos_em_uso[]` (severidade não-contraindicada = ressalva, não exclusão) | RM-06 + Anamnesis |

**Nenhum campo novo na base canônica.** Um único uso novo de dado já existente: `Anamnesis.comorbidades`, até então coletado mas não consumido no fluxo de conduta.

## 4. Critérios de prioridade (árvore determinística, não numérica)

```
ELEGÍVEL (herdado do RM-25.1 — inalterado)
  │
  ├─ Cautela ativa (renal/hepática/interação não-bloqueante c/ uso atual)?
  │     SIM → NÍVEL 3 — CONTEXTUAL (motivo = a(s) cautela(s) encontrada(s))
  │
  ├─ Indicação própria cita a comorbidade do paciente E há diretriz estruturada?
  │     SIM → NÍVEL 1 — PREFERENCIAL
  │
  └─ Caso contrário (elegível, indicado, sem destaque específico)
        → NÍVEL 2 — PRIMEIRA LINHA
```

Ordenação dentro do array: nível → presença de diretriz estruturada → nome (alfabético) — 100% determinístico, sem números arbitrários.

## 5. Critérios de exclusão (Nível 4 — inalterados desde RM-25.1)

Contraindicação absoluta (gestação/lactação/renal/hepática), alergia, interação **contraindicada** com medicação em uso, ou indicação própria que não cobre a condição. Continuam excluindo **antes** da priorização — o RM-26 nunca reintroduz uma opção excluída.

## 6. Condições avaliadas

HAS, DM2, Dislipidemia, Asma, DPOC, ICC, SCA — as 7 condições prioritárias pedidas. Nenhum protocolo novo foi criado.

## 7. Exemplo antes/depois — HAS (paciente HAS + DM2 + DRC, TFG 75)

**Antes (RM-25.1, sem priorização):** 15 opções em ordem estrutural (Enalapril, Hidroclorotiazida, Ramipril, Perindopril, Olmesartana, Losartana, Valsartana...).

**Depois (RM-26):**

```
NÍVEL 1 — PREFERENCIAIS (5): Enalapril, Irbesartana, Losartana, Ramipril, Telmisartana
  → indicação própria cita "DRC"/"nefropatia diabética" + diretriz estruturada (ESC/ESH 2023 ou ESC 2021 IC)

NÍVEL 2 — PRIMEIRA LINHA (10): Anlodipino, Clortalidona, Diltiazem, Hidroclorotiazida,
  Indapamida, Nifedipino, Olmesartana, Perindopril, Valsartana, Verapamil
  → elegíveis e indicados, sem o destaque específico de DRC/DM2 nesta base

NÍVEL 4 — EXCLUÍDAS: nenhuma (todas as 15 são elegíveis para este paciente)
```

Losartana e Enalapril (BRA e IECA) dividem o Nível 1 — clinicamente correto: as diretrizes recomendam IECA **ou** BRA para nefropatia diabética, nunca uma classe como superior à outra nem combinadas (duplo bloqueio é contraindicado). O sistema não forçou uma escolha única artificial.

## 8. Número de opções por categoria (7 condições prioritárias)

| Condição | Total elegível | Preferencial | Primeira linha | Contextual | Excluídas (Nível 4) |
|---|---|---|---|---|---|
| HAS (com comorbidade DRC/DM2) | 15 | 5 | 10 | 0 | 0 |
| DM2 | 5 | 0 | 5 | 0 | 2 (Liraglutida/Semaglutida — indicação não cobre DM2 isoladamente na base) |
| Dislipidemia | 4 | 0 | 4 | 0 | 0 |
| Asma | 13 | 0 | 13 | 0 | 0 |
| DPOC | 14 | 0 | 14 | 0 | 0 |
| ICC | 13 | 0 | 13 | 0 | 4 (Atenolol, Olmesartana, Irbesartana, Telmisartana — indicação não cobre IC) |
| SCA | 3 | 0 | 3 | 0 | 0 |

**Nota honesta:** sem um `EligibilityContext` com comorbidades relevantes, poucas condições produzem Nível 1 hoje — o Nível 1 depende de haver *match* real entre a comorbidade do paciente e a indicação sourced da molécula. Isso é o comportamento correto e conservador: **não forçamos uma "preferencial" sem justificativa real**. As exclusões de DM2/ICC já existiam desde o RM-25.1 (filtro de indicação); o RM-26 apenas as tornou visíveis pela primeira vez (`opcoes_excluidas`).

## 9. Justificativas de priorização (explicabilidade — exemplo real)

```json
{
  "tier": "preferencial",
  "motivo": "Indicação registrada na base cobre a(s) comorbidade(s) do paciente (DRC) e há diretriz estruturada respaldando a classe.",
  "fatores_considerados": ["comorbidade", "evidencia_diretriz"],
  "evidencia_status": "diretriz_estruturada"
}
```

Toda opção retornada — em qualquer nível — carrega esse objeto, respondendo às 7 perguntas de explicabilidade do enunciado (por que foi considerada, por que essa prioridade, quais fatores, qual evidência, etc.).

## 10. Testes adicionados

`src/tests/therapeutic-prioritization.test.ts` — **28 testes**, cobrindo exatamente os 17 itens da validação obrigatória: preferencial antes de alternativas, todas as elegíveis preservadas, contraindicação/interação continuam excluindo, ausência de evidência não é contraindicação, opção de 1ª linha não excluída por não ser 1ª escolha, comorbidade altera prioridade com dado real, determinismo, sem duplicidade, marcas/apresentações vinculadas corretamente, motor de segurança executando, expansão preservada, protocolos curados preservados, RM-23/RM-24 íntegros.

## 11. Resultados dos gates

| Verificação | Resultado |
|---|---|
| `tsc --noEmit` | ✅ limpo |
| `npm run lint` (guard RM-06) | ✅ 0 violações |
| `npm test` | ✅ **167/167** (139 preexistentes + 28 novos) |
| `npm run test:coverage` | ✅ sem violação de meta |
| RM-23 (Drug Consistency) | ✅ 358 entidades, 0 crítico/alto |
| RM-24 (Cross Database) | ✅ 365 analisados, 0 crítico, publicação liberada |
| `npm run build` (com gates `prebuild`) | ✅ compilado, 50 rotas |

## 12. Impacto arquitetural

- **0 alterações estruturais** em RM-00/06/22/23/24.
- **0 nova base de dados / 0 duplicação do DrugRepository** — única fonte continua sendo `drugRepository`.
- **2 campos opcionais** adicionados (`prioridade`, `opcoes_excluidas`) — sem equivalente prévio, retrocompatíveis (consumidores existentes que ignoram os campos continuam funcionando; `TherapeuticPanel.tsx` não precisou de nenhuma mudança).
- **1 arquivo novo** (`therapeutic-prioritization.ts`, ~180 linhas, puro/sem estado, sem I/O).
- Prioridade calculada **na camada de molécula**, antes de qualquer marca — respeita exatamente o fluxo `Molécula → DrugRepository → Marcas → Apresentações` pedido; nenhuma marca influencia o nível de prioridade.

## 13. Limitações conhecidas

- **Nível "Contextual" raramente populado nas 7 condições sem contexto específico de paciente** — o gatilho depende de dados de anamnese (TFG, Child-Pugh, medicação em uso) que só existem quando o médico os preenche; comportamento correto (conservador), documentado aqui para não ser confundido com bug.
- **Correspondência comorbidade↔indicação é por substring + tabela de sinônimos bounded** (DRC/nefropatia, DM/diabetes, IC/insuficiência cardíaca, etc.) — cobre os casos reais testados, mas não é um motor de terminologia médica completo (ex.: SNOMED); comorbidades descritas de forma muito diferente da indicação sourced podem não gerar Nível 1 mesmo sendo clinicamente pertinentes. Isso é conservador por design (nunca promove sem dado real) e não introduz risco de segurança.
- **Antibióticos (faringoamigdalite/PAC) permanecem fora do escopo de priorização multi-molécula** (herdado do RM-25.1 — 1 opção cada, sem expansão cross-classe).

---

*CLINICAL_RECOMMENDATION_PRIORITIZATION_REPORT — gerado após implementação e validação completa.*
