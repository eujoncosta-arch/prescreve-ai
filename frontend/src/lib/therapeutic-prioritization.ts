// ============================================================
// PRESCREVE-AI — RM-26 / RM-26.1: Priorização Clínica da Conduta Farmacológica
//
// PROBLEMA (RM-26): a expansão de cobertura (RM-25.1) tornou o sistema
// abrangente (ex.: HAS 2 → 15 opções), mas a ORDEM em que as opções aparecem
// é puramente estrutural — não reflete relevância clínica.
//
// LIMITAÇÃO DO RM-26 (corrigida no RM-26.1): o Nível 1 exigia
// comorbidade + diretriz estruturada SIMULTANEAMENTE, e o Nível 2 era apenas
// o "else" residual — sem checagem POSITIVA de que a molécula é reconhecida
// como 1ª linha PARA A CONDIÇÃO. Um paciente sem comorbidade específica
// via 100% das opções empilhadas sem essa distinção sendo tornada explícita.
//
// RM-26.1 introduz DOIS NÍVEIS de julgamento, explícitos e auditáveis:
//   A) PRIORIDADE DA CONDIÇÃO — a classe da molécula é uma das classes já
//      reconhecidas como elegíveis/1ª linha para esta condição
//      (CONDITION_CLASS_KEYS, reaproveitado de therapeutic-class-expansion.ts
//      — a mesma estrutura que já seleciona quais classes expandir).
//   B) PRIORIDADE INDIVIDUAL — a molécula tem uma vantagem ESPECÍFICA para
//      ESTE paciente (indicação própria cita a comorbidade real da anamnese).
//
// ESTE MÓDULO NÃO SUBSTITUI A ELEGIBILIDADE (isEligible/entityCoversCondition
// em therapeutic-class-expansion.ts continuam sendo o único portão de
// exclusão — Nível 4). Ele opera SOMENTE sobre o conjunto JÁ elegível e
// decide, de forma determinística e auditável, em qual dos 3 níveis cada
// opção entra:
//
//   Nível 1 — preferencial        (vantagem individual verificável p/ ESTE paciente)
//   Nível 2 — primeira_linha      (classe reconhecida como 1ª linha PARA A CONDIÇÃO)
//   Nível 3 — contextual          (requer monitoramento/ressalva — não é 1ª escolha)
//
// PRECEDÊNCIA (spec RM-26.1):
//   1) exclusão de segurança          → já resolvida a montante (RM-25.1)
//   2) elegibilidade/indicação        → já resolvida a montante (RM-25.1)
//   3) cautela clínica                → Nível 3
//   4) vantagem individual            → Nível 1
//   5) 1ª linha da condição           → Nível 2
//   6) fallback conservador           → Nível 2 (nunca inventa, nunca exclui aqui)
//
// Não é um score numérico opaco: é uma árvore de decisão determinística sobre
// sinais REAIS já existentes na DrugEntity/Anamnesis — nenhum peso inventado,
// nenhuma preferência comercial, nenhuma evidência fabricada.
// ============================================================

import { drugRepository } from './pharma-core';
import type { DrugEntity } from './pharma-core';
import type { TherapeuticSuggestion, TherapeuticPlan, ClinicalPriority, ClinicalPriorityTier, EvidenceScope } from './types';
import type { EligibilityContext } from './therapeutic-class-expansion';
import { classKeyOf, CONDITION_CLASS_KEYS } from './therapeutic-class-expansion';
import { getValidatedClassRole, isRoleFirstLine } from './guideline-class-validation';

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
  // RM-30: chave mais específica DEVE vir antes de 'has' — Object.entries().find()
  // retorna o primeiro match por ordem de inserção. Sem isso, "HAS resistente"
  // colapsaria para o sinônimo genérico de 'has' ("hipertensao"), que
  // combina com a indicação de QUALQUER anti-hipertensivo (falso positivo:
  // promoveria Irbesartana, Losartana etc. a Nível 1 só por o paciente ter
  // HAS resistente, quando a condição já tratada é a própria HAS).
  'has resistente': ['hipertensao resistente', 'resistente'],
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
  /** RM-26.1: escopo real da diretriz — 'molecula' quando o texto sourced cita um ensaio nomeado (ex.: "Estudo LIFE"); 'classe' quando é recomendação genérica da classe terapêutica. Nunca inferido além do texto real (RM-25). */
  evidenceScope?: EvidenceScope;
  /** RM-26.1: classe da molécula (canônica) pertence às classes já reconhecidas como elegíveis/1ª linha para esta condição (CONDITION_CLASS_KEYS), respeitando o papel validado pelo RM-27 quando houver. */
  isConditionFirstLine: boolean;
  /** RM-27: override de papel clínico auditado para esta relação condição→classe, quando existente. */
  validatedRole?: import('./guideline-class-validation').ClassRoleValidation;
  hasComorbidityMatch: string[]; // comorbidades (texto da anamnese) encontradas na indicação real da molécula
  cautionRenal?: string; // texto real do dosageRules renal quando há cautela (não contraindicação — essa já exclui)
  cautionHepatic?: string;
  nonBlockingInteractionsWithCurrentMeds: { with: string; severity: string }[]; // grave/moderada/leve — 'contraindicado' já é excluído antes
}

/** Detecta, no texto REAL das referências (RM-25), se há citação de ensaio clínico nomeado — sinal de evidência ESPECÍFICA DA MOLÉCULA, e não apenas da classe. Padrão: "Estudo <NOME>" ou "<NOME-TRIAL>" (ex.: "Estudo LIFE", "EMPA-REG", "HOPE"). Bounded e determinístico — não infere além do texto já sourced. */
function detectEvidenceScope(entity: DrugEntity): EvidenceScope | undefined {
  const texts = entity.references.filter((r) => r.type === 'GUIDELINE' || r.type === 'EVIDENCIA').map((r) => r.value);
  if (texts.length === 0) return undefined;
  const hasNamedTrial = texts.some((t) => /\bEstudo\s+[A-ZÀ-Ú][\w-]*/i.test(t) || /\b[A-Z]{3,}(-[A-Z0-9]+)?\b.*(Trial|Outcome)/i.test(t));
  return hasNamedTrial ? 'molecula' : 'classe';
}

function collectSignals(entity: DrugEntity, conditionId: string, ctx?: EligibilityContext): Signals {
  const hasStructuredGuideline = entity.references.some((r) => r.type === 'GUIDELINE');
  const evidenceScope = hasStructuredGuideline ? detectEvidenceScope(entity) : undefined;

  // RM-26.1 — Nível A: a classe canônica da molécula é uma das classes já
  // reconhecidas como elegíveis/1ª linha para esta condição (mesma estrutura
  // que já seleciona quais classes expandir no RM-25.1 — reaproveitada, não
  // duplicada).
  const classKey = classKeyOf(entity.therapeuticClass);
  const conditionClassKeys = CONDITION_CLASS_KEYS[conditionId] ?? [];
  // RM-27: quando a auditoria clínica validou um papel mais estreito que "1ª
  // linha geral" para esta relação condição→classe (ex.: SABA = resgate, não
  // controle), a checagem positiva do RM-26.1 respeita esse papel. Ausência
  // de override = comportamento idêntico ao RM-26.1 original (fallback
  // conservador, nunca inventa, nunca rebaixa sem fonte).
  const validatedRole = classKey ? getValidatedClassRole(conditionId, classKey) : undefined;
  const isConditionFirstLine =
    classKey !== null && conditionClassKeys.includes(classKey) && (!validatedRole || isRoleFirstLine(validatedRole.papel_clinico));

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

  return {
    hasStructuredGuideline,
    evidenceScope,
    isConditionFirstLine,
    validatedRole,
    hasComorbidityMatch,
    cautionRenal,
    cautionHepatic,
    nonBlockingInteractionsWithCurrentMeds,
  };
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
  const evidencia_escopo = s.evidenceScope;

  // ── Passo 3 (precedência) — cautela ativa → NÍVEL 3 ──────────────────────
  // Não é exclusão; é ressalva que desaconselha ser 1ª escolha para este paciente.
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
      evidencia_escopo,
    };
  }

  // ── Passo 4 (precedência) — vantagem individual → NÍVEL 1 ────────────────
  // Basta a indicação PRÓPRIA da molécula (dado real, sourced) citar a
  // comorbidade do paciente — essa é, por si só, a "característica clínica
  // individual verificável" exigida pelo RM-26.1. Uma diretriz GENÉRICA da
  // condição não é usada aqui (isso seria Nível 2); quando a diretriz também
  // é específica da molécula (evidencia_escopo === 'molecula'), isso reforça
  // a justificativa, mas não é pré-requisito.
  if (s.hasComorbidityMatch.length > 0) {
    fatores.push('comorbidade');
    if (s.hasStructuredGuideline) fatores.push('evidencia_diretriz');
    const reforco =
      evidencia_escopo === 'molecula'
        ? ' Há, adicionalmente, evidência específica da molécula (ensaio clínico nomeado).'
        : '';
    return {
      tier: 'preferencial',
      motivo: `Indicação registrada na base (dado real da molécula) cobre a(s) comorbidade(s) do paciente (${s.hasComorbidityMatch.join(', ')}) — vantagem clínica individual verificável.${reforco}`,
      fatores_considerados: fatores,
      evidencia_status,
      evidencia_escopo,
    };
  }

  // ── Passo 5 (precedência) — 1ª linha da condição → NÍVEL 2 ───────────────
  // Checagem POSITIVA: a classe canônica desta molécula é uma das classes já
  // reconhecidas como elegíveis/1ª linha para ESTA condição — não depende de
  // comorbidade alguma (correção da limitação do RM-26).
  if (s.isConditionFirstLine) {
    fatores.push('indicacao_condicao', 'classe_primeira_linha');
    if (s.hasStructuredGuideline) fatores.push('evidencia_diretriz');
    const escopoTexto =
      evidencia_escopo === 'classe'
        ? ' (diretriz de classe — não atribuída como evidência específica desta molécula)'
        : evidencia_escopo === 'molecula'
          ? ' (evidência específica desta molécula)'
          : '';
    // RM-27.1 — quando a auditoria clínica documenta um OBJETIVO TERAPÊUTICO
    // específico (ex.: benefício cardiovascular/renal/ponderal em DM2;
    // modificação de prognóstico vs. controle de congestão em ICC), o motivo
    // deixa isso explícito — evita que "1ª linha" seja lido como "melhor
    // opção universal" quando o papel real é mais específico que isso.
    const objetivoTexto = s.validatedRole ? ` Objetivo terapêutico documentado (RM-27.1): ${s.validatedRole.contexto}` : '';
    if (fatores.includes('classe_primeira_linha') && s.validatedRole) fatores.push('objetivo_terapeutico_rm27_1');
    return {
      tier: 'primeira_linha',
      motivo:
        (s.hasStructuredGuideline
          ? `Classe terapêutica reconhecida como opção de 1ª linha para esta condição, com diretriz estruturada${escopoTexto}; sem vantagem individual específica identificada para este paciente.`
          : 'Classe terapêutica reconhecida como opção de 1ª linha para esta condição; sem diretriz estruturada indexada para esta molécula na base (ausência de evidência não é contraindicação) e sem vantagem individual específica para este paciente.') +
        objetivoTexto,
      fatores_considerados: fatores,
      evidencia_status,
      evidencia_escopo,
      papel_clinico_validado: s.validatedRole?.papel_clinico,
    };
  }

  // ── Passo 5.5 (RM-27) — papel clínico validado mais estreito → NÍVEL 3 ───
  // A classe pertence a `CONDITION_CLASS_KEYS[condição]`, mas a auditoria
  // clínica (RM-27, `guideline-class-validation.ts`) documentou, com fonte,
  // que o papel real da classe para esta condição é mais estreito que "1ª
  // linha geral" (ex.: SABA é terapia de resgate em asma/DPOC — GINA/GOLD).
  // Isso nunca promove; só evita que o Nível 2 seja atribuído sem respaldo.
  if (s.validatedRole && !isRoleFirstLine(s.validatedRole.papel_clinico)) {
    fatores.push('papel_clinico_auditado_rm27');
    if (s.hasStructuredGuideline) fatores.push('evidencia_diretriz');
    return {
      tier: 'contextual',
      motivo: `Classe pertence às classes elegíveis para esta condição, porém a auditoria clínica (RM-27) documenta papel mais estreito que "1ª linha geral": ${s.validatedRole.contexto} Fonte: ${s.validatedRole.fonte.organizacao} — ${s.validatedRole.fonte.titulo} (${s.validatedRole.fonte.ano}).`,
      fatores_considerados: fatores,
      evidencia_status,
      evidencia_escopo,
      papel_clinico_validado: s.validatedRole.papel_clinico,
    };
  }

  // ── Passo 6 (precedência) — fallback conservador → NÍVEL 2 ───────────────
  // Elegível e indicado (já garantido a montante), mas a classe não pôde ser
  // resolvida para nenhuma classe-semente da condição (ex.: sugestão curada
  // com rótulo de classe fora do mapa). Nunca inventa, nunca promove, nunca
  // exclui aqui — mantém-se conservadoramente em primeira linha.
  fatores.push('indicacao_condicao');
  if (s.hasStructuredGuideline) fatores.push('evidencia_diretriz');
  return {
    tier: 'primeira_linha',
    motivo:
      'Clinicamente elegível e indicado; classe não mapeada às classes-semente desta condição na base — classificação conservadora mantida sem inventar destaque adicional.',
    fatores_considerados: fatores,
    evidencia_status,
    evidencia_escopo,
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

  // Ordenação determinística (RM-26.1): nível → evidência mais diretamente
  // aplicável (molécula > classe > ausente) → classe terapêutica → nome
  // (alfabético). Nunca usa ordem de inserção, de construção do banco ou de
  // marca/preferência comercial.
  const evidenceRank = (p: ClinicalPriority) =>
    p.evidencia_escopo === 'molecula' ? 0 : p.evidencia_status === 'diretriz_estruturada' ? 1 : 2;
  withPriority.sort((a, b) => {
    const t = TIER_ORDER[a.prioridade!.tier] - TIER_ORDER[b.prioridade!.tier];
    if (t !== 0) return t;
    const e = evidenceRank(a.prioridade!) - evidenceRank(b.prioridade!);
    if (e !== 0) return e;
    const c = a.classe_terapeutica.localeCompare(b.classe_terapeutica, 'pt-BR');
    if (c !== 0) return c;
    return a.molecula.localeCompare(b.molecula, 'pt-BR');
  });

  return { ...plan, farmacologico: withPriority };
}
