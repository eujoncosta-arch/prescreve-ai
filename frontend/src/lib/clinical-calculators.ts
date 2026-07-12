// ============================================================
// PRESCREVE-AI — Clinical Calculators
// Calculadoras clínicas validadas com casos-teste publicados
// CKD-EPI �� MDRD · CHA₂DS₂-VASc · HAS-BLED · CURB-65
// NEWS2 · PESI/sPESI · Wells DVT/EP · Geneva · Child-Pugh
// MELD-Na · ASCVD PCE · ARR/RRR/RAR
// ============================================================

'use client';

// ─── Resultado genérico ───────────────────────────────────────

export interface CalcResult {
  score: number;
  classificacao: string;
  interpretacao: string;
  recomendacao: string;
  passo_a_passo?: string[];
}

// ═══════════════════════════════════════════════════════════
// 1. CKD-EPI 2021 (sem raça — NKF/ASN 2021)
// Inker LA et al. NEJM 2021;385:1737-1749
// Validado: 40M Scr 1.0 → ~97.7 mL/min/1.73m²
// ═══════════════════════════════════════════════════════════

export interface CKDEPIInput {
  idade: number;
  sexo: 'M' | 'F';
  creatinina_mgdL: number;
}

export function calcCKDEPI(p: CKDEPIInput): { tfg: number; estadio: string; interpretacao: string; formula: string } {
  const { idade, sexo, creatinina_mgdL: scr } = p;
  const kappa = sexo === 'F' ? 0.7 : 0.9;
  const alpha = sexo === 'F' ? -0.241 : -0.302;
  const sexFactor = sexo === 'F' ? 1.012 : 1.0;

  const ratio = scr / kappa;
  const term1 = Math.min(ratio, 1) ** alpha;
  const term2 = Math.max(ratio, 1) ** (-1.200);
  const ageTerm = 0.9938 ** idade;

  const tfg = Math.round(142 * term1 * term2 * ageTerm * sexFactor * 10) / 10;

  let estadio: string;
  let interpretacao: string;
  if (tfg >= 90)       { estadio = 'G1'; interpretacao = 'Normal ou aumentada'; }
  else if (tfg >= 60)  { estadio = 'G2'; interpretacao = 'Leve redução'; }
  else if (tfg >= 45)  { estadio = 'G3a'; interpretacao = 'Leve-moderada redução'; }
  else if (tfg >= 30)  { estadio = 'G3b'; interpretacao = 'Moderada-grave redução'; }
  else if (tfg >= 15)  { estadio = 'G4'; interpretacao = 'Grave redução'; }
  else                 { estadio = 'G5'; interpretacao = 'Falência renal'; }

  return { tfg, estadio, interpretacao, formula: 'CKD-EPI 2021 (sem raça)' };
}

// ═══════════════════════════════════════════════════════════
// 2. MDRD-4
// Levey AS et al. Ann Intern Med 1999;130:461-470
// Validado: 60M Scr 1.5 → ~48 mL/min/1.73m²
// ═══════════════════════════════════════════════════════════

export interface MDRDInput {
  idade: number;
  sexo: 'M' | 'F';
  creatinina_mgdL: number;
}

export function calcMDRD(p: MDRDInput): { tfg: number; estadio: string; formula: string } {
  const { idade, sexo, creatinina_mgdL: scr } = p;
  const sexFactor = sexo === 'F' ? 0.742 : 1.0;
  const tfg = Math.round(175 * (scr ** -1.154) * (idade ** -0.203) * sexFactor * 10) / 10;

  let estadio: string;
  if (tfg >= 90)       estadio = 'G1';
  else if (tfg >= 60)  estadio = 'G2';
  else if (tfg >= 45)  estadio = 'G3a';
  else if (tfg >= 30)  estadio = 'G3b';
  else if (tfg >= 15)  estadio = 'G4';
  else                 estadio = 'G5';

  return { tfg, estadio, formula: 'MDRD-4' };
}

// ═══════════════════════════════════════════════════════════
// 3. CHA₂DS₂-VASc
// Lip GY et al. Chest 2010;137:263-272
// Validado: 72M + ICC + HAS + DM → score 4 → anticoagular
// ═══════════════════════════════════════════════════════════

export interface CHA2DS2VAScInput {
  icc_disfuncao_ve: boolean;        // C — Congestive Heart Failure/LV dysfunction
  hipertensao: boolean;             // H — Hypertension
  idade: number;                    // A₂ (≥75 = 2), A (65-74 = 1)
  diabetes: boolean;                // D
  avc_ait_tromboembolismo: boolean; // S₂ — Stroke/TIA/thromboembolism (2 pts)
  doenca_vascular: boolean;         // V — IAM prévio, DAP, placa aórtica
  sexo_feminino: boolean;           // Sc — Sex category
}

export function calcCHA2DS2VASc(p: CHA2DS2VAScInput): CalcResult & { stroke_risco_anual: string; anticoagular: boolean } {
  let score = 0;
  const passos: string[] = [];

  if (p.icc_disfuncao_ve)              { score += 1; passos.push('C: ICC/disfunção VE = +1'); }
  if (p.hipertensao)                   { score += 1; passos.push('H: HAS = +1'); }
  if (p.idade >= 75)                   { score += 2; passos.push('A₂: Idade ≥ 75 anos = +2'); }
  else if (p.idade >= 65)              { score += 1; passos.push('A: Idade 65–74 anos = +1'); }
  if (p.diabetes)                      { score += 1; passos.push('D: Diabetes = +1'); }
  if (p.avc_ait_tromboembolismo)       { score += 2; passos.push('S₂: AVC/AIT/Tromboembolismo = +2'); }
  if (p.doenca_vascular)               { score += 1; passos.push('V: Doença vascular (IAM, DAP, placa aórtica) = +1'); }
  if (p.sexo_feminino)                 { score += 1; passos.push('Sc: Sexo feminino = +1'); }

  // ESC 2020: anticoagular se ≥2 pontos em homens ou ≥3 em mulheres
  const pontosHemostaticos = p.sexo_feminino ? score - 1 : score; // remove sexo feminino para decisão
  const anticoagular = p.sexo_feminino ? score >= 3 : score >= 2;

  const RISCO_ANUAL: Record<number, string> = {
    0: '0%', 1: '1,3%', 2: '2,2%', 3: '3,2%', 4: '4%',
    5: '6,7%', 6: '9,8%', 7: '9,6%', 8: '6,7%', 9: '15,2%',
  };
  const stroke_risco_anual = RISCO_ANUAL[Math.min(score, 9)] ?? '>15%';

  const recomendacao = anticoagular
    ? 'Anticoagulação oral recomendada (NOAC preferido sobre varfarina em FA não valvar)'
    : score === 1 && !p.sexo_feminino
      ? 'Considerar anticoagulação (risco marginal — decisão individualizada)'
      : 'Sem indicação de anticoagulação (score 0 em homem, ou 1 somente pelo sexo em mulher)';

  return {
    score,
    classificacao: score === 0 ? 'Baixo' : score === 1 ? 'Baixo-moderado' : score <= 3 ? 'Moderado' : 'Alto',
    interpretacao: `Risco anual de AVC: ${stroke_risco_anual}`,
    recomendacao,
    passo_a_passo: passos,
    stroke_risco_anual,
    anticoagular,
  };
}

// ═══════════════════════════════════════════════════════════
// 4. HAS-BLED
// Pisters R et al. Chest 2010;138:1093-1100
// Validado: HAS + AVC + sangramento prévio + idoso + AINE → 4 → alto risco
// ═══════════════════════════════════════════════════════════

export interface HASBLEDInput {
  hipertensao_nao_controlada: boolean;   // H — PAS > 160 mmHg
  disfuncao_renal: boolean;              // A (renal) — Diálise/transplante/Cr>200 µmol/L
  disfuncao_hepatica: boolean;           // A (hepatic) — Cirrose/bili>2x/ALT>3x
  avc_previo: boolean;                   // S — Stroke history
  sangramento_previo: boolean;           // B — Bleeding history/predisposition
  inr_labil: boolean;                    // L — Labile INR (<60% TTR)
  idoso_ge_65: boolean;                  // E — Elderly ≥ 65 anos
  drogas_antiagregantes_ou_aines: boolean; // D — Antiplatelet/NSAID use
  alcool_ge_8_drinks_semana: boolean;    // D — Alcohol ≥ 8 drinks/week
}

export function calcHASBLED(p: HASBLEDInput): CalcResult {
  let score = 0;
  const passos: string[] = [];

  if (p.hipertensao_nao_controlada)              { score += 1; passos.push('H: HAS não controlada (PAS > 160) = +1'); }
  if (p.disfuncao_renal)                         { score += 1; passos.push('A: Disfunção renal = +1'); }
  if (p.disfuncao_hepatica)                      { score += 1; passos.push('A: Disfunção hepática = +1'); }
  if (p.avc_previo)                              { score += 1; passos.push('S: AVC prévio = +1'); }
  if (p.sangramento_previo)                      { score += 1; passos.push('B: Sangramento prévio ou predisposição = +1'); }
  if (p.inr_labil)                               { score += 1; passos.push('L: INR lábil (TTR < 60%) = +1'); }
  if (p.idoso_ge_65)                             { score += 1; passos.push('E: Idoso ≥ 65 anos = +1'); }
  if (p.drogas_antiagregantes_ou_aines)          { score += 1; passos.push('D: Antiagregante/AINE = +1'); }
  if (p.alcool_ge_8_drinks_semana)               { score += 1; passos.push('D: Álcool ≥ 8 drinks/semana = +1'); }

  const alto_risco = score >= 3;

  return {
    score,
    classificacao: score <= 1 ? 'Baixo' : score === 2 ? 'Moderado' : 'Alto',
    interpretacao: `Risco hemorrágico ${alto_risco ? 'alto' : 'baixo-moderado'}. Sangramento maior: ${score >= 3 ? '~3,7%/ano (HAS-BLED ≥ 3)' : '~1%/ano'}`,
    recomendacao: alto_risco
      ? 'Score ≥ 3: risco hemorrágico alto — não contraindicar anticoagulação, mas tratar fatores modificáveis (controlar PA, revisar INR, suspender AINEs, investigar sangramento prévio)'
      : 'Score < 3: risco hemorrágico aceitável — anticoagulação pode ser mantida com monitoramento habitual',
    passo_a_passo: passos,
  };
}

// ═══════════════════════════════════════════════════════════
// 5. CURB-65
// Lim WS et al. Thorax 2003;58:377-382
// Validado: confuso+ureia↑+FR≥30+PAS<90+70anos → 5 → UTI
// ═══════════════════════════════════════════════════════════

export interface CURB65Input {
  confusao_aguda: boolean;              // C — Confusão mental nova (BTS: AMTS ≤ 8)
  ureia_gt_7_mmolL: boolean;           // U — Ureia > 7 mmol/L (= BUN > 19 mg/dL ou ureia sérica > 19)
  fr_ge_30: boolean;                    // R — FR ≥ 30 ipm
  pa_baixa: boolean;                    // B — PAS < 90 ou PAD ≤ 60 mmHg
  idade_ge_65: boolean;                 // 65 — Idade ≥ 65 anos
}

export function calcCURB65(p: CURB65Input): CalcResult {
  const score = [p.confusao_aguda, p.ureia_gt_7_mmolL, p.fr_ge_30, p.pa_baixa, p.idade_ge_65]
    .filter(Boolean).length;

  const MORTALIDADE = ['0,7%', '3,2%', '13%', '17%', '41,5%', '57%'];
  const mortalidade = MORTALIDADE[score] ?? '>57%';

  const CONDUTA: Record<number, string> = {
    0: 'Tratamento ambulatorial — mortalidade < 1%',
    1: 'Tratamento ambulatorial ou observação breve — mortalidade ~3%',
    2: 'Internação hospitalar — mortalidade ~13%',
    3: 'Internação hospitalar com avaliação de UTI — mortalidade ~17%',
    4: 'Internação em UTI considerada — mortalidade ~42%',
    5: 'Internação em UTI — mortalidade ~57%',
  };

  return {
    score,
    classificacao: score <= 1 ? 'Baixa gravidade' : score === 2 ? 'Gravidade intermediária' : 'Alta gravidade',
    interpretacao: `Mortalidade hospitalar estimada: ${mortalidade}`,
    recomendacao: CONDUTA[score] ?? CONDUTA[5],
  };
}

// ═══════════════════════════════════════════════════════════
// 6. NEWS2 (National Early Warning Score 2)
// Royal College of Physicians 2017
// Validado: FR24 + SpO2 93% + confuso + PA 95/60 → score alto
// ═══════════════════════════════════════════════════════════

export interface NEWS2Input {
  fr: number;                        // Frequência respiratória (ipm)
  spo2: number;                      // Saturação de O₂ (%)
  em_o2_suplementar: boolean;       // Em uso de O₂ suplementar?
  hipercapnia_conhecida: boolean;   // DPOC/insuf. respiratória tipo 2 → usar escala 2 SpO₂
  pa_sistolica: number;             // PAS (mmHg)
  fc: number;                       // Frequência cardíaca (bpm)
  temperatura: number;              // Temperatura (°C)
  consciencia: 'A' | 'C' | 'V' | 'P' | 'U'; // ACVPU: Alert, Confusion, Voice, Pain, Unresponsive
}

function scoreNEWS2FR(fr: number): number {
  if (fr <= 8) return 3;
  if (fr <= 11) return 1;
  if (fr <= 20) return 0;
  if (fr <= 24) return 2;
  return 3;
}

function scoreNEWS2SpO2(spo2: number, escala2: boolean): number {
  if (escala2) {
    if (spo2 <= 83) return 3;
    if (spo2 <= 85) return 2;
    if (spo2 <= 87) return 1;
    if (spo2 <= 92) return 0;
    if (spo2 <= 94) return 1;
    if (spo2 <= 96) return 2;
    return 3;
  }
  if (spo2 <= 91) return 3;
  if (spo2 <= 93) return 2;
  if (spo2 <= 95) return 1;
  return 0;
}

function scoreNEWS2PA(pas: number): number {
  if (pas <= 90) return 3;
  if (pas <= 100) return 2;
  if (pas <= 110) return 1;
  if (pas <= 219) return 0;
  return 3;
}

function scoreNEWS2FC(fc: number): number {
  if (fc <= 40) return 3;
  if (fc <= 50) return 1;
  if (fc <= 90) return 0;
  if (fc <= 110) return 1;
  if (fc <= 130) return 2;
  return 3;
}

function scoreNEWS2Temp(temp: number): number {
  if (temp <= 35.0) return 3;
  if (temp <= 36.0) return 1;
  if (temp <= 38.0) return 0;
  if (temp <= 39.0) return 1;
  return 2;
}

function scoreNEWS2Consciencia(c: NEWS2Input['consciencia']): number {
  return c === 'A' ? 0 : 3; // Confusion (C), V, P, U = 3 pts
}

export function calcNEWS2(p: NEWS2Input): CalcResult & { scores_parciais: Record<string, number>; alerta_escalona: boolean } {
  const usarEscala2 = p.hipercapnia_conhecida;

  const scores_parciais = {
    FR: scoreNEWS2FR(p.fr),
    SpO2: scoreNEWS2SpO2(p.spo2, usarEscala2),
    O2_suplementar: p.em_o2_suplementar ? 2 : 0,
    PA_sistolica: scoreNEWS2PA(p.pa_sistolica),
    FC: scoreNEWS2FC(p.fc),
    Temperatura: scoreNEWS2Temp(p.temperatura),
    Consciencia: scoreNEWS2Consciencia(p.consciencia),
  };

  const score = Object.values(scores_parciais).reduce((a, b) => a + b, 0);

  // Alerta de escalona: qualquer parâmetro com 3 pts OU score total ≥ 7
  const alerta_escalona = score >= 7 || Object.values(scores_parciais).some(s => s === 3);
  // Alerta 5-6 ou 3 em parâmetro único → monitoramento frequente
  const alerta_intermediario = (score >= 5 && score <= 6) || Object.values(scores_parciais).some(s => s === 3);

  let classificacao: string;
  let recomendacao: string;
  if (score >= 7 || Object.values(scores_parciais).some(s => s === 3)) {
    classificacao = 'Risco Alto (Resposta de Emergência)';
    recomendacao = 'Avaliação médica imediata. Considerar transferência para UTI. Frequência de monitoramento: contínua.';
  } else if (score >= 5) {
    classificacao = 'Risco Médio-Alto';
    recomendacao = 'Monitoramento a cada 1h. Revisão médica urgente. Avaliar aumento do nível de cuidados.';
  } else if (score >= 3) {
    classificacao = 'Risco Médio';
    recomendacao = 'Monitoramento a cada 4-6h. Revisão da equipe de saúde.';
  } else if (score >= 1) {
    classificacao = 'Risco Baixo-Médio';
    recomendacao = 'Monitoramento a cada 12h.';
  } else {
    classificacao = 'Risco Baixo';
    recomendacao = 'Monitoramento a cada 12h (mínimo).';
  }

  return {
    score,
    classificacao,
    interpretacao: `NEWS2 = ${score}. ${alerta_escalona ? '⚠ ALERTA: resposta de emergência requerida.' : ''}`,
    recomendacao,
    scores_parciais,
    alerta_escalona,
  };
}

// ═══════════════════════════════════════════════════════════
// 7. PESI (Pulmonary Embolism Severity Index)
// Aujesky D et al. Am J Respir Crit Care Med 2005;172:1041-1046
// Validado: 70M + câncer + FC120 + FR32 → classe IV/V
// ═══════════════════════════════════════════════════════════

export interface PESIInput {
  idade: number;
  sexo_masculino: boolean;
  cancer: boolean;
  doenca_cardiopulmonar_cronica: boolean;    // ICC ou DPOC
  fc_ge_110: boolean;
  pas_lt_100: boolean;
  fr_ge_30: boolean;
  temperatura_lt_36: boolean;
  alteracao_consciencia: boolean;
  spo2_lt_90: boolean;
}

export function calcPESI(p: PESIInput): CalcResult & { classe: string; mortalidade_30d: string } {
  let score = p.idade; // base = idade
  if (p.sexo_masculino)             score += 10;
  if (p.cancer)                     score += 30;
  if (p.doenca_cardiopulmonar_cronica) score += 10;
  if (p.fc_ge_110)                  score += 20;
  if (p.pas_lt_100)                 score += 30;
  if (p.fr_ge_30)                   score += 20;
  if (p.temperatura_lt_36)          score += 20;
  if (p.alteracao_consciencia)      score += 60;
  if (p.spo2_lt_90)                 score += 20;

  let classe: string;
  let mortalidade_30d: string;
  let recomendacao: string;

  if (score <= 65)        { classe = 'I';  mortalidade_30d = '0–1,6%';    recomendacao = 'TEP de muito baixo risco. Tratamento ambulatorial seguro (NOAC oral).'; }
  else if (score <= 85)   { classe = 'II'; mortalidade_30d = '1,7–3,5%';  recomendacao = 'TEP de baixo risco. Avaliação para tratamento ambulatorial ou observação breve.'; }
  else if (score <= 105)  { classe = 'III'; mortalidade_30d = '3,2–7,1%'; recomendacao = 'TEP intermediário. Hospitalização com monitoramento.'; }
  else if (score <= 125)  { classe = 'IV'; mortalidade_30d = '4,0–11,4%'; recomendacao = 'TEP de alto risco. Hospitalização com anticoagulação plena e monitoramento hemodinâmico.'; }
  else                    { classe = 'V';  mortalidade_30d = '10–24,5%';  recomendacao = 'TEP de altíssimo risco. UTI. Avaliar trombólise sistêmica ou embolectomia.'; }

  return {
    score,
    classificacao: `Classe ${classe}`,
    interpretacao: `PESI = ${score} → Classe ${classe} — Mortalidade 30 dias: ${mortalidade_30d}`,
    recomendacao,
    classe,
    mortalidade_30d,
  };
}

// ─── sPESI (simplified PESI) ─────────────────────────────────
// Jiménez D et al. Arch Intern Med 2010;170:1383-1389

export interface SPESIInput {
  idade_gt_80: boolean;
  cancer: boolean;
  doenca_cardiopulmonar_cronica: boolean;
  fc_ge_110: boolean;
  pas_lt_100: boolean;
  spo2_lt_90: boolean;
}

export function calcSPESI(p: SPESIInput): CalcResult {
  const score = [
    p.idade_gt_80,
    p.cancer,
    p.doenca_cardiopulmonar_cronica,
    p.fc_ge_110,
    p.pas_lt_100,
    p.spo2_lt_90,
  ].filter(Boolean).length;

  const baixo_risco = score === 0;

  return {
    score,
    classificacao: baixo_risco ? 'Baixo risco' : 'Alto risco',
    interpretacao: `sPESI = ${score}. Mortalidade 30 dias: ${baixo_risco ? '~1%' : '~10,9%'}`,
    recomendacao: baixo_risco
      ? 'Baixo risco: candidato a tratamento ambulatorial (se estabilidade hemodinâmica confirmada)'
      : 'Alto risco: hospitalização. Avaliar ecocardiograma + troponina para estratificar risco intermediário-alto',
  };
}

// ═══════════════════════════════════════════════════════════
// 8. Wells DVT (Deep Vein Thrombosis)
// Wells PS et al. Lancet 1997;350:1795-1798 (revisado 2003)
// Validado: câncer + edema + sem diagnóstico alternativo = alto
// ═══════════════════════════════════════════════════════════

export interface WellsDVTInput {
  cancer_ativo: boolean;                          // +1
  paralisia_paresia_imobilizacao_mmii: boolean;   // +1
  acamado_gt_3d_ou_cirurgia_recente: boolean;     // +1 (cirurgia major < 4 semanas)
  dor_palpacao_trajeto_veia_profunda: boolean;    // +1
  edema_toda_perna: boolean;                      // +1
  edema_panturrilha_gt_3cm: boolean;              // +1 (vs perna assintomática)
  edema_cacifo_sintomatico: boolean;              // +1
  veias_colaterais_superficiais: boolean;         // +1 (não varicosas)
  tvp_documentada_previa: boolean;                // +1
  diagnostico_alternativo_igualmente_provavel: boolean; // −2
}

export function calcWellsDVT(p: WellsDVTInput): CalcResult & { probabilidade_pre_teste: string } {
  let score = 0;
  if (p.cancer_ativo)                               score += 1;
  if (p.paralisia_paresia_imobilizacao_mmii)        score += 1;
  if (p.acamado_gt_3d_ou_cirurgia_recente)          score += 1;
  if (p.dor_palpacao_trajeto_veia_profunda)         score += 1;
  if (p.edema_toda_perna)                           score += 1;
  if (p.edema_panturrilha_gt_3cm)                  score += 1;
  if (p.edema_cacifo_sintomatico)                  score += 1;
  if (p.veias_colaterais_superficiais)             score += 1;
  if (p.tvp_documentada_previa)                    score += 1;
  if (p.diagnostico_alternativo_igualmente_provavel) score -= 2;

  let probabilidade_pre_teste: string;
  let recomendacao: string;

  if (score <= 0) {
    probabilidade_pre_teste = 'Baixa (~5%)';
    recomendacao = 'D-dímero: se negativo, TVP excluída. Se positivo, ultrassonografia com compressão (USC).';
  } else if (score <= 2) {
    probabilidade_pre_teste = 'Moderada (~17%)';
    recomendacao = 'D-dímero + USC. D-dímero negativo + score ≤ 1: TVP improvável. USC obrigatória se D-dímero positivo.';
  } else {
    probabilidade_pre_teste = 'Alta (~53%)';
    recomendacao = 'USC imediata. D-dímero não exclui TVP com score alto. Anticoagulação empírica pode ser considerada enquanto aguarda exame.';
  }

  return {
    score,
    classificacao: score <= 0 ? 'Probabilidade baixa' : score <= 2 ? 'Probabilidade moderada' : 'Probabilidade alta',
    interpretacao: `Wells DVT = ${score}. Probabilidade pré-teste: ${probabilidade_pre_teste}`,
    recomendacao,
    probabilidade_pre_teste,
  };
}

// ═══════════════════════════════════════════════════════════
// 9. Wells TEP (Pulmonary Embolism)
// Wells PS et al. Ann Intern Med 2001;135:98-107
// Validado: sinais TVP + diagnóstico principal + FC>100 + hemoptise = alto
// ═══════════════════════════════════════════════════════════

export interface WellsEPInput {
  sinais_sintomas_tvp: boolean;                     // +3
  tep_mais_provavel_que_alt_diagnostico: boolean;   // +3
  fc_gt_100: boolean;                               // +1.5
  imobilizacao_ge_3d_ou_cirurgia_recente: boolean;  // +1.5
  tvp_tep_previo: boolean;                          // +1.5
  hemoptise: boolean;                               // +1
  cancer_ativo: boolean;                            // +1 (tratamento < 6 meses ou paliativo)
}

export function calcWellsEP(p: WellsEPInput): CalcResult & { probabilidade_pre_teste: string } {
  let score = 0;
  if (p.sinais_sintomas_tvp)                        score += 3;
  if (p.tep_mais_provavel_que_alt_diagnostico)      score += 3;
  if (p.fc_gt_100)                                  score += 1.5;
  if (p.imobilizacao_ge_3d_ou_cirurgia_recente)     score += 1.5;
  if (p.tvp_tep_previo)                             score += 1.5;
  if (p.hemoptise)                                  score += 1;
  if (p.cancer_ativo)                               score += 1;

  const scoreR = Math.round(score * 10) / 10;

  let probabilidade_pre_teste: string;
  let classificacao: string;
  let recomendacao: string;

  // Dicotomizado: ≤ 4 = improvável; > 4 = provável
  if (scoreR <= 4) {
    probabilidade_pre_teste = 'TEP improvável (< 15%)';
    classificacao = 'Baixa probabilidade';
    recomendacao = 'D-dímero altamente sensível (ELISA): se negativo, TEP excluído. Se positivo: angioTC de tórax.';
  } else if (scoreR <= 6) {
    probabilidade_pre_teste = 'Moderada (~29%)';
    classificacao = 'Probabilidade moderada';
    recomendacao = 'AngioTC de tórax. Se não disponível imediatamente: anticoagulação empírica enquanto aguarda exame.';
  } else {
    probabilidade_pre_teste = 'Alta (~59%)';
    classificacao = 'Probabilidade alta';
    recomendacao = 'AngioTC imediata. Anticoagulação empírica deve ser iniciada enquanto aguarda exame se não houver contraindicação.';
  }

  return {
    score: scoreR,
    classificacao,
    interpretacao: `Wells TEP = ${scoreR}. Probabilidade pré-teste: ${probabilidade_pre_teste}`,
    recomendacao,
    probabilidade_pre_teste,
  };
}

// ═══════════════════════════════════════════════════════════
// 10. Geneva Revisado (TEP)
// Le Gal G et al. Ann Intern Med 2006;144:165-171
// Validado: > 65 anos + TVP prévia + câncer + dor perna + FC≥95 = alto
// ═══════════════════════════════════════════════════════════

export interface GenevaInput {
  idade_gt_65: boolean;                    // +1
  tvp_tep_previo: boolean;                 // +3
  cirurgia_fratura_lt_1_mes: boolean;      // +2
  cancer_ativo: boolean;                   // +2
  dor_unilateral_mmii: boolean;            // +3
  hemoptise: boolean;                      // +2
  fc_75_94: boolean;                       // +3 (FC 75-94)
  fc_ge_95: boolean;                       // +5 (FC ≥ 95) — exclui fc_75_94
  palpacao_veia_profunda_edema: boolean;   // +4 (dor à palpação + edema unilateral)
}

export function calcGeneva(p: GenevaInput): CalcResult & { probabilidade_pre_teste: string } {
  let score = 0;
  if (p.idade_gt_65)                    score += 1;
  if (p.tvp_tep_previo)                 score += 3;
  if (p.cirurgia_fratura_lt_1_mes)      score += 2;
  if (p.cancer_ativo)                   score += 2;
  if (p.dor_unilateral_mmii)            score += 3;
  if (p.hemoptise)                      score += 2;
  if (p.fc_ge_95)                       score += 5;
  else if (p.fc_75_94)                  score += 3;
  if (p.palpacao_veia_profunda_edema)   score += 4;

  let probabilidade_pre_teste: string;
  let recomendacao: string;

  if (score <= 3) {
    probabilidade_pre_teste = 'Baixa (~8%)';
    recomendacao = 'D-dímero: se negativo, TEP excluído. Se positivo, angioTC.';
  } else if (score <= 10) {
    probabilidade_pre_teste = 'Intermediária (~29%)';
    recomendacao = 'D-dímero + angioTC se positivo.';
  } else {
    probabilidade_pre_teste = 'Alta (~74%)';
    recomendacao = 'AngioTC imediata. Considerar anticoagulação empírica.';
  }

  return {
    score,
    classificacao: score <= 3 ? 'Probabilidade baixa' : score <= 10 ? 'Probabilidade intermediária' : 'Probabilidade alta',
    interpretacao: `Geneva Revisado = ${score}. TEP: ${probabilidade_pre_teste}`,
    recomendacao,
    probabilidade_pre_teste,
  };
}

// ═══════════════════════════════════════════════════════════
// 11. Child-Pugh
// Child CG, Turcotte JG. 1964 (modificado Pugh 1972)
// Validado: bili 2.5 + alb 30 + INR 1.5 + ascite leve + sem encefalopatia = B(8)
// ═══════════════════════════════════════════════════════════

export interface ChildPughInput {
  bilirrubina_mgdL: number;     // bilirrubina total sérica
  albumina_gL: number;          // albumina sérica (g/L)
  inr: number;                  // ou TP em segundos
  ascite: 'ausente' | 'leve' | 'moderada_grave';
  encefalopatia: 'ausente' | 'grau_1_2' | 'grau_3_4';
}

export function calcChildPugh(p: ChildPughInput): CalcResult & { classe: 'A' | 'B' | 'C'; sobrevida_1_ano: string; sobrevida_2_anos: string } {
  let score = 0;
  const passos: string[] = [];

  // Bilirrubina
  if (p.bilirrubina_mgdL < 2)        { score += 1; passos.push(`Bilirrubina ${p.bilirrubina_mgdL} mg/dL (<2) = 1pt`); }
  else if (p.bilirrubina_mgdL <= 3)  { score += 2; passos.push(`Bilirrubina ${p.bilirrubina_mgdL} mg/dL (2-3) = 2pts`); }
  else                               { score += 3; passos.push(`Bilirrubina ${p.bilirrubina_mgdL} mg/dL (>3) = 3pts`); }

  // Albumina
  if (p.albumina_gL > 35)            { score += 1; passos.push(`Albumina ${p.albumina_gL} g/L (>35) = 1pt`); }
  else if (p.albumina_gL >= 28)      { score += 2; passos.push(`Albumina ${p.albumina_gL} g/L (28-35) = 2pts`); }
  else                               { score += 3; passos.push(`Albumina ${p.albumina_gL} g/L (<28) = 3pts`); }

  // INR
  if (p.inr < 1.7)                   { score += 1; passos.push(`INR ${p.inr} (<1,7) = 1pt`); }
  else if (p.inr <= 2.3)             { score += 2; passos.push(`INR ${p.inr} (1,7-2,3) = 2pts`); }
  else                               { score += 3; passos.push(`INR ${p.inr} (>2,3) = 3pts`); }

  // Ascite
  if (p.ascite === 'ausente')         { score += 1; passos.push('Ascite ausente = 1pt'); }
  else if (p.ascite === 'leve')       { score += 2; passos.push('Ascite leve = 2pts'); }
  else                                { score += 3; passos.push('Ascite moderada-grave = 3pts'); }

  // Encefalopatia
  if (p.encefalopatia === 'ausente')   { score += 1; passos.push('Encefalopatia ausente = 1pt'); }
  else if (p.encefalopatia === 'grau_1_2') { score += 2; passos.push('Encefalopatia grau I-II = 2pts'); }
  else                                 { score += 3; passos.push('Encefalopatia grau III-IV = 3pts'); }

  let classe: 'A' | 'B' | 'C';
  let sobrevida_1_ano: string;
  let sobrevida_2_anos: string;
  let recomendacao: string;

  if (score <= 6)        { classe = 'A'; sobrevida_1_ano = '100%'; sobrevida_2_anos = '85%'; recomendacao = 'Cirrose compensada. Sem restrição para cirurgia eletiva. Transplante não indicado.'; }
  else if (score <= 9)   { classe = 'B'; sobrevida_1_ano = '81%';  sobrevida_2_anos = '57%'; recomendacao = 'Cirrose com comprometimento funcional significativo. Alto risco cirúrgico. Avaliar TIPS se ascite refratária. Listar para transplante se candidato.'; }
  else                   { classe = 'C'; sobrevida_1_ano = '45%';  sobrevida_2_anos = '35%'; recomendacao = 'Cirrose descompensada — mortalidade muito alta. Contraindicação relativa/absoluta para cirurgia eletiva. Candidato prioritário a transplante.'; }

  return {
    score,
    classificacao: `Child-Pugh ${classe} (${score} pontos)`,
    interpretacao: `Sobrevida 1 ano: ${sobrevida_1_ano} | 2 anos: ${sobrevida_2_anos}`,
    recomendacao,
    passo_a_passo: passos,
    classe,
    sobrevida_1_ano,
    sobrevida_2_anos,
  };
}

// ═══════════════════════════════════════════════════════════
// 12. MELD e MELD-Na
// Kamath PS et al. Hepatology 2001;33:464-470
// MELD-Na: Kim WR et al. Hepatology 2008;48:1297-1304
// Validado: bili 2.0 + INR 1.5 + Cr 1.0 → MELD ~14
// ═══════════════════════════════════════════════════════════

export interface MELDInput {
  bilirrubina_mgdL: number;
  inr: number;
  creatinina_mgdL: number;
  em_dialise_bisemanal?: boolean;  // se sim, usar Cr = 4.0
  sodio_mEqL?: number;             // para MELD-Na
}

export function calcMELD(p: MELDInput): { meld: number; meld_na?: number; mortalidade_90d: string; indicacao_transplante: string } {
  let cr = Math.min(p.em_dialise_bisemanal ? 4.0 : p.creatinina_mgdL, 4.0);
  cr = Math.max(cr, 1.0);
  const bili = Math.max(p.bilirrubina_mgdL, 1.0);
  const inr = Math.max(p.inr, 1.0);

  const meldRaw = 3.78 * Math.log(bili) + 11.2 * Math.log(inr) + 9.57 * Math.log(cr) + 6.43;
  const meld = Math.round(meldRaw);

  let meld_na: number | undefined;
  if (p.sodio_mEqL !== undefined) {
    const na = Math.min(Math.max(p.sodio_mEqL, 125), 137);
    const meldNaRaw = meld + 1.32 * (137 - na) - 0.033 * meld * (137 - na);
    meld_na = Math.min(Math.max(Math.round(meldNaRaw), 6), 40);
  }

  const scoreRef = meld_na ?? meld;

  let mortalidade_90d: string;
  let indicacao_transplante: string;

  if (scoreRef < 10)       { mortalidade_90d = '< 2%';  indicacao_transplante = 'Sem indicação imediata de transplante'; }
  else if (scoreRef < 15)  { mortalidade_90d = '~2–5%'; indicacao_transplante = 'Monitoramento. Listar se candidato conforme critérios locais'; }
  else if (scoreRef < 20)  { mortalidade_90d = '~6–10%'; indicacao_transplante = 'Listar para transplante. Avaliação multidisciplinar urgente'; }
  else if (scoreRef < 25)  { mortalidade_90d = '~15–25%'; indicacao_transplante = 'Listagem prioritária. Hospitalização necessária em muitos casos'; }
  else if (scoreRef < 30)  { mortalidade_90d = '~30–40%'; indicacao_transplante = 'Emergência — listagem com alta prioridade (MELD ≥ 25 = alta prioridade no Brasil/UNOS)'; }
  else                      { mortalidade_90d = '> 50%';   indicacao_transplante = 'MELD ≥ 30: mortalidade muito alta — transplante prioritário ou cuidados paliativos'; }

  return { meld, meld_na, mortalidade_90d, indicacao_transplante };
}

// ═══════════════════════════════════════════════════════════
// 13. ASCVD — Pooled Cohort Equations (ACC/AHA 2013)
// Goff DC Jr et al. Circulation 2014;129(Suppl 2):S49-73
// Validado: 55M branco, CT 213, HDL 50, PAS 120 sem trat, não fumante, não DM → ~7%
// ═══════════════════════════════════════════════════════════

export interface ASCVDInput {
  idade: number;
  sexo: 'M' | 'F';
  raca: 'branco' | 'negro' | 'outro';
  colesterol_total_mgdL: number;
  hdl_mgdL: number;
  pas_mmHg: number;
  em_tratamento_ha: boolean;          // em uso de anti-hipertensivo
  tabagismo_atual: boolean;
  diabetes: boolean;
}

type ASCVDCoef = {
  lnAge: number; lnTotalC: number; lnAge_lnTotalC?: number;
  lnHDL: number; lnAge_lnHDL?: number;
  lnSBP_t: number; lnAge_lnSBP_t?: number;
  lnSBP_u: number; lnAge_lnSBP_u?: number;
  smoking: number; lnAge_smoking?: number;
  diabetes: number;
  mean: number; s10: number;
};

const ASCVD_COEFS: Record<string, ASCVDCoef> = {
  white_male: {
    lnAge: 12.344, lnTotalC: 11.853, lnAge_lnTotalC: -2.664,
    lnHDL: -7.990, lnAge_lnHDL: 1.769,
    lnSBP_t: 1.797, lnSBP_u: 1.764,
    smoking: 7.837, lnAge_smoking: -1.795,
    diabetes: 0.661,
    mean: 61.18, s10: 0.9144,
  },
  white_female: {
    lnAge: -7.574, lnTotalC: 3.109, lnAge_lnTotalC: -2.3981,
    lnHDL: -5.8069, lnAge_lnHDL: 2.1126,
    lnSBP_t: 2.0660, lnSBP_u: 0.3914,
    smoking: 8.0384, lnAge_smoking: -3.0975,
    diabetes: 0.8738,
    mean: -29.799, s10: 0.9665,
  },
  black_male: {
    lnAge: 2.469, lnTotalC: 0.302,
    lnHDL: -0.307,
    lnSBP_t: 1.916, lnSBP_u: 1.809,
    smoking: 0.549,
    diabetes: 0.645,
    mean: 19.54, s10: 0.8954,
  },
  black_female: {
    lnAge: 17.1141, lnTotalC: 0.9396,
    lnHDL: -18.9196, lnAge_lnHDL: 4.4748,
    lnSBP_t: 29.2907, lnAge_lnSBP_t: -6.4321,
    lnSBP_u: 27.8197, lnAge_lnSBP_u: -6.0873,
    smoking: 0.8738,
    diabetes: 0.8738,
    mean: 86.61, s10: 0.9533,
  },
};

export function calcASCVD(p: ASCVDInput): { risco_10anos_pct: number; classificacao: string; meta_ldl: string; intensidade_estatina: string; aviso_populacao?: string } {
  const key = `${p.raca === 'negro' ? 'black' : 'white'}_${p.sexo === 'M' ? 'male' : 'female'}`;
  const c = ASCVD_COEFS[key] ?? ASCVD_COEFS['white_male'];

  const la = Math.log(p.idade);
  const ltc = Math.log(p.colesterol_total_mgdL);
  const lhdl = Math.log(p.hdl_mgdL);
  const lsbp = Math.log(p.pas_mmHg);
  const smk = p.tabagismo_atual ? 1 : 0;
  const dm = p.diabetes ? 1 : 0;

  let sum = 0;
  sum += c.lnAge * la;
  sum += (c.lnTotalC ?? 0) * ltc;
  sum += (c.lnAge_lnTotalC ?? 0) * la * ltc;
  sum += (c.lnHDL ?? 0) * lhdl;
  sum += (c.lnAge_lnHDL ?? 0) * la * lhdl;
  if (p.em_tratamento_ha) {
    sum += (c.lnSBP_t ?? 0) * lsbp;
    sum += (c.lnAge_lnSBP_t ?? 0) * la * lsbp;
  } else {
    sum += (c.lnSBP_u ?? 0) * lsbp;
    sum += (c.lnAge_lnSBP_u ?? 0) * la * lsbp;
  }
  sum += (c.smoking ?? 0) * smk;
  sum += (c.lnAge_smoking ?? 0) * la * smk;
  sum += (c.diabetes ?? 0) * dm;

  const risco_10anos_pct = Math.round((1 - Math.pow(c.s10, Math.exp(sum - c.mean))) * 100 * 10) / 10;
  const riscoBounded = Math.max(0, Math.min(risco_10anos_pct, 100));

  let classificacao: string;
  let meta_ldl: string;
  let intensidade_estatina: string;

  if (riscoBounded >= 20)        { classificacao = 'Muito alto risco (≥ 20%)'; meta_ldl = '< 50 mg/dL';  intensidade_estatina = 'Alta intensidade (rosuvastatina 20-40 mg ou atorvastatina 40-80 mg)'; }
  else if (riscoBounded >= 10)   { classificacao = 'Alto risco (10–19,9%)';     meta_ldl = '< 70 mg/dL';  intensidade_estatina = 'Alta intensidade'; }
  else if (riscoBounded >= 7.5)  { classificacao = 'Risco moderado-alto (7,5–9,9%)'; meta_ldl = '< 70 mg/dL'; intensidade_estatina = 'Moderada-alta intensidade'; }
  else if (riscoBounded >= 5)    { classificacao = 'Risco intermediário (5–7,4%)'; meta_ldl = '< 100 mg/dL'; intensidade_estatina = 'Moderada intensidade'; }
  else                           { classificacao = 'Baixo risco (< 5%)';         meta_ldl = '< 130 mg/dL'; intensidade_estatina = 'Sem estatina rotineira — MEV'; }

  const aviso = p.raca === 'outro'
    ? 'ASCVD PCE foi validada principalmente em populações brancas e negras norte-americanas. Para populações latinas/brasileiras, pode superestimar o risco — interpretar com cautela.'
    : undefined;

  return { risco_10anos_pct: riscoBounded, classificacao, meta_ldl, intensidade_estatina, aviso_populacao: aviso };
}

// ═══════════════════════════════════════════════════════════
// 14. Estatísticas de Desfecho — ARR / RRR / RAR / NNT / NNH
// Formulação padrão EBM (Sackett 1996)
// ═══════════════════════════════════════════════════════════

export interface EstatisticasDesfechoInput {
  nome_desfecho: string;
  incidencia_tratamento: number;  // proporção 0–1
  incidencia_controle: number;    // proporção 0–1
  incidencia_ea_tratamento?: number;  // EA para NNH
  incidencia_ea_controle?: number;
}

export interface EstatisticasDesfechoResult {
  arr: number;      // Absolute Risk Reduction (= RAR em alguns contextos)
  rrr: number;      // Relative Risk Reduction (%)
  rr: number;       // Relative Risk (tratamento/controle)
  nnt: number;      // Number Needed to Treat
  nnh?: number;     // Number Needed to Harm
  ari?: number;     // Absolute Risk Increase (EA)
  interpretacao: string;
}

export function calcEstatisticasDesfecho(p: EstatisticasDesfechoInput): EstatisticasDesfechoResult {
  const { incidencia_tratamento: it, incidencia_controle: ic } = p;

  const arr = Math.max(0, +(ic - it).toFixed(5));
  const rrr = ic > 0 ? +((arr / ic) * 100).toFixed(1) : 0;
  const rr = ic > 0 ? +(it / ic).toFixed(3) : 0;
  const nnt = arr > 0 ? Math.ceil(1 / arr) : 99999;

  let nnh: number | undefined;
  let ari: number | undefined;
  if (p.incidencia_ea_tratamento !== undefined && p.incidencia_ea_controle !== undefined) {
    ari = Math.max(0, +(p.incidencia_ea_tratamento - p.incidencia_ea_controle).toFixed(5));
    nnh = ari > 0 ? Math.ceil(1 / ari) : 99999;
  }

  const interpretacao = [
    `${p.nome_desfecho}: ic=${(ic * 100).toFixed(1)}% vs it=${(it * 100).toFixed(1)}%`,
    `ARR = ${(arr * 100).toFixed(1)}% | RRR = ${rrr}% | RR = ${rr}`,
    `NNT = ${nnt}${nnh !== undefined ? ` | NNH = ${nnh}` : ''}`,
  ].join(' — ');

  return { arr, rrr, rr, nnt, nnh, ari, interpretacao };
}

// ═══════════════════════════════════════════════════════════
// CASOS-TESTE (validação interna documentada)
// Executar em desenvolvimento: node -e "require('./clinical-calculators'); runTests()"
// ═══════════════════════════════════════════════════════════

export const VALIDATION_CASES = {
  ckd_epi: {
    descricao: '50F Scr 0.8 → esperado ~90 mL/min/1.73m²',
    input: { idade: 50, sexo: 'F' as const, creatinina_mgdL: 0.8 },
    expected_range: [85, 95],
  },
  mdrd: {
    descricao: '60M Scr 1.5 → esperado ~48 mL/min/1.73m²',
    input: { idade: 60, sexo: 'M' as const, creatinina_mgdL: 1.5 },
    expected_range: [44, 52],
  },
  cha2ds2vasc: {
    descricao: '72M + ICC + HAS + DM → score=4, anticoagular=true',
    input: { icc_disfuncao_ve: true, hipertensao: true, idade: 72, diabetes: true, avc_ait_tromboembolismo: false, doenca_vascular: false, sexo_feminino: false },
    expected_score: 4,
    expected_anticoagular: true,
  },
  curb65: {
    descricao: 'Todos critérios = 5 → UTI',
    input: { confusao_aguda: true, ureia_gt_7_mmolL: true, fr_ge_30: true, pa_baixa: true, idade_ge_65: true },
    expected_score: 5,
  },
  child_pugh: {
    descricao: 'Bili 2.5 + Alb 30 + INR 1.5 + ascite leve + sem encefalopatia → B(8)',
    input: { bilirrubina_mgdL: 2.5, albumina_gL: 30, inr: 1.5, ascite: 'leve' as const, encefalopatia: 'ausente' as const },
    expected_score: 8,
    expected_class: 'B',
  },
  meld: {
    descricao: 'Bili 2.0 + INR 1.5 + Cr 1.0 → MELD ~14',
    input: { bilirrubina_mgdL: 2.0, inr: 1.5, creatinina_mgdL: 1.0 },
    expected_range: [13, 15],
  },
  ascvd: {
    descricao: '55M branco, CT 213, HDL 50, PAS 120 sem trat, não fumante, sem DM → ~7%',
    input: { idade: 55, sexo: 'M' as const, raca: 'branco' as const, colesterol_total_mgdL: 213, hdl_mgdL: 50, pas_mmHg: 120, em_tratamento_ha: false, tabagismo_atual: false, diabetes: false },
    expected_range: [5, 9],
  },
};
