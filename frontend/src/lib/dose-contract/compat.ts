// RM-107.2 — Compatibilidade com `DoseEstruturada` (front/DTO do backend) e com protocolos legados.
// Não migra nada silenciosamente: itens antigos são apenas ENVELOPADOS (sem mutação) com a marca de que não foram avaliados.
import type { DoseEstruturada, FrequenciaDose, UnidadeDose } from '../types';
import type { AlertaDose, DadoAusente, DoseResult, EstadoCalculo, EstadoRegra, FonteDose, FrequenciaEstruturada } from './types';
import { camposFaltantesFonte } from './governance';

const AVISO_LEGADO = 'LEGADO: este resultado contém só o DTO. A metadata de avaliação (estado da regra, alertas, limites excedidos, limitações, origem) NÃO foi preservada. Use converterDoseComMetadata.';

/** @deprecated LEGADO — ver `paraDoseEstruturada`. O marcador `metadata_preservada: false` é sempre falso por contrato. */
export type ResultadoConversao =
  | { ok: true; dose: DoseEstruturada; metadata_preservada: false; aviso_legado: string }
  | { ok: false; motivo: string; metadata_preservada: false; aviso_legado: string };

const UNIDADES: Record<string, UnidadeDose> = { mg: 'mg', mcg: 'mcg', g: 'g', mL: 'mL', UI: 'UI', gotas: 'gotas' };

export function frequenciaParaDto(f: FrequenciaEstruturada): { frequencia: FrequenciaDose; frequencia_detalhe?: string } {
  if (f.tipo === 'dose_unica') return { frequencia: 'dose_unica' };
  const vezes = f.tipo === 'vezes_dia' ? f.vezes : f.tipo === 'intervalo_h' ? 24 / f.horas : undefined;
  if (f.tipo === 'intervalo_h') {
    const m: Record<number, FrequenciaDose> = { 4: 'a_cada_4h', 6: 'a_cada_6h', 8: 'a_cada_8h', 12: 'a_cada_12h', 24: '1x/dia' };
    if (m[f.horas]) return { frequencia: m[f.horas] };
  }
  if (vezes === 1) return { frequencia: '1x/dia' };
  if (vezes === 2) return { frequencia: '2x/dia' };
  if (vezes === 3) return { frequencia: '3x/dia' };
  if (vezes === 4) return { frequencia: '4x/dia' };
  const texto = f.tipo === 'variavel' || f.tipo === 'nao_estruturada' ? f.texto : f.tipo === 'intervalo_h' ? `a cada ${f.horas} h` : `${vezes ?? '?'}x/dia`;
  return { frequencia: 'outro', frequencia_detalhe: texto };
}

type ConversaoDto = { ok: true; dose: DoseEstruturada } | { ok: false; motivo: string };

/** Conversão NUMÉRICA para o DTO (sem metadata). Interna: o valor, a unidade, a frequência e a via são os de sempre. */
function converterDto(r: DoseResult, ctx: { via: string; peso_kg?: number }): ConversaoDto {
  if (r.estado_calculo !== 'calculo_realizado') return { ok: false, motivo: `estado_calculo=${r.estado_calculo}: não persistível como dose estruturada` };
  if (!r.dose_por_administracao || !r.frequencia) return { ok: false, motivo: 'resultado sem dose por administração ou frequência' };
  const unidade = UNIDADES[r.dose_por_administracao.unidade];
  if (!unidade) return { ok: false, motivo: `unidade "${r.dose_por_administracao.unidade}" sem equivalente em UnidadeDose` };
  if (!ctx.via || !ctx.via.trim()) return { ok: false, motivo: 'via não informada' };
  const f = frequenciaParaDto(r.frequencia);
  const dose: DoseEstruturada = { valor: r.dose_por_administracao.valor, unidade, frequencia: f.frequencia, via: ctx.via, dose_por_tomada: r.dose_por_administracao.valor, ...(f.frequencia_detalhe ? { frequencia_detalhe: f.frequencia_detalhe } : {}) };
  if (ctx.peso_kg && ctx.peso_kg > 0 && r.dose_diaria) dose.dose_por_kg_dia = r.dose_diaria.valor / ctx.peso_kg;
  return { ok: true, dose };
}

/**
 * @deprecated LEGADO (RM-107.1.1-C) — NÃO usar em novas integrações.
 * Devolve SOMENTE o DTO: descarta estado da regra, alertas (inclusive críticos), limites excedidos, limitações, origem e
 * `homologacao_clinica`. Um DTO obtido por aqui NÃO distingue regra sem fonte de regra validada e NÃO é um caminho seguro.
 * Use `converterDoseComMetadata`, que devolve o DTO acompanhado da metadata de avaliação. Mantida apenas por compatibilidade
 * (nenhum consumidor real no código; os testes de caracterização a exercitam).
 */
export function paraDoseEstruturada(r: DoseResult, ctx: { via: string; peso_kg?: number }): ResultadoConversao {
  const c = converterDto(r, ctx);
  return { ...c, metadata_preservada: false, aviso_legado: AVISO_LEGADO };
}

export interface RegistroLegado<T> { origem: 'legado'; estado_avaliacao: 'nao_avaliado_pelo_contrato'; item: Readonly<T> }

/** Envelopa um item antigo (RxItem/protocolo/favorito) SEM alterá-lo e SEM recalcular a dose. */
export function envelopeLegado<T extends object>(item: T): RegistroLegado<T> {
  return { origem: 'legado', estado_avaliacao: 'nao_avaliado_pelo_contrato', item };
}

// ============================================================
// RM-107.1.1-C — Conversão COM metadata de avaliação (aditiva; não altera nenhum valor de dose)
//
// A metadata acompanha o DTO. Informação ausente nunca é inventada: vira 'desconhecido'/'nao_avaliada' e é listada em
// `completude.ausentes`. Ausência de alerta NÃO é confirmação de segurança. Nenhuma política de limites é criada: o limite
// excedido (sob a política que gerou o resultado) permanece identificável.
// ============================================================

export type EstadoCalculoMetadata = EstadoCalculo | 'desconhecido';
export type EstadoRegraMetadata = EstadoRegra | 'sem_regra_aplicada' | 'desconhecido';
export type EstadoApresentacao = 'quantidade_calculada_sem_arredondamento' | 'nao_convertida' | 'nao_avaliada';

export interface MetadataAvaliacaoDose {
  versao_metadata: 'dose-metadata-1';
  estado_calculo: EstadoCalculoMetadata;
  estado_regra: EstadoRegraMetadata;
  estado_apresentacao: EstadoApresentacao;
  alertas: AlertaDose[];
  bloqueios: AlertaDose[];
  limites_excedidos: DoseResult['limites_excedidos'];
  limitacoes: string[];
  dados_ausentes: DadoAusente[];
  regras_candidatas: DoseResult['regras_candidatas'];
  fonte_utilizada: FonteDose[];
  /** `null` = nenhuma regra única aplicada (sem regra, ambígua ou não calculado). */
  origem_regra: NonNullable<DoseResult['regra_aplicada']> | null;
  /** Sempre falso: calcular não é homologar. */
  homologacao_clinica: false;
  /** Sempre falso por contrato: a ausência de alertas não indica segurança. */
  ausencia_de_alerta_indica_seguranca: false;
  resumo: { possui_alerta_critico: boolean; possui_limite_excedido: boolean; possui_bloqueio: boolean };
  /** `integral = false` quando a informação necessária não estava disponível no resultado de origem (nada foi inventado). */
  completude: { integral: boolean; ausentes: string[] };
}

export type ConversaoComMetadata =
  | { ok: true; dose: DoseEstruturada; avaliacao: MetadataAvaliacaoDose; avaliacao_obrigatoria: true }
  | { ok: false; motivo: string; avaliacao: MetadataAvaliacaoDose; avaliacao_obrigatoria: true };

const ESTADOS_CALCULO: ReadonlySet<string> = new Set(['calculo_realizado', 'dados_insuficientes', 'entrada_invalida', 'regra_inexistente', 'regra_incompativel', 'multiplas_regras_candidatas', 'calculo_bloqueado']);
const ESTADOS_REGRA: ReadonlySet<string> = new Set(['regra_sem_fonte', 'fonte_candidata', 'fonte_consultada_aguardando_revisao', 'regra_clinicamente_validada']);
const ESTADOS_APRESENTACAO: ReadonlySet<string> = new Set(['quantidade_calculada_sem_arredondamento', 'nao_convertida', 'nao_avaliada']);

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const arr = <T,>(v: unknown, nome: string, ausentes: string[]): T[] => { if (Array.isArray(v)) return clone(v as T[]); ausentes.push(nome); return []; };

/** Estado da regra nunca é "validada" sem prova no próprio resultado (fonte VERIFICADA completa); caso contrário é rebaixado e a causa é registrada. */
function estadoRegraSeguro(declarado: unknown, fontes: FonteDose[], ausentes: string[], limitacoes: string[]): EstadoRegraMetadata {
  if (declarado === null) return 'sem_regra_aplicada';
  if (typeof declarado !== 'string' || !ESTADOS_REGRA.has(declarado)) { ausentes.push('estado_regra'); return 'desconhecido'; }
  if (declarado !== 'regra_clinicamente_validada') return declarado as EstadoRegra;
  if (fontes.some(f => camposFaltantesFonte(f).length === 0)) return 'regra_clinicamente_validada';
  limitacoes.push('Estado "regra clinicamente validada" declarado sem fonte verificada completa no resultado: rebaixado (nada foi presumido).');
  ausentes.push('fonte_utilizada_verificada');
  return fontes.length === 0 ? 'regra_sem_fonte' : 'fonte_candidata';
}

function resumir(m: Pick<MetadataAvaliacaoDose, 'alertas' | 'bloqueios' | 'limites_excedidos'>): MetadataAvaliacaoDose['resumo'] {
  return { possui_alerta_critico: m.alertas.some(a => a.severidade === 'critico') || m.bloqueios.some(a => a.severidade === 'critico'), possui_limite_excedido: m.limites_excedidos.length > 0, possui_bloqueio: m.bloqueios.length > 0 };
}

/** Extrai a metadata de um `DoseResult` (ou de algo que deveria sê-lo). Tolerante: campo ausente ⇒ 'desconhecido'/vazio + `completude`. */
export function extrairMetadataAvaliacao(origem: unknown): MetadataAvaliacaoDose {
  const r = (origem && typeof origem === 'object' ? origem : {}) as Partial<DoseResult>;
  const ausentes: string[] = [];
  const limitacoes = arr<string>(r.limitacoes, 'limitacoes', ausentes);
  const fontes = arr<FonteDose>(r.fonte_utilizada, 'fonte_utilizada', ausentes);
  const alertas = arr<AlertaDose>(r.alertas, 'alertas', ausentes);
  const bloqueios = arr<AlertaDose>(r.bloqueios, 'bloqueios', ausentes);
  const limites = arr<DoseResult['limites_excedidos'][number]>(r.limites_excedidos, 'limites_excedidos', ausentes);
  const dadosAusentes = arr<DadoAusente>(r.dados_ausentes, 'dados_ausentes', ausentes);
  const candidatas = arr<DoseResult['regras_candidatas'][number]>(r.regras_candidatas, 'regras_candidatas', ausentes);
  let estadoCalculo: EstadoCalculoMetadata = 'desconhecido';
  if (typeof r.estado_calculo === 'string' && ESTADOS_CALCULO.has(r.estado_calculo)) estadoCalculo = r.estado_calculo; else ausentes.push('estado_calculo');
  const estadoRegra = estadoRegraSeguro(r.estado_regra === undefined ? 'indefinido' : r.estado_regra, fontes, ausentes, limitacoes);
  let apresentacao: EstadoApresentacao = 'nao_avaliada';
  if (r.quantidade_por_administracao) apresentacao = 'quantidade_calculada_sem_arredondamento';
  else if (alertas.some(a => a.codigo === 'apresentacao_nao_convertida')) apresentacao = 'nao_convertida';
  const m: MetadataAvaliacaoDose = {
    versao_metadata: 'dose-metadata-1', estado_calculo: estadoCalculo, estado_regra: estadoRegra, estado_apresentacao: apresentacao,
    alertas, bloqueios, limites_excedidos: limites, limitacoes, dados_ausentes: dadosAusentes, regras_candidatas: candidatas, fonte_utilizada: fontes,
    origem_regra: r.regra_aplicada ? clone(r.regra_aplicada) as MetadataAvaliacaoDose['origem_regra'] : null,
    homologacao_clinica: false, ausencia_de_alerta_indica_seguranca: false,
    resumo: resumir({ alertas, bloqueios, limites_excedidos: limites }), completude: { integral: ausentes.length === 0, ausentes },
  };
  return m;
}

/**
 * Conversão preferencial (RM-107.1.1-C): devolve o DTO **acompanhado** da metadata de avaliação, também quando a conversão
 * é recusada (para que o motivo e o estado não se percam). Valor, unidade, frequência e via são os mesmos da conversão legada.
 */
export function converterDoseComMetadata(r: DoseResult, ctx: { via: string; peso_kg?: number }): ConversaoComMetadata {
  const avaliacao = extrairMetadataAvaliacao(r);
  const c = converterDto(r, ctx);
  return c.ok ? { ok: true, dose: c.dose, avaliacao, avaliacao_obrigatoria: true } : { ok: false, motivo: c.motivo, avaliacao, avaliacao_obrigatoria: true };
}

/** Normaliza uma metadata recebida (ex.: recuperada de armazenamento): campos ausentes/inválidos viram 'desconhecido' e `completude.integral = false`. */
export function normalizarMetadataAvaliacao(origem: unknown): MetadataAvaliacaoDose {
  const o = (origem && typeof origem === 'object' ? origem : {}) as Record<string, unknown>;
  const ausentes: string[] = [];
  const limitacoes = arr<string>(o.limitacoes, 'limitacoes', ausentes);
  const fontes = arr<FonteDose>(o.fonte_utilizada, 'fonte_utilizada', ausentes);
  const alertas = arr<AlertaDose>(o.alertas, 'alertas', ausentes);
  const bloqueios = arr<AlertaDose>(o.bloqueios, 'bloqueios', ausentes);
  const limites = arr<DoseResult['limites_excedidos'][number]>(o.limites_excedidos, 'limites_excedidos', ausentes);
  const estadoCalculo: EstadoCalculoMetadata = typeof o.estado_calculo === 'string' && ESTADOS_CALCULO.has(o.estado_calculo) ? (o.estado_calculo as EstadoCalculo) : (ausentes.push('estado_calculo'), 'desconhecido');
  const declarado = o.estado_regra === 'sem_regra_aplicada' ? null : o.estado_regra === undefined ? 'indefinido' : o.estado_regra;
  const estadoRegra = estadoRegraSeguro(declarado, fontes, ausentes, limitacoes);
  const apresentacao: EstadoApresentacao = typeof o.estado_apresentacao === 'string' && ESTADOS_APRESENTACAO.has(o.estado_apresentacao) ? (o.estado_apresentacao as EstadoApresentacao) : (ausentes.push('estado_apresentacao'), 'nao_avaliada');
  const origemRegra = o.origem_regra && typeof o.origem_regra === 'object' ? (clone(o.origem_regra) as MetadataAvaliacaoDose['origem_regra']) : null;
  return {
    versao_metadata: 'dose-metadata-1', estado_calculo: estadoCalculo, estado_regra: estadoRegra, estado_apresentacao: apresentacao, alertas, bloqueios, limites_excedidos: limites, limitacoes,
    dados_ausentes: arr<DadoAusente>(o.dados_ausentes, 'dados_ausentes', ausentes), regras_candidatas: arr<DoseResult['regras_candidatas'][number]>(o.regras_candidatas, 'regras_candidatas', ausentes), fonte_utilizada: fontes,
    origem_regra: origemRegra, homologacao_clinica: false, ausencia_de_alerta_indica_seguranca: false,
    resumo: resumir({ alertas, bloqueios, limites_excedidos: limites }), completude: { integral: ausentes.length === 0 && (o.completude as { integral?: unknown } | undefined)?.integral !== false, ausentes: [...new Set([...ausentes, ...(Array.isArray((o.completude as { ausentes?: unknown } | undefined)?.ausentes) ? ((o.completude as { ausentes: string[] }).ausentes) : [])])] },
  };
}

const VERSAO_CONVERSAO = 'dose-conversao-1';

/** Serializa a conversão (DTO + metadata) para armazenamento. */
export function serializarConversao(c: ConversaoComMetadata): string {
  return JSON.stringify({ versao: VERSAO_CONVERSAO, ok: c.ok, ...(c.ok ? { dose: c.dose } : { motivo: c.motivo }), avaliacao: c.avaliacao });
}

/** Recupera uma conversão serializada. Nunca inventa metadata: o que faltar vira 'desconhecido' e `completude.integral = false`. */
export function recuperarConversao(json: string): ConversaoComMetadata {
  let o: Record<string, unknown>;
  try { o = JSON.parse(json) as Record<string, unknown>; } catch { return { ok: false, motivo: 'serializacao_invalida', avaliacao: normalizarMetadataAvaliacao(undefined), avaliacao_obrigatoria: true }; }
  if (!o || typeof o !== 'object') return { ok: false, motivo: 'serializacao_invalida', avaliacao: normalizarMetadataAvaliacao(undefined), avaliacao_obrigatoria: true };
  const avaliacao = normalizarMetadataAvaliacao(o.avaliacao);
  const d = o.dose as Partial<DoseEstruturada> | undefined;
  if (o.ok === true && d && typeof d.valor === 'number' && typeof d.unidade === 'string' && typeof d.frequencia === 'string' && typeof d.via === 'string') return { ok: true, dose: d as DoseEstruturada, avaliacao, avaliacao_obrigatoria: true };
  return { ok: false, motivo: typeof o.motivo === 'string' ? o.motivo : 'dose_ausente_ou_incompleta', avaliacao, avaliacao_obrigatoria: true };
}
