// RM-107.2 — Compatibilidade com `DoseEstruturada` (front/DTO do backend) e com protocolos legados.
// Não migra nada silenciosamente: itens antigos são apenas ENVELOPADOS (sem mutação) com a marca de que não foram avaliados.
import type { DoseEstruturada, FrequenciaDose, UnidadeDose } from '../types';
import type { DoseResult, FrequenciaEstruturada } from './types';

export type ResultadoConversao = { ok: true; dose: DoseEstruturada } | { ok: false; motivo: string };

const UNIDADES: Record<string, UnidadeDose> = { mg: 'mg', mcg: 'mcg', g: 'g', mL: 'mL', UI: 'UI', gotas: 'gotas' };

export function frequenciaParaDto(f: FrequenciaEstruturada): { frequencia: FrequenciaDose; frequencia_detalhe?: string } {
  if (f.tipo === 'dose_unica') return { frequencia: 'dose_unica' };
  const vezes = f.tipo === 'vezes_dia' ? f.vezes : f.tipo === 'intervalo_h' ? 24 / f.horas : undefined;
  if (f.tipo === 'intervalo_h') {
    const m: Record<number, FrequenciaDose> = { 4: 'a_cada_4h', 6: 'a_cada_6h', 8: 'a_cada_8h', 12: 'a_cada_12h', 24: '1x/dia' };
    if (m[f.horas]) return { frequencia: m[f.horas] };
  }
  if (vezes === 1) return { frequencia: '1x/dia' };
  if (vezes === 2) return { frequencia: '2x/dia' };
  if (vezes === 3) return { frequencia: '3x/dia' };
  if (vezes === 4) return { frequencia: '4x/dia' };
  const texto = f.tipo === 'variavel' || f.tipo === 'nao_estruturada' ? f.texto : f.tipo === 'intervalo_h' ? `a cada ${f.horas} h` : `${vezes ?? '?'}x/dia`;
  return { frequencia: 'outro', frequencia_detalhe: texto };
}

/** Converte um resultado do contrato em `DoseEstruturada`. Só aceita `calculo_realizado`; nunca persiste cálculo incompleto/bloqueado. */
export function paraDoseEstruturada(r: DoseResult, ctx: { via: string; peso_kg?: number }): ResultadoConversao {
  if (r.estado_calculo !== 'calculo_realizado') return { ok: false, motivo: `estado_calculo=${r.estado_calculo}: não persistível como dose estruturada` };
  if (!r.dose_por_administracao || !r.frequencia) return { ok: false, motivo: 'resultado sem dose por administração ou frequência' };
  const unidade = UNIDADES[r.dose_por_administracao.unidade];
  if (!unidade) return { ok: false, motivo: `unidade "${r.dose_por_administracao.unidade}" sem equivalente em UnidadeDose` };
  if (!ctx.via || !ctx.via.trim()) return { ok: false, motivo: 'via não informada' };
  const f = frequenciaParaDto(r.frequencia);
  const dose: DoseEstruturada = { valor: r.dose_por_administracao.valor, unidade, frequencia: f.frequencia, via: ctx.via, dose_por_tomada: r.dose_por_administracao.valor, ...(f.frequencia_detalhe ? { frequencia_detalhe: f.frequencia_detalhe } : {}) };
  if (ctx.peso_kg && ctx.peso_kg > 0 && r.dose_diaria) dose.dose_por_kg_dia = r.dose_diaria.valor / ctx.peso_kg;
  return { ok: true, dose };
}

export interface RegistroLegado<T> { origem: 'legado'; estado_avaliacao: 'nao_avaliado_pelo_contrato'; item: Readonly<T> }

/** Envelopa um item antigo (RxItem/protocolo/favorito) SEM alterá-lo e SEM recalcular a dose. */
export function envelopeLegado<T extends object>(item: T): RegistroLegado<T> {
  return { origem: 'legado', estado_avaliacao: 'nao_avaliado_pelo_contrato', item };
}
