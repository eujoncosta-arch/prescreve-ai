// ============================================================
// PRESCREVE-AI — Modo de ambiente (produção / desenvolvimento / demo)
//
// PROBLEMA CORRIGIDO: o frontend tratava "backend não configurado" como
// sinônimo automático de "modo demo" — qualquer build sem
// NEXT_PUBLIC_API_URL definido (inclusive uma implantação de produção mal
// configurada) fazia login() fabricar um token falso (`offline-...`) e
// criar uma sessão sem NENHUMA autenticação real ter ocorrido. Isso é
// fail-open: a AUSÊNCIA de configuração virava a porta de entrada, exatamente
// o oposto do que uma aplicação clínica exige.
//
// CORREÇÃO: o modo demo agora é uma decisão EXPLÍCITA de quem publica o
// build (`NEXT_PUBLIC_DEMO_MODE=true`), nunca inferida da ausência de
// configuração — e essa flag é IGNORADA (nunca honrada) sempre que o
// ambiente resolvido for produção, mesmo que alguém a ligue por engano.
// Falha de configuração em produção nunca vira modo demo — vira erro
// bloqueante visível ao usuário.
// ============================================================

export type AppEnv = 'production' | 'staging' | 'development';
export type AppMode = 'production' | 'development' | 'demo';

const VALID_ENVS: ReadonlySet<string> = new Set([
  'production',
  'staging',
  'development',
]);

/**
 * Ambiente de implantação. Fail-safe: qualquer valor desconhecido/ausente
 * é tratado como 'production' (o mais restritivo) — nunca 'development',
 * nunca permite silenciosamente um comportamento mais permissivo por
 * configuração incompleta. Mesmo princípio já usado no backend
 * (`backend/src/config/environment.util.ts`).
 */
export function resolveAppEnv(): AppEnv {
  const raw = (
    process.env.NEXT_PUBLIC_APP_ENV ??
    process.env.NODE_ENV ??
    'development'
  )
    .trim()
    .toLowerCase();
  if (VALID_ENVS.has(raw)) return raw as AppEnv;
  return 'production';
}

function demoFlagRequested(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

/**
 * Resolve o modo efetivo da aplicação. DEMO só é retornado quando:
 *   1) a flag foi explicitamente ligada (NEXT_PUBLIC_DEMO_MODE=true), E
 *   2) o ambiente resolvido NÃO é produção.
 * Em produção, a flag de demo é sempre ignorada — não existe caminho para
 * "modo demo em produção", intencionalmente, mesmo com erro de configuração.
 */
export function resolveAppMode(): AppMode {
  const env = resolveAppEnv();
  if (env === 'production') return 'production';
  return demoFlagRequested() ? 'demo' : 'development';
}

export const APP_ENV: AppEnv = resolveAppEnv();
export const APP_MODE: AppMode = resolveAppMode();
export const IS_PRODUCTION_MODE = APP_MODE === 'production';
export const IS_DEMO_MODE = APP_MODE === 'demo';
export const IS_DEVELOPMENT_MODE = APP_MODE === 'development';
