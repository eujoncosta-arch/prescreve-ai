// RM-107.1.1-E2 / E2.1 / E2.2 / E2.3 — Integração LOCAL (em memória) da proveniência da posologia nos itens da prescrição.
// Camada fina sobre `dose-contract/registro` (E1) e sobre a política central `posologia-consistencia`.
// NÃO altera motores, doses, textos ou comportamento clínico; NÃO persiste (localStorage/backend);
// NÃO conecta aprovação formal; NÃO cria rótulos de validação; a trilha NÃO é auditoria institucional nem assinatura eletrônica.

import {
  comEdicaoManual, normalizarRegistro, registroNaoAvaliado, registroDeFullDoseResult,
  type PosologiaRegistrada, type EventoPosologia, type OrigemDetalhe, type OpcoesRegistro,
} from './dose-contract';
import { avaliarIntegridadeDto, CAMPOS_QUE_DIVERGEM_DO_DTO, campoDivergeDoDto } from './posologia-consistencia';
import { construirProveniencia, normalizarProveniencia, type ProvenienciaPersistida } from './proveniencia-persistida';

export { CAMPOS_QUE_DIVERGEM_DO_DTO, campoDivergeDoDto };

/**
 * Campos que NÃO alteram a posologia (administrativos/identificação comercial/documentais).
 * Qualquer outro campo é tratado como posológico (política conservadora: na dúvida, invalida a avaliação).
 */
export const CAMPOS_ADMINISTRATIVOS: readonly string[] = [
  'instrucoes', 'instrucoes_especiais', 'tipo_receita', 'nome_comercial', 'laboratorio', 'produto_id', 'bula_profissional', 'bula_paciente',
  'posologia_registrada', 'bloqueio_dto', 'id', 'entidade_id',
];

/** Campos posológicos conhecidos (documentação/teste; a regra efetiva é "tudo que não é administrativo"). */
export const CAMPOS_POSOLOGICOS: readonly string[] = [
  'dose', 'unidade', 'frequencia', 'via', 'concentracao', 'forma_farmaceutica', 'duracao', 'uso_continuo', 'quantidade', 'posologia', 'medicamento', 'molecula',
];

export function campoAlteraPosologia(campo: string): boolean {
  return !CAMPOS_ADMINISTRATIVOS.includes(campo);
}

/** Item legado ou recebido sem registro ⇒ SEMPRE `nao_avaliada` (nunca promovido; ausência de metadata ≠ ausência de alertas). */
export function registroEfetivo(item: { posologia_registrada?: unknown } | null | undefined): PosologiaRegistrada {
  return normalizarRegistro(item?.posologia_registrada);
}

// ── Trilha (em memória, por registro) ────────────────────────────────────────
const evento = (e: EventoPosologia): EventoPosologia => e;
const comEvento = (reg: PosologiaRegistrada, e: EventoPosologia): PosologiaRegistrada => ({ ...reg, trilha: [...(reg.trilha ?? []), evento(e)] });
const comCriacao = (reg: PosologiaRegistrada): PosologiaRegistrada =>
  comEvento(reg, { tipo: 'criacao', em: reg.criado_em, detalhe: `origem=${reg.origem}${reg.origem_detalhe ? `/${reg.origem_detalhe}` : ''}` });

// ── Construtores por fluxo ───────────────────────────────────────────────────
/** Registro de F2 (texto de recomendação): não avaliada; texto preservado; nada inferido como confirmado. */
export function registroDeRecomendacaoTexto(args: { texto: string; dose?: PosologiaRegistrada['dose']; campos_padrao?: string[]; criado_em?: string }): PosologiaRegistrada {
  return comCriacao(registroNaoAvaliado({ origem: 'recomendacao_texto', motivo: 'texto_livre', texto_original: args.texto, dose: args.dose ?? null, campos_padrao: args.campos_padrao, criado_em: args.criado_em }));
}

/** Registro de F3b (inclusão manual em branco): SEMPRE não avaliada; nenhuma dose estruturada fabricada. */
export function registroDeInclusaoManual(args: { texto?: string; campos_padrao?: string[]; criado_em?: string }): PosologiaRegistrada {
  return comCriacao(registroNaoAvaliado({ origem: 'digitada_pelo_prescritor', motivo: 'texto_livre', texto_original: args.texto, campos_padrao: args.campos_padrao, criado_em: args.criado_em }));
}

/**
 * Inclusão cuja dose foi PRÉ-PREENCHIDA e cuja fonte NÃO é rastreável: origem `desconhecida` (nunca "digitada pelo prescritor").
 * Mantida para chamadores sem rastreio de fonte.
 */
export function registroDeInclusaoComDosePreenchida(args: { texto?: string; campos_padrao?: string[]; criado_em?: string }): PosologiaRegistrada {
  return comCriacao(registroNaoAvaliado({ origem: 'desconhecida', motivo: 'origem_desconhecida', texto_original: args.texto, campos_padrao: args.campos_padrao, criado_em: args.criado_em }));
}

/**
 * RM-107.1.1-E2.3 — inclusão cuja fonte da dose foi TECNICAMENTE COMPROVADA:
 * - `digitada`: o prescritor alterou o campo (evento de entrada) ⇒ `digitada_pelo_prescritor`;
 * - `catalogo_dose_habitual` | `calculo_peso_simples` | `sincronizada_com_concentracao`: valor pré-preenchido pelo sistema e NÃO editado
 *   ⇒ `pre_preenchida_pelo_sistema` + `origem_detalhe`, com `dose` registrada em `campos_padrao`.
 * Sempre `nao_avaliada` (pré-preenchido não é dose confirmada nem validada); nenhum DTO fabricado.
 */
export function registroDeInclusaoComFonteDaDose(args: { fonte: OrigemDetalhe | 'digitada'; texto?: string; campos_padrao?: string[]; criado_em?: string }): PosologiaRegistrada {
  if (args.fonte === 'digitada') {
    return comCriacao(registroNaoAvaliado({ origem: 'digitada_pelo_prescritor', motivo: 'texto_livre', texto_original: args.texto, campos_padrao: args.campos_padrao, criado_em: args.criado_em }));
  }
  const base = registroNaoAvaliado({
    origem: 'pre_preenchida_pelo_sistema', motivo: 'texto_livre', texto_original: args.texto,
    campos_padrao: [...new Set(['dose', ...(args.campos_padrao ?? [])])], criado_em: args.criado_em,
  });
  return comCriacao({ ...base, origem_detalhe: args.fonte });
}

/** F3 (motor C): `registroDeFullDoseResult` (E1, sem recálculo) + evento de criação na trilha. */
export function registroDeResultadoMotorC(
  r: Parameters<typeof registroDeFullDoseResult>[0], ctx: Parameters<typeof registroDeFullDoseResult>[1], opcoes?: OpcoesRegistro,
): PosologiaRegistrada {
  return comCriacao(registroDeFullDoseResult(r, ctx, opcoes));
}

// ── Edição (F3c) ─────────────────────────────────────────────────────────────
const reconfirmacaoVigente = (reg: PosologiaRegistrada): boolean =>
  (reg.trilha ?? []).slice().reverse().find(e => e.tipo === 'reconfirmacao' || e.tipo === 'reconfirmacao_invalidada')?.tipo === 'reconfirmacao';

/**
 * Edição. Devolve o MESMO objeto quando não há o que mudar (campo administrativo, valor igual, ou item sem registro).
 * - Avaliada (contrato/motor C) ⇒ `comEdicaoManual` (avaliação invalidada, anterior preservada em `avaliacao_anterior`).
 * - Já não avaliada ⇒ apenas acrescenta a trilha de edição (não inventa que algo foi "calculado" antes).
 * - Item sem registro (legado) ⇒ permanece sem registro (continua interpretado como `nao_avaliada`).
 * - Campo que compõe/descreve o DTO ⇒ DTO anterior vira histórico (`dose_divergente`); além disso, QUALQUER edição posológica
 *   posterior a uma reconfirmação a invalida (evento `reconfirmacao_invalidada`) e exige nova decisão do prescritor.
 */
export function registrarEdicaoPosologica(
  reg: PosologiaRegistrada | undefined, campo: string, de: unknown, para: unknown, em: string = new Date().toISOString(),
): PosologiaRegistrada | undefined {
  if (!reg) return reg;
  if (!campoAlteraPosologia(campo)) return reg;
  const d = String(de ?? ''), p = String(para ?? '');
  if (d === p) return reg;
  const edicao = { campo, de: d, para: p, em };
  const vigente = reconfirmacaoVigente(reg);
  let editado = reg.avaliacao.tipo === 'nao_avaliada'
    ? { ...reg, edicoes_manuais: [...reg.edicoes_manuais, edicao] }
    : comEdicaoManual(reg, edicao);
  editado = comEvento(editado, { tipo: 'edicao', em, campo });
  if (vigente) editado = comEvento(editado, { tipo: 'reconfirmacao_invalidada', em, campo, detalhe: 'nova alteração posológica após a reconfirmação' });
  return campoDivergeDoDto(campo) || vigente ? marcarDtoDivergente(editado, campo, em) : editado;
}

/**
 * O DTO registrado deixa de ser a representação atual: `dose` → null, DTO anterior guardado só como histórico.
 * Não recalcula, não reconstrói, não promove a avaliação. Sem DTO registrado, nada a marcar.
 */
function marcarDtoDivergente(reg: PosologiaRegistrada, campo: string, em: string): PosologiaRegistrada {
  const jaDivergente = reg.dose_divergente;
  if (!reg.dose && !jaDivergente) return comEvento(reg, { tipo: 'dto_indisponivel', em, campo, detalhe: 'não havia dose estruturada registrada' });
  return comEvento({
    ...reg,
    dose: null,
    motivo_sem_dose: 'o texto/campos da posologia foram editados após o registro da dose estruturada; a estrutura numérica anterior não representa a posologia atual',
    dose_divergente: jaDivergente
      ? { ...jaDivergente, campos: [...new Set([...jaDivergente.campos, campo])] }
      : { dose_anterior: structuredClone(reg.dose as NonNullable<typeof reg.dose>), campos: [campo], em },
  }, { tipo: 'dto_invalidado', em, campo });
}

/**
 * Leitura SEGURA da dose estruturada legada de um item: nunca devolve um DTO que o registro marcou como divergente do texto atual.
 * - `consistente`: sem divergência registrada (não implica validação nem segurança).
 * - `divergente_do_texto`: posologia editada depois do DTO; `dose` = null.
 * - `sem_registro`: item legado/sem metadata; o DTO é devolvido como estava, sem garantia de proveniência.
 * Para a classificação completa de integridade use `avaliarIntegridadeDto` (política central).
 */
export function leituraDoseEstruturada<D>(item: { dose_estruturada?: D; posologia_registrada?: unknown } | null | undefined):
  { dose: D | null; estado: 'consistente' | 'divergente_do_texto' | 'sem_registro' } {
  const dose = item?.dose_estruturada ?? null;
  if (!item || item.posologia_registrada == null) return { dose, estado: 'sem_registro' };
  const reg = normalizarRegistro(item.posologia_registrada);
  return reg.dose_divergente ? { dose: null, estado: 'divergente_do_texto' } : { dose, estado: 'consistente' };
}

// ── Reconfirmação ────────────────────────────────────────────────────────────
/**
 * Reconfirmação EXPLÍCITA do prescritor: decisão de REUTILIZAR a estrutura numérica anterior para a posologia atual.
 * NÃO é validação, conferência nem atestado de segurança; o sistema NÃO verificou a correspondência entre texto e DTO.
 * Reabilita o MESMO DTO (nada é recalculado/reconstruído/editado), mantém a avaliação como `nao_avaliada`.
 * Qualquer alteração posológica posterior a invalida (ver `registrarEdicaoPosologica`).
 * Sem divergência registrada ⇒ devolve o mesmo objeto (nada a reconfirmar).
 */
export function reconfirmarDoseEstruturada(reg: PosologiaRegistrada | undefined, em: string = new Date().toISOString()): PosologiaRegistrada | undefined {
  if (!reg?.dose_divergente) return reg;
  const { dose_divergente, motivo_sem_dose, ...resto } = reg;
  void motivo_sem_dose;
  const dose = structuredClone(dose_divergente.dose_anterior);
  return comEvento({
    ...resto,
    dose,
    edicoes_manuais: [...reg.edicoes_manuais, { campo: 'dose_estruturada', de: 'desatualizada_em_relacao_ao_texto', para: 'reutilizacao_decidida_pelo_prescritor', em }],
    reconfirmacoes_dose: [...(reg.reconfirmacoes_dose ?? []), { em, dose: structuredClone(dose), campos_reconfirmados: [...dose_divergente.campos] }],
  }, { tipo: 'reconfirmacao', em, detalhe: `reutilização da estrutura anterior decidida pelo prescritor (campos: ${dose_divergente.campos.join(', ')})` });
}

// ── Integridade / transporte ─────────────────────────────────────────────────
/** `true` quando o DTO do item NÃO pode ser usado como a posologia atual (divergente; aguarda reconfirmação do prescritor). */
export function doseEstruturadaDesatualizada(item: { dose_estruturada?: unknown; posologia_registrada?: unknown } | null | undefined): boolean {
  return avaliarIntegridadeDto(item).estado === 'divergente';
}

/**
 * Último passo ANTES de um item sair do estado local para o store (e, dali, para o backend).
 * - Remove o registro (só em memória; o backend rejeita campos extras com 400).
 * - Se a integridade do DTO é `divergente`, o DTO e TODOS os dados legados do item são PRESERVADOS (nenhuma perda silenciosa) e o item recebe
 *   `bloqueio_dto`: o gate da sincronização (`store.tsx`) o lê e impede o envio do DTO — nunca a transmissão do DTO divergente.
 * - Nos demais casos o item sai idêntico ao comportamento anterior.
 */
export function prepararItemParaStore<T extends { dose_estruturada?: unknown; posologia_registrada?: unknown; bloqueio_dto?: unknown; proveniencia?: unknown }>(item: T):
  Omit<T, 'posologia_registrada' | 'bloqueio_dto' | 'proveniencia'> & { bloqueio_dto?: { estado: 'divergente'; motivo: string }; proveniencia?: ProvenienciaPersistida } {
  const { bloqueio_dto: marcadorExistente, proveniencia: provExistente, ...semRegistro } = semRegistroParaPersistir(item) as Omit<T, 'posologia_registrada'> & { bloqueio_dto?: unknown; proveniencia?: unknown };
  const parecer = avaliarIntegridadeDto(item);
  // RM-107.1.1-E2.5: envelope mínimo de proveniência. Com registro em memória ⇒ construído/atualizado (a origem ORIGINAL do envelope anterior nunca é
  // sobrescrita); sem registro mas com envelope legível ⇒ preservado (estado atual atualizado); sem nenhum dos dois (legado) ⇒ NÃO se fabrica proveniência.
  const anterior = normalizarProveniencia(provExistente);
  const reg = item.posologia_registrada ? normalizarRegistro(item.posologia_registrada) : null;
  const prov = reg ? construirProveniencia(reg, parecer, anterior) : anterior ? { ...anterior, estrutura_dose: parecer.estado } : null;
  const base = { ...(semRegistro as Omit<T, 'posologia_registrada' | 'bloqueio_dto' | 'proveniencia'>), ...(prov ? { proveniencia: prov } : {}) };
  if (parecer.estado !== 'divergente') return base;
  // Bloqueio JÁ persistido: preservado exatamente (nunca reescrito/aninhado nem apagado por normalização).
  const bloqueio = marcadorExistente ? marcadorExistente as { estado: 'divergente'; motivo: string } : { estado: 'divergente' as const, motivo: parecer.motivo };
  return { ...base, bloqueio_dto: bloqueio };
}

// ── Revisão de prescrição finalizada localmente (E2.4/E2.5) ──────────────────
/**
 * Converte um item PERSISTIDO (sem registro, sem trilha em memória) em item de REVISÃO. Não interpreta texto, não reconstrói dose e não promove nada:
 * - com `bloqueio_dto` E dose estruturada preservada: o bloqueio vira um registro divergente (`dose_divergente.dose_anterior` = o DTO preservado, `dose` = null);
 *   o marcador é removido do item de revisão (a divergência passa a viver no registro) e só `reconfirmarDoseEstruturada` a levanta;
 * - com `bloqueio_dto` mas SEM dose estruturada: o marcador é mantido (não há o que reutilizar);
 * - sem bloqueio: registro `nao_avaliada` (legado) com o DTO existente copiado — nunca "consistente".
 * RM-107.1.1-E2.5: se o item traz envelope de proveniência legível com origem original CONHECIDA, o registro de revisão a restaura (origem, detalhe, momento de
 * criação); caso contrário a origem permanece `desconhecida` e NUNCA é apresentada como conhecida. A recuperação é registrada como evento `recuperacao`.
 */
export function itemParaRevisao<T extends { posologia?: string; dose_estruturada?: unknown; posologia_registrada?: unknown; bloqueio_dto?: unknown; proveniencia?: unknown }>(item: T, em: string = new Date().toISOString()):
  Omit<T, 'bloqueio_dto'> & { posologia_registrada: PosologiaRegistrada; bloqueio_dto?: unknown } {
  const { bloqueio_dto, posologia_registrada: _descartado, ...resto } = item;
  void _descartado;
  const dto = (item.dose_estruturada ?? null) as PosologiaRegistrada['dose'];
  const prov = normalizarProveniencia(item.proveniencia);
  const orig = prov?.original.conhecida ? prov.original : null;
  const base0 = registroNaoAvaliado({
    origem: orig ? orig.origem : 'desconhecida', motivo: 'legado_sem_metadata', texto_original: item.posologia,
    dose: bloqueio_dto ? null : dto, criado_em: orig ? orig.criado_em : em,
  });
  const base = orig?.detalhe ? { ...base0, origem_detalhe: orig.detalhe } : base0;
  const criado = comEvento(comEvento(base, { tipo: 'criacao', em: base.criado_em, detalhe: orig ? 'origem original restaurada do envelope de proveniência' : 'origem original não conhecida (item sem proveniência)' }),
    { tipo: 'recuperacao', em, detalhe: 'prescrição recuperada do armazenamento local para revisão' });
  if (!bloqueio_dto) return { ...resto, posologia_registrada: criado } as never;
  if (!dto) return { ...resto, bloqueio_dto, posologia_registrada: comEvento({ ...criado, motivo_sem_dose: 'bloqueio persistido sem dose estruturada preservada' }, { tipo: 'dto_indisponivel', em }) } as never;
  const reg = comEvento({
    ...criado,
    motivo_sem_dose: 'bloqueio de integridade persistido: a dose estruturada preservada não foi reutilizada pelo prescritor',
    dose_divergente: { dose_anterior: structuredClone(dto as NonNullable<typeof dto>), campos: ['bloqueio_persistido'], em },
  }, { tipo: 'dto_invalidado', em, detalhe: 'bloqueio persistido' });
  return { ...resto, posologia_registrada: reg } as never;
}

/** Remove o registro de um item antes de qualquer persistência (favoritos/store/backend): a proveniência é só em memória. */
export function semRegistroParaPersistir<T extends { posologia_registrada?: unknown }>(item: T): Omit<T, 'posologia_registrada'> {
  const { posologia_registrada, ...resto } = item;
  void posologia_registrada;
  return resto;
}
