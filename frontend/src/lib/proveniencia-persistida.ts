// RM-107.1.1-E2.5 — Envelope MÍNIMO e versionado de proveniência que sobrevive à finalização local e à recuperação (persistido junto do item
// pendente, no mesmo mecanismo que já persiste a consulta). NÃO é trilha clínica completa e NÃO é auditoria institucional/assinatura.
//
// Privacidade/necessidade: só ENUMERAÇÕES, nomes de CAMPO (nunca valores), carimbos de tempo e contagens — nenhum texto de posologia, nome de
// paciente/medicamento, dose ou observação. O envelope NUNCA é enviado ao backend (o payload é montado campo a campo) e não altera dose alguma.
//
// Quatro blocos SEPARADOS:
//   original              — proveniência original (quando conhecida; `conhecida:false` NUNCA é apresentada como origem conhecida);
//   recuperacao           — histórico de recuperação (cada revisão salva após recuperar);
//   declaracao_prescritor — nova declaração do prescritor (reutilização explícita da estrutura numérica anterior; não é validação);
//   estrutura_dose        — estado ATUAL de integridade da dose estruturada (derivado, não histórico).

import { ORIGENS_DA_POSOLOGIA, ORIGENS_DETALHE, type OrigemDaPosologia, type OrigemDetalhe, type PosologiaRegistrada } from './dose-contract/registro';
import type { EstadoIntegridadeDto, ParecerIntegridadeDto } from './posologia-consistencia';

export const VERSAO_PROVENIENCIA = 'prov-1' as const;
const MAX_RECUPERACOES = 10;
const MAX_CAMPOS = 12;
const ESTADOS: readonly EstadoIntegridadeDto[] = ['consistente_conforme_origem', 'divergente', 'nao_verificavel', 'estrutura_indisponivel'];

export type OrigemOriginal =
  | { conhecida: true; origem: OrigemDaPosologia; detalhe?: OrigemDetalhe; versao_registro: string; criado_em: string }
  | { conhecida: false };

export interface ProvenienciaPersistida {
  v: typeof VERSAO_PROVENIENCIA;
  original: OrigemOriginal;
  recuperacao: Array<{ em: string; tipo: 'revisada' }>;
  declaracao_prescritor?: { reutilizou_dto: true; em: string; campos: string[]; vigente: boolean };
  alteracoes: { total: number; campos: string[] };
  estrutura_dose: EstadoIntegridadeDto;
}

const texto = (x: unknown): x is string => typeof x === 'string';
const campos = (x: unknown): string[] => (Array.isArray(x) ? [...new Set((x as unknown[]).filter(texto))].slice(0, MAX_CAMPOS) : []);

/** Tolerante: versão desconhecida, formato ilegível ou campos inválidos ⇒ `null` (nunca lança, nunca inventa origem). */
export function normalizarProveniencia(raw: unknown): ProvenienciaPersistida | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== VERSAO_PROVENIENCIA) return null;
  const orig = o.original as Record<string, unknown> | undefined;
  let original: OrigemOriginal = { conhecida: false };
  if (orig && typeof orig === 'object' && orig.conhecida === true && ORIGENS_DA_POSOLOGIA.includes(orig.origem as OrigemDaPosologia) && orig.origem !== 'desconhecida' && texto(orig.criado_em)) {
    original = {
      conhecida: true, origem: orig.origem as OrigemDaPosologia, versao_registro: texto(orig.versao_registro) ? orig.versao_registro : '',
      criado_em: orig.criado_em,
      ...(orig.origem === 'pre_preenchida_pelo_sistema' && ORIGENS_DETALHE.includes(orig.detalhe as OrigemDetalhe) ? { detalhe: orig.detalhe as OrigemDetalhe } : {}),
    };
  }
  const recuperacao = Array.isArray(o.recuperacao)
    ? (o.recuperacao as unknown[]).filter((r): r is { em: string } => !!r && typeof r === 'object' && texto((r as { em?: unknown }).em)).map(r => ({ em: r.em, tipo: 'revisada' as const })).slice(-MAX_RECUPERACOES)
    : [];
  const d = o.declaracao_prescritor as Record<string, unknown> | undefined;
  const alt = o.alteracoes as Record<string, unknown> | undefined;
  return {
    v: VERSAO_PROVENIENCIA, original, recuperacao,
    ...(d && typeof d === 'object' && d.reutilizou_dto === true && texto(d.em) ? { declaracao_prescritor: { reutilizou_dto: true as const, em: d.em, campos: campos(d.campos), vigente: d.vigente === true } } : {}),
    alteracoes: { total: alt && typeof alt.total === 'number' && Number.isFinite(alt.total) && alt.total >= 0 ? Math.floor(alt.total) : 0, campos: campos(alt?.campos) },
    estrutura_dose: ESTADOS.includes(o.estrutura_dose as EstadoIntegridadeDto) ? (o.estrutura_dose as EstadoIntegridadeDto) : 'nao_verificavel',
  };
}

const ultimoEventoDeReutilizacao = (reg: PosologiaRegistrada): string | undefined =>
  (reg.trilha ?? []).slice().reverse().find(e => e.tipo === 'reconfirmacao' || e.tipo === 'reconfirmacao_invalidada')?.tipo;

/**
 * Constrói/atualiza o envelope a partir do registro em memória, do parecer de integridade atual e do envelope anterior (se houver).
 * A proveniência ORIGINAL do envelope anterior nunca é sobrescrita; origem `desconhecida` do registro vira `conhecida:false`.
 */
export function construirProveniencia(reg: PosologiaRegistrada, parecer: ParecerIntegridadeDto, anterior?: ProvenienciaPersistida | null): ProvenienciaPersistida {
  const original: OrigemOriginal = anterior?.original
    ?? (reg.origem !== 'desconhecida'
      ? { conhecida: true, origem: reg.origem, versao_registro: reg.versao_registro, criado_em: reg.criado_em, ...(reg.origem_detalhe ? { detalhe: reg.origem_detalhe } : {}) }
      : { conhecida: false });
  const recuperacao = [...(anterior?.recuperacao ?? [])];
  for (const e of reg.trilha ?? []) {
    if (e.tipo === 'recuperacao' && !recuperacao.some(r => r.em === e.em)) recuperacao.push({ em: e.em, tipo: 'revisada' });
  }
  const ultima = reg.reconfirmacoes_dose?.at(-1);
  const declaracao = ultima
    ? { reutilizou_dto: true as const, em: ultima.em, campos: campos(ultima.campos_reconfirmados), vigente: ultimoEventoDeReutilizacao(reg) === 'reconfirmacao' && parecer.estado !== 'divergente' }
    : anterior?.declaracao_prescritor ? { ...anterior.declaracao_prescritor, vigente: anterior.declaracao_prescritor.vigente && parecer.estado !== 'divergente' } : undefined;
  const editados = reg.edicoes_manuais.filter(e => e.campo !== 'dose_estruturada');
  return {
    v: VERSAO_PROVENIENCIA, original, recuperacao: recuperacao.slice(-MAX_RECUPERACOES),
    ...(declaracao ? { declaracao_prescritor: declaracao } : {}),
    alteracoes: { total: (anterior?.alteracoes.total ?? 0) + editados.length, campos: campos([...(anterior?.alteracoes.campos ?? []), ...editados.map(e => e.campo)]) },
    estrutura_dose: parecer.estado,
  };
}

export const ROTULO_ORIGEM: Record<OrigemDaPosologia, string> = {
  contrato_dose: 'contrato de dose', dose_calculator: 'calculadora de dose (motor C)', recomendacao_texto: 'texto de recomendação',
  digitada_pelo_prescritor: 'digitada pelo prescritor', protocolo_texto: 'texto de protocolo', backend_legado: 'registro legado do servidor',
  importacao_localstorage: 'importação do armazenamento local', desconhecida: 'desconhecida', pre_preenchida_pelo_sistema: 'pré-preenchida pelo sistema',
};
export const ROTULO_ESTRUTURA: Record<EstadoIntegridadeDto, string> = {
  consistente_conforme_origem: 'nenhuma alteração posterior detectada (texto e estrutura NÃO verificados entre si)',
  divergente: 'divergente do texto editado',
  nao_verificavel: 'não verificável (sem metadados)',
  estrutura_indisponivel: 'sem dose estruturada',
};
