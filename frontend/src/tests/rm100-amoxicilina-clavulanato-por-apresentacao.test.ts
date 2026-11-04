// ============================================================
// RM-100 — Amoxicilina-clavulanato: a posologia depende da apresentação.
//   875/125 mg → 12/12h        500/125 mg → 8/8h
// Antes, o motor escolhia a regra só por população e via: selecionar o
// comprimido de 500/125 mg aplicava a regra de 875 mg de 12/12h (1,75 comp.
// de 500 mg). Fontes: bula Eurofarma (pó p/ susp. 400/57 mg/5 mL — TFG > 30
// sem ajuste, < 30 não recomendável; 25–70 mg/kg/dia em 2 doses, a partir de
// 2 meses), rótulo FDA do Augmentin (875 mg 12/12h; TFG < 30 sem a dose de
// 875 mg; 10–30 → 500 mg 12/12h; < 10 → 24/24h) e bula do Sinot Clav 875/125.
// Teste offline.
// ============================================================

import { describe, it, expect } from 'vitest';
import { calcularDosagem, getMedicamentoById } from '@/lib/dosing-engine';
import { getDrugById } from '@/lib/pharma-database';
import { PEDIATRIC_DOSES } from '@/lib/pediatric-engine';

const amoxclav = getMedicamentoById('amoxicilina-clavulanato')!;
const ADULTO_DIAS = 40 * 365;

describe('RM-100 — adulto: a frequência acompanha o comprimido escolhido', () => {
  it('875/125 mg → 1 comprimido de 12/12h (1750 mg/dia)', () => {
    const r = calcularDosagem(70, undefined, ADULTO_DIAS, amoxclav, 'amoxiclav-comp-875')!;
    expect(r.ok).toBe(true);
    expect(r.dose_por_dose_mg).toBe(875);
    expect(r.frequencia_horas).toBe(12);
    expect(r.doses_por_dia).toBe(2);
    expect(r.dose_total_dia_mg).toBe(1750);
    expect(r.comprimidos_por_dose).toBe(1);
    expect(r.excede_dose_maxima_dia).toBe(false);
  });

  it('500/125 mg → 1 comprimido de 8/8h (1500 mg/dia), nunca 875 mg de 12/12h', () => {
    const r = calcularDosagem(70, undefined, ADULTO_DIAS, amoxclav, 'amoxiclav-comp-500')!;
    expect(r.ok).toBe(true);
    expect(r.dose_por_dose_mg).toBe(500);
    expect(r.frequencia_horas).toBe(8);
    expect(r.doses_por_dia).toBe(3);
    expect(r.dose_total_dia_mg).toBe(1500);
    expect(r.comprimidos_por_dose).toBe(1);
    expect(r.excede_dose_maxima_dia).toBe(false);
  });

  it('geriátrico segue a mesma regra por apresentação (sem a antiga regra solta de 500 mg 12/12h)', () => {
    const r875 = calcularDosagem(65, undefined, 75 * 365, amoxclav, 'amoxiclav-comp-875')!;
    const r500 = calcularDosagem(65, undefined, 75 * 365, amoxclav, 'amoxiclav-comp-500')!;
    expect([r875.frequencia_horas, r500.frequencia_horas]).toEqual([12, 8]);
  });

  it('as duas regras de comprimido carregam o aviso de ajuste renal', () => {
    for (const id of ['amoxiclav-comp-875', 'amoxiclav-comp-500']) {
      const r = calcularDosagem(70, undefined, ADULTO_DIAS, amoxclav, id)!;
      expect(r.regra.ajuste_renal).toBe(true);
    }
    const r875 = calcularDosagem(70, undefined, ADULTO_DIAS, amoxclav, 'amoxiclav-comp-875')!;
    expect(r875.regra.observacao).toContain('TFG < 30');
  });

  it('adulto com a suspensão 400/57: sem regra inventada (a regra de comprimido não vaza)', () => {
    const r = calcularDosagem(70, undefined, ADULTO_DIAS, amoxclav, 'amoxiclav-susp-400')!;
    expect(r.ok).toBe(false);
    expect(r.erro).toContain('Não há posologia definida');
  });
});

describe('RM-100 — pediátrico: suspensão 400/57 mg/5 mL pela bula Eurofarma', () => {
  it('27 kg: 45 mg/kg/dia em 2 doses = 607,5 mg/dose ≈ 7,6 mL (mesmo exemplo da bula do Sinot Clav)', () => {
    const r = calcularDosagem(27, undefined, 6 * 365, amoxclav, 'amoxiclav-susp-400')!;
    expect(r.ok).toBe(true);
    expect(r.frequencia_horas).toBe(12);
    expect(r.dose_por_dose_mg).toBeCloseTo(607.5, 1);
    expect(r.volume_por_dose_mL).toBeCloseTo(7.6, 1);
  });

  it('a observação cita o teto de 70 mg/kg/dia e que 90 mg/kg/dia exige a formulação ES 14:1', () => {
    const r = calcularDosagem(27, undefined, 6 * 365, amoxclav, 'amoxiclav-susp-400')!;
    expect(r.regra.observacao).toContain('45–70 mg/kg/dia');
    expect(r.regra.observacao).toContain('ES 14:1');
  });

  it('< 2 meses: bloqueado (a bula não tem posologia); 70 dias: liberado', () => {
    const novo = calcularDosagem(4, undefined, 45, amoxclav, 'amoxiclav-susp-400')!;
    expect(novo.ok).toBe(false);
    const lactente = calcularDosagem(5, undefined, 70, amoxclav, 'amoxiclav-susp-400')!;
    expect(lactente.ok).toBe(true);
  });

  it('pediátrico com comprimido: não aplica mg/kg a comprimido (sem regra)', () => {
    const r = calcularDosagem(27, undefined, 6 * 365, amoxclav, 'amoxiclav-comp-875')!;
    expect(r.ok).toBe(false);
  });
});

describe('RM-100 — pharma-database: texto e ajuste renal coerentes com as bulas', () => {
  const d = getDrugById('amoxicilina_clavulanato')!;

  it('instruções dizem a frequência de cada apresentação', () => {
    expect(d.dose_adulto.instrucoes).toContain('875/125 mg de 12/12h');
    expect(d.dose_adulto.instrucoes).toContain('500/125 mg de 8/8h');
  });

  it('dose habitual e frequência[0] continuam coerentes (875 mg × 2x/dia = 1750 mg/dia)', () => {
    expect(parseFloat(d.dose_adulto.habitual)).toBe(875);
    expect(d.dose_adulto.frequencias[0]).toBe('2x/dia');
  });

  it('ajuste renal: sem ajuste > 30; 875 mg proibido < 30; sem o antigo "500/125 mg/dia"', () => {
    const r = d.ajuste_renal!;
    expect(r.tfg_60_30).toContain('Sem ajuste');
    expect(r.tfg_30_15).toContain('NÃO usar 875/125');
    expect(r.tfg_30_15).toContain('12/12h');
    expect(r.tfg_lt_15).toContain('24h');
    expect(JSON.stringify(r)).not.toContain('500/125 mg/dia');
  });

  it('pediatria: faixa ≥ 2 meses e 45–70 mg/kg/dia na dose alta', () => {
    expect(d.dose_pediatrica!.faixa_etaria).toContain('≥ 2 meses');
    expect(d.dose_pediatrica!.faixa_etaria).toContain('45 a 70 mg/kg/dia');
  });
});

describe('RM-100 — pediatric-engine: 400/57 mg/5 mL não é a formulação ES', () => {
  const e = PEDIATRIC_DOSES.find(x => x.drugId === 'amoxicilina-clavulanato')!;

  it('a suspensão 400/57 não é mais rotulada "(ES)" e cita o teto de 70 mg/kg/dia', () => {
    const susp = e.formulacoes.find(f => f.forma === 'Suspensão')!;
    expect(susp.concentracao).not.toContain('(ES)');
    expect(susp.concentracao).toContain('70/10 mg/kg/dia');
  });

  it('dose da apresentação disponível = teto da bula (70 mg/kg/dia), citando a AAP 2013 para os 90 mg/kg/dia da ES', () => {
    const ind = e.indicacoes[0];
    expect(ind.doseMgKgDia).toBe(70);
    expect(ind.instrucoes).toContain('10.1542/peds.2012-3488');
    expect(ind.instrucoes).toContain('ES 14:1');
  });

  it('alerta explícito de que 90 mg/kg/dia exige a formulação ES 14:1', () => {
    const alertas = e.indicacoes[0].alertas!.join(' ');
    expect(alertas).toContain('NÃO é ES');
    expect(alertas).toContain('90 mg/kg/dia só com a formulação ES 14:1');
  });
});
