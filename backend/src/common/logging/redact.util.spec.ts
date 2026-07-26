import { redact } from './redact.util';

describe('redact() — redação de logs (auditoria de privacidade)', () => {
  it('redige campos sensíveis diretos (senha, cpf, crm, token)', () => {
    const objeto = {
      senha: 'senhaSecreta123',
      cpf: '12345678909',
      crm: 'SP-123456',
      access_token: 'eyJ.abc.def',
      email: 'medico@x.com', // não está na lista — preservado
    };
    const resultado = redact(objeto) as Record<string, unknown>;

    expect(resultado.senha).toBe('[REDACTED]');
    expect(resultado.cpf).toBe('[REDACTED]');
    expect(resultado.crm).toBe('[REDACTED]');
    expect(resultado.access_token).toBe('[REDACTED]');
    expect(resultado.email).toBe('medico@x.com'); // preservado — não é da lista
  });

  it('redige dados clínicos (anamnese, medicamentos, diagnostico, justificativa)', () => {
    const objeto = {
      anamnese: { queixa_principal: 'dor no peito' },
      medicamentos: [{ molecula: 'Losartana' }],
      diagnostico: 'I10',
      justificativa: 'texto clínico livre',
      status: 'concluida', // preservado
    };
    const resultado = redact(objeto) as Record<string, unknown>;

    expect(resultado.anamnese).toBe('[REDACTED]');
    expect(resultado.medicamentos).toBe('[REDACTED]');
    expect(resultado.diagnostico).toBe('[REDACTED]');
    expect(resultado.justificativa).toBe('[REDACTED]');
    expect(resultado.status).toBe('concluida');
  });

  it('redige recursivamente em objetos aninhados', () => {
    const objeto = {
      usuario: { email: 'x@x.com', senha_hash: '$2b$12$...' },
      consulta: { id: 'abc', anamnese: { texto: 'livre' } },
    };
    const resultado = redact(objeto) as {
      usuario: { senha_hash: unknown; email: unknown };
      consulta: { anamnese: unknown; id: unknown };
    };

    expect(resultado.usuario.senha_hash).toBe('[REDACTED]');
    expect(resultado.usuario.email).toBe('x@x.com');
    expect(resultado.consulta.anamnese).toBe('[REDACTED]');
    expect(resultado.consulta.id).toBe('abc');
  });

  it('redige recursivamente dentro de arrays', () => {
    const lista = [{ cpf: '11111111111' }, { cpf: '22222222222' }];
    const resultado = redact(lista) as Array<Record<string, unknown>>;
    expect(resultado[0].cpf).toBe('[REDACTED]');
    expect(resultado[1].cpf).toBe('[REDACTED]');
  });

  it('correspondência de nome de campo é case-insensitive e parcial (ex.: "Authorization", "JWT_SECRET")', () => {
    const objeto = { Authorization: 'Bearer xyz', JWT_SECRET: 'abc' };
    const resultado = redact(objeto) as Record<string, unknown>;
    expect(resultado.Authorization).toBe('[REDACTED]');
    expect(resultado.JWT_SECRET).toBe('[REDACTED]');
  });

  it('nunca lança — profundidade excessiva é redigida, não estoura', () => {
    let profundo: Record<string, unknown> = { fim: true };
    for (let i = 0; i < 20; i++) profundo = { aninhado: profundo };
    expect(() => redact(profundo)).not.toThrow();
  });

  it('valores primitivos e null/undefined passam direto', () => {
    expect(redact('texto simples')).toBe('texto simples');
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBeNull();
    expect(redact(undefined)).toBeUndefined();
  });
});
