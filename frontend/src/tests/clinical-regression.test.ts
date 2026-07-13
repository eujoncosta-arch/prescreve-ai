// ============================================================
// PRESCREVE-AI — RM-22: Clinical Regression Suite (runner Vitest)
//
// Executa TODOS os casos clínicos a cada alteração (npm test).
// Cada caso valida, contra os motores reais, que o resultado esperado
// continua sendo produzido — travando contra regressões clínicas futuras.
// ============================================================

import { describe, it, expect } from 'vitest';
import { CLINICAL_CASES, runCase } from '@/clinical-tests';

describe('RM-22 · Clinical Regression Suite', () => {
  it('cobre as 8 categorias clínicas exigidas', () => {
    const cats = new Set(CLINICAL_CASES.map((c) => c.category));
    for (const req of [
      'pediatria',
      'idosos',
      'gestantes',
      'renal',
      'hepatico',
      'interacoes',
      'contraindicacoes',
      'dose',
      'controlados',
    ]) {
      expect(cats.has(req as never), `categoria ausente: ${req}`).toBe(true);
    }
  });

  it('não há ids de caso duplicados', () => {
    const ids = CLINICAL_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Um teste por caso clínico — falha isolada aponta a regressão exata.
  describe.each(CLINICAL_CASES.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    it(`${c.category} — ${c.caso}`, () => {
      const r = runCase(c);
      // Mensagem rica para diagnóstico em caso de regressão.
      expect(
        r.status,
        `\nCaso: ${r.caso}\nEntrada: ${r.entrada}\nEsperado: ${r.esperado}\nObtido: ${r.obtido}`,
      ).toBe('PASS');
    });
  });
});
