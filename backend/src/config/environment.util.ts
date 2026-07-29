import { ConfigService } from '@nestjs/config';

// ============================================================
// PRESCREVE-AI — Hardening de infraestrutura: separação dev/staging/prod
//
// Usa APP_ENV (explícito, controlado por quem faz o deploy) com fallback
// para NODE_ENV (definido automaticamente por muitas plataformas, incluindo
// a Vercel). Qualquer valor desconhecido/inválido é tratado como
// 'production' — o mais restritivo dos três — nunca como 'development'.
// Isso garante que uma configuração incorreta ou ausente NUNCA relaxe
// silenciosamente CORS/rate limiting/headers para o comportamento mais
// permissivo (falha segura, não falha aberta).
// ============================================================

export type AppEnv = 'development' | 'staging' | 'production';

const VALID_ENVS: ReadonlySet<string> = new Set([
  'development',
  'staging',
  'production',
]);

/**
 * Núcleo puro de `resolveAppEnv` — sem dependência do `ConfigService` do
 * Nest, para ser reaproveitado por scripts standalone que rodam fora do
 * contexto de injeção de dependência da aplicação (ex.: `prisma/seed.ts`,
 * RM-37) sem duplicar a política de fail-safe (valor desconhecido/ausente
 * → 'production', nunca 'development').
 */
export function resolveAppEnvFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): AppEnv {
  const raw = (env.APP_ENV ?? env.NODE_ENV ?? 'development')
    .trim()
    .toLowerCase();
  if (VALID_ENVS.has(raw)) return raw as AppEnv;
  return 'production';
}

export function resolveAppEnv(config: ConfigService): AppEnv {
  return resolveAppEnvFromEnv({
    APP_ENV: config.get<string>('APP_ENV'),
    NODE_ENV: config.get<string>('NODE_ENV'),
  });
}

export function parseCsvEnv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
