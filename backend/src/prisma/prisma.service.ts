import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const logger = new Logger('PrismaService');

/**
 * RM-107.1.1-E2.6 — limite de espera por consulta ao PostgreSQL.
 * EVIDÊNCIA (test/pool-resiliencia-postgres-convencional.e2e-spec.ts): quando o servidor deixa de responder mas mantém a conexão TCP aberta
 * (processo travado/sobrecarregado, middlebox que descarta pacotes), a configuração anterior (sem timeout) deixava a requisição PENDURADA
 * indefinidamente e a conexão do pool presa. Com `query_timeout` a requisição falha com erro (5xx) e o pool continua utilizável.
 * NÃO é retry: a operação NÃO é repetida aqui — o cliente decide (as escritas são idempotentes pela `idempotency_key`).
 * Padrão 30 s (consultas da aplicação são curtas); `DB_QUERY_TIMEOUT_MS=0` desativa (comportamento anterior).
 */
export function resolverQueryTimeoutMs(
  valor: string | undefined = process.env.DB_QUERY_TIMEOUT_MS,
): number {
  const n = Number(valor ?? 30_000);
  return Number.isFinite(n) && n >= 0 ? n : 30_000;
}

function criarAdapter() {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  const queryTimeout = resolverQueryTimeoutMs();
  const pool = new pg.Pool({
    connectionString: url,
    ...(queryTimeout > 0 ? { query_timeout: queryTimeout } : {}),
  });
  // O adaptador já anexa um listener de erro ao pool em `$connect()` (sem ele, o erro de uma conexão ociosa encerrada pelo servidor seria uma
  // exceção não tratada); `onPoolError` só o torna VISÍVEL (antes só aparecia com DEBUG do Prisma).
  // `disposeExternalPool`: sem isto, `$disconnect()` (onModuleDestroy) apenas REMOVE o listener de erro e NÃO encerra o pool externo — as conexões
  // ficavam abertas e, sem listener, um erro posterior vira exceção não tratada (reproduzido no e2e E2.6: suíte caiu com "Unhandled error" após o
  // encerramento). Com a opção, `$disconnect()` chama `pool.end()`.
  return new PrismaPg(pool, {
    disposeExternalPool: true,
    onPoolError: (err: Error) =>
      logger.warn(
        `Erro em conexão ociosa do pool PostgreSQL (a conexão é descartada): ${err.message}`,
      ),
  });
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = criarAdapter();
    super(adapter ? { adapter } : {});
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
