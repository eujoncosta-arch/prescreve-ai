import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { AuditService } from './audit.service';
import { hmacIdentifier } from '../../common/crypto/identifier-hash.util';

function mockConfig(values: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

const CHAVE_VALIDA = 'aa'.repeat(32);

describe('AuditService.registrarAuditoria() — hash de IP (regressão PRIV-01)', () => {
  /**
   * Bug real corrigido na auditoria de segurança final: AuditService era a
   * ÚNICA implementação de hash de IP ainda usando SHA-256 puro sem
   * segredo, reversível por rainbow table (IPv4 tem só 2^32 valores).
   * Estes testes provam que o ip_hash persistido agora é idêntico ao
   * produzido por hmacIdentifier() com a chave server-side — não mais um
   * SHA-256 simples e reversível.
   */
  function buildService(config: ConfigService) {
    const prismaMock = {
      auditoria: { create: jest.fn((args: unknown) => Promise.resolve(args)) },
    };
    const service = new AuditService(prismaMock as never, config);
    return { service, prismaMock };
  }

  it('ip_hash gravado é o HMAC-SHA256 (com IDENTIFIER_HMAC_KEY), não um SHA-256 sem segredo', async () => {
    const config = mockConfig({ IDENTIFIER_HMAC_KEY: CHAVE_VALIDA });
    const { service, prismaMock } = buildService(config);

    await service.registrarAuditoria({
      tipo: 'login',
      acao: 'teste',
      ip: '203.0.113.42',
    });

    const chamado = prismaMock.auditoria.create.mock.calls[0][0] as {
      data: { ip_hash?: string };
    };
    const esperado = hmacIdentifier(config, 'ip', '203.0.113.42');
    expect(chamado.data.ip_hash).toBe(esperado);

    // Confirma que NÃO é mais um SHA-256 puro e sem segredo do IP.
    const shaSemSegredoInseguro = crypto
      .createHash('sha256')
      .update('203.0.113.42')
      .digest('hex');
    expect(chamado.data.ip_hash).not.toBe(shaSemSegredoInseguro);
  });

  it('sem IDENTIFIER_HMAC_KEY configurada, o serviço nem chega a ser construído (falha fechada no startup — regressão SECRET-01)', () => {
    const config = mockConfig({});
    expect(() => buildService(config)).toThrow(/IDENTIFIER_HMAC_KEY/);
  });

  it('sem IP informado, ip_hash é undefined (não hasheia string vazia)', async () => {
    const config = mockConfig({ IDENTIFIER_HMAC_KEY: CHAVE_VALIDA });
    const { service, prismaMock } = buildService(config);

    await service.registrarAuditoria({ tipo: 'login', acao: 'teste' });

    const chamado = prismaMock.auditoria.create.mock.calls[0][0] as {
      data: { ip_hash?: string };
    };
    expect(chamado.data.ip_hash).toBeUndefined();
  });
});
