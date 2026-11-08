-- RM-107.1.1-E2.5 — fingerprint canônico do conteúdo da operação de criação de prescrição.
-- Coluna NULLABLE e SEM índice/constraint adicional: registros legados (e prescrições criadas sem idempotency_key) permanecem NULL e continuam válidos;
-- o servidor deriva o fingerprint do conteúdo persistido quando a coluna é NULL (ver prescricao-fingerprint.util.ts). Nenhum backfill é necessário.
-- Aditiva e reversível (DROP COLUMN). A unicidade continua garantida somente por "idempotency_key" (@unique já existente).
ALTER TABLE "prescricoes" ADD COLUMN "idempotency_fingerprint" TEXT;
