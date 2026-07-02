'use client';

import { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  useComite,
  STATUS_VAL_META,
  AREA_BADGE,
  NIVEL_COLOR_COMITE,
  GRAU_COLOR_COMITE,
  type Especialista,
  type ValidacaoRecomendacao,
  type StatusValidacaoComite,
} from '@/lib/comite';
import {
  ShieldCheck, Users, CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp,
  Award, BookOpen, GitBranch, Star, ExternalLink, Building2, Hash,
  RefreshCw, AlertTriangle, CheckCheck, Circle, Microscope, BadgeCheck,
  ArrowUpRight, Filter, Search, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Avatar ───────────────────────────────────────────────────

function Avatar({ e, size = 'md' }: { e: Especialista; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-14 h-14 text-base' : size === 'md' ? 'w-10 h-10 text-sm' : 'w-7 h-7 text-[10px]';
  return (
    <div className={cn('rounded-full flex items-center justify-center font-black text-white flex-shrink-0 shadow-sm', sz, e.cor_avatar)}>
      {e.initials}
    </div>
  );
}

// ─── Score ────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 9 ? 'bg-green-500' : score >= 7 ? 'bg-blue-500' : score >= 5 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 w-6 text-right">{score}</span>
    </div>
  );
}

// ─── Painel VALIDADO POR ──────────────────────────────────────

function ValidadoPorPanel({ validacao, especialistas }: {
  validacao: ValidacaoRecomendacao;
  especialistas: Especialista[];
}) {
  const revisoresData = validacao.revisores.map(r => ({
    ...r,
    esp: especialistas.find(e => e.id === r.especialista_id),
  }));

  if (revisoresData.length === 0) return null;

  return (
    <div className={cn(
      'rounded-xl border p-4',
      validacao.status === 'aprovado'
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
    )}>
      <div className="flex items-center gap-2 mb-3">
        <BadgeCheck className={cn('w-4 h-4', validacao.status === 'aprovado' ? 'text-green-600' : 'text-slate-500')} />
        <p className={cn('text-[11px] font-black uppercase tracking-wider', validacao.status === 'aprovado' ? 'text-green-700 dark:text-green-400' : 'text-slate-600 dark:text-slate-400')}>
          VALIDADO POR
        </p>
        <span className={cn('ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1', STATUS_VAL_META[validacao.status].cls)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_VAL_META[validacao.status].dot)} />
          {STATUS_VAL_META[validacao.status].label}
        </span>
      </div>

      <div className="space-y-2">
        {revisoresData.map((r, i) => r.esp && (
          <div key={i} className="flex items-start gap-2.5">
            <Avatar e={r.esp} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{r.esp.nome}</span>
                {r.aprovado
                  ? <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                  : <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                }
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{r.esp.especialidade} · {r.esp.crm}/{r.esp.uf_crm}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{r.esp.instituicao}</p>
              <ScoreBar score={r.score} />
            </div>
            <div className="text-[9px] text-slate-400 flex-shrink-0 text-right">
              {new Date(r.data_revisao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
        ))}
      </div>

      {validacao.parecer_coletivo && (
        <div className="mt-3 pt-3 border-t border-green-200/60 dark:border-green-800/60">
          <p className="text-[10px] font-semibold text-green-700 dark:text-green-400 mb-1">Parecer Coletivo</p>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">{validacao.parecer_coletivo}</p>
        </div>
      )}

      {validacao.data_conclusao && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
          <Clock className="w-3 h-3" />
          Concluído em {new Date(validacao.data_conclusao).toLocaleDateString('pt-BR')}
          {validacao.proxima_revisao && (
            <> · Próxima revisão: {new Date(validacao.proxima_revisao).toLocaleDateString('pt-BR')}</>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Card de Validação ────────────────────────────────────────

function ValidacaoCard({ v, especialistas, onAprovar, onRejeitar }: {
  v: ValidacaoRecomendacao;
  especialistas: Especialista[];
  onAprovar: (id: string) => void;
  onRejeitar: (id: string, motivo: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sv = STATUS_VAL_META[v.status];
  const pendencias = v.revisores.flatMap(r => r.pendencias);
  const aprovados  = v.revisores.filter(r => r.aprovado).length;
  const total      = v.revisores.length;
  const avgScore   = total > 0 ? Math.round(v.revisores.reduce((a, r) => a + r.score, 0) / total * 10) / 10 : 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setExpanded(p => !p)}>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', v.status === 'aprovado' ? 'bg-green-100 dark:bg-green-900/30' : v.status === 'rejeitado' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30')}>
          {v.status === 'aprovado'
            ? <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            : v.status === 'rejeitado'
              ? <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              : <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
              {v.guideline_sigla}
            </span>
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', AREA_BADGE[v.area] ?? 'bg-slate-100 text-slate-600')}>
              {v.condicao}
            </span>
            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', NIVEL_COLOR_COMITE[v.nivel_evidencia])}>
              Nível {v.nivel_evidencia}
            </span>
            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', GRAU_COLOR_COMITE[v.grau_recomendacao])}>
              Grau {v.grau_recomendacao}
            </span>
            <span className={cn('text-[9px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1', sv.cls)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', sv.dot)} />
              {sv.label}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{v.recomendacao_titulo}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{v.recomendacao_descricao}</p>

          {/* Mini-stats */}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] text-slate-500">{total} revisor{total !== 1 ? 'es' : ''}</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span className="text-[10px] text-slate-500">{aprovados}/{total} aprovaram</span>
            </div>
            {avgScore > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] text-slate-500">Score médio: {avgScore}/10</span>
              </div>
            )}
            {pendencias.length > 0 && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span className="text-[10px] text-amber-600 dark:text-amber-400">{pendencias.length} pendência{pendencias.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 text-slate-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 space-y-4 p-4 bg-slate-50 dark:bg-slate-950">

          {/* VALIDADO POR */}
          <ValidadoPorPanel validacao={v} especialistas={especialistas} />

          {/* Pareceres individuais */}
          {v.revisores.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Pareceres Individuais
              </p>
              <div className="space-y-2">
                {v.revisores.map((r, i) => {
                  const esp = especialistas.find(e => e.id === r.especialista_id);
                  if (!esp) return null;
                  return (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                      <div className="flex items-start gap-2.5">
                        <Avatar e={esp} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{esp.nome}</span>
                            <span className="text-[10px] text-slate-400">{esp.especialidade} · CRM-{esp.uf_crm} {esp.crm}</span>
                            {r.aprovado
                              ? <span className="text-[9px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full">Aprovou</span>
                              : <span className="text-[9px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full">Pendências</span>
                            }
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-1.5">{r.parecer}</p>
                          <ScoreBar score={r.score} />
                          {r.pendencias.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {r.pendencias.map((p, pi) => (
                                <div key={pi} className="flex items-start gap-1.5 text-[10px] text-amber-700 dark:text-amber-400">
                                  <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                  {p}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pendências consolidadas */}
          {pendencias.length > 0 && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
              <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">Pendências Consolidadas</p>
              <div className="space-y-1">
                {[...new Set(pendencias)].map((p, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-800 dark:text-amber-300">
                    <span className="text-amber-500 font-bold flex-shrink-0">{i + 1}.</span> {p}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histórico de versões */}
          <div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" /> Histórico de Versões
            </p>
            <div className="space-y-2">
              {v.historico_versoes.map((h, i) => {
                const sv2 = STATUS_VAL_META[h.status];
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1', sv2.dot)} />
                      {i < v.historico_versoes.length - 1 && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />}
                    </div>
                    <div className="pb-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-400">{h.versao}</span>
                        <span className="text-[10px] text-slate-400">{new Date(h.data).toLocaleDateString('pt-BR')}</span>
                        <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full', sv2.cls)}>{sv2.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{h.descricao}</p>
                      <p className="text-[10px] text-slate-400">por {h.responsavel}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ações (apenas se não concluído) */}
          {v.status !== 'aprovado' && v.status !== 'rejeitado' && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { onAprovar(v.id); toast.success('Recomendação aprovada pelo comitê'); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-all"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Aprovar
              </button>
              <button
                onClick={() => { onRejeitar(v.id, 'Rejeição pelo comitê científico'); toast.error('Recomendação rejeitada'); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 text-xs font-bold transition-all"
              >
                <XCircle className="w-3.5 h-3.5" /> Rejeitar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Card de Especialista ─────────────────────────────────────

function EspecialistaCard({ e }: { e: Especialista }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4 cursor-pointer" onClick={() => setOpen(p => !p)}>
        <div className="flex items-start gap-3">
          <Avatar e={e} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">{e.nome}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{e.especialidade}{e.sub_especialidade ? ` · ${e.sub_especialidade}` : ''}</p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{e.instituicao}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="text-[9px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">
                {e.titulacao}
              </span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                CRM-{e.uf_crm} {e.crm}
              </span>
              {e.publicacoes_indexadas && (
                <span className="text-[9px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {e.publicacoes_indexadas} publicações
                </span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-3 bg-slate-50 dark:bg-slate-950">
          {/* Dados completos */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'CRM', value: `${e.crm}/${e.uf_crm}` },
              { label: 'Titulação', value: e.titulacao },
              { label: 'Instituição', value: e.instituicao },
              e.departamento ? { label: 'Departamento', value: e.departamento } : null,
              e.publicacoes_indexadas ? { label: 'Publicações indexadas', value: String(e.publicacoes_indexadas) } : null,
              { label: 'Membro desde', value: new Date(e.membro_desde).toLocaleDateString('pt-BR') },
            ].filter(Boolean).map((item, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">{item!.label}</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{item!.value}</p>
              </div>
            ))}
          </div>

          {/* Áreas de atuação */}
          <div>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5">Áreas de Atuação</p>
            <div className="flex flex-wrap gap-1">
              {e.area_atuacao.map(a => (
                <span key={a} className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
                  {a}
                </span>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="flex gap-2">
            {e.orcid && (
              <a
                href={`https://orcid.org/${e.orcid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-green-700 dark:text-green-400 hover:underline bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg border border-green-200 dark:border-green-800"
              >
                <Hash className="w-3 h-3" /> ORCID <ArrowUpRight className="w-3 h-3" />
              </a>
            )}
            {e.lattes_url && (
              <a
                href={e.lattes_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-blue-700 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <ExternalLink className="w-3 h-3" /> Lattes
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

type TabType = 'validacoes' | 'especialistas';
type StatusFilter = 'todos' | StatusValidacaoComite;

export default function ComitePage() {
  const { especialistas, validacoes, loaded, aprovarValidacao, rejeitarValidacao, aprovadas, pendentes, rejeitadas } = useComite();
  const [tab,         setTab]         = useState<TabType>('validacoes');
  const [statusFil,   setStatusFil]   = useState<StatusFilter>('todos');
  const [areaFil,     setAreaFil]     = useState('todas');
  const [search,      setSearch]      = useState('');

  const filteredVal = useMemo(() => validacoes.filter(v => {
    if (statusFil !== 'todos' && v.status !== statusFil) return false;
    if (areaFil   !== 'todas' && v.area   !== areaFil)   return false;
    if (search) {
      const q = search.toLowerCase();
      if (!v.recomendacao_titulo.toLowerCase().includes(q) && !v.guideline_sigla.toLowerCase().includes(q) && !v.condicao.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [validacoes, statusFil, areaFil, search]);

  const totalRevisores = useMemo(() => new Set(validacoes.flatMap(v => v.revisores.map(r => r.especialista_id))).size, [validacoes]);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            Comitê Científico
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Validação por especialistas · Auditoria integral · Múltiplos revisores
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Especialistas',     value: especialistas.filter(e => e.ativo).length, icon: Users,        color: 'blue'   },
            { label: 'Aprovadas',          value: aprovadas,                                 icon: CheckCircle2, color: 'green'  },
            { label: 'Em revisão',         value: pendentes,                                 icon: Clock,        color: 'amber'  },
            { label: 'Rejeitadas',         value: rejeitadas,                                icon: XCircle,      color: 'red'    },
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

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          {([
            { key: 'validacoes',  label: 'Validações',  icon: ShieldCheck },
            { key: 'especialistas', label: 'Especialistas', icon: Users },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all',
                tab === key
                  ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab: Validações ── */}
        {tab === 'validacoes' && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-40 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar recomendação…"
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-400 transition-colors"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {(['todos', 'aprovado', 'em_revisao', 'revisao_solicitada', 'pendente', 'rejeitado'] as StatusFilter[]).map(s => {
                  const meta = s !== 'todos' ? STATUS_VAL_META[s] : null;
                  return (
                    <button
                      key={s}
                      onClick={() => setStatusFil(s)}
                      className={cn(
                        'text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all',
                        statusFil === s
                          ? (meta ? cn(meta.cls, 'border-transparent') : 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 border-transparent')
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'
                      )}
                    >
                      {s === 'todos' ? 'Todos' : (meta?.label ?? s)}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-1 flex-wrap">
                {(['todas', 'cardiologia', 'endocrinologia', 'pneumologia', 'nefrologia']).map(a => (
                  <button
                    key={a}
                    onClick={() => setAreaFil(a)}
                    className={cn(
                      'text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all capitalize',
                      areaFil === a
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'
                    )}
                  >
                    {a === 'todas' ? 'Todas' : a.charAt(0).toUpperCase() + a.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {!loaded ? (
              <div className="text-center py-12 text-slate-400 text-sm">Carregando…</div>
            ) : filteredVal.length === 0 ? (
              <div className="text-center py-16">
                <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                <p className="text-sm text-slate-400">Nenhuma validação encontrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredVal.map(v => (
                  <ValidacaoCard
                    key={v.id}
                    v={v}
                    especialistas={especialistas}
                    onAprovar={aprovarValidacao}
                    onRejeitar={rejeitarValidacao}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Especialistas ── */}
        {tab === 'especialistas' && (
          <div className="space-y-4">
            {/* Painel executivo do comitê */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 rounded-2xl border border-slate-700 p-5">
              <p className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <Microscope className="w-4 h-4 text-blue-400" />
                Composição do Comitê Científico
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {especialistas.filter(e => e.ativo).map(e => (
                  <div key={e.id} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                    <Avatar e={e} size="sm" />
                    <div>
                      <p className="text-[11px] font-bold text-white leading-none">{e.nome.replace('Dr. ', '').replace('Dra. ', '')}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{e.especialidade}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 border-t border-slate-700 pt-4">
                {[
                  { label: 'Especialistas ativos', value: especialistas.filter(e => e.ativo).length },
                  { label: 'Publicações totais', value: especialistas.reduce((a, e) => a + (e.publicacoes_indexadas ?? 0), 0) },
                  { label: 'Recomendações revisadas', value: validacoes.reduce((a, v) => a + v.revisores.length, 0) },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-2xl font-black text-white">{value}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid especialistas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {especialistas.map(e => <EspecialistaCard key={e.id} e={e} />)}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
            <span className="font-bold">Plataforma científica auditável.</span> Toda recomendação é validada por especialistas independentes com registro no CRM. A aprovação do comitê não substitui o julgamento clínico individual do médico assistente.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
