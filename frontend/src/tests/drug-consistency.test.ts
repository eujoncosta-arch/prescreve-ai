// ============================================================
// PRESCREVE-AI — RM-23: Drug Consistency Engine (runner Vitest)
// Roda a cada `npm test`, além do gate de build (prebuild).
// ============================================================

import { describe, it, expect } from 'vitest';
import { buildConsistencyReport, checkDrugConsistency, formatConsistencyMarkdown } from '@/validation/drug-consistency';
import { drugRepository } from '@/lib/pharma-core';

describe('RM-23 · Drug Consistency Engine', () => {
  const report = buildConsistencyReport();

  it('não há inconsistências CRÍTICAS (gate de build)', () => {
    expect(report.buildOk, JSON.stringify(report.bySeverity)).toBe(true);
    expect(report.bySeverity.critical).toBe(0);
  });

  it('valida a base canônica inteira', () => {
    expect(report.totalEntities).toBe(drugRepository.count());
  });

  it('todo princípio ativo tem molecule_id canônico', () => {
    const malformados = checkDrugConsistency().filter((i) => i.rule === 'ATIVO_MALFORMADO');
    expect(malformados).toHaveLength(0);
  });

  it('nenhuma marca aponta para 2 princípios ativos distintos', () => {
    const marcaAtivo = checkDrugConsistency().filter((i) => i.rule === 'MARCA_ATIVO_ERRADO');
    expect(marcaAtivo, marcaAtivo.map((i) => i.erro).join(' | ')).toHaveLength(0);
  });

  it('nenhuma marca com laboratório divergente (pós RM-06)', () => {
    const labDiv = checkDrugConsistency().filter((i) => i.rule === 'MARCA_LAB_DIVERGENTE');
    expect(labDiv).toHaveLength(0);
  });

  it('gera relatório Markdown com o resumo', () => {
    const md = formatConsistencyMarkdown();
    expect(md).toContain('RM23_DRUG_CONSISTENCY_REPORT');
    expect(md).toContain('Gravidade');
  });

  it('detecta corretamente uma inconsistência injetada (sanidade do engine)', () => {
    const bad = checkDrugConsistency([
      {
        ...drugRepository.getById('enalapril')!,
        id: 'fake-broken',
        indications: [],
        dosageRules: [],
        activeIngredient: { ...drugRepository.getById('enalapril')!.activeIngredient, moleculeId: 'BROKEN' },
      },
    ]);
    const regras = new Set(bad.map((i) => i.rule));
    expect(regras.has('ATIVO_MALFORMADO')).toBe(true);
    expect(regras.has('SEM_INDICACAO')).toBe(true);
    expect(regras.has('DOSE_AUSENTE')).toBe(true);
    expect(bad.some((i) => i.gravidade === 'critical')).toBe(true);
  });
});
