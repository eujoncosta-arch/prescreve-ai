'use client';

import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { Consultation, Anamnesis, DiagnosticSupport, TherapeuticPlan, SafetyCheck, Prescription, AppSettings, PrognosisData, LaboratoryPreference } from './types';
import { MOCK_CONSULTATIONS } from './mock-data';

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
}

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
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
  | { type: 'SET_LAB_PREFERENCE'; payload: LaboratoryPreference };

const initialState: AppState = {
  consultations: MOCK_CONSULTATIONS,
  activeConsultation: null,
  settings: DEFAULT_SETTINGS,
  loading: false,
  error: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };

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

    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
