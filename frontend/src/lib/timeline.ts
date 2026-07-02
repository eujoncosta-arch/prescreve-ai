// ============================================================
// PRESCREVE-AI — Clinical Timeline
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Tipos ───────────────────────────────────────────────────

export type TimelineEventType =
  | 'consulta'
  | 'exame'
  | 'diagnostico'
  | 'conduta'
  | 'prescricao'
  | 'retorno'
  | 'ajuste';

export type TimelineStatus = 'pendente' | 'concluido' | 'cancelado';

export interface TimelineEvent {
  id: string;
  tipo: TimelineEventType;
  titulo: string;
  descricao?: string;
  data: string;           // ISO date string
  paciente: string;
  medico?: string;
  status: TimelineStatus;
  dados?: Record<string, string | number | boolean | string[]>;
  tags?: string[];
  // Referência a evento anterior (para cadeia)
  evento_anterior_id?: string;
}

// ─── Metadados visuais ────────────────────────────────────────

export const TIPO_META: Record<TimelineEventType, {
  label: string;
  color: string;        // tailwind text/bg color stem
  bgCard: string;
  border: string;
  dotColor: string;
  lineColor: string;
  icon: string;         // emoji fallback / key for lucide
}> = {
  consulta:    { label: 'Consulta',    color: 'blue',   bgCard: 'bg-blue-50',    border: 'border-blue-200',    dotColor: 'bg-blue-500',    lineColor: 'bg-blue-200',    icon: 'stethoscope'  },
  exame:       { label: 'Exames',      color: 'purple', bgCard: 'bg-purple-50',  border: 'border-purple-200',  dotColor: 'bg-purple-500',  lineColor: 'bg-purple-200',  icon: 'flask'        },
  diagnostico: { label: 'Diagnóstico', color: 'indigo', bgCard: 'bg-indigo-50',  border: 'border-indigo-200',  dotColor: 'bg-indigo-500',  lineColor: 'bg-indigo-200',  icon: 'brain'        },
  conduta:     { label: 'Conduta',     color: 'teal',   bgCard: 'bg-teal-50',    border: 'border-teal-200',    dotColor: 'bg-teal-500',    lineColor: 'bg-teal-200',    icon: 'clipboard'    },
  prescricao:  { label: 'Prescrição',  color: 'green',  bgCard: 'bg-green-50',   border: 'border-green-200',   dotColor: 'bg-green-500',   lineColor: 'bg-green-200',   icon: 'pill'         },
  retorno:     { label: 'Retorno',     color: 'amber',  bgCard: 'bg-amber-50',   border: 'border-amber-200',   dotColor: 'bg-amber-500',   lineColor: 'bg-amber-200',   icon: 'calendar'     },
  ajuste:      { label: 'Ajuste',      color: 'orange', bgCard: 'bg-orange-50',  border: 'border-orange-200',  dotColor: 'bg-orange-500',  lineColor: 'bg-orange-200',  icon: 'settings'     },
};

export const STATUS_META: Record<TimelineStatus, { label: string; class: string }> = {
  concluido: { label: 'Concluído', class: 'bg-green-100 text-green-700 border-green-200' },
  pendente:  { label: 'Pendente',  class: 'bg-amber-100 text-amber-700 border-amber-200' },
  cancelado: { label: 'Cancelado', class: 'bg-slate-100 text-slate-500 border-slate-200' },
};

export const TIPO_ORDER: TimelineEventType[] = [
  'consulta', 'exame', 'diagnostico', 'conduta', 'prescricao', 'retorno', 'ajuste',
];

// ─── Seed ─────────────────────────────────────────────────────

const SEED_EVENTS: Omit<TimelineEvent, 'id'>[] = [
  {
    tipo: 'consulta',
    titulo: 'Consulta inicial — HAS + DM2',
    descricao: 'Paciente relata cefaleia occipital e polidipsia há 3 semanas. HDA compatível com HAS descompensada. PA: 164/102 mmHg. FC: 84 bpm. Glicemia capilar: 248 mg/dL.',
    data: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    paciente: 'Carlos Eduardo Souza',
    medico: 'Dr. João Silva',
    status: 'concluido',
    tags: ['HAS', 'DM2'],
    dados: { pa: '164/102', fc: '84', glicemia: '248', peso: '87', altura: '1.72' },
  },
  {
    tipo: 'exame',
    titulo: 'Solicitação de exames laboratoriais',
    descricao: 'HbA1c, glicemia de jejum, creatinina, ureia, K+, Na+, lipidograma, EAS, microalbuminúria, ECG e fundo de olho.',
    data: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    paciente: 'Carlos Eduardo Souza',
    medico: 'Dr. João Silva',
    status: 'concluido',
    tags: ['laboratório', 'triagem'],
    dados: { exames: 'HbA1c, Creatinina, Lipidograma, EAS, ECG' },
  },
  {
    tipo: 'exame',
    titulo: 'Resultado dos exames',
    descricao: 'HbA1c: 9,2% | Creatinina: 1,1 mg/dL | TFG: 72 | LDL: 148 mg/dL | K+: 4,2 | Microalbuminúria: 42 mg/g (positiva). ECG: ritmo sinusal, sem alterações isquêmicas.',
    data: new Date(Date.now() - 52 * 24 * 60 * 60 * 1000).toISOString(),
    paciente: 'Carlos Eduardo Souza',
    medico: 'Dr. João Silva',
    status: 'concluido',
    tags: ['resultado', 'laboratorio'],
    dados: { hba1c: '9.2', creatinina: '1.1', tfg: '72', ldl: '148', microalbuminuria: '42' },
  },
  {
    tipo: 'diagnostico',
    titulo: 'Diagnóstico: HAS Estágio 2 + DM2 descompensado + Microalbuminúria',
    descricao: 'PA média ≥ 160/100 → HAS E2. HbA1c 9,2% → DM2 fora de meta. Microalbuminúria positiva indica nefropatia diabética incipiente. Risco cardiovascular ALTO (Framingham 18%).',
    data: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    paciente: 'Carlos Eduardo Souza',
    medico: 'Dr. João Silva',
    status: 'concluido',
    tags: ['HAS', 'DM2', 'nefropatia', 'risco-CV'],
    dados: { cid10: 'I10 + E11 + N18.3', risco_cv: '18%' },
  },
  {
    tipo: 'conduta',
    titulo: 'Plano terapêutico definido',
    descricao: 'Iniciar Enalapril 10 mg/dia (nefroproteção + anti-hipertensivo), Metformina 500 mg 2x/dia (titular), HCTZ 25 mg/dia. Dieta hipossódica, atividade física 150 min/semana. Encaminhar nutricionista.',
    data: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    paciente: 'Carlos Eduardo Souza',
    medico: 'Dr. João Silva',
    status: 'concluido',
    tags: ['conduta', 'plano', 'não-farmacológico'],
    dados: {},
  },
  {
    tipo: 'prescricao',
    titulo: 'Prescrição emitida',
    descricao: 'Enalapril 10 mg 1x/dia VO | Metformina 500 mg 2x/dia VO (com refeições) | HCTZ 25 mg 1x/dia VO (manhã). Validade: 30 dias.',
    data: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    paciente: 'Carlos Eduardo Souza',
    medico: 'Dr. João Silva',
    status: 'concluido',
    tags: ['prescrição', 'IECA', 'biguanida', 'diurético'],
    dados: { medicamentos: 'Enalapril 10mg, Metformina 500mg, HCTZ 25mg' },
  },
  {
    tipo: 'retorno',
    titulo: 'Retorno 30 dias — Reavaliação',
    descricao: 'PA: 138/88 mmHg (melhora parcial, meta < 130/80). Relata tosse seca com Enalapril. Glicemia jejum: 184 mg/dL. Boa aderência ao tratamento.',
    data: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    paciente: 'Carlos Eduardo Souza',
    medico: 'Dr. João Silva',
    status: 'concluido',
    tags: ['retorno', 'reavaliação'],
    dados: { pa: '138/88', glicemia_jejum: '184', aderencia: 'boa' },
  },
  {
    tipo: 'ajuste',
    titulo: 'Ajuste: troca Enalapril → Losartana (tosse)',
    descricao: 'Suspender Enalapril por tosse seca (efeito adverso classe IECA). Iniciar Losartana 50 mg/dia — BRA mantém nefroproteção sem tosse. Titular Metformina para 1 g 2x/dia.',
    data: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    paciente: 'Carlos Eduardo Souza',
    medico: 'Dr. João Silva',
    status: 'concluido',
    tags: ['ajuste', 'BRA', 'efeito-adverso'],
    dados: { motivo: 'Tosse seca por IECA', substituicao: 'Enalapril → Losartana 50mg' },
  },
  {
    tipo: 'retorno',
    titulo: 'Retorno 60 dias — Próximo agendamento',
    descricao: 'HbA1c de controle. Avaliar PA com Losartana. Titular Metformina para 2 g/dia se tolerado. Solicitar lipidograma de controle e microalbuminúria.',
    data: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    paciente: 'Carlos Eduardo Souza',
    medico: 'Dr. João Silva',
    status: 'pendente',
    tags: ['retorno', 'agendado'],
    dados: { exames_solicitados: 'HbA1c, Lipidograma, Microalbuminúria' },
  },
];

// ─── Storage ──────────────────────────────────────────────────

const STORAGE_KEY = 'prescreve_ai_timeline_v1';

function generateId(): string {
  return `tl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function loadFromStorage(): TimelineEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as TimelineEvent[];
  } catch {}
  const seeded = SEED_EVENTS.map(e => ({ ...e, id: generateId() }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveToStorage(events: TimelineEvent[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

// ─── Hook ─────────────────────────────────────────────────────

export function useTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEvents(loadFromStorage());
    setLoaded(true);
  }, []);

  const persist = useCallback((next: TimelineEvent[]) => {
    setEvents(next);
    saveToStorage(next);
  }, []);

  const addEvent = useCallback((data: Omit<TimelineEvent, 'id'>): TimelineEvent => {
    const ev: TimelineEvent = { ...data, id: generateId() };
    persist([...events, ev]);
    return ev;
  }, [events, persist]);

  const updateEvent = useCallback((id: string, patch: Partial<TimelineEvent>) => {
    persist(events.map(e => e.id === id ? { ...e, ...patch } : e));
  }, [events, persist]);

  const removeEvent = useCallback((id: string) => {
    persist(events.filter(e => e.id !== id));
  }, [events, persist]);

  const patients = [...new Set(events.map(e => e.paciente))].sort();

  return { events, loaded, addEvent, updateEvent, removeEvent, patients };
}
