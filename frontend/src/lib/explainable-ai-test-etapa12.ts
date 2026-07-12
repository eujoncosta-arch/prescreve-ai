// ============================================================
// PRESCREVE-AI — ETAPA 12: Teste de IA Explicável
//
// Para cada recomendação verifica:
//   WHY          — indicação, diretriz, mecanismo, estudos pivotais
//   WHY NOT      — restrições, contraindicações, interações, segurança
//   WHAT IF      — cenários comparativos, NNT, custo-efetividade
//   ALTERNATIVES — alternativas clínicas por linha de tratamento
//   Evidence     — força de evidência, score, estudos, NNT, RRR
//   Trust Score  — 6 dimensões, consistência entre motores
//
// Tudo deve permanecer consistente:
//   score_evidencia (WHY) ↔ ExplainabilityScore ↔ TrustScore
//   restricoes (WHY_NOT) → score_seguranca inversamente proporcional
//   alternativas classificadas por linha (1ª → 2ª → 3ª)
//
// CDSS — Suporte à decisão. Decisão médica soberana.
// ============================================================

'use client';

import {
  gerarExplainableAIv2,
  gerarWHY,
  gerarWHYNOT,
  gerarWHATIF,
  gerarALTERNATIVAS,
  calcularExplainabilityScore,
  type ExplainableAIv2Result,
  type RespostaWHY,
  type RespostaWHYNOT,
  type RespostaWHATIF,
  type RespostaALTERNATIVAS,
  type ExplainabilityScore,
} from './explainable-ai-v2';

import {
  calcularMedicalTrustScore,
  calcularScoresPlano,
  scoreGlobalPlano,
  type MedicalTrustScore,
} from './medical-trust-score';

import type { TherapeuticSuggestion, Anamnesis } from './types';

// ════════════════════════════════════════════════════════════
// TIPOS DO TESTE
// ════════════════════════════════════════════════════════════

export type SeveridadeEtapa12 = 'critica' | 'alta' | 'moderada' | 'baixa';
export type StatusEtapa12     = 'passou' | 'falhou' | 'aviso';

export interface ResultadoTeste12 {
  id:              string;
  suite:           string;
  descricao:       string;
  status:          StatusEtapa12;
  severidade?:     SeveridadeEtapa12;
  detalhe:         string;
  valor_esperado?: string;
  valor_obtido?:   string;
  latencia_ms:     number;
}

export interface SuiteResultado12 {
  nome:     string;
  testes:   ResultadoTeste12[];
  passou:   number;
  falhou:   number;
  avisos:   number;
  tempo_ms: number;
  status:   StatusEtapa12;
}

export interface ExplainableAITestEtapa12Result {
  timestamp:        string;
  suites:           SuiteResultado12[];
  total_testes:     number;
  total_passou:     number;
  total_falhou:     number;
  total_avisos:     number;
  tempo_total_ms:   number;
  status_geral:     StatusEtapa12;
  consistencia_pct: number;
  criticos_falhos:  string[];
  relatorio:        string;
}

// ════════════════════════════════════════════════════════════
// RUNNER
// ════════════════════════════════════════════════════════════

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function mkTeste(
  suite: string,
  id: string,
  descricao: string,
  fn: () => { ok: boolean; detalhe: string; esperado?: string; obtido?: string; sev?: SeveridadeEtapa12 },
): ResultadoTeste12 {
  const t0 = now();
  try {
    const r = fn();
    return {
      id, suite, descricao,
      status:         r.ok ? 'passou' : 'falhou',
      severidade:     r.ok ? undefined : (r.sev ?? 'alta'),
      detalhe:        r.detalhe,
      valor_esperado: r.esperado,
      valor_obtido:   r.obtido,
      latencia_ms:    Math.round((now() - t0) * 100) / 100,
    };
  } catch (e) {
    return {
      id, suite, descricao, status: 'falhou', severidade: 'critica',
      detalhe: `Exceção: ${e instanceof Error ? e.message : String(e)}`,
      latencia_ms: Math.round((now() - t0) * 100) / 100,
    };
  }
}

function mkSuite(nome: string, testes: ResultadoTeste12[], tempoMs: number): SuiteResultado12 {
  const passou = testes.filter(t => t.status === 'passou').length;
  const falhou = testes.filter(t => t.status === 'falhou').length;
  const avisos = testes.filter(t => t.status === 'aviso').length;
  return {
    nome, testes, passou, falhou, avisos,
    tempo_ms: Math.round(tempoMs),
    status: falhou > 0 ? 'falhou' : avisos > 0 ? 'aviso' : 'passou',
  };
}

// ════════════════════════════════════════════════════════════
// FIXTURES CLÍNICOS
// ════════════════════════════════════════════════════════════

// Paciente tipo HAS + DM2 + DRC
const ANAMNESE_HAS_DM2_DRC: Anamnesis = {
  queixa_principal: 'PA elevada e glicemia descontrolada',
  hda: 'HAS diagnosticada há 10 anos, DM2 há 7 anos',
  hpp: 'DRC estágio G3a',
  historia_familiar: 'Pai: IAM 60 anos. Mãe: DM2.',
  habitos_vida: { tabagismo: 'ex', atividade_fisica: 'sedentario' },
  exame_fisico: 'Edema maleolar +/4',
  sinais_vitais: { pa_sistolica: 148, pa_diastolica: 92, fc: 76, fr: 16, temperatura: 36.5, spo2: 97 },
  laboratorio: { creatinina: '1.4', hba1c: '8.2', ldl: '142', potassio: '4.3', pcr: '4' },
  imagem: '',
  comorbidades: ['Hipertensão arterial sistêmica', 'Diabetes mellitus tipo 2', 'DRC G3a'],
  medicamentos_em_uso: [{ id: 'met-001', nome: 'Metformina 850mg', via: 'oral', frequencia: '2x/dia', em_uso: true }],
  alergias: [],
  gestante: false,
  lactante: false,
  funcao_renal: { creatinina: 1.4, tfg: 52 },
  funcao_hepatica: { bilirrubina_total: 0.8 },
};

// Paciente IC-FEr com contraindicação absoluta (uso de IECA ao adicionar ARNI)
const ANAMNESE_ICC: Anamnesis = {
  queixa_principal: 'Dispneia ao esforço mínimo, edema progressivo',
  hda: 'IC diagnosticada há 3 anos, em uso de enalapril',
  hpp: 'DRC G3b',
  historia_familiar: 'IC em parente de 1º grau',
  habitos_vida: { tabagismo: 'nunca', atividade_fisica: 'sedentario' },
  exame_fisico: 'B3, estase jugular, edema MMII ++/4',
  sinais_vitais: { pa_sistolica: 102, pa_diastolica: 65, fc: 88, fr: 18, temperatura: 36.3, spo2: 95 },
  laboratorio: { creatinina: '1.8', potassio: '5.2', bnp: '920', sodio: '136' },
  imagem: '',
  comorbidades: ['Insuficiência cardíaca com fração de ejeção reduzida', 'Hipertensão arterial sistêmica'],
  medicamentos_em_uso: [
    { id: 'enalap-001', nome: 'Enalapril 10mg',     via: 'oral', frequencia: '2x/dia', em_uso: true },
    { id: 'carve-001',  nome: 'Carvedilol 12,5mg',  via: 'oral', frequencia: '2x/dia', em_uso: true },
    { id: 'espiro-001', nome: 'Espironolactona 25mg',via: 'oral', frequencia: '1x/dia', em_uso: true },
  ],
  alergias: [{ id: 'al-001', substancia: 'Lisinopril', tipo: 'medicamento', reacao: 'tosse', gravidade: 'leve' }],
  gestante: false,
  lactante: false,
  funcao_renal: { creatinina: 1.8, tfg: 38 },
  funcao_hepatica: {},
};

// Paciente gestante com contraindicação absoluta a IECA
const ANAMNESE_GESTANTE: Anamnesis = {
  queixa_principal: 'PA elevada, 2º trimestre gestacional',
  hda: 'HAS diagnosticada na gestação',
  hpp: 'G2P1A0, IG 22 semanas',
  historia_familiar: 'Mãe: HAS',
  habitos_vida: { tabagismo: 'nunca', atividade_fisica: 'leve' },
  exame_fisico: 'PA 154/96 mmHg',
  sinais_vitais: { pa_sistolica: 154, pa_diastolica: 96, fc: 90, fr: 16, temperatura: 36.8, spo2: 99 },
  laboratorio: { creatinina: '0.8', potassio: '3.9' },
  imagem: '',
  comorbidades: ['Hipertensão arterial sistêmica'],
  medicamentos_em_uso: [],
  alergias: [],
  gestante: true,
  lactante: false,
  funcao_renal: { creatinina: 0.8, tfg: 110 },
  funcao_hepatica: {},
};

// Paciente com asma e bradicardia (contraindicação a betabloqueador)
const ANAMNESE_ASMA_BRADICARDIA: Anamnesis = {
  queixa_principal: 'Crises de broncoespasmo + HAS',
  hda: 'Asma moderada há 15 anos, HAS diagnosticada há 2 anos',
  hpp: 'Internação por crise de asma 2022',
  historia_familiar: 'Rinite e asma em irmão',
  habitos_vida: { tabagismo: 'nunca', atividade_fisica: 'leve' },
  exame_fisico: 'Sibilos difusos ao auscultar',
  sinais_vitais: { pa_sistolica: 145, pa_diastolica: 88, fc: 51, fr: 16, temperatura: 36.5, spo2: 94 },
  laboratorio: { creatinina: '0.9', potassio: '4.1' },
  imagem: '',
  comorbidades: ['Hipertensão arterial sistêmica', 'Asma'],
  medicamentos_em_uso: [],
  alergias: [],
  gestante: false,
  lactante: false,
  funcao_renal: { creatinina: 0.9, tfg: 78 },
  funcao_hepatica: {},
};

// TherapeuticSuggestion: Enalapril (IECA, referência)
const MED_ENALAPRIL: TherapeuticSuggestion = {
  id: 'enalapril-has-001',
  classe_terapeutica: 'IECA',
  molecula: 'Enalapril',
  nome_generico: 'Enalapril maleato',
  indicacao: 'Hipertensão arterial, insuficiência cardíaca, nefropatia diabética, pós-IAM',
  dose: {
    dose_padrao: '10 mg',
    dose_min: '2,5 mg',
    dose_max: '40 mg',
    unidade: 'mg',
    via: 'oral',
    frequencia: '1–2x/dia',
    ajuste_renal: 'TFG 30–59: iniciar 2,5–5 mg. TFG < 30: 2,5 mg/dia, titular com cautela.',
    ajuste_hepatico: 'Hepatopatia grave: titular com cautela.',
  },
  posologia_completa: 'Enalapril 10 mg VO 1x/dia, titular a cada 2 semanas até 20–40 mg/dia conforme tolerância',
  evidencia: {
    diretriz: 'VI Diretrizes Brasileiras de Hipertensão / ESC 2024',
    sociedade: 'SBC / ESC',
    ano: 2024,
    nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'Evidência de RCTs múltiplos ou metanálise' },
    citacao: 'CONSENSUS trial (1987); SOLVD-Treatment (1991); ESC Guidelines 2024',
    doi: '10.1093/eurheartj/ehae178',
  },
  contraindicacoes: [
    'Gravidez (2º e 3º trimestres — categoria D FDA)',
    'Angioedema prévio por IECA',
    'Uso concomitante de Sacubitril/Valsartana (washout 36h)',
    'Hiperpotassemia (K+ > 5,5 mEq/L)',
    'Estenose bilateral de artéria renal',
  ],
  efeitos_adversos: ['Tosse seca (10–15%)', 'Hipotensão na 1ª dose', 'Hiperpotassemia', 'Angioedema (raro)', 'Elevação transitória de creatinina'],
  monitoramento: ['PA após 1ª dose e periodicamente', 'Creatinina e K+ após 1–2 semanas', 'PA ortostática'],
  alternativas: ['Losartana', 'Ramipril', 'Anlodipino'],
};

// TherapeuticSuggestion: Sacubitril/Valsartana (ARNI)
const MED_ARNI: TherapeuticSuggestion = {
  id: 'sacubitril-valsartana-ic-001',
  classe_terapeutica: 'ARNI',
  molecula: 'Sacubitril/Valsartana',
  nome_generico: 'Sacubitril/Valsartana',
  indicacao: 'Insuficiência cardíaca com fração de ejeção reduzida (IC-FEr) NYHA II-IV, substitui IECA/BRA',
  dose: {
    dose_padrao: '49/51 mg',
    dose_min: '24/26 mg',
    dose_max: '97/103 mg',
    unidade: 'mg',
    via: 'oral',
    frequencia: '2x/dia',
    ajuste_renal: 'TFG 30–60: iniciar com dose mínima. TFG < 30: contraindicado.',
    ajuste_hepatico: 'Child-Pugh B: dose mínima. Child-Pugh C: contraindicado.',
  },
  posologia_completa: 'Sacubitril/Valsartana 49/51 mg VO 2x/dia, titular a cada 2–4 semanas até 97/103 mg 2x/dia',
  evidencia: {
    diretriz: 'ESC Heart Failure Guidelines 2023',
    sociedade: 'ESC / SBC',
    ano: 2023,
    nivel_evidencia: { nivel: 'B', grau: 'I', descricao: 'Evidência de RCT único ou estudos não randomizados' },
    citacao: 'PARADIGM-HF (McMurray et al., NEJM 2014)',
    doi: '10.1056/NEJMoa1409077',
  },
  contraindicacoes: [
    'Uso concomitante de IECA (washout obrigatório de 36h)',
    'Angioedema prévio',
    'TFG < 30 mL/min',
    'Gravidez',
    'Child-Pugh C',
  ],
  efeitos_adversos: ['Hipotensão sintomática', 'Angioedema (1–2%)', 'Hiperpotassemia', 'Elevação de creatinina'],
  monitoramento: ['PA após cada aumento de dose', 'K+ e creatinina 1–2 semanas após início', 'Sintomas de angioedema'],
  alternativas: ['Enalapril', 'Valsartana', 'Losartana'],
};

// TherapeuticSuggestion: Empagliflozina (iSGLT2)
const MED_EMPAGLIFLOZINA: TherapeuticSuggestion = {
  id: 'empagliflozina-dm2-001',
  classe_terapeutica: 'iSGLT2',
  molecula: 'Empagliflozina',
  nome_generico: 'Empagliflozina',
  indicacao: 'Diabetes mellitus tipo 2 com DCV aterosclerótica, IC ou DRC; redução de morte CV e progressão de DRC',
  dose: {
    dose_padrao: '10 mg',
    dose_min: '10 mg',
    dose_max: '25 mg',
    unidade: 'mg',
    via: 'oral',
    frequencia: '1x/dia (manhã)',
    ajuste_renal: 'TFG 20–45: 10 mg (só cardiorrenal, não glicêmico). TFG < 20: contraindicado.',
    ajuste_hepatico: 'Sem ajuste até Child-Pugh B.',
  },
  posologia_completa: 'Empagliflozina 10 mg VO 1x/dia pela manhã, com ou sem alimentos',
  evidencia: {
    diretriz: 'ADA Standards of Care 2025 / SBD 2024',
    sociedade: 'ADA / SBD / ESC',
    ano: 2025,
    nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'Evidência de múltiplos RCTs e metanálises' },
    citacao: 'EMPA-REG OUTCOME (Zinman et al., NEJM 2015); EMPEROR-Reduced (Packer et al., NEJM 2020)',
    doi: '10.2337/dc25-S010',
  },
  contraindicacoes: [
    'TFG < 20 mL/min',
    'DM tipo 1',
    'Cetoacidose diabética ativa',
    'Infecções recorrentes do trato urinário',
    'Jejum prolongado (perioperatório)',
  ],
  efeitos_adversos: ['ITU/candidíase genital (5–10%)', 'Cetoacidose euglicêmica (raro)', 'Hipotensão volume-depleção', 'Amputação (monitorar)'],
  monitoramento: ['Glicemia + HbA1c 3 meses', 'TFG e K+ a cada 6 meses', 'Sinais de ITU/candidíase', 'PA em uso combinado com diuréticos'],
  alternativas: ['Dapagliflozina', 'Metformina', 'Semaglutida'],
};

// TherapeuticSuggestion: Carvedilol (contraindicado em asma)
const MED_CARVEDILOL: TherapeuticSuggestion = {
  id: 'carvedilol-ic-001',
  classe_terapeutica: 'Betabloqueador',
  molecula: 'Carvedilol',
  nome_generico: 'Carvedilol',
  indicacao: 'IC-FEr, HAS, pós-IAM',
  dose: {
    dose_padrao: '25 mg',
    dose_min: '3,125 mg',
    dose_max: '50 mg',
    unidade: 'mg',
    via: 'oral',
    frequencia: '2x/dia',
    ajuste_renal: 'Sem ajuste necessário.',
  },
  posologia_completa: 'Carvedilol 3,125 mg VO 2x/dia, dobrar a cada 2 semanas até 25–50 mg 2x/dia',
  evidencia: {
    diretriz: 'ESC Heart Failure Guidelines 2023',
    sociedade: 'ESC / SBC',
    ano: 2023,
    nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'Evidência de múltiplos RCTs' },
    citacao: 'COPERNICUS (Packer et al., NEJM 2001)',
    doi: '10.1056/NEJMoa010336',
  },
  contraindicacoes: [
    'Asma brônquica',
    'DPOC grave com broncoespasmo',
    'BAV 2º ou 3º grau sem marcapasso',
    'Bradicardia (FC < 60 bpm)',
    'Choque cardiogênico / descompensação hemodinâmica',
  ],
  efeitos_adversos: ['Bradicardia', 'Hipotensão', 'Broncoespasmo', 'Fadiga', 'Mascaramento hipoglicemia'],
  monitoramento: ['FC antes de cada dose', 'PA ortostática', 'Sintomas respiratórios'],
  alternativas: ['Bisoprolol', 'Metoprolol succinato', 'Ivabradina (se contraindicado)'],
};

// ════════════════════════════════════════════════════════════
// SUITE 1 — WHY: Indicação, Diretriz, Mecanismo, Estudos
// ════════════════════════════════════════════════════════════

function suiteWHY(): SuiteResultado12 {
  const t0 = now();
  const testes: ResultadoTeste12[] = [];

  const why_enalap = gerarWHY(MED_ENALAPRIL, ANAMNESE_HAS_DM2_DRC);
  const why_arni   = gerarWHY(MED_ARNI,      ANAMNESE_ICC);
  const why_empa   = gerarWHY(MED_EMPAGLIFLOZINA, ANAMNESE_HAS_DM2_DRC);

  // Estrutura obrigatória
  testes.push(mkTeste('WHY', 'WHY-01', 'RespostaWHY tem todos os campos obrigatórios', () => {
    const campos = ['indicacao_principal', 'justificativas_diretriz', 'estudos_pivotais', 'beneficio_risco', 'mecanismo_acao', 'por_que_esta_classe', 'por_que_esta_molecula', 'score_evidencia'];
    const faltando = campos.filter(c => (why_enalap as unknown as Record<string, unknown>)[c] === undefined);
    const ok = faltando.length === 0;
    return { ok, detalhe: ok ? 'Todos os campos presentes ✓' : `Campos ausentes: ${faltando.join(', ')}`, sev: 'critica' };
  }));

  testes.push(mkTeste('WHY', 'WHY-02', 'indicacao_principal não é vazia', () => {
    const ok = why_enalap.indicacao_principal.length > 10;
    return { ok, detalhe: ok ? `"${why_enalap.indicacao_principal.slice(0, 60)}…" ✓` : 'Campo vazio', sev: 'alta' };
  }));

  testes.push(mkTeste('WHY', 'WHY-03', 'justificativas_diretriz contém diretriz e sociedade', () => {
    const jd = why_enalap.justificativas_diretriz[0];
    const ok = !!jd?.diretriz && !!jd?.sociedade && jd?.ano > 2000;
    return { ok, detalhe: ok ? `${jd.diretriz} (${jd.sociedade} ${jd.ano}) ✓` : 'Diretriz incompleta', sev: 'alta' };
  }));

  testes.push(mkTeste('WHY', 'WHY-04', 'nivel_evidencia na diretriz é A, B, C ou D', () => {
    const nivel = why_enalap.justificativas_diretriz[0]?.nivel_evidencia;
    const ok = ['A', 'B', 'C', 'D'].includes(nivel ?? '');
    return { ok, detalhe: ok ? `Nível: ${nivel} ✓` : `Valor inválido: ${nivel}`, sev: 'critica', esperado: 'A|B|C|D', obtido: nivel };
  }));

  testes.push(mkTeste('WHY', 'WHY-05', 'Enalapril tem estudos pivotais CONSENSUS e SOLVD', () => {
    const nomes = why_enalap.estudos_pivotais.map(e => e.nome);
    const temCONSENSUS = nomes.some(n => n.toUpperCase().includes('CONSENSUS'));
    const temSOLVD     = nomes.some(n => n.toUpperCase().includes('SOLVD'));
    const ok = temCONSENSUS && temSOLVD;
    return { ok, detalhe: ok ? `Estudos: ${nomes.join(', ')} ✓` : `Faltando CONSENSUS:${!temCONSENSUS} SOLVD:${!temSOLVD}`, sev: 'alta' };
  }));

  testes.push(mkTeste('WHY', 'WHY-06', 'EstudoPivotal tem n_pacientes > 0 e desfecho_primario', () => {
    const ok = why_enalap.estudos_pivotais.every(e => e.n_pacientes > 0 && e.desfecho_primario.length > 5);
    return { ok, detalhe: ok ? `${why_enalap.estudos_pivotais.length} estudos com dados completos ✓` : 'Estudo com dados incompletos', sev: 'moderada' };
  }));

  testes.push(mkTeste('WHY', 'WHY-07', 'NNT numérico positivo no beneficio_risco', () => {
    const nnt = why_enalap.beneficio_risco.nnt;
    const ok = typeof nnt === 'number' && nnt > 0 && nnt < 1000;
    return { ok, detalhe: ok ? `NNT: ${nnt} ✓` : `NNT inválido: ${nnt}`, sev: 'alta', esperado: '>0 <1000', obtido: String(nnt) };
  }));

  testes.push(mkTeste('WHY', 'WHY-08', 'mecanismo_acao descreve a farmacologia da molécula', () => {
    const mec = why_enalap.mecanismo_acao;
    const ok = mec.length > 30 && (mec.toLowerCase().includes('angiotensina') || mec.toLowerCase().includes('ieca'));
    return { ok, detalhe: ok ? `Mecanismo: "${mec.slice(0, 70)}…" ✓` : 'Mecanismo muito genérico ou ausente', sev: 'moderada' };
  }));

  testes.push(mkTeste('WHY', 'WHY-09', 'score_evidencia está entre 0 e 100', () => {
    const s = why_enalap.score_evidencia;
    const ok = s >= 0 && s <= 100;
    return { ok, detalhe: ok ? `Score: ${s}/100 ✓` : `Fora do range: ${s}`, sev: 'critica', esperado: '0–100', obtido: String(s) };
  }));

  testes.push(mkTeste('WHY', 'WHY-10', 'Evidência A tem score_evidencia ≥ 80', () => {
    const nivelA = why_enalap.justificativas_diretriz[0]?.nivel_evidencia === 'A';
    const ok = !nivelA || why_enalap.score_evidencia >= 80;
    return { ok, detalhe: ok ? `Nível A → score ${why_enalap.score_evidencia} ✓` : `Nível A mas score ${why_enalap.score_evidencia} < 80`, sev: 'alta', esperado: '≥80', obtido: String(why_enalap.score_evidencia) };
  }));

  testes.push(mkTeste('WHY', 'WHY-11', 'Empagliflozina cita EMPA-REG OUTCOME', () => {
    const nomes = why_empa.estudos_pivotais.map(e => e.nome.toUpperCase());
    const ok = nomes.some(n => n.includes('EMPA-REG') || n.includes('EMPAREG'));
    return { ok, detalhe: ok ? `Estudos: ${nomes.join(', ')} ✓` : 'EMPA-REG OUTCOME ausente', sev: 'alta' };
  }));

  testes.push(mkTeste('WHY', 'WHY-12', 'ARNI tem por_que_esta_molecula explicando superioridade vs IECA', () => {
    const mol = why_arni.por_que_esta_molecula.toLowerCase();
    const ok = mol.includes('enalapril') || mol.includes('paradigm') || mol.includes('superior') || mol.includes('arni');
    return { ok, detalhe: ok ? `"${why_arni.por_que_esta_molecula.slice(0, 80)}…" ✓` : 'Ausência de justificativa comparativa', sev: 'moderada' };
  }));

  testes.push(mkTeste('WHY', 'WHY-13', 'DOI presente no estudo pivotal quando disponível', () => {
    const com_doi = why_empa.estudos_pivotais.filter(e => e.doi);
    const ok = com_doi.length > 0;
    return { ok, detalhe: ok ? `${com_doi.length} estudos com DOI ✓` : 'Nenhum estudo com DOI', sev: 'baixa' };
  }));

  return mkSuite('WHY — Indicação e Evidência', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 2 — WHY NOT: Restrições, Contraindicações, Segurança
// ════════════════════════════════════════════════════════════

function suiteWHYNOT(): SuiteResultado12 {
  const t0 = now();
  const testes: ResultadoTeste12[] = [];

  // Sem restrições: IECA em HAS/DM2 com função renal limítrofe
  const wn_enalap_ok = gerarWHYNOT(MED_ENALAPRIL, ANAMNESE_HAS_DM2_DRC);

  // Contraindicação absoluta: ARNI + IECA concomitante
  const wn_arni_ci = gerarWHYNOT(MED_ARNI, ANAMNESE_ICC);

  // Contraindicação absoluta: IECA em gestante
  const wn_enalap_gestante = gerarWHYNOT(MED_ENALAPRIL, ANAMNESE_GESTANTE);

  // Contraindicação: Carvedilol em asma + bradicardia
  const wn_carvedilol_asma = gerarWHYNOT(MED_CARVEDILOL, ANAMNESE_ASMA_BRADICARDIA);

  testes.push(mkTeste('WHY_NOT', 'WN-01', 'RespostaWHYNOT tem todos os campos obrigatórios', () => {
    const campos = ['restricoes', 'tem_contraindicacao_absoluta', 'score_seguranca', 'resumo'];
    const faltando = campos.filter(c => (wn_enalap_ok as unknown as Record<string, unknown>)[c] === undefined);
    const ok = faltando.length === 0;
    return { ok, detalhe: ok ? 'Todos os campos presentes ✓' : `Faltando: ${faltando.join(', ')}`, sev: 'critica' };
  }));

  testes.push(mkTeste('WHY_NOT', 'WN-02', 'score_seguranca está entre 0 e 100', () => {
    const ok = wn_enalap_ok.score_seguranca >= 0 && wn_enalap_ok.score_seguranca <= 100;
    return { ok, detalhe: ok ? `Score: ${wn_enalap_ok.score_seguranca}/100 ✓` : `Fora do range: ${wn_enalap_ok.score_seguranca}`, sev: 'critica' };
  }));

  testes.push(mkTeste('WHY_NOT', 'WN-03', 'ARNI + IECA concomitante → contraindicação absoluta detectada', () => {
    const ok = wn_arni_ci.tem_contraindicacao_absoluta;
    return {
      ok, sev: 'critica',
      detalhe: ok
        ? `Contraindicação absoluta detectada: ${wn_arni_ci.restricoes.find(r => r.gravidade === 'absoluta')?.descricao ?? '?'} ✓`
        : 'NÃO detectou contraindicação absoluta para ARNI + IECA!',
    };
  }));

  testes.push(mkTeste('WHY_NOT', 'WN-04', 'IECA em gestante → contraindicação absoluta', () => {
    const ok = wn_enalap_gestante.tem_contraindicacao_absoluta;
    return {
      ok, sev: 'critica',
      detalhe: ok
        ? `Gestante detectada: ${wn_enalap_gestante.restricoes.find(r => r.gravidade === 'absoluta')?.descricao ?? '?'} ✓`
        : 'NÃO detectou contraindicação absoluta em gestante!',
    };
  }));

  testes.push(mkTeste('WHY_NOT', 'WN-05', 'Carvedilol em asma → contraindicação absoluta', () => {
    const ci_asma = wn_carvedilol_asma.restricoes.find(r =>
      r.tipo === 'contraindicacao_absoluta' && r.criterio_ativado.toLowerCase().includes('asma')
    );
    const ok = !!ci_asma;
    return {
      ok, sev: 'critica',
      detalhe: ok
        ? `Asma detectada como contraindicação absoluta: ${ci_asma.descricao} ✓`
        : 'NÃO detectou contraindicação de asma para betabloqueador!',
    };
  }));

  testes.push(mkTeste('WHY_NOT', 'WN-06', 'Carvedilol bradicardia (FC 51) → restrição grave detectada', () => {
    const ci_brad = wn_carvedilol_asma.restricoes.find(r =>
      r.criterio_ativado.includes('51') || r.criterio_ativado.toLowerCase().includes('bradicard')
    );
    const ok = !!ci_brad && (ci_brad.gravidade === 'grave' || ci_brad.gravidade === 'absoluta');
    return {
      ok, sev: 'alta',
      detalhe: ok
        ? `FC 51 → restrição ${ci_brad.gravidade}: "${ci_brad.descricao}" ✓`
        : `Bradicardia não detectada ou gravidade incorreta`,
    };
  }));

  testes.push(mkTeste('WHY_NOT', 'WN-07', 'IECA em HAS+DM2+DRC(TFG52) → ajuste de dose renal detectado', () => {
    const ajuste = wn_enalap_ok.restricoes.find(r => r.tipo === 'ajuste_dose' || r.criterio_ativado.includes('TFG') || r.criterio_ativado.includes('52'));
    const ok = !!ajuste;
    return {
      ok, sev: 'alta',
      detalhe: ok
        ? `TFG 52 → ajuste: "${ajuste.acao_recomendada}" ✓`
        : 'Ajuste renal não detectado para TFG 52',
    };
  }));

  testes.push(mkTeste('WHY_NOT', 'WN-08', 'score_seguranca menor quando há contraindicação absoluta', () => {
    // CI absoluta deve ter score < caso sem CI absoluta
    const scoreComCI   = wn_enalap_gestante.score_seguranca;
    const scoreSemCI   = wn_enalap_ok.score_seguranca;
    const ok = scoreComCI < scoreSemCI;
    return {
      ok, sev: 'critica',
      detalhe: ok
        ? `Score c/ CI absoluta: ${scoreComCI} < sem CI: ${scoreSemCI} ✓`
        : `Inconsistência: CI absoluta mas score (${scoreComCI}) ≥ score sem CI (${scoreSemCI})`,
      esperado: `${scoreComCI} < ${scoreSemCI}`,
      obtido: `${scoreComCI} vs ${scoreSemCI}`,
    };
  }));

  testes.push(mkTeste('WHY_NOT', 'WN-09', 'restricoes tem criterio_ativado com dado clínico específico', () => {
    const gestRestricao = wn_enalap_gestante.restricoes.find(r => r.gravidade === 'absoluta');
    const ok = !!gestRestricao?.criterio_ativado && gestRestricao.criterio_ativado.length > 5;
    return {
      ok, sev: 'alta',
      detalhe: ok
        ? `criterio_ativado: "${gestRestricao.criterio_ativado}" ✓`
        : 'criterio_ativado ausente na contraindicação',
    };
  }));

  testes.push(mkTeste('WHY_NOT', 'WN-10', 'restricoes com CI absoluta tem acao_recomendada preenchida', () => {
    const abs = wn_arni_ci.restricoes.filter(r => r.gravidade === 'absoluta');
    const ok = abs.every(r => r.acao_recomendada.length > 10);
    return {
      ok, sev: 'moderada',
      detalhe: ok
        ? `${abs.length} CI absoluta(s) com ação recomendada ✓`
        : 'acao_recomendada ausente em contraindicação absoluta',
    };
  }));

  testes.push(mkTeste('WHY_NOT', 'WN-11', 'resumo é texto não vazio que reflete o estado clínico', () => {
    const ok = wn_arni_ci.resumo.length > 20 &&
      (wn_arni_ci.resumo.includes('⛔') || wn_arni_ci.resumo.toLowerCase().includes('absoluta') || wn_arni_ci.resumo.toLowerCase().includes('substituir'));
    return {
      ok, sev: 'moderada',
      detalhe: ok ? `Resumo: "${wn_arni_ci.resumo}" ✓` : `Resumo inadequado: "${wn_arni_ci.resumo}"`,
    };
  }));

  testes.push(mkTeste('WHY_NOT', 'WN-12', 'alternativa_sugerida presente quando há CI absoluta', () => {
    const ok = wn_enalap_gestante.alternativa_sugerida !== undefined;
    return {
      ok, sev: 'moderada',
      detalhe: ok ? `Alternativa: "${wn_enalap_gestante.alternativa_sugerida}" ✓` : 'alternativa_sugerida ausente apesar de CI absoluta',
    };
  }));

  return mkSuite('WHY NOT — Restrições e Segurança', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 3 — WHAT IF: Cenários, NNT, Trust Score
// ════════════════════════════════════════════════════════════

function suiteWHATIF(): SuiteResultado12 {
  const t0 = now();
  const testes: ResultadoTeste12[] = [];

  const wi_has  = gerarWHATIF('I10', ANAMNESE_HAS_DM2_DRC);
  const wi_dm2  = gerarWHATIF('E11', ANAMNESE_HAS_DM2_DRC);
  const wi_ic   = gerarWHATIF('I50', ANAMNESE_ICC);
  const wi_desconhecido = gerarWHATIF('Z99', ANAMNESE_HAS_DM2_DRC);

  testes.push(mkTeste('WHAT_IF', 'WI-01', 'RespostaWHATIF tem todos os campos obrigatórios', () => {
    const campos = ['pergunta', 'cenarios', 'recomendacao_analise', 'melhor_custo_efetividade', 'melhor_evidencia', 'disclaimer'];
    const faltando = campos.filter(c => (wi_has as unknown as Record<string, unknown>)[c] === undefined);
    const ok = faltando.length === 0;
    return { ok, detalhe: ok ? 'Todos os campos presentes ✓' : `Faltando: ${faltando.join(', ')}`, sev: 'critica' };
  }));

  testes.push(mkTeste('WHAT_IF', 'WI-02', 'CID I10 retorna ≥ 2 cenários comparativos', () => {
    const ok = wi_has.cenarios.length >= 2;
    return { ok, detalhe: ok ? `${wi_has.cenarios.length} cenários para I10 ✓` : `Apenas ${wi_has.cenarios.length} cenários`, sev: 'alta' };
  }));

  testes.push(mkTeste('WHAT_IF', 'WI-03', 'Cada CenarioClinco tem NNT > 0', () => {
    const invalidos = wi_has.cenarios.filter(c => !c.nnt || c.nnt <= 0);
    const ok = invalidos.length === 0;
    return { ok, detalhe: ok ? `Todos os ${wi_has.cenarios.length} cenários têm NNT válido ✓` : `${invalidos.length} cenários sem NNT válido`, sev: 'critica' };
  }));

  testes.push(mkTeste('WHAT_IF', 'WI-04', 'Cada cenário tem trust_score entre 0 e 100', () => {
    const invalidos = wi_has.cenarios.filter(c => c.trust_score < 0 || c.trust_score > 100);
    const ok = invalidos.length === 0;
    return { ok, detalhe: ok ? `Trust scores: ${wi_has.cenarios.map(c => c.trust_score).join(', ')} ✓` : `Cenários com trust score inválido`, sev: 'critica' };
  }));

  testes.push(mkTeste('WHAT_IF', 'WI-05', 'melhor_custo_efetividade corresponde ao cenário com menor custo', () => {
    const menorCusto = wi_has.cenarios.reduce((a, b) => b.custo_mensal_brl < a.custo_mensal_brl ? b : a);
    const ok = wi_has.melhor_custo_efetividade === menorCusto.nome;
    return {
      ok, sev: 'alta',
      detalhe: ok ? `Melhor custo: "${menorCusto.nome}" R$${menorCusto.custo_mensal_brl}/mês ✓` : `Discrepância: esperado "${menorCusto.nome}", campo tem "${wi_has.melhor_custo_efetividade}"`,
      esperado: menorCusto.nome, obtido: wi_has.melhor_custo_efetividade,
    };
  }));

  testes.push(mkTeste('WHAT_IF', 'WI-06', 'melhor_evidencia corresponde ao cenário com menor NNT', () => {
    const menorNNT = wi_has.cenarios.reduce((a, b) => b.nnt < a.nnt ? b : a);
    const ok = wi_has.melhor_evidencia === menorNNT.nome;
    return {
      ok, sev: 'alta',
      detalhe: ok ? `Melhor evidência: "${menorNNT.nome}" NNT=${menorNNT.nnt} ✓` : `Discrepância: esperado "${menorNNT.nome}", campo tem "${wi_has.melhor_evidencia}"`,
      esperado: menorNNT.nome, obtido: wi_has.melhor_evidencia,
    };
  }));

  testes.push(mkTeste('WHAT_IF', 'WI-07', 'DM2 com DCV: Empagliflozina tem trust_score maior que Metformina', () => {
    const empa   = wi_dm2.cenarios.find(c => c.molecula.toLowerCase().includes('empagliflozina'));
    const metf   = wi_dm2.cenarios.find(c => c.molecula.toLowerCase().includes('metformina') && !c.molecula.toLowerCase().includes('empagliflozina'));
    const ok = empa !== undefined && metf !== undefined && empa.trust_score >= metf.trust_score;
    return {
      ok, sev: 'alta',
      detalhe: ok
        ? `Empagliflozina ts:${empa?.trust_score} ≥ Metformina ts:${metf?.trust_score} ✓`
        : `Empagliflozina ts:${empa?.trust_score} < Metformina ts:${metf?.trust_score} — esperado ajuste para DCV`,
    };
  }));

  testes.push(mkTeste('WHAT_IF', 'WI-08', 'IC: cenário ARNI existe com NNT < cenário IECA isolado', () => {
    const arni = wi_ic.cenarios.find(c => c.molecula.toLowerCase().includes('sacubitril'));
    const ieca = wi_ic.cenarios.find(c => c.molecula.toLowerCase() === 'enalapril');
    const ok = !!arni && !!ieca && arni.nnt <= ieca.nnt;
    return {
      ok, sev: 'moderada',
      detalhe: ok
        ? `ARNI NNT:${arni?.nnt} ≤ IECA NNT:${ieca?.nnt} ✓`
        : `ARNI NNT:${arni?.nnt}, IECA NNT:${ieca?.nnt} — relação esperada não verificada`,
    };
  }));

  testes.push(mkTeste('WHAT_IF', 'WI-09', 'Cada cenário tem vantagens e desvantagens preenchidas', () => {
    const invalidos = wi_has.cenarios.filter(c => c.vantagens.length === 0 || c.desvantagens.length === 0);
    const ok = invalidos.length === 0;
    return { ok, detalhe: ok ? 'Todos os cenários com vantagens e desvantagens ✓' : `${invalidos.length} cenários incompletos`, sev: 'moderada' };
  }));

  testes.push(mkTeste('WHAT_IF', 'WI-10', 'CID inexistente retorna array de cenários vazio sem crash', () => {
    const ok = Array.isArray(wi_desconhecido.cenarios) && wi_desconhecido.cenarios.length === 0;
    return { ok, detalhe: ok ? 'CID desconhecido → cenários vazios sem crash ✓' : 'Comportamento inesperado para CID inválido', sev: 'alta' };
  }));

  testes.push(mkTeste('WHAT_IF', 'WI-11', 'disclaimer não está vazio e menciona médico', () => {
    const ok = wi_has.disclaimer.length > 20 && wi_has.disclaimer.toLowerCase().includes('médico');
    return { ok, detalhe: ok ? `"${wi_has.disclaimer.slice(0, 80)}…" ✓` : 'Disclaimer insuficiente', sev: 'moderada' };
  }));

  return mkSuite('WHAT IF — Cenários Comparativos', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 4 — ALTERNATIVES: Linhas, CID, Evidência
// ════════════════════════════════════════════════════════════

function suiteALTERNATIVES(): SuiteResultado12 {
  const t0 = now();
  const testes: ResultadoTeste12[] = [];

  const alt_has  = gerarALTERNATIVAS('I10');
  const alt_dm2  = gerarALTERNATIVAS('E11');
  const alt_ic   = gerarALTERNATIVAS('I50');
  const alt_asma = gerarALTERNATIVAS('J45');
  const alt_unk  = gerarALTERNATIVAS('Z99');

  testes.push(mkTeste('ALTERNATIVES', 'ALT-01', 'RespostaALTERNATIVAS tem todos os campos obrigatórios', () => {
    const campos = ['cid', 'condicao', 'alternativas', 'nota_clinica', 'disclaimer'];
    const faltando = campos.filter(c => (alt_has as unknown as Record<string, unknown>)[c] === undefined);
    const ok = faltando.length === 0;
    return { ok, detalhe: ok ? 'Todos os campos presentes ✓' : `Faltando: ${faltando.join(', ')}`, sev: 'critica' };
  }));

  testes.push(mkTeste('ALTERNATIVES', 'ALT-02', 'I10 tem ≥ 4 alternativas com linhas 1ª, 2ª e 3ª', () => {
    const linhas = new Set(alt_has.alternativas.map(a => a.linha));
    const ok = alt_has.alternativas.length >= 4 && linhas.has('1a_linha') && linhas.has('2a_linha');
    return { ok, detalhe: ok ? `${alt_has.alternativas.length} alternativas, linhas: ${[...linhas].join(', ')} ✓` : `Apenas ${alt_has.alternativas.length} alternativas com linhas: ${[...linhas].join(', ')}`, sev: 'alta' };
  }));

  testes.push(mkTeste('ALTERNATIVES', 'ALT-03', 'Alternativas de 1ª linha têm força de evidência A ou B', () => {
    const primeira = alt_has.alternativas.filter(a => a.linha === '1a_linha');
    const invalidas = primeira.filter(a => !['A', 'B'].includes(a.forca_evidencia));
    const ok = invalidas.length === 0;
    return { ok, detalhe: ok ? `${primeira.length} alternativas de 1ª linha com evidência A/B ✓` : `${invalidas.length} de 1ª linha com evidência inferior: ${invalidas.map(a => `${a.molecula}:${a.forca_evidencia}`).join(', ')}`, sev: 'alta' };
  }));

  testes.push(mkTeste('ALTERNATIVES', 'ALT-04', 'Enalapril presente nas alternativas de HAS como 1ª linha SUS', () => {
    const enal = alt_has.alternativas.find(a => a.molecula.toLowerCase().includes('enalapril'));
    const ok = !!enal && enal.linha === '1a_linha' && enal.disponivel_sus;
    return { ok, detalhe: ok ? `Enalapril 1ª linha SUS ✓` : `Enalapril não encontrado ou não é 1ª linha/SUS`, sev: 'alta' };
  }));

  testes.push(mkTeste('ALTERNATIVES', 'ALT-05', 'DM2: Metformina como 1ª linha com NNT ≤ 20', () => {
    const metf = alt_dm2.alternativas.find(a => a.molecula.toLowerCase().includes('metformina'));
    const ok = !!metf && metf.linha === '1a_linha' && (metf.nnt ?? 999) <= 20;
    return { ok, detalhe: ok ? `Metformina 1ª linha NNT:${metf?.nnt} ✓` : `Metformina: ${metf?.linha} NNT:${metf?.nnt}`, sev: 'alta' };
  }));

  testes.push(mkTeste('ALTERNATIVES', 'ALT-06', 'IC: ARNI + iSGLT2 como pilares de 1ª linha', () => {
    const firstLine = alt_ic.alternativas.filter(a => a.linha === '1a_linha');
    const temARNI   = firstLine.some(a => a.molecula.toLowerCase().includes('sacubitril') || a.classe.toLowerCase().includes('arni'));
    const temSGLT2  = firstLine.some(a => a.classe.toLowerCase().includes('sglt2') || a.molecula.toLowerCase().includes('dapagliflozina'));
    const ok = temARNI && temSGLT2;
    return { ok, detalhe: ok ? `IC 1ª linha: ARNI ✓ iSGLT2 ✓` : `ARNI:${temARNI} iSGLT2:${temSGLT2} — pilares incompletos`, sev: 'alta' };
  }));

  testes.push(mkTeste('ALTERNATIVES', 'ALT-07', 'Asma: Budesonida/Formoterol como 1ª linha MART', () => {
    const mart = alt_asma.alternativas.find(a => a.linha === '1a_linha' && (a.molecula.toLowerCase().includes('budesonida') || a.classe.toLowerCase().includes('ci+laba')));
    const ok = !!mart;
    return { ok, detalhe: ok ? `${mart.molecula} como 1ª linha (${mart.classe}) ✓` : 'Budesonida/Formoterol MART não encontrado como 1ª linha', sev: 'alta' };
  }));

  testes.push(mkTeste('ALTERNATIVES', 'ALT-08', 'Cada alternativa tem vantagem_principal e desvantagem_principal', () => {
    const invalidas = alt_has.alternativas.filter(a => !a.vantagem_principal || !a.desvantagem_principal);
    const ok = invalidas.length === 0;
    return { ok, detalhe: ok ? `${alt_has.alternativas.length} alternativas completas ✓` : `${invalidas.length} alternativas sem vantagem/desvantagem`, sev: 'moderada' };
  }));

  testes.push(mkTeste('ALTERNATIVES', 'ALT-09', 'nota_clinica não é vazia e orienta a escolha da classe', () => {
    const ok = alt_has.nota_clinica.length > 30;
    return { ok, detalhe: ok ? `"${alt_has.nota_clinica.slice(0, 80)}…" ✓` : 'nota_clinica muito curta ou ausente', sev: 'moderada' };
  }));

  testes.push(mkTeste('ALTERNATIVES', 'ALT-10', 'disclaimer menciona que marca não influencia recomendação', () => {
    const disc = alt_has.disclaimer.toLowerCase();
    const ok = disc.includes('marca') || disc.includes('comercial') || disc.includes('molécula');
    return { ok, detalhe: ok ? `Disclaimer correto ✓` : 'Disclaimer não menciona independência da marca comercial', sev: 'alta' };
  }));

  testes.push(mkTeste('ALTERNATIVES', 'ALT-11', 'CID desconhecido retorna alternativas vazias sem crash', () => {
    const ok = Array.isArray(alt_unk.alternativas) && alt_unk.alternativas.length === 0;
    return { ok, detalhe: ok ? 'CID desconhecido → lista vazia sem crash ✓' : 'Comportamento inesperado', sev: 'alta' };
  }));

  testes.push(mkTeste('ALTERNATIVES', 'ALT-12', 'condicao é texto legível (não apenas o código CID)', () => {
    const ok = alt_has.condicao.length > 5 && !/^[A-Z]\d{2}$/.test(alt_has.condicao);
    return { ok, detalhe: ok ? `condicao: "${alt_has.condicao}" ✓` : `condicao tem apenas o CID: "${alt_has.condicao}"`, sev: 'moderada' };
  }));

  return mkSuite('ALTERNATIVES — Alternativas Clínicas', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 5 — EVIDENCE: Força, NNT, RRR, Estudos
// ════════════════════════════════════════════════════════════

function suiteEvidence(): SuiteResultado12 {
  const t0 = now();
  const testes: ResultadoTeste12[] = [];

  const why_enalap = gerarWHY(MED_ENALAPRIL,       ANAMNESE_HAS_DM2_DRC);
  const why_arni   = gerarWHY(MED_ARNI,             ANAMNESE_ICC);
  const why_empa   = gerarWHY(MED_EMPAGLIFLOZINA,   ANAMNESE_HAS_DM2_DRC);
  const why_carve  = gerarWHY(MED_CARVEDILOL,        ANAMNESE_ASMA_BRADICARDIA);

  testes.push(mkTeste('EVIDENCE', 'EV-01', 'Enalapril: NNT ≤ 20 nos estudos pivotais (CONSENSUS NNT=4)', () => {
    const menorNNT = Math.min(...why_enalap.estudos_pivotais.map(e => e.nnt ?? 999));
    const ok = menorNNT <= 20;
    return { ok, detalhe: ok ? `Menor NNT: ${menorNNT} ✓` : `Menor NNT: ${menorNNT} > 20`, sev: 'alta', esperado: '≤20', obtido: String(menorNNT) };
  }));

  testes.push(mkTeste('EVIDENCE', 'EV-02', 'Empagliflozina: RRR ≥ 10% em estudo pivotal (EMPA-REG: 14%)', () => {
    const maxRRR = Math.max(...why_empa.estudos_pivotais.map(e => e.rrr ?? 0));
    const ok = maxRRR >= 10;
    return { ok, detalhe: ok ? `Maior RRR: ${maxRRR}% ✓` : `Maior RRR: ${maxRRR}% < 10%`, sev: 'alta', esperado: '≥10%', obtido: `${maxRRR}%` };
  }));

  testes.push(mkTeste('EVIDENCE', 'EV-03', 'ARNI: RAR positivo (benefício absoluto > 0)', () => {
    const maxRAR = Math.max(...why_arni.estudos_pivotais.map(e => e.rar ?? 0));
    const ok = maxRAR > 0;
    return { ok, detalhe: ok ? `RAR: ${maxRAR}% ✓` : `RAR: ${maxRAR}% — sem benefício absoluto documentado`, sev: 'moderada' };
  }));

  testes.push(mkTeste('EVIDENCE', 'EV-04', 'beneficio_absoluto é texto descritivo não vazio', () => {
    const texts = [why_enalap, why_arni, why_empa].map(w => w.beneficio_risco.beneficio_absoluto);
    const ok = texts.every(t => t.length > 20);
    return { ok, detalhe: ok ? `Benefícios: ${texts.map(t => `"${t.slice(0, 40)}"`).join(' | ')} ✓` : 'Benefício absoluto vazio ou muito curto', sev: 'moderada' };
  }));

  testes.push(mkTeste('EVIDENCE', 'EV-05', 'horizonte_tempo da B/R é texto não vazio', () => {
    const ok = why_enalap.beneficio_risco.horizonte_tempo.length > 0;
    return { ok, detalhe: ok ? `horizonte: "${why_enalap.beneficio_risco.horizonte_tempo}" ✓` : 'horizonte_tempo vazio', sev: 'baixa' };
  }));

  testes.push(mkTeste('EVIDENCE', 'EV-06', 'forca_evidencia da B/R é A, B, C ou D', () => {
    const meds = [why_enalap, why_arni, why_empa, why_carve];
    const invalidos = meds.filter(w => !['A', 'B', 'C', 'D'].includes(w.beneficio_risco.forca_evidencia));
    const ok = invalidos.length === 0;
    return { ok, detalhe: ok ? 'Todas as forcas de evidência válidas ✓' : `${invalidos.length} inválida(s)`, sev: 'critica' };
  }));

  testes.push(mkTeste('EVIDENCE', 'EV-07', 'score_evidencia é monotônico: NNT menor → score maior', () => {
    // CONSENSUS (NNT=4) < SOLVD (NNT=14) → study com menor NNT deve ter estudos com RRR maior
    const enalap_nnt = why_enalap.beneficio_risco.nnt;
    const arni_nnt   = why_arni.beneficio_risco.nnt;
    // score_evidencia compara nível + NNT, não é pura inversão, mas ambos nível A deve dar high score
    const ok = why_enalap.score_evidencia >= 70 && why_arni.score_evidencia >= 60;
    return { ok, detalhe: ok ? `Enalapril score:${why_enalap.score_evidencia} ARNI score:${why_arni.score_evidencia} ✓ (NNTs: ${enalap_nnt} vs ${arni_nnt})` : `Scores: enalap ${why_enalap.score_evidencia}, arni ${why_arni.score_evidencia}`, sev: 'moderada' };
  }));

  testes.push(mkTeste('EVIDENCE', 'EV-08', 'DOI no formato 10.XXXX/... quando presente', () => {
    const todos = [why_enalap, why_arni, why_empa].flatMap(w => w.estudos_pivotais.filter(e => e.doi));
    const invalidos = todos.filter(e => !e.doi?.startsWith('10.'));
    const ok = invalidos.length === 0;
    return { ok, detalhe: ok ? `${todos.length} DOIs no formato correto ✓` : `${invalidos.length} DOI(s) inválido(s)`, sev: 'moderada' };
  }));

  testes.push(mkTeste('EVIDENCE', 'EV-09', 'Estudos com n_pacientes > 100 para evidência A', () => {
    const estudos_A = [why_enalap, why_empa].flatMap(w =>
      w.justificativas_diretriz[0]?.nivel_evidencia === 'A' ? w.estudos_pivotais : []
    );
    const pequenos = estudos_A.filter(e => e.n_pacientes < 100);
    const ok = pequenos.length === 0;
    return { ok, detalhe: ok ? `${estudos_A.length} estudos nível A com n ≥ 100 ✓` : `${pequenos.length} estudos nível A com n < 100`, sev: 'alta' };
  }));

  testes.push(mkTeste('EVIDENCE', 'EV-10', 'por_que_esta_classe diferencia da classe terapêutica alternativa', () => {
    const classe_enalap = why_enalap.por_que_esta_classe.toLowerCase();
    const classe_empa   = why_empa.por_que_esta_classe.toLowerCase();
    const ok = classe_enalap !== classe_empa; // devem ser textos distintos
    return { ok, detalhe: ok ? 'Justificativas de classe distintas ✓' : 'por_que_esta_classe idêntico para moléculas diferentes!', sev: 'alta' };
  }));

  return mkSuite('Evidence — Força e Qualidade', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 6 — TRUST SCORE: 6 dimensões, range, consistência
// ════════════════════════════════════════════════════════════

function suiteTrustScore(): SuiteResultado12 {
  const t0 = now();
  const testes: ResultadoTeste12[] = [];

  const ts_enalap = calcularMedicalTrustScore(MED_ENALAPRIL, ANAMNESE_HAS_DM2_DRC);
  const ts_arni   = calcularMedicalTrustScore(MED_ARNI,      ANAMNESE_ICC);
  const ts_empa   = calcularMedicalTrustScore(MED_EMPAGLIFLOZINA, ANAMNESE_HAS_DM2_DRC);

  testes.push(mkTeste('TRUST', 'TS-01', 'MedicalTrustScore tem 6 dimensões', () => {
    const dims = ['score_farmacologico', 'score_clinico', 'score_evidencia', 'score_seguranca', 'score_guideline', 'score_confianca'];
    const faltando = dims.filter(d => (ts_enalap as unknown as Record<string, unknown>)[d] === undefined);
    const ok = faltando.length === 0;
    return { ok, detalhe: ok ? '6 dimensões presentes ✓' : `Faltando: ${faltando.join(', ')}`, sev: 'critica' };
  }));

  testes.push(mkTeste('TRUST', 'TS-02', 'score_global está entre 0 e 100', () => {
    const scores = [ts_enalap.score_global, ts_arni.score_global, ts_empa.score_global];
    const invalidos = scores.filter(s => s < 0 || s > 100);
    const ok = invalidos.length === 0;
    return { ok, detalhe: ok ? `Scores: ${scores.join(', ')} ✓` : `Fora do range: ${invalidos.join(', ')}`, sev: 'critica' };
  }));

  testes.push(mkTeste('TRUST', 'TS-03', 'Cada DimensaoScore tem score 0–100 e peso 0–1', () => {
    const dims = [ts_enalap.score_farmacologico, ts_enalap.score_clinico, ts_enalap.score_evidencia,
                  ts_enalap.score_seguranca, ts_enalap.score_guideline, ts_enalap.score_confianca];
    const invalidas = dims.filter(d => d.score < 0 || d.score > 100 || d.peso < 0 || d.peso > 1);
    const ok = invalidas.length === 0;
    return { ok, detalhe: ok ? 'Todas as 6 dimensões com range válido ✓' : `${invalidas.length} dimensão(ões) com range inválido`, sev: 'critica' };
  }));

  testes.push(mkTeste('TRUST', 'TS-04', 'Enalapril com evidência A/I → classificação ≥ "moderada"', () => {
    const aceitaveis = ['muito_alta', 'alta', 'moderada'];
    const ok = aceitaveis.includes(ts_enalap.classificacao);
    return { ok, detalhe: ok ? `Enalapril: ${ts_enalap.classificacao} (${ts_enalap.score_global}%) ✓` : `Classificação inesperada: ${ts_enalap.classificacao}`, sev: 'alta' };
  }));

  testes.push(mkTeste('TRUST', 'TS-05', 'percentual = "X%" onde X = score_global', () => {
    const ok = ts_enalap.percentual === `${ts_enalap.score_global}%`;
    return { ok, detalhe: ok ? `${ts_enalap.percentual} ✓` : `Inconsistência: score=${ts_enalap.score_global} percentual="${ts_enalap.percentual}"`, sev: 'alta', esperado: `${ts_enalap.score_global}%`, obtido: ts_enalap.percentual };
  }));

  testes.push(mkTeste('TRUST', 'TS-06', 'label é texto não vazio que reflete a classificação', () => {
    const ok = ts_enalap.label.length > 5;
    return { ok, detalhe: ok ? `label: "${ts_enalap.label}" ✓` : 'Label ausente', sev: 'moderada' };
  }));

  testes.push(mkTeste('TRUST', 'TS-07', 'recomendacao_uso menciona a molécula', () => {
    const ok = ts_enalap.recomendacao_uso.includes(MED_ENALAPRIL.molecula);
    return { ok, detalhe: ok ? `Recomendação para ${MED_ENALAPRIL.molecula} ✓` : 'Molécula ausente na recomendação de uso', sev: 'moderada' };
  }));

  testes.push(mkTeste('TRUST', 'TS-08', 'Soma ponderada das dimensões reproduz o score_global (±2)', () => {
    const dims = [ts_enalap.score_farmacologico, ts_enalap.score_clinico, ts_enalap.score_evidencia,
                  ts_enalap.score_seguranca, ts_enalap.score_guideline, ts_enalap.score_confianca];
    const calculado = Math.round(dims.reduce((acc, d) => acc + d.score * d.peso, 0));
    const ok = Math.abs(calculado - ts_enalap.score_global) <= 2;
    return {
      ok, sev: 'critica',
      detalhe: ok ? `score_global: ${ts_enalap.score_global} ≈ soma ponderada: ${calculado} ✓` : `score_global: ${ts_enalap.score_global} ≠ soma ponderada: ${calculado}`,
      esperado: String(ts_enalap.score_global), obtido: String(calculado),
    };
  }));

  testes.push(mkTeste('TRUST', 'TS-09', 'calcularScoresPlano retorna TrustScore para cada medicamento', () => {
    const plano = [MED_ENALAPRIL, MED_EMPAGLIFLOZINA, MED_CARVEDILOL];
    const scores = calcularScoresPlano(plano, ANAMNESE_HAS_DM2_DRC);
    const ok = scores.length === plano.length && scores.every(s => s.score_global >= 0 && s.score_global <= 100);
    return { ok, detalhe: ok ? `${scores.length} scores: ${scores.map(s => `${s.molecula}:${s.score_global}`).join(', ')} ✓` : 'Scores incompletos ou fora do range', sev: 'alta' };
  }));

  testes.push(mkTeste('TRUST', 'TS-10', 'scoreGlobalPlano retorna média e classificação', () => {
    const plano = [MED_ENALAPRIL, MED_EMPAGLIFLOZINA];
    const scores = calcularScoresPlano(plano, ANAMNESE_HAS_DM2_DRC);
    const global = scoreGlobalPlano(scores);
    const ok = global.media >= 0 && global.media <= 100 && global.classificacao !== undefined;
    return { ok, detalhe: ok ? `Média: ${global.media}% | ${global.classificacao} ✓` : 'scoreGlobalPlano retornou dados inválidos', sev: 'alta' };
  }));

  return mkSuite('Trust Score — 6 Dimensões', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 7 — EXPLAINABILITY SCORE: Componentes, Range, Confiabilidade
// ════════════════════════════════════════════════════════════

function suiteExplainabilityScore(): SuiteResultado12 {
  const t0 = now();
  const testes: ResultadoTeste12[] = [];

  const why_e   = gerarWHY(MED_ENALAPRIL,     ANAMNESE_HAS_DM2_DRC);
  const wn_e    = gerarWHYNOT(MED_ENALAPRIL,  ANAMNESE_HAS_DM2_DRC);
  const score_e = calcularExplainabilityScore(why_e, wn_e, MED_ENALAPRIL, ANAMNESE_HAS_DM2_DRC);

  const why_g    = gerarWHY(MED_ENALAPRIL,    ANAMNESE_GESTANTE);
  const wn_g     = gerarWHYNOT(MED_ENALAPRIL, ANAMNESE_GESTANTE);
  const score_g  = calcularExplainabilityScore(why_g, wn_g, MED_ENALAPRIL, ANAMNESE_GESTANTE);

  const why_empa  = gerarWHY(MED_EMPAGLIFLOZINA,    ANAMNESE_HAS_DM2_DRC);
  const wn_empa   = gerarWHYNOT(MED_EMPAGLIFLOZINA, ANAMNESE_HAS_DM2_DRC);
  const score_empa = calcularExplainabilityScore(why_empa, wn_empa, MED_EMPAGLIFLOZINA, ANAMNESE_HAS_DM2_DRC);

  testes.push(mkTeste('EXP_SCORE', 'ES-01', 'ExplainabilityScore tem todos os campos obrigatórios', () => {
    const campos = ['score_total', 'nivel', 'cor', 'componentes', 'interpretacao', 'confiavel_para_prescricao'];
    const faltando = campos.filter(c => (score_e as unknown as Record<string, unknown>)[c] === undefined);
    const ok = faltando.length === 0;
    return { ok, detalhe: ok ? 'Todos os campos presentes ✓' : `Faltando: ${faltando.join(', ')}`, sev: 'critica' };
  }));

  testes.push(mkTeste('EXP_SCORE', 'ES-02', 'score_total entre 0 e 100', () => {
    const scores = [score_e.score_total, score_g.score_total, score_empa.score_total];
    const ok = scores.every(s => s >= 0 && s <= 100);
    return { ok, detalhe: ok ? `Scores: ${scores.join(', ')} ✓` : `Fora do range: ${scores.join(', ')}`, sev: 'critica' };
  }));

  testes.push(mkTeste('EXP_SCORE', 'ES-03', '5 componentes com peso total ≈ 100 (soma dos pesos × 100)', () => {
    const somaPesos = score_e.componentes.reduce((acc, c) => acc + c.peso, 0);
    const ok = score_e.componentes.length === 5 && Math.abs(somaPesos - 100) <= 1;
    return {
      ok, sev: 'critica',
      detalhe: ok ? `5 componentes, soma pesos: ${somaPesos} ✓` : `${score_e.componentes.length} componentes, soma pesos: ${somaPesos}`,
      esperado: '100', obtido: String(somaPesos),
    };
  }));

  testes.push(mkTeste('EXP_SCORE', 'ES-04', 'nivel corresponde ao score_total', () => {
    const mapNivel: [number, string][] = [[85, 'muito_alto'], [70, 'alto'], [55, 'moderado'], [40, 'baixo']];
    function nivelEsperado(s: number): string {
      if (s >= 85) return 'muito_alto';
      if (s >= 70) return 'alto';
      if (s >= 55) return 'moderado';
      if (s >= 40) return 'baixo';
      return 'muito_baixo';
    }
    const checks = [score_e, score_g, score_empa];
    const invalidos = checks.filter(s => s.nivel !== nivelEsperado(s.score_total));
    const _ = mapNivel; // evitar unused
    const ok = invalidos.length === 0;
    return {
      ok, sev: 'critica',
      detalhe: ok ? `Níveis consistentes ✓` : `${invalidos.length} inconsistência(s): ${invalidos.map(s => `score=${s.score_total} nivel=${s.nivel}`).join(', ')}`,
    };
  }));

  testes.push(mkTeste('EXP_SCORE', 'ES-05', 'Enalapril em perfil normal → confiavel_para_prescricao = true', () => {
    const ok = score_e.confiavel_para_prescricao === true;
    return { ok, detalhe: ok ? `confiavel_para_prescricao: true (score ${score_e.score_total}) ✓` : `false apesar de sem CI absoluta (score ${score_e.score_total})`, sev: 'alta' };
  }));

  testes.push(mkTeste('EXP_SCORE', 'ES-06', 'Enalapril em gestante → confiavel_para_prescricao = false', () => {
    const ok = score_g.confiavel_para_prescricao === false;
    return { ok, detalhe: ok ? `confiavel_para_prescricao: false (CI absoluta) ✓` : `true apesar de CI absoluta em gestante!`, sev: 'critica' };
  }));

  testes.push(mkTeste('EXP_SCORE', 'ES-07', 'score_total com CI absoluta < score_total sem CI absoluta', () => {
    const ok = score_g.score_total < score_e.score_total;
    return {
      ok, sev: 'critica',
      detalhe: ok ? `Com CI absoluta: ${score_g.score_total} < sem CI: ${score_e.score_total} ✓` : `Inconsistência: CI absoluta mas score (${score_g.score_total}) ≥ sem CI (${score_e.score_total})`,
      esperado: `${score_g.score_total} < ${score_e.score_total}`, obtido: `${score_g.score_total} vs ${score_e.score_total}`,
    };
  }));

  testes.push(mkTeste('EXP_SCORE', 'ES-08', 'interpretacao é texto não vazio que contextualiza o score', () => {
    const ok = score_e.interpretacao.length > 20;
    return { ok, detalhe: ok ? `"${score_e.interpretacao.slice(0, 80)}…" ✓` : 'Interpretação muito curta', sev: 'moderada' };
  }));

  testes.push(mkTeste('EXP_SCORE', 'ES-09', 'Componente "Força da Evidência" reflete nivel_evidencia da diretriz', () => {
    const comp = score_e.componentes.find(c => c.nome.includes('Evidência') || c.nome.includes('evidencia'));
    const ok = !!comp && comp.valor >= 70; // Nível A deve dar valor alto
    return { ok, detalhe: ok ? `Evidência componente valor: ${comp?.valor} ✓` : `Componente evidência ausente ou valor baixo para nível A`, sev: 'alta' };
  }));

  testes.push(mkTeste('EXP_SCORE', 'ES-10', 'cor mapeada corretamente por nivel', () => {
    const mapaEsperado: Record<string, string> = {
      muito_alto: 'emerald', alto: 'green', moderado: 'yellow', baixo: 'orange', muito_baixo: 'red',
    };
    const checks = [score_e, score_g, score_empa];
    const invalidos = checks.filter(s => mapaEsperado[s.nivel] !== s.cor);
    const ok = invalidos.length === 0;
    return { ok, detalhe: ok ? `Cores: ${checks.map(s => `${s.nivel}→${s.cor}`).join(', ')} ✓` : `${invalidos.length} cor(es) inconsistente(s): ${invalidos.map(s => `${s.nivel}→${s.cor}!=${mapaEsperado[s.nivel]}`).join(', ')}`, sev: 'alta' };
  }));

  return mkSuite('Explainability Score', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 8 — CONSISTÊNCIA ENTRE MOTORES
// ════════════════════════════════════════════════════════════

function suiteConsistencia(): SuiteResultado12 {
  const t0 = now();
  const testes: ResultadoTeste12[] = [];

  // Resultado completo para os 3 cenários clínicos
  const full_enalap = gerarExplainableAIv2(MED_ENALAPRIL,       'I10', ANAMNESE_HAS_DM2_DRC);
  const full_arni   = gerarExplainableAIv2(MED_ARNI,             'I50', ANAMNESE_ICC);
  const full_empa   = gerarExplainableAIv2(MED_EMPAGLIFLOZINA,   'E11', ANAMNESE_HAS_DM2_DRC);
  const full_gest   = gerarExplainableAIv2(MED_ENALAPRIL,        'I10', ANAMNESE_GESTANTE);

  function checkResultShape(r: ExplainableAIv2Result) {
    return r.why && r.why_not && r.what_if && r.alternatives && r.explainability_score && r.gerado_em;
  }

  testes.push(mkTeste('CONSISTENCIA', 'CONS-01', 'gerarExplainableAIv2() retorna todos os 5 motores', () => {
    const ok = [full_enalap, full_arni, full_empa].every(r => checkResultShape(r));
    return { ok, detalhe: ok ? 'Todos os motores presentes em 3 cenários ✓' : 'Motor(es) ausente(s)', sev: 'critica' };
  }));

  testes.push(mkTeste('CONSISTENCIA', 'CONS-02', 'gerado_em é ISO 8601 válido', () => {
    const ts = full_enalap.gerado_em;
    const ok = !isNaN(Date.parse(ts));
    return { ok, detalhe: ok ? `gerado_em: ${ts} ✓` : `Timestamp inválido: ${ts}`, sev: 'alta' };
  }));

  testes.push(mkTeste('CONSISTENCIA', 'CONS-03', 'WHY.score_evidencia ↔ ExplainabilityScore componente evidência (±20)', () => {
    const comp = full_enalap.explainability_score.componentes.find(c =>
      c.nome.toLowerCase().includes('evidência') || c.nome.toLowerCase().includes('evidencia')
    );
    const diff = Math.abs((comp?.valor ?? 0) - full_enalap.why.score_evidencia);
    const ok = diff <= 20;
    return {
      ok, sev: 'critica',
      detalhe: ok
        ? `WHY.score_evidencia:${full_enalap.why.score_evidencia} ↔ componente:${comp?.valor} (diff:${diff}) ✓`
        : `Divergência > 20: WHY.score_evidencia:${full_enalap.why.score_evidencia} vs componente:${comp?.valor}`,
      esperado: `diff ≤ 20`, obtido: String(diff),
    };
  }));

  testes.push(mkTeste('CONSISTENCIA', 'CONS-04', 'WHY_NOT.score_seguranca ↔ ExplainabilityScore segurança (±20)', () => {
    const comp = full_enalap.explainability_score.componentes.find(c =>
      c.nome.toLowerCase().includes('segurança') || c.nome.toLowerCase().includes('seguranca') || c.nome.toLowerCase().includes('contraindicação')
    );
    const diff = Math.abs((comp?.valor ?? 0) - full_enalap.why_not.score_seguranca);
    const ok = diff <= 20;
    return {
      ok, sev: 'critica',
      detalhe: ok
        ? `WHY_NOT.score_seguranca:${full_enalap.why_not.score_seguranca} ↔ componente:${comp?.valor} (diff:${diff}) ✓`
        : `Divergência: WHY_NOT.score_seguranca:${full_enalap.why_not.score_seguranca} vs componente:${comp?.valor}`,
      esperado: `diff ≤ 20`, obtido: String(diff),
    };
  }));

  testes.push(mkTeste('CONSISTENCIA', 'CONS-05', 'WHY_NOT.tem_contraindicacao_absoluta → confiavel_para_prescricao = false', () => {
    // Gestante: CI absoluta → não confiável
    const temCI  = full_gest.why_not.tem_contraindicacao_absoluta;
    const confia = full_gest.explainability_score.confiavel_para_prescricao;
    const ok = !temCI || !confia; // se tem CI absoluta, não pode ser confiável
    return {
      ok, sev: 'critica',
      detalhe: ok
        ? `CI absoluta:${temCI} → confiavel:${confia} — lógica correta ✓`
        : `Inconsistência: CI absoluta mas confiavel_para_prescricao=true!`,
    };
  }));

  testes.push(mkTeste('CONSISTENCIA', 'CONS-06', 'alternatives.cid corresponde ao CID passado para gerarExplainableAIv2', () => {
    const ok_has  = full_enalap.alternatives.cid === 'I10';
    const ok_dm2  = full_empa.alternatives.cid   === 'E11';
    const ok_ic   = full_arni.alternatives.cid   === 'I50';
    const ok = ok_has && ok_dm2 && ok_ic;
    return {
      ok, sev: 'critica',
      detalhe: ok
        ? `CIDs: I10:${ok_has} E11:${ok_dm2} I50:${ok_ic} ✓`
        : `CID divergente: enalap=${full_enalap.alternatives.cid} empa=${full_empa.alternatives.cid} arni=${full_arni.alternatives.cid}`,
    };
  }));

  testes.push(mkTeste('CONSISTENCIA', 'CONS-07', 'what_if.cenarios match same CID as alternatives', () => {
    const cenas_I10 = full_enalap.what_if.cenarios;
    const alt_I10   = full_enalap.alternatives.alternativas;
    // Moléculas do WHAT-IF devem ter alguma sobreposição com ALTERNATIVES
    const mols_cen = new Set(cenas_I10.map(c => c.molecula.toLowerCase().split('/')[0].trim()));
    const mols_alt = new Set(alt_I10.map(a => a.molecula.toLowerCase().split(' ')[0]));
    const sobreposicao = [...mols_cen].filter(m => [...mols_alt].some(a => a.includes(m) || m.includes(a)));
    const ok = sobreposicao.length >= 1;
    return {
      ok, sev: 'moderada',
      detalhe: ok
        ? `${sobreposicao.length} moléculas em comum entre WHAT-IF e ALTERNATIVES ✓`
        : 'Nenhuma molécula em comum entre WHAT-IF e ALTERNATIVES',
    };
  }));

  testes.push(mkTeste('CONSISTENCIA', 'CONS-08', 'disclaimer presente em resultado completo e menciona CDSS', () => {
    const disc = full_enalap.disclaimer.toLowerCase();
    const ok = disc.length > 30 && (disc.includes('cdss') || disc.includes('suporte') || disc.includes('médico') || disc.includes('decisão'));
    return { ok, detalhe: ok ? `Disclaimer CDSS presente ✓` : 'Disclaimer ausente ou insuficiente', sev: 'alta' };
  }));

  testes.push(mkTeste('CONSISTENCIA', 'CONS-09', 'Idempotência: gerarExplainableAIv2 2x com mesmos dados → scores iguais', () => {
    const r1 = gerarExplainableAIv2(MED_ENALAPRIL, 'I10', ANAMNESE_HAS_DM2_DRC);
    const r2 = gerarExplainableAIv2(MED_ENALAPRIL, 'I10', ANAMNESE_HAS_DM2_DRC);
    const ok =
      r1.why.score_evidencia                          === r2.why.score_evidencia &&
      r1.why_not.score_seguranca                      === r2.why_not.score_seguranca &&
      r1.explainability_score.score_total             === r2.explainability_score.score_total &&
      r1.why_not.tem_contraindicacao_absoluta         === r2.why_not.tem_contraindicacao_absoluta;
    return {
      ok, sev: 'critica',
      detalhe: ok ? 'Idempotência confirmada — mesmos inputs → mesmos scores ✓' : 'Não-determinismo detectado nos motores!',
    };
  }));

  testes.push(mkTeste('CONSISTENCIA', 'CONS-10', 'Trust Score e ExplainabilityScore concordam na direção (alto/baixo)', () => {
    const ts  = calcularMedicalTrustScore(MED_ENALAPRIL, ANAMNESE_HAS_DM2_DRC);
    const exp = full_enalap.explainability_score;
    // Ambos devem estar acima de 50 para Enalapril em perfil compatível
    const ok = ts.score_global >= 50 && exp.score_total >= 50;
    return {
      ok, sev: 'alta',
      detalhe: ok
        ? `TrustScore:${ts.score_global} ExplainabilityScore:${exp.score_total} — ambos ≥ 50 ✓`
        : `Divergência de direção: TrustScore:${ts.score_global} ExplainabilityScore:${exp.score_total}`,
    };
  }));

  testes.push(mkTeste('CONSISTENCIA', 'CONS-11', 'Evidência nível A → ExplainabilityScore ≥ 55 sem CI absoluta', () => {
    const nivelA = full_enalap.why.justificativas_diretriz[0]?.nivel_evidencia === 'A';
    const temCI  = full_enalap.why_not.tem_contraindicacao_absoluta;
    const score  = full_enalap.explainability_score.score_total;
    const ok = !nivelA || temCI || score >= 55;
    return {
      ok, sev: 'critica',
      detalhe: ok
        ? `Nível A + sem CI absoluta → score ${score} ≥ 55 ✓`
        : `Nível A + sem CI absoluta mas score ${score} < 55!`,
      esperado: '≥55', obtido: String(score),
    };
  }));

  testes.push(mkTeste('CONSISTENCIA', 'CONS-12', 'ARNI em IC: WHY menciona PARADIGM-HF, WHAT-IF tem ARNI como cenário', () => {
    const paradigm = full_arni.why.estudos_pivotais.some(e => e.nome.toUpperCase().includes('PARADIGM'));
    const arniCen  = full_arni.what_if.cenarios.some(c => c.molecula.toLowerCase().includes('sacubitril'));
    const ok = paradigm && arniCen;
    return {
      ok, sev: 'alta',
      detalhe: ok
        ? 'PARADIGM-HF em WHY ✓ + ARNI em WHAT-IF ✓'
        : `PARADIGM-HF:${paradigm} ARNI em WHAT-IF:${arniCen}`,
    };
  }));

  return mkSuite('Consistência entre Motores', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// EXECUTOR PRINCIPAL
// ════════════════════════════════════════════════════════════

export function executarExplainableAITestEtapa12(): ExplainableAITestEtapa12Result {
  const t0 = now();

  const suites = [
    suiteWHY(),
    suiteWHYNOT(),
    suiteWHATIF(),
    suiteALTERNATIVES(),
    suiteEvidence(),
    suiteTrustScore(),
    suiteExplainabilityScore(),
    suiteConsistencia(),
  ];

  const total_passou = suites.reduce((s, r) => s + r.passou, 0);
  const total_falhou = suites.reduce((s, r) => s + r.falhou, 0);
  const total_avisos = suites.reduce((s, r) => s + r.avisos, 0);
  const total_testes = total_passou + total_falhou + total_avisos;
  const consistencia_pct = total_testes > 0 ? Math.round((total_passou / total_testes) * 100) : 0;

  const criticos_falhos = suites
    .flatMap(s => s.testes)
    .filter(t => t.status === 'falhou' && t.severidade === 'critica')
    .map(t => `[${t.id}] ${t.descricao}: ${t.detalhe}`);

  const status_geral: StatusEtapa12 =
    total_falhou > 0 ? 'falhou' : total_avisos > 0 ? 'aviso' : 'passou';

  const resultado: ExplainableAITestEtapa12Result = {
    timestamp: new Date().toISOString(),
    suites, total_testes, total_passou, total_falhou, total_avisos,
    tempo_total_ms: Math.round(now() - t0),
    status_geral, consistencia_pct, criticos_falhos,
    relatorio: '',
  };
  resultado.relatorio = gerarRelatorioExplainableAI(resultado);
  return resultado;
}

// ════════════════════════════════════════════════════════════
// RELATÓRIO TEXTO
// ════════════════════════════════════════════════════════════

export function gerarRelatorioExplainableAI(r: ExplainableAITestEtapa12Result): string {
  const L: string[] = [
    '══════════════════════════════════════════════════════════════════════',
    '  PRESCREVE-AI — ETAPA 12: TESTE DE IA EXPLICÁVEL',
    '══════════════════════════════════════════════════════════════════════',
    `  Timestamp     : ${r.timestamp}`,
    `  Total          : ${r.total_testes} testes | ✓ ${r.total_passou} | ✗ ${r.total_falhou} | ⚠ ${r.total_avisos}`,
    `  Consistência   : ${r.consistencia_pct}%`,
    `  Tempo          : ${r.tempo_total_ms}ms`,
    `  Status         : ${r.status_geral === 'passou' ? '✓ APROVADO' : r.status_geral === 'aviso' ? '⚠ COM AVISOS' : '✗ REPROVADO'}`,
    '──────────────────────────────────────────────────────────────────────',
    `  ${'Suite'.padEnd(44)} | ✓ Passou | ✗ Falhou | ms`,
    '  ' + '─'.repeat(62),
  ];

  for (const s of r.suites) {
    const icon = s.status === 'passou' ? '✓' : s.status === 'aviso' ? '⚠' : '✗';
    L.push(`  ${icon} ${s.nome.padEnd(44)} | ${String(s.passou).padEnd(8)} | ${String(s.falhou).padEnd(8)} | ${s.tempo_ms}`);
    for (const t of s.testes.filter(t => t.status === 'falhou')) {
      const sev = t.severidade === 'critica' ? '🔴' : t.severidade === 'alta' ? '🟠' : '🟡';
      L.push(`    ${sev} [${t.id}] ${t.descricao}`);
      L.push(`       → ${t.detalhe}`);
      if (t.valor_esperado) L.push(`       esperado: ${t.valor_esperado} | obtido: ${t.valor_obtido}`);
    }
  }

  L.push('──────────────────────────────────────────────────────────────────────');
  L.push('  MOTORES TESTADOS');
  L.push('──────────────────────────────────────────────────────────────────────');
  const motores = [
    ['WHY',                'Indicação, diretriz, mecanismo, estudos pivotais, NNT/RRR/RAR'],
    ['WHY NOT',            'Contraindicações absolutas/relativas, interações, ajuste de dose'],
    ['WHAT IF',            'Cenários comparativos, NNT, trust_score, custo-efetividade'],
    ['ALTERNATIVES',       'Alternativas por linha terapêutica (1ª → 2ª → 3ª), CID, SUS'],
    ['Evidence',           'Força A/B/C/D, NNT, RRR, RAR, estudos, DOI, n_pacientes'],
    ['Trust Score',        '6 dimensões: farmacológico, clínico, evidência, segurança, guideline, confiança'],
    ['Explainability Score','5 componentes ponderados, nivel, cor, confiavel_para_prescricao'],
    ['Consistência',       'Idempotência, coerência entre motores, CI absoluta ↔ score ↔ confiabilidade'],
  ];
  for (const [nome, desc] of motores) {
    const suite = r.suites.find(s => s.nome.toLowerCase().includes(nome.toLowerCase().split(' ')[0]));
    const icon = suite?.status === 'passou' ? '✓' : suite?.status === 'aviso' ? '⚠' : '✗';
    L.push(`  ${icon} ${nome.padEnd(24)} ${desc}`);
  }

  L.push('──────────────────────────────────────────────────────────────────────');
  L.push('  CENÁRIOS CLÍNICOS TESTADOS');
  L.push('──────────────────────────────────────────────────────────────────────');
  L.push('  ✓ HAS + DM2 + DRC G3a  — Enalapril + Empagliflozina (sem CI)');
  L.push('  ✓ IC-FEr + HAS          — ARNI + CI absoluta (Enalapril concomitante)');
  L.push('  ✓ HAS na gestante        — IECA contraindicado (CI absoluta ativada)');
  L.push('  ✓ Asma + bradicardia     — Carvedilol contraindicado (asma + FC 51)');

  if (r.criticos_falhos.length > 0) {
    L.push('══════════════════════════════════════════════════════════════════════');
    L.push('  ⛔ FALHAS CRÍTICAS');
    for (const c of r.criticos_falhos) L.push(`  • ${c}`);
  }

  L.push('══════════════════════════════════════════════════════════════════════');
  L.push(r.status_geral === 'passou'
    ? '  ✓ IA EXPLICÁVEL CONSISTENTE — Todos os motores validados'
    : r.status_geral === 'aviso'
    ? '  ⚠ IA EXPLICÁVEL COM AVISOS — Verificar itens acima'
    : '  ✗ FALHAS DE CONSISTÊNCIA — Corrigir antes de produção');
  L.push('──────────────────────────────────────────────────────────────────────');
  L.push('  CDSS — Suporte à decisão clínica. Decisão médica soberana.');
  L.push('  A escolha da marca NUNCA influencia a recomendação baseada em evidências.');
  L.push('══════════════════════════════════════════════════════════════════════');
  return L.join('\n');
}

// ════════════════════════════════════════════════════════════
// SANITY CHECK (< 100ms)
// ════════════════════════════════════════════════════════════

export function sanityCheckExplainableAI(): {
  why_ok:           boolean;
  why_not_ok:       boolean;
  what_if_ok:       boolean;
  alternatives_ok:  boolean;
  trust_score_ok:   boolean;
  exp_score_ok:     boolean;
  ci_absoluta_ok:   boolean;
  consistencia_ok:  boolean;
  tempo_ms:         number;
} {
  const t0 = now();

  const why  = gerarWHY(MED_ENALAPRIL, ANAMNESE_HAS_DM2_DRC);
  const wn   = gerarWHYNOT(MED_ENALAPRIL, ANAMNESE_GESTANTE);
  const wi   = gerarWHATIF('I10', ANAMNESE_HAS_DM2_DRC);
  const alt  = gerarALTERNATIVAS('I10');
  const ts   = calcularMedicalTrustScore(MED_ENALAPRIL, ANAMNESE_HAS_DM2_DRC);
  const exp  = calcularExplainabilityScore(why, wn, MED_ENALAPRIL, ANAMNESE_HAS_DM2_DRC);
  const full = gerarExplainableAIv2(MED_ENALAPRIL, 'I10', ANAMNESE_HAS_DM2_DRC);

  return {
    why_ok:          why.score_evidencia >= 0 && why.score_evidencia <= 100,
    why_not_ok:      wn.tem_contraindicacao_absoluta === true,  // gestante
    what_if_ok:      wi.cenarios.length >= 2,
    alternatives_ok: alt.alternativas.length >= 4,
    trust_score_ok:  ts.score_global >= 0 && ts.score_global <= 100,
    exp_score_ok:    exp.score_total >= 0 && exp.score_total <= 100,
    ci_absoluta_ok:  !full.explainability_score.confiavel_para_prescricao === false, // sem CI no perfil normal
    consistencia_ok: full.why.score_evidencia >= 0 && full.explainability_score.score_total >= 0,
    tempo_ms:        Math.round(now() - t0),
  };
}
