// RM-107.2 — Governança: estado efetivo da regra (derivado, nunca apenas declarado).
import type { AprovacaoFormal, EstadoRegra, FonteDose, Governanca } from './types';

const vazio = (v: unknown) => typeof v !== 'string' || v.trim() === '';

/** Campos que faltam para uma fonte ser considerada VERIFICADA (documento aberto com versão, seção e trecho). */
export function camposFaltantesFonte(f: FonteDose): string[] {
  const falta: string[] = [];
  if (f.estado_de_revisao !== 'verificada') falta.push('estado_de_revisao=verificada');
  for (const k of ['instituicao', 'documento', 'url_ou_identificador', 'versao', 'data', 'secao', 'trecho', 'populacao', 'indicacao', 'via'] as const) {
    if (vazio(f[k])) falta.push(k);
  }
  if (!Array.isArray(f.limitacoes_da_fonte)) falta.push('limitacoes_da_fonte');
  return falta;
}

export function aprovacaoCompleta(a: AprovacaoFormal | undefined): boolean {
  return !!a && !vazio(a.responsavel) && !vazio(a.data) && !vazio(a.parecer) && (a.cargo === 'medico' || a.cargo === 'farmaceutico_clinico');
}

/**
 * Estado EFETIVO da regra. Só devolve `regra_clinicamente_validada` com: (1) status declarado validada, (2) aprovação
 * formal completa (responsável, cargo, data, parecer) e (3) ao menos uma fonte VERIFICADA completa. Qualquer falta rebaixa.
 */
export function estadoDaRegra(g: Governanca): EstadoRegra {
  if (!g.fontes || g.fontes.length === 0) return 'regra_sem_fonte';
  const verificadasCompletas = g.fontes.filter(f => camposFaltantesFonte(f).length === 0);
  if (verificadasCompletas.length === 0) return 'fonte_candidata';
  if (g.status_declarado === 'clinicamente_validada' && aprovacaoCompleta(g.aprovacao)) return 'regra_clinicamente_validada';
  return 'fonte_consultada_aguardando_revisao';
}
