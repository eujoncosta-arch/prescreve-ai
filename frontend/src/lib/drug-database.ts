// ============================================================
// PRESCREVE-AI — Banco Universal de Moléculas e Marcas
// Hierarquia: Condição → Classe → Molécula → Marca → Laboratório
// ============================================================

import type { MoleculeEntry, PrognosisData } from './types';

export const DRUG_DATABASE: Record<string, MoleculeEntry[]> = {
  // ─── HIPERTENSÃO (I10) ────────────────────────────────────
  'I10': [
    {
      id: 'enalapril',
      molecula: 'Enalapril',
      nome_generico: 'Maleato de Enalapril',
      classe: 'IECA',
      subclasse: 'Inibidor da ECA',
      indicacoes: ['HAS', 'IC-FEr', 'DRC com proteinúria', 'Pós-IAM'],
      apresentacoes_disponiveis: ['5 mg', '10 mg', '20 mg'],
      formas_farmaceuticas: ['Comprimido'],
      marcas: [
        { laboratorio: 'Eurofarma', nome_comercial: 'Renitec', apresentacoes: ['5 mg', '10 mg', '20 mg'] },
        { laboratorio: 'EMS', nome_comercial: 'Enalapril EMS', apresentacoes: ['5 mg', '10 mg', '20 mg'] },
        { laboratorio: 'Aché', nome_comercial: 'Vasopril', apresentacoes: ['5 mg', '10 mg', '20 mg'] },
        { laboratorio: 'Libbs', nome_comercial: 'Enalapril Libbs', apresentacoes: ['5 mg', '10 mg', '20 mg'] },
        { laboratorio: 'Biolab', nome_comercial: 'Enalapril Biolab', apresentacoes: ['5 mg', '10 mg', '20 mg'] },
        { laboratorio: 'Torrent', nome_comercial: 'Enalapril Torrent', apresentacoes: ['5 mg', '10 mg', '20 mg'] },
      ],
    },
    {
      id: 'losartana',
      molecula: 'Losartana',
      nome_generico: 'Losartana Potássica',
      classe: 'BRA',
      subclasse: 'Bloqueador do Receptor de Angiotensina II',
      indicacoes: ['HAS', 'DRC com proteinúria em DM', 'IC-FEr', 'HVE'],
      apresentacoes_disponiveis: ['25 mg', '50 mg', '100 mg'],
      formas_farmaceuticas: ['Comprimido'],
      marcas: [
        { laboratorio: 'Eurofarma', nome_comercial: 'Zart', apresentacoes: ['50 mg', '100 mg'] },
        { laboratorio: 'EMS', nome_comercial: 'Losartana EMS', apresentacoes: ['25 mg', '50 mg', '100 mg'] },
        { laboratorio: 'Aché', nome_comercial: 'Cozaar (MSD)', apresentacoes: ['50 mg', '100 mg'] },
        { laboratorio: 'Libbs', nome_comercial: 'Losartana Libbs', apresentacoes: ['50 mg', '100 mg'] },
        { laboratorio: 'Biolab', nome_comercial: 'Losartana Biolab', apresentacoes: ['50 mg', '100 mg'] },
        { laboratorio: 'Torrent', nome_comercial: 'Losartana Torrent', apresentacoes: ['50 mg', '100 mg'] },
      ],
    },
    {
      id: 'anlodipino',
      molecula: 'Anlodipino',
      nome_generico: 'Besilato de Anlodipino',
      classe: 'BCC',
      subclasse: 'Bloqueador de Canal de Cálcio di-hidropiridínico',
      indicacoes: ['HAS', 'Angina estável', 'Angina vasoespástica'],
      apresentacoes_disponiveis: ['2,5 mg', '5 mg', '10 mg'],
      formas_farmaceuticas: ['Comprimido'],
      marcas: [
        { laboratorio: 'Pfizer', nome_comercial: 'Norvasc', apresentacoes: ['5 mg', '10 mg'] },
        { laboratorio: 'EMS', nome_comercial: 'Anlodipino EMS', apresentacoes: ['5 mg', '10 mg'] },
        { laboratorio: 'Eurofarma', nome_comercial: 'Anlodipino Eurofarma', apresentacoes: ['5 mg', '10 mg'] },
        { laboratorio: 'Libbs', nome_comercial: 'Anlodipino Libbs', apresentacoes: ['5 mg', '10 mg'] },
        { laboratorio: 'Torrent', nome_comercial: 'Anlodipino Torrent', apresentacoes: ['5 mg', '10 mg'] },
      ],
    },
    {
      id: 'hctz',
      molecula: 'Hidroclorotiazida',
      nome_generico: 'Hidroclorotiazida',
      classe: 'Diurético Tiazídico',
      indicacoes: ['HAS (combinação)', 'Edema'],
      apresentacoes_disponiveis: ['12,5 mg', '25 mg', '50 mg'],
      formas_farmaceuticas: ['Comprimido'],
      marcas: [
        { laboratorio: 'EMS', nome_comercial: 'HCTZ EMS', apresentacoes: ['12,5 mg', '25 mg'] },
        { laboratorio: 'Biolab', nome_comercial: 'Hidroclorotiazida Biolab', apresentacoes: ['25 mg'] },
        { laboratorio: 'Torrent', nome_comercial: 'Hidroclorotiazida Torrent', apresentacoes: ['25 mg'] },
        { laboratorio: 'Libbs', nome_comercial: 'Hidroclorotiazida Libbs', apresentacoes: ['25 mg'] },
      ],
    },
  ],

  // ─── DIABETES MELLITUS TIPO 2 (E11) ──────────────────────
  'E11': [
    {
      id: 'metformina',
      molecula: 'Metformina',
      nome_generico: 'Cloridrato de Metformina',
      classe: 'Biguanida',
      indicacoes: ['DM2 (1ª linha)', 'Pré-diabetes com alto risco'],
      apresentacoes_disponiveis: ['500 mg', '850 mg', '1000 mg'],
      formas_farmaceuticas: ['Comprimido', 'Comprimido de liberação prolongada'],
      marcas: [
        { laboratorio: 'EMS', nome_comercial: 'Glifage', apresentacoes: ['500 mg', '850 mg', '1000 mg'] },
        { laboratorio: 'EMS', nome_comercial: 'Glifage XR', apresentacoes: ['500 mg', '750 mg', '1000 mg'] },
        { laboratorio: 'Eurofarma', nome_comercial: 'Metformina Eurofarma', apresentacoes: ['500 mg', '850 mg'] },
        { laboratorio: 'Biolab', nome_comercial: 'Metformina Biolab', apresentacoes: ['500 mg', '850 mg', '1000 mg'] },
        { laboratorio: 'Libbs', nome_comercial: 'Metformina Libbs', apresentacoes: ['850 mg', '1000 mg'] },
      ],
    },
    {
      id: 'empagliflozina',
      molecula: 'Empagliflozina',
      nome_generico: 'Empagliflozina',
      classe: 'Inibidor de SGLT-2',
      indicacoes: ['DM2 (2ª linha ou combinação)', 'DM2 com DCV aterosclerótica', 'DM2 com IC', 'DM2 com DRC'],
      apresentacoes_disponiveis: ['10 mg', '25 mg'],
      formas_farmaceuticas: ['Comprimido'],
      marcas: [
        { laboratorio: 'Bayer', nome_comercial: 'Jardiance', apresentacoes: ['10 mg', '25 mg'] },
        { laboratorio: 'EMS', nome_comercial: 'Empagliflozina EMS', apresentacoes: ['10 mg', '25 mg'] },
        { laboratorio: 'Torrent', nome_comercial: 'Empagliflozina Torrent', apresentacoes: ['10 mg', '25 mg'] },
      ],
    },
    {
      id: 'liraglutida',
      molecula: 'Liraglutida',
      nome_generico: 'Liraglutida',
      classe: 'Agonista de GLP-1',
      indicacoes: ['DM2 com DCV aterosclerótica', 'DM2 com obesidade', 'Redução de peso em DM2'],
      apresentacoes_disponiveis: ['6 mg/mL (1,2 mg/dose)', '6 mg/mL (1,8 mg/dose)'],
      formas_farmaceuticas: ['Solução injetável SC'],
      marcas: [
        { laboratorio: 'Novo Nordisk', nome_comercial: 'Victoza', apresentacoes: ['1,2 mg', '1,8 mg'] },
      ],
    },
    {
      id: 'glibenclamida',
      molecula: 'Glibenclamida',
      nome_generico: 'Glibenclamida',
      classe: 'Sulfonilureia',
      indicacoes: ['DM2 (alternativa quando custo é fator limitante)'],
      apresentacoes_disponiveis: ['5 mg'],
      formas_farmaceuticas: ['Comprimido'],
      marcas: [
        { laboratorio: 'EMS', nome_comercial: 'Glibenclamida EMS', apresentacoes: ['5 mg'] },
        { laboratorio: 'Eurofarma', nome_comercial: 'Glibenclamida Eurofarma', apresentacoes: ['5 mg'] },
        { laboratorio: 'Libbs', nome_comercial: 'Daonil', apresentacoes: ['5 mg'] },
      ],
    },
  ],

  // ─── PNEUMONIA (J18) ──────────────────────────────────────
  'J18': [
    {
      id: 'amoxicilina',
      molecula: 'Amoxicilina',
      nome_generico: 'Amoxicilina tri-hidratada',
      classe: 'Betalactâmico',
      subclasse: 'Aminopenicilina',
      indicacoes: ['PAC leve (ambulatorial)', 'Sem comorbidades'],
      apresentacoes_disponiveis: ['500 mg', '875 mg'],
      formas_farmaceuticas: ['Comprimido', 'Cápsula', 'Suspensão oral'],
      marcas: [
        { laboratorio: 'EMS', nome_comercial: 'Amoxicilina EMS', apresentacoes: ['500 mg', '875 mg'] },
        { laboratorio: 'Eurofarma', nome_comercial: 'Amoxicilina Eurofarma', apresentacoes: ['500 mg'] },
        { laboratorio: 'Aché', nome_comercial: 'Amoxil', apresentacoes: ['500 mg', '875 mg'] },
        { laboratorio: 'GSK', nome_comercial: 'Amoxil GSK', apresentacoes: ['500 mg', '875 mg'] },
      ],
    },
    {
      id: 'azitromicina',
      molecula: 'Azitromicina',
      nome_generico: 'Di-hidrato de Azitromicina',
      classe: 'Macrolídeo',
      indicacoes: ['PAC leve (atípicos)', 'PAC — em combinação', 'Alérgicos a betalactâmicos'],
      apresentacoes_disponiveis: ['250 mg', '500 mg'],
      formas_farmaceuticas: ['Comprimido', 'Suspensão oral'],
      marcas: [
        { laboratorio: 'Pfizer', nome_comercial: 'Zitromax', apresentacoes: ['500 mg'] },
        { laboratorio: 'EMS', nome_comercial: 'Azitromicina EMS', apresentacoes: ['500 mg'] },
        { laboratorio: 'Eurofarma', nome_comercial: 'Azitromicina Eurofarma', apresentacoes: ['500 mg'] },
        { laboratorio: 'Aché', nome_comercial: 'Azitromicina Aché', apresentacoes: ['500 mg'] },
      ],
    },
  ],

  // ─── ASMA (J45) ───────────────────────────────────────────
  'J45': [
    {
      id: 'budesonida_form',
      molecula: 'Budesonida + Formoterol',
      nome_generico: 'Budesonida / Formoterol Fumarato',
      classe: 'CI + LABA',
      subclasse: 'Corticosteroide Inalatório + Beta-2 agonista de ação prolongada',
      indicacoes: ['Asma persistente moderada a grave', 'DPOC com exacerbações frequentes'],
      apresentacoes_disponiveis: ['80/4,5 mcg', '160/4,5 mcg', '320/9 mcg'],
      formas_farmaceuticas: ['Inalatório DPI', 'Inalatório pMDI'],
      marcas: [
        { laboratorio: 'AstraZeneca', nome_comercial: 'Symbicort', apresentacoes: ['80/4,5 mcg', '160/4,5 mcg'] },
        { laboratorio: 'Eurofarma', nome_comercial: 'Budesonida + Formoterol Eurofarma', apresentacoes: ['80/4,5 mcg', '160/4,5 mcg'] },
        { laboratorio: 'EMS', nome_comercial: 'Alenia', apresentacoes: ['80/4,5 mcg', '160/4,5 mcg'] },
      ],
    },
    {
      id: 'salbutamol',
      molecula: 'Salbutamol',
      nome_generico: 'Sulfato de Salbutamol',
      classe: 'SABA',
      subclasse: 'Beta-2 agonista de ação curta',
      indicacoes: ['Asma — resgate', 'Broncoespasmo agudo'],
      apresentacoes_disponiveis: ['100 mcg/dose'],
      formas_farmaceuticas: ['Inalatório pMDI', 'Nebulização'],
      marcas: [
        { laboratorio: 'GSK', nome_comercial: 'Aerolin', apresentacoes: ['100 mcg/dose'] },
        { laboratorio: 'EMS', nome_comercial: 'Salbutamol EMS', apresentacoes: ['100 mcg/dose'] },
        { laboratorio: 'Eurofarma', nome_comercial: 'Salbutamol Eurofarma', apresentacoes: ['100 mcg/dose'] },
      ],
    },
  ],

  // ─── IC (I50) ─────────────────────────────────────────────
  'I50': [
    {
      id: 'carvedilol',
      molecula: 'Carvedilol',
      nome_generico: 'Carvedilol',
      classe: 'Betabloqueador',
      subclasse: 'Betabloqueador não-seletivo com atividade alfa-1',
      indicacoes: ['IC-FEr', 'HAS', 'Pós-IAM com disfunção VE'],
      apresentacoes_disponiveis: ['3,125 mg', '6,25 mg', '12,5 mg', '25 mg'],
      formas_farmaceuticas: ['Comprimido'],
      marcas: [
        { laboratorio: 'Roche', nome_comercial: 'Coreg', apresentacoes: ['3,125 mg', '6,25 mg', '12,5 mg', '25 mg'] },
        { laboratorio: 'EMS', nome_comercial: 'Carvedilol EMS', apresentacoes: ['6,25 mg', '12,5 mg', '25 mg'] },
        { laboratorio: 'Eurofarma', nome_comercial: 'Carvedilol Eurofarma', apresentacoes: ['6,25 mg', '12,5 mg', '25 mg'] },
        { laboratorio: 'Libbs', nome_comercial: 'Carvedilol Libbs', apresentacoes: ['6,25 mg', '12,5 mg', '25 mg'] },
      ],
    },
    {
      id: 'sacubitril_valsartana',
      molecula: 'Sacubitril + Valsartana',
      nome_generico: 'Sacubitril / Valsartana',
      classe: 'ARNI',
      subclasse: 'Inibidor de neprilisina + BRA',
      indicacoes: ['IC-FEr (FEVE ≤ 40%) — sintomática, tolerante a IECA/BRA'],
      apresentacoes_disponiveis: ['24/26 mg', '49/51 mg', '97/103 mg'],
      formas_farmaceuticas: ['Comprimido'],
      marcas: [
        { laboratorio: 'Novartis', nome_comercial: 'Entresto', apresentacoes: ['24/26 mg', '49/51 mg', '97/103 mg'] },
      ],
    },
    {
      id: 'espironolactona',
      molecula: 'Espironolactona',
      nome_generico: 'Espironolactona',
      classe: 'Antagonista de Mineralocorticoide',
      indicacoes: ['IC-FEr (em adição a IECA + BB)', 'Hipocalemia por tiazídicos', 'Ascite cirrótica'],
      apresentacoes_disponiveis: ['25 mg', '50 mg', '100 mg'],
      formas_farmaceuticas: ['Comprimido'],
      marcas: [
        { laboratorio: 'Eurofarma', nome_comercial: 'Aldactone', apresentacoes: ['25 mg', '50 mg', '100 mg'] },
        { laboratorio: 'EMS', nome_comercial: 'Espironolactona EMS', apresentacoes: ['25 mg', '50 mg'] },
        { laboratorio: 'Libbs', nome_comercial: 'Espironolactona Libbs', apresentacoes: ['25 mg', '100 mg'] },
      ],
    },
  ],
};

// ============================================================
// DADOS DE PROGNÓSTICO POR DIAGNÓSTICO
// ============================================================
export const PROGNOSIS_DATA: Record<string, PrognosisData> = {
  'I10': {
    risco_geral: 'alto',
    risco_percentual: '~20% de eventos cardiovasculares maiores em 10 anos (sem tratamento)',
    scores: [
      {
        nome: 'Escore de Framingham',
        sigla: 'FRS',
        valor: '22%',
        interpretacao: 'Alto risco cardiovascular em 10 anos',
        referencia: 'Framingham Heart Study — D\'Agostino RB, et al. Circulation 2008',
        cor: 'orange',
      },
      {
        nome: 'Estágio HAS (7ª Diretriz SBC)',
        sigla: 'HAS-Estágio',
        valor: 'Estágio 2',
        interpretacao: 'PA 160-179/100-109 mmHg — tratamento farmacológico imediato indicado',
        referencia: '7ª Diretriz Brasileira de HAS — SBC 2020',
        cor: 'orange',
      },
    ],
    fatores_risco: [
      'Hipertensão não controlada (PA > 160/100)',
      'Tabagismo ativo',
      'Dislipidemia associada',
      'Sedentarismo',
      'Histórico familiar de DAC precoce',
      'IMC > 30 (obesidade)',
    ],
    fatores_protetores: [
      'Ausência de DM2 confirmado',
      'Sem lesão de órgão-alvo identificada',
      'Função renal preservada',
      'Adesão ao tratamento potencial',
    ],
    eventos_relevantes: [
      'Risco de AVC isquêmico aumentado 4-6x sem tratamento',
      'Risco de IAM aumentado 2-3x',
      'Risco de insuficiência renal progressiva',
      'Risco de insuficiência cardíaca',
      'Retinopatia hipertensiva (longo prazo)',
    ],
    progressao_esperada:
      'Com tratamento adequado, meta de PA < 130/80 mmHg reduz risco de AVC em 35-40% e de IAM em 20-25%. Pacientes com HAS Estágio 2 que atingem metas têm expectativa de vida semelhante à população geral.',
    horizonte_temporal: '5-10 anos',
    aviso: 'Informação de apoio clínico baseada em dados populacionais. Não substitui o julgamento médico individualizado.',
  },

  'E11': {
    risco_geral: 'alto',
    risco_percentual: 'HbA1c 8,4% — risco ~2-3x maior de eventos CV vs. não-diabéticos',
    scores: [
      {
        nome: 'UKPDS Risk Engine',
        sigla: 'UKPDS',
        valor: 'Alto',
        interpretacao: 'DM2 com HbA1c > 8% — alto risco de complicações microvasculares e macrovasculares',
        referencia: 'UK Prospective Diabetes Study — BMJ 1998',
        cor: 'red',
      },
      {
        nome: 'Risco de Progressão para DRC',
        sigla: 'DRC-Risk',
        valor: 'Moderado-Alto',
        interpretacao: 'Sem microalbuminúria confirmada; rastreio essencial',
        referencia: 'ADA Standards of Care 2024 — Seção 11',
        cor: 'orange',
      },
    ],
    fatores_risco: [
      'HbA1c 8,4% — não controlado',
      'Obesidade grau I (IMC 33,2)',
      'Sedentarismo',
      'Histórico familiar de DM2',
      'Hipertensão associada (comum)',
      'Dislipidemia associada (provável)',
    ],
    fatores_protetores: [
      'Diagnóstico precoce',
      'Sem complicações identificadas no momento',
      'Paciente motivado (procurou atendimento)',
      'Ausência de cetoacidose',
    ],
    eventos_relevantes: [
      'Risco aumentado de nefropatia diabética',
      'Risco de retinopatia (20-30% em 15 anos sem controle)',
      'Neuropatia periférica (pé diabético)',
      'Risco 2-4x maior de doença arterial coronariana',
      'Risco de AVC',
    ],
    progressao_esperada:
      'Redução de HbA1c de 1% reduz complicações microvasculares em ~35% (UKPDS). Meta HbA1c < 7% associada à prevenção de nefropatia, retinopatia e neuropatia. Empagliflozina reduz mortalidade CV em 38% (EMPA-REG OUTCOME).',
    horizonte_temporal: '10-20 anos',
    aviso: 'Informação de apoio clínico baseada em dados populacionais. Não substitui o julgamento médico individualizado.',
  },
};

// ============================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================

export function getMoleculesByCondition(cid10: string): MoleculeEntry[] {
  const prefix = cid10.substring(0, 3);
  return DRUG_DATABASE[prefix] ?? [];
}

export function getBrandsByMoleculeAndLab(
  moleculaId: string,
  cid10: string,
  laboratorio: string,
) {
  const molecules = getMoleculesByCondition(cid10);
  const molecule = molecules.find(m => m.id === moleculaId);
  if (!molecule) return [];
  if (laboratorio === 'sem_preferencia') return molecule.marcas;
  return molecule.marcas.filter(
    b => b.laboratorio.toLowerCase().includes(laboratorio.toLowerCase()),
  );
}

export function getPrognosisForDiagnosis(cid10: string): PrognosisData | null {
  const prefix = cid10.substring(0, 3);
  return PROGNOSIS_DATA[prefix] ?? null;
}
