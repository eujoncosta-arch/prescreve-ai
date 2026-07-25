import { ConfigService } from '@nestjs/config';
import {
  getRequiredSecret,
  validarSegredosDistintos,
} from './jwt-secrets.util';

function mockConfig(values: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

const STRONG_SECRET_A = 'a1B2c3D4e5F6g7H8i9J0-abcdefghijklmnopqrstuvwxyz';
const STRONG_SECRET_B = 'z9Y8x7W6v5U4t3S2r1Q0-zyxwvutsrqponmlkjihgfedcba';

describe('getRequiredSecret() — hardening de segredos JWT', () => {
  it('LANÇA erro se a variável de ambiente estiver ausente (startup deve falhar)', () => {
    const config = mockConfig({});
    expect(() => getRequiredSecret(config, 'JWT_SECRET')).toThrow(
      /não configurada/i,
    );
  });

  it('LANÇA erro se a variável de ambiente for uma string vazia', () => {
    const config = mockConfig({ JWT_SECRET: '' });
    expect(() => getRequiredSecret(config, 'JWT_SECRET')).toThrow(
      /não configurada/i,
    );
  });

  it('LANÇA erro se o segredo tiver menos de 32 caracteres', () => {
    const config = mockConfig({ JWT_SECRET: 'curto-demais-1234567890' }); // 24 chars
    expect(() => getRequiredSecret(config, 'JWT_SECRET')).toThrow(
      /mínimo exigido: 32/i,
    );
  });

  it('LANÇA erro se o segredo for um placeholder/valor de exemplo conhecido', () => {
    const config = mockConfig({
      JWT_SECRET: 'troque-por-string-aleatoria-de-64-chars-minimo',
    });
    expect(() => getRequiredSecret(config, 'JWT_SECRET')).toThrow(
      /placeholder/i,
    );
  });

  it('LANÇA erro se o segredo tiver baixa entropia (caractere repetido)', () => {
    const config = mockConfig({ JWT_SECRET: 'a'.repeat(40) });
    expect(() => getRequiredSecret(config, 'JWT_SECRET')).toThrow(
      /baixa entropia/i,
    );
  });

  it('LANÇA erro se o segredo for uma sequência numérica trivial repetida', () => {
    const config = mockConfig({ JWT_SECRET: '1234567890'.repeat(4) }); // 40 chars, só 10 dígitos distintos
    expect(() => getRequiredSecret(config, 'JWT_SECRET')).toThrow(
      /baixa entropia/i,
    );
  });

  it('ACEITA um segredo forte (>= 32 chars, alta entropia, não é placeholder conhecido)', () => {
    const config = mockConfig({ JWT_SECRET: STRONG_SECRET_A });
    expect(getRequiredSecret(config, 'JWT_SECRET')).toBe(STRONG_SECRET_A);
  });

  it('a mensagem de erro NUNCA inclui o valor do segredo — apenas o nome da variável e seu comprimento', () => {
    const config = mockConfig({
      JWT_SECRET: 'segredo-secreto-que-nao-pode-vazar-em-log-nenhum',
    });
    // Este segredo tem >= 32 chars e boa entropia — não deve lançar; o teste
    // real de "nunca loga o valor" está em garantir que NENHUMA mensagem de
    // erro em todo o arquivo faz interpolação do parâmetro `value`.
    expect(() => getRequiredSecret(config, 'JWT_SECRET')).not.toThrow();

    const configFraco = mockConfig({ JWT_SECRET: 'valor-unico-mas-curto' });
    try {
      getRequiredSecret(configFraco, 'JWT_SECRET');
      fail('deveria ter lançado');
    } catch (e) {
      expect((e as Error).message).not.toContain('valor-unico-mas-curto');
    }
  });
});

describe('validarSegredosDistintos() — JWT_SECRET e JWT_REFRESH_SECRET nunca podem ser iguais', () => {
  it('LANÇA erro se os dois segredos forem idênticos', () => {
    const config = mockConfig({
      JWT_SECRET: STRONG_SECRET_A,
      JWT_REFRESH_SECRET: STRONG_SECRET_A,
    });
    expect(() => validarSegredosDistintos(config)).toThrow(/mesmo valor/i);
  });

  it('NÃO lança erro quando os segredos são distintos e ambos fortes', () => {
    const config = mockConfig({
      JWT_SECRET: STRONG_SECRET_A,
      JWT_REFRESH_SECRET: STRONG_SECRET_B,
    });
    expect(() => validarSegredosDistintos(config)).not.toThrow();
  });

  it('propaga a falha de ausência/fraqueza de qualquer um dos dois segredos (reaproveita getRequiredSecret)', () => {
    const config = mockConfig({ JWT_SECRET: STRONG_SECRET_A });
    expect(() => validarSegredosDistintos(config)).toThrow(/não configurada/i);
  });
});
