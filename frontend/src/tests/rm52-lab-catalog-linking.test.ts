// ============================================================
// RM-52 (RM41-014/RM41-015) — lab-catalog agora entra no gate RM-24, e
// o registro ANVISA verificado de dapagliflozina (Forxiga) agora é
// alcançável a partir da marca cadastrada em pharma-database.ts.
// ============================================================
import { describe, it, expect } from 'vitest';
import { getAllDrugs } from '@/lib/pharma-database';
import { getAllLabProducts } from '@/lib/lab-catalog';
import { toBrandId } from '@/lib/governance/data-governance';
import { buildSyncReport } from '@/validation/cross-database';

describe('RM-52 (RM41-014) — lab-catalog incluído no Cross Database Validator', () => {
  it('bySource inclui "Lab catalog (ANVISA)" com contagem > 0', () => {
    const report = buildSyncReport();
    expect(report.bySource['Lab catalog (ANVISA)']).toBeGreaterThan(0);
  });
});

describe('RM-52 (RM41-015) — marca "Forxiga" agora resolve ao registro ANVISA real (antes órfão por grafia "Farxiga®")', () => {
  it('toBrandId da marca cadastrada em pharma-database.ts casa com um produto real do lab-catalog', () => {
    const dapa = getAllDrugs().find((d) => d.id === 'dapagliflozina');
    expect(dapa).toBeDefined();
    const marcaForxiga = dapa?.marcas.find((m) => m.nome === 'Forxiga');
    expect(marcaForxiga).toBeDefined();
    expect(marcaForxiga?.verificado).toBe(true);

    const brandIdMarca = toBrandId(marcaForxiga!.nome, marcaForxiga!.lab_id!);
    const produtos = getAllLabProducts('astrazeneca');
    const match = produtos.find((p) => toBrandId(p.nome_comercial, p.lab_id) === brandIdMarca);
    expect(match, 'a marca Forxiga deve encontrar um produto real no lab-catalog').toBeDefined();
    expect(match?.apresentacoes[0]?.registro_anvisa).toBe('1.0064.0295.001-1');
  });

  it('nenhum produto do lab-catalog mais se chama "Farxiga®" (grafia americana corrigida)', () => {
    const produtos = getAllLabProducts();
    expect(produtos.some((p) => p.nome_comercial.includes('Farxiga'))).toBe(false);
  });
});
