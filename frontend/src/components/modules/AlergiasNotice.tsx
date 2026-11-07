'use client';

// RM-105.2.1 — Transparência do estado das alergias na aba de segurança.
// Nunca sugere ausência de risco quando a alergia não foi avaliada molecularmente.

import { AlertTriangle, Info } from 'lucide-react';
import { describeAlergias } from '@/lib/safety-coverage';
import type { SafetyCheckResult } from '@/lib/safety-rules';

const TONE_CLASS = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  ok: 'border-slate-300 bg-slate-50 text-slate-700',
  warning: 'border-amber-300 bg-amber-50 text-amber-800',
  danger: 'border-red-300 bg-red-50 text-red-800',
} as const;

export function AlergiasNotice({ result, itensNaReceita }: { result: SafetyCheckResult | null; itensNaReceita: number }) {
  const v = describeAlergias(result, itensNaReceita);
  if (!v.visivel) return null;
  const Icon = v.tone === 'neutral' ? Info : AlertTriangle;
  return (
    <div data-testid="alergias-notice" data-alergias-estado={result?.avaliacao_alergias.estado} className={`p-3 rounded-lg border ${TONE_CLASS[v.tone]}`}>
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold">{v.titulo}</p>
          {v.linhas.map((l, i) => <p key={i} className="text-xs mt-0.5">{l}</p>)}
        </div>
      </div>
    </div>
  );
}
