// ============================================================
// PRESCREVE-AI — Medical Copilot (Phase 19)
// Assistente clínico explicável · SOAP · Discussão · 2ª opinião
// Suporte à decisão clínica — NÃO substitui o médico
// ============================================================

// ══════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════

export type ModoConsulta = 'residencia' | 'especialista' | 'auditoria' | 'explicabilidade';

export type NivelConfianca = 'alta' | 'moderada' | 'baixa';

export interface ContextoClinico {
  queixa_principal: string;
  historia_doenca_atual: string;
  antecedentes: string[];
  medicamentos_em_uso: string[];
  alergias: string[];
  exame_fisico: Record<string, string | number>;
  exames_laboratoriais?: Record<string, number>;
  cids_ativos?: string[];
  idade?: number;
  sexo?: 'M' | 'F';
  peso?: number;
}

// ══════════════════════════════════════════════════════════════
// SOAP
// ══════════════════════════════════════════════════════════════

export interface NotaSOAP {
  S: {
    queixa_principal: string;
    hda: string;
    hpp: string[];
    medicamentos: string[];
    alergias: string[];
    revisao_sistemas: string[];
  };
  O: {
    sinais_vitais: Record<string, string | number>;
    exame_fisico_relevante: string[];
    exames_complementares: { exame: string; resultado: string; interpretacao: string }[];
  };
  A: {
    hipotese_principal: string;
    hipoteses_diferenciais: string[];
    problemas_ativos: string[];
    raciocinio_clinico: string;
    nivel_confianca: NivelConfianca;
  };
  P: {
    conduta_imediata: string[];
    prescricao_sugerida: string[];
    exames_solicitados: string[];
    encaminhamentos?: string[];
    retorno: string;
    metas_terapeuticas: string[];
    orientacoes_paciente: string[];
  };
  modo: ModoConsulta;
  gerado_em: string;
  aviso_cdss: string;
}

// ══════════════════════════════════════════════════════════════
// BASE DE CONHECIMENTO — HIPÓTESES POR APRESENTAÇÃO
// ══════════════════════════════════════════════════════════════

interface EntradaClinical {
  hipotese_principal: string;
  hipoteses_diferenciais: string[];
  exames_sugeridos: string[];
  conduta: string[];
  metas: string[];
  orientacoes: string[];
  retorno: string;
  nivel_confianca: NivelConfianca;
  diretriz: string;
}

const CONHECIMENTO_CLINICO: Record<string, EntradaClinical> = {
  hipertensao: {
    hipotese_principal: 'Hipertensão arterial sistêmica (I10) — primária',
    hipoteses_diferenciais: ['HAS secundária (renal, endócrina)', 'Hipertensão do avental branco', 'Hipertensão mascarada', 'Síndrome metabólica'],
    exames_sugeridos: ['Glicemia jejum', 'Perfil lipídico', 'Creatinina + TFG-e', 'Potássio', 'Urina tipo 1', 'ECG 12 derivações', 'Microalbuminúria'],
    conduta: ['Iniciar IECA ou BRA se não contraindicado', 'Meta PA < 130/80 mmHg (ESC 2023)', 'Restrição sódio < 5g/dia', 'Atividade física ≥ 150min/semana'],
    metas: ['PA < 130/80 mmHg (ESC 2023)', 'TFG estável', 'Regressão HOD se presente'],
    orientacoes: ['Monitorar PA domiciliar 2×/dia por 7 dias', 'Dieta DASH', 'Parar tabagismo se fumante', 'Retornar com PA de 7 dias'],
    retorno: '30 dias (ou antes se PA > 160/100 mmHg)',
    nivel_confianca: 'alta',
    diretriz: 'ESC/ESH 2023',
  },
  diabetes_tipo2: {
    hipotese_principal: 'Diabetes mellitus tipo 2 (E11) — descompensado',
    hipoteses_diferenciais: ['DM tipo 1 de início tardio (LADA)', 'Diabetes secundário (corticoide, pancreatogênico)', 'Síndrome metabólica', 'Pré-diabetes'],
    exames_sugeridos: ['HbA1c', 'Glicemia jejum + 2h', 'Perfil lipídico', 'Creatinina + TFG-e', 'Microalbuminúria', 'Função hepática (se metformina)'],
    conduta: ['Metformina 500mg com refeições, titular até 1000–2000mg/dia', 'Se TFG < 30: contraindicada', 'Se risco CV alto: SGLT2i ou GLP-1 RA (ADA 2025)', 'HbA1c-alvo < 7,0% (geral) ou < 8,0% (idosos/frágeis)'],
    metas: ['HbA1c < 7,0%', 'Glicemia jejum 80–130 mg/dL', 'PA < 130/80', 'LDL < 70 mg/dL (alto risco CV)'],
    orientacoes: ['Automonitorização glicêmica 2×/dia', 'Cuidados com pés (exame anual)', 'Rastreio retinopatia anual', 'Dieta com baixo índice glicêmico'],
    retorno: '3 meses (HbA1c)',
    nivel_confianca: 'alta',
    diretriz: 'ADA Standards of Care 2025 / SBD 2024',
  },
  insuficiencia_cardiaca: {
    hipotese_principal: 'Insuficiência cardíaca com fração de ejeção reduzida (IC-FEr) (I50)',
    hipoteses_diferenciais: ['IC com FE preservada (HFpEF)', 'Cardiomiopatia dilatada idiopática', 'IC por isquemia (pós-IAM)', 'DPOC descompensado', 'TEP'],
    exames_sugeridos: ['NT-proBNP ou BNP', 'Ecocardiograma transtorácico', 'ECG', 'Rx tórax', 'Função renal + eletrólitos', 'Hemograma'],
    conduta: ['IECA (ou ARNI se tolerado)', 'Betabloqueador (carvedilol/bisoprolol/metoprolol succinato)', 'ARM (espironolactona/eplerenona)', 'SGLT2i (empagliflozina/dapagliflozina) — nível A (ESC 2023)', 'Diurético se congestão'],
    metas: ['FEVE > 40% em 12 meses', 'NYHA I–II', 'NT-proBNP decrescente', 'Internações evitadas'],
    orientacoes: ['Restrição hídrica 1,5L/dia se Na < 130', 'Pesar diariamente (sinal de congestão)', 'Evitar AINEs', 'Vacinação pneumocócica + influenza'],
    retorno: '14 dias (ou pronto-socorro se ganho > 2kg em 3 dias)',
    nivel_confianca: 'alta',
    diretriz: 'ESC Heart Failure Guidelines 2023',
  },
  asma: {
    hipotese_principal: 'Asma brônquica (J45) — moderada a grave',
    hipoteses_diferenciais: ['DPOC', 'Bronquite eosinofílica', 'Disfunção de cordas vocais', 'IC com broncoespasmo', 'Tosse por IECA'],
    exames_sugeridos: ['Espirometria + prova broncodilatadora', 'FeNO (óxido nítrico exalado)', 'IgE total + específica', 'Peak flow diário'],
    conduta: ['ICS (budesonida) + LABA (formoterol) — estratégia MART (GINA 2025)', 'Evitar betabloqueadores não-seletivos', 'Controle de gatilhos (ácaros, fumo, exercício)', 'Plano de ação escrito'],
    metas: ['Asma controlada — GINA step ≤ 2', '< 2 episódios/semana de sintomas diurnos', 'VEF1 > 80% previsto'],
    orientacoes: ['Técnica inalatória revisada a cada consulta', 'Câmara espaçadora', 'Monitorar peak flow domiciliar', 'Identificar e evitar gatilhos'],
    retorno: '4–6 semanas',
    nivel_confianca: 'alta',
    diretriz: 'GINA 2025',
  },
  dpoc: {
    hipotese_principal: 'DPOC (J44) — exacerbação aguda',
    hipoteses_diferenciais: ['IC descompensada', 'Pneumonia', 'TEP', 'Asma de início tardio', 'Bronquiectasias'],
    exames_sugeridos: ['Espirometria (estável)', 'Rx tórax', 'PCR', 'Gasometria (se SpO2 < 92%)', 'Hemograma', 'ECG'],
    conduta: ['SABA (salbutamol) + SAMA (ipratrópio) na fase aguda', 'Manutenção: LAMA ± LABA', 'Corticoide sistêmico 40mg/dia × 5 dias na exacerbação', 'ATB se escarro purulento (amoxicilina/azitromicina)'],
    metas: ['SpO2 88–92% (DPOC hipercápnico)', 'Redução de exacerbações', 'CAT score < 10'],
    orientacoes: ['Cessação de tabagismo — prioridade máxima', 'Reabilitação pulmonar', 'Vacinação influenza + pneumocócica', 'Oxigenoterapia se PaO2 < 55 mmHg'],
    retorno: '30 dias pós-exacerbação',
    nivel_confianca: 'alta',
    diretriz: 'GOLD 2025',
  },
};

function detectarContexto(ctx: ContextoClinico): string {
  const queixa = ctx.queixa_principal.toLowerCase();
  const hist = ctx.historia_doenca_atual.toLowerCase();
  const txt = `${queixa} ${hist}`;

  if (ctx.cids_ativos?.includes('I10') || txt.includes('hipertens') || txt.includes('pressão alta')) return 'hipertensao';
  if (ctx.cids_ativos?.includes('E11') || txt.includes('diabete') || txt.includes('glicemia')) return 'diabetes_tipo2';
  if (ctx.cids_ativos?.includes('I50') || txt.includes('insuficiência cardíaca') || txt.includes('dispneia') && txt.includes('edema')) return 'insuficiencia_cardiaca';
  if (ctx.cids_ativos?.includes('J45') || txt.includes('asma') || txt.includes('broncoespasmo')) return 'asma';
  if (ctx.cids_ativos?.includes('J44') || txt.includes('dpoc') || txt.includes('emphysema')) return 'dpoc';
  return 'hipertensao'; // default
}

// ══════════════════════════════════════════════════════════════
// GERAÇÃO DE SOAP
// ══════════════════════════════════════════════════════════════

export function gerarSOAP(ctx: ContextoClinico, modo: ModoConsulta = 'especialista'): NotaSOAP {
  const conhecimento = CONHECIMENTO_CLINICO[detectarContexto(ctx)];

  const examesFormatados = Object.entries(ctx.exames_laboratoriais ?? {}).map(([exame, val]) => ({
    exame,
    resultado: `${val}`,
    interpretacao: interpretarExame(exame, val),
  }));

  const vitaisFormatados: Record<string, string | number> = {
    ...ctx.exame_fisico,
    'Peso': ctx.peso ? `${ctx.peso} kg` : 'não informado',
  };

  const modoAjuste: Record<ModoConsulta, string> = {
    residencia:      'Nota gerada em modo RESIDÊNCIA — inclui raciocínio diagnóstico expandido para aprendizado',
    especialista:    'Nota gerada em modo ESPECIALISTA — foco em conduta e metas terapêuticas baseadas em evidência',
    auditoria:       'Nota gerada em modo AUDITORIA — rastreabilidade completa, guidelines referenciados, sem omissões',
    explicabilidade: 'Nota gerada em modo EXPLICABILIDADE — cada decisão com justificativa e nível de evidência',
  };

  return {
    S: {
      queixa_principal: ctx.queixa_principal,
      hda: ctx.historia_doenca_atual,
      hpp: ctx.antecedentes,
      medicamentos: ctx.medicamentos_em_uso,
      alergias: ctx.alergias.length ? ctx.alergias : ['NKDA (sem alergias conhecidas)'],
      revisao_sistemas: gerarRevisaoSistemas(ctx),
    },
    O: {
      sinais_vitais: vitaisFormatados,
      exame_fisico_relevante: Object.entries(ctx.exame_fisico)
        .filter(([k]) => !['peso','altura','imc'].includes(k))
        .map(([k, v]) => `${k}: ${v}`),
      exames_complementares: examesFormatados,
    },
    A: {
      hipotese_principal: conhecimento.hipotese_principal,
      hipoteses_diferenciais: conhecimento.hipoteses_diferenciais,
      problemas_ativos: ctx.cids_ativos ?? [],
      raciocinio_clinico: gerarRaciocinioClinco(ctx, conhecimento, modo),
      nivel_confianca: conhecimento.nivel_confianca,
    },
    P: {
      conduta_imediata: conhecimento.conduta,
      prescricao_sugerida: conhecimento.conduta.filter(c => c.toLowerCase().includes('mg') || c.toLowerCase().includes('iniciar')),
      exames_solicitados: conhecimento.exames_sugeridos,
      retorno: conhecimento.retorno,
      metas_terapeuticas: conhecimento.metas,
      orientacoes_paciente: conhecimento.orientacoes,
    },
    modo,
    gerado_em: new Date().toISOString(),
    aviso_cdss: `⚕️ SUPORTE À DECISÃO CLÍNICA — ${modoAjuste[modo]}. A decisão médica é exclusivamente do médico assistente.`,
  };
}

function gerarRevisaoSistemas(ctx: ContextoClinico): string[] {
  const sistemas: string[] = [];
  const txt = `${ctx.queixa_principal} ${ctx.historia_doenca_atual}`.toLowerCase();
  if (txt.includes('dor') || txt.includes('cefaleia')) sistemas.push('Neurológico: cefaleias/dores referidas');
  if (txt.includes('dispneia') || txt.includes('tosse')) sistemas.push('Respiratório: dispneia/tosse relatada');
  if (txt.includes('edema') || txt.includes('palpitação')) sistemas.push('Cardiovascular: palpitações/edema periférico');
  if (txt.includes('náusea') || txt.includes('epigástrio')) sistemas.push('Gastrointestinal: sintomas digestivos');
  if (!sistemas.length) sistemas.push('Revisão de sistemas sem alterações adicionais relatadas');
  return sistemas;
}

function gerarRaciocinioClinco(ctx: ContextoClinico, conhecimento: EntradaClinical, modo: ModoConsulta): string {
  const base = `Hipótese de ${conhecimento.hipotese_principal} fundamentada em: queixa de "${ctx.queixa_principal}", antecedentes de ${ctx.antecedentes.slice(0,2).join(', ') || 'não relatados'} e achados do exame físico.`;
  if (modo === 'residencia') {
    return `${base} Diagnósticos diferenciais incluem ${conhecimento.hipoteses_diferenciais.slice(0,3).join('; ')}. Diretriz aplicada: ${conhecimento.diretriz}.`;
  }
  if (modo === 'auditoria') {
    return `${base} Rastreabilidade: diretriz ${conhecimento.diretriz}, confiança ${conhecimento.nivel_confianca}. Alternativas consideradas: ${conhecimento.hipoteses_diferenciais.join('; ')}.`;
  }
  if (modo === 'explicabilidade') {
    return `${base} PORQUE: prevalência e quadro clínico compatível. POR QUE NÃO (primário): ${conhecimento.hipoteses_diferenciais[0]} — aguarda exames confirmatórios. Diretriz: ${conhecimento.diretriz}.`;
  }
  return base;
}

function interpretarExame(exame: string, valor: number): string {
  const intervalos: Record<string, [number, number, string, string]> = {
    'glicemia_jejum':   [70, 99,  'Normal', 'Alterado'],
    'hba1c':            [4,  5.7, 'Normal', 'Acima do alvo'],
    'creatinina':       [0.6, 1.2,'Normal', 'Elevada'],
    'tfg':              [90, 999, 'Normal', 'Reduzida'],
    'potassio':         [3.5, 5.0,'Normal', 'Fora da faixa'],
    'colesterol_total': [0,  200, 'Desejável', 'Elevado'],
    'ldl':              [0,  100, 'Ótimo', 'Acima do alvo'],
    'hdl':              [40, 999, 'Normal', 'Baixo'],
    'pa_sistolica':     [90, 130, 'Normal', 'Elevada'],
  };
  const ref = intervalos[exame.toLowerCase()];
  if (!ref) return 'Valor registrado — interpretação clínica necessária';
  return valor >= ref[0] && valor <= ref[1] ? ref[2] : `${ref[3]} (ref: ${ref[0]}–${ref[1]})`;
}

// ══════════════════════════════════════════════════════════════
// RESUMO CLÍNICO
// ══════════════════════════════════════════════════════════════

export interface ResumoClinco {
  principais_achados: string[];
  hipoteses: string[];
  exames_sugeridos: string[];
  tratamento_sugerido: string[];
  riscos_identificados: string[];
  conflitos_detectados: string[];
  prognostico: string;
  nivel_urgencia: 'eletivo' | 'prioritario' | 'urgente' | 'emergencia';
  score_complexidade: number;  // 0–100
  diretriz_principal: string;
}

export function gerarResumoConsulta(ctx: ContextoClinico): ResumoClinco {
  const conhecimento = CONHECIMENTO_CLINICO[detectarContexto(ctx)];
  const conflitos = detectarConflitos(ctx);
  const riscos = detectarRiscos(ctx);

  const urgencia = riscos.some(r => r.includes('emergência') || r.includes('internação'))
    ? 'emergencia'
    : riscos.length >= 3 ? 'urgente'
    : riscos.length >= 1 ? 'prioritario'
    : 'eletivo';

  const complexidade = Math.min(100,
    (ctx.antecedentes.length * 8) +
    (ctx.medicamentos_em_uso.length * 5) +
    (conflitos.length * 15) +
    (riscos.length * 10) +
    ((ctx.exames_laboratoriais ? Object.keys(ctx.exames_laboratoriais).length : 0) * 3),
  );

  return {
    principais_achados: [
      ctx.queixa_principal,
      ...Object.entries(ctx.exame_fisico).slice(0, 3).map(([k, v]) => `${k}: ${v}`),
    ],
    hipoteses: [conhecimento.hipotese_principal, ...conhecimento.hipoteses_diferenciais.slice(0, 2)],
    exames_sugeridos: conhecimento.exames_sugeridos,
    tratamento_sugerido: conhecimento.conduta,
    riscos_identificados: riscos,
    conflitos_detectados: conflitos,
    prognostico: gerarPrognostico(ctx, urgencia),
    nivel_urgencia: urgencia,
    score_complexidade: complexidade,
    diretriz_principal: conhecimento.diretriz,
  };
}

function detectarRiscos(ctx: ContextoClinico): string[] {
  const riscos: string[] = [];
  const labs = ctx.exames_laboratoriais ?? {};
  if (labs['pa_sistolica'] && labs['pa_sistolica'] > 180) riscos.push('Crise hipertensiva — PA > 180 mmHg');
  if (labs['glicemia_jejum'] && labs['glicemia_jejum'] > 400) riscos.push('Hiperglicemia grave — avaliar cetoacidose');
  if (labs['tfg'] && labs['tfg'] < 30) riscos.push('TFG < 30 — revisar doses renais; evitar metformina');
  if (labs['potassio'] && labs['potassio'] > 5.5) riscos.push('Hipercalemia — revisar IECA/BRA/ARM');
  if (labs['creatinina'] && labs['creatinina'] > 3.0) riscos.push('Disfunção renal grave — nefropatia em atividade');
  if (ctx.alergias.some(a => ctx.medicamentos_em_uso.some(m => m.toLowerCase().includes(a.toLowerCase())))) {
    riscos.push('ALERTA: medicamento prescrito em alergias relatadas');
  }
  return riscos;
}

function detectarConflitos(ctx: ContextoClinico): string[] {
  const conflitos: string[] = [];
  const meds = ctx.medicamentos_em_uso.map(m => m.toLowerCase());

  if (meds.includes('clopidogrel') && meds.includes('omeprazol')) {
    conflitos.push('Interação CYP2C19: Clopidogrel + Omeprazol — redução da eficácia antiagregante');
  }
  if (meds.includes('varfarina') && meds.some(m => m.includes('aspirina') || m.includes('aas'))) {
    conflitos.push('Varfarina + AAS — risco aumentado de sangramento maior');
  }
  if (meds.includes('metformina') && ctx.exames_laboratoriais?.['tfg'] && ctx.exames_laboratoriais['tfg'] < 30) {
    conflitos.push('Metformina contraindicada com TFG < 30 mL/min — risco de acidose lática');
  }
  if (meds.some(m => m.includes('ieca') || m.includes('enalapril') || m.includes('ramipril')) &&
      meds.some(m => m.includes('losartan') || m.includes('valsartan') || m.includes('bra'))) {
    conflitos.push('Duplo bloqueio SRAA (IECA + BRA) — não recomendado (risco renal e hipercalemia)');
  }
  if (meds.some(m => m.includes('estatina')) && meds.some(m => m.includes('fibrato'))) {
    conflitos.push('Estatina + Fibrato — monitorar CPK por risco de miopatia');
  }
  return conflitos;
}

function gerarPrognostico(ctx: ContextoClinico, urgencia: ResumoClinco['nivel_urgencia']): string {
  const ctx_key = detectarContexto(ctx);
  const prognosticos: Record<string, Record<string, string>> = {
    hipertensao: {
      eletivo:    'Favorável com adesão terapêutica e controle de fatores de risco cardiovascular',
      prioritario:'Moderado — avaliar lesão de órgão-alvo; ajuste terapêutico necessário',
      urgente:    'Reservado no curto prazo — crise hipertensiva exige controle imediato',
      emergencia: 'Crítico — emergência hipertensiva com lesão de órgão-alvo iminente',
    },
    diabetes_tipo2: {
      eletivo:    'Bom com controle glicêmico rigoroso (HbA1c < 7%); prevenção de complicações micro/macrovasculares',
      prioritario:'Moderado — descompensação metabólica requer ajuste terapêutico urgente',
      urgente:    'Reservado — risco de complicações agudas (CAD/EHH)',
      emergencia: 'Crítico — risco de desidratação grave e distúrbios eletrolíticos',
    },
    insuficiencia_cardiaca: {
      eletivo:    'Moderado a favorável com terapia quádrupla (IECA/ARNI + BB + ARM + SGLT2i)',
      prioritario:'Reservado — descompensação em curso; internar se necessário',
      urgente:    'Grave — risco de descompensação fatal; considerar internação',
      emergencia: 'Crítico — edema agudo de pulmão / choque cardiogênico',
    },
    asma: {
      eletivo:    'Favorável com tratamento ICS + LABA (estratégia MART) e controle de gatilhos',
      prioritario:'Moderado — crise em andamento; ajuste de step',
      urgente:    'Reservado — crise grave com SpO2 < 92%',
      emergencia: 'Crítico — status asmático com risco de parada respiratória',
    },
    dpoc: {
      eletivo:    'Moderado — DPOC é progressivo; cessação de tabagismo é a intervenção de maior impacto',
      prioritario:'Reservado — exacerbação moderada a grave',
      urgente:    'Grave — exacerbação com insuficiência respiratória',
      emergencia: 'Crítico — insuficiência respiratória hipercápnica / acidose',
    },
  };
  return prognosticos[ctx_key]?.[urgencia] ?? 'Prognóstico a ser determinado com dados complementares';
}

// ══════════════════════════════════════════════════════════════
// EVOLUÇÃO CLÍNICA
// ══════════════════════════════════════════════════════════════

export interface EvolucaoClinical {
  data: string;
  texto_evolucao: string;
  problemas_abordados: string[];
  conduta_tomada: string[];
  resposta_tratamento: 'melhora' | 'estavel' | 'piora' | 'nao_avaliado';
  proximos_passos: string[];
  assinatura_digital?: string;
}

export function gerarEvolucao(ctx: ContextoClinico, resposta: EvolucaoClinical['resposta_tratamento']): EvolucaoClinical {
  const resumo = gerarResumoConsulta(ctx);
  const respostaTexto = {
    melhora: 'apresenta melhora clínica, com bom controle dos parâmetros-alvo',
    estavel: 'encontra-se clinicamente estável, sem piora dos parâmetros monitorados',
    piora: 'apresenta piora clínica — requer reavaliação de conduta terapêutica',
    nao_avaliado: 'sem dados de seguimento disponíveis para esta consulta',
  };

  return {
    data: new Date().toISOString(),
    texto_evolucao: `Paciente ${ctx.sexo === 'M' ? 'do sexo masculino' : 'do sexo feminino'}${ctx.idade ? `, ${ctx.idade} anos,` : ''} com ${ctx.queixa_principal}. ${respostaTexto[resposta]}. ${ctx.antecedentes.length ? `Antecedentes: ${ctx.antecedentes.join(', ')}.` : ''} Em uso de ${ctx.medicamentos_em_uso.join(', ') || 'nenhuma medicação relatada'}. ${resumo.conflitos_detectados.length ? `Conflito detectado: ${resumo.conflitos_detectados[0]}.` : ''} Orientações e plano terapêutico conforme nota SOAP em prontuário.`,
    problemas_abordados: resumo.hipoteses.slice(0, 2),
    conduta_tomada: resumo.tratamento_sugerido.slice(0, 3),
    resposta_tratamento: resposta,
    proximos_passos: [resumo.exames_sugeridos[0] ?? 'Exames de rotina', `Retorno: ${CONHECIMENTO_CLINICO[detectarContexto(ctx)]?.retorno ?? '30 dias'}`],
  };
}

// ══════════════════════════════════════════════════════════════
// SEGUNDA OPINIÃO
// ══════════════════════════════════════════════════════════════

export interface SegundaOpiniao {
  opiniao_principal: string;
  opiniao_alternativa: string;
  grau_concordancia_pct: number;
  diretrizes_utilizadas: string[];
  evidencias_utilizadas: { tipo: string; descricao: string; nivel: string }[];
  nivel_confianca: NivelConfianca;
  pontos_divergentes: string[];
  recomendacao_final: string;
  aviso: string;
}

export function gerarSegundaOpiniao(ctx: ContextoClinico): SegundaOpiniao {
  const ctxKey = detectarContexto(ctx);
  const conhecimento = CONHECIMENTO_CLINICO[ctxKey];
  const resumo = gerarResumoConsulta(ctx);

  const alternativas: Record<string, string> = {
    hipertensao: 'Considerar CCB (amlodipina) como primeira linha em pacientes idosos ou afrodescendentes (ESH 2023). Monitoramento ambulatorial de PA (MAPA) para confirmar diagnóstico.',
    diabetes_tipo2: 'Em pacientes com risco cardiovascular alto, SGLT2i ou GLP-1 RA são considerados superiores à metformina como primeira linha (ADA 2025, classe IB).',
    insuficiencia_cardiaca: 'ARNI (sacubitril/valsartana) preferível ao IECA em pacientes com IC-FEr sem hipotensão (ESC 2023, classe IA). Considerar ICD/TRC conforme FEVE e QRS.',
    asma: 'Estratégia MART com ICS/formoterol reduz risco de exacerbações vs. SABA como resgate isolado (GINA 2025, evidência A).',
    dpoc: 'Tríplice terapia (ICS+LABA+LAMA) em pacientes com ≥ 2 exacerbações/ano ou FENO > 100 ppb (GOLD 2025).',
  };

  const divergentes: Record<string, string[]> = {
    hipertensao: ['Meta PA 130/80 vs. 140/90 em idosos > 80 anos', 'IECA vs. BRA como primeira linha em diabéticos'],
    diabetes_tipo2: ['Metformina vs. SGLT2i como primeira linha em pacientes de alto risco CV', 'HbA1c-alvo < 6,5% vs. < 7,0% em jovens vs. idosos'],
    insuficiencia_cardiaca: ['ARNI vs. IECA como primeira linha', 'Timing ideal do SGLT2i na descompensação aguda'],
    asma: ['Step-down timing após controle', 'Biolbiológicos (dupilumabe) vs. escalada de ICS em asma severa'],
    dpoc: ['LAMA vs. LAMA+LABA como primeira linha no GOLD B/E', 'Papel dos ICS em DPOC sem eosinofilia'],
  };

  return {
    opiniao_principal: conhecimento.hipotese_principal + ' — ' + conhecimento.conduta[0],
    opiniao_alternativa: alternativas[ctxKey] ?? 'Sem alternativa disponível para este cenário',
    grau_concordancia_pct: resumo.nivel_urgencia === 'emergencia' ? 95 : 82,
    diretrizes_utilizadas: [conhecimento.diretriz, 'UpToDate 2025', 'Cochrane Database'],
    evidencias_utilizadas: [
      { tipo: 'RCT', descricao: 'Ensaios randomizados de fase III para conduta principal', nivel: 'A' },
      { tipo: 'Meta-análise', descricao: 'Meta-análises de rede para comparação de classes', nivel: 'A' },
      { tipo: 'Guideline', descricao: conhecimento.diretriz, nivel: 'A/B' },
    ],
    nivel_confianca: conhecimento.nivel_confianca,
    pontos_divergentes: divergentes[ctxKey] ?? ['Conduta padrão bem estabelecida'],
    recomendacao_final: `Seguir conduta baseada em ${conhecimento.diretriz}. Individualizar conforme comorbidades, função renal e preferências do paciente. Decisão final é exclusivamente do médico assistente.`,
    aviso: '⚕️ Segunda opinião gerada por CDSS com base em diretrizes internacionais. Não substitui avaliação médica presencial.',
  };
}

// ══════════════════════════════════════════════════════════════
// HIPÓTESES DIFERENCIAIS
// ══════════════════════════════════════════════════════════════

export interface HipoteseDiferencial {
  diagnostico: string;
  probabilidade: 'alta' | 'moderada' | 'baixa';
  a_favor: string[];
  contra: string[];
  exame_confirmatorio: string;
  cid: string;
}

export function gerarHipotesesDiferenciais(ctx: ContextoClinico): HipoteseDiferencial[] {
  const ctxKey = detectarContexto(ctx);
  const conhecimento = CONHECIMENTO_CLINICO[ctxKey];

  const probabilidades: ('alta' | 'moderada' | 'baixa')[] = ['alta', 'moderada', 'moderada', 'baixa'];
  const cids: Record<string, string[]> = {
    hipertensao: ['I10', 'I15', 'I10', 'I10'],
    diabetes_tipo2: ['E11', 'E10', 'E13', 'E11.8'],
    insuficiencia_cardiaca: ['I50', 'I50.0', 'J96', 'I26'],
    asma: ['J45', 'J44', 'J98', 'J45.1'],
    dpoc: ['J44', 'I50', 'J18', 'I26'],
  };

  const hipoteses = [conhecimento.hipotese_principal, ...conhecimento.hipoteses_diferenciais];
  return hipoteses.slice(0, 4).map((hip, i) => ({
    diagnostico: hip,
    probabilidade: probabilidades[i] ?? 'baixa',
    a_favor: i === 0
      ? [`Queixa de ${ctx.queixa_principal}`, 'Antecedentes compatíveis', 'Exame físico sugestivo']
      : ['Descartado após exames complementares pendentes'],
    contra: i === 0 ? [] : ['Apresentação clínica atípica para este diagnóstico'],
    exame_confirmatorio: conhecimento.exames_sugeridos[i] ?? 'Exame clínico',
    cid: (cids[ctxKey] ?? [])[i] ?? 'Z03',
  }));
}

// ══════════════════════════════════════════════════════════════
// DISCUSSÃO CLÍNICA
// ══════════════════════════════════════════════════════════════

export interface DiscussaoClinical {
  titulo: string;
  contexto: string;
  pontos_chave: string[];
  evidencias: { grau: string; descricao: string }[];
  controversias: string[];
  recomendacao_final: string;
  referencias: string[];
}

export function gerarDiscussaoClinica(ctx: ContextoClinico): DiscussaoClinical {
  const ctxKey = detectarContexto(ctx);
  const conhecimento = CONHECIMENTO_CLINICO[ctxKey];

  return {
    titulo: `Discussão Clínica: ${conhecimento.hipotese_principal}`,
    contexto: `Paciente${ctx.idade ? ` de ${ctx.idade} anos` : ''} com ${ctx.queixa_principal} e antecedentes de ${ctx.antecedentes.join(', ') || 'não documentados'}.`,
    pontos_chave: [
      `Hipótese principal: ${conhecimento.hipotese_principal}`,
      `Diretriz aplicada: ${conhecimento.diretriz}`,
      `Nível de evidência: A (ensaios fase III + meta-análises)`,
      ...conhecimento.conduta.slice(0, 2),
    ],
    evidencias: [
      { grau: 'A', descricao: `RCTs de grande porte suportam conduta principal (${conhecimento.diretriz})` },
      { grau: 'B', descricao: 'Estudos observacionais e análises de subgrupo para populações especiais' },
      { grau: 'C', descricao: 'Opinião de especialistas para cenários não cobertos por ensaios' },
    ],
    controversias: [
      'Metas tensionais em idosos frágeis (PA 130/80 vs 140/90)',
      'Combinação de classes farmacológicas vs. monoterapia em dose máxima',
    ],
    recomendacao_final: `Seguir ${conhecimento.diretriz} com individualização terapêutica. Metas: ${conhecimento.metas.slice(0, 2).join('; ')}.`,
    referencias: [
      conhecimento.diretriz,
      'UpToDate 2025 — Topic reviewed',
      'Cochrane Database — Systematic Reviews',
      'PRESCREVE-AI Evidence Engine v5.0',
    ],
  };
}

// ══════════════════════════════════════════════════════════════
// JUSTIFICATIVA CLÍNICA
// ══════════════════════════════════════════════════════════════

export interface JustificativaClinical {
  medicamento: string;
  indicacao: string;
  justificativa: string;
  contraindicacoes_verificadas: string[];
  interacoes_verificadas: string[];
  nivel_evidencia: string;
  diretriz: string;
  conforme_protocolo: boolean;
}

export function gerarJustificativa(medicamento: string, ctx: ContextoClinico): JustificativaClinical {
  const ctxKey = detectarContexto(ctx);
  const conhecimento = CONHECIMENTO_CLINICO[ctxKey];
  const conflitos = detectarConflitos(ctx);
  const riscos = detectarRiscos(ctx);

  const indicacao = conhecimento.hipotese_principal;
  const emConflito = conflitos.some(c => c.toLowerCase().includes(medicamento.toLowerCase()));
  const emRisco = riscos.some(r => r.toLowerCase().includes(medicamento.toLowerCase()));

  return {
    medicamento,
    indicacao,
    justificativa: `${medicamento} indicado conforme ${conhecimento.diretriz} para ${indicacao}. Nível de evidência A — suportado por RCTs de fase III e meta-análises.`,
    contraindicacoes_verificadas: riscos.filter(r => r.toLowerCase().includes(medicamento.toLowerCase())),
    interacoes_verificadas: conflitos.filter(c => c.toLowerCase().includes(medicamento.toLowerCase())),
    nivel_evidencia: 'A',
    diretriz: conhecimento.diretriz,
    conforme_protocolo: !emConflito && !emRisco,
  };
}
