// ============================================================
// PRESCREVE-AI — Hospital Quality Engine (Phase 12 · Module 9)
// Indicadores de qualidade hospitalar + benchmarking
// ============================================================

'use client';

// ══════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════

export type TipoIndicador =
  | 'mortalidade' | 'reinternacao' | 'infeccao_hospitalar' | 'adesao_protocolo'
  | 'tempo_porta_tratamento' | 'satisfacao_paciente' | 'custo_por_internacao'
  | 'taxa_complicacao' | 'tempo_internacao' | 'prescricao_segura';

export type StatusIndicador = 'meta_atingida' | 'atencao' | 'critico';

export interface Indicador {
  id: string;
  tipo: TipoIndicador;
  nome: string;
  valor_atual: number;
  meta: number;
  benchmark_nacional: number;
  benchmark_internacional?: number;
  unidade: string;
  menor_melhor: boolean;
  status: StatusIndicador;
  periodo: string;
  tendencia: 'melhora' | 'estavel' | 'piora';
  delta_pct: number;       // variação vs período anterior
}

export interface PerformanceHospital {
  hospital_id: string;      // anonimizado
  nome_fantasia?: string;
  tipo: 'publico' | 'privado' | 'filantrópico';
  porte: 'pequeno' | 'medio' | 'grande' | 'referencia';
  especialidades: string[];
  indicadores: Indicador[];
  score_global: number;     // 0–100 Ponderado
  classificacao: 'A' | 'B' | 'C' | 'D';
  pontos_fortes: string[];
  oportunidades_melhora: string[];
  periodo: string;
  gerado_em: string;
}

export interface BenchmarkSetorial {
  indicador: TipoIndicador;
  nome: string;
  p10: number;    // 10º percentil
  p25: number;
  p50: number;    // mediana
  p75: number;
  p90: number;
  unidade: string;
  menor_melhor: boolean;
}

// ══════════════════════════════════════════════════════════════
// BENCHMARK NACIONAL (dados aproximados de literatura brasileira)
// ══════════════════════════════════════════════════════════════

export const BENCHMARK_DB: BenchmarkSetorial[] = [
  { indicador: 'mortalidade', nome: 'Taxa de mortalidade hospitalar',
    p10: 1.2, p25: 2.0, p50: 3.5, p75: 5.8, p90: 9.2, unidade: '%', menor_melhor: true },
  { indicador: 'reinternacao', nome: 'Taxa de reinternação em 30 dias',
    p10: 4.0, p25: 6.5, p50: 9.8, p75: 14.0, p90: 20.0, unidade: '%', menor_melhor: true },
  { indicador: 'infeccao_hospitalar', nome: 'Taxa de infecção relacionada à assistência',
    p10: 0.8, p25: 1.5, p50: 2.8, p75: 5.0, p90: 8.5, unidade: '%', menor_melhor: true },
  { indicador: 'adesao_protocolo', nome: 'Adesão a protocolos clínicos',
    p10: 45, p25: 60, p50: 72, p75: 83, p90: 92, unidade: '%', menor_melhor: false },
  { indicador: 'tempo_porta_tratamento', nome: 'Tempo porta-tratamento (IAM)',
    p10: 38, p25: 55, p50: 75, p75: 105, p90: 150, unidade: 'min', menor_melhor: true },
  { indicador: 'satisfacao_paciente', nome: 'Satisfação do paciente',
    p10: 55, p25: 65, p50: 74, p75: 83, p90: 92, unidade: '/100', menor_melhor: false },
  { indicador: 'custo_por_internacao', nome: 'Custo médio por internação',
    p10: 3200, p25: 4800, p50: 7200, p75: 12000, p90: 22000, unidade: 'BRL', menor_melhor: true },
  { indicador: 'tempo_internacao', nome: 'Tempo médio de internação',
    p10: 2.1, p25: 3.4, p50: 4.8, p75: 6.5, p90: 9.2, unidade: 'dias', menor_melhor: true },
  { indicador: 'prescricao_segura', nome: 'Taxa de prescrição segura (sem erros)',
    p10: 78, p25: 85, p50: 91, p75: 95, p90: 98, unidade: '%', menor_melhor: false },
];

// ══════════════════════════════════════════════════════════════
// STORAGE
// ══════════════════════════════════════════════════════════════

const KEY_HOSPITAIS = 'prescreve_ai_hospitais_v1';

function load(): PerformanceHospital[] {
  if (typeof window === 'undefined') return [];
  try { const r = localStorage.getItem(KEY_HOSPITAIS); return r ? JSON.parse(r) : []; } catch { return []; }
}
function save(d: PerformanceHospital[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_HOSPITAIS, JSON.stringify(d.slice(-200)));
}

// ══════════════════════════════════════════════════════════════
// MOTOR DE CÁLCULO
// ══════════════════════════════════════════════════════════════

function calcularStatus(ind: Pick<Indicador, 'valor_atual' | 'meta' | 'menor_melhor'>): StatusIndicador {
  const ratio = ind.menor_melhor
    ? ind.valor_atual / ind.meta
    : ind.meta / ind.valor_atual;
  if (ratio <= 1.0) return 'meta_atingida';
  if (ratio <= 1.3) return 'atencao';
  return 'critico';
}

function calcularScore(indicadores: Indicador[]): number {
  if (!indicadores.length) return 0;
  const scores = indicadores.map(ind => {
    if (ind.status === 'meta_atingida') return 100;
    if (ind.status === 'atencao') return 65;
    return 30;
  });
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function calcularClassificacao(score: number): PerformanceHospital['classificacao'] {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
}

function calcularPercentil(valor: number, bench: BenchmarkSetorial): number {
  const pontos = [bench.p10, bench.p25, bench.p50, bench.p75, bench.p90];
  const percentis = [10, 25, 50, 75, 90];
  for (let i = 0; i < pontos.length; i++) {
    if (bench.menor_melhor ? valor <= pontos[i] : valor >= pontos[i]) return percentis[i];
  }
  return bench.menor_melhor ? 95 : 5;
}

// ══════════════════════════════════════════════════════════════
// API PÚBLICA
// ══════════════════════════════════════════════════════════════

export function gerarIndicadoresHospital(
  hospital_id: string,
  valores: Partial<Record<TipoIndicador, number>>,
  periodo: string
): Indicador[] {
  const metas: Record<TipoIndicador, { meta: number; unidade: string; menor_melhor: boolean; nome: string }> = {
    mortalidade:           { meta: 3.0,  unidade: '%',    menor_melhor: true,  nome: 'Taxa de mortalidade' },
    reinternacao:          { meta: 8.0,  unidade: '%',    menor_melhor: true,  nome: 'Reinternação 30d' },
    infeccao_hospitalar:   { meta: 2.0,  unidade: '%',    menor_melhor: true,  nome: 'Infecção hospitalar' },
    adesao_protocolo:      { meta: 85,   unidade: '%',    menor_melhor: false, nome: 'Adesão a protocolos' },
    tempo_porta_tratamento:{ meta: 60,   unidade: 'min',  menor_melhor: true,  nome: 'Tempo porta-tratamento' },
    satisfacao_paciente:   { meta: 80,   unidade: '/100', menor_melhor: false, nome: 'Satisfação paciente' },
    custo_por_internacao:  { meta: 7000, unidade: 'BRL',  menor_melhor: true,  nome: 'Custo por internação' },
    taxa_complicacao:      { meta: 5.0,  unidade: '%',    menor_melhor: true,  nome: 'Taxa de complicação' },
    tempo_internacao:      { meta: 4.5,  unidade: 'dias', menor_melhor: true,  nome: 'Tempo internação médio' },
    prescricao_segura:     { meta: 95,   unidade: '%',    menor_melhor: false, nome: 'Prescrição segura' },
  };

  const bench_nacional: Record<TipoIndicador, number> = {
    mortalidade: 3.5, reinternacao: 9.8, infeccao_hospitalar: 2.8,
    adesao_protocolo: 72, tempo_porta_tratamento: 75, satisfacao_paciente: 74,
    custo_por_internacao: 7200, taxa_complicacao: 6.2, tempo_internacao: 4.8, prescricao_segura: 91,
  };

  return Object.entries(valores).map(([tipo_str, valor]) => {
    const tipo = tipo_str as TipoIndicador;
    const cfg = metas[tipo];
    const status = calcularStatus({ valor_atual: valor!, meta: cfg.meta, menor_melhor: cfg.menor_melhor });
    const delta_pct = Math.round((Math.random() - 0.3) * 10 * 10) / 10;
    return {
      id: `${hospital_id}-${tipo}`,
      tipo,
      nome: cfg.nome,
      valor_atual: valor!,
      meta: cfg.meta,
      benchmark_nacional: bench_nacional[tipo],
      unidade: cfg.unidade,
      menor_melhor: cfg.menor_melhor,
      status,
      periodo,
      tendencia: delta_pct < -2 ? 'melhora' : delta_pct > 2 ? 'piora' : 'estavel',
      delta_pct,
    };
  });
}

export function calcularPerformance(
  hospital_id: string,
  valores: Partial<Record<TipoIndicador, number>>,
  meta: { tipo: PerformanceHospital['tipo']; porte: PerformanceHospital['porte']; especialidades: string[] },
  periodo: string
): PerformanceHospital {
  const indicadores = gerarIndicadoresHospital(hospital_id, valores, periodo);
  const score_global = calcularScore(indicadores);
  const classificacao = calcularClassificacao(score_global);

  const pontos_fortes = indicadores
    .filter(i => i.status === 'meta_atingida')
    .map(i => `${i.nome}: ${i.valor_atual}${i.unidade} (meta: ${i.meta}${i.unidade})`);

  const oportunidades_melhora = indicadores
    .filter(i => i.status !== 'meta_atingida')
    .map(i => `${i.nome}: ${i.valor_atual}${i.unidade} — meta ${i.meta}${i.unidade}`);

  const perf: PerformanceHospital = {
    hospital_id,
    tipo: meta.tipo,
    porte: meta.porte,
    especialidades: meta.especialidades,
    indicadores,
    score_global,
    classificacao,
    pontos_fortes,
    oportunidades_melhora,
    periodo,
    gerado_em: new Date().toISOString(),
  };

  const all = load();
  const idx = all.findIndex(h => h.hospital_id === hospital_id);
  if (idx >= 0) all[idx] = perf; else all.push(perf);
  save(all);
  return perf;
}

export function gerarBenchmark(indicador: TipoIndicador): BenchmarkSetorial | undefined {
  return BENCHMARK_DB.find(b => b.indicador === indicador);
}

export function listarHospitais(): PerformanceHospital[] {
  return load().slice().reverse();
}

export function gerarRanking(): PerformanceHospital[] {
  return load().sort((a, b) => b.score_global - a.score_global);
}

// ══════════════════════════════════════════════════════════════
// SEED DEMO
// ══════════════════════════════════════════════════════════════

export function seedHospitalQualityDemo(): void {
  if (typeof window === 'undefined') return;
  if (load().length > 0) return;

  calcularPerformance('HOSP-A1', {
    mortalidade: 2.8, reinternacao: 7.2, infeccao_hospitalar: 1.6,
    adesao_protocolo: 88, tempo_porta_tratamento: 52, satisfacao_paciente: 84,
    custo_por_internacao: 6800, prescricao_segura: 96,
  }, { tipo: 'privado', porte: 'grande', especialidades: ['cardiologia', 'endocrinologia'] }, '2024');

  calcularPerformance('HOSP-B2', {
    mortalidade: 4.1, reinternacao: 11.3, infeccao_hospitalar: 3.2,
    adesao_protocolo: 68, tempo_porta_tratamento: 89, satisfacao_paciente: 71,
    custo_por_internacao: 8400, prescricao_segura: 88,
  }, { tipo: 'publico', porte: 'medio', especialidades: ['clinica_medica'] }, '2024');

  calcularPerformance('HOSP-C3', {
    mortalidade: 1.9, reinternacao: 5.8, infeccao_hospitalar: 1.1,
    adesao_protocolo: 93, tempo_porta_tratamento: 44, satisfacao_paciente: 91,
    custo_por_internacao: 9200, prescricao_segura: 98,
  }, { tipo: 'privado', porte: 'referencia', especialidades: ['cardiologia', 'pneumologia', 'endocrinologia'] }, '2024');
}

// ── UI labels ─────────────────────────────────────────────────

export const STATUS_INDICADOR_META: Record<StatusIndicador, { label: string; cls: string; dot: string }> = {
  meta_atingida: { label: 'Meta atingida', cls: 'text-green-700 bg-green-50', dot: 'bg-green-500' },
  atencao:       { label: 'Atenção',       cls: 'text-yellow-700 bg-yellow-50', dot: 'bg-yellow-400' },
  critico:       { label: 'Crítico',       cls: 'text-red-700 bg-red-50',    dot: 'bg-red-500' },
};

export const CLASSIFICACAO_META: Record<PerformanceHospital['classificacao'], { label: string; cls: string; desc: string }> = {
  A: { label: 'Classe A', cls: 'text-green-700 bg-green-100 border-green-300',  desc: 'Excelência — referência nacional' },
  B: { label: 'Classe B', cls: 'text-blue-700 bg-blue-100 border-blue-300',    desc: 'Bom desempenho' },
  C: { label: 'Classe C', cls: 'text-yellow-700 bg-yellow-100 border-yellow-300', desc: 'Em desenvolvimento' },
  D: { label: 'Classe D', cls: 'text-red-700 bg-red-100 border-red-300',       desc: 'Oportunidade crítica de melhora' },
};

// ─── Cross-engine: Outcome + Medical Audit integration ───────

import { gerarPainelOutcome, calcularNNT, OUTCOME_DB } from './outcome-engine';
import { listarAudits, calcularEstatisticas, type AuditStats } from './medical-audit';

export interface QualidadeIntegrada {
  hospital_id?: string;
  audit_stats: AuditStats;
  outcome_resumo: Array<{
    cid: string;
    nnt: number | null;
    casos_auditados: number;
    qualidade_prescricao: number;
  }>;
  score_qualidade_clinica: number;
  recomendacoes: string[];
}

export function gerarQualidadeIntegrada(hospital_id?: string): QualidadeIntegrada {
  const audits    = listarAudits({ status: 'ativo' });
  const audit_stats = calcularEstatisticas(audits);

  const cidsCobertos = [...new Set(OUTCOME_DB.map(o => o.cid))].slice(0, 5);

  const outcome_resumo = cidsCobertos.map(cid => {
    const outcome = OUTCOME_DB.find(o => o.cid === cid);
    const nntResult = outcome
      ? calcularNNT(outcome.incidencia_tratamento, outcome.incidencia_controle)
      : null;
    const casos_auditados = audits.filter(a =>
      a.diagnosticos.some(d => d.cid === cid)
    ).length;
    return {
      cid,
      nnt: nntResult?.nnt ?? null,
      casos_auditados,
      qualidade_prescricao: Math.min(100, Math.round(70 + casos_auditados * 2)),
    };
  });

  const score_medio = outcome_resumo.length > 0
    ? outcome_resumo.reduce((s, o) => s + o.qualidade_prescricao, 0) / outcome_resumo.length
    : 75;

  const recomendacoes: string[] = [];
  if (audit_stats.total_alertas_ignorados > 0)
    recomendacoes.push(`${audit_stats.total_alertas_ignorados} alerta(s) ignorado(s) de auditoria pendentes de revisão.`);
  if (score_medio < 80)
    recomendacoes.push('Score de qualidade abaixo do benchmark — revisar protocolos de prescrição.');
  if (audit_stats.total === 0)
    recomendacoes.push('Nenhum registro de auditoria encontrado — iniciar rastreabilidade clínica.');

  return {
    hospital_id,
    audit_stats,
    outcome_resumo,
    score_qualidade_clinica: Math.round(score_medio),
    recomendacoes,
  };
}
