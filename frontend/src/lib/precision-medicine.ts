// ============================================================
// PRESCREVE-AI — Precision Medicine Engine (Phase 18)
// Farmacogenômica · CPIC · DPWG · HLA typing
// Suporte à decisão clínica — não substitui o médico
// ============================================================

// ══════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════

export type Gene =
  | 'CYP2D6' | 'CYP2C19' | 'CYP2C9' | 'CYP3A4' | 'CYP2B6'
  | 'VKORC1' | 'SLCO1B1' | 'HLA-B*57:01' | 'HLA-B*15:02'
  | 'DPYD' | 'TPMT' | 'UGT1A1';

export type FenotipoMetabolizador =
  | 'poor'          // metabolizador lento
  | 'intermediate'  // metabolizador intermediário
  | 'normal'        // metabolizador normal / extenso
  | 'rapid'         // metabolizador rápido
  | 'ultrarapid';   // metabolizador ultrarápido

export type NivelEvidenciaCPIC = 'A' | 'B' | 'C' | 'D';
export type ClasseRecomendacaoCPIC = 'Strong' | 'Moderate' | 'Optional' | 'No recommendation';

export type ImpactoClinico = 'critico' | 'maior' | 'moderado' | 'menor' | 'sem_impacto';

export interface GenotipoPaciente {
  gene: Gene;
  alelo1: string;
  alelo2: string;
  fenotipo?: FenotipoMetabolizador;
}

// ══════════════════════════════════════════════════════════════
// BASE DE DADOS — INTERAÇÕES FARMACOGENÔMICAS
// ══════════════════════════════════════════════════════════════

export interface EntradaFarmacogeonomica {
  molecula: string;
  gene: Gene;
  mecanismo: string;
  impacto_por_fenotipo: Record<FenotipoMetabolizador, {
    descricao: string;
    recomendacao: string;
    ajuste_dose?: string;
    alternativa?: string;
    impacto: ImpactoClinico;
  }>;
  evidencia_cpic: NivelEvidenciaCPIC;
  classe_cpic: ClasseRecomendacaoCPIC;
  evidencia_dpwg?: 'A' | 'B' | 'C' | 'D' | 'N/A';
  doi_referencia?: string;
  aviso_hla?: string;
}

export const FARMACOGENOMICA_DB: EntradaFarmacogeonomica[] = [
  {
    molecula: 'clopidogrel',
    gene: 'CYP2C19',
    mecanismo: 'CYP2C19 converte clopidogrel em metabólito ativo; redução de atividade → menor inibição plaquetária',
    impacto_por_fenotipo: {
      poor:         { descricao: 'Conversão mínima para metabólito ativo; sem efeito antiagregante', recomendacao: 'Substituir por ticagrelor ou prasugrel (se não contraindicado)', alternativa: 'Ticagrelor 90mg 2x/dia', impacto: 'critico' },
      intermediate: { descricao: 'Conversão reduzida; eficácia parcialmente comprometida', recomendacao: 'Preferir ticagrelor; se clopidogrel mantido, aumentar vigilância de eventos isquêmicos', ajuste_dose: 'Não aumentar dose — não compensa genotipicamente', impacto: 'maior' },
      normal:       { descricao: 'Conversão normal — eficácia esperada', recomendacao: 'Usar conforme protocolo clínico padrão', impacto: 'sem_impacto' },
      rapid:        { descricao: 'Conversão levemente aumentada', recomendacao: 'Uso padrão — eficácia preservada', impacto: 'menor' },
      ultrarapid:   { descricao: 'Conversão aumentada — possível maior risco de sangramento', recomendacao: 'Monitorar sinais de sangramento; considerar redução de dose conforme protocolo', impacto: 'moderado' },
    },
    evidencia_cpic: 'A',
    classe_cpic: 'Strong',
    evidencia_dpwg: 'A',
    doi_referencia: '10.1002/cpt.1750',
  },
  {
    molecula: 'varfarina',
    gene: 'VKORC1',
    mecanismo: 'VKORC1 é o alvo da varfarina; variantes reduzem a expressão de VKORC1, aumentando sensibilidade ao anticoagulante',
    impacto_por_fenotipo: {
      poor:         { descricao: 'Alta sensibilidade — risco elevado de sangramento com doses padrão', recomendacao: 'Iniciar com 50–75% da dose habitual; ajuste rigoroso por INR', ajuste_dose: 'Reduzir 30–50% dose inicial', impacto: 'critico' },
      intermediate: { descricao: 'Sensibilidade moderada aumentada', recomendacao: 'Reduzir dose inicial em 20–30%; monitorar INR 2× por semana nas primeiras 2 semanas', ajuste_dose: 'Reduzir 20–30%', impacto: 'maior' },
      normal:       { descricao: 'Sensibilidade normal — resposta esperada', recomendacao: 'Dose padrão baseada em peso/indicação; monitorar INR rotina', impacto: 'sem_impacto' },
      rapid:        { descricao: 'Menor sensibilidade — pode necessitar doses maiores', recomendacao: 'Iniciar com dose habitual superior; verificar INR', ajuste_dose: 'Aumentar 20%', impacto: 'moderado' },
      ultrarapid:   { descricao: 'Resistência ao efeito anticoagulante', recomendacao: 'Doses significativamente maiores; considerar anticoagulante alternativo (DOAC)', alternativa: 'Rivaroxabana ou apixabana', impacto: 'maior' },
    },
    evidencia_cpic: 'A',
    classe_cpic: 'Strong',
    evidencia_dpwg: 'A',
    doi_referencia: '10.1002/cpt.1652',
  },
  {
    molecula: 'codeina',
    gene: 'CYP2D6',
    mecanismo: 'CYP2D6 converte codeína em morfina; variantes afetam conversão e eficácia analgésica',
    impacto_por_fenotipo: {
      poor:         { descricao: 'Sem conversão em morfina — sem analgesia; acúmulo de codeína', recomendacao: 'NÃO usar codeína — sem eficácia analgésica; usar tramadol (monitorado) ou paracetamol/AINE', alternativa: 'Paracetamol + AINE', impacto: 'critico' },
      intermediate: { descricao: 'Analgesia reduzida; eficácia parcial', recomendacao: 'Preferir alternativa; se usada, dose mínima eficaz', ajuste_dose: 'Dose mínima', impacto: 'maior' },
      normal:       { descricao: 'Conversão e analgesia normais', recomendacao: 'Uso conforme protocolo padrão', impacto: 'sem_impacto' },
      rapid:        { descricao: 'Maior conversão — aumenta risco de toxicidade por morfina', recomendacao: 'Evitar; se necessário, monitorar sinais de sedação e depressão respiratória', impacto: 'maior' },
      ultrarapid:   { descricao: 'CONTRAINDICADO — risco de depressão respiratória grave e morte', recomendacao: 'CONTRAINDICADO — substituir obrigatoriamente por paracetamol ou AINE', alternativa: 'Paracetamol; Ibuprofeno', impacto: 'critico' },
    },
    evidencia_cpic: 'A',
    classe_cpic: 'Strong',
    evidencia_dpwg: 'A',
    doi_referencia: '10.1002/cpt.1718',
  },
  {
    molecula: 'sinvastatina',
    gene: 'SLCO1B1',
    mecanismo: 'SLCO1B1 (OATP1B1) transporta estatinas para hepatócitos; variante *5 reduz captação hepática aumentando exposição sistêmica e risco de miopatia',
    impacto_por_fenotipo: {
      poor:         { descricao: 'Alto risco de miopatia/rabdomiólise com sinvastatina ≥40mg', recomendacao: 'Limitar sinvastatina a 20mg/dia ou preferir rosuvastatina/pravastatina', ajuste_dose: 'Máx 20mg/dia', alternativa: 'Rosuvastatina 10–20mg ou Pravastatina', impacto: 'critico' },
      intermediate: { descricao: 'Risco moderado de miopatia — especialmente doses altas', recomendacao: 'Sinvastatina ≤40mg/dia; monitorar CPK; considerar alternativa', ajuste_dose: 'Máx 40mg/dia', impacto: 'maior' },
      normal:       { descricao: 'Risco de miopatia na faixa populacional normal', recomendacao: 'Usar conforme guideline de dislipidemia; monitorar CPK anual', impacto: 'sem_impacto' },
      rapid:        { descricao: 'Menor exposição sistêmica — possível redução de eficácia', recomendacao: 'Monitorar LDL; ajuste de dose se necessário', impacto: 'menor' },
      ultrarapid:   { descricao: 'Exposição muito reduzida — eficácia comprometida', recomendacao: 'Considerar dose maior ou alternativa com melhor biodisponibilidade hepática', alternativa: 'Rosuvastatina', impacto: 'moderado' },
    },
    evidencia_cpic: 'A',
    classe_cpic: 'Strong',
    evidencia_dpwg: 'B',
    doi_referencia: '10.1002/cpt.1639',
  },
  {
    molecula: 'carbamazepina',
    gene: 'HLA-B*15:02',
    mecanismo: 'HLA-B*15:02 associado a Stevens-Johnson Syndrome (SJS) e Toxic Epidermal Necrolysis (TEN) com carbamazepina — especialmente em populações asiáticas',
    impacto_por_fenotipo: {
      poor:         { descricao: 'Portador HLA-B*15:02 positivo — alto risco de SJS/TEN', recomendacao: 'CONTRAINDICADO em portadores — usar anticonvulsivante alternativo', alternativa: 'Valproato, lamotrigina (testar HLA antes), levetiracetam', impacto: 'critico' },
      intermediate: { descricao: 'Risco aumentado; monitoramento rigoroso necessário', recomendacao: 'Iniciar com dose baixa; monitorar reação cutânea; preferir alternativa', impacto: 'maior' },
      normal:       { descricao: 'HLA-B*15:02 negativo — risco de SJS/TEN não aumentado geneticamente', recomendacao: 'Uso conforme guideline; monitorar rotineiro', impacto: 'sem_impacto' },
      rapid:        { descricao: 'HLA-B*15:02 negativo', recomendacao: 'Uso conforme indicação', impacto: 'sem_impacto' },
      ultrarapid:   { descricao: 'HLA-B*15:02 negativo', recomendacao: 'Uso conforme indicação', impacto: 'sem_impacto' },
    },
    evidencia_cpic: 'A',
    classe_cpic: 'Strong',
    evidencia_dpwg: 'A',
    doi_referencia: '10.1002/cpt.1617',
    aviso_hla: 'Testar HLA-B*15:02 antes de iniciar carbamazepina em pacientes de ancestralidade Han chinesa, tailandesa, malaiana, vietnamita ou coreana. Prevalência do alelo: Han chinesa ~6–8%.',
  },
  {
    molecula: 'abacavir',
    gene: 'HLA-B*57:01',
    mecanismo: 'HLA-B*57:01 causa reação de hipersensibilidade sistêmica grave ao abacavir (ARV)',
    impacto_por_fenotipo: {
      poor:         { descricao: 'HLA-B*57:01 positivo — CONTRAINDICADO', recomendacao: 'CONTRAINDICADO — alto risco de hipersensibilidade fatal; usar tenofovir ou zidovudina', alternativa: 'Tenofovir disoproxil, Zidovudina', impacto: 'critico' },
      intermediate: { descricao: 'HLA-B*57:01 positivo heterozigótico — risco elevado', recomendacao: 'Contraindicado — substituir', impacto: 'critico' },
      normal:       { descricao: 'HLA-B*57:01 negativo — risco de hipersensibilidade na faixa basal', recomendacao: 'Abacavir pode ser utilizado; monitorar primeiras 6 semanas', impacto: 'sem_impacto' },
      rapid:        { descricao: 'HLA-B*57:01 negativo', recomendacao: 'Uso conforme protocolo ARV', impacto: 'sem_impacto' },
      ultrarapid:   { descricao: 'HLA-B*57:01 negativo', recomendacao: 'Uso conforme protocolo ARV', impacto: 'sem_impacto' },
    },
    evidencia_cpic: 'A',
    classe_cpic: 'Strong',
    evidencia_dpwg: 'A',
    doi_referencia: '10.1002/cpt.1728',
    aviso_hla: 'Rastreio HLA-B*57:01 obrigatório antes de iniciar abacavir (padrão de cuidado internacional — DHHS, EACS). Prevalência do alelo em caucasianos: ~5–8%.',
  },
  {
    molecula: 'metoprolol',
    gene: 'CYP2D6',
    mecanismo: 'CYP2D6 metaboliza metoprolol; metabolizadores lentos têm exposição aumentada',
    impacto_por_fenotipo: {
      poor:         { descricao: 'Exposição sistêmica 5× maior; risco de bradicardia e hipotensão', recomendacao: 'Iniciar com dose 25–50% menor; titular lentamente com monitoramento de FC e PA', ajuste_dose: 'Iniciar 12,5–25mg; titular', impacto: 'maior' },
      intermediate: { descricao: 'Exposição moderadamente aumentada', recomendacao: 'Iniciar dose padrão menor; monitorar', ajuste_dose: 'Iniciar 25mg', impacto: 'moderado' },
      normal:       { descricao: 'Metabolismo normal', recomendacao: 'Dose padrão conforme indicação', impacto: 'sem_impacto' },
      rapid:        { descricao: 'Metabolismo levemente acelerado', recomendacao: 'Dose padrão; verificar resposta terapêutica', impacto: 'menor' },
      ultrarapid:   { descricao: 'Metabolismo muito acelerado — possível subdose', recomendacao: 'Aumentar frequência de dosagem ou dose; monitorar FC-alvo', impacto: 'moderado' },
    },
    evidencia_cpic: 'B',
    classe_cpic: 'Moderate',
    evidencia_dpwg: 'B',
  },
  {
    molecula: 'omeprazol',
    gene: 'CYP2C19',
    mecanismo: 'CYP2C19 metaboliza IBPs; metabolizadores lentos têm maior exposição e maior eficácia supressora de ácido',
    impacto_por_fenotipo: {
      poor:         { descricao: 'Exposição 10× maior; alta supressão ácida — resposta potencializada', recomendacao: 'Dose padrão é suficiente — não elevar; monitorar efeitos de supressão prolongada', impacto: 'moderado' },
      intermediate: { descricao: 'Exposição moderadamente aumentada', recomendacao: 'Dose padrão — eficácia preservada', impacto: 'menor' },
      normal:       { descricao: 'Metabolismo normal; eficácia padrão', recomendacao: 'Dose conforme indicação', impacto: 'sem_impacto' },
      rapid:        { descricao: 'Metabolismo aumentado — possível redução de eficácia', recomendacao: 'Dose padrão 2× ao dia ou aumentar para 40mg; ou preferir pantoprazol', ajuste_dose: '40mg ou 2×/dia', impacto: 'moderado' },
      ultrarapid:   { descricao: 'Exposição muito reduzida — resposta clínica comprometida', recomendacao: 'Substituir por IBP com menor dependência de CYP2C19 (pantoprazol, dexlansoprazol)', alternativa: 'Pantoprazol 40mg', impacto: 'maior' },
    },
    evidencia_cpic: 'B',
    classe_cpic: 'Moderate',
    evidencia_dpwg: 'B',
  },
];

// ══════════════════════════════════════════════════════════════
// FUNÇÕES PRINCIPAIS
// ══════════════════════════════════════════════════════════════

export interface AvaliacaoFarmacogenomica {
  molecula: string;
  gene: Gene;
  fenotipo: FenotipoMetabolizador;
  impacto: ImpactoClinico;
  descricao: string;
  recomendacao: string;
  ajuste_dose?: string;
  alternativa?: string;
  evidencia_cpic: NivelEvidenciaCPIC;
  classe_cpic: ClasseRecomendacaoCPIC;
  aviso_hla?: string;
  score_risco: number;  // 0–100
}

export interface RespostaEsperada {
  eficacia_estimada_pct: number;
  variabilidade: 'baixa' | 'moderada' | 'alta';
  tempo_resposta_esperado: string;
  monitoramento_sugerido: string[];
}

export interface DoseGenotipada {
  dose_padrao: string;
  dose_genotipada: string;
  racional: string;
  monitoramento: string;
}

export function avaliarFarmacogenomica(
  molecula: string,
  genotipos: GenotipoPaciente[],
): AvaliacaoFarmacogenomica[] {
  const entradas = FARMACOGENOMICA_DB.filter(
    e => e.molecula.toLowerCase() === molecula.toLowerCase(),
  );

  return entradas.map(entrada => {
    const genoPac = genotipos.find(g => g.gene === entrada.gene);
    const fenotipo: FenotipoMetabolizador = genoPac?.fenotipo ?? 'normal';
    const impactoEntry = entrada.impacto_por_fenotipo[fenotipo];

    const scoreMap: Record<ImpactoClinico, number> = {
      critico: 90, maior: 70, moderado: 50, menor: 20, sem_impacto: 0,
    };

    return {
      molecula,
      gene: entrada.gene,
      fenotipo,
      impacto: impactoEntry.impacto,
      descricao: impactoEntry.descricao,
      recomendacao: impactoEntry.recomendacao,
      ajuste_dose: impactoEntry.ajuste_dose,
      alternativa: impactoEntry.alternativa,
      evidencia_cpic: entrada.evidencia_cpic,
      classe_cpic: entrada.classe_cpic,
      aviso_hla: entrada.aviso_hla,
      score_risco: scoreMap[impactoEntry.impacto],
    };
  });
}

export function avaliarMetabolizador(
  gene: Gene,
  alelo1: string,
  alelo2: string,
): FenotipoMetabolizador {
  // Tabela simplificada de diplótipos para fenotipagem
  const alelosNulos = ['*3','*4','*5','*6','*7','*8'];
  const alelosReducidos = ['*10','*17','*41','*9'];
  const alelosRapidos = ['*1x2','*2x2'];

  const isNulo = (a: string) => alelosNulos.some(x => a.includes(x));
  const isReduzido = (a: string) => alelosReducidos.some(x => a.includes(x));
  const isRapido = (a: string) => alelosRapidos.some(x => a.includes(x));

  if (gene === 'HLA-B*57:01' || gene === 'HLA-B*15:02') {
    // HLA: presença do alelo = poor (risco)
    if (alelo1.includes('*57:01') || alelo2.includes('*57:01') ||
        alelo1.includes('*15:02') || alelo2.includes('*15:02')) return 'poor';
    return 'normal';
  }

  if (gene === 'VKORC1') {
    // VKORC1 c.-1639G>A: AA = high sensitivity (poor), AG = intermediate, GG = normal
    const haplotipo = `${alelo1}${alelo2}`.toUpperCase();
    if (haplotipo.includes('AA')) return 'poor';
    if (haplotipo.includes('AG') || haplotipo.includes('GA')) return 'intermediate';
    return 'normal';
  }

  if (gene === 'SLCO1B1') {
    // *5 = variante de risco
    if (alelo1.includes('*5') && alelo2.includes('*5')) return 'poor';
    if (alelo1.includes('*5') || alelo2.includes('*5')) return 'intermediate';
    return 'normal';
  }

  // CYPs
  const nulos = [isNulo(alelo1), isNulo(alelo2)];
  const reduzidos = [isReduzido(alelo1), isReduzido(alelo2)];
  const rapidos = [isRapido(alelo1), isRapido(alelo2)];

  if (nulos[0] && nulos[1]) return 'poor';
  if (nulos[0] || nulos[1]) {
    if (reduzidos[0] || reduzidos[1]) return 'poor';
    return 'intermediate';
  }
  if (reduzidos[0] && reduzidos[1]) return 'intermediate';
  if (rapidos[0] || rapidos[1]) return rapidos[0] && rapidos[1] ? 'ultrarapid' : 'rapid';
  return 'normal';
}

export function avaliarRiscoRAM(
  molecula: string,
  genotipos: GenotipoPaciente[],
): { risco_nivel: ImpactoClinico; descricao: string; genes_envolvidos: Gene[] } {
  const avaliacoes = avaliarFarmacogenomica(molecula, genotipos);
  if (!avaliacoes.length) return { risco_nivel: 'sem_impacto', descricao: 'Sem dados farmacogenômicos disponíveis', genes_envolvidos: [] };

  const maxScore = Math.max(...avaliacoes.map(a => a.score_risco));
  const scoreMap: Record<number, ImpactoClinico> = { 90: 'critico', 70: 'maior', 50: 'moderado', 20: 'menor', 0: 'sem_impacto' };
  const nivel = Object.entries(scoreMap).reverse().find(([s]) => maxScore >= Number(s))?.[1] ?? 'sem_impacto';

  return {
    risco_nivel: nivel,
    descricao: avaliacoes.find(a => a.score_risco === maxScore)?.descricao ?? '',
    genes_envolvidos: avaliacoes.map(a => a.gene),
  };
}

export function calcularDoseGenotipada(
  molecula: string,
  dose_padrao: string,
  genotipos: GenotipoPaciente[],
): DoseGenotipada {
  const avaliacoes = avaliarFarmacogenomica(molecula, genotipos);
  if (!avaliacoes.length) {
    return { dose_padrao, dose_genotipada: dose_padrao, racional: 'Sem dados farmacogenômicos — usar dose padrão', monitoramento: 'Monitoramento clínico habitual' };
  }

  const piorAvaliacao = avaliacoes.sort((a, b) => b.score_risco - a.score_risco)[0];
  const ajuste = piorAvaliacao.ajuste_dose;

  return {
    dose_padrao,
    dose_genotipada: ajuste ?? dose_padrao,
    racional: piorAvaliacao.descricao,
    monitoramento: piorAvaliacao.aviso_hla ?? `Monitorar resposta clínica — gene ${piorAvaliacao.gene} (${piorAvaliacao.fenotipo} metabolizer)`,
  };
}

export function avaliarRespostaEsperada(
  molecula: string,
  genotipos: GenotipoPaciente[],
): RespostaEsperada {
  const avaliacoes = avaliarFarmacogenomica(molecula, genotipos);
  const fenotipo = genotipos[0]?.fenotipo ?? 'normal';

  const eficaciaMap: Record<FenotipoMetabolizador, number> = {
    ultrarapid: 95, rapid: 90, normal: 85, intermediate: 55, poor: 20,
  };
  const variabilidadeMap: Record<FenotipoMetabolizador, RespostaEsperada['variabilidade']> = {
    ultrarapid: 'moderada', rapid: 'baixa', normal: 'baixa', intermediate: 'moderada', poor: 'alta',
  };

  const hasHLA = avaliacoes.some(a => a.gene.startsWith('HLA'));
  const tempoMap: Record<FenotipoMetabolizador, string> = {
    ultrarapid: '1–3 dias', rapid: '2–5 dias', normal: '3–7 dias', intermediate: '5–10 dias', poor: '> 14 dias ou sem resposta',
  };

  return {
    eficacia_estimada_pct: hasHLA ? (fenotipo === 'poor' ? 0 : 85) : (eficaciaMap[fenotipo] ?? 85),
    variabilidade: variabilidadeMap[fenotipo] ?? 'baixa',
    tempo_resposta_esperado: tempoMap[fenotipo] ?? '3–7 dias',
    monitoramento_sugerido: [
      ...(hasHLA ? ['Vigilância imunológica nas primeiras 6 semanas'] : []),
      ...(fenotipo === 'poor' ? ['INR semanal (anticoagulantes)', 'CPK mensal (estatinas)', 'FC/PA (betabloqueadores)'] : ['Monitoramento clínico habitual']),
      'Revisão do perfil farmacogenômico completo se resposta inadequada',
    ],
  };
}

// ══════════════════════════════════════════════════════════════
// SCORE FARMACOGENÔMICO GLOBAL
// ══════════════════════════════════════════════════════════════

export interface ScoreFarmacogenomico {
  score_geral: number;  // 0–100 (100 = sem risco, 0 = risco máximo)
  nivel_risco: 'baixo' | 'moderado' | 'alto' | 'critico';
  interacoes_criticas: number;
  interacoes_maiores: number;
  interacoes_moderadas: number;
  genes_testados: Gene[];
  recomendacoes_prioritarias: string[];
  alternativas_sugeridas: { molecula: string; alternativa: string }[];
}

export function calcularScoreFarmacogenomico(
  medicamentos: string[],
  genotipos: GenotipoPaciente[],
): ScoreFarmacogenomico {
  const todasAvaliacoes = medicamentos.flatMap(m => avaliarFarmacogenomica(m, genotipos));

  const criticas = todasAvaliacoes.filter(a => a.impacto === 'critico');
  const maiores  = todasAvaliacoes.filter(a => a.impacto === 'maior');
  const moderadas = todasAvaliacoes.filter(a => a.impacto === 'moderado');

  const penalidade = criticas.length * 30 + maiores.length * 15 + moderadas.length * 7;
  const score = Math.max(0, 100 - penalidade);

  const nivel: ScoreFarmacogenomico['nivel_risco'] =
    criticas.length > 0 ? 'critico' :
    maiores.length > 0 ? 'alto' :
    moderadas.length > 0 ? 'moderado' : 'baixo';

  return {
    score_geral: score,
    nivel_risco: nivel,
    interacoes_criticas: criticas.length,
    interacoes_maiores: maiores.length,
    interacoes_moderadas: moderadas.length,
    genes_testados: [...new Set(todasAvaliacoes.map(a => a.gene))],
    recomendacoes_prioritarias: criticas.map(a => a.recomendacao).slice(0, 3),
    alternativas_sugeridas: criticas
      .filter(a => a.alternativa)
      .map(a => ({ molecula: a.molecula, alternativa: a.alternativa! })),
  };
}

// ─── Cross-engine: Clinical Risk + Prognosis integration ─────

import { gerarPrognostico, type PerfilPrognostico, type Prognostico } from './prognosis-engine';
import type { AvaliacaoRiscoClinico } from './clinical-risk-engine';

export interface RecomendacaoPrecisao {
  molecula: string;
  score_farmacogenomico: number;
  risco_global: number;
  prognostico_ajustado: Prognostico;
  recomendacao: string;
  nivel_personalizacao: 'alta' | 'media' | 'padrao';
}

export function gerarRecomendacaoPrecisao(
  moleculas: string[],
  genotipos: GenotipoPaciente[],
  perfilRisco: AvaliacaoRiscoClinico,
  cid: string,
): RecomendacaoPrecisao[] {
  const perfil: PerfilPrognostico = {
    cid,
    idade: 55,
    sexo: 'M',
    comorbidades: perfilRisco.recomendacoes_prioritarias.slice(0, 3),
  };

  const prognostico = gerarPrognostico(perfil, '1a');

  return moleculas.map(molecula => {
    const scoreResult = calcularScoreFarmacogenomico([molecula], genotipos as GenotipoPaciente[]);
    const fg_score    = scoreResult.score_geral;
    const risco_global = perfilRisco.score_global;

    const nivel_personalizacao: RecomendacaoPrecisao['nivel_personalizacao'] =
      fg_score >= 80 ? 'alta' : fg_score >= 60 ? 'media' : 'padrao';

    const recomendacao = nivel_personalizacao === 'alta'
      ? `${molecula}: perfil genético favorável — dose padrão com alta probabilidade de resposta.`
      : nivel_personalizacao === 'media'
      ? `${molecula}: metabolizador intermediário — considerar ajuste de dose.`
      : `${molecula}: sem dados farmacogenômicos suficientes — seguir posologia padrão com monitorização.`;

    return { molecula, score_farmacogenomico: fg_score, risco_global, prognostico_ajustado: prognostico, recomendacao, nivel_personalizacao };
  });
}
