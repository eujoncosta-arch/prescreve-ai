// ============================================================
// PRESCREVE-AI — Scientific Update Engine (Phase 12 · Module 10)
// Monitoramento contínuo de diretrizes de 15+ sociedades
// ============================================================

'use client';

// ══════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════

export type Sociedade =
  | 'SBC' | 'SBD' | 'SBPT' | 'SBN' | 'SBI' | 'SBRh' | 'SBO' | 'CFM'
  | 'ESC' | 'ACC_AHA' | 'ADA' | 'GINA' | 'GOLD' | 'WHO' | 'NICE';

export type TipoAlteracao =
  | 'nova_indicacao' | 'mudanca_alvo' | 'nova_contraindicacao' | 'retirada_indicacao'
  | 'novo_nivel_evidencia' | 'nova_molecula_recomendada' | 'black_box_adicionado'
  | 'revisao_dose' | 'nova_combinacao_recomendada';

export type UrgenciaAlerta = 'imediata' | 'alta' | 'moderada' | 'informativa';

export interface VersaoDiretriz {
  id: string;
  sociedade: Sociedade;
  titulo: string;
  versao: string;
  ano: number;
  mes?: number;
  cids_cobertos: string[];
  url_fonte?: string;
  resumo: string;
  principais_mudancas: string[];
}

export interface DeltaClinico {
  id: string;
  diretriz_anterior: string;
  diretriz_nova: string;
  tipo_alteracao: TipoAlteracao;
  cid: string;
  molecula?: string;
  classe?: string;
  descricao: string;
  impacto_pratica: string;
  urgencia: UrgenciaAlerta;
  acao_recomendada: string;
  nivel_evidencia_novo: 'A' | 'B' | 'C';
  nivel_evidencia_anterior?: 'A' | 'B' | 'C';
}

export interface AlertaAtualizacao {
  id: string;
  delta_id: string;
  titulo: string;
  corpo: string;
  urgencia: UrgenciaAlerta;
  cids_afetados: string[];
  especialidades_alvo: string[];
  lido: boolean;
  gerado_em: string;
  expira_em?: string;
}

export interface EstadoMonitoramento {
  ultima_verificacao: string;
  sociedades_monitoradas: Sociedade[];
  total_alertas_pendentes: number;
  total_alertas_lidos: number;
  versoes_atuais: VersaoDiretriz[];
}

// ══════════════════════════════════════════════════════════════
// BASE DE DADOS DE DIRETRIZES ATUAIS
// ══════════════════════════════════════════════════════════════

export const DIRETRIZES_ATUAIS: VersaoDiretriz[] = [
  { id: 'DIR001', sociedade: 'SBC', titulo: 'Diretriz Brasileira de Hipertensão Arterial',
    versao: '7ª Edição', ano: 2020, cids_cobertos: ['I10', 'I11', 'I12', 'I13'],
    resumo: 'Meta <130/80 mmHg para maioria; IECA/BRA + BCC + Tiazídico como estratégia preferencial.',
    principais_mudancas: ['Alvo pressórico < 130/80 mmHg', 'Combinação tripla como estratégia inicial em alto risco'] },
  { id: 'DIR002', sociedade: 'ADA', titulo: 'Standards of Medical Care in Diabetes',
    versao: '2024', ano: 2024, cids_cobertos: ['E11', 'E10', 'E14'],
    resumo: 'iSGLT2 e aGLP-1 recomendados independente de HbA1c em DM2 com DCV ou renal.',
    principais_mudancas: ['iSGLT2 2ª linha universal com DCV/renal', 'Semaglutida oral alternativa'] },
  { id: 'DIR003', sociedade: 'ESC', titulo: 'ESC Guidelines for Heart Failure',
    versao: '2021', ano: 2021, cids_cobertos: ['I50'],
    resumo: 'Quadrupla terapia: ARNI + betabloqueador + MRA + iSGLT2 em ICFEr.',
    principais_mudancas: ['iSGLT2 incorporada à quadrupla terapia (IA)', 'ARNI > IECA em ICFEr'] },
  { id: 'DIR004', sociedade: 'GINA', titulo: 'GINA Global Strategy for Asthma Management',
    versao: '2023', ano: 2023, cids_cobertos: ['J45'],
    resumo: 'SABA isolado não recomendado. ICS-formoterol como resgate e manutenção.',
    principais_mudancas: ['SABA isolado abandonado em todas as etapas', 'Biológicos (dupilumabe) etapa 5'] },
  { id: 'DIR005', sociedade: 'GOLD', titulo: 'GOLD Strategy for COPD',
    versao: '2024', ano: 2024, cids_cobertos: ['J44'],
    resumo: 'LAMA ou LABA+LAMA para maioria; ICS apenas com eosinofilia ≥300.',
    principais_mudancas: ['Eosinófilos guiam uso de ICS', 'Triple therapy (LABA+LAMA+ICS) para exacerbadores'] },
  { id: 'DIR006', sociedade: 'ACC_AHA', titulo: 'ACC/AHA Guideline for Dyslipidemia',
    versao: '2018', ano: 2018, cids_cobertos: ['E78'],
    resumo: 'Estatina de alta intensidade em DCV estabelecida; LDL < 70 mg/dL.',
    principais_mudancas: ['Ezetimiba + estatina em alto risco se LDL >70', 'Inibidores PCSK9 em risco muito alto'] },
  { id: 'DIR007', sociedade: 'SBD', titulo: 'Diretriz da Sociedade Brasileira de Diabetes',
    versao: '2023', ano: 2023, cids_cobertos: ['E11', 'E10'],
    resumo: 'Algoritmo de tratamento adaptado à realidade brasileira e ao SUS.',
    principais_mudancas: ['Empagliflozina incorporada ao CEAF', 'Metas individualizadas por comorbidade'] },
  { id: 'DIR008', sociedade: 'SBPT', titulo: 'Diretrizes da SBPT para Asma',
    versao: '2021', ano: 2021, cids_cobertos: ['J45'],
    resumo: 'Alinhamento ao GINA; terapia biológica para asma grave não controlada.',
    principais_mudancas: ['Benralizumabe e mepolizumabe para asma eosinofílica'] },
  { id: 'DIR009', sociedade: 'WHO', titulo: 'WHO Package of Essential NCD Interventions',
    versao: '2020', ano: 2020, cids_cobertos: ['I10', 'E11', 'J45'],
    resumo: 'Protocolos para países de baixa e média renda; medicamentos essenciais.',
    principais_mudancas: ['Ênfase em metformina, anlodipina, enalapril como medicamentos essenciais'] },
  { id: 'DIR010', sociedade: 'NICE', titulo: 'NICE Hypertension Guideline (NG136)',
    versao: 'NG136', ano: 2022, cids_cobertos: ['I10'],
    resumo: 'Monitoramento ambulatorial preferido ao consultório; ACEI/ARB como 1ª linha.',
    principais_mudancas: ['ABPM/HBPM como padrão para diagnóstico', 'Spironolactona 4ª linha'] },
];

// ══════════════════════════════════════════════════════════════
// BASE DE DADOS DELTA (mudanças relevantes detectadas)
// ══════════════════════════════════════════════════════════════

const DELTAS_DEMO: DeltaClinico[] = [
  { id: 'D001', diretriz_anterior: 'ESC HF 2016', diretriz_nova: 'ESC HF 2021',
    tipo_alteracao: 'nova_indicacao', cid: 'I50', molecula: 'Dapagliflozina',
    descricao: 'Dapagliflozina incluída com Classe IA em ICFEr para redução de desfecho composto.',
    impacto_pratica: 'Quadrupla terapia agora inclui iSGLT2; todos os pacientes ICFEr são candidatos.',
    urgencia: 'alta', acao_recomendada: 'Revisar pacientes com ICFEr em uso de tripla terapia; avaliar adicionar iSGLT2.',
    nivel_evidencia_novo: 'A', nivel_evidencia_anterior: undefined },
  { id: 'D002', diretriz_anterior: 'ADA 2023', diretriz_nova: 'ADA 2024',
    tipo_alteracao: 'nova_indicacao', cid: 'E11', molecula: 'Semaglutida oral',
    descricao: 'Semaglutida oral (Rybelsus) reconhecida como alternativa a subcutânea em DM2+DCV.',
    impacto_pratica: 'Pacientes com dificuldade de injeção têm opção oral com evidência similar.',
    urgencia: 'moderada', acao_recomendada: 'Considerar semaglutida oral em pacientes com recusa a injeções.',
    nivel_evidencia_novo: 'A' },
  { id: 'D003', diretriz_anterior: 'GINA 2021', diretriz_nova: 'GINA 2023',
    tipo_alteracao: 'retirada_indicacao', cid: 'J45', molecula: 'Salbutamol isolado',
    descricao: 'SABA isolado (sem ICS) removido de qualquer etapa do tratamento de asma.',
    impacto_pratica: 'Pacientes usando apenas salbutamol devem receber ICS concomitante.',
    urgencia: 'imediata', acao_recomendada: 'Revisar pacientes com prescrição de SABA sem ICS; iniciar ICS.',
    nivel_evidencia_novo: 'A' },
  { id: 'D004', diretriz_anterior: 'DBHA 2016', diretriz_nova: 'DBHA 2020',
    tipo_alteracao: 'mudanca_alvo', cid: 'I10',
    descricao: 'Meta pressórica revisada de <140/90 para <130/80 mmHg na maioria dos pacientes.',
    impacto_pratica: 'Intensificação terapêutica necessária em pacientes com PA 131-140/81-90.',
    urgencia: 'alta', acao_recomendada: 'Reavaliar pacientes com PA 130-140 e considerar intensificação.',
    nivel_evidencia_novo: 'A', nivel_evidencia_anterior: 'A' },
];

// ══════════════════════════════════════════════════════════════
// STORAGE
// ══════════════════════════════════════════════════════════════

const KEY_ALERTAS = 'prescreve_ai_alertas_atualizacao_v1';
const KEY_MONITOR = 'prescreve_ai_monitoramento_estado_v1';

function loadAlertas(): AlertaAtualizacao[] {
  if (typeof window === 'undefined') return [];
  try { const r = localStorage.getItem(KEY_ALERTAS); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveAlertas(d: AlertaAtualizacao[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_ALERTAS, JSON.stringify(d.slice(-1000)));
}

function genId(p: string) { return `${p}-${Date.now().toString(36).toUpperCase()}`; }

// ══════════════════════════════════════════════════════════════
// API PÚBLICA
// ══════════════════════════════════════════════════════════════

export function detectarNovaDiretriz(cid: string): VersaoDiretriz[] {
  return DIRETRIZES_ATUAIS.filter(d => d.cids_cobertos.includes(cid));
}

export function compararVersoes(
  cid: string
): { anterior?: VersaoDiretriz; atual?: VersaoDiretriz; deltas: DeltaClinico[] } {
  const atual = DIRETRIZES_ATUAIS.filter(d => d.cids_cobertos.includes(cid)).sort((a, b) => b.ano - a.ano)[0];
  const deltas = DELTAS_DEMO.filter(d => d.cid === cid);
  return { atual, deltas };
}

export function gerarDeltaClinico(cid: string): DeltaClinico[] {
  return DELTAS_DEMO.filter(d => d.cid === cid);
}

export function gerarAlertaAtualizacao(delta: DeltaClinico): AlertaAtualizacao {
  const alerta: AlertaAtualizacao = {
    id: genId('AL'),
    delta_id: delta.id,
    titulo: `[${delta.urgencia.toUpperCase()}] ${TIPO_ALTERACAO_META[delta.tipo_alteracao].label}: ${delta.molecula ?? delta.cid}`,
    corpo: `${delta.descricao}\n\nImpacto: ${delta.impacto_pratica}\n\nAção: ${delta.acao_recomendada}`,
    urgencia: delta.urgencia,
    cids_afetados: [delta.cid],
    especialidades_alvo: [],
    lido: false,
    gerado_em: new Date().toISOString(),
  };
  const all = loadAlertas();
  if (!all.some(a => a.delta_id === delta.id)) {
    all.push(alerta);
    saveAlertas(all);
  }
  return alerta;
}

export function listarAlertas(filtros?: { lido?: boolean; urgencia?: UrgenciaAlerta }): AlertaAtualizacao[] {
  let lista = loadAlertas();
  if (filtros?.lido !== undefined) lista = lista.filter(a => a.lido === filtros.lido);
  if (filtros?.urgencia) lista = lista.filter(a => a.urgencia === filtros.urgencia);
  return lista.slice().reverse();
}

export function marcarLido(id: string): void {
  const all = loadAlertas();
  const idx = all.findIndex(a => a.id === id);
  if (idx >= 0) { all[idx].lido = true; saveAlertas(all); }
}

export function getEstadoMonitoramento(): EstadoMonitoramento {
  const alertas = loadAlertas();
  return {
    ultima_verificacao: new Date().toISOString(),
    sociedades_monitoradas: [...new Set(DIRETRIZES_ATUAIS.map(d => d.sociedade))],
    total_alertas_pendentes: alertas.filter(a => !a.lido).length,
    total_alertas_lidos: alertas.filter(a => a.lido).length,
    versoes_atuais: DIRETRIZES_ATUAIS,
  };
}

// ══════════════════════════════════════════════════════════════
// SEED DEMO
// ══════════════════════════════════════════════════════════════

export function seedScientificUpdateDemo(): void {
  if (typeof window === 'undefined') return;
  if (loadAlertas().length > 0) return;
  for (const delta of DELTAS_DEMO) gerarAlertaAtualizacao(delta);
}

// ── UI labels ─────────────────────────────────────────────────

export const SOCIEDADE_META: Record<Sociedade, { label: string; pais: string }> = {
  SBC:     { label: 'Soc. Bras. Cardiologia',    pais: 'BR' },
  SBD:     { label: 'Soc. Bras. Diabetes',       pais: 'BR' },
  SBPT:    { label: 'Soc. Bras. Pneumologia',    pais: 'BR' },
  SBN:     { label: 'Soc. Bras. Nefrologia',     pais: 'BR' },
  SBI:     { label: 'Soc. Bras. Infectologia',   pais: 'BR' },
  SBRh:    { label: 'Soc. Bras. Reumatologia',   pais: 'BR' },
  SBO:     { label: 'Soc. Bras. Oftalmologia',   pais: 'BR' },
  CFM:     { label: 'Conselho Federal de Medicina', pais: 'BR' },
  ESC:     { label: 'European Soc. Cardiology',  pais: 'EU' },
  ACC_AHA: { label: 'ACC / AHA',                 pais: 'US' },
  ADA:     { label: 'American Diabetes Assoc.',  pais: 'US' },
  GINA:    { label: 'GINA — Asthma',             pais: 'INT' },
  GOLD:    { label: 'GOLD — COPD',               pais: 'INT' },
  WHO:     { label: 'World Health Organization', pais: 'INT' },
  NICE:    { label: 'NICE (Reino Unido)',         pais: 'UK' },
};

export const URGENCIA_META: Record<UrgenciaAlerta, { label: string; cls: string; dot: string }> = {
  imediata:    { label: 'Imediata',    cls: 'bg-red-100 text-red-800 border-red-300',     dot: 'bg-red-500' },
  alta:        { label: 'Alta',        cls: 'bg-orange-100 text-orange-800 border-orange-300', dot: 'bg-orange-500' },
  moderada:    { label: 'Moderada',    cls: 'bg-yellow-100 text-yellow-800 border-yellow-300', dot: 'bg-yellow-400' },
  informativa: { label: 'Informativa', cls: 'bg-blue-100 text-blue-700 border-blue-200',  dot: 'bg-blue-400' },
};

export const TIPO_ALTERACAO_META: Record<TipoAlteracao, { label: string; icon: string }> = {
  nova_indicacao:            { label: 'Nova indicação',          icon: '✚' },
  mudanca_alvo:              { label: 'Mudança de alvo',         icon: '🎯' },
  nova_contraindicacao:      { label: 'Nova contraindicação',    icon: '⛔' },
  retirada_indicacao:        { label: 'Indicação retirada',      icon: '✖' },
  novo_nivel_evidencia:      { label: 'Novo nível evidência',    icon: '📈' },
  nova_molecula_recomendada: { label: 'Nova molécula',           icon: '💊' },
  black_box_adicionado:      { label: 'Black Box Warning',       icon: '⬛' },
  revisao_dose:              { label: 'Revisão de dose',         icon: '⚖' },
  nova_combinacao_recomendada:{ label: 'Nova combinação',        icon: '🔗' },
};

// ─── Bridge to Guideline Updates ─────────────────────────────
// Re-exports the static updates database so consumers can access
// both real-time alerts and the curated guidelines catalog from one import.
export {
  GUIDELINE_UPDATES,
  totalMudancasByImpacto,
  IMPACTO_META as IMPACTO_UPDATE_META,
  AREA_META,
} from './guideline-updates';
export type {
  GuidelineUpdate,
  EvidenciaUpdate,
  MudancaRecomendacao,
  ImpactoClinico,
  AreaEspecialidade,
} from './guideline-updates';
