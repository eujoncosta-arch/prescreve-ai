'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  XCircle,
  FlaskConical,
  Brain,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  ArrowRight,
  Loader2,
  BookOpen,
  Search,
  GitBranch,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { MOCK_SAFETY } from '@/lib/mock-data';
import { CDS_BASE_CONHECIMENTO } from '@/lib/clinical-decision-support';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';

const PROB_COLORS: Record<string, string> = {
  alta: 'bg-red-100 text-red-700 border-red-200',
  media: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  baixa: 'bg-slate-100 text-slate-600 border-slate-200',
};

const PROB_LABELS: Record<string, string> = {
  alta: 'Alta probabilidade',
  media: 'Média probabilidade',
  baixa: 'Baixa probabilidade',
};

const CONF_COLOR = (pct: number) =>
  pct >= 60 ? 'text-red-600' : pct >= 35 ? 'text-yellow-600' : 'text-slate-500';

const CONF_BAR = (pct: number) =>
  pct >= 60 ? 'bg-red-500' : pct >= 35 ? 'bg-yellow-400' : 'bg-slate-300';

const EVIDENCIA_COLORS: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  B: 'bg-blue-100 text-blue-800 border-blue-300',
  C: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  D: 'bg-red-100 text-red-800 border-red-300',
};

interface DiagnosticPanelProps {
  onComplete: () => void;
}

export function DiagnosticPanel({ onComplete }: DiagnosticPanelProps) {
  const { state, dispatch } = useApp();
  const apoio = state.activeConsultation?.apoio_diagnostico;
  const [expanded, setExpanded] = useState<string | null>(apoio?.hipoteses?.[0]?.id ?? null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!apoio) return null;

  const handleSelectDiagnosis = async (hipotese: typeof apoio.hipoteses[0]) => {
    setSelected(hipotese.id);
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));

    const diagnosticoLabel = `${hipotese.nome} (${hipotese.cid10 ?? ''})`;
    const therapeutic =
      getTherapeuticForCondition(hipotese.id, diagnosticoLabel) ??
      getTherapeuticForCondition(hipotese.cid10 ?? '', diagnosticoLabel);

    dispatch({ type: 'SELECT_DIAGNOSIS', payload: diagnosticoLabel });
    if (therapeutic) {
      dispatch({ type: 'UPDATE_THERAPEUTIC', payload: therapeutic });
    }
    dispatch({ type: 'UPDATE_SAFETY', payload: MOCK_SAFETY });
    setLoading(false);
    toast.success(`Hipótese selecionada: ${hipotese.nome}`);
    onComplete();
  };

  return (
    <div className="space-y-4">

      {/* Banner suporte à decisão */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-50 border border-violet-200">
        <Brain className="w-4 h-4 text-violet-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-violet-800">Suporte à Decisão Clínica</span>
          <span className="text-xs text-violet-600 ml-2">· Motor baseado em evidências · {CDS_BASE_CONHECIMENTO}</span>
        </div>
      </div>

      {/* Síntese clínica */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-2">
            <Brain className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-800 mb-1">Síntese Clínica</p>
              <p className="text-sm text-blue-700">{apoio.sintese_clinica}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Red flags */}
      {apoio.red_flags.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <ShieldAlert className="h-4 w-4 text-red-500" />
          <AlertDescription>
            <p className="text-xs font-semibold text-red-800 mb-1.5">
              Sinais de Alerta (Red Flags)
              {apoio.encaminhamento_urgente && (
                <Badge variant="destructive" className="ml-2 text-[10px]">URGENTE</Badge>
              )}
            </p>
            <ul className="space-y-1">
              {apoio.red_flags.map((rf, i) => (
                <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {rf}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Aviso de responsabilidade */}
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-700">
          <strong>O sistema não fecha diagnóstico.</strong> As hipóteses abaixo são suporte à decisão baseado em evidências.
          O diagnóstico final é de responsabilidade exclusiva do médico assistente.
        </p>
      </div>

      {/* Hipóteses diagnósticas */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Stethoscope className="w-4 h-4" />
          Hipóteses Diagnósticas ({apoio.hipoteses.length})
        </p>

        {apoio.hipoteses.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="pt-8 pb-8 text-center">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Nenhuma hipótese identificada com os dados disponíveis.</p>
              <p className="text-xs text-slate-400 mt-1">Preencha sinais vitais, queixa principal e exames para análise.</p>
            </CardContent>
          </Card>
        )}

        {apoio.hipoteses.map(hip => {
          const confianca = hip.grau_confianca ?? 0;
          const guideline = hip.guideline;

          return (
            <Card
              key={hip.id}
              className={`transition-all border-2 ${
                selected === hip.id ? 'border-blue-500 shadow-md' : 'border-transparent hover:border-slate-200'
              }`}
            >
              {/* Header da hipótese */}
              <CardHeader
                className="pb-2 cursor-pointer"
                onClick={() => setExpanded(expanded === hip.id ? null : hip.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {hip.cid10 && (
                      <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded mt-0.5 flex-shrink-0">
                        {hip.cid10}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-semibold text-slate-900 leading-snug">
                        {hip.nome}
                      </CardTitle>
                      {/* Barra de confiança */}
                      {confianca > 0 && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${CONF_BAR(confianca)}`}
                              style={{ width: `${confianca}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-bold ${CONF_COLOR(confianca)}`}>
                            {confianca}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PROB_COLORS[hip.probabilidade]}`}>
                      {PROB_LABELS[hip.probabilidade]}
                    </span>
                    {expanded === hip.id
                      ? <ChevronUp className="w-4 h-4 text-slate-400" />
                      : <ChevronDown className="w-4 h-4 text-slate-400" />
                    }
                  </div>
                </div>
              </CardHeader>

              {expanded === hip.id && (
                <CardContent className="pt-0 space-y-4">

                  {/* Raciocínio clínico */}
                  <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100">
                    <p className="font-medium text-slate-700 mb-1 flex items-center gap-1">
                      <Brain className="w-3 h-3" /> Raciocínio Clínico
                    </p>
                    {hip.raciocinio_clinico}
                  </div>

                  {/* Critérios favoráveis / desfavoráveis */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Evidências Favoráveis
                      </p>
                      {hip.criterios_favoraveis.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Nenhuma identificada</p>
                      ) : (
                        <ul className="space-y-1">
                          {hip.criterios_favoraveis.map((c, i) => (
                            <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                              <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> {c}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Evidências Desfavoráveis / Ausentes
                      </p>
                      {hip.criterios_desfavoraveis.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Nenhuma identificada</p>
                      ) : (
                        <ul className="space-y-1">
                          {hip.criterios_desfavoraveis.map((c, i) => (
                            <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                              <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span> {c}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Exames faltantes */}
                  {(hip.exames_faltantes ?? []).length > 0 && (
                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                      <p className="text-xs font-semibold text-orange-700 mb-2 flex items-center gap-1">
                        <Search className="w-3 h-3" /> Exames Faltantes para Confirmar/Excluir
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(hip.exames_faltantes ?? []).map((e, i) => (
                          <span key={i} className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full border border-orange-200">
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exames sugeridos */}
                  {hip.exames_sugeridos.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                        <FlaskConical className="w-3 h-3" /> Exames Complementares Sugeridos
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {hip.exames_sugeridos.slice(0, 8).map((e, i) => (
                          <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                            {e}
                          </span>
                        ))}
                        {hip.exames_sugeridos.length > 8 && (
                          <span className="text-xs text-slate-400 px-2 py-0.5">
                            +{hip.exames_sugeridos.length - 8} mais
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Diagnósticos diferenciais */}
                  {(hip.diferenciais ?? []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                        <GitBranch className="w-3 h-3" /> Diagnósticos Diferenciais
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(hip.diferenciais ?? []).map((d, i) => (
                          <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Diretriz / Evidência */}
                  {guideline && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold border ${EVIDENCIA_COLORS[guideline.nivel_evidencia]}`}
                          >
                            Evidência {guideline.nivel_evidencia}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-100">
                            Grau {guideline.grau_recomendacao}
                          </Badge>
                          <span className="text-[10px] text-slate-500 font-medium">{guideline.ano}</span>
                        </div>
                        <p className="text-[11px] text-slate-700 font-medium">{guideline.diretriz}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{guideline.sociedade}</p>
                      </div>
                    </div>
                  )}

                  {/* Botão selecionar */}
                  <Button
                    onClick={() => handleSelectDiagnosis(hip)}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
                    size="sm"
                  >
                    {loading && selected === hip.id ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Carregando protocolo terapêutico...</>
                    ) : (
                      <><ArrowRight className="w-3 h-3" /> Selecionar hipótese e prosseguir</>
                    )}
                  </Button>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
