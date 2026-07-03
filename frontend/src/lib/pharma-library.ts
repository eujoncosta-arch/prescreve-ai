// ============================================================
// PRESCREVE-AI — Enterprise Pharmacology Library
// Hierarquia: Lab → Marca → Molécula → Classe → Diretriz
//             → Indicação → Posologia → Ajustes → Forma
//             → Apresentação → Bula Paciente → Bula Profissional
//
// Regra inviolável: Diretriz → Classe → Molécula → Marca
// A marca NUNCA altera a evidência clínica.
// ============================================================

import { EUROFARMA_CATALOG } from './eurofarma-sync';
import type { ProdutoComercial } from './types';

// ─── Lab IDs ─────────────────────────────────────────────────────────────────

export type LaboratorioId =
  | 'eurofarma'
  | 'ems'
  | 'ache'
  | 'libbs'
  | 'biolab'
  | 'bayer'
  | 'pfizer'
  | 'astrazeneca'
  | 'novartis'
  | 'sanofi'
  | 'roche'
  | 'gsk';

export type StatusLab = 'ativo' | 'em_breve' | 'parceiro';
export type SegmentoLab = 'nacional' | 'multinacional';
export type CategoriaRegulatoriaAnvisa = 'etico' | 'similar' | 'generico' | 'biologico' | 'fitoterapico' | 'otc';
export type StatusProduto = 'ativo' | 'descontinuado' | 'suspenso' | 'em_registro';
export type ClasseControle = 'livre' | 'C1' | 'B1' | 'B2' | 'A2' | 'A3';
export type CategoriaRiscoGestacional = 'A' | 'B' | 'C' | 'D' | 'X';

// ─── Laboratorio ─────────────────────────────────────────────────────────────

export interface Laboratorio {
  id: LaboratorioId;
  nome: string;
  nome_abreviado: string;
  pais_sede: string;
  segmento: SegmentoLab;
  status: StatusLab;
  descricao: string;
  cor_primaria: string;        // hex ou tailwind
  cor_badge: string;           // classes tailwind para badge
  website?: string;
  total_produtos_sistema: number;
}

export const LABORATORIOS: Laboratorio[] = [
  {
    id: 'eurofarma',
    nome: 'Eurofarma Laboratórios S.A.',
    nome_abreviado: 'Eurofarma',
    pais_sede: 'Brasil',
    segmento: 'nacional',
    status: 'ativo',
    descricao: 'Maior laboratório farmacêutico nacional, com presença em 20 países e portfólio de mais de 400 produtos. Sede em São Paulo-SP. Fundada em 1991.',
    cor_primaria: '#0066B2',
    cor_badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    website: 'https://eurofarma.com.br',
    total_produtos_sistema: 52,
  },
  {
    id: 'ems',
    nome: 'EMS S/A',
    nome_abreviado: 'EMS',
    pais_sede: 'Brasil',
    segmento: 'nacional',
    status: 'em_breve',
    descricao: 'Maior empresa farmacêutica do Brasil em faturamento. Portfólio de mais de 500 itens incluindo genéricos, similares e éticos. Sede em Hortolândia-SP.',
    cor_primaria: '#E30613',
    cor_badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    website: 'https://ems.com.br',
    total_produtos_sistema: 0,
  },
  {
    id: 'ache',
    nome: 'Aché Laboratórios Farmacêuticos',
    nome_abreviado: 'Aché',
    pais_sede: 'Brasil',
    segmento: 'nacional',
    status: 'em_breve',
    descricao: 'Laboratório nacional fundado em 1966. Foco em dermatologia, MSD e produtos OTC. Sede em Guarulhos-SP.',
    cor_primaria: '#00843D',
    cor_badge: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    total_produtos_sistema: 0,
  },
  {
    id: 'libbs',
    nome: 'Libbs Farmacêutica',
    nome_abreviado: 'Libbs',
    pais_sede: 'Brasil',
    segmento: 'nacional',
    status: 'em_breve',
    descricao: 'Laboratório nacional fundado em 1958. Especialidades: oncologia, cardiologia, reumatologia. Sede em São Paulo-SP.',
    cor_primaria: '#005B99',
    cor_badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
    total_produtos_sistema: 0,
  },
  {
    id: 'biolab',
    nome: 'Biolab Sanus Farmacêutica',
    nome_abreviado: 'Biolab',
    pais_sede: 'Brasil',
    segmento: 'nacional',
    status: 'em_breve',
    descricao: 'Farmacêutica nacional focada em ginecologia, obstetrícia e saúde da mulher. Sede em São Paulo-SP.',
    cor_primaria: '#8B0069',
    cor_badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    total_produtos_sistema: 0,
  },
  {
    id: 'bayer',
    nome: 'Bayer S.A.',
    nome_abreviado: 'Bayer',
    pais_sede: 'Alemanha',
    segmento: 'multinacional',
    status: 'em_breve',
    descricao: 'Multinacional alemã com portfólio em saúde do consumidor, farmacêutica e ciências agrícolas. Brands: Aspirin, Xarelto, Mirena.',
    cor_primaria: '#10384F',
    cor_badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    total_produtos_sistema: 0,
  },
  {
    id: 'pfizer',
    nome: 'Pfizer Brasil',
    nome_abreviado: 'Pfizer',
    pais_sede: 'EUA',
    segmento: 'multinacional',
    status: 'em_breve',
    descricao: 'Maior empresa farmacêutica do mundo. Brands: Norvasc, Lipitor, Lyrica, Eliquis, Prevnar.',
    cor_primaria: '#00549E',
    cor_badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
    total_produtos_sistema: 0,
  },
  {
    id: 'astrazeneca',
    nome: 'AstraZeneca do Brasil',
    nome_abreviado: 'AstraZeneca',
    pais_sede: 'Reino Unido / Suécia',
    segmento: 'multinacional',
    status: 'em_breve',
    descricao: 'Liderança em oncologia, cardiovascular e respiratório. Brands: Symbicort, Brilinta, Farxiga, Nexium, Crestor.',
    cor_primaria: '#003865',
    cor_badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    total_produtos_sistema: 0,
  },
  {
    id: 'novartis',
    nome: 'Novartis Biociências S.A.',
    nome_abreviado: 'Novartis',
    pais_sede: 'Suíça',
    segmento: 'multinacional',
    status: 'em_breve',
    descricao: 'Liderança em medicamentos inovadores. Brands: Entresto, Cosentyx, Leqvio, Kymriah. Generics via Sandoz.',
    cor_primaria: '#EC0000',
    cor_badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
    total_produtos_sistema: 0,
  },
  {
    id: 'sanofi',
    nome: 'Sanofi-Aventis Farmacêutica',
    nome_abreviado: 'Sanofi',
    pais_sede: 'França',
    segmento: 'multinacional',
    status: 'em_breve',
    descricao: 'Liderança em diabetes, cardiovascular e imunologia. Brands: Lantus, Toujeo, Plavix, Dupixent, Allegra.',
    cor_primaria: '#3D3482',
    cor_badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
    total_produtos_sistema: 0,
  },
  {
    id: 'roche',
    nome: 'Roche Produtos Químicos e Farmacêuticos',
    nome_abreviado: 'Roche',
    pais_sede: 'Suíça',
    segmento: 'multinacional',
    status: 'em_breve',
    descricao: 'Liderança em oncologia e diagnósticos. Brands: Herceptin, Avastin, Tamiflu, MabThera, Xolair.',
    cor_primaria: '#0066CC',
    cor_badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    total_produtos_sistema: 0,
  },
  {
    id: 'gsk',
    nome: 'GlaxoSmithKline Brasil',
    nome_abreviado: 'GSK',
    pais_sede: 'Reino Unido',
    segmento: 'multinacional',
    status: 'em_breve',
    descricao: 'Liderança em vacinas, HIV (ViiV Healthcare) e respiratório. Brands: Trelegy, Advair, Shingrix, Benlysta.',
    cor_primaria: '#F36F21',
    cor_badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    total_produtos_sistema: 0,
  },
];

export function getLab(id: LaboratorioId): Laboratorio | undefined {
  return LABORATORIOS.find(l => l.id === id);
}

// ─── Enterprise types ─────────────────────────────────────────────────────────

export interface AjustePopulacaoEspecial {
  renal?: string;
  hepatico?: string;
  gestante?: string;
  lactante?: string;
  idoso?: string;
  pediatrico?: string;
  neonato?: string;
}

export interface ReacaoAdversa {
  descricao: string;
  frequencia: 'muito_comum' | 'comum' | 'incomum' | 'raro' | 'muito_raro' | 'desconhecida';
  categoria?: string;
}

export interface ApresentacaoEnterprise {
  concentracao: string;
  forma_farmaceutica: string;
  embalagem: string;
  registro_anvisa?: string;
  codigo_ean?: string;
  status: StatusProduto;
}

export interface BulaPacienteEmpresa {
  para_que_serve: string[];
  quando_nao_usar: string[];
  como_usar: string;
  posologia_simplificada: string;
  efeitos_adversos_principais: string[];
  o_que_fazer_se_esquecer: string;
  superdosagem_resumo?: string;
  conservacao: string;
  validade_apos_abertura?: string;
}

export interface BulaProfissionalEmpresa {
  indicacoes: string[];
  mecanismo_acao: string;
  posologia_adulto?: string;
  posologia_pediatrica?: string;
  posologia_geriatrica?: string;
  ajuste_renal?: string;
  ajuste_hepatico?: string;
  contraindicacoes: string[];
  advertencias: string[];
  interacoes: string[];
  reacoes_adversas: ReacaoAdversa[];
  farmacocinetica?: string;
  superdosagem?: string;
  gravidez_categoria: CategoriaRiscoGestacional | 'Não estabelecida';
  lactacao: string;
  conservacao: string;
  forma_farmaceutica_descricao?: string;
}

export interface DiretrizAssociada {
  nome: string;
  sociedade: string;
  ano: number;
  classe_recomendacao: 'I' | 'IIa' | 'IIb' | 'III';
  nivel_evidencia: 'A' | 'B' | 'C';
}

export interface MarcaFarmaceuticaEnterprise {
  // Identidade
  id: string;
  laboratorio_id: LaboratorioId;
  nome_comercial: string;
  categoria_anvisa: CategoriaRegulatoriaAnvisa;
  status: StatusProduto;
  classe_controle: ClasseControle;
  uso_hospitalar: boolean;
  disponivel_sus: boolean;

  // Farmacologia (hierarquia clínica)
  molecula: string;              // principio ativo
  sinonimos_molecula?: string[]; // nomes alternativos aceitos
  classe_terapeutica: string;    // ex: BRA | Estatina | SGLT2
  subclasse?: string;            // ex: Diidropiridínico (dentro de BCC)
  cids_aprovados: string[];
  indicacoes_resumo: string[];

  // Evidência → Diretriz → Classe → Molécula → Marca
  diretrizes_associadas: DiretrizAssociada[];
  nivel_evidencia_geral: 'A' | 'B' | 'C';
  observacao_evidencia?: string;

  // Posologia estruturada
  posologia_adulto?: string;
  posologia_pediatrica?: string;
  posologia_geriatrica?: string;
  ajustes: AjustePopulacaoEspecial;

  // Apresentações ANVISA
  apresentacoes: ApresentacaoEnterprise[];

  // Bulas completas
  bula_paciente: BulaPacienteEmpresa;
  bula_profissional: BulaProfissionalEmpresa;

  // Links regulatórios
  link_bula_paciente?: string;
  link_bula_profissional?: string;
  registro_data?: string;
  versao_bula?: string;

  // Alertas especiais
  alertas_especiais?: string[];
  black_box_warning?: string;

  // Metadados
  tags: string[];
  area_terapeutica: string[];
}

// ─── Adapter: ProdutoComercial → MarcaFarmaceuticaEnterprise ──────────────────

function adaptarProduto(p: ProdutoComercial): MarcaFarmaceuticaEnterprise {
  return {
    id: p.id,
    laboratorio_id: (p.lab_id as LaboratorioId) ?? 'eurofarma',
    nome_comercial: p.nome_comercial,
    categoria_anvisa: 'etico',
    status: 'ativo',
    classe_controle: 'livre',
    uso_hospitalar: false,
    disponivel_sus: false,

    molecula: p.molecula,
    classe_terapeutica: p.classe_terapeutica,
    cids_aprovados: p.cids_aprovados ?? [],
    indicacoes_resumo: [p.posologia_aprovada.split('.')[0]],

    diretrizes_associadas: [],
    nivel_evidencia_geral: 'B',

    posologia_adulto: p.posologia_aprovada,
    ajustes: p.uso_populacoes_especiais ? {
      renal: p.uso_populacoes_especiais.renal,
      hepatico: p.uso_populacoes_especiais.hepatico,
      gestante: p.uso_populacoes_especiais.gestante,
      idoso: p.uso_populacoes_especiais.idoso,
      pediatrico: p.uso_populacoes_especiais.pediatrico,
    } : {},

    apresentacoes: p.apresentacoes.map(a => ({
      concentracao: a.concentracao,
      forma_farmaceutica: a.forma_farmaceutica,
      embalagem: a.embalagem,
      registro_anvisa: a.registro_anvisa,
      status: 'ativo',
    })),

    bula_paciente: {
      para_que_serve: p.cids_aprovados ?? [],
      quando_nao_usar: p.contraindicacoes_bula ?? [],
      como_usar: p.posologia_aprovada,
      posologia_simplificada: p.posologia_aprovada,
      efeitos_adversos_principais: p.advertencias_principais ?? [],
      o_que_fazer_se_esquecer: 'Tomar assim que lembrar, salvo se próximo à próxima dose. Nunca dobrar a dose.',
      conservacao: 'Conservar em temperatura ambiente (15–30°C), ao abrigo de luz e umidade.',
    },

    bula_profissional: {
      indicacoes: [p.posologia_aprovada],
      mecanismo_acao: `${p.classe_terapeutica} — ${p.molecula}`,
      posologia_adulto: p.posologia_aprovada,
      posologia_geriatrica: p.uso_populacoes_especiais?.idoso,
      posologia_pediatrica: p.uso_populacoes_especiais?.pediatrico,
      ajuste_renal: p.uso_populacoes_especiais?.renal,
      ajuste_hepatico: p.uso_populacoes_especiais?.hepatico,
      contraindicacoes: p.contraindicacoes_bula ?? [],
      advertencias: p.advertencias_principais ?? [],
      interacoes: p.interacoes_principais ?? [],
      reacoes_adversas: (p.advertencias_principais ?? []).map(a => ({
        descricao: a,
        frequencia: 'incomum' as const,
      })),
      gravidez_categoria: p.uso_populacoes_especiais?.gestante?.includes('CONTRAINDICADO') ? 'D'
        : p.uso_populacoes_especiais?.gestante?.includes('Categoria B') ? 'B'
        : p.uso_populacoes_especiais?.gestante?.includes('Categoria C') ? 'C'
        : 'Não estabelecida',
      lactacao: 'Consultar médico antes de usar durante a amamentação.',
      conservacao: 'Conservar em temperatura ambiente (15–30°C), protegido da luz e umidade.',
    },

    link_bula_paciente: p.link_bula_paciente,
    link_bula_profissional: p.link_bula_profissional,
    versao_bula: p.versao_bula,
    registro_data: p.data_registro,

    alertas_especiais: p.advertencias_principais?.filter(a =>
      a.startsWith('⚠') || a.toUpperCase().includes('CONTRAINDICADO') || a.toUpperCase().includes('BLACK BOX')
    ),

    tags: [
      p.molecula.toLowerCase().split(' ')[0],
      p.classe_terapeutica.toLowerCase().split(' ')[0],
      ...p.cids_aprovados ?? [],
    ],
    area_terapeutica: inferirArea(p.classe_terapeutica),
  };
}

function inferirArea(classe: string): string[] {
  const c = classe.toLowerCase();
  if (c.includes('bra') || c.includes('angiotensina') || c.includes('beta') || c.includes('diurético') || c.includes('bcc') || c.includes('cálcio') || c.includes('estatina') || c.includes('hmg')) return ['Cardiovascular', 'Cardiologia'];
  if (c.includes('diabetes') || c.includes('biguanida') || c.includes('sulfonilureia') || c.includes('sglt') || c.includes('glp') || c.includes('insulina') || c.includes('antidiabético')) return ['Endocrinologia', 'Diabetes'];
  if (c.includes('antidepressivo') || c.includes('isrs') || c.includes('irsn') || c.includes('antipsic') || c.includes('estabilizador') || c.includes('bupropiona') || c.includes('tricíclico') || c.includes('imao') || c.includes('ndri')) return ['Psiquiatria', 'Saúde Mental'];
  if (c.includes('antibió') || c.includes('penicilina') || c.includes('macrolídeo') || c.includes('fluoroquinolona') || c.includes('cefalosporina') || c.includes('antifúngico')) return ['Infectologia', 'Antibióticos'];
  if (c.includes('antiepilépt') || c.includes('anticonvuls') || c.includes('antidemencial') || c.includes('colinesterase') || c.includes('nmda') || c.includes('parkins') || c.includes('dopaminérg')) return ['Neurologia'];
  if (c.includes('corticosteroide') || c.includes('aine') || c.includes('analgésico') || c.includes('antitérmico') || c.includes('opioide')) return ['Analgesia', 'Reumatologia'];
  if (c.includes('respirató') || c.includes('inalat') || c.includes('laba') || c.includes('ics') || c.includes('leucotrien') || c.includes('broncodilatad')) return ['Pneumologia', 'Respiratório'];
  if (c.includes('bomba de prótons') || c.includes('ibp') || c.includes('gastro') || c.includes('antiulceroso')) return ['Gastroenterologia'];
  if (c.includes('estimulante') || c.includes('tdah') || c.includes('dopamina/norad')) return ['Psiquiatria', 'TDAH'];
  if (c.includes('anti-histam') || c.includes('rinite') || c.includes('alergia')) return ['Alergologia', 'ORL'];
  if (c.includes('progestagênio') || c.includes('ginecolog') || c.includes('endometriose')) return ['Ginecologia'];
  return ['Medicina Geral'];
}

// ─── Enriched Eurofarma entries (branded products with full data) ──────────────

const EUROFARMA_ENRICHED: Partial<MarcaFarmaceuticaEnterprise>[] = [
  {
    id: 'euro-piemonte-10',
    nome_comercial: 'PIEMONTE®',
    molecula: 'Montelucaste Sódico',
    classe_terapeutica: 'Antagonista de Receptores de Leucotrienos (ARLT)',
    cids_aprovados: ['J45', 'J30', 'J30.1'],
    indicacoes_resumo: [
      'Profilaxia e tratamento da asma crônica em adultos e adolescentes ≥ 15 anos',
      'Rinite alérgica sazonal e perene ≥ 15 anos',
      'Asma induzida por exercício em adultos e adolescentes',
    ],
    diretrizes_associadas: [
      { nome: 'GINA 2023 Global Strategy for Asthma Management', sociedade: 'GINA', ano: 2023, classe_recomendacao: 'IIa', nivel_evidencia: 'B' },
      { nome: 'ARIA 2021 — Allergic Rhinitis and its Impact on Asthma', sociedade: 'ARIA', ano: 2021, classe_recomendacao: 'IIa', nivel_evidencia: 'B' },
      { nome: 'Diretrizes Brasileiras de Asma 2023', sociedade: 'SBPT', ano: 2023, classe_recomendacao: 'IIa', nivel_evidencia: 'B' },
    ],
    nivel_evidencia_geral: 'B',
    observacao_evidencia: 'Adjuvante ao ICS — não substitui corticosteroide inalatório como monoterapia em asma moderada-grave. Primeira linha em AERD (sensibilidade a AINEs/Aspirina).',
    posologia_adulto: '1 comprimido de 10 mg à noite (sempre no mesmo horário). Administração independente das refeições.',
    posologia_pediatrica: '6–14 anos: comprimido mastigável 5 mg 1x/dia. 6 meses–5 anos: granulado/sachê 4 mg 1x/dia (PIEMONTE® Sachê).',
    posologia_geriatrica: 'Mesma dose do adulto. Não requer ajuste.',
    ajustes: {
      renal: 'Não requer ajuste em qualquer grau de insuficiência renal.',
      hepatico: 'Cautela em hepatopatia grave (Child C). Metabolismo hepático (CYP3A4/2C8).',
      gestante: 'Categoria B. Dados de segurança disponíveis. Usar se benefício superar risco.',
      idoso: 'Mesma dose sem ajuste. Monitorar alterações neuropsiquiátricas.',
    },
    apresentacoes: [
      { concentracao: '10 mg', forma_farmaceutica: 'Comprimido revestido', embalagem: 'Caixa com 30 comprimidos', registro_anvisa: '1.0043.1320.001-2', status: 'ativo' },
    ],
    bula_paciente: {
      para_que_serve: [
        'Prevenção e tratamento da asma crônica (inclusive noturna e induzida por exercício)',
        'Rinite alérgica sazonal e ao longo do ano',
        'Asma por sensibilidade à Aspirina/AINEs',
      ],
      quando_nao_usar: [
        'Hipersensibilidade ao montelucaste ou a qualquer componente',
        'Crise aguda de asma (não é broncodilatador de resgate)',
      ],
      como_usar: 'Tome 1 comprimido de 10 mg à noite. Pode ser tomado com ou sem alimentos. Engula inteiro com água.',
      posologia_simplificada: '1 comprimido de 10 mg uma vez ao dia, preferencialmente à noite.',
      efeitos_adversos_principais: [
        'Cefaleia (mais comum)',
        'Distúrbios gastrointestinais (dor abdominal, diarreia, náusea)',
        'Alterações de humor, sonhos vívidos, insônia — relatar ao médico imediatamente',
        'Rinite, faringite, infecção respiratória superior',
      ],
      o_que_fazer_se_esquecer: 'Tome assim que lembrar. Se estiver próximo à hora da próxima dose, pule a dose esquecida. Nunca tome dose dupla.',
      conservacao: 'Conservar em temperatura ambiente (15–30°C), protegido da luz e umidade. Manter fora do alcance de crianças.',
    },
    bula_profissional: {
      indicacoes: [
        'Profilaxia e tratamento crônico da asma em adultos e adolescentes ≥ 15 anos',
        'Rinite alérgica sazonal e perene em adultos e adolescentes ≥ 15 anos',
        'Prevenção de broncoespasmo induzido por exercício em pacientes ≥ 15 anos',
      ],
      mecanismo_acao: 'Bloqueio seletivo e reversível do receptor CysLT1 de leucotrienos cisteínicos (LTC4, LTD4, LTE4). Esses leucotrienos são liberados por mastócitos e eosinófilos e causam broncoconstrição, hipersecreção mucosa, aumento de permeabilidade vascular e recrutamento de eosinófilos. O montelucaste impede a ligação dos leucotrienos ao seu receptor pulmonar, reduzindo inflamação e broncoconstrição mediadas por leucotrienos.',
      posologia_adulto: '10 mg 1x/dia à noite. Uso contínuo independente do controle dos sintomas.',
      posologia_pediatrica: '6–14 anos: comprimido mastigável 5 mg 1x/dia. 6 meses–5 anos: sachê 4 mg 1x/dia.',
      posologia_geriatrica: 'Sem ajuste necessário. Mesma dose do adulto.',
      ajuste_renal: 'Sem necessidade de ajuste em qualquer grau de IR (excreção mínima renal).',
      ajuste_hepatico: 'Cautela em hepatopatia grave (Child C). Metabolismo hepático extenso via CYP3A4 e CYP2C8. Sem dados robustos em hepatopatia grave.',
      contraindicacoes: [
        'Hipersensibilidade ao montelucaste sódico ou a qualquer excipiente da formulação',
        'Não usar como broncodilatador de resgate em episódio agudo de asma',
      ],
      advertencias: [
        '⚠ FDA Black Box Warning (2020): risco de alterações neuropsiquiátricas graves — agitação, agressividade, ansiedade, depressão, desorientação, distúrbios do sono, ideação e comportamento suicida. Avaliar o balanço benefício-risco. Instruir paciente e familiares a relatar qualquer alteração de comportamento.',
        'Síndrome de Churg-Strauss: rara vasculite sistêmica relatada em pacientes com asma grave durante redução de corticosteroide oral com montelucaste. Monitorar eosinofilia sistêmica.',
        'Não deve substituir ICS na asma. Não usar como monoterapia na asma moderada-grave.',
        'Ineficaz para tratamento de episódio agudo de asma (não é broncodilatador).',
      ],
      interacoes: [
        'Fenobarbital e rifampicina: indutores de CYP3A4 podem reduzir os níveis plasmáticos do montelucaste em 40%.',
        'Genfibrozila: inibidor de CYP2C8 pode aumentar a exposição ao montelucaste (monitorar).',
        'Sem interações clinicamente relevantes com teofilina, digoxina, anticoncepcional oral, terfenadina ou varfarina.',
      ],
      reacoes_adversas: [
        { descricao: 'Cefaleia', frequencia: 'muito_comum' },
        { descricao: 'Dor abdominal', frequencia: 'comum' },
        { descricao: 'Rinite', frequencia: 'comum' },
        { descricao: 'Infecção respiratória superior', frequencia: 'comum' },
        { descricao: 'Alterações neuropsiquiátricas (sonhos vívidos, insônia, irritabilidade)', frequencia: 'incomum' },
        { descricao: 'Síndrome de Churg-Strauss', frequencia: 'raro' },
        { descricao: 'Ideação suicida', frequencia: 'muito_raro' },
        { descricao: 'Angioedema', frequencia: 'raro' },
      ],
      farmacocinetica: 'Absorção oral rápida (Tmax 3–4h). Biodisponibilidade ~64–73%. Ligação proteica > 99%. Metabolismo hepático extenso (CYP3A4/2C8). Excreção biliar. Meia-vida 2,7–5,5h.',
      superdosagem: 'Não há antídoto específico. Tratamento sintomático e suporte. Em crianças, doses de até 1000 mg foram reportadas sem toxicidade grave.',
      gravidez_categoria: 'B',
      lactacao: 'Desconhece-se se é excretado no leite humano. Usar com cautela. Benefício potencial deve superar o risco ao lactente.',
      conservacao: 'Conservar em temperatura ambiente (15–30°C), protegido da luz e umidade. Prazo de validade: 24 meses.',
    },
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-piemonte.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-piemonte.pdf',
    black_box_warning: 'FDA 2020: Risco de alterações neuropsiquiátricas graves incluindo ideação/comportamento suicida. Avaliar balanço benefício-risco individualmente.',
    alertas_especiais: [
      '⚠ FDA Black Box Warning 2020 — Alterações neuropsiquiátricas',
      'Não substitui ICS na asma persistente',
    ],
    tags: ['montelucaste', 'antileucotrieno', 'asma', 'rinite', 'J45', 'J30', 'aerd'],
    area_terapeutica: ['Pneumologia', 'Respiratório', 'Alergologia'],
    classe_controle: 'livre',
    uso_hospitalar: false,
    disponivel_sus: false,
  },
  {
    id: 'euro-piemonte-sache',
    nome_comercial: 'PIEMONTE® SACHÊ',
    molecula: 'Montelucaste Sódico',
    classe_terapeutica: 'Antagonista de Receptores de Leucotrienos (ARLT)',
    cids_aprovados: ['J45', 'J30'],
    indicacoes_resumo: [
      'Profilaxia e tratamento da asma em crianças de 6 meses a 5 anos',
      'Rinite alérgica perene em crianças de 6 meses a 2 anos',
    ],
    diretrizes_associadas: [
      { nome: 'GINA 2023 — Tratamento Pediátrico', sociedade: 'GINA', ano: 2023, classe_recomendacao: 'IIa', nivel_evidencia: 'B' },
      { nome: 'SBP Guia de Asma Pediátrica 2023', sociedade: 'SBP', ano: 2023, classe_recomendacao: 'IIa', nivel_evidencia: 'B' },
    ],
    nivel_evidencia_geral: 'B',
    posologia_adulto: undefined,
    posologia_pediatrica: '6 meses–5 anos: 1 sachê de 4 mg uma vez ao dia. Dissolver em leite materno, fórmula ou outro líquido frio. Administrar imediatamente após abertura.',
    ajustes: {
      renal: 'Não requer ajuste renal.',
      hepatico: 'Cautela em hepatopatia grave.',
      gestante: 'Não se aplica — faixa pediátrica.',
    },
    apresentacoes: [
      { concentracao: '4 mg', forma_farmaceutica: 'Granulado em sachê', embalagem: 'Caixa com 30 sachês', registro_anvisa: '1.0043.1320.002-0', status: 'ativo' },
    ],
    bula_paciente: {
      para_que_serve: [
        'Prevenção e tratamento da asma crônica em crianças pequenas',
        'Rinite alérgica perene em crianças a partir de 6 meses',
      ],
      quando_nao_usar: [
        'Hipersensibilidade ao montelucaste',
        'Episódio agudo de asma (não é broncodilatador)',
      ],
      como_usar: 'Abrir o sachê e dissolver o granulado diretamente na boca ou em 1 colher de chá de leite, fórmula ou suco de maçã. Administrar imediatamente após dissolver. Não misturar com outros líquidos.',
      posologia_simplificada: '1 sachê de 4 mg uma vez ao dia.',
      efeitos_adversos_principais: [
        'Sede e irritabilidade',
        'Alterações de comportamento e sono — relatar ao médico',
        'Infecção do trato respiratório superior',
        'Febre, gastroenterite',
      ],
      o_que_fazer_se_esquecer: 'Tomar assim que lembrar. Não dobrar a dose.',
      conservacao: 'Conservar em temperatura ambiente, protegido da umidade. Não abrir o sachê até a hora de usar.',
    },
    bula_profissional: {
      indicacoes: ['Asma crônica pediátrica (6 meses–5 anos)', 'Rinite alérgica perene pediátrica (6 meses–2 anos)'],
      mecanismo_acao: 'Bloqueio seletivo do receptor CysLT1 de leucotrienos cisteínicos. Vide PIEMONTE® 10mg para mecanismo detalhado.',
      posologia_pediatrica: '4 mg (1 sachê) 1x/dia à noite. Dissolver em leite, fórmula ou suco de maçã e administrar imediatamente.',
      contraindicacoes: ['Hipersensibilidade ao montelucaste'],
      advertencias: [
        '⚠ FDA Black Box Warning 2020: alterações neuropsiquiátricas em todas as faixas etárias, incluindo pediátrica.',
        'Avaliar alterações de comportamento, sono e humor a cada consulta.',
        'Não usar como broncodilatador de resgate.',
      ],
      interacoes: ['Indutores de CYP3A4/2C8 (fenobarbital, rifampicina) podem reduzir níveis.'],
      reacoes_adversas: [
        { descricao: 'Alterações de comportamento e personalidade', frequencia: 'incomum' },
        { descricao: 'Sede', frequencia: 'comum' },
        { descricao: 'Infecção respiratória superior', frequencia: 'comum' },
      ],
      gravidez_categoria: 'Não estabelecida',
      lactacao: 'Não aplicável — uso pediátrico.',
      conservacao: 'Temperatura ambiente (15–30°C). Proteger da umidade.',
    },
    black_box_warning: 'FDA 2020: Risco de alterações neuropsiquiátricas em todas as idades.',
    alertas_especiais: ['⚠ FDA Black Box Warning 2020', 'Sachê: administrar imediatamente após abertura'],
    tags: ['montelucaste', 'antileucotrieno', 'pediatria', 'asma', 'sache'],
    area_terapeutica: ['Pneumologia', 'Pediatria'],
    classe_controle: 'livre',
    uso_hospitalar: false,
    disponivel_sus: false,
  },
  {
    id: 'euro-pisa',
    nome_comercial: 'PISA® LP',
    molecula: 'Dicloridrato de Pramipexol',
    classe_terapeutica: 'Antiparkinsoniano — Agonista Dopaminérgico D2/D3 — Liberação Prolongada',
    cids_aprovados: ['G20', 'G25.81'],
    indicacoes_resumo: [
      'Doença de Parkinson — monoterapia na fase inicial ou em combinação com levodopa',
      'Síndrome das Pernas Inquietas (SPI) idiopática moderada a grave',
    ],
    diretrizes_associadas: [
      { nome: 'MDS Evidence-Based Medicine Review — PD Treatment 2023', sociedade: 'MDS', ano: 2023, classe_recomendacao: 'IIa', nivel_evidencia: 'B' },
      { nome: 'NICE NG71 — Parkinson\'s disease in adults', sociedade: 'NICE', ano: 2017, classe_recomendacao: 'I', nivel_evidencia: 'A' },
      { nome: 'Consenso Brasileiro de Doença de Parkinson 2022', sociedade: 'ABN', ano: 2022, classe_recomendacao: 'IIa', nivel_evidencia: 'B' },
    ],
    nivel_evidencia_geral: 'B',
    observacao_evidencia: 'Evidência para redução de discinesias em longo prazo comparado à levodopa (CALM-PD). Preferido em pacientes jovens (< 65 anos) para preservar "reserva de levodopa".',
    posologia_adulto: 'Parkinson (LP): iniciar 0,375 mg 1x/dia; aumentar 0,375 mg a cada 5–7 dias. Dose eficaz: 1,5–4,5 mg/dia. Máximo: 4,5 mg/dia. SPI: 0,125–0,5 mg 2–3h antes de dormir.',
    posologia_geriatrica: 'Titular mais lentamente. Iniciar com 0,375 mg/dia e aumentar a cada 7–14 dias. Máximo 2,25 mg/dia em > 75 anos.',
    ajustes: {
      renal: 'Ajuste obrigatório: TFGe 30–50: máx 2,25 mg/dia. TFGe 15–29: máx 1,5 mg/dia. Contraindicado em TFGe < 15.',
      hepatico: 'Sem ajuste necessário (pramipexol não é metabolizado no fígado).',
      idoso: 'Maior risco de alucinações, hipotensão ortostática e sonolência. Titular mais lentamente.',
      gestante: 'CONTRAINDICADO — dados insuficientes. Riscos reprodutivos desconhecidos.',
    },
    apresentacoes: [
      { concentracao: '0,375 mg', forma_farmaceutica: 'Comprimido de liberação prolongada (LP)', embalagem: 'Caixa com 30 comprimidos', registro_anvisa: '1.0043.1501.001-3', status: 'ativo' },
      { concentracao: '0,75 mg', forma_farmaceutica: 'Comprimido de liberação prolongada (LP)', embalagem: 'Caixa com 30 comprimidos', registro_anvisa: '1.0043.1501.002-1', status: 'ativo' },
      { concentracao: '1,125 mg', forma_farmaceutica: 'Comprimido de liberação prolongada (LP)', embalagem: 'Caixa com 30 comprimidos', registro_anvisa: '1.0043.1501.003-9', status: 'ativo' },
      { concentracao: '1,5 mg', forma_farmaceutica: 'Comprimido de liberação prolongada (LP)', embalagem: 'Caixa com 30 comprimidos', registro_anvisa: '1.0043.1501.004-7', status: 'ativo' },
      { concentracao: '2,25 mg', forma_farmaceutica: 'Comprimido de liberação prolongada (LP)', embalagem: 'Caixa com 30 comprimidos', registro_anvisa: '1.0043.1501.005-5', status: 'ativo' },
      { concentracao: '3,0 mg', forma_farmaceutica: 'Comprimido de liberação prolongada (LP)', embalagem: 'Caixa com 30 comprimidos', registro_anvisa: '1.0043.1501.006-3', status: 'ativo' },
      { concentracao: '4,5 mg', forma_farmaceutica: 'Comprimido de liberação prolongada (LP)', embalagem: 'Caixa com 30 comprimidos', registro_anvisa: '1.0043.1501.007-1', status: 'ativo' },
    ],
    bula_paciente: {
      para_que_serve: [
        'Doença de Parkinson: controle de tremores, rigidez e lentidão de movimentos',
        'Síndrome das Pernas Inquietas: alívio da sensação incômoda nas pernas ao deitar',
      ],
      quando_nao_usar: [
        'Hipersensibilidade ao pramipexol',
        'Insuficiência renal grave (TFGe < 15 mL/min)',
      ],
      como_usar: 'Tome o comprimido inteiro (não parta, não mastigue) com ou sem alimentos, uma vez ao dia, sempre no mesmo horário. Engolir com água.',
      posologia_simplificada: '1 comprimido ao dia (dose conforme titulação médica). Não interromper sem orientação médica.',
      efeitos_adversos_principais: [
        'Sonolência excessiva — EVITAR DIRIGIR',
        'Tontura e hipotensão ao levantar',
        'Náuseas (especialmente no início)',
        'Comportamentos compulsivos: jogo, compras, alimentação, hipersexualidade — relatar ao médico',
        'Alucinações (principalmente em idosos)',
      ],
      o_que_fazer_se_esquecer: 'Tome assim que lembrar no mesmo dia. Se já for o dia seguinte, pule a dose. Nunca tome dose dupla.',
      conservacao: 'Temperatura ambiente (15–30°C), protegido da luz e umidade.',
    },
    bula_profissional: {
      indicacoes: [
        'Doença de Parkinson idiopática: monoterapia inicial ou adjuvante à levodopa em estágios avançados',
        'Síndrome das Pernas Inquietas idiopática moderada a grave',
      ],
      mecanismo_acao: 'Agonista seletivo dos receptores dopaminérgicos D2 e D3 (maior afinidade D3). Estimulação direta pós-sináptica no estriado e substância negra pars compacta, independente de neurônios dopaminérgicos remanescentes. Efeitos antioxidantes e antiapoptóticos mediados pelo receptor D3 (neuroproteção em estudos in vitro). A formulação LP mantém concentrações plasmáticas estáveis ao longo de 24h, reduzindo flutuações e permitindo dose única diária.',
      posologia_adulto: 'Parkinson: iniciar 0,375 mg/dia (LP). Aumentar 0,375 mg a cada 5–7 dias conforme tolerância e resposta. Dose terapêutica usual: 1,5–4,5 mg/dia (dose única diária). SPI: 0,125–0,25 mg LP ao deitar; máximo 0,75 mg/dia.',
      posologia_geriatrica: 'Iniciar 0,375 mg/dia. Aumentar a cada 7–14 dias. Máximo 2,25 mg/dia em pacientes > 75 anos ou frágeis. Ajustar pela função renal obrigatoriamente.',
      ajuste_renal: 'TFGe 30–50 mL/min: máx 2,25 mg/dia. TFGe 15–29 mL/min: máx 1,5 mg/dia. TFGe < 15: CONTRAINDICADO.',
      ajuste_hepatico: 'Sem ajuste necessário — pramipexol é excretado predominantemente inalterado pelos rins (90%).',
      contraindicacoes: [
        'Hipersensibilidade ao dicloridrato de pramipexol',
        'Insuficiência renal grave (TFGe < 15 mL/min)',
        'Gravidez e lactação (dados insuficientes)',
      ],
      advertencias: [
        '⚠ Transtornos do controle de impulso: compulsão por jogos, compras, hipersexualidade, alimentação compulsiva. Questionar ativamente a cada consulta. Reduzir dose ou suspender se identificado.',
        'Sonolência diurna excessiva e episódios de sono súbito: instruir o paciente a não dirigir.',
        'Hipotensão ortostática: orientar mudança lenta de posição. Monitorar PA deitado e em pé.',
        'Alucinações e confusão: maior risco em idosos. Reduzir dose ou considerar troca para levodopa.',
        'Síndrome maligna dos neurolépticos: se suspensão abrupta — NUNCA interromper abruptamente.',
        'Augmentação na SPI (piora dos sintomas com uso crônico): avaliar redução de dose ou troca de agente.',
        'Não partir nem mastigar comprimidos LP.',
      ],
      interacoes: [
        'Cimetidina (inibidor de secreção tubular): aumenta AUC do pramipexol em 50%.',
        'Levodopa: efeito aditivo antiparkinsoniano; pode necessitar reduzir dose de levodopa.',
        'Antagonistas dopaminérgicos (haloperidol, metoclopramida): reduzem eficácia do pramipexol.',
        'Álcool: potencializa sedação.',
        'Anti-hipertensivos: potencializa hipotensão ortostática.',
      ],
      reacoes_adversas: [
        { descricao: 'Sonolência diurna excessiva', frequencia: 'muito_comum' },
        { descricao: 'Náuseas', frequencia: 'muito_comum' },
        { descricao: 'Hipotensão ortostática', frequencia: 'comum' },
        { descricao: 'Alucinações (especialmente em idosos)', frequencia: 'comum' },
        { descricao: 'Constipação', frequencia: 'comum' },
        { descricao: 'Transtornos do controle de impulso', frequencia: 'comum' },
        { descricao: 'Episódio de sono súbito (sem sonolência prévia)', frequencia: 'incomum' },
        { descricao: 'Insuficiência cardíaca', frequencia: 'incomum' },
        { descricao: 'Síndrome maligna dos neurolépticos (retirada abrupta)', frequencia: 'raro' },
      ],
      farmacocinetica: 'Absorção oral rápida. Tmax 6h (LP). Biodisponibilidade > 90%. Ligação proteica baixa (< 20%). Metabolismo hepático mínimo. Excreção renal 90% inalterada (secreção tubular ativa). Meia-vida 8–12h. Formulação LP: concentrações estáveis ao longo de 24h.',
      superdosagem: 'Não há antídoto. Tratamento sintomático: lavagem gástrica se recente, carvão ativado, monitorização cardiovascular. Hemodiálise ineficaz (baixa ligação proteica).',
      gravidez_categoria: 'C',
      lactacao: 'Desconhece-se se pramipexol é excretado no leite. Inibição da prolactina pode reduzir a lactação. Não recomendado durante a amamentação.',
      conservacao: 'Conservar abaixo de 30°C. Proteger da luz e umidade.',
    },
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-pisa.pdf',
    alertas_especiais: ['⚠ Transtornos de impulso — questionar a cada consulta', 'Sonolência súbita — proibir condução'],
    tags: ['pramipexol', 'parkinson', 'spi', 'agonista-dopaminergico', 'G20', 'G25.81'],
    area_terapeutica: ['Neurologia'],
    classe_controle: 'livre',
    uso_hospitalar: false,
    disponivel_sus: false,
  },
  {
    id: 'euro-pietra-ed',
    nome_comercial: 'PIETRA ED®',
    molecula: 'Dienogeste',
    classe_terapeutica: 'Progestagênio — 4ª geração — Tratamento da Endometriose',
    cids_aprovados: ['N80', 'N80.0', 'N80.1', 'N80.3'],
    indicacoes_resumo: ['Tratamento da endometriose, incluindo redução da dor pélvica e dos focos endometrióticos'],
    diretrizes_associadas: [
      { nome: 'ESHRE Endometriosis Guideline 2022', sociedade: 'ESHRE', ano: 2022, classe_recomendacao: 'I', nivel_evidencia: 'A' },
      { nome: 'FEBRASGO — Diretriz de Endometriose 2021', sociedade: 'FEBRASGO', ano: 2021, classe_recomendacao: 'I', nivel_evidencia: 'A' },
      { nome: 'ACOG Practice Bulletin 114 — Endometriosis 2023', sociedade: 'ACOG', ano: 2023, classe_recomendacao: 'I', nivel_evidencia: 'A' },
    ],
    nivel_evidencia_geral: 'A',
    observacao_evidencia: 'Equivalente ao Leuprolide (GnRH análogo) em redução de dor (Harada 2009, Fertil Steril), com melhor perfil ósseo e lipídico. NNT 4 para redução de EVA ≥ 2 (Strowitzki 2010).',
    posologia_adulto: '1 comprimido de 2 mg 2x/dia (12/12h), continuamente sem intervalo. Iniciar em qualquer dia do ciclo. Uso contínuo — sem pausa menstrual.',
    ajustes: {
      gestante: 'CONTRAINDICADO — uso durante a gravidez está contraindicado. Realizar teste de gravidez antes de iniciar.',
      hepatico: 'CONTRAINDICADO em hepatopatia grave ativa. Metabolismo hepático.',
      renal: 'Sem ajuste necessário em IR leve-moderada. Dados insuficientes em IR grave.',
      lactante: 'Não usar durante amamentação — serviços hormonais ao lactente.',
    },
    apresentacoes: [
      { concentracao: '2 mg', forma_farmaceutica: 'Comprimido revestido', embalagem: 'Caixa com 28 comprimidos', registro_anvisa: '1.0043.1410.001-8', status: 'ativo' },
      { concentracao: '2 mg', forma_farmaceutica: 'Comprimido revestido', embalagem: 'Caixa com 56 comprimidos', registro_anvisa: '1.0043.1410.002-6', status: 'ativo' },
    ],
    bula_paciente: {
      para_que_serve: ['Tratamento da endometriose: redução da dor pélvica e menstrual causada por focos de endometriose'],
      quando_nao_usar: [
        'Gravidez ou suspeita de gravidez',
        'Trombose venosa ou arterial ativa',
        'Sangramento vaginal de causa não investigada',
        'Câncer de mama ou de órgãos genitais',
        'Hepatopatia grave ativa',
        'Hipersensibilidade ao dienogeste',
      ],
      como_usar: 'Tome 1 comprimido de manhã e 1 comprimido à noite (12/12h), todos os dias sem interrupção. Pode ser tomado com ou sem alimentos.',
      posologia_simplificada: '1 comprimido de 2 mg de manhã e 1 comprimido à noite, todos os dias continuamente.',
      efeitos_adversos_principais: [
        'Sangramento irregular ou gotejamento (spotting) nos primeiros 3 meses — esperado',
        'Dores de cabeça',
        'Alterações de humor, depressão — relatar ao médico',
        'Redução ou ausência de menstruação (amenorreia) com uso prolongado — esperada',
        'Acne',
        'Diminuição da densidade óssea em uso > 24 meses',
      ],
      o_que_fazer_se_esquecer: 'Se lembrar em menos de 12h após o horário habitual: tomar imediatamente. Se > 12h: pular a dose e retomar no horário seguinte. Sangramento de escape pode ocorrer.',
      conservacao: 'Temperatura ambiente (< 25°C). Proteger da umidade.',
    },
    bula_profissional: {
      indicacoes: ['Endometriose: tratamento dos sintomas dolorosos associados, incluindo dismenorreia, dispareunia e dor pélvica crônica'],
      mecanismo_acao: 'Progestagênio sintético derivado da 19-nortestosterona com alta seletividade para receptor de progesterona. Atividade antiandrogênica parcial intrínseca. Mecanismos de ação na endometriose: (1) decidualização e atrofia do endométrio ectópico por agonismo progestogênico; (2) supressão parcial do estradiol circulante (reduz estímulo estrogênico dos focos); (3) inibição da proliferação de células endometrióticas; (4) redução de prostaglandinas e citocinas pró-inflamatórias (IL-1β, TNF-α, IL-6) nos focos; (5) inibição da aromatase local nos focos endometrióticos. Não provoca hipoestrogenismo grave como os análogos GnRH.',
      posologia_adulto: '2 mg (1 comprimido) 2x/dia (manhã e noite, 12/12h), continuamente, sem intervalo entre ciclos. Iniciar em qualquer momento do ciclo (preferir início com menstruação para excluir gravidez).',
      contraindicacoes: [
        'Gravidez ou suspeita de gravidez',
        'Trombose venosa profunda ou embolismo pulmonar ativo ou histórico',
        'Doença cardiovascular arterial ativa (IAM, AVC)',
        'Diabete com complicações vasculares',
        'Hepatopatia grave ativa ou histórico de icterícia colestática recorrente',
        'Tumor hepático (benigno ou maligno)',
        'Sangramento vaginal não diagnosticado',
        'Câncer de mama atual ou suspeito',
        'Câncer de órgãos genitais hormônio-dependente',
        'Hipersensibilidade ao dienogeste ou a qualquer excipiente',
      ],
      advertencias: [
        'Padrão de sangramento irregular: spotting frequente nos primeiros 3–6 meses. Amenorreia no longo prazo (esperada e não prejudicial).',
        'Densidade mineral óssea: monitorar com DXA após 24 meses de uso contínuo. Suplementar cálcio e vitamina D em uso prolongado.',
        'Depressão: rastrear com PHQ-9 a cada consulta. Progestagênios podem piorar depressão preexistente.',
        'Retorno à fertilidade: pode levar 1–3 ciclos após a suspensão.',
        'Não confere proteção contraceptiva confiável — usar método adicional se não desejada gestação.',
        'Tromboembolismo: baixo risco comparado a anticoncepcionais combinados (sem componente estrogênico).',
        'Monitorar PA em uso prolongado.',
      ],
      interacoes: [
        'Indutores de CYP3A4 (rifampicina, fenitoína, carbamazepina, fenobarbital, efavirenz): reduzem níveis do dienogeste. Evitar uso concomitante.',
        'Inibidores potentes de CYP3A4 (cetoconazol, itraconazol, ritonavir): aumentam exposição ao dienogeste.',
        'Não há interação significativa com paracetamol, AINEs ou antibióticos de uso oral.',
      ],
      reacoes_adversas: [
        { descricao: 'Sangramento irregular/spotting', frequencia: 'muito_comum' },
        { descricao: 'Cefaleia', frequencia: 'muito_comum' },
        { descricao: 'Dor mamária', frequencia: 'comum' },
        { descricao: 'Alterações de humor, depressão', frequencia: 'comum' },
        { descricao: 'Acne', frequencia: 'comum' },
        { descricao: 'Náuseas, desconforto GI', frequencia: 'comum' },
        { descricao: 'Diminuição da densidade óssea (uso > 12 meses)', frequencia: 'comum' },
        { descricao: 'Ganho de peso', frequencia: 'comum' },
        { descricao: 'Alopecia', frequencia: 'incomum' },
        { descricao: 'Tromboembolismo venoso', frequencia: 'raro' },
      ],
      farmacocinetica: 'Absorção oral rápida (Tmax 1,5h). Biodisponibilidade 91%. Ligação proteica 90% (albumina). Metabolismo hepático (CYP3A4). Excreção urinária e fecal. Meia-vida de eliminação 9–10h. Regime 2x/dia mantém concentrações estáveis.',
      superdosagem: 'Doses maiores não causaram intoxicação grave em estudos. Tratamento sintomático. Sem antídoto específico.',
      gravidez_categoria: 'X',
      lactacao: 'Não usar durante amamentação — excreção no leite humano desconhecida. Possível efeito sobre o lactente.',
      conservacao: 'Conservar em temperatura < 25°C. Proteger da umidade.',
    },
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-pietra-ed.pdf',
    alertas_especiais: ['CONTRAINDICADO na gravidez', 'Monitorar DMO após 24 meses', 'Rastrear depressão (PHQ-9)'],
    tags: ['dienogeste', 'endometriose', 'progestagênio', 'dor-pelvica', 'N80', 'ginecologia'],
    area_terapeutica: ['Ginecologia'],
    classe_controle: 'livre',
    uso_hospitalar: false,
    disponivel_sus: false,
  },
  {
    id: 'euro-vast',
    diretrizes_associadas: [
      { nome: 'ESC/EAS 2019 Dyslipidaemias Guidelines', sociedade: 'ESC/EAS', ano: 2019, classe_recomendacao: 'I', nivel_evidencia: 'A' },
      { nome: 'AHA/ACC 2019 Guideline on Cholesterol', sociedade: 'AHA/ACC', ano: 2019, classe_recomendacao: 'I', nivel_evidencia: 'A' },
      { nome: 'Diretriz Brasileira de Dislipidemias e Prevenção da Aterosclerose 2023', sociedade: 'SBC', ano: 2023, classe_recomendacao: 'I', nivel_evidencia: 'A' },
    ],
    nivel_evidencia_geral: 'A',
    observacao_evidencia: 'Estatina de alta intensidade. Meta: redução de LDL-c ≥ 50%. Alvo LDL-c < 55 mg/dL em muito alto risco cardiovascular. Evidência de nível I-A em prevenção secundária (ASCOT-LLA, TNT, IDEAL).',
    nivel_evidencia_geral_real: 'A',
  } as any,
  {
    id: 'euro-holmes-20',
    diretrizes_associadas: [
      { nome: 'ESC/ESH 2023 Guidelines for Hypertension', sociedade: 'ESC/ESH', ano: 2023, classe_recomendacao: 'I', nivel_evidencia: 'A' },
      { nome: 'Diretrizes Brasileiras de HAS 2023', sociedade: 'SBC', ano: 2023, classe_recomendacao: 'I', nivel_evidencia: 'A' },
      { nome: 'KDIGO 2024 Clinical Practice Guideline for CKD', sociedade: 'KDIGO', ano: 2024, classe_recomendacao: 'I', nivel_evidencia: 'A' },
    ],
    nivel_evidencia_geral: 'A',
    observacao_evidencia: 'Olmesartana tem o maior potencial anti-hipertensivo entre os BRAs em estudos comparativos. Enteropatia sprue-like: rara, mas relatada. Estudo ROADMAP (nefropatia diabética).',
  } as any,
  {
    id: 'euro-glif',
    diretrizes_associadas: [
      { nome: 'ADA Standards of Care in Diabetes 2024', sociedade: 'ADA', ano: 2024, classe_recomendacao: 'I', nivel_evidencia: 'A' },
      { nome: 'KDIGO 2024 Clinical Practice Guideline for CKD', sociedade: 'KDIGO', ano: 2024, classe_recomendacao: 'I', nivel_evidencia: 'A' },
      { nome: 'ESC 2023 Guidelines on Diabetes and CVD', sociedade: 'ESC', ano: 2023, classe_recomendacao: 'I', nivel_evidencia: 'A' },
      { nome: 'SBD Diretrizes 2023', sociedade: 'SBD', ano: 2023, classe_recomendacao: 'I', nivel_evidencia: 'A' },
    ],
    nivel_evidencia_geral: 'A',
    observacao_evidencia: 'Dapagliflozina: DECLARE-TIMI 58 (2019, NNT 67 para hospitalização IC), DAPA-HF (2019, NNT 21 em IC-FEr), DAPA-CKD (2020, NNT 19 para progressão renal). Indicação para IC-FEr independente de DM2 (DAPA-HF).',
  } as any,
  {
    id: 'euro-lugano',
    diretrizes_associadas: [
      { nome: 'GINA 2023 Global Strategy for Asthma Management — Degraus 3–4', sociedade: 'GINA', ano: 2023, classe_recomendacao: 'I', nivel_evidencia: 'A' },
      { nome: 'Diretrizes Brasileiras de Asma 2023', sociedade: 'SBPT', ano: 2023, classe_recomendacao: 'I', nivel_evidencia: 'A' },
      { nome: 'GOLD 2023 — DPOC', sociedade: 'GOLD', ano: 2023, classe_recomendacao: 'I', nivel_evidencia: 'A' },
    ],
    nivel_evidencia_geral: 'A',
    observacao_evidencia: 'ICS+LABA como terapia de manutenção em asma moderada-grave (Degraus 3–5 GINA). Fluticasona tem maior potência anti-inflamatória que budesonida mg/mg. Formoterol: início rápido (< 3 min), permite uso como resgate em esquema SMART.',
  } as any,
];

// ─── Build the complete enterprise catalog ────────────────────────────────────

// Merge: adapt all from eurofarma-sync, then apply enrichments where available
const enrichmentMap = new Map<string, Partial<MarcaFarmaceuticaEnterprise>>(
  EUROFARMA_ENRICHED.map(e => [e.id!, e])
);

function buildEnterpriseEntry(p: ProdutoComercial): MarcaFarmaceuticaEnterprise {
  const base = adaptarProduto(p);
  const enrichment = enrichmentMap.get(p.id);
  if (!enrichment) return base;
  return {
    ...base,
    ...enrichment,
    ajustes: { ...base.ajustes, ...enrichment.ajustes },
    apresentacoes: enrichment.apresentacoes ?? base.apresentacoes,
    bula_paciente: enrichment.bula_paciente ?? base.bula_paciente,
    bula_profissional: enrichment.bula_profissional ?? base.bula_profissional,
  };
}

export const BIBLIOTECA_FARMACEUTICA: MarcaFarmaceuticaEnterprise[] = [
  ...EUROFARMA_CATALOG.map(buildEnterpriseEntry),
];

// Also add piemonte-sache which is in lab-showcase but not directly in EUROFARMA_CATALOG
// (it's referenced there as its own product in the showcase)
const sachePiemonte = EUROFARMA_ENRICHED.find(e => e.id === 'euro-piemonte-sache');
if (sachePiemonte && sachePiemonte.id && !BIBLIOTECA_FARMACEUTICA.find(p => p.id === sachePiemonte.id)) {
  BIBLIOTECA_FARMACEUTICA.push(sachePiemonte as MarcaFarmaceuticaEnterprise);
}

// ─── Query functions ──────────────────────────────────────────────────────────

export function buscarBiblioteca(query: string): MarcaFarmaceuticaEnterprise[] {
  const q = query.toLowerCase().trim();
  if (!q) return BIBLIOTECA_FARMACEUTICA;
  return BIBLIOTECA_FARMACEUTICA.filter(p =>
    p.nome_comercial.toLowerCase().includes(q) ||
    p.molecula.toLowerCase().includes(q) ||
    p.classe_terapeutica.toLowerCase().includes(q) ||
    p.cids_aprovados.some(c => c.toLowerCase().includes(q)) ||
    p.tags.some(t => t.includes(q)) ||
    p.area_terapeutica.some(a => a.toLowerCase().includes(q))
  );
}

export function filtrarPorLab(lab_id: LaboratorioId): MarcaFarmaceuticaEnterprise[] {
  return BIBLIOTECA_FARMACEUTICA.filter(p => p.laboratorio_id === lab_id);
}

export function filtrarPorArea(area: string): MarcaFarmaceuticaEnterprise[] {
  const a = area.toLowerCase();
  return BIBLIOTECA_FARMACEUTICA.filter(p =>
    p.area_terapeutica.some(x => x.toLowerCase().includes(a))
  );
}

export function getProduto(id: string): MarcaFarmaceuticaEnterprise | undefined {
  return BIBLIOTECA_FARMACEUTICA.find(p => p.id === id);
}

export function getAreasTerapeuticas(): string[] {
  const areas = new Set<string>();
  BIBLIOTECA_FARMACEUTICA.forEach(p => p.area_terapeutica.forEach(a => areas.add(a)));
  return Array.from(areas).sort();
}

export function getClassesTerapeuticas(lab_id?: LaboratorioId): string[] {
  const prods = lab_id ? filtrarPorLab(lab_id) : BIBLIOTECA_FARMACEUTICA;
  const classes = new Set(prods.map(p => p.classe_terapeutica));
  return Array.from(classes).sort();
}

// ─── Frequency labels for reactions ──────────────────────────────────────────

export const FREQ_LABEL: Record<string, string> = {
  muito_comum:  '≥ 1/10',
  comum:        '≥ 1/100, < 1/10',
  incomum:      '≥ 1/1.000, < 1/100',
  raro:         '≥ 1/10.000, < 1/1.000',
  muito_raro:   '< 1/10.000',
  desconhecida: 'Frequência não estabelecida',
};

export const FREQ_COR: Record<string, string> = {
  muito_comum:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  comum:        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  incomum:      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  raro:         'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  muito_raro:   'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
  desconhecida: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

export const GRAVIDEZ_COR: Record<string, string> = {
  A:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  B:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  C:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  D:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  X:  'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  'Não estabelecida': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};
