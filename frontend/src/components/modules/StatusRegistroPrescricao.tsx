'use client';

import { useApp } from '@/lib/store';
import { classificarSincronizacaoPrescricao } from '@/lib/sincronizacao-prescricao';

/**
 * RM-107.1.1-E2.3/E2.4 — Estado REAL do registro da prescrição, derivado do estado de sincronização e do modo (nunca inferido do estado local):
 * "finalizada neste dispositivo" ≠ "confirmada pelo servidor". Falha de sincronização nunca é apresentada como sucesso, bloqueio de
 * integridade nunca é confundido com falha de rede e estado desconhecido nunca é lido como sucesso.
 */
export function StatusRegistroPrescricao() {
  const { state, auth } = useApp();
  const consulta = state.activeConsultation;
  const nome = consulta?.paciente_nome;
  const sync = consulta?.sync?.prescricao;
  const parecer = classificarSincronizacaoPrescricao(consulta, { backendMode: auth.backendMode });
  let texto: string;
  if (parecer.estado === 'bloqueada_por_integridade') {
    texto = 'foi finalizada SOMENTE neste dispositivo e está BLOQUEADA por integridade: a dose estruturada de ao menos um medicamento não corresponde ao texto editado. NADA foi enviado ao servidor. Revise em Prescrições.';
  } else if (!auth.backendMode) {
    texto = 'foi finalizada SOMENTE neste dispositivo (modo local/demonstração): não foi enviada a nenhum servidor.';
  } else if (sync?.status === 'synced') {
    texto = 'foi finalizada e confirmada pelo servidor.';
  } else if (sync?.status === 'failed') {
    const natureza = parecer.estado === 'falha_de_rede' ? ' (falha de rede ou tempo esgotado: não se sabe se o servidor recebeu)' : parecer.estado === 'envio_interrompido' ? ' (envio interrompido: resultado desconhecido)' : '';
    texto = `foi finalizada neste dispositivo, mas NÃO foi confirmada pelo servidor${natureza}.${sync.error ? ` ${sync.error}` : ''}`;
  } else if (sync?.status === 'syncing') {
    texto = 'foi finalizada neste dispositivo; o envio ao servidor está em andamento e ainda não foi confirmado.';
  } else {
    texto = 'foi finalizada neste dispositivo e ainda não foi confirmada pelo servidor.';
  }
  return (
    <p className="text-slate-500" data-testid="status-registro-prescricao">
      A prescrição de <strong>{nome}</strong> {texto}
    </p>
  );
}
