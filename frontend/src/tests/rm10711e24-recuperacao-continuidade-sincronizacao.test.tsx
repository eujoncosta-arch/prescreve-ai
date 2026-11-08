// ============================================================
// RM-107.1.1-E2.4 — Recuperação persistente, continuidade de bloqueios e integridade da sincronização.
// Fluxos A–T. Usa o reducer REAL, o localStorage REAL (jsdom), `executarSincronizacaoConsulta` REAL e um servidor FALSO em memória
// (modelo de idempotência por chave) apenas para observar o payload efetivamente enviado. A evidência do SERVIDOR REAL (backend) está
// nos specs do backend citados no relatório — este arquivo NÃO a substitui.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { render, screen, within, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const h = vi.hoisted(() => ({ app: {} as Record<string, unknown>, ctx: null as null | import('react').Context<Record<string, unknown> | null> }));
vi.mock('@/lib/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/store')>();
  const R = await import('react');
  // Dentro do Harness o valor vem de um Context (sem mutar nada durante a renderização); fora dele, de `h.app`.
  const useCtx = (): Record<string, unknown> | null => R.useContext(h.ctx as import('react').Context<Record<string, unknown> | null>);
  return { ...actual, useApp: () => useCtx() ?? h.app };
});

import {
  reducer, executarSincronizacaoConsulta, podeSincronizar, persistirConsultasPendentes, restaurarConsultasPendentes, consultaTemPendenciaLocal,
  INITIAL_PAGINATION, type AppState, type Action, type SincronizarConsultaDeps,
} from '@/lib/store';
import type { Consultation, PrescriptionItem, DoseEstruturada } from '@/lib/types';
import { PrescricoesLocaisPendentes } from '@/components/modules/PrescricoesLocaisPendentes';
import { StatusRegistroPrescricao } from '@/components/modules/StatusRegistroPrescricao';
import { classificarSincronizacaoPrescricao } from '@/lib/sincronizacao-prescricao';
import { avaliarIntegridadeDto } from '@/lib/posologia-consistencia';
import { classificarErroDeSincronizacao, TimeoutError } from '@/lib/sync-engine';
import { itemParaRevisao, prepararItemParaStore, registrarEdicaoPosologica, reconfirmarDoseEstruturada, registroDeRecomendacaoTexto } from '@/lib/prescricao-proveniencia';
import { estadosDoRegistro } from '@/lib/dose-contract';
import { eventosDaSessao, limparTrilhaDaSessao } from '@/lib/trilha-sessao-posologia';

const AppCtx = React.createContext<Record<string, unknown> | null>(null);
h.ctx = AppCtx;
const DTO: DoseEstruturada = { valor: 500, unidade: 'mg', frequencia: '3x/dia', via: 'VO' };
const DTO2: DoseEstruturada = { valor: 1, unidade: 'g', frequencia: 'a_cada_6h', via: 'VO' };
const KEY = 'prescreve_ai_consultas_pendentes';

const item = (over: Partial<PrescriptionItem> = {}): PrescriptionItem => ({
  id: 'i1', medicamento: 'Amoxicilina', concentracao: '500 mg', forma_farmaceutica: 'Comprimido', quantidade: '21 comprimidos',
  posologia: 'Amoxicilina 500 mg 8/8h', via: 'VO', duracao: '7 dias', uso_continuo: false, instrucoes_especiais: 'Tomar após refeição', dose_estruturada: DTO, ...over,
});
const itemF2 = (over: Partial<PrescriptionItem> = {}): PrescriptionItem => {
  const base = item(over);
  return { ...base, posologia_registrada: registroDeRecomendacaoTexto({ texto: base.posologia, dose: base.dose_estruturada, criado_em: '2026-11-09T00:00:00.000Z' }) };
};
const editar = (it: PrescriptionItem, campo: string, valor: string): PrescriptionItem =>
  ({ ...it, [campo]: valor, posologia_registrada: registrarEdicaoPosologica(it.posologia_registrada, campo, (it as unknown as Record<string, unknown>)[campo], valor, '2026-11-09T01:00:00.000Z') });

function baseState(over: Partial<AppState> = {}): AppState {
  return {
    consultations: [], activeConsultation: null,
    settings: { medico: { nome: 'x', crm: 'x', especialidade: 'x' }, preferencia_laboratorio: 'sem_preferencia', tema: 'light', mostrar_evidencias_painel: true, alertas_interacao: true, idioma: 'pt-BR' },
    loading: false, error: null, currentUser: null, consultationDetailStatus: {}, consultationsPagination: INITIAL_PAGINATION, ...over,
  };
}
function novaConsulta(itens: PrescriptionItem[], id = 'local-1'): Consultation {
  return {
    id, status: 'concluida', paciente_nome: 'Paciente Teste', data: '2026-11-09T00:00:00.000Z',
    anamnese: { queixa_principal: 'x', hda: 'x', hpp: 'x', historia_familiar: '', habitos_vida: {}, exame_fisico: '', sinais_vitais: {}, laboratorio: {}, imagem: '', comorbidades: [], medicamentos_em_uso: [], alergias: [], gestante: false, lactante: false, funcao_renal: {}, funcao_hepatica: {} },
    prescricao: { tipo: 'simples', paciente: { nome: 'Paciente Teste' }, medico: { nome: 'M', crm: 'C' }, itens: itens.map(prepararItemParaStore) as PrescriptionItem[], data_emissao: '2026-11-09T00:00:00.000Z' },
  } as Consultation;
}

/** Servidor falso: modelo de idempotência por chave. Registra TODAS as chamadas (payload efetivo). */
function servidorFalso() {
  const porChave = new Map<string, { id: string; medicamentos: unknown }>();
  const chamadas: Array<{ idempotency_key: string; medicamentos: Array<Record<string, unknown>> }> = [];
  let perderResposta = 0; let falhaRede = 0; let n = 0;
  return {
    porChave, chamadas,
    perderRespostaNasProximas(k: number) { perderResposta = k; },
    falharRedeNasProximas(k: number) { falhaRede = k; },
    criarPrescricao: async (dados: { idempotency_key: string; medicamentos: Array<Record<string, unknown>> }) => {
      chamadas.push(JSON.parse(JSON.stringify(dados)));
      if (falhaRede > 0) { falhaRede--; throw new Error('Failed to fetch'); }
      let r = porChave.get(dados.idempotency_key);
      if (!r) { r = { id: `presc-${++n}`, medicamentos: dados.medicamentos }; porChave.set(dados.idempotency_key, r); }   // processa e persiste
      if (perderResposta > 0) { perderResposta--; throw new TimeoutError(15000); }                                       // a resposta não chega
      return { id: r.id };
    },
  };
}
function depsReais(state: { atual: AppState }, srv = servidorFalso(), over: Partial<SincronizarConsultaDeps> = {}) {
  const deps: SincronizarConsultaDeps = {
    criar: vi.fn().mockResolvedValue({ id: 'srv-1' }), criarDiagnostico: vi.fn().mockResolvedValue({ id: 'd' }), salvarRisco: vi.fn().mockResolvedValue({ id: 'r' }),
    criarPrescricao: srv.criarPrescricao as never,
    dispatch: (a: Action) => { state.atual = reducer(state.atual, a); }, sessaoValida: () => true, isAuthenticated: () => true, ...over,
  };
  return { deps, srv };
}
const consultaNoEstado = (s: AppState, id = 'local-1') => s.consultations.find(c => c.id === id)!;

/** Finaliza localmente (Panel) e roda a sincronização automática real → consulta sincronizada + prescrição bloqueada. */
async function finalizadaComBloqueio(extraItens: PrescriptionItem[] = []) {
  const bloqueado = editar(itemF2(), 'posologia', 'Amoxicilina 1 g 8/8h (editada)');
  const consulta = novaConsulta([bloqueado, ...extraItens]);
  const st = { atual: reducer(baseState(), { type: 'NEW_CONSULTATION', payload: consulta }) };
  const { deps, srv } = depsReais(st);
  const r = await executarSincronizacaoConsulta(consultaNoEstado(st.atual), deps);
  return { st, srv, deps, r };
}
const reload = (st: { atual: AppState }) => {            // fecha e reabre a aplicação: só o localStorage sobrevive
  persistirConsultasPendentes(st.atual.consultations);
  const novo = { atual: baseState() };
  novo.atual = reducer(novo.atual, { type: 'RESTORE_PENDING_CONSULTATIONS', payload: restaurarConsultasPendentes() });
  return novo;
};

beforeEach(() => { localStorage.clear(); limparTrilhaDaSessao(); });
afterEach(() => { vi.useRealTimers(); });

// ═══════════ A–F, I: continuidade do bloqueio ═══════════
describe('E2.4 — finalização local e continuidade do bloqueio após persistência', () => {
  it('A. finalização local com DTO divergente: consulta sincronizada, prescrição NÃO enviada, bloqueio por integridade (não falha de rede)', async () => {
    const { st, srv, r } = await finalizadaComBloqueio();
    expect(r.prescricao).toBe('dose_estruturada_bloqueada'); expect(srv.chamadas).toHaveLength(0);
    const c = consultaNoEstado(st.atual);
    expect(c.sync?.consulta?.status).toBe('synced'); expect(c.sync?.prescricao).toMatchObject({ status: 'failed', error_kind: 'integridade' });
    expect(c.prescricao!.itens[0]).toMatchObject({ bloqueio_dto: { estado: 'divergente' }, dose_estruturada: DTO });
    expect(classificarSincronizacaoPrescricao(c, { backendMode: true }).estado).toBe('bloqueada_por_integridade');
  });

  it('B/C. fechamento e reabertura: a consulta com prescrição bloqueada SOBREVIVE (antes se perdia por a consulta estar "synced") e o bloqueio persiste', async () => {
    const { st } = await finalizadaComBloqueio();
    expect(consultaTemPendenciaLocal(consultaNoEstado(st.atual))).toBe(true);
    const novo = reload(st);                                           // memória apagada: sem registro, sem trilha, sem Panel
    const c = consultaNoEstado(novo.atual);
    expect(c.prescricao!.itens[0].bloqueio_dto).toMatchObject({ estado: 'divergente' }); expect(c.prescricao!.itens[0].dose_estruturada).toEqual(DTO);
    expect(c.prescricao!.itens[0].posologia).toBe('Amoxicilina 1 g 8/8h (editada)');
    const raw = localStorage.getItem(KEY)!;
    expect(raw).not.toMatch(/posologia_registrada|dose_divergente|reconfirmacoes|trilha/);   // registro e trilha NÃO são persistidos
    expect(classificarSincronizacaoPrescricao(c, { backendMode: true }).estado).toBe('bloqueada_por_integridade');
  });

  it('D/E/I. recuperado SEM trilha e SEM posologia_registrada: continua bloqueado; tentativa de sincronização sem reutilização não envia nada', async () => {
    const { st } = await finalizadaComBloqueio(); const novo = reload(st);
    const c = consultaNoEstado(novo.atual); expect(c.prescricao!.itens[0]).not.toHaveProperty('posologia_registrada');
    expect(avaliarIntegridadeDto(c.prescricao!.itens[0])).toMatchObject({ estado: 'divergente', transmissivel: false });
    const { deps, srv } = depsReais(novo); const r = await executarSincronizacaoConsulta(c, deps);
    expect(r.prescricao).toBe('dose_estruturada_bloqueada'); expect(srv.chamadas).toHaveLength(0);
    expect(podeSincronizar(c, new Set())).toBe(true);                  // o reenvio é permitido, mas o gate o recusa — nunca liberado por perda de metadados
  });

  it.each([true, 'x', 1, {}, { estado: 'desconhecido' }, { estado: 'divergente', motivo: '' }, [1]])('F. marcador persistido de formato desconhecido (%j) continua bloqueando e não é apagado', async (marcador) => {
    const c = novaConsulta([item()]); c.prescricao!.itens[0] = { ...c.prescricao!.itens[0], bloqueio_dto: marcador as never };
    localStorage.setItem(KEY, JSON.stringify([{ ...c, sync: { consulta: { status: 'synced', attempts: 1, backend_id: 'srv-1' }, prescricao: { status: 'failed', attempts: 0 } } }]));
    const rest = restaurarConsultasPendentes()[0];
    expect(rest.prescricao!.itens[0].bloqueio_dto).toEqual(marcador);   // nenhum campo apagado
    expect(avaliarIntegridadeDto(rest.prescricao!.itens[0]).estado).toBe('divergente');
    const st = { atual: reducer(baseState(), { type: 'RESTORE_PENDING_CONSULTATIONS', payload: [rest] }) };
    const { deps, srv } = depsReais(st); const r = await executarSincronizacaoConsulta(rest, deps);
    expect(r.prescricao).toBe('dose_estruturada_bloqueada'); expect(srv.chamadas).toHaveLength(0);
    expect(prepararItemParaStore(rest.prescricao!.itens[0]).bloqueio_dto).toEqual(marcador);   // normalização não reescreve nem apaga
  });

  it('F. versão desconhecida/ilegível do registro: com bloqueio ⇒ continua bloqueado; sem bloqueio ⇒ NÃO verificável (≠ consistente)', () => {
    for (const raw of [{ versao_registro: 'posologia-99', avaliacao: { tipo: 'avaliada' } }, 'lixo', 7, []]) {
      expect(avaliarIntegridadeDto(item({ bloqueio_dto: { estado: 'divergente', motivo: 'x' }, posologia_registrada: raw as never }) as never).estado).toBe('divergente');
      const p = avaliarIntegridadeDto(item({ posologia_registrada: raw as never }) as never);
      expect(p.estado).toBe('nao_verificavel'); expect(p.estado).not.toBe('consistente_conforme_origem');
    }
  });
});

// ═══════════ G, H, Q: revisão (UI) ═══════════
function Harness({ srv, backendMode = true, inicial }: { srv: ReturnType<typeof servidorFalso>; backendMode?: boolean; inicial: AppState }) {
  const [state, dispatch] = React.useReducer(reducer, inicial);
  const ref = React.useRef(state);
  React.useEffect(() => { ref.current = state; });
  const retrySync = React.useCallback(async (id: string) => {
    const c = ref.current.consultations.find(x => x.id === id)!;
    if (!podeSincronizar(c, new Set())) return;
    const { deps } = depsReais({ atual: ref.current }, srv, { dispatch });
    await executarSincronizacaoConsulta(c, deps);
  }, [srv]);
  // E2.8: o componente exige usuário autenticado (consultas sem `proprietario_id` pertencem ao usuário atual).
  const valor = { state, dispatch, auth: { backendMode, demoMode: !backendMode, currentUser: { id: 'u-test', email: 'u@x.com', perfil: 'MEDICO' } }, retrySync };
  return React.createElement(AppCtx.Provider, { value: valor }, React.createElement(PrescricoesLocaisPendentes), React.createElement('output', { 'data-testid': 'estado-json' }, JSON.stringify(state.consultations)));
}
const estadoAtual = (): Consultation[] => JSON.parse(screen.getByTestId('estado-json').textContent ?? '[]');

async function montarRecuperado(extra: PrescriptionItem[] = []) {
  const { st } = await finalizadaComBloqueio(extra); const novo = reload(st);
  const srv = servidorFalso();
  cleanup(); render(React.createElement(Harness, { srv, inicial: novo.atual }));
  return { srv, user: userEvent.setup(), estadoInicial: JSON.stringify(novo.atual.consultations) };
}

describe('E2.4 — interface de recuperação (independe do Panel original)', () => {
  it('localiza a consulta, mostra o motivo (integridade ≠ rede) e NÃO oferece reenvio enquanto bloqueada', async () => {
    await montarRecuperado();
    const card = await screen.findByTestId('pendente-local-1');
    expect(within(card).getByTestId('rotulo-sync').textContent).toMatch(/Bloqueada por integridade — não enviada/);
    expect(within(card).getByTestId('detalhe-sync').textContent).toMatch(/Falha de rede não remove este bloqueio/);
    expect(within(card).queryByRole('button', { name: 'Reenviar ao servidor' })).toBeNull();
    expect(within(card).getByRole('button', { name: 'Revisar prescrição' })).toBeTruthy();
    expect(card.textContent).not.toMatch(/emitida|registrada|validada|segura|conferida/i);
  });

  it('G. revisão mostra texto atual e DTO preservado; reutilização explícita libera; envio é AÇÃO SEPARADA e usa o DTO original', async () => {
    const { srv, user } = await montarRecuperado();
    await user.click(await screen.findByRole('button', { name: 'Revisar prescrição' }));
    const rev = await screen.findByTestId('revisao-prescricao');
    expect((within(rev).getByLabelText('Texto atual da posologia') as HTMLTextAreaElement).value).toBe('Amoxicilina 1 g 8/8h (editada)');
    expect(within(rev).getByTestId('dto-preservado-0').textContent).toMatch(/500 mg · 3x\/dia · via VO/);
    expect(rev.textContent).toMatch(/não verificou/); expect(rev.textContent).toMatch(/não equivale a validar clinicamente/);
    expect(srv.chamadas).toHaveLength(0);                              // abrir a revisão nunca envia
    await user.click(within(rev).getByRole('button', { name: 'Reutilizar a dose estruturada anterior' }));
    await user.click(within(rev).getByRole('button', { name: 'Salvar revisão neste dispositivo' }));
    expect((await screen.findByTestId('revisao-salva')).textContent).toMatch(/ainda não foi enviada ao servidor/);
    expect(srv.chamadas).toHaveLength(0);                              // salvar também NÃO envia automaticamente
    const c = estadoAtual()[0]; expect(c.prescricao!.itens[0]).not.toHaveProperty('bloqueio_dto'); expect(c.prescricao!.itens[0]).not.toHaveProperty('posologia_registrada');
    expect(c.prescricao!.itens[0].posologia).toBe('Amoxicilina 1 g 8/8h (editada)');   // texto preservado
    expect(c.sync?.prescricao).toMatchObject({ status: 'local', attempts: 0 });        // bloqueio de sync anterior resolvido
    const card = screen.getByTestId('pendente-local-1');
    expect(within(card).getByTestId('rotulo-sync').textContent).toMatch(/Aguardando sincronização/);
    await user.click(within(card).getByRole('button', { name: 'Reenviar ao servidor' }));
    await waitFor(() => expect(srv.chamadas).toHaveLength(1));
    expect(srv.chamadas[0].medicamentos).toEqual([{ molecula: 'Amoxicilina', dose: DTO, duracao: '7 dias', observacoes: 'Tomar após refeição' }]);   // payload efetivo
    await waitFor(() => expect(screen.queryByTestId('pendente-local-1')).toBeNull());   // confirmada pelo servidor ⇒ some da lista de pendentes
    expect(JSON.stringify(estadoAtual()[0].sync!.prescricao)).toMatch(/"status":"synced"/);
  });

  it('H. nova edição depois da reutilização invalida a reutilização: o item volta a ser bloqueado ao salvar', async () => {
    const { srv, user } = await montarRecuperado();
    await user.click(await screen.findByRole('button', { name: 'Revisar prescrição' }));
    const rev = await screen.findByTestId('revisao-prescricao');
    await user.click(within(rev).getByRole('button', { name: 'Reutilizar a dose estruturada anterior' }));
    expect(within(rev).queryByRole('button', { name: 'Reutilizar a dose estruturada anterior' })).toBeNull();
    await user.type(within(rev).getByLabelText('Texto atual da posologia'), '!');           // nova alteração posológica
    expect(await within(rev).findByRole('button', { name: 'Reutilizar a dose estruturada anterior' })).toBeTruthy();   // reutilização invalidada
    await user.click(within(rev).getByRole('button', { name: 'Salvar revisão neste dispositivo' }));
    await waitFor(() => expect(estadoAtual()[0].prescricao!.itens[0].bloqueio_dto).toMatchObject({ estado: 'divergente' }));
    expect(estadoAtual()[0].prescricao!.itens[0].dose_estruturada).toEqual(DTO);             // DTO preservado, nunca alterado
    expect(srv.chamadas).toHaveLength(0);
    expect(within(screen.getByTestId('pendente-local-1')).queryByRole('button', { name: 'Reenviar ao servidor' })).toBeNull();
  });

  it('Q. cancelar a revisão NÃO perde nem altera nada (estado e localStorage idênticos)', async () => {
    const { user, estadoInicial } = await montarRecuperado();
    const antesLS = localStorage.getItem(KEY);
    await user.click(await screen.findByRole('button', { name: 'Revisar prescrição' }));
    const rev = await screen.findByTestId('revisao-prescricao');
    await user.type(within(rev).getByLabelText('Texto atual da posologia'), ' rascunho');
    await user.click(within(rev).getByRole('button', { name: 'Cancelar revisão' }));
    expect(screen.queryByTestId('revisao-prescricao')).toBeNull();
    expect(screen.getByTestId('estado-json').textContent).toBe(estadoInicial);
    expect(localStorage.getItem(KEY)).toBe(antesLS);
    expect(eventosDaSessao().map(e => e.tipo)).toEqual(['revisao_aberta', 'revisao_cancelada']);
  });

  it('P. vários itens com estados diferentes: item OK segue legível, bloqueado exige reutilização, item sem DTO impede o envio de toda a prescrição', async () => {
    const semDto = item({ id: 'i3', medicamento: 'Dipirona', posologia: 'Dipirona 1 g', dose_estruturada: undefined });
    const { st } = await finalizadaComBloqueio([item({ id: 'i2', medicamento: 'Paracetamol', posologia: 'Paracetamol 750 mg', dose_estruturada: DTO2 }), semDto]);
    const novo = reload(st); const srv = servidorFalso(); cleanup(); render(React.createElement(Harness, { srv, inicial: novo.atual }));
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Revisar prescrição' }));
    const rev = await screen.findByTestId('revisao-prescricao');
    expect(within(rev).getByTestId('item-revisao-0').textContent).toMatch(/Amoxicilina/);
    expect(within(rev).getByTestId('item-revisao-1').textContent).toMatch(/Sem bloqueio de integridade/);
    expect(within(rev).getByTestId('item-revisao-2').textContent).toMatch(/Não há dose estruturada preservada/);
    await user.click(within(within(rev).getByTestId('item-revisao-0')).getByRole('button', { name: 'Reutilizar a dose estruturada anterior' }));
    await user.click(within(rev).getByRole('button', { name: 'Salvar revisão neste dispositivo' }));
    await waitFor(() => expect(estadoAtual()[0].prescricao!.itens[0]).not.toHaveProperty('bloqueio_dto'));
    const itens = estadoAtual()[0].prescricao!.itens;
    expect(itens).toHaveLength(3);                                      // R: nenhuma duplicação nem perda de item
    expect(itens[1].dose_estruturada).toEqual(DTO2); expect(itens[2]).not.toHaveProperty('dose_estruturada');
    const r = await executarSincronizacaoConsulta(estadoAtual()[0], depsReais({ atual: baseState() }, srv).deps);
    expect(r.prescricao).toBe('sem_dose_estruturada'); expect(srv.chamadas).toHaveLength(0);   // bloqueio integral: nada parcial
  });

  it('sem backend (local/demonstração) só aparecem prescrições BLOQUEADAS; as demais não são listadas como pendências', async () => {
    const { st } = await finalizadaComBloqueio(); const novo = reload(st);
    const ok = novaConsulta([item()], 'local-ok'); ok.sync = { consulta: { status: 'local', attempts: 0 } };
    cleanup(); render(React.createElement(Harness, { srv: servidorFalso(), backendMode: false, inicial: reducer(novo.atual, { type: 'RESTORE_PENDING_CONSULTATIONS', payload: [ok] }) }));
    expect(await screen.findByTestId('pendente-local-1')).toBeTruthy(); expect(screen.queryByTestId('pendente-local-ok')).toBeNull();
  });
});

// ═══════════ J, K, L, M: sincronização e idempotência (cliente) ═══════════
describe('E2.4 — estados de sincronização e idempotência no cliente', () => {
  const liberada = () => novaConsulta([item()]);   // sem bloqueio

  it('J. falha de rede: não apaga bloqueio, é classificada como rede, e a nova tentativa reaproveita a MESMA chave', async () => {
    vi.useFakeTimers();
    const st = { atual: reducer(baseState(), { type: 'NEW_CONSULTATION', payload: liberada() }) };
    const srv = servidorFalso(); srv.falharRedeNasProximas(3);
    const { deps } = depsReais(st, srv);
    const p1 = executarSincronizacaoConsulta(consultaNoEstado(st.atual), deps); await vi.advanceTimersByTimeAsync(10_000); const r1 = await p1;
    expect(r1.prescricao).toBe('failed');
    let c = consultaNoEstado(st.atual); expect(c.sync!.prescricao).toMatchObject({ status: 'failed', error_kind: 'rede' });
    expect(classificarSincronizacaoPrescricao(c, { backendMode: true })).toMatchObject({ estado: 'falha_de_rede', somente_no_dispositivo: true, pode_reenviar: true });
    const chave = c.sync!.prescricao!.idempotency_key; expect(chave).toBeTruthy(); expect(new Set(srv.chamadas.map(x => x.idempotency_key))).toEqual(new Set([chave]));
    const r2 = await executarSincronizacaoConsulta(c, depsReais(st, srv).deps);
    expect(r2.prescricao).toBe('synced'); c = consultaNoEstado(st.atual);
    expect(srv.chamadas.at(-1)!.idempotency_key).toBe(chave); expect(srv.porChave.size).toBe(1);
    expect(classificarSincronizacaoPrescricao(c, { backendMode: true }).estado).toBe('sincronizada');
  });

  it('K. timeout APÓS o servidor processar: a tentativa seguinte (mesma chave) recebe o registro existente — 1 só prescrição; cliente só confirma com resposta real', async () => {
    vi.useFakeTimers();
    const st = { atual: reducer(baseState(), { type: 'NEW_CONSULTATION', payload: liberada() }) };
    const srv = servidorFalso(); srv.perderRespostaNasProximas(1);
    const p = executarSincronizacaoConsulta(consultaNoEstado(st.atual), depsReais(st, srv).deps); await vi.advanceTimersByTimeAsync(10_000); const r = await p;
    expect(r.prescricao).toBe('synced'); expect(srv.chamadas).toHaveLength(2); expect(srv.porChave.size).toBe(1);
    expect(new Set(srv.chamadas.map(x => x.idempotency_key)).size).toBe(1);
  });

  it('L. reenvio com a mesma chave após reload (estado de sync persistido): 1 só prescrição no servidor; sem confirmação não há "sincronizada"', async () => {
    vi.useFakeTimers();
    const st = { atual: reducer(baseState(), { type: 'NEW_CONSULTATION', payload: liberada() }) };
    const srv = servidorFalso(); srv.perderRespostaNasProximas(3);       // o servidor processa, mas nenhuma resposta chega
    const p = executarSincronizacaoConsulta(consultaNoEstado(st.atual), depsReais(st, srv).deps); await vi.advanceTimersByTimeAsync(10_000); await p;
    expect(consultaNoEstado(st.atual).sync!.prescricao!.status).toBe('failed'); expect(srv.porChave.size).toBe(1);   // processada no servidor, desconhecida no cliente
    const novo = reload(st); const c = consultaNoEstado(novo.atual);
    expect(c.sync!.prescricao!.idempotency_key).toBe(srv.chamadas[0].idempotency_key);       // a chave sobreviveu ao reload
    expect(classificarSincronizacaoPrescricao(c, { backendMode: true }).estado).toBe('falha_de_rede');   // NUNCA "sincronizada" sem confirmação
    const r = await executarSincronizacaoConsulta(c, depsReais(novo, srv).deps);
    expect(r.prescricao).toBe('synced'); expect(srv.porChave.size).toBe(1); expect(srv.chamadas.at(-1)!.idempotency_key).toBe(c.sync!.prescricao!.idempotency_key);
  });

  it('M. duas tentativas concorrentes: o guard de concorrência recusa a segunda; no servidor a mesma chave resolve ao mesmo registro', async () => {
    const c = liberada(); expect(podeSincronizar(c, new Set([c.id]))).toBe(false);
    const srv = servidorFalso(); const dados = { idempotency_key: 'K-1', medicamentos: [{ molecula: 'A' }] };
    const [a, b] = await Promise.all([srv.criarPrescricao(dados), srv.criarPrescricao(dados)]);
    expect(a.id).toBe(b.id); expect(srv.porChave.size).toBe(1);
  });

  it('retoma o envio da prescrição quando a consulta JÁ está sincronizada (antes: podeSincronizar recusava para sempre) e não recria a consulta', async () => {
    const c = liberada(); c.sync = { consulta: { status: 'synced', attempts: 1, backend_id: 'srv-1' }, prescricao: { status: 'failed', attempts: 3, error_kind: 'servidor', error: 'HTTP 503' } };
    expect(podeSincronizar(c, new Set())).toBe(true);
    for (const p of [{ status: 'synced', attempts: 1 }, { status: 'syncing', attempts: 1 }]) expect(podeSincronizar({ ...c, sync: { ...c.sync, prescricao: p } } as Consultation, new Set())).toBe(false);
    expect(podeSincronizar({ ...c, prescricao: undefined }, new Set())).toBe(false);
    expect(podeSincronizar({ ...c, sync: { consulta: c.sync!.consulta } }, new Set())).toBe(false);   // consulta synced sem prescrição pendente: nada a reenviar
    const st = { atual: reducer(baseState(), { type: 'NEW_CONSULTATION', payload: c }) }; const { deps, srv } = depsReais(st);
    const r = await executarSincronizacaoConsulta(c, deps);
    expect(r.prescricao).toBe('synced'); expect(deps.criar).not.toHaveBeenCalled(); expect(srv.chamadas).toHaveLength(1);
  });

  it('classificação de erros: rede, timeout, servidor (5xx), rejeitado (4xx); sem classificação ⇒ desconhecido, nunca sucesso', () => {
    expect(classificarErroDeSincronizacao(new Error('Failed to fetch'))).toBe('rede'); expect(classificarErroDeSincronizacao(new TimeoutError(1))).toBe('timeout');
    expect(classificarErroDeSincronizacao(Object.assign(new Error('x'), { status: 503 }))).toBe('servidor'); expect(classificarErroDeSincronizacao(Object.assign(new Error('x'), { status: 400 }))).toBe('rejeitado');
    const base = (p: unknown) => classificarSincronizacaoPrescricao({ prescricao: novaConsulta([item()]).prescricao, sync: { prescricao: p as never } }, { backendMode: true });
    expect(base({ status: 'failed', attempts: 1, error_kind: 'servidor' }).estado).toBe('falha_de_servidor');
    expect(base({ status: 'failed', attempts: 1, error_kind: 'rejeitado' })).toMatchObject({ estado: 'falha_de_servidor', pode_reenviar: false });
    expect(base({ status: 'failed', attempts: 1, error_kind: 'interrompida' }).estado).toBe('envio_interrompido');
    expect(base({ status: 'failed', attempts: 1 }).estado).toBe('desconhecido');                   // registro antigo sem classificação
    expect(base({ status: 'estranho', attempts: 1 }).estado).toBe('desconhecido');
    expect(base({ status: 'syncing', attempts: 1 }).estado).toBe('sincronizando'); expect(base(undefined).estado).toBe('aguardando_sincronizacao');
    expect(base({ status: 'synced', attempts: 1 }).estado).toBe('sincronizada');
    expect(classificarSincronizacaoPrescricao({ prescricao: novaConsulta([item()]).prescricao, sync: {} }, { backendMode: false }).estado).toBe('somente_no_dispositivo');
    for (const e of ['desconhecido', 'falha_de_rede', 'aguardando_sincronizacao', 'somente_no_dispositivo', 'envio_interrompido'] as const) {
      const p = base(e === 'desconhecido' ? { status: 'estranho', attempts: 1 } : e === 'falha_de_rede' ? { status: 'failed', attempts: 1, error_kind: 'rede' } : e === 'envio_interrompido' ? { status: 'failed', attempts: 1, error_kind: 'interrompida' } : undefined);
      expect(p.somente_no_dispositivo).toBe(true); expect(`${p.rotulo} ${p.detalhe}`).not.toMatch(/emitida|registrada no servidor|validada|segura|conferida/i);
    }
  });

  it('bloqueio de integridade tem prioridade sobre qualquer falha de rede/desconhecido; falha de rede posterior não o apaga', async () => {
    const { st } = await finalizadaComBloqueio(); const c = consultaNoEstado(st.atual);
    for (const p of [{ status: 'failed', attempts: 3, error_kind: 'rede' }, { status: 'failed', attempts: 1 }, { status: 'estranho', attempts: 1 }, undefined]) {
      expect(classificarSincronizacaoPrescricao({ ...c, sync: { ...c.sync, prescricao: p as never } }, { backendMode: true }).estado).toBe('bloqueada_por_integridade');
    }
    const novo = reducer(st.atual, { type: 'SET_SYNC_STATE', payload: { consultaId: 'local-1', resource: 'prescricao', state: { status: 'failed', attempts: 3, error_kind: 'rede' } } });
    expect(consultaNoEstado(novo).prescricao!.itens[0].bloqueio_dto).toBeTruthy();
  });
});

// ═══════════ N, O: legado e consultas pendentes antigas ═══════════
describe('E2.4 — legado, consultas antigas e estruturas parciais', () => {
  it('N/O. consulta pendente de formato ANTIGO (sem prescrição, syncing, campos desconhecidos) continua legível e normalizada; entradas ilegíveis não derrubam as demais', () => {
    const antiga = { id: 'old-1', status: 'concluida', paciente_nome: 'X', data: 'd', campo_do_futuro: { a: 1 }, sync: { consulta: { status: 'syncing', attempts: 1 } } };
    const comRx = { ...novaConsulta([item()], 'old-2'), sync: { consulta: { status: 'synced', attempts: 1, backend_id: 'b' }, prescricao: { status: 'syncing', attempts: 1 } } };
    localStorage.setItem(KEY, JSON.stringify([null, 5, 'lixo', { semId: true }, antiga, comRx]));
    const r = restaurarConsultasPendentes();
    expect(r.map(c => c.id)).toEqual(['old-1', 'old-2']);
    expect(r[0].sync!.consulta).toMatchObject({ status: 'failed' }); expect((r[0] as unknown as { campo_do_futuro: unknown }).campo_do_futuro).toEqual({ a: 1 });   // nada descartado
    expect(r[1].sync!.prescricao).toMatchObject({ status: 'failed', error_kind: 'interrompida' });   // "sincronizando" após reload seria mentira
    expect(classificarSincronizacaoPrescricao(r[1], { backendMode: true }).estado).toBe('envio_interrompido');
    localStorage.setItem(KEY, '{não é json'); expect(restaurarConsultasPendentes()).toEqual([]);
    localStorage.setItem(KEY, JSON.stringify({ nao: 'array' })); expect(restaurarConsultasPendentes()).toEqual([]);
  });

  it('legado sem metadata: item sem registro nem bloqueio com DTO ⇒ nao_verificavel e transmissível como antes (≠ consistente); sem DTO ⇒ gate existente', async () => {
    const legado = item(); expect(avaliarIntegridadeDto(legado)).toMatchObject({ estado: 'nao_verificavel', transmissivel: true });
    const st = { atual: reducer(baseState(), { type: 'NEW_CONSULTATION', payload: novaConsulta([legado]) }) }; const { deps, srv } = depsReais(st);
    expect((await executarSincronizacaoConsulta(consultaNoEstado(st.atual), deps)).prescricao).toBe('synced'); expect(srv.chamadas[0].medicamentos[0].dose).toEqual(DTO);
    expect(avaliarIntegridadeDto(item({ dose_estruturada: undefined }))).toMatchObject({ estado: 'estrutura_indisponivel', transmissivel: false });
  });

  it('consulta parcialmente recuperada (prescrição sem itens/sem sync) não quebra a aplicação nem é listada como pendente sem prescrição', () => {
    for (const c of [{ id: 'p1' }, { id: 'p2', prescricao: { itens: [] } }, { id: 'p3', prescricao: {}, sync: { prescricao: { status: 'failed', attempts: 1 } } }, { id: 'p4', sync: {} }]) {
      expect(() => classificarSincronizacaoPrescricao(c as never, { backendMode: true })).not.toThrow();
      expect(classificarSincronizacaoPrescricao(c as never, { backendMode: true }).estado).toBe('sem_prescricao_local');
      expect(consultaTemPendenciaLocal(c as never)).toBe(false);
    }
  });

  it('R. restaurar duas vezes e revisar não duplica consultas nem itens', async () => {
    const { st } = await finalizadaComBloqueio(); persistirConsultasPendentes(st.atual.consultations);
    let s = baseState(); for (let i = 0; i < 3; i++) s = reducer(s, { type: 'RESTORE_PENDING_CONSULTATIONS', payload: restaurarConsultasPendentes() });
    expect(s.consultations).toHaveLength(1); expect(s.consultations[0].prescricao!.itens).toHaveLength(1);
    const revisado = reducer(s, { type: 'REVIEW_PRESCRIPTION', payload: { consultaId: 'local-1', prescricao: s.consultations[0].prescricao! } });
    expect(revisado.consultations).toHaveLength(1); expect(revisado.consultations[0].prescricao!.itens).toHaveLength(1);
  });

  it('consulta hidratada do backend (sem prescrição local) continua NÃO persistida; consulta com prescrição confirmada também', () => {
    expect(consultaTemPendenciaLocal({ id: 'h', sync: { consulta: { status: 'synced', attempts: 0, backend_id: 'h' } }, temPrescricaoNoBackend: true } as never)).toBe(false);
    const c = novaConsulta([item()]); c.sync = { consulta: { status: 'synced', attempts: 1, backend_id: 'b' }, prescricao: { status: 'synced', attempts: 1, backend_id: 'p' } };
    expect(consultaTemPendenciaLocal(c)).toBe(false);
  });
});

// ═══════════ S, T ═══════════
describe('E2.4 — nenhum valor reconstruído e nenhuma promoção clínica', () => {
  it('S. DTO numérico idêntico em todo o ciclo (finalização → reload → revisão → reutilização → envio)', async () => {
    const { st } = await finalizadaComBloqueio(); const novo = reload(st);
    const original = JSON.stringify(DTO);
    expect(JSON.stringify(consultaNoEstado(novo.atual).prescricao!.itens[0].dose_estruturada)).toBe(original);
    const rev = itemParaRevisao(consultaNoEstado(novo.atual).prescricao!.itens[0], '2026-11-09T02:00:00.000Z');
    expect(rev.dose_estruturada).toEqual(DTO); expect(rev.posologia_registrada.dose).toBeNull(); expect(rev.posologia_registrada.dose_divergente!.dose_anterior).toEqual(DTO);
    const reutilizado = reconfirmarDoseEstruturada(rev.posologia_registrada, '2026-11-09T03:00:00.000Z')!;
    expect(JSON.stringify(reutilizado.dose)).toBe(original);
    const pronto = prepararItemParaStore({ ...rev, posologia_registrada: reutilizado }); expect(JSON.stringify(pronto.dose_estruturada)).toBe(original);
    const st2 = { atual: novo.atual }; const srv = servidorFalso();
    const c = { ...consultaNoEstado(novo.atual), prescricao: { ...consultaNoEstado(novo.atual).prescricao!, itens: [pronto as PrescriptionItem] }, sync: { consulta: consultaNoEstado(novo.atual).sync!.consulta } };
    await executarSincronizacaoConsulta(c, depsReais(st2, srv).deps);
    expect(JSON.stringify(srv.chamadas[0].medicamentos[0].dose)).toBe(original);
  });

  it('S. nenhuma dose é derivada do texto: item de revisão sem DTO preservado continua sem DTO, mesmo com texto "numérico"', () => {
    const rev = itemParaRevisao(item({ posologia: 'Dipirona 1 g 6/6h', dose_estruturada: undefined, bloqueio_dto: { estado: 'divergente', motivo: 'x' } }));
    expect(rev.dose_estruturada).toBeUndefined(); expect(rev.posologia_registrada.dose).toBeNull(); expect(rev.bloqueio_dto).toBeTruthy();
    expect(reconfirmarDoseEstruturada(rev.posologia_registrada)).toBe(rev.posologia_registrada);   // nada a reutilizar
    expect(avaliarIntegridadeDto(rev).estado).toBe('divergente');
  });

  it('T. nenhum registro de revisão/recuperação é promovido: sempre nao_avaliada, sem fonte/aprovação/validação; trilha sem dados pessoais', () => {
    for (const it of [item({ bloqueio_dto: { estado: 'divergente', motivo: 'x' } }), item(), item({ dose_estruturada: undefined })]) {
      const rev = itemParaRevisao(it); const reg = reconfirmarDoseEstruturada(rev.posologia_registrada) ?? rev.posologia_registrada;
      expect(reg.avaliacao.tipo).toBe('nao_avaliada'); expect(reg.homologacao_clinica).toBe(false); expect(estadosDoRegistro(reg).estado_regra).toBe('desconhecido');
      expect(JSON.stringify(reg)).not.toMatch(/regra_clinicamente_validada|aprovacao_formal|fonte_utilizada/); expect(JSON.stringify(reg.trilha)).not.toMatch(/Amoxicilina|Paciente|CRM/);
    }
  });

  it('o status final da consulta diferencia bloqueio por integridade, rede, interrompido e desconhecido (nunca sucesso)', async () => {
    const { st } = await finalizadaComBloqueio(); const c = consultaNoEstado(st.atual);
    const texto = (consulta: unknown, backendMode = true) => { h.app = { state: { activeConsultation: consulta }, auth: { backendMode, demoMode: !backendMode } }; cleanup(); render(React.createElement(StatusRegistroPrescricao)); return screen.getByTestId('status-registro-prescricao').textContent ?? ''; };
    expect(texto(c)).toMatch(/BLOQUEADA por integridade[\s\S]*NADA foi enviado ao servidor/);
    const liberada = { ...novaConsulta([item()]), sync: { prescricao: { status: 'failed', attempts: 3, error_kind: 'rede', error: 'Failed to fetch' } } };
    expect(texto(liberada)).toMatch(/NÃO foi confirmada pelo servidor \(falha de rede ou tempo esgotado: não se sabe se o servidor recebeu\)/);
    expect(texto({ ...liberada, sync: { prescricao: { status: 'failed', attempts: 1, error_kind: 'interrompida' } } })).toMatch(/envio interrompido: resultado desconhecido/);
    expect(texto({ ...liberada, sync: { prescricao: { status: 'estranho', attempts: 1 } } })).toMatch(/ainda não foi confirmada pelo servidor/);
    expect(texto({ ...liberada, sync: { prescricao: { status: 'synced', attempts: 1 } } })).toMatch(/confirmada pelo servidor/);
  });
});
