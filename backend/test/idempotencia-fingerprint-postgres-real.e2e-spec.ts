/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment -- mocks do jest e respostas do supertest são `any`; o que importa aqui são as asserções. */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../src/auth/auth.module';
import { ConsultaModule } from '../src/modules/consulta/consulta.module';
import { ConsultaService } from '../src/modules/consulta/consulta.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CacheModule } from '../src/modules/cache/cache.module';
import { CacheService } from '../src/modules/cache/cache.service';
import { fingerprintPrescricao } from '../src/modules/consulta/prescricao-fingerprint.util';

// ============================================================
// RM-107.1.1-E2.5 — Idempotência com fingerprint de conteúdo contra PostgreSQL REAL (sem mock de Prisma).
//
// Esta suíte só roda com `DATABASE_URL` (CI com serviço Postgres, ou `npm run test:e2e:postgres:local`, que usa `prisma dev`: motor
// PostgreSQL real em WASM/PGlite com protocolo de rede real). Sem `DATABASE_URL` ela é PULADA e NÃO comprova nada.
//
// Limites honestos do que isto demonstra (ver relatório E2.5):
//  - "duas requisições simultâneas": requisições HTTP concorrentes (Promise.all) contra o mesmo banco; a serialização final das transações é do
//    motor — no modo local (PGlite, processo único) não há contenção de locks entre processos.
//  - "timeout após gravação": a falha de resposta é injetada no limite do serviço APÓS o commit (o cliente vê 500; o banco já tem o registro).
//  - "reinício do serviço": a aplicação Nest (e seu pool de conexões) é encerrada e uma NOVA instância é criada sobre o MESMO banco.
//    O reinício do próprio servidor PostgreSQL NÃO é simulado aqui (os dados são lidos do armazenamento do banco, não de memória da aplicação).
// ============================================================

// Registro de usuário (hash de senha) + criação de consultas + vários cenários concorrentes excedem o timeout padrão de 5 s.
jest.setTimeout(120_000);

const TEM_DATABASE_URL = !!process.env.DATABASE_URL;
const describeOuSkip = TEM_DATABASE_URL ? describe : describe.skip;

if (!TEM_DATABASE_URL) {
  console.warn(
    '[idempotencia-fingerprint-postgres-real] DATABASE_URL não definida — suíte PULADA (nenhuma comprovação de banco real).',
  );
}

describeOuSkip('Idempotência com fingerprint — PostgreSQL real (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  let consultaSvc: ConsultaService;
  let auditSvc: AuditService;

  const sufixo = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const emailA = `idem-a-${sufixo}@x.com`;
  const emailB = `idem-b-${sufixo}@x.com`;
  let usuarioA: string;
  let usuarioB: string;
  let consultaA1: string;
  let consultaA2: string;
  let consultaB1: string;

  async function criarApp(): Promise<{
    app: INestApplication<App>;
    mod: TestingModule;
  }> {
    const mod: TestingModule = await Test.createTestingModule({
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
    const a = mod.createNestApplication<INestApplication<App>>();
    a.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await a.init();
    return { app: a, mod };
  }

  function ligar(a: INestApplication<App>, mod: TestingModule) {
    app = a;
    prisma = mod.get(PrismaService);
    jwt = mod.get(JwtService);
    consultaSvc = mod.get(ConsultaService);
    auditSvc = mod.get(AuditService, { strict: false });
  }

  const tokenDe = (id: string, email: string) =>
    jwt.signAsync(
      { sub: id, email, perfil: 'MEDICO' },
      { secret: process.env.JWT_SECRET, expiresIn: '15m' },
    );

  async function registrar(email: string, crm: string): Promise<string> {
    const r = await request(app.getHttpServer()).post('/auth/register').send({
      email,
      senha: 'SenhaForte123!',
      crm,
      especialidade: 'clinica_medica',
      uf: 'SP',
    });
    expect(r.status).toBe(201);
    return (await prisma.usuario.findUnique({ where: { email } }))!.id;
  }

  async function novaConsulta(token: string): Promise<string> {
    const r = await request(app.getHttpServer())
      .post('/api/consulta')
      .set('Authorization', `Bearer ${token}`)
      .send({ anamnese: { queixa_principal: 'Idempotência de prescrição' } })
      .expect(201);
    return (r.body as { id: string }).id;
  }

  const medicamentos = (valor = 500) => [
    {
      molecula: 'Amoxicilina',
      dose: { valor, unidade: 'mg', frequencia: '3x/dia', via: 'VO' },
      duracao: '7 dias',
      observacoes: 'Tomar após refeição',
    },
  ];
  const corpo = (
    consulta_id: string,
    key: string,
    over: Record<string, unknown> = {},
  ) => ({
    consulta_id,
    medicamentos: medicamentos(),
    idempotency_key: key,
    ...over,
  });
  const postar = (token: string, body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/api/prescricao')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  let n = 0;
  const chave = (rotulo: string) =>
    `e25-${rotulo}-${sufixo}-${++n}-${'x'.repeat(8)}`;

  beforeAll(async () => {
    const { app: a, mod } = await criarApp();
    ligar(a, mod);
    usuarioA = await registrar(emailA, `IA${Date.now().toString(36)}`);
    usuarioB = await registrar(emailB, `IB${Date.now().toString(36)}`);
    const tA = await tokenDe(usuarioA, emailA);
    const tB = await tokenDe(usuarioB, emailB);
    consultaA1 = await novaConsulta(tA);
    consultaA2 = await novaConsulta(tA);
    consultaB1 = await novaConsulta(tB);
  });

  afterAll(async () => {
    for (const u of [usuarioA, usuarioB].filter(Boolean)) {
      await prisma.prescricao
        .deleteMany({ where: { consulta: { usuario_id: u } } })
        .catch(() => undefined);
      await prisma.consulta
        .deleteMany({ where: { usuario_id: u } })
        .catch(() => undefined);
      await prisma.auditoria
        .deleteMany({ where: { usuario_id: u } })
        .catch(() => undefined);
      await prisma.usuario.delete({ where: { id: u } }).catch(() => undefined);
    }
    await app.close();
  });

  afterEach(() => jest.restoreAllMocks());

  it('1. primeira criação: grava o conteúdo E o fingerprint canônico na coluna real; auditoria atômica', async () => {
    const t = await tokenDe(usuarioA, emailA);
    const k = chave('primeira');
    const res = await postar(t, corpo(consultaA1, k)).expect(201);
    const id = (res.body as { id: string }).id;
    const linha = await prisma.prescricao.findUnique({ where: { id } });
    expect(linha!.idempotency_key).toBe(k);
    expect(linha!.idempotency_fingerprint).toBe(
      fingerprintPrescricao({
        consulta_id: consultaA1,
        medicamentos: medicamentos(),
      }),
    );
    expect(linha!.medicamentos).toEqual(medicamentos()); // conteúdo persistido idêntico ao enviado (sem recálculo)
    expect(
      await prisma.auditoria.count({ where: { recurso: `prescricao:${id}` } }),
    ).toBe(1);
  });

  it('2. repetição idêntica (3x): mesmo registro, 1 linha, nenhuma auditoria extra', async () => {
    const t = await tokenDe(usuarioA, emailA);
    const k = chave('identica');
    const ids: string[] = [];
    for (let i = 0; i < 3; i++)
      ids.push(
        (
          (await postar(t, corpo(consultaA1, k)).expect(201)).body as {
            id: string;
          }
        ).id,
      );
    expect(new Set(ids).size).toBe(1);
    expect(
      await prisma.prescricao.count({ where: { idempotency_key: k } }),
    ).toBe(1);
    expect(
      await prisma.auditoria.count({
        where: { recurso: `prescricao:${ids[0]}` },
      }),
    ).toBe(1);
  });

  it('3. repetição com payload DIFERENTE: 409 explícito, registro original intacto, nada criado', async () => {
    const t = await tokenDe(usuarioA, emailA);
    const k = chave('diferente');
    const original = (await postar(t, corpo(consultaA1, k)).expect(201))
      .body as { id: string };
    const variantes: Array<Record<string, unknown>> = [
      { medicamentos: medicamentos(501) }, // dose diferente
      { medicamentos: [{ ...medicamentos()[0], duracao: '10 dias' }] }, // duração
      { medicamentos: [{ ...medicamentos()[0], observacoes: undefined }] }, // observação removida
      {
        medicamentos: [
          ...medicamentos(),
          {
            molecula: 'Dipirona',
            dose: {
              valor: 1,
              unidade: 'g',
              frequencia: 'a_cada_6h',
              via: 'VO',
            },
            duracao: '3 dias',
          },
        ],
      },
      { orientacoes: 'outra orientação' },
      { validade_dias: 60 },
    ];
    for (const v of variantes) {
      const r = await postar(t, corpo(consultaA1, k, v));
      expect(r.status).toBe(409);
      expect(JSON.stringify(r.body)).not.toMatch(
        /Amoxicilina|Dipirona|outra orientação/,
      ); // a resposta não ecoa conteúdo
    }
    expect(
      await prisma.prescricao.count({ where: { idempotency_key: k } }),
    ).toBe(1);
    const linha = await prisma.prescricao.findUnique({
      where: { id: original.id },
    });
    expect(linha!.medicamentos).toEqual(medicamentos()); // nenhuma alteração numérica
  });

  it('3b. equivalências documentadas: ordem das chaves, validade_dias ausente ≡ 30, orientacoes/diagnóstico ausentes ≡ nulos ⇒ mesmo registro (sem 409)', async () => {
    const t = await tokenDe(usuarioA, emailA);
    const k = chave('equivalente');
    const a = (await postar(t, corpo(consultaA1, k)).expect(201)).body as {
      id: string;
    };
    const b = await postar(t, {
      idempotency_key: k,
      validade_dias: 30,
      medicamentos: [
        {
          observacoes: 'Tomar após refeição',
          duracao: '7 dias',
          dose: {
            via: 'VO',
            frequencia: '3x/dia',
            unidade: 'mg',
            valor: 500.0,
          },
          molecula: 'Amoxicilina',
        },
      ],
      consulta_id: consultaA1,
    }).expect(201);
    expect((b.body as { id: string }).id).toBe(a.id);
  });

  it('3c. a ORDEM dos medicamentos é parte do conteúdo: trocar a ordem com a mesma chave ⇒ 409', async () => {
    const t = await tokenDe(usuarioA, emailA);
    const k = chave('ordem');
    const m2 = {
      molecula: 'Dipirona',
      dose: { valor: 1, unidade: 'g', frequencia: 'a_cada_6h', via: 'VO' },
      duracao: '3 dias',
    };
    await postar(
      t,
      corpo(consultaA1, k, { medicamentos: [...medicamentos(), m2] }),
    ).expect(201);
    await postar(
      t,
      corpo(consultaA1, k, { medicamentos: [m2, ...medicamentos()] }),
    ).expect(409);
  });

  it('5b. colisão REAL de unique constraint, de forma DETERMINÍSTICA: a busca prévia "perde" a corrida, o create colide com a constraint real do PostgreSQL (P2002) e o serviço resolve — mesmo conteúdo ⇒ registro existente; conteúdo diferente ⇒ 409', async () => {
    const t = await tokenDe(usuarioA, emailA);
    const k = chave('p2002-real');
    const original = (await postar(t, corpo(consultaA1, k)).expect(201))
      .body as { id: string };
    const dto = (valor: number) =>
      ({
        consulta_id: consultaA1,
        medicamentos: medicamentos(valor),
        idempotency_key: k,
      }) as never;
    const original_findUnique = prisma.prescricao.findUnique.bind(
      prisma.prescricao,
    );
    // 1ª busca (a de idempotência) devolve null como se a vencedora ainda não fosse visível; as seguintes (pós-P2002) são reais.
    const espiao = jest
      .spyOn(prisma.prescricao, 'findUnique')
      .mockImplementationOnce((() => Promise.resolve(null)) as never);
    const mesmo = await consultaSvc.criarPrescricao(dto(500), usuarioA);
    expect(espiao).toHaveBeenCalled();
    expect(mesmo.id).toBe(original.id); // P2002 real ⇒ devolveu o registro existente
    jest
      .spyOn(prisma.prescricao, 'findUnique')
      .mockImplementationOnce((() => Promise.resolve(null)) as never);
    await expect(
      consultaSvc.criarPrescricao(dto(777), usuarioA),
    ).rejects.toMatchObject({ status: 409 }); // P2002 real ⇒ conflito de conteúdo
    void original_findUnique;
    expect(
      await prisma.prescricao.count({ where: { idempotency_key: k } }),
    ).toBe(1);
  });

  it('6. timeout/falha de resposta APÓS gravação: o cliente vê erro, o banco já tem o registro; a nova tentativa (mesma chave) recebe o MESMO registro — sem duplicar', async () => {
    const t = await tokenDe(usuarioA, emailA);
    const k = chave('resposta-perdida');
    const original = consultaSvc.criarPrescricao.bind(consultaSvc);
    jest
      .spyOn(consultaSvc, 'criarPrescricao')
      .mockImplementationOnce(async (dto, uid) => {
        await original(dto, uid); // commit real
        throw new Error('ECONNRESET: resposta perdida após gravação');
      });
    const r1 = await postar(t, corpo(consultaA1, k));
    expect(r1.status).toBe(500);
    expect(
      await prisma.prescricao.count({ where: { idempotency_key: k } }),
    ).toBe(1); // gravado apesar do erro visto pelo cliente
    const r2 = await postar(t, corpo(consultaA1, k)).expect(201);
    expect(
      await prisma.prescricao.count({ where: { idempotency_key: k } }),
    ).toBe(1);
    expect(
      (await prisma.prescricao.findFirst({ where: { idempotency_key: k } }))!
        .id,
    ).toBe((r2.body as { id: string }).id);
    await postar(
      t,
      corpo(consultaA1, k, { medicamentos: medicamentos(999) }),
    ).expect(409); // e a divergência continua recusada
  });

  it('7. rollback: falha na auditoria desfaz a prescrição (atomicidade); a nova tentativa com a mesma chave cria normalmente', async () => {
    const t = await tokenDe(usuarioA, emailA);
    const k = chave('rollback');
    jest
      .spyOn(auditSvc, 'registrarAuditoria')
      .mockRejectedValueOnce(new Error('falha de auditoria simulada'));
    const r1 = await postar(t, corpo(consultaA1, k));
    expect(r1.status).toBe(500);
    expect(
      await prisma.prescricao.count({ where: { idempotency_key: k } }),
    ).toBe(0); // nada ficou parcialmente persistido
    const r2 = await postar(t, corpo(consultaA1, k)).expect(201);
    expect(
      await prisma.prescricao.count({ where: { idempotency_key: k } }),
    ).toBe(1);
    expect(
      await prisma.auditoria.count({
        where: { recurso: `prescricao:${(r2.body as { id: string }).id}` },
      }),
    ).toBe(1);
  });

  it('8. reinício do SERVIÇO: nova instância da aplicação sobre o mesmo banco — repetição devolve o mesmo registro e a divergência continua 409', async () => {
    const t = await tokenDe(usuarioA, emailA);
    const k = chave('reinicio');
    const antes = (await postar(t, corpo(consultaA1, k)).expect(201)).body as {
      id: string;
    };
    await app.close();
    const { app: nova, mod } = await criarApp();
    ligar(nova, mod);
    const t2 = await tokenDe(usuarioA, emailA);
    const depois = (await postar(t2, corpo(consultaA1, k)).expect(201))
      .body as { id: string };
    expect(depois.id).toBe(antes.id);
    await postar(
      t2,
      corpo(consultaA1, k, { medicamentos: medicamentos(42) }),
    ).expect(409);
    expect(
      await prisma.prescricao.count({ where: { idempotency_key: k } }),
    ).toBe(1);
  });

  it('9. isolamento: a mesma chave em OUTRA consulta do mesmo médico ⇒ 403; em consulta de OUTRO proprietário ⇒ 403; nada vaza nem é criado', async () => {
    const tA = await tokenDe(usuarioA, emailA);
    const tB = await tokenDe(usuarioB, emailB);
    const k = chave('isolamento');
    const original = (await postar(tA, corpo(consultaA1, k)).expect(201))
      .body as { id: string };
    const outraConsulta = await postar(tA, corpo(consultaA2, k));
    expect(outraConsulta.status).toBe(403);
    const outroProprietarioNaConsultaDele = await postar(
      tB,
      corpo(consultaB1, k),
    );
    expect(outroProprietarioNaConsultaDele.status).toBe(403); // a chave pertence a outra consulta/escopo
    const outroProprietarioNaConsultaDoA = await postar(
      tB,
      corpo(consultaA1, k),
    );
    expect(outroProprietarioNaConsultaDoA.status).toBe(403); // consulta alheia
    expect(
      JSON.stringify([
        outraConsulta.body,
        outroProprietarioNaConsultaDele.body,
        outroProprietarioNaConsultaDoA.body,
      ]),
    ).not.toContain(original.id);
    expect(
      await prisma.prescricao.count({ where: { idempotency_key: k } }),
    ).toBe(1);
  });

  it('10. COMPATIBILIDADE — registro LEGADO (sem fingerprint, criado por cliente/versão antiga): repetição idêntica devolve o mesmo; diferente ⇒ 409 (fingerprint derivado do conteúdo persistido)', async () => {
    const t = await tokenDe(usuarioA, emailA);
    const k = chave('legado');
    const legado = await prisma.prescricao.create({
      data: {
        consulta_id: consultaA1,
        medicamentos: medicamentos() as never,
        hash_integridade: 'legado',
        idempotency_key: k, // idempotency_fingerprint propositalmente NULL
      },
    });
    expect(legado.idempotency_fingerprint).toBeNull();
    const igual = await postar(t, corpo(consultaA1, k)).expect(201);
    expect((igual.body as { id: string }).id).toBe(legado.id);
    await postar(
      t,
      corpo(consultaA1, k, { medicamentos: medicamentos(7) }),
    ).expect(409);
    expect(
      (await prisma.prescricao.findUnique({ where: { id: legado.id } }))!
        .idempotency_fingerprint,
    ).toBeNull(); // nenhum backfill silencioso
  });

  it('11. COMPATIBILIDADE — cliente sem idempotency_key: continua criando (cada envio é uma operação distinta) e não grava fingerprint', async () => {
    const t = await tokenDe(usuarioA, emailA);
    const a = (
      await postar(t, {
        consulta_id: consultaA1,
        medicamentos: medicamentos(),
      }).expect(201)
    ).body as { id: string };
    const b = (
      await postar(t, {
        consulta_id: consultaA1,
        medicamentos: medicamentos(),
      }).expect(201)
    ).body as { id: string };
    expect(a.id).not.toBe(b.id);
    expect(
      (await prisma.prescricao.findUnique({ where: { id: a.id } }))!
        .idempotency_fingerprint,
    ).toBeNull();
  });

  it('12. o campo extra do cliente continua rejeitado (400), nenhum contrato de entrada mudou', async () => {
    const t = await tokenDe(usuarioA, emailA);
    await postar(
      t,
      corpo(consultaA1, chave('extra'), { idempotency_fingerprint: 'x' }),
    ).expect(400);
    await postar(
      t,
      corpo(consultaA1, chave('extra2'), { bloqueio_dto: {} }),
    ).expect(400);
  });

  // ── Testes de CONCORRÊNCIA por último: no motor local (PGlite multiplexado) erros de protocolo sob carga podem deixar a sessão compartilhada instável;
  //    executá-los ao final impede que contaminem os cenários determinísticos acima. ──
  // LIMITE HONESTO DO AMBIENTE (ver cabeçalho): sob concorrência real o motor local (PGlite multiplexado por "prisma dev") pode devolver 5xx por
  // erro de protocolo/visibilidade (observado: "bind message supplies N parameters…" e P2002 antes de o vencedor ser visível). Por isso estes testes NÃO
  // exigem 100% de sucesso: exigem as INVARIANTES de integridade (nunca duplicar, nunca aceitar conteúdo divergente, nunca misturar conteúdos) e registram
  // quantas respostas foram 5xx. A taxa de sucesso sob concorrência em PostgreSQL multi-processo NÃO é comprovada por este ambiente.
  it('4. requisições SIMULTÂNEAS idênticas (10x): INVARIANTES — no máximo 1 linha, todas as respostas 2xx devolvem o mesmo id, nunca 409 (o conteúdo é idêntico)', async () => {
    const t = await tokenDe(usuarioA, emailA);
    const k = chave('simultanea');
    const rs = await Promise.all(
      Array.from({ length: 10 }, () => postar(t, corpo(consultaA1, k))),
    );
    const sucesso = rs.filter((r) => r.status === 201);
    console.warn(
      `[idempotencia pg] simultâneas idênticas — distribuição de status: ${JSON.stringify(rs.reduce((m: Record<string, number>, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {}))}`,
    );
    expect(rs.filter((r) => r.status === 409)).toEqual([]); // conteúdo idêntico nunca é conflito
    expect(sucesso.length).toBeGreaterThan(0);
    expect(
      new Set(sucesso.map((r) => (r.body as { id: string }).id)).size,
    ).toBe(1);
    expect(
      await prisma.prescricao.count({ where: { idempotency_key: k } }),
    ).toBe(1);
    // Nenhuma duplicação mesmo com respostas 5xx; a nova tentativa (sem concorrência) converge para o mesmo registro:
    const depois = (await postar(t, corpo(consultaA1, k)).expect(201)).body as {
      id: string;
    };
    expect(depois.id).toBe((sucesso[0].body as { id: string }).id);
  });

  it('5. colisão de chave com conteúdos DIFERENTES ao mesmo tempo: INVARIANTES — no máximo 1 linha; toda resposta 201 corresponde ao conteúdo GRAVADO; nenhum conteúdo divergente é aceito', async () => {
    const t = await tokenDe(usuarioA, emailA);
    const k = chave('colisao');
    const valores = [500, 501, 502, 503, 504, 505];
    const rs = await Promise.all(
      valores.map((v) =>
        postar(t, corpo(consultaA1, k, { medicamentos: medicamentos(v) })),
      ),
    );
    const linhas = await prisma.prescricao.findMany({
      where: { idempotency_key: k },
    });
    expect(linhas.length).toBeLessThanOrEqual(1);
    console.warn(
      `[idempotencia pg] colisão — distribuição de status: ${JSON.stringify(rs.reduce((m: Record<string, number>, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {}))} linhas=${linhas.length}`,
    );
    if (linhas.length === 1) {
      const gravado = (
        linhas[0].medicamentos as Array<{ dose: { valor: number } }>
      )[0].dose.valor;
      expect(valores).toContain(gravado);
      rs.forEach((r, i) => {
        if (r.status === 201) {
          expect((r.body as { id: string }).id).toBe(linhas[0].id);
          expect(valores[i]).toBe(gravado); // só a requisição cujo conteúdo foi gravado pode receber 201
        }
      });
    }
  });
});
