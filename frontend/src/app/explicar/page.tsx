'use client';

import { useState, useMemo } from 'react';
import {
  buscarRacional,
  RACIONAIS_CLINICOS,
  type RacionalTerapeutico,
  type ClasseRecomendacao,
  type NivelEvidencia,
} from '@/lib/clinical-reasoning';
import {
  CheckCircle2, AlertTriangle, XCircle, BookOpen, FlaskConical,
  Stethoscope, Activity, Search, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Shield, Info, Award, BarChart3,
  Eye, Microscope, Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── helpers ─────────────────────────────────────────────────────────────────

const CLASSE_COR: Record<ClasseRecomendacao, string> = {
  I:   'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  IIa: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  IIb: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  III: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const NIVEL_COR: Record<NivelEvidencia, string> = {
  A: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  B: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  C: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const PESO_ICON: Record<string, string> = {
  alto:  '●●●',
  medio: '●●○',
  baixo: '●○○',
};

// ─── components ──────────────────────────────────────────────────────────────

function ClasseBadge({ classe, nivel }: { classe: ClasseRecomendacao; nivel: NivelEvidencia }) {
  return (
    <div className="flex items-center gap-1">
      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', CLASSE_COR[classe])}>
        Classe {classe}
      </span>
      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', NIVEL_COR[nivel])}>
        Nível {nivel}
      </span>
    </div>
  );
}

function SociedadeBadge({ sociedade }: { sociedade: string }) {
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
      {sociedade}
    </span>
  );
}

function CardHeader({ racional }: { racional: RacionalTerapeutico }) {
  return (
    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 dark:from-indigo-700 dark:to-violet-800 rounded-xl p-5 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {racional.cids.map(c => (
              <span key={c} className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/20 text-white">
                {c}
              </span>
            ))}
          </div>
          <h2 className="text-lg font-bold text-white leading-tight">{racional.condicao}</h2>
          <p className="text-indigo-200 text-sm mt-1 font-medium">{racional.conduta}</p>
        </div>
        <Stethoscope className="text-white/60 shrink-0 mt-1" size={28} />
      </div>

      {/* hipótese principal */}
      <div className="mt-3 bg-white/10 rounded-lg p-3">
        <p className="text-[11px] text-indigo-200 font-semibold uppercase tracking-wide mb-1">Por que esta recomendação?</p>
        <p className="text-white text-sm leading-snug">{racional.hipotese_principal}</p>
      </div>
    </div>
  );
}

function MecanismoBox({ texto }: { texto: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3 mb-4 flex gap-2">
      <Activity size={16} className="text-indigo-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Mecanismo de ação</p>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{texto}</p>
      </div>
    </div>
  );
}

function AchadosGrid({ racional }: { racional: RacionalTerapeutico }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
      {/* favoráveis */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
          <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Achados favoráveis</p>
        </div>
        <ul className="space-y-1.5">
          {racional.achados_favoraveis.map((a, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-500 mt-0.5 shrink-0 tracking-tighter">{PESO_ICON[a.peso]}</span>
              <span className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{a.texto}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* desfavoráveis */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <XCircle size={14} className="text-red-600 dark:text-red-400" />
          <p className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wide">Achados desfavoráveis</p>
        </div>
        <ul className="space-y-1.5">
          {racional.achados_desfavoraveis.map((a, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-[9px] font-mono text-red-600 dark:text-red-500 mt-0.5 shrink-0 tracking-tighter">{PESO_ICON[a.peso]}</span>
              <span className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{a.texto}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DiagDifSection({ racional }: { racional: RacionalTerapeutico }) {
  const [open, setOpen] = useState(false);
  const PROB_COR = { alta: 'text-red-600 dark:text-red-400', media: 'text-amber-600 dark:text-amber-400', baixa: 'text-slate-500 dark:text-slate-400' };
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-3 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-amber-500" />
          <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">Diagnósticos Diferenciais ({racional.diagnosticos_diferenciais.length})</span>
        </div>
        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>
      {open && (
        <div className="p-3 space-y-2">
          {racional.diagnosticos_diferenciais.map((d, i) => (
            <div key={i} className="flex gap-2">
              <div>
                <span className={cn('text-[11px] font-bold', PROB_COR[d.probabilidade])}>
                  {d.probabilidade.toUpperCase()} —{' '}
                </span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{d.condicao}</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{d.diferenciador}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExamesSection({ exames }: { exames: string[] }) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Microscope size={14} className="text-blue-600 dark:text-blue-400" />
        <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Exames recomendados</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {exames.map((e, i) => (
          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
            {e}
          </span>
        ))}
      </div>
    </div>
  );
}

function DiretrizesSection({ racional }: { racional: RacionalTerapeutico }) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 mb-3">
      <div className="flex items-center gap-1.5 mb-2">
        <BookOpen size={14} className="text-violet-600 dark:text-violet-400" />
        <p className="text-[11px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wide">Diretrizes</p>
      </div>
      <div className="space-y-2">
        {racional.diretrizes.map((d, i) => (
          <div key={i} className="flex items-start gap-2">
            <SociedadeBadge sociedade={d.sociedade} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug truncate">{d.titulo} ({d.ano})</p>
            </div>
            <ClasseBadge classe={d.classe} nivel={d.nivel} />
          </div>
        ))}
      </div>
    </div>
  );
}

function EstudosSection({ racional }: { racional: RacionalTerapeutico }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-3 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FlaskConical size={14} className="text-indigo-500" />
          <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">Estudos-chave ({racional.estudos_principais.length})</span>
        </div>
        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>
      {open && (
        <div className="p-3 space-y-2.5">
          {racional.estudos_principais.map((e, i) => (
            <div key={i} className="flex gap-3">
              <div className="shrink-0 text-center">
                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{e.nome}</p>
                <p className="text-[10px] text-slate-400">{e.revista} · {e.ano}</p>
                {e.nnt && (
                  <div className="mt-1 bg-indigo-100 dark:bg-indigo-900/40 rounded px-2 py-0.5">
                    <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">NNT {e.nnt}</p>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-snug">{e.descricao}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MonitoramentoSection({ racional }: { racional: RacionalTerapeutico }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-3 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-emerald-500" />
          <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">Monitoramento ({racional.monitoramento.length} parâmetros)</span>
        </div>
        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>
      {open && (
        <div className="p-3 space-y-2">
          {racional.monitoramento.map((m, i) => (
            <div key={i} className="border-l-2 border-emerald-400 pl-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{m.parametro}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{m.frequencia}</p>
              {m.alerta && (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                  <AlertTriangle size={10} /> {m.alerta}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PrognosticoSection({ racional }: { racional: RacionalTerapeutico }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-3 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-teal-500" />
          <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">Fatores Prognósticos ({racional.fatores_prognosticos.length})</span>
        </div>
        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>
      {open && (
        <div className="p-3 space-y-2">
          {racional.fatores_prognosticos.map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              {f.impacto === 'favoravel'
                ? <TrendingUp size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                : <TrendingDown size={14} className="text-red-500 shrink-0 mt-0.5" />}
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{f.fator}</p>
                <p className="text-[10px] text-slate-400 capitalize">{f.impacto} · {f.magnitude} impacto</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MarcasSection({ marcas }: { marcas?: string[] }) {
  if (!marcas || marcas.length === 0) return null;
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Award size={14} className="text-amber-600 dark:text-amber-400" />
        <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Marcas disponíveis (Eurofarma)</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {marcas.map((m, i) => (
          <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-medium border border-amber-300 dark:border-amber-700">
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

function DisclaimerBar() {
  return (
    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 mt-4">
      <Shield size={12} className="shrink-0 text-slate-400" />
      <span>
        <strong>Suporte à decisão clínica</strong> — Não realiza diagnóstico autônomo. O julgamento clínico e a individualização da conduta são de responsabilidade exclusiva do médico.
      </span>
    </div>
  );
}

function RacionalCard({ racional }: { racional: RacionalTerapeutico }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-5 mb-4">
      <CardHeader racional={racional} />
      <MecanismoBox texto={racional.mecanismo_acao} />
      <AchadosGrid racional={racional} />
      <DiagDifSection racional={racional} />
      <ExamesSection exames={racional.exames_recomendados} />
      <DiretrizesSection racional={racional} />
      <EstudosSection racional={racional} />
      <MonitoramentoSection racional={racional} />
      <PrognosticoSection racional={racional} />
      <MarcasSection marcas={racional.marcas_eurofarma} />
      <DisclaimerBar />
    </div>
  );
}

// ─── condition grid ───────────────────────────────────────────────────────────

const GRID_ITEMS = RACIONAIS_CLINICOS.map(r => ({
  id: r.id,
  label: r.condicao,
  sub: r.conduta.split('(')[0].trim(),
  cids: r.cids.slice(0, 2).join(' · '),
}));

// ─── main page ────────────────────────────────────────────────────────────────

export default function ExplicarPage() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<RacionalTerapeutico | null>(null);

  const resultados = useMemo(() => {
    if (!query.trim()) return [];
    return buscarRacional(query.trim());
  }, [query]);

  function handleSelect(id: string) {
    const r = RACIONAIS_CLINICOS.find(x => x.id === id) ?? null;
    setSelected(r);
    setQuery('');
  }

  function handleBack() {
    setSelected(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Heart size={20} className="text-indigo-500" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Por que esta recomendação?</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Racional clínico baseado em evidências para cada conduta</p>
        </div>

        {/* back button */}
        {selected && (
          <button
            onClick={handleBack}
            className="mb-4 flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            ← Voltar
          </button>
        )}

        {/* detail view */}
        {selected ? (
          <RacionalCard racional={selected} />
        ) : (
          <>
            {/* search */}
            <div className="relative mb-5">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por condição, molécula, CID ou tag... (ex: HAS, DM2, asma, SGLT2)"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* search results */}
            {query.trim() && (
              <div className="mb-5">
                {resultados.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">Nenhum resultado para &ldquo;{query}&rdquo;</div>
                ) : (
                  <div className="space-y-2">
                    {resultados.map(r => (
                      <button
                        key={r.id}
                        onClick={() => handleSelect(r.id)}
                        className="w-full text-left p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{r.condicao}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.conduta}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {r.cids.slice(0, 2).map(c => (
                              <span key={c} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{c}</span>
                            ))}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* grid browse */}
            {!query.trim() && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Info size={14} className="text-slate-400" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ou selecione uma condição clínica</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {GRID_ITEMS.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className="text-left p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all group"
                    >
                      <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.label}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{item.sub}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-1">{item.cids}</p>
                    </button>
                  ))}
                </div>

                <div className="mt-6 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl flex gap-2">
                  <Shield size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-700 dark:text-indigo-300">
                    <strong>Suporte à decisão clínica</strong> — Diretrizes e evidências apresentadas não substituem o julgamento clínico individualizado.
                    Toda conduta é de responsabilidade exclusiva do médico assistente.
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
