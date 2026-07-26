// ============================================================
// PRESCREVE-AI — Motor de sincronização (integridade de persistência)
//
// PROBLEMA CORRIGIDO: o fluxo híbrido localStorage+backend tratava toda
// falha de sincronização como se a informação estivesse persistida no
// servidor — `sincronizarConsulta` (store.tsx) tinha um catch vazio, e a
// UI mostrava sucesso incondicional independentemente do resultado real
// da chamada de rede. Este módulo fornece os blocos puros e testáveis
// para nunca mais deixar isso acontecer:
//   - PersistenceStatus explícito (local | syncing | synced | failed) —
//     nunca "synced" sem confirmação real do backend;
//   - retry com backoff exponencial, mas só para falhas retryable
//     (rede/timeout/5xx) — um 400 de validação nunca é retentado, pois
//     reenviar o mesmo payload inválido nunca vai ter sucesso;
//   - idempotency key gerada uma única vez por operação e reutilizada em
//     todo retry — nunca duplica um registro clínico por reenvio.
// ============================================================

export type PersistenceStatus =
  | 'local' // ainda não houve tentativa de sincronizar (offline/anônimo/backend indisponível)
  | 'syncing' // tentativa em andamento (inclui retries)
  | 'synced' // confirmado pelo backend (resposta 2xx real)
  | 'failed'; // todas as tentativas falharam — dado só existe localmente

export interface SyncState {
  status: PersistenceStatus;
  attempts: number;
  error?: string;
  backend_id?: string;
  last_attempt_at?: string;
}

export function syncStateLocal(): SyncState {
  return { status: 'local', attempts: 0 };
}

// ── Classificação de erro: retryable vs. definitivo ──────────────────

/** Erro que NUNCA deve ser retentado (ex.: 400 de validação — reenviar o mesmo payload nunca funciona). */
export class NonRetryableError extends Error {}

/** Erro que deve ser retentado mesmo sem `status` HTTP (ex.: falha de classificação manual em teste). */
export class RetryableError extends Error {}

export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Tempo limite de ${timeoutMs}ms excedido`);
    this.name = 'TimeoutError';
  }
}

/**
 * Decide se um erro justifica nova tentativa. Erros de rede/timeout (sem
 * `status` HTTP) e 5xx/408/429 são retryable — a operação pode ter sucesso
 * numa próxima tentativa. 4xx (exceto 408/429) são definitivos — o servidor
 * já processou e rejeitou o payload; reenviar o mesmo payload não muda o
 * resultado.
 */
export function isRetryable(err: unknown): boolean {
  if (err instanceof NonRetryableError) return false;
  if (err instanceof TimeoutError || err instanceof RetryableError) return true;
  const status = (err as { status?: unknown } | null)?.status;
  if (typeof status === 'number') {
    if (status >= 400 && status < 500) return status === 408 || status === 429;
    return true; // 5xx
  }
  return true; // erro de rede sem status (fetch rejeitado, DNS, CORS, etc.)
}

// ── Idempotência ───────────────────────────────────────────────────

/** UUID v4 gerado no cliente — reutilizado em todo retry da MESMA operação clínica. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback defensivo (ambientes sem crypto.randomUUID) — ainda assim
  // suficientemente único para o propósito de deduplicação por retry.
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

// ── Timeout ────────────────────────────────────────────────────────

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(timeoutMs)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err as Error);
      },
    );
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Retry com backoff exponencial ─────────────────────────────────

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  onAttempt?: (attempt: number) => void;
  onRetryScheduled?: (attempt: number, delayMs: number, error: unknown) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000, onAttempt, onRetryScheduled } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onAttempt?.(attempt);
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const podeRetentar = isRetryable(err) && attempt < maxAttempts;
      if (!podeRetentar) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      onRetryScheduled?.(attempt, delay, err);
      await sleep(delay);
    }
  }
  // Inalcançável (o loop sempre retorna ou lança), mas satisfaz o tipo de retorno.
  throw lastError;
}

// ── Orquestração: sincroniza um único recurso clínico ─────────────

export interface SyncResourceOptions<T> {
  attemptFn: () => Promise<T>;
  onStatusChange?: (state: SyncState) => void;
  timeoutMs?: number;
  maxAttempts?: number;
  baseDelayMs?: number;
}

export interface SyncResourceResult<T> {
  ok: boolean;
  data: T | null;
  state: SyncState;
}

/**
 * Sincroniza um recurso clínico (consulta/diagnóstico/prescrição/risco)
 * contra o backend, com retry+backoff e timeout por tentativa. NUNCA
 * retorna `ok: true` sem uma resposta real e bem-sucedida do backend —
 * qualquer falha (após esgotar as tentativas retryable, ou imediatamente
 * para erros não-retryable) resulta em `state.status === 'failed'` com o
 * erro explícito, nunca em um catch silencioso.
 */
export async function syncResource<T>(
  opts: SyncResourceOptions<T>,
): Promise<SyncResourceResult<T>> {
  const {
    attemptFn,
    onStatusChange,
    timeoutMs = 15_000,
    maxAttempts = 3,
    baseDelayMs = 1000,
  } = opts;

  let attempts = 0;
  const emit = (state: SyncState) => onStatusChange?.(state);
  emit({ status: 'syncing', attempts: 0 });

  try {
    const data = await withRetry(
      async () => {
        attempts++;
        emit({ status: 'syncing', attempts });
        return withTimeout(attemptFn(), timeoutMs);
      },
      { maxAttempts, baseDelayMs },
    );
    const state: SyncState = {
      status: 'synced',
      attempts,
      last_attempt_at: new Date().toISOString(),
    };
    emit(state);
    return { ok: true, data, state };
  } catch (err) {
    const state: SyncState = {
      status: 'failed',
      attempts,
      error: err instanceof Error ? err.message : 'Erro desconhecido ao sincronizar',
      last_attempt_at: new Date().toISOString(),
    };
    emit(state);
    return { ok: false, data: null, state };
  }
}
