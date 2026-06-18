'use client';

import type { ScientificReference } from '@/lib/types';
import { NIVEL_EVIDENCIA, GRAU_RECOMENDACAO } from '@/lib/utils';
import { BookOpen, ExternalLink, Award, Calendar, Building2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const NIVEL_COLORS: Record<string, string> = {
  A: 'bg-green-100 text-green-800 border-green-300',
  B: 'bg-blue-100 text-blue-800 border-blue-300',
  C: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  D: 'bg-slate-100 text-slate-600 border-slate-300',
};

const GRAU_COLORS: Record<string, string> = {
  I: 'bg-green-50 text-green-700',
  IIa: 'bg-blue-50 text-blue-700',
  IIb: 'bg-yellow-50 text-yellow-700',
  III: 'bg-red-50 text-red-700',
};

interface EvidencePanelProps {
  evidencia: ScientificReference;
  compact?: boolean;
  showBorder?: boolean;
}

export function EvidencePanel({ evidencia, compact = false, showBorder = true }: EvidencePanelProps) {
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 flex-wrap', showBorder && 'pt-2 border-t border-slate-100 mt-2')}>
        <span className={cn('text-xs font-bold px-2 py-0.5 rounded border', NIVEL_COLORS[evidencia.nivel_evidencia.nivel])}>
          Nível {evidencia.nivel_evidencia.nivel}
        </span>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded', GRAU_COLORS[evidencia.nivel_evidencia.grau])}>
          Grau {evidencia.nivel_evidencia.grau}
        </span>
        <span className="text-xs text-slate-500">{evidencia.sociedade} · {evidencia.ano}</span>
        {evidencia.doi && (
          <a
            href={`https://doi.org/${evidencia.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline flex items-center gap-0.5"
          >
            DOI <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border p-3 space-y-3 bg-gradient-to-br from-green-50 to-emerald-50', showBorder ? 'border-green-200' : 'border-transparent')}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-green-700" />
          </div>
          <div>
            <p className="text-xs font-bold text-green-900 leading-tight">{evidencia.diretriz}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3 text-green-600" />
              <p className="text-xs text-green-700">{evidencia.sociedade}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-green-600 flex-shrink-0">
          <Calendar className="w-3 h-3" />
          {evidencia.ano}
        </div>
      </div>

      {/* Badges */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Award className="w-3 h-3 text-green-600" />
          <span className={cn('text-xs font-bold px-2 py-0.5 rounded border', NIVEL_COLORS[evidencia.nivel_evidencia.nivel])}>
            Nível {evidencia.nivel_evidencia.nivel}
          </span>
        </div>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded', GRAU_COLORS[evidencia.nivel_evidencia.grau])}>
          Grau {evidencia.nivel_evidencia.grau}
        </span>
      </div>

      {/* Descriptions */}
      <div className="space-y-1">
        <p className="text-xs text-green-800">{NIVEL_EVIDENCIA[evidencia.nivel_evidencia.nivel]}</p>
        <p className="text-xs text-green-700">{GRAU_RECOMENDACAO[evidencia.nivel_evidencia.grau]}</p>
      </div>

      {/* Citation */}
      <div className="pt-2 border-t border-green-200">
        <p className="text-xs text-green-700 italic">{evidencia.citacao}</p>
        {evidencia.doi && (
          <a
            href={`https://doi.org/${evidencia.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
          >
            DOI: {evidencia.doi} <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs text-green-600 pt-1">
        <RefreshCw className="w-3 h-3" />
        Última revisão: {evidencia.ano} · Governança PRESCREVE-AI
      </div>
    </div>
  );
}
