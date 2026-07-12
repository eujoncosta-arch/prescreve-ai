// ============================================================
// PRESCREVE-AI — Registro Central de Adaptadores de Laboratório
// Para adicionar um novo lab: criar [lab].ts + registrar aqui
// ============================================================

import type { LabInfo, ProdutoComercial } from '../types';
import { eurofarmaAdapter } from './eurofarma';
import { emsAdapter } from './ems';
import { acheAdapter } from './ache';

export interface LabAdapter {
  lab_info: LabInfo;
  catalog: ProdutoComercial[];
  getProdutoByMolecula(molecula: string): ProdutoComercial[];
  getProdutoById(id: string): ProdutoComercial | undefined;
}

// ─── REGISTRO DE LABS ATIVOS ─────────────────────────────────
// Adicionar novas entradas aqui ao integrar novos laboratórios

export const LAB_ADAPTERS: LabAdapter[] = [
  eurofarmaAdapter,
  emsAdapter,
  acheAdapter,
  // libbsAdapter,     ← descomentar após criar libbs.ts
  // biozineAdapter,   ← descomentar após criar biozine.ts
];

// ─── HELPERS GLOBAIS ─────────────────────────────────────────

export function getAdapterByLab(labId: string): LabAdapter | undefined {
  return LAB_ADAPTERS.find(a => a.lab_info.id === labId);
}

export function getAllCatalogs(): ProdutoComercial[] {
  return LAB_ADAPTERS.flatMap(a => a.catalog);
}

export function searchAllLabs(molecula: string): ProdutoComercial[] {
  return LAB_ADAPTERS.flatMap(a => a.getProdutoByMolecula(molecula));
}

export function getActiveLabs(): LabInfo[] {
  return LAB_ADAPTERS.filter(a => a.lab_info.ativo).map(a => a.lab_info);
}
