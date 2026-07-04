// ============================================================
// PRESCREVE-AI — Evidence Timeline (Phase 12 · Module 6)
// Linha do tempo histórica de evidências científicas por condição
// NOTA: distinto de timeline.ts (linha do tempo clínica do paciente)
// ============================================================

'use client';

// ══════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════

export type TipoEvidencia =
  | 'rct'
  | 'meta_analise'
  | 'diretriz'
  | 'registro'
  | 'real_world'
  | 'aprovacao_regulatoria'
  | 'retirada_mercado'
  | 'black_box_warning';

export type ImpactoEvidencia = 'landmark' | 'confirmatorio' | 'modificador' | 'neutro' | 'contraditorio';

export interface MarcoEvidencia {
  id: string;
  cid: string;
  ano: number;
  titulo: string;
  molecula?: string;
  tipo: TipoEvidencia;
  impacto: ImpactoEvidencia;
  descricao: string;
  conclusao_principal: string;
  mudou_pratica: boolean;
  fonte: string;
  doi?: string;
  nivel_evidencia: 'A' | 'B' | 'C';
  peso_historico: number;          // 0–100 — influência acumulada na prática
}

export interface TimelineEvidencias {
  cid: string;
  diagnostico: string;
  marcos: MarcoEvidencia[];
  total: number;
  periodo: { inicio: number; fim: number };
  moleculas_emergentes: string[];
  moleculas_obsoletas: string[];
  score_maturidade_evidencia: number;   // 0–100
  tendencia_atual: string;
}

// ══════════════════════════════════════════════════════════════
// BASE DE DADOS HISTÓRICA
// ══════════════════════════════════════════════════════════════

export const EVIDENCE_TIMELINE_DB: MarcoEvidencia[] = [
  // ── HAS (I10) ─────────────────────────────────────────────
  { id: 'ET001', cid: 'I10', ano: 1967, titulo: 'Veterans Administration Study', molecula: 'Hidralazina', tipo: 'rct',
    impacto: 'landmark', descricao: 'Primeiro RCT demonstrando redução de eventos CV com tratamento de HAS.',
    conclusao_principal: 'Tratamento reduz AVC, ICC e mortalidade em HAS grave.',
    mudou_pratica: true, fonte: 'JAMA 1967', nivel_evidencia: 'A', peso_historico: 95 },
  { id: 'ET002', cid: 'I10', ano: 1991, titulo: 'HOT Study', molecula: 'Felodipina', tipo: 'rct',
    impacto: 'confirmatorio', descricao: 'Definiu alvo pressórico PA < 140/90 mmHg para redução de eventos.',
    conclusao_principal: 'Alvo PA < 85 mmHg diastólico associado a melhor desfecho em diabéticos.',
    mudou_pratica: true, fonte: 'Lancet 1998', nivel_evidencia: 'A', peso_historico: 82 },
  { id: 'ET003', cid: 'I10', ano: 2002, titulo: 'ALLHAT', molecula: 'Clortalidona', tipo: 'rct',
    impacto: 'landmark', descricao: 'Maior ensaio HAS da história: 42.418 pacientes.',
    conclusao_principal: 'Tiazídico superior a doxazosina e semelhante a IECA/BCC para desfechos CV.',
    mudou_pratica: true, fonte: 'JAMA 2002', nivel_evidencia: 'A', peso_historico: 98 },
  { id: 'ET004', cid: 'I10', ano: 2015, titulo: 'SPRINT Trial', molecula: undefined, tipo: 'rct',
    impacto: 'landmark', descricao: 'Alvo PA sistólica < 120 mmHg vs < 140 mmHg em pacientes de alto risco.',
    conclusao_principal: 'Alvo intensivo reduz mortalidade CV em 27% mas aumenta EAs renais.',
    mudou_pratica: true, fonte: 'NEJM 2015', nivel_evidencia: 'A', peso_historico: 90 },
  { id: 'ET005', cid: 'I10', ano: 2020, titulo: 'Diretriz Brasileira HAS 7ª Ed', molecula: undefined, tipo: 'diretriz',
    impacto: 'confirmatorio', descricao: 'SBC atualiza metas e estratégia terapêutica baseada em SPRINT e ACCORD.',
    conclusao_principal: 'Alvo geral <130/80 mmHg; combinação IECA/BRA+BCC+Tiazídico como esquema preferencial.',
    mudou_pratica: true, fonte: 'Arq Bras Cardiol 2020', nivel_evidencia: 'A', peso_historico: 88 },

  // ── DM2 (E11) ─────────────────────────────────────────────
  { id: 'ET010', cid: 'E11', ano: 1998, titulo: 'UKPDS', molecula: 'Metformina', tipo: 'rct',
    impacto: 'landmark', descricao: 'Metformina reduz mortalidade total em diabéticos com sobrepeso.',
    conclusao_principal: 'Metformina: -36% mortalidade total; 1ª linha em DM2+sobrepeso.',
    mudou_pratica: true, fonte: 'Lancet 1998', nivel_evidencia: 'A', peso_historico: 99 },
  { id: 'ET011', cid: 'E11', ano: 2008, titulo: 'ACCORD', molecula: undefined, tipo: 'rct',
    impacto: 'contraditorio', descricao: 'Alvo HbA1c < 6% aumentou mortalidade no grupo intensivo.',
    conclusao_principal: 'Controle glicêmico muito intenso é deletério em DM2 de alto risco.',
    mudou_pratica: true, fonte: 'NEJM 2008', nivel_evidencia: 'A', peso_historico: 85 },
  { id: 'ET012', cid: 'E11', ano: 2015, titulo: 'EMPA-REG OUTCOME', molecula: 'Empagliflozina', tipo: 'rct',
    impacto: 'landmark', descricao: 'iSGLT2 reduz morte CV em 38% em DM2+DCV estabelecida.',
    conclusao_principal: 'Empagliflozina: -38% morte CV, -35% progressão renal.',
    mudou_pratica: true, fonte: 'NEJM 2015', nivel_evidencia: 'A', peso_historico: 97 },
  { id: 'ET013', cid: 'E11', ano: 2016, titulo: 'LEADER', molecula: 'Semaglutida', tipo: 'rct',
    impacto: 'landmark', descricao: 'aGLP-1 reduz MACE em DM2+DCV.',
    conclusao_principal: 'Liraglutida: -13% MACE, -22% mortalidade total.',
    mudou_pratica: true, fonte: 'NEJM 2016', nivel_evidencia: 'A', peso_historico: 93 },
  { id: 'ET014', cid: 'E11', ano: 2024, titulo: 'ADA Standards of Care 2024', molecula: undefined, tipo: 'diretriz',
    impacto: 'confirmatorio', descricao: 'ADA consolida iSGLT2 e aGLP-1 como 2ª linha universal.',
    conclusao_principal: 'Metformina + iSGLT2 ou aGLP-1 independente de HbA1c se DCV ou renal.',
    mudou_pratica: true, fonte: 'Diabetes Care 2024', nivel_evidencia: 'A', peso_historico: 92 },

  // ── ICC (I50) ─────────────────────────────────────────────
  { id: 'ET020', cid: 'I50', ano: 1987, titulo: 'CONSENSUS', molecula: 'Enalapril', tipo: 'rct',
    impacto: 'landmark', descricao: 'Primeiro IECA com redução de mortalidade em ICC grave.',
    conclusao_principal: 'Enalapril: -40% mortalidade em NYHA IV.',
    mudou_pratica: true, fonte: 'NEJM 1987', nivel_evidencia: 'A', peso_historico: 98 },
  { id: 'ET021', cid: 'I50', ano: 1999, titulo: 'MERIT-HF', molecula: 'Metoprolol', tipo: 'rct',
    impacto: 'landmark', descricao: 'Betabloqueador reverte paradigma de contraindicação em IC.',
    conclusao_principal: 'Metoprolol CR: -34% mortalidade em ICFEr.',
    mudou_pratica: true, fonte: 'Lancet 1999', nivel_evidencia: 'A', peso_historico: 96 },
  { id: 'ET022', cid: 'I50', ano: 2014, titulo: 'PARADIGM-HF', molecula: 'Sacubitril/Valsartana', tipo: 'rct',
    impacto: 'landmark', descricao: 'ARNI supera IECA clássico em ICFEr.',
    conclusao_principal: 'Sacubitril/Valsartana: -20% morte CV vs Enalapril.',
    mudou_pratica: true, fonte: 'NEJM 2014', nivel_evidencia: 'A', peso_historico: 97 },
  { id: 'ET023', cid: 'I50', ano: 2019, titulo: 'DAPA-HF', molecula: 'Dapagliflozina', tipo: 'rct',
    impacto: 'landmark', descricao: 'iSGLT2 eficaz em ICFEr independente de DM.',
    conclusao_principal: 'Dapagliflozina: -26% desfecho composto em ICFEr.',
    mudou_pratica: true, fonte: 'NEJM 2019', nivel_evidencia: 'A', peso_historico: 95 },

  // ── Asma (J45) ─────────────────────────────────────────────
  { id: 'ET030', cid: 'J45', ano: 2019, titulo: 'GINA Strategy Report 2019', molecula: undefined, tipo: 'diretriz',
    impacto: 'landmark', descricao: 'Abandona SABA isolado; ICS-formoterol como resgate.',
    conclusao_principal: 'ICS em toda asma; SABA isolado não recomendado.',
    mudou_pratica: true, fonte: 'GINA 2019', nivel_evidencia: 'A', peso_historico: 91 },
  { id: 'ET031', cid: 'J45', ano: 2023, titulo: 'GINA 2023 Update', molecula: 'Budesonida-Formoterol', tipo: 'diretriz',
    impacto: 'confirmatorio', descricao: 'Consolida MART (Maintenance and Reliever Therapy).',
    conclusao_principal: 'Budesonida-Formoterol MART: reduz exacerbações graves em 64%.',
    mudou_pratica: true, fonte: 'GINA 2023', nivel_evidencia: 'A', peso_historico: 87 },
];

// ══════════════════════════════════════════════════════════════
// FUNÇÕES PRINCIPAIS
// ══════════════════════════════════════════════════════════════

export function gerarTimeline(cid: string): TimelineEvidencias {
  const marcos = EVIDENCE_TIMELINE_DB
    .filter(m => m.cid === cid)
    .sort((a, b) => a.ano - b.ano);

  if (!marcos.length) {
    return {
      cid, diagnostico: cid, marcos: [], total: 0,
      periodo: { inicio: 0, fim: 0 }, moleculas_emergentes: [],
      moleculas_obsoletas: [], score_maturidade_evidencia: 0,
      tendencia_atual: 'Sem dados disponíveis',
    };
  }

  const anos = marcos.map(m => m.ano);
  const score_maturidade_evidencia = Math.min(100, Math.round(
    (marcos.filter(m => m.impacto === 'landmark').length * 20) +
    (marcos.filter(m => m.nivel_evidencia === 'A').length * 5) +
    (marcos.length * 2)
  ));

  const moleculas_modificadoras = marcos
    .filter(m => m.mudou_pratica && m.molecula && m.ano >= 2010)
    .map(m => m.molecula as string);
  const moleculas_emergentes = [...new Set(moleculas_modificadoras)].slice(0, 5);

  const moleculas_obsoletas: string[] = [];
  if (cid === 'I50') moleculas_obsoletas.push('Digoxina (uso muito restrito)');
  if (cid === 'E11') moleculas_obsoletas.push('Sulfonilureias de 1ª geração');

  const ultimo_marco = marcos[marcos.length - 1];
  const tendencia_atual = ultimo_marco.tipo === 'diretriz'
    ? `Última diretriz: ${ultimo_marco.titulo} (${ultimo_marco.ano})`
    : `Último ensaio: ${ultimo_marco.titulo} (${ultimo_marco.ano})`;

  return {
    cid, diagnostico: cid,
    marcos,
    total: marcos.length,
    periodo: { inicio: Math.min(...anos), fim: Math.max(...anos) },
    moleculas_emergentes,
    moleculas_obsoletas,
    score_maturidade_evidencia,
    tendencia_atual,
  };
}

export function calcularPesoHistorico(marco: MarcoEvidencia): number {
  return marco.peso_historico;
}

export function ordenarPorImpacto(marcos: MarcoEvidencia[]): MarcoEvidencia[] {
  const ordem: Record<ImpactoEvidencia, number> = {
    landmark: 5, confirmatorio: 4, modificador: 3, neutro: 2, contraditorio: 1,
  };
  return [...marcos].sort((a, b) => {
    const d = ordem[b.impacto] - ordem[a.impacto];
    return d !== 0 ? d : b.ano - a.ano;
  });
}

export function filtrarPorDecada(marcos: MarcoEvidencia[], decada: number): MarcoEvidencia[] {
  return marcos.filter(m => Math.floor(m.ano / 10) * 10 === decada);
}

// ── UI labels ─────────────────────────────────────────────────

export const TIPO_EVIDENCIA_META: Record<TipoEvidencia, { label: string; cls: string; icon: string }> = {
  rct:                   { label: 'RCT',             cls: 'bg-blue-100 text-blue-800',   icon: '🧪' },
  meta_analise:          { label: 'Meta-análise',    cls: 'bg-violet-100 text-violet-800', icon: '📊' },
  diretriz:              { label: 'Diretriz',        cls: 'bg-green-100 text-green-800', icon: '📋' },
  registro:              { label: 'Registro',        cls: 'bg-slate-100 text-slate-700', icon: '📁' },
  real_world:            { label: 'Mundo real',      cls: 'bg-amber-100 text-amber-800', icon: '🌍' },
  aprovacao_regulatoria: { label: 'Aprovação ANVISA/FDA', cls: 'bg-teal-100 text-teal-800', icon: '✅' },
  retirada_mercado:      { label: 'Retirada',        cls: 'bg-red-100 text-red-800',    icon: '🚫' },
  black_box_warning:     { label: 'Black Box',       cls: 'bg-red-200 text-red-900',    icon: '⬛' },
};

export const IMPACTO_META: Record<ImpactoEvidencia, { label: string; cls: string }> = {
  landmark:     { label: 'Landmark',    cls: 'bg-yellow-100 text-yellow-800 border border-yellow-300' },
  confirmatorio:{ label: 'Confirmatório', cls: 'bg-green-100 text-green-700' },
  modificador:  { label: 'Modificador', cls: 'bg-blue-100 text-blue-700' },
  neutro:       { label: 'Neutro',      cls: 'bg-slate-100 text-slate-600' },
  contraditorio:{ label: 'Contraditório', cls: 'bg-orange-100 text-orange-800' },
};

export const CIDS_TIMELINE: { cid: string; label: string }[] = [
  { cid: 'I10', label: 'Hipertensão Arterial (I10)' },
  { cid: 'E11', label: 'Diabetes Mellitus tipo 2 (E11)' },
  { cid: 'I50', label: 'Insuficiência Cardíaca (I50)' },
  { cid: 'J45', label: 'Asma (J45)' },
];
