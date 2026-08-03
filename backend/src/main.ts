// DEVE ser a primeira linha do arquivo — Sentry precisa instrumentar
// módulos ANTES deles serem importados por qualquer outra coisa (ver
// instrument.ts).
import './instrument';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { json, urlencoded, type Application } from 'express';
import { AppModule } from './app.module';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { validarSegredosDistintos } from './auth/jwt-secrets.util';
import { validarChaveMfaConfigurada } from './auth/mfa-crypto.util';
import { validarChaveHmacConfigurada } from './common/crypto/identifier-hash.util';
import { validarDatabaseUrlConfigurada } from './config/database-url.util';
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
  // Correção SECRET-01 (auditoria de segurança final): MFA_ENCRYPTION_KEY e
  // IDENTIFIER_HMAC_KEY eram validadas apenas lazily, no primeiro uso real
  // (setup de MFA / hash de CPF-CRM-IP) — o app passava por health checks
  // em produção sem essas variáveis e só falhava (500) quando um usuário
  // real batesse nesses fluxos. Movido para o mesmo fail-fast do startup.
  validarChaveMfaConfigurada(config);
  validarChaveHmacConfigurada(config);
  // RM-37: sem DATABASE_URL, PrismaService antes construía um adapter
  // `undefined` silenciosamente e só falhava (de forma confusa) na
  // primeira query real — mesmo tipo de falha tardia já eliminado para
  // os segredos acima.
  validarDatabaseUrlConfigurada(config);

  // Correção NET-01 (auditoria de segurança final): a app roda atrás de um
  // proxy reverso em todo deploy real (Vercel). Sem `trust proxy`, o
  // Express resolve `req.ip` para o peer imediato (o proxy), não o cliente
  // real — o que faz o ThrottlerGuard (rate limiting de login/MFA/refresh)
  // agrupar TODOS os usuários no mesmo bucket por trás do mesmo proxy
  // (um único cliente abusivo derruba o limite para todo mundo).
  (app.getHttpAdapter().getInstance() as Application).set('trust proxy', 1);

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

  // Teto de tamanho de corpo de requisição — nunca um payload ilimitado.
  // 1MB é generoso para o maior payload legítimo hoje (lote de migração de
  // localStorage), mas impede um cliente de enviar um corpo arbitrariamente
  // grande antes mesmo da ValidationPipe entrar em ação.
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // Validação global de DTOs — whitelist/forbidNonWhitelisted rejeitam
  // qualquer campo não declarado no DTO (nunca aceitos silenciosamente);
  // forbidUnknownValues rejeita objetos sem metadata de validação nenhuma
  // (protege contra DTOs "vazios"/mal decorados passando despercebidos).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
    }),
  );

  // Logging HTTP global
  app.useGlobalInterceptors(new HttpLoggingInterceptor());

  // Filtro global de exceções — produção nunca deve responder com o
  // formato/mensagem padrão de um erro não previsto (podendo incluir
  // stack trace/mensagem interna do Node); ver all-exceptions.filter.ts.
  app.useGlobalFilters(new AllExceptionsFilter());

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
