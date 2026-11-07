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
  if (reg.avaliacao.tipo === 'nao_avaliada') {
    return { ...reg, edicoes_manuais: [...reg.edicoes_manuais, edicao] };
  }
  return comEdicaoManual(reg, edicao);
}

/** Remove o registro de um item antes de qualquer persistência (favoritos/store/backend): E2 é só em memória. */
export function semRegistroParaPersistir<T extends { posologia_registrada?: unknown }>(item: T): Omit<T, 'posologia_registrada'> {
  const { posologia_registrada, ...resto } = item;
  void posologia_registrada;
  return resto;
}
