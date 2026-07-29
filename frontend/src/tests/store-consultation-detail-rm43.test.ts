import { describe, it, expect, vi } from 'vitest';
import { reducer, mapBackendConsultaToConsultation, executarCarregamentoDetalhe, INITIAL_PAGINATION, type AppState, type Action } from '@/lib/store';
import type { Consultation, MedicamentoPrescrito } from '@/lib/types';

// ============================================================
// RM-43 — Carregamento sob demanda do detalhe de consulta (prescrição real)
//
// RM-42 já hidratava a LISTA de consultas a partir do backend, mas
// `GET /api/consultas` (paginado) só traz um resumo — sem os itens reais
// da prescrição. Este módulo adiciona um segundo carregamento, sob
// demanda, de UMA consulta por vez (`GET /api/consulta/:id`, já
// existente e já auditado por ownership), guardando o estágio de
// carregamento por consulta (`consultationDetailStatus`) e nunca
// fabricando prescrição/medicamento algum quando o detalhe ainda não
// foi buscado.
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

function consultaSincronizada(id: string, backendId: string): Consultation {
  return {
    id,
    status: 'concluida',
    paciente_nome: 'Paciente Teste',
    data: '2026-01-01T00:00:00.000Z',
    sync: { consulta: { status: 'synced', attempts: 0, backend_id: backendId } },
  };
}

const MEDICAMENTO_REAL: MedicamentoPrescrito = {
  molecula: 'Amoxicilina',
  dose: { valor: 500, unidade: 'mg', frequencia: '3x/dia', via: 'VO' },
  duracao: '7 dias',
};

function dispatcherEspiao() {
  const acoes: Action[] = [];
  return { dispatch: (a: Action) => acoes.push(a), acoes };
}

describe('reducer SET_CONSULTATION_DETAIL_STATUS / HYDRATE_CONSULTATION_DETAIL (RM-43)', () => {
  it('SET_CONSULTATION_DETAIL_STATUS atualiza só o backendId informado, preservando os demais', () => {
    const state = baseState({ consultationDetailStatus: { 'srv-a': 'loaded' } });
    const novo = reducer(state, { type: 'SET_CONSULTATION_DETAIL_STATUS', payload: { backendId: 'srv-b', status: 'loading' } });
    expect(novo.consultationDetailStatus).toEqual({ 'srv-a': 'loaded', 'srv-b': 'loading' });
  });

  it('HYDRATE_CONSULTATION_DETAIL localiza a consulta pelo backend_id (não pelo id local) e preenche prescricoesRecuperadas', () => {
    const local = consultaSincronizada('local-uuid-1', 'srv-1');
    const state = baseState({ consultations: [local] });
    const recuperadas = [{ id: 'presc-1', status: 'emitida', medicamentos: [MEDICAMENTO_REAL], validade_dias: 30, criado_em: '2026-01-01' }];

    const novo = reducer(state, { type: 'HYDRATE_CONSULTATION_DETAIL', payload: { backendId: 'srv-1', prescricoesRecuperadas: recuperadas, riscosRecuperados: [] } });

    expect(novo.consultations[0].prescricoesRecuperadas).toEqual(recuperadas);
  });

  it('HYDRATE_CONSULTATION_DETAIL nunca toca em `prescricao` (objeto local pendente/completo) — campos são independentes', () => {
    const local: Consultation = {
      ...consultaSincronizada('local-1', 'srv-2'),
      prescricao: { tipo: 'simples', paciente: { nome: 'x' }, medico: { nome: 'x', crm: 'x' }, itens: [], data_emissao: '2026-01-01' },
    };
    const state = baseState({ consultations: [local] });
    const recuperadas = [{ id: 'presc-x', status: 'emitida', medicamentos: [MEDICAMENTO_REAL], validade_dias: 30, criado_em: '2026-01-01' }];

    const novo = reducer(state, { type: 'HYDRATE_CONSULTATION_DETAIL', payload: { backendId: 'srv-2', prescricoesRecuperadas: recuperadas, riscosRecuperados: [] } });

    expect(novo.consultations[0].prescricao).toEqual(local.prescricao);
    expect(novo.consultations[0].prescricoesRecuperadas).toEqual(recuperadas);
  });
});

describe('executarCarregamentoDetalhe() — orquestração testável sem renderizar componente (RM-43)', () => {
  it('1. consulta persistida sem detalhe inicial: dispara loading → loaded na ordem correta', async () => {
    const { dispatch, acoes } = dispatcherEspiao();
    const consultas = [consultaSincronizada('local-1', 'srv-1')];
    const buscar = vi.fn().mockResolvedValue({ prescricoes: [], risco_scores: [] });

    const resultado = await executarCarregamentoDetalhe('local-1', {
      consultas, activeConsultation: null, detailStatus: {}, buscar, dispatch,
    });

    expect(resultado).toBe('loaded');
    expect(acoes[0]).toMatchObject({ type: 'SET_CONSULTATION_DETAIL_STATUS', payload: { backendId: 'srv-1', status: 'loading' } });
    expect(acoes.at(-1)).toMatchObject({ type: 'SET_CONSULTATION_DETAIL_STATUS', payload: { backendId: 'srv-1', status: 'loaded' } });
  });

  it('2. carregamento bem-sucedido do detalhe dispara HYDRATE_CONSULTATION_DETAIL com o backendId correto', async () => {
    const { dispatch, acoes } = dispatcherEspiao();
    const consultas = [consultaSincronizada('local-1', 'srv-1')];
    const buscar = vi.fn().mockResolvedValue({ prescricoes: [{ id: 'p1', status: 'emitida', medicamentos: [MEDICAMENTO_REAL], orientacoes: null, validade_dias: 30, diagnostico_id: null, criado_em: '2026-01-01' }], risco_scores: [] });

    await executarCarregamentoDetalhe('local-1', { consultas, activeConsultation: null, detailStatus: {}, buscar, dispatch });

    const hidratacao = acoes.find((a) => a.type === 'HYDRATE_CONSULTATION_DETAIL');
    expect(hidratacao).toBeDefined();
    expect((hidratacao as Extract<Action, { type: 'HYDRATE_CONSULTATION_DETAIL' }>).payload.backendId).toBe('srv-1');
  });

  it('3. recupera os itens REAIS da prescrição — molécula/dose/duração idênticos ao enviado originalmente, nunca fabricados', async () => {
    const { dispatch, acoes } = dispatcherEspiao();
    const consultas = [consultaSincronizada('local-1', 'srv-1')];
    const buscar = vi.fn().mockResolvedValue({
      prescricoes: [{ id: 'p1', status: 'emitida', medicamentos: [MEDICAMENTO_REAL], orientacoes: 'Repouso', validade_dias: 30, diagnostico_id: 'diag-1', criado_em: '2026-01-01' }],
      risco_scores: [],
    });

    await executarCarregamentoDetalhe('local-1', { consultas, activeConsultation: null, detailStatus: {}, buscar, dispatch });

    const hidratacao = acoes.find((a) => a.type === 'HYDRATE_CONSULTATION_DETAIL') as Extract<Action, { type: 'HYDRATE_CONSULTATION_DETAIL' }>;
    expect(hidratacao.payload.prescricoesRecuperadas[0].medicamentos[0]).toEqual(MEDICAMENTO_REAL);
    expect(hidratacao.payload.prescricoesRecuperadas[0].orientacoes).toBe('Repouso');
    expect(hidratacao.payload.prescricoesRecuperadas[0].diagnostico_id).toBe('diag-1');
  });

  it('4. consulta sem prescrição real: HYDRATE_CONSULTATION_DETAIL recebe array vazio genuíno, nunca omitido', async () => {
    const { dispatch, acoes } = dispatcherEspiao();
    const consultas = [consultaSincronizada('local-1', 'srv-1')];
    const buscar = vi.fn().mockResolvedValue({ prescricoes: [], risco_scores: [] });

    const resultado = await executarCarregamentoDetalhe('local-1', { consultas, activeConsultation: null, detailStatus: {}, buscar, dispatch });

    expect(resultado).toBe('loaded');
    const hidratacao = acoes.find((a) => a.type === 'HYDRATE_CONSULTATION_DETAIL') as Extract<Action, { type: 'HYDRATE_CONSULTATION_DETAIL' }>;
    expect(hidratacao.payload.prescricoesRecuperadas).toEqual([]);
  });

  it('5. erro do endpoint (rede/ownership): status final é `failed`, nunca `loaded` com dado fabricado', async () => {
    const { dispatch, acoes } = dispatcherEspiao();
    const consultas = [consultaSincronizada('local-1', 'srv-1')];
    const buscar = vi.fn().mockRejectedValue(new Error('404'));

    const resultado = await executarCarregamentoDetalhe('local-1', { consultas, activeConsultation: null, detailStatus: {}, buscar, dispatch });

    expect(resultado).toBe('failed');
    expect(acoes.some((a) => a.type === 'HYDRATE_CONSULTATION_DETAIL')).toBe(false);
    expect(acoes.at(-1)).toMatchObject({ type: 'SET_CONSULTATION_DETAIL_STATUS', payload: { backendId: 'srv-1', status: 'failed' } });
  });

  it('6. retry após erro: uma segunda chamada com status atual "failed" tenta novamente (não é bloqueada pelo dedup)', async () => {
    const { dispatch, acoes } = dispatcherEspiao();
    const consultas = [consultaSincronizada('local-1', 'srv-1')];
    const buscar = vi.fn().mockResolvedValue({ prescricoes: [], risco_scores: [] });

    const resultado = await executarCarregamentoDetalhe('local-1', {
      consultas, activeConsultation: null, detailStatus: { 'srv-1': 'failed' }, buscar, dispatch,
    });

    expect(resultado).toBe('loaded');
    expect(buscar).toHaveBeenCalledTimes(1);
    expect(acoes.some((a) => a.type === 'HYDRATE_CONSULTATION_DETAIL')).toBe(true);
  });

  it('7. evita requisição duplicada: status atual "loading" não dispara nova busca', async () => {
    const { dispatch } = dispatcherEspiao();
    const consultas = [consultaSincronizada('local-1', 'srv-1')];
    const buscar = vi.fn().mockResolvedValue({ prescricoes: [], risco_scores: [] });

    const resultado = await executarCarregamentoDetalhe('local-1', {
      consultas, activeConsultation: null, detailStatus: { 'srv-1': 'loading' }, buscar, dispatch,
    });

    expect(resultado).toBe('skipped');
    expect(buscar).not.toHaveBeenCalled();
  });

  it('7b. detalhe já "loaded" não refaz a busca (reutiliza o estado já carregado)', async () => {
    const { dispatch } = dispatcherEspiao();
    const consultas = [consultaSincronizada('local-1', 'srv-1')];
    const buscar = vi.fn().mockResolvedValue({ prescricoes: [], risco_scores: [] });

    const resultado = await executarCarregamentoDetalhe('local-1', {
      consultas, activeConsultation: null, detailStatus: { 'srv-1': 'loaded' }, buscar, dispatch,
    });

    expect(resultado).toBe('skipped');
    expect(buscar).not.toHaveBeenCalled();
  });

  it('8. preserva consulta com sync "local" (nunca sincronizada): nenhuma requisição é feita', async () => {
    const { dispatch } = dispatcherEspiao();
    const consultas: Consultation[] = [{
      id: 'local-1', status: 'anamnese', paciente_nome: 'x', data: '2026-01-01',
      sync: { consulta: { status: 'local', attempts: 0 } },
    }];
    const buscar = vi.fn();

    const resultado = await executarCarregamentoDetalhe('local-1', { consultas, activeConsultation: null, detailStatus: {}, buscar, dispatch });

    expect(resultado).toBe('skipped');
    expect(buscar).not.toHaveBeenCalled();
  });

  it('9. preserva consulta com sync "syncing" (em andamento): nenhuma requisição de detalhe é feita', async () => {
    const { dispatch } = dispatcherEspiao();
    const consultas: Consultation[] = [{
      id: 'local-1', status: 'anamnese', paciente_nome: 'x', data: '2026-01-01',
      sync: { consulta: { status: 'syncing', attempts: 1 } },
    }];
    const buscar = vi.fn();

    const resultado = await executarCarregamentoDetalhe('local-1', { consultas, activeConsultation: null, detailStatus: {}, buscar, dispatch });

    expect(resultado).toBe('skipped');
    expect(buscar).not.toHaveBeenCalled();
  });

  it('10. preserva consulta com sync "failed" (sincronização da CONSULTA falhou, sem backend_id): nenhuma requisição de detalhe é feita', async () => {
    const { dispatch } = dispatcherEspiao();
    const consultas: Consultation[] = [{
      id: 'local-1', status: 'anamnese', paciente_nome: 'x', data: '2026-01-01',
      sync: { consulta: { status: 'failed', attempts: 3, error: 'timeout' } },
    }];
    const buscar = vi.fn();

    const resultado = await executarCarregamentoDetalhe('local-1', { consultas, activeConsultation: null, detailStatus: {}, buscar, dispatch });

    expect(resultado).toBe('skipped');
    expect(buscar).not.toHaveBeenCalled();
  });

  it('11. nunca busca detalhe de uma consulta que não pertence à lista/ativa do usuário atual (nenhum match = nenhuma requisição)', async () => {
    const { dispatch } = dispatcherEspiao();
    const buscar = vi.fn();

    const resultado = await executarCarregamentoDetalhe('id-que-nao-existe-nesta-sessao', {
      consultas: [consultaSincronizada('outra-consulta', 'srv-x')], activeConsultation: null, detailStatus: {}, buscar, dispatch,
    });

    expect(resultado).toBe('skipped');
    expect(buscar).not.toHaveBeenCalled();
  });

  it('12. não converte dado ausente em prescrição vazia: resposta `null` do backend (defesa em profundidade) vira `failed`, nunca `loaded` com array vazio', async () => {
    const { dispatch, acoes } = dispatcherEspiao();
    const consultas = [consultaSincronizada('local-1', 'srv-1')];
    const buscar = vi.fn().mockResolvedValue(null);

    const resultado = await executarCarregamentoDetalhe('local-1', { consultas, activeConsultation: null, detailStatus: {}, buscar, dispatch });

    expect(resultado).toBe('failed');
    expect(acoes.some((a) => a.type === 'HYDRATE_CONSULTATION_DETAIL')).toBe(false);
  });

  it('13. logout durante o carregamento: RESET_SESSION_DATA limpa consultationDetailStatus (nenhum resquício do usuário anterior)', () => {
    const state = baseState({
      consultations: [consultaSincronizada('local-1', 'srv-1')],
      consultationDetailStatus: { 'srv-1': 'loading' },
    });

    const novo = reducer(state, { type: 'RESET_SESSION_DATA' });

    expect(novo.consultationDetailStatus).toEqual({});
    expect(novo.consultations).toEqual([]);
  });

  it('13b. logout IMEDIATAMENTE após um carregamento concluído: RESET_SESSION_DATA também limpa o status "loaded" — nunca vaza para a próxima sessão', () => {
    const state = baseState({
      consultations: [{ ...consultaSincronizada('local-1', 'srv-1'), prescricoesRecuperadas: [{ id: 'p1', status: 'emitida', medicamentos: [MEDICAMENTO_REAL], validade_dias: 30, criado_em: '2026-01-01' }] }],
      consultationDetailStatus: { 'srv-1': 'loaded' },
    });

    const novo = reducer(state, { type: 'RESET_SESSION_DATA' });

    expect(novo.consultationDetailStatus).toEqual({});
    expect(novo.consultations).toEqual([]);
  });
});

describe('mapBackendConsultaToConsultation() — temPrescricaoNoBackend é um fato real, nunca inferido (RM-43)', () => {
  it('true quando o resumo do backend confirma ao menos uma prescrição', () => {
    const r = mapBackendConsultaToConsultation({ id: 'a', status: 'concluida', criado_em: '2026-01-01', prescricoes: [{ id: 'p1', status: 'emitida' }] });
    expect(r.temPrescricaoNoBackend).toBe(true);
  });

  it('false quando o resumo do backend confirma que NÃO há prescrição — distinto de "undefined"', () => {
    const r = mapBackendConsultaToConsultation({ id: 'a', status: 'concluida', criado_em: '2026-01-01', prescricoes: [] });
    expect(r.temPrescricaoNoBackend).toBe(false);
  });
});

describe('executarCarregamentoDetalhe() — guard de sessão (RM-46-03)', () => {
  it('sem `sessaoValida` informado (compatibilidade), o comportamento é idêntico ao anterior (sempre aplica o resultado)', async () => {
    const consultas = [consultaSincronizada('local-1', 'srv-1')];
    const buscar = vi.fn().mockResolvedValue({ prescricoes: [], risco_scores: [] });
    const resultado = await executarCarregamentoDetalhe('local-1', { consultas, activeConsultation: null, detailStatus: {}, buscar, dispatch: () => {} });
    expect(resultado).toBe('loaded');
  });

  it('resposta tardia: sessão mudou entre o início da busca e a resposta chegar — resultado é "skipped", nenhum dispatch aplica o detalhe de uma sessão que não é mais a atual', async () => {
    const acoes: Action[] = [];
    const consultas = [consultaSincronizada('local-1', 'srv-1')];
    const buscar = vi.fn().mockResolvedValue({ prescricoes: [{ id: 'p1', status: 'emitida', medicamentos: [MEDICAMENTO_REAL], orientacoes: null, validade_dias: 30, diagnostico_id: null, criado_em: '2026-01-01' }], risco_scores: [] });

    const resultado = await executarCarregamentoDetalhe('local-1', {
      consultas, activeConsultation: null, detailStatus: {},
      buscar, dispatch: (a) => acoes.push(a),
      sessaoValida: () => false,
    });

    expect(resultado).toBe('skipped');
    expect(acoes.some((a) => a.type === 'HYDRATE_CONSULTATION_DETAIL')).toBe(false);
  });

  it('erro de rede com sessão já inválida: também descarta como "skipped", nunca marca "failed" para uma sessão que não é mais a atual', async () => {
    const acoes: Action[] = [];
    const consultas = [consultaSincronizada('local-1', 'srv-1')];
    const buscar = vi.fn().mockRejectedValue(new Error('404'));

    const resultado = await executarCarregamentoDetalhe('local-1', {
      consultas, activeConsultation: null, detailStatus: {},
      buscar, dispatch: (a) => acoes.push(a),
      sessaoValida: () => false,
    });

    expect(resultado).toBe('skipped');
    expect(acoes.filter((a) => a.type === 'SET_CONSULTATION_DETAIL_STATUS').map((a) => (a as Extract<Action, {type:'SET_CONSULTATION_DETAIL_STATUS'}>).payload.status)).toEqual(['loading']);
  });
});
