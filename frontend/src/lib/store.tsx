'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { Consultation, Anamnesis, DiagnosticSupport, TherapeuticPlan, SafetyCheck, Prescription, AppSettings, PrognosisData, LaboratoryPreference, ResourceSyncState } from './types';
import { MOCK_CONSULTATIONS } from './mock-data';
import { authApi, consultaApi, getCurrentUser, useRealBackend, type CurrentUser } from './api-client';
import { syncResource, newIdempotencyKey } from './sync-engine';
import { APP_MODE, IS_DEMO_MODE } from './app-mode';

const DEFAULT_SETTINGS: AppSettings = {
  medico: { nome: 'Dr. João Silva', crm: 'CRM-SP 123456', especialidade: 'Clínica Médica' },
  preferencia_laboratorio: 'sem_preferencia',
  tema: 'light',
  mostrar_evidencias_painel: true,
  alertas_interacao: true,
  idioma: 'pt-BR',
};

interface AppState {
  consultations: Consultation[];
  activeConsultation: Consultation | null;
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  currentUser: CurrentUser | null;
}

type SyncResource = 'consulta' | 'diagnostico' | 'prescricao';

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: CurrentUser | null }
  | { type: 'NEW_CONSULTATION'; payload: Consultation }
  | { type: 'SET_ACTIVE_CONSULTATION'; payload: Consultation | null }
  | { type: 'UPDATE_ANAMNESIS'; payload: Anamnesis }
  | { type: 'UPDATE_DIAGNOSTIC'; payload: DiagnosticSupport }
  | { type: 'SELECT_DIAGNOSIS'; payload: string }
  | { type: 'UPDATE_THERAPEUTIC'; payload: TherapeuticPlan }
  | { type: 'UPDATE_SAFETY'; payload: SafetyCheck }
  | { type: 'UPDATE_PRESCRIPTION'; payload: Prescription }
  | { type: 'UPDATE_PROGNOSTIC'; payload: PrognosisData }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_LAB_PREFERENCE'; payload: LaboratoryPreference }
  | {
      type: 'SET_SYNC_STATE';
      payload: { consultaId: string; resource: SyncResource; state: ResourceSyncState };
    };

const initialState: AppState = {
  consultations: MOCK_CONSULTATIONS,
  activeConsultation: null,
  settings: DEFAULT_SETTINGS,
  loading: false,
  error: null,
  currentUser: null,
};

function reducer(state: AppState, action: Action): AppState {
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

    default:
      return state;
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
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Evita re-disparar a sincronização automática a cada atualização de
  // status de sync (o efeito abaixo reage a mudanças em activeConsultation,
  // e SET_SYNC_STATE também muda essa referência) — sem isso, cada
  // dispatch de progresso de sync reacionaria o próprio efeito.
  const autoSyncDisparado = useRef<Set<string>>(new Set());

  // Restaura a sessão a partir do token JWT armazenado (uma vez, no cliente).
  useEffect(() => {
    const user = getCurrentUser();
    if (user) dispatch({ type: 'SET_USER', payload: user });
  }, []);

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
    dispatch({ type: 'SET_USER', payload: null });
  }, []);

  const sincronizarConsulta = useCallback(async (c: Consultation) => {
    // Sem backend configurado ou usuário anônimo: o dado existe SÓ
    // localmente — isso é reportado explicitamente como `status: 'local'`,
    // nunca como sucesso de sincronização (não há tentativa de rede).
    if (!useRealBackend || !authApi.isAuthenticated()) {
      dispatch({
        type: 'SET_SYNC_STATE',
        payload: { consultaId: c.id, resource: 'consulta', state: { status: 'local', attempts: 0 } },
      });
      return;
    }

    const consultaKey = c.sync?.consulta?.idempotency_key ?? newIdempotencyKey();

    const consultaResultado = await syncResource({
      attemptFn: () =>
        consultaApi.criar({ anamnese: c.anamnese ?? undefined, idempotency_key: consultaKey }) as Promise<{ id?: string }>,
      onStatusChange: (s) =>
        dispatch({
          type: 'SET_SYNC_STATE',
          payload: { consultaId: c.id, resource: 'consulta', state: { ...s, idempotency_key: consultaKey } },
        }),
    });

    if (!consultaResultado.ok) {
      toast.error('Falha ao sincronizar a consulta com o servidor. Os dados continuam salvos apenas neste dispositivo — tentaremos novamente.', { duration: 6000 });
      // Sem a consulta persistida no backend, diagnóstico/prescrição não
      // têm um consulta_id real para se vincular — marcados como falhos
      // pelo mesmo motivo, nunca "synced".
      if (c.prescricao) {
        dispatch({
          type: 'SET_SYNC_STATE',
          payload: {
            consultaId: c.id,
            resource: 'prescricao',
            state: { status: 'failed', attempts: 0, error: 'Consulta não sincronizada' },
          },
        });
      }
      return;
    }

    const backendConsultaId = consultaResultado.data?.id;

    if (c.prescricao && backendConsultaId) {
      const prescricaoKey = c.sync?.prescricao?.idempotency_key ?? newIdempotencyKey();
      const prescricaoResultado = await syncResource({
        attemptFn: () =>
          consultaApi.criarPrescricao({
            consulta_id: backendConsultaId,
            medicamentos: (c.prescricao!.itens ?? []) as unknown as object[],
            orientacoes: c.prescricao!.orientacoes_gerais,
            idempotency_key: prescricaoKey,
          }) as Promise<{ id?: string }>,
        onStatusChange: (s) =>
          dispatch({
            type: 'SET_SYNC_STATE',
            payload: { consultaId: c.id, resource: 'prescricao', state: { ...s, idempotency_key: prescricaoKey } },
          }),
      });

      if (!prescricaoResultado.ok) {
        toast.error('A consulta foi salva, mas a prescrição NÃO foi confirmada pelo servidor. Não considere a prescrição como emitida até a sincronização ser concluída.', { duration: 8000 });
      }
    }
  }, []);

  const retrySync = useCallback(async (consultaId: string) => {
    const c = state.consultations.find((x) => x.id === consultaId) ?? state.activeConsultation;
    if (!c || c.id !== consultaId) return;
    await sincronizarConsulta(c);
  }, [state.consultations, state.activeConsultation, sincronizarConsulta]);

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

  const auth = {
    currentUser: state.currentUser,
    isAuthenticated: !!state.currentUser,
    backendMode: useRealBackend,
    demoMode: IS_DEMO_MODE,
    appMode: APP_MODE,
    login, register, logout,
  };

  return (
    <AppContext.Provider value={{ state, dispatch, auth, sincronizarConsulta, retrySync }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
