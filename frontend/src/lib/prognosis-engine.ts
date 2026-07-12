// ============================================================
// PRESCREVE-AI — Prognosis Engine (Phase 12 · Module 5)
// Predição de desfechos 30d / 6m / 1a / 5a baseada em perfil clínico
// NOTA: arquivo distinto de prognostic-engine.ts (scores de risco)
// ============================================================

'use client';

// ══════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════

export type HorizontePrognostico = '30d' | '6m' | '1a' | '5a';

export interface PerfilPrognostico {
  cid: string;
  idade: number;
  sexo: 'M' | 'F';
  comorbidades: string[];
  classe_nyha?: 1 | 2 | 3 | 4;    // IC
  fev1_pct?: number;               // DPOC
  pa_sistolica?: number;
  hba1c?: number;
  creatinina?: number;
  albumina?: number;
  internacoes_12m?: number;
  score_risco_base?: number;       // 0–100
}

export interface ProbabiidadeEvento {
  evento: string;
  probabilidade_pct: number;      // 0–100
  intervalo_confianca: [number, number];
  nivel_confianca: 'alta' | 'moderada' | 'baixa';
  fatores_contribuintes: string[];
}

export interface Prognostico {
  id: string;
  perfil: PerfilPrognostico;
  horizonte: HorizontePrognostico;

  eventos: ProbabiidadeEvento[];

  // Desfechos primários
  probabilidade_sobrevida: number;           // 0–100
  probabilidade_evento_maior: number;        // MACE, exacerbação grave etc.
  probabilidade_internacao: number;

  // Score global
  score_gravidade: number;                   // 0–100
  classe_prognostico: 'bom' | 'intermediario' | 'reservado' | 'grave';

  // Fatores modificáveis
  fatores_modificaveis: string[];
  potencial_melhora_pct: number;             // 0–50 — ganho estimado com otimização

  alertas: string[];
  gerado_em: string;
}

export interface CurvaRisco {
  cid: string;
  horizonte_meses: number[];
  sobrevida_pct: number[];
  evento_pct: number[];
}

// ══════════════════════════════════════════════════════════════
// MODELOS PARAMÉTRICOS (simplificados — baseados em coeficientes publicados)
// ══════════════════════════════════════════════════════════════

const COEF: Record<string, Record<string, number>> = {
  I10: { base: 0.02, idade: 0.008, comorbidades: 0.04, pa_alta: 0.015 },
  E11: { base: 0.04, idade: 0.009, comorbidades: 0.05, hba1c: 0.012 },
  I50: { base: 0.12, idade: 0.012, comorbidades: 0.06, nyha: 0.08 },
  J45: { base: 0.01, idade: 0.003, comorbidades: 0.02 },
  J44: { base: 0.08, idade: 0.015, comorbidades: 0.05, fev1: -0.002 },
  DEFAULT: { base: 0.03, idade: 0.008, comorbidades: 0.03 },
};

function lambda(perfil: PerfilPrognostico): number {
  const c = COEF[perfil.cid] ?? COEF.DEFAULT;
  let h = c.base;
  h += c.idade * Math.max(0, perfil.idade - 40) / 10;
  h += c.comorbidades * (perfil.comorbidades.length - 1);
  if (c.pa_alta && perfil.pa_sistolica && perfil.pa_sistolica > 160) h += c.pa_alta;
  if (c.hba1c && perfil.hba1c && perfil.hba1c > 9) h += c.hba1c;
  if (c.nyha && perfil.classe_nyha) h += c.nyha * (perfil.classe_nyha - 1);
  if (c.fev1 && perfil.fev1_pct) h += c.fev1 * (100 - perfil.fev1_pct);
  if (perfil.internacoes_12m && perfil.internacoes_12m > 1) h += 0.04 * perfil.internacoes_12m;
  return Math.min(h, 0.9);
}

function survivorFunc(lam: number, horizonte: HorizontePrognostico): number {
  const dias = horizonte === '30d' ? 30 : horizonte === '6m' ? 180 : horizonte === '1a' ? 365 : 1825;
  const anos = dias / 365;
  return Math.max(5, Math.round(Math.exp(-lam * anos) * 100));
}

function classPrognostico(surv: number): Prognostico['classe_prognostico'] {
  if (surv >= 90) return 'bom';
  if (surv >= 70) return 'intermediario';
  if (surv >= 50) return 'reservado';
  return 'grave';
}

// ══════════════════════════════════════════════════════════════
// API PÚBLICA
// ══════════════════════════════════════════════════════════════

export function gerarPrognostico(
  perfil: PerfilPrognostico,
  horizonte: HorizontePrognostico
): Prognostico {
  const lam = lambda(perfil);
  const sobrevida = survivorFunc(lam, horizonte);
  const evento_maior = Math.max(5, Math.min(95, Math.round((1 - Math.exp(-lam * 0.6)) * 100)));
  const internacao   = Math.max(3, Math.min(80, Math.round((1 - Math.exp(-lam * 0.4)) * 100)));

  const eventos: ProbabiidadeEvento[] = [
    {
      evento: 'Morte por qualquer causa',
      probabilidade_pct: 100 - sobrevida,
      intervalo_confianca: [Math.max(1, 100 - sobrevida - 5), Math.min(99, 100 - sobrevida + 7)],
      nivel_confianca: 'moderada',
      fatores_contribuintes: ['Idade', 'Comorbidades', 'Controle clínico'],
    },
    {
      evento: 'Evento cardiovascular maior (MACE)',
      probabilidade_pct: evento_maior,
      intervalo_confianca: [Math.max(1, evento_maior - 6), Math.min(99, evento_maior + 8)],
      nivel_confianca: 'moderada',
      fatores_contribuintes: ['HAS', 'DM', 'Tabagismo', 'Dislipidemia'],
    },
    {
      evento: 'Internação hospitalar',
      probabilidade_pct: internacao,
      intervalo_confianca: [Math.max(1, internacao - 5), Math.min(99, internacao + 5)],
      nivel_confianca: 'alta',
      fatores_contribuintes: ['Comorbidades', 'Internações prévias', 'Adesão ao tratamento'],
    },
  ];

  const score_gravidade = Math.round((100 - sobrevida) * 0.5 + evento_maior * 0.3 + internacao * 0.2);

  const fatores_modificaveis: string[] = [];
  if (perfil.pa_sistolica && perfil.pa_sistolica > 140) fatores_modificaveis.push('Controle pressórico (PA > 140 mmHg)');
  if (perfil.hba1c && perfil.hba1c > 7) fatores_modificaveis.push(`Controle glicêmico (HbA1c ${perfil.hba1c}%)`);
  if (perfil.comorbidades.some(c => c.toLowerCase().includes('tabag'))) fatores_modificaveis.push('Cessação tabágica');
  if (perfil.internacoes_12m && perfil.internacoes_12m > 0) fatores_modificaveis.push('Redução de internações — seguimento ambulatorial');

  const alertas: string[] = [];
  if (sobrevida < 70) alertas.push('Prognóstico reservado — considerar avaliação com especialista');
  if (internacao > 40) alertas.push('Alto risco de reinternação — planejar acompanhamento intensivo');
  if (!fatores_modificaveis.length) alertas.push('Perfil de risco bem controlado para os parâmetros disponíveis');

  return {
    id: `PROG-${Date.now().toString(36).toUpperCase()}`,
    perfil,
    horizonte,
    eventos,
    probabilidade_sobrevida: sobrevida,
    probabilidade_evento_maior: evento_maior,
    probabilidade_internacao: internacao,
    score_gravidade,
    classe_prognostico: classPrognostico(sobrevida),
    fatores_modificaveis,
    potencial_melhora_pct: Math.min(30, fatores_modificaveis.length * 8),
    alertas,
    gerado_em: new Date().toISOString(),
  };
}

export function gerarCurvaRisco(
  perfil: PerfilPrognostico,
  horizonte_total_meses: number
): CurvaRisco {
  const lam = lambda(perfil);
  const horizonte_meses = Array.from({ length: horizonte_total_meses + 1 }, (_, i) => i);
  const sobrevida_pct = horizonte_meses.map(m => {
    const s = Math.exp(-lam * (m / 12)) * 100;
    return Math.round(Math.max(5, s) * 10) / 10;
  });
  const evento_pct = sobrevida_pct.map(s => Math.max(0, Math.round((100 - s) * 0.7 * 10) / 10));
  return { cid: perfil.cid, horizonte_meses, sobrevida_pct, evento_pct };
}

export function calcularProbabilidadeEvento(
  perfil: PerfilPrognostico,
  evento: string,
  horizonte: HorizontePrognostico
): number {
  const prog = gerarPrognostico(perfil, horizonte);
  const ev = prog.eventos.find(e => e.evento.toLowerCase().includes(evento.toLowerCase()));
  return ev?.probabilidade_pct ?? prog.probabilidade_evento_maior;
}

// ── UI labels ─────────────────────────────────────────────────

export const HORIZONTE_LABEL: Record<HorizontePrognostico, string> = {
  '30d': '30 dias',
  '6m':  '6 meses',
  '1a':  '1 ano',
  '5a':  '5 anos',
};

export const CLASSE_META: Record<Prognostico['classe_prognostico'], { label: string; cls: string; desc: string }> = {
  bom:          { label: 'Bom',          cls: 'text-green-700 bg-green-50',   desc: 'Sobrevida >90% no horizonte analisado' },
  intermediario:{ label: 'Intermediário', cls: 'text-blue-700 bg-blue-50',    desc: 'Sobrevida 70–90%' },
  reservado:    { label: 'Reservado',    cls: 'text-orange-700 bg-orange-50', desc: 'Sobrevida 50–70%' },
  grave:        { label: 'Grave',        cls: 'text-red-700 bg-red-50',       desc: 'Sobrevida <50% — avaliação urgente' },
};

export const CONDICOES_PROGNOSE: { cid: string; label: string }[] = [
  { cid: 'I10', label: 'Hipertensão Arterial (I10)' },
  { cid: 'E11', label: 'Diabetes Mellitus tipo 2 (E11)' },
  { cid: 'I50', label: 'Insuficiência Cardíaca (I50)' },
  { cid: 'J45', label: 'Asma (J45)' },
  { cid: 'J44', label: 'DPOC (J44)' },
];

// ─── Cross-engine: Outcome Engine integration ────────────────

import { calcularNNT, OUTCOME_DB } from './outcome-engine';

export interface PrognosticoComNNT {
  prognostico: Prognostico;
  nnt_beneficio: number | null;
  nnt_dano: number | null;
  base_populacional: number;
  interpretacao_nnt: string;
}

export function gerarPrognosticoComOutcome(
  perfil: PerfilPrognostico,
  horizonte: HorizontePrognostico,
): PrognosticoComNNT {
  const prognostico = gerarPrognostico(perfil, horizonte);
  const outcomeBase = OUTCOME_DB.find(o => o.cid === perfil.cid);

  let nnt_beneficio: number | null = null;
  let nnt_dano: number | null = null;

  if (outcomeBase) {
    nnt_beneficio = calcularNNT(outcomeBase.incidencia_tratamento, outcomeBase.incidencia_controle).nnt;
  }

  const interpretacao_nnt = nnt_beneficio === null
    ? 'Dados de outcome não disponíveis para este CID.'
    : nnt_beneficio <= 10
    ? `NNT = ${nnt_beneficio} — benefício clínico expressivo. Tratamento altamente recomendado.`
    : nnt_beneficio <= 20
    ? `NNT = ${nnt_beneficio} — benefício moderado. Indicação baseada no perfil individual.`
    : `NNT = ${nnt_beneficio} — benefício limitado. Avaliar custo-efetividade e preferências do paciente.`;

  return {
    prognostico,
    nnt_beneficio,
    nnt_dano,
    base_populacional: 0,
    interpretacao_nnt,
  };
}
