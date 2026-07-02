// ============================================================
// PRESCREVE-AI — Adaptador EMS (stub)
// Preencher com dados do portfólio EMS quando disponíveis
// ============================================================

import type { ProdutoComercial, LabInfo } from '../types';
import type { LabAdapter } from './index';

const EMS_LAB_INFO: LabInfo = {
  id: 'ems',
  nome: 'EMS S/A',
  site: 'https://ems.com.br',
  portfolio_sync_date: '2026-01-01',
  portfolio_version: '1.0.0',
  ativo: false, // ativar ao popular o catálogo
};

const EMS_CATALOG: ProdutoComercial[] = [
  // TODO: importar portfólio EMS
];

export const emsAdapter: LabAdapter = {
  lab_info: EMS_LAB_INFO,
  catalog: EMS_CATALOG,
  getProdutoByMolecula: (molecula: string) =>
    EMS_CATALOG.filter(p => p.molecula.toLowerCase().includes(molecula.toLowerCase())),
  getProdutoById: (id: string) => EMS_CATALOG.find(p => p.id === id),
};
