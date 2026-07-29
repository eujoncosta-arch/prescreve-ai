// ============================================================
// PRESCREVE-AI — Motor de Cálculo de Doses
// CG (Cockcroft-Gault), Mosteller (BSA), mg/kg, conversões
// ============================================================

import { calcularBSA as _calcularBSACore } from './dosing-engine';
import type { FrequenciaDose, UnidadeDose } from './types';

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
  // RM-50: rejeita entradas fisiologicamente implausíveis em vez de produzir
  // um CrCl fabricado (ex.: idade negativa, creatinina negativa) — mesma
  // convenção de "não fabricar valor ausente/impossível" já usada em outros
  // motores clínicos do projeto.
  if (
    params.idade <= 0 || params.idade > 120 ||
    params.peso <= 0 || params.peso > 500 ||
    params.creatinina <= 0 || params.creatinina > 30 ||
    !Number.isFinite(params.idade) || !Number.isFinite(params.peso) || !Number.isFinite(params.creatinina)
  ) {
    return null;
  }

  const { idade, sexo, creatinina } = params;
  let peso = params.peso;

  // Cockcroft-Gault recomenda peso ideal (IBW) em obesos para evitar superestimativa do CrCl
  // IBW (Devine): Homem = 50 + 2,3 × (altura_cm − 152,4) / 2,54; Mulher = 45,5 + 2,3 × (altura_cm − 152,4) / 2,54
  let avisoObeso = '';
  if (params.altura) {
    const altCm = params.altura;
    const ibw = sexo === 'M'
      ? 50 + 2.3 * ((altCm - 152.4) / 2.54)
      : 45.5 + 2.3 * ((altCm - 152.4) / 2.54);
    if (params.peso > ibw * 1.2 && ibw > 0) {
      // Paciente obeso: usar peso ajustado = IBW + 0,4 × (peso real − IBW)
      const pesoAjustado = Math.round((ibw + 0.4 * (params.peso - ibw)) * 10) / 10;
      peso = pesoAjustado;
      avisoObeso = `⚠ Obesidade detectada (peso real ${params.peso} kg > IBW estimado ${Math.round(ibw)} kg). Usando peso ajustado (AdjBW = ${pesoAjustado} kg) conforme recomendação Cockcroft-Gault.`;
    }
  }

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

  const passos = [
    `Fórmula: CrCl = [(140 − idade) × peso × fator_sexo] / (72 × creatinina)`,
    `Idade: ${idade} anos | Peso utilizado: ${peso} kg | Creatinina: ${creatinina} mg/dL`,
    `Fator sexo: ${fatorSexo} (${sexo === 'F' ? 'Feminino × 0,85' : 'Masculino × 1,0'})`,
    `Cálculo: [(140 − ${idade}) × ${peso} × ${fatorSexo}] / (72 × ${creatinina})`,
    `= [${140 - idade} × ${peso} × ${fatorSexo}] / ${(72 * creatinina).toFixed(1)}`,
    `= ${((140 - idade) * peso * fatorSexo).toFixed(1)} / ${(72 * creatinina).toFixed(1)}`,
    `= ${crclRounded} mL/min → Estágio ${ckd_stage} (${interpretacao})`,
  ];
  if (avisoObeso) passos.unshift(avisoObeso);

  return {
    crcl: crclRounded,
    ckd_stage,
    interpretacao,
    formula: 'Cockcroft-Gault',
    passo_a_passo: passos,
  };
}

// ─── BSA — MOSTELLER ──────────────────────────────────────────

export function calcBSA(peso: number, altura: number): BSAResult {
  const bsaRounded = Math.round(_calcularBSACore(peso, altura) * 100) / 100;
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
  // RM-52 (RM41-006): `totalDia` já era o valor COM o teto aplicado
  // (`Math.min`), então a comparação `totalDia > doseBruta` era
  // matematicamente sempre falsa — o texto do passo a passo sempre
  // afirmava "sem ajuste necessário" mesmo quando a dose bruta excedia o
  // máximo e havia sido reduzida. A comparação agora usa a dose BRUTA
  // (antes do teto) contra o máximo, na ordem correta.
  const doseBruta = dosePerKg * peso;
  const totalDia = Math.min(doseBruta, maxDiaDose);
  const porTomada = totalDia / divisoes;
  const porTomadaR = Math.round(porTomada * 10) / 10;
  const totalR = Math.round(totalDia * 10) / 10;

  const passos = [
    `Dose prescrita: ${dosePerKg} ${unidade}/kg/dia`,
    `Peso do paciente: ${peso} kg`,
    `Dose total/dia = ${dosePerKg} × ${peso} = ${doseBruta.toFixed(1)} ${unidade}/dia`,
  ];

  if (doseBruta > maxDiaDose) {
    passos.push(`⚠ Dose calculada (${doseBruta.toFixed(1)}) > dose máxima (${maxDiaDose} ${unidade}) → usar ${maxDiaDose} ${unidade}/dia`);
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
  | 'mL_to_drops'    // mL → gotas (requer fator gotas/mL explícito da apresentação — nunca 20 assumido)
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
      // Correção UNIT-AUDIT-03 (auditoria RM-36 — médio): esta conversão
      // assumia 20 gotas/mL (macrogotas padrão) para QUALQUER líquido —
      // não universal, contra-gotas calibrados variam por apresentação.
      // `concentration` agora é reaproveitado como o fator gotas/mL
      // EXPLICITAMENTE validado da apresentação (nunca um padrão
      // assumido); sem ele, a conversão fica bloqueada.
      if (!concentration) {
        return {
          resultado: 0,
          unidade_resultado: 'gotas',
          passo_a_passo: [
            'Fator gotas/mL não informado para esta apresentação — conversão bloqueada.',
            'Nunca assumir 20 gotas/mL como padrão: contra-gotas calibrados variam por produto.',
          ],
        };
      }
      const drops = value * concentration;
      return {
        resultado: Math.round(drops * 10) / 10,
        unidade_resultado: 'gotas',
        passo_a_passo: [
          `Volume: ${value} mL`,
          `Fator declarado nesta apresentação: 1 mL = ${concentration} gotas`,
          `Gotas = ${value} × ${concentration} = ${Math.round(drops * 10) / 10} gotas`,
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
  // RM-52 (RM41-009): a versão anterior tinha `if (idadeMeses < 1) return
  // 'Neonato prematuro...'` — conflacionava idade CRONOLÓGICA (< 1 mês de
  // vida) com PREMATURIDADE (conceito GESTACIONAL: nascido antes de 37
  // semanas), que esta função não recebe como parâmetro. Um recém-nascido
  // a termo de 3 semanas de vida seria incorretamente rotulado
  // "prematuro". O branch seguinte (`<= 1`) também era código morto: como
  // `< 1` já consumia todo o intervalo [0, 1), `<= 1` só era alcançável
  // para o valor exato 1.0. Sem chamadores hoje — corrigido o texto para
  // não fazer essa afirmação clínica indevida.
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

// RM-52 (RM41-007): corte de "neonato" definido aqui (`idadeAnos < 0.083`,
// equivalente a ~30,3 dias) divergia do corte usado em `dosing-engine.ts`
// (`idade_dias < 28`) — um paciente de 29 dias era classificado como
// "neonato" neste motor e "lactente" no outro, com potencial divergência
// de regra de dose/contraindicação para o MESMO paciente dependendo de
// qual motor a tela consultasse. Unificado para exatamente 28/365 anos.
const CORTE_NEONATO_ANOS = 28 / 365;

export function classifyPopulation(idadeAnos: number): PopulationProfile {
  if (idadeAnos < CORTE_NEONATO_ANOS) return { population: 'neonato', label: 'Neonato (< 28 dias)', usar_dose_pediatrica: true, usar_dose_por_kg: true, alerta_beers: false };
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
  /**
   * Correção UNIT-AUDIT-03 (auditoria RM-36 — médio): fator mg/gota, só
   * preenchido quando a PRÓPRIA STRING de concentração declara
   * explicitamente esse fator (ex.: "1 mg/gota"). NUNCA inferido a partir
   * de mg/mL — diferentes apresentações usam contra-gotas calibrados
   * diferentes (20 gotas/mL não é universal); sem o fator declarado, a
   * conversão para gotas fica indisponível, nunca assumida.
   */
  mg_por_gota?: number;
  unidade_texto: string;    // "comprimido", "mL", "jato", etc.
  texto_original: string;
}

export function parseConcentration(texto: string): ParsedConcentration {
  const t = texto.toLowerCase().trim();

  // Fator gotas EXPLÍCITO na própria apresentação — único caso em que a
  // conversão para gotas é permitida (ver mg_por_gota acima).
  const gotaDireta = t.match(/(\d+[\.,]?\d*)\s*mg\s*\/\s*gota/i);
  const gotaIgual = t.match(/1\s*gota\s*=\s*(\d+[\.,]?\d*)\s*mg/i);
  const mgPorGota = gotaDireta
    ? parseFloat(gotaDireta[1].replace(',', '.'))
    : gotaIgual
    ? parseFloat(gotaIgual[1].replace(',', '.'))
    : undefined;
  if (mgPorGota !== undefined) {
    return {
      tipo: 'liquido',
      mg_por_unidade: mgPorGota,
      mg_por_gota: mgPorGota,
      unidade_texto: 'gota',
      texto_original: texto,
    };
  }

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

  // mcg/jato (inalatório nasal/pulmonar) — exige 'jato' ou 'spray'; mcg sozinho é insuficiente
  // BUG CORRIGIDO: t.includes('mcg') era sempre true após o match, classificando tablets mcg como inalatório
  const inalatorio = t.match(/(\d+[\.,]?\d*)\s*mcg/i);
  if (inalatorio && (t.includes('jato') || t.includes('spray') || t.includes('/dose') || t.includes('inalacao'))) {
    const mcg = parseFloat(inalatorio[1].replace(',', '.'));
    return { tipo: 'inalatorio', mg_por_unidade: mcg / 1000, unidade_texto: 'jato', texto_original: texto };
  }

  // mcg sólido (ex: levotiroxina 50 mcg, vitamina D 1000 UI etc.) — não é inalatório
  const solidoMcg = t.match(/(\d+[\.,]?\d*)\s*mcg/i);
  if (solidoMcg && !t.includes('mg')) {
    const mcg = parseFloat(solidoMcg[1].replace(',', '.'));
    return { tipo: 'solido', mg_por_unidade: mcg / 1000, unidade_texto: 'comprimido', texto_original: texto };
  }

  // Sólido simples: "50 mg", "500 mg"
  const solido = t.match(/(\d+[\.,]?\d*)\s*mg/i);
  if (solido) {
    const mg = parseFloat(solido[1].replace(',', '.'));
    return { tipo: 'solido', mg_por_unidade: mg, unidade_texto: 'comprimido', texto_original: texto };
  }

  return { tipo: 'desconhecido', mg_por_unidade: 0, unidade_texto: '', texto_original: texto };
}

// ─── PARSER ESTRUTURADO DE FREQUÊNCIA ─────────────────────────

/**
 * Resolução do risco de fallback silencioso de frequência (auditoria
 * RM-36): `calcFullDose` inferia o número de tomadas/dia checando
 * substrings soltas (`freqStr.includes('2x')`, `.includes('12/12h')` etc.)
 * contra o texto livre de `dose_adulto.frequencias[0]`. Qualquer string que
 * não batesse em NENHUM desses `.includes()` caía silenciosamente no
 * `else` final → `tomadas = 1` — inclusive para textos genuinamente
 * multi-tomada (ex.: variantes de acentuação corrompida como "1Ã—/dia",
 * presentes de fato na base) ou frequências não-diárias/PRN/contínuas, que
 * NUNCA deveriam ser tratadas como "1 vez ao dia" para fins de multiplicar
 * a dose total diária. Levantamento contra toda a base farmacológica
 * (`grep -oP "frequencias:\s*\[[^\]]*\]"` em todos os `pharma-database-*.ts`)
 * encontrou o texto livre real dessa string cobrindo, entre outras formas:
 * "Nx/dia", "N–Mx/dia" (faixa), "N/Nh" (ex. "8/8h"), "qNh"/"a cada Nh",
 * "qN–Mh" (faixa), "dose única", periodicidade não diária (semanal/
 * mensal/"a cada N dias"), uso contínuo/infusão contínua, PRN/SOS/
 * "conforme necessidade", e um número relevante de esquemas com múltiplas
 * vias/regimes combinados no mesmo campo (separados por "|" ou "ou").
 *
 * `parseFrequencia()` substitui o fallback por um classificador
 * estruturado: toda saída declara explicitamente se `tomadasDia` é
 * seguro para multiplicar a dose diária (`calculavel`). Quando não é —
 * PRN, uso contínuo, esquema variável/ambíguo, ou texto não reconhecido —
 * `tomadasDia` é `null`, NUNCA um número assumido; `calcFullDose` (abaixo)
 * bloqueia o cálculo da dose total diária nesses casos e emite um alerta
 * crítico exigindo confirmação explícita, em vez de calcular silenciosamente
 * com uma frequência adivinhada.
 */
export type FrequenciaTipo =
  | 'fixa_diaria'      // "Nx/dia" determinístico
  | 'intervalo_horas'  // "N/Nh" / "qNh" / "a cada Nh" — determinístico, tomadasDia = round(24/N)
  | 'unica'            // dose única / administração isolada
  | 'nao_diaria'       // periodicidade semanal/mensal/"a cada N dias" — 1 administração por evento, não um múltiplo diário
  | 'continua'         // uso/infusão contínua — sem tomadas discretas
  | 'prn'              // PRN/SOS/"conforme necessidade"/resgate — sem frequência fixa
  | 'variavel'         // faixa ("3–4x/dia", "qN–Mh") ou múltiplos regimes combinados ("|", " ou ") — requer confirmação explícita
  | 'nao_reconhecida'; // texto não estruturado, não mapeado a nenhum padrão conhecido

export interface FrequenciaParseada {
  tipo: FrequenciaTipo;
  /**
   * Número de administrações por dia — SOMENTE quando determinável com
   * segurança (`calculavel === true`). `null` em todos os outros casos;
   * nunca um valor assumido/adivinhado.
   */
  tomadasDia: number | null;
  intervaloHoras?: number;
  tomadasFaixa?: [number, number]; // presente só quando tipo === 'variavel' e a faixa é conhecida
  calculavel: boolean;      // true SOMENTE quando tomadasDia pode ser usado com segurança para multiplicar a dose diária
  requerConfirmacao: boolean; // true quando um humano precisa decidir explicitamente antes de calcular a dose total
  motivo?: string;           // explicação legível quando não calculável
  texto_original: string;
}

function stripAccentsFreq(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function parseFrequencia(texto: string): FrequenciaParseada {
  const original = texto ?? '';
  const t = stripAccentsFreq(original.toLowerCase().trim());

  if (!t) {
    return {
      tipo: 'nao_reconhecida', tomadasDia: null, calculavel: false, requerConfirmacao: true,
      motivo: 'Frequência não informada — confirme manualmente o número de tomadas/dia.',
      texto_original: original,
    };
  }

  // PRN / SOS / "conforme necessidade" / resgate / titulação
  if (/\bsos\b|\bprn\b|conforme necessidade|conforme resposta|conforme demanda|se necessari|a criterio|ate efeito|titula(cao|do)|repetir conforme/.test(t)) {
    return {
      tipo: 'prn', tomadasDia: null, calculavel: false, requerConfirmacao: true,
      motivo: 'Frequência sob demanda (PRN/SOS) — não há um número fixo de tomadas/dia para calcular a dose total diária automaticamente.',
      texto_original: original,
    };
  }

  // Uso contínuo / infusão contínua
  if (/continu/.test(t)) {
    return {
      tipo: 'continua', tomadasDia: null, calculavel: false, requerConfirmacao: true,
      motivo: 'Uso/infusão contínua — não há "tomadas discretas por dia" a multiplicar; a taxa de infusão deve ser calculada separadamente.',
      texto_original: original,
    };
  }

  // Dose única / administração isolada
  if (/dose unica|bolus unico|administra[cç]?[aã]o unica/.test(t)) {
    return { tipo: 'unica', tomadasDia: 1, calculavel: true, requerConfirmacao: false, texto_original: original };
  }

  // Múltiplos regimes/vias combinados no mesmo campo ("|" ou " ou " como
  // separador) — ambíguo por construção; nunca escolher um lado
  // silenciosamente.
  if (t.includes('|') || / ou /.test(t)) {
    return {
      tipo: 'variavel', tomadasDia: null, calculavel: false, requerConfirmacao: true,
      motivo: 'Campo combina múltiplos regimes/vias possíveis — requer confirmação explícita de qual se aplica; nunca escolhido automaticamente.',
      texto_original: original,
    };
  }

  // Periodicidade NÃO diária: semanal, mensal, "a cada N dias/semanas/meses"
  if (/\/semana|\/mes\b|a cada\s*\d+\s*semanas?|a cada\s*\d+\s*meses|a cada\s*\d+\s*dias|q\s*\d+\s*semanas?/.test(t)) {
    return {
      tipo: 'nao_diaria', tomadasDia: 1, calculavel: true, requerConfirmacao: false,
      motivo: 'Periodicidade não diária (semanal/mensal/a cada N dias) — representa 1 administração por evento, não um múltiplo diário.',
      texto_original: original,
    };
  }

  // Faixa "N–Mx/dia" (ex.: "3-4x/dia") — checar ANTES do padrão fixo, para
  // não ler apenas o segundo número de uma faixa como se fosse fixo.
  const rangeXDia = t.match(/(\d+)\s*[-–—]\s*(\d+)\s*[x×]\s*\/\s*dia/);
  if (rangeXDia) {
    const min = parseInt(rangeXDia[1], 10);
    const max = parseInt(rangeXDia[2], 10);
    return {
      tipo: 'variavel', tomadasDia: null, tomadasFaixa: [min, max], calculavel: false, requerConfirmacao: true,
      motivo: `Frequência variável (${min}–${max}x/dia) — requer confirmação explícita de qual valor usar; nunca assumido automaticamente.`,
      texto_original: original,
    };
  }

  // Fixo "Nx/dia"
  const fixaXDia = t.match(/(\d+)\s*[x×]\s*\/\s*dia/);
  if (fixaXDia) {
    const n = parseInt(fixaXDia[1], 10);
    if (n >= 1 && n <= 12) {
      return { tipo: 'fixa_diaria', tomadasDia: n, calculavel: true, requerConfirmacao: false, texto_original: original };
    }
  }

  // Faixa de intervalo em horas: "a cada 4-6h", "q4-6h", "q8–12h"
  const rangeHoras = t.match(/(?:a cada\s*|q\s*)(\d+)\s*[-–—]\s*(\d+)\s*h/);
  if (rangeHoras) {
    const min = parseInt(rangeHoras[1], 10);
    const max = parseInt(rangeHoras[2], 10);
    return {
      tipo: 'variavel', tomadasDia: null, tomadasFaixa: [Math.round(24 / max), Math.round(24 / min)], calculavel: false, requerConfirmacao: true,
      motivo: `Intervalo variável (a cada ${min}–${max}h) — requer confirmação explícita de qual valor usar; nunca assumido automaticamente.`,
      texto_original: original,
    };
  }

  // Intervalo fixo "N/Nh" (ex.: "8/8h", "12/12h", "6/6h", "4/4h")
  const nnH = t.match(/(\d+)\s*\/\s*(\d+)\s*h/);
  if (nnH && nnH[1] === nnH[2]) {
    const intervalo = parseInt(nnH[1], 10);
    if (intervalo > 0 && intervalo <= 24) {
      const tomadas = Math.round(24 / intervalo);
      return { tipo: 'intervalo_horas', tomadasDia: tomadas, intervaloHoras: intervalo, calculavel: true, requerConfirmacao: false, texto_original: original };
    }
  }

  // Intervalo fixo "a cada Nh" / "qNh"
  const horaFixa = t.match(/(?:a cada\s*|q\s*)(\d+)\s*h\b/);
  if (horaFixa) {
    const intervalo = parseInt(horaFixa[1], 10);
    if (intervalo > 0 && intervalo <= 24) {
      const tomadas = Math.round(24 / intervalo);
      return { tipo: 'intervalo_horas', tomadasDia: tomadas, intervaloHoras: intervalo, calculavel: true, requerConfirmacao: false, texto_original: original };
    }
  }

  // Texto não estruturado / não mapeado — NUNCA assume 1 tomada.
  return {
    tipo: 'nao_reconhecida', tomadasDia: null, calculavel: false, requerConfirmacao: true,
    motivo: `Frequência "${original}" não corresponde a nenhum padrão estruturado reconhecido — confirme manualmente o número de tomadas/dia antes de calcular a dose total.`,
    texto_original: original,
  };
}

/**
 * Mapeia o texto livre de frequência (ex.: "8/8h", "2x/dia") — como
 * ainda armazenado em `DrugDose.frequencia` nas recomendações do motor
 * terapêutico — para o contrato de frequência ESTRUTURADO exigido pelo
 * backend (`FrequenciaDose`, espelho de `consulta.dto.ts`). Reaproveita
 * `parseFrequencia()` (mesma classificação usada em `calcFullDose`) para
 * nunca inventar uma frequência: quando o texto não mapeia
 * deterministicamente para uma das opções fixas do contrato, cai em
 * `'outro'` com o texto original preservado em `frequencia_detalhe` —
 * nunca descartado, nunca a única representação da dose.
 */
export function mapFrequenciaParaContrato(freqTexto: string): { frequencia: FrequenciaDose; frequencia_detalhe?: string } {
  const parsed = parseFrequencia(freqTexto);

  if (parsed.tipo === 'fixa_diaria' && parsed.tomadasDia !== null) {
    if (parsed.tomadasDia === 1) return { frequencia: '1x/dia' };
    if (parsed.tomadasDia === 2) return { frequencia: '2x/dia' };
    if (parsed.tomadasDia === 3) return { frequencia: '3x/dia' };
    if (parsed.tomadasDia === 4) return { frequencia: '4x/dia' };
    return { frequencia: 'outro', frequencia_detalhe: freqTexto };
  }

  if (parsed.tipo === 'intervalo_horas' && parsed.intervaloHoras !== undefined) {
    if (parsed.intervaloHoras === 4) return { frequencia: 'a_cada_4h' };
    if (parsed.intervaloHoras === 6) return { frequencia: 'a_cada_6h' };
    if (parsed.intervaloHoras === 8) return { frequencia: 'a_cada_8h' };
    if (parsed.intervaloHoras === 12) return { frequencia: 'a_cada_12h' };
    return { frequencia: 'outro', frequencia_detalhe: freqTexto };
  }

  if (parsed.tipo === 'unica') return { frequencia: 'dose_unica' };
  if (parsed.tipo === 'continua') return { frequencia: 'uso_continuo' };
  if (parsed.tipo === 'prn') return { frequencia: 'sos' };
  if (parsed.tipo === 'nao_diaria') return { frequencia: 'nao_diaria', frequencia_detalhe: freqTexto };

  // 'variavel' / 'nao_reconhecida' — nunca escolhido silenciosamente;
  // texto original preservado como complemento obrigatório.
  return { frequencia: 'outro', frequencia_detalhe: freqTexto };
}

/**
 * Mapeia o texto livre de unidade (ex.: "mg", "comprimidos") — como
 * ainda armazenado em `DrugDose.unidade` — para o contrato de unidade
 * ESTRUTURADO do backend (`UnidadeDose`). Só reconhece unidades SIMPLES
 * e inequívocas; strings compostas (ex.: "mg/kg/dia", "mcg/kg/min" — que
 * descrevem TIPO de regime de dose, não apenas a unidade) retornam
 * `null` deliberadamente. Tentar decompor essas strings automaticamente
 * arriscaria classificar errado um regime de infusão contínua por peso
 * como uma dose fixa simples — exatamente o tipo de erro silencioso que
 * este contrato estruturado existe para eliminar. Quando `null`, o
 * chamador deve exigir confirmação manual do médico antes de sincronizar
 * a dose com o backend, nunca adivinhar.
 */
export function mapUnidadeParaContrato(unidadeTexto: string): UnidadeDose | null {
  const UNIDADES_SIMPLES: Record<string, UnidadeDose> = {
    mg: 'mg',
    mcg: 'mcg',
    g: 'g',
    ml: 'mL',
    gota: 'gotas',
    gotas: 'gotas',
    ui: 'UI',
    comprimido: 'comprimido',
    comprimidos: 'comprimido',
    capsula: 'capsula',
    capsulas: 'capsula',
    sache: 'sache',
    saches: 'sache',
    ampola: 'ampola',
    ampolas: 'ampola',
    jato: 'jato',
    jatos: 'jato',
    aplicacao: 'aplicacao',
    aplicacoes: 'aplicacao',
  };
  const chave = unidadeTexto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
  return UNIDADES_SIMPLES[chave] ?? null;
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
  gotas_por_tomada?: number;       // só calculado quando a apresentação declara um fator mg/gota explícito (ver ParsedConcentration.mg_por_gota) — nunca um padrão assumido de 20 gotas/mL
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
  let bloqueadoPorAlturaAusente = false;

  if (usarPediatrica && drug.dose_pediatrica) {
    const ped = drug.dose_pediatrica;
    const maxDiaAbs = maxAbsoluto(ped);
    doseUnidade = ped.unidade;
    tomadas = ped.frequencia_divisoes;

    if (ped.calculo === 'mg/m²' || ped.calculo === 'mcg/m²') {
      // Dose por superfície corporal — requer altura
      if (!alturaFinal || alturaFinal <= 0) {
        // Correção UNIT-AUDIT-01 (auditoria RM-36 — crítico): sem altura, o
        // código antes substituía SILENCIOSAMENTE a dose pediátrica por
        // superfície corporal (mg/m² — usada em quimioterápicos) pela DOSE
        // ADULTA INTEIRA, com um alerta prefixado "⚠" (aviso, não crítico).
        // `DoseCalcCard.tsx` só desabilita o botão "Aplicar" quando existe
        // um alerta prefixado "🚨" (`hasCritical`) — um alerta "⚠" mantinha
        // o botão HABILITADO, permitindo ao médico aplicar uma dose adulta
        // de quimioterápico em uma criança com um clique. Corrigido para
        // NUNCA calcular uma dose substituta: bloqueia o cálculo e emite um
        // alerta 🚨 (crítico), desabilitando o botão de aplicar.
        passos.push(`🚨 Cálculo ${ped.calculo}: altura é OBRIGATÓRIA para calcular a superfície corporal — dose não pode ser calculada sem ela.`);
        alertas.push(`🚨 BLOQUEADO: informe a altura do paciente para calcular a dose por superfície corporal (${ped.calculo}). Nunca aplicar a dose adulta em substituição.`);
        dosePorTomada = 0;
        doseUnidade = ped.unidade;
        tomadas = ped.frequencia_divisoes;
        doseTotalDia = 0;
        fonte = 'pediatrica_mg_m2';
        limitado = true;
        bloqueadoPorAlturaAusente = true;
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

    if (!bloqueadoPorAlturaAusente) {
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
    fonte = 'adulto_fixo';

    const freqStr = drug.dose_adulto.frequencias[0] ?? '';
    const freqParsed = parseFrequencia(freqStr);

    if (freqParsed.calculavel && freqParsed.tomadasDia !== null) {
      tomadas = freqParsed.tomadasDia;
      doseTotalDia = dosePorTomada * tomadas;
      passos.push(`Dose habitual: ${dosePorTomada} ${doseUnidade} — ${freqStr || '1x/dia'}`);
      passos.push(`Máximo: ${drug.dose_adulto.max} ${doseUnidade}`);
    } else {
      // Resolução do risco de fallback silencioso de frequência (auditoria
      // RM-36): NUNCA assumir tomadas=1 quando a frequência não pode ser
      // determinada com segurança (PRN, uso contínuo, esquema variável/
      // ambíguo ou texto não reconhecido) — bloquear o cálculo da dose
      // TOTAL diária e exigir confirmação humana explícita, em vez de
      // arriscar subestimar (ou superestimar) a dose real do paciente.
      tomadas = 0;
      doseTotalDia = 0;
      limitado = true;
      passos.push(`🚨 Frequência "${freqStr || '(não informada)'}" não pôde ser determinada automaticamente (tipo: ${freqParsed.tipo}) — dose TOTAL DIÁRIA NÃO calculada.`);
      if (freqParsed.motivo) passos.push(freqParsed.motivo);
      passos.push(`Dose por administração: ${dosePorTomada} ${doseUnidade} (frequência a confirmar antes de aplicar)`);
      passos.push(`Máximo: ${drug.dose_adulto.max} ${doseUnidade}`);
      alertas.push(`🚨 BLOQUEADO: confirme manualmente a frequência de "${drug.molecula}" (frequência cadastrada: "${freqStr || 'não informada'}") antes de calcular/aplicar a dose total diária. Nunca assumir 1x/dia por padrão.`);
    }

    // Mostrar faixa pediátrica como nota quando há dados mas não são por kg
    if (profile.usar_dose_pediatrica && drug.dose_pediatrica?.faixa_etaria) {
      passos.push(`ℹ Posologia pediátrica (dose fixa/faixa): ${drug.dose_pediatrica.faixa_etaria}`);
    }
  }

  // Conversão para volume (se líquido) + gotas
  //
  // Correção UNIT-AUDIT-03 (auditoria RM-36 — médio): a conversão de gotas
  // era calculada para QUALQUER formulação líquida (`mL × 20`), assumindo
  // 20 gotas/mL (macrogotas padrão) universalmente — mas contra-gotas
  // calibrados variam por produto/fabricante, e suspensões/xaropes comuns
  // (ex.: amoxicilina 250mg/5mL) nunca são administrados por contagem de
  // gotas. Corrigido: volume em mL é calculado normalmente para qualquer
  // líquido (sempre seguro/universal); gotas só são calculadas quando a
  // PRÓPRIA apresentação declara um fator mg/gota explícito
  // (`conc.mg_por_gota` — ver `parseConcentration`) — nunca inferido a
  // partir do volume em mL.
  let volumePorTomada: number | undefined;
  let gotasPorTomada: number | undefined;
  if (conc.tipo === 'liquido' && conc.mg_por_mL && dosePorTomada > 0) {
    volumePorTomada = Math.round((dosePorTomada / conc.mg_por_mL) * 10) / 10;
    passos.push(`Volume: ${dosePorTomada} ${doseUnidade} ÷ ${conc.mg_por_mL} mg/mL = ${volumePorTomada} mL por dose`);
  }
  if (conc.mg_por_gota && dosePorTomada > 0) {
    gotasPorTomada = Math.round((dosePorTomada / conc.mg_por_gota) * 10) / 10;
    passos.push(`Gotas: ${dosePorTomada} ${doseUnidade} ÷ ${conc.mg_por_gota} mg/gota = ${gotasPorTomada} gotas por dose (fator declarado nesta apresentação — não estimado)`);
  }

  // Posologia sugerida
  // tomadas === 0 é o sentinela de "frequência não calculável" (ver bloco
  // de dose adulto acima) — nunca rotulado como "0x/dia", que induziria o
  // leitor a pensar que uma frequência real foi determinada.
  const freqText = tomadas === 0 ? 'frequência a confirmar' : tomadas === 1 ? '1x/dia' : tomadas === 2 ? 'a cada 12 horas' : tomadas === 3 ? 'a cada 8 horas' : tomadas === 4 ? 'a cada 6 horas' : `${tomadas}x/dia`;
  const viaText = drug.dose_adulto.via;
  let posologia: string;
  if (tomadas === 0) {
    posologia = `⚠ ${dosePorTomada} ${doseUnidade} ${viaText} por administração — frequência não determinada automaticamente, confirme manualmente antes de aplicar`;
  } else if (volumePorTomada !== undefined) {
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
