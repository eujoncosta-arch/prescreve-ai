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
    molecula: 'Losartana Potássica + Hidroclorotiazida',
    classe_farmacologica: 'BRA + Diurético Tiazídico',
    concentracoes: ['50 mg + 12,5 mg', '100 mg + 25 mg'],
    formas_farmaceuticas: ['Comprimido revestido'],
    especialidades: ['cardiologia', 'nefrologia'],
    indicacoes: ['Hipertensão Arterial Sistêmica (HAS)', 'Redução de risco cardiovascular em HAS + DM2', 'Nefropatia diabética'],
    contraindicacoes_principais: ['Gravidez', 'Hiperpotassemia', 'Insuficiência renal grave'],
    nivel_evidencia: 'A',
    diretrizes_associadas: ['DBHA-7 (SBC 2020)', 'ESC/ESH 2018', 'ADA 2024 (comorbidade HAS)'],
    estudos_chave: ['LIFE Trial', 'RENAAL', 'ONTARGET'],
    bula: 'ambas',
    status: 'ativo',
    prescricoes_mes_estimadas: 48000,
    registro_anvisa: '1.0148.0296.001-9',
    destaque: 'Combinação sinérgica BRA + tiazídico — dupla ação anti-hipertensiva com perfil de tolerabilidade superior',
  },
  {
    id: 'ef-02',
    nome_comercial: 'PIEMONTE® SACHÊ',
    molecula: 'Losartana Potássica + Hidroclorotiazida',
    classe_farmacologica: 'BRA + Diurético Tiazídico',
    concentracoes: ['50 mg + 12,5 mg'],
    formas_farmaceuticas: ['Pó para dispersão oral (sachê)'],
    especialidades: ['cardiologia', 'nefrologia'],
    indicacoes: ['HAS em pacientes com disfagia', 'HAS em idosos com dificuldade de deglutição'],
    contraindicacoes_principais: ['Gravidez', 'Hiperpotassemia'],
    nivel_evidencia: 'A',
    diretrizes_associadas: ['DBHA-7 (SBC 2020)'],
    estudos_chave: ['LIFE Trial', 'RENAAL'],
    bula: 'ambas',
    status: 'ativo',
    prescricoes_mes_estimadas: 12000,
    destaque: 'Primeira forma sachê de BRA + tiazídico no Brasil — amplia adesão em populações especiais',
  },
  {
    id: 'ef-03',
    nome_comercial: 'PISA®',
    molecula: 'Olmesartana Medoxomila + Anlodipino + Hidroclorotiazida',
    classe_farmacologica: 'BRA + BCC + Diurético Tiazídico',
    concentracoes: ['20/5/12,5 mg', '40/5/12,5 mg', '40/10/25 mg'],
    formas_farmaceuticas: ['Comprimido revestido'],
    especialidades: ['cardiologia', 'nefrologia'],
    indicacoes: ['HAS moderada a grave', 'HAS não controlada com 2 agentes', 'HAS com síndrome metabólica'],
    contraindicacoes_principais: ['Gravidez', 'Bloqueio AV avançado (anlodipino)', 'Hipopotassemia'],
    nivel_evidencia: 'A',
    diretrizes_associadas: ['DBHA-7 (SBC 2020)', 'ESC/ESH 2018 — Tripla terapia Classe I'],
    estudos_chave: ['TRINITY', 'TRINITY-2', 'OLMESARTAN estudos de nefroprotecao'],
    bula: 'ambas',
    status: 'ativo',
    prescricoes_mes_estimadas: 22000,
    destaque: 'Única tripla combinação BRA+BCC+Tiazídico — simplifica a adesão e potencializa o controle pressórico',
  },
  {
    id: 'ef-04',
    nome_comercial: 'PIETRA ED®',
    molecula: 'Tadalafila',
    classe_farmacologica: 'Inibidor PDE-5',
    concentracoes: ['2,5 mg', '5 mg', '10 mg', '20 mg'],
    formas_farmaceuticas: ['Comprimido revestido'],
    especialidades: ['cardiologia', 'nefrologia'],
    indicacoes: ['Disfunção erétil (DE)', 'Hiperplasia prostática benigna (HPB)', 'DE + HPB concomitante'],
    contraindicacoes_principais: ['Uso de nitratos', 'Hipotensão grave', 'Insuficiência hepática grave'],
    nivel_evidencia: 'A',
    diretrizes_associadas: ['EAU Guidelines on Erectile Dysfunction 2023', 'AUA/SMSNA Guidelines'],
    estudos_chave: ['CIALIS Integrated Studies', 'TADALA BPH Trial'],
    bula: 'ambas',
    status: 'ativo',
    prescricoes_mes_estimadas: 31000,
    destaque: 'Meia-vida longa (17,5h) — permite uso diário ou sob demanda; único aprovado para HPB + DE',
  },
  {
    id: 'ef-05',
    nome_comercial: 'EUROFARMA — Atorvastatina',
    molecula: 'Atorvastatina Cálcica',
    classe_farmacologica: 'Estatina de alta intensidade',
    concentracoes: ['10 mg', '20 mg', '40 mg', '80 mg'],
    formas_farmaceuticas: ['Comprimido revestido'],
    especialidades: ['cardiologia', 'endocrinologia'],
    indicacoes: ['Hipercolesterolemia', 'Dislipidemia mista', 'Prevenção CV primária e secundária', 'Síndrome coronariana aguda'],
    contraindicacoes_principais: ['Doença hepática ativa', 'Gravidez', 'Lactação'],
    nivel_evidencia: 'A',
    diretrizes_associadas: ['SBC 2025 — LDL < 50 mg/dL risco muito alto', 'ESC/EAS 2019'],
    estudos_chave: ['ASCOT-LLA', 'TNT', 'IDEAL', 'SPARCL (AVC)'],
    bula: 'ambas',
    status: 'ativo',
    prescricoes_mes_estimadas: 65000,
    destaque: 'Estatina de referência para prevenção cardiovascular — redução de LDL de até 55% na dose 80 mg',
  },
  {
    id: 'ef-06',
    nome_comercial: 'EUROFARMA — Metformina XR',
    molecula: 'Cloridrato de Metformina',
    classe_farmacologica: 'Biguanida — liberação prolongada',
    concentracoes: ['500 mg', '750 mg', '1000 mg'],
    formas_farmaceuticas: ['Comprimido de liberação prolongada'],
    especialidades: ['endocrinologia'],
    indicacoes: ['Diabetes Mellitus tipo 2 (1ª linha)', 'Pré-diabetes com alto risco', 'DM2 + síndrome metabólica'],
    contraindicacoes_principais: ['TFG < 30 mL/min', 'Acidose metabólica', 'Contraste iodado (suspender 48h)'],
    nivel_evidencia: 'A',
    diretrizes_associadas: ['ADA 2024 — 1ª linha Classe I-A', 'SBD 2024', 'DBCM-2'],
    estudos_chave: ['UKPDS 34', 'DPP (prevenção)', 'REMOVAL (cardiovascular)'],
    bula: 'ambas',
    status: 'ativo',
    prescricoes_mes_estimadas: 89000,
    destaque: 'Formulação XR reduz intolerância GI em 50% — maior adesão sem comprometer eficácia',
  },
  {
    id: 'ef-07',
    nome_comercial: 'EUROFARMA — Budesonida/Formoterol',
    molecula: 'Budesonida + Fumarato de Formoterol Diidratado',
    classe_farmacologica: 'ICS + LABA (Terapia SMART)',
    concentracoes: ['80/4,5 μg', '160/4,5 μg'],
    formas_farmaceuticas: ['Pó inalatório (inalador multidose)'],
    especialidades: ['pneumologia'],
    indicacoes: ['Asma persistente (passos 2-4 GINA)', 'DPOC estável (GOLD B/E)', 'Terapia SMART (manutenção + alívio)'],
    contraindicacoes_principais: ['Tuberculose ativa', 'Não usar como broncodilatador único em crise aguda grave'],
    nivel_evidencia: 'A',
    diretrizes_associadas: ['GINA 2023 — ICS-formoterol preferencial Classe I-A', 'GOLD 2024'],
    estudos_chave: ['SYGMA 1', 'SYGMA 2', 'NOVEL', 'ACHIEVE'],
    bula: 'ambas',
    status: 'ativo',
    prescricoes_mes_estimadas: 28000,
    destaque: 'Estratégia SMART reduz exacerbações graves em 64% vs. SABA — mudança de paradigma GINA 2023',
  },
  {
    id: 'ef-08',
    nome_comercial: 'EUROFARMA — Empagliflozina',
    molecula: 'Empagliflozina',
    classe_farmacologica: 'Inibidor SGLT-2',
    concentracoes: ['10 mg', '25 mg'],
    formas_farmaceuticas: ['Comprimido revestido'],
    especialidades: ['endocrinologia', 'cardiologia', 'nefrologia'],
    indicacoes: ['DM2 + DCV estabelecida (1ª linha)', 'DM2 + Insuficiência Cardíaca', 'DM2 + DRC (TFG ≥ 20)', 'ICFEr independente de DM2 (25 mg)'],
    contraindicacoes_principais: ['TFG < 20 mL/min (início)', 'DM1 (off-label)', 'Infecção urinária ativa recorrente'],
    nivel_evidencia: 'A',
    diretrizes_associadas: ['ADA 2024 — Classe I (DM2+DCV/IC/DRC)', 'ESC-HF 2021 — Quarteto ICFEr Classe I', 'KDIGO 2025'],
    estudos_chave: ['EMPA-REG OUTCOME', 'EMPEROR-Reduced', 'EMPEROR-Preserved', 'EMPA-KIDNEY'],
    bula: 'ambas',
    status: 'ativo',
    prescricoes_mes_estimadas: 19000,
    destaque: 'Único SGLT-2 com dados em ICFEr e ICFEp + DRC sem DM2 — maior amplitude de indicação',
  },
];

const CENARIOS_EUROFARMA: CenarioClinico[] = [
  {
    id: 'c1',
    titulo: 'HAS Estágio 2 não controlada',
    diagnostico: 'Hipertensão Arterial Sistêmica',
    cid10: 'I10',
    perfil_paciente: 'Adulto 58 anos, PA 162/98 mmHg em uso de IECA isolado há 3 meses, sobrepeso, sem DRC',
    desafio_clinico: 'Controle inadequado com monoterapia — necessidade de escalonamento com combinação sinérgica',
    solucao_prescrevai: [
      'CDS detecta PA fora da meta em anamnese',
      'Motor sugere BRA + tiazídico como combinação Classe I (DBHA-7)',
      'PIEMONTE® aparece como 1ª opção Eurofarma com nível de evidência A',
      'Bula profissional disponível em 1 clique',
      'Prescrição gerada em < 30 segundos',
    ],
    marcas_envolvidas: ['ef-01'],
    desfecho_esperado: 'Redução de PA para < 130/80 mmHg em 4–8 semanas',
    tempo_decisao_estimado: '< 2 minutos',
    icone: '❤️',
  },
  {
    id: 'c2',
    titulo: 'HAS refratária — Tripla terapia',
    diagnostico: 'Hipertensão Resistente',
    cid10: 'I10',
    perfil_paciente: 'Adulto 65 anos, PA 174/104 mmHg com IECA + diurético há 6 meses, sem controle, obeso, DM2',
    desafio_clinico: 'HAS resistente — indicação de tripla terapia BRA+BCC+tiazídico em dose otimizada',
    solucao_prescrevai: [
      'Score de risco CV calculado automaticamente pelo CDS',
      'Algoritmo identifica falha de dupla terapia → escalona para tripla',
      'PISA® apresentado como combinação de 3 fármacos em 1 comprimido',
      'Redução do número de comprimidos melhora adesão',
      'Alerta de monitoramento de K+ e creatinina gerado automaticamente',
    ],
    marcas_envolvidas: ['ef-03'],
    desfecho_esperado: 'Meta < 130/80 mmHg com comprimido único — melhora de adesão estimada em 40%',
    tempo_decisao_estimado: '< 3 minutos',
    icone: '💊',
  },
  {
    id: 'c3',
    titulo: 'DM2 + DCV — Proteção cardiovascular',
    diagnostico: 'DM2 com doença cardiovascular estabelecida',
    cid10: 'E11.65',
    perfil_paciente: 'Adulto 62 anos, DM2 há 8 anos, IAM prévio, HbA1c 8,2%, metformina em uso',
    desafio_clinico: 'DM2 com DCV estabelecida — indicação Classe I de SGLT-2 para proteção cardiovascular',
    solucao_prescrevai: [
      'CDS identifica comorbidade DM2 + DCV → alerta de indicação SGLT-2',
      'Motor aponta empagliflozina como 1ª opção (EMPA-REG OUTCOME)',
      'NNT = 39 exibido no painel "Por que esta recomendação?"',
      'Monitoramento de TFG e candidíase genital alertado automaticamente',
      'Prescrição com posologia completa gerada',
    ],
    marcas_envolvidas: ['ef-08'],
    desfecho_esperado: 'Redução de 38% em morte CV · Redução de 35% em hospitalização por IC',
    tempo_decisao_estimado: '< 2 minutos',
    icone: '🩺',
  },
  {
    id: 'c4',
    titulo: 'Asma leve — Estratégia SMART',
    diagnostico: 'Asma Brônquica leve (GINA passo 2)',
    cid10: 'J45.2',
    perfil_paciente: 'Adulto 34 anos, asma leve, usando SABA isolado há 2 anos, 2 exacerbações no último ano',
    desafio_clinico: 'Asma leve não controlada com SABA — GINA 2023 recomenda ICS-formoterol SOS (Classe I-A)',
    solucao_prescrevai: [
      'CDS detecta uso de SABA isolado → alerta de inadequação ao GINA 2023',
      'Motor sugere troca para ICS-formoterol como terapia SMART',
      'Budesonida/formoterol Eurofarma aparece como opção de referência',
      'Exibição do estudo SYGMA 1 (NNT = 16 em exacerbações)',
      'Orientação de técnica inalatória incluída na prescrição',
    ],
    marcas_envolvidas: ['ef-07'],
    desfecho_esperado: 'Redução de 64% em exacerbações graves vs. SABA isolado',
    tempo_decisao_estimado: '< 2 minutos',
    icone: '🫁',
  },
];

const METRICAS_EUROFARMA: MetricaImpacto[] = [
  { label: 'Marcas integradas',         valor: '8',          sub: 'no sistema',             tendencia: '+4 previstas',    cor: 'blue'   },
  { label: 'Moléculas cobertas',        valor: '11',         sub: 'princípios ativos',      tendencia: 'Nível A/B',       cor: 'indigo' },
  { label: 'Especialidades',            valor: '5',          sub: 'áreas terapêuticas',     tendencia: 'Cardio, Endo…',   cor: 'purple' },
  { label: 'Diretrizes associadas',     valor: '9',          sub: 'guidelines relacionadas',tendencia: '2023–2025',       cor: 'teal'   },
  { label: 'Bulas integradas',          valor: '16',         sub: 'prof. + paciente',       tendencia: 'PDF + estruturada',cor: 'green'  },
  { label: 'Prescrições/mês estimadas', valor: '314 mil',    sub: 'em todas as marcas',     tendencia: '↑ 23% ao ano',    cor: 'emerald'},
  { label: 'Médicos potenciais',        valor: '~ 280 mil',  sub: 'prescritores no Brasil', tendencia: 'Cardio + Endo',   cor: 'amber'  },
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
