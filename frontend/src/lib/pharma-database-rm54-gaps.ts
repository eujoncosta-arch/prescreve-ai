// ============================================================
// PRESCREVE-AI — RM-54: fechamento do achado #1 (médio) da auditoria
// final de liberação — 12 moléculas presentes no catálogo Eurofarma/
// ANVISA (lab-catalog) mas ausentes do PHARMA_DB (o motor principal de
// prescrição), detectadas pelo gate RM-24 (Cross Database Validator).
//
// TODOS os dados clínicos abaixo (posologia, contraindicações,
// interações, populações especiais, marcas) são PORTADOS, não
// inventados — vêm diretamente das entradas já existentes e já
// verificadas em `eurofarma-sync.ts` (bula ANVISA Eurofarma) e
// `lab-catalog.ts` (bula ANVISA Novo Nordisk/Boehringer), citadas por
// `id` de origem em cada entrada abaixo. `molecula` usa exatamente a
// mesma string da fonte de origem — garante que `toMoleculeId()`
// produza a MESMA chave em ambos os lados, fechando a divergência no
// gate RM-24 sem duplicar a molécula. `marcas` é preenchido diretamente
// aqui (não pelas IIFEs `enrichWithEurofarma`/`enrichWithAllLabs`, que só
// iteram o array base `PHARMA_DB`, não os arquivos de especialidade —
// mesmo padrão já usado em `pharma-database-nefro.ts` etc.).
// ============================================================

import type { QuickDrug } from './pharma-database';

export const PHARMA_DB_RM54_GAPS: QuickDrug[] = [

  // ── Fonte: eurofarma-sync.ts, id 'euro-zina' ──────────────────
  {
    id: 'levocetirizina',
    molecula: 'Dicloridrato de Levocetirizina',
    nome_generico: 'Levocetirizina',
    sinonimos: ['levocetirizina', 'zina', 'anti-histaminico h1'],
    categoria: 'outro',
    classe: 'Anti-histamínico H1 de 3ª Geração',
    indicacoes_principais: ['Rinite alérgica', 'Urticária crônica'],
    dose_adulto: {
      habitual: '5 mg 1x/dia à noite',
      max: '5 mg/dia',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['1x/dia à noite'],
      instrucoes: 'Em IR: reduzir para 2,5 mg/dia conforme ClCr.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: '2,5 mg/dia', tfg_30_15: '2,5 mg a cada 2 dias', tfg_lt_15: 'CONTRAINDICADO (ClCr < 10 mL/min)', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste (eliminação predominantemente renal)', child_b: 'Sem ajuste', child_c: 'Cautela — sem dados específicos; preferir o ajuste renal como referência' },
    contraindicacoes_rapidas: ['Hipersensibilidade à levocetirizina ou cetirizina', 'IR grave (ClCr < 10 mL/min)', 'Hemodiálise'],
    interacoes_importantes: [
      { com: 'Álcool e depressores do SNC', severidade: 'moderada', descricao: 'Potencializam a sedação.' },
      { com: 'Ritonavir', severidade: 'leve', descricao: 'Aumenta a exposição à levocetirizina.' },
    ],
    alertas_especiais: ['Sonolência — evitar dirigir ou operar máquinas'],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [{ nome: 'Zina®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['5 mg'], formas: ['Comprimido'], verificado: true }],
  },

  // ── Fonte: eurofarma-sync.ts, id 'euro-gaba-er' (Divalproato de Sódio) ──
  {
    id: 'divalproato-sodio',
    molecula: 'Divalproato de Sódio',
    nome_generico: 'Divalproato de Sódio',
    sinonimos: ['divalproato', 'valproato', 'gaba er', 'acido valproico'],
    categoria: 'neurologico',
    classe: 'Anticonvulsivante / Estabilizador do Humor',
    indicacoes_principais: ['Epilepsia', 'Transtorno afetivo bipolar (TAB)', 'Profilaxia de enxaqueca'],
    dose_adulto: {
      habitual: '20–30 mg/kg/dia (epilepsia); 750–1500 mg/dia (TAB); 500–1000 mg/dia (enxaqueca)',
      min: '10–15 mg/kg/dia (início, epilepsia)',
      max: '30 mg/kg/dia',
      unidade: 'mg/kg/dia',
      via: 'VO',
      frequencias: ['1–2x/dia (liberação modificada)'],
    },
    ajuste_hepatico: { child_a: 'Cautela — monitorar função hepática', child_b: 'Evitar', child_c: 'CONTRAINDICADO (hepatopatia ativa)' },
    contraindicacoes_rapidas: ['Hepatopatia ativa', 'Distúrbios do ciclo da ureia', 'Hipersensibilidade', 'Gravidez (risco teratogênico muito alto)'],
    interacoes_importantes: [
      { com: 'Lamotrigina', severidade: 'grave', descricao: 'Aumenta o nível sérico de lamotrigina — reduzir dose de lamotrigina.' },
      { com: 'Carbamazepina', severidade: 'moderada', descricao: 'Reduz o nível sérico do divalproato.' },
      { com: 'Topiramato', severidade: 'grave', descricao: 'Risco de hiperamonemia.' },
    ],
    alertas_especiais: [
      '⚠ TERATOGÊNICO — síndrome fetal do valproato (espinha bífida, QI reduzido)',
      'Hepatotoxicidade (fatal em < 2 anos)',
      'Pancreatite e hiperamonemia',
    ],
    uso_gestante: 'contraindicado',
    uso_lactante: 'avaliar',
    marcas: [{ nome: 'GABA ER®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['250 mg', '500 mg'], formas: ['Comprimido de liberação modificada'], verificado: true }],
  },

  // ── Fonte: eurofarma-sync.ts, id 'euro-iban' ──────────────────
  {
    id: 'acido-ibandronico',
    molecula: 'Ácido Ibandrónico',
    nome_generico: 'Ácido Ibandrônico',
    sinonimos: ['ibandronato', 'acido ibandronico', 'bifosfonato', 'iban'],
    categoria: 'outro',
    classe: 'Bifosfonato — Inibidor da Reabsorção Óssea',
    indicacoes_principais: ['Osteoporose pós-menopausa', 'Metástases ósseas (oncologia)'],
    dose_adulto: {
      habitual: '150 mg 1 comprimido 1x/mês, em jejum',
      max: '150 mg/mês',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['1x/mês'],
      instrucoes: 'Com copo cheio de água, 30–60 min antes de qualquer alimento/medicamento. Permanecer em pé por 60 min após.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'CONTRAINDICADO (ClCr < 30 mL/min)', tfg_lt_15: 'CONTRAINDICADO', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste (não metabolizado pelo fígado — excreção renal)', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    contraindicacoes_rapidas: ['Hipocalcemia não corrigida', 'IR grave (ClCr < 30 mL/min)', 'Anormalidades esofágicas (estenose/acalasia)', 'Incapacidade de ficar em pé por 60 min'],
    interacoes_importantes: [
      { com: 'Cálcio, antiácidos, ferro', severidade: 'moderada', descricao: 'Reduzem a absorção — separar por 60 min.' },
      { com: 'AINEs', severidade: 'leve', descricao: 'Irritação gastrointestinal.' },
    ],
    alertas_especiais: [
      'Osteonecrose de mandíbula (ONM) — risco com uso prolongado, procedimentos dentários, imunossupressão',
      'Esofagite/úlcera esofágica se tomado incorretamente',
      'Fraturas atípicas de fêmur (uso prolongado > 5 anos)',
    ],
    uso_gestante: 'contraindicado',
    uso_lactante: 'contraindicado',
    marcas: [{ nome: 'Iban®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['150 mg'], formas: ['Comprimido'], verificado: true }],
  },

  // ── Fonte: eurofarma-sync.ts, id 'euro-trimeb' ────────────────
  {
    id: 'trimebutina',
    molecula: 'Maleato de Trimebutina',
    nome_generico: 'Trimebutina',
    sinonimos: ['trimebutina', 'trimeb'],
    categoria: 'gastroenterologia',
    classe: 'Regulador da Motilidade Intestinal — Antiespasmódico',
    indicacoes_principais: ['Síndrome do intestino irritável', 'Distúrbios funcionais gastrointestinais'],
    dose_adulto: {
      habitual: '200 mg 3x/dia antes das refeições',
      max: '600 mg/dia',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['3x/dia antes das refeições'],
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela — sem dados específicos de bula', child_c: 'Cautela — sem dados específicos de bula' },
    uso_pediatrico: 'nao_aplicavel',
    contraindicacoes_rapidas: ['Hipersensibilidade à trimebutina', 'Menores de 12 anos'],
    interacoes_importantes: [
      { com: '(sem interação medicamentosa)', severidade: 'leve', descricao: 'Bula ANVISA (Trimeb®) não relata interações medicamentosas clinicamente relevantes.' },
    ],
    alertas_especiais: ['Evitar em oclusão intestinal mecânica'],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [{ nome: 'Trimeb®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['200 mg'], formas: ['Cápsula mole'], verificado: true }],
  },

  // ── Fonte: eurofarma-sync.ts, id contendo 'AltaD Caps®' ───────
  {
    id: 'colecalciferol',
    molecula: 'Colecalciferol (Vitamina D3)',
    nome_generico: 'Colecalciferol',
    sinonimos: ['vitamina d3', 'colecalciferol', 'vitamina d'],
    categoria: 'hormonio',
    classe: 'Vitamina D',
    indicacoes_principais: ['Deficiência de vitamina D', 'Osteoporose (adjuvante)', 'Prevenção de quedas em idosos'],
    dose_adulto: {
      habitual: '7.000–50.000 UI/dia ou semanal conforme nível sérico',
      min: '1.000 UI/dia (manutenção)',
      max: '50.000 UI/semana',
      unidade: 'UI',
      via: 'VO',
      frequencias: ['1x/dia', '1x/semana (dose alta)'],
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Hepatopatia grave prejudica a 25-hidroxilação — monitorar 25(OH)D sérica' },
    contraindicacoes_rapidas: ['Hipercalcemia/hipervitaminose D', 'Nefrolitíase cálcica ativa', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Tiazídicos', severidade: 'moderada', descricao: 'Risco de hipercalcemia.' },
      { com: 'Colestipol/colestiramina', severidade: 'leve', descricao: 'Reduzem a absorção.' },
    ],
    alertas_especiais: ['Monitorar 25(OH)D sérica e calciúria em tratamentos de reposição', 'Toxicidade com doses muito altas e prolongadas'],
    uso_gestante: 'seguro',
    uso_lactante: 'seguro',
    monitoramento: ['25(OH)D sérica', 'Cálcio sérico/urinário'],
    marcas: [{ nome: 'AltaD Caps®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['7.000 UI', '15.000 UI', '50.000 UI'], formas: ['Cápsula mole'], verificado: true }],
  },

  // ── Fonte: eurofarma-sync.ts, id contendo 'Bedoze®' ───────────
  {
    id: 'hidroxocobalamina',
    molecula: 'Hidroxocobalamina (Vitamina B12)',
    nome_generico: 'Hidroxocobalamina',
    sinonimos: ['vitamina b12', 'hidroxocobalamina', 'bedoze'],
    categoria: 'outro',
    classe: 'Vitamina B12 — Injetável IM',
    indicacoes_principais: ['Deficiência de vitamina B12', 'Neuropatia por deficiência de B12'],
    dose_adulto: {
      habitual: '1 mg IM/dia por 7 dias, depois 1 mg/semana por 4 semanas, depois 1 mg/mês',
      max: '1 mg/dose',
      unidade: 'mg',
      via: 'IM',
      frequencias: ['diário (indução)', 'mensal (manutenção)'],
      instrucoes: 'Neuropatia: pode manter mensal indefinidamente.',
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste (não hepatotóxica)' },
    contraindicacoes_rapidas: ['Hipersensibilidade à cobalamina', 'Uso IV (formulação IM apenas)'],
    interacoes_importantes: [
      { com: 'Cloranfenicol', severidade: 'moderada', descricao: 'Reduz a resposta da eritropoiese à B12.' },
    ],
    alertas_especiais: ['Maior retenção tecidual que a cianocobalamina', 'Vermelhidão e dor no local da injeção'],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [{ nome: 'Bedoze®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['5 mg/mL'], formas: ['Solução injetável'], verificado: true }],
  },

  // ── Fonte: eurofarma-sync.ts, id contendo 'Ginna®' ────────────
  {
    id: 'nitrato-fenticonazol',
    molecula: 'Nitrato de Fenticonazol',
    nome_generico: 'Fenticonazol',
    sinonimos: ['fenticonazol', 'ginna', 'antifungico vaginal'],
    categoria: 'antifungico',
    classe: 'Antifúngico Tópico — Imidazólico Vaginal',
    indicacoes_principais: ['Candidíase vulvovaginal'],
    dose_adulto: {
      habitual: '1 aplicador/dia à noite, por 7 dias',
      max: '1 aplicador/dia',
      unidade: 'mg',
      via: 'Tópico',
      frequencias: ['1x/dia à noite por 7 dias'],
    },
    ajuste_hepatico: { child_a: 'Sem ajuste (uso tópico, absorção sistêmica mínima)', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    uso_pediatrico: 'nao_aplicavel',
    contraindicacoes_rapidas: ['Menores de 18 anos', 'Uso masculino', 'Hipersensibilidade a imidazólicos'],
    interacoes_importantes: [
      { com: '(sem interação medicamentosa)', severidade: 'leve', descricao: 'Bula ANVISA (Ginna®) não relata interações medicamentosas sistêmicas — uso tópico vaginal com absorção sistêmica mínima.' },
    ],
    alertas_especiais: ['Pode danificar contraceptivos de látex — usar método alternativo durante o tratamento'],
    uso_gestante: 'risco',
    uso_lactante: 'avaliar',
    marcas: [{ nome: 'Ginna®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['2% (20 mg/g)'], formas: ['Creme vaginal'], verificado: true }],
  },

  // ── Fonte: eurofarma-sync.ts, id contendo 'Antrofi®' ──────────
  {
    id: 'promestrieno',
    molecula: 'Promestrieno',
    nome_generico: 'Promestrieno',
    sinonimos: ['promestrieno', 'antrofi', 'estrogenio topico'],
    categoria: 'hormonio',
    classe: 'Estrogênio Tópico — Tratamento da Atrofia Vulvovaginal',
    indicacoes_principais: ['Atrofia vulvovaginal pós-menopausa'],
    dose_adulto: {
      habitual: '1 aplicador/dia por 20 dias, depois 2–3x/semana (manutenção)',
      max: '1 aplicador/dia',
      unidade: 'mg',
      via: 'Tópico',
      frequencias: ['1x/dia (indução)', '2–3x/semana (manutenção)'],
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'CONTRAINDICADO (doença hepática aguda)', child_c: 'CONTRAINDICADO (doença hepática aguda)' },
    contraindicacoes_rapidas: [
      'Histórico ou suspeita de câncer de mama ou tumor maligno estrógeno-dependente',
      'Hemorragia vaginal de causa desconhecida',
      'Tromboembolismo venoso/arterial ativo',
      'Doença hepática aguda',
      'Lactação', 'Uso masculino',
    ],
    interacoes_importantes: [
      { com: '(sem interação medicamentosa)', severidade: 'leve', descricao: 'Bula ANVISA (Antrofi®) não relata interações medicamentosas sistêmicas — uso tópico vaginal com absorção sistêmica mínima.' },
    ],
    alertas_especiais: ['Não usar com espermicidas locais', 'Uso exclusivamente tópico vaginal'],
    uso_gestante: 'risco',
    uso_lactante: 'contraindicado',
    marcas: [{ nome: 'Antrofi®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['10 mg/g'], formas: ['Creme vaginal'], verificado: true }],
  },

  // ── Fonte: eurofarma-sync.ts, id contendo 'Canabidiol Eurofarma®' ──
  {
    id: 'canabidiol',
    molecula: 'Canabidiol',
    nome_generico: 'Canabidiol',
    sinonimos: ['canabidiol', 'cbd', 'canabinoide'],
    categoria: 'neurologico',
    classe: 'Canabinóide — Fitoterápico Derivado de Cannabis',
    indicacoes_principais: ['Epilepsia refratária', 'Síndromes epilépticas raras (adjuvante)'],
    dose_adulto: {
      habitual: '2,5 mg/kg/dia (dividida em 2x), titulação individualizada',
      max: '25 mg/kg/dia',
      unidade: 'mg/kg/dia',
      via: 'VO',
      frequencias: ['2x/dia'],
      instrucoes: 'Ajuste individualizado pelo médico conforme resposta.',
    },
    ajuste_hepatico: { child_a: 'Reduzir dose — metabolização hepática (CYP3A4/CYP2C19)', child_b: 'Reduzir dose significativamente; monitorar TGO/TGP', child_c: 'CONTRAINDICADO/evitar — risco de hepatotoxicidade aditiva' },
    contraindicacoes_rapidas: ['< 2 anos', 'Hipersensibilidade ao canabidiol', 'Usuários de drogas de abuso'],
    interacoes_importantes: [
      { com: 'Clobazam', severidade: 'grave', descricao: 'Aumenta o nível de clobazam e seu metabólito ativo.' },
      { com: 'Valproato', severidade: 'grave', descricao: 'Risco de hepatotoxicidade aditiva.' },
      { com: 'Inibidores de CYP3A4 (cetoconazol, ritonavir)', severidade: 'moderada', descricao: 'Aumentam o nível de canabidiol.' },
    ],
    alertas_especiais: [
      'Monitorar provas de função hepática (TGO/TGP) periodicamente',
      'Contém até 0,2% de THC e até 5% v/v de etanol',
      'Venda sob prescrição com retenção de receita',
    ],
    uso_gestante: 'contraindicado',
    uso_lactante: 'contraindicado',
    marcas: [{ nome: 'Canabidiol Eurofarma®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['20 mg/mL'], formas: ['Solução oral'], verificado: true }],
  },

  // NOTA: as 3 moléculas originalmente aqui (Insulina Isófana Humana/NPH,
  // Insulina Humana Regular, Dabigatrana Etexilato) NÃO foram adicionadas
  // como entradas novas — já existiam no PHARMA_DB (`insulina_nph` em
  // pharma-database-endo.ts, `insulina_regular` em pharma-database-endo.ts,
  // `dabigatrana` em pharma-database-cardio.ts), cada uma já com a marca
  // correta (Novolin® N/R, Pradaxa®). O gate RM-24 as reportava como
  // "ausentes" por um falso positivo de canonicalização: a outra fonte usa
  // o nome farmacopêutico completo (ex.: "Insulina Isófana Humana (NPH)")
  // enquanto o PHARMA_DB usa a forma abreviada em `molecula` (ex.:
  // "Insulina NPH", com o nome completo em `nome_generico`). Criar uma
  // segunda entrada aqui teria DUPLICADO a molécula (2 princípios ativos
  // para a mesma marca — um erro pior que o divergente original). A
  // correção real foi no comparador (`validator.ts`): `pharmaAliasKeys()`
  // agora também indexa `nome_generico`/`sinonimos` de cada droga do
  // PHARMA_DB, então essas 3 moléculas são corretamente reconhecidas como
  // já presentes, e `toMoleculeId` ganhou "etexilato" como qualificador de
  // sal/éster reconhecido (mesmo padrão de "medoxomila"/"trometamol").
];
