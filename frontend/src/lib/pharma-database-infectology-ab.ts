// ============================================================
// PRESCREVE-AI — Extensão Farmacológica: INFECTOLOGIA (Phase 21.5) — Parte A
// Antibacterianos: Penicilinas · Cefalosporinas · Macrolídeos · Nitroimidazóis
//                 Tetraciclinas · Sulfonamidas · Carbapenêmicos
//                 Glicopeptídeos · Oxazolidinonas · Lincosamidas
// Campos adicionais: espectro · mic_breakpoints · resistencia · guidelines_referencia
// ============================================================

import type { QuickDrug } from './pharma-database';

export const PHARMA_DB_INFECTOLOGY_AB: QuickDrug[] = [

  // ══════════════════════════════════════════════════════════════
  // PENICILINAS
  // ══════════════════════════════════════════════════════════════

  {
    id: 'piperacilina_tazobactam',
    molecula: 'Piperacilina/Tazobactam',
    nome_generico: 'Piperacilina Sódica + Tazobactam Sódico',
    sinonimos: ['pip-tazo', 'tazocin', 'piperacilina tazobactam', 'pipetazo', 'beta-lactamico antipseudomonal'],
    categoria: 'antibiotico',
    classe: 'Penicilina',
    subclasse: 'Ureidopenicilina + inibidor de beta-lactamase (Tazobactam) — antipseudomonal',
    indicacoes_principais: [
      'Pneumonia hospitalar / PAV (Pseudomonas, Enterobactérias, anaeróbios)',
      'Infecções intra-abdominais complicadas (peritonite, abscesso)',
      'Sepse hospitalar de foco abdominal, urinário ou pulmonar',
      'Infecções de pele e partes moles complicadas',
      'Neutropenia febril (empiricamente)',
    ],
    dose_adulto: {
      habitual: '4,5 g IV a cada 6h (4h de infusão)',
      min: '2,25 g IV q6h',
      max: '18 g/dia',
      unidade: 'g',
      via: 'IV',
      frequencias: ['q6h (4h de infusão estendida — PK/PD)', 'q8h (infecções menos graves)'],
      instrucoes: 'Infusão estendida 4h (30 min em bolus NÃO otimiza %T>MIC): alvo PK/PD é >50% T>MIC. Para Pseudomonas suspeita: preferir infusão estendida. Reconstituir em SF 0,9% ou SG 5%.',
    },
    ajuste_renal: {
      normal: '4,5 g q6h (infusão 4h)',
      tfg_60_30: '4,5 g q8h',
      tfg_30_15: '4,5 g q12h',
      tfg_lt_15: '2,25–4,5 g q12h. Hemodiálise: dose após cada sessão',
      dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste — excreção biliar/renal' },
    contraindicacoes_rapidas: ['Hipersensibilidade a penicilinas (alergia documentada grave)', 'Histórico de anafilaxia a beta-lactâmicos'],
    interacoes_importantes: [
      { com: 'Metotrexato', severidade: 'grave', descricao: 'Pip-tazo reduz excreção renal do metotrexato — toxicidade' },
      { com: 'Vancomicina', severidade: 'moderada', descricao: 'Associação controversa em nefrotoxicidade — monitorar creatinina' },
      { com: 'Anticoagulantes (varfarina)', severidade: 'moderada', descricao: 'Pip-tazo pode prolongar tempo de protrombina' },
    ],
    alertas_especiais: [
      'INFUSÃO ESTENDIDA: 4h > 30 min — melhora desfechos em infecções por Pseudomonas e ESBL (maior %T>MIC)',
      'SUPERCOBERTURA: eficaz contra Enterobactérias produtoras de ESBL em alguns estudos, mas não substitui carbapenêmico em sepse grave',
      'Hiponatremia dilucional: alto teor de sódio (2,35 mEq/g de pip) — monitorar Na+ em IC e DRC',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    espectro: [
      'Gram-positivos: Streptococcus spp, Staphylococcus aureus sensível à meticilina (MSSA)',
      'Gram-negativos: E. coli, Klebsiella, Enterobacter, Pseudomonas aeruginosa, Acinetobacter (variável)',
      'Anaeróbios: Bacteroides fragilis, Clostridium spp',
      'NÃO cobre: MRSA, Enterococcus faecium resistente, CRAB (Acinetobacter resistente)',
    ],
    mic_breakpoints: {
      'E. coli (EUCAST 2023)': 'S ≤ 8 mg/L · R > 8 mg/L',
      'P. aeruginosa (EUCAST 2023)': 'S ≤ 16 mg/L · R > 16 mg/L',
      'K. pneumoniae': 'S ≤ 8 mg/L · R > 8 mg/L',
    },
    resistencia: [
      'Beta-lactamases de espectro estendido (ESBL) — tazobactam inibe parcialmente',
      'AmpC desreprimida (Enterobacter, Serratia) — pip-tazo instável',
      'Carbapenemases (KPC, NDM, OXA-48) — resistência plena',
      'Pseudomonas: bombas de efluxo MexAB-OprM, MexCD-OprJ, perda de OprD',
    ],
    guidelines_referencia: [
      'IDSA: Healthcare-Associated Pneumonia Guidelines 2016',
      'SCCM: Surviving Sepsis Campaign 2021',
      'ANVISA: Protocolo de Gerenciamento do Uso de Antimicrobianos 2021',
      'SBPC/ML: Guia de Antibioticoterapia Hospitalar 2022',
    ],
    marcas: [
      { nome: 'Tazocin®', laboratorio: 'Pfizer', concentracoes: ['2,25 g', '4,5 g'], formas: ['Pó para solução injetável'] },
      { nome: 'Pip-Tazo EMS', laboratorio: 'EMS', concentracoes: ['2,25 g', '4,5 g'], formas: ['Pó injetável'] },
    ],
  },

  {
    id: 'ampicilina_sulbactam',
    molecula: 'Ampicilina/Sulbactam',
    nome_generico: 'Ampicilina Sódica + Sulbactam Sódico',
    sinonimos: ['amp-sul', 'unasyn', 'ampicilina sulbactam', 'ampicilina inibidor'],
    categoria: 'antibiotico',
    classe: 'Penicilina',
    subclasse: 'Aminopenicilina + inibidor de beta-lactamase (Sulbactam)',
    indicacoes_principais: [
      'Infecções intra-abdominais (peritonite, diverticulite)',
      'Pneumonia aspirativa / anaeróbios de orofaringe',
      'Infecções ginecológicas (DIP, endometrite pós-parto)',
      'Acinetobacter baumannii sensível (sulbactam tem atividade intrínseca)',
    ],
    dose_adulto: {
      habitual: '3 g IV q6h (1,5–3 g a cada 6h)',
      min: '1,5 g IV q6h',
      max: '12 g/dia (ampicilina) + 4 g/dia (sulbactam)',
      unidade: 'g',
      via: 'IV',
      frequencias: ['q6h (IV)', 'q8h (infecções menos graves)'],
      instrucoes: 'Proporção 2:1 (ampicilina:sulbactam). 1,5 g = 1 g ampicilina + 0,5 g sulbactam; 3 g = 2 g + 1 g. Infundir em 15–30 min.',
    },
    ajuste_renal: {
      normal: '3 g q6h',
      tfg_60_30: '3 g q8–12h',
      tfg_30_15: '3 g q24h',
      tfg_lt_15: '1,5 g q24h. Suplementar após hemodiálise',
      dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Cautela' },
    contraindicacoes_rapidas: ['Hipersensibilidade a penicilinas'],
    interacoes_importantes: [
      { com: 'Alopurinol', severidade: 'moderada', descricao: 'Aumento da incidência de rash cutâneo' },
      { com: 'Metotrexato', severidade: 'grave', descricao: 'Reduz excreção renal do metotrexato' },
    ],
    alertas_especiais: [
      'Sulbactam tem atividade intrínseca contra Acinetobacter baumannii — opção em cenários de CRAb (carbapenem-resistant Acinetobacter)',
      'Alta resistência de E. coli à ampicilina em ITU comunitária no Brasil (> 40%) — não usar empiricamente para ITU',
      'Rash cutâneo frequente em mononucleose por EBV (não é alergia — não contraindicar penicilinas no futuro)',
    ],
    uso_gestante: 'seguro',
    uso_lactante: 'seguro',
    espectro: [
      'Gram-positivos: Streptococcus spp, MSSA, Enterococcus faecalis',
      'Gram-negativos: E. coli produtora de beta-lactamase, H. influenzae, M. catarrhalis, Acinetobacter spp (sulbactam)',
      'Anaeróbios: Bacteroides fragilis, Clostridium spp, Fusobacterium',
      'NÃO cobre: MRSA, Pseudomonas, Enterococcus faecium, ESBL de alto nível',
    ],
    mic_breakpoints: {
      'E. coli (EUCAST)': 'S ≤ 8 mg/L · R > 8 mg/L',
      'A. baumannii (sulbactam)': 'S ≤ 4 mg/L (sulbactam isolado)',
    },
    resistencia: [
      'Beta-lactamases TEM, SHV (inibidas pelo sulbactam)',
      'ESBL e AmpC — sulbactam insuficiente',
      'Carbapenemases — resistência plena',
    ],
    guidelines_referencia: [
      'IDSA: Intra-Abdominal Infections Guidelines 2010 (updated 2022)',
      'ISDA: HAP/VAP Guidelines 2016 (Acinetobacter)',
    ],
    marcas: [
      { nome: 'Unasyn®', laboratorio: 'Pfizer', concentracoes: ['1,5 g', '3 g'], formas: ['Pó para solução injetável'] },
      { nome: 'Amp-Sul EMS', laboratorio: 'EMS', concentracoes: ['1,5 g', '3 g'], formas: ['Pó injetável'] },
    ],
  },

  {
    id: 'oxacilina',
    molecula: 'Oxacilina',
    nome_generico: 'Sódio de Oxacilina',
    sinonimos: ['oxacilina', 'penicilinase-resistente', 'anti-estafilococo', 'mssa tratamento'],
    categoria: 'antibiotico',
    classe: 'Penicilina',
    subclasse: 'Isoxazolilpenicilina — resistente à penicilinase estafilocócica',
    indicacoes_principais: [
      'Infecções por Staphylococcus aureus sensível à oxacilina (MSSA) — bacteremia, endocardite, osteoartrite',
      'Infecções de pele/partes moles graves por MSSA',
      'Pneumonia por MSSA',
    ],
    dose_adulto: {
      habitual: '2 g IV q4h (endocardite/bacteremia)',
      min: '1 g IV q6h',
      max: '12 g/dia',
      unidade: 'g',
      via: 'IV',
      frequencias: ['q4h (infecções graves — endocardite)', 'q6h (infecções moderadas)'],
      instrucoes: 'Endocardite por MSSA: oxacilina 2 g IV q4h por 4–6 semanas é padrão-ouro. Infundir em 30–60 min. Alto teor de sódio — cuidado em IC/DRC.',
    },
    ajuste_renal: {
      normal: '2 g q4h',
      tfg_60_30: 'Sem ajuste (excreção biliar predominante)',
      tfg_30_15: 'Sem ajuste',
      tfg_lt_15: 'Sem ajuste — excreção biliar',
      dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela — excreção biliar', child_b: 'Reduzir intervalo monitorar', child_c: 'Reduzir dose' },
    contraindicacoes_rapidas: ['Hipersensibilidade a penicilinas'],
    interacoes_importantes: [
      { com: 'Rifampicina', severidade: 'moderada', descricao: 'Sinergismo em biofilme estafilocócico (próteses) — associação off-label justificada' },
      { com: 'Aminoglicosídeos', severidade: 'leve', descricao: 'Sinergismo em endocardite — necessário estudo de sensibilidade' },
    ],
    alertas_especiais: [
      'DROGA DE ELEIÇÃO para MSSA grave — vancomicina é INFERIOR para MSSA (maior falha terapêutica)',
      'Hepatotoxicidade: elevação de transaminases em 5–10% — monitorar TGO/TGP a cada 7 dias',
      'Flebite: comum em acesso periférico — usar acesso central em uso prolongado',
      'MRSA: totalmente resistente — não usar',
    ],
    uso_gestante: 'seguro',
    uso_lactante: 'seguro',
    espectro: [
      'Staphylococcus aureus MSSA (principal indicação)',
      'Staphylococcus coagulase-negativos MSSE (S. epidermidis sensível)',
      'Streptococcus pyogenes, S. agalactiae',
      'NÃO cobre: MRSA, MRSE, gram-negativos, anaeróbios',
    ],
    mic_breakpoints: {
      'S. aureus (CLSI 2023)': 'S ≤ 2 mg/L · R ≥ 4 mg/L',
    },
    resistencia: [
      'MRSA: mecA/mecC — PBP2a com baixa afinidade a todos os beta-lactâmicos',
      'Beta-lactamase estafilocócica: NÃO degrada oxacilina (estável)',
    ],
    guidelines_referencia: [
      'AHA/IDSA: Endocardite Infecciosa 2023',
      'IDSA: SSTI Guidelines 2014 (updated 2019)',
    ],
    marcas: [
      { nome: 'Oxacilina EMS', laboratorio: 'EMS', concentracoes: ['500 mg', '1 g', '2 g'], formas: ['Pó injetável'] },
      { nome: 'Oxacilina Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['500 mg', '1 g', '2 g'], formas: ['Pó injetável'], lab_id: 'eurofarma' },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // CEFALOSPORINAS
  // ══════════════════════════════════════════════════════════════

  {
    id: 'cefalexina',
    molecula: 'Cefalexina',
    nome_generico: 'Cefalexina Monoidratada',
    sinonimos: ['keflex', 'cefalexina', 'cefalosporina oral', '1a geracao', 'pele infeccao'],
    categoria: 'antibiotico',
    classe: 'Cefalosporina',
    subclasse: '1ª Geração — oral',
    indicacoes_principais: [
      'Infecções de pele e partes moles por MSSA/Streptococcus (impetigo, erisipela, celulite leve)',
      'ITU não complicada por E. coli/Klebsiella em gestantes',
      'Profilaxia cirúrgica (oral — limitada)',
    ],
    dose_adulto: {
      habitual: '500 mg VO q6h',
      min: '250 mg q6h',
      max: '4 g/dia',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['q6h (padrão)', 'q8h (infecções leves)'],
      instrucoes: 'Pele/partes moles: 500 mg q6h por 5–7 dias. ITU gestante: 500 mg q6h por 7 dias. Pode tomar com alimento.',
    },
    ajuste_renal: {
      normal: '500 mg q6h',
      tfg_60_30: '500 mg q8–12h',
      tfg_30_15: '250–500 mg q12–24h',
      tfg_lt_15: '250 mg q12–24h. Suplementar após hemodiálise',
      dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    contraindicacoes_rapidas: ['Hipersensibilidade a cefalosporinas', 'Anafilaxia prévia a penicilinas (cross-reatividade ~1%)'],
    interacoes_importantes: [
      { com: 'Metformina', severidade: 'leve', descricao: 'Cefalexina compete com transporte tubular da metformina — monitorar glicemia' },
    ],
    alertas_especiais: [
      'MRSA: NÃO cobre — não usar empiricamente em celulite com fatores de risco para MRSA',
      'Cross-reatividade penicilina: risco real de ~1–2% (não 10% como antigamente citado)',
      'Melhor tolerabilidade GI que amoxicilina em alguns pacientes',
    ],
    uso_gestante: 'seguro',
    uso_lactante: 'seguro',
    espectro: [
      'Gram-positivos: MSSA, Streptococcus pyogenes, S. agalactiae, S. pneumoniae (moderado)',
      'Gram-negativos limitados: E. coli, Klebsiella pneumoniae (sensíveis), Proteus mirabilis',
      'NÃO cobre: MRSA, Enterococcus, Pseudomonas, H. influenzae, anaeróbios',
    ],
    mic_breakpoints: {
      'S. aureus MSSA (CLSI)': 'S ≤ 2 mg/L · R ≥ 8 mg/L',
      'E. coli': 'S ≤ 2 mg/L · R ≥ 8 mg/L',
    },
    resistencia: [
      'Beta-lactamases de amplo espectro (ESBL) — resistência',
      'MRSA — resistência total (mecA)',
    ],
    guidelines_referencia: [
      'IDSA: SSTI Guidelines 2014',
      'IDSA: UTI Guidelines 2011 (gestante)',
    ],
    marcas: [
      { nome: 'Keflex®', laboratorio: 'Pfizer', concentracoes: ['250 mg', '500 mg'], formas: ['Cápsula', 'Pó para suspensão'] },
      { nome: 'Cefalexina Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['500 mg'], formas: ['Cápsula'], lab_id: 'eurofarma' },
    ],
  },

  {
    id: 'cefazolina',
    molecula: 'Cefazolina',
    nome_generico: 'Cefazolina Sódica',
    sinonimos: ['kefzol', 'cefazolina', 'cefalosporina profilaxia', '1a geracao iv', 'profilaxia cirurgica'],
    categoria: 'antibiotico',
    classe: 'Cefalosporina',
    subclasse: '1ª Geração — IV — padrão-ouro para profilaxia cirúrgica',
    indicacoes_principais: [
      'Profilaxia cirúrgica (cirurgia cardíaca, ortopédica, abdominal limpa-contaminada)',
      'Endocardite por MSSA (alternativa à oxacilina em alergia a penicilina não anafilática)',
      'Bacteremia por MSSA (alternativa — menor dose e maior T½ que oxacilina)',
    ],
    dose_adulto: {
      habitual: '2 g IV antes da cirurgia (profilaxia)',
      min: '1 g IV',
      max: '6 g/dia',
      unidade: 'g',
      via: 'IV',
      frequencias: ['Profilaxia: dose única 30–60 min antes da incisão + repetir q3–4h em cirurgias longas', 'Tratamento: q8h'],
      instrucoes: 'Profilaxia: 2 g IV 30–60 min pré-incisão. Repetir 2 g IV q4h em cirurgias > 4h ou sangramento > 1,5 L. Paciente > 120 kg: 3 g. Infundir em 15–30 min.',
    },
    ajuste_renal: {
      normal: '1–2 g q8h',
      tfg_60_30: '1 g q12h',
      tfg_30_15: '500 mg q12h',
      tfg_lt_15: '500 mg q24h. Suplementar após hemodiálise',
      dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    contraindicacoes_rapidas: ['Hipersensibilidade a cefalosporinas', 'Anafilaxia a penicilinas'],
    interacoes_importantes: [
      { com: 'Aminoglicosídeos', severidade: 'leve', descricao: 'Possível sinergismo — sepse por gram-positivos' },
    ],
    alertas_especiais: [
      'PROFILAXIA CIRÚRGICA: fármaco de primeira escolha em cirurgias limpas e limpo-contaminadas (consenso mundial)',
      'Vantagem sobre oxacilina para tratamento de MSSA: T½ maior (1,8h vs 0,5h) → menos doses; menor hepatotoxicidade',
      'NÃO usar em MRSA — sem atividade',
    ],
    uso_gestante: 'seguro',
    uso_lactante: 'seguro',
    espectro: [
      'Gram-positivos: MSSA, Streptococcus spp (excelente)',
      'Gram-negativos: E. coli, K. pneumoniae, P. mirabilis (sensíveis)',
      'NÃO cobre: MRSA, Enterococcus, Pseudomonas, ESBL, anaeróbios',
    ],
    mic_breakpoints: {
      'S. aureus MSSA': 'S ≤ 2 mg/L · R ≥ 8 mg/L',
      'E. coli': 'S ≤ 1 mg/L',
    },
    resistencia: [
      'MRSA: mecA — resistência total',
      'ESBL: resistência total',
    ],
    guidelines_referencia: [
      'ASHP/IDSA/SIS/SHEA: Surgical Antibiotic Prophylaxis 2023',
      'AHA: Endocardite Infecciosa 2023',
    ],
    marcas: [
      { nome: 'Kefzol®', laboratorio: 'Abbott', concentracoes: ['500 mg', '1 g', '2 g'], formas: ['Pó injetável'] },
      { nome: 'Cefazolina Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['1 g', '2 g'], formas: ['Pó injetável'], lab_id: 'eurofarma' },
    ],
  },

  {
    id: 'ceftriaxona',
    molecula: 'Ceftriaxona',
    nome_generico: 'Ceftriaxona Dissódica',
    sinonimos: ['rocefin', 'ceftriaxone', 'ceftriaxona', '3a geracao', 'rocephin', 'meningite antibiotico'],
    categoria: 'antibiotico',
    classe: 'Cefalosporina',
    subclasse: '3ª Geração — meia-vida longa (8h) → 1x/dia. Excreção biliar 40%',
    indicacoes_principais: [
      'Meningite bacteriana (S. pneumoniae, N. meningitidis, H. influenzae)',
      'Pneumonia adquirida na comunidade (PAC) hospitalar',
      'Infecções gonocócicas (gonorreia, DIP)',
      'Sepse comunitária (foco urinário, pulmonar, intra-abdominal)',
      'Febre tifoide e bacteremia por Salmonella typhi',
      'Doença de Lyme disseminada',
      'Neurossífilis (alternativa à penicilina G)',
    ],
    dose_adulto: {
      habitual: '1–2 g IV 1x/dia',
      min: '1 g IV/IM 1x/dia',
      max: '4 g/dia (meningite)',
      unidade: 'g',
      via: 'IV',
      frequencias: ['1x/dia (PAC, ITU, gonorreia)', '2x/dia (meningite: 2 g q12h)'],
      instrucoes: 'Meningite: 2 g IV q12h (4 g/dia). PAC moderada-grave: 1–2 g IV 1x/dia. Gonorreia: 500 mg IM dose única. NÃO misturar com Ca2+ (neonatos: precipitação). Infundir em 30 min (IV).',
    },
    ajuste_renal: {
      normal: '1–2 g 1x/dia',
      tfg_60_30: 'Sem ajuste (excreção biliar)',
      tfg_30_15: 'Sem ajuste — ajustar somente se hepatopata concomitante',
      tfg_lt_15: 'Máximo 2 g/dia. Não suplementar após diálise',
      dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Máximo 2 g/dia', child_c: 'Máximo 2 g/dia + monitorar' },
    contraindicacoes_rapidas: [
      'Hipersensibilidade a cefalosporinas',
      'Neonatos com hiperbilirrubinemia (compete com bilirrubina na albumina)',
      'NÃO usar com soluções de cálcio IV simultaneamente em qualquer faixa etária',
    ],
    interacoes_importantes: [
      { com: 'Soluções de cálcio IV (Ringer lactato, gluconato de Ca)', severidade: 'contraindicado', descricao: 'Precipitação de sal de ceftriaxona-cálcio — oclusão de linha e êmbolo' },
      { com: 'Varfarina', severidade: 'moderada', descricao: 'Pode prolongar tempo de protrombina — monitorar INR' },
    ],
    alertas_especiais: [
      'Colelitíase/colecistite pseudolítica (barro biliar): precipitação de sal cálcico na vesícula — assintomática na maioria, reversível',
      'Espectro anti-gram-negativo superior às 1ª e 2ª gerações — cobre H. influenzae, N. gonorrhoeae, N. meningitidis',
      'Não cobre Pseudomonas aeruginosa (diferente de ceftazidima/cefepima)',
    ],
    uso_gestante: 'seguro',
    uso_lactante: 'seguro',
    espectro: [
      'Gram-positivos: S. pneumoniae, S. pyogenes, S. agalactiae (bom)',
      'Gram-negativos: E. coli, K. pneumoniae, H. influenzae, N. meningitidis, N. gonorrhoeae, Salmonella, Shigella, Proteus, Serratia',
      'Neisseria meningitidis: excelente penetração no LCR',
      'NÃO cobre: MRSA, Pseudomonas, Enterococcus, Listeria, ESBL alto nível, anaeróbios',
    ],
    mic_breakpoints: {
      'S. pneumoniae — meningite (CLSI 2023)': 'S ≤ 0,5 mg/L · R ≥ 2 mg/L',
      'Enterobactérias (EUCAST 2023)': 'S ≤ 1 mg/L · R > 2 mg/L',
      'N. gonorrhoeae': 'S ≤ 0,125 mg/L',
    },
    resistencia: [
      'ESBL (TEM, SHV, CTX-M): resistência variável — não usar empiricamente em infecções por ESBL conhecidas',
      'AmpC desreprimida: resistência',
      'Carbapenemases: resistência',
      'N. gonorrhoeae: resistência crescente — monitorar perfil local',
    ],
    guidelines_referencia: [
      'IDSA: Meningite Bacteriana 2004 (updated 2017)',
      'CDC: STI Treatment Guidelines 2021',
      'ATS/IDSA: CAP Guidelines 2019',
      'IDSA: Febre Tifoide 2004',
    ],
    marcas: [
      { nome: 'Rocefin®', laboratorio: 'Roche', concentracoes: ['250 mg', '500 mg', '1 g', '2 g'], formas: ['Pó injetável'], lab_id: 'roche' },
      { nome: 'Ceftriaxona Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['500 mg', '1 g', '2 g'], formas: ['Pó injetável'], lab_id: 'eurofarma' },
      { nome: 'Ceftriaxona EMS', laboratorio: 'EMS', concentracoes: ['500 mg', '1 g', '2 g'], formas: ['Pó injetável'] },
    ],
  },

  {
    id: 'cefepima',
    molecula: 'Cefepima',
    nome_generico: 'Cloridrato de Cefepima',
    sinonimos: ['maxipime', 'cefepime', '4a geracao', 'cefepima pseudomonas', 'cefalosporina antipseudomonal'],
    categoria: 'antibiotico',
    classe: 'Cefalosporina',
    subclasse: '4ª Geração — atividade antipseudomonal + estabilidade a AmpC',
    indicacoes_principais: [
      'Pneumonia hospitalar / PAV por Pseudomonas',
      'Neutropenia febril (monoterapia empírica)',
      'Meningite nosocomial por gram-negativos',
      'Infecções graves por Enterobactérias resistentes a 3ª geração (AmpC)',
    ],
    dose_adulto: {
      habitual: '2 g IV q8h (infecções graves)',
      min: '1 g IV q12h',
      max: '6 g/dia',
      unidade: 'g',
      via: 'IV',
      frequencias: ['q8h (padrão — infecções graves/Pseudomonas)', 'q12h (infecções moderadas)', 'Infusão estendida 4h otimiza PK/PD'],
      instrucoes: 'Pseudomonas/neutropenia febril: 2 g IV q8h. Meningite: 2 g IV q8h. Infusão estendida (4h) recomendada para Pseudomonas. Infundir em 30 min (padrão) ou 4h (estendida).',
    },
    ajuste_renal: {
      normal: '2 g q8h',
      tfg_60_30: '2 g q12h',
      tfg_30_15: '1 g q12h — monitorar neurotoxicidade',
      tfg_lt_15: '500 mg q24h. Suplementar após diálise',
      dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    contraindicacoes_rapidas: ['Hipersensibilidade a cefalosporinas', 'Insuficiência renal sem ajuste de dose — risco de encefalopatia'],
    interacoes_importantes: [
      { com: 'Aminoglicosídeos', severidade: 'moderada', descricao: 'Nefrotoxicidade aditiva — monitorar creatinina e nível sérico dos aminoglicosídeos' },
    ],
    alertas_especiais: [
      'NEUROTOXICIDADE: encefalopatia, mioclonias, crises convulsivas — especialmente em DRC com dose não ajustada',
      'Diferente de ceftazidima: cefepima cobre melhor gram-positivos (especialmente S. pneumoniae) e é mais estável a AmpC',
      'MRSA e Enterococcus: SEM cobertura',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    espectro: [
      'Gram-positivos: MSSA, S. pneumoniae, Streptococcus spp',
      'Gram-negativos: P. aeruginosa, E. coli, K. pneumoniae, Enterobacter, Serratia, Citrobacter (AmpC estável)',
      'NÃO cobre: MRSA, Enterococcus, ESBL alto nível, KPC/NDM',
    ],
    mic_breakpoints: {
      'P. aeruginosa (EUCAST 2023)': 'S ≤ 8 mg/L · R > 8 mg/L',
      'Enterobactérias (EUCAST 2023)': 'S ≤ 1 mg/L · R > 4 mg/L',
    },
    resistencia: [
      'AmpC: cefepima é estável — vantagem sobre 3ª geração',
      'ESBL: resistência parcial (breakpoints discutidos — não usar se KPC confirmado)',
      'Carbapenemases (KPC, MBL): resistência total',
      'Pseudomonas: bombas de efluxo, perda de OprD, modificação de PBP',
    ],
    guidelines_referencia: [
      'IDSA: HAP/VAP Guidelines 2016',
      'IDSA: Febrile Neutropenia Guidelines 2010 (updated 2023)',
      'IDSA: Management of Difficult-to-treat Infections 2022',
    ],
    marcas: [
      { nome: 'Maxipime®', laboratorio: 'BMS', concentracoes: ['500 mg', '1 g', '2 g'], formas: ['Pó injetável'] },
      { nome: 'Cefepima Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['1 g', '2 g'], formas: ['Pó injetável'], lab_id: 'eurofarma' },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // MACROLÍDEOS / LINCOSAMIDAS
  // ══════════════════════════════════════════════════════════════

  {
    id: 'claritromicina',
    molecula: 'Claritromicina',
    nome_generico: 'Claritromicina',
    sinonimos: ['klaricid', 'clarithromycin', 'claritromicina', 'macrolidio', 'h pylori'],
    categoria: 'antibiotico',
    classe: 'Macrolídeo',
    subclasse: '14-membros — potente inibidor de CYP3A4 + P-gp',
    indicacoes_principais: [
      'H. pylori (esquema triplo: claritromicina + amoxicilina + IBP)',
      'PAC leve sem comorbidades (monoterapia ou + beta-lactâmico)',
      'Infecções por Mycobacterium avium complex (MAC) em imunodeprimidos',
      'Faringoamigdalite por Streptococcus (alérgicos a penicilina)',
      'Sinusite e otite (limitado pela resistência crescente)',
    ],
    dose_adulto: {
      habitual: '500 mg VO q12h',
      min: '250 mg q12h',
      max: '1000 mg/dia (LP: 1000 mg 1x/dia)',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['q12h (convencional)', '1x/dia (LP — liberação prolongada)'],
      instrucoes: 'PAC: 500 mg q12h por 5–7 dias. H. pylori: 500 mg q12h por 14 dias (tripla). MAC profilaxia: 500 mg q12h. LP 1000 mg: 1x/dia com refeição.',
    },
    ajuste_renal: {
      normal: '500 mg q12h',
      tfg_60_30: 'Sem ajuste',
      tfg_30_15: 'Reduzir 50% ou aumentar intervalo',
      tfg_lt_15: '250 mg q12h',
      dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela (metabolismo hepático)', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: [
      'Prolongamento QT ou uso com outros QT-prolongadores',
      'Hipersensibilidade a macrolídeos',
      'Inibidores potentes de CYP3A4 contra-indicados: astemizol, cisaprida, pimozida (torsades)',
    ],
    interacoes_importantes: [
      { com: 'Estatinas (sinvastatina, lovastatina)', severidade: 'grave', descricao: 'Claritromicina inibe CYP3A4 — rabdomiólise. Suspender estatina por 5–7 dias durante o tratamento' },
      { com: 'Varfarina', severidade: 'grave', descricao: 'Aumenta INR — monitorar intensamente' },
      { com: 'Digoxina', severidade: 'grave', descricao: 'Inibe P-gp — aumenta digoxinemia 2× — monitorar' },
      { com: 'Clopidogrel', severidade: 'moderada', descricao: 'Inibe CYP2C19 — reduz ativação do clopidogrel' },
      { com: 'Colchicina', severidade: 'grave', descricao: 'Inibição CYP3A4 + P-gp — toxicidade por colchicina' },
    ],
    alertas_especiais: [
      'Inibidor potente de CYP3A4 e P-gp — MÚLTIPLAS interações críticas: verificar sempre',
      'Resistência ao H. pylori crescente no Brasil (>20%) — verificar perfil local antes de incluir no esquema',
      'Sabor metálico amargo — adesão prejudicada',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'risco',
    espectro: [
      'Gram-positivos: S. pneumoniae, S. pyogenes (resistência crescente), S. aureus (bacteriostático)',
      'Atípicos: Mycoplasma pneumoniae, Chlamydophila pneumoniae, Legionella',
      'H. pylori (em esquema combinado)',
      'Mycobacterium avium complex (MAC)',
      'NÃO cobre: gram-negativos entéricos, Pseudomonas, anaeróbios',
    ],
    mic_breakpoints: {
      'S. pneumoniae (EUCAST)': 'S ≤ 0,25 mg/L · R > 0,5 mg/L',
      'H. pylori': 'S ≤ 0,25 mg/L · R ≥ 1 mg/L',
    },
    resistencia: [
      'S. pneumoniae e S. pyogenes: genes ermB/mef(A) — resistência mediada por ribossoma ou efluxo',
      'H. pylori: mutações no gene 23S rRNA (A2143G/A2142G) — resistência em > 20% no Brasil',
    ],
    guidelines_referencia: [
      'ACG/CAG: H. pylori Treatment Guidelines 2022',
      'ATS/IDSA: CAP Guidelines 2019',
      'IDSA: MAC Guidelines 2020',
    ],
    marcas: [
      { nome: 'Klaricid®', laboratorio: 'Abbott', concentracoes: ['250 mg', '500 mg', '500 mg LP'], formas: ['Comprimido', 'Pó para suspensão'] },
      { nome: 'Claritromicina EMS', laboratorio: 'EMS', concentracoes: ['250 mg', '500 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'clindamicina',
    molecula: 'Clindamicina',
    nome_generico: 'Cloridrato de Clindamicina',
    sinonimos: ['dalacin', 'clindamycin', 'clindamicina', 'lincosamida', 'anaerobio antibiotico'],
    categoria: 'antibiotico',
    classe: 'Lincosamida',
    subclasse: 'Bacteriostática — inibe síntese proteica (50S ribossômico)',
    indicacoes_principais: [
      'Infecções por anaeróbios (abscesso dentário, peritonite, pneumonia aspirativa)',
      'Infecções de pele por MSSA/Streptococcus (alternativa a penicilinas)',
      'MRSA comunitário (junto com SMZ-TMP)',
      'Toxoplasmose (+ pirimetamina — alternativa a sulfadiazina)',
    ],
    dose_adulto: {
      habitual: '300–450 mg VO q6–8h ou 600 mg IV q8h',
      min: '150 mg q6h',
      max: '2,7 g/dia (IV)',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['q6h (VO leve-moderado)', 'q8h (IV)', 'q6h (IV grave)'],
      instrucoes: 'Oral: tomar com água abundante (esofagite se tomado sem líquido). IV: infusão 20–45 min (não bolus — risco de hipotensão). Nunca IV direto.',
    },
    ajuste_renal: {
      normal: 'Sem ajuste (metabolismo hepático)',
      tfg_60_30: 'Sem ajuste',
      tfg_30_15: 'Sem ajuste',
      tfg_lt_15: 'Sem ajuste',
      dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Reduzir dose', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Colite pseudomembranosa por C. difficile prévia por clindamicina'],
    interacoes_importantes: [
      { com: 'Bloqueadores neuromusculares', severidade: 'moderada', descricao: 'Clindamicina potencializa bloqueio neuromuscular' },
    ],
    alertas_especiais: [
      'C. DIFFICILE: antibiótico de MAIOR risco para CDI — monitorar diarreia e suspender se colite',
      'D-zone test: necessário para testar resistência induzível à clindamicina em Staphylococcus',
      'Penetração excelente em ossos e articulações — osteomielite/artrite séptica',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'risco',
    espectro: [
      'Gram-positivos: MSSA, S. pyogenes, S. pneumoniae, Viridans, MRSA comunitário (variável)',
      'Anaeróbios: Bacteroides fragilis, Clostridium spp (NÃO C. difficile), Peptostreptococcus',
      'Protozoa: Toxoplasma gondii, Plasmodium (combinado)',
      'NÃO cobre: gram-negativos entéricos, Pseudomonas, Enterococcus',
    ],
    mic_breakpoints: {
      'S. aureus (CLSI)': 'S ≤ 0,5 mg/L · R ≥ 4 mg/L',
      'Streptococcus (CLSI)': 'S ≤ 0,25 mg/L · R ≥ 1 mg/L',
    },
    resistencia: [
      'Genes erm(A), erm(B), erm(C): metilação do ribossoma — resistência de alto nível; pode ser constitutiva ou induzível',
      'D-zone test detecta resistência induzível — importante no antibiograma',
    ],
    guidelines_referencia: [
      'IDSA: SSTI Guidelines 2014',
      'IDSA: MRSA Guidelines 2011',
    ],
    marcas: [
      { nome: 'Dalacin C®', laboratorio: 'Pfizer', concentracoes: ['150 mg', '300 mg'], formas: ['Cápsula'] },
      { nome: 'Dalacin T® IV', laboratorio: 'Pfizer', concentracoes: ['150 mg/mL'], formas: ['Solução injetável'] },
      { nome: 'Clindamicina EMS', laboratorio: 'EMS', concentracoes: ['150 mg', '300 mg'], formas: ['Cápsula'] },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // NITROIMIDAZÓIS
  // ══════════════════════════════════════════════════════════════

  {
    id: 'metronidazol',
    molecula: 'Metronidazol',
    nome_generico: 'Metronidazol',
    sinonimos: ['flagyl', 'metronidazole', 'metronidazol', 'nitroimidazol', 'anaerobio flagyl', 'trichomonas'],
    categoria: 'antibiotico',
    classe: 'Nitroimidazol',
    subclasse: 'Bactericida + antiparasitário — ativo redução de NO2 por ferredoxina',
    indicacoes_principais: [
      'Vaginite por Trichomonas vaginalis',
      'Vaginose bacteriana (Gardnerella)',
      'Colite por Clostridium difficile (leve-moderada)',
      'Infecções por anaeróbios (abscesso abdominal, peritonite)',
      'H. pylori (substituível por claritromicina no esquema)',
      'Amebíase intestinal e hepática (Entamoeba histolytica)',
      'Giardíase (Giardia intestinalis)',
    ],
    dose_adulto: {
      habitual: '500 mg VO q8h ou 400 mg q8h',
      min: '250 mg q8h',
      max: '2 g/dia',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['q8h (padrão)', '2 g dose única (vaginose/tricomoníase)', 'IV: 500 mg q8h'],
      instrucoes: 'Vaginose/tricomoníase: 500 mg q12h × 7 dias OU 2 g dose única (tratar parceiro). Anaeróbios (IV): 500 mg q8h. CDI leve: 500 mg q8h × 10 dias (vancomicina preferida atualmente).',
    },
    ajuste_renal: {
      normal: '500 mg q8h',
      tfg_60_30: 'Sem ajuste',
      tfg_30_15: 'Sem ajuste — cautela com metabólitos acumulados',
      tfg_lt_15: 'Reduzir dose 50% ou espaçar intervalo',
      dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Reduzir dose 50%', child_c: 'Reduzir 75% — contraindicado em IH grave' },
    contraindicacoes_rapidas: ['Uso com álcool (reação dissulfiram-símile)', '1º trimestre de gravidez (relativo)', 'Hipersensibilidade a nitroimidazóis'],
    interacoes_importantes: [
      { com: 'Álcool (etanol)', severidade: 'grave', descricao: 'Reação dissulfiram-símile: flushing, náuseas, vômitos, taquicardia — EVITAR álcool durante e 48h após o tratamento' },
      { com: 'Varfarina', severidade: 'grave', descricao: 'Inibe CYP2C9 — dobra o INR — monitorar intensamente e reduzir varfarina' },
      { com: 'Lítio', severidade: 'moderada', descricao: 'Reduz clearance do lítio — toxicidade' },
    ],
    alertas_especiais: [
      'SABOR METÁLICO: efeito adverso muito frequente — avisar paciente',
      'NEUROPATIA PERIFÉRICA: com uso prolongado (> 30 dias) — monitorar parestesias',
      'CDI: vancomicina oral (125 mg q6h) é SUPERIOR ao metronidazol para CDI moderada-grave — metronidazol reservado para CDI leve quando vancomicina indisponível',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'risco',
    espectro: [
      'Anaeróbios: Bacteroides fragilis, Clostridium spp, C. difficile, Fusobacterium, Peptostreptococcus',
      'Protozoários: Trichomonas vaginalis, Entamoeba histolytica, Giardia intestinalis',
      'Gram-negativos micro-aerófilos: H. pylori (em esquema)',
      'NÃO cobre: aerobacias gram-positivas, gram-negativos aeróbios',
    ],
    mic_breakpoints: {
      'B. fragilis (CLSI)': 'S ≤ 8 mg/L · R > 8 mg/L',
      'Trichomonas vaginalis': 'S ≤ 1 mg/L',
    },
    resistencia: [
      'Anaeróbios: resistência baixa no Brasil; nim genes em Bacteroides conferem resistência',
      'Trichomonas: resistência emergente (rdxA mutations) — requer dose alta',
    ],
    guidelines_referencia: [
      'CDC: STI Treatment Guidelines 2021',
      'IDSA: CDI Guidelines 2017 (updated 2021)',
      'ACG: H. pylori 2022',
    ],
    marcas: [
      { nome: 'Flagyl®', laboratorio: 'Sanofi', concentracoes: ['250 mg', '400 mg', '500 mg'], formas: ['Comprimido', 'Solução injetável'] },
      { nome: 'Metronidazol EMS', laboratorio: 'EMS', concentracoes: ['250 mg', '400 mg'], formas: ['Comprimido'] },
      { nome: 'Metronidazol Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['400 mg', '500 mg'], formas: ['Comprimido', 'Solução IV'], lab_id: 'eurofarma' },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // TETRACICLINAS
  // ══════════════════════════════════════════════════════════════

  {
    id: 'doxiciclina',
    molecula: 'Doxiciclina',
    nome_generico: 'Cloridrato de Doxiciclina (ou Hiclato)',
    sinonimos: ['vibramicina', 'doxycycline', 'doxiciclina', 'tetraciclina', 'rickettsia', 'chlamydia'],
    categoria: 'antibiotico',
    classe: 'Tetraciclina',
    subclasse: '2ª Geração — semi-sintética, melhor absorção oral e menor quelação com alimentos vs tetraciclina',
    indicacoes_principais: [
      'Rickettsia (FEBRE MACULOSA — droga de eleição)',
      'Chlamydia trachomatis (uretrite/cervicite)',
      'Chlamydophila pneumoniae / psitacose',
      'Doença de Lyme (fase precoce)',
      'Brucelose (+ rifampicina)',
      'Sífilis (alergia à penicilina)',
      'MRSA de pele e partes moles (combinado — off-label)',
    ],
    dose_adulto: {
      habitual: '100 mg VO q12h',
      min: '100 mg 1x/dia',
      max: '200 mg/dia',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['q12h (padrão)', '1x/dia (supressão malária)'],
      instrucoes: 'Tomar com água abundante na posição vertical (evitar esofagite). Pode ser tomado com alimento (melhora tolerabilidade — diferente de tetraciclina simples). Evitar laticínios e antiácidos na mesma hora. Febre Maculosa: iniciar IMEDIATAMENTE sem aguardar exames.',
    },
    ajuste_renal: {
      normal: '100 mg q12h (excreção biliar predominante)',
      tfg_60_30: 'Sem ajuste',
      tfg_30_15: 'Sem ajuste — vantagem em DRC',
      tfg_lt_15: 'Sem ajuste — NÃO acumula (excreção biliar)',
      dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Reduzir dose', child_c: 'Contraindicado — excreção biliar prejudicada' },
    contraindicacoes_rapidas: [
      'Menores de 8 anos (deposição em dentes e ossos — manchas)',
      'Gestação (2º e 3º trimestres — exceto Rickettsia grave)',
      'Hipersensibilidade a tetraciclinas',
    ],
    interacoes_importantes: [
      { com: 'Antiácidos com Al/Mg, Ca2+, Fe, Zinco', severidade: 'moderada', descricao: 'Quelação reduz absorção em > 50% — tomar 2h antes ou 4–6h depois' },
      { com: 'Varfarina', severidade: 'moderada', descricao: 'Pode aumentar INR — monitorar' },
      { com: 'Retinoides (isotretinoína)', severidade: 'grave', descricao: 'Hipertensão intracraniana benigna (pseudotumor cerebri) — contraindicado' },
    ],
    alertas_especiais: [
      'FEBRE MACULOSA BRASILEIRA: iniciar doxiciclina IMEDIATAMENTE na suspeita — atraso aumenta mortalidade (75% sem tratamento)',
      'Fotossensibilidade: evitar exposição solar; usar protetor FPS ≥ 30',
      'EXCEÇÃO PEDIÁTRICA: doxiciclina é a única tetraciclina aceitável em < 8 anos na febre maculosa (benefício > risco)',
      'Esofagite: tomar com 200 mL de água; sentar por 30 min após',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'risco',
    espectro: [
      'Intracelulares: Rickettsia spp, Coxiella burnetii, Chlamydia spp, Ehrlichia',
      'Espiroquetas: Borrelia burgdorferi, Treponema pallidum',
      'Gram-positivos: MSSA, S. pneumoniae (variável)',
      'Gram-negativos: H. influenzae, Vibrio cholerae, Brucella',
      'Atípicos: Mycoplasma, Ureaplasma',
      'NÃO cobre: Pseudomonas, Enterobactérias resistentes, MRSA (discutível)',
    ],
    mic_breakpoints: {
      'Rickettsia spp': 'S ≤ 1 mg/L (clinicamente todos sensíveis)',
      'Chlamydia trachomatis': 'S ≤ 1 mg/L',
    },
    resistencia: [
      'Genes tet(A–D): bombas de efluxo em gram-negativos',
      'tet(M), tet(O): proteção ribossômica em gram-positivos',
    ],
    guidelines_referencia: [
      'CDC: Rickettsial Diseases Treatment 2023',
      'CDC: STI Treatment Guidelines 2021',
      'IDSA: Lyme Disease Guidelines 2020',
      'SVS/MS: Febre Maculosa Brasileira 2019',
    ],
    marcas: [
      { nome: 'Vibramicina®', laboratorio: 'Pfizer', concentracoes: ['100 mg'], formas: ['Cápsula', 'Comprimido'] },
      { nome: 'Doxiciclina EMS', laboratorio: 'EMS', concentracoes: ['100 mg'], formas: ['Cápsula'] },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // SULFONAMIDAS
  // ══════════════════════════════════════════════════════════════

  {
    id: 'smz_tmp',
    molecula: 'Sulfametoxazol/Trimetoprima',
    nome_generico: 'Sulfametoxazol + Trimetoprima (SMZ-TMP / Cotrimoxazol)',
    sinonimos: ['bactrim', 'sulfametoxazol trimetoprima', 'smz-tmp', 'cotrimoxazol', 'tmp-smx', 'pcp profilaxia'],
    categoria: 'antibiotico',
    classe: 'Sulfonamida',
    subclasse: 'Inibição sinérgica da síntese de folato (TMP: DHFR; SMZ: DHPS)',
    indicacoes_principais: [
      'Pneumocystis jirovecii (PCP) — tratamento e profilaxia primária em HIV/imunossuprimidos',
      'ITU não complicada (quando sensível)',
      'MRSA comunitário (pele e partes moles)',
      'Toxoplasmose cerebral (+ pirimetamina)',
      'Nocardiose',
      'Isospora belli em HIV',
    ],
    dose_adulto: {
      habitual: '800/160 mg (1 cp dupla dose) VO q12h',
      min: '400/80 mg q12h',
      max: '15–20 mg/kg/dia de TMP (PCP grave IV)',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['q12h (ITU, MRSA pele)', 'PCP tratamento: q6–8h', 'Profilaxia: 1x/dia'],
      instrucoes: 'ITU/pele: 1 comprimido de 800/160 mg q12h × 7–14 dias. PCP profilaxia: 1 cp de 800/160 mg 1x/dia (ou 3x/semana). PCP tratamento: TMP 15–20 mg/kg/dia IV dividido q6–8h × 21 dias + prednisona se PaO2 < 70.',
    },
    ajuste_renal: {
      normal: '800/160 mg q12h',
      tfg_60_30: '800/160 mg q18–24h',
      tfg_30_15: '800/160 mg q24h',
      tfg_lt_15: 'Contraindicado ou uso com monitorização rigorosa',
      dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Não recomendado', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: [
      'Deficiência de G6PD (hemólise)',
      'TFG < 15 (exceto em situações de urgência)',
      '3º trimestre de gestação (competição com bilirrubina)',
      'Hipersensibilidade a sulfonamidas',
    ],
    interacoes_importantes: [
      { com: 'Varfarina', severidade: 'grave', descricao: 'Inibe CYP2C9 — aumenta INR muito — reduzir warfarina e monitorar diariamente' },
      { com: 'Metotrexato', severidade: 'grave', descricao: 'Efeito aditivo no bloqueio de folato — toxicidade hematológica grave' },
      { com: 'ACE/BRA + TMP', severidade: 'moderada', descricao: 'TMP inibe excreção tubular de K+ — hipercalemia' },
      { com: 'Fenitoína', severidade: 'moderada', descricao: 'SMZ-TMP inibe metabolismo da fenitoína — toxicidade' },
    ],
    alertas_especiais: [
      'HIPERCALEMIA: TMP inibe canais de Na+ no túbulo coletor (similar à amilorida) — monitorar K+ especialmente com IECA/BRA/ARM',
      'NEFROTOXICIDADE: SMZ-TMP eleva creatinina sérica sem reduzir TFG real (bloqueia secreção tubular de creatinina) — não interpretar como piora renal',
      'PCP: combinar com prednisona 40 mg q12h nos primeiros 5 dias se PaO2 < 70 mmHg ou gradiente A-a > 35',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'risco',
    espectro: [
      'Bactérias gram-positivas: MRSA comunitário, S. pneumoniae (variável), Listeria',
      'Gram-negativos: E. coli (resistência crescente ~25–40% em ITU), Proteus, Nocardia, Stenotrophomonas',
      'Fungos: Pneumocystis jirovecii',
      'Protozoários: Toxoplasma gondii, Isospora',
      'NÃO cobre: Pseudomonas, Mycoplasma, anaeróbios',
    ],
    mic_breakpoints: {
      'E. coli UTI (EUCAST)': 'S ≤ 2 mg/L (TMP) · R > 4 mg/L',
      'MRSA (CLSI)': 'S ≤ 2/38 mg/L (TMP/SMZ)',
    },
    resistencia: [
      'DHFR mutada (resistência ao TMP): dfrA genes em plasmídeos',
      'DHPS mutada (resistência à SMZ): sul1, sul2, sul3 genes',
    ],
    guidelines_referencia: [
      'NIH/IDSA/CDC: Guidelines for Prevention of OI in Adults with HIV 2023',
      'IDSA: UTI Guidelines 2011 (atualização pendente)',
      'IDSA: MRSA Skin and Soft Tissue Infections',
    ],
    marcas: [
      { nome: 'Bactrim®', laboratorio: 'Roche', concentracoes: ['400/80 mg', '800/160 mg'], formas: ['Comprimido', 'Suspensão oral'], lab_id: 'roche' },
      { nome: 'SMZ-TMP EMS', laboratorio: 'EMS', concentracoes: ['400/80 mg', '800/160 mg'], formas: ['Comprimido'] },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // CARBAPENÊMICOS
  // ══════════════════════════════════════════════════════════════

  {
    id: 'meropenem',
    molecula: 'Meropenem',
    nome_generico: 'Meropenem Tri-hidratado',
    sinonimos: ['meronem', 'meropenem', 'carbapenem', 'esbl tratamento', 'gram-negativo resistente'],
    categoria: 'antibiotico',
    classe: 'Carbapenêmico',
    subclasse: '2ª geração — sem efeito pró-convulsivante (diferente do imipenem). Antipseudomonal.',
    indicacoes_principais: [
      'Infecções por Enterobactérias produtoras de ESBL (grave/sistêmica)',
      'Pneumonia hospitalar/PAV por gram-negativos resistentes',
      'Sepse/choque séptico hospitalar',
      'Infecção intra-abdominal complicada grave',
      'Meningite bacteriana nosocomial',
      'Neutropenia febril de alto risco',
    ],
    dose_adulto: {
      habitual: '1 g IV q8h (infusão estendida 3–4h)',
      min: '500 mg IV q8h',
      max: '6 g/dia (meningite, Pseudomonas: 2 g q8h)',
      unidade: 'g',
      via: 'IV',
      frequencias: ['q8h (padrão)', 'q6h (Pseudomonas/meningite — 2 g)', 'Infusão estendida 3–4h recomendada'],
      instrucoes: 'Infusão estendida: meropenem 1–2 g em 3–4h (vs 30 min bolus) — aumenta %T>MIC em 15–25% — recomendado para Pseudomonas e KPC com sensibilidade intermediária. Meningite: 2 g IV q8h.',
    },
    ajuste_renal: {
      normal: '1–2 g q8h',
      tfg_60_30: '1 g q12h',
      tfg_30_15: '500 mg q12h',
      tfg_lt_15: '500 mg q24h. Suplementar após hemodiálise',
      dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste — excreção renal' },
    contraindicacoes_rapidas: ['Hipersensibilidade a carbapenêmicos', 'Histórico de anafilaxia grave a beta-lactâmicos'],
    interacoes_importantes: [
      { com: 'Valproato', severidade: 'grave', descricao: 'Carbapenêmicos reduzem valproato em 60–95% em 24–48h — risco de crises convulsivas. Evitar a associação.' },
    ],
    alertas_especiais: [
      'VALPROATO: redução de 60–95% dos níveis em 24–48h — monitorar nível e/ou trocar para fenitoína/levetiracetam',
      'ESBL: meropenem é o PADRÃO-OURO para ESBL grave (UTI, bacteremia) — pip-tazo pode ser inferior em alta carga bacteriana',
      'Preservar carbapenêmicos: usar apenas quando há evidência/forte suspeita de ESBL/KPC — stewardship',
      'Não confundir com ertapenem: ertapenem NÃO cobre Pseudomonas',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    espectro: [
      'Gram-negativos: P. aeruginosa, E. coli, K. pneumoniae (incluindo ESBL), Acinetobacter (variável), Enterobacter, Serratia',
      'Gram-positivos: MSSA, Streptococcus (boa), Enterococcus faecalis',
      'Anaeróbios: Bacteroides fragilis e demais (excelente)',
      'NÃO cobre: MRSA, Enterococcus faecium, organismos KPC/NDM/OXA-48 resistentes',
    ],
    mic_breakpoints: {
      'P. aeruginosa (EUCAST 2023)': 'S ≤ 2 mg/L · R > 8 mg/L',
      'Enterobactérias (EUCAST 2023)': 'S ≤ 2 mg/L · R > 8 mg/L',
      'A. baumannii (EUCAST)': 'S ≤ 2 mg/L · R > 8 mg/L',
    },
    resistencia: [
      'Carbapenemases: KPC (Klebsiella, E. coli, Pseudomonas), NDM (New Delhi metallo-beta-lactamase), OXA-48, VIM, IMP',
      'Perda de porinas OprD em Pseudomonas + upregulation bombas de efluxo',
      'BRASIL: KPC-2 é a carbapenemase mais prevalente (especialmente K. pneumoniae ST258)',
    ],
    guidelines_referencia: [
      'IDSA: Management of Infections due to ESBL-producing Enterobacteriaceae 2022',
      'SCCM: Surviving Sepsis Campaign 2021',
      'ANVISA: Nota Técnica — Carbapenêmicos e Resistência 2021',
      'IDSA: HAP/VAP Guidelines 2016',
    ],
    marcas: [
      { nome: 'Meronem®', laboratorio: 'AstraZeneca', concentracoes: ['500 mg', '1 g'], formas: ['Pó injetável'] },
      { nome: 'Meropenem EMS', laboratorio: 'EMS', concentracoes: ['500 mg', '1 g'], formas: ['Pó injetável'] },
      { nome: 'Meropenem Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['500 mg', '1 g'], formas: ['Pó injetável'], lab_id: 'eurofarma' },
    ],
  },

  {
    id: 'ertapenem',
    molecula: 'Ertapenem',
    nome_generico: 'Ertapenem Sódico',
    sinonimos: ['invanz', 'ertapenem', 'carbapenem uma vez dia', 'esbl ambulatorial'],
    categoria: 'antibiotico',
    classe: 'Carbapenêmico',
    subclasse: '1ª geração IV — T½ longa (4h) → 1x/dia. SEM atividade contra Pseudomonas e Acinetobacter.',
    indicacoes_principais: [
      'ESBL — infecções moderadas (ambulatorial ou internação fora de UTI)',
      'Infecções intra-abdominais por gram-negativos',
      'ITU complicada por ESBL',
      'Profilaxia de cirurgia colorretal (1x IV antes da incisão)',
    ],
    dose_adulto: {
      habitual: '1 g IV/IM 1x/dia',
      min: '1 g 1x/dia',
      max: '1 g/dia',
      unidade: 'g',
      via: 'IV',
      frequencias: ['1x/dia'],
      instrucoes: '1 g IV 1x/dia em 30 min. IM: reconstituir em lidocaína 1% (reduz dor). Vantagem: T½ longa permite uso ambulatorial.',
    },
    ajuste_renal: {
      normal: '1 g 1x/dia',
      tfg_60_30: 'Sem ajuste (TFG > 30)',
      tfg_30_15: '500 mg 1x/dia',
      tfg_lt_15: '500 mg 1x/dia — suplementar 150 mg após hemodiálise',
      dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    contraindicacoes_rapidas: ['Hipersensibilidade a carbapenêmicos', 'Anafilaxia a amidas (lidocaína) — preparação IM'],
    interacoes_importantes: [
      { com: 'Valproato', severidade: 'grave', descricao: 'Reduz valproato em 60–95% — risco de crises epilépticas' },
    ],
    alertas_especiais: [
      'NÃO COBRE Pseudomonas aeruginosa — diferença fundamental vs meropenem/cefepima',
      'NÃO COBRE Acinetobacter — importante em HAP/VAP',
      'VANTAGEM: T½ longa → 1x/dia → terapia ambulatorial parenteral (OPAT)',
      'VALPROATO: mesma interação crítica dos outros carbapenêmicos',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    espectro: [
      'Gram-negativos: E. coli, K. pneumoniae (incluindo ESBL), Enterobacter, Serratia, H. influenzae',
      'Gram-positivos: MSSA, Streptococcus, Peptostreptococcus',
      'Anaeróbios: Bacteroides fragilis (excelente)',
      'NÃO cobre: Pseudomonas aeruginosa, Acinetobacter, MRSA, Enterococcus',
    ],
    mic_breakpoints: {
      'Enterobactérias (EUCAST)': 'S ≤ 0,5 mg/L · R > 1 mg/L',
    },
    resistencia: ['KPC, NDM, OXA-48 — resistência total'],
    guidelines_referencia: ['IDSA: ESBL Management 2022', 'Profilaxia: ASHP/IDSA/SIS 2023'],
    marcas: [
      { nome: 'Invanz®', laboratorio: 'MSD', concentracoes: ['1 g'], formas: ['Pó injetável'], lab_id: 'msd' },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // GLICOPEPTÍDEOS
  // ══════════════════════════════════════════════════════════════

  {
    id: 'vancomicina',
    molecula: 'Vancomicina',
    nome_generico: 'Cloridrato de Vancomicina',
    sinonimos: ['vancocin', 'vancomicina', 'mrsa tratamento', 'glicopeptideo', 'red man syndrome'],
    categoria: 'antibiotico',
    classe: 'Glicopeptídeo',
    subclasse: 'Inibe síntese de peptidoglicano (D-Ala-D-Ala). Bactericida dependente de tempo.',
    indicacoes_principais: [
      'MRSA — bacteremia, endocardite, pneumonia, osteoartrite, meningite nosocomial',
      'Staphylococcus coagulase-negativo resistente (MRSE)',
      'Enterococcus faecalis/faecium (antes de VRE)',
      'Clostridium difficile grave (oral — NÃO absorvida sistemicamente)',
      'Profilaxia cirúrgica em alérgicos a beta-lactâmicos',
    ],
    dose_adulto: {
      habitual: '15–20 mg/kg IV q8–12h (AUC-guided dosing)',
      min: '15 mg/kg q12h',
      max: '3 g/dose (máx individual)',
      unidade: 'mg/kg',
      via: 'IV',
      frequencias: ['q8–12h (conforme função renal e AUC)', 'CDI: 125 mg VO q6h × 10 dias'],
      instrucoes: 'ALVO PK/PD: AUC/MIC 400–600 mg·h/L (substituiu alvo de vale 15–20 mcg/mL). Infundir em mínimo 60 min/g (máx 500 mg/30 min) — síndrome do homem vermelho se infusão rápida. CDI: 125 mg VO (não IV — não absorvida).',
    },
    ajuste_renal: {
      normal: '15–20 mg/kg q8–12h',
      tfg_60_30: 'q12–24h — monitorar AUC ou nível de vale',
      tfg_30_15: 'q24–48h — nível de vale 10–15 mcg/mL',
      tfg_lt_15: 'Dose de ataque, depois intervalos longos (48–72h) baseados em nível sérico. Hemodiálise: dose após sessão',
      dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste (excreção renal)', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    contraindicacoes_rapidas: ['Hipersensibilidade à vancomicina'],
    interacoes_importantes: [
      { com: 'Aminoglicosídeos (amicacina, gentamicina)', severidade: 'grave', descricao: 'Nefrotoxicidade aditiva sinérgica — monitorar creatinina diariamente' },
      { com: 'Piperacilina-tazobactam', severidade: 'moderada', descricao: 'Possível aumento de nefrotoxicidade — controverso; monitorar' },
      { com: 'Anfotericina B', severidade: 'grave', descricao: 'Nefrotoxicidade aditiva importante' },
      { com: 'Diuréticos de alça (furosemida)', severidade: 'moderada', descricao: 'Ototoxicidade e nefrotoxicidade aditivas' },
    ],
    alertas_especiais: [
      'SÍNDROME DO HOMEM VERMELHO: eritema/prurido pescoço/face por infusão rápida (degranulação mastocitária) — NÃO é alergia. Solução: reduzir velocidade de infusão',
      'NEFROTOXICIDADE: dose-dependente e dependente de tempo — monitorar creatinina diariamente em UTI',
      'MONITORAMENTO: AUC/MIC (preferido, com 2 concentrações) ou vale-guiado (15–20 mcg/mL) — never without monitoring',
      'INFERIOR À OXACILINA para MSSA — usar oxacilina sempre que MSSA confirmado',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'risco',
    espectro: [
      'Gram-positivos: MRSA, MSSA, MRSE, Enterococcus faecalis, S. pneumoniae, Clostridium difficile (oral)',
      'NÃO cobre: Enterococcus faecium VRE (VanA), gram-negativos (NÃO atravessa membrana externa)',
    ],
    mic_breakpoints: {
      'S. aureus MRSA (EUCAST 2023)': 'S ≤ 2 mg/L · R > 2 mg/L',
      'Enterococcus spp (EUCAST)': 'S ≤ 4 mg/L · R > 4 mg/L',
    },
    resistencia: [
      'VRSA (Vancomycin-Resistant S. aureus — VanA): extremamente raro',
      'VISA/hVISA: resistência intermediária — MIC 4–8 mg/L — monitorar resposta clínica',
      'VRE: genes vanA (alta nível, Enterococcus faecium) e vanB (nível variável, E. faecalis)',
    ],
    guidelines_referencia: [
      'IDSA/SIDP: Vancomycin AUC-based TDM Consensus 2020',
      'IDSA: MRSA Guidelines 2011 (atualização 2022)',
      'IDSA: CDI Guidelines 2021',
    ],
    marcas: [
      { nome: 'Vancocin®', laboratorio: 'EMS', concentracoes: ['500 mg', '1 g'], formas: ['Pó injetável', 'Cápsula (oral CDI)'] },
      { nome: 'Vancomicina Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['500 mg', '1 g'], formas: ['Pó injetável'], lab_id: 'eurofarma' },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // OXAZOLIDINONAS
  // ══════════════════════════════════════════════════════════════

  {
    id: 'linezolida',
    molecula: 'Linezolida',
    nome_generico: 'Linezolida',
    sinonimos: ['zyvox', 'linezolid', 'linezolida', 'oxazolidinona', 'mrsa oral', 'vre tratamento'],
    categoria: 'antibiotico',
    classe: 'Oxazolidinona',
    subclasse: 'Bacteriostática — inibe subunidade 30S/50S (início de tradução) — sem cross-resistência',
    indicacoes_principais: [
      'MRSA — pneumonia nosocomial (eficácia equivalente ou superior à vancomicina em PAV)',
      'VRE (Vancomycin-Resistant Enterococcus) — única opção oral',
      'Infecções por gram-positivos resistentes sem acesso IV',
      'Tuberculose MDR (como adjunto — off-label, SRTB)',
    ],
    dose_adulto: {
      habitual: '600 mg VO ou IV q12h',
      min: '600 mg q12h',
      max: '1200 mg/dia',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['q12h (VO e IV — biodisponibilidade oral ~100%)'],
      instrucoes: 'Biodisponibilidade oral 100% — pode iniciar IV e completar VO (step-down) sem perda de eficácia. Evitar alimentos ricos em tiramina (IMAO fraco). Máximo 28 dias (toxicidade hematológica).',
    },
    ajuste_renal: {
      normal: '600 mg q12h',
      tfg_60_30: 'Sem ajuste (metabolismo hepático)',
      tfg_30_15: 'Sem ajuste — metabólitos podem acumular',
      tfg_lt_15: 'Sem ajuste formal — monitorar hemograma',
      dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Dados limitados' },
    contraindicacoes_rapidas: [
      'IMAO nas últimas 2 semanas ou concomitante (síndrome serotoninérgica)',
      'Hipersensibilidade',
    ],
    interacoes_importantes: [
      { com: 'ISRS/IRSN (sertralina, venlafaxina, duloxetina)', severidade: 'grave', descricao: 'Síndrome serotoninérgica (agitação, mioclonias, hipertermia, diarreia) — IMAO fraco. Evitar ou usar com monitorização rigorosa' },
      { com: 'IMAO (selegilina, fenelzina)', severidade: 'contraindicado', descricao: 'Síndrome serotoninérgica grave' },
      { com: 'Simpaticomiméticos (pseudoefedrina, dopamina)', severidade: 'moderada', descricao: 'Crise hipertensiva — IMAO adrenérgico fraco' },
    ],
    alertas_especiais: [
      'TOXICIDADE HEMATOLÓGICA (> 2 semanas): trombocitopenia, anemia, leucopenia — hemograma semanal',
      'NEUROPATIA PERIFÉRICA e ÓPTICA: com uso prolongado (> 4 semanas) — monitorar',
      'SÍNDROME SEROTONINÉRGICA: risco significativo com ISRS — avaliar suspensão temporária do antidepressivo',
      'BIOAVAILABILIDADE ORAL 100%: switch IV→VO sem perda de eficácia — importante para alta precoce',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'contraindicado',
    espectro: [
      'Gram-positivos: MRSA, MSSA, VRE (E. faecium e E. faecalis), VRSA, S. pneumoniae MDR',
      'Cocos gram-positivos em geral (bacteriostático)',
      'NÃO cobre: gram-negativos (membrana externa impede penetração)',
    ],
    mic_breakpoints: {
      'S. aureus (EUCAST 2023)': 'S ≤ 4 mg/L · R > 4 mg/L',
      'Enterococcus (EUCAST)': 'S ≤ 4 mg/L · R > 4 mg/L',
    },
    resistencia: [
      'cfr gene: metilação 23S rRNA — resistência cruzada com cloranfenicol e clindamicina',
      'optrA e poxtA: transferência plasmídica — emergência em Enterococcus e Staphylococcus',
    ],
    guidelines_referencia: [
      'IDSA: MRSA Guidelines 2011/2022',
      'IDSA: VRE Management',
      'WHO: MDR-TB Guidelines 2022 (linezolida como componente core)',
    ],
    marcas: [
      { nome: 'Zyvox®', laboratorio: 'Pfizer', concentracoes: ['600 mg', '600 mg/300 mL (IV)'], formas: ['Comprimido', 'Solução injetável'], lab_id: 'pfizer' },
      { nome: 'Linezolida EMS', laboratorio: 'EMS', concentracoes: ['600 mg'], formas: ['Comprimido'] },
    ],
  },

];
