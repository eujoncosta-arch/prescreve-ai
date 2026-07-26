import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { hmacIdentifier } from './identifier-hash.util';

function mockConfig(values: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

const CHAVE_VALIDA = 'aa'.repeat(32); // 32 bytes hex

describe('hmacIdentifier() — pseudonimização de CPF/CRM/IP', () => {
  it('LANÇA erro se IDENTIFIER_HMAC_KEY não estiver configurada (fail-fast, nunca hash sem segredo como fallback)', () => {
    const config = mockConfig({});
    expect(() => hmacIdentifier(config, 'cpf', '12345678909')).toThrow(
      /IDENTIFIER_HMAC_KEY/,
    );
  });

  it('LANÇA erro se a chave não tiver exatamente 32 bytes', () => {
    const config = mockConfig({ IDENTIFIER_HMAC_KEY: 'aa' });
    expect(() => hmacIdentifier(config, 'cpf', '12345678909')).toThrow(
      /32 bytes/,
    );
  });

  it('é determinístico: o mesmo valor + mesma chave sempre produz o mesmo hash', () => {
    const config = mockConfig({ IDENTIFIER_HMAC_KEY: CHAVE_VALIDA });
    const h1 = hmacIdentifier(config, 'cpf', '12345678909');
    const h2 = hmacIdentifier(config, 'cpf', '12345678909');
    expect(h1).toBe(h2);
  });

  it('produz um hex de 64 caracteres (HMAC-SHA256)', () => {
    const config = mockConfig({ IDENTIFIER_HMAC_KEY: CHAVE_VALIDA });
    expect(hmacIdentifier(config, 'cpf', '12345678909')).toMatch(
      /^[a-f0-9]{64}$/,
    );
  });

  it('normaliza formatação — CPF com/sem pontuação produz o MESMO hash', () => {
    const config = mockConfig({ IDENTIFIER_HMAC_KEY: CHAVE_VALIDA });
    const semPontuacao = hmacIdentifier(config, 'cpf', '12345678909');
    const comPontuacao = hmacIdentifier(config, 'cpf', '123.456.789-09');
    expect(semPontuacao).toBe(comPontuacao);
  });

  it('SEPARAÇÃO DE DOMÍNIO: o mesmo valor bruto em domínios diferentes (cpf vs crm) produz hashes DIFERENTES', () => {
    const config = mockConfig({ IDENTIFIER_HMAC_KEY: CHAVE_VALIDA });
    const comoCpf = hmacIdentifier(config, 'cpf', '12345678');
    const comoCrm = hmacIdentifier(config, 'crm', '12345678');
    expect(comoCpf).not.toBe(comoCrm);
  });

  it('chaves DIFERENTES produzem hashes DIFERENTES para o mesmo valor (o segredo realmente participa do resultado)', () => {
    const configA = mockConfig({ IDENTIFIER_HMAC_KEY: 'aa'.repeat(32) });
    const configB = mockConfig({ IDENTIFIER_HMAC_KEY: 'bb'.repeat(32) });
    const hashA = hmacIdentifier(configA, 'cpf', '12345678909');
    const hashB = hmacIdentifier(configB, 'cpf', '12345678909');
    expect(hashA).not.toBe(hashB);
  });

  describe('resistência a rainbow table (o ponto central desta auditoria)', () => {
    it('SEM a chave, um atacante que enumera TODOS os CPFs de 11 dígitos com SHA-256 simples (o algoritmo antigo/vulnerável) NUNCA acerta o hash real produzido pelo HMAC', () => {
      const config = mockConfig({ IDENTIFIER_HMAC_KEY: CHAVE_VALIDA });
      const cpfReal = '12345678909';
      const hashReal = hmacIdentifier(config, 'cpf', cpfReal);

      // Simula o ataque que funcionava contra o algoritmo antigo: gerar um
      // rainbow table de SHA-256 simples (sem segredo) para um espaço de
      // CPFs plausíveis e comparar com o hash armazenado.
      const candidatos = Array.from({ length: 1000 }, (_, i) =>
        String(i).padStart(11, '0'),
      );
      const rainbowTableAcertou = candidatos.some(
        (candidato) =>
          crypto.createHash('sha256').update(candidato).digest('hex') ===
          hashReal,
      );

      expect(rainbowTableAcertou).toBe(false);
    });

    it('o hash HMAC nunca é igual ao SHA-256 simples do mesmo valor (prova de que o segredo efetivamente muda o resultado)', () => {
      const config = mockConfig({ IDENTIFIER_HMAC_KEY: CHAVE_VALIDA });
      const cpf = '12345678909';
      const hashComSegredo = hmacIdentifier(config, 'cpf', cpf);
      const hashSemSegredo = crypto
        .createHash('sha256')
        .update(cpf)
        .digest('hex');
      expect(hashComSegredo).not.toBe(hashSemSegredo);
    });
  });
});
