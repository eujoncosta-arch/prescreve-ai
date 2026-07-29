// ============================================================
// PRESCREVE-AI — RM-24: Cross Database Validator (runner Vitest)
// Roda a cada `npm test`, além do gate de publicação (prebuild).
// ============================================================

import { describe, it, expect } from 'vitest';
import { buildSyncReport, compareSources, formatSyncMarkdown } from '@/validation/cross-database';

describe('RM-24 · Cross Database Validator', () => {
  const report = buildSyncReport();

  it('compara as 5 fontes internas (RM-52/RM41-014: lab-catalog adicionado)', () => {
    expect(Object.keys(report.bySource)).toEqual([
      'PHARMA_DB',
      'Eurofarma',
      'Clinical rules (pediatria)',
      'Prescription engine',
      'Lab catalog (ANVISA)',
    ]);
    expect(report.totalAnalisado).toBeGreaterThan(0);
  });

  it('nenhum conflito crítico entre fontes (gate de publicação)', () => {
    const criticos = report.findings.filter((f) => f.gravidade === 'critical');
    expect(report.publishOk, criticos.map((f) => f.detalhe).join(' | ')).toBe(true);
    expect(report.criticos).toBe(0);
  });

  it('produz as métricas exigidas (total/compatíveis/divergentes/aceitos/críticos)', () => {
    expect(report).toHaveProperty('totalAnalisado');
    expect(report).toHaveProperty('compativeis');
    expect(report).toHaveProperty('divergentes');
    expect(report).toHaveProperty('aceitos');
    expect(report).toHaveProperty('criticos');
  });

  // RM-54: achado #1 (médio) — 9 moléculas Eurofarma/lab-catalog que
  // estavam ausentes do PHARMA_DB foram cadastradas
  // (`pharma-database-rm54-gaps.ts`); as outras 3 (insulina NPH, insulina
  // regular, dabigatrana) já existiam e eram um falso positivo de
  // canonicalização (nome farmacopêutico completo vs. abreviado),
  // corrigido em `pharmaAliasKeys`/`SALT_QUALIFIERS`. Nenhuma delas deve
  // continuar aparecendo como achado 'medium'.
  it('RM-54: nenhum achado medium de medicamento_ausente permanece (as 12 moléculas foram fechadas)', () => {
    const mediumAusentes = report.findings.filter((f) => f.tipo === 'medicamento_ausente' && f.gravidade === 'medium');
    expect(mediumAusentes, JSON.stringify(mediumAusentes)).toHaveLength(0);
  });

  // RM-54: achado #2 (baixo) — combinações comerciais fora do escopo do
  // PHARMA_DB (moléculas isoladas) são uma decisão de escopo documentada,
  // não um risco em aberto — marcadas `aceito: true` e excluídas de
  // `divergentes`, mas continuam listadas em `findings` (nunca escondidas).
  it('RM-54: achados de combinação comercial (low) são marcados aceito=true e não contam em divergentes', () => {
    const combos = report.findings.filter((f) => f.tipo === 'medicamento_ausente' && f.gravidade === 'low');
    expect(combos.length).toBeGreaterThan(0);
    expect(combos.every((f) => f.aceito === true)).toBe(true);
    // Todas as chaves 'low' aceitas não devem estar entre as divergentes.
    const chavesLow = new Set(combos.map((f) => f.chave));
    const chavesDivergentesNaoAceitas = report.findings
      .filter((f) => f.gravidade !== 'critical' && !f.aceito)
      .map((f) => f.chave);
    for (const k of chavesLow) expect(chavesDivergentesNaoAceitas).not.toContain(k);
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
