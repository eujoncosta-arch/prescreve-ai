# RM-102 — `doi_referencia` do CPIC (omeprazol/metoprolol) e afirmações da ADA 2026

**Origem:** item 3 do roadmap ("metoprolol/omeprazol CPIC sem `doi_referencia`; afirmações da ADA 2026 não verificadas").

## Parte A — Farmacogenômica (`precision-medicine.ts`)

### Omeprazol / CYP2C19 — corrigido e referenciado
- **Fonte:** CPIC Guideline for CYP2C19 and Proton Pump Inhibitor Dosing, Lima JJ et al., *Clin Pharmacol Ther* 2021;109(6):1417-1423,
  `10.1002/cpt.2015` (PubMed 32770672; DOI conferido no Crossref; tabela de recomendações lida no PMC7868475).
- **O que a CPIC diz:**
  - ultrarrápido → **aumentar a dose diária inicial em 100%** (opcional), pode fracionar;
  - rápido/normal → dose padrão; **considerar +50–100%** em H. pylori e esofagite erosiva;
  - intermediário/lento → dose padrão; em terapia crônica (> 12 semanas) com eficácia alcançada, **considerar −50%**;
  - **não recomenda trocar de IBP** para nenhum fenótipo.
- **O que o projeto dizia e estava errado:** ultrarrápido → "substituir por pantoprazol/dexlansoprazol" (ambos também dependem da CYP2C19, e a CPIC não
  recomenda a troca); rápido → "preferir pantoprazol"; lento → "exposição 10× maior" (sem fonte).
- **Mudou:** os cinco fenótipos agora seguem a CPIC, o "10×" saiu, o campo `alternativa` do ultrarrápido foi removido e `doi_referencia: '10.1002/cpt.2015'` foi adicionado.

### Metoprolol / CYP2D6 — corrigido pela CPIC de betabloqueadores
- **Correção de um erro meu:** numa primeira versão deste relatório afirmei que não existe diretriz CPIC para metoprolol. **Existe**: *CPIC Guideline for CYP2D6, ADRB1, ADRB2,
  ADRA2C, GRK4 and GRK5 Genotypes and Beta-Blocker Therapy*, Duarte JD et al., *Clin Pharmacol Ther* 2024, `10.1002/cpt.3351` (PMID 38951961; DOI conferido no Crossref; PDF aberto do CPIC lido).
- **O que a CPIC diz (Tabela 2):**
  - lento: AUC quase 5× maior e meia-vida > 2× maior; **iniciar com a menor dose inicial recomendada**, titular cuidadosamente até o efeito clínico ou a dose recomendada, monitorar mais de perto a bradicardia (recomendação moderada);
  - intermediário: concentrações aumentadas **sem mudança clinicamente significativa** de FC, PA ou desfechos → **dose padrão** (moderada);
  - normal: dose padrão; ultrarrápido: **sem recomendação** (evidência insuficiente).
- **Mudou:** os cinco fenótipos agora seguem a CPIC; "iniciar 12,5–25 mg" e "iniciar 25 mg" (sem fonte) saíram; o "5×" voltou, agora com fonte ("quase 5×"); o ultrarrápido deixou de "aumentar dose/frequência" (sem fonte);
  `doi_referencia: 10.1002/cpt.3351` adicionado.
- **DPWG:** busca secundária indica que o DPWG recomenda, para lentos, no máximo 25% da dose padrão (50% para intermediários) quando se deseja redução gradual da FC ou há bradicardia. Não consegui ler o texto do DPWG
  (página do ClinPGx renderizada por JavaScript e Bookshelf com reCAPTCHA), então **não usei** esses percentuais; a CPIC, lida na íntegra, foi a fonte adotada. As duas diretrizes divergem e a divergência não foi resolvida.

## Parte B — ADA 2026 (`guideline-updates.ts`, `guideline-conflict-engine.ts`)

**Fonte:** ADA, *Summary of Revisions: Standards of Care in Diabetes—2026*, `10.2337/dc26-SREV` (PDF oficial, texto extraído).

| Afirmação do projeto atribuída à "ADA 2026" | O que o Summary of Revisions registra |
|---|---|
| "GLP-1 RA como 1ª linha em DM2 + IMC ≥ 30, independente da HbA1c; Classe I; metformina adjuvante" | **Não consta.** Há revisões de GLP-1 RA/dual GIP–GLP-1 RA em ICFEp (Rec. 9.9a/b) e MASH (9.12, 9.13a), e dose individualizada na obesidade (8.20). A ADA usa graus A/B/C/E, não "Classe I" |
| "MCG recomendada para todos DM2 em insulina (Classe I)" | **Rec. 9.25:** MCG desde o diagnóstico e a qualquer momento em adultos em insulina, em terapias não insulínicas que causam hipoglicemia e em qualquer tratamento em que ajude. **Rec. 9.27:** AID oferecido a todos os adultos com DM1/DM2 em insulina |
| "Metas de HbA1c: 6,5–7% jovens, 7–8% idosos, 8–8,5% frágeis; não tratar < 6,5%" | **Nenhuma mudança de alvo de HbA1c.** A Figura 6.1 foi ampliada com metas individualizadas de **métricas de MCG** |
| "iSGLT2 mandatório em DM2 + DRC (TFG 20–45); finerenona como 3ª opção" | **Rec. 11.11a:** iSGLT2 em quem não está em diálise para reduzir progressão da DRC. **Rec. 11.9 (nova):** início simultâneo de iSGLT2 e nsMRA pode ser considerado se RAC ≥ 100 mg/g e TFGe 30–90 sob inibidor do SRAA |

- **`guideline-updates.ts`:** `resumo_executivo` e as três mudanças reescritos com as revisões reais (cada uma com o número da recomendação). As evidências verificadas na
  RM-96 (SELECT, SURMOUNT-2, SURPASS-CVOT, Jancev, MOBILE, ACCORD) foram **mantidas**, mas a justificativa agora diz que são **contexto**, e que o resumo da ADA não as cita.
- **`guideline-conflict-engine.ts`:** as quatro posições da ADA 2026 e o `resumo`/`recomendacao_pratica` associados foram reescritos. O conflito "ADA × SBD" sobre GLP-1 como 1ª linha **deixa de ter base**; o
  `grau_conflito: 'divergencia_moderada'` desse item não foi alterado e merece revisão.

### Limites
- O Summary of Revisions lista **o que mudou**, não o texto integral de cada recomendação nem o grau (A/B/C/E). Os campos `nivel`/`grau` do motor de conflito são normalizados pelo projeto, não graus da ADA.
- Não conferi as posições de EASD 2023, SBD 2024, KDIGO 2024 e ESC/EASD 2023 nesses mesmos itens; só a ADA foi auditada.
- A ADA 2026 não foi lida nas seções completas; o conteúdo vem do resumo oficial de revisões.

## Testes

- **Novo** `rm102-cpic-ibp-e-ada-2026-verificados.test.ts` (12 testes): omeprazol (DOI, +100%, sem troca de IBP, +50–100% só em H. pylori/esofagite, −50% após 12 semanas, sem "10×"); metoprolol (DOI da CPIC de betabloqueadores, lento = menor dose inicial, intermediário = dose padrão, ultrarrápido sem recomendação);
  ADA (cita o `dc26-SREV`, sem "Classe I"/"1ª linha independente", sem metas 6,5–7%, evidências da RM-96 preservadas, motor de conflito sem "mandatório"/"8–8,5%").

## Gates

Mesmos da [RM-100](RM-100-AMOXICILINA-CLAVULANATO-POSOLOGIA-POR-APRESENTACAO.md): tsc limpo, lint 0, **82 arquivos / 1379 testes**, build 50/50.

---

Commit `a0110f2` (RM-100/101/102) enviado ao `main`; deploy automático na Vercel.
