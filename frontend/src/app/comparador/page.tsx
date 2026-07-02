'use client';

import { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Scale, Search, X, ChevronDown, ChevronUp, AlertTriangle,
  CheckCircle2, TrendingUp, DollarSign, Heart, Activity,
  FlaskConical, Shield, Zap, BookOpen, Info, ArrowRight,
  RotateCcw, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MOLECULES_DB,
  MoleculaComparavel,
  ComparativoScore,
  searchMoleculas,
  gerarComparativo,
  CATEGORIA_LABEL,
  CATEGORIA_COR,
  CUSTO_LABEL,
  ADESAO_LABEL,
  INTERACAO_SEV_COR,
  CategoriaComparacao,
} from '@/lib/drug-comparator';

// ─── Tipos auxiliares ────────────────────────────────────────

const DIMENSAO_ICON: Record<string, React.ElementType> = {
  evidencia:    BookOpen,
  eficacia:     TrendingUp,
  seguranca:    Shield,
  custo:        DollarSign,
  adesao:       Heart,
  ajuste_renal: Activity,
  interacoes:   Zap,
};

// ─── Barra de score ──────────────────────────────────────────

function ScoreBar({ value, max = 5, color }: { value: number; max?: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Seletor de molécula ─────────────────────────────────────

function MoleculeSelector({
  label,
  side,
  selected,
  onSelect,
  onClear,
  otherSelected,
}: {
  label: string;
  side: 'A' | 'B';
  selected: MoleculaComparavel | null;
  onSelect: (m: MoleculaComparavel) => void;
  onClear: () => void;
  otherSelected: MoleculaComparavel | null;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const found = searchMoleculas(query);
    return found.filter(m => m.id !== otherSelected?.id);
  }, [query, otherSelected]);

  const sideColor = side === 'A'
    ? 'from-blue-600 to-blue-700 ring-blue-500'
    : 'from-purple-600 to-purple-700 ring-purple-500';
  const badgeBg = side === 'A' ? 'bg-blue-600' : 'bg-purple-600';

  if (selected) {
    return (
      <div className={cn('rounded-xl border-2 overflow-hidden', side === 'A' ? 'border-blue-500' : 'border-purple-500')}>
        <div className={cn('bg-gradient-to-br text-white p-4', sideColor.split(' ring')[0])}>
          <div className="flex items-start gap-3">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 bg-white/20')}>
              {side}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm">{selected.molecula}</p>
              <p className="text-xs text-white/80">{selected.classe}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20')}>{CATEGORIA_LABEL[selected.categoria]}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20">Nível {selected.nivel_evidencia} / Grau {selected.grau_recomendacao}</span>
              </div>
            </div>
            <button onClick={onClear} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          {/* Marcas destaque */}
          <div className="flex flex-wrap gap-1 mt-2">
            {selected.marcas.slice(0, 3).map(m => (
              <span key={m.nome} className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium', m.destaque ? 'bg-white text-blue-700' : 'bg-white/20 text-white')}>
                {m.nome}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className={cn('rounded-xl border-2 border-dashed p-3', side === 'A' ? 'border-blue-300 dark:border-blue-700' : 'border-purple-300 dark:border-purple-700')}>
        <div className="flex items-center gap-2 mb-2">
          <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white', badgeBg)}>{side}</span>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{label}</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Buscar molécula, marca ou classe…"
            className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
          />
        </div>
        {open && results.length > 0 && (
          <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
            {results.map(m => (
              <button
                key={m.id}
                onClick={() => { onSelect(m); setQuery(''); setOpen(false); }}
                className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{m.molecula}</p>
                    <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', CATEGORIA_COR[m.categoria])}>{m.classe}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {m.marcas.slice(0, 2).map(mk => mk.nome).join(' · ')}
                  </p>
                </div>
                <span className="text-[9px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded flex-shrink-0">Nível {m.nivel_evidencia}</span>
              </button>
            ))}
          </div>
        )}
        {open && (
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
        )}
      </div>
    </div>
  );
}

// ─── Radar visual (scores em lista) ──────────────────────────

function ComparativoRadar({ scores, nomeA, nomeB }: { scores: ComparativoScore[]; nomeA: string; nomeB: string }) {
  const pontos_a = scores.filter(s => s.vantagem === 'A').length;
  const pontos_b = scores.filter(s => s.vantagem === 'B').length;
  const iguais   = scores.filter(s => s.vantagem === 'igual').length;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
      <div className="flex items-center gap-2 mb-4">
        <Scale className="w-4 h-4 text-blue-400" />
        <h3 className="font-black text-sm">Placar comparativo</h3>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="text-center bg-blue-600/30 rounded-xl p-3">
          <p className="text-3xl font-black text-blue-300">{pontos_a}</p>
          <p className="text-[10px] text-blue-200 mt-1 truncate">{nomeA}</p>
          <p className="text-[9px] text-slate-400">vantagens</p>
        </div>
        <div className="text-center bg-slate-700/50 rounded-xl p-3">
          <p className="text-3xl font-black text-slate-300">{iguais}</p>
          <p className="text-[10px] text-slate-400 mt-1">Empate</p>
        </div>
        <div className="text-center bg-purple-600/30 rounded-xl p-3">
          <p className="text-3xl font-black text-purple-300">{pontos_b}</p>
          <p className="text-[10px] text-purple-200 mt-1 truncate">{nomeB}</p>
          <p className="text-[9px] text-slate-400">vantagens</p>
        </div>
      </div>
      {scores.map(s => {
        const Icon = DIMENSAO_ICON[s.dimensao] ?? BookOpen;
        const barA = Math.round((s.score_a / 5) * 100);
        const barB = Math.round((s.score_b / 5) * 100);
        return (
          <div key={s.dimensao} className="mb-3 last:mb-0">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <p className="text-[10px] font-semibold text-slate-300 flex-1">{s.label}</p>
              {s.vantagem !== 'igual' && (
                <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', s.vantagem === 'A' ? 'bg-blue-600/40 text-blue-300' : 'bg-purple-600/40 text-purple-300')}>
                  {s.vantagem === 'A' ? nomeA : nomeB}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
                  <span>{s.nota_a}</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${barA}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
                  <span>{s.nota_b}</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${barB}%` }} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tabela comparativa detalhada ────────────────────────────

type CompTab = 'visao_geral' | 'eficacia' | 'seguranca' | 'doses' | 'interacoes' | 'marcas';

function TabelaComparativa({ a, b, scores }: { a: MoleculaComparavel; b: MoleculaComparavel; scores: ComparativoScore[] }) {
  const [tab, setTab] = useState<CompTab>('visao_geral');

  const tabs: { id: CompTab; label: string; icon: React.ElementType }[] = [
    { id: 'visao_geral', label: 'Visão geral',  icon: Scale       },
    { id: 'eficacia',    label: 'Eficácia',     icon: TrendingUp  },
    { id: 'seguranca',   label: 'Segurança',    icon: Shield      },
    { id: 'doses',       label: 'Doses',        icon: Activity    },
    { id: 'interacoes',  label: 'Interações',   icon: Zap         },
    { id: 'marcas',      label: 'Marcas',       icon: Star        },
  ];

  const Row = ({ label, valA, valB, highlight }: { label: string; valA: React.ReactNode; valB: React.ReactNode; highlight?: 'A' | 'B' | 'igual' }) => (
    <div className="grid grid-cols-[160px_1fr_1fr] gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0 items-start">
      <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
      <div className={cn('text-xs text-slate-700 dark:text-slate-300', highlight === 'A' && 'font-semibold text-blue-700 dark:text-blue-400')}>{valA}</div>
      <div className={cn('text-xs text-slate-700 dark:text-slate-300', highlight === 'B' && 'font-semibold text-purple-700 dark:text-purple-400')}>{valB}</div>
    </div>
  );

  const sev = (score: ComparativoScore) => score.vantagem;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
      {/* Header das colunas */}
      <div className="grid grid-cols-[160px_1fr_1fr] gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
        <div />
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-xs font-black text-white">A</span>
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">{a.molecula}</p>
            <p className="text-[10px] text-slate-500">{a.classe}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-purple-600 flex items-center justify-center text-xs font-black text-white">B</span>
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">{b.molecula}</p>
            <p className="text-[10px] text-slate-500">{b.classe}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto scrollbar-none border-b border-slate-100 dark:border-slate-800">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap -mb-px transition-colors',
                tab === t.id ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon className="w-3.5 h-3.5" />{t.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 space-y-0">
        {/* ── ABA: Visão geral ── */}
        {tab === 'visao_geral' && (
          <>
            <Row label="Classe" valA={a.classe} valB={b.classe} />
            <Row label="Subclasse" valA={a.subclasse ?? '—'} valB={b.subclasse ?? '—'} />
            <Row label="Nível evidência"
              highlight={sev(scores.find(s => s.dimensao === 'evidencia')!)}
              valA={<span className="font-bold text-blue-700 dark:text-blue-400">Nível {a.nivel_evidencia} / Grau {a.grau_recomendacao}</span>}
              valB={<span className="font-bold text-purple-700 dark:text-purple-400">Nível {b.nivel_evidencia} / Grau {b.grau_recomendacao}</span>}
            />
            <Row label="Diretriz principal" valA={a.diretriz_principal} valB={b.diretriz_principal} />
            <Row label="Indicações principais"
              valA={<ul className="space-y-0.5">{a.indicacoes.map(i => <li key={i}>• {i}</li>)}</ul>}
              valB={<ul className="space-y-0.5">{b.indicacoes.map(i => <li key={i}>• {i}</li>)}</ul>}
            />
            <Row label="Custo relativo"
              highlight={sev(scores.find(s => s.dimensao === 'custo')!)}
              valA={<span className={CUSTO_LABEL[a.custo_relativo].cls}>{CUSTO_LABEL[a.custo_relativo].label} · {a.custo_descricao}</span>}
              valB={<span className={CUSTO_LABEL[b.custo_relativo].cls}>{CUSTO_LABEL[b.custo_relativo].label} · {b.custo_descricao}</span>}
            />
            <Row label="Adesão estimada"
              highlight={sev(scores.find(s => s.dimensao === 'adesao')!)}
              valA={<><span className={ADESAO_LABEL[a.adesao_score].cls}>{ADESAO_LABEL[a.adesao_score].label}</span><p className="text-[10px] text-slate-400 mt-0.5">{a.adesao_descricao}</p></>}
              valB={<><span className={ADESAO_LABEL[b.adesao_score].cls}>{ADESAO_LABEL[b.adesao_score].label}</span><p className="text-[10px] text-slate-400 mt-0.5">{b.adesao_descricao}</p></>}
            />
          </>
        )}

        {/* ── ABA: Eficácia ── */}
        {tab === 'eficacia' && (
          <>
            {[a, b].map((mol, idx) => (
              <div key={mol.id} className={cn('mb-4 last:mb-0 rounded-xl p-3', idx === 0 ? 'bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800' : 'bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800')}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('w-5 h-5 rounded text-[10px] font-black text-white flex items-center justify-center', idx === 0 ? 'bg-blue-600' : 'bg-purple-600')}>{idx === 0 ? 'A' : 'B'}</span>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{mol.molecula}</p>
                </div>
                {mol.eficacia.map((ef, i) => (
                  <div key={i} className="mb-2 last:mb-0 p-2.5 bg-white dark:bg-slate-900/50 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{ef.desfecho}</p>
                        <p className={cn('text-sm font-black mt-0.5', idx === 0 ? 'text-blue-700 dark:text-blue-400' : 'text-purple-700 dark:text-purple-400')}>{ef.reducao}</p>
                      </div>
                      {ef.nnt && (
                        <div className={cn('text-center px-2 py-1 rounded-lg flex-shrink-0', idx === 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30')}>
                          <p className={cn('text-lg font-black', idx === 0 ? 'text-blue-700' : 'text-purple-700')}>{ef.nnt}</p>
                          <p className="text-[8px] text-slate-500">NNT</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <FlaskConical className="w-3 h-3 text-slate-400" />
                      <p className="text-[10px] text-slate-500">{ef.estudo}{ef.n_pacientes ? ` · n=${ef.n_pacientes.toLocaleString('pt-BR')}` : ''}{ef.rrr ? ` · RRR ${ef.rrr}` : ''}</p>
                    </div>
                  </div>
                ))}
                {mol.eficacia.length === 0 && <p className="text-xs text-slate-400">Dados de eficácia não disponíveis</p>}
              </div>
            ))}
          </>
        )}

        {/* ── ABA: Segurança ── */}
        {tab === 'seguranca' && (
          <>
            <Row label="Contraindicações"
              valA={<ul className="space-y-0.5">{a.contraindicacoes.map(c => <li key={c} className="flex gap-1"><X className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />{c}</li>)}</ul>}
              valB={<ul className="space-y-0.5">{b.contraindicacoes.map(c => <li key={c} className="flex gap-1"><X className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />{c}</li>)}</ul>}
            />
            <Row label="Efeitos adversos"
              valA={<ul className="space-y-0.5">{a.efeitos_adversos_principais.map(e => <li key={e} className="flex gap-1"><AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />{e}</li>)}</ul>}
              valB={<ul className="space-y-0.5">{b.efeitos_adversos_principais.map(e => <li key={e} className="flex gap-1"><AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />{e}</li>)}</ul>}
            />
            <Row label="Gestante" valA={String(a.seguro_gestante)} valB={String(b.seguro_gestante)} />
            <Row label="Lactante"  valA={String(a.seguro_lactante)} valB={String(b.seguro_lactante)} />
            <Row label="Uso em idosos" valA={a.uso_idoso ?? '—'} valB={b.uso_idoso ?? '—'} />
          </>
        )}

        {/* ── ABA: Doses ── */}
        {tab === 'doses' && (
          <>
            <Row label="Via" valA={a.via} valB={b.via} />
            <Row label="Formas" valA={a.formas.join(' · ')} valB={b.formas.join(' · ')} />
            <Row label="Dose inicial" valA={a.dose_inicial} valB={b.dose_inicial} />
            <Row label="Dose alvo" valA={a.dose_alvo} valB={b.dose_alvo} />
            <Row label="Frequência/dia"
              highlight={a.frequencia_doses_dia < b.frequencia_doses_dia ? 'A' : a.frequencia_doses_dia > b.frequencia_doses_dia ? 'B' : 'igual'}
              valA={`${a.frequencia_doses_dia}× ao dia`}
              valB={`${b.frequencia_doses_dia}× ao dia`}
            />
            <Row label="Ajuste renal"
              highlight={sev(scores.find(s => s.dimensao === 'ajuste_renal')!)}
              valA={<><p>{a.ajuste_renal.tfg_reducao}</p>{a.ajuste_renal.tfg_contraindicado && <p className="text-red-600 dark:text-red-400 font-medium">CI se TFG &lt; {a.ajuste_renal.tfg_contraindicado} mL/min</p>}{a.ajuste_renal.dialise && <p className="text-slate-400">{a.ajuste_renal.dialise}</p>}</>}
              valB={<><p>{b.ajuste_renal.tfg_reducao}</p>{b.ajuste_renal.tfg_contraindicado && <p className="text-red-600 dark:text-red-400 font-medium">CI se TFG &lt; {b.ajuste_renal.tfg_contraindicado} mL/min</p>}{b.ajuste_renal.dialise && <p className="text-slate-400">{b.ajuste_renal.dialise}</p>}</>}
            />
            <Row label="Child-Pugh A" valA={a.ajuste_hepatico.child_a ?? '—'} valB={b.ajuste_hepatico.child_a ?? '—'} />
            <Row label="Child-Pugh B" valA={a.ajuste_hepatico.child_b ?? '—'} valB={b.ajuste_hepatico.child_b ?? '—'} />
            <Row label="Child-Pugh C" valA={a.ajuste_hepatico.child_c ?? '—'} valB={b.ajuste_hepatico.child_c ?? '—'} />
          </>
        )}

        {/* ── ABA: Interações ── */}
        {tab === 'interacoes' && (
          <div className="grid grid-cols-2 gap-4 pt-1">
            {[a, b].map((mol, idx) => (
              <div key={mol.id}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={cn('w-5 h-5 rounded text-[10px] font-black text-white flex items-center justify-center', idx === 0 ? 'bg-blue-600' : 'bg-purple-600')}>{idx === 0 ? 'A' : 'B'}</span>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{mol.molecula}</p>
                </div>
                <div className="space-y-1.5">
                  {mol.interacoes.map(inter => (
                    <div key={inter.farmaco} className={cn('rounded-lg p-2.5 text-xs', INTERACAO_SEV_COR[inter.severidade])}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold">{inter.farmaco}</p>
                        <span className="text-[9px] font-bold uppercase flex-shrink-0">{inter.severidade}</span>
                      </div>
                      <p className="mt-0.5 opacity-80">{inter.mecanismo}</p>
                    </div>
                  ))}
                  {mol.interacoes.length === 0 && <p className="text-xs text-slate-400">Sem interações relevantes mapeadas</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ABA: Marcas ── */}
        {tab === 'marcas' && (
          <div className="grid grid-cols-2 gap-4 pt-1">
            {[a, b].map((mol, idx) => (
              <div key={mol.id}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={cn('w-5 h-5 rounded text-[10px] font-black text-white flex items-center justify-center', idx === 0 ? 'bg-blue-600' : 'bg-purple-600')}>{idx === 0 ? 'A' : 'B'}</span>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{mol.molecula}</p>
                </div>
                <div className="space-y-1.5">
                  {mol.marcas.map(mk => (
                    <div key={mk.nome} className={cn('rounded-lg p-2.5 border text-xs', mk.destaque ? (idx === 0 ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20' : 'border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20') : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50')}>
                      <div className="flex items-start gap-1.5">
                        {mk.destaque && <Star className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />}
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{mk.nome}</p>
                          <p className="text-[10px] text-slate-500">{mk.laboratorio}</p>
                          <p className="text-[10px] text-slate-400">{mk.concentracoes.join(' · ')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Quick comparisons ───────────────────────────────────────

const QUICK_PAIRS: { label: string; aId: string; bId: string; desc: string }[] = [
  { label: 'Zart vs Holmes',          aId: 'losartana',        bId: 'enalapril',           desc: 'BRA vs IECA — HAS' },
  { label: 'SGLT-2 vs GLP-1',         aId: 'empagliflozina',   bId: 'liraglutida',         desc: 'DM2 + DCV' },
  { label: 'Metformina vs Sitagliptina', aId: 'metformina',    bId: 'sitagliptina',        desc: 'DM2 — 1ª vs 2ª linha' },
  { label: 'Carvedilol vs Sacubitril', aId: 'carvedilol',      bId: 'sacubitril_valsartana', desc: 'IC-FEr — Quarteto' },
  { label: 'Atorva vs Rosuva',         aId: 'atorvastatina',   bId: 'rosuvastatina',       desc: 'Estatinas alta intensidade' },
  { label: 'BRA vs BCC',              aId: 'losartana',        bId: 'anlodipino',           desc: 'Combinações HAS' },
];

// ─── Page ────────────────────────────────────────────────────

export default function ComparadorPage() {
  const [molA, setMolA] = useState<MoleculaComparavel | null>(null);
  const [molB, setMolB] = useState<MoleculaComparavel | null>(null);
  const [activeCategoria, setActiveCategoria] = useState<CategoriaComparacao | 'todas'>('todas');

  const scores = useMemo(() => {
    if (!molA || !molB) return [];
    return gerarComparativo(molA, molB);
  }, [molA, molB]);

  const categorias = ['todas', ...new Set(MOLECULES_DB.map(m => m.categoria))] as (CategoriaComparacao | 'todas')[];

  const handleMolClick = (m: MoleculaComparavel) => {
    if (!molA) { setMolA(m); return; }
    if (!molB && m.id !== molA.id) { setMolB(m); }
  };

  const moleculasFiltradas = useMemo((): MoleculaComparavel[] => {
    if (activeCategoria === 'todas') return MOLECULES_DB;
    return MOLECULES_DB.filter(m => m.categoria === activeCategoria);
  }, [activeCategoria]);

  const loadPair = (aId: string, bId: string) => {
    const a = MOLECULES_DB.find(m => m.id === aId);
    const b = MOLECULES_DB.find(m => m.id === bId);
    if (a) setMolA(a);
    if (b) setMolB(b);
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-black text-slate-900 dark:text-white">Comparador Farmacológico</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Comparação baseada em evidências clínicas · Apoio à decisão terapêutica</p>
          </div>
          {(molA || molB) && (
            <button onClick={() => { setMolA(null); setMolB(null); }} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar
            </button>
          )}
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 dark:text-blue-300">
            <strong>Suporte à decisão clínica.</strong> Dados baseados em diretrizes SBC, ADA, ESC, KDIGO, GINA (2023–2025).
            Scores são estimativas comparativas — a decisão terapêutica final é sempre do médico.
            A comparação <strong>nunca substitui</strong> a avaliação clínica individualizada.
          </p>
        </div>

        {/* Quick comparisons */}
        {!molA && !molB && (
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Comparações rápidas</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PAIRS.map(pair => (
                <button
                  key={pair.label}
                  onClick={() => loadPair(pair.aId, pair.bId)}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                >
                  <Scale className="w-3 h-3 text-slate-400" />
                  <span>{pair.label}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-400 font-normal">{pair.desc}</span>
                  <ArrowRight className="w-3 h-3 text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Seletores A e B */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MoleculeSelector
            label="Molécula A"
            side="A"
            selected={molA}
            onSelect={setMolA}
            onClear={() => setMolA(null)}
            otherSelected={molB}
          />
          <MoleculeSelector
            label="Molécula B"
            side="B"
            selected={molB}
            onSelect={setMolB}
            onClear={() => setMolB(null)}
            otherSelected={molA}
          />
        </div>

        {/* Resultado da comparação */}
        {molA && molB && scores.length > 0 && (
          <div className="space-y-5">
            {/* Radar + tabela */}
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
              <ComparativoRadar scores={scores} nomeA={molA.molecula} nomeB={molB.molecula} />
              <TabelaComparativa a={molA} b={molB} scores={scores} />
            </div>
          </div>
        )}

        {/* Quando apenas 1 selecionado */}
        {(molA || molB) && !(molA && molB) && (
          <div className="text-center py-10 text-slate-400">
            <Scale className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Selecione a {molA ? 'molécula B' : 'molécula A'} para iniciar a comparação.</p>
          </div>
        )}

        {/* Sem seleção — catálogo */}
        {!molA && !molB && (
          <div>
            {/* Filtro por categoria */}
            <div className="flex flex-wrap gap-2 mb-3">
              {categorias.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategoria(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                    activeCategoria === cat
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                  )}
                >
                  {cat === 'todas' ? 'Todas' : CATEGORIA_LABEL[cat]}
                </button>
              ))}
            </div>

            {/* Grid de moléculas */}
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">{moleculasFiltradas.length} moléculas disponíveis</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {moleculasFiltradas.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleMolClick(m)}
                  className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 text-left transition-all group"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-black text-white">
                    {m.nivel_evidencia}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 truncate">{m.molecula}</p>
                    <p className="text-[10px] text-slate-500 truncate">{m.classe}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className={cn('text-[8px] font-bold px-1.5 py-0.5 rounded-full', CATEGORIA_COR[m.categoria])}>{CATEGORIA_LABEL[m.categoria]}</span>
                      <span className="text-[8px] text-slate-400">{m.frequencia_doses_dia}×/dia</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
