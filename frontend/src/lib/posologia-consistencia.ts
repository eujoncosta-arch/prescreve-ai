// RM-107.1.1-E2.3 — Política CENTRALIZADA de integridade entre o texto da posologia e a dose estruturada (DTO).
//
// Os estados abaixo são de INTEGRIDADE DOS DADOS, não de segurança clínica: nenhum deles afirma que a dose é correta,
// segura, conferida ou validada. Esta política NÃO interpreta texto livre, NÃO reconstrói o DTO a partir do texto e
// NÃO assume correspondência só porque os campos estão preenchidos. Todos os fluxos (Panel, store, páginas) devem usar este módulo.

import { normalizarRegistro, VERSAO_REGISTRO, type PosologiaRegistrada } from './dose-contract/registro';

/**
 * Campos que compõem a dose estruturada (valor, unidade, frequência, via) ou a descrevem em texto.
 * Editados, o DTO registrado deixa de representar a posologia atual. `duracao`, `quantidade`, `uso_continuo` e `forma_farmaceutica`
 * invalidam a AVALIAÇÃO, mas não fazem parte do DTO numérico.
 */
export const CAMPOS_QUE_DIVERGEM_DO_DTO: readonly string[] = ['dose', 'unidade', 'frequencia', 'via', 'posologia', 'concentracao', 'medicamento', 'molecula'];
export const campoDivergeDoDto = (campo: string): boolean => CAMPOS_QUE_DIVERGEM_DO_DTO.includes(campo);

export type EstadoIntegridadeDto =
  | 'consistente_conforme_origem'   // nenhuma alteração posterior ao registro foi detectada (NÃO significa texto verificado == DTO)
  | 'divergente'                    // houve alteração relevante após o registro, ou o DTO do item difere do registrado
  | 'nao_verificavel'               // sem metadata (legado) ou registro ilegível: não há evidência para afirmar nem negar
  | 'estrutura_indisponivel';       // não há dose estruturada utilizável

export interface ParecerIntegridadeDto {
  estado: EstadoIntegridadeDto;
  motivo: string;
  /** Pode o DTO do item seguir para a sincronização? `false` ⇒ nunca transmitir sem reconfirmação explícita (divergente) ou sem DTO. */
  transmissivel: boolean;
  /** Houve reconfirmação explícita do prescritor vigente (não invalidada por edição posterior). */
  reconfirmado: boolean;
}

type ItemComDto = { dose_estruturada?: unknown; posologia_registrada?: unknown; bloqueio_dto?: unknown } | null | undefined;

function ordenar(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(ordenar);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, ordenar(x)]));
  return v;
}
const igual = (a: unknown, b: unknown): boolean => JSON.stringify(ordenar(a)) === JSON.stringify(ordenar(b));

const registroLegivel = (raw: unknown): boolean =>
  !!raw && typeof raw === 'object' && (raw as { versao_registro?: unknown }).versao_registro === VERSAO_REGISTRO;

function motivoDoBloqueioPersistido(b: unknown): string {
  const m = b && typeof b === 'object' ? (b as { motivo?: unknown }).motivo : undefined;
  return `bloqueio de integridade persistido${typeof m === 'string' && m ? `: ${m}` : ''}`;
}

/** Única fonte de verdade sobre a integridade DTO × registro de um item. */
export function avaliarIntegridadeDto(item: ItemComDto): ParecerIntegridadeDto {
  const dto = item?.dose_estruturada ?? null;
  const raw = item?.posologia_registrada;

  // RM-107.1.1-E2.4 — CONTINUIDADE DO BLOQUEIO: um bloqueio persistido (item recuperado após reload, sem registro nem trilha em memória)
  // continua `divergente`. Ausência de registro/divergência/trilha NUNCA o libera; qualquer valor truthy conta (formato desconhecido não o apaga).
  // Só o fluxo explícito de revisão e reutilização o converte (ver `itemParaRevisao`/`prepararItemParaStore`).
  if (item?.bloqueio_dto) {
    return { estado: 'divergente', motivo: motivoDoBloqueioPersistido(item.bloqueio_dto), transmissivel: false, reconfirmado: false };
  }
  const temRegistro = raw !== undefined && raw !== null;

  if (!temRegistro || !registroLegivel(raw)) {
    return dto
      ? { estado: 'nao_verificavel', motivo: temRegistro ? 'registro de proveniência ilegível ou de versão desconhecida' : 'item sem metadata de proveniência (legado)', transmissivel: true, reconfirmado: false }
      : { estado: 'estrutura_indisponivel', motivo: 'não há dose estruturada', transmissivel: false, reconfirmado: false };
  }

  const reg: PosologiaRegistrada = normalizarRegistro(raw);
  if (reg.dose_divergente) {
    return { estado: 'divergente', motivo: `campos alterados após o registro da dose estruturada: ${reg.dose_divergente.campos.join(', ') || '(não informados)'}`, transmissivel: false, reconfirmado: false };
  }
  if (!dto) {
    return { estado: 'estrutura_indisponivel', motivo: reg.motivo_sem_dose ?? 'não há dose estruturada', transmissivel: false, reconfirmado: false };
  }
  if (!reg.dose) {
    return { estado: 'divergente', motivo: 'o item traz dose estruturada que o registro de proveniência não conhece', transmissivel: false, reconfirmado: false };
  }
  if (!igual(reg.dose, dto)) {
    return { estado: 'divergente', motivo: 'a dose estruturada do item difere da registrada', transmissivel: false, reconfirmado: false };
  }
  const reconfirmado = (reg.reconfirmacoes_dose?.length ?? 0) > 0 && (reg.trilha ?? []).slice().reverse().find(e => e.tipo === 'reconfirmacao' || e.tipo === 'reconfirmacao_invalidada')?.tipo === 'reconfirmacao';
  return { estado: 'consistente_conforme_origem', motivo: 'nenhuma alteração posterior ao registro foi detectada; o sistema não verificou a correspondência entre o texto e a dose estruturada', transmissivel: true, reconfirmado };
}

/** `true` quando o DTO do item NÃO pode ser enviado como a posologia atual (divergente). Ausência de DTO é tratada pelo gate existente da sincronização. */
export const dtoBloqueadoPorDivergencia = (item: ItemComDto): boolean => avaliarIntegridadeDto(item).estado === 'divergente';
