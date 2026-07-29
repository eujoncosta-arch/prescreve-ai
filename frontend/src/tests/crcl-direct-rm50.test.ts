// ============================================================
// RM-50 (RM41-027/028) — cobertura direta de calculadoras de CrCl
//
// Existem 3 implementações paralelas de Cockcroft-Gault no projeto
// (RM41-030, ainda aberto — duplicação/unidades divergentes não
// unificada nesta rodada). Este arquivo testa CADA UMA diretamente,
// documentando o comportamento real e as fronteiras de cada uma.
// ============================================================
import { describe, it, expect } from 'vitest';
import { calcCrCl as calcCrClSimples } from '@/lib/utils';
import { calcCrCl as calcCrClDetalhado, type PatientParams } from '@/lib/dose-calculator';
import { calcClCrCockcroft } from '@/lib/geriatric-engine';

describe('RM-50 — utils.calcCrCl (variante simples, creatinina em mg/dL)', () => {
  it('adulto masculino típico: 60 anos, 70kg, creatinina 1.0 mg/dL', () => {
    const r = calcCrClSimples(1.0, 60, 70, 'M');
    // (140-60)*70/(72*1.0) = 5600/72 = 77.8
    expect(r).toBeCloseTo(77.8, 1);
  });

  it('sexo feminino aplica fator 0.85', () => {
    const m = calcCrClSimples(1.0, 60, 70, 'M');
    const f = calcCrClSimples(1.0, 60, 70, 'F');
    expect(f).toBeCloseTo(m * 0.85, 1);
  });

  it('creatinina zero produz Infinity (divisão por zero) — comportamento NÃO seguro, documentado como achado aberto RM41-030', () => {
    const r = calcCrClSimples(0, 60, 70, 'M');
    expect(r).toBe(Infinity);
  });

  it('idade negativa produz um valor calculado sem rejeição (não há guarda de plausibilidade nesta variante) — achado aberto', () => {
    const r = calcCrClSimples(1.0, -10, 70, 'M');
    expect(Number.isFinite(r)).toBe(true); // não lança, não retorna null — apenas calcula algo
  });

  it('creatinina negativa inverte o sinal do resultado sem rejeição — achado aberto (não fabricar CrCl negativo)', () => {
    const r = calcCrClSimples(-1.0, 60, 70, 'M');
    expect(r).toBeLessThan(0);
  });
});

describe('RM-50 — dose-calculator.calcCrCl (variante detalhada, com estágio CKD e IBW)', () => {
  function params(overrides: Partial<PatientParams> = {}): PatientParams {
    return { idade: 60, sexo: 'M', peso: 70, creatinina: 1.0, ...overrides };
  }

  it('adulto masculino típico: retorna estágio G2 (60-89 mL/min) para o cenário padrão', () => {
    const r = calcCrClDetalhado(params());
    expect(r).not.toBeNull();
    expect(r?.crcl).toBeCloseTo(77.8, 1);
    expect(r?.ckd_stage).toBe('G2');
  });

  it('fronteira G1/G2 — crcl exatamente 90 classifica G1', () => {
    // resolve creatinina para produzir crcl == 90: (140-40)*90/(72*c) = 90 -> c = 100*90/(72*90) = 100/72
    const r = calcCrClDetalhado(params({ idade: 40, peso: 90, creatinina: 100 / 72 }));
    expect(r?.crcl).toBeCloseTo(90, 0);
    expect(r?.ckd_stage).toBe('G1');
  });

  it('estágio G5 para insuficiência renal terminal (crcl < 15)', () => {
    const r = calcCrClDetalhado(params({ idade: 80, peso: 50, creatinina: 8 }));
    expect(r!.crcl).toBeLessThan(15);
    expect(r?.ckd_stage).toBe('G5');
  });

  it('paciente obeso (peso > 1.2x IBW): usa peso ajustado, não o peso real, e sinaliza no passo a passo', () => {
    const r = calcCrClDetalhado(params({ idade: 50, peso: 150, altura: 170 }));
    expect(r?.passo_a_passo.some((p) => p.includes('Obesidade detectada'))).toBe(true);
  });

  it('creatinina ausente (undefined): retorna null — não fabrica CrCl sem o dado', () => {
    expect(calcCrClDetalhado(params({ creatinina: undefined }))).toBeNull();
  });

  it('creatinina zero: retorna null (guarda falsy já existente)', () => {
    expect(calcCrClDetalhado(params({ creatinina: 0 }))).toBeNull();
  });

  it('idade negativa: RM-50 adicionou guarda de plausibilidade — retorna null, não fabrica resultado', () => {
    expect(calcCrClDetalhado(params({ idade: -5 }))).toBeNull();
  });

  it('idade acima de 120 anos: retorna null', () => {
    expect(calcCrClDetalhado(params({ idade: 130 }))).toBeNull();
  });

  it('peso negativo: retorna null', () => {
    expect(calcCrClDetalhado(params({ peso: -70 }))).toBeNull();
  });

  it('peso acima de 500kg (implausível): retorna null', () => {
    expect(calcCrClDetalhado(params({ peso: 600 }))).toBeNull();
  });

  it('creatinina negativa: retorna null', () => {
    expect(calcCrClDetalhado(params({ creatinina: -1 }))).toBeNull();
  });

  it('creatinina acima de 30 mg/dL (implausível mesmo em diálise): retorna null', () => {
    expect(calcCrClDetalhado(params({ creatinina: 40 }))).toBeNull();
  });

  it('NaN em qualquer campo numérico: retorna null (Number.isFinite rejeita)', () => {
    expect(calcCrClDetalhado(params({ idade: NaN }))).toBeNull();
    expect(calcCrClDetalhado(params({ peso: NaN }))).toBeNull();
    expect(calcCrClDetalhado(params({ creatinina: NaN }))).toBeNull();
  });

  it('Infinity em qualquer campo numérico: retorna null', () => {
    expect(calcCrClDetalhado(params({ idade: Infinity }))).toBeNull();
    expect(calcCrClDetalhado(params({ peso: Infinity }))).toBeNull();
    expect(calcCrClDetalhado(params({ creatinina: Infinity }))).toBeNull();
  });
});

describe('RM-50 — geriatric-engine.calcClCrCockcroft (variante µmol/L)', () => {
  it('converte µmol/L para mg/dL internamente (÷88.42) antes de aplicar a fórmula', () => {
    // 88.42 µmol/L == 1.0 mg/dL
    const rMicromol = calcClCrCockcroft(60, 70, 88.42, 'M');
    const rMgDl = calcCrClSimples(1.0, 60, 70, 'M');
    expect(rMicromol).toBeCloseTo(rMgDl, 1);
  });

  it('sexo feminino aplica fator 0.85, igual às outras duas variantes', () => {
    const m = calcClCrCockcroft(60, 70, 88.42, 'M');
    const f = calcClCrCockcroft(60, 70, 88.42, 'F');
    expect(f).toBeCloseTo(m * 0.85, 1);
  });

  it('creatinina zero produz Infinity — mesma fragilidade das outras variantes (achado aberto RM41-030)', () => {
    const r = calcClCrCockcroft(60, 70, 0, 'M');
    expect(r).toBe(Infinity);
  });
});

describe('RM-50 — RM41-030: as 3 variantes concordam numericamente para a MESMA entrada clínica (mesma fórmula, unidades diferentes)', () => {
  it('60 anos, 70kg, creatinina 1.0 mg/dL (== 88.42 µmol/L), sexo M: as 3 variantes produzem o mesmo valor', () => {
    const a = calcCrClSimples(1.0, 60, 70, 'M');
    const b = calcCrClDetalhado({ idade: 60, sexo: 'M', peso: 70, creatinina: 1.0 })!.crcl;
    const c = calcClCrCockcroft(60, 70, 88.42, 'M');
    expect(a).toBeCloseTo(b, 0);
    expect(b).toBeCloseTo(c, 0);
  });
});
