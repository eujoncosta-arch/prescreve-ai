import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// PRESCREVE-AI — Aviso de dados demonstrativos (RM-59)
//
// Objetivo: eliminar a ambiguidade entre dado real do paciente/consulta
// em atendimento e dado seed/mock/demonstrativo — SEM usar o estilo
// visual de alerta clínico (contraindicação/interação grave/bloqueio de
// prescrição), que em todo o resto do app usa vermelho/laranja/âmbar.
// Este componente usa uma cor neutra (índigo/slate — a MESMA já usada
// pelo badge "DEMO" da barra lateral, por consistência), ícone
// informativo (não de alerta), role="note" (conteúdo parentético/
// ancilar — nunca role="alert", que é para anúncios urgentes/
// assertivos) e é sempre renderizado diretamente no fluxo da página
// (nunca atrás de tooltip/modal/interação opcional).
// ============================================================

export type DemoDataNoticeVariant = 'demo' | 'hybrid';

const RESPONSAVEL_POR_VARIANTE: Record<DemoDataNoticeVariant, string> = {
  demo: 'Demonstração.',
  hybrid: 'Parcialmente demonstrativo.',
};

const TEXTO_POR_VARIANTE: Record<DemoDataNoticeVariant, string> = {
  demo:
    'Os dados desta página não refletem o paciente em atendimento. ' +
    'Conteúdo ilustrativo (dados de exemplo), não deve ser interpretado como recomendação individualizada.',
  hybrid:
    'Esta página pode usar a última anamnese salva neste navegador, ' +
    'mas o diagnóstico e a conduta exibidos são escolhidos manualmente aqui, não a conduta real da consulta em atendimento. ' +
    'Não deve ser interpretado como recomendação individualizada.',
};

export interface DemoDataNoticeProps {
  /** 'demo' (padrão) — página inteiramente demonstrativa. 'hybrid' — combina um dado real parcial com escolhas manuais nesta página. */
  variant?: DemoDataNoticeVariant;
  /** Sobrescreve o texto padrão, caso a investigação de uma página específica exija uma descrição mais precisa. */
  description?: string;
  className?: string;
}

export function DemoDataNotice({ variant = 'demo', description, className }: DemoDataNoticeProps) {
  const texto = description ?? TEXTO_POR_VARIANTE[variant];

  return (
    <div
      role="note"
      aria-label="Aviso sobre a natureza dos dados desta página"
      data-demo-data-notice={variant}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs leading-relaxed',
        'border-indigo-200 bg-indigo-50 text-indigo-900',
        'dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200',
        className,
      )}
    >
      <Info aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500 dark:text-indigo-400" />
      <p className="min-w-0">
        <span className="font-semibold">{RESPONSAVEL_POR_VARIANTE[variant]} </span>
        {texto}
      </p>
    </div>
  );
}
