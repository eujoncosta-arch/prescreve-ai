'use client';

import { useEffect } from 'react';

// Production readiness: cobre o caso mais raro (erro dentro do PRÓPRIO layout
// raiz — ex.: falha no ThemeProvider/AppProvider). Como substitui o layout
// raiz inteiro, precisa renderizar seu próprio <html>/<body> — não pode
// depender de nenhum provider da árvore normal (nem estilos Tailwind
// carregados via layout.tsx são garantidos aqui, por isso o estilo inline).
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[global-error-boundary]', error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f8fafc', color: '#0f172a' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Falha crítica ao carregar a aplicação</h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 4px' }}>
              Ocorreu um erro inesperado que impediu o carregamento da página. Tente recarregar.
            </p>
            {error.digest && (
              <p style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', margin: '8px 0 0' }}>Ref: {error.digest}</p>
            )}
            <button
              onClick={reset}
              style={{ marginTop: 16, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#7c3aed', color: 'white', fontSize: 14, cursor: 'pointer' }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
