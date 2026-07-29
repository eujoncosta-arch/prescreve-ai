import { describe, it, expect } from 'vitest';
import { reducer, mapBackendConsultaToConsultation, INITIAL_PAGINATION, type AppState } from '@/lib/store';
import type { Consultation } from '@/lib/types';

// ============================================================
// RM-42 — Hidratação de `state.consultations` a partir do backend real
//
// Achado durante a auditoria RM-38: `state.consultations` nunca era
// populado por `consultaApi.listar()` — só por consultas criadas NA
// SESSÃO ATUAL. Em produção, o histórico real de um médico (já
// persistido com sucesso no backend em sessões anteriores) desaparecia
// ao recarregar a página. Corrigido com a ação `HYDRATE_CONSULTATIONS`
// e a função `mapBackendConsultaToConsultation` — testados aqui sem
// depender de renderização de componente (funções puras exportadas de
// `store.tsx`).
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

function consultaLocal(overrides: Partial<Consultation> = {}): Consultation {
  return {
    id: 'local-1',
    status: 'anamnese',
    paciente_nome: 'Paciente Teste',
    data: new Date().toISOString(),
    ...overrides,
  };
}

describe('mapBackendConsultaToConsultation() — nunca fabrica dado clínico (RM-42)', () => {
  it('mapeia status em_andamento/concluida/cancelada corretamente', () => {
    expect(mapBackendConsultaToConsultation({ id: 'a', status: 'em_andamento', criado_em: '2026-01-01' }).status).toBe('anamnese');
    expect(mapBackendConsultaToConsultation({ id: 'b', status: 'concluida', criado_em: '2026-01-01' }).status).toBe('concluida');
    // "cancelada" não tem equivalente no frontend — nunca reaberta como pendente.
    expect(mapBackendConsultaToConsultation({ id: 'c', status: 'cancelada', criado_em: '2026-01-01' }).status).toBe('concluida');
  });

  it('usa a descrição do diagnóstico selecionado como rótulo quando disponível (dado real, não fabricado)', () => {
    const r = mapBackendConsultaToConsultation({
      id: 'a',
      status: 'concluida',
      criado_em: '2026-01-01',
      diagnosticos: [{ cid: 'J45', descricao: 'Asma', selecionado: true }],
    });
    expect(r.paciente_nome).toBe('Asma');
    expect(r.diagnostico_selecionado).toBe('J45');
  });

  it('sem diagnóstico disponível, usa rótulo explícito "não identificado" — NUNCA um nome de pessoa inventado', () => {
    const r = mapBackendConsultaToConsultation({ id: 'a', status: 'concluida', criado_em: '2026-01-01' });
    expect(r.paciente_nome).toBe('Paciente não identificado');
  });

  it('nunca inclui `prescricao` (listagem paginada não traz itens/tipo reais — evita fabricar "0 medicamentos")', () => {
    const r = mapBackendConsultaToConsultation({
      id: 'a',
      status: 'concluida',
      criado_em: '2026-01-01',
      prescricoes: [{ id: 'rx1', status: 'ok' }],
    });
    expect(r.prescricao).toBeUndefined();
  });

  it('marca a consulta hidratada como sincronizada com o backend_id real, para deduplicação futura', () => {
    const r = mapBackendConsultaToConsultation({ id: 'srv-123', status: 'concluida', criado_em: '2026-01-01' });
    expect(r.sync?.consulta).toEqual({ status: 'synced', attempts: 0, backend_id: 'srv-123' });
  });
});

describe('reducer HYDRATE_CONSULTATIONS — nunca sobrescreve consulta local não sincronizada (RM-42)', () => {
  it('consulta local com sync "local" (nunca tentou sincronizar) é preservada mesmo com hidratação concluída', () => {
    const local = consultaLocal({ id: 'local-1', sync: { consulta: { status: 'local', attempts: 0 } } });
    const state = baseState({ consultations: [local] });
    const hidratada = mapBackendConsultaToConsultation({ id: 'srv-1', status: 'concluida', criado_em: '2026-01-01' });

    const novo = reducer(state, { type: 'HYDRATE_CONSULTATIONS', payload: [hidratada] });

    expect(novo.consultations.some((c) => c.id === 'local-1')).toBe(true);
    expect(novo.consultations.some((c) => c.id === 'srv-1')).toBe(true);
    expect(novo.consultations).toHaveLength(2);
  });

  it('consulta local com sync "failed" (sincronização falhou) é preservada, nunca descartada pela hidratação', () => {
    const local = consultaLocal({ id: 'local-2', sync: { consulta: { status: 'failed', attempts: 3, error: 'timeout' } } });
    const state = baseState({ consultations: [local] });

    const novo = reducer(state, { type: 'HYDRATE_CONSULTATIONS', payload: [] });

    expect(novo.consultations).toHaveLength(1);
    expect(novo.consultations[0].id).toBe('local-2');
  });

  it('consulta local com sync "syncing" (em andamento) é preservada, nunca substituída no meio de uma tentativa', () => {
    const local = consultaLocal({ id: 'local-3', sync: { consulta: { status: 'syncing', attempts: 1 } } });
    const state = baseState({ consultations: [local] });

    const novo = reducer(state, { type: 'HYDRATE_CONSULTATIONS', payload: [] });

    expect(novo.consultations).toHaveLength(1);
    expect(novo.consultations[0].id).toBe('local-3');
  });

  it('consulta local já sincronizada (backend_id conhecido) NÃO duplica quando a hidratação traz o mesmo registro do backend', () => {
    const local = consultaLocal({
      id: 'local-4',
      sync: { consulta: { status: 'synced', attempts: 1, backend_id: 'srv-4' } },
    });
    const state = baseState({ consultations: [local] });
    const hidratada = mapBackendConsultaToConsultation({ id: 'srv-4', status: 'concluida', criado_em: '2026-01-01' });

    const novo = reducer(state, { type: 'HYDRATE_CONSULTATIONS', payload: [hidratada] });

    expect(novo.consultations).toHaveLength(1);
    expect(novo.consultations[0].id).toBe('srv-4');
  });

  it('consultas históricas do backend (sem correspondente local) são adicionadas à lista', () => {
    const state = baseState({ consultations: [] });
    const hidratadas = [
      mapBackendConsultaToConsultation({ id: 'srv-a', status: 'concluida', criado_em: '2026-01-01' }),
      mapBackendConsultaToConsultation({ id: 'srv-b', status: 'em_andamento', criado_em: '2026-01-02' }),
    ];

    const novo = reducer(state, { type: 'HYDRATE_CONSULTATIONS', payload: hidratadas });

    expect(novo.consultations.map((c) => c.id).sort()).toEqual(['srv-a', 'srv-b']);
  });

  it('mistura correta: uma consulta local pendente + histórico do backend coexistem sem perda nem duplicação', () => {
    const pendente = consultaLocal({ id: 'pendente-1', sync: { consulta: { status: 'local', attempts: 0 } } });
    const jaSincronizada = consultaLocal({
      id: 'ja-sinc',
      sync: { consulta: { status: 'synced', attempts: 1, backend_id: 'srv-x' } },
    });
    const state = baseState({ consultations: [pendente, jaSincronizada] });
    const historico = [
      mapBackendConsultaToConsultation({ id: 'srv-x', status: 'concluida', criado_em: '2026-01-01' }), // mesma que já sincronizada
      mapBackendConsultaToConsultation({ id: 'srv-y', status: 'concluida', criado_em: '2025-12-01' }), // histórico novo
    ];

    const novo = reducer(state, { type: 'HYDRATE_CONSULTATIONS', payload: historico });

    const ids = novo.consultations.map((c) => c.id).sort();
    expect(ids).toEqual(['pendente-1', 'srv-x', 'srv-y']);
  });
});

describe('reducer RESET_SESSION_DATA — troca de usuário nunca vaza consultas do usuário anterior (RM-42)', () => {
  it('limpa consultations e activeConsultation', () => {
    const state = baseState({
      consultations: [consultaLocal({ id: 'a' })],
      activeConsultation: consultaLocal({ id: 'a' }),
    });
    const novo = reducer(state, { type: 'RESET_SESSION_DATA' });
    expect(novo.consultations).toEqual([]);
    expect(novo.activeConsultation).toBeNull();
  });
});
