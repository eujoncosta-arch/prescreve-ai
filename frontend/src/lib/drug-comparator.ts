// ============================================================
// PRESCREVE-AI — Drug Comparison Engine
// Comparador farmacológico: Molécula × Molécula × Classe
// ============================================================
//
// IMPORTANTE: Este módulo é suporte à decisão clínica.
// A recomendação final é do médico. Dados baseados em
// diretrizes vigentes (SBC, ADA, ESC, KDIGO, GINA — 2023-2025).
// ============================================================

export type NivelEvidComp = 'A' | 'B' | 'C';
export type GrauComp = 'I' | 'IIa' | 'IIb' | 'III';
export type CustoRelativo = 1 | 2 | 3 | 4 | 5; // 1=muito baixo … 5=muito alto
export type AdesaoScore = 1 | 2 | 3 | 4 | 5;  // 1=baixa … 5=muito alta

export type CategoriaComparacao =
  | 'anti_hipertensivos'
  | 'diabetes'
  | 'insuficiencia_cardiaca'
  | 'dislipidemias'
  | 'pneumologia'
  | 'geral';

// ─── Ajuste posológico por função ────────────────────────────

export interface AjusteRenal {
  tfg_limite?: number;    // mL/min — limite inferior para uso
  tfg_reducao?: string;   // descrição de ajuste quando TFG reduzida
  tfg_contraindicado?: number; // TFG abaixo deste valor = contraindicado
  dialise?: string;
}

export interface AjusteHepatico {
  child_a?: string;
  child_b?: string;
  child_c?: string;
  contraindicado_em?: string;
}

// ─── Dado de eficácia ────────────────────────────────────────

export interface DadoEficacia {
  desfecho: string;
  reducao: string;       // ex: "−38% mortalidade CV"
  estudo: string;
  n_pacientes?: number;
  nnt?: number;
  hr?: string;
  rrr?: string;          // reducao de risco relativo
}

// ─── Interação relevante ────────────────────────────────────

export interface InteracaoRelevante {
  farmaco: string;
  mecanismo: string;
  severidade: 'leve' | 'moderada' | 'grave' | 'contraindicada';
}

// ─── Marca no sistema ────────────────────────────────────────

export interface MarcaComp {
  nome: string;
  laboratorio: string;
  concentracoes: string[];
  destaque?: boolean;    // é a marca "exemplo" do prompt
}

// ─── Farmacocinética e Farmacodinâmica ───────────────────────

export interface FarmacocineticaPerfil {
  // Absorção
  biodisponibilidade: string;         // ex: "33%" ou "26% (pró-fármaco)"
  tmax_h: string;                     // tempo para pico plasmático
  alimento_efeito?: string;           // "sem efeito" | "reduz 15% Cmax" etc.

  // Distribuição
  volume_distribuicao?: string;       // L ou L/kg
  ligacao_proteica: string;           // "99%" etc.

  // Metabolismo
  via_metabolismo: string;            // "CYP2C9/3A4" | "hidrólise éster" | "mínimo hepático" etc.
  profarmaco: boolean;                // é pró-fármaco que precisa de conversão?
  metabólito_ativo?: string;          // nome do metabólito ativo se houver

  // Eliminação
  meia_vida_h: number;               // t½ em horas — CHAVE para comparação
  meia_vida_descricao?: string;      // contexto adicional (ex: "metabólito ativo 6–9h")
  excrecao_renal_pct: number;        // % eliminado pela urina
  excrecao_biliar_pct: number;       // % eliminado pelas fezes/bile
  dialise_remove: boolean;           // hemodiálise remove a molécula?

  // Farmacodinâmica
  mecanismo_molecular: string;       // detalhado (receptor, enzima, transportador)
  seletividade?: string;             // ex: "AT1 > AT2 (10.000:1)" para BRAs
  onset_acao_h: number;              // horas até início do efeito clínico
  pico_efeito_h: number;             // horas para efeito máximo
  duracao_efeito_h: number;          // horas de duração do efeito
  efeito_rebote?: string;            // ocorre rebote ao suspender?

  // Range de ação específico
  reducao_pas_mmhg?: string;         // redução PA sistólica esperada
  reducao_pad_mmhg?: string;         // redução PA diastólica esperada
  reducao_hba1c_pct?: string;        // para antidiabéticos
  reducao_ldl_pct?: string;          // para estatinas
  reducao_pes_kg?: string;           // para GLP-1/SGLT-2
}

// ─── Perfil completo da molécula para comparação ─────────────

export interface MoleculaComparavel {
  id: string;
  molecula: string;              // nome DCI
  nome_generico: string;
  classe: string;
  subclasse?: string;
  categoria: CategoriaComparacao;
  cids_principais: string[];
  indicacoes: string[];
  contraindicacoes: string[];
  efeitos_adversos_principais: string[];

  // Posologia
  dose_inicial: string;
  dose_alvo: string;
  frequencia_doses_dia: number;  // para score de adesão
  via: string;
  formas: string[];

  // Ajustes
  ajuste_renal: AjusteRenal;
  ajuste_hepatico: AjusteHepatico;
  seguro_gestante: boolean | 'evitar' | 'contraindicado';
  seguro_lactante: boolean | 'evitar' | 'contraindicado';
  uso_pediatrico?: string;
  uso_idoso?: string;

  // Evidência
  nivel_evidencia: NivelEvidComp;
  grau_recomendacao: GrauComp;
  diretriz_principal: string;
  eficacia: DadoEficacia[];

  // Interações
  interacoes: InteracaoRelevante[];

  // Custo e adesão (score relativo)
  custo_relativo: CustoRelativo;
  custo_descricao: string;
  adesao_score: AdesaoScore;
  adesao_descricao: string;

  // Farmacocinética e Farmacodinâmica
  farmacocinetica: FarmacocineticaPerfil;

  // Marcas disponíveis no sistema
  marcas: MarcaComp[];

  // Tags para busca
  tags: string[];
}

// ═══════════════════════════════════════════════════════════
// BANCO DE MOLÉCULAS COMPARÁVEIS
// ═══════════════════════════════════════════════════════════

export const MOLECULES_DB: MoleculaComparavel[] = [

  // ─────────────────────────────────────────────────────────
  // ANTI-HIPERTENSIVOS
  // ─────────────────────────────────────────────────────────

  {
    id: 'losartana',
    molecula: 'Losartana',
    nome_generico: 'Losartana Potássica',
    classe: 'BRA',
    subclasse: 'Bloqueador do Receptor de Angiotensina II (AT1)',
    categoria: 'anti_hipertensivos',
    cids_principais: ['I10', 'E11.65', 'I50'],
    indicacoes: ['HAS (1ª linha)', 'HAS + DM2 com proteinúria', 'DRC diabética', 'IC-FEr (alternativa ao IECA)', 'HVE por HAS'],
    contraindicacoes: ['Gravidez (1º tri cautela, 2º e 3º TRI contraindicado)', 'Hiperpotassemia > 5,5 mEq/L', 'Estenose bilateral de artérias renais', 'Uso concomitante de Aliskiren em DM ou DRC'],
    efeitos_adversos_principais: ['Hipercalemia', 'Hipotensão na 1ª dose', 'Elevação de creatinina (≤30% aceitável)', 'Tontura', 'Ausência de tosse (vantagem vs IECA)'],
    dose_inicial: '25–50 mg 1×/dia',
    dose_alvo: '50–100 mg 1×/dia',
    frequencia_doses_dia: 1,
    via: 'Oral',
    formas: ['Comprimido'],
    ajuste_renal: { tfg_reducao: 'Sem ajuste necessário até TFG 15 mL/min', tfg_contraindicado: 15, dialise: 'Não dialisável — manter dose habitual' },
    ajuste_hepatico: { child_a: 'Iniciar com 25 mg', child_b: 'Iniciar com 25 mg, monitorar', child_c: 'Usar com extrema cautela — dados limitados' },
    seguro_gestante: 'contraindicado',
    seguro_lactante: 'contraindicado',
    uso_pediatrico: 'Uso em > 6 anos com HAS (dose 0,7 mg/kg/dia)',
    uso_idoso: 'Bem tolerado — sem ajuste; monitorar PA e função renal',
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    diretriz_principal: 'SBC DBHA-7 2020 · ESC/ESH 2018',
    eficacia: [
      { desfecho: 'Proteção renal em DM2 + proteinúria', reducao: '−25% duplicação creatinina', estudo: 'RENAAL', n_pacientes: 1513, nnt: 15, hr: '0.75', rrr: '25%' },
      { desfecho: 'Mortalidade CV em HAS + HVE', reducao: '−13% eventos CV vs atenolol', estudo: 'LIFE Trial', n_pacientes: 9193, nnt: 55 },
      { desfecho: 'Não inferior ao captopril em IC', reducao: 'Não inferior (NI study)', estudo: 'ELITE II', n_pacientes: 3152 },
    ],
    interacoes: [
      { farmaco: 'IECA', mecanismo: 'Hipercalemia e hipotensão aditivas', severidade: 'contraindicada' },
      { farmaco: 'Aliskiren (em DM/DRC)', mecanismo: 'Duplo bloqueio SRAA — risco renal/hipercalemia', severidade: 'contraindicada' },
      { farmaco: 'AINEs', mecanismo: 'Redução do efeito anti-hipertensivo + risco nefrotóxico', severidade: 'moderada' },
      { farmaco: 'Lítio', mecanismo: 'Aumento níveis de lítio', severidade: 'moderada' },
      { farmaco: 'Suplementos de K+', mecanismo: 'Risco de hipercalemia', severidade: 'moderada' },
    ],
    custo_relativo: 1,
    custo_descricao: 'Genérico amplamente disponível — custo muito baixo (R$5–20/mês)',
    adesao_score: 5,
    adesao_descricao: '1×/dia, oral, sem tosse — excelente perfil de adesão',
    farmacocinetica: {
      biodisponibilidade: '33% (pró-fármaco; metabólito E-3174 responsável pelo efeito)',
      tmax_h: '1h (Losartana) · 3–4h (E-3174)',
      alimento_efeito: 'Sem efeito clinicamente relevante',
      ligacao_proteica: '99,8% (losartana e metabólito)',
      via_metabolismo: 'CYP2C9 (principal) + CYP3A4 → metabólito ativo E-3174',
      profarmaco: true,
      metabólito_ativo: 'EXP-3174 (E-3174) — 10–40× mais potente que losartana',
      meia_vida_h: 2,
      meia_vida_descricao: 'Losartana t½ ~2h · Metabólito E-3174 t½ 6–9h (efeito prolongado)',
      excrecao_renal_pct: 35,
      excrecao_biliar_pct: 60,
      dialise_remove: false,
      mecanismo_molecular: 'Antagonista competitivo e seletivo do receptor AT1 da angiotensina II — bloqueia vasoconstrição, aldosterona e retenção de sódio mediadas por angiotensina II',
      seletividade: 'AT1 seletivo (10.000:1 vs AT2) — preserva receptor AT2 (vasodilatador/antiproliferativo)',
      onset_acao_h: 1,
      pico_efeito_h: 6,
      duracao_efeito_h: 24,
      efeito_rebote: 'Ausente — sem rebote pressórico ao suspender gradualmente',
      reducao_pas_mmhg: '−8 a −12 mmHg (monoterapia)',
      reducao_pad_mmhg: '−4 a −7 mmHg',
    },
    marcas: [
      { nome: 'Zart', laboratorio: 'Eurofarma', concentracoes: ['50 mg', '100 mg'], destaque: true },
      { nome: 'Cozaar', laboratorio: 'MSD', concentracoes: ['50 mg', '100 mg'] },
      { nome: 'Losartana EMS', laboratorio: 'EMS', concentracoes: ['25 mg', '50 mg', '100 mg'] },
      { nome: 'Losartana Torrent', laboratorio: 'Torrent', concentracoes: ['50 mg', '100 mg'] },
    ],
    tags: ['losartana', 'zart', 'bra', 'sartana', 'angiotensina', 'has', 'hipertensao', 'renal', 'dm2'],
  },

  {
    id: 'enalapril',
    molecula: 'Enalapril',
    nome_generico: 'Maleato de Enalapril',
    classe: 'IECA',
    subclasse: 'Inibidor da Enzima Conversora de Angiotensina',
    categoria: 'anti_hipertensivos',
    cids_principais: ['I10', 'I50', 'I21'],
    indicacoes: ['HAS (1ª linha)', 'IC-FEr (Classe I-A)', 'Pós-IAM com disfunção ventricular', 'DRC com proteinúria', 'Nefropatia diabética (alternativa)'],
    contraindicacoes: ['Gravidez (todos trimestres)', 'Angioedema prévio por IECA', 'Hiperpotassemia > 5,5 mEq/L', 'Uso com Aliskiren em DM ou DRC', 'Uso com sacubitril/valsartana (36h de washout)'],
    efeitos_adversos_principais: ['Tosse seca (5–20% — principal causa de abandono)', 'Hipercalemia', 'Angioedema (raro 0,1–0,5%)', 'Hipotensão na 1ª dose', 'Elevação de creatinina'],
    dose_inicial: '2,5–5 mg 2×/dia',
    dose_alvo: '10–20 mg 2×/dia',
    frequencia_doses_dia: 2,
    via: 'Oral',
    formas: ['Comprimido'],
    ajuste_renal: { tfg_reducao: 'TFG 30–60: reduzir dose inicial; TFG 10–30: iniciar 2,5 mg 1×/dia', tfg_contraindicado: 10, dialise: 'Parcialmente dialisável — dosar após sessão' },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela — reduzir dose', child_c: 'Evitar' },
    seguro_gestante: 'contraindicado',
    seguro_lactante: 'evitar',
    uso_idoso: 'Cautela com hipotensão 1ª dose; iniciar com 2,5 mg',
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    diretriz_principal: 'SBC DBHA-7 2020 · ESC-HF 2021',
    eficacia: [
      { desfecho: 'Mortalidade em IC-FEr vs placebo', reducao: '−16% mortalidade total', estudo: 'CONSENSUS', n_pacientes: 253, nnt: 6, rrr: '40% (IC grave)' },
      { desfecho: 'Sobrevida em IC (NYHA II–III)', reducao: '−16% morte + hospitalização', estudo: 'SOLVD', n_pacientes: 2569, nnt: 22 },
      { desfecho: 'Pós-IAM com disfunção VE', reducao: '−20% mortalidade', estudo: 'SAVE (captopril proxy)', n_pacientes: 2231 },
    ],
    interacoes: [
      { farmaco: 'BRA / Aliskiren (em DM/DRC)', mecanismo: 'Duplo bloqueio SRAA — contraindicado', severidade: 'contraindicada' },
      { farmaco: 'Sacubitril/Valsartana', mecanismo: 'Angioedema — lavar 36h antes de iniciar', severidade: 'contraindicada' },
      { farmaco: 'AINEs', mecanismo: 'Redução anti-hipertensiva + nefrotóxico', severidade: 'moderada' },
      { farmaco: 'Lítio', mecanismo: 'Aumento de litemia', severidade: 'moderada' },
      { farmaco: 'Diuréticos poupadores K+', mecanismo: 'Hipercalemia aditiva', severidade: 'moderada' },
    ],
    custo_relativo: 1,
    custo_descricao: 'Genérico amplamente disponível — custo muito baixo (R$5–15/mês)',
    adesao_score: 3,
    adesao_descricao: '2×/dia + tosse em 5–20% dos pacientes reduzem adesão a longo prazo',
    farmacocinetica: {
      biodisponibilidade: '60% (pró-fármaco → enalaprilato por hidrólise hepática)',
      tmax_h: '1h (enalapril) · 3–4h (enalaprilato ativo)',
      alimento_efeito: 'Sem efeito relevante na absorção',
      ligacao_proteica: '50–60% (enalaprilato)',
      via_metabolismo: 'Hidrólise de éster hepático → enalaprilato (ativo); mínima participação de CYP',
      profarmaco: true,
      metabólito_ativo: 'Enalaprilato — inibidor competitivo da ECA',
      meia_vida_h: 11,
      meia_vida_descricao: 'Enalaprilato t½ ~11h (fase terminal — justifica 2×/dia para cobertura adequada)',
      excrecao_renal_pct: 88,
      excrecao_biliar_pct: 12,
      dialise_remove: true,
      mecanismo_molecular: 'Inibição competitiva da enzima conversora de angiotensina (ECA/kininase II) → reduz angiotensina II + aumenta bradicinina (responsável pela tosse)',
      seletividade: 'Sem seletividade tecidual específica — ação sistêmica e tecidual (ECA pulmonar, renal, cardíaca)',
      onset_acao_h: 1,
      pico_efeito_h: 4,
      duracao_efeito_h: 24,
      efeito_rebote: 'Ausente',
      reducao_pas_mmhg: '−8 a −13 mmHg (monoterapia)',
      reducao_pad_mmhg: '−4 a −8 mmHg',
    },
    marcas: [
      { nome: 'Renitec', laboratorio: 'Organon/MSD', concentracoes: ['5 mg', '10 mg', '20 mg'] },
      { nome: 'Enalapril EMS', laboratorio: 'EMS', concentracoes: ['5 mg', '10 mg', '20 mg'] },
      { nome: 'Vasopril', laboratorio: 'Aché', concentracoes: ['5 mg', '10 mg', '20 mg'] },
    ],
    tags: ['enalapril', 'renitec', 'ieca', 'eca', 'captopril', 'has', 'ic', 'iam', 'tosse'],
  },

  // ── OLMESARTANA (Holmes — Eurofarma) ─────────────────────

  {
    id: 'olmesartana',
    molecula: 'Olmesartana',
    nome_generico: 'Olmesartana Medoxomila',
    classe: 'BRA',
    subclasse: 'Bloqueador do Receptor de Angiotensina II (AT1) — pró-fármaco',
    categoria: 'anti_hipertensivos',
    cids_principais: ['I10'],
    indicacoes: ['HAS (monoterapia ou combinação)', 'HAS moderada a grave', 'HAS com proteinúria / nefropatia diabética'],
    contraindicacoes: ['Gravidez (2º e 3º trimestre — categoria D)', 'Colestase biliar', 'Hiperpotassemia > 5,5 mEq/L', 'Estenose bilateral de artérias renais', 'Uso com Aliskiren em DM ou DRC'],
    efeitos_adversos_principais: ['Tonturas', 'Hipotensão na 1ª dose', 'Hipercalemia', 'Enteropatia espru-like (raro — diarreia crônica com atrofia de vilosidades; suspender se ocorrer)', 'Elevação de creatinina'],
    dose_inicial: '10–20 mg 1×/dia',
    dose_alvo: '20–40 mg 1×/dia',
    frequencia_doses_dia: 1,
    via: 'Oral',
    formas: ['Comprimido revestido'],
    ajuste_renal: { tfg_reducao: 'TFG 20–60: sem ajuste de dose; monitorar K+ e creatinina', tfg_contraindicado: 20, dialise: 'Não dialisável — dados limitados em diálise' },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela — dose máxima 20 mg/dia', child_c: 'Contraindicado (colestase)' },
    seguro_gestante: 'contraindicado',
    seguro_lactante: 'contraindicado',
    uso_idoso: 'Sem ajuste de dose necessário; monitorar PA e função renal nas primeiras semanas',
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    diretriz_principal: 'SBC DBHA-7 2020 · ESC/ESH 2018 — BRA 1ª linha',
    eficacia: [
      { desfecho: 'Redução de PA vs placebo (HAS leve-moderada)', reducao: '−11 a −17 mmHg PAS', estudo: 'Pool de RCTs Olmesartana', n_pacientes: 4000 },
      { desfecho: 'Não-inferioridade vs outros BRA (meta-análise)', reducao: 'Maior redução de PA vs losartana na dose equipotente', estudo: 'Sato 2019 Network Meta-analysis', n_pacientes: 56000 },
      { desfecho: 'Progressão de albuminúria em DM2 + microalbuminúria', reducao: '−23% progressão para macroalbuminúria vs placebo', estudo: 'ROADMAP', n_pacientes: 4449 },
    ],
    interacoes: [
      { farmaco: 'IECA / Aliskiren (em DM/DRC)', mecanismo: 'Duplo bloqueio SRAA — contraindicado', severidade: 'contraindicada' },
      { farmaco: 'AINEs', mecanismo: 'Redução anti-hipertensiva + risco nefrotóxico', severidade: 'moderada' },
      { farmaco: 'Lítio', mecanismo: 'Aumento de litemia por redução de clearance renal', severidade: 'moderada' },
      { farmaco: 'Suplementos de K+ / Poupadores de K+', mecanismo: 'Hipercalemia aditiva', severidade: 'moderada' },
      { farmaco: 'Colesevelam', mecanismo: 'Reduz absorção de olmesartana em ~40% — separar 4h', severidade: 'moderada' },
    ],
    custo_relativo: 2,
    custo_descricao: 'Custo baixo — genérico disponível (R$20–45/mês); combinações fixas com BCC ou tiazídico têm custo maior',
    adesao_score: 5,
    adesao_descricao: '1×/dia, oral, sem tosse, meia-vida longa — excelente perfil de adesão; sem restrição alimentar',
    farmacocinetica: {
      biodisponibilidade: '26% (pró-fármaco: olmesartana medoxomila → olmesartana por hidrólise intestinal)',
      tmax_h: '1–2h',
      alimento_efeito: 'Sem efeito clinicamente relevante na biodisponibilidade',
      ligacao_proteica: '99% (olmesartana — ligação altíssima a albumina)',
      via_metabolismo: 'Hidrólise de éster na parede intestinal → olmesartana (ativo) — NÃO é metabolizado por CYP450 (ausência de interações CYP)',
      profarmaco: true,
      metabólito_ativo: 'Olmesartana (forma ativa liberada por hidrólise do medoxomila)',
      meia_vida_h: 13,
      meia_vida_descricao: 't½ ~13h — maior entre os BRAs mais utilizados (losartana metabólito ~6–9h; valsartana ~6h)',
      excrecao_renal_pct: 35,
      excrecao_biliar_pct: 50,
      dialise_remove: false,
      mecanismo_molecular: 'Antagonista AT1 insurmontável (ligação covalente estável) — bloqueia receptor mesmo com altos níveis de angiotensina II; preserva receptor AT2',
      seletividade: 'AT1 seletivo e insurmontável (ligação não-competitiva em alta concentração) — diferencial vs losartana (competitivo)',
      onset_acao_h: 1,
      pico_efeito_h: 2,
      duracao_efeito_h: 24,
      efeito_rebote: 'Ausente',
      reducao_pas_mmhg: '−11 a −17 mmHg (monoterapia) — maior redução vs dose equipotente de losartana',
      reducao_pad_mmhg: '−6 a −10 mmHg',
    },
    marcas: [
      { nome: 'Holmes', laboratorio: 'Eurofarma', concentracoes: ['20 mg', '40 mg'], destaque: true },
      { nome: 'Benicar', laboratorio: 'Daiichi Sankyo', concentracoes: ['20 mg', '40 mg'] },
      { nome: 'Olmesartana EMS', laboratorio: 'EMS', concentracoes: ['20 mg', '40 mg'] },
    ],
    tags: ['olmesartana', 'holmes', 'benicar', 'bra', 'sartana', 'angiotensina', 'has', 'hipertensao', 'at1', 'insurmontavel'],
  },

  {
    id: 'anlodipino',
    molecula: 'Anlodipino',
    nome_generico: 'Besilato de Anlodipino',
    classe: 'BCC',
    subclasse: 'Bloqueador de Canal de Cálcio di-hidropiridínico',
    categoria: 'anti_hipertensivos',
    cids_principais: ['I10', 'I20'],
    indicacoes: ['HAS (1ª linha)', 'Angina estável', 'Angina vasoespástica (Prinzmetal)', 'HAS em negros africanos (preferência)', 'HAS + angina'],
    contraindicacoes: ['Choque cardiogênico', 'Angina instável grave não tratada', 'Hipotensão significativa'],
    efeitos_adversos_principais: ['Edema maleolar (7–10% — dose-dependente)', 'Rubor facial', 'Cefaleia', 'Palpitações', 'Náusea'],
    dose_inicial: '2,5–5 mg 1×/dia',
    dose_alvo: '5–10 mg 1×/dia',
    frequencia_doses_dia: 1,
    via: 'Oral',
    formas: ['Comprimido'],
    ajuste_renal: { tfg_reducao: 'Sem ajuste necessário', dialise: 'Não dialisável — manter dose' },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Iniciar com 2,5 mg', child_c: 'Contraindicado ou dose mínima com monitoramento' },
    seguro_gestante: 'evitar',
    seguro_lactante: 'evitar',
    uso_idoso: 'Preferível a outros BCC — menos hipotensão postural; monitorar edema',
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    diretriz_principal: 'SBC DBHA-7 2020 · ESC/ESH 2018',
    eficacia: [
      { desfecho: 'Prevenção AVC em HAS', reducao: '−35% AVC vs atenolol', estudo: 'ASCOT-BPLA', n_pacientes: 19257, nnt: 100, rrr: '35%' },
      { desfecho: 'Redução de IAM vs diurético', reducao: 'Não inferior + redução AVC', estudo: 'ALLHAT', n_pacientes: 33357 },
      { desfecho: 'Progressão aterosclerose', reducao: 'Redução espessura íntima-média', estudo: 'PREVENT', n_pacientes: 825 },
    ],
    interacoes: [
      { farmaco: 'Sinvastatina > 20 mg', mecanismo: 'Inibição CYP3A4 — risco de miopatia', severidade: 'moderada' },
      { farmaco: 'Ciclosporina', mecanismo: 'Aumento nível ciclosporina', severidade: 'moderada' },
      { farmaco: 'Betabloqueadores (em angina)', mecanismo: 'Bradicardia e BAV (BCC não-DHP)', severidade: 'leve' },
    ],
    custo_relativo: 1,
    custo_descricao: 'Genérico amplamente disponível — custo muito baixo (R$5–20/mês)',
    adesao_score: 5,
    adesao_descricao: '1×/dia, oral, meia-vida 35–50h — excelente adesão; edema pode causar abandono',
    farmacocinetica: {
      biodisponibilidade: '64–90% (oral; absorção lenta e gradual)',
      tmax_h: '6–12h',
      alimento_efeito: 'Sem efeito relevante na biodisponibilidade',
      ligacao_proteica: '93–98% (albumina)',
      via_metabolismo: 'CYP3A4 (hepático) → metabólitos inativos; sem pró-fármaco',
      profarmaco: false,
      meia_vida_h: 42,
      meia_vida_descricao: 't½ ~35–50h (média 42h) — a mais longa entre os BCC comuns; justifica 1×/dia e baixo rebote pressórico',
      excrecao_renal_pct: 60,
      excrecao_biliar_pct: 35,
      dialise_remove: false,
      mecanismo_molecular: 'Bloqueio de canais de cálcio tipo L voltagem-dependentes na musculatura lisa vascular (vasosseletivo) — vasodilatação periférica e coronariana sem efeito inotrópico negativo significativo',
      seletividade: 'Di-hidropiridínico (DHP) — vascular seletivo; mínimo efeito sobre miocárdio e nó AV (diferença vs verapamil/diltiazem)',
      onset_acao_h: 2,
      pico_efeito_h: 8,
      duracao_efeito_h: 24,
      efeito_rebote: 'Mínimo — meia-vida longa protege contra rebote pressórico; suspensão gradual recomendada em angina',
      reducao_pas_mmhg: '−8 a −15 mmHg (monoterapia)',
      reducao_pad_mmhg: '−4 a −8 mmHg',
    },
    marcas: [
      { nome: 'Norvasc', laboratorio: 'Pfizer', concentracoes: ['5 mg', '10 mg'], destaque: true },
      { nome: 'Anlodipino EMS', laboratorio: 'EMS', concentracoes: ['5 mg', '10 mg'] },
      { nome: 'Anlodipino Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['5 mg', '10 mg'] },
    ],
    tags: ['anlodipino', 'norvasc', 'bcc', 'calcio', 'calcico', 'has', 'angina'],
  },

  {
    id: 'hidroclorotiazida',
    molecula: 'Hidroclorotiazida',
    nome_generico: 'Hidroclorotiazida',
    classe: 'Diurético Tiazídico',
    categoria: 'anti_hipertensivos',
    cids_principais: ['I10'],
    indicacoes: ['HAS (combinação de 1ª escolha)', 'HAS em negros africanos (eficaz como monoterapia)', 'Edema leve a moderado'],
    contraindicacoes: ['Hipopotassemia < 3,5 mEq/L não corrigida', 'Hipercalcemia', 'Gota ativa', 'Hiponatremia grave', 'TFG < 30 mL/min (sem efeito diurético)'],
    efeitos_adversos_principais: ['Hipopotassemia', 'Hiperuricemia (risco gota)', 'Hiperglicemia (cautela em DM)', 'Hipercalcemia', 'Dislipidemia (minor)', 'Fotossensibilidade'],
    dose_inicial: '12,5 mg 1×/dia',
    dose_alvo: '12,5–25 mg 1×/dia',
    frequencia_doses_dia: 1,
    via: 'Oral',
    formas: ['Comprimido'],
    ajuste_renal: { tfg_contraindicado: 30, tfg_reducao: 'TFG < 30: sem efeito diurético — substituir por furosemida' },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela — risco encefalopatia por hiponatremia', child_c: 'Contraindicado' },
    seguro_gestante: 'evitar',
    seguro_lactante: 'evitar',
    uso_idoso: 'Cautela — hiponatremia e quedas; preferir dose 12,5 mg',
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    diretriz_principal: 'SBC DBHA-7 2020 · JNC-8',
    eficacia: [
      { desfecho: 'Redução de AVC em HAS', reducao: '−38% AVC vs placebo', estudo: 'SHEP', n_pacientes: 4736, nnt: 34, rrr: '38%' },
      { desfecho: 'Igual eficácia vs IECA em desfechos CV maiores', reducao: 'Não inferior', estudo: 'ALLHAT', n_pacientes: 33357 },
    ],
    interacoes: [
      { farmaco: 'Lítio', mecanismo: 'Aumento de litemia — risco de toxicidade', severidade: 'grave' },
      { farmaco: 'AINEs', mecanismo: 'Redução do efeito diurético e anti-hipertensivo', severidade: 'moderada' },
      { farmaco: 'Corticoides', mecanismo: 'Hipopotassemia aditiva', severidade: 'moderada' },
      { farmaco: 'Hipoglicemiantes', mecanismo: 'Hiperglicemia — ajuste em DM', severidade: 'leve' },
    ],
    custo_relativo: 1,
    custo_descricao: 'Custo muito baixo — disponível no SUS (R$2–10/mês)',
    adesao_score: 4,
    adesao_descricao: '1×/dia, mas poliúria nas primeiras semanas pode reduzir adesão',
    farmacocinetica: {
      biodisponibilidade: '65–75% (oral)',
      tmax_h: '1–2,5h',
      alimento_efeito: 'Sem efeito relevante',
      ligacao_proteica: '40–68% (albumina)',
      via_metabolismo: 'Não metabolizada — excretada inalterada pela urina',
      profarmaco: false,
      meia_vida_h: 10,
      meia_vida_descricao: 't½ ~5,6–14,8h (média ~10h); excreção renal dependente de TFG — contra-indicada se TFG < 30 (sem efeito diurético)',
      excrecao_renal_pct: 95,
      excrecao_biliar_pct: 5,
      dialise_remove: true,
      mecanismo_molecular: 'Inibição do cotransportador Na⁺-Cl⁻ (NCC) no túbulo contorcido distal → natriurese, diurese e redução de volemia; redução secundária de RVP a longo prazo',
      seletividade: 'Tiazídico — ação no túbulo distal; sem ação no alça de Henle (diferente de furosemida)',
      onset_acao_h: 2,
      pico_efeito_h: 4,
      duracao_efeito_h: 12,
      efeito_rebote: 'Retenção de sódio pós-suspensão (leve)',
      reducao_pas_mmhg: '−8 a −12 mmHg (25 mg)',
      reducao_pad_mmhg: '−3 a −6 mmHg',
    },
    marcas: [
      { nome: 'HCTZ EMS', laboratorio: 'EMS', concentracoes: ['12,5 mg', '25 mg'] },
      { nome: 'Clorana', laboratorio: 'Sanofi', concentracoes: ['25 mg'], destaque: true },
    ],
    tags: ['hctz', 'hidroclorotiazida', 'tiazidico', 'diuretico', 'has', 'clorana'],
  },

  {
    id: 'espironolactona',
    molecula: 'Espironolactona',
    nome_generico: 'Espironolactona',
    classe: 'Diurético Poupador de Potássio / ARM',
    subclasse: 'Antagonista de Receptor Mineralocorticoide (ARM)',
    categoria: 'anti_hipertensivos',
    cids_principais: ['I10', 'I50'],
    indicacoes: ['HAS resistente (4º agente)', 'IC-FEr (NYHA II–IV, FE ≤ 35%)', 'Hiperaldosteronismo primário', 'Ascite por cirrose', 'Edema refratário'],
    contraindicacoes: ['Hiperpotassemia > 5,0 mEq/L', 'TFG < 30 mL/min', 'Doença de Addison', 'Uso com IECA + BRA simultaneamente'],
    efeitos_adversos_principais: ['Hipercalemia (principal risco)', 'Ginecomastia (5–10% homens — dose-dependente)', 'Irregularidade menstrual', 'Disfunção erétil', 'Náusea'],
    dose_inicial: '25 mg 1×/dia',
    dose_alvo: '25–50 mg 1×/dia (HAS); 25–50 mg/dia (IC)',
    frequencia_doses_dia: 1,
    via: 'Oral',
    formas: ['Comprimido'],
    ajuste_renal: { tfg_contraindicado: 30, tfg_reducao: 'TFG 30–60: reduzir para 25 mg em dias alternados; monitorar K+' },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Usar com cautela', child_c: 'Contraindicado (risco hipernatremia)' },
    seguro_gestante: 'evitar',
    seguro_lactante: 'evitar',
    uso_idoso: 'Alto risco de hipercalemia — monitorar K+ e creatinina nas primeiras 2 semanas',
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    diretriz_principal: 'ESC-HF 2021 — Quarteto IC (braço ARM)',
    eficacia: [
      { desfecho: 'Mortalidade IC-FEr grave', reducao: '−30% mortalidade total', estudo: 'RALES', n_pacientes: 1663, nnt: 9, rrr: '30%' },
      { desfecho: 'Mortalidade pós-IAM com IC', reducao: '−15% mortalidade total', estudo: 'EPHESUS (eplerenona)', n_pacientes: 6632, nnt: 50 },
      { desfecho: 'HAS resistente (4º agente)', reducao: '−20 mmHg PA sistólica vs placebo', estudo: 'PATHWAY-2', n_pacientes: 335, nnt: 4 },
    ],
    interacoes: [
      { farmaco: 'IECA + BRA juntos', mecanismo: 'Hipercalemia grave — triplo bloqueio SRAA', severidade: 'contraindicada' },
      { farmaco: 'AINEs', mecanismo: 'Reduz efeito diurético + hipercalemia aditiva', severidade: 'moderada' },
      { farmaco: 'Digoxina', mecanismo: 'Espironolactona reduz clearance da digoxina', severidade: 'moderada' },
    ],
    custo_relativo: 1,
    custo_descricao: 'Custo baixo — genérico disponível (R$15–30/mês)',
    adesao_score: 3,
    adesao_descricao: '1×/dia mas ginecomastia e irregularidade menstrual podem causar abandono',
    farmacocinetica: {
      biodisponibilidade: '~90% (oral; com alimento melhora)',
      tmax_h: '2–4h (espironolactona) · 2–3h (canrenona)',
      alimento_efeito: 'Alimento aumenta absorção em ~100% — tomar com refeição',
      ligacao_proteica: '91% (espironolactona) · 99% (canrenona)',
      via_metabolismo: 'Hepático extenso → metabólito ativo canrenona + canrenoato; CYP3A4 envolvido',
      profarmaco: true,
      metabólito_ativo: 'Canrenona — ARM ativo com ação mineralocorticoide e estrogênica (responsável por ginecomastia)',
      meia_vida_h: 1.4,
      meia_vida_descricao: 'Espironolactona t½ ~1,4h; canrenona t½ ~16,5h — efeito prolongado pela canrenona apesar da meia-vida curta da molécula-mãe',
      excrecao_renal_pct: 50,
      excrecao_biliar_pct: 35,
      dialise_remove: false,
      mecanismo_molecular: 'Antagonismo competitivo do receptor mineralocorticoide (RM) → reduz reabsorção de Na⁺ e excreção de K⁺ no ducto coletor; ação antiandrogênica (causa ginecomastia/irregularidade menstrual)',
      seletividade: 'Não seletivo — bloqueia RM + receptores androgênicos e progesterônicos (efeitos sexuais adversos); eplerenona é mais seletiva',
      onset_acao_h: 24,
      pico_efeito_h: 48,
      duracao_efeito_h: 72,
      efeito_rebote: 'Hipercalemia de rebote ao suspender abruptamente em pacientes renais — reduzir gradualmente',
      reducao_pas_mmhg: '−17 a −22 mmHg (HAS resistente como 4º agente — PATHWAY-2)',
      reducao_pad_mmhg: '−7 a −10 mmHg',
    },
    marcas: [
      { nome: 'Aldactone', laboratorio: 'Pfizer', concentracoes: ['25 mg', '50 mg', '100 mg'], destaque: true },
      { nome: 'Espironolactona EMS', laboratorio: 'EMS', concentracoes: ['25 mg', '100 mg'] },
      { nome: 'Espironolactona Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['25 mg'] },
    ],
    tags: ['espironolactona', 'aldactone', 'arm', 'mineralocorticoide', 'poupador', 'potassio', 'has', 'ic', 'aldosterona'],
  },

  // ─────────────────────────────────────────────────────────
  // DIABETES MELLITUS TIPO 2
  // ─────────────────────────────────────────────────────────

  {
    id: 'metformina',
    molecula: 'Metformina',
    nome_generico: 'Cloridrato de Metformina',
    classe: 'Biguanida',
    categoria: 'diabetes',
    cids_principais: ['E11'],
    indicacoes: ['DM2 (1ª linha universal — Classe I-A)', 'Pré-diabetes com alto risco', 'DM2 + obesidade', 'SOP (off-label)'],
    contraindicacoes: ['TFG < 30 mL/min (início) / < 15 (manter)', 'Acidose metabólica (incluindo cetoacidose)', 'Cirrose com insuficiência hepática', 'Suspender 48h antes de contraste iodado'],
    efeitos_adversos_principais: ['Diarreia / Náusea (30% no início — dose-dependente)', 'Gosto metálico', 'Deficiência de B12 (uso prolongado)', 'Acidose lática (raro 0,03/1000 pacientes-ano)'],
    dose_inicial: '500 mg 1–2×/dia com refeição',
    dose_alvo: '1000–2000 mg/dia (2–3×/dia) / 500–2000 mg (XR)',
    frequencia_doses_dia: 2,
    via: 'Oral',
    formas: ['Comprimido', 'Comprimido XR (liberação prolongada)'],
    ajuste_renal: { tfg_reducao: 'TFG 45–60: usar com cautela; TFG 30–45: reduzir dose, não iniciar novo tratamento', tfg_contraindicado: 30, dialise: 'Contraindicado' },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Evitar (risco de acidose lática)', child_c: 'Contraindicado' },
    seguro_gestante: true,
    seguro_lactante: true,
    uso_idoso: 'Monitorar TFG a cada 6 meses; reduzir se TFG declina; suspender se < 30',
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    diretriz_principal: 'ADA 2024 — Classe I-A · SBD 2024',
    eficacia: [
      { desfecho: 'Redução de complicações macrovasculares em DM2', reducao: '−32% IAM, −36% mortalidade DM', estudo: 'UKPDS 34 (Metformina)', n_pacientes: 1704, nnt: 14, rrr: '36%' },
      { desfecho: 'Prevenção de progressão para DM2 (pré-diabetes)', reducao: '−31% incidência de DM2', estudo: 'DPP (Diabetes Prevention Program)', n_pacientes: 3234, rrr: '31%' },
    ],
    interacoes: [
      { farmaco: 'Contraste iodado', mecanismo: 'Risco de acidose lática — suspender 48h antes', severidade: 'grave' },
      { farmaco: 'Álcool', mecanismo: 'Risco aumentado de acidose lática', severidade: 'moderada' },
      { farmaco: 'Inibidores de transportador renal (cimetidina, trimethoprim)', mecanismo: 'Aumento de nível plasmático de metformina', severidade: 'leve' },
    ],
    custo_relativo: 1,
    custo_descricao: 'Custo muito baixo — disponível no SUS (R$5–15/mês)',
    adesao_score: 3,
    adesao_descricao: 'Efeitos GI frequentes no início; XR melhora tolerabilidade; 2×/dia pode reduzir adesão',
    farmacocinetica: {
      biodisponibilidade: '50–60% (oral; XR: 50%); variável — depende do pH intestinal',
      tmax_h: '2–3h (IR) · 7h (XR)',
      alimento_efeito: 'Tomar com refeição — reduz náusea e melhora absorção; XR deve ser administrado com jantar',
      ligacao_proteica: 'Desprezível — não se liga a proteínas plasmáticas (farmacocineticamente favorável)',
      via_metabolismo: 'NÃO é metabolizada — excretada inalterada pela urina (transportador OCT2)',
      profarmaco: false,
      meia_vida_h: 6,
      meia_vida_descricao: 'Plasma t½ 4–9h; meia-vida tecidual ~17h (acúmulo em parede intestinal e fígado) — justifica dosagem 2–3×/dia para IR',
      excrecao_renal_pct: 90,
      excrecao_biliar_pct: 10,
      dialise_remove: true,
      mecanismo_molecular: 'Ativação de AMPK → inibição da gliconeogênese hepática (principal mecanismo), redução de absorção intestinal de glicose, aumento de captação periférica de glicose (músculo); sem estimulação de insulina — não causa hipoglicemia',
      seletividade: 'Sem seletividade receptorial específica — ação enzimática (AMPK); não atua no pâncreas',
      onset_acao_h: 1,
      pico_efeito_h: 3,
      duracao_efeito_h: 8,
      efeito_rebote: 'Ausente',
      reducao_hba1c_pct: '−1,0 a −2,0% (monoterapia)',
      reducao_pes_kg: '−1 a −3 kg (neutro-favorável — não causa ganho de peso)',
    },
    marcas: [
      { nome: 'Glifage XR', laboratorio: 'EMS', concentracoes: ['500 mg', '750 mg', '1000 mg'], destaque: true },
      { nome: 'Metformina Biolab', laboratorio: 'Biolab', concentracoes: ['500 mg', '850 mg', '1000 mg'] },
    ],
    tags: ['metformina', 'glifage', 'biguanida', 'dm2', 'diabetes', 'hba1c', '1a linha'],
  },

  {
    id: 'empagliflozina',
    molecula: 'Empagliflozina',
    nome_generico: 'Empagliflozina',
    classe: 'Inibidor de SGLT-2',
    subclasse: 'Inibidor do Cotransportador Sódio-Glicose 2',
    categoria: 'diabetes',
    cids_principais: ['E11', 'I50', 'N18'],
    indicacoes: ['DM2 + DCV estabelecida (Classe I — ADA)', 'DM2 + Insuficiência Cardíaca', 'DM2 + DRC (TFG ≥ 20)', 'IC-FEr independente de DM2 (25 mg)', 'IC-FEp + DM2'],
    contraindicacoes: ['DM1 (fora de indicação aprovada)', 'TFG < 20 mL/min (para iniciar)', 'Cetoacidose diabética (qualquer tipo)', 'Infecção urinária/genital recorrente grave'],
    efeitos_adversos_principais: ['Candidíase genital (10% F, 4% M)', 'Infecção urinária (minor aumento)', 'Poliúria / Polidipsia (transitória)', 'Amputação de membros inferiores (cautela em PVD)', 'Cetoacidose euglicêmica (raro)'],
    dose_inicial: '10 mg 1×/dia (manhã)',
    dose_alvo: '10 mg (DM2/DRC) · 25 mg (IC-FEr)',
    frequencia_doses_dia: 1,
    via: 'Oral',
    formas: ['Comprimido'],
    ajuste_renal: { tfg_reducao: 'TFG 20–45: usar 10 mg (efeito glicêmico reduzido, benefício CV/renal mantido)', tfg_contraindicado: 20, dialise: 'Contraindicado' },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Usar com cautela', child_c: 'Não recomendado (dados limitados)' },
    seguro_gestante: 'contraindicado',
    seguro_lactante: 'contraindicado',
    uso_idoso: 'Menor risco de hipoglicemia — seguro; monitorar hidratação e PA',
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    diretriz_principal: 'ADA 2024 Classe I · ESC-HF 2021 Classe I · KDIGO 2025',
    eficacia: [
      { desfecho: 'Morte CV + hospitalização por IC em DM2', reducao: '−38% hospitalização IC', estudo: 'EMPA-REG OUTCOME', n_pacientes: 7020, nnt: 39, hr: '0.62', rrr: '38%' },
      { desfecho: 'Mortalidade em IC-FEr (com e sem DM)', reducao: '−25% morte CV ou hosp. IC', estudo: 'EMPEROR-Reduced', n_pacientes: 3730, nnt: 19, hr: '0.75' },
      { desfecho: 'Progressão de DRC', reducao: '−40% progressão renal', estudo: 'EMPA-KIDNEY', n_pacientes: 6609, hr: '0.60', rrr: '40%' },
    ],
    interacoes: [
      { farmaco: 'Insulina + sulfonilureias', mecanismo: 'Risco de hipoglicemia — reduzir dose do secretagogo', severidade: 'moderada' },
      { farmaco: 'Diuréticos de alça', mecanismo: 'Desidratação aditiva — monitorar', severidade: 'leve' },
      { farmaco: 'Digoxina', mecanismo: 'Pequeno aumento de nível sérico de digoxina', severidade: 'leve' },
    ],
    custo_relativo: 4,
    custo_descricao: 'Custo elevado — sem genérico disponível no Brasil (R$200–400/mês)',
    adesao_score: 5,
    adesao_descricao: '1×/dia, sem ajuste alimentar, perda de peso associada melhora adesão',
    farmacocinetica: {
      biodisponibilidade: '~84% (oral)',
      tmax_h: '1,5h',
      alimento_efeito: 'Sem efeito clínico relevante',
      ligacao_proteica: '86,2% (albumina)',
      via_metabolismo: 'Glucuronidação (UGT1A3, UGT2B7) — sem metabolismo CYP significativo; baixo risco de interações',
      profarmaco: false,
      meia_vida_h: 12.4,
      meia_vida_descricao: 't½ ~12,4h — justifica 1×/dia com cobertura de 24h; regime simples',
      excrecao_renal_pct: 54,
      excrecao_biliar_pct: 41,
      dialise_remove: false,
      mecanismo_molecular: 'Inibição do cotransportador SGLT-2 no túbulo proximal renal → glicosúria (70–90 g/dia), natriurese, redução de pressão intraglomerular, redução de volemia e PA; efeitos cardio-renais independem do efeito glicêmico',
      seletividade: 'SGLT-2 seletivo (vs SGLT-1 intestinal) — alta razão de seletividade (~2500:1); dapagliflozina ~1200:1',
      onset_acao_h: 0.5,
      pico_efeito_h: 1.5,
      duracao_efeito_h: 24,
      efeito_rebote: 'Ausente',
      reducao_hba1c_pct: '−0,6 a −1,2% (adicional)',
      reducao_pes_kg: '−2 a −4 kg (6 meses)',
      reducao_pas_mmhg: '−3 a −5 mmHg',
    },
    marcas: [
      { nome: 'Jardiance', laboratorio: 'Boehringer/Lilly', concentracoes: ['10 mg', '25 mg'], destaque: true },
      { nome: 'Empagliflozina Torrent', laboratorio: 'Torrent', concentracoes: ['10 mg', '25 mg'] },
      { nome: 'Empagliflozina EMS', laboratorio: 'EMS', concentracoes: ['10 mg', '25 mg'] },
    ],
    tags: ['empagliflozina', 'jardiance', 'sglt2', 'sglt-2', 'flozina', 'dm2', 'ic', 'drc', 'renal', 'cardiorrenal'],
  },

  {
    id: 'liraglutida',
    molecula: 'Liraglutida',
    nome_generico: 'Liraglutida',
    classe: 'Agonista de GLP-1',
    subclasse: 'Análogo de GLP-1 de longa ação',
    categoria: 'diabetes',
    cids_principais: ['E11', 'E66'],
    indicacoes: ['DM2 + DCV aterosclerótica (Classe I — ADA)', 'DM2 + obesidade (IMC ≥ 30)', 'Redução de peso em DM2', 'DM2 com HbA1c não controlada em 2ª linha'],
    contraindicacoes: ['Carcinoma medular de tireoide pessoal ou familiar (MTC)', 'NEM tipo 2', 'DM1', 'Pancreatite aguda ativa'],
    efeitos_adversos_principais: ['Náusea (20–40% — transitória)', 'Vômito', 'Diarreia', 'Pancreatite (raro)', 'Risco teórico de tumor C de tireoide (em roedores — não confirmado em humanos)'],
    dose_inicial: '0,6 mg SC 1×/dia (semana 1)',
    dose_alvo: '1,2–1,8 mg SC 1×/dia',
    frequencia_doses_dia: 1,
    via: 'Subcutâneo',
    formas: ['Solução injetável (caneta pré-preenchida)'],
    ajuste_renal: { tfg_reducao: 'TFG < 15: dados limitados — usar com cautela', tfg_contraindicado: 15 },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Usar com cautela (dados limitados)', child_c: 'Não recomendado' },
    seguro_gestante: 'contraindicado',
    seguro_lactante: 'contraindicado',
    uso_idoso: 'Seguro; náusea pode ser mais limitante; monitorar desidratação',
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    diretriz_principal: 'ADA 2024 — Classe I em DM2+DCV · EASD 2023',
    eficacia: [
      { desfecho: 'MACE (IAM, AVC, morte CV) em DM2+DCV', reducao: '−13% MACE vs placebo', estudo: 'LEADER', n_pacientes: 9340, nnt: 66, hr: '0.87', rrr: '13%' },
      { desfecho: 'Perda de peso em DM2', reducao: '−3,2 kg vs placebo', estudo: 'LEADER (secundário)', n_pacientes: 9340 },
    ],
    interacoes: [
      { farmaco: 'Insulina / sulfonilureias', mecanismo: 'Hipoglicemia aditiva — reduzir secretagogo', severidade: 'moderada' },
      { farmaco: 'Varfarina', mecanismo: 'Alteração de absorção de medicamentos orais (retarda esvaziamento gástrico)', severidade: 'leve' },
    ],
    custo_relativo: 5,
    custo_descricao: 'Custo muito alto (R$600–900/mês) — cobertura por planos variável',
    adesao_score: 3,
    adesao_descricao: 'Injetável SC 1×/dia — náusea inicial reduz adesão nas primeiras 4–8 semanas',
    farmacocinetica: {
      biodisponibilidade: '55% (SC)',
      tmax_h: '8–12h (SC)',
      alimento_efeito: 'Não aplicável (SC) — independe de refeição; aplicar em qualquer horário fixo',
      ligacao_proteica: '98% (albumina) — alta ligação proteica contribui para meia-vida longa',
      via_metabolismo: 'Degradação por peptidases endógenas (DPP-IV, endopeptidases neutras) — não é metabolizado por CYP450; sem interações CYP',
      profarmaco: false,
      meia_vida_h: 13,
      meia_vida_descricao: 't½ ~13h (SC) — ligação à albumina e resistência à degradação por DPP-IV permitem dosagem 1×/dia (vs GLP-1 nativo t½ ~2min)',
      excrecao_renal_pct: 6,
      excrecao_biliar_pct: 5,
      dialise_remove: false,
      mecanismo_molecular: 'Agonista do receptor GLP-1 → estimulação de secreção de insulina glicose-dependente, inibição de glucagon, retardo do esvaziamento gástrico (saciedade), redução de apetite central; ação vasculoprotetora direta (receptores GLP-1 em endotélio)',
      seletividade: 'Receptor GLP-1 seletivo — homologia 97% com GLP-1 humano; agonismo completo (full agonist)',
      onset_acao_h: 4,
      pico_efeito_h: 10,
      duracao_efeito_h: 24,
      efeito_rebote: 'Retorno gradual ao peso basal ao suspender',
      reducao_hba1c_pct: '−1,0 a −1,6%',
      reducao_pes_kg: '−2 a −4 kg (72 semanas — LEADER)',
    },
    marcas: [
      { nome: 'Victoza', laboratorio: 'Novo Nordisk', concentracoes: ['6 mg/mL'], destaque: true },
    ],
    tags: ['liraglutida', 'victoza', 'glp-1', 'glp1', 'agonista', 'injetavel', 'dm2', 'obesidade', 'peso'],
  },

  {
    id: 'sitagliptina',
    molecula: 'Sitagliptina',
    nome_generico: 'Fosfato de Sitagliptina',
    classe: 'Inibidor DPP-4',
    subclasse: 'Inibidor da Dipeptidil Peptidase-4',
    categoria: 'diabetes',
    cids_principais: ['E11'],
    indicacoes: ['DM2 (2ª ou 3ª linha)', 'DM2 em idosos (baixo risco de hipoglicemia)', 'DM2 com contraindicação a GLP-1 e SGLT-2', 'DM2 + DRC moderada (ajuste de dose)'],
    contraindicacoes: ['DM1', 'Cetoacidose diabética', 'Hipersensibilidade prévia'],
    efeitos_adversos_principais: ['Nasofaringite', 'Artralgia (raro mas associado — FDA alert)', 'Pancreatite (raro)', 'Infecção urinária (minor)', 'Bolha cutânea (raro)'],
    dose_inicial: '100 mg 1×/dia',
    dose_alvo: '100 mg 1×/dia (ajustar em DRC)',
    frequencia_doses_dia: 1,
    via: 'Oral',
    formas: ['Comprimido'],
    ajuste_renal: { tfg_reducao: 'TFG 30–50: 50 mg/dia; TFG < 30: 25 mg/dia', tfg_contraindicado: 15, dialise: '25 mg/dia após sessão' },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Dados limitados' },
    seguro_gestante: 'evitar',
    seguro_lactante: 'evitar',
    uso_idoso: 'Excelente opção — sem hipoglicemia, 1×/dia, oral, sem necessidade de ajuste alimentar',
    nivel_evidencia: 'A',
    grau_recomendacao: 'IIa',
    diretriz_principal: 'ADA 2024 — DPP-4 alternativa em DM2 sem DCV',
    eficacia: [
      { desfecho: 'Não inferioridade CV vs placebo', reducao: 'NI — sem aumento de MACE', estudo: 'TECOS', n_pacientes: 14671 },
      { desfecho: 'Redução HbA1c vs placebo', reducao: '−0,6 a −0,8% HbA1c', estudo: 'Pool de RCTs' },
    ],
    interacoes: [
      { farmaco: 'Insulina / sulfonilureias', mecanismo: 'Hipoglicemia aditiva (menor que SGLT-2/GLP-1)', severidade: 'leve' },
      { farmaco: 'Digoxina', mecanismo: 'Pequeno aumento de nível sérico', severidade: 'leve' },
    ],
    custo_relativo: 3,
    custo_descricao: 'Custo intermediário (R$80–180/mês) — sem genérico amplamente disponível',
    adesao_score: 5,
    adesao_descricao: '1×/dia, oral, sem ajuste alimentar, sem hipoglicemia — excelente adesão',
    farmacocinetica: {
      biodisponibilidade: '~87% (oral)',
      tmax_h: '1–4h',
      alimento_efeito: 'Sem efeito relevante',
      ligacao_proteica: '38% (baixa — menor interação proteica vs outras gliptinas)',
      via_metabolismo: 'Mínimo metabolismo CYP3A4/2C8 (~16%) — majoritariamente excretada inalterada; transportador OAT-3',
      profarmaco: false,
      meia_vida_h: 12.4,
      meia_vida_descricao: 't½ ~12,4h — 1×/dia com cobertura de 24h; ideal para esquemas simplificados',
      excrecao_renal_pct: 87,
      excrecao_biliar_pct: 13,
      dialise_remove: true,
      mecanismo_molecular: 'Inibição competitiva reversível da DPP-4 → aumento de GLP-1 e GIP endógenos (após refeição) → estimulação de insulina glicose-dependente e inibição de glucagon; efeito dependente de nível prandial de incretinas',
      seletividade: 'DPP-4 seletivo (>2600:1 vs DPP-8/9) — evita efeitos imunossupressores/inflamatórios associados a inibição de DPP-8/9',
      onset_acao_h: 1,
      pico_efeito_h: 4,
      duracao_efeito_h: 24,
      efeito_rebote: 'Ausente',
      reducao_hba1c_pct: '−0,6 a −0,8%',
      reducao_pes_kg: 'Neutro (0 a −0,5 kg)',
    },
    marcas: [
      { nome: 'Januvia', laboratorio: 'MSD', concentracoes: ['25 mg', '50 mg', '100 mg'], destaque: true },
      { nome: 'Sitagliptina EMS', laboratorio: 'EMS', concentracoes: ['50 mg', '100 mg'] },
    ],
    tags: ['sitagliptina', 'januvia', 'dpp4', 'dpp-4', 'gliptina', 'dm2', 'idoso'],
  },

  // ─────────────────────────────────────────────────────────
  // INSUFICIÊNCIA CARDÍACA
  // ─────────────────────────────────────────────────────────

  {
    id: 'sacubitril_valsartana',
    molecula: 'Sacubitril + Valsartana',
    nome_generico: 'Sacubitril/Valsartana',
    classe: 'ARNI',
    subclasse: 'Inibidor de Neprilisina + BRA',
    categoria: 'insuficiencia_cardiaca',
    cids_principais: ['I50.0'],
    indicacoes: ['IC-FEr sintomática (NYHA II–IV, FE ≤ 40%) — substitui IECA/BRA (Classe I-B)', 'Redução de morte e hospitalização por IC'],
    contraindicacoes: ['Uso concomitante ou < 36h após IECA', 'Angioedema prévio', 'Gravidez', 'TFG < 30 mL/min (cautela)', 'Hipotensão grave (PA < 100 mmHg)'],
    efeitos_adversos_principais: ['Hipotensão (18% vs 12% enalapril)', 'Hipercalemia', 'Angioedema (< 0,5%)', 'Elevação de creatinina', 'Tontura'],
    dose_inicial: '24/26 mg 2×/dia (se antes IECA/BRA) · 49/51 mg 2×/dia',
    dose_alvo: '97/103 mg 2×/dia',
    frequencia_doses_dia: 2,
    via: 'Oral',
    formas: ['Comprimido (combinação fixa)'],
    ajuste_renal: { tfg_reducao: 'TFG 30–60: iniciar com dose baixa (24/26 mg 2×/dia)', tfg_contraindicado: 15 },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Iniciar dose baixa', child_c: 'Não recomendado' },
    seguro_gestante: 'contraindicado',
    seguro_lactante: 'contraindicado',
    uso_idoso: 'Iniciar com dose mínima; monitorar PA e função renal',
    nivel_evidencia: 'B',
    grau_recomendacao: 'I',
    diretriz_principal: 'ESC-HF 2021 — Classe I-B (substitui IECA em IC-FEr)',
    eficacia: [
      { desfecho: 'Morte CV + hospitalização IC vs enalapril', reducao: '−20% morte CV, −21% hosp. IC', estudo: 'PARADIGM-HF', n_pacientes: 8442, nnt: 21, hr: '0.80', rrr: '20%' },
      { desfecho: 'Mortalidade total vs enalapril', reducao: '−16% morte total', estudo: 'PARADIGM-HF', n_pacientes: 8442, nnt: 36, rrr: '16%' },
    ],
    interacoes: [
      { farmaco: 'IECA (< 36h washout)', mecanismo: 'Angioedema grave — contraindicado', severidade: 'contraindicada' },
      { farmaco: 'Aliskiren (em DM/DRC)', mecanismo: 'Duplo bloqueio SRAA', severidade: 'contraindicada' },
      { farmaco: 'Estatinas (sinvastatina)', mecanismo: 'Neprilisina aumenta nível de sinvastatina levemente', severidade: 'leve' },
    ],
    custo_relativo: 5,
    custo_descricao: 'Custo muito alto (R$300–600/mês) — sem genérico disponível',
    adesao_score: 4,
    adesao_descricao: '2×/dia — hipotensão inicial pode reduzir adesão; dose titulável melhora tolerabilidade',
    farmacocinetica: {
      biodisponibilidade: 'Sacubitrilato: ~60%; Valsartana: ~23% (na combinação, maior que valsartana isolada)',
      tmax_h: 'Sacubitrilato: 0,5h (pró-fármaco) · 2–4h (sacubitrilato ativo); Valsartana: 1,5–5h',
      alimento_efeito: 'Sem efeito clínico relevante',
      ligacao_proteica: 'Sacubitrilato: 97%; Valsartana: 97% (albumina)',
      via_metabolismo: 'Sacubitril: hidrólise de éster → sacubitrilato (ativo, inibidor de neprilisina); Valsartana: mínimo metabolismo CYP2C9 (~20%)',
      profarmaco: true,
      metabólito_ativo: 'Sacubitrilato (LBQ657) — inibidor ativo de neprilisina',
      meia_vida_h: 11,
      meia_vida_descricao: 'Sacubitrilato t½ ~11,5h; Valsartana t½ ~9,9h — ambos 2×/dia necessário para manutenção de níveis terapêuticos',
      excrecao_renal_pct: 52,
      excrecao_biliar_pct: 37,
      dialise_remove: false,
      mecanismo_molecular: 'Dupla ação: (1) Sacubitrilato inibe neprilisina → acúmulo de BNP, ANP, bradicinina → vasodilatação e natriurese; (2) Valsartana bloqueia receptor AT1 → reduz SRAA; sinergismo cardioprotletor',
      seletividade: 'Sacubitrilato: inibição de neprilisina (endopeptidase) — não seletivo para substratos; Valsartana: AT1 seletivo',
      onset_acao_h: 2,
      pico_efeito_h: 5,
      duracao_efeito_h: 12,
      efeito_rebote: 'Reativação de SRAA ao suspender — retirar gradualmente',
      reducao_pas_mmhg: '−6 a −10 mmHg (vs enalapril)',
    },
    marcas: [
      { nome: 'Entresto', laboratorio: 'Novartis', concentracoes: ['24/26 mg', '49/51 mg', '97/103 mg'], destaque: true },
    ],
    tags: ['sacubitril', 'valsartana', 'entresto', 'arni', 'neprilisina', 'ic', 'icfer', 'paradigm'],
  },

  {
    id: 'carvedilol',
    molecula: 'Carvedilol',
    nome_generico: 'Carvedilol',
    classe: 'Betabloqueador',
    subclasse: 'Betabloqueador não-seletivo + α1-bloqueador',
    categoria: 'insuficiencia_cardiaca',
    cids_principais: ['I50', 'I10', 'I20'],
    indicacoes: ['IC-FEr (NYHA II–IV) — Quarteto ESC', 'HAS', 'Angina estável', 'Pós-IAM com disfunção VE'],
    contraindicacoes: ['Asma brônquica (DPOC moderado/grave — cautela)', 'BAV 2º e 3º grau (sem MP)', 'Bradicardia < 60 bpm', 'Choque cardiogênico', 'Doença arterial periférica grave'],
    efeitos_adversos_principais: ['Bradicardia', 'Hipotensão (especialmente α-bloqueio)', 'Broncoespasmo (em asmáticos)', 'Fadiga', 'Frigidez extremidades', 'Mascaramento de hipoglicemia em DM'],
    dose_inicial: '3,125 mg 2×/dia (com alimento)',
    dose_alvo: '25–50 mg 2×/dia',
    frequencia_doses_dia: 2,
    via: 'Oral',
    formas: ['Comprimido'],
    ajuste_renal: { tfg_reducao: 'Sem ajuste necessário' },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Reduzir dose 50%', child_c: 'Contraindicado' },
    seguro_gestante: 'evitar',
    seguro_lactante: 'evitar',
    uso_idoso: 'Iniciar com dose mínima — hipotensão postural mais frequente',
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    diretriz_principal: 'ESC-HF 2021 — Quarteto IC Classe I-A',
    eficacia: [
      { desfecho: 'Mortalidade em IC-FEr grave', reducao: '−35% mortalidade total', estudo: 'COPERNICUS', n_pacientes: 2289, nnt: 15, hr: '0.65', rrr: '35%' },
      { desfecho: 'Mortalidade pós-IAM', reducao: '−23% morte/IAM recorrente', estudo: 'CAPRICORN', n_pacientes: 1959, nnt: 38 },
    ],
    interacoes: [
      { farmaco: 'Verapamil / Diltiazem', mecanismo: 'BAV e bradicardia grave', severidade: 'contraindicada' },
      { farmaco: 'Insulina / sulfonilureias', mecanismo: 'Mascaramento de hipoglicemia + prolongamento', severidade: 'moderada' },
      { farmaco: 'Amiodarona', mecanismo: 'Bradicardia e hipotensão aditivas', severidade: 'moderada' },
      { farmaco: 'Digoxina', mecanismo: 'Bradicardia aditiva', severidade: 'moderada' },
    ],
    custo_relativo: 1,
    custo_descricao: 'Custo muito baixo — genérico amplamente disponível (R$10–25/mês)',
    adesao_score: 3,
    adesao_descricao: '2×/dia + fadiga inicial + hipotensão dificultam adesão nas primeiras semanas',
    farmacocinetica: {
      biodisponibilidade: '25–35% (efeito de primeira passagem hepático extenso — tomar com alimento reduz hipotensão)',
      tmax_h: '1–2h',
      alimento_efeito: 'Tomar com alimento — retarda absorção e reduz incidência de hipotensão postural',
      ligacao_proteica: '98% (albumina)',
      via_metabolismo: 'CYP2D6 (principal) + CYP2C9 → metabólitos fenólicos (parcialmente ativos); polimorfismo CYP2D6 afeta exposição',
      profarmaco: false,
      meia_vida_h: 8,
      meia_vida_descricao: 't½ ~7–10h; metabolizadores rápidos: t½ 6–8h; metabolizadores lentos CYP2D6: t½ 10–14h (> efeitos) — justifica 2×/dia',
      excrecao_renal_pct: 16,
      excrecao_biliar_pct: 60,
      dialise_remove: false,
      mecanismo_molecular: 'Bloqueio β1 e β2 (não seletivo) + bloqueio α1 → redução de FC, débito cardíaco e vasodilatação periférica; ação antioxidante (diferencial vs outros betabloqueadores)',
      seletividade: 'Não seletivo (β1 + β2 + α1) — razão β:α ~ 10:1; bloqueio β2 pode causar broncoespasmo em asmáticos',
      onset_acao_h: 1,
      pico_efeito_h: 2,
      duracao_efeito_h: 12,
      efeito_rebote: 'Taquicardia e hipertensão de rebote se suspenso abruptamente — retirar em 1–2 semanas',
      reducao_pas_mmhg: '−8 a −12 mmHg (HAS)',
    },
    marcas: [
      { nome: 'Coreg', laboratorio: 'GSK', concentracoes: ['3,125 mg', '6,25 mg', '12,5 mg', '25 mg'], destaque: true },
      { nome: 'Cardibeta', laboratorio: 'Biolab', concentracoes: ['3,125 mg', '6,25 mg', '25 mg'] },
      { nome: 'Carvedilol EMS', laboratorio: 'EMS', concentracoes: ['3,125 mg', '6,25 mg', '12,5 mg', '25 mg'] },
    ],
    tags: ['carvedilol', 'coreg', 'betabloqueador', 'beta', 'adrenergico', 'ic', 'iam', 'has'],
  },

  // ─────────────────────────────────────────────────────────
  // DISLIPIDEMIAS
  // ─────────────────────────────────────────────────────────

  {
    id: 'atorvastatina',
    molecula: 'Atorvastatina',
    nome_generico: 'Atorvastatina Cálcica',
    classe: 'Estatina de alta intensidade',
    categoria: 'dislipidemias',
    cids_principais: ['E78', 'I25'],
    indicacoes: ['Hipercolesterolemia primária', 'Dislipidemia mista', 'Prevenção CV primária (alto risco)', 'Prevenção CV secundária (Classe I-A)', 'SCA (alta dose, precoce)'],
    contraindicacoes: ['Doença hepática ativa', 'Transaminases > 3× LSN persistentes', 'Gravidez', 'Lactação', 'Miopatia ativa'],
    efeitos_adversos_principais: ['Mialgia (5–10%)', 'Miopatia/rabdomiólise (raro < 0,1%)', 'Elevação de transaminases', 'Diabetes novo (pequeno aumento de risco)', 'Cefaleia'],
    dose_inicial: '10–20 mg 1×/dia',
    dose_alvo: '40–80 mg 1×/dia (alta intensidade)',
    frequencia_doses_dia: 1,
    via: 'Oral',
    formas: ['Comprimido revestido'],
    ajuste_renal: { tfg_reducao: 'Sem ajuste — não excretada pelo rim' },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Contraindicado', child_c: 'Contraindicado' },
    seguro_gestante: 'contraindicado',
    seguro_lactante: 'contraindicado',
    uso_idoso: 'Seguro — monitorar mialgia; sem ajuste de dose necessário',
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    diretriz_principal: 'SBC 2025 — LDL < 50 mg/dL risco muito alto · ESC/EAS 2019',
    eficacia: [
      { desfecho: 'Prevenção CV primária em HAS + dislipidemia', reducao: '−37% eventos CV maiores', estudo: 'ASCOT-LLA', n_pacientes: 10305, nnt: 67, rrr: '37%' },
      { desfecho: 'Prevenção secundária pós-SCA', reducao: '−22% MACE vs pravastatina', estudo: 'PROVE IT-TIMI 22', n_pacientes: 4162, nnt: 27 },
    ],
    interacoes: [
      { farmaco: 'Anlodipino > 5 mg', mecanismo: 'Inibição CYP3A4 — aumenta nível de atorvastatina (miopatia)', severidade: 'leve' },
      { farmaco: 'Claritromicina / Eritromicina', mecanismo: 'Inibição CYP3A4 — risco miopatia', severidade: 'moderada' },
      { farmaco: 'Gemfibrozila', mecanismo: 'Risco aumentado de miopatia/rabdomiólise', severidade: 'grave' },
      { farmaco: 'Ciclosporina', mecanismo: 'Aumento significativo de nível sérico', severidade: 'grave' },
    ],
    custo_relativo: 1,
    custo_descricao: 'Genérico amplamente disponível (R$10–30/mês)',
    adesao_score: 5,
    adesao_descricao: '1×/dia, qualquer horário, sem restrição alimentar — excelente adesão',
    farmacocinetica: {
      biodisponibilidade: '14% (oral; extenso efeito de primeira passagem hepático — captação hepática via OATP1B1/3)',
      tmax_h: '1–2h',
      alimento_efeito: 'Sem efeito relevante (tomar à noite é mito — não necessário, pois t½ é longo)',
      ligacao_proteica: '98% (albumina/lipoproteínas)',
      via_metabolismo: 'CYP3A4 extenso (principal) → metabólitos orto- e para-hidroxilados (ativos, contribuem com ~70% do efeito) + lactonas ativas; múltiplas interações CYP3A4',
      profarmaco: false,
      meia_vida_h: 14,
      meia_vida_descricao: 't½ ~14h (forma ativa); metabólitos ativos podem prolongar efeito — 1×/dia suficiente',
      excrecao_renal_pct: 2,
      excrecao_biliar_pct: 70,
      dialise_remove: false,
      mecanismo_molecular: 'Inibição competitiva da HMG-CoA redutase (etapa limitante da síntese de colesterol) → redução de LDL-C (30–50% na dose alta); aumento compensatório de receptores de LDL hepáticos; efeitos pleiotrópicos anti-inflamatórios/endoteliais',
      seletividade: 'HMG-CoA redutase seletivo; efeito pleiotrópico (anti-inflamatório, antitrombótico) adicional ao efeito lipídico',
      onset_acao_h: 24,
      pico_efeito_h: 48,
      duracao_efeito_h: 24,
      efeito_rebote: 'Aumento rápido de LDL ao suspender — manter continuamente',
      reducao_ldl_pct: '−40 a −55% (40–80 mg)',
    },
    marcas: [
      { nome: 'Crestor (rosuvastatin proxy)', laboratorio: 'AstraZeneca', concentracoes: [] },
      { nome: 'Atorvastatina Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['10 mg', '20 mg', '40 mg', '80 mg'], destaque: true },
      { nome: 'Atorvastatina EMS', laboratorio: 'EMS', concentracoes: ['10 mg', '20 mg', '40 mg', '80 mg'] },
    ],
    tags: ['atorvastatina', 'estatina', 'alta intensidade', 'ldl', 'colesterol', 'dislipidemia', 'cv', 'prevencao'],
  },

  {
    id: 'rosuvastatina',
    molecula: 'Rosuvastatina',
    nome_generico: 'Cálcio de Rosuvastatina',
    classe: 'Estatina de alta intensidade',
    categoria: 'dislipidemias',
    cids_principais: ['E78', 'I25'],
    indicacoes: ['Hipercolesterolemia primária', 'Prevenção CV secundária (Classe I-A)', 'Dislipidemia em DRC (Classe I)', 'Pacientes com intolerância a atorvastatina'],
    contraindicacoes: ['Doença hepática ativa', 'Gravidez', 'Lactação', 'Miopatia ativa', 'TFG < 30 (dose ≤ 10 mg)'],
    efeitos_adversos_principais: ['Mialgia', 'Proteinúria (alta dose — transitória)', 'Elevação de CK', 'Diabetes novo (similar a atorvastatina)', 'Elevação de transaminases'],
    dose_inicial: '5–10 mg 1×/dia',
    dose_alvo: '20–40 mg 1×/dia',
    frequencia_doses_dia: 1,
    via: 'Oral',
    formas: ['Comprimido revestido'],
    ajuste_renal: { tfg_reducao: 'TFG 30–60: máximo 20 mg/dia', tfg_contraindicado: 30, dialise: 'Contraindicado' },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Contraindicado', child_c: 'Contraindicado' },
    seguro_gestante: 'contraindicado',
    seguro_lactante: 'contraindicado',
    uso_idoso: 'Iniciar com 5 mg — maior potência exige maior cuidado com miopatia',
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    diretriz_principal: 'SBC 2025 · ESC/EAS 2019 — LDL < 55 mg/dL risco muito alto',
    eficacia: [
      { desfecho: 'Prevenção primária (sem DCV prévia, PCR elevado)', reducao: '−44% MACE vs placebo', estudo: 'JUPITER', n_pacientes: 17802, nnt: 95, rrr: '44%' },
      { desfecho: 'Redução de LDL vs dose equivalente de atorvastatina', reducao: '−10% LDL extra vs atorvastatina 40 mg', estudo: 'STELLAR', n_pacientes: 2431 },
    ],
    interacoes: [
      { farmaco: 'Gemfibrozila', mecanismo: 'Aumento expressivo do nível de rosuvastatina — risco rabdomiólise', severidade: 'grave' },
      { farmaco: 'Antiácidos (alumínio/magnésio)', mecanismo: 'Reduz absorção — separar 2h', severidade: 'leve' },
      { farmaco: 'Varfarina', mecanismo: 'Pequeno aumento de INR', severidade: 'leve' },
    ],
    custo_relativo: 2,
    custo_descricao: 'Custo baixo — genérico disponível (R$20–50/mês)',
    adesao_score: 5,
    adesao_descricao: '1×/dia, à noite preferido, sem restrição alimentar — excelente adesão',
    farmacocinetica: {
      biodisponibilidade: '20% (oral; captação hepática seletiva via OATP1B1/3 — alta concentração hepática)',
      tmax_h: '3–5h',
      alimento_efeito: 'Antiácidos à base de Al/Mg reduzem absorção ~50% — separar 2h; demais alimentos sem efeito relevante',
      ligacao_proteica: '88% (albumina)',
      via_metabolismo: 'Mínimo metabolismo CYP2C9 (~10%); substrato de OATP1B1/1B3 (captação hepática) — polimorfismos de SLCO1B1 aumentam risco de miopatia',
      profarmaco: false,
      meia_vida_h: 19,
      meia_vida_descricao: 't½ ~19h — mais longa que atorvastatina (14h); admissível 1×/dia em qualquer horário; meia-vida tecidual hepática > plasmática',
      excrecao_renal_pct: 10,
      excrecao_biliar_pct: 72,
      dialise_remove: false,
      mecanismo_molecular: 'Inibição competitiva da HMG-CoA redutase (alta potência → maior redução de LDL por mg comparado à atorvastatina); aumento de receptores LDL hepáticos; redução de PCSK9 mediada; efeitos pleiotrópicos anti-inflamatórios',
      seletividade: 'HMG-CoA redutase seletivo; captação hepática seletiva por OATP — menor concentração muscular que atorvastatina (menor risco de miopatia a doses equipotentes)',
      onset_acao_h: 24,
      pico_efeito_h: 72,
      duracao_efeito_h: 24,
      efeito_rebote: 'Aumento rápido de LDL ao suspender — manter continuamente',
      reducao_ldl_pct: '−45 a −60% (20–40 mg)',
    },
    marcas: [
      { nome: 'Crestor', laboratorio: 'AstraZeneca', concentracoes: ['5 mg', '10 mg', '20 mg', '40 mg'], destaque: true },
      { nome: 'Rosuvastatina EMS', laboratorio: 'EMS', concentracoes: ['5 mg', '10 mg', '20 mg', '40 mg'] },
      { nome: 'Rosuvastatina Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['10 mg', '20 mg', '40 mg'] },
    ],
    tags: ['rosuvastatina', 'crestor', 'estatina', 'alta intensidade', 'ldl', 'colesterol', 'dislipidemia', 'jupiter'],
  },
];

// ─── Helpers ──────────────────────────────────────────────────

export const CATEGORIA_LABEL: Record<CategoriaComparacao, string> = {
  anti_hipertensivos: 'Anti-hipertensivos',
  diabetes:           'Diabetes Mellitus',
  insuficiencia_cardiaca: 'Insuficiência Cardíaca',
  dislipidemias:      'Dislipidemias',
  pneumologia:        'Pneumologia',
  geral:              'Geral',
};

export const CATEGORIA_COR: Record<CategoriaComparacao, string> = {
  anti_hipertensivos:   'bg-rose-100   text-rose-700   dark:bg-rose-900/30   dark:text-rose-400',
  diabetes:             'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  insuficiencia_cardiaca:'bg-blue-100  text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
  dislipidemias:        'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  pneumologia:          'bg-sky-100    text-sky-700    dark:bg-sky-900/30    dark:text-sky-400',
  geral:                'bg-slate-100  text-slate-700  dark:bg-slate-700     dark:text-slate-400',
};

export const CUSTO_LABEL: Record<CustoRelativo, { label: string; cls: string }> = {
  1: { label: 'Muito baixo',     cls: 'text-green-600   dark:text-green-400'   },
  2: { label: 'Baixo',           cls: 'text-emerald-600 dark:text-emerald-400' },
  3: { label: 'Intermediário',   cls: 'text-amber-600   dark:text-amber-400'   },
  4: { label: 'Alto',            cls: 'text-orange-600  dark:text-orange-400'  },
  5: { label: 'Muito alto',      cls: 'text-red-600     dark:text-red-400'     },
};

export const ADESAO_LABEL: Record<AdesaoScore, { label: string; cls: string }> = {
  1: { label: 'Muito baixa',  cls: 'text-red-600     dark:text-red-400'     },
  2: { label: 'Baixa',        cls: 'text-orange-600  dark:text-orange-400'  },
  3: { label: 'Moderada',     cls: 'text-amber-600   dark:text-amber-400'   },
  4: { label: 'Boa',          cls: 'text-emerald-600 dark:text-emerald-400' },
  5: { label: 'Excelente',    cls: 'text-green-600   dark:text-green-400'   },
};

export const INTERACAO_SEV_COR: Record<string, string> = {
  contraindicada: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
  grave:          'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  moderada:       'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  leve:           'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
};

export function searchMoleculas(query: string): MoleculaComparavel[] {
  const q = query.toLowerCase().trim();
  if (!q) return MOLECULES_DB;
  return MOLECULES_DB.filter(m =>
    m.molecula.toLowerCase().includes(q) ||
    m.classe.toLowerCase().includes(q) ||
    m.tags.some(t => t.includes(q)) ||
    m.marcas.some(mk => mk.nome.toLowerCase().includes(q))
  );
}

export function getMoleculeById(id: string): MoleculaComparavel | undefined {
  return MOLECULES_DB.find(m => m.id === id);
}

export function getMoleculeByMarca(marca: string): MoleculaComparavel | undefined {
  return MOLECULES_DB.find(m => m.marcas.some(mk => mk.nome.toLowerCase().includes(marca.toLowerCase())));
}

export function getMoleculesByCategoria(cat: CategoriaComparacao): MoleculaComparavel[] {
  return MOLECULES_DB.filter(m => m.categoria === cat);
}

// Gera score comparativo simples A vs B (positivo = A melhor)
export type DimensaoComp = 'evidencia' | 'eficacia' | 'seguranca' | 'custo' | 'adesao' | 'ajuste_renal' | 'interacoes' | 'meia_vida';

export interface ComparativoScore {
  dimensao: DimensaoComp;
  label: string;
  score_a: number;   // 1–5
  score_b: number;   // 1–5
  vantagem: 'A' | 'B' | 'igual';
  nota_a?: string;
  nota_b?: string;
}

export function gerarComparativo(a: MoleculaComparavel, b: MoleculaComparavel): ComparativoScore[] {
  const nivMap: Record<string, number> = { A: 5, B: 3, C: 1 };
  const grauMap: Record<string, number> = { I: 5, IIa: 4, IIb: 3, III: 1 };

  const ev_a = (nivMap[a.nivel_evidencia] + grauMap[a.grau_recomendacao]) / 2;
  const ev_b = (nivMap[b.nivel_evidencia] + grauMap[b.grau_recomendacao]) / 2;

  const ef_a = Math.min(5, a.eficacia.length * 1.5 + (a.eficacia.some(e => e.nnt && e.nnt < 30) ? 1 : 0));
  const ef_b = Math.min(5, b.eficacia.length * 1.5 + (b.eficacia.some(e => e.nnt && e.nnt < 30) ? 1 : 0));

  const seg_a = Math.max(1, 5 - a.contraindicacoes.length * 0.3 - a.efeitos_adversos_principais.length * 0.2);
  const seg_b = Math.max(1, 5 - b.contraindicacoes.length * 0.3 - b.efeitos_adversos_principais.length * 0.2);

  const custo_a = 6 - a.custo_relativo; // inverted: lower cost = higher score
  const custo_b = 6 - b.custo_relativo;

  const inter_a = Math.max(1, 5 - a.interacoes.filter(i => i.severidade === 'contraindicada' || i.severidade === 'grave').length * 1.5);
  const inter_b = Math.max(1, 5 - b.interacoes.filter(i => i.severidade === 'contraindicada' || i.severidade === 'grave').length * 1.5);

  const renal_a = a.ajuste_renal.tfg_contraindicado ? (a.ajuste_renal.tfg_contraindicado < 20 ? 5 : a.ajuste_renal.tfg_contraindicado < 30 ? 4 : 3) : 5;
  const renal_b = b.ajuste_renal.tfg_contraindicado ? (b.ajuste_renal.tfg_contraindicado < 20 ? 5 : b.ajuste_renal.tfg_contraindicado < 30 ? 4 : 3) : 5;

  const vantagem = (sa: number, sb: number): 'A' | 'B' | 'igual' =>
    Math.abs(sa - sb) < 0.5 ? 'igual' : sa > sb ? 'A' : 'B';

  return [
    { dimensao: 'evidencia',    label: 'Nível de Evidência',    score_a: ev_a,    score_b: ev_b,    vantagem: vantagem(ev_a,    ev_b),    nota_a: `Nível ${a.nivel_evidencia} / Grau ${a.grau_recomendacao}`,   nota_b: `Nível ${b.nivel_evidencia} / Grau ${b.grau_recomendacao}` },
    { dimensao: 'eficacia',     label: 'Eficácia (estudos)',    score_a: ef_a,    score_b: ef_b,    vantagem: vantagem(ef_a,    ef_b),    nota_a: `${a.eficacia.length} estudos`,  nota_b: `${b.eficacia.length} estudos` },
    { dimensao: 'seguranca',    label: 'Segurança',            score_a: seg_a,   score_b: seg_b,   vantagem: vantagem(seg_a,   seg_b),   nota_a: `${a.contraindicacoes.length} contraindicações`, nota_b: `${b.contraindicacoes.length} contraindicações` },
    { dimensao: 'custo',        label: 'Custo-efetividade',    score_a: custo_a, score_b: custo_b, vantagem: vantagem(custo_a, custo_b), nota_a: CUSTO_LABEL[a.custo_relativo].label, nota_b: CUSTO_LABEL[b.custo_relativo].label },
    { dimensao: 'adesao',       label: 'Adesão estimada',      score_a: a.adesao_score, score_b: b.adesao_score, vantagem: vantagem(a.adesao_score, b.adesao_score), nota_a: `${a.frequencia_doses_dia}×/dia`, nota_b: `${b.frequencia_doses_dia}×/dia` },
    { dimensao: 'ajuste_renal', label: 'Flexibilidade Renal',  score_a: renal_a, score_b: renal_b, vantagem: vantagem(renal_a, renal_b), nota_a: a.ajuste_renal.tfg_contraindicado ? `CI se TFG < ${a.ajuste_renal.tfg_contraindicado}` : 'Sem restrição', nota_b: b.ajuste_renal.tfg_contraindicado ? `CI se TFG < ${b.ajuste_renal.tfg_contraindicado}` : 'Sem restrição' },
    { dimensao: 'interacoes',   label: 'Perfil de Interações', score_a: inter_a, score_b: inter_b, vantagem: vantagem(inter_a, inter_b), nota_a: `${a.interacoes.length} interações`, nota_b: `${b.interacoes.length} interações` },
    ...(a.farmacocinetica && b.farmacocinetica ? (() => {
      const t12_a = a.farmacocinetica.meia_vida_h;
      const t12_b = b.farmacocinetica.meia_vida_h;
      // Longer half-life → better adherence (less rebound, more forgiving) — score normalized to 1–5
      const normalize = (t: number) => Math.min(5, Math.max(1, 1 + (t / 12)));
      const mv_a = normalize(t12_a);
      const mv_b = normalize(t12_b);
      return [{ dimensao: 'meia_vida' as DimensaoComp, label: 'Meia-vida (t½)', score_a: mv_a, score_b: mv_b, vantagem: vantagem(mv_a, mv_b), nota_a: `t½ ${t12_a}h`, nota_b: `t½ ${t12_b}h` }];
    })() : []),
  ];
}
