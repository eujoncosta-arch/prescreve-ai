// ============================================================
// PRESCREVE-AI — Patient Digital Twin (Phase 12 · Module 2)
// Simulação de tratamento e projeção de desfechos personalizados
// ============================================================

'use client';

import { gerarPrognostico, type PerfilPrognostico, type Prognostico } from './prognosis-engine';
import { calcularNNT, type OutcomeCalculado } from './outcome-engine';
import type { AvaliacaoRiscoClinico } from './clinical-risk-engine';

// ══════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════

export type StatusTwin = 'ativo' | 'arquivado';
export type ClasseRisco = 'baixo' | 'intermediario' | 'alto' | 'muito_alto';

export interface PacienteTwin {
  // Demográfico
  idade: number;
  sexo: 'M' | 'F';
  peso_kg: number;
  altura_cm: number;
  imc: number;

  // Comorbidades
  comorbidades: string[];
  medicamentos_atuais: string[];

  // Metabólico
  pa_sistolica?: number;
  pa_diastolica?: number;
  hba1c?: number;
  ldl?: number;
  hdl?: number;
  creatinina?: number;
  tfg?: number;

  // Comportamental
  fumante: boolean;
  atividade_fisica: 'sedentario' | 'irregular' | 'regular' | 'intenso';
  adesao_estimada: number;   // 0–100%
}

export interface DigitalTwin {
  id: string;
  paciente_anonimizado: string;    // hash anônimo
  perfil: PacienteTwin;
  diagnostico_principal: string;
  status: StatusTwin;
  criado_em: string;
  atualizado_em: string;
}

export interface EstrategiaTratamento {
  nome: string;
  moleculas: string[];
  doses: string[];
  duracao_meses: number;
  custo_mes_brl?: number;
  disponivel_sus: boolean;
}

export interface ResultadoSimulacao {
  estrategia: EstrategiaTratamento;
  probabilidade_sucesso: number;   // 0–100%
  probabilidade_ea: number;        // 0–100%
  probabilidade_abandono: number;  // 0–100%
  tempo_estimado_resposta_dias: number;

  // Projeções biométricas 12 meses
  projecoes: {
    pa_sistolica?: number;
    hba1c?: number;
    ldl?: number;
    peso_kg?: number;
  };

  // Score composto
  score_beneficio_risco: number;   // 0–100
  recomendado: boolean;

  // Justificativas
  vantagens: string[];
  limitacoes: string[];
  alertas: string[];
}

export interface ComparacaoEstrategias {
  twin_id: string;
  estrategias: ResultadoSimulacao[];
  melhor_estrategia: string;
  justificativa_escolha: string;
  gerado_em: string;
}

// ══════════════════════════════════════════════════════════════
// STORAGE
// ══════════════════════════════════════════════════════════════

const KEY_TWINS = 'prescreve_ai_digital_twins_v1';
const KEY_COMP  = 'prescreve_ai_twins_comparacoes_v1';

function genId(p: string) { return `${p}-${Date.now().toString(36).toUpperCase()}`; }
function now() { return new Date().toISOString(); }

function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) + h) + s.charCodeAt(i); h |= 0; }
  return `T${Math.abs(h).toString(36).toUpperCase().padStart(8,'0')}`;
}

function loadTwins(): DigitalTwin[] {
  if (typeof window === 'undefined') return [];
  try { const r = localStorage.getItem(KEY_TWINS); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveTwins(d: DigitalTwin[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_TWINS, JSON.stringify(d.slice(-500)));
}

function loadComps(): ComparacaoEstrategias[] {
  if (typeof window === 'undefined') return [];
  try { const r = localStorage.getItem(KEY_COMP); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveComps(d: ComparacaoEstrategias[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_COMP, JSON.stringify(d.slice(-1000)));
}

// ══════════════════════════════════════════════════════════════
// MOTOR DE SIMULAÇÃO
// ══════════════════════════════════════════════════════════════

function calcIMC(peso: number, altura_cm: number) { return +(peso / ((altura_cm / 100) ** 2)).toFixed(1); }

function fatorRisco(perfil: PacienteTwin): number {
  // 0 = baixo risco, 1 = alto risco
  let r = 0;
  if (perfil.idade > 65) r += 0.15;
  if (perfil.imc > 30) r += 0.10;
  if (perfil.fumante) r += 0.12;
  if (perfil.adesao_estimada < 70) r += 0.15;
  if (perfil.comorbidades.length > 3) r += 0.10;
  if (perfil.atividade_fisica === 'sedentario') r += 0.08;
  if (perfil.tfg && perfil.tfg < 60) r += 0.15;
  if (perfil.hba1c && perfil.hba1c > 9) r += 0.10;
  return Math.min(r, 1);
}

function simularEstrategia(perfil: PacienteTwin, est: EstrategiaTratamento): ResultadoSimulacao {
  const fr = fatorRisco(perfil);
  const base_sucesso = 82 - fr * 30;

  // Ajuste por adesão e duração
  const adj_adesao  = (perfil.adesao_estimada - 70) * 0.2;
  const adj_duracao = est.duracao_meses >= 6 ? 5 : 0;

  const probabilidade_sucesso   = Math.min(98, Math.max(30, Math.round(base_sucesso + adj_adesao + adj_duracao)));
  const probabilidade_ea        = Math.round(10 + fr * 25 + est.moleculas.length * 2);
  const probabilidade_abandono  = Math.round(20 - perfil.adesao_estimada * 0.15 + fr * 10);
  const tempo_estimado_resposta_dias = Math.round(21 + fr * 30);

  // Projeções biométricas
  const projecoes: ResultadoSimulacao['projecoes'] = {};
  if (perfil.pa_sistolica) projecoes.pa_sistolica = Math.round(perfil.pa_sistolica * (1 - probabilidade_sucesso / 1000));
  if (perfil.hba1c) projecoes.hba1c = +(perfil.hba1c * (1 - probabilidade_sucesso / 1500)).toFixed(1);
  if (perfil.ldl) projecoes.ldl = Math.round(perfil.ldl * (1 - probabilidade_sucesso / 800));

  const score_beneficio_risco = Math.round((probabilidade_sucesso * 0.6) - (probabilidade_ea * 0.3) - (probabilidade_abandono * 0.1) + 50);

  const vantagens: string[] = [];
  const limitacoes: string[] = [];
  const alertas: string[] = [];

  if (est.disponivel_sus) vantagens.push('Disponível pelo SUS — sem custo ao paciente');
  if (probabilidade_sucesso > 80) vantagens.push(`Alta taxa de sucesso estimada (${probabilidade_sucesso}%)`);
  if (est.moleculas.length === 1) vantagens.push('Monoterapia — facilita adesão');
  if (probabilidade_ea > 25) limitacoes.push(`Risco de eventos adversos: ${probabilidade_ea}%`);
  if (!est.disponivel_sus && (est.custo_mes_brl ?? 0) > 200) limitacoes.push(`Custo elevado: R$ ${est.custo_mes_brl}/mês`);
  if (perfil.tfg && perfil.tfg < 30 && est.moleculas.some(m => m.toLowerCase().includes('metform')))
    alertas.push('Metformina contraindicada com TFG < 30 mL/min/1,73m²');
  if (perfil.fumante) alertas.push('Tabagismo reduz efetividade — cessação tabágica indicada');

  return {
    estrategia: est,
    probabilidade_sucesso,
    probabilidade_ea: Math.min(60, probabilidade_ea),
    probabilidade_abandono: Math.max(5, Math.min(50, probabilidade_abandono)),
    tempo_estimado_resposta_dias,
    projecoes,
    score_beneficio_risco: Math.min(100, Math.max(0, score_beneficio_risco)),
    recomendado: score_beneficio_risco >= 65,
    vantagens,
    limitacoes,
    alertas,
  };
}

// ══════════════════════════════════════════════════════════════
// API PÚBLICA
// ══════════════════════════════════════════════════════════════

export function criarTwin(
  paciente_hash: string,
  perfil_raw: Omit<PacienteTwin, 'imc'>,
  diagnostico_principal: string
): DigitalTwin {
  const imc = calcIMC(perfil_raw.peso_kg, perfil_raw.altura_cm);
  const perfil: PacienteTwin = { ...perfil_raw, imc };
  const twin: DigitalTwin = {
    id: genId('TWIN'),
    paciente_anonimizado: hashStr(paciente_hash),
    perfil,
    diagnostico_principal,
    status: 'ativo',
    criado_em: now(),
    atualizado_em: now(),
  };
  const all = loadTwins();
  all.push(twin);
  saveTwins(all);
  return twin;
}

export function buscarTwin(id: string): DigitalTwin | undefined {
  return loadTwins().find(t => t.id === id);
}

export function listarTwins(status?: StatusTwin): DigitalTwin[] {
  const all = loadTwins();
  return status ? all.filter(t => t.status === status) : all;
}

export function simularTratamento(
  twin: DigitalTwin,
  estrategias: EstrategiaTratamento[]
): ResultadoSimulacao[] {
  return estrategias.map(est => simularEstrategia(twin.perfil, est));
}

export function compararEstrategias(
  twin: DigitalTwin,
  estrategias: EstrategiaTratamento[]
): ComparacaoEstrategias {
  const resultados = simularTratamento(twin, estrategias);
  const melhor = resultados.reduce((best, cur) =>
    cur.score_beneficio_risco > best.score_beneficio_risco ? cur : best
  );
  const comp: ComparacaoEstrategias = {
    twin_id: twin.id,
    estrategias: resultados,
    melhor_estrategia: melhor.estrategia.nome,
    justificativa_escolha: `Melhor índice benefício-risco (${melhor.score_beneficio_risco}/100). ` +
      `Probabilidade de sucesso: ${melhor.probabilidade_sucesso}%.`,
    gerado_em: now(),
  };
  const all = loadComps();
  all.push(comp);
  saveComps(all);
  return comp;
}

export function calcularProbabilidadeSucesso(
  twin: DigitalTwin,
  estrategia: EstrategiaTratamento
): number {
  return simularEstrategia(twin.perfil, estrategia).probabilidade_sucesso;
}

export function projetarDesfecho(
  twin: DigitalTwin,
  estrategia: EstrategiaTratamento,
  horizonte_meses: 1 | 3 | 6 | 12 | 24
): {
  horizonte_meses: number;
  probabilidade_controle: number;
  probabilidade_evento_adverso: number;
  projecao_biometrica: ResultadoSimulacao['projecoes'];
} {
  const sim = simularEstrategia(twin.perfil, estrategia);
  const fator_tempo = Math.min(1, horizonte_meses / 6);
  return {
    horizonte_meses,
    probabilidade_controle: Math.round(sim.probabilidade_sucesso * fator_tempo * 0.95),
    probabilidade_evento_adverso: Math.round(sim.probabilidade_ea * fator_tempo),
    projecao_biometrica: sim.projecoes,
  };
}

// ══════════════════════════════════════════════════════════════
// SEED DEMO
// ══════════════════════════════════════════════════════════════

export function seedDigitalTwinDemo(): void {
  if (typeof window === 'undefined') return;
  if (loadTwins().length > 0) return;

  const twin = criarTwin('demo-paciente-1', {
    idade: 58, sexo: 'M', peso_kg: 92, altura_cm: 175,
    comorbidades: ['Hipertensão Arterial', 'Dislipidemia', 'Sobrepeso'],
    medicamentos_atuais: ['Enalapril 10mg', 'Atorvastatina 20mg'],
    pa_sistolica: 148, pa_diastolica: 94, ldl: 118, hdl: 42,
    creatinina: 1.1, tfg: 74, fumante: false,
    atividade_fisica: 'irregular', adesao_estimada: 72,
  }, 'Hipertensão Arterial Sistêmica (I10)');

  const estrategias: EstrategiaTratamento[] = [
    { nome: 'Intensificação IECA + Tiazídico', moleculas: ['Enalapril', 'Clortalidona'],
      doses: ['20mg 1x/dia', '12,5mg 1x/dia'], duracao_meses: 6, custo_mes_brl: 28, disponivel_sus: true },
    { nome: 'Troca para BRA + BCC', moleculas: ['Losartana', 'Anlodipina'],
      doses: ['100mg 1x/dia', '10mg 1x/dia'], duracao_meses: 6, custo_mes_brl: 42, disponivel_sus: true },
    { nome: 'Quadrupla com iSGLT2', moleculas: ['Enalapril', 'Anlodipina', 'Clortalidona', 'Empagliflozina'],
      doses: ['10mg', '5mg', '12,5mg', '10mg'], duracao_meses: 12, custo_mes_brl: 280, disponivel_sus: false },
  ];

  compararEstrategias(twin, estrategias);
}

// ── UI labels ─────────────────────────────────────────────────

export const ATIVIDADE_META: Record<PacienteTwin['atividade_fisica'], string> = {
  sedentario: 'Sedentário',
  irregular:  'Atividade irregular',
  regular:    'Atividade regular',
  intenso:    'Atleta / alta intensidade',
};

export const CLASSE_RISCO_META: Record<ClasseRisco, { label: string; cls: string }> = {
  baixo:        { label: 'Baixo', cls: 'text-green-700 bg-green-50' },
  intermediario:{ label: 'Intermediário', cls: 'text-yellow-700 bg-yellow-50' },
  alto:         { label: 'Alto', cls: 'text-orange-700 bg-orange-50' },
  muito_alto:   { label: 'Muito alto', cls: 'text-red-700 bg-red-50' },
};

// ─── Cross-engine: Prognosis + Outcome integration ───────────

export interface TwinPrognosis {
  twin_id: string;
  perfil: PerfilPrognostico;
  prognostico_30d: Prognostico;
  prognostico_1a: Prognostico;
  nnt_comparativo: { nnt: number; nnH: number } | null;
}

export function gerarPrognosisTwin(
  twin: DigitalTwin,
  risco?: AvaliacaoRiscoClinico,
): TwinPrognosis {
  const perfil: PerfilPrognostico = {
    cid: twin.diagnostico_principal,
    idade: twin.perfil.idade,
    sexo: twin.perfil.sexo,
    comorbidades: twin.perfil.comorbidades,
  };

  const prog30d = gerarPrognostico(perfil, '30d');
  const prog1a  = gerarPrognostico(perfil, '1a');

  let nnt_comparativo: { nnt: number; nnH: number } | null = null;
  if (risco) {
    const incTratamento = risco.score_global / 100 * 0.4;
    const incControle   = risco.score_global / 100 * 0.7;
    const nntResult = calcularNNT(incTratamento, incControle);
    nnt_comparativo = { nnt: nntResult.nnt, nnH: nntResult.nnt * 1.8 };
  }

  return { twin_id: twin.id, perfil, prognostico_30d: prog30d, prognostico_1a: prog1a, nnt_comparativo };
}
