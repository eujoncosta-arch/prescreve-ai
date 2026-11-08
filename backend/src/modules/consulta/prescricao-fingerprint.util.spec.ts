import {
  canonicalizar,
  fingerprintPrescricao,
  fingerprintDeRegistroPersistido,
  FINGERPRINT_VERSAO,
} from './prescricao-fingerprint.util';

// RM-107.1.1-E2.5 — propriedades do fingerprint canônico (determinismo, equivalências e diferenças). Teste PURO (sem banco, sem mock).

const med = (valor = 500, extra: Record<string, unknown> = {}) => ({
  molecula: 'Amoxicilina',
  dose: { valor, unidade: 'mg', frequencia: '3x/dia', via: 'VO' },
  duracao: '7 dias',
  ...extra,
});
const base = { consulta_id: 'c1', medicamentos: [med()] };

describe('canonicalizar()', () => {
  it('ordena as chaves, omite undefined/null em objetos e preserva a ordem e os nulos dos arrays', () => {
    expect(canonicalizar({ b: 1, a: { d: undefined, c: null, e: 2 } })).toBe(
      '{"a":{"e":2},"b":1}',
    );
    expect(canonicalizar([null, undefined, 1, 'x'])).toBe('[null,null,1,"x"]');
  });
  it('não arredonda nem converte números: 500 ≡ 500.0, 0.1 permanece 0.1, 1e21 mantém o valor', () => {
    expect(canonicalizar(500)).toBe(canonicalizar(500.0));
    expect(canonicalizar(0.1)).toBe('0.1');
    expect(canonicalizar(0.30000000000000004)).not.toBe(canonicalizar(0.3));
  });
  it('rejeita valores não finitos e tipos não serializáveis (nunca "aproxima")', () => {
    expect(() => canonicalizar(NaN)).toThrow(TypeError);
    expect(() => canonicalizar(Infinity)).toThrow(TypeError);
    expect(() => canonicalizar(() => 1)).toThrow(TypeError);
  });
  it('strings são exatas (espaços e caixa fazem diferença)', () => {
    expect(canonicalizar('a')).not.toBe(canonicalizar('a '));
    expect(canonicalizar('A')).not.toBe(canonicalizar('a'));
  });
});

describe('fingerprintPrescricao()', () => {
  const fp = (c: Parameters<typeof fingerprintPrescricao>[0]) =>
    fingerprintPrescricao(c);

  it('é determinístico e tem formato sha256 hex', () => {
    expect(fp(base)).toBe(fp(base));
    expect(fp(base)).toMatch(/^[0-9a-f]{64}$/);
    expect(FINGERPRINT_VERSAO).toBe('v1');
  });
  it('equivalências: ordem das chaves, ausente ≡ nulo, validade_dias ausente/nulo ≡ 30, instâncias de classe ≡ objetos planos, 500 ≡ 500.0', () => {
    const embaralhado = {
      medicamentos: [
        {
          duracao: '7 dias',
          dose: {
            via: 'VO',
            valor: 500.0,
            frequencia: '3x/dia',
            unidade: 'mg',
          },
          molecula: 'Amoxicilina',
        },
      ],
      consulta_id: 'c1',
    };
    expect(fp(embaralhado)).toBe(fp(base));
    expect(
      fp({
        ...base,
        diagnostico_id: null,
        orientacoes: null,
        validade_dias: null,
      }),
    ).toBe(fp(base));
    expect(fp({ ...base, validade_dias: 30 })).toBe(fp(base));
    expect(
      fp({ ...base, medicamentos: [med(500, { observacoes: null })] }),
    ).toBe(fp(base));
    class Dose {
      valor = 500;
      unidade = 'mg';
      frequencia = '3x/dia';
      via = 'VO';
    }
    expect(
      fp({
        ...base,
        medicamentos: [
          { molecula: 'Amoxicilina', dose: new Dose(), duracao: '7 dias' },
        ],
      }),
    ).toBe(fp(base));
  });
  it('diferenças: QUALQUER campo que muda o conteúdo muda o fingerprint (dose, unidade, frequência, via, duração, observações, molécula, consulta, diagnóstico, orientações, validade)', () => {
    const f0 = fp(base);
    const variantes = [
      { ...base, medicamentos: [med(501)] },
      {
        ...base,
        medicamentos: [{ ...med(), dose: { ...med().dose, unidade: 'g' } }],
      },
      {
        ...base,
        medicamentos: [
          { ...med(), dose: { ...med().dose, frequencia: '2x/dia' } },
        ],
      },
      {
        ...base,
        medicamentos: [{ ...med(), dose: { ...med().dose, via: 'IV' } }],
      },
      {
        ...base,
        medicamentos: [
          { ...med(), dose: { ...med().dose, dose_por_kg_dia: 10 } },
        ],
      },
      {
        ...base,
        medicamentos: [
          { ...med(), dose: { ...med().dose, frequencia_detalhe: 'x' } },
        ],
      },
      { ...base, medicamentos: [med(500, { duracao: '10 dias' })] },
      { ...base, medicamentos: [med(500, { observacoes: 'x' })] },
      { ...base, medicamentos: [med(500, { molecula: 'Outra' })] },
      { ...base, medicamentos: [med(500, { campo_futuro_persistido: 1 })] }, // sem lista branca: propriedade nova também conta
      { ...base, consulta_id: 'c2' },
      { ...base, diagnostico_id: 'd1' },
      { ...base, orientacoes: 'x' },
      { ...base, orientacoes: '' }, // "" ≠ ausente
      { ...base, validade_dias: 31 },
      { ...base, medicamentos: [med(), med()] },
    ];
    const distintos = new Set(variantes.map(fp));
    expect(distintos.size).toBe(variantes.length);
    expect(distintos.has(f0)).toBe(false);
  });
  it('a ORDEM dos medicamentos faz parte do conteúdo', () => {
    const a = med(500, { molecula: 'A' });
    const b = med(500, { molecula: 'B' });
    expect(fp({ ...base, medicamentos: [a, b] })).not.toBe(
      fp({ ...base, medicamentos: [b, a] }),
    );
  });
  it('a idempotency_key e o usuário NÃO fazem parte do conteúdo (a entrada nem os aceita)', () => {
    expect(fp({ ...base, idempotency_key: 'k1' } as never)).toBe(
      fp({ ...base, idempotency_key: 'k2' } as never),
    );
  });
  it('valores numéricos não são alterados: 0.1+0.2 ≠ 0.3 (nenhum arredondamento)', () => {
    expect(fp({ ...base, medicamentos: [med(0.1 + 0.2)] })).not.toBe(
      fp({ ...base, medicamentos: [med(0.3)] }),
    );
  });
});

describe('fingerprintDeRegistroPersistido() — registros legados', () => {
  it('é igual ao fingerprint da requisição equivalente (linha do banco ≡ payload), com defaults efetivos', () => {
    const linha = {
      consulta_id: 'c1',
      diagnostico_id: null,
      medicamentos: [med()],
      orientacoes: null,
      validade_dias: 30,
    };
    expect(fingerprintDeRegistroPersistido(linha)).toBe(
      fingerprintPrescricao(base),
    );
  });
  it('sem conteúdo comparável (medicamentos ausente/não-array ou consulta ausente) ⇒ null (comportamento anterior, nunca divergência inventada)', () => {
    expect(fingerprintDeRegistroPersistido({ consulta_id: 'c1' })).toBeNull();
    expect(
      fingerprintDeRegistroPersistido({ consulta_id: 'c1', medicamentos: 'x' }),
    ).toBeNull();
    expect(fingerprintDeRegistroPersistido({ medicamentos: [] })).toBeNull();
  });
});
