// ============================================================
// PRESCREVE-AI — Motor Geriátrico (Phase 21.10)
// Beers 2023 · STOPP v3 · START v3 · Fragilidade · Deprescrição
// Polifarmácia · Carga Anticolinérgica · Ajuste Geriátrico
// ============================================================

// ─── TIPOS BASE ───────────────────────────────────────────────

export interface PatientProfile {
  idadeAnos: number;
  sexo: 'M' | 'F';
  pesoKg?: number;
  clcrMlMin?: number;           // Clearance de creatinina (Cockroft-Gault)
  creatininaUmolL?: number;
  diagnosticos: string[];        // lista livre ex: 'demencia', 'insuficiencia cardiaca'
  medicamentosAtivos: string[];  // IDs dos medicamentos
  fragilidadeScore?: number;     // CFS 1–9
  quedaUltimoAno?: boolean;
  demencia?: boolean;
  delirio?: boolean;
  hxSangramento?: boolean;
}

export interface BeersItem {
  id: string;
  categoria: string;
  medicamentos: string[];        // nomes/classes afetadas
  risco: string;                 // descrição do risco
  recomendacao: 'evitar' | 'evitar_exceto' | 'ajustar_dose' | 'monitorar';
  excecoes?: string;
  evidencia: 'moderada' | 'forte';
  forcaRecomendacao: 'forte' | 'moderada';
  sistemaAfetado?: string;
}

export interface StoppItem {
  id: string;
  sistema: string;
  criterio: string;
  medicamentosAlvo: string[];
  condicao: string;              // quando aplicar (ex: "em pacientes com DRC < 30")
  racionaleClinico: string;
}

export interface StartItem {
  id: string;
  sistema: string;
  indicacao: string;
  medicamentosRecomendados: string[];
  condicao: string;
  racionaleClinico: string;
}

export interface PIMResult {
  tipo: 'beers' | 'stopp' | 'start';
  id: string;
  medicamento: string;
  alerta: string;
  severidade: 'alta' | 'moderada' | 'baixa';
  recomendacao: string;
}

export interface FrailtyResult {
  score: number;
  categoria: string;
  descricao: string;
  implicacoesTerapeuticas: string[];
}

export interface DeprescribingPlan {
  medicamentoId: string;
  medicamentoNome: string;
  prioridade: 'alta' | 'media' | 'baixa';
  razao: string;
  estrategia: string;
  monitoramento: string;
  reducaoGradual?: boolean;
}

// ─── BEERS CRITERIA 2023 (AGS — American Geriatrics Society) ──

export const BEERS_2023: BeersItem[] = [
  // Sistema Nervoso Central
  {
    id: 'beers-bnz-01',
    categoria: 'SNC — Benzodiazepínicos',
    medicamentos: ['diazepam', 'clonazepam', 'lorazepam', 'alprazolam', 'midazolam', 'triazolam', 'temazepam', 'clordiazepóxido'],
    risco: '↑ risco de sedação, delirium, quedas, fraturas, acidentes automobilísticos. Idosos metabolizam mais lentamente.',
    recomendacao: 'evitar',
    evidencia: 'moderada',
    forcaRecomendacao: 'forte',
    sistemaAfetado: 'SNC',
  },
  {
    id: 'beers-zbz-02',
    categoria: 'SNC — Hipnóticos Z (não-benzodiazepínicos)',
    medicamentos: ['zolpidem', 'zaleplon', 'eszopiclona', 'zopiclona'],
    risco: '↑ risco de quedas, fraturas, delirium. Mesmo perfil de risco dos benzodiazepínicos. Eficácia mínima no idoso.',
    recomendacao: 'evitar',
    evidencia: 'moderada',
    forcaRecomendacao: 'forte',
    sistemaAfetado: 'SNC',
  },
  {
    id: 'beers-antip-03',
    categoria: 'SNC — Antipsicóticos',
    medicamentos: ['haloperidol', 'quetiapina', 'risperidona', 'olanzapina', 'clorpromazina', 'tioridazina'],
    risco: '↑ risco de AVC, mortalidade em demência, parkinsonismo, sedação, quedas.',
    recomendacao: 'evitar_exceto',
    excecoes: 'Esquizofrenia, transtorno bipolar, delírio grave refratário (risco x benefício documentado).',
    evidencia: 'moderada',
    forcaRecomendacao: 'forte',
    sistemaAfetado: 'SNC',
  },
  {
    id: 'beers-tca-04',
    categoria: 'SNC — Antidepressivos tricíclicos',
    medicamentos: ['amitriptilina', 'imipramina', 'clomipramina', 'nortriptilina', 'doxepina > 6mg'],
    risco: 'Alta atividade anticolinérgica → retenção urinária, constipação, confusão, visão turva. ↑ risco de quedas, arritmias (QT).',
    recomendacao: 'evitar',
    evidencia: 'moderada',
    forcaRecomendacao: 'forte',
    sistemaAfetado: 'SNC/Cardiovascular',
  },
  {
    id: 'beers-anti-p-05',
    categoria: 'SNC — Antiparkinsonianos (1ª geração)',
    medicamentos: ['biperideno', 'triexifenidila', 'benztropina'],
    risco: 'Alta atividade anticolinérgica. Não recomendados em DP. Preferir agentes dopaminérgicos.',
    recomendacao: 'evitar',
    evidencia: 'moderada',
    forcaRecomendacao: 'forte',
    sistemaAfetado: 'SNC',
  },
  // Cardiovascular
  {
    id: 'beers-dig-06',
    categoria: 'Cardiovascular — Digoxina',
    medicamentos: ['digoxina'],
    risco: '↑ risco de toxicidade. Clearance renal reduzido no idoso → acúmulo. Índice terapêutico estreito.',
    recomendacao: 'ajustar_dose',
    excecoes: 'FA com resposta ventricular inadequada a outros fármacos, IC com baixa FE refratária: máx 0,125 mg/dia. Nível sérico < 0,9 ng/mL.',
    evidencia: 'moderada',
    forcaRecomendacao: 'forte',
    sistemaAfetado: 'Cardiovascular',
  },
  {
    id: 'beers-nia-07',
    categoria: 'Cardiovascular — Nifedipino de ação imediata',
    medicamentos: ['nifedipino comprimido comum', 'nifedipino sublingual'],
    risco: 'Hipotensão ortostática grave, isquemia miocárdica reflexa (taquicardia). Risco de AVC.',
    recomendacao: 'evitar',
    evidencia: 'forte',
    forcaRecomendacao: 'forte',
    sistemaAfetado: 'Cardiovascular',
  },
  {
    id: 'beers-asa-08',
    categoria: 'Cardiovascular — AAS > 100 mg/dia (prevenção primária)',
    medicamentos: ['ácido acetilsalicílico > 100 mg'],
    risco: 'Benefício cardiovascular não comprovado em prevenção primária ≥ 70 anos. Risco de sangramento GI e intracraniano.',
    recomendacao: 'evitar',
    excecoes: 'Prevenção secundária (após IAM, AVC isquêmico, doença coronariana estabelecida): benefício claramente supera risco.',
    evidencia: 'moderada',
    forcaRecomendacao: 'forte',
    sistemaAfetado: 'Cardiovascular',
  },
  {
    id: 'beers-diu-09',
    categoria: 'Cardiovascular — Diuréticos de alça (carga de sódio)',
    medicamentos: ['furosemida', 'bumetanida', 'torsemida'],
    risco: 'Hiponatremia, hipocalemia, desidratação, quedas (hipotensão ortostática). Não usar como 1ª linha para HTN sem IC.',
    recomendacao: 'evitar_exceto',
    excecoes: 'IC descompensada, hipertensão refratária, edema refratário com indicação clínica clara.',
    evidencia: 'moderada',
    forcaRecomendacao: 'moderada',
    sistemaAfetado: 'Cardiovascular/Renal',
  },
  // Gastrointestinal
  {
    id: 'beers-meto-10',
    categoria: 'GI — Metoclopramida',
    medicamentos: ['metoclopramida'],
    risco: 'Sintomas extrapiramidais, parkinsonismo tardio (discinesia tardia) — riscos maiores em idosos.',
    recomendacao: 'evitar_exceto',
    excecoes: 'Gastroparesia grave documentada. Limitar a < 12 semanas.',
    evidencia: 'moderada',
    forcaRecomendacao: 'forte',
    sistemaAfetado: 'SNC/GI',
  },
  {
    id: 'beers-ibp-11',
    categoria: 'GI — Inibidores de Bomba de Prótons',
    medicamentos: ['omeprazol', 'pantoprazol', 'lansoprazol', 'rabeprazol', 'esomeprazol'],
    risco: 'Uso > 8 semanas sem indicação clara: ↑ risco de infecção por C. difficile, fraturas, hipomagnesemia, deficiência de B12.',
    recomendacao: 'evitar',
    excecoes: 'Uso crônico justificado: DRGE erosiva, esofagite de Barrett, alto risco GI com AINEs ou anticoagulantes, úlcera refratária.',
    evidencia: 'moderada',
    forcaRecomendacao: 'forte',
    sistemaAfetado: 'GI/Ósseo',
  },
  // Analgésicos
  {
    id: 'beers-aine-12',
    categoria: 'Analgésicos — AINEs orais',
    medicamentos: ['ibuprofeno', 'naproxeno', 'diclofenaco', 'celecoxibe', 'meloxicam', 'piroxicam', 'cetoprofeno'],
    risco: '↑ risco de sangramento GI/péptico, IRA, retenção de sódio, IC descompensada, HTN.',
    recomendacao: 'evitar_exceto',
    excecoes: 'Artrite gotosa aguda, osteoartrite sem resposta a paracetamol: usar por < 5 dias com proteção gástrica (IBP).',
    evidencia: 'moderada',
    forcaRecomendacao: 'forte',
    sistemaAfetado: 'GI/Renal/Cardiovascular',
  },
  {
    id: 'beers-opios-13',
    categoria: 'Analgésicos — Opioide + BZD',
    medicamentos: ['morfina + diazepam', 'codeína + alprazolam', 'tramadol + clonazepam'],
    risco: 'Combinação opioides + BZD: ↑↑ risco de depressão respiratória grave, sedação, quedas.',
    recomendacao: 'evitar',
    evidencia: 'forte',
    forcaRecomendacao: 'forte',
    sistemaAfetado: 'SNC/Respiratório',
  },
  {
    id: 'beers-tramadol-14',
    categoria: 'Analgésicos — Tramadol',
    medicamentos: ['tramadol'],
    risco: '↑ risco de hipoglicemia (em diabéticos), hiponatremia (SIADH), convulsões, quedas, delirium.',
    recomendacao: 'evitar',
    excecoes: 'Dor moderada-grave sem alternativa — avaliar risco-benefício individualmente.',
    evidencia: 'moderada',
    forcaRecomendacao: 'forte',
    sistemaAfetado: 'SNC/Metabólico',
  },
  // Urológico
  {
    id: 'beers-anti-col-uro-15',
    categoria: 'Urológico — Anticolinérgicos para bexiga',
    medicamentos: ['oxibutinina', 'tolterodina', 'solifenacina', 'fesoterodina', 'tróspio'],
    risco: 'Alta carga anticolinérgica → delirium, piora cognitiva, retenção urinária, constipação. Alternativas: mirabegron.',
    recomendacao: 'evitar',
    excecoes: 'Mirabegron é alternativa mais segura com eficácia equivalente.',
    evidencia: 'moderada',
    forcaRecomendacao: 'forte',
    sistemaAfetado: 'SNC/Urológico',
  },
  // Anti-histamínicos
  {
    id: 'beers-anti-hist-16',
    categoria: 'Anti-histamínicos de 1ª geração',
    medicamentos: ['difenidramina', 'hidroxizina', 'prometazina', 'clorfeniramina', 'doxilamina'],
    risco: 'Alta atividade anticolinérgica → delirium, sedação excessiva, queda, retenção urinária.',
    recomendacao: 'evitar',
    excecoes: 'Hidroxizina para prurido refratário a anti-histamínicos de 2ª geração: uso cauteloso < 50 mg. Prometazina IV em náuseas graves intratáveis hospitalizados.',
    evidencia: 'moderada',
    forcaRecomendacao: 'forte',
    sistemaAfetado: 'SNC/Urológico',
  },
  // Endócrino
  {
    id: 'beers-sulfo-17',
    categoria: 'Endócrino — Sulfonilureias de longa ação',
    medicamentos: ['glibenclamida', 'clorpropamida', 'glipizida'],
    risco: 'Hipoglicemia prolongada e grave. Clorpropamida: hiponatremia (SIADH). Glibenclamida: metabolismo ativo.',
    recomendacao: 'evitar',
    excecoes: 'Glicazida (meia-vida menor) preferível se sulfonilureia for necessária.',
    evidencia: 'forte',
    forcaRecomendacao: 'forte',
    sistemaAfetado: 'Endócrino/SNC',
  },
  {
    id: 'beers-insul-18',
    categoria: 'Endócrino — Insulina (regime intensivo)',
    medicamentos: ['insulina NPH + rápida ≥ 3 aplicações/dia'],
    risco: 'Hipoglicemia grave em idosos frágeis. Alvo glicêmico ≤ 7% em ≥ 75 anos ou com demência = dano > benefício.',
    recomendacao: 'evitar_exceto',
    excecoes: 'DM1 ou DM2 descompensado com alto risco: HbA1c alvo 7,5–8,5% em idosos frágeis (ADA/SBD 2023).',
    evidencia: 'moderada',
    forcaRecomendacao: 'forte',
    sistemaAfetado: 'Endócrino',
  },
  // Renal
  {
    id: 'beers-aines-renal-19',
    categoria: 'Renal — AINEs em DRC',
    medicamentos: ['ibuprofeno', 'naproxeno', 'diclofenaco', 'indometacina'],
    risco: 'ClCr < 30 mL/min: ↑↑ toxicidade renal e hipercalemia. ClCr 30–60: usar com cautela.',
    recomendacao: 'evitar',
    evidencia: 'forte',
    forcaRecomendacao: 'forte',
    sistemaAfetado: 'Renal',
  },
  {
    id: 'beers-metf-20',
    categoria: 'Renal — Metformina em DRC',
    medicamentos: ['metformina'],
    risco: 'ClCr < 30 mL/min: ↑ risco de acidose lática. TFG 30–45: dose reduzida (500–1000 mg/dia).',
    recomendacao: 'evitar',
    excecoes: 'TFG > 45: dose habitual. TFG 30–45: 500–1000 mg/dia. TFG < 30: CONTRAINDICADO.',
    evidencia: 'forte',
    forcaRecomendacao: 'forte',
    sistemaAfetado: 'Renal/Metabólico',
  },
];

// ─── STOPP v3 (Screening Tool of Older Persons' Prescriptions) ─

export const STOPP_V3: StoppItem[] = [
  // Cardiovascular
  { id: 'stopp-a1', sistema: 'Cardiovascular', criterio: 'AAS em FA sem anticoagulação', medicamentosAlvo: ['ácido acetilsalicílico'], condicao: 'FA permanente/persistente sem contraindicação a anticoagulante', racionaleClinico: 'AAS não previne AVC em FA — anticoagulação oral é superior. Risco de sangramento sem benefício claro.' },
  { id: 'stopp-a2', sistema: 'Cardiovascular', criterio: 'Digoxina > 125 mcg/dia em idoso com DRC', medicamentosAlvo: ['digoxina'], condicao: 'ClCr < 50 mL/min ou creatinina > 150 µmol/L', racionaleClinico: 'Excreção renal reduzida → acúmulo → toxicidade (náuseas, bloqueio AV, arritmias).' },
  { id: 'stopp-a3', sistema: 'Cardiovascular', criterio: 'Betabloqueador + verapamil ou diltiazem', medicamentosAlvo: ['atenolol', 'metoprolol', 'carvedilol', 'bisoprolol'], condicao: 'Uso concomitante com verapamil ou diltiazem', racionaleClinico: 'Risco de bloqueio AV de alto grau e bradicardia sintomática.' },
  { id: 'stopp-a4', sistema: 'Cardiovascular', criterio: 'Nifedipino de liberação imediata para hipertensão', medicamentosAlvo: ['nifedipino'], condicao: 'Hipertensão arterial crônica', racionaleClinico: 'Picos de hipotensão, taquicardia reflexa, risco de AVC.' },
  // SNC
  { id: 'stopp-b1', sistema: 'SNC', criterio: 'Benzodiazepínicos em idoso com risco de queda', medicamentosAlvo: ['diazepam', 'clonazepam', 'lorazepam', 'alprazolam', 'midazolam'], condicao: 'Histórico de queda no último ano', racionaleClinico: 'BZD → sedação, ataxia, reação lenta → queda. Risco fratura de fêmur ↑ 60%.' },
  { id: 'stopp-b2', sistema: 'SNC', criterio: 'Antipsicótico em parkinsonismo', medicamentosAlvo: ['haloperidol', 'risperidona', 'olanzapina'], condicao: 'Diagnóstico de doença de Parkinson', racionaleClinico: 'Bloqueio dopaminérgico → piora do parkinsonismo.' },
  { id: 'stopp-b3', sistema: 'SNC', criterio: 'Anticolinérgico em demência', medicamentosAlvo: ['oxibutinina', 'difenidramina', 'amitriptilina', 'prometazina'], condicao: 'Diagnóstico de demência', racionaleClinico: 'Anticolinérgicos pioram déficit cognitivo em pacientes com demência.' },
  { id: 'stopp-b4', sistema: 'SNC', criterio: 'Opioide sem proteção intestinal', medicamentosAlvo: ['morfina', 'tramadol', 'codeína', 'oxicodona'], condicao: 'Constipação crônica', racionaleClinico: 'Opioide → reduz motilidade intestinal. Necessário laxativo osmótico profilático (PEG, lactulose).' },
  // Gastrointestinal
  { id: 'stopp-c1', sistema: 'GI', criterio: 'IBP sem indicação em dose plena > 8 semanas', medicamentosAlvo: ['omeprazol', 'pantoprazol', 'lansoprazol', 'rabeprazol'], condicao: 'Ausência de DRGE erosiva, Barrett, úlcera ativa, uso de AINEs/AAS', racionaleClinico: 'Uso excessivo de IBP: hipomagnesemia, deficiência de B12, C. difficile, fraturas.' },
  { id: 'stopp-c2', sistema: 'GI', criterio: 'Metoclopramida em uso crônico', medicamentosAlvo: ['metoclopramida'], condicao: 'Uso > 12 semanas contínuas', racionaleClinico: 'Discinesia tardia irreversível — risco maior em idosos com uso prolongado.' },
  // Renal / Urológico
  { id: 'stopp-d1', sistema: 'Renal', criterio: 'AINE em DRC', medicamentosAlvo: ['ibuprofeno', 'naproxeno', 'diclofenaco', 'celecoxibe'], condicao: 'TFG < 50 mL/min/1,73m²', racionaleClinico: 'AINEs reduzem PGE2 renal → vasoconstrição aferente → IRA.' },
  { id: 'stopp-d2', sistema: 'Urológico', criterio: 'Anticolinérgico em HPB', medicamentosAlvo: ['oxibutinina', 'tolterodina', 'solifenacina'], condicao: 'Homem com HPB ou antecedente de retenção urinária', racionaleClinico: 'Anticolinérgico → relaxamento do detrusor → piora da retenção urinária.' },
  // Endócrino
  { id: 'stopp-e1', sistema: 'Endócrino', criterio: 'Glibenclamida em diabético ≥ 75 anos', medicamentosAlvo: ['glibenclamida'], condicao: 'Idade ≥ 75 anos', racionaleClinico: 'Hipoglicemia prolongada e grave. Substitua por glicazida ou DPP-4 inibidor.' },
  { id: 'stopp-e2', sistema: 'Endócrino', criterio: 'Alvo de HbA1c < 7% em idoso frágil', medicamentosAlvo: ['insulina', 'sulfonilureia', 'glinida'], condicao: 'Demência, fragilidade grave (CFS ≥ 6), expectativa de vida < 5 anos', racionaleClinico: 'Hipoglicemia > dano que hiperglicemia em idosos frágeis. Alvo: 7,5–8,5%.' },
  // Respiratório
  { id: 'stopp-f1', sistema: 'Respiratório', criterio: 'Benzodiazepínico em DPOC', medicamentosAlvo: ['diazepam', 'clonazepam', 'lorazepam'], condicao: 'DPOC com risco de hipoxemia ou hipercapnia', racionaleClinico: 'Depressão respiratória pode precipitar insuficiência respiratória.' },
  // Musculoesquelético
  { id: 'stopp-g1', sistema: 'Musculoesquelético', criterio: 'Corticoide sistêmico crônico sem osteoprotecção', medicamentosAlvo: ['prednisona', 'prednisolona', 'dexametasona'], condicao: 'Uso oral > 3 meses sem bisfosfonato + cálcio + vitamina D', racionaleClinico: 'Osteoporose corticoinducida: risco de fratura vertebral e fêmur.' },
];

// ─── START v3 (Screening Tool to Alert to Right Treatment) ────

export const START_V3: StartItem[] = [
  // Cardiovascular
  { id: 'start-a1', sistema: 'Cardiovascular', indicacao: 'Anticoagulação oral em FA permanente/persistente', medicamentosRecomendados: ['apixabana', 'rivaroxabana', 'dabigatrana', 'varfarina'], condicao: 'FA + score CHA₂DS₂-VASc ≥ 2 (H) ou ≥ 3 (M)', racionaleClinico: 'Reduz AVC em até 70% — superioridade dos NOACs vs varfarina confirmada.' },
  { id: 'start-a2', sistema: 'Cardiovascular', indicacao: 'Betabloqueador em IC com FE reduzida', medicamentosRecomendados: ['carvedilol', 'bisoprolol', 'metoprolol succinato'], condicao: 'IC sistólica (FE < 40%) clinicamente estável', racionaleClinico: 'Reduz mortalidade cardiovascular em 35%.' },
  { id: 'start-a3', sistema: 'Cardiovascular', indicacao: 'IECA ou BRA em IC com FE reduzida', medicamentosRecomendados: ['enalapril', 'lisinopril', 'ramipril', 'valsartan', 'sacubitril/valsartan'], condicao: 'IC sistólica (FE < 40%) + sem contraindicação (K > 5,5, creat > 220)', racionaleClinico: 'Pilar do tratamento da IC: reduz hospitalização e mortalidade.' },
  { id: 'start-a4', sistema: 'Cardiovascular', indicacao: 'Estatina em DAC estabelecida', medicamentosRecomendados: ['rosuvastatina', 'atorvastatina'], condicao: 'Doença coronariana, AVC isquêmico ou DAP documentada, sem terminalidade', racionaleClinico: 'Prevenção secundária: redução de ~25% em eventos CV maiores.' },
  { id: 'start-a5', sistema: 'Cardiovascular', indicacao: 'AAS (baixa dose) em DAC estabelecida', medicamentosRecomendados: ['ácido acetilsalicílico 100 mg'], condicao: 'Coronariopatia, AVC isquêmico ou DAP — sem sangramento ativo', racionaleClinico: 'Prevenção secundária com benefício claramente estabelecido.' },
  // Respiratório
  { id: 'start-b1', sistema: 'Respiratório', indicacao: 'β2-agonista de longa ação + corticoide inalatório em DPOC grave', medicamentosRecomendados: ['salmeterol/fluticasona', 'formoterol/budesonida', 'indacaterol/mometasona'], condicao: 'DPOC GOLD 3–4 com ≥ 2 exacerbações/ano e eosinófilos > 300/µL', racionaleClinico: 'Reduz exacerbações e melhora QV.' },
  { id: 'start-b2', sistema: 'Respiratório', indicacao: 'Anticolinérgico de longa ação (LAMA) em DPOC', medicamentosRecomendados: ['tiotrópio', 'umeclidínio', 'glicopirrônio'], condicao: 'DPOC GOLD 2–4 sem contraindicação', racionaleClinico: 'Melhora função pulmonar, reduz exacerbações.' },
  // Endócrino
  { id: 'start-c1', sistema: 'Endócrino', indicacao: 'Vitamina D + Cálcio em osteoporose/fragilidade', medicamentosRecomendados: ['colecalciferol 1000–2000 UI/dia', 'carbonato de cálcio 500 mg/dia'], condicao: '≥ 65 anos com risco de queda ou T-score < -2,5', racionaleClinico: 'Reduz risco de queda e fratura em idosos.' },
  { id: 'start-c2', sistema: 'Endócrino', indicacao: 'Bisfosfonato em osteoporose estabelecida', medicamentosRecomendados: ['alendronato', 'risedronato', 'ácido zoledrônico'], condicao: 'Fratura por fragilidade prévia ou T-score < -2,5 em idosa pós-menopausa', racionaleClinico: 'Reduz fratura vertebral em 50–70% e fratura de quadril em 40%.' },
  { id: 'start-c3', sistema: 'Endócrino', indicacao: 'Metformina como 1ª linha em DM2 sem DRC grave', medicamentosRecomendados: ['metformina'], condicao: 'DM2 + TFG > 30 mL/min/1,73m²', racionaleClinico: 'Eficácia metabólica + benefício cardiovascular + baixo custo.' },
  // Neurológico
  { id: 'start-d1', sistema: 'Neurológico', indicacao: 'Antiparkinsoniano em DP não tratada', medicamentosRecomendados: ['levodopa/carbidopa', 'pramipexol', 'rasagilina'], condicao: 'Diagnóstico de Doença de Parkinson com impacto funcional', racionaleClinico: 'Melhora função motora e qualidade de vida.' },
  { id: 'start-d2', sistema: 'Neurológico', indicacao: 'Inibidor de colinesterase em demência de Alzheimer leve-moderada', medicamentosRecomendados: ['donepezila', 'rivastigmina', 'galantamina'], condicao: 'Doença de Alzheimer ou Parkinson com demência (MMSE 10–26)', racionaleClinico: 'Melhora modesta mas consistente na cognição e função. Único tratamento aprovado.' },
  // Gastrointestinal
  { id: 'start-e1', sistema: 'GI', indicacao: 'Proteção gástrica em AINE crônico', medicamentosRecomendados: ['omeprazol', 'pantoprazol', 'misoprostol'], condicao: 'AINE regular por > 4 semanas', racionaleClinico: 'Reduz risco de úlcera péptica e sangramento GI em 80% quando associado a AINE.' },
  // Imunológico
  { id: 'start-f1', sistema: 'Vacinação', indicacao: 'Vacina pneumocócica (PCV15 + PPSV23)', medicamentosRecomendados: ['PCV15/PCV20 + PPSV23'], condicao: '≥ 65 anos sem vacinação prévia documentada', racionaleClinico: 'Reduz pneumonia bacteriana invasiva em idosos.' },
  { id: 'start-f2', sistema: 'Vacinação', indicacao: 'Vacina influenza anual', medicamentosRecomendados: ['vacina influenza tetravalente (dose alta ≥ 65 anos)'], condicao: '≥ 65 anos — vacinar anualmente', racionaleClinico: 'Reduz hospitalização por influenza em 30–70% em idosos.' },
];

// ─── CARGA ANTICOLINÉRGICA (ACB Score) ───────────────────────

export const ANTICHOLINERGIC_BURDEN: Record<string, number> = {
  // Score 3 (alto)
  amitriptilina: 3, clomipramina: 3, imipramina: 3, nortriptilina: 3,
  difenidramina: 3, prometazina: 3, doxilamina: 3, clorfeniramina: 3,
  oxibutinina: 3, tolterodina: 3, solifenacina: 3, fesoterodina: 3,
  biperideno: 3, triexifenidila: 3, benztropina: 3,
  clorpromazina: 3, tioridazina: 3, clozapina: 3,
  atropina: 3, escopolamina: 3,
  // Score 2 (moderado)
  paroxetina: 2, olanzapina: 2, quetiapina: 2,
  loperamida: 2, hioscina: 2,
  // Score 1 (baixo)
  furosemida: 1, digoxina: 1, nifedipino: 1,
  prednisolona: 1, metoprolol: 1, atenolol: 1,
  ranitidina: 1, cimetidina: 1, metoclopramida: 1,
  haloperidol: 1, risperidona: 1,
  codeína: 1, tramadol: 1,
};

export function calcAnticholinergicBurden(medicamentos: string[]): {
  score: number;
  risco: 'baixo' | 'moderado' | 'alto';
  medicamentosContribuintes: { nome: string; score: number }[];
  recomendacao: string;
} {
  const contribuintes = medicamentos
    .map(m => ({ nome: m, score: ANTICHOLINERGIC_BURDEN[m.toLowerCase()] ?? 0 }))
    .filter(x => x.score > 0);
  const score = contribuintes.reduce((s, x) => s + x.score, 0);
  const risco = score >= 3 ? 'alto' : score >= 2 ? 'moderado' : 'baixo';
  const recomendacao =
    risco === 'alto' ? 'Rever urgentemente — ACB ≥ 3 associado a déficit cognitivo, delirium e quedas. Substituir por alternativas sem atividade anticolinérgica.' :
    risco === 'moderado' ? 'Avaliar possibilidade de deprescrição ou substituição.' :
    'Carga aceitável — manter monitoramento clínico.';
  return { score, risco, medicamentosContribuintes: contribuintes, recomendacao };
}

// ─── CLINICAL FRAILTY SCALE (CFS) ─────────────────────────────

export const FRAILTY_SCALE: FrailtyResult[] = [
  { score: 1, categoria: 'Muito ativo', descricao: 'Robusto, ativo, motivado e enérgico. Exerce atividade física regular.', implicacoesTerapeuticas: ['Metas glicêmicas e pressóricas convencionais', 'Nenhuma restrição de medicamentos por fragilidade'] },
  { score: 2, categoria: 'Bem', descricao: 'Sem doenças ativas. Exercita-se ou é muito ativo occasionalmente.', implicacoesTerapeuticas: ['Tratamento pleno conforme guidelines', 'Rastreamento oncológico conforme idade'] },
  { score: 3, categoria: 'Bem (com comorbidades tratadas)', descricao: 'Sintomas de doença bem controlados, mas menos ativo que grau 1–2.', implicacoesTerapeuticas: ['Atenção às interações medicamentosas', 'Rever polifarmácia anualmente'] },
  { score: 4, categoria: 'Vulnerável', descricao: 'Não depende para AVDs, mas refere lentidão e/ou cansaço.', implicacoesTerapeuticas: ['Metas terapêuticas levemente relaxadas', 'Vacinas em dia', 'Revisar indicação de cada medicamento'] },
  { score: 5, categoria: 'Levemente frágil', descricao: 'Evidente lentidão. Dependência em IAVDs (finanças, transporte, tarefas domésticas).', implicacoesTerapeuticas: ['Evitar hipoglicemia: HbA1c alvo 7,5–8%', 'PAS alvo < 140 mmHg (não < 120)', 'Iniciar revisão de polifarmácia'] },
  { score: 6, categoria: 'Moderadamente frágil', descricao: 'Dependência nas AVDs básicas. Pode ter incontinência.', implicacoesTerapeuticas: ['HbA1c alvo < 8,5%', 'PAS alvo < 150 mmHg', 'Avaliar deprescrição ativa', 'Fisioterapia/prevenção de quedas'] },
  { score: 7, categoria: 'Gravemente frágil', descricao: 'Totalmente dependente. Doença estável ou em progressão lenta.', implicacoesTerapeuticas: ['Suspender estatinas, AAS prevenção primária, rastreamento oncológico', 'HbA1c alvo < 9%', 'Focar em conforto e qualidade de vida'] },
  { score: 8, categoria: 'Muito gravemente frágil', descricao: 'Completamente dependente, próximo ao fim da vida.', implicacoesTerapeuticas: ['Cuidados paliativos', 'Suspender prevenção primária e secundária distante', 'Manter apenas medicamentos de conforto'] },
  { score: 9, categoria: 'Fase terminal', descricao: 'Expectativa de vida < 6 meses.', implicacoesTerapeuticas: ['Suspender todos os medicamentos não voltados ao conforto', 'Priorizar controle de dor, dispneia e sintomas'] },
];

export function assessFrailty(score: number): FrailtyResult {
  return FRAILTY_SCALE.find(f => f.score === score) ?? FRAILTY_SCALE[3];
}

// ─── DETECÇÃO DE POLIFARMÁCIA ─────────────────────────────────

export function detectPolypharmacy(medicamentos: string[]): {
  n: number;
  classificacao: 'normal' | 'polifarmacia' | 'hiperpolifarmacia';
  alerta: string;
  acaoRecomendada: string;
} {
  const n = medicamentos.length;
  if (n >= 10) return {
    n, classificacao: 'hiperpolifarmacia',
    alerta: `Hiperpolifarmácia: ${n} medicamentos ativos`,
    acaoRecomendada: 'Revisão urgente com critérios STOPP/START. Identificar duplicidades terapêuticas, prescrições em cascata e medicamentos sem indicação atual.',
  };
  if (n >= 5) return {
    n, classificacao: 'polifarmacia',
    alerta: `Polifarmácia: ${n} medicamentos ativos`,
    acaoRecomendada: 'Revisão semestral. Aplicar STOPP/Beers. Identificar medicamentos passíveis de deprescrição.',
  };
  return {
    n, classificacao: 'normal',
    alerta: `${n} medicamentos — sem critério de polifarmácia`,
    acaoRecomendada: 'Monitoramento clínico de rotina.',
  };
}

// ─── ALGORITMO DE DEPRESCRIÇÃO ────────────────────────────────

export const DEPRESCRIBING_PROTOCOLS: Record<string, {
  nome: string;
  prioridade: 'alta' | 'media' | 'baixa';
  razao: string;
  reducaoGradual: boolean;
  esquema?: string;
  monitoramento: string;
}> = {
  'benzodiazepínico': {
    nome: 'Benzodiazepínico',
    prioridade: 'alta',
    razao: 'Risco de quedas, delirium, dependência. Sem benefício em insônia crônica após 4 semanas.',
    reducaoGradual: true,
    esquema: 'Reduzir 25% da dose a cada 2 semanas. Trocar por BZD de meia-vida curta (lorazepam) antes de reduzir. Total: 8–16 semanas.',
    monitoramento: 'Sintomas de abstinência (ansiedade, sudorese, tremor). Sono subjetivo.',
  },
  'ibp': {
    nome: 'Inibidor de Bomba de Prótons',
    prioridade: 'media',
    razao: 'Uso sem indicação clara > 8 semanas. Risco de hipomagnesemia, C. difficile, fraturas.',
    reducaoGradual: true,
    esquema: 'Reduzir dose pela metade por 4 semanas → então dia alternado por 4 semanas → suspender. Sintomas de rebote: reassegurar e manter desmame.',
    monitoramento: 'Sintomas de refluxo/dispepsia. Hipomagnesemia se uso > 1 ano.',
  },
  'estatina': {
    nome: 'Estatina',
    prioridade: 'media',
    razao: 'Prevenção primária em ≥ 75 anos frágeis com expectativa de vida < 5 anos: benefício incerto.',
    reducaoGradual: false,
    esquema: 'Pode-se suspender diretamente. Discutir com paciente/família.',
    monitoramento: 'Sintomas musculares após reinício se necessário.',
  },
  'anti-hipertensivo': {
    nome: 'Anti-hipertensivo (1+ agentes)',
    prioridade: 'media',
    razao: 'Hipotensão ortostática, quedas. PAS < 130 em idoso frágil aumenta mortalidade.',
    reducaoGradual: true,
    esquema: 'Reduzir um agente por vez. Começar pelo mais recente ou pelo de maior dose. Monitorar PA em 2 semanas.',
    monitoramento: 'PA em posição supina e após 1–3 min em pé. Sintomas ortostáticos.',
  },
  'sulfonilureia': {
    nome: 'Sulfonilureia',
    prioridade: 'alta',
    razao: 'Hipoglicemia grave em idosos com alimentação irregular, DRC ou hepatopatia.',
    reducaoGradual: false,
    esquema: 'Substituir por DPP-4 inibidor ou ajustar para glicazida se sulfonilureia for necessária.',
    monitoramento: 'Glicemia em jejum e HbA1c. Sintomas de hipoglicemia.',
  },
  'antipsicótico': {
    nome: 'Antipsicótico (demência)',
    prioridade: 'alta',
    razao: 'Mortalidade aumentada, AVC, parkinsonismo farmacológico. Indicação off-label em demência.',
    reducaoGradual: true,
    esquema: 'Reduzir 25% a cada 2 semanas se BPSD controlado por ≥ 3 meses. Manter se psicose ou agressividade grave.',
    monitoramento: 'Comportamento, sintomas extrapiramidais, sedação.',
  },
};

export function generateDeprescribingPlan(
  profile: PatientProfile,
): DeprescribingPlan[] {
  const plans: DeprescribingPlan[] = [];
  const meds = profile.medicamentosAtivos.map(m => m.toLowerCase());

  for (const [key, proto] of Object.entries(DEPRESCRIBING_PROTOCOLS)) {
    const found = meds.find(m => m.includes(key) || key.includes(m));
    if (found) {
      plans.push({
        medicamentoId: found,
        medicamentoNome: proto.nome,
        prioridade: proto.prioridade,
        razao: proto.razao,
        estrategia: proto.esquema ?? 'Consultar protocolo específico',
        monitoramento: proto.monitoramento,
        reducaoGradual: proto.reducaoGradual,
      });
    }
  }

  // Priorizar por: alta > media > baixa
  return plans.sort((a, b) =>
    (a.prioridade === 'alta' ? 0 : a.prioridade === 'media' ? 1 : 2) -
    (b.prioridade === 'alta' ? 0 : b.prioridade === 'media' ? 1 : 2)
  );
}

// ─── AJUSTE GERIÁTRICO DE DOSE ("Start Low, Go Slow") ─────────

export interface GeriatricDoseAdjustment {
  classe: string;
  principio: string;
  doseInicial: string;
  ajusteRenal?: string;
  ajusteHepatico?: string;
  observacao?: string;
}

export const GERIATRIC_DOSE_PRINCIPLES: GeriatricDoseAdjustment[] = [
  { classe: 'Benzodiazepínico', principio: 'Se absolutamente necessário: metade da dose adulta', doseInicial: '50% da dose usual adulto', ajusteRenal: 'Não necessário (metabolismo hepático)', observacao: 'Lorazepam preferível (metabolismo direto por conjugação — sem acúmulo)' },
  { classe: 'IECA/BRA', principio: 'Iniciar com 50% da dose usual. Titular lentamente', doseInicial: 'Enalapril 2,5 mg/dia → titular até 10 mg', ajusteRenal: 'TFG < 30: reduzir 50%; monitorar K e creatinina', observacao: 'Risco de hipercalemia e IRA em DRC' },
  { classe: 'Diurético tiazídico', principio: 'HCTZ ou clortalidona — iniciar dose baixa', doseInicial: 'Clortalidona 12,5 mg/dia ou HCTZ 12,5 mg/dia', ajusteRenal: 'Tiazídicos perdem eficácia se TFG < 30 — trocar por furosemida', observacao: 'Hiponatremia dilucional mais comum em idosas' },
  { classe: 'Opioide', principio: '"Start low, go slow" — reduzir 25–50% em idosos', doseInicial: 'Morfina 2,5 mg VO 4/4h (vs 5–10 mg em adultos)', ajusteRenal: 'DRC: evitar morfina (metabólitos ativos acumulam). Preferir hidromorfona.', observacao: 'Sempre prescrever laxativo junto' },
  { classe: 'Antidepressivo ISRS', principio: 'Dose usual eficaz — monitorar hiponatremia', doseInicial: 'Sertralina 25–50 mg → 50–100 mg. Escitalopram 5–10 mg → 10 mg.', ajusteRenal: 'Ajuste não necessário', observacao: 'Paroxetina: alta atividade anticolinérgica — evitar em idosos' },
  { classe: 'Anticoagulante (NOAC)', principio: 'Dose reduzida em ≥ 80 anos ou peso < 60 kg', doseInicial: 'Apixabana 2,5 mg 2×/dia se ≥ 2: idade ≥ 80 anos, peso ≤ 60 kg, creat ≥ 1,5', ajusteRenal: 'Dabigatrana: evitar se TFG < 30. Rivaroxabana e apixabana: reduzir se TFG 15–50', observacao: 'Monitorar função renal a cada 6–12 meses' },
];

// ─── RASTREAMENTO DE PIM (Potentially Inappropriate Medications) ─

export function screenPIMs(profile: PatientProfile): PIMResult[] {
  const results: PIMResult[] = [];
  const meds = profile.medicamentosAtivos.map(m => m.toLowerCase());

  // Beers screening
  for (const beers of BEERS_2023) {
    for (const drug of beers.medicamentos) {
      if (meds.some(m => m.includes(drug.toLowerCase()) || drug.toLowerCase().includes(m))) {
        results.push({
          tipo: 'beers',
          id: beers.id,
          medicamento: drug,
          alerta: `[BEERS 2023] ${beers.risco}`,
          severidade: beers.evidencia === 'forte' ? 'alta' : 'moderada',
          recomendacao: beers.excecoes
            ? `${beers.recomendacao.toUpperCase()} — exceto: ${beers.excecoes}`
            : beers.recomendacao.toUpperCase(),
        });
        break;
      }
    }
  }

  // STOPP screening
  for (const stopp of STOPP_V3) {
    for (const drug of stopp.medicamentosAlvo) {
      if (meds.some(m => m.includes(drug.toLowerCase()) || drug.toLowerCase().includes(m))) {
        const aplicavel =
          (stopp.id === 'stopp-b1' && profile.quedaUltimoAno) ||
          (stopp.id === 'stopp-b3' && profile.demencia) ||
          (stopp.id === 'stopp-b2' && profile.diagnosticos.some(d => d.toLowerCase().includes('parkinson'))) ||
          (!stopp.id.startsWith('stopp-b'));
        if (aplicavel) {
          results.push({
            tipo: 'stopp',
            id: stopp.id,
            medicamento: drug,
            alerta: `[STOPP v3] ${stopp.criterio}: ${stopp.racionaleClinico}`,
            severidade: 'alta',
            recomendacao: `Considerar suspensão ou substituição — ${stopp.condicao}`,
          });
          break;
        }
      }
    }
  }

  // START screening (alertas de omissão)
  for (const start of START_V3) {
    const indicado = start.medicamentosRecomendados.some(r =>
      meds.some(m => m.includes(r.toLowerCase()) || r.toLowerCase().includes(m))
    );
    if (!indicado) {
      const relevante =
        (start.id === 'start-a1' && profile.diagnosticos.some(d => d.toLowerCase().includes('fibrilação'))) ||
        (start.id === 'start-a2' && profile.diagnosticos.some(d => d.toLowerCase().includes('insuficiencia cardiaca'))) ||
        (start.id === 'start-d2' && profile.demencia) ||
        false;
      if (relevante) {
        results.push({
          tipo: 'start',
          id: start.id,
          medicamento: start.medicamentosRecomendados[0],
          alerta: `[START v3] Medicamento potencialmente omitido: ${start.indicacao}`,
          severidade: 'moderada',
          recomendacao: `Considerar iniciar ${start.medicamentosRecomendados.join(' ou ')} — ${start.racionaleClinico}`,
        });
      }
    }
  }

  return results;
}

// ─── CALCULADORA DE COCKROFT-GAULT (para idosos) ─────────────
export function calcClCrCockcroft(
  idadeAnos: number,
  pesoKg: number,
  creatininaUmolL: number,
  sexo: 'M' | 'F',
): number {
  const creatMgDl = creatininaUmolL / 88.42;
  const base = ((140 - idadeAnos) * pesoKg) / (72 * creatMgDl);
  return sexo === 'F' ? base * 0.85 : base;
}
