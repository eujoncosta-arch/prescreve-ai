// RM-107.1.1-E2.3 — Trilha da SESSÃO (em memória) dos eventos de finalização e sincronização da posologia.
// NÃO persiste (sem localStorage/banco/backend), NÃO é auditoria institucional nem assinatura eletrônica, e NÃO contém dados pessoais
// (apenas identificadores locais da consulta/item e códigos de resultado). Desaparece ao recarregar a página ou ao encerrar a sessão.

export type TipoEventoSessao = 'finalizacao_local' | 'bloqueio_dto' | 'tentativa_sync' | 'resultado_sync' | 'revisao_aberta' | 'revisao_salva' | 'revisao_cancelada' | 'reenvio_manual';

export interface EventoSessao {
  tipo: TipoEventoSessao;
  em: string;
  consulta_id?: string;
  item_id?: string;
  detalhe?: string;
}

const LIMITE = 500;
let eventos: EventoSessao[] = [];

export function registrarEventoSessao(e: Omit<EventoSessao, 'em'> & { em?: string }): void {
  eventos = [...eventos, { ...e, em: e.em ?? new Date().toISOString() }].slice(-LIMITE);
}
export function eventosDaSessao(): readonly EventoSessao[] { return eventos; }
export function limparTrilhaDaSessao(): void { eventos = []; }
