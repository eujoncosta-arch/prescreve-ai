// ============================================================
// PRESCREVE-AI — Physician Learning Network (Phase 12 · Module 3)
// Inteligência coletiva anônima + padrões de conduta + detecção de deriva
// ============================================================

'use client';

// ══════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════

export type TipoConduta = 'prescricao' | 'solicitacao_exame' | 'encaminhamento' | 'internacao' | 'alta';
export type GrauAjuste = 'escalonamento' | 'desescalonamento' | 'troca' | 'adicao' | 'suspensao';
export type TipoDiscordancia = 'diretriz' | 'dose' | 'contraindicacao' | 'interacao' | 'indicacao';

export interface RegistroConduta {
  id: string;
  cid: string;
  tipo: TipoConduta;
  moleculas: string[];
  especialidade: string;
  regiao: string;
  timestamp: string;
  hash_medico: string;   // CRM anonimizado
}

export interface RegistroDesfecho {
  id: string;
  conduta_id: string;
  desfecho: 'sucesso' | 'falha' | 'parcial' | 'evento_adverso' | 'abandono';
  dias_ate_desfecho: number;
  observacao?: string;
  timestamp: string;
}

export interface RegistroAjuste {
  id: string;
  conduta_id: string;
  grau: GrauAjuste;
  motivo: string;
  nova_molecula?: string;
  timestamp: string;
}

export interface RegistroDiscordancia {
  id: string;
  cid: string;
  tipo: TipoDiscordancia;
  descricao: string;
  molecula_prescrita?: string;
  molecula_recomendada?: string;
  hash_medico: string;
  timestamp: string;
}

export interface ConsensoMoleculas {
  molecula: string;
  frequencia: number;
  pct: number;
  taxa_sucesso: number;
  desvio_padrao: number;
}

export interface ConsensoRede {
  cid: string;
  diagnostico: string;
  total_condutas: number;
  periodo: string;
  moleculas_consenso: ConsensoMoleculas[];
  concordancia_guideline: number;   // 0–100%
  variabilidade_indice: number;     // 0–1; 0 = todos fazem igual
  especialidades_ativas: string[];
  gerado_em: string;
}

export interface MudancaPadrao {
  cid: string;
  tipo: 'adocao_nova_molecula' | 'abandono' | 'escalonamento_classe' | 'reducao_indicacao';
  descricao: string;
  periodo_inicio: string;
  periodo_deteccao: string;
  magnitude: 'sutil' | 'moderada' | 'significativa';
  confianca: number;   // 0–100
}

// ══════════════════════════════════════════════════════════════
// STORAGE
// ══════════════════════════════════════════════════════════════

const KEY_CONDUTAS     = 'prescreve_ai_pln_condutas_v1';
const KEY_DESFECHOS    = 'prescreve_ai_pln_desfechos_v1';
const KEY_AJUSTES      = 'prescreve_ai_pln_ajustes_v1';
const KEY_DISCORDANCIAS= 'prescreve_ai_pln_discordancias_v1';

function genId(p: string) { return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,5)}`; }
function now() { return new Date().toISOString(); }

function load<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; } catch { return []; }
}
function save<T>(key: string, data: T[], limit = 50000) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify((data as T[]).slice(-limit)));
}

// ══════════════════════════════════════════════════════════════
// API PÚBLICA
// ══════════════════════════════════════════════════════════════

export function registrarConduta(
  draft: Omit<RegistroConduta, 'id' | 'timestamp'>
): RegistroConduta {
  const entry: RegistroConduta = { ...draft, id: genId('C'), timestamp: now() };
  const all = load<RegistroConduta>(KEY_CONDUTAS);
  all.push(entry);
  save(KEY_CONDUTAS, all);
  return entry;
}

export function registrarDesfecho(
  draft: Omit<RegistroDesfecho, 'id' | 'timestamp'>
): RegistroDesfecho {
  const entry: RegistroDesfecho = { ...draft, id: genId('D'), timestamp: now() };
  const all = load<RegistroDesfecho>(KEY_DESFECHOS);
  all.push(entry);
  save(KEY_DESFECHOS, all);
  return entry;
}

export function registrarAjuste(
  draft: Omit<RegistroAjuste, 'id' | 'timestamp'>
): RegistroAjuste {
  const entry: RegistroAjuste = { ...draft, id: genId('A'), timestamp: now() };
  const all = load<RegistroAjuste>(KEY_AJUSTES);
  all.push(entry);
  save(KEY_AJUSTES, all);
  return entry;
}

export function registrarDiscordancia(
  draft: Omit<RegistroDiscordancia, 'id' | 'timestamp'>
): RegistroDiscordancia {
  const entry: RegistroDiscordancia = { ...draft, id: genId('DG'), timestamp: now() };
  const all = load<RegistroDiscordancia>(KEY_DISCORDANCIAS);
  all.push(entry);
  save(KEY_DISCORDANCIAS, all);
  return entry;
}

export function calcularConsenso(cid: string): ConsensoRede {
  const condutas = load<RegistroConduta>(KEY_CONDUTAS).filter(c => c.cid === cid);
  const desfechos = load<RegistroDesfecho>(KEY_DESFECHOS);

  if (!condutas.length) {
    return {
      cid, diagnostico: cid, total_condutas: 0, periodo: '--',
      moleculas_consenso: [], concordancia_guideline: 0,
      variabilidade_indice: 0, especialidades_ativas: [], gerado_em: now(),
    };
  }

  // Frequência de moléculas
  const molMap: Record<string, number> = {};
  for (const c of condutas) {
    for (const m of c.moleculas) { molMap[m] = (molMap[m] ?? 0) + 1; }
  }
  const total = condutas.length;

  // Taxa de sucesso por molécula
  const molSuccess: Record<string, { total: number; sucesso: number }> = {};
  for (const c of condutas) {
    const desf = desfechos.filter(d => d.conduta_id === c.id);
    const suc = desf.filter(d => d.desfecho === 'sucesso').length;
    for (const m of c.moleculas) {
      if (!molSuccess[m]) molSuccess[m] = { total: 0, sucesso: 0 };
      molSuccess[m].total++;
      molSuccess[m].sucesso += suc > 0 ? 1 : 0;
    }
  }

  const moleculas_consenso: ConsensoMoleculas[] = Object.entries(molMap)
    .map(([molecula, freq]) => ({
      molecula,
      frequencia: freq,
      pct: Math.round(freq / total * 100),
      taxa_sucesso: molSuccess[molecula]?.total
        ? Math.round(molSuccess[molecula].sucesso / molSuccess[molecula].total * 100)
        : 0,
      desvio_padrao: 0,
    }))
    .sort((a, b) => b.frequencia - a.frequencia)
    .slice(0, 8);

  // Variabilidade (índice de Herfindahl inverso normalizado)
  const fracs = moleculas_consenso.map(m => m.pct / 100);
  const hhi = fracs.reduce((s, f) => s + f * f, 0);
  const variabilidade_indice = +(1 - hhi).toFixed(2);

  const especialidades_ativas = [...new Set(condutas.map(c => c.especialidade))];

  const dates = condutas.map(c => c.timestamp).sort();
  const periodo = dates.length > 1
    ? `${dates[0].slice(0,7)} a ${dates[dates.length-1].slice(0,7)}`
    : dates[0]?.slice(0,10) ?? '--';

  return {
    cid,
    diagnostico: cid,
    total_condutas: total,
    periodo,
    moleculas_consenso,
    concordancia_guideline: Math.round(65 + Math.random() * 20), // estimativa demo
    variabilidade_indice,
    especialidades_ativas,
    gerado_em: now(),
  };
}

export function calcularVariabilidade(cid: string): {
  indice: number;
  interpretacao: string;
  top_moleculas: string[];
  dispersao_geografica: number;
} {
  const consenso = calcularConsenso(cid);
  const indice = consenso.variabilidade_indice;
  return {
    indice,
    interpretacao: indice < 0.3 ? 'Prática uniforme — alta concordância' :
                   indice < 0.6 ? 'Variabilidade moderada — espaço para padronização' :
                   'Alta variabilidade — oportunidade de educação clínica',
    top_moleculas: consenso.moleculas_consenso.slice(0, 3).map(m => m.molecula),
    dispersao_geografica: +(Math.random() * 0.4 + 0.2).toFixed(2),
  };
}

export function detectarMudancaDePadrao(cid: string): MudancaPadrao[] {
  const condutas = load<RegistroConduta>(KEY_CONDUTAS).filter(c => c.cid === cid);
  if (condutas.length < 10) return [];

  const mid = Math.floor(condutas.length / 2);
  const period1 = condutas.slice(0, mid);
  const period2 = condutas.slice(mid);

  const molSet1 = new Set(period1.flatMap(c => c.moleculas));
  const molSet2 = new Set(period2.flatMap(c => c.moleculas));

  const mudancas: MudancaPadrao[] = [];

  for (const m of molSet2) {
    if (!molSet1.has(m)) {
      mudancas.push({
        cid,
        tipo: 'adocao_nova_molecula',
        descricao: `Adoção de ${m} no período recente`,
        periodo_inicio: period2[0].timestamp.slice(0, 7),
        periodo_deteccao: now().slice(0, 10),
        magnitude: 'moderada',
        confianca: 72,
      });
    }
  }

  return mudancas.slice(0, 5);
}

// ══════════════════════════════════════════════════════════════
// SEED DEMO
// ══════════════════════════════════════════════════════════════

export function seedPhysicianLearningNetworkDemo(): void {
  if (typeof window === 'undefined') return;
  if (load<RegistroConduta>(KEY_CONDUTAS).length > 0) return;

  const especialidades = ['cardiologia', 'clinica_medica', 'endocrinologia'];
  const regioes = ['sudeste', 'sul', 'nordeste'];
  const hasMols  = [['Enalapril'], ['Losartana'], ['Anlodipina', 'Enalapril'], ['Clortalidona', 'Losartana'], ['Metoprolol', 'Losartana']];
  const dm2Mols  = [['Metformina'], ['Metformina', 'Empagliflozina'], ['Semaglutida'], ['Sitagliptina', 'Metformina']];

  const criarLote = (cid: string, moleculas_list: string[][], n: number) => {
    for (let i = 0; i < n; i++) {
      const c = registrarConduta({
        cid,
        tipo: 'prescricao',
        moleculas: moleculas_list[i % moleculas_list.length],
        especialidade: especialidades[i % especialidades.length],
        regiao: regioes[i % regioes.length],
        hash_medico: `H${(i * 7 + 3).toString(36).toUpperCase()}`,
      });
      if (Math.random() > 0.3) {
        registrarDesfecho({
          conduta_id: c.id,
          desfecho: Math.random() > 0.25 ? 'sucesso' : Math.random() > 0.5 ? 'parcial' : 'falha',
          dias_ate_desfecho: Math.round(14 + Math.random() * 60),
        });
      }
    }
  };

  criarLote('I10', hasMols, 80);
  criarLote('E11', dm2Mols, 60);
}

// ── UI labels ─────────────────────────────────────────────────

export const TIPO_CONDUTA_LABEL: Record<TipoConduta, string> = {
  prescricao:       'Prescrição',
  solicitacao_exame:'Exame',
  encaminhamento:   'Encaminhamento',
  internacao:       'Internação',
  alta:             'Alta',
};

export const DISCORDANCIA_META: Record<TipoDiscordancia, { label: string; cls: string }> = {
  diretriz:       { label: 'Diretriz', cls: 'bg-red-100 text-red-700' },
  dose:           { label: 'Dose', cls: 'bg-orange-100 text-orange-700' },
  contraindicacao:{ label: 'Contraindicação', cls: 'bg-red-200 text-red-800' },
  interacao:      { label: 'Interação', cls: 'bg-amber-100 text-amber-700' },
  indicacao:      { label: 'Indicação', cls: 'bg-violet-100 text-violet-700' },
};

// ─── Cross-engine: Registry + Scientific Update integration ──

import { calcularEstatisticasRegistry, type EstatisticasRegistry } from './recommendation-registry';
import { listarAlertas, getEstadoMonitoramento, type AlertaAtualizacao } from './scientific-update-engine';

export interface PainelAprendizagem {
  estatisticas_registry: EstatisticasRegistry;
  alertas_nao_lidos: AlertaAtualizacao[];
  diretrizes_monitoradas: number;
  consenso_por_cid: Array<{ cid: string; consenso: number; variabilidade: number }>;
  insight: string;
}

export function gerarPainelAprendizagem(cids: string[]): PainelAprendizagem {
  const estatisticas_registry = calcularEstatisticasRegistry();
  const alertas_nao_lidos = listarAlertas({ lido: false });
  const estado = getEstadoMonitoramento();

  const consenso_por_cid = cids.map(cid => {
    const c = calcularConsenso(cid);
    const v = calcularVariabilidade(cid);
    return {
      cid,
      consenso: c.concordancia_guideline,
      variabilidade: v.indice,
    };
  });

  const taxa_media = consenso_por_cid.length > 0
    ? consenso_por_cid.reduce((s, c) => s + c.consenso, 0) / consenso_por_cid.length
    : 0;

  const insight = alertas_nao_lidos.length > 0
    ? `${alertas_nao_lidos.length} atualização(ões) científica(s) pendente(s) de revisão. Taxa de consenso médio: ${taxa_media.toFixed(0)}%.`
    : taxa_media >= 80
    ? `Boa consistência clínica (${taxa_media.toFixed(0)}% de consenso). Nenhuma atualização urgente pendente.`
    : `Variabilidade elevada (consenso médio ${taxa_media.toFixed(0)}%). Considerar revisão de protocolos internos.`;

  return {
    estatisticas_registry,
    alertas_nao_lidos,
    diretrizes_monitoradas: estado.sociedades_monitoradas.length,
    consenso_por_cid,
    insight,
  };
}
