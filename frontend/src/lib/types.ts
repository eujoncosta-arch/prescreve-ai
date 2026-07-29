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

export interface DiagnosticGuideline {
  diretriz: string;
  sociedade: string;
  ano: number;
  nivel_evidencia: 'A' | 'B' | 'C' | 'D';
  grau_recomendacao: 'I' | 'IIa' | 'IIb' | 'III';
  link?: string;
}

export interface DiagnosticHypothesis {
  id: string;
  cid10?: string;
  nome: string;
  probabilidade: 'alta' | 'media' | 'baixa';
  grau_confianca?: number;           // 0–100 (motor CDS)
  criterios_favoraveis: string[];
  criterios_desfavoraveis: string[];
  exames_sugeridos: string[];
  exames_faltantes?: string[];       // para confirmar/excluir este diagnóstico
  diferenciais?: string[];           // nomes dos diferenciais relevantes
  raciocinio_clinico: string;
  guideline?: DiagnosticGuideline;   // diretriz utilizada
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
  /** RM-26: priorização clínica desta opção para o paciente (ausente = não classificado). */
  prioridade?: ClinicalPriority;
}

/** RM-26 — Priorização Clínica. Nível 1–3 (Nível 4 = excluído, não aparece em farmacologico). */
export type ClinicalPriorityTier = 'preferencial' | 'primeira_linha' | 'contextual';

export type EvidenceStatus = 'diretriz_estruturada' | 'sem_diretriz_estruturada';

/** RM-26.1: distingue se a diretriz estruturada é da CLASSE terapêutica (recomendação geral) ou específica da MOLÉCULA (ensaio clínico nomeado, ex.: "Estudo LIFE"). Só é definido quando `evidencia_status === 'diretriz_estruturada'`. */
export type EvidenceScope = 'classe' | 'molecula';

export interface ClinicalPriority {
  tier: ClinicalPriorityTier;
  motivo: string;
  fatores_considerados: string[];
  evidencia_status: EvidenceStatus;
  /** RM-26.1 — campo opcional, aditivo; ausência não afeta consumidores existentes. */
  evidencia_escopo?: EvidenceScope;
  /** RM-27 — papel clínico validado (governança) quando a classe possui auditoria específica; ausente = fallback conservador padrão do RM-26.1. */
  papel_clinico_validado?: import('./guideline-class-validation').ClinicalRole;
}

/** RM-26 — opção considerada, porém excluída (Nível 4), com motivo obrigatório. */
export interface ExcludedTherapeuticOption {
  molecula: string;
  classe_terapeutica: string;
  motivo: string;
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
  /** RM-26: opções consideradas e excluídas, com motivo — nunca ocultas, apenas separadas. */
  opcoes_excluidas?: ExcludedTherapeuticOption[];
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

// ============================================================
// RM-36 — Contrato estruturado de dose (espelha
// backend/src/modules/consulta/dto/consulta.dto.ts:
// UnidadeDose/FrequenciaDose/DoseEstruturadaDto). Texto livre nunca é
// mais a ÚNICA representação de uma dose calculada — `concentracao` e
// `posologia` em `PrescriptionItem` continuam existindo como texto
// human-readable PARA IMPRESSÃO do documento, mas `dose_estruturada` é a
// fonte de verdade validada e efetivamente persistida no backend.
// ============================================================

export type UnidadeDose =
  | 'mg' | 'mcg' | 'g' | 'mL' | 'gotas' | 'UI'
  | 'comprimido' | 'capsula' | 'sache' | 'ampola' | 'jato' | 'aplicacao';

export type FrequenciaDose =
  | '1x/dia' | '2x/dia' | '3x/dia' | '4x/dia'
  | 'a_cada_4h' | 'a_cada_6h' | 'a_cada_8h' | 'a_cada_12h'
  | 'dose_unica' | 'uso_continuo' | 'sos' | 'nao_diaria' | 'outro';

export interface DoseEstruturada {
  valor: number;
  unidade: UnidadeDose;
  frequencia: FrequenciaDose;
  /** Obrigatório quando frequencia é 'nao_diaria' ou 'outro' — nunca substitui os campos estruturados. */
  frequencia_detalhe?: string;
  via: string;
  dose_por_kg_dia?: number;
  dose_por_tomada?: number;
}

/** Item de medicamento como enviado a POST /api/prescricao — espelha `ItemMedicamentoDto` do backend. */
export interface MedicamentoPrescrito {
  molecula: string;
  dose: DoseEstruturada;
  duracao: string;
  /** Texto livre — SOMENTE instrução/orientação adicional, nunca a única representação da dose. */
  observacoes?: string;
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
  /**
   * Fonte de verdade estruturada da dose deste item — usada para
   * persistência no backend (`MedicamentoPrescrito.dose`) e para
   * qualquer cálculo/validação de segurança. `undefined` apenas para
   * itens adicionados manualmente pelo médico sem passar pelo motor de
   * recomendação (ver `PrescriptionPanel.tsx`) — nesse caso a
   * sincronização com o backend fica bloqueada até o médico preencher a
   * dose estruturada (nunca envia só o texto livre de `posologia`).
   */
  dose_estruturada?: DoseEstruturada;
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

/**
 * Estado de persistência no backend de um recurso clínico individual —
 * NUNCA "synced" sem uma resposta 2xx real do servidor. `idempotency_key`
 * é gerada uma única vez e reutilizada em todo retry da MESMA operação
 * (nunca duplica um registro clínico por reenvio).
 */
export interface ResourceSyncState {
  status: 'local' | 'syncing' | 'synced' | 'failed';
  attempts: number;
  error?: string;
  backend_id?: string;
  idempotency_key?: string;
  last_attempt_at?: string;
}

/** Estado de sincronização de todos os recursos clínicos de uma consulta. */
export interface ConsultationSync {
  consulta?: ResourceSyncState;
  diagnostico?: ResourceSyncState;
  prescricao?: ResourceSyncState;
  /** RM-53 (RM41-023): estado de sincronização do risco calculado. */
  risco?: ResourceSyncState;
}

/**
 * Estágio de carregamento do detalhe completo (RM-43) de uma consulta
 * hidratada do backend — rastreado por consulta, nunca um loading global
 * que bloquearia outras páginas.
 */
export type ConsultationDetailStatus = 'idle' | 'loading' | 'loaded' | 'failed';

/**
 * Prescrição REAL recuperada do backend (`GET /api/consulta/:id`) para
 * uma consulta histórica — RM-43. Contém apenas os campos que o backend
 * de fato persiste (`Prescricao.medicamentos`/`orientacoes`/
 * `validade_dias`). Deliberadamente NÃO é o mesmo tipo que `Prescription`
 * (usado pelo assistente de prescrição ATIVO): `Prescription` exige
 * `tipo`/`paciente`/`medico`/itens com `concentracao`/`forma_farmaceutica`/
 * `quantidade`/`posologia` — campos que o backend nunca armazenou para
 * uma prescrição já emitida. Forçar esses campos aqui exigiria
 * fabricá-los (nome padrão, string vazia, valor inferido), violando a
 * regra de nunca inventar dado clínico ausente. `medicamentos` já é a
 * fonte de verdade estruturada (mesma forma de `MedicamentoPrescrito`
 * enviada originalmente a `POST /api/prescricao`).
 */
export interface PrescricaoRecuperada {
  id: string;
  status: string;
  medicamentos: MedicamentoPrescrito[];
  orientacoes?: string;
  validade_dias: number;
  diagnostico_id?: string;
  criado_em: string;
}

/**
 * RM-53 (RM41-023): dados estruturados do diagnóstico selecionado —
 * `diagnostico_selecionado` (abaixo) é só uma label de exibição
 * (`"${nome} (${cid10})"`), nunca teve `cid`/`descricao`/`confianca`
 * separados para persistir no backend (`POST /api/diagnostico` exige CID e
 * descrição distintos). Campo adicional em vez de mudar o tipo do campo
 * existente — evita quebrar quem já lê `diagnostico_selecionado` como string.
 */
export interface DiagnosticoEstruturado {
  cid: string;
  descricao: string;
  /** 0–1 — mesma faixa exigida por `CriarDiagnosticoDto.confianca` no backend. */
  confianca?: number;
}

/**
 * RM-53 (RM41-023): risco clínico calculado (`avaliarRiscoClinico`) capturado
 * no momento em que o médico confirma a etapa de Inteligência — nunca
 * recalculado silenciosamente depois, nunca fabricado se ausente.
 */
export type RiscoCalculado = import('./clinical-risk-engine').AvaliacaoRiscoClinico;

export interface Consultation {
  id: string;
  status: 'anamnese' | 'diagnostico' | 'terapeutico' | 'prescricao' | 'concluida';
  paciente_nome: string;
  data: string;
  anamnese?: Anamnesis;
  apoio_diagnostico?: DiagnosticSupport;
  diagnostico_selecionado?: string;
  diagnostico_estruturado?: DiagnosticoEstruturado;
  risco_calculado?: RiscoCalculado;
  plano_terapeutico?: TherapeuticPlan;
  seguranca?: SafetyCheck;
  prescricao?: Prescription;
  prognostico?: PrognosisData;
  /** Estado real de persistência no backend — nunca inferido pelo estado local/UI. */
  sync?: ConsultationSync;
  /**
   * RM-43: resumo REAL vindo da listagem paginada (`GET /api/consultas`)
   * — `true` apenas quando o backend confirma ao menos uma prescrição
   * para esta consulta, `false` quando confirma que não há nenhuma,
   * `undefined` quando a consulta não veio do backend (criada nesta
   * sessão, ainda não hidratada) — os três estados são distintos e reais,
   * nenhum é inferido a partir da ausência de dado.
   */
  temPrescricaoNoBackend?: boolean;
  /**
   * Prescrições reais recuperadas do backend, carregadas sob demanda
   * (RM-43). Array — o modelo do backend permite mais de uma prescrição
   * por consulta; assumir "sempre uma só" seria uma pequena fabricação
   * estrutural. `undefined` até o detalhe ser carregado com sucesso (ver
   * `consultationDetailStatus`) — nunca `[]` como substituto de "ainda
   * não carregado".
   */
  prescricoesRecuperadas?: PrescricaoRecuperada[];
  /**
   * RM-53 (RM41-023): risk scores REAIS recuperados do backend
   * (`GET /api/consulta/:id`) — mesma lógica de `prescricoesRecuperadas`:
   * `undefined` até o detalhe ser carregado, nunca `[]` como substituto de
   * "ainda não carregado".
   */
  riscosRecuperados?: RiscoRecuperado[];
}

/** Risk score REAL recuperado do backend para uma consulta histórica — RM-53. */
export interface RiscoRecuperado {
  id: string;
  risco_global: string;
  score_global: number;
  alerta_vermelho: boolean;
  recomendacoes: string[];
  criado_em: string;
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
    lactante?: string;
    idoso?: string;
  };
  data_registro: string;
  data_ultima_atualizacao: string;
  versao_bula: string;
  fonte_regulatoria: 'ANVISA';
  registro_anvisa?: string;
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
