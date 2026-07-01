// ============================================================
// PRESCREVE-AI — Tipos centrais do MVP
// ============================================================

export interface VitalSigns {
  pa_sistolica?: number;
  pa_diastolica?: number;
  fc?: number;
  fr?: number;
  temperatura?: number;
  spo2?: number;
  glasgow?: number;
  dor?: number; // escala 0-10
}

export interface RenalFunction {
  creatinina?: number;
  ureia?: number;
  tfg?: number; // mL/min/1.73m²
  ckd_stage?: 'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5';
}

export interface HepaticFunction {
  tgo?: number;
  tgp?: number;
  bilirrubina_total?: number;
  albumina?: number;
  tp?: number;
  child_pugh?: 'A' | 'B' | 'C';
}

export interface Medication {
  id: string;
  nome: string;
  dose?: string;
  via?: string;
  frequencia?: string;
  em_uso: boolean;
}

export interface Allergy {
  id: string;
  substancia: string;
  tipo: 'medicamento' | 'alimento' | 'ambiental' | 'outro';
  reacao?: string;
  gravidade?: 'leve' | 'moderada' | 'grave';
}

export interface Anamnesis {
  id?: string;
  queixa_principal: string;
  hda: string;
  hpp: string;
  historia_familiar: string;
  habitos_vida: {
    tabagismo?: 'nunca' | 'ex' | 'sim';
    cigarros_dia?: number;
    etilismo?: 'nao' | 'social' | 'abusivo';
    drogas?: boolean;
    atividade_fisica?: 'sedentario' | 'leve' | 'moderado' | 'intenso';
    dieta?: string;
  };
  exame_fisico: string;
  sinais_vitais: VitalSigns;
  laboratorio: Record<string, string>;
  imagem: string;
  comorbidades: string[];
  medicamentos_em_uso: Medication[];
  alergias: Allergy[];
  gestante: boolean;
  lactante: boolean;
  peso?: number;
  altura?: number;
  imc?: number;
  funcao_renal: RenalFunction;
  funcao_hepatica: HepaticFunction;
  created_at?: string;
  updated_at?: string;
}

export interface DiagnosticHypothesis {
  id: string;
  cid10?: string;
  nome: string;
  probabilidade: 'alta' | 'media' | 'baixa';
  criterios_favoraveis: string[];
  criterios_desfavoraveis: string[];
  exames_sugeridos: string[];
  raciocinio_clinico: string;
}

export interface DiagnosticSupport {
  hipoteses: DiagnosticHypothesis[];
  sintese_clinica: string;
  red_flags: string[];
  encaminhamento_urgente: boolean;
}

export interface EvidenceLevel {
  nivel: 'A' | 'B' | 'C' | 'D';
  grau: 'I' | 'IIa' | 'IIb' | 'III';
  descricao: string;
}

export interface ScientificReference {
  diretriz: string;
  sociedade: string;
  ano: number;
  nivel_evidencia: EvidenceLevel;
  citacao: string;
  doi?: string;
  link?: string;
}

export interface DrugDose {
  dose_padrao: string;
  dose_min?: string;
  dose_max?: string;
  unidade: string;
  via: string;
  frequencia: string;
  duracao?: string;
  ajuste_renal?: string;
  ajuste_hepatico?: string;
  ajuste_pediatrico?: string;
}

export interface TherapeuticSuggestion {
  id: string;
  classe_terapeutica: string;
  molecula: string;
  nome_generico: string;
  indicacao: string;
  dose: DrugDose;
  posologia_completa: string;
  evidencia: ScientificReference;
  contraindicacoes: string[];
  efeitos_adversos: string[];
  monitoramento: string[];
  alternativas: string[];
  marcas?: DrugBrand[];
}

export interface DrugBrand {
  laboratorio: string;
  nome_comercial: string;
  apresentacoes: string[];
  anvisa?: string;
}

export type LaboratoryPreference =
  | 'sem_preferencia'
  | 'eurofarma'
  | 'ems'
  | 'ache'
  | 'libbs'
  | 'biolab'
  | 'bayer'
  | 'pfizer'
  | 'astrazeneca'
  | 'novartis'
  | 'sanofi'
  | 'roche'
  | 'gsk'
  | 'torrent'
  | 'outro';

export interface TherapeuticPlan {
  diagnostico_selecionado: string;
  farmacologico: TherapeuticSuggestion[];
  nao_farmacologico: string[];
  seguimento: string;
  monitorizacao: string[];
  encaminhamento?: string;
  preferencia_laboratorio: LaboratoryPreference;
}

export type AlertSeverity = 'info' | 'warning' | 'danger' | 'critical';

export interface SafetyAlert {
  id: string;
  tipo: 'interacao' | 'alergia' | 'gravidez' | 'lactacao' | 'renal' | 'hepatico' | 'contraindicacao' | 'dose' | 'duplicidade';
  severidade: AlertSeverity;
  titulo: string;
  descricao: string;
  medicamentos_envolvidos: string[];
  recomendacao: string;
  referencia?: string;
}

export interface SafetyCheck {
  aprovado: boolean;
  alertas: SafetyAlert[];
  medicamentos_validados: string[];
}

export interface PrescriptionItem {
  id: string;
  medicamento: string;
  concentracao: string;
  forma_farmaceutica: string;
  quantidade: string;
  posologia: string;
  via: string;
  duracao: string;
  instrucoes_especiais?: string;
  uso_continuo: boolean;
}

export interface Prescription {
  id?: string;
  tipo: 'simples' | 'especial_branca' | 'especial_amarela' | 'especial_azul';
  paciente: {
    nome: string;
    data_nascimento?: string;
    cpf?: string;
    endereco?: string;
  };
  medico: {
    nome: string;
    crm: string;
    especialidade?: string;
    endereco?: string;
    telefone?: string;
  };
  itens: PrescriptionItem[];
  orientacoes_gerais?: string;
  retorno?: string;
  data_emissao: string;
  validade?: string;
  diagnostico?: string;
}

export interface Consultation {
  id: string;
  status: 'anamnese' | 'diagnostico' | 'terapeutico' | 'prescricao' | 'concluida';
  paciente_nome: string;
  data: string;
  anamnese?: Anamnesis;
  apoio_diagnostico?: DiagnosticSupport;
  diagnostico_selecionado?: string;
  plano_terapeutico?: TherapeuticPlan;
  seguranca?: SafetyCheck;
  prescricao?: Prescription;
  prognostico?: PrognosisData;
}

// ============================================================
// PROGNÓSTICO — Módulo 4 (Atualização)
// ============================================================
export interface ClinicalScore {
  nome: string;
  sigla: string;
  valor: number | string;
  interpretacao: string;
  referencia: string;
  cor: 'green' | 'yellow' | 'orange' | 'red';
}

export interface PrognosisData {
  risco_geral: 'baixo' | 'moderado' | 'alto' | 'muito_alto';
  risco_percentual?: string;
  scores: ClinicalScore[];
  fatores_risco: string[];
  fatores_protetores: string[];
  eventos_relevantes: string[];
  progressao_esperada: string;
  horizonte_temporal: string;
  aviso: string;
}

// ============================================================
// BANCO UNIVERSAL DE MOLÉCULAS — Atualização 5
// ============================================================
export interface MoleculeEntry {
  id: string;
  molecula: string;
  nome_generico: string;
  classe: string;
  subclasse?: string;
  indicacoes: string[];
  marcas: DrugBrand[];
  apresentacoes_disponiveis: string[];
  formas_farmaceuticas: string[];
}

export interface DrugDatabase {
  [cid10Prefix: string]: MoleculeEntry[];
}

// ============================================================
// CONFIGURAÇÕES GLOBAIS — Atualização 6
// ============================================================
export interface AppSettings {
  medico: {
    nome: string;
    crm: string;
    especialidade: string;
    endereco?: string;
    telefone?: string;
  };
  preferencia_laboratorio: LaboratoryPreference;
  tema: 'light' | 'dark' | 'system';
  mostrar_evidencias_painel: boolean;
  alertas_interacao: boolean;
  idioma: 'pt-BR';
}

// ============================================================
// CATÁLOGO DE LABORATÓRIOS — Atualização 11
// ============================================================
export type FormFarmaceutica =
  | 'comprimido' | 'capsula' | 'solucao_oral' | 'suspensao_oral'
  | 'injetavel' | 'solucao_injetavel' | 'suspensao_injetavel' | 'inalatorio'
  | 'creme' | 'pomada' | 'gel' | 'supositorio' | 'adesivo' | 'spray'
  | 'gotas' | 'xarope' | 'capsula_mole'
  | 'comprimido_liberacao_modificada' | 'comprimido_liberacao_prolongada'
  | 'comprimido_orodispersivel' | 'comprimido_sublingual' | 'comprimido_gastrorresistente'
  | 'capsula_liberacao_prolongada' | 'capsula_liberacao_retardada'
  | 'granulado_sache';

export interface LabInfo {
  id: string;
  nome: string;
  cnpj?: string;
  site?: string;
  portfolio_sync_date: string;
  portfolio_version: string;
  ativo: boolean;
}

export interface Apresentacao {
  concentracao: string;
  forma_farmaceutica: FormFarmaceutica;
  embalagem: string;
  registro_anvisa?: string;
}

export interface ProdutoComercial {
  id: string;
  lab_id: string;
  molecula: string;
  nome_comercial: string;
  classe_terapeutica: string;
  cids_aprovados: string[];
  apresentacoes: Apresentacao[];
  posologia_aprovada: string;
  contraindicacoes_bula: string[];
  advertencias_principais: string[];
  interacoes_principais: string[];
  uso_populacoes_especiais: {
    renal?: string;
    hepatico?: string;
    pediatrico?: string;
    gestante?: string;
    idoso?: string;
  };
  data_registro: string;
  data_ultima_atualizacao: string;
  versao_bula: string;
  fonte_regulatoria: 'ANVISA';
  link_bula_profissional?: string;
  link_bula_paciente?: string;
}

// ============================================================
// BANCO DE BULAS — Atualização 11
// ============================================================
export interface BulaSection {
  titulo: string;
  conteudo: string;
}

export interface BulaCompleta {
  produto_id: string;
  produto_nome: string;
  molecula: string;
  bula_profissional: BulaSection[];
  bula_paciente: BulaSection[];
  data_aprovacao_anvisa: string;
  versao: string;
}

// ============================================================
// REPOSITÓRIO CIENTÍFICO — Atualização 11
// ============================================================
export type TipoEvidencia =
  | 'diretriz' | 'consenso' | 'meta_analise'
  | 'revisao_sistematica' | 'ensaio_clinico' | 'coorte';

export interface ScientificEntry {
  id: string;
  titulo: string;
  tipo: TipoEvidencia;
  sociedade_ou_journal: string;
  ano: number;
  doi?: string;
  cids_relacionados: string[];
  moleculas_relacionadas: string[];
  classes_relacionadas: string[];
  nivel_evidencia: string;
  grau_recomendacao?: string;
  resumo: string;
  url?: string;
  data_inclusao: string;
  data_proxima_revisao?: string;
}

// ============================================================
// GOVERNANÇA CIENTÍFICA — Atualização 8
// ============================================================
export interface GuidelineVersion {
  id: string;
  diretriz: string;
  sociedade: string;
  versao: string;
  ano: number;
  data_atualizacao: string;
  data_proxima_revisao?: string;
  status: 'ativo' | 'em_revisao' | 'desatualizado';
  resumo_mudancas?: string;
  responsavel?: string;
}
