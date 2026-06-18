// ============================================================
// PRESCREVE-AI — Catálogo Multi-Laboratório
// Arquitetura escalável: começa com Eurofarma, expande sem refatoração
// IMPORTANTE: dados comerciais/regulatórios — separados da evidência científica
// ============================================================

import type { LabInfo, ProdutoComercial } from './types';

// ─── LABORATÓRIOS CADASTRADOS ─────────────────────────────────
export const LABS: Record<string, LabInfo> = {
  eurofarma: {
    id: 'eurofarma',
    nome: 'Eurofarma Laboratórios S.A.',
    cnpj: '61.190.096/0001-92',
    site: 'https://eurofarma.com.br',
    portfolio_sync_date: '2026-01-15',
    portfolio_version: '2026.1',
    ativo: true,
  },
  ems: {
    id: 'ems',
    nome: 'EMS S.A.',
    cnpj: '57.507.378/0001-01',
    site: 'https://ems.com.br',
    portfolio_sync_date: '',
    portfolio_version: '',
    ativo: false,
  },
  ache: {
    id: 'ache',
    nome: 'Aché Laboratórios Farmacêuticos S.A.',
    cnpj: '60.659.463/0001-91',
    site: 'https://ache.com.br',
    portfolio_sync_date: '',
    portfolio_version: '',
    ativo: false,
  },
  libbs: {
    id: 'libbs',
    nome: 'Libbs Farmacêutica Ltda.',
    cnpj: '60.692.524/0001-96',
    site: 'https://libbs.com.br',
    portfolio_sync_date: '',
    portfolio_version: '',
    ativo: false,
  },
  biolab: {
    id: 'biolab',
    nome: 'Biolab Sanus Farmacêutica Ltda.',
    cnpj: '51.780.468/0001-87',
    site: 'https://biolab.com.br',
    portfolio_sync_date: '',
    portfolio_version: '',
    ativo: false,
  },
  bayer: {
    id: 'bayer',
    nome: 'Bayer S.A.',
    cnpj: '18.459.628/0001-15',
    site: 'https://bayer.com.br',
    portfolio_sync_date: '',
    portfolio_version: '',
    ativo: false,
  },
  pfizer: {
    id: 'pfizer',
    nome: 'Pfizer Brasil Ltda.',
    cnpj: '46.070.868/0001-69',
    site: 'https://pfizer.com.br',
    portfolio_sync_date: '',
    portfolio_version: '',
    ativo: false,
  },
  astrazeneca: {
    id: 'astrazeneca',
    nome: 'AstraZeneca do Brasil Ltda.',
    cnpj: '60.643.809/0001-93',
    site: 'https://astrazeneca.com.br',
    portfolio_sync_date: '',
    portfolio_version: '',
    ativo: false,
  },
  novartis: {
    id: 'novartis',
    nome: 'Novartis Biociências S.A.',
    cnpj: '56.994.502/0001-30',
    site: 'https://novartis.com.br',
    portfolio_sync_date: '',
    portfolio_version: '',
    ativo: false,
  },
  sanofi: {
    id: 'sanofi',
    nome: 'Sanofi-Aventis Farmacêutica Ltda.',
    cnpj: '02.685.377/0001-79',
    site: 'https://sanofi.com.br',
    portfolio_sync_date: '',
    portfolio_version: '',
    ativo: false,
  },
  roche: {
    id: 'roche',
    nome: 'Produtos Roche Químicos e Farmacêuticos S.A.',
    cnpj: '33.009.945/0001-27',
    site: 'https://roche.com.br',
    portfolio_sync_date: '',
    portfolio_version: '',
    ativo: false,
  },
  gsk: {
    id: 'gsk',
    nome: 'GlaxoSmithKline Brasil Ltda.',
    cnpj: '33.247.743/0001-10',
    site: 'https://gsk.com.br',
    portfolio_sync_date: '',
    portfolio_version: '',
    ativo: false,
  },
};

// ─── PORTFÓLIO EUROFARMA ──────────────────────────────────────
// Dados regulatórios/comerciais — NÃO utilizados para recomendação clínica
// A recomendação clínica é sempre: Diretriz → Classe → Molécula
// Marcas são exibidas apenas como informação complementar conforme preferência do médico

export const EUROFARMA_PRODUCTS: ProdutoComercial[] = [

  // ═══ CARDIOVASCULAR — HAS (I10) ══════════════════════════════

  {
    id: 'euro-zart-50',
    lab_id: 'eurofarma',
    molecula: 'Losartana Potássica',
    nome_comercial: 'Zart®',
    classe_terapeutica: 'BRA — Bloqueador do Receptor de Angiotensina II',
    cids_aprovados: ['I10', 'I50', 'N18'],
    apresentacoes: [
      { concentracao: '50 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0204.0258.001-8' },
      { concentracao: '100 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0204.0258.002-6' },
    ],
    posologia_aprovada: 'HAS: 50 mg 1x/dia. Dose máxima: 100 mg/dia. Ajustar conforme resposta clínica. Redução de risco CV em HVE: iniciar 50 mg/dia.',
    contraindicacoes_bula: [
      'Hipersensibilidade à losartana ou excipientes',
      'Gravidez (2º e 3º trimestres)',
      'Uso concomitante com alisquireno em pacientes com DM ou DRC (TFG < 60 mL/min)',
      'Insuficiência hepática grave',
    ],
    advertencias_principais: [
      'Pode causar hipotensão em pacientes com depleção de volume ou sódio',
      'Monitorar função renal e eletrólitos em pacientes com DRC ou IC',
      'Evitar uso concomitante com IECA (risco de hipotensão, hipercalemia, deterioração renal)',
      'Risco de hipercalemia — monitorar potássio sérico',
    ],
    interacoes_principais: [
      'IECA: risco de efeitos adversos graves (hipotensão, hipercalemia, insuficiência renal)',
      'AINE: redução do efeito anti-hipertensivo e risco de IRA',
      'Diuréticos poupadores de potássio / suplementos de potássio: hipercalemia',
      'Lítio: aumento dos níveis séricos de lítio',
    ],
    uso_populacoes_especiais: {
      renal: 'TFG 30-60: usar com cautela. TFG < 30: não recomendado para indicação de nefropatia diabética.',
      hepatico: 'Insuficiência hepática leve-moderada: reduzir dose para 25 mg/dia. Grave: contraindicado.',
      pediatrico: 'Segurança e eficácia estabelecidas para > 6 anos (HAS). Dose: 0,7 mg/kg/dia.',
      gestante: 'Contraindicado no 2º e 3º trimestres. Suspender ao confirmar gravidez.',
      idoso: 'Não é necessário ajuste de dose. Iniciar com doses mais baixas se depleção de volume.',
    },
    data_registro: '2002-08-15',
    data_ultima_atualizacao: '2024-03-20',
    versao_bula: 'v8.0 — Mar/2024',
    fonte_regulatoria: 'ANVISA',
  },

  {
    id: 'euro-enalapril',
    lab_id: 'eurofarma',
    molecula: 'Maleato de Enalapril',
    nome_comercial: 'Enalapril Eurofarma',
    classe_terapeutica: 'IECA — Inibidor da Enzima Conversora de Angiotensina',
    cids_aprovados: ['I10', 'I50', 'I25'],
    apresentacoes: [
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0204.0101.003-1' },
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0204.0101.004-9' },
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0204.0101.005-7' },
    ],
    posologia_aprovada: 'HAS: iniciar 5-10 mg 1x/dia. Manutenção: 10-40 mg/dia (1-2 doses). IC: iniciar 2,5 mg 2x/dia, aumentar progressivamente até 10-20 mg 2x/dia.',
    contraindicacoes_bula: [
      'Hipersensibilidade ao enalapril ou outros IECAs',
      'Histórico de angioedema relacionado a IECA',
      'Gravidez (todos os trimestres)',
      'Uso concomitante com alisquireno em pacientes com DM ou DRC (TFG < 60)',
      'Uso concomitante com sacubitril/valsartana (risco de angioedema)',
    ],
    advertencias_principais: [
      'Tosse seca persistente — efeito adverso de classe, pode requerer troca para BRA',
      'Angioedema — risco aumentado em afro-descendentes',
      'Hipotensão na primeira dose — especialmente em IC ou depleção de volume',
      'Hipercalemia — monitorar potássio em DRC, DM e uso de diuréticos poupadores',
      'Deterioração da função renal em estenose bilateral de artéria renal',
    ],
    interacoes_principais: [
      'BRA / Alisquireno: contraindicado em DM e DRC (duplo bloqueio do SRAA)',
      'AINE: redução do efeito anti-hipertensivo, risco de IRA',
      'Diuréticos poupadores de potássio: hipercalemia',
      'Antidiabéticos (sulfonilureias/insulina): potencialização do efeito hipoglicemiante',
      'Lítio: aumento dos níveis séricos de lítio',
    ],
    uso_populacoes_especiais: {
      renal: 'TFG 30-60: 5 mg/dia. TFG 10-30: 2,5 mg/dia. TFG < 10: não recomendado sem diálise.',
      hepatico: 'Metabolismo hepático — usar com cautela em hepatopatia grave.',
      pediatrico: 'Não aprovado para < 1 ano. > 1 ano: 0,1 mg/kg/dia (máx 0,5 mg/kg/dia).',
      gestante: 'Contraindicado em todos os trimestres. Teratogênico no 2º e 3º trimestres.',
      idoso: 'Iniciar com doses mais baixas. Maior risco de hipotensão.',
    },
    data_registro: '1998-05-12',
    data_ultima_atualizacao: '2024-01-10',
    versao_bula: 'v12.0 — Jan/2024',
    fonte_regulatoria: 'ANVISA',
  },

  {
    id: 'euro-anlodipino',
    lab_id: 'eurofarma',
    molecula: 'Besilato de Anlodipino',
    nome_comercial: 'Anlodipino Eurofarma',
    classe_terapeutica: 'BCC — Bloqueador de Canal de Cálcio Di-hidropiridínico',
    cids_aprovados: ['I10', 'I20'],
    apresentacoes: [
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0204.0315.001-5' },
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0204.0315.002-3' },
    ],
    posologia_aprovada: 'HAS: 5 mg 1x/dia. Dose máxima: 10 mg/dia. Angina: 5-10 mg 1x/dia. Idosos: iniciar com 2,5 mg.',
    contraindicacoes_bula: [
      'Hipersensibilidade ao anlodipino ou di-hidropiridinas',
      'Hipotensão grave (PA sistólica < 90 mmHg)',
      'Choque cardiogênico',
      'IC descompensada grave (exceto IC-FEp em algumas indicações)',
      'Estenose aórtica grave sintomática',
    ],
    advertencias_principais: [
      'Edema periférico — efeito adverso de classe, dose-dependente',
      'Rubor facial e cefaleia — especialmente nas primeiras semanas',
      'Cautela em IC com FE reduzida — preferir outros agentes',
      'Não interromper abruptamente em angina vasoespástica',
    ],
    interacoes_principais: [
      'Ciclosporina/Tacrolimus: aumento dos níveis séricos dos imunossupressores',
      'Sinvastatina: doses de sinvastatina > 20 mg devem ser evitadas',
      'Inibidores CYP3A4 (cetoconazol, claritromicina): aumento dos níveis de anlodipino',
      'Indutores CYP3A4 (rifampicina): redução dos níveis de anlodipino',
    ],
    uso_populacoes_especiais: {
      renal: 'Não requer ajuste — não é dialisável.',
      hepatico: 'Insuficiência hepática: meia-vida prolongada. Iniciar com 2,5 mg.',
      pediatrico: 'Aprovado > 6 anos para HAS: 2,5-5 mg/dia.',
      gestante: 'Categoria C (FDA). Evitar no 1º trimestre. Usar apenas se benefício superar risco.',
      idoso: 'Iniciar com 2,5 mg/dia. Risco aumentado de edema periférico.',
    },
    data_registro: '2003-11-20',
    data_ultima_atualizacao: '2023-09-05',
    versao_bula: 'v7.0 — Set/2023',
    fonte_regulatoria: 'ANVISA',
  },

  {
    id: 'euro-hctz',
    lab_id: 'eurofarma',
    molecula: 'Hidroclorotiazida',
    nome_comercial: 'Hidroclorotiazida Eurofarma',
    classe_terapeutica: 'Diurético Tiazídico',
    cids_aprovados: ['I10', 'R60'],
    apresentacoes: [
      { concentracao: '25 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0204.0089.001-2' },
    ],
    posologia_aprovada: 'HAS: 12,5-25 mg 1x/dia pela manhã. Dose máxima anti-hipertensiva: 25 mg/dia (doses maiores não aumentam eficácia e aumentam efeitos adversos).',
    contraindicacoes_bula: [
      'Anúria',
      'Hipersensibilidade a tiazídicos ou sulfonamidas',
      'Hipocalemia refratária',
      'Hipercalcemia',
      'Gota ativa',
    ],
    advertencias_principais: [
      'Hipocalemia — monitorar potássio sérico, especialmente com digitálicos',
      'Hiperuricemia — pode precipitar gota em predispostos',
      'Hiperglicemia — pode prejudicar controle glicêmico em DM',
      'Fotossensibilidade — orientar uso de protetor solar',
    ],
    interacoes_principais: [
      'Digitálicos: hipocalemia aumenta risco de toxicidade digitálica',
      'Lítio: redução de excreção renal de lítio, risco de toxicidade',
      'AINE: redução do efeito diurético e anti-hipertensivo',
      'Antidiabéticos: efeito hiperglicemiante pode requerer ajuste da dose',
    ],
    uso_populacoes_especiais: {
      renal: 'TFG < 30: ineficaz e não recomendado. Preferir diuréticos de alça.',
      hepatico: 'Cautela em hepatopatia — pode precipitar encefalopatia hepática.',
      pediatrico: 'Uso pediátrico: 1-2 mg/kg/dia (máx 37,5 mg/dia).',
      gestante: 'Evitar no 1º trimestre. Risco de trombocitopenia neonatal.',
      idoso: 'Iniciar com 12,5 mg/dia. Risco de hiponatremia.',
    },
    data_registro: '1995-03-10',
    data_ultima_atualizacao: '2023-06-15',
    versao_bula: 'v10.0 — Jun/2023',
    fonte_regulatoria: 'ANVISA',
  },

  {
    id: 'euro-carvedilol',
    lab_id: 'eurofarma',
    molecula: 'Carvedilol',
    nome_comercial: 'Carvedilol Eurofarma',
    classe_terapeutica: 'Beta-bloqueador não-seletivo com atividade alfa-1 bloqueadora',
    cids_aprovados: ['I10', 'I50', 'I25'],
    apresentacoes: [
      { concentracao: '6,25 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0204.0198.001-7' },
      { concentracao: '12,5 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0204.0198.002-5' },
      { concentracao: '25 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0204.0198.003-3' },
    ],
    posologia_aprovada: 'IC-FEr: iniciar 3,125 mg 2x/dia com alimento. Duplicar dose a cada 2 semanas até máx 25 mg 2x/dia (< 85 kg) ou 50 mg 2x/dia (> 85 kg). HAS: 12,5-25 mg 1-2x/dia.',
    contraindicacoes_bula: [
      'Asma brônquica ativa ou doença pulmonar obstrutiva grave',
      'Bloqueio AV 2º/3º grau sem marcapasso',
      'Bradicardia sintomática (FC < 50 bpm)',
      'Choque cardiogênico',
      'IC descompensada requerendo inotrópicos IV',
    ],
    advertencias_principais: [
      'Não suspender abruptamente — risco de angina instável e IAM em cardiopatas',
      'Mascaramento dos sintomas de hipoglicemia em diabéticos',
      'Piora de insuficiência arterial periférica',
      'Bradicardia e bloqueio AV — monitorar FC e ECG',
    ],
    interacoes_principais: [
      'Verapamil/Diltiazem IV: risco de bradicardia grave e bloqueio AV',
      'Insulina/Antidiabéticos: mascaramento dos sintomas de hipoglicemia',
      'Clonidina: risco de hipertensão rebote ao suspender clonidina',
      'Rifampicina: redução dos níveis de carvedilol em ~70%',
      'Digoxina: aumento dos níveis séricos de digoxina',
    ],
    uso_populacoes_especiais: {
      renal: 'Não requer ajuste (metabolismo hepático).',
      hepatico: 'Contraindicado em insuficiência hepática grave.',
      pediatrico: 'Dados insuficientes para uso pediátrico.',
      gestante: 'Categoria C. Usar apenas se benefício superar risco.',
      idoso: 'Não requer ajuste específico. Monitorar PA e FC.',
    },
    data_registro: '2001-07-22',
    data_ultima_atualizacao: '2024-02-14',
    versao_bula: 'v9.0 — Fev/2024',
    fonte_regulatoria: 'ANVISA',
  },

  // ═══ INSUFICIÊNCIA CARDÍACA (I50) ════════════════════════════

  {
    id: 'euro-espironolactona',
    lab_id: 'eurofarma',
    molecula: 'Espironolactona',
    nome_comercial: 'Espironolactona Eurofarma',
    classe_terapeutica: 'Antagonista da Aldosterona (ARM)',
    cids_aprovados: ['I50', 'I10', 'K74'],
    apresentacoes: [
      { concentracao: '25 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0204.0072.001-0' },
      { concentracao: '50 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0204.0072.002-8' },
      { concentracao: '100 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0204.0072.003-6' },
    ],
    posologia_aprovada: 'IC-FEr (NYHA II-IV): 25-50 mg 1x/dia. Iniciar com 25 mg/dia. HAS resistente: 25-50 mg/dia. Hiperaldosteronismo: 100-400 mg/dia.',
    contraindicacoes_bula: [
      'Hipercalemia (K+ > 5,5 mEq/L)',
      'Insuficiência renal grave (TFG < 30)',
      'Doença de Addison',
      'Uso concomitante com outros diuréticos poupadores de potássio',
    ],
    advertencias_principais: [
      'Hipercalemia — risco aumentado com IECA, BRA, TFG reduzida, DM',
      'Ginecomastia — efeito antiandrogênico, dose-dependente',
      'Monitorar função renal e eletrólitos após início e ajustes de dose',
    ],
    interacoes_principais: [
      'IECA/BRA: risco significativo de hipercalemia',
      'AINE: redução do efeito diurético e risco de hipercalemia',
      'Digoxina: espironolactona pode aumentar meia-vida da digoxina',
      'Lítio: redução da excreção de lítio',
    ],
    uso_populacoes_especiais: {
      renal: 'TFG 30-60: usar com cautela, monitorar K+. TFG < 30: contraindicado.',
      hepatico: 'Pode ser usado em cirrose (ascite refratária). Monitorar encefalopatia.',
      gestante: 'Evitar — efeito antiandrogênico pode afetar feto masculino.',
      idoso: 'Maior risco de hipercalemia e deterioração renal. Iniciar com 12,5-25 mg.',
    },
    data_registro: '1997-09-30',
    data_ultima_atualizacao: '2024-01-05',
    versao_bula: 'v11.0 — Jan/2024',
    fonte_regulatoria: 'ANVISA',
  },

  {
    id: 'euro-furosemida',
    lab_id: 'eurofarma',
    molecula: 'Furosemida',
    nome_comercial: 'Furosemida Eurofarma',
    classe_terapeutica: 'Diurético de Alça',
    cids_aprovados: ['I50', 'I10', 'N18', 'R60'],
    apresentacoes: [
      { concentracao: '40 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0204.0065.001-4' },
      { concentracao: '10 mg/mL', forma_farmaceutica: 'solucao_oral', embalagem: 'Frasco 20 mL', registro_anvisa: '1.0204.0065.002-2' },
    ],
    posologia_aprovada: 'IC com congestão: 20-80 mg/dia VO (titular conforme sintomas e peso). Edema: 40-80 mg/dia. Máximo: 600 mg/dia em casos refratários.',
    contraindicacoes_bula: [
      'Anúria',
      'Hipersensibilidade a furosemida ou sulfonamidas',
      'Hipocalemia ou hiponatremia graves não corrigidas',
      'Coma hepático',
    ],
    advertencias_principais: [
      'Hipocalemia — monitorar eletrólitos regularmente',
      'Desidratação e hipovolemia — ajustar dose em congestão residual',
      'Ototoxicidade (doses altas ou uso com aminoglicosídeos)',
    ],
    interacoes_principais: [
      'Aminoglicosídeos: risco de ototoxicidade e nefrotoxicidade',
      'Digitálicos: hipocalemia aumenta toxicidade digitálica',
      'AINE: redução do efeito diurético',
      'Lítio: aumento dos níveis séricos de lítio',
    ],
    uso_populacoes_especiais: {
      renal: 'Pode ser usado em TFG < 30 — diurético de alça é mais eficaz que tiazídicos na DRC.',
      hepatico: 'Cautela — risco de encefalopatia hepática. Monitorar eletrólitos.',
      gestante: 'Evitar, especialmente no 1º trimestre.',
      idoso: 'Iniciar com doses menores. Maior risco de hipovolemia e quedas.',
    },
    data_registro: '1993-04-18',
    data_ultima_atualizacao: '2023-08-20',
    versao_bula: 'v13.0 — Ago/2023',
    fonte_regulatoria: 'ANVISA',
  },

  // ═══ DIABETES MELLITUS TIPO 2 (E11) ═════════════════════════

  {
    id: 'euro-metformina',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Metformina',
    nome_comercial: 'Metformina Eurofarma',
    classe_terapeutica: 'Biguanida — Antidiabético Oral',
    cids_aprovados: ['E11', 'E14'],
    apresentacoes: [
      { concentracao: '500 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0204.0183.001-9' },
      { concentracao: '850 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0204.0183.002-7' },
      { concentracao: '1000 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0204.0183.003-5' },
    ],
    posologia_aprovada: 'Iniciar: 500 mg 2x/dia ou 850 mg 1x/dia com refeições. Titular a cada 1-2 semanas. Dose usual: 1500-2000 mg/dia. Dose máxima: 3000 mg/dia.',
    contraindicacoes_bula: [
      'TFG < 30 mL/min/1,73m²',
      'Acidose metabólica aguda ou crônica (inclui cetoacidose diabética)',
      'Insuficiência hepática',
      'Insuficiência cardíaca aguda ou crônica com instabilidade hemodinâmica',
      'Uso de contraste iodado IV (suspender 48h antes e retomar após 48h)',
    ],
    advertencias_principais: [
      'Acidose lática — risco raro mas grave, principalmente em IR, IH, insuficiência respiratória',
      'Deficiência de vitamina B12 — avaliar periodicamente com uso prolongado',
      'Suspender antes de cirurgias com anestesia geral',
      'Não usar em alcoolismo grave',
    ],
    interacoes_principais: [
      'Contraste iodado: risco de acidose lática — suspender 48h antes',
      'Álcool: potencializa risco de acidose lática',
      'Furosemida: pode aumentar os níveis plasmáticos de metformina',
      'Cimetidina: inibição da secreção tubular renal de metformina',
    ],
    uso_populacoes_especiais: {
      renal: 'TFG 45-60: usar com cautela, monitorar. TFG 30-45: reduzir dose. TFG < 30: contraindicado.',
      hepatico: 'Contraindicado em insuficiência hepática (qualquer grau).',
      pediatrico: 'Aprovado > 10 anos: 500-1000 mg/dia, ajustar até 2000 mg/dia.',
      gestante: 'Não recomendado como primeira linha. Insulina preferida durante gestação.',
      idoso: 'Monitorar função renal regularmente. Não contraindicado por idade se TFG adequada.',
    },
    data_registro: '2000-06-25',
    data_ultima_atualizacao: '2024-04-10',
    versao_bula: 'v14.0 — Abr/2024',
    fonte_regulatoria: 'ANVISA',
  },

  {
    id: 'euro-glibenclamida',
    lab_id: 'eurofarma',
    molecula: 'Glibenclamida',
    nome_comercial: 'Glibenclamida Eurofarma',
    classe_terapeutica: 'Sulfonilureia — Secretagogo de Insulina',
    cids_aprovados: ['E11'],
    apresentacoes: [
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0204.0077.001-8' },
    ],
    posologia_aprovada: 'Iniciar: 2,5 mg/dia com café da manhã. Ajustar semanalmente. Dose usual: 5-10 mg/dia. Dose máxima: 20 mg/dia.',
    contraindicacoes_bula: [
      'DM tipo 1',
      'Cetoacidose diabética',
      'Insuficiência renal ou hepática grave',
      'Hipersensibilidade a sulfonilureias ou sulfonamidas',
      'Porfiria',
    ],
    advertencias_principais: [
      'Hipoglicemia — risco maior em idosos, IR, dieta irregular ou exercício intenso',
      'Evitar em idosos com TFG < 60 — preferir outros antidiabéticos com menor risco de hipoglicemia',
      'Ganho de peso — efeito de classe',
    ],
    interacoes_principais: [
      'IECA/AINEs/Fluconazol: potencializam efeito hipoglicemiante',
      'Rifampicina/Corticosteroides: reduzem efeito hipoglicemiante',
      'Álcool: potencializa hipoglicemia',
      'Beta-bloqueadores: mascaram sintomas de hipoglicemia',
    ],
    uso_populacoes_especiais: {
      renal: 'Evitar se TFG < 60. Contraindicado se TFG < 30.',
      hepatico: 'Contraindicado em insuficiência hepática grave.',
      gestante: 'Contraindicado — insulina é a escolha na gestação.',
      idoso: 'Evitar — alto risco de hipoglicemia prolongada e grave.',
    },
    data_registro: '1996-02-14',
    data_ultima_atualizacao: '2023-11-30',
    versao_bula: 'v8.0 — Nov/2023',
    fonte_regulatoria: 'ANVISA',
  },

  // ═══ PNEUMONIA / INFECÇÕES (J18, J06) ════════════════════════

  {
    id: 'euro-amoxicilina',
    lab_id: 'eurofarma',
    molecula: 'Amoxicilina Tri-hidratada',
    nome_comercial: 'Amoxicilina Eurofarma',
    classe_terapeutica: 'Penicilina de Amplo Espectro — Antibacteriano',
    cids_aprovados: ['J18', 'J06', 'J02', 'H66', 'K04'],
    apresentacoes: [
      { concentracao: '500 mg', forma_farmaceutica: 'capsula', embalagem: '21 cápsulas', registro_anvisa: '1.0204.0110.001-6' },
      { concentracao: '875 mg', forma_farmaceutica: 'comprimido', embalagem: '14 comprimidos', registro_anvisa: '1.0204.0110.002-4' },
      { concentracao: '250 mg/5 mL', forma_farmaceutica: 'suspensao_oral', embalagem: 'Frasco 150 mL', registro_anvisa: '1.0204.0110.003-2' },
    ],
    posologia_aprovada: 'PAC leve em adultos: 875 mg 2x/dia por 5-7 dias. Infecções leves: 500 mg 3x/dia. Crianças: 40-90 mg/kg/dia divididos em 2-3 doses.',
    contraindicacoes_bula: [
      'Hipersensibilidade a penicilinas ou cefalosporinas',
      'Histórico de reação anafilática a beta-lactâmicos',
      'Mononucleose infecciosa (risco de exantema)',
    ],
    advertencias_principais: [
      'Reações alérgicas — desde urticária até anafilaxia grave',
      'Colite pseudomembranosa por Clostridioides difficile',
      'Superinfecção fúngica em tratamentos prolongados',
      'Exantema maculopapular em portadores de mononucleose',
    ],
    interacoes_principais: [
      'Anticoagulantes orais (varfarina): potencialização do efeito anticoagulante',
      'Metotrexato: aumento da toxicidade do metotrexato',
      'Probenecida: aumento dos níveis séricos de amoxicilina',
      'Anticoncepcionais orais: pode reduzir eficácia (relevância clínica controversa)',
    ],
    uso_populacoes_especiais: {
      renal: 'TFG 10-30: 500 mg 2x/dia. TFG < 10: 500 mg 1x/dia.',
      hepatico: 'Usar com cautela em hepatopatia grave.',
      pediatrico: 'Crianças ≥ 3 meses: 40-90 mg/kg/dia. Neonatos: 30 mg/kg/dia.',
      gestante: 'Categoria B — considerado seguro. Usar se necessário.',
      idoso: 'Não requer ajuste se função renal preservada.',
    },
    data_registro: '1994-08-05',
    data_ultima_atualizacao: '2023-07-12',
    versao_bula: 'v11.0 — Jul/2023',
    fonte_regulatoria: 'ANVISA',
  },

  {
    id: 'euro-azitromicina',
    lab_id: 'eurofarma',
    molecula: 'Azitromicina Di-hidratada',
    nome_comercial: 'Azitromicina Eurofarma',
    classe_terapeutica: 'Macrolídeo — Antibacteriano',
    cids_aprovados: ['J18', 'J06', 'J20', 'J42'],
    apresentacoes: [
      { concentracao: '500 mg', forma_farmaceutica: 'comprimido', embalagem: '3 comprimidos', registro_anvisa: '1.0204.0205.001-3' },
      { concentracao: '500 mg', forma_farmaceutica: 'comprimido', embalagem: '5 comprimidos', registro_anvisa: '1.0204.0205.002-1' },
      { concentracao: '600 mg/15 mL', forma_farmaceutica: 'suspensao_oral', embalagem: 'Frasco 15 mL', registro_anvisa: '1.0204.0205.003-9' },
    ],
    posologia_aprovada: 'PAC (atípicos): 500 mg 1x/dia por 3-5 dias. PAC em combinação: 500 mg 1x/dia por 3-5 dias (associar a beta-lactâmico). Crianças: 10 mg/kg/dia por 3 dias.',
    contraindicacoes_bula: [
      'Hipersensibilidade a azitromicina ou macrolídeos',
      'Arritmias cardíacas graves ou prolongamento do QT',
      'Uso concomitante com derivados do ergot',
    ],
    advertencias_principais: [
      'Prolongamento do intervalo QT — monitorar ECG em predispostos',
      'Hepatotoxicidade — suspender se sintomas de disfunção hepática',
      'Colite pseudomembranosa por C. difficile',
      'Resistência crescente de Streptococcus pneumoniae — avaliar epidemiologia local',
    ],
    interacoes_principais: [
      'Varfarina: aumento do efeito anticoagulante',
      'Digoxina: aumento dos níveis séricos de digoxina',
      'Estatinas (metabolizadas por CYP3A4): risco de miopatia',
      'Amiodarona/Antiarrítmicos Classe IA e III: risco de prolongamento QT',
    ],
    uso_populacoes_especiais: {
      renal: 'TFG > 10: sem ajuste. TFG < 10: usar com cautela.',
      hepatico: 'Contraindicado em insuficiência hepática grave.',
      pediatrico: 'Crianças > 6 meses: 10 mg/kg/dia por 3 dias ou 10 mg/kg no D1, 5 mg/kg D2-5.',
      gestante: 'Categoria B. Usar se necessário.',
      idoso: 'Não requer ajuste. Monitorar QT em cardiopatas.',
    },
    data_registro: '2001-12-10',
    data_ultima_atualizacao: '2024-02-28',
    versao_bula: 'v10.0 — Fev/2024',
    fonte_regulatoria: 'ANVISA',
  },

  // ═══ ASMA (J45) ══════════════════════════════════════════════

  {
    id: 'euro-busonid',
    lab_id: 'eurofarma',
    molecula: 'Budesonida',
    nome_comercial: 'Busonid®',
    classe_terapeutica: 'Corticosteroide Inalatório (ICS)',
    cids_aprovados: ['J45', 'J44'],
    apresentacoes: [
      { concentracao: '200 mcg/dose', forma_farmaceutica: 'inalatorio', embalagem: '200 doses', registro_anvisa: '1.0204.0288.001-1' },
      { concentracao: '400 mcg/dose', forma_farmaceutica: 'inalatorio', embalagem: '200 doses', registro_anvisa: '1.0204.0288.002-9' },
    ],
    posologia_aprovada: 'Asma leve-moderada: 200-400 mcg 2x/dia. Asma grave: 800-1600 mcg/dia divididos em 2-4 doses. DPOC: 400 mcg 2x/dia (se asma overlap). Lavar a boca após cada uso.',
    contraindicacoes_bula: [
      'Hipersensibilidade à budesonida ou excipientes',
      'Tratamento do broncoespasmo agudo (não é broncodilatador)',
    ],
    advertencias_principais: [
      'Candidíase orofaríngea — orientar higiene bucal após uso',
      'Supressão do eixo HHA em doses altas por tempo prolongado',
      'Não suspender abruptamente após uso prolongado de doses altas',
      'Pneumonia em DPOC — risco aumentado de pneumonia com ICS',
    ],
    interacoes_principais: [
      'Cetoconazol/Itraconazol (CYP3A4): aumento significativo dos níveis sistêmicos de budesonida',
      'Ritonavir: contraindicado — inibição de CYP3A4 pode causar síndrome de Cushing iatrogênico',
    ],
    uso_populacoes_especiais: {
      renal: 'Sem ajuste necessário.',
      hepatico: 'Hepatopatia grave: monitorar para efeitos sistêmicos aumentados.',
      pediatrico: 'Crianças > 6 anos: 100-400 mcg/dia. < 6 anos: 100-200 mcg/dia.',
      gestante: 'Categoria B. Considerado seguro — benefício supera risco.',
      idoso: 'Sem ajuste. Monitorar densidade óssea com uso prolongado.',
    },
    data_registro: '2005-03-22',
    data_ultima_atualizacao: '2024-05-01',
    versao_bula: 'v6.0 — Mai/2024',
    fonte_regulatoria: 'ANVISA',
  },

  {
    id: 'euro-formoterol',
    lab_id: 'eurofarma',
    molecula: 'Fumarato de Formoterol Di-hidratado',
    nome_comercial: 'Formoterol Eurofarma',
    classe_terapeutica: 'Beta-2-agonista de Longa Ação (LABA)',
    cids_aprovados: ['J45', 'J44'],
    apresentacoes: [
      { concentracao: '12 mcg/dose', forma_farmaceutica: 'inalatorio', embalagem: '60 doses', registro_anvisa: '1.0204.0301.001-5' },
    ],
    posologia_aprovada: 'Asma (manutenção, sempre associado a ICS): 12 mcg 2x/dia. Não usar como monoterapia em asma. DPOC: 12 mcg 2x/dia.',
    contraindicacoes_bula: [
      'Monoterapia em asma (sem corticosteroide inalatório concomitante)',
      'Hipersensibilidade a formoterol ou lactose',
      'Broncoespasmo agudo como único agente',
    ],
    advertencias_principais: [
      'NUNCA usar como monoterapia em asma — aumenta mortalidade (LABA warning FDA)',
      'Sempre associar a ICS em asma',
      'Hipocalemia — especialmente com diuréticos',
      'Taquicardia e tremores — efeitos beta-2 adrenérgicos',
    ],
    interacoes_principais: [
      'Beta-bloqueadores não seletivos: antagonismo do efeito broncodilatador',
      'Diuréticos/Corticosteroides: potencializam hipocalemia',
      'IMAOs/Antidepressivos tricíclicos: risco de efeitos cardiovasculares',
      'Halogenados (anestésicos): risco de arritmias',
    ],
    uso_populacoes_especiais: {
      renal: 'Sem ajuste necessário.',
      hepatico: 'Usar com cautela em hepatopatia grave.',
      pediatrico: 'Aprovado > 5 anos: 12 mcg 2x/dia (sempre com ICS).',
      gestante: 'Evitar especialmente no 1º trimestre. Usar se necessário.',
      idoso: 'Sem ajuste. Monitorar efeitos cardiovasculares.',
    },
    data_registro: '2007-09-14',
    data_ultima_atualizacao: '2023-12-08',
    versao_bula: 'v5.0 — Dez/2023',
    fonte_regulatoria: 'ANVISA',
  },
];

// ─── FUNÇÕES UTILITÁRIAS ──────────────────────────────────────

export function getProductsByMolecule(
  molecula: string,
  labId?: string,
): ProdutoComercial[] {
  const all = EUROFARMA_PRODUCTS; // expandir com outros labs quando ativos
  const normalized = molecula.toLowerCase();
  return all.filter(p => {
    const matchMol = p.molecula.toLowerCase().includes(normalized) ||
      normalized.includes(p.molecula.toLowerCase().split(' ')[0].toLowerCase());
    const matchLab = !labId || p.lab_id === labId;
    return matchMol && matchLab;
  });
}

export function getProductsByCid(cid10: string, labId?: string): ProdutoComercial[] {
  const all = EUROFARMA_PRODUCTS;
  return all.filter(p => {
    const matchCid = p.cids_aprovados.some(c => c.startsWith(cid10.substring(0, 3)));
    const matchLab = !labId || p.lab_id === labId;
    return matchCid && matchLab;
  });
}

export function getProductById(id: string): ProdutoComercial | undefined {
  return EUROFARMA_PRODUCTS.find(p => p.id === id);
}

export function getActiveLabProducts(): ProdutoComercial[] {
  const activeLabIds = Object.values(LABS)
    .filter(l => l.ativo)
    .map(l => l.id);
  return EUROFARMA_PRODUCTS.filter(p => activeLabIds.includes(p.lab_id));
}
