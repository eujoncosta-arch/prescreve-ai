import { ConfigService } from '@nestjs/config';
import { resolveAppEnv, parseCsvEnv } from './environment.util';

function mockConfig(values: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe('resolveAppEnv() — resolução de ambiente com fail-safe para produção', () => {
  it('APP_ENV="production" → "production"', () => {
    expect(resolveAppEnv(mockConfig({ APP_ENV: 'production' }))).toBe(
      'production',
    );
  });

  it('APP_ENV="staging" → "staging"', () => {
    expect(resolveAppEnv(mockConfig({ APP_ENV: 'staging' }))).toBe('staging');
  });

  it('APP_ENV="development" → "development"', () => {
    expect(resolveAppEnv(mockConfig({ APP_ENV: 'development' }))).toBe(
      'development',
    );
  });

  it('sem APP_ENV, usa NODE_ENV como fallback', () => {
    expect(resolveAppEnv(mockConfig({ NODE_ENV: 'production' }))).toBe(
      'production',
    );
  });

  it('APP_ENV tem prioridade sobre NODE_ENV quando ambos definidos', () => {
    expect(
      resolveAppEnv(mockConfig({ APP_ENV: 'staging', NODE_ENV: 'production' })),
    ).toBe('staging');
  });

  it('sem APP_ENV nem NODE_ENV → "development" (padrão de ambiente local, não produção)', () => {
    expect(resolveAppEnv(mockConfig({}))).toBe('development');
  });

  it('valor desconhecido/inválido de APP_ENV → "production" (falha segura, NUNCA development)', () => {
    expect(
      resolveAppEnv(mockConfig({ APP_ENV: 'qa-ambiente-inventado' })),
    ).toBe('production');
  });

  it('string vazia após trim → "production" (falha segura, não cai no default "development")', () => {
    expect(resolveAppEnv(mockConfig({ APP_ENV: '   ' }))).toBe('production');
  });

  it('typo comum ("produção", "prod") → "production" (falha segura, não aceita variantes)', () => {
    expect(resolveAppEnv(mockConfig({ APP_ENV: 'prod' }))).toBe('production');
    expect(resolveAppEnv(mockConfig({ APP_ENV: 'produção' }))).toBe(
      'production',
    );
  });

  it('normaliza espaços e maiúsculas/minúsculas para valores válidos', () => {
    expect(resolveAppEnv(mockConfig({ APP_ENV: '  PRODUCTION  ' }))).toBe(
      'production',
    );
    expect(resolveAppEnv(mockConfig({ APP_ENV: 'Staging' }))).toBe('staging');
  });

  it('NODE_ENV inválido (sem APP_ENV) também cai em "production" — nunca herda o texto bruto', () => {
    expect(resolveAppEnv(mockConfig({ NODE_ENV: 'qualquer-coisa' }))).toBe(
      'production',
    );
  });
});

describe('parseCsvEnv() — parsing seguro de listas CSV vindas de env vars', () => {
  it('undefined → lista vazia', () => {
    expect(parseCsvEnv(undefined)).toEqual([]);
  });

  it('string vazia → lista vazia', () => {
    expect(parseCsvEnv('')).toEqual([]);
  });

  it('valores separados por vírgula são splitados e trimados', () => {
    expect(
      parseCsvEnv(
        'https://a.example.com, https://b.example.com ,https://c.example.com',
      ),
    ).toEqual([
      'https://a.example.com',
      'https://b.example.com',
      'https://c.example.com',
    ]);
  });

  it('entradas vazias entre vírgulas (ex.: trailing comma) são descartadas, não viram string vazia na lista', () => {
    expect(parseCsvEnv('https://a.example.com,,')).toEqual([
      'https://a.example.com',
    ]);
  });

  it('string só com espaços/vírgulas → lista vazia', () => {
    expect(parseCsvEnv('  , , ')).toEqual([]);
  });

  it('valor único sem vírgula → lista com um elemento', () => {
    expect(parseCsvEnv('https://only.example.com')).toEqual([
      'https://only.example.com',
    ]);
  });
});
