import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Action } from '@/lib/store';

// ============================================================
// RM-47 — E2E frontend real (Cenário 6): logout durante requisição em voo
//
// Diferença deliberada em relação às suítes RM-42/44/45 (que injetam
// `listar`/`sessaoValida` como funções puras simuladas): aqui o
// `consultaApi.listar()` REAL faz um `fetch()` de verdade contra um
// servidor HTTP real (Node `http`, nesta mesma máquina) — a requisição
// genuinamente sai do processo, atravessa `apiFetch()` (a camada de
// rede real do frontend), e só então retorna. Isso prova que o guard de
// sessão funciona sob uma condição de corrida REAL, não apenas quando o
// mock resolve na ordem que o teste escolheu.
//
// Por que não um servidor NestJS real aqui: frontend e backend são dois
// projetos Node separados (node_modules/tsconfig próprios, sem
// ferramenta de monorepo linkando os dois) — o backend real já é
// exercitado de ponta a ponta em
// `backend/test/e2e-clinical-persistence.e2e-spec.ts`. Este arquivo
// prova a metade que aquele NÃO cobre: o comportamento do cliente HTTP
// do FRONTEND (`api-client.ts`/`store.tsx`) sob uma resposta atrasada
// real, não simulada.
// ============================================================

function tokenParaUsuario(sub: string, email: string, perfil = 'MEDICO'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({ sub, email, perfil })).toString('base64');
  return `${header}.${payload}.sig-fake`;
}

describe('RM-47 — Cenário 6 (E2E real): logout durante hidratação em voo', () => {
  let server: http.Server;
  let baseUrl: string;
  let segurarResposta: (() => void) | null = null;
  const consultasPorUsuario: Record<string, { id: string; status: string; criado_em: string }[]> = {
    'user-a': [{ id: 'consulta-real-a', status: 'concluida', criado_em: '2026-01-01T00:00:00.000Z' }],
  };

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.method === 'GET' && req.url?.startsWith('/api/consultas')) {
        const auth = req.headers.authorization ?? '';
        const token = auth.replace('Bearer ', '');
        const payloadB64 = token.split('.')[1];
        const payload = payloadB64 ? (JSON.parse(Buffer.from(payloadB64, 'base64').toString()) as { sub: string }) : null;

        const enviar = () => {
          const lista = payload ? (consultasPorUsuario[payload.sub] ?? []) : [];
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ total: lista.length, pagina: 1, limite: 20, consultas: lista }));
        };
        // Represa a resposta — simula latência de rede real durante a
        // qual um logout pode acontecer no cliente. O teste libera
        // explicitamente via `segurarResposta()`.
        segurarResposta = enviar;
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('resposta de hidratação que chega DEPOIS do logout nunca é aplicada ao estado (fetch real, timing real)', async () => {
    segurarResposta = null;
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = baseUrl;
    process.env.NEXT_PUBLIC_APP_ENV = 'development';
    delete process.env.NEXT_PUBLIC_DEMO_MODE;

    const { executarCarregamentoPaginaInicial, INITIAL_PAGINATION } = await import('@/lib/store');
    const { consultaApi } = await import('@/lib/api-client');

    const acoes: Action[] = [];
    localStorage.setItem('prescreve_ai_access_token', tokenParaUsuario('user-a', 'a@teste.local'));

    let sessaoValidaAtual = true; // representa: a sessão que iniciou a chamada ainda é a atual?

    const promessa = executarCarregamentoPaginaInicial({
      pagination: INITIAL_PAGINATION,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listar: (pagina, limite) => consultaApi.listar(pagina, limite) as Promise<any>,
      dispatch: (a) => acoes.push(a),
      sessaoValida: () => sessaoValidaAtual,
    });

    // Dá tempo real para a requisição HTTP genuína sair do processo e
    // chegar ao servidor (fetch real, não um mock que resolve na hora).
    await vi.waitFor(() => expect(typeof segurarResposta).toBe('function'), { timeout: 2000 });

    // LOGOUT acontece agora — ANTES da resposta em voo ser liberada.
    sessaoValidaAtual = false;
    localStorage.removeItem('prescreve_ai_access_token');

    // Libera a resposta represada — chega DEPOIS do logout.
    segurarResposta!();

    const resultado = await promessa;

    expect(resultado).toBe('skipped'); // resposta tardia descartada, nunca aplicada
    expect(acoes.some((a) => a.type === 'HYDRATE_CONSULTATIONS_PAGE')).toBe(false);
  });

  it('controle: a MESMA hidratação, sem logout no meio, aplica normalmente (prova que o servidor/fixture funcionam)', async () => {
    segurarResposta = null;
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = baseUrl;
    process.env.NEXT_PUBLIC_APP_ENV = 'development';
    delete process.env.NEXT_PUBLIC_DEMO_MODE;

    const { executarCarregamentoPaginaInicial, INITIAL_PAGINATION } = await import('@/lib/store');
    const { consultaApi } = await import('@/lib/api-client');

    const acoes: Action[] = [];
    localStorage.setItem('prescreve_ai_access_token', tokenParaUsuario('user-a', 'a@teste.local'));

    const promessa = executarCarregamentoPaginaInicial({
      pagination: INITIAL_PAGINATION,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listar: (pagina, limite) => consultaApi.listar(pagina, limite) as Promise<any>,
      dispatch: (a) => acoes.push(a),
      sessaoValida: () => true, // sessão nunca muda neste teste de controle
    });

    await vi.waitFor(() => expect(typeof segurarResposta).toBe('function'), { timeout: 2000 });
    segurarResposta!();

    const resultado = await promessa;

    expect(resultado).toBe('loaded');
    const hidratacao = acoes.find((a) => a.type === 'HYDRATE_CONSULTATIONS_PAGE');
    expect(hidratacao).toBeDefined();
  });
});
