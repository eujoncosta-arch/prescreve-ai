'use client';

import { useState, useMemo } from 'react';
import {
  GUIDELINE_UPDATES,
  IMPACTO_META,
  AREA_META,
  NIVEL_COLOR,
  GRAU_COLOR,
  NIVEL_DESC,
  GRAU_DESC,
  totalMudancasByImpacto,
  type GuidelineUpdate,
  type MudancaRecomendacao,
  type AreaEspecialidade,
  type ImpactoClinico,
} from '@/lib/guideline-updates';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
  Zap,
  BookOpen,
  FlaskConical,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  Users,
  AlertTriangle,
  Shield,
  Star,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Helpers ─────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const TIPO_ESTUDO: Record<string, string> = {
  ecr: 'ECR',
  meta_analise: 'Meta-análise',
  revisao_sistematica: 'Revisão sistemática',
  observacional: 'Observacional',
  consenso: 'Consenso',
};

// ─── Page ────────────────────────────────────────────────────

const AREAS: AreaEspecialidade[] = ['cardiologia', 'endocrinologia', 'nefrologia', 'pneumologia'];
const IMPACTOS: ImpactoClinico[] = ['pratica_mudada', 'alto', 'moderado', 'baixo'];

export default function AtualizacoesPage() {
  const [search,      setSearch]      = useState('');
  const [areaFilter,  setAreaFilter]  = useState<AreaEspecialidade | 'todos'>('todos');
  const [impFilter,   setImpFilter]   = useState<ImpactoClinico | 'todos'>('todos');
  const [openCard,    setOpenCard]    = useState<string | null>(GUIDELINE_UPDATES[0].id);

  const filtered = useMemo(() => {
    let list = GUIDELINE_UPDATES;
    if (areaFilter !== 'todos') list = list.filter(g => g.area === areaFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(g =>
        g.sigla.toLowerCase().includes(q) ||
        g.titulo.toLowerCase().includes(q) ||
        g.tags.some(t => t.toLowerCase().includes(q)) ||
        g.mudancas.some(m => m.topico.toLowerCase().includes(q))
      );
    }
    if (impFilter !== 'todos') {
      list = list.map(g => ({ ...g, mudancas: g.mudancas.filter(m => m.impacto === impFilter) }))
                 .filter(g => g.mudancas.length > 0);
    }
    return list;
  }, [search, areaFilter, impFilter]);

  const totalMudancas = GUIDELINE_UPDATES.reduce((s, g) => s + g.mudancas.length, 0);
  const praticaMudada = totalMudancasByImpacto(GUIDELINE_UPDATES, 'pratica_mudada');
  const altoImpacto   = totalMudancasByImpacto(GUIDELINE_UPDATES, 'alto');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Guideline Update Center
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          O que mudou · Impacto clínico · Nova recomendação · Evidência
        </p>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Diretrizes atualizadas" value={GUIDELINE_UPDATES.length} color="blue" icon={BookOpen} />
        <StatCard label="Total de mudanças" value={totalMudancas} color="indigo" icon={Zap} />
        <StatCard label="Prática mudada" value={praticaMudada} color="red" icon={AlertTriangle} />
        <StatCard label="Alto impacto" value={altoImpacto} color="orange" icon={TrendingUp} />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar diretriz, tópico, molécula, tag…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['todos', ...AREAS] as const).map(a => (
            <button
              key={a}
              onClick={() => setAreaFilter(a)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition-all whitespace-nowrap',
                areaFilter === a
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              )}
            >
              {a === 'todos' ? 'Todas as áreas' : AREA_META[a].label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro impacto */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs text-slate-400 self-center">Impacto:</span>
        {(['todos', ...IMPACTOS] as const).map(imp => {
          const meta = imp === 'todos' ? null : IMPACTO_META[imp];
          return (
            <button
              key={imp}
              onClick={() => setImpFilter(imp)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition-all whitespace-nowrap flex items-center gap-1',
                impFilter === imp
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              )}
            >
              {imp !== 'todos' && meta && (
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', meta.dot)} />
              )}
              {imp === 'todos' ? 'Todos' : meta?.label}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">Nenhuma diretriz encontrada.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(g => (
            <GuidelineCard
              key={g.id}
              guideline={g}
              isOpen={openCard === g.id}
              onToggle={() => setOpenCard(prev => prev === g.id ? null : g.id)}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
        <Shield className="w-3.5 h-3.5 flex-shrink-0" />
        Conteúdo baseado em diretrizes públicas das respectivas sociedades científicas.
        Suporte à decisão clínica — não substitui o julgamento médico individualizado.
      </div>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────

function StatCard({ label, value, color, icon: Icon }: {
  label: string; value: number;
  color: 'blue' | 'indigo' | 'red' | 'orange';
  icon: React.ElementType;
}) {
  const cls = {
    blue:   'bg-blue-50   border-blue-200   text-blue-600',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-600',
    red:    'bg-red-50    border-red-200    text-red-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
  }[color];
  return (
    <div className={cn('rounded-xl border p-3 flex items-center gap-3', cls)}>
      <Icon className="w-6 h-6 flex-shrink-0" />
      <div>
        <p className="text-xl font-bold text-slate-900">{value}</p>
        <p className="text-[11px] text-slate-500 leading-tight">{label}</p>
      </div>
    </div>
  );
}

// ─── Guideline Card ───────────────────────────────────────────

function GuidelineCard({ guideline: g, isOpen, onToggle }: {
  guideline: GuidelineUpdate;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const areaMeta = AREA_META[g.area];
  const praticaMudada = g.mudancas.filter(m => m.impacto === 'pratica_mudada').length;
  const altoImpacto   = g.mudancas.filter(m => m.impacto === 'alto').length;

  return (
    <div className={cn(
      'bg-white border rounded-xl shadow-sm overflow-hidden transition-all',
      g.destaque ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200',
    )}>
      {/* Header */}
      <div
        className="flex items-start gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggle}
      >
        {/* Sigla */}
        <div className="flex-shrink-0 text-center">
          <div className={cn('px-3 py-1.5 rounded-lg font-black text-sm min-w-[80px] text-center', areaMeta.cls)}>
            {g.sigla}
          </div>
          {g.destaque && (
            <div className="flex items-center justify-center gap-0.5 text-[9px] text-amber-600 font-semibold mt-1">
              <Star className="w-2.5 h-2.5" fill="currentColor" /> Destaque
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 leading-snug">{g.titulo}</p>
          <p className="text-xs text-slate-500 mt-0.5">{g.sociedade}</p>
          <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-slate-400">
            {g.versao_anterior && (
              <span className="flex items-center gap-1">
                <span className="font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">v{g.versao_anterior}</span>
                <ArrowRight className="w-3 h-3" />
                <span className="font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">v{g.versao_nova}</span>
              </span>
            )}
            <span>Publicado: {fmtDate(g.data_publicacao)}</span>
            <span>{g.mudancas.length} mudança(s)</span>
          </div>
          {/* Impact chips */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {praticaMudada > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {praticaMudada}× Prática mudada
              </span>
            )}
            {altoImpacto > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                {altoImpacto}× Alto impacto
              </span>
            )}
            {g.tags.slice(0, 4).map(t => (
              <span key={t} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{t}</span>
            ))}
          </div>
        </div>

        {isOpen
          ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
          : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
        }
      </div>

      {/* Expanded */}
      {isOpen && (
        <div className="border-t border-slate-100">
          {/* Resumo executivo */}
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
            <p className="text-[10px] font-semibold text-blue-600 uppercase mb-1">Resumo executivo</p>
            <p className="text-xs text-blue-900 leading-relaxed">{g.resumo_executivo}</p>
          </div>

          {/* Mudanças */}
          <div className="divide-y divide-slate-100">
            {g.mudancas.map((m, idx) => (
              <MudancaCard key={m.id} mudanca={m} index={idx + 1} total={g.mudancas.length} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mudança Card ─────────────────────────────────────────────

function MudancaCard({ mudanca: m, index, total }: {
  mudanca: MudancaRecomendacao;
  index: number;
  total: number;
}) {
  const [open, setOpen] = useState(index === 1);
  const impMeta = IMPACTO_META[m.impacto];

  return (
    <div className={cn('transition-colors', open ? 'bg-white' : 'hover:bg-slate-50')}>
      {/* Mudança header */}
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        {/* Index */}
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 mt-0.5">
          {index}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1.5 mb-1">
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1', impMeta.cls)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', impMeta.dot)} />
              {impMeta.label}
            </span>
            {m.anterior === null && (
              <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full font-semibold">
                NOVO
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-slate-900 leading-snug">{m.topico}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{index}/{total} · {m.tags.slice(0, 3).join(' · ')}</p>
        </div>

        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-1" />}
      </div>

      {/* Mudança detalhe */}
      {open && (
        <div className="px-4 pb-4 space-y-3 ml-9">
          {/* O que mudou */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {m.anterior !== null && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-[10px] font-semibold text-red-600 mb-1 flex items-center gap-1">
                  <span className="line-through">Anterior</span>
                </p>
                <p className="text-xs text-red-800">{m.anterior}</p>
              </div>
            )}
            <div className={cn('p-3 rounded-lg border', m.anterior === null ? 'col-span-2' : '', 'bg-green-50 border-green-200')}>
              <p className="text-[10px] font-semibold text-green-600 mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {m.anterior === null ? 'Nova recomendação' : 'Nova recomendação'}
              </p>
              <p className="text-xs text-green-900 font-medium">{m.novo}</p>
            </div>
          </div>

          {/* Impacto clínico */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <p className="text-[10px] font-semibold text-slate-600 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-amber-500" /> Impacto clínico
            </p>
            <p className="text-xs text-slate-700">{m.justificativa}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              <div>
                <p className="text-[10px] font-semibold text-slate-500 mb-0.5 flex items-center gap-1">
                  <Users className="w-3 h-3" /> População alvo
                </p>
                <p className="text-xs text-slate-600">{m.populacao_alvo}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-500 mb-0.5 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-blue-500" /> Ação clínica
                </p>
                <p className="text-xs text-blue-700 font-medium">{m.acao_clinica}</p>
              </div>
            </div>
          </div>

          {/* Evidências */}
          {m.evidencias.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-slate-600 flex items-center gap-1">
                <FlaskConical className="w-3 h-3 text-indigo-500" /> Evidências que embasam
              </p>
              {m.evidencias.map((ev, i) => (
                <div key={i} className="p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-bold text-slate-900">{ev.estudo}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {TIPO_ESTUDO[ev.tipo]}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {ev.ano}{ev.revista ? ` · ${ev.revista}` : ''}
                          {ev.n_pacientes ? ` · n=${ev.n_pacientes.toLocaleString('pt-BR')}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border', NIVEL_COLOR[ev.nivel])}
                        title={NIVEL_DESC[ev.nivel]}>
                        Nível {ev.nivel}
                      </span>
                      <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border', GRAU_COLOR[ev.grau])}
                        title={GRAU_DESC[ev.grau]}>
                        Grau {ev.grau}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-0.5 mt-1">
                    <p className="text-[10px] text-slate-500">
                      <span className="font-semibold">Desfecho:</span> {ev.desfecho}
                    </p>
                    <p className="text-xs font-medium text-slate-800">{ev.resultado}</p>
                  </div>

                  {ev.doi && (
                    <a
                      href={`https://doi.org/${ev.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 flex items-center gap-1 text-[10px] text-blue-600 hover:underline w-fit"
                    >
                      <ExternalLink className="w-2.5 h-2.5" /> DOI: {ev.doi}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
