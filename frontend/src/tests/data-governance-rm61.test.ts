// RM-61 — Governança de dados farmacológicos: proveniência obrigatória.
//
// Consolida a verificação num único envelope já existente (`DataProvenance`,
// RM-00) em vez de criar um segundo sistema de metadados: adiciona
// `verificationStatus` (ciclo de vida: draft/review/verified/deprecated) e
// `sourceVersion` (versão/data do documento-fonte) ao envelope, mais a
// função `deriveVerificationStatus()` que deriva um valor coerente a partir
// dos sinais que já existiam (origem, nivel_confianca, data_atualizacao).
import { describe, it, expect } from 'vitest';
import {
  deriveVerificationStatus,
  provenanceLegado,
  fromProdutoComercial,
  fromQuickDrug,
  type DataProvenance,
} from '@/lib/governance/data-governance';
import type { ProdutoComercial } from '@/lib/types';
import type { QuickDrug } from '@/lib/pharma-database';
import { buildCanonicalDatabase } from '@/lib/pharma-core/migrate';

describe('RM-61 — deriveVerificationStatus()', () => {
  it("retorna 'verified' quando origem é fonte formal + confiança ALTA + data real (não epoch)", () => {
    const status = deriveVerificationStatus({
      origem: 'ANVISA',
      nivel_confianca: 'ALTA',
      data_atualizacao: '2024-03-01T00:00:00.000Z',
    });
    expect(status).toBe('verified');
  });

  it("retorna 'draft' quando origem, confiança e data são todos 'não verificado'/placeholder", () => {
    const status = deriveVerificationStatus({
      origem: 'NAO_VERIFICADO',
      nivel_confianca: 'NAO_VERIFICADO',
      data_atualizacao: '1970-01-01T00:00:00.000Z',
    });
    expect(status).toBe('draft');
  });

  it("retorna 'review' para dado LEGADO com confiança MEDIA (nem totalmente cru, nem verificado)", () => {
    const status = deriveVerificationStatus({
      origem: 'LEGADO',
      nivel_confianca: 'MEDIA',
      data_atualizacao: '1970-01-01T00:00:00.000Z',
    });
    expect(status).toBe('review');
  });

  it("NUNCA retorna 'deprecated' — não é um status inferível a partir de sinais estruturais", () => {
    const combinacoes: Array<Parameters<typeof deriveVerificationStatus>[0]> = [
      { origem: 'ANVISA', nivel_confianca: 'ALTA', data_atualizacao: '2024-01-01T00:00:00.000Z' },
      { origem: 'NAO_VERIFICADO', nivel_confianca: 'NAO_VERIFICADO', data_atualizacao: '1970-01-01T00:00:00.000Z' },
      { origem: 'LEGADO', nivel_confianca: 'BAIXA', data_atualizacao: '1970-01-01T00:00:00.000Z' },
      { origem: 'DERIVADO', nivel_confianca: 'MEDIA', data_atualizacao: '2020-01-01T00:00:00.000Z' },
    ];
    for (const c of combinacoes) {
      expect(deriveVerificationStatus(c)).not.toBe('deprecated');
    }
  });

  it("fonte formal com confiança ALTA mas data ainda em epoch NÃO é 'verified' (proveniência incompleta)", () => {
    const status = deriveVerificationStatus({
      origem: 'BULA_FABRICANTE',
      nivel_confianca: 'ALTA',
      data_atualizacao: '1970-01-01T00:00:00.000Z',
    });
    expect(status).not.toBe('verified');
  });
});

describe('RM-61 — provenanceLegado() preenche verificationStatus', () => {
  it("marca dado legado explicitamente como 'draft', nunca como 'verified' por omissão", () => {
    const p: DataProvenance = provenanceLegado('teste');
    expect(p.verificationStatus).toBe('draft');
  });
});

describe('RM-61 — fromProdutoComercial() preenche sourceVersion e verificationStatus', () => {
  const base: ProdutoComercial = {
    id: 'euro-teste-1',
    lab_id: 'eurofarma',
    molecula: 'Teste Molécula',
    nome_comercial: 'Testel',
    classe_terapeutica: 'Classe Teste',
    cids_aprovados: ['I10'],
    apresentacoes: [{ concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: 'Cartela', registro_anvisa: '1.0000.0000' }],
    posologia_aprovada: '10 mg 1x/dia',
    contraindicacoes_bula: [],
    advertencias_principais: [],
    interacoes_principais: [],
    uso_populacoes_especiais: {},
    data_registro: '2020-01-01',
    data_ultima_atualizacao: '2024-05-01T00:00:00.000Z',
    versao_bula: 'rev. 03/2024',
    fonte_regulatoria: 'ANVISA',
    registro_anvisa: '1.0000.0000',
  };

  it('propaga versao_bula do produto para provenance.sourceVersion', () => {
    const r = fromProdutoComercial(base);
    expect(r._governanca.sourceVersion).toBe('rev. 03/2024');
  });

  it("produto ANVISA com registro + confiança ALTA + data real recebe verificationStatus 'verified'", () => {
    const r = fromProdutoComercial(base);
    expect(r._governanca.nivel_confianca).toBe('ALTA');
    expect(r._governanca.verificationStatus).toBe('verified');
  });

  it("produto SEM registro_anvisa nunca alcança verificationStatus 'verified'", () => {
    const semRegistro: ProdutoComercial = { ...base, registro_anvisa: undefined, apresentacoes: [{ ...base.apresentacoes[0], registro_anvisa: undefined }] };
    const r = fromProdutoComercial(semRegistro);
    expect(r._governanca.verificationStatus).not.toBe('verified');
  });
});

describe('RM-61 — fromQuickDrug() reflete o campo `verificado` de cada marca em verificationStatus', () => {
  const drugVerificado: QuickDrug = {
    id: 'test-1', molecula: 'Testolol', nome_generico: 'testolol', categoria: 'teste',
    classe: 'Classe Teste', indicacoes_principais: [], contraindicacoes_rapidas: [],
    marcas: [{ nome: 'Testomax', lab_id: 'eurofarma', verificado: true }],
  } as unknown as QuickDrug;

  const drugNaoVerificado: QuickDrug = {
    id: 'test-2', molecula: 'Testolol', nome_generico: 'testolol', categoria: 'teste',
    classe: 'Classe Teste', indicacoes_principais: [], contraindicacoes_rapidas: [],
    marcas: [{ nome: 'GenéricoX', lab_id: 'generico' }],
  } as unknown as QuickDrug;

  it('marca com verificado:true nunca fica em draft (recebe ao menos review)', () => {
    const [r] = fromQuickDrug(drugVerificado);
    expect(r._governanca.verificationStatus).not.toBe('draft');
  });

  it('marca sem `verificado` (undefined) é tratada como LEGADO — nunca "verified" por omissão', () => {
    const [r] = fromQuickDrug(drugNaoVerificado);
    expect(r._governanca.verificationStatus).not.toBe('verified');
  });
});

describe('RM-61 — a base canônica inteira (buildCanonicalDatabase) tem verificationStatus em toda entidade', () => {
  it('nenhuma DrugEntity real do sistema tem provenance.verificationStatus ausente', () => {
    const entities = buildCanonicalDatabase();
    expect(entities.length).toBeGreaterThan(0);
    const semStatus = entities.filter(e => !e.provenance?.verificationStatus);
    expect(semStatus.map(e => e.id)).toEqual([]);
  });

  it('nenhuma DrugEntity real tem verificationStatus "verified" com nivel_confianca diferente de ALTA (RM-61 gate de consistência)', () => {
    const entities = buildCanonicalDatabase();
    const inconsistentes = entities.filter(
      e => e.provenance?.verificationStatus === 'verified' && e.provenance?.nivel_confianca !== 'ALTA',
    );
    expect(inconsistentes.map(e => e.id)).toEqual([]);
  });
});
