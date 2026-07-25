# HEART_FAILURE_THERAPEUTIC_COVERAGE_REPORT — RM-28

**Nome:** RM-28 — Heart Failure Therapeutic Coverage Completion
**Escopo:** fechar a lacuna de cobertura de ICC identificada pelo RM-27.1 (iSGLT2 ausente de `CONDITION_CLASS_KEYS['icc']`). Nenhuma condição, molécula, marca ou arquitetura nova.

---

## 1. Objetivo do RM-28

Garantir que toda classe/molécula já existente no DrugRepository com indicação e evidência apropriadas para ICC seja **descoberta** no fluxo de recomendação — sem criar nada novo, apenas removendo uma lacuna de cobertura estrutural.

## 2. Relação com RM-25.1

O RM-28 opera exclusivamente na camada de descoberta do RM-25.1: `CONDITION_CLASS_KEYS['icc']` (definido em `therapeutic-class-expansion.ts`) ganhou uma chave (`SGLT2`) — o mecanismo de descoberta (`expandTherapeuticPlan`, `isEligible`, `entityCoversCondition`) não foi alterado.

## 3. Relação com RM-27

Nenhuma alteração. IECA/BRA/BETABLOQUEADOR/ARM/DIURETICO_ALCA/ARNI/SABA mantêm exatamente os papéis já auditados. Uma nova entrada foi adicionada em `CLASS_ROLE_OVERRIDES` (icc/SGLT2), seguindo o mesmo padrão e mecanismo já existente (`getValidatedClassRole`/`isRoleFirstLine`) — sem novo mecanismo de classificação.

## 4. Relação com RM-27.1

O RM-27.1 havia documentado a lacuna como limitação conhecida, não corrigida. O RM-28 a resolve: SGLT2/ICC recebe papel `prognostic_modifier` (mesma categoria de ARNI/betabloqueador/ARM/BRA — redução de mortalidade/hospitalização), consistente com a evidência pivotal (DAPA-HF, EMPEROR-Reduced).

## 5. Relação com RM-26.1

Nenhuma alteração de código. As moléculas SGLT2 recém-descobertas em ICC passam pela mesma árvore de decisão (`classifyPriority`) — Nível 2 (primeira_linha) por padrão; Nível 1 apenas se houver vantagem individual real (indicação própria citando comorbidade do paciente); Nível 3 se houver cautela renal/hepática/interação.

## 6. Limitação original identificada

RM-27.1, seção 17/18: dapagliflozina e empagliflozina possuem evidência robusta em IC (DAPA-HF, EMPEROR-Reduced) e já estavam na base canônica com indicação própria sourced, mas `CONDITION_CLASS_KEYS['icc']` não incluía a chave `SGLT2` — a classe nunca era iterada para a condição ICC, tornando as duas moléculas invisíveis ao fluxo de recomendação de ICC (eram descobertas apenas via DM2).

## 7. Auditoria completa da cobertura atual da ICC (antes do RM-28)

`CONDITION_CLASS_KEYS['icc']` = `['IECA', 'BETABLOQUEADOR', 'ARM', 'DIURETICO_ALCA', 'BRA', 'ARNI']`. Moléculas descobertas: Enalapril, Ramipril, Perindopril (IECA); Losartana, Valsartana (BRA); Bisoprolol, Nebivolol, Carvedilol, Succinato de Metoprolol (Betabloqueador); Espironolactona, Eplerenona (ARM); Furosemida (Diurético de Alça); Sacubitril/Valsartana (ARNI). Excluídas corretamente por falta de indicação própria: Atenolol, Olmesartana, Irbesartana, Telmisartana.

## 8. Matriz de classes

| Classe | Presente em CONDITION_CLASS_KEYS['icc'] (antes) | Presente (depois) | Papel clínico (RM-27/27.1) | Ação RM-28 |
|---|---|---|---|---|
| IECA | sim | sim | first_line | nenhuma |
| BRA | sim | sim | prognostic_modifier | nenhuma |
| BETABLOQUEADOR | sim | sim | prognostic_modifier | nenhuma |
| ARM | sim | sim | prognostic_modifier | nenhuma |
| DIURETICO_ALCA | sim | sim | congestion_control | nenhuma |
| ARNI | sim | sim | prognostic_modifier | nenhuma |
| **SGLT2** | **não** | **sim** | **prognostic_modifier (novo override)** | **adicionada — gap de cobertura corrigido** |

## 9. Matriz de moléculas (auditoria específica de iSGLT2)

| Molécula | Existe no DrugRepository | Indicação ICC própria (sourced) | Classe canônica (`therapeuticClass`) | Evidência | Já descoberta em ICC (antes) | Ação |
|---|---|---|---|---|---|---|
| Dapagliflozina | sim (`id: dapagliflozina`) | sim — `indicacoes_principais: ['DM2', 'IC-FEr (NYHA II-IV)', 'DRC com proteinúria']`; `guidelines_referencia` cita "ESC 2021 IC — iSGLT2 na IC-FEr (Classe I-A)" e "DAPA-HF" | `iSGLT2` (já mapeado por `CLASS_KEY_MAP['iSGLT2'] = 'SGLT2'`) | DAPA-HF (NEJM 2019) | não | **descoberta a partir do RM-28** |
| Empagliflozina | sim (`id: empagliflozina`) | sim — `indicacoes_principais: ['DM2', 'IC (independente do DM)', 'DRC']`; `guidelines_referencia` cita "ESC 2021 IC — iSGLT2 na IC-FEr (Classe I-A)" e "EMPA-REG/EMPEROR" | `SGLT-2` (já mapeado por `CLASS_KEY_MAP['SGLT-2'] = 'SGLT2'`) | EMPEROR-Reduced (NEJM 2020) | não | **descoberta a partir do RM-28** |

Nenhuma outra molécula de classe SGLT2/iSGLT2 existe na base canônica (auditoria confirmada por busca em `pharma-database*.ts` — apenas as duas entradas acima têm `classe` mapeável para `SGLT2`).

## 10. Situação antes

ICC tinha 6 classes elegíveis, 12 moléculas descobertas (dado real da suíte de testes anterior ao RM-28: 4 IECA/BRA + 4 Betabloqueador + 2 ARM + 1 diurético + 1 ARNI). Dapagliflozina e Empagliflozina, apesar de já possuírem indicação própria sourced para IC na base canônica, nunca apareciam no plano de ICC.

## 11. Situação depois

ICC passa a ter 7 classes elegíveis, 14 moléculas descobertas (as 12 anteriores + Dapagliflozina + Empagliflozina). Nenhuma outra molécula mudou de status — Atenolol, Olmesartana, Irbesartana e Telmisartana continuam corretamente excluídas por ausência de indicação própria (validado por teste dedicado, item 5/9).

## 12. iSGLT2 auditados

Dapagliflozina e Empagliflozina — ambas avaliadas nos 10 pontos da Fase 3 do RM-28: (1) presentes no DrugRepository; (2) indicação própria cobre IC; (3) fenótipo sustentado pela evidência é **IC-FEr** (DAPA-HF e EMPEROR-Reduced são ambos ensaios em fração de ejeção reduzida — Dapagliflozina cita isso explicitamente na própria indicação, "IC-FEr (NYHA II-IV)"); (4) não há generalização automática para IC-FEp/IC-FElr — ver seção 20; (5) fonte é diretriz primária (ESC 2021) mais o ensaio pivotal citado por nome; (6) compatível com o modelo atual sem exigir novo campo.

## 13. Moléculas adicionadas à cobertura

Dapagliflozina, Empagliflozina (ambas já existiam no DrugRepository — nenhuma molécula foi criada; apenas passaram a ser **descobertas** para a condição ICC).

## 14. Moléculas deliberadamente não adicionadas

Nenhuma outra molécula de nenhuma classe foi adicionada. Nenhuma outra classe foi adicionada a `CONDITION_CLASS_KEYS['icc']`.

## 15. Justificativa de cada exclusão

Não se aplica a novas exclusões — as exclusões pré-existentes (Atenolol, Olmesartana, Irbesartana, Telmisartana) permanecem pelos mesmos motivos já documentados no RM-25.1/RM-27 (ausência de indicação própria sourced para IC na base canônica) e foram reverificadas por teste de regressão (item 5/9 dos testes obrigatórios).

## 16. Evidência clínica

| Molécula | Estudo pivotal | Fonte |
|---|---|---|
| Dapagliflozina | DAPA-HF | McMurray JJV et al., NEJM 2019 — citado em `guidelines_referencia` da base canônica |
| Empagliflozina | EMPEROR-Reduced | Packer M et al., NEJM 2020 — citado em `guidelines_referencia` da base canônica |
| Ambas | ESC 2021 Guidelines for the diagnosis and treatment of acute and chronic heart failure (Classe I-A para iSGLT2 em IC-FEr) | doi.org/10.1093/eurheartj/ehab368 |

## 17. Papel clínico

`prognostic_modifier` — mesma categoria já usada para ARNI/BETABLOQUEADOR/ARM/BRA (RM-27.1): reduz mortalidade cardiovascular e hospitalização por IC, independentemente da presença de DM2 concomitante.

## 18. Limitações relacionadas à FE

Não foi criado nenhum campo estruturado de fração de ejeção. A população `fe_reduzida` no override de SGLT2/ICC é **contexto textual da evidência** (mesmo padrão já usado para as 5 outras classes de ICC desde o RM-27/27.1) — não é um filtro programático. O sistema não distingue hoje, por dado estruturado, um paciente com FE preservada de um com FE reduzida.

## 19. Limitações relacionadas à NYHA

Não foi criado campo de classe funcional NYHA. A indicação própria de Dapagliflozina já cita "NYHA II-IV" como texto — isso é preservado como está na base (dado real, não fabricado), mas não é usado como filtro de elegibilidade.

## 20. Limitações relacionadas à IC-FEp/IC-FElr

A evidência pivotal usada para justificar o papel `prognostic_modifier` (DAPA-HF, EMPEROR-Reduced) é especificamente em **IC-FEr**. Embora exista evidência mais recente para iSGLT2 em IC-FEp (ex.: EMPEROR-Preserved, DELIVER — não citados na base canônica atual), o RM-28 **não generaliza automaticamente** esse benefício para todos os fenótipos de IC — o `contexto` do override registra essa distinção explicitamente e recomenda que a extensão a IC-FEp/IC-FElr seja tratada como ponto de sourcing futuro, não como fato já validado nesta entrega.

## 21. Alterações de código

| Arquivo | Alteração |
|---|---|
| `src/lib/therapeutic-class-expansion.ts` | `CONDITION_CLASS_KEYS['icc']` ganha a chave `'SGLT2'` (era `['IECA', 'BETABLOQUEADOR', 'ARM', 'DIURETICO_ALCA', 'BRA', 'ARNI']`, passa a `[..., 'SGLT2']`). Nenhuma outra classe/condição alterada. |
| `src/lib/guideline-class-validation.ts` | +1 entrada em `CLASS_ROLE_OVERRIDES` (icc/SGLT2 = `prognostic_modifier`, fonte ESC 2021/DAPA-HF/EMPEROR-Reduced). Nenhuma alteração em `ClinicalRole`, `isRoleFirstLine()` ou nos overrides existentes. |

## 22. Alterações deliberadamente não realizadas

- `Anamnesis`/`EligibilityContext` — nenhum campo de FE, NYHA ou fenótipo criado.
- `CLASS_KEY_MAP`/`CLASS_LABELS` — não alterados (SGLT2 já existia, usado por DM2 desde o RM-25.1).
- `DrugRepository`, `DrugEntity`, `dosing-engine.ts`, `safety-rules.ts` — não alterados.
- `RM-23`, `RM-24` (engines) — não alterados.
- Override de IECA/ICC (RM-27) — não tocado.
- Nenhuma promoção automática de moléculas sem indicação própria (Atenolol, Olmesartana, Irbesartana, Telmisartana permanecem excluídas).

## 23. Testes criados

`src/tests/heart-failure-coverage-28.test.ts` — **32 testes**, cobrindo os 30 itens obrigatórios da Fase 12 (descoberta de Dapagliflozina/Empagliflozina; molécula sem indicação própria não promovida; papéis de ARNI/IECA/BRA/betabloqueador/ARM/diurético de alça inalterados; contraindicação/alergia/interação prevalecem; ajuste renal/hepático aplicado; marcas/apresentações corretas e não cruzadas; marca/apresentação não alteram papel clínico; determinismo; sem duplicidade; RM-27/27.1/26.1/23/24 íntegros; nenhuma condição nova; nenhuma molécula não sourced).

## 24. Testes alterados

`src/tests/guideline-class-validation-27-1.test.ts` — 1 teste (item ICC·9) alterado: a asserção de que "SGLT2 NÃO está em `CONDITION_CLASS_KEYS['icc']`" foi invertida para "SGLT2 PASSOU a estar", pois essa era exatamente a limitação que o RM-27.1 documentou como pendente e que o RM-28 corrige. **Razão:** o comportamento anterior (SGLT2 ausente de ICC) não estava incorreto no RM-27.1 — era uma limitação de escopo documentada, deliberadamente não corrigida naquele RM. O RM-28 a corrige dentro do seu próprio escopo (RM-25.1/cobertura), então o teste foi atualizado para refletir o novo comportamento correto, com a razão registrada no próprio teste e nesta seção. **Fonte:** DAPA-HF (McMurray 2019), EMPEROR-Reduced (Packer 2020), ESC 2021 HF Guidelines.

## 25. Resultado de todos os gates

| Verificação | Resultado |
|---|---|
| `tsc --noEmit` | ✅ limpo |
| `npm run lint` | ✅ 0 violações |
| `npx vitest run` | ✅ **277/277** (245 pré-existentes, 1 asserção ajustada intencionalmente + 32 novos) |
| `npx vitest run --coverage` | ✅ sem violação de meta |
| RM-23 (via `npm run build`) | ✅ 358 entidades, 0 crítico/alto |
| RM-24 (via `npm run build`) | ✅ 365 analisados, 0 crítico, publicação liberada |
| `npm run build` | ✅ compilado, 50 rotas |

## 26. Próximos pontos de sourcing

- Avaliar extensão do papel `prognostic_modifier` de iSGLT2 para IC-FEp/IC-FElr quando/se a base canônica incorporar referências específicas (ex.: EMPEROR-Preserved, DELIVER) — não implementado nesta entrega.
- Avaliar se há outras classes/moléculas na base canônica com indicação própria para IC ainda não descobertas em `CONDITION_CLASS_KEYS['icc']` (esta auditoria cobriu especificamente iSGLT2, conforme escopo do RM-28; uma varredura completa de todas as classes farmacológicas da base contra indicação de IC não foi realizada nesta entrega).
- Campo estruturado de FE/NYHA em `Anamnesis` — mudança de maior escopo, recomendada como RM futuro dedicado, não implementada aqui.

---

*HEART_FAILURE_THERAPEUTIC_COVERAGE_REPORT — gerado após implementação e validação completa (RM-28).*
