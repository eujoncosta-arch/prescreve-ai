// ============================================================
// PRESCREVE-AI — Sentry (servidor/edge) — observabilidade de produção
//
// Ponto de entrada exigido pelo Next.js (`register()`) para inicializar o
// SDK nos runtimes de servidor e edge. Mesma regra do client
// (`instrumentation-client.ts`): inerte sem `SENTRY_DSN`, redação de
// campo sensível via `redactForSentry` antes de qualquer envio.
//
// Nota de arquitetura: em build local (fora da Vercel) este projeto usa
// `output: 'export'` (ver next.config.ts) — sem runtime de servidor real,
// então este arquivo não tem efeito prático localmente. Em produção
// (Vercel, sem `output: 'export'`), o runtime de servidor é real e este
// hook roda normalmente.
// ============================================================

import * as Sentry from '@sentry/nextjs';
import { redactForSentry } from '@/lib/sentry-redact';

export async function register() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  const shared = {
    dsn,
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event: Sentry.ErrorEvent) {
      return redactForSentry(event) as Sentry.ErrorEvent;
    },
  };

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init(shared);
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init(shared);
  }
}

export const onRequestError = Sentry.captureRequestError;
