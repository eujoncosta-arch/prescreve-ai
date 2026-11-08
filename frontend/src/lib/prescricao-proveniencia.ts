// RM-107.1.1-E2 — Integração LOCAL (em memória) da proveniência da posologia nos itens da prescrição.
// Camada fina sobre `dose-contract/registro` (E1). NÃO altera motores, doses, textos ou comportamento clínico;
// NÃO persiste (localStorage/backend); NÃO conecta aprovação formal; NÃO cria rótulos de validação.

import {
  comEdicaoManual, normalizarRegistro, registroNaoAvaliado,
  type PosologiaRegistrada,
} from './dose-contract';

/**
 * Campos que NÃO alteram a posologia (administrativos/identificação comercial/documentais).
 * Qualquer outro campo é tratado como posológico (política conservadora: na dúvida, invalida a avaliação).
 */
export const CAMPOS_ADMINISTRATIVOS: readonly string[] = [
  'instrucoes', 'instrucoes_especiais', 'tipo_receita', 'nome_comercial', 'laboratorio', 'produto_id', 'bula_profissional', 'bula_paciente',
  'posologia_registrada', 'id', 'entidade_id',
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

/** Registro de F2 (texto de recomendação): não avaliada; texto preservado; nada inferido como confirmado. */
export function registroDeRecomendacaoTexto(args: { texto: string; dose?: PosologiaRegistrada['dose']; campos_padrao?: string[]; criado_em?: string }): PosologiaRegistrada {
  return registroNaoAvaliado({ origem: 'recomendacao_texto', motivo: 'texto_livre', texto_original: args.texto, dose: args.dose ?? null, campos_padrao: args.campos_padrao, criado_em: args.criado_em });
}

/** Registro de F3b (inclusão manual): SEMPRE não avaliada; nenhuma dose estruturada fabricada. */
export function registroDeInclusaoManual(args: { texto?: string; campos_padrao?: string[]; criado_em?: string }): PosologiaRegistrada {
  return registroNaoAvaliado({ origem: 'digitada_pelo_prescritor', motivo: 'texto_livre', texto_original: args.texto, campos_padrao: args.campos_padrao, criado_em: args.criado_em });
}

/**
 * F3c — edição. Devolve o MESMO objeto quando não há o que mudar (campo administrativo, valor igual, ou item sem registro).
 * - Avaliada (contrato/motor C) ⇒ `comEdicaoManual` (avaliação invalidada, anterior preservada em `avaliacao_anterior`).
 * - Já não avaliada ⇒ apenas acrescenta a trilha de edição (não inventa que algo foi "calculado" antes).
 * - Item sem registro (legado) ⇒ permanece sem registro (continua interpretado como `nao_avaliada`).
 */
export function registrarEdicaoPosologica(
  reg: PosologiaRegistrada | undefined, campo: string, de: unknown, para: unknown, em: string = new Date().toISOString(),
): PosologiaRegistrada | undefined {
  if (!reg) return reg;
  if (!campoAlteraPosologia(campo)) return reg;
  const d = String(de ?? ''), p = String(para ?? '');
  if (d === p) return reg;
  const edicao = { campo, de: d, para: p, em };
  const editado = reg.avaliacao.tipo === 'nao_avaliada'
    ? { ...reg, edicoes_manuais: [...reg.edicoes_manuais, edicao] }
    : comEdicaoManual(reg, edicao);
  return campoDivergeDoDto(campo) ? marcarDtoDivergente(editado, campo, em) : editado;
}

/**
 * RM-107.1.1-E2.1 — campos que compõem a dose estruturada (valor, unidade, frequência, via) ou a descrevem em texto.
 * Editados, o DTO anterior deixa de representar a posologia atual. `duracao`, `quantidade`, `uso_continuo` e `forma_farmaceutica`
 * invalidam a AVALIAÇÃO (E2), mas não fazem parte do DTO numérico e, portanto, não o tornam divergente.
 */
export const CAMPOS_QUE_DIVERGEM_DO_DTO: readonly string[] = ['dose', 'unidade', 'frequencia', 'via', 'posologia', 'concentracao', 'medicamento', 'molecula'];
export const campoDivergeDoDto = (campo: string): boolean => CAMPOS_QUE_DIVERGEM_DO_DTO.includes(campo);

/**
 * O DTO registrado deixa de ser a representação atual: `dose` → null, DTO anterior guardado só como histórico.
 * Não recalcula, não reconstrói, não promove a avaliação. Sem DTO registrado, nada a marcar.
 */
function marcarDtoDivergente(reg: PosologiaRegistrada, campo: string, em: string): PosologiaRegistrada {
  const jaDivergente = reg.dose_divergente;
  if (!reg.dose && !jaDivergente) return reg;
  return {
    ...reg,
    dose: null,
    motivo_sem_dose: 'o texto/campos da posologia foram editados após o registro da dose estruturada; a estrutura numérica anterior não representa a posologia atual',
    dose_divergente: jaDivergente
      ? { ...jaDivergente, campos: [...new Set([...jaDivergente.campos, campo])] }
      : { dose_anterior: structuredClone(reg.dose as NonNullable<typeof reg.dose>), campos: [campo], em },
  };
}

/**
 * Leitura SEGURA da dose estruturada legada de um item: nunca devolve um DTO que o registro marcou como divergente do texto atual.
 * - `consistente`: sem divergência registrada (não implica validação nem segurança).
 * - `divergente_do_texto`: posologia editada depois do DTO; `dose` = null.
 * - `sem_registro`: item legado/sem metadata; o DTO é devolvido como estava, sem garantia de proveniência.
 */
export function leituraDoseEstruturada<D>(item: { dose_estruturada?: D; posologia_registrada?: unknown } | null | undefined):
  { dose: D | null; estado: 'consistente' | 'divergente_do_texto' | 'sem_registro' } {
  const dose = item?.dose_estruturada ?? null;
  if (!item || item.posologia_registrada == null) return { dose, estado: 'sem_registro' };
  const reg = normalizarRegistro(item.posologia_registrada);
  return reg.dose_divergente ? { dose: null, estado: 'divergente_do_texto' } : { dose, estado: 'consistente' };
}

/**
 * RM-107.1.1-E2.2 — reconfirmação EXPLÍCITA do prescritor: "a estrutura numérica registrada corresponde ao texto atual".
 * Reabilita o uso do MESMO DTO (nada é recalculado/reconstruído/editado). NÃO promove a avaliação (segue `nao_avaliada`)
 * e NÃO implica validação clínica. Nova edição posológica posterior torna o DTO desatualizado de novo.
 * Sem divergência registrada ⇒ devolve o mesmo objeto (nada a reconfirmar).
 */
export function reconfirmarDoseEstruturada(reg: PosologiaRegistrada | undefined, em: string = new Date().toISOString()): PosologiaRegistrada | undefined {
  if (!reg?.dose_divergente) return reg;
  const { dose_divergente, motivo_sem_dose, ...resto } = reg;
  void motivo_sem_dose;
  const dose = structuredClone(dose_divergente.dose_anterior);
  return {
    ...resto,
    dose,
    edicoes_manuais: [...reg.edicoes_manuais, { campo: 'dose_estruturada', de: 'desatualizada_em_relacao_ao_texto', para: 'reconfirmada_pelo_prescritor', em }],
    reconfirmacoes_dose: [...(reg.reconfirmacoes_dose ?? []), { em, dose: structuredClone(dose), campos_reconfirmados: [...dose_divergente.campos] }],
  };
}

/** `true` quando o DTO legado do item NÃO pode ser usado como a posologia atual (aguarda reconfirmação do prescritor). */
export function doseEstruturadaDesatualizada(item: { dose_estruturada?: unknown; posologia_registrada?: unknown } | null | undefined): boolean {
  return leituraDoseEstruturada(item).estado === 'divergente_do_texto';
}

/**
 * Último passo ANTES de um item sair do estado local para o store (e, dali, para o backend).
 * - Remove o registro (só em memória; o backend rejeita campos extras com 400).
 * - Se o DTO está desatualizado e não foi reconfirmado, REMOVE `dose_estruturada` do item enviado: o gate existente da sincronização
 *   (`store.tsx`: item sem `dose_estruturada` ⇒ `sem_dose_estruturada`) bloqueia o envio, nunca o DTO antigo. O texto e demais campos
 *   legados do item são preservados; nada é recalculado, reconstruído ou editado.
 * - Em todos os outros casos o item sai idêntico ao comportamento anterior (E2).
 */
export function prepararItemParaStore<T extends { dose_estruturada?: unknown; posologia_registrada?: unknown }>(item: T): Omit<T, 'posologia_registrada'> {
  const semRegistro = semRegistroParaPersistir(item) as Omit<T, 'posologia_registrada'> & { dose_estruturada?: unknown };
  if (!doseEstruturadaDesatualizada(item)) return semRegistro;
  const { dose_estruturada, ...resto } = semRegistro;
  void dose_estruturada;
  return resto as unknown as Omit<T, 'posologia_registrada'>;
}

/**
 * Inclusão cuja dose foi PRÉ-PREENCHIDA pelo sistema (catálogo/`calcWeightDose`) e pode ou não ter sido editada pelo prescritor:
 * a origem real é indeterminável ⇒ `desconhecida` (nunca "digitada pelo prescritor"). Sempre `nao_avaliada`; sem DTO fabricado.
 */
export function registroDeInclusaoComDosePreenchida(args: { texto?: string; campos_padrao?: string[]; criado_em?: string }): PosologiaRegistrada {
  return registroNaoAvaliado({ origem: 'desconhecida', motivo: 'origem_desconhecida', texto_original: args.texto, campos_padrao: args.campos_padrao, criado_em: args.criado_em });
}

/** Remove o registro de um item antes de qualquer persistência (favoritos/store/backend): E2 é só em memória. */
export function semRegistroParaPersistir<T extends { posologia_registrada?: unknown }>(item: T): Omit<T, 'posologia_registrada'> {
  const { posologia_registrada, ...resto } = item;
  void posologia_registrada;
  return resto;
}
