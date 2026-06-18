'use client';

import { useState } from 'react';
import type { PrognosisData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Activity,
  ChevronDown,
  ChevronUp,
  Info,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const RISCO_CONFIG = {
  baixo: { label: 'Baixo', color: 'text-green-700 bg-green-100 border-green-300', dot: 'bg-green-500' },
  moderado: { label: 'Moderado', color: 'text-yellow-700 bg-yellow-100 border-yellow-300', dot: 'bg-yellow-500' },
  alto: { label: 'Alto', color: 'text-orange-700 bg-orange-100 border-orange-300', dot: 'bg-orange-500' },
  muito_alto: { label: 'Muito Alto', color: 'text-red-700 bg-red-100 border-red-300', dot: 'bg-red-500' },
};

const SCORE_COLORS = {
  green: 'border-green-300 bg-green-50',
  yellow: 'border-yellow-300 bg-yellow-50',
  orange: 'border-orange-300 bg-orange-50',
  red: 'border-red-300 bg-red-50',
};

interface PrognosisPanelProps {
  data: PrognosisData;
}

export function PrognosisPanel({ data }: PrognosisPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const risco = RISCO_CONFIG[data.risco_geral];

  return (
    <Card className="border-2 border-slate-100 mt-4">
      <CardHeader
        className="pb-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Motor de Prognóstico
              </CardTitle>
              <p className="text-xs text-slate-400">Baseado em scores validados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full border', risco.color)}>
              <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1.5', risco.dot)} />
              Risco {risco.label}
            </span>
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Risco estimado */}
          {data.risco_percentual && (
            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 border border-slate-200">
              <p className="font-medium text-slate-800 mb-0.5">Estimativa de risco:</p>
              {data.risco_percentual}
            </div>
          )}

          {/* Scores clínicos */}
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Scores Clínicos Validados
            </p>
            <div className="space-y-2">
              {data.scores.map((score, i) => (
                <div key={i} className={cn('p-3 rounded-lg border', SCORE_COLORS[score.cor])}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-800">{score.sigla}</span>
                        <span className="text-xs text-slate-600">— {score.nome}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900">{score.interpretacao}</p>
                      <p className="text-xs text-slate-500 mt-0.5 italic">{score.referencia}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-800 flex-shrink-0">{score.valor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grid fatores risco / protetores */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Fatores de Risco
              </p>
              <ul className="space-y-1">
                {data.fatores_risco.map((f, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Fatores Protetores
              </p>
              <ul className="space-y-1">
                {data.fatores_protetores.map((f, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Eventos relevantes */}
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> Eventos Clínicos Relevantes
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.eventos_relevantes.map((e, i) => (
                <span key={i} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">
                  {e}
                </span>
              ))}
            </div>
          </div>

          {/* Progressão esperada */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <TrendingDown className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-2">
                  Progressão Esperada
                  <span className="flex items-center gap-0.5 text-blue-600 font-normal">
                    <Clock className="w-3 h-3" /> {data.horizonte_temporal}
                  </span>
                </p>
                <p className="text-xs text-blue-700">{data.progressao_esperada}</p>
              </div>
            </div>
          </div>

          {/* Aviso legal */}
          <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
            <Info className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">{data.aviso}</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
