import { describe, it, expect } from 'vitest';
import { calcFullDose, type FullDoseInput } from '@/lib/dose-calculator';

// ============================================================
// RM-36 — regressão UNIT-AUDIT-01 (crítico): quando um medicamento
// dosado por superfície corporal (mg/m² — típico de quimioterápicos)
// não tinha altura informada, o motor substituía SILENCIOSAMENTE a dose
// pediátrica pela DOSE ADULTA INTEIRA, com um alerta "⚠" (aviso) — que
// não desabilita o botão "Aplicar esta posologia" em DoseCalcCard.tsx
// (só um alerta "🚨" faz isso). Um médico podia aplicar, com um clique,
// a dose adulta completa de um quimioterápico numa criança.
// ============================================================

const QUIMIOTERAPICO_BSA: FullDoseInput = {
  molecula: 'Fármaco BSA de Teste',
  dose_adulto: {
    habitual: '500',
    max: '750',
    unidade: 'mg',
    via: 'IV',
    frequencias: ['1x/dia'],
  },
  dose_pediatrica: {
    calculo: 'mg/m²',
    dose_por_kg: 100, // 100 mg/m²
    unidade: 'mg',
    frequencia_divisoes: 1,
    max_dose_dia: 200,
    max_dose_dia_unidade: 'mg',
    faixa_etaria: '2-17 anos',
  },
  alertas_especiais: [],
  uso_gestante: 'contraindicado',
  uso_lactante: 'contraindicado',
};

describe('calcFullDose() — dose por m² SEM altura NUNCA cai para a dose adulta (regressão UNIT-AUDIT-01)', () => {
  it('criança de 5 anos, 18kg, SEM altura informada: dose fica bloqueada (0), nunca a dose adulta (500mg)', () => {
    const resultado = calcFullDose(
      QUIMIOTERAPICO_BSA,
      5,
      18,
      '500 mg',
      undefined,
      undefined,
      false,
      false,
      undefined, // sem altura
    );

    // Nunca deve retornar a dose adulta (500mg) como substituta silenciosa.
    expect(resultado.dose_por_tomada).not.toBe(500);
    expect(resultado.dose_total_dia).not.toBe(500);
    expect(resultado.dose_por_tomada).toBe(0);
    expect(resultado.fonte).not.toBe('adulto_fixo');
  });

  it('o alerta de altura ausente é CRÍTICO (prefixo 🚨), não apenas um aviso — para desabilitar o botão "Aplicar" em DoseCalcCard', () => {
    const resultado = calcFullDose(
      QUIMIOTERAPICO_BSA,
      5,
      18,
      '500 mg',
      undefined,
      undefined,
      false,
      false,
      undefined,
    );
    const temAlertaCritico = resultado.alertas.some((a) => a.startsWith('🚨'));
    expect(temAlertaCritico).toBe(true);
  });

  it('COM altura informada, a dose por m² é calculada normalmente (comportamento correto não regride)', () => {
    const resultado = calcFullDose(
      QUIMIOTERAPICO_BSA,
      5,
      18,
      '500 mg',
      undefined,
      undefined,
      false,
      false,
      1.1, // 1,1 m de altura
    );
    expect(resultado.bsa_m2).toBeDefined();
    expect(resultado.dose_total_dia).toBeGreaterThan(0);
    expect(resultado.fonte).toBe('pediatrica_mg_m2');
    expect(resultado.alertas.some((a) => a.startsWith('🚨'))).toBe(false);
  });
});
