'use client';

import { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  EVIDENCE_DB,
  TIPO_ESTUDO_META,
  NIVEL_META,
  GRAU_META,
  AREA_META,
  getTotalPacientes,
  getTotalEstudosByDiagnostico,
  getTotalPacientesByDiagnostico,
  getEstudosByTipo,
  type DiagnosticoEvidencia,
  type TerapiaEvidencia,
  type Estudo,
  type AreaTerapeutica,
  type NivelEv,
} from '@/lib/evidence-engine';
import {
  FlaskConical, Search, ChevronDown, ChevronUp, Users, BookOpen,
  Shield, CheckCircle2, AlertTriangle, ArrowUpRight, Hash, Layers,
  TrendingDown, BarChart2, Microscope, ChevronRight, X, Filter,
  Zap, Info, Activity, Clock, Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Painel lateral "Ver evidências" ─────────────────────────

function EstudoPanel({ estudo, onClose }: { estudo: Estudo; onClose: () => void }) {
  const tm = TIPO_ESTUDO_META[estudo.tipo];
  const nm = NIVEL_META[estudo.nivel];
  const gm = GRAU_META[estudo.grau];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto flex flex-col shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-4 z-10">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className={cn('text-[10px] font-black px-2 py-0.5 rounded', tm.cls, tm.dark)}>
                  {tm.short}
                </span>
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', nm.cls)}>
                  Nível {estudo.nivel}
                </span>
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', gm.cls)}>
                  Grau {estudo.grau}
                </span>
                {estudo.randomizado && (
                  <span className="text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">RANDOMIZADO</span>
                )}
                {estudo.multicentrico && (
                  <span className="text-[9px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded">MULTICÊNTRICO</span>
                )}
                {estudo.cego === 'duplo_cego' && (
                  <span className="text-[9px] font-bold bg-purple-600 text-white px-1.5 py-0.5 rounded">DUPLO-CEGO</span>
                )}
              </div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">{estudo.nome}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{estudo.titulo_completo}</p>
              <p className="text-[11px] text-slate-400 mt-1">{estudo.autores} · {estudo.ano} · <span className="italic">{estudo.revista}</span></p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-5">

          {/* Stats rápidas */}
          <div className="grid grid-cols-2 gap-2">
            <Stat icon={Users}  label="Pacientes"    value={estudo.n_pacientes.toLocaleString('pt-BR')} color="blue" />
            <Stat icon={Clock}  label="Seguimento"   value={estudo.duracao_seguimento}                   color="slate" />
            {estudo.reducao_risco_relativo && (
              <Stat icon={TrendingDown} label="RRR"  value={estudo.reducao_risco_relativo}               color="green" />
            )}
            {estudo.nnt && (
              <Stat icon={Target} label="NNT"        value={String(estudo.nnt)}                          color="emerald" />
            )}
            {estudo.hr && (
              <Stat icon={Activity} label="HR"       value={estudo.hr}                                   color="purple" />
            )}
            {estudo.p_value && (
              <Stat icon={BarChart2} label="p-valor"  value={estudo.p_value}                             color="indigo" />
            )}
          </div>

          {/* Descrição da população */}
          <Block title="População estudada" icon={Users} color="blue">
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{estudo.populacao}</p>
            {estudo.populacao_excluida && estudo.populacao_excluida.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-semibold text-red-600 dark:text-red-400 mb-1">Populações excluídas:</p>
                <ul className="space-y-0.5">
                  {estudo.populacao_excluida.map((p, i) => (
                    <li key={i} className="text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1">
                      <span className="text-red-400 flex-shrink-0">✕</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Block>

          {/* Desfechos */}
          <Block title="Desfechos" icon={Target} color="indigo">
            <div className="space-y-2">
              <div>
                <p className="text-[10px] font-semibold text-slate-500 mb-0.5">Primário</p>
                <p className="text-xs text-slate-800 dark:text-slate-200">{estudo.desfecho_primario}</p>
              </div>
              {estudo.desfecho_secundario && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-0.5">Secundário</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300">{estudo.desfecho_secundario}</p>
                </div>
              )}
            </div>
          </Block>

          {/* Resultado principal */}
          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Resultado Principal
            </p>
            <p className="text-sm font-bold text-blue-900 dark:text-blue-100 leading-relaxed">{estudo.resultado_principal}</p>
            {(estudo.reducao_risco_absoluto || estudo.nnh) && (
              <div className="flex gap-4 mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                {estudo.reducao_risco_absoluto && (
                  <div>
                    <p className="text-[9px] text-blue-500 font-semibold uppercase">RRA</p>
                    <p className="text-sm font-black text-blue-700 dark:text-blue-300">{estudo.reducao_risco_absoluto}</p>
                  </div>
                )}
                {estudo.nnh && (
                  <div>
                    <p className="text-[9px] text-red-500 font-semibold uppercase">NNH</p>
                    <p className="text-sm font-black text-red-600 dark:text-red-400">{estudo.nnh}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Benefícios */}
          <Block title="Benefícios demonstrados" icon={CheckCircle2} color="green">
            <ul className="space-y-1.5">
              {estudo.beneficios.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </Block>

          {/* Riscos */}
          <Block title="Riscos / Efeitos adversos" icon={AlertTriangle} color="red">
            <ul className="space-y-1.5">
              {estudo.riscos.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  {r}
                </li>
              ))}
            </ul>
          </Block>

          {/* Limitações */}
          <Block title="Limitações do estudo" icon={Info} color="amber">
            <ul className="space-y-1.5">
              {estudo.limitacoes.map((l, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="text-amber-500 font-bold flex-shrink-0">!</span>
                  {l}
                </li>
              ))}
            </ul>
          </Block>

          {/* Subgrupos beneficiados */}
          {estudo.subgrupos_beneficiados && estudo.subgrupos_beneficiados.length > 0 && (
            <Block title="Subgrupos com maior benefício" icon={Microscope} color="purple">
              <div className="flex flex-wrap gap-1.5">
                {estudo.subgrupos_beneficiados.map((s, i) => (
                  <span key={i} className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </Block>
          )}

          {/* Nível de evidência explicado */}
          <div className="grid grid-cols-2 gap-2">
            <div className={cn('rounded-xl border p-3', nm.cls)}>
              <p className="text-[10px] font-black uppercase tracking-wider">Nível {estudo.nivel}</p>
              <p className="text-[10px] mt-0.5">{nm.desc}</p>
            </div>
            <div className={cn('rounded-xl p-3', gm.cls)}>
              <p className="text-[10px] font-black uppercase tracking-wider">Grau {estudo.grau}</p>
              <p className="text-[10px] mt-0.5">{gm.desc}</p>
            </div>
          </div>

          {/* Links */}
          <div className="flex gap-2 flex-wrap">
            {estudo.doi && (
              <a href={`https://doi.org/${estudo.doi}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800">
                <Hash className="w-3 h-3" /> DOI <ArrowUpRight className="w-3 h-3" />
              </a>
            )}
            {estudo.pmid && (
              <a href={`https://pubmed.ncbi.nlm.nih.gov/${estudo.pmid}/`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] text-green-700 dark:text-green-400 hover:underline bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800">
                <BookOpen className="w-3 h-3" /> PubMed <ArrowUpRight className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Card de terapia (com "Ver evidências") ───────────────────

function TerapiaCard({ terapia, onVerEstudo }: {
  terapia: TerapiaEvidencia;
  onVerEstudo: (e: Estudo) => void;
}) {
  const [open, setOpen] = useState(false);
  const total = terapia.estudos.length;
  const totalPac = getTotalPacientes(terapia);
  const tiposCounts = getEstudosByTipo(terapia);
  const nm = NIVEL_META[terapia.nivel_geral];
  const gm = GRAU_META[terapia.grau_geral];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-sm transition-shadow">
      {/* Header terapia */}
      <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setOpen(p => !p)}>
        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
          <FlaskConical className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', nm.cls)}>Nível {terapia.nivel_geral}</span>
            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', gm.cls)}>Grau {terapia.grau_geral}</span>
            <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">{terapia.classe}</span>
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{terapia.nome}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{terapia.indicacao_principal}</p>

          {/* Mini-stats */}
          <div className="flex flex-wrap gap-3 mt-2">
            <MiniStat label="estudos"   value={total}                                      />
            <MiniStat label="pacientes" value={totalPac.toLocaleString('pt-BR')} color="blue" />
            {(tiposCounts.rct ?? 0) > 0      && <MiniStat label="ECR"          value={tiposCounts.rct}       color="indigo" />}
            {(tiposCounts.meta_analise ?? 0) > 0 && <MiniStat label="Meta-análises" value={tiposCounts.meta_analise} color="purple" />}
          </div>
        </div>
        <div className="flex-shrink-0 text-slate-400">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">

          {/* Mecanismo + benefício/risco */}
          <div className="p-4 space-y-3">
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Mecanismo de ação</p>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{terapia.mecanismo}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
                <p className="text-[9px] font-black text-green-600 dark:text-green-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Benefício
                </p>
                <p className="text-[11px] text-green-800 dark:text-green-200 leading-relaxed">{terapia.beneficio_resumo}</p>
              </div>
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Riscos
                </p>
                <p className="text-[11px] text-red-800 dark:text-red-200 leading-relaxed">{terapia.risco_resumo}</p>
              </div>
            </div>

            {/* Contraindicações */}
            {terapia.contraindicacoes.length > 0 && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1.5">Contraindicações</p>
                <div className="flex flex-wrap gap-1">
                  {terapia.contraindicacoes.map((c, i) => (
                    <span key={i} className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Monitoramento */}
            {terapia.monitoramento.length > 0 && (
              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1.5">Monitoramento</p>
                <ul className="space-y-0.5">
                  {terapia.monitoramento.map((m, i) => (
                    <li key={i} className="text-[10px] text-blue-800 dark:text-blue-200 flex items-start gap-1.5">
                      <span className="text-blue-400 flex-shrink-0">·</span>{m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Lista de estudos */}
          <div className="px-4 pb-4">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Microscope className="w-3.5 h-3.5" /> Estudos Principais ({total})
            </p>
            <div className="space-y-2">
              {terapia.estudos.map(e => {
                const tm = TIPO_ESTUDO_META[e.tipo];
                const nm2 = NIVEL_META[e.nivel];
                return (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors group">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', tm.cls, tm.dark)}>
                      <span className="text-[8px] font-black">{tm.short}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100">{e.nome}</span>
                        <span className={cn('text-[8px] font-bold px-1 py-0.5 rounded', nm2.cls)}>Nível {e.nivel}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {e.n_pacientes.toLocaleString('pt-BR')} pac · {e.duracao_seguimento} · {e.ano}
                      </p>
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5">{e.resultado_principal}</p>
                    </div>
                    <button
                      onClick={() => onVerEstudo(e)}
                      className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-semibold px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex-shrink-0 group-hover:opacity-100 opacity-80"
                    >
                      Ver evidências <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Card de diagnóstico (raiz da hierarquia) ─────────────────

function DiagnosticoSection({ diag, onVerEstudo }: {
  diag: DiagnosticoEvidencia;
  onVerEstudo: (e: Estudo) => void;
}) {
  const [open, setOpen] = useState(false);
  const totalEst = getTotalEstudosByDiagnostico(diag);
  const totalPac = getTotalPacientesByDiagnostico(diag);
  const am = AREA_META[diag.area];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Header diagnóstico */}
      <div
        className="flex items-start gap-4 p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setOpen(p => !p)}
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white font-black text-xs">{diag.cid10}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', am.cls)}>{am.label}</span>
            {diag.prevalencia_br && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">{diag.prevalencia_br}</span>
            )}
          </div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">{diag.nome}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">{diag.resumo_clinico}</p>

          {/* Stats agregadas */}
          <div className="flex flex-wrap gap-4 mt-3">
            <AggStat icon={BookOpen}    label="Diretrizes"  value={diag.diretrizes.length} />
            <AggStat icon={FlaskConical} label="Terapias"  value={diag.diretrizes.flatMap(d => d.terapias).length} />
            <AggStat icon={Microscope}  label="Estudos"    value={totalEst}         color="blue" />
            <AggStat icon={Users}       label="Pacientes"  value={totalPac.toLocaleString('pt-BR')} color="green" />
          </div>
        </div>
        <div className="flex-shrink-0 text-slate-400">
          {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {/* Expanded: hierarquia Diretriz → Terapia */}
      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800">
          {/* Mortalidade */}
          {diag.mortalidade && (
            <div className="mx-4 mt-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-300">{diag.mortalidade}</p>
            </div>
          )}

          {diag.diretrizes.map(dir => (
            <div key={dir.id} className="p-4 border-t border-slate-100 dark:border-slate-800 first:border-t-0">
              {/* Diretriz header */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-shrink-0 w-1 h-8 bg-blue-600 rounded-full" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-lg">
                      {dir.sigla}
                    </span>
                    {dir.url_oficial && (
                      <a href={dir.url_oficial} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5">
                        Acessar diretriz <ArrowUpRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{dir.sociedade} · {dir.ano}</p>
                </div>
              </div>

              {/* Terapias */}
              <div className="space-y-3 ml-3">
                {dir.terapias.map(t => (
                  <TerapiaCard key={t.id} terapia={t} onVerEstudo={onVerEstudo} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components pequenos ──────────────────────────────────

function Block({ title, icon: Icon, color, children }: {
  title: string; icon: React.ElementType; color: string; children: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-50   dark:bg-blue-900/20   border-blue-200   dark:border-blue-800',
    green:  'bg-green-50  dark:bg-green-900/20  border-green-200  dark:border-green-800',
    red:    'bg-red-50    dark:bg-red-900/20    border-red-200    dark:border-red-800',
    amber:  'bg-amber-50  dark:bg-amber-900/20  border-amber-200  dark:border-amber-800',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  };
  const iconColors: Record<string, string> = {
    blue: 'text-blue-500', green: 'text-green-500', red: 'text-red-500',
    amber: 'text-amber-500', indigo: 'text-indigo-500', purple: 'text-purple-500',
  };
  return (
    <div className={cn('rounded-xl border p-3', colors[color] ?? '')}>
      <p className={cn('text-[10px] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5', iconColors[color])}>
        <Icon className="w-3.5 h-3.5" /> {title}
      </p>
      {children}
    </div>
  );
}

function Stat({ icon: Icon, label, value, color = 'slate' }: { icon: React.ElementType; label: string; value: string; color?: string }) {
  const cls: Record<string, string> = {
    blue:    'bg-blue-50    dark:bg-blue-900/20    border-blue-200    dark:border-blue-800    text-blue-700    dark:text-blue-400',
    green:   'bg-green-50   dark:bg-green-900/20   border-green-200   dark:border-green-800   text-green-700   dark:text-green-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400',
    purple:  'bg-purple-50  dark:bg-purple-900/20  border-purple-200  dark:border-purple-800  text-purple-700  dark:text-purple-400',
    indigo:  'bg-indigo-50  dark:bg-indigo-900/20  border-indigo-200  dark:border-indigo-800  text-indigo-700  dark:text-indigo-400',
    slate:   'bg-white      dark:bg-slate-900       border-slate-200   dark:border-slate-700   text-slate-700   dark:text-slate-300',
  };
  return (
    <div className={cn('rounded-xl border p-2.5 flex items-center gap-2', cls[color])}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <div>
        <p className="text-[9px] font-semibold uppercase opacity-70">{label}</p>
        <p className="text-xs font-black">{value}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number | undefined; color?: string }) {
  if (!value) return null;
  const cls = color === 'blue' ? 'text-blue-600 dark:text-blue-400'
    : color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400'
    : color === 'purple' ? 'text-purple-600 dark:text-purple-400'
    : 'text-slate-600 dark:text-slate-400';
  return (
    <div className="flex items-center gap-1">
      <span className={cn('text-xs font-black', cls)}>{value}</span>
      <span className="text-[10px] text-slate-400">{label}</span>
    </div>
  );
}

function AggStat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color?: string }) {
  const cls = color === 'blue' ? 'text-blue-600 dark:text-blue-400'
    : color === 'green' ? 'text-green-600 dark:text-green-400'
    : 'text-slate-600 dark:text-slate-400';
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn('w-3.5 h-3.5', cls)} />
      <span className={cn('text-sm font-black', cls)}>{value}</span>
      <span className="text-[10px] text-slate-400">{label}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function EvidencePage() {
  const [search,    setSearch]    = useState('');
  const [areaFil,   setAreaFil]   = useState<'todas' | AreaTerapeutica>('todas');
  const [nivelFil,  setNivelFil]  = useState<'todos' | NivelEv>('todos');
  const [estudoOpen, setEstudoOpen] = useState<Estudo | null>(null);

  // Estatísticas globais
  const totalEstudos   = EVIDENCE_DB.flatMap(d => d.diretrizes.flatMap(dir => dir.terapias.flatMap(t => t.estudos))).length;
  const totalPacientes = EVIDENCE_DB.flatMap(d => d.diretrizes.flatMap(dir => dir.terapias.flatMap(t => t.estudos))).reduce((s, e) => s + e.n_pacientes, 0);
  const totalRCT       = EVIDENCE_DB.flatMap(d => d.diretrizes.flatMap(dir => dir.terapias.flatMap(t => t.estudos))).filter(e => e.tipo === 'rct').length;
  const totalMeta      = EVIDENCE_DB.flatMap(d => d.diretrizes.flatMap(dir => dir.terapias.flatMap(t => t.estudos))).filter(e => e.tipo === 'meta_analise').length;

  const filtered = useMemo(() => EVIDENCE_DB.filter(d => {
    if (areaFil !== 'todas' && d.area !== areaFil) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchDiag = d.nome.toLowerCase().includes(q) || d.cid10.toLowerCase().includes(q);
      const matchTerapia = d.diretrizes.some(dir => dir.terapias.some(t =>
        t.nome.toLowerCase().includes(q) || t.classe.toLowerCase().includes(q)
      ));
      const matchEstudo = d.diretrizes.some(dir => dir.terapias.some(t =>
        t.estudos.some(e => e.nome.toLowerCase().includes(q) || e.titulo_completo.toLowerCase().includes(q))
      ));
      if (!matchDiag && !matchTerapia && !matchEstudo) return false;
    }
    if (nivelFil !== 'todos') {
      const hasNivel = d.diretrizes.some(dir => dir.terapias.some(t =>
        t.nivel_geral === nivelFil || t.estudos.some(e => e.nivel === nivelFil)
      ));
      if (!hasNivel) return false;
    }
    return true;
  }), [search, areaFil, nivelFil]);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Microscope className="w-6 h-6 text-blue-600" />
            Evidence Engine
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Diagnóstico → Diretriz → Terapia → Estudos · Racional científico em segundos
          </p>
        </div>

        {/* KPIs globais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Estudos',      value: totalEstudos,                              icon: Microscope,  color: 'blue'   },
            { label: 'ECR',          value: totalRCT,                                   icon: FlaskConical,color: 'indigo' },
            { label: 'Meta-análises',value: totalMeta,                                  icon: Layers,      color: 'purple' },
            { label: 'Pacientes',    value: `${(totalPacientes / 1000).toFixed(0)}k`,  icon: Users,       color: 'green'  },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-10 h-10 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-44 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar diagnóstico, terapia, estudo…"
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            {(['todas', 'cardiologia', 'endocrinologia', 'pneumologia', 'nefrologia'] as const).map(a => (
              <button key={a} onClick={() => setAreaFil(a)}
                className={cn('text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all capitalize',
                  areaFil === a ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'
                )}>
                {a === 'todas' ? 'Todas' : a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex gap-1">
            {(['todos', 'A', 'B', 'C'] as const).map(n => {
              const active = nivelFil === n;
              const cl = n !== 'todos' ? NIVEL_META[n] : null;
              return (
                <button key={n} onClick={() => setNivelFil(n)}
                  className={cn('text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all',
                    active && cl ? cl.cls : active ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 border-transparent' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'
                  )}>
                  {n === 'todos' ? 'Todos' : `Nível ${n}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
            <span className="font-bold">Apoio à decisão clínica.</span> Evidências apresentadas para informar o raciocínio clínico. Diagnóstico e conduta são responsabilidade exclusiva do médico.
          </p>
        </div>

        {/* Lista de diagnósticos */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Microscope className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
            <p className="text-sm text-slate-400">Nenhum resultado encontrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(d => (
              <DiagnosticoSection key={d.id} diag={d} onVerEstudo={setEstudoOpen} />
            ))}
          </div>
        )}
      </div>

      {/* Painel lateral "Ver evidências" */}
      {estudoOpen && (
        <EstudoPanel estudo={estudoOpen} onClose={() => setEstudoOpen(null)} />
      )}
    </AppShell>
  );
}
