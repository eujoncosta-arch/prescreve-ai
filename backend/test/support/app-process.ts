// RM-107.1.1-E2.5.1 — processo INDEPENDENTE da aplicação (mesmos módulos e pipes dos e2e reais) para provar concorrência entre processos.
// Uso: node -r ts-node/register/transpile-only test/support/app-process.ts <porta>
// Requer DATABASE_URL e os segredos de teste no ambiente. Imprime "READY <pid> <porta>" quando pronto.
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../../src/auth/auth.module';
import { ConsultaModule } from '../../src/modules/consulta/consulta.module';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { CacheModule } from '../../src/modules/cache/cache.module';
import { CacheService } from '../../src/modules/cache/cache.service';

async function main() {
  const porta = Number(process.argv[2]);
  const mod = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      PrismaModule,
      CacheModule,
      AuthModule,
      ConsultaModule,
    ],
  })
    .overrideProvider(CacheService)
    .useValue({ key: () => undefined, getOrSet: () => undefined })
    .compile();
  const app = mod.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  await app.listen(porta, '127.0.0.1');
  process.stdout.write(`READY ${process.pid} ${porta}\n`);
}
main().catch((e) => {
  process.stderr.write(`FALHA ${String(e)}\n`);
  process.exit(1);
});
