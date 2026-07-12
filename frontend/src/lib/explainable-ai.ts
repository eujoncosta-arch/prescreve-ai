// ============================================================
// PRESCREVE-AI — Explainable Clinical AI Engine
// Gera explicações específicas do paciente para cada recomendação
// "Por que estou vendo esta recomendação?"
// ============================================================

import type { Anamnesis, TherapeuticSuggestion, DiagnosticHypothesis } from './types';
import { getPerfilIdeal } from './evidence-library';

// ─── Tipos ───────────────────────────────────────────────────

export type FonteAchado = 'sinais_vitais' | 'laboratorio' | 'comorbidade' | 'cds' | 'habitos' | 'funcao_renal' | 'funcao_hepatica' | 'anamnese';
export type TipoAchado = 'favoravel' | 'alerta' | 'neutro';

export interface Achado {
  texto: string;
  fonte: FonteAchado;
  tipo: TipoAchado;
}

export interface CompatibilidadePerfil {
  item: string;
  compativel: boolean;
  evidencia?: string;
}

export interface LimitacaoPaciente {
  texto: string;
  gravidade: 'leve' | 'moderada' | 'grave';
  acao?: string;
}

export interface ExplanacaoClinica {
  achados_relevantes: Achado[];
  racionalidade: string;
  compatibilidade_perfil: CompatibilidadePerfil[];
  pct_compatibilidade: number;          // 0–100
  limitacoes_especificas: LimitacaoPaciente[];
  nivel_confianca: number;              // 0–100
  label_confianca: string;
  cor_confianca: 'green' | 'yellow' | 'orange' | 'red';
  flags_seguranca: string[];            // gestante, renal, hepático, etc.
}

// ─── Helpers ─────────────────────────────────────────────────

function labNum(anamnese: Anamnesis, ...chaves: string[]): number | undefined {
  for (const k of chaves) {
    const val = anamnese.laboratorio?.[k];
    if (val !== undefined && val !== '') {
      const n = parseFloat(val);
      if (!isNaN(n)) return n;
    }
  }
  return undefined;
}

function temComorbidade(anamnese: Anamnesis, ...termos: string[]): boolean {
  return termos.some(t =>
    anamnese.comorbidades?.some(c => c.toLowerCase().includes(t.toLowerCase()))
  );
}

// ─── Engine principal ─────────────────────────────────────────

export function gerarExplanacao(
  med: TherapeuticSuggestion,
  anamnese: Anamnesis | undefined,
  hipotese: DiagnosticHypothesis | undefined,
): ExplanacaoClinica {
  const achados: Achado[] = [];
  const limitacoes: LimitacaoPaciente[] = [];
  const flags: string[] = [];

  const sv = anamnese?.sinais_vitais ?? {};
  const fr = anamnese?.funcao_renal ?? {};
  const fh = anamnese?.funcao_hepatica ?? {};

  // ── 1. Achados de sinais vitais ───────────────────────────

  if (sv.pa_sistolica !== undefined) {
    if (sv.pa_sistolica >= 160) {
      achados.push({ texto: `PA sistólica ${sv.pa_sistolica}/${sv.pa_diastolica ?? '?'} mmHg — HAS Estágio 2 (tratamento farmacológico imediato)`, fonte: 'sinais_vitais', tipo: 'favoravel' });
    } else if (sv.pa_sistolica >= 140) {
      achados.push({ texto: `PA sistólica ${sv.pa_sistolica}/${sv.pa_diastolica ?? '?'} mmHg — HAS Estágio 1 (meta < 130/80 com tratamento)`, fonte: 'sinais_vitais', tipo: 'favoravel' });
    } else if (sv.pa_sistolica < 100) {
      achados.push({ texto: `PA sistólica ${sv.pa_sistolica} mmHg — hipotensão: verificar contraindicações`, fonte: 'sinais_vitais', tipo: 'alerta' });
      if (med.contraindicacoes.some(c => c.toLowerCase().includes('hipotens'))) {
        limitacoes.push({ texto: 'PA baixa pode limitar titulação da dose — iniciar com dose mínima e monitorar.', gravidade: 'moderada', acao: 'Iniciar com dose mínima. Monitorar PA nas primeiras 48h.' });
      }
    }
  }

  if (sv.fc !== undefined) {
    if (sv.fc > 100) {
      achados.push({ texto: `FC ${sv.fc} bpm — taquicardia presente`, fonte: 'sinais_vitais', tipo: 'alerta' });
    } else if (sv.fc < 55 && med.contraindicacoes.some(c => c.toLowerCase().includes('bradicard'))) {
      achados.push({ texto: `FC ${sv.fc} bpm — bradicardia: avaliar contraindicação`, fonte: 'sinais_vitais', tipo: 'alerta' });
      limitacoes.push({ texto: `FC ${sv.fc} bpm em repouso — verifique contraindicação se betabloqueador indicado.`, gravidade: 'moderada', acao: 'Eletrocardiograma antes de iniciar. Titular com cautela.' });
    }
  }

  if (sv.spo2 !== undefined && sv.spo2 < 92) {
    achados.push({ texto: `SpO₂ ${sv.spo2}% — hipoxemia: investigar causa pulmonar`, fonte: 'sinais_vitais', tipo: 'alerta' });
  }

  if (sv.temperatura !== undefined && sv.temperatura >= 38.0) {
    achados.push({ texto: `Temperatura ${sv.temperatura}°C — febre presente`, fonte: 'sinais_vitais', tipo: 'neutro' });
  }

  if (sv.fr !== undefined && sv.fr >= 30) {
    achados.push({ texto: `FR ${sv.fr} irpm — taquipneia (CURB-65: critério R presente)`, fonte: 'sinais_vitais', tipo: 'alerta' });
  }

  // ── 2. Achados laboratoriais ──────────────────────────────

  const hba1c = labNum(anamnese!, 'hba1c', 'HbA1c', 'hemoglobina_glicada');
  if (hba1c !== undefined) {
    if (hba1c > 9) achados.push({ texto: `HbA1c ${hba1c}% — DM2 descompensado (meta < 7%)`, fonte: 'laboratorio', tipo: 'favoravel' });
    else if (hba1c > 7) achados.push({ texto: `HbA1c ${hba1c}% — DM2 fora da meta glicêmica (meta < 7%)`, fonte: 'laboratorio', tipo: 'favoravel' });
    else if (hba1c <= 7) achados.push({ texto: `HbA1c ${hba1c}% — controle glicêmico adequado`, fonte: 'laboratorio', tipo: 'neutro' });
  }

  const ldl = labNum(anamnese!, 'ldl', 'LDL', 'ldl_c');
  if (ldl !== undefined && ldl > 130) {
    achados.push({ texto: `LDL-c ${ldl} mg/dL — acima da meta (meta depende do risco CV)`, fonte: 'laboratorio', tipo: 'favoravel' });
  }

  const tsh = labNum(anamnese!, 'tsh', 'TSH');
  if (tsh !== undefined) {
    if (tsh > 4.5) achados.push({ texto: `TSH ${tsh} mUI/L — hipotireoidismo (meta 0,5–2,5 mUI/L com reposição)`, fonte: 'laboratorio', tipo: 'favoravel' });
    else if (tsh < 0.4) achados.push({ texto: `TSH ${tsh} mUI/L — hipotireoidismo: TSH suprimido (possível sobretratamento)`, fonte: 'laboratorio', tipo: 'alerta' });
  }

  const pcr = labNum(anamnese!, 'pcr', 'PCR', 'proteina_c_reativa');
  if (pcr !== undefined && pcr > 10) {
    achados.push({ texto: `PCR ${pcr} mg/L — síndrome inflamatória/infecciosa ativa`, fonte: 'laboratorio', tipo: 'alerta' });
  }

  const creatinina = fr.creatinina ?? labNum(anamnese!, 'creatinina', 'Cr');
  const tfg = fr.tfg;

  if (creatinina !== undefined) {
    if (creatinina > 2.5) {
      achados.push({ texto: `Creatinina ${creatinina} mg/dL — disfunção renal significativa`, fonte: 'funcao_renal', tipo: 'alerta' });
      if (med.dose.ajuste_renal) {
        limitacoes.push({
          texto: `Creatinina elevada (${creatinina} mg/dL): ajuste de dose necessário.`,
          gravidade: 'moderada',
          acao: med.dose.ajuste_renal,
        });
      }
      if (med.contraindicacoes.some(c => c.toLowerCase().includes('renal') || c.toLowerCase().includes('tfg'))) {
        flags.push('Verificar contraindicação renal antes de prescrever');
      }
    } else if (creatinina > 1.3) {
      achados.push({ texto: `Creatinina ${creatinina} mg/dL — função renal limítrofe (monitorar)`, fonte: 'funcao_renal', tipo: 'alerta' });
      if (med.dose.ajuste_renal) {
        limitacoes.push({ texto: `Creatinina ${creatinina} mg/dL — monitorar função renal e ajustar dose conforme resposta.`, gravidade: 'leve', acao: med.dose.ajuste_renal });
      }
    } else {
      achados.push({ texto: `Creatinina ${creatinina} mg/dL — função renal preservada`, fonte: 'funcao_renal', tipo: 'favoravel' });
    }
  }

  if (tfg !== undefined && tfg < 30) {
    flags.push(`TFG ${tfg} mL/min — DRC G4/G5: verificar contraindicações`);
  }

  if (fh.albumina !== undefined && fh.albumina < 2.8) {
    achados.push({ texto: `Albumina ${fh.albumina} g/dL — hipoalbuminemia (disfunção hepática / desnutrição)`, fonte: 'funcao_hepatica', tipo: 'alerta' });
    if (med.dose.ajuste_hepatico) {
      limitacoes.push({ texto: `Albumina baixa (${fh.albumina} g/dL): possível necessidade de ajuste de dose.`, gravidade: 'moderada', acao: med.dose.ajuste_hepatico });
    }
  }

  if (fh.child_pugh === 'C') {
    flags.push('Child-Pugh C — hepatopatia grave: revisar todos os fármacos metabolizados pelo fígado');
    limitacoes.push({ texto: 'Cirrose descompensada (Child-Pugh C) — risco aumentado de efeitos adversos.', gravidade: 'grave', acao: med.dose.ajuste_hepatico ?? 'Avaliar com hepatologista antes de iniciar.' });
  }

  // ── 3. Comorbidades e contexto clínico ───────────────────

  if (anamnese) {
    const ind = med.indicacao.toLowerCase();

    if (temComorbidade(anamnese, 'diabetes', 'dm2', 'dm 2', 'diabete')) {
      if (ind.includes('dm') || ind.includes('diabet') || ind.includes('nefroprot')) {
        achados.push({ texto: 'Diabetes mellitus tipo 2 — comorbidade compatível com indicação desta classe', fonte: 'comorbidade', tipo: 'favoravel' });
      }
    }
    if (temComorbidade(anamnese, 'hipertensão', 'has', 'hipertensao')) {
      if (ind.includes('hiperten') || ind.includes('anti-hiperten') || ind.includes('has')) {
        achados.push({ texto: 'Hipertensão arterial sistêmica — comorbidade que fundamenta a indicação', fonte: 'comorbidade', tipo: 'favoravel' });
      }
    }
    if (temComorbidade(anamnese, 'insuficiência cardíaca', 'ic ', 'icc', 'heart failure')) {
      if (ind.includes('ic') || ind.includes('insuficiência cardíaca') || ind.includes('feve')) {
        achados.push({ texto: 'Insuficiência cardíaca — indicação primária desta classe terapêutica', fonte: 'comorbidade', tipo: 'favoravel' });
      }
    }
    if (temComorbidade(anamnese, 'dpoc', 'doença pulmonar obstrutiva', 'enfisema')) {
      if (med.contraindicacoes.some(c => c.toLowerCase().includes('asma') || c.toLowerCase().includes('dpoc') || c.toLowerCase().includes('bronco'))) {
        achados.push({ texto: 'DPOC — verificar contraindicação com esta classe (broncoespasmo)', fonte: 'comorbidade', tipo: 'alerta' });
        limitacoes.push({ texto: 'DPOC presente: risco de broncoespasmo com alguns fármacos desta classe.', gravidade: 'moderada', acao: 'Avaliar espirometria. Monitorar sintomas respiratórios após início.' });
      }
    }
    if (temComorbidade(anamnese, 'fibrilação atrial', 'fa ', 'flutter')) {
      achados.push({ texto: 'Fibrilação atrial — relevante para decisão de anticoagulação (calcular CHA₂DS₂-VASc)', fonte: 'comorbidade', tipo: 'neutro' });
    }
    if (temComorbidade(anamnese, 'dislipidemia', 'hipercolesterol', 'hipertriglicerid')) {
      if (ind.includes('dislipid') || ind.includes('ldl') || ind.includes('colesterol')) {
        achados.push({ texto: 'Dislipidemia — comorbidade que fundamenta a indicação desta classe', fonte: 'comorbidade', tipo: 'favoravel' });
      }
    }
    if (temComorbidade(anamnese, 'hipotireoidismo', 'tireoidite', 'hashimoto')) {
      if (ind.includes('hipotireoid') || ind.includes('tireoid')) {
        achados.push({ texto: 'Hipotireoidismo — indicação direta desta classe', fonte: 'comorbidade', tipo: 'favoravel' });
      }
    }
    if (temComorbidade(anamnese, 'asma')) {
      if (ind.includes('asma') || ind.includes('bronc')) {
        achados.push({ texto: 'Asma — indicação direta desta classe', fonte: 'comorbidade', tipo: 'favoravel' });
      }
      if (med.contraindicacoes.some(c => c.toLowerCase().includes('asma'))) {
        limitacoes.push({ texto: 'Asma presente: verificar contraindicação com betabloqueadores.', gravidade: 'grave', acao: 'Contraindicado em asma ativa grave. Discutir alternativa com pneumologista.' });
      }
    }
  }

  // ── 4. Achados do motor CDS ───────────────────────────────

  if (hipotese) {
    hipotese.criterios_favoraveis.slice(0, 4).forEach(c => {
      achados.push({ texto: c, fonte: 'cds', tipo: 'favoravel' });
    });
    hipotese.criterios_desfavoraveis.slice(0, 2).forEach(c => {
      achados.push({ texto: c, fonte: 'cds', tipo: 'alerta' });
    });
  }

  // ── 5. Hábitos de vida ────────────────────────────────────

  if (anamnese?.habitos_vida?.tabagismo === 'sim') {
    achados.push({ texto: 'Tabagismo ativo — fator de risco cardiovascular modificável', fonte: 'habitos', tipo: 'alerta' });
    if (!flags.some(f => f.includes('tabag'))) {
      flags.push('Cessação do tabagismo essencial — reduz risco CV independentemente da farmacoterapia');
    }
  }
  if (anamnese?.habitos_vida?.atividade_fisica === 'sedentario') {
    achados.push({ texto: 'Sedentarismo — fator de risco cardiovascular e metabólico', fonte: 'habitos', tipo: 'alerta' });
  }

  // ── 6. Populações especiais ───────────────────────────────

  if (anamnese?.gestante) {
    flags.push('⚠ Gestação confirmada — verificar categoria FDA/ANVISA antes de prescrever');
    const contGrav = med.contraindicacoes.find(c => c.toLowerCase().includes('gravidez') || c.toLowerCase().includes('gestação') || c.toLowerCase().includes('gestante'));
    if (contGrav) {
      limitacoes.push({ texto: `Gestante: "${contGrav}"`, gravidade: 'grave', acao: 'CONTRAINDICADO na gravidez. Substituir antes de iniciar.' });
    } else {
      limitacoes.push({ texto: 'Gestação: consultar bula e classificação de risco antes de prescrever.', gravidade: 'moderada', acao: 'Confirmar segurança na gravidez com farmacêutico ou obstetriz.' });
    }
  }
  if (anamnese?.lactante) {
    flags.push('Lactação — verificar excreção no leite materno');
  }

  // ── 7. Compatibilidade com perfil ideal ──────────────────

  const perfilLib = getPerfilIdeal(med.id);
  const compatibilidade: CompatibilidadePerfil[] = perfilLib.map(item => {
    const itemLower = item.toLowerCase();
    let compativel = false;
    let evidencia: string | undefined;

    // Matching logic
    const matchPairs: [string[], string][] = [
      [['diabetes', 'dm2', 'dm 2'], 'Comorbidade confirmada na anamnese'],
      [['hipertensão', 'has'], 'Comorbidade confirmada na anamnese'],
      [['insuficiência cardíaca', 'ic ', 'icc', 'feve'], 'Comorbidade confirmada na anamnese'],
      [['dislipidemia', 'colesterol', 'ldl'], 'Comorbidade confirmada na anamnese'],
      [['hipotireoidismo', 'tireoidismo'], 'Comorbidade confirmada na anamnese'],
      [['asma'], 'Comorbidade confirmada na anamnese'],
      [['dpoc'], 'Comorbidade confirmada na anamnese'],
      [['tabagismo', 'fumante'], anamnese?.habitos_vida?.tabagismo === 'sim' ? 'Tabagismo ativo confirmado' : ''],
      [['sedent'], anamnese?.habitos_vida?.atividade_fisica === 'sedentario' ? 'Sedentarismo confirmado' : ''],
      [['gestant', 'gravidez'], anamnese?.gestante ? 'Gestação confirmada' : ''],
      [['função renal preservada', 'tfg ≥', 'creatinina normal'], creatinina !== undefined && creatinina < 1.3 ? `Creatinina ${creatinina} mg/dL` : ''],
    ];

    for (const [keywords, ev] of matchPairs) {
      if (keywords.some(k => itemLower.includes(k)) && ev) {
        if (anamnese && temComorbidade(anamnese, ...keywords.filter(k => !k.includes('≥')))) {
          compativel = true;
          evidencia = ev;
          break;
        }
        if (ev && keywords.some(k => itemLower.includes(k))) {
          if (sv.pa_sistolica && sv.pa_sistolica >= 140 && itemLower.includes('hiperten')) {
            compativel = true; evidencia = `PA ${sv.pa_sistolica} mmHg`; break;
          }
          if (hba1c && hba1c > 7 && itemLower.includes('diabet')) {
            compativel = true; evidencia = `HbA1c ${hba1c}%`; break;
          }
          if (creatinina && creatinina < 1.3 && (itemLower.includes('função renal') || itemLower.includes('tfg'))) {
            compativel = true; evidencia = `Creatinina ${creatinina} mg/dL`; break;
          }
        }
      }
    }

    return { item, compativel, evidencia };
  });

  const matches = compatibilidade.filter(c => c.compativel).length;
  const pct = perfilLib.length > 0 ? Math.round((matches / perfilLib.length) * 100) : 50;

  // ── 8. Nível de confiança ─────────────────────────────────

  const favoraveis = achados.filter(a => a.tipo === 'favoravel').length;
  const alertas = achados.filter(a => a.tipo === 'alerta').length;
  const grave = limitacoes.filter(l => l.gravidade === 'grave').length;

  let confianca = 40 + (favoraveis * 8) - (alertas * 4) - (grave * 15);
  confianca = Math.min(95, Math.max(10, confianca));

  let label_confianca: string;
  let cor_confianca: ExplanacaoClinica['cor_confianca'];
  if (confianca >= 75)      { label_confianca = 'Alta adequação ao perfil'; cor_confianca = 'green'; }
  else if (confianca >= 50) { label_confianca = 'Adequação moderada';       cor_confianca = 'yellow'; }
  else if (confianca >= 30) { label_confianca = 'Adequação com ressalvas';  cor_confianca = 'orange'; }
  else                      { label_confianca = 'Revisar indicação';         cor_confianca = 'red'; }

  // ── 9. Racionalidade ─────────────────────────────────────

  const racionalidade = hipotese?.raciocinio_clinico
    ?? `${med.molecula} (${med.classe_terapeutica}) está indicado conforme a ${med.evidencia.diretriz} (${med.evidencia.sociedade} ${med.evidencia.ano}), com nível de evidência ${med.evidencia.nivel_evidencia.nivel} e grau de recomendação ${med.evidencia.nivel_evidencia.grau}. ${med.indicacao}`;

  return {
    achados_relevantes: achados,
    racionalidade,
    compatibilidade_perfil: compatibilidade,
    pct_compatibilidade: pct,
    limitacoes_especificas: limitacoes,
    nivel_confianca: confianca,
    label_confianca,
    cor_confianca,
    flags_seguranca: flags,
  };
}


// ─── Bridge to Explainable AI v2 ─────────────────────────────
// Re-exports v2 API so this module is the single entry point for
// explainability consumers (v1 = patient-profile fit; v2 = WHY/WHY-NOT/WHAT-IF).
export {
  gerarExplainableAIv2,
  gerarWHY,
  gerarWHYNOT,
  gerarWHATIF,
  gerarALTERNATIVAS,
  calcularExplainabilityScore,
} from './explainable-ai-v2';
export type {
  ExplainableAIv2Result,
  RespostaWHY,
  RespostaWHYNOT,
  RespostaWHATIF,
  RespostaALTERNATIVAS,
  ExplainabilityScore,
} from './explainable-ai-v2';
