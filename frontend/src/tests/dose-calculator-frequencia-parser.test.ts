import { describe, it, expect } from 'vitest';
import { parseFrequencia, calcFullDose, type FullDoseInput } from '@/lib/dose-calculator';

// ============================================================
// RM-36 — resolução do risco de fallback silencioso de frequência: a
// inferência de tomadas/dia checava substrings soltas
// (`freqStr.includes('2x')` etc.) contra o texto livre de
// `dose_adulto.frequencias[0]`; qualquer string que não batesse em NENHUM
// desses `.includes()` caía silenciosamente no `else` final →
// `tomadas = 1`, subestimando a dose diária real de esquemas mais
// frequentes (ou tratando incorretamente PRN/contínuo/variável como
// "1x/dia").
//
// `parseFrequencia()` substitui isso por um classificador estruturado que
// NUNCA assume tomadas=1 por omissão — toda saída não determinável
// retorna `tomadasDia: null` e `calculavel: false`. `calcFullDose()` usa
// esse resultado para bloquear o cálculo da dose TOTAL diária (nunca
// calculada com uma frequência adivinhada) e emitir um alerta 🚨 crítico
// exigindo confirmação humana explícita — mesmo padrão já usado para o
// bloqueio de dose por m² sem altura (UNIT-AUDIT-01).
// ============================================================

describe('parseFrequencia() — classificador estruturado (RM-36)', () => {
  it('1x/dia → fixa_diaria, tomadasDia=1, calculável', () => {
    const r = parseFrequencia('1x/dia');
    expect(r.tipo).toBe('fixa_diaria');
    expect(r.tomadasDia).toBe(1);
    expect(r.calculavel).toBe(true);
    expect(r.requerConfirmacao).toBe(false);
  });

  it('2x/dia (com qualificador entre parênteses) → fixa_diaria, tomadasDia=2', () => {
    const r = parseFrequencia('2x/dia (manhã e noite)');
    expect(r.tipo).toBe('fixa_diaria');
    expect(r.tomadasDia).toBe(2);
    expect(r.calculavel).toBe(true);
  });

  it('3x/dia → fixa_diaria, tomadasDia=3', () => {
    const r = parseFrequencia('3x/dia');
    expect(r.tomadasDia).toBe(3);
    expect(r.calculavel).toBe(true);
  });

  it('4x/dia → fixa_diaria, tomadasDia=4', () => {
    const r = parseFrequencia('4x/dia');
    expect(r.tomadasDia).toBe(4);
    expect(r.calculavel).toBe(true);
  });

  it('"×" (sinal de multiplicação real, não a letra x) também é reconhecido: 1×/dia, 2×/dia', () => {
    expect(parseFrequencia('1×/dia (manhã)').tomadasDia).toBe(1);
    expect(parseFrequencia('2×/dia (doses altas)').tomadasDia).toBe(2);
  });

  it('8/8h → intervalo_horas, tomadasDia=3 (24÷8)', () => {
    const r = parseFrequencia('8/8h');
    expect(r.tipo).toBe('intervalo_horas');
    expect(r.tomadasDia).toBe(3);
    expect(r.intervaloHoras).toBe(8);
    expect(r.calculavel).toBe(true);
  });

  it('12/12h → intervalo_horas, tomadasDia=2 (24÷12)', () => {
    const r = parseFrequencia('12/12h (tratamento)');
    expect(r.tomadasDia).toBe(2);
    expect(r.calculavel).toBe(true);
  });

  it('6/6h → intervalo_horas, tomadasDia=4 (24÷6)', () => {
    const r = parseFrequencia('6/6h');
    expect(r.tomadasDia).toBe(4);
    expect(r.calculavel).toBe(true);
  });

  it('4/4h → intervalo_horas, tomadasDia=6 (24÷4)', () => {
    const r = parseFrequencia('4/4h (IR)');
    expect(r.tomadasDia).toBe(6);
  });

  it('q8h / q12h / q6h (notação "q") → intervalo_horas determinístico', () => {
    expect(parseFrequencia('q8h (IV — padrão)').tomadasDia).toBe(3);
    expect(parseFrequencia('q12h (VO e IV)').tomadasDia).toBe(2);
    expect(parseFrequencia('q6h (padrão)').tomadasDia).toBe(4);
  });

  it('"a cada N horas" → intervalo_horas determinístico', () => {
    const r = parseFrequencia('a cada 6-8h');
    // faixa (6–8h) → variável, NÃO determinístico — ver teste de faixa abaixo.
    expect(r.tipo).toBe('variavel');
    const fixo = parseFrequencia('a cada 8h');
    expect(fixo.tipo).toBe('intervalo_horas');
    expect(fixo.tomadasDia).toBe(3);
  });

  it('PRN/SOS/"conforme necessidade" → não calculável, requer confirmação, NUNCA tomadasDia=1', () => {
    for (const texto of ['SOS', 'PRN', 'Conforme evacuações', 'Conforme necessidade (resgate)', 'A cada 4-6h', 'Bolus IV — repetir conforme resposta']) {
      const r = parseFrequencia(texto);
      if (/sos|prn|conforme|resposta/i.test(texto)) {
        expect(r.calculavel).toBe(false);
        expect(r.tomadasDia).toBeNull();
        expect(r.requerConfirmacao).toBe(true);
      }
    }
  });

  it('uso contínuo/infusão contínua → não calculável, NUNCA tomadasDia=1', () => {
    for (const texto of ['Infusão contínua', 'Infusão contínua (IC) — titular PAM ≥ 65 mmHg', 'Uso contínuo (sem pausa)', '1x/dia contínuo (sem pausa)']) {
      const r = parseFrequencia(texto);
      expect(r.tipo).toBe('continua');
      expect(r.calculavel).toBe(false);
      expect(r.tomadasDia).toBeNull();
    }
  });

  it('texto completamente desconhecido/não estruturado → nao_reconhecida, NUNCA tomadasDia=1', () => {
    for (const texto of ['xyz123 não é uma frequência', 'Vaginal, sublingual ou retal', '']) {
      const r = parseFrequencia(texto);
      expect(r.tomadasDia).toBeNull();
      expect(r.calculavel).toBe(false);
      expect(r.requerConfirmacao).toBe(true);
    }
  });

  it('texto com acentuação corrompida (mojibake real presente na base, ex.: "1Ã—/dia") NUNCA é assumido como 1x/dia — cai em não reconhecida', () => {
    const r = parseFrequencia('1Ã—/dia (antes de dormir)');
    expect(r.tipo).toBe('nao_reconhecida');
    expect(r.tomadasDia).toBeNull();
    expect(r.calculavel).toBe(false);
  });

  it('esquema com faixa "3-4x/dia": variável, requer confirmação, tomadasDia null (nunca escolhe um lado da faixa sozinho)', () => {
    const r = parseFrequencia('3-4x/dia (manutenção)');
    expect(r.tipo).toBe('variavel');
    expect(r.tomadasDia).toBeNull();
    expect(r.tomadasFaixa).toEqual([3, 4]);
    expect(r.calculavel).toBe(false);
    expect(r.requerConfirmacao).toBe(true);
  });

  it('faixa com en-dash "1–2×/dia" também é reconhecida como variável', () => {
    const r = parseFrequencia('1–2×/dia');
    expect(r.tipo).toBe('variavel');
    expect(r.tomadasFaixa).toEqual([1, 2]);
  });

  it('faixa de intervalo em horas "q8–12h": variável, nunca resolvida automaticamente', () => {
    const r = parseFrequencia('q8–12h (conforme função renal e AUC)');
    expect(r.tipo).toBe('variavel');
    expect(r.tomadasDia).toBeNull();
    expect(r.calculavel).toBe(false);
  });

  it('múltiplos regimes/vias combinados no mesmo campo (separador "|") → variável, nunca escolhe um lado', () => {
    const r = parseFrequencia('1×/dia (VO) | 3×/semana IV (após HD)');
    expect(r.tipo).toBe('variavel');
    expect(r.calculavel).toBe(false);
  });

  it('múltiplos regimes combinados com " ou " → variável', () => {
    const r = parseFrequencia('1×/dia ou 2×/dia');
    expect(r.tipo).toBe('variavel');
    expect(r.calculavel).toBe(false);
  });

  it('dose única → tomadasDia=1 (1 administração), calculável (não é "frequência desconhecida")', () => {
    const r = parseFrequencia('Dose única (indução)');
    expect(r.tipo).toBe('unica');
    expect(r.tomadasDia).toBe(1);
    expect(r.calculavel).toBe(true);
  });

  it('periodicidade não diária (semanal/mensal/a cada N dias) → 1 administração por evento, calculável, mas marcada como não-diária', () => {
    expect(parseFrequencia('1x/semana').tipo).toBe('nao_diaria');
    expect(parseFrequencia('1x/mês').tipo).toBe('nao_diaria');
    expect(parseFrequencia('A cada 21 dias').tipo).toBe('nao_diaria');
    expect(parseFrequencia('1x/semana').tomadasDia).toBe(1);
    expect(parseFrequencia('1x/semana').calculavel).toBe(true);
  });
});

describe('calcFullDose() — dose total diária NUNCA calculada quando a frequência não é determinável (RM-36)', () => {
  const baseDrug = (frequencia: string): FullDoseInput => ({
    molecula: 'Fármaco de Teste',
    dose_adulto: {
      habitual: '500',
      max: '2000',
      unidade: 'mg',
      via: 'VO',
      frequencias: [frequencia],
    },
    alertas_especiais: [],
    uso_gestante: 'seguro',
    uso_lactante: 'seguro',
  });

  it('frequência reconhecida (2x/dia): dose total diária É calculada normalmente (500 × 2 = 1000mg)', () => {
    const r = calcFullDose(baseDrug('2x/dia'), 40, 70, '500 mg');
    expect(r.dose_total_dia).toBe(1000);
    expect(r.tomadas_dia).toBe(2);
    expect(r.alertas.some(a => a.startsWith('🚨'))).toBe(false);
  });

  it('frequência PRN: dose total diária fica em 0 (NUNCA calculada com tomadas assumidas), alerta 🚨 crítico presente', () => {
    const r = calcFullDose(baseDrug('SOS'), 40, 70, '500 mg');
    expect(r.dose_total_dia).toBe(0);
    expect(r.tomadas_dia).toBe(0);
    expect(r.alertas.some(a => a.startsWith('🚨'))).toBe(true);
    expect(r.limitado_por_dose_max).toBe(true);
  });

  it('frequência não reconhecida (texto não estruturado): dose total diária fica em 0, NUNCA 500 (que seria o resultado de assumir 1 tomada)', () => {
    const r = calcFullDose(baseDrug('xyz não estruturado'), 40, 70, '500 mg');
    expect(r.dose_total_dia).toBe(0);
    expect(r.dose_total_dia).not.toBe(500);
    expect(r.alertas.some(a => a.startsWith('🚨'))).toBe(true);
  });

  it('frequência variável ("3-4x/dia"): dose total diária fica em 0, nunca escolhe silenciosamente 3 ou 4', () => {
    const r = calcFullDose(baseDrug('3-4x/dia'), 40, 70, '500 mg');
    expect(r.dose_total_dia).toBe(0);
    expect(r.alertas.some(a => a.startsWith('🚨'))).toBe(true);
  });

  it('uso contínuo: dose total diária fica em 0, alerta 🚨 presente', () => {
    const r = calcFullDose(baseDrug('Infusão contínua'), 40, 70, '500 mg');
    expect(r.dose_total_dia).toBe(0);
    expect(r.alertas.some(a => a.startsWith('🚨'))).toBe(true);
  });

  it('regressão: 8/8h continua calculando corretamente 500×3=1500mg (não regride para o antigo fallback baseado em substring)', () => {
    const r = calcFullDose(baseDrug('8/8h'), 40, 70, '500 mg');
    expect(r.dose_total_dia).toBe(1500);
    expect(r.tomadas_dia).toBe(3);
  });

  it('posologia sugerida, quando bloqueada, nunca afirma "0x/dia" (evita sugerir uma frequência real inexistente)', () => {
    const r = calcFullDose(baseDrug('SOS'), 40, 70, '500 mg');
    expect(r.posologia_sugerida).not.toMatch(/0x\/dia/);
    expect(r.frequencia).not.toMatch(/0x\/dia/);
  });
});
