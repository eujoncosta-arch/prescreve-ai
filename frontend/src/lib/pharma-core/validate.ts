// ============================================================
// PRESCREVE-AI — RM-06: Validação da migração (old → new)
//
// Compara as bases legadas com a base canônica e reporta:
//  - registros migrados
//  - conflitos (marca em > 1 laboratório; molécula com dados divergentes)
//  - duplicidades (id canônico repetido; molécula em vários registros)
//  - dados ausentes (campos obrigatórios/clínicos vazios)
//
// Read-only: não altera nem apaga nenhuma base.
// ============================================================

import { getAllDrugs } from '../pharma-database';
import { buildCanonicalDatabase } from './migrate';
import { toSlug } from '../governance/data-governance';
import type { DrugEntity } from './types';

export interface ValidationReport {
  timestamp: string;
  source: { totalQuickDrugs: number };
  migrated: { totalEntities: number; ok: boolean };
  conflicts: {
    brandMultiLab: Array<{ brand: string; laboratories: string[]; drugs: string[] }>;
  };
  duplicates: {
    duplicateIds: Array<{ id: string; count: number }>;
    moleculeMultiEntity: Array<{ moleculeId: string; entities: string[]; contexts: string[] }>;
  };
  missing: {
    noInteractions: string[];
    noDosageRules: string[];
    noIndications: string[];
    noContraindications: string[];
    noAtc: string[];
    noPresentations: string[];
    noAnvisaOnAnyPresentation: string[];
  };
  summary: {
    migratedCount: number;
    conflictCount: number;
    duplicateCount: number;
    entitiesWithMissingClinicalData: number;
  };
}

export function validateMigration(): ValidationReport {
  const source = getAllDrugs();
  const entities = buildCanonicalDatabase();

  // ── Duplicidade de id canônico ──
  const idCount = new Map<string, number>();
  for (const e of entities) idCount.set(e.id, (idCount.get(e.id) ?? 0) + 1);
  const duplicateIds = [...idCount.entries()]
    .filter(([, c]) => c > 1)
    .map(([id, count]) => ({ id, count }));

  // ── Molécula em múltiplos registros (esperado p/ variantes de contexto) ──
  const byMol = new Map<string, DrugEntity[]>();
  for (const e of entities) {
    const arr = byMol.get(e.activeIngredient.moleculeId);
    if (arr) arr.push(e);
    else byMol.set(e.activeIngredient.moleculeId, [e]);
  }
  const moleculeMultiEntity = [...byMol.entries()]
    .filter(([, l]) => l.length > 1)
    .map(([moleculeId, l]) => ({
      moleculeId,
      entities: l.map((e) => e.id),
      contexts: l.map((e) => e.clinicalContext ?? '(sem contexto)'),
    }));

  // ── Conflito: mesma marca (slug) atribuída a > 1 laboratório ──
  const brandLabs = new Map<string, { labs: Set<string>; drugs: Set<string> }>();
  for (const e of entities) {
    for (const b of e.brands) {
      const key = toSlug(b.name);
      const rec = brandLabs.get(key) ?? { labs: new Set(), drugs: new Set() };
      rec.labs.add(b.laboratoryId);
      rec.drugs.add(e.id);
      brandLabs.set(key, rec);
    }
  }
  const brandMultiLab = [...brandLabs.entries()]
    .filter(([, r]) => r.labs.size > 1)
    .map(([brand, r]) => ({ brand, laboratories: [...r.labs], drugs: [...r.drugs] }));

  // ── Dados ausentes ──
  const noInteractions = entities.filter((e) => e.interactions.length === 0).map((e) => e.id);
  const noDosageRules = entities.filter((e) => e.dosageRules.length === 0).map((e) => e.id);
  const noIndications = entities.filter((e) => e.indications.length === 0).map((e) => e.id);
  const noContraindications = entities
    .filter((e) => e.contraindications.length === 0)
    .map((e) => e.id);
  const noAtc = entities.filter((e) => !e.activeIngredient.atc).map((e) => e.id);
  const noPresentations = entities.filter((e) => e.presentations.length === 0).map((e) => e.id);
  const noAnvisaOnAnyPresentation = entities
    .filter((e) => e.presentations.length > 0 && !e.presentations.some((p) => p.registroAnvisa))
    .map((e) => e.id);

  const entitiesWithMissingClinicalData = new Set([
    ...noInteractions,
    ...noDosageRules,
    ...noIndications,
    ...noContraindications,
  ]).size;

  return {
    timestamp: new Date().toISOString(),
    source: { totalQuickDrugs: source.length },
    migrated: { totalEntities: entities.length, ok: entities.length === source.length },
    conflicts: { brandMultiLab },
    duplicates: { duplicateIds, moleculeMultiEntity },
    missing: {
      noInteractions,
      noDosageRules,
      noIndications,
      noContraindications,
      noAtc,
      noPresentations,
      noAnvisaOnAnyPresentation,
    },
    summary: {
      migratedCount: entities.length,
      conflictCount: brandMultiLab.length,
      duplicateCount: duplicateIds.length,
      entitiesWithMissingClinicalData,
    },
  };
}
