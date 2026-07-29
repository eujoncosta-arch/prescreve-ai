import { Prisma } from '@prisma/client';

// ============================================================
// RM-47 — Fake de persistência realista para E2E de ponta a ponta
//
// LIMITAÇÃO HONESTA (documentada, não escondida): este ambiente de
// sandbox não tem Docker/Postgres disponível (verificado — `docker`,
// `psql` inexistentes; sem testcontainers/pg-mem no projeto). Não é
// possível rodar a suíte E2E contra o Postgres real sem inventar uma
// infraestrutura que não existe aqui. Este arquivo NÃO tenta emular um
// banco relacional genérico — implementa apenas os métodos Prisma
// REALMENTE usados por `AuthService`/`ConsultaService`/`AuditService`
// (confirmado por leitura direta do código-fonte, não suposição),
// preservando o comportamento que os testes de RM-47 precisam validar:
// unicidade de `idempotency_key` (erro P2002 real, do próprio
// `@prisma/client`, capturado por `criarComIdempotenciaSobColisao`
// exatamente como aconteceria com um Postgres real), filtragem por
// `usuario_id` (isolamento entre usuários), ordenação/paginação por
// `criado_em`, e as relações `include` usadas por `listarConsultas`/
// `buscarConsulta`.
//
// O que ISSO PROVA: toda a camada de HTTP real (Express/Nest routing,
// guards, pipes de validação, DTOs, serviços, lógica de idempotência e
// ownership) é exercitada de ponta a ponta com requisições HTTP reais
// via `supertest` — não são testes de unidade de função isolada. O que
// isso NÃO prova: comportamento específico do PostgreSQL (constraints
// de banco reais, transações ACID reais, comportamento sob concorrência
// real de conexões). Essa lacuna é textualmente idêntica à dos e2e-specs
// já existentes neste repositório (`ownership-authorization.e2e-spec.ts`
// etc.), que também mockam o Prisma — não é uma redução de rigor
// introduzida por esta RM, é o padrão já estabelecido no projeto.
// ============================================================

interface FakeUsuario {
  id: string;
  email: string;
  senha_hash: string;
  perfil: string;
  ativo: boolean;
  mfa_ativo: boolean;
}

let contador = 0;
function proximoId(prefixo: string): string {
  contador += 1;
  return `${prefixo}_${contador}`;
}

function violacaoUnicidade(campo: string): never {
  throw new Prisma.PrismaClientKnownRequestError(
    `Unique constraint failed on the fields: (\`${campo}\`)`,
    { code: 'P2002', clientVersion: 'test-fake' },
  );
}

/** Estado do "banco" — um objeto por teste/suíte, nunca compartilhado entre execuções (ver `reset()`). */
export class FakeDb {
  usuarios: FakeUsuario[] = [];
  refreshTokens: Record<string, unknown>[] = [];
  auditorias: Record<string, unknown>[] = [];
  consultas: Record<string, unknown>[] = [];
  diagnosticos: Record<string, unknown>[] = [];
  prescricoes: Record<string, unknown>[] = [];
  riskScores: Record<string, unknown>[] = [];

  /** Isolamento entre testes (exigido pelos gates do RM-47) — nunca reaproveita estado de um teste anterior. */
  reset(): void {
    this.usuarios = [];
    this.refreshTokens = [];
    this.auditorias = [];
    this.consultas = [];
    this.diagnosticos = [];
    this.prescricoes = [];
    this.riskScores = [];
  }

  /**
   * RM-49 (RM41-017): snapshot raso de todos os arrays mutáveis — usado por
   * `$transaction` para simular rollback real quando o callback lança uma
   * exceção (ex.: colisão de idempotency_key), provando que nenhuma escrita
   * clínica fica parcialmente persistida sem a auditoria correspondente.
   */
  snapshot() {
    return {
      auditorias: [...this.auditorias],
      consultas: [...this.consultas],
      diagnosticos: [...this.diagnosticos],
      prescricoes: [...this.prescricoes],
      riskScores: [...this.riskScores],
    };
  }

  restaurar(snap: ReturnType<FakeDb['snapshot']>): void {
    this.auditorias = snap.auditorias;
    this.consultas = snap.consultas;
    this.diagnosticos = snap.diagnosticos;
    this.prescricoes = snap.prescricoes;
    this.riskScores = snap.riskScores;
  }

  /** Seed direto de usuário (bypassa o endpoint de registro — não é o que está sob teste aqui). */
  seedUsuario(
    u: Partial<FakeUsuario> & { email: string; senha_hash: string },
  ): FakeUsuario {
    const usuario: FakeUsuario = {
      id: proximoId('usuario'),
      perfil: 'MEDICO',
      ativo: true,
      mfa_ativo: false,
      ...u,
    };
    this.usuarios.push(usuario);
    return usuario;
  }
}

function bateWhereConsulta(
  c: Record<string, unknown>,
  where: Record<string, unknown>,
): boolean {
  if (where.id !== undefined && c.id !== where.id) return false;
  if (where.usuario_id !== undefined && c.usuario_id !== where.usuario_id)
    return false;
  if (where.deletado_em !== undefined && c.deletado_em !== where.deletado_em)
    return false;
  return true;
}

function anexarIncludes(
  db: FakeDb,
  consulta: Record<string, unknown>,
  include: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!include) return consulta;
  const out = { ...consulta };
  if (include.diagnosticos) {
    let diags = db.diagnosticos.filter((d) => d.consulta_id === consulta.id);
    const spec = include.diagnosticos;
    if (typeof spec === 'object' && spec !== null) {
      const where = (spec as { where?: { selecionado?: boolean } }).where;
      if (where?.selecionado !== undefined)
        diags = diags.filter((d) => d.selecionado === where.selecionado);
      const take = (spec as { take?: number }).take;
      if (take !== undefined) diags = diags.slice(0, take);
    }
    out.diagnosticos = diags;
  }
  if (include.prescricoes) {
    let prescs = db.prescricoes.filter((p) => p.consulta_id === consulta.id);
    const spec = include.prescricoes;
    if (typeof spec === 'object' && spec !== null) {
      const take = (spec as { take?: number }).take;
      if (take !== undefined) prescs = prescs.slice(0, take);
      const select = (spec as { select?: Record<string, boolean> }).select;
      if (select) {
        prescs = prescs.map((p) =>
          Object.fromEntries(
            Object.keys(select)
              .filter((k) => select[k])
              .map((k) => [k, p[k]]),
          ),
        );
      }
    }
    out.prescricoes = prescs;
  }
  return out;
}

/** Cria um objeto compatível com `PrismaService` — implementa só os métodos realmente chamados por Auth/Consulta/Audit services. */
export function criarFakePrismaService(db: FakeDb) {
  function montarService() {
    return {
      usuario: {
        findUnique: ({ where }: { where: { id?: string; email?: string } }) => {
          if (where.id !== undefined)
            return db.usuarios.find((u) => u.id === where.id) ?? null;
          if (where.email !== undefined)
            return db.usuarios.find((u) => u.email === where.email) ?? null;
          return null;
        },
      },

      refreshToken: {
        create: ({ data }: { data: Record<string, unknown> }) => {
          const rec = { id: proximoId('rt'), revogado: false, ...data };
          db.refreshTokens.push(rec);
          return rec;
        },
        findUnique: ({ where }: { where: { token_hash: string } }) => {
          const rec = db.refreshTokens.find(
            (r) => r.token_hash === where.token_hash,
          );
          if (!rec) return null;
          const usuario = db.usuarios.find((u) => u.id === rec.usuario_id);
          return {
            ...rec,
            usuario: usuario
              ? { id: usuario.id, email: usuario.email, perfil: usuario.perfil }
              : null,
          };
        },
        updateMany: ({
          where,
          data,
        }: {
          where: Record<string, unknown>;
          data: Record<string, unknown>;
        }) => {
          let count = 0;
          for (const r of db.refreshTokens) {
            const bate = Object.entries(where).every(([k, v]) => r[k] === v);
            if (bate) {
              Object.assign(r, data);
              count += 1;
            }
          }
          return { count };
        },
        update: ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const rec = db.refreshTokens.find((r) => r.id === where.id);
          if (rec) Object.assign(rec, data);
          return rec;
        },
      },

      auditoria: {
        create: ({ data }: { data: Record<string, unknown> }) => {
          const rec = { id: proximoId('aud'), criado_em: new Date(), ...data };
          db.auditorias.push(rec);
          return rec;
        },
        count: () => db.auditorias.length,
        findMany: () => db.auditorias,
      },

      consulta: {
        create: ({ data }: { data: Record<string, unknown> }) => {
          if (
            data.idempotency_key &&
            db.consultas.some((c) => c.idempotency_key === data.idempotency_key)
          ) {
            violacaoUnicidade('idempotency_key');
          }
          const agora = new Date();
          const rec = {
            id: proximoId('consulta'),
            status: 'em_andamento',
            criado_em: agora,
            atualizado_em: agora,
            deletado_em: null,
            anamnese: null,
            ...data,
          };
          db.consultas.push(rec);
          return rec;
        },
        findUnique: ({
          where,
        }: {
          where: { idempotency_key?: string; id?: string };
        }) => {
          if (where.idempotency_key !== undefined) {
            return (
              db.consultas.find(
                (c) => c.idempotency_key === where.idempotency_key,
              ) ?? null
            );
          }
          if (where.id !== undefined)
            return db.consultas.find((c) => c.id === where.id) ?? null;
          return null;
        },
        findFirst: ({
          where,
          include,
        }: {
          where: Record<string, unknown>;
          include?: Record<string, unknown>;
        }) => {
          const rec = db.consultas.find((c) => bateWhereConsulta(c, where));
          if (!rec) return null;
          return anexarIncludes(db, rec, include);
        },
        findMany: ({
          where,
          skip = 0,
          take,
          include,
        }: {
          where: Record<string, unknown>;
          orderBy?: unknown;
          skip?: number;
          take?: number;
          include?: Record<string, unknown>;
        }) => {
          let lista = db.consultas.filter((c) => bateWhereConsulta(c, where));
          // Ordenação real por `criado_em` desc — a mesma ordem que `orderBy: { criado_em: 'desc' }' produziria.
          lista = [...lista].sort(
            (a, b) =>
              (b.criado_em as Date).getTime() - (a.criado_em as Date).getTime(),
          );
          lista = lista.slice(
            skip,
            take !== undefined ? skip + take : undefined,
          );
          return lista.map((c) => anexarIncludes(db, c, include));
        },
        count: ({ where }: { where: Record<string, unknown> }) =>
          db.consultas.filter((c) => bateWhereConsulta(c, where)).length,
      },

      diagnostico: {
        create: ({ data }: { data: Record<string, unknown> }) => {
          if (
            data.idempotency_key &&
            db.diagnosticos.some(
              (d) => d.idempotency_key === data.idempotency_key,
            )
          ) {
            violacaoUnicidade('idempotency_key');
          }
          const rec = {
            id: proximoId('diag'),
            criado_em: new Date(),
            selecionado: false,
            ...data,
          };
          db.diagnosticos.push(rec);
          return rec;
        },
        findFirst: ({
          where,
        }: {
          where: { id?: string; consulta_id?: string };
        }) =>
          db.diagnosticos.find(
            (d) =>
              (where.id === undefined || d.id === where.id) &&
              (where.consulta_id === undefined ||
                d.consulta_id === where.consulta_id),
          ) ?? null,
        findUnique: ({ where }: { where: { idempotency_key?: string } }) => {
          if (where.idempotency_key !== undefined) {
            return (
              db.diagnosticos.find(
                (d) => d.idempotency_key === where.idempotency_key,
              ) ?? null
            );
          }
          return null;
        },
      },

      prescricao: {
        create: ({ data }: { data: Record<string, unknown> }) => {
          if (
            data.idempotency_key &&
            db.prescricoes.some(
              (p) => p.idempotency_key === data.idempotency_key,
            )
          ) {
            violacaoUnicidade('idempotency_key');
          }
          const rec = {
            id: proximoId('presc'),
            criado_em: new Date(),
            status: 'rascunho',
            validade_dias: 30,
            ...data,
          };
          db.prescricoes.push(rec);
          return rec;
        },
        findUnique: ({ where }: { where: { idempotency_key?: string } }) => {
          if (where.idempotency_key !== undefined) {
            return (
              db.prescricoes.find(
                (p) => p.idempotency_key === where.idempotency_key,
              ) ?? null
            );
          }
          return null;
        },
      },

      riskScore: {
        create: ({ data }: { data: Record<string, unknown> }) => {
          if (
            data.idempotency_key &&
            db.riskScores.some(
              (r) => r.idempotency_key === data.idempotency_key,
            )
          ) {
            violacaoUnicidade('idempotency_key');
          }
          const rec = { id: proximoId('risk'), criado_em: new Date(), ...data };
          db.riskScores.push(rec);
          return rec;
        },
        findUnique: ({ where }: { where: { idempotency_key?: string } }) => {
          if (where.idempotency_key !== undefined) {
            return (
              db.riskScores.find(
                (r) => r.idempotency_key === where.idempotency_key,
              ) ?? null
            );
          }
          return null;
        },
      },

      /**
       * RM-49 (RM41-017): simula `prisma.$transaction(async (tx) => ...)`
       * com rollback real em memória — se `cb` lançar, todo o estado mutável
       * de `db` é restaurado ao snapshot anterior à chamada, exatamente como
       * um `ROLLBACK` faria num Postgres real (dentro dos limites já
       * documentados no cabeçalho deste arquivo: sem concorrência real de
       * conexões). `tx` recebido pelo callback é o próprio `service` — os
       * mesmos métodos usados fora de transação.
       */

      // de teste sem interface nomeada (ver comentário acima de `service`).
      $transaction: async <T>(cb: (tx: any) => Promise<T>) => {
        const snap = db.snapshot();
        try {
          return await cb(service);
        } catch (e) {
          db.restaurar(snap);
          throw e;
        }
      },
    };
  }

  // `service` só é lido dentro do closure de `$transaction` acima quando
  // efetivamente invocado — bem depois desta linha ter inicializado o
  // binding — por isso `const` (declarado só aqui) funciona apesar da
  // referência lexical aparecer antes, dentro de `montarService`.

  const service: any = montarService();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- fake de teste, ver comentários acima.
  return service;
}
