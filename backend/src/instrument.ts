// ============================================================
// PRESCREVE-AI — Sentry (backend) — observabilidade de produção
//
// GAP DE PRONTIDÃO DE PRODUÇÃO fechado aqui: nenhum error tracking real
// existia — um erro inesperado (capturado por AllExceptionsFilter) só
// aparecia no log de console do processo Node, nunca em nenhum lugar
// monitorado pelo time.
//
// DEVE ser importado como a PRIMEIRA linha de `main.ts` (antes de
// qualquer outro import, inclusive `NestFactory`) — é assim que o SDK
// consegue instrumentar chamadas feitas por outros módulos antes deles
// serem carregados. Ver docs.sentry.io/platforms/javascript/guides/nestjs.
//
// Deliberadamente INERTE sem `SENTRY_DSN` — nunca falha o boot nem tenta
// enviar nada sem essa variável configurada (ver .env.example). Redação
// de campo sensível reaproveita `redact()`
// (common/logging/redact.util.ts) — a MESMA função já usada para os logs
// de aplicação, nunca uma segunda lista de campos sensíveis divergente.
// ============================================================

import * as Sentry from '@sentry/nestjs';
import { redact } from './common/logging/redact.util';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.APP_ENV ?? process.env.NODE_ENV,
    // Amostragem conservadora — SDK de erro/observabilidade, não de
    // analytics; reduz custo/ruído sem perder cobertura de exceções (que
    // são capturadas independentemente da amostragem de performance).
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      return redact(event) as Sentry.ErrorEvent;
    },
    beforeBreadcrumb(breadcrumb) {
      return redact(breadcrumb) as Sentry.Breadcrumb;
    },
  });
}
