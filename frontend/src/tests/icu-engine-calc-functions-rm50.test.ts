// ============================================================
// RM-50 (RM41-032) — cobertura direta das funções de cálculo do
// icu-engine que antes só eram exercitadas por scripts sem asserção.
// `readVital`/`assessICUPatient` já tinham cobertura real
// (icu-engine-defaults-clinicos.test.ts) — não duplicada aqui.
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  calcSofa,
  calcQsofa,
  calcVasopressorInfusion,
  calcEpinephrinePCR,
  calcPPI,
  calcVCAlvo,
  calcDrivingPressure,
} from '@/lib/icu-engine';

describe('RM-50 — calcSofa', () => {
  it('soma os scores dos 6 órgãos corretamente', () => {
    const r = calcSofa([1, 2, 0, 1, 0, 2]);
    expect(r.total).toBe(6);
  });

  it('fronteiras de mortalidade: 1→"< 10%", 3→"~15%", 6→"~20–30%", 9→"~40–60%", 12→"~50–60%", 13→"> 80%"', () => {
    expect(calcSofa([1]).mortalidade).toBe('< 10%');
    expect(calcSofa([3]).mortalidade).toBe('~15%');
    expect(calcSofa([6]).mortalidade).toBe('~20–30%');
    expect(calcSofa([9]).mortalidade).toBe('~40–60%');
    expect(calcSofa([12]).mortalidade).toBe('~50–60%');
    expect(calcSofa([13]).mortalidade).toBe('> 80%');
  });

  it('array vazio: total 0, mortalidade mínima — não lança erro', () => {
    const r = calcSofa([]);
    expect(r.total).toBe(0);
    expect(r.mortalidade).toBe('< 10%');
  });

  it('score negativo em um órgão (entrada inválida) é somado sem rejeição — comportamento atual documentado (achado aberto: sem validação de plausibilidade de entrada)', () => {
    const r = calcSofa([-1, 2]);
    expect(r.total).toBe(1);
  });
});

describe('RM-50 — calcQsofa', () => {
  it('0 critérios: score 0, sem alerta', () => {
    const r = calcQsofa(false, false, false);
    expect(r.score).toBe(0);
    expect(r.alerta).toBe(false);
  });

  it('exatamente 2 critérios: score 2, ALERTA disparado (fronteira clínica real de sepse)', () => {
    const r = calcQsofa(true, true, false);
    expect(r.score).toBe(2);
    expect(r.alerta).toBe(true);
  });

  it('1 critério isolado: score 1, sem alerta (fronteira abaixo do limiar)', () => {
    const r = calcQsofa(true, false, false);
    expect(r.score).toBe(1);
    expect(r.alerta).toBe(false);
  });

  it('3 critérios: score 3, alerta', () => {
    const r = calcQsofa(true, true, true);
    expect(r.score).toBe(3);
    expect(r.alerta).toBe(true);
  });
});

describe('RM-50 — calcVasopressorInfusion', () => {
  it('cálculo padrão: noradrenalina 0.1 mcg/kg/min, 70kg, concentração 32 mcg/mL', () => {
    // mcg/h = 0.1*70*60 = 420; ml/h = 420/32 = 13.125 -> arredonda 13.1
    const r = calcVasopressorInfusion('noradrenalina', 0.1, 70, 32);
    expect(r.ml_h).toBeCloseTo(13.1, 1);
    expect(r.ml_min).toBeCloseTo(13.1 / 60, 1);
  });

  it('dose zero: ml_h 0 (não lança, não fabrica infusão)', () => {
    const r = calcVasopressorInfusion('noradrenalina', 0, 70, 32);
    expect(r.ml_h).toBe(0);
  });

  it('concentração zero produz Infinity — achado aberto (sem guarda de divisão por zero)', () => {
    const r = calcVasopressorInfusion('noradrenalina', 0.1, 70, 0);
    expect(r.ml_h).toBe(Infinity);
  });

  it('peso negativo produz ml_h negativo sem rejeição — achado aberto (sem validação de plausibilidade)', () => {
    const r = calcVasopressorInfusion('noradrenalina', 0.1, -70, 32);
    expect(r.ml_h).toBeLessThan(0);
  });
});

describe('RM-50 — calcEpinephrinePCR', () => {
  it('bolus: sempre 1 mg fixo, independente do peso (protocolo de adulto em PCR)', () => {
    expect(calcEpinephrinePCR(70, 'bolus')).toContain('1 mg');
    expect(calcEpinephrinePCR(50, 'bolus')).toContain('1 mg');
  });

  it('infusão: 0.01 mg/kg — 70kg = 0.70 mg (700 mcg)', () => {
    const r = calcEpinephrinePCR(70, 'infusao');
    expect(r).toContain('0.70 mg');
    expect(r).toContain('700 mcg');
  });

  it('peso zero em modo infusão: dose 0.00 mg — não lança, mas não faz sentido clínico (achado aberto: sem validação de peso > 0)', () => {
    const r = calcEpinephrinePCR(0, 'infusao');
    expect(r).toContain('0.00 mg');
  });

  it('default do parâmetro tipo é "bolus" quando omitido', () => {
    expect(calcEpinephrinePCR(70)).toContain('1 mg');
  });
});

describe('RM-50 — calcPPI (peso predito ideal)', () => {
  it('homem, 170cm: PPI ≈ 66.2 kg (fórmula Devine)', () => {
    const r = calcPPI(170, 'M');
    // alturaInches = 170/2.54 = 66.93; 50 + 2.3*(66.93-60) = 50 + 15.95 = 65.95 ~ 66.0
    expect(r).toBeCloseTo(66.0, 0);
  });

  it('mulher, mesma altura: PPI menor que homem (fórmula usa base 45.5 em vez de 50)', () => {
    const m = calcPPI(170, 'M');
    const f = calcPPI(170, 'F');
    expect(f).toBeLessThan(m);
    expect(m - f).toBeCloseTo(4.5, 0);
  });

  it('altura muito baixa (150cm): PPI ainda calculado (pode ficar próximo do termo-base, sem validação de plausibilidade — achado aberto)', () => {
    const r = calcPPI(150, 'M');
    expect(Number.isFinite(r)).toBe(true);
  });
});

describe('RM-50 — calcVCAlvo', () => {
  it('170cm, homem, 6 mL/kg (padrão): vc_ml consistente com ppi × 6', () => {
    const r = calcVCAlvo(170, 'M');
    expect(r.vc_ml).toBe(Math.round(r.ppi * 6));
  });

  it('intervalo declarado (4–6 mL/kg) é consistente com o ppi calculado', () => {
    const r = calcVCAlvo(170, 'M');
    expect(r.intervalo).toBe(`${Math.round(r.ppi * 4)}–${Math.round(r.ppi * 6)} mL (4–6 mL/kg PPI)`);
  });

  it('ml_kg customizado (4, ventilação protetora em SDRA grave): reduz vc_ml proporcionalmente', () => {
    const padrao = calcVCAlvo(170, 'M', 6);
    const protetora = calcVCAlvo(170, 'M', 4);
    expect(protetora.vc_ml).toBeLessThan(padrao.vc_ml);
  });
});

describe('RM-50 — calcDrivingPressure', () => {
  it('platô 25, PEEP 10: DP=15, seguro (fronteira <= 15)', () => {
    const r = calcDrivingPressure(25, 10);
    expect(r.dp).toBe(15);
    expect(r.seguro).toBe(true);
    expect(r.alerta).toContain('seguro');
  });

  it('platô 30, PEEP 10: DP=20 > 15 — inseguro, alerta explícito de redução', () => {
    const r = calcDrivingPressure(30, 10);
    expect(r.dp).toBe(20);
    expect(r.seguro).toBe(false);
    expect(r.alerta).toContain('reduzir PEEP ou VC');
  });

  it('PEEP maior que platô (entrada clinicamente impossível): DP negativo, classificado como "seguro" sem alerta de implausibilidade — achado aberto (RM41-005-símile: falta de validação de plausibilidade em parâmetros ventilatórios)', () => {
    const r = calcDrivingPressure(10, 20);
    expect(r.dp).toBe(-10);
    expect(r.seguro).toBe(true); // -10 <= 15, mas é uma entrada fisiologicamente absurda que passa sem alerta
  });
});
