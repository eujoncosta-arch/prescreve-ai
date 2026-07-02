'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield, Search, Download, Eye, AlertTriangle, CheckCircle2,
  FileText, Pill, BookOpen, Activity, Filter, X, ChevronDown,
  Clock, User, Hash, RefreshCw, Calendar, Stethoscope,
  TrendingUp, AlertOctagon, Zap, Database, BarChart3,
  ChevronRight, Lock, CheckCheck, XCircle, ClipboardCheck,
  FileJson, Table2, Info, Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AuditEntry, AuditSumario, FiltroAudit, StatusAudit, TipoEventoAudit,
  AuditStats, SeveridadeAlerta,
  listarAudits, gerarSumarios, buscarAudit, calcularEstatisticas,
  verificarIntegridade, exportarCSV, exportarJSON, downloadArquivo,
  seedAuditDemo, registrarAudit,
  TIPO_EVENTO_LABEL, STATUS_COR, SEVERIDADE_COR, TIPO_EVENTO_COR,
  gerarIdPacienteAnonimo, hashConteudoPrescricao,
} from '@/lib/medical-audit';

// ═══════════════════════════════════════════════════════════
// TIPOS LOCAIS
// ═══════════════════════════════════════════════════════════

type ViewMode = 'lista' | 'detalhe' | 'dashboard';

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ═══════════════════════════════════════════════════════════
// BADGE
// ═══════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: StatusAudit }) {
  const label: Record<StatusAudit, string> = {
    ativo: 'Ativo', finalizado: 'Finalizado', cancelado: 'Cancelado', pendente: 'Pendente',
  };
  return (
    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', STATUS_COR[status])}>
      {label[status]}
    </span>
  );
}

function SeveridadeBadge({ sev }: { sev: SeveridadeAlerta }) {
  const label: Record<SeveridadeAlerta, string> = {
    info: 'Info', aviso: 'Aviso', grave: 'Grave', critico: 'Crítico',
  };
  return (
    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', SEVERIDADE_COR[sev])}>
      {label[sev]}
    </span>
  );
}

function IntegridadeBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400">
      <Lock className="w-3 h-3" /> Íntegro
    </span>
  ) : (
    <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400">
      <AlertOctagon className="w-3 h-3" /> Adulterado
    </span>
  );
}

// ═══════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════

function StatCard({
  label, value, sub, icon: Icon, color = 'blue',
}: { label: string; value: string | number; sub?: string; icon: React.ElementType; color?: string }) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-50   dark:bg-blue-900/20   text-blue-600   dark:text-blue-400',
    green:  'bg-green-50  dark:bg-green-900/20  text-green-600  dark:text-green-400',
    amber:  'bg-amber-50  dark:bg-amber-900/20  text-amber-600  dark:text-amber-400',
    red:    'bg-red-50    dark:bg-red-900/20    text-red-600    dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    slate:  'bg-slate-50  dark:bg-slate-800     text-slate-600  dark:text-slate-400',
  };
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
          {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', colors[color])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// FILTROS PANEL
// ═══════════════════════════════════════════════════════════

function FiltrosPanel({
  filtros, onChange, onReset,
}: { filtros: FiltroAudit; onChange: (f: FiltroAudit) => void; onReset: () => void }) {
  const tipos = Object.entries(TIPO_EVENTO_LABEL) as [TipoEventoAudit, string][];
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Filtros</p>
        <button onClick={onReset} className="text-[10px] text-blue-600 hover:underline">Limpar tudo</button>
      </div>

      {/* Busca livre */}
      <div>
        <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Busca livre</label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={filtros.busca_livre ?? ''}
            onChange={e => onChange({ ...filtros, busca_livre: e.target.value || undefined })}
            placeholder="Nome, CRM, CID, medicamento, hash…"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-blue-400"
          />
        </div>
      </div>

      {/* Período */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Data início</label>
          <input
            type="date"
            value={filtros.data_inicio ?? ''}
            onChange={e => onChange({ ...filtros, data_inicio: e.target.value || undefined })}
            className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Data fim</label>
          <input
            type="date"
            value={filtros.data_fim ?? ''}
            onChange={e => onChange({ ...filtros, data_fim: e.target.value || undefined })}
            className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:border-blue-400"
          />
        </div>
      </div>

      {/* Tipo evento */}
      <div>
        <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Tipo de evento</label>
        <select
          value={filtros.tipo_evento ?? ''}
          onChange={e => onChange({ ...filtros, tipo_evento: (e.target.value as TipoEventoAudit) || undefined })}
          className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:border-blue-400"
        >
          <option value="">Todos</option>
          {tipos.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Status */}
      <div>
        <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Status</label>
        <select
          value={filtros.status ?? ''}
          onChange={e => onChange({ ...filtros, status: (e.target.value as StatusAudit) || undefined })}
          className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:border-blue-400"
        >
          <option value="">Todos</option>
          <option value="finalizado">Finalizado</option>
          <option value="ativo">Ativo</option>
          <option value="cancelado">Cancelado</option>
          <option value="pendente">Pendente</option>
        </select>
      </div>

      {/* Checkboxes */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filtros.com_alertas_ignorados ?? false}
            onChange={e => onChange({ ...filtros, com_alertas_ignorados: e.target.checked || undefined })}
            className="w-3.5 h-3.5 rounded accent-red-600"
          />
          <span className="text-xs text-slate-700 dark:text-slate-300">Apenas com alertas ignorados</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filtros.com_ajustes ?? false}
            onChange={e => onChange({ ...filtros, com_ajustes: e.target.checked || undefined })}
            className="w-3.5 h-3.5 rounded accent-amber-600"
          />
          <span className="text-xs text-slate-700 dark:text-slate-300">Apenas com ajustes de dose</span>
        </label>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LINHA DA LISTA
// ═══════════════════════════════════════════════════════════

function AuditRow({ sumario, onClick, integro }: { sumario: AuditSumario; onClick: () => void; integro: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
    >
      <div className="flex items-start gap-3">
        {/* Ícone de status */}
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
          sumario.n_alertas_ignorados > 0
            ? 'bg-red-100 dark:bg-red-900/30'
            : sumario.n_ajustes > 0
            ? 'bg-amber-100 dark:bg-amber-900/30'
            : 'bg-green-100 dark:bg-green-900/30'
        )}>
          {sumario.n_alertas_ignorados > 0
            ? <AlertTriangle className="w-4 h-4 text-red-500" />
            : sumario.n_ajustes > 0
            ? <Activity className="w-4 h-4 text-amber-500" />
            : <CheckCircle2 className="w-4 h-4 text-green-500" />
          }
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn('text-xs font-bold', TIPO_EVENTO_COR[sumario.tipo_evento])}>
              {TIPO_EVENTO_LABEL[sumario.tipo_evento]}
            </span>
            <StatusBadge status={sumario.status} />
            {sumario.n_alertas_ignorados > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {sumario.n_alertas_ignorados} alerta{sumario.n_alertas_ignorados > 1 ? 's' : ''} ignorado{sumario.n_alertas_ignorados > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{sumario.usuario_nome} — CRM {sumario.usuario_crm}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDate(sumario.timestamp_inicio)}</span>
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-[10px]">
            <span className="text-slate-500">Pac. <strong className="text-slate-700 dark:text-slate-300">{sumario.paciente_iniciais}</strong></span>
            {sumario.diagnosticos_principais.length > 0 && (
              <span className="text-slate-500">CID: <strong className="text-slate-700 dark:text-slate-300">{sumario.diagnosticos_principais.join(', ')}</strong></span>
            )}
            <span className="text-slate-400 flex items-center gap-1"><Pill className="w-3 h-3" />{sumario.n_prescricoes} prescr.</span>
            {sumario.n_ajustes > 0 && <span className="text-amber-600 dark:text-amber-400">{sumario.n_ajustes} ajuste{sumario.n_ajustes > 1 ? 's' : ''}</span>}
          </div>
        </div>

        {/* Hash + integridade */}
        <div className="flex-shrink-0 text-right">
          <p className="font-mono text-[10px] text-slate-400">{sumario.hash_integridade}</p>
          <div className="mt-1"><IntegridadeBadge ok={integro} /></div>
        </div>

        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1 group-hover:text-blue-500 transition-colors" />
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// DETALHE
// ═══════════════════════════════════════════════════════════

function DetalheAudit({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  const integro = verificarIntegridade(entry);
  const [activeTab, setActiveTab] = useState<'clinico' | 'prescricoes' | 'evidencias' | 'alertas' | 'ajustes' | 'rastreabilidade'>('clinico');

  const tabs = [
    { id: 'clinico',        label: 'Clínico',         icon: Stethoscope  },
    { id: 'prescricoes',    label: 'Prescrições',      icon: Pill         },
    { id: 'evidencias',     label: 'Evidências',       icon: BookOpen     },
    { id: 'alertas',        label: 'Alertas',          icon: AlertTriangle, badge: entry.alertas_ignorados.length },
    { id: 'ajustes',        label: 'Ajustes',          icon: Activity,    badge: entry.ajustes_aplicados.length },
    { id: 'rastreabilidade', label: 'Rastreabilidade', icon: Hash         },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              entry.alertas_ignorados.length > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'
            )}>
              {entry.alertas_ignorados.length > 0
                ? <AlertTriangle className="w-5 h-5 text-red-500" />
                : <CheckCircle2 className="w-5 h-5 text-green-500" />
              }
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className={cn('text-sm font-black', TIPO_EVENTO_COR[entry.tipo_evento])}>
                  {TIPO_EVENTO_LABEL[entry.tipo_evento]}
                </p>
                <StatusBadge status={entry.status} />
                <IntegridadeBadge ok={integro} />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{fmtDate(entry.timestamp_inicio)}{entry.duracao_minutos ? ` · ${entry.duracao_minutos} min` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* IDs */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-1 rounded">ID: {entry.id}</span>
          <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-1 rounded">Hash: {entry.hash_integridade}</span>
          <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-1 rounded">v{entry.versao_sistema}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto scrollbar-none border-b border-slate-100 dark:border-slate-800">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2.5 text-[11px] font-semibold border-b-2 whitespace-nowrap -mb-px transition-colors relative',
                activeTab === t.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon className="w-3.5 h-3.5" />{t.label}
              {'badge' in t && t.badge > 0 && (
                <span className="ml-0.5 text-[9px] font-black bg-red-500 text-white rounded-full px-1.5 py-0.5">{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Conteúdo das abas */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ── Clínico ── */}
        {activeTab === 'clinico' && (
          <>
            {/* Médico + Paciente */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Médico</p>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{entry.usuario.nome}</p>
                <p className="text-xs text-slate-500">CRM-{entry.usuario.uf_crm} {entry.usuario.crm}</p>
                {entry.usuario.especialidade && <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{entry.usuario.especialidade}</p>}
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Paciente (anonimizado)</p>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{entry.paciente.iniciais ?? '—'}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500 mt-1">
                  {entry.paciente.idade_anos && <span>{entry.paciente.idade_anos} anos</span>}
                  {entry.paciente.sexo && <span>{entry.paciente.sexo === 'M' ? 'Masculino' : entry.paciente.sexo === 'F' ? 'Feminino' : 'Outro'}</span>}
                  {entry.paciente.peso_kg && <span>{entry.paciente.peso_kg} kg</span>}
                  {entry.paciente.tfg_ml_min && <span className="font-semibold text-blue-600 dark:text-blue-400">TFG {entry.paciente.tfg_ml_min} mL/min</span>}
                  {entry.paciente.child_pugh && <span className="font-semibold text-amber-600">Child-Pugh {entry.paciente.child_pugh}</span>}
                </div>
                {entry.paciente.alergias_registradas.length > 0 && (
                  <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-semibold">
                    Alergias: {entry.paciente.alergias_registradas.join(', ')}
                  </p>
                )}
                {entry.paciente.comorbidades_ativas.length > 0 && (
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Comorbidades: {entry.paciente.comorbidades_ativas.join(', ')}
                  </p>
                )}
                <p className="font-mono text-[9px] text-slate-300 dark:text-slate-600 mt-1.5">{entry.paciente.id_anonimo}</p>
              </div>
            </div>

            {/* Diagnósticos */}
            {entry.diagnosticos.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Diagnósticos</p>
                <div className="space-y-1.5">
                  {entry.diagnosticos.map((d, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <span className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0',
                        d.tipo === 'principal' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                      )}>{d.cid}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{d.descricao}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{d.tipo}{d.confirmado ? ' — confirmado' : ' — suspeito'}</p>
                      </div>
                      {d.confirmado && <CheckCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Condutas */}
            {entry.condutas.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Condutas</p>
                <div className="space-y-1.5">
                  {entry.condutas.map((c, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <ClipboardCheck className="w-3.5 h-3.5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{c.descricao}</p>
                        <div className="flex gap-2 mt-0.5 text-[10px] text-slate-400">
                          <span className="capitalize">{c.tipo.replace(/_/g, ' ')}</span>
                          {c.diretriz_base && <span>· {c.diretriz_base}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contexto clínico */}
            {entry.contexto_clinico && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Contexto Clínico</p>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {entry.contexto_clinico}
                </div>
              </div>
            )}

            {/* Protocolo */}
            {entry.protocolo_aplicado && (
              <div className="flex items-center gap-2 p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl">
                <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase">Protocolo aplicado</p>
                  <p className="text-xs text-teal-700 dark:text-teal-300 font-semibold">{entry.protocolo_aplicado}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Prescrições ── */}
        {activeTab === 'prescricoes' && (
          <>
            {entry.prescricoes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Nenhuma prescrição registrada neste evento.</p>
            ) : (
              entry.prescricoes.map((px, i) => (
                <div key={px.id_prescricao} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Prescrição #{i + 1} — {px.id_prescricao}</p>
                        <p className="text-[10px] text-slate-400">{fmtDate(px.data_prescricao)} · {px.status}</p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{px.hash_conteudo}</span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {px.medicamentos.map((m, j) => (
                      <div key={j} className="p-3 flex items-start gap-3">
                        <Pill className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{m.molecula}</p>
                            {m.marca && <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">{m.marca}</span>}
                            {m.laboratorio && <span className="text-[10px] text-slate-400">({m.laboratorio})</span>}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                            {m.dose} {m.via} · {m.frequencia}
                            {m.duracao ? ` · ${m.duracao}` : ''}
                          </p>
                          <p className="text-[10px] text-slate-400">Indicação: {m.indicacao_cid}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {px.motivo_cancelamento && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-xs text-red-700 dark:text-red-400">
                      Motivo cancelamento: {px.motivo_cancelamento}
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {/* ── Evidências ── */}
        {activeTab === 'evidencias' && (
          <>
            {entry.evidencias_consultadas.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Evidências consultadas</p>
                <div className="space-y-2">
                  {entry.evidencias_consultadas.map((ev, i) => (
                    <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400">{ev.nivel_evidencia}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{ev.estudo}</p>
                        <p className="text-[10px] text-slate-500">{ev.tipo}{ev.ano ? ` · ${ev.ano}` : ''} · {ev.fonte}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold">Nível {ev.nivel_evidencia}</span>
                          <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">Grau {ev.grau_recomendacao}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {entry.diretrizes_utilizadas.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Diretrizes utilizadas</p>
                <div className="space-y-2">
                  {entry.diretrizes_utilizadas.map((d, i) => (
                    <div key={i} className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded flex-shrink-0">{d.sociedade}</span>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{d.nome} ({d.ano})</p>
                          {d.secao && <p className="text-[10px] text-slate-500">{d.secao}</p>}
                          {d.recomendacao && (
                            <p className="text-[10px] text-blue-700 dark:text-blue-300 mt-1 italic">&ldquo;{d.recomendacao}&rdquo;</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {entry.evidencias_consultadas.length === 0 && entry.diretrizes_utilizadas.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">Nenhuma evidência ou diretriz registrada.</p>
            )}
          </>
        )}

        {/* ── Alertas ── */}
        {activeTab === 'alertas' && (
          <>
            {entry.alertas_ignorados.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Alertas ignorados pelo médico</p>
                <div className="space-y-2">
                  {entry.alertas_ignorados.map((al, i) => (
                    <div key={i} className={cn(
                      'p-3 rounded-xl border',
                      al.severidade === 'critico' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                      al.severidade === 'grave'   ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' :
                      al.severidade === 'aviso'   ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' :
                      'bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-800'
                    )}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <AlertOctagon className={cn('w-4 h-4 flex-shrink-0',
                            al.severidade === 'critico' ? 'text-red-500' :
                            al.severidade === 'grave'   ? 'text-orange-500' :
                            al.severidade === 'aviso'   ? 'text-amber-500' : 'text-sky-500'
                          )} />
                          <SeveridadeBadge sev={al.severidade} />
                          <span className="text-[10px] text-slate-500 capitalize">{al.tipo.replace(/_/g, ' ')}</span>
                        </div>
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{al.mensagem}</p>
                      {(al.farmaco_a || al.farmaco_b) && (
                        <p className="text-[10px] text-slate-500 mt-1">
                          {al.farmaco_a}{al.farmaco_b ? ` ↔ ${al.farmaco_b}` : ''}
                        </p>
                      )}
                      {al.justificativa_medico && (
                        <div className="mt-2 p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <p className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">Justificativa do médico</p>
                          <p className="text-xs text-slate-700 dark:text-slate-300 italic">&ldquo;{al.justificativa_medico}&rdquo;</p>
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1.5">Ignorado em: {fmtDate(al.ignorado_em)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {entry.alertas_aceitos.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Alertas aceitos / reconhecidos</p>
                <div className="space-y-1.5">
                  {entry.alertas_aceitos.map((al, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-green-700 dark:text-green-300">{al}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {entry.alertas_ignorados.length === 0 && entry.alertas_aceitos.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Nenhum alerta neste evento.</p>
              </div>
            )}
          </>
        )}

        {/* ── Ajustes ── */}
        {activeTab === 'ajustes' && (
          <>
            {entry.ajustes_aplicados.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Nenhum ajuste de dose aplicado.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {entry.ajustes_aplicados.map((a, i) => (
                  <div key={i} className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <div className="flex items-start gap-2 mb-2">
                      <Activity className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{a.descricao}</p>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold capitalize">{a.tipo.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-2">
                        <p className="text-[10px] text-slate-400 mb-0.5">Dose original</p>
                        <p className="text-xs font-mono font-semibold text-red-600 dark:text-red-400 line-through">{a.dose_original}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-2">
                        <p className="text-[10px] text-slate-400 mb-0.5">Dose ajustada</p>
                        <p className="text-xs font-mono font-semibold text-green-600 dark:text-green-400">{a.dose_ajustada}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5">Motivo: {a.motivo}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Aplicado em: {fmtDate(a.aplicado_em)}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Rastreabilidade ── */}
        {activeTab === 'rastreabilidade' && (
          <div className="space-y-3">
            <div className={cn(
              'p-4 rounded-xl border',
              integro ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
            )}>
              <div className="flex items-center gap-2 mb-2">
                <Lock className={cn('w-5 h-5', integro ? 'text-green-600' : 'text-red-600')} />
                <p className={cn('font-black text-sm', integro ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300')}>
                  {integro ? 'Integridade verificada — registro não foi adulterado' : 'ALERTA: Hash não confere — registro pode ter sido adulterado'}
                </p>
              </div>
              <p className="text-xs text-slate-500">O hash de integridade é recalculado e comparado com o valor armazenado a cada visualização.</p>
            </div>

            <div className="space-y-2">
              {[
                { label: 'ID do registro',      value: entry.id,               mono: true  },
                { label: 'Hash de integridade', value: entry.hash_integridade, mono: true  },
                { label: 'Versão do schema',    value: String(entry.versao_schema), mono: false },
                { label: 'Versão do sistema',   value: entry.versao_sistema,   mono: false },
                { label: 'Origem',              value: entry.origem,           mono: false },
                { label: 'Início',              value: fmtDate(entry.timestamp_inicio), mono: false },
                { label: 'Fim',                 value: entry.timestamp_fim ? fmtDate(entry.timestamp_fim) : '—', mono: false },
                { label: 'Duração',             value: entry.duracao_minutos ? `${entry.duracao_minutos} minutos` : '—', mono: false },
                { label: 'ID Paciente anonimizado', value: entry.paciente.id_anonimo, mono: true },
              ].map(({ label, value, mono }) => (
                <div key={label} className="grid grid-cols-[180px_1fr] gap-2 items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
                  <p className={cn('text-xs text-slate-700 dark:text-slate-300', mono && 'font-mono')}>{value}</p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-[10px] text-slate-400 space-y-1">
              <p className="font-bold text-slate-500 uppercase">Nota de conformidade</p>
              <p>Este registro é gerado e armazenado localmente com hash de integridade para rastreabilidade.</p>
              <p>Para finalidades legais e auditorias formais, exporte o JSON completo e preserve em sistema de arquivos imutável ou com assinatura digital.</p>
              <p className="text-amber-600 dark:text-amber-400">O armazenamento em localStorage é volátil — para compliance jurídico, integre a um backend seguro.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD DE ESTATÍSTICAS
// ═══════════════════════════════════════════════════════════

function Dashboard({ stats, entries }: { stats: AuditStats; entries: AuditEntry[] }) {
  const topMeds = stats.medicamentos_mais_prescritos.slice(0, 8);
  const maxCount = topMeds[0]?.count ?? 1;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total de registros"     value={stats.total}                    icon={Database}       color="blue"   />
        <StatCard label="Prescrições geradas"    value={stats.total_prescricoes}         icon={Pill}           color="green"  />
        <StatCard label="Alertas ignorados"      value={stats.total_alertas_ignorados}   icon={AlertTriangle}  color="red"    sub={`${(stats.alertas_por_severidade['critico'] ?? 0)} críticos`} />
        <StatCard label="Ajustes de dose"        value={stats.total_ajustes}             icon={Activity}       color="amber"  />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Dias com atividade"     value={stats.dias_com_atividade}        icon={Calendar}       color="purple" />
        <StatCard label="Alertas graves/críticos" value={(stats.alertas_por_severidade['grave'] ?? 0) + (stats.alertas_por_severidade['critico'] ?? 0)} icon={AlertOctagon} color="red" />
        <StatCard label="Consultas finalizadas"  value={stats.por_status['finalizado'] ?? 0} icon={CheckCircle2} color="green" />
        <StatCard label="Eventos cancelados"     value={stats.por_status['cancelado'] ?? 0}  icon={XCircle}    color="slate"  />
      </div>

      {/* Medicamentos mais prescritos */}
      {topMeds.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">Moléculas mais prescritas</p>
          <div className="space-y-2.5">
            {topMeds.map(({ molecula, count }) => (
              <div key={molecula} className="flex items-center gap-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-36 truncate">{molecula}</p>
                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 w-8 text-right">{count}×</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Distribuição por tipo */}
      {Object.keys(stats.por_tipo).length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Distribuição por tipo de evento</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(stats.por_tipo).sort(([,a],[,b]) => b-a).map(([tipo, count]) => (
              <div key={tipo} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 truncate">{TIPO_EVENTO_LABEL[tipo as TipoEventoAudit] ?? tipo}</p>
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 ml-1">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas por severidade */}
      {Object.keys(stats.alertas_por_severidade).length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Alertas ignorados por severidade</p>
          <div className="grid grid-cols-4 gap-2">
            {(['critico','grave','aviso','info'] as SeveridadeAlerta[]).map(sev => (
              <div key={sev} className={cn('p-3 rounded-xl text-center border', SEVERIDADE_COR[sev].replace('text-', 'border-').split(' ')[0])}>
                <p className="text-lg font-black text-slate-800 dark:text-slate-200">{stats.alertas_por_severidade[sev] ?? 0}</p>
                <SeveridadeBadge sev={sev} />
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum dado de auditoria disponível.</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PAGE PRINCIPAL
// ═══════════════════════════════════════════════════════════

export default function AuditoriaPage() {
  const [entries, setEntries]           = useState<AuditEntry[]>([]);
  const [filtros, setFiltros]           = useState<FiltroAudit>({});
  const [view, setView]                 = useState<ViewMode>('lista');
  const [selectedEntry, setSelected]    = useState<AuditEntry | null>(null);
  const [showFiltros, setShowFiltros]   = useState(false);
  const [hydrated, setHydrated]         = useState(false);
  const [exportMsg, setExportMsg]       = useState<string | null>(null);

  useEffect(() => {
    seedAuditDemo();
    setEntries(listarAudits(filtros));
    setHydrated(true);
  }, []);

  const refresh = useCallback(() => {
    setEntries(listarAudits(filtros));
  }, [filtros]);

  useEffect(() => {
    if (hydrated) refresh();
  }, [filtros, hydrated, refresh]);

  const sumarios = useMemo(() => gerarSumarios(entries), [entries]);
  const stats    = useMemo(() => calcularEstatisticas(entries), [entries]);

  const integridadeMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const e of entries) map[e.id] = verificarIntegridade(e);
    return map;
  }, [entries]);

  const handleExport = (tipo: 'csv' | 'json') => {
    const conteudo = tipo === 'csv' ? exportarCSV(entries) : exportarJSON(entries);
    const ext      = tipo === 'csv' ? 'csv' : 'json';
    const mime     = tipo === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json';
    const ts       = new Date().toISOString().slice(0, 10);
    downloadArquivo(conteudo, `auditoria_prescreve_ai_${ts}.${ext}`, mime);
    registrarAudit({
      usuario: { nome: 'Dr. João Silva', crm: '123456', uf_crm: 'SP', especialidade: 'Cardiologia' },
      timestamp_inicio: new Date().toISOString(),
      paciente: { id_anonimo: 'SISTEMA', alergias_registradas: [], comorbidades_ativas: [] },
      tipo_evento: 'exportacao_realizada',
      status: 'finalizado',
      diagnosticos: [], condutas: [], prescricoes: [], evidencias_consultadas: [],
      diretrizes_utilizadas: [], ajustes_aplicados: [], alertas_ignorados: [], alertas_aceitos: [],
      contexto_clinico: `Exportação de ${entries.length} registros em formato ${tipo.toUpperCase()}`,
      origem: 'manual',
    });
    setExportMsg(`${entries.length} registros exportados em ${tipo.toUpperCase()}`);
    setTimeout(() => setExportMsg(null), 3500);
    refresh();
  };

  const nFiltrosAtivos = Object.values(filtros).filter(v => v !== undefined && v !== false).length;

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white">Medical Audit Engine</h1>
              <p className="text-xs text-slate-500">Rastreabilidade clínica e jurídica · {stats.total} registros</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Toast exportação */}
            {exportMsg && (
              <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-3 py-1.5 rounded-lg font-semibold">
                {exportMsg}
              </span>
            )}

            {/* Exportar */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-all">
                <Download className="w-3.5 h-3.5" /> Exportar <ChevronDown className="w-3 h-3" />
              </button>
              <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 z-10 hidden group-hover:block">
                <button onClick={() => handleExport('csv')} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                  <Table2 className="w-3.5 h-3.5 text-green-600" /> CSV (Excel)
                </button>
                <button onClick={() => handleExport('json')} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                  <FileJson className="w-3.5 h-3.5 text-blue-600" /> JSON completo
                </button>
              </div>
            </div>

            {/* Refresh */}
            <button onClick={refresh} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:border-blue-400 transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* View toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
              {([
                { id: 'lista',     label: 'Lista',      icon: FileText   },
                { id: 'dashboard', label: 'Dashboard',  icon: BarChart3  },
              ] as { id: ViewMode; label: string; icon: React.ElementType }[]).map(v => {
                const Icon = v.icon;
                return (
                  <button
                    key={v.id}
                    onClick={() => setView(v.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                      view === v.id
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />{v.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Aviso de conformidade */}
        <div className="mt-3 flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-700 dark:text-amber-300">
            <strong>Suporte à decisão clínica</strong> — Este sistema de auditoria é auxiliar à prática médica. Para fins legais e de compliance regulatório, exporte os registros e preserve em sistema certificado. Dados armazenados localmente com hash de integridade.
          </p>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 min-h-0 overflow-hidden flex">

        {/* Dashboard view */}
        {view === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-6">
            <Dashboard stats={stats} entries={entries} />
          </div>
        )}

        {/* Lista view */}
        {view === 'lista' && (
          <>
            {/* Sidebar de filtros */}
            <div className={cn(
              'flex-shrink-0 overflow-y-auto transition-all duration-300 border-r border-slate-100 dark:border-slate-800',
              showFiltros ? 'w-64 p-3' : 'w-0 overflow-hidden'
            )}>
              {showFiltros && (
                <FiltrosPanel
                  filtros={filtros}
                  onChange={setFiltros}
                  onReset={() => setFiltros({})}
                />
              )}
            </div>

            {/* Lista */}
            <div className={cn('flex-1 min-w-0 overflow-y-auto', selectedEntry && 'hidden lg:block lg:max-w-sm xl:max-w-md')}>
              {/* Barra de busca rápida */}
              <div className="sticky top-0 z-10 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <button
                  onClick={() => setShowFiltros(s => !s)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all',
                    showFiltros
                      ? 'border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-400 hover:text-blue-600'
                  )}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filtros
                  {nFiltrosAtivos > 0 && (
                    <span className="ml-0.5 text-[9px] font-black bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center">{nFiltrosAtivos}</span>
                  )}
                </button>

                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={filtros.busca_livre ?? ''}
                    onChange={e => setFiltros(f => ({ ...f, busca_livre: e.target.value || undefined }))}
                    placeholder="Buscar por nome, CRM, CID, medicamento, hash…"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-blue-400"
                  />
                  {filtros.busca_livre && (
                    <button onClick={() => setFiltros(f => ({ ...f, busca_livre: undefined }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 whitespace-nowrap">{sumarios.length} resultado{sumarios.length !== 1 ? 's' : ''}</p>
              </div>

              {/* Registros */}
              {sumarios.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Shield className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">Nenhum registro encontrado</p>
                  {nFiltrosAtivos > 0 && (
                    <button onClick={() => setFiltros({})} className="mt-2 text-xs text-blue-600 hover:underline">Limpar filtros</button>
                  )}
                </div>
              ) : (
                <div>
                  {sumarios.map(s => (
                    <AuditRow
                      key={s.id}
                      sumario={s}
                      integro={integridadeMap[s.id] ?? true}
                      onClick={() => {
                        const entry = buscarAudit(s.id);
                        if (entry) setSelected(entry);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Detalhe */}
            {selectedEntry && (
              <div className="flex-1 overflow-y-auto p-4 min-w-0 border-l border-slate-100 dark:border-slate-800">
                <DetalheAudit
                  entry={selectedEntry}
                  onClose={() => setSelected(null)}
                />
              </div>
            )}

            {/* Placeholder sem detalhe */}
            {!selectedEntry && (
              <div className="hidden lg:flex flex-1 items-center justify-center border-l border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700">
                <div className="text-center">
                  <Eye className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm">Selecione um registro para ver detalhes</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
