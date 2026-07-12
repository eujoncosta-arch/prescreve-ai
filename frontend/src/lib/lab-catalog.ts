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
  gsk: {
    id: 'gsk',
    nome: 'GlaxoSmithKline Brasil Ltda.',
    cnpj: '33.247.743/0001-10',
    site: 'https://gsk.com.br',
    portfolio_sync_date: '',
    portfolio_version: '',
    ativo: false,
  },
  ems: {
    id: 'ems',
    nome: 'EMS S.A.',
    cnpj: '57.507.378/0001-01',
    site: 'https://ems.com.br',
    portfolio_sync_date: '2026-01-15',
    portfolio_version: '2026.1',
    ativo: true,
  },
  sanofi: {
    id: 'sanofi',
    nome: 'Sanofi-Aventis Farmacêutica Ltda.',
    cnpj: '02.685.377/0001-79',
    site: 'https://sanofi.com.br',
    portfolio_sync_date: '2026-01-15',
    portfolio_version: '2026.1',
    ativo: true,
  },
  novo_nordisk: {
    id: 'novo_nordisk',
    nome: 'Novo Nordisk Farmacêutica do Brasil Ltda.',
    cnpj: '44.066.699/0001-15',
    site: 'https://novonordisk.com.br',
    portfolio_sync_date: '2026-01-15',
    portfolio_version: '2026.1',
    ativo: true,
  },
  astrazeneca: {
    id: 'astrazeneca',
    nome: 'AstraZeneca do Brasil Ltda.',
    cnpj: '60.643.809/0001-93',
    site: 'https://astrazeneca.com.br',
    portfolio_sync_date: '2026-01-15',
    portfolio_version: '2026.1',
    ativo: true,
  },
  bayer: {
    id: 'bayer',
    nome: 'Bayer S.A.',
    cnpj: '18.459.628/0001-15',
    site: 'https://bayer.com.br',
    portfolio_sync_date: '2026-01-15',
    portfolio_version: '2026.1',
    ativo: true,
  },
  bms: {
    id: 'bms',
    nome: 'Bristol-Myers Squibb Farmacêutica S.A.',
    cnpj: '56.998.982/0001-07',
    site: 'https://bms.com/br',
    portfolio_sync_date: '2026-01-15',
    portfolio_version: '2026.1',
    ativo: true,
  },
  boehringer: {
    id: 'boehringer',
    nome: 'Boehringer Ingelheim do Brasil Química e Farmacêutica Ltda.',
    cnpj: '60.427.180/0001-10',
    site: 'https://boehringer-ingelheim.com.br',
    portfolio_sync_date: '2026-01-15',
    portfolio_version: '2026.1',
    ativo: true,
  },
  novartis: {
    id: 'novartis',
    nome: 'Novartis Biociências S.A.',
    cnpj: '56.994.502/0001-30',
    site: 'https://novartis.com.br',
    portfolio_sync_date: '2026-01-15',
    portfolio_version: '2026.1',
    ativo: true,
  },
  msd: {
    id: 'msd',
    nome: 'MSD Brasil - Merck Sharp & Dohme Farmacêutica Ltda.',
    cnpj: '00.246.816/0001-08',
    site: 'https://msd.com.br',
    portfolio_sync_date: '2026-01-15',
    portfolio_version: '2026.1',
    ativo: true,
  },
  eli_lilly: {
    id: 'eli_lilly',
    nome: 'Eli Lilly do Brasil Ltda.',
    cnpj: '60.229.611/0001-80',
    site: 'https://lilly.com.br',
    portfolio_sync_date: '2026-01-15',
    portfolio_version: '2026.1',
    ativo: true,
  },
  ache: {
    id: 'ache',
    nome: 'Aché Laboratórios Farmacêuticos S.A.',
    cnpj: '60.659.463/0001-91',
    site: 'https://ache.com.br',
    portfolio_sync_date: '2026-01-15',
    portfolio_version: '2026.1',
    ativo: true,
  },
  roche: {
    id: 'roche',
    nome: 'Produtos Roche Químicos e Farmacêuticos S.A.',
    cnpj: '33.009.945/0001-27',
    site: 'https://roche.com.br',
    portfolio_sync_date: '2026-01-15',
    portfolio_version: '2026.1',
    ativo: true,
  },
  pfizer: {
    id: 'pfizer',
    nome: 'Pfizer Brasil Ltda.',
    cnpj: '46.070.868/0001-69',
    site: 'https://pfizer.com.br',
    portfolio_sync_date: '2026-01-15',
    portfolio_version: '2026.1',
    ativo: true,
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
    nome_comercial: 'Metformina',
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

// ═══════════════════════════════════════════════════════════════
// CATÁLOGOS POR LABORATÓRIO
// ═══════════════════════════════════════════════════════════════

// ─── EMS — Genéricos e Similares ──────────────────────────────
export const EMS_PRODUCTS: ProdutoComercial[] = [
  {
    id: 'ems-clopidogrel-75',
    lab_id: 'ems',
    molecula: 'Bissulfato de Clopidogrel',
    nome_comercial: 'Clopidogrel EMS',
    classe_terapeutica: 'Antiplaquetário — Inibidor do receptor P2Y12',
    cids_aprovados: ['I25', 'I21', 'I63', 'Z95'],
    apresentacoes: [
      { concentracao: '75 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0080.0551.001-6' },
    ],
    posologia_aprovada: 'SCA/IAM: 75 mg 1x/dia (manutenção após dose de ataque). AVC isquêmico: 75 mg 1x/dia. Sempre associar a AAS 100 mg em SCA.',
    contraindicacoes_bula: ['Hipersensibilidade ao clopidogrel', 'Sangramento ativo (úlcera péptica, hemorragia intracraniana)', 'Insuficiência hepática grave'],
    advertencias_principais: ['Risco de sangramento aumentado com AAS, AINEs, anticoagulantes', 'CYP2C19 — metabolizadores lentos têm resposta reduzida (IBP interagem)', 'Suspender 5-7 dias antes de cirurgia eletiva'],
    interacoes_principais: ['AAS: dupla antiagregação indicada em SCA, risco GI aumentado — associar IBP', 'Omeprazol/Esomeprazol: reduzem ativação via CYP2C19 — preferir pantoprazol', 'Varfarina: risco hemorrágico aumentado — monitorar INR'],
    uso_populacoes_especiais: { renal: 'Sem ajuste necessário.', hepatico: 'Contraindicado em insuficiência hepática grave.', gestante: 'Evitar — dados insuficientes.', idoso: 'Sem ajuste específico. Monitorar sangramento.' },
    data_registro: '2008-05-14',
    data_ultima_atualizacao: '2024-09-01',
    versao_bula: 'v6.0',
    fonte_regulatoria: 'ANVISA',
  },
  {
    id: 'ems-metformina-500',
    lab_id: 'ems',
    molecula: 'Cloridrato de Metformina',
    nome_comercial: 'Metformina EMS',
    classe_terapeutica: 'Biguanida — Antidiabético Oral',
    cids_aprovados: ['E11', 'E14'],
    apresentacoes: [
      { concentracao: '500 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0080.0432.001-2' },
      { concentracao: '850 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0080.0432.002-0' },
      { concentracao: '1000 mg', forma_farmaceutica: 'comprimido_liberacao_prolongada', embalagem: '30 comprimidos', registro_anvisa: '1.0080.0432.003-8' },
    ],
    posologia_aprovada: 'Iniciar 500 mg 2x/dia com refeições. Titular em 1-2 semanas. Dose usual: 1500-2000 mg/dia. Máximo: 3000 mg/dia.',
    contraindicacoes_bula: ['TFG < 30', 'Acidose metabólica', 'Insuficiência hepática', 'Contraste iodado IV (suspender 48h antes)'],
    advertencias_principais: ['Acidose lática — risco raro', 'Deficiência vitamina B12 com uso prolongado', 'Suspender antes de cirurgias maiores'],
    interacoes_principais: ['Contraste iodado: suspender 48h antes', 'Álcool: risco de acidose lática'],
    uso_populacoes_especiais: { renal: 'TFG 45-60: cautela. TFG 30-45: reduzir. TFG < 30: contraindicado.', gestante: 'Não recomendado — preferir insulina.', idoso: 'Monitorar função renal.' },
    data_registro: '2005-03-10',
    data_ultima_atualizacao: '2024-06-15',
    versao_bula: 'v9.0',
    fonte_regulatoria: 'ANVISA',
  },
  {
    id: 'ems-losartana-50',
    lab_id: 'ems',
    molecula: 'Losartana Potássica',
    nome_comercial: 'Losartana EMS',
    classe_terapeutica: 'BRA — Bloqueador do Receptor de Angiotensina II',
    cids_aprovados: ['I10', 'I50', 'N18'],
    apresentacoes: [
      { concentracao: '50 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0080.0388.001-8' },
      { concentracao: '100 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0080.0388.002-6' },
    ],
    posologia_aprovada: 'HAS: 50 mg 1x/dia. Máximo 100 mg/dia. Nefropatia diabética: 50-100 mg/dia.',
    contraindicacoes_bula: ['Gravidez 2º-3º trimestres', 'Hipersensibilidade'],
    advertencias_principais: ['Monitorar K+ e função renal', 'Não associar com IECA ou alisquireno'],
    interacoes_principais: ['IECA: duplo SRAA — contraindicado', 'Espironolactona: hipercalemia'],
    uso_populacoes_especiais: { renal: 'Sem ajuste. TFG < 30: cautela.', gestante: 'Contraindicado 2º-3º tri.', idoso: 'Sem ajuste.' },
    data_registro: '2003-11-20',
    data_ultima_atualizacao: '2024-04-10',
    versao_bula: 'v8.0',
    fonte_regulatoria: 'ANVISA',
  },
  {
    id: 'ems-omeprazol-20',
    lab_id: 'ems',
    molecula: 'Omeprazol',
    nome_comercial: 'Omeprazol EMS',
    classe_terapeutica: 'Inibidor da Bomba de Prótons (IBP)',
    cids_aprovados: ['K21', 'K25', 'K27', 'K29'],
    apresentacoes: [
      { concentracao: '20 mg', forma_farmaceutica: 'capsula', embalagem: '28 cápsulas', registro_anvisa: '1.0080.0299.001-4' },
      { concentracao: '40 mg', forma_farmaceutica: 'capsula', embalagem: '28 cápsulas', registro_anvisa: '1.0080.0299.002-2' },
    ],
    posologia_aprovada: 'DRGE: 20 mg 1x/dia antes do café, por 4-8 semanas. Úlcera péptica: 20-40 mg 1x/dia. H. pylori: 20 mg 2x/dia (em esquema triplo).',
    contraindicacoes_bula: ['Hipersensibilidade a IBP ou benzimidazóis', 'Uso com nelfinavir'],
    advertencias_principais: ['Uso prolongado: risco de hipomagnesemia, fraturas, C. difficile', 'CYP2C19: interação com clopidogrel — preferir pantoprazol em coronariopatas'],
    interacoes_principais: ['Clopidogrel: reduz ativação — preferir pantoprazol', 'Metotrexato: aumento de toxicidade', 'Citalopram/Escitalopram: pode aumentar concentrações'],
    uso_populacoes_especiais: { renal: 'Sem ajuste.', gestante: 'Categoria C. Usar se necessário.', idoso: 'Sem ajuste. Risco de fraturas com uso prolongado.' },
    data_registro: '2001-07-15',
    data_ultima_atualizacao: '2024-03-20',
    versao_bula: 'v10.0',
    fonte_regulatoria: 'ANVISA',
  },
];

// ─── SANOFI ────────────────────────────────────────────────────
export const SANOFI_PRODUCTS: ProdutoComercial[] = [
  {
    id: 'sanofi-plavix-75',
    lab_id: 'sanofi',
    molecula: 'Bissulfato de Clopidogrel',
    nome_comercial: 'Plavix®',
    classe_terapeutica: 'Antiplaquetário — Inibidor do receptor P2Y12',
    cids_aprovados: ['I25', 'I21', 'I63', 'Z95'],
    apresentacoes: [
      { concentracao: '75 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos', registro_anvisa: '1.0113.0069.001-0' },
      { concentracao: '300 mg', forma_farmaceutica: 'comprimido', embalagem: '1 comprimido (dose de ataque)', registro_anvisa: '1.0113.0069.002-8' },
    ],
    posologia_aprovada: 'SCA sem supradesnivelamento: dose de ataque 300 mg, manutenção 75 mg/dia + AAS 75-100 mg/dia. IAM com supradesnivelamento: 300 mg ataque (< 75 anos), 75 mg/dia manutenção por 12 meses. AVC/AIT: 75 mg/dia.',
    contraindicacoes_bula: ['Hipersensibilidade ao clopidogrel', 'Sangramento ativo (úlcera péptica, hemorragia intracraniana)', 'Insuficiência hepática grave (Child-Pugh C)'],
    advertencias_principais: ['CYP2C19 Poor Metabolizers: eficácia reduzida — considerar ticagrelor ou prasugrel', 'Omeprazol/Esomeprazol: inibem ativação — preferir pantoprazol', 'Suspender 5-7 dias antes de cirurgia eletiva', 'TTP (trombocitopenia trombótica trombocitopênica): raro mas grave'],
    interacoes_principais: ['AAS: dupla antiagregação em SCA/stent', 'Omeprazol/Esomeprazol: redução de ~40% da ativação (CYP2C19)', 'Varfarina/DOACs: risco hemorrágico aditivo', 'AINEs: risco hemorrágico GI'],
    uso_populacoes_especiais: { renal: 'Sem ajuste.', hepatico: 'Contraindicado em IH grave.', gestante: 'Evitar — dados insuficientes.', idoso: 'Sem ajuste. Monitorar sangramento.' },
    data_registro: '1999-04-22',
    data_ultima_atualizacao: '2025-01-15',
    versao_bula: 'v15.0 — Jan/2025',
    fonte_regulatoria: 'ANVISA',
    link_bula_profissional: 'https://www.sanofi.com.br/bulas/plavix-profissional.pdf',
    link_bula_paciente: 'https://www.sanofi.com.br/bulas/plavix-paciente.pdf',
  },
  {
    id: 'sanofi-lantus-100',
    lab_id: 'sanofi',
    molecula: 'Insulina Glargina',
    nome_comercial: 'Lantus®',
    classe_terapeutica: 'Insulina de Ação Prolongada (Análogo basal)',
    cids_aprovados: ['E10', 'E11', 'E13', 'E14'],
    apresentacoes: [
      { concentracao: '100 UI/mL', forma_farmaceutica: 'solucao_injetavel', embalagem: 'Frasco 10 mL', registro_anvisa: '1.0113.0098.001-4' },
      { concentracao: '100 UI/mL', forma_farmaceutica: 'solucao_injetavel', embalagem: 'SoloStar caneta pré-preenchida 3 mL × 5', registro_anvisa: '1.0113.0098.002-2' },
    ],
    posologia_aprovada: 'DM1 e DM2: iniciar 0,2 UI/kg/dia SC 1x/dia (noite). DM2 em insulinização: iniciar 10 UI/dia ao deitar, titular 2 UI a cada 3 dias até glicemia jejum 80-130 mg/dL.',
    contraindicacoes_bula: ['Hipoglicemia em andamento', 'Hipersensibilidade à insulina glargina'],
    advertencias_principais: ['Hipoglicemia — ajustar dose em jejum, exercício, dieta irregular', 'Não misturar com outras insulinas na mesma seringa (precipitação)', 'Monitorar K+ — insulina causa hipocalemia em alta dose', 'Lipodistrofia no local de aplicação — rodízio obrigatório'],
    interacoes_principais: ['Beta-bloqueadores: mascaram sintomas de hipoglicemia', 'Corticosteroides: aumentam necessidade de insulina', 'IECA/ARA-II: potencializam efeito hipoglicemiante', 'Álcool: pode aumentar ou reduzir efeito glicêmico'],
    uso_populacoes_especiais: { renal: 'TFG < 30: reduzir dose (menor clearance de insulina).', hepatico: 'IH grave: reduzir dose.', pediatrico: 'Aprovado para DM1 a partir de 6 anos.', gestante: 'Uso possível — monitorar glicemia rigorosamente.', idoso: 'Iniciar com doses menores. Metas glicêmicas mais liberais.' },
    data_registro: '2003-08-20',
    data_ultima_atualizacao: '2025-02-10',
    versao_bula: 'v12.0',
    fonte_regulatoria: 'ANVISA',
    link_bula_profissional: 'https://www.sanofi.com.br/bulas/lantus-profissional.pdf',
  },
  {
    id: 'sanofi-toujeo-300',
    lab_id: 'sanofi',
    molecula: 'Insulina Glargina',
    nome_comercial: 'Toujeo®',
    classe_terapeutica: 'Insulina de Ação Ultra-Prolongada (Análogo basal concentrado)',
    cids_aprovados: ['E10', 'E11', 'E14'],
    apresentacoes: [
      { concentracao: '300 UI/mL', forma_farmaceutica: 'solucao_injetavel', embalagem: 'SoloStar Plus caneta 1,5 mL × 3', registro_anvisa: '1.0113.0154.001-7' },
    ],
    posologia_aprovada: 'DM1: iniciar 80% da dose diária total de insulina basal. DM2: iniciar 0,2 UI/kg/dia ou converter da dose de glargina 100 UI (mesma dose em UI). Injetar SC 1x/dia, mesmo horário.',
    contraindicacoes_bula: ['Hipoglicemia ativa', 'Hipersensibilidade à insulina glargina'],
    advertencias_principais: ['Perfil de ação mais estável que Lantus® 100 UI/mL (menor hipoglicemia noturna)', 'Não transferir para Lantus® na proporção 1:1', 'Curva de ação começa em ~6h, pico ausente, duração > 24h'],
    interacoes_principais: ['Beta-bloqueadores, corticosteroides, diuréticos tiazídicos (hiperglicemia)', 'IECA, álcool, salicilatos (hipoglicemia)'],
    uso_populacoes_especiais: { renal: 'TFG < 30: monitorar e reduzir dose.', idoso: 'Menor risco de hipoglicemia vs Lantus — preferível em geriátricos.' },
    data_registro: '2018-11-10',
    data_ultima_atualizacao: '2025-01-05',
    versao_bula: 'v4.0',
    fonte_regulatoria: 'ANVISA',
  },
];

// ─── NOVO NORDISK ──────────────────────────────────────────────
export const NOVO_NORDISK_PRODUCTS: ProdutoComercial[] = [
  {
    id: 'nn-novolin-n',
    lab_id: 'novo_nordisk',
    molecula: 'Insulina Isófana Humana (NPH)',
    nome_comercial: 'Novolin® N',
    classe_terapeutica: 'Insulina de Ação Intermediária (NPH)',
    cids_aprovados: ['E10', 'E11', 'E14'],
    apresentacoes: [
      { concentracao: '100 UI/mL', forma_farmaceutica: 'suspensao_injetavel', embalagem: 'Frasco 10 mL', registro_anvisa: '1.0109.0053.001-8' },
      { concentracao: '100 UI/mL', forma_farmaceutica: 'suspensao_injetavel', embalagem: 'Flexpen caneta 3 mL × 5', registro_anvisa: '1.0109.0053.002-6' },
    ],
    posologia_aprovada: 'DM1 (basal): 40-50% da dose diária total, 1-2x/dia (manhã e/ou noite). DM2: iniciar 0,1-0,2 UI/kg ao deitar. Usar SC (não IV).',
    contraindicacoes_bula: ['Hipoglicemia ativa', 'Hipersensibilidade a insulina humana'],
    advertencias_principais: ['Suspensão leitosa — agitar suavemente antes de usar', 'Pico de ação em 4-12h — risco de hipoglicemia noturna', 'Pode ser misturada com insulina regular na mesma seringa'],
    interacoes_principais: ['Beta-bloqueadores: mascaram hipoglicemia', 'Corticosteroides: antagonismo', 'Tiazolidinedionas: retenção hídrica/IC'],
    uso_populacoes_especiais: { renal: 'Reduzir dose em DRC (metabolismo reduzido).', gestante: 'Insulina NPH é segura na gestação.', idoso: 'Menor dose inicial. Metas glicêmicas liberais.' },
    data_registro: '1999-06-15',
    data_ultima_atualizacao: '2024-11-20',
    versao_bula: 'v10.0',
    fonte_regulatoria: 'ANVISA',
    link_bula_profissional: 'https://novonordisk.com.br/bulas/novolin-n.pdf',
  },
  {
    id: 'nn-novolin-r',
    lab_id: 'novo_nordisk',
    molecula: 'Insulina Humana Regular',
    nome_comercial: 'Novolin® R',
    classe_terapeutica: 'Insulina de Ação Rápida (Regular)',
    cids_aprovados: ['E10', 'E11', 'E14', 'E13'],
    apresentacoes: [
      { concentracao: '100 UI/mL', forma_farmaceutica: 'solucao_injetavel', embalagem: 'Frasco 10 mL', registro_anvisa: '1.0109.0051.001-4' },
      { concentracao: '100 UI/mL', forma_farmaceutica: 'solucao_injetavel', embalagem: 'Flexpen 3 mL × 5', registro_anvisa: '1.0109.0051.002-2' },
    ],
    posologia_aprovada: 'SC: aplicar 30 min antes das refeições. IV: bomba infusão contínua em UTI (cetoacidose, cirurgia). Dose ajustada conforme protocolo.',
    contraindicacoes_bula: ['Hipoglicemia ativa', 'Hipersensibilidade'],
    advertencias_principais: ['Única insulina que pode ser usada IV (em UTI/emergência)', 'SC: início ~30 min, pico 2-4h, duração 5-7h', 'Compatível para mistura com NPH'],
    interacoes_principais: ['Igual ao NPH — ver acima'],
    uso_populacoes_especiais: { renal: 'Ajustar dose.', gestante: 'Segura — usar conforme necessidade.', idoso: 'Risco maior de hipoglicemia.' },
    data_registro: '1999-06-15',
    data_ultima_atualizacao: '2024-11-20',
    versao_bula: 'v10.0',
    fonte_regulatoria: 'ANVISA',
  },
  {
    id: 'nn-novorapid',
    lab_id: 'novo_nordisk',
    molecula: 'Insulina Asparte',
    nome_comercial: 'NovoRapid®',
    classe_terapeutica: 'Análogo de Insulina de Ação Ultra-Rápida',
    cids_aprovados: ['E10', 'E11', 'E14'],
    apresentacoes: [
      { concentracao: '100 UI/mL', forma_farmaceutica: 'solucao_injetavel', embalagem: 'Frasco 10 mL', registro_anvisa: '1.0109.0088.001-2' },
      { concentracao: '100 UI/mL', forma_farmaceutica: 'solucao_injetavel', embalagem: 'FlexPen caneta 3 mL × 5', registro_anvisa: '1.0109.0088.002-0' },
    ],
    posologia_aprovada: 'Aplicar 0-15 min antes da refeição (ou imediatamente após). Dose: 10-20% da dose diária total por refeição (ajustar pela contagem de carboidratos). SC ou bomba de infusão.',
    contraindicacoes_bula: ['Hipoglicemia ativa', 'Hipersensibilidade à insulina asparte'],
    advertencias_principais: ['Início de ação: 10-20 min. Pico: 1-3h. Duração: 3-5h', 'Menor risco de hipoglicemia pós-prandial tardia vs insulina regular', 'Pode ser usada em bombas de infusão de insulina (CSII)'],
    interacoes_principais: ['Igual demais insulinas'],
    uso_populacoes_especiais: { renal: 'Reduzir dose em DRC.', gestante: 'Segura na gestação.', pediatrico: 'Aprovado a partir de 2 anos.' },
    data_registro: '2004-09-10',
    data_ultima_atualizacao: '2025-01-15',
    versao_bula: 'v8.0',
    fonte_regulatoria: 'ANVISA',
  },
  {
    id: 'nn-ozempic',
    lab_id: 'novo_nordisk',
    molecula: 'Semaglutida',
    nome_comercial: 'Ozempic®',
    classe_terapeutica: 'Agonista do Receptor GLP-1 (AR-GLP-1)',
    cids_aprovados: ['E11', 'I25'],
    apresentacoes: [
      { concentracao: '0,25 mg/dose', forma_farmaceutica: 'solucao_injetavel', embalagem: 'Caneta pré-preenchida 1,5 mL (4 doses)', registro_anvisa: '1.0109.0192.001-5' },
      { concentracao: '0,5 mg/dose', forma_farmaceutica: 'solucao_injetavel', embalagem: 'Caneta pré-preenchida 1,5 mL (4 doses)', registro_anvisa: '1.0109.0192.002-3' },
      { concentracao: '1 mg/dose', forma_farmaceutica: 'solucao_injetavel', embalagem: 'Caneta pré-preenchida 3 mL (4 doses)', registro_anvisa: '1.0109.0192.003-1' },
    ],
    posologia_aprovada: 'DM2: iniciar 0,25 mg SC 1x/semana por 4 semanas. Aumentar para 0,5 mg/semana. Máximo: 1 mg/semana. Redução CV (DM2 + DCV): indicação adicional.',
    contraindicacoes_bula: ['Histórico pessoal/familiar de carcinoma medular de tireoide', 'NEM tipo 2', 'Hipersensibilidade à semaglutida'],
    advertencias_principais: ['Pancreatite aguda — suspender se suspeita', 'Náuseas e vômitos frequentes — titular lentamente', 'Retinopatia diabética — monitorar', 'Não recomendado em DM1 ou cetoacidose'],
    interacoes_principais: ['Insulina: reduzir dose de insulina ao iniciar semaglutida', 'Anticoagulantes orais: monitorar INR (possível interação com varfarina)'],
    uso_populacoes_especiais: { renal: 'Sem ajuste necessário.', hepatico: 'Dados limitados em IH grave.', gestante: 'Contraindicado — suspender 2 meses antes de engravidar.', idoso: 'Sem ajuste. Monitorar hidratação.' },
    data_registro: '2018-05-14',
    data_ultima_atualizacao: '2025-03-01',
    versao_bula: 'v6.0',
    fonte_regulatoria: 'ANVISA',
    link_bula_profissional: 'https://novonordisk.com.br/bulas/ozempic-profissional.pdf',
  },
  {
    id: 'nn-victoza',
    lab_id: 'novo_nordisk',
    molecula: 'Liraglutida',
    nome_comercial: 'Victoza®',
    classe_terapeutica: 'Agonista do Receptor GLP-1 (AR-GLP-1)',
    cids_aprovados: ['E11'],
    apresentacoes: [
      { concentracao: '6 mg/mL', forma_farmaceutica: 'solucao_injetavel', embalagem: 'Caneta pré-preenchida 3 mL × 2 (18 mg total)', registro_anvisa: '1.0109.0178.001-3' },
    ],
    posologia_aprovada: 'Iniciar 0,6 mg SC 1x/dia por 1 semana, aumentar para 1,2 mg/dia. Máximo: 1,8 mg/dia. Aplicar a qualquer hora, independente de refeições.',
    contraindicacoes_bula: ['Histórico familiar de carcinoma medular de tireoide', 'NEM tipo 2'],
    advertencias_principais: ['Semelhantes ao Ozempic — pancreatite, NEM2, tireoide'],
    interacoes_principais: ['Anticoagulantes orais: monitorar'],
    uso_populacoes_especiais: { renal: 'Sem ajuste.', gestante: 'Contraindicado.' },
    data_registro: '2012-11-15',
    data_ultima_atualizacao: '2024-08-10',
    versao_bula: 'v9.0',
    fonte_regulatoria: 'ANVISA',
  },
];

// ─── ASTRAZENECA ───────────────────────────────────────────────
export const ASTRAZENECA_PRODUCTS: ProdutoComercial[] = [
  {
    id: 'az-brilique-90',
    lab_id: 'astrazeneca',
    molecula: 'Ticagrelor',
    nome_comercial: 'Brilique®',
    classe_terapeutica: 'Antiplaquetário — Inibidor reversível do receptor P2Y12',
    cids_aprovados: ['I21', 'I25', 'Z95'],
    apresentacoes: [
      { concentracao: '90 mg', forma_farmaceutica: 'comprimido', embalagem: '56 comprimidos (blíster)', registro_anvisa: '1.0064.0312.001-9' },
      { concentracao: '60 mg', forma_farmaceutica: 'comprimido', embalagem: '56 comprimidos (blíster)', registro_anvisa: '1.0064.0312.002-7' },
    ],
    posologia_aprovada: 'SCA (IAM/SCA-SEST): 180 mg dose de ataque, depois 90 mg 2x/dia (por 12 meses). Prevenção secundária (> 12 meses pós-IAM): 60 mg 2x/dia. Sempre associar a AAS 75-100 mg/dia.',
    contraindicacoes_bula: ['Sangramento ativo', 'Histórico de AVC hemorrágico', 'IH grave (Child-Pugh C)', 'Uso concomitante com inibidores potentes de CYP3A4 (cetoconazol, claritromicina, nefazodona, ritonavir, atazanavir, indinavir, telitromicina)'],
    advertencias_principais: ['Dispneia — efeito adverso frequente (adenosina endógena), geralmente transitória', 'Não requer genotipagem CYP2C19 (vantagem vs clopidogrel)', 'Suspender 5 dias antes de cirurgia eletiva', 'Bradicardia assintomática — monitorar ECG em predispostos'],
    interacoes_principais: ['AAS > 100 mg/dia: reduz eficácia do ticagrelor — manter AAS ≤ 100 mg', 'Digoxina: aumento dos níveis séricos de digoxina', 'CYP3A4 inibidores potentes: contraindicado', 'Anticoagulantes: risco hemorrágico aditivo'],
    uso_populacoes_especiais: { renal: 'Sem ajuste. Pode ser usado em diálise.', hepatico: 'IH leve-moderada: sem ajuste. Grave: contraindicado.', gestante: 'Evitar — dados insuficientes.', idoso: 'Sem ajuste específico.' },
    data_registro: '2012-03-20',
    data_ultima_atualizacao: '2025-01-10',
    versao_bula: 'v10.0',
    fonte_regulatoria: 'ANVISA',
    link_bula_profissional: 'https://www.astrazeneca.com.br/bulas/brilique-profissional.pdf',
  },
  {
    id: 'az-farxiga-10',
    lab_id: 'astrazeneca',
    molecula: 'Dapagliflozina',
    nome_comercial: 'Farxiga®',
    classe_terapeutica: 'Inibidor do SGLT-2 (Gliflozina)',
    cids_aprovados: ['E11', 'I50', 'N18'],
    apresentacoes: [
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0064.0295.001-1' },
    ],
    posologia_aprovada: 'DM2: 10 mg 1x/dia (manhã, com ou sem alimento). IC-FEr: 10 mg 1x/dia. DRC (TFG 25-75): 10 mg 1x/dia.',
    contraindicacoes_bula: ['TFG < 25 mL/min (para DM2 glicemia)', 'DM tipo 1 (risco CAD)', 'Hipersensibilidade'],
    advertencias_principais: ['Cetoacidose diabética (CAD) — atenção em DM2 com baixa reserva pancreática', 'Infecção genital fúngica — higiene orientada', 'Hipotensão — monitorar em diuréticos concomitantes', 'Amputação de membros (atenção em pé diabético)'],
    interacoes_principais: ['Diuréticos: hipovolemia/hipotensão aditiva', 'Insulina: reduzir dose de insulina ao iniciar'],
    uso_populacoes_especiais: { renal: 'TFG 25-45: manter para IC e DRC. TFG < 25: não usar para DM2.', gestante: 'Contraindicado 2º-3º tri.' },
    data_registro: '2015-07-22',
    data_ultima_atualizacao: '2025-02-20',
    versao_bula: 'v9.0',
    fonte_regulatoria: 'ANVISA',
  },
];

// ─── BAYER ─────────────────────────────────────────────────────
export const BAYER_PRODUCTS: ProdutoComercial[] = [
  {
    id: 'bayer-xarelto-20',
    lab_id: 'bayer',
    molecula: 'Rivaroxabana',
    nome_comercial: 'Xarelto®',
    classe_terapeutica: 'Anticoagulante Oral Direto — Inibidor direto do Fator Xa',
    cids_aprovados: ['I48', 'I26', 'I80', 'Z95', 'I21'],
    apresentacoes: [
      { concentracao: '2,5 mg', forma_farmaceutica: 'comprimido', embalagem: '56 comprimidos', registro_anvisa: '1.0015.0422.001-8' },
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '10 comprimidos', registro_anvisa: '1.0015.0422.002-6' },
      { concentracao: '15 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos', registro_anvisa: '1.0015.0422.003-4' },
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos', registro_anvisa: '1.0015.0422.004-2' },
    ],
    posologia_aprovada: 'FA não valvular: 20 mg 1x/dia com jantar (TFG > 50) ou 15 mg 1x/dia (TFG 15-50). TEP/TVP tratamento: 15 mg 2x/dia por 21 dias, depois 20 mg 1x/dia. Profilaxia TEP pós-cirurgia ortopédica: 10 mg 1x/dia por 35 dias (quadril) ou 12 dias (joelho). SCA (prevenção secundária): 2,5 mg 2x/dia + AAS + clopidogrel.',
    contraindicacoes_bula: ['Sangramento ativo', 'Lesão em órgão em risco de sangramento grave', 'FA valvular (prótese mecânica ou estenose mitral moderada-grave)', 'TFG < 15 (para FA)', 'IH grave (Child-Pugh C) com coagulopatia'],
    advertencias_principais: ['Sem antídoto específico no Brasil (andexanet alfa não disponível; vitamina K ineficaz)', 'Monitorar função renal 1x/ano', 'Suspender 24-48h antes de procedimentos invasivos', 'Comprimidos de 15 e 20 mg devem ser tomados com refeição (absorção reduzida em jejum)'],
    interacoes_principais: ['Inibidores potentes de CYP3A4 + P-gp (cetoconazol, ritonavir): contraindicado', 'Indutores de CYP3A4 (rifampicina, carbamazepina, fenitoína): evitar', 'AINEs: risco hemorrágico GI', 'AAS/Clopidogrel: monitorar sangramento'],
    uso_populacoes_especiais: { renal: 'TFG 50-80: 20 mg/dia (FA). TFG 15-50: 15 mg/dia (FA). TFG < 15: contraindicado.', hepatico: 'IH grave: contraindicado.', gestante: 'Contraindicado — teratogênico.', idoso: 'Monitorar função renal anualmente.' },
    data_registro: '2010-09-12',
    data_ultima_atualizacao: '2025-02-01',
    versao_bula: 'v14.0',
    fonte_regulatoria: 'ANVISA',
    link_bula_profissional: 'https://www.bayer.com.br/bulas/xarelto-profissional.pdf',
  },
];

// ─── BRISTOL-MYERS SQUIBB / PFIZER ────────────────────────────
export const BMS_PRODUCTS: ProdutoComercial[] = [
  {
    id: 'bms-eliquis-5',
    lab_id: 'bms',
    molecula: 'Apixabana',
    nome_comercial: 'Eliquis®',
    classe_terapeutica: 'Anticoagulante Oral Direto — Inibidor direto do Fator Xa',
    cids_aprovados: ['I48', 'I26', 'I80', 'Z95'],
    apresentacoes: [
      { concentracao: '2,5 mg', forma_farmaceutica: 'comprimido', embalagem: '20 comprimidos', registro_anvisa: '1.0046.0281.001-5' },
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '20 comprimidos', registro_anvisa: '1.0046.0281.002-3' },
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '56 comprimidos', registro_anvisa: '1.0046.0281.003-1' },
    ],
    posologia_aprovada: 'FA não valvular: 5 mg 2x/dia (dose padrão). Reduzir para 2,5 mg 2x/dia se ≥ 2 critérios: idade ≥ 80 anos, peso ≤ 60 kg, creatinina ≥ 1,5 mg/dL. TEP/TVP tratamento: 10 mg 2x/dia por 7 dias, depois 5 mg 2x/dia. Profilaxia pós-cirurgia: 2,5 mg 2x/dia.',
    contraindicacoes_bula: ['Sangramento ativo', 'FA com prótese mecânica', 'IH grave com coagulopatia', 'Hipersensibilidade'],
    advertencias_principais: ['Menor risco de sangramento intracraniano vs varfarina (ARISTOTLE)', 'Não requer monitoramento de INR rotineiro', 'Suspender 24-48h antes de procedimentos (48h se alto risco)', 'Andexanet alfa disponível em alguns países como antídoto específico'],
    interacoes_principais: ['Inibidores CYP3A4 + P-gp fortes (cetoconazol, ritonavir, claritromicina): evitar ou reduzir dose', 'Rifampicina: reduz apixabana ~54% — evitar', 'AAS/AINEs: risco hemorrágico aditivo'],
    uso_populacoes_especiais: { renal: 'TFG > 15: sem ajuste para FA (exceto critérios de redução acima). TFG < 15: dados limitados.', hepatico: 'IH grave: contraindicado.', gestante: 'Contraindicado.', idoso: 'Critérios de redução de dose aplicam-se (ver acima).' },
    data_registro: '2012-11-22',
    data_ultima_atualizacao: '2025-01-20',
    versao_bula: 'v12.0',
    fonte_regulatoria: 'ANVISA',
    link_bula_profissional: 'https://www.pfizer.com.br/bulas/eliquis-profissional.pdf',
  },
];

// ─── BOEHRINGER INGELHEIM ──────────────────────────────────────
export const BOEHRINGER_PRODUCTS: ProdutoComercial[] = [
  {
    id: 'bi-pradaxa-150',
    lab_id: 'boehringer',
    molecula: 'Dabigatrana Etexilato',
    nome_comercial: 'Pradaxa®',
    classe_terapeutica: 'Anticoagulante Oral Direto — Inibidor direto da Trombina (Fator IIa)',
    cids_aprovados: ['I48', 'I26', 'I80', 'Z95'],
    apresentacoes: [
      { concentracao: '75 mg', forma_farmaceutica: 'capsula', embalagem: '60 cápsulas', registro_anvisa: '1.0030.0195.001-2' },
      { concentracao: '110 mg', forma_farmaceutica: 'capsula', embalagem: '60 cápsulas', registro_anvisa: '1.0030.0195.002-0' },
      { concentracao: '150 mg', forma_farmaceutica: 'capsula', embalagem: '60 cápsulas', registro_anvisa: '1.0030.0195.003-8' },
    ],
    posologia_aprovada: 'FA não valvular: 150 mg 2x/dia (< 80 anos) ou 110 mg 2x/dia (≥ 80 anos, alto risco hemorrágico, TFG 30-50). Profilaxia TEP pós-cirurgia: 220 mg 1x/dia (110 mg no 1º dia).',
    contraindicacoes_bula: ['TFG < 30 mL/min (para FA)', 'Sangramento ativo', 'IH grave', 'FA com prótese mecânica', 'Uso com inibidores potentes de P-gp (cetoconazol, ciclosporina, itraconazol, dronedarona)'],
    advertencias_principais: ['ÚNICO DOAC com antídoto específico: Idarucizumabe (Praxbind®)', 'Eliminação predominantemente renal — monitorar TFG 2x/ano', 'Não abrir cápsula (reduz biodisponibilidade)', 'Dispepsia frequente — tomar com alimento'],
    interacoes_principais: ['Inibidores P-gp (verapamil: reduzir dose; dronedarona, ciclosporina: contraindicado)', 'Indutores P-gp (rifampicina): reduz dabigatrana ~66%', 'AAS, AINEs: risco hemorrágico'],
    uso_populacoes_especiais: { renal: 'TFG 30-50: 110 mg 2x/dia. TFG < 30: contraindicado para FA.', gestante: 'Contraindicado.', idoso: '≥ 80 anos: usar 110 mg 2x/dia.' },
    data_registro: '2011-08-15',
    data_ultima_atualizacao: '2025-01-18',
    versao_bula: 'v11.0',
    fonte_regulatoria: 'ANVISA',
    link_bula_profissional: 'https://www.boehringer-ingelheim.com.br/bulas/pradaxa-profissional.pdf',
  },
  {
    id: 'bi-jardiance-10',
    lab_id: 'boehringer',
    molecula: 'Empagliflozina',
    nome_comercial: 'Jardiance®',
    classe_terapeutica: 'Inibidor do SGLT-2 (Gliflozina)',
    cids_aprovados: ['E11', 'I50'],
    apresentacoes: [
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0030.0221.001-8' },
      { concentracao: '25 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0030.0221.002-6' },
    ],
    posologia_aprovada: 'DM2: 10 mg 1x/dia. Pode aumentar para 25 mg se necessário (maior efeito diurético). IC-FEr: 10 mg 1x/dia.',
    contraindicacoes_bula: ['TFG < 30 (para controle glicêmico)', 'DM tipo 1', 'Hipersensibilidade'],
    advertencias_principais: ['Cetoacidose diabética — suspender antes de cirurgia/jejum prolongado', 'Infecção genital por fungos — higiene', 'Hipotensão — monitorar com diuréticos', 'Fasceíte necrotizante perineal (rara mas grave)'],
    interacoes_principais: ['Insulina/Sulfonilureias: risco de hipoglicemia — reduzir dose'],
    uso_populacoes_especiais: { renal: 'TFG 30-60: pode manter para IC. TFG < 30: contraindicado para DM2 glicemia.', gestante: 'Contraindicado 2º-3º tri.' },
    data_registro: '2015-04-10',
    data_ultima_atualizacao: '2025-02-05',
    versao_bula: 'v8.0',
    fonte_regulatoria: 'ANVISA',
  },
];

// ─── NOVARTIS ──────────────────────────────────────────────────
export const NOVARTIS_PRODUCTS: ProdutoComercial[] = [
  {
    id: 'novartis-entresto-49',
    lab_id: 'novartis',
    molecula: 'Sacubitril/Valsartana',
    nome_comercial: 'Entresto®',
    classe_terapeutica: 'ARNI — Inibidor de Neprilisina + Antagonista do Receptor de Angiotensina II',
    cids_aprovados: ['I50'],
    apresentacoes: [
      { concentracao: '24/26 mg', forma_farmaceutica: 'comprimido', embalagem: '56 comprimidos', registro_anvisa: '1.0086.0398.001-4' },
      { concentracao: '49/51 mg', forma_farmaceutica: 'comprimido', embalagem: '56 comprimidos', registro_anvisa: '1.0086.0398.002-2' },
      { concentracao: '97/103 mg', forma_farmaceutica: 'comprimido', embalagem: '56 comprimidos', registro_anvisa: '1.0086.0398.003-0' },
    ],
    posologia_aprovada: 'IC-FEr (FE ≤ 40%) sintomática NYHA II-III: iniciar 49/51 mg 2x/dia. Titular a cada 2-4 semanas até 97/103 mg 2x/dia. Em pacientes não tolerando IECAs/BRAs ou com TFG < 30 ou PAS < 100: iniciar 24/26 mg 2x/dia.',
    contraindicacoes_bula: ['Uso concomitante ou recente (< 36h) com IECA — risco de angioedema', 'Histórico de angioedema por IECA ou ARB', 'TFG < 30 (relativa)', 'Gestação', 'IH grave (Child-Pugh C)'],
    advertencias_principais: ['Aguardar 36h após suspender IECA antes de iniciar (washout obrigatório)', 'Hipotensão sintomática — iniciar com dose menor se PAS < 100 mmHg', 'Hipercalemia — monitorar K+ (especialmente com K+ basal ≥ 5 mEq/L)', 'Angioedema — risco maior em afro-descendentes'],
    interacoes_principais: ['IECA: contraindicado — intervalo mínimo 36h', 'Alisquireno: evitar em DM', 'AINEs: reduzem efeito e risco de IRA', 'Diuréticos poupadores de K+: hipercalemia'],
    uso_populacoes_especiais: { renal: 'TFG 30-60: iniciar com dose menor. TFG < 30: cautela.', hepatico: 'IH leve: sem ajuste. Moderada: dose inicial menor. Grave: contraindicado.', gestante: 'Contraindicado em todos os trimestres.', idoso: 'Iniciar com 24/26 mg 2x/dia e titular lentamente.' },
    data_registro: '2016-08-20',
    data_ultima_atualizacao: '2025-01-25',
    versao_bula: 'v7.0',
    fonte_regulatoria: 'ANVISA',
    link_bula_profissional: 'https://www.novartis.com.br/bulas/entresto-profissional.pdf',
  },
];

// ─── MSD — MERCK SHARP & DOHME ────────────────────────────────
export const MSD_PRODUCTS: ProdutoComercial[] = [
  {
    id: 'msd-januvia-100',
    lab_id: 'msd',
    molecula: 'Fosfato de Sitagliptina',
    nome_comercial: 'Januvia®',
    classe_terapeutica: 'Inibidor da DPP-4 (iDPP-4, Gliptina)',
    cids_aprovados: ['E11'],
    apresentacoes: [
      { concentracao: '25 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos', registro_anvisa: '1.0058.0261.001-1' },
      { concentracao: '50 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos', registro_anvisa: '1.0058.0261.002-9' },
      { concentracao: '100 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos', registro_anvisa: '1.0058.0261.003-7' },
    ],
    posologia_aprovada: 'DM2: 100 mg 1x/dia. Ajuste renal: TFG 30-50: 50 mg/dia; TFG < 30: 25 mg/dia.',
    contraindicacoes_bula: ['DM tipo 1', 'Cetoacidose diabética', 'Hipersensibilidade à sitagliptina'],
    advertencias_principais: ['Pancreatite aguda (rara) — suspender se suspeita', 'Artralgia grave (alerta FDA 2015)', 'Não causa hipoglicemia em monoterapia', 'Neutros do ponto de vista cardiovascular (TECOS)'],
    interacoes_principais: ['Digoxina: pode aumentar discretamente os níveis de digoxina'],
    uso_populacoes_especiais: { renal: 'TFG 30-50: 50 mg/dia. TFG < 30: 25 mg/dia. Diálise: 25 mg/dia.', gestante: 'Dados insuficientes — não recomendado.', idoso: 'Sem ajuste por idade.' },
    data_registro: '2008-03-15',
    data_ultima_atualizacao: '2024-10-20',
    versao_bula: 'v11.0',
    fonte_regulatoria: 'ANVISA',
    link_bula_profissional: 'https://www.msd.com.br/bulas/januvia-profissional.pdf',
  },
];

// ─── ELI LILLY ─────────────────────────────────────────────────
export const ELI_LILLY_PRODUCTS: ProdutoComercial[] = [
  {
    id: 'lilly-humulin-n',
    lab_id: 'eli_lilly',
    molecula: 'Insulina Isófana Humana (NPH)',
    nome_comercial: 'Humulin® N',
    classe_terapeutica: 'Insulina de Ação Intermediária (NPH)',
    cids_aprovados: ['E10', 'E11', 'E14'],
    apresentacoes: [
      { concentracao: '100 UI/mL', forma_farmaceutica: 'suspensao_injetavel', embalagem: 'Frasco 10 mL', registro_anvisa: '1.0022.0089.001-6' },
    ],
    posologia_aprovada: 'Igual ao Novolin N — ver posologia NPH.',
    contraindicacoes_bula: ['Hipoglicemia ativa', 'Hipersensibilidade'],
    advertencias_principais: ['Suspensão leitosa — agitar', 'Pico 4-12h — risco hipoglicemia noturna'],
    interacoes_principais: ['Ver insulinas — classe.'],
    uso_populacoes_especiais: { gestante: 'Segura na gestação.' },
    data_registro: '1998-04-10',
    data_ultima_atualizacao: '2024-08-15',
    versao_bula: 'v12.0',
    fonte_regulatoria: 'ANVISA',
  },
  {
    id: 'lilly-humulin-r',
    lab_id: 'eli_lilly',
    molecula: 'Insulina Humana Regular',
    nome_comercial: 'Humulin® R',
    classe_terapeutica: 'Insulina de Ação Rápida (Regular)',
    cids_aprovados: ['E10', 'E11', 'E13', 'E14'],
    apresentacoes: [
      { concentracao: '100 UI/mL', forma_farmaceutica: 'solucao_injetavel', embalagem: 'Frasco 10 mL', registro_anvisa: '1.0022.0088.001-8' },
    ],
    posologia_aprovada: 'Igual ao Novolin R — pode ser usada IV em UTI.',
    contraindicacoes_bula: ['Hipoglicemia ativa'],
    advertencias_principais: ['Única insulina para uso IV'],
    interacoes_principais: ['Ver insulinas — classe.'],
    uso_populacoes_especiais: { gestante: 'Segura.' },
    data_registro: '1998-04-10',
    data_ultima_atualizacao: '2024-08-15',
    versao_bula: 'v12.0',
    fonte_regulatoria: 'ANVISA',
  },
  {
    id: 'lilly-humalog',
    lab_id: 'eli_lilly',
    molecula: 'Insulina Lispro',
    nome_comercial: 'Humalog®',
    classe_terapeutica: 'Análogo de Insulina de Ação Ultra-Rápida',
    cids_aprovados: ['E10', 'E11'],
    apresentacoes: [
      { concentracao: '100 UI/mL', forma_farmaceutica: 'solucao_injetavel', embalagem: 'Frasco 10 mL', registro_anvisa: '1.0022.0112.001-4' },
      { concentracao: '100 UI/mL', forma_farmaceutica: 'solucao_injetavel', embalagem: 'KwikPen 3 mL × 5', registro_anvisa: '1.0022.0112.002-2' },
    ],
    posologia_aprovada: 'Aplicar 0-15 min antes ou imediatamente após refeição. Dose: ajustada por contagem de carboidratos. Início de ação: 5-15 min. Pico: 1-2h. Duração: 3-4h.',
    contraindicacoes_bula: ['Hipoglicemia ativa', 'Hipersensibilidade à insulina lispro'],
    advertencias_principais: ['Início mais rápido que insulina regular — menor hipoglicemia pós-prandial tardia'],
    interacoes_principais: ['Ver insulinas — classe.'],
    uso_populacoes_especiais: { pediatrico: 'Aprovado > 2 anos.', gestante: 'Segura.' },
    data_registro: '2001-06-20',
    data_ultima_atualizacao: '2024-10-10',
    versao_bula: 'v9.0',
    fonte_regulatoria: 'ANVISA',
  },
];

// ─── ACHÉ ──────────────────────────────────────────────────────
export const ACHE_PRODUCTS: ProdutoComercial[] = [
  {
    id: 'ache-coumadin',
    lab_id: 'ache',
    molecula: 'Varfarina Sódica',
    nome_comercial: 'Coumadin®',
    classe_terapeutica: 'Anticoagulante Antagonista da Vitamina K (AVK)',
    cids_aprovados: ['I48', 'I26', 'I80', 'Z95', 'I35', 'I34'],
    apresentacoes: [
      { concentracao: '1 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos', registro_anvisa: '1.0003.0012.001-7' },
      { concentracao: '2,5 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos', registro_anvisa: '1.0003.0012.002-5' },
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos', registro_anvisa: '1.0003.0012.003-3' },
    ],
    posologia_aprovada: 'FA (valvular ou com prótese mecânica): dose individualizada pelo INR alvo (2-3 para FA/TEP, 2,5-3,5 para prótese mecânica). Dose inicial: 2-5 mg/dia. Ajustar conforme INR bissemanalmente até estabilização.',
    contraindicacoes_bula: ['Sangramento ativo', 'Gravidez (teratogênico — 1º e 3º trimestres)', 'Anemia aplásica', 'Hipertensão grave não controlada', 'Cirurgia recente do SNC ou olhos'],
    advertencias_principais: ['ÚNICO anticoagulante indicado em FA VALVULAR e próteses mecânicas', 'Monitoramento obrigatório de INR (custo, inconveniência)', 'Múltiplas interações alimentares e medicamentosas (CYP2C9, CYP3A4)', 'Antídoto: Vitamina K1 (fitonadiona) IV/VO + Plasma Fresco Congelado/CCP se urgência', 'CYP2C9 e VKORC1 polimorfismos afetam a dose'],
    interacoes_principais: ['Vitamina K (alimentos verdes): reduz INR — manter consumo CONSTANTE', 'Antibióticos (metronidazol, fluconazol, azitromicina): aumentam INR', 'AINEs (ibuprofeno, diclofenaco): risco hemorrágico GI aditivo', 'Amiodarona: aumenta muito o INR — reduzir varfarina ~50%', 'Fenitoína: interação bidirecional (bimodal)'],
    uso_populacoes_especiais: { renal: 'Usar com cautela. TFG < 30: maior risco hemorrágico.', hepatico: 'Contraindicado em IH grave (síntese de fatores prejudicada).', gestante: 'Contraindicado 1º e 3º trimestres. 2º trimestre: risco teratogênico. Usar heparina.', idoso: 'Iniciar com doses menores (1-2 mg). INR alvo mais baixo em > 80 anos. Risco de sangramento aumentado.' },
    data_registro: '1991-03-12',
    data_ultima_atualizacao: '2024-12-01',
    versao_bula: 'v18.0',
    fonte_regulatoria: 'ANVISA',
  },
];

// ─── ROCHE ─────────────────────────────────────────────────────
export const ROCHE_PRODUCTS: ProdutoComercial[] = [
  {
    id: 'roche-mabthera',
    lab_id: 'roche',
    molecula: 'Rituximabe',
    nome_comercial: 'MabThera®',
    classe_terapeutica: 'Anticorpo Monoclonal Anti-CD20 — Imunossupressor/Oncológico',
    cids_aprovados: ['C83', 'C85', 'C91', 'M05', 'M34'],
    apresentacoes: [
      { concentracao: '100 mg/10 mL', forma_farmaceutica: 'solucao_injetavel', embalagem: 'Frasco 10 mL', registro_anvisa: '1.0096.0028.001-3' },
      { concentracao: '500 mg/50 mL', forma_farmaceutica: 'solucao_injetavel', embalagem: 'Frasco 50 mL', registro_anvisa: '1.0096.0028.002-1' },
    ],
    posologia_aprovada: 'LNH CD20+ (protocolo R-CHOP/R-CVP): 375 mg/m² IV dia 1 de cada ciclo de 21-28 dias. AR refratária: 2 infusões de 1000 mg com intervalo de 14 dias.',
    contraindicacoes_bula: ['Infecção ativa grave', 'Insuficiência cardíaca grave (NYHA IV)', 'Hipersensibilidade ao rituximabe ou proteínas murinas'],
    advertencias_principais: ['Reação à infusão (primeira dose) — pré-medicar com paracetamol e difenidramina', 'Reativação de HBV — triagem obrigatória antes do início', 'Leucoencefalopatia multifocal progressiva (LMP — JC vírus) — rara'],
    interacoes_principais: ['Cisplatina: nefrotoxicidade quando combinados', 'Imunossupressores: aumentam risco de infecção oportunista'],
    uso_populacoes_especiais: { renal: 'Sem ajuste formal.', gestante: 'Contraindicado — depleção de células B fetais.' },
    data_registro: '2002-06-14',
    data_ultima_atualizacao: '2024-09-15',
    versao_bula: 'v10.0',
    fonte_regulatoria: 'ANVISA',
  },
];

// ═══════════════════════════════════════════════════════════════
// REGISTRO CENTRAL MULTI-LABORATÓRIO
// ═══════════════════════════════════════════════════════════════

/**
 * Registro central de catálogos por laboratório.
 * Permite adicionar novos laboratórios sem alterar outras engines.
 * Cada chave corresponde ao lab_id em LABS.
 */
export const LAB_CATALOG_REGISTRY: Record<string, ProdutoComercial[]> = {
  eurofarma: EUROFARMA_PRODUCTS,
  ems: EMS_PRODUCTS,
  sanofi: SANOFI_PRODUCTS,
  novo_nordisk: NOVO_NORDISK_PRODUCTS,
  astrazeneca: ASTRAZENECA_PRODUCTS,
  bayer: BAYER_PRODUCTS,
  bms: BMS_PRODUCTS,
  boehringer: BOEHRINGER_PRODUCTS,
  novartis: NOVARTIS_PRODUCTS,
  msd: MSD_PRODUCTS,
  eli_lilly: ELI_LILLY_PRODUCTS,
  ache: ACHE_PRODUCTS,
  roche: ROCHE_PRODUCTS,
};

/**
 * Registra dinamicamente o catálogo de um novo laboratório.
 * Permite onboarding de labs sem recompilação do core.
 */
export function registerLabCatalog(labId: string, products: ProdutoComercial[]): void {
  LAB_CATALOG_REGISTRY[labId] = products;
  if (LABS[labId]) {
    LABS[labId].ativo = true;
    LABS[labId].portfolio_sync_date = new Date().toISOString().split('T')[0];
  }
}

// ─── FUNÇÕES UTILITÁRIAS ──────────────────────────────────────

/**
 * Retorna todos os produtos de todos os laboratórios ativos.
 * @param labId se informado, filtra por laboratório específico
 */
export function getAllLabProducts(labId?: string): ProdutoComercial[] {
  const activeLabIds = Object.values(LABS)
    .filter(l => l.ativo)
    .map(l => l.id);

  const allProducts: ProdutoComercial[] = [];
  for (const [lid, products] of Object.entries(LAB_CATALOG_REGISTRY)) {
    if (!activeLabIds.includes(lid)) continue;
    if (labId && lid !== labId) continue;
    allProducts.push(...products);
  }
  return allProducts;
}

export function getProductsByMolecule(
  molecula: string,
  labId?: string,
): ProdutoComercial[] {
  const all = getAllLabProducts(labId);
  const normalized = molecula.toLowerCase();
  return all.filter(p => {
    const molNorm = p.molecula.toLowerCase();
    return molNorm.includes(normalized) ||
      normalized.includes(molNorm.split(' ')[0].toLowerCase());
  });
}

export function getProductsByCid(cid10: string, labId?: string): ProdutoComercial[] {
  const all = getAllLabProducts(labId);
  return all.filter(p => {
    const matchCid = p.cids_aprovados.some(c => c.startsWith(cid10.substring(0, 3)));
    const matchLab = !labId || p.lab_id === labId;
    return matchCid && matchLab;
  });
}

export function getProductById(id: string): ProdutoComercial | undefined {
  for (const products of Object.values(LAB_CATALOG_REGISTRY)) {
    const found = products.find(p => p.id === id);
    if (found) return found;
  }
  return undefined;
}

export function getActiveLabProducts(): ProdutoComercial[] {
  return getAllLabProducts();
}
