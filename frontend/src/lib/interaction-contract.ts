// ============================================================
// RM-106 — Contrato de rastreabilidade e classificação das interações
//
// A matriz cadastrada (870 interações) só tem `with` + gravidade + descrição por interação: não há mecanismo,
// conduta, fonte nem status de validação estruturados. Em vez de criar uma estrutura paralela, este módulo
// adiciona uma CAMADA ADITIVA sobre o contrato existente:
//   - metadados opcionais por interação (registro de fundamentação), com padrão EXPLÍCITO
//     `pendente_validacao_clinica` quando não há fonte registrada;
//   - classificação do resultado da avaliação (sete situações);
//   - descrição do que NÃO foi avaliado.
// Nada aqui altera gravidade, conduta ou texto de uma interação existente.
// ============================================================

import type { TipoCorrespondencia } from './interaction-targets';
import { normalizarAlvo } from './safety-targets';

/** Situação de validação da interação. Só `fonte_oficial_registrada` exige fonte registrada e verificada. */
export type StatusValidacaoInteracao = 'fonte_oficial_registrada' | 'pendente_validacao_clinica';

/** As sete situações do resultado (RM-106 §8). */
export type ClassificacaoInteracao =
  | 'confirmada'                    // 1. identificada e confirmada (molécula identificada + fonte oficial registrada)
  | 'pendente_validacao'            // 2. identificada, mas com evidência/validação pendente
  | 'por_classe'                    // 3. correspondência farmacológica por classe
  | 'por_grupo'                     // 4. correspondência por grupo farmacológico
  | 'medicamento_nao_identificado'  // 5. medicamento não identificado
  | 'combinacao_nao_avaliada'       // 6. combinação não avaliada
  | 'nao_encontrada';               // 7. interação não encontrada entre as regras cadastradas (NÃO é prova de ausência)

export interface FonteInteracao {
  tipo: 'bula_oficial' | 'orgao_regulador' | 'diretriz' | 'revisao_sistematica' | 'estudo_clinico' | 'base_farmacologica';
  /** Referência humana (título, órgão, produto). Nunca inventada. */
  referencia: string;
  url?: string;
  secao?: string;
  /** Data de acesso/versão da fonte (AAAA-MM-DD). */
  acessado_em?: string;
  /** Trecho da fonte que sustenta a interação (curto, literal). */
  trecho?: string;
  // ── RM-106.1: campos exigidos para uma fonte poder SUSTENTAR a classificação `confirmada` ──
  /** Instituição ou órgão responsável (ex.: regulador ou fabricante titular do rótulo). */
  instituicao?: string;
  /** Documento (título do rótulo/comunicado/diretriz). */
  documento?: string;
  /** Versão ou data de revisão do DOCUMENTO (não confundir com a data de acesso). */
  versao_documento?: string;
  /** Par de medicamentos (ou classes) ao qual a afirmação da fonte se refere, exatamente como sustentado. */
  par_relacionado?: string;
  /** Limitações da fonte (ex.: não cobre a gravidade cadastrada; texto lido por ferramenta, não do PDF oficial). */
  limitacoes_da_fonte?: string[];
  /** Estado de revisão da fonte. `verificada` = seção e trecho conferidos contra o documento aberto (revisão técnica, NÃO clínica). */
  estado_de_revisao?: 'candidata' | 'verificada';
}

/** Campos que faltam para uma fonte poder sustentar `confirmada` (lista vazia = fonte completa). */
export function camposFaltantesDaFonte(f: FonteInteracao | undefined): string[] {
  if (!f) return ['fonte'];
  const falta: string[] = [];
  const vazio = (v: string | undefined) => typeof v !== 'string' || v.trim() === '';
  if (vazio(f.instituicao)) falta.push('instituicao');
  if (vazio(f.documento)) falta.push('documento');
  if (vazio(f.referencia)) falta.push('referencia');
  if (vazio(f.url)) falta.push('url');
  if (vazio(f.versao_documento)) falta.push('versao_documento');
  if (vazio(f.secao)) falta.push('secao');
  if (vazio(f.trecho)) falta.push('trecho');
  if (vazio(f.par_relacionado)) falta.push('par_relacionado');
  if (vazio(f.acessado_em)) falta.push('acessado_em');
  if (!Array.isArray(f.limitacoes_da_fonte)) falta.push('limitacoes_da_fonte');
  if (f.estado_de_revisao !== 'verificada') falta.push('estado_de_revisao=verificada');
  return falta;
}

export interface MetadadosInteracao {
  status_validacao: StatusValidacaoInteracao;
  mecanismo?: string;
  efeito_clinico?: string;
  conduta?: string;
  nivel_evidencia?: string;
  fonte?: FonteInteracao;
  limitacoes: string[];
}

export const SEM_FONTE: MetadadosInteracao = Object.freeze({
  status_validacao: 'pendente_validacao_clinica',
  limitacoes: ['Nenhuma fonte bibliográfica está registrada para esta interação; gravidade, descrição e conduta aguardam validação clínica.'],
}) as MetadadosInteracao;

/** Registro de fundamentação por (entidade, alvo cadastrado). Só entra aqui o que tem fonte VERIFICADA. */
export const REGISTRO_DE_FUNDAMENTACAO: Record<string, MetadadosInteracao> = {};

export function chaveFundamentacao(entidadeId: string, comTexto: string): string {
  return `${entidadeId}|${normalizarAlvo(comTexto)}`;
}

export function metadadosDaInteracao(entidadeId: string, comTexto: string): MetadadosInteracao {
  const m = REGISTRO_DE_FUNDAMENTACAO[chaveFundamentacao(entidadeId, comTexto)];
  if (!m) return SEM_FONTE;
  // RM-106.1: entrada com fonte incompleta NUNCA vale como registrada: rebaixada para pendente, com o motivo explícito.
  const falta = m.status_validacao === 'fonte_oficial_registrada' ? camposFaltantesDaFonte(m.fonte) : [];
  if (falta.length) return { ...m, status_validacao: 'pendente_validacao_clinica', limitacoes: [...m.limitacoes, 'Fonte registrada INCOMPLETA (faltam: ' + falta.join(', ') + '): tratada como pendente de validação clínica.'] };
  return m;
}

const TIPOS_MOLECULARES: ReadonlySet<TipoCorrespondencia> = new Set<TipoCorrespondencia>(['molecula_exata', 'sinonimo_autorizado', 'componente_combinacao', 'nome_base_do_ativo', 'enumeracao_explicita']);

/** Classifica uma interação identificada (situações 1 a 4). */
export function classificarInteracao(tipo: TipoCorrespondencia, meta: MetadadosInteracao): ClassificacaoInteracao {
  if (tipo === 'classe_farmacologica') return 'por_classe';
  if (tipo === 'grupo_aprovado') return 'por_grupo';
  // RM-106.1: `confirmada` exige status registrado E fonte COMPLETA (seção, trecho, URL, versão, revisão verificada).
  if (TIPOS_MOLECULARES.has(tipo) && meta.status_validacao === 'fonte_oficial_registrada' && camposFaltantesDaFonte(meta.fonte).length === 0) return 'confirmada';
  return 'pendente_validacao';
}

export const ROTULO_CLASSIFICACAO: Record<ClassificacaoInteracao, string> = {
  confirmada: 'Interação identificada e confirmada (fonte oficial registrada)',
  pendente_validacao: 'Interação identificada, validação clínica pendente',
  por_classe: 'Correspondência por CLASSE farmacológica (validação pendente)',
  por_grupo: 'Correspondência por GRUPO farmacológico (validação pendente)',
  medicamento_nao_identificado: 'Medicamento não identificado — interação não avaliada',
  combinacao_nao_avaliada: 'Combinação não avaliada',
  nao_encontrada: 'Nenhuma interação encontrada entre as regras cadastradas (não prova ausência de interação)',
};

export const ROTULO_CORRESPONDENCIA: Record<TipoCorrespondencia, string> = {
  molecula_exata: 'molécula exata',
  sinonimo_autorizado: 'sinônimo/variante autorizado',
  componente_combinacao: 'componente de combinação',
  nome_base_do_ativo: 'nome base do princípio ativo (sal/forma)',
  enumeracao_explicita: 'membro enumerado no próprio cadastro',
  classe_farmacologica: 'classe farmacológica (lista controlada ATC)',
  grupo_aprovado: 'grupo farmacológico (definição explícita ATC)',
};

export interface RegistroInteracaoAvaliada {
  alerta_id: string;
  entidade_a: string;
  entidade_b: string;
  /** Texto do campo `with` da interação cadastrada que gerou o alerta. */
  alvo_cadastrado: string;
  tipo_correspondencia: TipoCorrespondencia;
  classificacao: ClassificacaoInteracao;
  gravidade_cadastrada: 'leve' | 'moderada' | 'grave' | 'contraindicado';
  status_validacao: StatusValidacaoInteracao;
  fonte: FonteInteracao | null;
  limitacoes: string[];
  /** Presente quando as duas direções (A→B e B→A) estão cadastradas com gravidades diferentes: vale a mais grave. */
  divergencia_de_gravidade?: { a_para_b: string; b_para_a: string };
}

export interface ParSemRegra {
  a: string;
  b: string;
  /** Interações cadastradas de A ou B com alvo NÃO resolvido (podem, na realidade, incluir o outro medicamento). */
  interacoes_com_alvo_nao_resolvido: number;
}

export interface ResumoInteracoes {
  /** Pares de medicamentos IDENTIFICADOS e avaliados. */
  pares_avaliados: number;
  /** Alertas de interação por classificação (situações 1 a 4). */
  por_classificacao: Record<ClassificacaoInteracao, number>;
  /** Situação 7: pares sem regra encontrada. Ausência de regra NÃO é ausência de interação. */
  pares_sem_regra_encontrada: ParSemRegra[];
  /** Situação 6: combinações que não puderam ser avaliadas (cópia resumida de `combinacoes_nao_avaliadas`). */
  combinacoes_nao_avaliadas: number;
  /** Situação 5: entradas não identificadas. */
  medicamentos_nao_identificados: number;
  nota: string;
}

export const NOTA_SEM_REGRA = 'Interação não encontrada entre as regras cadastradas NÃO é prova de ausência de interação: a matriz cadastrada é parcial e algumas interações têm alvo não resolvido.';

export function resumoVazio(): ResumoInteracoes {
  return {
    pares_avaliados: 0,
    por_classificacao: { confirmada: 0, pendente_validacao: 0, por_classe: 0, por_grupo: 0, medicamento_nao_identificado: 0, combinacao_nao_avaliada: 0, nao_encontrada: 0 },
    pares_sem_regra_encontrada: [], combinacoes_nao_avaliadas: 0, medicamentos_nao_identificados: 0, nota: NOTA_SEM_REGRA,
  };
}
