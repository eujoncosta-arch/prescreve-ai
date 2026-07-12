// ============================================================
// PRESCREVE-AI — Adaptador EMS
// Expõe EMS_PRODUCTS via interface LabAdapter padrão
// ============================================================

import { EMS_PRODUCTS, LABS } from '../lab-catalog';
import type { LabAdapter } from './index';

export const emsAdapter: LabAdapter = {
  lab_info: LABS['ems'],
  catalog: EMS_PRODUCTS,
  getProdutoByMolecula: (molecula: string) =>
    EMS_PRODUCTS.filter(p => p.molecula.toLowerCase().includes(molecula.toLowerCase())),
  getProdutoById: (id: string) => EMS_PRODUCTS.find(p => p.id === id),
};
