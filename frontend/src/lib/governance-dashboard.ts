// ============================================================
// PRESCREVE-AI — Governance Dashboard (MODULE 5)
// Métricas computadas para o painel de governança clínica
// Diretrizes · Evidências · Módulos · Scores por Especialidade · Score Global
// ============================================================

'use client';

import type { Guideline } from './governance';

// ──────────────────────────────────────────────────────────────
// Tipos de saída do Dashboard
// ──────────────────────────────────────────────────────────────

export interface StatusDiretriz {
  guideline_id: string;
  sigla: string;
  titulo: string;
  especialidade: string;
  status: string;
  nivel_validacao?: string;
  dias_desde_revisao: number | null;
  dias_para_proxima_revisao: number | null;
  alerta: 'ok' | 'atencao' | 'critico';
  motivo_alerta?: string;
}

export interface EvidenciaExpirando {
  titulo: string;
  guideline_sigla: string;
  ano_publicacao: number;
  anos_desde_publicacao: number;
  nivel: string;
  alerta: 'moderado' | 'alto';
  recomendacao: string;
}

export interface ModuloStatus {
  modulo: string;
  arquivo: string;
  versao_sistema: string;
  status: 'atualizado' | 'revisao_recomendada' | 'desatualizado';
  ultima_atualizacao: string;
  descricao: string;
  pendencias: string[];
}

export interface ScoreEspecialidade {
  especialidade: string;
  score: number;                   // 0–100
  diretrizes_ativas: number;
  diretrizes_total: number;
  evidencias_nivel_a: number;
  score_validacao: number;
  score_recencia: number;
  score_cobertura: number;
  detalhe: string;
}

export interface DashboardGovernanca {
  gerado_em: string;
  versao_sistema: string;

  // Seção 1 — Diretrizes
  diretrizes_ativas: number;
  diretrizes_em_revisao: number;
  diretrizes_obsoletas: number;
  diretrizes_pendentes_validacao: number;
  status_diretrizes: StatusDiretriz[];
  diretrizes_pendentes_revisao: StatusDiretriz[];

  // Seção 2 — Evidências
  total_evidencias: number;
  evidencias_nivel_a: number;
  evidencias_nivel_b: number;
  evidencias_nivel_c: number;
  evidencias_expirando: EvidenciaExpirando[];

  // Seção 3 — Módulos
  modulos: ModuloStatus[];
  modulos_desatualizados: number;

  // Seção 4 — Score por Especialidade
  scores_especialidade: ScoreEspecialidade[];

  // Seção 5 — Score Global da Plataforma
  score_global: number;             // 0–100
  score_global_label: string;
  score_global_cor: string;
  componentes_score_global: {
    nome: string;
    score: number;
    peso: number;
    descricao: string;
  }[];
  recomendacoes_melhoria: string[];
  proxima_revisao_sugerida: string;
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function diasDesde(dataISO: string): number {
  const diff = Date.now() - new Date(dataISO).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function diasAte(dataISO: string): number {
  const diff = new Date(dataISO).getTime() - Date.now();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

const MODULOS_SISTEMA: ModuloStatus[] = [
  {
    modulo: 'Evidence Engine',
    arquivo: 'evidence-engine.ts',
    versao_sistema: '2.2.0',
    status: 'atualizado',
    ultima_atualizacao: '2026-07-04',
    descricao: 'Banco de estudos clínicos com DOI, PMID, NNT — HAS, DM2, ICC, Asma',
    pendencias: [],
  },
  {
    modulo: 'Explainable AI',
    arquivo: 'explainable-ai.ts',
    versao_sistema: '2.2.0',
    status: 'atualizado',
    ultima_atualizacao: '2026-06-01',
    descricao: 'Motor de explicabilidade clínica: compatibilidade, achados, flags de segurança',
    pendencias: [],
  },
  {
    modulo: 'Guideline Conflict Engine',
    arquivo: 'guideline-conflict-engine.ts',
    versao_sistema: '2.2.0',
    status: 'atualizado',
    ultima_atualizacao: '2026-07-03',
    descricao: 'Detecção de divergências entre SBC, ESC, AHA, ACC, ADA, KDIGO, GOLD, GINA',
    pendencias: [],
  },
  {
    modulo: 'Clinical Risk Engine',
    arquivo: 'clinical-risk-engine.ts',
    versao_sistema: '2.2.0',
    status: 'atualizado',
    ultima_atualizacao: '2026-07-03',
    descricao: 'Avaliação de risco CV, renal, hemorrágico, farmacológico, interação, terapêutico',
    pendencias: [],
  },
  {
    modulo: 'Medical Trust Score',
    arquivo: 'medical-trust-score.ts',
    versao_sistema: '2.2.0',
    status: 'atualizado',
    ultima_atualizacao: '2026-07-03',
    descricao: 'Score de confiança 0–100% por recomendação — 6 dimensões ponderadas',
    pendencias: [],
  },
  {
    modulo: 'Clinical Therapeutics',
    arquivo: 'clinical-therapeutics.ts',
    versao_sistema: '2.2.0',
    status: 'atualizado',
    ultima_atualizacao: '2026-07-02',
    descricao: '10 protocolos terapêuticos validados: HAS, DM2, Dislipidemia, Asma, DPOC, ICC, SCA, Hipotireoidismo, PAC, Faringoamigdalite',
    pendencias: [],
  },
  {
    modulo: 'Safety Rules',
    arquivo: 'safety-rules.ts',
    versao_sistema: '2.2.0',
    status: 'atualizado',
    ultima_atualizacao: '2026-06-01',
    descricao: '15 pares de interação crítica, Critérios de Beers, alertas gestante/lactante/renal',
    pendencias: [],
  },
  {
    modulo: 'Pharma Database',
    arquivo: 'pharma-database.ts',
    versao_sistema: '2.2.0',
    status: 'atualizado',
    ultima_atualizacao: '2026-07-02',
    descricao: '55+ moléculas com posologia, ajuste renal/hepático, populações especiais',
    pendencias: [],
  },
  {
    modulo: 'Governance Engine',
    arquivo: 'governance.ts',
    versao_sistema: '2.2.0',
    status: 'atualizado',
    ultima_atualizacao: '2026-07-04',
    descricao: 'Registro de diretrizes, revisões, atualizações científicas e auditoria de governança',
    pendencias: [],
  },
  {
    modulo: 'Medical Audit',
    arquivo: 'medical-audit.ts',
    versao_sistema: '2.2.0',
    status: 'atualizado',
    ultima_atualizacao: '2026-06-01',
    descricao: 'Rastreabilidade clínica completa: prescrições, ajustes, alertas ignorados, hash de integridade',
    pendencias: [],
  },
  {
    modulo: 'Recommendation Registry',
    arquivo: 'recommendation-registry.ts',
    versao_sistema: '2.2.0',
    status: 'atualizado',
    ultima_atualizacao: '2026-07-04',
    descricao: 'Versionamento de recomendações clínicas: guideline, evidência, engine, scores',
    pendencias: [],
  },
  {
    modulo: 'Second Opinion Engine',
    arquivo: 'second-opinion.ts',
    versao_sistema: '2.1.0',
    status: 'revisao_recomendada',
    ultima_atualizacao: '2026-05-01',
    descricao: 'Motor de segunda opinião clínica com alternativas baseadas em evidência',
    pendencias: ['Integrar scores do Medical Trust Score', 'Adicionar conflitos do Guideline Conflict Engine'],
  },
  {
    modulo: 'Prognostic Engine',
    arquivo: 'prognostic-engine.ts',
    versao_sistema: '2.1.0',
    status: 'revisao_recomendada',
    ultima_atualizacao: '2026-05-01',
    descricao: 'Motor de avaliação prognóstica por condição clínica',
    pendencias: ['Validar scores de risco com dados brasileiros'],
  },
];

// ──────────────────────────────────────────────────────────────
// Score de confiabilidade por especialidade
// ──────────────────────────────────────────────────────────────

function calcularScoreEspecialidade(
  especialidade: string,
  guidelines: Guideline[]
): ScoreEspecialidade {
  const gls = guidelines.filter(g => g.area === especialidade);
  const ativas = gls.filter(g => g.status === 'vigente').length;
  const total = gls.length;

  // Score de validação: % de diretrizes com nivel_validacao = 'validado'
  const validadas = gls.filter(g => g.nivel_validacao === 'validado').length;
  const scoreValidacao = total > 0 ? Math.round((validadas / total) * 100) : 50;

  // Score de recência: penaliza diretrizes com ano_publicacao > 5 anos
  const anoAtual = new Date().getFullYear();
  let somaRecencia = 0;
  gls.forEach(g => {
    const anos = g.ano_publicacao ? anoAtual - g.ano_publicacao : 10;
    if (anos <= 2)      somaRecencia += 100;
    else if (anos <= 4) somaRecencia += 80;
    else if (anos <= 6) somaRecencia += 60;
    else if (anos <= 8) somaRecencia += 40;
    else                somaRecencia += 20;
  });
  const scoreRecencia = total > 0 ? Math.round(somaRecencia / total) : 50;

  // Score de cobertura: % de condições cobertas / condições esperadas por especialidade
  const coberturasEsperadas: Record<string, number> = {
    cardiologia:    5, // HAS, Dislipidemia, ICC, SCA, FA
    endocrinologia: 3, // DM2, Hipotireoidismo, Obesidade
    pneumologia:    2, // Asma, DPOC
    nefrologia:     1, // DRC
    psiquiatria:    2, // Depressão, Ansiedade
  };
  const esperadas = coberturasEsperadas[especialidade] ?? 2;
  const scoreCobertura = Math.min(100, Math.round((ativas / esperadas) * 100));

  // Evidências Nível A
  const totalEstudos = gls.flatMap(g =>
    g.versoes.flatMap(v => v.evidencias.filter(e => e.nivel === 'A'))
  ).length;

  // Score global da especialidade (ponderado)
  const score = Math.round(
    scoreValidacao * 0.35 +
    scoreRecencia  * 0.35 +
    scoreCobertura * 0.30
  );

  return {
    especialidade,
    score,
    diretrizes_ativas: ativas,
    diretrizes_total: total,
    evidencias_nivel_a: totalEstudos,
    score_validacao: scoreValidacao,
    score_recencia: scoreRecencia,
    score_cobertura: scoreCobertura,
    detalhe: `${ativas}/${total} diretrizes ativas — ${totalEstudos} estudos Nível A`,
  };
}

// ──────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ──────────────────────────────────────────────────────────────

export function gerarDashboardGovernanca(guidelines: Guideline[]): DashboardGovernanca {
  const agora = new Date();
  const anoAtual = agora.getFullYear();

  // ── Seção 1: Status das Diretrizes ──────────────────────────
  const statusDiretrizes: StatusDiretriz[] = guidelines.map(g => {
    const diasDesdeRev = g.data_ultima_revisao ? diasDesde(g.data_ultima_revisao) : null;
    const diasParaProx = g.data_proxima_revisao ? diasAte(g.data_proxima_revisao) : null;

    let alerta: StatusDiretriz['alerta'] = 'ok';
    let motivo: string | undefined;

    if (g.status === 'obsoleta') {
      alerta = 'critico';
      motivo = 'Diretriz marcada como obsoleta — requer substituição';
    } else if (diasParaProx !== null && diasParaProx < 0) {
      alerta = 'critico';
      motivo = `Revisão programada vencida há ${Math.abs(diasParaProx)} dias`;
    } else if (diasParaProx !== null && diasParaProx < 90) {
      alerta = 'atencao';
      motivo = `Revisão programada em ${diasParaProx} dias`;
    } else if (g.nivel_validacao === 'em_revisao' || g.nivel_validacao === 'pendente') {
      alerta = 'atencao';
      motivo = `Nível de validação: ${g.nivel_validacao}`;
    } else if (g.status === 'em_revisao') {
      alerta = 'atencao';
      motivo = 'Em processo de revisão';
    }

    return {
      guideline_id:               g.id,
      sigla:                      g.sigla ?? g.id,
      titulo:                     g.titulo,
      especialidade:              g.area,
      status:                     g.status,
      nivel_validacao:            g.nivel_validacao,
      dias_desde_revisao:         diasDesdeRev,
      dias_para_proxima_revisao:  diasParaProx,
      alerta,
      motivo_alerta: motivo,
    };
  });

  const pendentesRevisao = statusDiretrizes
    .filter(s => s.alerta !== 'ok')
    .sort((a, b) => {
      const ordem = { critico: 0, atencao: 1, ok: 2 };
      return ordem[a.alerta] - ordem[b.alerta];
    });

  // ── Seção 2: Evidências ──────────────────────────────────────
  const todasEvidencias = guidelines.flatMap(g =>
    g.versoes.flatMap(v => v.evidencias.map(e => ({ ...e, guideline_sigla: g.sigla ?? g.id })))
  );

  const evidenciasExpirando: EvidenciaExpirando[] = todasEvidencias
    .filter(e => e.ano < anoAtual - 6)
    .map(e => {
      const anos = anoAtual - e.ano;
      return {
        titulo:               e.titulo,
        guideline_sigla:      e.guideline_sigla,
        ano_publicacao:       e.ano,
        anos_desde_publicacao: anos,
        nivel:                e.nivel,
        alerta:               anos > 10 ? 'alto' as const : 'moderado' as const,
        recomendacao:         anos > 10
          ? 'Verificar se há meta-análise mais recente que atualize este estudo'
          : 'Monitorar novos estudos na área — considerar revisão em próxima versão',
      };
    })
    .sort((a, b) => b.anos_desde_publicacao - a.anos_desde_publicacao);

  // ── Seção 3: Módulos ─────────────────────────────────────────
  const modulosDesatualizados = MODULOS_SISTEMA.filter(m => m.status !== 'atualizado').length;

  // ── Seção 4: Score por Especialidade ─────────────────────────
  const especialidades = [...new Set(guidelines.map(g => g.area))];
  const scoresEspecialidade = especialidades.map(e => calcularScoreEspecialidade(e, guidelines));

  // ── Seção 5: Score Global ─────────────────────────────────────
  // Componentes: Cobertura de Diretrizes (25%) · Qualidade de Evidência (25%) ·
  //              Validação Clínica (20%) · Rastreabilidade (20%) · Recência (10%)
  const totalGuidelines = guidelines.length;
  const guidelinesAtivas = guidelines.filter(g => g.status === 'vigente').length;
  const guidelinesValidadas = guidelines.filter(g => g.nivel_validacao === 'validado').length;

  const scoreCobertura = Math.min(100, Math.round((guidelinesAtivas / Math.max(totalGuidelines, 1)) * 100));
  const scoreQualidadeEv = Math.round(
    (todasEvidencias.filter(e => e.nivel === 'A').length /
     Math.max(todasEvidencias.length, 1)) * 100
  );
  const scoreValidacao = Math.round((guidelinesValidadas / Math.max(totalGuidelines, 1)) * 100);
  const scoreRastreabilidade = 95; // medical-audit.ts + recommendation-registry.ts implementados
  const scoreRecenciaGlobal = Math.round(
    scoresEspecialidade.reduce((s, e) => s + e.score_recencia, 0) / Math.max(scoresEspecialidade.length, 1)
  );
  const scoreModulos = Math.round(
    ((MODULOS_SISTEMA.length - modulosDesatualizados) / MODULOS_SISTEMA.length) * 100
  );

  const componentes = [
    { nome: 'Cobertura de Diretrizes',   score: scoreCobertura,       peso: 0.20, descricao: `${guidelinesAtivas}/${totalGuidelines} diretrizes ativas` },
    { nome: 'Qualidade da Evidência',    score: scoreQualidadeEv,     peso: 0.25, descricao: `${todasEvidencias.filter(e => e.nivel === 'A').length}/${todasEvidencias.length} estudos Nível A` },
    { nome: 'Validação Clínica',         score: scoreValidacao,       peso: 0.20, descricao: `${guidelinesValidadas}/${totalGuidelines} diretrizes validadas por especialistas` },
    { nome: 'Rastreabilidade e Auditoria',score: scoreRastreabilidade, peso: 0.20, descricao: 'Audit trail completo com hash de integridade + versionamento de recomendações' },
    { nome: 'Recência das Evidências',   score: scoreRecenciaGlobal,  peso: 0.10, descricao: 'Atualidade das diretrizes vs. publicações recentes' },
    { nome: 'Cobertura de Módulos',      score: scoreModulos,         peso: 0.05, descricao: `${MODULOS_SISTEMA.length - modulosDesatualizados}/${MODULOS_SISTEMA.length} módulos atualizados` },
  ];

  const scoreGlobal = Math.round(
    componentes.reduce((acc, c) => acc + c.score * c.peso, 0)
  );

  let labelGlobal: string;
  let corGlobal: string;
  if (scoreGlobal >= 90)      { labelGlobal = 'Plataforma auditável de alta confiança'; corGlobal = 'verde_escuro'; }
  else if (scoreGlobal >= 75) { labelGlobal = 'Plataforma confiável — melhorias pontuais recomendadas'; corGlobal = 'verde'; }
  else if (scoreGlobal >= 60) { labelGlobal = 'Plataforma com confiança moderada — revisão necessária'; corGlobal = 'amarelo'; }
  else                        { labelGlobal = 'Plataforma com deficiências críticas — revisão urgente'; corGlobal = 'vermelho'; }

  // Recomendações de melhoria
  const recomendacoes: string[] = [];
  if (pendentesRevisao.some(p => p.alerta === 'critico')) {
    recomendacoes.push('Revisar diretrizes com alerta crítico (revisão vencida ou status obsoleta)');
  }
  if (evidenciasExpirando.some(e => e.alerta === 'alto')) {
    recomendacoes.push('Atualizar estudos com mais de 10 anos de publicação nas diretrizes ativas');
  }
  if (modulosDesatualizados > 0) {
    recomendacoes.push(`${modulosDesatualizados} módulo(s) com revisão recomendada — verificar pendências`);
  }
  if (scoreCobertura < 80) {
    recomendacoes.push('Ampliar cobertura de diretrizes — especialidades com baixa representação');
  }
  if (scoreQualidadeEv < 70) {
    recomendacoes.push('Aumentar proporção de evidências Nível A no banco de estudos');
  }
  if (recomendacoes.length === 0) {
    recomendacoes.push('Plataforma em conformidade — manter ciclo de revisão programado');
  }

  // Próxima revisão sugerida
  const proxRevData = new Date(agora);
  proxRevData.setMonth(proxRevData.getMonth() + (scoreGlobal >= 80 ? 6 : 3));
  const proxRev = proxRevData.toISOString().slice(0, 10);

  return {
    gerado_em:    agora.toISOString(),
    versao_sistema: '2.2.0',

    diretrizes_ativas:             guidelinesAtivas,
    diretrizes_em_revisao:         guidelines.filter(g => g.status === 'em_revisao').length,
    diretrizes_obsoletas:          guidelines.filter(g => g.status === 'obsoleta').length,
    diretrizes_pendentes_validacao: guidelines.filter(g => g.nivel_validacao === 'pendente').length,
    status_diretrizes:             statusDiretrizes,
    diretrizes_pendentes_revisao:  pendentesRevisao,

    total_evidencias:  todasEvidencias.length,
    evidencias_nivel_a: todasEvidencias.filter(e => e.nivel === 'A').length,
    evidencias_nivel_b: todasEvidencias.filter(e => e.nivel === 'B').length,
    evidencias_nivel_c: todasEvidencias.filter(e => e.nivel === 'C').length,
    evidencias_expirando: evidenciasExpirando.slice(0, 10),

    modulos:             MODULOS_SISTEMA,
    modulos_desatualizados: modulosDesatualizados,

    scores_especialidade: scoresEspecialidade.sort((a, b) => b.score - a.score),

    score_global:             scoreGlobal,
    score_global_label:       labelGlobal,
    score_global_cor:         corGlobal,
    componentes_score_global: componentes,
    recomendacoes_melhoria:   recomendacoes,
    proxima_revisao_sugerida: proxRev,
  };
}

// ──────────────────────────────────────────────────────────────
// UI helpers
// ──────────────────────────────────────────────────────────────

export const ALERTA_META: Record<StatusDiretriz['alerta'], { label: string; cls: string; dot: string }> = {
  ok:      { label: 'OK',       cls: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',  dot: 'bg-green-500'  },
  atencao: { label: 'Atenção',  cls: 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',  dot: 'bg-amber-400'  },
  critico: { label: 'Crítico',  cls: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',    dot: 'bg-red-500'    },
};

export const STATUS_MODULO_META: Record<ModuloStatus['status'], { label: string; cls: string }> = {
  atualizado:          { label: 'Atualizado',           cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  revisao_recomendada: { label: 'Revisão recomendada',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  desatualizado:       { label: 'Desatualizado',        cls: 'bg-red-100   text-red-600   dark:bg-red-900/30   dark:text-red-400'   },
};

export function scoreGlobalCor(score: number): string {
  if (score >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 75) return 'text-green-600   dark:text-green-400';
  if (score >= 60) return 'text-amber-600   dark:text-amber-400';
  return                  'text-red-600     dark:text-red-400';
}
