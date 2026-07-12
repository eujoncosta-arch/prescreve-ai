/**
 * VALIDATION TEST 3 — Incomplete Data / Graceful Degradation
 * Tests every engine with missing fields: sem creatinina, sem peso, sem idade,
 * sem sexo, sem CID, sem diagnóstico principal, sem medicamentos prévios.
 * All engines must degrade gracefully — no unhandled crashes.
 */

import { calcularDosagem, getMedicamentoById, calcularBSA } from './dosing-engine';
import { calcClCrCockcroft as geriaCalcClCr } from './geriatric-engine';
import { detectarConflitos } from './guideline-conflict-engine';
import { calcSofa, calcQsofa } from './icu-engine';
import { calcBSAMosteller } from './oncology-engine';
import { gerarPrognostico, PerfilPrognostico } from './prognosis-engine';
import { listarAlertas } from './scientific-update-engine';
import { gerarMapaConhecimento, buscarRelacionamentos } from './medical-knowledge-graph';

// ─── Harness ──────────────────────────────────────────────────────────────────

type Outcome = 'PASS' | 'SAFE_ERROR' | 'CRASH';
interface TestCase { name: string; scenario: string; outcome: Outcome; detail: string }

function run(name: string, scenario: string, fn: () => unknown): TestCase {
  try {
    const result = fn();
    const isEmpty = result === null || result === undefined ||
      (Array.isArray(result) && result.length === 0) ||
      (typeof result === 'object' && result !== null && Object.keys(result).length === 0);
    const detail = isEmpty ? 'Retornou vazio/nulo (graceful)' : JSON.stringify(result).slice(0, 140);
    return { name, scenario, outcome: 'PASS', detail };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const graceful = /inválid|missing|required|não calculável|não há posologia|fora do limit/i.test(msg);
    return { name, scenario, outcome: graceful ? 'SAFE_ERROR' : 'CRASH', detail: msg };
  }
}

const medEna = getMedicamentoById('enalapril');
const medMet = getMedicamentoById('metformina');

async function main() {
  console.log('=== VALIDATION TEST 3: INCOMPLETE DATA — GRACEFUL DEGRADATION ===\n');
  const cases: TestCase[] = [];

  // ── A. SEM CREATININA ─────────────────────────────────────────────────────
  console.log('A. Sem creatinina...');
  cases.push(run('SemCreat geriaClCr', 'Cockcroft creatinina=undefined (0 µmol)',
    () => geriaCalcClCr(55, 70, 0, 'M')));
  cases.push(run('SemCreat SOFA renal=0', 'SOFA com score renal 0 (sem creat)',
    () => calcSofa([1, 1, 0, 0, 0, 0])));
  if (medEna) {
    cases.push(run('SemCreat calcularDosagem', 'enalapril sem parâmetros renais',
      () => calcularDosagem(70, 170, 55 * 365, medEna, medEna.formulacoes[0]?.id ?? '')));
  }

  // ── B. SEM PESO ───────────────────────────────────────────────────────────
  console.log('B. Sem peso...');
  cases.push(run('SemPeso BSA dosing', 'calcularBSA peso=0', () => calcularBSA(0, 170)));
  cases.push(run('SemPeso BSA Mosteller', 'calcBSAMosteller peso=0', () => calcBSAMosteller(0, 170)));
  cases.push(run('SemPeso geriaClCr', 'Cockcroft peso=0', () => geriaCalcClCr(55, 0, 88, 'M')));
  if (medEna) {
    cases.push(run('SemPeso calcularDosagem', 'enalapril peso=0',
      () => calcularDosagem(0, 170, 55 * 365, medEna, medEna.formulacoes[0]?.id ?? '')));
  }

  // ── C. SEM IDADE ──────────────────────────────────────────────────────────
  console.log('C. Sem idade...');
  cases.push(run('SemIdade geriaClCr', 'Cockcroft idade=0', () => geriaCalcClCr(0, 70, 88, 'M')));
  cases.push(run('SemIdade prognostico', 'gerarPrognostico idade=0', () => {
    const p: PerfilPrognostico = { cid: 'I10', idade: 0, sexo: 'M', comorbidades: [] };
    return gerarPrognostico(p, '1a');
  }));
  if (medEna) {
    cases.push(run('SemIdade calcularDosagem', 'enalapril idadeDias=0',
      () => calcularDosagem(70, 170, 0, medEna, medEna.formulacoes[0]?.id ?? '')));
  }

  // ── D. SEM SEXO ───────────────────────────────────────────────────────────
  console.log('D. Sem sexo...');
  // geriaCalcClCr expects 'M'|'F' — passing undefined via any tests robustness
  cases.push(run('SemSexo geriaClCr', 'Cockcroft sexo=undefined', () =>
    geriaCalcClCr(55, 70, 88, undefined as unknown as 'M' | 'F')));
  cases.push(run('SemSexo prognostico', 'gerarPrognostico sexo=undefined', () => {
    const p: PerfilPrognostico = { cid: 'I10', idade: 55, sexo: undefined as unknown as 'M' | 'F', comorbidades: [] };
    return gerarPrognostico(p, '1a');
  }));

  // ── E. SEM CID ────────────────────────────────────────────────────────────
  console.log('E. Sem CID...');
  cases.push(run('SemCID detectarConflitos string vazia', 'detectarConflitos("")',
    () => detectarConflitos('')));
  cases.push(run('SemCID prognostico', 'gerarPrognostico cid=""', () => {
    const p: PerfilPrognostico = { cid: '', idade: 55, sexo: 'M', comorbidades: [] };
    return gerarPrognostico(p, '1a');
  }));

  // ── F. SEM DIAGNÓSTICO PRINCIPAL ─────────────────────────────────────────
  console.log('F. Sem diagnóstico principal...');
  cases.push(run('SemDiag buscarRelacionamentos', 'buscarRelacionamentos("")',
    () => buscarRelacionamentos('')));
  cases.push(run('SemDiag listarAlertas', 'listarAlertas sem filtro',
    () => listarAlertas()));
  cases.push(run('SemDiag gerarMapaConhecimento', 'gerarMapaConhecimento (stateless)',
    () => { const g = gerarMapaConhecimento(); return { nos: g.nos.length, arestas: g.arestas.length }; }));

  // ── G. SEM MEDICAMENTOS PRÉVIOS ───────────────────────────────────────────
  console.log('G. Sem medicamentos prévios...');
  // detectarConflitos takes a single diagnosticoId string, not a list — test with valid CID but check it still works
  cases.push(run('SemMeds detectarConflitos has', 'detectarConflitos "has" sem lista meds',
    () => detectarConflitos('has')));
  if (medMet) {
    cases.push(run('SemMeds calcularDosagem metformina', 'metformina sem medicamentos prévios',
      () => calcularDosagem(70, 170, 55 * 365, medMet, medMet.formulacoes[0]?.id ?? '')));
  }

  // ── H. TUDO VAZIO / ZERO ─────────────────────────────────────────────────
  console.log('H. Objeto vazio / valores zero...');
  cases.push(run('Empty SOFA', 'calcSofa array vazio', () => calcSofa([])));
  cases.push(run('Zero qSOFA booleans', 'calcQsofa tudo false', () => calcQsofa(false, false, false)));
  if (medEna) {
    cases.push(run('All zero calcularDosagem', 'enalapril peso=0 altura=0 idadeDias=0',
      () => calcularDosagem(0, 0, 0, medEna, medEna.formulacoes[0]?.id ?? '')));
  }
  cases.push(run('Negative weight BSA', 'calcularBSA peso=-10', () => calcularBSA(-10, 170)));
  cases.push(run('getMedicamentoById nonexistent', 'getMedicamentoById "nao_existe"',
    () => getMedicamentoById('nao_existe_jamais')));

  // ─── Report ───────────────────────────────────────────────────────────────
  const passes  = cases.filter(c => c.outcome === 'PASS').length;
  const safe    = cases.filter(c => c.outcome === 'SAFE_ERROR').length;
  const crashes = cases.filter(c => c.outcome === 'CRASH').length;
  const total   = cases.length;

  console.log('\n─── RESULTADO ────────────────────────────────');
  console.log(`✅ PASS        : ${passes}`);
  console.log(`⚠️  SAFE_ERROR : ${safe}  (erro tratado — OK)`);
  console.log(`❌ CRASH       : ${crashes}  (bugs a corrigir)`);

  if (crashes > 0) {
    console.log('\n❌ CRASHES — EXIGE CORREÇÃO:');
    cases.filter(c => c.outcome === 'CRASH').forEach(c =>
      console.log(`  [${c.name}] ${c.scenario}\n    → ${c.detail}`));
  }

  console.log('\n─── TABELA COMPLETA ─────────────────────────');
  cases.forEach(c => {
    const icon = c.outcome === 'PASS' ? '✅' : c.outcome === 'SAFE_ERROR' ? '⚠️ ' : '❌';
    console.log(`${icon} ${c.name}: ${c.detail.slice(0, 80)}`);
  });

  const pct = (((passes + safe) / total) * 100).toFixed(1);
  console.log(`\n${passes + safe}/${total} cenários com degradação graciosa (${pct}%)`);
  if (crashes === 0) console.log('🟢 DEGRADAÇÃO GRACIOSA CONFIRMADA');
  else console.log(`🔴 ${crashes} crash(es) detectado(s)`);

  process.exit(crashes > 0 ? 1 : 0);
}

main().catch(err => { console.error('ERRO FATAL:', err); process.exit(1); });
