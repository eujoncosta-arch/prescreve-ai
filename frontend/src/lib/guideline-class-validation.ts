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
  | 'unsupported'; // não deve ser expandida para a condição

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
] as const;

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

/** Papéis que NÃO devem elevar uma opção a "primeira linha para a condição" (Nível 2) no RM-26.1. */
const NON_FIRST_LINE_ROLES: ReadonlySet<ClinicalRole> = new Set(['alternative', 'contextual', 'not_first_line', 'unsupported']);

export function isRoleFirstLine(role: ClinicalRole): boolean {
  return !NON_FIRST_LINE_ROLES.has(role);
}
