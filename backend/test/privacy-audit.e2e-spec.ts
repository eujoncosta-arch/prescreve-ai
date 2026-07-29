import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, Logger } from '@nestjs/common';
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
import { HttpLoggingInterceptor } from '../src/common/interceptors/http-logging.interceptor';

// ============================================================
// Auditoria de privacidade e proteção de identificadores (e2e)
//
// Prova, contra a pilha HTTP real (guards + pipes + interceptor de log
// reais), os dois critérios centrais desta auditoria:
//   1) dados sensíveis (senha, CPF, CRM) NUNCA aparecem em nenhuma linha
//      de log de aplicação, mesmo durante requisições reais que os
//      carregam no corpo;
//   2) respostas de API NUNCA expõem campos internos sensíveis
//      (senha_hash, hash_identidade, crm_hash) — só o que a UI precisa.
// ============================================================

describe('Privacidade e proteção de identificadores (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  let logsCapturados: string[];

  const SENHA_REAL = 'senhaSuperSecreta123';
  const CPF_REAL = '12345678909';
  const CRM_REAL = '654321';
  const MEDICO_ID = 'medico-privacidade-id';
  const CONSULTA_ID = 'consulta-privacidade-id';

  const SENHA_HASH_FAKE = '$2b$12$hashBcryptSimuladoQueNuncaPodeVazar';

  const usuariosFakeDb: Record<
    string,
    {
      id: string;
      email: string;
      perfil: string;
      ativo: boolean;
      senha_hash: string;
    }
  > = {
    [MEDICO_ID]: {
      id: MEDICO_ID,
      email: 'medico-privacidade@x.com',
      perfil: 'MEDICO',
      ativo: true,
      senha_hash: SENHA_HASH_FAKE,
    },
  };

  const prismaMock = {
    usuario: {
      findUnique: jest.fn(
        ({ where }: { where: { id?: string; email?: string } }) => {
          if (where.id)
            return Promise.resolve(usuariosFakeDb[where.id] ?? null);
          if (where.email) {
            return Promise.resolve(
              Object.values(usuariosFakeDb).find(
                (u) => u.email === where.email,
              ) ?? null,
            );
          }
          return Promise.resolve(null);
        },
      ),
      create: jest.fn(
        ({
          data,
        }: {
          data: { email: string; perfil: string; senha_hash: string };
        }) =>
          Promise.resolve({
            id: 'novo-usuario-id',
            email: data.email,
            perfil: data.perfil,
            senha_hash: data.senha_hash, // simula o valor real vindo do Prisma
            ativo: true,
          }),
      ),
    },
    consulta: {
      findFirst: jest.fn(
        ({ where }: { where: { id: string; usuario_id: string } }) => {
          if (where.id === CONSULTA_ID && where.usuario_id === MEDICO_ID) {
            return Promise.resolve({ id: CONSULTA_ID, usuario_id: MEDICO_ID });
          }
          return Promise.resolve(null);
        },
      ),
    },
    paciente: {
      upsert: jest.fn(({ where }: { where: { hash_identidade: string } }) =>
        Promise.resolve({
          id: 'paciente-1',
          hash_identidade: where.hash_identidade,
          idade: 0,
          sexo: 'M',
          comorbidades: [],
        }),
      ),
    },
    refreshToken: { create: jest.fn().mockResolvedValue({}) },
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
    app.useGlobalInterceptors(new HttpLoggingInterceptor());
    await app.init();

    jwt = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    logsCapturados = [];
    // Espiona TUDO que qualquer Logger da aplicação (incluindo o
    // HttpLoggingInterceptor real) efetivamente emite — captura a string
    // final formatada, exatamente o que apareceria num agregador de logs.
    jest.spyOn(Logger.prototype, 'log').mockImplementation((msg: unknown) => {
      logsCapturados.push(String(msg));
    });
    jest.spyOn(Logger.prototype, 'error').mockImplementation((msg: unknown) => {
      logsCapturados.push(String(msg));
    });
    jest.spyOn(Logger.prototype, 'warn').mockImplementation((msg: unknown) => {
      logsCapturados.push(String(msg));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function token(): Promise<string> {
    const u = usuariosFakeDb[MEDICO_ID];
    return jwt.signAsync(
      { sub: u.id, email: u.email, perfil: u.perfil },
      { secret: process.env.JWT_SECRET, expiresIn: '15m' },
    );
  }

  // ── 1) Dados sensíveis nunca aparecem em log ──────────────────────

  describe('Dados sensíveis NUNCA aparecem em log de aplicação', () => {
    it('POST /auth/register com senha e CRM reais: nenhuma linha de log contém a senha nem o CRM em texto puro', async () => {
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'novo-medico@x.com',
        senha: SENHA_REAL,
        crm: CRM_REAL,
        especialidade: 'cardiologia',
        uf: 'SP',
      });

      const logsUnificados = logsCapturados.join('\n');
      expect(logsUnificados).not.toContain(SENHA_REAL);
      expect(logsUnificados).not.toContain(CRM_REAL);
      expect(logsCapturados.length).toBeGreaterThan(0); // confirma que algo FOI logado (não é um falso positivo por ausência de log)
    });

    it('POST /auth/login com senha errada: log de auditoria de falha não vaza a senha tentada', async () => {
      await request(app.getHttpServer()).post('/auth/login').send({
        email: 'medico-privacidade@x.com',
        senha: 'senha-tentada-errada-xyz',
      });

      const logsUnificados = logsCapturados.join('\n');
      expect(logsUnificados).not.toContain('senha-tentada-errada-xyz');
    });

    it('POST /api/consulta com CPF real de paciente: nenhuma linha de log contém o CPF em texto puro', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/consulta')
        .set('Authorization', `Bearer ${t}`)
        .send({ paciente_cpf: CPF_REAL, anamnese: { queixa: 'teste' } });

      const logsUnificados = logsCapturados.join('\n');
      expect(logsUnificados).not.toContain(CPF_REAL);
    });

    it('o log HTTP real contém método/rota/status (comportamento esperado) mas nunca o corpo da requisição', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/consulta')
        .set('Authorization', `Bearer ${t}`)
        .send({
          paciente_cpf: CPF_REAL,
          anamnese: { queixa: 'dado sensível de teste' },
        });

      const logsUnificados = logsCapturados.join('\n');
      expect(logsUnificados).toMatch(/POST \/api\/consulta \d+/); // método+rota+status realmente logados
      expect(logsUnificados).not.toContain('dado sensível de teste');
      expect(logsUnificados).not.toContain(CPF_REAL);
    });
  });

  // ── 2) Respostas de API não expõem campos internos sensíveis ──────

  describe('Respostas de API NUNCA expõem campos internos sensíveis', () => {
    it('POST /auth/register nunca retorna senha_hash no corpo da resposta', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'outro-medico@x.com',
          senha: SENHA_REAL,
        });

      const corpoSerializado = JSON.stringify(res.body);
      expect(corpoSerializado).not.toContain('senha_hash');
      expect(corpoSerializado).not.toContain(SENHA_HASH_FAKE);
    });

    it('POST /auth/register nunca retorna o crm_hash calculado (o cliente não precisa dele)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'medico-com-crm@x.com',
          senha: SENHA_REAL,
          crm: CRM_REAL,
        });

      const corpoSerializado = JSON.stringify(res.body);
      expect(corpoSerializado).not.toContain('crm_hash');
    });

    it('a resposta de registro contém APENAS os campos de token esperados — nenhum campo extra do Usuario', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'medico-minimo@x.com',
          senha: SENHA_REAL,
        });

      const chaves = Object.keys(res.body as object).sort();
      expect(chaves).toEqual(
        ['access_token', 'perfil', 'refresh_token'].sort(),
      );
    });
  });
});
