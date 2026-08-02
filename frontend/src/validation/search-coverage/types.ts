// ============================================================
// PRESCREVE-AI — RM-63: Contrato de Cobertura Total da Busca Farmacológica
//
// Origem: RM-58 encontrou que `searchDrugs()`/`getATCCode()`/
// `getMonitoramento()` consultavam apenas `PHARMA_DB` (~80 entidades),
// nunca `getAllDrugs()` (367 — base + 16 extensões por especialidade) —
// ~78% do catálogo consolidado era estruturalmente invisível para
// qualquer busca no motor de prescrição. Corrigido na RM-58. Esta RM
// cria o CONTRATO que impede essa regressão de voltar, percorrendo o
// catálogo real inteiro (nunca uma amostra).
// ============================================================

import type { QuickDrug, QuickBrand } from '@/lib/pharma-database';

/**
 * Falha individual de cobertura — sempre associada a uma entidade/marca/
 * alias real do catálogo, nunca um resumo agregado sem rastreabilidade.
 */
export interface SearchCoverageFailure {
  tipo: 'ENTIDADE_NAO_ENCONTRADA' | 'MARCA_NAO_ENCONTRADA' | 'ALIAS_NAO_ENCONTRADO' | 'DUPLICIDADE_INDEVIDA' | 'RESULTADO_INCOMPATIVEL';
  drugId: string;
  molecula: string;
  detalhe: string;
  /** A consulta exata que falhou (quando aplicável). */
  query?: string;
}

export interface SearchCoverageMetrics {
  entidadesTotais: number;
  entidadesPesquisaveis: number;
  entidadesEncontradasPorNome: number;
  marcasPesquisaveis: number;
  marcasEncontradas: number;
  aliasesPesquisaveis: number;
  aliasesEncontrados: number;
  /** Cobertura sobre o total PESQUISÁVEL (nunca sobre o total bruto — ver `isSearchableEntity`). */
  coberturaEntidadesPct: number;
  coberturaMarcasPct: number;
  coberturaAliasesPct: number;
}

export interface SearchCoverageReport {
  timestamp: string;
  metrics: SearchCoverageMetrics;
  failures: SearchCoverageFailure[];
  /** true quando as 3 métricas de cobertura são 100%. */
  contractOk: boolean;
}

/**
 * Exceção documentada a uma marca/alias que legitimamente não pode ser
 * pesquisável (ex.: alias com menos de 2 caracteres — `searchDrugs()`
 * recusa consultas curtas por design, não por bug). Nunca uma allowlist
 * genérica — cada entrada tem um motivo verificável.
 */
export interface SearchCoverageException {
  tipo: 'ALIAS_CURTO_DEMAIS' | 'MARCA_AMBIGUA_CURTA';
  drugId: string;
  valor: string;
  motivo: string;
}

export type { QuickDrug, QuickBrand };
