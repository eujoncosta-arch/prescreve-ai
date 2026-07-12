// ============================================================
// PRESCREVE-AI — ICU Engine: Medicina Intensiva + Emergência
// Phase 21.13
// ============================================================
// Referências: SSC 2021, PADIS 2018, ARDSNet, AHA ACLS 2020
// ============================================================

// ────────────────────────────────────────────────────────────
// TIPOS
// ────────────────────────────────────────────────────────────

export type ShockType = 'distributivo' | 'cardiogenico' | 'hipovolemico' | 'obstrutivo';
export type SepsisCategory = 'sem_sepse' | 'sepse' | 'choque_septico';
export type RassScore = -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4;
export type AclsRhythm = 'FV' | 'TVsP' | 'AESP' | 'assistolia' | 'bradicardia' | 'TSV' | 'FA' | 'TV_pulso';
export type ArdsBerlin = 'leve' | 'moderada' | 'grave';

export interface VasopressorDose {
  farmaco: string;
  dose_minima: number;
  dose_usual: number;
  dose_maxima: number;
  unidade: 'mcg/kg/min' | 'mcg/min' | 'UI/min' | 'mcg/kg/h';
  diluicao_padrao: string;
  preparo: string;
  efeitos_predominantes: string[];
  indicacao_preferencial: string;
  precaucoes: string[];
}

export interface SedationTarget {
  rass_alvo: RassScore;
  cenario: string;
  farmaco_1a_linha: string;
  farmaco_alternativo: string;
  duracao_maxima_recomendada?: string;
  observacoes: string[];
}

export interface SofaOrgan {
  orgao: string;
  variavel: string;
  pontos_0: string;
  pontos_1: string;
  pontos_2: string;
  pontos_3: string;
  pontos_4: string;
}

export interface AclsProtocol {
  ritmo: AclsRhythm;
  descricao: string;
  chocavel: boolean;
  sequencia: string[];
  farmacologia: { farmaco: string; dose: string; via: string; intervalo: string; observacao?: string }[];
  pontos_criticos: string[];
}

export interface VentilationStrategy {
  cenario: string;
  vc_alvo: string;
  platô_limite: string;
  driving_pressure: string;
  peep_estrategia: string;
  fio2_alvo: string;
  spo2_alvo: string;
  modalidade: string;
  observacoes: string[];
}

export interface SepsisBundle {
  hora: '1h' | '3h' | '6h';
  acoes: string[];
  farmacologia?: { item: string; detalhe: string }[];
}

// ────────────────────────────────────────────────────────────
// RASS — Richmond Agitation-Sedation Scale
// ────────────────────────────────────────────────────────────

export const RASS_SCALE: Record<RassScore, { descricao: string; comportamento: string; interpretacao: string }> = {
  4: {
    descricao: 'Combativo',
    comportamento: 'Abertamente combativo, violento, risco imediato para equipe',
    interpretacao: 'Agitação grave — avaliar causa + sedação imediata',
  },
  3: {
    descricao: 'Muito agitado',
    comportamento: 'Puxa ou remove tubo / cateteres; agressivo',
    interpretacao: 'Agitação moderada-grave — titular sedação',
  },
  2: {
    descricao: 'Agitado',
    comportamento: 'Movimentos frequentes e sem propósito, luta com o ventilador',
    interpretacao: 'Agitação moderada',
  },
  1: {
    descricao: 'Inquieto',
    comportamento: 'Ansioso, mas movimentos não são agressivos',
    interpretacao: 'Agitação leve',
  },
  0: {
    descricao: 'Alerta e calmo',
    comportamento: 'Estado ideal',
    interpretacao: 'Meta padrão (PADIS 2018)',
  },
  [-1]: {
    descricao: 'Sonolento',
    comportamento: 'Não totalmente alerta; despertar sustentado (> 10 s) por voz',
    interpretacao: 'Sedação leve — aceitável em pós-op imediato',
  },
  [-2]: {
    descricao: 'Sedação leve',
    comportamento: 'Despertar breve (< 10 s) por voz; contato visual',
    interpretacao: 'Sedação leve-alvo em VM prolongada (evitar sedação profunda)',
  },
  [-3]: {
    descricao: 'Sedação moderada',
    comportamento: 'Movimento ou abertura de olhos por voz (sem contato visual)',
    interpretacao: 'Sedação moderada — apenas em indicações específicas',
  },
  [-4]: {
    descricao: 'Sedação profunda',
    comportamento: 'Nenhuma resposta à voz; resposta ao estímulo físico',
    interpretacao: 'Indicações: ARDS grave, status epiléptico, hipertensão intracraniana',
  },
  [-5]: {
    descricao: 'Não responsivo',
    comportamento: 'Nenhuma resposta à voz ou estímulo físico',
    interpretacao: 'Sedação máxima — uso criterioso; associar BNM se necessário',
  },
};

// ────────────────────────────────────────────────────────────
// SOFA — Sequential Organ Failure Assessment
// ────────────────────────────────────────────────────────────

export const SOFA_TABLE: SofaOrgan[] = [
  {
    orgao: 'Respiratório',
    variavel: 'PaO₂/FiO₂',
    pontos_0: '≥ 400',
    pontos_1: '300–399',
    pontos_2: '200–299',
    pontos_3: '100–199 (+ suporte ventilatório)',
    pontos_4: '< 100 (+ suporte ventilatório)',
  },
  {
    orgao: 'Coagulação',
    variavel: 'Plaquetas (×10³/mm³)',
    pontos_0: '≥ 150',
    pontos_1: '100–149',
    pontos_2: '50–99',
    pontos_3: '20–49',
    pontos_4: '< 20',
  },
  {
    orgao: 'Hepático',
    variavel: 'Bilirrubina (mg/dL)',
    pontos_0: '< 1,2',
    pontos_1: '1,2–1,9',
    pontos_2: '2,0–5,9',
    pontos_3: '6,0–11,9',
    pontos_4: '≥ 12,0',
  },
  {
    orgao: 'Cardiovascular',
    variavel: 'PAM / Vasopressor',
    pontos_0: 'PAM ≥ 70 mmHg',
    pontos_1: 'PAM < 70 mmHg',
    pontos_2: 'Dopamina ≤ 5 ou dobutamina (qualquer dose)',
    pontos_3: 'Dopamina 5–15 ou norepinefrina/epinefrina ≤ 0,1 mcg/kg/min',
    pontos_4: 'Dopamina > 15 ou norepinefrina/epinefrina > 0,1 mcg/kg/min',
  },
  {
    orgao: 'SNC',
    variavel: 'Escala de Glasgow',
    pontos_0: '15',
    pontos_1: '13–14',
    pontos_2: '10–12',
    pontos_3: '6–9',
    pontos_4: '< 6',
  },
  {
    orgao: 'Renal',
    variavel: 'Creatinina (mg/dL) / Débito urinário',
    pontos_0: '< 1,2',
    pontos_1: '1,2–1,9',
    pontos_2: '2,0–3,4',
    pontos_3: '3,5–4,9 ou DU < 500 mL/dia',
    pontos_4: '≥ 5,0 ou DU < 200 mL/dia',
  },
];

export function calcSofa(scores: number[]): { total: number; mortalidade: string; interpretacao: string } {
  const total = scores.reduce((a, b) => a + b, 0);
  let mortalidade: string;
  let interpretacao: string;
  if (total <= 1) { mortalidade = '< 10%'; interpretacao = 'Disfunção mínima'; }
  else if (total <= 3) { mortalidade = '~15%'; interpretacao = 'Disfunção leve'; }
  else if (total <= 6) { mortalidade = '~20–30%'; interpretacao = 'Disfunção moderada'; }
  else if (total <= 9) { mortalidade = '~40–60%'; interpretacao = 'Disfunção grave'; }
  else if (total <= 12) { mortalidade = '~50–60%'; interpretacao = 'Falência múltipla de órgãos'; }
  else { mortalidade = '> 80%'; interpretacao = 'Falência múltipla grave'; }
  return { total, mortalidade, interpretacao };
}

// qSOFA
export interface QsofaResult {
  score: number;
  alerta: boolean;
  criterios: { criterio: string; presente: boolean }[];
}

export function calcQsofa(
  alteracaoConsciencia: boolean,
  fr_ge_22: boolean,
  pas_le_100: boolean,
): QsofaResult {
  const score = [alteracaoConsciencia, fr_ge_22, pas_le_100].filter(Boolean).length;
  return {
    score,
    alerta: score >= 2,
    criterios: [
      { criterio: 'Alteração de consciência (Glasgow < 15)', presente: alteracaoConsciencia },
      { criterio: 'FR ≥ 22 ipm', presente: fr_ge_22 },
      { criterio: 'PAS ≤ 100 mmHg', presente: pas_le_100 },
    ],
  };
}

// ────────────────────────────────────────────────────────────
// SEPSE — Surviving Sepsis Campaign 2021
// ────────────────────────────────────────────────────────────

export const SEPSIS_BUNDLES: SepsisBundle[] = [
  {
    hora: '1h',
    acoes: [
      'Medir lactato (repetir se > 2 mmol/L)',
      'Coletar hemoculturas × 2 pares ANTES dos antibióticos',
      'Antibióticos de amplo espectro (ver sepse-bundle-abx)',
      'Ressuscitação volêmica: SF 0,9% ou RL 30 mL/kg em 1–3h se hipoperfusão',
      'Iniciar vasopressores se PAM < 65 mmHg durante ou após volume',
    ],
    farmacologia: [
      { item: 'Norepinefrina (1ª linha)', detalhe: '0,01–3 mcg/kg/min — titular PAM ≥ 65 mmHg' },
      { item: 'Hidrocortisona (refratário)', detalhe: '200 mg/dia IV (50 mg 6/6h ou 200 mg/dia IC) se norepinefrina > 0,25 mcg/kg/min' },
      { item: 'Vitamina C (controverso)', detalhe: '1,5 g IV 6/6h × 4 dias (não recomendado rotineiramente — SSC 2021 fraca recomendação)' },
    ],
  },
  {
    hora: '3h',
    acoes: [
      'Remensurar lactato se inicial > 2 mmol/L',
      'Reavaliar resposta ao volume (não infundir volume cegamente — avaliar responsividade)',
      'Considerar ecocardiografia para avaliar função ventricular',
      'Ultrassom à beira do leito: VCI, função cardíaca',
    ],
  },
  {
    hora: '6h',
    acoes: [
      'Alcançar PAM ≥ 65 mmHg',
      'Normalizar lactato (alvo < 2 mmol/L)',
      'Débito urinário ≥ 0,5 mL/kg/h',
      'Reavaliação clínica contínua — desescalamento precoce quando possível',
      'Controle glicêmico: alvo 140–180 mg/dL (insulina IV se necessário)',
      'Profilaxia: TVP (HBPM) + úlcera de estresse (IBP se FR)',
    ],
  },
];

// Choque — classificação e manejo
export const SHOCK_CLASSIFICATION: Record<ShockType, {
  descricao: string;
  fisiopatologia: string;
  causas_principais: string[];
  parametros_hemodinamicos: { DC: string; RVP: string; PVC: string; POAP: string };
  tratamento_inicial: string[];
  vasopressor_escolha: string;
}> = {
  distributivo: {
    descricao: 'Choque distributivo (séptico / anafilático / neurogênico)',
    fisiopatologia: 'Vasodilatação sistêmica → ↓ RVP → ↑ DC compensatório → hipoperfusão tecidual',
    causas_principais: ['Sepse / choque séptico', 'Anafilaxia', 'Choque neurogênico', 'Crise adrenal', 'Choque por hepatopatia grave'],
    parametros_hemodinamicos: { DC: '↑ (hiperdinâmico)', RVP: '↓↓', PVC: '↓ ou N', POAP: '↓ ou N' },
    tratamento_inicial: ['Volume (30 mL/kg)', 'Norepinefrina 1ª linha', 'Vasopressina 2ª linha', 'Epinefrina (anafilaxia)', 'Corticoide se refratário (séptico)', 'Epinefrina IM 0,3 mg (anafilaxia)'],
    vasopressor_escolha: 'Norepinefrina 0,01–3 mcg/kg/min',
  },
  cardiogenico: {
    descricao: 'Choque cardiogênico',
    fisiopatologia: 'Disfunção miocárdica primária → ↓ DC → ↑ RVP compensatório → congestão + hipoperfusão',
    causas_principais: ['IAM com disfunção VE (IAMCSST)', 'IC descompensada grave', 'Miocardite fulminante', 'Arritmia grave sustentada', 'Tamponamento cardíaco (obstrutivo)'],
    parametros_hemodinamicos: { DC: '↓↓', RVP: '↑↑', PVC: '↑', POAP: '↑' },
    tratamento_inicial: ['Dobutamina (inotropia)', 'Norepinefrina se PA muito baixa', 'Diurético se congestão', 'Revascularização precoce (IAM)', 'IABP / ECMO em casos selecionados', 'Evitar volume!'],
    vasopressor_escolha: 'Dobutamina 2–20 mcg/kg/min (inotropia) + Norepinefrina se hipotensão',
  },
  hipovolemico: {
    descricao: 'Choque hipovolêmico (hemorrágico / não-hemorrágico)',
    fisiopatologia: 'Depleção de volume → ↓ pré-carga → ↓ DC → vasoconstrição reflexa compensatória',
    causas_principais: ['Hemorragia (trauma, GI, cirúrgico)', 'Perdas GI (diarreia, vômito graves)', 'Queimaduras extensas', 'Pancreatite grave'],
    parametros_hemodinamicos: { DC: '↓', RVP: '↑↑', PVC: '↓↓', POAP: '↓↓' },
    tratamento_inicial: ['Controle do sangramento (cirurgia/endoscopia)', 'Reposição volêmica: cristaloide + hemoderivados', 'Transfusão em pacotes (ratio 1:1:1 plasma:plaquetas:CH)', 'Ácido tranexâmico 1 g IV se trauma < 3h', 'Vasopressor como ponte — não substituir volume'],
    vasopressor_escolha: 'Norepinefrina como ponte — foco na reposição de volume/hemoderivados',
  },
  obstrutivo: {
    descricao: 'Choque obstrutivo',
    fisiopatologia: 'Obstrução mecânica ao fluxo → ↓ pré-carga efetiva e/ou ↑ pós-carga aguda',
    causas_principais: ['TEP maciço (obstrução VD)', 'Tamponamento cardíaco', 'Pneumotórax hipertensivo', 'Síndrome de veia cava superior'],
    parametros_hemodinamicos: { DC: '↓↓', RVP: '↑↑', PVC: '↑↑', POAP: 'N ou ↓' },
    tratamento_inicial: ['TEP: anticoagulação + trombólise (alteplase 100 mg IV) ou embolectomia cirúrgica', 'Tamponamento: pericardiocentese de urgência', 'PNX hipertensivo: descompressão torácica imediata (agulha 2° EIC linha hemiclavicular, depois dreno)'],
    vasopressor_escolha: 'Norepinefrina como ponte — tratar causa subjacente',
  },
};

// ────────────────────────────────────────────────────────────
// VASOATIVOS — Tabela de Doses
// ────────────────────────────────────────────────────────────

export const VASOPRESSOR_TABLE: VasopressorDose[] = [
  {
    farmaco: 'Norepinefrina',
    dose_minima: 0.01,
    dose_usual: 0.1,
    dose_maxima: 3.0,
    unidade: 'mcg/kg/min',
    diluicao_padrao: '4 mg em 250 mL SG 5% → 16 mcg/mL',
    preparo: '4 mg em 250 mL SG 5% (concentração 16 mcg/mL). Infundir em CVC.',
    efeitos_predominantes: ['α1 predominante (vasoconstrição)', 'β1 moderado (inotropia leve)', '↑ PAM sem taquicardia significativa'],
    indicacao_preferencial: '1ª linha em choque séptico e distributivo; ponte em choque hemorrágico e obstrutivo',
    precaucoes: ['Acesso venoso central obrigatório (necrose se extravasamento)', 'Monitorar isquemia de extremidades em doses altas', 'Associar vasopressina se doses altas (> 0,5 mcg/kg/min)'],
  },
  {
    farmaco: 'Epinefrina',
    dose_minima: 0.01,
    dose_usual: 0.1,
    dose_maxima: 1.0,
    unidade: 'mcg/kg/min',
    diluicao_padrao: '4 mg em 250 mL SG 5% → 16 mcg/mL',
    preparo: '4 mg em 250 mL SG 5%. Para anafilaxia: 0,3 mg IM (adulto).',
    efeitos_predominantes: ['α + β1 + β2', 'Baixas doses: β2 (broncodilatação, inotrópico)', 'Altas doses: α predominante (vasoconstrição)'],
    indicacao_preferencial: 'PCR (dose única 1 mg IV q3–5 min) | Anafilaxia (0,3–0,5 mg IM) | Choque cardiogênico refratário',
    precaucoes: ['Taquicardia e arritmias', 'Hiperglicemia e hiperlactatemia', 'Isquemia miocárdica em doses altas'],
  },
  {
    farmaco: 'Vasopressina',
    dose_minima: 0.01,
    dose_usual: 0.03,
    dose_maxima: 0.04,
    unidade: 'UI/min',
    diluicao_padrao: '20 UI em 100 mL SG 5% → 0,2 UI/mL',
    preparo: '20 UI em 100 mL SG 5% (0,2 UI/mL). Infusão fixa: 0,03 UI/min não titular.',
    efeitos_predominantes: ['V1R: vasoconstrição esplâncnica e sistêmica', 'Poupador de norepinefrina', 'Efeito antidiurético (V2R) em doses < 0,03 UI/min'],
    indicacao_preferencial: '2ª linha em choque séptico (junto a norepinefrina quando > 0,25 mcg/kg/min)',
    precaucoes: ['Isquemia mesentérica (doses > 0,04 UI/min)', 'Hiponatremia', 'Bradicardia reflexa', 'NÃO aumentar dose — dose fixa 0,03 UI/min'],
  },
  {
    farmaco: 'Dobutamina',
    dose_minima: 2.0,
    dose_usual: 5.0,
    dose_maxima: 20.0,
    unidade: 'mcg/kg/min',
    diluicao_padrao: '250 mg em 250 mL SG 5% → 1000 mcg/mL (1 mg/mL)',
    preparo: '250 mg em 250 mL SG 5%. Pode infundir em veia periférica (excepcionalmente).',
    efeitos_predominantes: ['β1 predominante (inotrópico positivo)', 'β2 leve (vasodilatação leve)', '↑ DC sem ↑ PAM significativa'],
    indicacao_preferencial: 'Choque cardiogênico com DC baixo | Hipoperfusão com POAP elevada e PA adequada',
    precaucoes: ['Taquicardia e pró-arrítmico', 'NÃO usar em choque distributivo (piora hipotensão)', 'Tolerância (taquifilaxia) com uso > 72h', 'Aumentar norepinefrina se hipotensão'],
  },
  {
    farmaco: 'Dopamina',
    dose_minima: 1.0,
    dose_usual: 10.0,
    dose_maxima: 20.0,
    unidade: 'mcg/kg/min',
    diluicao_padrao: '200 mg em 250 mL SG 5% → 800 mcg/mL',
    preparo: '200 mg em 250 mL SG 5% (800 mcg/mL).',
    efeitos_predominantes: [
      '1–4 mcg/kg/min: dopaminérgico (splâncnico/renal — efeito protetor renal NÃO comprovado)',
      '4–10 mcg/kg/min: β1 predominante (inotrópico)',
      '> 10 mcg/kg/min: α predominante (vasoconstrição)',
    ],
    indicacao_preferencial: 'Choque cardiogênico com bradicardia como causa | 2ª linha após norepinefrina (mais arritmogênica)',
    precaucoes: ['Mais arritmogênica que norepinefrina (SOAP II: ↑ FA)', 'SSC 2021: norepinefrina preferível ao dopamina em choque séptico', 'Extravasamento: fentolamine 5 mg SC local'],
  },
  {
    farmaco: 'Milrinona',
    dose_minima: 0.125,
    dose_usual: 0.375,
    dose_maxima: 0.75,
    unidade: 'mcg/kg/min',
    diluicao_padrao: '20 mg em 100 mL SG 5% → 200 mcg/mL',
    preparo: 'Ataque opcional: 50 mcg/kg IV em 10 min (risco hipotensão — evitar em instáveis).',
    efeitos_predominantes: ['Inibidor de PDE-3 (↑ AMPc)', 'Inotrópico + vasodilatador (lusitrópico)', 'Não adrenérgico — util se dessensibilização β-adrenérgica'],
    indicacao_preferencial: 'IC refratária com uso crônico de β-bloqueador | Disfunção VD (TEP, HTP) | Bridge to transplant',
    precaucoes: ['Hipotensão (vasodilatação sistêmica e pulmonar)', 'Acumula em IR (reduzir dose se ClCr < 30)', 'Arritmias — monitorar ECG'],
  },
  {
    farmaco: 'Fenilefrina',
    dose_minima: 0.5,
    dose_usual: 2.0,
    dose_maxima: 9.0,
    unidade: 'mcg/kg/min',
    diluicao_padrao: '100 mg em 250 mL SG 5% → 400 mcg/mL',
    preparo: '100 mg em 250 mL SG 5%.',
    efeitos_predominantes: ['α1 puro (vasoconstrição) — sem efeito β', 'Bradicardia reflexa', '↑ PAM sem ↑ FC'],
  indicacao_preferencial: 'Hipotensão perioperatória (anestesia) | TSV por via acessória + hipotensão (aumenta tônus vagal) | Quando taquicardia indesejável',
    precaucoes: ['NÃO usar em choque cardiogênico (aumenta pós-carga)', 'Bradicardia reflexa intensa', 'Reduz DC (sem efeito β1)'],
  },
];

// Calculadora de infusão de vasoativos
export function calcVasopressorInfusion(
  farmaco: string,
  dose_mcg_kg_min: number,
  peso_kg: number,
  concentracao_mcg_mL: number,
): { ml_h: number; ml_min: number } {
  const mcg_h = dose_mcg_kg_min * peso_kg * 60;
  const ml_h = mcg_h / concentracao_mcg_mL;
  return { ml_h: Math.round(ml_h * 10) / 10, ml_min: Math.round((ml_h / 60) * 100) / 100 };
}

// ────────────────────────────────────────────────────────────
// SEDAÇÃO e ANALGESIA (PADIS 2018)
// ────────────────────────────────────────────────────────────

export const SEDATION_PROTOCOLS: SedationTarget[] = [
  {
    rass_alvo: -1,
    cenario: 'VM em desmame — sedação leve',
    farmaco_1a_linha: 'Dexmedetomidina 0,2–1,5 mcg/kg/h',
    farmaco_alternativo: 'Propofol 5–50 mcg/kg/min',
    duracao_maxima_recomendada: 'Propofol > 7 dias: SÍNDROME DE INFUSÃO DE PROPOFOL (triglicerídeos, CK, acidose)',
    observacoes: [
      'PADIS 2018: sedação leve (RASS -1 a 0) → melhores desfechos que sedação profunda',
      'Avaliar diariamente: despertar espontâneo (SAT) + prova de ventilação espontânea (SBT)',
      'Analgesia PRIMEIRO — "analgesia-first" (reduz dose de sedativo)',
      'Dexmedetomidina: preferir em delirium hiperativo ou desmame difícil',
    ],
  },
  {
    rass_alvo: -2,
    cenario: 'VM em fase aguda, agitação moderada',
    farmaco_1a_linha: 'Propofol 5–50 mcg/kg/min',
    farmaco_alternativo: 'Midazolam 0,02–0,1 mg/kg/h',
    duracao_maxima_recomendada: 'Midazolam IV: limitar a < 48h (acúmulo, delirium, desmame difícil)',
    observacoes: [
      'Midazolam: evitar em idosos e IR/IH (acúmulo de metabólito ativo 1-OH-midazolam)',
      'Propofol: monitorar triglicerídeos e CK se uso > 48h',
    ],
  },
  {
    rass_alvo: -4,
    cenario: 'ARDS grave, hipertensão intracraniana, status epiléptico, síncronização com VM',
    farmaco_1a_linha: 'Midazolam 0,05–0,2 mg/kg/h + Fentanil IC',
    farmaco_alternativo: 'Propofol (se não ARDS grave) + Fentanil IC',
    observacoes: [
      'ARDS grave (PaO2/FiO2 < 150): considerar BNM (cisatracúrio 37,5 mg/h × 48h — ACURASYS trial)',
      'HIC: evitar propofol em > 70 kg/dose alta (↑ PIC por vasodilatação cerebral)',
      'Midazolam: ketamina pode ser adjuvante para poupar BDZ',
    ],
  },
];

export const ANALGESIA_PROTOCOLS = {
  escala_cpot: {
    descricao: 'Critical-Care Pain Observation Tool (CPOT) — para pacientes não comunicativos',
    itens: [
      { item: 'Expressão facial', pontos: '0 = relaxado | 1 = tenso | 2 = careteando' },
      { item: 'Movimentos corporais', pontos: '0 = ausência | 1 = proteção | 2 = agitação' },
      { item: 'Tônus muscular', pontos: '0 = relaxado | 1 = tenso/rígido | 2 = resistência total' },
      { item: 'Ventilação (intubado)', pontos: '0 = tolerando VM | 1 = tosse (não brigar) | 2 = brigando com VM' },
    ],
    interpretacao: '0–2: sem dor | 3–4: dor leve | ≥ 5: dor moderada-grave (tratar)',
  },
  analgesia_first: [
    'Tratar dor ANTES de sedar (analgesia-first — PADIS 2018)',
    'Fentanil IC: 25–100 mcg/h — titule até CPOT ≤ 2',
    'Morfina: evitar em IR (acúmulo de morfina-6-glucuronídeo)',
    'Remifentanil: meia-vida ultracurta — útil em desmame, mas custo elevado',
    'Acetaminofen IV: 1 g 6/6h — poupador de opioide',
    'Cetamina: 0,1–0,5 mg/kg/h como adjuvante opiáceo em dor refratária',
  ],
  opioide_infusao: [
    { farmaco: 'Fentanil', dose: '25–200 mcg/h IC', preparo: '500 mcg em 100 mL SG → 5 mcg/mL', vantagem: 'Sem acúmulo em IR, sem histamina' },
    { farmaco: 'Morfina', dose: '1–10 mg/h IC', preparo: '50 mg em 100 mL SF → 0,5 mg/mL', vantagem: 'Custo menor', desvantagem: 'Acumula em IR (M6G) — evitar' },
    { farmaco: 'Remifentanil', dose: '0,05–0,3 mcg/kg/min IC', preparo: '5 mg em 50 mL SG → 100 mcg/mL', vantagem: 'Meia-vida 3–10 min (contexto-insensível), ideal para desmame' },
    { farmaco: 'Sufentanil', dose: '10–30 mcg/h IC', preparo: '250 mcg em 50 mL SG → 5 mcg/mL', vantagem: 'Alta potência, estável hemodinamicamente' },
  ],
};

// ────────────────────────────────────────────────────────────
// BLOQUEADORES NEUROMUSCULARES (BNM)
// ────────────────────────────────────────────────────────────

export const NMB_PROTOCOLS = {
  indicacoes_icu: [
    'ARDS grave: PaO₂/FiO₂ < 150 com FiO₂ > 0,6 e PEEP ≥ 5 (cisatracúrio × 48h)',
    'Status epiléptico refratário (junto a sedação profunda + EEG contínuo)',
    'Hipertensão intracraniana refratária',
    'Hipotermia terapêutica (prevenir tremores)',
    'Laringospasmo refratário',
    'Tétano grave',
  ],
  monitoramento_tof: {
    descricao: 'Train-of-Four (TOF) — monitoramento de bloqueio neuromuscular',
    alvo_manutencao: '1–2 respostas em 4 (T1/T4: 25–50%)',
    locais: ['Nervo ulnar (polegar) — preferencial', 'Nervo facial', 'Nervo tibial posterior'],
    valores: {
      '0/4': 'Bloqueio profundo > 95% (evitar — exceto intubação)',
      '1–2/4': 'Bloqueio moderado (alvo em ARDS — reduzir dose se < 1)',
      '3–4/4': 'Bloqueio leve — aumentar dose ou verificar tolerância',
    },
  },
  intubacao_sri: {
    sequencia: [
      '0 min: Pré-oxigenação com O₂ 100% por 3–5 min (VNI ou MR + BVM se necessário)',
      '0 min: Posição semi-sentada 20–30° (exceto TCE/instabilidade C)',
      '3 min: Pré-medicação (Fentanil 1–2 mcg/kg IV lento — atenuar reflexo de intubação)',
      '3 min: Etomidato 0,3 mg/kg IV OU Ketamina 1,5 mg/kg IV (indução)',
      '3 min + 15s: Succinilcolina 1,5 mg/kg IV OU Rocurônio 1,2 mg/kg IV (bloqueio)',
      '3 min + 45s: Laringoscopia e IOT quando relaxamento muscular completo',
      'Confirmação: capnografia contínua + radiografia de tórax',
    ],
    contraindicacoes_sux: [
      'Hipercalemia grave (queimados, trauma > 24h, imobilização prolongada, denervação)',
      'Distrofia muscular / miopatias',
      'Hipertermia maligna familiar',
      'Hipersensibilidade',
    ],
  },
  reversao: {
    sugamadex: {
      indicacao: 'Reversão de rocurônio / vecurônio',
      dose_bloqueio_moderado: '2 mg/kg IV (TOF 1–2)',
      dose_bloqueio_profundo: '4 mg/kg IV (TOF 0, presença de fasciculações)',
      dose_emergencia: '16 mg/kg IV (reversão imediata se 1,2 mg/kg rocurônio — cannot intubate/cannot oxygenate)',
    },
    neostigmina: {
      indicacao: 'Reversão de agentes não-despolarizantes (cisatracúrio, atracúrio)',
      dose: '0,05 mg/kg IV máx 5 mg + Atropina 0,02 mg/kg (prevenir bradicardia)',
      observacao: 'Aguardar TOF ≥ 2 para reverter com neostigmina — ineficaz em bloqueio profundo',
    },
  },
};

// ────────────────────────────────────────────────────────────
// PCR — ACLS 2020
// ────────────────────────────────────────────────────────────

export const ACLS_PROTOCOLS: AclsProtocol[] = [
  {
    ritmo: 'FV',
    descricao: 'Fibrilação ventricular (FV)',
    chocavel: true,
    sequencia: [
      '1. Confirmar PCR — checar pulso (≤ 10 s)',
      '2. Iniciar RCP imediatamente (30:2 ou contínua se IOT)',
      '3. DEA/monitor — identificar FV',
      '4. CHOQUE: bifásico 200 J (monofásico 360 J)',
      '5. RCP imediata × 2 min — NÃO checar ritmo após choque',
      '6. Checar ritmo: FV persistente → choque + Epinefrina 1 mg IV/IO q3–5 min',
      '7. 3° choque sem reversão → Amiodarona 300 mg IV bolus',
      '8. Repetir ciclos: choque → RCP 2 min → epinefrina → choque → amiodarona 150 mg',
    ],
    farmacologia: [
      { farmaco: 'Epinefrina', dose: '1 mg', via: 'IV/IO', intervalo: 'q3–5 min (após 2° choque sem reversão)', observacao: 'Primeira epinefrina o mais cedo possível' },
      { farmaco: 'Amiodarona', dose: '300 mg', via: 'IV/IO bolus', intervalo: '3° choque; repetir 150 mg se FV/TVsP persistente' },
      { farmaco: 'Lidocaína (alt.)', dose: '1–1,5 mg/kg', via: 'IV/IO', intervalo: 'Alternativa à amiodarona; repetir 0,5–0,75 mg/kg q5–10 min (máx 3 mg/kg)' },
    ],
    pontos_criticos: [
      'Profundidade compressões: 5–6 cm, frequência 100–120/min',
      'Minimizar interrupções (< 10 s)',
      'Capnografia: PETCO₂ < 10 mmHg após 20 min → prognóstico ruim',
      'Acesso vascular: IV periférico 1ª opção; IO se impossível; veia central demora mas aceita',
      'H5T5: Hipóxia, Hipovolemia, Hipo/Hipercalemia, H⁺ (acidose), Hipotermia | Tensão (PNX), Tamponamento, TEP, Trombose (IAM), Tóxicos',
    ],
  },
  {
    ritmo: 'TVsP',
    descricao: 'Taquicardia ventricular sem pulso',
    chocavel: true,
    sequencia: [
      '1. PCR confirmada — ritmo chocável',
      '2. RCP + choque imediato (mesmo algoritmo FV)',
    ],
    farmacologia: [
      { farmaco: 'Epinefrina', dose: '1 mg', via: 'IV/IO', intervalo: 'q3–5 min' },
      { farmaco: 'Amiodarona', dose: '300 mg → 150 mg', via: 'IV/IO', intervalo: '3° choque sem reversão' },
    ],
    pontos_criticos: ['Mesmo protocolo da FV — ritmo chocável'],
  },
  {
    ritmo: 'AESP',
    descricao: 'Atividade Elétrica Sem Pulso (AESP)',
    chocavel: false,
    sequencia: [
      '1. RCP imediata (30:2)',
      '2. Epinefrina 1 mg IV/IO q3–5 min a partir do INÍCIO',
      '3. Investigar e tratar causas reversíveis (H5T5)',
      '4. Checar ritmo a cada 2 min — se organizado: checar pulso',
      '5. POCUS à beira do leito (ECO): avaliar tamponamento, VD dilatado (TEP), hipovolemia',
    ],
    farmacologia: [
      { farmaco: 'Epinefrina', dose: '1 mg', via: 'IV/IO', intervalo: 'q3–5 min (imediato — não esperar choque)' },
    ],
    pontos_criticos: [
      'Não há choque — foco em tratar causa reversível',
      'POCUS urgente: tamponamento → pericardiocentese imediata',
      'Hipovolemia: cristaloide rápido (500–1000 mL)',
      'TEP maciço: alteplase 50–100 mg IV ou embolectomia',
      'Hipercalemia: gluconato de cálcio 1 g IV (estabiliza membrana)',
    ],
  },
  {
    ritmo: 'assistolia',
    descricao: 'Assistolia',
    chocavel: false,
    sequencia: [
      '1. RCP imediata',
      '2. Epinefrina 1 mg IV/IO q3–5 min',
      '3. Confirmar assistolia em 2 derivações (excluir artefato)',
      '4. Investigar H5T5',
      '5. Considerar encerramento da reanimação após 20 min sem causa reversível',
    ],
    farmacologia: [
      { farmaco: 'Epinefrina', dose: '1 mg IV/IO', via: 'IV/IO', intervalo: 'q3–5 min (imediato)' },
    ],
    pontos_criticos: [
      'Pior prognóstico — raramente revertida sem causa tratável',
      'PETCO₂ < 10 mmHg em 20 min de RCP: considerar encerramento',
    ],
  },
  {
    ritmo: 'bradicardia',
    descricao: 'Bradicardia sintomática (FC < 50 + instabilidade hemodinâmica)',
    chocavel: false,
    sequencia: [
      '1. Identificar: FC < 50 com hipotensão, síncope, dispneia ou isquemia',
      '2. Atropina 1 mg IV — repetir q3–5 min (máx 3 mg)',
      '3. Sem resposta: marca-passo transcutâneo (IMEDIATO se BAV alto grau)',
      '4. Dopamina 2–20 mcg/kg/min OU Epinefrina 2–10 mcg/min se MP indisponível',
      '5. Marca-passo transvenoso se persistente',
    ],
    farmacologia: [
      { farmaco: 'Atropina', dose: '1 mg IV', via: 'IV', intervalo: 'q3–5 min | máx 3 mg (doses < 0,5 mg podem paradoxalmente piorar)' },
      { farmaco: 'Dopamina', dose: '2–20 mcg/kg/min IC', via: 'IV', intervalo: 'Infusão contínua' },
      { farmaco: 'Epinefrina', dose: '2–10 mcg/min IC', via: 'IV', intervalo: 'Infusão contínua' },
    ],
    pontos_criticos: [
      'BAV total: marca-passo IMEDIATO (não perder tempo com drogas)',
      'Atropina ineficaz em BAV infranodal (BAV 2° tipo 2, BAV total com QRS largo)',
      'Bloqueio por fármacos (β-bloqueador): glucagon 3–5 mg IV; por BCC: cloreto de cálcio 1 g IV',
    ],
  },
  {
    ritmo: 'TSV',
    descricao: 'Taquicardia supraventricular com QRS estreito',
    chocavel: false,
    sequencia: [
      '1. Avaliar estabilidade hemodinâmica (PA, consciência)',
      '2. Instável → cardioversão sincronizada 50–100 J imediata',
      '3. Estável → manobras vagais (Valsalva modificado): inclinar paciente + elevar pernas + expiração forçada',
      '4. Adenosina 6 mg IV bolus rápido (seguido de flush SF 20 mL rápido)',
      '5. Se sem resposta: adenosina 12 mg IV; repetir 12 mg se necessário',
      '6. Se sem resposta ou recorrência: amiodarona ou β-bloqueador (metoprolol)',
    ],
    farmacologia: [
      { farmaco: 'Adenosina', dose: '6 mg IV bolus (12 mg se sem resposta × 2)', via: 'IV central ou antecubital', intervalo: 'Bolus único + flush imediato 20 mL SF rápido', observacao: 'Meia-vida < 10 s. Avisar paciente de mal-estar transitório. NÃO usar em asma grave, FA pré-excitação.' },
      { farmaco: 'Metoprolol', dose: '2,5–5 mg IV lento (máx 15 mg)', via: 'IV', intervalo: 'q5 min se necessário' },
      { farmaco: 'Amiodarona', dose: '150 mg IV em 10 min → 1 mg/min × 6h → 0,5 mg/min × 18h', via: 'IV', intervalo: 'Dose de ataque + manutenção' },
    ],
    pontos_criticos: [
      'Wolf-Parkinson-White (WPW): NÃO usar adenosina, verapamil, digoxina, amiodarona em FA/flutter associado — cardioversão elétrica',
      'Valsalva modificado: eficácia superior ao Valsalva clássico',
    ],
  },
];

// Cálculo de dose de epinefrina em PCR
export function calcEpinephrinePCR(pesoKg: number, tipo: 'bolus' | 'infusao' = 'bolus'): string {
  if (tipo === 'bolus') return `Epinefrina 1 mg IV (dose fixa em adultos)`;
  const dose = 0.01 * pesoKg;
  return `Epinefrina ${dose.toFixed(2)} mg IV (${(dose * 1000).toFixed(0)} mcg) — 0,01 mg/kg`;
}

// ────────────────────────────────────────────────────────────
// VENTILAÇÃO MECÂNICA
// ────────────────────────────────────────────────────────────

export const ARDS_BERLIN: Record<ArdsBerlin, {
  pao2_fio2: string;
  peep_minimo: string;
  mortalidade: string;
  estrategia: string[];
}> = {
  leve: {
    pao2_fio2: '200–300 mmHg com PEEP/CPAP ≥ 5 cmH₂O',
    peep_minimo: '5 cmH₂O',
    mortalidade: '~27%',
    estrategia: ['VC 6 mL/kg PPI', 'Platô ≤ 30 cmH₂O', 'PEEP pela tabela ARDSNet baixa', 'SPO₂ 88–95%'],
  },
  moderada: {
    pao2_fio2: '100–199 mmHg com PEEP ≥ 5 cmH₂O',
    peep_minimo: '5 cmH₂O',
    mortalidade: '~32%',
    estrategia: ['VC 4–6 mL/kg PPI', 'Platô ≤ 30 cmH₂O', 'PEEP alta + driving pressure < 15', 'Prona se PaO₂/FiO₂ < 150 e FiO₂ > 0,6', 'BNM × 48h (cisatracúrio) se refratário'],
  },
  grave: {
    pao2_fio2: '< 100 mmHg com PEEP ≥ 5 cmH₂O',
    peep_minimo: '5 cmH₂O',
    mortalidade: '~45%',
    estrategia: ['VC 4 mL/kg PPI (até 6 mL/kg)', 'Platô ≤ 30 cmH₂O', 'Driving pressure alvo < 13–15 cmH₂O', 'PEEP alta (PEEP/FiO₂ tabela ARDSNet alta)', 'Prona 16h/dia (PROSEVA)', 'BNM precoce × 48h', 'ECMO-V veno-venosa se refratário (centro especializado)'],
  },
};

export const ARDSNET_PEEP_TABLE = {
  baixa: [
    { fio2: 0.30, peep: 5 },
    { fio2: 0.40, peep: 5 },
    { fio2: 0.40, peep: 8 },
    { fio2: 0.50, peep: 8 },
    { fio2: 0.50, peep: 10 },
    { fio2: 0.60, peep: 10 },
    { fio2: 0.70, peep: 10 },
    { fio2: 0.70, peep: 12 },
    { fio2: 0.70, peep: 14 },
    { fio2: 0.80, peep: 14 },
    { fio2: 0.90, peep: 14 },
    { fio2: 0.90, peep: 16 },
    { fio2: 0.90, peep: 18 },
    { fio2: 1.00, peep: 18 },
    { fio2: 1.00, peep: 20 },
    { fio2: 1.00, peep: 22 },
    { fio2: 1.00, peep: 24 },
  ],
  alta: [
    { fio2: 0.30, peep: 12 },
    { fio2: 0.30, peep: 14 },
    { fio2: 0.40, peep: 14 },
    { fio2: 0.40, peep: 16 },
    { fio2: 0.50, peep: 16 },
    { fio2: 0.50, peep: 18 },
    { fio2: 0.60, peep: 20 },
    { fio2: 0.70, peep: 20 },
    { fio2: 0.80, peep: 20 },
    { fio2: 0.80, peep: 22 },
    { fio2: 0.90, peep: 22 },
    { fio2: 1.00, peep: 22 },
    { fio2: 1.00, peep: 24 },
  ],
};

export const VENTILATION_STRATEGIES: VentilationStrategy[] = [
  {
    cenario: 'ARDS — Ventilação protetora (ARDSNet)',
    vc_alvo: '4–6 mL/kg de Peso Predito Ideal (PPI)',
    platô_limite: '≤ 30 cmH₂O',
    driving_pressure: '< 13–15 cmH₂O (Pplatô − PEEP)',
    peep_estrategia: 'Tabela ARDSNet (baixa ou alta conforme PaO₂/FiO₂)',
    fio2_alvo: 'Titular para SPO₂ 88–95%',
    spo2_alvo: '88–95%',
    modalidade: 'VCV ou PCV com garantia de VC',
    observacoes: [
      'PPI homem: 50 + 2,3 × (altura cm/2,54 − 60)',
      'PPI mulher: 45,5 + 2,3 × (altura cm/2,54 − 60)',
      'FR: 14–35/min para manter pH > 7,30 (hipercapnia permissiva aceitável se pH > 7,25)',
      'I:E: 1:2 a 1:3 habitual; ARDS grave: pode usar I:E 1:1–1:1,5',
      'PEEP trial: elevar PEEP 2 cmH₂O a cada 10 min avaliando complacência e PaO₂/FiO₂',
    ],
  },
  {
    cenario: 'Pós-operatório / Sem ARDS',
    vc_alvo: '6–8 mL/kg PPI',
    platô_limite: '≤ 30 cmH₂O',
    driving_pressure: '< 15 cmH₂O',
    peep_estrategia: 'PEEP 5–8 cmH₂O',
    fio2_alvo: 'SPO₂ ≥ 92–95%',
    spo2_alvo: '92–95%',
    modalidade: 'PSV (suporte pressão) se estável + desmame CPAP',
    observacoes: [
      'Tentativa diária de desmame (SAT + SBT)',
      'Critérios extubação: RASS ≥ -1, tosse eficaz, SBT ≥ 30 min tolerado, secreção manejável',
    ],
  },
  {
    cenario: 'DPOC exacerbado / Hipercapnia crônica',
    vc_alvo: '5–7 mL/kg PPI',
    platô_limite: '≤ 30 cmH₂O (auto-PEEP!)',
    driving_pressure: '< 15 cmH₂O',
    peep_estrategia: 'PEEP 5 cmH₂O + avaliar auto-PEEP (desconectar e auscutar expiração)',
    fio2_alvo: 'SPO₂ 88–92% (hipoxemia crônica — não hiperóxia)',
    spo2_alvo: '88–92%',
    modalidade: 'VNI 1ª linha; VM se falha VNI',
    observacoes: [
      'Auto-PEEP: ↑ FR agrava. Reduzir FR (12–14 ipm), ↑ tempo expiratório, I:E 1:3 ou maior',
      'Hipercapnia permissiva: alvo pH > 7,25 (hipercapnia crônica compensada)',
      'VNI: IPAP 10–20, EPAP 4–8, FR backup 10–14',
    ],
  },
];

// Calculadora de PPI (Peso Predito Ideal) para ventilação
export function calcPPI(alturaCm: number, sexo: 'M' | 'F'): number {
  const alturaInches = alturaCm / 2.54;
  if (sexo === 'M') return Math.round((50 + 2.3 * (alturaInches - 60)) * 10) / 10;
  return Math.round((45.5 + 2.3 * (alturaInches - 60)) * 10) / 10;
}

export function calcVCAlvo(alturaCm: number, sexo: 'M' | 'F', ml_kg: number = 6): {
  ppi: number;
  vc_ml: number;
  intervalo: string;
} {
  const ppi = calcPPI(alturaCm, sexo);
  return {
    ppi,
    vc_ml: Math.round(ppi * ml_kg),
    intervalo: `${Math.round(ppi * 4)}–${Math.round(ppi * 6)} mL (4–6 mL/kg PPI)`,
  };
}

// Driving Pressure
export function calcDrivingPressure(platoPressure: number, peep: number): {
  dp: number;
  seguro: boolean;
  alerta: string;
} {
  const dp = platoPressure - peep;
  return {
    dp,
    seguro: dp <= 15,
    alerta: dp > 15
      ? `⚠ Driving pressure ${dp} cmH₂O > 15 — reduzir PEEP ou VC para ↓ DP`
      : `Driving pressure ${dp} cmH₂O — seguro`,
  };
}

// ────────────────────────────────────────────────────────────
// CAM-ICU — Diagnóstico de Delirium
// ────────────────────────────────────────────────────────────

export const CAM_ICU = {
  descricao: 'Confusion Assessment Method for ICU — diagnóstico de delirium',
  criterios: [
    {
      n: 1,
      criterio: 'Início agudo ou flutuação do estado mental',
      avaliacao: 'Diferente do basal OU flutuação nas últimas 24h? (RASS, GCS)',
    },
    {
      n: 2,
      criterio: 'Desatenção',
      avaliacao: 'Diga as letras A-S-A-V-E-H-A-A-R-T. Paciente responde (pisca/aperta mão) apenas nas letras A. Erros ≥ 3 = POSITIVO',
    },
    {
      n: 3,
      criterio: 'Alteração de consciência',
      avaliacao: 'RASS ≠ 0 no momento da avaliação',
    },
    {
      n: 4,
      criterio: 'Pensamento desorganizado',
      avaliacao: 'Perguntas sim/não (4 perguntas) + comando simples. Erros ≥ 2 = POSITIVO',
    },
  ],
  diagnostico: 'Delirium presente: Critérios 1 + 2 + (3 OU 4)',
  tratamento: [
    'NÃO farmacológico PRIMEIRO: ciclo sono-vigília, orientação, mobilização precoce, retirar dispositivos desnecessários',
    'Haloperidol 0,5–2 mg IV/VO q8h (delirium hiperativo — evidência limitada mas uso amplo)',
    'Dexmedetomidina: reduz delirium vs. BDZ (preferir se possível)',
    'EVITAR BZD em delirium (piora — exceto abstinência alcoólica/BZD)',
    'Quetiapina 12,5–25 mg VO 12/12h: alternativa em delirium hiperativo crônico',
  ],
};

// ────────────────────────────────────────────────────────────
// AVALIAÇÃO INTEGRADA DE PACIENTE UTI
// ────────────────────────────────────────────────────────────

export interface ICUPatient {
  pesoKg: number;
  alturaCm: number;
  sexo: 'M' | 'F';
  idadeAnos: number;
  pasMMHg?: number;
  padMMHg?: number;
  pamMMHg?: number;
  frIpm?: number;
  spo2?: number;
  glasgow?: number;
  temperaturaC?: number;
  lactato?: number;
  pao2?: number;
  fio2?: number;
  vasopressores?: string[];
  intubado?: boolean;
}

export function assessICUPatient(patient: ICUPatient): {
  qsofa: QsofaResult;
  pao2fio2?: number;
  vcAlvo: ReturnType<typeof calcVCAlvo>;
  alertas: string[];
} {
  const alertas: string[] = [];

  const qsofa = calcQsofa(
    (patient.glasgow ?? 15) < 15,
    (patient.frIpm ?? 16) >= 22,
    (patient.pasMMHg ?? 120) <= 100,
  );

  if (qsofa.alerta) alertas.push('⚠ qSOFA ≥ 2 — rastrear sepse (SOFA completo + hemoculturas + antibióticos)');
  if ((patient.lactato ?? 0) > 2) alertas.push(`⚠ Lactato ${patient.lactato} mmol/L > 2 — hipoperfusão tecidual`);
  if ((patient.lactato ?? 0) > 4) alertas.push('🚨 Lactato > 4 mmol/L — choque — bundle SSC 1h imediato');
  if ((patient.pamMMHg ?? 80) < 65) alertas.push('🚨 PAM < 65 mmHg — iniciar vasopressor (norepinefrina)');
  if ((patient.spo2 ?? 98) < 90) alertas.push('🚨 SpO₂ < 90% — suporte O₂ urgente / avaliar IOT');
  if ((patient.temperaturaC ?? 37) >= 38.3) alertas.push('⚠ Febre — investigar foco infeccioso');
  if ((patient.temperaturaC ?? 37) < 36) alertas.push('⚠ Hipotermia — considerar sepse, exposição ambiental');

  const pao2fio2 = patient.pao2 && patient.fio2
    ? Math.round(patient.pao2 / patient.fio2)
    : undefined;

  if (pao2fio2 !== undefined) {
    if (pao2fio2 < 100) alertas.push(`🚨 PaO₂/FiO₂ ${pao2fio2} — ARDS grave: protocolo ventilação protetora + prona`);
    else if (pao2fio2 < 200) alertas.push(`⚠ PaO₂/FiO₂ ${pao2fio2} — ARDS moderado: ventilação protetora + PEEP alta`);
    else if (pao2fio2 < 300) alertas.push(`PaO₂/FiO₂ ${pao2fio2} — ARDS leve`);
  }

  return {
    qsofa,
    pao2fio2,
    vcAlvo: calcVCAlvo(patient.alturaCm, patient.sexo, 6),
    alertas,
  };
}
