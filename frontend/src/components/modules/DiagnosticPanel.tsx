'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { MOCK_THERAPEUTIC, MOCK_SAFETY } from '@/lib/mock-data';

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

interface DiagnosticPanelProps {
  onComplete: () => void;
}

export function DiagnosticPanel({ onComplete }: DiagnosticPanelProps) {
  const { state, dispatch } = useApp();
  const apoio = state.activeConsultation?.apoio_diagnostico;
  const [expanded, setExpanded] = useState<string | null>('1');
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!apoio) return null;

  const handleSelectDiagnosis = async (hipotese: typeof apoio.hipoteses[0]) => {
    setSelected(hipotese.id);
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));

    const plan = {
      ...MOCK_THERAPEUTIC,
      diagnostico_selecionado: `${hipotese.nome} (${hipotese.cid10 ?? ''})`,
    };

    dispatch({ type: 'SELECT_DIAGNOSIS', payload: `${hipotese.nome} (${hipotese.cid10 ?? ''})` });
    dispatch({ type: 'UPDATE_THERAPEUTIC', payload: plan });
    dispatch({ type: 'UPDATE_SAFETY', payload: MOCK_SAFETY });
    setLoading(false);
    toast.success(`Diagnóstico selecionado: ${hipotese.nome}`);
    onComplete();
  };

  return (
    <div className="space-y-4">
      {/* Síntese clínica */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <Brain className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-800 mb-1">Síntese Clínica — IA</p>
              <p className="text-sm text-blue-700">{apoio.sintese_clinica}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Red flags */}
      {apoio.red_flags.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription>
            <p className="text-xs font-semibold text-red-800 mb-1">Sinais de Alerta (Red Flags)</p>
            <ul className="space-y-1">
              {apoio.red_flags.map((rf, i) => (
                <li key={i} className="text-xs text-red-700 flex items-start gap-1">
                  <span>•</span> {rf}
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
          <strong>O sistema não fecha diagnóstico.</strong> As hipóteses abaixo são sugestões baseadas em evidências.
          O diagnóstico final é de responsabilidade exclusiva do médico.
        </p>
      </div>

      {/* Hipóteses diagnósticas */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Stethoscope className="w-4 h-4" />
          Hipóteses Diagnósticas ({apoio.hipoteses.length})
        </p>

        {apoio.hipoteses.map(hip => (
          <Card
            key={hip.id}
            className={`cursor-pointer transition-all border-2 ${
              selected === hip.id ? 'border-blue-500 shadow-md' : 'border-transparent hover:border-slate-200'
            }`}
          >
            <CardHeader
              className="pb-2 cursor-pointer"
              onClick={() => setExpanded(expanded === hip.id ? null : hip.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {hip.cid10 && (
                    <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {hip.cid10}
                    </span>
                  )}
                  <CardTitle className="text-sm font-semibold text-slate-900">{hip.nome}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PROB_COLORS[hip.probabilidade]}`}>
                    {PROB_LABELS[hip.probabilidade]}
                  </span>
                  {expanded === hip.id ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>
            </CardHeader>

            {expanded === hip.id && (
              <CardContent className="pt-0 space-y-4">
                {/* Raciocínio */}
                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
                  <p className="font-medium text-slate-700 mb-1">Raciocínio Clínico</p>
                  {hip.raciocinio_clinico}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Critérios favoráveis */}
                  <div>
                    <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Critérios Favoráveis
                    </p>
                    <ul className="space-y-1">
                      {hip.criterios_favoraveis.map((c, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                          <span className="text-green-500 mt-0.5">✓</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Critérios desfavoráveis */}
                  <div>
                    <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Critérios Desfavoráveis
                    </p>
                    <ul className="space-y-1">
                      {hip.criterios_desfavoraveis.map((c, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                          <span className="text-red-400 mt-0.5">✗</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Exames sugeridos */}
                {hip.exames_sugeridos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                      <FlaskConical className="w-3 h-3" /> Exames Sugeridos
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {hip.exames_sugeridos.map((e, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                          {e}
                        </span>
                      ))}
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
                    <><ArrowRight className="w-3 h-3" /> Selecionar este diagnóstico e prosseguir</>
                  )}
                </Button>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
