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
// RM-49 (RM41-026) — E2E contra PostgreSQL REAL, não mockado
//
// Todos os demais e2e-specs deste diretório mockam `PrismaService`
// (jest.fn()/FakeDb) — provam a pilha HTTP real (guards, DTOs,
// controllers, serviços), mas NUNCA exercitam constraints reais do
// Postgres (unique constraint real, tipos de coluna reais, transação
// ACID real). Este arquivo fecha essa lacuna especificamente: usa
// `PrismaModule` SEM override, conectado a um Postgres real via
// `DATABASE_URL`.
//
// LIMITAÇÃO HONESTA: este ambiente de sandbox de desenvolvimento não tem
// Docker/Postgres disponível (verificado — `docker`/`psql` inexistentes).
// Por isso este arquivo NUNCA foi executado com sucesso neste ambiente —
// só foi escrito e revisado por leitura. O guard abaixo detecta a
// ausência de `DATABASE_URL` e pula a suíte inteira (não a marca como
// passando por engano) em vez de falhar o gate local. Em CI (workflow
// `.github/workflows/ci.yml`), um serviço Postgres real é provisionado e
// `DATABASE_URL` aponta para ele — lá, esta suíte roda de verdade, pela
// primeira vez, contra um banco real.
// ============================================================

const TEM_DATABASE_URL = !!process.env.DATABASE_URL;

const describeOuSkip = TEM_DATABASE_URL ? describe : describe.skip;

if (!TEM_DATABASE_URL) {
  console.warn(
    '[postgres-real.e2e-spec] DATABASE_URL não definida — suíte pulada ' +
      '(este ambiente não tem Postgres real disponível). Rodará em CI.',
  );
}

describeOuSkip('Integridade contra PostgreSQL real (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;

  const emailUnico = `medico-pg-real-${Date.now()}@x.com`;
  let medicoId: string;
  let outroUsuarioId: string | undefined;

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

    prisma = moduleFixture.get(PrismaService);
    jwt = moduleFixture.get(JwtService);

    // RM-53 (RM41-026): `POST /auth/register` retorna
    // `{ access_token, refresh_token, perfil }` (ver `AuthService.gerarTokens`)
    // — nunca `{ usuario: { id } }`. Esta suíte nunca havia rodado de
    // verdade antes (sempre pulada por falta de Postgres real), então essa
    // suposição errada nunca tinha sido exercitada. O id real do usuário é
    // obtido consultando o Postgres real diretamente pelo e-mail único
    // gerado neste teste — a MESMA fonte de verdade que o resto da suíte
    // usa para validar persistência.
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: emailUnico,
        senha: 'SenhaForte123!',
        crm: `PG-${Date.now()}`,
        especialidade: 'clinica_medica',
        uf: 'SP',
      });

    const usuario = await prisma.usuario.findUnique({
      where: { email: emailUnico },
    });
    medicoId = usuario!.id;
  });

  afterAll(async () => {
    // Limpeza — nunca deixa dados de teste no banco real.
    if (medicoId) {
      await prisma.riskScore
        .deleteMany({ where: { consulta: { usuario_id: medicoId } } })
        .catch(() => undefined);
      await prisma.prescricao
        .deleteMany({ where: { consulta: { usuario_id: medicoId } } })
        .catch(() => undefined);
      await prisma.diagnostico
        .deleteMany({ where: { consulta: { usuario_id: medicoId } } })
        .catch(() => undefined);
      await prisma.consulta
        .deleteMany({ where: { usuario_id: medicoId } })
        .catch(() => undefined);
      await prisma.auditoria
        .deleteMany({ where: { usuario_id: medicoId } })
        .catch(() => undefined);
      await prisma.usuario
        .delete({ where: { id: medicoId } })
        .catch(() => undefined);
    }
    if (outroUsuarioId) {
      await prisma.auditoria
        .deleteMany({ where: { usuario_id: outroUsuarioId } })
        .catch(() => undefined);
      await prisma.usuario
        .delete({ where: { id: outroUsuarioId } })
        .catch(() => undefined);
    }
    await app.close();
  });

  async function token(): Promise<string> {
    return jwt.signAsync(
      { sub: medicoId, email: emailUnico, perfil: 'MEDICO' },
      { secret: process.env.JWT_SECRET, expiresIn: '15m' },
    );
  }

  it('cria uma consulta real e a recupera pelo detalhe — contra o Postgres real, não um fake em memória', async () => {
    const t = await token();
    const criada = await request(app.getHttpServer())
      .post('/api/consulta')
      .set('Authorization', `Bearer ${t}`)
      .send({ anamnese: { queixa_principal: 'Teste e2e Postgres real' } })
      .expect(201);

    const id = (criada.body as { id: string }).id;
    const detalhe = await request(app.getHttpServer())
      .get(`/api/consulta/${id}`)
      .set('Authorization', `Bearer ${t}`)
      .expect(200);

    expect((detalhe.body as { id: string }).id).toBe(id);
  });

  it('idempotency_key: reenviar a MESMA consulta 3x cria apenas 1 registro — a unique constraint REAL do Postgres é o mecanismo, não um Map em memória', async () => {
    const t = await token();
    const idempotencyKey = `pg-real-idem-${Date.now()}`;
    const ids: string[] = [];

    for (let i = 0; i < 3; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/consulta')
        .set('Authorization', `Bearer ${t}`)
        .send({
          anamnese: { queixa_principal: 'Retry idempotente' },
          idempotency_key: idempotencyKey,
        })
        .expect(201);
      ids.push((res.body as { id: string }).id);
    }

    expect(new Set(ids).size).toBe(1);

    const registrosNoBanco = await prisma.consulta.count({
      where: { idempotency_key: idempotencyKey },
    });
    expect(registrosNoBanco).toBe(1);
  });

  it('toda escrita de consulta grava exatamente 1 registro de auditoria correspondente, na mesma transação (RM41-016/017 contra o banco real)', async () => {
    const t = await token();
    const res = await request(app.getHttpServer())
      .post('/api/consulta')
      .set('Authorization', `Bearer ${t}`)
      .send({ anamnese: { queixa_principal: 'Prova de auditoria atômica' } })
      .expect(201);

    const id = (res.body as { id: string }).id;
    const auditorias = await prisma.auditoria.findMany({
      where: { recurso: `consulta:${id}` },
    });
    expect(auditorias).toHaveLength(1);
    expect(auditorias[0].tipo).toBe('consulta_criada');
  });

  it('ownership: outro usuário não recupera a consulta pelo id, mesmo sabendo o id real (filtro usuario_id é aplicado pelo Postgres real)', async () => {
    const t = await token();
    const criada = await request(app.getHttpServer())
      .post('/api/consulta')
      .set('Authorization', `Bearer ${t}`)
      .send({ anamnese: { queixa_principal: 'Consulta privada' } })
      .expect(201);
    const id = (criada.body as { id: string }).id;

    // RM-53 (RM41-026): um `sub` de usuário INEXISTENTE faz `JwtStrategy`
    // rejeitar por 401 (usuário não encontrado) antes mesmo de chegar à
    // checagem de ownership — testaria autenticação, não autorização. O
    // teste de ownership real exige um SEGUNDO usuário genuíno no Postgres.
    const emailOutro = `medico-pg-real-outro-${Date.now()}-${Math.random().toString(36).slice(2)}@x.com`;
    const registroOutro = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: emailOutro,
        senha: 'SenhaForte123!',
        crm: `PGO${Date.now().toString(36)}`,
        especialidade: 'clinica_medica',
        uf: 'SP',
      });
    expect(registroOutro.status).toBe(201);
    const outroUsuario = await prisma.usuario.findUnique({
      where: { email: emailOutro },
    });
    outroUsuarioId = outroUsuario!.id;

    const tokenOutro = await jwt.signAsync(
      {
        sub: outroUsuarioId,
        email: emailOutro,
        perfil: 'MEDICO',
      },
      { secret: process.env.JWT_SECRET, expiresIn: '15m' },
    );

    await request(app.getHttpServer())
      .get(`/api/consulta/${id}`)
      .set('Authorization', `Bearer ${tokenOutro}`)
      .expect(404);
  });

  // RM-53 (RM41-023): diagnóstico e risco calculado nunca tinham sido
  // sincronizados de verdade (gap de wiring no frontend) NEM recuperáveis
  // (endpoint de detalhe não incluía `risco_scores`) — ambos corrigidos
  // nesta rodada. Estes 3 testes provam, contra Postgres REAL (enum
  // `NivelRisco` real, `@@unique(idempotency_key)` real, FK real), que a
  // persistência e a recuperação funcionam ponta-a-ponta.
  it('diagnóstico: persiste e é recuperável pelo detalhe da consulta, com o CID/descrição reais (RM41-023)', async () => {
    const t = await token();
    const consulta = await request(app.getHttpServer())
      .post('/api/consulta')
      .set('Authorization', `Bearer ${t}`)
      .send({ anamnese: { queixa_principal: 'Hipertensão' } })
      .expect(201);
    const consultaId = (consulta.body as { id: string }).id;

    await request(app.getHttpServer())
      .post('/api/diagnostico')
      .set('Authorization', `Bearer ${t}`)
      .send({
        consulta_id: consultaId,
        cid: 'I10',
        descricao: 'Hipertensão Arterial Sistêmica',
        confianca: 0.9,
      })
      .expect(201);

    const detalhe = await request(app.getHttpServer())
      .get(`/api/consulta/${consultaId}`)
      .set('Authorization', `Bearer ${t}`)
      .expect(200);

    const body = detalhe.body as {
      diagnosticos: { cid: string; descricao: string; confianca: number }[];
    };
    expect(body.diagnosticos).toHaveLength(1);
    expect(body.diagnosticos[0].cid).toBe('I10');
    expect(body.diagnosticos[0].descricao).toBe(
      'Hipertensão Arterial Sistêmica',
    );
    expect(body.diagnosticos[0].confianca).toBe(0.9);
  });

  it('risco: persiste (enum NivelRisco REAL do Postgres) e é recuperável pelo detalhe da consulta (RM41-023)', async () => {
    const t = await token();
    const consulta = await request(app.getHttpServer())
      .post('/api/consulta')
      .set('Authorization', `Bearer ${t}`)
      .send({ anamnese: { queixa_principal: 'Avaliação de risco' } })
      .expect(201);
    const consultaId = (consulta.body as { id: string }).id;

    await request(app.getHttpServer())
      .post('/api/risco')
      .set('Authorization', `Bearer ${t}`)
      .send({
        consulta_id: consultaId,
        score: {
          risco_global: 'intermediario',
          score_global: 42,
          alerta_vermelho: false,
          recomendacoes_prioritarias: ['Monitorar PA'],
        },
      })
      .expect(200);

    const detalhe = await request(app.getHttpServer())
      .get(`/api/consulta/${consultaId}`)
      .set('Authorization', `Bearer ${t}`)
      .expect(200);

    const body = detalhe.body as {
      risco_scores: {
        risco_global: string;
        score_global: number;
        recomendacoes: string[];
      }[];
    };
    expect(body.risco_scores).toHaveLength(1);
    expect(body.risco_scores[0].risco_global).toBe('intermediario');
    expect(body.risco_scores[0].score_global).toBe(42);
    expect(body.risco_scores[0].recomendacoes).toEqual(['Monitorar PA']);
  });

  it('risco: um valor de risco_global FORA do enum real do Postgres é rejeitado com 400 antes de qualquer INSERT (RM41-022/023)', async () => {
    const t = await token();
    const consulta = await request(app.getHttpServer())
      .post('/api/consulta')
      .set('Authorization', `Bearer ${t}`)
      .send({ anamnese: { queixa_principal: 'Teste de validação de enum' } })
      .expect(201);
    const consultaId = (consulta.body as { id: string }).id;

    await request(app.getHttpServer())
      .post('/api/risco')
      .set('Authorization', `Bearer ${t}`)
      .send({
        consulta_id: consultaId,
        score: { risco_global: 'moderado', score_global: 10 },
      })
      .expect(400);

    const registrosNoBanco = await prisma.riskScore.count({
      where: { consulta_id: consultaId },
    });
    expect(registrosNoBanco).toBe(0);
  });

  // RM-53 (RM41-018/019, verificado agora contra Postgres real): a FK
  // `Diagnostico.consulta_id` foi trocada de `onDelete: Cascade` para
  // `onDelete: Restrict` na RM-52 — até então isso só tinha sido
  // verificado lendo o schema, nunca exercitando a constraint real.
  it('onDelete: Restrict é uma constraint REAL do Postgres — apagar uma Consulta com Diagnostico vinculado falha (RM41-018/019)', async () => {
    const t = await token();
    const consulta = await request(app.getHttpServer())
      .post('/api/consulta')
      .set('Authorization', `Bearer ${t}`)
      .send({ anamnese: { queixa_principal: 'Teste de constraint Restrict' } })
      .expect(201);
    const consultaId = (consulta.body as { id: string }).id;

    await request(app.getHttpServer())
      .post('/api/diagnostico')
      .set('Authorization', `Bearer ${t}`)
      .send({
        consulta_id: consultaId,
        cid: 'E11',
        descricao: 'Diabetes Mellitus tipo 2',
      })
      .expect(201);

    await expect(
      prisma.consulta.delete({ where: { id: consultaId } }),
    ).rejects.toThrow();

    // A consulta e o diagnóstico continuam intactos — o Restrict bloqueou
    // o delete em vez de apagar silenciosamente (que é o que Cascade faria).
    const aindaExiste = await prisma.consulta.findUnique({
      where: { id: consultaId },
    });
    expect(aindaExiste).not.toBeNull();
  });
});
