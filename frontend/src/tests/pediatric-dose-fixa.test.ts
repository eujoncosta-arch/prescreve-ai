import { describe, it, expect } from 'vitest';
import { calcDosePediatrica } from '@/lib/pediatric-engine';

describe('calcDosePediatrica() — doseFixa por IDADE vs. por PESO não são confundidas', () => {
  it('albendazol — lactente de 18 meses (1–2 anos) recebe 200 mg, NÃO 400 mg (regressão de superdosagem 2x)', () => {
    const r = calcDosePediatrica('albendazol', { pesoKg: 11, idadeMeses: 18 });
    expect(r).not.toBeNull();
    expect(r?.doseUnitariaMg).toBe(200);
  });

  it('albendazol — criança de 3 anos (>2 anos) recebe 400 mg', () => {
    const r = calcDosePediatrica('albendazol', { pesoKg: 14, idadeMeses: 36 });
    expect(r).not.toBeNull();
    expect(r?.doseUnitariaMg).toBe(400);
  });

  it('albendazol — bebê de 13 meses pesando mais que um adulto pequeno (peso NUNCA deve decidir a faixa etária)', () => {
    // Peso deliberadamente alto para provar que a faixa é decidida pela
    // idade (13 meses → tier 1–2 anos → 200mg), não pelo peso.
    const r = calcDosePediatrica('albendazol', { pesoKg: 45, idadeMeses: 13 });
    expect(r).not.toBeNull();
    expect(r?.doseUnitariaMg).toBe(200);
  });

  it('oseltamivir — faixas por PESO continuam funcionando corretamente após a correção (não regride)', () => {
    const r10kg = calcDosePediatrica('oseltamivir', { pesoKg: 10, idadeMeses: 24 });
    expect(r10kg?.doseUnitariaMg).toBe(30);

    const r20kg = calcDosePediatrica('oseltamivir', { pesoKg: 20, idadeMeses: 60 });
    expect(r20kg?.doseUnitariaMg).toBe(45);

    const r50kg = calcDosePediatrica('oseltamivir', { pesoKg: 50, idadeMeses: 144 });
    expect(r50kg?.doseUnitariaMg).toBe(75);
  });
});
