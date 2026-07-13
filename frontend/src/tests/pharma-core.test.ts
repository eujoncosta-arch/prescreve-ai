// ============================================================
// PRESCREVE-AI — RM-06 pharma-core (Single Source of Truth) tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { drugRepository } from '@/lib/pharma-core';
import { validateMigration } from '@/lib/pharma-core/validate';
import { getAllDrugs } from '@/lib/pharma-database';

describe('RM-06 · Drug Repository Layer', () => {
  it('migra 1:1 todos os QuickDrugs para DrugEntity', () => {
    expect(drugRepository.count()).toBe(getAllDrugs().length);
    expect(drugRepository.count()).toBeGreaterThan(300);
  });

  it('getById retorna a entidade canônica', () => {
    const e = drugRepository.getById('enalapril');
    expect(e).toBeDefined();
    expect(e!.activeIngredient.name).toBe('Enalapril');
    expect(e!.activeIngredient.moleculeId).toBe('mol:enalapril');
    expect(e!.activeIngredient.atc).toBeTruthy();
  });

  it('getByActiveIngredient agrega as variantes de contexto (RM-01 MED-01)', () => {
    const mid = drugRepository.getByActiveIngredient('midazolam');
    expect(mid.length).toBe(3);
    expect(mid.every((e) => !!e.clinicalContext)).toBe(true);
  });

  it('salt-agnóstico: encontra por molécula com sal', () => {
    const a = drugRepository.getByActiveIngredient('Besilato de Anlodipino');
    const b = drugRepository.getByActiveIngredient('anlodipino');
    expect(a.length).toBeGreaterThan(0);
    expect(a.map((e) => e.id)).toEqual(b.map((e) => e.id));
  });

  it('getByBrand resolve marca de referência ao laboratório canônico', () => {
    const jard = drugRepository.getByBrand('Jardiance');
    expect(jard.length).toBeGreaterThan(0);
    expect(jard[0].activeIngredient.moleculeId).toBe('mol:empagliflozina');
  });

  it('search encontra por princípio ativo, marca e classe', () => {
    expect(drugRepository.search('losartana').length).toBeGreaterThan(0);
    expect(drugRepository.search('jardiance').length).toBeGreaterThan(0);
  });

  it('cada entidade carrega o envelope de proveniência (RM-00)', () => {
    for (const e of drugRepository.getAll()) {
      expect(e.provenance).toBeDefined();
      expect(e.provenance.nivel_confianca).toBeTruthy();
      expect(e.dosageRules.length).toBeGreaterThan(0);
    }
  });
});

describe('RM-06 · Validação da migração', () => {
  const report = validateMigration();

  it('paridade fonte↔canônico', () => {
    expect(report.migrated.ok).toBe(true);
    expect(report.migrated.totalEntities).toBe(report.source.totalQuickDrugs);
  });

  it('sem IDs canônicos duplicados', () => {
    expect(report.duplicates.duplicateIds).toHaveLength(0);
  });

  it('sem conflitos marca↔laboratório', () => {
    expect(report.conflicts.brandMultiLab).toHaveLength(0);
  });

  it('sem lacunas clínicas críticas (interações/dose/indicação/contraindicação)', () => {
    expect(report.summary.entitiesWithMissingClinicalData).toBe(0);
  });
});
