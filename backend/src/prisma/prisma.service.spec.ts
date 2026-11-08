import { resolverQueryTimeoutMs } from './prisma.service';

// RM-107.1.1-E2.6 — configuração do limite de consulta (a prova de comportamento está no e2e contra PostgreSQL convencional).
describe('resolverQueryTimeoutMs()', () => {
  it('padrão 30 s quando ausente; respeita o valor configurado; 0 desativa', () => {
    expect(resolverQueryTimeoutMs(undefined)).toBe(30_000);
    expect(resolverQueryTimeoutMs('5000')).toBe(5000);
    expect(resolverQueryTimeoutMs('0')).toBe(0);
  });
  it('valor inválido (não numérico/negativo) volta ao padrão seguro, nunca a "sem limite" por engano', () => {
    for (const v of ['abc', '-1', 'NaN', 'Infinity'])
      expect(resolverQueryTimeoutMs(v)).toBe(30_000);
  });
});
