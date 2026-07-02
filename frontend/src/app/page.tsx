'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/store';
import { ClientDate } from '@/components/ui/client-date';
import {
  FilePlus2, Users, FileText, AlertTriangle, BookOpen, Clock, CheckCircle2,
  Activity, ChevronRight, Stethoscope, TrendingUp, Shield, Sparkles,
  Building2, Award, Zap, Calculator, ClipboardList, GitBranch, FlaskConical,
  Brain, ArrowUpRight, Circle,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ─── Meta ────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  anamnese: 'Anamnese', diagnostico: 'Diagnóstico',
  terapeutico: 'Terapêutico', prescricao: 'Prescrição', concluida: 'Concluída',
};

const STATUS_DOT: Record<string, string> = {
  anamnese: 'bg-yellow-400', diagnostico: 'bg-blue-500',
  terapeutico: 'bg-purple-500', prescricao: 'bg-orange-500', concluida: 'bg-green-500',
};

const STATUS_CARD: Record<string, string> = {
  anamnese:    'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
  diagnostico: 'bg-blue-50   dark:bg-blue-900/20   text-blue-700   dark:text-blue-400',
  terapeutico: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
  prescricao:  'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
  concluida:   'bg-green-50  dark:bg-green-900/20  text-green-700  dark:text-green-400',
};

// ─── Page ────────────────────────────────────────────────────

export default function Dashboard() {
  const { state } = useApp();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite');
  }, []);

  const total       = state.consultations.length;
  const concluidas  = state.consultations.filter(c => c.status === 'concluida').length;
  const emAndamento = total - concluidas;
  const prescricoes = state.consultations.filter(c => c.prescricao).length;
  const pct         = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* ── Hero header ──────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {greeting}, {state.settings.medico.nome.split(' ')[0]} 👋
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              PRESCREVE-AI · Apoio Clínico Baseado em Evidências
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href="/demo"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Demo
            </Link>
            <Link
              href="/consulta/nova"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-sm"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              Nova Consulta
            </Link>
          </div>
        </div>

        {/* ── KPIs ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Consultas"
            value={total}
            sub="registradas"
            icon={Users}
            color="blue"
            trend={null}
          />
          <KpiCard
            label="Concluídas"
            value={concluidas}
            sub={`${pct}% do total`}
            icon={CheckCircle2}
            color="green"
            trend={pct}
          />
          <KpiCard
            label="Em andamento"
            value={emAndamento}
            sub="aguardando"
            icon={Activity}
            color="amber"
            trend={null}
          />
          <KpiCard
            label="Prescrições"
            value={prescricoes}
            sub="emitidas"
            icon={FileText}
            color="purple"
            trend={null}
          />
        </div>

        {/* ── Body: 3 colunas ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Col esq: Consultas recentes + Fluxo clínico */}
          <div className="lg:col-span-2 space-y-5">

            {/* Consultas recentes */}
            <Section
              title="Consultas Recentes"
              action={{ label: 'Ver todas', href: '/historico' }}
            >
              {state.consultations.length === 0 ? (
                <EmptyState
                  icon={Stethoscope}
                  label="Nenhuma consulta ainda"
                  action={{ label: 'Iniciar primeira consulta', href: '/consulta/nova' }}
                />
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                  {state.consultations.slice(0, 6).map(c => (
                    <div key={c.id} className="flex items-center gap-3 py-2.5 px-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                        {c.paciente_nome.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{c.paciente_nome}</p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          <ClientDate date={c.data} />
                          {c.diagnostico_selecionado && (
                            <span className="hidden sm:block truncate max-w-32">· {c.diagnostico_selecionado.split('(')[0].trim()}</span>
                          )}
                        </div>
                      </div>
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1', STATUS_CARD[c.status])}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[c.status])} />
                        {STATUS_LABELS[c.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Fluxo clínico — acesso em < 3 cliques */}
            <Section title="Fluxo Clínico — Acesso Rápido">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { href: '/consulta/nova',     icon: Stethoscope, label: 'Nova Consulta',     sub: 'Iniciar atendimento',     color: 'blue'   },
                  { href: '/prescricao-rapida', icon: Zap,         label: 'Prescrição Rápida', sub: 'Receita imediata',        color: 'indigo' },
                  { href: '/calculadoras',      icon: Calculator,  label: 'Calculadoras',      sub: 'Scores validados',        color: 'purple' },
                  { href: '/protocolos',        icon: ClipboardList,label:'Protocolos',         sub: 'HAS, DM2, asma…',        color: 'teal'   },
                  { href: '/timeline',          icon: GitBranch,   label: 'Timeline',          sub: 'Evolução do paciente',    color: 'cyan'   },
                  { href: '/atualizacoes',      icon: TrendingUp,  label: 'Guideline Updates', sub: 'ESC, ADA, GOLD, KDIGO',  color: 'emerald'},
                ].map(({ href, icon: Icon, label, sub, color }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-sm transition-all"
                  >
                    <div className={`w-8 h-8 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 text-${color}-600 dark:text-${color}-400`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
                    </div>
                    <ArrowUpRight className="w-3 h-3 text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-0.5" />
                  </Link>
                ))}
              </div>
            </Section>
          </div>

          {/* Col dir: Painel executivo + base científica */}
          <div className="space-y-5">

            {/* Executive panel */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border border-slate-700 p-4 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <p className="text-xs font-bold text-white">Métricas Executivas</p>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { icon: FlaskConical, label: 'Moléculas',    value: '24+', color: 'text-purple-400' },
                  { icon: BookOpen,     label: 'Diretrizes',   value: '6',   color: 'text-blue-400'   },
                  { icon: Brain,        label: 'Scores CDS',   value: '12',  color: 'text-green-400'  },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="text-center p-2 rounded-xl bg-white/5">
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                    <p className="text-lg font-black text-white">{value}</p>
                    <p className="text-[10px] text-slate-400">{label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-slate-700 pt-3">
                {[
                  { label: 'Tempo médio por consulta',  value: '4,2 min',         color: 'text-emerald-400' },
                  { label: 'Economia vs. método manual', value: '8,5 min/consulta', color: 'text-blue-400'    },
                  { label: 'Alertas de segurança',      value: '100% validados',  color: 'text-green-400'   },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-400">{label}</p>
                    <p className={`text-xs font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Base científica */}
            <Section title="Base Científica" action={{ label: 'Ver atualizações', href: '/atualizacoes' }}>
              <div className="space-y-2">
                {[
                  { sigla: 'ESC 2025',   area: 'IC / Cardiologia',    status: 'Vigente',    dot: 'bg-green-500'  },
                  { sigla: 'ADA 2026',   area: 'DM2 / Endocrinologia',status: 'Vigente',    dot: 'bg-green-500'  },
                  { sigla: 'GOLD 2026',  area: 'DPOC / Pneumologia',  status: 'Vigente',    dot: 'bg-green-500'  },
                  { sigla: 'KDIGO 2025', area: 'DRC / Nefrologia',    status: 'Vigente',    dot: 'bg-green-500'  },
                  { sigla: 'GINA 2025',  area: 'Asma / Pneumologia',  status: 'Em revisão', dot: 'bg-amber-400'  },
                  { sigla: 'DBHA-7',     area: 'HAS / Cardiologia',   status: 'Vigente',    dot: 'bg-green-500'  },
                ].map(({ sigla, area, status, dot }) => (
                  <div key={sigla} className="flex items-center gap-3 py-1.5">
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', dot)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{sigla}</p>
                      <p className="text-[10px] text-slate-400 truncate">{area}</p>
                    </div>
                    <span className={cn(
                      'text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0',
                      status === 'Vigente' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    )}>
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">Apoio à Decisão Clínica</p>
                <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                  Não substitui o médico. Diagnóstico e prescrição são responsabilidade exclusiva do profissional.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color, trend }: {
  label: string; value: number; sub: string;
  icon: React.ElementType; color: string; trend: number | null;
}) {
  const cfg = {
    blue:   { bg: 'bg-blue-50   dark:bg-blue-900/20',   icon: 'text-blue-600   dark:text-blue-400',   text: 'text-blue-600'   },
    green:  { bg: 'bg-green-50  dark:bg-green-900/20',  icon: 'text-green-600  dark:text-green-400',  text: 'text-green-600'  },
    amber:  { bg: 'bg-amber-50  dark:bg-amber-900/20',  icon: 'text-amber-600  dark:text-amber-400',  text: 'text-amber-600'  },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400', text: 'text-purple-600' },
  }[color] ?? { bg: '', icon: '', text: '' };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg)}>
        <Icon className={cn('w-5 h-5', cfg.icon)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{value}</p>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5">{label}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-600">{sub}</p>
      </div>
      {trend !== null && trend > 0 && (
        <div className={cn('text-xs font-bold flex-shrink-0', cfg.text)}>{trend}%</div>
      )}
    </div>
  );
}

function Section({ title, action, children }: {
  title: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
        {action && (
          <Link href={action.href} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
            {action.label} <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function EmptyState({ icon: Icon, label, action }: {
  icon: React.ElementType; label: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="text-center py-8">
      <Icon className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
      <p className="text-sm text-slate-400 dark:text-slate-600">{label}</p>
      {action && (
        <Link href={action.href} className="inline-flex items-center gap-1 mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline">
          <FilePlus2 className="w-3 h-3" /> {action.label}
        </Link>
      )}
    </div>
  );
}
