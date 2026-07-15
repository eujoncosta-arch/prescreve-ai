'use client';

import { useMemo } from 'react';
import { useApp } from '@/lib/store';
import { gerarExplanacao } from '@/lib/explainable-ai';
import { getBeneficios, getEstudosChave } from '@/lib/evidence-library';
import type { TherapeuticSuggestion } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  Users,
  Lightbulb,
  FlaskConical,
  BookOpen,
  ShieldAlert,
  ExternalLink,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Mini badge helpers ──────────────────────────────────────

const FONTE_LABEL: Record<string, string> = {
  sinais_vitais: 'Sinais Vitais',
  laboratorio: 'Laboratório',
  comorbidade: 'Comorbidade',
  cds: 'Motor CDS',
  habitos: 'Hábitos',
  funcao_renal: 'Função Renal',
  funcao_hepatica: 'Função Hepática',
  anamnese: 'Anamnese',
};

const FONTE_COLOR: Record<string, string> = {
  sinais_vitais: 'bg-blue-100 text-blue-700',
  laboratorio: 'bg-purple-100 text-purple-700',
  comorbidade: 'bg-teal-100 text-teal-700',
  cds: 'bg-indigo-100 text-indigo-700',
  habitos: 'bg-orange-100 text-orange-700',
  funcao_renal: 'bg-cyan-100 text-cyan-700',
  funcao_hepatica: 'bg-amber-100 text-amber-700',
  anamnese: 'bg-slate-100 text-slate-700',
};

const TIPO_ICON = {
  favoravel: <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />,
  alerta:   <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />,
  neutro:   <Activity      className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />,
};

const CONFIANCA_COLOR = {
  green:  { bar: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
  yellow: { bar: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  orange: { bar: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  red:    { bar: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
};

// ─── Component ───────────────────────────────────────────────

interface Props {
  med: TherapeuticSuggestion;
}

export function ExplainableAI({ med }: Props) {
  const { state } = useApp();
  const anamnese   = state.activeConsultation?.anamnese;
  const apoio      = state.activeConsultation?.apoio_diagnostico;
  const hipotese   = apoio?.hipoteses?.[0];

  const exp = useMemo(
    () => gerarExplanacao(med, anamnese, hipotese),
    [med, anamnese, hipotese],
  );

  const beneficios  = getBeneficios(med.id);
  const estudos     = getEstudosChave(med.id);
  const cor         = CONFIANCA_COLOR[exp.cor_confianca];

  const favoraveis = exp.achados_relevantes.filter(a => a.tipo === 'favoravel');
  const alertas    = exp.achados_relevantes.filter(a => a.tipo === 'alerta');
  const neutros    = exp.achados_relevantes.filter(a => a.tipo === 'neutro');

  return (
    <Dialog>
      <DialogTrigger>
        <span
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
        >
          <Brain className="w-3 h-3" />
          Por que estou vendo esta recomendação?
        </span>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Brain className="w-5 h-5 text-indigo-600" />
            Explicação Clínica — {med.molecula}
          </DialogTitle>

          {/* Confidence bar */}
          <div className={cn('mt-3 p-3 rounded-lg border', cor.bg)}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={cn('text-xs font-semibold', cor.text)}>{exp.label_confianca}</span>
              <span className={cn('text-xs font-bold', cor.text)}>{exp.nivel_confianca}%</span>
            </div>
            <div className="w-full bg-white/60 rounded-full h-2">
              <div
                className={cn('h-2 rounded-full transition-all', cor.bar)}
                style={{ width: `${exp.nivel_confianca}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1.5">Adequação ao perfil deste paciente · Suporte à decisão clínica</p>
          </div>

          {/* Security flags */}
          {exp.flags_seguranca.length > 0 && (
            <div className="mt-2 space-y-1">
              {exp.flags_seguranca.map((f, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-red-700 font-medium">{f}</span>
                </div>
              ))}
            </div>
          )}
        </DialogHeader>

        <Tabs defaultValue="achados" className="mt-2">
          <TabsList className="grid w-full grid-cols-5 h-auto gap-0.5 text-[10px]">
            <TabsTrigger value="achados" className="flex-col gap-0.5 h-auto min-w-0 px-0.5 py-1">
              <Activity className="size-3.5 shrink-0" />
              <span className="max-w-full truncate">Achados</span>
            </TabsTrigger>
            <TabsTrigger value="diretriz" className="flex-col gap-0.5 h-auto min-w-0 px-0.5 py-1">
              <BookOpen className="size-3.5 shrink-0" />
              <span className="max-w-full truncate">Diretriz</span>
            </TabsTrigger>
            <TabsTrigger value="beneficios" className="flex-col gap-0.5 h-auto min-w-0 px-0.5 py-1">
              <TrendingUp className="size-3.5 shrink-0" />
              <span className="max-w-full truncate">Benefícios</span>
            </TabsTrigger>
            <TabsTrigger value="limitacoes" className="flex-col gap-0.5 h-auto min-w-0 px-0.5 py-1">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span className="max-w-full truncate">Limitações</span>
            </TabsTrigger>
            <TabsTrigger value="estudos" className="flex-col gap-0.5 h-auto min-w-0 px-0.5 py-1">
              <FlaskConical className="size-3.5 shrink-0" />
              <span className="max-w-full truncate">Estudos</span>
            </TabsTrigger>
          </TabsList>

          {/* ── ABA 1: Achados Relevantes ───────────────── */}
          <TabsContent value="achados" className="space-y-3 mt-3">
            <p className="text-xs text-slate-500 italic">Dados deste paciente que fundamentam a recomendação.</p>

            {favoraveis.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-700 mb-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Achados favoráveis ({favoraveis.length})
                </p>
                <div className="space-y-1.5">
                  {favoraveis.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs bg-green-50 rounded-md px-2.5 py-2">
                      {TIPO_ICON.favoravel}
                      <span className="text-slate-700 flex-1">{a.texto}</span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0', FONTE_COLOR[a.fonte])}>
                        {FONTE_LABEL[a.fonte]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alertas.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Pontos de atenção ({alertas.length})
                </p>
                <div className="space-y-1.5">
                  {alertas.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs bg-amber-50 rounded-md px-2.5 py-2">
                      {TIPO_ICON.alerta}
                      <span className="text-slate-700 flex-1">{a.texto}</span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0', FONTE_COLOR[a.fonte])}>
                        {FONTE_LABEL[a.fonte]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {neutros.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" /> Contexto clínico ({neutros.length})
                </p>
                <div className="space-y-1.5">
                  {neutros.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs bg-slate-50 rounded-md px-2.5 py-2">
                      {TIPO_ICON.neutro}
                      <span className="text-slate-600 flex-1">{a.texto}</span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0', FONTE_COLOR[a.fonte])}>
                        {FONTE_LABEL[a.fonte]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {exp.achados_relevantes.length === 0 && (
              <div className="text-xs text-slate-400 italic text-center py-4">
                Preencha a anamnese para ver achados específicos do paciente.
              </div>
            )}

            {/* Perfil ideal match */}
            {exp.compatibilidade_perfil.length > 0 && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  Compatibilidade com perfil ideal — {exp.pct_compatibilidade}%
                </p>
                <div className="space-y-1">
                  {exp.compatibilidade_perfil.map((p, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs">
                      {p.compativel
                        ? <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                        : <span className="w-3 h-3 rounded-full border border-slate-300 flex-shrink-0 mt-0.5" />
                      }
                      <span className={p.compativel ? 'text-slate-700' : 'text-slate-400'}>{p.item}</span>
                      {p.evidencia && (
                        <span className="ml-auto text-[10px] text-green-600 flex-shrink-0">✓ {p.evidencia}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── ABA 2: Diretriz ─────────────────────────── */}
          <TabsContent value="diretriz" className="space-y-3 mt-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-bold text-blue-800 mb-1">{med.evidencia.diretriz}</p>
              <p className="text-xs text-blue-700">
                {med.evidencia.sociedade} · {med.evidencia.ano}
              </p>
              <div className="flex gap-2 mt-2">
                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">
                  Nível {med.evidencia.nivel_evidencia.nivel}
                </span>
                <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-semibold">
                  Grau {med.evidencia.nivel_evidencia.grau}
                </span>
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <p className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                Racionalidade clínica
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">{exp.racionalidade}</p>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <p className="text-xs font-semibold text-slate-700 mb-1">Indicação</p>
              <p className="text-xs text-slate-600">{med.indicacao}</p>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <p className="text-xs font-semibold text-slate-700 mb-1">Alternativas recomendadas</p>
              <ul className="space-y-1">
                {med.alternativas.map((alt, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                    <span className="text-blue-400 flex-shrink-0">•</span> {alt}
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          {/* ── ABA 3: Benefícios ───────────────────────── */}
          <TabsContent value="beneficios" className="space-y-2 mt-3">
            <p className="text-xs text-slate-500 italic">Benefícios com suporte em ensaios clínicos randomizados.</p>
            {beneficios.length > 0 ? (
              <ul className="space-y-2">
                {beneficios.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs bg-green-50 border border-green-100 rounded-md px-3 py-2">
                    <TrendingUp className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{b}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-slate-400 italic text-center py-4">
                Dados de benefício não disponíveis para esta molécula na biblioteca.
              </div>
            )}
          </TabsContent>

          {/* ── ABA 4: Limitações ───────────────────────── */}
          <TabsContent value="limitacoes" className="space-y-3 mt-3">
            <p className="text-xs text-slate-500 italic">Limitações específicas para este paciente.</p>

            {exp.limitacoes_especificas.length > 0 ? (
              <div className="space-y-2">
                {exp.limitacoes_especificas.map((lim, i) => {
                  const gravBg = lim.gravidade === 'grave'
                    ? 'bg-red-50 border-red-200'
                    : lim.gravidade === 'moderada'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-yellow-50 border-yellow-200';
                  const gravText = lim.gravidade === 'grave'
                    ? 'text-red-700'
                    : lim.gravidade === 'moderada'
                    ? 'text-orange-700'
                    : 'text-yellow-700';
                  return (
                    <div key={i} className={cn('p-3 rounded-lg border', gravBg)}>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', gravText)} />
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-xs font-semibold', gravText)}>{lim.texto}</p>
                          {lim.acao && (
                            <p className={cn('text-xs mt-1', gravText)}>
                              → {lim.acao}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('text-[9px] flex-shrink-0', gravText)}
                        >
                          {lim.gravidade}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-400 text-center py-4 italic">
                Nenhuma limitação específica identificada para este perfil.
              </div>
            )}

            {/* Contraindicações gerais */}
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <p className="text-xs font-semibold text-red-700 mb-1.5">Contraindicações gerais</p>
              <ul className="space-y-1">
                {med.contraindicacoes.map((c, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                    <span className="text-red-400 flex-shrink-0">•</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          {/* ── ABA 5: Estudos ──────────────────────────── */}
          <TabsContent value="estudos" className="space-y-2 mt-3">
            <p className="text-xs text-slate-500 italic">Ensaios clínicos que embasam esta recomendação.</p>
            {estudos.length > 0 ? (
              estudos.map((e, i) => (
                <div key={i} className="p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800">{e.nome}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {e.tipo} · {e.ano}{e.n_pacientes ? ` · n=${e.n_pacientes.toLocaleString('pt-BR')}` : ''}
                      </p>
                    </div>
                    {e.doi && (
                      <a
                        href={`https://doi.org/${e.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-0.5 text-[10px] text-blue-600 hover:underline flex-shrink-0"
                      >
                        DOI <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    <span className="font-semibold">Desfecho:</span> {e.desfecho_primario}
                  </p>
                  <p className="text-xs text-slate-700 mt-1 font-medium">{e.resultado_principal}</p>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 text-center py-4 italic">
                Estudos-chave não catalogados para esta molécula.
              </div>
            )}
          </TabsContent>
        </Tabs>

        <p className="text-[10px] text-slate-400 text-center mt-2 border-t border-slate-100 pt-2">
          Ferramenta de apoio à decisão clínica · Não substitui o julgamento médico
        </p>
      </DialogContent>
    </Dialog>
  );
}
