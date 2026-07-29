'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { Consultation, Anamnesis, DiagnosticSupport, TherapeuticPlan, SafetyCheck, Prescription, AppSettings, PrognosisData, LaboratoryPreference, ResourceSyncState, MedicamentoPrescrito, ConsultationDetailStatus, PrescricaoRecuperada, DiagnosticoEstruturado, RiscoCalculado, RiscoRecuperado } from './types';
import { MOCK_CONSULTATIONS } from './mock-data';
import { authApi, consultaApi, getCurrentUser, useRealBackend, type CurrentUser } from './api-client';
import { syncResource, newIdempotencyKey, isDemoConsultationId } from './sync-engine';
import { APP_MODE, IS_DEMO_MODE } from './app-mode';

const DEFAULT_SETTINGS: AppSettings = {
  medico: { nome: 'Dr. João Silva', crm: 'CRM-SP 123456', especialidade: 'Clínica Médica' },
  preferencia_laboratorio: 'sem_preferencia',
  tema: 'light',
  mostrar_evidencias_painel: true,
  alertas_interacao: true,
  idioma: 'pt-BR',
};

/**
 * RM-44: metadados reais de paginação de `GET /api/consultas` — nunca
 * fabricados. `total`/`totalPages` são `null` até a primeira resposta
 * bem-sucedida do backend (distingue "ainda não sabemos" de "backend
 * confirmou zero"). `error`/`loadMoreError` são independentes: uma falha
 * ao carregar mais nunca ressuscita/confunde com uma falha antiga da
 * carga inicial (já pode ter sido bem-sucedida depois).
 */
export interface ConsultationsPaginationState {
  /** 0 = nenhuma página foi carregada com sucesso ainda. */
  currentPage: number;
  pageSize: number;
  total: number | null;
  totalPages: number | null;
  hasNextPage: boolean;
  /** Carregando a PRIMEIRA página. */
  isLoading: boolean;
  /** Carregando uma página seguinte ("carregar mais"). */
  isLoadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;
}

export const INITIAL_PAGINATION: ConsultationsPaginationState = {
  currentPage: 0,
  pageSize: 20,
  total: null,
  totalPages: null,
  hasNextPage: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  loadMoreError: null,
};

export interface AppState {
  consultations: Consultation[];
  activeConsultation: Consultation | null;
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  currentUser: CurrentUser | null;
  /**
   * RM-43: estágio de carregamento do detalhe completo (prescrição real
   * incluída), indexado pelo `backend_id` real da consulta — nunca um
   * loading global, para não bloquear outras páginas enquanto uma única
   * consulta carrega.
   */
  consultationDetailStatus: Record<string, ConsultationDetailStatus>;
  /** RM-44: estado real de paginação incremental de `state.consultations` vindas do backend. */
  consultationsPagination: ConsultationsPaginationState;
}

type SyncResource = 'consulta' | 'diagnostico' | 'prescricao' | 'risco';

export type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: CurrentUser | null }
  | { type: 'NEW_CONSULTATION'; payload: Consultation }
  | { type: 'SET_ACTIVE_CONSULTATION'; payload: Consultation | null }
  | { type: 'UPDATE_ANAMNESIS'; payload: Anamnesis }
  | { type: 'UPDATE_DIAGNOSTIC'; payload: DiagnosticSupport }
  | { type: 'SELECT_DIAGNOSIS'; payload: string }
  | { type: 'SET_DIAGNOSTICO_ESTRUTURADO'; payload: DiagnosticoEstruturado }
  | { type: 'SET_RISCO_CALCULADO'; payload: RiscoCalculado }
  | { type: 'UPDATE_THERAPEUTIC'; payload: TherapeuticPlan }
  | { type: 'UPDATE_SAFETY'; payload: SafetyCheck }
  | { type: 'UPDATE_PRESCRIPTION'; payload: Prescription }
  | { type: 'UPDATE_PROGNOSTIC'; payload: PrognosisData }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_LAB_PREFERENCE'; payload: LaboratoryPreference }
  | {
      type: 'SET_SYNC_STATE';
      payload: { consultaId: string; resource: SyncResource; state: ResourceSyncState };
    }
  | { type: 'HYDRATE_CONSULTATIONS'; payload: Consultation[] }
  | { type: 'RESET_SESSION_DATA' }
  | {
      type: 'SET_CONSULTATION_DETAIL_STATUS';
      payload: { backendId: string; status: ConsultationDetailStatus };
    }
  | {
      type: 'HYDRATE_CONSULTATION_DETAIL';
      payload: { backendId: string; prescricoesRecuperadas: PrescricaoRecuperada[]; riscosRecuperados: RiscoRecuperado[] };
    }
  | { type: 'SET_PAGINATION_LOADING'; payload: boolean }
  | { type: 'SET_PAGINATION_LOADING_MORE'; payload: boolean }
  | { type: 'SET_PAGINATION_ERROR'; payload: string | null }
  | { type: 'SET_PAGINATION_LOAD_MORE_ERROR'; payload: string | null }
  | {
      type: 'HYDRATE_CONSULTATIONS_PAGE';
      payload: { hidratadas: Consultation[]; pagina: number; limite: number; total: number };
    }
  | { type: 'RESET_PAGINATION' }
  | { type: 'RESTORE_PENDING_CONSULTATIONS'; payload: Consultation[] };

// ============================================================
// RM-42: hidratação da lista de consultas a partir do backend real
//
// GAP CORRIGIDO (achado durante a auditoria RM-38): `state.consultations`
// nunca era populado por `consultaApi.listar()` — só por `NEW_CONSULTATION`
// (consultas criadas NESTA sessão do navegador) e, antes de RM-38, por
// `MOCK_CONSULTATIONS` incondicional. Em produção, tudo que um médico
// criou em sessões anteriores (mesmo já persistido com sucesso no
// backend) desaparecia ao recarregar a página ou logar de outro
// dispositivo — não por estar perdido, mas por nunca ser buscado de
// volta. `mapBackendConsultaToConsultation`/o efeito de hidratação em
// `AppProvider` fecham esse gap para `/historico`, `/prescricoes` e o
// dashboard.
// ============================================================

/** Formato de uma linha de `GET /api/consultas` (ver `consulta.service.ts::listarConsultas`). */
export interface BackendConsultaRow {
  id: string;
  status: 'em_andamento' | 'concluida' | 'cancelada';
  criado_em: string;
  diagnosticos?: { cid: string; descricao: string; selecionado: boolean }[];
  prescricoes?: { id: string; status: string }[];
}

/**
 * Converte uma linha real do backend (`GET /api/consultas`) para o
 * formato `Consultation` do frontend — nunca fabrica dado clínico.
 *
 * `paciente_nome`: o modelo `Consulta` do backend NÃO persiste nome de
 * paciente nesta versão do MVP (`anamnese` é um JSON opaco sem campo de
 * identificação; `paciente_id`/`Paciente` não é populado neste fluxo).
 * Usar a descrição do diagnóstico selecionado como rótulo quando
 * disponível é honesto (é um dado real da consulta); na ausência dele,
 * usamos um rótulo explícito de "não identificado" — NUNCA um nome de
 * pessoa inventado (seria reintroduzir exatamente o antipadrão que
 * RM-38 eliminou, só que com uma marca-d'água menos óbvia).
 *
 * `prescricao`: `GET /api/consultas` (listagem paginada) só inclui um
 * resumo (`{id, status}`) da prescrição, não os itens/tipo completos que
 * o tipo `Prescription` exige. Fabricar um objeto com `itens: []` para
 * "preencher o tipo" apareceria como "nenhum medicamento prescrito" —
 * uma afirmação falsa, não apenas um dado ausente. Por isso, consultas
 * hidratadas ficam SEM `prescricao` aqui. `temPrescricaoNoBackend`
 * carrega o FATO real (existe ou não ao menos uma prescrição) sem
 * fabricar o conteúdo; o conteúdo real (`prescricoesRecuperadas`) só é
 * buscado sob demanda (RM-43, ver `carregarDetalheConsulta` em
 * `AppProvider`) — nunca eagerly para as 50 consultas de uma vez.
 */
export function mapBackendConsultaToConsultation(row: BackendConsultaRow): Consultation {
  const statusMap: Record<BackendConsultaRow['status'], Consultation['status']> = {
    em_andamento: 'anamnese',
    concluida: 'concluida',
    // Backend não tem equivalente a "cancelada" no modelo do frontend;
    // tratada como encerrada — nunca reaberta como se estivesse em
    // andamento (evitaria reaparecer como pendente de ação numa consulta
    // que o médico explicitamente cancelou).
    cancelada: 'concluida',
  };
  const diagnostico = row.diagnosticos?.[0];

  return {
    id: row.id,
    status: statusMap[row.status] ?? 'concluida',
    paciente_nome: diagnostico?.descricao || 'Paciente não identificado',
    data: row.criado_em,
    diagnostico_selecionado: diagnostico?.cid,
    sync: {
      consulta: { status: 'synced', attempts: 0, backend_id: row.id },
    },
    temPrescricaoNoBackend: (row.prescricoes?.length ?? 0) > 0,
  };
}

// RM-38: `MOCK_CONSULTATIONS` (pacientes fictícios "Maria Santos", "João
// Oliveira", "Ana Costa") era o estado inicial INCONDICIONAL de
// `consultations` — em produção, todo médico via esses 3 pacientes
// fictícios misturados com/no lugar de suas consultas reais em
// /historico, /prescricoes e no dashboard, indistinguíveis de dados
// reais. Corrigido: os casos de exemplo só aparecem em modo demo,
// explicitamente rotulado; fora dele, a lista começa vazia (honesto —
// "nenhuma consulta ainda", nunca dados fabricados) e é hidratada a
// partir do backend real logo após autenticar (ver RM-42 acima).
const initialState: AppState = {
  consultations: IS_DEMO_MODE ? MOCK_CONSULTATIONS : [],
  activeConsultation: null,
  settings: DEFAULT_SETTINGS,
  loading: false,
  error: null,
  currentUser: null,
  consultationDetailStatus: {},
  consultationsPagination: INITIAL_PAGINATION,
};

// ============================================================
// RM-44: merge compartilhado entre `HYDRATE_CONSULTATIONS` (RM-42, uma
// única carga sem paginação real — mantido por compatibilidade/testes)
// e `HYDRATE_CONSULTATIONS_PAGE` (paginação incremental real).
//
// Regras de merge (nunca por nome/data/diagnóstico — só por
// identificador estável, `id`/`backend_id`):
//   1. consulta local NUNCA sincronizada (`local`/`syncing`/`failed`) é
//      sempre preservada tal como está — hidratação nunca a sobrescreve;
//   2. consulta já sincronizada (`synced`) cujo id/backend_id aparece no
//      lote hidratado é ATUALIZADA com os dados frescos do backend —
//      mas preserva `prescricoesRecuperadas` (RM-43, carregado sob
//      demanda) se a consulta já tinha esse detalhe carregado
//      localmente, já que o resumo do backend nunca traz esse campo;
//   3. consulta já sincronizada cujo id/backend_id NÃO aparece no lote
//      atual (ex.: já veio de uma página anterior) é preservada como
//      está — nunca duplicada nem descartada;
//   4. novas consultas do backend (sem correspondente local) são
//      adicionadas ao final, preservando a ordem relativa em que o
//      backend as retornou (mais recentes primeiro, dentro do segmento
//      de cada página).
// ============================================================
function mesclarConsultasHidratadas(atual: Consultation[], hidratadas: Consultation[]): Consultation[] {
  const porId = new Map(atual.map((c) => [c.id, c] as const));
  const porBackendId = new Map(
    atual
      .filter((c) => c.sync?.consulta?.backend_id)
      .map((c) => [c.sync!.consulta!.backend_id!, c] as const),
  );
  const idsHidratados = new Set(hidratadas.map((h) => h.id));

  const localPendente = (c: Consultation) => c.sync?.consulta?.status !== 'synced';

  const locaisPendentes = atual.filter(localPendente);

  const sincronizadasNaoRevisitadas = atual.filter((c) => {
    if (localPendente(c)) return false; // já incluída acima
    const backendId = c.sync?.consulta?.backend_id;
    return !idsHidratados.has(c.id) && !(backendId && idsHidratados.has(backendId));
  });

  const atualizadas = hidratadas.map((h) => {
    const existente = porId.get(h.id) ?? (h.sync?.consulta?.backend_id ? porBackendId.get(h.sync.consulta.backend_id) : undefined);
    let mesclado = h;
    if (existente?.prescricoesRecuperadas) mesclado = { ...mesclado, prescricoesRecuperadas: existente.prescricoesRecuperadas };
    if (existente?.riscosRecuperados) mesclado = { ...mesclado, riscosRecuperados: existente.riscosRecuperados };
    return mesclado;
  });

  return [...locaisPendentes, ...sincronizadasNaoRevisitadas, ...atualizadas];
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_USER':
      return { ...state, currentUser: action.payload };

    case 'NEW_CONSULTATION':
      return {
        ...state,
        activeConsultation: action.payload,
        consultations: [action.payload, ...state.consultations],
      };

    case 'SET_ACTIVE_CONSULTATION':
      return { ...state, activeConsultation: action.payload };

    case 'UPDATE_ANAMNESIS': {
      if (!state.activeConsultation) return state;
      const updated = { ...state.activeConsultation, anamnese: action.payload, status: 'diagnostico' as const };
      return {
        ...state,
        activeConsultation: updated,
        consultations: state.consultations.map(c => c.id === updated.id ? updated : c),
      };
    }

    case 'UPDATE_DIAGNOSTIC': {
      if (!state.activeConsultation) return state;
      const updated = { ...state.activeConsultation, apoio_diagnostico: action.payload };
      return {
        ...state,
        activeConsultation: updated,
        consultations: state.consultations.map(c => c.id === updated.id ? updated : c),
      };
    }

    case 'SELECT_DIAGNOSIS': {
      if (!state.activeConsultation) return state;
      const updated = {
        ...state.activeConsultation,
        diagnostico_selecionado: action.payload,
        status: 'terapeutico' as const,
      };
      return {
        ...state,
        activeConsultation: updated,
        consultations: state.consultations.map(c => c.id === updated.id ? updated : c),
      };
    }

    // RM-53 (RM41-023): guarda o diagnóstico estruturado (cid/descrição/
    // confiança) — despachado no MESMO evento de seleção de
    // `DiagnosticPanel` (nunca num efeito), é o que `sincronizarConsulta`
    // envia a `POST /api/diagnostico`.
    case 'SET_DIAGNOSTICO_ESTRUTURADO': {
      if (!state.activeConsultation) return state;
      const updated = { ...state.activeConsultation, diagnostico_estruturado: action.payload };
      return {
        ...state,
        activeConsultation: updated,
        consultations: state.consultations.map(c => c.id === updated.id ? updated : c),
      };
    }

    // RM-53 (RM41-023): guarda o risco clínico calculado no momento em que
    // o médico confirma a etapa de Inteligência (despachado no onClick do
    // botão "Continuar", nunca num efeito) — é o que `sincronizarConsulta`
    // envia a `POST /api/risco`.
    case 'SET_RISCO_CALCULADO': {
      if (!state.activeConsultation) return state;
      const updated = { ...state.activeConsultation, risco_calculado: action.payload };
      return {
        ...state,
        activeConsultation: updated,
        consultations: state.consultations.map(c => c.id === updated.id ? updated : c),
      };
    }

    case 'UPDATE_THERAPEUTIC': {
      if (!state.activeConsultation) return state;
      const updated = {
        ...state.activeConsultation,
        plano_terapeutico: action.payload,
        status: 'prescricao' as const,
      };
      return {
        ...state,
        activeConsultation: updated,
        consultations: state.consultations.map(c => c.id === updated.id ? updated : c),
      };
    }

    case 'UPDATE_SAFETY': {
      if (!state.activeConsultation) return state;
      const updated = { ...state.activeConsultation, seguranca: action.payload };
      return {
        ...state,
        activeConsultation: updated,
        consultations: state.consultations.map(c => c.id === updated.id ? updated : c),
      };
    }

    case 'UPDATE_PRESCRIPTION': {
      if (!state.activeConsultation) return state;
      const updated = {
        ...state.activeConsultation,
        prescricao: action.payload,
        status: 'concluida' as const,
      };
      return {
        ...state,
        activeConsultation: updated,
        consultations: state.consultations.map(c => c.id === updated.id ? updated : c),
      };
    }

    case 'UPDATE_PROGNOSTIC': {
      if (!state.activeConsultation) return state;
      const updated = { ...state.activeConsultation, prognostico: action.payload };
      return {
        ...state,
        activeConsultation: updated,
        consultations: state.consultations.map(c => c.id === updated.id ? updated : c),
      };
    }

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    case 'SET_LAB_PREFERENCE':
      return { ...state, settings: { ...state.settings, preferencia_laboratorio: action.payload } };

    case 'SET_SYNC_STATE': {
      const { consultaId, resource, state: syncState } = action.payload;
      const aplicar = (c: Consultation): Consultation =>
        c.id === consultaId
          ? { ...c, sync: { ...c.sync, [resource]: syncState } }
          : c;
      return {
        ...state,
        activeConsultation:
          state.activeConsultation?.id === consultaId
            ? aplicar(state.activeConsultation)
            : state.activeConsultation,
        consultations: state.consultations.map(aplicar),
      };
    }

    case 'HYDRATE_CONSULTATIONS':
      // RM-42 (mantido por compatibilidade — testado diretamente por
      // `store-hydration-rm42.test.ts`). RM-44 introduziu
      // `HYDRATE_CONSULTATIONS_PAGE` como o fluxo real usado pela
      // hidratação/paginação; ambos compartilham a mesma lógica de merge.
      return { ...state, consultations: mesclarConsultasHidratadas(state.consultations, action.payload) };

    case 'HYDRATE_CONSULTATIONS_PAGE': {
      const { hidratadas, pagina, limite, total } = action.payload;
      const totalPages = limite > 0 ? Math.ceil(total / limite) : 0;
      return {
        ...state,
        consultations: mesclarConsultasHidratadas(state.consultations, hidratadas),
        consultationsPagination: {
          ...state.consultationsPagination,
          currentPage: pagina,
          pageSize: limite,
          total,
          totalPages,
          hasNextPage: pagina < totalPages,
          isLoading: false,
          isLoadingMore: false,
          error: null,
          loadMoreError: null,
        },
      };
    }

    case 'SET_PAGINATION_LOADING':
      return {
        ...state,
        consultationsPagination: {
          ...state.consultationsPagination,
          isLoading: action.payload,
          // Uma nova tentativa (loading=true) limpa o erro anterior
          // imediatamente — não espera o sucesso para deixar de mostrar
          // uma falha que já está sendo re-tentada.
          ...(action.payload ? { error: null } : {}),
        },
      };

    case 'SET_PAGINATION_LOADING_MORE':
      return {
        ...state,
        consultationsPagination: {
          ...state.consultationsPagination,
          isLoadingMore: action.payload,
          ...(action.payload ? { loadMoreError: null } : {}),
        },
      };

    case 'SET_PAGINATION_ERROR':
      return {
        ...state,
        consultationsPagination: { ...state.consultationsPagination, isLoading: false, error: action.payload },
      };

    case 'SET_PAGINATION_LOAD_MORE_ERROR':
      return {
        ...state,
        consultationsPagination: { ...state.consultationsPagination, isLoadingMore: false, loadMoreError: action.payload },
      };

    case 'RESET_PAGINATION':
      return { ...state, consultationsPagination: INITIAL_PAGINATION };

    case 'RESTORE_PENDING_CONSULTATIONS': {
      // Restaura consultas pendentes de uma sessão anterior da MESMA aba
      // (reload/crash) — nunca duplica se, por algum motivo, o id já
      // estiver presente (ex.: efeito de restauração disparado mais de
      // uma vez).
      const idsExistentes = new Set(state.consultations.map((c) => c.id));
      const novas = action.payload.filter((c) => !idsExistentes.has(c.id));
      if (novas.length === 0) return state;
      return { ...state, consultations: [...novas, ...state.consultations] };
    }

    case 'RESET_SESSION_DATA':
      // Troca de usuário no mesmo navegador (logout seguido de login com
      // outra conta) NUNCA deve deixar consultas hidratadas do usuário
      // anterior visíveis para o próximo — risco de vazamento de dado
      // clínico entre contas numa estação compartilhada. Inclui o estado
      // de carregamento de detalhe (RM-43) pelo mesmo motivo — e porque
      // chaveado por backend_id, que não tem significado nenhum para o
      // próximo usuário. RM-44: também reinicia a paginação — total e
      // páginas de uma conta NUNCA sobrevivem para a próxima.
      return {
        ...state,
        consultations: [],
        activeConsultation: null,
        consultationDetailStatus: {},
        consultationsPagination: INITIAL_PAGINATION,
      };

    case 'SET_CONSULTATION_DETAIL_STATUS':
      return {
        ...state,
        consultationDetailStatus: {
          ...state.consultationDetailStatus,
          [action.payload.backendId]: action.payload.status,
        },
      };

    case 'HYDRATE_CONSULTATION_DETAIL': {
      const { backendId, prescricoesRecuperadas, riscosRecuperados } = action.payload;
      // Localiza a consulta pelo backend_id real — nunca pelo `id` local,
      // que para uma consulta criada nesta sessão e já sincronizada é
      // diferente do id gerado pelo servidor.
      const corresponde = (c: Consultation) =>
        c.id === backendId || c.sync?.consulta?.backend_id === backendId;
      const aplicar = (c: Consultation): Consultation =>
        corresponde(c) ? { ...c, prescricoesRecuperadas, riscosRecuperados } : c;
      return {
        ...state,
        activeConsultation:
          state.activeConsultation && corresponde(state.activeConsultation)
            ? aplicar(state.activeConsultation)
            : state.activeConsultation,
        consultations: state.consultations.map(aplicar),
      };
    }

    default:
      return state;
  }
}

// ============================================================
// RM-43 — Carregamento sob demanda do detalhe de consulta (testável)
//
// Extraído do callback do `AppProvider` em uma função pura injetável
// (mesmo padrão de outras partes auditadas do projeto — ex.:
// `checarBaseCanonica(entities = drugRepository.getAll())`) para poder
// testar guards de deduplicação, mapeamento e tratamento de erro sem
// precisar renderizar um componente React (não há testing-library neste
// projeto).
// ============================================================

interface CarregarDetalheDeps {
  consultas: Consultation[];
  activeConsultation: Consultation | null;
  detailStatus: Record<string, ConsultationDetailStatus>;
  buscar: (backendId: string) => Promise<{
    prescricoes: {
      id: string;
      status: string;
      medicamentos: MedicamentoPrescrito[];
      orientacoes: string | null;
      validade_dias: number;
      diagnostico_id: string | null;
      criado_em: string;
    }[];
    /** RM-53 (RM41-023): risk scores reais persistidos para esta consulta. */
    risco_scores: {
      id: string;
      risco_global: string;
      score_global: number;
      alerta_vermelho: boolean;
      recomendacoes: string[];
      criado_em: string;
    }[];
  } | null>;
  dispatch: (action: Action) => void;
  /**
   * RM-46-03: mesma defesa já aplicada à paginação (RM-44) e à
   * sincronização (RM-45) — `false` quando a sessão/usuário mudou entre
   * o início da busca e a resposta chegar; nenhum dispatch é aplicado
   * nesse caso. Opcional (default sempre válido) para não quebrar
   * chamadores existentes que não têm noção de sessão.
   */
  sessaoValida?: () => boolean;
}

/**
 * Executa (ou recusa executar, por dedup) o carregamento do detalhe de
 * UMA consulta. Retorna `'skipped'` quando nada foi feito (sem
 * backend_id, ou já loading/loaded), `'loaded'` em sucesso, `'failed'`
 * em erro — o chamador decide o que fazer com cada resultado (ex.:
 * mostrar um toast só em `'failed'`).
 */
export async function executarCarregamentoDetalhe(
  consultaId: string,
  deps: CarregarDetalheDeps,
): Promise<'skipped' | 'loaded' | 'failed'> {
  const sessaoValida = deps.sessaoValida ?? (() => true);
  const c = deps.consultas.find((x) => x.id === consultaId) ?? deps.activeConsultation;
  const backendId = c?.sync?.consulta?.backend_id;
  // Sem backend_id, a consulta ainda não foi confirmada pelo servidor
  // (local/syncing/failed) — não há detalhe nenhum para buscar ainda;
  // nunca dispara uma requisição para um id que o backend não reconhece.
  if (!backendId) return 'skipped';

  // Deduplicação: uma busca já em andamento para este backendId nunca
  // dispara uma segunda idêntica; um detalhe já carregado com sucesso é
  // reutilizado (não há necessidade de invalidação nesta versão — o
  // histórico clínico já persistido não muda depois de emitido). Uma
  // tentativa anterior `failed` NÃO bloqueia — permite retry explícito.
  const statusAtual = deps.detailStatus[backendId];
  if (statusAtual === 'loading' || statusAtual === 'loaded') return 'skipped';

  deps.dispatch({ type: 'SET_CONSULTATION_DETAIL_STATUS', payload: { backendId, status: 'loading' } });

  try {
    const detalhe = await deps.buscar(backendId);
    if (!sessaoValida()) return 'skipped';
    // `null` só ocorre em modo demo — nunca deveria alcançar este ponto
    // (defesa em profundidade; não fabrica um detalhe vazio mesmo assim).
    if (!detalhe) {
      deps.dispatch({ type: 'SET_CONSULTATION_DETAIL_STATUS', payload: { backendId, status: 'failed' } });
      return 'failed';
    }
    const prescricoesRecuperadas: PrescricaoRecuperada[] = detalhe.prescricoes.map((p) => ({
      id: p.id,
      status: p.status,
      medicamentos: p.medicamentos,
      orientacoes: p.orientacoes ?? undefined,
      validade_dias: p.validade_dias,
      diagnostico_id: p.diagnostico_id ?? undefined,
      criado_em: p.criado_em,
    }));
    const riscosRecuperados: RiscoRecuperado[] = detalhe.risco_scores.map((r) => ({
      id: r.id,
      risco_global: r.risco_global,
      score_global: r.score_global,
      alerta_vermelho: r.alerta_vermelho,
      recomendacoes: r.recomendacoes,
      criado_em: r.criado_em,
    }));
    deps.dispatch({ type: 'HYDRATE_CONSULTATION_DETAIL', payload: { backendId, prescricoesRecuperadas, riscosRecuperados } });
    deps.dispatch({ type: 'SET_CONSULTATION_DETAIL_STATUS', payload: { backendId, status: 'loaded' } });
    return 'loaded';
  } catch {
    if (!sessaoValida()) return 'skipped';
    // Erro de rede/ownership (404) nunca vira "sem prescrição" —
    // fica explicitamente `failed`, permitindo nova tentativa.
    deps.dispatch({ type: 'SET_CONSULTATION_DETAIL_STATUS', payload: { backendId, status: 'failed' } });
    return 'failed';
  }
}

// ============================================================
// RM-44 — Paginação incremental (testável sem renderizar componente)
//
// Mesmo padrão de `executarCarregamentoDetalhe`: a orquestração
// (guards de concorrência, mapeamento, metadados) vive em funções puras
// injetáveis; `sessaoValida()` é a defesa contra resposta atrasada de
// uma sessão/usuário que não é mais o atual (ver `AppProvider` —
// `sessaoEpochRef`, incrementado a cada logout/troca de usuário real).
// ============================================================

/** Formato de `GET /api/consultas` — mesmo contrato usado por `mapBackendConsultaToConsultation`. */
export interface BackendListarConsultasResponse {
  total: number;
  pagina: number;
  limite: number;
  consultas: BackendConsultaRow[];
}

interface CarregarPaginaDeps {
  pagination: ConsultationsPaginationState;
  listar: (pagina: number, limite: number) => Promise<BackendListarConsultasResponse | null>;
  dispatch: (action: Action) => void;
  /** `false` quando a resposta chega depois de a sessão/usuário atual ter mudado — descarta sem aplicar. */
  sessaoValida: () => boolean;
}

/**
 * Carrega a PRIMEIRA página do histórico. Idempotente: uma chamada
 * enquanto `isLoading` já é `true` não dispara uma segunda requisição
 * (`'skipped'`). Nunca aplica a resposta se a sessão mudou entre o
 * início e o fim da chamada (`sessaoValida()` falso) — cobre tanto
 * logout quanto troca de usuário no mesmo navegador.
 */
export async function executarCarregamentoPaginaInicial(
  deps: CarregarPaginaDeps,
): Promise<'skipped' | 'loaded' | 'failed'> {
  if (deps.pagination.isLoading) return 'skipped';

  deps.dispatch({ type: 'SET_PAGINATION_LOADING', payload: true });

  try {
    const resposta = await deps.listar(1, deps.pagination.pageSize);
    if (!deps.sessaoValida()) return 'skipped';
    if (!resposta) {
      deps.dispatch({ type: 'SET_PAGINATION_ERROR', payload: 'Não foi possível carregar o histórico de consultas.' });
      return 'failed';
    }
    const hidratadas = (resposta.consultas ?? []).map(mapBackendConsultaToConsultation);
    deps.dispatch({
      type: 'HYDRATE_CONSULTATIONS_PAGE',
      payload: { hidratadas, pagina: resposta.pagina, limite: resposta.limite, total: resposta.total },
    });
    return 'loaded';
  } catch {
    if (!deps.sessaoValida()) return 'skipped';
    deps.dispatch({ type: 'SET_PAGINATION_ERROR', payload: 'Não foi possível carregar o histórico de consultas.' });
    return 'failed';
  }
}

/**
 * Carrega a PRÓXIMA página ("carregar mais"). Nunca dispara se já há um
 * carregamento em andamento (inicial OU "mais" — `isLoading`/
 * `isLoadingMore`), nem se `hasNextPage` já é `false` (fim explícito da
 * lista — nunca busca além do que o backend confirmou existir).
 */
export async function executarCarregarMaisConsultas(
  deps: CarregarPaginaDeps,
): Promise<'skipped' | 'loaded' | 'failed'> {
  if (deps.pagination.isLoading || deps.pagination.isLoadingMore) return 'skipped';
  if (!deps.pagination.hasNextPage) return 'skipped';

  const proximaPagina = deps.pagination.currentPage + 1;
  deps.dispatch({ type: 'SET_PAGINATION_LOADING_MORE', payload: true });

  try {
    const resposta = await deps.listar(proximaPagina, deps.pagination.pageSize);
    if (!deps.sessaoValida()) return 'skipped';
    if (!resposta) {
      deps.dispatch({ type: 'SET_PAGINATION_LOAD_MORE_ERROR', payload: 'Não foi possível carregar mais consultas.' });
      return 'failed';
    }
    const hidratadas = (resposta.consultas ?? []).map(mapBackendConsultaToConsultation);
    deps.dispatch({
      type: 'HYDRATE_CONSULTATIONS_PAGE',
      payload: { hidratadas, pagina: resposta.pagina, limite: resposta.limite, total: resposta.total },
    });
    return 'loaded';
  } catch {
    if (!deps.sessaoValida()) return 'skipped';
    deps.dispatch({ type: 'SET_PAGINATION_LOAD_MORE_ERROR', payload: 'Não foi possível carregar mais consultas.' });
    return 'failed';
  }
}

// ============================================================
// RM-45 — Sincronização resiliente de consulta/prescrição (testável)
//
// Achados da auditoria (ver docs/RM-45-SYNC-RESILIENCE-REPORT.md para o
// detalhamento completo):
//
//   RISCO A (duplicação): nada impedia duas chamadas concorrentes de
//   `sincronizarConsulta` para a MESMA consulta (duplo clique em "tentar
//   novamente", ou um retry manual sobrepondo o auto-sync). Se ambas
//   lessem o estado ANTES de qualquer dispatch de idempotency_key
//   aterrissar, cada uma gerava uma chave DIFERENTE — dois POSTs reais
//   com chaves diferentes não são deduplicados pelo backend (a
//   deduplicação é por igualdade de chave). Corrigido com um guard de
//   "em andamento" (`podeSincronizar`) verificado ANTES de qualquer
//   chamada de rede.
//
//   RISCO B (vazamento entre usuários): nada impedia que uma
//   sincronização iniciada pelo usuário A completasse (ou disparasse a
//   chamada de prescrição) DEPOIS de A fazer logout e B fazer login no
//   mesmo navegador — o token lido em tempo de chamada já seria o de B,
//   potencialmente gravando o dado clínico de A na conta de B. Corrigido
//   com o mesmo mecanismo de "sessão válida" já usado em RM-44 para
//   paginação (`sessaoValida()`), verificado antes de CADA dispatch e
//   antes de iniciar a chamada de prescrição (a chamada de consulta já
//   em voo não pode ser cancelada, mas seu resultado nunca é aplicado a
//   uma sessão que não é mais a atual, e nenhuma chamada SUBSEQUENTE é
//   iniciada sob a sessão errada).
//
//   RISCO C (re-sincronizar o que já sincronizou): sem um guard de
//   status, um clique perdido em "tentar novamente" numa consulta já
//   `synced` reenviaria o POST (inofensivo graças à idempotency_key,
//   mas desperdiça uma chamada de rede e pisca o estado para "syncing"
//   sem necessidade). Corrigido — `podeSincronizar` recusa quando
//   `status === 'synced'`.
// ============================================================

/** Decide se uma tentativa de sincronização deve prosseguir — nunca dispara uma segunda chamada concorrente nem re-sincroniza o que já está confirmado. */
export function podeSincronizar(c: Consultation, emAndamento: ReadonlySet<string>): boolean {
  if (emAndamento.has(c.id)) return false;
  const status = c.sync?.consulta?.status;
  if (status === 'synced' || status === 'syncing') return false;
  return true;
}

export interface SincronizarConsultaDeps {
  criar: (dados: { anamnese?: object; idempotency_key: string }) => Promise<{ id?: string }>;
  /** RM-53 (RM41-023): persiste o diagnóstico estruturado — chamado depois que a consulta confirma, antes da prescrição (para poder vincular `diagnostico_id`). */
  criarDiagnostico: (dados: {
    consulta_id: string;
    cid: string;
    descricao: string;
    confianca?: number;
    idempotency_key: string;
  }) => Promise<{ id?: string }>;
  /** RM-53 (RM41-023): persiste o risco calculado — independente do diagnóstico (schema não exige vínculo). */
  salvarRisco: (
    consulta_id: string,
    score: object,
    idempotency_key: string,
  ) => Promise<{ id?: string }>;
  criarPrescricao: (dados: {
    consulta_id: string;
    diagnostico_id?: string;
    medicamentos: MedicamentoPrescrito[];
    orientacoes?: string;
    idempotency_key: string;
  }) => Promise<{ id?: string }>;
  dispatch: (action: Action) => void;
  /** `false` quando a sessão/usuário mudou entre o início da chamada e a resposta chegar — nunca aplica dado nem inicia nova chamada de rede nesse caso. */
  sessaoValida: () => boolean;
  isAuthenticated: () => boolean;
}

export interface ResultadoSincronizacaoConsulta {
  /**
   * Reflete o que REALMENTE aconteceu na rede — nunca gateado pela
   * validade da sessão local (uma consulta que o backend confirmou
   * continua sendo um fato real mesmo que, nesse meio-tempo, a sessão
   * local tenha mudado). O que a validade da sessão gateia é se o
   * ESTADO LOCAL é atualizado (cada `dispatch` abaixo checa
   * `sessaoValida()` individualmente) e se uma chamada SUBSEQUENTE
   * (prescrição) chega a ser sequer iniciada.
   */
  consulta: 'local' | 'synced' | 'failed';
  /** RM-53 (RM41-023): `'nao_tentado'` quando não há `diagnostico_estruturado` para sincronizar (nunca fabricado). */
  diagnostico?: 'synced' | 'failed' | 'nao_tentado';
  /** RM-53 (RM41-023): `'nao_tentado'` quando não há `risco_calculado` para sincronizar (nunca fabricado). */
  risco?: 'synced' | 'failed' | 'nao_tentado';
  prescricao?: 'synced' | 'failed' | 'sem_dose_estruturada' | 'nao_tentada';
}

/**
 * Executa uma tentativa de sincronização de UMA consulta (e sua
 * prescrição, se houver) — reutiliza a MESMA idempotency_key em toda
 * tentativa da mesma operação (nunca gera uma nova a cada retry), e
 * NUNCA reporta sucesso sem confirmação real do backend. O chamador
 * (`AppProvider`) é responsável pelo guard de concorrência
 * (`podeSincronizar`) e por exibir toasts com base no resultado — esta
 * função não depende de UI para ser testável.
 */
export async function executarSincronizacaoConsulta(
  c: Consultation,
  deps: SincronizarConsultaDeps,
): Promise<ResultadoSincronizacaoConsulta> {
  const ehConsultaDemo = isDemoConsultationId(c.id);
  if (IS_DEMO_MODE || ehConsultaDemo || !deps.isAuthenticated()) {
    deps.dispatch({
      type: 'SET_SYNC_STATE',
      payload: { consultaId: c.id, resource: 'consulta', state: { status: 'local', attempts: 0 } },
    });
    return { consulta: 'local' };
  }

  const consultaKey = c.sync?.consulta?.idempotency_key ?? newIdempotencyKey();

  const consultaResultado = await syncResource({
    attemptFn: () => deps.criar({ anamnese: c.anamnese ?? undefined, idempotency_key: consultaKey }),
    onStatusChange: (s) => {
      if (!deps.sessaoValida()) return;
      deps.dispatch({
        type: 'SET_SYNC_STATE',
        payload: { consultaId: c.id, resource: 'consulta', state: { ...s, idempotency_key: consultaKey } },
      });
    },
  });

  if (!consultaResultado.ok) {
    if (c.prescricao && deps.sessaoValida()) {
      deps.dispatch({
        type: 'SET_SYNC_STATE',
        payload: {
          consultaId: c.id,
          resource: 'prescricao',
          state: { status: 'failed', attempts: 0, error: 'Consulta não sincronizada' },
        },
      });
    }
    return { consulta: 'failed' };
  }

  const backendConsultaId = consultaResultado.data?.id;

  // `backend_id` é a chave de deduplicação usada pela hidratação
  // (RM-42/44) — gravado exatamente uma vez por consulta, no momento em
  // que o backend confirma a criação (nunca reescrito por uma tentativa
  // concorrente graças a `podeSincronizar`/ao guard de "em andamento").
  // O dispatch só é aplicado se a sessão ainda é a mesma — o FATO de a
  // consulta ter sincronizado (valor de retorno da função) é verdadeiro
  // independentemente disso, mas o estado local nunca é atualizado em
  // nome de uma sessão que já não é mais a atual.
  if (backendConsultaId && deps.sessaoValida()) {
    deps.dispatch({
      type: 'SET_SYNC_STATE',
      payload: {
        consultaId: c.id,
        resource: 'consulta',
        state: { status: 'synced', attempts: consultaResultado.state.attempts, backend_id: backendConsultaId, idempotency_key: consultaKey },
      },
    });
  }

  if (!backendConsultaId) {
    return { consulta: 'synced' };
  }

  // RM-53 (RM41-023): diagnóstico e risco são independentes entre si e da
  // prescrição — cada um só é sincronizado se o dado correspondente
  // existir (nunca fabricado), e a falha de um não bloqueia os outros.
  let backendDiagnosticoId: string | undefined;
  let diagnosticoStatus: ResultadoSincronizacaoConsulta['diagnostico'] = 'nao_tentado';

  if (c.diagnostico_estruturado && deps.sessaoValida()) {
    const diagnosticoKey = c.sync?.diagnostico?.idempotency_key ?? newIdempotencyKey();
    const diagResultado = await syncResource({
      attemptFn: () =>
        deps.criarDiagnostico({
          consulta_id: backendConsultaId,
          cid: c.diagnostico_estruturado!.cid,
          descricao: c.diagnostico_estruturado!.descricao,
          confianca: c.diagnostico_estruturado!.confianca,
          idempotency_key: diagnosticoKey,
        }),
      onStatusChange: (s) => {
        if (!deps.sessaoValida()) return;
        deps.dispatch({
          type: 'SET_SYNC_STATE',
          payload: { consultaId: c.id, resource: 'diagnostico', state: { ...s, idempotency_key: diagnosticoKey } },
        });
      },
    });
    backendDiagnosticoId = diagResultado.data?.id;
    diagnosticoStatus = diagResultado.ok ? 'synced' : 'failed';
    if (diagResultado.ok && backendDiagnosticoId && deps.sessaoValida()) {
      deps.dispatch({
        type: 'SET_SYNC_STATE',
        payload: {
          consultaId: c.id,
          resource: 'diagnostico',
          state: { status: 'synced', attempts: diagResultado.state.attempts, backend_id: backendDiagnosticoId, idempotency_key: diagnosticoKey },
        },
      });
    }
  }

  let riscoStatus: ResultadoSincronizacaoConsulta['risco'] = 'nao_tentado';
  if (c.risco_calculado && deps.sessaoValida()) {
    const riscoKey = c.sync?.risco?.idempotency_key ?? newIdempotencyKey();
    const riscoResultado = await syncResource({
      attemptFn: () => deps.salvarRisco(backendConsultaId, c.risco_calculado!, riscoKey),
      onStatusChange: (s) => {
        if (!deps.sessaoValida()) return;
        deps.dispatch({
          type: 'SET_SYNC_STATE',
          payload: { consultaId: c.id, resource: 'risco', state: { ...s, idempotency_key: riscoKey } },
        });
      },
    });
    riscoStatus = riscoResultado.ok ? 'synced' : 'failed';
    if (riscoResultado.ok && riscoResultado.data?.id && deps.sessaoValida()) {
      deps.dispatch({
        type: 'SET_SYNC_STATE',
        payload: {
          consultaId: c.id,
          resource: 'risco',
          state: { status: 'synced', attempts: riscoResultado.state.attempts, backend_id: riscoResultado.data.id, idempotency_key: riscoKey },
        },
      });
    }
  }

  if (!c.prescricao) {
    return { consulta: 'synced', diagnostico: diagnosticoStatus, risco: riscoStatus };
  }

  const itens = c.prescricao.itens ?? [];
  const itemSemDoseEstruturada = itens.find((i) => !i.dose_estruturada);
  if (itemSemDoseEstruturada) {
    if (deps.sessaoValida()) {
      deps.dispatch({
        type: 'SET_SYNC_STATE',
        payload: {
          consultaId: c.id,
          resource: 'prescricao',
          state: {
            status: 'failed',
            attempts: 0,
            error: `Medicamento "${itemSemDoseEstruturada.medicamento || '(sem nome)'}" está sem dose estruturada (valor/unidade/frequência) — confirme a dose manualmente antes de sincronizar.`,
          },
        },
      });
    }
    return { consulta: 'synced', diagnostico: diagnosticoStatus, risco: riscoStatus, prescricao: 'sem_dose_estruturada' };
  }

  // A consulta já foi confirmada com o usuário CORRETO (checagem acima);
  // mas se a sessão mudou nesse meio-tempo, a prescrição NUNCA é enviada
  // sob a sessão errada — nem sequer a chamada de rede é iniciada.
  if (!deps.sessaoValida()) return { consulta: 'synced', diagnostico: diagnosticoStatus, risco: riscoStatus, prescricao: 'nao_tentada' };

  const medicamentos: MedicamentoPrescrito[] = itens.map((i) => ({
    molecula: i.medicamento,
    dose: i.dose_estruturada!,
    duracao: i.duracao,
    observacoes: i.instrucoes_especiais,
  }));

  const prescricaoKey = c.sync?.prescricao?.idempotency_key ?? newIdempotencyKey();
  const prescricaoResultado = await syncResource({
    attemptFn: () =>
      deps.criarPrescricao({
        consulta_id: backendConsultaId,
        diagnostico_id: backendDiagnosticoId,
        medicamentos,
        orientacoes: c.prescricao!.orientacoes_gerais,
        idempotency_key: prescricaoKey,
      }),
    onStatusChange: (s) => {
      if (!deps.sessaoValida()) return;
      deps.dispatch({
        type: 'SET_SYNC_STATE',
        payload: { consultaId: c.id, resource: 'prescricao', state: { ...s, idempotency_key: prescricaoKey } },
      });
    },
  });

  if (!deps.sessaoValida()) return { consulta: 'synced', diagnostico: diagnosticoStatus, risco: riscoStatus, prescricao: 'nao_tentada' };

  // RM-50 (RM41-033): `onStatusChange` acima só grava
  // status/attempts/idempotency_key — o `id` real atribuído pelo backend
  // (`prescricaoResultado.data?.id`) nunca era persistido em
  // `sync.prescricao.backend_id`, ao contrário do que já acontecia para
  // `sync.consulta.backend_id` (linhas 829-838 acima). Sem isso, nada
  // consumidor deste estado (ex.: navegação para o detalhe da prescrição
  // recém-criada) conseguia recuperar o id real do backend a partir do
  // estado local — mesmo com a prescrição já sincronizada com sucesso.
  const backendPrescricaoId = prescricaoResultado.data?.id;
  if (prescricaoResultado.ok && backendPrescricaoId && deps.sessaoValida()) {
    deps.dispatch({
      type: 'SET_SYNC_STATE',
      payload: {
        consultaId: c.id,
        resource: 'prescricao',
        state: {
          status: 'synced',
          attempts: prescricaoResultado.state.attempts,
          backend_id: backendPrescricaoId,
          idempotency_key: prescricaoKey,
        },
      },
    });
  }

  return {
    consulta: 'synced',
    diagnostico: diagnosticoStatus,
    risco: riscoStatus,
    prescricao: prescricaoResultado.ok ? 'synced' : 'failed',
  };
}

// ============================================================
// RM-45 — Persistência mínima de consultas pendentes (recuperação após
// reload/crash da aba)
//
// GAP CORRIGIDO: `state.consultations` vivia SOMENTE em memória React —
// uma consulta `local`/`syncing`/`failed` (nunca confirmada pelo
// backend) desaparecia por completo ao recarregar a página, fechar a
// aba por engano, ou uma queda de conexão que force o navegador a
// descartar o estado. Isso violava diretamente "uma falha de rede não
// pode apagar a consulta local".
//
// Escopo deliberadamente mínimo (sem service worker/PWA): persiste só o
// SUBCONJUNTO de consultas ainda não confirmadas, sob uma chave com o
// MESMO prefixo (`prescreve_ai_`) que `clearTokens()` (api-client.ts,
// FE-03) já varre no logout — a política de nunca deixar dado clínico
// sobreviver a um logout numa estação compartilhada continua valendo
// SEM nenhuma linha de código adicional: o mesmo mecanismo que já limpa
// os tokens limpa esta chave também.
// ============================================================

const KEY_CONSULTAS_PENDENTES = 'prescreve_ai_consultas_pendentes';

export function persistirConsultasPendentes(consultations: Consultation[]): void {
  if (typeof window === 'undefined') return;
  const pendentes = consultations.filter((c) => {
    const status = c.sync?.consulta?.status;
    return status && status !== 'synced';
  });
  try {
    if (pendentes.length === 0) {
      localStorage.removeItem(KEY_CONSULTAS_PENDENTES);
    } else {
      localStorage.setItem(KEY_CONSULTAS_PENDENTES, JSON.stringify(pendentes));
    }
  } catch {
    // localStorage indisponível (modo privado, quota excedida) — a
    // perda de recuperação-pós-reload é aceitável; nunca trava a UI.
  }
}

/**
 * Restaura consultas pendentes de uma sessão anterior da MESMA aba
 * (reload/crash, não logout — `clearTokens()` já limpa esta chave no
 * logout). Uma consulta restaurada com status `syncing` é normalizada
 * para `failed`: o reload interrompeu a tentativa em voo — não há
 * requisição de fato em andamento mais nenhuma, então mostrar um
 * spinner permanente seria uma mentira; `failed` com retry explícito é
 * honesto sobre o que realmente se sabe.
 */
export function restaurarConsultasPendentes(): Consultation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY_CONSULTAS_PENDENTES);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as Consultation[]).map((c) => {
      if (c.sync?.consulta?.status !== 'syncing') return c;
      return {
        ...c,
        sync: {
          ...c.sync,
          consulta: { ...c.sync.consulta, status: 'failed', error: 'Sincronização interrompida (recarregamento da página) — tentando novamente' },
        },
      };
    });
  } catch {
    return [];
  }
}

export interface RegisterData {
  email: string; senha: string; perfil: string; crm?: string; especialidade?: string; uf?: string;
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  auth: {
    currentUser: CurrentUser | null;
    isAuthenticated: boolean;
    /** Verdadeiro apenas quando chamadas ao backend real acontecem (nunca em modo demo). */
    backendMode: boolean;
    /** Verdadeiro apenas quando o modo demo foi explicitamente ativado (NEXT_PUBLIC_DEMO_MODE=true) e o ambiente não é produção. */
    demoMode: boolean;
    appMode: typeof APP_MODE;
    login: (email: string, senha: string) => Promise<void>;
    register: (dados: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
  };
  /**
   * Persiste uma consulta (e diagnóstico/prescrição, quando presentes) no
   * backend. NUNCA reporta sucesso sem confirmação real do servidor —
   * consulte `consulta.sync` para o estado de persistência de cada
   * recurso. Falhas são retentadas com backoff automaticamente; se todas
   * as tentativas se esgotarem, o estado fica `failed` e um toast de erro
   * é exibido — nunca um catch silencioso.
   */
  sincronizarConsulta: (c: Consultation) => Promise<void>;
  /** Retenta manualmente a sincronização de uma consulta que falhou (reconciliação). */
  retrySync: (consultaId: string) => Promise<void>;
  /**
   * RM-43: carrega sob demanda o detalhe completo (incluindo a
   * prescrição REAL) de uma consulta já sincronizada com o backend.
   * Idempotente/deduplicado: se já `loading`, não dispara outra
   * requisição; se já `loaded`, reutiliza o estado (não refaz a busca);
   * se `failed`, permite nova tentativa explícita. Não faz nada (sem
   * requisição) para uma consulta que ainda não tem `backend_id` — não
   * há detalhe nenhum para buscar ainda. Consulte
   * `state.consultationDetailStatus[backendId]` para o estado atual.
   */
  carregarDetalheConsulta: (consultaId: string) => Promise<void>;
  /**
   * RM-44: carrega a próxima página do histórico ("carregar mais").
   * Não faz nada se já há um carregamento em andamento (inicial ou
   * "mais") ou se `state.consultationsPagination.hasNextPage` já é
   * `false` — consulte `state.consultationsPagination` para o estado
   * completo (página atual, total, se há mais, erro por estágio).
   */
  carregarMaisConsultas: () => Promise<void>;
  /**
   * RM-44: (re)carrega a PRIMEIRA página — chamada automaticamente ao
   * autenticar; exposta também para permitir retry manual explícito
   * após uma falha na carga inicial (`state.consultationsPagination.error`).
   */
  carregarPrimeiraPagina: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Evita re-disparar a sincronização automática a cada atualização de
  // status de sync (o efeito abaixo reage a mudanças em activeConsultation,
  // e SET_SYNC_STATE também muda essa referência) — sem isso, cada
  // dispatch de progresso de sync reacionaria o próprio efeito.
  const autoSyncDisparado = useRef<Set<string>>(new Set());
  // Rastreia para qual usuário a lista de consultas já foi hidratada a
  // partir do backend, para nunca refazer a busca a cada render (só
  // quando o usuário autenticado efetivamente muda — login/logout/troca
  // de conta).
  const hidratadoParaUsuario = useRef<string | null>(null);
  // RM-44: incrementado a cada logout/troca real de usuário — capturado
  // no início de toda chamada de paginação; se o valor mudar antes da
  // resposta chegar, a resposta é descartada (nunca aplicada a uma
  // sessão que não é mais a atual). Cobre tanto "logout limpo" quanto
  // "usuário B loga antes da resposta pendente do usuário A chegar".
  const sessaoEpochRef = useRef(0);
  // RM-45: consultas com uma sincronização EM ANDAMENTO neste exato
  // momento — nunca dispara uma segunda chamada concorrente para a
  // mesma consulta (duplo clique em "tentar novamente", retry manual
  // sobrepondo o auto-sync, etc.).
  const emSincronizacaoRef = useRef<Set<string>>(new Set());

  // Restaura a sessão a partir do token JWT armazenado (uma vez, no cliente).
  useEffect(() => {
    const user = getCurrentUser();
    if (user) dispatch({ type: 'SET_USER', payload: user });
  }, []);

  // RM-45: restaura consultas pendentes (local/syncing/failed) de uma
  // sessão anterior da MESMA aba — cobre reload/crash do navegador, que
  // antes apagava por completo qualquer consulta ainda não confirmada
  // pelo backend (violação direta de "uma falha não pode apagar a
  // consulta local"). Nunca roda em modo demo (nada a restaurar — dado
  // fictício não é persistido). `clearTokens()` (logout) já limpa a
  // mesma chave de localStorage, então a política de nunca deixar dado
  // clínico sobreviver a um logout continua intacta.
  useEffect(() => {
    if (IS_DEMO_MODE) return;
    const restauradas = restaurarConsultasPendentes();
    if (restauradas.length > 0) dispatch({ type: 'RESTORE_PENDING_CONSULTATIONS', payload: restauradas });
  }, []);

  // RM-45: persiste o subconjunto pendente sempre que `state.consultations`
  // muda — mantém a recuperação após reload atualizada em tempo real,
  // sem exigir uma ação explícita do médico.
  useEffect(() => {
    if (IS_DEMO_MODE) return;
    persistirConsultasPendentes(state.consultations);
  }, [state.consultations]);

  // RM-44: carrega a PRIMEIRA página do histórico sob demanda/paginação
  // real (substitui a busca única de 50 registros do RM-42).
  const carregarPrimeiraPagina = useCallback(async () => {
    const epoch = sessaoEpochRef.current;
    await executarCarregamentoPaginaInicial({
      pagination: state.consultationsPagination,
      listar: (pagina, limite) => consultaApi.listar(pagina, limite) as Promise<BackendListarConsultasResponse>,
      dispatch,
      sessaoValida: () => sessaoEpochRef.current === epoch,
    });
  }, [state.consultationsPagination]);

  // RM-44: "carregar mais" — próxima página, apenas quando explicitamente
  // solicitado (nunca automático/eager).
  const carregarMaisConsultas = useCallback(async () => {
    const epoch = sessaoEpochRef.current;
    const resultado = await executarCarregarMaisConsultas({
      pagination: state.consultationsPagination,
      listar: (pagina, limite) => consultaApi.listar(pagina, limite) as Promise<BackendListarConsultasResponse>,
      dispatch,
      sessaoValida: () => sessaoEpochRef.current === epoch,
    });
    if (resultado === 'failed') {
      toast.error('Não foi possível carregar mais consultas. Tente novamente.', { duration: 5000 });
    }
  }, [state.consultationsPagination]);

  // RM-42/RM-44: hidrata `state.consultations` a partir do backend real
  // ao autenticar (login explícito OU sessão restaurada de um token
  // existente ao montar) — sem isso, `/historico`, `/prescricoes` e o
  // dashboard só mostravam consultas criadas NA SESSÃO ATUAL do
  // navegador, mesmo que o médico tivesse um histórico real já
  // persistido no backend. Nunca roda em modo demo (dado fictício
  // permanece isolado) nem sem um usuário real autenticado.
  useEffect(() => {
    const uid = state.currentUser?.id;
    if (!uid || IS_DEMO_MODE || state.currentUser?.demo || !useRealBackend) return;
    if (hidratadoParaUsuario.current === uid) return;
    hidratadoParaUsuario.current = uid;
    // Nova sessão real detectada — invalida qualquer requisição de
    // paginação ainda em voo de uma sessão anterior (ex.: usuário trocou
    // de conta rápido o bastante para uma resposta antiga chegar depois).
    sessaoEpochRef.current += 1;
    void carregarPrimeiraPagina();
  }, [state.currentUser, carregarPrimeiraPagina]);

  const login = useCallback(async (email: string, senha: string) => {
    await authApi.login(email, senha);
    dispatch({ type: 'SET_USER', payload: getCurrentUser() });
  }, []);

  const register = useCallback(async (dados: RegisterData) => {
    await authApi.register(dados);
    dispatch({ type: 'SET_USER', payload: getCurrentUser() });
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    // Impede que consultas hidratadas do usuário que está saindo
    // permaneçam visíveis para o próximo login nesta mesma aba/navegador
    // (ver RESET_SESSION_DATA no reducer). Invalida também qualquer
    // requisição de paginação/detalhe ainda em voo desta sessão.
    hidratadoParaUsuario.current = null;
    sessaoEpochRef.current += 1;
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'RESET_SESSION_DATA' });
  }, []);

  // RM-45: guard de concorrência (nunca duas chamadas simultâneas para a
  // mesma consulta) + guard de sessão (nunca aplica resultado/dispara
  // chamada subsequente sob uma sessão que não é mais a atual) em torno
  // da função pura `executarSincronizacaoConsulta` — ver o comentário
  // extenso acima dela para o detalhamento dos 3 riscos corrigidos.
  const sincronizarConsulta = useCallback(async (c: Consultation) => {
    if (!podeSincronizar(c, emSincronizacaoRef.current)) return;
    emSincronizacaoRef.current.add(c.id);
    const epoch = sessaoEpochRef.current;

    try {
      const resultado = await executarSincronizacaoConsulta(c, {
        criar: (dados) => consultaApi.criar(dados) as Promise<{ id?: string }>,
        criarDiagnostico: (dados) => consultaApi.criarDiagnostico(dados) as Promise<{ id?: string }>,
        salvarRisco: (consulta_id, score, idempotency_key) =>
          consultaApi.salvarRisco(consulta_id, score, idempotency_key) as Promise<{ id?: string }>,
        criarPrescricao: (dados) => consultaApi.criarPrescricao(dados) as Promise<{ id?: string }>,
        dispatch,
        sessaoValida: () => sessaoEpochRef.current === epoch,
        isAuthenticated: () => authApi.isAuthenticated(),
      });

      if (resultado.consulta === 'failed') {
        toast.error('Falha ao sincronizar a consulta com o servidor. Os dados continuam salvos apenas neste dispositivo — tentaremos novamente.', { duration: 6000 });
      } else if (resultado.prescricao === 'sem_dose_estruturada') {
        toast.error('A prescrição tem ao menos um medicamento sem dose estruturada confirmada — a sincronização com o servidor foi bloqueada até a dose ser preenchida corretamente.', { duration: 8000 });
      } else if (resultado.prescricao === 'failed') {
        toast.error('A consulta foi salva, mas a prescrição NÃO foi confirmada pelo servidor. Não considere a prescrição como emitida até a sincronização ser concluída.', { duration: 8000 });
      } else if (resultado.diagnostico === 'failed') {
        toast.error('A consulta foi salva, mas o diagnóstico selecionado NÃO foi confirmado pelo servidor — tentaremos novamente.', { duration: 6000 });
      } else if (resultado.risco === 'failed') {
        toast.error('A consulta foi salva, mas o risco clínico calculado NÃO foi confirmado pelo servidor — tentaremos novamente.', { duration: 6000 });
      }
    } finally {
      emSincronizacaoRef.current.delete(c.id);
    }
  }, []);

  const retrySync = useCallback(async (consultaId: string) => {
    const c = state.consultations.find((x) => x.id === consultaId) ?? state.activeConsultation;
    if (!c || c.id !== consultaId) return;
    await sincronizarConsulta(c);
  }, [state.consultations, state.activeConsultation, sincronizarConsulta]);

  // RM-43: carregamento SOB DEMANDA do detalhe completo de uma consulta
  // já sincronizada — nunca buscado eagerly para todas as consultas
  // hidratadas de uma vez (evita N chamadas de rede quando a UI só
  // precisa do detalhe de UMA consulta que o médico abriu). A orquestração
  // (guards de dedup, mapeamento, dispatch) vive em `executarCarregamentoDetalhe`
  // — uma função pura testável sem precisar renderizar o Provider; este
  // callback só resolve as dependências reais (estado atual, API, dispatch).
  const carregarDetalheConsulta = useCallback(async (consultaId: string) => {
    const epoch = sessaoEpochRef.current;
    const resultado = await executarCarregamentoDetalhe(consultaId, {
      consultas: state.consultations,
      activeConsultation: state.activeConsultation,
      detailStatus: state.consultationDetailStatus,
      buscar: (backendId) => consultaApi.buscar(backendId),
      dispatch,
      sessaoValida: () => sessaoEpochRef.current === epoch,
    });
    if (resultado === 'failed') {
      toast.error('Não foi possível carregar os detalhes desta consulta. Tente novamente.', { duration: 5000 });
    }
  }, [state.consultations, state.activeConsultation, state.consultationDetailStatus]);

  // Persiste automaticamente ao concluir uma consulta (quando autenticado) —
  // dispara EXATAMENTE uma vez por consulta (guardado por ref), nunca a
  // cada atualização de status de sync.
  useEffect(() => {
    const c = state.activeConsultation;
    if (
      c &&
      c.status === 'concluida' &&
      authApi.isAuthenticated() &&
      !autoSyncDisparado.current.has(c.id)
    ) {
      autoSyncDisparado.current.add(c.id);
      void sincronizarConsulta(c);
    }
  }, [state.activeConsultation, sincronizarConsulta]);

  // RM-45: recuperação mínima ao voltar a ficar online — sem polling, sem
  // service worker: usa o evento nativo do navegador. Uma consulta
  // `failed` só existe por já ter esgotado suas tentativas automáticas
  // (`syncResource`); reconectar é exatamente o sinal de que vale a pena
  // tentar de novo sem esperar uma ação manual do médico. `sincronizarConsulta`
  // já tem seus próprios guards (concorrência/sessão/status), então
  // disparar para todas as pendentes aqui é seguro mesmo que o evento
  // dispare mais de uma vez.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const aoReconectar = () => {
      state.consultations
        .filter((c) => c.sync?.consulta?.status === 'failed' || c.sync?.prescricao?.status === 'failed')
        .forEach((c) => void sincronizarConsulta(c));
    };
    window.addEventListener('online', aoReconectar);
    return () => window.removeEventListener('online', aoReconectar);
  }, [state.consultations, sincronizarConsulta]);

  const auth = {
    currentUser: state.currentUser,
    isAuthenticated: !!state.currentUser,
    backendMode: useRealBackend,
    demoMode: IS_DEMO_MODE,
    appMode: APP_MODE,
    login, register, logout,
  };

  return (
    <AppContext.Provider value={{ state, dispatch, auth, sincronizarConsulta, retrySync, carregarDetalheConsulta, carregarMaisConsultas, carregarPrimeiraPagina }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
