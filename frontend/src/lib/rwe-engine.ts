// ============================================================
// PRESCREVE-AI — Real World Evidence Engine (Phase 12 · Module 1)
// Evidência do mundo real: efetividade, segurança e desfechos
// ============================================================

'use client';

// ══════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════

export type OrigemRWE = 'hospital' | 'clinica' | 'sociedade' | 'literatura' | 'registro';
export type DesfechoEficacia = 'cura' | 'remissao' | 'controle' | 'melhora_parcial' | 'falha';
export type EventoAdverso = 'leve' | 'moderado' | 'grave' | 'fatal';

export interface RealWorldEvidence {
  id: string;
  cid: string;
  diagnostico: string;
  especialidade: string;

  // Epidemiologia
  total_casos: number;
  periodo: string;          // '2023-01' a '2024-12'
  populacao: string;
  idade_media: number;
  proporcao_feminino: number;  // 0–1

  // Efetividade
  taxa_sucesso: number;           // 0–100
  taxa_falha: number;
  taxa_melhora_parcial: number;

  // Segurança
  mortalidade: number;            // % a 30 dias
  reinternacao: number;           // % a 30 dias
  eventos_adversos: number;       // % qualquer EA
  eventos_adversos_graves: number;

  // Terapêutica
  medicamentos: string[];
  guideline_utilizada: string;
  adesao_guideline: number;       // 0–100%

  // Score
  score_evidencia: number;        // 0–100
  nivel_confianca: 'alta' | 'moderada' | 'baixa';

  // Metadados
  origem: OrigemRWE;
  instituicao?: string;
  timestamp: string;
  hash_integridade: string;
}

export interface DesfechoRWE {
  caso_id: string;
  diagnostico_id: string;
  molecula: string;
  desfecho: DesfechoEficacia;
  tempo_dias: number;          // dias até desfecho
  evento_adverso?: EventoAdverso;
  descricao_evento?: string;
  reinternado: boolean;
  obito: boolean;
  timestamp: string;
}

export interface PainelRWE {
  cid: string;
  diagnostico: string;
  n_total: number;
  evidencias: RealWorldEvidence[];
  score_global: number;
  taxa_sucesso_media: number;
  taxa_mortalidade_media: number;
  taxa_eventos_adversos_media: number;
  medicamentos_mais_efetivos: { molecula: string; taxa_sucesso: number; n: number }[];
  comparacao_guideline: { concordancia_pct: number; divergencias: string[] };
  tendencia: 'melhora' | 'estavel' | 'piora';
  alertas: string[];
}

// ══════════════════════════════════════════════════════════════
// STORAGE
// ══════════════════════════════════════════════════════════════

const KEY_RWE     = 'prescreve_ai_rwe_v1';
const KEY_DESF    = 'prescreve_ai_rwe_desfechos_v1';
const SISTEMA_VER = '3.0.0';

function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) + h) + s.charCodeAt(i); h |= 0; }
  return `R${Math.abs(h).toString(36).toUpperCase().padStart(8,'0')}`;
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`;
}

function loadRWE(): RealWorldEvidence[] {
  if (typeof window === 'undefined') return [];
  try { const r = localStorage.getItem(KEY_RWE); return r ? JSON.parse(r) : []; } catch { return []; }
}

function saveRWE(d: RealWorldEvidence[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_RWE, JSON.stringify(d.slice(-10000)));
}

function loadDesf(): DesfechoRWE[] {
  if (typeof window === 'undefined') return [];
  try { const r = localStorage.getItem(KEY_DESF); return r ? JSON.parse(r) : []; } catch { return []; }
}

function saveDesf(d: DesfechoRWE[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_DESF, JSON.stringify(d.slice(-50000)));
}

// ══════════════════════════════════════════════════════════════
// FUNÇÕES PRINCIPAIS
// ══════════════════════════════════════════════════════════════

export function registrarCaso(
  draft: Omit<RealWorldEvidence, 'id' | 'timestamp' | 'hash_integridade'>
): RealWorldEvidence {
  const base = { ...draft, id: genId('RWE'), timestamp: new Date().toISOString() };
  const entry: RealWorldEvidence = { ...base, hash_integridade: hashStr(JSON.stringify(base)) };
  const all = loadRWE();
  all.push(entry);
  saveRWE(all);
  return entry;
}

export function registrarDesfecho(
  draft: Omit<DesfechoRWE, 'timestamp'>
): DesfechoRWE {
  const entry: DesfechoRWE = { ...draft, timestamp: new Date().toISOString() };
  const all = loadDesf();
  all.push(entry);
  saveDesf(all);
  return entry;
}

export function calcularDesfechos(cid: string): {
  n: number;
  sucesso: number;
  falha: number;
  mortalidade: number;
  reinternacao: number;
  tempo_medio_dias: number;
} {
  const lista = loadDesf().filter(d => d.diagnostico_id === cid);
  if (!lista.length) return { n: 0, sucesso: 0, falha: 0, mortalidade: 0, reinternacao: 0, tempo_medio_dias: 0 };
  const n = lista.length;
  return {
    n,
    sucesso:      Math.round(lista.filter(d => d.desfecho === 'cura' || d.desfecho === 'remissao' || d.desfecho === 'controle').length / n * 100),
    falha:        Math.round(lista.filter(d => d.desfecho === 'falha').length / n * 100),
    mortalidade:  Math.round(lista.filter(d => d.obito).length / n * 100),
    reinternacao: Math.round(lista.filter(d => d.reinternado).length / n * 100),
    tempo_medio_dias: Math.round(lista.reduce((s, d) => s + d.tempo_dias, 0) / n),
  };
}

export function compararComDiretrizes(cid: string): {
  guideline: string;
  adesao_real: number;
  taxa_sucesso_guideline: number;
  taxa_sucesso_rwe: number;
  delta: number;
  interpretacao: string;
} {
  const evidencias = loadRWE().filter(e => e.cid === cid);
  if (!evidencias.length) return {
    guideline: 'N/A', adesao_real: 0, taxa_sucesso_guideline: 80,
    taxa_sucesso_rwe: 0, delta: -80, interpretacao: 'Dados insuficientes',
  };
  const adesao_real = Math.round(evidencias.reduce((s, e) => s + e.adesao_guideline, 0) / evidencias.length);
  const taxa_sucesso_rwe = Math.round(evidencias.reduce((s, e) => s + e.taxa_sucesso, 0) / evidencias.length);
  const taxa_sucesso_guideline = 80; // RCT benchmark
  const delta = taxa_sucesso_rwe - taxa_sucesso_guideline;
  return {
    guideline: evidencias[0].guideline_utilizada,
    adesao_real,
    taxa_sucesso_guideline,
    taxa_sucesso_rwe,
    delta,
    interpretacao: delta >= 0 ? 'Mundo real ≥ ensaio clínico' :
                   delta >= -10 ? 'Discrepância leve — esperado' :
                   'Discrepância significativa — investigar',
  };
}

export function gerarPainelRWE(cid: string): PainelRWE {
  const lista = loadRWE().filter(e => e.cid === cid);
  if (!lista.length) {
    return {
      cid, diagnostico: cid, n_total: 0, evidencias: [],
      score_global: 0, taxa_sucesso_media: 0, taxa_mortalidade_media: 0,
      taxa_eventos_adversos_media: 0, medicamentos_mais_efetivos: [],
      comparacao_guideline: { concordancia_pct: 0, divergencias: [] },
      tendencia: 'estavel', alertas: ['Nenhum dado RWE disponível para este diagnóstico.'],
    };
  }

  const n = lista.length;
  const taxa_sucesso_media     = Math.round(lista.reduce((s, e) => s + e.taxa_sucesso, 0) / n);
  const taxa_mortalidade_media = Math.round(lista.reduce((s, e) => s + e.mortalidade, 0) / n * 10) / 10;
  const taxa_ea_media          = Math.round(lista.reduce((s, e) => s + e.eventos_adversos, 0) / n * 10) / 10;
  const score_global           = Math.round(lista.reduce((s, e) => s + e.score_evidencia, 0) / n);

  // Medicamentos mais efetivos
  const molMap: Record<string, { total: number; sucesso_sum: number }> = {};
  for (const e of lista) {
    for (const m of e.medicamentos) {
      if (!molMap[m]) molMap[m] = { total: 0, sucesso_sum: 0 };
      molMap[m].total++;
      molMap[m].sucesso_sum += e.taxa_sucesso;
    }
  }
  const medicamentos_mais_efetivos = Object.entries(molMap)
    .map(([molecula, { total, sucesso_sum }]) => ({ molecula, taxa_sucesso: Math.round(sucesso_sum / total), n: total }))
    .sort((a, b) => b.taxa_sucesso - a.taxa_sucesso)
    .slice(0, 5);

  const comp = compararComDiretrizes(cid);
  const alertas: string[] = [];
  if (taxa_mortalidade_media > 10) alertas.push(`Mortalidade ${taxa_mortalidade_media}% — acima do esperado`);
  if (comp.adesao_real < 60) alertas.push(`Adesão às diretrizes baixa: ${comp.adesao_real}%`);
  if (taxa_ea_media > 20) alertas.push(`Taxa de eventos adversos elevada: ${taxa_ea_media}%`);
  if (!alertas.length) alertas.push('Indicadores dentro dos parâmetros esperados');

  return {
    cid,
    diagnostico: lista[0].diagnostico,
    n_total: lista.reduce((s, e) => s + e.total_casos, 0),
    evidencias: lista,
    score_global,
    taxa_sucesso_media,
    taxa_mortalidade_media,
    taxa_eventos_adversos_media: taxa_ea_media,
    medicamentos_mais_efetivos,
    comparacao_guideline: { concordancia_pct: comp.adesao_real, divergencias: [] },
    tendencia: taxa_sucesso_media >= 75 ? 'melhora' : taxa_sucesso_media >= 55 ? 'estavel' : 'piora',
    alertas,
  };
}

export function listarRWE(filtros?: { cid?: string; origem?: OrigemRWE }): RealWorldEvidence[] {
  let lista = loadRWE();
  if (filtros?.cid) lista = lista.filter(e => e.cid === filtros.cid);
  if (filtros?.origem) lista = lista.filter(e => e.origem === filtros.origem);
  return lista.slice().reverse();
}

// ══════════════════════════════════════════════════════════════
// SEED DEMO
// ══════════════════════════════════════════════════════════════

export function seedRWEDemo(): void {
  if (typeof window === 'undefined') return;
  if (loadRWE().length > 0) return;

  const casos: Omit<RealWorldEvidence, 'id' | 'timestamp' | 'hash_integridade'>[] = [
    {
      cid: 'I10', diagnostico: 'Hipertensão Arterial Sistêmica', especialidade: 'cardiologia',
      total_casos: 4820, periodo: '2023-01 a 2024-06', populacao: 'Adultos ≥18 anos, Brasil',
      idade_media: 59, proporcao_feminino: 0.54,
      taxa_sucesso: 78, taxa_falha: 12, taxa_melhora_parcial: 10,
      mortalidade: 1.2, reinternacao: 4.8, eventos_adversos: 14.3, eventos_adversos_graves: 2.1,
      medicamentos: ['Enalapril', 'Losartana', 'Anlodipina', 'Hidroclorotiazida', 'Metoprolol'],
      guideline_utilizada: 'DBHA-7/SBC 2020', adesao_guideline: 71,
      score_evidencia: 82, nivel_confianca: 'alta', origem: 'registro', instituicao: 'Registro Nacional HAS-BR',
    },
    {
      cid: 'I10', diagnostico: 'Hipertensão Arterial Sistêmica', especialidade: 'cardiologia',
      total_casos: 1230, periodo: '2024-01 a 2024-12', populacao: 'Hospital terciário referência',
      idade_media: 62, proporcao_feminino: 0.51,
      taxa_sucesso: 84, taxa_falha: 8, taxa_melhora_parcial: 8,
      mortalidade: 0.8, reinternacao: 3.2, eventos_adversos: 11.0, eventos_adversos_graves: 1.4,
      medicamentos: ['Sacubitril/Valsartana', 'Anlodipina', 'Clortalidona'],
      guideline_utilizada: 'DBHA-7/SBC 2020', adesao_guideline: 88,
      score_evidencia: 91, nivel_confianca: 'alta', origem: 'hospital', instituicao: 'InCor SP',
    },
    {
      cid: 'E11', diagnostico: 'Diabetes Mellitus tipo 2', especialidade: 'endocrinologia',
      total_casos: 6340, periodo: '2022-01 a 2024-12', populacao: 'DM2 + DCV ou alto risco',
      idade_media: 63, proporcao_feminino: 0.49,
      taxa_sucesso: 72, taxa_falha: 18, taxa_melhora_parcial: 10,
      mortalidade: 2.8, reinternacao: 7.1, eventos_adversos: 18.6, eventos_adversos_graves: 3.4,
      medicamentos: ['Metformina', 'Empagliflozina', 'Semaglutida', 'Sitagliptina'],
      guideline_utilizada: 'ADA 2024', adesao_guideline: 64,
      score_evidencia: 87, nivel_confianca: 'alta', origem: 'registro', instituicao: 'SBD Registry',
    },
    {
      cid: 'I50', diagnostico: 'Insuficiência Cardíaca com FE Reduzida', especialidade: 'cardiologia',
      total_casos: 2180, periodo: '2021-01 a 2024-06', populacao: 'ICFEr NYHA II–IV',
      idade_media: 68, proporcao_feminino: 0.44,
      taxa_sucesso: 65, taxa_falha: 22, taxa_melhora_parcial: 13,
      mortalidade: 8.4, reinternacao: 24.2, eventos_adversos: 31.8, eventos_adversos_graves: 9.2,
      medicamentos: ['Sacubitril/Valsartana', 'Carvedilol', 'Espironolactona', 'Dapagliflozina'],
      guideline_utilizada: 'ESC-HF 2021', adesao_guideline: 58,
      score_evidencia: 88, nivel_confianca: 'alta', origem: 'hospital',
    },
    {
      cid: 'J45', diagnostico: 'Asma Brônquica', especialidade: 'pneumologia',
      total_casos: 3410, periodo: '2023-01 a 2024-12', populacao: 'Asma leve-moderada, ≥12 anos',
      idade_media: 38, proporcao_feminino: 0.58,
      taxa_sucesso: 81, taxa_falha: 9, taxa_melhora_parcial: 10,
      mortalidade: 0.2, reinternacao: 2.8, eventos_adversos: 8.4, eventos_adversos_graves: 0.7,
      medicamentos: ['Budesonida-Formoterol', 'Fluticasona-Salmeterol', 'Montelucaste'],
      guideline_utilizada: 'GINA 2023', adesao_guideline: 74,
      score_evidencia: 85, nivel_confianca: 'alta', origem: 'registro',
    },
  ];

  for (const c of casos) registrarCaso(c);
}

// ── UI labels ─────────────────────────────────────────────────

export const ORIGEM_META: Record<OrigemRWE, { label: string; cls: string }> = {
  hospital:    { label: 'Hospital', cls: 'bg-blue-100 text-blue-700' },
  clinica:     { label: 'Clínica',  cls: 'bg-green-100 text-green-700' },
  sociedade:   { label: 'Sociedade', cls: 'bg-violet-100 text-violet-700' },
  literatura:  { label: 'Literatura', cls: 'bg-amber-100 text-amber-700' },
  registro:    { label: 'Registro', cls: 'bg-slate-100 text-slate-600' },
};

export const TENDENCIA_META = {
  melhora: { label: 'Tendência positiva', cls: 'text-green-700', icon: '↑' },
  estavel: { label: 'Estável', cls: 'text-blue-700', icon: '→' },
  piora:   { label: 'Tendência de piora', cls: 'text-red-700', icon: '↓' },
};
