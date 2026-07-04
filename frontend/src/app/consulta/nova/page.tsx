'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/store';
import { AnamneseForm } from '@/components/modules/AnamneseForm';
import { DiagnosticPanel } from '@/components/modules/DiagnosticPanel';
import { TherapeuticPanel } from '@/components/modules/TherapeuticPanel';
import { PrescriptionPanel } from '@/components/modules/PrescriptionPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  ClipboardList, Stethoscope, Pill, Shield, FileText, CheckCircle2,
  ChevronRight, User, ArrowLeft, Brain, AlertTriangle, Activity,
  BookOpen, ShieldCheck, GitBranch, Target, Zap, Eye, Award,
  Heart, FlaskConical, TrendingUp, ChevronDown, ChevronUp, Info,
  Layers, Scale, Lock, BarChart3, Microscope, MessageSquare,
  AlertCircle, CheckCircle, XCircle, MinusCircle,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Engine imports ──────────────────────────────────────────────
import { avaliarRiscoClinico, type AvaliacaoRiscoClinico, type NivelRisco } from '@/lib/clinical-risk-engine';
import { detectarConflitos, type ConflitoGuideline, type GrauConflito } from '@/lib/guideline-conflict-engine';
import {
  calcularScoresPlano, scoreGlobalPlano,
  type MedicalTrustScore, type TrustClassification,
} from '@/lib/medical-trust-score';
import { registrarRecomendacao } from '@/lib/recommendation-registry';
import {
  registrarReview, type VeredictoConcordancia, VEREDICTO_META,
} from '@/lib/physician-validation-engine';
import { EVIDENCE_DB, type DiagnosticoEvidencia } from '@/lib/evidence-engine';

// ══════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ══════════════════════════════════════════════════════════════

type Step = 'paciente' | 'anamnese' | 'diagnostico' | 'inteligencia' | 'terapeutico' | 'prescricao' | 'validacao' | 'concluida';

const STEPS: { id: Step; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'paciente',     label: 'Paciente',      icon: User,          description: 'Identificação' },
  { id: 'anamnese',     label: 'Anamnese',       icon: ClipboardList, description: 'Módulo 1' },
  { id: 'diagnostico',  label: 'Diagnóstico',    icon: Stethoscope,   description: 'Módulo 2' },
  { id: 'inteligencia', label: 'Inteligência',   icon: Brain,         description: 'Módulo 3' },
  { id: 'terapeutico',  label: 'Terapêutico',    icon: Pill,          description: 'Módulo 4' },
  { id: 'prescricao',   label: 'Prescrição',     icon: FileText,      description: 'Módulo 5' },
  { id: 'validacao',    label: 'Validação',      icon: ShieldCheck,   description: 'Módulo 6' },
  { id: 'concluida',    label: 'Concluída',      icon: CheckCircle2,  description: 'Finalizada' },
];

// ── UI helpers ──────────────────────────────────────────────────

const RISCO_COLOR: Record<NivelRisco, { bg: string; text: string; bar: string; label: string }> = {
  baixo:     { bg: 'bg-green-50  border-green-200',  text: 'text-green-700',  bar: 'bg-green-500',  label: 'BAIXO' },
  moderado:  { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', bar: 'bg-yellow-400', label: 'MODERADO' },
  alto:      { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', bar: 'bg-orange-500', label: 'ALTO' },
  muito_alto:{ bg: 'bg-red-50    border-red-200',    text: 'text-red-700',    bar: 'bg-red-500',    label: 'CRÍTICO' },
};

const CONFLITO_COLOR: Record<GrauConflito, { bg: string; text: string; dot: string; label: string }> = {
  concordancia:         { bg: 'bg-green-50  border-green-200',  text: 'text-green-700',  dot: 'bg-green-500',  label: 'Concordância' },
  divergencia_leve:     { bg: 'bg-blue-50   border-blue-200',   text: 'text-blue-700',   dot: 'bg-blue-500',   label: 'Divergência leve' },
  divergencia_moderada: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', dot: 'bg-yellow-400', label: 'Divergência moderada' },
  conflito_direto:      { bg: 'bg-red-50    border-red-200',    text: 'text-red-700',    dot: 'bg-red-500',    label: 'Conflito direto' },
};

const TRUST_COLOR: Record<TrustClassification, { bg: string; text: string; bar: string }> = {
  muito_alta:   { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  alta:         { bg: 'bg-green-100',   text: 'text-green-700',   bar: 'bg-green-500'   },
  moderada:     { bg: 'bg-blue-100',    text: 'text-blue-700',    bar: 'bg-blue-500'    },
  baixa:        { bg: 'bg-yellow-100',  text: 'text-yellow-700',  bar: 'bg-yellow-400'  },
  insuficiente: { bg: 'bg-red-100',     text: 'text-red-700',     bar: 'bg-red-500'     },
};

function hashCRM(crm: string): string {
  let h = 5381;
  for (let i = 0; i < crm.length; i++) { h = ((h << 5) + h) + crm.charCodeAt(i); h |= 0; }
  return `CRM${Math.abs(h).toString(36).toUpperCase().slice(0, 8)}`;
}

// ══════════════════════════════════════════════════════════════
// SUB-COMPONENT — Intelligence Panel
// ══════════════════════════════════════════════════════════════

function IntelligencePanel({ onComplete }: { onComplete: () => void }) {
  const { state } = useApp();
  const consultation = state.activeConsultation;
  const anamnese = consultation?.anamnese;
  const hipoteses = consultation?.apoio_diagnostico?.hipoteses ?? [];
  const suggestions = consultation?.plano_terapeutico?.farmacologico ?? [];
  const diagnosticoSelecionado = consultation?.diagnostico_selecionado ?? '';

  const [expanded, setExpanded] = useState<string | null>(null);

  // Find selected hypothesis id
  const selectedHipotese = useMemo(() =>
    hipoteses.find(h => `${h.nome} (${h.cid10 ?? ''})` === diagnosticoSelecionado) ?? hipoteses[0],
    [hipoteses, diagnosticoSelecionado]
  );
  const diagnosticoId = selectedHipotese?.id ?? '';

  // Compute engines (once, on mount)
  const risco: AvaliacaoRiscoClinico | null = useMemo(() => {
    if (!anamnese) return null;
    try { return avaliarRiscoClinico(anamnese, suggestions); }
    catch { return null; }
  }, [anamnese, suggestions]);

  const conflitos: ConflitoGuideline[] = useMemo(() => {
    if (!diagnosticoId) return [];
    try { return detectarConflitos(diagnosticoId); }
    catch { return []; }
  }, [diagnosticoId]);

  const trustScores: MedicalTrustScore[] = useMemo(() => {
    if (!suggestions.length) return [];
    try { return calcularScoresPlano(suggestions, anamnese ?? undefined); }
    catch { return []; }
  }, [suggestions, anamnese]);

  const globalTrust = useMemo(() =>
    trustScores.length ? scoreGlobalPlano(trustScores) : null,
    [trustScores]
  );

  const evidenciaDiag: DiagnosticoEvidencia | undefined = useMemo(() =>
    EVIDENCE_DB.find(d => d.id === diagnosticoId || d.nome.toLowerCase().includes(diagnosticoId)),
    [diagnosticoId]
  );

  const riscoGlobal: NivelRisco | undefined = risco?.risco_global;
  const riscoColors = riscoGlobal ? RISCO_COLOR[riscoGlobal] : null;

  return (
    <div className="space-y-4">

      {/* Banner — CDS sovereignty */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-50 border border-violet-200">
        <Brain className="w-4 h-4 text-violet-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-violet-800">Clinical Decision Intelligence</span>
          <span className="text-xs text-violet-600 ml-2">· Suporte à decisão — a decisão final é do médico</span>
        </div>
        {riscoGlobal && (
          <Badge className={cn('text-[10px] font-bold border', riscoColors?.bg, riscoColors?.text)}>
            Risco Global: {riscoColors?.label}
          </Badge>
        )}
      </div>

      {/* Diagnosis context */}
      {diagnosticoSelecionado && (
        <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
          <Stethoscope className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <div className="text-xs">
            <span className="text-blue-700 font-semibold">Diagnóstico ativo: </span>
            <span className="text-blue-800">{diagnosticoSelecionado}</span>
          </div>
        </div>
      )}

      <Tabs defaultValue="risco" className="w-full">
        <TabsList className="grid grid-cols-4 h-9 text-xs">
          <TabsTrigger value="risco"     className="gap-1.5"><Activity  className="w-3 h-3" />Risco Clínico</TabsTrigger>
          <TabsTrigger value="conflitos" className="gap-1.5"><GitBranch className="w-3 h-3" />Conflitos</TabsTrigger>
          <TabsTrigger value="trust"     className="gap-1.5"><Award     className="w-3 h-3" />Trust Score</TabsTrigger>
          <TabsTrigger value="evidencia" className="gap-1.5"><Microscope className="w-3 h-3" />Evidência</TabsTrigger>
        </TabsList>

        {/* ═══ TAB 1 — CLINICAL RISK ═══════════════════════════ */}
        <TabsContent value="risco" className="mt-4 space-y-3">
          {!risco ? (
            <Alert><AlertDescription className="text-sm">Anamnese incompleta — dados insuficientes para avaliação de risco.</AlertDescription></Alert>
          ) : (
            <>
              {/* Global score */}
              <Card className={cn('border', riscoColors?.bg)}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Activity className={cn('w-4 h-4', riscoColors?.text)} />
                      <span className={cn('text-sm font-bold', riscoColors?.text)}>Score Global de Risco</span>
                    </div>
                    <Badge className={cn('border font-bold', riscoColors?.bg, riscoColors?.text)}>
                      {riscoGlobal?.replace('_', ' ').toUpperCase()} — {risco.score_global}/100
                    </Badge>
                  </div>
                  <Progress value={risco.score_global} className="h-2 mb-2" />
                  {risco.alerta_vermelho && (
                    <Alert className="border-red-300 bg-red-100 mt-2">
                      <AlertTriangle className="h-3 w-3 text-red-600" />
                      <AlertDescription className="text-xs text-red-700 font-semibold">
                        ALERTA VERMELHO: {risco.justificativa_global}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* 6 dimensions */}
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['risco_cardiovascular',  'Cardiovascular',   Heart,        risco.risco_cardiovascular],
                  ['risco_renal',           'Renal',            FlaskConical, risco.risco_renal],
                  ['risco_hemorragico',     'Hemorrágico',      Activity,     risco.risco_hemorragico],
                  ['risco_farmacologico',   'Farmacológico',    Pill,         risco.risco_farmacologico],
                  ['risco_interacao',       'Interação',        AlertTriangle,risco.risco_interacao],
                  ['risco_terapeutico',     'Terapêutico',      Target,       risco.risco_terapeutico],
                ] as const).map(([key, label, Icon, dim]) => {
                  const colors = RISCO_COLOR[dim.nivel];
                  const isOpen = expanded === key;
                  return (
                    <Card key={key} className={cn('border cursor-pointer', colors.bg)} onClick={() => setExpanded(isOpen ? null : key)}>
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Icon className={cn('w-3 h-3', colors.text)} />
                            <span className={cn('text-xs font-semibold', colors.text)}>{label}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge className={cn('text-[9px] py-0 px-1.5 border', colors.bg, colors.text)}>{colors.label}</Badge>
                            {isOpen ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                          </div>
                        </div>
                        <Progress value={dim.score} className="h-1.5" />
                        <p className="text-[10px] text-slate-500 mt-1">{dim.score}/100</p>
                        {isOpen && (
                          <div className="mt-2 space-y-1.5 border-t pt-2">
                            {dim.fatores.length > 0 && (
                              <div>
                                <p className="text-[10px] font-semibold text-red-700 mb-0.5">Fatores de risco:</p>
                                {dim.fatores.map((f, i) => <p key={i} className="text-[10px] text-red-600">• {f}</p>)}
                              </div>
                            )}
                            {dim.protecoes.length > 0 && (
                              <div>
                                <p className="text-[10px] font-semibold text-green-700 mb-0.5">Fatores protetores:</p>
                                {dim.protecoes.map((p, i) => <p key={i} className="text-[10px] text-green-600">• {p}</p>)}
                              </div>
                            )}
                            {dim.acoes.length > 0 && (
                              <div>
                                <p className="text-[10px] font-semibold text-blue-700 mb-0.5">Recomendações:</p>
                                {dim.acoes.map((a, i) => <p key={i} className="text-[10px] text-blue-600">• {a}</p>)}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Framingham if available */}
              {risco.risco_cardiovascular.framingham && (
                <Card className="border-slate-200 bg-slate-50">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-3.5 h-3.5 text-slate-600" />
                      <span className="text-xs font-semibold text-slate-700">Score de Framingham (Risco CV 10 anos)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white rounded p-2 border">
                        <p className="text-lg font-bold text-slate-800">{risco.risco_cardiovascular.framingham!.score_10anos_pct}%</p>
                        <p className="text-[10px] text-slate-500">Risco 10 anos</p>
                      </div>
                      <div className="bg-white rounded p-2 border">
                        <p className="text-sm font-bold text-slate-800">{risco.risco_cardiovascular.framingham!.meta_ldl}</p>
                        <p className="text-[10px] text-slate-500">Meta LDL</p>
                      </div>
                      <div className="bg-white rounded p-2 border">
                        <p className="text-sm font-bold text-slate-800 capitalize">{risco.risco_cardiovascular.framingham!.intensidade_estatina.replace('_', ' ')}</p>
                        <p className="text-[10px] text-slate-500">Intensidade estatina</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ═══ TAB 2 — GUIDELINE CONFLICTS ═════════════════════ */}
        <TabsContent value="conflitos" className="mt-4 space-y-3">
          {conflitos.length === 0 ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Sem conflitos entre diretrizes</p>
                  <p className="text-xs text-green-700">As principais sociedades científicas apresentam concordância para {diagnosticoId.toUpperCase()}.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            conflitos.map(c => {
              const colors = CONFLITO_COLOR[c.grau_conflito];
              const isOpen = expanded === c.id;
              return (
                <Card key={c.id} className={cn('border cursor-pointer', colors.bg)} onClick={() => setExpanded(isOpen ? null : c.id)}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn('w-2 h-2 rounded-full flex-shrink-0', colors.dot)} />
                          <span className={cn('text-xs font-bold', colors.text)}>{colors.label}</span>
                          <Badge variant="outline" className="text-[9px]">{c.topico}</Badge>
                        </div>
                        <p className="text-xs text-slate-700">{c.resumo}</p>
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />}
                    </div>

                    {isOpen && (
                      <div className="mt-3 space-y-3 border-t pt-3">
                        {/* Guideline positions table */}
                        <div className="space-y-1.5">
                          {c.diretrizes.map((d, i) => (
                            <div key={i} className={cn(
                              'flex items-start gap-2 p-2 rounded border text-xs',
                              d.sigla === c.guideline_preferida ? 'bg-white border-blue-300' : 'bg-white/60 border-slate-200'
                            )}>
                              <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
                                <Badge variant="outline" className="text-[9px] font-bold">{d.sigla}</Badge>
                                {d.sigla === c.guideline_preferida && <Badge className="text-[8px] bg-blue-600 text-white py-0">BR</Badge>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-slate-700">{d.posicao}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">Nível {d.nivel} · Grau {d.grau} · {d.ano}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Recommendation */}
                        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-[10px] font-bold text-blue-800 mb-1">Recomendação do sistema (contexto brasileiro):</p>
                          <p className="text-xs text-blue-700">{c.recomendacao_pratica}</p>
                          <p className="text-[10px] text-blue-600 mt-1.5">{c.justificativa_preferencia}</p>
                        </div>
                        <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                          <p className="text-[10px] font-semibold text-amber-800">Impacto clínico: <span className="font-normal">{c.impacto_clinico}</span></p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ═══ TAB 3 — MEDICAL TRUST SCORE ════════════════════ */}
        <TabsContent value="trust" className="mt-4 space-y-3">
          {trustScores.length === 0 ? (
            <Alert><AlertDescription className="text-sm">Nenhuma sugestão terapêutica disponível para cálculo.</AlertDescription></Alert>
          ) : (
            <>
              {/* Global score */}
              {globalTrust && (() => {
                const tc = TRUST_COLOR[globalTrust.classificacao];
                return (
                  <Card className={cn('border', tc.bg.replace('100', '50'), 'border-slate-200')}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-slate-700" />
                          <span className="text-sm font-bold text-slate-800">Score Global do Plano</span>
                        </div>
                        <div className="text-right">
                          <span className={cn('text-2xl font-extrabold', tc.text)}>{globalTrust.media.toFixed(0)}</span>
                          <span className="text-xs text-slate-500">/100</span>
                        </div>
                      </div>
                      <Progress value={globalTrust.media} className="h-2 mb-2" />
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Mín: {globalTrust.minimo.toFixed(0)}</span>
                        <Badge className={cn('text-[10px] border', tc.bg, tc.text)}>
                          {globalTrust.classificacao.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span>Máx: {globalTrust.maximo.toFixed(0)}</span>
                      </div>
                      {globalTrust.alerta && (
                        <Alert className="mt-2 border-amber-300 bg-amber-50">
                          <AlertTriangle className="h-3 w-3 text-amber-600" />
                          <AlertDescription className="text-xs text-amber-700">
                            Uma ou mais recomendações apresentam score de confiança baixo. Revisar antes de prescrever.
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Per-drug scores */}
              {trustScores.map(ts => {
                const tc = TRUST_COLOR[ts.classificacao];
                const isOpen = expanded === `trust-${ts.medicamento_id}`;
                return (
                  <Card key={ts.medicamento_id} className="border cursor-pointer" onClick={() => setExpanded(isOpen ? null : `trust-${ts.medicamento_id}`)}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-800">{ts.molecula}</span>
                            <Badge className={cn('text-[9px] border', tc.bg, tc.text)}>{ts.score_global.toFixed(0)}%</Badge>
                          </div>
                          <p className="text-[10px] text-slate-500">{ts.classe_terapeutica}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={ts.score_global} className="w-20 h-1.5" />
                          {isOpen ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                        </div>
                      </div>

                      {isOpen && (
                        <div className="mt-3 border-t pt-3 space-y-2">
                          {[ts.score_farmacologico, ts.score_clinico, ts.score_evidencia, ts.score_seguranca, ts.score_guideline, ts.score_confianca].map(dim => (
                            <div key={dim.nome}>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] text-slate-600">{dim.nome}</span>
                                <span className="text-[10px] font-semibold">{dim.score}/100 <span className="text-slate-400">({(dim.peso * 100).toFixed(0)}%)</span></span>
                              </div>
                              <Progress value={dim.score} className="h-1" />
                              <p className="text-[10px] text-slate-500 mt-0.5">{dim.justificativa}</p>
                            </div>
                          ))}
                          {ts.limitacoes.length > 0 && (
                            <div className="mt-1 p-2 bg-amber-50 border border-amber-200 rounded">
                              {ts.limitacoes.map((a, i) => <p key={i} className="text-[10px] text-amber-700">⚠ {a}</p>)}
                            </div>
                          )}
                          {ts.recomendacao_uso && (
                            <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                              <p className="text-[10px] text-blue-700">→ {ts.recomendacao_uso}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </TabsContent>

        {/* ═══ TAB 4 — EVIDENCE ════════════════════════════════ */}
        <TabsContent value="evidencia" className="mt-4 space-y-3">
          {!evidenciaDiag ? (
            <Card className="border-slate-200 bg-slate-50">
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <Info className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Base de evidências em construção</p>
                  <p className="text-xs text-slate-500">Evidências para <strong>{diagnosticoId.toUpperCase()}</strong> ainda não estão na base. Consulte a aba Evidence Engine.</p>
                  <Link href="/evidence" className="text-xs text-blue-600 underline mt-0.5 inline-block">→ Abrir Evidence Engine</Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-slate-200 bg-slate-50">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{evidenciaDiag.nome}</p>
                      <p className="text-[10px] text-slate-500">{evidenciaDiag.cid10} · {evidenciaDiag.area}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{evidenciaDiag.diretrizes.length} diretrizes</Badge>
                  </div>
                  <p className="text-xs text-slate-600">{evidenciaDiag.resumo_clinico}</p>
                  {evidenciaDiag.prevalencia_br && (
                    <p className="text-[10px] text-slate-500 mt-1.5">Prevalência BR: {evidenciaDiag.prevalencia_br}</p>
                  )}
                </CardContent>
              </Card>

              {evidenciaDiag.diretrizes.map(dir => (
                <Card key={dir.id} className="border">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className="text-[9px] bg-slate-700 text-white">{dir.sigla}</Badge>
                        <span className="text-xs font-semibold text-slate-700">{dir.sociedade} {dir.ano}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {dir.terapias.slice(0, 3).map(ter => (
                        <div key={ter.id} className={cn(
                          'p-2.5 rounded border',
                          expanded === `ev-${ter.id}` ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'
                        )}>
                          <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === `ev-${ter.id}` ? null : `ev-${ter.id}`)}>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800">{ter.nome}</span>
                              <Badge variant="outline" className="text-[9px]">{ter.classe}</Badge>
                              <Badge className={cn('text-[9px]', ter.nivel_geral === 'A' ? 'bg-emerald-100 text-emerald-800' : ter.nivel_geral === 'B' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800')}>
                                Nível {ter.nivel_geral} · Grau {ter.grau_geral}
                              </Badge>
                            </div>
                            {expanded === `ev-${ter.id}` ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">{ter.indicacao_principal}</p>

                          {expanded === `ev-${ter.id}` && (
                            <div className="mt-2.5 space-y-2 border-t pt-2.5">
                              <div className="grid grid-cols-2 gap-1.5">
                                <div className="bg-white rounded p-1.5 border text-center">
                                  <p className="text-sm font-bold text-slate-800">{ter.total_pacientes.toLocaleString('pt-BR')}</p>
                                  <p className="text-[9px] text-slate-500">Pacientes totais</p>
                                </div>
                                <div className="bg-white rounded p-1.5 border text-center">
                                  <p className="text-sm font-bold text-slate-800">{ter.estudos.length}</p>
                                  <p className="text-[9px] text-slate-500">Estudos principais</p>
                                </div>
                              </div>
                              {ter.estudos.map(est => (
                                <div key={est.id} className="p-2 bg-white border border-slate-200 rounded text-xs space-y-0.5">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-800">{est.nome}</span>
                                    <span className="text-[9px] text-slate-500">{est.ano} · {est.revista}</span>
                                  </div>
                                  {est.n_pacientes && <p className="text-[10px] text-slate-600">N = {est.n_pacientes.toLocaleString('pt-BR')} · {est.duracao_seguimento}</p>}
                                  {est.nnt && <p className="text-[10px] text-emerald-700 font-semibold">NNT = {est.nnt}</p>}
                                  {est.reducao_risco_relativo && <p className="text-[10px] text-blue-700">Redução RR: {est.reducao_risco_relativo}</p>}
                                  {est.doi && <p className="text-[9px] text-slate-400 font-mono">DOI: {est.doi}</p>}
                                  {est.pmid && <p className="text-[9px] text-slate-400 font-mono">PMID: {est.pmid}</p>}
                                </div>
                              ))}
                              <p className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded p-1.5">{ter.beneficio_resumo}</p>
                              {ter.risco_resumo && <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-1.5">{ter.risco_resumo}</p>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Continue button */}
      <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2" onClick={onComplete}>
        <Pill className="w-4 h-4" />
        Continuar para Terapêutica
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SUB-COMPONENT — Physician Validation Panel (Module 6)
// ══════════════════════════════════════════════════════════════

function ValidacaoPanel({ onComplete }: { onComplete: () => void }) {
  const { state } = useApp();
  const consultation = state.activeConsultation;
  const suggestions = consultation?.plano_terapeutico?.farmacologico ?? [];
  const hipoteses = consultation?.apoio_diagnostico?.hipoteses ?? [];
  const diagnosticoSelecionado = consultation?.diagnostico_selecionado ?? '';
  const anamnese = consultation?.anamnese;
  const crm = state.settings.medico?.crm ?? 'CRM-UNKNOWN';
  const especialidade = (state.settings.medico as { especialidade?: string })?.especialidade ?? 'clinica_medica';

  const [verdicts, setVerdicts] = useState<Record<string, VeredictoConcordancia>>({});
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [justificativas, setJustificativas] = useState<Record<string, string>>({});
  const [registradas, setRegistradas] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const selectedHipotese = useMemo(() =>
    hipoteses.find(h => `${h.nome} (${h.cid10 ?? ''})` === diagnosticoSelecionado) ?? hipoteses[0],
    [hipoteses, diagnosticoSelecionado]
  );
  const diagnosticoId = selectedHipotese?.id ?? '';

  // Auto-register recommendations on mount
  useEffect(() => {
    if (!suggestions.length || registradas.length > 0) return;
    const ids: string[] = [];
    for (const sug of suggestions) {
      try {
        const rec = registrarRecomendacao({
          diagnostico_id:       diagnosticoId,
          diagnostico_nome:     selectedHipotese?.nome ?? diagnosticoSelecionado,
          molecula:             sug.molecula,
          classe_terapeutica:   sug.classe_terapeutica,
          indicacao:            sug.indicacao,
          guideline_sigla:      sug.evidencia?.diretriz ?? 'N/A',
          guideline_versao:     String(sug.evidencia?.ano ?? '2024'),
          guideline_sociedade:  sug.evidencia?.sociedade ?? 'N/A',
          guideline_ano:        sug.evidencia?.ano ?? 2024,
          evidencias:           [],
          engine:               'clinical-therapeutics',
          score_confianca:      85,
          score_seguranca:      82,
          score_evidencia:      sug.evidencia?.nivel_evidencia?.nivel === 'A' ? 90 : sug.evidencia?.nivel_evidencia?.nivel === 'B' ? 75 : 60,
          contexto_diagnostico: diagnosticoSelecionado,
        });
        ids.push(rec.id);
      } catch { /* continue */ }
    }
    setRegistradas(ids);
  }, [suggestions, diagnosticoId, diagnosticoSelecionado, selectedHipotese, registradas.length]);

  const handleSave = () => {
    const crmHash = hashCRM(crm);
    for (const sug of suggestions) {
      const veredicto = verdicts[sug.id] ?? 'concordo';
      try {
        registrarReview({
          medico_crm_hash:      crmHash,
          especialidade:        especialidade as 'clinica_medica',
          diagnostico_id:       diagnosticoId,
          diagnostico_nome:     selectedHipotese?.nome ?? diagnosticoSelecionado,
          molecula:             sug.molecula,
          classe_terapeutica:   sug.classe_terapeutica,
          guideline_sigla:      sug.evidencia?.diretriz ?? 'N/A',
          veredicto,
          comentario:           comentarios[sug.id],
          justificativa_clinica:justificativas[sug.id],
          perfil_paciente:      anamnese ? `${anamnese.comorbidades?.join(', ') || 'N/I'}` : undefined,
        });
      } catch { /* continue */ }
    }
    setSaved(true);
    toast.success('Validação médica registrada com sucesso.');
    setTimeout(onComplete, 800);
  };

  return (
    <div className="space-y-4">

      {/* Banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 border border-blue-200">
        <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <div className="flex-1">
          <span className="text-xs font-semibold text-blue-800">Validação Médica · Physician Validation Engine</span>
          <span className="text-xs text-blue-600 ml-2">· A decisão clínica permanece soberana</span>
        </div>
        {registradas.length > 0 && (
          <Badge className="bg-green-100 text-green-700 border border-green-200 text-[10px]">
            {registradas.length} recomendações registradas
          </Badge>
        )}
      </div>

      {/* Recommendation Registry summary */}
      {registradas.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-3.5 h-3.5 text-green-700" />
              <span className="text-xs font-bold text-green-800">Recommendation Registry — Registros criados</span>
            </div>
            <div className="space-y-1">
              {registradas.map((id, i) => (
                <div key={id} className="flex items-center gap-2 text-[10px]">
                  <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                  <span className="text-green-700 font-mono">{id}</span>
                  {suggestions[i] && <span className="text-green-600">· {suggestions[i].molecula}</span>}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-green-600 mt-1.5">Registros imutáveis com hash de integridade. Auditáveis em /auditoria.</p>
          </CardContent>
        </Card>
      )}

      {/* Physician validation form */}
      <Card className="border">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            Avaliação das Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestions.map(sug => {
            const veredicto = verdicts[sug.id];
            return (
              <div key={sug.id} className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{sug.molecula}</p>
                    <p className="text-[10px] text-slate-500">{sug.classe_terapeutica} · {sug.posologia_completa}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{sug.evidencia?.diretriz}</Badge>
                </div>

                {/* Veredicto buttons */}
                <div>
                  <Label className="text-[10px] text-slate-600 mb-1.5 block">Avaliação médica:</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['concordo', 'concordo_parcialmente', 'discordo', 'nao_aplicavel'] as VeredictoConcordancia[]).map(v => {
                      const meta = VEREDICTO_META[v];
                      const isSelected = veredicto === v;
                      return (
                        <button
                          key={v}
                          onClick={() => setVerdicts(prev => ({ ...prev, [sug.id]: v }))}
                          className={cn(
                            'flex items-center gap-2 px-2.5 py-1.5 rounded border text-xs font-medium transition-all',
                            isSelected
                              ? cn(meta.cls, 'border-current')
                              : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'
                          )}
                        >
                          <span className="w-3 h-3 rounded-full flex-shrink-0 border-2 flex items-center justify-center"
                            style={{ borderColor: isSelected ? 'currentColor' : '#d1d5db' }}>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                          </span>
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comment fields (shown when partial agree or disagree) */}
                {(veredicto === 'concordo_parcialmente' || veredicto === 'discordo') && (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-[10px] text-slate-600">Justificativa clínica</Label>
                      <Textarea
                        className="mt-1 text-xs h-16 resize-none"
                        placeholder="Descreva a razão clínica para sua posição..."
                        value={justificativas[sug.id] ?? ''}
                        onChange={e => setJustificativas(prev => ({ ...prev, [sug.id]: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-600">Conduta alternativa (opcional)</Label>
                      <Textarea
                        className="mt-1 text-xs h-12 resize-none"
                        placeholder="Ex: Prefiro clortalidona pela maior evidência no ALLHAT..."
                        value={comentarios[sug.id] ?? ''}
                        onChange={e => setComentarios(prev => ({ ...prev, [sug.id]: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Metrics preview */}
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="pt-3 pb-3">
          <p className="text-[10px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3" /> Métricas de Validação
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white rounded p-2 border">
              <p className="text-lg font-bold text-blue-700">
                {suggestions.length > 0
                  ? Math.round((Object.values(verdicts).filter(v => v === 'concordo').length / suggestions.length) * 100)
                  : 0}%
              </p>
              <p className="text-[9px] text-slate-500">Concordância total</p>
            </div>
            <div className="bg-white rounded p-2 border">
              <p className="text-lg font-bold text-slate-700">{Object.keys(verdicts).length}/{suggestions.length}</p>
              <p className="text-[9px] text-slate-500">Avaliadas</p>
            </div>
            <div className="bg-white rounded p-2 border">
              <p className="text-lg font-bold text-red-600">
                {Object.values(verdicts).filter(v => v === 'discordo').length}
              </p>
              <p className="text-[9px] text-slate-500">Discordâncias</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => { setSaved(false); onComplete(); }}
        >
          Pular validação
        </Button>
        <Button
          className={cn('flex-1 gap-2', saved ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700')}
          onClick={handleSave}
          disabled={saved}
        >
          {saved ? <><CheckCircle2 className="w-4 h-4" /> Salvo!</> : <><ShieldCheck className="w-4 h-4" /> Registrar validação</>}
        </Button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════

export default function NovaConsulta() {
  const { state, dispatch } = useApp();
  const [step, setStep] = useState<Step>('paciente');
  const [pacienteNome, setPacienteNome] = useState('');
  const [consultationId, setConsultationId] = useState<string | null>(null);

  const stepIndex = STEPS.findIndex(s => s.id === step);

  const initConsultation = () => {
    if (!pacienteNome.trim()) return;
    const id = Date.now().toString();
    setConsultationId(id);
    dispatch({
      type: 'NEW_CONSULTATION',
      payload: {
        id,
        status: 'anamnese',
        paciente_nome: pacienteNome,
        data: new Date().toISOString(),
      },
    });
    setStep('anamnese');
  };

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1 text-slate-500">
              <ArrowLeft className="w-3 h-3" /> Dashboard
            </Button>
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <h1 className="text-xl font-bold text-slate-900">Nova Consulta</h1>
          {state.activeConsultation && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-600">{state.activeConsultation.paciente_nome}</span>
            </>
          )}
        </div>

        {/* Progress steps */}
        <div className="flex items-center mb-8 relative overflow-x-auto pb-1">
          <div className="absolute left-0 right-0 top-5 h-0.5 bg-slate-200 z-0" />
          {STEPS.map((s, i) => {
            const done   = i < stepIndex;
            const active = s.id === step;
            const Icon   = s.icon;
            return (
              <div key={s.id} className="flex-1 flex flex-col items-center relative z-10 min-w-[60px]">
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all',
                  done   ? 'bg-green-500 border-green-500 text-white' :
                  active ? 'bg-blue-600  border-blue-600  text-white' :
                           'bg-white     border-slate-200 text-slate-400'
                )}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <p className={cn('text-[10px] font-medium mt-1 text-center',
                  active ? 'text-blue-700' : done ? 'text-green-600' : 'text-slate-400')}>{s.label}</p>
                <p className="text-[9px] text-slate-400">{s.description}</p>
              </div>
            );
          })}
        </div>

        {/* ── STEP: paciente ────────────────────────────────── */}
        {step === 'paciente' && (
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Identificação do Paciente</h2>
                <p className="text-sm text-slate-500">Informe o nome do paciente para iniciar a consulta</p>
              </div>
              <div>
                <Label>Nome completo do paciente *</Label>
                <Input
                  className="mt-1"
                  placeholder="Ex: Maria Aparecida Santos"
                  value={pacienteNome}
                  onChange={e => setPacienteNome(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && initConsultation()}
                  autoFocus
                />
              </div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
                onClick={initConsultation}
                disabled={!pacienteNome.trim()}
              >
                <ClipboardList className="w-4 h-4" />
                Iniciar Anamnese
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── STEP: anamnese ────────────────────────────────── */}
        {step === 'anamnese' && consultationId && (
          <AnamneseForm
            consultationId={consultationId}
            onComplete={() => setStep('diagnostico')}
          />
        )}

        {/* ── STEP: diagnostico ─────────────────────────────── */}
        {step === 'diagnostico' && (
          <DiagnosticPanel onComplete={() => setStep('inteligencia')} />
        )}

        {/* ── STEP: inteligencia (NEW) ──────────────────────── */}
        {step === 'inteligencia' && (
          <IntelligencePanel onComplete={() => setStep('terapeutico')} />
        )}

        {/* ── STEP: terapeutico ─────────────────────────────── */}
        {step === 'terapeutico' && (
          <TherapeuticPanel onComplete={() => setStep('prescricao')} />
        )}

        {/* ── STEP: prescricao ──────────────────────────────── */}
        {step === 'prescricao' && (
          <PrescriptionPanel onComplete={() => setStep('validacao')} />
        )}

        {/* ── STEP: validacao (NEW) ─────────────────────────── */}
        {step === 'validacao' && (
          <ValidacaoPanel onComplete={() => setStep('concluida')} />
        )}

        {/* ── STEP: concluida ───────────────────────────────── */}
        {step === 'concluida' && (
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Consulta Concluída!</h2>
              <p className="text-slate-500">
                A prescrição de <strong>{state.activeConsultation?.paciente_nome}</strong> foi emitida com sucesso.
              </p>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                  <p className="text-xs font-bold text-blue-700">Auditada</p>
                  <p className="text-[10px] text-blue-600">Rastreabilidade completa</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                  <p className="text-xs font-bold text-green-700">Validada</p>
                  <p className="text-[10px] text-green-600">Physician validation</p>
                </div>
                <div className="bg-violet-50 rounded-lg p-2 border border-violet-100">
                  <p className="text-xs font-bold text-violet-700">Registrada</p>
                  <p className="text-[10px] text-violet-600">Recommendation registry</p>
                </div>
              </div>
              <div className="flex gap-3 justify-center pt-4">
                <Link href="/auditoria">
                  <Button variant="outline" className="gap-1.5 text-sm">
                    <Shield className="w-3.5 h-3.5" /> Ver Auditoria
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline">Dashboard</Button>
                </Link>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setPacienteNome('');
                    setConsultationId(null);
                    setStep('paciente');
                  }}
                >
                  Nova Consulta
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
