/**
 * VALIDATION TEST 4 — Full Single Patient Flow
 * Records every object produced at every pipeline step.
 * Pipeline: CDS → Risk Score → Guideline Conflict → Explainable AI →
 *           Knowledge Graph → Dosagem → FHIR → Copilot → Trust Score →
 *           Physician Validation → Recommendation Registry → Prognosis →
 *           Evidence Base → Alerts
 *
 * Goal: surface integration bugs that only appear when engines chain together.
 */

import type { Anamnesis, TherapeuticSuggestion, DiagnosticHypothesis } from './types';
import { analyzeClinical } from './clinical-decision-support';
import { calcularDosagem, getMedicamentoById, getDoseIndisponivelMsg, isDoseCalculavel } from './dosing-engine';
import { detectarConflitos } from './guideline-conflict-engine';
import { gerarExplanacao } from './explainable-ai';
import { avaliarRiscoClinico } from './clinical-risk-engine';
import { calcularMedicalTrustScore } from './medical-trust-score';
import { gerarMapaConhecimento, buscarRelacionamentos } from './medical-knowledge-graph';
import { gerarBundleClinico, validarFHIR, DadosClinicos } from './interoperability-engine';
import {
  gerarSOAP, gerarResumoConsulta, gerarSegundaOpiniao,
  gerarHipotesesDiferenciais, gerarJustificativa, ContextoClinico,
} from './medical-copilot';
import { registrarReview, registrarBoardValidation } from './physician-validation-engine';
import {
  registrarRecomendacao, verificarIntegridade, calcularEstatisticasRegistry,
} from './recommendation-registry';
import { gerarIdPacienteAnonimo } from './medical-audit';
import { EVIDENCE_DB } from './evidence-engine';
import { gerarPrognostico, PerfilPrognostico } from './prognosis-engine';
import { listarAlertas } from './scientific-update-engine';
import { getAllDrugs } from './pharma-database';

// ─── Step recorder ───────────────────────────────────────────────────────────

interface Step {
  step: number;
  name: string;
  input_summary: string;
  output: unknown;
  duration_ms: number;
  ok: boolean;
  error?: string;
}

const steps: Step[] = [];

function tryRecord<T>(step: number, name: string, input: string, fn: () => T): T | null {
  const t0 = Date.now();
  try {
    const output = fn();
    steps.push({ step, name, input_summary: input, output, duration_ms: Date.now() - t0, ok: true });
    return output;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ step, name, input_summary: input, output: null, duration_ms: Date.now() - t0, ok: false, error: msg });
    return null;
  }
}

// ─── Patient ──────────────────────────────────────────────────────────────────

const anamnese: Anamnesis = {
  queixa_principal: 'Dispneia aos médios esforços, ortopneia, edema MMII vespertino',
  hda: 'HAS há 10 anos, DM2 há 6 anos. Dispneia progressiva há 3 meses. ECO: FE 35%, BNP 820.',
  hpp: 'HAS, DM2, ex-tabagista (cessou há 5 anos)',
  historia_familiar: 'Pai com IAM aos 62 anos',
  habitos_vida: {
    tabagismo: 'ex',
    cigarros_dia: 0,
    etilismo: 'nao',
    atividade_fisica: 'sedentario',
  },
  exame_fisico: 'Estertores basais bilaterais. Edema MMII 2+/4+. B3 audível.',
  sinais_vitais: {
    pa_sistolica: 148,
    pa_diastolica: 92,
    fc: 88,
    fr: 18,
    temperatura: 36.5,
    spo2: 96,
  },
  laboratorio: {
    creatinina: '1.4',
    potassio: '4.6',
    sodio: '138',
    glicemia_jejum: '142',
    hba1c: '7.8',
    bnp: '820',
    hemoglobina: '12.8',
  },
  imagem: 'ECO: FE 35%, disfunção diastólica Gr II. RX tórax: cardiomegalia.',
  comorbidades: ['Hipertensão arterial', 'Diabetes mellitus tipo 2'],
  medicamentos_em_uso: [
    { id: 'metformina', nome: 'Metformina 850 mg', dose: '850 mg', via: 'VO', frequencia: '2x/dia', em_uso: true },
    { id: 'losartana',  nome: 'Losartana 50 mg',   dose: '50 mg',  via: 'VO', frequencia: '1x/dia', em_uso: true },
  ],
  alergias: [
    { id: 'alg-1', substancia: 'Enalapril', tipo: 'medicamento', reacao: 'Tosse seca', gravidade: 'leve' },
  ],
  gestante: false,
  lactante: false,
  peso: 82,
  altura: 172,
  funcao_renal: { creatinina: 1.4, tfg: 52, ckd_stage: 'G3a' },
  funcao_hepatica: {},
};

// Representative TherapeuticSuggestion for IC-FEr (Carvedilol)
const primarySuggestion: TherapeuticSuggestion = {
  id: 'carvedilol',
  nome_generico: 'Carvedilol',
  indicacao: 'IC-FEr — betabloqueador com redução de mortalidade em IC',
  classe_terapeutica: 'Betabloqueador não seletivo com atividade α1',
  molecula: 'Carvedilol',
  dose: {
    dose_padrao: '6,25 mg',
    dose_min: '3,125 mg',
    dose_max: '50 mg/dia',
    unidade: 'mg',
    via: 'Oral',
    frequencia: '2x/dia',
    duracao: 'Contínuo',
    ajuste_renal: 'Sem ajuste necessário',
  },
  posologia_completa: 'Carvedilol 6,25 mg VO 2x/dia. Titular a cada 2 semanas até 25 mg 2x/dia.',
  contraindicacoes: ['BAV 2-3 grau', 'Bradicardia < 55 bpm', 'Broncoespasmo ativo'],
  efeitos_adversos: ['Bradicardia', 'Hipotensão', 'Tontura', 'Fadiga'],
  monitoramento: ['FC e PA após início e titulação'],
  alternativas: ['Metoprolol succinato CR 25 mg', 'Bisoprolol 2,5 mg'],
  evidencia: {
    diretriz: 'Diretriz Brasileira de IC — SBC 2018',
    sociedade: 'SBC',
    ano: 2018,
    nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'ECRs CARVEDILOL-US e COPERNICUS' },
    citacao: 'Rohde LEP et al. Arq Bras Cardiol. 2018;111(3):436-539.',
    doi: '10.5935/abc.20180190',
  },
};

// ─── Main pipeline ─────────────────────────────────────────────────────────────

async function main() {
  console.log('=== VALIDATION TEST 4: FULL SINGLE PATIENT FLOW ===');
  console.log('Diagnóstico: Insuficiência cardíaca com FE reduzida (IC-FEr)');
  console.log('CID: I50.0 | Paciente: 58 anos, Homem, HAS + DM2\n');

  const t0Total = Date.now();

  // ── Step 1: CDS ────────────────────────────────────────────────────────────
  console.log('Step 1: CDS — analyzeClinical...');
  const cdsResult = tryRecord(1, 'CDS — Hipóteses Diagnósticas',
    `Anamnese: ${anamnese.queixa_principal.slice(0, 60)}`,
    () => analyzeClinical(anamnese));

  const primaryHipotese: DiagnosticHypothesis | undefined = cdsResult?.hipoteses[0];

  // ── Step 2: Clinical Risk Score ────────────────────────────────────────────
  console.log('Step 2: Clinical Risk Score...');
  const riskResult = tryRecord(2, 'Clinical Risk Score',
    'Anamnese completa → avaliarRiscoClinico',
    () => avaliarRiscoClinico(anamnese, [primarySuggestion]));

  // ── Step 3: Guideline Conflict Detection ───────────────────────────────────
  console.log('Step 3: Guideline Conflicts...');
  const conflicts = tryRecord(3, 'Guideline Conflict Detection',
    'detectarConflitos("icc")',
    () => detectarConflitos('icc'));

  // ── Step 4: Explainable AI ─────────────────────────────────────────────────
  console.log('Step 4: Explainable AI...');
  const explanacao = tryRecord(4, 'Explainable AI — WHY/WHY_NOT/WHAT_IF',
    `Molécula: carvedilol | Hipótese: ${primaryHipotese?.nome ?? 'IC-FEr'}`,
    () => gerarExplanacao(primarySuggestion, anamnese, primaryHipotese));

  // ── Step 5: Knowledge Graph ────────────────────────────────────────────────
  console.log('Step 5: Knowledge Graph...');
  const graph = tryRecord(5, 'Knowledge Graph + relacionamentos carvedilol',
    'gerarMapaConhecimento + buscarRelacionamentos(carvedilol)',
    () => {
      const mapa = gerarMapaConhecimento();
      const rels = buscarRelacionamentos('carvedilol');
      return { nos: mapa.nos.length, arestas: mapa.arestas.length, carvedilol_rels: rels.length };
    });

  // ── Step 6: Dose Calculation ───────────────────────────────────────────────
  console.log('Step 6: Dose Calculation...');
  const doseResults = tryRecord(6, 'Dose Calculation (5 target molecules)',
    'carvedilol, furosemida, sacubitril_valsartana, eplerenona, empagliflozina',
    () => ['carvedilol', 'furosemida', 'sacubitril_valsartana', 'eplerenona', 'empagliflozina'].map(molId => {
      const med = getMedicamentoById(molId);
      if (!med) {
        return { molecula: molId, calculavel: false, msg: getDoseIndisponivelMsg(molId) };
      }
      const dose = calcularDosagem(82, 172, 58 * 365, med, med.formulacoes[0]?.id ?? '');
      return { molecula: molId, calculavel: true, ok: dose?.ok, dose: dose?.dose_por_dose_mg };
    }));

  // ── Step 7: FHIR Bundle ────────────────────────────────────────────────────
  console.log('Step 7: FHIR Bundle Export...');
  const fhirBundle = tryRecord(7, 'FHIR R4 Bundle — gerarBundleClinico',
    'Patient IC-FEr + 2 meds + 3 labs',
    () => {
      const dados: DadosClinicos = {
        paciente_id: 'PAC-TEST-FLUXO-001',
        nome: 'Paciente Teste Fluxo',
        nascimento: '1968-03-15',
        sexo: 'M',
        cids: ['I50.0', 'I10', 'E11'],
        medicamentos: ['Carvedilol 6,25 mg 2x/dia', 'Furosemida 40 mg 1x/dia', 'Metformina 850 mg 2x/dia'],
        exames: { creatinina: 1.4, bnp: 820 },
        pa_sistolica: 148,
        pa_diastolica: 92,
      };
      const bundle = gerarBundleClinico(dados);
      const valid = validarFHIR(bundle);
      return { resourceType: bundle.resourceType, entries: bundle.entry.length, valid };
    });

  // ── Step 8: Copilot — SOAP ────────────────────────────────────────────────
  console.log('Step 8: Copilot — SOAP...');
  const ctx: ContextoClinico = {
    queixa_principal: anamnese.queixa_principal,
    historia_doenca_atual: anamnese.hda,
    antecedentes: anamnese.comorbidades,
    medicamentos_em_uso: anamnese.medicamentos_em_uso.map(m => m.nome),
    alergias: anamnese.alergias.map(a => `${a.substancia} (${a.reacao ?? a.tipo})`),
    exame_fisico: { descricao: anamnese.exame_fisico },
    exames_laboratoriais: { creatinina: 1.4, bnp: 820, hba1c: 7.8 },
    cids_ativos: ['I50.0', 'I10', 'E11'],
    idade: 58,
    sexo: 'M',
    peso: 82,
  };

  const soap          = tryRecord(8,  'Copilot — Nota SOAP',              'ContextoClinico IC-FEr', () => gerarSOAP(ctx));
  const resumo        = tryRecord(9,  'Copilot — Resumo Consulta',        'ContextoClinico',         () => gerarResumoConsulta(ctx));
  const segundaOp     = tryRecord(10, 'Copilot — Segunda Opinião',        'ContextoClinico',         () => gerarSegundaOpiniao(ctx));
  const hipotesesDif  = tryRecord(11, 'Copilot — Hipóteses Diferenciais', 'ContextoClinico',         () => gerarHipotesesDiferenciais(ctx));
  const justificativa = tryRecord(12, 'Copilot — Justificativa carvedilol','carvedilol + ctx',        () => gerarJustificativa('carvedilol', ctx));

  // ── Step 9: Medical Trust Score ───────────────────────────────────────────
  console.log('Step 9: Medical Trust Score...');
  const trustScore = tryRecord(13, 'Medical Trust Score — carvedilol',
    'TherapeuticSuggestion carvedilol + Anamnese IC-FEr',
    () => calcularMedicalTrustScore(primarySuggestion, anamnese, explanacao ?? undefined, riskResult ?? undefined));

  // ── Step 10: Physician Validation ─────────────────────────────────────────
  console.log('Step 10: Physician Validation...');
  const review = tryRecord(14, 'Physician Validation — registrarReview',
    'veredicto=concordo, IC-FEr, carvedilol',
    () => registrarReview({
      medico_crm_hash: gerarIdPacienteAnonimo('CRM-SP-12345'),
      especialidade: 'cardiologia',
      diagnostico_id: 'icc',
      diagnostico_nome: 'Insuficiência cardíaca',
      molecula: 'carvedilol',
      classe_terapeutica: 'Betabloqueador',
      guideline_sigla: 'SBC',
      veredicto: 'concordo',
      justificativa_clinica: 'Indicação classe I grau A — redução de mortalidade confirmada.',
      perfil_paciente: 'IC-FEr FE=35%, 58 anos, HAS+DM2, DRC G3a',
    }));

  const boardVal = tryRecord(15, 'Board Validation — registrarBoardValidation',
    'status=aprovada, IC-FEr, carvedilol',
    () => registrarBoardValidation({
      medico_crm_hash: gerarIdPacienteAnonimo('CRM-SP-12345'),
      especialidade: 'cardiologia',
      diagnostico_id: 'icc',
      diagnostico_nome: 'Insuficiência cardíaca',
      molecula: 'carvedilol',
      classe_terapeutica: 'Betabloqueador',
      guideline_sigla: 'SBC',
      score_confianca_sistema: 90,
      status: 'aprovada',
      justificativa: 'Alinhado com Diretriz SBC 2018 — IC-FEr classe I grau A.',
    }));

  // ── Step 11: Recommendation Registry ──────────────────────────────────────
  console.log('Step 11: Recommendation Registry...');
  const regResult = tryRecord(16, 'Recommendation Registry — registrar + verificar',
    'carvedilol I50.0/icc',
    () => {
      const rec = registrarRecomendacao({
        diagnostico_id: 'icc',
        diagnostico_nome: 'Insuficiência cardíaca',
        molecula: 'carvedilol',
        classe_terapeutica: 'Betabloqueador',
        indicacao: 'IC-FEr — redução de mortalidade',
        guideline_sigla: 'SBC',
        guideline_versao: '2018',
        guideline_sociedade: 'Sociedade Brasileira de Cardiologia',
        guideline_ano: 2018,
        evidencias: [{ estudo: 'CARVEDILOL-US', nivel: 'A', grau: 'I' }],
        engine: 'clinical-therapeutics',
        score_confianca: 93,
        score_seguranca: 88,
        score_evidencia: 95,
      });
      const ok = verificarIntegridade(rec);
      const stats = calcularEstatisticasRegistry();
      return { rec_id: rec.id, integridade_ok: ok, total_registry: stats.total };
    });

  // ── Step 12: Prognosis Engine ──────────────────────────────────────────────
  console.log('Step 12: Prognosis Engine...');
  const prognostico = tryRecord(17, 'Prognosis Engine — IC-FEr + DM2 + HAS',
    'gerarPrognostico I50.0 horizonte=6m',
    () => {
      const perfil: PerfilPrognostico = {
        cid: 'I50.0', idade: 58, sexo: 'M',
        comorbidades: ['diabetes', 'hipertensao'],
        classe_nyha: 3,
        creatinina: 1.4,
        albumina: 3.8,
        internacoes_12m: 1,
      };
      return gerarPrognostico(perfil, '6m');
    });

  // ── Step 13: Evidence Base ─────────────────────────────────────────────────
  console.log('Step 13: Evidence DB...');
  const evidenceStats = tryRecord(18, 'Evidence DB — busca IC no EVIDENCE_DB',
    'EVIDENCE_DB.find IC/cardio',
    () => {
      const cardio = EVIDENCE_DB.find(d =>
        d.nome?.toLowerCase().includes('card') ||
        d.nome?.toLowerCase().includes('insufici'));
      const total = EVIDENCE_DB.reduce((acc, diag) =>
        acc + diag.diretrizes.reduce((a2, d) =>
          a2 + d.terapias.reduce((a3, t) => a3 + t.estudos.length, 0), 0), 0);
      return { total_diagnosticos: EVIDENCE_DB.length, total_estudos: total, ic_encontrada: !!cardio };
    });

  // ── Step 14: Scientific Update Alerts ─────────────────────────────────────
  console.log('Step 14: Scientific Update Alerts...');
  const alertas = tryRecord(19, 'Scientific Update Engine — listarAlertas',
    'todos os alertas',
    () => {
      const todos    = listarAlertas();
      const imediatas = listarAlertas({ urgencia: 'imediata' });
      const altas    = listarAlertas({ urgencia: 'alta' });
      return { total: todos.length, imediatas: imediatas.length, altas: altas.length };
    });

  // ── Step 15: PharmDB coverage ──────────────────────────────────────────────
  console.log('Step 15: PharmDB — marcas disponíveis...');
  const pharmCoverage = tryRecord(20, 'PharmDB — marcas IC molecules',
    'carvedilol, furosemida, sacubitril_valsartana, eplerenona',
    () => {
      const all = getAllDrugs();
      return ['carvedilol', 'furosemida', 'sacubitril_valsartana', 'eplerenona', 'metformina'].map(mol => {
        const drug = all.find(d => d.id === mol);
        return { mol, marcas: drug?.marcas?.length ?? 0, found: !!drug };
      });
    });

  // ── Step 16: getDoseIndisponivelMsg for a non-dosable molecule ─────────────
  console.log('Step 16: getDoseIndisponivelMsg...');
  tryRecord(21, 'getDoseIndisponivelMsg — molécula sem regras posológicas',
    'getDoseIndisponivelMsg("levotiroxina")',
    () => getDoseIndisponivelMsg('Levotiroxina'));

  tryRecord(22, 'isDoseCalculavel — carvedilol vs levotiroxina',
    'isDoseCalculavel check',
    () => ({
      carvedilol: isDoseCalculavel('carvedilol'),
      levotiroxina: isDoseCalculavel('levotiroxina'),
    }));

  // ─── Final Report ──────────────────────────────────────────────────────────
  const totalMs = Date.now() - t0Total;
  const passed  = steps.filter(s => s.ok).length;
  const failed  = steps.filter(s => !s.ok).length;

  console.log('\n═══════════════════════════════════════════════');
  console.log('  FULL PATIENT FLOW — RELATÓRIO FINAL');
  console.log('═══════════════════════════════════════════════');
  console.log(`Steps totais   : ${steps.length}`);
  console.log(`✅ Sucesso     : ${passed}`);
  console.log(`❌ Falha       : ${failed}`);
  console.log(`Tempo total    : ${totalMs} ms`);
  console.log();

  if (failed > 0) {
    console.log('❌ FALHAS DE INTEGRAÇÃO:');
    steps.filter(s => !s.ok).forEach(s => {
      console.log(`  [Step ${String(s.step).padStart(2, '0')}] ${s.name}`);
      console.log(`    Erro: ${s.error}`);
    });
    console.log();
  }

  console.log('─── TODOS OS OBJETOS PRODUZIDOS ────────────────');
  steps.forEach(s => {
    const icon = s.ok ? '✅' : '❌';
    console.log(`\n${icon} Step ${String(s.step).padStart(2, '0')}: ${s.name} (${s.duration_ms}ms)`);
    console.log(`   Input : ${s.input_summary}`);
    if (s.ok) {
      const out = JSON.stringify(s.output, null, 2);
      console.log(`   Output: ${out.length > 500 ? out.slice(0, 500) + '\n   ...[truncado]' : out}`);
    } else {
      console.log(`   Error : ${s.error}`);
    }
  });

  console.log('\n═══════════════════════════════════════════════');
  if (failed === 0) console.log('🟢 FLUXO COMPLETO VALIDADO — pipeline integrado funcionando.');
  else console.log(`🔴 ${failed} falha(s) de integração — revisar antes de produção.`);
  console.log('═══════════════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error('ERRO FATAL:', err); process.exit(1); });
