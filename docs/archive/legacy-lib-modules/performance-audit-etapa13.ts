// ============================================================
// PRESCREVE-AI — ETAPA 13: Auditoria de Performance
//
// Mede por engine:
//   tempo_medio_ms  · tempo_maximo_ms · P50 · P95 · P99
//   heap_delta_kb   · throughput (ops/s)
//   serialização    (JSON.stringify + JSON.parse)
//
// Engines auditados:
//   FHIR         — Bundle · Validação · Export · Import
//   Knowledge Graph — Mapa · Busca · Centralidade · Lacunas
//   Copilot      — SOAP · Completo · Resumo · 2ª Opinião
//   Digital Twin — Simulação · Projeção · Comparação
//
// CDSS — Suporte à decisão. Decisão médica soberana.
// ============================================================

'use client';

// ── FHIR
import {
  gerarBundleCompleto,
  gerarBundleClinico,
  validarBundleCompleto,
  validarFHIR,
  exportarFHIR,
  importarFHIR,
  converterHL7,
  type DadosBundleCompleto,
  type DadosClinicos,
  type HL7Message,
} from './interoperability-engine';

// ── Knowledge Graph
import {
  gerarMapaConhecimento,
  buscarRelacionamentos,
  calcularCentralidade,
  encontrarLacunas,
  detectarConflitos,
  prepararVisualizacao,
} from './medical-knowledge-graph';

// ── Copilot
import {
  gerarSOAP,
  gerarResumoConsulta,
  gerarSegundaOpiniao,
  gerarHipotesesDiferenciais,
  gerarCopilotCompleto,
  type ContextoClinico,
} from './medical-copilot';

// ── Digital Twin
import {
  simularTratamento,
  projetarDesfecho,
  calcularProbabilidadeSucesso,
  type DigitalTwin,
  type EstrategiaTratamento,
} from './patient-digital-twin';

// ════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════

export interface EstatisticasLatencia {
  n:           number;
  min_ms:      number;
  max_ms:      number;
  media_ms:    number;
  p50_ms:      number;
  p95_ms:      number;
  p99_ms:      number;
  desvio_ms:   number;
  throughput:  number;   // ops/s
}

export interface HeapSnapshot {
  inicio_kb:  number;
  fim_kb:     number;
  delta_kb:   number;
  disponivel: boolean;
}

export interface SerializacaoMetrica {
  tamanho_bytes: number;
  stringify_ms:  number;
  parse_ms:      number;
  roundtrip_ms:  number;
}

export type StatusSLA = 'aprovado' | 'aviso' | 'violado';

export interface ResultadoOperacao {
  nome:          string;
  engine:        string;
  latencia:      EstatisticasLatencia;
  heap:          HeapSnapshot;
  serializacao:  SerializacaoMetrica;
  sla_ms:        number;          // threshold configurado
  sla_status:    StatusSLA;
  sla_label:     string;
  erro?:         string;
}

export interface SuitePerformance {
  engine:          string;
  operacoes:       ResultadoOperacao[];
  tempo_total_ms:  number;
  aprovadas:       number;
  avisos:          number;
  violadas:        number;
  throughput_max:  number;
  heap_max_delta:  number;
}

export interface PerformanceAuditEtapa13Result {
  timestamp:       string;
  suites:          SuitePerformance[];
  total_ops:       number;
  aprovadas:       number;
  avisos:          number;
  violadas:        number;
  tempo_total_ms:  number;
  heap_pico_kb:    number;
  throughput_max:  number;
  status_geral:    StatusSLA;
  relatorio:       string;
}

// ════════════════════════════════════════════════════════════
// INFRA DE MEDIÇÃO
// ════════════════════════════════════════════════════════════

function ts(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function heapNow(): number {
  if (typeof performance === 'undefined') return 0;
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return mem ? Math.round(mem.usedJSHeapSize / 1024) : 0;
}

function percentil(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return Math.round((sorted[Math.max(0, idx)] ?? 0) * 100) / 100;
}

function estatisticasLatencia(amostras: number[]): EstatisticasLatencia {
  if (amostras.length === 0) return { n: 0, min_ms: 0, max_ms: 0, media_ms: 0, p50_ms: 0, p95_ms: 0, p99_ms: 0, desvio_ms: 0, throughput: 0 };
  const n      = amostras.length;
  const soma   = amostras.reduce((a, b) => a + b, 0);
  const media  = soma / n;
  const max    = Math.max(...amostras);
  const min    = Math.min(...amostras);
  const desvio = Math.sqrt(amostras.reduce((acc, x) => acc + (x - media) ** 2, 0) / n);
  const total  = soma / 1000;   // segundos
  return {
    n,
    min_ms:     Math.round(min * 100) / 100,
    max_ms:     Math.round(max * 100) / 100,
    media_ms:   Math.round(media * 100) / 100,
    p50_ms:     percentil(amostras, 50),
    p95_ms:     percentil(amostras, 95),
    p99_ms:     percentil(amostras, 99),
    desvio_ms:  Math.round(desvio * 100) / 100,
    throughput: total > 0 ? Math.round(n / total) : n * 1000,
  };
}

function medirSerializacao(obj: unknown): SerializacaoMetrica {
  let json = '';
  const t0 = ts();
  try { json = JSON.stringify(obj); } catch { json = '{}'; }
  const t1 = ts();
  try { JSON.parse(json); } catch { /* ignorar */ }
  const t2 = ts();
  return {
    tamanho_bytes: json.length,
    stringify_ms:  Math.round((t1 - t0) * 100) / 100,
    parse_ms:      Math.round((t2 - t1) * 100) / 100,
    roundtrip_ms:  Math.round((t2 - t0) * 100) / 100,
  };
}

function slaStatus(media_ms: number, sla_ms: number): StatusSLA {
  if (media_ms <= sla_ms)          return 'aprovado';
  if (media_ms <= sla_ms * 1.5)    return 'aviso';
  return 'violado';
}

function slaLabel(status: StatusSLA, media: number, sla: number): string {
  const icon = status === 'aprovado' ? '✓' : status === 'aviso' ? '⚠' : '✗';
  return `${icon} ${media}ms (SLA: ${sla}ms)`;
}

/**
 * Executa fn N vezes, coleta latências, heap e serialização do último resultado.
 */
function benchmarcar<T>(
  nome: string,
  engine: string,
  fn: () => T,
  n: number,
  sla_ms: number,
): ResultadoOperacao {
  const amostras: number[] = [];
  let ultimoResultado: T | undefined;
  let erro: string | undefined;

  const heapInicio = heapNow();

  for (let i = 0; i < n; i++) {
    const t0 = ts();
    try {
      ultimoResultado = fn();
    } catch (e) {
      erro = e instanceof Error ? e.message : String(e);
      break;
    }
    amostras.push(ts() - t0);
  }

  const heapFim = heapNow();
  const latencia = estatisticasLatencia(amostras);
  const heap: HeapSnapshot = {
    inicio_kb:  heapInicio,
    fim_kb:     heapFim,
    delta_kb:   heapFim - heapInicio,
    disponivel: heapInicio > 0 || heapFim > 0,
  };

  const serial = ultimoResultado !== undefined ? medirSerializacao(ultimoResultado) : { tamanho_bytes: 0, stringify_ms: 0, parse_ms: 0, roundtrip_ms: 0 };
  const status = erro ? 'violado' as StatusSLA : slaStatus(latencia.media_ms, sla_ms);

  return {
    nome, engine, latencia, heap, serializacao: serial,
    sla_ms, sla_status: status,
    sla_label: slaLabel(status, latencia.media_ms, sla_ms),
    erro,
  };
}

// ════════════════════════════════════════════════════════════
// FIXTURES
// ════════════════════════════════════════════════════════════

const CASO_FHIR_COMPLETO: DadosBundleCompleto = {
  paciente_id:   'PAC-PERF-001',
  nome:          'Ana Paula Rodrigues',
  nascimento:    '1960-07-14',
  sexo:          'F',
  cns:           '700012345678902',
  cids:          ['I10', 'E11', 'N18.3'],
  medicamentos:  ['Enalapril', 'Metformina', 'Empagliflozina'],
  alergias:      ['Penicilina'],
  exames: { creatinina: 1.3, hba1c: 7.6, glicemia_jejum: 142, potassio: 4.2, pa_sistolica: 145, pa_diastolica: 90 },
  pa_sistolica:  145,
  pa_diastolica: 90,
  profissional: { id: 'PRAT-P001', nome: 'Dr. Carlos Vieira', crm: '112233', uf_crm: 'SP', especialidade: 'Cardiologia' },
  organizacao:  { id: 'ORG-P001', nome: 'Hospital São Paulo', tipo: 'hospital', cidade: 'São Paulo', uf: 'SP' },
  medicamentos_em_uso: [
    { molecula: 'Enalapril',      posologia: '10 mg VO 1x/dia', status: 'active' },
    { molecula: 'Metformina',     posologia: '850 mg VO 2x/dia', status: 'active' },
    { molecula: 'Empagliflozina', posologia: '10 mg VO 1x/dia', status: 'active' },
  ],
  titulo_documento: 'Sumário Clínico — HAS + DM2 + DRC',
};

const CASO_FHIR_SIMPLES: DadosClinicos = {
  paciente_id:  'PAC-PERF-002',
  nome:         'João Martins',
  nascimento:   '1970-03-20',
  sexo:         'M',
  cids:         ['I10'],
  medicamentos: ['Enalapril'],
  pa_sistolica: 148,
};

const HL7_PERF: HL7Message = {
  msh: { sending_app: 'HIS', receiving_app: 'AI', timestamp: new Date().toISOString(), message_type: 'ORU^R01' },
  pid: { patient_id: 'PAC-HL7-PERF', name: 'Teste Performance', dob: '1975-01-01', sex: 'M' },
  obr: { observation_id: 'OBR-001', description: 'Painel Metabólico', datetime: new Date().toISOString() },
  obx: [
    { loinc: '2160-0', value: '1.2', unit: 'mg/dL' },
    { loinc: '4548-4', value: '7.8', unit: '%' },
    { loinc: '8480-6', value: '148', unit: 'mmHg' },
  ],
};

const CTX_COPILOT: ContextoClinico = {
  queixa_principal: 'Dispneia progressiva + PA elevada',
  historia_doenca_atual: 'HAS há 10 anos, mal controlada. DM2 há 5 anos. Edema MMII.',
  antecedentes: ['Hipertensão Arterial', 'Diabetes Mellitus tipo 2', 'DRC G3a'],
  medicamentos_em_uso: ['Enalapril 10mg', 'Metformina 850mg'],
  alergias: [],
  exame_fisico: { pa_sistolica: 148, pa_diastolica: 92, fc: 78, spo2: 96 },
  exames_laboratoriais: { creatinina: 1.4, hba1c: 8.1, ldl: 138, potassio: 4.3 },
  cids_ativos: ['I10', 'E11', 'N18.3'],
  idade: 64,
  sexo: 'F',
  peso: 78,
};

// Digital Twin — construído em memória sem localStorage
const TWIN_PERF: DigitalTwin = {
  id: 'TWIN-PERF-001',
  paciente_anonimizado: 'HASH-PERF-001',
  perfil: {
    idade: 62,
    sexo: 'M',
    peso_kg: 88,
    altura_cm: 172,
    imc: 29.8,
    comorbidades: ['Hipertensão Arterial', 'Dislipidemia', 'DM2'],
    medicamentos_atuais: ['Enalapril 10mg', 'Atorvastatina 20mg', 'Metformina 850mg'],
    pa_sistolica: 152,
    pa_diastolica: 96,
    hba1c: 8.4,
    ldl: 142,
    creatinina: 1.2,
    tfg: 62,
    fumante: false,
    atividade_fisica: 'sedentario',
    adesao_estimada: 68,
  },
  diagnostico_principal: 'Hipertensão Arterial Sistêmica + DM2 + DRC G3a',
  status: 'ativo',
  criado_em: new Date().toISOString(),
  atualizado_em: new Date().toISOString(),
};

const ESTRATEGIAS_PERF: EstrategiaTratamento[] = [
  { nome: 'IECA + Tiazídico',    moleculas: ['Enalapril', 'Clortalidona'],    doses: ['20mg', '12,5mg'], duracao_meses: 6,  custo_mes_brl: 28,  disponivel_sus: true },
  { nome: 'BRA + BCC',          moleculas: ['Losartana', 'Anlodipina'],       doses: ['100mg', '10mg'],  duracao_meses: 6,  custo_mes_brl: 42,  disponivel_sus: true },
  { nome: 'IECA + iSGLT2',      moleculas: ['Enalapril', 'Empagliflozina'],   doses: ['10mg', '10mg'],   duracao_meses: 12, custo_mes_brl: 295, disponivel_sus: false },
  { nome: 'Quad: ARNI+BB+ARM+iSGLT2', moleculas: ['Sacubitril/Valsartana', 'Carvedilol', 'Espironolactona', 'Dapagliflozina'], doses: ['49/51mg', '25mg', '25mg', '10mg'], duracao_meses: 12, custo_mes_brl: 680, disponivel_sus: false },
];

// ════════════════════════════════════════════════════════════
// SUITE 1 — FHIR
// ════════════════════════════════════════════════════════════

function suiteFHIR(): SuitePerformance {
  const t0 = ts();
  const N_BUNDLE = 20;
  const N_IO     = 50;

  const ops: ResultadoOperacao[] = [
    benchmarcar('gerarBundleCompleto (13 resources)', 'FHIR', () => gerarBundleCompleto(CASO_FHIR_COMPLETO), N_BUNDLE, 80),
    benchmarcar('gerarBundleClinico (básico)',         'FHIR', () => gerarBundleClinico(CASO_FHIR_SIMPLES),  N_BUNDLE, 30),
    benchmarcar('validarBundleCompleto',              'FHIR', () => validarBundleCompleto(gerarBundleCompleto(CASO_FHIR_COMPLETO)), N_BUNDLE, 50),
    benchmarcar('validarFHIR (bundle básico)',         'FHIR', () => validarFHIR(gerarBundleClinico(CASO_FHIR_SIMPLES)), N_BUNDLE, 20),
    benchmarcar('exportarFHIR (serialização)',         'FHIR', () => exportarFHIR(CASO_FHIR_COMPLETO),      N_IO, 15),
    benchmarcar('importarFHIR (deserialização)',       'FHIR', () => importarFHIR(exportarFHIR(CASO_FHIR_SIMPLES)), N_IO, 15),
    benchmarcar('converterHL7 → FHIR',               'FHIR', () => converterHL7(HL7_PERF),                 N_IO, 20),
    // Throughput em burst: 100 bundles básicos
    benchmarcar('gerarBundleClinico burst ×100',      'FHIR', () => {
      for (let i = 0; i < 100; i++) gerarBundleClinico({ ...CASO_FHIR_SIMPLES, paciente_id: `P${i}` });
    }, 5, 3000),
  ];

  return buildSuite('FHIR', ops, ts() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 2 — KNOWLEDGE GRAPH
// ════════════════════════════════════════════════════════════

function suiteKnowledgeGraph(): SuitePerformance {
  const t0 = ts();
  const N = 20;

  // Grafo construído uma vez; busca/centralidade reutilizam
  const grafo = gerarMapaConhecimento();
  const nosIds = grafo.nos.slice(0, 5).map(n => n.id);

  const ops: ResultadoOperacao[] = [
    benchmarcar('gerarMapaConhecimento',           'KnowledgeGraph', () => gerarMapaConhecimento(), N, 200),
    benchmarcar('buscarRelacionamentos (I10)',     'KnowledgeGraph', () => buscarRelacionamentos('I10'), N, 10),
    benchmarcar('buscarRelacionamentos (E11)',     'KnowledgeGraph', () => buscarRelacionamentos('E11'), N, 10),
    benchmarcar('calcularCentralidade (top 10)',   'KnowledgeGraph', () => calcularCentralidade(10), N, 100),
    benchmarcar('encontrarLacunas',               'KnowledgeGraph', () => encontrarLacunas(), N, 100),
    benchmarcar('detectarConflitos (5 nós)',       'KnowledgeGraph', () => detectarConflitos(nosIds), N, 50),
    benchmarcar('prepararVisualizacao (completa)', 'KnowledgeGraph', () => prepararVisualizacao(), N, 150),
    benchmarcar('prepararVisualizacao (filtro diag)', 'KnowledgeGraph', () => prepararVisualizacao(['diagnostico']), N, 50),
    // Burst: 50 buscas simultâneas
    benchmarcar('buscarRelacionamentos burst ×50', 'KnowledgeGraph', () => {
      const cids = ['I10', 'E11', 'I50', 'J45', 'N18'];
      for (let i = 0; i < 50; i++) buscarRelacionamentos(cids[i % cids.length]);
    }, 5, 1000),
  ];

  return buildSuite('Knowledge Graph', ops, ts() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 3 — COPILOT
// ════════════════════════════════════════════════════════════

function suiteCopilot(): SuitePerformance {
  const t0 = ts();
  const N = 15;

  const ops: ResultadoOperacao[] = [
    benchmarcar('gerarSOAP (especialista)',           'Copilot', () => gerarSOAP(CTX_COPILOT, 'especialista'), N, 50),
    benchmarcar('gerarSOAP (residencia)',             'Copilot', () => gerarSOAP(CTX_COPILOT, 'residencia'),   N, 50),
    benchmarcar('gerarSOAP (auditoria)',              'Copilot', () => gerarSOAP(CTX_COPILOT, 'auditoria'),    N, 50),
    benchmarcar('gerarResumoConsulta',               'Copilot', () => gerarResumoConsulta(CTX_COPILOT),       N, 30),
    benchmarcar('gerarSegundaOpiniao',               'Copilot', () => gerarSegundaOpiniao(CTX_COPILOT),       N, 50),
    benchmarcar('gerarHipotesesDiferenciais',        'Copilot', () => gerarHipotesesDiferenciais(CTX_COPILOT),N, 30),
    benchmarcar('gerarCopilotCompleto (I10)',         'Copilot', () => gerarCopilotCompleto(CTX_COPILOT, 'I10'), N, 150),
    benchmarcar('gerarCopilotCompleto (E11)',         'Copilot', () => gerarCopilotCompleto(CTX_COPILOT, 'E11'), N, 150),
    // Burst: 20 SOAPs
    benchmarcar('gerarSOAP burst ×20',               'Copilot', () => {
      for (let i = 0; i < 20; i++) gerarSOAP(CTX_COPILOT, 'especialista');
    }, 5, 1500),
  ];

  return buildSuite('Copilot', ops, ts() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 4 — DIGITAL TWIN
// ════════════════════════════════════════════════════════════

function suiteDigitalTwin(): SuitePerformance {
  const t0 = ts();
  const N = 20;

  const ops: ResultadoOperacao[] = [
    benchmarcar('simularTratamento (4 estratégias)', 'DigitalTwin', () => simularTratamento(TWIN_PERF, ESTRATEGIAS_PERF), N, 30),
    benchmarcar('simularTratamento (1 estratégia)',  'DigitalTwin', () => simularTratamento(TWIN_PERF, [ESTRATEGIAS_PERF[0]]), N, 10),
    benchmarcar('calcularProbabilidadeSucesso',      'DigitalTwin', () => calcularProbabilidadeSucesso(TWIN_PERF, ESTRATEGIAS_PERF[0]), N, 5),
    benchmarcar('projetarDesfecho 1 mês',           'DigitalTwin', () => projetarDesfecho(TWIN_PERF, ESTRATEGIAS_PERF[0], 1), N, 10),
    benchmarcar('projetarDesfecho 6 meses',         'DigitalTwin', () => projetarDesfecho(TWIN_PERF, ESTRATEGIAS_PERF[0], 6), N, 10),
    benchmarcar('projetarDesfecho 24 meses',        'DigitalTwin', () => projetarDesfecho(TWIN_PERF, ESTRATEGIAS_PERF[0], 24), N, 10),
    // Simulação com perfil de alto risco
    benchmarcar('simularTratamento (alto risco)',    'DigitalTwin', () => {
      const altoRisco: DigitalTwin = {
        ...TWIN_PERF,
        perfil: { ...TWIN_PERF.perfil, tfg: 22, hba1c: 10.5, fumante: true, adesao_estimada: 40, comorbidades: ['HAS', 'DM2', 'DRC G4', 'IC', 'Fibrilação Atrial'] },
      };
      return simularTratamento(altoRisco, ESTRATEGIAS_PERF);
    }, N, 30),
    // Burst: 100 projeções
    benchmarcar('projetarDesfecho burst ×100',      'DigitalTwin', () => {
      const horizontes: (1 | 3 | 6 | 12 | 24)[] = [1, 3, 6, 12, 24];
      for (let i = 0; i < 100; i++) projetarDesfecho(TWIN_PERF, ESTRATEGIAS_PERF[i % ESTRATEGIAS_PERF.length], horizontes[i % 5]);
    }, 5, 500),
  ];

  return buildSuite('Digital Twin', ops, ts() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 5 — SERIALIZAÇÃO (cross-engine)
// ════════════════════════════════════════════════════════════

function suiteSerializacao(): SuitePerformance {
  const t0 = ts();
  const N = 30;

  // Pré-gera objetos para medir só serialização
  const bundle_completo  = gerarBundleCompleto(CASO_FHIR_COMPLETO);
  const bundle_simples   = gerarBundleClinico(CASO_FHIR_SIMPLES);
  const grafo            = gerarMapaConhecimento();
  const soap             = gerarSOAP(CTX_COPILOT);
  const simulacao        = simularTratamento(TWIN_PERF, ESTRATEGIAS_PERF);
  const centralidade     = calcularCentralidade(20);

  const ops: ResultadoOperacao[] = [
    benchmarcar('Serializar Bundle Completo',          'Serialização', () => JSON.stringify(bundle_completo),  N, 10),
    benchmarcar('Serializar Bundle Simples',           'Serialização', () => JSON.stringify(bundle_simples),   N, 5),
    benchmarcar('Deserializar Bundle Completo',        'Serialização', () => JSON.parse(JSON.stringify(bundle_completo)), N, 15),
    benchmarcar('Serializar Knowledge Graph',          'Serialização', () => JSON.stringify(grafo),            N, 30),
    benchmarcar('Serializar SOAP',                    'Serialização', () => JSON.stringify(soap),              N, 5),
    benchmarcar('Serializar Simulação Twin (4 est.)', 'Serialização', () => JSON.stringify(simulacao),         N, 5),
    benchmarcar('Serializar Centralidade (top 20)',   'Serialização', () => JSON.stringify(centralidade),      N, 5),
    // Roundtrip completo: Bundle Completo → JSON → parse
    benchmarcar('Roundtrip Bundle Completo',          'Serialização', () => JSON.parse(JSON.stringify(bundle_completo)), N, 20),
  ];

  return buildSuite('Serialização', ops, ts() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 6 — HEAP E CPU (cross-engine stress)
// ════════════════════════════════════════════════════════════

function suiteHeapCPU(): SuitePerformance {
  const t0 = ts();
  const N  = 10;

  const ops: ResultadoOperacao[] = [
    // FHIR: 50 bundles completos em sequência
    benchmarcar('FHIR: 50 bundles completos',     'Heap/CPU', () => {
      for (let i = 0; i < 50; i++) gerarBundleCompleto({ ...CASO_FHIR_COMPLETO, paciente_id: `P${i}` });
    }, N, 5000),

    // KG: mapa + centralidade + lacunas
    benchmarcar('KG: mapa + centralidade + lacunas', 'Heap/CPU', () => {
      const g = gerarMapaConhecimento();
      calcularCentralidade(20);
      encontrarLacunas();
      prepararVisualizacao();
      return g.total_nos;
    }, N, 800),

    // Copilot: 10 SOAPs
    benchmarcar('Copilot: 10 SOAPs',             'Heap/CPU', () => {
      for (let i = 0; i < 10; i++) gerarSOAP(CTX_COPILOT, 'especialista');
    }, N, 600),

    // Twin: 200 projeções
    benchmarcar('Twin: 200 projeções',           'Heap/CPU', () => {
      for (let i = 0; i < 200; i++) projetarDesfecho(TWIN_PERF, ESTRATEGIAS_PERF[i % 4], ((i % 5 + 1) as 1 | 3 | 6 | 12 | 24) || 1);
    }, N, 2000),

    // Pipeline completo: FHIR + KG + Copilot + Twin
    benchmarcar('Pipeline completo (todos engines)', 'Heap/CPU', () => {
      const b  = gerarBundleCompleto(CASO_FHIR_COMPLETO);
      const g  = gerarMapaConhecimento();
      const s  = gerarSOAP(CTX_COPILOT);
      const si = simularTratamento(TWIN_PERF, ESTRATEGIAS_PERF);
      return { b_entries: b.entry.length, g_nos: g.total_nos, s_modo: s.modo, si_len: si.length };
    }, N, 1000),
  ];

  return buildSuite('Heap / CPU', ops, ts() - t0);
}

// ════════════════════════════════════════════════════════════
// HELPERS DE SUITE
// ════════════════════════════════════════════════════════════

function buildSuite(engine: string, ops: ResultadoOperacao[], tempoMs: number): SuitePerformance {
  return {
    engine,
    operacoes:      ops,
    tempo_total_ms: Math.round(tempoMs),
    aprovadas:      ops.filter(o => o.sla_status === 'aprovado').length,
    avisos:         ops.filter(o => o.sla_status === 'aviso').length,
    violadas:       ops.filter(o => o.sla_status === 'violado').length,
    throughput_max: Math.max(...ops.map(o => o.latencia.throughput), 0),
    heap_max_delta: Math.max(...ops.map(o => o.heap.delta_kb), 0),
  };
}

// ════════════════════════════════════════════════════════════
// EXECUTOR PRINCIPAL
// ════════════════════════════════════════════════════════════

export function executarPerformanceAuditEtapa13(): PerformanceAuditEtapa13Result {
  const t0 = ts();

  const suites = [
    suiteFHIR(),
    suiteKnowledgeGraph(),
    suiteCopilot(),
    suiteDigitalTwin(),
    suiteSerializacao(),
    suiteHeapCPU(),
  ];

  const todas_ops    = suites.flatMap(s => s.operacoes);
  const total_ops    = todas_ops.length;
  const aprovadas    = todas_ops.filter(o => o.sla_status === 'aprovado').length;
  const avisos       = todas_ops.filter(o => o.sla_status === 'aviso').length;
  const violadas     = todas_ops.filter(o => o.sla_status === 'violado').length;
  const heap_pico_kb = Math.max(...todas_ops.map(o => o.heap.fim_kb), 0);
  const throughput_max = Math.max(...todas_ops.map(o => o.latencia.throughput), 0);

  const status_geral: StatusSLA =
    violadas > 0 ? 'violado' : avisos > 0 ? 'aviso' : 'aprovado';

  const resultado: PerformanceAuditEtapa13Result = {
    timestamp:      new Date().toISOString(),
    suites,
    total_ops, aprovadas, avisos, violadas,
    tempo_total_ms: Math.round(ts() - t0),
    heap_pico_kb,
    throughput_max,
    status_geral,
    relatorio: '',
  };
  resultado.relatorio = gerarRelatorioPerformance(resultado);
  return resultado;
}

// ════════════════════════════════════════════════════════════
// RELATÓRIO TEXTO
// ════════════════════════════════════════════════════════════

export function gerarRelatorioPerformance(r: PerformanceAuditEtapa13Result): string {
  const L: string[] = [
    '══════════════════════════════════════════════════════════════════════',
    '  PRESCREVE-AI — ETAPA 13: AUDITORIA DE PERFORMANCE',
    '══════════════════════════════════════════════════════════════════════',
    `  Timestamp     : ${r.timestamp}`,
    `  Total ops     : ${r.total_ops} | ✓ ${r.aprovadas} | ⚠ ${r.avisos} | ✗ ${r.violadas}`,
    `  Tempo total   : ${r.tempo_total_ms}ms`,
    `  Heap pico     : ${r.heap_pico_kb > 0 ? `${r.heap_pico_kb} KB` : 'N/D (SSR/Node)'}`,
    `  Throughput max: ${r.throughput_max.toLocaleString('pt-BR')} ops/s`,
    `  Status geral  : ${r.status_geral === 'aprovado' ? '✓ APROVADO' : r.status_geral === 'aviso' ? '⚠ COM AVISOS' : '✗ VIOLAÇÕES SLA'}`,
  ];

  for (const suite of r.suites) {
    L.push('──────────────────────────────────────────────────────────────────────');
    const icon = suite.violadas > 0 ? '✗' : suite.avisos > 0 ? '⚠' : '✓';
    L.push(`  ${icon} ENGINE: ${suite.engine.toUpperCase()} — ${suite.tempo_total_ms}ms total | ✓${suite.aprovadas} ⚠${suite.avisos} ✗${suite.violadas}`);
    L.push(`    Throughput max: ${suite.throughput_max.toLocaleString('pt-BR')} ops/s | Heap Δ max: ${suite.heap_max_delta > 0 ? `${suite.heap_max_delta} KB` : 'N/D'}`);
    L.push('');
    L.push(`    ${'Operação'.padEnd(45)} | Média    | P50    | P95    | P99    | SLA`);
    L.push('    ' + '─'.repeat(90));
    for (const op of suite.operacoes) {
      const nm  = op.nome.padEnd(45);
      const med = `${op.latencia.media_ms}ms`.padEnd(8);
      const p50 = `${op.latencia.p50_ms}ms`.padEnd(6);
      const p95 = `${op.latencia.p95_ms}ms`.padEnd(6);
      const p99 = `${op.latencia.p99_ms}ms`.padEnd(6);
      const sla = op.sla_label;
      L.push(`    ${nm} | ${med} | ${p50} | ${p95} | ${p99} | ${sla}`);
      if (op.serializacao.tamanho_bytes > 0) {
        const kb = (op.serializacao.tamanho_bytes / 1024).toFixed(1);
        L.push(`       ↳ Serialização: ${kb}KB | stringify:${op.serializacao.stringify_ms}ms | parse:${op.serializacao.parse_ms}ms`);
      }
      if (op.erro) L.push(`       ⛔ ERRO: ${op.erro}`);
    }
  }

  L.push('──────────────────────────────────────────────────────────────────────');
  L.push('  THRESHOLDS SLA (tempo médio)');
  L.push('──────────────────────────────────────────────────────────────────────');
  const slaTabela = [
    ['FHIR gerarBundleCompleto',           '80ms'],
    ['FHIR validarBundleCompleto',         '50ms'],
    ['FHIR export/import',                 '15ms'],
    ['Knowledge Graph gerarMapa',          '200ms'],
    ['Knowledge Graph buscarRelacionamentos','10ms'],
    ['Knowledge Graph calcularCentralidade','100ms'],
    ['Copilot gerarSOAP',                  '50ms'],
    ['Copilot gerarCopilotCompleto',       '150ms'],
    ['Digital Twin simularTratamento',     '30ms'],
    ['Digital Twin projetarDesfecho',      '10ms'],
    ['Serialização (qualquer engine)',     '30ms'],
  ];
  for (const [op, sla] of slaTabela) {
    L.push(`  • ${op.padEnd(48)} → ${sla}`);
  }

  L.push('══════════════════════════════════════════════════════════════════════');
  L.push(r.status_geral === 'aprovado'
    ? '  ✓ PERFORMANCE DENTRO DOS SLAs — Sistema pronto para produção'
    : r.status_geral === 'aviso'
    ? '  ⚠ PERFORMANCE COM AVISOS — Monitorar em produção'
    : '  ✗ VIOLAÇÕES DE SLA — Otimização necessária antes de produção');
  L.push('  CDSS — Suporte à decisão clínica. Decisão médica soberana.');
  L.push('══════════════════════════════════════════════════════════════════════');
  return L.join('\n');
}

// ════════════════════════════════════════════════════════════
// SANITY CHECK (< 200ms)
// ════════════════════════════════════════════════════════════

export function sanityCheckPerformance(): {
  fhir_ms:      number;
  kg_ms:        number;
  copilot_ms:   number;
  twin_ms:      number;
  serial_ms:    number;
  total_ms:     number;
  dentro_sla:   boolean;
} {
  const t0 = ts();

  const t1 = ts(); gerarBundleCompleto(CASO_FHIR_COMPLETO); const fhir_ms = Math.round(ts() - t1);
  const t2 = ts(); gerarMapaConhecimento();                  const kg_ms   = Math.round(ts() - t2);
  const t3 = ts(); gerarSOAP(CTX_COPILOT);                  const cop_ms  = Math.round(ts() - t3);
  const t4 = ts(); simularTratamento(TWIN_PERF, ESTRATEGIAS_PERF); const twin_ms = Math.round(ts() - t4);
  const t5 = ts(); JSON.stringify(gerarBundleCompleto(CASO_FHIR_COMPLETO)); const serial_ms = Math.round(ts() - t5);

  const total_ms = Math.round(ts() - t0);
  return {
    fhir_ms, kg_ms, copilot_ms: cop_ms, twin_ms, serial_ms, total_ms,
    dentro_sla: fhir_ms < 500 && kg_ms < 1000 && cop_ms < 500 && twin_ms < 200,
  };
}
