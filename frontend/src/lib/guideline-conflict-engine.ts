// ============================================================
// PRESCREVE-AI — Guideline Conflict Engine (CAMADA 3)
// Detecta divergências entre as 10 principais diretrizes
// SBC · ESC · AHA · ACC · ADA · KDIGO · GOLD · GINA · APA · CANMAT
// ============================================================

'use client';

export type GrauConflito = 'concordancia' | 'divergencia_leve' | 'divergencia_moderada' | 'conflito_direto';

export interface PosicaoDiretriz {
  sigla: string;
  sociedade: string;
  ano: number;
  posicao: string;
  nivel: 'A' | 'B' | 'C';
  grau: 'I' | 'IIa' | 'IIb' | 'III';
}

export interface ConflitoGuideline {
  id: string;
  topico: string;
  diagnostico_id: string;
  classe_terapeutica?: string;
  molecula?: string;
  grau_conflito: GrauConflito;
  resumo: string;
  diretrizes: PosicaoDiretriz[];
  guideline_preferida: string;         // sigla da diretriz preferida para BR
  justificativa_preferencia: string;
  impacto_clinico: string;
  recomendacao_pratica: string;
}

// ──────────────────────────────────────────────────────────────
// Banco de conflitos entre diretrizes
// ──────────────────────────────────────────────────────────────

export const CONFLITOS_DIRETRIZES: ConflitoGuideline[] = [

  // ── HAS ───────────────────────────────────────────────────

  {
    id: 'has-meta-pas',
    topico: 'Meta pressórica: PAS alvo em adultos sem DM2',
    diagnostico_id: 'has',
    grau_conflito: 'divergencia_moderada',
    resumo: 'ACC/AHA 2017 recomendam meta < 130/80 mmHg para todos os adultos com HAS. SBC/ESC mantêm < 140/90 mmHg como meta universal, reservando < 130 para alto risco.',
    diretrizes: [
      { sigla: 'ACC/AHA 2017', sociedade: 'American College of Cardiology / American Heart Association', ano: 2017, posicao: 'Meta < 130/80 mmHg para todos os adultos com HAS estágio 1 ou 2', nivel: 'A', grau: 'I' },
      { sigla: 'ESC/ESH 2023', sociedade: 'European Society of Cardiology', ano: 2023, posicao: 'Meta < 140/90 mmHg universal; considerar < 130 em alto risco CV se tolerado', nivel: 'A', grau: 'I' },
      { sigla: 'DBHA-7/SBC 2020', sociedade: 'Sociedade Brasileira de Cardiologia', ano: 2020, posicao: 'Meta < 140/90 mmHg; < 130/80 mmHg em DM2, DRC, alto risco CV', nivel: 'A', grau: 'I' },
    ],
    guideline_preferida: 'DBHA-7/SBC 2020',
    justificativa_preferencia: 'Contexto epidemiológico brasileiro: maior prevalência de HAS + DRC e limitações de adesão. Meta universal < 130 pode aumentar hipotensão em idosos sem benefício comprovado no contexto BR.',
    impacto_clinico: 'Diferença de 10 mmHg na meta pode mudar indicação de intensificação em ~30% dos pacientes com HAS controlada por uma droga.',
    recomendacao_pratica: 'Usar meta < 140/90 para população geral brasileira; aplicar < 130/80 em: DM2, DRC, pós-IAM, IC, AVC prévio, alto risco CV pela Tabela de Framingham.',
  },

  {
    id: 'has-inicio-tratamento',
    topico: 'Limiar para início de tratamento farmacológico',
    diagnostico_id: 'has',
    grau_conflito: 'conflito_direto',
    resumo: 'ACC/AHA 2017 rebaixaram o limiar diagnóstico para PA ≥ 130/80 mmHg, duplicando a prevalência. ESC e SBC mantêm diagnóstico em ≥ 140/90 mmHg.',
    diretrizes: [
      { sigla: 'ACC/AHA 2017', sociedade: 'American College of Cardiology', ano: 2017, posicao: 'HAS definida como PA ≥ 130/80 mmHg; tratamento farmacológico se alto risco CV com PA 130–139/80–89', nivel: 'B', grau: 'I' },
      { sigla: 'ESC/ESH 2023', sociedade: 'European Society of Cardiology', ano: 2023, posicao: 'HAS definida como PA ≥ 140/90 mmHg; tratar farmacologicamente apenas ≥ 140/90 (ou ≥ 160/100 em baixo risco)', nivel: 'A', grau: 'I' },
      { sigla: 'DBHA-7/SBC 2020', sociedade: 'Sociedade Brasileira de Cardiologia', ano: 2020, posicao: 'HAS: PA ≥ 140/90 mmHg em ≥ 2 aferições. Pré-HAS: 130–139/85–89 — modificação de estilo de vida', nivel: 'A', grau: 'I' },
    ],
    guideline_preferida: 'DBHA-7/SBC 2020',
    justificativa_preferencia: 'Critério ACC/AHA classificaria ~46% dos adultos norte-americanos como hipertensos. No Brasil, recursos de saúde e adesão a longo prazo favorecem início farmacológico no limiar europeu/SBC.',
    impacto_clinico: 'Pacientes com PA 130–139/80–89 mmHg: intervenção farmacológica vs. não-farmacológica.',
    recomendacao_pratica: 'Tratar com modificações de estilo de vida PA 130–139 mmHg. Iniciar farmacoterapia: PA ≥ 140/90 ou PA 130–139 com risco CV alto (≥ 10% em 10 anos).',
  },

  // ── DM2 ───────────────────────────────────────────────────

  {
    id: 'dm2-primeira-linha',
    topico: 'Primeira linha farmacológica em DM2 sem DCV/ICC/DRC',
    diagnostico_id: 'dm2',
    classe_terapeutica: 'Biguanida / GLP-1 RA / iSGLT2',
    grau_conflito: 'divergencia_moderada',
    resumo: 'ADA 2026 eleva GLP-1 RA a primeira linha em DM2 + obesidade independente de HbA1c. SBD e ESC/EASD mantêm metformina como base, adicionando GLP-1/iSGLT2 conforme perfil de risco.',
    diretrizes: [
      { sigla: 'ADA 2026', sociedade: 'American Diabetes Association', ano: 2026, posicao: 'GLP-1 RA como 1ª linha em DM2 + IMC ≥ 30, independente da HbA1c. Metformina como adjuvante.', nivel: 'A', grau: 'I' },
      { sigla: 'ESC/EASD 2023', sociedade: 'European Society of Cardiology', ano: 2023, posicao: 'Metformina + iSGLT2 ou GLP-1 RA como 1ª linha em DM2 + DCV estabelecida ou alto risco CV', nivel: 'A', grau: 'I' },
      { sigla: 'SBD 2024', sociedade: 'Sociedade Brasileira de Diabetes', ano: 2024, posicao: 'Metformina como base; GLP-1 e iSGLT2 como 2ª linha mandatória em DM2 + DCV/ICC/DRC', nivel: 'A', grau: 'I' },
    ],
    guideline_preferida: 'SBD 2024',
    justificativa_preferencia: 'No contexto do SUS e farmacoeconomia brasileira, metformina permanece como base pelo custo/benefício superior. GLP-1 e iSGLT2 têm cobertura restrita — recomendar quando há DCV/ICC/DRC ou na saúde suplementar.',
    impacto_clinico: 'Pacientes com DM2 + obesidade sem DCV: início com GLP-1 RA vs. metformina com titulação.',
    recomendacao_pratica: 'Iniciar metformina em todos os pacientes sem contraindicação. Adicionar iSGLT2 ou GLP-1 RA se DCV, ICC ou DRC. Em DM2 + obesidade sem DCV na saúde suplementar: considerar GLP-1 como 1ª linha (ADA 2026).',
  },

  {
    id: 'dm2-meta-hba1c',
    topico: 'Meta de HbA1c em idosos e pacientes frágeis',
    diagnostico_id: 'dm2',
    grau_conflito: 'concordancia',
    resumo: 'Todas as diretrizes convergem: meta de HbA1c deve ser individualizada em idosos frágeis. ADA/EASD/SBD recomendam meta 7,5–8,5% em frágeis; < 7% apenas em jovens sem complicações.',
    diretrizes: [
      { sigla: 'ADA 2026', sociedade: 'American Diabetes Association', ano: 2026, posicao: 'Meta HbA1c < 7% em jovens; 7–8% em idosos com comorbidades; 8–8,5% em frágeis', nivel: 'A', grau: 'I' },
      { sigla: 'EASD 2023', sociedade: 'European Association for the Study of Diabetes', ano: 2023, posicao: 'Individualizar: 6,5–7% em jovens saudáveis; 7,5–8% em idosos; 8–9% em frágeis com alto risco de hipoglicemia', nivel: 'B', grau: 'I' },
      { sigla: 'SBD 2024', sociedade: 'Sociedade Brasileira de Diabetes', ano: 2024, posicao: 'Meta < 7% em adultos sem fragilidade; 7–8% em idosos; evitar tratamento intensivo se fragilidade moderada-grave', nivel: 'A', grau: 'I' },
    ],
    guideline_preferida: 'SBD 2024',
    justificativa_preferencia: 'Consenso entre as três principais diretrizes. SBD alinhada à realidade brasileira.',
    impacto_clinico: 'Prevenção de hipoglicemia grave em idosos — principal causa de hospitalização por DM2 no Brasil.',
    recomendacao_pratica: 'Avaliar fragilidade (Clinical Frailty Scale) em todo paciente ≥ 65 anos. Definir meta individualmente antes de intensificar tratamento.',
  },

  // ── ICC ───────────────────────────────────────────────────

  {
    id: 'icc-arni-vs-ieca',
    topico: 'ARNI vs. IECA como pilar na ICFEr',
    diagnostico_id: 'icc',
    classe_terapeutica: 'ARNI / IECA',
    molecula: 'Sacubitril/Valsartana vs. Enalapril',
    grau_conflito: 'divergencia_moderada',
    resumo: 'ESC 2025 e ACC/AHA HF 2022 recomendam ARNI (sacubitril/valsartana) como preferencial sobre IECA em ICFEr tolerante. SBC 2023 mantém IECA como pilar por acesso, com upgrade para ARNI em NYHA II–III.',
    diretrizes: [
      { sigla: 'ESC HF 2025', sociedade: 'European Society of Cardiology', ano: 2025, posicao: 'ARNI preferível ao IECA como 1ª linha em ICFEr (FEVE < 40%) se tolerado e sem hipotensão', nivel: 'A', grau: 'I' },
      { sigla: 'ACC/AHA HF 2022', sociedade: 'American College of Cardiology / AHA', ano: 2022, posicao: 'ARNI substitui IECA/BRA em pacientes com ICFEr tolerante — Classe I', nivel: 'A', grau: 'I' },
      { sigla: 'II DIB-IC/SBC 2023', sociedade: 'Sociedade Brasileira de Cardiologia', ano: 2023, posicao: 'IECA como 1ª opção (acesso/custo); ARNI recomendado se IECA tolerado e NYHA II–III persistente', nivel: 'A', grau: 'I' },
    ],
    guideline_preferida: 'II DIB-IC/SBC 2023',
    justificativa_preferencia: 'Sacubitril/valsartana não está disponível no SUS. No sistema suplementar, preferir ARNI se PA > 110/70, sem histórico de angioedema por IECA e com capacidade aquisitiva.',
    impacto_clinico: 'ARNI vs. IECA: redução adicional de 20% em mortalidade CV (PARADIGM-HF). Custo ~10× maior que enalapril.',
    recomendacao_pratica: 'SUS: iniciar com IECA e titular. Saúde suplementar: considerar upgrade para ARNI após 3–6 meses se tolerado (washout 36h do IECA antes de iniciar).',
  },

  {
    id: 'icc-sglt2-icfep',
    topico: 'iSGLT2 na ICFEp (FEVE ≥ 50%)',
    diagnostico_id: 'icc',
    classe_terapeutica: 'iSGLT2',
    grau_conflito: 'divergencia_leve',
    resumo: 'ESC 2025 elevou iSGLT2 para Classe I na ICFEp. ACC/AHA 2022 recomenda com Classe IIa. SBC 2023 aguarda incorporação no SUS — recomenda como IIa em saúde suplementar.',
    diretrizes: [
      { sigla: 'ESC HF 2025', sociedade: 'European Society of Cardiology', ano: 2025, posicao: 'Classe I — iSGLT2 (empagliflozina ou dapagliflozina) recomendado em ICFEp sintomática para reduzir hospitalização', nivel: 'A', grau: 'I' },
      { sigla: 'ACC/AHA HF 2022', sociedade: 'American College of Cardiology', ano: 2022, posicao: 'Classe IIa — Pode ser benéfico em ICFEp para reduzir hospitalizações por IC', nivel: 'B', grau: 'IIa' },
      { sigla: 'II DIB-IC/SBC 2023', sociedade: 'Sociedade Brasileira de Cardiologia', ano: 2023, posicao: 'IIa — Considerar empagliflozina/dapagliflozina em ICFEp + TFG ≥ 20 em saúde suplementar', nivel: 'B', grau: 'IIa' },
    ],
    guideline_preferida: 'ESC HF 2025',
    justificativa_preferencia: 'EMPEROR-Preserved e DELIVER fornecem evidência Nível A. ESC 2025 já incorporou. Aplicar Classe I em saúde suplementar.',
    impacto_clinico: 'Redução de 18–21% em hospitalização por IC — benefício independente da FEVE e do diagnóstico de DM2.',
    recomendacao_pratica: 'Prescender iSGLT2 em toda ICFEp sintomática com TFG ≥ 20 mL/min. Não exigir diagnóstico de DM2 para indicação.',
  },

  // ── DPOC ──────────────────────────────────────────────────

  {
    id: 'dpoc-ics-indicacao',
    topico: 'ICS em DPOC: indicação guiada por eosinófilos',
    diagnostico_id: 'dpoc',
    classe_terapeutica: 'Corticosteroide Inalatório (ICS)',
    grau_conflito: 'concordancia',
    resumo: 'GOLD 2026, SBPT e ERS convergem: ICS somente indicado em DPOC com eosinófilos ≥ 300/μL (ou ≥ 100 + exacerbações repetidas). Uso sem critério aumenta risco de pneumonia.',
    diretrizes: [
      { sigla: 'GOLD 2026', sociedade: 'Global Initiative for Chronic Obstructive Lung Disease', ano: 2026, posicao: 'ICS apenas se eosinófilos ≥ 300 células/μL ou ≥ 100 células/μL com ≥ 2 exacerbações/ano', nivel: 'A', grau: 'I' },
      { sigla: 'ERS 2023', sociedade: 'European Respiratory Society', ano: 2023, posicao: 'Biomarker-guided ICS: eosinófilos ≥ 300 como limiar preferencial; descontinuar se < 100', nivel: 'A', grau: 'I' },
      { sigla: 'SBPT 2022', sociedade: 'Sociedade Brasileira de Pneumologia e Tisiologia', ano: 2022, posicao: 'ICS em DPOC: exacerbações + eosinófilos ≥ 300/μL; avaliar risco de pneumonia', nivel: 'B', grau: 'I' },
    ],
    guideline_preferida: 'GOLD 2026',
    justificativa_preferencia: 'Evidência mais atualizada e reconhecida mundialmente. SBPT alinhada.',
    impacto_clinico: 'Uso de ICS sem indicação: aumento de pneumonia em 50% sem benefício em exacerbações.',
    recomendacao_pratica: 'Solicitar eosinófilos em sangue antes de iniciar ICS em DPOC. Descontinuar ICS se eosinófilos < 100 células/μL.',
  },

  // ── ASMA ──────────────────────────────────────────────────

  {
    id: 'asma-saba-on-demand',
    topico: 'Uso de SABA como monoterapia de resgate em asma',
    diagnostico_id: 'asma',
    classe_terapeutica: 'Beta-2 agonista de curta ação (SABA)',
    molecula: 'Salbutamol',
    grau_conflito: 'conflito_direto',
    resumo: 'GINA 2024 contraindicou SABA como monoterapia em asma — exige ICS+formoterol como resgate preferencial. Diretrizes anteriores (pré-2019) recomendavam SABA como 1ª linha isolado.',
    diretrizes: [
      { sigla: 'GINA 2024', sociedade: 'Global Initiative for Asthma', ano: 2024, posicao: 'SABA isolado contraindicado como resgate em asma. AIR preferencial: ICS-formoterol em dose baixa como resgate (degrau 1–5)', nivel: 'A', grau: 'I' },
      { sigla: 'SBPT 2020', sociedade: 'Sociedade Brasileira de Pneumologia', ano: 2020, posicao: 'SABA isolado como resgate em asma leve ainda aceitável; ICS-LABA preferencial em moderada-grave', nivel: 'B', grau: 'IIa' },
    ],
    guideline_preferida: 'GINA 2024',
    justificativa_preferencia: 'SYGMA 1 e 2, PRACTICAL, TREXA: ICS-formoterol como resgate superior ao SABA isolado — redução de 64–89% em exacerbações graves. Evidência definitiva contra SABA monoterapia.',
    impacto_clinico: 'SABA isolado sem ICS = remodelamento não tratado. Cada exacerbação evitável aumenta risco de asma fatal.',
    recomendacao_pratica: 'Não prescrever SABA como monoterapia para asma. Usar budesonida-formoterol 80/4,5 mcg como resgate em todos os degraus (AIR = anti-inflamatório de alívio rápido).',
  },

  // ── DRC / KDIGO ───────────────────────────────────────────

  {
    id: 'drc-raas-isglt2',
    topico: 'Nefroproteção: RAAS vs. iSGLT2 como 1ª linha em DRC + DM2',
    diagnostico_id: 'drc',
    classe_terapeutica: 'IECA/BRA vs. iSGLT2',
    grau_conflito: 'divergencia_leve',
    resumo: 'KDIGO 2024 recomenda iSGLT2 + IECA/BRA como combinação padrão em DRC + DM2, com iSGLT2 iniciando já com TFG ≥ 20. Diretrizes anteriores baseavam-se apenas em IECA/BRA.',
    diretrizes: [
      { sigla: 'KDIGO 2024', sociedade: 'Kidney Disease Improving Global Outcomes', ano: 2024, posicao: 'Combinação IECA/BRA + iSGLT2 como padrão em DRC G2–G4 + DM2. Iniciar iSGLT2 com TFG ≥ 20 mL/min', nivel: 'A', grau: 'I' },
      { sigla: 'ADA 2026', sociedade: 'American Diabetes Association', ano: 2026, posicao: 'iSGLT2 mandatório em DM2 + DRC (TFG 20–45). Finerenona como 3ª opção com IECA + iSGLT2 se proteinúria persistente', nivel: 'A', grau: 'I' },
      { sigla: 'SBD/SBN 2023', sociedade: 'SBD + Sociedade Brasileira de Nefrologia', ano: 2023, posicao: 'IECA/BRA como base; adicionar iSGLT2 (dapagliflozina/empagliflozina) se TFG ≥ 25 mL/min', nivel: 'A', grau: 'I' },
    ],
    guideline_preferida: 'KDIGO 2024',
    justificativa_preferencia: 'CREDENCE e DAPA-CKD: evidência definitiva de nefroproteção com iSGLT2 independente de DM2. KDIGO 2024 é a referência global para DRC.',
    impacto_clinico: 'iSGLT2 reduz progressão de DRC em 39% (DAPA-CKD) e hospitalização renal em 29%.',
    recomendacao_pratica: 'Todo paciente com DRC G2–G4 + DM2: IECA/BRA + iSGLT2 (TFG ≥ 20). Monitorar TFG na primeira semana (queda de até 15%: esperada e reversível).',
  },

];

// ──────────────────────────────────────────────────────────────
// Funções de acesso
// ──────────────────────────────────────────────────────────────

export function detectarConflitos(diagnosticoId: string): ConflitoGuideline[] {
  return CONFLITOS_DIRETRIZES.filter(c => c.diagnostico_id === diagnosticoId);
}

export function buscarConflitoClasse(classeOuMolecula: string): ConflitoGuideline[] {
  const q = classeOuMolecula.toLowerCase();
  return CONFLITOS_DIRETRIZES.filter(c =>
    c.classe_terapeutica?.toLowerCase().includes(q) ||
    c.molecula?.toLowerCase().includes(q) ||
    c.topico.toLowerCase().includes(q)
  );
}

export function resumoConflitos(diagnosticoId: string): {
  total: number;
  conflitos_diretos: number;
  divergencias: number;
  concordancias: number;
  guideline_principal: string;
} {
  const lista = detectarConflitos(diagnosticoId);
  return {
    total: lista.length,
    conflitos_diretos: lista.filter(c => c.grau_conflito === 'conflito_direto').length,
    divergencias: lista.filter(c => c.grau_conflito.startsWith('divergencia')).length,
    concordancias: lista.filter(c => c.grau_conflito === 'concordancia').length,
    guideline_principal: lista[0]?.guideline_preferida ?? 'SBC/SBD/SBPT',
  };
}
