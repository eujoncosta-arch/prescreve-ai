// ============================================================
// RM-87 — Pré-preenchimento de /comparador a partir da consulta ativa
//
// Extrai, como função pura e testável (mesmo padrão da RM-65 em
// explicabilidade-context.ts), a decisão de QUAIS duas moléculas
// pré-selecionar no comparador quando há uma consulta em atendimento.
// Nunca cria dado novo: só mapeia `plano_terapeutico.farmacologico`
// (já calculado pelo motor real de terapêutica, RM-26) contra o
// catálogo do comparador (`MOLECULES_DB`) por nome exato de molécula
// (DCI) — nunca por substring, para não casar "Valsartana" com a
// combinação "Sacubitril + Valsartana".
//
// RM-88: `resolverPreenchimentoComparador` é genérica sobre o tipo do
// catálogo (em vez de importar `MoleculaComparavel` de `drug-comparator`)
// porque esse módulo está na lista restrita do guard RM-06
// (`no-restricted-imports`, `src/lib/**` novo não entra na allowlist —
// só `src/app/comparador/page.tsx`, que já lê o catálogo diretamente).
// Função genérica evita o import proibido sem duplicar o tipo.
// ============================================================

import type { Consultation, TherapeuticSuggestion } from './types';

export type FonteComparador = 'consulta_ativa' | 'nenhuma';

export interface PreenchimentoComparador<T> {
  molA: T | null;
  molB: T | null;
  fonte: FonteComparador;
}

function normalize(s: string): string {
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

/**
 * Ordena sugestões terapêuticas por prioridade clínica real (RM-26) —
 * `preferencial` antes de `primeira_linha` antes de `contextual`. Sem
 * prioridade classificada vai para o fim, nunca para o início (nunca
 * finge uma prioridade que o motor não calculou).
 */
function ordenarPorPrioridade(sugestoes: TherapeuticSuggestion[]): TherapeuticSuggestion[] {
  return [...sugestoes].sort((a, b) => {
    const pa = a.prioridade?.tier ? (PRIORIDADE_ORDEM[a.prioridade.tier] ?? 3) : 3;
    const pb = b.prioridade?.tier ? (PRIORIDADE_ORDEM[b.prioridade.tier] ?? 3) : 3;
    return pa - pb;
  });
}

/**
 * Resolve até duas moléculas do catálogo do comparador a partir do plano
 * terapêutico real da consulta ativa.
 *
 * Retorna no máximo 2 moléculas (A e B). Se só 1 sugestão do plano tiver
 * correspondência no catálogo do comparador, preenche só A — nunca
 * inventa uma segunda molécula para completar o par. Se nenhuma sugestão
 * corresponder (ex.: catálogo do comparador ainda não cobre a classe
 * terapêutica desta consulta), retorna `{ molA: null, molB: null, fonte:
 * 'nenhuma' }` — o comparador permanece exatamente como hoje, vazio,
 * para o médico escolher manualmente.
 */
export function resolverPreenchimentoComparador<T extends { id: string; molecula: string }>(
  activeConsultation: Consultation | null | undefined,
  moleculesDb: readonly T[],
): PreenchimentoComparador<T> {
  const sugestoes = activeConsultation?.plano_terapeutico?.farmacologico ?? [];
  if (sugestoes.length === 0) {
    return { molA: null, molB: null, fonte: 'nenhuma' };
  }

  const porNome = new Map(moleculesDb.map(m => [normalize(m.molecula), m]));
  const ordenadas = ordenarPorPrioridade(sugestoes);

  const encontradas: T[] = [];
  for (const s of ordenadas) {
    const match = porNome.get(normalize(s.molecula));
    if (match && !encontradas.some(m => m.id === match.id)) {
      encontradas.push(match);
    }
    if (encontradas.length === 2) break;
  }

  if (encontradas.length === 0) {
    return { molA: null, molB: null, fonte: 'nenhuma' };
  }

  return {
    molA: encontradas[0] ?? null,
    molB: encontradas[1] ?? null,
    fonte: 'consulta_ativa',
  };
}
