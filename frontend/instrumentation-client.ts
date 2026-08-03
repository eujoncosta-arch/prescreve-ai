// ============================================================
// PRESCREVE-AI — Sentry (client) — observabilidade de produção
//
// GAP DE PRONTIDÃO DE PRODUÇÃO fechado aqui: não havia nenhum error
// tracking real — um erro de render capturado por `error.tsx`/
// `global-error.tsx` só aparecia no console do navegador do médico,
// nunca chegava a nenhum lugar monitorado pelo time.
//
// Deliberadamente INERTE sem `NEXT_PUBLIC_SENTRY_DSN` configurado — nunca
// falha o build/dev nem tenta enviar nada sem essa variável (ver
// `.env.example`). `beforeSend`/`beforeBreadcrumb` aplicam
// `redactForSentry` (mesma convenção de campo-por-nome do backend) antes
// de QUALQUER evento sair do navegador — nunca depender só dos
// scrubbers genéricos do SDK para dado clínico/paciente.
// ============================================================

import * as Sentry from '@sentry/nextjs';
import { redactForSentry } from '@/lib/sentry-redact';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
    // Amostragem conservadora — este é um SDK de erro/observabilidade,
    // não de analytics; não precisa de 100% de traces de performance para
    // ser útil, e reduz custo/ruído.
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      return redactForSentry(event) as typeof event;
    },
    beforeBreadcrumb(breadcrumb) {
      return redactForSentry(breadcrumb) as typeof breadcrumb;
    },
  });
}

// Exigido pelo App Router para instrumentar navegação entre rotas
// (client-side) quando o Sentry está ativo — no-op segura quando `dsn`
// está ausente (Sentry.init nunca rodou).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
