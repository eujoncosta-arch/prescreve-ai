// RM-107.2 — Validação de integridade, sobreposição e comparação de regras. NÃO resolve divergências.
import type { DoseRule, Faixa } from './types';
import { estadoDaRegra, aprovacaoCompleta } from './governance';

export function faixaValida(f: Faixa | undefined): boolean {
  if (!f) return true;
  if (f.min !== undefined && f.max !== undefined) {
    if (f.min > f.max) return false;
    if (f.min === f.max && !(f.min_inclusivo && f.max_inclusivo)) return false;
  }
  return true;
}

export function valorNaFaixa(v: number, f: Faixa): boolean {
  if (f.min !== undefined && (f.min_inclusivo ? v < f.min : v <= f.min)) return false;
  if (f.max !== undefined && (f.max_inclusivo ? v > f.max : v >= f.max)) return false;
  return true;
}

/** 'indeterminado' quando uma das faixas não está declarada. */
export function relacaoDeFaixas(a: Faixa | undefined, b: Faixa | undefined): 'sobrepoe' | 'disjuntas' | 'indeterminado' {
  if (!a || !b) return 'indeterminado';
  const lo = Math.max(a.min ?? -Infinity, b.min ?? -Infinity);
  const hi = Math.min(a.max ?? Infinity, b.max ?? Infinity);
  if (lo < hi) return 'sobrepoe';
  if (lo > hi) return 'disjuntas';
  // lo === hi: só se o ponto pertence às duas faixas
  const pt = lo;
  return valorNaFaixa(pt, a) && valorNaFaixa(pt, b) ? 'sobrepoe' : 'disjuntas';
}

/** Problemas de integridade de UMA regra (lista vazia = íntegra). */
export function validarRegra(r: DoseRule): string[] {
  const p: string[] = [];
  if (!r.regra_id) p.push('regra_id_ausente');
  if (!faixaValida(r.faixa_idade_dias)) p.push('faixa_idade_invalida');
  if (!faixaValida(r.faixa_peso_kg)) p.push('faixa_peso_invalida');
  const t = r.posologia;
  if ((t.tipo_calculo === 'por_kg' || t.tipo_calculo === 'por_m2' || t.tipo_calculo === 'fixa') && t.base_temporal === 'indeterminada') p.push('base_temporal_indeterminada');
  if (t.tipo_calculo === 'por_kg' && t.unidade_massa === undefined) p.push('unidade_massa_ausente');
  if (t.tipo_calculo === 'por_kg' && !(typeof t.valor === 'number' && t.valor > 0)) p.push('valor_por_kg_nao_positivo');
  if (t.tipo_calculo === 'por_faixa' && (!t.faixas_dose || t.faixas_dose.length === 0)) p.push('faixas_dose_ausentes');
  if (r.governanca.status_declarado === 'clinicamente_validada' && !aprovacaoCompleta(r.governanca.aprovacao)) p.push('validada_sem_aprovacao_formal');
  if (r.governanca.status_declarado === 'clinicamente_validada' && estadoDaRegra(r.governanca) !== 'regra_clinicamente_validada') p.push('validada_sem_fonte_verificada_completa');
  return p;
}

export interface DiferencaRegras { campo: string; a: string; b: string }
const j = (x: unknown) => (x === undefined ? 'não declarado' : JSON.stringify(x));

/** Diferenças entre duas regras (para registro; NUNCA para escolher uma delas). */
export function compararRegras(a: DoseRule, b: DoseRule): DiferencaRegras[] {
  const d: DiferencaRegras[] = [];
  const cmp = (campo: string, x: unknown, y: unknown) => { if (JSON.stringify(x) !== JSON.stringify(y)) d.push({ campo, a: j(x), b: j(y) }); };
  cmp('base_temporal', a.posologia.base_temporal, b.posologia.base_temporal);
  cmp('unidade', a.posologia.unidade_massa, b.posologia.unidade_massa);
  cmp('tipo_calculo', a.posologia.tipo_calculo, b.posologia.tipo_calculo);
  cmp('valor', a.posologia.valor, b.posologia.valor);
  cmp('substancia_referencia', a.posologia.substancia_referencia, b.posologia.substancia_referencia);
  cmp('indicacao', (a.indicacao ?? '').toLowerCase().trim() || undefined, (b.indicacao ?? '').toLowerCase().trim() || undefined);
  cmp('populacao_rotulo', a.populacao_rotulo, b.populacao_rotulo);
  cmp('faixa_idade_dias', a.faixa_idade_dias, b.faixa_idade_dias);
  cmp('via', a.via, b.via);
  cmp('apresentacoes', a.apresentacoes_compativeis ?? a.apresentacoes_texto, b.apresentacoes_compativeis ?? b.apresentacoes_texto);
  cmp('frequencia', a.posologia.frequencia, b.posologia.frequencia);
  cmp('limites', a.limites, b.limites);
  return d;
}

export interface ParDeRegras { a: string; b: string; entidade_id: string; idade: 'sobrepoe' | 'disjuntas' | 'indeterminado'; entre_motores_diferentes: boolean; diferencas: DiferencaRegras[] }

/** Pares de regras da MESMA entidade (vínculo resolvido), com a relação de escopo etário. Não descarta nem funde nada. */
export function detectarSobreposicoes(regras: readonly DoseRule[], opcoes: { somenteSobrepostasOuIndeterminadas?: boolean } = {}): ParDeRegras[] {
  const porEnt = new Map<string, DoseRule[]>();
  for (const r of regras) if (r.entidade_id) porEnt.set(r.entidade_id, [...(porEnt.get(r.entidade_id) ?? []), r]);
  const out: ParDeRegras[] = [];
  for (const [ent, lista] of porEnt) {
    for (let i = 0; i < lista.length; i++) for (let k = i + 1; k < lista.length; k++) {
      const idade = relacaoDeFaixas(lista[i].faixa_idade_dias, lista[k].faixa_idade_dias);
      if (opcoes.somenteSobrepostasOuIndeterminadas && idade === 'disjuntas') continue;
      out.push({ a: lista[i].regra_id, b: lista[k].regra_id, entidade_id: ent, idade, entre_motores_diferentes: lista[i].origem.motor !== lista[k].origem.motor, diferencas: compararRegras(lista[i], lista[k]) });
    }
  }
  return out;
}
