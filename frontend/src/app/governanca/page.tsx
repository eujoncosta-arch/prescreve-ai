'use client';

import { useState } from 'react';
import {
  useGovernance,
  STATUS_GUIDELINE,
  STATUS_REVIEW,
  IMPACTO_META,
  AUDIT_META,
  NIVEL_EVIDENCIA_LABEL,
  GRAU_RECOMENDACAO_LABEL,
  type Guideline,
  type GuidelineStatus,
  type ReviewStatus,
} from '@/lib/governance';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  BookOpen,
  RefreshCw,
  History,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  FlaskConical,
  Newspaper,
  Star,
  Bell,
  GitCommit,
  GitBranch,
  Award,
  Layers,
  Eye,
  XCircle,
  ArrowUpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Helpers ─────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const NIVEL_COLOR: Record<string, string> = {
  A: 'bg-green-100 text-green-700 border-green-300',
  B: 'bg-blue-100 text-blue-700 border-blue-300',
  C: 'bg-slate-100 text-slate-600 border-slate-300',
};
const GRAU_COLOR: Record<string, string> = {
  I:   'bg-indigo-100 text-indigo-700 border-indigo-300',
  IIa: 'bg-purple-100 text-purple-700 border-purple-300',
  IIb: 'bg-amber-100  text-amber-700  border-amber-300',
  III: 'bg-red-100    text-red-700    border-red-300',
};

// ─── Page ────────────────────────────────────────────────────

export default function GovernancaPage() {
  const {
    guidelines, reviews, updates, audit, loaded,
    markUpdateRead, updateReviewStatus, updateGuidelineStatus,
    unreadCount, pendingReviews,
  } = useGovernance();

  const vigentes   = guidelines.filter(g => g.status === 'vigente').length;
  const emRevisao  = guidelines.filter(g => g.status === 'em_revisao').length;
  const obsoletas  = guidelines.filter(g => g.status === 'obsoleta').length;
  const totalEv    = guidelines.reduce((s, g) => s + g.versoes.reduce((s2, v) => s2 + v.evidencias.length, 0), 0);

  if (!loaded) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
      Carregando governança científica…
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            Governança Científica
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Versionamento · Auditoria · Revisão por especialistas · Atualizações científicas
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <div className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2.5 py-1.5 rounded-full font-semibold">
              <Bell className="w-3.5 h-3.5" /> {unreadCount} nova(s)
            </div>
          )}
          {pendingReviews > 0 && (
            <div className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1.5 rounded-full font-semibold">
              <Clock className="w-3.5 h-3.5" /> {pendingReviews} revisão pendente
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Vigentes',           value: vigentes,       icon: CheckCircle2,  cls: 'text-green-600', bg: 'bg-green-50 border-green-200' },
          { label: 'Em revisão',         value: emRevisao,      icon: RefreshCw,     cls: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Obsoletas',          value: obsoletas,      icon: AlertTriangle, cls: 'text-red-500',   bg: 'bg-red-50 border-red-200' },
          { label: 'Evidências indexadas',value: totalEv,       icon: FlaskConical,  cls: 'text-indigo-600',bg: 'bg-indigo-50 border-indigo-200' },
        ].map(({ label, value, icon: Icon, cls, bg }) => (
          <div key={label} className={cn('rounded-xl border p-3 flex items-center gap-3', bg)}>
            <Icon className={cn('w-7 h-7', cls)} />
            <div>
              <p className="text-xl font-bold text-slate-900">{value}</p>
              <p className="text-[11px] text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="diretrizes">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="diretrizes" className="text-xs">
            <BookOpen className="w-3.5 h-3.5 mr-1" /> Diretrizes
          </TabsTrigger>
          <TabsTrigger value="revisoes" className="text-xs">
            <User className="w-3.5 h-3.5 mr-1" /> Revisão
            {pendingReviews > 0 && <span className="ml-1 bg-amber-500 text-white text-[9px] px-1 rounded-full">{pendingReviews}</span>}
          </TabsTrigger>
          <TabsTrigger value="atualizacoes" className="text-xs">
            <Newspaper className="w-3.5 h-3.5 mr-1" /> Atualizações
            {unreadCount > 0 && <span className="ml-1 bg-orange-500 text-white text-[9px] px-1 rounded-full">{unreadCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="text-xs">
            <History className="w-3.5 h-3.5 mr-1" /> Auditoria
          </TabsTrigger>
        </TabsList>

        {/* ── ABA 1: DIRETRIZES ──────────────────────── */}
        <TabsContent value="diretrizes" className="space-y-3 mt-4">
          <p className="text-xs text-slate-500 italic">
            Toda recomendação do sistema possui fonte, data, versão, sociedade científica e nível de evidência rastreáveis.
          </p>
          {guidelines.map(g => (
            <GuidelineCard
              key={g.id}
              guideline={g}
              onStatusChange={(id, st) => {
                updateGuidelineStatus(id, st);
                toast.success('Status atualizado.');
              }}
            />
          ))}
        </TabsContent>

        {/* ── ABA 2: REVISÕES ────────────────────────── */}
        <TabsContent value="revisoes" className="space-y-3 mt-4">
          <p className="text-xs text-slate-500 italic">
            Especialistas externos revisam e aprovam cada diretriz antes da publicação no sistema.
          </p>
          {reviews.map(r => (
            <ReviewCard
              key={r.id}
              review={r}
              onApprove={() => { updateReviewStatus(r.id, 'aprovado'); toast.success('Revisão aprovada!'); }}
              onReject={() => { updateReviewStatus(r.id, 'rejeitado'); toast.error('Revisão rejeitada.'); }}
            />
          ))}
        </TabsContent>

        {/* ── ABA 3: ATUALIZAÇÕES ────────────────────── */}
        <TabsContent value="atualizacoes" className="space-y-3 mt-4">
          <p className="text-xs text-slate-500 italic">
            Novos estudos, meta-análises e atualizações de diretrizes que impactam recomendações do sistema.
          </p>
          {updates
            .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
            .map(u => (
              <UpdateCard key={u.id} update={u} onRead={() => markUpdateRead(u.id)} />
            ))}
        </TabsContent>

        {/* ── ABA 4: AUDITORIA ───────────────────────── */}
        <TabsContent value="auditoria" className="mt-4">
          <p className="text-xs text-slate-500 italic mb-3">
            Registro completo de todas as operações — quem fez, o quê, quando.
          </p>
          <div className="relative">
            <div className="absolute left-[15px] top-5 bottom-5 w-0.5 bg-slate-100" />
            <div className="space-y-3">
              {audit
                .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                .map(entry => {
                  const meta = AUDIT_META[entry.tipo];
                  return (
                    <div key={entry.id} className="flex gap-4 items-start">
                      <div className={cn('w-4 h-4 rounded-full flex-shrink-0 mt-1 z-10 ring-2 ring-white', meta.color)} />
                      <div className="flex-1 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{entry.descricao}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                              <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-semibold text-white', meta.color)}>
                                {meta.label}
                              </span>
                              <User className="w-2.5 h-2.5" /> {entry.usuario}
                              <Clock className="w-2.5 h-2.5" /> {fmtDate(entry.data)}
                            </div>
                          </div>
                          {entry.guideline_titulo && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded flex-shrink-0">
                              {entry.guideline_titulo}
                            </span>
                          )}
                        </div>
                        {entry.metadados && Object.keys(entry.metadados).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(entry.metadados).map(([k, v]) => (
                              <span key={k} className="text-[9px] bg-slate-50 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                                {k}: {v}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Princípios */}
      <div className="grid grid-cols-5 gap-2 pt-2">
        {[
          { icon: ShieldCheck,  label: 'Independência comercial' },
          { icon: User,         label: 'Revisão por especialistas' },
          { icon: GitBranch,    label: 'Versionamento rastreável' },
          { icon: Eye,          label: 'Fonte sempre visível' },
          { icon: History,      label: 'Auditoria completa' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1.5 p-3 bg-green-50 border border-green-100 rounded-xl text-center">
            <Icon className="w-4 h-4 text-green-600" />
            <span className="text-[10px] font-semibold text-green-800 leading-tight">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Guideline Card ───────────────────────────────────────────

function GuidelineCard({ guideline: g, onStatusChange }: {
  guideline: Guideline;
  onStatusChange: (id: string, st: GuidelineStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [versaoOpen, setVersaoOpen] = useState<string | null>(null);
  const meta = STATUS_GUIDELINE[g.status];
  const versaoAtual = g.versoes.find(v => v.numero === g.versao_atual) ?? g.versoes[0];
  const totalEv = g.versoes.reduce((s, v) => s + v.evidencias.length, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1', meta.cls)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} />
              {meta.label}
            </span>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
              v{g.versao_atual}
            </span>
            {totalEv > 0 && (
              <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded font-semibold">
                {totalEv} evidência(s)
              </span>
            )}
            {g.sigla && (
              <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded font-mono font-bold">
                {g.sigla}
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-slate-900 leading-snug">{g.titulo}</p>
          <p className="text-xs text-slate-500 mt-0.5">{g.sociedade}</p>
          <div className="flex flex-wrap gap-3 mt-1.5 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {g.area}</span>
            <span className="flex items-center gap-1"><GitCommit className="w-3 h-3" /> {g.versoes.length} versão(ões)</span>
            {g.data_proxima_revisao && (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />
                Próx. revisão: {fmtDate(g.data_proxima_revisao)}
              </span>
            )}
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
          : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
        }
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-4">
          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {g.tags.map(t => (
              <span key={t} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{t}</span>
            ))}
          </div>

          {/* Versão atual — resumo */}
          {versaoAtual && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1">
                <Star className="w-3 h-3" /> Versão atual ({versaoAtual.numero}) — {fmtDate(versaoAtual.data_publicacao)}
              </p>
              <p className="text-xs text-blue-700">{versaoAtual.resumo}</p>
              {versaoAtual.alteracoes.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-[10px] font-bold text-blue-600">Principais alterações:</p>
                  {versaoAtual.alteracoes.map((ch, i) => (
                    <div key={i} className="text-[10px] bg-white/70 rounded border border-blue-100 px-2 py-1.5">
                      <span className="font-semibold text-slate-700">{ch.campo}:</span>
                      <span className="text-slate-400 line-through ml-1">{ch.anterior}</span>
                      <span className="text-blue-700 font-medium ml-1">→ {ch.novo}</span>
                      {ch.justificativa && <p className="text-slate-500 mt-0.5 italic">{ch.justificativa}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Histórico de versões */}
          {g.versoes.length > 1 && (
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5" /> Histórico de versões
              </p>
              <div className="space-y-1.5">
                {g.versoes.map(v => (
                  <div key={v.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                      onClick={() => setVersaoOpen(prev => prev === v.id ? null : v.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">v{v.numero}</span>
                        <span className="text-xs text-slate-600">{fmtDate(v.data_publicacao)}</span>
                        <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-semibold', STATUS_REVIEW[v.status_revisao].cls)}>
                          {STATUS_REVIEW[v.status_revisao].label}
                        </span>
                      </div>
                      {versaoOpen === v.id ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                    {versaoOpen === v.id && (
                      <div className="px-3 pb-3 pt-2 space-y-2">
                        <p className="text-xs text-slate-600">{v.resumo}</p>
                        {v.revisores.length > 0 && (
                          <p className="text-[10px] text-slate-400">Revisores: {v.revisores.join(' · ')}</p>
                        )}
                        {/* Evidências */}
                        {v.evidencias.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-semibold text-slate-600 flex items-center gap-1">
                              <FlaskConical className="w-3 h-3" /> Evidências desta versão
                            </p>
                            {v.evidencias.map((ev, i) => (
                              <div key={i} className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-1">
                                <div className="flex items-start gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-slate-800">{ev.titulo}</span>
                                  <div className="flex gap-1 ml-auto flex-shrink-0">
                                    <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border', NIVEL_COLOR[ev.nivel])}>
                                      Nível {ev.nivel}
                                    </span>
                                    <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border', GRAU_COLOR[ev.grau])}>
                                      Grau {ev.grau}
                                    </span>
                                  </div>
                                </div>
                                {ev.autores && (
                                  <p className="text-[10px] text-slate-500">{ev.autores} · {ev.ano} · <span className="italic">{ev.revista}</span></p>
                                )}
                                <p className="text-[10px] text-slate-600">{ev.resumo}</p>
                                <div className="flex items-center gap-1 text-[10px]">
                                  <span className="text-slate-400">{NIVEL_EVIDENCIA_LABEL[ev.nivel]}</span>
                                  {ev.doi && (
                                    <a href={`https://doi.org/${ev.doi}`} target="_blank" rel="noopener noreferrer"
                                      className="ml-auto flex items-center gap-0.5 text-blue-600 hover:underline">
                                      DOI <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status change */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-slate-500">Alterar status:</span>
            {(['vigente', 'em_revisao', 'obsoleta', 'aguardando'] as GuidelineStatus[])
              .filter(s => s !== g.status)
              .map(s => (
                <button
                  key={s}
                  onClick={() => onStatusChange(g.id, s)}
                  className={cn('text-[10px] px-2 py-1 rounded-md border transition-all', STATUS_GUIDELINE[s].cls)}
                >
                  → {STATUS_GUIDELINE[s].label}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Review Card ─────────────────────────────────────────────

function ReviewCard({ review: r, onApprove, onReject }: {
  review: import('@/lib/governance').ExpertReview;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_REVIEW[r.status];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', meta.cls)}>
              {meta.label}
            </span>
            {r.score_qualidade !== undefined && (
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                <Award className="w-2.5 h-2.5" /> {r.score_qualidade}/10
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-slate-900">{r.especialista}</p>
          <p className="text-xs text-slate-500">{r.especialidade}{r.crm ? ` · ${r.crm}` : ''} · {r.guideline_titulo}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Solicitado {fmtDate(r.data_solicitacao)}
            {r.data_resposta ? ` · Respondido ${fmtDate(r.data_resposta)}` : ''}
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-3">
          {r.parecer && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-[10px] font-semibold text-slate-500 mb-1">Parecer do especialista:</p>
              <p className="text-xs text-slate-700 italic">"{r.parecer}"</p>
            </div>
          )}
          {r.pendencias && r.pendencias.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-[10px] font-semibold text-amber-700 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Pendências identificadas:
              </p>
              <ul className="space-y-0.5">
                {r.pendencias.map((p, i) => (
                  <li key={i} className="text-xs text-amber-700 flex items-start gap-1">
                    <span className="text-amber-400 flex-shrink-0">•</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {r.status === 'pendente' && (
            <div className="flex gap-2">
              <Button size="sm" className="text-xs gap-1 bg-green-600 hover:bg-green-700" onClick={onApprove}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
              </Button>
              <Button size="sm" variant="outline" className="text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50" onClick={onReject}>
                <XCircle className="w-3.5 h-3.5" /> Rejeitar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Update Card ─────────────────────────────────────────────

function UpdateCard({ update: u, onRead }: {
  update: import('@/lib/governance').ScientificUpdate;
  onRead: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = IMPACTO_META[u.impacto];

  const TIPO_LABEL: Record<string, string> = {
    novo_estudo: 'Novo estudo', atualizacao_diretriz: 'Atualização diretriz',
    alerta_seguranca: 'Alerta', meta_analise: 'Meta-análise', consenso: 'Consenso',
  };

  return (
    <div className={cn(
      'bg-white border rounded-xl shadow-sm overflow-hidden transition-all',
      !u.lida ? 'border-orange-200 ring-1 ring-orange-100' : 'border-slate-200',
    )}>
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => { setExpanded(e => !e); if (!u.lida) onRead(); }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1.5 mb-1">
            {!u.lida && (
              <span className="text-[9px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full uppercase">NOVO</span>
            )}
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', meta.cls)}>
              <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1', meta.dot)} />
              Impacto {meta.label}
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
              {TIPO_LABEL[u.tipo] ?? u.tipo}
            </span>
            {u.acao_requerida && (
              <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                <ArrowUpCircle className="w-2.5 h-2.5" /> Ação requerida
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-slate-900 leading-snug">{u.titulo}</p>
          <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-400">
            <span><Clock className="w-2.5 h-2.5 inline mr-0.5" />{fmtDate(u.data)}</span>
            {u.sociedade && <span>{u.sociedade}</span>}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-2">
          <p className="text-xs text-slate-700 leading-relaxed">{u.resumo}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {u.doi && (
              <a
                href={`https://doi.org/${u.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] flex items-center gap-1 text-blue-600 hover:underline"
              >
                <ExternalLink className="w-3 h-3" /> DOI: {u.doi}
              </a>
            )}
            {u.afeta_guidelines.length > 0 && (
              <span className="text-[10px] text-slate-400 italic">
                Afeta: {u.afeta_guidelines.join(', ')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
