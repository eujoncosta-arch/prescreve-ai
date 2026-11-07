// ============================================================
// RM-105.2 — ANEXO TÉCNICO — USO EXCLUSIVO DO PRESCRITOR (parte 2 da impressão)
//
// Começa em nova página (quebra obrigatória via `data-print-part="anexo"` + CSS de impressão em
// globals.css) e é identificado de forma inequívoca. Todo o texto vem de `montarAnexoTecnico`.
// ============================================================

import type { AnexoTecnico } from '@/lib/safety-annex';

export function AnexoTecnicoPrescritor({ anexo }: { anexo: AnexoTecnico }) {
  return (
    <section
      id="prescriber-annex"
      data-print-part="anexo"
      data-testid="prescriber-annex"
      data-annex-status={anexo.status}
      aria-label={anexo.titulo}
      className="print-annex p-8 border-t-4 border-dashed border-slate-400 bg-white text-slate-900"
    >
      <header className="mb-4 border-2 border-slate-900 p-3 text-center">
        <h2 data-testid="annex-title" className="text-sm font-bold tracking-wide">{anexo.titulo}</h2>
        <p className="text-[11px] text-slate-600 mt-1">{anexo.aviso}</p>
      </header>

      <div className="mb-3 text-xs">
        <p data-testid="annex-situacao" className="font-semibold">{anexo.rotulo_situacao}</p>
        <p data-testid="annex-integral" className="text-slate-700">{anexo.rotulo_integral}</p>
      </div>

      <div className="space-y-3 text-[11px] leading-snug">
        {anexo.secoes.map(s => (
          <div key={s.id} data-annex-section={s.id} className="break-inside-avoid">
            <h3 className="font-bold text-xs border-b border-slate-300 pb-0.5 mb-1">{s.titulo}</h3>
            <ul className="list-disc ml-4 space-y-0.5">
              {s.linhas.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
