// ============================================================
// PRESCREVE-AI — Motor Oncológico + Hematológico (Phase 21.12)
// Antiemese · Neutropenia Febril · SLT · Fatores de Crescimento
// Anticoagulação Oncológica · ECOG · CTCAE · Profilaxias
// ============================================================

// ─── TIPOS BASE ───────────────────────────────────────────────

export type EcogPS = 0 | 1 | 2 | 3 | 4 | 5;

export interface OncologyPatient {
  idadeAnos: number;
  sexo: 'M' | 'F';
  ecogPS: EcogPS;
  pesoKg: number;
  alturaCm: number;
  scm2?: number;                         // superfície corporal (calculada se ausente)
  crClmLMin?: number;                    // ClCr Cockroft-Gault
  bilirrubina?: number;                  // mg/dL
  tgo?: number;                          // AST U/L
  tgp?: number;                          // ALT U/L
  diagnostico: string;
  esquemaQuimio: string[];               // IDs dos drogas do esquema atual
  cicloAtual?: number;
  neutrofilosAbsolutos?: number;         // /mm³
  hemoglobina?: number;                  // g/dL
  plaquetas?: number;                    // /mm³
  temperatura?: number;                  // °C
}

// ─── SUPERFÍCIE CORPORAL (BSA) ────────────────────────────────

export function calcBSAMosteller(pesoKg: number, alturaCm: number): number {
  return Math.sqrt((pesoKg * alturaCm) / 3600);
}

export function calcBSADuBois(pesoKg: number, alturaCm: number): number {
  return 0.007184 * Math.pow(alturaCm, 0.725) * Math.pow(pesoKg, 0.425);
}

// ─── ECOG PERFORMANCE STATUS ─────────────────────────────────

export const ECOG_SCALE: Record<EcogPS, { descricao: string; implicacao: string }> = {
  0: { descricao: 'Assintomático — atividade normal', implicacao: 'Quimioterapia plena indicada' },
  1: { descricao: 'Sintomático, mas ambulatorial — restrição para atividade extenuante', implicacao: 'QT plena na maioria dos esquemas' },
  2: { descricao: 'Sintomático, no leito < 50% do dia', implicacao: 'QT com cautela — redução de dose pode ser necessária. Avaliação caso a caso.' },
  3: { descricao: 'Sintomático, no leito > 50% do dia — incapaz de autocuidado', implicacao: 'QT paliativa de baixa intensidade ou suporte clínico. Evitar esquemas agressivos.' },
  4: { descricao: 'Acamado e incapaz de autocuidado', implicacao: 'Contraindicação relativa à QT sistêmica. Cuidados paliativos.' },
  5: { descricao: 'Óbito', implicacao: 'N/A' },
};

// ─── POTENCIAL EMETOGÊNICO DOS QUIMIOTERÁPICOS ───────────────

export type EmetogenicRisk = 'alto' | 'moderado' | 'baixo' | 'mínimo';

export const EMETOGENIC_RISK: Record<string, EmetogenicRisk> = {
  // Alto (> 90%)
  'cisplatina': 'alto',
  'carmustina': 'alto',
  'ciclofosfamida-alta-dose': 'alto',
  'dacarbazina': 'alto',
  'mecloretamina': 'alto',
  'estreptozocina': 'alto',
  'doxorrubicina-alta-dose': 'alto',
  // Moderado (30–90%)
  'oxaliplatina': 'moderado',
  'carboplatina': 'moderado',
  'ciclofosfamida-baixa-dose': 'moderado',
  'doxorrubicina': 'moderado',
  'epirrubicina': 'moderado',
  'irinotecano': 'moderado',
  'ifosfamida': 'moderado',
  'idarrubicina': 'moderado',
  'daunorrubicina': 'moderado',
  'arabinósido-de-citosina-alta-dose': 'moderado',
  'temozolomida': 'moderado',
  'bendamustina': 'moderado',
  'azacitidina': 'moderado',
  'trabectedina': 'moderado',
  // Baixo (10–30%)
  'paclitaxel': 'baixo',
  'docetaxel': 'baixo',
  'fluorouracil': 'baixo',
  'gencitabina': 'baixo',
  'pemetrexede': 'baixo',
  'etoposídeo': 'baixo',
  'mitomicina': 'baixo',
  'mitoxantrona': 'baixo',
  'topotecan': 'baixo',
  'bortezomibe': 'baixo',
  'capecitabina': 'baixo',
  'metotrexato-baixo': 'baixo',
  'trastuzumabe-emtansina': 'baixo',
  // Mínimo (< 10%)
  'vincristina': 'mínimo',
  'vinorelbina': 'mínimo',
  'bleomicina': 'mínimo',
  'bevacizumabe': 'mínimo',
  'pembrolizumabe': 'mínimo',
  'nivolumabe': 'mínimo',
  'rituximabe': 'mínimo',
  'trastuzumabe': 'mínimo',
  'erlotinibe': 'mínimo',
  'imatinibe': 'baixo',
  'dasatinibe': 'baixo',
};

// ─── PROTOCOLO DE ANTIEMESE (MASCC / ASCO 2020) ──────────────

export interface AntiemeticProtocol {
  risco: EmetogenicRisk;
  agudaRegime: { drug: string; dose: string; via: string; timing: string }[];
  tardiaRegime?: { drug: string; dose: string; via: string; timing: string }[];
  observacoes: string[];
  drogas_alternativas?: string[];
}

export const ANTIEMETIC_PROTOCOLS: Record<EmetogenicRisk, AntiemeticProtocol> = {
  alto: {
    risco: 'alto',
    agudaRegime: [
      { drug: 'Palonossetrona', dose: '0,25 mg IV (ou 0,5 mg VO)', via: 'IV/VO', timing: '30 min antes da QT (D1)' },
      { drug: 'Aprepitanto', dose: '125 mg VO (D1)', via: 'VO', timing: '1h antes da QT (D1)' },
      { drug: 'Dexametasona', dose: '12 mg IV ou VO (D1)', via: 'IV/VO', timing: '30 min antes da QT (D1)' },
      { drug: 'Olanzapina', dose: '10 mg VO (D1)', via: 'VO', timing: 'À noite (D1) — 4ª droga em esquemas AC' },
    ],
    tardiaRegime: [
      { drug: 'Aprepitanto', dose: '80 mg VO (D2 e D3)', via: 'VO', timing: 'Manhã de D2 e D3' },
      { drug: 'Dexametasona', dose: '8 mg VO (D2–D4)', via: 'VO', timing: 'Manhã de D2–D4' },
      { drug: 'Olanzapina', dose: '10 mg VO (D2–D4)', via: 'VO', timing: 'À noite D2–D4' },
    ],
    observacoes: [
      'Esquema AC (antracíclina + ciclofosfamida): considerado alto emetogênico — usar 4 drogas (5-HT3 + NK1 + DEX + olanzapina)',
      'Fosaprepitanto 150 mg IV pode substituir aprepitanto oral (D1 apenas)',
      'Netupitanto/palonossetrona (NEPA) é alternativa de dose única',
      'Olanzapina: sedação diurna — meia dose (5 mg) se idoso ou ECOG ≥ 2',
    ],
  },
  moderado: {
    risco: 'moderado',
    agudaRegime: [
      { drug: 'Palonossetrona', dose: '0,25 mg IV (ou 0,5 mg VO)', via: 'IV/VO', timing: '30 min antes da QT (D1)' },
      { drug: 'Dexametasona', dose: '8–12 mg IV ou VO (D1)', via: 'IV/VO', timing: '30 min antes da QT' },
    ],
    tardiaRegime: [
      { drug: 'Dexametasona', dose: '8 mg VO (D2–D3)', via: 'VO', timing: 'Manhã' },
    ],
    observacoes: [
      'Carboplatina AUC ≥ 4: adicionar aprepitanto (tratar como alto risco)',
      'Oxaliplatina: NK1 opcional se vômito tardio problemático',
      'Ciclofosfamida (dose moderada): NK1 recomendado se histórico de náusea refratária',
    ],
    drogas_alternativas: ['Ondansetrona 8 mg IV se palonossetrona indisponível', 'Granissetrona 1 mg IV'],
  },
  baixo: {
    risco: 'baixo',
    agudaRegime: [
      { drug: 'Dexametasona', dose: '8 mg IV ou VO', via: 'IV/VO', timing: '30 min antes da QT' },
    ],
    tardiaRegime: undefined,
    observacoes: [
      'Não indicado profilaxia de fase tardia rotineiramente',
      'Metoclopramida ou ondansetrona como resgate (náusea irruptiva)',
    ],
    drogas_alternativas: ['Metoclopramida 10–20 mg VO/IV como alternativa'],
  },
  mínimo: {
    risco: 'mínimo',
    agudaRegime: [],
    tardiaRegime: undefined,
    observacoes: [
      'Profilaxia antiemética de rotina não indicada',
      'Tratar apenas se náusea ocorrer (resgate: metoclopramida ou ondansetrona)',
    ],
  },
};

export function getAntiemeticProtocol(esquema: string[]): AntiemeticProtocol {
  const riscos = esquema.map(d => EMETOGENIC_RISK[d.toLowerCase()] ?? 'mínimo');
  const prioridade: EmetogenicRisk[] = ['alto', 'moderado', 'baixo', 'mínimo'];
  const piorRisco = prioridade.find(r => riscos.includes(r)) ?? 'mínimo';
  return ANTIEMETIC_PROTOCOLS[piorRisco];
}

// ─── NEUTROPENIA FEBRIL — MASCC SCORE ────────────────────────

export interface MASCCScore {
  pontuacao: number;
  risco: 'baixo' | 'alto';
  conduta: string;
  antibiotico: { regime: string; duracao: string }[];
}

export interface MASCCItem {
  criterio: string;
  pontos: number;
  pergunta: string;
}

export const MASCC_ITEMS: MASCCItem[] = [
  { criterio: 'Sintomas leves (assintomático ou sintomas leves)', pontos: 5, pergunta: 'Sintomas de neutropenia febril são leves ou ausentes?' },
  { criterio: 'Sem hipotensão (PAS > 90 mmHg)', pontos: 5, pergunta: 'Sem hipotensão (PAS > 90 mmHg)?' },
  { criterio: 'Ausência de DPOC', pontos: 4, pergunta: 'Sem DPOC ativa?' },
  { criterio: 'Tumor sólido ou sem infecção fúngica prévia', pontos: 4, pergunta: 'Tumor sólido (não hematológico) ou sem histórico de infecção fúngica?' },
  { criterio: 'Sem desidratação', pontos: 3, pergunta: 'Sem desidratação que requeira fluidos IV?' },
  { criterio: 'Paciente ambulatorial', pontos: 3, pergunta: 'Paciente era ambulatorial antes da febre (não internado)?' },
  { criterio: 'Idade < 60 anos', pontos: 2, pergunta: 'Idade < 60 anos?' },
];

export function calcMASCC(respostas: boolean[]): MASCCScore {
  const pontuacao = MASCC_ITEMS.reduce((s, item, i) => s + (respostas[i] ? item.pontos : 0), 0);
  const risco = pontuacao >= 21 ? 'baixo' : 'alto';

  if (risco === 'baixo') {
    return {
      pontuacao, risco,
      conduta: 'Baixo risco (MASCC ≥ 21): candidato a antibioticoterapia oral ambulatorial após período de observação de 4–12h. Alta hospitalar se estável.',
      antibiotico: [
        { regime: 'Amoxicilina/clavulanato 875/125 mg 12/12h VO + Ciprofloxacino 500 mg 12/12h VO', duracao: 'Até 48h afebril e neutrófilos > 500/mm³' },
        { regime: 'Alternativa oral: Ciprofloxacino 750 mg 12/12h (monoterapia — somente se sem profilaxia prévia com quinolona)', duracao: 'Até 48h afebril e neutrófilos > 500/mm³' },
      ],
    };
  }
  return {
    pontuacao, risco,
    conduta: 'Alto risco (MASCC < 21): internação e antibioticoterapia IV empírica imediata. Coletar hemoculturas ANTES dos antibióticos (2 pares).',
    antibiotico: [
      { regime: 'Piperacilina/tazobactam 4,5 g IV 6/6h', duracao: 'Mínimo 4 dias e até 48h afebril com neutrófilos > 500/mm³' },
      { regime: 'Cefepime 2 g IV 8/8h (alternativa)', duracao: 'Mínimo 4 dias' },
      { regime: 'Meropenem 1 g IV 8/8h (se suspeita de ESBL, instabilidade hemodinâmica ou mucosite grave)', duracao: 'Conforme evolução' },
      { regime: 'Adicionar vancomicina 15–20 mg/kg IV 12/12h se: suspeita de infecção cateter, pneumonia, celulite grave, hemicultura prévia com CGP', duracao: 'Rever em 48–72h com resultado de culturas' },
    ],
  };
}

// ─── SÍNDROME DE LISE TUMORAL (SLT) ──────────────────────────

export interface TumorLysisRisk {
  risco: 'alto' | 'intermediário' | 'baixo';
  criteriosDiagnosticos: string[];
  profilaxia: { drug: string; dose: string; duracao: string }[];
  monitoramento: string[];
  tratamento?: string[];
}

export const TUMOR_LYSIS_PROTOCOL: Record<string, TumorLysisRisk> = {
  alto: {
    risco: 'alto',
    criteriosDiagnosticos: [
      'LLA de células B com leucocitose > 100.000/mm³',
      'LLA de Burkitt',
      'LNH de alto grau (Burkitt, difuso de grandes células B) com carga tumoral alta',
      'LLC com contagem de linfócitos > 50.000 iniciando venetoclax',
      'AML com leucocitose > 100.000/mm³',
    ],
    profilaxia: [
      { drug: 'Rasburicase', dose: '0,2 mg/kg/dia IV (máx 7 dias)', duracao: '3–7 dias peri-quimioterapia' },
      { drug: 'Hiperhidratação', dose: '2–3 L/m²/dia IV (SG5% + SF 0,45% — sem KCl)', duracao: 'Iniciar 24–48h antes da QT' },
    ],
    monitoramento: [
      'Eletrólitos (K⁺, Ca²⁺, PO₄³⁻), ácido úrico, creatinina a cada 4–6h nas primeiras 24–48h',
      'Balanço hídrico rigoroso — diurese > 100 mL/m²/h',
      'Alcalinização urinária: NÃO recomendada (precipita fosfato de cálcio)',
    ],
    tratamento: [
      'Hiperuricemia: rasburicase IV — dissolve ácido úrico rapidamente',
      'Hipercalemia: kayexalate, gluconato de Ca, insulina + glicose, bicarbonato',
      'Hipocalcemia sintomática: gluconato de cálcio IV',
      'Hiperfosfatemia: quelantes (carbonato de cálcio, sevelamer)',
      'IRA oligúrica: diálise se eletrólitos descontrolados',
    ],
  },
  intermediário: {
    risco: 'intermediário',
    criteriosDiagnosticos: [
      'LNH agressivo com carga tumoral moderada',
      'Mieloma múltiplo com doença agressiva',
      'Neoplasias sólidas com alta sensibilidade (germinativa, small cell)',
      'AML com leucocitose 25.000–100.000/mm³',
    ],
    profilaxia: [
      { drug: 'Alopurinol', dose: '300 mg/dia VO (adultos) — iniciar 24–48h antes da QT', duracao: '7–10 dias peri-QT' },
      { drug: 'Hiperhidratação', dose: '1,5–2 L/m²/dia VO ou IV', duracao: 'Dias peri-QT' },
    ],
    monitoramento: [
      'Eletrólitos, ácido úrico, creatinina 2×/dia nas primeiras 48h',
      'Diurese mínima 80–100 mL/h',
    ],
  },
  baixo: {
    risco: 'baixo',
    criteriosDiagnosticos: [
      'Tumores sólidos com baixa sensibilidade ou carga tumoral baixa',
      'LLC estágio A/B com contagem < 50.000',
      'LNH indolente',
    ],
    profilaxia: [
      { drug: 'Hiperhidratação oral', dose: '2–3 L/dia VO', duracao: 'Período peri-QT' },
    ],
    monitoramento: [
      'Eletrólitos e creatinina basais e D3 após QT',
    ],
  },
};

// ─── CRITÉRIOS COMUNS DE TOXICIDADE (CTCAE v5 — simplificado) ─

export interface CTCAEGrade {
  grau: 1 | 2 | 3 | 4 | 5;
  descricao: string;
  conduta: string;
}

export const CTCAE_NEUTROPENIA: CTCAEGrade[] = [
  { grau: 1, descricao: 'ANC < LIN – 1500/mm³', conduta: 'Manter QT com monitoramento' },
  { grau: 2, descricao: 'ANC 1000–1499/mm³', conduta: 'Manter QT; considerar G-CSF profilático se próximo ciclo' },
  { grau: 3, descricao: 'ANC 500–999/mm³', conduta: 'Retardar QT até recuperação; G-CSF. Se febril: hospitalizar + ATB IV' },
  { grau: 4, descricao: 'ANC < 500/mm³', conduta: 'Neutropenia grave — G-CSF. Se febril (≥ 38,3°C): emergência — ATB IV + internação' },
  { grau: 5, descricao: 'Morte', conduta: 'N/A' },
];

export const CTCAE_TROMBOCITOPENIA: CTCAEGrade[] = [
  { grau: 1, descricao: 'Plaquetas 75.000–LIN/mm³', conduta: 'Manter QT' },
  { grau: 2, descricao: 'Plaquetas 50.000–74.999/mm³', conduta: 'Manter QT em sólidos; reduzir dose em hematológicos' },
  { grau: 3, descricao: 'Plaquetas 25.000–49.999/mm³', conduta: 'Suspender QT até recuperação. Transfusão se sangramento ou < 10.000' },
  { grau: 4, descricao: 'Plaquetas < 25.000/mm³', conduta: 'Suspender QT. Transfusão plaquetária se < 10.000 ou sangramento' },
  { grau: 5, descricao: 'Morte', conduta: 'N/A' },
];

export const CTCAE_MUCOSITE: CTCAEGrade[] = [
  { grau: 1, descricao: 'Eritema assintomático da mucosa', conduta: 'Higiene oral frequente; bochechos com solução salina' },
  { grau: 2, descricao: 'Dor leve; alteração de dieta (alimentos macios)', conduta: 'Bochechos com lidocaína viscosa; analgésico VO; suporte nutricional' },
  { grau: 3, descricao: 'Dor intensa; incapaz de alimentação oral adequada', conduta: 'Morfina VO/IV; nutrição parenteral ou enteral; hospitalização se necessário' },
  { grau: 4, descricao: 'Lesão ameaçadora à vida; indicação de intervenção urgente', conduta: 'UTI; nutrição parenteral; morfina IV; antibióticos + antifúngicos' },
  { grau: 5, descricao: 'Morte', conduta: 'N/A' },
];

export const CTCAE_NEUROPATIA: CTCAEGrade[] = [
  { grau: 1, descricao: 'Parestesia assintomática / perda de reflexo sem dor', conduta: 'Manter QT; monitoramento' },
  { grau: 2, descricao: 'Parestesia moderada; limitação de AVDs instrumentais', conduta: 'Redução de dose 25%; vitamina B6; duloxetina (evidência limitada)' },
  { grau: 3, descricao: 'Parestesia grave; limitação de autocuidado', conduta: 'Suspender agente neurotóxico; duloxetina; gabapentina' },
  { grau: 4, descricao: 'Ameaçadora à vida', conduta: 'Descontinuação permanente' },
  { grau: 5, descricao: 'Morte', conduta: 'N/A' },
];

// ─── FATORES DE CRESCIMENTO (G-CSF) — ASCO 2023 ──────────────

export interface GrowthFactorIndication {
  agente: string;
  dose: string;
  via: string;
  indicacao: string;
  timing: string;
  contraindicacoes: string[];
  observacoes: string[];
}

export const GCSF_PROTOCOLS: GrowthFactorIndication[] = [
  {
    agente: 'Filgrastim (G-CSF)',
    dose: '5 mcg/kg/dia SC ou IV (arredondado para frasco disponível)',
    via: 'SC ou IV',
    indicacao: 'Profilaxia primária: esquemas com risco de neutropenia febril ≥ 20%.\nProfilaxia secundária: após neutropenia febril grau 3–4 em ciclo anterior.\nNeutropenia febril: terapêutico (risco alto MASCC).',
    timing: 'Iniciar 24–72h após último dia de QT. NÃO administrar < 24h antes ou no dia da QT. Manter até ANC > 10.000/mm³ ou nadir passado.',
    contraindicacoes: ['Leucemia mieloide aguda (AML) — pode estimular clones malignos', 'Síndrome mielodisplásica (relativo)'],
    observacoes: [
      'Dor óssea: efeito muito comum — tratar com paracetamol ou anti-histamínico (loratadina)',
      'Fracionamento: 10 mcg/kg/dia em doses menores tem menos dor óssea',
      'Ruptura esplênica: rara mas grave — dor abdominal nova → investigar',
    ],
  },
  {
    agente: 'Pegfilgrastim (G-CSF peguilado)',
    dose: '6 mg SC (dose fixa) — 1 injeção por ciclo',
    via: 'SC',
    indicacao: 'Equivalente ao filgrastim diário para profilaxia primária e secundária. Preferível quando adesão ao filgrastim diário é preocupação.',
    timing: 'Aplicar 24–72h após último dia de QT. NÃO usar em ciclos menores que 14 dias.',
    contraindicacoes: ['Ciclos < 14 dias (risco de sobreposição com o próximo ciclo)'],
    observacoes: [
      'Dose fixa (não depende do peso) — conveniente',
      'Equivalência demonstrada com filgrastim em múltiplos estudos',
      'Disponível no SUS para protocolos oncológicos específicos',
    ],
  },
  {
    agente: 'Eritropoetina (Epoetina alfa / Darbepoetina)',
    dose: 'Epoetina: 150–300 UI/kg SC 3×/semana | Darbepoetina: 2,25 mcg/kg SC 1×/semana ou 500 mcg SC 3/3 semanas',
    via: 'SC',
    indicacao: 'Anemia relacionada à QT sintomática com Hb < 10 g/dL em pacientes SEM cura potencial e recebendo QT.',
    timing: 'Iniciar se Hb < 10 g/dL. Avaliar resposta em 6–8 semanas. Suspender se Hb > 12 g/dL.',
    contraindicacoes: [
      'Tumores com intenção curativa (↑ mortalidade documentada em câncer de cabeça e pescoço, mama, pulmão)',
      'HAS não controlada',
      'TVP/TEP ativo',
    ],
    observacoes: [
      'ASCO/ASH: uso restrito a pacientes paliativos recebendo QT',
      'Sempre associar suplementação de ferro IV se ferritina < 100 ou saturação < 20%',
      'Risco tromboembólico: ↑ com Hb-alvo > 12 g/dL',
      'Transfusão de hemácias é alternativa para anemia aguda sintomática',
    ],
  },
];

// ─── ANTICOAGULAÇÃO ONCOLÓGICA (ASCO 2023 / ISTH 2022) ────────

export interface CancerThrombosisProtocol {
  indicacao: string;
  droga1aLinha: string;
  dose: string;
  duracao: string;
  alternativas: string[];
  consideracoes: string[];
}

export const CANCER_THROMBOSIS: CancerThrombosisProtocol[] = [
  {
    indicacao: 'TVP/TEP em paciente oncológico',
    droga1aLinha: 'Apixabana (ADAM-VTE/CARAVAGGIO) ou Rivaroxabana (SELECT-D)',
    dose: 'Apixabana: 10 mg 2×/dia × 7 dias → 5 mg 2×/dia. Rivaroxabana: 15 mg 2×/dia × 21 dias → 20 mg/dia.',
    duracao: 'Mínimo 6 meses. Manter indefinidamente se câncer ativo.',
    alternativas: ['Dalteparina HBPM 200 UI/kg/dia × 1 mês → 150 UI/kg/dia (CLOT trial)', 'Enoxaparina 1,5 mg/kg/dia SC'],
    consideracoes: [
      'Tumores GI (especialmente gástrico, colorretal): NOACs com ↑ risco de sangramento GI — preferir HBPM',
      'Tumor cerebral primário ou metástase cerebral: HBPM preferível (risco de sangramento intracraniano com NOAC)',
      'Trombocitopenia < 50.000: suspender anticoagulação plena; meia dose se 25.000–50.000',
      'Interação com QT: apixabana e rivaroxabana são substratos de P-gp e CYP3A4 — checar interações',
    ],
  },
  {
    indicacao: 'Profilaxia de TEV em paciente oncológico ambulatorial de alto risco',
    droga1aLinha: 'Rivaroxabana 10 mg/dia (Khorana Score ≥ 2, CASSINI Trial) ou Apixabana 2,5 mg 2×/dia (AVERT Trial)',
    dose: 'Rivaroxabana: 10 mg/dia VO. Apixabana: 2,5 mg 2×/dia.',
    duracao: '6 meses (durante QT de alto risco)',
    alternativas: ['HBPM para pacientes com interação ou má adesão a NOAC oral'],
    consideracoes: [
      'KHORANA SCORE ≥ 2: cânceres do pâncreas, estômago, bexiga, rim, linfoma, pulmão, ginecológico',
      'Screening Khorana: leucócitos > 11.000, Hb < 10, plaquetas > 350.000, IMC > 35, tipo de tumor',
      'Risco de sangramento: contraindicar se lesão GI sangrante ativa, úlcera, cirurgia recente',
    ],
  },
  {
    indicacao: 'Trombose de cateter venoso central (CVC) relacionada ao câncer',
    droga1aLinha: 'HBPM terapêutica por pelo menos 3 meses',
    dose: 'Enoxaparina 1 mg/kg SC 2×/dia ou 1,5 mg/kg/dia',
    duracao: 'Mínimo 3 meses. Manter cateter se funcionante e necessário.',
    alternativas: ['Rivaroxabana ou apixabana se HBPM não tolerada'],
    consideracoes: [
      'Remover cateter apenas se: cateter não funcionante, infecção de cateter, trombose sem melhora com anticoagulação',
      'Retomar profilaxia após remoção do cateter',
    ],
  },
  {
    indicacao: 'Profilaxia peri-operatória em cirurgia oncológica',
    droga1aLinha: 'HBPM',
    dose: 'Enoxaparina 40 mg SC/dia (iniciar 12h antes da cirurgia ou 12h após)',
    duracao: '28 dias em cirurgias abdominopélvicas oncológicas maiores (estendida)',
    alternativas: ['Fondaparinux 2,5 mg/dia se alergia a heparina'],
    consideracoes: [
      'ASCO 2023: profilaxia estendida (28 dias) recomendada em cirurgias abdominopélvicas oncológicas',
      'Meias de compressão graduada + deambulação precoce como adjuvantes',
      'Risco hemorrágico: individualizar início em cirurgia com alto risco de sangramento',
    ],
  },
];

// ─── KHORANA SCORE (TEV em oncológico ambulatorial) ──────────

export interface KhoranaScore {
  pontuacao: number;
  risco: 'alto' | 'intermediário' | 'baixo';
  incidenciaEstimada: string;
  recomendacao: string;
}

export const KHORANA_ITEMS: { criterio: string; pontos: number }[] = [
  { criterio: 'Pâncreas, estômago', pontos: 2 },
  { criterio: 'Pulmão, linfoma, ginecológico, bexiga, testicular', pontos: 1 },
  { criterio: 'Leucócitos pré-QT > 11.000/mm³', pontos: 1 },
  { criterio: 'Plaquetas pré-QT ≥ 350.000/mm³', pontos: 1 },
  { criterio: 'Hemoglobina < 10 g/dL ou uso de agentes eritropoéticos', pontos: 1 },
  { criterio: 'IMC ≥ 35 kg/m²', pontos: 1 },
];

export function calcKhorana(respostas: boolean[]): KhoranaScore {
  const pontuacao = KHORANA_ITEMS.reduce((s, item, i) => s + (respostas[i] ? item.pontos : 0), 0);
  if (pontuacao >= 3) return {
    pontuacao, risco: 'alto',
    incidenciaEstimada: '7,1% em 2,5 meses',
    recomendacao: 'Considerar profilaxia anticoagulante ambulatorial com NOAC (rivaroxabana 10 mg/dia ou apixabana 2,5 mg 2×/dia) por até 6 meses.',
  };
  if (pontuacao >= 1) return {
    pontuacao, risco: 'intermediário',
    incidenciaEstimada: '2,0% em 2,5 meses',
    recomendacao: 'Avaliação individualizada — profilaxia pode ser considerada em subgrupos com FR adicionais.',
  };
  return {
    pontuacao, risco: 'baixo',
    incidenciaEstimada: '0,3–0,8% em 2,5 meses',
    recomendacao: 'Sem indicação de profilaxia farmacológica de rotina.',
  };
}

// ─── PROFILAXIAS SUPORTE — QUIMIOTERAPIA ─────────────────────

export interface ChemoSupportiveProtocol {
  indicacao: string;
  drug: string;
  dose: string;
  timing: string;
  observacoes: string[];
}

export const SUPPORTIVE_PROTOCOLS: ChemoSupportiveProtocol[] = [
  {
    indicacao: 'Cistite hemorrágica por ifosfamida ou ciclofosfamida alta dose',
    drug: 'Mesna',
    dose: '20% da dose de ifosfamida IV em 3 bolus: antes, 4h e 8h após a ifosfamida. Para CI alta dose: 60–100% da dose equivalente.',
    timing: 'Administrar no mesmo dia da ifosfamida/CF alta dose',
    observacoes: [
      'Tiopronina nos EUA — mesna disponível no Brasil (RENAME)',
      'Urotóxico: acroleína (metabólito) — mesna conjuga e desativa na bexiga',
      'Hidratação vigorosa (2–3 L/dia) é essencial em paralelo',
    ],
  },
  {
    indicacao: 'Hiperuricemia (profilaxia síndrome de lise tumoral — risco baixo/intermediário)',
    drug: 'Alopurinol',
    dose: '300 mg/dia VO (adultos) | 100 mg/m² 8/8h em hematológicos',
    timing: 'Iniciar 24–48h ANTES da QT. Manter 7–10 dias.',
    observacoes: [
      'Inibe xantina oxidase → bloqueia produção de ácido úrico (não dissolve)',
      'Não indicado se ácido úrico já elevado (rasburicase preferível)',
      'Interação grave com mercaptopurina/azatioprina: reduzir dose em 75%',
    ],
  },
  {
    indicacao: 'Hiperuricemia grave / Síndrome de lise tumoral alto risco',
    drug: 'Rasburicase',
    dose: '0,2 mg/kg/dia IV em 30 min × 3–7 dias',
    timing: 'Iniciar no dia da QT ou 1–2 dias antes (alto risco)',
    observacoes: [
      'Uricase recombinante — DISSOLVE o ácido úrico já formado (vs alopurinol que apenas inibe produção)',
      'CONTRAINDICADO em deficiência de G6PD (hemólise grave — metahemoglobinemia)',
      'Armazenar amostra de AU em gelo para nível sérico (rasburicase degrada UA à TA)',
      'Custo elevado — restrito a casos de alto risco ou falha do alopurinol',
    ],
  },
  {
    indicacao: 'Resgate de metotrexato em altas doses (MTX-AD)',
    drug: 'Leucovorin (ácido folínico)',
    dose: '15 mg IV/VO a cada 6h × 8–12 doses, iniciando 24h após MTX. Ajustar conforme nível sérico de MTX.',
    timing: 'Iniciar exatamente 24h após o início da infusão de MTX-AD',
    observacoes: [
      'Monitorar nível sérico de MTX: < 1 µmol/L às 24h, < 0,1 µmol/L às 48h',
      'Nível MTX > 10 µmol/L às 24h: aumentar leucovorin para 100–150 mg IV 3/3h',
      'Hidratação IV vigorosa (3 L/m²/dia) + alcalinização urinária (bicarbonato) obrigatórias',
      'Glucarpidase (carboxipeptidase G2) para níveis tóxicos persistentes (disponibilidade limitada)',
    ],
  },
  {
    indicacao: 'Profilaxia de Pneumocystis jirovecii (PCP) em imunossuprimidos',
    drug: 'Sulfametoxazol/Trimetoprima (SMZ-TMP)',
    dose: '800/160 mg VO 3×/semana (dias alternados) ou 400/80 mg/dia',
    timing: 'Durante QT de alto risco: linfomas, leucemias, uso de fludarabina, corticoide > 20 mg/dia por > 4 semanas',
    observacoes: [
      'Alternativas se intolerância: pentamidina inalatória 300 mg/mês, atovaquona 1500 mg/dia',
      'Manter enquanto durar a imunossupressão significativa',
      'CD4 < 200/mm³ em HIV: manter profilaxia independentemente',
    ],
  },
  {
    indicacao: 'Profilaxia fúngica em imunossupressão grave',
    drug: 'Fluconazol ou Posaconazol',
    dose: 'Fluconazol: 400 mg/dia VO (Candida). Posaconazol: 300 mg 12/12h D1 → 300 mg/dia (AML em indução/consolidação, GVHD)',
    timing: 'Durante neutropenia prolongada esperada (> 7 dias) ou GVHD em transplante',
    observacoes: [
      'Posaconazol preferido em AML (cobertura de Aspergillus)',
      'Monitorar interações QT: fluconazol prolonga QTc',
      'Não usar fluconazol em candidemia por C. krusei ou C. glabrata (intrinsecamente resistente/dose-dependente)',
    ],
  },
  {
    indicacao: 'Profilaxia de reativação de hepatite B (HBsAg+ ou anti-HBc+) em imunossupressão',
    drug: 'Entecavir ou Tenofovir',
    dose: 'Entecavir: 0,5 mg/dia VO (1 mg/dia se lamivudina prévia). Tenofovir (TDF): 300 mg/dia',
    timing: 'Iniciar 1–2 semanas ANTES de imunossupressão. Manter 6–12 meses após término.',
    observacoes: [
      'Rituximabe: risco muito alto de reativação de HBV — profilaxia obrigatória',
      'Corticoide > 10 mg/dia por > 4 semanas: considerar profilaxia se anti-HBc+',
      'Monitorar DNA-HBV a cada 3 meses durante imunossupressão',
    ],
  },
  {
    indicacao: 'Profilaxia de herpes simples/zóster em transplante ou análogos de purina',
    drug: 'Aciclovir ou Valaciclovir',
    dose: 'Aciclovir: 400 mg 2–3×/dia VO. Valaciclovir: 500 mg/dia VO (mais conveniente)',
    timing: 'Durante e até 6–12 meses após transplante de medula óssea ou uso de análogos de purina (fludarabina, cladribina)',
    observacoes: [
      'Proteção contra HSV-1, HSV-2 e (parcialmente) VZV',
      'Transplante alogênico: estender profilaxia por 1 ano',
    ],
  },
];

// ─── AJUSTE DE DOSE ONCOLÓGICA POR TOXICIDADE ─────────────────

export const DOSE_MODIFICATION_RULES: Record<string, {
  toxicidade: string;
  grau2?: string;
  grau3: string;
  grau4: string;
  grauGeralRetomada: string;
}> = {
  cisplatina: {
    toxicidade: 'Nefrotoxicidade',
    grau3: 'Reduzir dose 25%. Hidratação intensiva (250 mL/h × 6h pré + pós). Suspender se ClCr < 45.',
    grau4: 'Descontinuação permanente.',
    grauGeralRetomada: 'Retomar somente se creatinina normalizar (< 1,5× basal)',
  },
  oxaliplatina: {
    toxicidade: 'Neuropatia periférica',
    grau2: 'Reduzir dose 25%.',
    grau3: 'Suspender até grau ≤ 1; reduzir 25%.',
    grau4: 'Descontinuação permanente.',
    grauGeralRetomada: 'Retomar somente se neuropatia ≤ grau 1',
  },
  paclitaxel: {
    toxicidade: 'Neuropatia / Neutropenia',
    grau3: 'Neuropatia: reduzir 20%. Neutropenia febril: reduzir 20% + G-CSF próximo ciclo.',
    grau4: 'Descontinuação permanente (neuropatia). Neutropenia: G-CSF obrigatório.',
    grauGeralRetomada: 'Neuropatia: retomar se ≤ grau 1. Neutropenia: ANC > 1500/mm³',
  },
};

// ─── IMUNOTERAPIA — TOXICIDADES (irAE) ───────────────────────

export interface IrAEProtocol {
  orgao: string;
  grau2: string;
  grau3: string;
  grau4: string;
  corticoide: string;
  observacoes: string[];
}

export const IRAE_PROTOCOLS: IrAEProtocol[] = [
  {
    orgao: 'Pneumonite imune-relacionada',
    grau2: 'Suspender ICI. Prednisona 1 mg/kg/dia VO. Broncoscopia se dúvida diagnóstica.',
    grau3: 'Suspender ICI permanentemente. Metilprednisolona 2–4 mg/kg/dia IV. Avaliar infusão de Ig ou micofenolato se sem resposta em 48h.',
    grau4: 'Descontinuação permanente. UTI. Metilprednisolona 1 g/dia IV × 3 dias + micofenolato ou Ig IV.',
    corticoide: 'Desmame lento (≥ 6 semanas) para prevenir recidiva',
    observacoes: ['Pneumonite é a toxicidade mais grave e pode ser fatal', 'Excluir infecção (BAL, culturas) antes do corticoide'],
  },
  {
    orgao: 'Colite imune-relacionada',
    grau2: 'Suspender ICI. Prednisona 1 mg/kg/dia VO. Exames de fezes (C. difficile). Colonoscopia se > 6 semanas.',
    grau3: 'Suspender ICI. Metilprednisolona 1–2 mg/kg/dia IV. Infliximabe 5 mg/kg IV se sem resposta em 72h.',
    grau4: 'Descontinuação permanente. Infliximabe IV + suporte clínico. Avaliação cirúrgica se perfuração.',
    corticoide: 'Desmame em ≥ 4 semanas',
    observacoes: ['Infliximabe: contraindicado em sepse/infecção ativa. IPILIMUMABE: colite mais frequente e grave que anti-PD-1'],
  },
  {
    orgao: 'Hepatite imune-relacionada',
    grau2: 'Suspender ICI se TGO/TGP > 3× LSN. Prednisona 0,5–1 mg/kg/dia.',
    grau3: 'Suspender ICI. Metilprednisolona 1–2 mg/kg/dia IV. Micofenolato se sem resposta em 3 dias.',
    grau4: 'Descontinuação permanente. Metilprednisolona 1 g/dia × 3 + micofenolato. Avaliar transplante hepático em casos extremos.',
    corticoide: 'NÃO usar infliximabe (hepatotóxico)',
    observacoes: ['Monitorar TGO, TGP, bilirrubinas semanalmente', 'Excluir hepatite viral (HBV/HCV) e outras causas antes do corticoide'],
  },
  {
    orgao: 'Endocrinopatias imune-relacionadas (tireoidite, hipofisit, insuficiência adrenal)',
    grau2: 'Tireoidite: sem suspensão do ICI; tratar hipotireoidismo com levotiroxina.',
    grau3: 'Hipofisit: suspender ICI; hidrocortisona 100–200 mg/dia IV + levotiroxina + testosterona/estrogênio conforme déficit.',
    grau4: 'Insuficiência adrenal aguda: hidrocortisona 100 mg IV em bolus → 200–300 mg/dia + SF 1 L rápido.',
    corticoide: 'Reposição fisiológica (não imunossupressora) — hidrocortisona 20–30 mg/dia (split 2/3 manhã + 1/3 tarde)',
    observacoes: ['Endocrinopatias geralmente permanentes — substituição hormonal indefinida', 'Tireoidite bifásica: hipertireoidismo transitório → hipotireoidismo permanente'],
  },
  {
    orgao: 'Nefrite imune-relacionada',
    grau2: 'Suspender ICI. Prednisona 0,5–1 mg/kg/dia. Biópsia renal se dúvida.',
    grau3: 'Suspender ICI. Metilprednisolona 1–2 mg/kg/dia IV.',
    grau4: 'Descontinuação permanente. Metilprednisolona 1 g/dia × 3 + micofenolato.',
    corticoide: 'Desmame em ≥ 4 semanas',
    observacoes: ['Excluir: ITU, contraste, AINE, outros nefrotóxicos antes de atribuir ao ICI'],
  },
];

// ─── FUNÇÃO: AVALIAR PACIENTE ONCOLÓGICO ─────────────────────

export function assessOncologyPatient(patient: OncologyPatient): {
  bsa: number;
  ecog: typeof ECOG_SCALE[0];
  antiemese: AntiemeticProtocol;
  neutropeniaCTCAE?: CTCAEGrade;
  alerta: string[];
} {
  const bsa = calcBSAMosteller(patient.pesoKg, patient.alturaCm);
  const ecog = ECOG_SCALE[patient.ecogPS];
  const antiemese = getAntiemeticProtocol(patient.esquemaQuimio);
  const alerta: string[] = [];

  // ANC / Neutropenia
  let neutropeniaCTCAE: CTCAEGrade | undefined;
  if (patient.neutrofilosAbsolutos !== undefined) {
    if (patient.neutrofilosAbsolutos < 500) neutropeniaCTCAE = CTCAE_NEUTROPENIA[3];
    else if (patient.neutrofilosAbsolutos < 1000) neutropeniaCTCAE = CTCAE_NEUTROPENIA[2];
    else if (patient.neutrofilosAbsolutos < 1500) neutropeniaCTCAE = CTCAE_NEUTROPENIA[1];
    else neutropeniaCTCAE = CTCAE_NEUTROPENIA[0];

    if (patient.neutrofilosAbsolutos < 500 && patient.temperatura && patient.temperatura >= 38.3) {
      alerta.push('⚠ NEUTROPENIA FEBRIL: ANC < 500/mm³ + febre ≥ 38.3°C — EMERGÊNCIA ONCOLÓGICA. Iniciar ATB IV imediatamente.');
    }
  }

  if (patient.plaquetas !== undefined && patient.plaquetas < 10000) {
    alerta.push('⚠ TROMBOCITOPENIA GRAVE: plaquetas < 10.000/mm³ — avaliar transfusão.');
  }

  if (patient.ecogPS >= 3) {
    alerta.push('⚠ ECOG ≥ 3: risco aumentado de toxicidade grave — avaliar adequação do esquema.');
  }

  return { bsa, ecog, antiemese, neutropeniaCTCAE, alerta };
}
