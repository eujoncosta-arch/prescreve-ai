// ============================================================
// PRESCREVE-AI — Adaptador Aché
// Expõe ACHE_PRODUCTS via interface LabAdapter padrão
// ============================================================

import { ACHE_PRODUCTS, LABS } from '../lab-catalog';
import type { LabAdapter } from './index';

export const acheAdapter: LabAdapter = {
  lab_info: LABS['ache'],
  catalog: ACHE_PRODUCTS,
  getProdutoByMolecula: (molecula: string) =>
    ACHE_PRODUCTS.filter(p => p.molecula.toLowerCase().includes(molecula.toLowerCase())),
  getProdutoById: (id: string) => ACHE_PRODUCTS.find(p => p.id === id),
};
