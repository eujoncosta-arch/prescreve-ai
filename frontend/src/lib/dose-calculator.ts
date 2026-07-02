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

const BEERS_DRUGS: Record<string, string> = {
  'Glibenclamida': '⚠ Beers: Alto risco de hipoglicemia prolongada em idosos. Preferir glicazida ou sitagliptina.',
  'Alprazolam': '⚠ Beers: Benzodiazepínicos aumentam risco de sedação, quedas e fraturas em idosos.',
  'Clonazepam': '⚠ Beers: Benzodiazepínico — risco de sedação, quedas e fraturas em idosos.',
  'Diazepam': '⚠ Beers: Benzodiazepínico de longa duração — evitar em idosos (meia-vida prolongada).',
  'Amitriptilina': '⚠ Beers: Anticolinérgico — confusão, retenção urinária, constipação, hipotensão em idosos.',
  'Nortriptilina': '⚠ Beers: Tricíclico anticolinérgico — risco aumentado em idosos.',
  'Dipirona': '⚠ Cautela em idosos: risco de agranulocitose aumentado com comorbidades.',
  'Hidroxizina': '⚠ Beers: Anti-histamínico de 1ª geração — sedação excessiva, anticolinérgico, risco de quedas em idosos.',
  'Tramadol': '⚠ Beers: Risco de hipoglicemia, convulsão e síndrome serotoninérgica maior em idosos.',
  'Metoclopramida': '⚠ Beers: Risco de efeitos extrapiramidais e tardive dyskinesia em idosos.',
  'Domperidona': '⚠ Beers: Risco cardíaco (QT) aumentado em idosos — usar com cautela.',
};

export function checkBeersCriteria(molecula: string): string | null {
  const mol = molecula.toLowerCase();
  const match = Object.keys(BEERS_DRUGS).find(d => mol.includes(d.toLowerCase()));
  return match ? BEERS_DRUGS[match] : null;
}

// ─── CLASSIFICAÇÃO POPULACIONAL ───────────────────────────────

export type PatientPopulation = 'neonato' | 'lactente' | 'pre_escolar' | 'escolar' | 'adolescente' | 'adulto' | 'geriatrico';

export interface PopulationProfile {
  population: PatientPopulation;
  label: string;
  usar_dose_pediatrica: boolean;
  usar_dose_por_kg: boolean;
  alerta_beers: boolean;
}

export function classifyPopulation(idadeAnos: number): PopulationProfile {
  if (idadeAnos < 0.083) return { population: 'neonato', label: 'Neonato (< 28 dias)', usar_dose_pediatrica: true, usar_dose_por_kg: true, alerta_beers: false };
  if (idadeAnos < 2)     return { population: 'lactente', label: `Lactente (${Math.round(idadeAnos * 12)} meses)`, usar_dose_pediatrica: true, usar_dose_por_kg: true, alerta_beers: false };
  if (idadeAnos < 6)     return { population: 'pre_escolar', label: `Pré-escolar (${idadeAnos} anos)`, usar_dose_pediatrica: true, usar_dose_por_kg: true, alerta_beers: false };
  if (idadeAnos < 12)    return { population: 'escolar', label: `Escolar (${idadeAnos} anos)`, usar_dose_pediatrica: true, usar_dose_por_kg: true, alerta_beers: false };
  if (idadeAnos < 18)    return { population: 'adolescente', label: `Adolescente (${idadeAnos} anos)`, usar_dose_pediatrica: false, usar_dose_por_kg: false, alerta_beers: false };
  if (idadeAnos >= 65)   return { population: 'geriatrico', label: `Adulto idoso (${idadeAnos} anos)`, usar_dose_pediatrica: false, usar_dose_por_kg: false, alerta_beers: true };
  return { population: 'adulto', label: `Adulto (${idadeAnos} anos)`, usar_dose_pediatrica: false, usar_dose_por_kg: false, alerta_beers: false };
}

// ─── PARSER DE CONCENTRAÇÃO ───────────────────────────────────

export interface ParsedConcentration {
  tipo: 'solido' | 'liquido' | 'inalatorio' | 'desconhecido';
  mg_por_unidade: number;   // mg por comprimido/cápsula OU mg/mL se líquido
  mg_por_mL?: number;       // somente líquidos
  unidade_texto: string;    // "comprimido", "mL", "jato", etc.
  texto_original: string;
}

export function parseConcentration(texto: string): ParsedConcentration {
  const t = texto.toLowerCase().trim();

  // Combinação "400/57 mg/5 mL" — usa o PRIMEIRO número (componente principal)
  const liquidoCombinacao = t.match(/^(\d+[\.,]?\d*)\/(\d+[\.,]?\d*)\s*mg\s*\/\s*(\d+[\.,]?\d*)\s*mL/i);
  if (liquidoCombinacao) {
    const mgPrincipal = parseFloat(liquidoCombinacao[1].replace(',', '.'));
    const mlTotal = parseFloat(liquidoCombinacao[3].replace(',', '.'));
    const mgPorMl = mgPrincipal / mlTotal;
    return { tipo: 'liquido', mg_por_unidade: mgPorMl, mg_por_mL: mgPorMl, unidade_texto: 'mL', texto_original: texto };
  }

  // Suspensão/solução simples: "250 mg/5 mL"
  const liquidoSlash = t.match(/(\d+[\.,]?\d*)\s*mg\s*\/\s*(\d+[\.,]?\d*)\s*mL/i);
  if (liquidoSlash) {
    const mgTotal = parseFloat(liquidoSlash[1].replace(',', '.'));
    const mlTotal = parseFloat(liquidoSlash[2].replace(',', '.'));
    const mgPorMl = mgTotal / mlTotal;
    return { tipo: 'liquido', mg_por_unidade: mgPorMl, mg_por_mL: mgPorMl, unidade_texto: 'mL', texto_original: texto };
  }

  // Solução direta: "20 mg/mL"
  const liquidoDireto = t.match(/(\d+[\.,]?\d*)\s*mg\s*\/\s*mL/i);
  if (liquidoDireto) {
    const mgPorMl = parseFloat(liquidoDireto[1].replace(',', '.'));
    return { tipo: 'liquido', mg_por_unidade: mgPorMl, mg_por_mL: mgPorMl, unidade_texto: 'mL', texto_original: texto };
  }

  // mcg/jato (inalatório nasal/pulmonar)
  const inalatorio = t.match(/(\d+[\.,]?\d*)\s*mcg/i);
  if (inalatorio && (t.includes('jato') || t.includes('spray') || t.includes('mcg'))) {
    const mcg = parseFloat(inalatorio[1].replace(',', '.'));
    return { tipo: 'inalatorio', mg_por_unidade: mcg / 1000, unidade_texto: 'jato', texto_original: texto };
  }

  // Sólido simples: "50 mg", "500 mg"
  const solido = t.match(/(\d+[\.,]?\d*)\s*mg/i);
  if (solido) {
    const mg = parseFloat(solido[1].replace(',', '.'));
    return { tipo: 'solido', mg_por_unidade: mg, unidade_texto: 'comprimido', texto_original: texto };
  }

  return { tipo: 'desconhecido', mg_por_unidade: 0, unidade_texto: '', texto_original: texto };
}

// ─── MOTOR UNIVERSAL DE DOSE ──────────────────────────────────

export interface FullDoseInput {
  molecula: string;
  alturaM?: number;  // metros — necessário para cálculo BSA (mg/m²)
  dose_adulto: { habitual: string; min?: string; max: string; unidade: string; via: string; frequencias: string[]; instrucoes?: string };
  dose_pediatrica?: { calculo: string; dose_por_kg: number; unidade: string; frequencia_divisoes: number; max_dose_dia: number; max_dose_dia_unidade: string; faixa_etaria: string; observacao?: string };
  ajuste_renal?: { normal: string; tfg_60_30: string; tfg_30_15: string; tfg_lt_15: string; dialisavel: boolean };
  ajuste_hepatico?: { child_a: string; child_b: string; child_c: string };
  alertas_especiais: string[];
  uso_gestante: string;
  uso_lactante: string;
}

export interface FullDoseResult {
  population: PopulationProfile;
  dose_por_tomada: number;
  dose_unidade: string;
  volume_por_tomada?: number;      // mL, se líquido
  gotas_por_tomada?: number;       // 1 mL = 20 macrogotas
  bsa_m2?: number;                 // superfície corporal, se calculada
  frequencia: string;
  tomadas_dia: number;
  dose_total_dia: number;
  posologia_sugerida: string;
  passo_a_passo: string[];
  alertas: string[];
  ajuste_renal_texto?: string;
  ajuste_hepatico_texto?: string;
  limitado_por_dose_max: boolean;
  fonte: 'pediatrica_mg_kg' | 'pediatrica_mg_m2' | 'pediatrica_mcg_kg' | 'pediatrica_UI_kg' | 'pediatrica_fixa' | 'adulto_fixo' | 'adulto_mg_kg' | 'bsa';
}

export function calcFullDose(
  drug: FullDoseInput,
  idadeAnos: number,
  pesoKg: number,
  concentracaoSelecionada: string,
  crcl?: number,
  childPugh?: 'A' | 'B' | 'C' | '',
  gestante?: boolean,
  lactante?: boolean,
  alturaM?: number,  // opcional: habilita cálculo BSA para mg/m²
): FullDoseResult {
  const profile = classifyPopulation(idadeAnos);
  const conc = parseConcentration(concentracaoSelecionada);
  const alturaFinal = alturaM ?? drug.alturaM;
  const alertas: string[] = [];
  const passos: string[] = [];

  passos.push(`Paciente: ${profile.label} | Peso: ${pesoKg} kg`);
  passos.push(`Medicamento: ${drug.molecula} — ${concentracaoSelecionada}`);

  // Alertas gestante/lactante
  if (gestante && (drug.uso_gestante === 'contraindicado' || drug.uso_gestante === 'risco')) {
    alertas.push(`🚨 GESTAÇÃO: ${drug.uso_gestante === 'contraindicado' ? 'CONTRAINDICADO' : 'Risco potencial — avaliar'}`);
  }
  if (lactante && (drug.uso_lactante === 'contraindicado' || drug.uso_lactante === 'risco')) {
    alertas.push(`🍼 LACTAÇÃO: ${drug.uso_lactante === 'contraindicado' ? 'CONTRAINDICADO' : 'Risco — avaliar'}`);
  }

  // Alertas especiais relevantes
  drug.alertas_especiais.filter(a => a.startsWith('⚠') || a.startsWith('🚨')).forEach(a => alertas.push(a));

  // Ajuste renal
  let ajusteRenalTexto: string | undefined;
  if (crcl !== undefined && drug.ajuste_renal) {
    if (crcl < 15) ajusteRenalTexto = `TFG < 15: ${drug.ajuste_renal.tfg_lt_15}`;
    else if (crcl < 30) ajusteRenalTexto = `TFG 15–30: ${drug.ajuste_renal.tfg_30_15}`;
    else if (crcl < 60) ajusteRenalTexto = `TFG 30–60: ${drug.ajuste_renal.tfg_60_30}`;
    else ajusteRenalTexto = `TFG ≥ 60: ${drug.ajuste_renal.normal}`;
    if (crcl < 60) alertas.push(`⚠ Ajuste renal necessário: ${ajusteRenalTexto}`);
  }

  // Ajuste hepático
  let ajusteHepaticoTexto: string | undefined;
  if (childPugh && drug.ajuste_hepatico) {
    const textos: Record<string, string> = { A: drug.ajuste_hepatico.child_a, B: drug.ajuste_hepatico.child_b, C: drug.ajuste_hepatico.child_c };
    ajusteHepaticoTexto = `Child-Pugh ${childPugh}: ${textos[childPugh]}`;
    if (childPugh !== 'A') alertas.push(`⚠ Ajuste hepático: ${ajusteHepaticoTexto}`);
  }

  // Cálculo de dose
  let dosePorTomada: number;
  let doseUnidade: string;
  let tomadas: number;
  let doseTotalDia: number;
  let limitado = false;
  let fonte: FullDoseResult['fonte'];

  // Helper: converte max_dose_dia para mg absoluto conforme a unidade declarada
  function maxAbsoluto(ped: { max_dose_dia: number; max_dose_dia_unidade: string }): number {
    return ped.max_dose_dia_unidade.includes('/kg') ? ped.max_dose_dia * pesoKg : ped.max_dose_dia;
  }

  const usarPediatrica = profile.usar_dose_pediatrica && drug.dose_pediatrica && drug.dose_pediatrica.dose_por_kg > 0;
  let bsaM2: number | undefined;

  if (usarPediatrica && drug.dose_pediatrica) {
    const ped = drug.dose_pediatrica;
    const maxDiaAbs = maxAbsoluto(ped);
    doseUnidade = ped.unidade;
    tomadas = ped.frequencia_divisoes;

    if (ped.calculo === 'mg/m²' || ped.calculo === 'mcg/m²') {
      // Dose por superfície corporal — requer altura
      if (!alturaFinal || alturaFinal <= 0) {
        passos.push(`ℹ Cálculo ${ped.calculo}: altura necessária para calcular BSA. Informe a altura do paciente.`);
        alertas.push(`⚠ Informe a altura para calcular dose por superfície corporal (${ped.calculo})`);
        // fallback: usa dose adulto
        dosePorTomada = parseFloat(drug.dose_adulto.habitual) || 0;
        doseUnidade = drug.dose_adulto.unidade;
        tomadas = drug.dose_adulto.frequencias[0]?.includes('2x') ? 2 : 1;
        doseTotalDia = dosePorTomada * tomadas;
        fonte = 'adulto_fixo';
      } else {
        const alturaCm = alturaFinal > 10 ? alturaFinal : alturaFinal * 100; // aceita m ou cm
        const bsaResult = calcBSA(pesoKg, alturaCm);
        bsaM2 = bsaResult.bsa;
        fonte = 'pediatrica_mg_m2';

        bsaResult.passo_a_passo.forEach(p => passos.push(p));
        const doseCalc = Math.round(ped.dose_por_kg * bsaM2 * 10) / 10;
        limitado = doseCalc > maxDiaAbs;
        doseTotalDia = Math.round(Math.min(doseCalc, maxDiaAbs) * 10) / 10;
        dosePorTomada = Math.round((doseTotalDia / tomadas) * 10) / 10;
        passos.push(`Dose: ${ped.dose_por_kg} ${ped.unidade}/m² × ${bsaM2} m² = ${doseCalc.toFixed(1)} ${ped.unidade}/dia`);
      }
    } else if (ped.calculo === 'mcg/kg' || ped.calculo === 'mcg/kg/dia') {
      fonte = 'pediatrica_mcg_kg';
      const calculada = Math.round(ped.dose_por_kg * pesoKg * 10) / 10;
      limitado = calculada > maxDiaAbs;
      doseTotalDia = Math.round(Math.min(calculada, maxDiaAbs) * 10) / 10;
      dosePorTomada = Math.round((doseTotalDia / tomadas) * 10) / 10;
      passos.push(`Dose pediátrica: ${ped.dose_por_kg} ${ped.unidade}/kg/dia`);
      passos.push(`Dose calculada: ${ped.dose_por_kg} × ${pesoKg} kg = ${calculada.toFixed(1)} ${ped.unidade}/dia`);
    } else if (ped.calculo === 'UI/kg' || ped.calculo === 'UI/kg/dia') {
      fonte = 'pediatrica_UI_kg';
      const calculada = Math.round(ped.dose_por_kg * pesoKg * 10) / 10;
      limitado = calculada > maxDiaAbs;
      doseTotalDia = Math.round(Math.min(calculada, maxDiaAbs) * 10) / 10;
      dosePorTomada = Math.round((doseTotalDia / tomadas) * 10) / 10;
      passos.push(`Dose pediátrica: ${ped.dose_por_kg} UI/kg/dia`);
      passos.push(`Dose calculada: ${ped.dose_por_kg} × ${pesoKg} kg = ${calculada.toFixed(1)} UI/dia`);
    } else if (ped.calculo === 'dose_fixa') {
      // Dose fixa absoluta (não por kg) — dose_por_kg é o valor absoluto da dose
      fonte = 'pediatrica_fixa';
      doseTotalDia = Math.round(Math.min(ped.dose_por_kg, maxDiaAbs) * 10) / 10;
      limitado = ped.dose_por_kg > maxDiaAbs;
      dosePorTomada = Math.round((doseTotalDia / tomadas) * 10) / 10;
      passos.push(`Dose fixa pediátrica: ${ped.dose_por_kg} ${ped.unidade}/dia`);
    } else if (ped.calculo === 'mg/kg/dose') {
      fonte = 'pediatrica_mg_kg';
      // dose_por_kg é POR DOSE, não por dia
      const dosePorDoseCalc = Math.round(ped.dose_por_kg * pesoKg * 10) / 10;
      const totalDiaCalc = dosePorDoseCalc * tomadas;
      limitado = totalDiaCalc > maxDiaAbs;
      dosePorTomada = limitado ? Math.round((maxDiaAbs / tomadas) * 10) / 10 : dosePorDoseCalc;
      doseTotalDia = Math.round(Math.min(totalDiaCalc, maxDiaAbs) * 10) / 10;
      passos.push(`Dose pediátrica: ${ped.dose_por_kg} ${ped.unidade}/kg/dose`);
      passos.push(`Dose calculada: ${ped.dose_por_kg} × ${pesoKg} kg = ${dosePorDoseCalc.toFixed(1)} ${ped.unidade}/dose`);
    } else {
      // mg/kg/dia (padrão)
      fonte = 'pediatrica_mg_kg';
      const calculada = Math.round(ped.dose_por_kg * pesoKg * 10) / 10;
      limitado = calculada > maxDiaAbs;
      doseTotalDia = Math.round(Math.min(calculada, maxDiaAbs) * 10) / 10;
      dosePorTomada = Math.round((doseTotalDia / tomadas) * 10) / 10;
      passos.push(`Dose pediátrica: ${ped.dose_por_kg} ${ped.unidade}/kg/dia`);
      passos.push(`Dose calculada: ${ped.dose_por_kg} × ${pesoKg} kg = ${calculada.toFixed(1)} ${ped.unidade}/dia`);
    }

    if (fonte !== 'adulto_fixo') {
      if (limitado) {
        passos.push(`⚠ Excede dose máxima (${ped.max_dose_dia} ${ped.max_dose_dia_unidade}) → usando ${doseTotalDia} ${ped.unidade}/dia`);
        alertas.push(`⚠ Dose máxima aplicada: ${ped.max_dose_dia} ${ped.max_dose_dia_unidade}`);
      } else {
        passos.push(`✓ Dentro da dose máxima (${ped.max_dose_dia} ${ped.max_dose_dia_unidade})`);
      }
      const freqLabel = tomadas === 1 ? '1x/dia' : tomadas === 2 ? '12/12h' : tomadas === 3 ? '8/8h' : tomadas === 4 ? '6/6h' : `${tomadas}x/dia`;
      passos.push(`Divisão: ${doseTotalDia.toFixed(1)} ÷ ${tomadas} tomadas = ${dosePorTomada} ${doseUnidade}/dose (${freqLabel})`);
    }

    // Nota pediátrica extra (faixa etária / observações)
    if (drug.dose_pediatrica?.faixa_etaria) {
      passos.push(`ℹ ${drug.dose_pediatrica.faixa_etaria}`);
    }
  } else {
    // Dose adulto (inclui pediátrico sem dose_por_kg, ex: dose fixa por faixa / jatos)
    dosePorTomada = parseFloat(drug.dose_adulto.habitual) || 0;
    doseUnidade = drug.dose_adulto.unidade;
    tomadas = drug.dose_adulto.frequencias[0]?.includes('2x') ? 2 : drug.dose_adulto.frequencias[0]?.includes('3x') ? 3 : drug.dose_adulto.frequencias[0]?.includes('4x') ? 4 : 1;
    doseTotalDia = dosePorTomada * tomadas;
    fonte = 'adulto_fixo';
    passos.push(`Dose habitual: ${dosePorTomada} ${doseUnidade} — ${drug.dose_adulto.frequencias[0] ?? '1x/dia'}`);
    passos.push(`Máximo: ${drug.dose_adulto.max} ${doseUnidade}`);
    // Mostrar faixa pediátrica como nota quando há dados mas não são por kg
    if (profile.usar_dose_pediatrica && drug.dose_pediatrica?.faixa_etaria) {
      passos.push(`ℹ Posologia pediátrica (dose fixa/faixa): ${drug.dose_pediatrica.faixa_etaria}`);
    }
  }

  // Conversão para volume (se líquido) + gotas
  let volumePorTomada: number | undefined;
  let gotasPorTomada: number | undefined;
  if (conc.tipo === 'liquido' && conc.mg_por_mL && dosePorTomada > 0) {
    volumePorTomada = Math.round((dosePorTomada / conc.mg_por_mL) * 10) / 10;
    gotasPorTomada = Math.round(volumePorTomada * 20 * 10) / 10; // 1 mL = 20 macrogotas
    passos.push(`Volume: ${dosePorTomada} ${doseUnidade} ÷ ${conc.mg_por_mL} mg/mL = ${volumePorTomada} mL por dose`);
    passos.push(`Equivalente: ${volumePorTomada} mL × 20 = ${gotasPorTomada} gotas/dose`);
  }

  // Posologia sugerida
  const freqText = tomadas === 1 ? '1x/dia' : tomadas === 2 ? 'a cada 12 horas' : tomadas === 3 ? 'a cada 8 horas' : tomadas === 4 ? 'a cada 6 horas' : `${tomadas}x/dia`;
  const viaText = drug.dose_adulto.via;
  let posologia: string;
  if (volumePorTomada !== undefined) {
    posologia = `${volumePorTomada} mL ${viaText} ${freqText} (= ${dosePorTomada} ${doseUnidade}/dose)`;
  } else {
    posologia = `${dosePorTomada} ${doseUnidade} ${viaText} ${freqText}`;
  }

  passos.push(`→ POSOLOGIA: ${posologia}`);

  return {
    population: profile,
    dose_por_tomada: dosePorTomada,
    dose_unidade: doseUnidade,
    volume_por_tomada: volumePorTomada,
    gotas_por_tomada: gotasPorTomada,
    bsa_m2: bsaM2,
    frequencia: freqText,
    tomadas_dia: tomadas,
    dose_total_dia: Math.round(doseTotalDia * 10) / 10,
    posologia_sugerida: posologia,
    passo_a_passo: passos,
    alertas,
    ajuste_renal_texto: ajusteRenalTexto,
    ajuste_hepatico_texto: ajusteHepaticoTexto,
    limitado_por_dose_max: limitado,
    fonte,
  };
}
