/**
 * VALIDATION TEST 1 — Reproducibility
 * Executes the clinical pipeline for 301 patients twice with identical inputs,
 * then compares every output field-by-field. Any non-determinism is a bug.
 */

import { calcularDosagem, getMedicamentoById, calcularBSA } from './dosing-engine';
import { detectarConflitos } from './guideline-conflict-engine';
import { calcSofa, calcQsofa } from './icu-engine';
import { calcularNNT } from './outcome-engine';
import { getAllDrugs } from './pharma-database';
import { gerarMapaConhecimento, buscarRelacionamentos } from './medical-knowledge-graph';
import { EVIDENCE_DB } from './evidence-engine';

// ─── Patient seed factory ─────────────────────────────────────────────────────

interface SeedPatient {
  id: number;
  peso: number;
  altura: number;
  idadeDias: number;
  medicamentoId: string;
  diagnosticoId: string;
}

function seedPatient(i: number): SeedPatient {
  const peso   = 10 + (i % 120);           // 10–129 kg
  const altura = 60 + (i % 120);           // 60–179 cm
  const anos   = 1 + (i % 79);             // 1–79 anos
  const idadeDias = anos * 365;
  const meds = ['metformina', 'enalapril', 'anlodipino', 'metoprolol',
                 'furosemida', 'losartana', 'atorvastatina'];
  const diags = ['has', 'dm2', 'icc', 'dpoc', 'fa'];
  return {
    id: i, peso, altura, idadeDias,
    medicamentoId: meds[i % meds.length],
    diagnosticoId: diags[i % diags.length],
  };
}

// ─── Run pipeline for one patient ─────────────────────────────────────────────

interface PatientResult {
  id: number;
  bsa: number;
  sofaTotal: number;
  qsofaScore: number;
  conflitos: number;
  nnt: number;
  graphNodes: number;
  graphEdges: number;
  relCount: number;
  evidenceStudies: number;
  doseOk: boolean | null;
}

function runPipeline(p: SeedPatient): PatientResult {
  const bsa = calcularBSA(p.peso, p.altura);

  // SOFA takes an array of 6 organ scores (0-4 each)
  const sofaRes = calcSofa([
    Math.min(4, p.id % 5),         // respiratory
    Math.min(4, (p.id + 1) % 5),   // coagulation
    Math.min(4, (p.id + 2) % 5),   // liver
    Math.min(4, (p.id + 3) % 5),   // cardiovascular
    Math.min(4, (p.id + 4) % 5),   // CNS
    Math.min(4, (p.id + 0) % 5),   // renal
  ]);

  // qSOFA takes 3 booleans
  const qsofaRes = calcQsofa(
    p.id % 3 === 0,   // altered consciousness
    p.id % 4 === 0,   // FR >= 22
    p.id % 5 === 0,   // PAS <= 100
  );

  const conflitos = detectarConflitos(p.diagnosticoId).length;

  const nntRes = calcularNNT(0.05 + (p.id % 10) * 0.005, 0.10);

  const grafo = gerarMapaConhecimento();
  const rels  = buscarRelacionamentos(p.medicamentoId);

  const evidenceStudies = EVIDENCE_DB.reduce((acc, diag) =>
    acc + diag.diretrizes.reduce((a2, d) =>
      a2 + d.terapias.reduce((a3, t) => a3 + t.estudos.length, 0), 0), 0);

  const med = getMedicamentoById(p.medicamentoId);
  let doseOk: boolean | null = null;
  if (med) {
    const formulacaoId = med.formulacoes[0]?.id ?? '';
    const res = calcularDosagem(p.peso, p.altura, p.idadeDias, med, formulacaoId);
    doseOk = res?.ok ?? false;
  }

  return {
    id: p.id,
    bsa,
    sofaTotal: sofaRes.total,
    qsofaScore: qsofaRes.score,
    conflitos,
    nnt: nntRes.nnt,
    graphNodes: grafo.nos.length,
    graphEdges: grafo.arestas.length,
    relCount: rels.length,
    evidenceStudies,
    doseOk,
  };
}

function serialize(r: PatientResult): string {
  return JSON.stringify(r);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== VALIDATION TEST 1: REPRODUCIBILITY ===\n');

  const N = 301;
  const patients = Array.from({ length: N }, (_, i) => seedPatient(i));

  console.log(`Rodada 1: processando ${N} pacientes...`);
  const t1s = Date.now();
  const run1 = patients.map(runPipeline);
  const t1 = Date.now() - t1s;

  console.log(`Rodada 2: processando ${N} pacientes...`);
  const t2s = Date.now();
  const run2 = patients.map(runPipeline);
  const t2 = Date.now() - t2s;

  console.log(`\nTempo R1: ${t1} ms | R2: ${t2} ms`);

  let mismatches = 0;
  const diffs: string[] = [];

  for (let i = 0; i < N; i++) {
    const s1 = serialize(run1[i]);
    const s2 = serialize(run2[i]);
    if (s1 !== s2) {
      mismatches++;
      diffs.push(`Paciente ${i}: R1=${s1.slice(0, 100)} | R2=${s2.slice(0, 100)}`);
    }
  }

  console.log('\n─── RESULTADO ───────────────────────────────');
  if (mismatches === 0) {
    console.log(`✅ PASS — ${N} pacientes, 2 rodadas, 0 divergências.`);
    console.log('   Sistema completamente determinístico.');
  } else {
    console.log(`❌ FAIL — ${mismatches}/${N} pacientes com resultados divergentes.`);
    diffs.slice(0, 5).forEach(d => console.log(' ', d));
  }

  console.log('\n─── RESUMO ──────────────────────────────────');
  console.log(`Pacientes testados      : ${N}`);
  console.log(`Divergências detectadas : ${mismatches}`);
  console.log(`Taxa determinismo       : ${(((N - mismatches) / N) * 100).toFixed(2)}%`);
  console.log(`ms/paciente (R1)        : ${(t1 / N).toFixed(3)}`);
  console.log(`ms/paciente (R2)        : ${(t2 / N).toFixed(3)}`);

  process.exit(mismatches > 0 ? 1 : 0);
}

main().catch(err => { console.error('ERRO FATAL:', err); process.exit(1); });
