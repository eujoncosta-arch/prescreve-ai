'use client';

import { useApp } from '@/lib/store';

/**
 * Faixa persistente e visível em TODA a aplicação quando o modo demo está
 * ativo — nunca deve ser possível confundir uma sessão demo com um
 * ambiente clínico real. Renderiza `null` em qualquer outro modo
 * (produção ou desenvolvimento real), inclusive quando o backend
 * simplesmente não está configurado (esse caso mostra outro aviso,
 * específico de "bloqueado", nas telas relevantes — nunca este banner de
 * demonstração).
 */
export function DemoModeBanner() {
  const { auth } = useApp();
  if (!auth.demoMode) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-amber-950"
    >
      Modo Demonstração — dados simulados, nunca enviados a um servidor real. Não use para decisões clínicas reais.
    </div>
  );
}
