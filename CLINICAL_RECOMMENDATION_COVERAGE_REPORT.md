# CLINICAL_RECOMMENDATION_COVERAGE_REPORT

**Escopo:** cobertura da recomendação clínica (conduta farmacológica por condição) · **Modo:** não-invasivo — arquitetura, `DrugRepository`, `RM-00/06/22/23/24` e motor de segurança preservados.

---

## 1. Diagnóstico da limitação

`PROTOCOLOS` em `src/lib/clinical-therapeutics.ts` continha, por condição, uma **lista fixa e curta** de `TherapeuticSuggestion` (ex.: HAS = apenas Enalapril + Hidroclorotiazida). Moléculas de outras classes elegíveis já estavam **citadas em texto livre** no campo `alternativas` de cada sugestão (ex.: "Losartana 50 mg... (BRA)", "Anlodipino 5 mg (BCC)") mas nunca promovidas a opções estruturadas — sem dose própria, sem contraindicações próprias, sem marca/apresentação, não pesquisáveis, não filtráveis por contexto do paciente.

## 2. Fluxo atual (mapeado por leitura de código)

```
Anamnese (state.activeConsultation.anamnese)
 → DiagnosticPanel.handleSelectDiagnosis(hipotese)
 → getTherapeuticForCondition(id, label, eligibilityContext)   [clinical-therapeutics.ts]
 → PROTOCOLOS[conditionId]                                     [sugestões curadas — preservadas]
 → expandTherapeuticPlan(plan, conditionId, ctx)                [NOVO — só adiciona]
 → dispatch UPDATE_THERAPEUTIC → state.plano_terapeutico
 → TherapeuticPanel renderiza plano.farmacologico.map(...)      [já genérico, sem alteração]
```

**Achado colateral documentado, não corrigido (fora de escopo):** nesse fluxo (`consulta/nova` → `DiagnosticPanel`), os alertas de segurança usam `MOCK_SAFETY`, não o `runSafetyCheck` real. O motor real já roda normalmente em `prescricao-rapida` e nos testes — não foi tocado.

## 3. Arquivos responsáveis

| Arquivo | Papel | Alterado? |
|---|---|---|
| `src/lib/clinical-therapeutics.ts` | Camada com o bug (lista fixa) | Sim — 1 função, +8 linhas |
| `src/lib/therapeutic-class-expansion.ts` | **Novo módulo** de expansão de cobertura | Novo arquivo |
| `src/components/modules/DiagnosticPanel.tsx` | Passa o contexto de elegibilidade (anamnese) | Sim — 2 linhas |
| `src/components/modules/TherapeuticPanel.tsx` | Renderiza `plano.farmacologico` | **Não alterado** (já genérico) |
| `src/lib/pharma-core/*` (RM-06) | Fonte de descoberta de moléculas/marcas | **Não alterado** |
| `src/lib/safety-rules.ts` (motor de segurança) | Checagem em tempo de prescrição | **Não alterado** |
| RM-22/23/24 | Regressão clínica / consistência / cross-database | **Não alterados** |

## 4. Regra que limitava a cobertura

Uma só: o array estático `PROTOCOLOS[condição].farmacologico`, sem qualquer consulta ao `drugRepository` para descobrir moléculas irmãs de classe.

## 5. Moléculas existentes na base que não eram consideradas (agora são)

| Condição | Classe (rótulo canônico) | Moléculas incorporadas |
|---|---|---|
| HAS | BRA | Losartana, Valsartana, Olmesartana, Irbesartana, Telmisartana |
| HAS | BCC | Anlodipino, Nifedipino, Diltiazem, Verapamil |
| HAS | IECA | Ramipril, Perindopril |
| HAS | Tiazídico-símile | Clortalidona, Indapamida |
| DM2 | AR-GLP-1 | Semaglutida |
| DM2 | iSGLT2 | Dapagliflozina |
| Dislipidemia | Estatina / Hipolipemiante | Atorvastatina, Ezetimiba, Fenofibrato |
| Asma | ICS isolado / Antileucotrieno / ICS-LABA | Fluticasona, Beclometasona, Ciclesonida, Montelucaste, Zafirlucaste, Zileutona, Fluticasona/Salmeterol, Fluticasona-Furoato/Vilanterol |
| DPOC | LAMA / LABA / LABA-LAMA / SAMA | Umeclidínio, Glicopirrônio, Aclidínio, Formoterol, Salmeterol, Indacaterol, Olodaterol, Ipratrópio, 3 combinações LABA/LAMA |
| ICC | BRA / ARNI / Betabloqueador / ARM / IECA | Losartana, Valsartana, Sacubitril/Valsartana, Bisoprolol, Nebivolol, Succinato de Metoprolol, Eplerenona, Ramipril, Perindopril |
| SCA | Antiagregante | Clopidogrel, Ticagrelor |

## 6. Marcas recuperadas

Todas as marcas das moléculas expandidas vêm de `drugRepository` (ex.: Losartana → Zart®/Eurofarma, Cozaar/MSD, Losartana EMS), já com apresentação e, quando disponível, registro ANVISA — nada digitado manualmente.

## 7. Regras aplicadas (elegibilidade)

Implementadas em `isEligible()`, todas sobre dados **já existentes** na `DrugEntity`:

1. Gestação/lactação contraindicada (`pregnancy`/`lactation === 'contraindicado'`).
2. Alergia registrada na anamnese vs. nome/sinônimos da molécula.
3. Função renal (`tfg`) vs. `dosageRules[renal].detail` (mesmo idioma de detecção usado em `safety-rules.ts`).
4. Função hepática (`child_pugh`) vs. `dosageRules[hepatico].detail`.
5. Interação **contraindicada** com medicamento em uso (`entity.interactions`).
6. **Filtro de indicação própria** (`entityCoversCondition`): a molécula candidata só é sugerida se sua **própria** lista `indications` (dado real, sourced) cobrir a condição — não basta pertencer à classe.

## 8. Moléculas excluídas e motivo (exemplos verificados)

| Molécula | Classe | Condição avaliada | Motivo |
|---|---|---|---|
| Atenolol | Betabloqueador | ICC | Indicações próprias da base canônica (`HAS, Angina, Pós-IAM, Controle de FC`) não citam IC — não tem evidência de mortalidade em IC-FEr, diferente de carvedilol/bisoprolol/metoprolol/nebivolol |
| Qualquer IECA/BRA | IECA/BRA | HAS + gestante (teste) | `pregnancy === 'contraindicado'` |
| Sinvastatina, Bumetanida, Torasemida | Estatina / Diurético de alça | Dislipidemia / ICC | Citadas em `alternativas` mas **ausentes da base canônica** — corretamente não fabricadas nem sugeridas |

## 9. Testes adicionados

`src/tests/therapeutic-class-expansion.test.ts` — **20 testes**, cobrindo exatamente os 12 itens de validação pedidos: âncora preservada, novas moléculas elegíveis, BRA não excluído por viés de IECA, contraindicada excluída (gestante), classe diferente quando apropriado (ARNI em ICC), marcas recuperadas, apresentações recuperadas, marca não associada a molécula errada, motor de segurança executando, RM-23 íntegro, RM-24 íntegro, sem duplicidade, sem expansão indiscriminada (faringoamigdalite não ganha azitromicina).

## 10. Impacto de cobertura (por condição)

| Condição | Antes | Depois | Δ |
|---|---|---|---|
| HAS | 2 | **15** | +13 |
| DM2 | 3 | **5** | +2 |
| Dislipidemia | 1 | **4** | +3 |
| Asma | 2 | **13** | +11 |
| DPOC | 2 | **14** | +12 |
| ICC | 4 | **13** | +9 |
| SCA | 1 | **3** | +2 |
| Hipotireoidismo | 1 | 1 | +0 (correto — sem alternativa equivalente, conforme a própria nota clínica já registrada) |
| Faringoamigdalite | 1 | 1 | +0 (escopo conservador — ver §11) |
| PAC | 1 | 1 | +0 (escopo conservador — ver §11) |

## 11. Limites de escopo (deliberados, não "não fazer automaticamente")

- **Antibióticos (faringoamigdalite/PAC):** não expandidos entre classes (ex.: amoxicilina → azitromicina), mesmo citadas em `alternativas`, porque a equivalência clínica depende de espectro/patógeno/alergia — não apenas de classe farmacológica. Expansão cross-classe de antibiótico fica fora desta entrega (risco clínico maior que o benefício de cobertura).
- **Condições sem protocolo (depressão, ansiedade, insônia, epilepsia, dor neuropática, DRGE):** **nada foi criado**. `PROTOCOLOS` não os contém hoje; criar novas condutas exigiria curadoria de diretriz + sourcing (mesmo padrão do RM-25), não é uma correção de cobertura — respeitando "não implemente automaticamente novas condutas baseadas em suposições".

## 12. Impacto arquitetural

- **0 alterações estruturais** em RM-00/06/22/23/24.
- **0 novas bases de dados** — único ponto de descoberta é `drugRepository.getAll()`.
- **0 novos campos** no modelo `TherapeuticSuggestion`/`DrugDose`/`DrugBrand`/`ScientificReference` — reuso integral.
- **1 arquivo novo** (`therapeutic-class-expansion.ts`, ~330 linhas, puro/sem estado) + **2 arquivos com diff mínimo** (`clinical-therapeutics.ts` +8 linhas; `DiagnosticPanel.tsx` +2 linhas).
- `TherapeuticPanel.tsx` (UI) **não precisou de nenhuma alteração** — já iterava genericamente sobre `plano.farmacologico`.

## 13. Validação executada

| Verificação | Resultado |
|---|---|
| `tsc --noEmit` | ✅ limpo |
| `npm run lint` (guard RM-06) | ✅ 0 violações |
| `npm test` (suíte completa) | ✅ **139/139** (119 preexistentes + 20 novos) |
| `npm run test:coverage` | ✅ sem violação de meta |
| RM-23 (Drug Consistency) | ✅ 358 entidades, 0 crítico/alto |
| RM-24 (Cross Database) | ✅ 365 analisados, 0 crítico, publicação liberada |
| `npm run build` (com gates `prebuild`) | ✅ compilado, 50 rotas |

---

*CLINICAL_RECOMMENDATION_COVERAGE_REPORT — gerado após implementação e validação completa.*
