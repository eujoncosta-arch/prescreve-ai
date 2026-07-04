'use client';

// ============================================================
// PRESCREVE-AI — Clinical Validation Suite (Phase 15)
// 500 cenários · 10 especialidades · Vitest
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  FlaskConical, Play, CheckCircle2, XCircle, AlertTriangle,
  BarChart3, Clock, Filter, ChevronDown, ChevronRight,
  ShieldCheck, Target, Stethoscope, Baby, Brain,
  Heart, Activity, Syringe, Pill, Microscope,
} from 'lucide-react';
import {
  executarSuiteValidacao,
  type SuiteResultado,
  type ResultadoCenario,
  type Especialidade,
} from '@/lib/clinical-validator';

// ══════════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════════

const ESPECIALIDADE_META: Record<Especialidade, { label: string; icon: React.ReactNode; cor: string }> = {
  cardiologia:     { label: 'Cardiologia',     icon: <Heart size={14} />,      cor: 'red' },
  endocrinologia:  { label: 'Endocrinologia',  icon: <Activity size={14} />,   cor: 'amber' },
  pneumologia:     { label: 'Pneumologia',     icon: <Pill size={14} />,       cor: 'sky' },
  infectologia:    { label: 'Infectologia',    icon: <Microscope size={14} />, cor: 'green' },
  psiquiatria:     { label: 'Psiquiatria',     icon: <Brain size={14} />,      cor: 'violet' },
  pediatria:       { label: 'Pediatria',       icon: <Baby size={14} />,       cor: 'pink' },
  geriatria:       { label: 'Geriatria',       icon: <Stethoscope size={14} />,cor: 'orange' },
  gestante:        { label: 'Gestante',        icon: <ShieldCheck size={14} />,cor: 'rose' },
  renal:           { label: 'Renal',           icon: <Target size={14} />,     cor: 'blue' },
  hepatico:        { label: 'Hepático',        icon: <Syringe size={14} />,    cor: 'yellow' },
};

const RESULTADO_META: Record<string, { label: string; cor: string; icon: React.ReactNode }> = {
  aprovado:      { label: 'Aprovado',      cor: 'emerald', icon: <CheckCircle2 size={13} /> },
  reprovado:     { label: 'Reprovado',     cor: 'red',     icon: <XCircle size={13} /> },
  alerta:        { label: 'Alerta',        cor: 'amber',   icon: <AlertTriangle size={13} /> },
  nao_aplicavel: { label: 'N/A',           cor: 'gray',    icon: <CheckCircle2 size={13} /> },
};

// ══════════════════════════════════════════════════════════════
// COMPONENTES
// ══════════════════════════════════════════════════════════════

function GaugeScore({ score, size = 80 }: { score: number; size?: number }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ * 0.75;
  const cor = score >= 90 ? '#10b981' : score >= 75 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';

  return (
    <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.7}`}>
      <circle cx={size / 2} cy={size * 0.55} r={r} fill="none" stroke="#e5e7eb" strokeWidth={size * 0.08}
        strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeDashoffset={circ * 0.375}
        strokeLinecap="round" transform={`rotate(135 ${size / 2} ${size * 0.55})`} />
      <circle cx={size / 2} cy={size * 0.55} r={r} fill="none" stroke={cor} strokeWidth={size * 0.08}
        strokeDasharray={`${filled} ${circ - filled}`} strokeDashoffset={circ * 0.375}
        strokeLinecap="round" transform={`rotate(135 ${size / 2} ${size * 0.55})`} />
      <text x={size / 2} y={size * 0.58} textAnchor="middle" fontSize={size * 0.22} fontWeight="bold" fill={cor}>{score}</text>
    </svg>
  );
}

function CardEspecialidade({ esp, stats, onClick, ativo }: {
  esp: Especialidade;
  stats: { total: number; aprovados: number; taxa: number; score_medio: number };
  onClick: () => void;
  ativo: boolean;
}) {
  const meta = ESPECIALIDADE_META[esp];
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${ativo ? `border-${meta.cor}-400 bg-${meta.cor}-50` : 'border-gray-200 bg-white hover:border-gray-300'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className={`text-${meta.cor}-600`}>{meta.icon}</span>
          <span className="text-xs font-semibold text-gray-700">{meta.label}</span>
        </div>
        <span className={`text-xs font-bold ${stats.taxa >= 90 ? 'text-emerald-600' : stats.taxa >= 75 ? 'text-amber-600' : 'text-red-600'}`}>{stats.taxa}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-${meta.cor}-500`} style={{ width: `${stats.taxa}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-1">{stats.aprovados}/{stats.total} · Score {stats.score_medio}</p>
    </button>
  );
}

function LinhaResultado({ cenario, expanded, onToggle }: {
  cenario: ResultadoCenario;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = RESULTADO_META[cenario.resultado_geral] ?? RESULTADO_META.aprovado;
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left bg-white hover:bg-gray-50"
      >
        <span className={`text-${meta.cor}-600 flex-shrink-0`}>{meta.icon}</span>
        <span className="text-xs text-gray-500 font-mono flex-shrink-0 w-24">{cenario.cenario_id}</span>
        <span className="text-xs font-medium text-gray-700 flex-1 truncate">{cenario.descricao}</span>
        <span className="text-xs text-gray-500 flex-shrink-0">{cenario.molecula}</span>
        <span className={`text-xs font-bold text-${meta.cor}-600 flex-shrink-0 w-16 text-right`}>{cenario.score}/100</span>
        {expanded ? <ChevronDown size={12} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={12} className="text-gray-400 flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 bg-gray-50 border-t border-gray-100">
          {cenario.validacoes.map((v, i) => (
            <div key={i} className={`flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0`}>
              <span className={`flex-shrink-0 mt-0.5 ${v.passou ? 'text-emerald-500' : 'text-red-500'}`}>
                {v.passou ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700">{v.descricao}</p>
                <p className="text-xs text-gray-500">{v.criterio}</p>
                {v.evidencia && <p className="text-xs text-blue-600 mt-0.5">{v.evidencia}</p>}
              </div>
              <span className={`text-xs flex-shrink-0 px-1.5 py-0.5 rounded font-bold
                ${v.resultado_obtido === 'aprovado' ? 'bg-emerald-100 text-emerald-700' :
                  v.resultado_obtido === 'reprovado' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'}`}>
                {v.resultado_obtido}
              </span>
            </div>
          ))}
          <p className="text-xs text-gray-400 mt-1">{cenario.tempo_ms}ms</p>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PÁGINA
// ══════════════════════════════════════════════════════════════

export default function ValidacaoClinicaPage() {
  const [resultado, setResultado] = useState<SuiteResultado | null>(null);
  const [rodando, setRodando] = useState(false);
  const [espFiltro, setEspFiltro] = useState<Especialidade | 'todas'>('todas');
  const [filtroResultado, setFiltroResultado] = useState<'todos' | 'aprovado' | 'reprovado' | 'alerta'>('todos');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  function executar() {
    setRodando(true);
    setTimeout(() => {
      const r = executarSuiteValidacao(espFiltro === 'todas' ? undefined : espFiltro);
      setResultado(r);
      setRodando(false);
    }, 50);
  }

  const cenariosFiltrados = useMemo(() => {
    if (!resultado) return [];
    return resultado.cenarios.filter(c => {
      if (filtroResultado !== 'todos' && c.resultado_geral !== filtroResultado) return false;
      if (busca && !c.descricao.toLowerCase().includes(busca.toLowerCase()) &&
          !c.molecula.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [resultado, filtroResultado, busca]);

  const especialidades = Object.keys(ESPECIALIDADE_META) as Especialidade[];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <FlaskConical size={20} className="text-blue-600" />
              <h1 className="text-lg font-bold text-gray-900">Clinical Validation Suite</h1>
              <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded">Phase 15</span>
            </div>
            <p className="text-xs text-gray-500">500 cenários automatizados · 10 especialidades · Vitest</p>
          </div>
          <button
            onClick={executar}
            disabled={rodando}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-all"
          >
            <Play size={14} className={rodando ? 'animate-spin' : ''} />
            {rodando ? 'Executando…' : 'Executar Suite'}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {!resultado ? (
          /* Estado inicial */
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <FlaskConical size={48} className="text-blue-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Suite de Validação Clínica</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-lg mx-auto">
              500 cenários clínicos automatizados validando: diretrizes, doses, ajuste renal/hepático,
              contraindicações, interações, critérios BEERS, segurança gestacional e doses pediátricas.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {especialidades.map(esp => {
                const meta = ESPECIALIDADE_META[esp];
                return (
                  <div key={esp} className="bg-gray-50 rounded-xl p-3 text-center">
                    <span className={`text-${meta.cor}-600 flex justify-center mb-1`}>{meta.icon}</span>
                    <p className="text-xs font-semibold text-gray-600">{meta.label}</p>
                    <p className="text-xs text-gray-400">50 cenários</p>
                  </div>
                );
              })}
            </div>
            <button onClick={executar} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all">
              <Play size={16} className="inline mr-2" />Executar 500 Cenários
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Score global */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="md:col-span-2 bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4">
                <GaugeScore score={resultado.score_global} size={90} />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Score Global</p>
                  <p className="text-2xl font-black text-gray-800">{resultado.score_global}/100</p>
                  <p className="text-xs text-gray-500">{resultado.total_cenarios} cenários · {resultado.duracao_ms}ms</p>
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                <CheckCircle2 size={20} className="text-emerald-600 mx-auto mb-1" />
                <p className="text-2xl font-black text-emerald-700">{resultado.aprovados}</p>
                <p className="text-xs text-emerald-600 font-semibold">Aprovados</p>
                <p className="text-xs text-gray-500">{resultado.taxa_aprovacao}%</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                <AlertTriangle size={20} className="text-amber-600 mx-auto mb-1" />
                <p className="text-2xl font-black text-amber-700">{resultado.alertas}</p>
                <p className="text-xs text-amber-600 font-semibold">Alertas</p>
                <p className="text-xs text-gray-500">{Math.round(resultado.alertas / resultado.total_cenarios * 100)}%</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                <XCircle size={20} className="text-red-600 mx-auto mb-1" />
                <p className="text-2xl font-black text-red-700">{resultado.reprovados}</p>
                <p className="text-xs text-red-600 font-semibold">Reprovados</p>
                <p className="text-xs text-gray-500">{Math.round(resultado.reprovados / resultado.total_cenarios * 100)}%</p>
              </div>
            </div>

            {/* Por especialidade */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={16} className="text-gray-400" />
                <p className="text-sm font-semibold text-gray-700">Por Especialidade</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {especialidades.map(esp => {
                  const stats = resultado.por_especialidade[esp];
                  if (!stats) return null;
                  return (
                    <CardEspecialidade
                      key={esp}
                      esp={esp}
                      stats={stats}
                      ativo={espFiltro === esp}
                      onClick={() => setEspFiltro(espFiltro === esp ? 'todas' : esp)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Filtros + lista */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-wrap">
                <Filter size={14} className="text-gray-400" />
                <input
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar cenário ou molécula…"
                  className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 w-52 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {(['todos','aprovado','reprovado','alerta'] as const).map(f => (
                  <button key={f} onClick={() => setFiltroResultado(f)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${filtroResultado === f ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
                <span className="text-xs text-gray-400 ml-auto">{cenariosFiltrados.length} cenários</span>
              </div>
              <div className="p-4 max-h-[500px] overflow-y-auto">
                {cenariosFiltrados.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Nenhum cenário encontrado com este filtro.</p>
                ) : (
                  cenariosFiltrados.slice(0, 200).map(c => (
                    <LinhaResultado
                      key={c.cenario_id}
                      cenario={c}
                      expanded={expandido === c.cenario_id}
                      onToggle={() => setExpandido(expandido === c.cenario_id ? null : c.cenario_id)}
                    />
                  ))
                )}
                {cenariosFiltrados.length > 200 && (
                  <p className="text-xs text-gray-400 text-center py-2">Mostrando 200 de {cenariosFiltrados.length}. Use filtros para refinar.</p>
                )}
              </div>
            </div>

            {/* Info teste */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <Clock size={14} className="text-blue-600 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-700">Para executar os testes automatizados Vitest:</p>
                  <code className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono block mt-1">
                    cd frontend && npx vitest run
                  </code>
                  <p className="text-xs text-blue-600 mt-1">Ou para modo watch: <code className="bg-blue-100 px-1 rounded">npx vitest</code></p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
