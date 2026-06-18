// ============================================================
// PRESCREVE-AI — Banco de Bulas Estruturado
// Fonte: ANVISA / Bulas registradas pelos laboratórios
// IMPORTANTE: Informação regulatória — separada da evidência científica
// ============================================================

import type { BulaCompleta } from './types';

export const BULAS: Record<string, BulaCompleta> = {

  'euro-zart-50': {
    produto_id: 'euro-zart-50',
    produto_nome: 'Zart®',
    molecula: 'Losartana Potássica',
    data_aprovacao_anvisa: '2002-08-15',
    versao: 'v8.0 — Mar/2024',
    bula_profissional: [
      {
        titulo: '1. IDENTIFICAÇÃO DO MEDICAMENTO',
        conteudo: 'ZART® (losartana potássica). Comprimidos revestidos de 50 mg e 100 mg. Classe terapêutica: Bloqueador do Receptor de Angiotensina II (BRA). Registro ANVISA: 1.0204.0258.001-8 (50 mg) / 1.0204.0258.002-6 (100 mg). Laboratório: Eurofarma Laboratórios S.A.',
      },
      {
        titulo: '2. COMPOSIÇÃO',
        conteudo: 'Cada comprimido revestido contém: Losartana potássica 50 mg (ou 100 mg). Excipientes: celulose microcristalina, lactose monoidratada, amido pré-gelatinizado, estearato de magnésio, hidroxipropilcelulose, dióxido de titânio, cera de carnaúba.',
      },
      {
        titulo: '3. INDICAÇÕES',
        conteudo: 'ZART® é indicado para:\n• Tratamento da hipertensão arterial sistêmica (HAS) em adultos e crianças acima de 6 anos.\n• Redução do risco de morbidade e mortalidade cardiovascular em pacientes hipertensos com hipertrofia ventricular esquerda (HVE).\n• Proteção renal em pacientes com DM tipo 2 com nefropatia e HAS (microalbuminúria > 300 mg/24h).',
      },
      {
        titulo: '4. CONTRAINDICAÇÕES',
        conteudo: '• Hipersensibilidade à losartana potássica ou a qualquer componente da fórmula.\n• Segundo e terceiro trimestres de gestação.\n• Uso concomitante com medicamentos contendo alisquireno em pacientes com diabetes mellitus ou com insuficiência renal (TFG < 60 mL/min/1,73m²).\n• Insuficiência hepática grave (Child-Pugh C).',
      },
      {
        titulo: '5. POSOLOGIA E MODO DE USAR',
        conteudo: 'Hipertensão arterial:\nAdultos: Dose inicial habitual: 50 mg 1 vez ao dia. Dose de manutenção: 25-100 mg 1 vez ao dia. Ajustar conforme resposta clínica após 3-6 semanas. Dose máxima: 100 mg/dia.\n\nRedução de risco cardiovascular em HVE:\nDose inicial: 50 mg 1 vez ao dia. Adicionar hidroclorotiazida 12,5 mg se necessário.\n\nNefropatia em DM tipo 2:\nDose inicial: 50 mg 1 vez ao dia. Titular para 100 mg 1 vez ao dia conforme resposta.\n\nIdosos e depleção de volume:\nConsiderar 25 mg como dose inicial.\n\nAdministração: VO, com ou sem alimentos, preferencialmente no mesmo horário diário.',
      },
      {
        titulo: '6. ADVERTÊNCIAS E PRECAUÇÕES',
        conteudo: '• Hipotensão: Pacientes com depleção de volume (diuréticos, dieta hipossódica, diarreia, vômitos) apresentam maior risco de hipotensão sintomática. Corrigir depleção antes de iniciar.\n• Função renal: Pode ocorrer elevação de creatinina e ureia, especialmente em pacientes com estenose bilateral de artéria renal ou IC grave. Monitorar função renal e eletrólitos.\n• Hipercalemia: Risco aumentado em pacientes com DRC, DM, uso concomitante de diuréticos poupadores de potássio ou IECA. Monitorar K+ sérico.\n• Duplo bloqueio do SRAA: Evitar uso combinado com IECA ou alisquireno (especialmente em DM e DRC) — risco de hipotensão grave, hipercalemia e deterioração renal.\n• Estenose aórtica/Cardiomiopatia hipertrófica obstrutiva: Cautela.\n• Hepatopatia: Considerar dose menor (25 mg/dia).',
      },
      {
        titulo: '7. INTERAÇÕES MEDICAMENTOSAS',
        conteudo: '• IECA: Não usar combinação (duplo bloqueio SRAA — hipotensão, hipercalemia, insuficiência renal).\n• Alisquireno: Contraindicado em DM e DRC.\n• AINEs (incluindo inibidores seletivos COX-2): Atenuação do efeito anti-hipertensivo. Risco de insuficiência renal aguda, especialmente em idosos ou DRC.\n• Diuréticos poupadores de potássio (espironolactona, eplerenona, amilorida, triantereno): Risco de hipercalemia.\n• Suplementos de potássio / substitutos de sal com potássio: Risco de hipercalemia.\n• Lítio: Aumento dos níveis séricos de lítio (redução de excreção renal). Monitorar litemias.\n• Rifampicina / Fluconazol: Redução dos níveis de losartana e seu metabólito ativo E-3174.',
      },
      {
        titulo: '8. USO EM POPULAÇÕES ESPECIAIS',
        conteudo: 'GESTAÇÃO: Contraindicado no 2º e 3º trimestres. O uso de medicamentos que agem sobre o sistema renina-angiotensina-aldosterona durante o 2º e 3º trimestres de gestação reduz a função renal fetal e pode causar oligoidrâmnio, deformidades esqueléticas fetais e morte fetal/neonatal. Suspender imediatamente ao confirmar gravidez.\n\nLACTAÇÃO: Desconhece-se se a losartana é excretada no leite humano. Não recomendado durante a amamentação.\n\nPEDIATRIA (≥ 6 anos): Dose baseada em peso. < 20 kg: 0,7 mg/kg 1x/dia (máx 50 mg/dia). 20-50 kg: 25-50 mg/dia. > 50 kg: 50-100 mg/dia.\n\nIDOSOS: Sem necessidade de ajuste de dose. Maior risco de hipotensão se depleção de volume.\n\nINSUFICIÊNCIA RENAL: TFG > 30: sem ajuste. TFG < 30 (nefropatia DM): não recomendado. Hemodiálise: losartana não é removida pela diálise.',
      },
      {
        titulo: '9. EFEITOS ADVERSOS',
        conteudo: 'Muito comuns (≥ 10%): Tontura.\n\nComuns (1-10%): Hipotensão (incluindo hipotensão ortostática), hipercalemia, hipoglicemia (pacientes diabéticos), elevação de ureia e creatinina, anemia.\n\nIncomuns (0,1-1%): Urticária, prurido, exantema.\n\nRaros (< 0,1%): Angioedema (incluindo edema de face, lábios, faringe e/ou língua — descontinuar imediatamente), insuficiência hepática, vasculite (incluindo púrpura de Henoch-Schönlein), rabdomiólise.\n\nA losartana não causa tosse seca (diferentemente dos IECAs).',
      },
      {
        titulo: '10. SUPERDOSAGEM',
        conteudo: 'Os achados mais prováveis são: hipotensão, taquicardia, bradicardia (por estimulação vagal). Tratamento: sintomático e de suporte. Transferir para UTI se hipotensão grave. Losartana não é removida por hemodiálise.',
      },
    ],
    bula_paciente: [
      {
        titulo: 'Para que serve ZART®?',
        conteudo: 'ZART® (losartana) é usado para tratar a pressão alta (hipertensão). Também pode ser usado para proteger os rins em pessoas com diabetes tipo 2 que têm pressão alta e proteína na urina.',
      },
      {
        titulo: 'Como devo tomar ZART®?',
        conteudo: 'Tome um comprimido por dia, no mesmo horário. Pode tomar com ou sem comida. Engula o comprimido inteiro com água. Não pare de tomar sem orientação médica, mesmo que se sentir bem.',
      },
      {
        titulo: 'Quais os possíveis efeitos colaterais?',
        conteudo: 'Os efeitos mais comuns são: tontura (especialmente ao se levantar rápido) e elevação do potássio no sangue.\n\nProcure atendimento urgente se sentir: inchaço repentino do rosto, lábios, língua ou garganta (angioedema) — pare de tomar o medicamento imediatamente.',
      },
      {
        titulo: 'Quando não devo tomar ZART®?',
        conteudo: 'Não tome ZART® se estiver grávida (especialmente no 2º e 3º meses), se tiver alergia à losartana, ou se seu médico identificou outras contraindicações. Avise seu médico sobre todos os outros remédios que está tomando.',
      },
    ],
  },

  'euro-enalapril': {
    produto_id: 'euro-enalapril',
    produto_nome: 'Enalapril Eurofarma',
    molecula: 'Maleato de Enalapril',
    data_aprovacao_anvisa: '1998-05-12',
    versao: 'v12.0 — Jan/2024',
    bula_profissional: [
      {
        titulo: '1. IDENTIFICAÇÃO DO MEDICAMENTO',
        conteudo: 'Enalapril Eurofarma (maleato de enalapril). Comprimidos de 5 mg, 10 mg e 20 mg. Classe terapêutica: Inibidor da Enzima Conversora de Angiotensina (IECA). Laboratório: Eurofarma Laboratórios S.A.',
      },
      {
        titulo: '2. INDICAÇÕES',
        conteudo: '• Hipertensão arterial sistêmica.\n• Insuficiência cardíaca sintomática com FE reduzida (IC-FEr) — redução de mortalidade e hospitalizações.\n• Prevenção de IC sintomática em disfunção sistólica assintomática (FE < 35-40%).\n• Pós-infarto do miocárdio com disfunção ventricular.\n• Nefropatia diabética (off-label com evidência forte).',
      },
      {
        titulo: '3. POSOLOGIA',
        conteudo: 'Hipertensão:\nDose inicial: 5-10 mg 1x/dia. Manutenção: 10-40 mg/dia (1-2 tomadas). Pacientes com ativação do SRAA (IC, depleção de volume): iniciar com 2,5 mg supervisionado.\n\nInsuficiência Cardíaca:\nInicial: 2,5 mg 2x/dia. Aumentar gradualmente a cada 2 semanas conforme tolerância. Alvo: 10-20 mg 2x/dia (conforme ensaio CONSENSUS e SOLVD).\n\nAjuste renal:\nTFG 30-80: 5 mg/dia. TFG 10-30: 2,5 mg/dia. TFG < 10 / diálise: 2,5 mg no dia da diálise.',
      },
      {
        titulo: '4. CONTRAINDICAÇÕES',
        conteudo: '• Hipersensibilidade ao enalapril ou a qualquer IECA.\n• Histórico de angioedema relacionado ao uso de IECA.\n• Uso concomitante com alisquireno em pacientes com DM ou DRC (TFG < 60).\n• Uso concomitante com sacubitril/valsartana (aguardar 36h após última dose de sacubitril).\n• Gestação em qualquer trimestre.',
      },
      {
        titulo: '5. ADVERTÊNCIAS',
        conteudo: '• Tosse seca persistente: efeito de classe dos IECAs. Pode requerer substituição por BRA.\n• Angioedema: pode ocorrer a qualquer momento — maior risco em afro-descendentes. Descontinuar imediatamente.\n• Hipotensão de primeira dose: especialmente em IC, hipertensão renovascular, depleção de volume.\n• Hipercalemia: risco em DRC, DM, uso de diuréticos poupadores, suplementos de K+.\n• Monitorar função renal e K+ na 1ª-2ª semana após início e após ajustes.',
      },
      {
        titulo: '6. EFEITOS ADVERSOS',
        conteudo: 'Muito comuns: Tosse seca não produtiva (10-15%).\n\nComuns: Tontura, hipotensão, astenia, hipercalemia, elevação de creatinina, cefaleia.\n\nIncomuns: Angioedema, exantema, paladar alterado, náuseas.\n\nRaros: Agranulocitose (especialmente em DRC e colagenoses), insuficiência renal aguda, icterícia colestática, hepatite fulminante.',
      },
    ],
    bula_paciente: [
      {
        titulo: 'Para que serve o Enalapril Eurofarma?',
        conteudo: 'É usado para tratar pressão alta (hipertensão) e insuficiência cardíaca (quando o coração não bombeia o sangue adequadamente). Também ajuda a proteger o coração após um infarto.',
      },
      {
        titulo: 'Como devo tomar?',
        conteudo: 'Tome 1 a 2 vezes ao dia, conforme prescrição médica, com ou sem alimentos. A tosse seca é um efeito colateral comum — avise seu médico se ocorrer, pois pode ser necessário trocar o medicamento.',
      },
      {
        titulo: 'Avisos importantes',
        conteudo: 'NÃO tome durante a gravidez — pode causar danos graves ao bebê. Procure emergência se sentir inchaço repentino no rosto, lábios ou garganta (angioedema). Não pare de tomar sem orientação médica.',
      },
    ],
  },

  'euro-metformina': {
    produto_id: 'euro-metformina',
    produto_nome: 'Metformina Eurofarma',
    molecula: 'Cloridrato de Metformina',
    data_aprovacao_anvisa: '2000-06-25',
    versao: 'v14.0 — Abr/2024',
    bula_profissional: [
      {
        titulo: '1. IDENTIFICAÇÃO DO MEDICAMENTO',
        conteudo: 'Metformina Eurofarma (cloridrato de metformina). Comprimidos de 500 mg, 850 mg e 1000 mg. Classe terapêutica: Antidiabético — Biguanida. Laboratório: Eurofarma Laboratórios S.A.',
      },
      {
        titulo: '2. INDICAÇÕES',
        conteudo: '• Diabetes mellitus tipo 2 (DM2) em adultos e crianças ≥ 10 anos, especialmente em pacientes com sobrepeso, quando a dieta e o exercício físico isolados são insuficientes para controlar a glicemia.\n• Pode ser usado em monoterapia ou em associação com outros antidiabéticos (sulfonilureias, inibidores DPP-4, SGLT-2, GLP-1) ou insulina.',
      },
      {
        titulo: '3. POSOLOGIA',
        conteudo: 'Adultos:\nDose inicial: 500 mg 2x/dia ou 850 mg 1x/dia com refeições (café da manhã e/ou jantar).\nAjuste gradual: aumentar 500 mg/semana ou 850 mg a cada 2 semanas.\nDose de manutenção: 1500-2000 mg/dia.\nDose máxima: 3000 mg/dia.\n\nCrianças (≥ 10 anos):\nInicial: 500 mg 2x/dia. Máximo: 2000 mg/dia.\n\nAdministração com alimentos — reduz efeitos gastrointestinais.',
      },
      {
        titulo: '4. CONTRAINDICAÇÕES',
        conteudo: '• TFG < 30 mL/min/1,73m² (insuficiência renal moderada-grave).\n• Acidose metabólica aguda ou crônica, incluindo cetoacidose diabética.\n• Insuficiência hepática (qualquer grau).\n• Insuficiência cardíaca instável, insuficiência respiratória grave, sepse — risco de acidose lática.\n• Ingestão excessiva de álcool.\n• Uso de contraste iodado IV (suspender 48h antes).',
      },
      {
        titulo: '5. ADVERTÊNCIAS — ACIDOSE LÁTICA',
        conteudo: 'A acidose lática é uma complicação metabólica rara (incidência: ~3/100.000 pacientes/ano) mas potencialmente fatal. A mortalidade pode chegar a 50%.\n\nFatores de risco para acidose lática:\n• Insuficiência renal (principal fator de risco)\n• Insuficiência hepática\n• Insuficiência cardíaca congestiva\n• Insuficiência respiratória / hipóxia\n• Sepse\n• Desidratação grave\n• Alcoolismo\n• Uso de contraste iodado\n\nSintomas de alerta: mal-estar, mialgia, dificuldade respiratória, hipotermia, dor abdominal, hipoglicemia.\n\nSuspender imediatamente e buscar atenção médica urgente se esses sintomas ocorrerem.',
      },
      {
        titulo: '6. EFEITOS ADVERSOS',
        conteudo: 'Muito comuns: Náusea, vômito, diarreia, dor abdominal, anorexia — especialmente no início. Administrar com alimentos minimiza esses efeitos.\n\nComuns: Gosto metálico transitório.\n\nRaros: Acidose lática (ver advertência acima). Deficiência de vitamina B12 com uso prolongado — monitorar B12 anualmente.\n\nMuito raros: Hepatite, urticária, eritema, prurido, eritema multiforme.',
      },
    ],
    bula_paciente: [
      {
        titulo: 'Para que serve a Metformina Eurofarma?',
        conteudo: 'É usada para controlar o nível de açúcar no sangue (glicemia) em pessoas com diabetes tipo 2, especialmente pessoas com sobrepeso. Ajuda a melhorar a forma como seu corpo usa o açúcar.',
      },
      {
        titulo: 'Como devo tomar?',
        conteudo: 'Tome sempre com alimentos para evitar enjoos e desconforto estomacal. Comece com doses baixas e aumente gradualmente conforme orientação médica. Os efeitos colaterais gastrointestinais são comuns no início mas geralmente melhoram.',
      },
      {
        titulo: 'Avisos importantes',
        conteudo: 'Se for realizar um exame com contraste (como tomografia), avise seu médico — pode ser necessário parar de tomar a metformina temporariamente. Não beba álcool em excesso. Procure atendimento urgente se sentir fraqueza muscular intensa, dificuldade para respirar ou dor abdominal forte.',
      },
    ],
  },

  'euro-busonid': {
    produto_id: 'euro-busonid',
    produto_nome: 'Busonid®',
    molecula: 'Budesonida',
    data_aprovacao_anvisa: '2005-03-22',
    versao: 'v6.0 — Mai/2024',
    bula_profissional: [
      {
        titulo: '1. IDENTIFICAÇÃO DO MEDICAMENTO',
        conteudo: 'BUSONID® (budesonida). Aerossol para inalação oral: 200 mcg/dose e 400 mcg/dose. Dispositivo: inalador pressurizado. Classe terapêutica: Corticosteroide Inalatório (ICS). Laboratório: Eurofarma Laboratórios S.A.',
      },
      {
        titulo: '2. INDICAÇÕES',
        conteudo: '• Tratamento de manutenção da asma brônquica em adultos e crianças (corticoterapia inalatória como terapia controladora).\n• Tratamento de manutenção da DPOC (quando indicado ICS — padrão Asma-DPOC overlap).\n\nNOTA: Busonid® NÃO é indicado para o tratamento do broncoespasmo agudo — não é broncodilatador.',
      },
      {
        titulo: '3. POSOLOGIA',
        conteudo: 'Asma em adultos:\nLeve: 200-400 mcg/dia (1-2 inalações de 200 mcg 2x/dia).\nModerada: 400-800 mcg/dia (2-4 inalações de 200 mcg/dia divididas).\nGrave: 800-1600 mcg/dia.\n\nCrianças (> 6 anos):\n100-400 mcg/dia.\n< 6 anos: 100-200 mcg/dia (orientação pediátrica).\n\nInstruções de uso:\n1. Agitar bem antes de usar.\n2. Expirar lentamente antes de inalar.\n3. Pressionar o dispositivo e inalar profundamente.\n4. Prender a respiração por 10 segundos.\n5. LAVAR A BOCA COM ÁGUA APÓS CADA USO — previne candidíase orofaríngea.',
      },
      {
        titulo: '4. EFEITOS ADVERSOS',
        conteudo: 'Locais (vias aéreas):\n• Candidíase orofaríngea — minimizada lavando a boca após cada uso.\n• Rouquidão (disfonia) — dose-dependente, geralmente reversível.\n\nSistêmicos (doses altas, uso prolongado):\n• Supressão do eixo hipotálamo-hipófise-adrenal (HHA) — clinicamente relevante com doses > 1600 mcg/dia por > 1 ano.\n• Redução da densidade mineral óssea — suplementar cálcio e vitamina D em uso prolongado.\n• Aumento da pressão ocular / glaucoma.\n• Pneumonia em DPOC (com corticosteroides inalatórios em geral).',
      },
    ],
    bula_paciente: [
      {
        titulo: 'Para que serve BUSONID®?',
        conteudo: 'BUSONID® é um corticosteroide inalatório usado para controlar a asma. Ele reduz a inflamação nos brônquios, prevenindo crises. NÃO é para uso durante uma crise de asma — para isso use o broncodilatador de alívio (salbutamol).',
      },
      {
        titulo: 'Como devo usar?',
        conteudo: 'Agite bem o inalador. Expire antes de inalar. Pressione e inale profundamente. Segure a respiração por 10 segundos. SEMPRE lave a boca com água depois — isso previne candidíase (fungo na boca). Use todos os dias, mesmo sem sintomas.',
      },
      {
        titulo: 'Posso parar de tomar?',
        conteudo: 'Não. A budesonida é um medicamento de uso contínuo. Parar de usar pode levar a piora da asma e crises graves. Se quiser diminuir a dose, converse com seu médico.',
      },
    ],
  },

  'euro-amoxicilina': {
    produto_id: 'euro-amoxicilina',
    produto_nome: 'Amoxicilina Eurofarma',
    molecula: 'Amoxicilina Tri-hidratada',
    data_aprovacao_anvisa: '1994-08-05',
    versao: 'v11.0 — Jul/2023',
    bula_profissional: [
      {
        titulo: '1. IDENTIFICAÇÃO',
        conteudo: 'Amoxicilina Eurofarma (amoxicilina tri-hidratada). Cápsulas de 500 mg, comprimidos de 875 mg e suspensão oral 250 mg/5 mL. Classe: Penicilina de Amplo Espectro. Laboratório: Eurofarma Laboratórios S.A.',
      },
      {
        titulo: '2. INDICAÇÕES',
        conteudo: '• Pneumonia adquirida na comunidade (PAC) leve — agentes típicos sensíveis.\n• Otite média aguda bacteriana.\n• Sinusite bacteriana aguda.\n• Amigdalite/faringite bacteriana (Streptococcus pyogenes).\n• Infecções do trato urinário não complicadas.\n• Infecções odontológicas.',
      },
      {
        titulo: '3. POSOLOGIA',
        conteudo: 'Adultos — PAC leve:\n875 mg 2x/dia por 5-7 dias OU 500 mg 3x/dia por 7 dias.\n\nInfecções leves a moderadas:\n500 mg 3x/dia por 7-10 dias.\n\nCrianças:\n40-90 mg/kg/dia divididos em 2-3 tomadas. Alta dose (90 mg/kg/dia) para S. pneumoniae com resistência intermediária.\n\nAjuste renal:\nTFG 10-30: 500 mg a cada 12h. TFG < 10: 500 mg/dia.',
      },
      {
        titulo: '4. ESPECTRO E RESISTÊNCIA',
        conteudo: 'Sensíveis: Streptococcus pyogenes, S. pneumoniae (sensível), Haemophilus influenzae (produtor de beta-lactamase — RESISTENTE), E. coli (variável — resistência crescente), Listeria monocytogenes.\n\nNaturalmente resistentes: S. aureus produtor de penicilinase, Enterococcus faecalis (TEM resistente), Pseudomonas aeruginosa, Klebsiella spp.\n\nConsiderar associação com clavulanato quando resistência por beta-lactamase é suspeita.',
      },
    ],
    bula_paciente: [
      {
        titulo: 'Para que serve a Amoxicilina Eurofarma?',
        conteudo: 'É um antibiótico usado para tratar infecções bacterianas como pneumonia, infecção de garganta, otite (infecção de ouvido), sinusite e infecções urinárias.',
      },
      {
        titulo: 'Como devo tomar?',
        conteudo: 'Tome nos horários certos e COMPLETE o tratamento mesmo se sentir melhora antes. Interromper o antibiótico antes do prazo pode fazer as bactérias voltarem mais resistentes. Tome com ou sem alimentos.',
      },
      {
        titulo: 'Quando procurar atendimento?',
        conteudo: 'Procure emergência se: dificuldade para respirar, inchaço na garganta, manchas vermelhas pelo corpo logo após tomar — podem ser sinais de reação alérgica grave (anafilaxia).',
      },
    ],
  },
};

export function getBula(produtoId: string): BulaCompleta | undefined {
  return BULAS[produtoId];
}

export function getBulasForMolecule(molecula: string): BulaCompleta[] {
  return Object.values(BULAS).filter(b =>
    b.molecula.toLowerCase().includes(molecula.toLowerCase())
  );
}
