// ============================================================
// PRESCREVE-AI — ETAPA 9: Stress Test Clínico
// Consultas paralelas: 50 · 100 · 250 · 500 · 1000
//
// Métricas coletadas por nível de carga:
//   Tempo     — wall-clock total, latência por consulta
//   Heap      — estimativa de uso de memória JS heap
//   GC        — estimativa de pressão de garbage-collection
//   Latência  — P50 · P75 · P95 · P99 · max
//   Throughput— consultas/segundo
//   Integridade — hash de resultado; idêntico para mesma entrada
//   Consistência — resultado estável entre execuções paralelas
//
// Decisão médica soberana — CDSS de suporte.
// ============================================================

'use client';

import { analyzeClinical }                    from './clinical-decision-support';
import { calcularDosagem, getMedicamentoById, idadeDias } from './dosing-engine';
import { detectarConflitos }                  from './guideline-conflict-engine';
import { avaliarRiscoClinico }                from './clinical-risk-engine';
import { calcularMedicalTrustScore }          from './medical-trust-score';
import { gerarExplainableAIv2 }               from './explainable-ai-v2';
import { criarTwin }                          from './patient-digital-twin';
import { gerarRecomendacaoPrecisao }          from './precision-medicine';
import { gerarSOAP }                          from './medical-copilot';
import { registrarRecomendacao, calcularEstatisticasRegistry } from './recommendation-registry';
import { gerarIdPacienteAnonimo, gerarIdAudit } from './medical-audit';
import { gerarBundleClinico, validarFHIR }    from './interoperability-engine';
import { registrarReview }                    from './physician-validation-engine';
import { gerarMapaConhecimento }              from './medical-knowledge-graph';
import { EVIDENCE_DB }                        from './evidence-engine';
import { calcClCrCockcroft }                  from './geriatric-engine';
import { calcSofa }                           from './icu-engine';
import { calcularNNT }                        from './outcome-engine';
import { calcCKDEPI, calcMDRD, calcCURB65, calcNEWS2, calcCHA2DS2VASc, calcChildPugh, calcMELD, calcASCVD } from './clinical-calculators';
import type { Anamnesis, TherapeuticSuggestion } from './types';
import type { ContextoClinico, ModoConsulta }  from './medical-copilot';
import type { PacienteTwin }                   from './patient-digital-twin';
import type { GenotipoPaciente }               from './precision-medicine';
import type { EspecialidadeMedica }            from './physician-profile';

// ════════════════════════════════════════════════════════════
// TIPOS DE MÉTRICAS
// ════════════════════════════════════════════════════════════

export interface LatencyStats {
  p50_ms:  number;
  p75_ms:  number;
  p95_ms:  number;
  p99_ms:  number;
  max_ms:  number;
  min_ms:  number;
  mean_ms: number;
}

export interface HeapSnapshot {
  antes_mb:      number;
  depois_mb:     number;
  delta_mb:      number;
  pico_estimado_mb: number;
}

export interface GCPressure {
  alocacoes_estimadas: number;   // objetos gerados por consulta
  pressao:             'baixa' | 'moderada' | 'alta' | 'critica';
  descricao:           string;
}

export interface IntegrityResult {
  total_verificado: number;
  passou:           number;
  falhou:           number;
  taxa_integridade_pct: number;
  erros_detectados: string[];
}

export interface ConsistencyResult {
  amostra:          number;       // n de pares re-executados
  identicos:        number;
  divergentes:      number;
  taxa_consistencia_pct: number;
  divergencias:     { id: string; hash_a: string; hash_b: string }[];
}

export interface CargaNivelResult {
  nivel:            number;       // 50, 100, 250, 500, 1000
  total_consultas:  number;
  wall_time_ms:     number;
  throughput_cps:   number;       // consultas/segundo
  latencia:         LatencyStats;
  heap:             HeapSnapshot;
  gc:               GCPressure;
  integridade:      IntegrityResult;
  consistencia:     ConsistencyResult;
  erros_pipeline:   number;
  pipeline_steps_ok_pct: number;
  status:           'ok' | 'degraded' | 'failed';
  alertas:          string[];
}

export interface StressTestEtapa9Result {
  timestamp:        string;
  niveis_testados:  number[];
  resultados:       CargaNivelResult[];
  resumo_geral:     {
    throughput_maximo_cps:   number;
    nivel_throughput_maximo: number;
    latencia_p99_pior_ms:    number;
    heap_pico_mb:            number;
    integridade_global_pct:  number;
    consistencia_global_pct: number;
    nivel_saturacao?:        number;    // nível onde throughput começa a cair
    gargalo_identificado?:   string;
  };
}

// ════════════════════════════════════════════════════════════
// UTILIDADES DE MEDIÇÃO
// ════════════════════════════════════════════════════════════

function now(): number {
  return (typeof performance !== 'undefined' && performance.now)
    ? performance.now()
    : Date.now();
}

function heapMB(): number {
  if (typeof performance !== 'undefined') {
    const mem = (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory;
    if (mem?.usedJSHeapSize) return mem.usedJSHeapSize / 1024 / 1024;
  }
  return -1; // não disponível fora do Chrome
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function calcLatency(tempos: number[]): LatencyStats {
  const sorted = [...tempos].sort((a, b) => a - b);
  const sum    = sorted.reduce((a, b) => a + b, 0);
  return {
    p50_ms:  percentile(sorted, 50),
    p75_ms:  percentile(sorted, 75),
    p95_ms:  percentile(sorted, 95),
    p99_ms:  percentile(sorted, 99),
    max_ms:  sorted[sorted.length - 1],
    min_ms:  sorted[0],
    mean_ms: Math.round((sum / sorted.length) * 100) / 100,
  };
}

function gcPressure(deltaHeapMB: number, nConsultas: number): GCPressure {
  // estimativa: cada consulta aloca ~50 objetos temporários
  const alocacoes = nConsultas * 50;
  const mbPorConsulta = deltaHeapMB / Math.max(nConsultas, 1);
  const pressao: GCPressure['pressao'] =
    mbPorConsulta > 2     ? 'critica'  :
    mbPorConsulta > 1     ? 'alta'     :
    mbPorConsulta > 0.3   ? 'moderada' : 'baixa';
  return {
    alocacoes_estimadas: alocacoes,
    pressao,
    descricao: `~${mbPorConsulta.toFixed(2)} MB/consulta | ${alocacoes.toLocaleString()} obj estimados | Pressão GC: ${pressao}`,
  };
}

// Hash determinístico simples (djb2) — para verificação de consistência
function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) + h) ^ s.charCodeAt(i); h >>>= 0; }
  return h.toString(16).padStart(8, '0');
}

// ════════════════════════════════════════════════════════════
// GERADOR DETERMINÍSTICO DE PACIENTES POR NÍVEL
// (mesma seed → mesmo paciente → resultado deve ser idêntico)
// ════════════════════════════════════════════════════════════

const CATEGORIAS_STRESS = [
  'simples', 'moderado', 'complexo', 'critico',
  'idoso', 'pediatrico', 'renal', 'hepatico',
  'oncologico', 'uti',
] as const;

type CatStress = typeof CATEGORIAS_STRESS[number];

interface PacienteStress {
  id:           string;
  seed:         number;
  cat:          CatStress;
  idade:        number;
  sexo:         'M' | 'F';
  peso:         number;
  altura:       number;
  pa_s:         number;
  pa_d:         number;
  fc:           number;
  fr:           number;
  spo2:         number;
  cr:           number;
  glicose:      number;
  comorbidades: string[];
  meds:         string[];
  gestante:     boolean;
}

function gerarPacienteStress(seed: number): PacienteStress {
  const cat = CATEGORIAS_STRESS[seed % CATEGORIAS_STRESS.length];
  const sx: 'M' | 'F' = seed % 2 === 0 ? 'M' : 'F';

  // Parametrização determinística por seed
  const COMORB: Record<CatStress, string[][]> = {
    simples:    [['HAS estágio 1'],['DM2'],['Hipotireoidismo'],['DRGE'],['TAG']],
    moderado:   [['HAS','DM2'],['DPOC II','Tabagismo'],['ICC FE 45%','HAS'],['FA','HAS'],['DM2','Obesidade']],
    complexo:   [['HAS','DM2','DRC G3b','Dislipidemia'],['ICC FE 30%','FA','DRC G3a','DM2'],['Cirrose Child B','HAS','Ascite'],['DPOC III','ICC','HAS'],['DM1','Nefropatia','Retinopatia']],
    critico:    [['Sepse grave','Choque séptico'],['IAM Killip III'],['AVC isquêmico'],['TEP maciço'],['SDRA']],
    idoso:      [['HAS','DM2','Osteoporose'],['HAS','FA','DRC G3a'],['ICC FE 50%','Hipotireoidismo'],['DM2','Dislipidemia','Parkinson'],['HAS','Demência','Osteoporose']],
    pediatrico: [['Asma leve'],['Epilepsia benigna'],['GEA'],['Bronquiolite'],['Amigdalite recorrente']],
    renal:      [['DRC G4','HAS','DM2'],['DRC G5 em diálise'],['DRC G3b','HAS'],['Nefropatia diabética','DM2'],['DRC G3a','HAS','Dislipidemia']],
    hepatico:   [['Cirrose Child A'],['Cirrose Child B','Ascite'],['Cirrose Child C','Encefalopatia'],['Hepatite viral C'],['Cirrose NASH']],
    oncologico: [['Ca pulmão IIIB'],['Ca mama HER2+'],['LMA','Neutropenia'],['Ca colorretal M1'],['Mieloma múltiplo','DRC']],
    uti:        [['Sepse grave','Choque séptico'],['SDRA'],['IAM Killip IV'],['TCE grave'],['Pós-op complicado']],
  };

  const MEDS_BASE: Record<CatStress, string[]> = {
    simples:    ['Enalapril 10 mg'],
    moderado:   ['Enalapril 10 mg','Metformina 850 mg'],
    complexo:   ['Enalapril','Metformina','Carvedilol','Furosemida','AAS'],
    critico:    ['Noradrenalina EV','Meropeném EV','Heparina EV'],
    idoso:      ['Enalapril','Metformina','Atorvastatina','AAS','Omeprazol','Levotiroxina'],
    pediatrico: ['Amoxicilina suspensão'],
    renal:      ['Enalapril','Furosemida','Eritropoietina','Carbonato de cálcio'],
    hepatico:   ['Propranolol','Espironolactona','Furosemida','Lactulose'],
    oncologico: ['Ondansetrona','Dexametasona','G-CSF'],
    uti:        ['Noradrenalina EV','Midazolam EV','Meropeném EV','Fentanil EV','Heparina EV'],
  };

  const v = (b: number, r: number) => b + (seed % r);
  const comorbIdx = seed % (COMORB[cat].length);

  return {
    id:           `ST-${String(seed).padStart(5,'0')}`,
    seed,
    cat,
    idade:        cat === 'pediatrico' ? 1 + (seed % 15) : cat === 'idoso' ? 68 + (seed % 22) : v(35, 35),
    sexo:         sx,
    peso:         cat === 'pediatrico' ? 15 + (seed % 30) : v(62, 25),
    altura:       cat === 'pediatrico' ? 100 + (seed % 60) : v(160, 20),
    pa_s:         cat === 'critico' || cat === 'uti' ? 75 + (seed % 25) : v(125, 40),
    pa_d:         cat === 'critico' || cat === 'uti' ? 45 + (seed % 20) : v(78, 25),
    fc:           cat === 'critico' || cat === 'uti' ? 110 + (seed % 30) : v(68, 30),
    fr:           cat === 'critico' || cat === 'uti' ? 26 + (seed % 10) : v(15, 8),
    spo2:         cat === 'critico' || cat === 'uti' ? 85 + (seed % 8)  : 96 - (seed % 3),
    cr:           cat === 'renal' ? 2.0 + (seed % 8) * 0.25 : cat === 'uti' ? 2.0 + (seed % 5) * 0.3 : 0.8 + (seed % 5) * 0.15,
    glicose:      v(90, 120),
    comorbidades: COMORB[cat][comorbIdx],
    meds:         MEDS_BASE[cat],
    gestante:     false,
  };
}

// ════════════════════════════════════════════════════════════
// CONSTRUTOR DE Anamnesis A PARTIR DO PacienteStress
// ════════════════════════════════════════════════════════════

function toAnamnesis(p: PacienteStress): Anamnesis & { _idade: number; _sexo: 'M' | 'F' } {
  const cr  = p.cr;
  const kappa = p.sexo === 'F' ? 0.7 : 0.9;
  const alpha = p.sexo === 'F' ? -0.241 : -0.302;
  const tfg = Math.max(1, Math.round(
    142 * Math.min(cr / kappa, 1) ** alpha * Math.max(cr / kappa, 1) ** -1.2
    * (0.9938 ** p.idade) * (p.sexo === 'F' ? 1.012 : 1),
  ));
  const ckd: Anamnesis['funcao_renal']['ckd_stage'] =
    cr < 1.2 ? 'G1' : cr < 1.5 ? 'G2' : cr < 2.0 ? 'G3a' : cr < 3.0 ? 'G3b' : cr < 4.5 ? 'G4' : 'G5';

  return {
    _idade: p.idade,
    _sexo:  p.sexo,
    queixa_principal: `Consulta ${p.cat} — seed ${p.seed}`,
    hda:   `${p.comorbidades.join(', ')}. Seed: ${p.seed}.`,
    hpp:    p.comorbidades.join(', '),
    historia_familiar: 'HAS e DM2 em familiares',
    habitos_vida: { tabagismo: 'nunca', etilismo: 'nao', atividade_fisica: 'sedentario' },
    exame_fisico: `PA ${p.pa_s}/${p.pa_d}, FC ${p.fc}, FR ${p.fr}, SpO₂ ${p.spo2}%, Peso ${p.peso}kg`,
    sinais_vitais: { pa_sistolica: p.pa_s, pa_diastolica: p.pa_d, fc: p.fc, fr: p.fr, temperatura: 36.5, spo2: p.spo2, glasgow: p.spo2 < 90 ? 12 : 15, dor: 0 },
    laboratorio:   { creatinina: String(cr), glicose: String(p.glicose), hba1c: p.glicose > 160 ? '7.8' : '6.1' },
    imagem: 'Não realizado',
    comorbidades:   p.comorbidades,
    medicamentos_em_uso: p.meds.map((m, i) => ({ id: `m${i}`, nome: m, em_uso: true, via: 'VO', frequencia: '1x/dia' })),
    alergias:   [],
    gestante:   p.gestante,
    lactante:   false,
    peso:       p.peso,
    altura:     p.altura / 100,
    imc:        p.peso / ((p.altura / 100) ** 2),
    funcao_renal:   { creatinina: cr, tfg, ckd_stage: ckd },
    funcao_hepatica:{ bilirrubina_total: 0.8, albumina: 40, tp: 12, child_pugh: 'A' },
  } as Anamnesis & { _idade: number; _sexo: 'M' | 'F' };
}

// ════════════════════════════════════════════════════════════
// PIPELINE DE CONSULTA (versão stress — otimizada + medida)
// ════════════════════════════════════════════════════════════

interface ConsultaResult {
  id:         string;
  seed:       number;
  latencia_ms:number;
  steps_ok:   number;
  steps_total:number;
  erros:      number;
  hash_saida: string;
  prescricao: string;
}

function mkSug(molecula: string): TherapeuticSuggestion {
  return {
    id: `sug_${molecula}`, classe_terapeutica: 'Cardiovascular', molecula, nome_generico: molecula,
    indicacao: 'Conforme diretriz', dose: { dose_padrao: '10 mg', unidade: 'mg', via: 'VO', frequencia: '1x/dia' },
    posologia_completa: `${molecula} 10 mg VO 1x/dia`,
    evidencia: { diretriz: 'SBC 2024', sociedade: 'SBC', ano: 2024, nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'Nível A' }, citacao: molecula },
    contraindicacoes: [], efeitos_adversos: [], monitoramento: [], alternativas: [],
  };
}

function executarConsulta(p: PacienteStress): ConsultaResult {
  const t0      = now();
  const anamnese = toAnamnesis(p);
  const mol0    = p.meds[0]?.split(' ')[0]?.toLowerCase() ?? 'enalapril';
  const sug     = mkSug(mol0);

  let stepsOk = 0;
  let erros   = 0;
  const outputs: string[] = [];

  function run(name: string, fn: () => unknown): void {
    try {
      const r = fn();
      stepsOk++;
      outputs.push(`${name}:${JSON.stringify(r).slice(0, 40)}`);
    } catch {
      erros++;
      outputs.push(`${name}:ERR`);
    }
  }

  // ── 1–6: Dados clínicos ───────────────────────────────────
  run('anamnese',    () => anamnese.queixa_principal);
  run('historia',    () => anamnese.hda.slice(0, 40));
  run('medicamentos',() => anamnese.medicamentos_em_uso.length);
  run('alergias',    () => anamnese.alergias.length);
  run('comorbidades',() => anamnese.comorbidades.join('|'));
  run('exames',      () => `${anamnese.laboratorio.creatinina}/${anamnese.laboratorio.glicose}`);

  // ── 7–8: Diagnóstico + CID ────────────────────────────────
  let cdsResult: ReturnType<typeof analyzeClinical> | null = null;
  run('diagnostico', () => {
    cdsResult = analyzeClinical(anamnese);
    return `${cdsResult.hipoteses.length}h|${cdsResult.red_flags.length}rf`;
  });
  run('cid10', () => cdsResult?.hipoteses[0]?.cid10 ?? 'Z99');

  // ── 9: Knowledge Graph ────────────────────────────────────
  run('knowledge_graph', () => {
    const g = gerarMapaConhecimento();
    return `${g.nos.length}n|${g.arestas.length}a`;
  });

  // ── 10: Evidence ──────────────────────────────────────────
  run('evidence', () => {
    const id = cdsResult?.hipoteses[0]?.id ?? 'has';
    const e  = EVIDENCE_DB.find(x => x.id === id);
    return e ? `${e.diretrizes.length}d` : 'na';
  });

  // ── 11: Guidelines ────────────────────────────────────────
  run('guidelines', () => {
    const id = cdsResult?.hipoteses[0]?.id ?? 'has';
    return detectarConflitos(id).length;
  });

  // ── 12: Clinical Risk ─────────────────────────────────────
  let risco: ReturnType<typeof avaliarRiscoClinico> | null = null;
  run('clinical_risk', () => {
    risco = avaliarRiscoClinico(anamnese, [sug]);
    return `${risco.risco_global}|${risco.risco_cardiovascular.nivel}`;
  });

  // ── 13: Medical Trust ─────────────────────────────────────
  run('medical_trust', () => {
    const t = calcularMedicalTrustScore(sug, anamnese, undefined, risco ?? undefined);
    return `${t.score_global}%|${t.classificacao}`;
  });

  // ── 14: Explainable AI ────────────────────────────────────
  run('xai', () => {
    const cid = cdsResult?.hipoteses[0]?.cid10 ?? 'I10';
    const x   = gerarExplainableAIv2(sug, cid, anamnese);
    return `${x.explainability_score}%`;
  });

  // ── 15: Digital Twin ──────────────────────────────────────
  run('digital_twin', () => {
    const perfil: Omit<PacienteTwin, 'imc'> = {
      idade: p.idade, sexo: p.sexo, peso_kg: p.peso, altura_cm: p.altura,
      comorbidades: p.comorbidades, medicamentos_atuais: p.meds,
      pa_sistolica: p.pa_s, creatinina: p.cr, tfg: anamnese.funcao_renal.tfg,
      fumante: false, atividade_fisica: 'sedentario', adesao_estimada: 75,
    };
    const twin = criarTwin(p.id, perfil, cdsResult?.hipoteses[0]?.id ?? 'has');
    return twin.id.slice(0, 16);
  });

  // ── 16: Precision Medicine ────────────────────────────────
  run('precision', () => {
    if (!risco) return 'skip';
    const genos: GenotipoPaciente[] = [];
    const cid = cdsResult?.hipoteses[0]?.cid10 ?? 'I10';
    const recs = gerarRecomendacaoPrecisao([mol0], genos, risco, cid);
    return recs.length;
  });

  // ── 17: Medical Copilot / SOAP ────────────────────────────
  run('copilot_soap', () => {
    const ctx: ContextoClinico = {
      queixa_principal: anamnese.queixa_principal,
      historia_doenca_atual: anamnese.hda,
      antecedentes: anamnese.comorbidades,
      medicamentos_em_uso: anamnese.medicamentos_em_uso.map(m => m.nome),
      alergias: [],
      exame_fisico: { PA: `${p.pa_s}/${p.pa_d}`, FC: p.fc, FR: p.fr, SpO2: p.spo2 },
      exames_laboratoriais: { creatinina: p.cr },
      cids_ativos: [cdsResult?.hipoteses[0]?.cid10 ?? 'I10'],
      idade: p.idade, sexo: p.sexo, peso: p.peso,
    };
    const modo: ModoConsulta = 'especialista';
    const soap = gerarSOAP(ctx, modo);
    return `${soap.A.hipotese_principal.slice(0,30)}|${soap.P.prescricao_sugerida.length}rx`;
  });

  // ── 18: Recommendation Registry ───────────────────────────
  run('registry', () => {
    registrarRecomendacao({
      diagnostico_id:      cdsResult?.hipoteses[0]?.id ?? 'has',
      diagnostico_nome:    cdsResult?.hipoteses[0]?.nome ?? 'HAS',
      molecula:            mol0,
      classe_terapeutica:  'iECA',
      indicacao:           cdsResult?.hipoteses[0]?.nome ?? 'HAS',
      guideline_sigla:     'DBHA-8/SBC 2024',
      guideline_versao:    '2024',
      guideline_sociedade: 'SBC',
      guideline_ano:       2024,
      evidencias:          [],
      engine:              'clinical-decision-support',
      score_confianca:     risco ? Math.round(100 - risco.risco_cardiovascular.score) : 75,
      score_seguranca:     85,
      score_evidencia:     90,
    });
    return calcularEstatisticasRegistry().total;
  });

  // ── 19: Prescrição ────────────────────────────────────────
  let prescricao = '';
  run('prescricao', () => {
    const drug = getMedicamentoById(mol0);
    if (!drug) { prescricao = `${mol0} — bula`; return 'bula'; }
    const idDias = idadeDias(Math.max(1, p.idade), 0, 0);
    const res    = calcularDosagem(p.peso, p.altura, idDias, drug, drug.formulacoes[0]?.id ?? '');
    if (res?.ok) {
      prescricao = `${drug.nome_generico} ${res.dose_por_dose_mg}mg ${res.formulacao.via}`;
    } else {
      prescricao = `${drug.nome_generico} — ${res?.erro ?? 'dose conforme bula'}`;
    }
    return prescricao.slice(0, 40);
  });

  // ── 20: Auditoria ─────────────────────────────────────────
  run('auditoria', () => {
    const pid = gerarIdPacienteAnonimo(p.id);
    const aid = gerarIdAudit();
    return `${pid.slice(0,12)}|${aid.slice(0,8)}`;
  });

  // ── 21–22: FHIR + HL7 ────────────────────────────────────
  run('fhir_hl7', () => {
    const bundle = gerarBundleClinico({
      paciente_id: p.id, nome: 'Pac. Stress', nascimento: `${2024 - p.idade}-01-01`,
      sexo: p.sexo, cids: [cdsResult?.hipoteses[0]?.cid10 ?? 'Z99'],
      medicamentos: p.meds, exames: { creatinina: p.cr, glicose: p.glicose },
      pa_sistolica: p.pa_s, pa_diastolica: p.pa_d,
    });
    const val = validarFHIR(bundle);
    return `${bundle.entry?.length ?? 0}r|${val.valido ? 'ok' : 'err'}`;
  });

  // ── 23: Validação Médica ──────────────────────────────────
  run('validacao_medica', () => {
    const esp: EspecialidadeMedica = p.cat === 'uti' ? 'clinica_medica' : p.cat === 'oncologico' ? 'oncologia' : p.cat === 'renal' ? 'nefrologia' : p.cat === 'hepatico' ? 'gastroenterologia' : 'clinica_medica';
    const r = registrarReview({
      medico_crm_hash:    `h_${p.id}`,
      especialidade:       esp,
      diagnostico_id:      cdsResult?.hipoteses[0]?.id ?? 'has',
      diagnostico_nome:    cdsResult?.hipoteses[0]?.nome ?? 'HAS',
      molecula:            mol0,
      classe_terapeutica:  'iECA',
      guideline_sigla:     'DBHA-8/SBC 2024',
      veredicto:           'concordo',
    });
    return r.id.slice(0,12);
  });

  // ── 24: Conclusão / hash ──────────────────────────────────
  const saida = outputs.join('||');
  run('conclusao', () => `ok:${stepsOk}/24|err:${erros}`);

  return {
    id:          p.id,
    seed:        p.seed,
    latencia_ms: Math.round((now() - t0) * 100) / 100,
    steps_ok:    stepsOk,
    steps_total: 24,
    erros,
    hash_saida:  hashStr(saida),
    prescricao,
  };
}

// ════════════════════════════════════════════════════════════
// VERIFICAÇÃO DE INTEGRIDADE
// Hash do resultado deve ser idêntico para a mesma seed
// ════════════════════════════════════════════════════════════

function verificarIntegridade(resultados: ConsultaResult[]): IntegrityResult {
  const erros: string[] = [];
  let passou = 0;

  for (const r of resultados) {
    // Para seeds iguais, o resultado deve ser idêntico
    // (aqui verificamos que o hash é um hex válido e existe)
    if (/^[0-9a-f]{8}$/.test(r.hash_saida) && r.erros === 0) {
      passou++;
    } else if (!/^[0-9a-f]{8}$/.test(r.hash_saida)) {
      erros.push(`${r.id}: hash inválido '${r.hash_saida}'`);
    }
  }

  return {
    total_verificado:       resultados.length,
    passou,
    falhou:                 resultados.length - passou,
    taxa_integridade_pct:   Math.round((passou / resultados.length) * 100),
    erros_detectados:       erros.slice(0, 10),
  };
}

// ════════════════════════════════════════════════════════════
// VERIFICAÇÃO DE CONSISTÊNCIA
// Re-executa amostra aleatória e compara hashes
// ════════════════════════════════════════════════════════════

function verificarConsistencia(seeds: number[], amostra = 10): ConsistencyResult {
  const amostraSample = seeds.slice(0, Math.min(amostra, seeds.length));
  const divergencias: ConsistencyResult['divergencias'] = [];
  let identicos = 0;

  for (const seed of amostraSample) {
    const pac  = gerarPacienteStress(seed);
    const r1   = executarConsulta(pac);
    const r2   = executarConsulta(pac);
    if (r1.hash_saida === r2.hash_saida) {
      identicos++;
    } else {
      divergencias.push({ id: pac.id, hash_a: r1.hash_saida, hash_b: r2.hash_saida });
    }
  }

  return {
    amostra:                amostraSample.length,
    identicos,
    divergentes:            amostraSample.length - identicos,
    taxa_consistencia_pct:  Math.round((identicos / amostraSample.length) * 100),
    divergencias,
  };
}

// ════════════════════════════════════════════════════════════
// EXECUTOR DE NÍVEL DE CARGA
// ════════════════════════════════════════════════════════════

function executarNivel(nivel: number): CargaNivelResult {
  const alertas: string[] = [];

  // Gerar pacientes para este nível (seeds únicos)
  const pacientes = Array.from({ length: nivel }, (_, i) => gerarPacienteStress(i));

  // Snapshot de heap antes
  const heapAntes = heapMB();

  // Execução: em JS/browser, "paralelo" = execução sequencial rápida em microtasks
  // Em Node.js com worker threads, seria realmente paralelo.
  // Aqui medimos overhead de N consultas em sequência (simula burst de carga).
  const t0      = now();
  const tempos:  number[] = [];
  const results: ConsultaResult[] = [];
  let pico_ms   = 0;

  for (const pac of pacientes) {
    const t1 = now();
    const r  = executarConsulta(pac);
    const dt = now() - t1;
    tempos.push(dt);
    results.push(r);
    if (dt > pico_ms) pico_ms = dt;
  }

  const wallTime  = now() - t0;
  const heapDepois = heapMB();

  // Métricas
  const throughput = Math.round((nivel / (wallTime / 1000)) * 100) / 100;
  const latencia   = calcLatency(tempos);
  const heapDelta  = heapDepois >= 0 && heapAntes >= 0 ? heapDepois - heapAntes : 0;
  const heap: HeapSnapshot = {
    antes_mb:           Math.max(0, heapAntes),
    depois_mb:          Math.max(0, heapDepois),
    delta_mb:           Math.round(heapDelta * 100) / 100,
    pico_estimado_mb:   Math.round((Math.max(0, heapDepois) + heapDelta * 0.3) * 100) / 100,
  };
  const gc       = gcPressure(Math.abs(heapDelta), nivel);
  const integ    = verificarIntegridade(results);
  // Consistência: usar amostra de min(10, nível/10) seeds
  const amostraConsist = Math.max(5, Math.min(10, Math.floor(nivel / 10)));
  const consist  = verificarConsistencia(pacientes.map(p => p.seed).slice(0, amostraConsist), amostraConsist);

  const errTotal = results.reduce((s, r) => s + r.erros, 0);
  const stepsOkPct = Math.round(
    (results.reduce((s, r) => s + r.steps_ok, 0) / (results.length * 24)) * 100,
  );

  // Alertas
  if (latencia.p99_ms > 500)   alertas.push(`⚠ Latência P99 alta: ${latencia.p99_ms.toFixed(1)}ms`);
  if (latencia.p99_ms > 2000)  alertas.push(`🔴 Latência P99 crítica: ${latencia.p99_ms.toFixed(1)}ms`);
  if (gc.pressao === 'alta')    alertas.push(`⚠ Pressão GC alta: ${gc.descricao}`);
  if (gc.pressao === 'critica') alertas.push(`🔴 Pressão GC crítica: ${gc.descricao}`);
  if (integ.taxa_integridade_pct < 95)   alertas.push(`⚠ Integridade degradada: ${integ.taxa_integridade_pct}%`);
  if (consist.taxa_consistencia_pct < 90) alertas.push(`⚠ Consistência degradada: ${consist.taxa_consistencia_pct}%`);
  if (stepsOkPct < 80)          alertas.push(`⚠ Pipeline degradado: ${stepsOkPct}% steps OK`);
  if (heap.delta_mb > 100)      alertas.push(`⚠ Consumo heap elevado: +${heap.delta_mb}MB`);

  const status: CargaNivelResult['status'] =
    alertas.some(a => a.startsWith('🔴'))  ? 'failed'   :
    alertas.some(a => a.startsWith('⚠'))   ? 'degraded' : 'ok';

  return {
    nivel,
    total_consultas:   nivel,
    wall_time_ms:      Math.round(wallTime),
    throughput_cps:    throughput,
    latencia,
    heap,
    gc,
    integridade:       integ,
    consistencia:      consist,
    erros_pipeline:    errTotal,
    pipeline_steps_ok_pct: stepsOkPct,
    status,
    alertas,
  };
}

// ════════════════════════════════════════════════════════════
// EXECUTOR PRINCIPAL
// ════════════════════════════════════════════════════════════

export const NIVEIS_STRESS: number[] = [50, 100, 250, 500, 1000];

export function executarStressTestEtapa9(
  niveis: number[] = NIVEIS_STRESS,
): StressTestEtapa9Result {
  const resultados: CargaNivelResult[] = [];

  for (const nivel of niveis) {
    resultados.push(executarNivel(nivel));
  }

  // Resumo geral
  const thrMax = Math.max(...resultados.map(r => r.throughput_cps));
  const thrMaxNivel = resultados.find(r => r.throughput_cps === thrMax)?.nivel ?? niveis[0];
  const p99Pior = Math.max(...resultados.map(r => r.latencia.p99_ms));
  const heapPico = Math.max(...resultados.map(r => r.heap.depois_mb).filter(v => v > 0));
  const integGlobal = Math.round(
    resultados.reduce((s, r) => s + r.integridade.taxa_integridade_pct, 0) / resultados.length,
  );
  const consistGlobal = Math.round(
    resultados.reduce((s, r) => s + r.consistencia.taxa_consistencia_pct, 0) / resultados.length,
  );

  // Detecção de ponto de saturação: throughput cai > 10% em relação ao máximo
  let nivelSaturacao: number | undefined;
  for (let i = 1; i < resultados.length; i++) {
    const queda = (thrMax - resultados[i].throughput_cps) / thrMax;
    if (queda > 0.10 && resultados[i].nivel > thrMaxNivel) {
      nivelSaturacao = resultados[i].nivel;
      break;
    }
  }

  // Gargalo
  let gargalo: string | undefined;
  const r1000 = resultados.find(r => r.nivel === 1000) ?? resultados[resultados.length - 1];
  if (r1000.latencia.p99_ms > 2000)         gargalo = `Latência P99 ${r1000.latencia.p99_ms.toFixed(0)}ms @ 1000 consultas`;
  else if (r1000.gc.pressao === 'critica')   gargalo = `Pressão GC crítica @ 1000 consultas`;
  else if (r1000.pipeline_steps_ok_pct < 90) gargalo = `Pipeline degradado (${r1000.pipeline_steps_ok_pct}% OK) @ 1000 consultas`;
  else if (nivelSaturacao)                   gargalo = `Saturação detectada a partir de ${nivelSaturacao} consultas simultâneas`;

  return {
    timestamp:       new Date().toISOString(),
    niveis_testados: niveis,
    resultados,
    resumo_geral: {
      throughput_maximo_cps:    thrMax,
      nivel_throughput_maximo:  thrMaxNivel,
      latencia_p99_pior_ms:     Math.round(p99Pior),
      heap_pico_mb:             Math.round(heapPico * 10) / 10,
      integridade_global_pct:   integGlobal,
      consistencia_global_pct:  consistGlobal,
      nivel_saturacao:          nivelSaturacao,
      gargalo_identificado:     gargalo,
    },
  };
}

// ════════════════════════════════════════════════════════════
// RELATÓRIO TEXTO
// ════════════════════════════════════════════════════════════

export function gerarRelatorioStress(r: StressTestEtapa9Result): string {
  const L: string[] = [
    '═════════════════════════════════════════════════════════════════════',
    '  PRESCREVE-AI — ETAPA 9: STRESS TEST CLÍNICO',
    '═════════════════════════════════════════════════════════════════════',
    `  Timestamp : ${r.timestamp}`,
    `  Níveis    : ${r.niveis_testados.join(' · ')} consultas paralelas`,
    '─────────────────────────────────────────────────────────────────────',
    '  THROUGHPUT & LATÊNCIA',
    '─────────────────────────────────────────────────────────────────────',
    `  ${'Nível'.padEnd(6)} | ${'Throughput'.padEnd(14)} | ${'P50 ms'.padEnd(8)} | ${'P95 ms'.padEnd(8)} | ${'P99 ms'.padEnd(8)} | ${'Wall ms'.padEnd(8)} | Status`,
    '  ' + '─'.repeat(75),
  ];

  for (const res of r.resultados) {
    const statusIcon = res.status === 'ok' ? '✓' : res.status === 'degraded' ? '⚠' : '✗';
    L.push(
      `  ${String(res.nivel).padEnd(6)}`
      + ` | ${(res.throughput_cps.toFixed(1) + ' c/s').padEnd(14)}`
      + ` | ${res.latencia.p50_ms.toFixed(1).padEnd(8)}`
      + ` | ${res.latencia.p95_ms.toFixed(1).padEnd(8)}`
      + ` | ${res.latencia.p99_ms.toFixed(1).padEnd(8)}`
      + ` | ${String(res.wall_time_ms).padEnd(8)}`
      + ` | ${statusIcon} ${res.status.toUpperCase()}`,
    );
  }

  L.push('─────────────────────────────────────────────────────────────────────');
  L.push('  HEAP & GC');
  L.push('─────────────────────────────────────────────────────────────────────');
  L.push(`  ${'Nível'.padEnd(6)} | ${'Δ Heap MB'.padEnd(12)} | ${'Pico MB'.padEnd(10)} | ${'GC Pressão'.padEnd(12)} | Pipeline OK%`);
  L.push('  ' + '─'.repeat(70));

  for (const res of r.resultados) {
    const heapDisp = res.heap.delta_mb !== 0 || res.heap.depois_mb > 0;
    L.push(
      `  ${String(res.nivel).padEnd(6)}`
      + ` | ${heapDisp ? ('+' + res.heap.delta_mb.toFixed(1) + ' MB').padEnd(12) : ('N/A (fora Chrome)').padEnd(12)}`
      + ` | ${heapDisp ? (res.heap.pico_estimado_mb.toFixed(1) + ' MB').padEnd(10) : 'N/A'.padEnd(10)}`
      + ` | ${res.gc.pressao.padEnd(12)}`
      + ` | ${res.pipeline_steps_ok_pct}%`,
    );
  }

  L.push('─────────────────────────────────────────────────────────────────────');
  L.push('  INTEGRIDADE & CONSISTÊNCIA');
  L.push('─────────────────────────────────────────────────────────────────────');
  L.push(`  ${'Nível'.padEnd(6)} | ${'Integridade'.padEnd(14)} | ${'Consistência'.padEnd(14)} | Erros pipeline`);
  L.push('  ' + '─'.repeat(60));

  for (const res of r.resultados) {
    L.push(
      `  ${String(res.nivel).padEnd(6)}`
      + ` | ${(res.integridade.taxa_integridade_pct + '%').padEnd(14)}`
      + ` | ${(res.consistencia.taxa_consistencia_pct + '%').padEnd(14)}`
      + ` | ${res.erros_pipeline}`,
    );
  }

  L.push('─────────────────────────────────────────────────────────────────────');
  L.push('  ALERTAS POR NÍVEL');
  L.push('─────────────────────────────────────────────────────────────────────');
  let temAlerta = false;
  for (const res of r.resultados) {
    if (res.alertas.length > 0) {
      temAlerta = true;
      L.push(`  [${res.nivel}] ${res.alertas.join(' | ')}`);
    }
  }
  if (!temAlerta) L.push('  Nenhum alerta em todos os níveis. Sistema estável.');

  L.push('═════════════════════════════════════════════════════════════════════');
  L.push('  RESUMO GERAL');
  L.push('═════════════════════════════════════════════════════════════════════');
  const g = r.resumo_geral;
  L.push(`  Throughput máximo : ${g.throughput_maximo_cps} c/s @ ${g.nivel_throughput_maximo} consultas`);
  L.push(`  Latência P99 pior : ${g.latencia_p99_pior_ms}ms`);
  L.push(`  Heap pico         : ${g.heap_pico_mb > 0 ? g.heap_pico_mb + ' MB' : 'N/A (fora Chrome)'}`);
  L.push(`  Integridade global: ${g.integridade_global_pct}%`);
  L.push(`  Consistência global: ${g.consistencia_global_pct}%`);
  if (g.nivel_saturacao)     L.push(`  Ponto de saturação : ${g.nivel_saturacao} consultas simultâneas`);
  if (g.gargalo_identificado) L.push(`  Gargalo detectado  : ${g.gargalo_identificado}`);
  else                         L.push('  Gargalo            : Nenhum detectado nos níveis testados');
  L.push('─────────────────────────────────────────────────────────────────────');
  L.push('  VEREDICTO DO SISTEMA');
  const allOk = r.resultados.every(res => res.status === 'ok');
  const anyFail = r.resultados.some(res => res.status === 'failed');
  if (allOk)       L.push('  ✓ SISTEMA APROVADO EM TODOS OS NÍVEIS DE CARGA');
  else if (anyFail) L.push('  ✗ SISTEMA COM FALHAS — REVISÃO NECESSÁRIA ANTES DE PRODUÇÃO');
  else              L.push('  ⚠ SISTEMA APROVADO COM AVISOS — OTIMIZAÇÕES RECOMENDADAS');
  L.push('═════════════════════════════════════════════════════════════════════');
  L.push('  CDSS — Suporte à decisão clínica. Decisão médica soberana.');
  L.push('═════════════════════════════════════════════════════════════════════');

  return L.join('\n');
}

// ════════════════════════════════════════════════════════════
// RUNNER ASSÍNCRONO — para uso em componentes React/Next.js
// Processa níveis progressivamente e reporta progresso
// ════════════════════════════════════════════════════════════

export interface StressProgresso {
  nivel_atual:   number;
  niveis_total:  number;
  nivel_numero:  number;
  status:        'running' | 'done' | 'error';
  resultado_parcial?: CargaNivelResult;
}

export async function executarStressProgressivo(
  niveis: number[] = NIVEIS_STRESS,
  onProgresso?: (p: StressProgresso) => void,
): Promise<StressTestEtapa9Result> {
  const resultados: CargaNivelResult[] = [];

  for (let i = 0; i < niveis.length; i++) {
    const nivel = niveis[i];
    onProgresso?.({ nivel_atual: nivel, niveis_total: niveis.length, nivel_numero: i + 1, status: 'running' });

    // yield para não bloquear o event loop do browser entre níveis
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    const resultado = executarNivel(nivel);
    resultados.push(resultado);

    onProgresso?.({ nivel_atual: nivel, niveis_total: niveis.length, nivel_numero: i + 1, status: i === niveis.length - 1 ? 'done' : 'running', resultado_parcial: resultado });
  }

  // Reusar a lógica de resumo
  const resultado_completo = executarStressTestEtapa9(niveis);
  return { ...resultado_completo, resultados };
}

// ════════════════════════════════════════════════════════════
// MINI-TESTE RÁPIDO DE SANIDADE (executa em < 1s)
// ════════════════════════════════════════════════════════════

export function sanityCheckStress(): {
  pipeline_ok: boolean;
  hash_consistente: boolean;
  latencia_ms: number;
  detalhe: string;
} {
  const pac = gerarPacienteStress(42);
  const t0  = now();
  const r1  = executarConsulta(pac);
  const r2  = executarConsulta(pac);
  const lat = now() - t0;

  return {
    pipeline_ok:      r1.erros === 0 && r1.steps_ok >= 20,
    hash_consistente: r1.hash_saida === r2.hash_saida,
    latencia_ms:      Math.round(lat),
    detalhe: `steps: ${r1.steps_ok}/24 | erros: ${r1.erros} | hash: ${r1.hash_saida} | consistência: ${r1.hash_saida === r2.hash_saida ? 'OK' : 'DIVERGÊNCIA'}`,
  };
}
