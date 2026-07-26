/* eslint-disable @typescript-eslint/no-unsafe-member-access -- supertest `res.body` é `any` por padrão; os asserts abaixo checam os campos reais da resposta HTTP. */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { authenticator } from 'otplib';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../src/auth/auth.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { encryptMfaSecret } from '../src/auth/mfa-crypto.util';

// ============================================================
// MFA (TOTP, RFC 6238) — e2e
//
// Cobre, na camada HTTP real (guards + pipes + AuthController/MfaController
// reais), os cenários obrigatórios:
//   - MFA desativado + login válido → sucesso
//   - MFA ativo + código ausente → falha
//   - MFA ativo + código inválido → falha
//   - MFA ativo + código válido → sucesso
//   - segredo MFA nunca exposto em resposta de API
//
// PrismaService é totalmente mockado — nenhum banco real é acessado.
// ============================================================

describe('MFA (e2e)', () => {
  let app: INestApplication<App>;
  let config: ConfigService;

  const SENHA_PLANA = 'senhaSuperForte123';
  const SEM_MFA_ID = 'usuario-sem-mfa';
  const COM_MFA_ID = 'usuario-com-mfa';
  const secretRaw = authenticator.generateSecret();

  const usuariosFakeDb: Record<string, Record<string, unknown>> = {};

  const prismaMock = {
    usuario: {
      findUnique: jest.fn(
        ({
          where: { id, email },
        }: {
          where: { id?: string; email?: string };
        }) => {
          if (id) return Promise.resolve(usuariosFakeDb[id] ?? null);
          if (email)
            return Promise.resolve(
              Object.values(usuariosFakeDb).find((u) => u.email === email) ??
                null,
            );
          return Promise.resolve(null);
        },
      ),
      update: jest.fn(
        ({
          where: { id },
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          usuariosFakeDb[id] = { ...usuariosFakeDb[id], ...data };
          return Promise.resolve(usuariosFakeDb[id]);
        },
      ),
    },
    refreshToken: { create: jest.fn().mockResolvedValue({}) },
    auditoria: { create: jest.fn().mockResolvedValue({}) },
    mfaRecoveryCode: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn().mockResolvedValue({ count: 10 }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    config = moduleFixture.get(ConfigService);

    const senhaHash = await bcrypt.hash(SENHA_PLANA, 12);
    usuariosFakeDb[SEM_MFA_ID] = {
      id: SEM_MFA_ID,
      email: 'sem-mfa@x.com',
      senha_hash: senhaHash,
      perfil: 'MEDICO',
      ativo: true,
      mfa_ativo: false,
      mfa_secret: null,
      mfa_falhas_consecutivas: 0,
      mfa_bloqueado_ate: null,
    };
    usuariosFakeDb[COM_MFA_ID] = {
      id: COM_MFA_ID,
      email: 'com-mfa@x.com',
      senha_hash: senhaHash,
      perfil: 'MEDICO',
      ativo: true,
      mfa_ativo: true,
      mfa_secret: encryptMfaSecret(config, secretRaw),
      mfa_falhas_consecutivas: 0,
      mfa_bloqueado_ate: null,
    };
  });

  afterAll(async () => {
    await app.close();
  });

  it('MFA desativado + login válido → sucesso (200, com tokens)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'sem-mfa@x.com', senha: SENHA_PLANA })
      .expect(200);
    expect(res.body.access_token).toBeTruthy();
  });

  it('MFA ativo + código ausente → falha (401)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'com-mfa@x.com', senha: SENHA_PLANA })
      .expect(401);
  });

  it('MFA ativo + código inválido → falha (401)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'com-mfa@x.com', senha: SENHA_PLANA, mfa_code: '000000' })
      .expect(401);
  });

  it('MFA ativo + código válido → sucesso (200, com tokens)', async () => {
    const codigo = authenticator.generate(secretRaw);
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'com-mfa@x.com', senha: SENHA_PLANA, mfa_code: codigo })
      .expect(200);
    expect(res.body.access_token).toBeTruthy();
  });

  it('senha correta mas MFA ausente NÃO retorna tokens — nenhum bypass silencioso', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'com-mfa@x.com', senha: SENHA_PLANA })
      .expect(401);
    expect(res.body.access_token).toBeUndefined();
  });

  it('segredo MFA nunca é exposto na resposta de login (sucesso ou falha)', async () => {
    const codigo = authenticator.generate(secretRaw);
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'com-mfa@x.com', senha: SENHA_PLANA, mfa_code: codigo })
      .expect(200);
    const corpo = JSON.stringify(res.body);
    expect(corpo).not.toContain(secretRaw);
    expect(corpo).not.toContain('mfa_secret');
  });

  it('POST /auth/mfa/setup sem autenticação retorna 401', async () => {
    await request(app.getHttpServer()).post('/auth/mfa/setup').expect(401);
  });

  it('POST /auth/mfa/setup autenticado retorna otpauth_url e secret_base32, nunca o valor criptografado armazenado', async () => {
    const jwt = app.get(JwtService);
    const token = await jwt.signAsync(
      { sub: SEM_MFA_ID, email: 'sem-mfa@x.com', perfil: 'MEDICO' },
      { secret: process.env.JWT_SECRET, expiresIn: '15m' },
    );
    const res = await request(app.getHttpServer())
      .post('/auth/mfa/setup')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(res.body.otpauth_url).toMatch(/^otpauth:\/\/totp\//);
    expect(res.body.secret_base32).toMatch(/^[A-Z2-7]+$/);
    // O valor persistido (criptografado) nunca deve aparecer na resposta.
    expect(JSON.stringify(res.body)).not.toContain(
      usuariosFakeDb[SEM_MFA_ID].mfa_secret as string,
    );
  });

  // ============================================================
  // Regressão MFA-01 (auditoria de segurança final): o código de
  // recuperação REAL emitido pelo servidor tem o formato "XXXXX-XXXXX"
  // (com traço — ver MfaService.gerarCodigosRecuperacaoTexto()), mas o
  // DTO de entrada (login.dto.ts / mfa.dto.ts) exigia 10 caracteres hex
  // SEM traço, rejeitando com 400 qualquer tentativa de login com o
  // código exatamente como o usuário o recebeu. Estes testes passam pela
  // camada HTTP real (ValidationPipe + DTO), não chamam MfaService
  // diretamente — é exatamente essa camada que estava quebrada.
  // ============================================================
  describe('Login com código de recuperação (via HTTP real — regressão MFA-01)', () => {
    const recoveryCodeRaw = 'ABCDE-12345';

    it('código de recuperação no formato XXXXX-XXXXX emitido pelo servidor é ACEITO pela validação de entrada e autentica com sucesso', async () => {
      const recoveryCodeHash = await bcrypt.hash(recoveryCodeRaw, 10);
      prismaMock.mfaRecoveryCode.findMany.mockResolvedValueOnce([
        {
          id: 'rec-1',
          usuario_id: COM_MFA_ID,
          code_hash: recoveryCodeHash,
          usado: false,
        },
      ]);
      prismaMock.mfaRecoveryCode.updateMany.mockResolvedValueOnce({ count: 1 });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'com-mfa@x.com',
          senha: SENHA_PLANA,
          mfa_code: recoveryCodeRaw,
        })
        .expect(200);
      expect(res.body.access_token).toBeTruthy();
    });

    it('código de recuperação SEM o traço (formato antigo e quebrado) é rejeitado na validação de entrada (400) — nunca confundir com o formato real', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'com-mfa@x.com',
          senha: SENHA_PLANA,
          mfa_code: recoveryCodeRaw.replace('-', ''),
        })
        .expect(400);
    });
  });
});
