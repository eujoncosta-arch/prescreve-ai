import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { validarSegredosDistintos } from './auth/jwt-secrets.util';
import {
  resolveAllowedOrigins,
  buildCorsOriginHandler,
} from './config/cors.util';
import { resolveAppEnv } from './config/environment.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Hardening de infraestrutura — falha no startup (nunca numa requisição
  // já em produção) se a configuração de segredos for inválida. Além da
  // checagem individual (getRequiredSecret, já feita na construção de
  // JwtStrategy/JwtModule), valida que os dois segredos não coincidem.
  validarSegredosDistintos(config);

  const appEnv = resolveAppEnv(config);
  console.log(`PRESCREVE-AI Backend — ambiente: ${appEnv}`);

  // Headers de segurança (Helmet) — HSTS, X-Content-Type-Options,
  // X-Frame-Options, Referrer-Policy, etc. `contentSecurityPolicy: false`
  // porque este é um backend de API (sem HTML renderizado por ele) — uma
  // CSP restritiva aqui não protege nada e poderia quebrar respostas de
  // erro renderizadas por um proxy/gateway na frente da API.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Validação global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Logging HTTP global
  app.useGlobalInterceptors(new HttpLoggingInterceptor());

  // CORS — allowlist explícita por ambiente (ver src/config/cors.util.ts).
  // NUNCA uma regex/wildcard: a configuração anterior (`/\.vercel\.app$/`
  // + credentials:true) permitia que QUALQUER subdomínio *.vercel.app de
  // QUALQUER pessoa enviasse requisições autenticadas a esta API.
  const allowedOrigins = resolveAllowedOrigins(config);
  console.log(
    `CORS — origens permitidas (${appEnv}): ${allowedOrigins.join(', ') || '(nenhuma)'}`,
  );
  app.enableCors({
    origin: buildCorsOriginHandler(allowedOrigins),
    credentials: true,
  });

  // Prefixo global alinhado ao rewrite da Vercel (/api/backend/* → serviço backend).
  // Torna as rotas alcançáveis em produção: /api/backend/health, /api/backend/auth/*, etc.
  app.setGlobalPrefix('api/backend');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`PRESCREVE-AI Backend running on port ${port}`);
}
void bootstrap();
