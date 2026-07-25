/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- jest.Mock.mock.calls é `any[]` por padrão. */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { generate, generateSecret } from 'otplib';
import * as bcrypt from 'bcrypt';
import { MfaService } from './mfa.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../modules/audit/audit.service';
import { encryptMfaSecret } from './mfa-crypto.util';
import type { Usuario } from '@prisma/client';

const TEST_MFA_KEY = 'a'.repeat(64); // 32 bytes em hex — apenas para teste

function buildConfigService(): ConfigService {
  return {
    get: jest.fn((key: string) =>
      key === 'MFA_ENCRYPTION_KEY' ? TEST_MFA_KEY : undefined,
    ),
  } as unknown as ConfigService;
}

function buildUsuario(overrides: Partial<Usuario> = {}): Usuario {
  return {
    id: 'usuario-1',
    email: 'medico@x.com',
    senha_hash: '',
    perfil: 'MEDICO',
    ativo: true,
    mfa_secret: null,
    mfa_ativo: false,
    mfa_falhas_consecutivas: 0,
    mfa_bloqueado_ate: null,
    criado_em: new Date(),
    atualizado_em: new Date(),
    deletado_em: null,
    ...overrides,
  } as unknown as Usuario;
}

describe('MfaService — TOTP real (RFC 6238), nunca "código presente = aceitar"', () => {
  let service: MfaService;
  let prisma: {
    usuario: { findUnique: jest.Mock; update: jest.Mock };
    mfaRecoveryCode: {
      findMany: jest.Mock;
      updateMany: jest.Mock;
      createMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let audit: { registrarAuditoria: jest.Mock };
  const config = buildConfigService();

  beforeEach(async () => {
    prisma = {
      usuario: {
        findUnique: jest.fn(),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ ...buildUsuario(), ...data }),
          ),
      },
      mfaRecoveryCode: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        createMany: jest.fn().mockResolvedValue({ count: 10 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest
        .fn()
        .mockImplementation((ops: unknown[]) => Promise.all(ops)),
    };
    audit = { registrarAuditoria: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(MfaService);
  });

  // ── Ativação ────────────────────────────────────────────────

  describe('iniciarAtivacao()', () => {
    it('gera um segredo e grava CRIPTOGRAFADO (nunca em texto puro) no banco, mfa_ativo permanece false', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce(buildUsuario());
      const resultado = await service.iniciarAtivacao('usuario-1');

      expect(resultado.secret_base32).toMatch(/^[A-Z2-7]+$/); // Base32
      expect(resultado.otpauth_url).toMatch(/^otpauth:\/\/totp\//);

      const updateCall = prisma.usuario.update.mock.calls[0][0] as {
        data: { mfa_secret: string; mfa_ativo: boolean };
      };
      expect(updateCall.data.mfa_ativo).toBe(false);
      expect(updateCall.data.mfa_secret).not.toBe(resultado.secret_base32); // criptografado, não é o segredo puro
      expect(updateCall.data.mfa_secret).toContain('.'); // formato iv.ciphertext.tag
    });

    it('rejeita reconfiguração se o MFA já está ativo', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce(
        buildUsuario({ mfa_ativo: true }),
      );
      await expect(service.iniciarAtivacao('usuario-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('confirmarAtivacao()', () => {
    it('ativa o MFA e gera 10 códigos de recuperação em texto puro (retornados uma única vez) quando o código TOTP é válido', async () => {
      const secretRaw = generateSecret();
      const encrypted = encryptMfaSecret(config, secretRaw);
      prisma.usuario.findUnique.mockResolvedValueOnce(
        buildUsuario({ mfa_secret: encrypted, mfa_ativo: false }),
      );

      const codigoValido = await generate({ secret: secretRaw });
      const resultado = await service.confirmarAtivacao(
        'usuario-1',
        codigoValido,
      );

      expect(resultado.recovery_codes).toHaveLength(10);
      expect(new Set(resultado.recovery_codes).size).toBe(10); // sem duplicatas
      expect(prisma.mfaRecoveryCode.createMany).toHaveBeenCalledTimes(1);

      // Os hashes gravados NÃO são os códigos em texto puro.
      const createCall = prisma.mfaRecoveryCode.createMany.mock.calls[0][0] as {
        data: { code_hash: string }[];
      };
      for (const { code_hash } of createCall.data) {
        expect(resultado.recovery_codes).not.toContain(code_hash);
        expect(code_hash.startsWith('$2')).toBe(true); // formato bcrypt
      }
    });

    it('REJEITA ativação com código TOTP inválido — não ativa o MFA', async () => {
      const secretRaw = generateSecret();
      const encrypted = encryptMfaSecret(config, secretRaw);
      prisma.usuario.findUnique.mockResolvedValueOnce(
        buildUsuario({ mfa_secret: encrypted, mfa_ativo: false }),
      );

      await expect(
        service.confirmarAtivacao('usuario-1', '000000'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.mfaRecoveryCode.createMany).not.toHaveBeenCalled();
    });

    it('rejeita confirmação sem enrollment pendente (sem mfa_secret)', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce(
        buildUsuario({ mfa_secret: null }),
      );
      await expect(
        service.confirmarAtivacao('usuario-1', '123456'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ── Verificação no login — os 10 cenários obrigatórios ────────

  describe('verificarCodigoLogin() — validação criptográfica real', () => {
    const secretRaw = generateSecret();
    let encrypted: string;

    beforeEach(() => {
      encrypted = encryptMfaSecret(config, secretRaw);
    });

    it('MFA ativo + código válido → sucesso (não lança)', async () => {
      const usuario = buildUsuario({ mfa_ativo: true, mfa_secret: encrypted });
      const codigo = await generate({ secret: secretRaw });
      await expect(
        service.verificarCodigoLogin(usuario, codigo),
      ).resolves.toBeUndefined();
    });

    it('MFA ativo + código ausente → falha', async () => {
      const usuario = buildUsuario({ mfa_ativo: true, mfa_secret: encrypted });
      await expect(
        service.verificarCodigoLogin(usuario, ''),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('MFA ativo + código inválido (não corresponde a nenhuma janela válida) → falha', async () => {
      const usuario = buildUsuario({ mfa_ativo: true, mfa_secret: encrypted });
      await expect(
        service.verificarCodigoLogin(usuario, '000000'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('MFA ativo + código expirado (gerado 1 hora atrás, fora da tolerância de ±30s) → falha', async () => {
      const usuario = buildUsuario({ mfa_ativo: true, mfa_secret: encrypted });
      const umaHoraAtras = Math.floor(Date.now() / 1000) - 3600;
      const codigoExpirado = await generate({
        secret: secretRaw,
        epoch: umaHoraAtras,
      });
      await expect(
        service.verificarCodigoLogin(usuario, codigoExpirado),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('NÃO existe bypass silencioso — um código arbitrário não-vazio que "parece" válido (6 dígitos quaisquer) é rejeitado sem correspondência criptográfica real', async () => {
      const usuario = buildUsuario({ mfa_ativo: true, mfa_secret: encrypted });
      // Testa várias strings de 6 dígitos — nenhuma deve ser aceita "só por existir".
      for (const tentativa of ['111111', '123456', '999999', '000001']) {
        await expect(
          service.verificarCodigoLogin(usuario, tentativa),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      }
    });

    it('código de recuperação válido → sucesso e é marcado como usado (uso único)', async () => {
      const usuario = buildUsuario({ mfa_ativo: true, mfa_secret: encrypted });
      const codigoRecovery = 'ABCDE-12345';
      const hash = await bcrypt.hash(codigoRecovery, 12);
      prisma.mfaRecoveryCode.findMany.mockResolvedValueOnce([
        { id: 'rc-1', code_hash: hash, usado: false },
      ]);

      await expect(
        service.verificarCodigoLogin(usuario, codigoRecovery),
      ).resolves.toBeUndefined();

      expect(prisma.mfaRecoveryCode.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rc-1', usado: false },
          data: expect.objectContaining({ usado: true }),
        }),
      );
    });

    it('código de recuperação reutilizado (já marcado usado, updateMany retorna count:0) → falha', async () => {
      const usuario = buildUsuario({ mfa_ativo: true, mfa_secret: encrypted });
      const codigoRecovery = 'ABCDE-12345';
      const hash = await bcrypt.hash(codigoRecovery, 12);
      // Simula corrida: findMany ainda o retorna como não-usado, mas o updateMany
      // condicional (where usado:false) falha porque outra requisição já o consumiu.
      prisma.mfaRecoveryCode.findMany.mockResolvedValueOnce([
        { id: 'rc-1', code_hash: hash, usado: false },
      ]);
      prisma.mfaRecoveryCode.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        service.verificarCodigoLogin(usuario, codigoRecovery),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('tentativas excessivas → bloqueio: após 5 falhas consecutivas, mesmo um código válido é recusado sem verificação até o bloqueio expirar', async () => {
      const usuario = buildUsuario({
        mfa_ativo: true,
        mfa_secret: encrypted,
        mfa_falhas_consecutivas: 5,
        mfa_bloqueado_ate: new Date(Date.now() + 15 * 60_000),
      });
      const codigoValido = await generate({ secret: secretRaw });
      await expect(
        service.verificarCodigoLogin(usuario, codigoValido),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('registra falha e incrementa o contador a cada tentativa inválida', async () => {
      const usuario = buildUsuario({
        mfa_ativo: true,
        mfa_secret: encrypted,
        mfa_falhas_consecutivas: 2,
      });
      await expect(
        service.verificarCodigoLogin(usuario, '000000'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { mfa_falhas_consecutivas: { increment: 1 } },
        }),
      );
    });

    it('bloqueia após atingir o limite de falhas consecutivas (5ª falha define mfa_bloqueado_ate)', async () => {
      const usuario = buildUsuario({ mfa_ativo: true, mfa_secret: encrypted });
      prisma.usuario.update.mockResolvedValueOnce({
        ...usuario,
        mfa_falhas_consecutivas: 5,
      });

      await expect(
        service.verificarCodigoLogin(usuario, '000000'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      const bloqueioCall = prisma.usuario.update.mock.calls.find(
        (c: unknown[]) =>
          (c[0] as { data?: { mfa_bloqueado_ate?: unknown } }).data
            ?.mfa_bloqueado_ate,
      );
      expect(bloqueioCall).toBeDefined();
    });

    it('MFA sem mfa_secret (estado inconsistente) — falha fechada, nunca permite login', async () => {
      const usuario = buildUsuario({ mfa_ativo: true, mfa_secret: null });
      await expect(
        service.verificarCodigoLogin(usuario, '123456'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ── Desativação (reautenticação) ─────────────────────────────

  describe('desativar()', () => {
    it('exige senha correta E código MFA válido — desativa somente após reautenticação completa', async () => {
      const senhaHash = await bcrypt.hash('senha-correta', 12);
      const secretRaw = generateSecret();
      const encrypted = encryptMfaSecret(config, secretRaw);
      prisma.usuario.findUnique.mockResolvedValueOnce(
        buildUsuario({
          mfa_ativo: true,
          mfa_secret: encrypted,
          senha_hash: senhaHash,
        }),
      );
      const codigo = await generate({ secret: secretRaw });

      await service.desativar('usuario-1', 'senha-correta', codigo);

      expect(prisma.mfaRecoveryCode.deleteMany).toHaveBeenCalledWith({
        where: { usuario_id: 'usuario-1' },
      });
    });

    it('rejeita desativação com senha incorreta, mesmo com código MFA válido', async () => {
      const senhaHash = await bcrypt.hash('senha-correta', 12);
      const secretRaw = generateSecret();
      const encrypted = encryptMfaSecret(config, secretRaw);
      prisma.usuario.findUnique.mockResolvedValueOnce(
        buildUsuario({
          mfa_ativo: true,
          mfa_secret: encrypted,
          senha_hash: senhaHash,
        }),
      );
      const codigo = await generate({ secret: secretRaw });

      await expect(
        service.desativar('usuario-1', 'senha-errada', codigo),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejeita desativação com código MFA inválido, mesmo com senha correta', async () => {
      const senhaHash = await bcrypt.hash('senha-correta', 12);
      const secretRaw = generateSecret();
      const encrypted = encryptMfaSecret(config, secretRaw);
      prisma.usuario.findUnique.mockResolvedValueOnce(
        buildUsuario({
          mfa_ativo: true,
          mfa_secret: encrypted,
          senha_hash: senhaHash,
        }),
      );

      await expect(
        service.desativar('usuario-1', 'senha-correta', '000000'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ── Nunca exposto ──────────────────────────────────────────────

  describe('proteção do segredo em repouso e em trânsito', () => {
    it('o valor gravado no banco NUNCA é igual ao segredo em texto puro', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce(buildUsuario());
      const resultado = await service.iniciarAtivacao('usuario-1');
      const updateCall = prisma.usuario.update.mock.calls[0][0] as {
        data: { mfa_secret: string };
      };
      expect(updateCall.data.mfa_secret).not.toContain(resultado.secret_base32);
    });

    it('confirmarAtivacao() nunca retorna o segredo TOTP na resposta — apenas os códigos de recuperação', async () => {
      const secretRaw = generateSecret();
      const encrypted = encryptMfaSecret(config, secretRaw);
      prisma.usuario.findUnique.mockResolvedValueOnce(
        buildUsuario({ mfa_secret: encrypted }),
      );
      const codigo = await generate({ secret: secretRaw });
      const resultado = await service.confirmarAtivacao('usuario-1', codigo);

      expect(JSON.stringify(resultado)).not.toContain(secretRaw);
      expect(Object.keys(resultado)).toEqual(['recovery_codes']);
    });
  });
});
