// ─── Types ────────────────────────────────────────────────────────────────────

export type Populacao = 'neonato' | 'lactente' | 'pediatrico' | 'adolescente' | 'adulto' | 'geriatrico';
export type Unidade = 'mg/kg' | 'mcg/kg' | 'g/kg' | 'mg/m²' | 'mg/kg/dia' | 'mcg/kg/min' | 'UI/kg' | 'mg' | 'mL' | 'gotas' | 'UI' | 'mcg' | 'g';
export type Via = 'oral' | 'iv' | 'im' | 'sc' | 'inalatorio' | 'topico' | 'retal';
export type TipoForma = 'comprimido' | 'capsula' | 'suspensao' | 'solucao_oral' | 'gotas_oral' | 'injetavel' | 'inalatorio' | 'supositorio';

export interface FormulacaoMedicamento {
  id: string;
  descricao: string;
  tipo: TipoForma;
  via: Via;
  concentracao_mg: number;   // mg por unidade de referência
  volume_ref_mL?: number;    // mL da unidade de referência (ex: 5mL num sachê/colher)
  gotas_por_mL?: number;     // tipicamente 20 gotas/mL
  unidade_dispensa: string;  // "comprimido", "mL", "gotas", "dose"
}

export interface RegraDoagem {
  populacoes: Populacao[];
  dose: number;              // valor numérico
  unidade: Unidade;
  frequencia_horas: number;  // 6 → 6/6h  | 8 → 8/8h | 12 → 12/12h | 24 → 1x/dia
  dose_maxima_por_dose_mg?: number;
  dose_maxima_por_dia_mg?: number;
  via: Via;
  indicacao?: string;
  observacao?: string;
  ajuste_renal?: boolean;
  ajuste_hepatico?: boolean;
  contraindicado_em?: Populacao[];
}

export interface MedicamentoDosagem {
  id: string;
  nome_generico: string;
  classe: string;
  cids?: string[];
  formulacoes: FormulacaoMedicamento[];
  regras: RegraDoagem[];
  diretriz?: string;
  evidencia?: string;
  observacao_geral?: string;
  alerta_especial?: string;
}

// ─── Population detection ────────────────────────────────────────────────────

export function detectarPopulacao(idade_dias: number): Populacao {
  if (idade_dias < 28)   return 'neonato';
  if (idade_dias < 365)  return 'lactente';
  if (idade_dias < 4380) return 'pediatrico';   // < 12 anos
  if (idade_dias < 6570) return 'adolescente';  // 12–17 anos
  if (idade_dias < 23725) return 'adulto';      // 18–64 anos
  return 'geriatrico';
}

export function idadeDias(anos: number, meses: number, dias: number): number {
  return anos * 365 + meses * 30 + dias;
}

export function labelPopulacao(p: Populacao): string {
  const M: Record<Populacao, string> = {
    neonato:     'Neonatologia (< 28 dias)',
    lactente:    'Lactente (28 dias – 11 meses)',
    pediatrico:  'Pediatria (1–11 anos)',
    adolescente: 'Adolescente (12–17 anos)',
    adulto:      'Adulto (18–64 anos)',
    geriatrico:  'Geriatria (≥ 65 anos)',
  };
  return M[p];
}

export function corPopulacao(p: Populacao): string {
  const M: Record<Populacao, string> = {
    neonato:     'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    lactente:    'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    pediatrico:  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    adolescente: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    adulto:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    geriatrico:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  };
  return M[p];
}

// ─── BSA (Mosteller) ─────────────────────────────────────────────────────────

export function calcularBSA(peso_kg: number, altura_cm: number): number {
  return Math.sqrt((peso_kg * altura_cm) / 3600);
}

// ─── Dose calculation ─────────────────────────────────────────────────────────

export interface ResultadoDosagem {
  ok: boolean;
  erro?: string;
  aviso?: string;
  populacao: Populacao;
  regra: RegraDoagem;
  formulacao: FormulacaoMedicamento;
  // raw
  dose_por_dose_mg: number;
  dose_total_dia_mg: number;
  frequencia_horas: number;
  doses_por_dia: number;
  // formatted for display
  volume_por_dose_mL?: number;
  gotas_por_dose?: number;
  comprimidos_por_dose?: number;
  unidade_resultado: string;
  // validation
  dose_maxima_por_dose_mg?: number;
  dose_maxima_por_dia_mg?: number;
  excede_dose_maxima_dose: boolean;
  excede_dose_maxima_dia: boolean;
  // formula
  formula_texto: string;
  bsa?: number;
}

export function calcularDosagem(
  peso_kg: number,
  altura_cm: number | undefined,
  idade_dias: number,
  medicamento: MedicamentoDosagem,
  formulacao_id: string,
): ResultadoDosagem | null {
  const populacao = detectarPopulacao(idade_dias);
  const formulacao = medicamento.formulacoes.find(f => f.id === formulacao_id);
  if (!formulacao) return null;

  // find most specific rule for this population
  const regra = medicamento.regras.find(r =>
    r.populacoes.includes(populacao) && r.via === formulacao.via
  ) ?? medicamento.regras.find(r => r.populacoes.includes(populacao));

  if (!regra) {
    return {
      ok: false,
      erro: `Não há posologia definida para ${labelPopulacao(populacao)} neste medicamento.`,
      populacao,
      regra: medicamento.regras[0],
      formulacao,
      dose_por_dose_mg: 0,
      dose_total_dia_mg: 0,
      frequencia_horas: 0,
      doses_por_dia: 0,
      excede_dose_maxima_dose: false,
      excede_dose_maxima_dia: false,
      unidade_resultado: '',
      formula_texto: '',
    };
  }

  if (regra.contraindicado_em?.includes(populacao)) {
    return {
      ok: false,
      erro: `Este medicamento é CONTRAINDICADO em ${labelPopulacao(populacao)}.`,
      populacao, regra, formulacao,
      dose_por_dose_mg: 0, dose_total_dia_mg: 0,
      frequencia_horas: 0, doses_por_dia: 0,
      excede_dose_maxima_dose: false, excede_dose_maxima_dia: false,
      unidade_resultado: '', formula_texto: '',
    };
  }

  const doses_por_dia = 24 / regra.frequencia_horas;
  let dose_total_dia_mg = 0;
  let formula_texto = '';
  let bsa: number | undefined;

  switch (regra.unidade) {
    case 'mg/kg':
    case 'mg/kg/dia':
      dose_total_dia_mg = regra.dose * peso_kg;
      formula_texto = `${regra.dose} mg/kg × ${peso_kg} kg = ${dose_total_dia_mg.toFixed(1)} mg/dia`;
      break;
    case 'mcg/kg':
      dose_total_dia_mg = (regra.dose * peso_kg) / 1000;
      formula_texto = `${regra.dose} mcg/kg × ${peso_kg} kg ÷ 1000 = ${dose_total_dia_mg.toFixed(3)} mg/dia`;
      break;
    case 'g/kg':
      dose_total_dia_mg = regra.dose * peso_kg * 1000;
      formula_texto = `${regra.dose} g/kg × ${peso_kg} kg × 1000 = ${dose_total_dia_mg.toFixed(1)} mg/dia`;
      break;
    case 'mg/m²':
      if (!altura_cm) {
        return {
          ok: false, erro: 'Altura é necessária para calcular mg/m².',
          populacao, regra, formulacao,
          dose_por_dose_mg: 0, dose_total_dia_mg: 0,
          frequencia_horas: 0, doses_por_dia: 0,
          excede_dose_maxima_dose: false, excede_dose_maxima_dia: false,
          unidade_resultado: '', formula_texto: '',
        };
      }
      bsa = calcularBSA(peso_kg, altura_cm);
      dose_total_dia_mg = regra.dose * bsa;
      formula_texto = `BSA: √(${peso_kg}×${altura_cm}/3600) = ${bsa.toFixed(2)} m² → ${regra.dose} mg/m² × ${bsa.toFixed(2)} = ${dose_total_dia_mg.toFixed(1)} mg/dia`;
      break;
    case 'UI/kg':
      dose_total_dia_mg = regra.dose * peso_kg;
      formula_texto = `${regra.dose} UI/kg × ${peso_kg} kg = ${dose_total_dia_mg.toFixed(0)} UI/dia`;
      break;
    case 'mg':
    case 'UI':
    case 'mcg':
    case 'g':
      dose_total_dia_mg = regra.unidade === 'g'
        ? regra.dose * 1000
        : regra.unidade === 'mcg'
        ? regra.dose / 1000
        : regra.dose;
      formula_texto = `Dose fixa: ${regra.dose} ${regra.unidade}/dia`;
      break;
    case 'mL':
      dose_total_dia_mg = regra.dose * (formulacao.concentracao_mg / (formulacao.volume_ref_mL ?? 1));
      formula_texto = `${regra.dose} mL × ${formulacao.concentracao_mg} mg/${formulacao.volume_ref_mL ?? 1} mL = ${dose_total_dia_mg.toFixed(1)} mg/dia`;
      break;
    default:
      dose_total_dia_mg = regra.dose;
      formula_texto = `Dose: ${regra.dose} ${regra.unidade}/dia`;
  }

  // apply max constraints
  if (regra.dose_maxima_por_dia_mg && dose_total_dia_mg > regra.dose_maxima_por_dia_mg) {
    dose_total_dia_mg = regra.dose_maxima_por_dia_mg;
    formula_texto += ` → limitado a ${regra.dose_maxima_por_dia_mg} mg/dia (dose máxima)`;
  }

  let dose_por_dose_mg = dose_total_dia_mg / doses_por_dia;

  if (regra.dose_maxima_por_dose_mg && dose_por_dose_mg > regra.dose_maxima_por_dose_mg) {
    dose_por_dose_mg = regra.dose_maxima_por_dose_mg;
    formula_texto += ` → dose por tomada limitada a ${regra.dose_maxima_por_dose_mg} mg`;
  }

  const excede_dose_maxima_dia = !!(regra.dose_maxima_por_dia_mg && (dose_total_dia_mg / doses_por_dia * doses_por_dia) > regra.dose_maxima_por_dia_mg * 1.01);
  const excede_dose_maxima_dose = !!(regra.dose_maxima_por_dose_mg && dose_por_dose_mg > regra.dose_maxima_por_dose_mg * 1.01);

  // volume calculations
  let volume_por_dose_mL: number | undefined;
  let gotas_por_dose: number | undefined;
  let comprimidos_por_dose: number | undefined;
  let unidade_resultado = 'mg';

  if (formulacao.tipo === 'comprimido' || formulacao.tipo === 'capsula') {
    comprimidos_por_dose = dose_por_dose_mg / formulacao.concentracao_mg;
    unidade_resultado = formulacao.tipo === 'capsula' ? 'cápsula(s)' : 'comprimido(s)';
  } else if (formulacao.tipo === 'suspensao' || formulacao.tipo === 'solucao_oral' || formulacao.tipo === 'injetavel') {
    const conc_por_mL = formulacao.concentracao_mg / (formulacao.volume_ref_mL ?? 1);
    volume_por_dose_mL = dose_por_dose_mg / conc_por_mL;
    unidade_resultado = 'mL';
  } else if (formulacao.tipo === 'gotas_oral') {
    const gotas_por_mL = formulacao.gotas_por_mL ?? 20;
    const conc_por_gota = formulacao.concentracao_mg / (gotas_por_mL * (formulacao.volume_ref_mL ?? 1));
    const gotas_float = dose_por_dose_mg / conc_por_gota;
    gotas_por_dose = Math.round(gotas_float);
    volume_por_dose_mL = gotas_float / gotas_por_mL;
    unidade_resultado = 'gotas';
  } else if (formulacao.tipo === 'inalatorio') {
    if (formulacao.unidade_dispensa === 'dose') {
      comprimidos_por_dose = dose_por_dose_mg / formulacao.concentracao_mg;
      unidade_resultado = 'dose(s)';
    }
  }

  return {
    ok: true,
    populacao, regra, formulacao, bsa,
    dose_por_dose_mg,
    dose_total_dia_mg,
    frequencia_horas: regra.frequencia_horas,
    doses_por_dia,
    volume_por_dose_mL,
    gotas_por_dose,
    comprimidos_por_dose,
    unidade_resultado,
    dose_maxima_por_dose_mg: regra.dose_maxima_por_dose_mg,
    dose_maxima_por_dia_mg: regra.dose_maxima_por_dia_mg,
    excede_dose_maxima_dose,
    excede_dose_maxima_dia,
    formula_texto,
  };
}

// ─── Frequency label ──────────────────────────────────────────────────────────

export function labelFrequencia(horas: number): string {
  const M: Record<number, string> = {
    4:  '4/4 horas (6x/dia)',
    6:  '6/6 horas (4x/dia)',
    8:  '8/8 horas (3x/dia)',
    12: '12/12 horas (2x/dia)',
    24: '1x ao dia',
    48: '1x a cada 48 horas',
  };
  return M[horas] ?? `a cada ${horas} horas`;
}

// ─── Drug database ────────────────────────────────────────────────────────────

export const MEDICAMENTOS_DOSAGEM: MedicamentoDosagem[] = [
  // ── ANTIBIÓTICOS ─────────────────────────────────────────────────────────
  {
    id: 'amoxicilina',
    nome_generico: 'Amoxicilina',
    classe: 'Antibiótico — Penicilina',
    cids: ['J00', 'J01', 'J02', 'J03', 'J06', 'J18', 'L01', 'N30'],
    formulacoes: [
      { id: 'amox-susp-250', descricao: 'Suspensão 250 mg/5 mL', tipo: 'suspensao', via: 'oral', concentracao_mg: 250, volume_ref_mL: 5, unidade_dispensa: 'mL' },
      { id: 'amox-susp-500', descricao: 'Suspensão 500 mg/5 mL', tipo: 'suspensao', via: 'oral', concentracao_mg: 500, volume_ref_mL: 5, unidade_dispensa: 'mL' },
      { id: 'amox-cap-500',  descricao: 'Cápsula 500 mg',        tipo: 'capsula',   via: 'oral', concentracao_mg: 500, unidade_dispensa: 'cápsula' },
      { id: 'amox-cap-875',  descricao: 'Cápsula 875 mg',        tipo: 'capsula',   via: 'oral', concentracao_mg: 875, unidade_dispensa: 'cápsula' },
    ],
    regras: [
      { populacoes: ['neonato', 'lactente', 'pediatrico'], dose: 50, unidade: 'mg/kg/dia', frequencia_horas: 8,  via: 'oral', dose_maxima_por_dia_mg: 3000, indicacao: 'Infecções leves a moderadas', observacao: 'Dose máxima 3g/dia. Otite: 90 mg/kg/dia' },
      { populacoes: ['adolescente', 'adulto'],             dose: 500, unidade: 'mg',       frequencia_horas: 8,  via: 'oral', dose_maxima_por_dia_mg: 3000, indicacao: 'Infecções leves a moderadas' },
      { populacoes: ['geriatrico'],                        dose: 500, unidade: 'mg',       frequencia_horas: 12, via: 'oral', dose_maxima_por_dia_mg: 2000, observacao: 'Reduzir frequência se TFGe < 30', ajuste_renal: true },
    ],
    diretriz: 'IDSA 2022 — Diretrizes de antibioticoterapia ambulatorial',
    evidencia: 'Nível I-A para infecções do trato respiratório superior e ITU não complicada',
    observacao_geral: 'Otite média aguda: 80–90 mg/kg/dia 12/12h. Sinusite bacteriana: 45 mg/kg/dia. Ajustar em insuficiência renal (TFGe < 30).',
  },
  {
    id: 'amoxicilina-clavulanato',
    nome_generico: 'Amoxicilina + Clavulanato',
    classe: 'Antibiótico — Penicilina + Inibidor de β-lactamase',
    cids: ['J01', 'J06', 'J18', 'L01', 'K65'],
    formulacoes: [
      { id: 'amoxiclav-susp-400', descricao: 'Suspensão 400 mg/5 mL (amoxicilina)', tipo: 'suspensao', via: 'oral', concentracao_mg: 400, volume_ref_mL: 5, unidade_dispensa: 'mL' },
      { id: 'amoxiclav-comp-875', descricao: 'Comprimido 875/125 mg',               tipo: 'comprimido', via: 'oral', concentracao_mg: 875, unidade_dispensa: 'comprimido' },
      { id: 'amoxiclav-comp-500', descricao: 'Comprimido 500/125 mg',               tipo: 'comprimido', via: 'oral', concentracao_mg: 500, unidade_dispensa: 'comprimido' },
    ],
    regras: [
      { populacoes: ['lactente', 'pediatrico'], dose: 45, unidade: 'mg/kg/dia', frequencia_horas: 12, via: 'oral', dose_maxima_por_dia_mg: 2000, indicacao: 'Infecções por germes beta-lactamase+', observacao: 'Otite resistente / sinusite: 90 mg/kg/dia' },
      { populacoes: ['adolescente', 'adulto'],  dose: 875, unidade: 'mg',       frequencia_horas: 12, via: 'oral', dose_maxima_por_dia_mg: 2000 },
      { populacoes: ['geriatrico'],             dose: 500, unidade: 'mg',       frequencia_horas: 12, via: 'oral', dose_maxima_por_dia_mg: 1500, ajuste_renal: true },
    ],
    diretriz: 'IDSA / SBI 2022',
    observacao_geral: 'Dose baseada no componente amoxicilina. Evitar em pacientes com hepatotoxicidade prévia à amoxicilina-clavulanato.',
    alerta_especial: 'Risco aumentado de hepatotoxicidade colestática. Monitorar função hepática em uso > 14 dias.',
  },
  {
    id: 'azitromicina',
    nome_generico: 'Azitromicina',
    classe: 'Antibiótico — Macrolídeo',
    cids: ['J01', 'J06', 'J18', 'A70'],
    formulacoes: [
      { id: 'azitro-susp-200', descricao: 'Suspensão 200 mg/5 mL', tipo: 'suspensao', via: 'oral', concentracao_mg: 200, volume_ref_mL: 5, unidade_dispensa: 'mL' },
      { id: 'azitro-comp-500', descricao: 'Comprimido 500 mg',      tipo: 'comprimido', via: 'oral', concentracao_mg: 500, unidade_dispensa: 'comprimido' },
    ],
    regras: [
      { populacoes: ['lactente', 'pediatrico'], dose: 10, unidade: 'mg/kg',  frequencia_horas: 24, via: 'oral', dose_maxima_por_dose_mg: 500, dose_maxima_por_dia_mg: 500, indicacao: '5 dias (dose única diária)' },
      { populacoes: ['adolescente', 'adulto'],  dose: 500, unidade: 'mg',    frequencia_horas: 24, via: 'oral', dose_maxima_por_dia_mg: 500 },
      { populacoes: ['geriatrico'],             dose: 500, unidade: 'mg',    frequencia_horas: 24, via: 'oral', dose_maxima_por_dia_mg: 500, observacao: 'Risco aumentado de QTc prolongado. Solicitar ECG.' },
    ],
    diretriz: 'IDSA CAP Guidelines 2019',
    observacao_geral: 'Duração padrão: 3–5 dias. Prolongamento QTc: evitar em cardiopatas ou associação com outros fármacos que prolongam QT.',
    alerta_especial: 'Monitorar intervalo QTc — risco de arritmia. Evitar em pacientes com QTc > 450 ms.',
  },
  {
    id: 'cefalexina',
    nome_generico: 'Cefalexina',
    classe: 'Antibiótico — Cefalosporina 1ª geração',
    cids: ['L01', 'L02', 'L08', 'J01', 'N30'],
    formulacoes: [
      { id: 'cef-susp-250', descricao: 'Suspensão 250 mg/5 mL', tipo: 'suspensao', via: 'oral', concentracao_mg: 250, volume_ref_mL: 5, unidade_dispensa: 'mL' },
      { id: 'cef-cap-500',  descricao: 'Cápsula 500 mg',        tipo: 'capsula',   via: 'oral', concentracao_mg: 500, unidade_dispensa: 'cápsula' },
    ],
    regras: [
      { populacoes: ['lactente', 'pediatrico'], dose: 25, unidade: 'mg/kg/dia', frequencia_horas: 6,  via: 'oral', dose_maxima_por_dia_mg: 4000 },
      { populacoes: ['adolescente', 'adulto'],  dose: 500, unidade: 'mg',       frequencia_horas: 6,  via: 'oral', dose_maxima_por_dia_mg: 4000 },
      { populacoes: ['geriatrico'],             dose: 500, unidade: 'mg',       frequencia_horas: 8,  via: 'oral', dose_maxima_por_dia_mg: 2000, ajuste_renal: true },
    ],
    diretriz: 'IDSA SSTI Guidelines 2014',
    observacao_geral: 'Infecções de pele e tecidos moles por Staphylococcus/Streptococcus. Ajustar dose em insuficiência renal (TFGe < 30).',
  },
  {
    id: 'sulfametoxazol-trimetoprim',
    nome_generico: 'Sulfametoxazol + Trimetoprima (SMX-TMP)',
    classe: 'Antibiótico — Sulfonamida',
    cids: ['N30', 'N39.0', 'J18'],
    formulacoes: [
      { id: 'smxtmp-susp', descricao: 'Suspensão 200/40 mg/5 mL (SMX/TMP)', tipo: 'suspensao', via: 'oral', concentracao_mg: 40, volume_ref_mL: 5, unidade_dispensa: 'mL' },
      { id: 'smxtmp-comp', descricao: 'Comprimido 400/80 mg',                tipo: 'comprimido', via: 'oral', concentracao_mg: 80, unidade_dispensa: 'comprimido' },
      { id: 'smxtmp-comp-forte', descricao: 'Comprimido Forte 800/160 mg',   tipo: 'comprimido', via: 'oral', concentracao_mg: 160, unidade_dispensa: 'comprimido' },
    ],
    regras: [
      { populacoes: ['lactente', 'pediatrico'], dose: 8, unidade: 'mg/kg/dia', frequencia_horas: 12, via: 'oral', dose_maxima_por_dia_mg: 320, indicacao: 'Dose baseada em TMP. ITU/Infecções respiratórias', observacao: 'Evitar < 2 meses' },
      { populacoes: ['adolescente', 'adulto'],  dose: 160, unidade: 'mg',      frequencia_horas: 12, via: 'oral', dose_maxima_por_dia_mg: 320, indicacao: 'ITU não complicada: 3–7 dias' },
      { populacoes: ['geriatrico'],             dose: 160, unidade: 'mg',      frequencia_horas: 12, via: 'oral', dose_maxima_por_dia_mg: 320, ajuste_renal: true, observacao: 'Risco de hiperpotassemia. Monitorar K+ e função renal.' },
    ],
    diretriz: 'IDSA UTI Guidelines 2010; SBU 2021',
    observacao_geral: 'Dose expressa em componente TMP. Contraindicado em < 2 meses (kernicterus). Evitar na gestação (1º e 3º trimestre).',
    alerta_especial: 'Contraindicado em < 2 meses de vida. Risco de hiperpotassemia em associação com BRA/IECA ou em idosos com DRC.',
    contraindicacoes: ['neonato'],
  } as MedicamentoDosagem,

  // ── ANALGÉSICOS / ANTIPIRÉTICOS ───────────────────────────────────────────
  {
    id: 'paracetamol',
    nome_generico: 'Paracetamol (Acetaminofeno)',
    classe: 'Analgésico / Antipirético',
    cids: ['R50', 'R51', 'M79.3'],
    formulacoes: [
      { id: 'parac-gotas', descricao: 'Gotas 200 mg/mL', tipo: 'gotas_oral', via: 'oral', concentracao_mg: 200, volume_ref_mL: 1, gotas_por_mL: 20, unidade_dispensa: 'gotas' },
      { id: 'parac-susp',  descricao: 'Suspensão 160 mg/5 mL', tipo: 'suspensao', via: 'oral', concentracao_mg: 160, volume_ref_mL: 5, unidade_dispensa: 'mL' },
      { id: 'parac-comp-500',  descricao: 'Comprimido 500 mg',    tipo: 'comprimido', via: 'oral', concentracao_mg: 500, unidade_dispensa: 'comprimido' },
      { id: 'parac-comp-750',  descricao: 'Comprimido 750 mg',    tipo: 'comprimido', via: 'oral', concentracao_mg: 750, unidade_dispensa: 'comprimido' },
    ],
    regras: [
      { populacoes: ['neonato'],                            dose: 10, unidade: 'mg/kg', frequencia_horas: 6,  via: 'oral', dose_maxima_por_dia_mg: 40, observacao: 'Máx 40 mg/kg/dia em neonatos' },
      { populacoes: ['lactente', 'pediatrico'],             dose: 15, unidade: 'mg/kg', frequencia_horas: 6,  via: 'oral', dose_maxima_por_dose_mg: 1000, dose_maxima_por_dia_mg: 4000, observacao: 'Máx 60 mg/kg/dia ou 4g/dia' },
      { populacoes: ['adolescente', 'adulto'],              dose: 750, unidade: 'mg',   frequencia_horas: 6,  via: 'oral', dose_maxima_por_dose_mg: 1000, dose_maxima_por_dia_mg: 4000 },
      { populacoes: ['geriatrico'],                         dose: 500, unidade: 'mg',   frequencia_horas: 8,  via: 'oral', dose_maxima_por_dia_mg: 2000, observacao: 'Reduzir dose máxima em hepatopatas e idosos frágeis' },
    ],
    diretriz: 'WHO Pain Ladder; Guia Farmacológico SBP 2023',
    evidencia: 'Segurança consolidada em todas as faixas etárias quando respeitada a dose máxima',
    observacao_geral: 'Dose máxima adulto: 4g/dia (3g/dia em hepatopatas ou etilistas). Intervalo mínimo de 4 horas entre doses.',
    alerta_especial: 'Hepatotoxicidade em superdosagem (> 150 mg/kg ou > 7,5g). Antídoto: N-acetilcisteína.',
  },
  {
    id: 'ibuprofeno',
    nome_generico: 'Ibuprofeno',
    classe: 'Anti-inflamatório não esteroidal (AINE)',
    cids: ['R50', 'R51', 'M79.3', 'M05', 'M06'],
    formulacoes: [
      { id: 'ibu-susp-100', descricao: 'Suspensão 100 mg/5 mL', tipo: 'suspensao', via: 'oral', concentracao_mg: 100, volume_ref_mL: 5, unidade_dispensa: 'mL' },
      { id: 'ibu-comp-300', descricao: 'Comprimido 300 mg',      tipo: 'comprimido', via: 'oral', concentracao_mg: 300, unidade_dispensa: 'comprimido' },
      { id: 'ibu-comp-600', descricao: 'Comprimido 600 mg',      tipo: 'comprimido', via: 'oral', concentracao_mg: 600, unidade_dispensa: 'comprimido' },
    ],
    regras: [
      { populacoes: ['pediatrico'], dose: 10, unidade: 'mg/kg', frequencia_horas: 8,  via: 'oral', dose_maxima_por_dose_mg: 400, dose_maxima_por_dia_mg: 2400, indicacao: '≥ 1 ano. Febre e dor. Lactentes 6–11 meses: uso possível mas requer avaliação médica individualizada — calculadora não disponível.' },
      { populacoes: ['adolescente', 'adulto'],  dose: 400, unidade: 'mg',   frequencia_horas: 8,  via: 'oral', dose_maxima_por_dia_mg: 2400, indicacao: 'Anti-inflamatório: 600–800mg 8/8h' },
      { populacoes: ['geriatrico'],             dose: 200, unidade: 'mg',   frequencia_horas: 8,  via: 'oral', dose_maxima_por_dia_mg: 1200, observacao: 'Risco aumentado de eventos GI e renais. Usar com protetor gástrico.', ajuste_renal: true },
    ],
    diretriz: 'SBP Guia Terapêutico 2023; Micromedex',
    observacao_geral: 'Contraindicado em < 6 meses. Usar com omeprazol em adultos/idosos. Evitar em DRC, IC e uso de anticoagulantes.',
    alerta_especial: 'Contraindicado < 6 meses. Risco cardiovascular aumentado em uso prolongado. Evitar na gestação (3º trimestre).',
  },
  {
    id: 'dipirona',
    nome_generico: 'Dipirona Sódica (Metamizol)',
    classe: 'Analgésico / Antipirético',
    cids: ['R50', 'R51', 'R10'],
    formulacoes: [
      { id: 'dip-gotas', descricao: 'Gotas 500 mg/mL', tipo: 'gotas_oral', via: 'oral', concentracao_mg: 500, volume_ref_mL: 1, gotas_por_mL: 20, unidade_dispensa: 'gotas' },
      { id: 'dip-comp-500', descricao: 'Comprimido 500 mg', tipo: 'comprimido', via: 'oral', concentracao_mg: 500, unidade_dispensa: 'comprimido' },
      { id: 'dip-comp-1g',  descricao: 'Comprimido 1 g',    tipo: 'comprimido', via: 'oral', concentracao_mg: 1000, unidade_dispensa: 'comprimido' },
      { id: 'dip-inj-500',  descricao: 'Solução injetável 500 mg/mL', tipo: 'injetavel', via: 'iv', concentracao_mg: 500, volume_ref_mL: 1, unidade_dispensa: 'mL' },
    ],
    regras: [
      { populacoes: ['lactente', 'pediatrico'], dose: 15, unidade: 'mg/kg', frequencia_horas: 6, via: 'oral', dose_maxima_por_dose_mg: 1000, dose_maxima_por_dia_mg: 4000, contraindicado_em: ['neonato'], observacao: '> 3 meses (90 dias). Contraindicado < 3 meses ou < 5 kg. 1 gota = 25 mg (500mg/mL, 20 gotas/mL)' },
      { populacoes: ['adolescente', 'adulto'],  dose: 500, unidade: 'mg',   frequencia_horas: 6, via: 'oral', dose_maxima_por_dose_mg: 1000, dose_maxima_por_dia_mg: 4000 },
      { populacoes: ['geriatrico'],             dose: 500, unidade: 'mg',   frequencia_horas: 8, via: 'oral', dose_maxima_por_dia_mg: 2000 },
      { populacoes: ['adolescente', 'adulto'],  dose: 1000, unidade: 'mg',  frequencia_horas: 8, via: 'iv', dose_maxima_por_dose_mg: 2500, dose_maxima_por_dia_mg: 5000, indicacao: 'Dor intensa hospitalar / IV lento (> 15 min)' },
    ],
    observacao_geral: 'Administrar IV lentamente (> 15 min) para evitar hipotensão. Contraindicado < 3 meses ou < 5 kg. Agranulocitose (raro, ~1:1 milhão).',
    alerta_especial: 'Agranulocitose (rara). Interromper imediatamente se febre + neutropenia. IV rápido causa hipotensão grave.',
  },

  // ── ANTIPIRÉTICOS / DOR NEUROPÁTICA ──────────────────────────────────────
  {
    id: 'prednisona',
    nome_generico: 'Prednisona',
    classe: 'Corticosteroide',
    cids: ['J45', 'M05', 'M06', 'K50', 'K51'],
    formulacoes: [
      { id: 'pred-comp-5',  descricao: 'Comprimido 5 mg',  tipo: 'comprimido', via: 'oral', concentracao_mg: 5,  unidade_dispensa: 'comprimido' },
      { id: 'pred-comp-20', descricao: 'Comprimido 20 mg', tipo: 'comprimido', via: 'oral', concentracao_mg: 20, unidade_dispensa: 'comprimido' },
    ],
    regras: [
      { populacoes: ['lactente', 'pediatrico'], dose: 1, unidade: 'mg/kg', frequencia_horas: 24, via: 'oral', dose_maxima_por_dia_mg: 40, indicacao: 'Crise asmática, síndrome nefrótica, doenças autoimunes' },
      { populacoes: ['adolescente', 'adulto'],  dose: 0.5, unidade: 'mg/kg', frequencia_horas: 24, via: 'oral', dose_maxima_por_dia_mg: 60, indicacao: 'Anti-inflamatório / imunossupressor' },
      { populacoes: ['geriatrico'],             dose: 0.25, unidade: 'mg/kg', frequencia_horas: 24, via: 'oral', dose_maxima_por_dia_mg: 40, observacao: 'Risco de hiperglicemia, osteoporose e infecção. Suplementar Ca²⁺ + vitamina D.' },
    ],
    diretriz: 'GINA 2023 (crise asmática); ACR 2022 (artrite reumatoide)',
    observacao_geral: 'Dose de 1 mg/kg/dia para crise asmática pediátrica (máx 40 mg, 3–5 dias). Nunca suspender abruptamente em uso > 7 dias.',
    alerta_especial: 'Nunca suspender abruptamente. Suplementar cálcio e vitamina D em uso prolongado. Rastrear glicemia e PA.',
  },

  // ── RESPIRATÓRIO ─────────────────────────────────────────────────────────
  {
    id: 'salbutamol',
    nome_generico: 'Salbutamol (Albuterol)',
    classe: 'Broncodilatador — Beta-2 agonista de curta ação (SABA)',
    cids: ['J45', 'J44'],
    formulacoes: [
      { id: 'salb-aerossol', descricao: 'Aerossol inalatório 100 mcg/dose', tipo: 'inalatorio', via: 'inalatorio', concentracao_mg: 0.1, unidade_dispensa: 'dose' },
      { id: 'salb-susp-neb', descricao: 'Solução nebulização 5 mg/mL', tipo: 'solucao_oral', via: 'inalatorio', concentracao_mg: 5, volume_ref_mL: 1, unidade_dispensa: 'mL' },
    ],
    regras: [
      { populacoes: ['lactente', 'pediatrico'], dose: 0.15, unidade: 'mg/kg', frequencia_horas: 6, via: 'inalatorio', dose_maxima_por_dose_mg: 5, indicacao: 'Crise asmática / broncoespasmo', observacao: 'Diluir em 3 mL SF para nebulização' },
      { populacoes: ['adolescente', 'adulto'],  dose: 2.5, unidade: 'mg',     frequencia_horas: 6, via: 'inalatorio', dose_maxima_por_dia_mg: 20, indicacao: 'Resgate em crise' },
      { populacoes: ['geriatrico'],             dose: 2.5, unidade: 'mg',     frequencia_horas: 8, via: 'inalatorio', dose_maxima_por_dia_mg: 12, observacao: 'Risco de taquicardia e hipopotassemia' },
    ],
    observacao_geral: 'Aerossol: 2–4 jatos por dose com espaçador. Nebulização: diluir em SF 0,9% até 3 mL. Monitorar FC e K+ em altas doses.',
  },
  {
    id: 'montelucaste',
    nome_generico: 'Montelucaste Sódico',
    classe: 'Antileucotrieno — Antagonista do receptor CysLT1',
    cids: ['J45', 'J30'],
    formulacoes: [
      { id: 'mont-sache-4', descricao: 'Sachê 4 mg (PIEMONTE® Sachê)', tipo: 'suspensao', via: 'oral', concentracao_mg: 4, volume_ref_mL: 1, unidade_dispensa: 'sachê' },
      { id: 'mont-comp-10', descricao: 'Comprimido 10 mg (PIEMONTE®)', tipo: 'comprimido', via: 'oral', concentracao_mg: 10, unidade_dispensa: 'comprimido' },
    ],
    regras: [
      { populacoes: ['lactente'],               dose: 4,  unidade: 'mg', frequencia_horas: 24, via: 'oral', indicacao: '6 meses–5 anos — sachê 4mg', observacao: 'Administrar ao entardecer ou ao deitar' },
      { populacoes: ['pediatrico'],             dose: 5,  unidade: 'mg', frequencia_horas: 24, via: 'oral', dose_maxima_por_dia_mg: 5,  indicacao: '6–14 anos — comprimido mastigável 5mg' },
      { populacoes: ['adolescente', 'adulto', 'geriatrico'], dose: 10, unidade: 'mg', frequencia_horas: 24, via: 'oral', dose_maxima_por_dia_mg: 10, indicacao: '≥ 15 anos — comprimido 10mg' },
    ],
    diretriz: 'GINA 2023 (adjuvante ICS); ARIA 2021 (rinite alérgica)',
    observacao_geral: 'Administrar à noite. Não usar como monoterapia em asma moderada-grave. FDA Black Box Warning (2020): avaliar neuropsiquiátrico.',
    alerta_especial: 'FDA Black Box Warning 2020: risco de alterações neuropsiquiátricas (sonhos vívidos, depressão, pensamentos suicidas). Avaliar benefício-risco.',
    marcas_eurofarma: ['PIEMONTE® (10mg adulto)', 'PIEMONTE® Sachê (4mg pediátrico)'],
  } as MedicamentoDosagem,

  // ── CARDIOVASCULAR ────────────────────────────────────────────────────────
  {
    id: 'atenolol',
    nome_generico: 'Atenolol',
    classe: 'Anti-hipertensivo — Betabloqueador cardioseletivo',
    cids: ['I10', 'I25'],
    formulacoes: [
      { id: 'aten-comp-25',  descricao: 'Comprimido 25 mg',  tipo: 'comprimido', via: 'oral', concentracao_mg: 25,  unidade_dispensa: 'comprimido' },
      { id: 'aten-comp-50',  descricao: 'Comprimido 50 mg',  tipo: 'comprimido', via: 'oral', concentracao_mg: 50,  unidade_dispensa: 'comprimido' },
      { id: 'aten-comp-100', descricao: 'Comprimido 100 mg', tipo: 'comprimido', via: 'oral', concentracao_mg: 100, unidade_dispensa: 'comprimido' },
    ],
    regras: [
      { populacoes: ['adolescente', 'adulto'],  dose: 50,  unidade: 'mg', frequencia_horas: 24, via: 'oral', dose_maxima_por_dia_mg: 100, indicacao: 'HAS, angina, pós-IAM' },
      { populacoes: ['geriatrico'],             dose: 25,  unidade: 'mg', frequencia_horas: 24, via: 'oral', dose_maxima_por_dia_mg: 50,  observacao: 'Iniciar com 25 mg. Risco de bradicardia e broncoespasmo.', ajuste_renal: true },
    ],
    observacao_geral: 'Nunca suspender abruptamente (rebote cardíaco). Contraindicado em asma grave, BAV 2º/3º grau sem MP, IC descompensada.',
  },
  {
    id: 'losartana',
    nome_generico: 'Losartana Potássica',
    classe: 'Anti-hipertensivo — BRA (Bloqueador do Receptor de Angiotensina II)',
    cids: ['I10', 'N18'],
    formulacoes: [
      { id: 'los-comp-25',  descricao: 'Comprimido 25 mg',  tipo: 'comprimido', via: 'oral', concentracao_mg: 25,  unidade_dispensa: 'comprimido' },
      { id: 'los-comp-50',  descricao: 'Comprimido 50 mg',  tipo: 'comprimido', via: 'oral', concentracao_mg: 50,  unidade_dispensa: 'comprimido' },
      { id: 'los-comp-100', descricao: 'Comprimido 100 mg', tipo: 'comprimido', via: 'oral', concentracao_mg: 100, unidade_dispensa: 'comprimido' },
    ],
    regras: [
      { populacoes: ['pediatrico'],             dose: 0.7, unidade: 'mg/kg', frequencia_horas: 24, via: 'oral', dose_maxima_por_dia_mg: 50, indicacao: '> 6 anos. HAS + nefropatia.' },
      { populacoes: ['adolescente', 'adulto'],  dose: 50,  unidade: 'mg',   frequencia_horas: 24, via: 'oral', dose_maxima_por_dia_mg: 100 },
      { populacoes: ['geriatrico'],             dose: 25,  unidade: 'mg',   frequencia_horas: 24, via: 'oral', dose_maxima_por_dia_mg: 100, ajuste_renal: true, observacao: 'Monitorar K+ e creatinina nas primeiras semanas.' },
    ],
    diretriz: 'ESC/ESH HAS 2023; SBC 2023',
    observacao_geral: 'Contraindicado na gravidez. Monitorar K+ e creatinina 2–4 semanas após início.',
  },

  // ── ENDOCRINOLOGIA ────────────────────────────────────────────────────────
  {
    id: 'metformina',
    nome_generico: 'Metformina',
    classe: 'Antidiabético — Biguanida',
    cids: ['E11'],
    formulacoes: [
      { id: 'met-comp-500',  descricao: 'Comprimido 500 mg',  tipo: 'comprimido', via: 'oral', concentracao_mg: 500,  unidade_dispensa: 'comprimido' },
      { id: 'met-comp-850',  descricao: 'Comprimido 850 mg',  tipo: 'comprimido', via: 'oral', concentracao_mg: 850,  unidade_dispensa: 'comprimido' },
      { id: 'met-comp-1000', descricao: 'Comprimido 1000 mg', tipo: 'comprimido', via: 'oral', concentracao_mg: 1000, unidade_dispensa: 'comprimido' },
    ],
    regras: [
      { populacoes: ['pediatrico'],             dose: 500, unidade: 'mg', frequencia_horas: 12, via: 'oral', dose_maxima_por_dia_mg: 2000, indicacao: '> 10 anos com DM2' },
      { populacoes: ['adolescente', 'adulto'],  dose: 500, unidade: 'mg', frequencia_horas: 12, via: 'oral', dose_maxima_por_dia_mg: 2550, indicacao: 'Iniciar 500 mg 12/12h; titular a cada 1–2 semanas até 2550 mg/dia' },
      { populacoes: ['geriatrico'],             dose: 500, unidade: 'mg', frequencia_horas: 12, via: 'oral', dose_maxima_por_dia_mg: 2000, ajuste_renal: true, observacao: 'Suspender se TFGe < 30. Reduzir se TFGe 30–45. Risco de acidose lática.' },
    ],
    diretriz: 'ADA Standards of Care 2024; SBD 2023',
    observacao_geral: 'Tomar com refeições para reduzir efeitos GI. Suspender 48h antes de contraste iodado. Contraindicado TFGe < 30.',
    alerta_especial: 'Contraindicado em TFGe < 30 mL/min. Suspender 48h antes de contraste iodado (risco de acidose lática).',
  },

  // ── GASTRO ────────────────────────────────────────────────────────────────
  {
    id: 'omeprazol',
    nome_generico: 'Omeprazol',
    classe: 'Inibidor da Bomba de Prótons (IBP)',
    cids: ['K21', 'K25', 'K27', 'K92.0'],
    formulacoes: [
      { id: 'ome-caps-20', descricao: 'Cápsula 20 mg', tipo: 'capsula', via: 'oral', concentracao_mg: 20, unidade_dispensa: 'cápsula' },
      { id: 'ome-caps-40', descricao: 'Cápsula 40 mg', tipo: 'capsula', via: 'oral', concentracao_mg: 40, unidade_dispensa: 'cápsula' },
    ],
    regras: [
      { populacoes: ['lactente', 'pediatrico'], dose: 1, unidade: 'mg/kg', frequencia_horas: 24, via: 'oral', dose_maxima_por_dia_mg: 40, indicacao: 'DRGE / esofagite péptica' },
      { populacoes: ['adolescente', 'adulto'],  dose: 20, unidade: 'mg',   frequencia_horas: 24, via: 'oral', dose_maxima_por_dia_mg: 40, indicacao: 'Profilaxia GI com AINE/AAS; DRGE' },
      { populacoes: ['geriatrico'],             dose: 20, unidade: 'mg',   frequencia_horas: 24, via: 'oral', dose_maxima_por_dia_mg: 40, observacao: 'Risco de hipomagnesemia, fraturas e infecção por C. difficile em uso > 1 ano.' },
    ],
    observacao_geral: 'Tomar 30–60 min antes do café da manhã. Uso > 1 ano: risco de deficiência de magnésio, vitamina B12 e fraturas. Rever indicação periodicamente.',
  },

  // ── NEUROLOGIA ────────────────────────────────────────────────────────────
  {
    id: 'pramipexol',
    nome_generico: 'Dicloridrato de Pramipexol',
    classe: 'Antiparkinsoniano — Agonista dopaminérgico D2/D3',
    cids: ['G20', 'G25.81'],
    formulacoes: [
      { id: 'prami-comp-ir-0125', descricao: 'Comprimido IR 0,125 mg',  tipo: 'comprimido', via: 'oral', concentracao_mg: 0.125, unidade_dispensa: 'comprimido' },
      { id: 'prami-comp-lp-0375', descricao: 'Comprimido LP 0,375 mg (PISA® LP)', tipo: 'comprimido', via: 'oral', concentracao_mg: 0.375, unidade_dispensa: 'comprimido' },
      { id: 'prami-comp-lp-075',  descricao: 'Comprimido LP 0,75 mg (PISA® LP)',  tipo: 'comprimido', via: 'oral', concentracao_mg: 0.75,  unidade_dispensa: 'comprimido' },
      { id: 'prami-comp-lp-1125', descricao: 'Comprimido LP 1,125 mg (PISA® LP)', tipo: 'comprimido', via: 'oral', concentracao_mg: 1.125, unidade_dispensa: 'comprimido' },
    ],
    regras: [
      { populacoes: ['adulto'], dose: 0.375, unidade: 'mg', frequencia_horas: 24, via: 'oral', dose_maxima_por_dia_mg: 4.5, indicacao: 'Parkinson inicial (LP). Iniciar 0,375 mg/dia; titular a cada 5–7 dias.', observacao: 'SPI: 0,125–0,5 mg 2–3h antes de dormir' },
      { populacoes: ['geriatrico'], dose: 0.375, unidade: 'mg', frequencia_horas: 24, via: 'oral', dose_maxima_por_dia_mg: 2.25, ajuste_renal: true, observacao: 'Titular mais lentamente. Risco de hipotensão ortostática e alucinações aumentado.' },
    ],
    diretriz: 'MDS Evidence-Based Medicine Review 2023; ABN Consenso Parkinson 2022',
    observacao_geral: 'Início: 0,375 mg/dia (LP) → aumentar 0,375 mg a cada 5–7 dias conforme tolerância. Dose terapêutica usual: 1,5–4,5 mg/dia. Reduzir em TFGe < 50.',
    alerta_especial: 'Transtornos do controle de impulso (jogo patológico, hipersexualidade): questionar a cada consulta. Sonolência súbita durante condução de veículos.',
  },
  {
    id: 'fenitoina',
    nome_generico: 'Fenitoína',
    classe: 'Antiepiléptico — Bloqueador de canal de sódio',
    cids: ['G40', 'G41'],
    formulacoes: [
      { id: 'feni-susp', descricao: 'Suspensão 25 mg/mL', tipo: 'suspensao', via: 'oral', concentracao_mg: 25, volume_ref_mL: 1, unidade_dispensa: 'mL' },
      { id: 'feni-comp-100', descricao: 'Comprimido 100 mg', tipo: 'comprimido', via: 'oral', concentracao_mg: 100, unidade_dispensa: 'comprimido' },
      { id: 'feni-inj', descricao: 'Solução injetável 50 mg/mL', tipo: 'injetavel', via: 'iv', concentracao_mg: 50, volume_ref_mL: 1, unidade_dispensa: 'mL' },
    ],
    regras: [
      { populacoes: ['neonato'],                           dose: 5,  unidade: 'mg/kg', frequencia_horas: 12, via: 'oral', dose_maxima_por_dia_mg: 20, indicacao: 'Crises neonatais', observacao: 'Monitorar nível sérico alvo 10–20 mcg/mL' },
      { populacoes: ['lactente', 'pediatrico'],            dose: 5,  unidade: 'mg/kg', frequencia_horas: 12, via: 'oral', dose_maxima_por_dia_mg: 300 },
      { populacoes: ['adolescente', 'adulto', 'geriatrico'], dose: 300, unidade: 'mg', frequencia_horas: 24, via: 'oral', dose_maxima_por_dia_mg: 600, ajuste_hepatico: true },
    ],
    observacao_geral: 'Monitorar nível sérico (alvo 10–20 μg/mL). Múltiplas interações medicamentosas (indução de CYP). Ajustar em hepatopatas. Hiperplasia gengival em uso crônico.',
    alerta_especial: 'Janela terapêutica estreita. Monitorar nível sérico. Interações com vários anticoagulantes, AINEs, antibióticos e antifúngicos.',
  },

  // ── GINECOLOGIA ──────────────────────────────────────────────────────────
  {
    id: 'dienogeste',
    nome_generico: 'Dienogeste',
    classe: 'Progestagênio — Tratamento da endometriose',
    cids: ['N80'],
    formulacoes: [
      { id: 'dien-comp-2', descricao: 'Comprimido 2 mg (PIETRA ED®)', tipo: 'comprimido', via: 'oral', concentracao_mg: 2, unidade_dispensa: 'comprimido' },
    ],
    regras: [
      { populacoes: ['adolescente', 'adulto'], dose: 2, unidade: 'mg', frequencia_horas: 12, via: 'oral', dose_maxima_por_dia_mg: 4, indicacao: 'Endometriose — 1 comprimido 12/12h continuamente' },
    ],
    diretriz: 'ESHRE Endometriosis Guideline 2022; FEBRASGO 2021',
    observacao_geral: 'Uso contínuo (sem pausa). Sangramento irregular esperado nos primeiros 3 meses. Densitometria óssea após 24 meses de uso.',
    alerta_especial: 'Não usar para contracepção de emergência. Uso contínuo sem intervalo. Monitorar DMO em uso > 24 meses.',
  },
];

// ─── Lookup ───────────────────────────────────────────────────────────────────

export function buscarMedicamento(query: string): MedicamentoDosagem[] {
  const q = query.toLowerCase().trim();
  if (!q) return MEDICAMENTOS_DOSAGEM;
  return MEDICAMENTOS_DOSAGEM.filter(m =>
    m.nome_generico.toLowerCase().includes(q) ||
    m.classe.toLowerCase().includes(q) ||
    m.cids?.some(c => c.toLowerCase().includes(q)) ||
    m.id.includes(q)
  );
}

export function getMedicamentoById(id: string): MedicamentoDosagem | undefined {
  return MEDICAMENTOS_DOSAGEM.find(m => m.id === id);
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export function formatarVolume(mL: number): string {
  if (mL < 1) return `${(mL * 1000).toFixed(0)} μL`;
  return `${mL % 1 === 0 ? mL.toFixed(0) : mL.toFixed(1)} mL`;
}

export function formatarDose(mg: number): string {
  if (mg >= 1000) return `${(mg / 1000).toFixed(mg % 1000 === 0 ? 0 : 1)} g`;
  if (mg < 1)     return `${(mg * 1000).toFixed(0)} mcg`;
  return `${mg % 1 === 0 ? mg.toFixed(0) : mg.toFixed(1)} mg`;
}

/**
 * Returns a structured message when a molecule exists in the pharmacological
 * library (QuickDrug) but has no structured posology rules in MEDICAMENTOS_DOSAGEM.
 * Display this instead of a blank/null dose field to avoid physician confusion.
 */
export function getDoseIndisponivelMsg(moleculaNome: string): {
  titulo: string;
  mensagem: string;
  orientacao: string;
} {
  return {
    titulo: 'Cálculo de dose indisponível',
    mensagem: `${moleculaNome} está cadastrada na biblioteca farmacológica, porém ainda não possui regras posológicas estruturadas no mecanismo de cálculo.`,
    orientacao: 'Consulte a bula, protocolo institucional ou diretriz da especialidade para a posologia adequada.',
  };
}

/**
 * Returns true when a molecule can be dosed via calcularDosagem().
 * Use before calling calcularDosagem to decide whether to show the
 * dose calculator UI or the getDoseIndisponivelMsg() message.
 */
export function isDoseCalculavel(medicamentoId: string): boolean {
  return getMedicamentoById(medicamentoId) !== undefined;
}
