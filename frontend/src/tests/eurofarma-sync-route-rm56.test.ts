import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/sync/eurofarma/route';

// RM-56-02: a checagem anterior só verificava presença do header
// Authorization (qualquer valor não-vazio passava) e só em produção.
// Estes testes travam o comportamento real: comparação em tempo
// constante contra EUROFARMA_SYNC_TOKEN, fail-safe (bloqueado) em
// produção quando o segredo não está configurado.
//
// RM-57: `process.env.NODE_ENV = ...` direto quebrava `tsc --noEmit`
// (NODE_ENV é readonly em @types/node) — o vitest não acusava porque
// transforma com esbuild, sem checagem de tipos. `vi.stubEnv` é o jeito
// correto de mockar env vars no vitest (funciona com NODE_ENV e
// restaura sozinho via unstubAllEnvs).

function mkRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader !== undefined) headers.set('authorization', authHeader);
  return new NextRequest('http://localhost/api/sync/eurofarma', {
    method: 'POST',
    headers,
  });
}

describe('POST /api/sync/eurofarma — autorização real (RM-56-02)', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('produção + token configurado + header ausente: 401 (nunca "aberto por omissão")', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('EUROFARMA_SYNC_TOKEN', 'segredo-real-de-teste');
    const res = await POST(mkRequest());
    expect(res.status).toBe(401);
  });

  it('produção + token configurado + valor incorreto: 401 (não basta ter QUALQUER valor não-vazio — regressão do bug original)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('EUROFARMA_SYNC_TOKEN', 'segredo-real-de-teste');
    const res = await POST(mkRequest('Bearer valor-qualquer-chutado'));
    expect(res.status).toBe(401);
  });

  it('produção + token configurado + valor correto: 200', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('EUROFARMA_SYNC_TOKEN', 'segredo-real-de-teste');
    const res = await POST(mkRequest('Bearer segredo-real-de-teste'));
    expect(res.status).toBe(200);
  });

  it('produção + token NUNCA configurado: sempre 401, mesmo sem tentar autenticar (fail-safe)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('EUROFARMA_SYNC_TOKEN', undefined);
    const res = await POST(mkRequest());
    expect(res.status).toBe(401);
  });

  it('fora de produção + token não configurado: permanece aberto (uso local sem configuração)', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('EUROFARMA_SYNC_TOKEN', undefined);
    const res = await POST(mkRequest());
    expect(res.status).toBe(200);
  });

  it('fora de produção + token configurado + valor incorreto: 401 (a checagem se aplica sempre que o segredo existe, não só em produção)', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('EUROFARMA_SYNC_TOKEN', 'segredo-real-de-teste');
    const res = await POST(mkRequest('Bearer errado'));
    expect(res.status).toBe(401);
  });
});
