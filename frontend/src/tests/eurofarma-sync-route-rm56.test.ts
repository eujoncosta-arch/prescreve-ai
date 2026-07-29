import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/sync/eurofarma/route';

// RM-56-02: a checagem anterior só verificava presença do header
// Authorization (qualquer valor não-vazio passava) e só em produção.
// Estes testes travam o comportamento real: comparação em tempo
// constante contra EUROFARMA_SYNC_TOKEN, fail-safe (bloqueado) em
// produção quando o segredo não está configurado.

const ORIGINAL_ENV = { ...process.env };

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
    process.env = { ...ORIGINAL_ENV };
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('produção + token configurado + header ausente: 401 (nunca "aberto por omissão")', async () => {
    process.env.NODE_ENV = 'production';
    process.env.EUROFARMA_SYNC_TOKEN = 'segredo-real-de-teste';
    const res = await POST(mkRequest());
    expect(res.status).toBe(401);
  });

  it('produção + token configurado + valor incorreto: 401 (não basta ter QUALQUER valor não-vazio — regressão do bug original)', async () => {
    process.env.NODE_ENV = 'production';
    process.env.EUROFARMA_SYNC_TOKEN = 'segredo-real-de-teste';
    const res = await POST(mkRequest('Bearer valor-qualquer-chutado'));
    expect(res.status).toBe(401);
  });

  it('produção + token configurado + valor correto: 200', async () => {
    process.env.NODE_ENV = 'production';
    process.env.EUROFARMA_SYNC_TOKEN = 'segredo-real-de-teste';
    const res = await POST(mkRequest('Bearer segredo-real-de-teste'));
    expect(res.status).toBe(200);
  });

  it('produção + token NUNCA configurado: sempre 401, mesmo sem tentar autenticar (fail-safe)', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.EUROFARMA_SYNC_TOKEN;
    const res = await POST(mkRequest());
    expect(res.status).toBe(401);
  });

  it('fora de produção + token não configurado: permanece aberto (uso local sem configuração)', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.EUROFARMA_SYNC_TOKEN;
    const res = await POST(mkRequest());
    expect(res.status).toBe(200);
  });

  it('fora de produção + token configurado + valor incorreto: 401 (a checagem se aplica sempre que o segredo existe, não só em produção)', async () => {
    process.env.NODE_ENV = 'test';
    process.env.EUROFARMA_SYNC_TOKEN = 'segredo-real-de-teste';
    const res = await POST(mkRequest('Bearer errado'));
    expect(res.status).toBe(401);
  });
});
