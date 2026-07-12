// ============================================================
// PRESCREVE-AI — Motor de Cálculo Pediátrico (Phase 21.9)
// Doses mg/kg · mg/m² · Neonatal · Prematuro · Formulações
// ============================================================

// ─── TIPOS ────────────────────────────────────────────────────

export interface PediatricPatient {
  pesoKg: number;
  alturaCm?: number;
  idadeMeses: number;                    // idade cronológica
  sexo?: 'M' | 'F';
  idadeGestacionalSemanas?: number;      // IG ao nascimento (prematuros)
  idadePostNatalDias?: number;           // dias de vida pós-nascimento
  creatininaUmolL?: number;             // para ajuste renal pediátrico
  superficieCorporal?: number;          // m² — calculado se não fornecido
}

export interface PediatricDoseResult {
  drugId: string;
  drugName: string;
  indicacao?: string;
  doseUnitariaMg: number | null;        // dose calculada em mg
  doseUnitariaTexto: string;            // ex: "150 mg/dose"
  frequenciaTexto: string;              // ex: "a cada 8h"
  doseTotalDiaMg: number | null;
  doseTotalDiaTexto: string;
  doseMaxPermitida: string;
  formulacaoRecomendada: string;        // gotas | suspensão | comprimido | xarope
  concentracaoComum: string;            // ex: "250 mg/5 mL"
  volumeCalculado?: string;             // ex: "3 mL por dose"
  alertas: string[];
  idadeMinima: string;
  ajusteEspecial?: string;
  fonte: string;
}

export interface NeonatalDoseResult {
  drugName: string;
  doseTexto: string;
  viaAdministracao: string;
  frequencia: string;
  alertasCriticos: string[];
  monitoramento: string[];
}

export interface IdadeCorrigida {
  semanasCorrigidas: number;
  mesesCorrigidos: number;
  descricao: string;
  ehPrematuro: boolean;
  classificacao: 'termo' | 'prematuro_tardio' | 'prematuro_moderado' | 'prematuro_extremo' | 'micro_prematuro';
}

// ─── CALCULADORA BSA (Mosteller) ──────────────────────────────
export function calcBSA(pesoKg: number, alturaCm: number): number {
  return Math.sqrt((pesoKg * alturaCm) / 3600);
}

// BSA por DuBois (alternativa usada em oncologia)
export function calcBSADuBois(pesoKg: number, alturaCm: number): number {
  return 0.007184 * Math.pow(alturaCm, 0.725) * Math.pow(pesoKg, 0.425);
}

// ─── CALCULADORA DE IDADE CORRIGIDA (PREMATUROS) ──────────────
export function calcIdadeCorrigida(
  igSemanas: number,
  idadePostNatalDias: number,
): IdadeCorrigida {
  const semanasPosNatal = idadePostNatalDias / 7;
  const idadeConcepcionalSemanas = igSemanas + semanasPosNatal;
  const semanasCorrigidas = Math.max(0, idadeConcepcionalSemanas - 40);
  const mesesCorrigidos = Math.floor(semanasCorrigidas / 4.33);

  let classificacao: IdadeCorrigida['classificacao'];
  if (igSemanas >= 37) classificacao = 'termo';
  else if (igSemanas >= 34) classificacao = 'prematuro_tardio';
  else if (igSemanas >= 28) classificacao = 'prematuro_moderado';
  else if (igSemanas >= 24) classificacao = 'prematuro_extremo';
  else classificacao = 'micro_prematuro';

  const descricao = igSemanas < 37
    ? `IG ${igSemanas}sem + ${idadePostNatalDias}d vida → Idade corrigida: ${Math.floor(semanasCorrigidas)}sem (${mesesCorrigidos} meses)`
    : `Recém-nascido a termo — usar idade cronológica`;

  return {
    semanasCorrigidas,
    mesesCorrigidos,
    descricao,
    ehPrematuro: igSemanas < 37,
    classificacao,
  };
}

// ─── CLEARANCE DE CREATININA PEDIÁTRICO (Schwartz) ───────────
export function calcClCrSchwartz(alturaCm: number, creatininaMgdL: number, idadeMeses: number): number {
  const k = idadeMeses < 12 ? 0.33 : idadeMeses <= 192 ? 0.55 : 0.70;
  return (k * alturaCm) / creatininaMgdL;
}

// ─── BANCO DE DOSES PEDIÁTRICAS ───────────────────────────────

export interface PediatricDoseEntry {
  drugId: string;
  drugName: string;
  indicacoes: {
    nome: string;
    doseMgKg?: number;          // mg/kg/dose
    doseMgKgDia?: number;       // mg/kg/DIA (dividir pelas tomadas)
    doseMcgKg?: number;         // mcg/kg/dose
    doseMgM2?: number;          // mg/m²/dose
    doseFixa?: { [faixaKg: string]: number }; // dose fixa por peso
    frequencia: string;
    divisoes?: number;          // nº de tomadas/dia se doseMgKgDia
    maxDoseMg?: number;
    maxDoseMgKgDia?: number;
    idadeMinMeses?: number;
    idadeMaxMeses?: number;
    instrucoes?: string;
    alertas?: string[];
  }[];
  formulacoes: {
    faixaKg?: [number, number];
    faixaMeses?: [number, number];
    forma: string;
    concentracao: string;
    instrucoes?: string;
  }[];
  contraindPediatrica?: string[];
  fontes: string[];
}

export const PEDIATRIC_DOSES: PediatricDoseEntry[] = [
  // ── ANALGÉSICOS / ANTIPIRÉTICOS ─────────────────────────────
  {
    drugId: 'paracetamol',
    drugName: 'Paracetamol',
    indicacoes: [{
      nome: 'Febre e dor',
      doseMgKg: 15, frequencia: 'a cada 4–6h', divisoes: 4,
      maxDoseMg: 1000, maxDoseMgKgDia: 75,
      idadeMinMeses: 0,
      instrucoes: 'RN a termo: 10–15 mg/kg/dose 6/6h. Lactente: 10–15 mg/kg/dose 4–6h. Máx 5 doses/24h.',
      alertas: ['Verificar outros medicamentos com paracetamol (resfriados, xaropes)', 'Hepatite: máx 40 mg/kg/dia'],
    }],
    formulacoes: [
      { faixaKg: [0, 10], forma: 'Gotas', concentracao: '200 mg/mL (1 gota = 10 mg)', instrucoes: '1 gota/kg/dose' },
      { faixaKg: [10, 30], forma: 'Solução oral / Xarope', concentracao: '160 mg/5 mL', instrucoes: 'Medir com seringa graduada' },
      { faixaKg: [30, 999], forma: 'Comprimido', concentracao: '500 mg ou 750 mg' },
    ],
    fontes: ['SBP 2023', 'Nelson Textbook 21ª ed.'],
  },
  {
    drugId: 'dipirona',
    drugName: 'Dipirona',
    indicacoes: [{
      nome: 'Febre e dor',
      doseMgKg: 15, frequencia: 'a cada 6h', divisoes: 4,
      maxDoseMg: 1000, maxDoseMgKgDia: 60,
      idadeMinMeses: 3,
      instrucoes: 'CONTRAINDICADA < 3 meses. 1 gota/kg/dose (gotas 500 mg/mL = 25 mg/gota). Máx 4 doses/dia.',
      alertas: ['Agranulocitose: monitorar se uso prolongado', 'Disponibilidade restrita em vários países'],
    }],
    formulacoes: [
      { faixaKg: [0, 15], forma: 'Gotas', concentracao: '500 mg/mL (1 gota = 25 mg)', instrucoes: '1 gota/kg/dose (máx 20 gotas)' },
      { faixaKg: [15, 40], forma: 'Solução oral', concentracao: '500 mg/mL' },
      { faixaKg: [40, 999], forma: 'Comprimido', concentracao: '500 mg' },
    ],
    fontes: ['SBP 2023'],
  },
  {
    drugId: 'ibuprofeno',
    drugName: 'Ibuprofeno',
    indicacoes: [
      {
        nome: 'Febre',
        doseMgKg: 5, frequencia: 'a cada 6–8h', divisoes: 3,
        maxDoseMg: 400, maxDoseMgKgDia: 40,
        idadeMinMeses: 6,
        instrucoes: 'Febre alta refratária: até 10 mg/kg/dose. Preferir paracetamol em < 6 meses. CONTRAINDICADO < 3 meses.',
        alertas: ['Nefrotoxicidade em desidratação', 'Risco GI — usar com alimento', 'Evitar em varicela (fasceíte necrotizante)'],
      },
      {
        nome: 'Dor leve a moderada',
        doseMgKg: 7.5, frequencia: 'a cada 6–8h', divisoes: 3,
        maxDoseMg: 400, maxDoseMgKgDia: 40,
        idadeMinMeses: 6,
      },
      {
        nome: 'Artrite juvenil idiopática',
        doseMgKgDia: 30, frequencia: '3–4×/dia', divisoes: 4,
        maxDoseMg: 800, maxDoseMgKgDia: 40,
        idadeMinMeses: 12,
        instrucoes: 'AJI: 30–40 mg/kg/dia em 3–4 doses. Uso especializado.',
      },
      {
        nome: 'Fechamento de canal arterial (neonatal)',
        doseMgKg: 10, frequencia: 'D1: 10 mg/kg IV → D2: 5 mg/kg → D3: 5 mg/kg',
        idadeMinMeses: 0, idadeMaxMeses: 1,
        instrucoes: 'USO IV EM NEONATOS (fechamento de PCA): ibuprofeno IV — protocolo NICU. Via IV ≠ VO.',
        alertas: ['Uso neonatal IV restrito a NICU', 'Monitorar função renal', 'Oligúria: suspender'],
      },
    ],
    formulacoes: [
      { faixaKg: [5, 10], forma: 'Gotas', concentracao: '50 mg/mL (1 gota = 2,5 mg)', instrucoes: '2 gotas/kg/dose' },
      { faixaKg: [10, 30], forma: 'Suspensão oral', concentracao: '100 mg/5 mL ou 200 mg/5 mL', instrucoes: 'Agitar bem. Medir com seringa.' },
      { faixaKg: [30, 999], forma: 'Comprimido', concentracao: '200 mg ou 400 mg' },
    ],
    contraindPediatrica: ['< 3 meses', 'DRC', 'Desidratação grave', 'Varicela ativa', 'Dengue'],
    fontes: ['SBP 2023', 'Nelson 21ª ed.', 'FDA Labeling'],
  },

  // ── ANTIBIÓTICOS ─────────────────────────────────────────────
  {
    drugId: 'amoxicilina',
    drugName: 'Amoxicilina',
    indicacoes: [
      {
        nome: 'Otite média aguda / Rinosinusite / IVA',
        doseMgKgDia: 50, frequencia: '12/12h', divisoes: 2,
        maxDoseMg: 500, maxDoseMgKgDia: 90,
        idadeMinMeses: 1,
        instrucoes: 'OMA grave ou < 2 anos: 80–90 mg/kg/dia. OMA não grave > 2 anos: 40–50 mg/kg/dia.',
      },
      {
        nome: 'Pneumonia ambulatorial',
        doseMgKgDia: 90, frequencia: '12/12h', divisoes: 2,
        maxDoseMg: 500, idadeMinMeses: 1,
        instrucoes: 'Alta dose (90 mg/kg/dia) para cobrir S. pneumoniae com resistência intermediária.',
      },
      {
        nome: 'Faringoamigdalite por estreptococo',
        doseMgKgDia: 50, frequencia: '12/12h', divisoes: 2,
        maxDoseMg: 500, idadeMinMeses: 1,
        instrucoes: 'Duração: 10 dias (S. pyogenes). Amoxicilina 1× dose/dia (750 mg adulto): não recomendada em crianças < 30 kg.',
      },
    ],
    formulacoes: [
      { faixaMeses: [1, 24], forma: 'Gotas', concentracao: '50 mg/mL', instrucoes: 'Refrigerar após abrir. Validade 7 dias.' },
      { faixaMeses: [6, 144], forma: 'Suspensão oral', concentracao: '250 mg/5 mL ou 500 mg/5 mL' },
      { faixaKg: [25, 999], forma: 'Comprimido / Cápsula', concentracao: '500 mg ou 875 mg' },
    ],
    fontes: ['SBP 2023', 'AAP 2023', 'Red Book 2024'],
  },
  {
    drugId: 'amoxicilina-clavulanato',
    drugName: 'Amoxicilina/Clavulanato',
    indicacoes: [{
      nome: 'Infecções resistentes (PRSP, H. influenzae β-lactamase+)',
      doseMgKgDia: 90, frequencia: '12/12h', divisoes: 2,
      maxDoseMg: 875, idadeMinMeses: 2,
      instrucoes: 'Dose baseada na fração amoxicilina. Formulação ES (14:1) para alta dose: 90/6.4 mg/kg/dia. Diarreia frequente — Lactobacillus como adjuvante.',
      alertas: ['Diarreia: efeito adverso em 10–25%', 'Icterícia colestática (adultos)'],
    }],
    formulacoes: [
      { faixaMeses: [2, 48], forma: 'Suspensão', concentracao: '400/57 mg/5 mL (ES) ou 250/62.5 mg/5 mL' },
      { faixaKg: [25, 999], forma: 'Comprimido', concentracao: '875/125 mg' },
    ],
    fontes: ['SBP 2023', 'AAP 2023'],
  },
  {
    drugId: 'cefalexina',
    drugName: 'Cefalexina',
    indicacoes: [{
      nome: 'Infecções de pele e partes moles / ITU',
      doseMgKgDia: 50, frequencia: '6/6h', divisoes: 4,
      maxDoseMg: 500, maxDoseMgKgDia: 100,
      idadeMinMeses: 1,
      instrucoes: 'Pele grave (celulite, impetigo extenso): 100 mg/kg/dia ÷ 6/6h.',
    }],
    formulacoes: [
      { faixaMeses: [1, 72], forma: 'Suspensão', concentracao: '250 mg/5 mL' },
      { faixaKg: [20, 999], forma: 'Cápsula / Comprimido', concentracao: '500 mg' },
    ],
    fontes: ['SBP 2023'],
  },
  {
    drugId: 'ceftriaxona',
    drugName: 'Ceftriaxona',
    indicacoes: [
      {
        nome: 'Pneumonia grave / Sepse / Meningite bacteriana',
        doseMgKg: 50, frequencia: '1×/dia IV ou IM',
        maxDoseMg: 2000, idadeMinMeses: 0,
        instrucoes: 'Meningite: 100 mg/kg/dia ÷ 12/12h. Gonorreia neonatal: 25–50 mg/kg IM dose única. Sepse: 50–100 mg/kg/dia.',
        alertas: ['NÃO usar em RN < 41 sem IC com hiperbilirrubinemia (deslocamento albumina → kernicterus)', 'Colelitíase pseudolítica reversível com uso prolongado'],
      },
    ],
    formulacoes: [
      { forma: 'IM', concentracao: '500 mg/2 mL (diluir em lidocaína 1% — uso IM) ou água estéril', instrucoes: 'IM: máx 1 g por sítio de injeção' },
      { forma: 'IV', concentracao: '1 g/10 mL — infundir em 30 min' },
    ],
    contraindPediatrica: ['RN < 41 semanas IC com hiperbilirrubinemia', 'Hipercalcemia (precipita com ceftriaxona — nunca misturar com Ca IV)'],
    fontes: ['SBP 2023', 'AAP Red Book 2024'],
  },
  {
    drugId: 'azitromicina',
    drugName: 'Azitromicina',
    indicacoes: [
      {
        nome: 'Pneumonia atípica / Coqueluche / OMA alternativa',
        doseMgKg: 10, frequencia: 'D1: 10 mg/kg → D2–D5: 5 mg/kg 1×/dia',
        maxDoseMg: 500, idadeMinMeses: 6,
        instrucoes: 'Coqueluche: 10 mg/kg/dia × 5 dias (máx 500 mg/dia). < 6 meses: 10 mg/kg/dia × 5 dias (uso especializado).',
      },
    ],
    formulacoes: [
      { faixaMeses: [6, 144], forma: 'Suspensão', concentracao: '200 mg/5 mL', instrucoes: 'Refrigerar. Validade 10 dias após reconstituição.' },
      { faixaKg: [25, 999], forma: 'Comprimido', concentracao: '500 mg' },
    ],
    fontes: ['SBP 2023', 'Red Book 2024'],
  },
  {
    drugId: 'metronidazol',
    drugName: 'Metronidazol',
    indicacoes: [{
      nome: 'Giardia / Amebíase / Infecção anaeróbia',
      doseMgKgDia: 15, frequencia: '8/8h', divisoes: 3,
      maxDoseMg: 400, idadeMinMeses: 1,
      instrucoes: 'Giardia: 15 mg/kg/dia × 5–7 dias. Amebíase: 30–40 mg/kg/dia × 5–10 dias.',
    }],
    formulacoes: [
      { faixaMeses: [0, 72], forma: 'Suspensão / Solução oral', concentracao: '40 mg/mL ou 200 mg/5 mL' },
      { faixaKg: [20, 999], forma: 'Comprimido', concentracao: '250 mg ou 400 mg' },
    ],
    fontes: ['SBP 2023'],
  },
  {
    drugId: 'smz-tmp',
    drugName: 'Sulfametoxazol/Trimetoprima',
    indicacoes: [
      {
        nome: 'ITU / Pneumocistose (PCP)',
        doseMgKgDia: 6, frequencia: '12/12h', divisoes: 2,
        maxDoseMgKgDia: 12,
        idadeMinMeses: 2,
        instrucoes: 'Dose em mg/kg de TMP. ITU: 6 mg/kg/dia (TMP) ÷ 12/12h. PCP: 15–20 mg/kg/dia (TMP) ÷ 6–8h.',
        alertas: ['Contraindicado < 2 meses (kernicterus, cristalúria)', 'Monitorar hemograma (anemia megaloblástica)'],
      },
    ],
    formulacoes: [
      { faixaMeses: [2, 144], forma: 'Suspensão', concentracao: '200/40 mg/5 mL' },
      { faixaKg: [25, 999], forma: 'Comprimido', concentracao: '400/80 mg ou 800/160 mg' },
    ],
    contraindPediatrica: ['< 2 meses', 'G6PD deficiência grave'],
    fontes: ['SBP 2023', 'Red Book 2024'],
  },
  {
    drugId: 'fluconazol',
    drugName: 'Fluconazol',
    indicacoes: [{
      nome: 'Candidíase (oral, sistêmica, esofágica)',
      doseMgKg: 6, frequencia: '1×/dia',
      maxDoseMg: 400, idadeMinMeses: 3,
      instrucoes: 'Candidíase oral: 3–6 mg/kg/dia × 7–14 dias. Candidemia: 6–12 mg/kg/dia. Neonatal: 6 mg/kg a cada 24–72h (conforme IG).',
      alertas: ['QT: monitorar em altas doses ou combinação com outros QT-prolongadores', 'Hepatotóxico em doses elevadas prolongadas'],
    }],
    formulacoes: [
      { faixaMeses: [0, 24], forma: 'Suspensão', concentracao: '10 mg/mL ou 40 mg/mL' },
      { faixaKg: [25, 999], forma: 'Cápsula / Comprimido', concentracao: '150 mg' },
    ],
    fontes: ['IDSA 2023', 'Red Book 2024'],
  },
  {
    drugId: 'aciclovir',
    drugName: 'Aciclovir',
    indicacoes: [
      {
        nome: 'Herpes neonatal (cutâneo, mucosa, SNC)',
        doseMgKg: 20, frequencia: '8/8h IV',
        idadeMinMeses: 0, idadeMaxMeses: 3,
        instrucoes: 'NEONATAL: 20 mg/kg/dose IV 8/8h × 14 dias (pele/mucosa) ou 21 dias (SNC). Infundir em 1h.',
        alertas: ['Hidratação adequada (cristalúria em infusão rápida)', 'Monitorar creatinina diariamente'],
      },
      {
        nome: 'Varicela em imunocompetente',
        doseMgKg: 20, frequencia: '4/4h VO (5×/dia)',
        maxDoseMg: 800, idadeMinMeses: 12,
        instrucoes: 'VO: 20 mg/kg/dose (máx 800 mg) 5×/dia × 5–7 dias. Iniciar nas primeiras 24h de rash.',
      },
      {
        nome: 'Herpes simples cutâneo / Labial recorrente',
        doseMgKg: 10, frequencia: '8/8h VO',
        maxDoseMg: 400, idadeMinMeses: 12,
      },
    ],
    formulacoes: [
      { faixaMeses: [0, 24], forma: 'IV (neonatal)', concentracao: '25 mg/mL — infundir em 60 min' },
      { faixaMeses: [12, 999], forma: 'Comprimido / Suspensão', concentracao: '200 mg ou 400 mg | 200 mg/5 mL' },
    ],
    fontes: ['AAP Red Book 2024', 'IDSA HSV Guidelines 2023'],
  },
  {
    drugId: 'oseltamivir',
    drugName: 'Oseltamivir',
    indicacoes: [{
      nome: 'Influenza A e B (tratamento e profilaxia)',
      doseFixa: {
        '3–15kg': 30,    // mg/dose
        '15–23kg': 45,
        '23–40kg': 60,
        '>40kg': 75,
      },
      frequencia: '2×/dia × 5 dias (tratamento) | 1×/dia × 10 dias (profilaxia)',
      maxDoseMg: 75,
      instrucoes: 'INICIAR em < 48h de sintomas. < 1 ano: 3 mg/kg/dose 2×/dia (RN: uso especializado). ≥ 1 ano: dose por faixa de peso.',
      idadeMinMeses: 0,
      alertas: ['Suspensão oral pode ser manipulada a partir de cápsulas', 'Risco de alucinações em adolescentes — monitorar'],
    }],
    formulacoes: [
      { faixaMeses: [0, 12], forma: 'Suspensão manipulada', concentracao: '12 mg/mL (preparação a partir de cápsulas)' },
      { faixaMeses: [12, 999], forma: 'Suspensão comercial', concentracao: '12 mg/mL' },
      { faixaKg: [30, 999], forma: 'Cápsula', concentracao: '30 mg, 45 mg, 75 mg' },
    ],
    fontes: ['AAP 2023', 'OMS 2022', 'CDC 2024'],
  },

  // ── CORTICOSTEROIDES ─────────────────────────────────────────
  {
    drugId: 'prednisolona',
    drugName: 'Prednisolona',
    indicacoes: [
      {
        nome: 'Asma aguda',
        doseMgKg: 1, frequencia: '1×/dia por 3–5 dias',
        maxDoseMg: 40, idadeMinMeses: 12,
        instrucoes: '1 mg/kg/dia (máx 40 mg) × 3–5 dias. Não há necessidade de desmame em cursos < 10 dias.',
      },
      {
        nome: 'Croup (laringotraqueíte)',
        doseMgKg: 0.6, frequencia: 'Dose única VO',
        maxDoseMg: 10, idadeMinMeses: 3,
        instrucoes: 'Dose única 0,6 mg/kg (máx 10 mg). Dexametasona IM/IV 0,6 mg/kg é alternativa de ação mais longa.',
      },
      {
        nome: 'Nefrose / Anti-inflamatório',
        doseMgKgDia: 2, frequencia: '1×/dia', divisoes: 1,
        maxDoseMg: 60, idadeMinMeses: 12,
        instrucoes: 'Síndrome nefrótica: 60 mg/m²/dia (máx 60 mg) × 4–6 semanas, depois reduzir.',
      },
    ],
    formulacoes: [
      { faixaMeses: [0, 36], forma: 'Solução oral', concentracao: '3 mg/mL (Prelone) ou 5 mg/5 mL' },
      { faixaKg: [15, 999], forma: 'Comprimido', concentracao: '5 mg, 20 mg' },
    ],
    fontes: ['GINA 2024', 'SBP 2023', 'IPNA 2020'],
  },
  {
    drugId: 'dexametasona',
    drugName: 'Dexametasona',
    indicacoes: [
      {
        nome: 'Croup (laringotraqueíte viral)',
        doseMgKg: 0.6, frequencia: 'Dose única IM/IV/VO',
        maxDoseMg: 10, idadeMinMeses: 3,
        instrucoes: '0,15–0,6 mg/kg dose única (máx 10 mg). VO eficaz quanto IM. Efeito em 3h, duração 24–48h.',
      },
      {
        nome: 'Meningite bacteriana (adjuvante)',
        doseMgKg: 0.15, frequencia: '6/6h IV × 4 dias',
        maxDoseMg: 10, idadeMinMeses: 6,
        instrucoes: '0,15 mg/kg/dose 6/6h × 4 dias. Iniciar antes ou junto com antibiótico (H. influenzae, S. pneumoniae).',
      },
      {
        nome: 'Edema cerebral / Compressão medular',
        doseMgKg: 0.5, frequencia: '6/6h IV',
        idadeMinMeses: 1,
      },
    ],
    formulacoes: [
      { forma: 'Solução oral', concentracao: '0,5 mg/5 mL ou 2 mg/mL' },
      { forma: 'Ampola IV/IM', concentracao: '4 mg/mL ou 10 mg/mL' },
    ],
    fontes: ['AAP 2023', 'PCNS 2023'],
  },

  // ── ANTIPARASITÁRIOS ─────────────────────────────────────────
  {
    drugId: 'albendazol',
    drugName: 'Albendazol',
    indicacoes: [{
      nome: 'Helmintíases intestinais (ascaris, oxiúros, ancilostomose)',
      doseFixa: { '1–2 anos': 200, '>2 anos': 400 },
      frequencia: 'Dose única (1 dia)',
      idadeMinMeses: 12,
      instrucoes: 'Ascaridíase/ancilostomose: dose única 400 mg. Oxiúros: repetir em 2 semanas. Giardíase: 400 mg/dia × 3–5 dias.',
      alertas: ['Teratogênico — não usar em grávidas', 'Neurocisticercose requer esquema prolongado + corticoide'],
    }],
    formulacoes: [
      { faixaMeses: [12, 48], forma: 'Comprimido mastigável', concentracao: '200 mg' },
      { faixaMeses: [24, 999], forma: 'Comprimido', concentracao: '400 mg' },
    ],
    fontes: ['OMS 2022', 'SBP 2023'],
  },
  {
    drugId: 'ivermectina',
    drugName: 'Ivermectina',
    indicacoes: [{
      nome: 'Escabiose / Estrongiloidíase / Larva migrans',
      doseMcgKg: 200, frequencia: 'Dose única (repetir em 14 dias para escabiose)',
      idadeMinMeses: 0,
      instrucoes: 'Indicada em > 15 kg. < 15 kg: uso cauteloso com supervisão especializada. Escabiose crostosa: 3 doses (D1, D8, D15).',
      alertas: ['Evitar em < 15 kg / < 5 anos sem supervisão', 'Reação de Mazzotti em filariose'],
    }],
    formulacoes: [
      { faixaKg: [15, 999], forma: 'Comprimido', concentracao: '6 mg' },
    ],
    fontes: ['OMS 2022', 'SBP 2023'],
  },

  // ── GASTROENTEROLOGIA PEDIÁTRICA ─────────────────────────────
  {
    drugId: 'ondansetrona',
    drugName: 'Ondansetrona',
    indicacoes: [
      {
        nome: 'NVIQ / Gastrenterite com vômitos',
        doseMgKg: 0.15, frequencia: 'a cada 8h',
        maxDoseMg: 8, idadeMinMeses: 6,
        instrucoes: '0,1–0,15 mg/kg/dose VO/IV (máx 4–8 mg). Gastrenterite: dose única ou 2–3 doses. NVIQ: esquema por 24–48h.',
        alertas: ['Não recomendado < 6 meses (ausência de dados)', 'QT: monitorar em altas doses'],
      },
    ],
    formulacoes: [
      { faixaMeses: [6, 36], forma: 'Solução oral', concentracao: '0,8 mg/mL' },
      { faixaMeses: [12, 999], forma: 'Comprimido dispersível (Zydis)', concentracao: '4 mg ou 8 mg' },
    ],
    fontes: ['AAP 2023', 'Cochrane 2021'],
  },
  {
    drugId: 'domperidona',
    drugName: 'Domperidona',
    indicacoes: [{
      nome: 'Refluxo gastroesofágico / Vômitos pós-prandiais',
      doseMgKg: 0.25, frequencia: 'a cada 8h',
      maxDoseMg: 10, maxDoseMgKgDia: 0.75,
      idadeMinMeses: 0,
      instrucoes: '0,25 mg/kg/dose 3×/dia 15–30 min antes das refeições. DRGE neonatal: 0,2 mg/kg/dose 8/8h.',
      alertas: ['QT prolongado em prematuros — monitorar ECG', 'ANVISA: uso pediátrico apenas sob prescrição médica', 'Máx 2,4 mg/kg/dia'],
    }],
    formulacoes: [
      { faixaMeses: [0, 24], forma: 'Gotas', concentracao: '1 mg/mL (10 mg/mL alguns frascos — verificar)', instrucoes: 'Verificar concentração — risco de 10× superdose!' },
      { faixaKg: [20, 999], forma: 'Comprimido', concentracao: '10 mg' },
    ],
    contraindPediatrica: ['QTc prolongado', 'Medicamentos que prolongam QT'],
    fontes: ['ESPGHAN 2022', 'ANVISA 2023'],
  },
  {
    drugId: 'omeprazol',
    drugName: 'Omeprazol',
    indicacoes: [{
      nome: 'DRGE / Esofagite / Profilaxia de úlcera por corticoide',
      doseMgKg: 1, frequencia: '1×/dia (30 min antes do café)',
      maxDoseMg: 20, idadeMinMeses: 0,
      instrucoes: '0,5–1 mg/kg/dia (máx 20 mg). < 10 kg: 5 mg/dia; 10–20 kg: 10 mg/dia; > 20 kg: 20 mg/dia. Neonatal: 0,5 mg/kg/dia.',
    }],
    formulacoes: [
      { faixaMeses: [0, 24], forma: 'Cápsula aberta em alimento ácido', concentracao: '10 mg (abrir cápsula — grânulos em suco de laranja)' },
      { faixaMeses: [12, 999], forma: 'Comprimido dispersível', concentracao: '10 mg' },
    ],
    fontes: ['ESPGHAN 2022', 'SBP 2023'],
  },
  {
    drugId: 'lactulose',
    drugName: 'Lactulose',
    indicacoes: [{
      nome: 'Constipação intestinal',
      doseMgKg: 0, frequencia: '1–3×/dia',
      idadeMinMeses: 0,
      instrucoes: 'Lactente: 1–2 mL/kg/dia ÷ 2–3 tomadas. 1–5 anos: 5–10 mL/dia. 6–12 anos: 10–15 mL/dia. Encefalopatia: dose dobrada até 2–3 evacuações/dia.',
    }],
    formulacoes: [
      { forma: 'Xarope', concentracao: '667 mg/mL (3,33 mL = 2,22 g)', instrucoes: 'Pode misturar em suco ou leite' },
    ],
    fontes: ['SBP 2023'],
  },
];

// ─── FUNÇÃO PRINCIPAL: CALCULAR DOSE PEDIÁTRICA ───────────────
export function calcDosePediatrica(
  drugId: string,
  patient: PediatricPatient,
  indicacao?: string,
): PediatricDoseResult | null {
  const entry = PEDIATRIC_DOSES.find(d => d.drugId === drugId);
  if (!entry) return null;

  const indicEntry = indicacao
    ? entry.indicacoes.find(i => i.nome.toLowerCase().includes(indicacao.toLowerCase()))
    : entry.indicacoes[0];
  if (!indicEntry) return null;

  const idadeEfetiva = patient.idadeGestacionalSemanas && patient.idadePostNatalDias
    ? calcIdadeCorrigida(patient.idadeGestacionalSemanas, patient.idadePostNatalDias).mesesCorrigidos
    : patient.idadeMeses;

  // Verificar idade mínima
  const alertas: string[] = [...(indicEntry.alertas ?? []), ...(entry.contraindPediatrica ?? [])];
  if (indicEntry.idadeMinMeses !== undefined && idadeEfetiva < indicEntry.idadeMinMeses) {
    alertas.unshift(`⚠ CONTRAINDICADO: idade mínima ${indicEntry.idadeMinMeses} meses. Paciente tem ${idadeEfetiva} meses.`);
  }

  // Calcular dose
  let doseUnitariaMg: number | null = null;
  let doseUnitariaTexto = '';
  let doseTotalDiaMg: number | null = null;

  if (indicEntry.doseFixa) {
    // Dose fixa por peso/faixa
    const faixas = Object.entries(indicEntry.doseFixa);
    let doseFixaValor: number | null = null;
    for (const [faixa, dose] of faixas) {
      if (faixa.startsWith('>')) {
        const limite = parseFloat(faixa.replace('>', '').replace('kg', ''));
        if (patient.pesoKg > limite) doseFixaValor = dose;
      } else if (faixa.includes('–')) {
        const [minS, maxS] = faixa.split('–').map(s => parseFloat(s));
        if (patient.pesoKg >= minS && patient.pesoKg < maxS) doseFixaValor = dose;
      } else {
        const match = faixa.match(/(\d+)–(\d+)/);
        if (match) {
          const [, minM, maxM] = match.map(Number);
          if (idadeEfetiva >= minM && idadeEfetiva <= maxM) doseFixaValor = dose;
        }
      }
    }
    doseUnitariaMg = doseFixaValor;
    doseUnitariaTexto = doseFixaValor ? `${doseFixaValor} mg` : 'Ver tabela de dose por faixa';
  } else if (indicEntry.doseMgKg) {
    doseUnitariaMg = indicEntry.doseMgKg * patient.pesoKg;
    if (indicEntry.maxDoseMg) doseUnitariaMg = Math.min(doseUnitariaMg, indicEntry.maxDoseMg);
    doseUnitariaTexto = `${doseUnitariaMg.toFixed(0)} mg/dose (${indicEntry.doseMgKg} mg/kg)`;
  } else if (indicEntry.doseMgKgDia && indicEntry.divisoes) {
    doseTotalDiaMg = indicEntry.doseMgKgDia * patient.pesoKg;
    if (indicEntry.maxDoseMg) doseTotalDiaMg = Math.min(doseTotalDiaMg, indicEntry.maxDoseMg * indicEntry.divisoes);
    doseUnitariaMg = doseTotalDiaMg / indicEntry.divisoes;
    doseUnitariaTexto = `${doseUnitariaMg.toFixed(0)} mg/dose (${indicEntry.doseMgKgDia / indicEntry.divisoes} mg/kg/dose)`;
  } else if (indicEntry.doseMcgKg) {
    doseUnitariaMg = (indicEntry.doseMcgKg * patient.pesoKg) / 1000;
    doseUnitariaTexto = `${(indicEntry.doseMcgKg * patient.pesoKg).toFixed(0)} mcg/dose (${indicEntry.doseMcgKg} mcg/kg)`;
  }

  doseTotalDiaMg = doseTotalDiaMg ?? doseUnitariaMg;

  // Restrição de dose máxima
  if (indicEntry.maxDoseMg && doseUnitariaMg && doseUnitariaMg > indicEntry.maxDoseMg) {
    alertas.unshift(`Dose calculada (${doseUnitariaMg.toFixed(0)} mg) excede máximo permitido (${indicEntry.maxDoseMg} mg/dose). Usar ${indicEntry.maxDoseMg} mg.`);
    doseUnitariaMg = indicEntry.maxDoseMg;
  }

  // Selecionar formulação
  const formulacao = getFormulacaoPediatrica(entry, patient);

  // Calcular volume se formulação líquida
  let volumeCalculado: string | undefined;
  if (doseUnitariaMg && formulacao.concentracao) {
    const matchMgMl = formulacao.concentracao.match(/(\d+(?:\.\d+)?)\s*mg\/(\d+(?:\.\d+)?)\s*mL/);
    const matchMgGota = formulacao.concentracao.match(/1\s*gota\s*=\s*(\d+(?:\.\d+)?)\s*mg/);
    if (matchMgMl) {
      const mgPerMl = parseFloat(matchMgMl[1]) / parseFloat(matchMgMl[2]);
      const volume = doseUnitariaMg / mgPerMl;
      volumeCalculado = `${volume.toFixed(1)} mL por dose`;
    } else if (matchMgGota) {
      const mgPerGota = parseFloat(matchMgGota[1]);
      const gotas = doseUnitariaMg / mgPerGota;
      volumeCalculado = `${gotas.toFixed(0)} gotas por dose`;
    }
  }

  return {
    drugId,
    drugName: entry.drugName,
    indicacao: indicEntry.nome,
    doseUnitariaMg,
    doseUnitariaTexto,
    frequenciaTexto: indicEntry.frequencia,
    doseTotalDiaMg,
    doseTotalDiaTexto: doseTotalDiaMg ? `${doseTotalDiaMg.toFixed(0)} mg/dia` : '',
    doseMaxPermitida: indicEntry.maxDoseMg
      ? `${indicEntry.maxDoseMg} mg/dose | ${indicEntry.maxDoseMgKgDia ?? indicEntry.doseMgKgDia ?? ''}  mg/kg/dia`
      : 'Verificar protocolo',
    formulacaoRecomendada: formulacao.forma,
    concentracaoComum: formulacao.concentracao,
    volumeCalculado,
    alertas,
    idadeMinima: indicEntry.idadeMinMeses !== undefined ? `${indicEntry.idadeMinMeses} meses` : 'Sem restrição documentada',
    ajusteEspecial: indicEntry.instrucoes,
    fonte: entry.fontes.join(' | '),
  };
}

function getFormulacaoPediatrica(
  entry: PediatricDoseEntry,
  patient: PediatricPatient,
): { forma: string; concentracao: string; instrucoes?: string } {
  const matching = entry.formulacoes.filter(f => {
    const okKg = !f.faixaKg || (patient.pesoKg >= f.faixaKg[0] && patient.pesoKg < f.faixaKg[1]);
    const okMeses = !f.faixaMeses || (patient.idadeMeses >= f.faixaMeses[0] && patient.idadeMeses < f.faixaMeses[1]);
    return okKg && okMeses;
  });
  return matching[0] ?? entry.formulacoes[0] ?? { forma: 'Consultar bula', concentracao: 'N/D' };
}

// ─── GUIA RÁPIDO DE FORMULAÇÕES PEDIÁTRICAS ──────────────────
export const PEDIATRIC_FORMULATION_GUIDE: Record<string, {
  concentracao: string; uso: string; observacao?: string
}[]> = {
  paracetamol:    [{ concentracao: '200 mg/mL gotas (1 gota=10mg)', uso: '< 10 kg ou < 2 anos' },
                   { concentracao: '160 mg/5 mL xarope', uso: '2–12 anos (> 10 kg)' },
                   { concentracao: '500 mg comprimido', uso: '> 12 anos / > 30 kg' }],
  dipirona:       [{ concentracao: '500 mg/mL gotas (1 gota=25mg)', uso: '> 3 meses, 1 gota/kg', observacao: '1 gota = 12,5 mg em algumas marcas — VERIFICAR' },
                   { concentracao: '500 mg comprimido', uso: '> 30 kg' }],
  ibuprofeno:     [{ concentracao: '50 mg/mL gotas (1 gota=2,5mg)', uso: '6 meses–2 anos / < 10 kg', observacao: '2 gotas/kg/dose' },
                   { concentracao: '100 mg/5 mL suspensão', uso: '2–12 anos' },
                   { concentracao: '200 mg comprimido', uso: '> 12 anos' }],
  amoxicilina:    [{ concentracao: '50 mg/mL gotas', uso: 'Lactentes < 1 ano' },
                   { concentracao: '250 mg/5 mL suspensão', uso: '1–6 anos' },
                   { concentracao: '500 mg cápsula', uso: '> 6 anos / > 25 kg' }],
  azitromicina:   [{ concentracao: '200 mg/5 mL suspensão', uso: '6 meses–12 anos', observacao: 'Refrigerar. Usar em 10 dias.' }],
};

// ─── NEONATAL: CRITÉRIOS E ALERTAS ESPECÍFICOS ───────────────
export interface NeonatalAlert {
  tipo: 'contraindicação' | 'precaução' | 'ajuste' | 'monitoramento';
  drugId: string;
  mensagem: string;
  igMinima?: number;   // semanas de IG mínima
  idadeMinDias?: number;
}

export const NEONATAL_ALERTS: NeonatalAlert[] = [
  { tipo: 'contraindicação', drugId: 'ceftriaxona', mensagem: 'CONTRAINDICADA em RN < 41 semanas de idade concepcional com hiperbilirrubinemia ou hipocalcemia. Usar ampicilina + aminoglicosídeo.', igMinima: 37 },
  { tipo: 'contraindicação', drugId: 'smz-tmp', mensagem: 'CONTRAINDICADA em < 2 meses (deslocamento de bilirrubina → kernicterus).' },
  { tipo: 'contraindicação', drugId: 'dipirona', mensagem: 'CONTRAINDICADA em < 3 meses.', idadeMinDias: 90 },
  { tipo: 'contraindicação', drugId: 'ibuprofeno', mensagem: 'CONTRAINDICADO em < 3 meses VO. Uso IV (PCA closure) apenas em NICU.' },
  { tipo: 'precaução', drugId: 'domperidona', mensagem: 'QT prolongado em prematuros — realizar ECG antes de iniciar em < 34 semanas.' },
  { tipo: 'precaução', drugId: 'metronidazol', mensagem: 'Prematuros: metabolismo reduzido. RN < 34 semanas: intervalo de 48h. RN 34–37 sem: intervalo 36h.' },
  { tipo: 'ajuste', drugId: 'fluconazol', mensagem: 'Neonatal: dosagem por IG. < 29 sem: 6 mg/kg a cada 72h. 29–36 sem: a cada 48h. ≥ 37 sem: a cada 24h.' },
  { tipo: 'ajuste', drugId: 'aciclovir', mensagem: 'Herpes neonatal: 20 mg/kg/dose IV 8/8h × 14–21 dias. Monitorar creatinina diariamente.' },
  { tipo: 'monitoramento', drugId: 'cafeine-citrate', mensagem: 'Nível sérico alvo: 8–20 mg/L. Taquicardia > 180 bpm: reduzir dose.' },
  { tipo: 'ajuste', drugId: 'vancomicina', mensagem: 'Neonatal: AUC-guided dosing (alvo AUC 400–600 mg·h/L). Dose inicial 10–15 mg/kg q8-18h conforme IG e peso.' },
];

export function getNeonatalAlerts(drugId: string, patient: PediatricPatient): NeonatalAlert[] {
  return NEONATAL_ALERTS.filter(a => {
    if (a.drugId !== drugId) return false;
    if (a.igMinima && patient.idadeGestacionalSemanas && patient.idadeGestacionalSemanas < a.igMinima) return true;
    if (a.idadeMinDias && patient.idadePostNatalDias && patient.idadePostNatalDias < a.idadeMinDias) return true;
    if (!a.igMinima && !a.idadeMinDias) return true;
    return false;
  });
}

// ─── PESO IDEAL PEDIÁTRICO (para drogas baseadas em peso ideal) ─
export function calcPesoIdealPediatrico(idadeMeses: number, sexo: 'M' | 'F'): number {
  // Fórmula OMS simplificada (CDC 2000 growth charts)
  const anos = idadeMeses / 12;
  if (idadeMeses <= 12) return idadeMeses * 0.5 + 3.5;   // aprox.
  if (sexo === 'M') return 10 + (anos - 1) * 2;
  return 9 + (anos - 1) * 2;
}

// ─── RESUMO CLÍNICO DO PACIENTE PEDIÁTRICO ───────────────────
export function sumarizePediatricPatient(patient: PediatricPatient): string {
  const bsa = patient.alturaCm ? calcBSA(patient.pesoKg, patient.alturaCm).toFixed(2) : 'N/C';
  const idadeCorr = patient.idadeGestacionalSemanas && patient.idadePostNatalDias
    ? calcIdadeCorrigida(patient.idadeGestacionalSemanas, patient.idadePostNatalDias)
    : null;

  const lines = [
    `Peso: ${patient.pesoKg} kg | Altura: ${patient.alturaCm ?? 'N/I'} cm | SC: ${bsa} m²`,
    `Idade cronológica: ${patient.idadeMeses} meses (${Math.floor(patient.idadeMeses / 12)}a ${patient.idadeMeses % 12}m)`,
  ];
  if (idadeCorr) lines.push(`Idade corrigida: ${idadeCorr.mesesCorrigidos} meses | Classificação: ${idadeCorr.classificacao}`);
  return lines.join('\n');
}
