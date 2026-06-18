import type {
  DiagnosticSupport,
  TherapeuticPlan,
  SafetyCheck,
  Consultation,
} from './types';

// ============================================================
// DADOS MOCKADOS — Simulação de resposta IA clínica
// ============================================================

export const MOCK_DIAGNOSTIC: DiagnosticSupport = {
  sintese_clinica:
    'Paciente com quadro clínico compatível com Hipertensão Arterial Sistêmica estágio 2, associada a síndrome metabólica. Ausência de lesão de órgão-alvo identificada até o momento.',
  red_flags: [
    'PA ≥ 180/110 mmHg requer avaliação imediata',
    'Monitorar sintomas neurológicos sugestivos de AVC',
  ],
  encaminhamento_urgente: false,
  hipoteses: [
    {
      id: '1',
      cid10: 'I10',
      nome: 'Hipertensão Arterial Sistêmica Estágio 2',
      probabilidade: 'alta',
      criterios_favoraveis: [
        'PA sistólica ≥ 160 mmHg em duas aferições',
        'História familiar positiva para HAS',
        'IMC ≥ 30 (obesidade)',
        'Sedentarismo',
        'Dieta hipersódica',
      ],
      criterios_desfavoraveis: [
        'Idade < 30 anos sugere investigar HAS secundária',
        'Ausência de cefaleia típica',
      ],
      exames_sugeridos: [
        'Hemograma completo',
        'Glicemia de jejum',
        'Colesterol total e frações',
        'Triglicerídeos',
        'Creatinina sérica',
        'Potássio sérico',
        'Urina tipo I',
        'Microalbuminúria',
        'Eletrocardiograma de repouso',
        'Ecocardiograma transtorácico',
        'Fundo de olho',
      ],
      raciocinio_clinico:
        'A apresentação clínica com PA elevada em duas ocasiões, associada a fatores de risco cardiovascular múltiplos (obesidade, sedentarismo, história familiar), configura quadro típico de HAS estágio 2 conforme as 7ª Diretrizes Brasileiras de Hipertensão (SBC, 2020).',
    },
    {
      id: '2',
      cid10: 'E11',
      nome: 'Diabetes Mellitus Tipo 2 (a investigar)',
      probabilidade: 'media',
      criterios_favoraveis: [
        'Obesidade abdominal',
        'Sedentarismo',
        'História familiar',
        'HAS associada',
      ],
      criterios_desfavoraveis: [
        'Sem glicemia disponível para confirmação',
        'Ausência de sintomas clássicos (poliúria, polidipsia)',
      ],
      exames_sugeridos: [
        'Glicemia de jejum',
        'HbA1c',
        'TOTG 75g (se glicemia limítrofe)',
      ],
      raciocinio_clinico:
        'A síndrome metabólica configura alto risco para DM2. Rastreamento obrigatório conforme Diretriz da SBD 2023.',
    },
    {
      id: '3',
      cid10: 'E78',
      nome: 'Dislipidemia',
      probabilidade: 'media',
      criterios_favoraveis: ['Obesidade', 'Dieta inadequada', 'Sedentarismo'],
      criterios_desfavoraveis: ['Sem lipidograma disponível'],
      exames_sugeridos: ['Colesterol total e frações', 'Triglicerídeos'],
      raciocinio_clinico:
        'Dislipidemia frequentemente associada à síndrome metabólica. Rastreamento indicado pelas V Diretrizes Brasileiras de Dislipidemias (SBC, 2013).',
    },
  ],
};

export const MOCK_THERAPEUTIC: TherapeuticPlan = {
  diagnostico_selecionado: 'Hipertensão Arterial Sistêmica Estágio 2 (I10)',
  preferencia_laboratorio: 'sem_preferencia',
  nao_farmacologico: [
    'Redução de peso: meta IMC < 25 kg/m² (redução de 5% já reduz PA em 5 mmHg)',
    'Dieta DASH: rica em frutas, vegetais e laticínios com baixo teor de gordura',
    'Restrição de sódio: < 2 g/dia (< 5 g de sal)',
    'Atividade física aeróbica: 150 min/semana de intensidade moderada',
    'Cessação do tabagismo (se aplicável)',
    'Limitação do consumo de álcool: < 2 drinques/dia para homens, < 1 para mulheres',
    'Técnicas de manejo do estresse',
  ],
  seguimento:
    'Retorno em 4 semanas para avaliação da resposta terapêutica e tolerabilidade. Após atingir meta pressórica, consultas a cada 3-6 meses.',
  monitorizacao: [
    'PA domiciliar (MRPA): 3 medidas manhã e 3 à tarde por 5 dias antes da consulta',
    'Função renal e eletrólitos a cada 6 meses (uso de IECA/BRA)',
    'Avaliação de lesão de órgão-alvo anualmente',
    'Potássio sérico se uso de diuréticos',
  ],
  encaminhamento: 'Cardiologista se não atingir meta em 3 meses com tratamento otimizado',
  farmacologico: [
    {
      id: 'enalapril',
      classe_terapeutica: 'Inibidor da Enzima Conversora de Angiotensina (IECA)',
      molecula: 'Enalapril',
      nome_generico: 'Maleato de Enalapril',
      indicacao: 'Anti-hipertensivo de primeira linha — HAS com DM ou IRC',
      dose: {
        dose_padrao: '10 mg',
        dose_min: '5 mg',
        dose_max: '40 mg/dia',
        unidade: 'mg',
        via: 'Oral',
        frequencia: '1-2x ao dia',
        duracao: 'Contínuo',
        ajuste_renal: 'TFG 30-60: dose habitual; TFG < 30: iniciar com 2,5 mg, max 5 mg/dia',
        ajuste_hepatico: 'Não requer ajuste habitual',
      },
      posologia_completa:
        'Enalapril 10 mg — 1 comprimido pela manhã. Aumentar para 20 mg em 4 semanas se PA > meta.',
      contraindicacoes: [
        'Gravidez (Categoria D — teratogênico)',
        'Angioedema prévio por IECA',
        'Hipersensibilidade ao enalapril',
        'Uso concomitante de aliskiren em DM ou IRC',
        'Estenose bilateral de artéria renal',
      ],
      efeitos_adversos: [
        'Tosse seca (10-15% — característica de classe)',
        'Hipotensão na primeira dose',
        'Hipercalemia',
        'Piora da função renal (monitorar)',
        'Angioedema (raro, mas potencialmente fatal)',
      ],
      monitoramento: ['Creatinina e potássio em 1-2 semanas após início', 'PA após 1ª dose'],
      alternativas: [
        'Losartana 50 mg (se tosse por IECA)',
        'Anlodipino 5 mg (alternativa em monoterapia)',
        'Hidroclorotiazida 12,5 mg (complemento ou alternativa)',
      ],
      evidencia: {
        diretriz: '7ª Diretriz Brasileira de Hipertensão Arterial',
        sociedade: 'Sociedade Brasileira de Cardiologia (SBC)',
        ano: 2020,
        nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'Múltiplos ECRs e meta-análises' },
        citacao: 'Barroso WKS et al. Arq Bras Cardiol. 2021;116(3):516-658.',
        doi: '10.36660/abc.20201238',
      },
      marcas: [
        { laboratorio: 'Eurofarma', nome_comercial: 'Renitec', apresentacoes: ['5 mg', '10 mg', '20 mg'] },
        { laboratorio: 'EMS', nome_comercial: 'Enalapril EMS', apresentacoes: ['5 mg', '10 mg', '20 mg'] },
        { laboratorio: 'Aché', nome_comercial: 'Vasopril', apresentacoes: ['5 mg', '10 mg', '20 mg'] },
        { laboratorio: 'Libbs', nome_comercial: 'Enalapril Libbs', apresentacoes: ['5 mg', '10 mg', '20 mg'] },
        { laboratorio: 'Biolab', nome_comercial: 'Enalapril Biolab', apresentacoes: ['5 mg', '10 mg', '20 mg'] },
      ],
    },
    {
      id: 'hctz',
      classe_terapeutica: 'Diurético Tiazídico',
      molecula: 'Hidroclorotiazida',
      nome_generico: 'Hidroclorotiazida',
      indicacao: 'Anti-hipertensivo — em combinação com IECA/BRA para HAS estágio 2',
      dose: {
        dose_padrao: '12,5 mg',
        dose_min: '12,5 mg',
        dose_max: '25 mg/dia',
        unidade: 'mg',
        via: 'Oral',
        frequencia: '1x ao dia (manhã)',
        duracao: 'Contínuo',
        ajuste_renal: 'Evitar se TFG < 30 mL/min/1,73m²',
        ajuste_hepatico: 'Usar com cautela em hepatopatia',
      },
      posologia_completa: 'Hidroclorotiazida 12,5 mg — 1 comprimido pela manhã em combinação com IECA.',
      contraindicacoes: [
        'Anúria',
        'Hipersensibilidade a sulfonamidas',
        'TFG < 30 mL/min/1,73m²',
        'Hipocalemia refratária',
        'Gota ativa',
      ],
      efeitos_adversos: [
        'Hipocalemia (monitorar potássio)',
        'Hiponatremia',
        'Hiperuricemia / gota',
        'Hiperglicemia',
        'Fotossensibilidade',
      ],
      monitoramento: ['Eletrólitos, creatinina e glicemia em 4 semanas', 'Ácido úrico se história de gota'],
      alternativas: ['Clortalidona 12,5 mg (preferível por maior duração de ação)', 'Indapamida 1,5 mg SR'],
      evidencia: {
        diretriz: '7ª Diretriz Brasileira de Hipertensão Arterial',
        sociedade: 'Sociedade Brasileira de Cardiologia (SBC)',
        ano: 2020,
        nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'Múltiplos ECRs e meta-análises (ALLHAT)' },
        citacao: 'Barroso WKS et al. Arq Bras Cardiol. 2021;116(3):516-658.',
        doi: '10.36660/abc.20201238',
      },
      marcas: [
        { laboratorio: 'EMS', nome_comercial: 'HCTZ EMS', apresentacoes: ['12,5 mg', '25 mg'] },
        { laboratorio: 'Biolab', nome_comercial: 'Hidroclorotiazida Biolab', apresentacoes: ['25 mg'] },
        { laboratorio: 'Torrent', nome_comercial: 'Hidroclorotiazida Torrent', apresentacoes: ['25 mg'] },
      ],
    },
  ],
};

export const MOCK_SAFETY: SafetyCheck = {
  aprovado: true,
  alertas: [
    {
      id: 'a1',
      tipo: 'renal',
      severidade: 'warning',
      titulo: 'Monitorar Função Renal com IECA',
      descricao:
        'IECAs podem causar piora transitória da função renal no início do tratamento, especialmente em pacientes com estenose de artéria renal ou hipovolemia.',
      medicamentos_envolvidos: ['Enalapril'],
      recomendacao: 'Checar creatinina e potássio em 1-2 semanas após início do tratamento.',
      referencia: '7ª Diretriz SBC, 2020 — Seção 8.3',
    },
    {
      id: 'a2',
      tipo: 'interacao',
      severidade: 'info',
      titulo: 'Sinergia IECA + Tiazídico',
      descricao:
        'A combinação de enalapril com hidroclorotiazida tem efeito aditivo na redução da PA e é considerada de primeira linha para HAS estágio 2.',
      medicamentos_envolvidos: ['Enalapril', 'Hidroclorotiazida'],
      recomendacao: 'Combinação benéfica — monitorar hipocalemia com uso do tiazídico.',
      referencia: '7ª Diretriz SBC, 2020',
    },
  ],
  medicamentos_validados: ['Enalapril 10 mg 1x/dia', 'Hidroclorotiazida 12,5 mg 1x/dia'],
};

export const MOCK_CONSULTATIONS: Consultation[] = [
  {
    id: '1',
    status: 'concluida',
    paciente_nome: 'Maria Santos',
    data: '2026-06-15T10:30:00.000Z',
  },
  {
    id: '2',
    status: 'prescricao',
    paciente_nome: 'João Oliveira',
    data: '2026-06-16T14:00:00.000Z',
  },
  {
    id: '3',
    status: 'diagnostico',
    paciente_nome: 'Ana Costa',
    data: '2026-06-17T09:00:00.000Z',
  },
];
