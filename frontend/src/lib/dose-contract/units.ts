// RM-107.2 — Conversão de unidades de massa (só aritmética; nenhuma dose clínica).
import type { UnidadeDoseBase, UnidadeMassa } from './types';

const PARA_MG: Record<UnidadeMassa, number> = { mg: 1, mcg: 0.001, g: 1000 };

export function ehUnidadeMassa(u: unknown): u is UnidadeMassa { return u === 'mg' || u === 'mcg' || u === 'g'; }

/** Converte entre mg, mcg e g. Unidades não mássicas (UI, mL, gotas…) NÃO são convertíveis: lança erro (nunca assume fator). */
export function converterMassa(valor: number, de: UnidadeMassa, para: UnidadeMassa): number {
  if (!ehUnidadeMassa(de) || !ehUnidadeMassa(para)) throw new Error(`unidade não convertível: ${String(de)} → ${String(para)}`);
  if (!Number.isFinite(valor)) throw new Error('valor inválido');
  return (valor * PARA_MG[de]) / PARA_MG[para];
}

/** true se as duas unidades são comparáveis (ambas mássicas ou idênticas não mássicas). */
export function unidadesComparaveis(a: UnidadeDoseBase | string, b: UnidadeDoseBase | string): boolean {
  if (ehUnidadeMassa(a) && ehUnidadeMassa(b)) return true;
  return a === b && !ehUnidadeMassa(a);
}
