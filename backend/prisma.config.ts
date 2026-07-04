import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

export default defineConfig({
  schema: './prisma/schema.prisma',
  adapter: new PrismaPg(new pg.Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://localhost/prescreve_ai',
  })),
});
