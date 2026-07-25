// ============================================================
// PRESCREVE-AI — RM-27: Validação Clínica das Relações Condição → Classe
//
// PROBLEMA: `CONDITION_CLASS_KEYS` (therapeutic-class-expansion.ts, criado no
// RM-25.1) define quais classes terapêuticas existem para cada condição, e o
// RM-26.1 usa essa MESMA lista como checagem positiva de "1ª linha para a
// condição" (Nível 2). Essa lista foi curada a partir do texto livre já
// existente em `alternativas` — nunca foi auditada, classe por classe, contra
// diretriz vigente para confirmar se o PAPEL CLÍNICO de cada classe é
// realmente "1ª linha" (vs. "alternativa", "contextual", "resgate").
//
// ESTE MÓDULO É UMA CAMADA DE GOVERNANÇA CLÍNICA, NÃO UM NOVO MOTOR DE
// PRIORIZAÇÃO:
//   - não substitui `therapeutic-prioritization.ts` (RM-26.1);
//   - não duplica `CONDITION_CLASS_KEYS` (reaproveita as mesmas chaves de
//     classe/condição já normalizadas no RM-25.1);
//   - não adiciona moléculas, condições ou classes novas;
//   - só REFINA o papel clínico de relações condição→classe já existentes,
//     com fonte explícita, quando há motivo clínico documentado para não
//     tratar a classe como "1ª linha geral" (ex.: terapia de resgate).
//
// REGRA DE OURO: se uma relação condição→classe não está listada abaixo com
// papel diferente de 'first_line', o comportamento do RM-26.1 permanece
// EXATAMENTE o mesmo de antes (fallback conservador — nunca inventa, nunca
// rebaixa sem fonte). Este módulo só pode DEGRADAR (nunca promover) o papel
// de uma classe, e apenas quando sourced.
// ============================================================

export type ClinicalRole =
  | 'first_line' // opção inicial/preferencial explícita da diretriz aplicável
  | 'recommended' // recomendada, mas não necessariamente escolha inicial
  | 'alternative' // uso em intolerância/contraindicação/falha/associação
  | 'contextual' // subgrupo ou situação específica (ex.: resgate, exacerbação)
  | 'not_first_line' // pode ter indicação, mas não deve ser tratada como 1ª linha
  | 'unsupported' // não deve ser expandida para a condição
  // RM-27.1 — papéis que refinam o OBJETIVO TERAPÊUTICO de uma classe que já
  // é recomendada/1ª linha para a condição (não a rebaixam de tier; apenas
  // tornam explícito POR QUE ela é recomendada, evitando que "1ª linha" seja
  // lido como "melhor opção universal" — ver isRoleFirstLine()).
  | 'cardiovascular_benefit' // benefício demonstrado além do controle glicêmico/pressórico: desfechos cardiovasculares
  | 'renal_benefit' // benefício demonstrado em desfechos renais (progressão de DRC)
  | 'weight_benefit' // benefício demonstrado em redução de peso corporal
  | 'prognostic_modifier' // reduz mortalidade/hospitalização — terapia modificadora da doença
  | 'congestion_control' // controla congestão/sintomas; sem benefício prognóstico comprovado
  | 'symptom_control'; // controla sintomas isoladamente, sem modificar prognóstico

export type PopulationContext =
  | 'geral'
  | 'idoso'
  | 'gestante'
  | 'drc'
  | 'diabetes'
  | 'fe_reduzida'
  | 'fe_preservada'
  | 'exacerbador_frequente'
  | 'fase_aguda'
  | 'prevencao_secundaria';

export interface GuidelineSource {
  organizacao: string;
  titulo: string;
  ano: number;
  versao?: string;
  identificador?: string; // DOI/URL/registro, quando aplicável
}

export interface ClassRoleValidation {
  conditionId: string;
  classKey: string;
  papel_clinico: ClinicalRole;
  populacao: PopulationContext[];
  contexto: string;
  fonte: GuidelineSource;
  /** Rótulo de validação da auditoria RM-27 — não é usado para lógica, só para o relatório/auditoria. */
  status_validacao: 'confirmado' | 'confirmado_com_ressalva' | 'reclassificado';
}

/**
 * Matriz de auditoria RM-27 — SOMENTE relações que precisam de um papel
 * clínico DIFERENTE do fallback padrão do RM-26.1 ('first_line' implícito
 * via `CONDITION_CLASS_KEYS`). Relações confirmadas como 1ª linha geral (sem
 * ressalva) NÃO precisam de entrada aqui — o comportamento já é correto.
 *
 * Cada entrada abaixo é uma classe cujo papel, na literatura consultada, é
 * mais estreito do que "1ª linha geral para a condição" — e por isso não deve
 * elevar automaticamente uma opção elegível ao Nível 2 (primeira_linha) sem
 * essa distinção ficar explícita no `motivo`.
 */
export const CLASS_ROLE_OVERRIDES: ClassRoleValidation[] = [
  // ── Asma — SABA é terapia de RESGATE, não terapia de controle/1ª linha ──
  {
    conditionId: 'asma',
    classKey: 'SABA',
    papel_clinico: 'contextual',
    populacao: ['geral'],
    contexto:
      'SABA (beta-2 agonista de curta ação) é terapia de resgate/sintomática (alívio agudo de broncoespasmo), não terapia de controle de base. A diretriz não recomenda SABA isolado como estratégia preferencial de manutenção — o pilar de controle é ICS (isolado ou associado a LABA/formoterol).',
    fonte: {
      organizacao: 'Global Initiative for Asthma (GINA)',
      titulo: 'Global Strategy for Asthma Management and Prevention',
      ano: 2024,
      identificador: 'ginasthma.org',
    },
    status_validacao: 'reclassificado',
  },
  // ── DPOC — SABA é terapia de alívio de sintomas, não terapia de manutenção inicial ──
  {
    conditionId: 'dpoc',
    classKey: 'SABA',
    papel_clinico: 'contextual',
    populacao: ['geral'],
    contexto:
      'SABA é broncodilatador de alívio (uso conforme necessidade), recomendado em todos os grupos GOLD como resgate, mas a terapia de manutenção inicial preferencial é broncodilatador de longa ação (LAMA/LABA), não SABA isolado.',
    fonte: {
      organizacao: 'Global Initiative for Chronic Obstructive Lung Disease (GOLD)',
      titulo: 'Global Strategy for Prevention, Diagnosis and Management of COPD',
      ano: 2024,
      identificador: 'goldcopd.org',
    },
    status_validacao: 'reclassificado',
  },
  // ── ICC — ARNI é preferencial sobre IECA/BRA quando tolerado (não são intercambiáveis simétricos) ──
  {
    conditionId: 'icc',
    classKey: 'IECA',
    papel_clinico: 'first_line',
    populacao: ['fe_reduzida'],
    contexto:
      'IECA permanece pilar terapêutico com benefício prognóstico estabelecido em IC-FEr. A diretriz recomenda a transição para ARNI quando tolerado (classe I), mas isso não retira o papel de 1ª linha do IECA como alternativa validada quando ARNI não é usado/disponível/tolerado — confirmado com ressalva de contexto (não superior a ARNI, mas ainda 1ª linha).',
    fonte: {
      organizacao: 'European Society of Cardiology (ESC)',
      titulo: '2023 Focused Update of the 2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure',
      ano: 2023,
      identificador: 'doi.org/10.1093/eurheartj/ehad195',
    },
    status_validacao: 'confirmado_com_ressalva',
  },

  // ════════════════════════════════════════════════════════════════════
  // RM-27.1 — DM2: distingue OBJETIVO TERAPÊUTICO dentro das classes já
  // reconhecidas como 1ª linha para a condição. Nenhuma classe é rebaixada
  // de tier — todas permanecem elegíveis ao Nível 2 (RM-26.1) — mas o papel
  // clínico e o motivo deixam de tratar "SGLT2 = GLP-1 = DPP-4 = biguanida"
  // como equivalentes, conforme ADA Standards of Care 2024 (Seção 9 —
  // Pharmacologic Approaches to Glycemic Treatment).
  // ════════════════════════════════════════════════════════════════════
  {
    conditionId: 'dm2',
    classKey: 'BIGUANIDA',
    papel_clinico: 'first_line',
    populacao: ['geral'],
    contexto:
      'Metformina permanece a terapia farmacológica inicial preferencial na maioria dos pacientes com DM2 (eficácia, segurança, custo, longa experiência clínica), associada a mudança de estilo de vida — não substituída pelas classes com benefício cardiorrenal específico quando não há ASCVD/IC/DRC.',
    fonte: {
      organizacao: 'American Diabetes Association (ADA)',
      titulo: 'Standards of Care in Diabetes — Section 9: Pharmacologic Approaches to Glycemic Treatment',
      ano: 2024,
      identificador: 'doi.org/10.2337/dc24-S009',
    },
    status_validacao: 'confirmado',
  },
  {
    conditionId: 'dm2',
    classKey: 'SGLT2',
    papel_clinico: 'renal_benefit',
    populacao: ['drc', 'diabetes'],
    contexto:
      'Inibidores de SGLT2 têm benefício demonstrado em desfechos renais (progressão de DRC, albuminúria) e também cardiovasculares (insuficiência cardíaca), e por isso a ADA recomenda seu uso PREFERENCIAL — independente da meta de HbA1c — em pacientes com DRC ou IC coexistente. Fora desse contexto, é uma opção de controle glicêmico entre outras, não uma "1ª linha universal superior".',
    fonte: {
      organizacao: 'American Diabetes Association (ADA)',
      titulo: 'Standards of Care in Diabetes — Section 9: Pharmacologic Approaches to Glycemic Treatment',
      ano: 2024,
      identificador: 'doi.org/10.2337/dc24-S009',
    },
    status_validacao: 'reclassificado',
  },
  {
    conditionId: 'dm2',
    classKey: 'GLP1',
    papel_clinico: 'cardiovascular_benefit',
    populacao: ['diabetes'],
    contexto:
      'Agonistas do receptor de GLP-1 têm benefício demonstrado em desfechos cardiovasculares maiores (MACE) em pacientes com doença cardiovascular aterosclerótica estabelecida, além de redução de peso relevante — a ADA recomenda uso PREFERENCIAL nesse subgrupo. Fora desse contexto, é uma opção de controle glicêmico com benefício ponderal, não uma "1ª linha universal superior" a outras classes.',
    fonte: {
      organizacao: 'American Diabetes Association (ADA)',
      titulo: 'Standards of Care in Diabetes — Section 9: Pharmacologic Approaches to Glycemic Treatment',
      ano: 2024,
      identificador: 'doi.org/10.2337/dc24-S009',
    },
    status_validacao: 'reclassificado',
  },
  {
    conditionId: 'dm2',
    classKey: 'DPP4',
    papel_clinico: 'first_line',
    populacao: ['geral', 'idoso'],
    contexto:
      'Inibidores de DPP-4 são bem tolerados, neutros em relação a peso e de baixo risco de hipoglicemia, mas SEM benefício cardiovascular ou renal comprovado em desfechos maiores (SAVOR-TIMI 53, EXAMINE, TECOS — resultados neutros). Não deve receber automaticamente o mesmo papel clínico de SGLT2/GLP-1 — é opção válida de controle glicêmico (útil, por ex., em idosos/risco de hipoglicemia), não uma classe com benefício cardiorrenal específico.',
    fonte: {
      organizacao: 'American Diabetes Association (ADA)',
      titulo: 'Standards of Care in Diabetes — Section 9: Pharmacologic Approaches to Glycemic Treatment',
      ano: 2024,
      identificador: 'doi.org/10.2337/dc24-S009',
    },
    status_validacao: 'confirmado',
  },

  // ════════════════════════════════════════════════════════════════════
  // RM-27.1 — ICC: distingue OBJETIVO TERAPÊUTICO dentro das classes já
  // reconhecidas como 1ª linha para IC-FEr. Nenhuma classe é rebaixada de
  // tier — mas "modificador de prognóstico" (reduz mortalidade/hospitalização)
  // não deve ser confundido com "controle de congestão/sintomas" (diurético
  // de alça), conforme ESC 2023/2021 Heart Failure Guidelines.
  //
  // LIMITAÇÃO DOCUMENTADA (RM-27.1, não corrigida nesta entrega): o modelo
  // atual (Anamnesis/EligibilityContext) não possui campo estruturado de
  // fração de ejeção (FE). A distinção FE reduzida/preservada/levemente
  // reduzida citada nas diretrizes é registrada aqui apenas como CONTEXTO
  // TEXTUAL da população-alvo da evidência (mesmo padrão já usado no RM-27
  // para IECA/ICC) — não é aplicada como filtro programático. Ver relatório,
  // seção "Limitações do modelo atual".
  // ════════════════════════════════════════════════════════════════════
  {
    conditionId: 'icc',
    classKey: 'ARNI',
    papel_clinico: 'prognostic_modifier',
    populacao: ['fe_reduzida'],
    contexto:
      'ARNI (sacubitril/valsartana) reduz mortalidade cardiovascular e hospitalização por IC em IC-FEr, com superioridade demonstrada sobre IECA no desfecho composto — recomendação Classe I preferencial quando tolerado. Terapia modificadora de prognóstico, não apenas controle sintomático.',
    fonte: {
      organizacao: 'European Society of Cardiology (ESC)',
      titulo: '2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure (PARADIGM-HF)',
      ano: 2021,
      identificador: 'doi.org/10.1093/eurheartj/ehab368',
    },
    status_validacao: 'confirmado',
  },
  {
    conditionId: 'icc',
    classKey: 'BRA',
    papel_clinico: 'prognostic_modifier',
    populacao: ['fe_reduzida'],
    contexto:
      'BRA (ex.: candesartana, valsartana) reduz mortalidade/hospitalização em IC-FEr (CHARM-Alternative, Val-HeFT) — terapia modificadora de prognóstico, usada preferencialmente como ALTERNATIVA quando IECA/ARNI não são tolerados (ex.: tosse, angioedema), não como substituto de rotina de IECA/ARNI quando estes são tolerados.',
    fonte: {
      organizacao: 'European Society of Cardiology (ESC)',
      titulo: '2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure',
      ano: 2021,
      identificador: 'doi.org/10.1093/eurheartj/ehab368',
    },
    status_validacao: 'confirmado',
  },
  {
    conditionId: 'icc',
    classKey: 'BETABLOQUEADOR',
    papel_clinico: 'prognostic_modifier',
    populacao: ['fe_reduzida'],
    contexto:
      'Betabloqueadores com evidência específica em IC-FEr (bisoprolol — CIBIS-II; succinato de metoprolol — MERIT-HF; carvedilol — COPERNICUS/US-Carvedilol) reduzem mortalidade — terapia modificadora de prognóstico. O benefício é de MOLÉCULA específica, não de toda a classe (ex.: atenolol não possui esse desfecho estudado em IC) — distinção já aplicada pelo RM-25.1 via indicação própria da molécula, não duplicada aqui.',
    fonte: {
      organizacao: 'European Society of Cardiology (ESC)',
      titulo: '2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure',
      ano: 2021,
      identificador: 'doi.org/10.1093/eurheartj/ehab368',
    },
    status_validacao: 'confirmado',
  },
  {
    conditionId: 'icc',
    classKey: 'ARM',
    papel_clinico: 'prognostic_modifier',
    populacao: ['fe_reduzida'],
    contexto:
      'Antagonistas da aldosterona (espironolactona — RALES; eplerenona — EMPHASIS-HF) reduzem mortalidade/hospitalização em IC-FEr sintomática — terapia modificadora de prognóstico, tipicamente adicionada a IECA/ARNI + betabloqueador.',
    fonte: {
      organizacao: 'European Society of Cardiology (ESC)',
      titulo: '2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure',
      ano: 2021,
      identificador: 'doi.org/10.1093/eurheartj/ehab368',
    },
    status_validacao: 'confirmado',
  },
  {
    conditionId: 'icc',
    classKey: 'DIURETICO_ALCA',
    papel_clinico: 'congestion_control',
    populacao: ['geral'],
    contexto:
      'Diuréticos de alça (furosemida) são recomendados (Classe I) para alívio de sinais/sintomas de congestão em IC, mas NÃO possuem evidência robusta de redução de mortalidade em ensaios randomizados — não devem ser apresentados como terapia modificadora de prognóstico equivalente a IECA/ARNI/betabloqueador/ARM/ARNI. Indicação e dose são guiadas pelo status volêmico, não pela fração de ejeção isoladamente.',
    fonte: {
      organizacao: 'European Society of Cardiology (ESC)',
      titulo: '2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure',
      ano: 2021,
      identificador: 'doi.org/10.1093/eurheartj/ehab368',
    },
    status_validacao: 'reclassificado',
  },
];

const overrideIndex = new Map<string, ClassRoleValidation>(
  CLASS_ROLE_OVERRIDES.map((v) => [`${v.conditionId}::${v.classKey}`, v]),
);

/**
 * Consulta o papel clínico validado (RM-27) de uma relação condição→classe.
 * Retorna `undefined` quando não há override auditado — nesse caso o
 * chamador (RM-26.1) deve manter o fallback conservador padrão (papel
 * implícito 'first_line' herdado de `CONDITION_CLASS_KEYS`), exatamente como
 * antes do RM-27.
 */
export function getValidatedClassRole(conditionId: string, classKey: string): ClassRoleValidation | undefined {
  return overrideIndex.get(`${conditionId}::${classKey}`);
}

/**
 * Papéis que NÃO devem elevar uma opção a "primeira linha para a condição"
 * (Nível 2) no RM-26.1. Os papéis de OBJETIVO TERAPÊUTICO introduzidos no
 * RM-27.1 ('cardiovascular_benefit', 'renal_benefit', 'weight_benefit',
 * 'prognostic_modifier', 'congestion_control', 'symptom_control') NÃO estão
 * neste conjunto — deliberadamente: são classes já reconhecidas como
 * recomendadas/1ª linha para a condição, apenas com o motivo clínico
 * explicitado. RM-27.1 refina o RÓTULO, não o TIER (ver relatório, seção
 * "Regras de prioridade").
 */
const NON_FIRST_LINE_ROLES: ReadonlySet<ClinicalRole> = new Set(['alternative', 'contextual', 'not_first_line', 'unsupported']);

export function isRoleFirstLine(role: ClinicalRole): boolean {
  return !NON_FIRST_LINE_ROLES.has(role);
}
