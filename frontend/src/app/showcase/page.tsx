'use client';

import { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Building2, Package, FlaskConical, BookOpen, FileText, Users, Stethoscope,
  ClipboardList, CheckCircle2, TrendingUp, ChevronDown, ChevronUp,
  ExternalLink, Star, Award, BarChart3, Activity, Layers, Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LABORATORIOS,
  LaboratorioProfile,
  MarcaLab,
  CenarioClinico,
  STATUS_MARCA_META,
  NIVEL_EV_META,
  AREA_LAB_LABEL,
  AREA_LAB_COR,
  getUniqueEspecialidades,
  getTotalPrescricoesMes,
  AreaEspecialidade,
} from '@/lib/lab-showcase';

// ─── KPI card ───────────────────────────────────────────────

function KpiCard({ icon: Icon, label, valor, sub, cor }: {
  icon: React.ElementType;
  label: string;
  valor: string;
  sub: string;
  cor: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
    blue:    { bg: 'bg-blue-50   dark:bg-blue-900/20',   text: 'text-blue-600   dark:text-blue-400',   ring: 'ring-blue-200   dark:ring-blue-800' },
    indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', ring: 'ring-indigo-200 dark:ring-indigo-800' },
    purple:  { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-200 dark:ring-purple-800' },
    teal:    { bg: 'bg-teal-50   dark:bg-teal-900/20',   text: 'text-teal-600   dark:text-teal-400',   ring: 'ring-teal-200   dark:ring-teal-800' },
    green:   { bg: 'bg-green-50  dark:bg-green-900/20',  text: 'text-green-600  dark:text-green-400',  ring: 'ring-green-200  dark:ring-green-800' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800' },
    amber:   { bg: 'bg-amber-50  dark:bg-amber-900/20',  text: 'text-amber-600  dark:text-amber-400',  ring: 'ring-amber-200  dark:ring-amber-800' },
    rose:    { bg: 'bg-rose-50   dark:bg-rose-900/20',   text: 'text-rose-600   dark:text-rose-400',   ring: 'ring-rose-200   dark:ring-rose-800' },
  };
  const c = colorMap[cor] ?? colorMap.blue;
  return (
    <div className={cn('rounded-xl p-4 ring-1 flex flex-col gap-3', c.bg, c.ring)}>
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', 'bg-white/80 dark:bg-slate-900/50 ring-1', c.ring)}>
        <Icon className={cn('w-4.5 h-4.5', c.text)} />
      </div>
      <div>
        <p className={cn('text-2xl font-black leading-none', c.text)}>{valor}</p>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1">{label}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

// ─── Marca card ──────────────────────────────────────────────

function MarcaCard({ marca }: { marca: MarcaLab }) {
  const [expanded, setExpanded] = useState(false);
  const st = STATUS_MARCA_META[marca.status];
  const nv = NIVEL_EV_META[marca.nivel_evidencia];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Pill icon */}
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <Package className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{marca.nome_comercial}</h3>
            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', st.cls)}>
              <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1', st.dot)} />
              {st.label}
            </span>
            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', nv.cls)}>
              Nível {marca.nivel_evidencia}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{marca.molecula}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{marca.classe_farmacologica}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {marca.especialidades.map(e => (
              <span key={e} className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded-full', AREA_LAB_COR[e])}>
                {AREA_LAB_LABEL[e]}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1">
            <FileText className="w-3 h-3 text-green-500" />
            <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Bula {marca.bula}</span>
          </div>
          {marca.prescricoes_mes_estimadas && (
            <p className="text-[10px] text-slate-400">
              ~{(marca.prescricoes_mes_estimadas / 1000).toFixed(0)}k rx/mês
            </p>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 mt-1" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 pb-4 pt-3 space-y-3">
          {marca.destaque && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium italic">"{marca.destaque}"</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Concentrações</p>
              <ul className="space-y-0.5">
                {marca.concentracoes.map(c => <li key={c} className="text-slate-700 dark:text-slate-300">• {c}</li>)}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Formas farmacêuticas</p>
              <ul className="space-y-0.5">
                {marca.formas_farmaceuticas.map(f => <li key={f} className="text-slate-700 dark:text-slate-300">• {f}</li>)}
              </ul>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Indicações</p>
            <ul className="space-y-0.5">
              {marca.indicacoes.map(ind => (
                <li key={ind} className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  {ind}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Diretrizes</p>
              <ul className="space-y-0.5">
                {marca.diretrizes_associadas.map(d => (
                  <li key={d} className="flex items-start gap-1 text-slate-600 dark:text-slate-400">
                    <BookOpen className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" /> {d}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Estudos chave</p>
              <ul className="space-y-0.5">
                {marca.estudos_chave.map(e => (
                  <li key={e} className="flex items-start gap-1 text-slate-600 dark:text-slate-400">
                    <FlaskConical className="w-3 h-3 text-purple-500 mt-0.5 flex-shrink-0" /> {e}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {marca.registro_anvisa && (
            <p className="text-[10px] text-slate-400">Registro Anvisa: {marca.registro_anvisa}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Cenário card ────────────────────────────────────────────

function CenarioCard({ cenario }: { cenario: CenarioClinico }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-2xl leading-none">{cenario.icone}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">{cenario.titulo}</h3>
            <span className="text-[9px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{cenario.cid10}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{cenario.perfil_paciente}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
              <Activity className="w-3 h-3" /> {cenario.tempo_decisao_estimado}
            </span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />}
      </div>

      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-3">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Desafio clínico</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">{cenario.desafio_clinico}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Como o PRESCREVE-AI resolve</p>
            <ul className="space-y-1.5">
              {cenario.solucao_prescrevai.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="w-4 h-4 bg-blue-600 text-white rounded-full text-[9px] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
            <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase mb-0.5">Desfecho esperado</p>
            <p className="text-xs text-emerald-800 dark:text-emerald-200">{cenario.desfecho_esperado}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Hero do laboratório ──────────────────────────────────────

function LabHero({ lab }: { lab: LaboratorioProfile }) {
  const especialidades = getUniqueEspecialidades(lab);
  const totalRxMes = getTotalPrescricoesMes(lab);
  const totalMoleculas = new Set(lab.marcas.map(m => m.molecula)).size;

  const checks = [
    { label: 'Marcas',            ok: lab.marcas.length > 0 },
    { label: 'Moléculas',         ok: totalMoleculas > 0 },
    { label: 'Especialidades',    ok: especialidades.length > 0 },
    { label: 'Diretrizes',        ok: lab.marcas.some(m => m.diretrizes_associadas.length > 0) },
    { label: 'Bulas profissionais', ok: lab.marcas.some(m => m.bula === 'profissional' || m.bula === 'ambas') },
    { label: 'Bulas pacientes',   ok: lab.marcas.some(m => m.bula === 'paciente' || m.bula === 'ambas') },
  ];

  return (
    <div className={cn('rounded-2xl overflow-hidden bg-gradient-to-br text-white shadow-xl', lab.cor_gradient)}>
      <div className="p-6 lg:p-8">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0 ring-2 ring-white/30">
            <span className="text-2xl font-black text-white">{lab.initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black">{lab.nome}</h1>
              <span className="text-xs bg-white/20 backdrop-blur px-2 py-0.5 rounded-full">{lab.tagline}</span>
            </div>
            <p className="text-sm text-white/80 mt-1">{lab.sede} · Fundado em {lab.fundacao}</p>
            <p className="text-sm text-white/90 mt-2 max-w-2xl">{lab.descricao}</p>
          </div>
        </div>

        {/* Check grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-6">
          {checks.map(ch => (
            <div key={ch.label} className="flex flex-col items-center gap-1.5 bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center', ch.ok ? 'bg-white/30' : 'bg-white/10')}>
                {ch.ok
                  ? <CheckCircle2 className="w-4 h-4 text-white" />
                  : <span className="w-4 h-4 rounded-full bg-white/20" />
                }
              </div>
              <p className="text-[10px] font-medium text-white/90 leading-tight">{ch.label}</p>
            </div>
          ))}
        </div>

        {/* Segmentos */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {lab.segmentos.map(s => (
            <span key={s} className="text-[10px] bg-white/15 backdrop-blur px-2 py-0.5 rounded-full text-white/90">{s}</span>
          ))}
        </div>
      </div>

      {/* Bottom stats strip */}
      <div className="bg-black/20 backdrop-blur px-6 py-3 grid grid-cols-4 divide-x divide-white/20">
        {[
          { label: 'Marcas integradas',  val: lab.marcas.length.toString() },
          { label: 'Moléculas',          val: totalMoleculas.toString() },
          { label: 'Especialidades',     val: especialidades.length.toString() },
          { label: 'Rx/mês estimados',   val: totalRxMes >= 1000 ? `${(totalRxMes / 1000).toFixed(0)}k` : totalRxMes.toString() },
        ].map(s => (
          <div key={s.label} className="px-4 first:pl-0">
            <p className="text-xl font-black text-white">{s.val}</p>
            <p className="text-[10px] text-white/70">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Proposta de valor ───────────────────────────────────────

function PropostaValor({ lab }: { lab: LaboratorioProfile }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-amber-500" />
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Proposta de valor — PRESCREVE-AI × {lab.nome_curto}</h3>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{lab.proposta_valor}</p>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {lab.diferenciais.map((d, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
            <Award className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Painel de métricas (exec) ───────────────────────────────

function ExecutiveMetrics({ lab }: { lab: LaboratorioProfile }) {
  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="w-5 h-5 text-blue-400" />
        <h3 className="font-black text-sm text-white">Métricas de impacto — {lab.nome_curto}</h3>
        <span className="ml-auto text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">Estimado 2025</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {lab.metricas.map(m => (
          <div key={m.label} className="space-y-1">
            <p className="text-2xl font-black text-white">{m.valor}</p>
            <p className="text-xs text-slate-300 leading-tight">{m.label}</p>
            <p className="text-[10px] text-slate-500">{m.sub}</p>
            {m.tendencia && (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-400 bg-emerald-900/30 px-1.5 py-0.5 rounded-full">
                <TrendingUp className="w-2.5 h-2.5" /> {m.tendencia}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Cobertura de especialidades ─────────────────────────────

function EspecialidadesPanel({ lab }: { lab: LaboratorioProfile }) {
  const especialidades = getUniqueEspecialidades(lab);
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Stethoscope className="w-4 h-4 text-teal-500" />
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Especialidades cobertas</h3>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {especialidades.map(e => (
          <span key={e} className={cn('text-xs font-medium px-2.5 py-1 rounded-full', AREA_LAB_COR[e as AreaEspecialidade])}>
            {AREA_LAB_LABEL[e as AreaEspecialidade]}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Disclaimer ──────────────────────────────────────────────

function Disclaimer() {
  return (
    <div className="mt-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-300">
      <p className="font-bold mb-0.5">Aviso institucional</p>
      <p>Este módulo é exclusivo para apresentação institucional à indústria farmacêutica. As métricas de prescrição são estimativas de mercado baseadas em dados públicos do setor. A inclusão de uma marca no sistema não implica endosso — a recomendação clínica é gerada exclusivamente pela evidência científica (Diretriz → Classe terapêutica → Molécula → Marcas comerciais). A escolha da marca <strong>nunca</strong> influencia a recomendação baseada em evidências.</p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────

export default function ShowcasePage() {
  const [activeLabId, setActiveLabId] = useState<string>('eurofarma');
  const [activeTab, setActiveTab] = useState<'portfolio' | 'cenarios' | 'metricas'>('portfolio');

  const lab = useMemo(
    () => LABORATORIOS.find(l => l.id === activeLabId) ?? LABORATORIOS[0],
    [activeLabId]
  );

  const tabs: { id: typeof activeTab; label: string; icon: React.ElementType }[] = [
    { id: 'portfolio', label: 'Portfólio de marcas', icon: Package },
    { id: 'cenarios',  label: 'Cenários clínicos',   icon: ClipboardList },
    { id: 'metricas',  label: 'Métricas de impacto', icon: BarChart3 },
  ];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-black text-slate-900 dark:text-white">Laboratory Showcase</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Apresentação institucional · Indústria farmacêutica</p>
          </div>
          {/* Disclaimer badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-full">
            <Layers className="w-3 h-3" />
            Suporte à decisão clínica
          </div>
        </div>

        {/* Lab selector */}
        <div className="flex gap-2 flex-wrap">
          {LABORATORIOS.map(l => (
            <button
              key={l.id}
              onClick={() => setActiveLabId(l.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border',
                activeLabId === l.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-300'
              )}
            >
              <span className={cn(
                'w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black',
                activeLabId === l.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              )}>
                {l.initials}
              </span>
              {l.nome_curto}
              {l.id === 'eurofarma' && (
                <span className="text-[8px] bg-green-500 text-white px-1 py-0.5 rounded-full">ATIVO</span>
              )}
            </button>
          ))}
        </div>

        {/* Hero */}
        <LabHero lab={lab} />

        {/* Proposta de valor */}
        <PropostaValor lab={lab} />

        {/* Especialidades */}
        <EspecialidadesPanel lab={lab} />

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800 flex gap-0">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors -mb-px',
                  activeTab === t.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'portfolio' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {lab.marcas.length} marcas · {new Set(lab.marcas.map(m => m.molecula)).size} moléculas
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <Globe className="w-3 h-3" />
                Todos os níveis de evidência: A/B/C
              </div>
            </div>
            {lab.marcas.map(m => <MarcaCard key={m.id} marca={m} />)}
          </div>
        )}

        {activeTab === 'cenarios' && (
          <div className="space-y-3">
            {lab.cenarios.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Cenários em desenvolvimento para este laboratório.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Fluxos clínicos mapeados onde os produtos {lab.nome_curto} aparecem no PRESCREVE-AI.
                </p>
                {lab.cenarios.map(c => <CenarioCard key={c.id} cenario={c} />)}
              </>
            )}
          </div>
        )}

        {activeTab === 'metricas' && (
          <div className="space-y-4">
            <ExecutiveMetrics lab={lab} />
            {/* Tabela de marcas × especialidades */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Mapa marca × especialidade × bula</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400">Marca</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-400">Molécula</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-400">Especialidades</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-400">Nível</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-400">Bula prof.</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-400">Bula pac.</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400">Rx/mês</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {lab.marcas.map(m => {
                      const nv = NIVEL_EV_META[m.nivel_evidencia];
                      const bulaProfok = m.bula === 'profissional' || m.bula === 'ambas';
                      const bulaPacok  = m.bula === 'paciente'     || m.bula === 'ambas';
                      return (
                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{m.nome_comercial}</td>
                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 max-w-[160px] truncate">{m.molecula}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-0.5">
                              {m.especialidades.map(e => (
                                <span key={e} className={cn('text-[9px] px-1 py-0.5 rounded-full font-medium', AREA_LAB_COR[e])}>
                                  {AREA_LAB_LABEL[e].substring(0, 5)}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', nv.cls)}>
                              {m.nivel_evidencia}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {bulaProfok
                              ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                              : <span className="text-slate-300 dark:text-slate-600">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {bulaPacok
                              ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                              : <span className="text-slate-300 dark:text-slate-600">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {m.prescricoes_mes_estimadas
                              ? `~${(m.prescricoes_mes_estimadas / 1000).toFixed(0)}k`
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <Disclaimer />
      </div>
    </AppShell>
  );
}
