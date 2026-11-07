// ============================================================
// RM-107.1.1-A — Estados de avaliação e limitações do resultado do `dose-calculator` (campos ADITIVOS, informativos).
//
// Este módulo só DESCREVE o que o motor já faz. Ele NÃO altera valor, dose, frequência ou limite, NÃO bloqueia nada,
// NÃO cria política clínica e NÃO cria estado de aprovação ou de segurança: não existe estado "validado", "aprovado" ou "seguro".
// A decisão sobre o que fazer em cada situação (bloquear, exigir confirmação etc.) continua em D1, D2, D10 e D13 (pendentes).
// ============================================================

export type EstadoAvaliacaoDose =
  | 'calculo_realizado_regra_nao_validada'
  | 'dados_insuficientes'
  | 'dados_invalidos'
  | 'apresentacao_nao_interpretada'
  | 'regra_incompativel'
  | 'regra_inexistente'
  | 'avaliacao_especifica_necessaria'
  | 'bloqueado_por_seguranca';

export interface LimitacaoDose { codigo: string; mensagem: string }

/** Rótulos neutros (sem verde, sem "validada/segura/recomendada"). A política definitiva de linguagem depende de D13. */
export const ROTULO_ESTADO_AVALIACAO: Readonly<Record<EstadoAvaliacaoDose, string>> = Object.freeze({
  calculo_realizado_regra_nao_validada: 'Cálculo realizado com regra cadastrada — NÃO validada clinicamente',
  dados_insuficientes: 'Dados insuficientes para concluir o cálculo',
  dados_invalidos: 'Dados informados inválidos',
  apresentacao_nao_interpretada: 'Apresentação (concentração) não interpretada',
  regra_incompativel: 'Regra pediátrica cadastrada incompatível com o cálculo',
  regra_inexistente: 'Regra pediátrica não cadastrada para este medicamento',
  avaliacao_especifica_necessaria: 'Avaliação específica necessária',
  bloqueado_por_seguranca: 'Bloqueio de segurança já existente',
});

export interface EntradaEstados {
  idadeAnos: number;
  pesoKg: number;
  alturaM?: number;
  concentracao: string;
  concentracaoTipo: 'solido' | 'liquido' | 'inalatorio' | 'desconhecido';
  /** Classificação etária atual do motor (não alterada aqui). */
  usarDosePediatricaPorIdade: boolean;
  adolescente: boolean;
  temRegraPediatrica: boolean;
  doseKgPediatricaPositiva: boolean;
  regraPediatricaUsada: boolean;
  frequenciaIndeterminada: boolean;
  bloqueadoPorAlturaAusente: boolean;
  /** Quantidade de alertas 🚨 que NÃO são os dois bloqueios internos acima (ou seja, bloqueios de segurança já existentes). */
  criticosDeSeguranca: number;
}

export interface AvaliacaoDose {
  estado_avaliacao: EstadoAvaliacaoDose;
  /** Todos os estados aplicáveis (o principal é o de maior precedência; nada é ocultado). */
  estados_adicionais: EstadoAvaliacaoDose[];
  limitacoes: LimitacaoDose[];
}

const PRECEDENCIA: readonly EstadoAvaliacaoDose[] = [
  'bloqueado_por_seguranca', 'dados_invalidos', 'dados_insuficientes', 'regra_incompativel', 'regra_inexistente',
  'apresentacao_nao_interpretada', 'avaliacao_especifica_necessaria', 'calculo_realizado_regra_nao_validada',
];

export function derivarAvaliacaoDose(e: EntradaEstados): AvaliacaoDose {
  const aplicaveis = new Set<EstadoAvaliacaoDose>();
  const lim: LimitacaoDose[] = [{ codigo: 'regra_nao_validada', mensagem: 'Calculado pela regra cadastrada, sem validação clínica formal e sem fonte verificada. Calcular não é validar.' }];

  const invalidos = !Number.isFinite(e.idadeAnos) || e.idadeAnos < 0 || !Number.isFinite(e.pesoKg) || e.pesoKg <= 0 || (e.alturaM !== undefined && !(e.alturaM > 0));
  if (invalidos) {
    aplicaveis.add('dados_invalidos');
    lim.push({ codigo: 'dados_invalidos', mensagem: 'Idade, peso ou altura informados são inválidos (não numéricos, negativos ou zero); o valor calculado não é confiável.' });
  }
  if (e.frequenciaIndeterminada || e.bloqueadoPorAlturaAusente) {
    aplicaveis.add('dados_insuficientes');
    if (e.frequenciaIndeterminada) lim.push({ codigo: 'frequencia_indeterminada', mensagem: 'Frequência não determinável automaticamente; a dose total diária não foi calculada.' });
    if (e.bloqueadoPorAlturaAusente) lim.push({ codigo: 'altura_ausente', mensagem: 'Altura ausente para dose por superfície corporal; a dose não foi calculada.' });
  }
  if (e.usarDosePediatricaPorIdade && e.temRegraPediatrica && !e.doseKgPediatricaPositiva) {
    aplicaveis.add('regra_incompativel');
    lim.push({ codigo: 'regra_pediatrica_incompativel', mensagem: 'Existe regra pediátrica cadastrada, mas ela não é utilizável pelo motor (dose por kg ausente ou não positiva); o cálculo seguiu o ramo adulto do motor. Comportamento existente, em avaliação (D1).' });
  }
  if (e.usarDosePediatricaPorIdade && !e.temRegraPediatrica) {
    aplicaveis.add('regra_inexistente');
    lim.push({ codigo: 'regra_pediatrica_nao_cadastrada', mensagem: 'Não há regra pediátrica cadastrada para este medicamento; o cálculo seguiu o ramo adulto do motor. Comportamento existente, em avaliação (D1). Não indica que o uso pediátrico seja apropriado ou não.' });
  }
  if (e.adolescente && e.temRegraPediatrica && !e.regraPediatricaUsada) {
    aplicaveis.add('avaliacao_especifica_necessaria');
    lim.push({ codigo: 'regra_pediatrica_nao_utilizada_adolescente', mensagem: 'A regra pediátrica cadastrada NÃO foi utilizada neste cálculo (paciente com idade entre 12 e 17 anos) e não existe critério de transição clinicamente validado no sistema. Avaliação específica necessária (D2 pendente).' });
  }
  if (e.concentracaoTipo === 'desconhecido') {
    aplicaveis.add('apresentacao_nao_interpretada');
    lim.push({ codigo: 'apresentacao_nao_interpretada', mensagem: 'A concentração selecionada não pôde ser interpretada; volume, gotas e quantidade por apresentação NÃO foram calculados nem devem ser tomados como definitivos.' });
  }
  if (e.concentracao.trim() !== '') {
    lim.push({ codigo: 'dose_nao_ajustada_a_apresentacao', mensagem: 'A dose cadastrada não foi ajustada à apresentação selecionada: a concentração participa apenas da conversão para volume/gotas. Quais medicamentos dependem da apresentação é decisão pendente (D10).' });
  }
  if (e.criticosDeSeguranca > 0) aplicaveis.add('bloqueado_por_seguranca');
  if (aplicaveis.size === 0) aplicaveis.add('calculo_realizado_regra_nao_validada');

  const ordenados = PRECEDENCIA.filter(p => aplicaveis.has(p));
  return { estado_avaliacao: ordenados[0], estados_adicionais: ordenados.slice(1), limitacoes: lim };
}
