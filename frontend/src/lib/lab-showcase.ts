// ============================================================
// PRESCREVE-AI — Laboratory Showcase Engine
// Apresentação institucional para indústria farmacêutica
// ============================================================

export type NivelEvidenciaLab = 'A' | 'B' | 'C';
export type StatusMarca = 'ativo' | 'em_integracao' | 'planejado';
export type TipoBula = 'profissional' | 'paciente' | 'ambas' | 'nenhuma';
export type AreaEspecialidade =
  | 'cardiologia'
  | 'endocrinologia'
  | 'pneumologia'
  | 'nefrologia'
  | 'neurologia'
  | 'ginecologia'
  | 'psiquiatria'
  | 'oncologia'
  | 'infectologia'
  | 'gastroenterologia'
  | 'reumatologia';

// ─── Marca / Produto ─────────────────────────────────────────

export interface MarcaLab {
  id: string;
  nome_comercial: string;
  molecula: string;
  classe_farmacologica: string;
  concentracoes: string[];
  formas_farmaceuticas: string[];
  especialidades: AreaEspecialidade[];
  indicacoes: string[];
  contraindicacoes_principais: string[];
  nivel_evidencia: NivelEvidenciaLab;
  diretrizes_associadas: string[];
  estudos_chave: string[];
  bula: TipoBula;
  status: StatusMarca;
  prescricoes_mes_estimadas?: number;
  registro_anvisa?: string;
  destaque?: string;     // frase de impacto para a apresentação
}

// ─── Cenário clínico ─────────────────────────────────────────

export interface CenarioClinico {
  id: string;
  titulo: string;
  diagnostico: string;
  cid10: string;
  perfil_paciente: string;
  desafio_clinico: string;
  solucao_prescrevai: string[];
  marcas_envolvidas: string[];   // IDs de marcas
  desfecho_esperado: string;
  tempo_decisao_estimado: string;
  icone: string;
}

// ─── Métrica de impacto ──────────────────────────────────────

export interface MetricaImpacto {
  label: string;
  valor: string;
  sub: string;
  tendencia?: string;
  cor: string;
}

// ─── Laboratório ─────────────────────────────────────────────

export interface LaboratorioProfile {
  id: string;
  nome: string;
  nome_curto: string;
  initials: string;
  tagline: string;
  cor_primaria: string;         // classe Tailwind bg-*-600
  cor_acento: string;           // classe Tailwind text-*-600
  cor_gradient: string;         // from-* to-*
  sede: string;
  fundacao: number;
  segmentos: string[];
  descricao: string;
  site?: string;
  marcas: MarcaLab[];
  metricas: MetricaImpacto[];
  cenarios: CenarioClinico[];
  diferenciais: string[];
  proposta_valor: string;
}

// ─── Dados Eurofarma ─────────────────────────────────────────

const MARCAS_EUROFARMA: MarcaLab[] = [
  {
    id: 'ef-01',
    nome_comercial: 'PIEMONTE®',
    molecula: 'Montelucaste Sódico',
    classe_farmacologica: 'Antagonista de Receptores de Leucotrienos',
    concentracoes: ['10 mg'],
    formas_farmaceuticas: ['Comprimido revestido'],
    especialidades: ['pneumologia'],
    indicacoes: ['Asma persistente (≥ 15 anos — adjuvante ao ICS, GINA Passo 2-3)', 'Rinite alérgica sazonal e perene', 'Prevenção de broncoespasmo induzido por exercício'],
    contraindicacoes_principais: ['Hipersensibilidade ao montelucaste', 'Menores de 15 anos (usar sachê 4 mg ou comprimido mastigável 5 mg)'],
    nivel_evidencia: 'B',
    diretrizes_associadas: ['GINA 2023 — IIa-B como adjuvante ao ICS', 'ARIA 2021 — Rinite alérgica'],
    estudos_chave: ['Knorr et al. 1998 (NEJM — asma adulto)', 'Price et al. 2003 (rinite + asma)', 'GINA 2023 revisão sistemática'],
    bula: 'ambas',
    status: 'ativo',
    prescricoes_mes_estimadas: 48000,
    registro_anvisa: '1.0043.1320.001-2',
    destaque: 'Antagonista de leucotrienos 1x/dia — indicado em asma persistente como adjuvante ao ICS e rinite alérgica sazonal ou perene',
  },
  {
    id: 'ef-02',
    nome_comercial: 'PIEMONTE® SACHÊ',
    molecula: 'Montelucaste Sódico',
    classe_farmacologica: 'Antagonista de Receptores de Leucotrienos — Pediátrico',
    concentracoes: ['4 mg'],
    formas_farmaceuticas: ['Granulado para dispersão oral (sachê)'],
    especialidades: ['pneumologia'],
    indicacoes: ['Asma persistente leve (6 meses a 5 anos)', 'Rinite alérgica (6 meses a 5 anos)', 'Prevenção de broncoespasmo induzido por exercício (2 a 5 anos)'],
    contraindicacoes_principais: ['Hipersensibilidade ao montelucaste', 'Menores de 6 meses'],
    nivel_evidencia: 'B',
    diretrizes_associadas: ['GINA 2023 Pediátrico — adjuvante ICS ≥ 6 meses', 'ARIA 2021 — ≥ 6 meses'],
    estudos_chave: ['Knorr et al. 2001 (J Pediatr — lactentes e crianças)', 'Maspero et al. 2008 (SPI pediátrico)'],
    bula: 'ambas',
    status: 'ativo',
    prescricoes_mes_estimadas: 12000,
    registro_anvisa: '1.0043.1320.002-0',
    destaque: '⚠ Black Box FDA/ANVISA: monitorar alterações neuropsiquiátricas — reservar quando ICS não disponível ou intolerância documentada',
  },
  {
    id: 'ef-03',
    nome_comercial: 'PISA® LP',
    molecula: 'Dicloridrato de Pramipexol',
    classe_farmacologica: 'Agonista Dopaminérgico D2/D3 — Liberação Prolongada',
    concentracoes: ['0,375 mg', '0,75 mg', '1,5 mg'],
    formas_farmaceuticas: ['Comprimido de liberação prolongada'],
    especialidades: ['neurologia'],
    indicacoes: ['Doença de Parkinson idiopática (monoterapia ou adjuvante à levodopa)', 'Síndrome das Pernas Inquietas moderada a grave'],
    contraindicacoes_principais: ['Hipersensibilidade ao pramipexol', 'TFG < 20 mL/min (ajuste de dose)', 'Uso cauteloso: hipotensão ortostática e controle de impulsos'],
    nivel_evidencia: 'A',
    diretrizes_associadas: ['MDS Evidence-Based Medicine Parkinson 2019', 'IRLSSG Guidelines SPI 2022'],
    estudos_chave: ['Watts et al. 2010 (Pramipexol LP vs. IR — Mov Disord)', 'RECOVER Study (SPI)', 'Pinter et al. 2015 (titulação LP)'],
    bula: 'ambas',
    status: 'ativo',
    prescricoes_mes_estimadas: 22000,
    destaque: 'Pramipexol LP 1x/dia — simplifica adesão vs. IR 3x/dia; titulação semanal a cada 5-7 dias; 1º agonista dopaminérgico LP com MS no Brasil',
  },
  {
    id: 'ef-04',
    nome_comercial: 'PIETRA ED®',
    molecula: 'Dienogeste',
    classe_farmacologica: 'Progestógeno — Inibidor da Síntese Estrogênica',
    concentracoes: ['2 mg'],
    formas_farmaceuticas: ['Comprimido revestido'],
    especialidades: ['ginecologia'],
    indicacoes: ['Endometriose (tratamento clínico — estágios I a IV)', 'Alívio de dor pélvica crônica associada à endometriose'],
    contraindicacoes_principais: ['Gravidez', 'Tromboembolismo venoso ativo', 'Hemorragia uterina não diagnosticada', 'Tumores dependentes de progestágeno'],
    nivel_evidencia: 'A',
    diretrizes_associadas: ['ESHRE Endometriosis Guideline 2022', 'SBGO 2023 — Tratamento hormonal de 1ª linha'],
    estudos_chave: ['Strowitzki et al. 2010 (Fertil Steril)', 'Harada et al. 2009', 'Petraglia et al. 2011'],
    bula: 'ambas',
    status: 'ativo',
    prescricoes_mes_estimadas: 31000,
    destaque: 'Dienogeste 2 mg — progestógeno com ação seletiva anti-endometriósica; reduz dor pélvica em ≥ 70% após 24 semanas de tratamento',
  },
  {
    id: 'ef-05',
    nome_comercial: 'VAST®',
    molecula: 'Atorvastatina Cálcica',
    classe_farmacologica: 'Estatina de alta intensidade',
    concentracoes: ['10 mg', '20 mg', '40 mg', '80 mg'],
    formas_farmaceuticas: ['Comprimido revestido'],
    especialidades: ['cardiologia', 'endocrinologia'],
    indicacoes: ['Hipercolesterolemia primária e dislipidemia mista', 'Prevenção cardiovascular primária e secundária', 'Síndrome coronariana aguda'],
    contraindicacoes_principais: ['Doença hepática ativa', 'Gravidez', 'Lactação'],
    nivel_evidencia: 'A',
    diretrizes_associadas: ['SBC 2025 — LDL < 50 mg/dL risco muito alto', 'ESC/EAS 2019'],
    estudos_chave: ['ASCOT-LLA', 'TNT', 'IDEAL', 'SPARCL (prevenção de AVC)'],
    bula: 'ambas',
    status: 'ativo',
    prescricoes_mes_estimadas: 65000,
    destaque: 'Vast® — estatina de referência para prevenção cardiovascular; redução de LDL de até 55% na dose 80 mg',
  },
  {
    id: 'ef-06',
    nome_comercial: 'HOLMES®',
    molecula: 'Olmesartana Medoxomila',
    classe_farmacologica: 'Bloqueador do Receptor de Angiotensina II (BRA)',
    concentracoes: ['20 mg', '40 mg'],
    formas_farmaceuticas: ['Comprimido revestido'],
    especialidades: ['cardiologia', 'nefrologia'],
    indicacoes: ['Hipertensão Arterial Sistêmica', 'HAS com DRC (proteção renal)', 'HAS + proteinúria'],
    contraindicacoes_principais: ['Gravidez', 'Hiperpotassemia grave', 'Uso concomitante com alisquireno em DM2 ou DRC'],
    nivel_evidencia: 'A',
    diretrizes_associadas: ['DBHA-7 (SBC 2020)', 'KDIGO 2024 — BRA Classe I em nefropatia proteinúrica'],
    estudos_chave: ['ROADMAP (prevenção de microalbuminúria)', 'ORIENT (nefropatia diabética)', 'OLMESARTAN meta-análise'],
    bula: 'ambas',
    status: 'ativo',
    prescricoes_mes_estimadas: 35000,
    destaque: 'Holmes® — BRA de alta potência; olmesartana 40 mg oferece redução adicional de PA vs. losartana 100 mg; perfil renoprotector documentado',
  },
  {
    id: 'ef-07',
    nome_comercial: 'LUGANO®',
    molecula: 'Fumarato de Formoterol Diidratado + Propionato de Fluticasona',
    classe_farmacologica: 'ICS + LABA (Corticosteroide Inalatório + β2-Agonista Longa Duração)',
    concentracoes: ['50/100 μg', '50/250 μg', '50/500 μg'],
    formas_farmaceuticas: ['Suspensão para inalação (aerossol pressurizado)'],
    especialidades: ['pneumologia'],
    indicacoes: ['Asma persistente não controlada com ICS isolado (GINA Passos 3-5)', 'DPOC estável (GOLD C/D/E)'],
    contraindicacoes_principais: ['Asma aguda / estado de mal asmático (não usar isolado)', 'Tuberculose ativa', 'Hipersensibilidade a formoterol ou fluticasona'],
    nivel_evidencia: 'A',
    diretrizes_associadas: ['GINA 2023 — ICS+LABA Classe I Passo 3-5', 'GOLD 2024 — ICS+LABA Categoria C/D/E'],
    estudos_chave: ['FACET (fluticasona+formoterol vs. budesonida+formoterol)', 'ICS/LABA meta-análise GINA 2023', 'PATHOS (fluticasona propionato studies)'],
    bula: 'ambas',
    status: 'ativo',
    prescricoes_mes_estimadas: 28000,
    destaque: 'Lugano® — ICS+LABA com propionato de fluticasona de alta potência; 2 doses/dia; fluticasona tem meia-vida pulmonar de ~7 horas para controle sustentado',
  },
  {
    id: 'ef-08',
    nome_comercial: 'GLIF®',
    molecula: 'Dapagliflozina',
    classe_farmacologica: 'Inibidor SGLT-2',
    concentracoes: ['10 mg'],
    formas_farmaceuticas: ['Comprimido revestido'],
    especialidades: ['endocrinologia', 'cardiologia', 'nefrologia'],
    indicacoes: ['DM2 + DCV estabelecida ou alto risco CV (Classe I ADA 2024)', 'Insuficiência Cardíaca (ICFEr e ICFEp)', 'DRC com e sem DM2 (TFG 25-75)', 'Redução de hospitalização por IC'],
    contraindicacoes_principais: ['TFG < 25 mL/min (início)', 'DM1 (off-label; risco de CAD)', 'Candidíase genital recorrente grave'],
    nivel_evidencia: 'A',
    diretrizes_associadas: ['ADA 2024 — Classe I (DM2+DCV/IC/DRC)', 'ESC-HF 2021 — Quarteto ICFEr Classe I', 'KDIGO 2024 — Classe I DRC'],
    estudos_chave: ['DECLARE-TIMI 58', 'DAPA-HF', 'DAPA-CKD', 'DELIVER (ICFEp)'],
    bula: 'ambas',
    status: 'ativo',
    prescricoes_mes_estimadas: 19000,
    destaque: 'Glif® — dapagliflozina 10 mg aprovada em DM2, IC e DRC; DAPA-HF demonstrou redução de 26% em morte CV + hospitalização por IC',
  },
];

const CENARIOS_EUROFARMA: CenarioClinico[] = [
  {
    id: 'c1',
    titulo: 'Asma persistente moderada — ICS+LABA',
    diagnostico: 'Asma Brônquica Persistente Moderada',
    cid10: 'J45.3',
    perfil_paciente: 'Adulto 34 anos, asma moderada não controlada em uso de ICS isolado (400 μg/dia), 3 exacerbações no último ano, FeV1 68%',
    desafio_clinico: 'Asma não controlada em Passo 3 — GINA 2023 indica escalonamento para ICS+LABA como Classe I-A',
    solucao_prescrevai: [
      'CDS detecta asma não controlada → alerta de inadequação ao GINA 2023 Passo 3',
      'Motor sugere escalonamento para ICS+LABA (Classe I-A)',
      'LUGANO® aparece como opção Eurofarma com formoterol + fluticasona nível A',
      'Bula profissional e paciente disponíveis em 1 clique',
      'Orientação de técnica inalatória (aerossol pressurizado) incluída na prescrição',
    ],
    marcas_envolvidas: ['ef-07'],
    desfecho_esperado: 'Melhora de FeV1 ≥ 12% em 3 meses · Redução estimada de 50% nas exacerbações vs. ICS isolado',
    tempo_decisao_estimado: '< 2 minutos',
    icone: '🫁',
  },
  {
    id: 'c2',
    titulo: 'Parkinson inicial — Agonista dopaminérgico LP',
    diagnostico: 'Doença de Parkinson Idiopática (Hoehn & Yahr I-II)',
    cid10: 'G20',
    perfil_paciente: 'Adulto 62 anos, diagnóstico recente de Parkinson, tremor de repouso e bradicinesia sem limitação de ADL grave; paciente jovem-ativo deseja adiar levodopa',
    desafio_clinico: 'Parkinson inicial — agonista dopaminérgico como 1ª opção para adiar discinesias tardias (MDS Guidelines 2019)',
    solucao_prescrevai: [
      'CDS identifica G20 em paciente < 70 anos → sugere agonista dopaminérgico como 1ª linha',
      'PISA® LP apresentado com esquema de titulação semanal em 4 etapas',
      'Alerta de sonolência diurna, controle de impulsos e hipotensão ortostática gerado automaticamente',
      'Monitoramento semestral de comportamentos compulsivos incluído no plano de retorno',
      'Prescrição com posologia LP 1x/dia para beneficiar adesão',
    ],
    marcas_envolvidas: ['ef-03'],
    desfecho_esperado: 'Melhora de 15-20 pontos na escala UPDRS-III · Adesão > 85% com comprimido único diário',
    tempo_decisao_estimado: '< 3 minutos',
    icone: '🧠',
  },
  {
    id: 'c3',
    titulo: 'DM2 + Insuficiência Cardíaca — Proteção cardiorrenal',
    diagnostico: 'DM2 com Insuficiência Cardíaca com fração de ejeção reduzida (ICFEr)',
    cid10: 'E11.65',
    perfil_paciente: 'Adulto 64 anos, DM2 há 10 anos, IC com FE 35%, HbA1c 7,8%, em uso de metformina; creatinina 1,3 (TFG estimada 55 mL/min)',
    desafio_clinico: 'DM2 + ICFEr — SGLT-2 com indicação Classe I em DM2+IC e como 4º pilar da terapia de IC (ESC-HF 2021)',
    solucao_prescrevai: [
      'CDS identifica DM2 + IC → alerta de indicação SGLT-2 Classe I',
      'Motor exibe GLIF® com dados DAPA-HF (redução de 26% no desfecho composto)',
      'NNT = 21 para prevenção de morte CV ou hospitalização por IC exibido no painel',
      'Monitoramento de TFG e infecção urinária alertado automaticamente',
      'Prescrição com posologia 10 mg/dia gerada em < 30 segundos',
    ],
    marcas_envolvidas: ['ef-08'],
    desfecho_esperado: 'Redução de 26% em morte CV + hospitalização por IC (DAPA-HF) · Redução de HbA1c ~0,9%',
    tempo_decisao_estimado: '< 2 minutos',
    icone: '🩺',
  },
  {
    id: 'c4',
    titulo: 'Endometriose com dor pélvica crônica',
    diagnostico: 'Endometriose',
    cid10: 'N80',
    perfil_paciente: 'Adulta 29 anos, dismenorreia grave há 3 anos (VAS 8/10), diagnóstico confirmado por laparoscopia (estágio II), desejo de preservar fertilidade',
    desafio_clinico: 'Endometriose com dor incapacitante — tratamento com dienogeste como 1ª linha hormonal (ESHRE 2022)',
    solucao_prescrevai: [
      'CDS identifica CID N80 + dor pélvica crônica → sugere progestógeno específico anti-endometriósico',
      'PIETRA ED® apresentado com evidência Classe I (ESHRE Guideline 2022)',
      'Alerta de sangramento irregular nos primeiros 3 meses gerado automaticamente',
      'Monitoramento de densidade óssea para uso > 24 meses alertado na prescrição',
      'Orientação de uso contínuo (sem pausa cíclica) incluída na bula paciente',
    ],
    marcas_envolvidas: ['ef-04'],
    desfecho_esperado: 'Redução de dor pélvica ≥ 70% após 24 semanas · Melhora de qualidade de vida (SF-36)',
    tempo_decisao_estimado: '< 2 minutos',
    icone: '🌸',
  },
];

const METRICAS_EUROFARMA: MetricaImpacto[] = [
  { label: 'Marcas integradas',         valor: '8',          sub: 'no sistema',             tendencia: '+4 previstas',    cor: 'blue'   },
  { label: 'Moléculas cobertas',        valor: '8',          sub: 'princípios ativos',      tendencia: 'Nível A/B',       cor: 'indigo' },
  { label: 'Especialidades',            valor: '6',          sub: 'áreas terapêuticas',     tendencia: 'Pneumo, SNC, Gine…', cor: 'purple' },
  { label: 'Diretrizes associadas',     valor: '11',         sub: 'guidelines relacionadas',tendencia: '2022–2024',       cor: 'teal'   },
  { label: 'Bulas integradas',          valor: '16',         sub: 'prof. + paciente',       tendencia: 'PDF + estruturada',cor: 'green'  },
  { label: 'Prescrições/mês estimadas', valor: '260 mil',    sub: 'em todas as marcas',     tendencia: '↑ 18% ao ano',    cor: 'emerald'},
  { label: 'Médicos potenciais',        valor: '~ 330 mil',  sub: 'prescritores no Brasil', tendencia: 'Multi-especialidade', cor: 'amber' },
  { label: 'Cenários clínicos',         valor: '4',          sub: 'fluxos mapeados',        tendencia: '+8 planejados',   cor: 'rose'   },
];

// ─── Dados Segundo Laboratório (genérico — Laboratório Beta) ─

const MARCAS_BETA: MarcaLab[] = [
  {
    id: 'beta-01',
    nome_comercial: 'CARDIBETA®',
    molecula: 'Carvedilol',
    classe_farmacologica: 'Betabloqueador não-seletivo + α1',
    concentracoes: ['3,125 mg', '6,25 mg', '12,5 mg', '25 mg'],
    formas_farmaceuticas: ['Comprimido'],
    especialidades: ['cardiologia'],
    indicacoes: ['Insuficiência Cardíaca (ICFEr)', 'HAS', 'Angina estável', 'Pós-IAM'],
    contraindicacoes_principais: ['Asma brônquica', 'BAV de 2º e 3º grau', 'Choque cardiogênico'],
    nivel_evidencia: 'A',
    diretrizes_associadas: ['ESC-HF 2021 — Betabloqueador Classe I no quarteto'],
    estudos_chave: ['COPERNICUS', 'CAPRICORN', 'CARMEN'],
    bula: 'profissional',
    status: 'ativo',
    prescricoes_mes_estimadas: 41000,
    destaque: 'Dupla ação β + α1 — reduz pós-carga e FC sem broncoespasmo na maioria dos casos',
  },
];

// ─── Banco de laboratórios ────────────────────────────────────

export const LABORATORIOS: LaboratorioProfile[] = [
  {
    id: 'eurofarma',
    nome: 'Eurofarma Laboratórios S.A.',
    nome_curto: 'Eurofarma',
    initials: 'EF',
    tagline: 'Saúde para Todos',
    cor_primaria: 'bg-blue-600',
    cor_acento: 'text-blue-600',
    cor_gradient: 'from-blue-700 via-blue-600 to-blue-500',
    sede: 'São Paulo, SP — Brasil',
    fundacao: 1991,
    segmentos: ['Cardiovascular', 'Diabetes', 'Respiratório', 'SNC', 'Oncologia', 'Anti-infecciosos'],
    descricao: 'Maior laboratório farmacêutico 100% brasileiro. Presente em mais de 20 países. Portfólio com mais de 350 produtos registrados na Anvisa, atuando nas principais áreas terapêuticas.',
    site: 'https://www.eurofarma.com.br',
    marcas: MARCAS_EUROFARMA,
    metricas: METRICAS_EUROFARMA,
    cenarios: CENARIOS_EUROFARMA,
    diferenciais: [
      'Único laboratório brasileiro com portfólio completo em cardiologia e diabetes',
      'Formulações inovadoras: sachê, liberação prolongada, combinações fixas',
      'Cobertura de 9 diretrizes clínicas atualizadas (2023–2025)',
      'Bulas profissional e paciente estruturadas digitalmente em todos os produtos',
      'Integração com o CDS motor do PRESCREVE-AI — sugestão baseada em evidência',
      'Dados de PMID + DOI para todos os estudos de suporte',
    ],
    proposta_valor: 'Com o PRESCREVE-AI, cada decisão clínica baseada em evidências se torna uma oportunidade de prescrição fundamentada. Seus produtos aparecem no momento certo — quando o médico está decidindo a terapia, com o nível de evidência e a diretriz exibidos em destaque.',
  },
  {
    id: 'beta-lab',
    nome: 'Laboratório Beta Farma S.A.',
    nome_curto: 'BetaFarma',
    initials: 'BF',
    tagline: 'Inovação com Responsabilidade',
    cor_primaria: 'bg-emerald-600',
    cor_acento: 'text-emerald-600',
    cor_gradient: 'from-emerald-700 via-emerald-600 to-teal-500',
    sede: 'Rio de Janeiro, RJ — Brasil',
    fundacao: 2004,
    segmentos: ['Cardiologia', 'Hospitalar', 'Oncologia'],
    descricao: 'Laboratório especializado em cardiologia hospitalar e medicamentos de alta complexidade. Foco em biossimilares e genéricos de referência.',
    marcas: MARCAS_BETA,
    metricas: [
      { label: 'Marcas integradas',     valor: '1',         sub: 'fase piloto',           cor: 'emerald' },
      { label: 'Moléculas cobertas',    valor: '1',         sub: 'carvedilol',            cor: 'teal'    },
      { label: 'Especialidades',        valor: '1',         sub: 'cardiologia',           cor: 'blue'    },
      { label: 'Diretrizes',            valor: '2',         sub: 'ESC/SBC',               cor: 'indigo'  },
      { label: 'Bulas integradas',      valor: '1',         sub: 'profissional',          cor: 'green'   },
      { label: 'Prescrições/mês',       valor: '41 mil',    sub: 'estimadas',             cor: 'amber'   },
      { label: 'Médicos potenciais',    valor: '~ 45 mil',  sub: 'cardiologistas BR',     cor: 'rose'    },
      { label: 'Cenários clínicos',     valor: '1',         sub: 'ICFEr',                 cor: 'purple'  },
    ],
    cenarios: [],
    diferenciais: [
      'Portfólio selecionado de alta evidência',
      'Foco em cardiologia hospitalar e ambulatorial',
    ],
    proposta_valor: 'Integração planejada para o segundo semestre de 2025.',
  },
];

// ─── Helpers ──────────────────────────────────────────────────

export const STATUS_MARCA_META: Record<StatusMarca, { label: string; cls: string; dot: string }> = {
  ativo:           { label: 'Ativo',          cls: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',  dot: 'bg-green-500'  },
  em_integracao:   { label: 'Em integração',  cls: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',   dot: 'bg-blue-500'   },
  planejado:       { label: 'Planejado',      cls: 'bg-slate-100  text-slate-600  dark:bg-slate-800     dark:text-slate-400',  dot: 'bg-slate-400'  },
};

export const NIVEL_EV_META: Record<NivelEvidenciaLab, { cls: string; label: string }> = {
  A: { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',  label: 'Nível A — Múltiplos ECR' },
  B: { cls: 'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400',   label: 'Nível B — ECR único'     },
  C: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',  label: 'Nível C — Consenso'      },
};

export const AREA_LAB_LABEL: Record<AreaEspecialidade, string> = {
  cardiologia:     'Cardiologia',
  endocrinologia:  'Endocrinologia',
  pneumologia:     'Pneumologia',
  nefrologia:      'Nefrologia',
  neurologia:      'Neurologia',
  ginecologia:     'Ginecologia',
  psiquiatria:     'Psiquiatria',
  oncologia:       'Oncologia',
  infectologia:    'Infectologia',
  gastroenterologia:'Gastroenterologia',
  reumatologia:    'Reumatologia',
};

export const AREA_LAB_COR: Record<AreaEspecialidade, string> = {
  cardiologia:     'bg-rose-100   text-rose-700   dark:bg-rose-900/30   dark:text-rose-400',
  endocrinologia:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  pneumologia:     'bg-sky-100    text-sky-700    dark:bg-sky-900/30    dark:text-sky-400',
  nefrologia:      'bg-teal-100   text-teal-700   dark:bg-teal-900/30   dark:text-teal-400',
  neurologia:      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  ginecologia:     'bg-pink-100   text-pink-700   dark:bg-pink-900/30   dark:text-pink-400',
  psiquiatria:     'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  oncologia:       'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
  infectologia:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  gastroenterologia:'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  reumatologia:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export function getUniqueEspecialidades(lab: LaboratorioProfile): AreaEspecialidade[] {
  const set = new Set<AreaEspecialidade>();
  lab.marcas.forEach(m => m.especialidades.forEach(e => set.add(e)));
  return [...set];
}

export function getTotalPrescricoesMes(lab: LaboratorioProfile): number {
  return lab.marcas.reduce((s, m) => s + (m.prescricoes_mes_estimadas ?? 0), 0);
}

export function getMarcaById(lab: LaboratorioProfile, id: string): MarcaLab | undefined {
  return lab.marcas.find(m => m.id === id);
}
