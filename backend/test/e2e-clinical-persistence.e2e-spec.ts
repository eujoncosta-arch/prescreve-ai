import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AuthModule } from '../src/auth/auth.module';
import { ConsultaModule } from '../src/modules/consulta/consulta.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CacheModule } from '../src/modules/cache/cache.module';
import { CacheService } from '../src/modules/cache/cache.service';
import { FakeDb, criarFakePrismaService } from './support/fake-prisma';

// ============================================================
// RM-47 — E2E: persistência clínica de ponta a ponta e isolamento entre usuários
//
// Diferença deliberada em relação aos e2e-specs existentes
// (ownership-authorization, authorization, input-validation,
// persistence-integrity, mfa, hardening, privacy-audit, auth-flows,
// app): aqueles validam UM comportamento por vez (ex.: "A não lê
// consulta de B"). Esta suíte valida FLUXOS COMPLETOS de ponta a ponta
// — login real → criar consulta real → gerar prescrição real → nova
// requisição HTTP independente ("recarregar") → listar → abrir detalhe
// → confirmar dado REAL — através de requisições HTTP reais
// (supertest), guards/pipes/DTOs/serviços reais, contra o mesmo
// `FakeDb` (ver `test/support/fake-prisma.ts` para a limitação honesta
// documentada: sem Postgres real disponível neste ambiente).
//
// Dados de teste: e-mails/senhas sintéticos (`*.teste.local`), nunca
// nomes de pacientes reais nem dados de produção. Existem SOMENTE
// dentro de cada teste (`FakeDb` é recriado do zero em `beforeEach` —
// nenhuma dependência de ordem de execução, nenhum dado sobrevive entre
// testes).
// ============================================================

describe('RM-47 — E2E: persistência clínica e isolamento entre usuários', () => {
  let app: INestApplication<App>;
  let db: FakeDb;

  beforeEach(async () => {
    // Isolamento entre testes: `FakeDb` novo a cada teste — nenhum dado
    // (nem sequência de ids) sobrevive de um teste para o outro.
    db = new FakeDb();

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
      .useValue(criarFakePrismaService(db))
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
  });

  afterEach(async () => {
    await app.close();
  });

  async function seedUsuario(email: string, senha: string) {
    const senha_hash = await bcrypt.hash(senha, 4); // custo baixo — só acelera o teste, nunca usado fora dele
    return db.seedUsuario({ email, senha_hash });
  }

  async function login(email: string, senha: string): Promise<string> {
    const resp = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, senha })
      .expect(200);
    return (resp.body as { access_token: string }).access_token;
  }

  async function criarConsulta(
    token: string,
    idempotencyKey: string,
    anamnese: object = { queixa_principal: 'Febre' },
  ) {
    const resp = await request(app.getHttpServer())
      .post('/api/consulta')
      .set('Authorization', `Bearer ${token}`)
      .send({ anamnese, idempotency_key: idempotencyKey })
      .expect(201);
    return (resp.body as { id: string }).id;
  }

  function criarPrescricao(
    token: string,
    consultaId: string,
    idempotencyKey: string,
  ) {
    return request(app.getHttpServer())
      .post('/api/prescricao')
      .set('Authorization', `Bearer ${token}`)
      .send({
        consulta_id: consultaId,
        medicamentos: [
          {
            molecula: 'Amoxicilina',
            dose: {
              valor: 500,
              unidade: 'mg',
              frequencia: '3x/dia',
              via: 'VO',
            },
            duracao: '7 dias',
          },
        ],
        idempotency_key: idempotencyKey,
      });
  }

  // ============================================================
  // CENÁRIO 1 — Persistência entre sessões
  // ============================================================
  describe('Cenário 1 — Persistência entre sessões', () => {
    it('consulta criada + prescrição gerada sobrevivem a uma nova requisição HTTP independente ("recarregar"), com itens REAIS no detalhe', async () => {
      await seedUsuario('medico.a@teste.local', 'SenhaForte123!');
      const token = await login('medico.a@teste.local', 'SenhaForte123!');

      const consultaId = await criarConsulta(token, 'idem-c1-consulta');
      await criarPrescricao(token, consultaId, 'idem-c1-presc').expect(201);

      // "Recarregar a aplicação" = uma nova requisição HTTP, sem NENHUM
      // estado de processo compartilhado com as chamadas acima além do
      // token — exatamente o que um `GET /api/consultas` após F5 faria.
      const lista = await request(app.getHttpServer())
        .get('/api/consultas')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const corpoLista = lista.body as {
        total: number;
        consultas: {
          id: string;
          prescricoes: { id: string; status: string }[];
        }[];
      };
      expect(corpoLista.total).toBe(1);
      expect(corpoLista.consultas[0].id).toBe(consultaId);
      expect(corpoLista.consultas[0].prescricoes).toHaveLength(1); // resumo real confirma prescrição existente

      const detalhe = await request(app.getHttpServer())
        .get(`/api/consulta/${consultaId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const corpoDetalhe = detalhe.body as {
        prescricoes: {
          medicamentos: { molecula: string; dose: { valor: number } }[];
        }[];
      };
      // Item REAL da prescrição — não fabricado, não "0 medicamentos".
      expect(corpoDetalhe.prescricoes[0].medicamentos).toHaveLength(1);
      expect(corpoDetalhe.prescricoes[0].medicamentos[0].molecula).toBe(
        'Amoxicilina',
      );
      expect(corpoDetalhe.prescricoes[0].medicamentos[0].dose.valor).toBe(500);
    });
  });

  // ============================================================
  // CENÁRIO 2 — Outro dispositivo/sessão
  // ============================================================
  describe('Cenário 2 — Nova sessão autenticada do mesmo usuário ("outro dispositivo")', () => {
    it('uma segunda sessão (segundo login, token DIFERENTE) enxerga o mesmo histórico real — sem dado fictício', async () => {
      await seedUsuario('medico.b@teste.local', 'SenhaForte123!');
      const tokenSessao1 = await login(
        'medico.b@teste.local',
        'SenhaForte123!',
      );
      const consultaId = await criarConsulta(tokenSessao1, 'idem-c2-consulta');
      await criarPrescricao(tokenSessao1, consultaId, 'idem-c2-presc').expect(
        201,
      );

      // Nova sessão autenticada — simula login de outro dispositivo/aba:
      // um SEGUNDO par de tokens, gerado por uma chamada de login
      // independente (nunca reaproveita o token da sessão anterior).
      const tokenSessao2 = await login(
        'medico.b@teste.local',
        'SenhaForte123!',
      );
      expect(tokenSessao2).not.toBe(tokenSessao1);

      const lista = await request(app.getHttpServer())
        .get('/api/consultas')
        .set('Authorization', `Bearer ${tokenSessao2}`)
        .expect(200);
      const corpo = lista.body as {
        total: number;
        consultas: { id: string }[];
      };
      expect(corpo.total).toBe(1);
      expect(corpo.consultas[0].id).toBe(consultaId); // histórico recuperado, não recriado/fabricado

      const detalhe = await request(app.getHttpServer())
        .get(`/api/consulta/${consultaId}`)
        .set('Authorization', `Bearer ${tokenSessao2}`)
        .expect(200);
      const corpoDetalhe = detalhe.body as {
        prescricoes: { medicamentos: unknown[] }[];
      };
      expect(corpoDetalhe.prescricoes[0].medicamentos).toHaveLength(1); // prescrição recuperada, dado real
    });
  });

  // ============================================================
  // CENÁRIO 3 — Isolamento entre usuários
  // ============================================================
  describe('Cenário 3 — Isolamento entre usuários', () => {
    it('após logout de A e login de B no mesmo "navegador" (mesma app Nest), nenhum dado de A aparece para B, e o histórico de B é carregado separadamente', async () => {
      await seedUsuario('medico.a3@teste.local', 'SenhaForte123!');
      await seedUsuario('medico.b3@teste.local', 'OutraSenha456!');

      const tokenA = await login('medico.a3@teste.local', 'SenhaForte123!');
      const consultaDeA = await criarConsulta(tokenA, 'idem-c3-a');

      // Logout de A — revoga os refresh tokens de A (a garantia real do
      // backend); o isolamento de leitura em si é garantido pelo filtro
      // de ownership em toda query, testado explicitamente abaixo.
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      // B autentica "no mesmo navegador" — nesta suíte, isso significa
      // a mesma instância de app/Nest/FakeDb, uma nova sessão de B.
      const tokenB = await login('medico.b3@teste.local', 'OutraSenha456!');
      const consultaDeB = await criarConsulta(tokenB, 'idem-c3-b');

      // B nunca vê a consulta de A na listagem.
      const listaDeB = await request(app.getHttpServer())
        .get('/api/consultas')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);
      const corpoListaB = listaDeB.body as {
        total: number;
        consultas: { id: string }[];
      };
      expect(corpoListaB.total).toBe(1);
      expect(corpoListaB.consultas.map((c) => c.id)).toEqual([consultaDeB]);
      expect(corpoListaB.consultas.some((c) => c.id === consultaDeA)).toBe(
        false,
      );

      // B nunca consegue abrir o detalhe da consulta de A, mesmo
      // conhecendo o id (nenhum dado clínico de A vaza, nem por acesso direto).
      await request(app.getHttpServer())
        .get(`/api/consulta/${consultaDeA}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });
  });

  // ============================================================
  // CENÁRIO 5 — Paginação
  // ============================================================
  describe('Cenário 5 — Paginação', () => {
    it('primeira página, "carregar mais", sem duplicatas, ordem correta (mais recente primeiro), fim da lista', async () => {
      await seedUsuario('medico.pag@teste.local', 'SenhaForte123!');
      const token = await login('medico.pag@teste.local', 'SenhaForte123!');

      // Cria 25 consultas com timestamps distintos e crescentes —
      // garante ordenação determinística por `criado_em desc`.
      const idsCriados: string[] = [];
      for (let i = 0; i < 25; i++) {
        const id = await criarConsulta(token, `idem-pag-${i}`);
        idsCriados.push(id);
        // Avança o relógio artificialmente no FakeDb não é necessário:
        // cada `new Date()` já é estritamente crescente entre chamadas
        // sequenciais reais o bastante para desempatar a ordenação.
      }
      const idsEsperadosDesc = [...idsCriados].reverse(); // mais recente primeiro

      const pagina1 = await request(app.getHttpServer())
        .get('/api/consultas?pagina=1&limite=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const corpo1 = pagina1.body as {
        total: number;
        consultas: { id: string }[];
      };
      expect(corpo1.total).toBe(25);
      expect(corpo1.consultas).toHaveLength(10);
      expect(corpo1.consultas.map((c) => c.id)).toEqual(
        idsEsperadosDesc.slice(0, 10),
      );

      const pagina2 = await request(app.getHttpServer())
        .get('/api/consultas?pagina=2&limite=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const corpo2 = pagina2.body as {
        total: number;
        consultas: { id: string }[];
      };
      expect(corpo2.consultas).toHaveLength(10);
      expect(corpo2.consultas.map((c) => c.id)).toEqual(
        idsEsperadosDesc.slice(10, 20),
      );

      const pagina3 = await request(app.getHttpServer())
        .get('/api/consultas?pagina=3&limite=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const corpo3 = pagina3.body as {
        total: number;
        consultas: { id: string }[];
      };
      expect(corpo3.consultas).toHaveLength(5); // fim da lista — última página parcial
      expect(corpo3.consultas.map((c) => c.id)).toEqual(
        idsEsperadosDesc.slice(20, 25),
      );

      // Sem duplicatas entre as 3 páginas.
      const todosOsIds = [
        ...corpo1.consultas,
        ...corpo2.consultas,
        ...corpo3.consultas,
      ].map((c) => c.id);
      expect(new Set(todosOsIds).size).toBe(25);

      // Página além do fim: vazia, nunca um erro.
      const pagina4 = await request(app.getHttpServer())
        .get('/api/consultas?pagina=4&limite=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect((pagina4.body as { consultas: unknown[] }).consultas).toEqual([]);
    });
  });

  // ============================================================
  // CENÁRIO 7 — Erro e recuperação
  // ============================================================
  describe('Cenário 7 — Erro e recuperação', () => {
    it('401: sem token, ou com token inválido, a UI nunca recebe uma resposta de sucesso fabricada', async () => {
      await request(app.getHttpServer()).get('/api/consultas').expect(401);
      await request(app.getHttpServer())
        .get('/api/consultas')
        .set('Authorization', 'Bearer token-forjado-invalido')
        .expect(401);
    });

    it('500: uma falha real do servidor durante a criação NUNCA persiste a consulta nem retorna sucesso', async () => {
      await seedUsuario('medico.erro@teste.local', 'SenhaForte123!');
      const token = await login('medico.erro@teste.local', 'SenhaForte123!');

      // Simula uma falha real e imprevista da camada de persistência
      // (ex.: conexão derrubada no meio da escrita) — não uma condição
      // de erro "amigável" do domínio, mas uma exceção genuína.
      //
      // `criarFakePrismaService` retorna `any` deliberadamente (ver
      // test/support/fake-prisma.ts) — o monkey-patch abaixo mexe
      // diretamente no método em runtime, sem contrato de tipo a preservar.
      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
      const prismaFake = criarFakePrismaService(db);
      const criarOriginal = prismaFake.consulta.create;
      let chamadas = 0;
      prismaFake.consulta.create = (
        ...args: Parameters<typeof criarOriginal>
      ) => {
        chamadas += 1;
        if (chamadas === 1)
          throw new Error('Falha simulada de conexão com o banco');
        return criarOriginal(...args);
      };
      /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */

      const moduleComFalha: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          PrismaModule,
          CacheModule,
          AuthModule,
          ConsultaModule,
        ],
      })
        .overrideProvider(PrismaService)
        .useValue(prismaFake)
        .overrideProvider(CacheService)
        .useValue({ key: jest.fn(), getOrSet: jest.fn() })
        .compile();
      const appComFalha: INestApplication<App> =
        moduleComFalha.createNestApplication();
      appComFalha.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      await appComFalha.init();

      await request(appComFalha.getHttpServer())
        .post('/api/consulta')
        .set('Authorization', `Bearer ${token}`)
        .send({
          anamnese: { queixa_principal: 'Dor' },
          idempotency_key: 'idem-falha-500',
        })
        .expect(500); // nunca 200/201 fabricado

      expect(db.consultas).toHaveLength(0); // nada foi persistido pela tentativa que falhou

      await appComFalha.close();
    });

    it('retry sem duplicação: reenviar a MESMA idempotency_key após sucesso retorna o MESMO registro, nunca cria um segundo', async () => {
      await seedUsuario('medico.retry@teste.local', 'SenhaForte123!');
      const token = await login('medico.retry@teste.local', 'SenhaForte123!');

      const primeira = await request(app.getHttpServer())
        .post('/api/consulta')
        .set('Authorization', `Bearer ${token}`)
        .send({
          anamnese: { queixa_principal: 'Tosse' },
          idempotency_key: 'idem-retry-1',
        })
        .expect(201);

      // Reenvio (simula timeout no cliente que já persistiu no servidor,
      // ou um retry automático de rede) — MESMA idempotency_key.
      const segunda = await request(app.getHttpServer())
        .post('/api/consulta')
        .set('Authorization', `Bearer ${token}`)
        .send({
          anamnese: { queixa_principal: 'Tosse' },
          idempotency_key: 'idem-retry-1',
        })
        .expect(201);

      expect((segunda.body as { id: string }).id).toBe(
        (primeira.body as { id: string }).id,
      );
      expect(db.consultas).toHaveLength(1); // nunca duplicado no "banco"
    });
  });
});
