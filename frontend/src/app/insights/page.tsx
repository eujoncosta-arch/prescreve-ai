'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Brain, TrendingUp, Pill, Activity, Shield, Users, BarChart3,
  AlertTriangle, BookOpen, Search, Info, Layers, Sparkles,
  ChevronRight, ArrowUp, ArrowDown, Minus, Eye, EyeOff,
  Stethoscope, FlaskConical, Target, Zap, CircleDot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { listarAudits } from '@/lib/medical-audit';
import {
  gerarInsights, seedInsightsDemo,
  InsightGeral, InsightCondicao, CombinacaoTerapeutica,
  NIVEL_EV_COR, CLASSE_COR,
  normalizarMolecula,
} from '@/lib/clinical-insights';

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function fmtDateShort(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

// ─── Mini barra de progresso ─────────────────────────────

function BarPct({
  pct, color = 'blue', label, value, sub,
}: {
  pct: number; color?: string; label: string; value: number | string; sub?: string;
}) {
  const cls: Record<string, string> = {
    blue:   'bg-blue-500',
    green:  'bg-green-500',
    amber:  'bg-amber-500',
    red:    'bg-red-500',
    purple: 'bg-purple-500',
    teal:   'bg-teal-500',
    rose:   'bg-rose-500',
    indigo: 'bg-indigo-500',
    cyan:   'bg-cyan-500',
    violet: 'bg-violet-500',
  };
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate pr-2">{label}</p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {sub && <span className="text-[10px] text-slate-400">{sub}</span>}
          <span className="text-xs font-black text-slate-800 dark:text-slate-200">{value}</span>
        </div>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', cls[color] ?? cls.blue)}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Card de combinação terapêutica ──────────────────────

function ComboCard({
  combo, rank, color = 'blue',
}: {
  combo: CombinacaoTerapeutica; rank: number; color?: string;
}) {
  const rankColors = ['bg-amber-400 text-white', 'bg-slate-400 text-white', 'bg-amber-700 text-white'];
  const rankLabel  = ['1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º', '9º', '10º'];
  const borderCls: Record<string, string> = {
    blue:   'border-blue-200   dark:border-blue-800   bg-blue-50/50   dark:bg-blue-900/10',
    green:  'border-green-200  dark:border-green-800  bg-green-50/50  dark:bg-green-900/10',
    amber:  'border-amber-200  dark:border-amber-800  bg-amber-50/50  dark:bg-amber-900/10',
    purple: 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10',
    teal:   'border-teal-200   dark:border-teal-800   bg-teal-50/50   dark:bg-teal-900/10',
    rose:   'border-rose-200   dark:border-rose-800   bg-rose-50/50   dark:bg-rose-900/10',
  };

  return (
    <div className={cn('border rounded-xl p-3 transition-all hover:shadow-sm', borderCls[color] ?? borderCls.blue)}>
      <div className="flex items-start gap-2.5">
        <span className={cn(
          'w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5',
          rank < 3 ? rankColors[rank] : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
        )}>
          {rankLabel[rank] ?? `${rank + 1}º`}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1 mb-1.5">
            {combo.moleculas.map(m => (
              <span key={m} className="text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-300">
                {normalizarMolecula(m)}
              </span>
            ))}
          </div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{combo.label}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-slate-400">{combo.frequencia}× utilizado</span>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{combo.percentual}% dos casos</span>
            {combo.nivel_evidencia_min && (
              <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded', NIVEL_EV_COR[combo.nivel_evidencia_min])}>
                Nív. {combo.nivel_evidencia_min}
              </span>
            )}
          </div>
          {combo.cids.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {combo.cids.map(cid => (
                <span key={cid} className="text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">{cid}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sparkline simples ────────────────────────────────────

function Sparkline({ data, color = '#3b82f6' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points.split(' ').pop()!.split(',')[0]} cy={points.split(' ').pop()!.split(',')[1]} r="3" fill={color} />
    </svg>
  );
}

// ─── Trend indicator ─────────────────────────────────────

function TrendIndicator({ atual, anterior }: { atual: number; anterior: number }) {
  if (anterior === 0) return null;
  const delta = ((atual - anterior) / anterior) * 100;
  if (Math.abs(delta) < 5) return <Minus className="w-3 h-3 text-slate-400" />;
  if (delta > 0) return <div className="flex items-center gap-0.5 text-green-600 dark:text-green-400"><ArrowUp className="w-3 h-3" /><span className="text-[10px] font-bold">{Math.abs(delta).toFixed(0)}%</span></div>;
  return <div className="flex items-center gap-0.5 text-red-500"><ArrowDown className="w-3 h-3" /><span className="text-[10px] font-bold">{Math.abs(delta).toFixed(0)}%</span></div>;
}

// ─── Seção de condição ────────────────────────────────────

function CondicaoSection({ condicao }: { condicao: InsightCondicao }) {
  const [expanded, setExpanded] = useState(false);
  const colors = ['blue', 'green', 'amber', 'purple', 'teal', 'rose', 'indigo', 'cyan'];
  const color  = colors[Math.abs(condicao.cid.charCodeAt(0)) % colors.length];

  const cidBg: Record<string, string> = {
    blue:   'bg-blue-600',
    green:  'bg-green-600',
    amber:  'bg-amber-600',
    purple: 'bg-purple-600',
    teal:   'bg-teal-600',
    rose:   'bg-rose-600',
    indigo: 'bg-indigo-600',
    cyan:   'bg-cyan-600',
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
      {/* Header da condição */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
      >
        <span className={cn('text-[10px] font-black text-white px-2 py-1 rounded-lg flex-shrink-0', cidBg[color] ?? cidBg.blue)}>
          {condicao.cid}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{condicao.descricao}</p>
          <p className="text-[10px] text-slate-400">
            {condicao.n_eventos} evento{condicao.n_eventos !== 1 ? 's' : ''} · {condicao.top_combinacoes.length} combinação{condicao.top_combinacoes.length !== 1 ? 'ões' : ''} detectada{condicao.top_combinacoes.length !== 1 ? 's' : ''}
            {condicao.n_alertas_ignorados_total > 0 && ` · ${condicao.n_alertas_ignorados_total} alerta${condicao.n_alertas_ignorados_total !== 1 ? 's' : ''} ignorado${condicao.n_alertas_ignorados_total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {condicao.percentual_com_ajuste_renal > 0 && (
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
              {condicao.percentual_com_ajuste_renal}% ajuste renal
            </span>
          )}
          <ChevronRight className={cn('w-4 h-4 text-slate-400 transition-transform', expanded && 'rotate-90')} />
        </div>
      </button>

      {/* Conteúdo expandido */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-5">

          {/* Top combinações */}
          {condicao.top_combinacoes.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                Condutas mais frequentes — combinações terapêuticas
              </p>
              <div className="space-y-2">
                {condicao.top_combinacoes.map((c, i) => (
                  <ComboCard key={c.moleculas.join('+')} combo={c} rank={i} color={color} />
                ))}
              </div>
            </div>
          )}

          {/* Top moléculas */}
          {condicao.top_moleculas.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Moléculas mais prescritas</p>
              <div className="space-y-2">
                {condicao.top_moleculas.map(m => (
                  <BarPct
                    key={m.molecula}
                    label={m.molecula}
                    pct={m.percentual}
                    value={`${m.frequencia}×`}
                    sub={`${m.percentual}%`}
                    color={color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Diretrizes */}
          {condicao.top_diretrizes.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Diretrizes consultadas</p>
              <div className="flex flex-wrap gap-1.5">
                {condicao.top_diretrizes.map(d => (
                  <span key={d.sociedade} className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                    {d.sociedade} ({d.frequencia}×)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats de segurança */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-slate-800 dark:text-slate-200">{condicao.n_alertas_ignorados_total}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Alertas ignorados</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-slate-800 dark:text-slate-200">{condicao.n_ajustes_total}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Ajustes de dose</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-slate-800 dark:text-slate-200">{condicao.percentual_com_ajuste_renal}%</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Com ajuste renal</p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PAGE PRINCIPAL
// ═══════════════════════════════════════════════════════════

type ActiveTab = 'condicoes' | 'combinacoes' | 'moleculas' | 'tendencias' | 'protocolos' | 'seguranca';

export default function InsightsPage() {
  const [insights, setInsights] = useState<InsightGeral | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('condicoes');
  const [searchCid, setSearchCid] = useState('');
  const [showPrivacyNote, setShowPrivacyNote] = useState(true);

  useEffect(() => {
    seedInsightsDemo();
    const entries = listarAudits();
    setInsights(gerarInsights(entries));
    setHydrated(true);
  }, []);

  const condicoesFiltradas = useMemo(() => {
    if (!insights) return [];
    const q = searchCid.toLowerCase();
    if (!q) return insights.insights_por_condicao;
    return insights.insights_por_condicao.filter(c =>
      c.cid.toLowerCase().includes(q) ||
      c.descricao.toLowerCase().includes(q)
    );
  }, [insights, searchCid]);

  const tabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'condicoes',   label: 'Por condição',        icon: Stethoscope  },
    { id: 'combinacoes', label: 'Combinações globais', icon: Layers       },
    { id: 'moleculas',   label: 'Moléculas',           icon: Pill         },
    { id: 'tendencias',  label: 'Tendências',          icon: TrendingUp   },
    { id: 'protocolos',  label: 'Protocolos',          icon: FlaskConical },
    { id: 'seguranca',   label: 'Segurança',           icon: Shield       },
  ];

  if (!hydrated || !insights) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const meses = insights.tendencias_mensais;
  const ultMes  = meses[meses.length - 1];
  const penMes  = meses[meses.length - 2];

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto">

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl flex items-center justify-center shadow-sm">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white">Clinical Insights Engine</h1>
              <p className="text-xs text-slate-500">
                Inteligência coletiva anonimizada · {insights.total_eventos_anonimizados} eventos ·{' '}
                {fmtDateShort(insights.periodo_inicio)} → {fmtDateShort(insights.periodo_fim)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPrivacyNote(s => !s)}
            className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showPrivacyNote ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPrivacyNote ? 'Ocultar' : 'Ver'} nota de privacidade
          </button>
        </div>

        {/* Aviso de privacidade */}
        {showPrivacyNote && (
          <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl flex items-start gap-2">
            <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="text-[10px] text-purple-700 dark:text-purple-300 space-y-0.5">
              <p className="font-bold">Anonimização garantida — k-anonimidade ≥ 3</p>
              <p>Nenhum dado individual é exibido. Todos os insights são gerados a partir de agregações com mínimo de 3 eventos por célula. Identificadores de pacientes, médicos e datas específicas são removidos do processamento. Dados processados localmente — nenhuma informação é transmitida.</p>
            </div>
          </div>
        )}

        {/* KPIs rápidos */}
        <div className="mt-4 grid grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { label: 'Eventos',       value: insights.total_eventos_anonimizados, icon: Users,         color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Prescrições',   value: insights.total_prescricoes,          icon: Pill,          color: 'text-green-600 dark:text-green-400' },
            { label: 'Ajustes',       value: insights.total_ajustes,              icon: Activity,      color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Alertas ign.',  value: insights.total_alertas_ignorados,    icon: AlertTriangle, color: 'text-red-500' },
            { label: 'Condições',     value: insights.insights_por_condicao.length, icon: Stethoscope, color: 'text-purple-600 dark:text-purple-400' },
            { label: 'Combinações',   value: insights.top_combinacoes_global.length, icon: Layers,     color: 'text-teal-600 dark:text-teal-400' },
            { label: 'Moléculas',     value: insights.top_moleculas_global.length, icon: FlaskConical, color: 'text-indigo-600 dark:text-indigo-400' },
            { label: 'Protocolos',    value: insights.top_protocolos.length,      icon: Target,        color: 'text-rose-600 dark:text-rose-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 text-center">
              <Icon className={cn('w-4 h-4 mx-auto mb-1', color)} />
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">{value}</p>
              <p className="text-[9px] text-slate-400 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex-shrink-0 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex overflow-x-auto scrollbar-none px-4">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap -mb-px transition-colors',
                  activeTab === t.id
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                <Icon className="w-3.5 h-3.5" />{t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <div className="flex-1 p-6 space-y-5">

        {/* ══ ABA: Por condição ══ */}
        {activeTab === 'condicoes' && (
          <>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={searchCid}
                  onChange={e => setSearchCid(e.target.value)}
                  placeholder="Filtrar por CID ou condição…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-purple-400"
                />
              </div>
              <p className="text-xs text-slate-400">{condicoesFiltradas.length} condição{condicoesFiltradas.length !== 1 ? 'ões' : ''}</p>
            </div>

            {condicoesFiltradas.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Stethoscope className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma condição com dados suficientes (mín. 3 eventos)</p>
              </div>
            ) : (
              <div className="space-y-3">
                {condicoesFiltradas.map(c => (
                  <CondicaoSection key={c.cid} condicao={c} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ ABA: Combinações globais ══ */}
        {activeTab === 'combinacoes' && (
          <>
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">Combinações terapêuticas mais utilizadas</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">Pares e trios de moléculas co-prescritas — ordenado por frequência · k ≥ 3</p>
              </div>
              <span className="text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full">
                {insights.top_combinacoes_global.length} combinações
              </span>
            </div>

            {insights.top_combinacoes_global.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Dados insuficientes para combinações (mín. 3 eventos)</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {insights.top_combinacoes_global.map((c, i) => (
                  <ComboCard key={c.moleculas.join('+')} combo={c} rank={i} color={['blue', 'green', 'teal', 'purple', 'amber', 'rose'][i % 6]} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ ABA: Moléculas ══ */}
        {activeTab === 'moleculas' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top moléculas */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">Top moléculas prescritas</p>
              <div className="space-y-3">
                {insights.top_moleculas_global.map((m, i) => (
                  <BarPct
                    key={m.molecula}
                    label={m.molecula}
                    pct={m.percentual}
                    value={`${m.frequencia}×`}
                    sub={`${m.percentual}%`}
                    color={['blue', 'green', 'teal', 'purple', 'amber', 'rose', 'indigo', 'cyan', 'violet'][i % 9]}
                  />
                ))}
                {insights.top_moleculas_global.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">Dados insuficientes</p>
                )}
              </div>
            </div>

            {/* Classes terapêuticas */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">Classes terapêuticas</p>
              <div className="space-y-2.5">
                {insights.top_classes_terapeuticas.map(c => (
                  <div key={c.classe} className="flex items-center gap-2">
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                      CLASSE_COR[c.classe] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                    )}>
                      {c.classe}
                    </span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-700"
                        style={{ width: `${c.percentual}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 w-10 text-right flex-shrink-0">{c.percentual}%</span>
                  </div>
                ))}
                {insights.top_classes_terapeuticas.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">Dados insuficientes</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ ABA: Tendências ══ */}
        {activeTab === 'tendencias' && (
          <div className="space-y-5">
            {meses.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Dados insuficientes para análise de tendência</p>
              </div>
            ) : (
              <>
                {/* Cards de tendência por métrica */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {[
                    { key: 'n_eventos',           label: 'Eventos clínicos',     color: '#3b82f6', icon: Users        },
                    { key: 'n_prescricoes',        label: 'Prescrições emitidas', color: '#10b981', icon: Pill         },
                    { key: 'n_alertas_ignorados',  label: 'Alertas ignorados',    color: '#ef4444', icon: AlertTriangle },
                  ].map(({ key, label, color, icon: Icon }) => {
                    const vals = meses.map(m => m[key as keyof typeof m] as number);
                    const current = vals[vals.length - 1] ?? 0;
                    const prev    = vals[vals.length - 2] ?? 0;
                    return (
                      <div key={key} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-xs text-slate-500">{label}</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{current}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Icon className="w-5 h-5" style={{ color }} />
                            <TrendIndicator atual={current} anterior={prev} />
                          </div>
                        </div>
                        <Sparkline data={vals} color={color} />
                        <p className="text-[10px] text-slate-400 mt-1">Último mês: {ultMes?.label ?? '—'}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Tabela mensal */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Evolução mensal</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800">
                          <th className="text-left px-4 py-2.5 font-bold text-slate-500 uppercase text-[10px]">Mês</th>
                          <th className="text-right px-4 py-2.5 font-bold text-slate-500 uppercase text-[10px]">Eventos</th>
                          <th className="text-right px-4 py-2.5 font-bold text-slate-500 uppercase text-[10px]">Prescrições</th>
                          <th className="text-right px-4 py-2.5 font-bold text-slate-500 uppercase text-[10px]">Alertas ign.</th>
                          <th className="text-right px-4 py-2.5 font-bold text-slate-500 uppercase text-[10px]">Ajustes</th>
                          <th className="text-left px-4 py-2.5 font-bold text-slate-500 uppercase text-[10px]">Top molécula</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {[...meses].reverse().map((m, i) => {
                          const prev = [...meses].reverse()[i + 1];
                          return (
                            <tr key={m.mes} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">{m.label}</td>
                              <td className="px-4 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <span className="font-bold text-slate-700 dark:text-slate-300">{m.n_eventos}</span>
                                  {prev && <TrendIndicator atual={m.n_eventos} anterior={prev.n_eventos} />}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-green-600 dark:text-green-400">{m.n_prescricoes}</td>
                              <td className="px-4 py-2.5 text-right">
                                <span className={cn('font-semibold', m.n_alertas_ignorados > 0 ? 'text-red-500' : 'text-slate-400')}>
                                  {m.n_alertas_ignorados}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-amber-600 dark:text-amber-400">{m.n_ajustes}</td>
                              <td className="px-4 py-2.5">
                                {m.top_molecula && (
                                  <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                                    {m.top_molecula}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ ABA: Protocolos ══ */}
        {activeTab === 'protocolos' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Protocolos clínicos aplicados</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Frequência de uso por protocolo padronizado</p>
            </div>

            {insights.top_condutas.length === 0 && insights.top_protocolos.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Dados insuficientes para análise de protocolos</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Protocolos nomeados */}
                {insights.top_protocolos.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">Protocolos padronizados</p>
                    <div className="space-y-3">
                      {insights.top_protocolos.map((p, i) => (
                        <div key={p.nome} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                          <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-[10px] font-black flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{p.nome}</p>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {p.cids_associados.map(cid => (
                                <span key={cid} className="text-[9px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">{cid}</span>
                              ))}
                              {p.classe_terapeutica_predominante && (
                                <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded', CLASSE_COR[p.classe_terapeutica_predominante] ?? 'bg-slate-100 text-slate-600')}>
                                  {p.classe_terapeutica_predominante}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-black text-slate-800 dark:text-slate-200">{p.frequencia}×</p>
                            <p className="text-[10px] text-slate-400">{p.percentual}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Condutas mais frequentes */}
                {insights.top_condutas.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">Condutas mais frequentes</p>
                    <div className="space-y-2.5">
                      {insights.top_condutas.map(c => (
                        <div key={c.descricao_normalizada} className="flex items-start gap-2.5">
                          <CircleDot className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight">{c.descricao_normalizada}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-400 rounded-full" style={{ width: `${c.percentual}%` }} />
                              </div>
                              <span className="text-[10px] text-slate-400 flex-shrink-0">{c.frequencia}×</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ ABA: Segurança ══ */}
        {activeTab === 'seguranca' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Análise agregada de segurança</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Padrões de alertas ignorados e ajustes de dose — dados anonimizados</p>
            </div>

            {/* KPIs de segurança */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Alertas ignorados',   value: insights.total_alertas_ignorados, color: 'red'   },
                { label: 'Ajustes aplicados',   value: insights.total_ajustes,           color: 'amber' },
                {
                  label: 'Taxa ajuste renal',
                  value: insights.insights_por_condicao.length > 0
                    ? `${Math.round(insights.insights_por_condicao.reduce((s, c) => s + c.percentual_com_ajuste_renal, 0) / insights.insights_por_condicao.length)}%`
                    : '0%',
                  color: 'blue',
                },
                {
                  label: 'Alertas/evento',
                  value: insights.total_eventos_anonimizados > 0
                    ? (insights.total_alertas_ignorados / insights.total_eventos_anonimizados).toFixed(1)
                    : '0',
                  color: 'purple',
                },
              ].map(({ label, value, color }) => {
                const Icon = color === 'red' ? AlertTriangle : color === 'amber' ? Activity : color === 'blue' ? Zap : Sparkles;
                const cls: Record<string, string> = {
                  red:    'bg-red-50 dark:bg-red-900/20 text-red-500',
                  amber:  'bg-amber-50 dark:bg-amber-900/20 text-amber-500',
                  blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-500',
                  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-500',
                };
                return (
                  <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', cls[color])}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
                  </div>
                );
              })}
            </div>

            {/* Alertas mais ignorados */}
            {insights.alertas_mais_ignorados.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
                  Alertas mais frequentemente ignorados
                </p>
                <div className="space-y-2.5">
                  {insights.alertas_mais_ignorados.map((al, i) => {
                    const sevCls: Record<string, string> = {
                      critico: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                      grave:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                      aviso:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                      info:    'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
                    };
                    return (
                      <div key={i} className="flex items-start gap-3 p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                        <span className="text-sm font-black text-slate-300 dark:text-slate-600 w-5 flex-shrink-0 mt-0.5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded-full', sevCls[al.severidade] ?? sevCls.info)}>
                              {al.severidade.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{al.mensagem}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm font-black text-slate-800 dark:text-slate-200">{al.n}×</p>
                          <p className="text-[10px] text-slate-400">ignorado</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ajustes por condição */}
            {insights.insights_por_condicao.some(c => c.n_ajustes_total > 0) && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
                  Ajustes de dose por condição
                </p>
                <div className="space-y-2">
                  {insights.insights_por_condicao
                    .filter(c => c.n_ajustes_total > 0)
                    .sort((a, b) => b.percentual_com_ajuste_renal - a.percentual_com_ajuste_renal)
                    .map(c => (
                      <div key={c.cid} className="flex items-center gap-3">
                        <span className="font-mono text-[10px] font-bold text-slate-500 w-16 flex-shrink-0">{c.cid}</span>
                        <div className="flex-1">
                          <BarPct
                            label={`${c.descricao.slice(0, 30)}${c.descricao.length > 30 ? '…' : ''}`}
                            pct={c.percentual_com_ajuste_renal}
                            value={`${c.percentual_com_ajuste_renal}%`}
                            sub={`${c.n_ajustes_total} ajuste${c.n_ajustes_total !== 1 ? 's' : ''}`}
                            color="amber"
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {insights.alertas_mais_ignorados.length === 0 && insights.total_ajustes === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum dado de segurança disponível ainda.</p>
              </div>
            )}
          </div>
        )}

        {/* Rodapé de privacidade */}
        <div className="pt-4 pb-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-300 dark:text-slate-700">
              Insights gerados a partir de {insights.total_eventos_anonimizados} eventos com k-anonimidade ≥ 3.
              Nenhum dado individual ou identificável é processado ou exibido.
              Todos os cálculos são realizados localmente no dispositivo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
