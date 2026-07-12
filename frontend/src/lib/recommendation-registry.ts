// ============================================================
// PRESCREVE-AI — Recommendation Registry (MODULE 3)
// Versionamento completo de recomendações clínicas
// Guideline → Versão → Evidência → Data → Engine → Scores
// ============================================================

'use client';

// ──────────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────────

export type OrigemEngine =
  | 'clinical-therapeutics'
  | 'clinical-decision-support'
  | 'pharma-database'
  | 'safety-rules'
  | 'second-opinion'
  | 'manual';

export type StatusRecomendacao =
  | 'ativa'
  | 'desatualizada'
  | 'substituida'
  | 'suspensa'
  | 'em_revisao';

export interface EvidenciaUsada {
  estudo: string;
  doi?: string;
  pmid?: string;
  nivel: 'A' | 'B' | 'C';
  grau: 'I' | 'IIa' | 'IIb' | 'III';
  n_pacientes?: number;
  reducao_risco_relativo?: string;
  nnt?: number;
}

export interface RecomendacaoVersionada {
  id: string;
  versao: string;                    // ex: '1.0', '2.1', '2024-07-04'
  timestamp: string;                 // ISO8601

  // Identificação clínica
  diagnostico_id: string;            // 'has', 'dm2', 'icc' ...
  diagnostico_nome: string;
  molecula: string;
  classe_terapeutica: string;
  indicacao: string;

  // Rastreabilidade de guideline
  guideline_id?: string;
  guideline_sigla: string;
  guideline_versao: string;
  guideline_sociedade: string;
  guideline_ano: number;

  // Evidências utilizadas
  evidencias: EvidenciaUsada[];

  // Engine responsável
  engine: OrigemEngine;
  engine_versao: string;             // versão do sistema que gerou

  // Scores no momento da recomendação
  score_confianca: number;           // 0–100
  score_seguranca: number;           // 0–100
  score_evidencia: number;           // 0–100
  score_global?: number;             // medical-trust-score

  // Status e rastreabilidade
  status: StatusRecomendacao;
  substituida_por?: string;          // id da recomendação substituta
  motivo_atualizacao?: string;
  observacoes?: string;

  // Contexto de geração (anonimizado)
  contexto_diagnostico?: string;     // resumo clínico que gerou a recomendação
  hash_integridade: string;
}

export interface RecomendacaoRegistroSumario {
  id: string;
  timestamp: string;
  diagnostico_nome: string;
  molecula: string;
  guideline_sigla: string;
  engine: OrigemEngine;
  score_confianca: number;
  score_evidencia: number;
  status: StatusRecomendacao;
}

// ──────────────────────────────────────────────────────────────
// Storage
// ──────────────────────────────────────────────────────────────

export const REGISTRY_KEY = 'prescreve_ai_recommendation_registry_v1';
const MAX_ENTRIES  = 5000;
const SISTEMA_VER  = '2.2.0';

function computarHash(rec: Omit<RecomendacaoVersionada, 'hash_integridade'>): string {
  const str = [
    rec.id, rec.timestamp, rec.diagnostico_id, rec.molecula,
    rec.guideline_sigla, rec.guideline_versao, rec.engine,
    rec.score_confianca, rec.score_evidencia,
  ].join('|');
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i);
    h |= 0;
  }
  return `REC-${Math.abs(h).toString(36).toUpperCase().padStart(8, '0')}`;
}

function gerarId(): string {
  return `RV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function loadAll(): RecomendacaoVersionada[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    return raw ? (JSON.parse(raw) as RecomendacaoVersionada[]) : [];
  } catch {
    return [];
  }
}

function saveAll(entries: RecomendacaoVersionada[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
}

// ──────────────────────────────────────────────────────────────
// CRUD
// ──────────────────────────────────────────────────────────────

export function registrarRecomendacao(
  draft: Omit<RecomendacaoVersionada, 'id' | 'timestamp' | 'hash_integridade' | 'versao' | 'engine_versao' | 'status'>
): RecomendacaoVersionada {
  const base: Omit<RecomendacaoVersionada, 'hash_integridade'> = {
    ...draft,
    id: gerarId(),
    versao: new Date().toISOString().slice(0, 10),
    timestamp: new Date().toISOString(),
    engine_versao: SISTEMA_VER,
    status: 'ativa',
  };
  const entry: RecomendacaoVersionada = { ...base, hash_integridade: computarHash(base) };
  const all = loadAll();
  all.push(entry);
  saveAll(all);
  return entry;
}

export function atualizarStatusRecomendacao(
  id: string,
  status: StatusRecomendacao,
  motivo?: string,
  substituidaPor?: string
): boolean {
  const all = loadAll();
  const idx = all.findIndex(r => r.id === id);
  if (idx === -1) return false;
  all[idx] = {
    ...all[idx],
    status,
    motivo_atualizacao: motivo,
    substituida_por: substituidaPor,
  };
  all[idx].hash_integridade = computarHash(all[idx]);
  saveAll(all);
  return true;
}

export function buscarRecomendacao(id: string): RecomendacaoVersionada | undefined {
  return loadAll().find(r => r.id === id);
}

export interface FiltroRecomendacao {
  diagnostico_id?: string;
  molecula?: string;
  guideline_sigla?: string;
  engine?: OrigemEngine;
  status?: StatusRecomendacao;
  score_minimo?: number;
  data_inicio?: string;
  data_fim?: string;
}

export function listarRecomendacoes(filtros?: FiltroRecomendacao): RecomendacaoVersionada[] {
  let lista = loadAll();
  if (!filtros) return lista.slice().reverse();

  if (filtros.diagnostico_id) lista = lista.filter(r => r.diagnostico_id === filtros.diagnostico_id);
  if (filtros.molecula)       lista = lista.filter(r => r.molecula.toLowerCase().includes(filtros.molecula!.toLowerCase()));
  if (filtros.guideline_sigla) lista = lista.filter(r => r.guideline_sigla.includes(filtros.guideline_sigla!));
  if (filtros.engine)         lista = lista.filter(r => r.engine === filtros.engine);
  if (filtros.status)         lista = lista.filter(r => r.status === filtros.status);
  if (filtros.score_minimo !== undefined) lista = lista.filter(r => r.score_confianca >= filtros.score_minimo!);
  if (filtros.data_inicio)    lista = lista.filter(r => r.timestamp >= filtros.data_inicio!);
  if (filtros.data_fim)       lista = lista.filter(r => r.timestamp <= filtros.data_fim! + 'T23:59:59');

  return lista.slice().reverse();
}

export function gerarSumarios(entries: RecomendacaoVersionada[]): RecomendacaoRegistroSumario[] {
  return entries.map(r => ({
    id:              r.id,
    timestamp:       r.timestamp,
    diagnostico_nome:r.diagnostico_nome,
    molecula:        r.molecula,
    guideline_sigla: r.guideline_sigla,
    engine:          r.engine,
    score_confianca: r.score_confianca,
    score_evidencia: r.score_evidencia,
    status:          r.status,
  }));
}

export function verificarIntegridade(rec: RecomendacaoVersionada): boolean {
  const { hash_integridade: _, ...rest } = rec;
  return rec.hash_integridade === computarHash(rest as Omit<RecomendacaoVersionada, 'hash_integridade'>);
}

// ──────────────────────────────────────────────────────────────
// Seed — recomendações históricas representativas
// ──────────────────────────────────────────────────────────────

function seedAtivo(): boolean {
  if (typeof window === 'undefined') return false;
  return loadAll().length > 0;
}

export function seedRecomendacoesDemo(): void {
  if (seedAtivo()) return;

  const recs: Omit<RecomendacaoVersionada, 'id' | 'timestamp' | 'hash_integridade' | 'versao' | 'engine_versao' | 'status'>[] = [
    {
      diagnostico_id: 'has',
      diagnostico_nome: 'Hipertensão Arterial Sistêmica',
      molecula: 'Enalapril',
      classe_terapeutica: 'Inibidor da ECA (IECA)',
      indicacao: 'HAS + DM2 + DRC — nefroproteção e redução de morbimortalidade CV',
      guideline_id: 'g1',
      guideline_sigla: 'DBHA-7/SBC 2020',
      guideline_versao: '7.0',
      guideline_sociedade: 'Sociedade Brasileira de Cardiologia (SBC)',
      guideline_ano: 2020,
      evidencias: [
        { estudo: 'HOPE', doi: '10.1056/NEJM200001203420301', pmid: '10639539', nivel: 'A', grau: 'I', n_pacientes: 9297, reducao_risco_relativo: '22%', nnt: 26 },
        { estudo: 'SPRINT', doi: '10.1056/NEJMoa1511939', pmid: '26551272', nivel: 'A', grau: 'I', n_pacientes: 9361, reducao_risco_relativo: '25%', nnt: 61 },
      ],
      engine: 'clinical-therapeutics',
      score_confianca: 92,
      score_seguranca: 88,
      score_evidencia: 95,
      score_global: 91,
    },
    {
      diagnostico_id: 'dm2',
      diagnostico_nome: 'Diabetes Mellitus tipo 2',
      molecula: 'Metformina',
      classe_terapeutica: 'Biguanida',
      indicacao: 'DM2 — 1ª linha farmacológica em todos os pacientes sem contraindicação',
      guideline_sigla: 'ADA 2024',
      guideline_versao: '2024',
      guideline_sociedade: 'American Diabetes Association (ADA)',
      guideline_ano: 2024,
      evidencias: [
        { estudo: 'UKPDS 34', doi: '10.1016/S0140-6736(98)07037-8', pmid: '9742977', nivel: 'A', grau: 'I', n_pacientes: 1704, reducao_risco_relativo: '32%', nnt: 14 },
      ],
      engine: 'clinical-therapeutics',
      score_confianca: 90,
      score_seguranca: 85,
      score_evidencia: 93,
      score_global: 89,
    },
    {
      diagnostico_id: 'dm2',
      diagnostico_nome: 'Diabetes Mellitus tipo 2',
      molecula: 'Empagliflozina',
      classe_terapeutica: 'Inibidor do SGLT-2 (iSGLT2)',
      indicacao: 'DM2 com DCV estabelecida, ICC ou DRC — 2ª linha mandatória independente do controle glicêmico',
      guideline_sigla: 'SBD 2024 / ADA 2024',
      guideline_versao: '2024',
      guideline_sociedade: 'Sociedade Brasileira de Diabetes / ADA',
      guideline_ano: 2024,
      evidencias: [
        { estudo: 'EMPA-REG OUTCOME', doi: '10.1056/NEJMoa1504720', pmid: '26378978', nivel: 'A', grau: 'I', n_pacientes: 7020, reducao_risco_relativo: '14% MACE / 38% morte CV', nnt: 39 },
        { estudo: 'EMPEROR-Reduced', doi: '10.1056/NEJMoa2022190', pmid: '32865377', nivel: 'A', grau: 'I', n_pacientes: 3730, reducao_risco_relativo: '25%', nnt: 19 },
      ],
      engine: 'clinical-therapeutics',
      score_confianca: 91,
      score_seguranca: 83,
      score_evidencia: 96,
      score_global: 90,
    },
    {
      diagnostico_id: 'icc',
      diagnostico_nome: 'Insuficiência Cardíaca com FE Reduzida (ICFEr)',
      molecula: 'Sacubitril/Valsartana',
      classe_terapeutica: 'ARNI — Inibidor da Neprilisina + BRA',
      indicacao: 'ICFEr sintomática (NYHA II–IV) — substitui IECA/BRA em pacientes tolerantes',
      guideline_id: 'g4',
      guideline_sigla: 'ESC-HF 2021',
      guideline_versao: '2021',
      guideline_sociedade: 'European Society of Cardiology (ESC)',
      guideline_ano: 2021,
      evidencias: [
        { estudo: 'PARADIGM-HF', doi: '10.1056/NEJMoa1409077', pmid: '25176015', nivel: 'A', grau: 'I', n_pacientes: 8442, reducao_risco_relativo: '20%', nnt: 21 },
      ],
      engine: 'clinical-therapeutics',
      score_confianca: 89,
      score_seguranca: 80,
      score_evidencia: 95,
      score_global: 88,
    },
    {
      diagnostico_id: 'icc',
      diagnostico_nome: 'Insuficiência Cardíaca com FE Reduzida (ICFEr)',
      molecula: 'Espironolactona',
      classe_terapeutica: 'Antagonista da Aldosterona (ARM)',
      indicacao: 'ICFEr NYHA II–IV (FEVE < 35%) — pilar fundamental: reduz mortalidade e hospitalização',
      guideline_id: 'g4',
      guideline_sigla: 'ESC-HF 2021 / II DIB-IC SBC 2023',
      guideline_versao: '2021',
      guideline_sociedade: 'ESC / SBC',
      guideline_ano: 2021,
      evidencias: [
        { estudo: 'RALES', doi: '10.1056/NEJM199909023411001', pmid: '10471456', nivel: 'A', grau: 'I', n_pacientes: 1663, reducao_risco_relativo: '30%', nnt: 9 },
        { estudo: 'EMPHASIS-HF', doi: '10.1056/NEJMoa1009492', pmid: '21073363', nivel: 'A', grau: 'I', n_pacientes: 2737, reducao_risco_relativo: '37%', nnt: 14 },
      ],
      engine: 'clinical-therapeutics',
      score_confianca: 88,
      score_seguranca: 75,
      score_evidencia: 94,
      score_global: 86,
    },
    {
      diagnostico_id: 'asma',
      diagnostico_nome: 'Asma Brônquica',
      molecula: 'Budesonida-Formoterol',
      classe_terapeutica: 'ICS + LABA (SMART)',
      indicacao: 'Asma — terapia de alívio e manutenção (SMART) em todos os degraus GINA — substitui SABA isolado',
      guideline_id: 'g3',
      guideline_sigla: 'GINA 2023',
      guideline_versao: '2023',
      guideline_sociedade: 'Global Initiative for Asthma (GINA)',
      guideline_ano: 2023,
      evidencias: [
        { estudo: 'SYGMA 1', doi: '10.1056/NEJMoa1715222', pmid: '29768140', nivel: 'A', grau: 'I', n_pacientes: 3836, reducao_risco_relativo: '64% exacerbações vs. SABA', nnt: 16 },
        { estudo: 'SYGMA 2', doi: '10.1056/NEJMoa1715368', pmid: '29768142', nivel: 'A', grau: 'I', n_pacientes: 4215 },
      ],
      engine: 'clinical-therapeutics',
      score_confianca: 87,
      score_seguranca: 90,
      score_evidencia: 94,
      score_global: 89,
    },
  ];

  for (const r of recs) {
    registrarRecomendacao(r);
  }
}

// ──────────────────────────────────────────────────────────────
// Estatísticas
// ──────────────────────────────────────────────────────────────

export interface EstatisticasRegistry {
  total: number;
  ativas: number;
  desatualizadas: number;
  por_diagnostico: Record<string, number>;
  por_engine: Partial<Record<OrigemEngine, number>>;
  score_medio_confianca: number;
  score_medio_evidencia: number;
  score_medio_seguranca: number;
  moleculas_top: { molecula: string; count: number }[];
}

export function calcularEstatisticasRegistry(): EstatisticasRegistry {
  const all = loadAll();
  const por_diag: Record<string, number> = {};
  const por_engine: Partial<Record<OrigemEngine, number>> = {};
  const mol_count: Record<string, number> = {};
  let soma_conf = 0, soma_ev = 0, soma_seg = 0;

  for (const r of all) {
    por_diag[r.diagnostico_id] = (por_diag[r.diagnostico_id] ?? 0) + 1;
    por_engine[r.engine] = (por_engine[r.engine] ?? 0) + 1;
    mol_count[r.molecula] = (mol_count[r.molecula] ?? 0) + 1;
    soma_conf += r.score_confianca;
    soma_ev   += r.score_evidencia;
    soma_seg  += r.score_seguranca;
  }

  const n = all.length || 1;
  return {
    total:                 all.length,
    ativas:                all.filter(r => r.status === 'ativa').length,
    desatualizadas:        all.filter(r => r.status !== 'ativa').length,
    por_diagnostico:       por_diag,
    por_engine,
    score_medio_confianca: Math.round(soma_conf / n),
    score_medio_evidencia: Math.round(soma_ev   / n),
    score_medio_seguranca: Math.round(soma_seg  / n),
    moleculas_top: Object.entries(mol_count)
      .map(([molecula, count]) => ({ molecula, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
}

// ──────────────────────────────────────────────────────────────
// Labels de UI
// ──────────────────────────────────────────────────────────────

export const STATUS_REC_META: Record<StatusRecomendacao, { label: string; cls: string; dot: string }> = {
  ativa:         { label: 'Ativa',          cls: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',  dot: 'bg-green-500'  },
  desatualizada: { label: 'Desatualizada',   cls: 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',  dot: 'bg-amber-400'  },
  substituida:   { label: 'Substituída',     cls: 'bg-slate-100  text-slate-600  dark:bg-slate-800     dark:text-slate-400',  dot: 'bg-slate-400'  },
  suspensa:      { label: 'Suspensa',        cls: 'bg-red-100    text-red-600    dark:bg-red-900/30    dark:text-red-400',    dot: 'bg-red-500'    },
  em_revisao:    { label: 'Em revisão',      cls: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',   dot: 'bg-blue-500'   },
};

export const ENGINE_LABEL: Record<OrigemEngine, string> = {
  'clinical-therapeutics':    'Módulo Terapêutico',
  'clinical-decision-support':'Motor CDS',
  'pharma-database':          'Base Farmacológica',
  'safety-rules':             'Motor de Segurança',
  'second-opinion':           'Segunda Opinião',
  'manual':                   'Entrada Manual',
};
