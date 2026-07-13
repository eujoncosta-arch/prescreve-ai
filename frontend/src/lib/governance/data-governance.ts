// ============================================================
// PRESCREVE-AI — RM-00: CLINICAL DATA GOVERNANCE
// ------------------------------------------------------------
// Camada de GOVERNANÇA DE DADOS FARMACOLÓGICOS.
//
// Objetivo: fornecer identificadores canônicos, separação clara
// de campos (princípio ativo / marca / laboratório / apresentação
// / população-alvo) e um ENVELOPE DE PROVENIÊNCIA auditável para
// TODA a base — SEM migrar ou alterar as fontes existentes.
//
// Esta camada é ADITIVA e READ-ONLY sobre os dados atuais:
// projeta `ProdutoComercial` e `QuickDrug` no modelo governado,
// sem mutá-los. As migrações reais (RM-01/RM-06) construirão
// sobre esta fundação.
//
// Documentação: /docs/data-governance.md
// ============================================================

import type { ProdutoComercial } from '../types';
import type { QuickDrug, QuickBrand } from '../pharma-database';

// ══════════════════════════════════════════════════════════════
// 1. IDENTIFICADORES CANÔNICOS
// ══════════════════════════════════════════════════════════════

/** Prefixos dos identificadores canônicos (namespacing por tipo). */
export const ID_PREFIX = {
  laboratory: 'lab',
  molecule: 'mol',
  brand: 'brand',
  drug: 'drug',
} as const;

/** Normaliza um texto para slug estável: minúsculo, sem acento, sem símbolos. */
export function toSlug(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacríticos
    .replace(/[®™]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Qualificadores de sal removidos para obter a Denominação Comum (DCB) canônica. */
const SALT_QUALIFIERS = [
  'besilato', 'maleato', 'cloridrato', 'dicloridrato', 'bromidrato', 'hemifumarato',
  'fumarato', 'bissulfato', 'sulfato', 'sodica', 'sodico', 'potassica', 'potassico',
  'calcica', 'calcico', 'tri-hidratada', 'trihidratada', 'di-hidratada', 'dihidratada',
  'di-hidratado', 'dihidratado', 'diidratado', 'diidratada',
  'di-hidrato', 'dihidrato', 'monoidratado', 'monoidratada', 'mononitrato', 'dinitrato',
  'acetato', 'succinato', 'tartarato', 'hemitartarato', 'valerato', 'dipropionato',
  'fosfato', 'mesilato', 'estolato', 'trometamol', 'medoxomila',
];

/**
 * Deriva o `molecule_id` canônico e SALT-AGNÓSTICO a partir do nome da molécula.
 * Ex.: "Besilato de Anlodipino" e "Anlodipino" → ambos "mol:anlodipino".
 * Resolve as 27 duplicatas de sal detectadas na ETAPA 1.
 */
export function toMoleculeId(molecula: string): string {
  let s = ' ' + toSlug(molecula).replace(/-/g, ' ') + ' ';
  for (const q of SALT_QUALIFIERS) {
    // Normaliza o qualificador do mesmo modo que a string (hífen → espaço),
    // para casar formas compostas como "di-hidratado" → "di hidratado".
    const qn = toSlug(q).replace(/-/g, ' ');
    s = s.replace(new RegExp(`(^| )${qn}( |$)`, 'g'), ' ');
  }
  s = s.replace(/(^| )de( |$)/g, ' ').replace(/\s+/g, ' ').trim();
  return `${ID_PREFIX.molecule}:${toSlug(s) || toSlug(molecula)}`;
}

/** `laboratory_id` canônico (reaproveita a taxonomia `lab_id` existente). */
export function toLaboratoryId(labId: string): string {
  return `${ID_PREFIX.laboratory}:${toSlug(labId)}`;
}

/** `brand_id` canônico: marca comercial qualificada pelo laboratório. */
export function toBrandId(nomeComercial: string, labId: string): string {
  return `${ID_PREFIX.brand}:${toSlug(labId)}:${toSlug(nomeComercial)}`;
}

/** `drug_id` canônico: produto (marca) de um laboratório. Estável e determinístico. */
export function toDrugId(nomeComercial: string, labId: string): string {
  return `${ID_PREFIX.drug}:${toSlug(labId)}:${toSlug(nomeComercial)}`;
}

/** Decompõe um `drug_id` de volta em suas partes. */
export function parseDrugId(drugId: string): { laboratory: string; brand: string } | null {
  const m = drugId.match(/^drug:([a-z0-9-]+):([a-z0-9-]+)$/);
  return m ? { laboratory: m[1], brand: m[2] } : null;
}

// ══════════════════════════════════════════════════════════════
// 2. ENVELOPE DE PROVENIÊNCIA (controle de origem, data, responsável, confiança)
// ══════════════════════════════════════════════════════════════

/** Taxonomia da ORIGEM do dado (fonte da verdade). */
export type DataOrigin =
  | 'BULA_FABRICANTE'       // bula oficial do fabricante
  | 'BULA_PROFISSIONAL'     // bula para profissional de saúde
  | 'BULA_PACIENTE'         // bula para o paciente
  | 'ANVISA'                // registro/consulta ANVISA
  | 'DIRETRIZ_OFICIAL'      // sociedade médica (SBC, ADA, ESC...)
  | 'DERIVADO'              // derivado/inferido de outra fonte governada
  | 'LEGADO'                // dado herdado das bases originais, sem verificação
  | 'NAO_VERIFICADO';       // sem fonte confirmada

/** Nível de confiança no dado. */
export type ConfidenceLevel = 'ALTA' | 'MEDIA' | 'BAIXA' | 'NAO_VERIFICADO';

/**
 * Envelope de proveniência anexado a todo registro governado.
 * Preparado para auditoria futura (RM-00 → auditabilidade).
 */
export interface DataProvenance {
  /** De onde veio o dado. */
  origem: DataOrigin;
  /** URL/DOI/nº da bula ou fonte primária, quando houver. */
  fonte_url?: string;
  /** Data ISO da última atualização/validação do dado. */
  data_atualizacao: string;
  /** Quem validou o dado (pessoa, equipe ou processo automatizado). */
  responsavel: string;
  /** Confiança no dado. */
  nivel_confianca: ConfidenceLevel;
  /** Observação livre (ex.: "registro ANVISA não confirmado"). */
  observacao?: string;
  /** Hash de integridade do registro (preenchido por RM futura de auditoria). */
  hash_integridade?: string;
}

/** Provência-padrão para dados legados ainda não auditados. */
export function provenanceLegado(observacao?: string): DataProvenance {
  return {
    origem: 'LEGADO',
    data_atualizacao: '1970-01-01T00:00:00.000Z',
    responsavel: 'sistema:legado',
    nivel_confianca: 'NAO_VERIFICADO',
    observacao,
  };
}

// ══════════════════════════════════════════════════════════════
// 3. SEPARAÇÃO DE CAMPOS (modelo governado)
// ══════════════════════════════════════════════════════════════

/** Laboratório canônico. */
export interface GovernedLaboratory {
  laboratory_id: string;
  slug: string;              // lab_id original (ex.: 'eurofarma')
  nome: string;
  cnpj?: string;
  ativo: boolean;
}

/** Princípio ativo (molécula) canônico, salt-agnóstico. */
export interface GovernedMolecule {
  molecule_id: string;
  dcb: string;               // Denominação Comum (nome exibível)
  sal_original?: string;     // forma de sal como consta na fonte (ex.: "Besilato de Anlodipino")
  sinonimos: string[];
  atc?: string;
  classe_terapeutica?: string;
}

/** Marca comercial canônica. */
export interface GovernedBrand {
  brand_id: string;
  nome_comercial: string;
  laboratory_id: string;
  molecule_id: string;
}

/** Apresentação canônica (uma linha = uma SKU). */
export interface GovernedPresentation {
  concentracao: string;
  forma_farmaceutica: string;
  via?: string;
  embalagem: string;
  registro_anvisa?: string;
}

/** População-alvo com posologia por subgrupo. */
export interface GovernedTargetPopulation {
  adulto?: string;
  pediatrico?: string;
  neonatal?: string;
  geriatrico?: string;
  gestante?: string;
  lactante?: string;
  renal?: string;
  hepatico?: string;
}

/**
 * REGISTRO DE MEDICAMENTO GOVERNADO — o agregado canônico.
 * Um produto comercial específico, com IDs canônicos, campos separados
 * e envelope de proveniência auditável.
 */
export interface GovernedDrugRecord {
  drug_id: string;
  molecule_id: string;
  brand_id: string;
  laboratory_id: string;

  molecula: GovernedMolecule;
  marca: GovernedBrand;
  apresentacoes: GovernedPresentation[];
  populacao_alvo?: GovernedTargetPopulation;
  classe_terapeutica?: string;
  cids_aprovados?: string[];

  /** Envelope de governança/proveniência (obrigatório). */
  _governanca: DataProvenance;
}

// ══════════════════════════════════════════════════════════════
// 4. REGISTRO CANÔNICO DE LABORATÓRIOS
// ══════════════════════════════════════════════════════════════

/** Nomes oficiais dos laboratórios conhecidos (taxonomia `lab_id`). */
export const LABORATORY_REGISTRY: Record<string, GovernedLaboratory> = Object.fromEntries(
  ([
    ['eurofarma', 'Eurofarma Laboratórios S.A.', '61.190.096/0001-92'],
    ['ems', 'EMS S/A'],
    ['sanofi', 'Sanofi Medley Farmacêutica Ltda.'],
    ['astrazeneca', 'AstraZeneca do Brasil Ltda.'],
    ['bayer', 'Bayer S.A.'],
    ['bms', 'Bristol-Myers Squibb Farmacêutica Ltda.'],
    ['boehringer', 'Boehringer Ingelheim do Brasil'],
    ['novartis', 'Novartis Biociências S.A.'],
    ['msd', 'Merck Sharp & Dohme Farmacêutica Ltda.'],
    ['eli_lilly', 'Eli Lilly do Brasil Ltda.'],
    ['roche', 'Produtos Roche Químicos e Farmacêuticos S.A.'],
    ['novo_nordisk', 'Novo Nordisk Farmacêutica do Brasil Ltda.'],
    ['ache', 'Aché Laboratórios Farmacêuticos S.A.'],
  ] as [string, string, string?][]).map(([slug, nome, cnpj]) => [
    slug,
    { laboratory_id: toLaboratoryId(slug), slug, nome, cnpj, ativo: true } as GovernedLaboratory,
  ]),
);

/**
 * RM-06: aliases de slugs que representam o MESMO laboratório real escrito de
 * formas diferentes nas fontes legadas (co-marketing, transição de titularidade,
 * grafia composta). Unifica ao slug canônico para eliminar conflitos marca↔lab.
 */
const LAB_ALIASES: Record<string, string> = {
  'boehringer-lilly': 'boehringer',
  'boehringer_lilly': 'boehringer',
  'gsk-novartis': 'novartis',
  'gsk_novartis': 'novartis',
  'cristalia-hipolabor': 'cristalia',
  'cristalia_hipolabor': 'cristalia',
};

/** Resolve o laboratório canônico a partir de um `lab_id` ou nome livre. */
export function resolveLaboratory(labIdOrName: string): GovernedLaboratory {
  const raw = toSlug(labIdOrName);
  const slug = LAB_ALIASES[raw] ?? LAB_ALIASES[raw.replace(/-/g, '_')] ?? raw;
  // RM-01 (MED-04): as chaves do registro usam '_' (novo_nordisk, eli_lilly),
  // mas toSlug normaliza para '-'. Tenta ambas as formas antes do fallback.
  const alt = slug.replace(/-/g, '_');
  return (
    LABORATORY_REGISTRY[slug] ??
    LABORATORY_REGISTRY[alt] ?? {
      laboratory_id: toLaboratoryId(slug),
      slug,
      nome: labIdOrName,
      ativo: true,
    }
  );
}

// ══════════════════════════════════════════════════════════════
// 5. ADAPTADORES READ-ONLY (projeção das fontes existentes)
//    NÃO mutam as fontes — apenas projetam no modelo governado.
// ══════════════════════════════════════════════════════════════

/** Deriva o nível de confiança a partir de sinais da fonte. */
function inferConfianca(opts: { fonteRegulatoria?: boolean; verificado?: boolean; temRegistro?: boolean }): ConfidenceLevel {
  if (opts.fonteRegulatoria && opts.temRegistro) return 'ALTA';
  if (opts.fonteRegulatoria || opts.verificado) return 'MEDIA';
  if (opts.verificado === false) return 'BAIXA';
  return 'NAO_VERIFICADO';
}

/** Projeta um `ProdutoComercial` (Eurofarma/lab-catalog) em `GovernedDrugRecord`. */
export function fromProdutoComercial(p: ProdutoComercial): GovernedDrugRecord {
  const lab = resolveLaboratory(p.lab_id);
  const molecule_id = toMoleculeId(p.molecula);
  const brand_id = toBrandId(p.nome_comercial, p.lab_id);
  const drug_id = toDrugId(p.nome_comercial, p.lab_id);

  const provenance: DataProvenance = {
    origem: p.fonte_regulatoria === 'ANVISA' ? 'ANVISA' : 'LEGADO',
    fonte_url: p.link_bula_profissional ?? p.link_bula_paciente,
    data_atualizacao: p.data_ultima_atualizacao || p.data_registro || '1970-01-01T00:00:00.000Z',
    responsavel: 'auditoria:eurofarma-23.1',
    nivel_confianca: inferConfianca({
      fonteRegulatoria: p.fonte_regulatoria === 'ANVISA',
      temRegistro: !!p.registro_anvisa || p.apresentacoes.some(a => !!a.registro_anvisa),
    }),
    observacao: p.registro_anvisa ? undefined : 'registro ANVISA de nível produto ausente',
  };

  return {
    drug_id, molecule_id, brand_id,
    laboratory_id: lab.laboratory_id,
    molecula: {
      molecule_id,
      dcb: p.molecula,
      sal_original: p.molecula,
      sinonimos: [],
      classe_terapeutica: p.classe_terapeutica,
    },
    marca: { brand_id, nome_comercial: p.nome_comercial, laboratory_id: lab.laboratory_id, molecule_id },
    apresentacoes: p.apresentacoes.map(a => ({
      concentracao: a.concentracao,
      forma_farmaceutica: a.forma_farmaceutica,
      embalagem: a.embalagem,
      registro_anvisa: a.registro_anvisa,
    })),
    populacao_alvo: {
      adulto: p.posologia_aprovada,
      renal: p.uso_populacoes_especiais?.renal,
      hepatico: p.uso_populacoes_especiais?.hepatico,
      pediatrico: p.uso_populacoes_especiais?.pediatrico,
      geriatrico: p.uso_populacoes_especiais?.idoso,
      gestante: p.uso_populacoes_especiais?.gestante,
      lactante: p.uso_populacoes_especiais?.lactante,
    },
    classe_terapeutica: p.classe_terapeutica,
    cids_aprovados: p.cids_aprovados,
    _governanca: provenance,
  };
}

/**
 * Projeta um `QuickDrug` (PHARMA_DB) em N `GovernedDrugRecord` — um por marca.
 * Genéricos/sem marca geram um registro `*-generico`.
 */
export function fromQuickDrug(d: QuickDrug): GovernedDrugRecord[] {
  const molecule_id = toMoleculeId(d.molecula || d.nome_generico);
  const molecula: GovernedMolecule = {
    molecule_id,
    dcb: d.molecula,
    sal_original: d.nome_generico,
    sinonimos: d.sinonimos ?? [],
    classe_terapeutica: d.classe,
  };
  const popAlvo: GovernedTargetPopulation = {
    adulto: `${d.dose_adulto?.habitual ?? ''} (${d.dose_adulto?.via ?? ''})`.trim(),
    gestante: d.uso_gestante,
    lactante: d.uso_lactante,
  };

  const marcas: QuickBrand[] = d.marcas?.length ? d.marcas : [];
  const records = marcas.map((b): GovernedDrugRecord => {
    const labSlug = toSlug(b.lab_id || b.laboratorio || 'generico');
    const lab = resolveLaboratory(labSlug);
    const brand_id = toBrandId(b.nome, labSlug);
    return {
      drug_id: toDrugId(b.nome, labSlug),
      molecule_id, brand_id, laboratory_id: lab.laboratory_id,
      molecula,
      marca: { brand_id, nome_comercial: b.nome, laboratory_id: lab.laboratory_id, molecule_id },
      apresentacoes: (b.concentracoes ?? []).map(c => ({
        concentracao: c,
        forma_farmaceutica: (b.formas ?? [])[0] ?? 'comprimido',
        embalagem: '(não especificada)',
      })),
      populacao_alvo: popAlvo,
      classe_terapeutica: d.classe,
      cids_aprovados: [],
      _governanca: {
        origem: b.verificado ? 'BULA_FABRICANTE' : 'LEGADO',
        fonte_url: b.bula_profissional ?? b.bula_paciente,
        data_atualizacao: '1970-01-01T00:00:00.000Z',
        responsavel: 'sistema:pharma-db',
        nivel_confianca: inferConfianca({ verificado: b.verificado }),
      },
    };
  });

  // Sem marcas → registro genérico
  if (records.length === 0) {
    const labSlug = 'generico';
    const brand_id = toBrandId(`${d.molecula}-generico`, labSlug);
    records.push({
      drug_id: toDrugId(`${d.molecula}-generico`, labSlug),
      molecule_id, brand_id, laboratory_id: toLaboratoryId(labSlug),
      molecula,
      marca: { brand_id, nome_comercial: `${d.molecula} (genérico)`, laboratory_id: toLaboratoryId(labSlug), molecule_id },
      apresentacoes: [],
      populacao_alvo: popAlvo,
      classe_terapeutica: d.classe,
      cids_aprovados: [],
      _governanca: provenanceLegado('molécula sem marca associada'),
    });
  }
  return records;
}

// ══════════════════════════════════════════════════════════════
// 6. VALIDAÇÃO / AUDITABILIDADE DA CAMADA
// ══════════════════════════════════════════════════════════════

export interface GovernanceCheck {
  drug_id: string;
  ok: boolean;
  problemas: string[];
}

/** Valida a integridade estrutural de um registro governado. */
export function validarRegistro(r: GovernedDrugRecord): GovernanceCheck {
  const problemas: string[] = [];
  if (!/^drug:/.test(r.drug_id)) problemas.push('drug_id fora do padrão');
  if (!/^mol:/.test(r.molecule_id)) problemas.push('molecule_id fora do padrão');
  if (!/^brand:/.test(r.brand_id)) problemas.push('brand_id fora do padrão');
  if (!/^lab:/.test(r.laboratory_id)) problemas.push('laboratory_id fora do padrão');
  if (r.marca.molecule_id !== r.molecule_id) problemas.push('marca.molecule_id divergente');
  if (!r._governanca?.origem) problemas.push('proveniência ausente');
  if (r.apresentacoes.length === 0) problemas.push('sem apresentações');
  return { drug_id: r.drug_id, ok: problemas.length === 0, problemas };
}

/** Relatório agregado de conformidade de governança sobre uma lista de registros. */
export function auditarGovernanca(registros: GovernedDrugRecord[]): {
  total: number; conformes: number; nao_conformes: number;
  por_confianca: Record<ConfidenceLevel, number>;
  por_origem: Record<string, number>;
  falhas: GovernanceCheck[];
} {
  const por_confianca = { ALTA: 0, MEDIA: 0, BAIXA: 0, NAO_VERIFICADO: 0 } as Record<ConfidenceLevel, number>;
  const por_origem: Record<string, number> = {};
  const falhas: GovernanceCheck[] = [];
  let conformes = 0;
  for (const r of registros) {
    por_confianca[r._governanca.nivel_confianca]++;
    por_origem[r._governanca.origem] = (por_origem[r._governanca.origem] ?? 0) + 1;
    const chk = validarRegistro(r);
    if (chk.ok) conformes++; else falhas.push(chk);
  }
  return {
    total: registros.length,
    conformes,
    nao_conformes: registros.length - conformes,
    por_confianca, por_origem,
    falhas: falhas.slice(0, 100),
  };
}

/** Versão da camada de governança. */
export const RM00_VERSION = '1.0.0';
