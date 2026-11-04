import { describe, it, expect } from 'vitest';
import { calcularDosagem, getMedicamentoById, type MedicamentoDosagem } from '@/lib/dosing-engine';

// ============================================================
// RM-103 — semântica de `regra.unidade` em calcularDosagem.
//
// Antes: `mg` e `mg/kg` eram tratadas como TOTAL DO DIA e divididas por
// doses_por_dia, mas os dados de MEDICAMENTOS_DOSAGEM as escrevem POR TOMADA
// (dipirona 500 mg 6/6h, paracetamol 15 mg/kg 6/6h...). Resultado: subdose de
// 2-4x (dipirona 500 mg 6/6h exibia 125 mg por dose).
//
// Regra agora: toda unidade é POR TOMADA, exceto `mg/kg/dia` (total do dia).
//
// Evidência de que o dado é por tomada (e não por dia):
//  - os tetos dos próprios dados só fazem sentido assim: paracetamol 750 mg x4
//    = 3000 <= 4000 mg/dia; amoxicilina 500 mg x3 = 1500 <= 3000 mg/dia;
//    metformina 500 mg x2 <= 2550 mg/dia; salbutamol 2,5 mg x4 <= 20 mg/dia;
//  - as observações dos dados: paracetamol "Máx 60 mg/kg/dia" ao lado de
//    15 mg/kg 6/6h (15 x 4 = 60); dipirona "1 gota = 25 mg" e 15 mg/kg;
//  - as posologias de bula/diretriz: dipirona 500 mg até 6/6h, paracetamol
//    500-750 mg 6/6h (máx 4 g/dia), amoxicilina 500 mg 8/8h, ibuprofeno
//    400 mg 8/8h (máx 2400 mg/dia), metformina 500 mg 12/12h, amoxicilina
//    pediátrica 50 mg/kg/DIA ÷ 8/8h (unidade "mg/kg/dia", mantida por dia).
// ============================================================

const ADULTO_DIAS = 30 * 365;
const GERIATRICO_DIAS = 70 * 365;
const PED_4A_DIAS = 4 * 365;

function calc(id: string, formulacao: string, peso: number, idade_dias: number) {
  const med = getMedicamentoById(id);
  if (!med) throw new Error(`fixture ausente: ${id}`);
  const r = calcularDosagem(peso, undefined, idade_dias, med, formulacao);
  if (!r?.ok) throw new Error(`cálculo falhou: ${id} ${r?.erro}`);
  return r;
}

describe('RM-103 — adultos: dose por tomada = o valor da posologia, total = tomadas x dose', () => {
  const casos: Array<[string, string, number, number, string]> = [
    // [id, formulação, mg por tomada, mg/dia, referência]
    ['dipirona', 'dip-comp-500', 500, 2000, 'bula: 500 mg até 6/6h'],
    ['paracetamol', 'parac-comp-750', 750, 3000, '750 mg 6/6h, máx 4 g/dia'],
    ['amoxicilina', 'amox-cap-500', 500, 1500, '500 mg 8/8h'],
    ['ibuprofeno', 'ibu-comp-300', 400, 1200, '400 mg 8/8h, máx 2400 mg/dia'],
    ['metformina', 'met-comp-500', 500, 1000, '500 mg 12/12h'],
    ['cefalexina', 'cef-cap-500', 500, 2000, '500 mg 6/6h'],
    ['amoxicilina-clavulanato', 'amoxiclav-comp-875', 875, 1750, '875/125 mg 12/12h'],
    ['sulfametoxazol-trimetoprim', 'smxtmp-comp-forte', 160, 320, '160 mg TMP 12/12h'],
    ['salbutamol', 'salb-susp-neb', 2.5, 10, '2,5 mg 6/6h, máx 20 mg/dia'],
    ['azitromicina', 'azitro-comp-500', 500, 500, '500 mg 1x/dia'],
    ['prednisona', 'pred-comp-20', 35, 35, '0,5 mg/kg 1x/dia (70 kg)'],
  ];

  it.each(casos)('%s (%s): %s mg por tomada, %s mg/dia — %s', (id, form, porDose, porDia) => {
    const r = calc(id, form, 70, ADULTO_DIAS);
    expect(r.dose_por_dose_mg).toBeCloseTo(porDose, 6);
    expect(r.dose_total_dia_mg).toBeCloseTo(porDia, 6);
    expect(r.excede_dose_maxima_dia).toBe(false);
    expect(r.excede_dose_maxima_dose).toBe(false);
  });

  it('as medidas reais da tela /dosagem que acusaram o bug (dipirona 125, paracetamol 187,5, amoxicilina 166,7, ibuprofeno 133,3, metformina 250, salbutamol 0,6) não se repetem', () => {
    expect(calc('dipirona', 'dip-comp-500', 70, ADULTO_DIAS).dose_por_dose_mg).not.toBeCloseTo(125, 1);
    expect(calc('paracetamol', 'parac-comp-750', 70, ADULTO_DIAS).dose_por_dose_mg).not.toBeCloseTo(187.5, 1);
    expect(calc('amoxicilina', 'amox-cap-500', 70, ADULTO_DIAS).dose_por_dose_mg).not.toBeCloseTo(166.7, 1);
    expect(calc('ibuprofeno', 'ibu-comp-300', 70, ADULTO_DIAS).dose_por_dose_mg).not.toBeCloseTo(133.3, 1);
    expect(calc('metformina', 'met-comp-500', 70, ADULTO_DIAS).dose_por_dose_mg).not.toBeCloseTo(250, 1);
    expect(calc('salbutamol', 'salb-susp-neb', 70, ADULTO_DIAS).dose_por_dose_mg).not.toBeCloseTo(0.6, 1);
  });

  it('formas farmacêuticas: 750 mg em comprimido de 750 = 1 comprimido; ibuprofeno 400 mg em comprimido de 300 = 1,33; salbutamol 2,5 mg a 5 mg/mL = 0,5 mL', () => {
    expect(calc('paracetamol', 'parac-comp-750', 70, ADULTO_DIAS).comprimidos_por_dose).toBeCloseTo(1, 6);
    expect(calc('ibuprofeno', 'ibu-comp-300', 70, ADULTO_DIAS).comprimidos_por_dose).toBeCloseTo(400 / 300, 6);
    expect(calc('salbutamol', 'salb-susp-neb', 70, ADULTO_DIAS).volume_por_dose_mL).toBeCloseTo(0.5, 6);
  });

  it('geriatria: amoxicilina-clavulanato 500/125 mg 8/8h = 1500 mg/dia (regra por apresentação, RM-100) e amoxicilina 500 mg 12/12h = 1000 mg/dia', () => {
    const ac = calc('amoxicilina-clavulanato', 'amoxiclav-comp-500', 70, GERIATRICO_DIAS);
    expect(ac.dose_por_dose_mg).toBeCloseTo(500, 6);
    expect(ac.frequencia_horas).toBe(8);
    expect(ac.dose_total_dia_mg).toBeCloseTo(1500, 6);
    const am = calc('amoxicilina', 'amox-cap-500', 70, GERIATRICO_DIAS);
    expect(am.dose_por_dose_mg).toBeCloseTo(500, 6);
    expect(am.dose_total_dia_mg).toBeCloseTo(1000, 6);
  });
});

describe('RM-103 — pediatria: `mg/kg` é por tomada; `mg/kg/dia` continua total do dia', () => {
  it('paracetamol 15 mg/kg 6/6h, 15 kg: 225 mg por tomada, 900 mg/dia, 7,03 mL de 160 mg/5 mL', () => {
    const r = calc('paracetamol', 'parac-susp', 15, PED_4A_DIAS);
    expect(r.dose_por_dose_mg).toBeCloseTo(225, 6);
    expect(r.dose_total_dia_mg).toBeCloseTo(900, 6);
    expect(r.volume_por_dose_mL).toBeCloseTo(225 / 32, 6);
  });

  it('dipirona 15 mg/kg 6/6h, 15 kg: 225 mg por tomada = 9 gotas (1 gota = 25 mg, como na observação dos dados)', () => {
    const r = calc('dipirona', 'dip-gotas', 15, PED_4A_DIAS);
    expect(r.dose_por_dose_mg).toBeCloseTo(225, 6);
    expect(r.gotas_por_dose).toBe(9);
  });

  it('ibuprofeno 10 mg/kg 8/8h, 15 kg: 150 mg por tomada, 450 mg/dia, 7,5 mL de 100 mg/5 mL', () => {
    const r = calc('ibuprofeno', 'ibu-susp-100', 15, PED_4A_DIAS);
    expect(r.dose_por_dose_mg).toBeCloseTo(150, 6);
    expect(r.dose_total_dia_mg).toBeCloseTo(450, 6);
    expect(r.volume_por_dose_mL).toBeCloseTo(7.5, 6);
  });

  it('salbutamol 0,15 mg/kg 6/6h, 20 kg: 3 mg por tomada, 12 mg/dia (acima do piso de 2,5 mg)', () => {
    const r = calc('salbutamol', 'salb-susp-neb', 20, PED_4A_DIAS);
    expect(r.dose_por_dose_mg).toBeCloseTo(3, 6);
    expect(r.dose_total_dia_mg).toBeCloseTo(12, 6);
  });

  it('mg/kg/dia NÃO mudou: amoxicilina 50 mg/kg/dia, 15 kg, 8/8h = 750 mg/dia, 250 mg por tomada, 5 mL de 250 mg/5 mL', () => {
    const r = calc('amoxicilina', 'amox-susp-250', 15, PED_4A_DIAS);
    expect(r.dose_total_dia_mg).toBeCloseTo(750, 6);
    expect(r.dose_por_dose_mg).toBeCloseTo(250, 6);
    expect(r.volume_por_dose_mL).toBeCloseTo(5, 6);
  });

  it('mg/kg/dia NÃO mudou: amoxicilina-clavulanato 45 mg/kg/dia 12/12h (337,5 mg), cefalexina 25 mg/kg/dia 6/6h (93,75 mg), SMX-TMP 8 mg/kg/dia 12/12h (60 mg de TMP)', () => {
    expect(calc('amoxicilina-clavulanato', 'amoxiclav-susp-400', 15, PED_4A_DIAS).dose_por_dose_mg).toBeCloseTo(337.5, 6);
    expect(calc('cefalexina', 'cef-susp-250', 15, PED_4A_DIAS).dose_por_dose_mg).toBeCloseTo(93.75, 6);
    expect(calc('sulfametoxazol-trimetoprim', 'smxtmp-susp', 15, PED_4A_DIAS).dose_por_dose_mg).toBeCloseTo(60, 6);
  });

  it('fenitoína 5 mg/kg/DIA ÷ 12/12h (a fonte é por dia): 15 kg = 75 mg/dia, 37,5 mg por tomada — mesmo resultado de antes da RM-103', () => {
    const r = calc('fenitoina', 'feni-susp', 15, PED_4A_DIAS);
    expect(r.dose_total_dia_mg).toBeCloseTo(75, 6);
    expect(r.dose_por_dose_mg).toBeCloseTo(37.5, 6);
  });

  it('dose única diária é idêntica nas duas semânticas: prednisona 1 mg/kg 1x/dia, 20 kg = 20 mg', () => {
    const r = calc('prednisona', 'pred-comp-5', 20, PED_4A_DIAS);
    expect(r.dose_por_dose_mg).toBeCloseTo(20, 6);
    expect(r.dose_total_dia_mg).toBeCloseTo(20, 6);
  });
});

describe('RM-103 — neonato: tetos em mg/kg/dia não podem virar teto absoluto em mg', () => {
  it('paracetamol neonato 10 mg/kg 6/6h, 3 kg: 30 mg por tomada, 120 mg/dia, sem corte (o campo antigo dose_maxima_por_dia_mg: 40 era mg/kg/dia lido como mg)', () => {
    const r = calc('paracetamol', 'parac-gotas', 3, 10);
    expect(r.dose_por_dose_mg).toBeCloseTo(30, 6);
    expect(r.dose_total_dia_mg).toBeCloseTo(120, 6);
    expect(r.excede_dose_maxima_dia).toBe(false);
    // 120 mg/dia / 3 kg = 40 mg/kg/dia: exatamente o teto declarado na observação
    expect(r.dose_total_dia_mg / 3).toBeCloseTo(40, 6);
  });

  it('fenitoína neonato 5 mg/kg/dia, 3 kg: 15 mg/dia, 7,5 mg por tomada', () => {
    const r = calc('fenitoina', 'feni-susp', 3, 10);
    expect(r.dose_total_dia_mg).toBeCloseTo(15, 6);
    expect(r.dose_por_dose_mg).toBeCloseTo(7.5, 6);
  });
});

describe('RM-103 — tetos e flags excede_dose_maxima_* com dose por tomada', () => {
  const ONZE_ANOS = 11 * 365;

  it('paracetamol 15 mg/kg em criança de 11 anos e 70 kg: 1050 mg > teto 1000 mg por tomada e 4200 mg/dia > 4000 → corta e sinaliza os dois', () => {
    const r = calc('paracetamol', 'parac-comp-500', 70, ONZE_ANOS);
    expect(r.excede_dose_maxima_dose).toBe(true);
    expect(r.excede_dose_maxima_dia).toBe(true);
    expect(r.dose_por_dose_mg).toBeCloseTo(1000, 6);
    expect(r.dose_total_dia_mg).toBeCloseTo(4000, 6);
  });

  it('ibuprofeno 10 mg/kg em criança de 50 kg: 500 mg > teto 400 mg por tomada → corta para 400 mg e total consistente (1200 mg/dia, não os 1500 brutos)', () => {
    const r = calc('ibuprofeno', 'ibu-susp-100', 50, ONZE_ANOS);
    expect(r.excede_dose_maxima_dose).toBe(true);
    expect(r.excede_dose_maxima_dia).toBe(false);
    expect(r.dose_por_dose_mg).toBeCloseTo(400, 6);
    expect(r.dose_total_dia_mg).toBeCloseTo(1200, 6);
  });

  it('salbutamol 0,15 mg/kg em 40 kg: 6 mg > teto 5 mg por tomada → 5 mg', () => {
    const r = calc('salbutamol', 'salb-susp-neb', 40, ONZE_ANOS);
    expect(r.excede_dose_maxima_dose).toBe(true);
    expect(r.dose_por_dose_mg).toBeCloseTo(5, 6);
  });

  it('dentro dos tetos nada é sinalizado (paracetamol 15 mg/kg, 15 kg)', () => {
    const r = calc('paracetamol', 'parac-susp', 15, PED_4A_DIAS);
    expect(r.excede_dose_maxima_dia).toBe(false);
    expect(r.excede_dose_maxima_dose).toBe(false);
  });

  it('unidade por tomada com teto diário: 1000 mg x 4/dia contra teto 3000 mg/dia → corta o dia e re-divide por tomada', () => {
    const med: MedicamentoDosagem = {
      id: 'teste', nome_generico: 'Teste', classe: 'Teste',
      formulacoes: [{ id: 'f', descricao: 'cp', tipo: 'comprimido', via: 'oral', concentracao_mg: 500, unidade_dispensa: 'comprimido' }],
      regras: [{ populacoes: ['adulto'], dose: 1000, unidade: 'mg', frequencia_horas: 6, via: 'oral', dose_maxima_por_dia_mg: 3000 }],
    };
    const r = calcularDosagem(70, undefined, ADULTO_DIAS, med, 'f');
    expect(r?.excede_dose_maxima_dia).toBe(true);
    expect(r?.dose_total_dia_mg).toBeCloseTo(3000, 6);
    expect(r?.dose_por_dose_mg).toBeCloseTo(750, 6);
  });

  it('mg/kg e mg/kg/dia com a mesma frequência divergem exatamente por doses_por_dia', () => {
    const base = (unidade: 'mg/kg' | 'mg/kg/dia'): MedicamentoDosagem => ({
      id: 't', nome_generico: 'T', classe: 'T',
      formulacoes: [{ id: 'f', descricao: 'cp', tipo: 'comprimido', via: 'oral', concentracao_mg: 100, unidade_dispensa: 'comprimido' }],
      regras: [{ populacoes: ['pediatrico'], dose: 10, unidade, frequencia_horas: 8, via: 'oral' }],
    });
    const porTomada = calcularDosagem(10, undefined, PED_4A_DIAS, base('mg/kg'), 'f');
    const porDia = calcularDosagem(10, undefined, PED_4A_DIAS, base('mg/kg/dia'), 'f');
    expect(porTomada?.dose_por_dose_mg).toBeCloseTo(100, 6);
    expect(porTomada?.dose_total_dia_mg).toBeCloseTo(300, 6);
    expect(porDia?.dose_por_dose_mg).toBeCloseTo(100 / 3, 6);
    expect(porDia?.dose_total_dia_mg).toBeCloseTo(100, 6);
  });
});

// ============================================================
// RM-103 — correções de dados achadas ao auditar contra a literatura
// ============================================================

describe('RM-103 — dienogeste: 2 mg 1x/dia (bulas/SmPC de dienogeste 2 mg; pharma-database-gineco e catálogo Eurofarma já diziam 1x/dia)', () => {
  it('adulto: 2 mg por tomada, 1 tomada/dia, 2 mg/dia — sem excesso (antes: 2 mg 12/12h = 4 mg/dia, o dobro da bula)', () => {
    const r = calc('dienogeste', 'dien-comp-2', 60, ADULTO_DIAS);
    expect(r.doses_por_dia).toBe(1);
    expect(r.dose_por_dose_mg).toBeCloseTo(2, 6);
    expect(r.dose_total_dia_mg).toBeCloseTo(2, 6);
    expect(r.comprimidos_por_dose).toBeCloseTo(1, 6);
    expect(r.excede_dose_maxima_dia).toBe(false);
  });
});

describe('RM-103 — salbutamol: a posologia depende da apresentação (nebulização em mg × aerossol de 100 mcg/jato)', () => {
  it('nebulização adulta: 2,5 mg = 0,5 mL de 5 mg/mL (SmPC: 2,5–5 mg até 4x/dia)', () => {
    const r = calc('salbutamol', 'salb-susp-neb', 70, ADULTO_DIAS);
    expect(r.dose_por_dose_mg).toBeCloseTo(2.5, 6);
    expect(r.volume_por_dose_mL).toBeCloseTo(0.5, 6);
  });

  it('aerossol adulto: 0,2 mg = 2 jatos de 100 mcg por tomada, máx 0,8 mg/dia = 8 jatos/24 h (bula Ventolin Evohaler) — não mais 25 jatos', () => {
    const r = calc('salbutamol', 'salb-aerossol', 70, ADULTO_DIAS);
    expect(r.dose_por_dose_mg).toBeCloseTo(0.2, 6);
    expect(r.comprimidos_por_dose).toBeCloseTo(2, 6);
    expect(r.dose_total_dia_mg).toBeCloseTo(0.8, 6);
    expect(r.excede_dose_maxima_dia).toBe(false);
  });

  it('aerossol pediátrico (4 anos): 1 jato (100 mcg) por tomada', () => {
    const r = calc('salbutamol', 'salb-aerossol', 15, PED_4A_DIAS);
    expect(r.dose_por_dose_mg).toBeCloseTo(0.1, 6);
    expect(r.comprimidos_por_dose).toBeCloseTo(1, 6);
  });

  it('aerossol em lactente: sem posologia (a bula do aerossol é para ≥ 4 anos) — nunca cai na regra de nebulização', () => {
    const med = getMedicamentoById('salbutamol')!;
    const r = calcularDosagem(8, undefined, 200, med, 'salb-aerossol');
    expect(r?.ok).toBe(false);
    expect(r?.erro).toMatch(/Não há posologia/);
  });

  it('nebulização pediátrica: 0,15 mg/kg com PISO de 2,5 mg e teto de 5 mg por tomada, independente do peso (Shared Health Manitoba)', () => {
    const leve = calc('salbutamol', 'salb-susp-neb', 10, PED_4A_DIAS); // 1,5 mg bruto
    expect(leve.dose_por_dose_mg).toBeCloseTo(2.5, 6);
    expect(leve.dose_total_dia_mg).toBeCloseTo(10, 6);
    expect(leve.formula_texto).toMatch(/dose mínima/);
    const pesado = calc('salbutamol', 'salb-susp-neb', 40, 11 * 365); // 6 mg bruto
    expect(pesado.dose_por_dose_mg).toBeCloseTo(5, 6);
  });

  it('o alerta do fármaco e a observação da regra do aerossol orientam mais jatos sob supervisão na crise aguda', () => {
    const med = getMedicamentoById('salbutamol')!;
    expect(med.alerta_especial).toMatch(/pronto-socorro/i);
    expect(med.alerta_especial).toMatch(/supervis/i);
    expect(med.alerta_especial).toMatch(/NÃO limita/);
    const regraAerossol = med.regras.find(r => r.formulacao_ids?.includes('salb-aerossol') && r.populacoes.includes('adulto'));
    expect(regraAerossol?.observacao).toMatch(/PS|supervis/);
  });
});

describe('RM-103 — fenitoína neonatal: manutenção 4–8 mg/kg/dia; sem teto absoluto em mg', () => {
  it('neonato de 5 kg: 5 mg/kg/dia = 25 mg/dia (antes o teto de 20 mg/dia sem fonte cortava)', () => {
    const r = calc('fenitoina', 'feni-susp', 5, 10);
    expect(r.dose_total_dia_mg).toBeCloseTo(25, 6);
    expect(r.dose_por_dose_mg).toBeCloseTo(12.5, 6);
    expect(r.excede_dose_maxima_dia).toBe(false);
  });

  it('pediátrico: teto de 300 mg/dia (PCH, MSF) continua valendo — 70 kg x 5 mg/kg/dia = 350 → 300', () => {
    const r = calc('fenitoina', 'feni-susp', 70, 11 * 365);
    expect(r.excede_dose_maxima_dia).toBe(true);
    expect(r.dose_total_dia_mg).toBeCloseTo(300, 6);
  });
});
