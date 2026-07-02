// ============================================================
// PRESCREVE-AI — Adaptador Aché (stub)
// Preencher com dados do portfólio Aché quando disponíveis
// ============================================================

import type { ProdutoComercial, LabInfo } from '../types';
import type { LabAdapter } from './index';

const ACHE_LAB_INFO: LabInfo = {
  id: 'ache',
  nome: 'Aché Laboratórios Farmacêuticos S.A.',
  site: 'https://ache.com.br',
  portfolio_sync_date: '2026-01-01',
  portfolio_version: '1.0.0',
  ativo: false,
};

const ACHE_CATALOG: ProdutoComercial[] = [
  // TODO: importar portfólio Aché
];

export const acheAdapter: LabAdapter = {
  lab_info: ACHE_LAB_INFO,
  catalog: ACHE_CATALOG,
  getProdutoByMolecula: (molecula: string) =>
    ACHE_CATALOG.filter(p => p.molecula.toLowerCase().includes(molecula.toLowerCase())),
  getProdutoById: (id: string) => ACHE_CATALOG.find(p => p.id === id),
};
