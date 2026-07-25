// ============================================================
// PRESCREVE-AI — RM-26: Priorização Clínica da Conduta Farmacológica
//
// PROBLEMA: a expansão de cobertura (RM-25.1 / therapeutic-class-expansion.ts)
// tornou o sistema abrangente (ex.: HAS 2 → 15 opções), mas a ORDEM em que as
// opções aparecem é puramente estrutural (ordem de escrita do protocolo +
// ordem de iteração do drugRepository) — não reflete relevância clínica para
// o paciente específico.
//
// ESTE MÓDULO NÃO SUBSTITUI A ELEGIBILIDADE (isEligible/entityCoversCondition
// em therapeutic-class-expansion.ts continuam sendo o único portão de
// exclusão — Nível 4). Ele opera SOMENTE sobre o conjunto JÁ elegível e
// decide, de forma determinística e auditável, em qual dos 3 níveis cada
// opção entra:
//
//   Nível 1 — preferencial        (maior adequação a ESTE paciente)
//   Nível 2 — primeira_linha      (clinicamente apropriado, sem destaque específico)
//   Nível 3 — contextual          (requer monitoramento/ressalva — não é 1ª escolha)
//
// Não é um score numérico opaco: é uma árvore de decisão determinística sobre
// sinais REAIS já existentes na DrugEntity/Anamnesis — nenhum peso inventado,
// nenhuma preferência comercial, nenhuma evidência fabricada.
// ============================================================

import { drugRepository } from './pharma-core';
import type { DrugEntity } from './pharma-core';
import type { TherapeuticSuggestion, TherapeuticPlan, ClinicalPriority, ClinicalPriorityTier } from './types';
import type { EligibilityContext } from './therapeutic-class-expansion';

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Sinônimos/abreviações de comorbidade — normalização terminológica (não
// julgamento clínico novo): "DRC" e "nefropatia diabética" são a mesma
// condição em textos diferentes já presentes na própria base canônica.
// Tabela bounded, auditável, restrita a abreviações padrão da prática BR.
const COMORBIDITY_SYNONYMS: Record<string, string[]> = {
  drc: ['doenca renal cronica', 'nefropatia', 'insuficiencia renal cronica', 'nefropatia diabetica'],
  dm2: ['diabetes', 'diabetes mellitus', 'diabetes mellitus tipo 2', 'dm2'],
  dm: ['diabetes'],
  'ic': ['insuficiencia cardiaca', 'ic-fer', 'icfer'],
  icc: ['insuficiencia cardiaca', 'ic-fer'],
  has: ['hipertensao'],
  dpoc: ['doenca pulmonar obstrutiva cronica'],
  iam: ['infarto', 'pos-iam', 'sca', 'coronariana'],
  dislipidemia: ['ldl', 'colesterol', 'aterosclerose'],
};

/** Todas as formas (termo original + sinônimos conhecidos) para checagem contra o texto de indicação. */
function expandComorbidityTerms(comorbidade: string): string[] {
  const n = normalize(comorbidade);
  const hit = Object.entries(COMORBIDITY_SYNONYMS).find(([k]) => n.includes(k));
  return hit ? [n, ...hit[1]] : [n];
}

/** Resolve a DrugEntity canônica de uma sugestão (âncora curada OU molécula expandida) pela DCB — salt-agnóstico via drugRepository. */
function resolveEntity(sug: TherapeuticSuggestion): DrugEntity | undefined {
  return drugRepository.getById(sug.id) ?? drugRepository.getByActiveIngredient(sug.molecula)[0];
}

// ─── Sinais determinísticos (todos lidos de dados reais, nada inventado) ────

interface Signals {
  hasStructuredGuideline: boolean;
  hasComorbidityMatch: string[]; // comorbidades (texto da anamnese) encontradas na indicação real da molécula
  cautionRenal?: string; // texto real do dosageRules renal quando há cautela (não contraindicação — essa já exclui)
  cautionHepatic?: string;
  nonBlockingInteractionsWithCurrentMeds: { with: string; severity: string }[]; // grave/moderada/leve — 'contraindicado' já é excluído antes
}

function collectSignals(entity: DrugEntity, conditionId: string, ctx?: EligibilityContext): Signals {
  const hasStructuredGuideline = entity.references.some((r) => r.type === 'GUIDELINE');

  const comorbidades = ctx?.comorbidades ?? [];
  const indicacoesTexto = normalize(entity.indications.join(' | '));
  const hasComorbidityMatch = comorbidades.filter(
    (c) => c.trim().length > 2 && expandComorbidityTerms(c).some((term) => indicacoesTexto.includes(term)),
  );

  let cautionRenal: string | undefined;
  if (ctx?.tfg !== undefined) {
    const renal = entity.dosageRules.find((r) => r.population === 'renal');
    const detail = renal?.detail as Record<string, string> | undefined;
    const bracket = ctx.tfg < 15 ? detail?.tfg_lt_15 : ctx.tfg < 30 ? detail?.tfg_30_15 : ctx.tfg < 60 ? detail?.tfg_60_30 : undefined;
    if (bracket && /cautela|reduzir|monitor|ajust/i.test(bracket) && !/contraindicad/i.test(bracket)) {
      cautionRenal = bracket;
    }
  }

  let cautionHepatic: string | undefined;
  if (ctx?.childPugh) {
    const hep = entity.dosageRules.find((r) => r.population === 'hepatico');
    const detail = hep?.detail as Record<string, string> | undefined;
    const key = ctx.childPugh === 'A' ? 'child_a' : ctx.childPugh === 'B' ? 'child_b' : 'child_c';
    const v = detail?.[key];
    if (v && /cautela|reduzir|monitor|ajust/i.test(v) && !/contraindicad/i.test(v)) {
      cautionHepatic = v;
    }
  }

  const emUso = (ctx?.medicamentosEmUso ?? []).map(normalize);
  const nonBlockingInteractionsWithCurrentMeds = entity.interactions.filter(
    (i) => i.severity !== 'contraindicado' && emUso.some((m) => m.includes(normalize(i.with)) || normalize(i.with).includes(m)),
  );

  return { hasStructuredGuideline, hasComorbidityMatch, cautionRenal, cautionHepatic, nonBlockingInteractionsWithCurrentMeds };
}

/**
 * Classifica uma sugestão já elegível em um dos 3 níveis de prioridade.
 * Árvore de decisão determinística — não numérica, não opaca:
 *
 *   1) Cautela ativa (renal/hepática) OU interação não-bloqueante com
 *      medicação em uso  → NÍVEL 3 (contextual — requer ressalva/monitoramento)
 *   2) Benefício de comorbidade sourced (indicação própria cita a
 *      comorbidade do paciente) E diretriz estruturada → NÍVEL 1 (preferencial)
 *   3) Caso contrário, elegível e indicado → NÍVEL 2 (primeira linha)
 *
 * A AUSÊNCIA de diretriz estruturada nunca rebaixa para exclusão nem eleva
 * a preferencial — molécula sem GUIDELINE fica, no máximo, em primeira linha.
 */
export function classifyPriority(
  sug: TherapeuticSuggestion,
  conditionId: string,
  ctx?: EligibilityContext,
): ClinicalPriority {
  const entity = resolveEntity(sug);
  const fatores: string[] = [];

  if (!entity) {
    // Sugestão curada sem correspondência na base canônica (não deveria ocorrer
    // hoje, mas é tratada com segurança): mantém-se em primeira linha, nunca
    // promovida sem evidência verificável.
    return {
      tier: 'primeira_linha',
      motivo: 'Sugestão curada no protocolo clínico; sem correspondência direta na base canônica para sinais adicionais.',
      fatores_considerados: ['protocolo_curado'],
      evidencia_status: 'sem_diretriz_estruturada',
    };
  }

  const s = collectSignals(entity, conditionId, ctx);
  const evidencia_status: ClinicalPriority['evidencia_status'] = s.hasStructuredGuideline
    ? 'diretriz_estruturada'
    : 'sem_diretriz_estruturada';

  // Nível 3 — cautela ativa (não é exclusão; é ressalva que desaconselha ser 1ª escolha)
  const cautelas: string[] = [];
  if (s.cautionRenal) cautelas.push(`função renal (${s.cautionRenal})`);
  if (s.cautionHepatic) cautelas.push(`função hepática (${s.cautionHepatic})`);
  if (s.nonBlockingInteractionsWithCurrentMeds.length) {
    cautelas.push(
      `interação (${s.nonBlockingInteractionsWithCurrentMeds.map((i) => `${i.with}: ${i.severity}`).join('; ')}) com medicação em uso`,
    );
  }
  if (cautelas.length > 0) {
    return {
      tier: 'contextual',
      motivo: `Elegível, porém requer monitoramento/ressalva: ${cautelas.join('; ')}.`,
      fatores_considerados: ['funcao_renal', 'funcao_hepatica', 'medicamentos_em_uso'].filter((_, i) =>
        [!!s.cautionRenal, !!s.cautionHepatic, s.nonBlockingInteractionsWithCurrentMeds.length > 0][i],
      ),
      evidencia_status,
    };
  }

  // Nível 1 — indicação própria cita a comorbidade do paciente E há diretriz estruturada
  if (s.hasComorbidityMatch.length > 0 && s.hasStructuredGuideline) {
    fatores.push('comorbidade', 'evidencia_diretriz');
    return {
      tier: 'preferencial',
      motivo: `Indicação registrada na base cobre a(s) comorbidade(s) do paciente (${s.hasComorbidityMatch.join(', ')}) e há diretriz estruturada respaldando a classe.`,
      fatores_considerados: fatores,
      evidencia_status,
    };
  }

  // Nível 2 — elegível, indicado para a condição, sem destaque específico deste paciente
  fatores.push('indicacao_condicao');
  if (s.hasStructuredGuideline) fatores.push('evidencia_diretriz');
  return {
    tier: 'primeira_linha',
    motivo: s.hasStructuredGuideline
      ? 'Clinicamente apropriado e respaldado por diretriz estruturada; sem fator específico deste paciente que o destaque como preferencial.'
      : 'Clinicamente apropriado e elegível; sem diretriz estruturada indexada para esta molécula na base (ausência de evidência não é contraindicação).',
    fatores_considerados: fatores,
    evidencia_status,
  };
}

const TIER_ORDER: Record<ClinicalPriorityTier, number> = { preferencial: 0, primeira_linha: 1, contextual: 2 };

/**
 * Prioriza `plan.farmacologico` (todas as opções elegíveis — âncoras curadas +
 * expansão) e reordena de forma DETERMINÍSTICA por nível. Nunca remove uma
 * opção elegível; nunca move uma opção para fora do array por causa de
 * prioridade (só a elegibilidade, em outra camada, remove).
 */
export function prioritizeTherapeuticPlan(
  plan: TherapeuticPlan,
  conditionId: string,
  ctx?: EligibilityContext,
): TherapeuticPlan {
  const withPriority = plan.farmacologico.map((sug) => ({
    ...sug,
    prioridade: classifyPriority(sug, conditionId, ctx),
  }));

  // Ordenação determinística: nível → tem diretriz estruturada primeiro → nome (alfabético).
  withPriority.sort((a, b) => {
    const t = TIER_ORDER[a.prioridade!.tier] - TIER_ORDER[b.prioridade!.tier];
    if (t !== 0) return t;
    const e =
      Number(b.prioridade!.evidencia_status === 'diretriz_estruturada') -
      Number(a.prioridade!.evidencia_status === 'diretriz_estruturada');
    if (e !== 0) return e;
    return a.molecula.localeCompare(b.molecula, 'pt-BR');
  });

  return { ...plan, farmacologico: withPriority };
}
