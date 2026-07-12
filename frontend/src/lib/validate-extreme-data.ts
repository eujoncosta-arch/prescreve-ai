/**
 * VALIDATION TEST 2 — Extreme Data
 * Tests all engines with pathological values:
 * - Neonate 650 g / premature
 * - Obese patient 170 kg
 * - Severe CKD: TFG = 4 mL/min
 * - Severe hyponatremia: Na = 108 mEq/L (contextual — no direct parameter)
 * - Supratherapeutic anticoagulation: INR = 9 (contextual)
 * - Severe hyperkalemia: K = 8 mEq/L (contextual)
 * All engines must respond gracefully — no crashes.
 */

import { calcularDosagem, getMedicamentoById, calcularBSA } from './dosing-engine';
import { calcClCrCockcroft as geriaCalcClCr } from './geriatric-engine';
import { detectarConflitos } from './guideline-conflict-engine';
import { calcSofa, calcQsofa } from './icu-engine';
import { calcBSAMosteller, assessOncologyPatient, OncologyPatient } from './oncology-engine';
import { calcDosePediatrica, PediatricPatient } from './pediatric-engine';
import { calcularNNT } from './outcome-engine';
import { gerarPrognostico, PerfilPrognostico } from './prognosis-engine';
import { listarAlertas } from './scientific-update-engine';

// ─── Harness ──────────────────────────────────────────────────────────────────

type Outcome = 'PASS' | 'SAFE_ERROR' | 'CRASH';
interface TestCase { name: string; desc: string; outcome: Outcome; detail: string }

function run(name: string, desc: string, fn: () => unknown): TestCase {
  try {
    const result = fn();
    if (result === undefined || result === null) {
      return { name, desc, outcome: 'PASS', detail: 'null/undefined (graceful)' };
    }
    return { name, desc, outcome: 'PASS', detail: JSON.stringify(result).slice(0, 140) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const graceful = /inválid|missing|required|não calculável|fora do limit|não há posologia/i.test(msg);
    return { name, desc, outcome: graceful ? 'SAFE_ERROR' : 'CRASH', detail: msg };
  }
}

async function main() {
  console.log('=== VALIDATION TEST 2: EXTREME DATA ===\n');
  const cases: TestCase[] = [];

  // ── 1. NEONATE 650g premature ─────────────────────────────────────────────
  console.log('1. Neonato 650g prematuro (28 semanas)...');
  const neonate: PediatricPatient = {
    pesoKg: 0.65,
    idadeMeses: 0,
    idadeGestacionalSemanas: 28,
    idadePostNatalDias: 2,
    alturaCm: 35,
  };
  cases.push(run('Neonate BSA dosing-engine', 'calcularBSA 0.65kg/35cm', () => calcularBSA(0.65, 35)));
  cases.push(run('Neonate BSA oncology', 'calcBSAMosteller 0.65kg/35cm', () => calcBSAMosteller(0.65, 35)));
  cases.push(run('Neonate calcDosePediatrica ampicilina', 'dose ampicilina RN 650g', () => calcDosePediatrica('ampicilina', neonate)));
  cases.push(run('Neonate calcDosePediatrica gentamicina', 'dose gentamicina RN 650g', () => calcDosePediatrica('gentamicina', neonate)));

  const medMet = getMedicamentoById('metformina');
  if (medMet) {
    cases.push(run('Neonate calcularDosagem (adult drug on neonate)', 'metformina 0.65kg 2 dias',
      () => calcularDosagem(0.65, 35, 2, medMet, medMet.formulacoes[0]?.id ?? '')));
  }

  // ── 2. OBESE 170kg ────────────────────────────────────────────────────────
  console.log('2. Obeso 170kg...');
  cases.push(run('Obese BSA', 'BSA Mosteller 170kg/180cm', () => calcBSAMosteller(170, 180)));
  cases.push(run('Obese geriatric ClCr', 'Cockcroft 170kg obeso', () => geriaCalcClCr(50, 170, 88.4, 'M')));

  const medEna = getMedicamentoById('enalapril');
  if (medEna) {
    cases.push(run('Obese enalapril dose', 'calcularDosagem enalapril 170kg',
      () => calcularDosagem(170, 180, 50 * 365, medEna, medEna.formulacoes[0]?.id ?? '')));
  }

  const oncoObese: OncologyPatient = {
    pesoKg: 170,
    alturaCm: 180,
    idadeAnos: 55,
    sexo: 'M',
    ecogPS: 1,
    diagnostico: 'neoplasia_colon',
    esquemaQuimio: [],
  };
  cases.push(run('Obese oncology assessment', 'assessOncologyPatient 170kg', () => assessOncologyPatient(oncoObese)));

  // ── 3. SEVERE CKD TFG=4 ──────────────────────────────────────────────────
  console.log('3. IRC severa TFG=4...');
  // creatinina ~8 mg/dL = 707 µmol/L for ClCr ~4
  cases.push(run('CKD4 geriatric ClCr', 'Cockcroft creat=8 mg/dL (707µmol/L)', () => geriaCalcClCr(65, 70, 707, 'M')));
  cases.push(run('CKD4 SOFA (high creatinine context)', 'SOFA scores com disfunção renal máxima (score 4)', () =>
    calcSofa([2, 2, 1, 2, 1, 4])));   // renal score 4 = creat > 440
  cases.push(run('CKD4 conflitos has', 'detectarConflitos has', () => detectarConflitos('has')));

  if (medMet) {
    cases.push(run('CKD4 metformina dose', 'metformina clearance ~4 → espera aviso/bloqueio',
      () => calcularDosagem(70, 170, 60 * 365, medMet, medMet.formulacoes[0]?.id ?? '')));
  }

  // ── 4. SEVERE HYPONATREMIA Na=108 ────────────────────────────────────────
  console.log('4. Hiponatremia severa Na=108...');
  // Na=108 is captured as context/lab — tests that pass it through
  cases.push(run('Hyponatremia alertas imediata', 'listarAlertas urgencia=imediata', () =>
    listarAlertas({ urgencia: 'imediata' })));
  cases.push(run('Hyponatremia prognostico', 'gerarPrognostico E87.1 (distúrbio Na)', () => {
    const p: PerfilPrognostico = { cid: 'E87.1', idade: 70, sexo: 'F', comorbidades: ['hiponatremia_grave'] };
    return gerarPrognostico(p, '30d');
  }));
  cases.push(run('Hyponatremia conflitos fa', 'detectarConflitos fa com disfunção', () =>
    detectarConflitos('fa')));

  // ── 5. SUPRATHERAPEUTIC ANTICOAGULATION INR=9 ────────────────────────────
  console.log('5. Anticoagulação supraterapêutica INR=9...');
  cases.push(run('INR9 alertas alta', 'listarAlertas urgencia=alta', () =>
    listarAlertas({ urgencia: 'alta' })));
  cases.push(run('INR9 conflitos fa', 'detectarConflitos fa — warfarina implícita', () =>
    detectarConflitos('fa')));
  cases.push(run('INR9 prognostico AVC', 'gerarPrognostico I63 AVC', () => {
    const p: PerfilPrognostico = { cid: 'I63', idade: 75, sexo: 'M', comorbidades: ['fibrilacao_atrial', 'anticoagulacao_excessiva'] };
    return gerarPrognostico(p, '30d');
  }));

  // ── 6. SEVERE HYPERKALEMIA K=8 ────────────────────────────────────────────
  console.log('6. Hipercalemia severa K=8...');
  cases.push(run('K8 alertas imediata', 'listarAlertas urgencia=imediata', () =>
    listarAlertas({ urgencia: 'imediata' })));
  cases.push(run('K8 prognostico IRC', 'gerarPrognostico N18.5 + hipercalemia', () => {
    const p: PerfilPrognostico = { cid: 'N18.5', idade: 65, sexo: 'M', comorbidades: ['diabetes', 'hipercalemia_grave'] };
    return gerarPrognostico(p, '6m');
  }));
  cases.push(run('K8 conflitos icc', 'detectarConflitos icc — espironolactona + K alto', () =>
    detectarConflitos('icc')));

  // ── 7. Additional boundary values ────────────────────────────────────────
  console.log('7. Valores-limite adicionais...');
  cases.push(run('Zero weight BSA', 'calcularBSA peso=0', () => calcularBSA(0, 160)));
  cases.push(run('Zero weight Mosteller', 'calcBSAMosteller peso=0', () => calcBSAMosteller(0, 160)));
  cases.push(run('Max age ClCr', 'Cockcroft 120 anos', () => geriaCalcClCr(120, 50, 88, 'F')));
  cases.push(run('NNT identical rates', 'calcularNNT igual (ARR=0)', () => calcularNNT(0.05, 0.05)));
  cases.push(run('NNT zero control', 'calcularNNT controle=0', () => calcularNNT(0, 0)));
  cases.push(run('SOFA all max', 'calcSofa todos score 4', () => calcSofa([4, 4, 4, 4, 4, 4])));
  cases.push(run('SOFA all zero', 'calcSofa todos score 0', () => calcSofa([0, 0, 0, 0, 0, 0])));
  cases.push(run('qSOFA all false', 'calcQsofa todos false', () => calcQsofa(false, false, false)));
  cases.push(run('qSOFA all true', 'calcQsofa todos true', () => calcQsofa(true, true, true)));

  // ─── Report ───────────────────────────────────────────────────────────────
  const passes  = cases.filter(c => c.outcome === 'PASS').length;
  const safe    = cases.filter(c => c.outcome === 'SAFE_ERROR').length;
  const crashes = cases.filter(c => c.outcome === 'CRASH').length;

  console.log('\n─── RESULTADO ───────────────────────────────');
  console.log(`✅ PASS         : ${passes}`);
  console.log(`⚠️  SAFE_ERROR  : ${safe}  (erro tratado — degradação graciosa)`);
  console.log(`❌ CRASH        : ${crashes}  (bugs a corrigir)`);

  if (crashes > 0) {
    console.log('\n❌ CRASHES:');
    cases.filter(c => c.outcome === 'CRASH').forEach(c =>
      console.log(`  [${c.name}] ${c.desc}\n    → ${c.detail}`));
  }

  console.log('\n─── DETALHES ────────────────────────────────');
  cases.forEach(c => {
    const icon = c.outcome === 'PASS' ? '✅' : c.outcome === 'SAFE_ERROR' ? '⚠️ ' : '❌';
    console.log(`${icon} ${c.name}`);
    if (c.outcome !== 'CRASH') console.log(`   → ${c.detail.slice(0, 100)}`);
    else console.log(`   → CRASH: ${c.detail.slice(0, 100)}`);
  });

  console.log('\n─── CLASSIFICAÇÃO ───────────────────────────');
  if (crashes === 0) console.log('🟢 SISTEMA ROBUSTO — sem crash em dados extremos.');
  else console.log(`🔴 ${crashes} crash(es) — revisão obrigatória antes de produção.`);

  process.exit(crashes > 0 ? 1 : 0);
}

main().catch(err => { console.error('ERRO FATAL:', err); process.exit(1); });
