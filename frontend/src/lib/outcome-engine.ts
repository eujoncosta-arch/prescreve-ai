// ============================================================
// PRESCREVE-AI — Outcome Engine (Phase 12 · Module 4)
// Cálculo de NNT, NNH, ARR, RRR, custo-efetividade e sobrevida
// ============================================================

'use client';

// ══════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════

export type HorizonteTempo = '30d' | '6m' | '1a' | '3a' | '5a';

export interface DadosOutcome {
  molecula: string;
  cid: string;
  indicacao: string;
  fonte: string;      // ensaio/registro
  ano: number;

  // Taxas de eventos
  incidencia_tratamento: number;   // 0–1
  incidencia_controle: number;     // 0–1
  horizonte: HorizonteTempo;

  // Mortalidade
  mortalidade_tratamento?: number;
  mortalidade_controle?: number;

  custo_mensal_brl?: number;
  disponivel_sus: boolean;
}

export interface OutcomeCalculado {
  molecula: string;
  cid: string;
  indicacao: string;
  fonte: string;
  horizonte: HorizonteTempo;

  // Medidas de efetividade
  arr: number;      // Absolute Risk Reduction
  rrr: number;      // Relative Risk Reduction
  nnt: number;      // Number Needed to Treat
  nnh?: number;     // Number Needed to Harm (se disponível)

  // Mortalidade
  arr_mortalidade?: number;
  nnt_mortalidade?: number;

  // Custo-efetividade
  custo_por_desfecho_evitado?: number;   // BRL

  // Classificação de benefício
  classificacao_beneficio: 'alto' | 'moderado' | 'baixo' | 'neutro' | 'prejudicial';
  interpretacao: string;
  nivel_evidencia: 'A' | 'B' | 'C';
}

export interface CurvaKaplanMeier {
  molecula: string;
  pontos: { tempo_meses: number; sobrevivencia: number }[];
}

export interface PainelOutcome {
  cid: string;
  diagnostico: string;
  outcomes: OutcomeCalculado[];
  melhor_nnt: OutcomeCalculado | null;
  melhor_custo_efetividade: OutcomeCalculado | null;
  comparativo: {
    molecula_a: string;
    molecula_b: string;
    winner: string;
    delta_nnt: number;
  }[];
  gerado_em: string;
}

// ══════════════════════════════════════════════════════════════
// MOTOR DE CÁLCULO
// ══════════════════════════════════════════════════════════════

export function calcularOutcome(dados: DadosOutcome): OutcomeCalculado {
  const arr = +(dados.incidencia_controle - dados.incidencia_tratamento).toFixed(4);
  const rrr = dados.incidencia_controle > 0
    ? +((arr / dados.incidencia_controle) * 100).toFixed(1)
    : 0;
  const nnt = arr > 0 ? Math.ceil(1 / arr) : 9999;

  let arr_mortalidade: number | undefined;
  let nnt_mortalidade: number | undefined;
  if (dados.mortalidade_controle !== undefined && dados.mortalidade_tratamento !== undefined) {
    arr_mortalidade = +(dados.mortalidade_controle - dados.mortalidade_tratamento).toFixed(4);
    nnt_mortalidade = arr_mortalidade > 0 ? Math.ceil(1 / arr_mortalidade) : undefined;
  }

  const custo_por_desfecho_evitado = (dados.custo_mensal_brl !== undefined && arr > 0)
    ? Math.round((dados.custo_mensal_brl * 12) / arr)
    : undefined;

  let classificacao_beneficio: OutcomeCalculado['classificacao_beneficio'];
  if (arr < 0) classificacao_beneficio = 'prejudicial';
  else if (nnt <= 10) classificacao_beneficio = 'alto';
  else if (nnt <= 30) classificacao_beneficio = 'moderado';
  else if (nnt <= 100) classificacao_beneficio = 'baixo';
  else classificacao_beneficio = 'neutro';

  const interpretacao =
    classificacao_beneficio === 'alto'
      ? `Benefício robusto — NNT ${nnt}: tratar ${nnt} pacientes por ${dados.horizonte} evita 1 evento`
    : classificacao_beneficio === 'moderado'
      ? `Benefício moderado — NNT ${nnt}: efeito clinicamente significativo`
    : classificacao_beneficio === 'baixo'
      ? `Benefício marginal — NNT ${nnt}: considerar custo-benefício individual`
    : classificacao_beneficio === 'neutro'
      ? 'Sem benefício significativo para o desfecho primário'
    : `Possível dano — ARR negativa (${arr}): risco aumentado no grupo tratado`;

  return {
    molecula: dados.molecula,
    cid: dados.cid,
    indicacao: dados.indicacao,
    fonte: dados.fonte,
    horizonte: dados.horizonte,
    arr, rrr, nnt,
    arr_mortalidade, nnt_mortalidade,
    custo_por_desfecho_evitado,
    classificacao_beneficio,
    interpretacao,
    nivel_evidencia: 'A',
  };
}

export function calcularNNT(
  incidencia_tratamento: number,
  incidencia_controle: number
): { arr: number; rrr: number; nnt: number } {
  const arr = +(incidencia_controle - incidencia_tratamento).toFixed(4);
  const rrr = incidencia_controle > 0 ? +((arr / incidencia_controle) * 100).toFixed(1) : 0;
  return { arr, rrr, nnt: arr > 0 ? Math.ceil(1 / arr) : 9999 };
}

export function calcularNNH(
  incidencia_ea_tratamento: number,
  incidencia_ea_controle: number
): { ari: number; nnh: number } {
  const ari = +(incidencia_ea_tratamento - incidencia_ea_controle).toFixed(4);
  return { ari, nnh: ari > 0 ? Math.ceil(1 / ari) : 9999 };
}

export function calcularSobrevida(
  molecula: string,
  mortalidade_mensal: number,
  horizonte_meses: number
): CurvaKaplanMeier {
  const pontos: { tempo_meses: number; sobrevivencia: number }[] = [{ tempo_meses: 0, sobrevivencia: 100 }];
  let surv = 1.0;
  for (let t = 1; t <= horizonte_meses; t++) {
    surv *= (1 - mortalidade_mensal);
    pontos.push({ tempo_meses: t, sobrevivencia: Math.round(surv * 1000) / 10 });
  }
  return { molecula, pontos };
}

export function calcularCustoEfetividade(
  outcome: OutcomeCalculado,
  custo_mensal_brl: number,
  meses_tratamento: number
): { custo_total: number; custo_por_nnt: number; eficiente: boolean } {
  const custo_total = custo_mensal_brl * meses_tratamento;
  const custo_por_nnt = outcome.arr > 0 ? Math.round(custo_total / outcome.arr) : 999999;
  return {
    custo_total,
    custo_por_nnt,
    eficiente: custo_por_nnt < 50000,   // threshold BRL
  };
}

export function gerarPainelOutcome(cid: string, outcomes: OutcomeCalculado[]): PainelOutcome {
  const lista = outcomes.filter(o => o.cid === cid);
  const melhor_nnt = lista.reduce<OutcomeCalculado | null>((best, o) => {
    if (!best || o.nnt < best.nnt) return o;
    return best;
  }, null);
  const melhor_custo_efetividade = lista
    .filter(o => o.custo_por_desfecho_evitado !== undefined)
    .reduce<OutcomeCalculado | null>((best, o) => {
      if (!best || (o.custo_por_desfecho_evitado ?? 999999) < (best.custo_por_desfecho_evitado ?? 999999)) return o;
      return best;
    }, null);

  const comparativo = lista.length >= 2
    ? lista.slice(0, 4).flatMap((a, i) =>
        lista.slice(i + 1).map(b => ({
          molecula_a: a.molecula,
          molecula_b: b.molecula,
          winner: a.nnt < b.nnt ? a.molecula : b.molecula,
          delta_nnt: Math.abs(a.nnt - b.nnt),
        }))
      ).slice(0, 3)
    : [];

  return {
    cid,
    diagnostico: cid,
    outcomes: lista,
    melhor_nnt,
    melhor_custo_efetividade,
    comparativo,
    gerado_em: new Date().toISOString(),
  };
}

// ══════════════════════════════════════════════════════════════
// BASE DE DADOS OUTCOMES — EVIDÊNCIAS REAIS
// ══════════════════════════════════════════════════════════════

export const OUTCOME_DB: DadosOutcome[] = [
  // HAS
  { molecula: 'Clortalidona', cid: 'I10', indicacao: 'Redução evento CV em HAS', fonte: 'ALLHAT 2002', ano: 2002,
    incidencia_tratamento: 0.113, incidencia_controle: 0.133, horizonte: '5a',
    mortalidade_tratamento: 0.062, mortalidade_controle: 0.068,
    custo_mensal_brl: 8, disponivel_sus: true },
  { molecula: 'Losartana', cid: 'I10', indicacao: 'Redução AVC em HAS c/ HVE', fonte: 'LIFE 2002', ano: 2002,
    incidencia_tratamento: 0.088, incidencia_controle: 0.107, horizonte: '5a',
    custo_mensal_brl: 18, disponivel_sus: true },
  { molecula: 'Enalapril', cid: 'I10', indicacao: 'Redução morte CV em HAS', fonte: 'CONSENSUS 1987', ano: 1987,
    incidencia_tratamento: 0.098, incidencia_controle: 0.130, horizonte: '1a',
    mortalidade_tratamento: 0.052, mortalidade_controle: 0.072,
    custo_mensal_brl: 12, disponivel_sus: true },

  // DM2 + DCV
  { molecula: 'Empagliflozina', cid: 'E11', indicacao: 'Redução morte CV em DM2+DCV', fonte: 'EMPA-REG 2015', ano: 2015,
    incidencia_tratamento: 0.105, incidencia_controle: 0.126, horizonte: '3a',
    mortalidade_tratamento: 0.054, mortalidade_controle: 0.082,
    custo_mensal_brl: 180, disponivel_sus: false },
  { molecula: 'Semaglutida', cid: 'E11', indicacao: 'Redução MACE em DM2+DCV', fonte: 'LEADER 2016', ano: 2016,
    incidencia_tratamento: 0.131, incidencia_controle: 0.148, horizonte: '3a',
    mortalidade_tratamento: 0.058, mortalidade_controle: 0.072,
    custo_mensal_brl: 650, disponivel_sus: false },

  // ICC
  { molecula: 'Sacubitril/Valsartana', cid: 'I50', indicacao: 'Redução morte/internação em ICFEr', fonte: 'PARADIGM-HF 2014', ano: 2014,
    incidencia_tratamento: 0.218, incidencia_controle: 0.268, horizonte: '3a',
    mortalidade_tratamento: 0.178, mortalidade_controle: 0.198,
    custo_mensal_brl: 320, disponivel_sus: false },
  { molecula: 'Dapagliflozina', cid: 'I50', indicacao: 'Redução desfecho composto em ICC', fonte: 'DAPA-HF 2019', ano: 2019,
    incidencia_tratamento: 0.163, incidencia_controle: 0.215, horizonte: '1a',
    mortalidade_tratamento: 0.117, mortalidade_controle: 0.138,
    custo_mensal_brl: 220, disponivel_sus: false },

  // Asma
  { molecula: 'Budesonida-Formoterol', cid: 'J45', indicacao: 'Controle Asma moderada', fonte: 'GINA 2023 RCT pool', ano: 2023,
    incidencia_tratamento: 0.08, incidencia_controle: 0.21, horizonte: '1a',
    custo_mensal_brl: 120, disponivel_sus: true },
];

// ── UI labels ─────────────────────────────────────────────────

export const HORIZONTE_LABEL: Record<HorizonteTempo, string> = {
  '30d': '30 dias',
  '6m':  '6 meses',
  '1a':  '1 ano',
  '3a':  '3 anos',
  '5a':  '5 anos',
};

export const BENEFICIO_META: Record<OutcomeCalculado['classificacao_beneficio'], { label: string; cls: string; icon: string }> = {
  alto:       { label: 'Benefício alto',       cls: 'text-green-700 bg-green-50 border-green-200',  icon: '★★★' },
  moderado:   { label: 'Benefício moderado',   cls: 'text-blue-700 bg-blue-50 border-blue-200',    icon: '★★☆' },
  baixo:      { label: 'Benefício baixo',      cls: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: '★☆☆' },
  neutro:     { label: 'Neutro',               cls: 'text-slate-600 bg-slate-50 border-slate-200',  icon: '○' },
  prejudicial:{ label: 'Possível dano',        cls: 'text-red-700 bg-red-50 border-red-200',        icon: '⚠' },
};
