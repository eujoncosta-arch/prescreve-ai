import { describe, it, expect, vi } from 'vitest';
import {
  reducer,
  mapBackendConsultaToConsultation,
  executarCarregamentoPaginaInicial,
  executarCarregarMaisConsultas,
  INITIAL_PAGINATION,
  type AppState,
  type Action,
  type ConsultationsPaginationState,
  type BackendListarConsultasResponse,
} from '@/lib/store';
import type { Consultation } from '@/lib/types';

// ============================================================
// RM-44 — Paginação incremental, histórico completo e consistência
//
// RM-42 buscava uma única página fixa (`consultaApi.listar(1, 50)`),
// limitando o histórico visível aos 50 registros mais recentes e sem
// nenhuma forma de o médico ver o restante. Este módulo implementa
// paginação real: primeira página, "carregar mais", metadados reais
// (nunca fabricados — `total`/`totalPages` ficam `null` até o backend
// confirmar), prevenção de requisição duplicada/concorrente, e
// isolamento estrito entre sessões/usuários (resposta atrasada de uma
// conta anterior nunca é aplicada à conta seguinte).
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

function pagination(overrides: Partial<ConsultationsPaginationState> = {}): ConsultationsPaginationState {
  return { ...INITIAL_PAGINATION, ...overrides };
}

function consultaLocal(overrides: Partial<Consultation> = {}): Consultation {
  return {
    id: 'local-1',
    status: 'anamnese',
    paciente_nome: 'Paciente Teste',
    data: new Date().toISOString(),
    ...overrides,
  };
}

function respostaPagina(pagina: number, limite: number, total: number, idsConsultas: string[]): BackendListarConsultasResponse {
  return {
    pagina,
    limite,
    total,
    consultas: idsConsultas.map((id, i) => ({
      id,
      status: 'concluida' as const,
      criado_em: new Date(2026, 0, 1, 0, 0, -i).toISOString(), // ordem desc simulada (mais recente primeiro)
    })),
  };
}

function dispatcherEspiao() {
  const acoes: Action[] = [];
  return { dispatch: (a: Action) => acoes.push(a), acoes };
}

// ============================================================
// 1-2-3-4-5. Primeira página / segunda página / múltiplas páginas / fim / página vazia
// ============================================================
describe('executarCarregamentoPaginaInicial() / executarCarregarMaisConsultas() — fluxo de páginas', () => {
  it('1. primeira página: carrega e atualiza metadados reais (total/totalPages/hasNextPage)', async () => {
    const { dispatch, acoes } = dispatcherEspiao();
    const listar = vi.fn().mockResolvedValue(respostaPagina(1, 2, 5, ['a', 'b']));

    const resultado = await executarCarregamentoPaginaInicial({
      pagination: pagination(), listar, dispatch, sessaoValida: () => true,
    });

    expect(resultado).toBe('loaded');
    expect(listar).toHaveBeenCalledWith(1, 20); // pageSize default do estado inicial
    const hidratacao = acoes.find((a) => a.type === 'HYDRATE_CONSULTATIONS_PAGE') as Extract<Action, { type: 'HYDRATE_CONSULTATIONS_PAGE' }>;
    expect(hidratacao.payload).toMatchObject({ pagina: 1, limite: 2, total: 5 });
    expect(hidratacao.payload.hidratadas).toHaveLength(2);
  });

  it('2. segunda página: "carregar mais" busca currentPage+1 e acumula', async () => {
    const { dispatch, acoes } = dispatcherEspiao();
    const listar = vi.fn().mockResolvedValue(respostaPagina(2, 2, 5, ['c', 'd']));

    const resultado = await executarCarregarMaisConsultas({
      pagination: pagination({ currentPage: 1, pageSize: 2, total: 5, totalPages: 3, hasNextPage: true }),
      listar, dispatch, sessaoValida: () => true,
    });

    expect(resultado).toBe('loaded');
    expect(listar).toHaveBeenCalledWith(2, 2);
    const hidratacao = acoes.find((a) => a.type === 'HYDRATE_CONSULTATIONS_PAGE') as Extract<Action, { type: 'HYDRATE_CONSULTATIONS_PAGE' }>;
    expect(hidratacao.payload.pagina).toBe(2);
  });

  it('3. múltiplas páginas: reducer acumula 3 páginas sucessivas sem perder nenhuma', () => {
    let state = baseState();
    state = reducer(state, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: [mapBackendConsultaToConsultation({ id: 'a', status: 'concluida', criado_em: '2026-01-03' })], pagina: 1, limite: 1, total: 3 } });
    state = reducer(state, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: [mapBackendConsultaToConsultation({ id: 'b', status: 'concluida', criado_em: '2026-01-02' })], pagina: 2, limite: 1, total: 3 } });
    state = reducer(state, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: [mapBackendConsultaToConsultation({ id: 'c', status: 'concluida', criado_em: '2026-01-01' })], pagina: 3, limite: 1, total: 3 } });

    expect(state.consultations.map((c) => c.id)).toEqual(['a', 'b', 'c']);
    expect(state.consultationsPagination).toMatchObject({ currentPage: 3, total: 3, totalPages: 3, hasNextPage: false });
  });

  it('4. fim da paginação: hasNextPage vira false na última página e "carregar mais" não dispara nova busca', async () => {
    const { dispatch } = dispatcherEspiao();
    const listar = vi.fn();

    const resultado = await executarCarregarMaisConsultas({
      pagination: pagination({ currentPage: 3, pageSize: 1, total: 3, totalPages: 3, hasNextPage: false }),
      listar, dispatch, sessaoValida: () => true,
    });

    expect(resultado).toBe('skipped');
    expect(listar).not.toHaveBeenCalled();
  });

  it('5. página vazia: backend confirma total=0 — reducer reflete total real (não null, não erro)', () => {
    const state = baseState();
    const novo = reducer(state, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: [], pagina: 1, limite: 20, total: 0 } });

    expect(novo.consultationsPagination.total).toBe(0);
    expect(novo.consultationsPagination.hasNextPage).toBe(false);
    expect(novo.consultationsPagination.currentPage).toBe(1);
    expect(novo.consultations).toEqual([]);
  });
});

// ============================================================
// 6-7-8. Erro inicial / erro ao carregar mais / retry
// ============================================================
describe('erro e retry', () => {
  it('6. erro inicial: status final tem `error` preenchido, `total` continua null (nunca fabrica um total)', async () => {
    const { dispatch, acoes } = dispatcherEspiao();
    const listar = vi.fn().mockRejectedValue(new Error('network'));

    const resultado = await executarCarregamentoPaginaInicial({ pagination: pagination(), listar, dispatch, sessaoValida: () => true });

    expect(resultado).toBe('failed');
    expect(acoes.some((a) => a.type === 'HYDRATE_CONSULTATIONS_PAGE')).toBe(false);
    const erro = acoes.find((a) => a.type === 'SET_PAGINATION_ERROR') as Extract<Action, { type: 'SET_PAGINATION_ERROR' }>;
    expect(erro.payload).toBeTruthy();
  });

  it('7. erro ao carregar mais: usa `loadMoreError`, distinto de `error` (da carga inicial)', async () => {
    const { dispatch, acoes } = dispatcherEspiao();
    const listar = vi.fn().mockRejectedValue(new Error('timeout'));

    const resultado = await executarCarregarMaisConsultas({
      pagination: pagination({ currentPage: 1, total: 5, totalPages: 3, hasNextPage: true }),
      listar, dispatch, sessaoValida: () => true,
    });

    expect(resultado).toBe('failed');
    expect(acoes.some((a) => a.type === 'SET_PAGINATION_LOAD_MORE_ERROR')).toBe(true);
    expect(acoes.some((a) => a.type === 'SET_PAGINATION_ERROR')).toBe(false);
  });

  it('8. retry: uma nova chamada após erro (isLoading=false novamente) tenta de novo e limpa o erro anterior ao iniciar', () => {
    const comErro = reducer(baseState(), { type: 'SET_PAGINATION_ERROR', payload: 'falhou' });
    expect(comErro.consultationsPagination.error).toBe('falhou');

    const retentando = reducer(comErro, { type: 'SET_PAGINATION_LOADING', payload: true });
    expect(retentando.consultationsPagination.error).toBeNull();
    expect(retentando.consultationsPagination.isLoading).toBe(true);
  });
});

// ============================================================
// 9-10. Prevenção de requisição duplicada / deduplicação entre páginas
// ============================================================
describe('concorrência e deduplicação', () => {
  it('9a. prevenção de requisição duplicada: carga inicial já em andamento não dispara outra', async () => {
    const { dispatch } = dispatcherEspiao();
    const listar = vi.fn();

    const resultado = await executarCarregamentoPaginaInicial({
      pagination: pagination({ isLoading: true }), listar, dispatch, sessaoValida: () => true,
    });

    expect(resultado).toBe('skipped');
    expect(listar).not.toHaveBeenCalled();
  });

  it('9b. prevenção de requisição duplicada: "carregar mais" não dispara nova busca se já isLoadingMore, nem se a carga inicial está em andamento', async () => {
    const { dispatch } = dispatcherEspiao();
    const listar = vi.fn();

    const r1 = await executarCarregarMaisConsultas({ pagination: pagination({ isLoadingMore: true, hasNextPage: true }), listar, dispatch, sessaoValida: () => true });
    const r2 = await executarCarregarMaisConsultas({ pagination: pagination({ isLoading: true, hasNextPage: true }), listar, dispatch, sessaoValida: () => true });

    expect(r1).toBe('skipped');
    expect(r2).toBe('skipped');
    expect(listar).not.toHaveBeenCalled();
  });

  it('10. deduplicação entre páginas: a mesma consulta retornada por duas páginas (ex.: item deslocado por escrita concorrente) nunca aparece duplicada', () => {
    let state = baseState();
    state = reducer(state, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: [mapBackendConsultaToConsultation({ id: 'x', status: 'concluida', criado_em: '2026-01-01' })], pagina: 1, limite: 1, total: 2 } });
    // "x" reaparece na página 2 (cenário real de offset pagination sob escrita concorrente)
    state = reducer(state, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: [mapBackendConsultaToConsultation({ id: 'x', status: 'concluida', criado_em: '2026-01-01' })], pagina: 2, limite: 1, total: 2 } });

    expect(state.consultations.filter((c) => c.id === 'x')).toHaveLength(1);
  });
});

// ============================================================
// 11-12-13. Preservação de consulta local / syncing / failed
// ============================================================
describe('preservação de estado local durante paginação', () => {
  it('11. consulta local "local" (nunca sincronizada) é preservada ao longo de HYDRATE_CONSULTATIONS_PAGE', () => {
    const local = consultaLocal({ id: 'local-1', sync: { consulta: { status: 'local', attempts: 0 } } });
    const state = baseState({ consultations: [local] });

    const novo = reducer(state, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: [mapBackendConsultaToConsultation({ id: 'srv-1', status: 'concluida', criado_em: '2026-01-01' })], pagina: 1, limite: 20, total: 1 } });

    expect(novo.consultations.some((c) => c.id === 'local-1')).toBe(true);
  });

  it('12. consulta "syncing" é preservada ao longo de HYDRATE_CONSULTATIONS_PAGE', () => {
    const syncing = consultaLocal({ id: 'local-2', sync: { consulta: { status: 'syncing', attempts: 1 } } });
    const state = baseState({ consultations: [syncing] });

    const novo = reducer(state, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: [], pagina: 1, limite: 20, total: 0 } });

    expect(novo.consultations.some((c) => c.id === 'local-2')).toBe(true);
  });

  it('13. consulta "failed" é preservada ao longo de HYDRATE_CONSULTATIONS_PAGE', () => {
    const falha = consultaLocal({ id: 'local-3', sync: { consulta: { status: 'failed', attempts: 3, error: 'x' } } });
    const state = baseState({ consultations: [falha] });

    const novo = reducer(state, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: [], pagina: 1, limite: 20, total: 0 } });

    expect(novo.consultations.some((c) => c.id === 'local-3')).toBe(true);
  });
});

// ============================================================
// 14. Atualização de consulta já sincronizada (sem apagar prescricoesRecuperadas local)
// ============================================================
describe('atualização de consulta já sincronizada', () => {
  it('14. uma consulta já sincronizada com prescricoesRecuperadas (RM-43) é atualizada pela paginação SEM perder esse detalhe', () => {
    const jaCarregada: Consultation = {
      ...consultaLocal({ id: 'srv-1', status: 'concluida' }),
      sync: { consulta: { status: 'synced', attempts: 0, backend_id: 'srv-1' } },
      prescricoesRecuperadas: [{ id: 'p1', status: 'emitida', medicamentos: [], validade_dias: 30, criado_em: '2026-01-01' }],
    };
    const state = baseState({ consultations: [jaCarregada] });
    const versaoAtualizada = mapBackendConsultaToConsultation({ id: 'srv-1', status: 'concluida', criado_em: '2026-01-01', diagnosticos: [{ cid: 'J45', descricao: 'Asma', selecionado: true }] });

    const novo = reducer(state, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: [versaoAtualizada], pagina: 1, limite: 20, total: 1 } });

    expect(novo.consultations).toHaveLength(1);
    expect(novo.consultations[0].diagnostico_selecionado).toBe('J45'); // dado atualizado do backend
    expect(novo.consultations[0].prescricoesRecuperadas).toEqual(jaCarregada.prescricoesRecuperadas); // detalhe local preservado
  });
});

// ============================================================
// 15-16-17. Logout / troca de usuário / resposta atrasada da conta anterior
// ============================================================
describe('isolamento entre sessões/usuários', () => {
  it('15. logout: RESET_SESSION_DATA reinicia consultationsPagination para o estado inicial', () => {
    const state = baseState({ consultationsPagination: pagination({ currentPage: 3, total: 50, totalPages: 3, hasNextPage: false }) });
    const novo = reducer(state, { type: 'RESET_SESSION_DATA' });
    expect(novo.consultationsPagination).toEqual(INITIAL_PAGINATION);
  });

  it('16. troca de usuário: total/páginas de uma conta nunca sobrevivem para a próxima (mesma garantia do RESET_SESSION_DATA)', () => {
    const contaA = baseState({
      consultations: [consultaLocal({ id: 'a' })],
      consultationsPagination: pagination({ currentPage: 5, total: 100, totalPages: 5, hasNextPage: false }),
    });
    const contaB = reducer(contaA, { type: 'RESET_SESSION_DATA' });
    expect(contaB.consultationsPagination.total).toBeNull();
    expect(contaB.consultations).toEqual([]);
  });

  it('17. resposta atrasada da conta anterior: sessaoValida()=false descarta o resultado sem despachar HYDRATE_CONSULTATIONS_PAGE nem erro', async () => {
    const { dispatch, acoes } = dispatcherEspiao();
    const listar = vi.fn().mockResolvedValue(respostaPagina(1, 20, 10, ['a', 'b']));

    // Simula: a sessão mudou ENQUANTO a requisição estava em voo — sessaoValida
    // reflete o epoch capturado no início, que não bate mais com o atual.
    const resultado = await executarCarregamentoPaginaInicial({ pagination: pagination(), listar, dispatch, sessaoValida: () => false });

    expect(resultado).toBe('skipped');
    expect(acoes).toHaveLength(1); // só o SET_PAGINATION_LOADING(true) inicial — nenhum dado da conta anterior é aplicado
    expect(acoes[0]).toMatchObject({ type: 'SET_PAGINATION_LOADING', payload: true });
  });

  it('17b. resposta atrasada da conta anterior também é descartada no caminho de erro (nunca aplica SET_PAGINATION_ERROR de uma sessão que já não é a atual)', async () => {
    const { dispatch, acoes } = dispatcherEspiao();
    const listar = vi.fn().mockRejectedValue(new Error('tarde demais'));

    const resultado = await executarCarregamentoPaginaInicial({ pagination: pagination(), listar, dispatch, sessaoValida: () => false });

    expect(resultado).toBe('skipped');
    expect(acoes.some((a) => a.type === 'SET_PAGINATION_ERROR')).toBe(false);
  });
});

// ============================================================
// 18-19. Ordenação mantida / total e metadados corretos
// ============================================================
describe('ordenação e metadados', () => {
  it('18. ordenação mantida: a ordem retornada pelo backend (mais recente primeiro) é preservada dentro do lote hidratado e entre páginas sucessivas', () => {
    let state = baseState();
    state = reducer(state, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: [mapBackendConsultaToConsultation({ id: 'mais-nova', status: 'concluida', criado_em: '2026-01-10' }), mapBackendConsultaToConsultation({ id: 'nova', status: 'concluida', criado_em: '2026-01-05' })], pagina: 1, limite: 2, total: 4 } });
    state = reducer(state, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: [mapBackendConsultaToConsultation({ id: 'antiga', status: 'concluida', criado_em: '2026-01-02' }), mapBackendConsultaToConsultation({ id: 'mais-antiga', status: 'concluida', criado_em: '2026-01-01' })], pagina: 2, limite: 2, total: 4 } });

    expect(state.consultations.map((c) => c.id)).toEqual(['mais-nova', 'nova', 'antiga', 'mais-antiga']);
  });

  it('19. total e metadados corretos: totalPages/hasNextPage derivados corretamente de total/limite em cenários não-exatos', () => {
    // total=7, limite=3 → 3 páginas (3+3+1); na página 2, ainda há próxima; na página 3, não há mais.
    const pagina2 = reducer(baseState(), { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: [], pagina: 2, limite: 3, total: 7 } });
    expect(pagina2.consultationsPagination).toMatchObject({ totalPages: 3, hasNextPage: true });

    const pagina3 = reducer(baseState(), { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: [], pagina: 3, limite: 3, total: 7 } });
    expect(pagina3.consultationsPagination).toMatchObject({ totalPages: 3, hasNextPage: false });
  });
});
