// ============================================================
// RM-107.2 — Avaliador do contrato (aritmética e estados sobre regras ESTRUTURADAS)
//
// NÃO é autoridade clínica, NÃO é usado por nenhuma tela e NÃO escolhe entre regras divergentes: com mais de uma
// regra aplicável o resultado é `multiplas_regras_candidatas`. Sem regra utilizável não há dose (nunca fallback adulto).
// Cálculo realizado ≠ regra validada: o estado da regra vem de `estadoDaRegra` e nunca é "validada" sem aprovação formal.
// ============================================================

import { normalizarIdade } from '../age-contract';
import type { AlertaDose, DadoAusente, DoseRequest, DoseResult, DoseRule, EstadoCalculo, FrequenciaEstruturada, Quantidade, UnidadeMassa } from './types';
import { estadoDaRegra } from './governance';
import { ehUnidadeMassa, converterMassa, unidadesComparaveis } from './units';
import { valorNaFaixa } from './rules';

export interface OpcoesAvaliacao {
  /** Política para dose acima de limite cadastrado (decisão D7 pendente): 'alertar' (padrão, sem alterar a dose) ou 'bloquear'. Nunca reduz a dose. */
  politica_limite?: 'alertar' | 'bloquear';
}

const LIMITACOES_PADRAO = [
  'O cálculo usa apenas a regra estruturada recebida; não é validação clínica.',
  'Nenhum arredondamento de dose ou de apresentação foi aplicado (critério pendente de decisão farmacêutica).',
];

const norm = (s: string | undefined) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const positivo = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

function resultadoBase(estado: EstadoCalculo, extra: Partial<DoseResult> = {}): DoseResult {
  return {
    contrato_versao: 'dose-1', estado_calculo: estado, estado_regra: null, rotulo_apresentacao: 'nao_calculado', homologacao_clinica: false,
    regras_candidatas: [], fonte_utilizada: [], limites_excedidos: [], alertas: [], bloqueios: [], dados_ausentes: [], limitacoes: [...LIMITACOES_PADRAO], passo_a_passo: [],
    ...extra,
  };
}
const inv = (codigo: string, mensagem: string): AlertaDose => ({ codigo, severidade: 'critico', mensagem, bloqueia: true });

function tomadasPorDia(f: FrequenciaEstruturada, req: DoseRequest): number | null {
  switch (f.tipo) {
    case 'intervalo_h': return positivo(f.horas) ? 24 / f.horas : null;
    case 'vezes_dia': return positivo(f.vezes) ? f.vezes : null;
    case 'dose_unica': return 1;
    default: {
      const c = req.confirmacoes?.find(x => x.campo === 'frequencia_vezes_dia');
      const n = c ? Number(c.valor) : NaN;
      return positivo(n) ? n : null; // confirmação explícita do prescritor; nunca assumida
    }
  }
}

export function avaliarDose(req: DoseRequest, regras: readonly DoseRule[], opcoes: OpcoesAvaliacao = {}): DoseResult {
  // ── 1. Entrada ────────────────────────────────────────────────
  const invalidos: AlertaDose[] = [];
  let idadeDias: number | undefined;
  if (req.idade !== undefined) {
    const n = normalizarIdade(req.idade);
    if (n.estado === 'invalida') invalidos.push(inv('idade_invalida', n.detalhe));
    else if (n.estado === 'informada') idadeDias = n.idade.dias;
  }
  const num = (campo: string, v: number | undefined, positivoObrig: boolean) => {
    if (v === undefined) return;
    if (!Number.isFinite(v) || (positivoObrig ? v <= 0 : v < 0)) invalidos.push(inv(`${campo}_invalido`, `${campo} inválido: ${String(v)}`));
  };
  num('peso_atual_kg', req.peso_atual_kg, true); num('altura_cm', req.altura_cm, true); num('peso_ao_nascer_g', req.peso_ao_nascer_g, true);
  num('idade_gestacional_semanas', req.idade_gestacional_semanas, true); num('idade_pos_natal_dias', req.idade_pos_natal_dias, false); num('idade_pos_menstrual_semanas', req.idade_pos_menstrual_semanas, true);
  const c = req.contexto.concentracao;
  if (c && (!positivo(c.massa) || !positivo(c.por) || !ehUnidadeMassa(c.unidade_massa))) invalidos.push(inv('concentracao_invalida', 'Concentração inválida (massa e volume/unidade devem ser positivos; unidade de massa mg, mcg ou g).'));
  if (!req.identidade?.entidade_id) invalidos.push(inv('entidade_ausente', 'Identidade da entidade farmacológica ausente.'));
  if (invalidos.length) return resultadoBase('entrada_invalida', { bloqueios: invalidos, alertas: invalidos });

  // ── 2. Candidatas ─────────────────────────────────────────────
  const candidatas = regras.filter(r => r.entidade_id === req.identidade.entidade_id);
  if (candidatas.length === 0) {
    return resultadoBase('regra_inexistente', { alertas: [{ codigo: 'regra_inexistente', severidade: 'alerta', mensagem: 'Nenhuma regra cadastrada para esta entidade. Nenhuma dose foi calculada (não há fallback para outra regra).', bloqueia: true }] });
  }
  const status = candidatas.map(r => ({ regra: r, excluida: undefined as string | undefined, faltas: [] as DadoAusente[] }));
  for (const s of status) {
    const r = s.regra;
    if (r.incompatibilidades.length) { s.excluida = `regra_incompativel: ${r.incompatibilidades.join(', ')}`; continue; }
    if (!r.faixa_idade_dias) { s.excluida = 'escopo_etario_nao_declarado'; continue; }
    if (idadeDias === undefined) s.faltas.push({ campo: 'idade', necessario_para: 'verificar o escopo etário da regra' });
    else if (!valorNaFaixa(idadeDias, r.faixa_idade_dias)) { s.excluida = 'idade_fora_do_escopo'; continue; }
    if (r.faixa_peso_kg) {
      if (req.peso_atual_kg === undefined) s.faltas.push({ campo: 'peso_atual_kg', necessario_para: 'verificar a faixa de peso da regra' });
      else if (!valorNaFaixa(req.peso_atual_kg, r.faixa_peso_kg)) { s.excluida = 'peso_fora_do_escopo'; continue; }
    }
    if (req.contexto.via && r.via && norm(req.contexto.via) !== norm(r.via)) { s.excluida = 'via_diferente'; continue; }
    if (req.contexto.indicacao && r.indicacao && norm(req.contexto.indicacao) !== norm(r.indicacao)) { s.excluida = 'indicacao_diferente'; continue; }
    if (r.apresentacoes_compativeis) {
      if (!req.identidade.apresentacao_id) s.faltas.push({ campo: 'apresentacao_id', necessario_para: 'a regra depende da apresentação' });
      else if (!r.apresentacoes_compativeis.includes(req.identidade.apresentacao_id)) { s.excluida = 'apresentacao_incompativel'; continue; }
    }
    for (const d of r.dados_obrigatorios ?? []) {
      const tem = d === 'idade' ? idadeDias !== undefined : d === 'indicacao' ? !!req.contexto.indicacao : d === 'apresentacao_id' ? !!req.identidade.apresentacao_id
        : d === 'funcao_renal' ? !!req.funcao_renal : d === 'funcao_hepatica' ? !!req.funcao_hepatica : req[d] !== undefined;
      if (!tem && !s.faltas.some(f => f.campo === d)) s.faltas.push({ campo: d, necessario_para: 'exigido pela regra' });
    }
  }
  const registro = status.map(s => ({ regra_id: s.regra.regra_id, origem: s.regra.origem, excluida: !!s.excluida, motivo: s.excluida }));
  const vivas = status.filter(s => !s.excluida);

  if (vivas.length === 0) {
    const soEscopo = status.every(s => s.excluida?.startsWith('regra_incompativel') || s.excluida === 'escopo_etario_nao_declarado');
    const estado: EstadoCalculo = soEscopo ? 'regra_incompativel' : 'regra_inexistente';
    return resultadoBase(estado, { regras_candidatas: registro, alertas: [{ codigo: estado, severidade: 'alerta', mensagem: soEscopo ? 'As regras cadastradas são incompletas ou sem escopo etário declarado para este paciente. Nenhuma dose foi calculada.' : 'Nenhuma regra cadastrada se aplica a este paciente/contexto. Nenhuma dose foi calculada.', bloqueia: true }] });
  }
  if (vivas.length > 1) {
    const faltas = vivas.flatMap(v => v.faltas).filter((f, i, a) => a.findIndex(x => x.campo === f.campo) === i);
    return resultadoBase('multiplas_regras_candidatas', {
      regras_candidatas: registro, dados_ausentes: faltas,
      alertas: [{ codigo: 'multiplas_regras', severidade: 'alerta', mensagem: `${vivas.length} regras aplicáveis; o sistema não escolhe entre elas. Nenhuma dose foi calculada.`, bloqueia: true }],
    });
  }

  // ── 3. Regra única ────────────────────────────────────────────
  const { regra, faltas } = vivas[0];
  const estadoRegra = estadoDaRegra(regra.governanca);
  const comum = { regras_candidatas: registro, estado_regra: estadoRegra, regra_aplicada: { regra_id: regra.regra_id, origem: regra.origem }, fonte_utilizada: regra.governanca.fontes };
  const t = regra.posologia;

  // dados necessários ao cálculo
  if (t.tipo_calculo === 'por_kg' && req.peso_atual_kg === undefined) faltas.push({ campo: 'peso_atual_kg', necessario_para: 'dose por peso' });
  if (t.tipo_calculo === 'por_m2') {
    if (req.peso_atual_kg === undefined) faltas.push({ campo: 'peso_atual_kg', necessario_para: 'superfície corporal' });
    if (req.altura_cm === undefined) faltas.push({ campo: 'altura_cm', necessario_para: 'superfície corporal' });
    if (!t.formula_bsa) faltas.push({ campo: 'formula_bsa', necessario_para: 'a regra não declara a fórmula de superfície corporal (decisão pendente)' });
  }
  if (t.tipo_calculo === 'por_faixa') {
    const eixos = new Set((t.faixas_dose ?? []).map(f => f.eixo));
    if (eixos.has('kg') && req.peso_atual_kg === undefined) faltas.push({ campo: 'peso_atual_kg', necessario_para: 'faixa de dose por peso' });
    if ((eixos.has('meses') || eixos.has('anos')) && idadeDias === undefined) faltas.push({ campo: 'idade', necessario_para: 'faixa de dose por idade' });
  }
  const tomadas = tomadasPorDia(t.frequencia, req);
  if (tomadas === null) faltas.push({ campo: 'frequencia', necessario_para: 'frequência não estruturada/variável: exige confirmação explícita do prescritor' });
  if (t.substancia_referencia && !c?.substancia) faltas.push({ campo: 'concentracao.substancia', necessario_para: `a dose é expressa em ${t.substancia_referencia}` });
  if (t.tipo_calculo === 'nao_suportado' || t.base_temporal === 'indeterminada' || (t.tipo_calculo !== 'por_faixa' && !positivo(t.valor))) {
    return resultadoBase('regra_incompativel', { ...comum, alertas: [{ codigo: 'regra_nao_calculavel', severidade: 'alerta', mensagem: 'A regra não possui valor numérico, tipo de cálculo ou base temporal interpretáveis. Nenhuma dose foi calculada.', bloqueia: true }] });
  }
  if (faltas.length) return resultadoBase('dados_insuficientes', { ...comum, dados_ausentes: faltas, alertas: [{ codigo: 'dados_insuficientes', severidade: 'alerta', mensagem: 'Dados necessários ausentes; nenhuma dose foi calculada.', bloqueia: true }] });
  if (t.substancia_referencia && c?.substancia && norm(c.substancia) !== norm(t.substancia_referencia)) {
    return resultadoBase('regra_incompativel', { ...comum, alertas: [{ codigo: 'substancia_diferente', severidade: 'critico', mensagem: `Concentração informada em "${c.substancia}", dose da regra em "${t.substancia_referencia}". Nenhuma conversão foi assumida.`, bloqueia: true }] });
  }

  // restrições bloqueantes (ex.: idade mínima declarada na regra)
  const bloqueios: AlertaDose[] = [];
  for (const rs of regra.restricoes) {
    if (rs.bloqueia && rs.idade_dias_exclusivo !== undefined && idadeDias !== undefined && idadeDias < rs.idade_dias_exclusivo) bloqueios.push(inv('restricao_etaria', rs.mensagem));
  }
  if (bloqueios.length) return resultadoBase('calculo_bloqueado', { ...comum, bloqueios, alertas: bloqueios });

  // ── 4. Aritmética ─────────────────────────────────────────────
  const passos: string[] = [];
  let bruto: number; // na unidade `t.unidade_massa`
  if (t.tipo_calculo === 'por_kg') { bruto = t.valor! * req.peso_atual_kg!; passos.push(`${t.valor} × ${req.peso_atual_kg} kg = ${bruto}`); }
  else if (t.tipo_calculo === 'por_m2') {
    const p = req.peso_atual_kg!, h = req.altura_cm!;
    const bsa = t.formula_bsa === 'mosteller' ? Math.sqrt((p * h) / 3600) : 0.007184 * Math.pow(h, 0.725) * Math.pow(p, 0.425);
    bruto = t.valor! * bsa; passos.push(`BSA (${t.formula_bsa}) = ${bsa}; ${t.valor} × ${bsa} = ${bruto}`);
  } else if (t.tipo_calculo === 'por_faixa') {
    const f = (t.faixas_dose ?? []).find(x => { const v = x.eixo === 'kg' ? req.peso_atual_kg! : x.eixo === 'meses' ? (idadeDias! * 12) / 365 : idadeDias! / 365; return v > x.min_exclusivo && (x.max_inclusivo === undefined || v <= x.max_inclusivo); });
    if (!f) return resultadoBase('regra_incompativel', { ...comum, alertas: [{ codigo: 'faixa_de_dose_nao_encontrada', severidade: 'alerta', mensagem: 'Nenhuma faixa de dose da regra cobre este paciente. Nenhuma dose foi calculada.', bloqueia: true }] });
    bruto = f.dose_mg; passos.push(`faixa (${f.eixo}): ${f.dose_mg}`);
  } else { bruto = t.valor!; passos.push(`dose fixa: ${bruto}`); }

  const unid = t.unidade_massa ?? 'mg';
  const porAdm = t.base_temporal === 'por_dia' ? bruto / tomadas! : bruto;
  const dia = t.base_temporal === 'por_dia' ? bruto : bruto * tomadas!;
  passos.push(`base ${t.base_temporal}: por administração = ${porAdm}; por dia = ${dia} (${tomadas} tomada(s)/dia)`);

  // limites (sem reduzir a dose)
  const alertas: AlertaDose[] = [];
  const excedidos: DoseResult['limites_excedidos'] = [];
  const checa = (nome: string, lim: Quantidade | undefined, valor: number) => {
    if (!lim) return;
    if (!unidadesComparaveis(lim.unidade, unid)) { alertas.push({ codigo: 'limite_unidade_incompativel', severidade: 'atencao', mensagem: `Limite "${nome}" em ${lim.unidade} não comparável à dose em ${unid}; não verificado.`, bloqueia: false }); return; }
    const v = ehUnidadeMassa(lim.unidade) && ehUnidadeMassa(unid) ? converterMassa(valor, unid as UnidadeMassa, lim.unidade) : valor;
    if (v > lim.valor) excedidos.push({ limite: nome, valor_limite: lim, valor_calculado: { valor: v, unidade: lim.unidade } });
  };
  checa('max_por_tomada', regra.limites.max_por_tomada, porAdm);
  checa('max_por_dia', regra.limites.max_por_dia, dia);
  checa('max_absoluto', regra.limites.max_absoluto, dia);
  if (regra.limites.max_por_kg_dia) {
    if (req.peso_atual_kg === undefined) alertas.push({ codigo: 'limite_nao_verificavel', severidade: 'atencao', mensagem: 'Limite por kg não verificado: peso ausente.', bloqueia: false });
    else checa('max_por_kg_dia', regra.limites.max_por_kg_dia, dia / req.peso_atual_kg);
  }
  if (regra.limites.min_por_tomada && unidadesComparaveis(regra.limites.min_por_tomada.unidade, unid)) {
    const v = ehUnidadeMassa(unid) && ehUnidadeMassa(regra.limites.min_por_tomada.unidade) ? converterMassa(porAdm, unid as UnidadeMassa, regra.limites.min_por_tomada.unidade as UnidadeMassa) : porAdm;
    if (v < regra.limites.min_por_tomada.valor) alertas.push({ codigo: 'abaixo_do_minimo_cadastrado', severidade: 'alerta', mensagem: 'Dose abaixo do mínimo por tomada cadastrado (não ajustada).', bloqueia: false });
  }
  for (const e of excedidos) alertas.push({ codigo: 'excede_limite_cadastrado', severidade: 'critico', mensagem: `Dose calculada excede ${e.limite} cadastrado (${e.valor_limite.valor} ${e.valor_limite.unidade}). A dose NÃO foi reduzida.`, bloqueia: opcoes.politica_limite === 'bloquear' });
  const bloqueiaLimite = opcoes.politica_limite === 'bloquear' && excedidos.length > 0;

  // apresentação/concentração (sem arredondamento)
  let qtd: DoseResult['quantidade_por_administracao'];
  if (c && ehUnidadeMassa(unid)) {
    const emMassaConc = converterMassa(porAdm, unid as UnidadeMassa, c.unidade_massa);
    qtd = { valor: (emMassaConc / c.massa) * c.por, unidade: c.unidade_por, arredondamento_aplicado: null };
    passos.push(`apresentação: ${emMassaConc} ${c.unidade_massa} ÷ ${c.massa} ${c.unidade_massa}/${c.por} ${c.unidade_por}`);
  } else if (c) alertas.push({ codigo: 'apresentacao_nao_convertida', severidade: 'atencao', mensagem: 'Dose em unidade não mássica: conversão para a apresentação não realizada.', bloqueia: false });

  const limitacoes = [...LIMITACOES_PADRAO, ...regra.governanca.limitacoes];
  if (regra.ajustes.renal || regra.ajustes.hepatico) limitacoes.push('Ajuste renal/hepático cadastrado apenas como informação; NÃO foi aplicado ao cálculo.');
  if (estadoRegra !== 'regra_clinicamente_validada') alertas.push({ codigo: 'regra_nao_validada', severidade: 'info', mensagem: 'Calculado pela regra cadastrada, ainda NÃO validada clinicamente.', bloqueia: false });

  return resultadoBase(bloqueiaLimite ? 'calculo_bloqueado' : 'calculo_realizado', {
    ...comum,
    rotulo_apresentacao: bloqueiaLimite ? 'nao_calculado' : estadoRegra === 'regra_clinicamente_validada' ? 'calculo_com_regra_validada' : 'calculo_com_regra_nao_validada',
    dose_por_administracao: { valor: porAdm, unidade: unid }, dose_diaria: { valor: dia, unidade: unid }, base_temporal: t.base_temporal, frequencia: t.frequencia,
    quantidade_por_administracao: qtd, limites_excedidos: excedidos, alertas, bloqueios: bloqueiaLimite ? alertas.filter(a => a.bloqueia) : [], limitacoes, passo_a_passo: passos,
  });
}
