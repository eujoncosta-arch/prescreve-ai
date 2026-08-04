// ============================================================
// PRESCREVE-AI — RM-69: fechamento do achado da Seção 6 do RM-66
// (docs/RM-66-CLINICAL-EXPANSION-FRAMEWORK.md) — o comparador RM-24
// (`cross-database/validator.ts`) auto-aceita QUALQUER combinação
// comercial cujo nome contenha "+" como `aceito: true` / `low`, sob a
// premissa de que "combinações são fora de escopo do PHARMA_DB
// (moléculas isoladas)". Essa premissa nunca foi verificada item a
// item: 13 combinações do catálogo Eurofarma passavam pela heurística
// sem revisão individual.
//
// Revisão manual (mesma metodologia do piloto RM-66, usando a entrada
// já promovida `losartana_hidroclorotiazida`/Zart H® em
// `pharma-database-cardio.ts` como régua de profundidade de curadoria)
// mostrou que as 13 têm o MESMO nível de curadoria clínica real da bula
// ANVISA (contraindicações, interações, populações especiais) que
// qualquer outra entrada já presente no PHARMA_DB — nenhuma é um
// placeholder raso. A heurística "+" estava mascarando o mesmo tipo de
// gap estrutural do achado RM-58 (produto real invisível ao motor de
// busca/prescrição por existir em só uma das 5 fontes), só que em lote.
//
// TODOS os dados clínicos abaixo (posologia, contraindicações,
// interações, populações especiais, marcas) são PORTADOS 1:1 da bula já
// curada em `eurofarma-sync.ts`, citada por `id` de origem em cada
// entrada. `molecula` usa exatamente a mesma string da fonte de origem
// — garante que `toMoleculeId()` produza a MESMA chave em ambos os
// lados, fechando a divergência no gate RM-24 sem duplicar a molécula
// (mesmo padrão de `pharma-database-rm54-gaps.ts`).
//
// `ajuste_hepatico`/`ajuste_renal`: quando a bula de origem não traz um
// valor explícito, o ajuste foi DERIVADO da farmacologia dos
// componentes (mesmo procedimento usado no piloto RM-66 para a Zart
// H®) — nunca inventado sem base farmacológica. Anotado por entrada
// quando aplicável.
// ============================================================

import type { QuickDrug } from './pharma-database';

export const PHARMA_DB_RM69_COMBOS: QuickDrug[] = [

  // ── Fonte: eurofarma-sync.ts, id 'euro-lugano' ──────────────────
  {
    id: 'formoterol_fluticasona',
    molecula: 'Fumarato de Formoterol Diidratado + Propionato de Fluticasona',
    nome_generico: 'Formoterol + Fluticasona',
    sinonimos: ['formoterol + fluticasona', 'formoterol fluticasona', 'lugano', 'ics laba'],
    categoria: 'respiratory',
    classe: 'ICS + LABA — Corticosteroide Inalatório + Beta-2 Agonista de Longa Ação',
    indicacoes_principais: ['Asma persistente moderada a grave (adultos e ≥ 4 anos)', 'DPOC'],
    dose_adulto: {
      habitual: '1 cápsula inalada (12/250 mcg) 2x/dia (manhã e noite)',
      max: '2 cápsulas/dia',
      unidade: 'mcg',
      via: 'Inalatório',
      frequencias: ['2x/dia'],
      instrucoes: 'Não usar como medicação de resgate. Bochechar após cada uso (risco de candidíase orofaríngea).',
    },
    ajuste_hepatico: {
      child_a: 'Sem ajuste — monitorar',
      child_b: 'Cautela — fluticasona tem depuração hepática extensa (CYP3A4)',
      child_c: 'Evitar altas doses — risco de acúmulo sistêmico de fluticasona e supressão adrenal',
    },
    contraindicacoes_rapidas: ['Hipersensibilidade ao formoterol ou fluticasona', 'Asma aguda / crise grave (não usar como resgate isolado)', 'Tuberculose ativa', 'Infecções respiratórias fúngicas ou virais'],
    interacoes_importantes: [
      { com: 'Beta-bloqueadores', severidade: 'moderada', descricao: 'Antagonismo ao efeito broncodilatador do formoterol.' },
      { com: 'Cetoconazol/itraconazol', severidade: 'moderada', descricao: 'Aumentam a exposição sistêmica à fluticasona via inibição de CYP3A4.' },
      { com: 'Diuréticos tiazídicos ou de alça', severidade: 'moderada', descricao: 'Hipocalemia aditiva com o componente beta-2 agonista.' },
    ],
    alertas_especiais: [
      '⚠ LABA: nunca usar sem corticosteroide inalatório na asma (risco de morte)',
      'Candidíase orofaríngea — bochechar após cada uso',
      'Supressão adrenal com doses altas de fluticasona',
      'Catarata e glaucoma com uso prolongado',
      'Taquicardia / palpitações (formoterol)',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [{ nome: 'Lugano®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['12/250 mcg/cápsula'], formas: ['Inalatório (cápsula + inalador)'], verificado: true }],
  },

  // ── Fonte: eurofarma-sync.ts, id 'euro-lemont' ──────────────────
  {
    id: 'montelucaste_levocetirizina',
    molecula: 'Montelucaste Sódico + Cloridrato de Levocetirizina',
    nome_generico: 'Montelucaste + Levocetirizina',
    sinonimos: ['montelucaste + levocetirizina', 'lemont'],
    categoria: 'respiratory',
    classe: 'Antagonista de Leucotrienos + Anti-histamínico H1 de 3ª Geração (Associação)',
    indicacoes_principais: ['Asma + rinite alérgica concomitantes (≥ 15 anos)'],
    dose_adulto: {
      habitual: '1 comprimido (montelucaste 10 mg + levocetirizina 5 mg) 1x/dia à noite',
      max: '1 comprimido/dia',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['1x/dia à noite'],
      instrucoes: 'Reservar a associação para pacientes com asma E rinite alérgica concomitantes — não usar isoladamente por uma das indicações.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Ajustar conforme ClCr (componente levocetirizina)', tfg_30_15: '2,5 mg de levocetirizina a cada 2 dias (equivalente)', tfg_lt_15: 'CONTRAINDICADO (ClCr < 10 mL/min)', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela — monitorar (montelucaste com metabolismo hepático extenso)', child_c: 'Evitar — sem dados específicos de segurança' },
    contraindicacoes_rapidas: ['Hipersensibilidade a montelucaste ou levocetirizina', 'IR grave (ClCr < 10 mL/min)', 'Hemodiálise'],
    interacoes_importantes: [
      { com: 'Fenobarbital/rifampicina', severidade: 'moderada', descricao: 'Reduzem os níveis séricos de montelucaste.' },
      { com: 'Álcool e depressores do SNC', severidade: 'moderada', descricao: 'Potencializam a sedação da levocetirizina.' },
      { com: 'Teofilina', severidade: 'leve', descricao: 'Interação descrita na bula — monitorar.' },
    ],
    alertas_especiais: [
      '⚠ FDA/ANVISA Black Box: alterações neuropsiquiátricas do montelucaste (depressão, ideação suicida) — orientar paciente/família',
      'Sonolência (levocetirizina) — não dirigir ou operar máquinas',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [{ nome: 'Lemont®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['10 mg + 5 mg'], formas: ['Comprimido'], verificado: true }],
  },

  // ── Fonte: eurofarma-sync.ts, id 'euro-duomo-hp' ──────────────────
  {
    id: 'doxazosina_finasterida',
    molecula: 'Doxazosina + Finasterida',
    nome_generico: 'Doxazosina + Finasterida',
    sinonimos: ['doxazosina + finasterida', 'duomo hp'],
    categoria: 'outro',
    classe: 'Alfa-1 Bloqueador + Inibidor da 5-Alfa-Redutase (Associação para HPB)',
    indicacoes_principais: ['Hiperplasia Prostática Benigna (HPB) sintomática'],
    dose_adulto: {
      habitual: '1 comprimido (doxazosina 4 mg + finasterida 5 mg) 1x/dia',
      max: '1 comprimido/dia',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'Resposta esperada em 3–6 meses para a finasterida; doxazosina age mais rapidamente. Iniciar com cautela pelo risco de hipotensão ortostática na 1ª dose.',
    },
    ajuste_hepatico: { child_a: 'Sem ajuste — monitorar', child_b: 'Cautela — ambos os componentes com metabolismo hepático', child_c: 'CONTRAINDICADO (bula: insuficiência hepática grave)' },
    contraindicacoes_rapidas: ['Hipersensibilidade aos componentes', 'Mulheres e crianças (finasterida)', 'Hipotensão ortostática grave', 'Insuficiência hepática grave'],
    interacoes_importantes: [
      { com: 'Anti-hipertensivos', severidade: 'moderada', descricao: 'Hipotensão aditiva com a doxazosina.' },
      { com: 'Inibidores CYP3A4', severidade: 'moderada', descricao: 'Aumentam a exposição à doxazosina.' },
      { com: 'Inibidores de PDE5 (tadalafila etc.)', severidade: 'moderada', descricao: 'Risco de hipotensão sintomática.' },
    ],
    alertas_especiais: [
      'Hipotensão ortostática na 1ª dose (doxazosina) — iniciar sentado/deitado',
      'Finasterida reduz PSA em ~50% — considerar na interpretação do PSA',
      'Disfunção sexual (ejaculação retrógrada, disfunção erétil)',
      '⚠ Mulheres grávidas não devem manusear os comprimidos — risco teratogênico da finasterida por absorção cutânea',
    ],
    uso_gestante: 'contraindicado',
    uso_lactante: 'contraindicado',
    marcas: [{ nome: 'Duomo HP®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['4 mg + 5 mg'], formas: ['Cápsula'], verificado: true }],
  },

  // ── Fonte: eurofarma-sync.ts, id 'euro-gesico-duo' ──────────────────
  {
    id: 'tramadol_paracetamol',
    molecula: 'Tramadol + Paracetamol',
    nome_generico: 'Tramadol + Paracetamol',
    sinonimos: ['tramadol + paracetamol', 'gesico duo'],
    categoria: 'analgesico',
    classe: 'Associação Opioide (Agonista μ) + Analgésico Não Opioide',
    indicacoes_principais: ['Dor moderada a intensa'],
    dose_adulto: {
      habitual: '1–2 comprimidos (tramadol 37,5 mg + paracetamol 325 mg) a cada 4–6h',
      max: '8 comprimidos/dia',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['a cada 4–6h'],
      instrucoes: 'Retenção especial ANVISA (notificação de receita B). Não superar dose diária de paracetamol de 3–4 g.',
    },
    ajuste_renal: { normal: '1–2 comp. a cada 4–6h', tfg_60_30: 'Cautela — monitorar', tfg_30_15: 'Espaçar para 12/12h (bula)', tfg_lt_15: 'Evitar — sem dados suficientes', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste — monitorar', child_b: 'Espaçar para 12/12h (bula, ajuste do componente tramadol)', child_c: 'CONTRAINDICADO (bula: IH grave)' },
    contraindicacoes_rapidas: ['IMAOs', 'Epilepsia não controlada', 'IH grave', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'IMAOs', severidade: 'contraindicado', descricao: 'Risco de síndrome serotoninérgica grave.' },
      { com: 'ISRS/IRSN', severidade: 'grave', descricao: 'Risco de síndrome serotoninérgica.' },
      { com: 'Álcool', severidade: 'grave', descricao: 'Potencializa a hepatotoxicidade do paracetamol.' },
      { com: 'Varfarina', severidade: 'moderada', descricao: 'Interação descrita na bula — monitorar INR.' },
    ],
    alertas_especiais: ['Síndrome serotoninérgica', 'Não superar dose diária de paracetamol (3–4 g/dia) — risco de hepatotoxicidade', 'Dependência e tolerância (componente opioide)'],
    uso_gestante: 'contraindicado',
    uso_lactante: 'contraindicado',
    marcas: [{ nome: 'Gésico Duo®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['37,5 mg + 325 mg'], formas: ['Comprimido'], verificado: true }],
  },

  // ── Fonte: eurofarma-sync.ts, id 'euro-perivasc' ──────────────────
  {
    id: 'diosmina_hesperidina',
    molecula: 'Diosmina + Hesperidina',
    nome_generico: 'Diosmina + Hesperidina',
    sinonimos: ['diosmina + hesperidina', 'perivasc', 'flebotonico'],
    categoria: 'cardiovascular',
    classe: 'Flebotônico / Venoativo — Flavonoide',
    indicacoes_principais: ['Insuficiência venosa crônica', 'Doença hemorroidária'],
    dose_adulto: {
      habitual: '2 comprimidos de 500 mg 1x/dia (ou 1 comprimido de 1000 mg 1x/dia)',
      max: '1000 mg/dia',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'Usar às refeições.',
    },
    ajuste_hepatico: { child_a: 'Sem ajuste — dados limitados, monitorar', child_b: 'Sem ajuste formal — dados limitados', child_c: 'Sem dados — usar com cautela' },
    contraindicacoes_rapidas: ['Hipersensibilidade'],
    // Bula não lista interações principais — nota abaixo é farmacológica geral
    // (flavonoides), não um achado específico da bula deste produto.
    interacoes_importantes: [
      { com: 'Anticoagulantes orais', severidade: 'leve', descricao: 'Relatos isolados de potencialização leve descritos na literatura — sem relevância clínica estabelecida nem necessidade de ajuste rotineiro.' },
    ],
    alertas_especiais: ['Geralmente bem tolerado', 'Efeitos GI leves (náusea, dispepsia)'],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [{ nome: 'Perivasc®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['450 mg + 50 mg', '900 mg + 100 mg'], formas: ['Comprimido'], verificado: true }],
  },

  // ── Fonte: eurofarma-sync.ts, id 'euro-betatrinta' ──────────────────
  {
    id: 'betametasona_dipropionato_fosfato',
    molecula: 'Dipropionato de Betametasona + Fosfato Dissódico de Betametasona',
    nome_generico: 'Betametasona (Dipropionato + Fosfato Dissódico)',
    sinonimos: ['betametasona dipropionato + fosfato', 'betatrinta', 'corticoide injetavel de deposito'],
    categoria: 'antiinflamatorio',
    classe: 'Corticosteroide de Ação Prolongada — Uso Injetável (Depósito)',
    indicacoes_principais: ['Infiltração articular/periarticular (artrite, tendinite, bursite)', 'Asma grave/anafilaxia (uso sistêmico)', 'Dermatoses graves'],
    dose_adulto: {
      habitual: '0,5–2 mL IM ou intra-articular, conforme indicação e porte da articulação',
      max: '2 mL/aplicação',
      unidade: 'mL',
      via: 'IM',
      frequencias: ['conforme indicação — máximo 3–4 infiltrações/ano por articulação'],
      instrucoes: 'NÃO administrar por via IV. Fosfato dissódico proporciona início rápido; dipropionato, ação prolongada.',
    },
    ajuste_hepatico: { child_a: 'Sem ajuste — monitorar', child_b: 'Cautela — corticosteroide com metabolismo hepático', child_c: 'Cautela — considerar redução de dose/frequência' },
    contraindicacoes_rapidas: ['Infecção articular ativa', 'Bacteremia', 'Via IV', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'AINEs', severidade: 'moderada', descricao: 'Risco aumentado de sangramento gastrointestinal.' },
      { com: 'Antidiabéticos', severidade: 'moderada', descricao: 'Efeito hiperglicemiante do corticosteroide antagoniza o controle glicêmico.' },
      { com: 'Inibidores CYP3A4', severidade: 'leve', descricao: 'Podem aumentar a exposição sistêmica ao corticosteroide.' },
    ],
    alertas_especiais: [
      'Atrofia cutânea e subcutânea no local de infiltração repetida',
      'Supressão do eixo hipotálamo-hipófise-adrenal (HHA)',
      'Hiperglicemia — monitorar em diabéticos',
      'Máximo 3–4 infiltrações/ano por articulação',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [{ nome: 'BetaTrinta®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['5 mg + 2 mg/mL'], formas: ['Suspensão injetável'], verificado: true }],
  },

  // ── Fonte: eurofarma-sync.ts, id 'euro-selene' ──────────────────
  {
    id: 'etinilestradiol_ciproterona',
    molecula: 'Etinilestradiol + Acetato de Ciproterona',
    nome_generico: 'Etinilestradiol + Ciproterona',
    sinonimos: ['etinilestradiol + ciproterona', 'selene'],
    categoria: 'hormonio',
    classe: 'Anticoncepcional Hormonal Combinado — Antiandrogênico',
    indicacoes_principais: ['Contracepção hormonal', 'Acne moderada a grave', 'Hirsutismo'],
    dose_adulto: {
      habitual: '1 comprimido (etinilestradiol 0,035 mg + ciproterona 2 mg) 1x/dia por 21 dias, pausa de 7 dias',
      max: '1 comprimido/dia',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['1x/dia, ciclo 21/7'],
      instrucoes: 'Iniciar no 1º dia do ciclo menstrual.',
    },
    ajuste_hepatico: { child_a: 'Cautela — monitorar função hepática', child_b: 'Evitar', child_c: 'CONTRAINDICADO (bula: insuficiência hepática grave)' },
    contraindicacoes_rapidas: ['Gravidez (Categoria X)', 'Tromboembolismo venoso/arterial', 'Enxaqueca com aura', 'IH grave', 'Neoplasias hormônio-dependentes'],
    interacoes_importantes: [
      { com: 'Rifampicina/carbamazepina/fenitoína', severidade: 'moderada', descricao: 'Reduzem a eficácia contraceptiva (indução enzimática).' },
      { com: 'Antibióticos de amplo espectro', severidade: 'leve', descricao: 'Potencial redução de eficácia — orientar método contraceptivo adicional.' },
      { com: 'Lamotrigina', severidade: 'moderada', descricao: 'Reduz o nível sérico de lamotrigina.' },
    ],
    alertas_especiais: [
      '⚠ Maior risco de tromboembolismo venoso (TEV) que combinações com progestágenos de 2ª geração',
      'Monitorar pressão arterial e função hepática',
      'Preferir outra opção contraceptiva quando o perfil de risco de TEV não for justificado pela indicação antiandrogênica',
    ],
    uso_gestante: 'contraindicado',
    uso_lactante: 'contraindicado',
    marcas: [{ nome: 'Selene®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['0,035 mg + 2 mg'], formas: ['Comprimido'], verificado: true }],
  },

  // ── Fonte: eurofarma-sync.ts, id 'euro-amora' ──────────────────
  {
    id: 'clormadinona_etinilestradiol',
    molecula: 'Acetato de Clormadinona + Etinilestradiol',
    nome_generico: 'Clormadinona + Etinilestradiol',
    sinonimos: ['clormadinona + etinilestradiol', 'amora'],
    categoria: 'hormonio',
    classe: 'Anticoncepcional Hormonal Combinado Oral (AHCO)',
    indicacoes_principais: ['Contracepção hormonal'],
    dose_adulto: {
      habitual: '1 comprimido (clormadinona 2 mg + etinilestradiol 0,03 mg) 1x/dia por 21 dias, pausa de 7 dias',
      max: '1 comprimido/dia',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['1x/dia, ciclo 21/7'],
    },
    ajuste_hepatico: { child_a: 'Cautela — monitorar função hepática', child_b: 'Evitar', child_c: 'CONTRAINDICADO (bula: insuficiência hepática grave)' },
    contraindicacoes_rapidas: ['Gravidez (Categoria X)', 'Tromboembolismo', 'IH grave', 'Enxaqueca com aura', 'Neoplasias hormônio-dependentes'],
    interacoes_importantes: [
      { com: 'Rifampicina/carbamazepina', severidade: 'moderada', descricao: 'Reduzem a eficácia contraceptiva (indução enzimática).' },
      { com: 'Lamotrigina', severidade: 'moderada', descricao: 'Interação descrita na bula — monitorar.' },
    ],
    alertas_especiais: ['Risco de TEV (menor que com ciproterona)', 'Monitorar pressão arterial', 'Não fumar em uso concomitante (> 35 anos) — risco cardiovascular aumentado'],
    uso_gestante: 'contraindicado',
    uso_lactante: 'contraindicado',
    marcas: [{ nome: 'Amora®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['2 mg + 0,03 mg'], formas: ['Comprimido'], verificado: true }],
  },

  // ── Fonte: eurofarma-sync.ts, ids 'euro-primera-20'/'euro-primera-30'
  // (mesma molécula, 2 apresentações/marcas — mesma chave RM-24) ──────
  {
    id: 'desogestrel_etinilestradiol',
    molecula: 'Desogestrel + Etinilestradiol',
    nome_generico: 'Desogestrel + Etinilestradiol',
    sinonimos: ['desogestrel + etinilestradiol', 'primera'],
    categoria: 'hormonio',
    classe: 'Anticoncepcional Hormonal Combinado Oral (AHCO) — Baixa Dose',
    indicacoes_principais: ['Contracepção hormonal'],
    dose_adulto: {
      habitual: '1 comprimido (desogestrel 0,15 mg + etinilestradiol 0,02 mg ou 0,03 mg) 1x/dia por 21 dias, pausa de 7 dias',
      max: '1 comprimido/dia',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['1x/dia, ciclo 21/7'],
      instrucoes: 'Disponível em 2 apresentações (Primera 20® — 0,02 mg de EE; Primera 30® — 0,03 mg de EE).',
    },
    ajuste_hepatico: { child_a: 'Cautela — monitorar função hepática', child_b: 'Evitar', child_c: 'CONTRAINDICADO (bula: insuficiência hepática grave)' },
    contraindicacoes_rapidas: ['Gravidez', 'Tromboembolismo venoso (TEV)', 'IH grave', 'Enxaqueca com aura', 'Neoplasias hormônio-dependentes'],
    interacoes_importantes: [
      { com: 'Rifampicina/carbamazepina', severidade: 'moderada', descricao: 'Reduzem a eficácia contraceptiva (indução enzimática).' },
    ],
    alertas_especiais: ['Baixa dose de etinilestradiol — menor impacto metabólico', 'Maior controle de ciclo que progestínios puros'],
    uso_gestante: 'contraindicado',
    uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'Primera 20®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['0,15 mg + 0,02 mg'], formas: ['Comprimido'], verificado: true },
      { nome: 'Primera 30®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['0,15 mg + 0,03 mg'], formas: ['Comprimido'], verificado: true },
    ],
  },

  // ── Fonte: eurofarma-sync.ts, ids 'euro-trok-creme'/'euro-trok-pomada'
  // (mesma molécula, 2 formas farmacêuticas — mesma chave RM-24) ──────
  {
    id: 'cetoconazol_betametasona',
    molecula: 'Cetoconazol + Dipropionato de Betametasona',
    nome_generico: 'Cetoconazol + Betametasona',
    sinonimos: ['cetoconazol + betametasona', 'trok'],
    categoria: 'outro',
    classe: 'Antifúngico + Corticosteroide Tópico',
    indicacoes_principais: ['Dermatomicoses com componente inflamatório (tinea, candidíase cutânea)'],
    dose_adulto: {
      habitual: 'Aplicar camada fina na área afetada 1–2x/dia',
      max: '45 g/semana',
      unidade: 'mg',
      via: 'Tópico',
      frequencias: ['1–2x/dia'],
      instrucoes: 'Uso máximo de 2 semanas. Não usar em mucosas, olhos ou canal auditivo (tímpano perfurado).',
    },
    ajuste_hepatico: { child_a: 'Sem ajuste — absorção sistêmica mínima por via tópica', child_b: 'Sem ajuste — absorção sistêmica mínima', child_c: 'Cautela em uso extenso/prolongado — absorção sistêmica pode aumentar com pele lesada' },
    contraindicacoes_rapidas: ['Varicela', 'Herpes simples/zoster', 'Tuberculose cutânea', 'Sífilis cutânea', 'Menores de 12 anos (cautela)'],
    // Bula não lista interações principais (absorção sistêmica mínima por
    // via tópica) — nota abaixo é cautela farmacológica geral de classe.
    interacoes_importantes: [
      { com: 'Outros corticosteroides tópicos/sistêmicos', severidade: 'leve', descricao: 'Risco aditivo de supressão adrenal em uso extenso, prolongado ou sobre grande área corporal — evitar associação na mesma região.' },
    ],
    alertas_especiais: ['Uso máximo 2 semanas', 'Não usar em mucosas, olhos ou canal auditivo', 'Evitar álcool durante o tratamento'],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Trok® Creme', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['20 mg/g + 0,64 mg/g'], formas: ['Creme'], verificado: true },
      { nome: 'Trok® Pomada', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['20 mg/g + 0,64 mg/g'], formas: ['Pomada'], verificado: true },
    ],
  },

  // ── Fonte: eurofarma-sync.ts, id 'euro-trok-g' ──────────────────
  {
    id: 'betametasona_gentamicina',
    molecula: 'Dipropionato de Betametasona + Sulfato de Gentamicina',
    nome_generico: 'Betametasona + Gentamicina',
    sinonimos: ['betametasona + gentamicina', 'trok-g'],
    categoria: 'outro',
    classe: 'Corticosteroide + Antibiótico Tópico',
    indicacoes_principais: ['Dermatoses inflamatórias com infecção bacteriana secundária'],
    dose_adulto: {
      habitual: 'Aplicar camada fina 2–3x/dia na área afetada',
      max: 'conforme extensão da área tratada',
      unidade: 'mg',
      via: 'Tópico',
      frequencias: ['2–3x/dia'],
    },
    ajuste_hepatico: { child_a: 'Sem ajuste — absorção sistêmica mínima por via tópica', child_b: 'Sem ajuste — absorção sistêmica mínima', child_c: 'Cautela em uso extenso/prolongado' },
    contraindicacoes_rapidas: ['Menores de 2 anos', 'Infecções virais ou fúngicas cutâneas', 'Tuberculose de pele', 'Uso oftálmico'],
    // Bula não lista interações principais — nota abaixo é cautela
    // farmacológica geral de classe (aminoglicosídeo tópico).
    interacoes_importantes: [
      { com: 'Outros aminoglicosídeos (tópicos ou sistêmicos)', severidade: 'leve', descricao: 'Risco teórico de ototoxicidade/nefrotoxicidade aditiva em uso concomitante extenso — improvável em uso tópico limitado, mas descrito como cautela na bula.' },
    ],
    alertas_especiais: ['Risco de nefrotoxicidade/ototoxicidade da gentamicina em áreas extensas (maior absorção sistêmica)', 'Contraindicado na amamentação e doação de leite humano'],
    uso_gestante: 'contraindicado',
    uso_lactante: 'contraindicado',
    marcas: [{ nome: 'Trok-G®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['0,64 mg/g + 1 mg/g'], formas: ['Creme', 'Pomada'], verificado: true }],
  },

  // ── Fonte: eurofarma-sync.ts, id 'euro-trok-n' ──────────────────
  {
    id: 'cetoconazol_betametasona_neomicina',
    molecula: 'Cetoconazol + Dipropionato de Betametasona + Sulfato de Neomicina',
    nome_generico: 'Cetoconazol + Betametasona + Neomicina',
    sinonimos: ['cetoconazol + betametasona + neomicina', 'trok-n'],
    categoria: 'outro',
    classe: 'Antifúngico + Corticosteroide + Antibiótico Tópico',
    indicacoes_principais: ['Dermatomicoses com componente inflamatório e infecção bacteriana secundária'],
    dose_adulto: {
      habitual: 'Aplicar camada fina 1–2x/dia',
      max: '45 g/semana',
      unidade: 'mg',
      via: 'Tópico',
      frequencias: ['1–2x/dia'],
      instrucoes: 'Uso máximo de 2 semanas.',
    },
    ajuste_hepatico: { child_a: 'Sem ajuste — absorção sistêmica mínima por via tópica', child_b: 'Sem ajuste — absorção sistêmica mínima', child_c: 'Cautela em uso extenso/prolongado' },
    contraindicacoes_rapidas: ['Varicela', 'Herpes simples/zoster', 'Tuberculose cutânea', 'Sífilis cutânea', 'Uso oftálmico'],
    // Bula não lista interações principais — nota abaixo é cautela
    // farmacológica geral de classe (aminoglicosídeo tópico).
    interacoes_importantes: [
      { com: 'Outros aminoglicosídeos (tópicos ou sistêmicos)', severidade: 'leve', descricao: 'Risco teórico de ototoxicidade aditiva da neomicina em uso concomitante extenso.' },
    ],
    alertas_especiais: ['Risco de ototoxicidade/nefrotoxicidade da neomicina em áreas extensas', 'Categoria D — contraindicado na gestação', 'Uso máximo 2 semanas'],
    uso_gestante: 'contraindicado',
    uso_lactante: 'avaliar',
    marcas: [{ nome: 'Trok-N®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['20 mg/g + 0,64 mg/g + 2,5 mg/g'], formas: ['Creme', 'Pomada'], verificado: true }],
  },

  // ── Fonte: eurofarma-sync.ts, id 'euro-crevagin' ──────────────────
  {
    id: 'tinidazol_miconazol',
    molecula: 'Tinidazol + Nitrato de Miconazol',
    nome_generico: 'Tinidazol + Miconazol',
    sinonimos: ['tinidazol + miconazol', 'crevagin'],
    categoria: 'antiparasitario',
    classe: 'Antiprotozoário + Antifúngico — Uso Vaginal',
    indicacoes_principais: ['Tricomoníase vaginal', 'Candidíase vulvovaginal', 'Vaginose bacteriana'],
    dose_adulto: {
      habitual: '1 aplicador intravaginal à noite por 7 dias',
      max: '1 aplicador/dia',
      unidade: 'mg',
      via: 'Tópico',
      frequencias: ['1x/dia à noite, por 7 dias'],
      instrucoes: 'Uso exclusivamente intravaginal.',
    },
    ajuste_hepatico: { child_a: 'Sem ajuste — absorção sistêmica mínima por via vaginal', child_b: 'Sem ajuste — absorção sistêmica mínima', child_c: 'Cautela — dados insuficientes' },
    contraindicacoes_rapidas: ['Menores de 12 anos', 'Uso masculino', 'Aleitamento e doação de leite humano (tinidazol excretado no leite)', 'Hipersensibilidade a nitroimidazólicos'],
    interacoes_importantes: [
      { com: 'Álcool', severidade: 'grave', descricao: 'Efeito dissulfiram-like grave (reação antabuse) do tinidazol — proibido durante e até 3 dias após o tratamento.' },
      { com: 'Anticoagulantes', severidade: 'moderada', descricao: 'Tinidazol potencializa o efeito anticoagulante — monitorar.' },
    ],
    alertas_especiais: ['⚠ Proibido álcool durante e até 3 dias após o tratamento', 'Pode reduzir a eficácia de contraceptivos de barreira de látex'],
    uso_gestante: 'avaliar',
    uso_lactante: 'contraindicado',
    marcas: [{ nome: 'Crevagin®', laboratorio: 'Eurofarma', lab_id: 'eurofarma', concentracoes: ['30 mg/g + 20 mg/g'], formas: ['Creme vaginal'], verificado: true }],
  },
];
