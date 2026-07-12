/**
 * PHASE 22.4 — Enterprise Stress Test
 * Tests limits, measures performance, identifies bottlenecks
 * Node.js / tsx execution — no browser APIs required
 */

import { calcularDosagem, calcularBSA, getMedicamentoById, idadeDias } from './dosing-engine';
import { screenPIMs, assessFrailty, calcAnticholinergicBurden, calcClCrCockcroft, generateDeprescribingPlan } from './geriatric-engine';
import { detectarConflitos } from './guideline-conflict-engine';
import { calcSofa, calcQsofa, assessICUPatient, calcVasopressorInfusion, calcPPI, calcVCAlvo, ICUPatient } from './icu-engine';
import { calcBSAMosteller, calcMASCC, calcKhorana, assessOncologyPatient, OncologyPatient } from './oncology-engine';
import { assessPalliativePatient, PalliativePatient } from './palliative-engine';
import { calcDosePediatrica, PediatricPatient } from './pediatric-engine';
import { screenObstetricSafety, ObstetricProfile } from './obstetric-engine';
import { calcularNNT, calcularNNH } from './outcome-engine';
import { getAllDrugs } from './pharma-database';
import {
  registrarRecomendacao, listarRecomendacoes, verificarIntegridade,
  calcularEstatisticasRegistry, gerarSumarios,
} from './recommendation-registry';
import {
  registrarReview, listarReviews, calcularAcordoTerapeutico,
  gerarQualityDashboard, registrarBoardValidation, calcularTodosPaineis,
} from './physician-validation-engine';
import {
  exportarFHIR, gerarBundleClinico, validarFHIR, mapearCID, mapearLOINC,
  DadosClinicos,
} from './interoperability-engine';
import {
  gerarMapaConhecimento, calcularCentralidade, encontrarLacunas,
  prepararVisualizacao, buscarRelacionamentos,
} from './medical-knowledge-graph';
import { EVIDENCE_DB, getTotalEstudosByDiagnostico, getTotalPacientesByDiagnostico } from './evidence-engine';
import { gerarTimeline, calcularPesoHistorico } from './evidence-timeline';
import { gerarPrognostico, PerfilPrognostico } from './prognosis-engine';
import { gerarDeltaClinico, listarAlertas, getEstadoMonitoramento } from './scientific-update-engine';
import { gerarPainelRWE, registrarCaso as registrarCasoRWE, listarRWE } from './rwe-engine';

// ─── INFRA DE MEDIÇÃO ─────────────────────────────���───────────────────────────

interface BenchResult {
  name: string;
  iterations: number;
  total_ms: number;
  avg_ms: number;
  min_ms: number;
  max_ms: number;
  p95_ms: number;
  p99_ms: number;
  ops_per_sec: number;
  errors: number;
  mem_delta_mb: number;
  bottleneck: boolean;
  notes: string[];
}

interface ConcurrencyResult {
  name: string;
  concurrency: number;
  total_ms: number;
  throughput_ops_per_sec: number;
  errors: number;
  contention_detected: boolean;
}

const benchResults: BenchResult[] = [];
const concResults: ConcurrencyResult[] = [];
const integrityIssues: string[] = [];
const duplications: string[] = [];

function memMB(): number {
  return process.memoryUsage().heapUsed / 1024 / 1024;
}

function bench(
  name: string,
  iterations: number,
  fn: () => void,
  notes: string[] = [],
  bottleneckThresholdMs = 1,
): BenchResult {
  const times: number[] = [];
  let errors = 0;
  const memBefore = memMB();

  for (let i = 0; i < iterations; i++) {
    const t = performance.now();
    try { fn(); } catch { errors++; }
    times.push(performance.now() - t);
  }

  const memAfter = memMB();
  times.sort((a, b) => a - b);
  const total_ms = times.reduce((a, b) => a + b, 0);
  const avg_ms = total_ms / iterations;
  const p95_ms = times[Math.floor(iterations * 0.95)] ?? 0;
  const p99_ms = times[Math.floor(iterations * 0.99)] ?? 0;
  const bottleneck = avg_ms > bottleneckThresholdMs || p99_ms > bottleneckThresholdMs * 10;

  const r: BenchResult = {
    name, iterations,
    total_ms: Math.round(total_ms * 100) / 100,
    avg_ms: Math.round(avg_ms * 1000) / 1000,
    min_ms: Math.round(times[0] * 1000) / 1000,
    max_ms: Math.round(times[times.length - 1] * 1000) / 1000,
    p95_ms: Math.round(p95_ms * 1000) / 1000,
    p99_ms: Math.round(p99_ms * 1000) / 1000,
    ops_per_sec: Math.round(1000 / avg_ms),
    errors,
    mem_delta_mb: Math.round((memAfter - memBefore) * 100) / 100,
    bottleneck,
    notes: errors > 0 ? [`${errors}/${iterations} calls threw exceptions`, ...notes] : notes,
  };
  benchResults.push(r);
  return r;
}

async function benchAsync(
  name: string,
  concurrency: number,
  fn: () => unknown,
): Promise<ConcurrencyResult> {
  const t0 = performance.now();
  let errors = 0;
  const tasks = Array.from({ length: concurrency }, () =>
    Promise.resolve().then(fn).catch(() => { errors++; })
  );
  await Promise.all(tasks);
  const total_ms = performance.now() - t0;

  // Detect contention: if total_ms > 2× expected single-thread time, there may be contention
  const single = bench(`${name}_single`, 1, fn as () => void, [], 9999);
  const expected_parallel_ms = single.avg_ms * 1.5; // allow 50% overhead
  const contention_detected = total_ms > expected_parallel_ms * concurrency * 0.2;

  const r: ConcurrencyResult = {
    name, concurrency,
    total_ms: Math.round(total_ms * 10) / 10,
    throughput_ops_per_sec: Math.round((concurrency / total_ms) * 1000),
    errors,
    contention_detected,
  };
  concResults.push(r);
  return r;
}

// ─── FACTORIES ───────────────────────��─────────────��──────────────────────────

const DIAGS = ['has','dm2','icc','dpoc','epilepsia','fibrilacao-atrial','depressao','doenca-renal-cronica','cirrose-hepatica','artrite-reumatoide'];
const MOLS  = ['enalapril','metformina','atorvastatina','omeprazol','sertralina','losartana','carvedilol','furosemida','aspirina','amlodipino'];
const CLASSES = ['ieca','biguanida','estatina','ibb','ssri','ara2','bb','diuretico','antiagreganate','bcc'];
const ENG_ORIGINS: Array<'clinical-therapeutics'|'clinical-decision-support'|'pharma-database'|'safety-rules'|'second-opinion'|'manual'> =
  ['clinical-therapeutics','clinical-decision-support','pharma-database','safety-rules','second-opinion','manual'];

function randOf<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function uid(): string { return Math.random().toString(36).slice(2, 10); }

function mkDados(i: number): DadosClinicos {
  return {
    paciente_id: `P${i.toString().padStart(6,'0')}`,
    nome: `Paciente ${i}`,
    nascimento: `${1940 + (i % 60)}-${String((i % 12) + 1).padStart(2,'0')}-01`,
    sexo: i % 2 === 0 ? 'M' : 'F',
    cids: [randOf(DIAGS), randOf(DIAGS)],
    medicamentos: [randOf(MOLS), randOf(MOLS), randOf(MOLS)],
    exames: { glicemia: 90 + i % 80, creatinina: 0.8 + (i % 30) * 0.05 },
    pa_sistolica: 120 + (i % 40),
    pa_diastolica: 75 + (i % 20),
  };
}

function mkICU(i: number): ICUPatient {
  return {
    pesoKg: 60 + (i % 40), alturaCm: 160 + (i % 25),
    sexo: i % 2 === 0 ? 'M' : 'F', idadeAnos: 30 + (i % 50),
    pao2: 60 + (i % 80), fio2: 0.3 + (i % 5) * 0.08,
    glasgow: 8 + (i % 7), pasMMHg: 75 + (i % 50),
    frIpm: 14 + (i % 20), temperaturaC: 36.5 + (i % 30) * 0.1,
    lactato: 1.0 + (i % 40) * 0.1,
  };
}

function mkOnco(i: number): OncologyPatient {
  const w = 55 + (i % 35); const h = 155 + (i % 30);
  return {
    idadeAnos: 35 + (i % 45), sexo: i % 2 === 0 ? 'M' : 'F',
    ecogPS: (i % 5) as 0|1|2|3|4,
    pesoKg: w, alturaCm: h,
    diagnostico: randOf(['pulmao','mama','colo_reto','leucemia','linfoma']),
    esquemaQuimio: [randOf(['carboplatina','paclitaxel','fluorouracil','doxorrubicina'])],
    neutrofilosAbsolutos: 500 + (i % 3000),
    hemoglobina: 8 + (i % 6), plaquetas: 50000 + (i % 200000),
  };
}

function mkPed(i: number): PediatricPatient {
  const age = 1 + (i % 16);
  return { pesoKg: age * 3 + 4, alturaCm: age * 5 + 75, idadeMeses: age * 12 };
}

function mkPaliativo(i: number): PalliativePatient {
  return {
    idadeAnos: 55 + (i % 30), pesoKg: 50 + (i % 30),
    diagnosticoPrincipal: randOf(['ca_pulmao','ca_pancreas','ca_mama','icc_terminal','dpoc_terminal']),
    pps: 10 + (i % 9) * 10,
    opioideAtual: randOf(['morfina','oxicodona','fentanil','hidromorfona']),
    doseOpioideAtual: 30 + (i % 10) * 10, viaAtual: 'VO',
    funcaoRenal: randOf(['normal','moderada','grave']),
  };
}

function mkPerfil(i: number): PerfilPrognostico {
  return {
    cid: randOf(['I50','J44','I10','E11','N18']),
    idade: 40 + (i % 40), sexo: i % 2 === 0 ? 'M' : 'F',
    comorbidades: [randOf(['HAS','DM2','IRC','DPOC','FA'])],
    creatinina: 0.8 + (i % 30) * 0.06,
    internacoes_12m: i % 4,
    score_risco_base: 20 + (i % 60),
  };
}

function mkRecommendation(i: number) {
  return {
    diagnostico_id: randOf(DIAGS),
    diagnostico_nome: `Diagnóstico ${i}`,
    molecula: randOf(MOLS),
    classe_terapeutica: randOf(CLASSES),
    indicacao: `Indicação ${i}`,
    guideline_id: `GL-${uid()}`,
    guideline_sigla: randOf(['AHA','SBC','SBD','ESC','ACC','WHO']),
    guideline_versao: '2024',
    guideline_sociedade: 'SBC',
    guideline_ano: 2023,
    evidencias: [],
    engine: randOf(ENG_ORIGINS),
    score_confianca: 60 + (i % 40),
    score_seguranca: 65 + (i % 35),
    score_evidencia: 55 + (i % 45),
  };
}

function mkReview(i: number) {
  return {
    medico_crm_hash: `H${uid()}`,
    especialidade: randOf(['cardiologia','neurologia','endocrinologia','pneumologia','infectologia'] as const),
    diagnostico_id: randOf(DIAGS),
    diagnostico_nome: `Diagnóstico ${i}`,
    molecula: randOf(MOLS),
    classe_terapeutica: randOf(CLASSES),
    guideline_sigla: randOf(['AHA','SBC','ESC']),
    veredicto: randOf(['concordo','concordo_parcialmente','discordo','nao_aplicavel'] as const),
    perfil_paciente: `Paciente ${55 + i % 30} anos`,
  };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main(debug = process.env.NODE_ENV === 'development'): Promise<Record<string, unknown>> {
const log = (msg: string) => { if (debug) console.log(msg); };

// ─── PHASE 1: CONCORRÊNCIA — 100 consultas simultâneas ────────────────────────

log('=== PHASE 22.4 STRESS TEST: START ===');
const phaseStart = performance.now();

log('[1/9] Concurrency test — 100 simultaneous queries...');
const concTests = await Promise.all([
  benchAsync('concurrent_detectarConflitos', 100,
    () => detectarConflitos(randOf(DIAGS))),
  benchAsync('concurrent_calcClCrCockcroft', 100,
    () => calcClCrCockcroft(55, 75, 88, 'M')),
  benchAsync('concurrent_exportarFHIR', 100,
    () => exportarFHIR(mkDados(Math.floor(Math.random() * 1000)))),
  benchAsync('concurrent_assessICUPatient', 100,
    () => assessICUPatient(mkICU(Math.floor(Math.random() * 100)))),
  benchAsync('concurrent_assessOncologyPatient', 100,
    () => assessOncologyPatient(mkOnco(Math.floor(Math.random() * 100)))),
]);

// ─── PHASE 2: 1000 PRESCRIÇÕES ────────────────────���───────────────────────────

log('[2/9] 1000 prescriptions...');

bench('prescricao_calcularDosagem_1000', 1000, () => {
  const drug = getMedicamentoById(randOf(['paracetamol','dipirona','ibuprofeno']));
  if (drug) calcularDosagem(70, 170, idadeDias(40, 0, 0), drug, drug.formulacoes[0]?.id ?? '');
}, ['via getMedicamentoById — null-safe']);

bench('prescricao_calcClCr_1000', 1000, () => {
  calcClCrCockcroft(30 + Math.random() * 60 | 0, 50 + Math.random() * 40, 70 + Math.random() * 200, 'M');
}, ['full range: age 30–90, creat 70–270']);

bench('prescricao_detectarConflitos_1000', 1000, () => {
  detectarConflitos(randOf(DIAGS));
}, ['10 distinct diagnoses']);

bench('prescricao_calcularBSA_1000', 1000, () => {
  calcularBSA(50 + Math.random() * 50, 150 + Math.random() * 40);
});

bench('prescricao_calcularNNT_1000', 1000, () => {
  calcularNNT(0.05 + Math.random() * 0.3, 0.1 + Math.random() * 0.4);
});

bench('prescricao_screenPIMs_1000', 1000, () => {
  screenPIMs({ idadeAnos: 70 + Math.random() * 20 | 0, sexo: 'M',
    medicamentosAtivos: [randOf(MOLS), randOf(MOLS), randOf(MOLS)],
    diagnosticos: [randOf(DIAGS)] });
}, ['Beers + STOPP + START on every call']);

bench('prescricao_assessICU_1000', 1000, () => {
  assessICUPatient(mkICU(Math.random() * 1000 | 0));
}, ['full ICU patient assessment']);

bench('prescricao_assessOnco_1000', 1000, () => {
  assessOncologyPatient(mkOnco(Math.random() * 1000 | 0));
}, ['BSA + ECOG + antiemese + CTCAE']);

bench('prescricao_calcDosePediatrica_1000', 1000, () => {
  calcDosePediatrica('amoxicilina', mkPed(Math.random() * 100 | 0));
}, ['pediatric dose with PEDIATRIC_DOSES lookup']);

bench('prescricao_screenObstetric_1000', 1000, () => {
  const profile: ObstetricProfile = { statusGestacional: 'gestante', idadeGestacionalSemanas: 20, trimestre: 2 };
  screenObstetricSafety(randOf(['enalapril','metformina','levotiroxina','cefalexina','ibuprofeno']), profile);
});

// ─── PHASE 3: 500 RECOMMENDATION REGISTRY ────────────────────────────────────

log('[3/9] 500 Recommendation Registry entries...');

const registeredIds: string[] = [];
bench('registry_registrar_500', 500, () => {
  const rec = registrarRecomendacao(mkRecommendation(Math.random() * 10000 | 0));
  registeredIds.push(rec.id);
}, ['localStorage no-op in Node: data in-memory only']);

bench('registry_listar_500', 500, () => {
  listarRecomendacoes({ diagnostico_id: randOf(DIAGS) });
}, ['filter on each call']);

bench('registry_integridade_500', 500, () => {
  // verify integrity of a freshly built object
  const draft = mkRecommendation(Math.random() * 500 | 0);
  const rec = registrarRecomendacao(draft);
  const ok = verificarIntegridade(rec);
  if (!ok) integrityIssues.push(rec.id);
}, ['hash verification on every record']);

const statsReg = calcularEstatisticasRegistry();
const sumarios = gerarSumarios(listarRecomendacoes());

bench('registry_estatisticas_100', 100, () => {
  calcularEstatisticasRegistry();
}, ['full stats recalc']);

// Integrity check: duplicate IDs
const recIds = listarRecomendacoes().map(r => r.id);
const uniqueIds = new Set(recIds);
if (uniqueIds.size < recIds.length) {
  duplications.push(`Recommendation Registry: ${recIds.length - uniqueIds.size} duplicate IDs detected`);
}

// ─── PHASE 4: 500 VALIDATION REVIEWS ────────────────────��────────────────────

log('[4/9] 500 Validation Reviews...');

bench('validation_registrarReview_500', 500, () => {
  registrarReview(mkReview(Math.random() * 5000 | 0));
}, ['PhysicianReview with hash integrity']);

bench('validation_listarReviews_500', 500, () => {
  listarReviews({ especialidade: randOf(['cardiologia','neurologia','endocrinologia']) });
});

bench('validation_calcAcordoTerapeutico_100', 100, () => {
  calcularAcordoTerapeutico(); // loads from localStorage (no-op in Node)
});

bench('validation_registrarBoard_500', 500, () => {
  registrarBoardValidation({
    medico_crm_hash: `H${uid()}`,
    especialidade: randOf(['cardiologia','endocrinologia','pneumologia','infectologia'] as const),
    diagnostico_id: randOf(DIAGS),
    diagnostico_nome: `Diagnóstico board ${uid()}`,
    molecula: randOf(MOLS),
    classe_terapeutica: randOf(CLASSES),
    guideline_sigla: randOf(['AHA','SBC','ESC']),
    score_confianca_sistema: 60 + Math.random() * 40 | 0,
    status: randOf(['aprovada','aprovada_com_ressalvas','necessita_revisao','reprovada'] as const),
    justificativa: `Justificativa board ${uid()}`,
  });
});

bench('validation_calcTodosPaineis_50', 50, () => {
  calcularTodosPaineis();
}, ['heavy: iterates all reviews per specialty']);

bench('validation_gerarQualityDashboard_50', 50, () => {
  gerarQualityDashboard();
}, ['full quality dashboard rebuild']);

// ─── PHASE 5: 10 000 FHIR EXPORTS ─────────────────���──────────────────────────

log('[5/9] 10000 FHIR exports...');

bench('fhir_exportarFHIR_10000', 10000, () => {
  exportarFHIR(mkDados(Math.random() * 10000 | 0));
}, ['full JSON serialization every call'], 0.5);

bench('fhir_gerarBundleClinico_1000', 1000, () => {
  gerarBundleClinico(mkDados(Math.random() * 1000 | 0));
}, ['FHIR R4 bundle assembly']);

bench('fhir_validarFHIR_1000', 1000, () => {
  const bundle = gerarBundleClinico(mkDados(Math.random() * 1000 | 0));
  validarFHIR(bundle);
}, ['gerarBundle + validarFHIR chain']);

bench('fhir_mapearCID_1000', 1000, () => {
  mapearCID(randOf(['I10','E11','I50','J44','K21','N18','C34','F33']));
}, ['CID→SNOMED map lookup']);

bench('fhir_mapearLOINC_1000', 1000, () => {
  mapearLOINC(randOf(['glicemia','creatinina','hemoglobina','bnp','troponina']));
}, ['exame→LOINC map lookup']);

// Check FHIR output integrity
let fhirIntegrityFail = 0;
for (let i = 0; i < 100; i++) {
  const json = exportarFHIR(mkDados(i));
  try {
    const obj = JSON.parse(json);
    if (obj.resourceType !== 'Bundle') fhirIntegrityFail++;
  } catch { fhirIntegrityFail++; }
}
if (fhirIntegrityFail > 0) integrityIssues.push(`FHIR: ${fhirIntegrityFail}/100 bundles invalid`);

// ─── PHASE 6: KNOWLEDGE GRAPH ─────────────────────────────────────────────────

log('[6/9] Knowledge Graph...');

bench('knowledgegraph_gerarMapa_10', 10, () => {
  gerarMapaConhecimento();
}, ['full graph construction — expensive'], 10);

const mapa = gerarMapaConhecimento();
const noCount = mapa.nos.length;
const arestaCount = mapa.arestas.length;

bench('knowledgegraph_calcularCentralidade_100', 100, () => {
  calcularCentralidade(20);
}, [`graph: ${noCount} nodes, ${arestaCount} edges`]);

bench('knowledgegraph_encontrarLacunas_100', 100, () => {
  encontrarLacunas();
}, ['knowledge gap detection']);

bench('knowledgegraph_buscarRelacionamentos_1000', 1000, () => {
  buscarRelacionamentos(randOf(MOLS));
}, ['node relationship traversal']);

bench('knowledgegraph_prepararVisualizacao_100', 100, () => {
  prepararVisualizacao();
}, ['full graph → D3 layout data']);

// Integrity: no duplicate node IDs in graph
const nodeIds = mapa.nos.map(n => n.id);
const uniqueNodeIds = new Set(nodeIds);
if (uniqueNodeIds.size < nodeIds.length) {
  duplications.push(`KnowledgeGraph: ${nodeIds.length - uniqueNodeIds.size} duplicate node IDs`);
}

// ─── PHASE 7: EVIDENCE ENGINE + TIMELINE ─────────────────────────────────────

log('[7/9] Evidence Engine + Timeline...');

bench('evidence_iterateAll_100', 100, () => {
  EVIDENCE_DB.forEach(diag => {
    getTotalEstudosByDiagnostico(diag);   // takes DiagnosticoEvidencia object
    getTotalPacientesByDiagnostico(diag); // takes DiagnosticoEvidencia object
  });
}, [`EVIDENCE_DB has ${EVIDENCE_DB.length} entries`]);

bench('evidence_timeline_gerarTimeline_1000', 1000, () => {
  gerarTimeline(randOf(['I10','E11','I50','J44','N18','C34','F33']));
}, ['evidence timeline per diagnosis']);

bench('evidence_calcularPesoHistorico_1000', 1000, () => {
  const marcos = gerarTimeline(randOf(['I10','E11'])).marcos;
  marcos.forEach(m => calcularPesoHistorico(m));
}, ['historical weight per marco']);

bench('evidence_prognosis_500', 500, () => {
  gerarPrognostico(mkPerfil(Math.random() * 500 | 0), randOf(['30d','6m','1a','5a']));
}, ['survival function + event probability']);

bench('evidence_scientificUpdate_200', 200, () => {
  gerarDeltaClinico(randOf(DIAGS));
  listarAlertas({ urgencia: randOf(['imediata','alta','moderada','informativa'] as const) });
  getEstadoMonitoramento();
}, ['guideline delta + alert listing + monitoring state']);

// ─── PHASE 8: DASHBOARD ───────────────────��───────────────────────────────────

log('[8/9] Dashboard...');

bench('dashboard_qualityDashboard_100', 100, () => {
  gerarQualityDashboard();
}, ['full quality dashboard: all specialties + calibration']);

bench('dashboard_rwe_painel_100', 100, () => {
  gerarPainelRWE(randOf(DIAGS));
}, ['RWE panel per diagnosis']);

bench('dashboard_rwe_listar_500', 500, () => {
  listarRWE({ origem: randOf(['hospital','clinica','sociedade','literatura','registro']) });
});

bench('dashboard_calcularNNH_1000', 1000, () => {
  calcularNNH(0.05 + Math.random() * 0.2, 0.02 + Math.random() * 0.1);
});

bench('dashboard_assessFrailty_1000', 1000, () => {
  assessFrailty(1 + Math.random() * 8 | 0);
});

bench('dashboard_calcAnticholinergic_500', 500, () => {
  calcAnticholinergicBurden([randOf(MOLS), randOf(MOLS), randOf(MOLS), randOf(MOLS)]);
});

// ─── PHASE 9: GETALLDRUGS — CACHE E MEMÓRIA ───────────────────────────────────

log('[9/9] getAllDrugs cache + integrity...');

// First call (cold)
const t0cold = performance.now();
const drugsCold = getAllDrugs();
const coldMs = performance.now() - t0cold;

// Second call (warm — should be cached)
const t0warm = performance.now();
const drugsWarm = getAllDrugs();
const warmMs = performance.now() - t0warm;

const cacheSpeedup = coldMs / Math.max(warmMs, 0.001);
const drugCount = drugsCold.length;

// Integrity: no duplicate molecule IDs
const allIds = drugsCold.map(d => d.id);
const uniqueAllIds = new Set(allIds);
if (uniqueAllIds.size < allIds.length) {
  const dupes = allIds.filter((id, i) => allIds.indexOf(id) !== i);
  duplications.push(`getAllDrugs: ${dupes.length} duplicate molecule IDs: [${[...new Set(dupes)].join(', ')}]`);
}

// Integrity: required fields
let missingFields = 0;
for (const d of drugsCold) {
  if (!d.id || !d.molecula || !d.categoria || !d.dose_adulto) missingFields++;
}
if (missingFields > 0) integrityIssues.push(`getAllDrugs: ${missingFields}/${drugCount} entries missing required fields`);

// Stress: 1000 getAllDrugs calls
bench('getAllDrugs_1000', 1000, () => {
  getAllDrugs();
}, ['tests lazy cache — should be O(1) after first call']);

// Stress: full iteration 100×
bench('getAllDrugs_iterate_100', 100, () => {
  const drugs = getAllDrugs();
  drugs.forEach(d => d.marcas?.length ?? 0);
}, ['full array traversal including marcas']);

// ─── FINAL REPORT ──────────────���──────────────────────���───────────────────────

const totalElapsed = performance.now() - phaseStart;

// Bottleneck analysis
const bottlenecks = benchResults.filter(r => r.bottleneck);
const slowestOps = [...benchResults].sort((a, b) => b.avg_ms - a.avg_ms).slice(0, 5);
const highestMemOps = [...benchResults].sort((a, b) => b.mem_delta_mb - a.mem_delta_mb).slice(0, 5);
const errorOps = benchResults.filter(r => r.errors > 0);

// Totals
const totalOps = benchResults.reduce((s, r) => s + r.iterations, 0);
const totalCalls = totalOps + concResults.reduce((s, r) => s + r.concurrency, 0);
const avgOpsPerSec = benchResults.reduce((s, r) => s + r.ops_per_sec, 0) / benchResults.length;
const peakMemDelta = Math.max(...benchResults.map(r => r.mem_delta_mb));
const finalMem = memMB();

const report = {
  phase: '22.4 — Enterprise Stress Test',
  timestamp: new Date().toISOString(),
  total_elapsed_ms: Math.round(totalElapsed),
  total_elapsed_s: (totalElapsed / 1000).toFixed(2),

  summary: {
    total_engine_calls: totalCalls,
    bench_operations: totalOps,
    concurrent_batches: concResults.length,
    concurrent_calls: concResults.reduce((s, r) => s + r.concurrency, 0),
    avg_ops_per_sec: Math.round(avgOpsPerSec),
    peak_mem_delta_mb: peakMemDelta,
    final_heap_mb: Math.round(finalMem * 10) / 10,
    bottlenecks_detected: bottlenecks.length,
    integrity_issues: integrityIssues.length,
    duplications: duplications.length,
    total_errors: benchResults.reduce((s, r) => s + r.errors, 0),
  },

  cache_analysis: {
    getAllDrugs_cold_ms: Math.round(coldMs * 1000) / 1000,
    getAllDrugs_warm_ms: Math.round(warmMs * 1000) / 1000,
    cache_speedup_x: Math.round(cacheSpeedup * 10) / 10,
    drug_count: drugCount,
    cache_effective: cacheSpeedup > 2,
  },

  fhir_integrity: {
    samples_tested: 100,
    failures: fhirIntegrityFail,
    pass_rate: `${((100 - fhirIntegrityFail) / 100 * 100).toFixed(1)}%`,
  },

  knowledge_graph: {
    node_count: noCount,
    edge_count: arestaCount,
    duplicate_nodes: nodeIds.length - uniqueNodeIds.size,
  },

  pharma_database: {
    total_drugs: drugCount,
    duplicate_ids: allIds.length - uniqueAllIds.size,
    missing_required_fields: missingFields,
  },

  recommendation_registry: {
    entries_registered: statsReg.total,
    sumarios_generated: sumarios.length,
    integrity_failures: integrityIssues.filter(s => s.includes('registry')).length,
    duplicate_ids: recIds.length - uniqueIds.size,
  },

  bottlenecks: bottlenecks.map(r => ({
    name: r.name,
    avg_ms: r.avg_ms,
    p99_ms: r.p99_ms,
    ops_per_sec: r.ops_per_sec,
    recommendation: r.avg_ms > 50
      ? 'Critical — consider caching or lazy computation'
      : r.avg_ms > 10
      ? 'Moderate — profile inner loops'
      : 'Minor — acceptable for background use',
  })),

  top5_slowest: slowestOps.map(r => ({ name: r.name, avg_ms: r.avg_ms, p99_ms: r.p99_ms, ops_per_sec: r.ops_per_sec })),
  top5_memory: highestMemOps.map(r => ({ name: r.name, mem_delta_mb: r.mem_delta_mb, iterations: r.iterations })),
  error_operations: errorOps.map(r => ({ name: r.name, errors: r.errors, total: r.iterations, rate: `${(r.errors/r.iterations*100).toFixed(1)}%` })),

  concurrency_results: concResults.map(r => ({
    name: r.name, concurrency: r.concurrency,
    total_ms: r.total_ms,
    throughput_ops_sec: r.throughput_ops_per_sec,
    contention: r.contention_detected,
    errors: r.errors,
  })),

  integrity_issues: integrityIssues,
  duplications,

  all_benchmarks: benchResults.map(r => ({
    name: r.name, n: r.iterations,
    avg_ms: r.avg_ms, p95_ms: r.p95_ms, p99_ms: r.p99_ms,
    min_ms: r.min_ms, max_ms: r.max_ms,
    ops_sec: r.ops_per_sec,
    mem_mb: r.mem_delta_mb,
    errors: r.errors,
    bottleneck: r.bottleneck,
    notes: r.notes,
  })),
};

log(JSON.stringify(report, null, 2));

return report;
} // end main

export { main as executarStressTestPhase224 };
