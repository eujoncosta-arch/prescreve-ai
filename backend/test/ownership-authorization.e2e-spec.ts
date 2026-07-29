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
// Auditoria de ownership por recurso clínico (e2e)
//
// Cobre, na camada HTTP real (guards + pipes + controllers reais, Prisma
// mockado), os cenários exigidos:
//   - usuário A não pode ler/alterar a consulta de B;
//   - usuário A não pode adicionar RiskScore/diagnóstico/prescrição à
//     consulta de B;
//   - ADMIN tem privilégio de ROLE, mas RolesGuard não é bypass de
//     ownership — continua sem acesso a recursos clínicos de terceiros;
//   - recurso inexistente responde de forma indistinguível de "pertence a
//     outro usuário" (mesmo código de status, sem vazar existência).
//
// PrismaService é totalmente mockado — nenhum banco real é acessado.
// ============================================================

describe('Ownership de recursos clínicos (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;

  const MEDICO_A_ID = 'medico-a-id';
  const MEDICO_B_ID = 'medico-b-id';
  const ADMIN_ID = 'admin-ownership-id';
  const CONSULTA_A_ID = 'consulta-de-a-id';
  const CONSULTA_B_ID = 'consulta-de-b-id';
  const CONSULTA_INEXISTENTE_ID = 'consulta-que-nunca-existiu-id';

  const usuariosFakeDb: Record<
    string,
    { id: string; email: string; perfil: string; ativo: boolean }
  > = {
    [MEDICO_A_ID]: {
      id: MEDICO_A_ID,
      email: 'medico-a@x.com',
      perfil: 'MEDICO',
      ativo: true,
    },
    [MEDICO_B_ID]: {
      id: MEDICO_B_ID,
      email: 'medico-b@x.com',
      perfil: 'MEDICO',
      ativo: true,
    },
    [ADMIN_ID]: {
      id: ADMIN_ID,
      email: 'admin-ownership@x.com',
      perfil: 'ADMIN',
      ativo: true,
    },
  };

  // "Banco" fake: cada consulta pertence a exatamente um usuário.
  const consultasFakeDb: Record<string, { id: string; usuario_id: string }> = {
    [CONSULTA_A_ID]: { id: CONSULTA_A_ID, usuario_id: MEDICO_A_ID },
    [CONSULTA_B_ID]: { id: CONSULTA_B_ID, usuario_id: MEDICO_B_ID },
  };

  const prismaMock = {
    usuario: {
      findUnique: jest.fn(({ where: { id } }: { where: { id?: string } }) =>
        Promise.resolve(id ? (usuariosFakeDb[id] ?? null) : null),
      ),
    },
    consulta: {
      // Espelha o comportamento real do service: findFirst SEMPRE filtra
      // por { id, usuario_id } — nunca confia apenas no id.
      findFirst: jest.fn(
        ({ where }: { where: { id: string; usuario_id: string } }) => {
          const c = consultasFakeDb[where.id];
          if (c && c.usuario_id === where.usuario_id) return Promise.resolve(c);
          return Promise.resolve(null);
        },
      ),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    diagnostico: {
      create: jest.fn().mockResolvedValue({ id: 'diag-1' }),
      // Espelha o comportamento real: um diagnostico_id só é aceito se
      // pertencer à MESMA consulta informada no payload (ownership por FK).
      findFirst: jest.fn(
        ({ where }: { where: { id: string; consulta_id: string } }) => {
          if (
            where.id === 'diag-da-consulta-a' &&
            where.consulta_id === CONSULTA_A_ID
          ) {
            return Promise.resolve({
              id: 'diag-da-consulta-a',
              consulta_id: CONSULTA_A_ID,
            });
          }
          return Promise.resolve(null);
        },
      ),
    },
    prescricao: { create: jest.fn().mockResolvedValue({ id: 'presc-1' }) },
    riskScore: { create: jest.fn().mockResolvedValue({ id: 'risk-1' }) },
    auditoria: { create: jest.fn().mockResolvedValue({}) },
  };
  // RM-49 (RM41-017): ver comentário em authorization.e2e-spec.ts.
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

  // ── Leitura: GET /consulta/:id ────────────────────────────────────

  describe('GET /api/consulta/:id — leitura', () => {
    it('B (dono) lê a própria consulta normalmente (200)', async () => {
      const token = await tokenPara(MEDICO_B_ID);
      await request(app.getHttpServer())
        .get(`/api/consulta/${CONSULTA_B_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('A NÃO consegue ler a consulta de B só por conhecer o id (404)', async () => {
      const token = await tokenPara(MEDICO_A_ID);
      await request(app.getHttpServer())
        .get(`/api/consulta/${CONSULTA_B_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('recurso inexistente responde com o MESMO status (404) e mesmo formato que "pertence a outro usuário" — não vaza se o id existe', async () => {
      const token = await tokenPara(MEDICO_A_ID);
      const respostaAlheia = await request(app.getHttpServer())
        .get(`/api/consulta/${CONSULTA_B_ID}`)
        .set('Authorization', `Bearer ${token}`);
      const respostaInexistente = await request(app.getHttpServer())
        .get(`/api/consulta/${CONSULTA_INEXISTENTE_ID}`)
        .set('Authorization', `Bearer ${token}`);

      expect(respostaInexistente.status).toBe(404);
      expect(respostaInexistente.status).toBe(respostaAlheia.status);
      const chavesInexistente = Object.keys(
        respostaInexistente.body as object,
      ).sort();
      const chavesAlheia = Object.keys(respostaAlheia.body as object).sort();
      expect(chavesInexistente).toEqual(chavesAlheia);
    });

    it('ADMIN também NÃO lê a consulta de um médico só por ter perfil privilegiado (404 — RolesGuard não é bypass de ownership)', async () => {
      const token = await tokenPara(ADMIN_ID);
      await request(app.getHttpServer())
        .get(`/api/consulta/${CONSULTA_B_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  // ── Escrita: POST /diagnostico ────────────────────────────────────

  describe('POST /api/diagnostico — escrita vinculada a consulta de terceiro', () => {
    it('A cria diagnóstico na PRÓPRIA consulta normalmente (201)', async () => {
      const token = await tokenPara(MEDICO_A_ID);
      await request(app.getHttpServer())
        .post('/api/diagnostico')
        .set('Authorization', `Bearer ${token}`)
        .send({ consulta_id: CONSULTA_A_ID, cid: 'I10', descricao: 'HAS' })
        .expect(201);
    });

    it('A NÃO consegue criar diagnóstico na consulta de B (403)', async () => {
      const token = await tokenPara(MEDICO_A_ID);
      await request(app.getHttpServer())
        .post('/api/diagnostico')
        .set('Authorization', `Bearer ${token}`)
        .send({ consulta_id: CONSULTA_B_ID, cid: 'I10', descricao: 'HAS' })
        .expect(403);
    });

    it('ADMIN também NÃO consegue criar diagnóstico na consulta de um médico (403)', async () => {
      const token = await tokenPara(ADMIN_ID);
      await request(app.getHttpServer())
        .post('/api/diagnostico')
        .set('Authorization', `Bearer ${token}`)
        .send({ consulta_id: CONSULTA_B_ID, cid: 'I10', descricao: 'HAS' })
        .expect(403);
    });
  });

  // ── Escrita: POST /prescricao ─────────────────────────────────────

  describe('POST /api/prescricao — escrita vinculada a consulta de terceiro', () => {
    const medicamentos = [
      {
        molecula: 'Losartana',
        dose: { valor: 50, unidade: 'mg', frequencia: '1x/dia', via: 'VO' },
        duracao: '30d',
      },
    ];

    it('A cria prescrição na PRÓPRIA consulta normalmente (201)', async () => {
      const token = await tokenPara(MEDICO_A_ID);
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${token}`)
        .send({ consulta_id: CONSULTA_A_ID, medicamentos })
        .expect(201);
    });

    it('A NÃO consegue criar prescrição na consulta de B (403)', async () => {
      const token = await tokenPara(MEDICO_A_ID);
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${token}`)
        .send({ consulta_id: CONSULTA_B_ID, medicamentos })
        .expect(403);
    });

    it('A NÃO consegue vincular à própria prescrição um diagnostico_id de OUTRA consulta (403 — regressão OWN-01)', async () => {
      const token = await tokenPara(MEDICO_A_ID);
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${token}`)
        .send({
          consulta_id: CONSULTA_A_ID,
          diagnostico_id: 'diag-que-nao-pertence-a-consulta-a',
          medicamentos,
        })
        .expect(403);
    });

    it('A CONSEGUE vincular um diagnostico_id que realmente pertence à consulta informada (201)', async () => {
      const token = await tokenPara(MEDICO_A_ID);
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${token}`)
        .send({
          consulta_id: CONSULTA_A_ID,
          diagnostico_id: 'diag-da-consulta-a',
          medicamentos,
        })
        .expect(201);
    });

    it('ADMIN também NÃO consegue criar prescrição na consulta de um médico (403)', async () => {
      const token = await tokenPara(ADMIN_ID);
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${token}`)
        .send({ consulta_id: CONSULTA_B_ID, medicamentos })
        .expect(403);
    });
  });

  // ── Escrita: POST /risco ──────────────────────────────────────────

  describe('POST /api/risco — escrita vinculada a consulta de terceiro', () => {
    it('A grava risk score na PRÓPRIA consulta normalmente (200)', async () => {
      const token = await tokenPara(MEDICO_A_ID);
      await request(app.getHttpServer())
        .post('/api/risco')
        .set('Authorization', `Bearer ${token}`)
        .send({
          consulta_id: CONSULTA_A_ID,
          score: { risco_global: 'baixo', score_global: 10 },
        })
        .expect(200);
    });

    it('A NÃO consegue gravar risk score na consulta de B (403)', async () => {
      const token = await tokenPara(MEDICO_A_ID);
      await request(app.getHttpServer())
        .post('/api/risco')
        .set('Authorization', `Bearer ${token}`)
        .send({
          consulta_id: CONSULTA_B_ID,
          score: { risco_global: 'alto', score_global: 90 },
        })
        .expect(403);
    });

    it('ADMIN também NÃO consegue gravar risk score na consulta de um médico (403)', async () => {
      const token = await tokenPara(ADMIN_ID);
      await request(app.getHttpServer())
        .post('/api/risco')
        .set('Authorization', `Bearer ${token}`)
        .send({
          consulta_id: CONSULTA_B_ID,
          score: { risco_global: 'alto', score_global: 90 },
        })
        .expect(403);
    });
  });

  // ── Listagem: nunca vaza consultas de outro usuário ───────────────

  describe('GET /api/consultas — listagem', () => {
    it('A recebe apenas o que o service filtrou por usuario_id (mock retorna vazio; o teste garante que o filtro por usuario_id chega ao Prisma)', async () => {
      const token = await tokenPara(MEDICO_A_ID);
      await request(app.getHttpServer())
        .get('/api/consultas')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const ultimaChamada = prismaMock.consulta.findMany.mock.calls.at(-1) as
        | [{ where: { usuario_id: string } }]
        | undefined;
      expect(ultimaChamada?.[0].where.usuario_id).toBe(MEDICO_A_ID);
    });
  });
});
