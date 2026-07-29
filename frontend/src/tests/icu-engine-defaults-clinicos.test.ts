import { describe, it, expect } from 'vitest';
import { assessICUPatient, readVital, type ICUPatient } from '@/lib/icu-engine';

// ============================================================
// RM-36 — resolução do risco de defaults clínicos perigosos:
// `assessICUPatient` usava `?? 0`/`?? 80`/`?? 37`/`?? 98`/`?? 120`/`?? 15`/
// `?? 16` sobre sinais vitais opcionais ANTES de compará-los a limiares
// clínicos — "dado não medido" era silenciosamente tratado como "valor
// normal", mascarando risco real de pacientes cujos sinais vitais
// simplesmente não tinham sido registrados (lactato não coletado nunca
// disparava o alerta de choque; PAM não medida nunca disparava o alerta
// de hipotensão; etc.).
//
// Corrigido com `readVital()` — classificador explícito measured/missing/
// invalid — e reescrita completa de `assessICUPatient` para NUNCA usar um
// valor "normal" como substituto de dado ausente. Quando o cálculo
// depende do dado (qSOFA), o resultado fica explicitamente incompleto em
// vez de calculado com um critério assumido.
// ============================================================

const BASE: ICUPatient = { pesoKg: 70, alturaCm: 170, sexo: 'M', idadeAnos: 50 };

describe('readVital() — classificador measured/missing/invalid', () => {
  it('dado ausente (undefined) → status "missing"', () => {
    const r = readVital(undefined, 'lactato');
    expect(r.status).toBe('missing');
    expect(r.valor).toBeUndefined();
  });

  it('dado zero VÁLIDO (ex.: lactato 0 mmol/L, fisiologicamente possível) → status "measured", nunca confundido com ausência', () => {
    const r = readVital(0, 'lactato');
    expect(r.status).toBe('measured');
    expect(r.valor).toBe(0);
  });

  it('dado normal (ex.: PAM 75 mmHg) → status "measured"', () => {
    const r = readVital(75, 'pamMMHg');
    expect(r.status).toBe('measured');
    expect(r.valor).toBe(75);
  });

  it('dado crítico (ex.: lactato 8 mmol/L, PAM 40 mmHg) → status "measured" — valor crítico é um valor REAL, não inválido', () => {
    expect(readVital(8, 'lactato').status).toBe('measured');
    expect(readVital(40, 'pamMMHg').status).toBe('measured');
  });

  it('dado inválido (fisiologicamente implausível, ex.: temperatura 5°C, lactato negativo) → status "invalid", nunca "measured"', () => {
    expect(readVital(5, 'temperaturaC').status).toBe('invalid');
    expect(readVital(-1, 'lactato').status).toBe('invalid');
    expect(readVital(900, 'pamMMHg').status).toBe('invalid');
    expect(readVital(NaN, 'spo2').status).toBe('invalid');
  });
});

describe('assessICUPatient() — dado ausente NUNCA interpretado como valor normal (RM-36)', () => {
  it('paciente SEM nenhum sinal vital informado: nenhum alerta de threshold dispara (lactato/PAM/SpO2/temp), mas TODOS ficam em dadosAusentes', () => {
    const r = assessICUPatient(BASE);
    expect(r.dadosAusentes).toEqual(expect.arrayContaining(['Lactato', 'PAM', 'SpO₂', 'Temperatura']));
    // Nenhum alerta de "normal" foi fabricado — nenhum alerta 🚨/⚠ de
    // threshold, apenas os informativos "ℹ" de dado ausente.
    expect(r.alertas.some(a => a.startsWith('🚨'))).toBe(false);
    expect(r.alertas.some(a => a.startsWith('⚠'))).toBe(false);
    expect(r.alertas.filter(a => a.startsWith('ℹ')).length).toBeGreaterThan(0);
  });

  it('qSOFA com dados incompletos (Glasgow ausente): status "incompleto", nunca calcula um score com Glasgow=15 assumido', () => {
    const r = assessICUPatient({ ...BASE, frIpm: 24, pasMMHg: 90 }); // glasgow ausente
    expect(r.qsofaAssessment.status).toBe('incompleto');
    expect(r.qsofaAssessment.qsofa).toBeUndefined();
    expect(r.qsofaAssessment.criteriosFaltantes).toContain('Escala de Glasgow');
    expect(r.alertas.some(a => a.includes('qSOFA NÃO calculado'))).toBe(true);
  });

  it('qSOFA com os 3 critérios medidos: calculado normalmente (regressão — não quebra o caso completo)', () => {
    const r = assessICUPatient({ ...BASE, glasgow: 13, frIpm: 24, pasMMHg: 95 });
    expect(r.qsofaAssessment.status).toBe('calculado');
    expect(r.qsofaAssessment.qsofa?.score).toBe(3);
    expect(r.qsofaAssessment.qsofa?.alerta).toBe(true);
    expect(r.alertas.some(a => a.includes('qSOFA ≥ 2'))).toBe(true);
  });

  it('lactato AUSENTE: nenhum alerta de THRESHOLD (⚠/🚨) de hipoperfusão/choque dispara (nunca tratado como lactato=0), mas gera alerta informativo de ausência', () => {
    const r = assessICUPatient(BASE);
    expect(r.alertas.some(a => (a.startsWith('⚠') || a.startsWith('🚨')) && a.includes('Lactato'))).toBe(false);
    expect(r.dadosAusentes).toContain('Lactato');
    expect(r.alertas.some(a => a.includes('Lactato não coletado'))).toBe(true);
  });

  it('lactato ZERO (medido, dentro da faixa plausível): tratado como valor real medido — não dispara alerta (0 < 2), mas NÃO fica em dadosAusentes', () => {
    const r = assessICUPatient({ ...BASE, lactato: 0 });
    expect(r.dadosAusentes).not.toContain('Lactato');
    expect(r.alertas.some(a => a.includes('Lactato'))).toBe(false);
  });

  it('lactato NORMAL (1,5 mmol/L): sem alerta', () => {
    const r = assessICUPatient({ ...BASE, lactato: 1.5 });
    expect(r.alertas.some(a => a.includes('hipoperfusão') || a.includes('choque'))).toBe(false);
  });

  it('lactato em alerta moderado (3 mmol/L, > 2): dispara alerta ⚠ de hipoperfusão', () => {
    const r = assessICUPatient({ ...BASE, lactato: 3 });
    expect(r.alertas.some(a => a.startsWith('⚠') && a.includes('Lactato') && a.includes('hipoperfusão'))).toBe(true);
  });

  it('lactato CRÍTICO (5 mmol/L, > 4): dispara alerta 🚨 de choque/bundle SSC', () => {
    const r = assessICUPatient({ ...BASE, lactato: 5 });
    expect(r.alertas.some(a => a.startsWith('🚨') && a.includes('choque'))).toBe(true);
  });

  it('lactato INVÁLIDO (-2 mmol/L, fisiologicamente impossível): NÃO tratado como valor normal nem usado no cálculo — alerta 🚨 de dado inválido, registrado em dadosInvalidos', () => {
    const r = assessICUPatient({ ...BASE, lactato: -2 });
    expect(r.dadosInvalidos.some(d => d.includes('Lactato'))).toBe(true);
    expect(r.alertas.some(a => a.startsWith('🚨') && a.includes('implausível'))).toBe(true);
    // Não deve aparecer como "ausente" (é um problema de dado inválido, categoria distinta)
    expect(r.dadosAusentes).not.toContain('Lactato');
  });

  it('PAM AUSENTE: nenhum alerta de hipotensão dispara (nunca tratado como PAM=80), mas gera alerta informativo', () => {
    const r = assessICUPatient(BASE);
    expect(r.alertas.some(a => a.includes('iniciar vasopressor'))).toBe(false);
    expect(r.dadosAusentes).toContain('PAM');
  });

  it('PAM CRÍTICA (55 mmHg, < 65): dispara alerta 🚨 de vasopressor', () => {
    const r = assessICUPatient({ ...BASE, pamMMHg: 55 });
    expect(r.alertas.some(a => a.startsWith('🚨') && a.includes('PAM') && a.includes('vasopressor'))).toBe(true);
  });

  it('SpO₂ AUSENTE: nenhum alerta de hipoxemia dispara (nunca tratado como SpO₂=98%)', () => {
    const r = assessICUPatient(BASE);
    expect(r.alertas.some(a => a.includes('suporte O₂ urgente'))).toBe(false);
    expect(r.dadosAusentes).toContain('SpO₂');
  });

  it('SpO₂ CRÍTICA (82%, < 90): dispara alerta 🚨', () => {
    const r = assessICUPatient({ ...BASE, spo2: 82 });
    expect(r.alertas.some(a => a.startsWith('🚨') && a.includes('SpO₂'))).toBe(true);
  });

  it('temperatura AUSENTE: nenhum alerta de febre/hipotermia dispara (nunca tratado como 37°C)', () => {
    const r = assessICUPatient(BASE);
    expect(r.alertas.some(a => a.includes('Febre') || a.includes('Hipotermia'))).toBe(false);
    expect(r.dadosAusentes).toContain('Temperatura');
  });

  it('temperatura crítica (febre 39°C): dispara alerta ⚠ de febre', () => {
    const r = assessICUPatient({ ...BASE, temperaturaC: 39 });
    expect(r.alertas.some(a => a.includes('Febre'))).toBe(true);
  });

  it('temperatura crítica (hipotermia 34°C): dispara alerta ⚠ de hipotermia', () => {
    const r = assessICUPatient({ ...BASE, temperaturaC: 34 });
    expect(r.alertas.some(a => a.includes('Hipotermia'))).toBe(true);
  });

  it('paciente crítico completo (todos os dados medidos e anormais): todos os alertas críticos disparam juntos, sem nenhum mascarado por default', () => {
    const r = assessICUPatient({
      ...BASE, glasgow: 12, frIpm: 26, pasMMHg: 88,
      lactato: 6, pamMMHg: 50, spo2: 85, temperaturaC: 39.5,
    });
    expect(r.qsofaAssessment.status).toBe('calculado');
    expect(r.alertas.some(a => a.includes('qSOFA'))).toBe(true);
    expect(r.alertas.some(a => a.includes('choque'))).toBe(true);
    expect(r.alertas.some(a => a.includes('vasopressor'))).toBe(true);
    expect(r.alertas.some(a => a.includes('SpO₂'))).toBe(true);
    expect(r.alertas.some(a => a.includes('Febre'))).toBe(true);
    expect(r.dadosAusentes).toEqual([]);
    expect(r.dadosInvalidos).toEqual([]);
  });

  it('PaO2/FiO2 continua não calculado quando pao2 ou fio2 estão ausentes (comportamento pré-existente preservado)', () => {
    const r = assessICUPatient({ ...BASE, pao2: 80 }); // fio2 ausente
    expect(r.pao2fio2).toBeUndefined();
  });

  it('PaO2/FiO2 calculado normalmente quando ambos presentes', () => {
    const r = assessICUPatient({ ...BASE, pao2: 80, fio2: 0.4 });
    expect(r.pao2fio2).toBe(200);
  });

  // RM-50 (RM41-005): FiO2 sem validação de plausibilidade — um valor
  // digitado como porcentagem (40) em vez de fração (0,4) produzia uma
  // razão PaO2/FiO2 ~100x menor que a real, fabricando um alerta de "ARDS
  // grave" a partir de um dado ambíguo. Corrigido: FiO2 fora de [0,21; 1,0]
  // é tratado como implausível — a razão não é calculada.
  it('FiO2 digitada como porcentagem (40, em vez de 0,4): NÃO calcula PaO2/FiO2 — alerta explícito de implausibilidade, não ARDS fabricado', () => {
    const r = assessICUPatient({ ...BASE, pao2: 80, fio2: 40 });
    expect(r.pao2fio2).toBeUndefined();
    expect(r.dadosInvalidos.some((d) => d.includes('FiO'))).toBe(true);
    expect(r.alertas.some((a) => a.includes('🚨') && a.includes('FiO'))).toBe(true);
    expect(r.alertas.some((a) => a.includes('ARDS'))).toBe(false);
  });

  it('FiO2 abaixo de 0,21 (menor que ar ambiente, impossível): NÃO calcula PaO2/FiO2', () => {
    const r = assessICUPatient({ ...BASE, pao2: 80, fio2: 0.1 });
    expect(r.pao2fio2).toBeUndefined();
    expect(r.dadosInvalidos.some((d) => d.includes('FiO'))).toBe(true);
  });

  it('FiO2 exatamente 0,21 (ar ambiente, fronteira válida) e 1,0 (100% O2, fronteira válida): ambas calculam a razão normalmente', () => {
    const arAmbiente = assessICUPatient({ ...BASE, pao2: 95, fio2: 0.21 });
    expect(arAmbiente.pao2fio2).toBe(Math.round(95 / 0.21));
    const o2Puro = assessICUPatient({ ...BASE, pao2: 300, fio2: 1.0 });
    expect(o2Puro.pao2fio2).toBe(300);
  });
});
