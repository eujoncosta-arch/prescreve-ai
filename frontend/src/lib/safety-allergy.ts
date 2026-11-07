// ============================================================
// RM-105.2 — Avaliação EXPLÍCITA de alergias na verificação de segurança
//
// Princípio: ausência de informação sobre alergias NÃO é ausência de alergia.
// Estados distintos (nunca um booleano):
//   nao_informado      — nenhuma informação foi fornecida (a avaliação NÃO ocorreu)
//   ausencia_informada — declaração explícita de "sem alergias conhecidas" (é uma declaração, não uma verificação)
//   avaliada           — há registros e todos os cruzamentos foram conclusivos
//   parcial            — há registros, mas algum cruzamento NÃO foi conclusivo
//   invalida           — registro/estrutura inválida ou contraditória
//   nao_avaliada       — a avaliação falhou ou não foi executada
//
// O cruzamento é feito SOMENTE por identidade molecular: mesma molécula, ou a molécula é componente de
// uma combinação prescrita. NÃO existe, nesta versão, regra de reatividade cruzada entre moléculas ou
// classes (nenhuma foi documentada com fonte): classe, alérgeno desconhecido ou medicamento não
// identificado resultam em `nao_conclusivo` — nunca em "sem risco" nem em alergia confirmada.
// ============================================================

import type { QuickSafetyAlert } from './safety-rules';
import { componentesDeNome, normalizarAlvo } from './safety-targets';

export type StatusAlergiasInformado = 'nao_informado' | 'sem_alergias_conhecidas' | 'informadas';
export type TipoAlergia = 'medicamento' | 'alimento' | 'ambiental' | 'outro';
export type GravidadeAlergia = 'leve' | 'moderada' | 'grave';

export interface RegistroAlergia {
  /** Substância ou medicamento (texto livre, nome ativo, sinônimo ou marca). */
  substancia: string;
  tipo?: TipoAlergia;
  gravidade?: GravidadeAlergia;
  reacao?: string;
  /** Quem informou (ex.: prescritor, paciente, prontuário). Não é inventado: fica vazio se não informado. */
  origem?: string;
  /** Data/hora do registro, quando suportada (ISO 8601). */
  registrado_em?: string;
  /** ID de entidade farmacológica, quando o registro já a identifica. */
  entidade_id?: string | null;
}

export interface AlergiasInput {
  status: StatusAlergiasInformado;
  registros?: RegistroAlergia[];
}

export type EstadoAvaliacaoAlergias = 'nao_informado' | 'ausencia_informada' | 'avaliada' | 'parcial' | 'invalida' | 'nao_avaliada';

export type IdentificacaoAlergeno = 'confirmada' | 'nao_confirmada' | 'classe_farmacologica' | 'desconhecida' | 'nao_aplicavel';

export interface RegistroAlergiaAvaliado {
  indice: number;
  substancia: string;
  valido: boolean;
  motivo_invalido?: string;
  escopo: 'medicamentosa' | 'nao_medicamentosa' | 'indeterminado';
  identificacao_molecular: IdentificacaoAlergeno;
  entidade_id?: string;
  molecula?: string;
  tipo?: TipoAlergia;
  gravidade?: GravidadeAlergia;
  reacao?: string;
  origem?: string;
  registrado_em?: string;
}

export type ResultadoCruzamento =
  | 'correspondencia_molecular'      // mesma molécula (ou componente) — identificação confirmada
  | 'correspondencia_nao_confirmada' // mesma molécula, mas a identificação do alérgeno NÃO está confirmada
  | 'sem_correspondencia_molecular'  // moléculas distintas (reatividade cruzada NÃO avaliada)
  | 'nao_conclusivo';

export type MotivoNaoConclusivo =
  | 'alergeno_nao_identificado'
  | 'alergeno_classe_sem_regra_documentada'
  | 'alergeno_combinacao_componente_indefinido'
  | 'alergeno_ambiguo'
  | 'medicamento_nao_identificado';

export interface CruzamentoAlergia {
  registro_indice: number;
  substancia: string;
  /** Texto do medicamento prescrito (null quando o cruzamento não pôde ser feito por item). */
  item: string | null;
  resultado: ResultadoCruzamento;
  via?: 'mesma_molecula' | 'componente_combinacao';
  motivo?: MotivoNaoConclusivo;
}

export interface AlertaAlergia extends QuickSafetyAlert {
  /** true só quando a identificação do alérgeno E do medicamento está confirmada. */
  confirmada: boolean;
  registro_indice: number;
  item: string;
}

export interface AvaliacaoAlergias {
  estado: EstadoAvaliacaoAlergias;
  registros: RegistroAlergiaAvaliado[];
  cruzamentos: CruzamentoAlergia[];
  alertas: AlertaAlergia[];
  pendencias: string[];
  limitacoes: string[];
  mensagem: string;
}

/** Item prescrito, já resolvido pela verificação molecular. */
export interface ItemPrescritoAlergia {
  texto: string;
  entidade_id?: string;
  molecula?: string;
  /** false quando a molécula não foi identificada com certeza (não reconhecida, ambígua entre moléculas, ID divergente). */
  identificado: boolean;
}

export type SubstanciaResolvida =
  | { tipo: 'molecula'; entidade_id: string; molecula: string; confirmada: boolean; ambigua: boolean }
  | { tipo: 'classe' }
  | { tipo: 'desconhecida' };

export type ResolverSubstancia = (texto: string, entidadeId?: string | null) => SubstanciaResolvida;

export const LIMITACOES_ALERGIA: readonly string[] = Object.freeze([
  'O cruzamento é feito apenas por identidade molecular (mesma molécula ou componente de combinação).',
  'Reatividade cruzada entre moléculas ou classes NÃO é avaliada: nenhuma regra com fonte documentada foi cadastrada.',
  'Alergias não medicamentosas (alimento, ambiental, outro) não são cruzadas com excipientes.',
]);

const TIPOS: readonly string[] = ['medicamento', 'alimento', 'ambiental', 'outro'];
const GRAVIDADES: readonly string[] = ['leve', 'moderada', 'grave'];

function vazia(estado: EstadoAvaliacaoAlergias, mensagem: string, pendencias: string[] = []): AvaliacaoAlergias {
  return { estado, registros: [], cruzamentos: [], alertas: [], pendencias, limitacoes: [...LIMITACOES_ALERGIA], mensagem };
}

/** Avaliação não executada (erro do motor ou entrada inválida). */
export function alergiasNaoAvaliadas(motivo: string): AvaliacaoAlergias {
  return vazia('nao_avaliada', 'Avaliação de alergias NÃO executada: ' + motivo, ['avaliação de alergias não executada']);
}

function validarRegistro(r: unknown): string | null {
  if (!r || typeof r !== 'object') return 'registro não é um objeto';
  const o = r as Record<string, unknown>;
  if (typeof o.substancia !== 'string' || o.substancia.trim() === '') return 'substância ausente ou vazia';
  if (o.substancia.length > 200) return 'substância excede 200 caracteres';
  if (o.tipo !== undefined && (typeof o.tipo !== 'string' || !TIPOS.includes(o.tipo))) return 'tipo inválido';
  if (o.gravidade !== undefined && o.gravidade !== null && (typeof o.gravidade !== 'string' || !GRAVIDADES.includes(o.gravidade))) return 'gravidade inválida';
  if (o.reacao !== undefined && typeof o.reacao !== 'string') return 'reação inválida';
  if (o.origem !== undefined && typeof o.origem !== 'string') return 'origem inválida';
  if (o.entidade_id !== undefined && o.entidade_id !== null && typeof o.entidade_id !== 'string') return 'entidade_id inválido';
  if (o.registrado_em !== undefined) {
    if (typeof o.registrado_em !== 'string' || Number.isNaN(Date.parse(o.registrado_em))) return 'data do registro inválida';
  }
  return null;
}

export function avaliarAlergias(entrada: unknown, itens: ItemPrescritoAlergia[], resolver: ResolverSubstancia): AvaliacaoAlergias {
  if (entrada === undefined || entrada === null) {
    return vazia('nao_informado', 'Alergias NÃO informadas: a avaliação não ocorreu. Ausência de informação não significa ausência de alergia.', ['alergias não informadas']);
  }
  if (typeof entrada !== 'object') {
    return vazia('invalida', 'Informação de alergias inválida (estrutura não reconhecida): a avaliação não ocorreu.', ['informação de alergias inválida']);
  }
  const e = entrada as Record<string, unknown>;
  const status = e.status;
  const regs = e.registros;
  if (status !== 'nao_informado' && status !== 'sem_alergias_conhecidas' && status !== 'informadas') {
    return vazia('invalida', 'Informação de alergias inválida (status desconhecido): a avaliação não ocorreu.', ['informação de alergias inválida']);
  }
  if (regs !== undefined && !Array.isArray(regs)) {
    return vazia('invalida', 'Informação de alergias inválida (registros não é uma lista): a avaliação não ocorreu.', ['informação de alergias inválida']);
  }
  const lista = (regs ?? []) as unknown[];

  if (status === 'nao_informado') {
    if (lista.length > 0) return vazia('invalida', 'Informação de alergias contraditória: status "não informado" com registros presentes.', ['informação de alergias contraditória']);
    return vazia('nao_informado', 'Alergias NÃO informadas: a avaliação não ocorreu. Ausência de informação não significa ausência de alergia.', ['alergias não informadas']);
  }
  if (status === 'sem_alergias_conhecidas') {
    if (lista.length > 0) return vazia('invalida', 'Informação de alergias contraditória: "sem alergias conhecidas" com registros presentes.', ['informação de alergias contraditória']);
    return vazia('ausencia_informada', 'Ausência de alergias INFORMADA (declaração do informante; não é uma verificação independente).');
  }
  if (lista.length === 0) {
    return vazia('invalida', 'Informação de alergias inválida: status "informadas" sem nenhum registro.', ['informação de alergias inválida']);
  }

  const registros: RegistroAlergiaAvaliado[] = [];
  const cruzamentos: CruzamentoAlergia[] = [];
  const alertas: AlertaAlergia[] = [];

  lista.forEach((raw, indice) => {
    const motivo = validarRegistro(raw);
    if (motivo) {
      const s = raw && typeof raw === 'object' && typeof (raw as Record<string, unknown>).substancia === 'string' ? ((raw as Record<string, unknown>).substancia as string) : '';
      registros.push({ indice, substancia: s, valido: false, motivo_invalido: motivo, escopo: 'indeterminado', identificacao_molecular: 'desconhecida' });
      return;
    }
    const r = raw as {
      substancia: string; tipo?: TipoAlergia; gravidade?: GravidadeAlergia; reacao?: string; origem?: string; registrado_em?: string; entidade_id?: string | null;
    };
    const base = { indice, substancia: r.substancia, valido: true, tipo: r.tipo, gravidade: r.gravidade ?? undefined, reacao: r.reacao, origem: r.origem, registrado_em: r.registrado_em };

    if (r.tipo && r.tipo !== 'medicamento') {
      registros.push({ ...base, escopo: 'nao_medicamentosa', identificacao_molecular: 'nao_aplicavel' });
      return;
    }

    const sub = resolver(r.substancia, r.entidade_id);
    if (sub.tipo === 'classe') {
      registros.push({ ...base, escopo: 'medicamentosa', identificacao_molecular: 'classe_farmacologica' });
      cruzamentos.push({ registro_indice: indice, substancia: r.substancia, item: null, resultado: 'nao_conclusivo', motivo: 'alergeno_classe_sem_regra_documentada' });
      return;
    }
    if (sub.tipo === 'desconhecida') {
      registros.push({ ...base, escopo: 'indeterminado', identificacao_molecular: 'desconhecida' });
      cruzamentos.push({ registro_indice: indice, substancia: r.substancia, item: null, resultado: 'nao_conclusivo', motivo: 'alergeno_nao_identificado' });
      return;
    }
    if (sub.ambigua) {
      registros.push({ ...base, escopo: 'medicamentosa', identificacao_molecular: 'nao_confirmada' });
      cruzamentos.push({ registro_indice: indice, substancia: r.substancia, item: null, resultado: 'nao_conclusivo', motivo: 'alergeno_ambiguo' });
      return;
    }

    registros.push({
      ...base, escopo: 'medicamentosa', identificacao_molecular: sub.confirmada ? 'confirmada' : 'nao_confirmada',
      entidade_id: sub.entidade_id, molecula: sub.molecula,
    });

    const alergenoNorm = normalizarAlvo(sub.molecula);
    const alergenoComps = componentesDeNome(alergenoNorm);
    const alergenoEhCombinacao = alergenoComps.length > 1;

    for (const item of itens) {
      if (!item.identificado || !item.molecula) {
        cruzamentos.push({ registro_indice: indice, substancia: r.substancia, item: item.texto, resultado: 'nao_conclusivo', motivo: 'medicamento_nao_identificado' });
        continue;
      }
      const itemNorm = normalizarAlvo(item.molecula);
      const itemComps = componentesDeNome(itemNorm);
      let via: 'mesma_molecula' | 'componente_combinacao' | null = null;
      if (itemNorm === alergenoNorm) via = 'mesma_molecula';
      else if (!alergenoEhCombinacao && itemComps.includes(alergenoNorm)) via = 'componente_combinacao';

      if (!via) {
        if (alergenoEhCombinacao && alergenoComps.some(c => itemComps.includes(c))) {
          cruzamentos.push({ registro_indice: indice, substancia: r.substancia, item: item.texto, resultado: 'nao_conclusivo', motivo: 'alergeno_combinacao_componente_indefinido' });
        } else {
          cruzamentos.push({ registro_indice: indice, substancia: r.substancia, item: item.texto, resultado: 'sem_correspondencia_molecular' });
        }
        continue;
      }

      const confirmada = sub.confirmada;
      cruzamentos.push({ registro_indice: indice, substancia: r.substancia, item: item.texto, resultado: confirmada ? 'correspondencia_molecular' : 'correspondencia_nao_confirmada', via });
      const gravTxt = r.gravidade ? `gravidade ${r.gravidade}` : 'gravidade não informada';
      const reacTxt = r.reacao ? `; reação: ${r.reacao}` : '';
      const origTxt = r.origem ? r.origem : 'não informada';
      alertas.push({
        id: `alergia-${indice}-${item.entidade_id ?? normalizarAlvo(item.texto)}`,
        tipo: 'alergia',
        severidade: confirmada ? 'critical' : 'warning',
        titulo: confirmada
          ? `Alergia registrada: ${r.substancia} × ${item.texto}`
          : `Possível correspondência com alergia registrada (identificação NÃO confirmada): ${r.substancia} × ${item.texto}`,
        descricao: `Há registro de alergia a "${r.substancia}" (${gravTxt}${reacTxt}). O item prescrito contém o mesmo princípio ativo (${sub.molecula}${via === 'componente_combinacao' ? ', como componente de combinação' : ''}). Origem do registro: ${origTxt}.`
          + (confirmada ? '' : ' A identificação do alérgeno registrado não está confirmada.'),
        acao: 'Confirmar o registro com o paciente e reavaliar a prescrição antes de manter o medicamento.',
        confirmada,
        registro_indice: indice,
        item: item.texto,
      });
    }
  });

  const invalidos = registros.filter(x => !x.valido);
  const naoConclusivos = cruzamentos.filter(c => c.resultado === 'nao_conclusivo');
  const pendencias: string[] = [];
  for (const x of invalidos) pendencias.push(`registro ${x.indice + 1} inválido (${x.motivo_invalido})`);
  for (const c of naoConclusivos) {
    pendencias.push(`"${c.substancia}"${c.item ? ' × ' + c.item : ''}: avaliação não conclusiva (${c.motivo})`);
  }

  let estado: EstadoAvaliacaoAlergias;
  if (invalidos.length) estado = 'invalida';
  else if (naoConclusivos.length) estado = 'parcial';
  else estado = 'avaliada';

  const mensagem = estado === 'invalida'
    ? 'Registros de alergia inválidos: a avaliação não é confiável. ' + pendencias.join('; ') + '.'
    : estado === 'parcial'
      ? 'Alergias avaliadas PARCIALMENTE: há cruzamentos não conclusivos. Ausência de alerta de alergia não indica ausência de risco. ' + pendencias.join('; ') + '.'
      : alertas.length
        ? `Alergias avaliadas por identidade molecular: ${alertas.length} correspondência(s) encontrada(s).`
        : 'Alergias avaliadas por identidade molecular: nenhuma correspondência encontrada (reatividade cruzada não avaliada).';

  return { estado, registros, cruzamentos, alertas, pendencias, limitacoes: [...LIMITACOES_ALERGIA], mensagem };
}

/**
 * RM-105.2.1 — Rótulos da identificação do alérgeno. Fonte ÚNICA para a tela e para o anexo técnico.
 * Distinguem: identificado molecularmente × não identificado × classe (relevante, ainda não avaliada
 * molecularmente) × não medicamentosa (fora do escopo do cruzamento molecular atual).
 */
export const ROTULO_IDENTIFICACAO_ALERGENO: Record<IdentificacaoAlergeno, string> = {
  confirmada: 'alérgeno identificado molecularmente (identificação confirmada)',
  nao_confirmada: 'identificação molecular NÃO confirmada — avaliação não conclusiva',
  classe_farmacologica: 'alergia a CLASSE farmacológica — informação relevante AINDA NÃO avaliada molecularmente (não há regra de reatividade cruzada)',
  desconhecida: 'alérgeno NÃO identificado molecularmente — não avaliado',
  nao_aplicavel: 'alergia NÃO medicamentosa — fora do escopo do cruzamento molecular atual; excipientes não são avaliados',
};

/**
 * Frases de transparência da avaliação de alergias (nunca confundir "não avaliado" com "sem risco").
 * Só descreve; não cria regra nem altera gravidade.
 */
export function transparenciaAlergias(a: AvaliacaoAlergias): string[] {
  const linhas: string[] = [];
  const naoAvaliados = a.registros.filter(r => r.valido && (r.identificacao_molecular === 'classe_farmacologica' || r.identificacao_molecular === 'desconhecida' || r.identificacao_molecular === 'nao_confirmada'));
  const naoMed = a.registros.filter(r => r.valido && r.identificacao_molecular === 'nao_aplicavel');
  const invalidos = a.registros.filter(r => !r.valido);
  if (a.estado === 'nao_informado') linhas.push('Alergias não informadas: nada foi avaliado. A ausência de avaliação não indica ausência de risco.');
  if (a.estado === 'ausencia_informada') linhas.push('"Sem alergias conhecidas" é uma declaração do informante; não foi verificada de forma independente.');
  if (naoAvaliados.length) linhas.push('Há alergia(s) registrada(s) NÃO avaliada(s) molecularmente: ' + naoAvaliados.map(r => r.substancia).join(', ') + '. A ausência de alerta de alergia não indica ausência de risco.');
  if (invalidos.length) linhas.push('Há registro(s) de alergia inválido(s): a avaliação não é confiável.');
  if (naoMed.length) linhas.push('Alergia(s) não medicamentosa(s) (' + naoMed.map(r => r.substancia).join(', ') + ') ficam fora do cruzamento molecular atual; a avaliação de excipientes não é realizada.');
  return linhas;
}

/** Estado do contexto "alergias" no contrato de cobertura contextual. */
export function estadoContextoDeAlergias(a: AvaliacaoAlergias): { estado: 'informado' | 'nao_informado' | 'invalido' | 'nao_avaliado'; observacao: string } {
  switch (a.estado) {
    case 'ausencia_informada': return { estado: 'informado', observacao: 'Ausência de alergias informada (declaração); nenhum cruzamento necessário.' };
    case 'avaliada': return { estado: 'informado', observacao: 'Alergias registradas e cruzadas por identidade molecular (reatividade cruzada não avaliada).' };
    case 'nao_informado': return { estado: 'nao_informado', observacao: 'Alergias não informadas: a avaliação NÃO ocorreu (ausência de informação ≠ ausência de alergia).' };
    case 'invalida': return { estado: 'invalido', observacao: 'Informação de alergias inválida ou contraditória: a avaliação NÃO ocorreu de forma confiável.' };
    case 'parcial': return { estado: 'nao_avaliado', observacao: 'Cruzamento de alergias NÃO conclusivo para parte dos registros/medicamentos.' };
    default: return { estado: 'nao_avaliado', observacao: 'Avaliação de alergias não executada.' };
  }
}
