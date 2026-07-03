'use client';

import { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Scale, Search, X, ChevronDown, ChevronUp, AlertTriangle,
  CheckCircle2, TrendingUp, DollarSign, Heart, Activity,
  FlaskConical, Shield, Zap, BookOpen, Info, ArrowRight,
  RotateCcw, Star, BarChart3, LayoutGrid, Table2, Layers,
  CheckCircle, Ban, AlertCircle, Stethoscope, Pill,
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
  getMoleculesByCategoria,
} from '@/lib/drug-comparator';

// ─── Tipos e constantes ─────────────────────────────────────────

type ViewMode = 'tabela' | 'cards' | 'radar';
type ModoComparacao = 'molecula' | 'marca' | 'classe';

const DIMENSAO_ICON: Record<string, React.ElementType> = {
  evidencia:    BookOpen,
  eficacia:     TrendingUp,
  seguranca:    Shield,
  custo:        DollarSign,
  adesao:       Heart,
  ajuste_renal: Activity,
  interacoes:   Zap,
  meia_vida:    Activity,
};

const DIMENSAO_LABEL_FULL: Record<string, string> = {
  evidencia:    'Evidência',
  eficacia:     'Eficácia',
  seguranca:    'Segurança',
  custo:        'Custo-efetividade',
  adesao:       'Adesão',
  ajuste_renal: 'Ajuste Renal',
  interacoes:   'Interações',
  meia_vida:    'Meia-vida',
};

// ─── Badge Gestante/Lactante ─────────────────────────────────────

function SafetyBadge({ value, label }: { value: boolean | 'evitar' | 'contraindicado'; label: string }) {
  const config = {
    true:          { icon: CheckCircle,  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', text: 'Seguro' },
    evitar:        { icon: AlertCircle,  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',         text: 'Evitar' },
    contraindicado:{ icon: Ban,          cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',                 text: 'Contraindicado' },
  };
  const key = String(value) as keyof typeof config;
  const c = config[key] ?? config.evitar;
  const Icon = c.icon;
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className="text-[9px] text-slate-400 uppercase font-semibold">{label}</span>
      <span className={cn('flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded', c.cls)}>
        <Icon className="w-3 h-3" />{c.text}
      </span>
    </div>
  );
}

// ─── Score Bar ──────────────────────────────────────────────────

function ScoreBar({ value, max = 5, color }: { value: number; max?: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── SVG Radar Chart ────────────────────────────────────────────

function RadarSVG({ scores, nomeA, nomeB }: { scores: ComparativoScore[]; nomeA: string; nomeB: string }) {
  if (scores.length === 0) return null;

  const SIZE   = 220;
  const CX     = SIZE / 2;
  const CY     = SIZE / 2;
  const R      = 80;
  const N      = scores.length;

  // Calculate polygon points for each molecule
  const angle  = (i: number) => (Math.PI * 2 * i) / N - Math.PI / 2;
  const pt     = (r: number, i: number) => ({
    x: CX + r * Math.cos(angle(i)),
    y: CY + r * Math.sin(angle(i)),
  });

  const polyA = scores.map((s, i) => pt((s.score_a / 5) * R, i));
  const polyB = scores.map((s, i) => pt((s.score_b / 5) * R, i));
  const toD   = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';

  // Web lines
  const levels = [1, 2, 3, 4, 5];
  const spokes = scores.map((_, i) => ({ from: { x: CX, y: CY }, to: pt(R, i) }));

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
      {/* Legend */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-sm flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          Radar Comparativo
        </h3>
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-blue-400 inline-block" />{nomeA}</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-purple-400 inline-block" />{nomeB}</div>
        </div>
      </div>

      <div className="flex justify-center">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Concentric web rings */}
          {levels.map(lv => (
            <polygon
              key={lv}
              points={scores.map((_, i) => { const p = pt((lv / 5) * R, i); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ')}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          ))}
          {/* Level 5 label */}
          {scores.map((s, i) => {
            const p5 = pt(R + 14, i);
            const Icon = DIMENSAO_ICON[s.dimensao] ?? BookOpen;
            return (
              <text
                key={s.dimensao}
                x={p5.x}
                y={p5.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="7"
                fill="rgba(255,255,255,0.5)"
              >
                {DIMENSAO_LABEL_FULL[s.dimensao]?.slice(0, 6)}
              </text>
            );
          })}
          {/* Spokes */}
          {spokes.map((sp, i) => (
            <line key={i} x1={sp.from.x} y1={sp.from.y} x2={sp.to.x.toFixed(1)} y2={sp.to.y.toFixed(1)}
              stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          ))}
          {/* Polygon B (behind) */}
          <path d={toD(polyB)} fill="rgba(167,139,250,0.15)" stroke="#A78BFA" strokeWidth="1.5" strokeLinejoin="round" />
          {/* Polygon A (front) */}
          <path d={toD(polyA)} fill="rgba(96,165,250,0.18)" stroke="#60A5FA" strokeWidth="1.5" strokeLinejoin="round" />
          {/* Dots A */}
          {polyA.map((p, i) => <circle key={`a${i}`} cx={p.x} cy={p.y} r={2.5} fill="#60A5FA" />)}
          {/* Dots B */}
          {polyB.map((p, i) => <circle key={`b${i}`} cx={p.x} cy={p.y} r={2.5} fill="#A78BFA" />)}
        </svg>
      </div>

      {/* Score legend */}
      <div className="space-y-2 mt-2">
        {scores.map(s => {
          const Icon = DIMENSAO_ICON[s.dimensao] ?? BookOpen;
          const barA = Math.round((s.score_a / 5) * 100);
          const barB = Math.round((s.score_b / 5) * 100);
          return (
            <div key={s.dimensao}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <p className="text-[10px] font-semibold text-slate-300 flex-1">{s.label}</p>
                {s.vantagem !== 'igual' && (
                  <span className={cn('text-[8px] font-bold px-1 py-0.5 rounded',
                    s.vantagem === 'A' ? 'bg-blue-500/30 text-blue-300' : 'bg-purple-500/30 text-purple-300'
                  )}>
                    {s.vantagem === 'A' ? nomeA : nomeB}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[8px] text-slate-400"><span>{s.nota_a}</span><span>{barA}%</span></div>
                  <div className="h-1 bg-slate-700 rounded-full"><div className="h-full bg-blue-400 rounded-full" style={{ width: `${barA}%` }} /></div>
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[8px] text-slate-400"><span>{s.nota_b}</span><span>{barB}%</span></div>
                  <div className="h-1 bg-slate-700 rounded-full"><div className="h-full bg-purple-400 rounded-full" style={{ width: `${barB}%` }} /></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Placar */}
      {(() => {
        const va = scores.filter(s => s.vantagem === 'A').length;
        const vb = scores.filter(s => s.vantagem === 'B').length;
        const eq = scores.filter(s => s.vantagem === 'igual').length;
        return (
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10">
            <div className="text-center bg-blue-600/20 rounded-xl p-2">
              <p className="text-2xl font-black text-blue-300">{va}</p>
              <p className="text-[9px] text-blue-200 truncate">{nomeA}</p>
            </div>
            <div className="text-center bg-slate-700/30 rounded-xl p-2">
              <p className="text-2xl font-black text-slate-400">{eq}</p>
              <p className="text-[9px] text-slate-400">Empate</p>
            </div>
            <div className="text-center bg-purple-600/20 rounded-xl p-2">
              <p className="text-2xl font-black text-purple-300">{vb}</p>
              <p className="text-[9px] text-purple-200 truncate">{nomeB}</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Cards View ─────────────────────────────────────────────────

function CardsView({ a, b, scores }: { a: MoleculaComparavel; b: MoleculaComparavel; scores: ComparativoScore[] }) {
  const scoreMap = Object.fromEntries(scores.map(s => [s.dimensao, s]));

  const MolCard = ({ mol, side, scoreKey }: { mol: MoleculaComparavel; side: 'A' | 'B'; scoreKey: 'score_a' | 'score_b' }) => {
    const isA = side === 'A';
    const accent = isA ? 'from-blue-600 to-blue-700' : 'from-purple-600 to-purple-700';
    const ring   = isA ? 'ring-blue-500' : 'ring-purple-500';
    const badgeBg = isA ? 'bg-blue-500/20' : 'bg-purple-500/20';
    const scoreColor = isA ? 'bg-blue-500' : 'bg-purple-500';
    const dimColor   = isA ? 'text-blue-700 dark:text-blue-400' : 'text-purple-700 dark:text-purple-400';

    const venceu = (dim: string) => {
      const s = scoreMap[dim];
      return s?.vantagem === side;
    };

    return (
      <div className={cn('rounded-2xl border-2 overflow-hidden', isA ? 'border-blue-500' : 'border-purple-500')}>
        {/* Header */}
        <div className={cn('bg-gradient-to-br text-white p-5', accent)}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-sm font-black">{side}</div>
            <div className="flex gap-1.5">
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', badgeBg, 'text-white')}>
                Nível {mol.nivel_evidencia}
              </span>
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', badgeBg, 'text-white')}>
                Grau {mol.grau_recomendacao}
              </span>
            </div>
          </div>
          <h3 className="text-xl font-black">{mol.molecula}</h3>
          <p className="text-white/80 text-sm">{mol.classe}</p>
          {mol.subclasse && <p className="text-white/60 text-xs mt-0.5">{mol.subclasse}</p>}
          <div className="flex flex-wrap gap-1 mt-3">
            {mol.marcas.filter(m => m.destaque).map(m => (
              <span key={m.nome} className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-blue-700 flex items-center gap-1">
                <Star className="w-2.5 h-2.5" />{m.nome}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 space-y-4">
          {/* Evidence */}
          <div className={cn('p-3 rounded-xl border', venceu('evidencia') ? (isA ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800') : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800')}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><BookOpen className="w-3 h-3" />Evidência & Diretriz</p>
              {venceu('evidencia') && <CheckCircle2 className={cn('w-3.5 h-3.5', isA ? 'text-blue-500' : 'text-purple-500')} />}
            </div>
            <p className={cn('text-sm font-black', dimColor)}>Nível {mol.nivel_evidencia} / Grau {mol.grau_recomendacao}</p>
            <p className="text-xs text-slate-500 mt-0.5">{mol.diretriz_principal}</p>
          </div>

          {/* Dose */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Pill className="w-3 h-3" />Posologia</p>
            <p className="text-xs text-slate-700 dark:text-slate-300"><span className="text-slate-400">Inicial: </span>{mol.dose_inicial}</p>
            <p className="text-xs text-slate-700 dark:text-slate-300"><span className="text-slate-400">Alvo: </span>{mol.dose_alvo}</p>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
              <span className="text-slate-400">Freq: </span>
              <span className={cn('font-semibold', venceu('adesao') ? dimColor : '')}>{mol.frequencia_doses_dia}× ao dia · {mol.via}</span>
            </p>
          </div>

          {/* Safety scores */}
          <div className="grid grid-cols-3 gap-2">
            {scores.map(s => {
              const score = s[scoreKey];
              const winning = s.vantagem === side;
              return (
                <div key={s.dimensao} className={cn('p-2 rounded-lg text-center', winning ? (isA ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-800' : 'bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-200 dark:ring-purple-800') : 'bg-slate-50 dark:bg-slate-800/50')}>
                  <p className={cn('text-lg font-black', winning ? dimColor : 'text-slate-600 dark:text-slate-400')}>{score.toFixed(1)}</p>
                  <p className="text-[8px] text-slate-400 leading-tight">{DIMENSAO_LABEL_FULL[s.dimensao]}</p>
                  <div className={cn('h-1 rounded-full mt-1 mx-auto', isA ? 'bg-blue-200 dark:bg-blue-900' : 'bg-purple-200 dark:bg-purple-900')} style={{ width: `${(score / 5) * 100}%` }}>
                    <div className={cn('h-full rounded-full', isA ? 'bg-blue-500' : 'bg-purple-500')} style={{ width: '100%' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ajustes populações */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Stethoscope className="w-3 h-3" />Populações Especiais</p>
            <div className="grid grid-cols-2 gap-2">
              <SafetyBadge value={mol.seguro_gestante} label="Gestante" />
              <SafetyBadge value={mol.seguro_lactante} label="Lactante" />
            </div>
            {mol.ajuste_renal.tfg_contraindicado && (
              <p className="text-[10px] text-red-600 dark:text-red-400 mt-1.5">
                ⚠ CI renal se TFG &lt; {mol.ajuste_renal.tfg_contraindicado} mL/min
              </p>
            )}
            {mol.uso_idoso && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">👴 {mol.uso_idoso.slice(0, 60)}</p>
            )}
          </div>

          {/* Key efficacy */}
          {mol.eficacia.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1"><TrendingUp className="w-3 h-3" />Eficácia chave</p>
              {mol.eficacia.slice(0, 2).map((ef, i) => (
                <div key={i} className="flex items-start justify-between gap-2 mb-1.5 last:mb-0">
                  <div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{ef.desfecho}</p>
                    <p className={cn('text-sm font-black', dimColor)}>{ef.reducao}</p>
                    <p className="text-[9px] text-slate-400">{ef.estudo}{ef.n_pacientes ? ` · n=${ef.n_pacientes.toLocaleString('pt-BR')}` : ''}</p>
                  </div>
                  {ef.nnt && (
                    <div className={cn('text-center px-2 py-1 rounded-lg flex-shrink-0', isA ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30')}>
                      <p className={cn('text-base font-black', dimColor)}>{ef.nnt}</p>
                      <p className="text-[8px] text-slate-400">NNT</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Cost + Adherence */}
          <div className="grid grid-cols-2 gap-2">
            <div className={cn('p-2 rounded-lg', venceu('custo') ? (isA ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-purple-50 dark:bg-purple-900/20') : 'bg-slate-50 dark:bg-slate-800/50')}>
              <p className="text-[9px] text-slate-400 uppercase font-semibold">Custo</p>
              <p className={cn('text-xs font-bold mt-0.5', CUSTO_LABEL[mol.custo_relativo].cls)}>{CUSTO_LABEL[mol.custo_relativo].label}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">{mol.custo_descricao.slice(0, 40)}</p>
            </div>
            <div className={cn('p-2 rounded-lg', venceu('adesao') ? (isA ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-purple-50 dark:bg-purple-900/20') : 'bg-slate-50 dark:bg-slate-800/50')}>
              <p className="text-[9px] text-slate-400 uppercase font-semibold">Adesão</p>
              <p className={cn('text-xs font-bold mt-0.5', ADESAO_LABEL[mol.adesao_score].cls)}>{ADESAO_LABEL[mol.adesao_score].label}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">{mol.adesao_descricao.slice(0, 40)}</p>
            </div>
          </div>

          {/* Marcas */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Marcas disponíveis</p>
            <div className="flex flex-wrap gap-1">
              {mol.marcas.map(m => (
                <span key={m.nome} className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', m.destaque ? (isA ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white') : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400')}>
                  {m.destaque && '★ '}{m.nome}
                </span>
              ))}
            </div>
          </div>

          {/* Top interactions */}
          {mol.interacoes.filter(i => i.severidade === 'contraindicada' || i.severidade === 'grave').length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1"><Zap className="w-3 h-3" />Interações graves</p>
              {mol.interacoes.filter(i => i.severidade === 'contraindicada' || i.severidade === 'grave').map(inter => (
                <div key={inter.farmaco} className={cn('rounded-lg p-1.5 text-[10px] mb-1', INTERACAO_SEV_COR[inter.severidade])}>
                  <span className="font-bold">{inter.farmaco}</span> — {inter.mecanismo.slice(0, 50)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <MolCard mol={a} side="A" scoreKey="score_a" />
      <MolCard mol={b} side="B" scoreKey="score_b" />
    </div>
  );
}

// ─── Tabela comparativa detalhada ────────────────────────────────

type CompTab = 'visao_geral' | 'eficacia' | 'seguranca' | 'doses' | 'interacoes' | 'marcas' | 'farmacocinetica';

function TabelaComparativa({ a, b, scores }: { a: MoleculaComparavel; b: MoleculaComparavel; scores: ComparativoScore[] }) {
  const [tab, setTab] = useState<CompTab>('visao_geral');

  const tabs: { id: CompTab; label: string; icon: React.ElementType }[] = [
    { id: 'visao_geral',     label: 'Visão geral',     icon: Scale       },
    { id: 'eficacia',        label: 'Eficácia',        icon: TrendingUp  },
    { id: 'seguranca',       label: 'Segurança',       icon: Shield      },
    { id: 'doses',           label: 'Doses & Ajustes', icon: Activity    },
    { id: 'interacoes',      label: 'Interações',      icon: Zap         },
    { id: 'marcas',          label: 'Marcas',          icon: Star        },
    { id: 'farmacocinetica', label: 'Farmacocinética', icon: FlaskConical},
  ];

  const scoreMap = Object.fromEntries(scores.map(s => [s.dimensao, s]));

  const Row = ({ label, valA, valB, highlight, sub }: {
    label: string; valA: React.ReactNode; valB: React.ReactNode;
    highlight?: 'A' | 'B' | 'igual'; sub?: string;
  }) => (
    <div className="grid grid-cols-[170px_1fr_1fr] gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 items-start">
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
        {sub && <p className="text-[9px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <div className={cn('text-xs text-slate-700 dark:text-slate-300', highlight === 'A' && 'font-semibold text-blue-700 dark:text-blue-400')}>{valA}</div>
      <div className={cn('text-xs text-slate-700 dark:text-slate-300', highlight === 'B' && 'font-semibold text-purple-700 dark:text-purple-400')}>{valB}</div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
      {/* Column headers */}
      <div className="grid grid-cols-[170px_1fr_1fr] gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
        <div />
        {[a, b].map((mol, idx) => (
          <div key={mol.id} className="flex items-center gap-2">
            <span className={cn('w-6 h-6 rounded-md flex items-center justify-center text-xs font-black text-white', idx === 0 ? 'bg-blue-600' : 'bg-purple-600')}>{idx === 0 ? 'A' : 'B'}</span>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">{mol.molecula}</p>
              <p className="text-[10px] text-slate-500">{mol.classe}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto scrollbar-none border-b border-slate-100 dark:border-slate-800">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap -mb-px transition-colors',
                tab === t.id ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon className="w-3.5 h-3.5" />{t.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 space-y-0">
        {/* ── Visão geral ── */}
        {tab === 'visao_geral' && (
          <>
            <Row label="Classe" valA={a.classe} valB={b.classe} />
            <Row label="Subclasse" valA={a.subclasse ?? '—'} valB={b.subclasse ?? '—'} />
            <Row label="Nível evidência"
              highlight={scoreMap.evidencia?.vantagem}
              valA={<span className="font-bold text-blue-700 dark:text-blue-400">Nível {a.nivel_evidencia} / Grau {a.grau_recomendacao}</span>}
              valB={<span className="font-bold text-purple-700 dark:text-purple-400">Nível {b.nivel_evidencia} / Grau {b.grau_recomendacao}</span>}
            />
            <Row label="Diretriz" valA={a.diretriz_principal} valB={b.diretriz_principal} />
            <Row label="Indicações"
              valA={<ul className="space-y-0.5">{a.indicacoes.map(i => <li key={i}>• {i}</li>)}</ul>}
              valB={<ul className="space-y-0.5">{b.indicacoes.map(i => <li key={i}>• {i}</li>)}</ul>}
            />
            <Row label="Custo"
              highlight={scoreMap.custo?.vantagem}
              valA={<><span className={CUSTO_LABEL[a.custo_relativo].cls}>{CUSTO_LABEL[a.custo_relativo].label}</span><p className="text-[10px] text-slate-400 mt-0.5">{a.custo_descricao}</p></>}
              valB={<><span className={CUSTO_LABEL[b.custo_relativo].cls}>{CUSTO_LABEL[b.custo_relativo].label}</span><p className="text-[10px] text-slate-400 mt-0.5">{b.custo_descricao}</p></>}
            />
            <Row label="Adesão"
              highlight={scoreMap.adesao?.vantagem}
              valA={<><span className={ADESAO_LABEL[a.adesao_score].cls}>{ADESAO_LABEL[a.adesao_score].label}</span><p className="text-[10px] text-slate-400 mt-0.5">{a.adesao_descricao}</p></>}
              valB={<><span className={ADESAO_LABEL[b.adesao_score].cls}>{ADESAO_LABEL[b.adesao_score].label}</span><p className="text-[10px] text-slate-400 mt-0.5">{b.adesao_descricao}</p></>}
            />
            <Row label="Gestante / Lactante"
              valA={<div className="flex gap-3"><SafetyBadge value={a.seguro_gestante} label="Gestante" /><SafetyBadge value={a.seguro_lactante} label="Lactante" /></div>}
              valB={<div className="flex gap-3"><SafetyBadge value={b.seguro_gestante} label="Gestante" /><SafetyBadge value={b.seguro_lactante} label="Lactante" /></div>}
            />
          </>
        )}

        {/* ── Eficácia ── */}
        {tab === 'eficacia' && (
          <div className="grid grid-cols-2 gap-4 pt-1">
            {[a, b].map((mol, idx) => (
              <div key={mol.id} className={cn('rounded-xl p-3', idx === 0 ? 'bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800' : 'bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800')}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('w-5 h-5 rounded text-[10px] font-black text-white flex items-center justify-center', idx === 0 ? 'bg-blue-600' : 'bg-purple-600')}>{idx === 0 ? 'A' : 'B'}</span>
                  <p className="font-bold text-sm">{mol.molecula}</p>
                </div>
                {mol.eficacia.map((ef, i) => (
                  <div key={i} className="mb-2 last:mb-0 p-2.5 bg-white dark:bg-slate-900/50 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{ef.desfecho}</p>
                        <p className={cn('text-sm font-black mt-0.5', idx === 0 ? 'text-blue-700' : 'text-purple-700')}>{ef.reducao}</p>
                      </div>
                      {ef.nnt && (
                        <div className={cn('px-2 py-1 rounded-lg text-center flex-shrink-0', idx === 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30')}>
                          <p className={cn('text-lg font-black', idx === 0 ? 'text-blue-700' : 'text-purple-700')}>{ef.nnt}</p>
                          <p className="text-[8px] text-slate-400">NNT</p>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">{ef.estudo}{ef.n_pacientes ? ` · n=${ef.n_pacientes.toLocaleString('pt-BR')}` : ''}{ef.rrr ? ` · RRR ${ef.rrr}` : ''}</p>
                  </div>
                ))}
                {mol.eficacia.length === 0 && <p className="text-xs text-slate-400">Dados de eficácia não mapeados</p>}
              </div>
            ))}
          </div>
        )}

        {/* ── Segurança ── */}
        {tab === 'seguranca' && (
          <>
            <Row label="Gestante / Lactante"
              valA={<div className="flex gap-3"><SafetyBadge value={a.seguro_gestante} label="Gestante" /><SafetyBadge value={a.seguro_lactante} label="Lactante" /></div>}
              valB={<div className="flex gap-3"><SafetyBadge value={b.seguro_gestante} label="Gestante" /><SafetyBadge value={b.seguro_lactante} label="Lactante" /></div>}
            />
            <Row label="Contraindicações"
              valA={<ul className="space-y-0.5">{a.contraindicacoes.map(c => <li key={c} className="flex gap-1"><X className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />{c}</li>)}</ul>}
              valB={<ul className="space-y-0.5">{b.contraindicacoes.map(c => <li key={c} className="flex gap-1"><X className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />{c}</li>)}</ul>}
            />
            <Row label="Efeitos adversos"
              valA={<ul className="space-y-0.5">{a.efeitos_adversos_principais.map(e => <li key={e} className="flex gap-1"><AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />{e}</li>)}</ul>}
              valB={<ul className="space-y-0.5">{b.efeitos_adversos_principais.map(e => <li key={e} className="flex gap-1"><AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />{e}</li>)}</ul>}
            />
            <Row label="Idoso" valA={a.uso_idoso ?? '—'} valB={b.uso_idoso ?? '—'} />
            <Row label="Pediátrico" valA={a.uso_pediatrico ?? '—'} valB={b.uso_pediatrico ?? '—'} />
          </>
        )}

        {/* ── Doses & Ajustes ── */}
        {tab === 'doses' && (
          <>
            <Row label="Via / Formas" valA={`${a.via} · ${a.formas.join(' · ')}`} valB={`${b.via} · ${b.formas.join(' · ')}`} />
            <Row label="Dose inicial" valA={a.dose_inicial} valB={b.dose_inicial} />
            <Row label="Dose alvo"    valA={a.dose_alvo}    valB={b.dose_alvo} />
            <Row label="Frequência/dia"
              highlight={a.frequencia_doses_dia < b.frequencia_doses_dia ? 'A' : a.frequencia_doses_dia > b.frequencia_doses_dia ? 'B' : 'igual'}
              valA={`${a.frequencia_doses_dia}× ao dia`} valB={`${b.frequencia_doses_dia}× ao dia`}
            />
            <Row label="Ajuste renal" sub="TFG mL/min"
              highlight={scoreMap.ajuste_renal?.vantagem}
              valA={<><p>{a.ajuste_renal.tfg_reducao}</p>{a.ajuste_renal.tfg_contraindicado && <p className="text-red-600 dark:text-red-400 font-medium">CI se TFG &lt; {a.ajuste_renal.tfg_contraindicado}</p>}{a.ajuste_renal.dialise && <p className="text-slate-400">{a.ajuste_renal.dialise}</p>}</>}
              valB={<><p>{b.ajuste_renal.tfg_reducao}</p>{b.ajuste_renal.tfg_contraindicado && <p className="text-red-600 dark:text-red-400 font-medium">CI se TFG &lt; {b.ajuste_renal.tfg_contraindicado}</p>}{b.ajuste_renal.dialise && <p className="text-slate-400">{b.ajuste_renal.dialise}</p>}</>}
            />
            <Row label="Child-Pugh A" valA={a.ajuste_hepatico.child_a ?? '—'} valB={b.ajuste_hepatico.child_a ?? '—'} />
            <Row label="Child-Pugh B" valA={a.ajuste_hepatico.child_b ?? '—'} valB={b.ajuste_hepatico.child_b ?? '—'} />
            <Row label="Child-Pugh C" valA={a.ajuste_hepatico.child_c ?? '—'} valB={b.ajuste_hepatico.child_c ?? '—'} />
          </>
        )}

        {/* ── Interações ── */}
        {tab === 'interacoes' && (
          <div className="grid grid-cols-2 gap-4 pt-1">
            {[a, b].map((mol, idx) => (
              <div key={mol.id}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={cn('w-5 h-5 rounded text-[10px] font-black text-white flex items-center justify-center', idx === 0 ? 'bg-blue-600' : 'bg-purple-600')}>{idx === 0 ? 'A' : 'B'}</span>
                  <p className="font-bold text-sm">{mol.molecula}</p>
                </div>
                <div className="space-y-1.5">
                  {mol.interacoes.map(inter => (
                    <div key={inter.farmaco} className={cn('rounded-lg p-2.5 text-xs', INTERACAO_SEV_COR[inter.severidade])}>
                      <div className="flex justify-between gap-2">
                        <p className="font-bold">{inter.farmaco}</p>
                        <span className="text-[9px] font-bold uppercase">{inter.severidade}</span>
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

        {/* ── Marcas ── */}
        {tab === 'marcas' && (
          <div className="grid grid-cols-2 gap-4 pt-1">
            {[a, b].map((mol, idx) => (
              <div key={mol.id}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={cn('w-5 h-5 rounded text-[10px] font-black text-white flex items-center justify-center', idx === 0 ? 'bg-blue-600' : 'bg-purple-600')}>{idx === 0 ? 'A' : 'B'}</span>
                  <p className="font-bold text-sm">{mol.molecula}</p>
                </div>
                <div className="space-y-1.5">
                  {mol.marcas.map(mk => (
                    <div key={mk.nome} className={cn('rounded-lg p-2.5 border text-xs', mk.destaque ? (idx === 0 ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20' : 'border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20') : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50')}>
                      <div className="flex items-start gap-1.5">
                        {mk.destaque && <Star className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />}
                        <div>
                          <p className="font-bold">{mk.nome}</p>
                          <p className="text-[10px] text-slate-500">{mk.laboratorio} · {mk.concentracoes.join(' · ')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Farmacocinética ── */}
        {tab === 'farmacocinetica' && a.farmacocinetica && b.farmacocinetica && (
          <>
            <Row label="Meia-vida (t½)"
              highlight={scoreMap.meia_vida?.vantagem}
              valA={<span className="font-bold text-blue-700 dark:text-blue-400">{a.farmacocinetica.meia_vida_h}h {a.farmacocinetica.meia_vida_descricao ? <span className="font-normal text-slate-500">— {a.farmacocinetica.meia_vida_descricao}</span> : ''}</span>}
              valB={<span className="font-bold text-purple-700 dark:text-purple-400">{b.farmacocinetica.meia_vida_h}h {b.farmacocinetica.meia_vida_descricao ? <span className="font-normal text-slate-500">— {b.farmacocinetica.meia_vida_descricao}</span> : ''}</span>}
            />
            <Row label="Biodisponibilidade" valA={a.farmacocinetica.biodisponibilidade} valB={b.farmacocinetica.biodisponibilidade} />
            <Row label="Tmax" valA={a.farmacocinetica.tmax_h} valB={b.farmacocinetica.tmax_h} />
            <Row label="Ligação proteica" valA={a.farmacocinetica.ligacao_proteica} valB={b.farmacocinetica.ligacao_proteica} />
            <Row label="Pró-fármaco"
              valA={<span className={a.farmacocinetica.profarmaco ? 'text-amber-600 font-semibold' : ''}>{a.farmacocinetica.profarmaco ? `Sim — ${a.farmacocinetica.metabólito_ativo ?? ''}` : 'Não'}</span>}
              valB={<span className={b.farmacocinetica.profarmaco ? 'text-amber-600 font-semibold' : ''}>{b.farmacocinetica.profarmaco ? `Sim — ${b.farmacocinetica.metabólito_ativo ?? ''}` : 'Não'}</span>}
            />
            <Row label="Via metabolismo" valA={a.farmacocinetica.via_metabolismo} valB={b.farmacocinetica.via_metabolismo} />
            <Row label="Excreção renal"
              valA={<span>{a.farmacocinetica.excrecao_renal_pct}%{a.farmacocinetica.dialise_remove ? <span className="text-red-500 ml-1 font-semibold">(dialisável)</span> : <span className="text-slate-400 ml-1">(não dialisável)</span>}</span>}
              valB={<span>{b.farmacocinetica.excrecao_renal_pct}%{b.farmacocinetica.dialise_remove ? <span className="text-red-500 ml-1 font-semibold">(dialisável)</span> : <span className="text-slate-400 ml-1">(não dialisável)</span>}</span>}
            />
            <Row label="Excreção biliar" valA={`${a.farmacocinetica.excrecao_biliar_pct}%`} valB={`${b.farmacocinetica.excrecao_biliar_pct}%`} />
            {(a.farmacocinetica.alimento_efeito || b.farmacocinetica.alimento_efeito) && (
              <Row label="Alimento" valA={a.farmacocinetica.alimento_efeito ?? '—'} valB={b.farmacocinetica.alimento_efeito ?? '—'} />
            )}
            <Row label="Mecanismo molecular"
              valA={<p className="text-[11px] leading-relaxed">{a.farmacocinetica.mecanismo_molecular}</p>}
              valB={<p className="text-[11px] leading-relaxed">{b.farmacocinetica.mecanismo_molecular}</p>}
            />
            {(a.farmacocinetica.reducao_pas_mmhg || b.farmacocinetica.reducao_pas_mmhg) && (
              <Row label="Redução PAS" valA={a.farmacocinetica.reducao_pas_mmhg ?? '—'} valB={b.farmacocinetica.reducao_pas_mmhg ?? '—'} />
            )}
            {(a.farmacocinetica.reducao_ldl_pct || b.farmacocinetica.reducao_ldl_pct) && (
              <Row label="Redução LDL" valA={a.farmacocinetica.reducao_ldl_pct ?? '—'} valB={b.farmacocinetica.reducao_ldl_pct ?? '—'} />
            )}
            {(a.farmacocinetica.reducao_hba1c_pct || b.farmacocinetica.reducao_hba1c_pct) && (
              <Row label="Redução HbA1c" valA={a.farmacocinetica.reducao_hba1c_pct ?? '—'} valB={b.farmacocinetica.reducao_hba1c_pct ?? '—'} />
            )}
            {(a.farmacocinetica.reducao_pes_kg || b.farmacocinetica.reducao_pes_kg) && (
              <Row label="Redução peso" valA={a.farmacocinetica.reducao_pes_kg ?? '—'} valB={b.farmacocinetica.reducao_pes_kg ?? '—'} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Molecule Selector ──────────────────────────────────────────

function MoleculeSelector({ label, side, selected, onSelect, onClear, otherSelected }: {
  label: string; side: 'A' | 'B';
  selected: MoleculaComparavel | null; onSelect: (m: MoleculaComparavel) => void; onClear: () => void;
  otherSelected: MoleculaComparavel | null;
}) {
  const [query, setQuery]   = useState('');
  const [open, setOpen]     = useState(false);

  const results = useMemo(() => {
    const found = searchMoleculas(query);
    return found.filter(m => m.id !== otherSelected?.id);
  }, [query, otherSelected]);

  const isA    = side === 'A';
  const accent = isA ? 'from-blue-600 to-blue-700' : 'from-purple-600 to-purple-700';
  const badge  = isA ? 'bg-blue-600' : 'bg-purple-600';
  const border = isA ? 'border-blue-500' : 'border-purple-500';

  if (selected) {
    return (
      <div className={cn('rounded-xl border-2 overflow-hidden', border)}>
        <div className={cn('bg-gradient-to-br text-white p-4', accent)}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-xs font-black flex-shrink-0">{side}</div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm">{selected.molecula}</p>
              <p className="text-xs text-white/80">{selected.classe}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20">{CATEGORIA_LABEL[selected.categoria]}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20">Nível {selected.nivel_evidencia} / Grau {selected.grau_recomendacao}</span>
              </div>
            </div>
            <button onClick={onClear} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
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
      <div className={cn('rounded-xl border-2 border-dashed p-3', isA ? 'border-blue-300 dark:border-blue-700' : 'border-purple-300 dark:border-purple-700')}>
        <div className="flex items-center gap-2 mb-2">
          <span className={cn('w-7 h-7 rounded-lg text-xs font-black text-white flex items-center justify-center', badge)}>{side}</span>
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
              <button key={m.id} onClick={() => { onSelect(m); setQuery(''); setOpen(false); }}
                className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{m.molecula}</p>
                    <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', CATEGORIA_COR[m.categoria])}>{m.classe}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{m.marcas.slice(0, 2).map(mk => mk.nome).join(' · ')}</p>
                </div>
                <span className="text-[9px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded flex-shrink-0">Nível {m.nivel_evidencia}</span>
              </button>
            ))}
          </div>
        )}
        {open && <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />}
      </div>
    </div>
  );
}

// ─── Comparação de classe ────────────────────────────────────────

function ClasseComparacao() {
  const [catSel, setCatSel] = useState<CategoriaComparacao>('anti_hipertensivos');
  const mols = getMoleculesByCategoria(catSel);
  const cats = [...new Set(MOLECULES_DB.map(m => m.categoria))] as CategoriaComparacao[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {cats.map(c => (
          <button key={c} onClick={() => setCatSel(c)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              catSel === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-300'
            )}
          >
            {CATEGORIA_LABEL[c]}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500">{mols.length} moléculas na classe · Comparação transversal por dimensão</p>

      {/* Comparison grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left p-2.5 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 w-32">Molécula</th>
              {['Evidência', 'Grau', 'Custo', 'Adesão', 'Freq/dia', 'Renal CI', 'Gestante', 'Lactante', 'Interações'].map(h => (
                <th key={h} className="p-2.5 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mols.map((mol, i) => (
              <tr key={mol.id} className={cn('border-b border-slate-200 dark:border-slate-700', i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/20')}>
                <td className="p-2.5 border border-slate-200 dark:border-slate-700">
                  <p className="font-bold text-slate-800 dark:text-slate-200">{mol.molecula}</p>
                  <p className="text-[9px] text-slate-400">{mol.marcas.filter(m => m.destaque).map(m => m.nome).join(' · ')}</p>
                </td>
                <td className="p-2 border border-slate-200 dark:border-slate-700 text-center">
                  <span className={cn('font-black px-1.5 py-0.5 rounded text-[10px]',
                    mol.nivel_evidencia === 'A' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    mol.nivel_evidencia === 'B' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-amber-100 text-amber-700'
                  )}>{mol.nivel_evidencia}</span>
                </td>
                <td className="p-2 border border-slate-200 dark:border-slate-700 text-center">
                  <span className={cn('font-bold px-1.5 py-0.5 rounded text-[10px]',
                    mol.grau_recomendacao === 'I' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  )}>{mol.grau_recomendacao}</span>
                </td>
                <td className="p-2 border border-slate-200 dark:border-slate-700 text-center">
                  <span className={cn('text-[10px] font-semibold', CUSTO_LABEL[mol.custo_relativo].cls)}>
                    {'●'.repeat(mol.custo_relativo)}{'○'.repeat(5 - mol.custo_relativo)}
                  </span>
                </td>
                <td className="p-2 border border-slate-200 dark:border-slate-700 text-center">
                  <span className={cn('text-[10px] font-semibold', ADESAO_LABEL[mol.adesao_score].cls)}>
                    {ADESAO_LABEL[mol.adesao_score].label}
                  </span>
                </td>
                <td className="p-2 border border-slate-200 dark:border-slate-700 text-center">
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded',
                    mol.frequencia_doses_dia === 1 ? 'bg-emerald-100 text-emerald-700' : mol.frequencia_doses_dia === 2 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  )}>{mol.frequencia_doses_dia}×</span>
                </td>
                <td className="p-2 border border-slate-200 dark:border-slate-700 text-center">
                  {mol.ajuste_renal.tfg_contraindicado ? (
                    <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">&lt;{mol.ajuste_renal.tfg_contraindicado}</span>
                  ) : <span className="text-[10px] text-emerald-600">Sem CI</span>}
                </td>
                <td className="p-2 border border-slate-200 dark:border-slate-700 text-center">
                  {mol.seguro_gestante === true ? <span className="text-emerald-500 text-sm">✓</span>
                    : mol.seguro_gestante === 'evitar' ? <span className="text-amber-500 text-sm">⚠</span>
                    : <span className="text-red-500 text-sm">✕</span>}
                </td>
                <td className="p-2 border border-slate-200 dark:border-slate-700 text-center">
                  {mol.seguro_lactante === true ? <span className="text-emerald-500 text-sm">✓</span>
                    : mol.seguro_lactante === 'evitar' ? <span className="text-amber-500 text-sm">⚠</span>
                    : <span className="text-red-500 text-sm">✕</span>}
                </td>
                <td className="p-2 border border-slate-200 dark:border-slate-700 text-center">
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded',
                    mol.interacoes.some(i => i.severidade === 'contraindicada') ? 'bg-red-100 text-red-700' :
                    mol.interacoes.some(i => i.severidade === 'grave') ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-100 text-slate-500'
                  )}>{mol.interacoes.length}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Quick pairs ────────────────────────────────────────────────

const QUICK_PAIRS = [
  { label: 'Zart vs Holmes',             aId: 'losartana',        bId: 'olmesartana',           desc: 'BRA × BRA' },
  { label: 'SGLT-2 vs GLP-1',            aId: 'empagliflozina',   bId: 'liraglutida',           desc: 'DM2 + DCV' },
  { label: 'Metformina vs Sitagliptina', aId: 'metformina',       bId: 'sitagliptina',          desc: 'DM2 1ª vs 2ª linha' },
  { label: 'Carvedilol vs Sacubitril',   aId: 'carvedilol',       bId: 'sacubitril_valsartana', desc: 'IC-FEr Quarteto' },
  { label: 'Atorva vs Rosuva',           aId: 'atorvastatina',    bId: 'rosuvastatina',         desc: 'Estatinas alta intensidade' },
  { label: 'BRA vs BCC',                 aId: 'losartana',        bId: 'anlodipino',            desc: 'Combinações HAS' },
];

// ─── Page ────────────────────────────────────────────────────────

export default function ComparadorPage() {
  const [molA,         setMolA]         = useState<MoleculaComparavel | null>(null);
  const [molB,         setMolB]         = useState<MoleculaComparavel | null>(null);
  const [viewMode,     setViewMode]     = useState<ViewMode>('cards');
  const [modoComp,     setModoComp]     = useState<ModoComparacao>('molecula');
  const [activeCateg,  setActiveCateg]  = useState<CategoriaComparacao | 'todas'>('todas');

  const scores = useMemo(() => {
    if (!molA || !molB) return [];
    return gerarComparativo(molA, molB);
  }, [molA, molB]);

  const categorias = ['todas', ...new Set(MOLECULES_DB.map(m => m.categoria))] as (CategoriaComparacao | 'todas')[];

  const moleculasFiltradas = useMemo(() => {
    if (activeCateg === 'todas') return MOLECULES_DB;
    return MOLECULES_DB.filter(m => m.categoria === activeCateg);
  }, [activeCateg]);

  const handleMolClick = (m: MoleculaComparavel) => {
    if (!molA) { setMolA(m); return; }
    if (!molB && m.id !== molA.id) { setMolB(m); }
  };

  const loadPair = (aId: string, bId: string) => {
    const a = MOLECULES_DB.find(m => m.id === aId);
    const b = MOLECULES_DB.find(m => m.id === bId);
    if (a) setMolA(a);
    if (b) setMolB(b);
  };

  const hasComparison = !!(molA && molB && scores.length > 0);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-black text-slate-900 dark:text-white">Therapeutic Comparison Engine</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Comparação baseada em evidências · Molécula · Marca · Classe terapêutica
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasComparison && (
              <>
                {/* View mode */}
                <div className="flex gap-1 p-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  {([['cards', LayoutGrid, 'Cards'], ['tabela', Table2, 'Tabela'], ['radar', BarChart3, 'Radar']] as [ViewMode, React.ElementType, string][]).map(([mode, Icon, label]) => (
                    <button key={mode} onClick={() => setViewMode(mode)}
                      className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                        viewMode === mode ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />{label}
                    </button>
                  ))}
                </div>
                <button onClick={() => { setMolA(null); setMolB(null); }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />Limpar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Modo tabs */}
        <div className="flex gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
          {([['molecula', 'Molécula / Marca', FlaskConical], ['classe', 'Classe Terapêutica', Layers]] as [ModoComparacao, string, React.ElementType][]).map(([modo, label, Icon]) => (
            <button key={modo} onClick={() => setModoComp(modo)}
              className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                modoComp === modo ? 'bg-blue-600 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              )}
            >
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 dark:text-blue-300">
            <strong>Suporte à decisão clínica.</strong> Dados baseados em diretrizes SBC, ADA, ESC, KDIGO, GINA (2023–2025).
            Scores são estimativas comparativas — a decisão terapêutica final é sempre do médico.
            A hierarquia clínica obrigatória: <strong>Diretriz → Classe → Molécula → Marca</strong>.
          </p>
        </div>

        {/* ── MODO CLASSE ── */}
        {modoComp === 'classe' && <ClasseComparacao />}

        {/* ── MODO MOLÉCULA / MARCA ── */}
        {modoComp === 'molecula' && (
          <>
            {/* Quick pairs */}
            {!molA && !molB && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Comparações rápidas</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PAIRS.map(pair => (
                    <button key={pair.label} onClick={() => loadPair(pair.aId, pair.bId)}
                      className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 transition-all"
                    >
                      <Scale className="w-3 h-3 text-slate-400" />
                      <span>{pair.label}</span>
                      <span className="text-slate-400 font-normal">· {pair.desc}</span>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MoleculeSelector label="Molécula / Marca A" side="A" selected={molA} onSelect={setMolA} onClear={() => setMolA(null)} otherSelected={molB} />
              <MoleculeSelector label="Molécula / Marca B" side="B" selected={molB} onSelect={setMolB} onClear={() => setMolB(null)} otherSelected={molA} />
            </div>

            {/* Comparison result */}
            {hasComparison && (
              <div className="space-y-5">
                {viewMode === 'cards' && <CardsView a={molA!} b={molB!} scores={scores} />}
                {viewMode === 'radar' && <RadarSVG scores={scores} nomeA={molA!.molecula} nomeB={molB!.molecula} />}
                {viewMode === 'tabela' && (
                  <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
                    <RadarSVG scores={scores} nomeA={molA!.molecula} nomeB={molB!.molecula} />
                    <TabelaComparativa a={molA!} b={molB!} scores={scores} />
                  </div>
                )}
              </div>
            )}

            {/* One selected */}
            {(molA || molB) && !(molA && molB) && (
              <div className="text-center py-10 text-slate-400">
                <Scale className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Selecione a {molA ? 'molécula B' : 'molécula A'} para iniciar a comparação.</p>
              </div>
            )}

            {/* Catalog */}
            {!molA && !molB && (
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {categorias.map(cat => (
                    <button key={cat} onClick={() => setActiveCateg(cat)}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                        activeCateg === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                      )}
                    >
                      {cat === 'todas' ? 'Todas' : CATEGORIA_LABEL[cat as CategoriaComparacao]}
                    </button>
                  ))}
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">{moleculasFiltradas.length} moléculas disponíveis</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {moleculasFiltradas.map(m => (
                    <button key={m.id} onClick={() => handleMolClick(m)}
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
                          <span className="text-[8px] text-slate-400">· {m.marcas.filter(mk => mk.destaque).map(mk => mk.nome).join(', ')}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
