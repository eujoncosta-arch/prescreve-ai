import { describe, it, expect } from 'vitest';
import { calcClCrSchwartz } from '@/lib/pediatric-engine';

// ============================================================
// RM-36 — resolução PED-AUDIT-07: `calcClCrSchwartz` aplicava k=0,70
// (coeficiente MASCULINO) a qualquer adolescente ≥13 anos, sem
// diferenciar sexo — a literatura de referência (Schwartz) exige
// k=0,70 para meninos e k=0,55 para meninas nessa faixa etária.
//
// Auditoria de consumidores (RM-36): `calcClCrSchwartz` não tinha
// NENHUM chamador em todo o repositório antes desta correção — apenas
// esta definição. Nenhum consumidor precisou ser atualizado.
// ============================================================

describe('calcClCrSchwartz() — coeficiente k específico por sexo em adolescentes (regressão PED-AUDIT-07)', () => {
  it('MENINO adolescente (13 anos = 156 meses): usa k=0,70 (coeficiente masculino)', () => {
    const r = calcClCrSchwartz(160, 0.8, 156, 'M');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.kUsado).toBe(0.70);
      expect(r.faixaEtaria).toBe('adolescente');
      expect(r.clcrMlMin1_73m2).toBeCloseTo((0.70 * 160) / 0.8, 5);
    }
  });

  it('MENINA adolescente (13 anos = 156 meses): usa k=0,55 (coeficiente feminino) — NÃO o masculino', () => {
    const r = calcClCrSchwartz(155, 0.8, 156, 'F');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.kUsado).toBe(0.55);
      expect(r.faixaEtaria).toBe('adolescente');
      expect(r.clcrMlMin1_73m2).toBeCloseTo((0.55 * 155) / 0.8, 5);
    }
  });

  it('mesma altura/creatinina, sexos diferentes, mesma idade adolescente: resultados DIFEREM (prova de que o sexo realmente influencia o cálculo)', () => {
    const menino = calcClCrSchwartz(160, 0.8, 156, 'M');
    const menina = calcClCrSchwartz(160, 0.8, 156, 'F');
    expect(menino.ok && menina.ok).toBe(true);
    if (menino.ok && menina.ok) {
      expect(menino.clcrMlMin1_73m2).not.toBeCloseTo(menina.clcrMlMin1_73m2, 5);
      expect(menino.clcrMlMin1_73m2).toBeGreaterThan(menina.clcrMlMin1_73m2);
    }
  });

  it('CRIANÇA abaixo da fronteira adolescente (12 anos = 144 meses): k=0,55 UNISSEX — sexo não altera o resultado', () => {
    const menino = calcClCrSchwartz(140, 0.6, 144, 'M');
    const menina = calcClCrSchwartz(140, 0.6, 144, 'F');
    expect(menino.ok && menina.ok).toBe(true);
    if (menino.ok && menina.ok) {
      expect(menino.kUsado).toBe(0.55);
      expect(menina.kUsado).toBe(0.55);
      expect(menino.faixaEtaria).toBe('crianca');
      expect(menino.clcrMlMin1_73m2).toBeCloseTo(menina.clcrMlMin1_73m2, 10);
    }
  });

  it('LACTENTE (<1 ano): k=0,33 UNISSEX — sexo não altera o resultado', () => {
    const menino = calcClCrSchwartz(60, 0.3, 6, 'M');
    const semSexo = calcClCrSchwartz(60, 0.3, 6, undefined);
    expect(menino.ok && semSexo.ok).toBe(true);
    if (menino.ok && semSexo.ok) {
      expect(menino.kUsado).toBe(0.33);
      expect(semSexo.kUsado).toBe(0.33);
      // Sexo ausente é seguro (não bloqueia) fora da faixa adolescente,
      // porque o coeficiente é unissex nessa faixa etária.
      expect(menino.clcrMlMin1_73m2).toBeCloseTo(semSexo.clcrMlMin1_73m2, 10);
    }
  });

  it('SEXO AUSENTE em adolescente (≥13 anos): cálculo é BLOQUEADO — nunca infere sexo masculino nem feminino silenciosamente', () => {
    const r = calcClCrSchwartz(165, 0.8, 180, undefined);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.motivo).toBe('sexo_ausente_para_adolescente');
      expect(r.erro).toMatch(/sexo/i);
      expect(r.erro).toMatch(/0,70/);
      expect(r.erro).toMatch(/0,55/);
    }
  });

  it('EXATAMENTE na fronteira de 156 meses (13 anos): já é tratado como adolescente — exige sexo', () => {
    const semSexoNaFronteira = calcClCrSchwartz(160, 0.8, 156, undefined);
    expect(semSexoNaFronteira.ok).toBe(false);

    const umMesAntes = calcClCrSchwartz(160, 0.8, 155, undefined);
    expect(umMesAntes.ok).toBe(true);
    if (umMesAntes.ok) {
      expect(umMesAntes.kUsado).toBe(0.55);
      expect(umMesAntes.faixaEtaria).toBe('crianca');
    }
  });

  it('regressão: fórmula em si (k × altura ÷ creatinina) permanece correta — não foi alterada, só o coeficiente k passou a depender de sexo quando aplicável', () => {
    const r = calcClCrSchwartz(120, 0.5, 60, 'M'); // criança, unissex
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.clcrMlMin1_73m2).toBeCloseTo((0.55 * 120) / 0.5, 5);
    }
  });
});
