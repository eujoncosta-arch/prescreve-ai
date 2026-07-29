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
// Auditoria de validação de entrada (e2e)
//
// Prova, na camada HTTP real (ValidationPipe global + guards + controllers
// reais, Prisma mockado), que os DTOs endurecidos nesta auditoria REJEITAM
// os 8 cenários exigidos: payload válido (linha de base — deve passar),
// incompleto, tipo incorreto, campo desconhecido, string excessiva, array
// excessivo, enum inválido e número fora do intervalo.
// ============================================================

describe('Validação de entrada (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;

  const MEDICO_ID = 'medico-validacao-id';
  const CONSULTA_ID = 'consulta-validacao-id';

  const usuariosFakeDb: Record<
    string,
    { id: string; email: string; perfil: string; ativo: boolean }
  > = {
    [MEDICO_ID]: {
      id: MEDICO_ID,
      email: 'medico-validacao@x.com',
      perfil: 'MEDICO',
      ativo: true,
    },
  };

  const prismaMock = {
    usuario: {
      findUnique: jest.fn(({ where: { id } }: { where: { id?: string } }) =>
        Promise.resolve(id ? (usuariosFakeDb[id] ?? null) : null),
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
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    diagnostico: { create: jest.fn().mockResolvedValue({ id: 'diag-1' }) },
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
        forbidUnknownValues: true,
        transform: true,
      }),
    );
    await app.init();

    jwt = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function token(): Promise<string> {
    const u = usuariosFakeDb[MEDICO_ID];
    return jwt.signAsync(
      { sub: u.id, email: u.email, perfil: u.perfil },
      { secret: process.env.JWT_SECRET, expiresIn: '15m' },
    );
  }

  const medicamentoValido = {
    molecula: 'Losartana',
    dose: { valor: 50, unidade: 'mg', frequencia: '1x/dia', via: 'VO' },
    duracao: '30d',
  };

  // ── 1) Payload válido — linha de base ─────────────────────────────

  describe('Payload válido', () => {
    it('POST /api/diagnostico com payload completo e correto é aceito (201)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/diagnostico')
        .set('Authorization', `Bearer ${t}`)
        .send({ consulta_id: CONSULTA_ID, cid: 'I10', descricao: 'HAS' })
        .expect(201);
    });

    it('POST /api/prescricao com payload completo e correto é aceito (201)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({ consulta_id: CONSULTA_ID, medicamentos: [medicamentoValido] })
        .expect(201);
    });

    it('POST /api/risco com payload completo e correto é aceito (200)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/risco')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          score: { risco_global: 'baixo', score_global: 10 },
        })
        .expect(200);
    });
  });

  // ── 2) Payload incompleto ─────────────────────────────────────────

  describe('Payload incompleto', () => {
    it('POST /api/diagnostico sem "descricao" (campo obrigatório) é rejeitado (400)', async () => {
      const t = await token();
      const res = await request(app.getHttpServer())
        .post('/api/diagnostico')
        .set('Authorization', `Bearer ${t}`)
        .send({ consulta_id: CONSULTA_ID, cid: 'I10' })
        .expect(400);
      expect(JSON.stringify(res.body)).toMatch(/descricao/i);
    });

    it('POST /api/prescricao sem "medicamentos" (array obrigatório) é rejeitado (400)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({ consulta_id: CONSULTA_ID })
        .expect(400);
    });

    it('POST /api/risco sem "score" (objeto aninhado obrigatório) é rejeitado (400)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/risco')
        .set('Authorization', `Bearer ${t}`)
        .send({ consulta_id: CONSULTA_ID })
        .expect(400);
    });
  });

  // ── 3) Tipo incorreto ──────────────────────────────────────────────

  describe('Tipo incorreto', () => {
    it('POST /api/diagnostico com "confianca" como string em vez de número é rejeitado (400)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/diagnostico')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          cid: 'I10',
          descricao: 'HAS',
          confianca: 'muito-confiante',
        })
        .expect(400);
    });

    it('POST /api/prescricao com "medicamentos" como objeto único em vez de array é rejeitado (400)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({ consulta_id: CONSULTA_ID, medicamentos: medicamentoValido })
        .expect(400);
    });

    it('POST /api/risco com "score_global" como string em vez de número é rejeitado (400)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/risco')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          score: { risco_global: 'baixo', score_global: 'dez' },
        })
        .expect(400);
    });
  });

  // ── 4) Campo desconhecido ──────────────────────────────────────────

  describe('Campo desconhecido', () => {
    it('POST /api/diagnostico com campo extra não declarado no DTO é rejeitado (400 — nunca aceito silenciosamente)', async () => {
      const t = await token();
      const res = await request(app.getHttpServer())
        .post('/api/diagnostico')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          cid: 'I10',
          descricao: 'HAS',
          campo_nao_existe_no_dto: 'valor-injetado',
        })
        .expect(400);
      expect(JSON.stringify(res.body)).toMatch(/campo_nao_existe_no_dto/i);
    });

    it('POST /api/prescricao com campo extra dentro de um item de "medicamentos" (objeto aninhado) é rejeitado (400)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          medicamentos: [{ ...medicamentoValido, campo_extra: 'x' }],
        })
        .expect(400);
    });
  });

  // ── 5) String excessiva ─────────────────────────────────────────────

  describe('String excessiva', () => {
    it('POST /api/diagnostico com "descricao" acima do limite (500 caracteres) é rejeitado (400)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/diagnostico')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          cid: 'I10',
          descricao: 'A'.repeat(501),
        })
        .expect(400);
    });

    it('POST /api/prescricao com "orientacoes" acima do limite (5000 caracteres) é rejeitado (400)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          medicamentos: [medicamentoValido],
          orientacoes: 'A'.repeat(5001),
        })
        .expect(400);
    });
  });

  // ── 6) Array excessivo ──────────────────────────────────────────────

  describe('Array excessivo', () => {
    it('POST /api/prescricao com mais de 50 medicamentos é rejeitado (400)', async () => {
      const t = await token();
      const medicamentos = Array.from({ length: 51 }, () => medicamentoValido);
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({ consulta_id: CONSULTA_ID, medicamentos })
        .expect(400);
    });

    it('POST /api/risco com mais de 20 "recomendacoes_prioritarias" é rejeitado (400)', async () => {
      const t = await token();
      const recomendacoes = Array.from({ length: 21 }, (_, i) => `rec-${i}`);
      await request(app.getHttpServer())
        .post('/api/risco')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          score: {
            risco_global: 'baixo',
            score_global: 10,
            recomendacoes_prioritarias: recomendacoes,
          },
        })
        .expect(400);
    });
  });

  // ── 7) Enum inválido ────────────────────────────────────────────────

  describe('Enum inválido', () => {
    it('POST /api/risco com "risco_global" fora do enum NivelRisco é rejeitado (400 — nunca chega ao INSERT do Prisma)', async () => {
      const t = await token();
      const res = await request(app.getHttpServer())
        .post('/api/risco')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          score: { risco_global: 'nivel_que_nao_existe', score_global: 50 },
        })
        .expect(400);
      expect(JSON.stringify(res.body)).toMatch(/risco_global/i);
    });
  });

  // ── 8) Número fora do intervalo ─────────────────────────────────────

  describe('Número fora do intervalo', () => {
    it('POST /api/risco com "score_global" acima de 100 é rejeitado (400)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/risco')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          score: { risco_global: 'critico', score_global: 150 },
        })
        .expect(400);
    });

    it('POST /api/risco com "score_global" negativo é rejeitado (400)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/risco')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          score: { risco_global: 'baixo', score_global: -1 },
        })
        .expect(400);
    });

    it('POST /api/diagnostico com "confianca" fora do intervalo [0,1] é rejeitado (400)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/diagnostico')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          cid: 'I10',
          descricao: 'HAS',
          confianca: 5,
        })
        .expect(400);
    });

    it('POST /api/prescricao com "validade_dias" acima do limite (365) é rejeitado (400)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          medicamentos: [medicamentoValido],
          validade_dias: 9999,
        })
        .expect(400);
    });
  });

  // ============================================================
  // RM-36 — Contrato estruturado de dose (ItemMedicamentoDto.dose)
  //
  // `dose` era texto livre — o backend aceitava "500 mg", "500 mL", "20
  // gotas", "500 mg/kg/dia" ou qualquer string arbitrária, sem nenhuma
  // validação semântica de unidade/valor/frequência. Substituído por
  // DoseEstruturadaDto (valor/unidade/frequência/via tipados e
  // validados, + dose_por_kg_dia/dose_por_tomada opcionais). Estes testes
  // provam, na camada HTTP real, que o novo contrato é REALMENTE
  // aplicado — não apenas declarado nos tipos TypeScript.
  // ============================================================

  describe('Contrato estruturado de dose (RM-36)', () => {
    it('dose como STRING livre (formato antigo) é rejeitada (400) — texto livre nunca é mais a única representação da dose', async () => {
      const t = await token();
      const res = await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          medicamentos: [
            { molecula: 'Losartana', dose: '50mg', duracao: '30d' },
          ],
        })
        .expect(400);
      expect(JSON.stringify(res.body)).toMatch(/dose/i);
    });

    it.each([
      'mg',
      'mcg',
      'g',
      'mL',
      'gotas',
      'UI',
      'comprimido',
      'capsula',
      'sache',
      'ampola',
      'jato',
      'aplicacao',
    ])('unidade "%s" (permitida) é aceita (201)', async (unidade) => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          medicamentos: [
            {
              molecula: 'Losartana',
              dose: { valor: 1, unidade, frequencia: '1x/dia', via: 'VO' },
              duracao: '30d',
            },
          ],
        })
        .expect(201);
    });

    it('unidade desconhecida (ex.: "kg", "unidade_inventada") é rejeitada (400)', async () => {
      const t = await token();
      const res = await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          medicamentos: [
            {
              molecula: 'Losartana',
              dose: {
                valor: 50,
                unidade: 'kg',
                frequencia: '1x/dia',
                via: 'VO',
              },
              duracao: '30d',
            },
          ],
        })
        .expect(400);
      expect(JSON.stringify(res.body)).toMatch(/unidade/i);
    });

    it('valor zero é rejeitado (400) — dose ausente/zero nunca deve ser representada como um valor calculado', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          medicamentos: [
            {
              molecula: 'Losartana',
              dose: {
                valor: 0,
                unidade: 'mg',
                frequencia: '1x/dia',
                via: 'VO',
              },
              duracao: '30d',
            },
          ],
        })
        .expect(400);
    });

    it('valor negativo é rejeitado (400)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          medicamentos: [
            {
              molecula: 'Losartana',
              dose: {
                valor: -50,
                unidade: 'mg',
                frequencia: '1x/dia',
                via: 'VO',
              },
              duracao: '30d',
            },
          ],
        })
        .expect(400);
    });

    it('valor impossível (ex.: 999999999 mg) é rejeitado (400)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          medicamentos: [
            {
              molecula: 'Losartana',
              dose: {
                valor: 999999999,
                unidade: 'mg',
                frequencia: '1x/dia',
                via: 'VO',
              },
              duracao: '30d',
            },
          ],
        })
        .expect(400);
    });

    it.each([
      '1x/dia',
      '2x/dia',
      '3x/dia',
      '4x/dia',
      'a_cada_4h',
      'a_cada_6h',
      'a_cada_8h',
      'a_cada_12h',
      'dose_unica',
      'uso_continuo',
      'sos',
    ])(
      'frequência "%s" (permitida, sem detalhe exigido) é aceita (201)',
      async (frequencia) => {
        const t = await token();
        await request(app.getHttpServer())
          .post('/api/prescricao')
          .set('Authorization', `Bearer ${t}`)
          .send({
            consulta_id: CONSULTA_ID,
            medicamentos: [
              {
                molecula: 'Losartana',
                dose: { valor: 50, unidade: 'mg', frequencia, via: 'VO' },
                duracao: '30d',
              },
            ],
          })
          .expect(201);
      },
    );

    it('frequência desconhecida (texto livre não mapeado) é rejeitada (400)', async () => {
      const t = await token();
      const res = await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          medicamentos: [
            {
              molecula: 'Losartana',
              dose: {
                valor: 50,
                unidade: 'mg',
                frequencia: 'sempre que der',
                via: 'VO',
              },
              duracao: '30d',
            },
          ],
        })
        .expect(400);
      expect(JSON.stringify(res.body)).toMatch(/frequencia/i);
    });

    it('frequência "outro" SEM frequencia_detalhe é rejeitada (400) — nunca um escape livre sem contexto', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          medicamentos: [
            {
              molecula: 'Losartana',
              dose: {
                valor: 50,
                unidade: 'mg',
                frequencia: 'outro',
                via: 'VO',
              },
              duracao: '30d',
            },
          ],
        })
        .expect(400);
    });

    it('frequência "outro" COM frequencia_detalhe é aceita (201) — texto livre permitido apenas como complemento, nunca sozinho', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          medicamentos: [
            {
              molecula: 'Losartana',
              dose: {
                valor: 50,
                unidade: 'mg',
                frequencia: 'outro',
                frequencia_detalhe: 'Titular conforme resposta pressórica',
                via: 'VO',
              },
              duracao: '30d',
            },
          ],
        })
        .expect(201);
    });

    it('frequência "nao_diaria" SEM frequencia_detalhe é rejeitada (400)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          medicamentos: [
            {
              molecula: 'Losartana',
              dose: {
                valor: 70,
                unidade: 'mg',
                frequencia: 'nao_diaria',
                via: 'VO',
              },
              duracao: '90d',
            },
          ],
        })
        .expect(400);
    });

    it('dose_por_kg_dia com unidade PONDERÁVEL (mg) é aceita (201)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          medicamentos: [
            {
              molecula: 'Amoxicilina',
              dose: {
                valor: 500,
                unidade: 'mg',
                frequencia: '3x/dia',
                via: 'VO',
                dose_por_kg_dia: 50,
              },
              duracao: '10d',
            },
          ],
        })
        .expect(201);
    });

    it('dose_por_kg_dia com unidade DISCRETA (comprimido) é rejeitada (400) — incoerência unidade × tipo de dose', async () => {
      const t = await token();
      const res = await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          medicamentos: [
            {
              molecula: 'Amoxicilina',
              dose: {
                valor: 1,
                unidade: 'comprimido',
                frequencia: '3x/dia',
                via: 'VO',
                dose_por_kg_dia: 50,
              },
              duracao: '10d',
            },
          ],
        })
        .expect(400);
      expect(JSON.stringify(res.body)).toMatch(
        /dose_por_kg_dia|dose_por_tomada|ponder/i,
      );
    });

    it('dose_por_tomada negativo é rejeitado (400)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          medicamentos: [
            {
              molecula: 'Amoxicilina',
              dose: {
                valor: 500,
                unidade: 'mg',
                frequencia: '3x/dia',
                via: 'VO',
                dose_por_tomada: -10,
              },
              duracao: '10d',
            },
          ],
        })
        .expect(400);
    });

    it('campo desconhecido dentro de "dose" (whitelist) é rejeitado (400)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          medicamentos: [
            {
              molecula: 'Losartana',
              dose: {
                valor: 50,
                unidade: 'mg',
                frequencia: '1x/dia',
                via: 'VO',
                campo_extra: 'x',
              },
              duracao: '30d',
            },
          ],
        })
        .expect(400);
    });

    it('persistência: a dose estruturada (não texto livre) é o que chega ao Prisma — prova de integração DTO → service → persistência', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .post('/api/prescricao')
        .set('Authorization', `Bearer ${t}`)
        .send({
          consulta_id: CONSULTA_ID,
          medicamentos: [
            {
              molecula: 'Amoxicilina',
              dose: {
                valor: 500,
                unidade: 'mg',
                frequencia: '3x/dia',
                via: 'VO',
                dose_por_kg_dia: 50,
              },
              duracao: '10d',
              observacoes: 'Tomar com alimentos',
            },
          ],
        })
        .expect(201);

      const ultimaChamada = prismaMock.prescricao.create.mock.calls.at(-1) as
        | [
            {
              data: {
                medicamentos: Array<{
                  molecula: string;
                  dose: Record<string, unknown>;
                  observacoes?: string;
                }>;
              };
            },
          ]
        | undefined;
      const item = ultimaChamada?.[0].data.medicamentos[0];
      expect(item).toBeDefined();
      if (!item) return;
      expect(item.molecula).toBe('Amoxicilina');
      expect(item.dose).toEqual({
        valor: 500,
        unidade: 'mg',
        frequencia: '3x/dia',
        via: 'VO',
        dose_por_kg_dia: 50,
      });
      expect(typeof item.dose).toBe('object');
      expect(item.observacoes).toBe('Tomar com alimentos');
    });
  });

  // ── Paginação — teto explícito de "limite" ──────────────────────────

  describe('Paginação', () => {
    it('GET /api/consultas com limite dentro do permitido é aceito (200)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .get('/api/consultas?pagina=1&limite=20')
        .set('Authorization', `Bearer ${t}`)
        .expect(200);
    });

    it('GET /api/consultas com limite acima do teto (100) é rejeitado (400)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .get('/api/consultas?pagina=1&limite=99999')
        .set('Authorization', `Bearer ${t}`)
        .expect(400);
    });

    it('GET /api/consultas com "pagina" não numérico é rejeitado (400 — antes virava NaN e seguia para o Prisma sem checagem)', async () => {
      const t = await token();
      await request(app.getHttpServer())
        .get('/api/consultas?pagina=abc')
        .set('Authorization', `Bearer ${t}`)
        .expect(400);
    });
  });
});
