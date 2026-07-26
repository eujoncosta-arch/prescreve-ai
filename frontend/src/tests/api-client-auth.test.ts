import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================
// Auditoria de modo offline/demo — comportamento real de autenticação
//
// PROBLEMA CORRIGIDO: authApi.login() fabricava uma sessão (`offline-...`)
// sempre que NEXT_PUBLIC_API_URL estivesse ausente — sem NENHUMA
// verificação de credenciais, e sem distinguir "modo demo intencional" de
// "produção mal configurada". Estes testes prova a matriz de comportamento
// corrigida via reimportação do módulo com env vars diferentes a cada
// cenário (as constantes de modo são resolvidas na importação).
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

describe('PRODUÇÃO + API indisponível → login bloqueado (nunca cria sessão falsa)', () => {
  it('sem NEXT_PUBLIC_API_URL configurado, login() rejeita com AuthConfigError — nenhum token é salvo', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production' });
    const { authApi, AuthConfigError } = await import('@/lib/api-client');

    await expect(authApi.login('medico@x.com', 'senhaforte123')).rejects.toBeInstanceOf(
      AuthConfigError,
    );
    expect(authApi.isAuthenticated()).toBe(false);
  });

  it('a mensagem de erro menciona produção e nunca sugere que a sessão foi criada', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production' });
    const { authApi } = await import('@/lib/api-client');

    await expect(authApi.login('medico@x.com', 'senhaforte123')).rejects.toThrow(/produção/i);
  });

  it('com NEXT_PUBLIC_API_URL configurado mas o servidor fora do ar (fetch rejeita), login() propaga o erro real — nunca fabrica um token', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production', NEXT_PUBLIC_API_URL: 'https://api.exemplo.com' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { authApi } = await import('@/lib/api-client');

    await expect(authApi.login('medico@x.com', 'senhaforte123')).rejects.toThrow(
      'Failed to fetch',
    );
    expect(authApi.isAuthenticated()).toBe(false);
  });
});

describe('PRODUÇÃO + API disponível → login real', () => {
  it('chama POST /auth/login de verdade e salva os tokens reais retornados pelo servidor', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production', NEXT_PUBLIC_API_URL: 'https://api.exemplo.com' });
    const tokensReais = {
      access_token: 'eyJhbGciOiJIUzI1NiJ9.real.token',
      refresh_token: 'refresh-real-xyz',
      perfil: 'MEDICO',
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => tokensReais,
    });
    vi.stubGlobal('fetch', fetchMock);
    const { authApi } = await import('@/lib/api-client');

    const resultado = await authApi.login('medico@x.com', 'senhaforte123');

    expect(resultado).toEqual(tokensReais);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.exemplo.com/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(authApi.getToken()).toBe(tokensReais.access_token);
  });
});

describe('DEMO explicitamente ativado → comportamento isolado', () => {
  it('development + NEXT_PUBLIC_DEMO_MODE=true → login() resolve localmente, SEM chamar fetch', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'development', NEXT_PUBLIC_DEMO_MODE: 'true' });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { authApi, getCurrentUser } = await import('@/lib/api-client');

    const tokens = await authApi.login('qualquer@x.com', 'qualquer-senha');

    expect(tokens.access_token).toMatch(/^demo-/);
    expect(fetchMock).not.toHaveBeenCalled();
    const user = getCurrentUser();
    expect(user?.demo).toBe(true);
  });

  it('DEMO NÃO PODE ACESSAR DADOS DE PRODUÇÃO: mesmo com NEXT_PUBLIC_API_URL configurado, modo demo nunca chama o backend real', async () => {
    setEnv({
      NEXT_PUBLIC_APP_ENV: 'development',
      NEXT_PUBLIC_DEMO_MODE: 'true',
      NEXT_PUBLIC_API_URL: 'https://api-producao-de-verdade.exemplo.com',
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { authApi, consultaApi, useRealBackend } = await import('@/lib/api-client');

    await authApi.login('qualquer@x.com', 'qualquer-senha');
    await consultaApi.criar({ anamnese: { queixa: 'teste' } });

    expect(useRealBackend).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled(); // NENHUMA chamada de rede, mesmo com API_URL configurada
  });

  it('registro de novo usuário é bloqueado em modo demo (não é uma operação simulável com segurança)', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'development', NEXT_PUBLIC_DEMO_MODE: 'true' });
    const { authApi, AuthConfigError } = await import('@/lib/api-client');

    await expect(
      authApi.register({ email: 'x@x.com', senha: 'senhaforte123', perfil: 'MEDICO' }),
    ).rejects.toBeInstanceOf(AuthConfigError);
  });

  it('produção com NEXT_PUBLIC_DEMO_MODE=true (configuração incorreta) NUNCA entra em modo demo — login exige backend real', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production', NEXT_PUBLIC_DEMO_MODE: 'true' });
    const { authApi, AuthConfigError, isDemoMode } = await import('@/lib/api-client');

    expect(isDemoMode).toBe(false);
    await expect(authApi.login('x@x.com', 'senhaforte123')).rejects.toBeInstanceOf(
      AuthConfigError,
    );
  });
});

describe('logout() limpa TODOS os dados do app, não só os tokens (regressão FE-03)', () => {
  it('dados clínicos (anamnese, histórico, favoritos) persistidos em localStorage são removidos no logout', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'development', NEXT_PUBLIC_DEMO_MODE: 'true' });
    const { authApi } = await import('@/lib/api-client');

    await authApi.login('qualquer@x.com', 'qualquer-senha');
    localStorage.setItem('prescreve_ai_anamnese', JSON.stringify({ queixa: 'dor' }));
    localStorage.setItem('prescreve_ai_historico', JSON.stringify([{ id: 1 }]));
    localStorage.setItem('prescreve-ai-favoritos', JSON.stringify([{ id: 'fav-1' }]));
    localStorage.setItem('prescreve_theme', 'dark');

    await authApi.logout();

    expect(localStorage.getItem('prescreve_ai_access_token')).toBeNull();
    expect(localStorage.getItem('prescreve_ai_anamnese')).toBeNull();
    expect(localStorage.getItem('prescreve_ai_historico')).toBeNull();
    expect(localStorage.getItem('prescreve-ai-favoritos')).toBeNull();
    // Preferência de tema não é dado clínico/de sessão — não precisa ser limpa.
    expect(localStorage.getItem('prescreve_theme')).toBe('dark');
  });
});

describe('Token demo não é aceito fora do modo demo (defesa em profundidade no frontend)', () => {
  it('um token "demo-..." salvo no localStorage é ignorado (usuário tratado como não autenticado) quando o build NÃO está em modo demo', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production' });
    const { getCurrentUser } = await import('@/lib/api-client');

    localStorage.setItem('prescreve_ai_access_token', 'demo-1234567890');

    expect(getCurrentUser()).toBeNull();
  });
});
