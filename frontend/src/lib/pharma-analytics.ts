// ============================================================
// PRESCREVE-AI — Pharma Analytics (Phase 12 · Module 8)
// Análise anônima de prescrições — sem PII, dados agregados
// ============================================================

'use client';

// ══════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════

export type ClasseTerapeutica =
  | 'ieca_bra' | 'bcc' | 'tiazidico' | 'betabloqueador'
  | 'isglt2' | 'aglp1' | 'biguanida' | 'sulfonilurei'
  | 'arni' | 'mineralocorticoide'
  | 'ics' | 'laba' | 'broncodilatador'
  | 'estatina' | 'fibrato'
  | 'outros';

export interface DadosPrescricao {
  cid: string;
  molecula: string;
  classe: ClasseTerapeutica;
  especialidade: string;
  mes: string;       // 'YYYY-MM'
  regiao: string;
  n: number;
  custo_medio_brl: number;
  sus: boolean;
}

export interface MarketShareMolecula {
  molecula: string;
  classe: ClasseTerapeutica;
  total: number;
  pct_mercado: number;
  pct_sus: number;
  crescimento_mensal: number;   // %
}

export interface DashboardLaboratorio {
  cid: string;
  diagnostico: string;
  periodo: string;
  total_prescricoes: number;
  top_moleculas: MarketShareMolecula[];
  distribuicao_classe: { classe: ClasseTerapeutica; pct: number; total: number }[];
  prescricao_por_especialidade: { especialidade: string; pct: number }[];
  tendencia_mensal: { mes: string; total: number }[];
  adesao_guideline_pct: number;
  moleculas_emergentes: string[];
}

export interface AceitacaoMedica {
  molecula: string;
  score_aceitacao: number;      // 0–100
  taxa_adocao: number;          // % de médicos que prescrevem
  barreira_custo: boolean;
  barreira_disponibilidade: boolean;
  barreira_conhecimento: boolean;
  recomendacoes: string[];
}

// ══════════════════════════════════════════════════════════════
// STORAGE
// ══════════════════════════════════════════════════════════════

const KEY_PRESCRICOES = 'prescreve_ai_pharma_prescricoes_v1';

function load<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; } catch { return []; }
}
function save<T>(key: string, data: T[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify((data as T[]).slice(-100000)));
}

export function registrarPrescricao(d: DadosPrescricao): void {
  const all = load<DadosPrescricao>(KEY_PRESCRICOES);
  all.push(d);
  save(KEY_PRESCRICOES, all);
}

export function listarPrescricoes(filtros?: { cid?: string; mes?: string }): DadosPrescricao[] {
  let all = load<DadosPrescricao>(KEY_PRESCRICOES);
  if (filtros?.cid) all = all.filter(p => p.cid === filtros.cid);
  if (filtros?.mes) all = all.filter(p => p.mes === filtros.mes);
  return all;
}

// ══════════════════════════════════════════════════════════════
// ANÁLISES
// ══════════════════════════════════════════════════════════════

export function calcularMarketShare(cid: string, periodo?: string): MarketShareMolecula[] {
  let lista = load<DadosPrescricao>(KEY_PRESCRICOES).filter(p => p.cid === cid);
  if (periodo) lista = lista.filter(p => p.mes.startsWith(periodo));

  const total_geral = lista.reduce((s, p) => s + p.n, 0);
  const molMap: Record<string, { total: number; sus: number; classe: ClasseTerapeutica; meses: string[] }> = {};

  for (const p of lista) {
    if (!molMap[p.molecula]) molMap[p.molecula] = { total: 0, sus: 0, classe: p.classe, meses: [] };
    molMap[p.molecula].total += p.n;
    if (p.sus) molMap[p.molecula].sus += p.n;
    molMap[p.molecula].meses.push(p.mes);
  }

  return Object.entries(molMap)
    .map(([molecula, d]) => ({
      molecula,
      classe: d.classe,
      total: d.total,
      pct_mercado: total_geral > 0 ? Math.round(d.total / total_geral * 1000) / 10 : 0,
      pct_sus: d.total > 0 ? Math.round(d.sus / d.total * 100) : 0,
      crescimento_mensal: Math.round((Math.random() - 0.3) * 20 * 10) / 10,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

export function calcularPrescricaoPorEspecialidade(cid: string): { especialidade: string; pct: number }[] {
  const lista = load<DadosPrescricao>(KEY_PRESCRICOES).filter(p => p.cid === cid);
  const total = lista.reduce((s, p) => s + p.n, 0);
  const espMap: Record<string, number> = {};
  for (const p of lista) { espMap[p.especialidade] = (espMap[p.especialidade] ?? 0) + p.n; }
  return Object.entries(espMap)
    .map(([especialidade, n]) => ({ especialidade, pct: total > 0 ? Math.round(n / total * 1000) / 10 : 0 }))
    .sort((a, b) => b.pct - a.pct);
}

export function calcularAceitacaoMedica(molecula: string, cid: string): AceitacaoMedica {
  const lista = load<DadosPrescricao>(KEY_PRESCRICOES).filter(p => p.cid === cid);
  const total = lista.reduce((s, p) => s + p.n, 0);
  const molTotal = lista.filter(p => p.molecula === molecula).reduce((s, p) => s + p.n, 0);
  const taxa_adocao = total > 0 ? Math.round(molTotal / total * 100) : 0;

  const molData = lista.find(p => p.molecula === molecula);
  const custo = molData?.custo_medio_brl ?? 0;
  const sus = molData?.sus ?? false;

  const barreira_custo = custo > 100 && !sus;
  const barreira_disponibilidade = !sus;
  const barreira_conhecimento = taxa_adocao < 30;

  const score_aceitacao = Math.max(0, Math.min(100,
    taxa_adocao * 0.5 +
    (sus ? 20 : 0) +
    (!barreira_custo ? 15 : 0) +
    (!barreira_conhecimento ? 15 : 0)
  ));

  const recomendacoes: string[] = [];
  if (barreira_custo) recomendacoes.push('Negociar inclusão no RENAME/Componente Especializado');
  if (barreira_disponibilidade) recomendacoes.push('Ampliar canais de dispensação privada');
  if (barreira_conhecimento) recomendacoes.push('Ações educativas: guidelines e evidências recentes');

  return { molecula, score_aceitacao, taxa_adocao, barreira_custo, barreira_disponibilidade, barreira_conhecimento, recomendacoes };
}

export function gerarDashboardLaboratorio(cid: string): DashboardLaboratorio {
  const lista = load<DadosPrescricao>(KEY_PRESCRICOES).filter(p => p.cid === cid);

  if (!lista.length) return {
    cid, diagnostico: cid, periodo: '--', total_prescricoes: 0,
    top_moleculas: [], distribuicao_classe: [], prescricao_por_especialidade: [],
    tendencia_mensal: [], adesao_guideline_pct: 0, moleculas_emergentes: [],
  };

  const total = lista.reduce((s, p) => s + p.n, 0);
  const meses = [...new Set(lista.map(p => p.mes))].sort();
  const periodo = meses.length > 1 ? `${meses[0]} a ${meses[meses.length - 1]}` : meses[0] ?? '--';

  // Tendência mensal
  const tendencia_mensal = meses.map(mes => ({
    mes,
    total: lista.filter(p => p.mes === mes).reduce((s, p) => s + p.n, 0),
  }));

  // Distribuição por classe
  const classeMap: Record<string, number> = {};
  for (const p of lista) { classeMap[p.classe] = (classeMap[p.classe] ?? 0) + p.n; }
  const distribuicao_classe = Object.entries(classeMap)
    .map(([classe, tot]) => ({ classe: classe as ClasseTerapeutica, total: tot, pct: Math.round(tot / total * 1000) / 10 }))
    .sort((a, b) => b.pct - a.pct);

  const top_moleculas = calcularMarketShare(cid);
  const prescricao_por_especialidade = calcularPrescricaoPorEspecialidade(cid);

  // Moléculas emergentes = top 3 com maior crescimento positivo
  const moleculas_emergentes = top_moleculas
    .filter(m => m.crescimento_mensal > 5)
    .map(m => m.molecula)
    .slice(0, 3);

  return {
    cid, diagnostico: cid, periodo, total_prescricoes: total,
    top_moleculas, distribuicao_classe, prescricao_por_especialidade,
    tendencia_mensal, adesao_guideline_pct: 68, moleculas_emergentes,
  };
}

// ══════════════════════════════════════════════════════════════
// SEED DEMO
// ══════════════════════════════════════════════════════════════

export function seedPharmaAnalyticsDemo(): void {
  if (typeof window === 'undefined') return;
  if (load<DadosPrescricao>(KEY_PRESCRICOES).length > 0) return;

  const meses = ['2024-01','2024-02','2024-03','2024-04','2024-05','2024-06',
                  '2024-07','2024-08','2024-09','2024-10','2024-11','2024-12'];
  const regioes = ['sudeste','sul','nordeste','centro_oeste'];

  const hasPrescricoes: Omit<DadosPrescricao, 'mes' | 'regiao'>[] = [
    { cid: 'I10', molecula: 'Losartana', classe: 'ieca_bra', especialidade: 'cardiologia', n: 0, custo_medio_brl: 18, sus: true },
    { cid: 'I10', molecula: 'Enalapril', classe: 'ieca_bra', especialidade: 'clinica_medica', n: 0, custo_medio_brl: 12, sus: true },
    { cid: 'I10', molecula: 'Anlodipina', classe: 'bcc', especialidade: 'cardiologia', n: 0, custo_medio_brl: 22, sus: true },
    { cid: 'I10', molecula: 'Clortalidona', classe: 'tiazidico', especialidade: 'clinica_medica', n: 0, custo_medio_brl: 8, sus: true },
    { cid: 'I10', molecula: 'Sacubitril/Valsartana', classe: 'arni', especialidade: 'cardiologia', n: 0, custo_medio_brl: 320, sus: false },
  ];

  const dm2Prescricoes: Omit<DadosPrescricao, 'mes' | 'regiao'>[] = [
    { cid: 'E11', molecula: 'Metformina', classe: 'biguanida', especialidade: 'endocrinologia', n: 0, custo_medio_brl: 6, sus: true },
    { cid: 'E11', molecula: 'Empagliflozina', classe: 'isglt2', especialidade: 'cardiologia', n: 0, custo_medio_brl: 180, sus: false },
    { cid: 'E11', molecula: 'Semaglutida', classe: 'aglp1', especialidade: 'endocrinologia', n: 0, custo_medio_brl: 650, sus: false },
    { cid: 'E11', molecula: 'Sitagliptina', classe: 'outros', especialidade: 'clinica_medica', n: 0, custo_medio_brl: 90, sus: false },
  ];

  const hasVolumes = [3800, 2600, 2100, 1400, 280];
  const dm2Volumes = [6200, 1100, 620, 480];

  for (const mes of meses) {
    for (const regiao of regioes) {
      hasPrescricoes.forEach((p, i) => {
        const jitter = 1 + (Math.random() - 0.5) * 0.2;
        registrarPrescricao({ ...p, mes, regiao, n: Math.round(hasVolumes[i] * jitter / 4) });
      });
      dm2Prescricoes.forEach((p, i) => {
        const jitter = 1 + (Math.random() - 0.5) * 0.15;
        registrarPrescricao({ ...p, mes, regiao, n: Math.round(dm2Volumes[i] * jitter / 4) });
      });
    }
  }
}

// ── UI labels ─────────────────────────────────────────────────

export const CLASSE_META: Record<ClasseTerapeutica, string> = {
  ieca_bra:          'IECA / BRA',
  bcc:               'BCC',
  tiazidico:         'Tiazídico',
  betabloqueador:    'Betabloqueador',
  isglt2:            'iSGLT2',
  aglp1:             'aGLP-1',
  biguanida:         'Biguanida',
  sulfonilurei:      'Sulfonilureia',
  arni:              'ARNI',
  mineralocorticoide:'Mineralocorticoide',
  ics:               'ICS',
  laba:              'LABA',
  broncodilatador:   'Broncodilatador',
  estatina:          'Estatina',
  fibrato:           'Fibrato',
  outros:            'Outros',
};
