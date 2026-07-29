import { describe, it, expect } from 'vitest';
import { calcFullDose, parseConcentration, convertDose, type FullDoseInput } from '@/lib/dose-calculator';

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
    // RM-52 (RM41-035): `toBeDefined()` nunca checava o valor calculado — um
    // erro aritmético na fórmula Mosteller passaria sem detecção.
    expect(resultado.bsa_m2).toBeCloseTo(0.74, 2);
    expect(resultado.dose_total_dia).toBeGreaterThan(0);
    expect(resultado.fonte).toBe('pediatrica_mg_m2');
    expect(resultado.alertas.some((a) => a.startsWith('🚨'))).toBe(false);
  });
});

// ============================================================
// RM-36 — regressão UNIT-AUDIT-03 (médio): a conversão mL → gotas era
// aplicada a QUALQUER formulação líquida (`* 20`, macrogotas padrão),
// incluindo suspensões/xaropes comuns que nunca são administrados por
// contagem de gotas. Corrigido: gotas só são calculadas quando a própria
// apresentação declara um fator mg/gota explícito; nenhum fallback de
// 20 gotas/mL permanece em nenhum caminho de código.
// ============================================================

const AMOXICILINA_SUSPENSAO: FullDoseInput = {
  molecula: 'Amoxicilina de Teste',
  dose_adulto: {
    habitual: '500',
    max: '1500',
    unidade: 'mg',
    via: 'VO',
    frequencias: ['8/8h'],
  },
  alertas_especiais: [],
  uso_gestante: 'seguro',
  uso_lactante: 'seguro',
};

const XAROPE_GENERICO: FullDoseInput = {
  molecula: 'Xarope de Teste',
  dose_adulto: {
    habitual: '10',
    max: '40',
    unidade: 'mg',
    via: 'VO',
    frequencias: ['1x/dia'],
  },
  alertas_especiais: [],
  uso_gestante: 'seguro',
  uso_lactante: 'seguro',
};

const MEDICAMENTO_GOTAS_FATOR_EXPLICITO: FullDoseInput = {
  molecula: 'Fármaco Gotas de Teste',
  dose_adulto: {
    habitual: '10',
    max: '40',
    unidade: 'mg',
    via: 'VO',
    frequencias: ['1x/dia'],
  },
  alertas_especiais: [],
  uso_gestante: 'seguro',
  uso_lactante: 'seguro',
};

describe('parseConcentration() — gotas só reconhecidas com fator mg/gota explícito na própria apresentação', () => {
  it('suspensão "250 mg/5 mL" NUNCA é interpretada como formulação de gotas', () => {
    const conc = parseConcentration('250 mg/5 mL');
    expect(conc.tipo).toBe('liquido');
    expect(conc.mg_por_mL).toBeCloseTo(50, 5);
    expect(conc.mg_por_gota).toBeUndefined();
  });

  it('xarope "10 mg/mL" (solução direta) NUNCA é interpretado como formulação de gotas', () => {
    const conc = parseConcentration('10 mg/mL');
    expect(conc.tipo).toBe('liquido');
    expect(conc.mg_por_mL).toBe(10);
    expect(conc.mg_por_gota).toBeUndefined();
  });

  it('"50 mg/mL gotas" (concentração por mL, sem fator de gotas declarado) NÃO gera mg_por_gota — evita inventar um fator', () => {
    const conc = parseConcentration('50 mg/mL gotas');
    expect(conc.mg_por_gota).toBeUndefined();
  });

  it('"1 mg/gota" (fator EXPLICITAMENTE declarado, ex.: Preni Gotas) é reconhecido corretamente', () => {
    const conc = parseConcentration('1 mg/gota');
    expect(conc.mg_por_gota).toBe(1);
  });
});

describe('calcFullDose() — gotas só calculadas com fator explícito; suspensão/xarope nunca convertidos automaticamente (regressão UNIT-AUDIT-03)', () => {
  it('suspensão 250 mg/5 mL: calcula volume em mL normalmente (500mg dose ÷ 50mg/mL = 10mL), mas gotas_por_tomada permanece indefinido', () => {
    const resultado = calcFullDose(AMOXICILINA_SUSPENSAO, 5, 20, '250 mg/5 mL');
    // RM-52 (RM41-035): valor real conferido, não apenas "existe".
    expect(resultado.volume_por_tomada).toBeCloseTo(10, 5);
    expect(resultado.gotas_por_tomada).toBeUndefined();
  });

  it('xarope genérico "10 mg/mL": calcula volume em mL (10mg dose ÷ 10mg/mL = 1mL), mas NUNCA gotas (sem fator declarado)', () => {
    const resultado = calcFullDose(XAROPE_GENERICO, 30, 70, '10 mg/mL');
    expect(resultado.volume_por_tomada).toBeCloseTo(1, 5);
    expect(resultado.gotas_por_tomada).toBeUndefined();
  });

  it('formulação com fator "1 mg/gota" EXPLICITAMENTE declarado converte gotas corretamente', () => {
    const resultado = calcFullDose(MEDICAMENTO_GOTAS_FATOR_EXPLICITO, 30, 70, '1 mg/gota');
    // dose_por_tomada (10mg, dose adulta habitual) ÷ 1mg/gota = 10 gotas
    // (valor exato conferido — RM41-035 já eliminou o "toBeDefined()" solto aqui)
    expect(resultado.gotas_por_tomada).toBe(10);
  });

  it('nenhum fallback de 20 gotas/mL permanece: gotas calculadas NUNCA são simplesmente volume_por_tomada × 20', () => {
    const resultado = calcFullDose(AMOXICILINA_SUSPENSAO, 5, 20, '250 mg/5 mL');
    // Para a suspensão (sem fator de gotas declarado), gotas_por_tomada deve
    // ser undefined — não `volume_por_tomada * 20`.
    expect(resultado.gotas_por_tomada).toBeUndefined();
    // RM-52 (RM41-035): valor real (10 mL), não apenas "existe" — nunca
    // `10 mL × 20 = 200` (o fallback fixo que esta correção eliminou).
    expect(resultado.volume_por_tomada).toBeCloseTo(10, 5);
  });
});

describe('convertDose("mL_to_drops") — exige fator gotas/mL explícito, nunca assume 20 (regressão UNIT-AUDIT-03)', () => {
  it('sem fator informado, a conversão fica BLOQUEADA (resultado 0, mensagem explicativa)', () => {
    const resultado = convertDose(5, 'mL_to_drops');
    expect(resultado.resultado).toBe(0);
    expect(resultado.passo_a_passo.join(' ')).toMatch(/bloqueada|não informado/i);
    expect(resultado.passo_a_passo.join(' ')).not.toMatch(/20 gotas\/mL(?! como)/);
  });

  it('com fator EXPLICITAMENTE informado (ex.: 20 gotas/mL de uma apresentação real), converte corretamente', () => {
    const resultado = convertDose(5, 'mL_to_drops', 20);
    expect(resultado.resultado).toBe(100);
  });

  it('com um fator DIFERENTE de 20 (apresentação real com contra-gotas distinto), converte usando o fator informado, não um valor fixo', () => {
    const resultado = convertDose(5, 'mL_to_drops', 15);
    expect(resultado.resultado).toBe(75);
  });
});
