'use client';

import { useState } from 'react';
import {
  Building2, Package, FlaskConical, BookOpen, FileText, Users,
  Stethoscope, ClipboardList, CheckCircle, TrendingUp, Award,
  BarChart3, Activity, ArrowRight, Globe, Star, Shield,
  Zap, Brain, Heart, Pill, ChevronRight, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LABORATORIOS } from '@/lib/lab-showcase';
import { BIBLIOTECA_FARMACEUTICA } from '@/lib/pharma-library';

// ─── Static aggregate data (computed from full catalog) ──────────────────────

const LAB = LABORATORIOS.find(l => l.id === 'eurofarma')!;

const TOTAL_MARCAS       = BIBLIOTECA_FARMACEUTICA.filter(p => p.laboratorio_id === 'eurofarma').length;
const TOTAL_MOLECULAS    = new Set(BIBLIOTECA_FARMACEUTICA.filter(p => p.laboratorio_id === 'eurofarma').map(p => p.molecula.toLowerCase().split(' ')[0])).size;
const TOTAL_BULAS        = BIBLIOTECA_FARMACEUTICA.filter(p => p.laboratorio_id === 'eurofarma').length * 2;
const PRESCRICOES_MES    = LAB.marcas.reduce((s, m) => s + (m.prescricoes_mes_estimadas ?? 0), 0);
const TOTAL_CENARIOS     = LAB.cenarios.length;

// ─── Chart data ───────────────────────────────────────────────────────────────

const ESPECIALIDADES_DATA = [
  { label: 'Psiquiatria',        valor: 11, cor: '#8B5CF6' },
  { label: 'Cardiologia',        valor: 10, cor: '#EF4444' },
  { label: 'Neurologia',         valor: 8,  cor: '#6366F1' },
  { label: 'Infectologia',       valor: 5,  cor: '#F97316' },
  { label: 'Pneumologia',        valor: 5,  cor: '#0EA5E9' },
  { label: 'Endocrinologia',     valor: 5,  cor: '#A855F7' },
  { label: 'Analgesia/Reuma.',   valor: 4,  cor: '#10B981' },
  { label: 'Gastroenterologia',  valor: 2,  cor: '#F59E0B' },
  { label: 'Ginecologia',        valor: 2,  cor: '#EC4899' },
  { label: 'Nefrologia',         valor: 1,  cor: '#14B8A6' },
];

const CLASSES_DATA = [
  { label: 'Antidepressivos / SNC',     valor: 10, cor: '#8B5CF6' },
  { label: 'BRA / Cardiovascular',       valor: 7,  cor: '#EF4444' },
  { label: 'Antibióticos',              valor: 5,  cor: '#F97316' },
  { label: 'ICS / LABA / ARLT',        valor: 5,  cor: '#0EA5E9' },
  { label: 'Corticosteroides',          valor: 4,  cor: '#F59E0B' },
  { label: 'Diuréticos',               valor: 3,  cor: '#14B8A6' },
  { label: 'Betabloqueadores',          valor: 3,  cor: '#6366F1' },
  { label: 'Antiepilépticos',           valor: 3,  cor: '#10B981' },
  { label: 'Estatinas',                 valor: 2,  cor: '#EC4899' },
  { label: 'Outros',                    valor: 10, cor: '#94A3B8' },
];

const EVIDENCIA_DATA = [
  { label: 'Nível A', sublabel: 'Múltiplos ECR', valor: 20, cor: '#10B981', pct: 38 },
  { label: 'Nível B', sublabel: 'ECR único / meta-análise', valor: 20, cor: '#3B82F6', pct: 38 },
  { label: 'Nível C', sublabel: 'Consenso / Observacional', valor: 12, cor: '#F59E0B', pct: 24 },
];

const DIRETRIZES_DATA = [
  { label: 'SBC / DBHA', valor: 8,  cor: '#EF4444' },
  { label: 'ESC / EAS',   valor: 7,  cor: '#3B82F6' },
  { label: 'ADA / SBD',   valor: 5,  cor: '#8B5CF6' },
  { label: 'GINA / SBPT', valor: 4,  cor: '#0EA5E9' },
  { label: 'KDIGO',        valor: 3,  cor: '#14B8A6' },
  { label: 'MDS / ABN',   valor: 3,  cor: '#6366F1' },
  { label: 'ESHRE / FEBRASGO', valor: 2, cor: '#EC4899' },
  { label: 'Outros',       valor: 5,  cor: '#94A3B8' },
];

// ─── Clinical use cases ───────────────────────────────────────────────────────

interface CasoUso {
  diagnostico: string;
  cid: string;
  marca: string;
  molecula: string;
  indicacao: string;
  diretriz: string;
  cor: string;
  icone: string;
  area: string;
}

const CASOS_USO: CasoUso[] = [
  { diagnostico: 'Hipertensão Arterial',        cid: 'I10',   marca: 'ZART®',       molecula: 'Losartana',        indicacao: '1ª linha BRA — HAS com DM2 e DRC',         diretriz: 'DBHA-7 SBC 2023 · Classe I-A',        cor: 'rose',   icone: '❤️',  area: 'Cardiologia' },
  { diagnostico: 'Depressão Maior',             cid: 'F32',   marca: 'DESVE®',      molecula: 'Desvenlafaxina',   indicacao: 'IRSN — remissão com perfil de efeitos favorável', diretriz: 'CFM + APA 2021 · Classe I-B',     cor: 'violet', icone: '🧠',  area: 'Psiquiatria' },
  { diagnostico: 'HAS Resistente',             cid: 'I10',   marca: 'HOLMES®',     molecula: 'Olmesartana 40mg', indicacao: 'BRA alta potência — maior redução de PA vs Losartana', diretriz: 'ESC/ESH 2023 · Classe I-A',   cor: 'red',    icone: '💊',  area: 'Cardiologia' },
  { diagnostico: 'Asma Moderada–Grave',        cid: 'J45',   marca: 'LUGANO®',     molecula: 'Fluticasona+Formoterol', indicacao: 'ICS+LABA Passo 3–5 — controle da asma', diretriz: 'GINA 2023 · Classe I-A',          cor: 'sky',    icone: '🫁',  area: 'Pneumologia' },
  { diagnostico: 'DM2 + Insuf. Cardíaca',      cid: 'E11',   marca: 'GLIF®',       molecula: 'Dapagliflozina',   indicacao: 'SGLT2 — tripla indicação DM2 · IC · DRC',  diretriz: 'ADA 2024 + ESC-HF · Classe I-A',     cor: 'purple', icone: '🩺',  area: 'Endocrinologia' },
  { diagnostico: 'Doença de Parkinson',        cid: 'G20',   marca: 'PISA® LP',    molecula: 'Pramipexol LP',    indicacao: 'Agonista dopaminérgico 1x/dia — motor inicial',  diretriz: 'MDS 2023 + ABN 2022 · Classe I-B', cor: 'indigo', icone: '🔬',  area: 'Neurologia' },
  { diagnostico: 'Endometriose',               cid: 'N80',   marca: 'PIETRA ED®',  molecula: 'Dienogeste 2mg',   indicacao: '1ª linha hormonal — redução ≥ 70% da dor',  diretriz: 'ESHRE 2022 + FEBRASGO · Classe I-A', cor: 'pink',   icone: '🌸',  area: 'Ginecologia' },
  { diagnostico: 'Dislipidemia / Alto Risco',  cid: 'E78',   marca: 'VAST®',       molecula: 'Atorvastatina',    indicacao: 'Estatina alta intensidade — LDL < 55 mg/dL', diretriz: 'SBC 2023 + ESC/EAS 2019 · Classe I-A', cor: 'amber', icone: '📊',  area: 'Cardiologia' },
  { diagnostico: 'Rinite Alérgica + Asma',     cid: 'J30',   marca: 'PIEMONTE®',   molecula: 'Montelucaste',     indicacao: 'ARLT — comorbidade rinite+asma 1 comprimido/dia', diretriz: 'ARIA 2021 + GINA · Classe IIa-B', cor: 'blue',   icone: '🌿',  area: 'Pneumologia' },
  { diagnostico: 'TDAH Adulto',                cid: 'F90',   marca: 'ATTENZE®',    molecula: 'Metilfenidato',    indicacao: '1ª linha estimulante TDAH adulto',         diretriz: 'CFM 2023 + NICE NG87 · Classe I-A',   cor: 'teal',   icone: '⚡',  area: 'Neurologia' },
  { diagnostico: 'Alzheimer Leve-Moderado',    cid: 'G30',   marca: 'DON®',        molecula: 'Donepezila',       indicacao: 'Inibidor colinesterase — manutenção cognitiva', diretriz: 'SBN + NICE 2019 · Classe I-A',     cor: 'slate',  icone: '🔮',  area: 'Neurologia' },
  { diagnostico: 'TAG / Depressão + Ansiedade',cid: 'F41',   marca: 'AFETUS®',     molecula: 'Sertralina',       indicacao: 'ISRS 1ª linha — TAG · TOC · Pânico · TEPT',diretriz: 'APA 2021 + CFM · Classe I-A',         cor: 'purple', icone: '💚',  area: 'Psiquiatria' },
  { diagnostico: 'Epilepsia Focal',            cid: 'G40',   marca: 'ANTARA®',     molecula: 'Levetiracetam',    indicacao: '1ª linha focal — adjuvante e monoterapia', diretriz: 'ILAE 2019 + ABN · Classe I-A',         cor: 'orange', icone: '⚡',  area: 'Neurologia' },
  { diagnostico: 'HAS + DRC Proteinúrica',     cid: 'I12',   marca: 'HOLMES® 40',  molecula: 'Olmesartana 40mg', indicacao: 'Nefroproteção máxima — ROADMAP trial',     diretriz: 'KDIGO 2024 · Classe I-A',              cor: 'teal',   icone: '🫀',  area: 'Nefrologia' },
  { diagnostico: 'Tabagismo / Depressão',      cid: 'F17',   marca: 'BUP XL®',     molecula: 'Bupropiona LP',    indicacao: 'NDRI — cessação tabágica + depressão',    diretriz: 'CFM + PNCT 2023 · Classe I-A',         cor: 'green',  icone: '🍃',  area: 'Psiquiatria' },
];

// ─── Tiny SVG horizontal bar chart ───────────────────────────────────────────

function BarChart({ data }: { data: { label: string; valor: number; cor: string }[] }) {
  const max = Math.max(...data.map(d => d.valor));
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 w-36 flex-shrink-0 text-right">{d.label}</span>
          <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-4 overflow-hidden">
            <div
              className="h-full rounded-full flex items-center pl-2 transition-all"
              style={{ width: `${(d.valor / max) * 100}%`, backgroundColor: d.cor }}
            >
              <span className="text-[9px] font-bold text-white/90 select-none">{d.valor}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── SVG Donut ────────────────────────────────────────────────────────────────

function DonutChart({ data }: { data: { label: string; sublabel: string; valor: number; cor: string; pct: number }[] }) {
  const r = 60;
  const cx = 80;
  const cy = 80;
  const stroke = 20;
  const C = 2 * Math.PI * r;

  let offset = 0;
  const slices = data.map(d => {
    const len = (d.pct / 100) * C;
    const s = { ...d, offset, len };
    offset += len + 2;
    return s;
  });

  return (
    <div className="flex items-center gap-6">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {slices.map((s, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.cor}
            strokeWidth={stroke}
            strokeDasharray={`${s.len} ${C}`}
            strokeDashoffset={-s.offset}
            transform="rotate(-90, 80, 80)"
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="bold" fill="currentColor" className="fill-slate-800 dark:fill-slate-100">52</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="currentColor" className="fill-slate-500">produtos</text>
      </svg>
      <div className="space-y-2.5 flex-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: d.cor }} />
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{d.label} <span className="font-normal text-slate-500">({d.valor})</span></p>
              <p className="text-[10px] text-slate-400">{d.sublabel}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KPI_COLORS: Record<string, { bg: string; icon: string; badge: string }> = {
  blue:    { bg: 'from-blue-600 to-blue-700',   icon: 'text-blue-100',   badge: 'bg-blue-500/20 text-blue-200' },
  rose:    { bg: 'from-rose-600 to-rose-700',   icon: 'text-rose-100',   badge: 'bg-rose-500/20 text-rose-200' },
  indigo:  { bg: 'from-indigo-600 to-indigo-700', icon: 'text-indigo-100', badge: 'bg-indigo-500/20 text-indigo-200' },
  violet:  { bg: 'from-violet-600 to-violet-700', icon: 'text-violet-100', badge: 'bg-violet-500/20 text-violet-200' },
  emerald: { bg: 'from-emerald-600 to-emerald-700', icon: 'text-emerald-100', badge: 'bg-emerald-500/20 text-emerald-200' },
  amber:   { bg: 'from-amber-500 to-amber-700', icon: 'text-amber-100',  badge: 'bg-amber-500/20 text-amber-200' },
  teal:    { bg: 'from-teal-600 to-teal-700',   icon: 'text-teal-100',   badge: 'bg-teal-500/20 text-teal-200' },
  purple:  { bg: 'from-purple-600 to-purple-700', icon: 'text-purple-100', badge: 'bg-purple-500/20 text-purple-200' },
};

function KpiCard({ icon: Icon, label, valor, badge, cor }: {
  icon: React.ElementType; label: string; valor: string; badge: string; cor: string;
}) {
  const c = KPI_COLORS[cor] ?? KPI_COLORS.blue;
  return (
    <div className={cn('rounded-2xl p-5 bg-gradient-to-br text-white shadow-lg', c.bg)}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-white/15')}>
          <Icon className={cn('w-5 h-5', c.icon)} />
        </div>
        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', c.badge)}>{badge}</span>
      </div>
      <p className="text-3xl font-black leading-none mb-1">{valor}</p>
      <p className="text-sm text-white/80 font-medium">{label}</p>
    </div>
  );
}

// ─── Area Filter Tab ──────────────────────────────────────────────────────────

const AREAS_FILTER = ['Todas', 'Cardiologia', 'Psiquiatria', 'Neurologia', 'Pneumologia', 'Endocrinologia', 'Ginecologia', 'Nefrologia'];

const AREA_COLORS: Record<string, string> = {
  'Cardiologia':    'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  'Psiquiatria':    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  'Neurologia':     'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Pneumologia':    'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  'Endocrinologia': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Ginecologia':    'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'Nefrologia':     'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  'Infectologia':   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const COR_MAP: Record<string, string> = {
  rose:    'bg-rose-100 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800',
  violet:  'bg-violet-100 border-violet-200 dark:bg-violet-900/20 dark:border-violet-800',
  red:     'bg-red-100 border-red-200 dark:bg-red-900/20 dark:border-red-800',
  sky:     'bg-sky-100 border-sky-200 dark:bg-sky-900/20 dark:border-sky-800',
  purple:  'bg-purple-100 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800',
  indigo:  'bg-indigo-100 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800',
  pink:    'bg-pink-100 border-pink-200 dark:bg-pink-900/20 dark:border-pink-800',
  amber:   'bg-amber-100 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
  blue:    'bg-blue-100 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
  teal:    'bg-teal-100 border-teal-200 dark:bg-teal-900/20 dark:border-teal-800',
  orange:  'bg-orange-100 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
  slate:   'bg-slate-100 border-slate-200 dark:bg-slate-900/20 dark:border-slate-800',
  green:   'bg-green-100 border-green-200 dark:bg-green-900/20 dark:border-green-800',
};

// ─── Caso Use Card ────────────────────────────────────────────────────────────

function CasoCard({ caso }: { caso: CasoUso }) {
  const cardCls = COR_MAP[caso.cor] ?? COR_MAP.blue;
  const areaCls = AREA_COLORS[caso.area] ?? 'bg-slate-100 text-slate-600';
  return (
    <div className={cn('rounded-2xl border p-4 flex flex-col gap-3 hover:shadow-md transition-shadow', cardCls)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{caso.icone}</span>
          <div>
            <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{caso.diagnostico}</p>
            <code className="text-[10px] text-slate-500 dark:text-slate-400">{caso.cid}</code>
          </div>
        </div>
        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0', areaCls)}>{caso.area}</span>
      </div>

      <div className="flex items-center gap-2">
        <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-base font-black text-slate-900 dark:text-white">{caso.marca}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">{caso.molecula}</p>
        </div>
      </div>

      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{caso.indicacao}</p>

      <div className="pt-1 border-t border-black/5 dark:border-white/5">
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          <span className="font-semibold">📋 </span>{caso.diretriz}
        </p>
      </div>
    </div>
  );
}

// ─── Coverage Bubble ─────────────────────────────────────────────────────────

function CoverageBubble({ label, count, cor }: { label: string; count: number; cor: string }) {
  const size = Math.max(60, Math.min(130, count * 10 + 40));
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="rounded-full flex items-center justify-center shadow-md font-black text-white text-sm transition-all hover:scale-105"
        style={{ width: size, height: size, backgroundColor: cor }}
      >
        {count}
      </div>
      <span className="text-[10px] text-slate-600 dark:text-slate-400 text-center leading-tight max-w-16">{label}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EurofarmaPage() {
  const [areaFiltro, setAreaFiltro] = useState('Todas');
  const [chartTab, setChartTab] = useState<'especialidades' | 'classes' | 'evidencias' | 'diretrizes'>('especialidades');

  const casosFiltrados = areaFiltro === 'Todas'
    ? CASOS_USO
    : CASOS_USO.filter(c => c.area === areaFiltro);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* ── Hero ────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
        {/* decorative grid */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}
        />
        {/* decorative orbs */}
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6 py-14">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xl">
                  <Building2 className="w-7 h-7 text-blue-700" />
                </div>
                <div>
                  <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-0.5">Dashboard Institucional</p>
                  <h1 className="text-3xl font-black text-white leading-tight">Eurofarma</h1>
                </div>
              </div>
              <p className="text-blue-100 text-base max-w-xl leading-relaxed mb-4">
                Maior laboratório farmacêutico 100% brasileiro — integrado ao <strong>PRESCREVE-AI</strong> com portfólio completo de marcas éticas, bulas estruturadas e protocolos clínicos baseados em evidência.
              </p>
              <div className="flex flex-wrap gap-2">
                {['São Paulo · Brasil', 'Fundada em 1991', '20+ países', '350+ produtos ANVISA', 'Saúde para Todos'].map(tag => (
                  <span key={tag} className="text-xs px-3 py-1 rounded-full bg-white/10 text-blue-100 border border-white/20">{tag}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-center">
                <p className="text-3xl font-black text-white">{TOTAL_MARCAS}</p>
                <p className="text-xs text-blue-300">marcas no sistema</p>
              </div>
              <a
                href="/farmalib"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-blue-700 text-sm font-semibold hover:bg-blue-50 transition-colors shadow"
              >
                <BookOpen className="w-4 h-4" />
                Abrir Biblioteca
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">

        {/* ── KPI Grid ────────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Indicadores de Cobertura
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard icon={Package}      label="Marcas éticas"         valor={`${TOTAL_MARCAS}`}    badge="no sistema"          cor="blue"    />
            <KpiCard icon={FlaskConical} label="Moléculas únicas"       valor={`${TOTAL_MOLECULAS}`} badge="princípios ativos"    cor="indigo"  />
            <KpiCard icon={Stethoscope}  label="Especialidades"         valor="10"                   badge="áreas terapêuticas"  cor="violet"  />
            <KpiCard icon={BookOpen}     label="Diretrizes relacionadas" valor="37"                  badge="2019–2024"           cor="purple"  />
            <KpiCard icon={FileText}     label="Bulas integradas"       valor={`${TOTAL_BULAS}`}     badge="prof. + paciente"    cor="emerald" />
            <KpiCard icon={ClipboardList}label="Protocolos suportados"  valor="13"                   badge="Clinical Reasoning"  cor="teal"    />
            <KpiCard icon={Activity}     label="Prescrições / mês"      valor={`${(PRESCRICOES_MES / 1000).toFixed(0)} mil`} badge="estimadas" cor="amber" />
            <KpiCard icon={Users}        label="Cenários clínicos"      valor={`${CASOS_USO.length}`} badge="casos mapeados"     cor="rose"    />
          </div>
        </section>

        {/* ── Charts ──────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Análise de Cobertura Farmacológica
            </h2>
            <div className="flex gap-1 p-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              {(['especialidades', 'classes', 'evidencias', 'diretrizes'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setChartTab(t)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all',
                    chartTab === t
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  )}
                >
                  {t === 'especialidades' ? 'Especialidades' : t === 'classes' ? 'Classes' : t === 'evidencias' ? 'Evidências' : 'Diretrizes'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Main chart */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              {chartTab === 'especialidades' && (
                <>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">Produtos por Especialidade</p>
                  <p className="text-xs text-slate-500 mb-4">Distribuição dos {TOTAL_MARCAS} produtos integrados</p>
                  <BarChart data={ESPECIALIDADES_DATA} />
                </>
              )}
              {chartTab === 'classes' && (
                <>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">Classes Terapêuticas</p>
                  <p className="text-xs text-slate-500 mb-4">Agrupamento farmacológico do portfólio</p>
                  <BarChart data={CLASSES_DATA} />
                </>
              )}
              {chartTab === 'evidencias' && (
                <>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">Distribuição por Nível de Evidência</p>
                  <p className="text-xs text-slate-500 mb-4">Classificação Oxford / ESC para os produtos integrados</p>
                  <DonutChart data={EVIDENCIA_DATA} />
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {EVIDENCIA_DATA.map((d, i) => (
                      <div key={i} className="p-3 rounded-xl text-center" style={{ backgroundColor: d.cor + '18' }}>
                        <p className="text-xl font-black" style={{ color: d.cor }}>{d.pct}%</p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{d.label}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {chartTab === 'diretrizes' && (
                <>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">Diretrizes Associadas por Sociedade</p>
                  <p className="text-xs text-slate-500 mb-4">Total de 37 guidelines cobrindo as indicações dos produtos</p>
                  <BarChart data={DIRETRIZES_DATA} />
                </>
              )}
            </div>

            {/* Coverage bubbles */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">Cobertura por Especialidade</p>
              <p className="text-xs text-slate-500 mb-5">Tamanho proporcional ao número de produtos disponíveis</p>
              <div className="flex flex-wrap gap-4 justify-center items-end py-2">
                {ESPECIALIDADES_DATA.map((d, i) => (
                  <CoverageBubble key={i} label={d.label} count={d.valor} cor={d.cor} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Exemplos de uso clínico ──────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Exemplos de Uso Clínico
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Diagnóstico → Produto Eurofarma · Diretriz baseada em evidência
              </p>
            </div>
            {/* Area filter */}
            <div className="flex flex-wrap gap-1.5">
              {AREAS_FILTER.map(area => (
                <button
                  key={area}
                  onClick={() => setAreaFiltro(area)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-all',
                    areaFiltro === area
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-400'
                  )}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {casosFiltrados.map((caso, i) => (
              <CasoCard key={i} caso={caso} />
            ))}
          </div>
          {casosFiltrados.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">
              Nenhum caso nessa especialidade ainda.
            </div>
          )}
        </section>

        {/* ── Diferenciais ────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Diferenciais no PRESCREVE-AI
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LAB.diferenciais.map((d, i) => (
              <div key={i} className="flex gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 dark:text-slate-300">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Proposta de valor ────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-800 via-blue-700 to-indigo-800 p-8 text-white">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}
          />
          <div className="relative max-w-3xl">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-blue-300" />
              <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Proposta de Valor</span>
            </div>
            <p className="text-xl font-bold leading-relaxed mb-6 text-white">
              {LAB.proposta_valor}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Brain, label: 'Motor de CDS', desc: 'Sugestão baseada em Diretriz → Classe → Molécula → Marca' },
                { icon: Pill,  label: 'Bulas estruturadas', desc: 'Profissional + Paciente em formato digital e PDF' },
                { icon: Heart, label: 'Evidência em destaque', desc: 'NNT, Classe e Nível exibidos no momento da prescrição' },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex gap-3 p-4 bg-white/10 rounded-2xl border border-white/10">
                    <Icon className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-white mb-0.5">{item.label}</p>
                      <p className="text-xs text-blue-200 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Footer disclaimer ─────────────────────────────────────── */}
        <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
          <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Suporte à decisão clínica.</strong> Todas as informações apresentadas são de caráter científico e regulatório, destinadas ao suporte à prescrição médica fundamentada em evidências. A recomendação clínica segue exclusivamente a hierarquia <strong>Diretriz → Classe terapêutica → Molécula → Marca comercial</strong>. A escolha da marca não altera nem influencia a evidência clínica. Prescrição de uso exclusivo por profissional habilitado.
          </p>
        </div>

      </div>
    </div>
  );
}
