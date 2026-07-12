import { defineConfig } from 'prisma/config';

// O driver adapter (PrismaPg) é fornecido em runtime pelo PrismaService.
// Aqui a CLI (generate/migrate) usa a URL do banco via env — sem adapter.
export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
