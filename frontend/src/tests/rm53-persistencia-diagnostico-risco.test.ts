import { describe, it, expect, vi } from 'vitest';
import {
  reducer,
  executarSincronizacaoConsulta,
  executarCarregamentoDetalhe,
  INITIAL_PAGINATION,
  type AppState,
  type Action,
  type SincronizarConsultaDeps,
} from '@/lib/store';
import type { Consultation, DiagnosticoEstruturado, RiscoCalculado } from '@/lib/types';

// ============================================================
// RM-53 (RM41-023) — Persistência real de diagnóstico e risco clínico
//
// Achado: `avaliarRiscoClinico()` (motor de risco) e a seleção de
// diagnóstico (hipóteses estruturadas com cid10/nome/confiança) sempre
// existiram no frontend, mas NADA no fluxo de sincronização real
// (`executarSincronizacaoConsulta`) jamais chamava `POST /api/diagnostico`
// ou `POST /api/risco` — só `consulta` e `prescricao` eram sincronizadas.
// O backend (schema, DTOs, idempotência, ownership) já estava pronto e
// testado isoladamente desde antes desta rodada; o gap era 100% de
// wiring do frontend (nunca invocar os endpoints) + o endpoint de detalhe
// nem sequer devolvia `risco_scores` na recuperação.
//
// Este arquivo testa o wiring ponta-a-ponta (mockando as chamadas de
// rede) — não reintroduz nem altera nenhuma regra clínica.
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
    status: 'concluida',
    paciente_nome: 'Paciente Teste',
    data: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const DIAGNOSTICO: DiagnosticoEstruturado = { cid: 'I10', descricao: 'Hipertensão Arterial', confianca: 0.85 };

const RISCO_MINIMO = {
  risco_global: 'intermediario',
  score_global: 42,
  alerta_vermelho: false,
  risco_cardiovascular: { nivel: 'intermediario', justificativa: 'x' },
  risco_renal: { nivel: 'baixo', justificativa: 'x' },
  risco_hemorragico: { nivel: 'baixo', justificativa: 'x' },
  risco_farmacologico: { nivel: 'baixo', justificativa: 'x' },
  risco_interacao: { nivel: 'baixo', justificativa: 'x' },
  risco_terapeutico: { nivel: 'baixo', justificativa: 'x' },
  justificativa_global: 'x',
  recomendacoes_prioritarias: ['Monitorar PA'],
} as unknown as RiscoCalculado;

function dispatcherEspiao() {
  const acoes: Action[] = [];
  return { dispatch: (a: Action) => acoes.push(a), acoes };
}

function depsBase(overrides: Partial<SincronizarConsultaDeps> = {}): SincronizarConsultaDeps {
  return {
    criar: vi.fn().mockResolvedValue({ id: 'srv-1' }),
    criarDiagnostico: vi.fn().mockResolvedValue({ id: 'diag-srv-1' }),
    salvarRisco: vi.fn().mockResolvedValue({ id: 'risk-srv-1' }),
    criarPrescricao: vi.fn().mockResolvedValue({ id: 'presc-1' }),
    dispatch: () => {},
    sessaoValida: () => true,
    isAuthenticated: () => true,
    ...overrides,
  };
}

describe('RM-53 (RM41-023) — sincronização real de diagnóstico e risco', () => {
  it('1. diagnóstico estruturado presente: é sincronizado e o id do backend fica disponível', async () => {
    const c = consultaLocal({ diagnostico_estruturado: DIAGNOSTICO });
    const criarDiagnostico = vi.fn().mockResolvedValue({ id: 'diag-srv-1' });
    const resultado = await executarSincronizacaoConsulta(c, depsBase({ criarDiagnostico }));

    expect(criarDiagnostico).toHaveBeenCalledWith(
      expect.objectContaining({ consulta_id: 'srv-1', cid: 'I10', descricao: 'Hipertensão Arterial', confianca: 0.85 }),
    );
    expect(resultado.diagnostico).toBe('synced');
  });

  it('2. risco calculado presente: é sincronizado com o consulta_id real do backend', async () => {
    const c = consultaLocal({ risco_calculado: RISCO_MINIMO });
    const salvarRisco = vi.fn().mockResolvedValue({ id: 'risk-srv-1' });
    const resultado = await executarSincronizacaoConsulta(c, depsBase({ salvarRisco }));

    expect(salvarRisco).toHaveBeenCalledWith('srv-1', RISCO_MINIMO, expect.any(String));
    expect(resultado.risco).toBe('synced');
  });

  it('3. diagnóstico + risco juntos: ambos sincronizam de forma independente e a prescrição recebe o diagnostico_id real', async () => {
    const c = consultaLocal({
      diagnostico_estruturado: DIAGNOSTICO,
      risco_calculado: RISCO_MINIMO,
      prescricao: {
        tipo: 'simples',
        paciente: { nome: 'x' },
        medico: { nome: 'x', crm: 'x' },
        itens: [{ id: '1', medicamento: 'Losartana', concentracao: '', forma_farmaceutica: '', quantidade: '', posologia: '', via: 'VO', duracao: '30 dias', uso_continuo: true, dose_estruturada: { valor: 50, unidade: 'mg', frequencia: '1x/dia', via: 'VO' } }],
        data_emissao: '2026-01-01',
      },
    });
    const criarPrescricao = vi.fn().mockResolvedValue({ id: 'presc-1' });
    const resultado = await executarSincronizacaoConsulta(c, depsBase({ criarPrescricao }));

    expect(resultado).toEqual({ consulta: 'synced', diagnostico: 'synced', risco: 'synced', prescricao: 'synced' });
    expect(criarPrescricao).toHaveBeenCalledWith(expect.objectContaining({ diagnostico_id: 'diag-srv-1' }));
  });

  it('4. ausência real de diagnóstico e risco: nunca fabricados — endpoints nunca chamados, status "nao_tentado"', async () => {
    const c = consultaLocal();
    const criarDiagnostico = vi.fn();
    const salvarRisco = vi.fn();
    const resultado = await executarSincronizacaoConsulta(c, depsBase({ criarDiagnostico, salvarRisco }));

    expect(criarDiagnostico).not.toHaveBeenCalled();
    expect(salvarRisco).not.toHaveBeenCalled();
    expect(resultado.diagnostico).toBe('nao_tentado');
    expect(resultado.risco).toBe('nao_tentado');
  });

  it('5. falha isolada do diagnóstico não bloqueia a sincronização do risco', async () => {
    const c = consultaLocal({ diagnostico_estruturado: DIAGNOSTICO, risco_calculado: RISCO_MINIMO });
    const criarDiagnostico = vi.fn().mockRejectedValue(new Error('HTTP 500'));
    const resultado = await executarSincronizacaoConsulta(c, depsBase({ criarDiagnostico }));

    expect(resultado.diagnostico).toBe('failed');
    expect(resultado.risco).toBe('synced');
  });

  it('6. falha isolada do risco não bloqueia a sincronização do diagnóstico nem da prescrição', async () => {
    const c = consultaLocal({
      diagnostico_estruturado: DIAGNOSTICO,
      risco_calculado: RISCO_MINIMO,
      prescricao: {
        tipo: 'simples',
        paciente: { nome: 'x' },
        medico: { nome: 'x', crm: 'x' },
        itens: [{ id: '1', medicamento: 'Losartana', concentracao: '', forma_farmaceutica: '', quantidade: '', posologia: '', via: 'VO', duracao: '30 dias', uso_continuo: true, dose_estruturada: { valor: 50, unidade: 'mg', frequencia: '1x/dia', via: 'VO' } }],
        data_emissao: '2026-01-01',
      },
    });
    const salvarRisco = vi.fn().mockRejectedValue(new Error('HTTP 500'));
    const resultado = await executarSincronizacaoConsulta(c, depsBase({ salvarRisco }));

    expect(resultado.risco).toBe('failed');
    expect(resultado.diagnostico).toBe('synced');
    expect(resultado.prescricao).toBe('synced');
  });

  it('7. retry: reutiliza a MESMA idempotency_key já registrada em sync.diagnostico/sync.risco (nunca gera uma nova a cada tentativa)', async () => {
    const c = consultaLocal({
      diagnostico_estruturado: DIAGNOSTICO,
      risco_calculado: RISCO_MINIMO,
      sync: {
        consulta: { status: 'synced', attempts: 1, backend_id: 'srv-1' },
        diagnostico: { status: 'failed', attempts: 1, idempotency_key: 'diag-key-fixa' },
        risco: { status: 'failed', attempts: 1, idempotency_key: 'risco-key-fixa' },
      },
    });
    const criarDiagnostico = vi.fn().mockResolvedValue({ id: 'diag-srv-1' });
    const salvarRisco = vi.fn().mockResolvedValue({ id: 'risk-srv-1' });
    await executarSincronizacaoConsulta(c, depsBase({ criarDiagnostico, salvarRisco }));

    expect(criarDiagnostico).toHaveBeenCalledWith(expect.objectContaining({ idempotency_key: 'diag-key-fixa' }));
    expect(salvarRisco).toHaveBeenCalledWith('srv-1', RISCO_MINIMO, 'risco-key-fixa');
  });

  it('8. sessão inválida durante a sincronização: nenhum dispatch de diagnóstico/risco é aplicado ao estado local', async () => {
    const c = consultaLocal({ diagnostico_estruturado: DIAGNOSTICO, risco_calculado: RISCO_MINIMO });
    const { dispatch, acoes } = dispatcherEspiao();
    let chamadas = 0;
    const sessaoValida = () => {
      chamadas++;
      // sessão válida só na 1ª checagem (a da consulta) — inválida depois
      return chamadas === 1;
    };
    await executarSincronizacaoConsulta(c, depsBase({ dispatch, sessaoValida }));

    const dispatchesDiagnosticoOuRisco = acoes.filter(
      (a) => a.type === 'SET_SYNC_STATE' && (a.payload.resource === 'diagnostico' || a.payload.resource === 'risco'),
    );
    expect(dispatchesDiagnosticoOuRisco).toHaveLength(0);
  });
});

describe('RM-53 (RM41-023) — reducer: SET_DIAGNOSTICO_ESTRUTURADO / SET_RISCO_CALCULADO', () => {
  it('9. SET_DIAGNOSTICO_ESTRUTURADO grava o diagnóstico estruturado na consulta ativa e na lista', () => {
    const c = consultaLocal();
    const state = baseState({ activeConsultation: c, consultations: [c] });
    const next = reducer(state, { type: 'SET_DIAGNOSTICO_ESTRUTURADO', payload: DIAGNOSTICO });

    expect(next.activeConsultation?.diagnostico_estruturado).toEqual(DIAGNOSTICO);
    expect(next.consultations[0].diagnostico_estruturado).toEqual(DIAGNOSTICO);
  });

  it('10. SET_RISCO_CALCULADO grava o risco calculado na consulta ativa e na lista', () => {
    const c = consultaLocal();
    const state = baseState({ activeConsultation: c, consultations: [c] });
    const next = reducer(state, { type: 'SET_RISCO_CALCULADO', payload: RISCO_MINIMO });

    expect(next.activeConsultation?.risco_calculado).toEqual(RISCO_MINIMO);
    expect(next.consultations[0].risco_calculado).toEqual(RISCO_MINIMO);
  });

  it('11. sem consulta ativa: SET_DIAGNOSTICO_ESTRUTURADO/SET_RISCO_CALCULADO são no-ops (nunca lançam)', () => {
    const state = baseState({ activeConsultation: null });
    expect(() => reducer(state, { type: 'SET_DIAGNOSTICO_ESTRUTURADO', payload: DIAGNOSTICO })).not.toThrow();
    expect(() => reducer(state, { type: 'SET_RISCO_CALCULADO', payload: RISCO_MINIMO })).not.toThrow();
  });
});

describe('RM-53 (RM41-023) — recuperação real do risco persistido (RM-43 estendido)', () => {
  function consultaSincronizada(id: string, backendId: string): Consultation {
    return {
      id,
      status: 'concluida',
      paciente_nome: 'Paciente Teste',
      data: '2026-01-01T00:00:00.000Z',
      sync: { consulta: { status: 'synced', attempts: 0, backend_id: backendId } },
    };
  }

  it('12. detalhe com risk score real: riscosRecuperados reflete exatamente o que o backend persistiu (nunca fabricado)', async () => {
    const { dispatch, acoes } = dispatcherEspiao();
    const consultas = [consultaSincronizada('local-1', 'srv-1')];
    const buscar = vi.fn().mockResolvedValue({
      prescricoes: [],
      risco_scores: [{ id: 'risk-1', risco_global: 'intermediario', score_global: 42, alerta_vermelho: false, recomendacoes: ['Monitorar PA'], criado_em: '2026-01-01' }],
    });

    await executarCarregamentoDetalhe('local-1', { consultas, activeConsultation: null, detailStatus: {}, buscar, dispatch });

    const hidratacao = acoes.find((a) => a.type === 'HYDRATE_CONSULTATION_DETAIL') as Extract<Action, { type: 'HYDRATE_CONSULTATION_DETAIL' }>;
    expect(hidratacao.payload.riscosRecuperados).toEqual([
      { id: 'risk-1', risco_global: 'intermediario', score_global: 42, alerta_vermelho: false, recomendacoes: ['Monitorar PA'], criado_em: '2026-01-01' },
    ]);
  });

  it('13. detalhe sem risk score real: riscosRecuperados é array vazio genuíno, nunca omitido nem fabricado', async () => {
    const { dispatch, acoes } = dispatcherEspiao();
    const consultas = [consultaSincronizada('local-1', 'srv-1')];
    const buscar = vi.fn().mockResolvedValue({ prescricoes: [], risco_scores: [] });

    await executarCarregamentoDetalhe('local-1', { consultas, activeConsultation: null, detailStatus: {}, buscar, dispatch });

    const hidratacao = acoes.find((a) => a.type === 'HYDRATE_CONSULTATION_DETAIL') as Extract<Action, { type: 'HYDRATE_CONSULTATION_DETAIL' }>;
    expect(hidratacao.payload.riscosRecuperados).toEqual([]);
  });

  it('14. HYDRATE_CONSULTATION_DETAIL aplica riscosRecuperados à consulta correta (localizada por backend_id)', () => {
    const state = baseState({ consultations: [consultaSincronizada('local-1', 'srv-1')] });
    const riscosRecuperados = [{ id: 'risk-1', risco_global: 'baixo', score_global: 10, alerta_vermelho: false, recomendacoes: [], criado_em: '2026-01-01' }];
    const next = reducer(state, {
      type: 'HYDRATE_CONSULTATION_DETAIL',
      payload: { backendId: 'srv-1', prescricoesRecuperadas: [], riscosRecuperados },
    });

    expect(next.consultations[0].riscosRecuperados).toEqual(riscosRecuperados);
  });
});
