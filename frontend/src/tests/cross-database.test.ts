// ============================================================
// PRESCREVE-AI — RM-24: Cross Database Validator (runner Vitest)
// Roda a cada `npm test`, além do gate de publicação (prebuild).
// ============================================================

import { describe, it, expect } from 'vitest';
import { buildSyncReport, compareSources, formatSyncMarkdown } from '@/validation/cross-database';

describe('RM-24 · Cross Database Validator', () => {
  const report = buildSyncReport();

  it('compara as 4 fontes internas', () => {
    expect(Object.keys(report.bySource)).toEqual([
      'PHARMA_DB',
      'Eurofarma',
      'Clinical rules (pediatria)',
      'Prescription engine',
    ]);
    expect(report.totalAnalisado).toBeGreaterThan(0);
  });

  it('nenhum conflito crítico entre fontes (gate de publicação)', () => {
    const criticos = report.findings.filter((f) => f.gravidade === 'critical');
    expect(report.publishOk, criticos.map((f) => f.detalhe).join(' | ')).toBe(true);
    expect(report.criticos).toBe(0);
  });

  it('produz as métricas exigidas (total/compatíveis/divergentes/críticos)', () => {
    expect(report).toHaveProperty('totalAnalisado');
    expect(report).toHaveProperty('compativeis');
    expect(report).toHaveProperty('divergentes');
    expect(report).toHaveProperty('criticos');
  });

  it('cada achado traz tipo, gravidade, chave, fontes e correção sugerida', () => {
    for (const f of compareSources()) {
      expect(f.tipo).toBeTruthy();
      expect(f.gravidade).toBeTruthy();
      expect(f.chave).toBeTruthy();
      expect(f.correcaoSugerida.length).toBeGreaterThan(0);
    }
  });

  it('gera o DATABASE_SYNC_REPORT em Markdown', () => {
    const md = formatSyncMarkdown();
    expect(md).toContain('DATABASE_SYNC_REPORT');
    expect(md).toContain('Total analisado');
  });
});
