/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return -- respostas HTTP/linhas SQL são `any`; o que importa são as asserções. */
import { spawn, execFileSync, ChildProcess } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import pg from 'pg';
import { AuthModule } from '../src/auth/auth.module';
import { ConsultaModule } from '../src/modules/consulta/consulta.module';
import { ConsultaService } from '../src/modules/consulta/consulta.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CacheModule } from '../src/modules/cache/cache.module';
import { CacheService } from '../src/modules/cache/cache.service';
import {
  fingerprintPrescricao,
  fingerprintDeRegistroPersistido,
} from '../src/modules/consulta/prescricao-fingerprint.util';

// ============================================================
// RM-107.1.1-E2.5.1 — Idempotência da prescrição contra PostgreSQL CONVENCIONAL (servidor `postgres` multiprocesso; NÃO PGlite, NÃO mock).
//
// Só roda via `scripts/test-e2e-postgres-convencional.mjs` (PG_CONVENCIONAL=1 + PG_CTL/PGDATA/PG_PORT/DATABASE_URL). Sem isso é PULADA e não comprova nada.
// Duas instâncias INDEPENDENTES da aplicação (processos Node distintos) + uma instância em processo (para SQL direto/injeção de falhas) acessam o MESMO banco.
// Reinícios REAIS do servidor PostgreSQL (`pg_ctl stop -m fast|immediate` + `start`) são feitos aqui.
// Critérios estritos nos testes de concorrência: nenhum 401/5xx, nenhum 409 para conteúdo idêntico, ≤1 linha, 1 auditoria, todo 2xx = registro gravado.
// ============================================================

jest.setTimeout(300_000);
const ATIVO = process.env.PG_CONVENCIONAL === '1' && !!process.env.DATABASE_URL;
const describeOuSkip = ATIVO ? describe : describe.skip;
if (!ATIVO)
  console.warn(
    '[pg-convencional] PG_CONVENCIONAL/DATABASE_URL ausentes — suíte PULADA (nenhuma comprovação em PostgreSQL convencional).',
  );

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BASE_PORT = 3100 + (process.pid % 500);

type Resp = { status: number; body: any };

describeOuSkip(
  'Idempotência com fingerprint — PostgreSQL CONVENCIONAL, multiprocesso (e2e)',
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let jwt: JwtService;
    let consultaSvc: ConsultaService;
    let auditSvc: AuditService;
    let pool: pg.Pool;
    const saidas: Record<string, () => string> = {};
    const procs: Record<
      string,
      { child: ChildProcess; port: number; pid: number }
    > = {};

    const sufixo = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const emailA = `conv-a-${sufixo}@x.com`;
    const emailB = `conv-b-${sufixo}@x.com`;
    let usuarioA: string;
    let usuarioB: string;
    let consultaA1: string;
    let consultaA2: string;
    let consultaB1: string;
    let n = 0;
    const chave = (r: string) => `e251-${r}-${sufixo}-${++n}-${'x'.repeat(8)}`;
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

    // ── infraestrutura ────────────────────────────────────────────────────────
    const envFilho = () => ({ ...process.env, TS_NODE_TRANSPILE_ONLY: 'true' });
    function iniciarProcesso(nome: string, port: number): Promise<void> {
      return new Promise((resolve, reject) => {
        const child = spawn(
          process.execPath,
          [
            '-r',
            'ts-node/register/transpile-only',
            path.join('test', 'support', 'app-process.ts'),
            String(port),
          ],
          { env: envFilho(), stdio: ['ignore', 'pipe', 'pipe'] },
        );
        let buf = '';
        saidas[nome] = () => buf;
        const timer = setTimeout(() => {
          child.kill('SIGKILL');
          reject(new Error(`processo ${nome} não ficou pronto: ${buf}`));
        }, 120_000);
        const onData = (d: Buffer) => {
          buf += d.toString();
          const m = /READY (\d+) (\d+)/.exec(buf);
          if (m) {
            clearTimeout(timer);
            procs[nome] = { child, port, pid: Number(m[1]) };
            resolve();
          }
        };
        child.stdout.on('data', onData);
        child.stderr.on('data', onData);
        child.on('exit', (c) => {
          clearTimeout(timer);
          if (!procs[nome])
            reject(new Error(`processo ${nome} saiu (${c}): ${buf}`));
        });
      });
    }
    const matar = async (nome: string) => {
      const p = procs[nome];
      if (!p) return;
      p.child.kill('SIGKILL');
      await sleep(500);
      delete procs[nome];
    };

    async function http2(
      port: number,
      metodo: string,
      rota: string,
      token?: string,
      body?: unknown,
    ): Promise<Resp> {
      try {
        return await http2Interno(port, metodo, rota, token, body);
      } catch (e) {
        // -1 = sem resposta (timeout/conexão recusada): registrado, NUNCA contado como sucesso.
        return { status: -1, body: `falha de transporte: ${String(e)}` };
      }
    }
    async function http2Interno(
      port: number,
      metodo: string,
      rota: string,
      token?: string,
      body?: unknown,
    ): Promise<Resp> {
      const r = await fetch(`http://127.0.0.1:${port}${rota}`, {
        signal: AbortSignal.timeout(20_000),
        method: metodo,
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const txt = await r.text();
      let b: any = txt;
      try {
        b = JSON.parse(txt);
      } catch {
        /* texto */
      }
      return { status: r.status, body: b };
    }
    const portaDe = (i: number) => procs[i % 2 === 0 ? 'A' : 'B'].port;
    const postar = (i: number, token: string, body: Record<string, unknown>) =>
      http2(portaDe(i), 'POST', '/api/prescricao', token, body);
    const tokenDe = (id: string, email: string) =>
      jwt.signAsync(
        { sub: id, email, perfil: 'MEDICO' },
        { secret: process.env.JWT_SECRET, expiresIn: '60m' },
      );
    const q = async (sql: string, params: unknown[] = []) =>
      (await pool.query(sql, params)).rows;
    const contar = async (k: string) =>
      Number(
        (
          await q(
            'select count(*)::int as c from prescricoes where idempotency_key = $1',
            [k],
          )
        )[0].c,
      );
    const auditorias = async (id: string) =>
      Number(
        (
          await q(
            'select count(*)::int as c from auditoria where recurso = $1',
            [`prescricao:${id}`],
          )
        )[0].c,
      );

    const PG_PORT = process.env.PG_PORT!;
    const pgCtl = (...args: string[]) =>
      execFileSync(process.env.PG_CTL!, ['-D', process.env.PGDATA!, ...args], {
        // 'ignore': com 'pipe' o postmaster iniciado por `pg_ctl start` herda o pipe e execFileSync nunca retorna (hang observado na rodada 1/3).
        stdio: 'ignore',
        windowsHide: true,
      });
    const pararPg = (modo: 'fast' | 'immediate') =>
      pgCtl('-m', modo, '-w', 'stop');
    const iniciarPg = () =>
      pgCtl(
        '-o',
        `-p ${PG_PORT} -c max_connections=200 -c listen_addresses=127.0.0.1`,
        '-l',
        process.env.PG_LOG!,
        '-w',
        'start',
      );
    async function aguardarPg(): Promise<void> {
      for (let i = 0; i < 60; i++) {
        try {
          const c = new pg.Client({
            connectionString: process.env.DATABASE_URL,
          });
          await c.connect();
          await c.query('select 1');
          await c.end();
          return;
        } catch {
          await sleep(500);
        }
      }
      throw new Error('PostgreSQL não voltou a aceitar conexões');
    }
    /** Após reinício do servidor, os pools da aplicação podem ter conexões mortas: registra a PRIMEIRA tentativa e repete (mesma chave ⇒ seguro). */
    async function aposReinicio(
      i: number,
      token: string,
      body: Record<string, unknown>,
    ): Promise<{ primeira: number; final: Resp }> {
      let primeira = 0;
      let r: Resp = { status: 0, body: null };
      for (let t = 0; t < 6; t++) {
        r = await postar(i, token, body);
        if (t === 0) primeira = r.status;
        if (r.status === 201) break;
        await sleep(700);
      }
      return { primeira, final: r };
    }

    beforeAll(async () => {
      pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        max: 4,
      });
      pool.on('error', () => undefined); // conexões ociosas do próprio teste encerradas pelo reinício do servidor
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
      consultaSvc = mod.get(ConsultaService);
      auditSvc = mod.get(AuditService, { strict: false });
      await Promise.all([
        iniciarProcesso('A', BASE_PORT),
        iniciarProcesso('B', BASE_PORT + 1),
      ]);
      for (const [email, crm] of [
        [emailA, `CA${Date.now().toString(36)}`],
        [emailB, `CB${Date.now().toString(36)}`],
      ] as const) {
        const r = await http2(
          procs.A.port,
          'POST',
          '/auth/register',
          undefined,
          {
            email,
            senha: 'SenhaForte123!',
            crm,
            especialidade: 'clinica_medica',
            uf: 'SP',
          },
        );
        expect(r.status).toBe(201);
      }
      usuarioA = (await prisma.usuario.findUnique({
        where: { email: emailA },
      }))!.id;
      usuarioB = (await prisma.usuario.findUnique({
        where: { email: emailB },
      }))!.id;
      const tA = await tokenDe(usuarioA, emailA);
      const tB = await tokenDe(usuarioB, emailB);
      const nova = async (t: string) =>
        (
          await http2(procs.B.port, 'POST', '/api/consulta', t, {
            anamnese: { queixa_principal: 'e2.5.1' },
          })
        ).body.id as string;
      consultaA1 = await nova(tA);
      consultaA2 = await nova(tA);
      consultaB1 = await nova(tB);
    });

    afterAll(async () => {
      await Promise.all(Object.keys(procs).map(matar));
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
        await prisma.usuario
          .delete({ where: { id: u } })
          .catch(() => undefined);
      }
      await app.close();
      await pool.end();
    });
    afterEach(() => jest.restoreAllMocks());

    it('0. IDENTIFICAÇÃO DO BANCO: servidor PostgreSQL convencional (não PGlite), múltiplos processos de aplicação distintos', async () => {
      const [v] = await q(
        "select version() as v, current_setting('server_version') as sv, pg_postmaster_start_time() as t",
      );
      console.warn(
        `[pg-convencional] BANCO: ${v.v} | server_version=${v.sv} | iniciado em ${v.t.toISOString()}`,
      );
      expect(v.v).toMatch(/^PostgreSQL 16/);
      expect(v.v).not.toMatch(/pglite|wasm/i);
      expect(new Set([procs.A.pid, procs.B.pid, process.pid]).size).toBe(3); // 2 processos independentes + o do teste
      const m = await q(
        'select count(*)::int as c from pg_stat_activity where datname = current_database()',
      );
      console.warn(
        `[pg-convencional] processos da aplicação: A=${procs.A.pid} B=${procs.B.pid} teste=${process.pid}; conexões ativas no banco: ${m[0].c}`,
      );
    });

    it('1. criação inicial: grava conteúdo e fingerprint canônico; 1 auditoria', async () => {
      const t = await tokenDe(usuarioA, emailA);
      const k = chave('primeira');
      const r = await postar(0, t, corpo(consultaA1, k));
      expect(r.status).toBe(201);
      const [l] = await q(
        'select idempotency_fingerprint as fp, medicamentos from prescricoes where id = $1',
        [r.body.id],
      );
      expect(l.fp).toBe(
        fingerprintPrescricao({
          consulta_id: consultaA1,
          medicamentos: medicamentos(),
        }),
      );
      expect(l.medicamentos).toEqual(medicamentos());
      expect(await auditorias(r.body.id)).toBe(1);
    });

    it('2. repetição idêntica, alternando entre as DUAS instâncias: mesmo registro, nunca 409', async () => {
      const t = await tokenDe(usuarioA, emailA);
      const k = chave('identica');
      const rs: Resp[] = [];
      for (let i = 0; i < 6; i++)
        rs.push(await postar(i, t, corpo(consultaA1, k)));
      expect(rs.map((r) => r.status)).toEqual(Array(6).fill(201));
      expect(new Set(rs.map((r) => r.body.id)).size).toBe(1);
      expect(await contar(k)).toBe(1);
      expect(await auditorias(rs[0].body.id)).toBe(1);
    });

    it('3. repetição divergente (instância diferente da que criou): 409 explícito; original intacto; resposta sem conteúdo', async () => {
      const t = await tokenDe(usuarioA, emailA);
      const k = chave('diverge');
      const orig = await postar(0, t, corpo(consultaA1, k));
      expect(orig.status).toBe(201);
      for (const v of [
        { medicamentos: medicamentos(501) },
        { medicamentos: [{ ...medicamentos()[0], duracao: '10 dias' }] },
        { orientacoes: 'x' },
        { validade_dias: 60 },
      ]) {
        const r = await postar(1, t, corpo(consultaA1, k, v));
        expect(r.status).toBe(409);
        expect(JSON.stringify(r.body)).not.toMatch(/Amoxicilina/);
      }
      expect(await contar(k)).toBe(1);
      expect(
        (
          await q('select medicamentos from prescricoes where id = $1', [
            orig.body.id,
          ])
        )[0].medicamentos,
      ).toEqual(medicamentos());
    });

    it('4. colisão REAL da constraint única (P2002) de forma determinística, contra o servidor convencional', async () => {
      const t = await tokenDe(usuarioA, emailA);
      const k = chave('p2002');
      const orig = await postar(0, t, corpo(consultaA1, k));
      expect(orig.status).toBe(201);
      const dto = (v: number) =>
        ({
          consulta_id: consultaA1,
          medicamentos: medicamentos(v),
          idempotency_key: k,
        }) as never;
      jest
        .spyOn(prisma.prescricao, 'findUnique')
        .mockImplementationOnce((() => Promise.resolve(null)) as never);
      expect((await consultaSvc.criarPrescricao(dto(500), usuarioA)).id).toBe(
        orig.body.id,
      );
      jest
        .spyOn(prisma.prescricao, 'findUnique')
        .mockImplementationOnce((() => Promise.resolve(null)) as never);
      await expect(
        consultaSvc.criarPrescricao(dto(777), usuarioA),
      ).rejects.toMatchObject({ status: 409 });
      expect(await contar(k)).toBe(1);
    });

    it('5. ≥10 requisições SIMULTÂNEAS idênticas (24) entre DUAS instâncias: todas 201, mesmo id, 1 linha, 1 auditoria — nenhum 401/409/5xx', async () => {
      const t = await tokenDe(usuarioA, emailA);
      const k = chave('simultanea');
      const rs = await Promise.all(
        Array.from({ length: 24 }, (_, i) =>
          postar(i, t, corpo(consultaA1, k)),
        ),
      );
      const dist = rs.reduce(
        (m: Record<string, number>, r) => ({
          ...m,
          [r.status]: (m[r.status] ?? 0) + 1,
        }),
        {},
      );
      console.warn(
        `[pg-convencional] 24 idênticas simultâneas — distribuição de status: ${JSON.stringify(dist)}`,
      );
      expect(dist).toEqual({ 201: 24 });
      expect(new Set(rs.map((r) => r.body.id)).size).toBe(1);
      expect(await contar(k)).toBe(1);
      expect(await auditorias(rs[0].body.id)).toBe(1);
    });

    it('6. requisições SIMULTÂNEAS com conteúdos DIFERENTES e mesma chave (12) entre DUAS instâncias: 1 vencedor; todo 201 = conteúdo gravado; demais 409; nenhum 401/5xx', async () => {
      const t = await tokenDe(usuarioA, emailA);
      const k = chave('colisao');
      const valores = Array.from({ length: 12 }, (_, i) => 600 + i);
      const rs = await Promise.all(
        valores.map((v, i) =>
          postar(i, t, corpo(consultaA1, k, { medicamentos: medicamentos(v) })),
        ),
      );
      const dist = rs.reduce(
        (m: Record<string, number>, r) => ({
          ...m,
          [r.status]: (m[r.status] ?? 0) + 1,
        }),
        {},
      );
      console.warn(
        `[pg-convencional] 12 conteúdos diferentes, mesma chave — distribuição de status: ${JSON.stringify(dist)}`,
      );
      const linhas = await q(
        'select id, medicamentos from prescricoes where idempotency_key = $1',
        [k],
      );
      expect(linhas).toHaveLength(1);
      const gravado = linhas[0].medicamentos[0].dose.valor;
      expect(valores).toContain(gravado);
      rs.forEach((r, i) => {
        if (r.status === 201) {
          expect(r.body.id).toBe(linhas[0].id);
          expect(valores[i]).toBe(gravado);
        } else {
          expect(r.status).toBe(409);
        }
      });
      expect(rs.filter((r) => r.status === 201).length).toBe(1); // só a requisição cujo conteúdo foi gravado
      expect(await auditorias(linhas[0].id)).toBe(1);
    });

    it('7. mesma chave criada concorrentemente por instâncias diferentes e depois lida pela terceira (em processo): registro único e fingerprint coerente', async () => {
      const t = await tokenDe(usuarioA, emailA);
      const k = chave('tres-instancias');
      const rs = await Promise.all([
        postar(0, t, corpo(consultaA1, k)),
        postar(1, t, corpo(consultaA1, k)),
        (async () => {
          const r = await consultaSvc.criarPrescricao(
            {
              consulta_id: consultaA1,
              medicamentos: medicamentos() as never,
              idempotency_key: k,
            },
            usuarioA,
          );
          return { status: 201, body: r };
        })(),
      ]);
      expect(rs.map((r) => r.status)).toEqual([201, 201, 201]);
      expect(new Set(rs.map((r) => r.body.id)).size).toBe(1);
      expect(await contar(k)).toBe(1);
      expect(
        (
          await q(
            'select idempotency_fingerprint as fp from prescricoes where idempotency_key = $1',
            [k],
          )
        )[0].fp,
      ).toBe(
        fingerprintPrescricao({
          consulta_id: consultaA1,
          medicamentos: medicamentos(),
        }),
      );
    });

    it('8. reinício da APLICAÇÃO (kill do processo + novo processo): a idempotência continua; divergência continua 409', async () => {
      const t = await tokenDe(usuarioA, emailA);
      const k = chave('reinicio-app');
      const antes = await postar(0, t, corpo(consultaA1, k));
      expect(antes.status).toBe(201);
      const pidAntigo = procs.A.pid;
      await matar('A');
      await iniciarProcesso('A', BASE_PORT);
      expect(procs.A.pid).not.toBe(pidAntigo);
      const depois = await postar(0, t, corpo(consultaA1, k));
      expect(depois.status).toBe(201);
      expect(depois.body.id).toBe(antes.body.id);
      expect(
        (
          await postar(
            0,
            t,
            corpo(consultaA1, k, { medicamentos: medicamentos(42) }),
          )
        ).status,
      ).toBe(409);
      expect(await contar(k)).toBe(1);
    });

    it.each(['fast', 'immediate'] as const)(
      '9. reinício do SERVIDOR PostgreSQL (%s): registros e fingerprints persistem; a repetição devolve o mesmo registro; a divergência continua 409',
      async (modo) => {
        const t = await tokenDe(usuarioA, emailA);
        const k = chave(`reinicio-pg-${modo}`);
        const [{ t: t0 }] = await q('select pg_postmaster_start_time() as t');
        const antes = await postar(0, t, corpo(consultaA1, k));
        expect(antes.status).toBe(201);
        const [{ fp: fpAntes }] = await q(
          'select idempotency_fingerprint as fp from prescricoes where id = $1',
          [antes.body.id],
        );
        pararPg(modo); // 'immediate' = parada abrupta (sem checkpoint) ⇒ recuperação por WAL no próximo start
        iniciarPg();
        await aguardarPg();
        const [{ t: t1 }] = await q('select pg_postmaster_start_time() as t');
        expect(new Date(t1).getTime()).toBeGreaterThan(new Date(t0).getTime()); // o servidor REALMENTE reiniciou
        expect(
          (
            await q(
              'select idempotency_fingerprint as fp from prescricoes where id = $1',
              [antes.body.id],
            )
          )[0].fp,
        ).toBe(fpAntes);
        const r = await aposReinicio(1, t, corpo(consultaA1, k));
        console.warn(
          `[pg-convencional] reinício ${modo}: primeira requisição pós-reinício → ${r.primeira}; final → ${r.final.status} ${r.final.status === 201 ? '' : JSON.stringify(r.final.body)}`,
        );
        if (r.final.status !== 201)
          console.warn(`[pg-convencional] saída do processo B:
${(saidas.B?.() ?? '').slice(-1500)}`);
        expect(r.final.status).toBe(201);
        expect(r.final.body.id).toBe(antes.body.id);
        expect(
          (
            await postar(
              0,
              t,
              corpo(consultaA1, k, { medicamentos: medicamentos(43) }),
            )
          ).status,
        ).toBe(409);
        expect(await contar(k)).toBe(1);
        expect(await auditorias(antes.body.id)).toBe(1);
      },
    );

    it('10. falha na AUDITORIA ⇒ rollback integral (0 prescrições, 0 auditorias); nova tentativa com a mesma chave cria; 1 auditoria', async () => {
      const t = await tokenDe(usuarioA, emailA);
      const k = chave('rollback');
      jest
        .spyOn(auditSvc, 'registrarAuditoria')
        .mockRejectedValueOnce(new Error('falha de auditoria injetada'));
      // A injeção só vale na instância EM PROCESSO (spy): usa o serviço diretamente para provar o rollback no banco convencional.
      await expect(
        consultaSvc.criarPrescricao(
          {
            consulta_id: consultaA1,
            medicamentos: medicamentos() as never,
            idempotency_key: k,
          },
          usuarioA,
        ),
      ).rejects.toThrow('falha de auditoria injetada');
      expect(await contar(k)).toBe(0);
      const r = await postar(1, t, corpo(consultaA1, k));
      expect(r.status).toBe(201);
      expect(await contar(k)).toBe(1);
      expect(await auditorias(r.body.id)).toBe(1);
    });

    it('11. resposta perdida após commit — (a) falha injetada após o commit e (b) CONEXÃO TCP abortada pelo cliente: a repetição devolve o mesmo registro', async () => {
      const t = await tokenDe(usuarioA, emailA);
      // (a)
      const ka = chave('perdida-a');
      const original = consultaSvc.criarPrescricao.bind(consultaSvc);
      jest
        .spyOn(consultaSvc, 'criarPrescricao')
        .mockImplementationOnce(async (dto, uid) => {
          await original(dto, uid);
          throw new Error('resposta perdida após gravação');
        });
      await expect(
        consultaSvc.criarPrescricao(
          {
            consulta_id: consultaA1,
            medicamentos: medicamentos() as never,
            idempotency_key: ka,
          },
          usuarioA,
        ),
      ).rejects.toThrow('resposta perdida');
      expect(await contar(ka)).toBe(1);
      const ra = await postar(0, t, corpo(consultaA1, ka));
      expect(ra.status).toBe(201);
      expect(await contar(ka)).toBe(1);
      // (b) conexão abortada pelo cliente logo após o envio; o servidor conclui a operação
      const kb = chave('perdida-b');
      await new Promise<void>((resolve) => {
        const body = JSON.stringify(corpo(consultaA1, kb));
        const req = http.request({
          host: '127.0.0.1',
          port: procs.B.port,
          path: '/api/prescricao',
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(body),
            authorization: `Bearer ${t}`,
          },
        });
        req.on('error', () => undefined);
        req.write(body);
        req.end();
        setTimeout(() => {
          req.destroy();
          resolve();
        }, 5);
      });
      for (let i = 0; i < 40 && (await contar(kb)) === 0; i++) await sleep(250);
      expect(await contar(kb)).toBe(1); // o servidor gravou mesmo sem entregar a resposta
      const rb = await postar(0, t, corpo(consultaA1, kb));
      expect(rb.status).toBe(201);
      expect(
        (
          await q('select id from prescricoes where idempotency_key = $1', [kb])
        )[0].id,
      ).toBe(rb.body.id);
      expect(await contar(kb)).toBe(1);
      expect(await auditorias(rb.body.id)).toBe(1);
    });

    it('12. isolamento: mesma chave em OUTRA consulta do mesmo médico, em consulta de OUTRO proprietário e na consulta alheia ⇒ 403; nada criado nem vazado', async () => {
      const tA = await tokenDe(usuarioA, emailA);
      const tB = await tokenDe(usuarioB, emailB);
      const k = chave('isolamento');
      const orig = await postar(0, tA, corpo(consultaA1, k));
      expect(orig.status).toBe(201);
      const rs = [
        await postar(1, tA, corpo(consultaA2, k)),
        await postar(0, tB, corpo(consultaB1, k)),
        await postar(1, tB, corpo(consultaA1, k)),
      ];
      expect(rs.map((r) => r.status)).toEqual([403, 403, 403]);
      expect(JSON.stringify(rs.map((r) => r.body))).not.toContain(orig.body.id);
      expect(await contar(k)).toBe(1);
    });

    it('13. LEGADO no servidor convencional: fingerprint NULL (comparação derivada do conteúdo), sem chave, conteúdo ilegível — comparável ⇒ compara; não comparável ⇒ comportamento legado', async () => {
      const t = await tokenDe(usuarioA, emailA);
      const k1 = chave('legado-null');
      const l1 = await prisma.prescricao.create({
        data: {
          consulta_id: consultaA1,
          medicamentos: medicamentos() as never,
          hash_integridade: 'legado',
          idempotency_key: k1,
        },
      });
      const igual = await postar(0, t, corpo(consultaA1, k1));
      expect(igual.status).toBe(201);
      expect(igual.body.id).toBe(l1.id);
      expect(
        (
          await postar(
            1,
            t,
            corpo(consultaA1, k1, { medicamentos: medicamentos(9) }),
          )
        ).status,
      ).toBe(409);
      expect(
        (
          await q(
            'select idempotency_fingerprint as fp from prescricoes where id = $1',
            [l1.id],
          )
        )[0].fp,
      ).toBeNull(); // sem backfill
      const k2 = chave('legado-ilegivel');
      const l2 = await prisma.prescricao.create({
        data: {
          consulta_id: consultaA1,
          medicamentos: { nao: 'e array' } as never,
          hash_integridade: 'legado',
          idempotency_key: k2,
        },
      });
      const naoComparavel = await postar(
        0,
        t,
        corpo(consultaA1, k2, { medicamentos: medicamentos(12345) }),
      );
      expect(naoComparavel.status).toBe(201);
      expect(naoComparavel.body.id).toBe(l2.id); // conteúdo não comparável ⇒ NÃO se afirma divergência nem igualdade: comportamento legado
      const k3 = chave('legado-com-fp');
      const l3 = await prisma.prescricao.create({
        data: {
          consulta_id: consultaA1,
          medicamentos: medicamentos() as never,
          hash_integridade: 'x',
          idempotency_key: k3,
          idempotency_fingerprint: fingerprintPrescricao({
            consulta_id: consultaA1,
            medicamentos: medicamentos(),
          }),
        },
      });
      expect((await postar(1, t, corpo(consultaA1, k3))).body.id).toBe(l3.id);
      const semChave = await postar(0, t, {
        consulta_id: consultaA1,
        medicamentos: medicamentos(),
      });
      const semChave2 = await postar(1, t, {
        consulta_id: consultaA1,
        medicamentos: medicamentos(),
      });
      expect(semChave.body.id).not.toBe(semChave2.body.id);
    });

    it('14. CANONICALIZAÇÃO × DADOS PERSISTIDOS: para TODA linha desta execução, o fingerprint gravado é igual ao derivado do conteúdo lido do banco (round-trip jsonb)', async () => {
      const linhas = await q(
        'select id, consulta_id, diagnostico_id, medicamentos, orientacoes, validade_dias, idempotency_fingerprint as fp from prescricoes where idempotency_fingerprint is not null and consulta_id in ($1,$2,$3)',
        [consultaA1, consultaA2, consultaB1],
      );
      expect(linhas.length).toBeGreaterThan(5);
      for (const l of linhas)
        expect(fingerprintDeRegistroPersistido(l)).toBe(l.fp);
      console.warn(
        `[pg-convencional] canonicalização×persistido: ${linhas.length} linhas conferidas`,
      );
    });
  },
);
