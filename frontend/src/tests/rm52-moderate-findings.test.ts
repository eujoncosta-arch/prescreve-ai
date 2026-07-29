// ============================================================
// RM-52 — regressão dos achados moderados/baixos do RM-41 corrigidos
// nesta rodada: RM41-006, RM41-007, RM41-008, RM41-009.
// ============================================================
import { describe, it, expect } from 'vitest';
import { calcWeightDose, classifyPopulation, getPediatricAgeGroup } from '@/lib/dose-calculator';
import { calcDosePediatrica } from '@/lib/pediatric-engine';

describe('RM-52 (RM41-006) — calcWeightDose: texto do passo a passo reflete o teto real', () => {
  it('dose bruta EXCEDE o máximo: passo a passo afirma o excedente (não mais "sem ajuste")', () => {
    const r = calcWeightDose(20, 100, 2, 1000, 'mg'); // bruto 2000mg > máx 1000mg
    expect(r.dose_total_dia).toBe(1000); // teto aplicado corretamente
    expect(r.passo_a_passo.some(p => p.includes('2000.0') && p.includes('máxima'))).toBe(true);
    expect(r.passo_a_passo.some(p => p.includes('sem ajuste necessário'))).toBe(false);
  });

  it('dose bruta DENTRO do máximo: passo a passo afirma "sem ajuste necessário" (não regride)', () => {
    const r = calcWeightDose(5, 10, 2, 1000, 'mg'); // bruto 50mg < máx 1000mg
    expect(r.dose_total_dia).toBe(50);
    expect(r.passo_a_passo.some(p => p.includes('sem ajuste necessário'))).toBe(true);
  });
});

describe('RM-52 (RM41-007) — classifyPopulation: corte de neonato alinhado com dosing-engine.ts (28 dias)', () => {
  it('29 dias de vida (29/365 anos): NÃO é mais classificado como neonato (era um bug de 30,3 dias antes)', () => {
    const idade29dias = 29 / 365;
    const r = classifyPopulation(idade29dias);
    expect(r.population).not.toBe('neonato');
    expect(r.population).toBe('lactente');
  });

  it('27 dias de vida: continua classificado como neonato', () => {
    const idade27dias = 27 / 365;
    const r = classifyPopulation(idade27dias);
    expect(r.population).toBe('neonato');
  });
});

describe('RM-52 (RM41-009) — getPediatricAgeGroup: não conflaciona idade cronológica com prematuridade', () => {
  it('idade cronológica de 3 semanas (0.7 meses) NÃO é mais rotulada "prematuro"', () => {
    const r = getPediatricAgeGroup(0.7);
    expect(r).not.toContain('prematuro');
    expect(r).toBe('Neonato (0-28 dias)');
  });

  it('idade exatamente 1 mês continua "Neonato (0-28 dias)" (sem regressão)', () => {
    expect(getPediatricAgeGroup(1)).toBe('Neonato (0-28 dias)');
  });
});

describe('RM-52 (RM41-008) — domperidona: concentração ambígua nunca fabrica volume; concentrações não-ambíguas agora convertem', () => {
  it('domperidona (concentração ambígua "1 mg/mL (10 mg/mL alguns frascos — verificar)"): volumeCalculado fica indefinido, com alerta explícito de conversão indisponível', () => {
    const r = calcDosePediatrica('domperidona', { pesoKg: 10, idadeMeses: 12 });
    expect(r).not.toBeNull();
    expect(r?.volumeCalculado).toBeUndefined();
    expect(r?.alertas.some(a => a.includes('Conversão') && a.includes('INDISPONÍVEL'))).toBe(true);
  });

  it('amoxicilina (concentração "50 mg/mL", denominador implícito 1 mL): volume agora é calculado — antes ficava undefined silenciosamente pois o regex exigia denominador numérico explícito', () => {
    const r = calcDosePediatrica('amoxicilina', { pesoKg: 10, idadeMeses: 12 }, 'Otite média aguda / Rinosinusite / IVA');
    expect(r).not.toBeNull();
    expect(r?.concentracaoComum).toBe('50 mg/mL');
    expect(r?.volumeCalculado).toBeDefined();
    expect(r?.volumeCalculado).toMatch(/mL por dose/);
    expect(r?.alertas.some(a => a.includes('INDISPONÍVEL'))).toBe(false);
  });
});
