// ============================================================
// PRESCREVE-AI — Motor de Cálculo de Doses
// CG (Cockcroft-Gault), Mosteller (BSA), mg/kg, conversões
// ============================================================

// ─── INTERFACES ───────────────────────────────────────────────

export interface PatientParams {
  idade: number;
  sexo: 'M' | 'F';
  peso: number;       // kg
  altura?: number;    // cm
  creatinina?: number; // mg/dL
  child_pugh?: 'A' | 'B' | 'C' | '';
}

export interface CrClResult {
  crcl: number;         // mL/min
  ckd_stage: string;
  interpretacao: string;
  formula: string;
  passo_a_passo: string[];
}

export interface BSAResult {
  bsa: number; // m²
  formula: string;
  passo_a_passo: string[];
}

export interface DoseCalcResult {
  dose_total_dia: number;
  unidade: string;
  dose_por_tomada: number;
  tomadas_dia: number;
  posologia_sugerida: string;
  passo_a_passo: string[];
  ajuste_renal?: string;
  aviso?: string;
}

export interface ConversionResult {
  resultado: number;
  unidade_resultado: string;
  passo_a_passo: string[];
}

// ─── COCKCROFT-GAULT ──────────────────────────────────────────

export function calcCrCl(params: PatientParams): CrClResult | null {
  if (!params.creatinina || !params.peso || !params.idade) return null;

  const { idade, sexo, peso, creatinina } = params;
  const fatorSexo = sexo === 'F' ? 0.85 : 1.0;
  const crcl = ((140 - idade) * peso * fatorSexo) / (72 * creatinina);
  const crclRounded = Math.round(crcl * 10) / 10;

  let ckd_stage: string;
  let interpretacao: string;
  if (crcl >= 90) { ckd_stage = 'G1'; interpretacao = 'Função renal normal ou aumentada'; }
  else if (crcl >= 60) { ckd_stage = 'G2'; interpretacao = 'Leve redução da função renal'; }
  else if (crcl >= 45) { ckd_stage = 'G3a'; interpretacao = 'Leve a moderada redução'; }
  else if (crcl >= 30) { ckd_stage = 'G3b'; interpretacao = 'Moderada a grave redução'; }
  else if (crcl >= 15) { ckd_stage = 'G4'; interpretacao = 'Grave redução da função renal'; }
  else { ckd_stage = 'G5'; interpretacao = 'Insuficiência renal terminal'; }

  return {
    crcl: crclRounded,
    ckd_stage,
    interpretacao,
    formula: 'Cockcroft-Gault',
    passo_a_passo: [
      `Fórmula: CrCl = [(140 − idade) × peso × fator_sexo] / (72 × creatinina)`,
      `Idade: ${idade} anos | Peso: ${peso} kg | Creatinina: ${creatinina} mg/dL`,
      `Fator sexo: ${fatorSexo} (${sexo === 'F' ? 'Feminino × 0,85' : 'Masculino × 1,0'})`,
      `Cálculo: [(140 − ${idade}) × ${peso} × ${fatorSexo}] / (72 × ${creatinina})`,
      `= [${140 - idade} × ${peso} × ${fatorSexo}] / ${(72 * creatinina).toFixed(1)}`,
      `= ${((140 - idade) * peso * fatorSexo).toFixed(1)} / ${(72 * creatinina).toFixed(1)}`,
      `= ${crclRounded} mL/min → Estágio ${ckd_stage} (${interpretacao})`,
    ],
  };
}

// ─── BSA — MOSTELLER ──────────────────────────────────────────

export function calcBSA(peso: number, altura: number): BSAResult {
  const bsa = Math.sqrt((altura * peso) / 3600);
  const bsaRounded = Math.round(bsa * 100) / 100;
  return {
    bsa: bsaRounded,
    formula: 'Mosteller',
    passo_a_passo: [
      `Fórmula Mosteller: BSA = √(altura(cm) × peso(kg) / 3600)`,
      `= √(${altura} × ${peso} / 3600)`,
      `= √(${(altura * peso / 3600).toFixed(4)})`,
      `= ${bsaRounded} m²`,
    ],
  };
}

// ─── IMC ──────────────────────────────────────────────────────

export function calcIMC(peso: number, altura: number): { imc: number; classificacao: string } {
  const alturaM = altura / 100;
  const imc = peso / (alturaM * alturaM);
  const imcR = Math.round(imc * 10) / 10;
  let classificacao: string;
  if (imc < 18.5) classificacao = 'Abaixo do peso';
  else if (imc < 25) classificacao = 'Peso normal';
  else if (imc < 30) classificacao = 'Sobrepeso';
  else if (imc < 35) classificacao = 'Obesidade Grau I';
  else if (imc < 40) classificacao = 'Obesidade Grau II';
  else classificacao = 'Obesidade Grau III (mórbida)';
  return { imc: imcR, classificacao };
}

// ─── CÁLCULO DOSE mg/kg ───────────────────────────────────────

export function calcWeightDose(
  dosePerKg: number,
  peso: number,
  divisoes: number,
  maxDiaDose: number,
  unidade: string,
): DoseCalcResult {
  const totalDia = Math.min(dosePerKg * peso, maxDiaDose);
  const porTomada = totalDia / divisoes;
  const porTomadaR = Math.round(porTomada * 10) / 10;
  const totalR = Math.round(totalDia * 10) / 10;

  const passos = [
    `Dose prescrita: ${dosePerKg} ${unidade}/kg/dia`,
    `Peso do paciente: ${peso} kg`,
    `Dose total/dia = ${dosePerKg} × ${peso} = ${totalDia.toFixed(1)} ${unidade}/dia`,
  ];

  if (totalDia > dosePerKg * peso) {
    passos.push(`⚠ Dose calculada (${(dosePerKg * peso).toFixed(1)}) > dose máxima (${maxDiaDose} ${unidade}) → usar ${maxDiaDose} ${unidade}/dia`);
  } else {
    passos.push(`Dose máxima: ${maxDiaDose} ${unidade}/dia → sem ajuste necessário`);
  }

  passos.push(`Divisão em ${divisoes} tomadas: ${totalR} / ${divisoes} = ${porTomadaR} ${unidade}/dose`);

  const freq = divisoes === 1 ? '1x/dia' : divisoes === 2 ? '12/12h' : divisoes === 3 ? '8/8h' : divisoes === 4 ? '6/6h' : `${divisoes}x/dia`;
  const posologia = `${porTomadaR} ${unidade} ${freq} (total ${totalR} ${unidade}/dia)`;

  return {
    dose_total_dia: totalR,
    unidade,
    dose_por_tomada: porTomadaR,
    tomadas_dia: divisoes,
    posologia_sugerida: posologia,
    passo_a_passo: passos,
    aviso: totalR >= maxDiaDose ? `Dose limitada ao máximo de ${maxDiaDose} ${unidade}/dia` : undefined,
  };
}

// ─── CONVERSOR FARMACÊUTICO ───────────────────────────────────

export type ConversionType =
  | 'mg_to_mL'       // mg → mL (ex: sol 250 mg/5 mL)
  | 'mL_to_drops'    // mL → gotas (1 mL = 20 gotas)
  | 'mg_to_tabs'     // mg → comprimidos
  | 'mcg_to_mg'      // mcg → mg
  | 'g_to_mg'        // g → mg
  | 'UI_to_mL';      // UI → mL

export function convertDose(
  value: number,
  type: ConversionType,
  concentration?: number, // mg/mL ou mg/tab ou UI/mL
): ConversionResult {
  switch (type) {
    case 'mg_to_mL': {
      if (!concentration) return { resultado: 0, unidade_resultado: 'mL', passo_a_passo: ['Concentração não informada'] };
      const mL = value / concentration;
      return {
        resultado: Math.round(mL * 100) / 100,
        unidade_resultado: 'mL',
        passo_a_passo: [
          `Dose necessária: ${value} mg`,
          `Concentração da solução: ${concentration} mg/mL`,
          `Volume = ${value} ÷ ${concentration} = ${(value / concentration).toFixed(2)} mL`,
        ],
      };
    }
    case 'mL_to_drops': {
      const drops = value * 20;
      return {
        resultado: drops,
        unidade_resultado: 'gotas',
        passo_a_passo: [
          `Volume: ${value} mL`,
          `Fator de conversão: 1 mL = 20 gotas (macrogotas padrão)`,
          `Gotas = ${value} × 20 = ${drops} gotas`,
        ],
      };
    }
    case 'mg_to_tabs': {
      if (!concentration) return { resultado: 0, unidade_resultado: 'comprimidos', passo_a_passo: ['Concentração do comprimido não informada'] };
      const tabs = value / concentration;
      return {
        resultado: Math.round(tabs * 100) / 100,
        unidade_resultado: 'comprimidos',
        passo_a_passo: [
          `Dose necessária: ${value} mg`,
          `Concentração do comprimido: ${concentration} mg`,
          `Comprimidos = ${value} ÷ ${concentration} = ${tabs.toFixed(2)} comprimidos`,
          tabs % 1 !== 0 ? `⚠ Resultado fracionado — verificar se comprimido pode ser partido ou ajustar dose` : `✓ Número inteiro de comprimidos`,
        ],
      };
    }
    case 'mcg_to_mg': {
      return {
        resultado: value / 1000,
        unidade_resultado: 'mg',
        passo_a_passo: [`${value} mcg ÷ 1000 = ${value / 1000} mg`],
      };
    }
    case 'g_to_mg': {
      return {
        resultado: value * 1000,
        unidade_resultado: 'mg',
        passo_a_passo: [`${value} g × 1000 = ${value * 1000} mg`],
      };
    }
    case 'UI_to_mL': {
      if (!concentration) return { resultado: 0, unidade_resultado: 'mL', passo_a_passo: ['Concentração UI/mL não informada'] };
      const vol = value / concentration;
      return {
        resultado: Math.round(vol * 100) / 100,
        unidade_resultado: 'mL',
        passo_a_passo: [
          `Dose: ${value} UI`,
          `Concentração: ${concentration} UI/mL`,
          `Volume = ${value} ÷ ${concentration} = ${vol.toFixed(2)} mL`,
        ],
      };
    }
    default:
      return { resultado: 0, unidade_resultado: '', passo_a_passo: [] };
  }
}

// ─── AJUSTE RENAL RÁPIDO ─────────────────────────────────────

export function getStageLabel(crcl: number): string {
  if (crcl >= 90) return 'Normal (≥ 90)';
  if (crcl >= 60) return 'G2 (60-89)';
  if (crcl >= 45) return 'G3a (45-59)';
  if (crcl >= 30) return 'G3b (30-44)';
  if (crcl >= 15) return 'G4 (15-29)';
  return 'G5 — Falência Renal (< 15)';
}

export function getAdjustmentForCrCl(
  ajuste: { normal: string; tfg_60_30: string; tfg_30_15: string; tfg_lt_15: string } | undefined,
  crcl: number,
): string {
  if (!ajuste) return 'Sem dados de ajuste renal';
  if (crcl >= 60) return `Normal: ${ajuste.normal}`;
  if (crcl >= 30) return `TFG 30-60: ${ajuste.tfg_60_30}`;
  if (crcl >= 15) return `TFG 15-30: ${ajuste.tfg_30_15}`;
  return `TFG < 15: ${ajuste.tfg_lt_15}`;
}

// ─── FAIXA ETÁRIA PEDIÁTRICA ─────────────────────────────────

export function getPediatricAgeGroup(idadeMeses: number): string {
  if (idadeMeses < 1) return 'Neonato prematuro (< 28 dias gestação corrigida)';
  if (idadeMeses <= 1) return 'Neonato (0-28 dias)';
  if (idadeMeses <= 24) return 'Lactente (1-24 meses)';
  if (idadeMeses <= 72) return 'Pré-escolar (2-6 anos)';
  if (idadeMeses <= 144) return 'Escolar (6-12 anos)';
  return 'Adolescente (12-18 anos)';
}

export function idadeEmMeses(anos: number, meses?: number): number {
  return anos * 12 + (meses ?? 0);
}

// ─── ALERTAS GERIÁTRICOS (CRITÉRIOS BEERS) ───────────────────

const BEERS_DRUGS = [
  'Glibenclamida',
  'Alprazolam',
  'Amitriptilina',
  'Dipirona',
];

export function checkBeersCriteria(molecula: string): string | null {
  const match = BEERS_DRUGS.find(d => molecula.toLowerCase().includes(d.toLowerCase()));
  if (!match) return null;
  const msgs: Record<string, string> = {
    'Glibenclamida': '⚠ Critérios de Beers: Alto risco de hipoglicemia prolongada em idosos. Preferir glicazida ou sitagliptina.',
    'Alprazolam': '⚠ Critérios de Beers: Benzodiazepínicos aumentam risco de sedação excessiva, quedas e fraturas em idosos.',
    'Amitriptilina': '⚠ Critérios de Beers: Anticolinérgico — risco de confusão, retenção urinária, constipação em idosos.',
    'Dipirona': '⚠ Cautela em idosos: risco de agranulocitose aumentado com comorbidades.',
  };
  return msgs[match] ?? null;
}
