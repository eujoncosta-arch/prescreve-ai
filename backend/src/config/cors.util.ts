import { ConfigService } from '@nestjs/config';
import { resolveAppEnv, parseCsvEnv } from './environment.util';

// ============================================================
// PRESCREVE-AI — Hardening de infraestrutura: CORS
//
// PROBLEMA CORRIGIDO: a configuração anterior usava
//   origin: [FRONTEND_URL, /\.vercel\.app$/]
// — a regex `/\.vercel\.app$/` combinada com `credentials: true` permite
// que QUALQUER subdomínio *.vercel.app (pertencente a QUALQUER conta/
// projeto Vercel de QUALQUER pessoa no mundo, não só este projeto) envie
// requisições cross-origin COM COOKIES/CREDENCIAIS para esta API. Um
// atacante hospedando um site em `qualquer-coisa.vercel.app` conseguiria
// fazer requisições autenticadas em nome de um usuário logado.
//
// CORREÇÃO: allowlist explícita por ambiente. Em produção, apenas os
// domínios estáveis conhecidos do próprio frontend (não URLs de preview
// com hash aleatório — essas nunca precisam de CORS cross-origin, pois o
// tráfego real entre o frontend e este backend passa pelo rewrite da
// Vercel `/api/backend/*`, que é SAME-ORIGIN do ponto de vista do
// navegador). Extensível via CORS_ALLOWED_ORIGINS (lista explícita,
// separada por vírgula) — nunca um padrão/regex.
// ============================================================

/** Domínios estáveis conhecidos do frontend em produção — nunca hashes de preview. */
const PRODUCTION_DEFAULT_ORIGINS = [
  'https://frontend-eujoncosta.vercel.app',
  'https://frontend-git-main-eujoncosta.vercel.app',
  'https://frontend-sand-theta-f0vu1100lu.vercel.app',
];

const DEVELOPMENT_DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
];

export function resolveAllowedOrigins(config: ConfigService): string[] {
  const env = resolveAppEnv(config);
  const extra = parseCsvEnv(config.get<string>('CORS_ALLOWED_ORIGINS'));
  const frontendUrl = config.get<string>('FRONTEND_URL');

  if (env === 'production') {
    const origins = new Set<string>([...PRODUCTION_DEFAULT_ORIGINS, ...extra]);
    if (frontendUrl) origins.add(frontendUrl);
    return [...origins];
  }

  if (env === 'staging') {
    // Staging não tem domínio padrão hardcoded — deve ser configurado
    // explicitamente via CORS_ALLOWED_ORIGINS/FRONTEND_URL. Falha segura:
    // se nada for configurado, nenhuma origem é permitida (em vez de
    // herdar os domínios de produção ou abrir para qualquer origem).
    const origins = new Set<string>(extra);
    if (frontendUrl) origins.add(frontendUrl);
    return [...origins];
  }

  // development
  const origins = new Set<string>([...DEVELOPMENT_DEFAULT_ORIGINS, ...extra]);
  if (frontendUrl) origins.add(frontendUrl);
  return [...origins];
}

/**
 * Handler de origin para `app.enableCors()` — nunca usa `*`/regex. Requisições
 * sem header `Origin` (chamadas server-to-server, curl, health checks) são
 * permitidas, pois não são requisições de navegador sujeitas a CORS/CSRF via
 * cookie — `credentials: true` só tem efeito quando o navegador envia
 * `Origin`, e nesse caso a checagem contra a allowlist é obrigatória.
 */
export function buildCorsOriginHandler(
  allowedOrigins: string[],
): (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => void {
  const allowedSet = new Set(allowedOrigins);
  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedSet.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origem não autorizada pelo CORS: ${origin}`), false);
  };
}
