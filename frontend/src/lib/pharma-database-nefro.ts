// ============================================================
// PRESCREVE-AI — Extensão Farmacológica: NEFROLOGIA (Phase 21.8) — Parte B
// Quelantes de Fósforo · Agentes de Diálise · Nefroproteção · Eritropoetina · Mineral-ósseo
// ============================================================

import type { QuickDrug } from './pharma-database';

export const PHARMA_DB_NEFRO: QuickDrug[] = [

  // ══════════════════════════════════════════════════════════════
  // QUELANTES DE FÓSFORO
  // ══════════════════════════════════════════════════════════════

  {
    id: 'sevelamer',
    molecula: 'Sevelamer',
    nome_generico: 'Carbonato de Sevelamer / Cloridrato de Sevelamer',
    sinonimos: ['renvela', 'renagel', 'sevelamer', 'quelante fosforo', 'hiperfosfatemia dialise', 'sevelamer carbonato'],
    categoria: 'outro',
    classe: 'Quelante de Fósforo',
    subclasse: 'Polímero catiônico não absorvível — quelante de fósforo SEM cálcio e SEM alumínio — 1ª linha em diálise',
    indicacoes_principais: [
      'Hiperfosfatemia em DRC em diálise (hemodiálise e diálise peritoneal) — 1ª linha',
      'Hiperfosfatemia em DRC não dialítica (estágios 3–5)',
    ],
    dose_adulto: {
      habitual: '800–1600 mg VO 3×/dia com as refeições',
      min: '800 mg 3×/dia',
      max: '14 g/dia (em casos refratários)',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['3×/dia — OBRIGATORIAMENTE COM REFEIÇÕES'],
      instrucoes: 'TOMAR COM A REFEIÇÃO (quelação ocorre no intestino): iniciar 800 mg 3×/dia com cada refeição. Titular conforme fósforo (alvo P: 3,5–5,5 mg/dL em diálise). Carbonato (Renvela) preferível ao cloridrato (Renagel) em acidose metabólica. NÃO TRITURAR (ação local).',
    },
    ajuste_renal: { normal: 'Uso principal é em DRC', tfg_60_30: 'Pode ser necessário', tfg_30_15: 'Dose conforme P sérico', tfg_lt_15: 'Uso primário — guiar por fósforo sérico', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste (não absorvido)', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    contraindicacoes_rapidas: ['Hipofosfatemia', 'Obstrução intestinal', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Levotiroxina / ciprofloxacino / tacrolimo / micofenolato', severidade: 'moderada', descricao: 'Quelação intestinal reduz absorção desses medicamentos. Administrar levotiroxina/antibióticos 1h antes ou 3h após sevelamer' },
      { com: 'Varfarina', severidade: 'leve', descricao: 'Pode reduzir absorção de vitamina K — monitorar INR' },
    ],
    alertas_especiais: [
      'VANTAGEM vs quelantes com cálcio: sem hipercalcemia, sem calcificação vascular adicional (KDIGO)',
      'CARBONATO vs CLORIDRATO: Renvela (carbonato) não piora acidose; Renagel (cloridrato) pode agravar acidose metabólica — preferir carbonato',
      'INTERAÇÕES: separar de antibióticos fluorquinolonas e levotiroxina por 1–3h',
      'COMPRIMIDOS: difíceis de engolir (grandes) — sachê em água é alternativa',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'risco',
    start: 'START K1: quelante de fósforo sem cálcio em DRC com hiperfosfatemia e calcificação vascular',
    marcas: [
      { nome: 'Renvela®', laboratorio: 'Genzyme/Sanofi', concentracoes: ['800 mg comprimido', '2,4 g sachê'], formas: ['Comprimido', 'Sachê'] },
      { nome: 'Renagel®', laboratorio: 'Genzyme', concentracoes: ['400 mg', '800 mg'], formas: ['Comprimido (cloridrato)'] },
      { nome: 'Sevelamer EMS', laboratorio: 'EMS', concentracoes: ['800 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'carbonato-calcio-quelante',
    molecula: 'Carbonato de Cálcio (quelante)',
    nome_generico: 'Carbonato de Cálcio',
    sinonimos: ['calcionate', 'tums', 'carbonato calcio quelante fosforo', 'quelante fosforo calcio', 'hiperfosfatemia calcio'],
    categoria: 'outro',
    classe: 'Quelante de Fósforo',
    subclasse: 'Quelante de fósforo com cálcio — baixo custo, amplamente disponível — limitar em hipercalcemia e calcificação vascular',
    indicacoes_principais: [
      'Hiperfosfatemia em DRC (quando sevelamer não disponível ou intolerância)',
      'Suplementação de cálcio (em conjunto com quelação)',
    ],
    dose_adulto: {
      habitual: '500–1500 mg de cálcio elementar (CaCO3 1250 mg = 500 mg Ca elementar) com as refeições',
      min: '500 mg/dia de Ca elementar',
      max: '1500 mg/dia de Ca elementar (KDIGO: < 2000 mg Ca total, incluindo dieta)',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['3×/dia com refeições (quelação) | 2×/dia (suplementação)'],
      instrucoes: 'QUELAÇÃO: tomar COM a refeição (quelação de fósforo no intestino). SUPLEMENTAÇÃO DE Ca: tomar ENTRE as refeições (melhor absorção do cálcio). KDIGO: limitar cálcio elementar total a 2000 mg/dia. Evitar em hipercalcemia (Ca > 10,5 mg/dL).',
    },
    ajuste_renal: { normal: 'Monitorar Ca e P', tfg_60_30: 'Monitorar Ca, P, PTH', tfg_30_15: 'Monitorar rigorosamente', tfg_lt_15: 'Uso com cautela — hipercalcemia frequente em diálise', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    contraindicacoes_rapidas: ['Hipercalcemia (Ca > 10,5 mg/dL)', 'Calcificação vascular grave', 'Nefrolitíase de cálcio', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Levotiroxina / fluorquinolonas / bisfosfonatos / ferro', severidade: 'moderada', descricao: 'Reduz absorção desses medicamentos — separar por 2–4h' },
      { com: 'Digoxina', severidade: 'moderada', descricao: 'Hipercalcemia potencializa toxicidade da digoxina' },
      { com: 'Diuréticos tiazídicos', severidade: 'moderada', descricao: 'Aumentam absorção de cálcio → hipercalcemia' },
    ],
    alertas_especiais: [
      'KDIGO 2017: preferir quelantes SEM cálcio (sevelamer, carbonato de lantânio) em pacientes com hipercalcemia, calcificação vascular ou PTH baixo',
      'CARGA DE CÁLCIO: monitorar Ca total da dieta + medicamento. Excesso → calcificação de coronárias e valvas',
      'MILKSYNDROME: uso excessivo → hipercalcemia, alcalose metabólica, IRA',
    ],
    uso_gestante: 'seguro',
    uso_lactante: 'seguro',
    marcas: [
      { nome: 'Calcionate®', laboratorio: 'Prati-Donaduzzi', concentracoes: ['1250 mg (= 500 mg Ca elem)'], formas: ['Comprimido'] },
      { nome: 'Carbonato de Cálcio EMS', laboratorio: 'EMS', concentracoes: ['500 mg', '1000 mg', '1250 mg'], formas: ['Comprimido', 'Sachê'] },
    ],
  },

  {
    id: 'carbonato-lantanio',
    molecula: 'Carbonato de Lantânio',
    nome_generico: 'Carbonato de Lantânio',
    sinonimos: ['fosrenol', 'lanthanum carbonate', 'carbonato lantanio', 'quelante fosforo lantanio', 'hiperfosfatemia sem calcio'],
    categoria: 'outro',
    classe: 'Quelante de Fósforo',
    subclasse: 'Terra-rara não absorvível — quelante de fósforo SEM cálcio — comprimido mastigável',
    indicacoes_principais: [
      'Hiperfosfatemia em DRC dialítica — alternativa ao sevelamer quando intolerância GI',
    ],
    dose_adulto: {
      habitual: '750–1500 mg/dia em 3 doses com as refeições',
      min: '750 mg/dia',
      max: '3750 mg/dia',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['3×/dia (MASTIGAR com as refeições)'],
      instrucoes: 'MASTIGAR completamente — não engolir inteiro. Eficácia similar ao sevelamer. Mínima absorção sistêmica (< 0,002%). Vantagem: não tem carga de cálcio. Desvantagem: custo elevado e necessidade de mastigar.',
    },
    ajuste_renal: { normal: 'Sem ajuste (não absorvido)', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Uso primário na DRC avançada', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    contraindicacoes_rapidas: ['Hipofosfatemia', 'Obstrução intestinal', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Fluorquinolonas / levotiroxina', severidade: 'moderada', descricao: 'Quelação intestinal — separar por 2h' },
    ],
    alertas_especiais: [
      'MASTIGAÇÃO OBRIGATÓRIA: ação local no intestino',
      'SEM CARGA DE CÁLCIO: preferível em hipercalcemia ou calcificação vascular',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'risco',
    marcas: [
      { nome: 'Fosrenol®', laboratorio: 'Shire', concentracoes: ['500 mg', '750 mg', '1000 mg'], formas: ['Comprimido mastigável'] },
    ],
  },

  {
    id: 'hidroxido-aluminio',
    molecula: 'Hidróxido de Alumínio',
    nome_generico: 'Hidróxido de Alumínio',
    sinonimos: ['gel de alumina', 'hydroxide aluminium', 'hidroxido aluminio', 'quelante fosforo aluminio', 'antiácido aluminio'],
    categoria: 'gastroenterologia',
    classe: 'Quelante de Fósforo',
    subclasse: 'Antiácido / quelante de fósforo com alumínio — USO RESTRITO em DRC (neurotoxicidade com uso prolongado)',
    indicacoes_principais: [
      'Hiperfosfatemia grave refratária de curto prazo (máx 4–6 semanas)',
      'Antiácido (DRGE leve)',
    ],
    dose_adulto: {
      habitual: '300–600 mg VO com refeições (quelante) | 600 mg entre refeições (antiácido)',
      min: '300 mg/dia',
      max: '1800 mg/dia (curto prazo)',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['3–4×/dia'],
      instrucoes: 'USO MÁXIMO 4–6 SEMANAS em DRC. Alumínio acumula em DRC → osteomalacia, encefalopatia por alumínio (demência dialítica), anemia. Reservar para hiperfosfatemia grave refratária por curto prazo.',
    },
    ajuste_renal: { normal: 'Sem ajuste (antiácido)', tfg_60_30: 'Usar < 4 semanas', tfg_30_15: 'EVITAR — acúmulo de alumínio', tfg_lt_15: 'CONTRAINDICADO crônico — uso emergencial < 4 semanas', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    contraindicacoes_rapidas: ['DRC avançada (TFG < 30) — uso crônico', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Fluorquinolonas / levotiroxina / ferro / bisfosfonatos', severidade: 'moderada', descricao: 'Quelação intestinal — reduz absorção. Separar por 2–4h' },
      { com: 'Citrato (incluindo sucos cítricos)', severidade: 'moderada', descricao: 'Citrato aumenta absorção de alumínio dramaticamente — EVITAR combinação em DRC' },
    ],
    alertas_especiais: [
      'TOXICIDADE POR ALUMÍNIO em DRC: encefalopatia dialítica (demência, mioclonias, disartria), osteomalacia (fraturas por fragilidade), anemia microcítica resistente',
      'CITRATO: nunca associar em DRC (aumenta absorção de Al 3–6×)',
      'PREFERIR SEVELAMER: quelante de escolha em DRC. Alumínio apenas curto prazo em emergência',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'risco',
    stopp: 'STOPP J5: hidróxido de alumínio cronicamente em DRC > 30 dias',
    marcas: [
      { nome: 'Gel de Alumina®', laboratorio: 'EMS', concentracoes: ['300 mg/5 mL suspensão', '300 mg comprimido'], formas: ['Suspensão oral', 'Comprimido'] },
      { nome: 'Maalox®', laboratorio: 'Sanofi', concentracoes: ['Al(OH)3 + Mg(OH)2'], formas: ['Suspensão oral', 'Comprimido mastigável'] },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // ERITROPOETINAS / AGENTES ESTIMULADORES DA ERITROPOESE (AEE)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'eritropoetina-alfa',
    molecula: 'Epoetina Alfa',
    nome_generico: 'Epoetina Alfa (EPO)',
    sinonimos: ['eprex', 'hemax', 'eritropoetina', 'epoetina', 'epoetin alpha', 'aee dialise', 'anemia renal'],
    categoria: 'outro',
    classe: 'Agente Estimulador da Eritropoese',
    subclasse: 'Eritropoetina recombinante humana — estimula proliferação de eritrócitos — análogo da EPO endógena',
    indicacoes_principais: [
      'Anemia da DRC (em diálise e pré-diálise — Hb < 10 g/dL)',
      'Anemia em quimioterapia mielossupressora (selecionados)',
      'Anemia por zidovudina em HIV',
    ],
    dose_adulto: {
      habitual: '50–100 UI/kg SC ou IV 3×/semana (hemodiálise) | 50–150 UI/kg SC 1–3×/semana (pré-diálise)',
      min: '50 UI/kg 3×/semana',
      max: 'Guiado por Hb — não ultrapassar Hb 11,5 g/dL (KDIGO)',
      unidade: 'UI/kg',
      via: 'SC',
      frequencias: ['3×/semana (HD) | 1–3×/semana (pré-diálise) | SC preferível (mais eficiente que IV)'],
      instrucoes: 'ALVO DE Hb: 10–11,5 g/dL (KDIGO 2012). NÃO normalizar Hb (> 13 g/dL → aumento de mortalidade CV — CHOIR/TREAT). Corrigir ferropenia ANTES: FE < 20% ou ferritina < 100 ng/mL → ferro IV primeiro. Monitorar PA (HAS em até 25%). Trombose AV fístula.',
    },
    ajuste_renal: { normal: 'Uso primário em DRC', tfg_60_30: 'Dose conforme Hb alvo', tfg_30_15: 'Dose conforme Hb alvo', tfg_lt_15: 'Uso primário — conforme Hb', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela', child_c: 'Cautela' },
    contraindicacoes_rapidas: ['HAS não controlada', 'Hipersensibilidade à EPO', 'PRCA (aplasia eritroide pura por anticorpos anti-EPO)'],
    interacoes_importantes: [
      { com: 'Anti-hipertensivos', severidade: 'leve', descricao: 'EPO pode elevar PA — ajustar anti-hipertensivo' },
    ],
    alertas_especiais: [
      'HB ALVO 10–11,5 g/dL: normalizar Hb aumenta risco de AVC e IAM (estudos CHOIR, TREAT, CREATE)',
      'FERROPENIA: corrigir ANTES da EPO (Fe IV se FE < 20% ou ferritina < 100). EPO ineficaz sem ferro adequado',
      'HAS: monitorar PA — efeito vasoconstritor direto da EPO. Tratar com IECA/BCC',
      'APLASIA ERITROIDE PURA (PRCA): anticorpos anti-EPO — suspender e não substituir por outra EPO',
      'Via SC: 30–50% mais eficiente que IV (menor dose necessária)',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'risco',
    marcas: [
      { nome: 'Eprex®', laboratorio: 'Janssen', concentracoes: ['1000 UI', '2000 UI', '3000 UI', '4000 UI', '10000 UI/mL'], formas: ['Seringa pré-cheia SC/IV'] },
      { nome: 'Hemax®', laboratorio: 'Blausiegel', concentracoes: ['2000 UI', '4000 UI', '10000 UI'], formas: ['Frasco SC/IV'] },
    ],
  },

  {
    id: 'darbepoetina-alfa',
    molecula: 'Darbepoetina Alfa',
    nome_generico: 'Darbepoetina Alfa',
    sinonimos: ['aranesp', 'darbepoetin', 'darbepoetina', 'aee vida longa', 'eritropoetina longa acao'],
    categoria: 'outro',
    classe: 'Agente Estimulador da Eritropoese',
    subclasse: 'EPO hiperglicosilada — meia-vida 3× maior que epoetina → dosagem semanal ou quinzenal',
    indicacoes_principais: [
      'Anemia da DRC (hemodiálise e pré-diálise) — maior comodidade (semanal/quinzenal)',
      'Anemia em quimioterapia mielossupressora',
    ],
    dose_adulto: {
      habitual: '0,45 mcg/kg SC/IV 1×/semana ou 0,75 mcg/kg a cada 2 semanas (DRC pré-diálise)',
      min: '0,45 mcg/kg/semana',
      max: 'Guiado por Hb alvo (10–11,5 g/dL)',
      unidade: 'mcg/kg',
      via: 'SC',
      frequencias: ['1×/semana ou 1×/quinzena — SC preferível'],
      instrucoes: 'CONVERSÃO DE EPOETINA: 200 UI epoetina/semana ≈ 1 mcg darbepoetina/semana. Menor frequência de injeção = melhor adesão. Mesmos alvos de Hb e cautelas que epoetina alfa.',
    },
    ajuste_renal: { normal: 'Uso primário em DRC', tfg_60_30: 'Dose conforme Hb', tfg_30_15: 'Dose conforme Hb', tfg_lt_15: 'Dose conforme Hb', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela', child_c: 'Cautela' },
    contraindicacoes_rapidas: ['HAS não controlada', 'Hipersensibilidade', 'PRCA'],
    interacoes_importantes: [],
    alertas_especiais: [
      'MESMAS CAUTELAS QUE EPOETINA: Hb alvo < 11,5 g/dL, corrigir ferropenia antes',
      'VANTAGEM: 1×/semana ou quinzenal (vs 3×/semana da epoetina alfa)',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'risco',
    marcas: [
      { nome: 'Aranesp®', laboratorio: 'Amgen', concentracoes: ['10 mcg', '20 mcg', '30 mcg', '40 mcg', '60 mcg', '100 mcg', '150 mcg', '200 mcg', '300 mcg', '500 mcg'], formas: ['Seringa pré-cheia SC/IV'] },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // METABOLISMO MINERAL ÓSSEO NA DRC (CKD-MBD)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'paricalcitol',
    molecula: 'Paricalcitol',
    nome_generico: 'Paricalcitol (19-nor-1,25-dihidroxivitamina D2)',
    sinonimos: ['zemplar', 'paricalcitol', 'vitamina d2 analogo', 'hiperparatireoidismo dialise', 'pth secundario paricalcitol'],
    categoria: 'outro',
    classe: 'Análogo da Vitamina D',
    subclasse: 'Agonista seletivo do receptor de vitamina D (VDR) — menor hipercalcemia e hiperfosfatemia que calcitriol',
    indicacoes_principais: [
      'Hiperparatireoidismo secundário em DRC em diálise (IV 3×/semana)',
      'Hiperparatireoidismo secundário em DRC pré-diálise (VO diário)',
    ],
    dose_adulto: {
      habitual: 'IV: 0,04–0,1 mcg/kg 3×/semana (após hemodiálise) | VO: PTH 500–1000 pg/mL → 1 mcg/dia; > 1000 → 2 mcg/dia',
      min: '1 mcg/dia (VO)',
      max: '0,24 mcg/kg/dose IV (ajuste por PTH)',
      unidade: 'mcg',
      via: 'IV',
      frequencias: ['IV: 3×/semana (após HD) | VO: 1×/dia ou 3×/semana'],
      instrucoes: 'ALVO PTH: 2–9× LSN para o estágio de DRC (KDIGO). Monitorar Ca, P e PTH mensalmente. Suspender ou reduzir se Ca > 10,5 mg/dL ou Ca × P > 55. IV: bolus ao final da HD. VO: tomar com ou sem alimento.',
    },
    ajuste_renal: { normal: 'Uso primário em DRC', tfg_60_30: 'Dose conforme PTH/Ca', tfg_30_15: 'Dose conforme PTH/Ca', tfg_lt_15: 'Uso primário — guiar por PTH e Ca', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela — metabolismo hepático', child_b: 'Reduzir dose', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Hipercalcemia', 'Intoxicação por vitamina D', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Colestiramina / sequestrantes biliares', severidade: 'moderada', descricao: 'Reduzem absorção de paricalcitol VO — separar por 2h' },
      { com: 'Cetoconazol', severidade: 'moderada', descricao: 'Inibição CYP24A1 → paricalcitol aumenta' },
      { com: 'Digitálicos', severidade: 'moderada', descricao: 'Hipercalcemia potencializa toxicidade da digoxina' },
    ],
    alertas_especiais: [
      'VANTAGEM vs calcitriol: menor hipercalcemia e hiperfosfatemia (seletividade VDR)',
      'MONITORAR Ca × P: calcificação extraóssea se produto > 55 mg²/dL²',
      'SUSPENDER se PTH < 2× LSN ou Ca > 10,5 mg/dL',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'risco',
    marcas: [
      { nome: 'Zemplar®', laboratorio: 'AbbVie', concentracoes: ['1 mcg', '2 mcg (VO)', '5 mcg/mL (IV)'], formas: ['Cápsula', 'Ampola IV'] },
    ],
  },

  {
    id: 'cinacalcete',
    molecula: 'Cinacalcete',
    nome_generico: 'Cloridrato de Cinacalcete',
    sinonimos: ['mimpara', 'sensipar', 'cinacalcet', 'cinacalcete', 'calcimimetico', 'pth secundario calcimimetico', 'hipercalcemia paratireoidea'],
    categoria: 'outro',
    classe: 'Calcimimético',
    subclasse: 'Agonista alostérico do receptor sensível ao cálcio (CaR) nas paratireoides — reduz PTH SEM elevar Ca e P',
    indicacoes_principais: [
      'Hiperparatireoidismo secundário grave em DRC dialítica (refratário a vitamina D)',
      'Hipercalcemia em carcinoma de paratireoide',
      'Hiperparatireoidismo primário inoperável',
    ],
    dose_adulto: {
      habitual: '30 mg VO 1×/dia com alimento (iniciar) → titular até 180 mg/dia',
      min: '30 mg/dia',
      max: '180 mg/dia',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['1×/dia com refeição'],
      instrucoes: 'Iniciar 30 mg. Titular em 30 mg a cada 2–4 semanas conforme PTH. Alvo PTH: 2–9× LSN. MONITORAR CÁLCIO: hipocalcemia sintomática frequente (cãibras, parestesias) — suspender se Ca < 7,5 mg/dL. Tomar com alimento.',
    },
    ajuste_renal: { normal: 'Sem ajuste (uso primário em DRC dialítica)', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Uso primário', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela (metabolismo hepático — nível pode aumentar)', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Hipocalcemia (Ca < 8,4 mg/dL)', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'CYP2D6 — antipsicóticos, antidepressivos TCAs', severidade: 'moderada', descricao: 'Cinacalcete inibe CYP2D6 — aumenta nível de substratos (risperidona, flecainida, metoprolol, amitriptilina)' },
      { com: 'CYP3A4 inibidores (cetoconazol, itraconazol)', severidade: 'moderada', descricao: 'Aumentam cinacalcete — monitorar PTH e Ca' },
    ],
    alertas_especiais: [
      'HIPOCALCEMIA: principal efeito adverso — monitorar Ca dentro de 1 semana após início e ajuste. Sintomático: Ca IV',
      'INIBIDOR CYP2D6: revisar lista de medicamentos do paciente',
      'NÁUSEAS/VÔMITOS: frequentes (30%) — tomar com refeição volumosa reduz',
      'VANTAGEM vs vitamina D: reduz PTH SEM aumentar Ca e P (complementar)',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'risco',
    pgx_genes: ['CYP2D6 (inibidor moderado — afeta substratos)', 'CYP3A4 (metabolismo)'],
    marcas: [
      { nome: 'Mimpara®', laboratorio: 'Amgen', concentracoes: ['30 mg', '60 mg', '90 mg'], formas: ['Comprimido'] },
      { nome: 'Sensipar®', laboratorio: 'Amgen', concentracoes: ['30 mg', '60 mg', '90 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'calcitriol',
    molecula: 'Calcitriol',
    nome_generico: 'Calcitriol (1,25-dihidroxicolecalciferol)',
    sinonimos: ['rocaltrol', 'calcijex', 'calcitriol', 'vitamina d ativa', 'vitamina d3 ativa', 'pth secundario calcitriol'],
    categoria: 'outro',
    classe: 'Análogo da Vitamina D',
    subclasse: 'Forma ativa da vitamina D3 — não requer ativação renal (útil em DRC)',
    indicacoes_principais: [
      'Hiperparatireoidismo secundário em DRC (pré-diálise e diálise)',
      'Hipoparatireoidismo',
      'Raquitismo dependente de vitamina D',
      'Osteodistrofia renal',
    ],
    dose_adulto: {
      habitual: '0,25–0,5 mcg/dia VO | IV: 0,5–4 mcg 3×/semana (após HD)',
      min: '0,25 mcg/dia',
      max: '2 mcg/dia (VO) | 4 mcg/dose IV',
      unidade: 'mcg',
      via: 'VO',
      frequencias: ['1×/dia (VO) | 3×/semana IV (após HD)'],
      instrucoes: 'Monitorar Ca e P (risco de hipercalcemia maior que paricalcitol). IV: bolus ao final da diálise. DIFERENÇA DO COLECALCIFEROL: calcitriol já é a forma ativa — não depende de ativação renal ou hepática.',
    },
    ajuste_renal: { normal: 'Uso primário em DRC', tfg_60_30: 'Dose conforme PTH/Ca', tfg_30_15: 'Dose conforme PTH/Ca', tfg_lt_15: 'Dose conforme PTH/Ca', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste (forma ativa)', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    contraindicacoes_rapidas: ['Hipercalcemia', 'Intoxicação por vitamina D', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Digoxina', severidade: 'moderada', descricao: 'Hipercalcemia potencializa toxicidade' },
      { com: 'Tiazídicos', severidade: 'moderada', descricao: 'Hipercalcemia aditiva' },
    ],
    alertas_especiais: [
      'RISCO DE HIPERCALCEMIA: maior que paricalcitol — monitorar Ca semanalmente no início',
      'FORMA ATIVA: não requer rins funcionantes para ativação (diferente de colecalciferol/ergocalciferol)',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'risco',
    marcas: [
      { nome: 'Rocaltrol®', laboratorio: 'Roche', concentracoes: ['0,25 mcg', '0,5 mcg'], formas: ['Cápsula'], lab_id: 'roche' },
      { nome: 'Calcijex®', laboratorio: 'Abbott', concentracoes: ['1 mcg/mL IV'], formas: ['Ampola IV'] },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // NEFROPROTEÇÃO / EQUILÍBRIO ÁCIDO-BASE
  // ══════════════════════════════════════════════════════════════

  {
    id: 'bicarbonato-sodio-oral',
    molecula: 'Bicarbonato de Sódio Oral',
    nome_generico: 'Bicarbonato de Sódio',
    sinonimos: ['sodio bicarbonato', 'bicarbonato sodio oral', 'acidose metabolica cronica drc', 'nefroproteção bicarbonato'],
    categoria: 'outro',
    classe: 'Corretor de Acidose Metabólica',
    subclasse: 'Alcalinizante — tampão de base — retarda progressão da DRC em acidose metabólica crônica',
    indicacoes_principais: [
      'Acidose metabólica crônica na DRC (HCO3 < 22 mEq/L) — retarda progressão renal',
      'Acidose tubular renal',
      'Alcalinização urinária (uricosúria, cistinúria)',
      'Hipercalemia (adjuvante à resina trocadora de K)',
    ],
    dose_adulto: {
      habitual: '0,5–1 mEq/kg/dia VO em 2–3 tomadas (1 g NaHCO3 = 12 mEq HCO3)',
      min: '0,5 mEq/kg/dia',
      max: 'Guiado por HCO3 sérico (alvo ≥ 22 mEq/L)',
      unidade: 'g',
      via: 'VO',
      frequencias: ['2–3×/dia com água'],
      instrucoes: 'DRC: alvo HCO3 22–26 mEq/L (KDIGO). 1 comprimido de 500 mg = 6 mEq. Iniciar 1–2 g 2–3×/dia. EVIDÊNCIA: estudo Bycroft — bicarbonato oral retarda progressão da DRC vs placebo. Monitorar Na e edema (carga de Na).',
    },
    ajuste_renal: { normal: 'Sem ajuste (indicação em DRC)', tfg_60_30: 'Dose conforme HCO3', tfg_30_15: 'Dose conforme HCO3', tfg_lt_15: 'Dose conforme HCO3 — cuidado com sobrecarga de Na', dialisavel: true },
    ajuste_hepatico: { child_a: 'Cautela (ascite/edema)', child_b: 'Cautela', child_c: 'Contraindicado (retenção de sódio)' },
    contraindicacoes_rapidas: ['Alcalose metabólica', 'Hipocalcemia (tetania)', 'Insuficiência cardíaca descompensada (retenção de Na)', 'Hipernatremia'],
    interacoes_importantes: [
      { com: 'Lítio', severidade: 'moderada', descricao: 'Alcalinização aumenta excreção renal de lítio — reduz nível' },
      { com: 'Tetraciclinase / fluorquinolonas', severidade: 'leve', descricao: 'pH alcalino reduz absorção de antibióticos ácidos — separar 2h' },
    ],
    alertas_especiais: [
      'EVIDÊNCIA DE NEFROPROTEÇÃO: estudos mostram que correção da acidose metabólica retarda progressão da DRC e melhora nutrição proteica',
      'SOBRECARGA DE SÓDIO: cada grama de NaHCO3 = 12 mEq Na. Monitorar edema, PA e peso em ICC e cirróticos',
      'CÁLCULO DE DOSE: déficit de HCO3 = 0,5 × peso (kg) × (HCO3 desejado − HCO3 atual)',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'seguro',
    start: 'START K2: bicarbonato oral em DRC com acidose metabólica (HCO3 < 22 mEq/L)',
    marcas: [
      { nome: 'Bicarbonato de Sódio EMS', laboratorio: 'EMS', concentracoes: ['500 mg', '1000 mg'], formas: ['Comprimido'] },
      { nome: 'Bicarbonato de Sódio Manipulado', laboratorio: 'Farmácia magistral', concentracoes: ['500 mg', '840 mg'], formas: ['Cápsula', 'Comprimido'] },
    ],
  },

  {
    id: 'patiromer',
    molecula: 'Patiromer Sórbitex Cálcio',
    nome_generico: 'Patiromer',
    sinonimos: ['veltassa', 'patiromer', 'quelante potassio', 'hipercalemia drc', 'hipercalemia ieca'],
    categoria: 'outro',
    classe: 'Quelante de Potássio',
    subclasse: 'Polímero trocador de cátions (K+ por Ca2+) não absorvível — nova geração, melhor tolerado que resina sódica',
    indicacoes_principais: [
      'Hipercalemia crônica em DRC (K+ > 5,5 mEq/L)',
      'Hipercalemia relacionada ao uso de IECA/BRA/inibidores de aldosterona em DRC — permite manter nefroproteção',
    ],
    dose_adulto: {
      habitual: '8,4 g VO 1×/dia (sachê em 40 mL água)',
      min: '8,4 g/dia',
      max: '25,2 g/dia',
      unidade: 'g',
      via: 'VO',
      frequencias: ['1×/dia (não junto com refeição — separar 3h de qualquer medicamento oral)'],
      instrucoes: 'SEPARAR MEDICAMENTOS: patiromer quelam outros fármacos no intestino. Tomar qualquer medicamento oral 3h antes ou 3h após. Iniciar 8,4 g → titular em 8,4 g a cada ≥ 1 semana. NÃO AQUECER (destrói polímero). Misturar em 40 mL água (não outros líquidos).',
    },
    ajuste_renal: { normal: 'Sem ajuste (não absorvido)', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste — uso primário', tfg_lt_15: 'Uso primário em DRC avançada', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    contraindicacoes_rapidas: ['Hipocalemia (K+ < 3,5 mEq/L)', 'Obstrução intestinal', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'TODOS os medicamentos orais', severidade: 'moderada', descricao: 'Quelação intestinal — separar todos os medicamentos orais por 3h' },
    ],
    alertas_especiais: [
      'VANTAGEM vs resina sódica (Kayexalate): sem risco de necrose intestinal, sem sorbitol (que causa os problemas), melhor tolerabilidade',
      'PERMITE MANTER IECA/BRA: terapia nefroprotetora que causa hipercalemia pode ser mantida ao adicionar patiromer',
      'SEPARAÇÃO OBRIGATÓRIA: 3h de qualquer medicamento oral (absorve cátions divalentes)',
      'MONITORAR K+ semanalmente por 1 mês, depois mensalmente',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'risco',
    start: 'START K3: quelante de potássio para permitir manutenção de IECA/BRA em DRC hipercalêmica',
    marcas: [
      { nome: 'Veltassa®', laboratorio: 'Vifor', concentracoes: ['8,4 g sachê', '16,8 g sachê', '25,2 g sachê'], formas: ['Sachê (pó oral)'] },
    ],
  },

  {
    id: 'poliestireno-sulfonato-calcio',
    molecula: 'Poliestireno Sulfonato de Cálcio',
    nome_generico: 'Resina Trocadora de Potássio — Ca',
    sinonimos: ['sorcal', 'resonium calcium', 'poliestireno sulfonato', 'kayexalate', 'resina troca potassio', 'hipercalemia resina'],
    categoria: 'outro',
    classe: 'Quelante de Potássio',
    subclasse: 'Resina trocadora de cátions (K+ por Ca2+) não absorvível — 1ª geração — efeito lento (6–12h)',
    indicacoes_principais: [
      'Hipercalemia aguda e crônica (K+ > 5,5 mEq/L) em DRC',
      'Hipercalemia resistente a medidas conservadoras',
    ],
    dose_adulto: {
      habitual: '15–30 g VO em 50–100 mL água 1–3×/dia | Enema: 30 g em 150 mL água retido 30–60 min',
      min: '15 g/dia',
      max: '60 g/dia',
      unidade: 'g',
      via: 'VO',
      frequencias: ['1–3×/dia VO | Enema: 1–2×/dia'],
      instrucoes: 'EFEITO LENTO: não adequada para hipercalemia aguda grave (usar gluconato de Ca, insulina + glicose, bicarbonato, salbutamol IV para efeito imediato). Enema: preferível quando VO não disponível ou em íleo. NÃO associar sorbitol (necrose intestinal).',
    },
    ajuste_renal: { normal: 'Uso principal em DRC', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Uso primário', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Cautela', child_c: 'Não recomendado' },
    contraindicacoes_rapidas: ['Hipocalemia', 'Obstrução intestinal', 'Pós-operatório GI recente (necrose intestinal)'],
    interacoes_importantes: [
      { com: 'Sorbitol', severidade: 'grave', descricao: 'Associação aumenta o risco de necrose intestinal — evitar administração conjunta (recomendação removida pela FDA em 2009)' },
      { com: 'Antiácidos/laxantes com cátions (hidróxido de Mg/Al)', severidade: 'moderada', descricao: 'Podem causar alcalose metabólica e perda de eficácia da resina — espaçar ≥2 h' },
      { com: 'Digoxina', severidade: 'grave', descricao: 'A hipocalemia induzida potencializa a toxicidade digitálica (arritmias ventriculares)' },
      { com: 'Medicamentos orais em geral', severidade: 'moderada', descricao: 'A resina liga fármacos no TGI e reduz sua absorção — espaçar ≥3 h' },
    ],
    alertas_especiais: [
      'NÃO É EMERGÊNCIA: efeito em 6–12h. Para hipercalemia aguda grave: gluconato de Ca IV, insulina+glicose, bicarbonato, salbutamol → DEPOIS resina para eliminar K+',
      'NECROSE INTESTINAL: associada ao uso com sorbitol (Kayexalate + sorbitol) — NÃO associar',
      'PATIROMER: nova geração, melhor tolerado e sem necrose intestinal — preferível quando disponível',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'risco',
    marcas: [
      { nome: 'Sorcal®', laboratorio: 'Sanofi', concentracoes: ['3,2 g/5 mL suspensão', '15 g sachê'], formas: ['Suspensão oral', 'Sachê'] },
      { nome: 'Resonium A®', laboratorio: 'Sanofi', concentracoes: ['15 g sachê (sódio)'], formas: ['Sachê — troca Na×K (carga de sódio)'] },
    ],
  },

  {
    id: 'ferro-iv',
    molecula: 'Ferro Intravenoso (Sacarato / Carboximaltose)',
    nome_generico: 'Sacarato de Ferro / Ferrocarboximaltose',
    sinonimos: ['noripurum', 'ferinject', 'iron sucrose', 'sacarato ferro', 'carboximaltose ferro', 'ferro iv anemia drc dialise', 'ferro hemodialise'],
    categoria: 'outro',
    classe: 'Suplemento de Ferro',
    subclasse: 'Complexo de ferro para administração IV — reposição de estoques em anemia ferropriva ou funcional',
    indicacoes_principais: [
      'Anemia ferropriva em DRC em hemodiálise (reposição de perdas)',
      'Anemia ferropriva em DRC pré-diálise (quando VO ineficaz)',
      'Reposição de ferro pré-AEE (ferritina < 100 ng/mL ou FE < 20%)',
      'Anemia ferropriva em ICC (Ferinject — independente de DRC)',
    ],
    dose_adulto: {
      habitual: 'Sacarato: 100–200 mg IV por sessão de HD (máx 1 g/semana) | Ferrocarboximaltose: 1000 mg IV dose única (Ferinject)',
      min: '100 mg/semana',
      max: '1000 mg/dose (Ferinject — dose única em 15 min)',
      unidade: 'mg',
      via: 'IV',
      frequencias: ['Sacarato: 3×/semana (durante HD) ou semanal | Ferrocarboximaltose: dose única ou 2 doses'],
      instrucoes: 'SACARATO (Noripurum): 100–200 mg em 100 mL SF em 30 min (ou bolus lento durante HD). FERROCARBOXIMALTOSE (Ferinject): 1000 mg em 15 min (sem teste). Monitorar reação de hipersensibilidade. Alérgico a ferro dextrano: usar sacarato ou carboximaltose (menor risco de anafilaxia).',
    },
    ajuste_renal: { normal: 'Uso primário em DRC', tfg_60_30: 'Sem ajuste da dose', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Uso primário em HD — guiar por ferritina e FE', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela', child_c: 'Não recomendado' },
    contraindicacoes_rapidas: ['Hipersensibilidade ao ferro IV (anafilaxia prévia)', 'Sobrecarga de ferro (ferritina > 800 ng/mL)', 'Anemia não ferropriva', 'Infecção bacteriana ativa (ferro alimenta bactérias)'],
    interacoes_importantes: [
      { com: 'Ferro oral', severidade: 'moderada', descricao: 'Absorção competitiva — não co-administrar; suspender oral quando iniciando IV' },
    ],
    alertas_especiais: [
      'ANAFILAXIA: monitorar 30 min após infusão. Material de ressuscitação disponível',
      'HIPERSENSIBILIDADE vs REAÇÃO DE INFUSÃO: dor lombar, rubor durante infusão → desacelerar (não é anafilaxia)',
      'FERRO ALIMENTA INFECÇÃO: não iniciar com infecção bacteriana ativa',
      'ALVO EM DRC/HD: ferritina 200–500 ng/mL, FE > 20% (KDIGO)',
      'FERINJECT: dose única conveniente (1000 mg) — custo maior que sacarato',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'seguro',
    start: 'START K4: ferro IV em DRC em hemodiálise com ferritina < 200 ng/mL ou FE < 20%',
    marcas: [
      { nome: 'Noripurum®', laboratorio: 'Vifor', concentracoes: ['100 mg/5 mL (sacarato)'], formas: ['Ampola IV'] },
      { nome: 'Ferinject®', laboratorio: 'Vifor', concentracoes: ['500 mg/10 mL', '1000 mg/20 mL (carboximaltose)'], formas: ['Frasco IV'] },
      { nome: 'Infed®', laboratorio: 'Luitpold', concentracoes: ['50 mg/mL (ferro dextrano)'], formas: ['Ampola IV — maior risco anafilaxia'] },
    ],
  },

  {
    id: 'fludrocortisona',
    molecula: 'Fludrocortisona',
    nome_generico: 'Acetato de Fludrocortisona',
    sinonimos: ['florinef', 'fludrocortisone', 'fludrocortisona', 'mineralocorticoide', 'insuficiencia adrenal fludrocortisona', 'hipotensao ortostática fludrocortisona'],
    categoria: 'hormonio',
    classe: 'Mineralocorticoide',
    subclasse: 'Corticoide de alta atividade mineralocorticoide — retenção de Na e excreção de K',
    indicacoes_principais: [
      'Insuficiência adrenal primária (doença de Addison) — reposição mineralocorticoide',
      'Hipotensão ortostática (disautonômica — Shy-Drager, Parkinson, diabética)',
      'Síndrome cerebral perdedora de sal (neurocirurgia)',
    ],
    dose_adulto: {
      habitual: '0,05–0,2 mg VO 1×/dia',
      min: '0,05 mg/dia',
      max: '0,3 mg/dia',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['1×/dia (manhã)'],
      instrucoes: 'Insuficiência adrenal: 0,05–0,1 mg/dia + hidrocortisona. Hipotensão ortostática: 0,1–0,2 mg/dia. Monitorar PA, edema, K+ sérico. Doses maiores → hipertensão e hipocalemia.',
    },
    ajuste_renal: { normal: 'Sem ajuste formal', tfg_60_30: 'Cautela — edema e HAS', tfg_30_15: 'Cautela extrema', tfg_lt_15: 'Evitar', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Reduzir dose', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Infecção fúngica sistêmica', 'HAS grave não controlada', 'ICC descompensada', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'AINEs', severidade: 'moderada', descricao: 'Retenção de Na aditiva — edema, HAS' },
      { com: 'Laxativos / furosemida', severidade: 'moderada', descricao: 'Hipocalemia aditiva' },
      { com: 'Antidiabéticos', severidade: 'moderada', descricao: 'Antagoniza efeito hipoglicemiante' },
    ],
    alertas_especiais: [
      'ADDISON: substituição indispensável — sem mineralocorticoide o paciente corre risco de crise adrenal por hiponatremia e hipercalemia',
      'MONITORAR: PA, K+, Na+, edema. Ajustar dose pela PA em pé',
      'Beers 2023: cautela em idosos — retenção hídrica e HAS',
    ],
    uso_gestante: 'risco',
    uso_lactante: 'risco',
    beers_criteria: 'Beers 2023: cautela em idosos com ICC ou HAS',
    marcas: [
      { nome: 'Florinef®', laboratorio: 'Aspen', concentracoes: ['0,1 mg'], formas: ['Comprimido'] },
    ],
  },

];
