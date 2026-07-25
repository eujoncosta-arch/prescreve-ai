import { ConfigService } from '@nestjs/config';
import { resolveAllowedOrigins, buildCorsOriginHandler } from './cors.util';

function mockConfig(values: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe('resolveAllowedOrigins() — allowlist explícita por ambiente (sem regex/wildcard)', () => {
  it('produção: inclui os domínios estáveis conhecidos do frontend, mesmo sem env vars extras', () => {
    const config = mockConfig({ APP_ENV: 'production' });
    const origins = resolveAllowedOrigins(config);
    expect(origins).toContain('https://frontend-eujoncosta.vercel.app');
    expect(origins.length).toBeGreaterThan(0);
  });

  it('produção: NÃO aceita um subdomínio *.vercel.app arbitrário — vulnerabilidade da regex antiga corrigida', () => {
    const config = mockConfig({ APP_ENV: 'production' });
    const origins = resolveAllowedOrigins(config);
    expect(origins).not.toContain(
      'https://qualquer-projeto-de-um-atacante.vercel.app',
    );
    // Nenhuma entrada da allowlist é uma regex/wildcard — todas são strings literais.
    for (const o of origins) {
      expect(o.includes('*')).toBe(false);
      expect(o).not.toMatch(/^\/.*\/$/); // não é uma serialização de regex
    }
  });

  it('produção: soma CORS_ALLOWED_ORIGINS explícito aos padrões conhecidos', () => {
    const config = mockConfig({
      APP_ENV: 'production',
      CORS_ALLOWED_ORIGINS: 'https://staging-extra.example.com',
    });
    const origins = resolveAllowedOrigins(config);
    expect(origins).toContain('https://staging-extra.example.com');
    expect(origins).toContain('https://frontend-eujoncosta.vercel.app');
  });

  it('staging: SEM configuração explícita, não permite nenhuma origem (falha segura — não herda produção nem abre geral)', () => {
    const config = mockConfig({ APP_ENV: 'staging' });
    const origins = resolveAllowedOrigins(config);
    expect(origins).toEqual([]);
  });

  it('staging: com CORS_ALLOWED_ORIGINS configurado, usa exatamente essa lista', () => {
    const config = mockConfig({
      APP_ENV: 'staging',
      CORS_ALLOWED_ORIGINS: 'https://staging.prescreve-ai.example.com',
    });
    const origins = resolveAllowedOrigins(config);
    expect(origins).toEqual(['https://staging.prescreve-ai.example.com']);
  });

  it('desenvolvimento: inclui localhost por padrão', () => {
    const config = mockConfig({ APP_ENV: 'development' });
    const origins = resolveAllowedOrigins(config);
    expect(origins).toContain('http://localhost:3001');
  });

  it('valor inválido de APP_ENV é tratado como produção (falha segura — mais restritivo, nunca development)', () => {
    const config = mockConfig({ APP_ENV: 'qualquer-coisa-invalida' });
    const origins = resolveAllowedOrigins(config);
    expect(origins).not.toContain('http://localhost:3001');
    expect(origins).toContain('https://frontend-eujoncosta.vercel.app');
  });
});

describe('buildCorsOriginHandler() — decisão determinística, nunca aberta por padrão', () => {
  const allowed = [
    'https://frontend-eujoncosta.vercel.app',
    'http://localhost:3001',
  ];
  const handler = buildCorsOriginHandler(allowed);

  it('origem autorizada → callback(null, true)', (done) => {
    handler('https://frontend-eujoncosta.vercel.app', (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(true);
      done();
    });
  });

  it('origem NÃO autorizada → callback(Error, false) — bloqueada', (done) => {
    handler('https://atacante-qualquer.vercel.app', (err, allow) => {
      expect(err).toBeInstanceOf(Error);
      expect(allow).toBeFalsy();
      done();
    });
  });

  it('requisição sem header Origin (server-to-server/health check) é permitida — não é uma requisição de navegador sujeita a CORS', (done) => {
    handler(undefined, (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(true);
      done();
    });
  });

  it('origem semelhante mas não idêntica (subdomínio extra) é rejeitada — comparação exata, não prefixo/sufixo', (done) => {
    handler('https://sub.frontend-eujoncosta.vercel.app', (err, allow) => {
      expect(err).toBeInstanceOf(Error);
      expect(allow).toBeFalsy();
      done();
    });
  });
});
