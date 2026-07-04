// ============================================================
// PRESCREVE-AI — Motor de Apoio à Decisão Clínica (CDS)
// Baseado em diretrizes brasileiras e internacionais verificadas
//
// AVISO LEGAL: Este sistema é suporte à decisão clínica.
// Não realiza diagnóstico autônomo. O diagnóstico final é de
// responsabilidade exclusiva do médico assistente.
// ============================================================

import type { Anamnesis, DiagnosticSupport, DiagnosticHypothesis } from './types';

// ─── HELPERS ─────────────────────────────────────────────────

const txt = (...fields: (string | undefined)[]) =>
  fields.filter(Boolean).join(' ').toLowerCase();

const has = (text: string, ...keywords: string[]) =>
  keywords.some(k => text.includes(k.toLowerCase()));

const lab = (a: Anamnesis, key: string): number | undefined => {
  const v = a.laboratorio?.[key];
  return v !== undefined && v !== '' ? parseFloat(v) : undefined;
};

const sv = (a: Anamnesis) => a.sinais_vitais ?? {};

const temComorbidade = (a: Anamnesis, ...nomes: string[]) =>
  nomes.some(n => a.comorbidades?.some(c => c.toLowerCase().includes(n.toLowerCase())));

// ─── TIPOS INTERNOS ──────────────────────────────────────────

interface Criterio {
  descricao: string;
  check: (a: Anamnesis) => boolean;
  peso: number;
}

interface RedFlagRule {
  descricao: string;
  check: (a: Anamnesis) => boolean;
  urgente?: boolean;
}

interface ConditionRule {
  id: string;
  cid10: string;
  nome: string;
  peso_minimo_para_incluir: number;
  criterios: Criterio[];
  red_flags: RedFlagRule[];
  exames_confirmatorios: string[];
  exames_para_excluir_diferenciais: string[];
  diferenciais: string[];
  guideline: {
    diretriz: string;
    sociedade: string;
    ano: number;
    nivel_evidencia: 'A' | 'B' | 'C' | 'D';
    grau_recomendacao: 'I' | 'IIa' | 'IIb' | 'III';
    link?: string;
  };
  raciocinio_base: string;
}

// ─── BASE DE CONHECIMENTO ─────────────────────────────────────

const BASE_CLINICA: ConditionRule[] = [

  // ══════════════════════════════════════════════════════════
  // 1. HIPERTENSÃO ARTERIAL SISTÊMICA — I10
  // Referência: 7ª Diretriz Brasileira de Hipertensão — SBC 2020
  // ══════════════════════════════════════════════════════════
  {
    id: 'has',
    cid10: 'I10',
    nome: 'Hipertensão Arterial Sistêmica',
    peso_minimo_para_incluir: 6,
    criterios: [
      {
        descricao: 'PA sistólica ≥ 140 mmHg',
        check: a => (sv(a).pa_sistolica ?? 0) >= 140,
        peso: 10,
      },
      {
        descricao: 'PA diastólica ≥ 90 mmHg',
        check: a => (sv(a).pa_diastolica ?? 0) >= 90,
        peso: 10,
      },
      {
        descricao: 'Diagnóstico prévio de HAS',
        check: a => temComorbidade(a, 'Hipertensão'),
        peso: 10,
      },
      {
        descricao: 'Queixa relacionada a hipertensão ou cefaleia',
        check: a => has(txt(a.queixa_principal, a.hda), 'pressão', 'hipertensão', 'has ', 'cefaleia', 'tontura', 'palpitação'),
        peso: 4,
      },
      {
        descricao: 'IMC ≥ 30 kg/m² (obesidade)',
        check: a => (a.imc ?? 0) >= 30 || has(txt(a.hda), 'obesidade'),
        peso: 3,
      },
      {
        descricao: 'Sedentarismo',
        check: a => a.habitos_vida?.atividade_fisica === 'sedentario',
        peso: 2,
      },
      {
        descricao: 'Tabagismo ativo',
        check: a => a.habitos_vida?.tabagismo === 'sim',
        peso: 2,
      },
      {
        descricao: 'História familiar de HAS ou DCV precoce',
        check: a => has(txt(a.historia_familiar), 'hipertensão', 'infarto', 'avc', 'has', 'cardiovascular'),
        peso: 2,
      },
    ],
    red_flags: [
      {
        descricao: 'PA ≥ 180/110 mmHg — urgência/emergência hipertensiva',
        check: a => (sv(a).pa_sistolica ?? 0) >= 180 || (sv(a).pa_diastolica ?? 0) >= 110,
        urgente: true,
      },
      {
        descricao: 'Sintomas neurológicos com PA elevada — suspeitar AVC',
        check: a => (sv(a).pa_sistolica ?? 0) >= 160 && has(txt(a.queixa_principal, a.hda), 'neurológico', 'hemiplegia', 'afasia', 'visão dupla', 'desvio', 'fraqueza facial'),
        urgente: true,
      },
      {
        descricao: 'Dor precordial com PA elevada — suspeitar SCA',
        check: a => (sv(a).pa_sistolica ?? 0) >= 140 && has(txt(a.queixa_principal, a.hda), 'peito', 'precordial', 'opressão', 'angina'),
        urgente: false,
      },
    ],
    exames_confirmatorios: [
      'Eletrocardiograma de repouso (12 derivações)',
      'Ecocardiograma transtorácico',
      'Creatinina sérica + ureia',
      'Potássio sérico',
      'Sódio sérico',
      'Hemograma completo',
      'Glicemia de jejum',
      'Colesterol total e frações + TG',
      'Urina tipo I + microalbuminúria de 24h',
      'Fundo de olho bilateral',
    ],
    exames_para_excluir_diferenciais: [
      'TSH (excluir hipertireoidismo como causa secundária)',
      'Aldosterona plasmática e renina (excluir hiperaldosteronismo primário se K+ < 3,5)',
      'Metanefrinas urinárias (excluir feocromocitoma se crises paroxísticas)',
      'Cortisol livre urinário (excluir síndrome de Cushing se fácies/distribuição adiposa)',
    ],
    diferenciais: ['Hipertensão do avental branco', 'Hipertensão secundária (renal, endócrina)', 'Ansiedade com elevação pressórica episódica'],
    guideline: {
      diretriz: '7ª Diretriz Brasileira de Hipertensão Arterial',
      sociedade: 'Sociedade Brasileira de Cardiologia (SBC)',
      ano: 2020,
      nivel_evidencia: 'A',
      grau_recomendacao: 'I',
      link: 'http://publicacoes.cardiol.br/portal/abc/portugues/2021/v11601/pdf/11601027.pdf',
    },
    raciocinio_base:
      'Diagnóstico confirmado por PA ≥ 140/90 mmHg em duas ou mais aferições em ocasiões distintas, conforme 7ª Diretriz SBC 2020. A presença de fatores de risco cardiovascular associados (dislipidemia, DM, tabagismo, obesidade, HF) estratifica o risco e orienta a meta pressórica e a escolha do esquema anti-hipertensivo.',
  },

  // ══════════════════════════════════════════════════════════
  // 2. DIABETES MELLITUS TIPO 2 — E11
  // Referência: Diretriz da SBD 2023 + ADA 2024
  // ══════════════════════════════════════════════════════════
  {
    id: 'dm2',
    cid10: 'E11',
    nome: 'Diabetes Mellitus Tipo 2',
    peso_minimo_para_incluir: 5,
    criterios: [
      {
        descricao: 'Glicemia de jejum ≥ 126 mg/dL (critério diagnóstico)',
        check: a => (lab(a, 'glicemia') ?? 0) >= 126,
        peso: 10,
      },
      {
        descricao: 'HbA1c ≥ 6,5% (critério diagnóstico)',
        check: a => (lab(a, 'hba1c') ?? 0) >= 6.5,
        peso: 10,
      },
      {
        descricao: 'Diagnóstico prévio de DM2',
        check: a => temComorbidade(a, 'Diabetes'),
        peso: 10,
      },
      {
        descricao: 'Glicemia de jejum 100–125 mg/dL (pré-diabetes)',
        check: a => { const g = lab(a, 'glicemia'); return g !== undefined && g >= 100 && g < 126; },
        peso: 6,
      },
      {
        descricao: 'HbA1c 5,7–6,4% (pré-diabetes)',
        check: a => { const h = lab(a, 'hba1c'); return h !== undefined && h >= 5.7 && h < 6.5; },
        peso: 6,
      },
      {
        descricao: 'IMC ≥ 30 kg/m² (obesidade — fator de risco major)',
        check: a => (a.imc ?? 0) >= 30,
        peso: 4,
      },
      {
        descricao: 'História familiar de DM2 em parente de 1º grau',
        check: a => has(txt(a.historia_familiar), 'diabetes', 'dm ', 'dm2'),
        peso: 3,
      },
      {
        descricao: 'Sintomas clássicos: polidipsia, poliúria, polifagia, emagrecimento',
        check: a => has(txt(a.queixa_principal, a.hda), 'polidipsia', 'poliúria', 'sede excessiva', 'urinando muito', 'emagrecimento', 'perda de peso', 'visão turva', 'cansaço', 'fadiga'),
        peso: 4,
      },
      {
        descricao: 'Sedentarismo',
        check: a => a.habitos_vida?.atividade_fisica === 'sedentario',
        peso: 2,
      },
    ],
    red_flags: [
      {
        descricao: 'Glicemia > 300 mg/dL — risco de descompensação hiperosmolar ou cetoacidose',
        check: a => (lab(a, 'glicemia') ?? 0) > 300,
        urgente: true,
      },
      {
        descricao: 'Sintomas de cetoacidose (náusea, vômito, dor abdominal, hálito cetônico)',
        check: a => has(txt(a.queixa_principal, a.hda), 'cetoacidose', 'náusea', 'vômito', 'dor abdominal') && (lab(a, 'glicemia') ?? 0) > 250,
        urgente: true,
      },
    ],
    exames_confirmatorios: [
      'Glicemia de jejum (repetir em dia diferente para confirmar)',
      'HbA1c',
      'TOTG 75g (se glicemia limítrofe ou suspeita de pré-diabetes)',
      'Creatinina + ureia (avaliar função renal basal)',
      'Microalbuminúria de 24h (rastreio nefropatia)',
      'Perfil lipídico completo',
      'ECG de repouso',
      'Fundo de olho (rastreio retinopatia)',
      'Exame dos pés (neuropatia periférica)',
    ],
    exames_para_excluir_diferenciais: [
      'Peptídeo C e autoanticorpos anti-ilhota (GAD65) — excluir DM tipo 1 LADA',
      'Insulina de jejum (avaliar resistência insulínica)',
    ],
    diferenciais: ['Diabetes Mellitus Tipo 1 (LADA em adulto)', 'Pré-diabetes', 'Hiperglicemia de estresse', 'Diabetes secundário (corticoides, pancreatite)'],
    guideline: {
      diretriz: 'Diretrizes da Sociedade Brasileira de Diabetes 2023',
      sociedade: 'Sociedade Brasileira de Diabetes (SBD)',
      ano: 2023,
      nivel_evidencia: 'A',
      grau_recomendacao: 'I',
      link: 'https://diretrizessbd.com.br',
    },
    raciocinio_base:
      'Critério diagnóstico: glicemia jejum ≥ 126 mg/dL ou HbA1c ≥ 6,5% em 2 ocasiões, ou TOTG 75g com 2h ≥ 200 mg/dL (SBD 2023). Na vigência de sintomas clássicos, basta uma medição. O rastreio deve ser realizado em todos os adultos ≥ 45 anos ou com IMC ≥ 25 + fator de risco adicional.',
  },

  // ══════════════════════════════════════════════════════════
  // 3. DISLIPIDEMIA — E78
  // Referência: V Diretriz Brasileira de Dislipidemias — SBC 2017
  // ══════════════════════════════════════════════════════════
  {
    id: 'dislipidemia',
    cid10: 'E78',
    nome: 'Dislipidemia',
    peso_minimo_para_incluir: 5,
    criterios: [
      {
        descricao: 'LDL-c ≥ 130 mg/dL',
        check: a => (lab(a, 'ldl') ?? 0) >= 130,
        peso: 8,
      },
      {
        descricao: 'Colesterol total ≥ 200 mg/dL',
        check: a => (lab(a, 'col_total') ?? 0) >= 200,
        peso: 7,
      },
      {
        descricao: 'Triglicerídeos ≥ 150 mg/dL',
        check: a => (lab(a, 'tg') ?? 0) >= 150,
        peso: 6,
      },
      {
        descricao: 'HDL-c baixo (< 40 mg/dL H / < 50 mg/dL M)',
        check: a => (lab(a, 'hdl') ?? 99) < 40,
        peso: 6,
      },
      {
        descricao: 'Diagnóstico prévio de Dislipidemia',
        check: a => temComorbidade(a, 'Dislipidemia', 'colesterol', 'triglicérides'),
        peso: 10,
      },
      {
        descricao: 'Obesidade (IMC ≥ 30)',
        check: a => (a.imc ?? 0) >= 30,
        peso: 3,
      },
      {
        descricao: 'Tabagismo ativo',
        check: a => a.habitos_vida?.tabagismo === 'sim',
        peso: 2,
      },
      {
        descricao: 'História familiar de doença cardiovascular precoce ou dislipidemia familiar',
        check: a => has(txt(a.historia_familiar), 'colesterol', 'infarto', 'dislipidemia', 'coronária', 'cardiovascular'),
        peso: 3,
      },
    ],
    red_flags: [
      {
        descricao: 'TG > 500 mg/dL — risco de pancreatite aguda',
        check: a => (lab(a, 'tg') ?? 0) > 500,
        urgente: true,
      },
    ],
    exames_confirmatorios: [
      'Perfil lipídico completo em jejum (CT, LDL, HDL, VLDL, TG)',
      'Non-HDL colesterol (calculado: CT − HDL)',
      'Apo B (se TG > 400 ou em síndrome metabólica)',
      'Glicemia de jejum + HbA1c (excluir DM associado)',
      'TSH (excluir hipotireoidismo como causa secundária)',
      'TGO/TGP (avaliar hepatopatia antes de estatina)',
      'CK basal (antes de iniciar estatina)',
      'Creatinina',
    ],
    exames_para_excluir_diferenciais: [
      'Proteinúria (síndrome nefrótica causa dislipidemia secundária)',
      'TSH (hipotireoidismo é causa frequente de dislipidemia secundária)',
    ],
    diferenciais: ['Dislipidemia familiar (hipercolesterolemia familiar)', 'Dislipidemia secundária a hipotireoidismo, DM, hepatopatia, medicamentos', 'Síndrome metabólica'],
    guideline: {
      diretriz: 'V Diretriz Brasileira de Dislipidemias e Prevenção da Aterosclerose',
      sociedade: 'Sociedade Brasileira de Cardiologia (SBC)',
      ano: 2017,
      nivel_evidencia: 'A',
      grau_recomendacao: 'I',
      link: 'https://www.scielo.br/j/abc/a/DkVWwnJFhJD8pkRtnjyvmCz/',
    },
    raciocinio_base:
      'Diagnóstico laboratorial baseado na V Diretriz SBC 2017. Valores de referência para LDL dependem do risco cardiovascular global (Escore de Risco Global). A estratificação de risco define as metas terapêuticas e orienta a decisão entre mudança de estilo de vida isolada vs. farmacoterapia com estatina.',
  },

  // ══════════════════════════════════════════════════════════
  // 4. ASMA — J45
  // Referência: GINA 2024 + Diretrizes SBPT 2020
  // ══════════════════════════════════════════════════════════
  {
    id: 'asma',
    cid10: 'J45',
    nome: 'Asma Brônquica',
    peso_minimo_para_incluir: 6,
    criterios: [
      {
        descricao: 'Diagnóstico prévio de Asma',
        check: a => temComorbidade(a, 'Asma'),
        peso: 10,
      },
      {
        descricao: 'Sibilância / chiado no peito referidos',
        check: a => has(txt(a.queixa_principal, a.hda, a.exame_fisico), 'sibil', 'chiado', 'chieira', 'broncoespasmo', 'wheezing'),
        peso: 8,
      },
      {
        descricao: 'Dispneia episódica / paroxística',
        check: a => has(txt(a.queixa_principal, a.hda), 'dispneia', 'falta de ar', 'dificuldade respirar', 'crise'),
        peso: 5,
      },
      {
        descricao: 'Tosse seca ou produtiva, piora noturna ou ao exercício',
        check: a => has(txt(a.queixa_principal, a.hda), 'tosse noturna', 'tosse ao exercício', 'piora à noite', 'tosse seca'),
        peso: 5,
      },
      {
        descricao: 'SpO2 reduzida < 95%',
        check: a => (sv(a).spo2 ?? 100) < 95,
        peso: 4,
      },
      {
        descricao: 'Atopia: rinite alérgica, dermatite atópica, eczema',
        check: a => has(txt(a.queixa_principal, a.hda, a.hpp), 'rinite', 'alérgica', 'atopia', 'eczema', 'dermatite', 'alergia'),
        peso: 3,
      },
      {
        descricao: 'Tabagismo (fator de risco / agravante)',
        check: a => a.habitos_vida?.tabagismo === 'sim',
        peso: 2,
      },
    ],
    red_flags: [
      {
        descricao: 'SpO2 < 90% — risco de insuficiência respiratória',
        check: a => (sv(a).spo2 ?? 100) < 90,
        urgente: true,
      },
      {
        descricao: 'FR > 25 irpm — crise asmática grave',
        check: a => (sv(a).fr ?? 0) > 25,
        urgente: true,
      },
      {
        descricao: 'Uso da musculatura acessória ou tiragem descrita',
        check: a => has(txt(a.exame_fisico, a.hda), 'musculatura acessória', 'tiragem', 'retração'),
        urgente: true,
      },
    ],
    exames_confirmatorios: [
      'Espirometria com prova broncodilatadora (reversibilidade ≥ 12% e ≥ 200 mL no VEF1)',
      'Peak flow (PFE) — variação diurna > 10% em 2 semanas',
      'Radiografia de tórax PA + perfil (excluir complicações)',
      'Teste de provocação brônquica (se espirometria normal e suspeita clínica alta)',
    ],
    exames_para_excluir_diferenciais: [
      'Espirometria com padrão obstrutivo não reversível (considerar DPOC)',
      'TCAR de tórax (se suspeita de DPOC, bronquiectasias, neoplasia)',
      'BNP ou NT-proBNP (excluir ICC como causa de dispneia)',
    ],
    diferenciais: ['DPOC', 'Insuficiência cardíaca congestiva (dispneia cardíaca)', 'Corpo estranho (pediátrico)', 'Bronquiectasias', 'Síndrome de hiperventilação'],
    guideline: {
      diretriz: 'Global Initiative for Asthma (GINA) — Report 2024',
      sociedade: 'GINA / Sociedade Brasileira de Pneumologia e Tisiologia (SBPT)',
      ano: 2024,
      nivel_evidencia: 'A',
      grau_recomendacao: 'I',
      link: 'https://ginasthma.org/2024-gina-report-global-strategy-for-asthma-management-and-prevention/',
    },
    raciocinio_base:
      'Diagnóstico clínico baseado em história de sintomas respiratórios variáveis (sibilância, dispneia, tosse) e confirmação por espirometria com reversibilidade pós-broncodilatador ≥ 12% e ≥ 200 mL no VEF1 (GINA 2024). Excluir DPOC (ausência de reversibilidade completa) e ICC.',
  },

  // ══════════════════════════════════════════════════════════
  // 5. DPOC — J44
  // Referência: GOLD 2024 + Diretrizes SBPT
  // ══════════════════════════════════════════════════════════
  {
    id: 'dpoc',
    cid10: 'J44',
    nome: 'Doença Pulmonar Obstrutiva Crônica (DPOC)',
    peso_minimo_para_incluir: 6,
    criterios: [
      {
        descricao: 'Diagnóstico prévio de DPOC',
        check: a => temComorbidade(a, 'DPOC'),
        peso: 10,
      },
      {
        descricao: 'Tabagismo ativo (principal fator de risco)',
        check: a => a.habitos_vida?.tabagismo === 'sim',
        peso: 8,
      },
      {
        descricao: 'Ex-tabagista (> 10 maços-ano é fator de risco significativo)',
        check: a => a.habitos_vida?.tabagismo === 'ex' || has(txt(a.hpp), 'tabagismo', 'fumante', 'ex-fumante', 'cigarro'),
        peso: 6,
      },
      {
        descricao: 'Dispneia progressiva / aos esforços',
        check: a => has(txt(a.queixa_principal, a.hda), 'dispneia', 'falta de ar', 'cansaço ao esforço', 'limitação ao exercício'),
        peso: 6,
      },
      {
        descricao: 'Tosse crônica produtiva / expectoração matinal',
        check: a => has(txt(a.queixa_principal, a.hda), 'tosse crônica', 'expectoração', 'escarro', 'catarro', 'bronquite'),
        peso: 5,
      },
      {
        descricao: 'Sibilância / hiperinsuflação ao exame físico',
        check: a => has(txt(a.exame_fisico, a.hda), 'hiperinsuflação', 'enfisema', 'murmúrio diminuído', 'sibil', 'chiado'),
        peso: 4,
      },
      {
        descricao: 'SpO2 reduzida < 95%',
        check: a => (sv(a).spo2 ?? 100) < 95,
        peso: 3,
      },
    ],
    red_flags: [
      {
        descricao: 'SpO2 < 88% — hipoxemia grave, avaliar suporte ventilatório',
        check: a => (sv(a).spo2 ?? 100) < 88,
        urgente: true,
      },
      {
        descricao: 'Exacerbação grave: FR > 25, uso de musculatura acessória, confusão mental',
        check: a => (sv(a).fr ?? 0) > 25 || (sv(a).glasgow ?? 15) < 13 || has(txt(a.exame_fisico, a.hda), 'confusão', 'sonolência', 'tiragem', 'musculatura acessória'),
        urgente: true,
      },
    ],
    exames_confirmatorios: [
      'Espirometria com prova broncodilatadora (VEF1/CVF < 0,70 pós-BD confirma obstrução irreversível)',
      'Gasometria arterial (se SpO2 < 92% ou suspeita de hipercapnia)',
      'Radiografia de tórax PA + perfil',
      'TCAR de tórax (caracterizar enfisema, bronquiectasias)',
      'Hemograma (policitemia, anemia)',
    ],
    exames_para_excluir_diferenciais: [
      'Espirometria com prova broncodilatadora positiva (considerar asma ou sobreposição asma-DPOC)',
      'BNP/NT-proBNP (excluir ICC)',
    ],
    diferenciais: ['Asma (considerar ACOS — sobreposição)', 'Insuficiência cardíaca congestiva', 'Bronquiectasias', 'Tuberculose pulmonar'],
    guideline: {
      diretriz: 'Global Initiative for Chronic Obstructive Lung Disease (GOLD) 2024',
      sociedade: 'GOLD / Sociedade Brasileira de Pneumologia e Tisiologia (SBPT)',
      ano: 2024,
      nivel_evidencia: 'A',
      grau_recomendacao: 'I',
      link: 'https://goldcopd.org/2024-gold-report/',
    },
    raciocinio_base:
      'Diagnóstico baseado em espirometria pós-broncodilatador com VEF1/CVF < 0,70, na presença de fatores de risco (tabagismo, exposição a fumaça de biomassa) e quadro clínico compatível (GOLD 2024). A estadiamento GOLD (I–IV) pelo VEF1% previsto orienta intensidade do tratamento.',
  },

  // ══════════════════════════════════════════════════════════
  // 6. INSUFICIÊNCIA CARDÍACA — I50
  // Referência: II Diretriz Brasileira de IC — SBC 2023
  // ══════════════════════════════════════════════════════════
  {
    id: 'icc',
    cid10: 'I50',
    nome: 'Insuficiência Cardíaca',
    peso_minimo_para_incluir: 6,
    criterios: [
      {
        descricao: 'Diagnóstico prévio de ICC / disfunção ventricular',
        check: a => temComorbidade(a, 'Insuficiência Cardíaca', 'ICC', 'disfunção'),
        peso: 10,
      },
      {
        descricao: 'Dispneia aos esforços progressiva',
        check: a => has(txt(a.queixa_principal, a.hda), 'dispneia', 'falta de ar', 'cansaço'),
        peso: 5,
      },
      {
        descricao: 'Ortopneia (dispneia em decúbito)',
        check: a => has(txt(a.hda, a.exame_fisico), 'ortopneia', 'dormir sentado', 'travesseiro', 'decúbito'),
        peso: 8,
      },
      {
        descricao: 'Dispneia paroxística noturna',
        check: a => has(txt(a.hda), 'noturna', 'acorda com falta de ar', 'dispneia noturna', 'paroxística'),
        peso: 8,
      },
      {
        descricao: 'Edema de membros inferiores bilateral',
        check: a => has(txt(a.queixa_principal, a.hda, a.exame_fisico), 'edema', 'inchaço', 'tornozelo', 'perna inchada'),
        peso: 6,
      },
      {
        descricao: 'Crepitações pulmonares bilaterais ao exame físico',
        check: a => has(txt(a.exame_fisico), 'crepitação', 'estertores', 'crepitante', 'congestionamento pulmonar'),
        peso: 7,
      },
      {
        descricao: 'Cardiopatia estrutural prévia (HAS, DAC, valvopatia)',
        check: a => temComorbidade(a, 'Hipertensão', 'Coronariana', 'Infarto', 'valvulopatia', 'cardiopatia') ||
          has(txt(a.hpp), 'infarto', 'angina', 'stent', 'revascularização', 'valvulopatia'),
        peso: 5,
      },
      {
        descricao: 'SpO2 < 95%',
        check: a => (sv(a).spo2 ?? 100) < 95,
        peso: 4,
      },
    ],
    red_flags: [
      {
        descricao: 'SpO2 < 90% — descompensação grave',
        check: a => (sv(a).spo2 ?? 100) < 90,
        urgente: true,
      },
      {
        descricao: 'Edema agudo de pulmão (EAP) — ortopneia intensa + crepitações + SpO2 < 90%',
        check: a =>
          (sv(a).spo2 ?? 100) < 90 &&
          has(txt(a.hda, a.exame_fisico), 'ortopneia', 'crepitação', 'estertores') &&
          has(txt(a.queixa_principal, a.hda), 'falta de ar'),
        urgente: true,
      },
    ],
    exames_confirmatorios: [
      'BNP ou NT-proBNP (BNP > 100 pg/mL ou NT-proBNP > 300 pg/mL sugestivos)',
      'Ecocardiograma transtorácico (avaliar FEVE, pressões de enchimento)',
      'ECG de repouso (12 derivações)',
      'Radiografia de tórax (cardiomegalia, congestão pulmonar)',
      'Hemograma, ureia, creatinina, eletrólitos',
      'TGO/TGP (congestão hepática)',
      'Troponina (excluir SCA como causa)',
    ],
    exames_para_excluir_diferenciais: [
      'D-dímero / angioTC pulmonar (excluir TEP como causa de dispneia)',
      'Espirometria (excluir DPOC/asma)',
    ],
    diferenciais: ['Síndrome coronariana aguda', 'DPOC exacerbado', 'TEP', 'Pneumonia', 'Hipertensão pulmonar'],
    guideline: {
      diretriz: 'II Diretriz Brasileira de Insuficiência Cardíaca',
      sociedade: 'Sociedade Brasileira de Cardiologia (SBC)',
      ano: 2023,
      nivel_evidencia: 'A',
      grau_recomendacao: 'I',
      link: 'https://www.scielo.br/j/abc/a/ZHHbFGwNdmBFkGv98MkqHzm/',
    },
    raciocinio_base:
      'Diagnóstico clínico baseado nos Critérios de Framingham (≥ 2 maiores ou 1 maior + 2 menores). BNP/NT-proBNP elevados confirmam a etiologia cardíaca da dispneia. Ecocardiograma é obrigatório para classificar FE preservada (≥ 50%), intermediária (40–49%) ou reduzida (< 40%) e orientar tratamento.',
  },

  // ══════════════════════════════════════════════════════════
  // 7. SÍNDROME CORONARIANA AGUDA — I21/I20
  // Referência: Diretriz SBC de SCA sem Supra 2021
  // ══════════════════════════════════════════════════════════
  {
    id: 'sca',
    cid10: 'I20',
    nome: 'Síndrome Coronariana Aguda (suspeita)',
    peso_minimo_para_incluir: 8,
    criterios: [
      {
        descricao: 'Dor precordial ou desconforto torácico',
        check: a => has(txt(a.queixa_principal, a.hda), 'peito', 'precordial', 'torácico', 'tórax', 'angina', 'opressão', 'aperto no peito', 'dor no peito'),
        peso: 10,
      },
      {
        descricao: 'Irradiação para braço esquerdo, pescoço ou mandíbula',
        check: a => has(txt(a.hda), 'irradiação', 'braço', 'pescoço', 'mandíbula', 'ombro', 'irradiar'),
        peso: 8,
      },
      {
        descricao: 'Sudorese, náusea ou vômito associados',
        check: a => has(txt(a.hda), 'sudorese', 'suor frio', 'náusea', 'vômito', 'mal-estar'),
        peso: 6,
      },
      {
        descricao: 'História de DAC / angina prévia / stent / revascularização',
        check: a => temComorbidade(a, 'Coronariana', 'DAC') || has(txt(a.hpp), 'infarto', 'stent', 'revascularização', 'angina', 'coronário'),
        peso: 8,
      },
      {
        descricao: 'Múltiplos fatores de risco cardiovascular (HAS, DM, tabagismo, dislipidemia)',
        check: a => [
          temComorbidade(a, 'Hipertensão'),
          temComorbidade(a, 'Diabetes'),
          a.habitos_vida?.tabagismo === 'sim',
          temComorbidade(a, 'Dislipidemia'),
        ].filter(Boolean).length >= 2,
        peso: 5,
      },
      {
        descricao: 'PA alterada (muito elevada ou hipotensão)',
        check: a => (sv(a).pa_sistolica ?? 120) > 180 || (sv(a).pa_sistolica ?? 120) < 90,
        peso: 4,
      },
    ],
    red_flags: [
      {
        descricao: '⚠ RED FLAG: Dor precordial com irradiação + diaforese — descartar IAM imediatamente',
        check: a =>
          has(txt(a.queixa_principal, a.hda), 'peito', 'precordial', 'opressão') &&
          has(txt(a.hda), 'suor', 'sudorese'),
        urgente: true,
      },
      {
        descricao: 'Hipotensão (PAS < 90) com dor torácica — choque cardiogênico',
        check: a => (sv(a).pa_sistolica ?? 120) < 90 && has(txt(a.queixa_principal, a.hda), 'peito', 'dor'),
        urgente: true,
      },
      {
        descricao: 'FC > 100 bpm com dor torácica — instabilidade hemodinâmica',
        check: a => (sv(a).fc ?? 0) > 100 && has(txt(a.queixa_principal, a.hda), 'peito', 'dor'),
        urgente: true,
      },
    ],
    exames_confirmatorios: [
      'ECG de 12 derivações IMEDIATAMENTE (repetir em 15-30 min se negativo)',
      'Troponina I ou T de alta sensibilidade (0h e 1h ou 0h e 3h)',
      'CK-MB massa',
      'Hemograma + coagulograma',
      'Creatinina, ureia, eletrólitos',
      'Glicemia',
      'Rx tórax PA',
      'Ecocardiograma (se disponível — avaliar segmentos)',
    ],
    exames_para_excluir_diferenciais: [
      'D-dímero (excluir TEP se dor pleurítica + dispneia)',
      'Amilase/lipase (excluir pancreatite aguda)',
      'Endoscopia (excluir úlcera/esofagite se dispepsia)',
    ],
    diferenciais: ['IAM com supra de ST (STEMI)', 'IAM sem supra (NSTEMI)', 'Angina instável', 'TEP', 'Dissecção de aorta', 'Pericardite', 'Esofagite/doença do refluxo'],
    guideline: {
      diretriz: 'Diretriz Brasileira de SCA sem Supradesnivelamento de ST',
      sociedade: 'Sociedade Brasileira de Cardiologia (SBC)',
      ano: 2021,
      nivel_evidencia: 'A',
      grau_recomendacao: 'I',
      link: 'https://www.scielo.br/j/abc/a/N7C3DWMxJfHn9r7fVKGRnBF/',
    },
    raciocinio_base:
      'Avaliação pelo Escore HEART (History, ECG, Age, Risk factors, Troponin). Qualquer suspeita de SCA requer ECG imediato e troponina de alta sensibilidade. SCA é diagnóstico de exclusão ativa — não esperar confirmação para iniciar protocolo.',
  },

  // ══════════════════════════════════════════════════════════
  // 8. HIPOTIREOIDISMO — E03
  // Referência: Consenso Brasileiro de Tireoide SBE/CBE 2023
  // ══════════════════════════════════════════════════════════
  {
    id: 'hipotireoidismo',
    cid10: 'E03',
    nome: 'Hipotireoidismo',
    peso_minimo_para_incluir: 5,
    criterios: [
      {
        descricao: 'TSH elevado (> 4,5 mUI/L)',
        check: a => (lab(a, 'tsh') ?? 0) > 4.5,
        peso: 10,
      },
      {
        descricao: 'T4 livre baixo (< 0,7 ng/dL)',
        check: a => { const t = lab(a, 't4l'); return t !== undefined && t < 0.7; },
        peso: 10,
      },
      {
        descricao: 'Diagnóstico prévio de hipotireoidismo',
        check: a => temComorbidade(a, 'Hipotireoidismo'),
        peso: 10,
      },
      {
        descricao: 'Sintomas: fadiga, ganho de peso, intolerância ao frio, constipação',
        check: a => has(txt(a.queixa_principal, a.hda), 'fadiga', 'cansaço', 'ganho de peso', 'frio', 'constipação', 'prisão de ventre', 'lentidão'),
        peso: 5,
      },
      {
        descricao: 'Sexo feminino (maior prevalência)',
        check: a => has(txt(a.queixa_principal, a.hda), 'ciclo menstrual', 'irregularidade menstrual') ||
          (a.gestante === false && has(txt(a.hda), 'mulher', 'feminino')),
        peso: 2,
      },
      {
        descricao: 'Sinais: mixedema, bradicardia, reflexos lentos, pele seca',
        check: a => has(txt(a.exame_fisico), 'mixedema', 'bradicardia', 'pele seca', 'edema periorbitário', 'reflexo') ||
          (sv(a).fc ?? 70) < 60,
        peso: 6,
      },
      {
        descricao: 'Dislipidemia associada (hipotireoidismo causa secundária)',
        check: a => (lab(a, 'col_total') ?? 0) > 200 || (lab(a, 'ldl') ?? 0) > 130,
        peso: 3,
      },
    ],
    red_flags: [
      {
        descricao: 'Coma mixedematoso — hipotermia + bradicardia + alteração do nível de consciência',
        check: a => (sv(a).glasgow ?? 15) < 13 && (sv(a).fc ?? 70) < 50,
        urgente: true,
      },
    ],
    exames_confirmatorios: [
      'TSH (sensível)',
      'T4 livre',
      'Anti-TPO (anticorpos antiperoxidase — confirmar Hashimoto)',
      'Anti-Tg (anticorpos antitireoglobulina)',
      'Perfil lipídico (dislipidemia secundária)',
      'Hemograma (anemia normocítica)',
      'Glicemia',
      'Ultrassonografia de tireoide (avaliar volume, nódulos)',
    ],
    exames_para_excluir_diferenciais: [],
    diferenciais: ['Hipotireoidismo subclínico (TSH elevado com T4L normal)', 'Depressão maior', 'Anemia', 'Insuficiência adrenal', 'Síndrome da doença não tireoidiana'],
    guideline: {
      diretriz: 'Consenso Brasileiro de Hipotireoidismo',
      sociedade: 'Sociedade Brasileira de Endocrinologia e Metabologia (SBEM)',
      ano: 2023,
      nivel_evidencia: 'B',
      grau_recomendacao: 'I',
      link: 'https://www.endocrino.org.br/diretrizes/',
    },
    raciocinio_base:
      'Diagnóstico laboratorial: TSH > 4,5 mUI/L confirma hipotireoidismo primário; se T4L normal, é subclínico. Anticorpos anti-TPO positivos confirmam etiologia autoimune (Hashimoto). Rastreio indicado em mulheres > 35 anos a cada 5 anos ou sintomáticas.',
  },

  // ══════════════════════════════════════════════════════════
  // 9. FARINGOAMIGDALITE BACTERIANA — J02 / J03
  // Referência: Escore de Centor modificado (McIsaac) — IDSA 2012
  // ══════════════════════════════════════════════════════════
  {
    id: 'faringoamigdalite',
    cid10: 'J03',
    nome: 'Faringoamigdalite Bacteriana (suspeita)',
    peso_minimo_para_incluir: 5,
    criterios: [
      {
        descricao: 'Dor de garganta como queixa principal',
        check: a => has(txt(a.queixa_principal, a.hda), 'garganta', 'amigdal', 'disfagia', 'odinofagia', 'engolir'),
        peso: 6,
      },
      {
        descricao: 'Febre ≥ 38°C (critério de Centor)',
        check: a => (sv(a).temperatura ?? 36) >= 38,
        peso: 5,
      },
      {
        descricao: 'Exsudato ou enantema amigdaliano ao exame físico',
        check: a => has(txt(a.exame_fisico), 'exsudato', 'pus', 'hiperemia amigdal', 'placas', 'enantema', 'amígdala'),
        peso: 5,
      },
      {
        descricao: 'Adenomegalia cervical anterior dolorosa',
        check: a => has(txt(a.exame_fisico), 'adenomegalia', 'linfonodo', 'gânglio', 'íngua no pescoço'),
        peso: 5,
      },
      {
        descricao: 'Ausência de tosse (critério de Centor — aumenta probabilidade bacteriana)',
        check: a => !has(txt(a.queixa_principal, a.hda), 'tosse'),
        peso: 3,
      },
      {
        descricao: 'Ausência de sintomas virais (coriza, conjuntivite, úlceras orais)',
        check: a => !has(txt(a.queixa_principal, a.hda), 'coriza', 'conjuntivite', 'úlcera', 'afta', 'herpes'),
        peso: 3,
      },
    ],
    red_flags: [
      {
        descricao: 'Suspeita de abscesso periamigdaliano — desconforto unilateral + voz abafada + trismo',
        check: a => has(txt(a.exame_fisico, a.hda), 'abscesso', 'voz abafada', 'trismo', 'uvular desviada', 'unilateral'),
        urgente: true,
      },
      {
        descricao: 'Stridor + disfagia intensa — suspeitar epiglotite (emergência)',
        check: a => has(txt(a.queixa_principal, a.hda, a.exame_fisico), 'stridor', 'epiglotite', 'posição trípode'),
        urgente: true,
      },
    ],
    exames_confirmatorios: [
      'Teste rápido para Streptococcus do grupo A (RADT) — sensibilidade > 90%',
      'Cultura de orofaringe com antibiograma (se RADT negativo e suspeita alta)',
      'Hemograma (leucocitose > 12.000 com neutrofilia favorece bacteriana)',
      'Sorologia para mononucleose (EBV) — se linfadenopatia generalizada ou esplenomegalia',
    ],
    exames_para_excluir_diferenciais: [
      'Sorologia EBV (excluir mononucleose infecciosa antes de prescrever amoxicilina)',
    ],
    diferenciais: ['Faringoamigdalite viral (principal)', 'Mononucleose infecciosa (EBV)', 'Angina de Vincent (anaerobiose)', 'Candidíase orofaríngea', 'Epiglotite'],
    guideline: {
      diretriz: 'IDSA Clinical Practice Guideline for Pharyngitis — Escore McIsaac',
      sociedade: 'Infectious Diseases Society of America (IDSA) / SBI',
      ano: 2012,
      nivel_evidencia: 'B',
      grau_recomendacao: 'I',
      link: 'https://academic.oup.com/cid/article/55/10/e86/321726',
    },
    raciocinio_base:
      'Escore de Centor modificado (McIsaac): febre, exsudato amigdaliano, adenomegalia cervical dolorosa e ausência de tosse (1 ponto cada). Escore ≥ 3: tratar empiricamente ou realizar RADT. Escore < 2: etiologia viral provável — não prescrever antibiótico. Amoxicilina 500 mg 8/8h 10 dias para S. pyogenes confirmado.',
  },

  // ══════════════════════════════════════════════════════════
  // 10. PNEUMONIA ADQUIRIDA NA COMUNIDADE — J18
  // Referência: Diretriz SBPT/AMIB PAC 2022 + CURB-65
  // ══════════════════════════════════════════════════════════
  {
    id: 'pac',
    cid10: 'J18',
    nome: 'Pneumonia Adquirida na Comunidade (PAC)',
    peso_minimo_para_incluir: 6,
    criterios: [
      {
        descricao: 'Tosse com expectoração purulenta ou hemoptoica',
        check: a => has(txt(a.queixa_principal, a.hda), 'tosse', 'expectoração', 'escarro', 'hemoptise', 'sangue na tosse'),
        peso: 5,
      },
      {
        descricao: 'Febre ≥ 38°C',
        check: a => (sv(a).temperatura ?? 36) >= 38,
        peso: 7,
      },
      {
        descricao: 'Dispneia e/ou taquipneia (FR ≥ 22 irpm)',
        check: a => (sv(a).fr ?? 0) >= 22 || has(txt(a.queixa_principal, a.hda), 'dispneia', 'falta de ar'),
        peso: 6,
      },
      {
        descricao: 'Crepitações / macicez / broncofonia ao exame físico',
        check: a => has(txt(a.exame_fisico), 'crepitação', 'macicez', 'broncofonia', 'egofonia', 'condensação', 'sopro tubário'),
        peso: 8,
      },
      {
        descricao: 'SpO2 < 95%',
        check: a => (sv(a).spo2 ?? 100) < 95,
        peso: 5,
      },
      {
        descricao: 'Leucocitose > 12.000/mm³',
        check: a => (lab(a, 'leuco') ?? 0) > 12,
        peso: 5,
      },
      {
        descricao: 'PCR elevada (> 10 mg/L)',
        check: a => (lab(a, 'pcr') ?? 0) > 10,
        peso: 4,
      },
      {
        descricao: 'Dor pleurítica (piora com inspiração)',
        check: a => has(txt(a.hda), 'pleurítica', 'piora ao respirar', 'dor ao inspirar', 'dor lateral'),
        peso: 4,
      },
    ],
    red_flags: [
      {
        descricao: 'SpO2 < 90% — hipoxemia grave, avaliar internação + suporte O2',
        check: a => (sv(a).spo2 ?? 100) < 90,
        urgente: true,
      },
      {
        descricao: 'CURB-65 ≥ 3 — mortalidade elevada, avaliar internação em UTI',
        check: a =>
          [(sv(a).fr ?? 0) >= 30,
           (sv(a).pa_sistolica ?? 120) < 90 || (sv(a).pa_diastolica ?? 80) <= 60,
           has(txt(a.hda, a.exame_fisico), 'confusão', 'desorientação')].filter(Boolean).length >= 2,
        urgente: true,
      },
      {
        descricao: 'Derrame pleural + febre alta — suspeitar empiema',
        check: a => has(txt(a.exame_fisico, a.imagem), 'derrame', 'empiema', 'pleural'),
        urgente: false,
      },
    ],
    exames_confirmatorios: [
      'Radiografia de tórax PA + perfil (infiltrado novo = critério diagnóstico)',
      'Hemograma completo + diferencial',
      'PCR e/ou procalcitonina',
      'Hemoculturas × 2 (antes de antibiótico, se hospitalizar)',
      'Creatinina, ureia (CURB-65 e adequação de dose)',
      'Gasometria arterial (se SpO2 < 92%)',
      'Antígenos urinários para Legionella e Pneumococo (PAC grave)',
    ],
    exames_para_excluir_diferenciais: [
      'TCAR de tórax (se Rx duvidoso ou não melhora com tratamento)',
      'D-dímero / angioTC pulmonar (excluir TEP se dor pleurítica proeminente)',
      'BNP (excluir ICC)',
    ],
    diferenciais: ['DPOC exacerbado', 'ICC descompensada', 'TEP com infarto pulmonar', 'Tuberculose pulmonar', 'Neoplasia pulmonar com pneumonia obstrutiva'],
    guideline: {
      diretriz: 'Diretrizes Brasileiras para Pneumonia Adquirida na Comunidade (PAC) em Adultos Imunocompetentes',
      sociedade: 'Sociedade Brasileira de Pneumologia e Tisiologia (SBPT) / AMIB',
      ano: 2022,
      nivel_evidencia: 'A',
      grau_recomendacao: 'I',
      link: 'https://www.scielo.br/j/jbpneu/a/YxWDfzSLbZ6VbdsmKnpF4cJ/',
    },
    raciocinio_base:
      'Diagnóstico clínico-radiológico: tosse + febre + dispneia + síndrome de condensação + infiltrado radiológico novo. CURB-65 (Confusão, Ureia > 7, FR ≥ 30, PAS < 90 ou PAD ≤ 60, idade ≥ 65) estratifica gravidade: 0-1 ambulatorial, 2 considerar internação, ≥ 3 internação ± UTI.',
  },

];

// ─── MOTOR DE DECISÃO ─────────────────────────────────────────

function scoreCondition(rule: ConditionRule, a: Anamnesis): {
  score: number;
  maxScore: number;
  positivos: string[];
  negativos: string[];
} {
  let score = 0;
  const maxScore = rule.criterios.reduce((s, c) => s + c.peso, 0);
  const positivos: string[] = [];
  const negativos: string[] = [];

  for (const criterio of rule.criterios) {
    if (criterio.check(a)) {
      score += criterio.peso;
      positivos.push(criterio.descricao);
    } else {
      negativos.push(criterio.descricao);
    }
  }

  return { score, maxScore, positivos, negativos };
}

function getRedFlags(rule: ConditionRule, a: Anamnesis): { descricao: string; urgente: boolean }[] {
  return rule.red_flags
    .filter(rf => rf.check(a))
    .map(rf => ({ descricao: rf.descricao, urgente: rf.urgente ?? false }));
}

function getExamesFaltantes(rule: ConditionRule, a: Anamnesis): string[] {
  // Exames que ainda não foram realizados e são confirmatórios
  const realizados = txt(
    Object.keys(a.laboratorio ?? {}).join(' '),
    a.imagem,
  );

  return rule.exames_confirmatorios.filter(ex => {
    const key = ex.toLowerCase().replace(/[^a-záéíóú0-9]/g, '');
    return !has(realizados, key.slice(0, 8));
  });
}

function gradesFromScore(pct: number): DiagnosticHypothesis['probabilidade'] {
  if (pct >= 60) return 'alta';
  if (pct >= 35) return 'media';
  return 'baixa';
}

// ─── FUNÇÃO PRINCIPAL ─────────────────────────────────────────

export function analyzeClinical(anamnesis: Anamnesis): DiagnosticSupport {
  const resultados: DiagnosticHypothesis[] = [];
  const allRedFlags: string[] = [];
  let encaminhamentoUrgente = false;

  for (const rule of BASE_CLINICA) {
    const { score, maxScore, positivos, negativos } = scoreCondition(rule, anamnesis);

    if (score < rule.peso_minimo_para_incluir) continue;

    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const flags = getRedFlags(rule, anamnesis);
    const examesFaltantes = getExamesFaltantes(rule, anamnesis);

    if (flags.some(f => f.urgente)) {
      encaminhamentoUrgente = true;
    }

    flags.forEach(f => {
      if (!allRedFlags.includes(f.descricao)) {
        allRedFlags.push(f.descricao);
      }
    });

    resultados.push({
      id: rule.id,
      cid10: rule.cid10,
      nome: rule.nome,
      probabilidade: gradesFromScore(pct),
      grau_confianca: pct,
      criterios_favoraveis: positivos,
      criterios_desfavoraveis: negativos.slice(0, 4), // limit to 4 most relevant
      exames_sugeridos: rule.exames_confirmatorios,
      exames_faltantes: examesFaltantes,
      diferenciais: rule.diferenciais,
      raciocinio_clinico: rule.raciocinio_base,
      guideline: rule.guideline,
    });
  }

  // Ordenar: urgentes primeiro, depois por grau de confiança
  resultados.sort((a, b) => {
    const aUrgente = allRedFlags.some(rf => BASE_CLINICA.find(r => r.id === a.id)?.red_flags.some(rf2 => rf2.urgente && rf.includes(rf2.descricao.slice(0, 20)))) ? 1 : 0;
    const bUrgente = allRedFlags.some(rf => BASE_CLINICA.find(r => r.id === b.id)?.red_flags.some(rf2 => rf2.urgente && rf.includes(rf2.descricao.slice(0, 20)))) ? 1 : 0;
    if (bUrgente !== aUrgente) return bUrgente - aUrgente;
    return (b.grau_confianca ?? 0) - (a.grau_confianca ?? 0);
  });

  // Síntese clínica baseada nos dados disponíveis
  const hipPrincipal = resultados[0];
  let sintese = 'Análise baseada nos dados clínicos informados.';
  if (resultados.length === 0) {
    sintese = 'Dados clínicos insuficientes para sugestão de hipóteses. Preencha sinais vitais, queixa principal e exames disponíveis para uma análise mais precisa.';
  } else if (hipPrincipal) {
    const n = resultados.length;
    sintese = `Foram identificadas ${n} hipótese${n > 1 ? 's' : ''} compatível${n > 1 ? 'is' : ''} com os dados clínicos informados. ` +
      `Hipótese principal: ${hipPrincipal.nome} (confiança ${hipPrincipal.grau_confianca}%). ` +
      (encaminhamentoUrgente ? 'Existem RED FLAGS que requerem avaliação imediata. ' : '') +
      'O diagnóstico final é de responsabilidade exclusiva do médico.';
  }

  // Exames prioritários (união dos exames críticos das top 3 hipóteses)
  const examesPrioritarios = Array.from(new Set(
    resultados.slice(0, 3).flatMap(h => (h.exames_faltantes ?? []).slice(0, 3))
  )).slice(0, 8);

  return {
    hipoteses: resultados,
    sintese_clinica: sintese,
    red_flags: allRedFlags,
    encaminhamento_urgente: encaminhamentoUrgente,
  };
}

export const CDS_VERSION = '1.0.0';
export const CDS_BASE_CONHECIMENTO = `${BASE_CLINICA.length} condições | Diretrizes SBC, SBD, SBEM, SBPT, GINA, GOLD, IDSA`;
