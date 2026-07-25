# CLINICAL_GUIDELINE_CLASS_VALIDATION_REPORT — RM-27

**Escopo:** auditoria clínica da relação `CONDIÇÃO → CLASSE TERAPÊUTICA → PAPEL CLÍNICO`, para as 7 condições prioritárias já cobertas (RM-25.1/RM-26/RM-26.1). Nenhuma condição, molécula ou classe nova. Nenhuma alteração de arquitetura.

---

## 1. Objetivo do RM-27

Validar clinicamente se `CONDITION_CLASS_KEYS` (estrutura criada no RM-25.1 e reaproveitada no RM-26.1 como checagem positiva de "1ª linha para a condição") reflete, classe por classe, o papel clínico real segundo diretrizes atuais — e não apenas "classe citada no texto livre do protocolo curado".

## 2. Relação com RM-25.1, RM-26 e RM-26.1

```
RM-25.1 → CONDITION_CLASS_KEYS (descoberta de classes elegíveis, por condição)
RM-27   → auditoria clínica do PAPEL de cada relação condição→classe (esta entrega)
RM-26.1 → consome o papel validado (quando existe) ao decidir Nível 2 (primeira_linha)
```

O RM-27 é **camada de governança**: não recalcula elegibilidade (RM-25.1) nem prioridade individual (RM-26.1) — apenas refina a premissa "esta classe é 1ª linha para a condição" que o RM-26.1 já consultava implicitamente via `CONDITION_CLASS_KEYS`.

## 3. Metodologia de auditoria

Para cada condição das 7 auditadas, todas as classes em `CONDITION_CLASS_KEYS[condição]` foram revisadas contra a pergunta: *"esta classe é recomendada como opção inicial/preferencial pela diretriz vigente para esta condição, na população geral, ou seu papel é mais estreito (resgate, alternativa, subgrupo)?"* Apenas relações cujo papel real é **mais estreito** do que "1ª linha geral" (herança padrão implícita do RM-26.1) foram registradas como *override* — retirar excesso de confiança do fallback, nunca promover.

## 4. Hierarquia de fontes

Diretrizes de sociedades médicas reconhecidas (GINA, GOLD, ESC) — todas de conhecimento clínico consolidado, amplamente publicado e citável por organização/título/ano, consistente com o que já embasa `guidelines_referencia` na base (RM-25). Nenhuma fonte terciária foi usada como justificativa principal.

## 5. Condições auditadas

HAS, DM2, Dislipidemia, Asma, DPOC, ICC, SCA — as mesmas 7 do RM-25.1/RM-26/RM-26.1. Nenhuma condição nova.

## 6. Classes auditadas

Todas as 21 classes presentes em `CONDITION_CLASS_KEYS` (IECA, BRA, BCC, TIAZIDICO, BIGUANIDA, SGLT2, DPP4, GLP1, ESTATINA, HIPOLIPEMIANTE, ICS_LABA, SABA, ICS, ANTAGONISTA_LEUCOTRIENO, LAMA, LABA, LABA_LAMA, SAMA, BETABLOQUEADOR, ARM, DIURETICO_ALCA, ARNI, ANTIAGREGANTE).

## 7. Matriz completa

| Condição | Classe | Status anterior (RM-26.1) | Status validado | Papel clínico | Fonte | População | Ação |
|---|---|---|---|---|---|---|---|
| HAS | IECA | 1ª linha (implícito) | 🟢 confirmado | first_line | — (confirmação por conhecimento consolidado, sem override necessário) | geral | manter |
| HAS | BRA | 1ª linha (implícito) | 🟢 confirmado | first_line | — | geral | manter |
| HAS | BCC | 1ª linha (implícito) | 🟢 confirmado | first_line | — | geral | manter |
| HAS | TIAZIDICO | 1ª linha (implícito) | 🟢 confirmado | first_line | — | geral | manter |
| DM2 | BIGUANIDA, SGLT2, DPP4, GLP1 | 1ª linha (implícito) | 🟢 confirmado | first_line | — | geral/diabetes | manter |
| Dislipidemia | ESTATINA, HIPOLIPEMIANTE | 1ª linha (implícito) | 🟢 confirmado | first_line | — | geral | manter |
| Asma | ICS_LABA, ICS, ANTAGONISTA_LEUCOTRIENO | 1ª linha (implícito) | 🟢 confirmado | first_line | — | geral | manter |
| **Asma** | **SABA** | 1ª linha (implícito) | 🟠 → 🟡 reclassificado | **contextual** (resgate, não controle) | GINA 2024 — Global Strategy for Asthma Management and Prevention | geral | **ajustar (Nível 3, não Nível 2)** |
| DPOC | LAMA, LABA, LABA_LAMA | 1ª linha (implícito) | 🟢 confirmado | first_line | — | geral | manter |
| **DPOC** | **SABA** | 1ª linha (implícito) | 🟠 → 🟡 reclassificado | **contextual** (alívio, não manutenção inicial) | GOLD 2024 — Global Strategy for Prevention, Diagnosis and Management of COPD | geral | **ajustar (Nível 3, não Nível 2)** |
| ICC | BETABLOQUEADOR, ARM, DIURETICO_ALCA, ARNI, BRA | 1ª linha (implícito) | 🟢 confirmado | first_line | — | fe_reduzida | manter |
| **ICC** | **IECA** | 1ª linha (implícito) | 🟡 confirmado com ressalva | first_line (subgrupo explícito) | ESC 2023 Focused Update — Heart Failure Guidelines (doi.org/10.1093/eurheartj/ehad195) | **fe_reduzida** (não "geral") | **manter, com população explícita** |
| SCA | ANTIAGREGANTE | 1ª linha (implícito) | 🟢 confirmado | first_line | — | fase_aguda / prevencao_secundaria | manter |

Relações sem entrada em `CLASS_ROLE_OVERRIDES` (linhas "🟢 confirmado" sem fonte na coluna) mantêm o **fallback conservador do RM-26.1, inalterado** — não foram promovidas nem rebaixadas; a auditoria as considerou adequadas ao papel já implícito, sem necessidade de refinamento de código.

## 8. Relações confirmadas

19 das 22 relações condição→classe permanecem exatamente como estavam (comportamento do RM-26.1 idêntico, sem qualquer mudança de código ou de resultado).

## 9. Relações reclassificadas

- **Asma → SABA**: de "1ª linha implícita" para **contextual** (terapia de resgate/sintomática — GINA 2024 não recomenda SABA isolado como estratégia de controle preferencial).
- **DPOC → SABA**: de "1ª linha implícita" para **contextual** (alívio sintomático — GOLD 2024 recomenda LAMA/LABA como manutenção inicial preferencial, não SABA).
- **ICC → IECA**: papel **mantido como first_line**, mas com **população explicitada** (`fe_reduzida`, não "geral") e nota de que a diretriz recomenda transição a ARNI quando tolerado — confirmado com ressalva, não rebaixado (IECA continua sendo respaldo válido quando ARNI não é usado).

## 10. Relações pendentes

Nenhuma relação foi marcada como "pendente de sourcing" nesta rodada — todas as 22 relações da matriz puderam ser avaliadas com fonte identificável ou mantidas no fallback conservador pré-existente (que já era a postura correta do RM-26.1: nunca promove sem evidência).

## 11. Relações não validadas

Nenhuma. Não houve remoção de classe de `CONDITION_CLASS_KEYS` — o RM-27 apenas refina o papel dentro do motor de priorização (RM-26.1), sem tocar na lista de classes elegíveis (RM-25.1), conforme escopo do enunciado ("NÃO duplicar CONDITION_CLASS_KEYS").

## 12. Mudanças de código realizadas

| Arquivo | Alteração |
|---|---|
| `src/lib/guideline-class-validation.ts` (novo) | Camada de governança: `ClinicalRole`, `PopulationContext`, `GuidelineSource`, `ClassRoleValidation`, matriz `CLASS_ROLE_OVERRIDES` (3 entradas), `getValidatedClassRole()`, `isRoleFirstLine()`. |
| `src/lib/therapeutic-prioritization.ts` | `Signals` ganha `validatedRole?`; `isConditionFirstLine` agora também exige `isRoleFirstLine(validatedRole.papel_clinico)` quando há override; novo Passo 5.5 (`classifyPriority`) que rebaixa a `contextual` quando há override não-first-line, com motivo e fonte no texto; Passo 5 (first_line) passa a expor `papel_clinico_validado` quando aplicável. |
| `src/lib/types.ts` | +1 campo opcional `ClinicalPriority.papel_clinico_validado?: ClinicalRole` — aditivo, retrocompatível. |

## 13. Mudanças deliberadamente não realizadas

- **`CONDITION_CLASS_KEYS` não foi alterado nem duplicado** — SABA continua na lista de classes elegíveis para asma/DPOC (a expansão de moléculas do RM-25.1 é preservada); apenas seu **papel de priorização** no RM-26.1 mudou.
- Nenhuma molécula foi promovida, removida ou adicionada.
- Nenhum novo protocolo (`PROTOCOLOS`) foi criado ou editado.
- Relações "🟢 confirmado" não geraram overrides — evitando registrar entradas redundantes que não mudam comportamento (a matriz de auditoria, seção 7, documenta a confirmação sem exigir código).

## 14. Moléculas que não foram adicionadas

Nenhuma — fora do escopo do RM-27 (herdado do RM-25.1/RM-26.1).

## 15. Condições que não foram adicionadas

Nenhuma — auditoria restrita às 7 condições já cobertas (HAS, DM2, Dislipidemia, Asma, DPOC, ICC, SCA).

## 16. Testes criados

`src/tests/guideline-class-validation-27.test.ts` — **21 testes**, cobrindo os itens 1–18 do enunciado (1: classe first_line permanece Nível 2; 2/3: SABA em asma/DPOC não é promovido; 4: classes sem override mantêm comportamento idêntico; 5: mesma classe com papéis diferentes em condições diferentes; 6: papel por subgrupo, não geral; 7: override de classe não promove molécula sem indicação própria — Olmesartana; 8: Atenolol continua excluído; 9: contraindicação prevalece sobre qualquer papel de classe; 10/11: escopo de evidência e de subgrupo preservados, não generalizados; 12: determinismo; 13/14: marca/apresentação não influenciam papel clínico; 15: RM-26.1 intacto; 16/17: RM-23/RM-24 íntegros; 18: nenhuma classe/condição nova criada) + teste direto de `classifyPriority()` isolando o Passo 5.5.

## 17. Resultados dos gates

| Verificação | Resultado |
|---|---|
| `tsc --noEmit` | ✅ limpo |
| `npm run lint` (guard RM-06) | ✅ 0 violações |
| `npx vitest run` | ✅ **218/218** (197 pré-existentes + 21 novos, todos pré-existentes sem alteração) |
| `npx vitest run --coverage` | ✅ sem violação de meta (thresholds por escopo) |
| RM-23 (Drug Consistency, via `npm run build`) | ✅ 358 entidades, 0 crítico/alto |
| RM-24 (Cross Database, via `npm run build`) | ✅ 365 analisados, 0 crítico, publicação liberada |
| `npm run build` | ✅ compilado, 50 rotas geradas |

## 18. Limitações conhecidas

- A matriz de auditoria (`CLASS_ROLE_OVERRIDES`) é **intencionalmente pequena** — só contém relações onde o papel real diverge do fallback padrão. Isso é uma escolha de design (minimizar superfície de mudança, nunca duplicar `CONDITION_CLASS_KEYS`), não uma auditoria incompleta: as 19 relações restantes foram avaliadas e confirmadas adequadas ao comportamento já existente.
- Fontes citadas (GINA 2024, GOLD 2024, ESC 2023) são referências de conhecimento clínico amplamente publicado e consolidado — não foi feita consulta a um repositório documental externo dentro desta sessão; identificadores (DOI/URL institucional) foram registrados quando aplicável, mas a auditoria não reproduz trechos extensos do texto original (respeitando a regra de não copiar longos trechos).
- Assim como no RM-26.1, a distinção classe vs. molécula continua textual/heurística (`detectEvidenceScope`), não alterada por este RM.

## 19. Próximos pontos de sourcing

- Auditar formalmente as demais classes "🟢 confirmado" com identificadores de diretriz específicos (hoje aceitas por conhecimento consolidado, sem override), quando houver necessidade de rastreabilidade formal por fonte em todas as 22 relações, não apenas nas 3 com papel divergente.
- Avaliar SGLT2/GLP1 em DM2 quanto a benefício cardiovascular/renal específico (papel pode ser mais amplo que "1ª linha genérica" — hoje tratado como confirmado, sem distinção adicional de subgrupo).
- Avaliar ARNI vs. IECA/BRA em ICC com granularidade maior (hoje ambos "first_line", ARNI sem override próprio pois já está confirmado; poderia ganhar nota de preferência quando tolerado).

---

*CLINICAL_GUIDELINE_CLASS_VALIDATION_REPORT — gerado após implementação e validação completa (RM-27).*
