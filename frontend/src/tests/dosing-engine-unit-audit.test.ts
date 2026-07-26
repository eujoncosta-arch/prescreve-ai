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

// ============================================================
// RM-36 — regressão UNIT-AUDIT-03: `gotas_por_mL` tinha um fallback `?? 20`
// (macrogotas padrão) para qualquer formulação `gotas_oral` sem o fator
// explicitamente cadastrado. Corrigido para BLOQUEAR a conversão nesse
// caso, nunca assumir um fator de gotas/mL.
// ============================================================

const MEDICAMENTO_GOTAS_COM_FATOR: MedicamentoDosagem = {
  id: 'teste-gotas-1',
  nome_generico: 'Fármaco Gotas Com Fator',
  classe: 'Teste',
  formulacoes: [
    {
      id: 'form-gotas',
      descricao: 'Gotas 100 mg/mL',
      tipo: 'gotas_oral',
      via: 'oral',
      concentracao_mg: 100,
      volume_ref_mL: 1,
      gotas_por_mL: 20, // fator EXPLICITAMENTE cadastrado (não um fallback)
      unidade_dispensa: 'gotas',
    },
  ],
  regras: [
    {
      populacoes: ['pediatrico', 'lactente'],
      dose: 10,
      unidade: 'mg/kg',
      frequencia_horas: 8,
      via: 'oral',
    },
  ],
};

const MEDICAMENTO_GOTAS_SEM_FATOR: MedicamentoDosagem = {
  id: 'teste-gotas-2',
  nome_generico: 'Fármaco Gotas Sem Fator',
  classe: 'Teste',
  formulacoes: [
    {
      id: 'form-gotas-sem-fator',
      descricao: 'Gotas 100 mg/mL (fator não cadastrado)',
      tipo: 'gotas_oral',
      via: 'oral',
      concentracao_mg: 100,
      volume_ref_mL: 1,
      // gotas_por_mL ausente DE PROPÓSITO — este é o caso que antes caía no fallback ?? 20
      unidade_dispensa: 'gotas',
    },
  ],
  regras: [
    {
      populacoes: ['pediatrico', 'lactente'],
      dose: 10,
      unidade: 'mg/kg',
      frequencia_horas: 8,
      via: 'oral',
    },
  ],
};

const MEDICAMENTO_SUSPENSAO: MedicamentoDosagem = {
  id: 'teste-suspensao',
  nome_generico: 'Amoxicilina de Teste',
  classe: 'Teste',
  formulacoes: [
    {
      id: 'form-susp',
      descricao: 'Suspensão 250 mg/5 mL',
      tipo: 'suspensao',
      via: 'oral',
      concentracao_mg: 250,
      volume_ref_mL: 5,
      unidade_dispensa: 'mL',
    },
  ],
  regras: [
    {
      populacoes: ['pediatrico', 'lactente'],
      dose: 50,
      unidade: 'mg/kg/dia',
      frequencia_horas: 8,
      via: 'oral',
    },
  ],
};

describe('calcularDosagem() — conversão para gotas exige fator explícito, nunca assume 20 gotas/mL (regressão UNIT-AUDIT-03)', () => {
  it('formulação gotas COM gotas_por_mL explícito converte corretamente', () => {
    const resultado = calcularDosagem(10, undefined, 3 * 365, MEDICAMENTO_GOTAS_COM_FATOR, 'form-gotas');
    expect(resultado?.ok).toBe(true);
    expect(resultado?.gotas_por_dose).toBeDefined();
    expect(resultado?.gotas_por_dose).toBeGreaterThan(0);
  });

  it('formulação gotas SEM gotas_por_mL cadastrado BLOQUEIA o cálculo — nunca assume 20 gotas/mL', () => {
    const resultado = calcularDosagem(10, undefined, 3 * 365, MEDICAMENTO_GOTAS_SEM_FATOR, 'form-gotas-sem-fator');
    expect(resultado?.ok).toBe(false);
    expect(resultado?.erro).toMatch(/gotas.*mL|fator/i);
    // O cálculo é bloqueado (nenhum valor numérico calculado) — a mensagem
    // pode mencionar "20" apenas para EXPLICAR que esse valor NÃO foi
    // assumido, nunca como um resultado de fato usado no cálculo.
    expect(resultado?.gotas_por_dose).toBeUndefined();
    expect(resultado?.dose_total_dia_mg).toBe(0);
  });

  it('suspensão 250 mg/5 mL (tipo "suspensao", não "gotas_oral") NUNCA é convertida automaticamente em gotas', () => {
    const resultado = calcularDosagem(15, undefined, 4 * 365, MEDICAMENTO_SUSPENSAO, 'form-susp');
    expect(resultado?.ok).toBe(true);
    expect(resultado?.volume_por_dose_mL).toBeDefined();
    expect(resultado?.gotas_por_dose).toBeUndefined();
    expect(resultado?.unidade_resultado).toBe('mL');
  });
});
