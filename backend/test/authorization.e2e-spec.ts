import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../src/auth/auth.module';
import { ConsultaModule } from '../src/modules/consulta/consulta.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CacheModule } from '../src/modules/cache/cache.module';
import { CacheService } from '../src/modules/cache/cache.service';

// ============================================================
// RM-Segurança — Auditoria de Autorização (e2e)
//
// Cobre, na camada HTTP real (guards + pipes + controllers reais), os 5
// cenários obrigatórios da auditoria:
//   a) usuário comum acessando recurso de outro usuário;
//   b) usuário tentando alterar/elevar seu próprio role;
//   c) usuário tentando criar recurso privilegiado;
//   d) ADMIN acessando apenas o que é permitido;
//   e) usuário não autenticado acessando endpoint protegido.
//
// PrismaService é totalmente mockado (jest.fn()) — nenhum banco real
// (local ou produção/Neon) é acessado por este teste.
// ============================================================

// JWT_SECRET/JWT_REFRESH_SECRET são definidos globalmente em test/setup-e2e.ts

describe('Autorização (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;

  const MEDICO_ID = 'medico-comum-id';
  const OUTRO_MEDICO_ID = 'outro-medico-id';
  const ADMIN_ID = 'admin-id';
  const CONSULTA_DO_OUTRO_MEDICO = 'consulta-outro-medico-id';

  const usuariosFakeDb: Record<
    string,
    { id: string; email: string; perfil: string; ativo: boolean }
  > = {
    [MEDICO_ID]: {
      id: MEDICO_ID,
      email: 'medico@x.com',
      perfil: 'MEDICO',
      ativo: true,
    },
    [OUTRO_MEDICO_ID]: {
      id: OUTRO_MEDICO_ID,
      email: 'outro@x.com',
      perfil: 'MEDICO',
      ativo: true,
    },
    [ADMIN_ID]: {
      id: ADMIN_ID,
      email: 'admin@x.com',
      perfil: 'ADMIN',
      ativo: true,
    },
  };

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
      create: jest.fn(({ data }: { data: { email: string; perfil: string } }) =>
        Promise.resolve({
          id: 'novo-usuario-id',
          email: data.email,
          perfil: data.perfil,
        }),
      ),
    },
    refreshToken: { create: jest.fn().mockResolvedValue({}) },
    auditoria: { create: jest.fn().mockResolvedValue({}) },
    consulta: {
      // Única consulta "existente" no banco fake pertence a OUTRO_MEDICO_ID.
      findFirst: jest.fn(
        ({ where }: { where: { id: string; usuario_id: string } }) => {
          if (
            where.id === CONSULTA_DO_OUTRO_MEDICO &&
            where.usuario_id === OUTRO_MEDICO_ID
          ) {
            return Promise.resolve({
              id: CONSULTA_DO_OUTRO_MEDICO,
              usuario_id: OUTRO_MEDICO_ID,
            });
          }
          return Promise.resolve(null);
        },
      ),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    riskScore: { create: jest.fn().mockResolvedValue({ id: 'risk-1' }) },
  };
  // RM-49 (RM41-017): atribuído FORA do literal (não como propriedade
  // dentro dele) — uma referência circular a `prismaMock` dentro do
  // próprio literal degrada a inferência de tipo do TypeScript para todo
  // o objeto (visto em `test/support/fake-prisma.ts`), o que dispara
  // `no-unsafe-*` do ESLint em acessos completamente não relacionados mais
  // abaixo neste arquivo. Atribuir depois evita o problema.
  (prismaMock as unknown as { $transaction: jest.Mock }).$transaction = jest.fn(
    (cb: (tx: unknown) => unknown) => cb(prismaMock),
  );

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        CacheModule,
        AuthModule,
        ConsultaModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(CacheService)
      .useValue({ key: jest.fn(), getOrSet: jest.fn() })
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

    jwt = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function tokenPara(userId: string): Promise<string> {
    const u = usuariosFakeDb[userId];
    return jwt.signAsync(
      { sub: u.id, email: u.email, perfil: u.perfil },
      { secret: process.env.JWT_SECRET, expiresIn: '15m' },
    );
  }

  // ── (e) usuário não autenticado acessando endpoint protegido ─────────

  describe('(e) Acesso sem autenticação', () => {
    it('GET /consulta/:id sem Authorization header retorna 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/consulta/${CONSULTA_DO_OUTRO_MEDICO}`)
        .expect(401);
    });

    it('POST /auth/admin/usuarios sem Authorization header retorna 401 (não 403 — nem chega a avaliar role)', async () => {
      await request(app.getHttpServer())
        .post('/auth/admin/usuarios')
        .send({ email: 'x@x.com', senha: 'senhaforte123', perfil: 'ADMIN' })
        .expect(401);
    });

    it('token JWT inválido/forjado com secret errado retorna 401', async () => {
      const tokenForjado = await jwt.signAsync(
        { sub: ADMIN_ID, email: 'admin@x.com', perfil: 'ADMIN' },
        { secret: 'secret-errado-nao-e-o-do-servidor', expiresIn: '15m' },
      );
      await request(app.getHttpServer())
        .get(`/api/consulta/${CONSULTA_DO_OUTRO_MEDICO}`)
        .set('Authorization', `Bearer ${tokenForjado}`)
        .expect(401);
    });

    // Auditoria de modo offline/demo: o frontend, em modo demo, gera um
    // token puramente local no formato `demo-<timestamp>` — nunca um JWT
    // real. Prova aqui que, mesmo que esse valor chegue de alguma forma ao
    // backend (bug de frontend, extensão de navegador, requisição manual),
    // o JwtAuthGuard o rejeita como qualquer string que não seja um JWT
    // válido — nunca autentica.
    it('token estilo "demo-<timestamp>" (formato usado pelo modo demo do frontend) NUNCA é aceito pelo backend — 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/consulta/${CONSULTA_DO_OUTRO_MEDICO}`)
        .set('Authorization', `Bearer demo-${Date.now()}`)
        .expect(401);
    });

    it('token vazio/malformado (nem 3 segmentos JWT) retorna 401, não 500', async () => {
      await request(app.getHttpServer())
        .get(`/api/consulta/${CONSULTA_DO_OUTRO_MEDICO}`)
        .set('Authorization', 'Bearer nao-e-um-jwt-de-verdade')
        .expect(401);
    });
  });

  // ── (a) usuário comum acessando recurso de outro usuário ─────────────

  describe('(a) Acesso horizontal indevido', () => {
    it('MEDICO autenticado NÃO consegue ler a consulta de outro médico apenas por conhecer o id (404 — não vaza existência)', async () => {
      const token = await tokenPara(MEDICO_ID);
      await request(app.getHttpServer())
        .get(`/api/consulta/${CONSULTA_DO_OUTRO_MEDICO}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('MEDICO dono da consulta consegue lê-la normalmente', async () => {
      const token = await tokenPara(OUTRO_MEDICO_ID);
      await request(app.getHttpServer())
        .get(`/api/consulta/${CONSULTA_DO_OUTRO_MEDICO}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('MEDICO autenticado NÃO consegue gravar risk score na consulta de outro médico (IDOR corrigido — 403)', async () => {
      const token = await tokenPara(MEDICO_ID);
      await request(app.getHttpServer())
        .post('/api/risco')
        .set('Authorization', `Bearer ${token}`)
        .send({
          consulta_id: CONSULTA_DO_OUTRO_MEDICO,
          score: { risco_global: 'alto', score_global: 90 },
        })
        .expect(403);
    });
  });

  // ── (b) usuário tentando alterar/elevar seu próprio role ─────────────

  describe('(b) Tentativa de auto-elevação de privilégio no cadastro', () => {
    it('POST /auth/register com perfil=ADMIN no payload é REJEITADO com 400 (campo não whitelisted)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'atacante@x.com',
          senha: 'senhaforte123',
          perfil: 'ADMIN',
        })
        .expect(400);
      expect(JSON.stringify(res.body)).toMatch(/perfil/i);
    });

    it('POST /auth/register sem perfil no payload cria usuário com sucesso, sempre como MEDICO', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'legitimo@x.com', senha: 'senhaforte123' })
        .expect(201);
      const created = prismaMock.usuario.create.mock.calls.at(-1)![0];
      expect(created.data.perfil).toBe('MEDICO');
    });

    it('POST /auth/register com role=ADMIN (nome alternativo de campo) também é REJEITADO com 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'atacante2@x.com',
          senha: 'senhaforte123',
          role: 'ADMIN',
        })
        .expect(400);
    });
  });

  // ── (c) usuário tentando criar recurso privilegiado ──────────────────

  describe('(c) Criação de recurso privilegiado por usuário sem permissão', () => {
    it('MEDICO autenticado recebe 403 ao tentar criar um usuário ADMIN via fluxo administrativo', async () => {
      const token = await tokenPara(MEDICO_ID);
      await request(app.getHttpServer())
        .post('/auth/admin/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'novo-admin@x.com',
          senha: 'senhaforte123',
          perfil: 'ADMIN',
        })
        .expect(403);
    });

    it('MEDICO autenticado recebe 403 mesmo tentando criar outro perfil não-ADMIN (AUDITOR/HOSPITAL/LABORATORIO) via fluxo administrativo', async () => {
      const token = await tokenPara(MEDICO_ID);
      await request(app.getHttpServer())
        .post('/auth/admin/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'novo-auditor@x.com',
          senha: 'senhaforte123',
          perfil: 'AUDITOR',
        })
        .expect(403);
    });
  });

  // ── (d) ADMIN acessando apenas o que é permitido ─────────────────────

  describe('(d) ADMIN — acesso privilegiado correto, mas não irrestrito', () => {
    it('ADMIN autenticado CONSEGUE criar um usuário privilegiado via fluxo administrativo (201)', async () => {
      const token = await tokenPara(ADMIN_ID);
      await request(app.getHttpServer())
        .post('/auth/admin/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'novo-hospital@x.com',
          senha: 'senhaforte123',
          perfil: 'HOSPITAL',
        })
        .expect(201);
    });

    it('ADMIN autenticado AINDA ASSIM não consegue ler a consulta de um médico que não é seu (RolesGuard não é bypass geral — ownership continua valendo)', async () => {
      const token = await tokenPara(ADMIN_ID);
      await request(app.getHttpServer())
        .get(`/api/consulta/${CONSULTA_DO_OUTRO_MEDICO}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('ADMIN autenticado recebe 400 ao enviar perfil inválido/inexistente no fluxo administrativo', async () => {
      const token = await tokenPara(ADMIN_ID);
      await request(app.getHttpServer())
        .post('/auth/admin/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'perfil-invalido@x.com',
          senha: 'senhaforte123',
          perfil: 'SUPERADMIN',
        })
        .expect(400);
    });
  });
});
