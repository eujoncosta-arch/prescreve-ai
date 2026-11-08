// RM-107.1.1-E2.4 — Estado de sincronização da PRESCRIÇÃO de uma consulta, em termos honestos e distintos.
// Função pura. Estados de transporte/integridade de dados — NÃO são estados clínicos e nenhum implica validação ou segurança da dose.
// Regra central: "sincronizada" só com confirmação real do servidor (`sync.prescricao.status === 'synced'`); qualquer coisa desconhecida
// é `desconhecido`, nunca sucesso; bloqueio de integridade tem prioridade e nunca é apagado por falha de rede.

import type { Consultation } from './types';

export type EstadoSincronizacaoPrescricao =
  | 'sem_prescricao_local'
  | 'somente_no_dispositivo'        // sem backend (local/demonstração): nunca será enviada neste modo
  | 'bloqueada_por_integridade'     // dose estruturada divergente/ausente: NÃO enviada; exige revisão do prescritor
  | 'aguardando_sincronizacao'      // com backend, ainda sem tentativa
  | 'sincronizando'
  | 'falha_de_rede'                 // rede ou tempo esgotado: o envio pode ou não ter chegado ao servidor
  | 'falha_de_servidor'             // 5xx ou rejeição (4xx) devolvida pelo servidor
  | 'envio_interrompido'            // interrompido por reload/fechamento: resultado desconhecido
  | 'sincronizada'                  // confirmada pelo servidor
  | 'desconhecido';

export interface ParecerSincronizacaoPrescricao {
  estado: EstadoSincronizacaoPrescricao;
  /** Rótulo curto. Nunca contém "emitida"/"registrada" fora de `sincronizada`. */
  rotulo: string;
  /** Explica o que sabemos e o que NÃO sabemos. */
  detalhe: string;
  /** A prescrição existe somente neste dispositivo (não há confirmação do servidor). */
  somente_no_dispositivo: boolean;
  /** Há bloqueio de integridade que exige revisão antes de qualquer envio. */
  exige_revisao: boolean;
  /** Reenvio manual faz sentido (nunca automático). */
  pode_reenviar: boolean;
}

/** Marcador de bloqueio persistido: qualquer valor truthy conta (conservador — não depende de o formato ser reconhecível). */
export const itemTemBloqueioDeDto = (i: { bloqueio_dto?: unknown } | null | undefined): boolean => !!i?.bloqueio_dto;

export function classificarSincronizacaoPrescricao(
  c: Pick<Consultation, 'prescricao' | 'sync'> | null | undefined,
  contexto: { backendMode: boolean },
): ParecerSincronizacaoPrescricao {
  const itens = c?.prescricao?.itens;
  const p = c?.sync?.prescricao;
  if (!c || !Array.isArray(itens) || itens.length === 0) {
    return { estado: 'sem_prescricao_local', rotulo: 'Sem prescrição local', detalhe: 'Não há prescrição com itens neste dispositivo.', somente_no_dispositivo: false, exige_revisao: false, pode_reenviar: false };
  }
  if (p?.status === 'synced') {
    return { estado: 'sincronizada', rotulo: 'Confirmada pelo servidor', detalhe: 'O servidor confirmou o recebimento da prescrição.', somente_no_dispositivo: false, exige_revisao: false, pode_reenviar: false };
  }
  if (itens.some(itemTemBloqueioDeDto)) {
    return {
      estado: 'bloqueada_por_integridade', rotulo: 'Bloqueada por integridade — não enviada',
      detalhe: 'A dose estruturada de ao menos um medicamento não corresponde ao texto editado e não foi reutilizada pelo prescritor. Nada foi enviado ao servidor; a prescrição existe somente neste dispositivo. Falha de rede não remove este bloqueio.',
      somente_no_dispositivo: true, exige_revisao: true, pode_reenviar: false,
    };
  }
  if (!contexto.backendMode) {
    return { estado: 'somente_no_dispositivo', rotulo: 'Somente neste dispositivo', detalhe: 'Modo local/demonstração: a prescrição não é enviada a nenhum servidor.', somente_no_dispositivo: true, exige_revisao: false, pode_reenviar: false };
  }
  switch (p?.status) {
    case undefined:
    case 'local':
      return { estado: 'aguardando_sincronizacao', rotulo: 'Aguardando sincronização', detalhe: 'Ainda não confirmada pelo servidor; existe somente neste dispositivo.', somente_no_dispositivo: true, exige_revisao: false, pode_reenviar: true };
    case 'syncing':
      return { estado: 'sincronizando', rotulo: 'Sincronizando', detalhe: 'Envio em andamento; ainda não confirmado pelo servidor.', somente_no_dispositivo: true, exige_revisao: false, pode_reenviar: false };
    case 'failed': {
      switch (p.error_kind) {
        case 'rede':
        case 'timeout':
          return { estado: 'falha_de_rede', rotulo: 'Falha de rede — não confirmada', detalhe: 'O envio falhou por rede/tempo esgotado. Não é possível saber se o servidor chegou a processá-lo; o reenvio usa a mesma chave de idempotência. Existe somente neste dispositivo até a confirmação.', somente_no_dispositivo: true, exige_revisao: false, pode_reenviar: true };
        case 'servidor':
        case 'rejeitado':
          return { estado: 'falha_de_servidor', rotulo: 'Servidor não confirmou', detalhe: `${p.error_kind === 'rejeitado' ? 'O servidor rejeitou o envio.' : 'O servidor respondeu com erro.'}${p.error ? ` ${p.error}` : ''} Existe somente neste dispositivo.`, somente_no_dispositivo: true, exige_revisao: false, pode_reenviar: p.error_kind === 'servidor' };
        case 'interrompida':
          return { estado: 'envio_interrompido', rotulo: 'Envio interrompido — não confirmado', detalhe: 'O envio foi interrompido (recarregamento/fechamento). O resultado é desconhecido; reenvie para confirmar. Existe somente neste dispositivo até a confirmação.', somente_no_dispositivo: true, exige_revisao: false, pode_reenviar: true };
        case 'integridade':
          // Sem itens bloqueados mais (já revisados): estado obsoleto — nunca tratado como sucesso.
          return { estado: 'aguardando_sincronizacao', rotulo: 'Aguardando sincronização', detalhe: 'O bloqueio de integridade anterior foi resolvido por revisão; a prescrição ainda não foi confirmada pelo servidor.', somente_no_dispositivo: true, exige_revisao: false, pode_reenviar: true };
        default:
          return { estado: 'desconhecido', rotulo: 'Falha não classificada — não confirmada', detalhe: `A falha não foi classificada (registro anterior).${p.error ? ` ${p.error}` : ''} Existe somente neste dispositivo até a confirmação.`, somente_no_dispositivo: true, exige_revisao: false, pode_reenviar: true };
      }
    }
    default:
      return { estado: 'desconhecido', rotulo: 'Estado desconhecido — não confirmado', detalhe: 'Estado de sincronização não reconhecido; tratado como NÃO confirmado.', somente_no_dispositivo: true, exige_revisao: false, pode_reenviar: false };
  }
}
