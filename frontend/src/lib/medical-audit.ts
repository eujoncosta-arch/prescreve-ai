'use client';

// ═══════════════════════════════════════════════════════════
// MEDICAL AUDIT ENGINE — PRESCREVE-AI
// Segurança jurídica e clínica — rastreabilidade completa
// ═══════════════════════════════════════════════════════════

export type TipoEventoAudit =
  | 'prescricao_gerada'
  | 'prescricao_editada'
  | 'prescricao_cancelada'
  | 'consulta_iniciada'
  | 'consulta_finalizada'
  | 'alerta_ignorado'
  | 'alerta_aceito'
  | 'conduta_registrada'
  | 'diretriz_consultada'
  | 'evidencia_consultada'
  | 'ajuste_renal_aplicado'
  | 'ajuste_hepatico_aplicado'
  | 'interacao_detectada'
  | 'contraindicacao_detectada'
  | 'exportacao_realizada'
  | 'acesso_historico'
  | 'protocolo_aplicado';

export type SeveridadeAlerta = 'info' | 'aviso' | 'grave' | 'critico';
export type StatusAudit = 'ativo' | 'finalizado' | 'cancelado' | 'pendente';
export type TipoExportacao = 'json' | 'csv' | 'pdf_sumario';

// ─── Interfaces de dados clínicos ────────────────────────

export interface PacienteAudit {
  id_anonimo: string;          // hash SHA-like — nunca nome completo aqui
  iniciais?: string;           // ex: "J.S."
  idade_anos?: number;
  sexo?: 'M' | 'F' | 'outro';
  peso_kg?: number;
  altura_cm?: number;
  tfg_ml_min?: number;
  child_pugh?: 'A' | 'B' | 'C';
  alergias_registradas: string[];
  comorbidades_ativas: string[];
}

export interface DiagnosticoAudit {
  cid: string;
  descricao: string;
  tipo: 'principal' | 'secundario' | 'complicacao';
  confirmado: boolean;
  data_registro: string;
}

export interface MedicamentoAudit {
  molecula: string;
  marca?: string;
  laboratorio?: string;
  concentracao: string;
  dose: string;
  via: string;
  frequencia: string;
  duracao?: string;
  indicacao_cid: string;
}

export interface PrescricaoAudit {
  id_prescricao: string;
  medicamentos: MedicamentoAudit[];
  data_prescricao: string;
  status: 'emitida' | 'editada' | 'cancelada';
  motivo_cancelamento?: string;
  hash_conteudo: string;         // integridade do conteúdo
}

export interface EvidenciaRef {
  estudo: string;
  tipo: 'RCT' | 'Meta-análise' | 'Coorte' | 'Caso-controle' | 'Diretriz' | 'Revisão';
  nivel_evidencia: 'A' | 'B' | 'C';
  grau_recomendacao: 'I' | 'IIa' | 'IIb' | 'III';
  fonte: string;
  ano?: number;
  consultada_em: string;
}

export interface DiretrizRef {
  sociedade: string;
  nome: string;
  ano: number;
  secao?: string;
  recomendacao?: string;
  consultada_em: string;
}

export interface AlertaIgnorado {
  tipo: 'interacao' | 'contraindicacao' | 'dose_alta' | 'dose_baixa' | 'alergico' | 'renal' | 'hepatico' | 'gestante' | 'idoso' | 'pediatrico' | 'outro';
  severidade: SeveridadeAlerta;
  mensagem: string;
  farmaco_a?: string;
  farmaco_b?: string;
  justificativa_medico?: string;
  ignorado_em: string;
}

export interface AjusteAplicado {
  tipo: 'renal' | 'hepatico' | 'idoso' | 'peso' | 'interacao' | 'outro';
  descricao: string;
  dose_original: string;
  dose_ajustada: string;
  motivo: string;
  aplicado_em: string;
}

export interface CondutaAudit {
  descricao: string;
  tipo: 'medicamentosa' | 'nao_medicamentosa' | 'solicitacao_exame' | 'encaminhamento' | 'orientacao' | 'retorno';
  cid_relacionado?: string;
  diretriz_base?: string;
  registrada_em: string;
}

// ─── Registro de auditoria central ───────────────────────

export interface AuditEntry {
  id: string;
  versao_schema: number;           // para migrações futuras

  // Quem
  usuario: {
    nome: string;
    crm: string;
    uf_crm: string;
    especialidade?: string;
  };

  // Quando
  timestamp_inicio: string;        // ISO8601
  timestamp_fim?: string;
  duracao_minutos?: number;

  // Quem (paciente anonimizado)
  paciente: PacienteAudit;

  // O quê (clínico)
  tipo_evento: TipoEventoAudit;
  status: StatusAudit;
  diagnosticos: DiagnosticoAudit[];
  condutas: CondutaAudit[];
  prescricoes: PrescricaoAudit[];

  // Embasamento científico
  evidencias_consultadas: EvidenciaRef[];
  diretrizes_utilizadas: DiretrizRef[];

  // Ajustes e segurança
  ajustes_aplicados: AjusteAplicado[];
  alertas_ignorados: AlertaIgnorado[];
  alertas_aceitos: string[];

  // Contexto
  contexto_clinico?: string;       // resumo livre da consulta
  protocolo_aplicado?: string;
  observacoes?: string;

  // Rastreabilidade técnica
  hash_integridade: string;        // fingerprint do registro
  versao_sistema: string;
  origem: 'consulta' | 'prescricao_rapida' | 'manual' | 'api';
  ip_hash?: string;
  device_info?: string;
}

// ─── Sumário para listagem ────────────────────────────────

export interface AuditSumario {
  id: string;
  timestamp_inicio: string;
  tipo_evento: TipoEventoAudit;
  status: StatusAudit;
  usuario_crm: string;
  usuario_nome: string;
  paciente_iniciais: string;
  n_prescricoes: number;
  n_alertas_ignorados: number;
  n_ajustes: number;
  diagnosticos_principais: string[];
  hash_integridade: string;
}

// ═══════════════════════════════════════════════════════════
// STORAGE KEY & CONSTANTS
// ═══════════════════════════════════════════════════════════

const AUDIT_KEY     = 'prescreve_ai_audit_v1';
const MAX_ENTRIES   = 10000;
const SCHEMA_VER    = 1;
const SISTEMA_VER   = '2.1-MVP';

// ═══════════════════════════════════════════════════════════
// HASH DE INTEGRIDADE (simples, não criptográfico)
// Objetivo: detectar adulteração acidental do localStorage
// ═══════════════════════════════════════════════════════════

function hashIntegridade(entry: Omit<AuditEntry, 'hash_integridade'>): string {
  const str = JSON.stringify({
    id:              entry.id,
    timestamp_inicio: entry.timestamp_inicio,
    usuario_crm:     entry.usuario.crm,
    paciente_id:     entry.paciente.id_anonimo,
    tipo_evento:     entry.tipo_evento,
    n_prescricoes:   entry.prescricoes.length,
    n_alertas:       entry.alertas_ignorados.length,
  });
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `AUD-${Math.abs(hash).toString(36).toUpperCase().padStart(8, '0')}`;
}

export function hashConteudoPrescricao(meds: MedicamentoAudit[]): string {
  const str = meds.map(m => `${m.molecula}|${m.dose}|${m.frequencia}`).join(';');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `PRX-${Math.abs(hash).toString(36).toUpperCase().padStart(6, '0')}`;
}

// ═══════════════════════════════════════════════════════════
// ID geração
// ═══════════════════════════════════════════════════════════

export function gerarIdAudit(): string {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `AE-${ts}-${rnd}`;
}

export function gerarIdPacienteAnonimo(semente?: string): string {
  const base = semente ?? Math.random().toString(36);
  let hash = 5381;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) + hash) + base.charCodeAt(i);
    hash |= 0;
  }
  return `PAC-${Math.abs(hash).toString(36).toUpperCase().padStart(8, '0')}`;
}

// ═══════════════════════════════════════════════════════════
// CRUD — Audit Engine
// ═══════════════════════════════════════════════════════════

function loadAll(): AuditEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? (JSON.parse(raw) as AuditEntry[]) : [];
  } catch {
    return [];
  }
}

function saveAll(entries: AuditEntry[]): void {
  if (typeof window === 'undefined') return;
  const trimmed = entries.slice(-MAX_ENTRIES);
  localStorage.setItem(AUDIT_KEY, JSON.stringify(trimmed));
}

export function registrarAudit(
  draft: Omit<AuditEntry, 'id' | 'hash_integridade' | 'versao_schema' | 'versao_sistema'>
): AuditEntry {
  const base = {
    ...draft,
    id:              gerarIdAudit(),
    versao_schema:   SCHEMA_VER,
    versao_sistema:  SISTEMA_VER,
    hash_integridade: '',
  };
  const hash = hashIntegridade(base);
  const entry: AuditEntry = { ...base, hash_integridade: hash };

  const all = loadAll();
  all.push(entry);
  saveAll(all);
  return entry;
}

export function atualizarAudit(id: string, patch: Partial<AuditEntry>): boolean {
  const all = loadAll();
  const idx = all.findIndex(e => e.id === id);
  if (idx === -1) return false;
  const updated = { ...all[idx], ...patch };
  updated.hash_integridade = hashIntegridade(updated);
  all[idx] = updated;
  saveAll(all);
  return true;
}

export function buscarAudit(id: string): AuditEntry | undefined {
  return loadAll().find(e => e.id === id);
}

export function listarAudits(filtros?: FiltroAudit): AuditEntry[] {
  let entries = loadAll();
  if (!filtros) return entries.reverse();

  if (filtros.tipo_evento)    entries = entries.filter(e => e.tipo_evento === filtros.tipo_evento);
  if (filtros.status)         entries = entries.filter(e => e.status === filtros.status);
  if (filtros.usuario_crm)    entries = entries.filter(e => e.usuario.crm.includes(filtros.usuario_crm!));
  if (filtros.paciente_id)    entries = entries.filter(e => e.paciente.id_anonimo.includes(filtros.paciente_id!));
  if (filtros.data_inicio)    entries = entries.filter(e => e.timestamp_inicio >= filtros.data_inicio!);
  if (filtros.data_fim)       entries = entries.filter(e => e.timestamp_inicio <= filtros.data_fim! + 'T23:59:59');
  if (filtros.com_alertas_ignorados) entries = entries.filter(e => e.alertas_ignorados.length > 0);
  if (filtros.com_ajustes)    entries = entries.filter(e => e.ajustes_aplicados.length > 0);
  if (filtros.busca_livre) {
    const q = filtros.busca_livre.toLowerCase();
    entries = entries.filter(e =>
      e.usuario.nome.toLowerCase().includes(q) ||
      e.usuario.crm.includes(q) ||
      e.paciente.id_anonimo.toLowerCase().includes(q) ||
      (e.paciente.iniciais ?? '').toLowerCase().includes(q) ||
      e.diagnosticos.some(d => d.cid.toLowerCase().includes(q) || d.descricao.toLowerCase().includes(q)) ||
      e.prescricoes.some(p => p.medicamentos.some(m => m.molecula.toLowerCase().includes(q) || (m.marca ?? '').toLowerCase().includes(q))) ||
      (e.contexto_clinico ?? '').toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.hash_integridade.toLowerCase().includes(q)
    );
  }

  return entries.reverse();
}

export function gerarSumarios(entries: AuditEntry[]): AuditSumario[] {
  return entries.map(e => ({
    id:                    e.id,
    timestamp_inicio:      e.timestamp_inicio,
    tipo_evento:           e.tipo_evento,
    status:                e.status,
    usuario_crm:           e.usuario.crm,
    usuario_nome:          e.usuario.nome,
    paciente_iniciais:     e.paciente.iniciais ?? e.paciente.id_anonimo,
    n_prescricoes:         e.prescricoes.length,
    n_alertas_ignorados:   e.alertas_ignorados.length,
    n_ajustes:             e.ajustes_aplicados.length,
    diagnosticos_principais: e.diagnosticos.filter(d => d.tipo === 'principal').map(d => d.cid),
    hash_integridade:      e.hash_integridade,
  }));
}

export function verificarIntegridade(entry: AuditEntry): boolean {
  const { hash_integridade: _, ...rest } = entry;
  const esperado = hashIntegridade(rest as Omit<AuditEntry, 'hash_integridade'>);
  return entry.hash_integridade === esperado;
}

// ═══════════════════════════════════════════════════════════
// FILTROS
// ═══════════════════════════════════════════════════════════

export interface FiltroAudit {
  tipo_evento?: TipoEventoAudit;
  status?: StatusAudit;
  usuario_crm?: string;
  paciente_id?: string;
  data_inicio?: string;
  data_fim?: string;
  com_alertas_ignorados?: boolean;
  com_ajustes?: boolean;
  busca_livre?: string;
}

// ═══════════════════════════════════════════════════════════
// EXPORTAÇÃO
// ═══════════════════════════════════════════════════════════

export function exportarCSV(entries: AuditEntry[]): string {
  const headers = [
    'ID', 'Hash Integridade', 'Timestamp Início', 'Timestamp Fim',
    'Tipo Evento', 'Status', 'Usuário Nome', 'CRM', 'UF CRM',
    'Especialidade', 'Paciente ID', 'Paciente Iniciais', 'Paciente Idade',
    'Paciente Sexo', 'Diagnósticos', 'N Prescrições', 'Medicamentos',
    'N Alertas Ignorados', 'Alertas Ignorados', 'N Ajustes', 'Ajustes',
    'Evidências', 'Diretrizes', 'Contexto Clínico', 'Protocolo',
    'Versão Sistema', 'Origem',
  ];

  const escape = (v: unknown) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = entries.map(e => [
    e.id,
    e.hash_integridade,
    e.timestamp_inicio,
    e.timestamp_fim ?? '',
    e.tipo_evento,
    e.status,
    e.usuario.nome,
    e.usuario.crm,
    e.usuario.uf_crm,
    e.usuario.especialidade ?? '',
    e.paciente.id_anonimo,
    e.paciente.iniciais ?? '',
    e.paciente.idade_anos ?? '',
    e.paciente.sexo ?? '',
    e.diagnosticos.map(d => `${d.cid}:${d.descricao}`).join(' | '),
    e.prescricoes.length,
    e.prescricoes.flatMap(p => p.medicamentos.map(m => `${m.molecula} ${m.dose} ${m.frequencia}`)).join(' | '),
    e.alertas_ignorados.length,
    e.alertas_ignorados.map(a => `[${a.severidade.toUpperCase()}] ${a.mensagem}`).join(' | '),
    e.ajustes_aplicados.length,
    e.ajustes_aplicados.map(a => `${a.tipo}: ${a.descricao}`).join(' | '),
    e.evidencias_consultadas.map(ev => `${ev.estudo} (${ev.nivel_evidencia})`).join(' | '),
    e.diretrizes_utilizadas.map(d => `${d.sociedade} ${d.ano}`).join(' | '),
    e.contexto_clinico ?? '',
    e.protocolo_aplicado ?? '',
    e.versao_sistema,
    e.origem,
  ].map(escape).join(','));

  return [headers.map(h => `"${h}"`).join(','), ...rows].join('\r\n');
}

export function exportarJSON(entries: AuditEntry[]): string {
  return JSON.stringify({
    exportado_em: new Date().toISOString(),
    sistema: 'PRESCREVE-AI',
    versao: SISTEMA_VER,
    total_registros: entries.length,
    registros: entries,
  }, null, 2);
}

export function downloadArquivo(conteudo: string, nome: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════
// ESTATÍSTICAS
// ═══════════════════════════════════════════════════════════

export interface AuditStats {
  total: number;
  por_tipo: Record<string, number>;
  por_status: Record<string, number>;
  total_prescricoes: number;
  total_alertas_ignorados: number;
  total_ajustes: number;
  alertas_por_severidade: Record<string, number>;
  medicamentos_mais_prescritos: { molecula: string; count: number }[];
  dias_com_atividade: number;
}

export function calcularEstatisticas(entries: AuditEntry[]): AuditStats {
  const por_tipo: Record<string, number>   = {};
  const por_status: Record<string, number> = {};
  const por_severidade: Record<string, number> = {};
  const molCount: Record<string, number>   = {};
  const diasSet = new Set<string>();

  let total_prescricoes = 0;
  let total_alertas = 0;
  let total_ajustes = 0;

  for (const e of entries) {
    por_tipo[e.tipo_evento]   = (por_tipo[e.tipo_evento]   ?? 0) + 1;
    por_status[e.status]      = (por_status[e.status]      ?? 0) + 1;
    total_prescricoes        += e.prescricoes.length;
    total_alertas            += e.alertas_ignorados.length;
    total_ajustes            += e.ajustes_aplicados.length;
    diasSet.add(e.timestamp_inicio.slice(0, 10));

    for (const al of e.alertas_ignorados) {
      por_severidade[al.severidade] = (por_severidade[al.severidade] ?? 0) + 1;
    }
    for (const px of e.prescricoes) {
      for (const m of px.medicamentos) {
        molCount[m.molecula] = (molCount[m.molecula] ?? 0) + 1;
      }
    }
  }

  const medicamentos_mais_prescritos = Object.entries(molCount)
    .map(([molecula, count]) => ({ molecula, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total:                    entries.length,
    por_tipo,
    por_status,
    total_prescricoes,
    total_alertas_ignorados:  total_alertas,
    total_ajustes,
    alertas_por_severidade:   por_severidade,
    medicamentos_mais_prescritos,
    dias_com_atividade:       diasSet.size,
  };
}

// ═══════════════════════════════════════════════════════════
// SEED DE DEMONSTRAÇÃO
// ═══════════════════════════════════════════════════════════

export function seedAuditDemo(): void {
  if (typeof window === 'undefined') return;
  if (loadAll().length > 0) return;

  const agora = new Date();
  const dataDe = (diasAtras: number) => {
    const d = new Date(agora);
    d.setDate(d.getDate() - diasAtras);
    return d.toISOString();
  };

  const demos: Omit<AuditEntry, 'id' | 'hash_integridade' | 'versao_schema' | 'versao_sistema'>[] = [
    {
      usuario: { nome: 'Dr. João Silva', crm: '123456', uf_crm: 'SP', especialidade: 'Cardiologia' },
      timestamp_inicio: dataDe(0),
      timestamp_fim:    dataDe(0),
      duracao_minutos:  25,
      paciente: { id_anonimo: gerarIdPacienteAnonimo('demo-1'), iniciais: 'M.A.S.', idade_anos: 68, sexo: 'M', peso_kg: 82, tfg_ml_min: 58, alergias_registradas: [], comorbidades_ativas: ['HAS', 'DM2', 'DRC G3a'] },
      tipo_evento: 'prescricao_gerada',
      status: 'finalizado',
      diagnosticos: [
        { cid: 'I10', descricao: 'Hipertensão arterial sistêmica', tipo: 'principal', confirmado: true, data_registro: dataDe(0) },
        { cid: 'E11', descricao: 'Diabetes mellitus tipo 2', tipo: 'secundario', confirmado: true, data_registro: dataDe(0) },
        { cid: 'N18.3', descricao: 'DRC estágio 3a', tipo: 'secundario', confirmado: true, data_registro: dataDe(0) },
      ],
      condutas: [
        { descricao: 'Intensificação anti-hipertensiva — adicionar BRA', tipo: 'medicamentosa', cid_relacionado: 'I10', diretriz_base: 'SBC DBHA-7 2020', registrada_em: dataDe(0) },
        { descricao: 'Orientação sobre dieta hipossódica e exercício', tipo: 'nao_medicamentosa', registrada_em: dataDe(0) },
        { descricao: 'Solicitação: função renal, eletrólitos, microalbuminúria', tipo: 'solicitacao_exame', registrada_em: dataDe(0) },
        { descricao: 'Retorno em 30 dias com exames', tipo: 'retorno', registrada_em: dataDe(0) },
      ],
      prescricoes: [
        {
          id_prescricao: 'PRX-001',
          data_prescricao: dataDe(0),
          status: 'emitida',
          hash_conteudo: hashConteudoPrescricao([{ molecula: 'Losartana', marca: 'Zart', laboratorio: 'Eurofarma', concentracao: '50 mg', dose: '50 mg', via: 'Oral', frequencia: '1×/dia', duracao: '30 dias', indicacao_cid: 'I10' }]),
          medicamentos: [
            { molecula: 'Losartana', marca: 'Zart', laboratorio: 'Eurofarma', concentracao: '50 mg', dose: '50 mg', via: 'Oral', frequencia: '1×/dia', duracao: '30 dias', indicacao_cid: 'I10' },
            { molecula: 'Metformina', concentracao: '850 mg', dose: '850 mg', via: 'Oral', frequencia: '2×/dia com refeição', duracao: '30 dias', indicacao_cid: 'E11' },
          ],
        },
      ],
      evidencias_consultadas: [
        { estudo: 'RENAAL', tipo: 'RCT', nivel_evidencia: 'A', grau_recomendacao: 'I', fonte: 'NEJM 2001', ano: 2001, consultada_em: dataDe(0) },
        { estudo: 'UKPDS 34', tipo: 'RCT', nivel_evidencia: 'A', grau_recomendacao: 'I', fonte: 'Lancet 1998', ano: 1998, consultada_em: dataDe(0) },
      ],
      diretrizes_utilizadas: [
        { sociedade: 'SBC', nome: 'Diretriz Brasileira de Hipertensão Arterial', ano: 2020, secao: 'Cap. 5 — Tratamento Farmacológico', recomendacao: 'BRA indicado em HAS + DRC diabética (Classe I-A)', consultada_em: dataDe(0) },
        { sociedade: 'ADA', nome: 'Standards of Medical Care in Diabetes', ano: 2024, secao: 'Section 11 — CKD', consultada_em: dataDe(0) },
      ],
      ajustes_aplicados: [
        { tipo: 'renal', descricao: 'TFG 58 mL/min — sem ajuste de dose de Losartana necessário (TFG > 15)', dose_original: '50 mg', dose_ajustada: '50 mg', motivo: 'TFG > 15 mL/min — BRA seguro sem ajuste', aplicado_em: dataDe(0) },
        { tipo: 'renal', descricao: 'TFG 58 mL/min — Metformina 850 mg com cautela (TFG 45–60: monitorar)', dose_original: '850 mg 2×/dia', dose_ajustada: '850 mg 2×/dia + monitorar TFG a cada 3 meses', motivo: 'TFG 45–60: manter, monitorar', aplicado_em: dataDe(0) },
      ],
      alertas_ignorados: [],
      alertas_aceitos: ['BRA em DRC — seguro, TFG 58 (acima do limiar de contraindicação)'],
      contexto_clinico: 'Paciente 68 anos, HAS + DM2 + DRC G3a, TFG 58. PA 152/94. HbA1c 7,2%. Creatinina 1,4. K+ 4,2. Iniciando BRA por proteinúria + DM2. Metformina mantida com monitoramento de TFG.',
      protocolo_aplicado: 'Protocolo HAS + DRC Diabética — SBC 2020',
      origem: 'consulta',
    },

    {
      usuario: { nome: 'Dr. João Silva', crm: '123456', uf_crm: 'SP', especialidade: 'Cardiologia' },
      timestamp_inicio: dataDe(2),
      timestamp_fim:    dataDe(2),
      duracao_minutos:  18,
      paciente: { id_anonimo: gerarIdPacienteAnonimo('demo-2'), iniciais: 'R.F.O.', idade_anos: 74, sexo: 'F', peso_kg: 65, tfg_ml_min: 38, alergias_registradas: ['IECA (tosse)'], comorbidades_ativas: ['HAS', 'IC-FEr FE 35%'] },
      tipo_evento: 'prescricao_gerada',
      status: 'finalizado',
      diagnosticos: [
        { cid: 'I50.0', descricao: 'IC com fração de ejeção reduzida (IC-FEr)', tipo: 'principal', confirmado: true, data_registro: dataDe(2) },
        { cid: 'I10', descricao: 'HAS', tipo: 'secundario', confirmado: true, data_registro: dataDe(2) },
      ],
      condutas: [
        { descricao: 'Titulação de Sacubitril/Valsartana — de 24/26 mg para 49/51 mg 2×/dia', tipo: 'medicamentosa', cid_relacionado: 'I50.0', diretriz_base: 'ESC-HF 2021', registrada_em: dataDe(2) },
      ],
      prescricoes: [
        {
          id_prescricao: 'PRX-002',
          data_prescricao: dataDe(2),
          status: 'emitida',
          hash_conteudo: hashConteudoPrescricao([{ molecula: 'Sacubitril/Valsartana', marca: 'Entresto', laboratorio: 'Novartis', concentracao: '49/51 mg', dose: '49/51 mg', via: 'Oral', frequencia: '2×/dia', indicacao_cid: 'I50.0' }]),
          medicamentos: [
            { molecula: 'Sacubitril/Valsartana', marca: 'Entresto', laboratorio: 'Novartis', concentracao: '49/51 mg', dose: '49/51 mg', via: 'Oral', frequencia: '2×/dia', duracao: '30 dias', indicacao_cid: 'I50.0' },
            { molecula: 'Carvedilol', marca: 'Coreg', concentracao: '12,5 mg', dose: '12,5 mg', via: 'Oral', frequencia: '2×/dia', duracao: '30 dias', indicacao_cid: 'I50.0' },
            { molecula: 'Espironolactona', concentracao: '25 mg', dose: '25 mg', via: 'Oral', frequencia: '1×/dia', duracao: '30 dias', indicacao_cid: 'I50.0' },
          ],
        },
      ],
      evidencias_consultadas: [
        { estudo: 'PARADIGM-HF', tipo: 'RCT', nivel_evidencia: 'B', grau_recomendacao: 'I', fonte: 'NEJM 2014', ano: 2014, consultada_em: dataDe(2) },
        { estudo: 'COPERNICUS', tipo: 'RCT', nivel_evidencia: 'A', grau_recomendacao: 'I', fonte: 'Circulation 2002', ano: 2002, consultada_em: dataDe(2) },
      ],
      diretrizes_utilizadas: [
        { sociedade: 'ESC', nome: 'ESC Heart Failure Guidelines', ano: 2021, secao: 'Quarteto da IC-FEr — Classe I', consultada_em: dataDe(2) },
      ],
      ajustes_aplicados: [
        { tipo: 'renal', descricao: 'TFG 38 — Sacubitril/Valsartana: iniciar com dose baixa 24/26 mg antes de titulação', dose_original: '97/103 mg', dose_ajustada: 'Titulação progressiva: 24/26 → 49/51 (dose atual)', motivo: 'TFG 30–60: titulação cautelosa conforme bula', aplicado_em: dataDe(2) },
        { tipo: 'renal', descricao: 'Espironolactona: monitorar K+ e creatinina — TFG 38 (limiar de cautela)', dose_original: '50 mg', dose_ajustada: '25 mg — máximo para TFG 30–60', motivo: 'TFG < 45: dose reduzida + monitoramento K+', aplicado_em: dataDe(2) },
      ],
      alertas_ignorados: [
        {
          tipo: 'interacao',
          severidade: 'grave',
          mensagem: 'Sacubitril/Valsartana + Espironolactona: risco de hipercalemia aditiva em TFG < 45',
          farmaco_a: 'Sacubitril/Valsartana',
          farmaco_b: 'Espironolactona',
          justificativa_medico: 'Combinação preconizada pelo quarteto ESC-HF 2021 — monitoramento semanal de K+ e creatinina nas primeiras 4 semanas',
          ignorado_em: dataDe(2),
        },
      ],
      alertas_aceitos: [],
      contexto_clinico: 'Paciente 74 anos, IC-FEr FE 35%, alérgica a IECA (tosse). Quarteto ESC: ARNI + BB + ARM + iSGLT2. Titulando Sacubitril/Valsartana. PA 118/72. FC 62. K+ 4,8 — monitorar.',
      protocolo_aplicado: 'Quarteto IC-FEr — ESC-HF 2021',
      origem: 'consulta',
    },

    {
      usuario: { nome: 'Dr. João Silva', crm: '123456', uf_crm: 'SP', especialidade: 'Cardiologia' },
      timestamp_inicio: dataDe(5),
      timestamp_fim:    dataDe(5),
      duracao_minutos:  30,
      paciente: { id_anonimo: gerarIdPacienteAnonimo('demo-3'), iniciais: 'P.L.M.', idade_anos: 55, sexo: 'M', peso_kg: 95, tfg_ml_min: 72, alergias_registradas: [], comorbidades_ativas: ['DM2', 'DCV estabelecida'] },
      tipo_evento: 'prescricao_gerada',
      status: 'finalizado',
      diagnosticos: [
        { cid: 'E11', descricao: 'DM2 + DCV estabelecida', tipo: 'principal', confirmado: true, data_registro: dataDe(5) },
        { cid: 'I25', descricao: 'Doença coronariana crônica', tipo: 'secundario', confirmado: true, data_registro: dataDe(5) },
        { cid: 'E78', descricao: 'Dislipidemia mista', tipo: 'secundario', confirmado: true, data_registro: dataDe(5) },
      ],
      condutas: [
        { descricao: 'Adicionar Empagliflozina 10 mg — DM2 + DCV (Classe I-A ADA 2024)', tipo: 'medicamentosa', cid_relacionado: 'E11', diretriz_base: 'ADA 2024', registrada_em: dataDe(5) },
        { descricao: 'Intensificar estatina — Atorvastatina 40→80 mg (LDL 98, meta < 50 mg/dL em DM+DCV)', tipo: 'medicamentosa', cid_relacionado: 'I25', diretriz_base: 'SBC 2025', registrada_em: dataDe(5) },
      ],
      prescricoes: [
        {
          id_prescricao: 'PRX-003',
          data_prescricao: dataDe(5),
          status: 'emitida',
          hash_conteudo: hashConteudoPrescricao([{ molecula: 'Empagliflozina', concentracao: '10 mg', dose: '10 mg', via: 'Oral', frequencia: '1×/dia', indicacao_cid: 'E11' }]),
          medicamentos: [
            { molecula: 'Empagliflozina', marca: 'Jardiance', laboratorio: 'Boehringer', concentracao: '10 mg', dose: '10 mg', via: 'Oral', frequencia: '1×/dia manhã', duracao: '30 dias', indicacao_cid: 'E11' },
            { molecula: 'Atorvastatina', concentracao: '80 mg', dose: '80 mg', via: 'Oral', frequencia: '1×/dia noite', duracao: '30 dias', indicacao_cid: 'I25' },
            { molecula: 'Metformina', concentracao: '1000 mg', dose: '1000 mg', via: 'Oral', frequencia: '2×/dia', duracao: '30 dias', indicacao_cid: 'E11' },
          ],
        },
      ],
      evidencias_consultadas: [
        { estudo: 'EMPA-REG OUTCOME', tipo: 'RCT', nivel_evidencia: 'A', grau_recomendacao: 'I', fonte: 'NEJM 2015', ano: 2015, consultada_em: dataDe(5) },
        { estudo: 'ASCOT-LLA', tipo: 'RCT', nivel_evidencia: 'A', grau_recomendacao: 'I', fonte: 'Lancet 2003', ano: 2003, consultada_em: dataDe(5) },
      ],
      diretrizes_utilizadas: [
        { sociedade: 'ADA', nome: 'Standards of Medical Care in Diabetes', ano: 2024, secao: 'Section 10 — Cardiovascular Disease', recomendacao: 'SGLT-2 ou GLP-1 com benefício CV comprovado em DM2 + DCV (Classe I-A)', consultada_em: dataDe(5) },
        { sociedade: 'SBC', nome: 'Diretriz de Dislipidemias', ano: 2025, secao: 'Metas lipídicas — risco muito alto', recomendacao: 'LDL < 50 mg/dL em DM + DCV (risco muito alto)', consultada_em: dataDe(5) },
      ],
      ajustes_aplicados: [],
      alertas_ignorados: [],
      alertas_aceitos: ['SGLT-2 indicado em DM2 + DCV — Classe I-A'],
      contexto_clinico: 'DM2 + DCV, LDL 98 mg/dL (meta < 50), HbA1c 7,8%. Adicionando SGLT-2 por indicação CV primária. Intensificando estatina para alta intensidade.',
      protocolo_aplicado: undefined,
      origem: 'consulta',
    },
  ];

  for (const d of demos) {
    registrarAudit(d);
  }
}

// ─── Labels de UI ─────────────────────────────────────────

export const TIPO_EVENTO_LABEL: Record<TipoEventoAudit, string> = {
  prescricao_gerada:       'Prescrição gerada',
  prescricao_editada:      'Prescrição editada',
  prescricao_cancelada:    'Prescrição cancelada',
  consulta_iniciada:       'Consulta iniciada',
  consulta_finalizada:     'Consulta finalizada',
  alerta_ignorado:         'Alerta ignorado',
  alerta_aceito:           'Alerta aceito',
  conduta_registrada:      'Conduta registrada',
  diretriz_consultada:     'Diretriz consultada',
  evidencia_consultada:    'Evidência consultada',
  ajuste_renal_aplicado:   'Ajuste renal aplicado',
  ajuste_hepatico_aplicado:'Ajuste hepático aplicado',
  interacao_detectada:     'Interação detectada',
  contraindicacao_detectada:'Contraindicação detectada',
  exportacao_realizada:    'Exportação realizada',
  acesso_historico:        'Acesso ao histórico',
  protocolo_aplicado:      'Protocolo aplicado',
};

export const STATUS_COR: Record<StatusAudit, string> = {
  ativo:      'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
  finalizado: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
  cancelado:  'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
  pendente:   'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
};

export const SEVERIDADE_COR: Record<SeveridadeAlerta, string> = {
  info:    'bg-sky-100    text-sky-700    dark:bg-sky-900/30    dark:text-sky-400',
  aviso:   'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  grave:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critico: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
};

export const TIPO_EVENTO_COR: Record<TipoEventoAudit, string> = {
  prescricao_gerada:        'text-green-600 dark:text-green-400',
  prescricao_editada:       'text-amber-600 dark:text-amber-400',
  prescricao_cancelada:     'text-red-600   dark:text-red-400',
  consulta_iniciada:        'text-blue-600  dark:text-blue-400',
  consulta_finalizada:      'text-blue-600  dark:text-blue-400',
  alerta_ignorado:          'text-red-600   dark:text-red-400',
  alerta_aceito:            'text-green-600 dark:text-green-400',
  conduta_registrada:       'text-purple-600 dark:text-purple-400',
  diretriz_consultada:      'text-indigo-600 dark:text-indigo-400',
  evidencia_consultada:     'text-indigo-600 dark:text-indigo-400',
  ajuste_renal_aplicado:    'text-orange-600 dark:text-orange-400',
  ajuste_hepatico_aplicado: 'text-orange-600 dark:text-orange-400',
  interacao_detectada:      'text-red-600   dark:text-red-400',
  contraindicacao_detectada:'text-red-600   dark:text-red-400',
  exportacao_realizada:     'text-slate-600 dark:text-slate-400',
  acesso_historico:         'text-slate-600 dark:text-slate-400',
  protocolo_aplicado:       'text-teal-600  dark:text-teal-400',
};
