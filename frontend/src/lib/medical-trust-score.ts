// ============================================================
// PRESCREVE-AI — Medical Trust Score (CAMADA 5)
// Score de confiança clínica 0–100% por recomendação
// Farmacológico · Clínico · Evidência · Segurança · Guideline · Confiança
// ============================================================

'use client';

import type { TherapeuticSuggestion, Anamnesis } from './types';
import type { AvaliacaoRiscoClinico } from './clinical-risk-engine';
import type { ExplanacaoClinica } from './explainable-ai';

// ──────────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────────

export interface DimensaoScore {
  nome: string;
  score: number;           // 0–100
  peso: number;            // peso na média ponderada (soma = 1.0)
  justificativa: string;
  fatores_positivos: string[];
  fatores_negativos: string[];
}

export interface MedicalTrustScore {
  medicamento_id: string;
  molecula: string;
  classe_terapeutica: string;
  timestamp: string;

  // 6 dimensões
  score_farmacologico: DimensaoScore;
  score_clinico: DimensaoScore;
  score_evidencia: DimensaoScore;
  score_seguranca: DimensaoScore;
  score_guideline: DimensaoScore;
  score_confianca: DimensaoScore;

  // Consolidado
  score_global: number;           // 0–100 (média ponderada)
  percentual: string;             // '87%'
  classificacao: TrustClassification;
  cor: TrustColor;
  label: string;                  // 'Recomendado com alta confiança'
  resumo_executivo: string;
  limitacoes: string[];
  recomendacao_uso: string;
}

export type TrustClassification =
  | 'muito_alta'   // ≥ 85
  | 'alta'         // 70–84
  | 'moderada'     // 50–69
  | 'baixa'        // 30–49
  | 'insuficiente' // < 30

export type TrustColor = 'verde_escuro' | 'verde' | 'amarelo' | 'laranja' | 'vermelho';

function classificar(score: number): { classificacao: TrustClassification; cor: TrustColor; label: string } {
  if (score >= 85) return { classificacao: 'muito_alta', cor: 'verde_escuro', label: 'Recomendado com muito alta confiança' };
  if (score >= 70) return { classificacao: 'alta', cor: 'verde', label: 'Recomendado com alta confiança' };
  if (score >= 50) return { classificacao: 'moderada', cor: 'amarelo', label: 'Recomendado com confiança moderada' };
  if (score >= 30) return { classificacao: 'baixa', cor: 'laranja', label: 'Usar com cautela — confiança limitada' };
  return { classificacao: 'insuficiente', cor: 'vermelho', label: 'Não recomendado — evidência ou segurança insuficiente' };
}

// ──────────────────────────────────────────────────────────────
// Cálculo individual por dimensão
// ──────────────────────────────────────────────────────────────

function calcularScoreFarmacologico(med: TherapeuticSuggestion): DimensaoScore {
  const positivos: string[] = [];
  const negativos: string[] = [];
  let score = 60; // base

  // Nome genérico documentado
  if (med.nome_generico) { positivos.push('Nome genérico documentado'); score += 5; }

  // Dose completa (min/max/padrão)
  const dose = med.dose;
  if (dose.dose_padrao && dose.dose_min && dose.dose_max) {
    positivos.push('Posologia completa (padrão + mínima + máxima)'); score += 10;
  } else if (dose.dose_padrao) {
    positivos.push('Dose padrão documentada'); score += 5;
  } else {
    negativos.push('Dose não especificada'); score -= 15;
  }

  // Ajuste renal e hepático
  if (dose.ajuste_renal) { positivos.push('Ajuste renal documentado'); score += 5; }
  else { negativos.push('Ajuste renal não documentado'); score -= 5; }

  // Via de administração
  if (dose.via) { positivos.push(`Via de administração: ${dose.via}`); score += 5; }

  // Contraindicações documentadas
  if (med.contraindicacoes && med.contraindicacoes.length > 0) {
    positivos.push(`${med.contraindicacoes.length} contraindicação(ões) documentada(s)`); score += 5;
  } else {
    negativos.push('Contraindicações não documentadas'); score -= 10;
  }

  // Monitoramento
  if (med.monitoramento && med.monitoramento.length > 0) {
    positivos.push('Plano de monitoramento presente'); score += 5;
  }

  return {
    nome: 'Farmacológico',
    score: Math.min(Math.max(score, 0), 100),
    peso: 0.15,
    justificativa: 'Qualidade da documentação farmacológica: dose, via, ajustes, contraindicações e monitoramento.',
    fatores_positivos: positivos,
    fatores_negativos: negativos,
  };
}

function calcularScoreClinico(
  med: TherapeuticSuggestion,
  explanacao?: ExplanacaoClinica
): DimensaoScore {
  const positivos: string[] = [];
  const negativos: string[] = [];
  let score = 50;

  if (explanacao) {
    // Compatibilidade com perfil do paciente
    score += Math.round((explanacao.pct_compatibilidade - 50) * 0.6);
    if (explanacao.pct_compatibilidade >= 70) {
      positivos.push(`Compatibilidade com perfil do paciente: ${explanacao.pct_compatibilidade}%`);
    } else if (explanacao.pct_compatibilidade < 50) {
      negativos.push(`Baixa compatibilidade com perfil: ${explanacao.pct_compatibilidade}%`);
    }

    // Achados favoráveis
    const favoraveis = explanacao.achados_relevantes.filter(a => a.tipo === 'favoravel').length;
    const alertas = explanacao.achados_relevantes.filter(a => a.tipo === 'alerta').length;
    if (favoraveis > 0) { positivos.push(`${favoraveis} achado(s) favorável(is) no perfil clínico`); score += favoraveis * 5; }
    if (alertas > 0) { negativos.push(`${alertas} alerta(s) clínico(s) identificado(s)`); score -= alertas * 8; }

    // Flags de segurança
    if (explanacao.flags_seguranca.length > 0) {
      negativos.push(`${explanacao.flags_seguranca.length} flag(s) de segurança`); score -= explanacao.flags_seguranca.length * 10;
    }

    // Limitações específicas
    if (explanacao.limitacoes_especificas.length === 0) {
      positivos.push('Sem limitações específicas para este paciente');
    } else {
      explanacao.limitacoes_especificas.forEach(l => {
        if (l.gravidade === 'grave') { negativos.push(`Limitação grave: ${l.texto.substring(0, 60)}...`); score -= 20; }
        else if (l.gravidade === 'moderada') { score -= 10; }
      });
    }
  } else {
    negativos.push('Análise de compatibilidade clínica não disponível');
  }

  // Indicação documentada
  if (med.indicacao) { positivos.push('Indicação terapêutica documentada'); score += 5; }

  return {
    nome: 'Clínico',
    score: Math.min(Math.max(score, 0), 100),
    peso: 0.20,
    justificativa: 'Adequação clínica: compatibilidade com perfil do paciente, achados favoráveis e ausência de alertas.',
    fatores_positivos: positivos,
    fatores_negativos: negativos,
  };
}

function calcularScoreEvidencia(med: TherapeuticSuggestion): DimensaoScore {
  const positivos: string[] = [];
  const negativos: string[] = [];
  let score = 50;

  const ev = med.evidencia;
  if (!ev) {
    return {
      nome: 'Evidência',
      score: 20,
      peso: 0.25,
      justificativa: 'Nenhuma referência de evidência documentada.',
      fatores_positivos: [],
      fatores_negativos: ['Evidência científica não documentada'],
    };
  }

  // Nível de evidência
  const nivel = ev.nivel_evidencia?.nivel;
  const grau = ev.nivel_evidencia?.grau;

  if (nivel === 'A') { positivos.push('Nível de evidência A (ECRs/meta-análises)'); score += 30; }
  else if (nivel === 'B') { positivos.push('Nível de evidência B (ECR único ou coorte)'); score += 15; }
  else if (nivel === 'C') { positivos.push('Nível de evidência C (opinião de especialista)'); score += 5; negativos.push('Evidência de baixo nível (C)'); }

  if (grau === 'I') { positivos.push('Grau de recomendação I (forte)'); score += 20; }
  else if (grau === 'IIa') { positivos.push('Grau de recomendação IIa'); score += 10; }
  else if (grau === 'IIb') { positivos.push('Grau de recomendação IIb'); score += 5; }
  else if (grau === 'III') { negativos.push('Grau III — sem benefício ou com dano'); score -= 30; }

  // Diretriz e sociedade identificadas
  if (ev.diretriz) { positivos.push(`Diretriz: ${ev.diretriz}`); score += 5; }
  if (ev.sociedade) { positivos.push(`Sociedade: ${ev.sociedade}`); score += 5; }

  // Recência
  const anoAtual = new Date().getFullYear();
  const anoEv = ev.ano;
  if (anoEv >= anoAtual - 2) { positivos.push(`Diretriz recente (${anoEv})`); score += 5; }
  else if (anoEv < anoAtual - 7) { negativos.push(`Diretriz de ${anoEv} — verificar atualização`); score -= 5; }

  // DOI / citação
  if (ev.doi) { positivos.push('DOI documentado — referência verificável'); score += 5; }
  if (ev.citacao) { positivos.push('Citação bibliográfica presente'); score += 3; }

  return {
    nome: 'Evidência',
    score: Math.min(Math.max(score, 0), 100),
    peso: 0.25,
    justificativa: 'Qualidade e recência das evidências: nível (A/B/C), grau de recomendação (I–III), diretriz e DOI.',
    fatores_positivos: positivos,
    fatores_negativos: negativos,
  };
}

function calcularScoreSeguranca(
  med: TherapeuticSuggestion,
  avaliacaoRisco?: AvaliacaoRiscoClinico
): DimensaoScore {
  const positivos: string[] = [];
  const negativos: string[] = [];
  let score = 80; // base de segurança

  if (avaliacaoRisco) {
    // Interações detectadas
    const scoreInteracao = avaliacaoRisco.risco_interacao.score;
    if (scoreInteracao >= 50) { negativos.push(`Risco de interação alto (score ${scoreInteracao})`); score -= 30; }
    else if (scoreInteracao >= 25) { negativos.push(`Risco de interação moderado`); score -= 15; }
    else { positivos.push('Sem interações medicamentosas relevantes'); }

    // Risco farmacológico (contraindicações, alergias)
    const scoreFarma = avaliacaoRisco.risco_farmacologico.score;
    if (scoreFarma >= 40) {
      negativos.push(`Contraindicação ou alergia identificada`);
      score -= 40;
      avaliacaoRisco.risco_farmacologico.fatores
        .filter(f => f.toLowerCase().includes(med.molecula.toLowerCase()))
        .forEach(f => negativos.push(f));
    }

    // Alerta vermelho
    if (avaliacaoRisco.alerta_vermelho) {
      negativos.push('ALERTA VERMELHO: risco clínico muito alto identificado'); score -= 20;
    }
  }

  // Efeitos adversos documentados
  if (med.efeitos_adversos && med.efeitos_adversos.length > 0) {
    positivos.push(`${med.efeitos_adversos.length} efeito(s) adverso(s) documentado(s)`);
  } else {
    negativos.push('Efeitos adversos não documentados'); score -= 5;
  }

  // Contraindicações documentadas
  if (med.contraindicacoes && med.contraindicacoes.length > 0) {
    positivos.push('Perfil de contraindicações documentado');
  }

  return {
    nome: 'Segurança',
    score: Math.min(Math.max(score, 0), 100),
    peso: 0.20,
    justificativa: 'Perfil de segurança: interações detectadas, contraindicações, alergias e efeitos adversos.',
    fatores_positivos: positivos,
    fatores_negativos: negativos,
  };
}

function calcularScoreGuideline(med: TherapeuticSuggestion): DimensaoScore {
  const positivos: string[] = [];
  const negativos: string[] = [];
  let score = 55;

  const ev = med.evidencia;
  if (!ev) {
    return {
      nome: 'Guideline',
      score: 20,
      peso: 0.10,
      justificativa: 'Sem diretriz referenciada.',
      fatores_positivos: [],
      fatores_negativos: ['Diretriz não referenciada'],
    };
  }

  // Diretriz reconhecida
  const diretrizes_reconhecidas = [
    'SBC', 'ESC', 'AHA', 'ACC', 'ADA', 'KDIGO', 'GOLD', 'GINA',
    'APA', 'CANMAT', 'SBD', 'SBPT', 'SBN', 'CFM', 'ANVISA',
  ];
  if (diretrizes_reconhecidas.some(d => ev.sociedade?.toUpperCase().includes(d) || ev.diretriz?.toUpperCase().includes(d))) {
    positivos.push(`Diretriz de sociedade reconhecida (${ev.sociedade ?? ev.diretriz})`);
    score += 20;
  } else {
    negativos.push('Sociedade emissora não identificada entre as principais'); score -= 10;
  }

  // Sociedade brasileira ou adaptada ao Brasil
  const br = ['SBC', 'SBD', 'SBPT', 'SBN', 'CFM', 'ANVISA', 'BRASILIAN', 'BRASIL', 'BRASILEIRA'];
  if (br.some(b => (ev.sociedade ?? '').toUpperCase().includes(b) || (ev.diretriz ?? '').toUpperCase().includes(b))) {
    positivos.push('Diretriz nacional brasileira — maior aplicabilidade local'); score += 10;
  }

  // Grau e nível reafirmam guideline
  if (ev.nivel_evidencia?.grau === 'I' && ev.nivel_evidencia?.nivel === 'A') {
    positivos.push('Recomendação Classe I / Nível A — padrão ouro'); score += 15;
  }

  return {
    nome: 'Guideline',
    score: Math.min(Math.max(score, 0), 100),
    peso: 0.10,
    justificativa: 'Respaldo em diretrizes reconhecidas e aplicabilidade nacional.',
    fatores_positivos: positivos,
    fatores_negativos: negativos,
  };
}

function calcularScoreConfianca(
  scoreFarmacologico: number,
  scoreClinical: number,
  scoreEvidencia: number,
  scoreSeguranca: number,
  scoreGuideline: number
): DimensaoScore {
  const positivos: string[] = [];
  const negativos: string[] = [];

  // Consistência entre dimensões (penalizar alta variância)
  const scores = [scoreFarmacologico, scoreClinical, scoreEvidencia, scoreSeguranca, scoreGuideline];
  const media = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variancia = scores.reduce((a, b) => a + Math.pow(b - media, 2), 0) / scores.length;
  const dp = Math.sqrt(variancia);

  let score = Math.round(media);

  if (dp <= 10) {
    positivos.push('Alta consistência entre dimensões de avaliação'); score += 5;
  } else if (dp >= 25) {
    negativos.push(`Alta inconsistência entre dimensões (DP ${dp.toFixed(0)}) — avaliação menos confiável`); score -= 10;
  }

  // Penalidade por dimensão crítica muito baixa
  if (scoreSeguranca < 30) {
    negativos.push('Score de segurança crítico — confiança reduzida'); score -= 15;
  }
  if (scoreEvidencia < 30) {
    negativos.push('Evidência insuficiente — confiança limitada'); score -= 10;
  }

  // Bônus por excelência em evidência + segurança
  if (scoreEvidencia >= 85 && scoreSeguranca >= 80) {
    positivos.push('Excelente combinação de evidência + segurança'); score += 5;
  }

  return {
    nome: 'Confiança',
    score: Math.min(Math.max(score, 0), 100),
    peso: 0.10,
    justificativa: 'Consistência e coerência entre todas as dimensões de avaliação.',
    fatores_positivos: positivos,
    fatores_negativos: negativos,
  };
}

// ──────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ──────────────────────────────────────────────────────────────

export function calcularMedicalTrustScore(
  med: TherapeuticSuggestion,
  _anamnese?: Anamnesis,
  explanacao?: ExplanacaoClinica,
  avaliacaoRisco?: AvaliacaoRiscoClinico
): MedicalTrustScore {
  const sf = calcularScoreFarmacologico(med);
  const sc = calcularScoreClinico(med, explanacao);
  const se = calcularScoreEvidencia(med);
  const ss = calcularScoreSeguranca(med, avaliacaoRisco);
  const sg = calcularScoreGuideline(med);
  const sk = calcularScoreConfianca(sf.score, sc.score, se.score, ss.score, sg.score);

  const score_global = Math.round(
    sf.score * sf.peso +
    sc.score * sc.peso +
    se.score * se.peso +
    ss.score * ss.peso +
    sg.score * sg.peso +
    sk.score * sk.peso
  );

  const { classificacao, cor, label } = classificar(score_global);

  // Limitações (agregadas de dimensões com score baixo)
  const limitacoes: string[] = [];
  [sf, sc, se, ss, sg, sk].forEach(d => {
    d.fatores_negativos.forEach(f => {
      if (f && !limitacoes.includes(f)) limitacoes.push(f);
    });
  });

  // Recomendação de uso
  let recomendacao_uso = '';
  if (score_global >= 85) {
    recomendacao_uso = `${med.molecula} é fortemente recomendado neste contexto clínico com base em evidências de nível A e compatibilidade com o perfil do paciente.`;
  } else if (score_global >= 70) {
    recomendacao_uso = `${med.molecula} é recomendado. Verificar ajustes posológicos individuais e monitorar conforme plano.`;
  } else if (score_global >= 50) {
    recomendacao_uso = `${med.molecula} pode ser usado com cautela. Limitações identificadas requerem avaliação individualizada.`;
  } else {
    recomendacao_uso = `${med.molecula} apresenta confiança limitada neste contexto. Considerar alternativas terapêuticas.`;
  }

  return {
    medicamento_id: med.id,
    molecula: med.molecula,
    classe_terapeutica: med.classe_terapeutica,
    timestamp: new Date().toISOString(),
    score_farmacologico: sf,
    score_clinico: sc,
    score_evidencia: se,
    score_seguranca: ss,
    score_guideline: sg,
    score_confianca: sk,
    score_global,
    percentual: `${score_global}%`,
    classificacao,
    cor,
    label,
    resumo_executivo: `${label}. Score: ${score_global}/100. ${
      se.score >= 80
        ? `Evidência de alto nível (${med.evidencia?.nivel_evidencia?.nivel ?? '?'}/Grau ${med.evidencia?.nivel_evidencia?.grau ?? '?'}).`
        : 'Evidência moderada — verificar diretriz.'
    }`,
    limitacoes: limitacoes.slice(0, 5),
    recomendacao_uso,
  };
}

// ──────────────────────────────────────────────────────────────
// Score de uma lista de medicamentos
// ──────────────────────────────────────────────────────────────

export function calcularScoresPlano(
  medicamentos: TherapeuticSuggestion[],
  anamnese?: Anamnesis,
  explanacoes?: Record<string, ExplanacaoClinica>,
  avaliacaoRisco?: AvaliacaoRiscoClinico
): MedicalTrustScore[] {
  return medicamentos.map(med =>
    calcularMedicalTrustScore(
      med,
      anamnese,
      explanacoes?.[med.id],
      avaliacaoRisco
    )
  );
}

export function scoreGlobalPlano(scores: MedicalTrustScore[]): {
  media: number;
  minimo: number;
  maximo: number;
  classificacao: TrustClassification;
  alerta: boolean;
} {
  if (scores.length === 0) return { media: 0, minimo: 0, maximo: 0, classificacao: 'insuficiente', alerta: false };
  const values = scores.map(s => s.score_global);
  const media = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const { classificacao } = classificar(media);
  return {
    media,
    minimo: Math.min(...values),
    maximo: Math.max(...values),
    classificacao,
    alerta: scores.some(s => s.classificacao === 'insuficiente' || s.score_seguranca.score < 30),
  };
}
