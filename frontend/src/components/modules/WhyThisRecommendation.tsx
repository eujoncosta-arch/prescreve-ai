'use client';

import { useState } from 'react';
import type { TherapeuticSuggestion } from '@/lib/types';
import { getBeneficios, getPerfilIdeal, getEstudosChave } from '@/lib/evidence-library';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BookOpen,
  Users,
  ArrowLeftRight,
  ExternalLink,
  TrendingUp,
  Shield,
  FlaskConical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { NIVEL_EVIDENCIA, GRAU_RECOMENDACAO } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Props {
  med: TherapeuticSuggestion;
}

const NIVEL_COLORS: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  B: 'bg-blue-100 text-blue-800 border-blue-300',
  C: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  D: 'bg-slate-100 text-slate-600 border-slate-300',
};

export function WhyThisRecommendation({ med }: Props) {
  const [openStudy, setOpenStudy] = useState<string | null>(null);

  const beneficios = getBeneficios(med.id);
  const perfilIdeal = getPerfilIdeal(med.id);
  const estudos = getEstudosChave(med.id);

  return (
    <Dialog>
      <DialogTrigger>
        <span className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer">
          <HelpCircle className="w-3 h-3" />
          Por que esta recomendação?
        </span>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <span>Por que {med.molecula}?</span>
              <p className="text-sm font-normal text-slate-500 mt-0.5">{med.classe_terapeutica}</p>
            </div>
          </DialogTitle>

          {/* Pipeline compacto */}
          <div className="flex items-center gap-1 flex-wrap mt-3 text-[10px]">
            <PipelineTag color="blue" label="Indicação" value={med.indicacao.split('—')[0].trim()} />
            <Arrow />
            <PipelineTag color="green" label="Classe" value={med.classe_terapeutica} />
            <Arrow />
            <PipelineTag color="purple" label="Molécula" value={med.molecula} />
            <Arrow />
            <PipelineTag
              color="emerald"
              label="Evidência"
              value={`Nível ${med.evidencia.nivel_evidencia.nivel} · Grau ${med.evidencia.nivel_evidencia.grau}`}
            />
          </div>
        </DialogHeader>

        <Tabs defaultValue="beneficios" className="mt-2">
          <TabsList className="grid grid-cols-6 text-[10px]">
            <TabsTrigger value="beneficios">Benefícios</TabsTrigger>
            <TabsTrigger value="riscos">Riscos</TabsTrigger>
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
            <TabsTrigger value="alternativas">Alternativas</TabsTrigger>
            <TabsTrigger value="estudos" className="relative">
              Estudos
              {estudos.length > 0 && (
                <span className="ml-1 bg-blue-600 text-white rounded-full text-[8px] px-1 py-0 leading-3">
                  {estudos.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="evidencia">Diretriz</TabsTrigger>
          </TabsList>

          {/* ── ABA: Benefícios ── */}
          <TabsContent value="beneficios" className="mt-4 space-y-3">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Benefícios Clínicos Demonstrados
              </p>
              <ul className="space-y-1.5">
                {beneficios.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-green-800">
                    <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-xs font-semibold text-slate-700 mb-1">Indicação principal</p>
              <p className="text-xs text-slate-600">{med.indicacao}</p>
            </div>
          </TabsContent>

          {/* ── ABA: Riscos ── */}
          <TabsContent value="riscos" className="mt-4 space-y-3">
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-xs font-semibold text-orange-800 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Efeitos Adversos Relevantes
              </p>
              <ul className="space-y-1.5">
                {med.efeitos_adversos.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-orange-800">
                    <AlertTriangle className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Contraindicações
              </p>
              <ul className="space-y-1.5">
                {med.contraindicacoes.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-red-800">
                    <XCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            {(med.dose.ajuste_renal || med.dose.ajuste_hepatico) && (
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs font-semibold text-yellow-800 mb-1.5">Ajustes em Populações Especiais</p>
                {med.dose.ajuste_renal && (
                  <p className="text-xs text-yellow-700">
                    <strong>Renal:</strong> {med.dose.ajuste_renal}
                  </p>
                )}
                {med.dose.ajuste_hepatico && (
                  <p className="text-xs text-yellow-700 mt-1">
                    <strong>Hepático:</strong> {med.dose.ajuste_hepatico}
                  </p>
                )}
                {med.dose.ajuste_pediatrico && (
                  <p className="text-xs text-yellow-700 mt-1">
                    <strong>Pediátrico:</strong> {med.dose.ajuste_pediatrico}
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── ABA: Perfil Ideal ── */}
          <TabsContent value="perfil" className="mt-4 space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                <Users className="w-3 h-3" /> Perfil de Paciente Ideal
              </p>
              <ul className="space-y-1.5">
                {perfilIdeal.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-blue-800">
                    <CheckCircle2 className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-xs font-semibold text-slate-700 mb-1">Monitorização recomendada</p>
              <ul className="space-y-1">
                {med.monitoramento.map((m, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                    <span className="text-blue-400 flex-shrink-0 mt-0.5">•</span> {m}
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          {/* ── ABA: Alternativas ── */}
          <TabsContent value="alternativas" className="mt-4 space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <ArrowLeftRight className="w-3 h-3" /> Alternativas Terapêuticas
              </p>
              <div className="space-y-2">
                {med.alternativas.map((alt, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2 bg-white rounded border border-slate-200"
                  >
                    <ArrowLeftRight className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-700">{alt}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-700">
              <strong>Nota clínica:</strong> A escolha entre alternativas deve considerar perfil
              do paciente, comorbidades, tolerabilidade, custo e preferência do prescritor.
              Todas as alternativas possuem evidência para a indicação.
            </div>
          </TabsContent>

          {/* ── ABA: Estudos Chave ── */}
          <TabsContent value="estudos" className="mt-4 space-y-3">
            {estudos.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <FlaskConical className="w-6 h-6 mx-auto mb-2 opacity-40" />
                Estudos principais não catalogados para esta molécula.
              </div>
            ) : (
              <div className="space-y-2">
                {estudos.map((e, i) => {
                  const isOpen = openStudy === e.nome;
                  return (
                    <div
                      key={i}
                      className="rounded-lg border border-slate-200 bg-white overflow-hidden"
                    >
                      <button
                        className="w-full text-left p-3 flex items-start justify-between gap-2 hover:bg-slate-50 transition-colors"
                        onClick={() => setOpenStudy(isOpen ? null : e.nome)}
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                            <FlaskConical className="w-3 h-3 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{e.nome}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {e.tipo} · {e.ano}
                              {e.n_pacientes && ` · n = ${e.n_pacientes.toLocaleString('pt-BR')}`}
                            </p>
                          </div>
                        </div>
                        {isOpen
                          ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                          : <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        }
                      </button>

                      {isOpen && (
                        <div className="px-3 pb-3 pt-0 space-y-2 border-t border-slate-100">
                          <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-2 mb-0.5">
                              Desfecho Primário
                            </p>
                            <p className="text-xs text-slate-700">{e.desfecho_primario}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">
                              Resultado Principal
                            </p>
                            <p className="text-xs text-slate-800 font-medium leading-relaxed">
                              {e.resultado_principal}
                            </p>
                          </div>
                          {e.doi && (
                            <a
                              href={`https://doi.org/${e.doi}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline mt-1"
                            >
                              DOI: {e.doi} <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 border border-slate-100">
              Os estudos listados são os ensaios pivotais que fundamentam a recomendação desta
              molécula na diretriz vigente. A decisão clínica final é do médico assistente.
            </div>
          </TabsContent>

          {/* ── ABA: Diretriz ── */}
          <TabsContent value="evidencia" className="mt-4 space-y-3">
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-900">{med.evidencia.diretriz}</p>
                    <p className="text-xs text-emerald-700 mt-0.5">{med.evidencia.sociedade}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Ano: {med.evidencia.ano}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={cn(
                    'text-xs font-bold px-2 py-0.5 rounded border',
                    NIVEL_COLORS[med.evidencia.nivel_evidencia.nivel]
                  )}>
                    Nível {med.evidencia.nivel_evidencia.nivel}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    Grau {med.evidencia.nivel_evidencia.grau}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-emerald-200 space-y-1">
                <p className="text-xs text-emerald-800">{NIVEL_EVIDENCIA[med.evidencia.nivel_evidencia.nivel]}</p>
                <p className="text-xs text-emerald-700">{GRAU_RECOMENDACAO[med.evidencia.nivel_evidencia.grau]}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> Citação científica
              </p>
              <p className="text-xs text-slate-600 italic">{med.evidencia.citacao}</p>
              {med.evidencia.doi && (
                <a
                  href={`https://doi.org/${med.evidencia.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
                >
                  DOI: {med.evidencia.doi} <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>

            <div className="p-3 bg-violet-50 rounded-lg border border-violet-200">
              <p className="text-xs font-semibold text-violet-800 mb-1 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Independência Científica
              </p>
              <p className="text-xs text-violet-700">
                A recomendação segue o fluxo: <strong>Diretriz → Classe Terapêutica → Molécula</strong>.
                A escolha de marca comercial é posterior e nunca influencia a indicação clínica.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400 text-center">
          Suporte à decisão clínica · A conduta final é de responsabilidade do médico assistente.
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Componentes auxiliares do pipeline ──────────────────────

type TagColor = 'blue' | 'green' | 'purple' | 'emerald' | 'slate';

const TAG_CLASSES: Record<TagColor, string> = {
  blue:    'bg-blue-50 text-blue-700 border-blue-200',
  green:   'bg-green-50 text-green-700 border-green-200',
  purple:  'bg-purple-50 text-purple-700 border-purple-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  slate:   'bg-slate-50 text-slate-600 border-slate-200',
};

function PipelineTag({ label, value, color }: { label: string; value: string; color: TagColor }) {
  return (
    <div className={cn('flex flex-col items-center px-2 py-1 rounded border text-center', TAG_CLASSES[color])}>
      <span className="text-[8px] uppercase tracking-widest opacity-60 font-semibold leading-none">{label}</span>
      <span className="text-[10px] font-semibold mt-0.5 leading-tight max-w-[100px] truncate" title={value}>
        {value}
      </span>
    </div>
  );
}

function Arrow() {
  return <span className="text-slate-300 text-sm select-none">›</span>;
}
