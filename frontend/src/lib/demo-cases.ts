// ============================================================
// PRESCREVE-AI — Casos Clínicos de Demonstração
// Cada caso representa um cenário completo para demo comercial
// ============================================================

export interface DemoCase {
  id: string;
  titulo: string;
  especialidade: string;
  paciente: { nome: string; idade: number; sexo: 'M' | 'F' };
  queixa: string;
  descricao: string;
  diagnostico: string;
  cid10: string;
  icone: string;
}

export const DEMO_CASES: DemoCase[] = [
  {
    id: 'has',
    titulo: 'Hipertensão Arterial Sistêmica',
    especialidade: 'Cardiologia / Clínica Médica',
    paciente: { nome: 'Carlos Andrade', idade: 52, sexo: 'M' },
    queixa: 'PA elevada + cefaleia occipital',
    descricao: 'Paciente masculino, 52 anos, com PA 168/104 mmHg, IMC 31,4, sedentário, fumante. Pai faleceu de AVC.',
    diagnostico: 'HAS Estágio 2 — I10',
    cid10: 'I10',
    icone: '🫀',
  },
  {
    id: 'dm2',
    titulo: 'Diabetes Mellitus Tipo 2',
    especialidade: 'Endocrinologia / Clínica Médica',
    paciente: { nome: 'Ana Paula Ferreira', idade: 48, sexo: 'F' },
    queixa: 'Poliúria, polidipsia, fadiga há 2 meses',
    descricao: 'Glicemia jejum 196 mg/dL, HbA1c 8,4%, IMC 33,2, história familiar de DM2.',
    diagnostico: 'Diabetes Mellitus Tipo 2 — E11',
    cid10: 'E11',
    icone: '🩸',
  },
  {
    id: 'pac',
    titulo: 'Pneumonia Adquirida na Comunidade',
    especialidade: 'Pneumologia / Infectologia',
    paciente: { nome: 'Roberto Lima', idade: 67, sexo: 'M' },
    queixa: 'Febre, tosse produtiva, dispneia há 4 dias',
    descricao: 'Temp 38,9°C, SpO2 93%, Rx tórax com condensação lobar direita. CURB-65: 2.',
    diagnostico: 'PAC Moderada — J18.1',
    cid10: 'J18.1',
    icone: '🫁',
  },
  {
    id: 'itu',
    titulo: 'Infecção do Trato Urinário',
    especialidade: 'Clínica Médica / Urologia',
    paciente: { nome: 'Mariana Souza', idade: 32, sexo: 'F' },
    queixa: 'Disúria, polaciúria, dor suprapúbica',
    descricao: 'EAS com leucocitúria 3+, nitrito positivo, sem febre. Cistite não complicada.',
    diagnostico: 'Cistite Bacteriana Aguda — N30.0',
    cid10: 'N30.0',
    icone: '🔬',
  },
  {
    id: 'asma',
    titulo: 'Asma Brônquica',
    especialidade: 'Pneumologia / Alergia',
    paciente: { nome: 'Lucas Mendes', idade: 24, sexo: 'M' },
    queixa: 'Sibilância, dispneia noturna, tosse seca',
    descricao: 'Asma persistente moderada não controlada. VEF1 68% pós-BD. Uso irregular de salbutamol.',
    diagnostico: 'Asma Moderada Não Controlada — J45.1',
    cid10: 'J45.1',
    icone: '💨',
  },
  {
    id: 'icc',
    titulo: 'Insuficiência Cardíaca com FE Reduzida',
    especialidade: 'Cardiologia',
    paciente: { nome: 'José Cardoso', idade: 71, sexo: 'M' },
    queixa: 'Dispneia aos esforços, edema MMII, ortopneia',
    descricao: 'ECO: FEVE 32%, dilatação VE. BNP 780 pg/mL. Classe funcional NYHA III.',
    diagnostico: 'IC-FEr (FEVE < 40%) — I50.0',
    cid10: 'I50.0',
    icone: '💗',
  },
];

// ============================================================
// EVIDÊNCIAS EXPANDIDAS por caso
// ============================================================

import type { DiagnosticSupport, TherapeuticPlan, SafetyCheck } from './types';
import { MOCK_DIAGNOSTIC, MOCK_THERAPEUTIC, MOCK_SAFETY } from './mock-data';

export const DEMO_DM2_DIAGNOSTIC: DiagnosticSupport = {
  sintese_clinica:
    'Quadro clínico, laboratorial e antropométrico compatível com Diabetes Mellitus Tipo 2 confirmado (critérios ADA 2023: glicemia jejum ≥ 126 mg/dL em 2 ocasiões e HbA1c ≥ 6,5%). Obesidade grau I associada. Rastreio de complicações indicado.',
  red_flags: [
    'HbA1c 8,4% — risco aumentado de complicações microvasculares',
    'Rastrear nefropatia (microalbuminúria), retinopatia e neuropatia',
  ],
  encaminhamento_urgente: false,
  hipoteses: [
    {
      id: 'dm2_conf',
      cid10: 'E11',
      nome: 'Diabetes Mellitus Tipo 2',
      probabilidade: 'alta',
      criterios_favoraveis: [
        'Glicemia jejum 196 mg/dL (≥ 126 mg/dL)',
        'HbA1c 8,4% (≥ 6,5%)',
        'Sintomas clássicos: poliúria, polidipsia, fadiga',
        'Obesidade (IMC 33,2)',
        'História familiar positiva para DM2',
        'Idade > 45 anos',
      ],
      criterios_desfavoraveis: [
        'Ausência de cetoacidose (favorece DM2 sobre DM1)',
        'Início insidioso (não agudo como DM1)',
      ],
      exames_sugeridos: [
        'HbA1c (confirmação e baseline)',
        'Microalbuminúria / Razão albumina-creatinina',
        'Creatinina e TFG',
        'Lipidograma completo',
        'TSH (comorbidade frequente)',
        'ECG de repouso',
        'Fundo de olho',
        'Exame dos pés (neuropatia)',
      ],
      raciocinio_clinico:
        'Critérios diagnósticos da ADA (2023) e da SBD (2023) plenamente satisfeitos. A presença de 2 glicemias de jejum ≥ 126 mg/dL e HbA1c ≥ 6,5% confirma o diagnóstico sem necessidade de TOTG.',
    },
    {
      id: 'dm_sec',
      cid10: 'E13',
      nome: 'Diabetes Mellitus Secundária (a excluir)',
      probabilidade: 'baixa',
      criterios_favoraveis: ['Obesidade associada'],
      criterios_desfavoraveis: [
        'Sem uso de corticosteroides',
        'Sem pancreatite prévia conhecida',
        'Quadro clínico típico de DM2',
      ],
      exames_sugeridos: ['TSH (excluir DM por hipotireoidismo)', 'Cortisol sérico (se suspeita de Cushing)'],
      raciocinio_clinico: 'Baixa probabilidade dado o quadro típico de DM2. Investigação secundária somente se ausência de resposta ao tratamento inicial.',
    },
  ],
};

export const DEMO_DM2_THERAPEUTIC: TherapeuticPlan = {
  diagnostico_selecionado: 'Diabetes Mellitus Tipo 2 (E11) — HbA1c 8,4%',
  preferencia_laboratorio: 'sem_preferencia',
  nao_farmacologico: [
    'Educação em Diabetes: autocuidado, reconhecimento de hipo/hiperglicemia',
    'Dieta: restrição de carboidratos refinados, aumento de fibras — meta calórica individualizada',
    'Atividade física: 150 min/sem de intensidade moderada + resistência 2x/sem',
    'Redução de peso: meta 5-10% do peso corporal initial (reduz HbA1c 0,5-1%)',
    'Cessação do tabagismo (se aplicável)',
    'Automonitoramento: glicemia capilar pré e pós-prandial',
  ],
  seguimento: 'HbA1c a cada 3 meses até meta (< 7%), depois a cada 6 meses. Consulta em 4-6 semanas para avaliação inicial.',
  monitorizacao: [
    'HbA1c a cada 3 meses',
    'Glicemia de jejum mensal',
    'Microalbuminúria anualmente',
    'TFG anualmente',
    'Fundo de olho anualmente',
    'Lipidograma anualmente',
    'Exame dos pés a cada consulta',
    'PA em todas as consultas',
  ],
  encaminhamento: 'Oftalmologista (retinopatia), Nutricionista (educação alimentar), Endocrinologista se HbA1c > 9% após 3 meses',
  farmacologico: [
    {
      id: 'metformina',
      classe_terapeutica: 'Biguanida',
      molecula: 'Metformina',
      nome_generico: 'Cloridrato de Metformina',
      indicacao: 'Antidiabético oral de primeira linha — DM2 sem contraindicações',
      dose: {
        dose_padrao: '500-850 mg',
        dose_min: '500 mg',
        dose_max: '2550 mg/dia',
        unidade: 'mg',
        via: 'Oral',
        frequencia: '2-3x ao dia com as refeições',
        duracao: 'Contínuo',
        ajuste_renal: 'TFG 30-45: max 1000 mg/dia; TFG < 30: contraindicado',
        ajuste_hepatico: 'Evitar em insuficiência hepática grave (risco de acidose lática)',
      },
      posologia_completa:
        'Metformina 500 mg — 1 comprimido 2x/dia com o almoço e jantar. Aumentar para 850 mg 2x/dia em 2 semanas conforme tolerância.',
      contraindicacoes: [
        'TFG < 30 mL/min/1,73m²',
        'Acidose metabólica (incluindo cetoacidose)',
        'Insuficiência hepática grave',
        'Exames com contraste iodado (suspender 48h antes e após)',
        'Alcoolismo grave',
      ],
      efeitos_adversos: [
        'Náuseas, vômitos, diarreia (início — reduzir com titulação lenta)',
        'Deficiência de vitamina B12 (uso prolongado)',
        'Acidose lática (raro — principalmente se contraindicações ignoradas)',
        'Gosto metálico',
      ],
      monitoramento: ['Creatinina e TFG a cada 6 meses', 'Vitamina B12 anualmente', 'HbA1c a cada 3 meses'],
      alternativas: ['Empagliflozina 10 mg (se DCV aterosclerótica)', 'Liraglutida 1,2 mg SC (se obesidade)'],
      evidencia: {
        diretriz: 'Standards of Medical Care in Diabetes 2024 — ADA + Diretrizes SBD 2023-2024',
        sociedade: 'American Diabetes Association (ADA) / Sociedade Brasileira de Diabetes (SBD)',
        ano: 2024,
        nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'Múltiplos ECRs e meta-análises — UKPDS, meta-análise Cochrane' },
        citacao: 'American Diabetes Association. Diabetes Care 2024;47(Suppl 1):S1-S321.',
        doi: '10.2337/dc24-S001',
      },
      marcas: [
        { laboratorio: 'EMS', nome_comercial: 'Glifage', apresentacoes: ['500 mg', '850 mg', '1000 mg'] },
        { laboratorio: 'Merck', nome_comercial: 'Glucophage', apresentacoes: ['500 mg', '850 mg', '1000 mg'] },
        { laboratorio: 'Eurofarma', nome_comercial: 'Metformina Eurofarma', apresentacoes: ['500 mg', '850 mg'] },
        { laboratorio: 'Biolab', nome_comercial: 'Metformina Biolab', apresentacoes: ['500 mg', '850 mg', '1000 mg'] },
      ],
    },
    {
      id: 'empagliflozina',
      classe_terapeutica: 'Inibidor de SGLT-2',
      molecula: 'Empagliflozina',
      nome_generico: 'Empagliflozina',
      indicacao: 'Antidiabético oral — 2ª linha ou em combinação — benefício cardiovascular e renal independente do controle glicêmico',
      dose: {
        dose_padrao: '10 mg',
        dose_min: '10 mg',
        dose_max: '25 mg/dia',
        unidade: 'mg',
        via: 'Oral',
        frequencia: '1x ao dia (manhã)',
        duracao: 'Contínuo',
        ajuste_renal: 'TFG 20-45: manter para benefício renal; TFG < 20: contraindicado',
        ajuste_hepatico: 'Não requer ajuste',
      },
      posologia_completa: 'Empagliflozina 10 mg — 1 comprimido pela manhã. Aumentar para 25 mg após 4-8 semanas se necessário.',
      contraindicacoes: [
        'TFG < 20 mL/min/1,73m²',
        'DM1 (risco de cetoacidose euglicêmica)',
        'Infecções genitais recorrentes (relativo)',
        'Amputações prévias de MMII (cautela)',
      ],
      efeitos_adversos: [
        'Infecções genitomicóticas (candidíase)',
        'ITU (menos frequente que esperado)',
        'Poliúria leve',
        'Cetoacidose euglicêmica (raro)',
        'Gangrena de Fournier (muito raro)',
      ],
      monitoramento: ['TFG a cada 3-6 meses', 'Monitorar sinais de infecção genital', 'PA (efeito hipotensor leve)'],
      alternativas: ['Dapagliflozina 10 mg', 'Canagliflozina 100 mg', 'Liraglutida 1,2 mg (se obesidade predominante)'],
      evidencia: {
        diretriz: 'Standards of Medical Care in Diabetes 2024 — ADA / EASD Consensus 2023',
        sociedade: 'American Diabetes Association (ADA)',
        ano: 2024,
        nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'Trial EMPA-REG OUTCOME (N=7020, NEJM 2015)' },
        citacao: 'Zinman B, et al. Empagliflozin, Cardiovascular Outcomes, and Mortality in Type 2 Diabetes. NEJM. 2015;373:2117-2128.',
        doi: '10.1056/NEJMoa1504720',
      },
      marcas: [
        { laboratorio: 'Boehringer Ingelheim / Eli Lilly', nome_comercial: 'Jardiance', apresentacoes: ['10 mg', '25 mg'] },
        { laboratorio: 'EMS', nome_comercial: 'Empagliflozina EMS', apresentacoes: ['10 mg', '25 mg'] },
      ],
    },
  ],
};

export const getCaseData = (caseId: string) => {
  switch (caseId) {
    case 'dm2':
      return { diagnostic: DEMO_DM2_DIAGNOSTIC, therapeutic: DEMO_DM2_THERAPEUTIC, safety: MOCK_SAFETY };
    default:
      return { diagnostic: MOCK_DIAGNOSTIC, therapeutic: MOCK_THERAPEUTIC, safety: MOCK_SAFETY };
  }
};
