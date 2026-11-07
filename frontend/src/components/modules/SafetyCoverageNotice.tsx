'use client';

// RM-104 — Aviso de cobertura da verificação de segurança.
// Nunca exibe o selo de "nenhum alerta" quando a verificação não foi completa.

import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { describeSafetyCoverage } from '@/lib/safety-coverage';
import type { SafetyCheckResult } from '@/lib/safety-rules';

const TONE_CLASS = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  // RM-106: nenhuma cor verde nem ícone de aprovação para a ausência de alertas (não transmitir segurança absoluta)
  ok: 'border-slate-300 bg-slate-50 text-slate-700',
  warning: 'border-amber-300 bg-amber-50 text-amber-800',
  danger: 'border-red-300 bg-red-50 text-red-800',
} as const;

export function SafetyCoverageNotice({ result, itensNaReceita }: { result: SafetyCheckResult | null; itensNaReceita: number }) {
  const view = describeSafetyCoverage(result, itensNaReceita);
  const Icon = view.mostrarSeloNegativo ? Info : view.tone === 'danger' ? ShieldAlert : view.tone === 'warning' ? AlertTriangle : Info;
  return (
    <div
      data-testid="safety-coverage"
      data-coverage-status={result?.status ?? 'nenhum'}
      role={view.tone === 'danger' || view.tone === 'warning' ? 'alert' : 'status'}
      className={`p-3 rounded-lg border ${TONE_CLASS[view.tone]}`}
    >
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold">{view.titulo}</p>
          {view.detalhes.map((d, i) => (
            <p key={i} className="text-xs mt-0.5">{d}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
