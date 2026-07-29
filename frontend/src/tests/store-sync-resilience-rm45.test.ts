import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  reducer,
  podeSincronizar,
  executarSincronizacaoConsulta,
  persistirConsultasPendentes,
  restaurarConsultasPendentes,
  INITIAL_PAGINATION,
  type AppState,
  type Action,
  type SincronizarConsultaDeps,
} from '@/lib/store';
import type { Consultation } from '@/lib/types';

// ============================================================
// RM-45 — Sincronização resiliente de consulta/prescrição
//
// Auditoria encontrou 3 riscos reais em `sincronizarConsulta` (ver
// docs/RM-45-SYNC-RESILIENCE-REPORT.md):
//   A) nada impedia duas chamadas concorrentes para a MESMA consulta
//      gerarem idempotency_keys DIFERENTES (corrida) → duplicação real
//      no backend;
//   B) uma sincronização em voo podia completar/continuar DEPOIS de um
//      logout+login de outro usuário, usando o token do usuário errado;
//   C) um retry perdido numa consulta já `synced` reenviava o POST sem
//      necessidade.
// Corrigidos com `podeSincronizar` (guard de concorrência/status) e
// `sessaoValida()` (guard de sessão), verificados na função pura
// `executarSincronizacaoConsulta` — testada aqui sem renderizar
// componente.
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
    data: new Date().toISOString(),
    anamnese: { queixa_principal: 'Febre', hda: 'x', hpp: 'x', historia_familiar: '', habitos_vida: {}, exame_fisico: '', sinais_vitais: {}, laboratorio: {}, imagem: '', comorbidades: [], medicamentos_em_uso: [], alergias: [], gestante: false, lactante: false, funcao_renal: {}, funcao_hepatica: {} },
    ...overrides,
  };
}

function erroComStatus(status: number): Error {
  return Object.assign(new Error(`HTTP ${status}`), { status });
}

function dispatcherEspiao() {
  const acoes: Action[] = [];
  return { dispatch: (a: Action) => acoes.push(a), acoes };
}

function depsBase(overrides: Partial<SincronizarConsultaDeps> = {}): SincronizarConsultaDeps {
  const { dispatch } = dispatcherEspiao();
  return {
    criar: vi.fn().mockResolvedValue({ id: 'srv-1' }),
    criarDiagnostico: vi.fn().mockResolvedValue({ id: 'diag-1' }),
    salvarRisco: vi.fn().mockResolvedValue({ id: 'risk-1' }),
    criarPrescricao: vi.fn().mockResolvedValue({ id: 'presc-1' }),
    dispatch,
    sessaoValida: () => true,
    isAuthenticated: () => true,
    ...overrides,
  };
}

describe('podeSincronizar() — guard de concorrência e status (RM-45)', () => {
  it('9/11. consulta local/failed pode sincronizar (retry manual permitido)', () => {
    expect(podeSincronizar(consultaLocal({ sync: { consulta: { status: 'local', attempts: 0 } } }), new Set())).toBe(true);
    expect(podeSincronizar(consultaLocal({ sync: { consulta: { status: 'failed', attempts: 3 } } }), new Set())).toBe(true);
  });

  it('13/14. já em andamento (mesmo id) — recusa; ids diferentes não se bloqueiam', () => {
    const emAndamento = new Set(['local-1']);
    expect(podeSincronizar(consultaLocal({ id: 'local-1' }), emAndamento)).toBe(false);
    expect(podeSincronizar(consultaLocal({ id: 'local-2' }), emAndamento)).toBe(true);
  });

  it('18. consulta já "synced" nunca é resincronizada (backend_id gravado uma única vez)', () => {
    const sincronizada = consultaLocal({ sync: { consulta: { status: 'synced', attempts: 1, backend_id: 'srv-1' } } });
    expect(podeSincronizar(sincronizada, new Set())).toBe(false);
  });

  it('consulta "syncing" (tentativa em andamento) nunca dispara uma segunda', () => {
    const emSincronizacao = consultaLocal({ sync: { consulta: { status: 'syncing', attempts: 1 } } });
    expect(podeSincronizar(emSincronizacao, new Set())).toBe(false);
  });
});

describe('executarSincronizacaoConsulta() — ciclo local → syncing → synced/failed (RM-45)', () => {
  it('1. sucesso: consulta e prescrição sincronizam, backend_id é gravado', async () => {
    const { dispatch, acoes } = dispatcherEspiao();
    const c = consultaLocal({ prescricao: { tipo: 'simples', paciente: { nome: 'x' }, medico: { nome: 'x', crm: 'x' }, itens: [{ id: '1', medicamento: 'Amoxicilina', concentracao: '', forma_farmaceutica: '', quantidade: '', posologia: '', via: 'VO', duracao: '7 dias', uso_continuo: false, dose_estruturada: { valor: 500, unidade: 'mg', frequencia: '3x/dia', via: 'VO' } }], data_emissao: '2026-01-01' } });

    const resultado = await executarSincronizacaoConsulta(c, depsBase({ dispatch }));

    expect(resultado).toEqual({ consulta: 'synced', diagnostico: 'nao_tentado', risco: 'nao_tentado', prescricao: 'synced' });
    // Duas dispatches 'synced' para 'consulta': a intermediária do syncResource
    // (sem backend_id) e a explícita desta função (com backend_id) — pega a última.
    const sincronizada = [...acoes].reverse().find((a) => a.type === 'SET_SYNC_STATE' && a.payload.resource === 'consulta' && a.payload.state.status === 'synced' && a.payload.state.backend_id) as Extract<Action, { type: 'SET_SYNC_STATE' }>;
    expect(sincronizada.payload.state.backend_id).toBe('srv-1');

    // RM-50 (RM41-033): `sync.prescricao.backend_id` também precisa ser
    // gravado — antes desta correção, só `sync.consulta.backend_id` era
    // preenchido; a prescrição sincronizava com sucesso mas seu id real do
    // backend nunca ficava disponível no estado local.
    const prescricaoSincronizada = [...acoes].reverse().find((a) => a.type === 'SET_SYNC_STATE' && a.payload.resource === 'prescricao' && a.payload.state.status === 'synced' && a.payload.state.backend_id) as Extract<Action, { type: 'SET_SYNC_STATE' }>;
    expect(prescricaoSincronizada).toBeDefined();
    expect(prescricaoSincronizada.payload.state.backend_id).toBe('presc-1');
  });

  it('2. timeout com resposta eventualmente persistida: primeira tentativa falha (rede), retry interno do syncResource sucede', async () => {
    const criar = vi.fn()
      .mockRejectedValueOnce(new Error('network timeout'))
      .mockResolvedValueOnce({ id: 'srv-2' });

    const resultado = await executarSincronizacaoConsulta(consultaLocal(), depsBase({ criar }));

    expect(resultado.consulta).toBe('synced');
    expect(criar).toHaveBeenCalledTimes(2);
  });

  it('3. retry sem duplicação: a MESMA idempotency_key é reutilizada em toda tentativa (nunca gera uma nova)', async () => {
    const chamadas: string[] = [];
    const criar = vi.fn().mockImplementation((dados: { idempotency_key: string }) => {
      chamadas.push(dados.idempotency_key);
      return chamadas.length < 3 ? Promise.reject(new Error('network')) : Promise.resolve({ id: 'srv-3' });
    });

    await executarSincronizacaoConsulta(consultaLocal(), depsBase({ criar }));

    expect(new Set(chamadas).size).toBe(1); // uma única chave em todas as tentativas
  });

  it('4. erro de rede: sem `status` HTTP, é retryable — falha só após esgotar as tentativas', async () => {
    const criar = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
    const resultado = await executarSincronizacaoConsulta(consultaLocal(), depsBase({ criar }));
    expect(resultado.consulta).toBe('failed');
    expect(criar.mock.calls.length).toBeGreaterThan(1); // retentou
  });

  it('5. erro 500: retryable — várias tentativas antes de desistir', async () => {
    const criar = vi.fn().mockRejectedValue(erroComStatus(500));
    const resultado = await executarSincronizacaoConsulta(consultaLocal(), depsBase({ criar }));
    expect(resultado.consulta).toBe('failed');
    expect(criar.mock.calls.length).toBeGreaterThan(1);
  });

  it('6. erro 409: NÃO retryable — falha imediatamente após 1 tentativa', async () => {
    const criar = vi.fn().mockRejectedValue(erroComStatus(409));
    const resultado = await executarSincronizacaoConsulta(consultaLocal(), depsBase({ criar }));
    expect(resultado.consulta).toBe('failed');
    expect(criar).toHaveBeenCalledTimes(1);
  });

  it('7. erro 400: NÃO retryable — falha imediatamente, nunca reenvia o mesmo payload inválido', async () => {
    const criar = vi.fn().mockRejectedValue(erroComStatus(400));
    const resultado = await executarSincronizacaoConsulta(consultaLocal(), depsBase({ criar }));
    expect(resultado.consulta).toBe('failed');
    expect(criar).toHaveBeenCalledTimes(1);
  });

  it('8. erro 401: NÃO retryable, falha imediatamente, e NUNCA é reportado como synced', async () => {
    const criar = vi.fn().mockRejectedValue(erroComStatus(401));
    const resultado = await executarSincronizacaoConsulta(consultaLocal(), depsBase({ criar }));
    expect(resultado.consulta).toBe('failed');
    expect(criar).toHaveBeenCalledTimes(1);
  });

  it('9. usuário não autenticado: consulta permanece "local" — nenhuma chamada de rede é feita', async () => {
    const criar = vi.fn();
    const resultado = await executarSincronizacaoConsulta(consultaLocal(), depsBase({ criar, isAuthenticated: () => false }));
    expect(resultado).toEqual({ consulta: 'local' });
    expect(criar).not.toHaveBeenCalled();
  });

  it('12. retry bem-sucedido: uma tentativa após falha anterior, com sucesso desta vez, sincroniza normalmente', async () => {
    const c = consultaLocal({ sync: { consulta: { status: 'failed', attempts: 3, error: 'timeout anterior' } } });
    const resultado = await executarSincronizacaoConsulta(c, depsBase());
    expect(resultado.consulta).toBe('synced');
  });

  it('15. logout durante sync: sessão inválida — o fato de rede (synced) é reportado, mas NENHUM dispatch atualiza o estado local de uma sessão que já não é a atual', async () => {
    const { dispatch, acoes } = dispatcherEspiao();
    const resultado = await executarSincronizacaoConsulta(consultaLocal(), depsBase({ dispatch, sessaoValida: () => false }));
    // A consulta realmente foi criada no backend (fato real, não fabricado) —
    // mas como a sessão mudou, nenhum dispatch é feito para refletir isso
    // localmente (RESET_SESSION_DATA já limpou o que precisava ser limpo).
    expect(resultado.consulta).toBe('synced');
    expect(acoes.filter((a) => a.type === 'SET_SYNC_STATE')).toHaveLength(0);
  });

  it('16. troca de usuário: mesma garantia de sessaoValida — nenhuma prescrição é enviada com o token do novo usuário', async () => {
    const criarPrescricao = vi.fn();
    const c = consultaLocal({ prescricao: { tipo: 'simples', paciente: { nome: 'x' }, medico: { nome: 'x', crm: 'x' }, itens: [], data_emissao: '2026-01-01' } });
    const resultado = await executarSincronizacaoConsulta(c, depsBase({ sessaoValida: () => false, criarPrescricao }));
    expect(resultado.consulta).toBe('synced');
    expect(criarPrescricao).not.toHaveBeenCalled();
  });

  it('17. resposta tardia: consulta sincroniza com sucesso mas a sessão muda IMEDIATAMENTE depois — prescrição nunca é enviada sob a sessão errada', async () => {
    let valida = true;
    const criar = vi.fn().mockImplementation(async () => {
      // Simula a sessão mudando no exato instante em que o backend confirma
      // a consulta — antes de qualquer decisão sobre a prescrição.
      const resposta = { id: 'srv-1' };
      valida = false;
      return resposta;
    });
    const criarPrescricao = vi.fn().mockResolvedValue({ id: 'presc-x' });
    const c = consultaLocal({ prescricao: { tipo: 'simples', paciente: { nome: 'x' }, medico: { nome: 'x', crm: 'x' }, itens: [{ id: '1', medicamento: 'X', concentracao: '', forma_farmaceutica: '', quantidade: '', posologia: '', via: 'VO', duracao: '1 dia', uso_continuo: false, dose_estruturada: { valor: 1, unidade: 'mg', frequencia: '1x/dia', via: 'VO' } }], data_emissao: '2026-01-01' } });

    const resultado = await executarSincronizacaoConsulta(c, depsBase({
      criar, criarPrescricao,
      sessaoValida: () => valida,
    }));

    expect(resultado.consulta).toBe('synced'); // a consulta já havia sido confirmada com a sessão correta
    expect(resultado.prescricao).toBe('nao_tentada');
    expect(criarPrescricao).not.toHaveBeenCalled();
  });

  it('medicamento sem dose estruturada bloqueia a prescrição, mas a consulta permanece sincronizada', async () => {
    const c = consultaLocal({ prescricao: { tipo: 'simples', paciente: { nome: 'x' }, medico: { nome: 'x', crm: 'x' }, itens: [{ id: '1', medicamento: 'X', concentracao: '', forma_farmaceutica: '', quantidade: '', posologia: '', via: 'VO', duracao: '1 dia', uso_continuo: false }], data_emissao: '2026-01-01' } });
    const criarPrescricao = vi.fn();
    const resultado = await executarSincronizacaoConsulta(c, depsBase({ criarPrescricao }));
    expect(resultado).toEqual({ consulta: 'synced', diagnostico: 'nao_tentado', risco: 'nao_tentado', prescricao: 'sem_dose_estruturada' });
    expect(criarPrescricao).not.toHaveBeenCalled();
  });
});

describe('reducer SET_SYNC_STATE — preservação de dados locais (RM-45)', () => {
  it('10. consulta "failed" preserva TODOS os dados clínicos — só o campo `sync` muda', () => {
    const c = consultaLocal({ id: 'x', anamnese: { queixa_principal: 'Dor torácica', hda: 'y', hpp: '', historia_familiar: '', habitos_vida: {}, exame_fisico: '', sinais_vitais: {}, laboratorio: {}, imagem: '', comorbidades: [], medicamentos_em_uso: [], alergias: [], gestante: false, lactante: false, funcao_renal: {}, funcao_hepatica: {} } });
    const state = baseState({ consultations: [c] });

    const novo = reducer(state, { type: 'SET_SYNC_STATE', payload: { consultaId: 'x', resource: 'consulta', state: { status: 'failed', attempts: 3, error: 'timeout' } } });

    expect(novo.consultations[0].anamnese?.queixa_principal).toBe('Dor torácica');
    expect(novo.consultations[0].paciente_nome).toBe(c.paciente_nome);
    expect(novo.consultations[0].sync?.consulta?.status).toBe('failed');
  });

  it('20. dados locais não são sobrescritos por uma atualização de status de sync de OUTRA consulta', () => {
    const a = consultaLocal({ id: 'a', paciente_nome: 'A' });
    const b = consultaLocal({ id: 'b', paciente_nome: 'B' });
    const state = baseState({ consultations: [a, b] });

    const novo = reducer(state, { type: 'SET_SYNC_STATE', payload: { consultaId: 'a', resource: 'consulta', state: { status: 'syncing', attempts: 1 } } });

    expect(novo.consultations.find((c) => c.id === 'b')).toEqual(b); // intocada
    expect(novo.consultations.find((c) => c.id === 'a')?.sync?.consulta?.status).toBe('syncing');
  });

  it('19. hidratação posterior (RM-44) não duplica uma consulta cujo backend_id já foi gravado por esta sincronização', () => {
    const sincronizada = consultaLocal({ id: 'local-x', sync: { consulta: { status: 'synced', attempts: 1, backend_id: 'srv-x' } } });
    const state = baseState({ consultations: [sincronizada] });

    const hidratada: Consultation = { id: 'srv-x', status: 'concluida', paciente_nome: 'Paciente não identificado', data: '2026-01-01', sync: { consulta: { status: 'synced', attempts: 0, backend_id: 'srv-x' } } };
    const novo = reducer(state, { type: 'HYDRATE_CONSULTATIONS_PAGE', payload: { hidratadas: [hidratada], pagina: 1, limite: 20, total: 1 } });

    expect(novo.consultations).toHaveLength(1);
  });
});

describe('persistência local mínima de consultas pendentes (RM-45)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persiste apenas consultas NÃO sincronizadas (local/syncing/failed) — nunca as já synced', () => {
    const pendente = consultaLocal({ id: 'p1', sync: { consulta: { status: 'failed', attempts: 1 } } });
    const sincronizada = consultaLocal({ id: 's1', sync: { consulta: { status: 'synced', attempts: 1, backend_id: 'srv-1' } } });

    persistirConsultasPendentes([pendente, sincronizada]);
    const restauradas = restaurarConsultasPendentes();

    expect(restauradas.map((c) => c.id)).toEqual(['p1']);
  });

  it('9/10. uma falha de rede NÃO apaga a consulta local: restaurada após reload, ainda com os dados clínicos', () => {
    const pendente = consultaLocal({ id: 'p2', anamnese: { queixa_principal: 'Cefaleia', hda: '', hpp: '', historia_familiar: '', habitos_vida: {}, exame_fisico: '', sinais_vitais: {}, laboratorio: {}, imagem: '', comorbidades: [], medicamentos_em_uso: [], alergias: [], gestante: false, lactante: false, funcao_renal: {}, funcao_hepatica: {} }, sync: { consulta: { status: 'failed', attempts: 2, error: 'network' } } });

    persistirConsultasPendentes([pendente]);
    const restauradas = restaurarConsultasPendentes();

    expect(restauradas).toHaveLength(1);
    expect(restauradas[0].anamnese?.queixa_principal).toBe('Cefaleia');
    expect(restauradas[0].sync?.consulta?.status).toBe('failed'); // continua indicando que não foi sincronizada
  });

  it('uma consulta restaurada com status "syncing" é normalizada para "failed" (o reload interrompeu a tentativa — nunca reaparece como spinner permanente)', () => {
    const emVoo = consultaLocal({ id: 'p3', sync: { consulta: { status: 'syncing', attempts: 1 } } });
    persistirConsultasPendentes([emVoo]);
    const restauradas = restaurarConsultasPendentes();
    expect(restauradas[0].sync?.consulta?.status).toBe('failed');
  });

  it('quando não há nenhuma consulta pendente, a chave é removida (nunca deixa um array vazio obsoleto)', () => {
    persistirConsultasPendentes([consultaLocal({ sync: { consulta: { status: 'synced', attempts: 1, backend_id: 'x' } } })]);
    expect(localStorage.getItem('prescreve_ai_consultas_pendentes')).toBeNull();
  });
});

describe('reducer RESTORE_PENDING_CONSULTATIONS (RM-45)', () => {
  it('adiciona consultas restauradas sem duplicar as que já estão na lista', () => {
    const existente = consultaLocal({ id: 'x' });
    const state = baseState({ consultations: [existente] });
    const novo = reducer(state, { type: 'RESTORE_PENDING_CONSULTATIONS', payload: [existente, consultaLocal({ id: 'y' })] });
    expect(novo.consultations.map((c) => c.id).sort()).toEqual(['x', 'y']);
  });
});
