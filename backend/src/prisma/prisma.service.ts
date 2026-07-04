import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

function criarAdapter() {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  const pool = new pg.Pool({ connectionString: url });
  return new PrismaPg(pool);
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
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
