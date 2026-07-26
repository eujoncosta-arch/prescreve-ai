import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveAppEnv, resolveAppMode } from '@/lib/app-mode';

// ============================================================
// Auditoria de modo offline/demo — resolução de ambiente
//
// Prova a matriz de decisão central: DEMO só é retornado quando
// explicitamente ligado E o ambiente não é produção; produção NUNCA
// honra a flag de demo, mesmo que ligada por engano; valores
// desconhecidos/ausentes de APP_ENV caem em produção (fail-safe).
// ============================================================

type EnvKey = 'NEXT_PUBLIC_APP_ENV' | 'NEXT_PUBLIC_DEMO_MODE' | 'NODE_ENV';

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function setEnv(vars: Partial<Record<EnvKey, string>>) {
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
}

describe('resolveAppEnv() — fail-safe: desconhecido/ausente vira produção', () => {
  it('NEXT_PUBLIC_APP_ENV=production → production', () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production' });
    expect(resolveAppEnv()).toBe('production');
  });

  it('NEXT_PUBLIC_APP_ENV=staging → staging', () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'staging' });
    expect(resolveAppEnv()).toBe('staging');
  });

  it('NEXT_PUBLIC_APP_ENV=development → development', () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'development' });
    expect(resolveAppEnv()).toBe('development');
  });

  it('sem NEXT_PUBLIC_APP_ENV, cai para NODE_ENV', () => {
    setEnv({ NODE_ENV: 'development' });
    expect(resolveAppEnv()).toBe('development');
  });

  it('valor desconhecido de NEXT_PUBLIC_APP_ENV → production (fail-safe, nunca development)', () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'qualquer-coisa-invalida' });
    expect(resolveAppEnv()).toBe('production');
  });

  it('sem NEXT_PUBLIC_APP_ENV definido, cai para NODE_ENV — mesmo um valor não reconhecido nessa posição (ex.: "test", o valor ambiente do próprio Vitest) cai no fail-safe de produção', () => {
    setEnv({});
    // Não há como simular "nem NEXT_PUBLIC_APP_ENV nem NODE_ENV definidos" de
    // dentro do runtime do Vitest (que sempre define NODE_ENV='test') — mas
    // isso prova exatamente a mesma garantia: um valor de NODE_ENV que não é
    // production/staging/development NUNCA vira "development" por padrão.
    expect(resolveAppEnv()).toBe('production');
  });
});

describe('resolveAppMode() — matriz de decisão do modo demo', () => {
  it('produção + NEXT_PUBLIC_DEMO_MODE=true → "production" (demo NUNCA é honrado em produção)', () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production', NEXT_PUBLIC_DEMO_MODE: 'true' });
    expect(resolveAppMode()).toBe('production');
  });

  it('produção sem flag de demo → "production"', () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production' });
    expect(resolveAppMode()).toBe('production');
  });

  it('development + NEXT_PUBLIC_DEMO_MODE=true → "demo" (única forma de obter modo demo)', () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'development', NEXT_PUBLIC_DEMO_MODE: 'true' });
    expect(resolveAppMode()).toBe('demo');
  });

  it('development sem a flag → "development" (nunca demo por padrão/ausência)', () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'development' });
    expect(resolveAppMode()).toBe('development');
  });

  it('staging + flag de demo → "demo" (demo é honrado fora de produção)', () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'staging', NEXT_PUBLIC_DEMO_MODE: 'true' });
    expect(resolveAppMode()).toBe('demo');
  });

  it('valor "1"/"yes" NÃO ativa demo — só a string exata "true" (evita ativação acidental)', () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'development', NEXT_PUBLIC_DEMO_MODE: '1' });
    expect(resolveAppMode()).toBe('development');
  });

  it('APP_ENV desconhecido + flag de demo ligada → "production" (fail-safe vence a flag de demo)', () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'algo-invalido', NEXT_PUBLIC_DEMO_MODE: 'true' });
    expect(resolveAppMode()).toBe('production');
  });
});
