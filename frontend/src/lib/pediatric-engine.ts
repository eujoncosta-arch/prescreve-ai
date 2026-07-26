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
  /**
   * Resolução PED-AUDIT-06 (auditoria RM-36): qual base de idade foi usada
   * para selecionar a formulação por faixa etária (`formulacoes[].faixaMeses`).
   * 'corrigida' = idade gestacional corrigida foi usada (prematuro, com
   * dados de IG/dias de vida disponíveis) — mesma base já usada para a
   * elegibilidade da dose, evitando a inconsistência de usar uma base para
   * a dose e outra para a formulação. 'cronologica' = idade cronológica
   * (paciente a termo, ou sem dados gestacionais informados — não há
   * idade corrigida a aplicar). Quando a formulação é selecionada por
   * FAIXA DE PESO (`faixaKg`), a idade não influencia a escolha — peso é
   * sempre atual/medido, nunca "corrigido".
   */
  formulacaoBaseIdade: 'corrigida' | 'cronologica';
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

/**
 * Resolução PED-AUDIT-07 (auditoria RM-36): a fórmula de Schwartz aplica
 * um coeficiente `k` diferente por faixa etária, e o coeficiente do
 * adolescente (≥13 anos) é ESPECÍFICO POR SEXO — k=0,70 para meninos,
 * k=0,55 para meninas (a mesma referência clássica que já usa k=0,55 para
 * crianças 1–12 anos, unissex). A implementação anterior não tinha
 * parâmetro de sexo e aplicava k=0,70 (coeficiente MASCULINO) a qualquer
 * adolescente, superestimando o clearance de creatinina em adolescentes
 * do sexo feminino — o que poderia levar a SUBESTIMAR a necessidade de
 * ajuste de dose renal (uma função renal aparentando melhor do que é).
 *
 * Auditoria de consumidores: `calcClCrSchwartz` não tem NENHUM chamador
 * em todo o repositório (só esta definição) — nenhum consumidor precisou
 * ser atualizado para propagar o sexo.
 */
export type ResultadoClCrSchwartz =
  | {
      ok: true;
      clcrMlMin1_73m2: number;
      kUsado: number;
      faixaEtaria: 'lactente' | 'crianca' | 'adolescente';
    }
  | {
      ok: false;
      erro: string;
      motivo: 'sexo_ausente_para_adolescente';
    };

export function calcClCrSchwartz(
  alturaCm: number,
  creatininaMgdL: number,
  idadeMeses: number,
  sexo: 'M' | 'F' | undefined,
): ResultadoClCrSchwartz {
  // Lactente (<1 ano): k=0,33 — unissex na literatura de referência (Schwartz).
  if (idadeMeses < 12) {
    const k = 0.33;
    return { ok: true, clcrMlMin1_73m2: (k * alturaCm) / creatininaMgdL, kUsado: k, faixaEtaria: 'lactente' };
  }
  // Criança (1–12 anos, < 156 meses): k=0,55 — unissex.
  if (idadeMeses < 156) {
    const k = 0.55;
    return { ok: true, clcrMlMin1_73m2: (k * alturaCm) / creatininaMgdL, kUsado: k, faixaEtaria: 'crianca' };
  }
  // Adolescente (≥13 anos, ≥156 meses): k é ESPECÍFICO POR SEXO.
  //
  // Correção PED-AUDIT-07: sexo ausente/indeterminado NUNCA aplica
  // automaticamente o coeficiente masculino (nem o feminino) — o cálculo
  // fica explicitamente impossível, retornado de forma estruturada, sem
  // inventar o sexo do paciente.
  if (sexo === undefined) {
    return {
      ok: false,
      erro: 'Não é possível calcular o clearance de creatinina pediátrico (Schwartz) para um adolescente (≥13 anos) sem o sexo do paciente — o coeficiente k é diferente para meninos (0,70) e meninas (0,55). Informe o sexo para calcular.',
      motivo: 'sexo_ausente_para_adolescente',
    };
  }
  const k = sexo === 'M' ? 0.70 : 0.55;
  return { ok: true, clcrMlMin1_73m2: (k * alturaCm) / creatininaMgdL, kUsado: k, faixaEtaria: 'adolescente' };
}

// ─── BANCO DE DOSES PEDIÁTRICAS ───────────────────────────────

/**
 * Resolução do risco estrutural de `doseFixa` (auditoria RM-36): a versão
 * anterior representava faixas como chaves de string livres (`"3–15kg"`,
 * `"1–2 anos"`, `">2 anos"`), e a UNIDADE (kg/meses/anos) era inferida por
 * parsing textual da própria chave (`faixa.includes('anos')`). Uma entrada
 * futura como `"0-2": 100` (sem sufixo de unidade) seria silenciosamente
 * tratada como PESO por esse parser — sem nenhuma checagem estrutural que
 * pudesse rejeitá-la. `unidade` agora é um campo TIPADO e OBRIGATÓRIO,
 * nunca inferido de texto.
 */
export type UnidadeFaixaDose = 'kg' | 'meses' | 'anos';

/**
 * Faixa de dose fixa, com intervalo semiaberto (minimo, maximo] — minimo é
 * EXCLUSIVO, maximo é INCLUSIVO. `maximo` ausente = sem teto superior
 * (faixa aberta no topo, equivalente ao antigo ">40kg"). Essa convenção
 * (em vez de min/max ambos inclusivos) elimina por construção a
 * possibilidade de duas faixas adjacentes ambas reivindicarem o mesmo
 * valor de fronteira — bug real encontrado nesta auditoria: as faixas
 * antigas de oseltamivir "3–15kg" e "15–23kg" eram ambas min/max
 * INCLUSIVOS, então um paciente com EXATAMENTE 15 kg batia nas DUAS
 * faixas simultaneamente; como o código não parava no primeiro match,
 * a última faixa declarada (a mais alta, "15–23kg" → 45mg) sempre vencia
 * silenciosamente — mesmo quando a diretriz clínica real (CDC/AAP) usa
 * "≤15kg: 30mg" (ou seja, o paciente de 15kg exato deveria receber a
 * dose MENOR). `validarFaixasDoseFixa()` (abaixo) rejeita qualquer
 * sobreposição remanescente em tempo de carga do módulo.
 */
export interface FaixaDoseFixa {
  unidade: UnidadeFaixaDose;
  minimo: number;
  maximo?: number;
  doseMg: number;
}

export interface PediatricDoseEntry {
  drugId: string;
  drugName: string;
  indicacoes: {
    nome: string;
    doseMgKg?: number;          // mg/kg/dose
    doseMgKgDia?: number;       // mg/kg/DIA (dividir pelas tomadas)
    doseMcgKg?: number;         // mcg/kg/dose
    doseMgM2?: number;          // mg/m²/dose
    doseFixa?: FaixaDoseFixa[]; // dose fixa por faixa (unidade explícita e tipada — ver FaixaDoseFixa)
    frequencia: string;
    divisoes?: number;          // nº de tomadas/dia se doseMgKgDia
    maxDoseMg?: number;
    maxDoseMgKgDia?: number;
    /**
     * Resolução UNIT-AUDIT-04 (auditoria RM-36): quando o campo estruturado
     * `maxDoseMgKgDia` diverge de um valor citado em fonte secundária/texto
     * livre e a origem clínica da divergência não pôde ser confirmada com
     * segurança a partir das fontes disponíveis neste repositório, este
     * campo documenta a divergência de forma explícita e RASTREÁVEL — em
     * vez de escolher silenciosamente um dos dois valores ou inventar uma
     * fonte. Quando preenchido, `calcDosePediatrica()` sempre emite um
     * alerta de "pendente de validação farmacêutica", nunca apresentando o
     * teto numérico como definitivamente validado.
     */
    maxDoseMgKgDiaPendenteValidacao?: string;
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
      doseFixa: [
        { unidade: 'kg', minimo: 0, maximo: 15, doseMg: 30 },
        { unidade: 'kg', minimo: 15, maximo: 23, doseMg: 45 },
        { unidade: 'kg', minimo: 23, maximo: 40, doseMg: 60 },
        { unidade: 'kg', minimo: 40, doseMg: 75 },
      ],
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
      doseFixa: [
        { unidade: 'anos', minimo: 0, maximo: 2, doseMg: 200 },
        { unidade: 'anos', minimo: 2, doseMg: 400 },
      ],
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
    /**
     * ═══════════════════════════════════════════════════════════════
     * RESOLUÇÃO UNIT-AUDIT-04 (auditoria RM-36) — auditoria de origem
     * ═══════════════════════════════════════════════════════════════
     *
     * ACHADO ORIGINAL: `maxDoseMgKgDia: 0.75` (campo estruturado) divergia
     * de "Máx 2,4 mg/kg/dia" (texto livre em `alertas`) — fator ~3,2×.
     *
     * FONTES DE DADOS DA DOMPERIDONA localizadas no repositório:
     *   1. Esta entrada (pediatric-engine.ts) — única fonte com dose
     *      PEDIÁTRICA estruturada (mg/kg).
     *   2. pharma-database.ts (id:'domperidona') — dose ADULTA fixa apenas
     *      (10 mg 3×/dia, máx 30 mg/dia absoluto); nenhuma dose mg/kg.
     *   3. eurofarma-sync.ts (euro-domperix) — bula ANVISA/Eurofarma,
     *      também só dose ADULTA fixa (10 mg 3×/dia, máx 30 mg/dia); a
     *      bula não contempla população pediátrica em
     *      `uso_populacoes_especiais`.
     *   Nenhuma das fontes 2/3 cita mg/kg pediátrico — não há uma segunda
     *   fonte estruturada no repositório para comparar contra o valor de
     *   2,4 mg/kg/dia; ele existe SOMENTE no texto livre desta entrada.
     *
     * ANÁLISE DE SEMÂNTICA CLÍNICA (dose por tomada vs. dose diária):
     *   - `doseMgKg: 0.25` = mg/kg POR DOSE (documentado no comentário do
     *     tipo `PediatricDoseEntry.doseMgKg`: "mg/kg/dose").
     *   - `frequencia: 'a cada 8h'` = 3 tomadas/dia (24h ÷ 8h = 3).
     *   - `instrucoes` confirma explicitamente: "0,25 mg/kg/dose 3×/dia".
     *   - 0,25 mg/kg/dose × 3 tomadas/dia = 0,75 mg/kg/dia EXATAMENTE.
     *   → `maxDoseMgKgDia: 0.75` é matematicamente CONSISTENTE com o
     *     regime pediátrico efetivamente modelado nesta entrada (não é
     *     um valor arbitrário nem um erro de transcrição do 0,25/3×).
     *   - O regime neonatal alternativo citado em `instrucoes`
     *     ("DRGE neonatal: 0,2 mg/kg/dose 8/8h") dá 0,2×3 = 0,6 mg/kg/dia
     *     — ainda mais conservador, também nunca chega perto de 2,4.
     *
     *   O número "2,4 mg/kg/dia" NÃO É explicado por nenhuma combinação
     *   dose×frequência efetivamente modelada nesta entrada. Não é um
     *   erro de unidade (ambos já em mg/kg/dia), nem de transcrição do
     *   0,25 (0,25×3=0,75, não 2,4). É plausivelmente um valor de uma
     *   fonte/regime DIFERENTE (ex.: protocolos mais antigos, anteriores
     *   à revisão de segurança da EMA de 2014, que restringiu
     *   significativamente as doses de domperidona por risco de
     *   prolongamento de QT/morte súbita cardíaca) — mas isso é uma
     *   HIPÓTESE, não uma confirmação, pois este repositório não contém
     *   o texto integral do ESPGHAN 2022 nem da bula ANVISA 2023 citados
     *   em `fontes` para verificar qual valor eles de fato recomendam.
     *
     * DECISÃO (sem inventar, sem escolher silenciosamente):
     *   - Mantido `maxDoseMgKgDia: 0.75` como ÚNICA fonte estruturada de
     *     verdade e teto REALMENTE ENFORÇADO pelo código — por ser o
     *     valor internamente consistente com o regime documentado E o
     *     mais conservador/seguro entre os dois (em caso de dúvida
     *     clínica, o valor mais restritivo é o default responsável).
     *   - REMOVIDO o "Máx 2,4 mg/kg/dia" de `alertas` como afirmação de
     *     fato — apresentá-lo sem validação seria mostrar uma informação
     *     não confirmada como se fosse dado validado.
     *   - ADICIONADO `maxDoseMgKgDiaPendenteValidacao` (ver abaixo),
     *     que faz `calcDosePediatrica()` emitir um alerta explícito de
     *     PENDÊNCIA DE VALIDAÇÃO FARMACÊUTICA sempre que esta dose for
     *     calculada — a divergência fica rastreável e visível ao
     *     prescritor, nunca escondida nem resolvida por suposição.
     * ═══════════════════════════════════════════════════════════════
     */
    indicacoes: [{
      nome: 'Refluxo gastroesofágico / Vômitos pós-prandiais',
      // `divisoes: 3` adicionado nesta correção — sem ele, a dose TOTAL
      // DIÁRIA calculada (doseTotalDiaMg) ficava igual à dose de UMA
      // tomada (2,5 mg em vez de 7,5 mg para um paciente de 10 kg),
      // fazendo o teto `maxDoseMgKgDia` nunca ser efetivamente
      // verificado contra o total diário real (mesma classe de bug do
      // PED-AUDIT-04, aqui presente nesta entrada específica).
      doseMgKg: 0.25, frequencia: 'a cada 8h', divisoes: 3,
      maxDoseMg: 10, maxDoseMgKgDia: 0.75,
      maxDoseMgKgDiaPendenteValidacao: 'Fonte secundária (texto legado) citava "Máx 2,4 mg/kg/dia", incompatível com o regime modelado (0,25 mg/kg/dose × 3×/dia = 0,75 mg/kg/dia) e não confirmável contra ESPGHAN 2022/ANVISA 2023 a partir das fontes disponíveis. Teto enforçado nesta versão: 0,75 mg/kg/dia (mais conservador). Requer validação farmacêutica antes de qualquer revisão.',
      idadeMinMeses: 0,
      instrucoes: '0,25 mg/kg/dose 3×/dia 15–30 min antes das refeições. DRGE neonatal: 0,2 mg/kg/dose 8/8h.',
      alertas: ['QT prolongado em prematuros — monitorar ECG', 'ANVISA: uso pediátrico apenas sob prescrição médica'],
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
      // Correção PED-AUDIT-05 (auditoria RM-36): `doseMgKg: 0` era um
      // placeholder — mas `0` é falsy em JS, então `else if (indicEntry.doseMgKg)`
      // em calcDosePediatrica NUNCA entrava nesse ramo, deixando
      // doseUnitariaMg/doseUnitariaTexto sempre nulos/vazios mesmo com dados
      // válidos disponíveis (a posologia real é por mL/kg, documentada em
      // `instrucoes`, não em mg/kg). Removido o campo em vez de um valor
      // falsy, para não simular uma dose estruturada que não existe.
      nome: 'Constipação intestinal',
      frequencia: '1–3×/dia',
      idadeMinMeses: 0,
      instrucoes: 'Lactente: 1–2 mL/kg/dia ÷ 2–3 tomadas. 1–5 anos: 5–10 mL/dia. 6–12 anos: 10–15 mL/dia. Encefalopatia: dose dobrada até 2–3 evacuações/dia.',
    }],
    formulacoes: [
      { forma: 'Xarope', concentracao: '667 mg/mL (3,33 mL = 2,22 g)', instrucoes: 'Pode misturar em suco ou leite' },
    ],
    fontes: ['SBP 2023'],
  },
];

/**
 * Validação estrutural obrigatória de uma lista de `FaixaDoseFixa` (RM-36).
 * Não depende de parsing de string — valida diretamente os campos tipados.
 * Retorna a lista de erros encontrados (vazia = válido); nunca lança por si
 * só, para poder ser exercida por testes de schema com dados
 * propositalmente inválidos sem precisar de try/catch em cada caso.
 *
 * Regras aplicadas (cobertura exigida pela auditoria RM-36):
 *   - toda faixa deve ter `unidade` ∈ {'kg','meses','anos'} — nunca ausente
 *     nem um valor desconhecido;
 *   - `minimo` deve ser um número finito ≥ 0;
 *   - `maximo`, quando presente, deve ser um número finito e MAIOR que
 *     `minimo` (rejeita faixa invertida ou vazia — ex.: minimo=10,
 *     maximo=5, ou minimo=10, maximo=10);
 *   - `doseMg` deve ser um número finito > 0 (rejeita dose ausente/zero/
 *     negativa);
 *   - dentro da MESMA unidade, nenhuma faixa pode se sobrepor a outra no
 *     intervalo semiaberto (minimo, maximo] — ver comentário de
 *     `FaixaDoseFixa` para o porquê desse intervalo.
 */
export function validarFaixasDoseFixa(faixas: FaixaDoseFixa[], contexto: string): string[] {
  const erros: string[] = [];
  const UNIDADES_VALIDAS: UnidadeFaixaDose[] = ['kg', 'meses', 'anos'];

  faixas.forEach((f, i) => {
    const rotulo = `${contexto} [faixa ${i}]`;
    if (f === null || typeof f !== 'object') {
      erros.push(`${rotulo}: faixa não é um objeto válido`);
      return;
    }
    if (!UNIDADES_VALIDAS.includes(f.unidade)) {
      erros.push(`${rotulo}: unidade "${String(f.unidade)}" ausente ou desconhecida — deve ser 'kg', 'meses' ou 'anos'`);
    }
    if (typeof f.minimo !== 'number' || !Number.isFinite(f.minimo) || f.minimo < 0) {
      erros.push(`${rotulo}: minimo inválido (${String(f.minimo)}) — deve ser um número finito ≥ 0`);
    }
    if (f.maximo !== undefined && (typeof f.maximo !== 'number' || !Number.isFinite(f.maximo))) {
      erros.push(`${rotulo}: maximo inválido (${String(f.maximo)}) — deve ser um número finito quando presente`);
    }
    if (typeof f.minimo === 'number' && typeof f.maximo === 'number' && Number.isFinite(f.minimo) && Number.isFinite(f.maximo) && f.maximo <= f.minimo) {
      erros.push(`${rotulo}: faixa invertida ou vazia — maximo (${f.maximo}) deve ser maior que minimo (${f.minimo})`);
    }
    if (typeof f.doseMg !== 'number' || !Number.isFinite(f.doseMg) || f.doseMg <= 0) {
      erros.push(`${rotulo}: dose ausente ou inválida (${String(f.doseMg)}) — deve ser um número > 0`);
    }
  });

  // Sobreposição ambígua: duas faixas da MESMA unidade cujos intervalos
  // semiabertos (minimo, maximo] se cruzam — nunca deve existir mais de
  // uma faixa correspondente para um mesmo valor de entrada. Interseção de
  // (aMin, aMax] com (bMin, bMax]: aMin < bMax && bMin < aMax.
  for (let i = 0; i < faixas.length; i++) {
    for (let j = i + 1; j < faixas.length; j++) {
      const a = faixas[i];
      const b = faixas[j];
      if (!a || !b || a.unidade !== b.unidade) continue;
      const aMax = a.maximo ?? Infinity;
      const bMax = b.maximo ?? Infinity;
      if (a.minimo < bMax && b.minimo < aMax) {
        erros.push(`${contexto}: faixas [${i}] (${a.unidade} (${a.minimo}, ${a.maximo ?? '∞'}]) e [${j}] (${b.unidade} (${b.minimo}, ${b.maximo ?? '∞'}]) se sobrepõem de forma ambígua`);
      }
    }
  }

  return erros;
}

// Validação em tempo de carga do módulo (fail-fast): qualquer entrada de
// PEDIATRIC_DOSES com `doseFixa` estruturalmente inválido lança
// imediatamente na importação — nunca chega a calcular uma dose real com
// dados malformados.
(() => {
  const erros: string[] = [];
  for (const entry of PEDIATRIC_DOSES) {
    for (const indic of entry.indicacoes) {
      if (indic.doseFixa) {
        erros.push(...validarFaixasDoseFixa(indic.doseFixa, `${entry.drugId} / ${indic.nome}`));
      }
    }
  }
  if (erros.length > 0) {
    throw new Error(`PEDIATRIC_DOSES: faixas de doseFixa estruturalmente inválidas:\n${erros.join('\n')}`);
  }
})();

// ─── FUNÇÃO PRINCIPAL: CALCULAR DOSE PEDIÁTRICA ───────────────
export function calcDosePediatrica(
  drugId: string,
  patient: PediatricPatient,
  indicacao?: string,
): PediatricDoseResult | null {
  const entry = PEDIATRIC_DOSES.find(d => d.drugId === drugId);
  if (!entry) return null;

  const usaIdadeCorrigida = patient.idadeGestacionalSemanas !== undefined && patient.idadePostNatalDias !== undefined;
  const idadeEfetiva = usaIdadeCorrigida
    ? calcIdadeCorrigida(patient.idadeGestacionalSemanas!, patient.idadePostNatalDias!).mesesCorrigidos
    : patient.idadeMeses;

  /**
   * Correção PED-AUDIT-02 (auditoria RM-36 — crítico): quando nenhuma
   * `indicacao` era passada, o código sempre usava `entry.indicacoes[0]`,
   * ignorando `idadeMinMeses`/`idadeMaxMeses` de cada indicação. Para
   * aciclovir, `indicacoes[0]` é o regime NEONATAL (20 mg/kg IV 8/8h,
   * idadeMaxMeses:3, SEM maxDoseMg — apropriado só até 3 meses de vida).
   * Qualquer chamador que não especificasse `indicacao` explicitamente
   * (`calcDosePediatrica('aciclovir', patient)` — usado de fato em
   * simulation-phase22-3.ts, stress-test-phase22-4.ts,
   * validate-extreme-data.ts) recebia esse regime neonatal MESMO para uma
   * criança de 5 anos, sem cap de dose. Corrigido para selecionar, entre
   * as indicações do medicamento, a primeira cuja faixa etária realmente
   * contém `idadeEfetiva` — só cai de volta a `indicacoes[0]` se nenhuma
   * faixa etária bater (comportamento anterior, preservado como fallback).
   */
  const indicEntry = indicacao
    ? entry.indicacoes.find(i => i.nome.toLowerCase().includes(indicacao.toLowerCase()))
    : (entry.indicacoes.find(i =>
        (i.idadeMinMeses === undefined || idadeEfetiva >= i.idadeMinMeses) &&
        (i.idadeMaxMeses === undefined || idadeEfetiva <= i.idadeMaxMeses),
      ) ?? entry.indicacoes[0]);
  if (!indicEntry) return null;

  // Verificar idade mínima e máxima — ambas checadas mesmo quando a
  // indicação foi passada explicitamente pelo chamador (defesa em
  // profundidade: um chamador pode pedir uma indicação existente mas
  // inadequada para a idade do paciente).
  const alertas: string[] = [...(indicEntry.alertas ?? []), ...(entry.contraindPediatrica ?? [])];
  if (indicEntry.idadeMinMeses !== undefined && idadeEfetiva < indicEntry.idadeMinMeses) {
    alertas.unshift(`⚠ CONTRAINDICADO: idade mínima ${indicEntry.idadeMinMeses} meses. Paciente tem ${idadeEfetiva} meses.`);
  }
  if (indicEntry.idadeMaxMeses !== undefined && idadeEfetiva > indicEntry.idadeMaxMeses) {
    alertas.unshift(`⚠ CONTRAINDICADO: esta indicação é válida até ${indicEntry.idadeMaxMeses} meses. Paciente tem ${idadeEfetiva} meses — reavaliar indicação/dose apropriada para a idade.`);
  }

  // Calcular dose
  let doseUnitariaMg: number | null = null;
  let doseUnitariaTexto = '';
  let doseTotalDiaMg: number | null = null;

  if (indicEntry.doseFixa) {
    // Dose fixa por faixa TIPADA (campo `unidade` explícito: 'kg' | 'meses' |
    // 'anos') — nunca inferida por parsing de texto de uma chave de string.
    // Ver comentário completo em `FaixaDoseFixa` (definição do tipo, acima)
    // para o histórico do bug estrutural corrigido (RM-36) e o motivo do
    // intervalo semiaberto (minimo, maximo]. `validarFaixasDoseFixa()` roda
    // em tempo de carga do módulo (logo abaixo de `PEDIATRIC_DOSES`) e
    // GARANTE, para toda entrada cadastrada, que as faixas de cada indicação
    // nunca se sobrepõem, têm unidade válida e dose > 0 — o `find()` abaixo
    // pode assumir, por construção, no máximo uma faixa correspondente.
    const idadeAnos = idadeEfetiva / 12;
    const faixaCorrespondente = indicEntry.doseFixa.find(f => {
      const valorComparado = f.unidade === 'kg' ? patient.pesoKg : f.unidade === 'meses' ? idadeEfetiva : idadeAnos;
      return valorComparado > f.minimo && (f.maximo === undefined || valorComparado <= f.maximo);
    });
    doseUnitariaMg = faixaCorrespondente?.doseMg ?? null;
    doseUnitariaTexto = faixaCorrespondente ? `${faixaCorrespondente.doseMg} mg` : 'Ver tabela de dose por faixa';
  } else if (indicEntry.doseMgKg) {
    doseUnitariaMg = indicEntry.doseMgKg * patient.pesoKg;
    if (indicEntry.maxDoseMg) doseUnitariaMg = Math.min(doseUnitariaMg, indicEntry.maxDoseMg);
    doseUnitariaTexto = `${doseUnitariaMg.toFixed(0)} mg/dose (${indicEntry.doseMgKg} mg/kg)`;
    // Correção PED-AUDIT-04 (auditoria RM-36 — médio): quando a entrada só
    // declara dose POR TOMADA (`doseMgKg`) + `divisoes` (nº de tomadas/dia),
    // o total diário nunca era multiplicado por `divisoes` — o fallback
    // abaixo (`doseTotalDiaMg ?? doseUnitariaMg`) tratava o total diário
    // como se fosse igual à dose de UMA tomada, subestimando o total real
    // por um fator de `divisoes` (ex.: paracetamol 4x/dia exibia "total
    // diário" = dose de uma única tomada, 4x menor que o real).
    if (indicEntry.divisoes) doseTotalDiaMg = doseUnitariaMg * indicEntry.divisoes;
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

  // Correção PED-AUDIT-03 (auditoria RM-36 — alto): `maxDoseMgKgDia` era um
  // campo de dados declarado e preenchido (ex.: SMZ-TMP: 12 mg/kg/dia) mas
  // NUNCA lido por esta função — o teto diário por peso não era aplicado a
  // nenhum medicamento, mesmo quando não havia `maxDoseMg` (por tomada)
  // para servir de proteção substituta (confusão entre limite MÁXIMO POR
  // DOSE e limite MÁXIMO POR DIA).
  if (indicEntry.maxDoseMgKgDia && doseTotalDiaMg) {
    const tetoDiario = indicEntry.maxDoseMgKgDia * patient.pesoKg;
    if (doseTotalDiaMg > tetoDiario) {
      alertas.unshift(`Dose diária calculada (${doseTotalDiaMg.toFixed(0)} mg/dia) excede o máximo de ${indicEntry.maxDoseMgKgDia} mg/kg/dia (${tetoDiario.toFixed(0)} mg/dia). Ajustar para o teto.`);
      doseTotalDiaMg = tetoDiario;
      if (indicEntry.divisoes) doseUnitariaMg = doseTotalDiaMg / indicEntry.divisoes;
    }
  }

  // Resolução UNIT-AUDIT-04 (auditoria RM-36): quando o teto mg/kg/dia tem
  // uma divergência de fonte não resolvida (ver
  // `maxDoseMgKgDiaPendenteValidacao` na definição da entrada), o teto
  // numérico é enforçado normalmente acima (valor mais conservador), mas
  // NUNCA é apresentado ao prescritor como definitivamente validado —
  // este alerta torna a pendência visível em toda chamada, sem esconder a
  // divergência nem exigir que o código "resolva" sozinho uma questão de
  // fonte farmacêutica.
  if (indicEntry.maxDoseMgKgDiaPendenteValidacao) {
    alertas.unshift(`⚠ PENDENTE DE VALIDAÇÃO FARMACÊUTICA: ${indicEntry.maxDoseMgKgDiaPendenteValidacao}`);
  }

  // Restrição de dose máxima (por tomada)
  if (indicEntry.maxDoseMg && doseUnitariaMg && doseUnitariaMg > indicEntry.maxDoseMg) {
    alertas.unshift(`Dose calculada (${doseUnitariaMg.toFixed(0)} mg) excede máximo permitido (${indicEntry.maxDoseMg} mg/dose). Usar ${indicEntry.maxDoseMg} mg.`);
    doseUnitariaMg = indicEntry.maxDoseMg;
  }

  // Selecionar formulação
  //
  // Resolução PED-AUDIT-06 (auditoria RM-36): `getFormulacaoPediatrica`
  // antes usava `patient.idadeMeses` (idade CRONOLÓGICA) para casar contra
  // `formulacoes[].faixaMeses`, enquanto a elegibilidade de dose acima
  // (idadeMinMeses/idadeMaxMeses, seleção de indicação, faixas de doseFixa
  // por idade) já usa `idadeEfetiva` (idade CORRIGIDA quando há dados
  // gestacionais). Um prematuro cuja idade corrigida e cronológica caem em
  // faixas etárias DIFERENTES podia receber uma dose calculada para um
  // estágio de maturidade e uma formulação sugerida para outro.
  //
  // REGRA CLÍNICA IMPLEMENTADA:
  //   - Faixa etária da formulação (`faixaMeses`) É um proxy para o MESMO
  //     estágio de maturidade fisiológica/de desenvolvimento que já
  //     determina a elegibilidade da dose (capacidade de deglutir,
  //     maturidade do trato GI) — por isso agora usa a MESMA base
  //     (`idadeEfetiva`) para consistência. Prematuridade não deve
  //     influenciar a dose por um lado e a formulação por outro,
  //     silenciosamente.
  //   - Faixa de PESO da formulação (`faixaKg`) continua usando
  //     `patient.pesoKg` (peso ATUAL medido) sem qualquer alteração — não
  //     existe "peso corrigido" em pediatria; peso é sempre uma medida
  //     direta e objetiva do paciente no momento presente.
  //   - Para um paciente a termo (sem dados gestacionais), `idadeEfetiva`
  //     é idêntica a `idadeMeses` — nenhuma mudança de comportamento.
  const formulacao = getFormulacaoPediatrica(entry, patient, idadeEfetiva, usaIdadeCorrigida);

  // Quando a idade corrigida diverge da cronológica a ponto de mudar QUAL
  // formulação seria escolhida, isso é tornado explícito ao prescritor —
  // nunca uma troca silenciosa de base de idade.
  if (formulacao.baseIdadeUsada === 'corrigida') {
    const formulacaoPorCronologica = getFormulacaoPediatrica(entry, patient, patient.idadeMeses, false);
    if (formulacaoPorCronologica.forma !== formulacao.forma || formulacaoPorCronologica.concentracao !== formulacao.concentracao) {
      alertas.push(
        `ℹ Formulação selecionada pela idade CORRIGIDA (${idadeEfetiva} meses, prematuridade): ${formulacao.forma} (${formulacao.concentracao}). ` +
        `Pela idade cronológica (${patient.idadeMeses} meses) seria: ${formulacaoPorCronologica.forma} (${formulacaoPorCronologica.concentracao}).`,
      );
    }
  }

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
    formulacaoBaseIdade: formulacao.baseIdadeUsada,
    volumeCalculado,
    alertas,
    idadeMinima: indicEntry.idadeMinMeses !== undefined ? `${indicEntry.idadeMinMeses} meses` : 'Sem restrição documentada',
    ajusteEspecial: indicEntry.instrucoes,
    fonte: entry.fontes.join(' | '),
  };
}

/**
 * Seleciona a formulação pediátrica apropriada.
 *
 * `idadeMesesParaFaixaEtaria` é a idade (em meses) usada para casar contra
 * `formulacoes[].faixaMeses` — o CHAMADOR decide qual base de idade
 * (corrigida ou cronológica) é apropriada (ver PED-AUDIT-06 em
 * `calcDosePediatrica`). `faixaKg` sempre usa `patient.pesoKg` (peso
 * atual/medido), independentemente da idade usada para `faixaMeses`.
 */
function getFormulacaoPediatrica(
  entry: PediatricDoseEntry,
  patient: PediatricPatient,
  idadeMesesParaFaixaEtaria: number,
  usouIdadeCorrigida: boolean,
): { forma: string; concentracao: string; instrucoes?: string; baseIdadeUsada: 'corrigida' | 'cronologica' } {
  const matching = entry.formulacoes.filter(f => {
    const okKg = !f.faixaKg || (patient.pesoKg >= f.faixaKg[0] && patient.pesoKg < f.faixaKg[1]);
    const okMeses = !f.faixaMeses || (idadeMesesParaFaixaEtaria >= f.faixaMeses[0] && idadeMesesParaFaixaEtaria < f.faixaMeses[1]);
    return okKg && okMeses;
  });
  return {
    ...(matching[0] ?? entry.formulacoes[0] ?? { forma: 'Consultar bula', concentracao: 'N/D' }),
    // Correção: `baseIdadeUsada` deve refletir se dados gestacionais foram
    // efetivamente usados para calcular `idadeMesesParaFaixaEtaria` — NUNCA
    // inferido comparando os dois números por igualdade. Um recém-nascido
    // prematuro pode ter idade corrigida IGUAL à cronológica por
    // coincidência numérica (ex.: ambas 0 meses logo após o nascimento);
    // comparar valores mascararia que a correção FOI de fato aplicada.
    baseIdadeUsada: usouIdadeCorrigida ? 'corrigida' : 'cronologica',
  };
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
