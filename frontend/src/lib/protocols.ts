// ============================================================
// PRESCREVE-AI — Smart Protocols
// localStorage-backed CRUD with import/export
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Tipos ───────────────────────────────────────────────────

export type ProtocolCategoria =
  | 'cronica'
  | 'aguda'
  | 'psiquiatrica'
  | 'respiratoria'
  | 'cardiovascular'
  | 'outro';

export interface ProtocolDrug {
  molecula: string;
  dose: string;
  via: string;
  frequencia: string;
  duracao?: string;
  notas?: string;
}

export interface SmartProtocol {
  id: string;
  nome: string;
  condicao: string;
  categoria: ProtocolCategoria;
  farmacologico: ProtocolDrug[];
  nao_farmacologico: string[];
  seguimento: string;
  monitorizacao: string[];
  notas?: string;
  tags: string[];
  favorito: boolean;
  criado_em: string;
  atualizado_em: string;
  autor?: string;
  versao: number;
}

// ─── Protocolos padrão (seed) ─────────────────────────────

export const PROTOCOLOS_SEED: Omit<SmartProtocol, 'id' | 'criado_em' | 'atualizado_em'>[] = [
  {
    nome: 'HAS — 1ª Linha',
    condicao: 'Hipertensão Arterial Sistêmica',
    categoria: 'cardiovascular',
    farmacologico: [
      { molecula: 'Enalapril', dose: '10 mg', via: 'VO', frequencia: '1x/dia', notas: 'Iniciar com 5 mg se idoso ou renal' },
      { molecula: 'HCTZ', dose: '25 mg', via: 'VO', frequencia: '1x/dia (manhã)', notas: 'Monitorar K+ e Na+' },
    ],
    nao_farmacologico: [
      'Redução de sódio < 2 g/dia',
      'Atividade física aeróbica 150 min/semana',
      'Cessação do tabagismo',
      'Controle do peso (meta IMC < 25)',
      'Restrição de álcool',
    ],
    seguimento: 'Retorno em 30 dias com PA aferida. Reavaliação da meta < 130/80 mmHg em 3 meses.',
    monitorizacao: ['PA semanal (primeiros 30 dias)', 'Creatinina e K+ em 2 semanas', 'Glicemia de jejum em 3 meses'],
    tags: ['HAS', 'cardiovascular', 'IECA', 'diurético'],
    favorito: true,
    autor: 'Dr. João Silva',
    versao: 1,
  },
  {
    nome: 'DM2 — Metformina 1ª Linha',
    condicao: 'Diabetes Mellitus Tipo 2',
    categoria: 'cronica',
    farmacologico: [
      { molecula: 'Metformina', dose: '500 mg', via: 'VO', frequencia: '2x/dia (com refeições)', notas: 'Titular para 1g 2x/dia em 4 semanas conforme tolerância gastrointestinal' },
    ],
    nao_farmacologico: [
      'Dieta com baixo índice glicêmico',
      'Atividade física ≥ 150 min/semana',
      'Perda de peso (meta ≥ 5% do peso corporal)',
      'Monitorização glicêmica domiciliar',
    ],
    seguimento: 'HbA1c em 3 meses. Meta HbA1c < 7%. Avaliação de complicações anuais.',
    monitorizacao: ['HbA1c a cada 3 meses até atingir meta', 'Creatinina e TFG anual', 'Microalbuminúria anual', 'Fundo de olho anual'],
    tags: ['DM2', 'metformina', 'glicemia', 'biguanida'],
    favorito: true,
    autor: 'Dr. João Silva',
    versao: 1,
  },
  {
    nome: 'TDM — Antidepressivo 1ª Linha',
    condicao: 'Transtorno Depressivo Maior',
    categoria: 'psiquiatrica',
    farmacologico: [
      { molecula: 'Sertralina', dose: '50 mg', via: 'VO', frequencia: '1x/dia (manhã)', notas: 'Iniciar com 25 mg/dia por 1 semana para reduzir efeitos adversos' },
    ],
    nao_farmacologico: [
      'Psicoterapia cognitivo-comportamental (TCC)',
      'Higiene do sono',
      'Atividade física regular (forte evidência antidepressiva)',
      'Suporte social',
      'Avaliação de risco de suicídio a cada consulta',
    ],
    seguimento: 'Retorno em 2 semanas (avaliar aderência e efeitos adversos). Reavaliação de resposta em 6 semanas. Manutenção por no mínimo 6 meses após remissão.',
    monitorizacao: ['Escala PHQ-9 a cada consulta', 'Avaliação de ideação suicida', 'PA e FC (primeiras semanas)'],
    tags: ['TDM', 'depressão', 'ISRS', 'sertralina', 'psiquiatria'],
    favorito: false,
    autor: 'Dr. João Silva',
    versao: 1,
  },
  {
    nome: 'TAG — Ansiedade Generalizada',
    condicao: 'Transtorno de Ansiedade Generalizada',
    categoria: 'psiquiatrica',
    farmacologico: [
      { molecula: 'Escitalopram', dose: '10 mg', via: 'VO', frequencia: '1x/dia', notas: 'Iniciar com 5 mg/dia. Efeito ansiolítico pleno em 4–6 semanas' },
    ],
    nao_farmacologico: [
      'Terapia cognitivo-comportamental (TCC) — primeira linha',
      'Técnicas de relaxamento e mindfulness',
      'Redução de cafeína e álcool',
      'Atividade física regular',
    ],
    seguimento: 'Retorno em 2 semanas. Avaliar resposta com GAD-7 em 6 semanas. Manutenção por 12 meses após remissão.',
    monitorizacao: ['Escala GAD-7', 'Avaliação de comorbidade depressiva', 'Aderência ao ISRS'],
    tags: ['TAG', 'ansiedade', 'ISRS', 'escitalopram', 'psiquiatria'],
    favorito: false,
    autor: 'Dr. João Silva',
    versao: 1,
  },
  {
    nome: 'ITU não complicada — Feminina',
    condicao: 'Infecção do Trato Urinário',
    categoria: 'aguda',
    farmacologico: [
      { molecula: 'Nitrofurantoína', dose: '100 mg', via: 'VO', frequencia: '2x/dia', duracao: '5 dias', notas: 'Tomar com alimentos para reduzir náusea' },
    ],
    nao_farmacologico: [
      'Hidratação aumentada (≥ 2 L/dia)',
      'Orientar higiene genital',
      'Evitar duchas vaginais',
    ],
    seguimento: 'Urocultura de controle não necessária em ITU não complicada com remissão clínica. Sintomas persistentes: urocultura + antibiograma.',
    monitorizacao: ['Sintomas em 48–72h', 'Urocultura se não melhorar em 3 dias'],
    tags: ['ITU', 'infecção', 'nitrofurantoína', 'antibiótico', 'urinária'],
    favorito: false,
    autor: 'Dr. João Silva',
    versao: 1,
  },
  {
    nome: 'Asma Leve Persistente',
    condicao: 'Asma',
    categoria: 'respiratoria',
    farmacologico: [
      { molecula: 'Budesonida + Formoterol 80/4,5 mcg', dose: '1 jato', via: 'Inalatória', frequencia: '2x/dia (manutenção)', notas: 'Estratégia SMART: mesmo dispositivo para manutenção e resgate' },
      { molecula: 'Salbutamol 100 mcg', dose: '2 jatos', via: 'Inalatória', frequencia: 'SOS (resgate)', notas: 'Uso frequente indica controle inadequado — reavaliar' },
    ],
    nao_farmacologico: [
      'Identificar e evitar desencadeantes (ácaros, pelos, fumaça)',
      'Técnica inalatória correta (revisar a cada consulta)',
      'Vacinação anti-influenza anual',
      'Cessação do tabagismo',
    ],
    seguimento: 'Consulta em 4–6 semanas. ACT (Asthma Control Test) a cada consulta. Espirometria anual.',
    monitorizacao: ['ACT a cada consulta', 'Número de resgates/semana', 'Espirometria com broncodilatador anual'],
    tags: ['asma', 'budesonida', 'formoterol', 'SMART', 'respiratório'],
    favorito: true,
    autor: 'Dr. João Silva',
    versao: 1,
  },
  {
    nome: 'DPOC — Broncodilatador Duplo',
    condicao: 'DPOC',
    categoria: 'respiratoria',
    farmacologico: [
      { molecula: 'Tiotrópio 18 mcg', dose: '1 cápsula', via: 'Inalatória (HandiHaler)', frequencia: '1x/dia', notas: 'LAMA: não usar em glaucoma de ângulo fechado' },
    ],
    nao_farmacologico: [
      'Cessação do tabagismo — intervenção mais eficaz',
      'Reabilitação pulmonar (GOLD A: escore mMRC ≥ 2)',
      'Vacinação anti-influenza anual e antipneumocócica',
      'Nutrição adequada (sarcopenia é comorbidade frequente)',
    ],
    seguimento: 'Espirometria em 3 meses. Avaliar GOLD grade. Oximetria de pulso em toda consulta.',
    monitorizacao: ['mMRC e CAT score', 'SpO₂', 'Espirometria com BD semestral', 'Número de exacerbações/ano'],
    tags: ['DPOC', 'tiotrópio', 'LAMA', 'broncodilatador', 'respiratório'],
    favorito: false,
    autor: 'Dr. João Silva',
    versao: 1,
  },
];

// ─── Storage key ──────────────────────────────────────────────

const STORAGE_KEY = 'prescreve_ai_protocols_v1';

function generateId(): string {
  return `proto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function now(): string {
  return new Date().toISOString();
}

function loadFromStorage(): SmartProtocol[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SmartProtocol[];
  } catch {}
  // Seed on first load
  const seeded = PROTOCOLOS_SEED.map(p => ({
    ...p,
    id: generateId(),
    criado_em: now(),
    atualizado_em: now(),
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveToStorage(protocols: SmartProtocol[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(protocols));
}

// ─── Hook ────────────────────────────────────────────────────

export function useProtocols() {
  const [protocols, setProtocols] = useState<SmartProtocol[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProtocols(loadFromStorage());
    setLoaded(true);
  }, []);

  const persist = useCallback((next: SmartProtocol[]) => {
    setProtocols(next);
    saveToStorage(next);
  }, []);

  const create = useCallback((data: Omit<SmartProtocol, 'id' | 'criado_em' | 'atualizado_em' | 'versao'>): SmartProtocol => {
    const novo: SmartProtocol = {
      ...data,
      id: generateId(),
      criado_em: now(),
      atualizado_em: now(),
      versao: 1,
    };
    persist([novo, ...protocols]);
    return novo;
  }, [protocols, persist]);

  const update = useCallback((id: string, patch: Partial<SmartProtocol>) => {
    persist(protocols.map(p => p.id === id ? { ...p, ...patch, atualizado_em: now(), versao: p.versao + 1 } : p));
  }, [protocols, persist]);

  const remove = useCallback((id: string) => {
    persist(protocols.filter(p => p.id !== id));
  }, [protocols, persist]);

  const toggleFavorito = useCallback((id: string) => {
    persist(protocols.map(p => p.id === id ? { ...p, favorito: !p.favorito, atualizado_em: now() } : p));
  }, [protocols, persist]);

  const duplicate = useCallback((id: string): SmartProtocol | undefined => {
    const orig = protocols.find(p => p.id === id);
    if (!orig) return;
    const copy: SmartProtocol = {
      ...orig,
      id: generateId(),
      nome: `${orig.nome} (cópia)`,
      criado_em: now(),
      atualizado_em: now(),
      versao: 1,
      favorito: false,
    };
    persist([copy, ...protocols]);
    return copy;
  }, [protocols, persist]);

  // ── Import / Export ──────────────────────────────────────

  const exportAll = useCallback(() => {
    const blob = new Blob([JSON.stringify(protocols, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prescreve_ai_protocolos_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [protocols]);

  const exportOne = useCallback((id: string) => {
    const p = protocols.find(x => x.id === id);
    if (!p) return;
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `protocolo_${p.nome.replace(/\s+/g, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [protocols]);

  const importFromJson = useCallback((json: string): { ok: boolean; count: number; error?: string } => {
    try {
      const parsed = JSON.parse(json);
      const arr: SmartProtocol[] = Array.isArray(parsed) ? parsed : [parsed];
      const existingIds = new Set(protocols.map(p => p.id));
      const incoming = arr.map(p => ({
        ...p,
        id: existingIds.has(p.id) ? generateId() : p.id,
        atualizado_em: now(),
      }));
      persist([...incoming, ...protocols]);
      return { ok: true, count: incoming.length };
    } catch (e) {
      return { ok: false, count: 0, error: String(e) };
    }
  }, [protocols, persist]);

  const copyShareText = useCallback((id: string): string => {
    const p = protocols.find(x => x.id === id);
    if (!p) return '';
    return JSON.stringify(p, null, 2);
  }, [protocols]);

  return {
    protocols,
    loaded,
    create,
    update,
    remove,
    toggleFavorito,
    duplicate,
    exportAll,
    exportOne,
    importFromJson,
    copyShareText,
  };
}

// ─── Helpers ─────────────────────────────────────────────────

export const CATEGORIA_LABEL: Record<ProtocolCategoria, string> = {
  cronica: 'Crônica',
  aguda: 'Aguda',
  psiquiatrica: 'Psiquiátrica',
  respiratoria: 'Respiratória',
  cardiovascular: 'Cardiovascular',
  outro: 'Outro',
};

export const CATEGORIA_COLOR: Record<ProtocolCategoria, string> = {
  cardiovascular: 'bg-red-100 text-red-700 border-red-200',
  cronica: 'bg-blue-100 text-blue-700 border-blue-200',
  aguda: 'bg-orange-100 text-orange-700 border-orange-200',
  psiquiatrica: 'bg-purple-100 text-purple-700 border-purple-200',
  respiratoria: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  outro: 'bg-slate-100 text-slate-700 border-slate-200',
};
