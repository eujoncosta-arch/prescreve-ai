// ============================================================
// PRESCREVE-AI — Extensão Farmacológica: INFECTOLOGIA (Phase 21.5) — Parte B
// Antifúngicos · Antivirais · Antiparasitários
// Campos adicionais: espectro · mic_breakpoints · resistencia · guidelines_referencia
// ============================================================

import type { QuickDrug } from './pharma-database';

export const PHARMA_DB_INFECTOLOGY_AF: QuickDrug[] = [

  // ══════════════════════════════════════════════════════════════
  // ANTIFÚNGICOS — AZÓIS
  // ══════════════════════════════════════════════════════════════

  {
    id: 'fluconazol',
    molecula: 'Fluconazol',
    nome_generico: 'Fluconazol',
    sinonimos: ['diflucan', 'fluconazole', 'fluconazol', 'candida tratamento', 'azol antifungico'],
    categoria: 'antifungico',
    classe: 'Antifúngico',
    subclasse: 'Azol triazólico — inibe ergosterol (CYP51 fúngico). Fungistático.',
    indicacoes_principais: [
      'Candidíase vulvovaginal (dose única 150 mg)',
      'Candidemia / Candida não-albicans sensível (em contexto adequado)',
      'Meningite criptocócica — fase de consolidação (após anfotericina B)',
      'Profilaxia fúngica em transplantados/imunodeprimidos',
      'Candidíase orofaríngea e esofágica (HIV)',
    ],
    dose_adulto: {
      habitual: '150–400 mg VO/IV 1x/dia',
      min: '50 mg/dia (profilaxia)',
      max: '800 mg/dia (candidemia/meningite criptocócica)',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['Dose única 150 mg (vaginite)', '400 mg 1x/dia (candidemia)', '800 mg 1x/dia (criptococose — indução controversa)'],
      instrucoes: 'Candidemia: dose de ataque 800 mg, manutenção 400 mg/dia. Meningite criptocócica (consolidação): 400 mg 1x/dia × 8 semanas após anfotericina B. Vaginite: 150 mg VO dose única. Biodisponibilidade oral > 90% — IV e VO equivalentes.',
    },
    ajuste_renal: {
      normal: '400 mg 1x/dia',
      tfg_60_30: '200 mg 1x/dia',
      tfg_30_15: '100–200 mg 1x/dia',
      tfg_lt_15: '50–100 mg 1x/dia. Hemodiálise: dose após sessão',
      dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Reduzir dose 50%', child_c: 'Evitar' },
    contraindicacoes_rapidas: [
      'Hipersensibilidade a azóis',
      'Uso com cisaprida, quinidina, eritromicina (QT prolongado)',
    ],
    interacoes_importantes: [
      { com: 'Varfarina', severidade: 'grave', descricao: 'Inibe CYP2C9 — aumenta INR drasticamente. Reduzir varfarina 50% e monitorar diariamente' },
      { com: 'Fenitoína', severidade: 'grave', descricao: 'Inibe CYP2C9 — toxicidade por fenitoína' },
      { com: 'Tacrolimus/Ciclosporina', severidade: 'grave', descricao: 'Inibe CYP3A4 — aumenta imunossupressores 2–3× — monitorar nível sérico' },
      { com: 'Estatinas (sinvastatina)', severidade: 'grave', descricao: 'Inibe CYP3A4 — rabdomiólise. Suspender estatina' },
      { com: 'Hipoglicemiantes (sulfonilureias)', severidade: 'moderada', descricao: 'Aumenta meia-vida — hipoglicemia' },
    ],
    alertas_especiais: [
      'CANDIDA KRUSEI: intrinsecamente resistente — NÃO usar fluconazol',
      'CANDIDA GLABRATA: MIC frequentemente elevado — preferir equinocandina ou voriconazol',
      'Inibidor potente de CYP2C9 e moderado de CYP3A4 — MÚLTIPLAS interações críticas',
      'Prolongamento QT — monitorar ECG em pacientes com cardiopatia',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'risco',
    espectro: [
      'Candida albicans (excelente)',
      'Candida tropicalis, C. parapsilosis (boa)',
      'Cryptococcus neoformans (boa)',
      'Dermatófitos (limitado)',
      'NÃO cobre: C. krusei (resistência intrínseca), C. glabrata (MIC alto), Aspergillus, Mucor, fungos filamentosos',
    ],
    mic_breakpoints: {
      'C. albicans (EUCAST)': 'S ≤ 2 mg/L · R > 4 mg/L',
      'C. glabrata (EUCAST)': 'Sem ponto de corte — considerar resistente',
      'C. krusei': 'Resistente intrínseco',
    },
    resistencia: [
      'Mutações ERG11 (alvo CYP51): C. albicans resistente',
      'Bombas de efluxo CDR1/CDR2 e MDR1',
      'C. glabrata: upregulation de bombas de efluxo — resistência adquirida rapidamente',
    ],
    guidelines_referencia: [
      'IDSA: Candidiasis Clinical Practice Guidelines 2016 (updated 2023)',
      'IDSA: Cryptococcal Disease Guidelines 2010 (updated 2023)',
    ],
    marcas: [
      { nome: 'Diflucan®', laboratorio: 'Pfizer', concentracoes: ['50 mg', '150 mg', '200 mg'], formas: ['Cápsula', 'Solução injetável'], lab_id: 'pfizer' },
      { nome: 'Fluconazol EMS', laboratorio: 'EMS', concentracoes: ['150 mg', '200 mg'], formas: ['Cápsula'] },
      { nome: 'Fluconazol Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['150 mg', '200 mg'], formas: ['Cápsula', 'Solução IV'], lab_id: 'eurofarma' },
    ],
  },

  {
    id: 'voriconazol',
    molecula: 'Voriconazol',
    nome_generico: 'Voriconazol',
    sinonimos: ['vfend', 'voriconazole', 'voriconazol', 'aspergillus tratamento', 'azol segunda geracao'],
    categoria: 'antifungico',
    classe: 'Antifúngico',
    subclasse: 'Azol triazólico 2ª geração — espectro ampliado vs fluconazol (cobre Aspergillus). Fungistático.',
    indicacoes_principais: [
      'Aspergilose invasiva (1ª escolha)',
      'Candidemia por Candida não-albicans resistente ao fluconazol',
      'Escedosporiose / Fusariose',
      'Profilaxia de aspergilose em transplantados de medula',
    ],
    dose_adulto: {
      habitual: '4 mg/kg IV q12h (ataque 6 mg/kg q12h × 2 doses)',
      min: '200 mg VO q12h (< 40 kg: 100 mg q12h)',
      max: '400 mg/dose IV',
      unidade: 'mg/kg',
      via: 'IV',
      frequencias: ['IV: ataque 6 mg/kg q12h × 2 doses → manutenção 4 mg/kg q12h', 'VO: 200 mg q12h (> 40 kg), 100 mg q12h (< 40 kg)'],
      instrucoes: 'Biodisponibilidade oral 96% — switch IV→VO possível. IV: usar solução salina (veículo SBECD — evitar em DRC grave, TFG < 50). Monitorar nível sérico (alvo vale 1–5,5 mg/L): metabolismo ALTAMENTE variável por polimorfismo CYP2C19.',
    },
    ajuste_renal: {
      normal: '4 mg/kg q12h IV',
      tfg_60_30: 'Oral preferível (excipiente SBECD acumula)',
      tfg_30_15: 'Oral — evitar IV',
      tfg_lt_15: 'Oral obrigatório — IV contraindicado (acúmulo SBECD)',
      dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Reduzir manutenção 50%', child_b: 'Cuidado extremo', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: [
      'IV: TFG < 50 (acúmulo do excipiente SBECD)',
      'Uso com rifampicina, rifabutina, carbamazepina (indutores potentes de CYP2C19/3A4)',
      'Uso com sirolimus (aumenta 11×)',
    ],
    interacoes_importantes: [
      { com: 'Rifampicina', severidade: 'contraindicado', descricao: 'Reduz voriconazol em > 90% — contraindicado' },
      { com: 'Sirolimus (rapamicina)', severidade: 'contraindicado', descricao: 'Aumenta sirolimus 11× — contraindicado' },
      { com: 'Tacrolimus', severidade: 'grave', descricao: 'Aumenta tacrolimus 3× — monitorar nível e reduzir 1/3 da dose' },
      { com: 'Warfarina', severidade: 'grave', descricao: 'Aumenta INR significativamente' },
      { com: 'Metadona', severidade: 'grave', descricao: 'QT prolongado aditivo — monitorar ECG' },
    ],
    alertas_especiais: [
      'NÍVEL SÉRICO (TDM) OBRIGATÓRIO: metabolismo por CYP2C19 tem polimorfismo — metabolizadores ultrarrápidos vs lentos variam 4–6×',
      'Fotossensibilidade + carcinoma espinocelular com uso > 1 ano — proteção solar obrigatória',
      'Alucinações visuais/confusão: efeito adverso frequente (10–15%) nas primeiras semanas — geralmente transitório',
      'Hepatotoxicidade: monitorar TGO/TGP mensalmente',
    ],
    uso_gestante: 'contraindicado',
    uso_lactante: 'contraindicado',
    espectro: [
      'Aspergillus fumigatus, A. flavus, A. terreus, A. niger',
      'Candida spp incluindo C. glabrata e C. krusei',
      'Scedosporium, Fusarium spp',
      'Criptococcus (boa)',
      'NÃO cobre: Mucorales (Mucor, Rhizopus) — importante diferencial',
    ],
    mic_breakpoints: {
      'A. fumigatus (EUCAST)': 'S ≤ 1 mg/L · R > 2 mg/L',
      'C. albicans (EUCAST)': 'S ≤ 0,06 mg/L · R > 0,12 mg/L',
    },
    resistencia: [
      'Aspergillus fumigatus resistente a azóis: mutações TR34/L98H no ERG11 — emergência crescente',
      'Candida resistente: mutações ERG11 + bombas de efluxo',
    ],
    guidelines_referencia: [
      'IDSA/ESCMID: Aspergillosis Guidelines 2016 (updated 2022)',
      'IDSA: Candidiasis Guidelines 2016',
    ],
    marcas: [
      { nome: 'VFEND®', laboratorio: 'Pfizer', concentracoes: ['200 mg', '200 mg/100 mL'], formas: ['Comprimido', 'Pó IV', 'Suspensão oral'], lab_id: 'pfizer' },
      { nome: 'Voriconazol EMS', laboratorio: 'EMS', concentracoes: ['200 mg'], formas: ['Comprimido'] },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // ANTIFÚNGICOS — EQUINOCANDINAS
  // ══════════════════════════════════════════════════════════════

  {
    id: 'caspofungina',
    molecula: 'Caspofungina',
    nome_generico: 'Acetato de Caspofungina',
    sinonimos: ['cancidas', 'caspofungin', 'caspofungina', 'equinocandina', 'candida uti'],
    categoria: 'antifungico',
    classe: 'Antifúngico',
    subclasse: 'Equinocandina — inibe síntese de beta-1,3-D-glucano (parede fúngica). Fungicida para Candida.',
    indicacoes_principais: [
      'Candidemia e candidiase invasiva (1ª escolha em UTI/instabilidade hemodinâmica)',
      'Aspergilose invasiva refratária ou intolerância a voriconazol',
      'Neutropenia febril persistente suspeita de infecção fúngica invasiva (empírico)',
    ],
    dose_adulto: {
      habitual: '50 mg IV 1x/dia (ataque 70 mg no D1)',
      min: '50 mg/dia',
      max: '70 mg/dia (aspergilose/neutropenia febril empírico)',
      unidade: 'mg',
      via: 'IV',
      frequencias: ['1x/dia IV'],
      instrucoes: 'Ataque D1: 70 mg IV. Manutenção: 50 mg/dia. Aspergilose: manutenção 70 mg/dia. Infundir em 60 min (não bolus — não é dialisável, sem ajuste renal). Diluir apenas em SF 0,9% (NÃO SG 5% — precipitação).',
    },
    ajuste_renal: {
      normal: '50 mg/dia (após ataque 70 mg)',
      tfg_60_30: 'Sem ajuste',
      tfg_30_15: 'Sem ajuste',
      tfg_lt_15: 'Sem ajuste — excreção não renal',
      dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: '35 mg/dia manutenção', child_c: 'Dados insuficientes — usar com cautela' },
    contraindicacoes_rapidas: ['Hipersensibilidade a equinocandinas'],
    interacoes_importantes: [
      { com: 'Ciclosporina', severidade: 'moderada', descricao: 'Ciclosporina aumenta caspofungina em ~35% — pode aumentar ALT; evitar combinação prolongada' },
      { com: 'Rifampicina, dexametasona, fenitoína, carbamazepina', severidade: 'moderada', descricao: 'Indutores reduzem caspofungina — aumentar para 70 mg/dia' },
      { com: 'Tacrolimus', severidade: 'leve', descricao: 'Reduz tacrolimus em ~20% — monitorar nível' },
    ],
    alertas_especiais: [
      'MELHOR PERFIL DE SEGURANÇA entre antifúngicos sistêmicos: mínima nefrotoxicidade e hepatotoxicidade',
      'NÃO cobre Cryptococcus e fungos dimórficos (Histoplasma, Blastomyces)',
      'Candida parapsilosis: MIC mais alto para equinocandinas — monitorar resposta',
      'Aspergillus: fungistático (não fungicida) — não é 1ª escolha',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'risco',
    espectro: [
      'Candida spp (todas as espécies, incluindo C. glabrata e C. krusei — fungicida)',
      'Aspergillus fumigatus, A. flavus (fungistático)',
      'NÃO cobre: Cryptococcus, Mucorales, Fusarium, Trichosporon',
    ],
    mic_breakpoints: {
      'C. albicans (EUCAST)': 'S ≤ 0,06 mg/L · R > 0,12 mg/L',
      'C. glabrata (EUCAST)': 'S ≤ 0,06 mg/L · R > 0,12 mg/L',
    },
    resistencia: [
      'Mutações FKS1/FKS2 (beta-glucan synthase): resistência em C. glabrata crescente (1–3%)',
      'C. parapsilosis: MIC naturalmente mais alto — MIC90 0,5–1 mg/L',
    ],
    guidelines_referencia: [
      'IDSA: Candidiasis Guidelines 2016 (updated 2023)',
      'ESCMID: Candidiasis Management 2023',
    ],
    marcas: [
      { nome: 'Cancidas®', laboratorio: 'MSD', concentracoes: ['50 mg', '70 mg'], formas: ['Pó injetável'], lab_id: 'msd' },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // ANTIFÚNGICOS — POLIÊNICOS
  // ══════════════════════════════════════════════════════════════

  {
    id: 'anfotericina_b',
    molecula: 'Anfotericina B',
    nome_generico: 'Anfotericina B (Lipossomal ou Desoxicolato)',
    sinonimos: ['fungizone', 'ambisome', 'anfotericina', 'polieno', 'antifungico amplo espectro', 'mucormicose'],
    categoria: 'antifungico',
    classe: 'Antifúngico',
    subclasse: 'Poliênico — liga-se ao ergosterol da membrana fúngica formando poros. Fungicida de amplo espectro.',
    indicacoes_principais: [
      'Meningite criptocócica — fase de indução (anfotericina B + flucitosina)',
      'Mucormicose / Zigomicose (única opção eficaz)',
      'Aspergilose invasiva grave / refratária a voriconazol',
      'Histoplasmose disseminada grave',
      'Leishmaniose visceral (formulação lipossomal — 1ª escolha)',
    ],
    dose_adulto: {
      habitual: 'Lipossomal: 3–5 mg/kg IV 1x/dia | Desoxicolato: 0,5–1 mg/kg/dia',
      min: '0,3 mg/kg/dia (desoxicolato)',
      max: '5 mg/kg/dia (lipossomal)',
      unidade: 'mg/kg',
      via: 'IV',
      frequencias: ['1x/dia'],
      instrucoes: 'SEMPRE PREFERIR LIPOSSOMAL (AmBisome): menor nefrotoxicidade. Mucormicose: 5 mg/kg/dia lipossomal. Criptococose: 3 mg/kg/dia + flucitosina × 14 dias → fluconazol consolidação. Desoxicolato: pré-medicar com paracetamol, difenidramina, hidrocortisona, infundir em 4–6h com SF (NÃO SG 5%). Monitorar creatinina, K+, Mg2+ DIARIAMENTE.',
    },
    ajuste_renal: {
      normal: 'Lipossomal: 3–5 mg/kg 1x/dia',
      tfg_60_30: 'Lipossomal: sem ajuste (preferir sobre desoxicolato)',
      tfg_30_15: 'Lipossomal preferível; desoxicolato: reduzir para 0,5 mg/kg/dia',
      tfg_lt_15: 'Lipossomal preferível; desoxicolato: usar somente se sem alternativa, dias alternados',
      dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Cautela' },
    contraindicacoes_rapidas: ['Hipersensibilidade à anfotericina B', 'Desoxicolato em DRC (usar lipossomal)'],
    interacoes_importantes: [
      { com: 'Vancomicina', severidade: 'grave', descricao: 'Nefrotoxicidade aditiva severa' },
      { com: 'Aminoglicosídeos', severidade: 'grave', descricao: 'Nefrotoxicidade e ototoxicidade aditivas' },
      { com: 'Diuréticos de alça', severidade: 'moderada', descricao: 'Hipocalemia e hipomagnesemia aditivas — reposição obrigatória' },
      { com: 'Ciclosporina/Tacrolimus', severidade: 'grave', descricao: 'Nefrotoxicidade aditiva' },
    ],
    alertas_especiais: [
      'MUCORMICOSE: anfotericina B lipossomal é a ÚNICA opção com evidência sólida — iniciar IMEDIATAMENTE + desbridamento cirúrgico',
      'NEFROTOXICIDADE (desoxicolato): quase universal — creatinina dobra em > 50% dos pacientes. Lipossomal reduz nefrotoxicidade em 80%',
      'REAÇÃO INFUSIONAL (desoxicolato): febre, calafrios, hipotensão → pré-medicação obrigatória',
      'HIPOCALEMIA e HIPOMAGNESEMIA: monitorar e repor K+ e Mg2+ diariamente',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'risco',
    espectro: [
      'Candida spp (todas as espécies — fungicida)',
      'Aspergillus fumigatus (boa)',
      'Mucorales: Mucor, Rhizopus, Lichtheimia — ÚNICO azol-não competidor eficaz',
      'Cryptococcus neoformans (excelente)',
      'Histoplasma capsulatum, Coccidioides, Blastomyces (excelente)',
      'Leishmaniose visceral (lipossomal)',
      'NÃO cobre: Trichosporon, Candida lusitaniae (resistência intrínseca)',
    ],
    mic_breakpoints: {
      'C. albicans (EUCAST)': 'S ≤ 1 mg/L · R > 1 mg/L',
      'A. fumigatus (EUCAST)': 'S ≤ 1 mg/L · R > 2 mg/L',
      'Mucorales': 'MIC variável 0,25–2 mg/L — sem ponto de corte EUCAST formal',
    },
    resistencia: [
      'Mutações ERG2, ERG3, ERG6 (modificação ergosterol) — resistência em C. lusitaniae',
      'Resistência rara em Candida clinicamente: C. auris pode ter MIC elevado',
    ],
    guidelines_referencia: [
      'IDSA: Cryptococcal Disease Guidelines 2010 (updated 2023)',
      'IDSA/ESCMID: Mucormycosis Guidelines 2019',
      'IDSA: Aspergillosis 2016',
      'WHO: Leishmaniose Visceral 2022',
      'MS Brasil: Leishmaniose Visceral — Protocolo Clínico e Diretrizes Terapêuticas 2022',
    ],
    marcas: [
      { nome: 'AmBisome®', laboratorio: 'Gilead', concentracoes: ['50 mg'], formas: ['Pó lipossomal injetável'] },
      { nome: 'Fungizone®', laboratorio: 'Bristol-Myers Squibb', concentracoes: ['50 mg'], formas: ['Pó injetável (desoxicolato)'] },
      { nome: 'Anfotericina B Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['50 mg'], formas: ['Pó injetável (desoxicolato)'], lab_id: 'eurofarma' },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // QUINOLONAS
  // ══════════════════════════════════════════════════════════════

  {
    id: 'ciprofloxacino',
    molecula: 'Ciprofloxacino',
    nome_generico: 'Cloridrato de Ciprofloxacino',
    sinonimos: ['cipro', 'ciprofloxacin', 'ciprofloxacino', 'quinolona', 'fluorquinolona', 'itu quinolona'],
    categoria: 'antibiotico',
    classe: 'Fluorquinolona',
    subclasse: '2ª Geração — maior atividade gram-negativa (incluindo Pseudomonas) vs 1ª geração',
    indicacoes_principais: [
      'ITU complicada e não complicada (quando ESMR local < 20%)',
      'Pielonefrite aguda',
      'Infecções ósseas/articulares por gram-negativos',
      'Gastrenterite bacteriana por Salmonella/Shigella/Campylobacter',
      'Profilaxia pré-procedimento urológico',
      'Antrax (Bacillus anthracis)',
    ],
    dose_adulto: {
      habitual: '500 mg VO q12h ou 400 mg IV q8–12h',
      min: '250 mg q12h (ITU simples)',
      max: '1,5 g/dia (VO)',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['q12h (VO padrão)', 'q8h (IV — infecções graves/Pseudomonas)'],
      instrucoes: 'ITU não complicada: 250–500 mg q12h × 3 dias. Pielonefrite: 500 mg q12h × 7 dias. Pseudomonas: 750 mg q12h VO ou 400 mg q8h IV. Biodisponibilidade oral 70–80%. Evitar com antiácidos, Fe, Zn (quelação).',
    },
    ajuste_renal: {
      normal: '500 mg q12h',
      tfg_60_30: '500 mg q12h (sem ajuste)',
      tfg_30_15: '250–500 mg q12–24h',
      tfg_lt_15: '250–500 mg q24h. Suplementar após hemodiálise',
      dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Sem ajuste formal', child_c: 'Cautela' },
    contraindicacoes_rapidas: [
      'Histórico de tendinite/ruptura de tendão por quinolona',
      '< 18 anos (dano à cartilagem em crescimento — exceto antrax)',
      'Gestação (exceto situações de risco de vida)',
      'Miastenia gravis (pode piorar)',
    ],
    interacoes_importantes: [
      { com: 'Antiácidos com Al/Mg, Fe, Ca, Zn', severidade: 'moderada', descricao: 'Quelação reduz absorção > 50% — tomar 2h antes ou 6h depois' },
      { com: 'Varfarina', severidade: 'moderada', descricao: 'Inibe CYP1A2 — pode aumentar INR' },
      { com: 'Teofilina', severidade: 'grave', descricao: 'Inibe CYP1A2 — toxicidade por teofilina (convulsões, arritmias)' },
      { com: 'Antidiabéticos', severidade: 'moderada', descricao: 'Disglicemia (hiper e hipoglicemia) — monitorar glicemia' },
    ],
    alertas_especiais: [
      'TENDINITE/RUPTURA DE TENDÃO: risco aumentado especialmente em > 60 anos, uso de corticoide, IR — suspender ao primeiro sinal de dor tendinosa',
      'RESISTÊNCIA UTI: E. coli resistente > 20–30% no Brasil — verificar ESMR local antes de prescrever empiricamente',
      'FDA BLACK BOX: neuropatia periférica irreversível + efeitos no SNC + tendinopatia — reservar para quando sem alternativa adequada',
      'QT PROLONGADO: monitorar ECG em cardiopatas',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'risco',
    espectro: [
      'Gram-negativos: E. coli (resistência crescente), K. pneumoniae, P. aeruginosa, Salmonella, Shigella, Campylobacter, H. influenzae',
      'Gram-positivos limitados: S. aureus (variável), S. pneumoniae (fraco)',
      'Atípicos: Mycoplasma, Legionella (moderado)',
      'NÃO cobre: Enterococcus, anaeróbios, MRSA (fraco)',
    ],
    mic_breakpoints: {
      'E. coli (EUCAST)': 'S ≤ 0,25 mg/L · R > 0,5 mg/L',
      'P. aeruginosa (EUCAST)': 'S ≤ 0,5 mg/L · R > 1 mg/L',
    },
    resistencia: [
      'Mutações gyrA/parC (quinolone resistance-determining regions — QRDR)',
      'Bombas de efluxo (MexAB, AcrAB-TolC)',
      'Plasmid-mediated quinolone resistance (PMQR): qnr genes, acc(6\')-Ib-cr',
    ],
    guidelines_referencia: [
      'IDSA: UTI Guidelines 2011 (revision em andamento)',
      'EAU: UTI Guidelines 2023',
      'FDA: Safety Communication — Fluoroquinolonas 2016',
    ],
    marcas: [
      { nome: 'Cipro®', laboratorio: 'Bayer', concentracoes: ['250 mg', '500 mg', '750 mg'], formas: ['Comprimido', 'Solução IV'], lab_id: 'bayer' },
      { nome: 'Ciprofloxacino EMS', laboratorio: 'EMS', concentracoes: ['500 mg'], formas: ['Comprimido'] },
      { nome: 'Ciprofloxacino Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['500 mg'], formas: ['Comprimido', 'Solução IV'], lab_id: 'eurofarma' },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // ANTIVIRAIS — HERPESVIRIDAE
  // ══════════════════════════════════════════════════════════════

  {
    id: 'aciclovir',
    molecula: 'Aciclovir',
    nome_generico: 'Aciclovir (Acyclovir)',
    sinonimos: ['zovirax', 'acyclovir', 'aciclovir', 'herpes tratamento', 'antiviral hsv vzv'],
    categoria: 'antiviral',
    classe: 'Antiviral',
    subclasse: 'Análogo nucleosídeo (guanosina) — ativado por timidina-quinase viral. Específico para herpesvírus.',
    indicacoes_principais: [
      'Encefalite herpética (HSV-1) — URGÊNCIA: 10 mg/kg IV q8h',
      'Herpes zoster em imunodeprimidos',
      'Herpes genital: primo-infecção (valaciclovir preferido VO)',
      'Varicela em imunodeprimidos e adultos graves',
      'Profilaxia em transplantados (herpes)',
    ],
    dose_adulto: {
      habitual: 'Encefalite: 10 mg/kg IV q8h × 14–21 dias | Zoster imunodeprimido: 10 mg/kg q8h | Herpes genital VO: 400 mg q8h × 5–10 dias',
      min: '200 mg VO q5x/dia (herpes labial)',
      max: '10 mg/kg IV q8h (encefalite)',
      unidade: 'mg/kg',
      via: 'IV',
      frequencias: ['q8h (IV — padrão)', 'q5x/dia (VO herpes simples)'],
      instrucoes: 'ENCEFALITE HERPÉTICA: 10 mg/kg IV q8h — iniciar IMEDIATAMENTE na suspeita sem aguardar PCR do LCR. Infundir em 1h (cristalúria/IRA com infusão rápida — manter hidratação 1–1,5 mL/kg/h). VO: valaciclovir (pró-droga) preferido para biodisp. superior.',
    },
    ajuste_renal: {
      normal: '10 mg/kg q8h',
      tfg_60_30: '10 mg/kg q12h',
      tfg_30_15: '10 mg/kg q24h',
      tfg_lt_15: '5 mg/kg q24h. Hemodiálise: após sessão',
      dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    contraindicacoes_rapidas: ['Hipersensibilidade ao aciclovir ou valaciclovir'],
    interacoes_importantes: [
      { com: 'Metotrexato', severidade: 'moderada', descricao: 'Aciclovir reduz excreção renal do metotrexato — toxicidade' },
      { com: 'Tenofovir', severidade: 'moderada', descricao: 'Nefrotoxicidade aditiva — monitorar função renal' },
      { com: 'Ciclosporina', severidade: 'moderada', descricao: 'Nefrotoxicidade aditiva' },
    ],
    alertas_especiais: [
      'ENCEFALITE HERPÉTICA: mortalidade 70% sem tratamento → 30% com aciclovir. Iniciar IMEDIATAMENTE na suspeita clínica',
      'CRISTALÚRIA/IRA: infusão IV rápida → cristalização em túbulos. Solução: infusão 1h + hidratação vigorosa',
      'RESISTÊNCIA (HSV): resistência mediada por TK-mutante em imunodeprimidos (HIV avançado, transplantados) — alternativa: foscarnet',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    espectro: [
      'HSV-1 e HSV-2 (herpes simples)',
      'VZV (varicela-zóster)',
      'EBV (eficaz mas geralmente não indicado)',
      'CMV (fraca atividade — ganciclovir preferido)',
      'NÃO cobre: CMV, HBV, HIV, outros vírus',
    ],
    mic_breakpoints: {
      'HSV-1/2 (EUCAST)': 'S ≤ 2 mg/L · R > 2 mg/L',
      'VZV': 'S ≤ 1 mg/L · R > 1 mg/L',
    },
    resistencia: [
      'Mutações UL23 (timidina-quinase TK): TK-deficiente ou TK-alterada — incapaz de ativar aciclovir',
      'Mutações UL30 (DNA-polimerase): mais raras',
    ],
    guidelines_referencia: [
      'IDSA: Herpes Simplex Encephalitis Guidelines 2008 (IDSA)',
      'CDC: STI Guidelines 2021 (Herpes Genital)',
      'IDSA: Herpes Zoster em Imunodeprimidos',
    ],
    marcas: [
      { nome: 'Zovirax®', laboratorio: 'GSK', concentracoes: ['200 mg', '400 mg', '800 mg', '250 mg/10 mL IV'], formas: ['Comprimido', 'Suspensão', 'Pó injetável'] },
      { nome: 'Aciclovir EMS', laboratorio: 'EMS', concentracoes: ['200 mg', '400 mg'], formas: ['Comprimido'] },
      { nome: 'Aciclovir Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['250 mg IV'], formas: ['Pó injetável'], lab_id: 'eurofarma' },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // ANTIVIRAIS — INFLUENZA
  // ══════════════════════════════════════════════════════════════

  {
    id: 'oseltamivir',
    molecula: 'Oseltamivir',
    nome_generico: 'Fosfato de Oseltamivir',
    sinonimos: ['tamiflu', 'oseltamivir', 'influenza tratamento', 'antiviral gripe', 'neuraminidase'],
    categoria: 'antiviral',
    classe: 'Antiviral',
    subclasse: 'Inibidor de neuraminidase — impede liberação de vírus da célula hospedeira.',
    indicacoes_principais: [
      'Influenza A e B — tratamento (reduz duração em ~1–2 dias se < 48h de sintomas)',
      'Profilaxia pós-exposição à influenza',
      'Influenza grave (hospitalização, pneumonia viral, imunodeprimidos — iniciar mesmo > 48h)',
    ],
    dose_adulto: {
      habitual: '75 mg VO q12h × 5 dias (tratamento)',
      min: '75 mg 1x/dia (profilaxia)',
      max: '150 mg q12h (casos graves/imunodeprimidos)',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['q12h × 5 dias (tratamento)', '1x/dia × 10 dias (profilaxia pós-exposição)'],
      instrucoes: 'Iniciar o mais cedo possível (< 48h ideal — mas iniciar em QUALQUER momento se hospitalizado ou grave). Pode tomar com alimento. Doses > 75 mg q12h em hospitalizados graves/imunodeprimidos (150 mg q12h por pelo menos 10 dias).',
    },
    ajuste_renal: {
      normal: '75 mg q12h',
      tfg_60_30: '75 mg 1x/dia (tratamento) / 30 mg 1x/dia (profilaxia)',
      tfg_30_15: '30 mg 1x/dia (tratamento)',
      tfg_lt_15: 'Dados insuficientes — 30 mg em dias alternados',
      dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste (metabolismo hepático mínimo)' },
    contraindicacoes_rapidas: ['Hipersensibilidade ao oseltamivir'],
    interacoes_importantes: [
      { com: 'Vacina influenza oral atenuada (LAIV)', severidade: 'moderada', descricao: 'Pode reduzir eficácia da vacina oral — não usar 2 semanas antes e 48h após a vacina' },
    ],
    alertas_especiais: [
      'BENEFÍCIO CLÍNICO LIMITADO em adultos saudáveis (1–2 dias de redução) — maior benefício em hospitalizados, imunodeprimidos, > 65 anos, gestantes',
      'GESTANTE: indicado — influenza grave tem mortalidade materno-fetal significativa',
      'Psicose/alucinações: raros relatos pediátricos — vigiar comportamento',
      'Resistência H1N1: mutação H275Y — oseltamivir pode falhar. Zanamivir alternativa',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    espectro: [
      'Influenza A (incluindo H1N1pdm09, H3N2, H5N1)',
      'Influenza B',
      'NÃO cobre: outros vírus respiratórios (SARS-CoV-2, RSV, parainfluenza)',
    ],
    mic_breakpoints: {
      'Influenza A (IC50)': 'S < 1 nmol/L · R ≥ 1 nmol/L (H275Y)',
    },
    resistencia: [
      'Mutação H275Y (neuraminidase N1): resistência ao oseltamivir, sensível ao zanamivir',
      'H3N2: mutação E119V — resistência baixo nível',
    ],
    guidelines_referencia: [
      'IDSA: Influenza Guidelines 2018 (updated 2022)',
      'WHO: Clinical Management of Influenza 2023',
      'ANVISA: Protocolo Influenza Brasil',
    ],
    marcas: [
      { nome: 'Tamiflu®', laboratorio: 'Roche', concentracoes: ['30 mg', '45 mg', '75 mg'], formas: ['Cápsula', 'Pó para suspensão'], lab_id: 'roche' },
      { nome: 'Oseltamivir EMS', laboratorio: 'EMS', concentracoes: ['75 mg'], formas: ['Cápsula'] },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // ANTIPARASITÁRIOS
  // ══════════════════════════════════════════════════════════════

  {
    id: 'albendazol',
    molecula: 'Albendazol',
    nome_generico: 'Albendazol',
    sinonimos: ['zentel', 'albendazole', 'albendazol', 'anti-helmíntico', 'neurocisticercose', 'giarda'],
    categoria: 'antiparasitario',
    classe: 'Antiparasitário',
    subclasse: 'Benzimidazol — inibe polimerização de beta-tubulina → depleção de glicogênio no parasita.',
    indicacoes_principais: [
      'Neurocisticercose (Taenia solium — larval)',
      'Giardíase (Giardia intestinalis) — alternativa ao metronidazol',
      'Ascaridíase, Ancilostomíase, Tricuríase (helmintos intestinais)',
      'Hidatidose (Echinococcus granulosus)',
      'Estrongiloidíase (alternativa à ivermectina)',
      'Toxocaríase (larva migrans visceral)',
    ],
    dose_adulto: {
      habitual: '400 mg VO 1x/dia × 3 dias (helmintos intestinais)',
      min: '400 mg dose única (helmintos intestinais leves)',
      max: '400–800 mg/dia × 8–30 dias (cisticercose/hidatidose)',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['Dose única 400 mg (helmintos)', '400 mg q12h (cisticercose 8 dias, repetir ciclos)'],
      instrucoes: 'Neurocisticercose: 15 mg/kg/dia (max 800 mg) q12h × 8 dias — repetir em 15 dias + dexametasona concomitante (para evitar reação inflamatória). Tomar com refeição gordurosa (aumenta absorção 5×). Hidatidose: 400 mg q12h por semanas a meses.',
    },
    ajuste_renal: {
      normal: '400 mg (excreção biliar/fecal)',
      tfg_60_30: 'Sem ajuste',
      tfg_30_15: 'Sem ajuste',
      tfg_lt_15: 'Sem ajuste',
      dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela — metabolismo hepático', child_b: 'Cautela', child_c: 'Contraindicado em cirrose grave' },
    contraindicacoes_rapidas: [
      '1º trimestre de gestação (teratogênico em animais)',
      'Hipersensibilidade a benzimidazóis',
      'Cirrose grave',
    ],
    interacoes_importantes: [
      { com: 'Dexametasona', severidade: 'leve', descricao: 'Aumenta nível sérico do albendazol sulfóxido (metabólito ativo) em ~50% — efeito benéfico' },
      { com: 'Praziquantel', severidade: 'leve', descricao: 'Aumenta nível de albendazol — usar combinado em neurocisticercose multilobar' },
      { com: 'Cimetidina', severidade: 'leve', descricao: 'Aumenta concentração do metabólito ativo — pode aumentar eficácia e toxicidade' },
    ],
    alertas_especiais: [
      'NEUROCISTICERCOSE: SEMPRE associar corticoide (dexametasona 6–16 mg/dia) ao iniciar albendazol — lise de cistos gera inflamação grave (crises, edema cerebral)',
      'MONITORAR HEMOGRAMA: supressão medular rara em tratamentos prolongados (hidatidose)',
      'Tomar com refeição gordurosa — absorção aumenta 5× com lipídeos',
      'GRAVIDEZ: testar antes de iniciar; contraindicado no 1º trimestre',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'avaliar',
    espectro: [
      'Nematelmintos: Ascaris lumbricoides, Ancylostoma, Trichuris trichiura, Enterobius, Strongyloides',
      'Cestoides: Taenia solium (larval — cisticercose), Echinococcus (hidatidose)',
      'Protozoários: Giardia intestinalis, Microsporidia (imunodeprimidos)',
      'NÃO cobre: Plasmodium, Leishmania, Trypanosoma, Toxoplasma',
    ],
    mic_breakpoints: { 'Geral': 'Sem breakpoints CLSI/EUCAST — monitorar resposta clínica e parasitológica' },
    resistencia: [
      'Polimorfismos em beta-tubulina (codóns 167, 198, 200) — resistência em parasitas veterinários; emergente em humanos',
    ],
    guidelines_referencia: [
      'IDSA/AAN: Neurocysticercosis Guidelines 2017 (updated 2022)',
      'WHO: Helmintiases — Preventive Chemotherapy 2023',
      'MS Brasil: Protocolo Neurocisticercose 2022',
    ],
    marcas: [
      { nome: 'Zentel®', laboratorio: 'GSK', concentracoes: ['400 mg', '200 mg/5 mL susp'], formas: ['Comprimido', 'Suspensão'] },
      { nome: 'Albendazol EMS', laboratorio: 'EMS', concentracoes: ['400 mg'], formas: ['Comprimido'] },
      { nome: 'Albendazol Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['400 mg'], formas: ['Comprimido'], lab_id: 'eurofarma' },
    ],
  },

  {
    id: 'ivermectina',
    molecula: 'Ivermectina',
    nome_generico: 'Ivermectina',
    sinonimos: ['stromectol', 'ivermectin', 'ivermectina', 'estrongiloide tratamento', 'escabiose', 'oncocercose'],
    categoria: 'antiparasitario',
    classe: 'Antiparasitário',
    subclasse: 'Avermectina — potencializa canais de cloro dependentes de glutamato → paralisia do parasita.',
    indicacoes_principais: [
      'Estrongiloidíase (Strongyloides stercoralis) — droga de eleição',
      'Oncocercose (Onchocerca volvulus) — cegueira dos rios',
      'Escabiose (sarna) — incluindo sarna norueguesa',
      'Pediculose resistente',
      'Filariose linfática (com diethylcarbamazina)',
      'Larva migrans cutânea refratária',
    ],
    dose_adulto: {
      habitual: '200 mcg/kg dose única VO (estrongiloidíase simples)',
      min: '150 mcg/kg',
      max: '200 mcg/kg/dose; repetir em 2 semanas',
      unidade: 'mcg/kg',
      via: 'VO',
      frequencias: ['Dose única (estrongiloidíase simples)', 'Repetir D1 e D15 (sarna clássica)', 'Repetir D1, D2, D8, D9, D15, D16 (sarna norueguesa)'],
      instrucoes: 'Tomar em jejum (2h antes e 2h após) com água. Estrongiloidíase grave/hiperinfecção: repetir doses e extender. Sarna norueguesa: 6 doses + escabicida tópico.',
    },
    ajuste_renal: {
      normal: '200 mcg/kg (sem ajuste — excreção fecal predominante)',
      tfg_60_30: 'Sem ajuste',
      tfg_30_15: 'Sem ajuste',
      tfg_lt_15: 'Sem ajuste — dados limitados',
      dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Cautela — metabolismo hepático', child_c: 'Evitar' },
    contraindicacoes_rapidas: [
      'Loa loa com microfilaremia > 8.000/mL (encefalopatia por lise maciça)',
      'Gestação (1º trimestre)',
      'Menores de 15 kg',
    ],
    interacoes_importantes: [
      { com: 'Varfarina', severidade: 'moderada', descricao: 'Pode aumentar INR — monitorar' },
      { com: 'Benzodiazepínicos/barbitúricos', severidade: 'moderada', descricao: 'Potencializa ação no SNC (canais GABA)' },
    ],
    alertas_especiais: [
      'SÍNDROME DE HIPERINFECÇÃO por Strongyloides em imunodeprimidos (corticoide, HIV) — potencialmente fatal se não tratada imediatamente',
      'LOA LOA: pesquisar antes de administrar em áreas endêmicas — Encefalopatia por Mazotti reaction (lise maciça de microfilárias)',
      'Estrongiloidíase: PREFERIR ivermectina sobre tiabendazol/albendazol — maior eficácia e melhor tolerância',
      'Reação de Mazzotti (febre, urticária) pode ocorrer nas primeiras 24h em pacientes com alta carga',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'avaliar',
    espectro: [
      'Nematelmintos: Strongyloides stercoralis, Onchocerca volvulus, Wuchereria bancrofti, Brugia (filariose)',
      'Ácaros: Sarcoptes scabiei (sarna)',
      'Ectoparasitas: Pediculus humanus, Phthirus pubis',
      'NÃO cobre: Cestoides (Taenia), Trematoides, Protozoários',
    ],
    mic_breakpoints: { 'Geral': 'Sem breakpoints formais — monitorar cura parasitológica (fezes, sorologia)' },
    resistencia: ['Polimorfismos em glc-1 (canal de cloro glutamato-dependente) — resistência emergente em parasitas veterinários'],
    guidelines_referencia: [
      'IDSA: Strongyloidiasis Guidelines 2016',
      'WHO: Onchocerciasis — Ivermectin MDA',
      'MS Brasil: Protocolo Estrongiloidíase 2022',
    ],
    marcas: [
      { nome: 'Stromectol®', laboratorio: 'MSD', concentracoes: ['3 mg', '6 mg'], formas: ['Comprimido'], lab_id: 'msd' },
      { nome: 'Ivermectina EMS', laboratorio: 'EMS', concentracoes: ['3 mg', '6 mg'], formas: ['Comprimido'] },
      { nome: 'Ivermectina Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['6 mg'], formas: ['Comprimido'], lab_id: 'eurofarma' },
    ],
  },

];
