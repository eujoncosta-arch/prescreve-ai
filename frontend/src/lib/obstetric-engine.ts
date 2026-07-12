// ============================================================
// PRESCREVE-AI — Motor Obstétrico + Ginecológico (Phase 21.11)
// Teratogenicidade · Lactação · Pré-eclâmpsia · DMG
// Contraceptivos · TH · Terapia Gestacional
// ============================================================

// ─── TIPOS BASE ───────────────────────────────────────────────

export interface ObstetricProfile {
  statusGestacional: 'gestante' | 'lactante' | 'nenhum';
  idadeGestacionalSemanas?: number;    // IG atual
  trimestre?: 1 | 2 | 3;
  amamentando?: boolean;
  idadeIdadeFilhoMeses?: number;        // para lactação
  comorbidades?: string[];             // ex: 'hipertensao', 'diabetes', 'lúpus'
  anticoagulacao?: boolean;
  tabagismo?: boolean;
  enxaqueca?: boolean;
  trombofilia?: boolean;
}

// ─── TERATOGENICIDADE ─────────────────────────────────────────

export type TeratogenicityCategory =
  | 'A'   // Estudos controlados em humanos: sem risco
  | 'B'   // Estudos animais: sem risco; humanos: dados insuficientes
  | 'C'   // Estudos animais: efeito adverso; sem estudos humanos — avaliar risco/benefício
  | 'D'   // Evidência de risco fetal humano — benefício pode superar risco em situações graves
  | 'X'   // Risco fetal claramente supera qualquer benefício — CONTRAINDICADO na gestação
  | 'N/A'; // Não classificado / dados insuficientes

export interface TeratogenicityData {
  drugId: string;
  drugName: string;
  categoriaFDA: TeratogenicityCategory;
  riscoTrimestre1?: string;
  riscoTrimestre2?: string;
  riscoTrimestre3?: string;
  mecanismoRisco?: string;
  efeitosConhecidos?: string[];
  alternativaSegura?: string;
  monitoramentoGestante?: string;
  usoPossivelCom?: string;  // quando o uso é justificado
  fontes: string[];
}

export const TERATOGENICITY_DB: TeratogenicityData[] = [
  // ── CARDIOVASCULAR / HIPERTENSÃO GESTACIONAL ─────────────
  {
    drugId: 'metildopa',
    drugName: 'Metildopa',
    categoriaFDA: 'B',
    riscoTrimestre1: 'Segura — 1ª linha para HAS na gestação',
    riscoTrimestre2: 'Segura',
    riscoTrimestre3: 'Segura',
    efeitosConhecidos: ['Sedação materna', 'Depressão pós-parto (monitorar)'],
    monitoramentoGestante: 'PA, função hepática',
    fontes: ['ACOG 2019', 'SBH 2021'],
  },
  {
    drugId: 'nifedipino',
    drugName: 'Nifedipino (ação prolongada)',
    categoriaFDA: 'C',
    riscoTrimestre1: 'Dados limitados — evitar se possível',
    riscoTrimestre2: 'Seguro na prática clínica para HAS grave',
    riscoTrimestre3: '2ª linha HAS grave; tocólise off-label',
    efeitosConhecidos: ['Rubor, cefaleia, hipotensão reflexa materna'],
    monitoramentoGestante: 'PA, frequência cardíaca fetal (BCF)',
    fontes: ['ACOG 2019', 'Magee 2023'],
  },
  {
    drugId: 'labetalol',
    drugName: 'Labetalol',
    categoriaFDA: 'C',
    riscoTrimestre1: 'Evitar (betabloqueio no 1T pode causar RCIU)',
    riscoTrimestre2: 'Uso justificado em HAS grave refratária',
    riscoTrimestre3: 'Monitorar: bradicardia neonatal, hipoglicemia RN',
    efeitosConhecidos: ['Bradicardia fetal', 'Hipoglicemia neonatal', 'RCIU com uso prolongado no 1T'],
    alternativaSegura: 'Metildopa (preferível no 1T)',
    monitoramentoGestante: 'BCF, glicemia neonatal ao nascer',
    fontes: ['ACOG 2019'],
  },
  {
    drugId: 'enalapril',
    drugName: 'IECA (enalapril, lisinopril, ramipril)',
    categoriaFDA: 'D',
    riscoTrimestre1: 'Possível teratogenicidade cardiovascular (dados controversos)',
    riscoTrimestre2: 'CONTRAINDICADO — fetotoxicidade renal grave (oligoâmnio)',
    riscoTrimestre3: 'CONTRAINDICADO — anúria fetal, hipoplasia pulmonar, morte fetal',
    mecanismoRisco: 'Bloqueio do SRA fetal → insuficiência renal fetal → oligoâmnio → hipoplasia pulmonar',
    efeitosConhecidos: ['Oligoâmnio', 'Hipoplasia pulmonar fetal', 'Crânio fetal defeituoso', 'Anúria neonatal', 'Morte fetal'],
    alternativaSegura: 'Metildopa, nifedipino XL, labetalol',
    fontes: ['FDA Teratology Advisory 2006', 'ACOG 2019'],
  },
  {
    drugId: 'hidralazina',
    drugName: 'Hidralazina',
    categoriaFDA: 'C',
    riscoTrimestre1: 'Dados insuficientes — evitar',
    riscoTrimestre2: 'Uso pontual IV em crise hipertensiva',
    riscoTrimestre3: 'Via IV para emergência hipertensiva em pré-eclâmpsia grave',
    efeitosConhecidos: ['Taquicardia reflexa materna', 'Cefaleia', 'Hipotensão grave se usada com sulfato de magnésio'],
    monitoramentoGestante: 'PA a cada 5 min pós-dose IV',
    fontes: ['ACOG 2019', 'Magee 2023'],
  },
  // ── ANTICOAGULANTES ─────────────────────────────────────
  {
    drugId: 'heparina',
    drugName: 'Heparina não fracionada / HBPM',
    categoriaFDA: 'B',
    riscoTrimestre1: 'Segura — não atravessa placenta',
    riscoTrimestre2: 'Segura',
    riscoTrimestre3: 'Suspender antes do parto / peridural (12–24h HBPM)',
    efeitosConhecidos: ['Trombocitopenia materna (TIH — monitorar)', 'Osteopenia com uso prolongado'],
    monitoramentoGestante: 'Plaquetas, anti-Xa (HBPM)',
    fontes: ['ACOG 2018', 'ESC 2018'],
  },
  {
    drugId: 'varfarina',
    drugName: 'Varfarina',
    categoriaFDA: 'X',
    riscoTrimestre1: 'CONTRAINDICADO — embriopatia varfarínica (nariz sela, hipoplasia óssea)',
    riscoTrimestre2: 'Risco de hemorragia do SNC fetal',
    riscoTrimestre3: 'CONTRAINDICADO pré-parto — hemorragia neonatal grave',
    mecanismoRisco: 'Atravessa livremente a placenta → inibe vitamina K fetal → coagulopatia',
    efeitosConhecidos: ['Embriopatia varfarínica (nariz em sela, condrodisplasia punctata)', 'Microcefalia', 'Hemorragia intracraniana fetal'],
    alternativaSegura: 'HBPM (enoxaparina) em todas as indicações durante a gestação',
    fontes: ['FDA', 'ACOG 2018', 'ESC 2018'],
  },
  {
    drugId: 'apixabana',
    drugName: 'Anticoagulantes orais diretos (apixabana, rivaroxabana, dabigatrana)',
    categoriaFDA: 'C',
    riscoTrimestre1: 'CONTRAINDICADO — dados insuficientes; embriotóxico em animais',
    riscoTrimestre2: 'CONTRAINDICADO',
    riscoTrimestre3: 'CONTRAINDICADO',
    alternativaSegura: 'HBPM (enoxaparina) — única anticoagulação segura na gestação além da HNF',
    fontes: ['ESC 2018', 'ACOG 2021'],
  },
  // ── ANALGÉSICOS ─────────────────────────────────────────
  {
    drugId: 'paracetamol',
    drugName: 'Paracetamol',
    categoriaFDA: 'B',
    riscoTrimestre1: 'Seguro',
    riscoTrimestre2: 'Seguro',
    riscoTrimestre3: 'Seguro — analgésico de 1ª escolha na gestação',
    efeitosConhecidos: ['Uso prolongado (> 28 dias): possível associação com TDAH/autismo — dados ainda controversos'],
    monitoramentoGestante: 'Usar menor dose eficaz pelo menor tempo possível',
    fontes: ['ACOG 2023', 'Cochrane 2022'],
  },
  {
    drugId: 'ibuprofeno',
    drugName: 'Ibuprofeno / AINEs',
    categoriaFDA: 'D',
    riscoTrimestre1: 'Evitar — possível associação com aborto espontâneo e gastrosquise',
    riscoTrimestre2: 'Uso pontual pode ser justificado (< 32 sem, < 48h)',
    riscoTrimestre3: 'CONTRAINDICADO ≥ 28 semanas — fechamento prematuro do canal arterial',
    mecanismoRisco: 'Inibe prostaglandinas → constricção do canal arterial fetal; reduz diurese fetal → oligoâmnio',
    efeitosConhecidos: ['Fechamento prematuro do canal arterial (≥ 28 sem)', 'Oligoâmnio', 'Insuficiência renal fetal', 'Hipertensão pulmonar neonatal'],
    alternativaSegura: 'Paracetamol em qualquer trimestre',
    fontes: ['FDA 2020 (aviso de segurança)', 'ACOG 2023'],
  },
  {
    drugId: 'morfina',
    drugName: 'Opioides (morfina, codeína, tramadol)',
    categoriaFDA: 'C',
    riscoTrimestre1: 'Evitar se possível — possível associação com defeitos cardíacos (codeína)',
    riscoTrimestre2: 'Usar se absolutamente necessário — menor tempo possível',
    riscoTrimestre3: 'Síndrome de abstinência neonatal (NAS) se uso crônico. Depressão respiratória RN',
    efeitosConhecidos: ['Síndrome de abstinência neonatal (NAS)', 'Depressão respiratória neonatal', 'Baixo peso ao nascer'],
    monitoramentoGestante: 'NAS score (Finnegan) no RN',
    usoPossivelCom: 'Dor refratária a paracetamol em qualquer trimestre; parto (peridural/morfina intratecal)',
    fontes: ['ACOG 2017', 'CDC 2022'],
  },
  // ── ANTIBIÓTICOS ────────────────────────────────────────
  {
    drugId: 'amoxicilina',
    drugName: 'Amoxicilina / Penicilinas',
    categoriaFDA: 'B',
    riscoTrimestre1: 'Segura',
    riscoTrimestre2: 'Segura',
    riscoTrimestre3: 'Segura',
    fontes: ['ACOG 2023', 'CDC 2023'],
  },
  {
    drugId: 'azitromicina',
    drugName: 'Azitromicina / Macrolídeos',
    categoriaFDA: 'B',
    riscoTrimestre1: 'Dados limitados — usar se necessário (clamídia, coqueluche)',
    riscoTrimestre2: 'Segura',
    riscoTrimestre3: 'Segura',
    efeitosConhecidos: ['Eritromicina estolato: hepatotóxica para a mãe — evitar'],
    fontes: ['ACOG 2023'],
  },
  {
    drugId: 'nitrofurantoina',
    drugName: 'Nitrofurantoína',
    categoriaFDA: 'B',
    riscoTrimestre1: 'Segura (1ª e 2T)',
    riscoTrimestre2: 'Segura',
    riscoTrimestre3: 'EVITAR ≥ 36 semanas — hemólise neonatal (eritrócitos imaturos com G6PD insuficiente)',
    efeitosConhecidos: ['Hemólise neonatal se usado perto do parto', 'Neuropatia materna com uso prolongado'],
    alternativaSegura: 'Cefalexina a partir de 36 semanas',
    fontes: ['ACOG 2022'],
  },
  {
    drugId: 'ciprofloxacino',
    drugName: 'Fluoroquinolonas (ciprofloxacino, levofloxacino)',
    categoriaFDA: 'C',
    riscoTrimestre1: 'Evitar — artropatia em animais jovens (dados humanos tranquilizadores)',
    riscoTrimestre2: 'Usar apenas sem alternativa — risco teórico cartilagem fetal',
    riscoTrimestre3: 'Usar somente se sem alternativa',
    alternativaSegura: 'Amoxicilina, cefalosporinas, azitromicina (conforme sensibilidade)',
    fontes: ['ACOG 2023'],
  },
  {
    drugId: 'metronidazol',
    drugName: 'Metronidazol',
    categoriaFDA: 'B',
    riscoTrimestre1: 'Evitar no 1T (mutagênico em alta dose em animais — dados humanos tranquilizadores)',
    riscoTrimestre2: 'Seguro — 1ª linha para vaginose bacteriana e tricomoníase',
    riscoTrimestre3: 'Seguro',
    fontes: ['ACOG 2023', 'CDC STI 2021'],
  },
  {
    drugId: 'doxiciclina',
    drugName: 'Tetraciclinas (doxiciclina, tetraciclina)',
    categoriaFDA: 'D',
    riscoTrimestre1: 'CONTRAINDICADO — inibe ossos e dentes fetais',
    riscoTrimestre2: 'CONTRAINDICADO ≥ 15 semanas',
    riscoTrimestre3: 'CONTRAINDICADO',
    mecanismoRisco: 'Quelação de cálcio → deposição em ossos e dentes em formação → inibição de crescimento',
    efeitosConhecidos: ['Coloração permanente dos dentes (dentes amarelos)', 'Inibição do crescimento ósseo fetal'],
    alternativaSegura: 'Azitromicina (para clamídia, atípicos), amoxicilina (para lyme)',
    fontes: ['FDA', 'ACOG 2023'],
  },
  {
    drugId: 'smz-tmp',
    drugName: 'Sulfametoxazol/Trimetoprima',
    categoriaFDA: 'D',
    riscoTrimestre1: 'EVITAR — antagonista do folato → defeitos do tubo neural; possível cardiovascular',
    riscoTrimestre2: 'Usar com cautela se sem alternativa',
    riscoTrimestre3: 'EVITAR — kernicterus neonatal (deslocamento de bilirrubina)',
    mecanismoRisco: 'TMP antagoniza DHFR (folato) → defeitos do tubo neural. SMZ desloca bilirrubina no RN',
    efeitosConhecidos: ['Defeitos do tubo neural', 'Kernicterus neonatal', 'Cardiovasculares'],
    alternativaSegura: 'Nitrofurantoína (< 36 semanas), cefalexina para ITU',
    fontes: ['ACOG 2022'],
  },
  // ── PSIQUIATRIA ─────────────────────────────────────────
  {
    drugId: 'sertralina',
    drugName: 'ISRS (sertralina, fluoxetina, citalopram)',
    categoriaFDA: 'C',
    riscoTrimestre1: 'Sertralina preferida — dados de segurança mais amplos',
    riscoTrimestre2: 'Benefício geralmente supera risco em depressão moderada-grave',
    riscoTrimestre3: 'Síndrome de descontinuação neonatal (SDN) transitória; raro HPPRN',
    efeitosConhecidos: [
      'Síndrome de descontinuação neonatal (SDN): tremor, irritabilidade, dificuldade de alimentação — autolimitada 1–2 dias',
      'Paroxetina: ↑ risco malformação cardíaca — evitar',
      'Raro: hipertensão pulmonar persistente do RN (fluoxetina no 3T)',
    ],
    usoPossivelCom: 'Depressão grave/risco de suicídio — benefício materno supera risco fetal. Sertralina é o ISRS preferido.',
    monitoramentoGestante: 'Ecocardiograma fetal (fluoxetina/paroxetina no 1T), SDN neonatal',
    fontes: ['ACOG 2023', 'Huybrechts 2015'],
  },
  {
    drugId: 'lítio',
    drugName: 'Lítio',
    categoriaFDA: 'D',
    riscoTrimestre1: 'Risco de anomalia de Ebstein (cardíaca) — risco real mas pequeno (< 0,1%)',
    riscoTrimestre2: 'Monitorar nível sérico (eliminação renal aumentada)',
    riscoTrimestre3: 'Toxicidade neonatal: hipotonia, cianose, bradicardia; reduzir dose pré-parto',
    efeitosConhecidos: ['Anomalia de Ebstein (< 0,1%)', 'Síndrome do flácido neonatal', 'Diabetes insipidus neonatal'],
    usoPossivelCom: 'Transtorno bipolar grave — descontinuação tem alto risco de recaída. Manter com monitoramento rigoroso.',
    monitoramentoGestante: 'Nível sérico mensal (ajuste de dose); ecocardiograma fetal 16–20 semanas',
    fontes: ['ACOG 2023', 'Patorno 2017'],
  },
  {
    drugId: 'acido-valproico',
    drugName: 'Ácido Valpróico / Valproato',
    categoriaFDA: 'X',
    riscoTrimestre1: 'CONTRAINDICADO — maior teratógeno anticonvulsivante (spina bifida 1–2%, malformações múltiplas)',
    riscoTrimestre2: 'CONTRAINDICADO se houver alternativa',
    riscoTrimestre3: 'Síndrome de abstinência neonatal; coagulopatia neonatal',
    mecanismoRisco: 'Inibe enzimas epigenéticas (HDAC) → alteração da expressão gênica fetal',
    efeitosConhecidos: ['Spina bifida e DTN (1–2%)', 'Fenda palatina', 'Malformações cardíacas', 'Déficit cognitivo (QI -8 a -10 pontos)', 'Autismo'],
    alternativaSegura: 'Lamotrigina (menor risco), levetiracetam (dados favoráveis). Consultar neurologista.',
    fontes: ['EMA 2023 (uso restrito em mulheres em idade fértil)', 'ACOG 2023', 'Tomson 2018'],
  },
  {
    drugId: 'carbamazepina',
    drugName: 'Carbamazepina',
    categoriaFDA: 'D',
    riscoTrimestre1: 'Defeitos do tubo neural (0,5%), síndrome fetal da carbamazepina',
    riscoTrimestre2: 'Monitorar nível sérico',
    riscoTrimestre3: 'Deficiência de vitamina K fetal — suplementar no RN',
    efeitosConhecidos: ['DTN (0,5%)', 'Microcefalia', 'Retardo de crescimento', 'Síndrome fetal (face dismórfica)'],
    usoPossivelCom: 'Epilepsia sem controle com outros agentes — suplementar folato 5 mg/dia antes da concepção',
    monitoramentoGestante: 'Alfa-fetoproteína, US morfológico detalhado, nível sérico mensal',
    fontes: ['ACOG 2023', 'Tomson 2018'],
  },
  {
    drugId: 'lamotrigina',
    drugName: 'Lamotrigina',
    categoriaFDA: 'C',
    riscoTrimestre1: 'Dados favoráveis — 1ª linha anticonvulsivante na gestação',
    riscoTrimestre2: 'Metabolismo aumentado na gestação — monitorar nível e ajustar dose',
    riscoTrimestre3: 'Nível sérico cai na gestação (≥ 50%): ajustar dose para manter eficácia',
    efeitosConhecidos: ['Possível risco mínimo de fenda labial em altas doses (< 1%)'],
    usoPossivelCom: 'Epilepsia, transtorno bipolar — antiepiléptico preferido na gestação',
    monitoramentoGestante: 'Nível sérico mensal (metabolismo aumenta muito no 2T e 3T)',
    fontes: ['ACOG 2023', 'Pennell 2022'],
  },
  // ── ENDÓCRINO / DIABETES GESTACIONAL ────────────────────
  {
    drugId: 'metformina',
    drugName: 'Metformina',
    categoriaFDA: 'B',
    riscoTrimestre1: 'Dados tranquilizadores — sem teratogenicidade em humanos',
    riscoTrimestre2: 'Segura — aprovada para DM2 na gestação em vários países',
    riscoTrimestre3: 'Atravessa placenta — possível efeito no metabolismo fetal (monitorar crescimento)',
    efeitosConhecidos: ['Possível menor peso ao nascer (controverso)', 'Atravessa placenta (sem efeitos adversos documentados)'],
    usoPossivelCom: 'DMG refratário a dieta + exercício quando insulina não é aceita/disponível. ACOG 2018: aceitável como 2ª opção.',
    fontes: ['ACOG 2018', 'MiG Trial 2008', 'Rowan 2018'],
  },
  {
    drugId: 'insulina',
    drugName: 'Insulina (NPH, Regular, Análogos)',
    categoriaFDA: 'B',
    riscoTrimestre1: 'Segura — não atravessa placenta',
    riscoTrimestre2: 'Segura — 1ª linha para DMG e DM pré-gestacional',
    riscoTrimestre3: 'Ajustar doses (necessidade cresce progressivamente no 3T)',
    efeitosConhecidos: ['Hipoglicemia materna se superdose'],
    monitoramentoGestante: 'Glicemia capilar 4–7×/dia; HbA1c trimestral',
    fontes: ['ACOG 2018', 'SBD 2023'],
  },
  // ── TIREÓIDE ────────────────────────────────────────────
  {
    drugId: 'levotiroxina',
    drugName: 'Levotiroxina',
    categoriaFDA: 'A',
    riscoTrimestre1: 'Segura — aumentar dose em 25–30% assim que gestação confirmada',
    riscoTrimestre2: 'Segura',
    riscoTrimestre3: 'Segura',
    monitoramentoGestante: 'TSH a cada 4–6 semanas até 20 semanas; depois trimestral. Alvo TSH: < 2,5 mUI/L no 1T.',
    fontes: ['ATA 2017'],
  },
  {
    drugId: 'propiltiouracil',
    drugName: 'Propiltiouracil (PTU)',
    categoriaFDA: 'D',
    riscoTrimestre1: 'Preferido no 1T (metimazol causa aplasia cutis e atresia de coanas no 1T)',
    riscoTrimestre2: 'Trocar para metimazol no 2T (PTU causa hepatotoxicidade grave materna)',
    riscoTrimestre3: 'Metimazol (menor risco que PTU no 2–3T)',
    efeitosConhecidos: ['Hipotireoidismo fetal', 'Bócio fetal', 'PTU: hepatotoxicidade materna grave'],
    monitoramentoGestante: 'T4L a cada 4 semanas; US fetal (tireoide)',
    usoPossivelCom: 'Hipertireoidismo materno grave (doença de Graves). PTU no 1T → metimazol no 2–3T.',
    fontes: ['ATA 2017', 'Lazarus 2014'],
  },
  // ── TERAPIA GESTACIONAL ESPECÍFICA ──────────────────────
  {
    drugId: 'sulfato-magnesio',
    drugName: 'Sulfato de Magnésio',
    categoriaFDA: 'B',
    riscoTrimestre1: 'Não aplicável — uso hospitalar agudo',
    riscoTrimestre2: 'Seguro para neuroproteção fetal',
    riscoTrimestre3: '1ª linha: neuroproteção fetal (< 32 semanas), eclâmpsia e pré-eclâmpsia grave',
    efeitosConhecidos: ['Uso > 5–7 dias: hipocalcemia e osteopenia neonatal (Beery, 2011)', 'Toxicidade materna: perda do reflexo patelar, depressão respiratória'],
    monitoramentoGestante: 'Nível sérico 4–7 mEq/L (terapêutico). Reflexo patelar e diurese materna a cada hora.',
    fontes: ['ACOG 2020', 'Magpie Trial', 'BEAM Trial 2008'],
  },
  {
    drugId: 'betametasona',
    drugName: 'Betametasona / Dexametasona (corticoide antenatal)',
    categoriaFDA: 'C',
    riscoTrimestre1: 'Não indicado no 1T',
    riscoTrimestre2: '24–34 semanas: 1ª linha para maturação pulmonar fetal',
    riscoTrimestre3: 'Indicado 24–34 semanas com risco de PPT em 7 dias. Considerar até 36 sem.',
    efeitosConhecidos: ['Hiperglicemia materna transitória', 'Supressão imune transitória'],
    usoPossivelCom: 'Risco de parto prematuro entre 24–34 semanas — reduz SDR, hemorragia intraventricular, enterocolite',
    fontes: ['ACOG 2017 (reafirmado 2023)', 'Liggins & Howie 1972', 'Cochrane 2022'],
  },
  {
    drugId: 'progesterona-vaginal',
    drugName: 'Progesterona Vaginal',
    categoriaFDA: 'B',
    riscoTrimestre1: 'Suporte da fase lútea — segura',
    riscoTrimestre2: 'Colo < 25 mm: 200 mg vaginal/noite reduz PPT',
    riscoTrimestre3: 'Manter até 34–36 semanas se indicação de colo curto',
    efeitosConhecidos: ['Corrimento vaginal (forma vaginal)', 'Sedação leve'],
    usoPossivelCom: 'Colo < 25 mm no 2T (singletons); suporte de fase lútea em FIV',
    fontes: ['ACOG 2022', 'OPPTIMUM Trial 2016', 'FIGO 2021'],
  },
  // ── HORMÔNIOS CONTRACEPTIVOS ─────────────────────────────
  {
    drugId: 'etinilestradiol-levonorgestrel',
    drugName: 'ACO Combinado (EE + Progestogênio)',
    categoriaFDA: 'X',
    riscoTrimestre1: 'CONTRAINDICADO — masculinização de feto feminino (raro); risco trombótico materno',
    riscoTrimestre2: 'CONTRAINDICADO',
    riscoTrimestre3: 'CONTRAINDICADO',
    alternativaSegura: 'Progesterona isolada ou HBPM se anticoagulação necessária',
    fontes: ['ACOG 2021'],
  },
];

// ─── SEGURANÇA NA LACTAÇÃO ────────────────────────────────────

export type LactationSafety =
  | 'seguro'           // L1–L2: compatível com amamentação
  | 'compativel'       // L2: provavelmente seguro
  | 'precaucao'        // L3: monitorar lactente
  | 'risco'            // L4: possivelmente perigoso — avaliar
  | 'contraindicado';  // L5: contraindicado

export interface LactationData {
  drugId: string;
  drugName: string;
  categoriaHale: string;        // L1–L5 (Hale's Medications & Mothers' Milk)
  seguranca: LactationSafety;
  passagemLeite: string;        // ex: 'mínima (< 1%)'
  efeitoLactente?: string;
  monitoramento?: string;
  alternativaSegura?: string;
  recomendacao: string;
  fontes: string[];
}

export const LACTATION_DB: LactationData[] = [
  // Analgésicos
  { drugId: 'paracetamol', drugName: 'Paracetamol', categoriaHale: 'L1', seguranca: 'seguro', passagemLeite: 'mínima (< 1% dose materna)', recomendacao: 'Analgésico de 1ª escolha na lactação. Sem restrição.', fontes: ['LactMed 2024', 'Hale 2023'] },
  { drugId: 'ibuprofeno', drugName: 'Ibuprofeno', categoriaHale: 'L1', seguranca: 'seguro', passagemLeite: 'mínima (< 0,6% dose materna)', recomendacao: 'Anti-inflamatório seguro durante amamentação. Preferível a outros AINEs.', fontes: ['LactMed 2024'] },
  { drugId: 'naproxeno', drugName: 'Naproxeno', categoriaHale: 'L3', seguranca: 'precaucao', passagemLeite: 'baixa mas meia-vida longa', efeitoLactente: 'Raros: sangramento GI, sonolência', alternativaSegura: 'Ibuprofeno', recomendacao: 'Evitar — meia-vida longa. Preferir ibuprofeno.', fontes: ['LactMed 2024'] },
  { drugId: 'codeina', drugName: 'Codeína', categoriaHale: 'L4', seguranca: 'risco', passagemLeite: 'variável — metabolizadores ultrarrápidos de CYP2D6 excretam morfina em concentrações tóxicas', efeitoLactente: 'Morte neonatal documentada (metabolizador ultra-rápido materno)', alternativaSegura: 'Paracetamol, ibuprofeno', recomendacao: 'EVITAR — FDA Black Box: mortes neonatais documentadas. Usar paracetamol.', fontes: ['FDA 2017', 'LactMed 2024'] },
  { drugId: 'tramadol', drugName: 'Tramadol', categoriaHale: 'L3', seguranca: 'precaucao', passagemLeite: 'baixa', efeitoLactente: 'Sedação neonatal se mãe é metabolizadora ultrarrápida', recomendacao: 'Usar com cautela — monitorar sedação no lactente. Preferir paracetamol + ibuprofeno.', fontes: ['LactMed 2024'] },
  // Antibióticos
  { drugId: 'amoxicilina', drugName: 'Amoxicilina', categoriaHale: 'L1', seguranca: 'seguro', passagemLeite: 'muito baixa', efeitoLactente: 'Rara diarreia', recomendacao: 'Seguro — antibiótico de escolha na lactação.', fontes: ['LactMed 2024'] },
  { drugId: 'azitromicina', drugName: 'Azitromicina', categoriaHale: 'L2', seguranca: 'compativel', passagemLeite: 'baixa', recomendacao: 'Compatível com amamentação. Monitorar diarreia no lactente.', fontes: ['LactMed 2024'] },
  { drugId: 'cefalexina', drugName: 'Cefalexina', categoriaHale: 'L1', seguranca: 'seguro', passagemLeite: 'mínima', recomendacao: 'Seguro — amplamente usado na mastite puerperal.', fontes: ['LactMed 2024'] },
  { drugId: 'metronidazol', drugName: 'Metronidazol', categoriaHale: 'L2', seguranca: 'compativel', passagemLeite: 'moderada (12–16% dose materna)', efeitoLactente: 'Sabor amargo no leite; teórico mutagênico', monitoramento: 'Dose única alta: suspender amamentação 12–24h', recomendacao: 'Tratamento curso curto: compatível. Suspender 12–24h após dose única de 2g.', fontes: ['LactMed 2024'] },
  { drugId: 'ciprofloxacino', drugName: 'Ciprofloxacino', categoriaHale: 'L3', seguranca: 'precaucao', passagemLeite: 'moderada', efeitoLactente: 'Teórico: artropatia, disbiose', alternativaSegura: 'Cefalexina, amoxicilina/clavulanato', recomendacao: 'Evitar se alternativa disponível. Se necessário: monitorar diarreia no lactente.', fontes: ['LactMed 2024'] },
  { drugId: 'doxiciclina', drugName: 'Doxiciclina', categoriaHale: 'L3', seguranca: 'precaucao', passagemLeite: 'moderada', efeitoLactente: 'Teórico: dentes (risco baixo — quelação com cálcio do leite)', recomendacao: 'Curso curto (< 3 semanas): aceitável. Uso prolongado: avaliar alternativa.', fontes: ['LactMed 2024'] },
  // Cardiovascular
  { drugId: 'metildopa', drugName: 'Metildopa', categoriaHale: 'L2', seguranca: 'compativel', passagemLeite: 'muito baixa', recomendacao: 'Compatível com amamentação. Anti-hipertensivo preferido no puerpério.', fontes: ['LactMed 2024'] },
  { drugId: 'nifedipino', drugName: 'Nifedipino', categoriaHale: 'L2', seguranca: 'compativel', passagemLeite: 'baixa (< 5%)', recomendacao: 'Compatível com amamentação.', fontes: ['LactMed 2024'] },
  { drugId: 'captopril', drugName: 'IECA (captopril, enalapril)', categoriaHale: 'L2', seguranca: 'compativel', passagemLeite: 'muito baixa', recomendacao: 'Captopril e enalapril: compatíveis na lactação. Preferir captopril — mais estudado.', fontes: ['LactMed 2024'] },
  { drugId: 'propranolol', drugName: 'Propranolol / Betabloqueadores', categoriaHale: 'L2', seguranca: 'compativel', passagemLeite: 'baixa', efeitoLactente: 'Monitorar bradicardia', recomendacao: 'Compatível. Monitorar FC do lactente nas primeiras semanas.', fontes: ['LactMed 2024'] },
  // Psiquiatria
  { drugId: 'sertralina', drugName: 'Sertralina', categoriaHale: 'L2', seguranca: 'compativel', passagemLeite: 'mínima (< 1%)', recomendacao: 'ISRS de 1ª escolha na lactação. Nível sérico no lactente indetectável.', fontes: ['LactMed 2024', 'Weissman 2004'] },
  { drugId: 'fluoxetina', drugName: 'Fluoxetina', categoriaHale: 'L2', seguranca: 'compativel', passagemLeite: 'baixa-moderada (metabólito ativo norfluoxetina passa)', efeitoLactente: 'Cólica, irritabilidade em RNs < 1 mês', alternativaSegura: 'Sertralina (preferida)', recomendacao: 'Compatível — preferir sertralina, especialmente em lactentes < 2 meses.', fontes: ['LactMed 2024'] },
  { drugId: 'paroxetina', drugName: 'Paroxetina', categoriaHale: 'L2', seguranca: 'compativel', passagemLeite: 'baixa (< 1%)', recomendacao: 'Compatível. Porém, evitar iniciar na lactação — preferir sertralina.', fontes: ['LactMed 2024'] },
  { drugId: 'lítio', drugName: 'Lítio', categoriaHale: 'L4', seguranca: 'risco', passagemLeite: 'alta (40–50% nível sérico materno)', efeitoLactente: 'Toxicidade por lítio: hipotonia, cianose, bradicardia, hiponatremia', monitoramento: 'Se mantido: níveis séricos do lactente mensais, função renal e tireóide', alternativaSegura: 'Lamotrigina ou quetiapina (menor passagem)', recomendacao: 'Evitar — risco real de toxicidade. Se essencial: monitorar lactente rigorosamente.', fontes: ['LactMed 2024'] },
  // Hormônios
  { drugId: 'levotiroxina', drugName: 'Levotiroxina', categoriaHale: 'L1', seguranca: 'seguro', passagemLeite: 'mínima (hormônio endógeno)', recomendacao: 'Seguro — manter dose habitual. Essencial para a saúde materna e lactação.', fontes: ['LactMed 2024'] },
  { drugId: 'metformina', drugName: 'Metformina', categoriaHale: 'L1', seguranca: 'seguro', passagemLeite: 'baixa (0,1–0,65% dose materna)', recomendacao: 'Seguro na lactação. Nível sérico no lactente negligenciável.', fontes: ['LactMed 2024', 'Briggs 2023'] },
  { drugId: 'insulina', drugName: 'Insulina', categoriaHale: 'L1', seguranca: 'seguro', passagemLeite: 'não passa para o leite (proteína de grande PM)', recomendacao: 'Seguro — não há passagem para o leite materno.', fontes: ['LactMed 2024'] },
  // Supressores de lactação
  { drugId: 'cabergolina', drugName: 'Cabergolina', categoriaHale: 'L4', seguranca: 'contraindicado', passagemLeite: 'suprime a lactação', recomendacao: 'Inibe lactação — indicada apenas para suspensão da amamentação.', fontes: ['LactMed 2024'] },
  { drugId: 'bromocriptina', drugName: 'Bromocriptina', categoriaHale: 'L5', seguranca: 'contraindicado', passagemLeite: 'suprime a lactação; risco de AVC e IAM maternos', recomendacao: 'CONTRAINDICADO para inibição de lactação — preferir cabergolina se necessário.', fontes: ['LactMed 2024'] },
];

// ─── PROTOCOLO PRÉ-ECLÂMPSIA ─────────────────────────────────

export interface PreEclampsiaProtocol {
  classificacao: 'sem_critério_de_gravidade' | 'com_critério_de_gravidade' | 'eclâmpsia';
  criteriosDiagnosticos: string[];
  tratamentoHipertensao: {
    firstLine: string;
    alvo: string;
    dosagens: { drug: string; dose: string; via: string }[];
  };
  profilaxiaEclamsia: {
    indicada: boolean;
    protocolo: string;
    dosagem: string;
    contraindicacoes: string[];
    toxicidade: string[];
    antidoto: string;
  };
  corticoideFetal: {
    indicado: boolean;
    protocolo: string;
  };
  resolucao: string;
}

export const PRE_ECLAMPSIA_PROTOCOL: Record<string, PreEclampsiaProtocol> = {
  sem_gravidade: {
    classificacao: 'sem_critério_de_gravidade',
    criteriosDiagnosticos: [
      'PA ≥ 140/90 mmHg em 2 medidas com ≥ 4h de intervalo após 20 semanas',
      'Proteinúria ≥ 300 mg/24h ou relação proteína/creatinina ≥ 0,3',
      'Ausência de critérios de gravidade',
    ],
    tratamentoHipertensao: {
      firstLine: 'Iniciar anti-hipertensivo se PA ≥ 160/110 mmHg',
      alvo: 'PAS 130–155 mmHg | PAD 80–105 mmHg',
      dosagens: [
        { drug: 'Nifedipino XL', dose: '30–60 mg/dia VO', via: 'VO' },
        { drug: 'Metildopa', dose: '250–500 mg 8/8h VO (máx 3 g/dia)', via: 'VO' },
        { drug: 'Labetalol', dose: '100–200 mg 12/12h VO', via: 'VO' },
      ],
    },
    profilaxiaEclamsia: {
      indicada: false,
      protocolo: 'Reservar MgSO₄ para casos de gravidade',
      dosagem: '',
      contraindicacoes: [],
      toxicidade: [],
      antidoto: '',
    },
    corticoideFetal: {
      indicado: false,
      protocolo: 'Apenas se < 34 semanas com decisão de interrupção iminente',
    },
    resolucao: 'Vigilância ambulatorial se PA controlada e ausência de critérios de gravidade. Parto ≥ 37 semanas.',
  },
  com_gravidade: {
    classificacao: 'com_critério_de_gravidade',
    criteriosDiagnosticos: [
      'PA ≥ 160/110 mmHg em 2 medidas',
      'Creatinina ≥ 1,1 mg/dL ou duplicação sem DRC prévia',
      'Plaquetas < 100.000/mm³',
      'TGO/TGP > 2× LSN',
      'Edema pulmonar',
      'Cefaleia intensa não responsiva a analgésicos',
      'Distúrbio visual ou alteração neurológica',
      'Oligúria < 500 mL/24h',
    ],
    tratamentoHipertensao: {
      firstLine: 'EMERGÊNCIA: iniciar anti-hipertensivo IV imediatamente se PA ≥ 160/110',
      alvo: 'PAS 130–155 mmHg | PAD 80–105 mmHg (redução gradual — evitar hipotensão brusca)',
      dosagens: [
        { drug: 'Hidralazina', dose: '5 mg IV lento → repetir 5 mg a cada 20 min (máx 20 mg)', via: 'IV' },
        { drug: 'Labetalol', dose: '20 mg IV → 40 mg → 80 mg a cada 10 min (máx 300 mg total)', via: 'IV' },
        { drug: 'Nifedipino', dose: '10 mg VO (NÃO sublingual) → repetir 10 mg em 30 min (máx 30 mg)', via: 'VO' },
      ],
    },
    profilaxiaEclamsia: {
      indicada: true,
      protocolo: 'Sulfato de Magnésio (Zuspan ou Pritchard)',
      dosagem: 'Zuspan: 4 g IV em 20 min (ataque) → 1 g/h IV contínuo (manutenção 24h pós-parto).\nPritchard: 4 g IV + 10 g IM (5 g em cada nádega) → 5 g IM 4/4h.',
      contraindicacoes: ['Miastenia gravis', 'Insuficiência renal grave (acúmulo)', 'Hipocalcemia grave'],
      toxicidade: ['Perda do reflexo patelar (> 7 mEq/L)', 'Parada respiratória (> 10 mEq/L)', 'Parada cardíaca (> 15 mEq/L)'],
      antidoto: 'Gluconato de cálcio 1g IV lento (em 3 min)',
    },
    corticoideFetal: {
      indicado: true,
      protocolo: 'Betametasona 12 mg IM 24/24h × 2 doses (< 34 semanas). Considerar até 36 semanas.',
    },
    resolucao: 'INTERNAÇÃO. Estabilização materna. Parto conforme IG: < 34 sem: avaliar estabilização; ≥ 34 sem: interrupção.',
  },
  eclamsia: {
    classificacao: 'eclâmpsia',
    criteriosDiagnosticos: [
      'Crise convulsiva tônico-clônica generalizada em paciente com pré-eclâmpsia',
      'Pode ocorrer sem hipertensão prévia documentada',
    ],
    tratamentoHipertensao: {
      firstLine: 'Controle de PA imediato após controle da crise convulsiva',
      alvo: 'PAS < 160 mmHg | PAD < 110 mmHg',
      dosagens: [
        { drug: 'Hidralazina', dose: '5 mg IV a cada 20 min', via: 'IV' },
        { drug: 'Labetalol', dose: '20–80 mg IV a cada 10 min', via: 'IV' },
      ],
    },
    profilaxiaEclamsia: {
      indicada: true,
      protocolo: '⚡ ECLÂMPSIA: MgSO₄ para controle da crise + prevenção de recorrência',
      dosagem: 'CRISE ATIVA: 4–6 g IV em 15–20 min. Se crise recorre com MgSO₄: benzodiazepínico (diazepam 10 mg IV ou lorazepam 4 mg IV). Manutenção: 2 g/h IV × 24h pós-parto.',
      contraindicacoes: ['Hipocalcemia grave', 'Miastenia gravis'],
      toxicidade: ['Monitorar reflexo patelar a cada hora', 'Manter diurese > 25 mL/h'],
      antidoto: 'Gluconato de cálcio 1 g IV (10 mL de solução 10%) em 3 min',
    },
    corticoideFetal: {
      indicado: true,
      protocolo: 'Betametasona se < 34 semanas — após estabilização materna',
    },
    resolucao: 'EMERGÊNCIA OBSTÉTRICA. Estabilização imediata. Parto o mais breve possível após estabilização materna.',
  },
};

// ─── PROTOCOLO DIABETES GESTACIONAL ──────────────────────────

export interface DMGProtocol {
  diagnostico: string[];
  metasGlicemicas: Record<string, string>;
  tratamento: {
    etapa: string;
    duracao: string;
    criteriosEscalonamento: string;
    medicamentos?: { drug: string; dose: string; obs: string }[];
  }[];
  monitoramento: string[];
  insulinaEsquemas: Record<string, string>;
}

export const DMG_PROTOCOL: DMGProtocol = {
  diagnostico: [
    'TOTG 75g (OMS 2013): GL jejum ≥ 92 mg/dL, 1h ≥ 180 mg/dL, 2h ≥ 153 mg/dL (1 critério = DMG)',
    'Rastreamento universal entre 24–28 semanas',
    'Se FR: glicemia de jejum na 1ª consulta (≥ 126 mg/dL = DM2 pré-gestacional)',
  ],
  metasGlicemicas: {
    'Jejum': '< 95 mg/dL (SBD) ou < 92 mg/dL (ACOG)',
    '1h pós-prandial': '< 140 mg/dL',
    '2h pós-prandial': '< 120 mg/dL',
    'HbA1c': '< 6,0% (ideal) — < 6,5% aceitável',
    'Antes de dormir': '100–140 mg/dL',
  },
  tratamento: [
    {
      etapa: '1ª linha — MNT (Terapia Nutricional + Atividade Física)',
      duracao: '2 semanas',
      criteriosEscalonamento: '> 20% das medidas acima da meta após 2 semanas de MNT',
    },
    {
      etapa: '2ª linha — Insulinoterapia',
      duracao: 'Até parto',
      criteriosEscalonamento: 'Manter até parto. Suspender no pós-parto e reavaliar.',
      medicamentos: [
        { drug: 'Insulina NPH', dose: 'Jejum alto: 0,1–0,2 UI/kg ao deitar (iniciar com 10 UI)', obs: 'Ajustar 2 UI a cada 3 dias se glicemia jejum persistir alta' },
        { drug: 'Insulina Regular / Aspart', dose: 'Pós-prandial alto: 2–4 UI antes da refeição principal', obs: 'Aumentar 2 UI por refeição se meta não atingida em 3 dias' },
        { drug: 'Esquema basal-bolus', dose: 'DM2 pré-gestacional: dose total 0,7–1,0 UI/kg/dia (50% NPH + 50% rápida)', obs: 'Ajustar conforme GCSM 4–7×/dia' },
      ],
    },
    {
      etapa: 'Alternativa — Metformina (off-label, ACOG 2018)',
      duracao: 'Uso se paciente recusa insulina ou acesso limitado',
      criteriosEscalonamento: '40–50% necessitarão de insulina adicional para atingir meta',
      medicamentos: [
        { drug: 'Metformina', dose: '500 mg/dia → aumentar 500 mg por semana até 2000–2500 mg/dia', obs: 'Tomar com refeições para minimizar distúrbios GI' },
      ],
    },
  ],
  monitoramento: [
    'GCSM: jejum + pós-prandiais 1h das 3 refeições (mínimo 4×/dia)',
    'HbA1c a cada 4–6 semanas',
    'US morfológico detalhado (18–20 sem)',
    'US seriado a partir de 28–32 sem (crescimento fetal)',
    'CTG a partir de 32–36 sem em mal controle',
    'Parto: ≤ 39 semanas (DMG bem controlado) ou ≤ 37–38 (mal controle / macrossomia)',
  ],
  insulinaEsquemas: {
    'NPH hs (início)': '0,2 UI/kg ou 10 UI ao deitar → ajuste 2 UI/3 dias',
    'NPH manhã + noite': '2/3 pela manhã + 1/3 à noite (esquema 2×/dia)',
    'Basal-bolus (DM2 pré-gest)': '0,7–1 UI/kg/dia dividido 50% basal (NPH/Glargina) + 50% bolus (Regular/Aspart)',
    'Correção': '50 mg/dL acima da meta = + 1 UI de insulina rápida (ISF calculado)',
  },
};

// ─── CONTRACEPTIVOS — GUIA RÁPIDO ────────────────────────────

export interface ContraceptiveProfile {
  id: string;
  nome: string;
  tipo: 'combinado' | 'progestogênio_puro' | 'diu_hormonal' | 'diu_cobre' | 'barreira' | 'emergência' | 'definitivo';
  eficacia: string;           // Pearl Index
  vantagens: string[];
  desvantagens: string[];
  contraindicacoes: string[];  // OMS MEC categorias 3–4
  categoria_OMS_MEC?: Record<string, number>;  // condição → categoria (1–4)
  instrucoes: string;
  retornoFertilidade: string;
}

export const CONTRACEPTIVES: ContraceptiveProfile[] = [
  {
    id: 'aco-combinado',
    nome: 'ACO Combinado (EE + Progestogênio)',
    tipo: 'combinado',
    eficacia: 'Índice de Pearl: 0,3% (uso perfeito) a 9% (uso típico)',
    vantagens: ['Regulariza ciclo', 'Reduz dismenorreia e TPM', 'Melhora acne', 'Reduz risco de câncer de ovário e endométrio'],
    desvantagens: ['Risco tromboembólico (↑ com tabagismo, obesidade)', 'Não protege contra ISTs', 'Requer uso diário regular'],
    contraindicacoes: [
      'Enxaqueca com aura (MEC 4)',
      'Tabagismo ≥ 35 anos (MEC 4)',
      'TVP/TEP atual ou histórico (MEC 4)',
      'HAS grave (PAS ≥ 160 ou PAD ≥ 100) (MEC 4)',
      'Cardiopatia isquêmica ou AVC (MEC 4)',
      'Amamentação < 6 semanas pós-parto (MEC 4)',
      'Hepatite viral ativa (MEC 4)',
      'Câncer de mama atual (MEC 4)',
    ],
    instrucoes: '1 comprimido/dia em horário fixo. Iniciar no 1º dia da menstruação (efeito imediato) ou Quick Start (preservativo por 7 dias). Pílula ativa × 21 dias → 7 dias pausa (monofásico) ou uso contínuo.',
    retornoFertilidade: 'Imediato após pausa',
  },
  {
    id: 'pílula-progestogênio',
    nome: 'Minipílula (Progestogênio puro — Desogestrel 75 mcg)',
    tipo: 'progestogênio_puro',
    eficacia: 'Pearl: 0,4% (uso perfeito) a 9% (uso típico)',
    vantagens: ['Segura na lactação', 'Enxaqueca sem aura com restrição a ACO', 'Sem risco tromboembólico estrogênio-dependente', 'Pode ser usada em cardiopatas'],
    desvantagens: ['Spotting irregular frequente', 'Requer uso contínuo (sem pausa)', 'Janela de horário restrita (3h — para desogestrel, 12h)'],
    contraindicacoes: ['Câncer de mama atual (MEC 4)', 'Cirrose grave (MEC 4)', 'TVP/TEP ativo (MEC 3)'],
    instrucoes: 'Desogestrel 75 mcg: 1 cp/dia contínuo sem pausa. Janela de 12h. Iniciar em qualquer momento do ciclo (preservativo por 2 dias se não for no 1–5º dia).',
    retornoFertilidade: 'Imediato após pausa',
  },
  {
    id: 'depo-provera',
    nome: 'Acetato de Medroxiprogesterona (Depo-Provera)',
    tipo: 'progestogênio_puro',
    eficacia: 'Pearl: 0,3% (uso perfeito) a 6% (uso típico)',
    vantagens: ['1 injeção a cada 3 meses', 'Alta eficácia', 'Pode causar amenorreia (benefício em anemia)', 'Segura na lactação (após 6 semanas)'],
    desvantagens: ['Irregularidade menstrual', 'Retorno de fertilidade atrasado (3–18 meses)', 'Perda de DMO com uso prolongado (reversível)', 'Requer aplicação trimestral'],
    contraindicacoes: ['Osteoporose grave (MEC 3)', 'Adolescentes: cautela (pico de massa óssea)', 'Câncer de mama (MEC 4)'],
    instrucoes: '150 mg IM profunda a cada 12 semanas (janela: 11–13 sem). Iniciar nos primeiros 5 dias do ciclo. 1ª dose pós-parto: ≥ 6 semanas se amamentando.',
    retornoFertilidade: '3–18 meses após última dose',
  },
  {
    id: 'diu-mirena',
    nome: 'SIU-LNG (Mirena / Kyleena)',
    tipo: 'diu_hormonal',
    eficacia: 'Pearl: < 0,2% — mais eficaz que laqueadura',
    vantagens: ['5 anos de duração (Mirena), 8 anos (Liletta)', 'Amenorreia em 50% após 1 ano', 'Reduz dismenorreia e sangramento', 'Reversível — fertilidade retorna imediatamente'],
    desvantagens: ['Inserção dolorosa', 'Risco de expulsão (3–5%)', 'Spotting nos primeiros 3–6 meses', 'Não protege contra ISTs'],
    contraindicacoes: ['Cavidade uterina distorcida (MEC 4)', 'Doença trofoblástica gestacional (MEC 4)', 'Câncer de mama (MEC 4)'],
    instrucoes: 'Inserção ambulatorial por profissional habilitado durante ou logo após menstruação. US confirmatório pós-inserção (6 semanas). Substituir em 5 anos (Mirena) ou 8 anos (Liletta).',
    retornoFertilidade: 'Imediato após remoção',
  },
  {
    id: 'diu-cobre',
    nome: 'DIU de Cobre (T de Cobre 380A)',
    tipo: 'diu_cobre',
    eficacia: 'Pearl: 0,6–0,8% — até 10–12 anos de eficácia',
    vantagens: ['Sem hormônios (opção para quem não tolera hormônios)', 'Eficácia imediata', 'Pode ser usado como contracepção de emergência (até 5 dias)', '10 anos de duração'],
    desvantagens: ['↑ sangramento menstrual (20–50%)', 'Dismenorreia pode piorar', 'Não protege contra ISTs'],
    contraindicacoes: ['Doença de Wilson (MEC 4)', 'Cavidade distorcida (MEC 4)', 'Menorragia grave já existente (MEC 3)'],
    instrucoes: 'Inserção ambulatorial. Pode ser inserido em qualquer momento do ciclo se gravidez excluída. Como CE: até 120h do intercurso desprotegido.',
    retornoFertilidade: 'Imediato após remoção',
  },
  {
    id: 'contracep-emergencia',
    nome: 'Contracepção de Emergência (Levonorgestrel 1,5 mg)',
    tipo: 'emergência',
    eficacia: 'Reduz gravidez em 85–89% se usada em até 72h. Eficácia ↓ após 72h (ainda válida até 120h).',
    vantagens: ['Não requer prescrição (OTC)', 'Atrasa ou inibe ovulação (NÃO é abortiva)', 'Sem contraindicação absoluta'],
    desvantagens: ['Não é método regular', 'Irregularidade menstrual após uso', 'Menor eficácia em peso > 75–80 kg'],
    contraindicacoes: [],
    instrucoes: 'LNG 1,5 mg: dose única. Quanto mais precoce, mais eficaz. Usar até 120h. Peso > 75 kg: DIU de cobre é alternativa mais eficaz.',
    retornoFertilidade: 'Imediato',
  },
  {
    id: 'terapia-hormonal',
    nome: 'Terapia Hormonal da Menopausa (TH)',
    tipo: 'combinado',
    eficacia: 'Tratamento dos sintomas, não contraceptivo',
    vantagens: ['Alivia fogachos e sudorese noturna', 'Melhora sintomas urogenitais', 'Previne osteoporose', 'Melhora sono e humor'],
    desvantagens: ['↑ Risco de TEV (TH oral)', 'TH > 5 anos: ↑ CA de mama (gestágeno sintético)', 'Sangramento de privação (TH cíclica)'],
    contraindicacoes: ['Câncer de mama (absoluta)', 'TEV ativo (relativa — transdérmica é mais segura)', 'Doença hepática grave', 'AVC recente'],
    instrucoes: 'Via transdérmica (adesivo/gel) preferível em ≥ 60 anos ou com FR cardiovascular — menor risco tromboembólico. Progesterona micronizada + estradiol: perfil de segurança mamária mais favorável que progestinas sintéticas. Rever indicação a cada 1–2 anos.',
    retornoFertilidade: 'N/A (pós-menopausa)',
  },
];

// ─── FUNÇÃO: RASTREAR SEGURANÇA EM GESTANTE / LACTANTE ────────

export function screenObstetricSafety(
  drugId: string,
  profile: ObstetricProfile,
): {
  teratogenicidade?: TeratogenicityData;
  lactacao?: LactationData;
  alertas: string[];
  seguro: boolean;
} {
  const alertas: string[] = [];
  const terato = TERATOGENICITY_DB.find(d => d.drugId === drugId);
  const lacto = LACTATION_DB.find(d => d.drugId === drugId);
  let seguro = true;

  if (profile.statusGestacional === 'gestante' && terato) {
    const catRisco = ['D', 'X'];
    if (catRisco.includes(terato.categoriaFDA)) {
      alertas.push(`⛔ GESTAÇÃO [FDA ${terato.categoriaFDA}]: ${terato.drugName} — ${terato.categoriaFDA === 'X' ? 'CONTRAINDICADO' : 'Risco fetal documentado'}`);
      if (terato.alternativaSegura) alertas.push(`Alternativa: ${terato.alternativaSegura}`);
      seguro = false;
    } else if (terato.categoriaFDA === 'C') {
      alertas.push(`⚠ GESTAÇÃO [FDA C]: ${terato.drugName} — avaliar risco/benefício`);
    }
    if (profile.trimestre) {
      const riscoTrimestre = [terato.riscoTrimestre1, terato.riscoTrimestre2, terato.riscoTrimestre3][profile.trimestre - 1];
      if (riscoTrimestre) alertas.push(`${profile.trimestre}T: ${riscoTrimestre}`);
    }
  }

  if (profile.amamentando && lacto) {
    if (lacto.seguranca === 'contraindicado') {
      alertas.push(`⛔ LACTAÇÃO: ${lacto.drugName} — CONTRAINDICADO durante amamentação`);
      if (lacto.alternativaSegura) alertas.push(`Alternativa: ${lacto.alternativaSegura}`);
      seguro = false;
    } else if (lacto.seguranca === 'risco') {
      alertas.push(`⚠ LACTAÇÃO [${lacto.categoriaHale}]: ${lacto.drugName} — ${lacto.recomendacao}`);
    } else {
      alertas.push(`✓ LACTAÇÃO [${lacto.categoriaHale}]: ${lacto.recomendacao}`);
    }
    if (lacto.monitoramento) alertas.push(`Monitorar: ${lacto.monitoramento}`);
  }

  return { teratogenicidade: terato, lactacao: lacto, alertas, seguro };
}

// ─── ÁCIDO FÓLICO E SUPLEMENTAÇÃO GESTACIONAL ─────────────────

export const GESTATIONAL_SUPPLEMENTS = {
  acidoFolico: {
    dose_normal: '400–800 mcg/dia — iniciar 1–3 meses antes da concepção e manter até 12 semanas',
    dose_alto_risco: '5 mg/dia — indicada se: epilepsia em uso de anticonvulsivantes, DMG, obesidade, gêmeos, histórico de DTN',
    fontes: ['ACOG 2023', 'SBFe 2023'],
  },
  ferro: {
    profilaxia: 'Sulfato ferroso 40 mg de ferro elementar/dia a partir do 2T',
    tratamento_anemia: '120–200 mg de ferro elementar/dia até Hb ≥ 11 g/dL, então manter profilaxia',
    interacoes: 'Tomar em jejum ou com vitamina C. Não tomar com cálcio, chá ou leite.',
    fontes: ['OMS 2022', 'SBFe 2023'],
  },
  calcio: {
    dose: '1000–1300 mg/dia (dieta + suplemento)',
    prevencaoPreEclamsia: '1,5–2 g/dia em baixa ingestão de cálcio (< 600 mg/dia) — reduz risco de PE em 64%',
    fontes: ['OMS 2020', 'Hofmeyr 2018 Cochrane'],
  },
  vitaminaD: {
    dose: '600–2000 UI/dia durante a gestação',
    risco_deficiencia: 'Gestantes de pele escura, pouca exposição solar, obesidade: suplementar 2000 UI/dia',
    fontes: ['ACOG 2023'],
  },
};
