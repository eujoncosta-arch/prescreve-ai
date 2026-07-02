// ============================================================
// PRESCREVE-AI — Adaptador Eurofarma
// Expõe EUROFARMA_CATALOG via interface LabAdapter padrão
// ============================================================

import { EUROFARMA_CATALOG, getProdutoById, getProdutosByMolecula } from '../eurofarma-sync';
import type { LabInfo } from '../types';
import type { LabAdapter } from './index';

const EUROFARMA_LAB_INFO: LabInfo = {
  id: 'eurofarma',
  nome: 'Eurofarma Laboratórios S.A.',
  cnpj: '61.190.096/0001-92',
  site: 'https://eurofarma.com.br',
  portfolio_sync_date: '2026-07-01',
  portfolio_version: '2026.7.2',
  ativo: true,
};

export const eurofarmaAdapter: LabAdapter = {
  lab_info: EUROFARMA_LAB_INFO,
  catalog: EUROFARMA_CATALOG,
  getProdutoByMolecula: (molecula: string) => getProdutosByMolecula(molecula),
  getProdutoById: (id: string) => getProdutoById(id),
};
