// ============================================================
// PRESCREVE-AI — Drug Resolver Unificado
// Dado contexto clínico (CID + molécula + preferência lab),
// resolve: evidência + posologia + produto + dose
// ============================================================

import { PHARMA_DB, searchDrugs, type QuickDrug } from './pharma-database';
import {
  EUROFARMA_CATALOG,
  CORRELACAO_TERAPEUTICA,
  getProdutosByMolecula,
  getCorrelacaoByCID,
  type CorrelacaoTerapeutica,
} from './eurofarma-sync';
import type { ProdutoComercial } from './types';
import { DRUG_DATABASE, getMoleculesByCondition } from './drug-database';
import type { MoleculeEntry } from './types';
import { avaliarFarmacogenomica, type AvaliacaoFarmacogenomica } from './precision-medicine';

// ─── OUTPUT TYPE ──────────────────────────────────────────────

export interface EvidenciaResolvida {
  molecula: string;
  grau_recomendacao: string;
  nivel_evidencia: string;
  classe_terapeutica: string;
  posicao_terapeutica: string;
  diretrizes: CorrelacaoTerapeutica['diretrizes'];
  notas_clinicas: string[];
}

// Moléculas com evidência PGx CPIC nível A/B que requerem avaliação farmacogenômica
const PGX_MOLECULES = [
  'clopidogrel', 'varfarina', 'warfarin', 'codeína', 'codeina',
  'sinvastatina', 'simvastatina', 'carbamazepina', 'abacavir',
  'metoprolol', 'omeprazol', 'omeprazole',
];

export interface ResolvedDrug {
  molecula: string;
  quick_drug: QuickDrug | null;
  produto_comercial: ProdutoComercial | null;
  evidencia: EvidenciaResolvida | null;
  molecule_entry: MoleculeEntry | null;
  fonte: ('pharma_db' | 'eurofarma_catalog' | 'correlacao' | 'drug_db')[];
  pgx_alerts: AvaliacaoFarmacogenomica[];
}

// ─── RESOLVER PRINCIPAL ───────────────────────────────────────

/**
 * Resolve todos os dados disponíveis para uma molécula.
 * @param molecula Nome da molécula (ex: "Losartana")
 * @param cid10 CID-10 do diagnóstico (ex: "I10") — usado para evidência
 * @param labPreferencia ID do lab preferido (ex: "eurofarma") — filtra produto
 */
export function resolveDrug(
  molecula: string,
  cid10?: string,
  labPreferencia?: string,
): ResolvedDrug {
  const fonte: ResolvedDrug['fonte'] = [];

  // 1. PHARMA_DB — QuickDrug com posologia completa
  const molNorm = molecula.toLowerCase().trim();
  const quickDrug = PHARMA_DB.find(d =>
    d.molecula.toLowerCase() === molNorm ||
    d.nome_generico?.toLowerCase() === molNorm ||
    d.sinonimos.some(s => s.toLowerCase() === molNorm)
  ) ?? null;
  if (quickDrug) fonte.push('pharma_db');

  // 2. EUROFARMA_CATALOG — produto comercial preferencial
  const produtosDisponiveis = getProdutosByMolecula(molecula);
  let produtoComercial: ProdutoComercial | null = null;
  if (produtosDisponiveis.length > 0) {
    fonte.push('eurofarma_catalog');
    // Filtrar pelo lab preferido, senão usa o primeiro
    if (labPreferencia) {
      produtoComercial = produtosDisponiveis.find(p => p.lab_id === labPreferencia) ?? produtosDisponiveis[0];
    } else {
      produtoComercial = produtosDisponiveis[0];
    }
  }

  // 3. CORRELACAO_TERAPEUTICA — evidência científica pelo CID10
  let evidencia: EvidenciaResolvida | null = null;
  if (cid10) {
    const correlacao = getCorrelacaoByCID(cid10);
    if (correlacao) {
      fonte.push('correlacao');
      // Encontra a classe e molécula dentro da correlação
      for (const classe of correlacao.classes) {
        const mol = classe.moleculas.find(m =>
          m.nome.toLowerCase().includes(molNorm) ||
          molNorm.includes(m.nome.toLowerCase())
        );
        if (mol) {
          evidencia = {
            molecula: mol.nome,
            grau_recomendacao: mol.grau_recomendacao,
            nivel_evidencia: mol.nivel_evidencia,
            classe_terapeutica: classe.nome,
            posicao_terapeutica: classe.posicao_terapeutica,
            diretrizes: correlacao.diretrizes,
            notas_clinicas: correlacao.notas_clinicas,
          };
          break;
        }
      }
    }
  }

  // 4. DRUG_DATABASE — fallback multi-lab (para evidência da classe quando sem correlação)
  let moleculeEntry: MoleculeEntry | null = null;
  if (cid10) {
    const entries = getMoleculesByCondition(cid10);
    moleculeEntry = entries.find(e =>
      e.molecula.toLowerCase().includes(molNorm) ||
      molNorm.includes(e.molecula.toLowerCase())
    ) ?? null;
    if (moleculeEntry) fonte.push('drug_db');
  }

  // 5. PGx — avalia farmacogenômica para moléculas com evidência CPIC
  const needsPgx = PGX_MOLECULES.some(pgxMol =>
    molNorm.includes(pgxMol) || pgxMol.includes(molNorm)
  );
  const pgxAlerts: AvaliacaoFarmacogenomica[] = needsPgx
    ? avaliarFarmacogenomica(molecula, [])
    : [];

  return {
    molecula,
    quick_drug: quickDrug,
    produto_comercial: produtoComercial,
    evidencia,
    molecule_entry: moleculeEntry,
    fonte,
    pgx_alerts: pgxAlerts,
  };
}

/**
 * Resolve todas as moléculas recomendadas para um CID10.
 * Retorna lista ordenada por grau de recomendação.
 */
export function resolveByCondition(
  cid10: string,
  labPreferencia?: string,
): ResolvedDrug[] {
  const correlacao = getCorrelacaoByCID(cid10);
  if (!correlacao) {
    // Fallback ao DRUG_DATABASE
    const entries = getMoleculesByCondition(cid10);
    return entries.map(e => resolveDrug(e.molecula, cid10, labPreferencia));
  }

  const results: ResolvedDrug[] = [];
  for (const classe of correlacao.classes) {
    for (const mol of classe.moleculas) {
      results.push(resolveDrug(mol.nome, cid10, labPreferencia));
    }
  }
  return results;
}

/**
 * Busca rápida por texto — nome, marca, classe, sinônimo.
 * Retorna array de ResolvedDrug dos primeiros resultados.
 */
export function resolveSearch(
  query: string,
  cid10?: string,
  labPreferencia?: string,
  limit = 8,
): ResolvedDrug[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];

  const found = searchDrugs(q);
  return found
    .slice(0, limit)
    .map(drug => resolveDrug(drug.molecula, cid10, labPreferencia));
}

/**
 * Dado um ResolvedDrug, retorna o nome comercial preferencial
 * com base na preferência de laboratório configurada.
 */
export function getPreferredBrandName(
  resolved: ResolvedDrug,
  labPreferencia?: string,
): string {
  if (resolved.produto_comercial) {
    return resolved.produto_comercial.nome_comercial;
  }
  if (resolved.quick_drug?.marcas?.length) {
    const pref = labPreferencia
      ? resolved.quick_drug.marcas.find(m => m.lab_id === labPreferencia || m.laboratorio.toLowerCase() === labPreferencia)
      : null;
    return pref?.nome ?? resolved.quick_drug.marcas[0].nome;
  }
  return resolved.molecula;
}

/**
 * Verifica se a molécula tem produto Eurofarma verificado no catálogo.
 */
export function hasVerifiedEurofarmaProduct(molecula: string): boolean {
  return getProdutosByMolecula(molecula).length > 0;
}
