// ============================================================
// RM-65 — Resolução de contexto real para a página /explicabilidade
//
// Extrai, como função pura e testável, a decisão de QUAL anamnese, CID e
// plano terapêutico alimentam o motor `explainable-ai-v2.ts`. Antes desta
// RM, a página sempre usava um CID escolhido manualmente (I10 fixo por
// padrão) e a primeira molécula do protocolo estático daquele CID — nunca a
// consulta/diagnóstico/conduta reais do médico. Esta função não cria
// nenhuma regra clínica nova: apenas decide QUAL dado real (consulta ativa
// > anamnese salva > demonstração) alimenta o motor já existente.
// ============================================================

import type { Anamnesis, Consultation, TherapeuticSuggestion } from './types';
import { getTherapeuticForCondition } from './clinical-therapeutics';
import { gerarExplainableAIv2, type ExplainableAIv2Result } from './explainable-ai-v2';

export type FonteExplicabilidade = 'consulta_ativa' | 'anamnese_salva' | 'demonstracao';

/**
 * Mapeia o CID de exibição (rótulo curto usado no seletor manual/legado)
 * para a chave real de `PROTOCOLOS` em `clinical-therapeutics.ts`.
 *
 * Corrige um bug pré-existente descoberto durante a investigação da RM-65:
 * `I50` apontava para a chave `'ic'`, que nunca existiu em `PROTOCOLOS`
 * (a chave real é `'icc'`) — `getTherapeuticForCondition('ic', ...)`
 * sempre retornava `null`, então selecionar "Insuficiência Cardíaca" no
 * seletor manual sempre caía no estado "nenhuma recomendação disponível",
 * silenciosamente. `I25` (Doença Arterial Coronariana) também apontava
 * para uma chave inexistente (`'dac'`) — removida do mapa em vez de
 * inventar um protocolo novo (fora do escopo desta RM).
 */
export const CID_CONDITION_MAP: Record<string, string> = {
  I10: 'has',
  E11: 'dm2',
  I50: 'icc',
  J45: 'asma',
  J44: 'dpoc',
  E03: 'hipotireoidismo',
  E78: 'dislipidemia',
};

export interface ContextoExplicabilidade {
  anamnese: Anamnesis;
  cid: string;
  fonte: FonteExplicabilidade;
  medicamento: TherapeuticSuggestion | null;
  /** true quando não há plano terapêutico mapeado para o CID em uso — nunca cai silenciosamente em demonstração. */
  planoIndisponivel: boolean;
}

export interface ResolverContextoParams {
  /** Consulta ativa do `useApp()` — `null`/`undefined` quando não há paciente/consulta em atendimento. */
  activeConsultation: Consultation | null | undefined;
  /** Última anamnese salva no navegador (hook `useLocalStorage`), independente de consulta ativa. */
  anamneseLocalStorage: Anamnesis | null;
  /** Perfil fictício de último recurso — usado apenas quando nenhuma das duas fontes reais existe. */
  anamneseDemo: Anamnesis;
  /**
   * Seleção manual do usuário no seletor de CID. `null` (padrão) segue a
   * consulta ativa quando ela existir; qualquer CID explícito é um
   * OVERRIDE do médico e desliga o modo "consulta ativa" para esta
   * visualização (critério de aceite RM-60 §6.1: o seletor manual vira
   * override, não o caminho padrão).
   */
  cidOverride: string | null;
}

/**
 * Resolve, em ordem de prioridade estrita, qual dado real alimenta o motor
 * `gerarExplainableAIv2`:
 *
 * 1. Consulta ativa com diagnóstico estruturado (`diagnostico_estruturado.cid`)
 *    E sem override manual → usa a MESMA anamnese e o MESMO plano
 *    terapêutico (`plano_terapeutico.farmacologico[0]`) já calculados no
 *    fluxo real de `/consulta/nova` — nunca recalcula com outro conjunto de
 *    dados. Se a consulta tiver diagnóstico mas ainda não tiver plano
 *    terapêutico (etapa terapêutica não alcançada, ou CID sem protocolo
 *    mapeado), `planoIndisponivel: true` — a página deve comunicar isso
 *    explicitamente, nunca cair em demonstração silenciosamente.
 * 2. Sem consulta ativa utilizável (ou com override manual) + anamnese
 *    salva no navegador → modo híbrido já existente: CID escolhido
 *    manualmente, anamnese real, plano recalculado via `PROTOCOLOS`.
 * 3. Nenhuma das duas → demonstração completa (`anamneseDemo`).
 */
export function resolverContextoExplicabilidade(
  params: ResolverContextoParams,
): ContextoExplicabilidade {
  const { activeConsultation, anamneseLocalStorage, anamneseDemo, cidOverride } = params;

  const cidConsultaAtiva = activeConsultation?.diagnostico_estruturado?.cid;
  const usaConsultaAtiva = !!activeConsultation && !!cidConsultaAtiva && !cidOverride;

  if (usaConsultaAtiva) {
    const anamnese = activeConsultation!.anamnese ?? anamneseDemo;
    const cid = cidConsultaAtiva!;
    const planoReal = activeConsultation!.plano_terapeutico;
    const medicamento = planoReal && planoReal.farmacologico.length > 0 ? planoReal.farmacologico[0] : null;
    return {
      anamnese,
      cid,
      fonte: 'consulta_ativa',
      medicamento,
      planoIndisponivel: medicamento === null,
    };
  }

  const cid = cidOverride ?? 'I10';
  const anamnese = anamneseLocalStorage ?? anamneseDemo;
  const fonte: FonteExplicabilidade = anamneseLocalStorage ? 'anamnese_salva' : 'demonstracao';
  const condId = CID_CONDITION_MAP[cid] ?? cid.toLowerCase();
  const plano = getTherapeuticForCondition(condId, cid);
  const medicamento = plano && plano.farmacologico.length > 0 ? plano.farmacologico[0] : null;

  return {
    anamnese,
    cid,
    fonte,
    medicamento,
    planoIndisponivel: medicamento === null,
  };
}

export type ExplicabilidadeComputada =
  | { status: 'ok'; result: ExplainableAIv2Result }
  | { status: 'sem_plano' }
  | { status: 'erro'; mensagem: string };

/**
 * Executa `gerarExplainableAIv2` com o contexto já resolvido. Extraída como
 * função pura (em vez de inline no componente) para ser testável sem
 * precisar montar a página React — o projeto não usa
 * `@testing-library/react` (ver `demo-data-notice-rm59.test.ts`).
 *
 * `status: 'erro'` só ocorre se o motor lançar uma exceção inesperada (dado
 * malformado) — é distinto de `'sem_plano'`, que é o caso esperado e comum
 * de "não há protocolo/medicamento para este CID", nunca tratado como erro.
 */
export function computarExplicabilidade(contexto: ContextoExplicabilidade): ExplicabilidadeComputada {
  if (!contexto.medicamento) return { status: 'sem_plano' };
  try {
    return { status: 'ok', result: gerarExplainableAIv2(contexto.medicamento, contexto.cid, contexto.anamnese) };
  } catch (e) {
    return { status: 'erro', mensagem: e instanceof Error ? e.message : 'Erro desconhecido ao gerar a explicação.' };
  }
}
