'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Production readiness: até esta RM, um erro de render não tratado em
// qualquer rota do App Router não tinha NENHUM fallback — a página ficava
// em branco (Next.js só usa este arquivo se ele existir). `error.tsx` cobre
// erros dentro do layout raiz; `global-error.tsx` cobre erros no próprio
// layout raiz (caso mais raro, exige seu próprio <html>/<body>).
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log mínimo no console do navegador — nunca envia dado clínico/paciente
    // (este boundary não tem acesso a nenhum dado de anamnese/consulta).
    console.error('[error-boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Algo deu errado</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ocorreu um erro inesperado nesta página. Nenhum dado foi perdido — você pode tentar novamente ou voltar ao início.
          </p>
          {error.digest && (
            <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-2 font-mono">Ref: {error.digest}</p>
          )}
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button onClick={reset} className="gap-1.5">
            <RotateCcw className="w-4 h-4" />
            Tentar novamente
          </Button>
          <Button variant="outline" className="gap-1.5" render={<Link href="/" />}>
            <Home className="w-4 h-4" />
            Ir para o início
          </Button>
        </div>
      </div>
    </div>
  );
}
