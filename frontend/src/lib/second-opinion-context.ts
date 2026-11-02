// ============================================================
// RM-89 — Integração de /segunda-opiniao com a consulta ativa
//
// RM-60 registrou esta integração como esforço "médio-alto" porque
// "precisa de tabela de mapeamento classe-terapêutica → CondutaOpcao.id
// que não existe hoje". Investigação mostrou que essa tabela já existe,
// implícita: cada `CondutaOpcao.moleculas` já lista os nomes DCI reais
// (ex.: `['Enalapril', 'Ramipril', ...]`), no MESMO formato usado por
// `TherapeuticSuggestion.molecula` do motor real de terapêutica
// (`clinical-therapeutics.ts`). E cada `CondicaoClinica.cid10` já é o
// CID real. Mesmo padrão de descoberta das RM-87/RM-88: reusar um join
// key real já existente em vez de inventar uma tabela nova.
//
// Função pura e testável, mesmo padrão de `explicabilidade-context.ts`
// (RM-65) e `comparador-context.ts` (RM-87).
// ============================================================

import type { Consultation, TherapeuticSuggestion } from './types';
import type { CondicaoClinica } from './second-opinion';

export type FonteSegundaOpiniao = 'consulta_ativa' | 'nenhuma';

export interface PreenchimentoSegundaOpiniao {
  condicaoId: string | null;
  condutaId: string | null;
  fonte: FonteSegundaOpiniao;
}

function cidPrincipal(cid: string): string {
  return cid.split('.')[0].toUpperCase();
}

function normalizeMolecula(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

const PRIORIDADE_ORDEM: Record<string, number> = {
  preferencial: 0,
  primeira_linha: 1,
  contextual: 2,
};

/** Mesmo critério de ordenação por prioridade clínica real (RM-26) usado em `comparador-context.ts` (RM-87). */
function ordenarPorPrioridade(sugestoes: TherapeuticSuggestion[]): TherapeuticSuggestion[] {
  return [...sugestoes].sort((a, b) => {
    const pa = a.prioridade?.tier ? (PRIORIDADE_ORDEM[a.prioridade.tier] ?? 3) : 3;
    const pb = b.prioridade?.tier ? (PRIORIDADE_ORDEM[b.prioridade.tier] ?? 3) : 3;
    return pa - pb;
  });
}

/**
 * Resolve condição clínica + conduta escolhida para `/segunda-opiniao` a
 * partir da consulta ativa.
 *
 * 1. CID da consulta (`diagnostico_estruturado.cid`) casado contra
 *    `CondicaoClinica.cid10` — nenhuma condição reconhecida → `fonte:
 *    'nenhuma'`, página se comporta exatamente como antes desta RM.
 * 2. Dentro da condição encontrada, procura — por prioridade clínica real
 *    (RM-26), nunca pela ordem bruta do array — a primeira sugestão do
 *    plano terapêutico cujo nome de molécula bate exatamente (nome DCI
 *    normalizado, nunca substring) com alguma `CondutaOpcao.moleculas`.
 * 3. Condição reconhecida mas nenhuma molécula do plano mapeada entre as
 *    condutas cadastradas (ex.: classe terapêutica ainda não coberta por
 *    `second-opinion.ts`) → retorna só `condicaoId`, `condutaId: null`.
 *    Nunca inventa uma conduta para completar o fluxo — o médico escolhe
 *    manualmente a partir da condição já certa.
 */
export function resolverPreenchimentoSegundaOpiniao(
  activeConsultation: Consultation | null | undefined,
  condicoes: readonly CondicaoClinica[],
): PreenchimentoSegundaOpiniao {
  const cid = activeConsultation?.diagnostico_estruturado?.cid;
  if (!cid) {
    return { condicaoId: null, condutaId: null, fonte: 'nenhuma' };
  }

  const condicao = condicoes.find(c => c.cid10 === cidPrincipal(cid));
  if (!condicao) {
    return { condicaoId: null, condutaId: null, fonte: 'nenhuma' };
  }

  const sugestoes = activeConsultation?.plano_terapeutico?.farmacologico ?? [];
  const ordenadas = ordenarPorPrioridade(sugestoes);

  for (const s of ordenadas) {
    const molNorm = normalizeMolecula(s.molecula);
    const opcao = condicao.opcoes.find(o => o.moleculas.some(m => normalizeMolecula(m) === molNorm));
    if (opcao) {
      return { condicaoId: condicao.id, condutaId: opcao.id, fonte: 'consulta_ativa' };
    }
  }

  return { condicaoId: condicao.id, condutaId: null, fonte: 'consulta_ativa' };
}
