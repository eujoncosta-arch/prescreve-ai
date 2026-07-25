import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../src/auth/auth.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { buildCorsOriginHandler } from '../src/config/cors.util';

// ============================================================
// Hardening de infraestrutura — e2e
//
// Prova, na camada HTTP real (não mockada no nível do comportamento sob
// teste), que os controles realmente bloqueiam:
//   - startup sem JWT_SECRET falha;
//   - origem CORS não autorizada é bloqueada / autorizada funciona;
//   - excesso de requisições é bloqueado (429 real, ThrottlerGuard real).
//
// PrismaService é mockado (nenhum banco real é acessado); ThrottlerGuard e
// o handler de CORS são os módulos REAIS do projeto.
// ============================================================

describe('Hardening de infraestrutura (e2e)', () => {
  describe('Startup falha sem JWT_SECRET', () => {
    const originalJwtSecret = process.env.JWT_SECRET;

    afterEach(() => {
      process.env.JWT_SECRET = originalJwtSecret;
    });

    it('Test.createTestingModule(...).compile() REJEITA quando JWT_SECRET está ausente — a aplicação nunca chega a subir', async () => {
      delete process.env.JWT_SECRET;

      const prismaMock = { usuario: { findUnique: jest.fn() } };

      await expect(
        Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({ isGlobal: true }),
            PrismaModule,
            AuthModule,
          ],
        })
          .overrideProvider(PrismaService)
          .useValue(prismaMock)
          .compile(),
      ).rejects.toThrow(/JWT_SECRET/);
    });
  });

  describe('CORS — allowlist explícita real (HTTP)', () => {
    let app: INestApplication<App>;
    const ORIGEM_AUTORIZADA = 'https://frontend-eujoncosta.vercel.app';
    const ORIGEM_NAO_AUTORIZADA = 'https://atacante-qualquer.vercel.app';

    beforeAll(async () => {
      const prismaMock = {
        usuario: { findUnique: jest.fn().mockResolvedValue(null) },
        refreshToken: { create: jest.fn() },
        auditoria: { create: jest.fn().mockResolvedValue({}) },
      };

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
      app.enableCors({
        origin: buildCorsOriginHandler([
          ORIGEM_AUTORIZADA,
          'http://localhost:3001',
        ]),
        credentials: true,
      });
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('origem AUTORIZADA recebe o header Access-Control-Allow-Origin correspondente', async () => {
      const res = await request(app.getHttpServer())
        .options('/auth/register')
        .set('Origin', ORIGEM_AUTORIZADA)
        .set('Access-Control-Request-Method', 'POST');
      expect(res.headers['access-control-allow-origin']).toBe(
        ORIGEM_AUTORIZADA,
      );
    });

    it('origem NÃO AUTORIZADA (ex.: outro subdomínio *.vercel.app, não coberto pela allowlist) NÃO recebe o header — bloqueada pelo navegador', async () => {
      const res = await request(app.getHttpServer())
        .options('/auth/register')
        .set('Origin', ORIGEM_NAO_AUTORIZADA)
        .set('Access-Control-Request-Method', 'POST');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Rate limiting — bloqueio real (ThrottlerGuard aplicado de fato)', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      const senhaHash = await bcrypt.hash('senhaqualquer123', 12);
      const prismaMock = {
        usuario: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'medico@x.com',
            senha_hash: senhaHash,
            perfil: 'MEDICO',
            ativo: true,
            mfa_ativo: false,
          }),
        },
        refreshToken: { create: jest.fn().mockResolvedValue({}) },
        auditoria: { create: jest.fn().mockResolvedValue({}) },
      };

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
          PrismaModule,
          AuthModule,
        ],
        providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
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
    });

    afterAll(async () => {
      await app.close();
    });

    it('POST /auth/login tem limite próprio de 10/min — a 11ª requisição no mesmo minuto recebe 429', async () => {
      const payload = {
        email: 'medico@x.com',
        senha: 'senha-errada-de-proposito',
      };
      const statuses: number[] = [];

      for (let i = 0; i < 12; i++) {
        const res = await request(app.getHttpServer())
          .post('/auth/login')
          .send(payload);
        statuses.push(res.status);
      }

      expect(statuses).toContain(429);
      // As primeiras 10 tentativas não devem ser 429 (o limite é 10) — elas
      // falham por credenciais inválidas (401), não por rate limit.
      expect(statuses.slice(0, 10).every((s) => s !== 429)).toBe(true);
    });
  });
});
