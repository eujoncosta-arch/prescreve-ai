export type ClasseRecomendacao = 'I' | 'IIa' | 'IIb' | 'III';
export type NivelEvidencia = 'A' | 'B' | 'C';

export interface DiretrizRef {
  sociedade: string;
  ano: number;
  titulo: string;
  classe: ClasseRecomendacao;
  nivel: NivelEvidencia;
  url?: string;
}

export interface EstudoPrincipal {
  nome: string;
  ano: number;
  revista: string;
  nnt?: number;
  descricao: string;
}

export interface AchadoClinico {
  texto: string;
  peso: 'alto' | 'medio' | 'baixo';
}

export interface DiagnosticoDiferencial {
  condicao: string;
  probabilidade: 'alta' | 'media' | 'baixa';
  diferenciador: string;
}

export interface MonitoramentoItem {
  parametro: string;
  frequencia: string;
  alerta?: string;
}

export interface FatorPrognostico {
  fator: string;
  impacto: 'favoravel' | 'desfavoravel';
  magnitude: 'alto' | 'medio' | 'baixo';
}

export interface RacionalTerapeutico {
  id: string;
  cids: string[];
  condicao: string;
  conduta: string;
  hipotese_principal: string;
  mecanismo_acao: string;
  achados_favoraveis: AchadoClinico[];
  achados_desfavoraveis: AchadoClinico[];
  diagnosticos_diferenciais: DiagnosticoDiferencial[];
  exames_recomendados: string[];
  fatores_prognosticos: FatorPrognostico[];
  diretrizes: DiretrizRef[];
  estudos_principais: EstudoPrincipal[];
  monitoramento: MonitoramentoItem[];
  marcas_eurofarma?: string[];
  tags: string[];
}

export const RACIONAIS_CLINICOS: RacionalTerapeutico[] = [
  {
    id: 'has-dm2-drc-bra-sglt2',
    cids: ['I10', 'E11', 'N18'],
    condicao: 'HAS + DM2 + DRC',
    conduta: 'BRA + iSGLT2',
    hipotese_principal: 'Nefroproteção e cardioproteção em paciente de alto risco cardiovascular-renal',
    mecanismo_acao: 'BRA bloqueia SRAA reduzindo pressão intraglomerular; iSGLT2 reduz reabsorção tubular de glicose e sódio com efeitos hemodinâmicos renais e cardíacos independentes de HbA1c',
    achados_favoraveis: [
      { texto: 'Proteinúria ≥ 300 mg/g (indicação forte de BRA)', peso: 'alto' },
      { texto: 'TFGe 25–75 mL/min/1,73m² (faixa alvo para iSGLT2)', peso: 'alto' },
      { texto: 'DM2 com controle glicêmico subótimo', peso: 'alto' },
      { texto: 'IC concomitante (benefício adicional do iSGLT2)', peso: 'medio' },
      { texto: 'PA sistólica > 130 mmHg não controlada', peso: 'medio' },
      { texto: 'Histórico de evento cardiovascular (infarto, AVC)', peso: 'medio' },
    ],
    achados_desfavoraveis: [
      { texto: 'TFGe < 20 mL/min/1,73m² — reavaliar iSGLT2', peso: 'alto' },
      { texto: 'Hiperpotassemia > 5,5 mEq/L — cautela com BRA', peso: 'alto' },
      { texto: 'Gravidez ou lactação — BRA contraindicado', peso: 'alto' },
      { texto: 'Infecções genitais recorrentes — cautela iSGLT2', peso: 'baixo' },
    ],
    diagnosticos_diferenciais: [
      { condicao: 'Glomerulopatia primária', probabilidade: 'media', diferenciador: 'Proteinúria nefrótica, hematúria dismórfica, biópsia renal' },
      { condicao: 'HAS renovascular', probabilidade: 'baixa', diferenciador: 'Assimetria renal, sopro abdominal, angiotomografia' },
      { condicao: 'DRC por outras causas', probabilidade: 'media', diferenciador: 'Histórico, imagem renal, urina tipo I' },
    ],
    exames_recomendados: [
      'Creatinina + TFGe (CKD-EPI)',
      'Relação albumina/creatinina urinária (ACR)',
      'Potássio sérico',
      'HbA1c',
      'Glicemia em jejum',
      'Lipidograma completo',
      'Ultrassonografia renal',
    ],
    fatores_prognosticos: [
      { fator: 'ACR < 300 mg/g com BRA + iSGLT2', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'PA controlada < 130/80 mmHg', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'HbA1c < 7% mantida', impacto: 'favoravel', magnitude: 'medio' },
      { fator: 'TFGe progressivamente declinante (> 5 mL/ano)', impacto: 'desfavoravel', magnitude: 'alto' },
      { fator: 'Tabagismo ativo', impacto: 'desfavoravel', magnitude: 'medio' },
    ],
    diretrizes: [
      { sociedade: 'KDIGO', ano: 2024, titulo: 'KDIGO 2024 Clinical Practice Guideline for CKD', classe: 'I', nivel: 'A' },
      { sociedade: 'ADA', ano: 2024, titulo: 'Standards of Care in Diabetes 2024', classe: 'I', nivel: 'A' },
      { sociedade: 'ESC/ESH', ano: 2023, titulo: 'ESC/ESH 2023 Guidelines for Hypertension', classe: 'I', nivel: 'A' },
      { sociedade: 'SBC', ano: 2023, titulo: 'Diretrizes Brasileiras de HAS 2023', classe: 'I', nivel: 'A' },
    ],
    estudos_principais: [
      { nome: 'DECLARE-TIMI 58', ano: 2019, revista: 'NEJM', nnt: 67, descricao: 'Dapagliflozina reduziu hospitalização por IC e morte cardiovascular em DM2' },
      { nome: 'CREDENCE', ano: 2019, revista: 'NEJM', nnt: 22, descricao: 'Canagliflozina reduziu 30% risco renal composto em DRC diabética' },
      { nome: 'DAPA-CKD', ano: 2020, revista: 'NEJM', nnt: 19, descricao: 'Dapagliflozina reduziu progressão renal em DRC com e sem DM2' },
      { nome: 'RENAAL / IDNT', ano: 2001, revista: 'NEJM', nnt: 16, descricao: 'BRA (Losartana/Irbesartana) reduziram progressão renal em nefropatia diabética' },
    ],
    monitoramento: [
      { parametro: 'Creatinina + K+', frequencia: '2–4 semanas após início do BRA', alerta: 'Suspender se K+ > 6,0 ou creatinina aumentar > 30%' },
      { parametro: 'TFGe + ACR', frequencia: 'A cada 3–6 meses', alerta: 'Queda > 5 mL/min/ano = progressão acelerada' },
      { parametro: 'PA em consulta e domiciliar', frequencia: 'Mensal até meta, depois trimestral', alerta: 'Meta < 130/80 mmHg' },
      { parametro: 'HbA1c', frequencia: 'A cada 3 meses até estável, depois semestral' },
      { parametro: 'Infecções genitais / ITU', frequencia: 'A cada consulta (iSGLT2)' },
    ],
    marcas_eurofarma: ['GLIF® (Dapagliflozina 10mg)', 'HOLMES® (Olmesartana — para HAS)'],
    tags: ['has', 'dm2', 'drc', 'bra', 'sglt2', 'nefroprotecao', 'cardioprotecao'],
  },
  {
    id: 'has-bra',
    cids: ['I10'],
    condicao: 'HAS essencial',
    conduta: 'Bloqueador do Receptor de Angiotensina II (BRA)',
    hipotese_principal: 'Controle pressórico com nefroproteção e proteção cardiovascular por bloqueio do SRAA',
    mecanismo_acao: 'Bloqueio seletivo do receptor AT1 da angiotensina II reduz vasoconstrição, retenção de sódio e remodelamento cardíaco sem a tosse induzida pelos IECA',
    achados_favoraveis: [
      { texto: 'HAS com DM2 associado', peso: 'alto' },
      { texto: 'Proteinúria / microalbuminúria', peso: 'alto' },
      { texto: 'Tosse com IECA (intolerância)', peso: 'alto' },
      { texto: 'HAS com IC-FEr', peso: 'medio' },
      { texto: 'HAS com hipertrofia ventricular esquerda', peso: 'medio' },
    ],
    achados_desfavoraveis: [
      { texto: 'Estenose bilateral de artéria renal', peso: 'alto' },
      { texto: 'Gravidez', peso: 'alto' },
      { texto: 'Hiperpotassemia', peso: 'alto' },
      { texto: 'Angioedema prévio ao BRA', peso: 'alto' },
    ],
    diagnosticos_diferenciais: [
      { condicao: 'HAS secundária (aldosteronismo primário)', probabilidade: 'media', diferenciador: 'Hipopotassemia, relação aldosterona/renina > 30' },
      { condicao: 'HAS renovascular', probabilidade: 'baixa', diferenciador: 'Piora de creatinina com BRA, sopro abdominal' },
      { condicao: 'Pseudohipertensão (Mönckeberg)', probabilidade: 'baixa', diferenciador: 'Artérias enrijecidas, sinal de Osler' },
    ],
    exames_recomendados: ['PA em 3 aferições', 'Creatinina + TFGe', 'Potássio', 'Urina tipo I + microalbuminúria', 'ECG', 'Fundo de olho'],
    fatores_prognosticos: [
      { fator: 'PA controlada < 130/80 mmHg', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'Ausência de lesão de órgão-alvo', impacto: 'favoravel', magnitude: 'medio' },
      { fator: 'Síndrome metabólica concomitante', impacto: 'desfavoravel', magnitude: 'medio' },
    ],
    diretrizes: [
      { sociedade: 'ESC/ESH', ano: 2023, titulo: 'ESC/ESH 2023 Guidelines for Hypertension', classe: 'I', nivel: 'A' },
      { sociedade: 'SBC', ano: 2023, titulo: 'Diretrizes Brasileiras de HAS 2023', classe: 'I', nivel: 'A' },
      { sociedade: 'JNC 8', ano: 2014, titulo: 'Evidence-Based Guideline for Management of HTN in Adults', classe: 'I', nivel: 'A' },
    ],
    estudos_principais: [
      { nome: 'LIFE', ano: 2002, revista: 'Lancet', nnt: 50, descricao: 'Losartana superior à atenolol na redução de eventos CV e AVC' },
      { nome: 'ONTARGET', ano: 2008, revista: 'NEJM', descricao: 'Telmisartana não inferior ao ramipril com menos tosse' },
    ],
    monitoramento: [
      { parametro: 'PA domiciliar e consultório', frequencia: 'Mensal até meta, depois trimestral', alerta: 'Meta < 130/80 mmHg' },
      { parametro: 'Creatinina + K+', frequencia: '2–4 semanas após início, depois semestral' },
    ],
    marcas_eurofarma: ['HOLMES® (Olmesartana Medoxomila)'],
    tags: ['has', 'bra', 'anti-hipertensivo', 'sraa'],
  },
  {
    id: 'dm2-sglt2',
    cids: ['E11', 'I50', 'N18'],
    condicao: 'DM2 + alto risco cardiovascular',
    conduta: 'iSGLT2 (Dapagliflozina)',
    hipotese_principal: 'Redução de hospitalização por IC e progressão renal com benefícios glicêmicos e hemodinâmicos',
    mecanismo_acao: 'Inibição do cotransportador SGLT2 no túbulo proximal renal; natriurese osmótica, redução de pré-carga e pós-carga, cetose leve, efeitos anti-inflamatórios miocárdicos',
    achados_favoraveis: [
      { texto: 'IC-FEr com DM2 (indicação Classe I-A)', peso: 'alto' },
      { texto: 'DRC com TFGe 25–75 (proteção renal)', peso: 'alto' },
      { texto: 'DM2 com evento CV prévio', peso: 'alto' },
      { texto: 'HbA1c 7,5–9% sem hipoglicemia', peso: 'medio' },
      { texto: 'Obesidade com DM2 (perda de 2–3 kg)', peso: 'medio' },
    ],
    achados_desfavoraveis: [
      { texto: 'TFGe < 20 mL/min/1,73m²', peso: 'alto' },
      { texto: 'DM1 (risco de CAD euglicêmica)', peso: 'alto' },
      { texto: 'Infecções genitais recorrentes', peso: 'medio' },
      { texto: 'Dieta muito pobre em carboidratos (< 50g/dia)', peso: 'medio' },
    ],
    diagnosticos_diferenciais: [
      { condicao: 'LADA (DM autoimune do adulto)', probabilidade: 'baixa', diferenciador: 'Anti-GAD65+, peptídeo-C baixo' },
      { condicao: 'DM2 com insuficiência renal avançada', probabilidade: 'media', diferenciador: 'TFGe, imagem renal, biópsia' },
    ],
    exames_recomendados: ['HbA1c', 'Glicemia em jejum', 'TFGe + creatinina', 'ACR urinária', 'BNP/NT-proBNP (se IC suspeita)', 'Ecocardiograma'],
    fatores_prognosticos: [
      { fator: 'HbA1c < 7% mantida', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'TFGe estável > 45 mL/min', impacto: 'favoravel', magnitude: 'medio' },
      { fator: 'Síndrome metabólica não tratada', impacto: 'desfavoravel', magnitude: 'medio' },
    ],
    diretrizes: [
      { sociedade: 'ADA', ano: 2024, titulo: 'Standards of Care in Diabetes — Pharmacologic Approaches', classe: 'I', nivel: 'A' },
      { sociedade: 'ESC', ano: 2023, titulo: 'ESC 2023 Guidelines on Diabetes and CVD', classe: 'I', nivel: 'A' },
      { sociedade: 'KDIGO', ano: 2024, titulo: 'KDIGO 2024 Guideline for CKD', classe: 'I', nivel: 'A' },
      { sociedade: 'SBD', ano: 2023, titulo: 'Diretrizes da Sociedade Brasileira de Diabetes', classe: 'I', nivel: 'A' },
    ],
    estudos_principais: [
      { nome: 'DECLARE-TIMI 58', ano: 2019, revista: 'NEJM', nnt: 67, descricao: 'Dapagliflozina: redução de hospitalização por IC e morte CV' },
      { nome: 'DAPA-HF', ano: 2019, revista: 'NEJM', nnt: 21, descricao: 'Dapagliflozina em IC-FEr com e sem DM2: redução de mortalidade CV' },
      { nome: 'DAPA-CKD', ano: 2020, revista: 'NEJM', nnt: 19, descricao: 'Dapagliflozina reduziu progressão renal em DRC com e sem DM2' },
    ],
    monitoramento: [
      { parametro: 'HbA1c', frequencia: 'A cada 3 meses até estável', alerta: 'Meta individualizada (6,5–7,5%)' },
      { parametro: 'TFGe', frequencia: 'Após início e a cada 6 meses' },
      { parametro: 'Sinais de candidíase genital / ITU', frequencia: 'A cada consulta' },
      { parametro: 'PA e peso', frequencia: 'A cada consulta' },
    ],
    marcas_eurofarma: ['GLIF® (Dapagliflozina 10mg)'],
    tags: ['dm2', 'sglt2', 'dapagliflozina', 'ic', 'drc'],
  },
  {
    id: 'dm2-obesidade-glp1',
    cids: ['E11', 'E66'],
    condicao: 'DM2 + Obesidade',
    conduta: 'Agonista de GLP-1',
    hipotese_principal: 'Controle glicêmico com perda de peso significativa e redução de risco CV',
    mecanismo_acao: 'Agonismo nos receptores GLP-1 pancreáticos (secreção de insulina glicose-dependente), hipotalâmicos (saciedade) e cardíacos (proteção miocárdica direta)',
    achados_favoraveis: [
      { texto: 'IMC > 30 kg/m² com DM2', peso: 'alto' },
      { texto: 'DM2 com doença cardiovascular aterosclerótica', peso: 'alto' },
      { texto: 'HbA1c 7,5–10% com metformina', peso: 'alto' },
      { texto: 'Esteatohepatite não alcoólica (NASH)', peso: 'medio' },
    ],
    achados_desfavoraveis: [
      { texto: 'Pancreatite prévia ou atual', peso: 'alto' },
      { texto: 'Carcinoma medular de tireoide ou NEM-2', peso: 'alto' },
      { texto: 'Náusea/vômito intratáveis', peso: 'medio' },
      { texto: 'TFGe < 15 mL/min (alguns agentes)', peso: 'medio' },
    ],
    diagnosticos_diferenciais: [
      { condicao: 'Hipotiroidismo contribuindo para obesidade', probabilidade: 'media', diferenciador: 'TSH, T4L' },
      { condicao: 'Síndrome de Cushing', probabilidade: 'baixa', diferenciador: 'Cortisol livre urinário, teste de supressão' },
    ],
    exames_recomendados: ['HbA1c', 'TSH', 'Lipase + amilase', 'Função hepática (AST/ALT)', 'USG abdominal (fígado gorduroso)', 'Glicemia pós-prandial'],
    fatores_prognosticos: [
      { fator: 'Perda de peso > 5% em 3 meses', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'Ausência de pancreatite', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'Hipoglicemia frequente (monitorar com sulfonilureias)', impacto: 'desfavoravel', magnitude: 'medio' },
    ],
    diretrizes: [
      { sociedade: 'ADA', ano: 2024, titulo: 'Standards of Care — Obesity and Weight Management', classe: 'I', nivel: 'A' },
      { sociedade: 'AACE', ano: 2023, titulo: 'Comprehensive Type 2 Diabetes Management Algorithm', classe: 'I', nivel: 'A' },
    ],
    estudos_principais: [
      { nome: 'LEADER', ano: 2016, revista: 'NEJM', nnt: 66, descricao: 'Liraglutida reduziu morte CV em DM2 de alto risco' },
      { nome: 'SUSTAIN-6', ano: 2016, revista: 'NEJM', nnt: 46, descricao: 'Semaglutida reduziu AVC e IAM em DM2' },
      { nome: 'STEP 5', ano: 2022, revista: 'Lancet', descricao: 'Semaglutida 2,4mg: perda de 15–17% do peso corporal' },
    ],
    monitoramento: [
      { parametro: 'Peso corporal e IMC', frequencia: 'A cada consulta (meta: -5% em 3 meses)' },
      { parametro: 'HbA1c', frequencia: 'A cada 3 meses' },
      { parametro: 'Sintomas gastrointestinais (náusea)', frequencia: 'Semanalmente no início — titular dose lentamente' },
      { parametro: 'Lipase/amilase (se dor abdominal)', frequencia: 'Se sintomático' },
    ],
    tags: ['dm2', 'obesidade', 'glp1', 'semaglutida', 'liraglutida'],
  },
  {
    id: 'ic-fer-quarteto',
    cids: ['I50', 'I50.0'],
    condicao: 'Insuficiência Cardíaca com FE Reduzida (IC-FEr)',
    conduta: 'Quarteto da IC: BRA/IECA ou ARNI + BB + ARM + iSGLT2',
    hipotese_principal: 'Redução de mortalidade por múltiplos mecanismos neuro-hormonais e hemodinâmicos na IC-FEr',
    mecanismo_acao: 'ARNI: bloqueia neprilisina (aumenta BNP) + SRAA. BB: reduz FC e remodelamento. ARM: antialdosterona. iSGLT2: reduz volume, efeitos miocárdicos diretos',
    achados_favoraveis: [
      { texto: 'FEVE ≤ 40% no ecocardiograma', peso: 'alto' },
      { texto: 'Sintomas de IC (dispneia, edema, ortopneia)', peso: 'alto' },
      { texto: 'BNP elevado ou NT-proBNP > 400 pg/mL', peso: 'alto' },
      { texto: 'IC estável após descompensação resolvida', peso: 'medio' },
    ],
    achados_desfavoraveis: [
      { texto: 'PAS < 90 mmHg (instabilidade hemodinâmica)', peso: 'alto' },
      { texto: 'Angioedema com IECA/ARNI', peso: 'alto' },
      { texto: 'K+ > 5,5 mEq/L (cautela com ARM)', peso: 'alto' },
      { texto: 'Bloqueio AV de 2º/3º grau sem marca-passo (BB)', peso: 'alto' },
      { texto: 'TFGe < 30 mL/min (reavaliar ARM)', peso: 'medio' },
    ],
    diagnosticos_diferenciais: [
      { condicao: 'Tamponamento cardíaco', probabilidade: 'baixa', diferenciador: 'Ecocardiograma urgente, sinais de Beck' },
      { condicao: 'TEP maciço', probabilidade: 'media', diferenciador: 'D-dímero, angiotomografia, ECG S1Q3T3' },
      { condicao: 'Miocardite aguda', probabilidade: 'media', diferenciador: 'Troponina, RM cardíaca, biópsia' },
    ],
    exames_recomendados: ['Ecocardiograma transtorácico (FEVE)', 'BNP ou NT-proBNP', 'Troponina', 'Função renal + eletrólitos', 'Raio-X de tórax', 'ECG 12 derivações'],
    fatores_prognosticos: [
      { fator: 'Recuperação da FEVE > 50% em 6 meses', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'BNP em queda > 30% após tratamento', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'CF NYHA I/II mantida', impacto: 'favoravel', magnitude: 'medio' },
      { fator: 'Fibrilação atrial concomitante', impacto: 'desfavoravel', magnitude: 'medio' },
      { fator: 'DRC estágio 3B+', impacto: 'desfavoravel', magnitude: 'alto' },
    ],
    diretrizes: [
      { sociedade: 'ESC', ano: 2021, titulo: 'ESC 2021 Guidelines for Heart Failure', classe: 'I', nivel: 'A' },
      { sociedade: 'AHA/ACC', ano: 2022, titulo: 'AHA/ACC/HFSA 2022 Guideline for HF', classe: 'I', nivel: 'A' },
      { sociedade: 'SBC', ano: 2023, titulo: 'Diretriz Brasileira de Insuficiência Cardíaca', classe: 'I', nivel: 'A' },
    ],
    estudos_principais: [
      { nome: 'PARADIGM-HF', ano: 2014, revista: 'NEJM', nnt: 21, descricao: 'Sacubitril/Valsartana superior ao Enalapril: redução de 20% em morte CV e hospitalização' },
      { nome: 'DAPA-HF', ano: 2019, revista: 'NEJM', nnt: 21, descricao: 'Dapagliflozina reduziu morte CV e piora de IC em FEr com e sem DM2' },
      { nome: 'EMPHASIS-HF', ano: 2011, revista: 'NEJM', nnt: 19, descricao: 'Eplerenona reduziu morte CV e hospitalização em IC-FEr leve' },
    ],
    monitoramento: [
      { parametro: 'PA, FC e função renal', frequencia: 'A cada 2 semanas no início da titulação' },
      { parametro: 'BNP/NT-proBNP', frequencia: 'A cada 3 meses', alerta: 'Aumento > 30% sugere descompensação' },
      { parametro: 'Potássio sérico', frequencia: 'A cada 2 semanas com ARM, depois mensal', alerta: 'Suspender ARM se K+ > 6,0' },
      { parametro: 'Peso diário', frequencia: 'Diário pelo paciente', alerta: 'Ganho > 2 kg em 3 dias = acionar serviço de IC' },
      { parametro: 'Ecocardiograma', frequencia: 'A cada 6 meses no primeiro ano' },
    ],
    marcas_eurofarma: ['GLIF® (Dapagliflozina 10mg)'],
    tags: ['ic', 'ic-fer', 'quarteto', 'arni', 'bb', 'arm', 'sglt2', 'feve'],
  },
  {
    id: 'fa-noac',
    cids: ['I48'],
    condicao: 'Fibrilação Atrial',
    conduta: 'Anticoagulação oral com NOAC (Apixabana, Rivaroxabana, Dabigatrana)',
    hipotese_principal: 'Prevenção de AVC cardioembólico em FA não valvar com escore CHA₂DS₂-VASc ≥ 2',
    mecanismo_acao: 'Inibição direta do fator Xa (apixabana, rivaroxabana) ou trombina (dabigatrana) interrompendo a cascata de coagulação sem necessidade de monitoramento do INR',
    achados_favoraveis: [
      { texto: 'CHA₂DS₂-VASc ≥ 2 em homens ou ≥ 3 em mulheres', peso: 'alto' },
      { texto: 'FA persistente ou permanente documentada no ECG', peso: 'alto' },
      { texto: 'AVC/TIA prévio (escore ≥ 2 automaticamente)', peso: 'alto' },
      { texto: 'HAS, DM2, IC como comorbidades (aumentam escore)', peso: 'medio' },
    ],
    achados_desfavoraveis: [
      { texto: 'Prótese valvar metálica (warfarina obrigatória)', peso: 'alto' },
      { texto: 'Estenose mitral reumática moderada-grave', peso: 'alto' },
      { texto: 'TFGe < 15 mL/min / diálise (maioria dos NOACs)', peso: 'alto' },
      { texto: 'Sangramento ativo', peso: 'alto' },
    ],
    diagnosticos_diferenciais: [
      { condicao: 'Flutter atrial', probabilidade: 'media', diferenciador: 'ECG: ondas F regulares 300/min com condução variável' },
      { condicao: 'Taquicardia atrial multifocal', probabilidade: 'baixa', diferenciador: 'Múltiplas morfologias de onda P, DPOC frequente' },
    ],
    exames_recomendados: ['ECG 12 derivações + Holter 24h', 'Ecocardiograma transtorácico', 'TSH (excluir hipertireoidismo)', 'Função renal + eletrólitos', 'CHA₂DS₂-VASc + HAS-BLED'],
    fatores_prognosticos: [
      { fator: 'Controle de FC < 80 bpm em repouso', impacto: 'favoravel', magnitude: 'medio' },
      { fator: 'Anticoagulação mantida sem interrupções', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'HAS não controlada (aumenta HAS-BLED e risco de AVC)', impacto: 'desfavoravel', magnitude: 'alto' },
    ],
    diretrizes: [
      { sociedade: 'ESC', ano: 2020, titulo: 'ESC 2020 Guidelines for Atrial Fibrillation', classe: 'I', nivel: 'A' },
      { sociedade: 'AHA/ACC', ano: 2023, titulo: 'ACC/AHA 2023 Guidelines for AF Diagnosis and Management', classe: 'I', nivel: 'A' },
      { sociedade: 'SBC', ano: 2023, titulo: 'Diretriz Brasileira de FA 2023', classe: 'I', nivel: 'A' },
    ],
    estudos_principais: [
      { nome: 'ARISTOTLE', ano: 2011, revista: 'NEJM', nnt: 167, descricao: 'Apixabana superior à Warfarina: menos AVC, hemorragias e mortalidade' },
      { nome: 'ROCKET-AF', ano: 2011, revista: 'NEJM', descricao: 'Rivaroxabana não inferior à Warfarina em prevenção de AVC' },
      { nome: 'RE-LY', ano: 2009, revista: 'NEJM', descricao: 'Dabigatrana 150mg superior à Warfarina na prevenção de AVC' },
    ],
    monitoramento: [
      { parametro: 'Função renal (TFGe)', frequencia: 'Anual; a cada 6 meses se TFGe < 60', alerta: 'Ajuste de dose se TFGe < 50 (dabigatrana) ou < 30 (outros)' },
      { parametro: 'FC em repouso', frequencia: 'A cada consulta', alerta: 'Meta de controle: < 80 bpm repouso, < 110 bpm esforço leve' },
      { parametro: 'Sinais de sangramento', frequencia: 'A cada consulta' },
    ],
    tags: ['fa', 'noac', 'anticoagulacao', 'avc', 'chavas'],
  },
  {
    id: 'dislipidemia-estatina-alta',
    cids: ['E78', 'I25', 'Z82.4'],
    condicao: 'Dislipidemia de alto risco cardiovascular',
    conduta: 'Estatina de alta intensidade (Rosuvastatina 20–40mg ou Atorvastatina 40–80mg)',
    hipotese_principal: 'Redução de LDL-c ≥ 50% para meta < 55 mg/dL em pacientes de muito alto risco (DCV aterosclerótica estabelecida)',
    mecanismo_acao: 'Inibição da HMG-CoA redutase hepática reduz síntese de colesterol → upregulation de receptores LDL → clearance de LDL-c plasmático. Efeitos pleiotrópicos anti-inflamatórios e estabilizadores de placa',
    achados_favoraveis: [
      { texto: 'IAM, AVC ou DCV aterosclerótica prévia (muito alto risco)', peso: 'alto' },
      { texto: 'LDL-c > 190 mg/dL sem tratamento (HF familiar)', peso: 'alto' },
      { texto: 'DM2 > 10 anos com fator de risco adicional', peso: 'alto' },
      { texto: 'Escore de Risco Global > 20% em 10 anos', peso: 'alto' },
    ],
    achados_desfavoraveis: [
      { texto: 'Miopatia grave ou CPK > 10x LSN', peso: 'alto' },
      { texto: 'Hepatopatia ativa (TGO/TGP > 3x LSN)', peso: 'alto' },
      { texto: 'Gravidez / amamentação', peso: 'alto' },
      { texto: 'Mialgia prévia com estatina (reduzir dose / trocar)', peso: 'medio' },
    ],
    diagnosticos_diferenciais: [
      { condicao: 'Hipotireoidismo causando dislipidemia secundária', probabilidade: 'media', diferenciador: 'TSH elevado — tratar antes de iniciar estatina' },
      { condicao: 'Síndrome nefrótica', probabilidade: 'baixa', diferenciador: 'Proteinúria > 3,5g/dia, albumina baixa' },
    ],
    exames_recomendados: ['Lipidograma em jejum', 'CPK basal', 'TGO/TGP', 'TSH', 'Glicemia (estatina aumenta risco DM2)', 'Score de cálcio coronário (se indicado)'],
    fatores_prognosticos: [
      { fator: 'LDL-c < 55 mg/dL atingido', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'Redução de LDL-c ≥ 50%', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'Tabagismo ativo (aumenta risco residual)', impacto: 'desfavoravel', magnitude: 'alto' },
    ],
    diretrizes: [
      { sociedade: 'ESC/EAS', ano: 2019, titulo: 'ESC/EAS 2019 Dyslipidaemias Guidelines', classe: 'I', nivel: 'A' },
      { sociedade: 'AHA/ACC', ano: 2019, titulo: 'AHA/ACC 2019 Guideline on Cholesterol', classe: 'I', nivel: 'A' },
      { sociedade: 'SBC', ano: 2023, titulo: 'Diretriz Brasileira de Dislipidemias 2023', classe: 'I', nivel: 'A' },
    ],
    estudos_principais: [
      { nome: 'CTT Meta-análise', ano: 2010, revista: 'Lancet', nnt: 50, descricao: 'Cada 39 mg/dL de redução de LDL-c reduz 22% de eventos CV maiores' },
      { nome: 'JUPITER', ano: 2008, revista: 'NEJM', nnt: 95, descricao: 'Rosuvastatina 20mg em baixo risco com PCR-us elevado reduziu eventos CV' },
      { nome: 'IMPROVE-IT', ano: 2015, revista: 'NEJM', nnt: 50, descricao: 'Adição de Ezetimiba à Sinvastatina reduziu eventos em ACS' },
    ],
    monitoramento: [
      { parametro: 'Lipidograma', frequencia: '6–8 semanas após início, depois anual', alerta: 'LDL-c meta < 55 mg/dL (muito alto risco) ou < 70 mg/dL (alto risco)' },
      { parametro: 'TGO/TGP', frequencia: 'Basal e se sintomas hepáticos', alerta: 'Suspender se > 3x LSN' },
      { parametro: 'CPK', frequencia: 'Se mialgia ou fraqueza muscular', alerta: 'Suspender se > 10x LSN ou miopatia sintomática' },
      { parametro: 'Glicemia/HbA1c', frequencia: 'Anual (estatinas aumentam levemente risco de DM2)' },
    ],
    marcas_eurofarma: ['VAST® (Atorvastatina Cálcica)'],
    tags: ['dislipidemia', 'estatina', 'ldl', 'risco-cardiovascular', 'atorvastatina'],
  },
  {
    id: 'drc-proteinuria-bra',
    cids: ['N18', 'N18.3', 'E11'],
    condicao: 'DRC com proteinúria',
    conduta: 'BRA (Olmesartana / Losartana) em dose máxima tolerada',
    hipotese_principal: 'Nefroproteção por redução da pressão intraglomerular e dos efeitos trófico-fibróticos da angiotensina II',
    mecanismo_acao: 'Bloqueio do receptor AT1: vasodilatação preferencial da arteríola eferente glomerular, redução de pressão de filtração, atenuação de TGF-β e fibrose intersticial renal',
    achados_favoraveis: [
      { texto: 'ACR ≥ 300 mg/g (macroalbuminúria)', peso: 'alto' },
      { texto: 'DRC diabética (nefropatia diabética)', peso: 'alto' },
      { texto: 'HAS concomitante (duplo benefício)', peso: 'alto' },
      { texto: 'TFGe 20–60 mL/min (maior benefício nefroprotetor)', peso: 'medio' },
    ],
    achados_desfavoraveis: [
      { texto: 'K+ > 5,5 mEq/L pré-tratamento', peso: 'alto' },
      { texto: 'Estenose bilateral de artéria renal', peso: 'alto' },
      { texto: 'Gravidez', peso: 'alto' },
    ],
    diagnosticos_diferenciais: [
      { condicao: 'Glomeruloesclerose focal e segmentar', probabilidade: 'media', diferenciador: 'Proteinúria nefrótica, hematúria, biópsia' },
      { condicao: 'Nefropatia por IgA', probabilidade: 'media', diferenciador: 'Hematúria episódica, biópsia' },
    ],
    exames_recomendados: ['Creatinina + TFGe', 'Proteinúria 24h ou ACR', 'K+ sérico', 'Urina tipo I + sedimento', 'Ultrassonografia renal', 'Fundoscopia (retinopatia)'],
    fatores_prognosticos: [
      { fator: 'Redução de ACR > 50% com BRA', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'PA < 130/80 mmHg atingida', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'TFGe < 30 mL/min na apresentação', impacto: 'desfavoravel', magnitude: 'alto' },
    ],
    diretrizes: [
      { sociedade: 'KDIGO', ano: 2024, titulo: 'KDIGO 2024 CKD Guideline', classe: 'I', nivel: 'A' },
      { sociedade: 'ADA', ano: 2024, titulo: 'ADA 2024 — Microvascular Complications', classe: 'I', nivel: 'A' },
    ],
    estudos_principais: [
      { nome: 'RENAAL', ano: 2001, revista: 'NEJM', nnt: 16, descricao: 'Losartana reduziu 25% progressão para DRET em DM2' },
      { nome: 'IDNT', ano: 2001, revista: 'NEJM', nnt: 19, descricao: 'Irbesartana superior a Anlodipino e Placebo na nefropatia diabética' },
    ],
    monitoramento: [
      { parametro: 'Creatinina + K+', frequencia: '1–2 semanas após início/aumento de dose', alerta: 'Suspender se K+ > 6,0 ou creatinina ↑ > 30%' },
      { parametro: 'ACR urinária', frequencia: 'A cada 3–6 meses', alerta: 'Meta: redução > 30% do valor basal' },
      { parametro: 'PA', frequencia: 'A cada consulta', alerta: 'Meta: < 130/80 mmHg se ACR > 30 mg/g' },
    ],
    marcas_eurofarma: ['HOLMES® (Olmesartana Medoxomila)'],
    tags: ['drc', 'proteinuria', 'bra', 'nefroproteção', 'nefropatia-diabetica'],
  },
  {
    id: 'asma-leve-ics-formoterol',
    cids: ['J45', 'J45.0', 'J45.1'],
    condicao: 'Asma leve a moderada',
    conduta: 'ICS + Formoterol (terapia de alívio e manutenção — MART)',
    hipotese_principal: 'Controle de inflamação eosinofílica das vias aéreas com prevenção de exacerbações usando esquema MART (Manutenção E Resgate com o mesmo inalador)',
    mecanismo_acao: 'ICS suprime inflamação eosinofílica reduzindo IL-5, IL-13 e remodelamento; Formoterol (LABA de início rápido) promove broncodilatação e permite uso como resgate, reduzindo necessidade de SABA puro',
    achados_favoraveis: [
      { texto: 'Asma com ≥ 2 sintomas/semana ou ≥ 1 despertar noturno/mês', peso: 'alto' },
      { texto: 'Uso de SABA > 2x/semana (indica necessidade de controle)', peso: 'alto' },
      { texto: 'VEF1 < 80% do previsto (obstrução leve a moderada)', peso: 'alto' },
      { texto: 'Eosinofilia > 300/μL no hemograma', peso: 'medio' },
      { texto: 'Atopia (rinite, eczema) concomitante', peso: 'medio' },
    ],
    achados_desfavoraveis: [
      { texto: 'Tabagismo ativo > 10 anos (pode ser DPOC, não asma)', peso: 'alto' },
      { texto: 'Ausência de reversibilidade no espirometria', peso: 'medio' },
      { texto: 'Broncoespasmo com AINE/AAS (asma do adulto — avaliar Montelucaste)', peso: 'medio' },
    ],
    diagnosticos_diferenciais: [
      { condicao: 'DPOC', probabilidade: 'media', diferenciador: 'Tabagismo > 10 maços-ano, VEF1/CVF < 70% pós-BD sem reversibilidade' },
      { condicao: 'Bronquiectasias', probabilidade: 'baixa', diferenciador: 'TC de tórax, expectoração purulenta crônica' },
      { condicao: 'Insuficiência cardíaca ("asma cardíaca")', probabilidade: 'media', diferenciador: 'BNP, ecocardiograma, crepitações bibasais' },
    ],
    exames_recomendados: ['Espirometria com teste broncodilatador', 'FeNO (fração exalada de NO)', 'Hemograma com eosinófilos', 'IgE total + teste alérgico (RAST)', 'Raio-X de tórax'],
    fatores_prognosticos: [
      { fator: 'Adesão ao ICS diário', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'Controle de gatilhos (ácaros, mofo, pelo)', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'Tabagismo ativo', impacto: 'desfavoravel', magnitude: 'alto' },
      { fator: 'Obesidade IMC > 35', impacto: 'desfavoravel', magnitude: 'medio' },
    ],
    diretrizes: [
      { sociedade: 'GINA', ano: 2023, titulo: 'GINA 2023 Global Strategy for Asthma Management', classe: 'I', nivel: 'A' },
      { sociedade: 'SBPT', ano: 2023, titulo: 'Diretrizes Brasileiras de Asma 2023', classe: 'I', nivel: 'A' },
    ],
    estudos_principais: [
      { nome: 'SYGMA 1 & 2', ano: 2018, revista: 'NEJM', nnt: 34, descricao: 'Budesonida/Formoterol MART não inferior ao esquema fixo diário; menos exacerbações' },
      { nome: 'Novel START', ano: 2019, revista: 'NEJM', nnt: 29, descricao: 'ICS/Formoterol MART superior ao SABA puro em asma leve' },
    ],
    monitoramento: [
      { parametro: 'Controle sintomático (ACT)', frequencia: 'A cada 1–3 meses', alerta: 'ACT < 20 = não controlada — intensificar degrau' },
      { parametro: 'Frequência de uso do resgate', frequencia: 'A cada consulta', alerta: '> 2 resgates/semana = mal controlada' },
      { parametro: 'Espirometria', frequencia: 'Anual ou após mudança de degrau' },
      { parametro: 'Técnica inalatória', frequencia: 'A cada consulta (reforçar uso correto do inalador)' },
    ],
    tags: ['asma', 'ics', 'formoterol', 'mart', 'leve-moderada'],
  },
  {
    id: 'asma-moderada-ics-laba-lugano',
    cids: ['J45', 'J45.1'],
    condicao: 'Asma moderada a grave persistente',
    conduta: 'ICS + LABA de alta dose (Fluticasona + Formoterol — LUGANO®)',
    hipotese_principal: 'Controle de asma persistente moderada-grave com combinação fixa ICS+LABA de alta potência, reduzindo exacerbações e hospitalizações',
    mecanismo_acao: 'Fluticasona (ICS de alta potência, receptor glicocorticóide — seletividade pulmonar) + Formoterol (LABA, broncodilatação sustentada 12h) com efeitos sinérgicos moleculares (LABA aumenta translocação nuclear do receptor de glicocorticoide)',
    achados_favoraveis: [
      { texto: 'Asma não controlada com ICS em dose média', peso: 'alto' },
      { texto: '≥ 2 exacerbações/ano com ICS isolado', peso: 'alto' },
      { texto: 'VEF1 < 60% com limitação de atividades', peso: 'alto' },
      { texto: 'Sintomas noturnos frequentes (> 1x/semana)', peso: 'medio' },
      { texto: 'Eosinófilos > 400/μL (fenótipo T2-alto)', peso: 'medio' },
    ],
    achados_desfavoraveis: [
      { texto: 'Asma com alergia severa (considerar imunoterapia + biológico)', peso: 'medio' },
      { texto: 'LABA sem ICS (proibido em monoterapia na asma)', peso: 'alto' },
      { texto: 'Arritmia cardíaca sensível a beta-agonistas', peso: 'medio' },
    ],
    diagnosticos_diferenciais: [
      { condicao: 'Asma grave refratária (candidato a biológico)', probabilidade: 'media', diferenciador: 'Asma não controlada com máxima dose ICS+LABA, eosinófilos > 300' },
      { condicao: 'Asma + DPOC (overlap ACO)', probabilidade: 'media', diferenciador: 'Tabagismo, espirometria com reversibilidade parcial' },
    ],
    exames_recomendados: ['Espirometria pré e pós-BD', 'FeNO', 'Eosinófilos no sangue periférico', 'IgE total + IgE específica (Dermatophagoides)', 'TC de tórax (se dúvida diagnóstica)'],
    fatores_prognosticos: [
      { fator: 'ACT ≥ 20 mantido', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'Eosinófilos < 150/μL com tratamento', impacto: 'favoravel', magnitude: 'medio' },
      { fator: 'VEF1 normalizando (> 80%)', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'Múltiplas exacerbações no último ano', impacto: 'desfavoravel', magnitude: 'alto' },
    ],
    diretrizes: [
      { sociedade: 'GINA', ano: 2023, titulo: 'GINA 2023 — Degraus 3–4 de tratamento', classe: 'I', nivel: 'A' },
      { sociedade: 'SBPT', ano: 2023, titulo: 'Diretrizes Brasileiras de Asma 2023', classe: 'I', nivel: 'A' },
    ],
    estudos_principais: [
      { nome: 'GOAL', ano: 2004, revista: 'AJRCCM', nnt: 6, descricao: 'Fluticasona+Salmeterol atingiu controle total em mais pacientes que ICS isolado' },
      { nome: 'OPTIMA', ano: 2020, revista: 'NEJM', descricao: 'ICS de alta dose reduziu exacerbações em asma não controlada' },
    ],
    monitoramento: [
      { parametro: 'ACT (Asthma Control Test)', frequencia: 'A cada 3 meses', alerta: 'ACT < 20 por 3 meses consecutivos → considerar biológico (Omalizumabe, Mepolizumabe)' },
      { parametro: 'Exacerbações no período', frequencia: 'A cada consulta', alerta: '≥ 2/ano com esquema máximo → encaminhar pneumologia' },
      { parametro: 'Densidade óssea (DXA)', frequencia: 'Anual se ICS > 2 anos em alta dose' },
    ],
    marcas_eurofarma: ['LUGANO® (Fumarato de Formoterol + Propionato de Fluticasona)'],
    tags: ['asma', 'ics-laba', 'fluticasona', 'formoterol', 'lugano', 'moderada-grave'],
  },
  {
    id: 'parkinson-inicial-pramipexol',
    cids: ['G20'],
    condicao: 'Doença de Parkinson — fase inicial',
    conduta: 'Agonista dopaminérgico — Dicloridrato de Pramipexol LP (PISA® LP)',
    hipotese_principal: 'Controle de sintomas motores e possível neuroproteção na fase inicial do Parkinson com menor risco de discinesias que a Levodopa',
    mecanismo_acao: 'Agonismo nos receptores dopaminérgicos D2/D3 no estriado e substância negra pars compacta; estimulação pós-sináptica direta independente de neurônios dopaminérgicos remanescentes; efeitos antioxidantes e antiapoptóticos D3-mediados',
    achados_favoraveis: [
      { texto: 'Parkinson início antes dos 65 anos (menor risco de confusão com agonistas)', peso: 'alto' },
      { texto: 'Tremor predominante como sintoma inicial', peso: 'alto' },
      { texto: 'Diagnóstico clínico (critérios de MDS-UPDRS) confirmado', peso: 'alto' },
      { texto: 'Síndrome das Pernas Inquietas comórbida (indicação adicional)', peso: 'medio' },
    ],
    achados_desfavoraveis: [
      { texto: 'Paciente > 75 anos (maior risco de alucinações e hipotensão)', peso: 'alto' },
      { texto: 'Demência associada (DLB/DCB — usar Levodopa)', peso: 'alto' },
      { texto: 'Hipotensão ortostática sintomática', peso: 'medio' },
      { texto: 'Histórico de transtornos de controle de impulso (hipersexualidade, jogo)', peso: 'alto' },
      { texto: 'TFGe < 30 mL/min (ajuste de dose necessário)', peso: 'medio' },
    ],
    diagnosticos_diferenciais: [
      { condicao: 'Parkinsonismo vascular', probabilidade: 'media', diferenciador: 'RM com hiperintensidades subcorticais, início em MMII, resposta pobre à Levodopa' },
      { condicao: 'Paralisia Supranuclear Progressiva (PSP)', probabilidade: 'baixa', diferenciador: 'Paralisia supranuclear do olhar, quedas precoces, RM típica' },
      { condicao: 'Atrofia de Múltiplos Sistemas (MSA)', probabilidade: 'baixa', diferenciador: 'Disautonomia precoce grave, cerebelar, RM típica' },
      { condicao: 'Tremor essencial', probabilidade: 'media', diferenciador: 'Tremor de ação/intenção, ausência de rigidez/bradicinesia, história familiar' },
    ],
    exames_recomendados: [
      'Avaliação clínica neurológica (UPDRS-III)',
      'RM de crânio (excluir lesões estruturais)',
      'DaTscan (DAT-SPECT) — se diagnóstico duvidoso',
      'Avaliação neuropsicológica',
      'Função renal (creatinina + TFGe)',
      'ECG (intervalo QTc)',
    ],
    fatores_prognosticos: [
      { fator: 'Resposta positiva a Levodopa-teste (confirma diagnóstico)', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'Início com tremor (forma trêmula — evolução mais lenta)', impacto: 'favoravel', magnitude: 'medio' },
      { fator: 'Ausência de demência nos primeiros 3 anos', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'Início acinético-rígido (forma axial — evolução mais rápida)', impacto: 'desfavoravel', magnitude: 'medio' },
      { fator: 'Alucinações com agonistas (trocar para Levodopa)', impacto: 'desfavoravel', magnitude: 'alto' },
    ],
    diretrizes: [
      { sociedade: 'MDS', ano: 2023, titulo: 'MDS Evidence-Based Medicine Review — PD Treatment', classe: 'IIa', nivel: 'B' },
      { sociedade: 'NICE', ano: 2017, titulo: 'NICE Guideline NG71 — Parkinson\'s disease in adults', classe: 'I', nivel: 'A' },
      { sociedade: 'ABN', ano: 2022, titulo: 'Academia Brasileira de Neurologia — Consenso de Parkinson', classe: 'IIa', nivel: 'B' },
    ],
    estudos_principais: [
      { nome: 'CALM-PD', ano: 2000, revista: 'JAMA', nnt: 8, descricao: 'Pramipexol versus Levodopa: menos discinesias em 4 anos, porém mais sonolência e alucinações' },
      { nome: 'RECOVER', ano: 2010, revista: 'Lancet Neurol', descricao: 'Pramipexol LP melhorou sono e SPI em Parkinson' },
    ],
    monitoramento: [
      { parametro: 'Escala UPDRS-III (motor)', frequencia: 'A cada 6 meses', alerta: 'Progressão > 5 pontos/ano = reavaliação do esquema' },
      { parametro: 'PA ortostática (deitado e em pé)', frequencia: 'A cada consulta', alerta: 'Queda > 20/10 mmHg = hipotensão ortostática clínica' },
      { parametro: 'Comportamentos impulsivos (jogo, hipersexualidade)', frequencia: 'A cada consulta (questionar diretamente)', alerta: 'Presença = reduzir/suspender agonista' },
      { parametro: 'Sonolência diurna excessiva (ESE)', frequencia: 'A cada 6 meses', alerta: 'ESE > 10 = suspender condução de veículos' },
      { parametro: 'Função renal', frequencia: 'Anual (ajuste de dose se TFGe < 30)' },
    ],
    marcas_eurofarma: ['PISA® LP (Dicloridrato de Pramipexol)'],
    tags: ['parkinson', 'agonista-dopaminergico', 'pramipexol', 'spi', 'neurologia'],
  },
  {
    id: 'endometriose-dienogeste',
    cids: ['N80', 'N80.0', 'N80.1'],
    condicao: 'Endometriose',
    conduta: 'Progestagênio — Dienogeste 2mg (PIETRA ED®)',
    hipotese_principal: 'Supressão da proliferação endometrial ectópica por progestagênio de 4ª geração com alta seletividade para receptor de progesterona e propriedades anti-inflamatórias locais',
    mecanismo_acao: 'Agonismo progestogênico com atividade antiandrogênica parcial; induz decidualização e atrofia do endométrio ectópico; reduz níveis de estradiol local via inibição da aromatase e supressão de IL-1β e TNF-α nos focos endometrióticos',
    achados_favoraveis: [
      { texto: 'Dismenorreia intensa (EVA > 7) refratária a AINE', peso: 'alto' },
      { texto: 'Diagnóstico histológico ou clínico-ultrassonográfico de endometriose', peso: 'alto' },
      { texto: 'Desejo de contracepção (efeito anticoncepcional adicional)', peso: 'medio' },
      { texto: 'Falha ou intolerância a pílula combinada', peso: 'alto' },
      { texto: 'Endometrioma ovariano < 4 cm (alternativa à cirurgia)', peso: 'medio' },
    ],
    achados_desfavoraveis: [
      { texto: 'Desejo de gravidez no curto prazo (retardo do retorno à fertilidade)', peso: 'alto' },
      { texto: 'Tromboembolismo venoso ativo', peso: 'alto' },
      { texto: 'Depressão grave (progestagênios podem agravar)', peso: 'medio' },
      { texto: 'Sangramento uterino anormal de causa não investigada', peso: 'alto' },
    ],
    diagnosticos_diferenciais: [
      { condicao: 'Adenomiose', probabilidade: 'alta', diferenciador: 'Útero globoso à palpação/USG, sem nódulos anexiais, RM' },
      { condicao: 'Síndrome do intestino irritável / DIE', probabilidade: 'media', diferenciador: 'Sintomas cíclicos, endometriose profunda retossigmóide na RM' },
      { condicao: 'DIP (doença inflamatória pélvica)', probabilidade: 'media', diferenciador: 'Febre, leucocitose, gradiente agudo — não cíclico' },
    ],
    exames_recomendados: [
      'USG transvaginal de alta resolução (endometriomas, DIE)',
      'CA-125 (útil para monitoramento, não diagnóstico)',
      'RM pélvica (endometriose profunda, mapeamento cirúrgico)',
      'Densitometria óssea (se uso > 24 meses)',
      'Pressão arterial basal',
    ],
    fatores_prognosticos: [
      { fator: 'Redução da dor em > 50% em 3 meses (EVA)', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'Amenorreia ou spotting (hipoestrogenismo terapêutico)', impacto: 'favoravel', magnitude: 'medio' },
      { fator: 'Redução/desaparecimento do endometrioma no USG em 6 meses', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'Sintomas depressivos (rastrear com PHQ-9)', impacto: 'desfavoravel', magnitude: 'medio' },
      { fator: 'Osteopenia pré-existente (monitorar DMO)', impacto: 'desfavoravel', magnitude: 'medio' },
    ],
    diretrizes: [
      { sociedade: 'ESHRE', ano: 2022, titulo: 'ESHRE Guideline Endometriosis 2022', classe: 'I', nivel: 'A' },
      { sociedade: 'FEBRASGO', ano: 2021, titulo: 'Diretriz Brasileira de Endometriose FEBRASGO 2021', classe: 'I', nivel: 'A' },
      { sociedade: 'ACOG', ano: 2023, titulo: 'ACOG Practice Bulletin 114 — Endometriosis', classe: 'I', nivel: 'A' },
    ],
    estudos_principais: [
      { nome: 'Strowitzki 2010', ano: 2010, revista: 'Hum Reprod', nnt: 4, descricao: 'Dienogeste 2mg superior ao placebo na dor de endometriose (EVA -3,5 vs -1,8)' },
      { nome: 'Harada 2009', ano: 2009, revista: 'Fertil Steril', nnt: 5, descricao: 'Dienogeste equivalente ao Leuprolide (GnRH-a) com melhor perfil ósseo e lipídico' },
      { nome: 'Momoeda 2009', ano: 2009, revista: 'J Obstet Gynaecol Res', descricao: 'Dienogeste reduziu escores de dor e lesões em endometriose profunda' },
    ],
    monitoramento: [
      { parametro: 'Escala de dor EVA', frequencia: 'A cada 3 meses', alerta: 'Redução < 30% em 6 meses = reavaliar diagnóstico ou combinar com análogo GnRH' },
      { parametro: 'Padrão de sangramento', frequencia: 'A cada consulta', alerta: 'Sangramento irregular esperado nos primeiros 3 meses; amenorreia no longo prazo' },
      { parametro: 'USG transvaginal (endometrioma)', frequencia: 'A cada 6 meses' },
      { parametro: 'DMO (densitometria)', frequencia: 'Após 24 meses de uso contínuo' },
      { parametro: 'Humor e qualidade de vida (PHQ-9)', frequencia: 'A cada 3 meses' },
    ],
    marcas_eurofarma: ['PIETRA ED® (Dienogeste 2mg)'],
    tags: ['endometriose', 'dienogeste', 'progestagênio', 'ginecologia', 'dor-pelvica'],
  },
  {
    id: 'alergica-rinite-montelucaste',
    cids: ['J30', 'J30.1', 'J45'],
    condicao: 'Rinite Alérgica / Asma leve com intolerância a AINEs',
    conduta: 'Antagonista de Leucotrienos — Montelucaste Sódico (PIEMONTE®)',
    hipotese_principal: 'Controle de inflamação mediada por leucotrienos em rinite alérgica e asma leve, especialmente na sensibilidade a AINEs (AERD — Doença Respiratória Exacerbada por Aspirina)',
    mecanismo_acao: 'Bloqueio do receptor CysLT1 de leucotrienos cisteínicos (LTC4, LTD4, LTE4) inibindo broncoespasmo, edema da mucosa e eosinofilia induzida por leucotrienos. Complementar ao ICS por mecanismo não glicocorticoide',
    achados_favoraveis: [
      { texto: 'Rinite alérgica sazonal ou perene com sintomas nasais e oculares', peso: 'alto' },
      { texto: 'Asma com sensibilidade a AINEs/Aspirina (AERD)', peso: 'alto' },
      { texto: 'Asma + rinite (fenótipo atópico combinado)', peso: 'alto' },
      { texto: 'Criança de 6 meses–5 anos com asma (sachê 4mg)', peso: 'alto' },
      { texto: 'Asma alérgica com falha parcial ao ICS', peso: 'medio' },
    ],
    achados_desfavoraveis: [
      { texto: 'Asma moderada-grave (insuficiente como monoterapia)', peso: 'alto' },
      { texto: 'Histórico de alterações neuropsiquiátricas (suicídio, sonhos vívidos — FDA black box 2020)', peso: 'alto' },
      { texto: 'Preferência de eficácia sobre rinite (anti-H1 é superior para sintomas nasais)', peso: 'medio' },
    ],
    diagnosticos_diferenciais: [
      { condicao: 'Rinite vasomotora (não alérgica)', probabilidade: 'media', diferenciador: 'IgE total normal, teste de puntura negativo, sem atopia' },
      { condicao: 'Polipose nasosinusal', probabilidade: 'media', diferenciador: 'Nasofibroscopia, TC de seios da face' },
    ],
    exames_recomendados: ['IgE total + RAST para aeroalérgenos', 'Teste de puntura (prick test)', 'Espirometria (se asma associada)', 'FeNO', 'Hemograma com eosinófilos'],
    fatores_prognosticos: [
      { fator: 'Controle de rinite com redução de rinorreia e espirros', impacto: 'favoravel', magnitude: 'alto' },
      { fator: 'Redução de uso de SABA em asma concomitante', impacto: 'favoravel', magnitude: 'medio' },
      { fator: 'Humor depressivo ou ansiedade prévia (monitorar FDA black box)', impacto: 'desfavoravel', magnitude: 'alto' },
    ],
    diretrizes: [
      { sociedade: 'ARIA', ano: 2021, titulo: 'ARIA 2021 Update — Allergic Rhinitis and its Impact on Asthma', classe: 'IIa', nivel: 'B' },
      { sociedade: 'GINA', ano: 2023, titulo: 'GINA 2023 — Adjuvante ao ICS em asma leve', classe: 'IIa', nivel: 'B' },
      { sociedade: 'SBAI', ano: 2023, titulo: 'Diretrizes Brasileiras de Rinite Alérgica', classe: 'I', nivel: 'A' },
    ],
    estudos_principais: [
      { nome: 'Knorr 1998', ano: 1998, revista: 'NEJM', nnt: 18, descricao: 'Montelucaste 10mg reduziu sintomas de asma e uso de beta-2 em adultos' },
      { nome: 'Price 2003', ano: 2003, revista: 'NEJM', descricao: 'Montelucaste equivalente a Fluticasona em asma leve na prática clínica real' },
      { nome: 'COMPACT', ano: 2004, revista: 'Lancet', descricao: 'ICS + Montelucaste superior a dobrar dose do ICS em asma moderada' },
    ],
    monitoramento: [
      { parametro: 'Sintomas de rinite (TNSS) e asma (ACT)', frequencia: 'A cada 4–8 semanas', alerta: 'Sem melhora em 4 semanas = reassessar diagnóstico' },
      { parametro: 'Humor, sono e comportamento (neuropsiquiátrico)', frequencia: 'A cada consulta — FDA Boxed Warning 2020', alerta: 'Alterações de humor, pesadelos, pensamentos suicidas = suspender imediatamente' },
      { parametro: 'Eosinófilos séricos', frequencia: 'Se eosinofilia progressiva (excluir EGPA)' },
    ],
    marcas_eurofarma: ['PIEMONTE® (Montelucaste Sódico 10mg adultos)', 'PIEMONTE® SACHÊ (Montelucaste 4mg pediátrico)'],
    tags: ['rinite', 'asma', 'montelucaste', 'antileucotrieno', 'atopia', 'aerd'],
  },
];

export function gerarExplicacao(cids: string[], _condutas?: string[]): RacionalTerapeutico[] {
  const cidsNorm = cids.map(c => c.toUpperCase().trim());
  return RACIONAIS_CLINICOS.filter(r =>
    r.cids.some(c => cidsNorm.includes(c.toUpperCase()))
  );
}

export function buscarRacional(query: string): RacionalTerapeutico[] {
  const q = query.toLowerCase();
  return RACIONAIS_CLINICOS.filter(r =>
    r.condicao.toLowerCase().includes(q) ||
    r.conduta.toLowerCase().includes(q) ||
    r.tags.some(t => t.includes(q)) ||
    r.cids.some(c => c.toLowerCase().includes(q))
  );
}

export function getRacionalById(id: string): RacionalTerapeutico | undefined {
  return RACIONAIS_CLINICOS.find(r => r.id === id);
}
