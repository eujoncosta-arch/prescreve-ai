// ============================================================
// PRESCREVE-AI — Explainable AI 2.0 (Phase 14)
// Motores: WHY · WHY NOT · WHAT IF · ALTERNATIVES
// Explainability Score 0–100
// CDSS — Suporte à decisão clínica. Decisão médica soberana.
// ============================================================

import type { Anamnesis, TherapeuticSuggestion } from './types';

// ══════════════════════════════════════════════════════════════
// TIPOS PRINCIPAIS
// ══════════════════════════════════════════════════════════════

export type ForcaEvidencia = 'A' | 'B' | 'C' | 'D';
export type NivelRisco = 'baixo' | 'moderado' | 'alto' | 'muito_alto';

// ── WHY ───────────────────────────────────────────────────────

export interface JustificativaDiretriz {
  diretriz: string;
  sociedade: string;
  ano: number;
  classe_recomendacao: string;   // "I", "IIa", "IIb", "III"
  nivel_evidencia: ForcaEvidencia;
  doi?: string;
  resumo_recomendacao: string;
}

export interface EstudoPivotal {
  nome: string;
  doi?: string;
  n_pacientes: number;
  desfecho_primario: string;
  resultado: string;
  nnt?: number;
  rrr?: number;   // Redução de risco relativo (%)
  rar?: number;   // Redução de risco absoluto (%)
}

export interface BeneficioRisco {
  beneficio_absoluto: string;   // ex: "Reduz morte CV em 3,2% ao ano"
  nnt: number;
  nnh?: number;
  horizonte_tempo: string;      // ex: "5 anos"
  forca_evidencia: ForcaEvidencia;
}

export interface RespostaWHY {
  indicacao_principal: string;
  justificativas_diretriz: JustificativaDiretriz[];
  estudos_pivotais: EstudoPivotal[];
  beneficio_risco: BeneficioRisco;
  mecanismo_acao: string;
  por_que_esta_classe: string;
  por_que_esta_molecula: string;
  score_evidencia: number;      // 0–100 baseado em nível de evidência + NNT
}

// ── WHY NOT ───────────────────────────────────────────────────

export type TipoRestricao = 'contraindicacao_absoluta' | 'contraindicacao_relativa' | 'interacao_grave' | 'interacao_moderada' | 'ajuste_dose' | 'monitoramento_especial' | 'guideline';

export interface RestricaoClinica {
  tipo: TipoRestricao;
  descricao: string;
  criterio_ativado: string;     // O dado clínico que ativou (ex: "TFG 28 mL/min")
  fonte: string;                // "FDA", "ESC 2024", "ANVISA"
  acao_recomendada: string;
  gravidade: 'leve' | 'moderada' | 'grave' | 'absoluta';
}

export interface RespostaWHYNOT {
  restricoes: RestricaoClinica[];
  tem_contraindicacao_absoluta: boolean;
  score_seguranca: number;      // 0–100, quanto maior mais seguro
  resumo: string;
  alternativa_sugerida?: string;
}

// ── WHAT IF ───────────────────────────────────────────────────

export interface CenarioClinco {
  nome: string;                 // ex: "Enalapril 10mg/dia"
  molecula: string;
  classe: string;
  mortalidade_relativa: string; // ex: "↓ 16% mortalidade CV"
  nnt: number;
  nnh?: number;
  custo_mensal_brl: number;
  disponivel_sus: boolean;
  trust_score: number;          // 0–100
  forca_evidencia: ForcaEvidencia;
  vantagens: string[];
  desvantagens: string[];
  perfil_ideal: string;
  estudos: string[];            // nomes dos estudos principais
}

export interface RespostaWHATIF {
  pergunta: string;
  cenarios: CenarioClinco[];
  recomendacao_analise: string;
  melhor_custo_efetividade: string;    // nome do cenário
  melhor_evidencia: string;           // nome do cenário
  melhor_perfil_paciente?: string;    // nome do cenário mais adequado para este paciente
  disclaimer: string;
}

// ── ALTERNATIVES ─────────────────────────────────────────────

export type LinhaAlternativa = '1a_linha' | '2a_linha' | '3a_linha' | 'resgate' | 'off_label';

export interface AlternativaClinica {
  linha: LinhaAlternativa;
  molecula: string;
  classe: string;
  indicacao: string;
  nnt?: number;
  forca_evidencia: ForcaEvidencia;
  diretriz: string;
  marca_preferencial?: string;         // comercial SEM influenciar indicação
  disponivel_sus: boolean;
  custo_estimado_mes: number;
  vantagem_principal: string;
  desvantagem_principal: string;
  contraindicacoes_principais: string[];
  quando_preferir: string;
}

export interface RespostaALTERNATIVAS {
  cid: string;
  condicao: string;
  alternativas: AlternativaClinica[];
  nota_clinica: string;
  disclaimer: string;
}

// ── EXPLAINABILITY SCORE ──────────────────────────────────────

export interface ComponenteScore {
  nome: string;
  peso: number;     // peso do componente no score total
  valor: number;    // 0–100
  descricao: string;
}

export interface ExplainabilityScore {
  score_total: number;          // 0–100
  nivel: 'muito_baixo' | 'baixo' | 'moderado' | 'alto' | 'muito_alto';
  cor: 'red' | 'orange' | 'yellow' | 'green' | 'emerald';
  componentes: ComponenteScore[];
  interpretacao: string;
  confiavel_para_prescricao: boolean;
}

// ── RESULTADO COMPLETO ────────────────────────────────────────

export interface ExplainableAIv2Result {
  why: RespostaWHY;
  why_not: RespostaWHYNOT;
  what_if: RespostaWHATIF;
  alternatives: RespostaALTERNATIVAS;
  explainability_score: ExplainabilityScore;
  gerado_em: string;
  disclaimer: string;
}

// ══════════════════════════════════════════════════════════════
// BASE DE CONHECIMENTO CLÍNICO
// ══════════════════════════════════════════════════════════════

interface DadosEvidencia {
  diretriz: string;
  sociedade: string;
  ano: number;
  classe: string;
  nivel: ForcaEvidencia;
  doi?: string;
  resumo: string;
  mecanismo: string;
  por_que_classe: string;
  por_que_molecula: string;
  estudos: EstudoPivotal[];
  beneficio: BeneficioRisco;
}

const EVIDENCIA_DB: Record<string, DadosEvidencia> = {
  // ── IECA ────────────────────────────────────────────────────
  enalapril: {
    diretriz: 'VI Diretrizes Brasileiras de Hipertensão / ESC 2024',
    sociedade: 'SBC / ESC',
    ano: 2024,
    classe: 'I',
    nivel: 'A',
    doi: '10.1093/eurheartj/ehae178',
    resumo: 'IECA é recomendado como primeira linha em HAS, especialmente em pacientes com DM, nefropatia, IC ou pós-IAM. Efeito nefroprotetor demonstrado em múltiplos estudos.',
    mecanismo: 'Inibição da enzima conversora de angiotensina → redução de angiotensina II → vasodilatação + natriurese + redução do remodelamento cardíaco.',
    por_que_classe: 'IECAs são a única classe com benefício simultâneo em PA, função renal, remodelamento cardíaco e mortalidade cardiovascular — indicados em quase todos os fenótipos de alto risco.',
    por_que_molecula: 'Enalapril é o IECA com maior número de estudos randomizados em IC (CONSENSUS, SOLVD) e o mais acessível no SUS. Referência histórica da classe.',
    estudos: [
      { nome: 'CONSENSUS', n_pacientes: 253, desfecho_primario: 'Mortalidade em IC NYHA IV', resultado: 'Redução de 40% na mortalidade em 6 meses', nnt: 4, rrr: 40, rar: 22 },
      { nome: 'SOLVD-Treatment', doi: '10.1056/NEJM199108013250501', n_pacientes: 2569, desfecho_primario: 'Mortalidade + hospitalização por IC', resultado: 'Redução de 16% na mortalidade, 26% nas hospitalizações', nnt: 14, rrr: 16, rar: 4 },
    ],
    beneficio: { beneficio_absoluto: 'Reduz mortalidade CV em ~16% e hospitalização por IC em ~26%', nnt: 14, nnh: 50, horizonte_tempo: '3,5 anos', forca_evidencia: 'A' },
  },
  ramipril: {
    diretriz: 'ESC 2024 Guidelines for CVD prevention',
    sociedade: 'ESC',
    ano: 2024,
    classe: 'I',
    nivel: 'A',
    doi: '10.1093/eurheartj/ehae178',
    resumo: 'Ramipril demonstrou redução de eventos cardiovasculares maiores em pacientes de alto risco (HOPE). Indicado em HAS, pós-IAM, nefropatia diabética.',
    mecanismo: 'Inibição da enzima conversora de angiotensina → redução de angiotensina II → vasodilatação + natriurese + redução do remodelamento cardíaco.',
    por_que_classe: 'IECAs têm benefício simultâneo em PA, função renal, remodelamento cardíaco e mortalidade cardiovascular.',
    por_que_molecula: 'Ramipril é o IECA com melhor evidência em prevenção primária e secundária de alto risco cardiovascular (HOPE: 25% redução de morte CV, IAM, AVC).',
    estudos: [
      { nome: 'HOPE', doi: '10.1056/NEJM200001203420301', n_pacientes: 9297, desfecho_primario: 'Morte CV + IAM + AVC', resultado: 'Redução de 22% no desfecho primário', nnt: 26, rrr: 22, rar: 3.8 },
      { nome: 'MICRO-HOPE', n_pacientes: 3577, desfecho_primario: 'Nefropatia diabética', resultado: 'Redução de 24% no risco de nefropatia', nnt: 30, rrr: 24, rar: 3.2 },
    ],
    beneficio: { beneficio_absoluto: 'Reduz morte CV + IAM + AVC em 22% em pacientes de alto risco', nnt: 26, nnh: 80, horizonte_tempo: '5 anos', forca_evidencia: 'A' },
  },
  // ── iSGLT2 ─────────────────────────────────────────────────
  empagliflozina: {
    diretriz: 'ADA Standards of Care 2025 / SBD 2024',
    sociedade: 'ADA / SBD / ESC',
    ano: 2025,
    classe: 'I',
    nivel: 'A',
    doi: '10.2337/dc25-S010',
    resumo: 'iSGLT2 com cardioproteção e nefroproteção demonstradas. Indicado em DM2 com DCV aterosclerótica, IC ou DRC independentemente da HbA1c. Efeito glicosúrico independente de insulina.',
    mecanismo: 'Inibe o cotransportador SGLT2 no túbulo proximal → glicosúria + natriurese + redução da pré e pós-carga cardíaca + efeito cetogênico leve.',
    por_que_classe: 'iSGLT2 são os únicos antidiabéticos com benefício cardiorrenal demonstrado em desfechos duros (morte CV, hospitalização por IC, progressão de DRC) além do controle glicêmico.',
    por_que_molecula: 'Empagliflozina foi o primeiro iSGLT2 a demonstrar redução de mortalidade CV (EMPA-REG OUTCOME: 38% redução de morte CV). Classe I indicação para DM2 + DCV estabelecida.',
    estudos: [
      { nome: 'EMPA-REG OUTCOME', doi: '10.1056/NEJMoa1504720', n_pacientes: 7020, desfecho_primario: 'Morte CV + IAM não fatal + AVC não fatal', resultado: 'Redução de 14% no desfecho primário; 38% redução morte CV', nnt: 39, rrr: 14, rar: 1.6 },
      { nome: 'EMPEROR-Reduced', doi: '10.1056/NEJMoa2022190', n_pacientes: 3730, desfecho_primario: 'Morte CV + hospitalização IC', resultado: 'Redução de 25% no desfecho primário', nnt: 19, rrr: 25, rar: 5 },
    ],
    beneficio: { beneficio_absoluto: 'Reduz morte CV em 38%, hospitalização por IC em 30-35%', nnt: 39, nnh: 500, horizonte_tempo: '3,1 anos', forca_evidencia: 'A' },
  },
  dapagliflozina: {
    diretriz: 'ADA 2025 / ESC 2024 / KDIGO 2024',
    sociedade: 'ADA / ESC / KDIGO',
    ano: 2025,
    classe: 'I',
    nivel: 'A',
    doi: '10.2337/dc25-S010',
    resumo: 'Dapagliflozina demonstrou benefício em IC com FEr e FEp e em DRC. Aprovada para IC independentemente de DM2.',
    mecanismo: 'Inibe SGLT2 → glicosúria + natriurese + redução de pressão intraglomerular + efeito cardioprotetor indireto.',
    por_que_classe: 'iSGLT2 têm benefício cardiorrenal demonstrado em desfechos duros.',
    por_que_molecula: 'Dapagliflozina tem o espectro mais amplo de indicações aprovadas: DM2, IC-FEr, IC-FEp e DRC (DAPA-HF, DELIVER, DAPA-CKD).',
    estudos: [
      { nome: 'DAPA-HF', doi: '10.1056/NEJMoa1911303', n_pacientes: 4744, desfecho_primario: 'Piora IC + morte CV', resultado: 'Redução de 26% no desfecho primário', nnt: 21, rrr: 26, rar: 5 },
      { nome: 'DAPA-CKD', doi: '10.1056/NEJMoa2024816', n_pacientes: 4304, desfecho_primario: 'Queda ≥50% TFG + IRTS + morte renal + morte CV', resultado: 'Redução de 39% no desfecho primário', nnt: 19, rrr: 39, rar: 5 },
    ],
    beneficio: { beneficio_absoluto: 'Reduz progressão de DRC em 39% e hospitalização por IC em 30%', nnt: 21, nnh: 400, horizonte_tempo: '2,4 anos', forca_evidencia: 'A' },
  },
  // ── Metformina ──────────────────────────────────────────────
  metformina: {
    diretriz: 'ADA Standards of Care 2025 / SBD 2024',
    sociedade: 'ADA / SBD',
    ano: 2025,
    classe: 'I',
    nivel: 'A',
    doi: '10.2337/dc25-S010',
    resumo: 'Metformina é o antidiabético oral de primeira linha em DM2 sem contraindicações. Reduz HbA1c 1–2%, neutro no peso, baixo risco hipoglicemia, custo mínimo.',
    mecanismo: 'Ativação de AMPK hepática → redução da gliconeogênese hepática. Efeito secundário: melhora da sensibilidade à insulina periférica.',
    por_que_classe: 'Biguanidas são a classe com melhor relação custo-efetividade e segurança em longo prazo em DM2.',
    por_que_molecula: 'Metformina é o único antidiabético oral com dados de 60 anos de uso e redução de mortalidade geral demonstrada no UKPDS.',
    estudos: [
      { nome: 'UKPDS 34', doi: '10.1016/S0140-6736(98)07037-8', n_pacientes: 1704, desfecho_primario: 'Eventos relacionados ao DM', resultado: 'Redução de 32% em eventos relacionados ao DM em obesos; 42% AVC', nnt: 14, rrr: 32, rar: 6.7 },
    ],
    beneficio: { beneficio_absoluto: 'Reduz eventos relacionados ao DM em 32% em pacientes obesos; redução HbA1c 1–2%', nnt: 14, nnh: 200, horizonte_tempo: '10 anos', forca_evidencia: 'A' },
  },
  // ── Sacubitril/Valsartana ───────────────────────────────────
  'sacubitril/valsartana': {
    diretriz: 'ESC Heart Failure Guidelines 2023',
    sociedade: 'ESC / SBC',
    ano: 2023,
    classe: 'I',
    nivel: 'B',
    doi: '10.1093/eurheartj/ehad195',
    resumo: 'ARNI superior ao IECA em IC-FEr. Indicado para substituir IECA/BRA em pacientes tolerantes, FEVE ≤ 40%, sintomáticos apesar de tratamento otimizado.',
    mecanismo: 'Sacubitril inibe a neprilisina (degrada peptídeos natriuréticos) → aumento de BNP e ANP → natriurese + vasodilatação. Valsartana bloqueia AT1 → redução remodelamento.',
    por_que_classe: 'ARNI são a evolução dos IECAs com duplo mecanismo — mais potentes no remodelamento reverso e redução de mortalidade em IC-FEr.',
    por_que_molecula: 'Único ARNI disponível com dados sólidos (PARADIGM-HF: 20% redução morte CV + hospitalização vs. enalapril).',
    estudos: [
      { nome: 'PARADIGM-HF', doi: '10.1056/NEJMoa1409077', n_pacientes: 8442, desfecho_primario: 'Morte CV + hospitalização IC', resultado: 'Redução de 20% vs. enalapril; 16% redução morte CV', nnt: 21, rrr: 20, rar: 4.7 },
    ],
    beneficio: { beneficio_absoluto: 'Reduz morte CV + hospitalização IC em 20% vs. enalapril em IC-FEr', nnt: 21, nnh: 50, horizonte_tempo: '27 meses', forca_evidencia: 'B' },
  },
  // ── Estatina ────────────────────────────────────────────────
  rosuvastatina: {
    diretriz: 'ESC/EAS Guidelines for Dyslipidaemias 2024',
    sociedade: 'ESC / EAS / SBC',
    ano: 2024,
    classe: 'I',
    nivel: 'A',
    doi: '10.1093/eurheartj/ehae497',
    resumo: 'Estatina de alta potência. Indicada em alto e muito alto risco cardiovascular. Meta LDL-c < 55 mg/dL (muito alto risco) ou < 70 mg/dL (alto risco).',
    mecanismo: 'Inibição da HMG-CoA redutase → redução síntese hepática de colesterol → upregulation receptores LDL → clearance aumentado de LDL-c.',
    por_que_classe: 'Estatinas são os fármacos com maior corpo de evidência em prevenção cardiovascular. A relação redução de LDL-c com redução de eventos é linear.',
    por_que_molecula: 'Rosuvastatina tem a maior potência de redução de LDL-c por mg (50% com 10mg, 55-60% com 20-40mg). Hidrofílica — menor risco de miopatia.',
    estudos: [
      { nome: 'JUPITER', doi: '10.1056/NEJMoa0807646', n_pacientes: 17802, desfecho_primario: 'IAM + AVC + morte CV + angina + revascularização', resultado: 'Redução de 44% no desfecho primário em prevenção primária', nnt: 95, rrr: 44, rar: 0.9 },
      { nome: 'CTT Meta-analysis', doi: '10.1016/S0140-6736(10)61350-5', n_pacientes: 170000, desfecho_primario: 'Eventos CV maiores', resultado: 'Cada 1 mmol/L redução LDL → 22% redução eventos', nnt: 50, rrr: 22 },
    ],
    beneficio: { beneficio_absoluto: 'Reduz eventos CV maiores em 22% por mmol/L de redução de LDL-c', nnt: 50, nnh: 10000, horizonte_tempo: '5 anos', forca_evidencia: 'A' },
  },
  // ── Budesonida/Formoterol ────────────────────────────────────
  'budesonida/formoterol': {
    diretriz: 'GINA 2025',
    sociedade: 'GINA / SBPT',
    ano: 2025,
    classe: 'I',
    nivel: 'A',
    doi: '10.1183/13993003.congress-2025',
    resumo: 'CI+LABA é o tratamento de manutenção preferido em asma moderada-grave. Budesonida/Formoterol pode ser usado como terapia MART (manutenção + alívio).',
    mecanismo: 'Budesonida (CI): reduz inflamação eosinofílica via receptores GR. Formoterol (LABA): broncodilatação rápida e prolongada via β2-AR.',
    por_que_classe: 'Combinação CI+LABA é superior ao CI isolado em controle de sintomas e prevenção de exacerbações graves (GOAL, FACET studies).',
    por_que_molecula: 'Budesonida/formoterol tem início de ação rápido do formoterol, permitindo uso MART — esquema que reduz exacerbações em 45-47% vs. CI fixo + SABA.',
    estudos: [
      { nome: 'SYGMA 2', doi: '10.1056/NEJMoa1715275', n_pacientes: 4215, desfecho_primario: 'Exacerbações anuais', resultado: 'Não inferior a CI diário + SABA resgate; 45% redução vs. SABA isolado', nnt: 8, rrr: 45, rar: 12 },
    ],
    beneficio: { beneficio_absoluto: 'Reduz exacerbações graves em 45-64% vs. SABA isolado', nnt: 8, nnh: 200, horizonte_tempo: '1 ano', forca_evidencia: 'A' },
  },
};

// ── Alternativas clínicas por CID ─────────────────────────────

interface AlternativasDB {
  condicao: string;
  alternativas: AlternativaClinica[];
  nota: string;
}

const ALTERNATIVAS_DB: Record<string, AlternativasDB> = {
  I10: {
    condicao: 'Hipertensão Arterial Sistêmica',
    nota: 'A escolha da classe deve considerar comorbidades: DM (IECA/BRA), IC (IECA+betabloqueador+iSGLT2), DRC (IECA/BRA). Meta PA < 130/80 mmHg para maioria dos pacientes.',
    alternativas: [
      { linha: '1a_linha', molecula: 'Enalapril 10–20mg', classe: 'IECA', indicacao: 'HAS com DM, IC, nefropatia, pós-IAM', nnt: 14, forca_evidencia: 'A', diretriz: 'SBC 2024', disponivel_sus: true, custo_estimado_mes: 15, vantagem_principal: 'Nefroproteção, cardioproteção, custo mínimo', desvantagem_principal: 'Tosse (10–15%)', contraindicacoes_principais: ['Angioedema prévio', 'Gravidez', 'Hiperpotassemia'], quando_preferir: 'DM2, IC-FEr, nefropatia, pós-IAM' },
      { linha: '1a_linha', molecula: 'Losartana 50–100mg', classe: 'BRA', indicacao: 'HAS com intolerância a IECA, DM, nefropatia', nnt: 16, forca_evidencia: 'A', diretriz: 'SBC 2024', disponivel_sus: true, custo_estimado_mes: 20, vantagem_principal: 'Sem tosse, nefroproteção equivalente ao IECA', desvantagem_principal: 'Menos estudos que IECA em IC', contraindicacoes_principais: ['Gravidez', 'Hiperpotassemia', 'Estenose bilateral de artéria renal'], quando_preferir: 'Tosse por IECA, DM2 com nefropatia' },
      { linha: '1a_linha', molecula: 'Anlodipino 5–10mg', classe: 'BCC', indicacao: 'HAS, angina, idosos, negros', nnt: 20, forca_evidencia: 'A', diretriz: 'SBC 2024 / JNC8', disponivel_sus: true, custo_estimado_mes: 18, vantagem_principal: 'Boa tolerabilidade, sem contraindicação renal, efeito em negros', desvantagem_principal: 'Edema maleolar (10%), taquicardia reflexa', contraindicacoes_principais: ['Hipotensão grave'], quando_preferir: 'HAS sem IC, angina, idosos, negros, monoterapia inicial' },
      { linha: '1a_linha', molecula: 'Hidroclorotiazida 12,5–25mg', classe: 'Tiazídico', indicacao: 'HAS, em combinação', nnt: 25, forca_evidencia: 'A', diretriz: 'SBC 2024', disponivel_sus: true, custo_estimado_mes: 5, vantagem_principal: 'Baixo custo, reduz PA isolado, benefício CV demonstrado (ALLHAT)', desvantagem_principal: 'Hipocalemia, hiperuricemia, piora DM', contraindicacoes_principais: ['Gota ativa', 'Hipocalemia', 'DRC G4-G5'], quando_preferir: 'Combinação com IECA/BRA, idosos, HAS sistólica isolada' },
      { linha: '2a_linha', molecula: 'Carvedilol 12,5–50mg', classe: 'Betabloqueador', indicacao: 'HAS com IC ou pós-IAM ou FA', nnt: 18, forca_evidencia: 'A', diretriz: 'ESC 2024', disponivel_sus: true, custo_estimado_mes: 25, vantagem_principal: 'Indicação mandatória em IC-FEr, pós-IAM, FA com alta resposta ventricular', desvantagem_principal: 'Broncoespasmo, bradicardia, mascaramento hipoglicemia', contraindicacoes_principais: ['Asma', 'BAV 2-3º', 'Bradicardia'], quando_preferir: 'IC-FEr + HAS, pós-IAM, FA crônica' },
      { linha: '2a_linha', molecula: 'Espironolactona 25–50mg', classe: 'Antagonista aldosterona', indicacao: 'HAS resistente, IC-FEr, hiperaldosteronismo', nnt: 12, forca_evidencia: 'A', diretriz: 'ESC 2024', disponivel_sus: true, custo_estimado_mes: 30, vantagem_principal: 'Eficaz em HAS resistente, benefício em IC classe I', desvantagem_principal: 'Hiperpotassemia, ginecomastia (masculino)', contraindicacoes_principais: ['TFG < 30', 'Hiperpotassemia K+ > 5,0'], quando_preferir: 'HAS resistente, IC-FEr já em IECA+BB, aldosteronismo' },
      { linha: '3a_linha', molecula: 'Clonidina 0,1–0,3mg', classe: 'Simpaticolítico central', indicacao: 'HAS refratária, crise hipertensiva', forca_evidencia: 'C', diretriz: 'SBC 2024', disponivel_sus: true, custo_estimado_mes: 20, vantagem_principal: 'Efeito rápido em crise hipertensiva', desvantagem_principal: 'Efeito rebote ao suspender, sedação, boca seca', contraindicacoes_principais: ['Síndrome do nó sinusal', 'Depressão grave'], quando_preferir: 'HAS refratária após 3 classes, crise hipertensiva' },
    ],
  },
  E11: {
    condicao: 'Diabetes Mellitus Tipo 2',
    nota: 'Escolha do antidiabético deve considerar: DCV aterosclerótica (iSGLT2/GLP-1Ra), IC (iSGLT2), DRC (iSGLT2/GLP-1Ra). Metformina permanece base exceto contraindicação.',
    alternativas: [
      { linha: '1a_linha', molecula: 'Metformina 500–2000mg', classe: 'Biguanida', indicacao: 'DM2 sem contraindicação', nnt: 14, forca_evidencia: 'A', diretriz: 'ADA 2025 / SBD 2024', disponivel_sus: true, custo_estimado_mes: 10, vantagem_principal: 'Custo mínimo, neutro no peso, 60 anos de evidência', desvantagem_principal: 'Intolerância GI, contraindicada TFG < 30', contraindicacoes_principais: ['TFG < 30', 'Uso de contraste iodado 48h', 'Hepatopatia grave', 'Acidose'], quando_preferir: 'DM2 sem DCV/IC/DRC, primeira linha universal' },
      { linha: '1a_linha', molecula: 'Empagliflozina 10–25mg', classe: 'iSGLT2', indicacao: 'DM2 + DCV aterosclerótica, IC ou DRC', nnt: 39, forca_evidencia: 'A', diretriz: 'ADA 2025 / ESC 2024', disponivel_sus: false, custo_estimado_mes: 280, vantagem_principal: '38% redução morte CV (EMPA-REG), cardioproteção + nefroproteção', desvantagem_principal: 'Custo elevado, ITU/candidíase, cetoacidose (raro)', contraindicacoes_principais: ['TFG < 20', 'DM1', 'Jejum prolongado', 'Cetoacidose'], quando_preferir: 'DM2 + DCV estabelecida, IC-FEr, DRC G2-G4' },
      { linha: '1a_linha', molecula: 'Semaglutida 0,5–2mg sc', classe: 'GLP-1Ra', indicacao: 'DM2 + DCV aterosclerótica ou obesidade', nnt: 45, forca_evidencia: 'A', diretriz: 'ADA 2025', disponivel_sus: false, custo_estimado_mes: 800, vantagem_principal: '26% redução eventos CV (SUSTAIN-6), perda de peso 6–15%', desvantagem_principal: 'Custo muito elevado, náusea/vômito inicial, injetável', contraindicacoes_principais: ['CMT familiar/MEN2', 'Pancreatite ativa', 'TFG < 15'], quando_preferir: 'DM2 + DCV + obesidade ou quando perda de peso é prioridade' },
      { linha: '2a_linha', molecula: 'Glibenclamida 5–20mg', classe: 'Sulfonilureia', indicacao: 'DM2 sem DCV/IC/DRC, sem seguro de saúde', nnt: 15, forca_evidencia: 'B', diretriz: 'SBD 2024', disponivel_sus: true, custo_estimado_mes: 8, vantagem_principal: 'Baixo custo, boa redução HbA1c (1–2%)', desvantagem_principal: 'Hipoglicemia (maior risco da classe), ganho de peso 2–4 kg', contraindicacoes_principais: ['Insuficiência renal/hepática grave', 'Idosos fragilizados'], quando_preferir: 'DM2 sem comorbidade cardiorrenal, quando custo é limitante' },
      { linha: '2a_linha', molecula: 'Sitagliptina 100mg', classe: 'DPP-4i', indicacao: 'DM2 especialmente idosos ou com risco hipoglicemia', forca_evidencia: 'B', diretriz: 'ADA 2025', disponivel_sus: false, custo_estimado_mes: 140, vantagem_principal: 'Sem hipoglicemia, neutro no peso, bem tolerado em idosos', desvantagem_principal: 'Modesta redução HbA1c (0,5–1%), sem benefício CV duro', contraindicacoes_principais: ['TFG < 15 sem ajuste'], quando_preferir: 'Idosos, pacientes com risco hipoglicemia, combinação com iSGLT2' },
      { linha: '3a_linha', molecula: 'Insulina NPH + Regular', classe: 'Insulina', indicacao: 'DM2 descompensado (HbA1c > 10%), falha de 2+ antidiabéticos', forca_evidencia: 'A', diretriz: 'SBD 2024 / ADA 2025', disponivel_sus: true, custo_estimado_mes: 30, vantagem_principal: 'Único fármaco sem teto de eficácia. Disponível no SUS', desvantagem_principal: 'Hipoglicemia, ganho de peso, múltiplas aplicações', contraindicacoes_principais: ['Contraindicação relativa: hipoglicemia não percebida'], quando_preferir: 'HbA1c > 10%, DM2 descompensado, falha de múltiplos antidiabéticos' },
    ],
  },
  I50: {
    condicao: 'Insuficiência Cardíaca',
    nota: 'Pilares da IC-FEr (FEVE ≤ 40%): IECA/ARNI + Betabloqueador + ARM + iSGLT2. Dose máxima tolerada. Meta: reduzir hospitalização e morte CV.',
    alternativas: [
      { linha: '1a_linha', molecula: 'Sacubitril/Valsartana 24/26–97/103mg', classe: 'ARNI', indicacao: 'IC-FEr NYHA II-IV, substitui IECA', nnt: 21, forca_evidencia: 'B', diretriz: 'ESC 2023 / SBC 2024', disponivel_sus: false, custo_estimado_mes: 420, vantagem_principal: '20% redução morte CV + hospitalização vs. enalapril (PARADIGM-HF)', desvantagem_principal: 'Custo, contraindicado com IECA (washout 36h), angioedema', contraindicacoes_principais: ['Uso concomitante de IECA (washout 36h)', 'Angioedema prévio', 'TFG < 30', 'Gravidez'], quando_preferir: 'IC-FEr NYHA II-IV estável, PA tolerável, sem angioedema, pode pagar' },
      { linha: '1a_linha', molecula: 'Carvedilol 3,125–50mg', classe: 'Betabloqueador', indicacao: 'IC-FEr, pós-IAM, HAS com IC', nnt: 18, forca_evidencia: 'A', diretriz: 'ESC 2023', disponivel_sus: true, custo_estimado_mes: 25, vantagem_principal: 'Redução mortalidade 34% (COPERNICUS). Sem custo. Alpha-1 bloqueio adicional', desvantagem_principal: 'Bradicardia, hipotensão, broncoespasmo, iniciar dose mínima', contraindicacoes_principais: ['Asma', 'BAV 2-3º', 'Bradicardia < 60', 'Descompensação hemodinâmica'], quando_preferir: 'Todo IC-FEr estável. Mandatório salvo contraindicação' },
      { linha: '1a_linha', molecula: 'Espironolactona 25–50mg', classe: 'ARM', indicacao: 'IC-FEr NYHA II-IV + TFG ≥ 30 + K+ ≤ 5,0', nnt: 9, forca_evidencia: 'A', diretriz: 'ESC 2023', disponivel_sus: true, custo_estimado_mes: 30, vantagem_principal: '30% redução morte CV (RALES). Baixo custo', desvantagem_principal: 'Hiperpotassemia, ginecomastia (masculino), monitoramento K+/Cr', contraindicacoes_principais: ['TFG < 30', 'K+ > 5,0', 'Uso de AINE'], quando_preferir: 'IC-FEr em IECA+BB + sintomático ou pós-IAM com disfunção' },
      { linha: '1a_linha', molecula: 'Dapagliflozina 10mg', classe: 'iSGLT2', indicacao: 'IC-FEr independente de DM2', nnt: 21, forca_evidencia: 'A', diretriz: 'ESC 2023 / ADA 2025', disponivel_sus: false, custo_estimado_mes: 180, vantagem_principal: '26% redução morte CV + hospitalização (DAPA-HF). IC-FEr e IC-FEp', desvantagem_principal: 'Custo, ITU/candidíase, cetoacidose (raro)', contraindicacoes_principais: ['TFG < 20', 'DM1'], quando_preferir: 'IC-FEr: 4º pilar da terapia padrão. IC-FEp com congestão' },
      { linha: '2a_linha', molecula: 'Furosemida 20–240mg', classe: 'Diurético de alça', indicacao: 'IC com congestão/sobrecarga de volume', forca_evidencia: 'B', diretriz: 'ESC 2023', disponivel_sus: true, custo_estimado_mes: 10, vantagem_principal: 'Alívio rápido da congestão — sintomático', desvantagem_principal: 'Hipocalemia, hipovolemia, ativação neuro-humoral crônica', contraindicacoes_principais: ['Hipovolemia', 'Hipocalemia grave', 'Anúria'], quando_preferir: 'IC com sinais de congestão: edema, ortopneia, B3, estase jugular' },
      { linha: '2a_linha', molecula: 'Ivabradina 5–7,5mg', classe: 'Inibidor If', indicacao: 'IC-FEr + FC ≥ 70 em ritmo sinusal apesar de betabloqueador máximo', nnt: 28, forca_evidencia: 'B', diretriz: 'ESC 2023', disponivel_sus: false, custo_estimado_mes: 200, vantagem_principal: '18% redução hospitalização IC (SHIFT). Sem efeito inotrópico negativo', desvantagem_principal: 'Fosfenos, bradicardia, sem benefício em FA', contraindicacoes_principais: ['Fibrilação atrial', 'BAV 2-3º', 'FC < 60', 'Hipotensão'], quando_preferir: 'IC-FEr em ritmo sinusal com FC ≥ 70 em dose máxima tolerada de betabloqueador' },
    ],
  },
  J45: {
    condicao: 'Asma',
    nota: 'GINA 2025 recomenda CI em todos os estágios. Evitar uso isolado de SABA (risco de morte). Preferir estratégia MART com CI+Formoterol em adultos e adolescentes.',
    alternativas: [
      { linha: '1a_linha', molecula: 'Budesonida/Formoterol 160/4,5mcg', classe: 'CI+LABA (MART)', indicacao: 'Asma leve a moderada — terapia MART', nnt: 8, forca_evidencia: 'A', diretriz: 'GINA 2025', disponivel_sus: true, custo_estimado_mes: 80, vantagem_principal: 'Esquema MART: manutenção + alívio no mesmo dispositivo. 45-64% redução exacerbações', desvantagem_principal: 'Requer educação para uso correto do dispositivo', contraindicacoes_principais: ['< 6 anos', 'Intolerância ao formoterol'], quando_preferir: 'Adultos e adolescentes com asma leve-moderada, estratégia MART GINA Step 3-4' },
      { linha: '1a_linha', molecula: 'Budesonida 200–400mcg', classe: 'CI isolado', indicacao: 'Asma leve persistente (GINA Step 2)', forca_evidencia: 'A', diretriz: 'GINA 2025', disponivel_sus: true, custo_estimado_mes: 60, vantagem_principal: 'Controle da inflamação eosinofílica. Base de todo tratamento', desvantagem_principal: 'Candidíase oral (usar espaçador, bochechar)', contraindicacoes_principais: ['Nenhuma absoluta em dose inalatória'], quando_preferir: 'Asma leve persistente, CI isolado GINA Step 2' },
      { linha: '2a_linha', molecula: 'Salmeterol/Fluticasona 25/125mcg', classe: 'CI+LABA fixo', indicacao: 'Asma moderada-grave não controlada', forca_evidencia: 'A', diretriz: 'GINA 2025', disponivel_sus: false, custo_estimado_mes: 120, vantagem_principal: 'Controle superior ao CI isolado, 1-2x/dia', desvantagem_principal: 'Não pode ser usado como MART (salmeterol de início lento)', contraindicacoes_principais: ['< 4 anos', 'Asma controlada com CI isolado'], quando_preferir: 'Asma moderada-grave controlada com Step 3-4 sem preferência MART' },
      { linha: '2a_linha', molecula: 'Montelucaste 10mg', classe: 'Antileucotrieno', indicacao: 'Asma leve + rinite alérgica; adjuvante', forca_evidencia: 'B', diretriz: 'GINA 2025', disponivel_sus: true, custo_estimado_mes: 50, vantagem_principal: 'Oral, útil em rinite associada, pode reduzir dose de CI', desvantagem_principal: 'Risco neuropsiquiátrico (monitorar pesadelos, comportamento), não é primeira linha', contraindicacoes_principais: ['Hipersensibilidade', 'Monitorar distúrbios neuropsiquiátricos (FDA warning)'], quando_preferir: 'Asma + rinite alérgica. Paciente que recusa inalatório' },
      { linha: '3a_linha', molecula: 'Omalizumabe 150–375mg sc', classe: 'Anti-IgE', indicacao: 'Asma grave persistente alérgica IgE-mediada', forca_evidencia: 'A', diretriz: 'GINA 2025', disponivel_sus: false, custo_estimado_mes: 3500, vantagem_principal: 'Reduz exacerbações 50% em asma alérgica grave. Uso em centros especializados', desvantagem_principal: 'Custo muito elevado, injetável a cada 2-4 semanas', contraindicacoes_principais: ['Asma não alérgica', 'IgE total < 30 ou > 1500 UI/mL', 'Parasitoses ativas'], quando_preferir: 'Asma grave persistente alérgica não controlada com Step 4-5 + IgE total 30-1500 + teste cutâneo positivo' },
    ],
  },
};

// ── Cenários WHAT IF por CID ──────────────────────────────────

const WHATIF_DB: Record<string, CenarioClinco[]> = {
  I10: [
    { nome: 'Enalapril 10mg', molecula: 'Enalapril', classe: 'IECA', mortalidade_relativa: '↓ 16% morte CV', nnt: 14, nnh: 50, custo_mensal_brl: 15, disponivel_sus: true, trust_score: 92, forca_evidencia: 'A', vantagens: ['Custo mínimo', 'Nefroproteção', 'SUS'], desvantagens: ['Tosse 10-15%'], perfil_ideal: 'DM, IC, nefropatia, pós-IAM', estudos: ['CONSENSUS', 'SOLVD', 'HOPE-pilot'] },
    { nome: 'ARNI (Sacubitril/Valsartana)', molecula: 'Sacubitril/Valsartana', classe: 'ARNI', mortalidade_relativa: '↓ 16% morte CV vs enalapril', nnt: 21, nnh: 50, custo_mensal_brl: 420, disponivel_sus: false, trust_score: 88, forca_evidencia: 'B', vantagens: ['Superior ao IECA em IC-FEr', 'Remodelamento reverso'], desvantagens: ['Custo elevado', 'Washout 36h se IECA'], perfil_ideal: 'IC-FEr NYHA II-IV em IECA tolerante', estudos: ['PARADIGM-HF'] },
    { nome: 'ARNI + iSGLT2', molecula: 'Sacubitril/Valsartana + Dapagliflozina', classe: 'ARNI + iSGLT2', mortalidade_relativa: '↓ ~30% morte CV + hospitalização IC (estimativa combinada)', nnt: 12, nnh: 50, custo_mensal_brl: 600, disponivel_sus: false, trust_score: 85, forca_evidencia: 'B', vantagens: ['Maior redução de desfechos combinados', 'Quatro pilares IC-FEr simultâneos'], desvantagens: ['Custo muito elevado', 'Complexidade de combinação'], perfil_ideal: 'IC-FEr + DM2 ou DRC, alto risco', estudos: ['PARADIGM-HF', 'DAPA-HF', 'análises combinadas'] },
  ],
  E11: [
    { nome: 'Metformina', molecula: 'Metformina', classe: 'Biguanida', mortalidade_relativa: '↓ 32% eventos DM (obesos)', nnt: 14, nnh: 200, custo_mensal_brl: 10, disponivel_sus: true, trust_score: 95, forca_evidencia: 'A', vantagens: ['Custo mínimo', 'Sem hipoglicemia', 'UKPDS'], desvantagens: ['GI intolerância', 'TFG < 30 CI'], perfil_ideal: 'DM2 sem DCV/IC/DRC', estudos: ['UKPDS 34'] },
    { nome: 'Empagliflozina', molecula: 'Empagliflozina', classe: 'iSGLT2', mortalidade_relativa: '↓ 38% morte CV + ↓ 35% progressão DRC', nnt: 39, nnh: 500, custo_mensal_brl: 280, disponivel_sus: false, trust_score: 92, forca_evidencia: 'A', vantagens: ['Cardioproteção', 'Nefroproteção', 'Perda de peso 2-4kg'], desvantagens: ['Custo elevado', 'ITU/candidíase'], perfil_ideal: 'DM2 + DCV estabelecida ou IC ou DRC', estudos: ['EMPA-REG OUTCOME', 'EMPEROR-Reduced', 'EMPA-KIDNEY'] },
    { nome: 'Metformina + Empagliflozina', molecula: 'Metformina + Empagliflozina', classe: 'Biguanida + iSGLT2', mortalidade_relativa: '↓ HbA1c adicional + efeitos cardiorrenais iSGLT2', nnt: 20, nnh: 300, custo_mensal_brl: 290, disponivel_sus: false, trust_score: 90, forca_evidencia: 'A', vantagens: ['Sinergismo glicêmico', 'Cardioproteção + custo baixo da metformina'], desvantagens: ['Custo da empagliflozina'], perfil_ideal: 'DM2 + DCV/IC/DRC sem contraindicação a metformina', estudos: ['EMPA-REG OUTCOME', 'UKPDS'] },
  ],
  I50: [
    { nome: 'Enalapril (sem ARNI)', molecula: 'Enalapril', classe: 'IECA', mortalidade_relativa: '↓ 16% morte + hospitalização IC', nnt: 14, nnh: 80, custo_mensal_brl: 15, disponivel_sus: true, trust_score: 90, forca_evidencia: 'A', vantagens: ['Custo mínimo', 'SUS', '30 anos evidência'], desvantagens: ['Inferior ao ARNI', 'Tosse'], perfil_ideal: 'IC-FEr sem acesso a ARNI', estudos: ['CONSENSUS', 'SOLVD'] },
    { nome: 'Sacubitril/Valsartana (ARNI)', molecula: 'Sacubitril/Valsartana', classe: 'ARNI', mortalidade_relativa: '↓ 20% vs enalapril + ↓ 16% morte CV', nnt: 21, nnh: 50, custo_mensal_brl: 420, disponivel_sus: false, trust_score: 92, forca_evidencia: 'B', vantagens: ['Superior ao IECA', 'Remodelamento reverso', 'PARADIGM-HF'], desvantagens: ['Custo', 'Washout IECA'], perfil_ideal: 'IC-FEr estável já em IECA, tolerante', estudos: ['PARADIGM-HF'] },
    { nome: 'ARNI + iSGLT2 + ARM + BB (4 pilares)', molecula: 'Combinação 4 pilares', classe: 'ARNI + iSGLT2 + ARM + BB', mortalidade_relativa: 'Estimativa: ↓ 40-50% mortalidade vs nenhum tratamento', nnt: 7, nnh: 30, custo_mensal_brl: 680, disponivel_sus: false, trust_score: 88, forca_evidencia: 'A', vantagens: ['4 pilares: máxima redução de mortalidade e hospitalização', 'Alvo terapêutico completo ESC 2023'], desvantagens: ['Custo elevado', 'Complexidade', 'Monitoramento K+/Cr/PA'], perfil_ideal: 'IC-FEr NYHA II-III estável, alto risco, sem contraindicação', estudos: ['PARADIGM-HF', 'DAPA-HF', 'RALES', 'COPERNICUS'] },
  ],
};

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function labNum(anamnese: Anamnesis | undefined, ...chaves: string[]): number | undefined {
  for (const k of chaves) {
    const val = anamnese?.laboratorio?.[k];
    if (val !== undefined && val !== '') {
      const n = parseFloat(val as string);
      if (!isNaN(n)) return n;
    }
  }
  return undefined;
}

function temComorbidade(anamnese: Anamnesis | undefined, ...termos: string[]): boolean {
  return termos.some(t => anamnese?.comorbidades?.some(c => c.toLowerCase().includes(t.toLowerCase())));
}

function cidPrincipal(cid: string): string {
  return cid.split('.')[0].toUpperCase();
}

// ══════════════════════════════════════════════════════════════
// MOTOR WHY
// ══════════════════════════════════════════════════════════════

export function gerarWHY(
  med: TherapeuticSuggestion,
  _anamnese?: Anamnesis,
): RespostaWHY {
  const molLower = med.molecula.toLowerCase().replace(/\s+/g, '');
  const base = EVIDENCIA_DB[molLower] ?? EVIDENCIA_DB[med.molecula.toLowerCase()] ?? null;

  const diretrizLib: JustificativaDiretriz = {
    diretriz: base?.diretriz ?? med.evidencia.diretriz,
    sociedade: base?.sociedade ?? med.evidencia.sociedade,
    ano: base?.ano ?? med.evidencia.ano,
    classe_recomendacao: base?.classe ?? med.evidencia.nivel_evidencia.nivel ?? 'I',
    nivel_evidencia: (base?.nivel ?? med.evidencia.nivel_evidencia.nivel?.charAt(0) ?? 'B') as ForcaEvidencia,
    doi: base?.doi,
    resumo_recomendacao: base?.resumo ?? med.indicacao,
  };

  const estudos = base?.estudos ?? [];
  const beneficio = base?.beneficio ?? {
    beneficio_absoluto: `${med.molecula} demonstrou benefício clínico em ${med.indicacao}`,
    nnt: 25,
    horizonte_tempo: 'Variável',
    forca_evidencia: (med.evidencia.nivel_evidencia.nivel?.charAt(0) ?? 'B') as ForcaEvidencia,
  };

  const nivelMap: Record<string, number> = { A: 95, B: 75, C: 50, D: 25 };
  const nntPenalty = estudos.length > 0 ? Math.max(0, 30 - (beneficio.nnt ?? 30)) : 0;
  const score_evidencia = Math.min(100, (nivelMap[diretrizLib.nivel_evidencia] ?? 60) + nntPenalty / 2);

  return {
    indicacao_principal: med.indicacao,
    justificativas_diretriz: [diretrizLib],
    estudos_pivotais: estudos,
    beneficio_risco: beneficio,
    mecanismo_acao: base?.mecanismo ?? `${med.molecula} atua como ${med.classe_terapeutica} com efeitos farmacológicos específicos na via terapêutica alvo.`,
    por_que_esta_classe: base?.por_que_classe ?? `A classe ${med.classe_terapeutica} é recomendada por ${med.evidencia.sociedade} para esta indicação com base em evidências de nível ${diretrizLib.nivel_evidencia}.`,
    por_que_esta_molecula: base?.por_que_molecula ?? `${med.molecula} é a opção de referência na classe ${med.classe_terapeutica} com melhor relação evidência/disponibilidade.`,
    score_evidencia: Math.round(score_evidencia),
  };
}

// ══════════════════════════════════════════════════════════════
// MOTOR WHY NOT
// ══════════════════════════════════════════════════════════════

export function gerarWHYNOT(
  med: TherapeuticSuggestion,
  anamnese?: Anamnesis,
): RespostaWHYNOT {
  const restricoes: RestricaoClinica[] = [];

  const tfg = anamnese?.funcao_renal?.tfg;
  const creatinina = anamnese?.funcao_renal?.creatinina ?? labNum(anamnese, 'creatinina', 'Cr');
  const childPugh = anamnese?.funcao_hepatica?.child_pugh;
  const albumina = anamnese?.funcao_hepatica?.albumina;
  const pa = anamnese?.sinais_vitais?.pa_sistolica;
  const fc = anamnese?.sinais_vitais?.fc;
  const potassio = labNum(anamnese, 'potassio', 'K+', 'k');
  const medicamentos: string[] = (anamnese?.medicamentos_em_uso ?? []).map(m => (typeof m === 'string' ? m : (m as { nome?: string }).nome ?? ''));

  // ── Contraindicações da ficha do medicamento ─────────────────
  for (const ci of med.contraindicacoes ?? []) {
    const ciLower = ci.toLowerCase();

    // Gestação
    if ((ciLower.includes('gravidez') || ciLower.includes('gestação') || ciLower.includes('gestante')) && anamnese?.gestante) {
      restricoes.push({ tipo: 'contraindicacao_absoluta', descricao: ci, criterio_ativado: 'Gestação confirmada na anamnese', fonte: 'ANVISA / FDA', acao_recomendada: 'Substituir antes de iniciar. Consultar obstetra.', gravidade: 'absoluta' });
    }
    // Bradicardia
    if (ciLower.includes('bradicard') && fc !== undefined && fc < 55) {
      restricoes.push({ tipo: 'contraindicacao_relativa', descricao: ci, criterio_ativado: `FC ${fc} bpm`, fonte: 'Bula / ESC', acao_recomendada: 'Avaliar ECG antes de iniciar. Considerar alternativa.', gravidade: 'grave' });
    }
    // TFG / renal
    if ((ciLower.includes('tfg') || ciLower.includes('renal') || ciLower.includes('creatinina'))) {
      if (tfg !== undefined && tfg < 30) {
        restricoes.push({ tipo: 'contraindicacao_relativa', descricao: ci, criterio_ativado: `TFG ${tfg} mL/min — DRC G4/G5`, fonte: 'KDIGO / Bula', acao_recomendada: med.dose.ajuste_renal ?? 'Avaliar ajuste de dose ou alternativa.', gravidade: tfg < 15 ? 'absoluta' : 'grave' });
      } else if (creatinina !== undefined && creatinina > 2.5) {
        restricoes.push({ tipo: 'ajuste_dose', descricao: 'Disfunção renal significativa', criterio_ativado: `Creatinina ${creatinina} mg/dL`, fonte: 'Bula', acao_recomendada: med.dose.ajuste_renal ?? 'Ajuste de dose conforme TFG estimada.', gravidade: 'moderada' });
      }
    }
    // Hiperpotassemia
    if (ciLower.includes('hiperpotass') || ciLower.includes('potassio')) {
      if (potassio !== undefined && potassio > 5.0) {
        restricoes.push({ tipo: 'contraindicacao_relativa', descricao: ci, criterio_ativado: `K+ ${potassio} mEq/L`, fonte: 'Bula / ESC', acao_recomendada: 'Corrigir hiperpotassemia antes de iniciar. Dietética + resina se necessário.', gravidade: potassio > 5.5 ? 'grave' : 'moderada' });
      }
    }
    // Hepatopatia
    if ((ciLower.includes('hepat') || ciLower.includes('child')) && childPugh === 'C') {
      restricoes.push({ tipo: 'contraindicacao_relativa', descricao: ci, criterio_ativado: 'Child-Pugh C', fonte: 'Bula / AASLD', acao_recomendada: med.dose.ajuste_hepatico ?? 'Avaliar com hepatologista. Risco de acúmulo.', gravidade: 'grave' });
    }
    // Hipotensão
    if (ciLower.includes('hipotens') && pa !== undefined && pa < 90) {
      restricoes.push({ tipo: 'contraindicacao_relativa', descricao: ci, criterio_ativado: `PA sistólica ${pa} mmHg`, fonte: 'Bula', acao_recomendada: 'Corrigir hipovolemia antes. Iniciar com dose mínima. Monitorar PA.', gravidade: 'grave' });
    }
    // Asma
    if (ciLower.includes('asma') && temComorbidade(anamnese, 'asma')) {
      restricoes.push({ tipo: 'contraindicacao_absoluta', descricao: ci, criterio_ativado: 'Asma na anamnese', fonte: 'Bula / GINA', acao_recomendada: 'Contraindicado em asma ativa. Usar alternativa (ex: BCC, IECA).', gravidade: 'absoluta' });
    }
    // DPOC
    if (ciLower.includes('dpoc') && temComorbidade(anamnese, 'dpoc', 'doença pulmonar obstrutiva')) {
      restricoes.push({ tipo: 'contraindicacao_relativa', descricao: ci, criterio_ativado: 'DPOC na anamnese', fonte: 'Bula / GOLD', acao_recomendada: 'Evitar betabloqueadores não seletivos. Preferir cardioseletivos se necessário.', gravidade: 'moderada' });
    }
  }

  // ── Interações farmacológicas ────────────────────────────────
  for (const med_uso of medicamentos) {
    const m = med_uso.toLowerCase();
    const molLower = med.molecula.toLowerCase();

    // IECA + ARM → hiperpotassemia
    if ((molLower.includes('enalap') || molLower.includes('ramip') || molLower.includes('losart')) &&
        (m.includes('espironolact') || m.includes('eplerenona'))) {
      restricoes.push({ tipo: 'interacao_moderada', descricao: 'IECA/BRA + Antagonista de aldosterona → risco de hiperpotassemia', criterio_ativado: `Uso concomitante de ${med_uso}`, fonte: 'Micromedex / PAIR', acao_recomendada: 'Monitorar K+ e Cr após 1 semana de combinação. Suspender se K+ > 5,5.', gravidade: 'moderada' });
    }
    // IECA + ARNI → contraindicação
    if ((molLower.includes('sacubitril') || molLower.includes('arni')) && (m.includes('enalap') || m.includes('ramip') || m.includes('captop'))) {
      restricoes.push({ tipo: 'contraindicacao_absoluta', descricao: 'ARNI + IECA concomitante → risco de angioedema grave', criterio_ativado: `Uso de ${med_uso} (IECA) concomitante`, fonte: 'FDA / ESC 2023', acao_recomendada: 'Washout obrigatório de 36h do IECA antes de iniciar ARNI.', gravidade: 'absoluta' });
    }
    // Estatina + Fibratos
    if ((molLower.includes('statina') || molLower.includes('rosuva') || molLower.includes('atorva')) && m.includes('fibratos')) {
      restricoes.push({ tipo: 'interacao_moderada', descricao: 'Estatina + Fibrato → risco aumentado de miopatia/rabdomiólise', criterio_ativado: `Uso concomitante de ${med_uso}`, fonte: 'FDA / ESC', acao_recomendada: 'Monitorar CPK. Evitar combinação estatina de alta potência + gemfibrozila.', gravidade: 'moderada' });
    }
  }

  // ── Trust score baixo ────────────────────────────────────────
  const trustScore = (med as unknown as Record<string, unknown>).trust_score as number | undefined;
  if (trustScore !== undefined && trustScore < 50) {
    restricoes.push({ tipo: 'guideline', descricao: `Trust Score baixo (${trustScore}/100) — evidência limitada para este perfil de paciente`, criterio_ativado: `Trust Score: ${trustScore}`, fonte: 'Motor de evidência Prescreve-AI', acao_recomendada: 'Considerar alternativa com maior grau de evidência para este perfil.', gravidade: 'leve' });
  }

  // ── Ajuste de dose renal/hepático se indicado ────────────────
  if (med.dose.ajuste_renal && tfg !== undefined && tfg < 60 && !restricoes.some(r => r.tipo === 'ajuste_dose')) {
    restricoes.push({ tipo: 'ajuste_dose', descricao: `TFG ${tfg} mL/min — ajuste de dose necessário`, criterio_ativado: `TFG ${tfg} mL/min`, fonte: 'Bula / KDIGO', acao_recomendada: med.dose.ajuste_renal, gravidade: 'leve' });
  }
  if (med.dose.ajuste_hepatico && albumina !== undefined && albumina < 3.0 && !restricoes.some(r => r.criterio_ativado.includes('Child'))) {
    restricoes.push({ tipo: 'ajuste_dose', descricao: `Albumina ${albumina} g/dL — possível ajuste hepático`, criterio_ativado: `Albumina ${albumina} g/dL`, fonte: 'Bula', acao_recomendada: med.dose.ajuste_hepatico, gravidade: 'leve' });
  }

  const tem_absoluta = restricoes.some(r => r.gravidade === 'absoluta');
  const n_graves = restricoes.filter(r => r.gravidade === 'grave' || r.gravidade === 'absoluta').length;
  const score_seguranca = Math.max(0, 100 - (tem_absoluta ? 60 : 0) - (n_graves * 15) - (restricoes.filter(r => r.gravidade === 'moderada').length * 8));

  const resumo = tem_absoluta
    ? `⛔ Contraindicação absoluta identificada — substituir ${med.molecula}.`
    : n_graves > 0
    ? `⚠ ${n_graves} restrição(ões) grave(s) — iniciar com cautela ou considerar alternativa.`
    : restricoes.length > 0
    ? `ℹ ${restricoes.length} ajuste(s) necessário(s) — prescrever com monitoramento.`
    : `✓ Nenhuma contraindicação ativa identificada para ${med.molecula} neste perfil.`;

  return {
    restricoes,
    tem_contraindicacao_absoluta: tem_absoluta,
    score_seguranca: Math.round(score_seguranca),
    resumo,
    alternativa_sugerida: tem_absoluta ? 'Consultar aba ALTERNATIVAS para substitutos' : undefined,
  };
}

// ══════════════════════════════════════════════════════════════
// MOTOR WHAT IF
// ══════════════════════════════════════════════════════════════

export function gerarWHATIF(
  cid: string,
  anamnese?: Anamnesis,
): RespostaWHATIF {
  const cid0 = cidPrincipal(cid);
  const cenarios = WHATIF_DB[cid0] ?? WHATIF_DB[cid] ?? [];

  // Score de adequação para ESTE paciente
  const cenariosScorados = cenarios.map(c => {
    let bonus = 0;
    const molLower = c.molecula.toLowerCase();
    if (molLower.includes('empagliflozina') || molLower.includes('dapagliflozina')) {
      if (temComorbidade(anamnese, 'diabetes', 'dm2') || temComorbidade(anamnese, 'insuficiência cardíaca', 'ic ')) bonus += 15;
      if (anamnese?.funcao_renal?.tfg !== undefined && anamnese.funcao_renal.tfg < 60) bonus += 10;
    }
    if (molLower.includes('metformina') && !temComorbidade(anamnese, 'diabetes', 'dm2')) bonus -= 20;
    if (c.disponivel_sus && bonus >= 0) bonus += 5;
    return { ...c, trust_score: Math.min(100, c.trust_score + bonus) };
  });

  const melhor_evidencia = cenariosScorados.reduce((a, b) => (b.nnt < a.nnt ? b : a), cenariosScorados[0])?.nome ?? '';
  const melhor_custo = cenariosScorados.reduce((a, b) => (b.custo_mensal_brl < a.custo_mensal_brl ? b : a), cenariosScorados[0])?.nome ?? '';
  const melhor_paciente = cenariosScorados.reduce((a, b) => (b.trust_score > a.trust_score ? b : a), cenariosScorados[0])?.nome ?? '';

  return {
    pergunta: `O que acontece se eu escolher diferentes tratamentos para ${cid0}?`,
    cenarios: cenariosScorados,
    recomendacao_analise: 'Compare NNT (menor = mais eficaz), custo e disponibilidade no SUS para adequar ao perfil do seu paciente.',
    melhor_custo_efetividade: melhor_custo,
    melhor_evidencia,
    melhor_perfil_paciente: melhor_paciente,
    disclaimer: 'Esta comparação é uma ferramenta de suporte. A decisão terapêutica final é do médico com base no contexto clínico completo.',
  };
}

// ══════════════════════════════════════════════════════════════
// MOTOR ALTERNATIVES
// ══════════════════════════════════════════════════════════════

export function gerarALTERNATIVAS(
  cid: string,
  _anamnese?: Anamnesis,
): RespostaALTERNATIVAS {
  const cid0 = cidPrincipal(cid);
  const db = ALTERNATIVAS_DB[cid0];

  if (!db) {
    return {
      cid: cid0,
      condicao: cid0,
      alternativas: [],
      nota_clinica: 'Base de alternativas não disponível para esta condição. Consulte as diretrizes específicas.',
      disclaimer: 'CDSS — Suporte à decisão. Decisão médica soberana.',
    };
  }

  return {
    cid: cid0,
    condicao: db.condicao,
    alternativas: db.alternativas,
    nota_clinica: db.nota,
    disclaimer: 'A escolha terapêutica segue: Diretriz → Classe → Molécula. A marca comercial NUNCA influencia a recomendação clínica baseada em evidências. Decisão final: médico.',
  };
}

// ══════════════════════════════════════════════════════════════
// EXPLAINABILITY SCORE
// ══════════════════════════════════════════════════════════════

export function calcularExplainabilityScore(
  why: RespostaWHY,
  whyNot: RespostaWHYNOT,
  med: TherapeuticSuggestion,
  anamnese?: Anamnesis,
): ExplainabilityScore {
  // Componentes do score
  const c_evidencia: ComponenteScore = {
    nome: 'Força da Evidência',
    peso: 30,
    valor: why.score_evidencia,
    descricao: `Nível ${why.justificativas_diretriz[0]?.nivel_evidencia ?? 'B'} — ${why.estudos_pivotais.length} estudo(s) pivotal(is)`,
  };

  const c_seguranca: ComponenteScore = {
    nome: 'Segurança / Contraindicações',
    peso: 25,
    valor: whyNot.score_seguranca,
    descricao: whyNot.tem_contraindicacao_absoluta
      ? 'Contraindicação absoluta ativa — avaliar substituição'
      : `${whyNot.restricoes.length} restrição(ões) identificada(s)`,
  };

  const medTrustScore = ((med as unknown as Record<string, unknown>).trust_score as number | undefined) ?? 70;
  const c_adequacao: ComponenteScore = {
    nome: 'Adequação ao Paciente',
    peso: 20,
    valor: medTrustScore,
    descricao: `Trust Score do motor de evidência: ${medTrustScore}/100`,
  };

  // Dados clínicos preenchidos → mais confiança
  const camposPreenchidos = [
    anamnese?.sinais_vitais?.pa_sistolica,
    anamnese?.sinais_vitais?.fc,
    anamnese?.funcao_renal?.creatinina ?? labNum(anamnese, 'creatinina'),
    anamnese?.funcao_renal?.tfg,
    anamnese?.comorbidades?.length,
    labNum(anamnese, 'hba1c'),
    labNum(anamnese, 'ldl'),
  ].filter(v => v !== undefined && v !== null).length;

  const c_dados_clinicos: ComponenteScore = {
    nome: 'Completude dos Dados Clínicos',
    peso: 15,
    valor: Math.min(100, Math.round((camposPreenchidos / 7) * 100)),
    descricao: `${camposPreenchidos}/7 parâmetros clínicos informados`,
  };

  const nntScore = why.beneficio_risco.nnt <= 10 ? 100 : why.beneficio_risco.nnt <= 25 ? 80 : why.beneficio_risco.nnt <= 50 ? 60 : 40;
  const c_nnt: ComponenteScore = {
    nome: 'Custo-Efetividade (NNT)',
    peso: 10,
    valor: nntScore,
    descricao: `NNT ${why.beneficio_risco.nnt} — ${why.beneficio_risco.horizonte_tempo}`,
  };

  const componentes = [c_evidencia, c_seguranca, c_adequacao, c_dados_clinicos, c_nnt];
  const score_total = Math.round(
    componentes.reduce((acc, c) => acc + (c.valor * c.peso) / 100, 0)
  );

  let nivel: ExplainabilityScore['nivel'];
  let cor: ExplainabilityScore['cor'];
  let interpretacao: string;

  if (score_total >= 85) { nivel = 'muito_alto'; cor = 'emerald'; interpretacao = 'Recomendação com alta explicabilidade clínica. Evidência sólida, sem contraindicações e dados completos.'; }
  else if (score_total >= 70) { nivel = 'alto'; cor = 'green'; interpretacao = 'Boa explicabilidade. Evidência consistente com ajustes menores necessários.'; }
  else if (score_total >= 55) { nivel = 'moderado'; cor = 'yellow'; interpretacao = 'Explicabilidade moderada. Revisar dados clínicos incompletos ou restrições identificadas.'; }
  else if (score_total >= 40) { nivel = 'baixo'; cor = 'orange'; interpretacao = 'Explicabilidade baixa. Evidência limitada ou contraindicações relevantes. Considerar alternativa.'; }
  else { nivel = 'muito_baixo'; cor = 'red'; interpretacao = 'Explicabilidade muito baixa. Contraindicação ativa ou ausência de dados suficientes. Revisar indicação.'; }

  return {
    score_total,
    nivel,
    cor,
    componentes,
    interpretacao,
    confiavel_para_prescricao: score_total >= 55 && !whyNot.tem_contraindicacao_absoluta,
  };
}

// ══════════════════════════════════════════════════════════════
// ORQUESTRADOR PRINCIPAL
// ══════════════════════════════════════════════════════════════

export function gerarExplainableAIv2(
  med: TherapeuticSuggestion,
  cid: string,
  anamnese?: Anamnesis,
): ExplainableAIv2Result {
  const why         = gerarWHY(med, anamnese);
  const why_not     = gerarWHYNOT(med, anamnese);
  const what_if     = gerarWHATIF(cid, anamnese);
  const alternatives = gerarALTERNATIVAS(cid, anamnese);
  const explainability_score = calcularExplainabilityScore(why, why_not, med, anamnese);

  return {
    why,
    why_not,
    what_if,
    alternatives,
    explainability_score,
    gerado_em: new Date().toISOString(),
    disclaimer: 'Sistema de Suporte à Decisão Clínica (CDSS). Todas as informações são apresentadas como suporte ao raciocínio médico. A decisão clínica final é exclusivamente do médico. Não realizar diagnóstico ou prescrição autônoma.',
  };
}
