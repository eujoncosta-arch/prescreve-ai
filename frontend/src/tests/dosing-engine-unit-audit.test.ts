import { describe, it, expect } from 'vitest';
import { calcularDosagem, type MedicamentoDosagem } from '@/lib/dosing-engine';

// ============================================================
// RM-36 — regressão UNIT-AUDIT-02: excede_dose_maxima_dia/_dose eram
// calculados APÓS o clamp (Math.min) já ter reduzido a dose ao próprio
// teto — comparação sempre falsa por construção, escondendo do médico
// que o sistema reduziu automaticamente uma prescrição perigosa.
// ============================================================

const MEDICAMENTO_TESTE: MedicamentoDosagem = {
  id: 'teste-unit-audit',
  nome_generico: 'Fármaco de Teste',
  classe: 'Teste',
  formulacoes: [
    {
      id: 'form-1',
      descricao: 'Comprimido 500mg',
      tipo: 'comprimido',
      via: 'oral',
      concentracao_mg: 500,
      unidade_dispensa: 'comprimido',
    },
  ],
  regras: [
    {
      populacoes: ['adulto'],
      dose: 100, // mg/kg/dia — deliberadamente MUITO alto para forçar o teto
      unidade: 'mg/kg/dia',
      frequencia_horas: 8,
      dose_maxima_por_dia_mg: 1000,
      dose_maxima_por_dose_mg: 400,
      via: 'oral',
    },
  ],
};

describe('calcularDosagem() — excede_dose_maxima_dia/_dose refletem a dose BRUTA, não a já limitada (regressão UNIT-AUDIT-02)', () => {
  it('paciente de 70kg: 100 mg/kg/dia × 70kg = 7000mg/dia, MUITO acima do teto de 1000mg/dia — excede_dose_maxima_dia deve ser true', () => {
    const resultado = calcularDosagem(70, undefined, 30 * 365, MEDICAMENTO_TESTE, 'form-1');
    expect(resultado?.ok).toBe(true);
    // A dose efetivamente aplicada (pós-corte) deve respeitar o teto...
    expect(resultado?.dose_total_dia_mg).toBeLessThanOrEqual(1000);
    // ...mas o boolean de validação deve HONESTAMENTE informar que a dose
    // PRESCRITA (antes do corte automático) excedia o máximo — não mascarar
    // isso com um selo "validado".
    expect(resultado?.excede_dose_maxima_dia).toBe(true);
  });

  it('paciente de 3kg: 100 mg/kg/dia × 3kg = 300mg/dia, DENTRO do teto de 1000mg/dia — excede_dose_maxima_dia deve ser false (não regride para sempre-true)', () => {
    const resultado = calcularDosagem(3, undefined, 30 * 365, MEDICAMENTO_TESTE, 'form-1');
    expect(resultado?.ok).toBe(true);
    expect(resultado?.excede_dose_maxima_dia).toBe(false);
    expect(resultado?.dose_total_dia_mg).toBeCloseTo(300, 1);
  });

  it('excede_dose_maxima_dose reflete a dose por tomada bruta (antes do corte), não a já limitada a dose_maxima_por_dose_mg', () => {
    const resultado = calcularDosagem(70, undefined, 30 * 365, MEDICAMENTO_TESTE, 'form-1');
    // dose_por_dose_mg aplicada deve respeitar o teto por tomada (400mg)
    expect(resultado?.dose_por_dose_mg).toBeLessThanOrEqual(400);
    // mas o alerta de que a dose por tomada excedia o máximo deve aparecer
    expect(resultado?.excede_dose_maxima_dose).toBe(true);
  });
});
