import { describe, it, expect } from 'vitest';
import {
  reducer,
  mapBackendConsultaToConsultation,
  INITIAL_PAGINATION,
  type AppState,
} from '@/lib/store';
import type { Consultation, PrescricaoRecuperada } from '@/lib/types';

// ============================================================
// RM-46 — Invariantes de ciclo de vida do estado clínico
//
// Testes de transição de estado e metamórficos exigidos pela auditoria
// de ciclo de vida (RM-46), cobrindo especificamente as duas
// invariantes que as suítes de RM-42/43/44/45 ainda não verificavam
// diretamente:
//   - ordem de chegada das respostas não altera o estado final correto
//     (metamórfico: aplicar A depois B produz o MESMO conjunto final
//     que aplicar B depois A, quando A e B não se sobrepõem);
//   - carregar a mesma página/o mesmo detalhe duas vezes é idempotente.
// As demais invariantes (logout limpa tudo, troca de usuário não
// mistura dados, hidratação preserva pendente, sincronização não
// duplica, falha+retry preserva conteúdo, ausência de detalhe não vira
// prescrição vazia) já são cobertas em profundidade por
// store-hydration-rm42/store-consultation-detail-rm43/
// store-pagination-rm44/store-sync-resilience-rm45 — não duplicadas
// aqui.
// ============================================================

function baseState(overrides: Partial<AppState> = {}): AppState {
  return {
    consultations: [],
    activeConsultation: null,
    settings: {
      medico: { nome: 'x', crm: 'x', especialidade: 'x' },
      preferencia_laboratorio: 'sem_preferencia',
      tema: 'light',
      mostrar_evidencias_painel: true,
      alertas_interacao: true,
      idioma: 'pt-BR',
    },
    loading: false,
    error: null,
    currentUser: null,
    consultationDetailStatus: {},
    consultationsPagination: INITIAL_PAGINATION,
    ...overrides,
  };
}

describe('Invariante: ordem de chegada das respostas não altera o estado final correto (metamórfico)', () => {
  it('duas páginas hidratadas em ordem A→B produzem o MESMO conjunto final que B→A', () => {
    const paginaA = [mapBackendConsultaToConsultation({ id: 'a', status: 'concluida', criado_em: '2026-01-03' })];
    const paginaB = [mapBackendConsultaToConsultation({ id: 'b', status: 'concluida', criado_em: '2026-01-01' })];

    let estadoAB = baseState();
    estadoAB = reducer(estadoAB, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: paginaA, pagina: 1, limite: 1, total: 2 } });
    estadoAB = reducer(estadoAB, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: paginaB, pagina: 2, limite: 1, total: 2 } });

    let estadoBA = baseState();
    estadoBA = reducer(estadoBA, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: paginaB, pagina: 2, limite: 1, total: 2 } });
    estadoBA = reducer(estadoBA, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: paginaA, pagina: 1, limite: 1, total: 2 } });

    // O CONJUNTO de consultas presentes é o mesmo independentemente da
    // ordem de chegada — nenhuma se perde, nenhuma duplica.
    expect(new Set(estadoAB.consultations.map((c) => c.id))).toEqual(new Set(estadoBA.consultations.map((c) => c.id)));
    expect(estadoAB.consultations).toHaveLength(2);
    expect(estadoBA.consultations).toHaveLength(2);
  });

  it('uma resposta de detalhe que chega DEPOIS de uma atualização de página não apaga o que a página trouxe', () => {
    const hidratada = mapBackendConsultaToConsultation({ id: 'srv-1', status: 'concluida', criado_em: '2026-01-01' });
    let state = baseState();
    state = reducer(state, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: [hidratada], pagina: 1, limite: 20, total: 1 } });

    const prescricoes: PrescricaoRecuperada[] = [{ id: 'p1', status: 'emitida', medicamentos: [], validade_dias: 30, criado_em: '2026-01-01' }];
    state = reducer(state, { type: 'HYDRATE_CONSULTATION_DETAIL', payload: { backendId: 'srv-1', prescricoesRecuperadas: prescricoes, riscosRecuperados: [] } });

    // Uma nova página (ex.: refresh do histórico) chega depois — a
    // consulta continua presente, e o detalhe já carregado é preservado
    // (regra de merge do RM-44, já parte de mesclarConsultasHidratadas).
    state = reducer(state, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: [hidratada], pagina: 1, limite: 20, total: 1 } });

    expect(state.consultations).toHaveLength(1);
    expect(state.consultations[0].prescricoesRecuperadas).toEqual(prescricoes);
  });
});

describe('Invariante: carregar a mesma página duas vezes é idempotente', () => {
  it('despachar HYDRATE_CONSULTATIONS_PAGE duas vezes com o MESMO payload produz o mesmo estado (sem duplicar nem alterar metadados)', () => {
    const hidratadas = [mapBackendConsultaToConsultation({ id: 'x', status: 'concluida', criado_em: '2026-01-01' })];
    const payload = { hidratadas, pagina: 1, limite: 20, total: 1 };

    let state = baseState();
    state = reducer(state, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload });
    const primeiraExecucao = state;

    state = reducer(state, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload });

    expect(state.consultations).toHaveLength(1);
    expect(state.consultations).toEqual(primeiraExecucao.consultations);
    expect(state.consultationsPagination).toEqual(primeiraExecucao.consultationsPagination);
  });
});

describe('Invariante: carregar o mesmo detalhe duas vezes é idempotente', () => {
  it('despachar HYDRATE_CONSULTATION_DETAIL duas vezes com o MESMO payload produz o mesmo resultado', () => {
    const hidratada = mapBackendConsultaToConsultation({ id: 'srv-1', status: 'concluida', criado_em: '2026-01-01' });
    const prescricoes: PrescricaoRecuperada[] = [{ id: 'p1', status: 'emitida', medicamentos: [], validade_dias: 30, criado_em: '2026-01-01' }];

    let state = baseState();
    state = reducer(state, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: [hidratada], pagina: 1, limite: 20, total: 1 } });
    state = reducer(state, { type: 'HYDRATE_CONSULTATION_DETAIL', payload: { backendId: 'srv-1', prescricoesRecuperadas: prescricoes, riscosRecuperados: [] } });
    const primeiraExecucao = state;

    state = reducer(state, { type: 'HYDRATE_CONSULTATION_DETAIL', payload: { backendId: 'srv-1', prescricoesRecuperadas: prescricoes, riscosRecuperados: [] } });

    expect(state.consultations).toEqual(primeiraExecucao.consultations);
    expect(state.consultations).toHaveLength(1);
    expect(state.consultations[0].prescricoesRecuperadas).toEqual(prescricoes);
  });
});

describe('Invariantes já garantidas (verificação cruzada rápida, ver suítes dedicadas para cobertura completa)', () => {
  it('logout remove TODOS os dados clínicos (consultations, activeConsultation, detailStatus, pagination)', () => {
    const c: Consultation = { id: 'x', status: 'concluida', paciente_nome: 'y', data: '2026-01-01' };
    const state = baseState({
      consultations: [c],
      activeConsultation: c,
      consultationDetailStatus: { 'srv-1': 'loaded' },
      consultationsPagination: { ...INITIAL_PAGINATION, total: 10, currentPage: 2 },
    });
    const novo = reducer(state, { type: 'RESET_SESSION_DATA' });
    expect(novo.consultations).toEqual([]);
    expect(novo.activeConsultation).toBeNull();
    expect(novo.consultationDetailStatus).toEqual({});
    expect(novo.consultationsPagination).toEqual(INITIAL_PAGINATION);
  });

  it('ausência de detalhe carregado nunca aparece como array vazio de prescrições (undefined ≠ [])', () => {
    const hidratada = mapBackendConsultaToConsultation({ id: 'srv-1', status: 'concluida', criado_em: '2026-01-01' });
    const state = reducer(baseState(), { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: [hidratada], pagina: 1, limite: 20, total: 1 } });
    expect(state.consultations[0].prescricoesRecuperadas).toBeUndefined();
  });
});
