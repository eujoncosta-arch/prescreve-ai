// RM-62 — Gate de Integridade Comercial Farmacológica.
//
// Fixtures 100% sintéticas — NUNCA o catálogo real (PHARMA_DB/EUROFARMA_CATALOG)
// — para isolar exatamente a regra sob teste, seguindo a mesma convenção de
// data-integrity-rm40.test.ts (baseEntity sintética).
import { describe, it, expect } from 'vitest';
import {
  runBrandConcentrationAudit,
  checkProdutoIdMismatch,
  checkDuplicateBrandAcrossLabs,
  checkConcentrationOverlap,
  buildCatalogIndex,
} from '@/validation/brand-concentration-audit';
import type { BrandConcentrationException } from '@/validation/brand-concentration-audit';
import type { QuickDrug, QuickBrand } from '@/lib/pharma-database';
import type { ProdutoComercial } from '@/lib/types';

function marca(overrides: Partial<QuickBrand>): QuickBrand {
  return {
    nome: 'Marca Teste',
    laboratorio: 'Laboratório Teste',
    concentracoes: ['10 mg'],
    formas: ['Comprimido'],
    ...overrides,
  };
}

function drug(molecula: string, marcas: QuickBrand[]): QuickDrug {
  return { molecula, marcas } as unknown as QuickDrug;
}

function produto(overrides: Partial<ProdutoComercial>): ProdutoComercial {
  return {
    id: 'produto-teste',
    lab_id: 'eurofarma',
    molecula: 'Molécula Teste',
    nome_comercial: 'Marca Teste',
    classe_terapeutica: 'Classe',
    cids_aprovados: [],
    apresentacoes: [{ concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: 'Cartela' }],
    posologia_aprovada: '',
    contraindicacoes_bula: [],
    advertencias_principais: [],
    interacoes_principais: [],
    uso_populacoes_especiais: {},
    data_registro: '2020-01-01',
    data_ultima_atualizacao: '2020-01-01T00:00:00.000Z',
    versao_bula: 'rev. 01/2020',
    fonte_regulatoria: 'ANVISA',
    ...overrides,
  } as ProdutoComercial;
}

describe('RM-62 — caso válido (sem nenhum achado)', () => {
  it('drug com uma única marca não gera nenhum achado em nenhuma das 3 regras', () => {
    const d = drug('Moleculax', [marca({ nome: 'Únicox', laboratorio: 'LabA' })]);
    expect(checkProdutoIdMismatch([d], new Map())).toEqual([]);
    expect(checkDuplicateBrandAcrossLabs([d])).toEqual([]);
    expect(checkConcentrationOverlap([d], [])).toEqual([]);
  });

  it('marcas de labs diferentes com concentrações DIFERENTES não geram REVIEW_REQUIRED', () => {
    const d = drug('Moleculay', [
      marca({ nome: 'Alfa', laboratorio: 'LabA', concentracoes: ['10 mg'] }),
      marca({ nome: 'Beta', laboratorio: 'LabB', concentracoes: ['20 mg'] }),
    ]);
    expect(checkConcentrationOverlap([d], [])).toEqual([]);
  });
});

describe('RM-62 — caso semelhante ao Sinot Clav (produto_id hardcoded diverge da fonte verificada)', () => {
  it('marca com produto_id vinculado, mas concentrações hardcoded diferentes do catálogo → BLOCKING_ERROR', () => {
    const d = drug('Amoxicilina + Clavulanato (teste)', [
      marca({
        nome: 'MarcaFalsa Clav®',
        laboratorio: 'Eurofarma',
        produto_id: 'produto-clav-teste',
        // 4 concentrações hardcoded — 2 delas nunca existiram no catálogo real (o padrão exato do bug)
        concentracoes: ['400/57 mg/5 mL', '875/125 mg', '250 mg/5 mL', '500 mg'],
      }),
    ]);
    const catalogo = buildCatalogIndex([
      produto({
        id: 'produto-clav-teste',
        apresentacoes: [
          { concentracao: '400/57 mg/5 mL', forma_farmaceutica: 'suspensao_oral', embalagem: 'Frasco' },
          { concentracao: '875/125 mg', forma_farmaceutica: 'comprimido', embalagem: 'Cartela' },
        ],
      }),
    ]);
    const achados = checkProdutoIdMismatch([d], catalogo);
    expect(achados).toHaveLength(1);
    expect(achados[0].classification).toBe('BLOCKING_ERROR');
    expect(achados[0].regra).toBe('PRODUTO_ID_CONCENTRACAO_DIVERGENTE');
    expect(achados[0].mensagem).toContain('divergem');
  });

  it('marca com produto_id vinculado e concentrações IDÊNTICAS ao catálogo (mesmo em ordem/repetição diferente) → nenhum achado', () => {
    const d = drug('Molécula OK', [
      marca({ nome: 'MarcaReal®', produto_id: 'produto-ok', concentracoes: ['875/125 mg', '400/57 mg/5 mL'] }),
    ]);
    const catalogo = buildCatalogIndex([
      produto({
        id: 'produto-ok',
        apresentacoes: [
          { concentracao: '400/57 mg/5 mL', forma_farmaceutica: 'suspensao_oral', embalagem: 'Frasco 70 mL' },
          { concentracao: '400/57 mg/5 mL', forma_farmaceutica: 'suspensao_oral', embalagem: 'Frasco 140 mL' },
          { concentracao: '875/125 mg', forma_farmaceutica: 'comprimido', embalagem: 'Cartela' },
        ],
      }),
    ]);
    expect(checkProdutoIdMismatch([d], catalogo)).toEqual([]);
  });

  it('marca com produto_id que não resolve a nenhum catálogo conhecido não gera achado (fora do escopo desta regra)', () => {
    const d = drug('Molécula Z', [marca({ nome: 'Z®', produto_id: 'produto-inexistente' })]);
    expect(checkProdutoIdMismatch([d], new Map())).toEqual([]);
  });
});

describe('RM-62 — combinação legítima (bioequivalência regulatória entre labs)', () => {
  it('mesma molécula, mesma concentração, 2 laboratórios diferentes → REVIEW_REQUIRED (nunca BLOCKING por si só)', () => {
    const d = drug('Genericona', [
      marca({ nome: 'Referência®', laboratorio: 'LabInovador', concentracoes: ['10 mg', '20 mg'] }),
      marca({ nome: 'Genericona EMS', laboratorio: 'EMS', concentracoes: ['20 mg', '10 mg'] }), // ordem diferente, mesmo conjunto
    ]);
    const achados = checkConcentrationOverlap([d], []);
    expect(achados).toHaveLength(1);
    expect(achados[0].classification).toBe('REVIEW_REQUIRED');
    expect(achados[0].regra).toBe('CONCENTRACAO_IDENTICA_ENTRE_LABS');
  });

  it('mesma molécula, mesma concentração, MESMO laboratório (alias de grafia) → NÃO gera REVIEW_REQUIRED', () => {
    const d = drug('Genericona B', [
      marca({ nome: 'Genericona A', laboratorio: 'EMS', lab_id: 'ems', concentracoes: ['10 mg'] }),
      marca({ nome: 'Genericona B', laboratorio: 'EMS S/A', lab_id: 'ems', concentracoes: ['10 mg'] }),
    ]);
    expect(checkConcentrationOverlap([d], [])).toEqual([]);
  });
});

describe('RM-62 — exceção aceita (documentada, com justificativa e referência)', () => {
  const excecao: BrandConcentrationException = {
    id: 'teste-excecao-1',
    molecula: 'Genericona Exceção',
    concentracoes: ['10 mg', '20 mg'],
    justificativa: 'Bioequivalência regulatória confirmada por bula individual de cada marca — caso de teste.',
    referencia: 'https://exemplo.invalido/bula-teste',
    decididoPor: 'teste:rm62',
    data: '2026-08-02',
  };

  it('grupo que casa com uma exceção documentada (molécula + concentrações) → ACCEPTED_EXCEPTION, nunca REVIEW_REQUIRED', () => {
    const d = drug('Genericona Exceção', [
      marca({ nome: 'Referência®', laboratorio: 'LabInovador', concentracoes: ['10 mg', '20 mg'] }),
      marca({ nome: 'Genericona EMS', laboratorio: 'EMS', concentracoes: ['20 mg', '10 mg'] }),
    ]);
    const achados = checkConcentrationOverlap([d], [excecao]);
    expect(achados).toHaveLength(1);
    expect(achados[0].classification).toBe('ACCEPTED_EXCEPTION');
    expect(achados[0].exceptionId).toBe('teste-excecao-1');
    expect(achados[0].mensagem).toContain(excecao.justificativa);
  });

  it('a exceção NUNCA esconde o achado — ele continua presente na lista, só muda de classificação', () => {
    const d = drug('Genericona Exceção', [
      marca({ nome: 'Referência®', concentracoes: ['10 mg', '20 mg'] }),
      marca({ nome: 'Genericona EMS', laboratorio: 'EMS', concentracoes: ['10 mg', '20 mg'] }),
    ]);
    const achados = checkConcentrationOverlap([d], [excecao]);
    expect(achados.length).toBeGreaterThan(0);
  });

  it('exceção só se aplica ao grupo EXATO (molécula + concentrações) — outro grupo da mesma molécula com concentrações diferentes continua REVIEW_REQUIRED', () => {
    const d = drug('Genericona Exceção', [
      marca({ nome: 'Outra Ref®', concentracoes: ['5 mg'] }),
      marca({ nome: 'Outra Generica', laboratorio: 'EMS', concentracoes: ['5 mg'] }),
    ]);
    const achados = checkConcentrationOverlap([d], [excecao]);
    expect(achados).toHaveLength(1);
    expect(achados[0].classification).toBe('REVIEW_REQUIRED');
  });
});

describe('RM-62 — dado suspeito (padrão que exige revisão, mas não é confirmado automaticamente como erro)', () => {
  it('3 laboratórios diferentes compartilhando a mesma concentração → um único achado REVIEW_REQUIRED agregando todos', () => {
    const d = drug('Trilabs', [
      marca({ nome: 'A', laboratorio: 'LabA', concentracoes: ['5 mg'] }),
      marca({ nome: 'B', laboratorio: 'LabB', concentracoes: ['5 mg'] }),
      marca({ nome: 'C', laboratorio: 'LabC', concentracoes: ['5 mg'] }),
    ]);
    const achados = checkConcentrationOverlap([d], []);
    expect(achados).toHaveLength(1);
    expect(achados[0].marcas).toHaveLength(3);
    expect(achados[0].classification).toBe('REVIEW_REQUIRED');
  });
});

describe('RM-62 — erro bloqueante (marca duplicada em laboratórios incompatíveis)', () => {
  it('mesmo nome comercial atribuído a 2 laboratórios CANÔNICOS diferentes → BLOCKING_ERROR', () => {
    const d = drug('Moleculaw', [
      marca({ nome: 'NomeColidido®', laboratorio: 'LabA', lab_id: 'laba', concentracoes: ['10 mg'] }),
      marca({ nome: 'NomeColidido®', laboratorio: 'LabB', lab_id: 'labb', concentracoes: ['20 mg'] }),
    ]);
    const achados = checkDuplicateBrandAcrossLabs([d]);
    expect(achados).toHaveLength(1);
    expect(achados[0].classification).toBe('BLOCKING_ERROR');
    expect(achados[0].regra).toBe('MARCA_DUPLICADA_LABS_INCOMPATIVEIS');
  });

  it('mesmo nome comercial, mesmo laboratório (grafia diferente do MESMO lab) → NÃO é BLOCKING_ERROR', () => {
    const d = drug('Moleculav', [
      marca({ nome: 'NomeRepetido', laboratorio: 'EMS', lab_id: 'ems', concentracoes: ['10 mg'] }),
      marca({ nome: 'NomeRepetido', laboratorio: 'EMS S/A', lab_id: 'ems', concentracoes: ['10 mg'] }),
    ]);
    expect(checkDuplicateBrandAcrossLabs([d])).toEqual([]);
  });

  it('runBrandConcentrationAudit() com um BLOCKING_ERROR real → buildOk é false', () => {
    const d = drug('Moleculaw', [
      marca({ nome: 'NomeColidido®', laboratorio: 'LabA', lab_id: 'laba' }),
      marca({ nome: 'NomeColidido®', laboratorio: 'LabB', lab_id: 'labb' }),
    ]);
    const report = runBrandConcentrationAudit({ drugs: [d], catalogProducts: [], excecoes: [] });
    expect(report.buildOk).toBe(false);
    expect(report.bySeverity.BLOCKING_ERROR).toBe(1);
  });

  it('runBrandConcentrationAudit() só com REVIEW_REQUIRED (sem BLOCKING) → buildOk continua true', () => {
    const d = drug('Genericona', [
      marca({ nome: 'Referência®', concentracoes: ['10 mg'] }),
      marca({ nome: 'Genericona EMS', laboratorio: 'EMS', concentracoes: ['10 mg'] }),
    ]);
    const report = runBrandConcentrationAudit({ drugs: [d], catalogProducts: [], excecoes: [] });
    expect(report.buildOk).toBe(true);
    expect(report.bySeverity.BLOCKING_ERROR).toBe(0);
    expect(report.bySeverity.REVIEW_REQUIRED).toBeGreaterThan(0);
  });
});

describe('RM-62 — saída determinística', () => {
  it('rodar o mesmo conjunto de drugs 2x produz EXATAMENTE a mesma lista de achados, na mesma ordem', () => {
    const drugs: QuickDrug[] = [
      drug('Z-molecula', [
        marca({ nome: 'Zeta', laboratorio: 'LabZ', concentracoes: ['1 mg'] }),
        marca({ nome: 'Zeta Generico', laboratorio: 'LabY', concentracoes: ['1 mg'] }),
      ]),
      drug('A-molecula', [
        marca({ nome: 'Alfa', laboratorio: 'LabA', concentracoes: ['2 mg'] }),
        marca({ nome: 'Alfa Generico', laboratorio: 'LabB', concentracoes: ['2 mg'] }),
      ]),
    ];
    const r1 = runBrandConcentrationAudit({ drugs, catalogProducts: [], excecoes: [] });
    const r2 = runBrandConcentrationAudit({ drugs, catalogProducts: [], excecoes: [] });
    // timestamp varia (Date.now) — comparar tudo, exceto isso.
    expect(r1.findings).toEqual(r2.findings);
    expect(r1.bySeverity).toEqual(r2.bySeverity);
    expect(r1.buildOk).toBe(r2.buildOk);
  });

  it('a ordem dos achados não depende da ordem de entrada dos drugs (ordenação explícita por regra/molécula/marca)', () => {
    const a = drug('A-molecula', [
      marca({ nome: 'Alfa', concentracoes: ['2 mg'] }),
      marca({ nome: 'Alfa Generico', laboratorio: 'EMS', concentracoes: ['2 mg'] }),
    ]);
    const z = drug('Z-molecula', [
      marca({ nome: 'Zeta', concentracoes: ['1 mg'] }),
      marca({ nome: 'Zeta Generico', laboratorio: 'EMS', concentracoes: ['1 mg'] }),
    ]);
    const r1 = runBrandConcentrationAudit({ drugs: [a, z], catalogProducts: [], excecoes: [] });
    const r2 = runBrandConcentrationAudit({ drugs: [z, a], catalogProducts: [], excecoes: [] });
    expect(r1.findings.map((f) => f.molecula)).toEqual(r2.findings.map((f) => f.molecula));
    expect(r1.findings.map((f) => f.molecula)).toEqual(['A-molecula', 'Z-molecula']);
  });
});

describe('RM-62 — a base real do sistema não tem nenhum BLOCKING_ERROR', () => {
  it('runBrandConcentrationAudit() sem overrides (dados reais) tem buildOk true', () => {
    const report = runBrandConcentrationAudit();
    expect(report.bySeverity.BLOCKING_ERROR).toBe(0);
    expect(report.buildOk).toBe(true);
  });
});
