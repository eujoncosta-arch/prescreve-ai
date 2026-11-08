// ============================================================
// RM-107.1.1-E1 — Registro tipado de posologia e proveniência (`PosologiaRegistrada`)
//
// MÓDULO ISOLADO: não é usado por nenhuma tela, favorito, protocolo, backend ou motor. Prepara a futura integração
// (RM-107.1.1-D) sem alterar `DoseEstruturada`, valores numéricos, motores, catálogos ou políticas.
//
// Princípios:
//  - a dose numérica NUNCA viaja sozinha: ela acompanha sua origem e sua avaliação (ou a declaração de que NÃO foi avaliada);
//  - registro legado/sem metadata é `nao_avaliada` — nunca "sem alertas", nunca promovido;
//  - nenhum adaptador inventa fonte, aprovação ou validação; "regra clinicamente validada" só existe com fonte verificada
//    completa + aprovação formal (a mesma regra de `estadoDaRegra`), e é REBAIXADA quando a prova falta;
//  - informação ausente ⇒ 'desconhecido'/vazio + indicação explícita, nunca valor negativo presumido.
// ============================================================

import type { DoseEstruturada } from '../types';
import { mapUnidadeParaContrato, type FullDoseResult } from '../dose-calculator';
import { ROTULO_ESTADO_AVALIACAO, type EstadoAvaliacaoDose, type LimitacaoDose } from '../dose-estados';
import type { AprovacaoFormal, DoseResult } from './types';
import { aprovacaoCompleta } from './governance';
import {
  converterDoseComMetadata, frequenciaParaDto, normalizarMetadataAvaliacao,
  type EstadoApresentacao, type EstadoCalculoMetadata, type EstadoRegraMetadata, type MetadataAvaliacaoDose,
} from './compat';

export const VERSAO_REGISTRO = 'posologia-1' as const;

/** De onde a posologia veio. `desconhecida` só é produzida na normalização de dados que não declaram origem. */
export type OrigemDaPosologia =
  | 'contrato_dose' | 'dose_calculator' | 'recomendacao_texto' | 'digitada_pelo_prescritor'
  | 'protocolo_texto' | 'backend_legado' | 'importacao_localstorage' | 'desconhecida'
  /** RM-107.1.1-E2.3: valor PRÉ-PREENCHIDO pelo sistema (ver `origem_detalhe`) e comprovadamente não digitado pelo prescritor. Não é confirmação, cálculo avaliado nem validação. */
  | 'pre_preenchida_pelo_sistema';

export const ORIGENS_DA_POSOLOGIA: readonly OrigemDaPosologia[] = Object.freeze([
  'contrato_dose', 'dose_calculator', 'recomendacao_texto', 'digitada_pelo_prescritor', 'protocolo_texto', 'backend_legado', 'importacao_localstorage', 'desconhecida', 'pre_preenchida_pelo_sistema',
]);

/** Fonte técnica comprovada de uma dose pré-preenchida (só com origem `pre_preenchida_pelo_sistema`). */
export type OrigemDetalhe = 'catalogo_dose_habitual' | 'calculo_peso_simples' | 'sincronizada_com_concentracao';
export const ORIGENS_DETALHE: readonly OrigemDetalhe[] = Object.freeze(['catalogo_dose_habitual', 'calculo_peso_simples', 'sincronizada_com_concentracao']);

/** RM-107.1.1-E2.3: evento da trilha do registro (em memória). NÃO é auditoria institucional nem assinatura eletrônica; sem dados pessoais. */
export type TipoEventoPosologia = 'criacao' | 'recuperacao' | 'edicao' | 'dto_invalidado' | 'dto_indisponivel' | 'reconfirmacao' | 'reconfirmacao_invalidada' | 'finalizacao_local';
export interface EventoPosologia { tipo: TipoEventoPosologia; em: string; campo?: string; detalhe?: string }
const TIPOS_EVENTO: readonly TipoEventoPosologia[] = ['criacao', 'recuperacao', 'edicao', 'dto_invalidado', 'dto_indisponivel', 'reconfirmacao', 'reconfirmacao_invalidada', 'finalizacao_local'];

export type MotivoNaoAvaliada = 'texto_livre' | 'legado_sem_metadata' | 'editada_apos_calculo' | 'origem_desconhecida';
export const MOTIVOS_NAO_AVALIADA: readonly MotivoNaoAvaliada[] = Object.freeze(['texto_livre', 'legado_sem_metadata', 'editada_apos_calculo', 'origem_desconhecida']);

/** Avaliação preservada de um resultado do motor C (`dose-calculator`), com seus estados e limitações originais. */
export interface AvaliacaoMotorC {
  tipo: 'avaliada_motor_c';
  estado: EstadoAvaliacaoDose;
  estados_adicionais: EstadoAvaliacaoDose[];
  limitacoes: LimitacaoDose[];
  /** Alertas ORIGINAIS do motor C (texto; 🚨 = bloqueio, ⚠ = aviso). */
  alertas: string[];
  fonte_calculo: FullDoseResult['fonte'];
  limitado_por_dose_max: boolean;
  frequencia_indeterminada: boolean;
  possui_alerta_critico: boolean;
  /** Equivalência declarada com os estados do contrato (tabela central `MAPEAMENTO_ESTADOS_MOTOR_C`). */
  equivalente_no_contrato: { estado_calculo: EstadoCalculoMetadata; estado_regra: EstadoRegraMetadata; estado_apresentacao: EstadoApresentacao | null; equivalencia: Equivalencia };
  /** O motor C não possui fonte clínica por regra; ausência de fonte é um fato, não uma pendência resolvida. */
  fonte_clinica_registrada: false;
  homologacao_clinica: false;
}

export interface AvaliacaoContrato {
  tipo: 'avaliada';
  metadata: MetadataAvaliacaoDose;
  /** Prova da aprovação formal (responsável, cargo, data, parecer). Sem ela, "regra clinicamente validada" NÃO é mantida no registro. */
  aprovacao_formal?: AprovacaoFormal;
}

export interface AvaliacaoNaoAvaliada {
  tipo: 'nao_avaliada';
  motivo: MotivoNaoAvaliada;
  /** Sempre falso. */
  homologacao_clinica: false;
  /** Presente quando uma avaliação existiu e foi invalidada (ex.: edição posterior). Nunca é reutilizada como válida. */
  avaliacao_anterior?: AvaliacaoPersistida;
  /** Indicação explícita: ausência de metadata NÃO significa ausência de alertas. */
  ausencia_de_alerta_indica_seguranca: false;
}

export type AvaliacaoPersistida = AvaliacaoContrato | AvaliacaoMotorC | AvaliacaoNaoAvaliada;

/** Trilha de edição posterior (apenas tipos/estrutura; NÃO está conectada a `updateItem()` nem a nenhuma tela). */
export interface EdicaoManual { campo: string; de: string; para: string; em: string }

export interface PosologiaRegistrada {
  versao_registro: typeof VERSAO_REGISTRO;
  /** DTO numérico (inalterado). `null` quando não havia dose estruturada utilizável (ver `motivo_sem_dose`). */
  dose: DoseEstruturada | null;
  motivo_sem_dose?: string;
  /**
   * RM-107.1.1-E2.1: o texto/campos da posologia foram editados DEPOIS de o DTO ser registrado, então o DTO anterior NÃO representa a posologia atual.
   * `dose` passa a `null`; o DTO anterior fica aqui apenas como histórico e NUNCA deve ser exibido, enviado ou reutilizado como a dose atual.
   * Nada é recalculado nem reconstruído.
   */
  dose_divergente?: { dose_anterior: DoseEstruturada; campos: string[]; em: string };
  /**
   * RM-107.1.1-E2.2: reconfirmações EXPLÍCITAS do prescritor de que o DTO anterior corresponde ao texto atual. Histórico apenas;
   * reconfirmar reabilita o uso da estrutura numérica, NUNCA promove a avaliação (continua `nao_avaliada`) nem implica validação clínica.
   */
  reconfirmacoes_dose?: Array<{ em: string; dose: DoseEstruturada; campos_reconfirmados: string[] }>;
  texto_original?: string;
  origem: OrigemDaPosologia;
  /** Só com `pre_preenchida_pelo_sistema`. */
  origem_detalhe?: OrigemDetalhe;
  /** Trilha distinguível por tipo (criação, edição, invalidação, reconfirmação…). Em memória. */
  trilha?: EventoPosologia[];
  /** OBRIGATÓRIA. */
  avaliacao: AvaliacaoPersistida;
  /** Campos preenchidos por valor padrão (não por informação do prescritor/regra). */
  campos_padrao: string[];
  edicoes_manuais: EdicaoManual[];
  criado_em: string;
  /** Versão do motor/regra, quando conhecida. Nunca presumida. */
  motor_versao?: string;
  /** Sempre falso. */
  homologacao_clinica: false;
}

export interface OpcoesRegistro {
  criado_em?: string; motor_versao?: string; texto_original?: string; campos_padrao?: string[];
  /** Só é considerada em `registroDeDoseResult`: sem aprovação formal COMPLETA, "validada" é rebaixada. */
  aprovacao_formal?: AprovacaoFormal;
}

/** Nenhuma promoção indevida: "regra clinicamente validada" só permanece com aprovação formal demonstrável (a fonte verificada já é exigida pela metadata). */
function semPromocaoIndevida(m: MetadataAvaliacaoDose, aprovacao: AprovacaoFormal | undefined): MetadataAvaliacaoDose {
  if (m.estado_regra !== 'regra_clinicamente_validada' || aprovacaoCompleta(aprovacao)) return m;
  return {
    ...m, estado_regra: 'fonte_consultada_aguardando_revisao',
    limitacoes: [...m.limitacoes, 'Estado "regra clinicamente validada" rebaixado: aprovação formal demonstrável (responsável, cargo, data, parecer) não acompanha o registro.'],
    completude: { integral: false, ausentes: [...new Set([...m.completude.ausentes, 'aprovacao_formal_demonstravel'])] },
  };
}

// ── Mapeamento central de estados (motor C → contrato) ─────────────────────────
export type Equivalencia = 'exata' | 'parcial' | 'sem_equivalente_exato';

export interface EquivalenciaEstado {
  estado_calculo: EstadoCalculoMetadata;
  estado_regra: EstadoRegraMetadata;
  estado_apresentacao: EstadoApresentacao | null;
  equivalencia: Equivalencia;
  nota: string;
}

/**
 * TABELA ÚNICA entre `EstadoAvaliacaoDose` (motor C) e os estados do contrato. Onde a semântica difere (o motor C CALCULOU
 * uma dose pelo ramo adulto, o contrato NÃO calcularia), a equivalência é 'sem_equivalente_exato' e o estado do contrato fica
 * 'desconhecido' — nunca se afirma uma equivalência que não existe. O estado da regra do motor C é sempre `regra_sem_fonte`
 * (o catálogo não tem fonte), fato que NÃO é promovido nem inferido como validado.
 */
export const MAPEAMENTO_ESTADOS_MOTOR_C: Readonly<Record<EstadoAvaliacaoDose, EquivalenciaEstado>> = Object.freeze({
  calculo_realizado_regra_nao_validada: { estado_calculo: 'calculo_realizado', estado_regra: 'regra_sem_fonte', estado_apresentacao: null, equivalencia: 'exata', nota: 'cálculo concluído com regra cadastrada sem fonte' },
  dados_insuficientes: { estado_calculo: 'dados_insuficientes', estado_regra: 'regra_sem_fonte', estado_apresentacao: null, equivalencia: 'exata', nota: 'frequência indeterminada ou altura ausente' },
  dados_invalidos: { estado_calculo: 'entrada_invalida', estado_regra: 'regra_sem_fonte', estado_apresentacao: null, equivalencia: 'exata', nota: 'idade/peso/altura inválidos (o valor numérico do motor C não é confiável)' },
  apresentacao_nao_interpretada: { estado_calculo: 'desconhecido', estado_regra: 'regra_sem_fonte', estado_apresentacao: 'nao_convertida', equivalencia: 'parcial', nota: 'o motor C calculou a dose; só a apresentação não foi interpretada' },
  regra_incompativel: { estado_calculo: 'desconhecido', estado_regra: 'regra_sem_fonte', estado_apresentacao: null, equivalencia: 'sem_equivalente_exato', nota: 'regra pediátrica incompatível; o motor C seguiu o ramo adulto (o contrato não calcularia)' },
  regra_inexistente: { estado_calculo: 'desconhecido', estado_regra: 'regra_sem_fonte', estado_apresentacao: null, equivalencia: 'sem_equivalente_exato', nota: 'sem regra pediátrica; o motor C seguiu o ramo adulto (o contrato não calcularia)' },
  avaliacao_especifica_necessaria: { estado_calculo: 'desconhecido', estado_regra: 'regra_sem_fonte', estado_apresentacao: null, equivalencia: 'sem_equivalente_exato', nota: 'regra pediátrica cadastrada não utilizada (adolescente); informativo' },
  bloqueado_por_seguranca: { estado_calculo: 'calculo_bloqueado', estado_regra: 'regra_sem_fonte', estado_apresentacao: null, equivalencia: 'parcial', nota: 'bloqueio 🚨 já existente no motor C' },
});

const ESTADOS_MOTOR_C: ReadonlySet<string> = new Set(Object.keys(ROTULO_ESTADO_AVALIACAO));
const ehEstadoC = (x: unknown): x is EstadoAvaliacaoDose => typeof x === 'string' && ESTADOS_MOTOR_C.has(x);

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const agora = (o?: OpcoesRegistro) => o?.criado_em ?? new Date().toISOString();
const base = (o: OpcoesRegistro | undefined) => ({
  versao_registro: VERSAO_REGISTRO,
  ...(o?.texto_original !== undefined ? { texto_original: o.texto_original } : {}),
  campos_padrao: [...(o?.campos_padrao ?? [])],
  edicoes_manuais: [] as EdicaoManual[],
  criado_em: agora(o),
  ...(o?.motor_versao !== undefined ? { motor_versao: o.motor_versao } : {}),
  homologacao_clinica: false as const,
});

// ── Adaptadores ────────────────────────────────────────────────────────────────
/**
 * Registro de posologia SEM avaliação (texto livre, protocolo/favorito legado, backend sem metadata, importação, digitada).
 * É o ÚNICO estado possível para origens que não têm resultado de cálculo: nunca promovido, nunca reconstruído.
 */
export function registroNaoAvaliado(args: { origem: OrigemDaPosologia; motivo: MotivoNaoAvaliada; dose?: DoseEstruturada | null } & OpcoesRegistro): PosologiaRegistrada {
  if (!ORIGENS_DA_POSOLOGIA.includes(args.origem)) throw new TypeError(`origem inválida: ${String(args.origem)}`);
  if (!MOTIVOS_NAO_AVALIADA.includes(args.motivo)) throw new TypeError(`motivo inválido: ${String(args.motivo)}`);
  return {
    ...base(args), dose: args.dose ? clone(args.dose) : null, origem: args.origem,
    ...(args.dose ? {} : { motivo_sem_dose: 'dose estruturada não disponível nesta origem' }),
    avaliacao: { tipo: 'nao_avaliada', motivo: args.motivo, homologacao_clinica: false, ausencia_de_alerta_indica_seguranca: false },
  };
}

/** `DoseResult` (contrato) → registro. A metadata é a da RM-107.1.1-C (rebaixa "validada" sem prova). O resultado de origem não é alterado. */
export function registroDeDoseResult(r: DoseResult, ctx: { via: string; peso_kg?: number }, opcoes?: OpcoesRegistro): PosologiaRegistrada {
  const c = converterDoseComMetadata(r, ctx);
  return {
    ...base(opcoes), dose: c.ok ? clone(c.dose) : null, ...(c.ok ? {} : { motivo_sem_dose: c.motivo }), origem: 'contrato_dose',
    avaliacao: { tipo: 'avaliada', metadata: semPromocaoIndevida(clone(c.avaliacao), opcoes?.aprovacao_formal), ...(opcoes?.aprovacao_formal ? { aprovacao_formal: clone(opcoes.aprovacao_formal) } : {}) },
  };
}

/** `FullDoseResult` (motor C) → registro, preservando estado, estados adicionais, limitações e alertas originais. Nenhum valor é recalculado. */
export function registroDeFullDoseResult(r: FullDoseResult, ctx: { via: string }, opcoes?: OpcoesRegistro): PosologiaRegistrada {
  const estado: EstadoAvaliacaoDose | undefined = ehEstadoC(r?.estado_avaliacao) ? r.estado_avaliacao : undefined;
  const alertas = Array.isArray(r?.alertas) ? [...r.alertas] : [];
  const criticos = alertas.some(a => typeof a === 'string' && a.startsWith('🚨'));
  // Resultado do motor C sem estado reconhecível ⇒ NÃO é tratado como avaliado.
  if (!estado) {
    const rn = registroNaoAvaliado({ origem: 'dose_calculator', motivo: 'legado_sem_metadata', ...opcoes, texto_original: opcoes?.texto_original ?? r?.posologia_sugerida });
    return { ...rn, motivo_sem_dose: 'resultado do motor C sem estado de avaliação reconhecível' };
  }
  const motivos: string[] = [];
  let dose: DoseEstruturada | null = null;
  if (criticos) motivos.push('resultado com bloqueio de segurança (🚨) no motor C');
  if (r.frequencia_indeterminada || !(r.tomadas_dia > 0)) motivos.push('frequência indeterminada');
  const unidade = mapUnidadeParaContrato(String(r.dose_unidade ?? ''));
  if (!unidade) motivos.push(`unidade "${String(r.dose_unidade)}" sem equivalente em UnidadeDose`);
  if (!(typeof r.dose_por_tomada === 'number' && Number.isFinite(r.dose_por_tomada) && r.dose_por_tomada > 0)) motivos.push('dose por tomada ausente ou não positiva');
  if (!ctx.via || !ctx.via.trim()) motivos.push('via não informada');
  if (motivos.length === 0 && unidade) {
    const f = frequenciaParaDto({ tipo: 'vezes_dia', vezes: r.tomadas_dia });
    dose = { valor: r.dose_por_tomada, unidade, frequencia: f.frequencia, via: ctx.via, dose_por_tomada: r.dose_por_tomada, ...(f.frequencia_detalhe ? { frequencia_detalhe: f.frequencia_detalhe } : {}) };
  }
  const eq = MAPEAMENTO_ESTADOS_MOTOR_C[estado];
  const avaliacao: AvaliacaoMotorC = {
    tipo: 'avaliada_motor_c', estado, estados_adicionais: (Array.isArray(r.estados_adicionais) ? r.estados_adicionais : []).filter(ehEstadoC), limitacoes: clone(Array.isArray(r.limitacoes) ? r.limitacoes : []),
    alertas, fonte_calculo: r.fonte, limitado_por_dose_max: !!r.limitado_por_dose_max, frequencia_indeterminada: !!r.frequencia_indeterminada, possui_alerta_critico: criticos,
    equivalente_no_contrato: { estado_calculo: eq.estado_calculo, estado_regra: eq.estado_regra, estado_apresentacao: eq.estado_apresentacao, equivalencia: eq.equivalencia },
    fonte_clinica_registrada: false, homologacao_clinica: false,
  };
  return {
    ...base({ ...opcoes, texto_original: opcoes?.texto_original ?? r.posologia_sugerida }), dose, ...(dose ? {} : { motivo_sem_dose: motivos.join('; ') }), origem: 'dose_calculator', avaliacao,
  };
}

export interface DtoNumericoComMetadata {
  dose: DoseEstruturada | null;
  /** Marca explícita: a metadata EXISTE e PRECISA acompanhar este DTO. */
  metadata_necessaria: true;
  origem: OrigemDaPosologia;
  avaliacao: AvaliacaoPersistida;
  motivo_sem_dose?: string;
  aviso: string;
}

/**
 * Extrai o DTO numérico do registro SEM esconder a metadata: devolve a avaliação junto e a marca `metadata_necessaria: true`.
 * Não há forma de obter a dose por aqui sem receber a avaliação.
 */
export function somenteDtoNumerico(reg: PosologiaRegistrada): DtoNumericoComMetadata {
  return {
    dose: reg.dose ? clone(reg.dose) : null, metadata_necessaria: true, origem: reg.origem, avaliacao: clone(reg.avaliacao),
    ...(reg.motivo_sem_dose !== undefined ? { motivo_sem_dose: reg.motivo_sem_dose } : {}),
    aviso: 'Este é apenas o DTO numérico. A avaliação (estado, alertas, limitações, origem) NÃO pode ser omitida ao exibir, persistir ou reaplicar a dose. Ausência de alerta não indica segurança.',
  };
}

// ── Estados do registro (central) ──────────────────────────────────────────────
export interface EstadosDoRegistro { nivel: 'avaliada_contrato' | 'avaliada_motor_c' | 'nao_avaliada'; estado_calculo: EstadoCalculoMetadata; estado_regra: EstadoRegraMetadata; estado_apresentacao: EstadoApresentacao | 'nao_avaliada' }

/** Estados do registro expressos no vocabulário do contrato. 'nao_avaliada' ⇒ tudo 'desconhecido' (nunca "sem problemas"). */
export function estadosDoRegistro(reg: PosologiaRegistrada): EstadosDoRegistro {
  const a = reg.avaliacao;
  if (a.tipo === 'avaliada') return { nivel: 'avaliada_contrato', estado_calculo: a.metadata.estado_calculo, estado_regra: a.metadata.estado_regra, estado_apresentacao: a.metadata.estado_apresentacao };
  if (a.tipo === 'avaliada_motor_c') {
    const e = a.equivalente_no_contrato;
    return { nivel: 'avaliada_motor_c', estado_calculo: e.estado_calculo, estado_regra: e.estado_regra, estado_apresentacao: e.estado_apresentacao ?? 'nao_avaliada' };
  }
  return { nivel: 'nao_avaliada', estado_calculo: 'desconhecido', estado_regra: 'desconhecido', estado_apresentacao: 'nao_avaliada' };
}

// ── Edição posterior (função PURA; não conectada a nenhuma tela) ────────────────
/** Devolve um NOVO registro com a edição anotada; a avaliação vigente passa a `nao_avaliada('editada_apos_calculo')` e a anterior é guardada. Não recalcula nem altera a dose. */
export function comEdicaoManual(reg: PosologiaRegistrada, edicao: EdicaoManual): PosologiaRegistrada {
  const anterior = reg.avaliacao.tipo === 'nao_avaliada' ? reg.avaliacao.avaliacao_anterior : reg.avaliacao;
  return {
    ...clone(reg), edicoes_manuais: [...clone(reg.edicoes_manuais), { ...edicao }],
    avaliacao: { tipo: 'nao_avaliada', motivo: 'editada_apos_calculo', homologacao_clinica: false, ausencia_de_alerta_indica_seguranca: false, ...(anterior ? { avaliacao_anterior: clone(anterior) } : {}) },
  };
}

// ── Normalização / versionamento (recuperação tolerante; nunca promove) ─────────
const dtoValido = (d: unknown): d is DoseEstruturada => !!d && typeof d === 'object' && typeof (d as DoseEstruturada).valor === 'number' && typeof (d as DoseEstruturada).unidade === 'string' && typeof (d as DoseEstruturada).frequencia === 'string' && typeof (d as DoseEstruturada).via === 'string';

function normalizarAvaliacao(a: unknown): AvaliacaoPersistida {
  const o = (a && typeof a === 'object' ? a : undefined) as Record<string, unknown> | undefined;
  const nao = (motivo: MotivoNaoAvaliada): AvaliacaoNaoAvaliada => ({ tipo: 'nao_avaliada', motivo, homologacao_clinica: false, ausencia_de_alerta_indica_seguranca: false });
  if (!o) return nao('legado_sem_metadata');
  if (o.tipo === 'avaliada') {
    const ap = o.aprovacao_formal && typeof o.aprovacao_formal === 'object' ? (clone(o.aprovacao_formal) as AprovacaoFormal) : undefined;
    return { tipo: 'avaliada', metadata: semPromocaoIndevida(normalizarMetadataAvaliacao(o.metadata), ap), ...(ap ? { aprovacao_formal: ap } : {}) };
  }
  if (o.tipo === 'avaliada_motor_c') {
    if (!ehEstadoC(o.estado)) return nao('origem_desconhecida');
    const eq = MAPEAMENTO_ESTADOS_MOTOR_C[o.estado];
    const alertas = Array.isArray(o.alertas) ? (o.alertas as unknown[]).filter((x): x is string => typeof x === 'string') : [];
    return {
      tipo: 'avaliada_motor_c', estado: o.estado, estados_adicionais: Array.isArray(o.estados_adicionais) ? (o.estados_adicionais as unknown[]).filter(ehEstadoC) : [],
      limitacoes: Array.isArray(o.limitacoes) ? clone(o.limitacoes as LimitacaoDose[]) : [], alertas,
      fonte_calculo: (typeof o.fonte_calculo === 'string' ? o.fonte_calculo : 'adulto_fixo') as FullDoseResult['fonte'],
      limitado_por_dose_max: o.limitado_por_dose_max === true, frequencia_indeterminada: o.frequencia_indeterminada === true,
      possui_alerta_critico: alertas.some(x => x.startsWith('🚨')),
      equivalente_no_contrato: { estado_calculo: eq.estado_calculo, estado_regra: eq.estado_regra, estado_apresentacao: eq.estado_apresentacao, equivalencia: eq.equivalencia },
      fonte_clinica_registrada: false, homologacao_clinica: false,
    };
  }
  if (o.tipo === 'nao_avaliada') {
    const motivo = MOTIVOS_NAO_AVALIADA.includes(o.motivo as MotivoNaoAvaliada) ? (o.motivo as MotivoNaoAvaliada) : 'origem_desconhecida';
    const ant = o.avaliacao_anterior ? normalizarAvaliacao(o.avaliacao_anterior) : undefined;
    return { ...nao(motivo), ...(ant ? { avaliacao_anterior: ant } : {}) };
  }
  return nao('origem_desconhecida');
}

/**
 * Normaliza um registro recebido (armazenamento, outra versão, dado antigo). Nada é inventado nem promovido:
 * versão desconhecida, avaliação ausente ou inválida ⇒ `nao_avaliada`; "validada" sem prova é rebaixada pela normalização da metadata.
 */
export function normalizarRegistro(raw: unknown): PosologiaRegistrada {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const versaoConhecida = o.versao_registro === VERSAO_REGISTRO;
  const origem: OrigemDaPosologia = ORIGENS_DA_POSOLOGIA.includes(o.origem as OrigemDaPosologia) ? (o.origem as OrigemDaPosologia) : 'desconhecida';
  const dv = o.dose_divergente as { dose_anterior?: unknown; campos?: unknown; em?: unknown } | undefined;
  const divergente = dv && typeof dv === 'object' && dtoValido(dv.dose_anterior)
    ? { dose_anterior: clone(dv.dose_anterior), campos: Array.isArray(dv.campos) ? (dv.campos as unknown[]).filter((x): x is string => typeof x === 'string') : [], em: typeof dv.em === 'string' ? dv.em : '' }
    : undefined;
  const reconfirmacoes = Array.isArray(o.reconfirmacoes_dose)
    ? (o.reconfirmacoes_dose as Array<{ em?: unknown; dose?: unknown; campos_reconfirmados?: unknown }>)
      .filter(r => !!r && typeof r === 'object' && dtoValido(r.dose))
      .map(r => ({ em: typeof r.em === 'string' ? r.em : '', dose: clone(r.dose as DoseEstruturada), campos_reconfirmados: Array.isArray(r.campos_reconfirmados) ? (r.campos_reconfirmados as unknown[]).filter((x): x is string => typeof x === 'string') : [] }))
    : [];
  const trilha: EventoPosologia[] = Array.isArray(o.trilha)
    ? (o.trilha as Array<Record<string, unknown>>)
      .filter(e => !!e && typeof e === 'object' && TIPOS_EVENTO.includes(e.tipo as TipoEventoPosologia))
      .map(e => ({ tipo: e.tipo as TipoEventoPosologia, em: typeof e.em === 'string' ? e.em : '', ...(typeof e.campo === 'string' ? { campo: e.campo } : {}), ...(typeof e.detalhe === 'string' ? { detalhe: e.detalhe } : {}) }))
    : [];
  // DTO divergente nunca é reaproveitado como dose atual, mesmo que o registro persistido traga `dose` preenchido.
  const dose = !divergente && dtoValido(o.dose) ? clone(o.dose) : null;
  const avaliacao: AvaliacaoPersistida = versaoConhecida ? normalizarAvaliacao(o.avaliacao) : { tipo: 'nao_avaliada', motivo: 'legado_sem_metadata', homologacao_clinica: false, ausencia_de_alerta_indica_seguranca: false };
  const edicoes = Array.isArray(o.edicoes_manuais) ? (o.edicoes_manuais as unknown[]).filter((e): e is EdicaoManual => !!e && typeof e === 'object' && typeof (e as EdicaoManual).campo === 'string').map(e => ({ campo: e.campo, de: String(e.de), para: String(e.para), em: String(e.em) })) : [];
  return {
    versao_registro: VERSAO_REGISTRO, dose, ...(dose ? {} : { motivo_sem_dose: typeof o.motivo_sem_dose === 'string' ? o.motivo_sem_dose : 'dose estruturada não disponível' }),
    ...(divergente ? { dose_divergente: divergente } : {}),
    ...(reconfirmacoes.length > 0 ? { reconfirmacoes_dose: reconfirmacoes } : {}),
    ...(origem === 'pre_preenchida_pelo_sistema' && ORIGENS_DETALHE.includes(o.origem_detalhe as OrigemDetalhe) ? { origem_detalhe: o.origem_detalhe as OrigemDetalhe } : {}),
    ...(trilha.length > 0 ? { trilha } : {}),
    ...(typeof o.texto_original === 'string' ? { texto_original: o.texto_original } : {}), origem, avaliacao,
    campos_padrao: Array.isArray(o.campos_padrao) ? (o.campos_padrao as unknown[]).filter((x): x is string => typeof x === 'string') : [],
    edicoes_manuais: edicoes, criado_em: typeof o.criado_em === 'string' ? o.criado_em : '', ...(typeof o.motor_versao === 'string' ? { motor_versao: o.motor_versao } : {}),
    homologacao_clinica: false,
  };
}
