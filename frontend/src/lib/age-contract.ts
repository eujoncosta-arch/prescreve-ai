// ============================================================
// RM-105.2.2 — Contrato EXPLÍCITO de idade (valor + unidade) e normalização rastreável
//
// Problema: três representações coexistem — dose-calculator (anos decimais), dosing-engine (dias) e
// pediatric-engine (meses) — e a tela aceitava um número solto "em anos". Digitar 28 pensando em dias
// era lido como 28 anos.
//
// Regras deste contrato:
//  - A idade SEMPRE tem unidade (dias | meses | anos). Valor sem unidade NÃO é interpretado.
//  - Unidade canônica interna: DIAS. Convenção única de calendário: 1 ano = 365 dias; 1 mês = 365/12 dias
//    (a mesma convenção do corte neonatal de 28/365 ano usado pelo dose-calculator e dos 28 dias do
//    dosing-engine; não há ajuste de ano bissexto — erro máximo de ~0,07%, ou ~1 dia a cada 4 anos).
//  - Toda conversão fica registrada em `conversoes` (rastreável).
//  - A FAIXA populacional reutiliza `classifyPopulation` (a mesma usada pela calculadora de dose desta
//    tela). Este módulo NÃO cria regras clínicas, doses, contraindicações nem faixas novas. Os motores
//    divergem entre si (dose-calculator: lactente < 2 anos; dosing-engine: lactente < 365 dias;
//    pediatric-engine: meses) — a divergência é DOCUMENTADA em `DIVERGENCIAS_ENTRE_MOTORES`, não resolvida.
// ============================================================

import { classifyPopulation, type PatientPopulation } from './dose-calculator';

export type UnidadeIdade = 'dias' | 'meses' | 'anos';

export interface IdadeEntrada {
  valor: number;
  unidade: UnidadeIdade;
}

export const DIAS_POR_ANO = 365;
export const MESES_POR_ANO = 12;
export const DIAS_POR_MES = DIAS_POR_ANO / MESES_POR_ANO;
/** Limite de VALIDADE de entrada (detecta erro de digitação/unidade), não um critério clínico. */
export const IDADE_MAXIMA_ANOS = 120;
export const LIMIAR_IDOSO_ANOS = 65;

export const UNIDADES_IDADE: readonly UnidadeIdade[] = ['dias', 'meses', 'anos'];

export type MotivoIdadeInvalida = 'sem_unidade' | 'unidade_invalida' | 'valor_invalido' | 'fora_do_intervalo' | 'estrutura_invalida';

export interface IdadeNormalizada {
  /** Valor e unidade EXATAMENTE como informados. */
  valor: number;
  unidade: UnidadeIdade;
  /** Unidade canônica. */
  dias: number;
  meses: number;
  anos: number;
  faixa: PatientPopulation;
  idoso: boolean;
  /** De onde vem a faixa (único classificador usado por esta tela). */
  faixa_fonte: string;
  /** Conversões efetuadas, em ordem, para rastreabilidade. */
  conversoes: string[];
}

export type ResultadoIdade =
  | { estado: 'nao_informada' }
  | { estado: 'informada'; idade: IdadeNormalizada }
  | { estado: 'invalida'; motivo: MotivoIdadeInvalida; detalhe: string };

export const DIVERGENCIAS_ENTRE_MOTORES: readonly string[] = Object.freeze([
  'dose-calculator (classifyPopulation, usado por esta tela): neonato < 28 dias; lactente < 2 anos; pré-escolar < 6; escolar < 12; adolescente < 18; idoso ≥ 65.',
  'dosing-engine (idade em dias, não usado por esta tela): neonato < 28 dias; lactente < 365 dias; pediátrico < 12 anos; adolescente < 18 anos.',
  'pediatric-engine (idade em meses, não usado por esta tela): cortes em meses (12 e 156).',
  'Os motores divergem na fronteira do lactente (1 × 2 anos) e não foram unificados: exige decisão clínica e fonte oficial.',
]);

function formatarNumero(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(4)));
}

/** Texto curto e inequívoco da idade (ex.: "28 dias", "6 meses", "45 anos"). */
export function formatarIdade(i: Pick<IdadeNormalizada, 'valor' | 'unidade'>): string {
  const u = i.valor === 1 ? { dias: 'dia', meses: 'mês', anos: 'ano' }[i.unidade] : i.unidade;
  return `${formatarNumero(i.valor)} ${u}`;
}

/**
 * Normaliza uma idade com unidade explícita. Nunca interpreta um valor sem unidade e nunca lança exceção.
 * `undefined`/`null` = não informada.
 */
export function normalizarIdade(entrada: unknown): ResultadoIdade {
  if (entrada === undefined || entrada === null) return { estado: 'nao_informada' };
  if (typeof entrada !== 'object' || Array.isArray(entrada)) {
    // número ou texto soltos: sem unidade — nunca interpretados
    return { estado: 'invalida', motivo: 'sem_unidade', detalhe: 'Idade sem unidade: informe o valor e a unidade (dias, meses ou anos). O valor não foi interpretado.' };
  }
  const o = entrada as Record<string, unknown>;
  const { valor, unidade } = o;
  if (unidade === undefined || unidade === null || unidade === '') {
    return { estado: 'invalida', motivo: 'sem_unidade', detalhe: 'Idade sem unidade: informe a unidade (dias, meses ou anos). O valor não foi interpretado.' };
  }
  if (typeof unidade !== 'string' || !UNIDADES_IDADE.includes(unidade as UnidadeIdade)) {
    return { estado: 'invalida', motivo: 'unidade_invalida', detalhe: `Unidade de idade inválida ("${String(unidade)}"): use dias, meses ou anos.` };
  }
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) {
    return { estado: 'invalida', motivo: 'valor_invalido', detalhe: 'Valor de idade inválido: deve ser um número finito maior ou igual a zero.' };
  }
  const u = unidade as UnidadeIdade;
  const conversoes: string[] = [];
  let dias: number; let meses: number; let anos: number;
  if (u === 'dias') {
    dias = valor; anos = dias / DIAS_POR_ANO; meses = anos * MESES_POR_ANO;
    conversoes.push(`${formatarNumero(valor)} dias → ${formatarNumero(anos)} anos (÷ ${DIAS_POR_ANO})`, `${formatarNumero(anos)} anos → ${formatarNumero(meses)} meses (× ${MESES_POR_ANO})`);
  } else if (u === 'meses') {
    meses = valor; anos = meses / MESES_POR_ANO; dias = anos * DIAS_POR_ANO;
    conversoes.push(`${formatarNumero(valor)} meses → ${formatarNumero(anos)} anos (÷ ${MESES_POR_ANO})`, `${formatarNumero(anos)} anos → ${formatarNumero(dias)} dias (× ${DIAS_POR_ANO})`);
  } else {
    anos = valor; dias = anos * DIAS_POR_ANO; meses = anos * MESES_POR_ANO;
    conversoes.push(`${formatarNumero(valor)} anos → ${formatarNumero(dias)} dias (× ${DIAS_POR_ANO})`, `${formatarNumero(valor)} anos → ${formatarNumero(meses)} meses (× ${MESES_POR_ANO})`);
  }
  if (anos > IDADE_MAXIMA_ANOS) {
    return { estado: 'invalida', motivo: 'fora_do_intervalo', detalhe: `Idade acima de ${IDADE_MAXIMA_ANOS} anos (${formatarIdade({ valor, unidade: u })}): verifique o valor e a unidade.` };
  }
  const perfil = classifyPopulation(anos);
  return {
    estado: 'informada',
    idade: {
      valor, unidade: u, dias, meses, anos,
      faixa: perfil.population,
      idoso: anos >= LIMIAR_IDOSO_ANOS,
      faixa_fonte: 'dose-calculator.classifyPopulation',
      conversoes,
    },
  };
}
