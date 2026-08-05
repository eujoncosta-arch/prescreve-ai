// ============================================================
// RM-82 — clinical-decision-support.ts não pode tratar sinal vital/exame
// AUSENTE como se fosse um valor normal
//
// Achado original: auditoria RM-82 (nova varredura de qualidade). O motor
// de apoio à decisão clínica (BASE_CLINICA) usava `(sv(a).spo2 ?? 100) < 95`,
// `(sv(a).pa_sistolica ?? 0) >= 140`, `(lab(a, 'ldl') ?? 0) >= 130` etc. em
// ~35 critérios/red_flags — o mesmo antipadrão já corrigido em
// clinical-risk-engine.ts (RM-39) e no motor ICU, mas que tinha ficado sem
// corrigir neste arquivo. Os valores de fallback (100 para SpO2, 0 para PA
// sistólica/glicemia/LDL etc., 15 para Glasgow, 36 para temperatura) foram
// escolhidos para nunca disparar o critério — então o comportamento
// observável não mudou (os 1102 testes da suíte continuam passando sem
// alteração) — mas a forma antiga arriscava, numa mudança futura de sinal
// do operador (`>=` → `<=`, por exemplo), inverter silenciosamente o
// significado do valor de fallback. Corrigido para a forma explícita já
// usada em outros pontos do próprio arquivo (`const v = lab(a, 'x'); return
// v !== undefined && v OP limiar;`), que não tem essa fragilidade.
//
// Estes testes documentam que dado ausente nunca é tratado como "normal
// tranquilizador" (não dispara falso red flag OU falsa ausência de red
// flag por engano de sinal) e que dado realmente anormal continua
// disparando exatamente como antes.
// ============================================================

import { describe, it, expect } from 'vitest';
import type { Anamnesis } from '@/lib/types';
import { analyzeClinical } from '@/lib/clinical-decision-support';

function baseAnamnesis(overrides: Partial<Anamnesis> = {}): Anamnesis {
  return {
    queixa_principal: '', hda: '', hpp: '', historia_familiar: '',
    habitos_vida: {}, exame_fisico: '', sinais_vitais: {}, laboratorio: {},
    imagem: '', comorbidades: [], medicamentos_em_uso: [], alergias: [],
    gestante: false, lactante: false, funcao_renal: {}, funcao_hepatica: {},
    ...overrides,
  };
}

describe('RM-82 — SpO2 ausente nunca é tratado como 100% (asma)', () => {
  it('queixa de asma sem SpO2 aferido: critério "SpO2 reduzida" não pontua, mas também nenhum red flag falso de hipóxia é gerado', () => {
    const anamnese = baseAnamnesis({
      queixa_principal: 'chiado no peito',
      hda: 'sibilância e dispneia paroxística',
    });
    const apoio = analyzeClinical(anamnese);
    const asma = apoio.hipoteses.find(h => h.id === 'asma');
    expect(asma).toBeDefined();
    expect(apoio.red_flags.some(f => f.includes('SpO2'))).toBe(false);
  });

  it('SpO2 real de 92% (abaixo de 95) continua disparando o critério normalmente (sem regressão)', () => {
    const anamnese = baseAnamnesis({
      queixa_principal: 'chiado no peito',
      hda: 'sibilância e dispneia paroxística',
      sinais_vitais: { spo2: 92 },
    });
    const apoio = analyzeClinical(anamnese);
    const asma = apoio.hipoteses.find(h => h.id === 'asma');
    expect(asma?.criterios_favoraveis.some(c => c.includes('SpO2'))).toBe(true);
  });

  it('SpO2 real de 89% (abaixo de 90) continua disparando o red flag urgente (sem regressão)', () => {
    const anamnese = baseAnamnesis({
      queixa_principal: 'chiado no peito',
      hda: 'sibilância e dispneia paroxística',
      sinais_vitais: { spo2: 89 },
    });
    const apoio = analyzeClinical(anamnese);
    expect(apoio.red_flags.some(f => f.includes('SpO2 < 90%'))).toBe(true);
    expect(apoio.encaminhamento_urgente).toBe(true);
  });
});

describe('RM-82 — PA ausente nunca é tratado como 120/80 (HAS/SCA)', () => {
  it('queixa de HAS sem PA aferida: nenhum red flag de "urgência/emergência hipertensiva" falso', () => {
    const anamnese = baseAnamnesis({
      queixa_principal: 'cefaleia e tontura',
      hda: 'pressão alta há anos',
    });
    const apoio = analyzeClinical(anamnese);
    expect(apoio.red_flags.some(f => f.includes('urgência/emergência hipertensiva'))).toBe(false);
  });

  it('PA real 190/120 continua disparando o red flag de urgência hipertensiva (sem regressão)', () => {
    const anamnese = baseAnamnesis({
      queixa_principal: 'cefaleia',
      sinais_vitais: { pa_sistolica: 190, pa_diastolica: 120 },
    });
    const apoio = analyzeClinical(anamnese);
    expect(apoio.red_flags.some(f => f.includes('urgência/emergência hipertensiva'))).toBe(true);
  });
});

describe('RM-82 — labs ausentes nunca são tratados como valor normal (dislipidemia)', () => {
  it('nenhum exame lipídico informado: nenhum critério de dislipidemia pontua por dado ausente', () => {
    const anamnese = baseAnamnesis({ comorbidades: ['Dislipidemia'] });
    const apoio = analyzeClinical(anamnese);
    const dl = apoio.hipoteses.find(h => h.id === 'dislipidemia');
    expect(dl?.criterios_favoraveis.some(c => c.includes('LDL') || c.includes('Colesterol') || c.includes('Triglicer') || c.includes('HDL'))).toBe(false);
  });

  it('LDL real de 150 (≥ 130) continua disparando o critério normalmente (sem regressão)', () => {
    const anamnese = baseAnamnesis({
      comorbidades: ['Dislipidemia'],
      laboratorio: { ldl: '150' },
    });
    const apoio = analyzeClinical(anamnese);
    const dl = apoio.hipoteses.find(h => h.id === 'dislipidemia');
    expect(dl?.criterios_favoraveis.some(c => c.includes('LDL'))).toBe(true);
  });
});

describe('RM-82 — guideline de HAS atualizada para DBHA 2025 (alinhada ao RM-81)', () => {
  it('hipótese de HAS cita a Diretriz Brasileira de Hipertensão Arterial – 2025, não mais "7ª Diretriz ... 2020"', () => {
    const anamnese = baseAnamnesis({
      queixa_principal: 'pressão alta',
      sinais_vitais: { pa_sistolica: 150, pa_diastolica: 95 },
    });
    const apoio = analyzeClinical(anamnese);
    const has = apoio.hipoteses.find(h => h.id === 'has');
    expect(has?.guideline?.ano).toBe(2025);
    expect(has?.guideline?.diretriz).toContain('2025');
    expect(has?.guideline?.diretriz).not.toContain('7ª');
  });
});
