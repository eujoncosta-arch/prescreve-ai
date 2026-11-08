import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../src/auth/auth.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CacheModule } from '../src/modules/cache/cache.module';
import { CacheService } from '../src/modules/cache/cache.service';

// RM-107.1.1-E2.8.1 — GET /auth/me contra PostgreSQL real: devolve a identidade CONFIRMADA PELO SERVIDOR (nunca a de outro usuário), exige token
// válido e usuário ativo. Só roda com DATABASE_URL (CI / orquestradores de PostgreSQL); sem ela é PULADA e não comprova nada.
jest.setTimeout(60_000);
const describeOuSkip = process.env.DATABASE_URL ? describe : describe.skip;

describeOuSkip(
  'GET /auth/me — identidade confirmada pelo servidor (PostgreSQL real)',
  () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let jwt: JwtService;
    const sufixo = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const emails = [`me-a-${sufixo}@x.com`, `me-b-${sufixo}@x.com`];
    const ids: string[] = [];

    beforeAll(async () => {
      const mod: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          PrismaModule,
          CacheModule,
          AuthModule,
        ],
      })
        .overrideProvider(CacheService)
        .useValue({ key: jest.fn(), getOrSet: jest.fn() })
        .compile();
      app = mod.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      await app.init();
      prisma = mod.get(PrismaService);
      jwt = mod.get(JwtService);
      for (const [i, email] of emails.entries()) {
        const r = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email,
            senha: 'SenhaForte123!',
            crm: `ME${i}${Date.now().toString(36)}`,
            especialidade: 'clinica_medica',
            uf: 'SP',
          });
        expect(r.status).toBe(201);
        ids.push((await prisma.usuario.findUnique({ where: { email } }))!.id);
      }
    });
    afterAll(async () => {
      for (const id of ids) {
        await prisma.auditoria
          .deleteMany({ where: { usuario_id: id } })
          .catch(() => undefined);
        await prisma.usuario.delete({ where: { id } }).catch(() => undefined);
      }
      await app.close();
    });
    const tok = (
      sub: string,
      email: string,
      opts: { expiresIn?: string | number; secret?: string } = {},
    ) =>
      jwt.signAsync(
        { sub, email, perfil: 'MEDICO' },
        {
          secret: opts.secret ?? process.env.JWT_SECRET,
          expiresIn: (opts.expiresIn ?? '15m') as never,
        },
      );

    it('200 com o token do usuário: devolve SOMENTE {id, email, perfil} desse usuário (cada token ⇒ sua própria identidade)', async () => {
      for (const i of [0, 1]) {
        const r = await request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${await tok(ids[i], emails[i])}`)
          .expect(200);
        expect(r.body).toEqual({
          id: ids[i],
          email: emails[i],
          perfil: 'MEDICO',
        });
        expect(Object.keys(r.body).sort()).toEqual(['email', 'id', 'perfil']); // nada além (sem hash de senha, MFA, ativo…)
      }
    });
    it('401 sem token, token expirado, token com assinatura inválida e usuário inexistente', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
      await request(app.getHttpServer())
        .get('/auth/me')
        .set(
          'Authorization',
          `Bearer ${await tok(ids[0], emails[0], { expiresIn: -10 })}`,
        )
        .expect(401);
      await request(app.getHttpServer())
        .get('/auth/me')
        .set(
          'Authorization',
          `Bearer ${await tok(ids[0], emails[0], { secret: 'segredo-errado-com-mais-de-32-caracteres-xxxxx' })}`,
        )
        .expect(401);
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${await tok('inexistente', 'x@x.com')}`)
        .expect(401);
    });
    it('401 para usuário inativo (o servidor, não o token, decide)', async () => {
      await prisma.usuario.update({
        where: { id: ids[1] },
        data: { ativo: false },
      });
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${await tok(ids[1], emails[1])}`)
        .expect(401);
      await prisma.usuario.update({
        where: { id: ids[1] },
        data: { ativo: true },
      });
    });
    it('um token com `sub` de A e e-mail de B NÃO personifica ninguém: a resposta traz a identidade do `sub` autenticado no banco', async () => {
      const r = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${await tok(ids[0], emails[1])}`)
        .expect(200);
      expect(r.body).toEqual({
        id: ids[0],
        email: emails[0],
        perfil: 'MEDICO',
      });
    });
  },
);
