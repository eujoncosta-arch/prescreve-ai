// ============================================================
// PRESCREVE-AI — RM-46-01/02: nunca disfarçar erro de motor clínico de
// "sem risco"/"sem conflito"
//
// PROBLEMA CONFIRMADO: `frontend/src/app/consulta/nova/page.tsx` chamava
// `avaliarRiscoClinico`/`detectarConflitos` dentro de um `try { ... }
// catch { return null / [] }`. Se o motor lançasse uma exceção (bug
// interno, formato de dado inesperado), o resultado era EXATAMENTE o
// mesmo que "anamnese incompleta" (risco) ou "nenhum conflito encontrado"
// (conflitos) — a UI mostrava um card VERDE afirmando "as principais
// sociedades científicas apresentam concordância" quando, na verdade, a
// checagem nunca terminou de rodar. Isso é fallback clínico silencioso:
// uma falha de cálculo virava uma afirmação de segurança positiva.
//
// CORREÇÃO: as duas chamadas passam a retornar um resultado de 3
// estados — dado ausente / erro no motor / resultado calculado — nunca
// mais colapsados no mesmo `null`/`[]`. Extraído para este módulo (em
// vez de inline no componente) para ser testável sem depender de
// renderização de componente (não há testing-library neste projeto).
// ============================================================

import { avaliarRiscoClinico, type AvaliacaoRiscoClinico } from './clinical-risk-engine';
import { detectarConflitos, type ConflitoGuideline } from './guideline-conflict-engine';
import type { Anamnesis, TherapeuticSuggestion } from './types';

export type RiscoClinicoResultado =
  | { status: 'sem_anamnese' }
  | { status: 'erro' }
  | { status: 'ok'; dados: AvaliacaoRiscoClinico };

/**
 * Avalia o risco clínico com tratamento de erro EXPLÍCITO — nunca
 * retorna o mesmo formato para "dado ausente" e "o motor quebrou".
 */
export function avaliarRiscoSeguro(
  anamnese: Anamnesis | undefined | null,
  suggestions: TherapeuticSuggestion[],
): RiscoClinicoResultado {
  if (!anamnese) return { status: 'sem_anamnese' };
  try {
    return { status: 'ok', dados: avaliarRiscoClinico(anamnese, suggestions) };
  } catch {
    return { status: 'erro' };
  }
}

export type ConflitosGuidelineResultado =
  | { status: 'ok'; dados: ConflitoGuideline[] }
  | { status: 'erro' };

/**
 * Detecta conflitos entre diretrizes com tratamento de erro EXPLÍCITO —
 * "nenhum diagnóstico selecionado ainda" (lista vazia, real) nunca é
 * confundido com "o motor de detecção lançou uma exceção".
 */
export function avaliarConflitosSeguro(diagnosticoId: string): ConflitosGuidelineResultado {
  if (!diagnosticoId) return { status: 'ok', dados: [] };
  try {
    return { status: 'ok', dados: detectarConflitos(diagnosticoId) };
  } catch {
    return { status: 'erro' };
  }
}
