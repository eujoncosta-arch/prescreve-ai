// ============================================================
// PRESCREVE-AI — Repositório Científico
// Diretrizes, meta-análises, RCTs e revisões sistemáticas
// Motor de correlação: Diagnóstico → Diretriz → Classe → Molécula
// ============================================================

import type { ScientificEntry } from './types';

export const SCIENTIFIC_REPOSITORY: ScientificEntry[] = [

  // ══════════════════════════════════════════════════════════
  // HIPERTENSÃO ARTERIAL (I10)
  // ══════════════════════════════════════════════════════════
  {
    // RM-81: a correção do RM-76 (7ª edição/2020 → "8ª edição/2024") citava
    // uma diretriz que não corresponde a nenhuma publicação real localizável
    // — o "DOI" e o título já estavam em `evidence-engine.ts` antes de
    // qualquer RM desta sessão, nunca verificados contra uma fonte real.
    // O documento real fornecido pelo usuário (Diretriz Brasileira de
    // Hipertensão Arterial – 2025, Arq Bras Cardiol. 2025;122(9):e20250624,
    // DOI 10.36660/abc.20250624) compara-se explicitamente à "DBHA de 2020"
    // como sua predecessora direta — nunca a uma edição de 2024. Corrigido
    // para a diretriz real, verificada por leitura do PDF oficial.
    id: 'sci-dbha-2025',
    titulo: 'Diretriz Brasileira de Hipertensão Arterial – 2025',
    tipo: 'diretriz',
    sociedade_ou_journal: 'Sociedade Brasileira de Cardiologia (SBC), Sociedade Brasileira de Nefrologia (SBN), Sociedade Brasileira de Hipertensão (SBH)',
    ano: 2025,
    doi: '10.36660/abc.20250624',
    cids_relacionados: ['I10', 'I11', 'I12', 'I13'],
    moleculas_relacionadas: ['Losartana', 'Enalapril', 'Anlodipino', 'Hidroclorotiazida', 'Clortalidona', 'Espironolactona'],
    classes_relacionadas: ['BRA', 'IECA', 'BCC', 'Diurético Tiazídico', 'ARM'],
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    resumo: 'Meta pressórica < 130/80 mmHg para todos os hipertensos, independentemente do risco cardiovascular ser baixo, moderado ou alto (mudança em relação à DBHA 2020, que reservava essa meta a pacientes de maior risco). Reclassifica a pré-hipertensão (PAS 120–139 e/ou PAD 80–89 mmHg, absorvendo a antiga categoria "PA ótima"). Recomenda diuréticos tiazídicos/similares, IECA ou BRA e BCC como classes preferenciais; associação dupla em dose baixa como início para a maioria dos pacientes. Primeira edição com capítulo dedicado ao manejo da HA no SUS (~75% dos pacientes hipertensos no Brasil).',
    data_inclusao: '2025-01-01',
    data_proxima_revisao: '2030-01-01',
  },
  {
    id: 'sci-esc-2018-has',
    titulo: '2018 ESC/ESH Guidelines for the management of arterial hypertension',
    tipo: 'diretriz',
    sociedade_ou_journal: 'European Society of Cardiology / European Society of Hypertension',
    ano: 2018,
    doi: '10.1093/eurheartj/ehy339',
    cids_relacionados: ['I10', 'I11', 'I12', 'I13'],
    moleculas_relacionadas: ['Losartana', 'Enalapril', 'Anlodipino', 'Hidroclorotiazida', 'Ramipril', 'Valsartana'],
    classes_relacionadas: ['BRA', 'IECA', 'BCC', 'Diurético Tiazídico'],
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    resumo: 'Metas: < 130/80 mmHg em < 65 anos; 130-139/70-79 em > 65 anos. Recomenda combinação de IEC/BRA + BCC ou diurético como primeiro passo. Abandonou a terminologia de pré-hipertensão. Estratificação de risco cardiovascular total pelo SCORE.',
    data_inclusao: '2018-09-01',
  },
  {
    id: 'sci-sprint-2015',
    titulo: 'A Randomized Trial of Intensive versus Standard Blood-Pressure Control (SPRINT)',
    tipo: 'ensaio_clinico',
    sociedade_ou_journal: 'New England Journal of Medicine',
    ano: 2015,
    doi: '10.1056/NEJMoa1511939',
    cids_relacionados: ['I10'],
    moleculas_relacionadas: ['Clortalidona', 'Anlodipino', 'Hidroclorotiazida', 'Losartana', 'Enalapril'],
    classes_relacionadas: ['Diurético Tiazídico', 'BCC', 'IECA', 'BRA'],
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    resumo: 'N=9.361 pacientes com HAS e risco cardiovascular elevado. Meta intensiva (PA sistólica < 120 vs < 140 mmHg) reduziu desfechos cardiovasculares maiores em 25% (HR 0,75; IC95% 0,64-0,89) e mortalidade total em 27%. Base para a revisão das metas pressóricas na HAS de alto risco.',
    data_inclusao: '2015-11-09',
  },
  {
    id: 'sci-hope-2000',
    titulo: 'Effects of an Angiotensin-Converting Enzyme Inhibitor on Cardiovascular Events in High-Risk Patients (HOPE)',
    tipo: 'ensaio_clinico',
    sociedade_ou_journal: 'New England Journal of Medicine',
    ano: 2000,
    doi: '10.1056/NEJM200001203420301',
    cids_relacionados: ['I10', 'I25'],
    moleculas_relacionadas: ['Ramipril', 'Enalapril'],
    classes_relacionadas: ['IECA'],
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    resumo: 'N=9.297 pacientes de alto risco cardiovascular. Ramipril 10 mg/dia reduziu IAM, AVC e morte cardiovascular em 22% (RR 0,78; p<0,001) vs placebo — independentemente do efeito anti-hipertensivo. Fundamenta o uso de IECAs para proteção cardiovascular além do controle de PA.',
    data_inclusao: '2000-01-20',
  },

  // ══════════════════════════════════════════════════════════
  // DIABETES MELLITUS TIPO 2 (E11)
  // ══════════════════════════════════════════════════════════
  {
    id: 'sci-ada-2024',
    titulo: 'Standards of Medical Care in Diabetes — 2024',
    tipo: 'diretriz',
    sociedade_ou_journal: 'American Diabetes Association (ADA)',
    ano: 2024,
    doi: '10.2337/dc24-SINT',
    cids_relacionados: ['E11', 'E10', 'E14'],
    moleculas_relacionadas: ['Metformina', 'Empagliflozina', 'Dapagliflozina', 'Liraglutida', 'Semaglutida', 'Sitagliptina'],
    classes_relacionadas: ['Biguanida', 'SGLT-2', 'GLP-1', 'DPP-4', 'Sulfonilureia'],
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    resumo: 'Metformina continua como primeira linha em DM2 sem contraindicações. SGLT-2 e GLP-1 RA com benefício cardiovascular demonstrado devem ser considerados independentemente de HbA1c. HbA1c alvo: < 7% (< 53 mmol/mol) para a maioria; individualizar em idosos (< 8%). Expansão das indicações de SGLT-2 em DRC.',
    data_inclusao: '2024-01-01',
    data_proxima_revisao: '2025-01-01',
  },
  {
    id: 'sci-sbd-2023',
    titulo: 'Diretrizes da Sociedade Brasileira de Diabetes 2023-2024',
    tipo: 'diretriz',
    sociedade_ou_journal: 'Sociedade Brasileira de Diabetes (SBD)',
    ano: 2023,
    doi: '10.29327/557753',
    cids_relacionados: ['E11', 'E10'],
    moleculas_relacionadas: ['Metformina', 'Empagliflozina', 'Dapagliflozina', 'Liraglutida', 'Semaglutida', 'Glibenclamida', 'Insulina'],
    classes_relacionadas: ['Biguanida', 'SGLT-2', 'GLP-1', 'Sulfonilureia', 'Insulina'],
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    resumo: 'Alinhamento com ADA 2023. Algoritmo terapêutico inclui SGLT-2 ou GLP-1 RA em pacientes com DCVA, IC ou DRC independentemente de HbA1c. Metformina como base do tratamento. Desestimula uso de sulfonilureias de longa ação (glibenclamida) em idosos.',
    data_inclusao: '2023-09-15',
    data_proxima_revisao: '2025-09-01',
  },
  {
    id: 'sci-empa-reg-2015',
    titulo: 'Empagliflozin, Cardiovascular Outcomes, and Mortality in Type 2 Diabetes (EMPA-REG OUTCOME)',
    tipo: 'ensaio_clinico',
    sociedade_ou_journal: 'New England Journal of Medicine',
    ano: 2015,
    doi: '10.1056/NEJMoa1504720',
    cids_relacionados: ['E11', 'I50'],
    moleculas_relacionadas: ['Empagliflozina'],
    classes_relacionadas: ['SGLT-2'],
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    resumo: 'N=7.020 pacientes com DM2 e DCVA estabelecida. Empagliflozina reduziu MACE em 14% (HR 0,86; p=0,04), morte cardiovascular em 38% (HR 0,62; p<0,001), hospitalização por IC em 35% (HR 0,65; p<0,001). Ensaio definidor da classe SGLT-2 para proteção cardiometabólica.',
    data_inclusao: '2015-09-17',
  },
  {
    id: 'sci-ukpds-1998',
    titulo: 'Intensive blood-glucose control with sulphonylureas or insulin compared with conventional treatment and risk of complications in patients with type 2 diabetes (UKPDS 33)',
    tipo: 'ensaio_clinico',
    sociedade_ou_journal: 'The Lancet',
    ano: 1998,
    doi: '10.1016/S0140-6736(98)07019-6',
    cids_relacionados: ['E11'],
    moleculas_relacionadas: ['Metformina', 'Glibenclamida', 'Insulina'],
    classes_relacionadas: ['Biguanida', 'Sulfonilureia', 'Insulina'],
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    resumo: 'N=3.867 pacientes com DM2 recém-diagnosticado. Controle glicêmico intensivo (HbA1c ~7%) vs convencional (~7,9%) reduziu complicações microvasculares em 25%. Metformina em pacientes obesos reduziu infarto do miocárdio em 39% vs sulfonilureia. Fundamento do uso da metformina como primeiro antidiabético.',
    data_inclusao: '1998-09-01',
  },

  // ══════════════════════════════════════════════════════════
  // INSUFICIÊNCIA CARDÍACA (I50)
  // ══════════════════════════════════════════════════════════
  {
    // RM-76 (continuação): substituída a edição-base de 2021 (DOI
    // 10.1093/eurheartj/ehab368) pela "2023 Focused Update" (DOI
    // 10.1093/eurheartj/ehad195) — mesmo padrão do achado da diretriz de
    // HAS. `evidence-engine.ts` já indexava o update de 2023 como
    // `esc-hf-2023` desde antes desta correção. Conteúdo clínico
    // (quarteto terapêutico) inalterado entre as duas versões.
    id: 'sci-esc-ic-2023',
    titulo: 'ESC Guidelines for Heart Failure — 2023 Focused Update',
    tipo: 'diretriz',
    sociedade_ou_journal: 'European Society of Cardiology (ESC)',
    ano: 2023,
    doi: '10.1093/eurheartj/ehad195',
    cids_relacionados: ['I50', 'I11.0', 'I42'],
    moleculas_relacionadas: ['Carvedilol', 'Metoprolol', 'Bisoprolol', 'Enalapril', 'Sacubitril/Valsartana', 'Espironolactona', 'Eplerenona', 'Empagliflozina', 'Dapagliflozina', 'Furosemida'],
    classes_relacionadas: ['Beta-bloqueador', 'IECA', 'ARNI', 'ARM', 'SGLT-2', 'Diurético de Alça'],
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    resumo: 'Quarteto terapêutico obrigatório na IC-FEr (FE ≤ 40%): IECA/ARNI + beta-bloqueador + ARM + SGLT-2. ARNI (sacubitril/valsartana) como Classe I, substituindo IECA se tolerado. SGLT-2 incluídos formalmente no quarteto. Meta de FC < 70 bpm. ICD em FE ≤ 35% com NYHA ≥ II. Edição vigente — atualização focada da diretriz de 2021.',
    data_inclusao: '2023-08-25',
    data_proxima_revisao: '2026-01-01',
  },
  {
    id: 'sci-copernicus-2001',
    titulo: 'Effect of Carvedilol on Survival in Severe Chronic Heart Failure (COPERNICUS)',
    tipo: 'ensaio_clinico',
    sociedade_ou_journal: 'New England Journal of Medicine',
    ano: 2001,
    doi: '10.1056/NEJMoa010195',
    cids_relacionados: ['I50'],
    moleculas_relacionadas: ['Carvedilol'],
    classes_relacionadas: ['Beta-bloqueador'],
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    resumo: 'N=2.289 pacientes com IC grave (NYHA III-IV, FE < 25%). Carvedilol reduziu mortalidade total em 35% (HR 0,65; p=0,0014) e hospitalização por IC em 20%. Demonstrou segurança e benefício mesmo em IC grave, estabelecendo o carvedilol como tratamento de referência.',
    data_inclusao: '2001-05-31',
  },
  {
    id: 'sci-rales-1999',
    titulo: 'The Effect of Spironolactone on Morbidity and Mortality in Patients with Severe Heart Failure (RALES)',
    tipo: 'ensaio_clinico',
    sociedade_ou_journal: 'New England Journal of Medicine',
    ano: 1999,
    doi: '10.1056/NEJM199909023411001',
    cids_relacionados: ['I50'],
    moleculas_relacionadas: ['Espironolactona'],
    classes_relacionadas: ['ARM', 'Antagonista da Aldosterona'],
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    resumo: 'N=1.663 pacientes com IC grave (NYHA III-IV, FE < 35%). Espironolactona 25 mg/dia reduziu mortalidade total em 30% (RR 0,70; p<0,001) e hospitalização por piora de IC em 35%. Interrompido precocemente por benefício significativo. Referência do uso de ARM em IC-FEr.',
    data_inclusao: '1999-09-02',
  },

  // ══════════════════════════════════════════════════════════
  // PNEUMONIA (J18)
  // ══════════════════════════════════════════════════════════
  {
    id: 'sci-sbpt-pac-2022',
    titulo: 'Diretrizes Brasileiras para Pneumonia Adquirida na Comunidade em Adultos Imunocompetentes',
    tipo: 'diretriz',
    sociedade_ou_journal: 'Sociedade Brasileira de Pneumologia e Tisiologia (SBPT)',
    ano: 2022,
    doi: '10.36416/1806-3756/e20210597',
    cids_relacionados: ['J18', 'J15', 'J13', 'J14'],
    moleculas_relacionadas: ['Amoxicilina', 'Azitromicina', 'Amoxicilina-Clavulanato', 'Levofloxacino', 'Moxifloxacino'],
    classes_relacionadas: ['Penicilina', 'Macrolídeo', 'Fluoroquinolona Respiratória'],
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    resumo: 'PAC ambulatorial sem comorbidades: amoxicilina 1g 3x/dia ou amoxicilina-clavulanato 875/125 mg 2x/dia (agentes típicos); azitromicina 500 mg/dia (agentes atípicos). Hospitalização: beta-lactâmico + macrolídeo ou fluoroquinolona respiratória isolada. Estratificação por CURB-65 para decisão de internação.',
    data_inclusao: '2022-08-01',
    data_proxima_revisao: '2026-08-01',
  },

  // ══════════════════════════════════════════════════════════
  // ASMA (J45)
  // ══════════════════════════════════════════════════════════
  {
    id: 'sci-gina-2023',
    titulo: 'Global Strategy for Asthma Management and Prevention — GINA 2023',
    tipo: 'diretriz',
    sociedade_ou_journal: 'Global Initiative for Asthma (GINA)',
    ano: 2023,
    doi: '10.1183/13993003.00406-2019',
    cids_relacionados: ['J45', 'J46'],
    moleculas_relacionadas: ['Budesonida', 'Beclometasona', 'Formoterol', 'Salbutamol', 'Salmeterol', 'Tiotropio'],
    classes_relacionadas: ['ICS', 'LABA', 'SABA', 'LAMA'],
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    resumo: 'Mudança paradigmática: ICS-formoterol como terapia de alívio preferencial (Track 1) e de manutenção em todos os passos. SABA em monoterapia deixa de ser recomendado como alívio de primeira linha. Deprescição gradual de SABA isolado. Biológicos (benralizumabe, dupilumabe) em asma grave eosinofílica.',
    data_inclusao: '2023-05-01',
    data_proxima_revisao: '2024-05-01',
  },
  {
    id: 'sci-smart-2010',
    titulo: 'Formoterol and budesonide as maintenance and reliever therapy versus current best practice (SMART meta-analysis)',
    tipo: 'meta_analise',
    sociedade_ou_journal: 'European Respiratory Journal',
    ano: 2010,
    doi: '10.1183/09031936.00095109',
    cids_relacionados: ['J45'],
    moleculas_relacionadas: ['Budesonida', 'Formoterol'],
    classes_relacionadas: ['ICS', 'LABA'],
    nivel_evidencia: 'A',
    grau_recomendacao: 'I',
    resumo: 'Regime SMART (budesonida/formoterol como manutenção E alívio) reduziu exacerbações graves em 45% vs terapia convencional. N=14.385 pacientes adultos e pediátricos. Fundamenta o uso de ICS-formoterol como broncodilatador de alívio nos guidelines GINA 2019+.',
    data_inclusao: '2010-06-01',
  },
];

// ─── FUNÇÕES DE CORRELAÇÃO ────────────────────────────────────

export function getEvidenceForCondition(cid10: string): ScientificEntry[] {
  const prefix = cid10.substring(0, 3);
  return SCIENTIFIC_REPOSITORY.filter(e =>
    e.cids_relacionados.some(c => c.startsWith(prefix))
  );
}

export function getEvidenceForMolecule(molecula: string): ScientificEntry[] {
  const normalized = molecula.toLowerCase();
  return SCIENTIFIC_REPOSITORY.filter(e =>
    e.moleculas_relacionadas.some(m => m.toLowerCase().includes(normalized))
  );
}

export function getEvidenceForClass(classe: string): ScientificEntry[] {
  const normalized = classe.toLowerCase();
  return SCIENTIFIC_REPOSITORY.filter(e =>
    e.classes_relacionadas.some(c => c.toLowerCase().includes(normalized))
  );
}

export function getEvidenceByType(tipo: ScientificEntry['tipo']): ScientificEntry[] {
  return SCIENTIFIC_REPOSITORY.filter(e => e.tipo === tipo);
}

export const TIPO_LABELS: Record<ScientificEntry['tipo'], string> = {
  diretriz: 'Diretriz',
  consenso: 'Consenso',
  meta_analise: 'Meta-análise',
  revisao_sistematica: 'Revisão Sistemática',
  ensaio_clinico: 'Ensaio Clínico (RCT)',
  coorte: 'Estudo de Coorte',
};

export const TIPO_COLORS: Record<ScientificEntry['tipo'], string> = {
  diretriz: 'bg-blue-100 text-blue-700 border-blue-200',
  consenso: 'bg-purple-100 text-purple-700 border-purple-200',
  meta_analise: 'bg-green-100 text-green-700 border-green-200',
  revisao_sistematica: 'bg-teal-100 text-teal-700 border-teal-200',
  ensaio_clinico: 'bg-orange-100 text-orange-700 border-orange-200',
  coorte: 'bg-slate-100 text-slate-700 border-slate-200',
};
