'use client';

export function ClientDate({ date }: { date: string }) {
  if (!date) return null;
  try {
    return <>{new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}</>;
  } catch {
    return <>{date}</>;
  }
}
