// ============================================================
// redactForSentry() — redação de eventos enviados ao Sentry (observabilidade)
//
// Mesma convenção do backend (redact.util.spec.ts, backend/src/common/
// logging/): campo-por-nome, nunca por tipo/valor — prefere redigir de
// mais a arriscar vazar CPF/CRM/dado clínico num evento de terceiro.
// ============================================================

import { describe, it, expect } from 'vitest';
import { redactForSentry } from '@/lib/sentry-redact';

describe('redactForSentry() — redação de eventos de erro antes do envio ao Sentry', () => {
  it('redige campos sensíveis diretos (senha, cpf, crm, token)', () => {
    const objeto = {
      senha: 'senhaSecreta123',
      cpf: '12345678909',
      crm: 'SP-123456',
      access_token: 'eyJ.abc.def',
      email: 'medico@x.com', // não está na lista — preservado
    };
    const resultado = redactForSentry(objeto) as Record<string, unknown>;

    expect(resultado.senha).toBe('[REDACTED]');
    expect(resultado.cpf).toBe('[REDACTED]');
    expect(resultado.crm).toBe('[REDACTED]');
    expect(resultado.access_token).toBe('[REDACTED]');
    expect(resultado.email).toBe('medico@x.com');
  });

  it('redige dados clínicos (anamnese, medicamentos, diagnostico, queixa_principal, justificativa)', () => {
    const objeto = {
      anamnese: { queixa_principal: 'dor no peito' },
      medicamentos: [{ molecula: 'Losartana' }],
      diagnostico: 'I10',
      queixa_principal: 'cefaleia',
      justificativa: 'texto clínico livre',
      status: 'concluida', // preservado
    };
    const resultado = redactForSentry(objeto) as Record<string, unknown>;

    expect(resultado.anamnese).toBe('[REDACTED]');
    expect(resultado.medicamentos).toBe('[REDACTED]');
    expect(resultado.diagnostico).toBe('[REDACTED]');
    expect(resultado.queixa_principal).toBe('[REDACTED]');
    expect(resultado.justificativa).toBe('[REDACTED]');
    expect(resultado.status).toBe('concluida');
  });

  it('redige recursivamente dentro da forma real de um evento Sentry (extra/contexts/breadcrumbs)', () => {
    const evento = {
      message: 'TypeError: cannot read x',
      extra: { paciente_nome: 'Maria Silva', http_status: 500 },
      contexts: { app: { anamnese: { texto: 'livre' } } },
      breadcrumbs: [{ message: 'click', data: { cpf: '11111111111' } }],
    };
    const resultado = redactForSentry(evento) as {
      message: string;
      extra: { paciente_nome: unknown; http_status: unknown };
      contexts: { app: { anamnese: unknown } };
      breadcrumbs: Array<{ data: { cpf: unknown } }>;
    };

    expect(resultado.message).toBe('TypeError: cannot read x'); // preservado — não é um objeto chaveado
    expect(resultado.extra.paciente_nome).toBe('[REDACTED]');
    expect(resultado.extra.http_status).toBe(500);
    expect(resultado.contexts.app.anamnese).toBe('[REDACTED]');
    expect(resultado.breadcrumbs[0].data.cpf).toBe('[REDACTED]');
  });

  it('correspondência de nome de campo é case-insensitive e parcial (ex.: "Authorization", "DSN")', () => {
    const objeto = { Authorization: 'Bearer xyz', SENTRY_DSN: 'https://x@y.sentry.io/1' };
    const resultado = redactForSentry(objeto) as Record<string, unknown>;
    expect(resultado.Authorization).toBe('[REDACTED]');
    expect(resultado.SENTRY_DSN).toBe('[REDACTED]');
  });

  it('nunca lança — profundidade excessiva é redigida, não estoura', () => {
    let profundo: Record<string, unknown> = { fim: true };
    for (let i = 0; i < 20; i++) profundo = { aninhado: profundo };
    expect(() => redactForSentry(profundo)).not.toThrow();
  });

  it('valores primitivos e null/undefined passam direto', () => {
    expect(redactForSentry('texto simples')).toBe('texto simples');
    expect(redactForSentry(42)).toBe(42);
    expect(redactForSentry(null)).toBeNull();
    expect(redactForSentry(undefined)).toBeUndefined();
  });
});
