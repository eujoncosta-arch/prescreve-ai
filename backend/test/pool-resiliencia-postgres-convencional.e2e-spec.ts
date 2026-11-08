/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return -- respostas HTTP/linhas SQL são `any`; o que importa são as asserções. */
import { spawn, execFileSync, ChildProcess } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import pg from 'pg';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// ============================================================
// RM-107.1.1-E2.6 — Resiliência do pool PostgreSQL (Prisma + pg.Pool) contra servidor CONVENCIONAL.
// Roda só via scripts/test-e2e-postgres-convencional.mjs (PG_CONVENCIONAL=1 …). Cada processo da aplicação é INDEPENDENTE (para observar
// queda/encerramento reais, stderr e código de saída) e acessa o banco por um PROXY TCP controlado pelo teste (forward / blackhole / reset).
// Este spec OBSERVA e registra: falhas transitórias, indisponibilidade persistente e hangs NÃO são convertidos em "sucesso" por tolerância do teste.
// ============================================================

jest.setTimeout(420_000);
const ATIVO = process.env.PG_CONVENCIONAL === '1' && !!process.env.DATABASE_URL;
const describeOuSkip = ATIVO ? describe : describe.skip;
if (!ATIVO)
  console.warn(
    '[pool-resiliencia] PG_CONVENCIONAL/DATABASE_URL ausentes — suíte PULADA.',
  );

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Resp = { status: number; body: any; ms: number };
const PORTA_APP = 3600 + (process.pid % 300);
const PORTA_PROXY = 56000 + (process.pid % 500);

/** Proxy TCP entre a aplicação e o PostgreSQL: encaminha, descarta bytes mantendo sockets abertos (blackhole) ou derruba todas as conexões. */
function criarProxy(portaLocal: number, portaAlvo: number) {
  let modo: 'forward' | 'blackhole' = 'forward';
  const pares = new Set<[net.Socket, net.Socket]>();
  let aceitas = 0;
  const servidor = net.createServer((c) => {
    aceitas++;
    const t = net.connect(portaAlvo, '127.0.0.1');
    const par: [net.Socket, net.Socket] = [c, t];
    pares.add(par);
    c.on('data', (d) => {
      if (modo === 'forward') t.write(d);
    });
    t.on('data', (d) => {
      if (modo === 'forward') c.write(d);
    });
    const fim = () => {
      c.destroy();
      t.destroy();
      pares.delete(par);
    };
    c.on('error', fim);
    t.on('error', fim);
    c.on('close', fim);
    t.on('close', fim);
  });
  return {
    iniciar: () =>
      new Promise<void>((r) =>
        servidor.listen(portaLocal, '127.0.0.1', () => r()),
      ),
    modo: (m: 'forward' | 'blackhole') => {
      modo = m;
    },
    derrubarConexoes: () => {
      for (const [c, t] of [...pares]) {
        c.destroy();
        t.destroy();
      }
    },
    abertas: () => pares.size,
    aceitas: () => aceitas,
    fechar: () =>
      new Promise<void>((r) => {
        for (const [c, t] of [...pares]) {
          c.destroy();
          t.destroy();
        }
        servidor.close(() => r());
      }),
  };
}

describeOuSkip(
  'Pool PostgreSQL — resiliência (Prisma + pg.Pool) contra servidor convencional (e2e)',
  () => {
    const PG_PORT = process.env.PG_PORT!;
    const urlProxy = process.env.DATABASE_URL!.replace(
      `:${PG_PORT}/`,
      `:${PORTA_PROXY}/`,
    );
    const proxy = criarProxy(PORTA_PROXY, Number(PG_PORT));
    let pool: pg.Pool;
    type Proc = {
      child: ChildProcess;
      pid: number;
      saida: () => string;
      saiu: () => number | null | 'vivo';
    };
    const procs: Record<string, Proc> = {};

    const sufixo = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let usuario: string;
    let consulta: string;
    let token: string;
    let n = 0;
    const chave = (r: string) => `e26-${r}-${sufixo}-${++n}-${'x'.repeat(8)}`;
    const meds = (v = 500) => [
      {
        molecula: 'Amoxicilina',
        dose: { valor: v, unidade: 'mg', frequencia: '3x/dia', via: 'VO' },
        duracao: '7 dias',
      },
    ];
    const corpo = (k: string, v = 500) => ({
      consulta_id: consulta,
      medicamentos: meds(v),
      idempotency_key: k,
    });

    // ── infraestrutura ──────────────────────────────────────────────
    const env = (porta: number) => ({
      ...process.env,
      DATABASE_URL: urlProxy,
      TS_NODE_TRANSPILE_ONLY: 'true',
      APP_PORTA: String(porta),
    });
    function iniciar(
      nome: string,
      porta: number,
      extraEnv: Record<string, string> = {},
    ): Promise<void> {
      return new Promise((resolve, reject) => {
        const child = spawn(
          process.execPath,
          [
            '-r',
            'ts-node/register/transpile-only',
            path.join('test', 'support', 'app-process.ts'),
            String(porta),
          ],
          {
            env: { ...env(porta), ...extraEnv },
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );
        let buf = '';
        let codigo: number | null | 'vivo' = 'vivo';
        const timer = setTimeout(() => {
          child.kill('SIGKILL');
          reject(new Error(`app ${nome} não ficou pronta: ${buf}`));
        }, 120_000);
        const on = (d: Buffer) => {
          buf += d.toString();
          const m = /READY (\d+) (\d+)/.exec(buf);
          if (m && !procs[nome]) {
            clearTimeout(timer);
            procs[nome] = {
              child,
              pid: Number(m[1]),
              saida: () => buf,
              saiu: () => codigo,
            };
            resolve();
          }
        };
        child.stdout.on('data', on);
        child.stderr.on('data', on);
        child.on('exit', (c) => {
          codigo = c;
          clearTimeout(timer);
          if (!procs[nome])
            reject(new Error(`app ${nome} saiu (${c}): ${buf}`));
        });
      });
    }
    const viva = (nome: string) => procs[nome]?.saiu() === 'vivo';
    const matar = async (nome: string) => {
      procs[nome]?.child.kill('SIGKILL');
      await sleep(700);
      delete procs[nome];
    };
    const ERROS_FATAIS =
      /Unhandled error|uncaughtException|unhandledRejection|ECONNRESET.*at .*Socket|FATAL ERROR/;

    async function req(
      porta: number,
      metodo: string,
      rota: string,
      body?: unknown,
      ms = 15_000,
    ): Promise<Resp> {
      const t0 = Date.now();
      try {
        const r = await fetch(`http://127.0.0.1:${porta}${rota}`, {
          method: metodo,
          signal: AbortSignal.timeout(ms),
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
        return { status: r.status, body: b, ms: Date.now() - t0 };
      } catch (e) {
        return { status: -1, body: String(e), ms: Date.now() - t0 };
      } // -1 = sem resposta (timeout/recusada): NUNCA sucesso
    }
    const postar = (k: string, v = 500, ms = 15_000) =>
      req(PORTA_APP, 'POST', '/api/prescricao', corpo(k, v), ms);

    async function q(sql: string, params: unknown[] = []) {
      for (let t = 0; ; t++) {
        try {
          return (await pool.query(sql, params)).rows;
        } catch (e) {
          if (t >= 12) throw e;
          await sleep(500);
        }
      } // infra do TESTE: pool de verificação direto ao banco
    }
    const contar = async (k: string) =>
      Number(
        (
          await q(
            'select count(*)::int c from prescricoes where idempotency_key = $1',
            [k],
          )
        )[0].c,
      );
    const auditorias = async (id: string) =>
      Number(
        (
          await q('select count(*)::int c from auditoria where recurso = $1', [
            `prescricao:${id}`,
          ])
        )[0].c,
      );
    const pgCtl = (...a: string[]) =>
      execFileSync(process.env.PG_CTL!, ['-D', process.env.PGDATA!, ...a], {
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
    async function aguardarPg() {
      for (let i = 0; i < 80; i++) {
        try {
          const c = new pg.Client({
            connectionString: process.env.DATABASE_URL,
          });
          await c.connect();
          await c.end();
          return;
        } catch {
          await sleep(400);
        }
      }
      throw new Error('PostgreSQL não voltou');
    }
    const conexoesDoBanco = async () =>
      Number(
        (
          await q(
            'select count(*)::int c from pg_stat_activity where datname = current_database() and pid <> pg_backend_pid()',
          )
        )[0].c,
      );
    /** Primeiras requisições após a recuperação: registra a sequência de status até o primeiro sucesso (falha transitória ≠ persistente). */
    async function recuperacao(): Promise<{
      sequencia: number[];
      tentativasAteSucesso: number;
    }> {
      const seq: number[] = [];
      for (let i = 0; i < 12; i++) {
        const r = await postar(chave('rec'));
        seq.push(r.status);
        if (r.status === 201)
          return { sequencia: seq, tentativasAteSucesso: i + 1 };
        await sleep(500);
      }
      return { sequencia: seq, tentativasAteSucesso: -1 };
    }
    const semErrosFatais = (nome: string) => {
      expect(viva(nome)).toBe(true);
      expect(procs[nome].saida()).not.toMatch(ERROS_FATAIS);
    };

    beforeAll(async () => {
      pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        max: 4,
      });
      pool.on('error', () => undefined);
      await proxy.iniciar();
      await iniciar('A', PORTA_APP);
      const jwt = new JwtService({});
      const email = `pool-${sufixo}@x.com`;
      const reg = await req(PORTA_APP, 'POST', '/auth/register', {
        email,
        senha: 'SenhaForte123!',
        crm: `PL${Date.now().toString(36)}`,
        especialidade: 'clinica_medica',
        uf: 'SP',
      });
      expect(reg.status).toBe(201);
      usuario = (
        await q('select id from usuarios where email = $1', [email])
      )[0].id;
      token = await jwt.signAsync(
        { sub: usuario, email, perfil: 'MEDICO' },
        { secret: process.env.JWT_SECRET, expiresIn: '120m' },
      );
      consulta = (
        await req(PORTA_APP, 'POST', '/api/consulta', {
          anamnese: { queixa_principal: 'e2.6' },
        })
      ).body.id;
    });
    afterAll(async () => {
      await Promise.all(Object.keys(procs).map(matar));
      await proxy.fechar();
      try {
        await q('delete from prescricoes where consulta_id = $1', [consulta]);
      } catch {
        /* melhor esforço */
      }
      await pool.end().catch(() => undefined);
    });

    it('1. aplicação iniciada com banco disponível: serve requisições (201) pelo pool; o processo não registra erros', async () => {
      const r = await postar(chave('inicio'));
      expect(r.status).toBe(201);
      semErrosFatais('A');
      console.warn(
        `[pool] 1: 201 em ${r.ms} ms; conexões aceitas pelo proxy: ${proxy.aceitas()}`,
      );
    });

    it('11a. LISTENER DE ERRO: o adaptador Prisma anexa listener de erro ao pool EXTERNO em $connect(); antes de $connect o pool não tem listener (janela) — e o PrismaService conecta em onModuleInit', async () => {
      const p = new pg.Pool({ connectionString: process.env.DATABASE_URL });
      const adapter = new PrismaPg(p);
      expect(p.listenerCount('error')).toBe(0); // pool "cru": um erro de cliente ocioso seria exceção não tratada
      const prisma = new PrismaClient({ adapter });
      await prisma.$connect();
      expect(p.listenerCount('error')).toBeGreaterThanOrEqual(1); // listener do adaptador (apenas debug/onPoolError, sem log por padrão)
      await prisma.$disconnect();
      await p.end().catch(() => undefined);
      console.warn(
        '[pool] 11a: listenerCount(error) = 0 antes de $connect; ≥1 depois (adaptador @prisma/adapter-pg 7.8.0)',
      );
    });

    it('3/5/7/8. reinício NORMAL (fast) com conexões OCIOSAS: o processo sobrevive sem erro fatal; sequência de status até a recuperação registrada; depois 20 requisições simultâneas = 20×201', async () => {
      for (let i = 0; i < 4; i++) await postar(chave('ociosa')); // deixa conexões ociosas no pool (idade < idleTimeout de 10 s)
      pararPg('fast');
      iniciarPg();
      await aguardarPg();
      const rec = await recuperacao();
      console.warn(
        `[pool] reinício fast (ociosas): sequência pós-recuperação = ${JSON.stringify(rec.sequencia)}`,
      );
      semErrosFatais('A');
      expect(rec.tentativasAteSucesso).toBeGreaterThan(0);
      const rs = await Promise.all(
        Array.from({ length: 20 }, () => postar(chave('apos'))),
      );
      expect(rs.map((r) => r.status)).toEqual(Array(20).fill(201));
    });

    it('4/5. encerramento ABRUPTO (immediate ⇒ recuperação por WAL) com conexões ociosas: sobrevive sem erro fatal; recupera; 20×201', async () => {
      for (let i = 0; i < 4; i++) await postar(chave('ociosa2'));
      pararPg('immediate');
      iniciarPg();
      await aguardarPg();
      const rec = await recuperacao();
      console.warn(
        `[pool] encerramento abrupto (ociosas): sequência pós-recuperação = ${JSON.stringify(rec.sequencia)}`,
      );
      semErrosFatais('A');
      expect(rec.tentativasAteSucesso).toBeGreaterThan(0);
      const rs = await Promise.all(
        Array.from({ length: 20 }, () => postar(chave('apos2'))),
      );
      expect(rs.map((r) => r.status)).toEqual(Array(20).fill(201));
    });

    it('2/6/12. banco derrubado DURANTE requisições ativas (burst de 40 escritas): nenhum sucesso sem registro; nenhuma duplicação; repetição com a MESMA chave e conteúdo converge para 1 registro por chave', async () => {
      const chaves = Array.from({ length: 40 }, (_, i) => chave(`burst${i}`));
      const envios = chaves.map((k) => postar(k, 500, 25_000));
      await sleep(25);
      pararPg('immediate');
      const rs = await Promise.all(envios);
      iniciarPg();
      await aguardarPg();
      const dist = rs.reduce(
        (m: Record<string, number>, r) => ({
          ...m,
          [r.status]: (m[r.status] ?? 0) + 1,
        }),
        {},
      );
      console.warn(
        `[pool] burst durante queda: distribuição de status = ${JSON.stringify(dist)}`,
      );
      let gravadoSemResposta = 0;
      for (let i = 0; i < chaves.length; i++) {
        const c = await contar(chaves[i]);
        expect(c).toBeLessThanOrEqual(1); // nunca duplica
        if (rs[i].status === 201)
          expect(c).toBe(1); // sucesso reportado ⇒ gravado
        else if (c === 1) gravadoSemResposta++; // gravado, mas o cliente não recebeu 201 (resposta perdida): idempotência resolve
        expect(
          [201, 500, -1, 502, 503].includes(rs[i].status) ||
            rs[i].status >= 500,
        ).toBe(true); // falha de conexão NUNCA vira sucesso nem 4xx
      }
      console.warn(
        `[pool] burst: gravados sem resposta de sucesso ao cliente = ${gravadoSemResposta}`,
      );
      semErrosFatais('A');
      await recuperacao();
      // repetição idempotente (mesma chave e conteúdo): exatamente 1 por chave, mesmo conteúdo
      const rs2 = await Promise.all(chaves.map((k) => postar(k)));
      expect(rs2.map((r) => r.status)).toEqual(Array(40).fill(201));
      for (const k of chaves) {
        expect(await contar(k)).toBe(1);
        expect(
          (
            await q(
              'select medicamentos m from prescricoes where idempotency_key = $1',
              [k],
            )
          )[0].m,
        ).toEqual(meds());
      }
      for (const r of rs2.slice(0, 5))
        expect(await auditorias(r.body.id)).toBe(1);
    });

    it('indisponibilidade PERSISTENTE (banco parado por ~8 s): toda requisição falha com 5xx RÁPIDO (sem hang, sem sucesso); nada é gravado; após o retorno, converge', async () => {
      pararPg('fast');
      const k = chave('persistente');
      const t0 = Date.now();
      const rs: Resp[] = [];
      for (let i = 0; i < 4; i++) {
        rs.push(await postar(k, 500, 15_000));
        await sleep(1500);
      }
      const duracao = Date.now() - t0;
      console.warn(
        `[pool] indisponibilidade persistente: status = ${JSON.stringify(rs.map((r) => r.status))}; tempos = ${JSON.stringify(rs.map((r) => r.ms))} ms`,
      );
      for (const r of rs) {
        expect(r.status).toBeGreaterThanOrEqual(500);
        expect(r.ms).toBeLessThan(12_000);
      }
      expect(duracao).toBeLessThan(60_000);
      semErrosFatais('A');
      iniciarPg();
      await aguardarPg();
      expect(await contar(k)).toBe(0);
      await recuperacao();
      expect((await postar(k)).status).toBe(201);
      expect(await contar(k)).toBe(1);
    });

    it('conexões TCP INTERROMPIDAS (reset de todas as conexões do pool, banco no ar): sobrevive sem erro fatal; recupera', async () => {
      for (let i = 0; i < 4; i++) await postar(chave('tcp'));
      proxy.derrubarConexoes();
      const rec = await recuperacao();
      console.warn(
        `[pool] reset TCP: sequência pós-reset = ${JSON.stringify(rec.sequencia)}`,
      );
      semErrosFatais('A');
      expect(rec.tentativasAteSucesso).toBeGreaterThan(0);
      expect(
        (
          await Promise.all(
            Array.from({ length: 10 }, () => postar(chave('tcp2'))),
          )
        ).map((r) => r.status),
      ).toEqual(Array(10).fill(201));
    });

    it('BLACKHOLE TCP (pacotes descartados, conexões abertas — o banco "some" sem fechar): MEDE se a requisição pendura; depois do reset, a aplicação recupera', async () => {
      await postar(chave('bh0'));
      proxy.modo('blackhole');
      const r = await postar(chave('bh'), 500, 12_000);
      console.warn(
        `[pool] BLACKHOLE: requisição terminou com status ${r.status} após ${r.ms} ms (limite do cliente: 12000 ms)`,
      );
      proxy.derrubarConexoes();
      proxy.modo('forward');
      const rec = await recuperacao();
      console.warn(
        `[pool] pós-blackhole: sequência = ${JSON.stringify(rec.sequencia)}`,
      );
      semErrosFatais('A');
      expect(rec.tentativasAteSucesso).toBeGreaterThan(0);
      // não é uma asserção de aprovação: registra a EVIDÊNCIA do comportamento (r.status === -1 ⇒ pendurou além de 12 s)
      expect([-1, 500, 502, 503, 504]).toContain(r.status);
    });

    it('9. encerramento GRACIOSO: "close" ⇒ app.close() ⇒ $disconnect; sai com código 0 e as conexões do pool desse processo são liberadas no servidor', async () => {
      await iniciar('B', PORTA_APP + 1);
      const rs = await Promise.all(
        Array.from({ length: 6 }, () =>
          req(PORTA_APP + 1, 'POST', '/api/prescricao', corpo(chave('b'))),
        ),
      );
      expect(rs.every((r) => r.status === 201)).toBe(true);
      const antes = await conexoesDoBanco();
      procs.B.child.stdin!.write('close\n');
      for (let i = 0; i < 60 && procs.B.saiu() === 'vivo'; i++)
        await sleep(250);
      expect(procs.B.saiu()).toBe(0);
      expect(procs.B.saida()).toMatch(/CLOSED/);
      await sleep(800);
      const depois = await conexoesDoBanco();
      console.warn(
        `[pool] encerramento gracioso: conexões no banco antes=${antes} depois=${depois}`,
      );
      expect(depois).toBeLessThan(antes);
      delete procs.B;
    });

    it('10. encerramento FORÇADO (kill): o servidor libera as conexões (socket fechado); nenhuma prescrição é duplicada; novo processo opera normalmente', async () => {
      await iniciar('C', PORTA_APP + 2);
      const k = chave('forcado');
      expect(
        (await req(PORTA_APP + 2, 'POST', '/api/prescricao', corpo(k))).status,
      ).toBe(201);
      const antes = await conexoesDoBanco();
      await matar('C');
      let depois = antes;
      for (let i = 0; i < 20; i++) {
        depois = await conexoesDoBanco();
        if (depois < antes) break;
        await sleep(500);
      }
      console.warn(
        `[pool] kill forçado: conexões no banco antes=${antes} depois=${depois}`,
      );
      expect(depois).toBeLessThan(antes);
      expect(await contar(k)).toBe(1);
      await iniciar('C', PORTA_APP + 2);
      expect(
        (await req(PORTA_APP + 2, 'POST', '/api/prescricao', corpo(k))).status,
      ).toBe(201); // repetição idempotente
      expect(await contar(k)).toBe(1);
      await matar('C');
    });

    it('11b. nenhum erro fatal/não tratado no processo A em TODO o ciclo (stderr/stdout) e o processo continua vivo', () => {
      semErrosFatais('A');
    });

    // ── EXPERIMENTO (diagnóstico, NÃO é a aplicação): o hang do BLACKHOLE tem mitigação segura via opções do pg.Pool? ──
    async function experimento(opcoes: pg.PoolConfig) {
      const p = new pg.Pool({ connectionString: urlProxy, max: 2, ...opcoes });
      p.on('error', () => undefined);
      const prisma = new PrismaClient({ adapter: new PrismaPg(p) });
      await prisma.$connect();
      const out: Record<string, unknown> = {};
      await prisma.$queryRaw`select 1`; // aquece o pool
      proxy.modo('blackhole');
      let t0 = Date.now();
      out.durante = await Promise.race([
        prisma.$queryRaw`select 1`.then(
          () => 'ok',
          (e: Error) => `erro: ${e.message.slice(0, 60)}`,
        ),
        sleep(15_000).then(() => 'PENDURADO >15 s'),
      ]);
      out.msDurante = Date.now() - t0;
      proxy.modo('forward'); // o banco "volta", mas SEM derrubar as conexões antigas
      t0 = Date.now();
      out.depois = await Promise.race([
        prisma.$queryRaw`select 1`.then(
          () => 'ok',
          (e: Error) => `erro: ${e.message.slice(0, 60)}`,
        ),
        sleep(15_000).then(() => 'PENDURADO >15 s'),
      ]);
      out.msDepois = Date.now() - t0;
      proxy.derrubarConexoes();
      await Promise.race([prisma.$disconnect(), sleep(5000)]);
      await Promise.race([p.end().catch(() => undefined), sleep(3000)]);
      return out;
    }

    it('12. EXPERIMENTO (diagnóstico): comportamento do pool sob BLACKHOLE — baseline (sem timeouts) × candidata (query_timeout + keepAlive)', async () => {
      const base = await experimento({});
      console.warn(
        `[pool] EXPERIMENTO baseline (config atual, sem timeouts): ${JSON.stringify(base)}`,
      );
      const cand = await experimento({
        query_timeout: 3000,
        connectionTimeoutMillis: 5000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10_000,
      });
      console.warn(
        `[pool] EXPERIMENTO candidata (query_timeout=3000, connectionTimeoutMillis=5000, keepAlive): ${JSON.stringify(cand)}`,
      );
      proxy.modo('forward');
      expect(typeof base.durante).toBe('string');
      expect(typeof cand.durante).toBe('string'); // registra evidência; não é critério de aprovação
    });

    it('13. CORREÇÃO (query_timeout de produção): sob BLACKHOLE a requisição FALHA em tempo limitado (5xx), o pool continua utilizável SEM derrubar as conexões antigas e nada é duplicado; o processo não registra erro fatal', async () => {
      await iniciar('T', PORTA_APP + 3, { DB_QUERY_TIMEOUT_MS: '3000' });
      const porta = PORTA_APP + 3;
      const pT = (k: string, ms = 20_000) =>
        req(porta, 'POST', '/api/prescricao', corpo(k), ms);
      for (let i = 0; i < 3; i++)
        expect((await pT(chave('t0'))).status).toBe(201);
      proxy.modo('blackhole');
      const k = chave('t-blackhole');
      const r = await pT(k);
      console.warn(
        `[pool] CORREÇÃO blackhole: status ${r.status} após ${r.ms} ms (query_timeout=3000)`,
      );
      expect(r.status).toBeGreaterThanOrEqual(500); // falha explícita, nunca sucesso
      expect(r.ms).toBeLessThan(10_000); // tempo LIMITADO (antes: pendurava)
      proxy.modo('forward'); // banco "volta" sem derrubar as conexões antigas
      const seq: number[] = [];
      for (let i = 0; i < 8; i++)
        seq.push((await pT(chave('t1'), 8000)).status);
      const conc = await Promise.all(
        Array.from({ length: 10 }, () => pT(chave('t2'), 8000)),
      );
      console.warn(
        `[pool] CORREÇÃO pós-blackhole: sequenciais=${JSON.stringify(seq)} concorrentes=${JSON.stringify(conc.map((x) => x.status))}`,
      );
      expect(seq).toEqual(Array(8).fill(201));
      expect(conc.map((x) => x.status)).toEqual(Array(10).fill(201));
      // a chave usada durante o blackhole: no máximo 1 registro; a repetição idempotente converge
      expect(await contar(k)).toBeLessThanOrEqual(1);
      expect((await pT(k)).status).toBe(201);
      expect(await contar(k)).toBe(1);
      expect(procs.T.saida()).not.toMatch(ERROS_FATAIS);
      expect(viva('T')).toBe(true);
    });

    it('14. OBSERVABILIDADE: o erro de conexão ociosa encerrada pelo servidor deixa de ser silencioso — PrismaService real, em processo, registra o aviso (o app de teste usa TestingLogger, que oculta avisos)', async () => {
      const avisos: string[] = [];
      jest.spyOn(Logger.prototype, 'warn').mockImplementation((m: unknown) => {
        avisos.push(String(m));
      });
      const antigo = process.env.DATABASE_URL;
      process.env.DATABASE_URL = urlProxy;
      const svc = new PrismaService();
      process.env.DATABASE_URL = antigo;
      await svc.onModuleInit();
      for (let i = 0; i < 4; i++) await svc.$queryRaw`select 1`; // deixa conexões ociosas no pool
      pararPg('fast');
      iniciarPg();
      await aguardarPg();
      await sleep(1500);
      console.warn(
        `[pool] OBSERVABILIDADE: avisos do PrismaService = ${JSON.stringify(avisos)}`,
      );
      expect(
        avisos.some((m) => /Erro em conexão ociosa do pool PostgreSQL/.test(m)),
      ).toBe(true);
      const ok = await svc.$queryRaw<Array<{ ok: number }>>`select 1 as ok`;
      expect(ok[0].ok).toBe(1); // e o pool se recupera
      const abertasAntes = proxy.abertas();
      await svc.onModuleDestroy(); // $disconnect ⇒ pool.end() (disposeExternalPool)
      await sleep(800);
      const abertasDepois = proxy.abertas();
      console.warn(
        `[pool] ENCERRAMENTO do PrismaService em processo (sem process.exit): conexões abertas pelo proxy antes=${abertasAntes} depois=${abertasDepois}`,
      );
      expect(abertasDepois).toBeLessThan(abertasAntes); // as conexões do pool foram ENCERRADAS pelo próprio serviço
      await recuperacao();
      await matar('T');
    });
  },
);
