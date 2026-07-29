import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  syncResource,
  withRetry,
  withTimeout,
  isRetryable,
  newIdempotencyKey,
  isDemoConsultationId,
  NonRetryableError,
  TimeoutError,
  type SyncState,
} from '@/lib/sync-engine';

// ============================================================
// Integridade de persistência — motor de sincronização
//
// Cobre os cenários obrigatórios da auditoria: backend disponível,
// backend indisponível/erro de rede, timeout, retry, falha parcial e
// recuperação posterior. O critério central: o sistema NUNCA reporta
// `status: 'synced'` sem uma resposta real e bem-sucedida.
// ============================================================

class ApiErrorFake extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

describe('isRetryable() — classificação de erro', () => {
  it('erro de rede sem status (fetch rejeitado) é retryable', () => {
    expect(isRetryable(new Error('Failed to fetch'))).toBe(true);
  });

  it('TimeoutError é retryable', () => {
    expect(isRetryable(new TimeoutError(5000))).toBe(true);
  });

  it('5xx é retryable', () => {
    expect(isRetryable(new ApiErrorFake(500, 'Internal Server Error'))).toBe(true);
    expect(isRetryable(new ApiErrorFake(503, 'Service Unavailable'))).toBe(true);
  });

  it('408 (timeout do servidor) e 429 (rate limit) são retryable', () => {
    expect(isRetryable(new ApiErrorFake(408, 'Request Timeout'))).toBe(true);
    expect(isRetryable(new ApiErrorFake(429, 'Too Many Requests'))).toBe(true);
  });

  it('4xx de validação (400/403/404) NUNCA é retryable — reenviar o mesmo payload não muda o resultado', () => {
    expect(isRetryable(new ApiErrorFake(400, 'Bad Request'))).toBe(false);
    expect(isRetryable(new ApiErrorFake(403, 'Forbidden'))).toBe(false);
    expect(isRetryable(new ApiErrorFake(404, 'Not Found'))).toBe(false);
  });

  it('NonRetryableError explícito nunca é retentado', () => {
    expect(isRetryable(new NonRetryableError('erro definitivo'))).toBe(false);
  });
});

describe('newIdempotencyKey() — chave de idempotência', () => {
  it('gera chaves únicas a cada chamada', () => {
    const chaves = new Set(Array.from({ length: 100 }, () => newIdempotencyKey()));
    expect(chaves.size).toBe(100);
  });

  it('gera uma string não vazia', () => {
    expect(newIdempotencyKey().length).toBeGreaterThan(8);
  });
});

describe('withTimeout()', () => {
  it('resolve normalmente quando a operação termina antes do prazo', async () => {
    const resultado = await withTimeout(Promise.resolve('ok'), 1000);
    expect(resultado).toBe('ok');
  });

  it('rejeita com TimeoutError quando a operação excede o prazo', async () => {
    vi.useFakeTimers();
    const promessaLenta = new Promise((resolve) => setTimeout(() => resolve('tarde-demais'), 60_000));
    const resultado = withTimeout(promessaLenta, 5000);
    const expectativa = expect(resultado).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(5001);
    await expectativa;
    vi.useRealTimers();
  });
});

describe('withRetry() — backoff exponencial', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('BACKEND DISPONÍVEL: sucesso na 1ª tentativa não faz retry nenhum', async () => {
    const fn = vi.fn().mockResolvedValue('sucesso');
    const resultado = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 });
    expect(resultado).toBe('sucesso');
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('RETRY: falha transitória seguida de sucesso — tenta novamente e recupera', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new ApiErrorFake(503, 'indisponível'))
      .mockResolvedValueOnce('sucesso-na-2a-tentativa');

    const promessa = withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 });
    await vi.advanceTimersByTimeAsync(200); // avança o backoff da 1ª falha
    const resultado = await promessa;

    expect(resultado).toBe('sucesso-na-2a-tentativa');
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('BACKEND INDISPONÍVEL: falha em todas as tentativas — propaga o erro após esgotar maxAttempts', async () => {
    const erroDeRede = new Error('Failed to fetch');
    const fn = vi.fn().mockRejectedValue(erroDeRede);

    const promessa = withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 });
    const expectativa = expect(promessa).rejects.toBe(erroDeRede);
    await vi.advanceTimersByTimeAsync(100); // backoff tentativa 1→2
    await vi.advanceTimersByTimeAsync(200); // backoff tentativa 2→3
    await expectativa;

    expect(fn).toHaveBeenCalledTimes(3); // esgotou maxAttempts, nunca tenta pra sempre
    vi.useRealTimers();
  });

  it('erro NÃO retryable (400) falha imediatamente, sem consumir as demais tentativas', async () => {
    const fn = vi.fn().mockRejectedValue(new ApiErrorFake(400, 'payload inválido'));
    await expect(withRetry(fn, { maxAttempts: 5, baseDelayMs: 100 })).rejects.toThrow(
      'payload inválido',
    );
    expect(fn).toHaveBeenCalledTimes(1); // não tentou de novo — 400 nunca muda com retry
    vi.useRealTimers();
  });

  it('backoff é exponencial: delay dobra a cada tentativa', async () => {
    const delays: number[] = [];
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new ApiErrorFake(500, 'x'))
      .mockRejectedValueOnce(new ApiErrorFake(500, 'x'))
      .mockResolvedValueOnce('ok');

    const promessa = withRetry(fn, {
      maxAttempts: 3,
      baseDelayMs: 100,
      onRetryScheduled: (_attempt, delayMs) => delays.push(delayMs),
    });
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);
    await promessa;

    expect(delays).toEqual([100, 200]); // 100 * 2^0, 100 * 2^1
    vi.useRealTimers();
  });
});

describe('syncResource() — orquestração completa (status + retry + timeout)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('BACKEND DISPONÍVEL: sucesso direto — status final "synced", nunca passa por "failed"', async () => {
    const estados: SyncState[] = [];
    const resultado = await syncResource({
      attemptFn: () => Promise.resolve({ id: 'backend-id-1' }),
      onStatusChange: (s) => estados.push({ ...s }),
      maxAttempts: 3,
      baseDelayMs: 100,
    });

    expect(resultado.ok).toBe(true);
    expect(resultado.data).toEqual({ id: 'backend-id-1' });
    expect(resultado.state.status).toBe('synced');
    expect(estados.some((s) => s.status === 'failed')).toBe(false);
    vi.useRealTimers();
  });

  it('BACKEND INDISPONÍVEL: todas as tentativas falham — status final "failed", NUNCA "synced" (critério central da auditoria)', async () => {
    const estados: SyncState[] = [];
    const promessa = syncResource({
      attemptFn: () => Promise.reject(new Error('Failed to fetch')),
      onStatusChange: (s) => estados.push({ ...s }),
      maxAttempts: 3,
      baseDelayMs: 50,
      timeoutMs: 5000,
    });
    await vi.advanceTimersByTimeAsync(50);
    await vi.advanceTimersByTimeAsync(100);
    const resultado = await promessa;

    expect(resultado.ok).toBe(false);
    expect(resultado.data).toBeNull();
    expect(resultado.state.status).toBe('failed');
    expect(resultado.state.error).toBeTruthy();
    expect(estados.every((s) => s.status !== 'synced')).toBe(true); // NUNCA reporta sucesso falso
    vi.useRealTimers();
  });

  it('TIMEOUT: tentativa que nunca resolve é tratada como falha retryable e conta como tentativa', async () => {
    let chamadas = 0;
    const promessa = syncResource({
      attemptFn: () => {
        chamadas++;
        // 1ª chamada nunca resolve (simula requisição travada); 2ª resolve rápido.
        if (chamadas === 1) return new Promise(() => {});
        return Promise.resolve({ id: 'ok-apos-timeout' });
      },
      timeoutMs: 1000,
      maxAttempts: 2,
      baseDelayMs: 100,
    });
    await vi.advanceTimersByTimeAsync(1000); // estoura o timeout da 1ª tentativa
    await vi.advanceTimersByTimeAsync(100); // backoff antes da 2ª tentativa
    const resultado = await promessa;

    expect(chamadas).toBe(2);
    expect(resultado.ok).toBe(true);
    expect(resultado.data).toEqual({ id: 'ok-apos-timeout' });
    vi.useRealTimers();
  });

  it('RETRY: 2 falhas transitórias seguidas de sucesso — status final "synced" com attempts=3', async () => {
    let chamadas = 0;
    const promessa = syncResource({
      attemptFn: () => {
        chamadas++;
        if (chamadas < 3) return Promise.reject(new ApiErrorFake(503, 'temporário'));
        return Promise.resolve({ id: 'sucesso-3a-tentativa' });
      },
      maxAttempts: 3,
      baseDelayMs: 50,
    });
    await vi.advanceTimersByTimeAsync(50);
    await vi.advanceTimersByTimeAsync(100);
    const resultado = await promessa;

    expect(resultado.ok).toBe(true);
    expect(resultado.state.attempts).toBe(3);
    vi.useRealTimers();
  });

  it('FALHA PARCIAL: duas chamadas independentes (ex.: consulta e prescrição) têm estados independentes — uma sincroniza, outra falha', async () => {
    const consultaPromessa = syncResource({
      attemptFn: () => Promise.resolve({ id: 'consulta-ok' }),
      maxAttempts: 3,
      baseDelayMs: 50,
    });
    const prescricaoPromessa = syncResource({
      attemptFn: () => Promise.reject(new ApiErrorFake(400, 'medicamento inválido')),
      maxAttempts: 3,
      baseDelayMs: 50,
    });

    const [consultaResultado, prescricaoResultado] = await Promise.all([
      consultaPromessa,
      prescricaoPromessa,
    ]);

    expect(consultaResultado.state.status).toBe('synced');
    expect(prescricaoResultado.state.status).toBe('failed'); // falha NÃO contamina o outro recurso
    vi.useRealTimers();
  });

  it('RECUPERAÇÃO POSTERIOR: uma sincronização que falhou pode ser retentada manualmente mais tarde e ter sucesso', async () => {
    vi.useRealTimers(); // timing exato não é o foco deste teste — só o resultado eventual

    // 1ª tentativa (ex.: backend estava fora do ar): esgota as tentativas e falha.
    const primeiraTentativa = await syncResource({
      attemptFn: () => Promise.reject(new Error('Failed to fetch')),
      maxAttempts: 2,
      baseDelayMs: 5,
    });
    expect(primeiraTentativa.state.status).toBe('failed');

    // Retry manual posterior (ex.: usuário clica "Tentar novamente" depois que o
    // backend voltou) — reusa a MESMA idempotency key na chamada real (a
    // responsabilidade de reenviar a mesma chave é do chamador; aqui provamos
    // que o motor de sync, por si só, permite uma nova tentativa bem-sucedida).
    const retryManual = await syncResource({
      attemptFn: () => Promise.resolve({ id: 'sincronizado-apos-recuperacao' }),
      maxAttempts: 2,
      baseDelayMs: 10,
    });

    expect(retryManual.ok).toBe(true);
    expect(retryManual.state.status).toBe('synced');
    vi.useRealTimers();
  });
});

// ============================================================
// RM-38 — casos demo (src/app/demo/page.tsx) nunca sincronizam com o
// backend real, identificados pelo prefixo de id `demo_`.
// ============================================================
describe('isDemoConsultationId() — identifica consultas de caso demo, nunca sincronizadas ao backend real', () => {
  it('id no formato "demo_<caso>_<timestamp>" (gerado por src/app/demo/page.tsx) → true', () => {
    expect(isDemoConsultationId('demo_hipertensao-resistente_1706000000000')).toBe(true);
  });

  it('id real de consulta (cuid do backend) → false', () => {
    expect(isDemoConsultationId('clx1a2b3c4d5e6f7g8h9')).toBe(false);
  });

  it('id local temporário gerado no cliente (não demo) → false', () => {
    expect(isDemoConsultationId('local-1706000000000')).toBe(false);
  });

  it('string vazia → false', () => {
    expect(isDemoConsultationId('')).toBe(false);
  });
});
