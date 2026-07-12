// ============================================================
// PRESCREVE-AI — Palliative Engine: Cuidados Paliativos
// Phase 21.14
// ============================================================
// Referências: ANCP 2012, IAHPC 2021, WHO Analgesic Ladder,
// EAPC Opioid Guidelines, Palliative Sedation EAPC 2009,
// Edmonton Symptom Assessment System (ESAS-r)
// ============================================================

// ────────────────────────────────────────────────────────────
// TIPOS
// ────────────────────────────────────────────────────────────

export type PainType = 'nociceptivo_somatico' | 'nociceptivo_visceral' | 'neuropatico' | 'misto' | 'total';
export type WHOStep = 1 | 2 | 3 | 4;
export type SedationLevel = 'superficial' | 'intermediaria' | 'profunda';
export type OpioidName = 'morfina' | 'oxicodona' | 'hidromorfona' | 'fentanil' | 'metadona' | 'codeina' | 'tramadol' | 'buprenorfina';

export interface PalliativePatient {
  idadeAnos: number;
  pesoKg: number;
  diagnosticoPrincipal: string;
  pps: number;            // Palliative Performance Scale 0–100
  esasScores?: EsasScores;
  opioideAtual?: OpioidName;
  doseOpioideAtual?: number;
  viaAtual?: 'VO' | 'SC' | 'IV' | 'TD' | 'SL';
  funcaoRenal?: 'normal' | 'moderada' | 'grave';
  funcaoHepatica?: 'normal' | 'moderada' | 'grave';
}

export interface EsasScores {
  dor: number;           // 0–10
  fadiga: number;
  nausea: number;
  depressao: number;
  ansiedade: number;
  sonolencia: number;
  apetite: number;
  bemestar: number;
  dispneia: number;
  outros?: number;
}

export interface OpioidEquianalgesic {
  farmaco: OpioidName;
  nome_display: string;
  dose_oral_mg: number;     // dose equianalgesica relativa a morfina oral 30mg
  dose_iv_sc_mg: number;
  fator_oral_para_iv: number;
  meia_vida_h: string;
  duracao_acao_h: string;
  peculiaridades: string[];
}

export interface BreakthroughDose {
  dose_mg: number;
  percentual: string;
  intervalo_minimo: string;
  via: string;
  instrucao: string;
}

export interface OpioidRotation {
  de: OpioidName;
  para: OpioidName;
  fator_conversao: number;
  reducao_seguranca: number;   // % de redução por tolerância cruzada incompleta
  instrucoes: string[];
  alertas: string[];
}

export interface PalliativeSedation {
  indicacao: string;
  nivel: SedationLevel;
  farmacos_1a_linha: { farmaco: string; dose_inicio: string; dose_titulacao: string; via: string }[];
  farmacos_2a_linha: { farmaco: string; dose: string; via: string }[];
  monitoramento: string[];
  aspectos_eticos: string[];
}

export interface SymptomProtocol {
  sintoma: string;
  avaliacao: string[];
  intervencoes_nao_farmacologicas: string[];
  farmacologia_1a_linha: { farmaco: string; dose: string; via: string; observacao?: string }[];
  farmacologia_2a_linha: { farmaco: string; dose: string; via: string; observacao?: string }[];
  alertas: string[];
}

// ────────────────────────────────────────────────────────────
// PALLIATIVE PERFORMANCE SCALE (PPS)
// ────────────────────────────────────────────────────────────

export const PPS_SCALE: Record<number, {
  atividade: string;
  evidencia_doenca: string;
  autocuidado: string;
  ingestao: string;
  consciencia: string;
  sobrevida_mediana: string;
  implicacoes: string[];
}> = {
  100: {
    atividade: 'Normal; sem evidência de doença',
    evidencia_doenca: 'Nenhuma',
    autocuidado: 'Total',
    ingestao: 'Normal',
    consciencia: 'Lúcido',
    sobrevida_mediana: '> 6 meses',
    implicacoes: ['Cuidados paliativos preventivos', 'Planejamento antecipado de cuidados'],
  },
  80: {
    atividade: 'Normal com esforço; alguma evidência de doença',
    evidencia_doenca: 'Alguma',
    autocuidado: 'Total',
    ingestao: 'Normal ou reduzida',
    consciencia: 'Lúcido',
    sobrevida_mediana: '~ 6 meses',
    implicacoes: ['Controle de sintomas', 'Apoio psicossocial e espiritual'],
  },
  60: {
    atividade: 'Incapaz de trabalhar; atividade significativa reduzida',
    evidencia_doenca: 'Significativa',
    autocuidado: 'Assistência ocasional',
    ingestao: 'Normal ou reduzida',
    consciencia: 'Lúcido ou confuso',
    sobrevida_mediana: '~ 3 meses',
    implicacoes: ['Avaliar nível de cuidado', 'Ajuste de metas terapêuticas', 'Suporte domiciliar'],
  },
  40: {
    atividade: 'Acamado a maior parte do tempo',
    evidencia_doenca: 'Extensa',
    autocuidado: 'Assistência extensiva',
    ingestao: 'Normal ou reduzida',
    consciencia: 'Lúcido ou sonolento',
    sobrevida_mediana: '~ 6 semanas',
    implicacoes: ['Considerar internação ou hospice', 'Revisão de medicamentos', 'Conversa sobre fim de vida'],
  },
  20: {
    atividade: 'Acamado; incapaz de qualquer atividade',
    evidencia_doenca: 'Extensa',
    autocuidado: 'Dependência total',
    ingestao: 'Sorvos ou nada',
    consciencia: 'Sonolento ou comatoso',
    sobrevida_mediana: '~ 1–2 semanas',
    implicacoes: ['Fase agônica / últimas horas-dias', 'Conforto exclusivo', 'Sedação paliativa se sintomas refratários', 'Suporte à família'],
  },
  10: {
    atividade: 'Acamado; moribundo',
    evidencia_doenca: 'Extensa',
    autocuidado: 'Dependência total',
    ingestao: 'Cuidados com a boca apenas',
    consciencia: 'Sonolento ou comatoso',
    sobrevida_mediana: 'Horas a dias',
    implicacoes: ['Morte iminente', 'Suspender medidas não paliativas', 'Família presente', 'Cuidados de fim de vida'],
  },
};

export function interpretPPS(pps: number): typeof PPS_SCALE[20] {
  const keys = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
  const rounded = keys.find(k => k <= pps) ?? 10;
  return PPS_SCALE[rounded] ?? PPS_SCALE[10];
}

// ────────────────────────────────────────────────────────────
// ESAS-r — Edmonton Symptom Assessment System (revisado)
// ────────────────────────────────────────────────────────────

export function interpretEsas(scores: EsasScores): {
  sintomas_graves: string[];
  sintomas_moderados: string[];
  carga_total: number;
  alerta: boolean;
} {
  const campos: (keyof EsasScores)[] = ['dor', 'fadiga', 'nausea', 'depressao', 'ansiedade', 'sonolencia', 'apetite', 'bemestar', 'dispneia'];
  const labels: Record<string, string> = {
    dor: 'Dor', fadiga: 'Fadiga', nausea: 'Náusea', depressao: 'Depressão',
    ansiedade: 'Ansiedade', sonolencia: 'Sonolência', apetite: 'Apetite',
    bemestar: 'Bem-estar', dispneia: 'Dispneia',
  };
  const graves: string[] = [];
  const moderados: string[] = [];
  let total = 0;

  for (const campo of campos) {
    const v = scores[campo] ?? 0;
    total += v;
    if (v >= 7) graves.push(`${labels[campo]} ${v}/10`);
    else if (v >= 4) moderados.push(`${labels[campo]} ${v}/10`);
  }

  return {
    sintomas_graves: graves,
    sintomas_moderados: moderados,
    carga_total: total,
    alerta: graves.length > 0 || total >= 30,
  };
}

// ────────────────────────────────────────────────────────────
// ESCADA ANALGÉSICA DA OMS (WHO Analgesic Ladder)
// ────────────────────────────────────────────────────────────

export const WHO_LADDER: Record<WHOStep, {
  descricao: string;
  indicacao: string;
  farmacos_principais: string[];
  adjuvantes: string[];
  principios: string[];
}> = {
  1: {
    descricao: 'Degrau 1 — Dor leve (EVN 1–3)',
    indicacao: 'Dor leve (EVN 1–3)',
    farmacos_principais: ['Paracetamol 500–1000 mg 4/4h–6/6h VO (máx 4 g/dia)', 'Dipirona 500–1000 mg 6/6h VO/IV/SC', 'AINEs: ibuprofeno 400 mg 8/8h, cetoprofeno 100 mg 12/12h (uso criterioso em idosos e nefropatas)'],
    adjuvantes: ['Amitriptilina (dor neuropática): 10–75 mg/noite', 'Gabapentina 100–300 mg 8/8h (dor neuropática)', 'Pregabalina 25–75 mg 12/12h (neuropática)', 'Dexametasona 4–8 mg/dia (dor inflamatória, compressão nervosa)', 'Clonazepam 0,5–2 mg/noite (dor com espasmo)'],
    principios: ['Horário fixo (não sob demanda)', 'Via oral preferencial', 'Avaliar e tratar tipo de dor'],
  },
  2: {
    descricao: 'Degrau 2 — Dor moderada (EVN 4–6)',
    indicacao: 'Dor moderada (EVN 4–6) ou falha do degrau 1',
    farmacos_principais: ['Tramadol 50–100 mg 6/6h–8/8h VO (máx 400 mg/dia)', 'Codeína 30–60 mg 4/4h–6/6h VO (combinada com paracetamol)', 'Tapentadol 50–100 mg 12/12h VO (dor mista nociceptiva + neuropática)'],
    adjuvantes: ['Manter degrau 1 (paracetamol + AINE) como base', 'Adjuvantes do degrau 1 conforme tipo de dor'],
    principios: ['Combinar com não-opioide (degrau 1)', 'Tramadol: evitar em epilepsia e uso de IMAO', 'Codeína: pró-fármaco (metabolismo CYP2D6) — metabolizadores ultra-rápidos: toxicidade; lentos: ineficácia'],
  },
  3: {
    descricao: 'Degrau 3 — Dor intensa (EVN 7–10)',
    indicacao: 'Dor intensa (EVN ≥ 7) ou falha do degrau 2',
    farmacos_principais: ['Morfina VO: 5–30 mg 4/4h (início) | IR: 5–10 mg SOS', 'Morfina SC: 2,5–5 mg q4h IC ou bolus | Conversão oral→SC: ÷2', 'Oxicodona 5–20 mg 4/4h–12/12h VO', 'Hidromorfona 1–4 mg 4/4h VO | SC: ÷3–5 da dose oral', 'Fentanil TD: 12,5–25 mcg/h a cada 72h (dose estável) | Conversão: morfina oral 60 mg/dia = fentanil TD 25 mcg/h'],
    adjuvantes: ['Manter não-opioide se benefício sem toxicidade', 'Adjuvantes conforme tipo de dor', 'Corticoide: dexametasona 4–16 mg/dia (metástases ósseas, compressão medular, SNC)'],
    principios: ['Sem teto de dose (titular pelo efeito/tolerância)', 'Dose de resgate: 10–15% da dose total em 24h', 'Titulação: aumentar 25–50% a cada 24–48h se necessário ≥ 3 resgates/dia', 'Prevenir constipação profilaticamente SEMPRE'],
  },
  4: {
    descricao: 'Degrau 4 — Dor refratária / Procedimentos intervencionistas',
    indicacao: 'Dor refratária a opioides em doses otimizadas',
    farmacos_principais: ['Metadona (rotação por especialista — alto risco de acúmulo)', 'Ketamina IV/SC: 0,1–0,5 mg/kg/h (dor neuropática refratária)', 'Lidocaína IV: 1–5 mg/kg/h (neuropatia refratária, off-label)'],
    adjuvantes: ['Bloqueios nervosos / neuroablação', 'Analgesia intratecal / epidural', 'Radioterapia paliativa (metástases ósseas)', 'Vertebroplastia / cifoplastia (fratura vertebral por metástase)'],
    principios: ['Encaminhar para equipe especializada em dor', 'Técnicas intervencionistas não contradizem cuidados paliativos'],
  },
};

// ────────────────────────────────────────────────────────────
// EQUIANALGESIA — Tabela de Conversão de Opioides
// ────────────────────────────────────────────────────────────

export const EQUIANALGESIC_TABLE: OpioidEquianalgesic[] = [
  {
    farmaco: 'morfina',
    nome_display: 'Morfina',
    dose_oral_mg: 30,
    dose_iv_sc_mg: 10,
    fator_oral_para_iv: 3,
    meia_vida_h: '2–4h',
    duracao_acao_h: '4–6h (IR) | 8–12h (LP)',
    peculiaridades: [
      'Padrão ouro (referência de equianalgesia)',
      'Metabólito ativo M6G acumula em IR — evitar em ClCr < 30 mL/min',
      'Pruridão, náusea, constipação comuns',
      'SC: preferível em paliativo (menos invasiva que IV)',
    ],
  },
  {
    farmaco: 'oxicodona',
    nome_display: 'Oxicodona',
    dose_oral_mg: 20,
    dose_iv_sc_mg: 10,
    fator_oral_para_iv: 2,
    meia_vida_h: '3–5h',
    duracao_acao_h: '4–6h (IR) | 12h (LP)',
    peculiaridades: [
      'Morfina oral 30 mg ≈ Oxicodona oral 20 mg (razão 1,5:1)',
      'Menos náusea que morfina (alguns estudos)',
      'Formulação LP (10/20/40/80 mg) — não partir/mastigar',
      'Combinação com naloxona (Targin): reduz constipação induzida por opioide',
    ],
  },
  {
    farmaco: 'hidromorfona',
    nome_display: 'Hidromorfona',
    dose_oral_mg: 4,
    dose_iv_sc_mg: 1.5,
    fator_oral_para_iv: 2.67,
    meia_vida_h: '2–3h',
    duracao_acao_h: '4–5h',
    peculiaridades: [
      'Potência: morfina oral 30 mg ≈ hidromorfona oral 4–6 mg',
      'Pode ser usada com cuidado em IR moderada (metabólito H3G: neuroexcitação)',
      'Alternativa à morfina em rotação',
      'Alta potência SC: útil para volumes SC menores',
    ],
  },
  {
    farmaco: 'fentanil',
    nome_display: 'Fentanil (transdérmico)',
    dose_oral_mg: 0,
    dose_iv_sc_mg: 0.1,
    fator_oral_para_iv: 0,
    meia_vida_h: '17–27h (TD) | 3–4h (IV bolus)',
    duracao_acao_h: '72h (adesivo TD)',
    peculiaridades: [
      'Morfina oral 60 mg/dia ≈ Fentanil TD 25 mcg/h',
      'Vantagem: ausência de metabólito acumulável em IR (seguro em ClCr < 30)',
      'Reservatório cutâneo: demora 12–24h para onset e 24h para wash-out após retirada',
      'Febre / diaforese: aumenta absorção → toxicidade',
      'NÃO usar em pacientes com febre > 38°C ou diaforese importante',
      'Conversão: morfina SC 24h ÷ 2 = dose IV → ÷ 100 × 24 = mcg/h fentanil TD (regra prática)',
    ],
  },
  {
    farmaco: 'metadona',
    nome_display: 'Metadona',
    dose_oral_mg: 0,  // variável — não linear
    dose_iv_sc_mg: 0,
    fator_oral_para_iv: 2,
    meia_vida_h: '24–150h (VARIÁVEL e imprevisível)',
    duracao_acao_h: '6–12h (analgesia) | muito maior (acúmulo)',
    peculiaridades: [
      'CONVERSÃO NÃO LINEAR: fator depende da dose prévia de morfina (tabela de Ayonrinde/Bruera)',
      'Meia-vida imprevisível: acúmulo silencioso → sedação tardia (avaliar D3–D5)',
      'Antagonismo NMDA: eficaz em dor neuropática refratária',
      'Prolonga QT: ECG antes e a cada aumento de dose',
      'Rotação para metadona: SEMPRE por especialista em cuidados paliativos',
      'Baixo custo: vantagem em contextos com recursos limitados',
      'Interações: CYP3A4, CYP2D6 — múltiplos fármacos alteram nível sérico',
    ],
  },
  {
    farmaco: 'buprenorfina',
    nome_display: 'Buprenorfina (transdérmica)',
    dose_oral_mg: 0,
    dose_iv_sc_mg: 0.3,
    fator_oral_para_iv: 0,
    meia_vida_h: '24–42h (TD)',
    duracao_acao_h: '72–96h (adesivo TD)',
    peculiaridades: [
      'Agonista parcial µ: teto de efeito analgésico; seguro em IR/IH (não acumula)',
      'Adesivo: 5/10/15/20/35/52,5/70 mcg/h — trocar a cada 3–4 dias',
      'Conversão: buprenorfina TD 35 mcg/h ≈ morfina oral 60 mg/dia',
      'Seguro em IR grave e diálise',
      'Naloxona é antídoto eficaz (apesar de agonismo parcial)',
    ],
  },
  {
    farmaco: 'codeina',
    nome_generico: 'codeina',
    nome_display: 'Codeína',
    dose_oral_mg: 200,
    dose_iv_sc_mg: 0,
    fator_oral_para_iv: 0,
    meia_vida_h: '2–4h',
    duracao_acao_h: '4–6h',
    peculiaridades: [
      'Morfina oral 30 mg ≈ Codeína oral 200 mg (potência baixa)',
      'Pró-fármaco: convertida em morfina via CYP2D6 (polimorfismo genético)',
      'Metabolizadores ultra-rápidos (5–10% brancos; > 30% etíopes): toxicidade por morfina',
      'Metabolizadores lentos: analgesia inadequada',
      'Degrau 2: combinar com paracetamol (sinergismo)',
    ],
  } as OpioidEquianalgesic,
  {
    farmaco: 'tramadol',
    nome_display: 'Tramadol',
    dose_oral_mg: 300,
    dose_iv_sc_mg: 100,
    fator_oral_para_iv: 1.2,
    meia_vida_h: '6–7h',
    duracao_acao_h: '6–8h (IR) | 12h (LP)',
    peculiaridades: [
      'Morfina oral 30 mg ≈ Tramadol oral 300 mg (potência baixa)',
      'Mecanismo duplo: agonismo µ fraco + inibição recaptação serotonina/noradrenalina',
      'Risco síndrome serotoninérgica com ISRS/IRSN/IMAO — CONTRAINDICADO com IMAO',
      'Convulsões: reduz limiar (evitar em epilepsia)',
      'Metabolismo CYP2D6 (polimorfismo, assim como codeína)',
      'Útil em dor mista (nociceptiva + neuropática leve)',
    ],
  },
];

// Calculadora de dose de resgate
export function calcBreakthroughDose(
  doseTotal24h: number,
  opioide: OpioidName,
  via: 'VO' | 'SC' | 'IV',
): BreakthroughDose {
  const percentual = 0.10; // 10–15% da dose total em 24h
  const dose = Math.round(doseTotal24h * percentual * 10) / 10;
  return {
    dose_mg: dose,
    percentual: '10–15% da dose total de 24h',
    intervalo_minimo: via === 'VO' ? '4h' : '1–2h (SC/IV)',
    via,
    instrucao: `${dose} mg de ${opioide} ${via} em dor irruptiva. Registrar número de resgates: ≥ 3/dia → aumentar dose de manutenção 25–50%.`,
  };
}

// Calculadora de rotação de opioide
export function calcOpioidRotation(
  opioideAtual: OpioidName,
  doseAtual24h: number,
  viaAtual: 'VO' | 'SC' | 'IV',
  opioideAlvo: OpioidName,
  viaAlvo: 'VO' | 'SC' | 'IV',
): { dose_equi_mg: number; dose_ajustada_mg: number; instrucoes: string[] } {
  // Converter tudo para morfina oral equivalente
  const toMorfinaOral: Partial<Record<OpioidName, Partial<Record<string, number>>>> = {
    morfina:     { VO: 1,    SC: 3,    IV: 3 },
    oxicodona:   { VO: 1.5,  SC: 3,    IV: 3 },
    hidromorfona:{ VO: 7.5,  SC: 20,   IV: 20 },
    fentanil:    { TD: 100,  IV: 100 },
    codeina:     { VO: 0.15 },
    tramadol:    { VO: 0.1,  SC: 0.1 },
    buprenorfina:{ TD: 1.5 },
    metadona:    { VO: 5 },
  };

  const fatorAtual = (toMorfinaOral[opioideAtual] as Record<string, number>)?.[viaAtual] ?? 1;
  const morfinaOral24h = doseAtual24h * fatorAtual;

  const fatorAlvo = (toMorfinaOral[opioideAlvo] as Record<string, number>)?.[viaAlvo] ?? 1;
  const doseEqui = morfinaOral24h / fatorAlvo;

  // Redução de 20–30% por tolerância cruzada incompleta
  const doseAjustada = Math.round(doseEqui * 0.75 * 10) / 10;

  return {
    dose_equi_mg: Math.round(doseEqui * 10) / 10,
    dose_ajustada_mg: doseAjustada,
    instrucoes: [
      `Morfina oral equivalente 24h: ${Math.round(morfinaOral24h)} mg`,
      `Dose equianalgesica de ${opioideAlvo} ${viaAlvo}: ${Math.round(doseEqui * 10) / 10} mg/24h`,
      `Dose ajustada (−25% tolerância cruzada incompleta): ${doseAjustada} mg/24h`,
      `Dividir em ${opioideAlvo === 'morfina' || opioideAlvo === 'oxicodona' ? '6 doses q4h' : 'conforme formulação'}`,
      `Manter dose de resgate: 10–15% da dose total ajustada`,
      `Monitorar nas primeiras 24–48h — titular conforme necessidade de resgates`,
      opioideAlvo === 'metadona' ? '⚠ METADONA: encaminhar para especialista — rotação complexa' : '',
    ].filter(Boolean),
  };
}

// ────────────────────────────────────────────────────────────
// SEDAÇÃO PALIATIVA
// ────────────────────────────────────────────────────────────

export const PALLIATIVE_SEDATION_PROTOCOLS: PalliativeSedation[] = [
  {
    indicacao: 'Sedação paliativa proporcional — agitação/delirium refratário',
    nivel: 'superficial',
    farmacos_1a_linha: [
      {
        farmaco: 'Midazolam SC',
        dose_inicio: '2,5–5 mg SC q4h (horário) + 2,5 mg SOS q1h (resgate)',
        dose_titulacao: 'Aumentar 25–50% se ≥ 3 resgates em 24h. Converter para IC SC: dose 24h ÷ 24h.',
        via: 'SC (preferencialmente IC via bomba)',
      },
      {
        farmaco: 'Midazolam IC SC',
        dose_inicio: '10–30 mg/24h IC SC (via bomba de infusão)',
        dose_titulacao: 'Titular RASS alvo -2 a -3. Resgate: 2,5–5 mg SC. Aumentar IC 25% a cada 24h se necessário.',
        via: 'SC contínuo (bomba de seringa)',
      },
    ],
    farmacos_2a_linha: [
      { farmaco: 'Fenobarbital SC/IV', dose: '50–200 mg SC/IV q6–12h | IC: 200–600 mg/24h', via: 'SC ou IV' },
      { farmaco: 'Ketamina', dose: '50–150 mg/24h IC SC (adjuvante)', via: 'SC (off-label)' },
    ],
    monitoramento: [
      'RASS alvo: -2 a -3 (responde à voz/estímulo, sem sofrimento)',
      'Avaliar a cada 4–6h: RASS, frequência respiratória, sinais de desconforto',
      'Monitorar: estertores, agitação terminal, expressão facial',
      'Registrar uso de resgates para titular dose',
    ],
    aspectos_eticos: [
      'Consentimento documentado: paciente (quando capaz) ou representante/família',
      'Distinguir sedação paliativa de eutanásia: intenção é aliviar sofrimento, não abreviar vida',
      'Duplo efeito: sedação proporcional ao sofrimento é ética mesmo se puder antecipar morte',
      'Manter comunicação com família: explicar o que esperar durante processo de morrer',
      'Registrar em prontuário: indicação, consentimento, farmacologia, RASS seriado',
    ],
  },
  {
    indicacao: 'Sedação paliativa contínua profunda — sofrimento existencial refratário / últimas horas',
    nivel: 'profunda',
    farmacos_1a_linha: [
      {
        farmaco: 'Midazolam IC SC (dose alta)',
        dose_inicio: '30–60 mg/24h IC SC',
        dose_titulacao: 'Titular RASS -4 a -5. Resgate: 5–10 mg SC/IV. Aumentar 33–50% conforme resposta.',
        via: 'SC contínuo (bomba)',
      },
    ],
    farmacos_2a_linha: [
      { farmaco: 'Fenobarbital IC SC', dose: '600–1200 mg/24h IC SC', via: 'SC' },
      { farmaco: 'Propofol IV (UTI)', dose: '0,5–4 mg/kg/h IC IV', via: 'IV (hospitalar)' },
      { farmaco: 'Ketamina SC adjuvante', dose: '200–500 mg/24h IC SC', via: 'SC' },
    ],
    monitoramento: [
      'RASS alvo: -4 a -5',
      'Avaliar estertores: hioscina butilbrometo 20 mg SC q4h se necessário',
      'Suspender monitorização intrusiva (sinais vitais frequentes, exames)',
      'Cuidados de conforto: higiene oral, reposicionamento suave, umidade ocular',
    ],
    aspectos_eticos: [
      'Indicação: sofrimento refratário a todas intervenções com expectativa de vida em horas-dias',
      'Consentimento: paciente (se capaz) ou decisão substituta com família',
      'Suspender hidratação parenteral se já não indicada (pode aumentar secreções e estertores)',
      'Registro rigoroso e avaliação ética multidisciplinar recomendada',
    ],
  },
];

// ────────────────────────────────────────────────────────────
// PROTOCOLOS DE SINTOMAS
// ────────────────────────────────────────────────────────────

export const SYMPTOM_PROTOCOLS: Record<string, SymptomProtocol> = {
  dispneia: {
    sintoma: 'Dispneia',
    avaliacao: [
      'Avaliar intensidade: EVN 0–10 (subjetiva) ou escala de Borg modificada',
      'Distinguir: dispneia leve (leve esforço) vs moderada (repouso parcial) vs grave (repouso total)',
      'Investigar causa tratável: derrame pleural, anemia, broncoespasmo, IC, TEP, ansiedade',
      'SaO₂: desaturação < 90% indica hipoxemia — mas tratamento da dispneia não depende só de O₂',
    ],
    intervencoes_nao_farmacologicas: [
      'Ventilador no rosto / janela aberta (corrente de ar — estimula receptores nasais, reduz dispneia)',
      'Posição: semi-sentado (cabeceira 30–45°)',
      'Técnicas de relaxamento e respiração (terapia ocupacional)',
      'Reduzir ansiedade: presença da família, ambiente calmo',
      'Oxigênio: benefício apenas se SaO₂ < 90% (não melhorar SaO₂ acima de 90% não muda dispneia)',
    ],
    farmacologia_1a_linha: [
      { farmaco: 'Morfina SC/VO', dose: '2,5–5 mg SC q4h (sem uso prévio) | +25–30% da dose opioide se já em uso', via: 'SC ou VO', observacao: 'Morfina reduz sensação de dispneia sem deprimir respiração em doses analgésicas — principal evidência' },
      { farmaco: 'Lorazepam SC/SL', dose: '0,5–1 mg SC/SL q6–8h (componente ansioso)', via: 'SC ou SL', observacao: 'Para componente de ansiedade associado à dispneia' },
    ],
    farmacologia_2a_linha: [
      { farmaco: 'Midazolam SC', dose: '2,5–5 mg SC q4h (dispneia refratária / agônica)', via: 'SC' },
      { farmaco: 'Broncodilatador', dose: 'Salbutamol 2,5 mg nebulização q4–6h se broncoespasmo', via: 'Inalatório' },
      { farmaco: 'Dexametasona', dose: '4–8 mg/dia IV/SC (linfangite, obstrução vias aéreas, compressão)', via: 'SC ou IV' },
    ],
    alertas: [
      'Crise de dispneia agônica: morfina 2,5–5 mg SC + midazolam 2,5 mg SC imediatamente',
      'Oxigênio ≠ tratamento para dispneia (a não ser com hipoxemia documentada)',
      'O₂ pode aumentar agitação em alguns pacientes em fase final (ressecamento mucosas, máscara)',
    ],
  },

  delirium_paliativo: {
    sintoma: 'Delirium em Cuidados Paliativos',
    avaliacao: [
      'CAM: critérios 1+2+(3 ou 4) = delirium presente',
      'Classificar: hiperativo (agitação) vs hipoativo (sonolência/confusão) vs misto',
      'Delirium terminal (agonia): nas últimas horas/dias — comum (80%), parcialmente reversível',
      'Investigar causas reversíveis: hipercalcemia, constipação grave, retenção urinária, drogas, infecção, hipóxia',
    ],
    intervencoes_nao_farmacologicas: [
      'Ambiente orientado: relógio, janela, fotos da família',
      'Presença de familiar conhecido (ancora)',
      'Luz adequada dia-noite (ciclo circadiano)',
      'Evitar contenção física (aumenta agitação)',
      'Reduzir número de profissionais ao redor — ambiente calmo',
      'Hidratação oral se possível',
    ],
    farmacologia_1a_linha: [
      { farmaco: 'Haloperidol', dose: '0,5–2 mg SC/VO 8/8h–12/12h + SOS 0,5–1 mg q1h', via: 'SC ou VO', observacao: 'Standard em delirium paliativo; EPS menor via SC que VO em idosos' },
      { farmaco: 'Clorpromazina', dose: '12,5–25 mg SC/VO 8/8h (sedação maior — hiperativo intenso)', via: 'SC ou VO' },
    ],
    farmacologia_2a_linha: [
      { farmaco: 'Midazolam SC', dose: '2,5–5 mg SC q1–2h SOS + IC 10–30 mg/24h (delirium refratário / agitação terminal)', via: 'SC', observacao: 'Sedação paliativa se delirium refratário a antipsicóticos' },
      { farmaco: 'Levomepromazina SC', dose: '6,25–12,5 mg SC q6–8h (sedativo + antiemético)', via: 'SC' },
    ],
    alertas: [
      'Delirium terminal: causa em 80% dos casos sofrimento → tratar ativamente',
      'BZD isolada em delirium não terminal pode piorar confusão (exceto delirium por abstinência)',
      'Hipercalcemia: causa reversível — pamidronato/zolendronato IV se indicado',
      'Constipação e retenção urinária: causas reversíveis frequentes — sempre verificar',
    ],
  },

  constipacao: {
    sintoma: 'Constipação (especialmente por opioide — OIC)',
    avaliacao: [
      'Definição: < 3 evacuações/semana ou esforço, fezes duras, sensação de esvaziamento incompleto',
      'Tempo desde última evacuação, consistência (Bristol 1–7)',
      'Avaliar impactação fecal: toque retal se suspeita',
      'OIC (opioid-induced constipation): desenvolve em 90% dos em uso crônico',
    ],
    intervencoes_nao_farmacologicas: [
      'Hidratação oral (se possível e tolerada)',
      'Mobilização (dentro das possibilidades)',
      'Posição durante evacuação: elevação dos pés (simulação de cócoras)',
      'Privacidade e conforto',
    ],
    farmacologia_1a_linha: [
      { farmaco: 'Macrogol (polietilenoglicol)', dose: '1–2 sachês/dia VO', via: 'VO', observacao: 'Osmótico — melhor tolerado, sem dependência' },
      { farmaco: 'Lactulose', dose: '15–30 mL 12/12h VO (ajustar)', via: 'VO', observacao: 'Alternativa osmótica — flatulência frequente' },
      { farmaco: 'Bisacodil', dose: '5–10 mg/noite VO ou 10 mg supositório', via: 'VO ou retal', observacao: 'Estimulante — para OIC' },
      { farmaco: 'Senna + docusato', dose: '2 comprimidos/noite VO (Senokot S)', via: 'VO', observacao: 'Combinar estímulo + amolecimento de fezes' },
    ],
    farmacologia_2a_linha: [
      { farmaco: 'Metilnaltrexona SC', dose: '8 mg SC (< 62 kg) ou 12 mg SC (62–114 kg) | máx 1 dose/dia', via: 'SC', observacao: 'Antagonista periférico µ — específico para OIC sem reverter analgesia central' },
      { farmaco: 'Naloxegol', dose: '25 mg/dia VO (reduzir para 12,5 mg em IR)', via: 'VO', observacao: 'Alternativa oral a metilnaltrexona para OIC' },
      { farmaco: 'Naloxona LP/Oxicodona LP (Targin)', dose: 'Conversão de oxicodona para formulação combinada', via: 'VO', observacao: 'Oxicodona com naloxona oral: naloxona antagoniza receptores µ intestinais, previne OIC' },
    ],
    alertas: [
      'PREVENIR CONSTIPAÇÃO desde o início do opioide — prescrever laxante profilático SEMPRE',
      'Metilnaltrexona: NÃO usar em obstrução intestinal mecânica',
      'Enema se impactação: fosfato enema 133 mL retal',
    ],
  },

  nausea_vomito: {
    sintoma: 'Náusea e Vômito em Cuidados Paliativos',
    avaliacao: [
      'Identificar causa: opioide (início do tratamento), hipercalcemia, gastroparesia, HTIC, obstipação, ansiedade, causas metabólicas',
      'Avaliar: frequência, volume, relação com refeições, associação com opioides',
      'Hipercalcemia: náusea + constipação + confusão + poliúria → dosar Ca²⁺',
    ],
    intervencoes_nao_farmacologicas: [
      'Refeições pequenas e frequentes',
      'Evitar odores fortes e alimentos gordurosos',
      'Posição semi-sentada após refeições',
      'Gengibre (evidência moderada em náusea leve)',
      'Acupressão — ponto P6 (náusea por movimento)',
    ],
    farmacologia_1a_linha: [
      { farmaco: 'Haloperidol SC', dose: '0,5–1,5 mg SC q8–12h (náusea por opioide / hipercalcemia)', via: 'SC ou VO', observacao: 'Antagonista D2 — antiemético central, ótimo para náusea opioide-induzida' },
      { farmaco: 'Metoclopramida', dose: '10 mg VO/SC 8/8h (gastroparesia, náusea por opioide)', via: 'VO ou SC', observacao: 'Procinético — evitar > 5 dias consecutivos (EPS); evitar em obstrução completa' },
      { farmaco: 'Ondansetrona', dose: '4–8 mg VO/SC 8/8h (náusea química, pós-quimio)', via: 'VO ou SC' },
    ],
    farmacologia_2a_linha: [
      { farmaco: 'Dexametasona', dose: '4–8 mg SC/IV/VO 1×/dia (náusea refratária, HTIC)', via: 'SC, VO ou IV' },
      { farmaco: 'Levomepromazina SC', dose: '3,125–6,25 mg SC q8–12h (náusea refratária + sedação)', via: 'SC' },
      { farmaco: 'Granisetrona', dose: '1–2 mg VO/IV 1×/dia (náusea pós-QT)', via: 'VO ou IV' },
    ],
    alertas: [
      'Náusea por opioide: geralmente melhora em 1–2 semanas de uso — antieméticos temporários',
      'Obstrução intestinal maligna: octreotida 300–600 mcg/24h SC (reduz secreções) + haloperidol + dexametasona',
      'Hipercalcemia: tratar a causa (bisfosfonato) além do sintoma',
    ],
  },

  secretions_estertores: {
    sintoma: 'Estertores / Secreção Ruidosa (Sinal da Morte)',
    avaliacao: [
      'Estertores terminais: ruído audível na respiração por secreções orofaríngeas e brônquicas que o paciente não consegue eliminar',
      'Geralmente paciente inconsciente / semiconsciente — NÃO causa sofrimento ao paciente',
      'Causa sofrimento emocional significativo à família — abordar com explicação',
    ],
    intervencoes_nao_farmacologicas: [
      'Explicar para família: "o barulho é da secreção que se movimenta — o paciente não está se engasgando"',
      'Reposicionamento: decúbito lateral (drenagem por gravidade)',
      'Higiene oral suave',
      'NÃO aspirar: estímulo piora a produção de secreção',
    ],
    farmacologia_1a_linha: [
      { farmaco: 'Hioscina butilbrometo SC', dose: '20 mg SC q4h ou IC 60–120 mg/24h SC', via: 'SC', observacao: 'Anticolinérgico quaternário — não cruza BHE, sem efeito sedativo central; reduz secreções' },
      { farmaco: 'Atropina gotas sublingual', dose: '0,4–0,8 mg SL q4h (solução 1 mg/mL → 4–8 gotas)', via: 'SL', observacao: 'Alternativa quando SC difícil; cruza BHE (pode ter efeito central)' },
      { farmaco: 'Glicopirrônio SC', dose: '0,2 mg SC q4–6h ou IC 0,6–1,2 mg/24h', via: 'SC', observacao: 'Anticolinérgico quaternário — similar à hioscina' },
    ],
    farmacologia_2a_linha: [],
    alertas: [
      'A aspiração orofaríngea piora — estimula produção de secreção',
      'Focar no suporte à família — cuidado paliativo centrado na família nesta fase',
    ],
  },

  dor_ossea: {
    sintoma: 'Dor Óssea por Metástases',
    avaliacao: [
      'Localização, irradiação, padrão (contínua vs. irruptiva ao movimento)',
      'Risco de fratura patológica: avaliar integridade óssea (Rx, TC)',
      'Hipercalcemia associada: dosar Ca²⁺',
    ],
    intervencoes_nao_farmacologicas: [
      'Radioterapia paliativa: dose única 8 Gy (tão eficaz quanto fracionado) — alívio em 60–80%',
      'Imobilização / órteses (risco de fratura)',
      'Fisioterapia (mobilização cuidadosa)',
      'Vertebroplastia/cifoplastia (fratura vertebral por compressão)',
    ],
    farmacologia_1a_linha: [
      { farmaco: 'AINEs', dose: 'Cetoprofeno 100 mg 12/12h VO/IV (anti-PGE2 ósseo)', via: 'VO ou IV', observacao: 'Mecanismo preferencial para dor óssea — usar com IBP' },
      { farmaco: 'Dexametasona', dose: '4–8 mg/dia VO/SC (anti-inflamatório + redução de edema)', via: 'VO ou SC' },
      { farmaco: 'Morfina / Oxicodona', dose: 'Conforme degrau WHO 3', via: 'VO ou SC', observacao: 'Opioide base + resgate para dor irruptiva ao movimento' },
    ],
    farmacologia_2a_linha: [
      { farmaco: 'Pamidronato IV', dose: '90 mg IV em 2h q3–4 semanas (reduz dor óssea e hipercalcemia)', via: 'IV', observacao: 'Bisfosfonato de 2ª geração' },
      { farmaco: 'Ácido zoledrônico IV', dose: '4 mg IV em 15 min q3–4 semanas', via: 'IV', observacao: 'Bisfosfonato mais potente; cuidado em IR (ClCr < 35: contraindicado)' },
      { farmaco: 'Denosumabe SC', dose: '120 mg SC q4 semanas + Ca²⁺/Vit D', via: 'SC', observacao: 'Anti-RANK-L; alternativa em IR grave onde bisfosfonatos são contraindicados' },
    ],
    alertas: [
      'Risco de fratura: não mobilizar sem avaliação ortopédica em áreas de risco (fêmur, vértebras)',
      'Hipercalcemia: tratar com hidratação + bisfosfonato + corticoide',
      'Compressão medular: emergência paliativa — dexametasona 16 mg/dia IV imediato + RT urgente',
    ],
  },

  anorexia_caquexia: {
    sintoma: 'Anorexia / Caquexia em Cuidados Paliativos',
    avaliacao: [
      'Síndrome anorexia-caquexia: perda muscular + inflamação sistêmica + anorexia — NÃO responsiva a nutrição',
      'Diferenciar de anorexia por causa reversível (constipação, náusea, candidose oral, depressão)',
      'Alinhamento com paciente/família: expectativa realista — alimentação forçada não prolonga vida na caquexia terminal',
    ],
    intervencoes_nao_farmacologicas: [
      'Refeições pequenas e frequentes, alimentos preferidos do paciente',
      'Sem pressão para comer — refeição como prazer social, não obrigação',
      'Higiene oral (candidose, xerostomia)',
      'Adaptar consistência conforme disfagia',
    ],
    farmacologia_1a_linha: [
      { farmaco: 'Dexametasona', dose: '2–4 mg/dia VO pela manhã (estimulante de apetite — efeito temporário 4–8 semanas)', via: 'VO', observacao: 'Efeito a curto prazo; não muda sobrevida; indicar quando qualidade de vida é prioritária' },
      { farmaco: 'Acetato de megestrol', dose: '160–480 mg/dia VO (progestágeno — estimulante de apetite)', via: 'VO', observacao: 'Melhora apetite e bem-estar subjetivo; risco TEV' },
    ],
    farmacologia_2a_linha: [
      { farmaco: 'Mirtazapina', dose: '7,5–15 mg/noite VO (antidepressivo + orexígeno + antiemético)', via: 'VO', observacao: 'Útil quando depressão + anorexia + náusea coexistem' },
    ],
    alertas: [
      'Nutrição parenteral / enteral em caquexia terminal: sem benefício comprovado em sobrevida — pode aumentar desconforto (edema, secreções)',
      'Respeitar decisão informada do paciente sobre alimentação',
      'Nutrição é sempre ética discutir — nunca impor como obrigação terapêutica',
    ],
  },
};

// ────────────────────────────────────────────────────────────
// ÚLTIMAS HORAS / DIAS DE VIDA
// ────────────────────────────────────────────────────────────

export const LAST_DAYS_CARE = {
  sinais_morte_iminente: [
    'Extremidades frias e marmóreas (livedo reticular)',
    'Oligúria / anúria',
    'Rebaixamento do nível de consciência progressivo',
    'Estertores respiratórios',
    'Respiração irregular (Cheyne-Stokes ou periódica)',
    'Cianose labial e periungueal',
    'Nariz adelgaçado (perfil nasal afilado)',
    'Olhos semi-abertos',
  ],
  cuidados_prioritarios: [
    'Suspender medicações não paliativas (estatinas, anti-hipertensivos, metformina, diuréticos, antibióticos — a não ser para conforto)',
    'Manter: analgésico, antiemético, ansiolítico, anticolinérgico SC',
    'Suspender monitorização intrusiva (saturímetro, PA contínua, exames de sangue rotineiros)',
    'Via SC: converter todos os medicamentos orais para SC (IV se SC impossível)',
    'Nutrição/hidratação: avaliar individualmente — hidratação SC mínima (500 mL/dia) pode ser confortável; parenteral geralmente não indicada',
    'Higiene oral: crucial (ressecamento provoca desconforto mesmo inconsciente)',
    'Posicionamento confortável: mudança de decúbito suave q2–4h para prevenir escaras',
    'Família: presença ao lado, toque, conversa suave mesmo com paciente inconsciente',
  ],
  prescricao_antecipada: {
    descricao: 'Medicação de conforto antecipada — prescrever em ordem para manejo imediato de sintomas de fim de vida',
    itens: [
      { indicacao: 'Dor / Dispneia', farmaco: 'Morfina', dose: '2,5–5 mg SC q1–2h SOS', obs: 'Se já em morfina: 10% da dose total' },
      { indicacao: 'Agitação / Delirium terminal', farmaco: 'Midazolam', dose: '2,5–5 mg SC q1h SOS', obs: 'Se agitação grave: 10 mg SC' },
      { indicacao: 'Náusea / Vômito', farmaco: 'Haloperidol', dose: '0,5–1 mg SC q6h SOS', obs: 'Antiemético e antipsicótico' },
      { indicacao: 'Estertores / Secreções', farmaco: 'Hioscina butilbrometo', dose: '20 mg SC q4h SOS', obs: 'Reduz secreções orais' },
      { indicacao: 'Ansiedade / Dispneia com ansiedade', farmaco: 'Lorazepam', dose: '0,5–1 mg SL/SC q6–8h SOS', obs: 'Ansiolítico' },
    ],
  },
  comunicacao_familia: [
    'Informar sinais de morte iminente com antecedência (dias/horas)',
    '"Seu familiar está na fase final da vida. O corpo está desligando gradualmente."',
    'Esclarecer que estertores não causam sofrimento ao paciente',
    'Orientar sobre o que fazer no momento da morte',
    'Suporte ao luto: encaminhar para acompanhamento após o óbito',
    'Documentar diretivas antecipadas de vontade (DAV) se não feito',
  ],
};

// ────────────────────────────────────────────────────────────
// AVALIAÇÃO INTEGRADA
// ────────────────────────────────────────────────────────────

export function assessPalliativePatient(patient: PalliativePatient): {
  whoStep: WHOStep;
  ppsInterpretacao: ReturnType<typeof interpretPPS>;
  esasInterpretacao?: ReturnType<typeof interpretEsas>;
  alertas: string[];
  recomendacoes: string[];
} {
  const alertas: string[] = [];
  const recomendacoes: string[] = [];

  // PPS
  const ppsInterp = interpretPPS(patient.pps);
  if (patient.pps <= 20) {
    alertas.push('🔴 PPS ≤ 20%: fase agônica / últimas horas-dias');
    recomendacoes.push('Converter medicações para via SC', 'Prescricao antecipada de conforto', 'Presença familiar');
  } else if (patient.pps <= 40) {
    alertas.push('🟠 PPS ≤ 40%: expectativa semanas — revisar metas de cuidado');
    recomendacoes.push('Suspender medicações não paliativas', 'Conversa sobre fim de vida', 'Suporte familiar intensificado');
  }

  // ESAS
  let esasInterp: ReturnType<typeof interpretEsas> | undefined;
  if (patient.esasScores) {
    esasInterp = interpretEsas(patient.esasScores);
    if (esasInterp.sintomas_graves.length > 0) {
      alertas.push(`⚠ Sintomas graves (ESAS ≥ 7): ${esasInterp.sintomas_graves.join(', ')}`);
    }
    if (patient.esasScores.dor >= 4) recomendacoes.push('Revisar escada analgésica WHO');
    if (patient.esasScores.dispneia >= 4) recomendacoes.push('Morfina SC para dispneia + avaliar ansiedade');
    if (patient.esasScores.nausea >= 4) recomendacoes.push('Antieméticos: haloperidol SC ou metoclopramida');
  }

  // WHO step
  const dor = patient.esasScores?.dor ?? 0;
  let whoStep: WHOStep = 1;
  if (dor >= 7 || (patient.opioideAtual && ['morfina', 'oxicodona', 'hidromorfona', 'fentanil'].includes(patient.opioideAtual))) {
    whoStep = 3;
  } else if (dor >= 4 || (patient.opioideAtual && ['tramadol', 'codeina'].includes(patient.opioideAtual))) {
    whoStep = 2;
  }

  // Função renal
  if (patient.funcaoRenal === 'grave') {
    alertas.push('⚠ IR grave: evitar morfina (acúmulo M6G) — preferir fentanil TD ou buprenorfina TD');
  }

  // Constipação preventiva
  if (whoStep >= 2) {
    recomendacoes.push('Prescrever laxante profilático (OIC) junto ao opioide');
  }

  return { whoStep, ppsInterpretacao: ppsInterp, esasInterpretacao: esasInterp, alertas, recomendacoes };
}
