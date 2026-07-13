// ============================================================
// PRESCREVE-AI — Extensão Farmacológica: PNEUMOLOGIA (Phase 21.6) — Parte B
// Biológicos · Mucolíticos · Antileucotrienos · Oxigenoterapia
// ============================================================

import type { QuickDrug } from './pharma-database';

export const PHARMA_DB_PULMO_B: QuickDrug[] = [

  // ══════════════════════════════════════════════════════════════
  // BIOLÓGICOS — Asma Grave / Fenótipo T2-High
  // ══════════════════════════════════════════════════════════════

  {
    id: 'omalizumabe',
    molecula: 'Omalizumabe',
    nome_generico: 'Omalizumabe',
    sinonimos: ['xolair', 'omalizumab', 'omalizumabe', 'anti-ige', 'biologico asma', 'asma alérgica grave'],
    categoria: 'respiratory',
    classe: 'Biológico',
    subclasse: 'Anticorpo monoclonal humanizado anti-IgE (bloqueia IgE livre → impede ligação a mastócitos/basófilos)',
    indicacoes_principais: [
      'Asma alérgica grave não controlada (GINA step 5) — IgE total 30–1500 UI/mL + sensibilização a aeroalérgenos',
      'Urticária crônica espontânea refratária a anti-H1',
      'Pólipos nasais (indicação emergente)',
    ],
    dose_adulto: {
      habitual: '75–600 mg SC a cada 2–4 semanas (calculado por peso e IgE basal)',
      min: '75 mg SC q4 semanas (IgE 30–100, peso ≤ 90 kg)',
      max: '600 mg SC q2 semanas',
      unidade: 'mg',
      via: 'SC',
      frequencias: ['q2 semanas ou q4 semanas (conforme tabela de dose)'],
      instrucoes: 'Dose baseada em tabela: peso (kg) × IgE basal (UI/mL) → determina dose e intervalo. Observar 30–60 min após aplicação (anafilaxia rara ~0,2%). Resposta avaliada em 16 semanas — suspender se sem resposta.',
    },
    ajuste_renal: { normal: 'Sem ajuste formal', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Dados limitados', tfg_lt_15: 'Dados limitados', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Dados limitados' },
    contraindicacoes_rapidas: ['Hipersensibilidade ao omalizumabe', 'IgE < 30 ou > 1500 UI/mL (fora da faixa de eficácia)'],
    interacoes_importantes: [
      { com: '(sem interação farmacocinética relevante)', severidade: 'leve', descricao: 'Anticorpo monoclonal anti-IgE — não metabolizado por CYP, sem interações farmacocinéticas conhecidas. Não usar para tratar broncoespasmo agudo; cautela com vacinas de vírus vivo (imunobiológico)' },
    ],
    alertas_especiais: [
      'ANAFILAXIA: rara (0,1–0,2%) — administrar em ambiente com recursos de emergência, observar 30 min',
      'RESPOSTA: avaliar em 16 semanas — suspender se sem melhora objetiva',
      'CRITÉRIOS PCDT BRASIL: IgE 30–1500 UI/mL + sensibilização + ≥ 2 exacerbações graves/ano + em uso de ICS dose alta + LABA',
      'Parasitose: teoricamente pode aumentar risco (IgE anti-helmintos reduzida) — tratar parasitoses antes',
      'Meia-vida: ~26 dias — efeito persiste após suspensão',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    espectro: [],
    guidelines_referencia: [
      'GINA 2025 — Step 5 Add-On Biologic',
      'PCDT Omalizumabe — MS Brasil 2022',
      'IDSA/ATS: Severe Asthma Guidelines 2020',
    ],
    marcas: [
      { nome: 'Xolair®', laboratorio: 'Novartis/Genentech', concentracoes: ['75 mg/0,5 mL', '150 mg/mL'], formas: ['Solução injetável SC pré-preenchida'], lab_id: 'novartis' },
    ],
  },

  {
    id: 'mepolizumabe',
    molecula: 'Mepolizumabe',
    nome_generico: 'Mepolizumabe',
    sinonimos: ['nucala', 'mepolizumab', 'mepolizumabe', 'anti-il5', 'biologico eosinofilico', 'asma eosinofilica'],
    categoria: 'respiratory',
    classe: 'Biológico',
    subclasse: 'Anticorpo monoclonal anti-IL-5 (bloqueia IL-5 → reduz produção e sobrevida de eosinófilos)',
    indicacoes_principais: [
      'Asma eosinofílica grave não controlada (GINA step 5) — eosinófilos ≥ 150/μL no sangue periférico',
      'Granulomatose eosinofílica com poliangiíte (EGPA — Churg-Strauss)',
      'Síndrome hipereosinofílica',
    ],
    dose_adulto: {
      habitual: '100 mg SC a cada 4 semanas',
      min: '100 mg q4 semanas',
      max: '100 mg q4 semanas',
      unidade: 'mg',
      via: 'SC',
      frequencias: ['1×/mês (q4 semanas)'],
      instrucoes: 'Aplicar SC (abdome, coxa ou braço). Pode ser autoadministrado após treinamento. Avaliar resposta em 16 semanas. Eosinófilos caem em 70–80% após 4 semanas.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Dados limitados', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Dados limitados' },
    contraindicacoes_rapidas: ['Hipersensibilidade ao mepolizumabe'],
    interacoes_importantes: [
      { com: '(sem interação farmacocinética relevante)', severidade: 'leve', descricao: 'Anticorpo monoclonal anti-IL-5 — não metabolizado por CYP, sem interações farmacocinéticas conhecidas. Não usar para broncoespasmo agudo; cautela com vacinas de vírus vivo' },
    ],
    alertas_especiais: [
      'Indicação principal: asma eosinofílica (eosinófilos ≥ 150/μL) — NÃO usar em asma alérgica sem eosinofilia',
      'EGPA: dose de 300 mg SC q4 semanas (diferente da asma)',
      'Redução de eosinófilos em sangue periférico e no tecido pulmonar',
      'Estudo MENSA: redução de 47% nas exacerbações graves vs placebo',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    espectro: [],
    guidelines_referencia: [
      'GINA 2025 — Step 5 Biológicos Anti-IL5',
      'PCDT Mepolizumabe — MS Brasil 2022',
    ],
    marcas: [
      { nome: 'Nucala®', laboratorio: 'GSK', concentracoes: ['100 mg/mL'], formas: ['Solução injetável SC', 'Pó liofilizado'] },
    ],
  },

  {
    id: 'benralizumabe',
    molecula: 'Benralizumabe',
    nome_generico: 'Benralizumabe',
    sinonimos: ['fasenra', 'benralizumab', 'benralizumabe', 'anti-il5ra', 'biologico asma eosinofilica'],
    categoria: 'respiratory',
    classe: 'Biológico',
    subclasse: 'Anticorpo monoclonal anti-receptor de IL-5 (IL-5Rα) — depleção direta de eosinófilos via ADCC',
    indicacoes_principais: [
      'Asma eosinofílica grave não controlada (GINA step 5) — eosinófilos ≥ 150–300/μL',
    ],
    dose_adulto: {
      habitual: '30 mg SC q4 semanas × 3 doses → depois q8 semanas',
      min: '30 mg SC',
      max: '30 mg SC',
      unidade: 'mg',
      via: 'SC',
      frequencias: ['q4 semanas × 3 doses de ataque → manutenção q8 semanas'],
      instrucoes: 'Doses 1, 2, 3: q4 semanas. A partir da dose 4: q8 semanas (vantagem: 1 aplicação a cada 2 meses). Depleção de eosinófilos quase completa (> 95%) em 24h.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Dados limitados', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Dados limitados' },
    contraindicacoes_rapidas: ['Hipersensibilidade ao benralizumabe'],
    interacoes_importantes: [
      { com: '(sem interação farmacocinética relevante)', severidade: 'leve', descricao: 'Anticorpo monoclonal anti-IL-5Rα — não metabolizado por CYP, sem interações farmacocinéticas conhecidas. Não usar para broncoespasmo agudo; cautela com vacinas de vírus vivo' },
    ],
    alertas_especiais: [
      'DEPLEÇÃO QUASE COMPLETA de eosinófilos — mecanismo via ADCC (citotoxicidade celular dependente de anticorpo)',
      'VANTAGEM POSOLÓGICA: após 3 doses mensais → 1 aplicação a cada 8 semanas',
      'Estudo SIROCCO/CALIMA: redução de 51% nas exacerbações anuais',
      'Eosinófilos > 300/μL: maior resposta clínica',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    espectro: [],
    guidelines_referencia: ['GINA 2025 — Step 5', 'PCDT Brasil 2022'],
    marcas: [
      { nome: 'Fasenra®', laboratorio: 'AstraZeneca', concentracoes: ['30 mg/mL'], formas: ['Solução injetável SC pré-preenchida'], lab_id: 'astrazeneca' },
    ],
  },

  {
    id: 'dupilumabe',
    molecula: 'Dupilumabe',
    nome_generico: 'Dupilumabe',
    sinonimos: ['dupixent', 'dupilumab', 'dupilumabe', 'anti-il4 il13', 'biologico t2 high', 'dermatite atopica biologico'],
    categoria: 'respiratory',
    classe: 'Biológico',
    subclasse: 'Anticorpo monoclonal anti-receptor de IL-4/IL-13 (IL-4Rα) — bloqueia sinalização Th2',
    indicacoes_principais: [
      'Asma moderada-grave (GINA step 4–5) com fenótipo T2-high (eosinófilos ≥ 150/μL OU FeNO ≥ 25 ppb)',
      'Dermatite atópica grave (indicação principal)',
      'Rinossinusite crônica com pólipos nasais',
      'Esofagite eosinofílica',
      'Prurigo nodular',
    ],
    dose_adulto: {
      habitual: '200 ou 300 mg SC q2 semanas (asma) | 400 mg ataque → 200 mg q2 semanas',
      min: '200 mg q2 semanas',
      max: '300 mg q2 semanas (eosinófilos ≥ 300 ou uso de corticoide oral)',
      unidade: 'mg',
      via: 'SC',
      frequencias: ['q2 semanas'],
      instrucoes: 'Asma: 200 ou 300 mg q2 semanas. Corticodependente: 300 mg q2 semanas — permite redução/suspensão do corticoide oral. Autoadministração possível após treinamento.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Dados limitados', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Dados limitados' },
    contraindicacoes_rapidas: ['Hipersensibilidade ao dupilumabe'],
    interacoes_importantes: [
      { com: 'Vacinas vivas atenuadas', severidade: 'moderada', descricao: 'Evitar vacinas vivas durante o tratamento — resposta imune alterada' },
    ],
    alertas_especiais: [
      'ÚNICO biológico aprovado para múltiplas doenças atópicas (asma + dermatite atópica + RSC + EoE)',
      'Conjuntivite: efeito adverso mais frequente (10–15%) — principalmente em dermatite atópica',
      'Redução de corticoide oral: estudo VENTURE — 70% dos pacientes corticodependentes puderam suspender corticoide',
      'FeNO e eosinófilos: biomarcadores para seleção de respondedores',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    espectro: [],
    guidelines_referencia: [
      'GINA 2025 — Step 5 Biológicos',
      'PCDT Dupilumabe (Dermatite Atópica) — MS Brasil 2021',
      'AAD/ATS: Dupilumabe em Asma 2022',
    ],
    marcas: [
      { nome: 'Dupixent®', laboratorio: 'Sanofi/Regeneron', concentracoes: ['200 mg/1,14 mL', '300 mg/2 mL'], formas: ['Solução injetável SC pré-preenchida'], lab_id: 'sanofi' },
    ],
  },

  {
    id: 'tezepelumabe',
    molecula: 'Tezepelumabe',
    nome_generico: 'Tezepelumabe',
    sinonimos: ['tezspire', 'tezepelumab', 'tezepelumabe', 'anti-tslp', 'biologico asma grave sem fenótipo'],
    categoria: 'respiratory',
    classe: 'Biológico',
    subclasse: 'Anticorpo monoclonal anti-TSLP (Thymic Stromal Lymphopoietin) — bloqueia alarmine epitelial upstream',
    indicacoes_principais: [
      'Asma grave não controlada (GINA step 5) — fenótipo eosinofílico OU não-eosinofílico (mais amplo)',
      'Único biológico eficaz independentemente de eosinófilos ou IgE',
    ],
    dose_adulto: {
      habitual: '210 mg SC q4 semanas',
      min: '210 mg q4 semanas',
      max: '210 mg q4 semanas',
      unidade: 'mg',
      via: 'SC',
      frequencias: ['1×/mês (q4 semanas)'],
      instrucoes: 'Aplicação SC (abdome, coxa, braço). Pode ser autoadministrado. Estudo NAVIGATOR: redução de 70% nas exacerbações independentemente de eosinófilos.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Dados limitados', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Dados limitados' },
    contraindicacoes_rapidas: ['Hipersensibilidade ao tezepelumabe'],
    interacoes_importantes: [
      { com: '(sem interação farmacocinética relevante)', severidade: 'leve', descricao: 'Anticorpo monoclonal anti-TSLP — não metabolizado por CYP, sem interações farmacocinéticas conhecidas. Não usar para broncoespasmo agudo; evitar vacinas de vírus vivo (recomendação de bula)' },
    ],
    alertas_especiais: [
      'AMPLIAÇÃO DE PERFIL: eficaz em asma grave com e sem eosinofilia (eosinófilos < 150/μL) — diferencial vs anti-IL5',
      'Age upstream: bloqueia TSLP → impede ativação de múltiplas vias inflamatórias (Th1, Th2, Th17)',
      'NAVIGATOR: redução de 70% em exacerbações anuais (maior que qualquer outro biológico aprovado)',
      'Menor experiência de longo prazo vs omalizumabe/mepolizumabe',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    espectro: [],
    guidelines_referencia: [
      'GINA 2025 — Step 5 Biológico',
      'NAVIGATOR Trial 2021 (NEJM)',
    ],
    marcas: [
      { nome: 'Tezspire®', laboratorio: 'AstraZeneca/Amgen', concentracoes: ['210 mg/1,91 mL'], formas: ['Solução injetável SC pré-preenchida'], lab_id: 'astrazeneca' },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // MUCOLÍTICOS
  // ══════════════════════════════════════════════════════════════

  {
    id: 'acetilcisteina',
    molecula: 'N-Acetilcisteína',
    nome_generico: 'N-Acetilcisteína (NAC)',
    sinonimos: ['fluimucil', 'nac', 'n-acetilcisteina', 'acetylcysteine', 'mucolítico', 'antioxidante', 'paracetamol intoxicação'],
    categoria: 'respiratory',
    classe: 'Mucolítico',
    subclasse: 'Tiol — quebra ligações dissulfeto do muco + antioxidante (precursor de glutationa)',
    indicacoes_principais: [
      'Secreção brônquica espessa em DPOC, bronquite crônica, bronquiectasias, fibrose cística',
      'Intoxicação por paracetamol (acetaminofeno) — antídoto IV',
      'Prevenção de nefropatia por contraste (nebulizado/VO — evidência fraca)',
      'Fibrose pulmonar idiopática (doses altas — benefício incerto)',
    ],
    dose_adulto: {
      habitual: '200–600 mg VO 2–3×/dia (mucolítico)',
      min: '200 mg 2×/dia',
      max: '600 mg 3×/dia (mucolítico) | 150 mg/kg IV (paracetamol)',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['2–3×/dia (VO mucolítico)', '3 infusões IV em 21h (protocolo paracetamol)'],
      instrucoes: 'Mucolítico: 200–600 mg VO 2–3×/dia. Efervescente: dissolver em água. Paracetamol IV: ataque 150 mg/kg em 1h → 50 mg/kg em 4h → 100 mg/kg em 16h (protocolo NAC 21h). Nebulização: 3 mL da solução 20% diluída em SF.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela (IH ativa)', child_b: 'Cautela', child_c: 'Cautela — mas usada no tratamento de IH por paracetamol' },
    contraindicacoes_rapidas: ['Hipersensibilidade', 'Úlcera péptica ativa (VO — irritação gástrica)'],
    interacoes_importantes: [
      { com: 'Nitroglicerina', severidade: 'moderada', descricao: 'NAC potencializa vasodilatação — hipotensão; monitorar PA' },
      { com: 'Carvão ativado (paracetamol IV)', severidade: 'moderada', descricao: 'Carvão ativado administrado antes absorve NAC oral — usar IV se carvão usado' },
    ],
    alertas_especiais: [
      'ANTÍDOTO PARACETAMOL: iniciar até 8–10h da ingestão para máxima proteção hepática. Eficaz até 24h (reduz risco de IH fulminante)',
      'REAÇÃO ANAFILACTOIDE IV: náuseas, vômitos, urticária, broncoespasmo em 10–15% na primeira infusão — reduzir velocidade, não é contra-indicação permanente',
      'Odor sulfuroso característico — avisar paciente',
    ],
    uso_gestante: 'seguro',
    uso_lactante: 'seguro',
    marcas: [
      { nome: 'Fluimucil®', laboratorio: 'Zambon', concentracoes: ['200 mg efervescente', '600 mg efervescente', '200 mg/mL IV'], formas: ['Comprimido efervescente', 'Granulado', 'Solução injetável'] },
      { nome: 'NAC Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['200 mg', '600 mg'], formas: ['Comprimido efervescente'], lab_id: 'eurofarma' },
    ],
  },

  {
    id: 'ambroxol',
    molecula: 'Ambroxol',
    nome_generico: 'Cloridrato de Ambroxol',
    sinonimos: ['mucosolvan', 'ambroxol', 'ambroxole', 'mucolítico secretomotor', 'mucosolvan'],
    categoria: 'respiratory',
    classe: 'Mucolítico',
    subclasse: 'Secretomotor — estimula secreção de surfactante + fluidifica muco (metabólito ativo da bromexina)',
    indicacoes_principais: [
      'Doenças respiratórias com hipersecreção mucosa (bronquite, DPOC, asma)',
      'Pré-natal: maturação pulmonar fetal (off-label — alternativa ao corticoide em alguns protocolos)',
      'Risco de SDRA neonatal (estimulo de surfactante)',
    ],
    dose_adulto: {
      habitual: '30 mg VO 3×/dia (liberação imediata) ou 75 mg LP 1×/dia',
      min: '30 mg 2×/dia',
      max: '90 mg/dia (VO)',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['3×/dia (liberação imediata)', '1×/dia (LP 75 mg)'],
      instrucoes: 'Tomar com refeição. Associar hidratação adequada (≥ 2L/dia) para máxima fluidificação do muco. Xarope: 30 mg/5 mL adulto; 15 mg/5 mL pediátrico.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Cautela (metabólitos)', tfg_lt_15: 'Cautela', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Reduzir dose 50%', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Hipersensibilidade', 'IH grave'],
    interacoes_importantes: [
      { com: 'Antibióticos (amoxicilina, eritromicina, cefuroxima)', severidade: 'leve', descricao: 'Ambroxol aumenta concentração de antibióticos no tecido pulmonar — potencial sinergismo' },
    ],
    alertas_especiais: [
      'Efeito secretomotor: estimula batimento ciliar e clearance mucociliar — diferente de quebrar pontes dissulfeto (NAC)',
      'Surfactante: ambroxol estimula pneumócitos tipo II — indicado em prematuro (off-label)',
      'Anestésico local leve de mucosas (propriedade anestésica tópica)',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Mucosolvan®', laboratorio: 'Boehringer Ingelheim', concentracoes: ['30 mg', '75 mg LP', '30 mg/5 mL xarope'], formas: ['Comprimido', 'Cápsula LP', 'Xarope'] },
      { nome: 'Ambroxol EMS', laboratorio: 'EMS', concentracoes: ['30 mg'], formas: ['Comprimido', 'Xarope'] },
    ],
  },

  {
    id: 'carbocisteina',
    molecula: 'Carbocisteína',
    nome_generico: 'Carbocisteína',
    sinonimos: ['carbocisteina', 'carbocisteine', 'lisomucil', 'mucolítico carbocisteina'],
    categoria: 'respiratory',
    classe: 'Mucolítico',
    subclasse: 'Mucolítico — normaliza relação fucosialomucinas/sialomucinase → muco menos viscoso',
    indicacoes_principais: [
      'Hipersecreção brônquica em DPOC, bronquite crônica, bronquiectasias',
      'Otite média secretora (glue ear) pediátrica',
      'Sinusite crônica com muco espesso',
    ],
    dose_adulto: {
      habitual: '750 mg VO 3×/dia (ataque) → 375–750 mg 3×/dia (manutenção)',
      min: '375 mg 3×/dia',
      max: '2,25 g/dia',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['3×/dia'],
      instrucoes: 'Tomar com refeição. Hidratação adequada. Diferente da NAC: carbocisteína age no metabolismo do muco (não quebra pontes dissulfeto diretamente).',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Cautela', tfg_lt_15: 'Não recomendado', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Cautela', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Úlcera péptica ativa', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Antitussígenos (codeína, dextrometorfano)', severidade: 'moderada', descricao: 'Antagonismo — suprimir a tosse com secreções fluidificadas causa retenção de muco, ↑risco de infecção/hipoxia. Associação não recomendada' },
      { com: 'Anticolinérgicos/atropínicos (secantes de secreção)', severidade: 'moderada', descricao: 'Efeito oposto ao mucolítico — ressecam a secreção e anulam a ação. Associação não recomendada' },
    ],
    alertas_especiais: [
      'Estudo PEACE (2008): carbocisteína 1500 mg/dia reduziu exacerbações agudas de DPOC em 25% vs placebo (China)',
      'Mecanismo diferente de NAC — pode haver benefício quando NAC não suficiente',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Lisomucil®', laboratorio: 'Sanofi', concentracoes: ['375 mg', '750 mg', '250 mg/5 mL xarope'], formas: ['Cápsula', 'Xarope'] },
      { nome: 'Carbocisteína EMS', laboratorio: 'EMS', concentracoes: ['375 mg', '750 mg'], formas: ['Cápsula'] },
    ],
  },

  {
    id: 'dornase_alfa',
    molecula: 'Dornase Alfa',
    nome_generico: 'Dornase Alfa (rhDNase)',
    sinonimos: ['pulmozyme', 'dornase', 'rhDNase', 'fibrose cistica mucolítico', 'dnase'],
    categoria: 'respiratory',
    classe: 'Mucolítico',
    subclasse: 'Enzima recombinante (DNAse humana) — digere DNA extracelular do muco (fibrose cística)',
    indicacoes_principais: [
      'Fibrose cística — redução da viscosidade do muco brônquico',
      'Bronquiectasias não FC (evidência limitada)',
    ],
    dose_adulto: {
      habitual: '2,5 mg nebulizado 1×/dia',
      min: '2,5 mg/dia',
      max: '2,5 mg 2×/dia (casos selecionados FC)',
      unidade: 'mg',
      via: 'Inalatório',
      frequencias: ['1×/dia', '2×/dia (FC grave)'],
      instrucoes: 'Nebulizar 1 ampola (2,5 mg/2,5 mL) com nebulizador a jato. NÃO misturar com outros fármacos no nebulizador. Refrigerar (2–8°C). Uso preferencialmente pela manhã para facilitar clearance mucociliar diurno.',
    },
    ajuste_renal: { normal: 'Sem ajuste (ação local)', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    contraindicacoes_rapidas: ['Hipersensibilidade à dornase alfa ou CHO-derived proteins'],
    interacoes_importantes: [
      { com: 'Outros medicamentos inalados (no mesmo nebulizador)', severidade: 'moderada', descricao: 'Não diluir nem misturar dornase alfa com outros fármacos no nebulizador (alteração físico-química) — nebulizar separadamente. Sem interações sistêmicas conhecidas' },
    ],
    alertas_especiais: [
      'FIBROSE CÍSTICA: reduz exacerbações em 20% e melhora VEF1 em 5–10% — recomendado para FC com VEF1 > 40% previsto',
      'Custo elevado — disponível pelo SUS para fibrose cística (PCDT)',
      'Rouquidão e faringite: efeitos locais frequentes',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Pulmozyme®', laboratorio: 'Roche', concentracoes: ['2,5 mg/2,5 mL'], formas: ['Solução para nebulização'], lab_id: 'roche' },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // ANTILEUCOTRIENOS (extras)
  // (montelucaste já em PHARMA_DB — não duplicar)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'zafirlucaste',
    molecula: 'Zafirlucaste',
    nome_generico: 'Zafirlucaste',
    sinonimos: ['accolate', 'zafirlukast', 'zafirlucaste', 'antileucotriene alternativo'],
    categoria: 'respiratory',
    classe: 'Antagonista de Receptor de Leucotrieno',
    subclasse: 'Bloqueador seletivo de receptor CysLT1 — alternativa ao montelucaste',
    indicacoes_principais: [
      'Asma persistente leve-moderada (coadjuvante a ICS)',
      'Asma induzida por AINEs/AAS (sensibilidade ao ácido acetilsalicílico)',
    ],
    dose_adulto: {
      habitual: '20 mg VO 2×/dia',
      min: '20 mg 2×/dia',
      max: '40 mg/dia',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['2×/dia — em jejum (1h antes ou 2h após refeição)'],
      instrucoes: 'Tomar em jejum — alimentos reduzem absorção em ~40%. Monitorar função hepática mensalmente nas primeiras 12 semanas.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Cautela', tfg_lt_15: 'Cautela', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Não recomendado', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Hepatopatia ativa', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Varfarina', severidade: 'grave', descricao: 'Inibe CYP2C9 — aumenta INR significativamente — monitorar INR semanalmente nas primeiras semanas' },
      { com: 'Eritromicina / claritromicina', severidade: 'moderada', descricao: 'Reduzem zafirlucaste em ~40% — perda de efeito' },
      { com: 'Aspirina', severidade: 'leve', descricao: 'AAS aumenta zafirlucaste em ~45%' },
    ],
    alertas_especiais: [
      'Hepatotoxicidade: mais frequente que montelucaste — monitorar TGO/TGP',
      'Síndrome de Churg-Strauss: casos raros ao reduzir corticoide sistêmico',
      'DESVANTAGEM vs montelucaste: 2×/dia em jejum + hepatotoxicidade — montelucaste preferido no Brasil',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'Accolate®', laboratorio: 'AstraZeneca', concentracoes: ['20 mg'], formas: ['Comprimido'], lab_id: 'astrazeneca' },
    ],
  },

  {
    id: 'zileutona',
    molecula: 'Zileutona',
    nome_generico: 'Zileutona',
    sinonimos: ['zyflo', 'zileuton', 'zileutona', 'inibidor 5-lipoxigenase', 'anti lta4'],
    categoria: 'respiratory',
    classe: 'Antagonista de Receptor de Leucotrieno',
    subclasse: 'Inibidor de 5-lipoxigenase (5-LOX) — bloqueia síntese de TODOS os leucotrienos (LTA4, LTC4, LTD4, LTB4)',
    indicacoes_principais: [
      'Asma persistente — quando antileucotrienos de receptor insuficientes',
      'Asma grave por AINEs/AAS (mecanismo upstream)',
    ],
    dose_adulto: {
      habitual: '1200 mg LP 2×/dia',
      min: '600 mg LP 2×/dia',
      max: '2400 mg/dia (LP)',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['2×/dia (LP — com refeições)'],
      instrucoes: 'Tomar com refeição. Monitorar ALT antes, ao 1º mês, 3º mês, 6º mês e depois anualmente.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Cautela', tfg_lt_15: 'Cautela', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Contraindicado', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Hepatopatia ativa ou ALT > 3× LSN', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Teofilina', severidade: 'grave', descricao: 'Dobra nível de teofilina — toxicidade (convulsões, arritmias)' },
      { com: 'Varfarina', severidade: 'grave', descricao: 'Aumenta INR — monitorar' },
      { com: 'Propranolol', severidade: 'moderada', descricao: 'Aumenta nível de propranolol' },
    ],
    alertas_especiais: [
      'Hepatotoxicidade: mais frequente que montelucaste/zafirlucaste — monitoramento de ALT obrigatório',
      'Vantagem: inibe LTB4 (quimiotaxia neutrofílica) além de LTC4/D4/E4 — útil em asma neutrofílica',
      'Disponibilidade limitada no Brasil',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'Zyflo® CR', laboratorio: 'Cornerstone', concentracoes: ['600 mg LP'], formas: ['Comprimido LP'] },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // INIBIDOR DE PDE4 (DPOC)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'roflumilaste',
    uso_pediatrico: 'nao_aplicavel',
    molecula: 'Roflumilaste',
    nome_generico: 'Roflumilaste',
    sinonimos: ['daxas', 'daliresp', 'roflumilast', 'roflumilaste', 'pde4 inibidor', 'dpoc exacerbações'],
    categoria: 'respiratory',
    classe: 'Inibidor de PDE4',
    subclasse: 'Inibidor seletivo de fosfodiesterase-4 — anti-inflamatório oral para DPOC',
    indicacoes_principais: [
      'DPOC grave (VEF1 < 50% previsto) com bronquite crônica + ≥ 2 exacerbações/ano a despeito de tratamento inalatório máximo',
      'Adjuvante a broncodilatadores de longa ação — reduz exacerbações',
    ],
    dose_adulto: {
      habitual: '500 mcg VO 1×/dia',
      min: '250 mcg 1×/dia (primeiras 4 semanas — titulação)',
      max: '500 mcg/dia',
      unidade: 'mcg',
      via: 'VO',
      frequencias: ['1×/dia (qualquer horário, com ou sem alimento)'],
      instrucoes: 'Titular: iniciar 250 mcg/dia × 4 semanas → 500 mcg/dia. Redução de exacerbações moderadas-graves em ~20% (estudos OPUS/AURA). Peso: monitorar — causa perda de peso (descontinuar se > 5% do peso).',
    },
    ajuste_renal: { normal: '500 mcg/dia (excreção hepática)', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Contraindicado', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Hepatopatia moderada-grave (Child B/C)', 'Depressão grave / ideação suicida', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Rifampicina / carbamazepina / fenitoína', severidade: 'moderada', descricao: 'Indutores CYP3A4/1A2 — reduzem roflumilaste → perda de eficácia' },
      { com: 'Eritromicina / cetoconazol', severidade: 'moderada', descricao: 'Aumentam roflumilaste — possível toxicidade' },
    ],
    alertas_especiais: [
      'PERDA DE PESO: frequente (2–3 kg) — monitorar IMC; suspender se perda > 5% do peso corporal',
      'EFEITOS GASTRINTESTINAIS: diarreia, náusea, dor abdominal — frequentes nas primeiras semanas, geralmente transitórios',
      'DEPRESSÃO/SUICÍDIO: notificações — contraindicado em depressão grave; monitorar',
      'GOLD 2025: indicado em DPOC grave com bronquite crônica + exacerbações frequentes (grupo E)',
    ],
    uso_gestante: 'contraindicado',
    uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'Daxas®', laboratorio: 'AstraZeneca', concentracoes: ['500 mcg'], formas: ['Comprimido'], lab_id: 'astrazeneca' },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // CORTICOIDE SISTÊMICO (PULMONAR)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'prednisolona_asma',
    molecula: 'Prednisolona',
    nome_generico: 'Prednisolona',
    sinonimos: ['predsim', 'prelone', 'prednisolona', 'corticoide oral asma', 'corticoide dpoc', 'puff oral asma'],
    categoria: 'respiratory',
    classe: 'Corticosteroide Sistêmico',
    subclasse: 'Glicocorticoide — anti-inflamatório sistêmico para exacerbação de asma e DPOC',
    indicacoes_principais: [
      'Exacerbação aguda de asma moderada-grave (GINA — curso curto)',
      'Exacerbação aguda de DPOC (GOLD — 5 dias)',
      'Asma corticodependente grave (dose de manutenção mínima eficaz)',
    ],
    dose_adulto: {
      habitual: '40–60 mg VO 1×/dia × 5–7 dias (exacerbação)',
      min: '1 mg/kg/dia (asma)',
      max: '60 mg/dia (exacerbação aguda)',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['1×/dia (manhã — ritmo circadiano)', '2×/dia (doses altas)'],
      instrucoes: 'Asma/DPOC exacerbação: 40 mg 1×/dia × 5 dias (não necessita desmame se < 7 dias). DPOC: NÃO usar > 14 dias (sem benefício adicional + efeitos adversos). Tomar com alimento.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Cautela (retenção hídrica)', tfg_lt_15: 'Cautela', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Cautela', child_c: 'Preferir prednisolona vs prednisona (não requer ativação hepática)' },
    contraindicacoes_rapidas: ['Infecção sistêmica não controlada (relativa)', 'Hipersensibilidade', 'Psicose ativa grave (relativa)'],
    interacoes_importantes: [
      { com: 'Insulina / hipoglicemiantes', severidade: 'moderada', descricao: 'Hiperglicemia — aumentar dose de insulina em diabéticos' },
      { com: 'AINEs', severidade: 'moderada', descricao: 'Risco aditivo de úlcera péptica' },
      { com: 'Fluorquinolonas', severidade: 'moderada', descricao: 'Risco aditivo de tendinite/ruptura tendinosa' },
    ],
    alertas_especiais: [
      'CURSOS CURTOS (< 7 dias): desmame NÃO necessário',
      'DPOC: não prolongar além de 5–7 dias — sem benefício e maior risco de pneumonia',
      'Hiperglicemia: frequente (60–80%) — monitorar glicemia, especialmente em diabéticos',
      'Prednisolona (ativa) vs prednisona (pró-droga, requer ativação hepática) — preferir prednisolona em hepatopatas',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'seguro',
    marcas: [
      { nome: 'Predsim®', laboratorio: 'Eurofarma', concentracoes: ['5 mg', '20 mg'], formas: ['Comprimido'], lab_id: 'eurofarma' },
      { nome: 'Prelone®', laboratorio: 'EMS', concentracoes: ['3 mg/mL xarope'], formas: ['Xarope'] },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // OXIGENOTERAPIA
  // ══════════════════════════════════════════════════════════════

  {
    id: 'oxigenio_suplementar',
    molecula: 'Oxigênio',
    nome_generico: 'Oxigênio Suplementar (O₂)',
    sinonimos: ['o2 terapia', 'oxigenio', 'oxigenoterapia', 'cateter nasal', 'mascara venturi', 'otld', 'oxigenoterapia domiciliar'],
    categoria: 'respiratory',
    classe: 'Oxigenoterapia',
    subclasse: 'Gás medicinal — suporte ventilatório não invasivo',
    indicacoes_principais: [
      'Hipoxemia: SpO₂ < 94% (adultos gerais) — alvo 94–98%',
      'DPOC com hipoxemia crônica grave: PaO₂ ≤ 55 mmHg ou SpO₂ ≤ 88% — Oxigenoterapia Domiciliar de Longa Duração (OTLD)',
      'Crise asmática moderada-grave (SpO₂ < 94%)',
      'Pneumonia com hipoxemia',
      'COVID-19 grave / SDRA',
      'Cefaleia em salvas (O₂ 100% 12 L/min × 15–20 min — tratamento abortivo)',
    ],
    dose_adulto: {
      habitual: '1–4 L/min cateter nasal (SpO₂-guiado)',
      min: '0,5–1 L/min (OTLD DPOC)',
      max: '15 L/min (máscara não-reinalante) | DPOC: max 2–4 L/min',
      unidade: 'L/min',
      via: 'Inalatório',
      frequencias: ['Contínuo (OTLD: ≥ 15h/dia)', 'Conforme demanda (SpO₂-guiado)'],
      instrucoes: `DPOC: ALVO SpO₂ 88–92% (NÃO 94–98%) — risco de hipercapnia permissiva e drive ventilatório hipóxico.
Dispositivos e FiO₂:
• Cateter nasal: 1L=24%, 2L=28%, 3L=32%, 4L=36%, 5L=40%, 6L=44%
• Máscara simples: 5–6L=35–50%
• Máscara Venturi: FiO₂ preciso (24%, 28%, 31%, 35%, 40%, 60%)
• Máscara não-reinalante: 10–15L=90–95%
OTLD: ≥ 15h/dia melhora sobrevida em DPOC hipoxêmico crônico (estudos MRC/NOTT).`,
    },
    ajuste_renal: { normal: 'Guiar pela SpO₂', tfg_60_30: 'Guiar pela SpO₂', tfg_30_15: 'Guiar pela SpO₂', tfg_lt_15: 'Guiar pela SpO₂', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem restrição', child_b: 'Sem restrição', child_c: 'Sem restrição' },
    contraindicacoes_rapidas: ['Uso em ambiente com risco de incêndio/explosão (comburente — proibido fumar ou chama aberta)'],
    interacoes_importantes: [
      { com: 'Bleomicina (atual ou histórico)', severidade: 'grave', descricao: 'FiO₂ > 0,30 aumenta toxicidade pulmonar da bleomicina — usar FiO₂ mínima necessária' },
      { com: 'Paraquat (intoxicação)', severidade: 'grave', descricao: 'O₂ potencializa lesão pulmonar por paraquat — manter SpO₂ 88–90% apenas' },
    ],
    alertas_especiais: [
      'DPOC: NUNCA alvejar SpO₂ > 92% — perda de drive ventilatório hipóxico → retenção de CO₂ → acidose respiratória → coma',
      'OTLD: critérios GOLD/MS — PaO₂ ≤ 55 mmHg em repouso (ou ≤ 60 mmHg + HTP/poliglobulia/ICC); mínimo 15h/dia',
      'PREMATURO: SpO₂ alvo 91–95% — evitar retinopatia da prematuridade (hiperóxia) E complicações da hipóxia',
      'Queimado/inalação de fumaça: máscara não-reinalante 15L para CO (carboxihemoglobina)',
      'ALTO FLUXO NASAL (HFN): 30–60 L/min aquecido e umidificado — alternativa ao VNI em insuf. respiratória hipoxêmica',
    ],
    uso_gestante: 'seguro',
    uso_lactante: 'seguro',
    marcas: [
      { nome: 'Oxigênio Medicinal — Cilindro', laboratorio: 'Air Liquide / White Martins', concentracoes: ['≥ 99,5% O₂'], formas: ['Gás comprimido cilindro', 'Concentrador elétrico', 'Oxigênio líquido'] },
    ],
  },

  {
    id: 'heliox',
    molecula: 'Hélio-Oxigênio (Heliox)',
    nome_generico: 'Mistura Hélio/Oxigênio (70:30 ou 80:20)',
    sinonimos: ['heliox', 'helio oxigenio', 'he:o2', 'baixa densidade gas respiratorio'],
    categoria: 'respiratory',
    classe: 'Oxigenoterapia',
    subclasse: 'Mistura gasosa de baixa densidade — reduz trabalho respiratório em obstrução grave de vias aéreas',
    indicacoes_principais: [
      'Status asmático grave refratário a broncodilatadores',
      'Crupe grave (obstrução de vias aéreas superiores)',
      'Estridor pós-extubação',
      'Facilitação da VNI em DPOC exacerbado grave',
    ],
    dose_adulto: {
      habitual: 'Mistura 70:30 (He:O₂) — 10–15 L/min por máscara não-reinalante',
      min: 'Conforme FiO₂ necessária',
      max: 'Mistura 60:40 (se SpO₂ exigir mais O₂)',
      unidade: 'L/min',
      via: 'Inalatório',
      frequencias: ['Contínuo durante crise grave'],
      instrucoes: 'Hélio (densidade 0,179 g/L vs ar 1,29 g/L) → fluxo laminar em vias estreitadas → menor resistência → menor trabalho respiratório. Usar mistura 70:30 como máximo benefício (> 60% He necessário para efeito). NÃO nebulizar com hélio puro.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem restrição', child_b: 'Sem restrição', child_c: 'Sem restrição' },
    contraindicacoes_rapidas: ['Pneumotórax hipertensivo (não ventila)', 'Necessidade de FiO₂ > 0,40 (mistura 70:30 limita O₂)'],
    interacoes_importantes: [
      { com: 'Fármacos nebulizados (broncodilatadores)', severidade: 'leve', descricao: 'Gás de baixa densidade — altera o depósito do aerossol (↑deposição distal); ajustar o fluxo do nebulizador quando usado como gás propelente. Sem interação farmacológica sistêmica' },
    ],
    alertas_especiais: [
      'NÃO é broncodilatador — reduz trabalho respiratório mas não trata broncoespasmo',
      'PONTE: usar enquanto broncodilatadores e corticoides fazem efeito',
      'Custo elevado + disponibilidade limitada',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Heliox 70:30', laboratorio: 'Air Liquide / White Martins', concentracoes: ['70% He + 30% O₂'], formas: ['Gás medicinal cilindro'] },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // ANTIBIÓTICO PROFILÁTICO (DPOC — AZITROMICINA)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'azitromicina_dpoc',
    molecula: 'Azitromicina',
    nome_generico: 'Di-hidrato de Azitromicina',
    sinonimos: ['zithromax', 'azitromicina', 'azithromycin', 'dpoc profilaxia', 'macrolidio 15-membros'],
    categoria: 'antibiotico',
    classe: 'Macrolídeo',
    subclasse: '15-membros (azalídeo) — ação anti-inflamatória + antibacteriana (PAC e profilaxia DPOC)',
    indicacoes_principais: [
      'PAC leve-moderada (mono ou + beta-lactâmico)',
      'Profilaxia de exacerbações de DPOC grave (250–500 mg 3×/semana por ≥ 1 ano)',
      'Infecções por Mycobacterium avium complex (MAC)',
      'DST: uretrite/cervicite por Chlamydia (dose única)',
      'Coqueluche (Bordetella pertussis) — alternativa',
    ],
    dose_adulto: {
      habitual: '500 mg VO 1×/dia × 3–5 dias (PAC) | 250 mg 3×/semana (profilaxia DPOC)',
      min: '500 mg dose única (DST)',
      max: '500 mg/dia',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['1×/dia × 3–5 dias (PAC)', '3×/semana (profilaxia DPOC)'],
      instrucoes: 'PAC: 500 mg/dia × 3–5 dias. DST Chlamydia: 1 g dose única. Profilaxia DPOC: 250 mg 3×/semana ou 500 mg 3×/semana por pelo menos 1 ano. Tomar 1h antes ou 2h após refeição.',
    },
    ajuste_renal: { normal: 'Sem ajuste (excreção biliar)', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Cautela', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Não recomendado', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Prolongamento QT ou uso com outros QT-prolongadores', 'Hepatopatia grave', 'Hipersensibilidade a macrolídeos'],
    interacoes_importantes: [
      { com: 'Varfarina', severidade: 'moderada', descricao: 'Pode aumentar INR — monitorar' },
      { com: 'Digoxina', severidade: 'moderada', descricao: 'Aumenta digoxinemia via P-gp — monitorar' },
      { com: 'QT-prolongadores (haloperidol, amiodarona, quinolonas)', severidade: 'grave', descricao: 'Risco aditivo de torsades de pointes' },
    ],
    alertas_especiais: [
      'PROFILAXIA DPOC: estudo ALBERT (NEJM 2011): azitromicina 250 mg/dia reduziu exacerbações em 27% em DPOC grave',
      'RISCO DE RESISTÊNCIA: uso prolongado aumenta resistência de pneumococo — avaliar benefício-risco',
      'SURDEZ: perda auditiva reversível em uso prolongado — monitorar audiometria anualmente',
      'QT PROLONGADO: ECG antes e durante profilaxia crônica',
      'INIBIDOR FRACO de CYP3A4 — menos interações que claritromicina',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    espectro: [
      'Gram-positivos: Streptococcus pyogenes, S. pneumoniae (resistência crescente)',
      'Atípicos: Mycoplasma, Chlamydophila, Legionella, Chlamydia trachomatis',
      'Gram-negativos: H. influenzae (moderado), N. gonorrhoeae (resistência crescente)',
      'MAC: Mycobacterium avium complex',
      'NÃO cobre: gram-negativos entéricos, Pseudomonas, anaeróbios',
    ],
    mic_breakpoints: {
      'S. pneumoniae (EUCAST)': 'S ≤ 0,25 mg/L · R > 0,5 mg/L',
      'Chlamydia trachomatis': 'S ≤ 1 mg/L',
    },
    resistencia: [
      'Genes erm(B) e mef(A): resistência em S. pneumoniae e S. pyogenes',
      'Menor inibição de CYP3A4 vs claritromicina',
    ],
    guidelines_referencia: [
      'ATS/IDSA: CAP Guidelines 2019',
      'GOLD 2025: Profilaxia com macrolídeo em DPOC',
      'ALBERT Trial: NEJM 2011',
    ],
    marcas: [
      { nome: 'Zithromax®', laboratorio: 'Pfizer', concentracoes: ['250 mg', '500 mg'], formas: ['Comprimido', 'Pó para suspensão'], lab_id: 'pfizer' },
      { nome: 'Azitromicina EMS', laboratorio: 'EMS', concentracoes: ['500 mg'], formas: ['Comprimido'] },
      { nome: 'Azitromicina Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['500 mg'], formas: ['Comprimido'], lab_id: 'eurofarma' },
    ],
  },

];
