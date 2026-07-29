import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../src/auth/auth.module';
import { ConsultaModule } from '../src/modules/consulta/consulta.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CacheModule } from '../src/modules/cache/cache.module';
import { CacheService } from '../src/modules/cache/cache.service';

// ============================================================
// Integridade de persistência — idempotência (e2e, HTTP real)
//
// Prova, contra a pilha HTTP real (guards + ValidationPipe + controller +
// service reais), que reenviar a MESMA operação clínica (retry de rede,
// timeout, duplo clique, fila de sincronização do frontend) nunca cria um
// registro duplicado no backend — o requisito central desta auditoria:
// "uma prescrição não pode ser duplicada em caso de reenvio".
//
// PrismaService é mockado com um "banco" em memória por idempotency_key,
// simulando fielmente o comportamento real de unicidade da coluna.
// ============================================================

describe('Integridade de persistência — idempotência (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;

  const MEDICO_ID = 'medico-persistencia-id';
  const CONSULTA_ID = 'consulta-persistencia-id';

  const usuariosFakeDb = {
    [MEDICO_ID]: {
      id: MEDICO_ID,
      email: 'medico-persistencia@x.com',
      perfil: 'MEDICO',
      ativo: true,
    },
  };

  // "Banco" em memória, indexado por idempotency_key — simula a coluna
  // @unique real do Prisma.
  let prescricoesPorChave: Map<string, { id: string; consulta_id: string }>;
  let contadorCreate: number;

  const prismaMock = {
    usuario: {
      findUnique: jest.fn(({ where: { id } }: { where: { id?: string } }) =>
        Promise.resolve(
          id ? ((usuariosFakeDb as Record<string, unknown>)[id] ?? null) : null,
        ),
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
    prescricao: {
      findUnique: jest.fn(({ where }: { where: { idempotency_key: string } }) =>
        Promise.resolve(prescricoesPorChave.get(where.idempotency_key) ?? null),
      ),
      create: jest.fn(
        ({
          data,
        }: {
          data: { idempotency_key?: string; consulta_id: string };
        }) => {
          contadorCreate++;
          const registro = { id: `presc-${contadorCreate}`, ...data };
          if (data.idempotency_key)
            prescricoesPorChave.set(data.idempotency_key, registro);
          return Promise.resolve(registro);
        },
      ),
    },
    auditoria: { create: jest.fn().mockResolvedValue({}) },
  };
  // RM-49 (RM41-017): `ConsultaService` agora envolve escrita clínica +
  // auditoria em `$transaction(async (tx) => ...)` — `tx` aqui é o próprio
  // mock (mesmas chamadas/asserções desta suíte continuam válidas); uma
  // exceção lançada dentro do callback ainda propaga normalmente (nada
  // precisa ser revertido neste mock simplificado, já que `create` só
  // grava em `prescricoesPorChave` quando de fato resolve com sucesso).
  // Atribuído FORA do literal — ver comentário em authorization.e2e-spec.ts.
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

  beforeEach(() => {
    prescricoesPorChave = new Map();
    contadorCreate = 0;
    jest.clearAllMocks();
  });

  async function token(): Promise<string> {
    const u = usuariosFakeDb[MEDICO_ID];
    return jwt.signAsync(
      { sub: u.id, email: u.email, perfil: u.perfil },
      { secret: process.env.JWT_SECRET, expiresIn: '15m' },
    );
  }

  const medicamento = {
    molecula: 'Losartana',
    dose: { valor: 50, unidade: 'mg', frequencia: '1x/dia', via: 'VO' },
    duracao: '30d',
  };

  it('reenviar a MESMA prescrição (mesma idempotency_key) 3 vezes seguidas cria APENAS 1 registro — nunca duplica por retry', async () => {
    const t = await token();
    const payload = {
      consulta_id: CONSULTA_ID,
      medicamentos: [medicamento],
      idempotency_key: 'rx-key-fixa-e2e-001',
    };

    const respostas: Response[] = [];
    for (let i = 0; i < 3; i++) {
      respostas.push(
        await request(app.getHttpServer())
          .post('/api/prescricao')
          .set('Authorization', `Bearer ${t}`)
          .send(payload)
          .expect(201),
      );
    }

    // Todas as 3 respostas retornam o MESMO id — o cliente nunca percebe
    // diferença entre "criou" e "já existia", mas o servidor só criou uma vez.
    const ids = respostas.map((r) => (r.body as { id: string }).id);
    expect(new Set(ids).size).toBe(1);
    expect(prismaMock.prescricao.create).toHaveBeenCalledTimes(1);
  });

  it('duas prescrições com idempotency_key DIFERENTES são criadas normalmente (idempotência não bloqueia operações distintas)', async () => {
    const t = await token();
    const r1 = await request(app.getHttpServer())
      .post('/api/prescricao')
      .set('Authorization', `Bearer ${t}`)
      .send({
        consulta_id: CONSULTA_ID,
        medicamentos: [medicamento],
        idempotency_key: 'rx-key-a',
      })
      .expect(201);
    const r2 = await request(app.getHttpServer())
      .post('/api/prescricao')
      .set('Authorization', `Bearer ${t}`)
      .send({
        consulta_id: CONSULTA_ID,
        medicamentos: [medicamento],
        idempotency_key: 'rx-key-b',
      })
      .expect(201);

    expect((r1.body as { id: string }).id).not.toBe(
      (r2.body as { id: string }).id,
    );
    expect(prismaMock.prescricao.create).toHaveBeenCalledTimes(2);
  });

  it('recuperação posterior: falha simulada na 1ª tentativa (create rejeita) seguida de retry com a MESMA chave — a 2ª tentativa cria normalmente e uma 3ª (reenvio pós-sucesso) não duplica', async () => {
    const t = await token();
    const payload = {
      consulta_id: CONSULTA_ID,
      medicamentos: [medicamento],
      idempotency_key: 'rx-key-recuperacao',
    };

    // 1ª tentativa: simula indisponibilidade momentânea do backend.
    prismaMock.prescricao.create.mockImplementationOnce(() =>
      Promise.reject(new Error('ECONNRESET — simulação de falha transitória')),
    );
    await request(app.getHttpServer())
      .post('/api/prescricao')
      .set('Authorization', `Bearer ${t}`)
      .send(payload)
      .expect(500); // falha real, sem persistência — nada foi salvo ainda

    expect(prescricoesPorChave.size).toBe(0);

    // 2ª tentativa (retry do cliente, mesma idempotency_key): backend já recuperou.
    const res = await request(app.getHttpServer())
      .post('/api/prescricao')
      .set('Authorization', `Bearer ${t}`)
      .send(payload)
      .expect(201);
    const idCriado = (res.body as { id: string }).id;

    // 3ª tentativa (reenvio tardio, ex.: fila de sincronização que não sabia
    // que o retry anterior já teve sucesso): não duplica.
    const res2 = await request(app.getHttpServer())
      .post('/api/prescricao')
      .set('Authorization', `Bearer ${t}`)
      .send(payload)
      .expect(201);

    expect((res2.body as { id: string }).id).toBe(idCriado);
    expect(prismaMock.prescricao.create).toHaveBeenCalledTimes(2); // 1 falha (sem persistir) + 1 sucesso
  });
});
