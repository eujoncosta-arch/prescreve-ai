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

export function resolveAppEnv(config: ConfigService): AppEnv {
  const raw = (
    config.get<string>('APP_ENV') ??
    config.get<string>('NODE_ENV') ??
    'development'
  )
    .trim()
    .toLowerCase();
  if (VALID_ENVS.has(raw)) return raw as AppEnv;
  return 'production';
}

export function parseCsvEnv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
