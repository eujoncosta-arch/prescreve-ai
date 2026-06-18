import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calcIMC(peso: number, altura: number): number {
  if (!peso || !altura) return 0;
  return Number((peso / (altura * altura)).toFixed(1));
}

export function classifyIMC(imc: number): string {
  if (imc < 18.5) return "Abaixo do peso";
  if (imc < 25) return "Peso normal";
  if (imc < 30) return "Sobrepeso";
  if (imc < 35) return "Obesidade Grau I";
  if (imc < 40) return "Obesidade Grau II";
  return "Obesidade Grau III";
}

export function calcSuperficieCorporal(peso: number, altura: number): number {
  return Number((0.007184 * Math.pow(peso, 0.425) * Math.pow(altura * 100, 0.725)).toFixed(2));
}

export function calcCrCl(creatinina: number, idade: number, peso: number, sexo: 'M' | 'F'): number {
  const base = ((140 - idade) * peso) / (72 * creatinina);
  return Number((sexo === 'F' ? base * 0.85 : base).toFixed(1));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export const LABORATORIOS: Record<string, string> = {
  sem_preferencia: 'Sem preferência',
  eurofarma: 'Eurofarma',
  ems: 'EMS',
  ache: 'Aché',
  libbs: 'Libbs',
  biolab: 'Biolab',
  bayer: 'Bayer',
  pfizer: 'Pfizer',
  astrazeneca: 'AstraZeneca',
  novartis: 'Novartis',
  sanofi: 'Sanofi',
  roche: 'Roche',
  gsk: 'GSK',
  torrent: 'Torrent',
  outro: 'Outro',
};

export const NIVEL_EVIDENCIA: Record<string, string> = {
  A: 'Nível A — Múltiplos ECRs ou meta-análises',
  B: 'Nível B — ECR único ou estudos observacionais',
  C: 'Nível C — Consenso de especialistas / série de casos',
  D: 'Nível D — Opinião de especialistas',
};

export const GRAU_RECOMENDACAO: Record<string, string> = {
  I: 'Grau I — Evidência de que o tratamento é benéfico',
  IIa: 'Grau IIa — Peso da evidência favorável',
  IIb: 'Grau IIb — Utilidade menos estabelecida',
  III: 'Grau III — Não é útil ou pode ser prejudicial',
};
