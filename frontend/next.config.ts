import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isVercel = process.env.VERCEL === '1';

const securityHeaders = [
  { key: 'X-Content-Type-Options',   value: 'nosniff' },
  { key: 'X-Frame-Options',          value: 'DENY' },
  { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security',value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      // Sentry (observabilidade): sem isso, a CSP em produção bloquearia
      // silenciosamente todo envio de evento de erro ao Sentry — o
      // `connect-src 'self'` original nunca permitia origem de terceiro
      // nenhuma. Domínio real do ingest, não um wildcard genérico.
      "connect-src 'self' https://*.ingest.us.sentry.io",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  ...(isVercel
    ? {
        images: { unoptimized: true },
        async headers() {
          return [{ source: '/(.*)', headers: securityHeaders }];
        },
      }
    : {
        output: 'export',
        basePath: '/prescreve-ai',
        trailingSlash: true,
        images: { unoptimized: true },
      }),
};

// Sentry: SEMPRE aplica o wrapper (uploads de source map ficam inertes
// sem SENTRY_AUTH_TOKEN — nunca falha o build por falta dele; ver
// docs/OBSERVABILITY-SENTRY.md). `silent: true` fora da Vercel evita
// ruído no log de build local quando não há projeto Sentry configurado.
export default withSentryConfig(nextConfig, {
  silent: !isVercel,
  disableLogger: true,
  // Não faz upload de source maps sem um token — evita falha de rede em
  // ambientes sem esse segredo configurado (padrão local/dev).
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
