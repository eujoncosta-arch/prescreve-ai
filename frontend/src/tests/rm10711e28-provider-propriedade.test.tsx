// ============================================================
// RM-107.1.1-E2.8 — Integração com o AppProvider REAL (api-client mockado): restauração/persistência só para o proprietário com sessão
// VERIFICADA PELO SERVIDOR; isolamento entre usuários; logout sem apagar pendências; recusa de envio de consulta alheia; UI de quarentena/descarte.
// Prova isolamento PELA APLICAÇÃO (não há criptografia; o localStorage continua legível por quem tem acesso ao navegador).
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { render, screen, waitFor, act, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const h = vi.hoisted(() => ({
  user: null as null | { id: string; email: string; perfil: string },
  verificar: vi.fn(),
  criar: vi.fn(),
  buscar: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  useRealBackend: true,
  getCurrentUser: () => h.user,
  authApi: {
    isAuthenticated: () => !!h.user, login: vi.fn(), register: vi.fn(), logout: vi.fn().mockResolvedValue(undefined),
    verificarSessao: (...a: unknown[]) => h.verificar(...a), currentUser: () => h.user, getToken: () => 'tok',
  },
  consultaApi: {
    listar: vi.fn().mockResolvedValue({ total: 0, consultas: [], pagina: 1, limite: 20 }),
    criar: (...a: unknown[]) => h.criar(...a), criarDiagnostico: vi.fn(), salvarRisco: vi.fn(), criarPrescricao: vi.fn(),
    buscar: (...a: unknown[]) => h.buscar(...a), buscarDetalhe: vi.fn(),
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { toast } from 'sonner';
import { AppProvider, useApp } from '@/lib/store';
import { PrescricoesLocaisPendentes } from '@/components/modules/PrescricoesLocaisPendentes';
import { KEY_PENDENTES_V2, KEY_PENDENTES_LEGADO, salvarPendencias, carregarPendencias, contarPendenciasDoProprietario , __resetarVistosParaTeste } from '@/lib/pendencias-locais';
import type { Consultation, PrescriptionItem } from '@/lib/types';

const A = { id: 'usuario-A', email: 'a@x.com', perfil: 'MEDICO' };
const B = { id: 'usuario-B', email: 'b@x.com', perfil: 'MEDICO' };
const ITEM: PrescriptionItem = { id: 'i1', medicamento: 'Amoxicilina', concentracao: '500 mg', forma_farmaceutica: 'Comprimido', quantidade: '21', posologia: 'Amoxicilina 500 mg 8/8h', via: 'VO', duracao: '7 dias', uso_continuo: false, dose_estruturada: { valor: 500, unidade: 'mg', frequencia: '3x/dia', via: 'VO' } };
const consulta = (id: string, over: Partial<Consultation> = {}): Consultation => ({
  id, status: 'concluida', paciente_nome: `Paciente ${id}`, data: '2026-11-10T00:00:00.000Z',
  prescricao: { tipo: 'simples', paciente: { nome: `Paciente ${id}` }, medico: { nome: 'M', crm: 'C' }, itens: [ITEM], data_emissao: '2026-11-10T00:00:00.000Z' },
  sync: { consulta: { status: 'synced', attempts: 1, backend_id: `srv-${id}` }, prescricao: { status: 'failed', attempts: 1, error_kind: 'rede' } }, ...over,
} as Consultation);

let ctx: ReturnType<typeof useApp>;
function Probe() { const atual = useApp(); React.useEffect(() => { ctx = atual; }); return null; }   // atribuição em efeito (regra react-hooks/globals)
const montar = (filhos: React.ReactNode = null) => render(<AppProvider><Probe />{filhos}</AppProvider>);
const ids = () => ctx.state.consultations.map((c) => c.id).sort();

beforeEach(() => {
  __resetarVistosParaTeste(); localStorage.clear(); h.user = null; h.verificar.mockReset(); h.criar.mockReset(); h.buscar.mockReset();
  vi.mocked(toast.error).mockClear();
});
afterEach(() => cleanup());

describe('E2.8 — AppProvider: restauração só para o proprietário com sessão verificada pelo servidor', () => {
  it('antes da verificação NADA é restaurado; após ok ⇒ restaura as pendências do PRÓPRIO usuário (com proprietario_id) e a proveniência', async () => {
    salvarPendencias(A.id, [consulta('cA', { prescricao: { tipo: 'simples', paciente: { nome: 'x' }, medico: { nome: 'M', crm: 'C' }, itens: [{ ...ITEM, proveniencia: { v: 'prov-1', original: { conhecida: true, origem: 'digitada_pelo_prescritor', versao_registro: 'posologia-1', criado_em: '2026-11-10T00:00:00.000Z' }, recuperacao: [], alteracoes: { total: 0, campos: [] }, estrutura_dose: 'consistente_conforme_origem' } }], data_emissao: 'x' } as never })]);
    h.user = A; let liberar!: (v: { ok: boolean; id?: string }) => void;
    h.verificar.mockReturnValue(new Promise((r) => { liberar = r; }));
    montar();
    await waitFor(() => expect(ctx.state.currentUser?.id).toBe(A.id));
    expect(ids()).toEqual([]);                                           // token "presente" NÃO comprova identidade
    expect(ctx.auth.identidadeVerificada).toBe(false);
    await act(async () => { liberar({ ok: true, id: A.id }); });
    await waitFor(() => expect(ids()).toEqual(['cA']));
    expect(ctx.state.consultations[0].proprietario_id).toBe(A.id);
    expect(ctx.state.consultations[0].prescricao!.itens[0].proveniencia!.original).toMatchObject({ origem: 'digitada_pelo_prescritor' });   // proveniência original preservada
    expect(ctx.auth.identidadeVerificada).toBe(true);
  });

  it('sessão NÃO verificada (401 / rede / indisponível) ⇒ nunca restaura nem persiste', async () => {
    salvarPendencias(A.id, [consulta('cA')]); const antes = localStorage.getItem(KEY_PENDENTES_V2);
    h.user = A;
    for (const motivo of ['sessao_invalida', 'rede', 'indisponivel']) {
      cleanup(); h.verificar.mockResolvedValue({ ok: false, motivo }); montar();
      await waitFor(() => expect(h.verificar).toHaveBeenCalled());
      await act(async () => { ctx.dispatch({ type: 'NEW_CONSULTATION', payload: consulta('nova', { sync: { consulta: { status: 'local', attempts: 0 } } } as never) }); });
      expect(ids()).toEqual(['nova']);                                   // só a criada nesta sessão; nada de A
      expect(localStorage.getItem(KEY_PENDENTES_V2)).toBe(antes);        // e nada foi gravado sem identidade verificada
    }
  });

  it('2/3. usuário B (sessão verificada) NÃO vê, não restaura e não altera as pendências de A; A continua recuperável depois', async () => {
    salvarPendencias(A.id, [consulta('cA')]); const raw = localStorage.getItem(KEY_PENDENTES_V2);
    h.user = B; h.verificar.mockResolvedValue({ ok: true, id: B.id }); montar();
    await waitFor(() => expect(ctx.auth.identidadeVerificada).toBe(true));
    expect(ids()).toEqual([]);
    expect(localStorage.getItem(KEY_PENDENTES_V2)).toBe(raw);            // registros de A byte a byte intactos
    expect(contarPendenciasDoProprietario(B.id)).toBe(0); expect(carregarPendencias(A.id).map((c) => c.id)).toEqual(['cA']);
    // B cria uma pendência: é gravada sob B, sem tocar A
    await act(async () => { ctx.dispatch({ type: 'NEW_CONSULTATION', payload: consulta('cB') }); });
    await waitFor(() => expect(contarPendenciasDoProprietario(B.id)).toBe(1));
    expect(carregarPendencias(A.id).map((c) => c.id)).toEqual(['cA']); expect(carregarPendencias(B.id).map((c) => c.id)).toEqual(['cB']);
  });

  it('6. reautenticação do mesmo usuário recupera as pendências (a persistência anterior sobreviveu ao ciclo logout/expiração)', async () => {
    salvarPendencias(A.id, [consulta('cA')]);
    h.user = A; h.verificar.mockResolvedValue({ ok: true, id: A.id });
    const r1 = montar(); await waitFor(() => expect(ids()).toEqual(['cA']));
    r1.unmount(); h.user = null; cleanup();                              // "sessão expirou": nada mais em memória, credenciais fora
    expect(contarPendenciasDoProprietario(A.id)).toBe(1);
    h.user = A; montar(); await waitFor(() => expect(ids()).toEqual(['cA']));   // login de novo
  });

  it('8. logout pelo provider NÃO apaga as pendências (RESET_SESSION_DATA esvazia só a memória; a persistência não roda sem identidade)', async () => {
    salvarPendencias(A.id, [consulta('cA')]);
    h.user = A; h.verificar.mockResolvedValue({ ok: true, id: A.id }); montar();
    await waitFor(() => expect(ids()).toEqual(['cA']));
    await act(async () => { await ctx.auth.logout(); });
    expect(ids()).toEqual([]); expect(ctx.auth.identidadeVerificada).toBe(false);
    expect(carregarPendencias(A.id).map((c) => c.id)).toEqual(['cA']);   // retida
  });

  it('11. sincronizarConsulta RECUSA consulta de outro proprietário (nenhuma chamada de rede) e informa o motivo', async () => {
    h.user = B; h.verificar.mockResolvedValue({ ok: true, id: B.id }); montar();
    await waitFor(() => expect(ctx.auth.identidadeVerificada).toBe(true));
    const alheia = consulta('cA', { proprietario_id: A.id, sync: { consulta: { status: 'failed', attempts: 1 } } } as never);
    await act(async () => { await ctx.sincronizarConsulta(alheia); });
    expect(h.criar).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/outra conta/), expect.anything());
    await act(async () => { ctx.dispatch({ type: 'RESTORE_PENDING_CONSULTATIONS', payload: [alheia] }); });
    await act(async () => { await ctx.retrySync('cA'); });             // reenvio manual/online passa pelo mesmo guard
    expect(h.criar).not.toHaveBeenCalled();
  });
});

describe('E2.8 — interface: propriedade, quarentena do legado e descarte explícito', () => {
  it('B não vê a seção/cartões de A; A vê os seus; legado aparece só como CONTAGEM (sem PHI) e nunca é atribuído', async () => {
    salvarPendencias(A.id, [consulta('cA')]);
    localStorage.setItem(KEY_PENDENTES_LEGADO, JSON.stringify([consulta('L1', { paciente_nome: 'Nome Legado Secreto' })]));
    h.user = B; h.verificar.mockResolvedValue({ ok: true, id: B.id });
    montar(<PrescricoesLocaisPendentes />);
    await waitFor(() => expect(ctx.auth.identidadeVerificada).toBe(true));
    expect(screen.queryByTestId('prescricoes-locais-pendentes')).toBeNull(); expect(screen.queryByTestId('pendente-cA')).toBeNull();
    const q = await screen.findByTestId('registros-legados');
    expect(q.textContent).toMatch(/1 registro\(s\) local\(is\) de origem não identificada/); expect(document.body.textContent).not.toContain('Nome Legado Secreto');
    expect(carregarPendencias(B.id)).toEqual([]);                        // não atribuído
    cleanup(); h.user = A; h.verificar.mockResolvedValue({ ok: true, id: A.id }); montar(<PrescricoesLocaisPendentes />);
    expect(await screen.findByTestId('pendente-cA')).toBeTruthy();
  });

  it('5b. "Verificar propriedade no servidor": só o confirmado passa a ser do usuário e volta ao estado; o negado fica em quarentena', async () => {
    localStorage.setItem(KEY_PENDENTES_LEGADO, JSON.stringify([consulta('L1'), consulta('L2')]));
    h.buscar.mockImplementation(async (id: string) => { if (id === 'srv-L1') return { id }; throw new Error('404'); });
    h.user = A; h.verificar.mockResolvedValue({ ok: true, id: A.id });
    montar(<PrescricoesLocaisPendentes />); const u = userEvent.setup();
    await u.click(await screen.findByRole('button', { name: 'Verificar propriedade no servidor' }));
    await waitFor(() => expect(screen.getByTestId('legado-msg').textContent).toMatch(/1 registro\(s\) confirmado\(s\).*1 permanecem isolados/));
    await waitFor(() => expect(ids()).toEqual(['L1'])); expect(carregarPendencias(B.id)).toEqual([]);
  });

  it('descartes são EXPLÍCITOS (confirm): cancelar não apaga; confirmar apaga só o próprio proprietário e só o legado quando escolhido', async () => {
    salvarPendencias(A.id, [consulta('cA')]); salvarPendencias(B.id, [consulta('cB')]);
    localStorage.setItem(KEY_PENDENTES_LEGADO, JSON.stringify([consulta('L1')]));
    h.user = A; h.verificar.mockResolvedValue({ ok: true, id: A.id });
    montar(<PrescricoesLocaisPendentes />); const u = userEvent.setup();
    await screen.findByTestId('pendente-cA');
    const conf = vi.spyOn(window, 'confirm');
    conf.mockReturnValueOnce(false); await u.click(screen.getByTestId('descartar-minhas'));
    expect(ids()).toEqual(['cA']); expect(contarPendenciasDoProprietario(A.id)).toBe(1);                  // cancelado: nada some
    conf.mockReturnValueOnce(false); await u.click(screen.getByRole('button', { name: 'Descartar registros sem proprietário' }));
    expect(localStorage.getItem(KEY_PENDENTES_LEGADO)).not.toBeNull();
    conf.mockReturnValue(true); await u.click(screen.getByTestId('descartar-minhas'));
    await waitFor(() => expect(ids()).toEqual([])); expect(contarPendenciasDoProprietario(A.id)).toBe(0); expect(contarPendenciasDoProprietario(B.id)).toBe(1);   // B intacto
    expect(localStorage.getItem(KEY_PENDENTES_LEGADO)).not.toBeNull();                                     // legado só some se escolhido
    await u.click(await screen.findByRole('button', { name: 'Descartar registros sem proprietário' }));
    expect(localStorage.getItem(KEY_PENDENTES_LEGADO)).toBeNull();
    conf.mockRestore();
  });

  it('12. a revisão pela interface não altera o proprietário e é gravada sob o MESMO proprietário', async () => {
    const bloqueada = consulta('cA', { prescricao: { tipo: 'simples', paciente: { nome: 'x' }, medico: { nome: 'M', crm: 'C' }, itens: [{ ...ITEM, bloqueio_dto: { estado: 'divergente', motivo: 'x' } }], data_emissao: 'x' } as never, sync: { consulta: { status: 'synced', attempts: 1, backend_id: 'srv-cA' }, prescricao: { status: 'failed', attempts: 0, error_kind: 'integridade' } } as never });
    salvarPendencias(A.id, [bloqueada]);
    h.user = A; h.verificar.mockResolvedValue({ ok: true, id: A.id });
    montar(<PrescricoesLocaisPendentes />); const u = userEvent.setup();
    await u.click(await screen.findByRole('button', { name: 'Revisar prescrição' }));
    const rev = await screen.findByTestId('revisao-prescricao');
    await u.click(within(rev).getByRole('button', { name: 'Reutilizar a dose estruturada anterior' }));
    await u.click(within(rev).getByRole('button', { name: 'Salvar revisão neste dispositivo' }));
    await waitFor(() => expect(ctx.state.consultations[0].prescricao!.itens[0]).not.toHaveProperty('bloqueio_dto'));
    expect(ctx.state.consultations[0].proprietario_id).toBe(A.id);
    await waitFor(() => expect(carregarPendencias(A.id)[0].prescricao!.itens[0]).not.toHaveProperty('bloqueio_dto'));   // persistido sob A
    expect(carregarPendencias(B.id)).toEqual([]);
  });
});

describe('E2.8.1 — identidade devolvida pelo SERVIDOR deve coincidir com o proprietário (token adulterado / outro usuário)', () => {
  it('token cujo sub diz A mas o servidor responde B (ou id vazio) ⇒ nada restaurado, nada persistido, identidadeVerificada=false', async () => {
    salvarPendencias(A.id, [consulta('cA')]); const antes = localStorage.getItem(KEY_PENDENTES_V2);
    h.user = A;
    for (const resp of [{ ok: true, id: B.id }, { ok: true, id: '' }]) {
      cleanup(); h.verificar.mockResolvedValue(resp); montar();
      await waitFor(() => expect(h.verificar).toHaveBeenCalled());
      await act(async () => { ctx.dispatch({ type: 'NEW_CONSULTATION', payload: consulta('nova', { sync: { consulta: { status: 'local', attempts: 0 } } } as never) }); });
      expect(ctx.auth.identidadeVerificada).toBe(false); expect(ids()).toEqual(['nova']);
      expect(localStorage.getItem(KEY_PENDENTES_V2)).toBe(antes);
    }
  });
});
