import { ConfigService } from '@nestjs/config';
import { validarDatabaseUrlConfigurada } from './database-url.util';

function mockConfig(values: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

// ============================================================
// RM-37 — DATABASE_URL falha rápido no startup, nunca na primeira query
// ============================================================

describe('validarDatabaseUrlConfigurada() — inicialização determinística (RM-37)', () => {
  it('LANÇA erro se DATABASE_URL estiver ausente', () => {
    const config = mockConfig({});
    expect(() => validarDatabaseUrlConfigurada(config)).toThrow(
      /não configurada/i,
    );
  });

  it('LANÇA erro se DATABASE_URL for uma string vazia', () => {
    const config = mockConfig({ DATABASE_URL: '' });
    expect(() => validarDatabaseUrlConfigurada(config)).toThrow(
      /não configurada/i,
    );
  });

  it('LANÇA erro se DATABASE_URL for só espaços', () => {
    const config = mockConfig({ DATABASE_URL: '   ' });
    expect(() => validarDatabaseUrlConfigurada(config)).toThrow(
      /não configurada/i,
    );
  });

  it('LANÇA erro se DATABASE_URL não parecer uma connection string PostgreSQL (ex.: mysql://, sqlite, texto arbitrário)', () => {
    expect(() =>
      validarDatabaseUrlConfigurada(
        mockConfig({ DATABASE_URL: 'mysql://user:pass@host/db' }),
      ),
    ).toThrow(/PostgreSQL/i);
    expect(() =>
      validarDatabaseUrlConfigurada(
        mockConfig({ DATABASE_URL: 'file:./dev.db' }),
      ),
    ).toThrow(/PostgreSQL/i);
    expect(() =>
      validarDatabaseUrlConfigurada(
        mockConfig({ DATABASE_URL: 'qualquer coisa' }),
      ),
    ).toThrow(/PostgreSQL/i);
  });

  it('ACEITA uma connection string postgresql:// válida', () => {
    expect(() =>
      validarDatabaseUrlConfigurada(
        mockConfig({
          DATABASE_URL: 'postgresql://user:pass@host:5432/db?schema=public',
        }),
      ),
    ).not.toThrow();
  });

  it('ACEITA uma connection string postgres:// (alias aceito pelo driver) válida', () => {
    expect(() =>
      validarDatabaseUrlConfigurada(
        mockConfig({ DATABASE_URL: 'postgres://user:pass@host:5432/db' }),
      ),
    ).not.toThrow();
  });
});
