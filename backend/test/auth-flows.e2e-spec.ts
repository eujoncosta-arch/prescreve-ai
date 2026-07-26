import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../src/auth/auth.module';
import { ConsultaModule } from '../src/modules/consulta/consulta.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CacheModule } from '../src/modules/cache/cache.module';
import { CacheService } from '../src/modules/cache/cache.service';

// ============================================================
// Suíte de regressão de segurança — ciclo de vida de autenticação (e2e)
//
// Cobre, contra a pilha HTTP real (guards + pipes + services reais), o
// ciclo COMPLETO de um refresh token — algo que só existia como teste
// unitário (Prisma mockado, service chamado direto) até esta suíte:
// login real → refresh real (rotação) → reuso do token antigo (revogado)
// → expiração → logout revogando a sessão. Também cobre rate limiting
// real em MFA/refresh/endpoints gerais (fora do escopo de
// hardening.e2e-spec.ts, que só prova login).
// ============================================================

describe('Ciclo de vida de autenticação (e2e)', () => {
  let app: INestApplication<App>;

  const MEDICO_ID = 'medico-authflow-id';
  const SENHA_PLANA = 'senhaCorreta123';
  let senhaHash: string;

  let refreshTokensDb: Map<
    string,
    {
      id: string;
      usuario_id: string;
      revogado: boolean;
      expira_em: Date;
      token_hash: string;
    }
  >;
  let rtIdCounter: number;

  const usuarioMedico = () => ({
    id: MEDICO_ID,
    email: 'authflow@x.com',
    perfil: 'MEDICO',
    ativo: true,
    senha_hash: senhaHash,
    mfa_ativo: false,
  });

  function buildPrismaMock() {
    return {
      usuario: {
        findUnique: jest.fn(
          ({ where }: { where: { id?: string; email?: string } }) => {
            if (where.id === MEDICO_ID || where.email === 'authflow@x.com') {
              return Promise.resolve(usuarioMedico());
            }
            return Promise.resolve(null);
          },
        ),
        update: jest.fn().mockResolvedValue(usuarioMedico()),
      },
      refreshToken: {
        create: jest.fn(
          ({
            data,
          }: {
            data: { token_hash: string; usuario_id: string; expira_em: Date };
          }) => {
            rtIdCounter++;
            const rt = {
              id: `rt-${rtIdCounter}`,
              usuario_id: data.usuario_id,
              revogado: false,
              expira_em: data.expira_em,
              token_hash: data.token_hash,
            };
            refreshTokensDb.set(data.token_hash, rt);
            return Promise.resolve(rt);
          },
        ),
        findUnique: jest.fn(({ where }: { where: { token_hash: string } }) => {
          const rt = refreshTokensDb.get(where.token_hash);
          if (!rt) return Promise.resolve(null);
          return Promise.resolve({ ...rt, usuario: usuarioMedico() });
        }),
        update: jest.fn(
          ({
            where,
            data,
          }: {
            where: { id: string };
            data: { revogado: boolean };
          }) => {
            for (const rt of refreshTokensDb.values()) {
              if (rt.id === where.id) rt.revogado = data.revogado;
            }
            return Promise.resolve({});
          },
        ),
        updateMany: jest.fn(
          ({
            where,
            data,
          }: {
            where: { usuario_id: string; revogado: boolean };
            data: { revogado: boolean };
          }) => {
            let count = 0;
            for (const rt of refreshTokensDb.values()) {
              if (
                rt.usuario_id === where.usuario_id &&
                rt.revogado === where.revogado
              ) {
                rt.revogado = data.revogado;
                count++;
              }
            }
            return Promise.resolve({ count });
          },
        ),
      },
      auditoria: { create: jest.fn().mockResolvedValue({}) },
      consulta: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
  }

  beforeAll(async () => {
    senhaHash = await bcrypt.hash(SENHA_PLANA, 12);
  });

  beforeEach(() => {
    refreshTokensDb = new Map();
    rtIdCounter = 0;
  });

  async function buildApp(
    prismaMock: ReturnType<typeof buildPrismaMock>,
    throttleLimit = 60,
  ): Promise<INestApplication<App>> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: throttleLimit }]),
        PrismaModule,
        CacheModule,
        AuthModule,
        ConsultaModule,
      ],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(CacheService)
      .useValue({ key: jest.fn(), getOrSet: jest.fn() })
      .compile();

    const application = moduleFixture.createNestApplication();
    application.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await application.init();
    return application;
  }

  afterEach(async () => {
    if (app) await app.close();
  });

  // ── Login válido / inválido ────────────────────────────────────────

  describe('Login', () => {
    it('credenciais válidas → 200 com access_token e refresh_token reais', async () => {
      app = await buildApp(buildPrismaMock());
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'authflow@x.com', senha: SENHA_PLANA })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
      expect((res.body as { perfil: string }).perfil).toBe('MEDICO');
    });

    it('senha incorreta → 401, nenhum token emitido', async () => {
      app = await buildApp(buildPrismaMock());
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'authflow@x.com', senha: 'senha-totalmente-errada' })
        .expect(401);

      expect(res.body).not.toHaveProperty('access_token');
    });
  });

  // ── Refresh: ciclo completo real ────────────────────────────────────

  describe('Refresh token — ciclo completo (rotação, reuso, expiração)', () => {
    it('refresh válido → 200 com NOVO par de tokens; o token antigo passa a ser inválido (rotação real)', async () => {
      app = await buildApp(buildPrismaMock());
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'authflow@x.com', senha: SENHA_PLANA })
        .expect(200);
      const refreshTokenOriginal = (login.body as { refresh_token: string })
        .refresh_token;

      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: refreshTokenOriginal })
        .expect(200);

      const novoRefreshToken = (refreshRes.body as { refresh_token: string })
        .refresh_token;
      expect(novoRefreshToken).toBeTruthy();
      expect(novoRefreshToken).not.toBe(refreshTokenOriginal); // rotação real — não é o mesmo token
    });

    it('REUSO de um refresh token já rotacionado (apresentado 2x) → 401 na segunda vez — sinal de comprometimento', async () => {
      app = await buildApp(buildPrismaMock());
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'authflow@x.com', senha: SENHA_PLANA })
        .expect(200);
      const refreshTokenOriginal = (login.body as { refresh_token: string })
        .refresh_token;

      // 1ª apresentação: sucesso, rotaciona (revoga o antigo).
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: refreshTokenOriginal })
        .expect(200);

      // 2ª apresentação do MESMO token (já revogado pela rotação): rejeitado.
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: refreshTokenOriginal })
        .expect(401);
    });

    it('refresh token EXPIRADO → 401, mesmo sem ter sido usado ainda', async () => {
      app = await buildApp(buildPrismaMock());
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'authflow@x.com', senha: SENHA_PLANA })
        .expect(200);
      const refreshTokenOriginal = (login.body as { refresh_token: string })
        .refresh_token;

      // Simula a passagem do tempo: expira o registro real que o backend
      // criou para este token (mesmo mecanismo de persistência do service).
      const hash = crypto
        .createHash('sha256')
        .update(refreshTokenOriginal)
        .digest('hex');
      const registro = refreshTokensDb.get(hash);
      expect(registro).toBeDefined();
      registro!.expira_em = new Date(Date.now() - 1000);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: refreshTokenOriginal })
        .expect(401);
    });

    it('refresh com token que nunca existiu → 401 (não 500)', async () => {
      app = await buildApp(buildPrismaMock());
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: 'token-forjado-nunca-emitido-pelo-servidor' })
        .expect(401);
    });
  });

  // ── Logout ───────────────────────────────────────────────────────────

  describe('Logout', () => {
    it('logout revoga a sessão — o refresh_token emitido no login deixa de funcionar depois', async () => {
      app = await buildApp(buildPrismaMock());
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'authflow@x.com', senha: SENHA_PLANA })
        .expect(200);
      const { access_token, refresh_token } = login.body as {
        access_token: string;
        refresh_token: string;
      };

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      // O refresh token da sessão encerrada não pode mais ser usado.
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token })
        .expect(401);
    });

    it('logout sem autenticação → 401', async () => {
      app = await buildApp(buildPrismaMock());
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });
  });

  // ── Rate limiting — MFA, refresh, endpoints gerais ─────────────────

  describe('Rate limiting real — MFA, refresh e endpoints gerais', () => {
    it('POST /auth/mfa/setup tem limite próprio de 5/min — a 6ª requisição no mesmo minuto recebe 429', async () => {
      app = await buildApp(buildPrismaMock());
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'authflow@x.com', senha: SENHA_PLANA })
        .expect(200);
      const { access_token } = login.body as { access_token: string };

      const statuses: number[] = [];
      for (let i = 0; i < 6; i++) {
        const res = await request(app.getHttpServer())
          .post('/auth/mfa/setup')
          .set('Authorization', `Bearer ${access_token}`);
        statuses.push(res.status);
      }

      expect(statuses).toContain(429);
      expect(statuses.slice(0, 5).every((s) => s !== 429)).toBe(true);
    });

    it('POST /auth/refresh tem limite próprio de 10/min — a 11ª requisição no mesmo minuto recebe 429 (mesmo com tokens inválidos — o limite conta antes da lógica de negócio)', async () => {
      app = await buildApp(buildPrismaMock());

      const statuses: number[] = [];
      for (let i = 0; i < 11; i++) {
        const res = await request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refresh_token: `token-invalido-${i}` });
        statuses.push(res.status);
      }

      expect(statuses).toContain(429);
      expect(statuses.slice(0, 10).every((s) => s !== 429)).toBe(true);
    });

    it('endpoints SEM @Throttle específico herdam o limite GLOBAL — a (limite+1)-ésima requisição recebe 429', async () => {
      // Módulo dedicado com limite global BAIXO (5/min) para um teste
      // rápido — prova que o ThrottlerGuard global protege qualquer rota
      // que não tenha um limite próprio, não só as rotas de auth.
      app = await buildApp(buildPrismaMock(), 5);
      const login = await request(app.getHttpServer())
        .post('/auth/login') // login já consumiu 1 do limite global? NÃO — login tem @Throttle próprio (10/min), não usa o contador global.
        .send({ email: 'authflow@x.com', senha: SENHA_PLANA })
        .expect(200);
      const { access_token } = login.body as { access_token: string };

      const statuses: number[] = [];
      for (let i = 0; i < 6; i++) {
        const res = await request(app.getHttpServer())
          .get('/api/consultas') // sem @Throttle próprio — herda o limite global
          .set('Authorization', `Bearer ${access_token}`);
        statuses.push(res.status);
      }

      expect(statuses).toContain(429);
    });
  });
});
