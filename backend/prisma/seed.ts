// ============================================================
// PRESCREVE-AI — Seed CLI entrypoint (RM-37)
//
// Entrypoint fino invocado por `npm run db:seed` / `prisma db seed`. A
// lógica real (idempotência, bloqueio em produção) vive em
// `src/database/seed.util.ts` e `src/config/environment.util.ts` — ver
// esses arquivos para o raciocínio completo e os testes automatizados
// (este arquivo, fora de `src/`, não é coberto pelo runner Jest do
// projeto por design; mantém-se deliberadamente sem lógica própria).
// ============================================================

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { resolveAppEnvFromEnv } from '../src/config/environment.util';
import {
  runSeed,
  deveBloquearSeed,
  SEED_USUARIO_EMAIL,
} from '../src/database/seed.util';

async function main() {
  const appEnv = resolveAppEnvFromEnv();
  const permitidoEmProducao = process.env.ALLOW_SEED_IN_PRODUCTION === 'true';
  if (deveBloquearSeed(appEnv, permitidoEmProducao)) {
    console.error(
      '[seed] BLOQUEADO: ambiente resolvido como "production" (ou ' +
        'desconhecido/ausente — tratado como produção por segurança). ' +
        'Seeds nunca rodam em produção por padrão. Se este seed de ' +
        'desenvolvimento realmente precisa rodar aqui, defina ' +
        'ALLOW_SEED_IN_PRODUCTION=true explicitamente.',
    );
    process.exitCode = 1;
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[seed] BLOQUEADO: DATABASE_URL não está definida.');
    process.exitCode = 1;
    return;
  }

  const pool = new pg.Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    await runSeed(prisma);
    console.log(
      `[seed] OK — usuário de demonstração pronto: ${SEED_USUARIO_EMAIL} (ambiente: ${appEnv})`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('[seed] Falhou:', e);
  process.exitCode = 1;
});
