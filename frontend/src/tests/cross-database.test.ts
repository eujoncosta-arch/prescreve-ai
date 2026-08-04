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

  // RM-54: achado #2 (baixo) — o mecanismo `aceito: true` (combinação
  // comercial fora do escopo do PHARMA_DB de moléculas isoladas) continua
  // válido para casos futuros: qualquer achado assim marcado nunca conta
  // em `divergentes`, mas continua 100% visível em `findings`.
  it('RM-54: qualquer achado de combinação comercial (low, aceito=true) nunca conta em divergentes', () => {
    const combos = report.findings.filter((f) => f.tipo === 'medicamento_ausente' && f.gravidade === 'low');
    expect(combos.every((f) => f.aceito === true)).toBe(true);
    const chavesLow = new Set(combos.map((f) => f.chave));
    const chavesDivergentesNaoAceitas = report.findings
      .filter((f) => f.gravidade !== 'critical' && !f.aceito)
      .map((f) => f.chave);
    for (const k of chavesLow) expect(chavesDivergentesNaoAceitas).not.toContain(k);
  });

  // RM-66 (achado da Seção 6) → RM-69: a heurística "+" auto-aceitava 13
  // combinações comerciais reais sem revisão individual, mascarando o
  // mesmo tipo de gap estrutural do achado RM-58 (produto real invisível
  // ao motor de prescrição). Revisão manual (mesma régua de curadoria do
  // piloto RM-66/Zart H®) mostrou que as 13 têm dados de bula reais e
  // completos — todas foram promovidas ao PHARMA_DB
  // (`pharma-database-rm69-combos.ts`). Nenhuma "aceitação" automática
  // deve permanecer sem revisão individual documentada.
  it('RM-69: as 13 combinações antes aceitas automaticamente foram revisadas e promovidas — nenhuma pendência de revisão restante', () => {
    expect(report.aceitos).toBe(0);
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
