// ============================================================
// RM-107.2 — Contrato unificado de dose (REPRESENTAÇÃO, não decisão clínica)
//
// Este módulo NÃO é autoridade clínica e NÃO substitui nenhum motor (dosing-engine, pediatric-engine,
// dose-calculator). Unificar a representação ≠ escolher valores: regras divergentes permanecem separadas,
// com a origem preservada. Nenhuma regra importada é "clinicamente validada": só uma regra com aprovação
// formal (responsável + data + fonte verificada completa) pode adquirir esse estado.
// ============================================================

export type ViaAdministracao = string; // preservada como cadastrada nos motores (texto); a normalização depende de decisão

export type UnidadeMassa = 'mg' | 'mcg' | 'g';
export type UnidadeDoseBase = UnidadeMassa | 'UI' | 'mL' | 'gotas' | 'jato' | 'outra';

/** Faixa numérica com limites explícitos (inclusivo/exclusivo declarado, sem convenção implícita). */
export interface Faixa {
  min?: number; min_inclusivo?: boolean;
  max?: number; max_inclusivo?: boolean;
}

export type BaseTemporal = 'por_tomada' | 'por_dia' | 'indeterminada';
export type TipoCalculo = 'fixa' | 'por_kg' | 'por_m2' | 'por_faixa' | 'nao_suportado';
export type MotorOrigem = 'A:dosing-engine' | 'B:pediatric-engine' | 'C:dose-calculator(catalogo)' | 'sintetica';

export interface Quantidade { valor: number; unidade: string }

// ── A. DoseRequest (informado pelo prescritor / sistema) ─────────────────────
export interface DoseRequest {
  contrato_versao: 'dose-1';
  identidade: {
    entidade_id: string;               // identidade por ID (RM-105.1); nome/marca não identifica
    apresentacao_id?: string;          // apresentação comercial
    principio_ativo?: string;
  };
  idade?: { valor: number; unidade: 'dias' | 'meses' | 'anos' };   // age-contract RM-105.2.2 (canônico em dias)
  idade_gestacional_semanas?: number;
  idade_pos_natal_dias?: number;
  idade_pos_menstrual_semanas?: number;
  peso_atual_kg?: number;
  peso_ao_nascer_g?: number;
  altura_cm?: number;
  contexto: {
    indicacao?: string;
    via?: ViaAdministracao;
    forma_farmaceutica?: string;
    concentracao?: { massa: number; unidade_massa: UnidadeMassa; por: number; unidade_por: 'mL' | 'comprimido' | 'capsula' | 'dose' | 'gota'; substancia?: string };
  };
  funcao_renal?: { tfg_ml_min?: number; metodo?: string };
  funcao_hepatica?: { classificacao?: string; sistema?: string };
  dados_complementares?: Record<string, unknown>;
  /** Confirmações explícitas do prescritor (nunca assumidas). */
  confirmacoes?: Array<{ campo: string; valor: string }>;
}

// ── Governança (fonte e validação) ───────────────────────────────────────────
export interface FonteDose {
  instituicao?: string; documento?: string; url_ou_identificador?: string; versao?: string; data?: string;
  secao?: string; trecho?: string; populacao?: string; indicacao?: string; via?: string; limitacoes_da_fonte?: string[];
  /** 'candidata' = referência localizada e não conferida; 'verificada' = documento aberto com versão, seção e trecho. */
  estado_de_revisao: 'candidata' | 'verificada';
  /** Texto original da referência no motor de origem (preservado sem interpretação). */
  referencia_original?: string;
}
export interface AprovacaoFormal { responsavel: string; cargo: 'medico' | 'farmaceutico_clinico'; data: string; parecer: string }
export interface Governanca {
  /** Estado DECLARADO; o estado efetivo é derivado por `estadoDaRegra` (rebaixa se faltar prova). */
  status_declarado: 'sem_fonte' | 'fonte_candidata' | 'fonte_consultada_aguardando_revisao' | 'clinicamente_validada';
  fontes: FonteDose[];
  aprovacao?: AprovacaoFormal;
  limitacoes: string[];
}
export type EstadoRegra = 'regra_sem_fonte' | 'fonte_candidata' | 'fonte_consultada_aguardando_revisao' | 'regra_clinicamente_validada';

// ── B. DoseRule ──────────────────────────────────────────────────────────────
export type FrequenciaEstruturada =
  | { tipo: 'intervalo_h'; horas: number }
  | { tipo: 'vezes_dia'; vezes: number }
  | { tipo: 'dose_unica' }
  | { tipo: 'variavel'; faixa_vezes_dia?: [number, number]; texto: string }
  | { tipo: 'nao_estruturada'; texto: string; divisoes?: number };

export interface FaixaDoseFixa { eixo: 'kg' | 'meses' | 'anos'; min_exclusivo: number; max_inclusivo?: number; dose_mg: number }

export interface AjusteTexto { estado: 'texto_informativo' | 'flag_sem_parametros'; texto?: string }

export interface Restricao { tipo: 'contraindicacao' | 'idade_minima' | 'texto_informativo'; mensagem: string; bloqueia: boolean; idade_dias_exclusivo?: number; populacoes?: string[] }

export interface DoseRule {
  regra_id: string;
  origem: { motor: MotorOrigem; referencia: string };          // ex.: 'amoxicilina#2'
  entidade_id: string | null;                                   // null = vínculo com o catálogo NÃO resolvido
  vinculo_entidade: 'id_igual' | 'alias_de_auditoria' | 'nao_resolvido' | 'sintetico';
  molecula_original: string;
  indicacao?: string;
  populacao_rotulo?: string;                                    // rótulo do motor de origem (NÃO critério clínico)
  faixa_idade_dias?: Faixa;                                     // undefined = escopo etário NÃO declarado
  faixa_peso_kg?: Faixa;
  posologia: {
    tipo_calculo: TipoCalculo;
    valor?: number;                                             // numérico SOMENTE quando o dado original é numérico puro
    valor_original?: string;                                    // texto original preservado
    unidade_massa?: UnidadeDoseBase;                            // unidade do numerador (mg, mcg, g, UI…)
    unidade_original: string;                                   // unidade/cálculo originais, sem alteração
    base_temporal: BaseTemporal;
    substancia_referencia?: string;
    faixas_dose?: FaixaDoseFixa[];
    formula_bsa?: 'mosteller' | 'dubois';
    frequencia: FrequenciaEstruturada;
    duracao_original?: string;
  };
  limites: {
    max_por_tomada?: Quantidade; max_por_dia?: Quantidade; max_por_kg_dia?: Quantidade; max_absoluto?: Quantidade; min_por_tomada?: Quantidade;
    limite_texto_original?: string;                             // máximo cadastrado como texto (não interpretado)
  };
  forma_farmaceutica?: string[];
  via?: ViaAdministracao;
  apresentacoes_compativeis?: string[];                         // ids de apresentação (A: formulacao_ids); undefined = não declarado
  apresentacoes_texto?: string[];                               // apresentações em texto (B, C), não casáveis por id
  ajustes: { renal?: AjusteTexto; hepatico?: AjusteTexto };
  restricoes: Restricao[];
  /** Dados que a regra exige para calcular (ex.: IG e idade pós-natal em regra neonatal). Ausentes ⇒ cálculo não realizado. */
  dados_obrigatorios?: Array<'idade' | 'peso_atual_kg' | 'altura_cm' | 'indicacao' | 'apresentacao_id' | 'idade_gestacional_semanas' | 'idade_pos_natal_dias' | 'idade_pos_menstrual_semanas' | 'peso_ao_nascer_g' | 'funcao_renal' | 'funcao_hepatica'>;
  governanca: Governanca;
  /** Pendências técnicas detectadas pelo adaptador (códigos estáveis; nenhuma é resolvida). */
  pendencias: string[];
  /** Motivos pelos quais a regra é incompatível/incompleta para cálculo (vazio = calculável tecnicamente). */
  incompatibilidades: string[];
}

// ── C. DoseResult ────────────────────────────────────────────────────────────
export type EstadoCalculo =
  | 'calculo_realizado' | 'dados_insuficientes' | 'entrada_invalida' | 'regra_inexistente'
  | 'regra_incompativel' | 'multiplas_regras_candidatas' | 'calculo_bloqueado';

export interface AlertaDose { codigo: string; severidade: 'info' | 'atencao' | 'alerta' | 'critico'; mensagem: string; bloqueia: boolean }
export interface DadoAusente { campo: string; necessario_para: string }

export interface DoseResult {
  contrato_versao: 'dose-1';
  estado_calculo: EstadoCalculo;
  /** Estado da regra aplicada (ou de todas as candidatas quando não há uma única). `null` quando não há regra. */
  estado_regra: EstadoRegra | null;
  /** Nunca "validada" sem estado_regra = regra_clinicamente_validada. */
  rotulo_apresentacao: 'calculo_com_regra_nao_validada' | 'calculo_com_regra_validada' | 'nao_calculado';
  homologacao_clinica: false;
  dose_por_administracao?: Quantidade;
  dose_diaria?: Quantidade;
  base_temporal?: BaseTemporal;
  frequencia?: FrequenciaEstruturada;
  quantidade_por_administracao?: { valor: number; unidade: string; arredondamento_aplicado: null };
  regra_aplicada?: { regra_id: string; origem: DoseRule['origem'] };
  regras_candidatas: Array<{ regra_id: string; origem: DoseRule['origem']; excluida: boolean; motivo?: string }>;
  fonte_utilizada: FonteDose[];
  limites_excedidos: Array<{ limite: string; valor_limite: Quantidade; valor_calculado: Quantidade }>;
  alertas: AlertaDose[];
  bloqueios: AlertaDose[];
  dados_ausentes: DadoAusente[];
  limitacoes: string[];
  passo_a_passo: string[];
}
