// ============================================================
// PRESCREVE-AI — RM-23: Drug Consistency Engine
//
// Valida a cadeia farmacológica canônica e reporta inconsistências:
//   - marca associada ao ativo errado (mesma marca → 2 princípios ativos);
//   - marca com laboratório divergente;
//   - apresentação inexistente;
//   - concentração divergente/ausente;
//   - dose incompatível/ausente;
//   - medicamento sem indicação cadastrada.
//
// Read-only sobre a Single Source of Truth (drugRepository).
// ============================================================

import { drugRepository } from '@/lib/pharma-core';
import { toSlug } from '@/lib/governance/data-governance';
import type { DrugEntity } from '@/lib/pharma-core';
import type { Inconsistency, ConsistencyReport, ConsistencySeverity } from './types';

/** Verifica a consistência de toda a base (ou de um subconjunto fornecido). */
export function checkDrugConsistency(entities: DrugEntity[] = drugRepository.getAll()): Inconsistency[] {
  const issues: Inconsistency[] = [];

  // ── Índice de marca (slug) → { moleculeIds, laboratories, drugIds } ──
  const brandIndex = new Map<
    string,
    { moleculeIds: Set<string>; laboratories: Set<string>; drugs: Set<string> }
  >();

  for (const e of entities) {
    // 1) Princípio ativo malformado (molecule_id canônico ausente/inválido)
    if (!e.activeIngredient.moleculeId?.startsWith('mol:')) {
      issues.push({
        rule: 'ATIVO_MALFORMADO',
        erro: `Princípio ativo sem molecule_id canônico (valor: "${e.activeIngredient.moleculeId ?? '∅'}").`,
        gravidade: 'critical',
        local: `${e.id} · activeIngredient.moleculeId`,
        correcaoSugerida: 'Recalcular o molecule_id via RM-00 toMoleculeId(activeIngredient.name).',
      });
    }

    // 5) Medicamento sem indicação cadastrada
    if (e.indications.length === 0) {
      issues.push({
        rule: 'SEM_INDICACAO',
        erro: `Medicamento sem indicação cadastrada.`,
        gravidade: 'medium',
        local: `${e.id} · indications[]`,
        correcaoSugerida: 'Cadastrar ao menos uma indicação clínica (indicacoes_principais na fonte).',
      });
    }

    // 4) Dose sugerida — ao menos regra de dose adulto
    const temDoseAdulto = e.dosageRules.some(
      (r) => r.population === 'adulto' && r.summary.trim().length > 0,
    );
    if (!temDoseAdulto) {
      issues.push({
        rule: 'DOSE_AUSENTE',
        erro: `Sem dose adulto sugerida (dosageRules não contém 'adulto' válido).`,
        gravidade: 'high',
        local: `${e.id} · dosageRules[adulto]`,
        correcaoSugerida: 'Cadastrar dose_adulto (habitual/via/unidade) na fonte.',
      });
    }

    // 3) Apresentação / concentração
    if (e.brands.length > 0 && e.presentations.length === 0) {
      issues.push({
        rule: 'APRESENTACAO_INEXISTENTE',
        erro: `Marca(s) cadastrada(s) mas nenhuma apresentação (concentração/forma).`,
        gravidade: 'medium',
        local: `${e.id} · presentations[]`,
        correcaoSugerida: 'Vincular apresentações (concentração + forma) às marcas.',
      });
    }
    for (const p of e.presentations) {
      if (!p.concentration || p.concentration.trim().length === 0) {
        issues.push({
          rule: 'CONCENTRACAO_AUSENTE',
          erro: `Apresentação com concentração vazia (forma: "${p.form}").`,
          gravidade: 'high',
          local: `${e.id} · presentations[${p.brandId ?? '?'}]`,
          correcaoSugerida: 'Preencher a concentração da apresentação ou remover a apresentação inválida.',
        });
      }
    }
    // Concentração divergente: marca sem nenhuma concentração agregada
    if (e.brands.length > 0 && e.concentrations.length === 0) {
      issues.push({
        rule: 'CONCENTRACAO_DIVERGENTE',
        erro: `Nenhuma concentração agregada apesar de marcas cadastradas.`,
        gravidade: 'medium',
        local: `${e.id} · concentrations[]`,
        correcaoSugerida: 'Garantir que as concentrações das marcas/apresentações estejam registradas.',
      });
    }

    // Índice de marcas para checagens cruzadas
    for (const b of e.brands) {
      const key = toSlug(b.name);
      const rec = brandIndex.get(key) ?? {
        moleculeIds: new Set<string>(),
        laboratories: new Set<string>(),
        drugs: new Set<string>(),
      };
      rec.moleculeIds.add(e.activeIngredient.moleculeId);
      rec.laboratories.add(b.laboratoryId);
      rec.drugs.add(e.id);
      brandIndex.set(key, rec);
    }
  }

  // 1) Marca associada ao ativo errado — mesma marca → princípios ativos distintos
  for (const [brand, rec] of brandIndex) {
    if (rec.moleculeIds.size > 1) {
      issues.push({
        rule: 'MARCA_ATIVO_ERRADO',
        erro: `Marca "${brand}" associada a ${rec.moleculeIds.size} princípios ativos distintos: ${[...rec.moleculeIds].join(', ')}.`,
        gravidade: 'high',
        local: `marca:${brand} · drugs=${[...rec.drugs].join(', ')}`,
        correcaoSugerida: 'Verificar a atribuição da marca; uma marca comercial deve corresponder a um único princípio ativo (salvo combinações).',
      });
    }
    // 2) Marca com laboratório divergente (deve ser 0 após RM-06)
    if (rec.laboratories.size > 1) {
      issues.push({
        rule: 'MARCA_LAB_DIVERGENTE',
        erro: `Marca "${brand}" associada a ${rec.laboratories.size} laboratórios: ${[...rec.laboratories].join(', ')}.`,
        gravidade: 'high',
        local: `marca:${brand}`,
        correcaoSugerida: 'Unificar o laboratório canônico (RM-00 resolveLaboratory / LAB_ALIASES).',
      });
    }
  }

  return issues;
}

const SEVERITIES: ConsistencySeverity[] = ['critical', 'high', 'medium', 'low'];

/** Gera o relatório agregado da consistência da base. */
export function buildConsistencyReport(
  entities: DrugEntity[] = drugRepository.getAll(),
): ConsistencyReport {
  const inconsistencies = checkDrugConsistency(entities);
  const bySeverity = Object.fromEntries(SEVERITIES.map((s) => [s, 0])) as Record<
    ConsistencySeverity,
    number
  >;
  const byRule: Record<string, number> = {};
  for (const i of inconsistencies) {
    bySeverity[i.gravidade]++;
    byRule[i.rule] = (byRule[i.rule] ?? 0) + 1;
  }
  return {
    timestamp: new Date().toISOString(),
    totalEntities: entities.length,
    totalInconsistencies: inconsistencies.length,
    bySeverity,
    byRule,
    inconsistencies,
    buildOk: bySeverity.critical === 0,
  };
}
