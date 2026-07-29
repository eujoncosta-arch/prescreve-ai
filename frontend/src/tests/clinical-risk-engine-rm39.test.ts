import { describe, it, expect } from 'vitest';
import { avaliarRiscoClinico } from '@/lib/clinical-risk-engine';
import type { Anamnesis, TherapeuticSuggestion } from '@/lib/types';

// ============================================================
// RM-39 — Auditoria de defaults clínicos perigosos
//
// `clinical-risk-engine.ts` usava `(tfg ?? 99)`, `(anos ?? 0)`,
// `(sv.pa_sistolica ?? 0)` e `parseFloat(lab['ldl'] ?? ... ?? '0')` —
// TFG ausente virava "função renal normal" (99), idade ausente virava
// "paciente jovem" (0), PA ausente virava "PA normal" (0), LDL ausente
// virava "sem dislipidemia" (0). Cada um mascarava DADO NÃO MEDIDO como
// VALOR NORMAL, podendo suprimir um alerta de segurança real (ex.:
// acidose lática por metformina em TFG desconhecida) ou subestimar um
// score de risco cardiovascular.
//
// Corrigido: cada critério só é avaliado quando o dado realmente existe;
// na ausência, o critério correspondente nunca contribui como "normal" —
// para TFG especificamente (a variável mais crítica, usada para decidir
// se um fármaco nefrotóxico deve continuar), a ausência agora gera seu
// próprio alerta explícito pedindo o dado.
// ============================================================

function baseAnamnese(overrides: Partial<Anamnesis> = {}): Anamnesis {
  return {
    queixa_principal: 'Acompanhamento de rotina',
    hda: 'Paciente assintomático',
    hpp: 'Sem histórico relevante',
    historia_familiar: '',
    habitos_vida: {},
    exame_fisico: 'Normal',
    sinais_vitais: {},
    laboratorio: {},
    imagem: '',
    comorbidades: [],
    medicamentos_em_uso: [],
    alergias: [],
    gestante: false,
    lactante: false,
    funcao_renal: {},
    funcao_hepatica: {},
    ...overrides,
  };
}

function medPrescrita(classeTerapeutica: string): TherapeuticSuggestion {
  return {
    id: 'x',
    classe_terapeutica: classeTerapeutica,
    molecula: 'Teste',
    nome_generico: 'teste',
    indicacao: 'teste',
    dose: { dose_padrao: '500', unidade: 'mg', via: 'VO', frequencia: '2x/dia' },
    posologia_completa: '500 mg VO 2x/dia',
    evidencia: {
      diretriz: 'x', sociedade: 'x', ano: 2024, citacao: 'x',
      nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'x' },
    },
    contraindicacoes: [],
    efeitos_adversos: [],
    monitoramento: [],
    alternativas: [],
  };
}

describe('avaliarRiscoClinico() — risco renal: TFG ausente NUNCA é tratada como função renal normal (RM-39)', () => {
  it('metformina prescrita com TFG DESCONHECIDA (ausente): gera alerta explícito de dado ausente, NUNCA silêncio', () => {
    const r = avaliarRiscoClinico(baseAnamnese(), [medPrescrita('biguanida')]);
    expect(r.risco_renal.fatores.some(f => /TFG.*conhecida|sem TFG/i.test(f))).toBe(true);
    expect(r.risco_renal.score).toBeGreaterThan(0);
  });

  it('metformina prescrita com TFG MEDIDA e normal (90): nenhum alerta de acidose lática, nenhum alerta de dado ausente', () => {
    const r = avaliarRiscoClinico(baseAnamnese({ funcao_renal: { tfg: 90 } }), [medPrescrita('biguanida')]);
    expect(r.risco_renal.fatores.some(f => /acidose lática/i.test(f))).toBe(false);
    expect(r.risco_renal.fatores.some(f => /TFG.*conhecida|sem TFG/i.test(f))).toBe(false);
  });

  it('metformina prescrita com TFG MEDIDA e baixa (20, < 30): alerta real de acidose lática dispara (regressão)', () => {
    const r = avaliarRiscoClinico(baseAnamnese({ funcao_renal: { tfg: 20 } }), [medPrescrita('biguanida')]);
    expect(r.risco_renal.fatores.some(f => /acidose lática/i.test(f))).toBe(true);
  });

  it('iSGLT2 prescrito com TFG DESCONHECIDA: gera alerta de dado ausente, nunca assume TFG=99 (eficaz)', () => {
    const r = avaliarRiscoClinico(baseAnamnese(), [medPrescrita('isglt2')]);
    expect(r.risco_renal.fatores.some(f => /TFG.*conhecida|sem TFG/i.test(f))).toBe(true);
  });

  it('iSGLT2 com TFG MEDIDA e normal (90): sem alerta de ineficácia nem de dado ausente', () => {
    const r = avaliarRiscoClinico(baseAnamnese({ funcao_renal: { tfg: 90 } }), [medPrescrita('isglt2')]);
    expect(r.risco_renal.fatores.some(f => /sem eficácia/i.test(f))).toBe(false);
    expect(r.risco_renal.fatores.some(f => /TFG.*conhecida|sem TFG/i.test(f))).toBe(false);
  });
});

describe('avaliarRiscoClinico() — risco cardiovascular: idade/PA/LDL ausentes NUNCA são tratados como "jovem"/"normal" (RM-39)', () => {
  it('paciente diabético SEM idade conhecida: Framingham não assume "< 60 anos" — score 10 anos não usa o ramo de 25% indevidamente', () => {
    // hpp/hda sem menção de idade em anos → idade() retorna undefined
    const r = avaliarRiscoClinico(baseAnamnese({ comorbidades: ['diabetes'] }), []);
    // Sem DCV/idade conhecida, não deve cair no ramo "hasDM && idade>=60 → 25%"
    expect(r.risco_cardiovascular.framingham?.score_10anos_pct).not.toBe(25);
  });

  it('paciente com PA sistólica AUSENTE: Framingham não assume "PA normal" (não deve marcar HAS estágio 2 nem estimar 20% por PA)', () => {
    const r = avaliarRiscoClinico(baseAnamnese(), []);
    expect(r.risco_cardiovascular.framingham?.fatores_majorantes.some(f => /HAS estágio 2/i.test(f))).toBe(false);
  });

  it('paciente com PA sistólica MEDIDA e alta (170): HAS estágio 2 é corretamente identificada (regressão)', () => {
    const r = avaliarRiscoClinico(baseAnamnese({ sinais_vitais: { pa_sistolica: 170 } }), []);
    expect(r.risco_cardiovascular.fatores.some(f => /HAS estágio 2/i.test(f))).toBe(true);
    expect(r.risco_cardiovascular.framingham?.fatores_majorantes.some(f => /HAS estágio 2/i.test(f))).toBe(true);
  });

  it('LDL AUSENTE no laboratório: nenhuma afirmação de dislipidemia (não assume LDL=0)', () => {
    const r = avaliarRiscoClinico(baseAnamnese({ laboratorio: {} }), []);
    expect(r.risco_cardiovascular.fatores.some(f => /LDL/i.test(f))).toBe(false);
  });

  it('LDL MEDIDO e alto (200): alerta de LDL muito alto dispara (regressão)', () => {
    const r = avaliarRiscoClinico(baseAnamnese({ laboratorio: { ldl: '200' } }), []);
    expect(r.risco_cardiovascular.fatores.some(f => /LDL 200.*muito alto/i.test(f))).toBe(true);
  });

  it('idade CONHECIDA (65 anos, via hpp) e diabetes: risco CV considera idade real, não zero', () => {
    const r = avaliarRiscoClinico(
      baseAnamnese({ hpp: 'Paciente de 65 anos', comorbidades: ['diabetes'] }),
      [],
    );
    expect(r.risco_cardiovascular.fatores.some(f => /Idade 65 anos/i.test(f))).toBe(true);
  });
});
