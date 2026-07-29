import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================
// RM-38 — Eliminação de caminhos de fallback/demo/offline que retornam
// dados fictícios fora de um modo explicitamente autorizado.
//
// PROBLEMA CORRIGIDO: `consultaApi`/`migracaoApi` usavam um único flag
// (`USE_REAL_BACKEND = !IS_DEMO_MODE && API_URL_CONFIGURED`) para decidir
// entre "usar backend real" e "retornar dado fictício" — uma implantação
// de produção/desenvolvimento real com `NEXT_PUBLIC_API_URL` ausente
// (configuração quebrada, não modo demo) caía no MESMO ramo que o modo
// demo intencional, retornando SILENCIOSAMENTE `{ id: 'demo-...' }` como
// se uma consulta/diagnóstico/prescrição real tivesse sido persistida.
// Um médico com uma sessão JWT real ainda válida em localStorage (que
// `getCurrentUser()` decodifica sem checar configuração de backend)
// jamais saberia que nada foi salvo de verdade.
//
// Corrigido: cada método agora distingue explicitamente `IS_DEMO_MODE`
// (retorna dado de demonstração, rotulado, nunca enviado à rede) de
// "backend real esperado mas ausente" (lança `AuthConfigError` — nunca
// um sucesso fabricado).
// ============================================================

type EnvKey =
  | 'NEXT_PUBLIC_APP_ENV'
  | 'NEXT_PUBLIC_DEMO_MODE'
  | 'NEXT_PUBLIC_API_URL'
  | 'NODE_ENV';

beforeEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
  vi.resetModules();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function setEnv(vars: Partial<Record<EnvKey, string>>) {
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
}

describe('PRODUÇÃO sem backend configurado — consultaApi NUNCA retorna sucesso fabricado', () => {
  it('criar() lança AuthConfigError (nunca { id: "demo-..." })', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production' });
    const { consultaApi, AuthConfigError } = await import('@/lib/api-client');
    await expect(consultaApi.criar({ anamnese: { queixa: 'dor' } })).rejects.toBeInstanceOf(
      AuthConfigError,
    );
  });

  it('criarDiagnostico() lança AuthConfigError (nunca um id fictício com os mesmos dados enviados de volta)', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production' });
    const { consultaApi, AuthConfigError } = await import('@/lib/api-client');
    await expect(
      consultaApi.criarDiagnostico({ consulta_id: 'c1', cid: 'I10', descricao: 'HAS' }),
    ).rejects.toBeInstanceOf(AuthConfigError);
  });

  it('criarPrescricao() lança AuthConfigError — nunca fabrica uma prescrição', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production' });
    const { consultaApi, AuthConfigError } = await import('@/lib/api-client');
    await expect(
      consultaApi.criarPrescricao({ consulta_id: 'c1', medicamentos: [] }),
    ).rejects.toBeInstanceOf(AuthConfigError);
  });

  it('salvarRisco() lança AuthConfigError', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production' });
    const { consultaApi, AuthConfigError } = await import('@/lib/api-client');
    await expect(consultaApi.salvarRisco('c1', { risco_global: 'baixo' })).rejects.toBeInstanceOf(
      AuthConfigError,
    );
  });

  it('listar()/buscar()/timeline()/buscarEvidencias()/buscarRWE() também lançam — nunca retornam listas vazias silenciosas que mascarem "backend indisponível" como "nenhum dado ainda"', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production' });
    const { consultaApi, AuthConfigError } = await import('@/lib/api-client');
    await expect(consultaApi.listar()).rejects.toBeInstanceOf(AuthConfigError);
    await expect(consultaApi.buscar('c1')).rejects.toBeInstanceOf(AuthConfigError);
    await expect(consultaApi.timeline()).rejects.toBeInstanceOf(AuthConfigError);
    await expect(consultaApi.buscarEvidencias('I10')).rejects.toBeInstanceOf(AuthConfigError);
    await expect(consultaApi.buscarRWE('I10')).rejects.toBeInstanceOf(AuthConfigError);
  });

  it('migracaoApi.verificarStatus() lança AuthConfigError', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production' });
    const { migracaoApi, AuthConfigError } = await import('@/lib/api-client');
    await expect(migracaoApi.verificarStatus()).rejects.toBeInstanceOf(AuthConfigError);
  });

  it('migracaoApi.migrarLocalStorage() retorna 0 migrados + motivo explícito (nunca finge migração bem-sucedida)', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production' });
    const { migracaoApi } = await import('@/lib/api-client');
    const r = await migracaoApi.migrarLocalStorage();
    expect(r.prescricoes_migradas).toBe(0);
    expect(r.validacoes_migradas).toBe(0);
    expect(r.erros.join(' ')).toMatch(/produção/i);
  });

  it('a mensagem de erro de produção nunca sugere que dados foram salvos', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production' });
    const { consultaApi } = await import('@/lib/api-client');
    await expect(consultaApi.criar({})).rejects.toThrow(/bloqueado.*seguran|nenhum dado é simulado/i);
  });
});

describe('DESENVOLVIMENTO real (não demo) sem backend configurado — mesmo bloqueio', () => {
  it('criarPrescricao() lança AuthConfigError mesmo fora de produção, quando o modo NÃO é demo', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'development' }); // sem NEXT_PUBLIC_DEMO_MODE
    const { consultaApi, AuthConfigError } = await import('@/lib/api-client');
    await expect(
      consultaApi.criarPrescricao({ consulta_id: 'c1', medicamentos: [] }),
    ).rejects.toBeInstanceOf(AuthConfigError);
  });
});

describe('MODO DEMO explícito — dados simulados continuam funcionando normalmente (regressão)', () => {
  it('criar()/criarDiagnostico()/criarPrescricao()/salvarRisco() retornam ids demo, sem chamar fetch', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'development', NEXT_PUBLIC_DEMO_MODE: 'true' });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { consultaApi } = await import('@/lib/api-client');

    const consulta = (await consultaApi.criar({})) as { id: string };
    expect(consulta.id).toMatch(/^demo-/);

    const diag = (await consultaApi.criarDiagnostico({ consulta_id: 'c1', cid: 'I10', descricao: 'HAS' })) as { id: string };
    expect(diag.id).toMatch(/^demo-diag-/);

    const rx = (await consultaApi.criarPrescricao({ consulta_id: 'c1', medicamentos: [] })) as { id: string };
    expect(rx.id).toMatch(/^demo-rx-/);

    const risco = (await consultaApi.salvarRisco('c1', {})) as { id: string };
    expect(risco.id).toMatch(/^demo-risk-/);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('migracaoApi.migrarLocalStorage() em modo demo explica que dados demo nunca são enviados ao backend real', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'development', NEXT_PUBLIC_DEMO_MODE: 'true' });
    const { migracaoApi } = await import('@/lib/api-client');
    const r = await migracaoApi.migrarLocalStorage();
    expect(r.erros.join(' ')).toMatch(/demonstração/i);
  });
});

describe('PRODUÇÃO com backend REAL configurado — chamadas reais funcionam normalmente (regressão)', () => {
  it('criar() chama POST /api/consulta de verdade e retorna o resultado real do servidor', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production', NEXT_PUBLIC_API_URL: 'https://api.exemplo.com' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 'consulta-real-123', status: 'em_andamento' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { consultaApi } = await import('@/lib/api-client');

    const r = await consultaApi.criar({ anamnese: { queixa: 'dor' } });
    expect(r).toEqual({ id: 'consulta-real-123', status: 'em_andamento' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.exemplo.com/api/consulta',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('AuthConfigError — nunca retentado pelo motor de sincronização', () => {
  it('é uma instância de NonRetryableError (reenviar sem mudar configuração nunca teria sucesso)', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production' });
    const { AuthConfigError } = await import('@/lib/api-client');
    const { NonRetryableError, isRetryable } = await import('@/lib/sync-engine');

    const err = new AuthConfigError('backend ausente');
    expect(err).toBeInstanceOf(NonRetryableError);
    expect(isRetryable(err)).toBe(false);
  });
});
