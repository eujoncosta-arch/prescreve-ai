'use client';

import { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  useGovernance,
  STATUS_GUIDELINE,
  STATUS_VALIDACAO_META,
  NIVEL_EVIDENCIA_LABEL,
  GRAU_RECOMENDACAO_LABEL,
  type EvidenciaVersao,
  type Guideline,
  type NivelEvidencia,
  type GrauRecomendacao,
} from '@/lib/governance';
import {
  BookOpen, Search, ExternalLink, Award, FlaskConical, ChevronDown, ChevronUp,
  Shield, Clock, GitBranch, AlertTriangle, CheckCircle2, Circle, FileSearch,
  Hash, Users, Calendar, Layers, TrendingUp, ArrowUpRight, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Tipos locais ─────────────────────────────────────────────

type AreaFilter = 'todas' | 'cardiologia' | 'endocrinologia' | 'pneumologia' | 'nefrologia';
type NivelFilter = 'todos' | 'A' | 'B' | 'C';

// ─── Helpers visuais ──────────────────────────────────────────

const NIVEL_COLOR: Record<NivelEvidencia, { bg: string; text: string; border: string }> = {
  A: { bg: 'bg-green-50  dark:bg-green-900/20',  text: 'text-green-700  dark:text-green-400', border: 'border-green-300 dark:border-green-700' },
  B: { bg: 'bg-blue-50   dark:bg-blue-900/20',   text: 'text-blue-700   dark:text-blue-400',  border: 'border-blue-300  dark:border-blue-700'  },
  C: { bg: 'bg-amber-50  dark:bg-amber-900/20',  text: 'text-amber-700  dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700' },
};

const GRAU_COLOR: Record<GrauRecomendacao, string> = {
  I:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  IIa: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
  IIb: 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  III: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
};

const AREA_COLOR: Record<string, string> = {
  cardiologia:    'bg-rose-100    text-rose-700    dark:bg-rose-900/30    dark:text-rose-400',
  endocrinologia: 'bg-purple-100  text-purple-700  dark:bg-purple-900/30  dark:text-purple-400',
  pneumologia:    'bg-sky-100     text-sky-700     dark:bg-sky-900/30     dark:text-sky-400',
  nefrologia:     'bg-teal-100    text-teal-700    dark:bg-teal-900/30    dark:text-teal-400',
};

// ─── Componentes ──────────────────────────────────────────────

function NivelBadge({ nivel }: { nivel: NivelEvidencia }) {
  const c = NIVEL_COLOR[nivel];
  return (
    <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border', c.bg, c.text, c.border)}>
      Nível {nivel}
    </span>
  );
}

function GrauBadge({ grau }: { grau: GrauRecomendacao }) {
  return (
    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', GRAU_COLOR[grau])}>
      Grau {grau}
    </span>
  );
}

function EvidenceCard({ ev, guidelineSigla }: { ev: EvidenciaVersao; guidelineSigla?: string }) {
  const [expanded, setExpanded] = useState(false);
  const sv = STATUS_VALIDACAO_META[ev.status_validacao];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
      {/* Header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(p => !p)}
      >
        {/* Tipo icon */}
        <div className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
          ev.is_meta_analise ? 'bg-purple-100 dark:bg-purple-900/30' : ev.is_rct ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-800'
        )}>
          {ev.is_meta_analise
            ? <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            : ev.is_rct
              ? <FlaskConical className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              : <BookOpen className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {guidelineSigla && (
              <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                {guidelineSigla}
              </span>
            )}
            {ev.is_rct && (
              <span className="text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">ECR</span>
            )}
            {ev.is_meta_analise && (
              <span className="text-[9px] font-bold bg-purple-600 text-white px-1.5 py-0.5 rounded">META-ANÁLISE</span>
            )}
            <NivelBadge nivel={ev.nivel} />
            <GrauBadge grau={ev.grau} />
            <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1', sv.cls)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', sv.dot)} />
              {sv.label}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">{ev.titulo}</p>
          {ev.autores && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ev.autores} · {ev.ano} · {ev.revista}</p>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">{ev.resumo}</p>
        </div>

        <button className="text-slate-400 flex-shrink-0 mt-0.5">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded: rastreabilidade completa */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-4">

          {/* Rastreabilidade clínica */}
          {(ev.diagnostico || ev.conduta) && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 space-y-2">
              <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">Rastreabilidade Clínica</p>
              {ev.diagnostico && (
                <div className="flex items-start gap-2">
                  <FileSearch className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-blue-500 font-semibold">Diagnóstico</p>
                    <p className="text-xs text-blue-800 dark:text-blue-200">{ev.diagnostico}</p>
                  </div>
                </div>
              )}
              {ev.conduta && (
                <div className="flex items-start gap-2">
                  <Shield className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-blue-500 font-semibold">Conduta recomendada</p>
                    <p className="text-xs text-blue-800 dark:text-blue-200">{ev.conduta}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dados do estudo */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ev.n_pacientes && (
              <DataChip icon={Users} label="Pacientes" value={ev.n_pacientes.toLocaleString('pt-BR')} />
            )}
            {ev.duracao_seguimento && (
              <DataChip icon={Clock} label="Seguimento" value={ev.duracao_seguimento} />
            )}
            {ev.reducao_risco_relativo && (
              <DataChip icon={TrendingUp} label="RRR" value={ev.reducao_risco_relativo} color="green" />
            )}
            {ev.nnt && (
              <DataChip icon={Award} label="NNT" value={String(ev.nnt)} color="blue" />
            )}
            {ev.versao_recomendacao && (
              <DataChip icon={GitBranch} label="Versão rec." value={ev.versao_recomendacao} />
            )}
            {ev.data_revisao && (
              <DataChip icon={Calendar} label="Última revisão" value={new Date(ev.data_revisao).toLocaleDateString('pt-BR')} />
            )}
          </div>

          {/* Desfecho primário */}
          {ev.desfecho_primario && (
            <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Desfecho Primário</p>
              <p className="text-xs text-slate-700 dark:text-slate-300">{ev.desfecho_primario}</p>
            </div>
          )}

          {/* Nível / Grau explicados */}
          <div className="grid grid-cols-2 gap-2">
            <div className={cn('rounded-lg border p-2.5', NIVEL_COLOR[ev.nivel].bg, NIVEL_COLOR[ev.nivel].border)}>
              <p className={cn('text-[10px] font-black uppercase tracking-wider', NIVEL_COLOR[ev.nivel].text)}>Nível {ev.nivel}</p>
              <p className={cn('text-[10px] mt-0.5', NIVEL_COLOR[ev.nivel].text)}>{NIVEL_EVIDENCIA_LABEL[ev.nivel]}</p>
            </div>
            <div className={cn('rounded-lg p-2.5', GRAU_COLOR[ev.grau])}>
              <p className="text-[10px] font-black uppercase tracking-wider">Grau {ev.grau}</p>
              <p className="text-[10px] mt-0.5">{GRAU_RECOMENDACAO_LABEL[ev.grau]}</p>
            </div>
          </div>

          {/* Identificadores */}
          <div className="flex flex-wrap gap-2">
            {ev.doi && (
              <a
                href={`https://doi.org/${ev.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <Hash className="w-3 h-3" />
                DOI: {ev.doi}
                <ArrowUpRight className="w-3 h-3" />
              </a>
            )}
            {ev.pmid && (
              <a
                href={`https://pubmed.ncbi.nlm.nih.gov/${ev.pmid}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] text-green-700 dark:text-green-400 hover:underline bg-green-50 dark:bg-green-900/20 px-2.5 py-1.5 rounded-lg border border-green-200 dark:border-green-800"
              >
                <BookOpen className="w-3 h-3" />
                PMID: {ev.pmid}
                <ArrowUpRight className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DataChip({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color?: 'green' | 'blue';
}) {
  const cls = color === 'green'
    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
    : color === 'blue'
      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
  return (
    <div className={cn('rounded-lg border p-2.5', cls)}>
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className="w-3 h-3 opacity-70" />
        <p className="text-[9px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
      </div>
      <p className="text-xs font-bold">{value}</p>
    </div>
  );
}

function GuidelineSection({ g, nivelFilter }: { g: Guideline; nivelFilter: NivelFilter }) {
  const [open, setOpen] = useState(false);
  const sg = STATUS_GUIDELINE[g.status];

  const todasEvidencias = useMemo(() =>
    g.versoes.flatMap(v => v.evidencias.map(e => ({ ...e, versaoNum: v.numero }))),
    [g]
  );

  const filtered = nivelFilter === 'todos'
    ? todasEvidencias
    : todasEvidencias.filter(e => e.nivel === nivelFilter);

  const totalRCT  = todasEvidencias.filter(e => e.is_rct).length;
  const totalMeta = todasEvidencias.filter(e => e.is_meta_analise).length;
  const totalA    = todasEvidencias.filter(e => e.nivel === 'A').length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Header diretriz */}
      <div
        className="flex items-start gap-4 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setOpen(p => !p)}
      >
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {g.sigla && (
              <span className="text-xs font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                {g.sigla}
              </span>
            )}
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1', sg.cls)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', sg.dot)} />
              {sg.label}
            </span>
            {g.area && (
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', AREA_COLOR[g.area] ?? 'bg-slate-100 text-slate-600')}>
                {g.area.charAt(0).toUpperCase() + g.area.slice(1)}
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{g.titulo}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{g.sociedade} · v{g.versao_atual}</p>

          {/* Mini-stats */}
          <div className="flex flex-wrap gap-3 mt-2">
            <Stat label="Evidências" value={todasEvidencias.length} />
            <Stat label="ECR"         value={totalRCT}            color="blue"   />
            <Stat label="Meta-análise" value={totalMeta}          color="purple" />
            <Stat label="Nível A"      value={totalA}             color="green"  />
            <Stat label="Versões"      value={g.versoes.length}                  />
          </div>
        </div>
        <div className="flex-shrink-0 text-slate-400">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded: histórico de versões + evidências */}
      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800">

          {/* Histórico de alterações */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <div className="flex items-center gap-2 mb-3">
              <GitBranch className="w-3.5 h-3.5 text-slate-500" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Histórico de Alterações</p>
            </div>
            <div className="space-y-3">
              {g.versoes.map((v, vi) => (
                <div key={v.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1', vi === 0 ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700')} />
                    {vi < g.versoes.length - 1 && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />}
                  </div>
                  <div className="pb-3 min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-black text-slate-600 dark:text-slate-400">v{v.numero}</span>
                      <span className="text-[10px] text-slate-400">{new Date(v.data_publicacao).toLocaleDateString('pt-BR')}</span>
                      {vi === 0 && <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">ATUAL</span>}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{v.resumo}</p>
                    {v.alteracoes.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {v.alteracoes.map((alt, ai) => (
                          <div key={ai} className="flex gap-2 text-[10px]">
                            <span className="font-semibold text-slate-500 flex-shrink-0 min-w-[80px]">{alt.campo}</span>
                            <span className="text-red-600 dark:text-red-400 line-through opacity-70">{alt.anterior}</span>
                            <span className="text-slate-400">→</span>
                            <span className="text-green-700 dark:text-green-400 font-semibold">{alt.novo}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Evidências filtradas */}
          <div className="p-4">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FlaskConical className="w-3.5 h-3.5" />
              Estudos Principais ({filtered.length})
            </p>
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Nenhuma evidência neste nível</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((e, i) => (
                  <EvidenceCard key={i} ev={e} guidelineSigla={g.sigla} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: 'blue' | 'purple' | 'green' }) {
  const cls = color === 'blue' ? 'text-blue-600 dark:text-blue-400'
    : color === 'purple' ? 'text-purple-600 dark:text-purple-400'
    : color === 'green'  ? 'text-green-600 dark:text-green-400'
    : 'text-slate-600 dark:text-slate-400';
  return (
    <div className="flex items-center gap-1">
      <span className={cn('text-xs font-black', cls)}>{value}</span>
      <span className="text-[10px] text-slate-400">{label}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function Evidencias() {
  const { guidelines, loaded } = useGovernance();
  const [search,     setSearch]      = useState('');
  const [area,       setArea]        = useState<AreaFilter>('todas');
  const [nivelFil,   setNivelFil]    = useState<NivelFilter>('todos');

  const totalEvidencias = guidelines.flatMap(g => g.versoes.flatMap(v => v.evidencias)).length;
  const totalRCT        = guidelines.flatMap(g => g.versoes.flatMap(v => v.evidencias)).filter(e => e.is_rct).length;
  const totalMeta       = guidelines.flatMap(g => g.versoes.flatMap(v => v.evidencias)).filter(e => e.is_meta_analise).length;
  const totalNivelA     = guidelines.flatMap(g => g.versoes.flatMap(v => v.evidencias)).filter(e => e.nivel === 'A').length;

  const filtered = guidelines.filter(g => {
    const q = search.toLowerCase();
    const matchSearch = !q || g.titulo.toLowerCase().includes(q) || g.sigla?.toLowerCase().includes(q) || g.condicao.toLowerCase().includes(q) || g.tags.some(t => t.toLowerCase().includes(q));
    const matchArea   = area === 'todas' || g.area === area;
    return matchSearch && matchArea;
  });

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Evidências Científicas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Rastreabilidade integral · Diagnóstico → Conduta → Diretriz → Evidência → Estudo
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Evidências',    value: totalEvidencias, icon: BookOpen,     color: 'blue'   },
            { label: 'ECR',          value: totalRCT,         icon: FlaskConical, color: 'indigo' },
            { label: 'Meta-análises', value: totalMeta,       icon: Layers,       color: 'purple' },
            { label: 'Nível A',       value: totalNivelA,     icon: Award,        color: 'green'  },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4.5 h-4.5 text-${color}-600 dark:text-${color}-400`} />
              </div>
              <div>
                <p className="text-xl font-black text-slate-900 dark:text-white">{value}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Legenda Nível/Grau */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Escala de Evidência e Recomendação</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 mb-2">NÍVEL DE EVIDÊNCIA</p>
              <div className="space-y-1">
                {(['A','B','C'] as NivelEvidencia[]).map(n => {
                  const c = NIVEL_COLOR[n];
                  return (
                    <div key={n} className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs', c.bg, c.border)}>
                      <span className={cn('font-black w-4', c.text)}>{ n}</span>
                      <span className={cn('text-[10px]', c.text)}>{NIVEL_EVIDENCIA_LABEL[n]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 mb-2">GRAU DE RECOMENDAÇÃO</p>
              <div className="space-y-1">
                {(['I','IIa','IIb','III'] as GrauRecomendacao[]).map(g => (
                  <div key={g} className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs', GRAU_COLOR[g])}>
                    <span className="font-black w-6">{g}</span>
                    <span className="text-[10px]">{GRAU_RECOMENDACAO_LABEL[g]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar diretriz, condição, tag…"
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          {/* Área */}
          <div className="flex items-center gap-1 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            {(['todas','cardiologia','endocrinologia','pneumologia','nefrologia'] as AreaFilter[]).map(a => (
              <button
                key={a}
                onClick={() => setArea(a)}
                className={cn(
                  'text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all capitalize',
                  area === a
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'
                )}
              >
                {a === 'todas' ? 'Todas' : a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>

          {/* Nível */}
          <div className="flex items-center gap-1">
            {(['todos','A','B','C'] as NivelFilter[]).map(n => {
              const active = nivelFil === n;
              const cl = n !== 'todos' ? NIVEL_COLOR[n as NivelEvidencia] : null;
              return (
                <button
                  key={n}
                  onClick={() => setNivelFil(n)}
                  className={cn(
                    'text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all',
                    active && n !== 'todos' && cl
                      ? cn(cl.bg, cl.text, cl.border)
                      : active
                        ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'
                  )}
                >
                  {n === 'todos' ? 'Todos' : `Nível ${n}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
            <span className="font-bold">Apoio à decisão clínica.</span> Toda recomendação é baseada em evidências publicadas. Diagnóstico, conduta e prescrição são responsabilidade exclusiva do médico assistente.
          </p>
        </div>

        {/* Lista de diretrizes */}
        {!loaded ? (
          <div className="text-center py-12 text-slate-400 text-sm">Carregando evidências…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
            <p className="text-sm text-slate-400">Nenhuma diretriz encontrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(g => (
              <GuidelineSection key={g.id} g={g} nivelFilter={nivelFil} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
