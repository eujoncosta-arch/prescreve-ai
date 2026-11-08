// RM-107.1.1-E2.8.1 — Modo demo (R4): dado real nunca é restaurado, dado demo nunca é persistido, e o armazenamento real não é tocado.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { render, waitFor, act, cleanup } from '@testing-library/react';

const h = vi.hoisted(() => ({ verificar: vi.fn() }));
vi.mock('@/lib/app-mode', () => ({ APP_MODE: 'demo', IS_DEMO_MODE: true, IS_PRODUCTION_MODE: false }));
vi.mock('@/lib/api-client', () => ({
  useRealBackend: false,
  getCurrentUser: () => ({ id: 'demo-user', email: 'demo@prescreve-ai.local', perfil: 'MEDICO', demo: true }),
  authApi: { isAuthenticated: () => true, login: vi.fn(), register: vi.fn(), logout: vi.fn().mockResolvedValue(undefined), verificarSessao: (...a: unknown[]) => h.verificar(...a), currentUser: () => null, getToken: () => 'demo-x' },
  consultaApi: { listar: vi.fn(), criar: vi.fn(), criarDiagnostico: vi.fn(), salvarRisco: vi.fn(), criarPrescricao: vi.fn(), buscar: vi.fn(), buscarDetalhe: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { AppProvider, useApp } from '@/lib/store';
import { KEY_PENDENTES_V2, salvarPendencias, __resetarVistosParaTeste } from '@/lib/pendencias-locais';
import type { Consultation } from '@/lib/types';

let ctx: ReturnType<typeof useApp>;
function Probe() { const a = useApp(); React.useEffect(() => { ctx = a; }); return null; }
const real = (id: string): Consultation => ({
  id, status: 'concluida', paciente_nome: 'PACIENTE-REAL', data: '2026-11-10T00:00:00.000Z',
  prescricao: { tipo: 'simples', paciente: { nome: 'PACIENTE-REAL' }, medico: { nome: 'M', crm: 'C' }, itens: [{ id: 'i' }], data_emissao: 'x' },
  sync: { consulta: { status: 'synced', attempts: 1, backend_id: `srv-${id}` }, prescricao: { status: 'failed', attempts: 1, error_kind: 'rede' } },
} as unknown as Consultation);

beforeEach(() => { __resetarVistosParaTeste(); localStorage.clear(); h.verificar.mockReset(); });
afterEach(() => cleanup());

describe('E2.8.1 — modo demo segregado', () => {
  it('pendências REAIS no navegador NÃO são restauradas na sessão demo, a identidade não é consultada ao servidor e o armazenamento real fica byte a byte intacto', async () => {
    salvarPendencias('usuario-real', [real('cR')]); const antes = localStorage.getItem(KEY_PENDENTES_V2);
    render(<AppProvider><Probe /></AppProvider>);
    await waitFor(() => expect(ctx).toBeTruthy());
    await act(async () => { ctx.dispatch({ type: 'NEW_CONSULTATION', payload: { ...real('demo-1'), paciente_nome: 'PACIENTE-DEMO', sync: { consulta: { status: 'local', attempts: 0 } } } as never }); });
    expect(ctx.state.consultations.map((c) => c.id)).not.toContain('cR');
    expect(ctx.state.consultations.some((c) => c.id === 'cR' || c.paciente_nome === 'PACIENTE-REAL')).toBe(false);
    expect(h.verificar).not.toHaveBeenCalled();
    expect(ctx.auth.identidadeVerificada).toBe(false);
    expect(localStorage.getItem(KEY_PENDENTES_V2)).toBe(antes);          // nada gravado/apagado/alterado pela sessão demo
  });
  it('dado criado em modo demo nunca é persistido (nenhuma chave de pendências é criada)', async () => {
    render(<AppProvider><Probe /></AppProvider>);
    await waitFor(() => expect(ctx).toBeTruthy());
    await act(async () => { ctx.dispatch({ type: 'NEW_CONSULTATION', payload: { ...real('demo-2'), sync: { consulta: { status: 'local', attempts: 0 } } } as never }); });
    expect(localStorage.getItem(KEY_PENDENTES_V2)).toBeNull();
  });
});
