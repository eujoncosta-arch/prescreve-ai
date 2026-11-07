// ============================================================
// RM-107.2 — Adaptadores de LEITURA dos três motores para o contrato `DoseRule`.
//
// Regras desta camada:
//  - NÃO modifica nenhum valor original (dose, unidade, frequência, máximo); o texto original é sempre preservado.
//  - NÃO escolhe entre divergências e NÃO funde regras: cada regra de cada motor vira uma `DoseRule` separada com `origem`.
//  - NÃO descarta regra: o que não puder ser interpretado vira `incompatibilidades`/`pendencias`.
//  - Nenhuma regra importada é validada: sem fonte ⇒ `sem_fonte`; referência textual do motor ⇒ `fonte_candidata`.
//  - Não importa nada que altere os motores (apenas lê os dados exportados).
// ============================================================

import { MEDICAMENTOS_DOSAGEM } from '../dosing-engine';
import { PEDIATRIC_DOSES } from '../pediatric-engine';
import { drugRepository } from '../pharma-core';
import { parseFrequencia } from '../dose-calculator';
import type { DoseRule, Faixa, FonteDose, FrequenciaEstruturada, Governanca, MotorOrigem, Restricao, UnidadeDoseBase } from './types';
import { ehUnidadeMassa } from './units';

/** Vínculos de identificadores entre motores e catálogo, estabelecidos pela auditoria RM-107.1 (NÃO é decisão clínica). */
export const ALIAS_ENTIDADE_AUDITORIA: Readonly<Record<string, string>> = Object.freeze({
  'amoxicilina-clavulanato': 'amoxicilina_clavulanato',
  'sulfametoxazol-trimetoprim': 'smz_tmp',
  'smz-tmp': 'smz_tmp',
});

const DIAS_POR_ANO = 365;
const DIAS_POR_MES = DIAS_POR_ANO / 12;

function vincular(idMotor: string, idsCatalogo: ReadonlySet<string>): Pick<DoseRule, 'entidade_id' | 'vinculo_entidade'> {
  if (idsCatalogo.has(idMotor)) return { entidade_id: idMotor, vinculo_entidade: 'id_igual' };
  const a = ALIAS_ENTIDADE_AUDITORIA[idMotor];
  if (a && idsCatalogo.has(a)) return { entidade_id: a, vinculo_entidade: 'alias_de_auditoria' };
  return { entidade_id: null, vinculo_entidade: 'nao_resolvido' };
}

function governancaDe(refs: Array<{ texto: string; prefixo?: string }>, limitacoes: string[] = []): Governanca {
  const fontes: FonteDose[] = refs.filter(r => r.texto && r.texto.trim()).map(r => ({ estado_de_revisao: 'candidata', referencia_original: (r.prefixo ? r.prefixo + ': ' : '') + r.texto }));
  return {
    status_declarado: fontes.length ? 'fonte_candidata' : 'sem_fonte', fontes,
    limitacoes: [...limitacoes, 'Referência do motor de origem não conferida: sem documento, versão, seção ou trecho verificados.'],
  };
}

/**
 * Projeção ESTRUTURAL mínima de `QuickDrug` (catálogo legado). Os dados são INJETADOS pelo chamador: este módulo não importa a base
 * legada (regra RM-06). Um `QuickDrug[]` real é atribuível a esta interface.
 */
export interface QuickDrugLike {
  id: string; molecula: string; indicacao_contexto?: string; uso_pediatrico?: 'nao_aplicavel';
  dose_adulto: { habitual: string; max: string; unidade: string; via: string; frequencias: string[]; instrucoes?: string };
  dose_pediatrica?: { calculo: string; dose_por_kg: number; unidade: string; frequencia_divisoes: number; max_dose_dia: number; max_dose_dia_unidade: string; faixa_etaria: string; observacao?: string };
  ajuste_renal?: { normal: string; tfg_60_30: string; tfg_30_15: string; tfg_lt_15: string };
  ajuste_hepatico?: { child_a: string; child_b: string; child_c: string };
  contraindicacoes_rapidas: string[];
  marcas: Array<{ concentracoes: string[]; formas: string[] }>;
}

/** IDs canônicos do catálogo (pharma-core). */
function idsDoCatalogo(): ReadonlySet<string> { return new Set(drugRepository.getAll().map(e => e.id)); }

// ── Motor A — dosing-engine ───────────────────────────────────────────────────
const BUCKETS_A: Record<string, [number, number | undefined]> = {
  neonato: [0, 28], lactente: [28, 365], pediatrico: [365, 4380], adolescente: [4380, 6570], adulto: [6570, 23725], geriatrico: [23725, undefined],
};

function faixaDePopulacoesA(pops: string[]): { faixa?: Faixa; contigua: boolean } {
  const bs = pops.map(p => BUCKETS_A[p]).filter(Boolean).sort((x, y) => x[0] - y[0]);
  if (!bs.length) return { contigua: true };
  let contigua = true;
  for (let i = 1; i < bs.length; i++) if (bs[i - 1][1] !== bs[i][0]) contigua = false;
  const max = bs[bs.length - 1][1];
  return { faixa: { min: bs[0][0], min_inclusivo: true, ...(max !== undefined ? { max, max_inclusivo: false } : {}) }, contigua };
}

function posologiaA(unidade: string): { tipo: DoseRule['posologia']['tipo_calculo']; massa?: UnidadeDoseBase; base: DoseRule['posologia']['base_temporal'] } {
  switch (unidade) {
    case 'mg/kg/dia': return { tipo: 'por_kg', massa: 'mg', base: 'por_dia' };
    case 'mg/kg': return { tipo: 'por_kg', massa: 'mg', base: 'por_tomada' };
    case 'mcg/kg': return { tipo: 'por_kg', massa: 'mcg', base: 'por_tomada' };
    case 'g/kg': return { tipo: 'por_kg', massa: 'g', base: 'por_tomada' };
    case 'UI/kg': return { tipo: 'por_kg', massa: 'UI', base: 'por_tomada' };
    case 'mg/m²': return { tipo: 'por_m2', massa: 'mg', base: 'por_tomada' };
    case 'mg': case 'mcg': case 'g': case 'UI': return { tipo: 'fixa', massa: unidade, base: 'por_tomada' };
    case 'mL': return { tipo: 'fixa', massa: 'mL', base: 'por_tomada' };
    default: return { tipo: 'nao_suportado', base: 'indeterminada' };
  }
}

export function adaptarMotorA(idsCatalogo: ReadonlySet<string> = idsDoCatalogo()): DoseRule[] {
  const out: DoseRule[] = [];
  for (const m of MEDICAMENTOS_DOSAGEM) {
    m.regras.forEach((r, idx) => {
      const p = posologiaA(r.unidade);
      const { faixa, contigua } = faixaDePopulacoesA(r.populacoes);
      const pendencias = ['populacao_por_balde_do_motor'];
      const incompat: string[] = [];
      if (!contigua) pendencias.push('populacoes_nao_contiguas');
      if (!r.indicacao) pendencias.push('indicacao_nao_declarada');
      if (/[+/]/.test(m.nome_generico)) pendencias.push('associacao_sem_substancia_de_referencia_declarada');
      if (r.ajuste_renal || r.ajuste_hepatico) pendencias.push('ajuste_apenas_flag_sem_parametros');
      if (p.tipo === 'nao_suportado') incompat.push(`unidade_nao_reconhecida:${r.unidade}`);
      const restr: Restricao[] = [];
      if (r.contraindicado_em?.length) restr.push({ tipo: 'contraindicacao', mensagem: `Contraindicado nas populações do motor: ${r.contraindicado_em.join(', ')}`, bloqueia: true, populacoes: [...r.contraindicado_em] });
      if (r.contraindicado_ate_dias !== undefined) restr.push({ tipo: 'idade_minima', mensagem: `Contraindicado em idade < ${r.contraindicado_ate_dias} dias (cadastro do motor A)`, bloqueia: true, idade_dias_exclusivo: r.contraindicado_ate_dias });
      const g = governancaDe([{ texto: m.diretriz ?? '', prefixo: 'diretriz' }, { texto: m.evidencia ?? '', prefixo: 'evidência' }], [r.observacao ? `Observação original: ${r.observacao}` : ''].filter(Boolean));
      if (g.fontes.length === 0) pendencias.push('sem_fonte');
      out.push({
        regra_id: `A:${m.id}:${idx}`, origem: { motor: 'A:dosing-engine', referencia: `${m.id}#${idx}` }, ...vincular(m.id, idsCatalogo), molecula_original: m.nome_generico,
        indicacao: r.indicacao, populacao_rotulo: r.populacoes.join(' + '), faixa_idade_dias: faixa,
        posologia: { tipo_calculo: p.tipo, valor: r.dose, valor_original: String(r.dose), unidade_massa: p.massa, unidade_original: r.unidade, base_temporal: p.base, frequencia: { tipo: 'intervalo_h', horas: r.frequencia_horas } },
        limites: {
          ...(r.dose_maxima_por_dose_mg !== undefined ? { max_por_tomada: { valor: r.dose_maxima_por_dose_mg, unidade: 'mg' } } : {}),
          ...(r.dose_maxima_por_dia_mg !== undefined ? { max_por_dia: { valor: r.dose_maxima_por_dia_mg, unidade: 'mg' } } : {}),
          ...(r.dose_minima_por_dose_mg !== undefined ? { min_por_tomada: { valor: r.dose_minima_por_dose_mg, unidade: 'mg' } } : {}),
        },
        forma_farmaceutica: [...new Set(m.formulacoes.map(f => f.tipo))], via: r.via, apresentacoes_compativeis: r.formulacao_ids ? [...r.formulacao_ids] : undefined,
        ajustes: { ...(r.ajuste_renal ? { renal: { estado: 'flag_sem_parametros' as const } } : {}), ...(r.ajuste_hepatico ? { hepatico: { estado: 'flag_sem_parametros' as const } } : {}) },
        restricoes: restr, governanca: g, pendencias, incompatibilidades: incompat,
      });
    });
  }
  return out;
}

// ── Motor B — pediatric-engine ────────────────────────────────────────────────
export function adaptarMotorB(idsCatalogo: ReadonlySet<string> = idsDoCatalogo()): DoseRule[] {
  const out: DoseRule[] = [];
  for (const p of PEDIATRIC_DOSES) {
    p.indicacoes.forEach((i, idx) => {
      const pendencias = ['frequencia_nao_estruturada', 'via_nao_estruturada', 'apresentacao_nao_estruturada', 'B_usa_idade_corrigida_quando_IG_e_pos_natal_informadas'];
      const incompat: string[] = [];
      let tipo: DoseRule['posologia']['tipo_calculo'] = 'nao_suportado'; let valor: number | undefined; let massa: UnidadeDoseBase | undefined; let base: DoseRule['posologia']['base_temporal'] = 'indeterminada'; let unidadeOriginal = '';
      let faixasDose: DoseRule['posologia']['faixas_dose'];
      if (i.doseFixa) { tipo = 'por_faixa'; base = 'por_tomada'; massa = 'mg'; unidadeOriginal = 'doseFixa (faixas)'; faixasDose = i.doseFixa.map(f => ({ eixo: f.unidade, min_exclusivo: f.minimo, max_inclusivo: f.maximo, dose_mg: f.doseMg })); }
      else if (i.doseMgKg !== undefined) { tipo = 'por_kg'; valor = i.doseMgKg; massa = 'mg'; base = 'por_tomada'; unidadeOriginal = 'mg/kg/dose'; }
      else if (i.doseMgKgDia !== undefined) { tipo = 'por_kg'; valor = i.doseMgKgDia; massa = 'mg'; base = 'por_dia'; unidadeOriginal = 'mg/kg/dia'; }
      else if (i.doseMcgKg !== undefined) { tipo = 'por_kg'; valor = i.doseMcgKg; massa = 'mcg'; base = 'por_tomada'; unidadeOriginal = 'mcg/kg/dose'; }
      else if (i.doseMgM2 !== undefined) { tipo = 'por_m2'; valor = i.doseMgM2; massa = 'mg'; base = 'por_tomada'; unidadeOriginal = 'mg/m²/dose'; pendencias.push('motor_B_nao_calcula_doseMgM2'); }
      else incompat.push('sem_valor_de_dose');
      const min = i.idadeMinMeses, max = i.idadeMaxMeses;
      const faixa: Faixa | undefined = min !== undefined || max !== undefined
        ? { ...(min !== undefined ? { min: min * DIAS_POR_MES, min_inclusivo: true } : {}), ...(max !== undefined ? { max: max * DIAS_POR_MES, max_inclusivo: true } : {}) }
        : { };                                              // B: sem mínimo nem máximo declarados = aberto (declaração explícita do dado)
      if (min === undefined && max === undefined) pendencias.push('sem_idade_minima_nem_maxima');
      if (max === undefined) pendencias.push('sem_limite_superior_de_idade');
      const restr: Restricao[] = [
        ...(p.contraindPediatrica ?? []).map(t => ({ tipo: 'texto_informativo' as const, mensagem: t, bloqueia: false })),
        ...(i.alertas ?? []).map(t => ({ tipo: 'texto_informativo' as const, mensagem: t, bloqueia: false })),
      ];
      const lim: string[] = [];
      if (i.maxDoseMgKgDiaPendenteValidacao) { lim.push(`Pendência declarada no dado: ${i.maxDoseMgKgDiaPendenteValidacao}`); pendencias.push('limite_pendente_validacao_declarado_no_dado'); }
      if (i.instrucoes) lim.push(`Instruções originais: ${i.instrucoes}`);
      const g = governancaDe(p.fontes.map(t => ({ texto: t })), lim);
      out.push({
        regra_id: `B:${p.drugId}:${idx}`, origem: { motor: 'B:pediatric-engine', referencia: `${p.drugId}#${idx}` }, ...vincular(p.drugId, idsCatalogo), molecula_original: p.drugName,
        indicacao: i.nome, populacao_rotulo: 'pediátrico (idade em meses; sem baldes)', faixa_idade_dias: faixa,
        posologia: {
          tipo_calculo: tipo, valor, valor_original: valor !== undefined ? String(valor) : undefined, unidade_massa: massa, unidade_original: unidadeOriginal, base_temporal: base, faixas_dose: faixasDose,
          frequencia: { tipo: 'nao_estruturada', texto: i.frequencia, ...(i.divisoes !== undefined ? { divisoes: i.divisoes } : {}) },
        },
        limites: { ...(i.maxDoseMg !== undefined ? { max_por_tomada: { valor: i.maxDoseMg, unidade: 'mg' } } : {}), ...(i.maxDoseMgKgDia !== undefined ? { max_por_kg_dia: { valor: i.maxDoseMgKgDia, unidade: 'mg' } } : {}) },
        apresentacoes_texto: p.formulacoes.map(f => `${f.forma} ${f.concentracao}`), ajustes: {}, restricoes: restr, governanca: g, pendencias, incompatibilidades: incompat,
      });
    });
  }
  return out;
}

// ── Motor C — catálogo QuickDrug (entrada do dose-calculator) ──────────────────
const NUM_PURO = /^\s*\d+(?:[.,]\d+)?\s*$/;
const UNIDADES_C_ADULTO: Record<string, { tipo: DoseRule['posologia']['tipo_calculo']; massa?: UnidadeDoseBase; base: DoseRule['posologia']['base_temporal']; motorPorTomada?: boolean }> = {
  mg: { tipo: 'fixa', massa: 'mg', base: 'por_tomada' }, mcg: { tipo: 'fixa', massa: 'mcg', base: 'por_tomada' }, g: { tipo: 'fixa', massa: 'g', base: 'por_tomada' }, UI: { tipo: 'fixa', massa: 'UI', base: 'por_tomada' },
  mL: { tipo: 'fixa', massa: 'mL', base: 'por_tomada' },
  'mg/dia': { tipo: 'fixa', massa: 'mg', base: 'por_dia', motorPorTomada: true },
  'mg/kg/dia': { tipo: 'por_kg', massa: 'mg', base: 'por_dia', motorPorTomada: true },
  'mg/kg': { tipo: 'por_kg', massa: 'mg', base: 'indeterminada', motorPorTomada: true }, 'mcg/kg': { tipo: 'por_kg', massa: 'mcg', base: 'indeterminada', motorPorTomada: true },
  'UI/kg': { tipo: 'por_kg', massa: 'UI', base: 'indeterminada', motorPorTomada: true }, 'mg/m²': { tipo: 'por_m2', massa: 'mg', base: 'indeterminada', motorPorTomada: true },
};

const CALCULO_PED: Record<string, { tipo: DoseRule['posologia']['tipo_calculo']; base: DoseRule['posologia']['base_temporal']; massa?: UnidadeDoseBase }> = {
  'mg/kg/dia': { tipo: 'por_kg', base: 'por_dia' }, 'mg/kg': { tipo: 'por_kg', base: 'por_dia' }, '': { tipo: 'por_kg', base: 'por_dia' },
  'mg/kg/dose': { tipo: 'por_kg', base: 'por_tomada' },
  'mcg/kg': { tipo: 'por_kg', base: 'por_dia', massa: 'mcg' }, 'mcg/kg/dia': { tipo: 'por_kg', base: 'por_dia', massa: 'mcg' },
  'UI/kg': { tipo: 'por_kg', base: 'por_dia', massa: 'UI' }, 'UI/kg/dia': { tipo: 'por_kg', base: 'por_dia', massa: 'UI' },
  'mg/m²': { tipo: 'por_m2', base: 'por_dia' }, 'mcg/m²': { tipo: 'por_m2', base: 'por_dia', massa: 'mcg' },
  dose_fixa: { tipo: 'fixa', base: 'por_dia' },
};

function frequenciaC(texto: string): FrequenciaEstruturada {
  const f = parseFrequencia(texto);
  if (f.calculavel && f.tomadasDia !== null) return f.tipo === 'intervalo_horas' && f.intervaloHoras ? { tipo: 'intervalo_h', horas: f.intervaloHoras } : { tipo: 'vezes_dia', vezes: f.tomadasDia };
  if (f.tipo === 'unica') return { tipo: 'dose_unica' };
  if (f.tipo === 'variavel') return { tipo: 'variavel', texto, ...(f.tomadasFaixa ? { faixa_vezes_dia: f.tomadasFaixa } : {}) };
  return { tipo: 'nao_estruturada', texto };
}

function massaDoToken(s: string): UnidadeDoseBase | undefined {
  const t = s.split('/')[0].trim();
  return ehUnidadeMassa(t) ? t : t === 'UI' ? 'UI' : undefined;
}

function textoAjuste(a: { normal?: string; tfg_60_30?: string; tfg_30_15?: string; tfg_lt_15?: string; child_a?: string; child_b?: string; child_c?: string }): string {
  return Object.entries(a).filter(([, v]) => typeof v === 'string').map(([k, v]) => `${k}: ${v}`).join(' | ');
}

function regrasDoCatalogo(d: QuickDrugLike): DoseRule[] {
  const a = d.dose_adulto;
  const conc = [...new Set(d.marcas.flatMap(b => b.concentracoes))];
  const formas = [...new Set(d.marcas.flatMap(b => b.formas))];
  const ajustes: DoseRule['ajustes'] = {
    ...(d.ajuste_renal ? { renal: { estado: 'texto_informativo' as const, texto: textoAjuste(d.ajuste_renal) } } : {}),
    ...(d.ajuste_hepatico ? { hepatico: { estado: 'texto_informativo' as const, texto: textoAjuste(d.ajuste_hepatico) } } : {}),
  };
  const restr: Restricao[] = d.contraindicacoes_rapidas.map(t => ({ tipo: 'contraindicacao' as const, mensagem: t, bloqueia: false }));
  const base = { entidade_id: d.id, vinculo_entidade: 'id_igual' as const, molecula_original: d.molecula, apresentacoes_texto: conc, forma_farmaceutica: formas, via: a.via, ajustes, restricoes: restr };
  const regras: DoseRule[] = [];

  // — adulto —
  {
    const u = UNIDADES_C_ADULTO[a.unidade];
    const pend = ['escopo_etario_nao_declarado', 'sem_fonte', 'limite_em_texto_sem_periodo_garantido'];
    const inc: string[] = [];
    const numerico = NUM_PURO.test(a.habitual);
    if (!numerico) inc.push('valor_nao_numerico_puro');
    if (!u) inc.push(`unidade_nao_suportada:${a.unidade}`);
    else if (u.base === 'indeterminada') inc.push('base_temporal_nao_declarada_na_unidade');
    if (u?.motorPorTomada) pend.push('C_motor_trata_unidade_com_base_ou_peso_como_por_tomada');
    if (d.uso_pediatrico === 'nao_aplicavel') pend.push('uso_pediatrico_nao_aplicavel_no_cadastro');
    const r: DoseRule = {
      ...base, regra_id: `C:${d.id}:adulto`, origem: { motor: 'C:dose-calculator(catalogo)', referencia: `${d.id}#dose_adulto` },
      indicacao: d.indicacao_contexto, populacao_rotulo: 'ramo adulto do motor C (também usado como fallback para pediátrico sem regra pediátrica utilizável)', faixa_idade_dias: undefined,
      posologia: {
        tipo_calculo: u?.tipo ?? 'nao_suportado', valor: numerico ? Number(a.habitual.replace(',', '.')) : undefined, valor_original: a.habitual, unidade_massa: u?.massa, unidade_original: a.unidade,
        base_temporal: u?.base ?? 'indeterminada', frequencia: frequenciaC(a.frequencias[0] ?? ''),
      },
      limites: { limite_texto_original: a.max },
      governanca: governancaDe([], [`Frequências cadastradas (originais): ${a.frequencias.join(' / ') || '(nenhuma)'}`, ...(a.instrucoes ? [`Instruções originais: ${a.instrucoes}`] : [])]),
      pendencias: pend, incompatibilidades: inc,
    };
    if (d.uso_pediatrico === 'nao_aplicavel') r.restricoes = [...r.restricoes, { tipo: 'texto_informativo', mensagem: 'O cadastro indica uso pediátrico não estabelecido nesta base (marcador `uso_pediatrico = nao_aplicavel`); não é critério de decisão nesta etapa.', bloqueia: false }];
    regras.push(r);
  }
  // — pediátrico —
  if (d.dose_pediatrica) {
    const p = d.dose_pediatrica;
    const m = CALCULO_PED[p.calculo];
    const pend = ['faixa_etaria_em_texto_livre', 'escopo_etario_nao_declarado', 'sem_fonte'];
    const inc: string[] = [];
    if (!m) { inc.push(`calculo_nao_reconhecido:${p.calculo}`); if (p.dose_por_kg > 0) pend.push('C_motor_trata_como_mg_kg_dia_no_ramo_padrao'); }
    if (!(p.dose_por_kg > 0)) inc.push('dose_por_kg_nao_positiva');
    if (!(Number.isInteger(p.frequencia_divisoes) && p.frequencia_divisoes > 0)) inc.push('frequencia_divisoes_invalida');
    const massa = m?.massa ?? massaDoToken(p.unidade) ?? (p.unidade === 'UI' ? 'UI' : undefined);
    if (m && !massa) inc.push(`unidade_nao_reconhecida:${p.unidade}`);
    const porKg = p.max_dose_dia_unidade.includes('/kg');
    const tokenMax = p.max_dose_dia_unidade.split('/')[0].trim();
    regras.push({
      ...base, regra_id: `C:${d.id}:pediatrica`, origem: { motor: 'C:dose-calculator(catalogo)', referencia: `${d.id}#dose_pediatrica` },
      indicacao: d.indicacao_contexto, populacao_rotulo: 'pediátrico (faixa etária em texto livre, não aplicada como limite pelo motor)', faixa_idade_dias: undefined,
      posologia: {
        tipo_calculo: m?.tipo ?? 'nao_suportado', valor: p.dose_por_kg, valor_original: String(p.dose_por_kg), unidade_massa: massa, unidade_original: p.calculo || '(vazio)', base_temporal: m?.base ?? 'indeterminada',
        frequencia: Number.isInteger(p.frequencia_divisoes) && p.frequencia_divisoes > 0 ? { tipo: 'vezes_dia', vezes: p.frequencia_divisoes } : { tipo: 'nao_estruturada', texto: String(p.frequencia_divisoes) },
      },
      limites: porKg ? { max_por_kg_dia: { valor: p.max_dose_dia, unidade: tokenMax } } : { max_por_dia: { valor: p.max_dose_dia, unidade: tokenMax } },
      governanca: governancaDe([], [`Faixa etária (texto livre original): ${p.faixa_etaria}`, ...(p.observacao ? [`Observação original: ${p.observacao}`] : [])]),
      pendencias: pend, incompatibilidades: inc,
    });
  }
  return regras;
}

export function adaptarMotorC(drugs: readonly QuickDrugLike[]): DoseRule[] {
  return drugs.flatMap(regrasDoCatalogo);
}

// ── Importação consolidada e relatório ────────────────────────────────────────
export interface ResumoImportacao { motor: MotorOrigem; regras: number; incompativeis: number; sem_fonte: number; fonte_candidata: number; sem_escopo_etario: number; vinculo_nao_resolvido: number; validadas: number }

export function resumirImportacao(motor: MotorOrigem, regras: readonly DoseRule[], estado: (r: DoseRule) => string): ResumoImportacao {
  return {
    motor, regras: regras.length, incompativeis: regras.filter(r => r.incompatibilidades.length > 0).length,
    sem_fonte: regras.filter(r => estado(r) === 'regra_sem_fonte').length, fonte_candidata: regras.filter(r => estado(r) === 'fonte_candidata').length,
    sem_escopo_etario: regras.filter(r => !r.faixa_idade_dias).length, vinculo_nao_resolvido: regras.filter(r => r.vinculo_entidade === 'nao_resolvido').length,
    validadas: regras.filter(r => estado(r) === 'regra_clinicamente_validada').length,
  };
}

export function importarTodosOsMotores(catalogoC: readonly QuickDrugLike[]): { A: DoseRule[]; B: DoseRule[]; C: DoseRule[]; todas: DoseRule[] } {
  const ids = idsDoCatalogo();
  const A = adaptarMotorA(ids), B = adaptarMotorB(ids), C = adaptarMotorC(catalogoC);
  return { A, B, C, todas: [...A, ...B, ...C] };
}
