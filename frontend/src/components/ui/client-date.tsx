'use client';

export function ClientDate({ date }: { date: string }) {
  if (!date) return null;
  // RM-52 (react-hooks/error-boundaries): a formatação (que pode lançar)
  // fica fora do JSX — o try/catch só computa a string, sem construir
  // elementos dentro do bloco, então uma exceção real ainda propaga para o
  // error boundary em vez de ser engolida silenciosamente aqui.
  let formatted = date;
  try {
    formatted = new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
  } catch {
    // mantém o valor bruto de `date` como fallback
  }
  return <>{formatted}</>;
}
