// ============================================================
// RM-105/105.2 — Cobertura CONTEXTUAL da verificação de segurança
//
// Contrato independente da cobertura molecular (RM-104). "Moléculas reconhecidas" não
// significa "paciente avaliado": cada dado de contexto que uma regra exige tem um estado
// próprio. Este módulo NÃO cria regras nem contraindicações: só descreve, para as regras
// que já existem em `runSafetyCheck`, se o dado de que dependem foi fornecido e é coerente.
//
// Estados:
//   informado      — valor presente e válido
//   nao_informado  — ausente (undefined/null): a regra dependente NÃO foi avaliada; ausência ≠ "não"
//   nao_aplicavel  — o dado não é usado nesta verificação (ex.: K+ sem antagonista de aldosterona)
//   invalido       — presente, mas inutilizável ou incoerente (NaN, negativo, tipo errado, contradição); a regra NÃO foi avaliada
//   nao_avaliado   — a avaliação correspondente não foi executada ou não foi conclusiva
//
// RM-105.2: `false`, `null`, vazio ou propriedade ausente NUNCA significam "sem risco". Os limites de
// validade usados abaixo (idade 0–120 anos, peso 0–500 kg) são limites de VALIDADE DE ENTRADA para
// detectar erro de digitação/unidade — não são critérios clínicos.
// ============================================================

import { formatarIdade, normalizarIdade, type ResultadoIdade } from './age-contract';
import type { PatientPopulation } from './dose-calculator';

export type EstadoDado = 'informado' | 'nao_informado' | 'nao_aplicavel' | 'invalido' | 'nao_avaliado';

export type CampoContexto = 'gestacao' | 'lactacao' | 'idade_idoso' | 'funcao_renal' | 'potassio' | 'alergias' | 'peso';

export interface ItemContexto {
  campo: CampoContexto;
  estado: EstadoDado;
  /** Regras existentes de `runSafetyCheck` que dependem deste dado. */
  regras_dependentes: string[];
  /** true quando alguma regra exige o dado; só campos exigidos bloqueiam a avaliação integral. */
  exigido: boolean;
  observacao: string;
}

/** Idade normalizada (RM-105.2.2): unidade informada, canônica (dias) e conversões rastreáveis. */
export interface IdadeResumo {
  texto: string;
  unidade_informada: 'dias' | 'meses' | 'anos';
  dias: number;
  meses: number;
  anos: number;
  faixa: PatientPopulation;
  conversoes: string[];
  /** true quando veio do campo legado `idade_anos` (sem unidade explícita no contrato). */
  formato_legado: boolean;
}

export interface CoberturaContextual {
  itens: ItemContexto[];
  /** Campos EXIGIDOS cujo estado impede a avaliação (nao_informado, invalido ou nao_avaliado). */
  pendencias: CampoContexto[];
  /** Incoerências detectadas entre os dados informados (ex.: gestação para sexo masculino). */
  inconsistencias: string[];
  /** Limitações de precisão da representação dos dados (ex.: idade só em anos). Não são pendências: descrevem o que a avaliação NÃO distingue. */
  limitacoes: string[];
  /** Idade normalizada, quando informada e válida (RM-105.2.2). */
  idade?: IdadeResumo;
  /** true somente se nenhum campo exigido estiver pendente. */
  completa: boolean;
}

export interface OpcoesContexto {
  /** Há antagonista de aldosterona entre as entradas (o K+ só é exigido nesse caso). */
  usaARM: boolean;
  /** Estado do contexto de alergias, derivado da avaliação de alergias (RM-105.2). Ausente = não avaliado. */
  alergias?: { estado: EstadoDado; observacao: string };
}

/** Nomes legíveis dos campos de contexto (usados em mensagens, tela e anexo). */
export const ROTULO_CAMPO: Record<CampoContexto, string> = {
  gestacao: 'gestação', lactacao: 'lactação', idade_idoso: 'idade', funcao_renal: 'função renal', potassio: 'potássio', alergias: 'alergias', peso: 'peso',
};

/**
 * Faixa pediátrica/neonatal SEM estratificação específica nas regras de segurança (RM-105.2.2).
 * Com a idade em unidade explícita (dias/meses/anos) a idade é representada com precisão, mas a
 * verificação de segurança só possui uma regra que usa a idade (geriátrica, ≥ 65 anos): não há regras
 * pediátricas ou neonatais de interação, contraindicação, gestação/lactação ou ajuste renal por idade.
 * Este texto descreve uma limitação de COBERTURA; nenhuma regra clínica foi criada para resolvê-la.
 */
export const LIMITACAO_IDADE_PEDIATRICA = 'Faixa etária pediátrica/neonatal sem estratificação específica: a verificação de segurança não possui regras por faixa abaixo de 65 anos (só a regra geriátrica usa a idade); não há regras pediátricas ou neonatais de interação, contraindicação, gestação/lactação ou ajuste renal por idade. A faixa exibida é apenas a classificação populacional do cálculo de dose.';

/** Idade recebida pelo campo legado numérico `idade_anos` (sem unidade explícita no contrato). */
export const LIMITACAO_IDADE_LEGADA = 'Idade recebida como número em anos pelo campo legado (sem unidade explícita no contrato): dias e meses não são representados nesse formato. Use { valor, unidade }.';

const PESO_MAX_KG = 500;

function estadoBooleano(v: unknown): EstadoDado {
  if (v === undefined || v === null) return 'nao_informado';
  return typeof v === 'boolean' ? 'informado' : 'invalido';
}

function estadoNumero(v: unknown, minimoExclusivo: boolean): EstadoDado {
  if (v === undefined || v === null) return 'nao_informado';
  if (typeof v !== 'number' || !Number.isFinite(v)) return 'invalido';
  return (minimoExclusivo ? v > 0 : v >= 0) ? 'informado' : 'invalido';
}

const OBS: Record<EstadoDado, string> = {
  informado: 'Dado informado.',
  nao_informado: 'Dado não informado: a regra dependente NÃO foi avaliada (ausência não significa "não").',
  nao_aplicavel: 'Dado não usado nesta verificação.',
  invalido: 'Dado inválido: a regra dependente NÃO foi avaliada.',
  nao_avaliado: 'A avaliação correspondente não foi executada ou não foi conclusiva.',
};

/**
 * Resolve a idade da entrada: `idade` ({ valor, unidade }) tem prioridade; `idade_anos` é o formato legado
 * (interpretado SEMPRE como anos, por ser o nome do campo). Valor solto sem unidade nunca é interpretado.
 */
export function resolverIdadeDaEntrada(entrada: unknown): { resultado: ResultadoIdade; legada: boolean } {
  const i = (entrada && typeof entrada === 'object' ? entrada : {}) as Record<string, unknown>;
  const temNova = i.idade !== undefined && i.idade !== null;
  const temLegada = i.idade_anos !== undefined && i.idade_anos !== null;
  if (temNova) {
    const r = normalizarIdade(i.idade);
    if (temLegada && r.estado === 'informada') {
      const l = normalizarIdade({ valor: i.idade_anos, unidade: 'anos' });
      if (l.estado !== 'informada' || Math.abs(l.idade.anos - r.idade.anos) > 1e-9) {
        return { resultado: { estado: 'invalida', motivo: 'valor_invalido', detalhe: 'idade e idade_anos contraditórios: informe apenas um dos dois.' }, legada: false };
      }
    }
    return { resultado: r, legada: false };
  }
  if (temLegada) return { resultado: normalizarIdade({ valor: i.idade_anos, unidade: 'anos' }), legada: true };
  return { resultado: { estado: 'nao_informada' }, legada: false };
}

/** Indicador geriátrico para a regra existente: idade válida (com unidade); senão o booleano `idoso`. Nunca assume "não idoso". */
export function derivarIdoso(entrada: unknown): boolean | undefined {
  const i = (entrada && typeof entrada === 'object' ? entrada : {}) as Record<string, unknown>;
  const { resultado } = resolverIdadeDaEntrada(i);
  if (resultado.estado === 'informada') return resultado.idade.idoso;
  if (resultado.estado === 'invalida') return undefined; // idade fornecida porém inválida/sem unidade: não deriva nada
  return typeof i.idoso === 'boolean' ? i.idoso : undefined;
}

/** Descreve a cobertura contextual de uma entrada (qualquer forma: nunca lança exceção). */
export function avaliarCoberturaContextual(entrada: unknown, opcoes: OpcoesContexto): CoberturaContextual {
  const i = (entrada && typeof entrada === 'object' ? entrada : {}) as Record<string, unknown>;
  const inconsistencias: string[] = [];
  const limitacoes: string[] = [];
  const sexo = i.sexo;

  let gestacao = estadoBooleano(i.gestante);
  let lactacao = estadoBooleano(i.lactante);
  if (sexo !== undefined && sexo !== null && sexo !== 'M' && sexo !== 'F') {
    inconsistencias.push('sexo com valor inválido (esperado "M" ou "F")');
  }
  if (sexo === 'M' && i.gestante === true) { gestacao = 'invalido'; inconsistencias.push('gestação informada para paciente do sexo masculino'); }
  if (sexo === 'M' && i.lactante === true) { lactacao = 'invalido'; inconsistencias.push('lactação informada para paciente do sexo masculino'); }

  let idade: EstadoDado;
  let idadeObs: string | null = null;
  let idadeResumo: IdadeResumo | undefined;
  const { resultado: idadeRes, legada } = resolverIdadeDaEntrada(i);
  if (idadeRes.estado === 'invalida') {
    idade = 'invalido';
    idadeObs = idadeRes.detalhe + ' A regra geriátrica NÃO foi avaliada.';
    inconsistencias.push(idadeRes.detalhe);
  } else if (idadeRes.estado === 'informada') {
    const a = idadeRes.idade;
    if (typeof i.idoso === 'boolean' && i.idoso !== a.idoso) {
      idade = 'invalido';
      idadeObs = 'Idade e indicador "idoso" contraditórios: a regra geriátrica NÃO foi avaliada.';
      inconsistencias.push('idade e indicador "idoso" contraditórios');
    } else {
      idade = 'informado';
      idadeObs = `Idade informada: ${formatarIdade(a)} (≈ ${Number(a.anos.toFixed(4))} anos; faixa ${a.faixa}).`;
      idadeResumo = { texto: formatarIdade(a), unidade_informada: a.unidade, dias: a.dias, meses: a.meses, anos: a.anos, faixa: a.faixa, conversoes: a.conversoes, formato_legado: legada };
      if (a.anos < 18) limitacoes.push(LIMITACAO_IDADE_PEDIATRICA);
      if (legada) limitacoes.push(LIMITACAO_IDADE_LEGADA);
    }
  } else {
    idade = estadoBooleano(i.idoso);
  }

  const crcl = estadoNumero(i.crclValue, false);
  const k = opcoes.usaARM ? estadoNumero(i.potassiumLevel, true) : 'nao_aplicavel';

  let peso: EstadoDado = 'nao_aplicavel';
  let pesoObs = 'Peso não é usado por esta verificação (é usado nas calculadoras de dose).';
  if (i.peso_kg !== undefined && i.peso_kg !== null) {
    const p = i.peso_kg;
    if (typeof p !== 'number' || !Number.isFinite(p) || p <= 0 || p > PESO_MAX_KG) {
      peso = 'invalido';
      pesoObs = `Peso inválido ou fora do intervalo de validade de entrada (0–${PESO_MAX_KG} kg; verificar unidade). Não é usado por esta verificação.`;
      inconsistencias.push('peso inválido ou fora do intervalo de validade (0–' + PESO_MAX_KG + ' kg; verificar unidade)');
    } else {
      peso = 'informado';
      pesoObs = 'Peso informado e válido; não é usado por esta verificação (é usado nas calculadoras de dose).';
    }
  }

  const al = opcoes.alergias ?? { estado: 'nao_avaliado' as EstadoDado, observacao: 'Avaliação de alergias não executada.' };

  const itens: ItemContexto[] = [
    { campo: 'gestacao', estado: gestacao, regras_dependentes: ['contraindicação/risco na gestação (seção 3)'], exigido: true, observacao: gestacao === 'invalido' && sexo === 'M' ? 'Gestação incompatível com o sexo informado: a regra dependente NÃO foi avaliada.' : OBS[gestacao] },
    { campo: 'lactacao', estado: lactacao, regras_dependentes: ['contraindicação na lactação (seção 4)'], exigido: true, observacao: lactacao === 'invalido' && sexo === 'M' ? 'Lactação incompatível com o sexo informado: a regra dependente NÃO foi avaliada.' : OBS[lactacao] },
    { campo: 'idade_idoso', estado: idade, regras_dependentes: ['alertas geriátricos (seção 5)'], exigido: true, observacao: idadeObs ?? OBS[idade] },
    { campo: 'funcao_renal', estado: crcl, regras_dependentes: ['ajuste/contraindicação renal (seção 6)', 'ARM com K+ e TFG (7a)'], exigido: true, observacao: OBS[crcl] },
    { campo: 'potassio', estado: k, regras_dependentes: ['pré-requisito de K+ para antagonista de aldosterona (7a)'], exigido: opcoes.usaARM, observacao: OBS[k] },
    { campo: 'alergias', estado: al.estado, regras_dependentes: ['correspondência molecular entre alergia registrada e medicamento prescrito (RM-105.2)'], exigido: true, observacao: al.observacao },
    { campo: 'peso', estado: peso, regras_dependentes: [], exigido: false, observacao: pesoObs },
  ];

  const pendencias = itens
    .filter(it => it.exigido && (it.estado === 'nao_informado' || it.estado === 'invalido' || it.estado === 'nao_avaliado'))
    .map(it => it.campo);
  return { itens, pendencias, inconsistencias, limitacoes, ...(idadeResumo ? { idade: idadeResumo } : {}), completa: pendencias.length === 0 };
}

/** Todos os campos como não avaliados — usado quando a verificação falhou ou a entrada é inválida. */
export function coberturaContextualNaoAvaliada(): CoberturaContextual {
  const campos: CampoContexto[] = ['gestacao', 'lactacao', 'idade_idoso', 'funcao_renal', 'potassio', 'alergias', 'peso'];
  const itens: ItemContexto[] = campos.map(campo => ({ campo, estado: 'nao_avaliado', regras_dependentes: [], exigido: campo !== 'peso', observacao: OBS.nao_avaliado }));
  return { itens, pendencias: campos.filter(c => c !== 'peso'), inconsistencias: [], limitacoes: [], completa: false };
}
