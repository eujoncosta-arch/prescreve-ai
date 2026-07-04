'use client';

// ============================================================
// PRESCREVE-AI — Real World Medical Validation (Phase 16)
// Dashboard multicêntrico · Cohen's Kappa · Enterprise Score
// ============================================================

import { useState, useMemo } from 'react';
import {
  Users, Building2, FlaskConical, BarChart3, Star,
  Trophy, TrendingUp, CheckCircle2, AlertTriangle,
  Globe, Award, Target, ChevronUp, ChevronDown,
  Hospital, Stethoscope, BookOpen, ShieldCheck,
  Activity, Brain,
} from 'lucide-react';
import {
  gerarMedicalValidationReport,
  interpretarKappa,
  type MedicalValidationReport,
  type ComponenteEnterpriseScore,
  type ResumoEspecialidade,
  type ResumoInstituicao,
} from '@/lib/multicentric-validation';

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function kappaColor(k: number) {
  if (k >= 0.81) return 'text-emerald-600';
  if (k >= 0.61) return 'text-green-600';
  if (k >= 0.41) return 'text-amber-600';
  return 'text-red-600';
}

function scoreColor(s: number) {
  if (s >= 90) return 'text-emerald-600';
  if (s >= 75) return 'text-green-600';
  if (s >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function scoreBg(s: number) {
  if (s >= 90) return 'from-emerald-500 to-emerald-600';
  if (s >= 75) return 'from-green-500 to-green-600';
  if (s >= 60) return 'from-amber-400 to-amber-500';
  return 'from-red-400 to-red-500';
}

const CATEGORIA_ICON: Record<string, React.ReactNode> = {
  clinico:          <Stethoscope size={15} />,
  farmacologico:    <FlaskConical size={15} />,
  regulatorio:      <ShieldCheck size={15} />,
  cientifico:       <BookOpen size={15} />,
  aceitacao_medica: <Users size={15} />,
};

type Aba = 'overview' | 'kappa' | 'hospitais' | 'validadores' | 'casos' | 'report';

const ABAS: { id: Aba; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',    label: 'Overview',       icon: <Globe size={14} /> },
  { id: 'kappa',       label: 'Concordância',   icon: <Activity size={14} /> },
  { id: 'hospitais',   label: 'Instituições',   icon: <Building2 size={14} /> },
  { id: 'validadores', label: 'Validadores',    icon: <Users size={14} /> },
  { id: 'casos',       label: 'Casos',          icon: <FlaskConical size={14} /> },
  { id: 'report',      label: 'Enterprise Score', icon: <Star size={14} /> },
];

// ══════════════════════════════════════════════════════════════
// SUB-COMPONENTES
// ══════════════════════════════════════════════════════════════

function KappaBadge({ kappa }: { kappa: number }) {
  const interp = interpretarKappa(kappa);
  const cor = kappa >= 0.81 ? 'emerald' : kappa >= 0.61 ? 'green' : kappa >= 0.41 ? 'amber' : 'red';
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-${cor}-50 border border-${cor}-200`}>
      <span className={`text-sm font-black ${kappaColor(kappa)}`}>κ={kappa.toFixed(3)}</span>
      <span className={`text-xs text-${cor}-600`}>{interp}</span>
    </div>
  );
}

function ScoreGauge({ score, label, size = 100 }: { score: number; label: string; size?: number }) {
  const r = size * 0.36;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ * 0.75;
  const cor = score >= 90 ? '#10b981' : score >= 75 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.72}`}>
        <circle cx={size/2} cy={size*0.58} r={r} fill="none" stroke="#e5e7eb" strokeWidth={size*0.09}
          strokeDasharray={`${circ*0.75} ${circ*0.25}`} strokeDashoffset={circ*0.375}
          strokeLinecap="round" transform={`rotate(135 ${size/2} ${size*0.58})`} />
        <circle cx={size/2} cy={size*0.58} r={r} fill="none" stroke={cor} strokeWidth={size*0.09}
          strokeDasharray={`${filled} ${circ-filled}`} strokeDashoffset={circ*0.375}
          strokeLinecap="round" transform={`rotate(135 ${size/2} ${size*0.58})`} />
        <text x={size/2} y={size*0.6} textAnchor="middle" fontSize={size*0.22} fontWeight="900" fill={cor}>{score}</text>
      </svg>
      <p className="text-xs font-semibold text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function BarraProgresso({ valor, max = 100, cor = 'blue' }: { valor: number; max?: number; cor?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-${cor}-500 transition-all`} style={{ width: `${(valor/max)*100}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-600 w-8 text-right">{valor}</span>
    </div>
  );
}

// ── ABA OVERVIEW ──────────────────────────────────────────────
function AbaOverview({ r }: { r: MedicalValidationReport }) {
  return (
    <div className="space-y-5">
      {/* Métricas principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Médicos', valor: r.total_medicos, meta: 100, icon: <Users size={18} />, cor: 'blue' },
          { label: 'Hospitais', valor: r.total_hospitais, meta: 20, icon: <Hospital size={18} />, cor: 'emerald' },
          { label: 'Casos', valor: r.total_casos.toLocaleString('pt-BR'), meta: '1.000', icon: <FlaskConical size={18} />, cor: 'violet' },
          { label: 'Recomendações', valor: r.total_recomendacoes.toLocaleString('pt-BR'), meta: '10.000', icon: <BookOpen size={18} />, cor: 'amber' },
        ].map((m, i) => (
          <div key={i} className={`bg-${m.cor}-50 border border-${m.cor}-200 rounded-2xl p-4`}>
            <div className={`text-${m.cor}-600 mb-2`}>{m.icon}</div>
            <p className={`text-2xl font-black text-${m.cor}-700`}>{m.valor}</p>
            <p className={`text-xs text-${m.cor}-600 font-semibold`}>{m.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">Meta: {m.meta}</p>
          </div>
        ))}
      </div>

      {/* Kappa global */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Concordância Global — Cohen's Kappa</p>
            <KappaBadge kappa={r.kappa_global} />
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Concordância</p>
            <p className="text-2xl font-black text-gray-800">{r.concordancia_global_pct}%</p>
            <p className="text-xs text-gray-400">IC95%: {r.ic_95[0]}–{r.ic_95[1]}%</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-xs text-blue-600 font-semibold">Fleiss Kappa (N avaliadores)</p>
            <p className="text-xl font-black text-blue-700">κ={r.fleiss_kappa.toFixed(3)}</p>
            <p className="text-xs text-blue-500">{r.fleiss_interpretacao}</p>
          </div>
          <div className="bg-violet-50 rounded-xl p-3">
            <p className="text-xs text-violet-600 font-semibold">Enterprise Score</p>
            <p className="text-xl font-black text-violet-700">{r.enterprise_score}/100</p>
            <p className="text-xs text-violet-500">5 dimensões avaliadas</p>
          </div>
        </div>
      </div>

      {/* Scores */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-4">Scores por Dimensão</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <ScoreGauge score={r.score_clinico} label="Clínico" size={90} />
          <ScoreGauge score={r.score_farmacologico} label="Farmacológico" size={90} />
          <ScoreGauge score={r.score_regulatorio} label="Regulatório" size={90} />
          <ScoreGauge score={r.score_cientifico} label="Científico" size={90} />
          <ScoreGauge score={r.score_aceitacao_medica} label="Aceitação" size={90} />
        </div>
      </div>

      {/* Progresso das metas */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Progresso das Metas do Programa</p>
        <div className="space-y-3">
          {[
            { label: 'Médicos validadores (meta: 100)', val: r.total_medicos, max: 100, cor: 'blue' },
            { label: 'Hospitais participantes (meta: 20)', val: r.total_hospitais, max: 20, cor: 'emerald' },
            { label: 'Casos validados (meta: 1.000)', val: r.total_casos, max: 1000, cor: 'violet' },
            { label: 'Recomendações avaliadas (meta: 10.000)', val: r.total_recomendacoes, max: 10000, cor: 'amber' },
            { label: 'Enterprise Score (meta: 100/100)', val: r.enterprise_score, max: 100, cor: 'rose' },
          ].map((m, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-600">{m.label}</p>
                <p className="text-xs font-bold text-gray-700">{Math.min(100, Math.round((m.val / m.max) * 100))}%</p>
              </div>
              <BarraProgresso valor={Math.min(m.val, m.max)} max={m.max} cor={m.cor} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ABA KAPPA ─────────────────────────────────────────────────
function AbaKappa({ r }: { r: MedicalValidationReport }) {
  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-1">Interpretação dos Coeficientes</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          {[
            { range: '0,81–1,00', label: 'Quase perfeita', cor: 'emerald' },
            { range: '0,61–0,80', label: 'Substancial', cor: 'green' },
            { range: '0,41–0,60', label: 'Moderada', cor: 'amber' },
            { range: '0,21–0,40', label: 'Regular', cor: 'orange' },
            { range: '0,00–0,20', label: 'Fraca', cor: 'red' },
          ].map(item => (
            <div key={item.range} className={`bg-${item.cor}-50 border border-${item.cor}-200 rounded-lg p-2 text-center`}>
              <p className={`font-bold text-${item.cor}-700`}>{item.range}</p>
              <p className={`text-${item.cor}-600`}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Por especialidade */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Kappa por Especialidade</p>
        </div>
        <div className="divide-y divide-gray-100">
          {r.kappa_por_especialidade
            .sort((a, b) => b.kappa - a.kappa)
            .map((esp, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-700">{esp.especialidade}</p>
                  <p className="text-xs text-gray-400">{esp.total_casos} casos · concordância {esp.concordancia_pct}%</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${kappaColor(esp.kappa)}`}>κ={esp.kappa.toFixed(3)}</p>
                  <p className="text-xs text-gray-400">Score {esp.score_medio}</p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Distribuição de veredictos */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Distribuição de Veredictos (estimativa)</p>
        <div className="space-y-2">
          {[
            { label: 'Concordo totalmente', pct: 55, cor: 'emerald' },
            { label: 'Concordo', pct: 25, cor: 'green' },
            { label: 'Neutro', pct: 8, cor: 'gray' },
            { label: 'Discordo', pct: 7, cor: 'amber' },
            { label: 'Discordo totalmente', pct: 5, cor: 'red' },
          ].map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <p className="text-xs text-gray-600 w-36 flex-shrink-0">{v.label}</p>
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full bg-${v.cor}-500 rounded-full flex items-center justify-end pr-1`}
                  style={{ width: `${v.pct}%` }}>
                  <span className="text-white text-xs font-bold">{v.pct}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ABA INSTITUIÇÕES ──────────────────────────────────────────
function AbaInstituicoes({ r }: { r: MedicalValidationReport }) {
  const [tipo, setTipo] = useState<'hospitais' | 'clinicas'>('hospitais');
  const lista = tipo === 'hospitais' ? r.ranking_hospitais : r.ranking_clinicas;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['hospitais','clinicas'] as const).map(t => (
          <button key={t} onClick={() => setTipo(t)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${tipo === t ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {t === 'hospitais' ? `Hospitais (${r.ranking_hospitais.length})` : `Clínicas/AME (${r.ranking_clinicas.length})`}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-gray-50 border-b text-xs font-bold text-gray-400 uppercase">
          <span>#</span><span className="col-span-2">Instituição</span><span>Concordância</span><span>Kappa</span>
        </div>
        <div className="divide-y divide-gray-100">
          {lista.map((inst, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 px-4 py-3 items-center">
              <div className="flex items-center gap-1">
                {i < 3 && <Trophy size={12} className={i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : 'text-amber-600'} />}
                <span className="text-xs font-bold text-gray-500">{inst.ranking}</span>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-semibold text-gray-700">{inst.instituicao}</p>
                <p className="text-xs text-gray-400">{inst.uf} · {inst.validadores} validadores · {inst.casos} casos</p>
              </div>
              <div>
                <p className={`text-sm font-black ${scoreColor(inst.concordancia_pct)}`}>{inst.concordancia_pct}%</p>
              </div>
              <div>
                <p className={`text-xs font-bold ${kappaColor(inst.kappa)}`}>κ={inst.kappa.toFixed(3)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ABA VALIDADORES ───────────────────────────────────────────
function AbaValidadores({ r }: { r: MedicalValidationReport }) {
  const [busca, setBusca] = useState('');
  const filtrados = useMemo(() =>
    r.validadores.filter(v =>
      !busca || v.especialidade.toLowerCase().includes(busca.toLowerCase()) ||
      v.instituicao.toLowerCase().includes(busca.toLowerCase())
    ).slice(0, 50),
    [r.validadores, busca]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Filtrar por especialidade ou instituição…"
          className="text-xs border border-gray-200 rounded-lg px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        <span className="text-xs text-gray-400">{r.validadores.length} validadores cadastrados</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-gray-50 border-b text-xs font-bold text-gray-400 uppercase">
          <span>ID</span><span>Especialidade</span><span className="col-span-2">Instituição</span><span>κ indiv.</span>
        </div>
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {filtrados.map((v, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 px-4 py-2.5 items-center">
              <span className="text-xs font-mono text-gray-400">{v.id}</span>
              <p className="text-xs font-semibold text-gray-700">{v.especialidade}</p>
              <div className="col-span-2">
                <p className="text-xs text-gray-600">{v.instituicao}</p>
                <p className="text-xs text-gray-400">{v.uf} · {v.casos_validados} casos</p>
              </div>
              <p className={`text-xs font-bold ${kappaColor(v.kappa_individual)}`}>κ={v.kappa_individual.toFixed(3)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ABA CASOS ────────────────────────────────────────────────
function AbaCasos({ r }: { r: MedicalValidationReport }) {
  const [status, setStatus] = useState<'todos'|'validado'|'controverso'|'pendente'>('todos');
  const filtrados = r.casos.filter(c => status === 'todos' || c.status === status).slice(0, 100);

  const stats = {
    validados:   r.casos.filter(c => c.status === 'validado').length,
    controversos: r.casos.filter(c => c.status === 'controverso').length,
    pendentes:   r.casos.filter(c => c.status === 'pendente').length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { k: 'validados', label: 'Validados', n: stats.validados, cor: 'emerald' },
          { k: 'controversos', label: 'Controversos', n: stats.controversos, cor: 'amber' },
          { k: 'pendentes', label: 'Pendentes', n: stats.pendentes, cor: 'blue' },
        ].map(s => (
          <div key={s.k} className={`bg-${s.cor}-50 border border-${s.cor}-200 rounded-xl p-3 text-center cursor-pointer`}
            onClick={() => setStatus(s.k as typeof status)}>
            <p className={`text-2xl font-black text-${s.cor}-700`}>{s.n}</p>
            <p className={`text-xs text-${s.cor}-600 font-semibold`}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {(['todos','validado','controverso','pendente'] as const).map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${status === s ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {filtrados.map((c, i) => (
            <div key={i} className="px-4 py-3">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <span className="text-xs font-mono text-gray-400 mr-2">{c.id}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                    c.status === 'validado' ? 'bg-emerald-100 text-emerald-700' :
                    c.status === 'controverso' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'}`}>
                    {c.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-bold ${scoreColor(c.concordancia_pct)}`}>{c.concordancia_pct}% concord.</p>
                  <p className={`text-xs ${kappaColor(c.kappa_caso)}`}>κ={c.kappa_caso.toFixed(3)}</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-700">{c.molecula} — {c.classe}</p>
              <p className="text-xs text-gray-500">{c.descricao_clinica}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-400">{c.diretriz} · Nível {c.nivel_evidencia}</span>
                {c.nnt && <span className="text-xs text-emerald-600">NNT {c.nnt}</span>}
                <span className="text-xs text-gray-400">{c.validacoes.length} avaliações</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ABA ENTERPRISE SCORE ──────────────────────────────────────
function AbaEnterpriseScore({ r }: { r: MedicalValidationReport }) {
  return (
    <div className="space-y-5">
      {/* Score principal */}
      <div className={`rounded-2xl p-6 text-white bg-gradient-to-br ${scoreBg(r.enterprise_score)} text-center`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Award size={24} />
          <p className="text-lg font-bold">Medical Validation Report</p>
        </div>
        <p className="text-7xl font-black mb-2">{r.enterprise_score}</p>
        <p className="text-sm font-semibold opacity-90">/100 Enterprise Score</p>
        <p className="text-xs opacity-75 mt-1">v{r.versao} · {new Date(r.gerado_em).toLocaleDateString('pt-BR')}</p>
        <div className={`inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-full bg-white bg-opacity-20`}>
          {r.enterprise_score >= 90 ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          <span className="text-sm font-bold">
            {r.enterprise_score >= 90 ? 'Enterprise Ready' : r.enterprise_score >= 75 ? 'Em progresso' : 'Necessita melhoria'}
          </span>
        </div>
      </div>

      {/* Componentes */}
      <div className="space-y-3">
        {r.componentes.map((c: ComponenteEnterpriseScore, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{CATEGORIA_ICON[c.categoria]}</span>
                <div>
                  <p className="text-sm font-bold text-gray-800">{c.label}</p>
                  <p className="text-xs text-gray-500">{c.descricao}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className={`text-2xl font-black ${scoreColor(c.score)}`}>{c.score}</p>
                <p className="text-xs text-gray-400">peso {c.peso}% · meta {c.meta}</p>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                  c.status === 'acima_meta' ? 'bg-emerald-100 text-emerald-700' :
                  c.status === 'na_meta' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'}`}>
                  {c.status === 'acima_meta' ? '✓ Meta atingida' : c.status === 'na_meta' ? '~ Na meta' : '↑ Abaixo da meta'}
                </span>
              </div>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${c.score >= 90 ? 'bg-emerald-500' : c.score >= 75 ? 'bg-green-500' : c.score >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${c.score}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Caminho para 100/100 */}
      <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-violet-600" />
          <p className="text-sm font-bold text-violet-800">Caminho para 100/100</p>
        </div>
        <div className="space-y-2">
          {r.componentes.filter(c => c.score < c.meta).map((c, i) => (
            <div key={i} className="flex items-start gap-2">
              <ChevronUp size={12} className="text-violet-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-violet-700">
                <strong>{c.label}:</strong> atual {c.score}/100, meta {c.meta} (+{c.meta - c.score} pontos)
              </p>
            </div>
          ))}
          {r.componentes.every(c => c.score >= c.meta) && (
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 size={14} />
              <p className="text-sm font-bold">Todas as metas atingidas! Score máximo alcançado.</p>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs text-gray-500 leading-relaxed">
          O Medical Validation Report representa a concordância estatística entre validadores médicos independentes
          sobre as recomendações do sistema CDSS Prescreve-AI. Os dados são apresentados de forma anonimizada
          (hash CRM, sem identificação de pacientes) em conformidade com a LGPD.
          A decisão clínica final é exclusivamente do médico.
        </p>
        <p className="text-xs text-gray-400 mt-1">Gerado: {new Date(r.gerado_em).toLocaleString('pt-BR')} · {r.versao}</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════

export default function ValidacaoRealPage() {
  const [abaAtiva, setAbaAtiva] = useState<Aba>('overview');
  const report = useMemo(() => gerarMedicalValidationReport(), []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Globe size={20} className="text-emerald-600" />
              <h1 className="text-lg font-bold text-gray-900">Real World Medical Validation</h1>
              <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-700 rounded">Phase 16</span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${report.enterprise_score >= 90 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                <Star size={13} className={report.enterprise_score >= 90 ? 'text-emerald-600' : 'text-amber-600'} />
                <span className={`text-sm font-black ${report.enterprise_score >= 90 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {report.enterprise_score}/100
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            {report.total_medicos} médicos · {report.total_hospitais} hospitais · {report.total_casos.toLocaleString('pt-BR')} casos ·
            κ={report.kappa_global.toFixed(3)} · {report.concordancia_global_pct}% concordância
          </p>
        </div>
      </div>

      {/* Abas */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-5xl mx-auto flex gap-1 overflow-x-auto">
          {ABAS.map(aba => (
            <button key={aba.id} onClick={() => setAbaAtiva(aba.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                abaAtiva === aba.id ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {aba.icon}{aba.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {abaAtiva === 'overview'    && <AbaOverview r={report} />}
        {abaAtiva === 'kappa'       && <AbaKappa r={report} />}
        {abaAtiva === 'hospitais'   && <AbaInstituicoes r={report} />}
        {abaAtiva === 'validadores' && <AbaValidadores r={report} />}
        {abaAtiva === 'casos'       && <AbaCasos r={report} />}
        {abaAtiva === 'report'      && <AbaEnterpriseScore r={report} />}
      </div>
    </div>
  );
}
