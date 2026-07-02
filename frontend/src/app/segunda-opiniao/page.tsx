'use client';

import { useState } from 'react';
import {
  listarCondicoes,
  gerarSegundaOpiniao,
  NIVEL_COR,
  GRAU_COR,
  type CondicaoClinica,
  type CondutaOpcao,
  type SegundaOpiniao,
} from '@/lib/second-opinion';
import {
  CheckCircle2, ChevronRight, AlertTriangle, BookOpen,
  Microscope, ShieldCheck, Info, ChevronDown, ChevronUp,
  Stethoscope, Lightbulb, ArrowRight, RotateCcw, FlaskConical,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CONDICOES = listarCondicoes();

// ─── sub-components ──────────────────────────────────────────────────────────

function EvidenciaBadge({ nivel, grau }: { nivel: string; grau: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', NIVEL_COR[nivel as keyof typeof NIVEL_COR])}>
        Nível {nivel}
      </span>
      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', GRAU_COR[grau as keyof typeof GRAU_COR])}>
        Grau {grau}
      </span>
    </div>
  );
}

function EstudoRow({ nome, ano, n, resultado }: { nome: string; ano: number; n?: number; resultado: string }) {
  return (
    <div className="flex gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex-shrink-0 w-28">
        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{nome}</p>
        <p className="text-[10px] text-slate-400">{ano}{n ? ` · n=${n.toLocaleString('pt-BR')}` : ''}</p>
      </div>
      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">{resultado}</p>
    </div>
  );
}

function CondutaCard({
  opcao,
  selected,
  onClick,
  variant = 'selector',
}: {
  opcao: CondutaOpcao;
  selected?: boolean;
  onClick?: () => void;
  variant?: 'selector' | 'chosen' | 'alternative';
}) {
  const [expanded, setExpanded] = useState(false);

  if (variant === 'selector') {
    return (
      <button
        onClick={onClick}
        className={cn(
          'w-full text-left p-3.5 rounded-xl border-2 transition-all',
          selected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800/50',
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
            selected ? 'border-blue-500 bg-blue-500' : 'border-slate-300 dark:border-slate-600',
          )}>
            {selected && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-semibold', selected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200')}>
              {opcao.label}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{opcao.classe}</p>
            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{opcao.indicacao}</p>
          </div>
          <EvidenciaBadge nivel={opcao.evidencia.nivel} grau={opcao.evidencia.grau} />
        </div>
      </button>
    );
  }

  if (variant === 'chosen') {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Sua Conduta</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{opcao.label}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{opcao.classe}</p>
          </div>
          <EvidenciaBadge nivel={opcao.evidencia.nivel} grau={opcao.evidencia.grau} />
        </div>

        {/* Moléculas */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {opcao.moleculas.map(m => (
            <span key={m} className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
              {m}
            </span>
          ))}
        </div>

        {/* Indicação */}
        <div className="flex gap-2 bg-white/70 dark:bg-slate-900/40 rounded-xl p-3 mb-3">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-slate-700 dark:text-slate-300">{opcao.indicacao}</p>
        </div>

        {/* Perfil ideal */}
        <div className="flex gap-2 bg-white/70 dark:bg-slate-900/40 rounded-xl p-3 mb-3">
          <Stethoscope className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">Perfil ideal</p>
            <p className="text-[12px] text-slate-700 dark:text-slate-300">{opcao.perfil_ideal}</p>
          </div>
        </div>

        {/* Benefícios + Riscos lado a lado */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white/70 dark:bg-slate-900/40 rounded-xl p-3">
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Benefícios
            </p>
            <ul className="space-y-1">
              {opcao.beneficios.map((b, i) => (
                <li key={i} className="text-[11px] text-slate-600 dark:text-slate-400 flex gap-1.5">
                  <span className="text-emerald-500 flex-shrink-0 mt-0.5">✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white/70 dark:bg-slate-900/40 rounded-xl p-3">
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Riscos
            </p>
            <ul className="space-y-1">
              {opcao.riscos.map((r, i) => (
                <li key={i} className="text-[11px] text-slate-600 dark:text-slate-400 flex gap-1.5">
                  <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Diretriz */}
        <div className="bg-white/70 dark:bg-slate-900/40 rounded-xl p-3 mb-3">
          <div className="flex items-start gap-2">
            <BookOpen className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                {opcao.diretriz.orgao} {opcao.diretriz.ano}
              </p>
              <p className="text-[12px] text-slate-700 dark:text-slate-300">{opcao.diretriz.recomendacao}</p>
            </div>
          </div>
        </div>

        {/* Estudos — toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between px-3 py-2 bg-white/70 dark:bg-slate-900/40 rounded-xl text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900/60 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Microscope className="w-3.5 h-3.5" />
            {opcao.evidencia.estudos.length} estudo(s) de suporte
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {expanded && (
          <div className="mt-2 bg-white/70 dark:bg-slate-900/40 rounded-xl px-3 py-1">
            {opcao.evidencia.estudos.map((e, i) => (
              <EstudoRow key={i} {...e} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // variant === 'alternative'
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Alternativa válida
            </p>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{opcao.label}</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">{opcao.classe}</p>
          </div>
          <EvidenciaBadge nivel={opcao.evidencia.nivel} grau={opcao.evidencia.grau} />
        </div>

        {/* Moléculas */}
        <div className="flex flex-wrap gap-1 mt-2">
          {opcao.moleculas.slice(0, 4).map(m => (
            <span key={m} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
              {m}
            </span>
          ))}
          {opcao.moleculas.length > 4 && (
            <span className="text-[10px] text-slate-400">+{opcao.moleculas.length - 4}</span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Indicação */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Indicação</p>
          <p className="text-[12px] text-slate-700 dark:text-slate-300">{opcao.indicacao}</p>
        </div>

        {/* Evidência */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
            <Microscope className="w-3 h-3" /> Evidência
          </p>
          <div className="space-y-1.5">
            {opcao.evidencia.estudos.map((e, i) => (
              <div key={i} className="flex gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-2.5 py-1.5">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex-shrink-0 w-20">{e.nome} {e.ano}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{e.resultado}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Benefícios */}
        <div>
          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Benefícios
          </p>
          <ul className="space-y-1">
            {opcao.beneficios.map((b, i) => (
              <li key={i} className="text-[12px] text-slate-600 dark:text-slate-400 flex gap-2">
                <span className="text-emerald-500 flex-shrink-0">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Riscos */}
        <div>
          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1.5 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Riscos
          </p>
          <ul className="space-y-1">
            {opcao.riscos.map((r, i) => (
              <li key={i} className="text-[12px] text-slate-600 dark:text-slate-400 flex gap-2">
                <span className="text-amber-500 flex-shrink-0">⚠</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Contraindicações */}
        {opcao.contraindicacoes.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase mb-1.5 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Contraindicações
            </p>
            <div className="flex flex-wrap gap-1">
              {opcao.contraindicacoes.map((c, i) => (
                <span key={i} className="text-[10px] bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded-full">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Diretriz */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <BookOpen className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                {opcao.diretriz.orgao} {opcao.diretriz.ano}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">{opcao.diretriz.recomendacao}</p>
            </div>
          </div>
        </div>

        {/* Perfil ideal */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3">
          <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1 flex items-center gap-1">
            <Stethoscope className="w-3 h-3" /> Perfil ideal
          </p>
          <p className="text-[12px] text-slate-700 dark:text-slate-300">{opcao.perfil_ideal}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SegundaOpiniaoPage() {
  const [passo, setPasso]             = useState<1 | 2 | 3>(1);
  const [condicaoId, setCondicaoId]   = useState<string>('');
  const [condutaId, setCondutaId]     = useState<string>('');
  const [resultado, setResultado]     = useState<SegundaOpiniao | null>(null);

  const condicaoSelecionada: CondicaoClinica | undefined =
    CONDICOES.find(c => c.id === condicaoId);

  function selecionarCondicao(id: string) {
    setCondicaoId(id);
    setCondutaId('');
    setResultado(null);
    setPasso(2);
  }

  function selecionarConduta(id: string) {
    setCondutaId(id);
    setPasso(2);
  }

  function gerarOpiniao() {
    const r = gerarSegundaOpiniao(condicaoId, condutaId);
    if (r) {
      setResultado(r);
      setPasso(3);
    }
  }

  function reiniciar() {
    setPasso(1);
    setCondicaoId('');
    setCondutaId('');
    setResultado(null);
  }

  const grupos = CONDICOES.reduce<Record<string, CondicaoClinica[]>>((acc, c) => {
    if (!acc[c.grupo]) acc[c.grupo] = [];
    acc[c.grupo].push(c);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">Second Opinion Engine</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Apoio à decisão clínica · Suporte, não diagnóstico autônomo</p>
            </div>
            {resultado && (
              <button
                onClick={reiniciar}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Nova consulta
              </button>
            )}
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-2 mt-4">
            {([
              { n: 1, label: 'Condição clínica' },
              { n: 2, label: 'Sua conduta' },
              { n: 3, label: 'Segunda opinião' },
            ] as const).map((step, i) => (
              <div key={step.n} className="flex items-center gap-2">
                <div className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all',
                  passo === step.n
                    ? 'bg-violet-600 text-white'
                    : passo > step.n
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400',
                )}>
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                    {passo > step.n ? '✓' : step.n}
                  </span>
                  {step.label}
                </div>
                {i < 2 && <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Passo 1 — Selecionar condição */}
        {passo === 1 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">Selecione a condição clínica</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Qual é o diagnóstico principal do paciente?</p>
            <div className="space-y-5">
              {Object.entries(grupos).map(([grupo, items]) => (
                <div key={grupo}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{grupo}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.map(c => (
                      <button
                        key={c.id}
                        onClick={() => selecionarCondicao(c.id)}
                        className={cn(
                          'text-left p-4 rounded-xl border-2 transition-all',
                          condicaoId === c.id
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-slate-50 dark:hover:bg-slate-800/50',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.label}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{c.cid10} · {c.opcoes.length} opções terapêuticas</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{c.descricao}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Passo 2 — Selecionar conduta */}
        {passo === 2 && condicaoSelecionada && (
          <div>
            {/* Condição selecionada */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => { setPasso(1); setCondutaId(''); }}
                className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                ← Voltar
              </button>
              <span className="text-slate-300">·</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{condicaoSelecionada.label}</span>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">{condicaoSelecionada.cid10}</span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">Qual foi sua conduta?</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Selecione a classe terapêutica ou abordagem que você escolheu para este paciente.</p>

              <div className="space-y-2">
                {condicaoSelecionada.opcoes.map(opcao => (
                  <CondutaCard
                    key={opcao.id}
                    opcao={opcao}
                    selected={condutaId === opcao.id}
                    onClick={() => selecionarConduta(opcao.id)}
                    variant="selector"
                  />
                ))}
              </div>

              {condutaId && (
                <button
                  onClick={gerarOpiniao}
                  className="mt-5 w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-200 dark:shadow-violet-900/30 text-sm"
                >
                  <FlaskConical className="w-4 h-4" />
                  Gerar Segunda Opinião Clínica
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Passo 3 — Resultado */}
        {passo === 3 && resultado && (
          <div className="space-y-6">
            {/* Nota clínica */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase mb-0.5">Nota clínica</p>
                <p className="text-sm text-amber-800 dark:text-amber-200">{resultado.nota_clinica}</p>
              </div>
            </div>

            {/* Conduta escolhida */}
            <CondutaCard opcao={resultado.escolhida} variant="chosen" />

            {/* Alternativas */}
            {resultado.alternativas.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    {resultado.alternativas.length} Alternativa(s) Válida(s)
                  </p>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {resultado.alternativas.map(alt => (
                    <CondutaCard key={alt.id} opcao={alt} variant="alternative" />
                  ))}
                </div>
              </div>
            )}

            {/* Footer legal */}
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4 flex gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Este módulo fornece <strong>suporte à decisão clínica</strong> com base em diretrizes internacionais. Não realiza diagnóstico autônomo. A conduta final é responsabilidade exclusiva do médico assistente, considerando o contexto clínico individual do paciente.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
