// ============================================================
// PRESCREVE-AI — Evidence Engine
// Diagnóstico → Diretriz → Terapia → Estudos
// ============================================================

'use client';

export type TipoEstudo =
  | 'rct'
  | 'meta_analise'
  | 'revisao_sistematica'
  | 'guideline'
  | 'consenso'
  | 'coorte'
  | 'registro';

export type NivelEv = 'A' | 'B' | 'C';
export type GrauRec = 'I' | 'IIa' | 'IIb' | 'III';
export type AreaTerapeutica = 'cardiologia' | 'endocrinologia' | 'pneumologia' | 'nefrologia' | 'psiquiatria';

// ─── Estudo individual ────────────────────────────────────────

export interface Estudo {
  id: string;
  nome: string;             // SPRINT, UKPDS-34, PARADIGM-HF…
  tipo: TipoEstudo;
  titulo_completo: string;
  autores: string;
  ano: number;
  revista: string;
  doi?: string;
  pmid?: string;
  n_pacientes: number;
  duracao_seguimento: string;
  populacao: string;
  desfecho_primario: string;
  desfecho_secundario?: string;
  // Resultado
  resultado_principal: string;
  reducao_risco_relativo?: string;
  reducao_risco_absoluto?: string;
  nnt?: number;
  nnh?: number;             // number needed to harm
  p_value?: string;
  hr?: string;              // hazard ratio
  // Qualidade
  nivel: NivelEv;
  grau: GrauRec;
  cego?: 'aberto' | 'simples_cego' | 'duplo_cego' | 'triplo_cego';
  randomizado: boolean;
  multicentrico: boolean;
  // Benefícios e riscos
  beneficios: string[];
  riscos: string[];
  limitacoes: string[];
  // Contexto clínico
  populacao_excluida?: string[];
  subgrupos_beneficiados?: string[];
}

// ─── Terapia com seus estudos ─────────────────────────────────

export interface TerapiaEvidencia {
  id: string;
  nome: string;             // 'Metformina', 'SGLT-2', 'Sacubitril/Valsartana'
  classe: string;           // 'Biguanida', 'ISGLT2', 'ARNI'
  mecanismo: string;
  indicacao_principal: string;
  nivel_geral: NivelEv;
  grau_geral: GrauRec;
  estudos: Estudo[];
  // Resumo agregado
  total_pacientes: number;  // calculado
  beneficio_resumo: string;
  risco_resumo: string;
  contraindicacoes: string[];
  monitoramento: string[];
}

// ─── Diretriz que agrupa terapias ────────────────────────────

export interface DiretrizEvidencia {
  id: string;
  sigla: string;
  titulo: string;
  sociedade: string;
  ano: number;
  url_oficial?: string;
  terapias: TerapiaEvidencia[];
}

// ─── Diagnóstico (raiz da hierarquia) ────────────────────────

export interface DiagnosticoEvidencia {
  id: string;
  nome: string;
  cid10: string;
  area: AreaTerapeutica;
  prevalencia_br?: string;
  mortalidade?: string;
  resumo_clinico: string;
  diretrizes: DiretrizEvidencia[];
}

// ─── Seeds ───────────────────────────────────────────────────

export const EVIDENCE_DB: DiagnosticoEvidencia[] = [

  // ══════════════════════════════════════════════════════════
  // HAS
  // ══════════════════════════════════════════════════════════
  {
    id: 'has',
    nome: 'Hipertensão Arterial Sistêmica',
    cid10: 'I10',
    area: 'cardiologia',
    prevalencia_br: '32,5% dos adultos (~36 milhões)',
    mortalidade: 'Principal fator de risco CV — 40% dos óbitos por AVC e 25% por IAM',
    resumo_clinico: 'Principal fator de risco modificável para doenças cardiovasculares, AVC, DRC e IC. Meta pressórica < 130/80 mmHg para maioria dos adultos com base em evidências de alto nível.',
    diretrizes: [
      {
        id: 'dbha7',
        sigla: 'DBHA-7 / SBC 2020',
        titulo: '7ª Diretriz Brasileira de Hipertensão Arterial',
        sociedade: 'Sociedade Brasileira de Cardiologia (SBC)',
        ano: 2020,
        url_oficial: 'https://doi.org/10.36660/abc.20201238',
        terapias: [
          {
            id: 'ieca-has',
            nome: 'IECA (Enalapril, Ramipril, Lisinopril)',
            classe: 'Inibidor da ECA',
            mecanismo: 'Inibição da conversão de angiotensina I → II, reduzindo vasoconstrição e retenção de sódio/água',
            indicacao_principal: 'HAS + DM2, HAS + DRC, HAS + IC, HAS + IAM prévio',
            nivel_geral: 'A',
            grau_geral: 'I',
            beneficio_resumo: 'Redução de 20–25% em eventos cardiovasculares maiores, nefroproteção em DM2 e DRC',
            risco_resumo: 'Tosse seca em 10–15% (maior em asiáticos), angioedema raro (0,1–0,5%), hiperpotassemia',
            contraindicacoes: ['Gravidez (Categoria D)', 'Angioedema prévio por IECA', 'Estenose bilateral de artéria renal', 'Hiperpotassemia grave (K+ > 5,5 mEq/L)'],
            monitoramento: ['Creatinina + K+ em 1–2 semanas após início', 'PA ortostática nas 4 primeiras semanas', 'Tosse — considerar troca por BRA'],
            total_pacientes: 0,
            estudos: [
              {
                id: 'hope',
                nome: 'HOPE',
                tipo: 'rct',
                titulo_completo: 'Effects of an Angiotensin-Converting–Enzyme Inhibitor, Ramipril, on Cardiovascular Events in High-Risk Patients',
                autores: 'Yusuf S, Sleight P, Pogue J, et al.',
                ano: 2000,
                revista: 'NEJM',
                doi: '10.1056/NEJM200001203420301',
                pmid: '10639539',
                n_pacientes: 9297,
                duracao_seguimento: '5 anos',
                populacao: 'Adultos ≥ 55 anos com alto risco CV (DAC, AVC, DM + fator de risco)',
                desfecho_primario: 'Morte CV + IAM + AVC',
                resultado_principal: 'Ramipril 10 mg/dia reduziu desfecho primário em 22% vs. placebo',
                reducao_risco_relativo: '22%',
                reducao_risco_absoluto: '3,8%',
                nnt: 26,
                p_value: '< 0,001',
                hr: '0,78',
                nivel: 'A', grau: 'I',
                randomizado: true, multicentrico: true, cego: 'duplo_cego',
                beneficios: ['Redução de 26% em IAM', 'Redução de 32% em AVC', 'Redução de 24% em morte CV', 'Redução de 24% em insuficiência cardíaca'],
                riscos: ['Tosse (7,3% vs. 1,8% placebo)', 'Hipotensão sintomática (1,9%)'],
                limitacoes: ['Maioria homens (73%)', 'Seguimento limitado a 5 anos', 'Não compara com outros anti-hipertensivos'],
                populacao_excluida: ['Insuficiência cardíaca com baixa FEVE', 'PA sistólica < 100 mmHg'],
                subgrupos_beneficiados: ['DM2 (maior benefício relativo)', 'Disfunção renal leve a moderada'],
              },
              {
                id: 'sprint',
                nome: 'SPRINT',
                tipo: 'rct',
                titulo_completo: 'A Randomized Trial of Intensive versus Standard Blood-Pressure Control',
                autores: 'Wright JT Jr, Williamson JD, Whelton PK, et al.',
                ano: 2015,
                revista: 'NEJM',
                doi: '10.1056/NEJMoa1511939',
                pmid: '26551272',
                n_pacientes: 9361,
                duracao_seguimento: '3,3 anos (interrompido precocemente)',
                populacao: 'Adultos ≥ 50 anos, PAS ≥ 130 mmHg, risco CV aumentado (sem DM2)',
                desfecho_primario: 'IAM, SCA, AVC, IC ou morte CV',
                desfecho_secundario: 'Morte por qualquer causa, DRC',
                resultado_principal: 'Meta < 120 mmHg reduziu desfecho primário em 25% vs. meta < 140 mmHg',
                reducao_risco_relativo: '25%',
                reducao_risco_absoluto: '1,64% ao ano',
                nnt: 61,
                p_value: '< 0,001',
                hr: '0,75',
                nivel: 'A', grau: 'I',
                randomizado: true, multicentrico: true, cego: 'aberto',
                beneficios: ['Redução de 43% em IC', 'Redução de 27% em morte CV', 'Redução de 25% em mortalidade geral', 'Benefício consistente em idosos'],
                riscos: ['Hipotensão (2,4% vs. 1,4%)', 'Síncope (2,3% vs. 1,7%)', 'Eletrólitos alterados (3,1% vs. 2,3%)', 'IRA transitória (4,4% vs. 2,6%)'],
                limitacoes: ['Sem DM2 (ACCORD mostrou diferença)', 'Medição automática de PA (underestimation)', 'Não avaliou AVC separadamente', 'Seguimento curto'],
                populacao_excluida: ['DM2', 'AVC prévio', 'TFG < 20 mL/min', 'Proteinúria > 1 g/dia'],
                subgrupos_beneficiados: ['Idosos ≥ 75 anos', 'DRC (TFG 20–60)', 'Alto risco CV basal'],
              },
              {
                id: 'ettehad-meta',
                nome: 'Ettehad et al. (Meta-análise)',
                tipo: 'meta_analise',
                titulo_completo: 'Blood pressure lowering for prevention of cardiovascular disease and death: a systematic review and meta-analysis',
                autores: 'Ettehad D, Emdin CA, Kiran A, et al.',
                ano: 2016,
                revista: 'Lancet',
                doi: '10.1016/S0140-6736(15)01225-8',
                pmid: '26724178',
                n_pacientes: 344716,
                duracao_seguimento: 'Pool de 123 ECRs',
                populacao: 'Adultos com hipertensão ou risco CV aumentado',
                desfecho_primario: 'Eventos cardiovasculares maiores (MACE)',
                resultado_principal: 'Cada 10 mmHg de redução sistólica reduz MACE em 20%, AVC em 27%, DCV em 28%',
                reducao_risco_relativo: '20% por 10 mmHg sistólica',
                nivel: 'A', grau: 'I',
                randomizado: true, multicentrico: true,
                beneficios: ['Efeito dose-resposta linear', 'Benefício independente da PA basal ≥ 130 mmHg', 'Todas as classes anti-hipertensivas eficazes'],
                riscos: ['Maior risco de hipotensão com intensificação'],
                limitacoes: ['Heterogeneidade entre estudos', 'Diferenças na definição de desfechos'],
              },
            ],
          },
          {
            id: 'bra-has',
            nome: 'BRA (Losartana, Valsartana, Telmisartana)',
            classe: 'Bloqueador do Receptor AT1',
            mecanismo: 'Bloqueio do receptor AT1 da angiotensina II — vasodilatação sem produção de bradicinina (sem tosse)',
            indicacao_principal: 'HAS com intolerância ao IECA (tosse), HAS + DM2 + nefropatia, HAS + IC',
            nivel_geral: 'A',
            grau_geral: 'I',
            beneficio_resumo: 'Eficácia anti-hipertensiva equivalente ao IECA, com melhor tolerabilidade (sem tosse)',
            risco_resumo: 'Hiperpotassemia, piora de função renal, angioedema (raro, < 0,1% — menor que IECA)',
            contraindicacoes: ['Gravidez (Categoria D)', 'Estenose bilateral de artéria renal', 'Hiperpotassemia grave'],
            monitoramento: ['Creatinina + K+ em 1–2 semanas', 'Não combinar com IECA (risco de hiperpotassemia e IRA)'],
            total_pacientes: 0,
            estudos: [
              {
                id: 'renaal',
                nome: 'RENAAL',
                tipo: 'rct',
                titulo_completo: 'Effects of Losartan on Renal and Cardiovascular Outcomes in Patients with Type 2 Diabetes and Nephropathy',
                autores: 'Brenner BM, Cooper ME, de Zeeuw D, et al.',
                ano: 2001,
                revista: 'NEJM',
                doi: '10.1056/NEJMoa011161',
                pmid: '11565518',
                n_pacientes: 1513,
                duracao_seguimento: '3,4 anos',
                populacao: 'DM2 com nefropatia (proteinúria + creatinina elevada)',
                desfecho_primario: 'Duplicação de creatinina, DRCT ou morte',
                resultado_principal: 'Losartana reduziu desfecho renal composto em 16% vs. placebo (tratamento padrão)',
                reducao_risco_relativo: '16%',
                nnt: 11,
                p_value: '0,02',
                hr: '0,84',
                nivel: 'A', grau: 'I',
                randomizado: true, multicentrico: true, cego: 'duplo_cego',
                beneficios: ['Redução de 25% em DRCT', 'Redução de 33% em proteinúria', 'Nefroproteção independente do efeito anti-hipertensivo'],
                riscos: ['Hiperpotassemia (3,3% vs. 0,9%)', 'Elevação de creatinina transitória'],
                limitacoes: ['Apenas DM2 com nefropatia', 'Não compara diretamente com IECA'],
              },
            ],
          },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // DM2
  // ══════════════════════════════════════════════════════════
  {
    id: 'dm2',
    nome: 'Diabetes Mellitus tipo 2',
    cid10: 'E11',
    area: 'endocrinologia',
    prevalencia_br: '15,7% dos adultos (~16,8 milhões)',
    mortalidade: '5ª causa de morte no Brasil — principal causa de DRC e amputação não traumática',
    resumo_clinico: 'Doença metabólica crônica com resistência à insulina e disfunção de célula β. Abordagem centrada na redução de risco cardiovascular e renal, além do controle glicêmico.',
    diretrizes: [
      {
        id: 'ada2024',
        sigla: 'ADA 2024',
        titulo: 'Standards of Medical Care in Diabetes 2024',
        sociedade: 'American Diabetes Association (ADA)',
        ano: 2024,
        terapias: [
          {
            id: 'metformina',
            nome: 'Metformina',
            classe: 'Biguanida',
            mecanismo: 'Inibição da gliconeogênese hepática e melhora da sensibilidade periférica à insulina via AMPK',
            indicacao_principal: 'DM2 — 1ª linha em todos os pacientes sem contraindicação',
            nivel_geral: 'A',
            grau_geral: 'I',
            beneficio_resumo: 'Redução de HbA1c de 1–2%, neutro/favorável em peso, benefício CV em UKPDS, custo extremamente baixo',
            risco_resumo: 'Intolerância GI em 20–30% (diarreia, náusea — menor com XR), deficiência de B12 a longo prazo, acidose lática (raríssima)',
            contraindicacoes: ['TFG < 30 mL/min/1,73m²', 'Acidose metabólica', 'Contraste iodado: suspender 48h antes'],
            monitoramento: ['B12 anual após 4 anos de uso', 'Creatinina/TFG semestral', 'Reduzir dose se TFG 30–45'],
            total_pacientes: 0,
            estudos: [
              {
                id: 'ukpds34',
                nome: 'UKPDS 34',
                tipo: 'rct',
                titulo_completo: 'Effect of intensive blood-glucose control with metformin on complications in overweight patients with type 2 diabetes',
                autores: 'UK Prospective Diabetes Study (UKPDS) Group',
                ano: 1998,
                revista: 'Lancet',
                doi: '10.1016/S0140-6736(98)07037-8',
                pmid: '9742977',
                n_pacientes: 1704,
                duracao_seguimento: '10,7 anos',
                populacao: 'DM2 recém-diagnosticado com sobrepeso (IMC médio 31 kg/m²)',
                desfecho_primario: 'Qualquer desfecho relacionado ao DM2 (IAM, AVC, amputação, morte)',
                desfecho_secundario: 'Mortalidade geral, mortalidade relacionada ao DM2',
                resultado_principal: 'Metformina reduziu qualquer endpoint do DM2 em 32% vs. tratamento convencional',
                reducao_risco_relativo: '32%',
                reducao_risco_absoluto: '6,7%',
                nnt: 14,
                p_value: '0,0023',
                nivel: 'A', grau: 'I',
                randomizado: true, multicentrico: true, cego: 'aberto',
                beneficios: ['Redução de 36% em mortalidade geral', 'Redução de 39% em IAM', 'Neutro em peso', 'Sem hipoglicemia grave', 'Custo muito baixo'],
                riscos: ['Intolerância GI (20–30%)', 'Deficiência de B12 a longo prazo (7–30%)'],
                limitacoes: ['Estudo antigo (1998) — padrão de cuidado era diferente', 'Sem comparador ativo moderno', 'Apenas DM2 com sobrepeso'],
                populacao_excluida: ['TFG < 30', 'DM1', 'Cetoacidose'],
                subgrupos_beneficiados: ['Sobrepeso/Obesidade', 'Diagnóstico recente'],
              },
              {
                id: 'meta-metformina',
                nome: 'Revisão Cochrane — Metformina',
                tipo: 'revisao_sistematica',
                titulo_completo: 'Metformin for type 2 diabetes mellitus: systematic review and meta-analysis',
                autores: 'Saenz A, Fernandez-Esteban I, Mataix A, et al.',
                ano: 2005,
                revista: 'Cochrane Database Syst Rev',
                doi: '10.1002/14651858.CD002966.pub3',
                pmid: '16034881',
                n_pacientes: 8845,
                duracao_seguimento: 'Pool de 29 ECRs',
                populacao: 'DM2 adultos',
                desfecho_primario: 'HbA1c, mortalidade, eventos CV',
                resultado_principal: 'Redução de HbA1c de 1,0–1,5% vs. placebo; superior às sulfonilureias em mortalidade',
                reducao_risco_relativo: 'HbA1c: -1,0 a -1,5% absoluto',
                nivel: 'A', grau: 'I',
                randomizado: true, multicentrico: true,
                beneficios: ['Eficácia glicêmica sólida', 'Superior em mortalidade vs. sulfonilureias', 'Favorável em peso vs. insulina e sulfonilureias'],
                riscos: ['GI em 20–30%', 'B12 reduzida'],
                limitacoes: ['Heterogeneidade entre estudos', 'Desfechos cardiovasculares secundários'],
              },
            ],
          },
          {
            id: 'sglt2-dm2',
            nome: 'SGLT-2 (Empagliflozina, Dapagliflozina, Canagliflozina)',
            classe: 'Inibidor SGLT-2',
            mecanismo: 'Inibição do cotransportador SGLT-2 no túbulo proximal renal → glicosúria, natriurese, redução de pré e pós-carga, efeito hemodinâmico cardiorrenal',
            indicacao_principal: 'DM2 + DCV estabelecida, DM2 + IC, DM2 + DRC (TFG ≥ 20), também independente do controle glicêmico',
            nivel_geral: 'A',
            grau_geral: 'I',
            beneficio_resumo: 'Redução de hospitalização por IC em 30%, progressão de DRC em 45%, morte CV em 14% — efeitos independentes do controle glicêmico',
            risco_resumo: 'Infecção genital fúngica (10%), ITU (rara), cetoacidose euglicêmica (rara), amputação com canagliflozina (CANVAS)',
            contraindicacoes: ['TFG < 20 mL/min (início)', 'DM1 (off-label exceto dapagliflozina)', 'Infecção urinária ativa'],
            monitoramento: ['TFG antes do início e semestralmente', 'Glicemia (risco de cetoacidose em jejum prolongado)', 'Avaliar genitália para candidíase'],
            total_pacientes: 0,
            estudos: [
              {
                id: 'empa-reg',
                nome: 'EMPA-REG OUTCOME',
                tipo: 'rct',
                titulo_completo: 'Empagliflozin, Cardiovascular Outcomes, and Mortality in Type 2 Diabetes',
                autores: 'Zinman B, Wanner C, Lachin JM, et al.',
                ano: 2015,
                revista: 'NEJM',
                doi: '10.1056/NEJMoa1504720',
                pmid: '26378978',
                n_pacientes: 7020,
                duracao_seguimento: '3,1 anos',
                populacao: 'DM2 com DCV estabelecida',
                desfecho_primario: 'MACE (morte CV + IAM + AVC)',
                desfecho_secundario: 'Hospitalização por IC, progressão de nefropatia, morte geral',
                resultado_principal: 'Empagliflozina reduziu MACE em 14% e morte CV em 38% vs. placebo',
                reducao_risco_relativo: '14% em MACE, 38% em morte CV',
                nnt: 39,
                p_value: '0,04 (MACE), < 0,001 (morte CV)',
                hr: '0,86 (MACE), 0,62 (morte CV)',
                nivel: 'A', grau: 'I',
                randomizado: true, multicentrico: true, cego: 'duplo_cego',
                beneficios: ['Redução de 35% em hospitalização por IC', 'Redução de 39% em progressão de nefropatia', 'Neutro/favorável em peso', 'Início de ação precoce (semanas)'],
                riscos: ['Infecção genital (6,4% vs. 1,8%)', 'Cetoacidose euglicêmica (rara)', 'Hipotensão (sinergia com diuréticos)'],
                limitacoes: ['Apenas DM2 com DCV estabelecida', 'Raça predominantemente branca', 'Sem pacientes com TFG < 30'],
                subgrupos_beneficiados: ['IC com redução de FEVE', 'DRC moderada', 'Idosos com DCV'],
              },
              {
                id: 'dapa-ckd',
                nome: 'DAPA-CKD',
                tipo: 'rct',
                titulo_completo: 'Dapagliflozin in Patients with Chronic Kidney Disease',
                autores: 'Heerspink HJL, Stefansson BV, Correa-Rotter R, et al.',
                ano: 2020,
                revista: 'NEJM',
                doi: '10.1056/NEJMoa2024816',
                pmid: '32970396',
                n_pacientes: 4304,
                duracao_seguimento: '2,4 anos (interrompido precocemente)',
                populacao: 'DRC (TFG 25–75, albuminúria) com ou sem DM2',
                desfecho_primario: 'Declínio ≥ 50% TFG, DRCT, morte renal ou CV',
                resultado_principal: 'Dapagliflozina reduziu desfecho primário em 39% — efeito em DM2 e não-DM2',
                reducao_risco_relativo: '39%',
                nnt: 19,
                p_value: '< 0,001',
                hr: '0,61',
                nivel: 'A', grau: 'I',
                randomizado: true, multicentrico: true, cego: 'duplo_cego',
                beneficios: ['Redução de 29% em morte CV + hospitalização IC', 'Efeito em não-diabéticos', 'Redução de mortalidade geral (31%)'],
                riscos: ['Cetoacidose em DM2 (< 0,1%)', 'Depleção de volume'],
                limitacoes: ['TFG mínima 25 — sem dados abaixo', 'Maioria raça branca ou asiática'],
                subgrupos_beneficiados: ['DRC com proteinúria', 'Sem DM2 (efeito preservado)', 'IC concomitante'],
              },
              {
                id: 'canvas',
                nome: 'CANVAS Program',
                tipo: 'rct',
                titulo_completo: 'Canagliflozin and Cardiovascular and Renal Events in Type 2 Diabetes',
                autores: 'Neal B, Perkovic V, Mahaffey KW, et al.',
                ano: 2017,
                revista: 'NEJM',
                doi: '10.1056/NEJMoa1611925',
                pmid: '28605608',
                n_pacientes: 10142,
                duracao_seguimento: '188 semanas',
                populacao: 'DM2 com DCV ou alto risco CV',
                desfecho_primario: 'MACE',
                resultado_principal: 'Canagliflozina reduziu MACE em 14% porém aumentou amputação de membros inferiores (6,3 vs. 3,4/1000 pacientes-ano)',
                reducao_risco_relativo: '14% em MACE',
                nnt: 23,
                hr: '0,86',
                nivel: 'A', grau: 'I',
                randomizado: true, multicentrico: true, cego: 'duplo_cego',
                beneficios: ['Redução de MACE e de progressão renal', 'Redução de 40% em hospitalização IC'],
                riscos: ['Amputação de MMII (dobro do risco — especialmente pé diabético)', 'Fraturas ósseas (1,55x)', 'Infecção genital'],
                limitacoes: ['Sinal de amputação limita uso em pé diabético', 'Dois estudos poolados com metodologias diferentes'],
                populacao_excluida: ['Histórico de amputação', 'Doença vascular periférica grave'],
                subgrupos_beneficiados: ['Sem doença vascular periférica', 'DRC concomitante'],
              },
            ],
          },
          {
            id: 'glp1-dm2',
            nome: 'GLP-1 RA (Semaglutida, Liraglutida, Dulaglutida)',
            classe: 'Agonista do Receptor de GLP-1',
            mecanismo: 'Mimetismo do GLP-1 — potencia secreção de insulina glicose-dependente, inibe glucagon, retarda esvaziamento gástrico, reduz apetite central',
            indicacao_principal: 'DM2 + DCV estabelecida, DM2 + obesidade (IMC ≥ 30), redução de peso independente do DM2 (semaglutida 2,4 mg)',
            nivel_geral: 'A',
            grau_geral: 'I',
            beneficio_resumo: 'Redução de HbA1c de 1–2%, perda ponderal de 5–15 kg, redução de MACE em 12–26%, redução de AVC',
            risco_resumo: 'Náusea/vômito em 10–30% (transitório), pancreatite (rara), contraindicado em neoplasia medular de tireoide',
            contraindicacoes: ['História pessoal/familiar de carcinoma medular de tireoide', 'NEM tipo 2', 'TGO < 15 mL/min (semaglutida oral — não injetável)'],
            monitoramento: ['Peso e IMC mensalmente', 'Lipase/amilase se dor abdominal', 'Função renal (melhora indireta pela perda ponderal)'],
            total_pacientes: 0,
            estudos: [
              {
                id: 'leader',
                nome: 'LEADER',
                tipo: 'rct',
                titulo_completo: 'Liraglutide and Cardiovascular Outcomes in Type 2 Diabetes',
                autores: 'Marso SP, Daniels GH, Brown-Frandsen K, et al.',
                ano: 2016,
                revista: 'NEJM',
                doi: '10.1056/NEJMoa1603827',
                pmid: '27295427',
                n_pacientes: 9340,
                duracao_seguimento: '3,8 anos',
                populacao: 'DM2 ≥ 50 anos com DCV ou ≥ 60 anos com fator de risco CV',
                desfecho_primario: 'MACE',
                resultado_principal: 'Liraglutida reduziu MACE em 13% vs. placebo',
                reducao_risco_relativo: '13%',
                nnt: 66,
                hr: '0,87',
                p_value: '0,01',
                nivel: 'A', grau: 'I',
                randomizado: true, multicentrico: true, cego: 'duplo_cego',
                beneficios: ['Redução de 22% em morte CV', 'Perda ponderal (2,3 kg vs. placebo)', 'Redução de nefropatia (22%)'],
                riscos: ['Náusea (17,8% vs. 9,7%)', 'Pancreatite (0,4% vs. 0,2%)', 'FC aumentada (+3 bpm)'],
                limitacoes: ['Alto custo', 'Sem dados em TFG < 15', 'Apenas pacientes de alto risco CV'],
              },
              {
                id: 'select',
                nome: 'SELECT',
                tipo: 'rct',
                titulo_completo: 'Semaglutide and Cardiovascular Outcomes in Obesity without Diabetes',
                autores: 'Lincoff AM, Brown-Frandsen K, Colhoun HM, et al.',
                ano: 2023,
                revista: 'NEJM',
                doi: '10.1056/NEJMoa2307563',
                pmid: '37952131',
                n_pacientes: 17604,
                duracao_seguimento: '39,8 meses',
                populacao: 'Adultos sem DM2, IMC ≥ 27 kg/m² + DCV estabelecida',
                desfecho_primario: 'MACE',
                resultado_principal: 'Semaglutida 2,4 mg reduziu MACE em 20% em não-diabéticos com obesidade e DCV',
                reducao_risco_relativo: '20%',
                nnt: 27,
                hr: '0,80',
                p_value: '< 0,001',
                nivel: 'A', grau: 'I',
                randomizado: true, multicentrico: true, cego: 'duplo_cego',
                beneficios: ['Redução de 19% em morte CV', 'Perda ponderal de 9,4 kg vs. 0,9 kg', 'Benefício em não-diabéticos — expansão de indicação'],
                riscos: ['Náusea (44% vs. 16%)', 'Vômitos (25% vs. 6%)', 'Descontinuação por EAs GI (16% vs. 6%)'],
                limitacoes: ['Todos com DCV estabelecida — sem prevenção primária', 'Alto custo (> R$ 1.500/mês)', 'Disponibilidade limitada no Brasil'],
                subgrupos_beneficiados: ['Obesidade grau II/III', 'IC concomitante', 'DCV com IMC ≥ 35'],
              },
            ],
          },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // ICC
  // ══════════════════════════════════════════════════════════
  {
    id: 'icc',
    nome: 'Insuficiência Cardíaca com FE Reduzida (ICFEr)',
    cid10: 'I50.0',
    area: 'cardiologia',
    prevalencia_br: '2–3% da população adulta — 2 milhões de pacientes',
    mortalidade: 'Mortalidade em 5 anos de 50% sem tratamento adequado',
    resumo_clinico: 'Síndrome clínica com sintomas de IC e FEVE ≤ 40%. Tratamento baseado no quarteto terapêutico: IECA/ARNI + betabloqueador + ARM + SGLT-2. Cada pilar reduz mortalidade de forma aditiva.',
    diretrizes: [
      {
        id: 'esc-hf-2021',
        sigla: 'ESC-HF 2021',
        titulo: 'ESC Guidelines for the Diagnosis and Treatment of Acute and Chronic Heart Failure',
        sociedade: 'European Society of Cardiology (ESC)',
        ano: 2021,
        url_oficial: 'https://doi.org/10.1093/eurheartj/ehab368',
        terapias: [
          {
            id: 'arni-icc',
            nome: 'ARNI (Sacubitril/Valsartana)',
            classe: 'Inibidor da Neprilisina + BRA',
            mecanismo: 'Inibição da neprilisina (↑ peptídeos natriuréticos) + bloqueio AT1 — vasodilatação, natriurese, anti-remodelamento',
            indicacao_principal: 'ICFEr sintomática (NYHA II-IV) tolerante ao IECA/BRA — substitui IECA/BRA',
            nivel_geral: 'A',
            grau_geral: 'I',
            beneficio_resumo: 'Redução de morte CV + hospitalização IC em 20% vs. enalapril — maior benefício que qualquer IECA',
            risco_resumo: 'Hipotensão (14% vs. 9%), angioedema (0,4% — não combinar com IECA: washout de 36h), hiperpotassemia',
            contraindicacoes: ['Uso concomitante com IECA (risco de angioedema)', 'TFG < 30 mL/min', 'Hiperpotassemia grave', 'Gravidez'],
            monitoramento: ['PA (risco de hipotensão)', 'K+ e creatinina em 1–2 semanas', 'Washout de 36h ao trocar IECA → ARNI'],
            total_pacientes: 0,
            estudos: [
              {
                id: 'paradigm-hf',
                nome: 'PARADIGM-HF',
                tipo: 'rct',
                titulo_completo: 'Angiotensin–Neprilysin Inhibition versus Enalapril in Heart Failure',
                autores: 'McMurray JJV, Packer M, Desai AS, et al.',
                ano: 2014,
                revista: 'NEJM',
                doi: '10.1056/NEJMoa1409077',
                pmid: '25176015',
                n_pacientes: 8442,
                duracao_seguimento: '27 meses (interrompido precocemente)',
                populacao: 'ICFEr (FEVE ≤ 40%), NYHA II-IV, BNP elevado, tolerante ao IECA',
                desfecho_primario: 'Morte CV ou hospitalização por IC',
                desfecho_secundario: 'Morte geral, sintomas (KCCQ), função renal',
                resultado_principal: 'Sacubitril/valsartana reduziu morte CV + hospitalização IC em 20% vs. enalapril',
                reducao_risco_relativo: '20%',
                reducao_risco_absoluto: '4,7%',
                nnt: 21,
                hr: '0,80',
                p_value: '< 0,001',
                nivel: 'A', grau: 'I',
                randomizado: true, multicentrico: true, cego: 'duplo_cego',
                beneficios: ['Redução de 16% em morte geral', 'Redução de 21% em hospitalização IC', 'Melhora de qualidade de vida (KCCQ)', 'Redução de NTproBNP', 'Redução de progressão para DRC'],
                riscos: ['Hipotensão sintomática (14% vs. 9%)', 'Angioedema (0,4% vs. 0,2%)', 'Hiperpotassemia (11,6% vs. 14% — menor que enalapril)'],
                limitacoes: ['Apenas tolerantes ao IECA (run-in period excluiu intolerantes)', 'Sem pacientes com FEVE > 40%', 'Custo elevado'],
                subgrupos_beneficiados: ['FEVE 36–40% (benefício maior)', 'Mulheres', 'DM2 concomitante'],
              },
            ],
          },
          {
            id: 'sglt2-icc',
            nome: 'SGLT-2 na IC (Dapagliflozina, Empagliflozina)',
            classe: 'Inibidor SGLT-2 — 4º pilar do quarteto',
            mecanismo: 'Natriurese osmótica, redução de pré-carga, melhora da eficiência mitocondrial, efeito anti-inflamatório miocárdico',
            indicacao_principal: 'ICFEr (FEVE ≤ 40%) independente de DM2 — Classe I ESC 2021',
            nivel_geral: 'A',
            grau_geral: 'I',
            beneficio_resumo: 'Redução de piora IC + morte CV em 25–26% — efeito independente da glicemia e do DM2',
            risco_resumo: 'Depleção de volume (sinergia com diuréticos), infecção genital, cetoacidose euglicêmica (rara)',
            contraindicacoes: ['TFG < 20 mL/min', 'DM1 (exceto off-label)', 'Hipotensão grave'],
            monitoramento: ['TFG e eletrólitos antes e após início', 'Sinais de depleção de volume', 'Glicemia em DM2 (risco de hipoglicemia com insulina)'],
            total_pacientes: 0,
            estudos: [
              {
                id: 'dapa-hf',
                nome: 'DAPA-HF',
                tipo: 'rct',
                titulo_completo: 'Dapagliflozin in Patients with Heart Failure and Reduced Ejection Fraction',
                autores: 'McMurray JJV, Solomon SD, Inzucchi SE, et al.',
                ano: 2019,
                revista: 'NEJM',
                doi: '10.1056/NEJMoa1911303',
                pmid: '31535829',
                n_pacientes: 4744,
                duracao_seguimento: '18,2 meses',
                populacao: 'ICFEr (FEVE ≤ 40%), NYHA II-IV, com e sem DM2',
                desfecho_primario: 'Piora IC (hospitalização/visita urgente) + morte CV',
                resultado_principal: 'Dapagliflozina reduziu desfecho primário em 26% — efeito igual em DM2 e não-DM2',
                reducao_risco_relativo: '26%',
                reducao_risco_absoluto: '5%',
                nnt: 21,
                hr: '0,74',
                p_value: '< 0,001',
                nivel: 'A', grau: 'I',
                randomizado: true, multicentrico: true, cego: 'duplo_cego',
                beneficios: ['Redução de 18% em morte CV', 'Melhora de sintomas (KCCQ > 5 pts)', 'Efeito em não-diabéticos — novo paradigma', 'Redução de mortalidade geral (17%)'],
                riscos: ['Volume depletion (7,5% vs. 6,8%)', 'Infecção genital (0,9% vs. 0,4%)', 'Cetoacidose (< 0,1%)'],
                limitacoes: ['Sem dados em FEVE > 40%', 'Seguimento relativamente curto', 'Poucos pacientes com TFG < 30'],
                subgrupos_beneficiados: ['Sem DM2 (efeito equivalente)', 'Idosos', 'DRC moderada'],
              },
              {
                id: 'emperor-reduced',
                nome: 'EMPEROR-Reduced',
                tipo: 'rct',
                titulo_completo: 'Cardiovascular and Renal Outcomes with Empagliflozin in Heart Failure',
                autores: 'Packer M, Anker SD, Butler J, et al.',
                ano: 2020,
                revista: 'NEJM',
                doi: '10.1056/NEJMoa2022190',
                pmid: '32865377',
                n_pacientes: 3730,
                duracao_seguimento: '16 meses',
                populacao: 'ICFEr (FEVE ≤ 40%), NYHA II-IV',
                desfecho_primario: 'Morte CV + hospitalização por IC',
                resultado_principal: 'Empagliflozina reduziu morte CV + hospitalização IC em 25%',
                reducao_risco_relativo: '25%',
                nnt: 19,
                hr: '0,75',
                p_value: '< 0,001',
                nivel: 'A', grau: 'I',
                randomizado: true, multicentrico: true, cego: 'duplo_cego',
                beneficios: ['Redução de 30% em hospitalizações IC', 'Redução de declínio de TFG (efeito renoprotector independente)', 'Efeito independente de DM2'],
                riscos: ['Hipotensão', 'Infecção genital', 'Volume depletion'],
                limitacoes: ['Subrepresentação de mulheres (24%)', 'FEVE média de 27%'],
              },
            ],
          },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // ASMA
  // ══════════════════════════════════════════════════════════
  {
    id: 'asma',
    nome: 'Asma Brônquica',
    cid10: 'J45',
    area: 'pneumologia',
    prevalencia_br: '~10% da população (~20 milhões)',
    mortalidade: '~2.000 mortes/ano evitáveis com tratamento adequado',
    resumo_clinico: 'Doença inflamatória crônica das vias aéreas com obstrução variável e reversível. Tratamento baseado em ICS para controle da inflamação; SABA apenas como resgate, substituído por ICS-formoterol em todos os estágios desde GINA 2019.',
    diretrizes: [
      {
        id: 'gina2023',
        sigla: 'GINA 2023',
        titulo: 'Global Strategy for Asthma Management and Prevention',
        sociedade: 'Global Initiative for Asthma (GINA)',
        ano: 2023,
        terapias: [
          {
            id: 'ics-formoterol',
            nome: 'ICS-formoterol (Budesonida-formoterol)',
            classe: 'Corticosteroide inalatório + LABA',
            mecanismo: 'ICS: anti-inflamatório → reduz eosinófilos e remodelamento; Formoterol: LABA de início rápido → broncodilatação imediata; efeito SMART (manutenção + alívio)',
            indicacao_principal: 'Terapia de alívio e manutenção (SMART) em todos os estágios GINA — substitui SABA isolado',
            nivel_geral: 'A',
            grau_geral: 'I',
            beneficio_resumo: 'Redução de 50–64% em exacerbações graves vs. SABA isolado; controle superior com menor dose de ICS',
            risco_resumo: 'Candidíase oral (higiene bucal pós-uso), disfonia, dose máxima de formoterol 72 μg/dia',
            contraindicacoes: ['Dose máxima de formoterol (72 μg/dia = 12 inalações)', 'Não usar com LABA adicional'],
            monitoramento: ['Técnica inalatória a cada consulta', 'Contagem de eosinófilos (resposta ao ICS)', 'Função pulmonar (espirometria anual)'],
            total_pacientes: 0,
            estudos: [
              {
                id: 'sygma1',
                nome: 'SYGMA 1',
                tipo: 'rct',
                titulo_completo: 'Budesonide–Formoterol as Needed in Mild Asthma',
                autores: "O'Byrne PM, FitzGerald JM, Bateman ED, et al.",
                ano: 2018,
                revista: 'NEJM',
                doi: '10.1056/NEJMoa1715222',
                pmid: '29768140',
                n_pacientes: 3836,
                duracao_seguimento: '52 semanas',
                populacao: 'Asma leve (passos 1-2 GINA), não tratada com ICS',
                desfecho_primario: 'Semanas com controle bem-sucedido da asma',
                desfecho_secundario: 'Exacerbações graves, função pulmonar, efeitos colaterais',
                resultado_principal: 'Budesonida-formoterol SOS não inferior a budesonida diária no controle e superior a SABA + budesonida diária em exacerbações',
                reducao_risco_relativo: 'Exacerbações: -64% vs. SABA SOS',
                nnt: 16,
                p_value: '< 0,001',
                nivel: 'A', grau: 'I',
                randomizado: true, multicentrico: true, cego: 'duplo_cego',
                beneficios: ['Controle equivalente com menor uso de ICS', 'Redução de 64% em exacerbações vs. SABA isolado', 'Menos efeitos sistêmicos do ICS'],
                riscos: ['Candidíase oral (2,4% vs. 0,5% budesonida diária)', 'Disfonia leve'],
                limitacoes: ['Sem dados em asma moderada-grave', 'Asma leve — resultado pode não extrapolar'],
                populacao_excluida: ['DPOC', 'Asma moderada-grave já em ICS', 'Tabagistas'],
              },
              {
                id: 'sygma2',
                nome: 'SYGMA 2',
                tipo: 'rct',
                titulo_completo: 'Twice-Daily Budesonide–Formoterol and Asthma Exacerbations',
                autores: 'Bateman ED, Reddel HK, Eriksson G, et al.',
                ano: 2018,
                revista: 'NEJM',
                doi: '10.1056/NEJMoa1715368',
                pmid: '29768142',
                n_pacientes: 4215,
                duracao_seguimento: '52 semanas',
                populacao: 'Asma leve',
                desfecho_primario: 'Taxa anualizada de exacerbações graves',
                resultado_principal: 'Budesonida-formoterol SOS foi não inferior a budesonida 2x/dia em exacerbações',
                reducao_risco_relativo: 'Não inferioridade confirmada',
                nivel: 'A', grau: 'I',
                randomizado: true, multicentrico: true, cego: 'duplo_cego',
                beneficios: ['Redução de 61% em dose cumulativa de ICS', 'Controle equivalente de exacerbações', 'Menor efeito supressor de cortisol'],
                riscos: ['Discretamente inferior no controle diário de sintomas'],
                limitacoes: ['Apenas asma leve', 'Exclusão de casos graves'],
              },
            ],
          },
        ],
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────

export const TIPO_ESTUDO_META: Record<TipoEstudo, { label: string; short: string; cls: string; dark: string }> = {
  rct:                { label: 'Ensaio Clínico Randomizado', short: 'ECR',    cls: 'bg-blue-100   text-blue-700',   dark: 'dark:bg-blue-900/30   dark:text-blue-400'   },
  meta_analise:       { label: 'Meta-análise',               short: 'META',   cls: 'bg-purple-100 text-purple-700', dark: 'dark:bg-purple-900/30 dark:text-purple-400' },
  revisao_sistematica:{ label: 'Revisão Sistemática',        short: 'RS',     cls: 'bg-indigo-100 text-indigo-700', dark: 'dark:bg-indigo-900/30 dark:text-indigo-400' },
  guideline:          { label: 'Diretriz',                   short: 'DIR',    cls: 'bg-green-100  text-green-700',  dark: 'dark:bg-green-900/30  dark:text-green-400'  },
  consenso:           { label: 'Consenso',                   short: 'CONS',   cls: 'bg-teal-100   text-teal-700',   dark: 'dark:bg-teal-900/30   dark:text-teal-400'   },
  coorte:             { label: 'Estudo de Coorte',           short: 'COORTE', cls: 'bg-amber-100  text-amber-700',  dark: 'dark:bg-amber-900/30  dark:text-amber-400'  },
  registro:           { label: 'Registro',                   short: 'REG',    cls: 'bg-slate-100  text-slate-600',  dark: 'dark:bg-slate-800     dark:text-slate-400'  },
};

export const NIVEL_META: Record<NivelEv, { cls: string; desc: string }> = {
  A: { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',  desc: 'Múltiplos ECRs ou meta-análises' },
  B: { cls: 'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400',   desc: 'ECR único ou estudos observacionais' },
  C: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',  desc: 'Consenso ou opinião de especialistas' },
};

export const GRAU_META: Record<GrauRec, { cls: string; desc: string }> = {
  I:   { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', desc: 'Benefício >>> Risco — Recomendado' },
  IIa: { cls: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',       desc: 'Benefício >> Risco — Razoável' },
  IIb: { cls: 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',      desc: 'Benefício ≥ Risco — Pode considerar' },
  III: { cls: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',         desc: 'Sem benefício ou prejudicial' },
};

export const AREA_META: Record<AreaTerapeutica, { label: string; cls: string }> = {
  cardiologia:    { label: 'Cardiologia',    cls: 'bg-rose-100   text-rose-700   dark:bg-rose-900/30   dark:text-rose-400'   },
  endocrinologia: { label: 'Endocrinologia', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  pneumologia:    { label: 'Pneumologia',    cls: 'bg-sky-100    text-sky-700    dark:bg-sky-900/30    dark:text-sky-400'    },
  nefrologia:     { label: 'Nefrologia',     cls: 'bg-teal-100   text-teal-700   dark:bg-teal-900/30   dark:text-teal-400'   },
  psiquiatria:    { label: 'Psiquiatria',    cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
};

// ─── Funções utilitárias ──────────────────────────────────────

export function getTotalPacientes(terapia: TerapiaEvidencia): number {
  return terapia.estudos.reduce((sum, e) => sum + e.n_pacientes, 0);
}

export function getTotalEstudosByDiagnostico(diag: DiagnosticoEvidencia): number {
  return diag.diretrizes.flatMap(d => d.terapias.flatMap(t => t.estudos)).length;
}

export function getTotalPacientesByDiagnostico(diag: DiagnosticoEvidencia): number {
  return diag.diretrizes.flatMap(d => d.terapias.flatMap(t => t.estudos)).reduce((s, e) => s + e.n_pacientes, 0);
}

export function getEstudosByTipo(terapia: TerapiaEvidencia): Record<TipoEstudo, number> {
  const counts = {} as Record<TipoEstudo, number>;
  for (const e of terapia.estudos) counts[e.tipo] = (counts[e.tipo] ?? 0) + 1;
  return counts;
}
