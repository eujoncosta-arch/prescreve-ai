// ============================================================
// PRESCREVE-AI — Physician Personalization Engine
// Perfil personalizado do médico — experiência adaptada
// ============================================================
//
// IMPORTANTE: A preferência do médico NUNCA altera a evidência
// científica. A recomendação segue: Diretriz → Classe → Molécula.
// As preferências apenas customizam a *exibição* e *priorização*.
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Especialidades ──────────────────────────────────────────

export type EspecialidadeMedica =
  | 'clinica_medica'
  | 'cardiologia'
  | 'endocrinologia'
  | 'pneumologia'
  | 'nefrologia'
  | 'neurologia'
  | 'psiquiatria'
  | 'oncologia'
  | 'infectologia'
  | 'gastroenterologia'
  | 'reumatologia'
  | 'hematologia'
  | 'pediatria'
  | 'ginecologia'
  | 'ortopedia'
  | 'cirurgia_geral'
  | 'medicina_familia'
  | 'geriatria'
  | 'intensivismo'
  | 'emergencia'
  | 'outra';

export type SubespecialidadeMedica =
  | 'arritmologia'
  | 'cardiologia_intervencional'
  | 'insuficiencia_cardiaca'
  | 'hipertensao_arterial'
  | 'diabetes_metabolismo'
  | 'tireoide'
  | 'obesidade'
  | 'dpoc_asma'
  | 'pneumologia_sono'
  | 'nefrologia_transplante'
  | 'dialise'
  | 'neurologia_vascular'
  | 'epilepsia'
  | 'oncologia_clinica'
  | 'hematologia_oncologica'
  | 'hepatologia'
  | 'inflamacao_autoimune'
  | 'outra'
  | null;

// ─── Diretrizes / Sociedades preferidas ──────────────────────

export type SociedadeDiretriz =
  | 'SBC'   // Sociedade Brasileira de Cardiologia
  | 'SBD'   // Sociedade Brasileira de Diabetes
  | 'SBPT'  // Sociedade Brasileira de Pneumologia
  | 'SBN'   // Sociedade Brasileira de Nefrologia
  | 'ABN'   // Academia Brasileira de Neurologia
  | 'SBEM'  // Sociedade Brasileira de Endocrinologia
  | 'AMB'   // Associação Médica Brasileira
  | 'CFM'   // Conselho Federal de Medicina
  | 'ESC'   // European Society of Cardiology
  | 'ESH'   // European Society of Hypertension
  | 'ERS'   // European Respiratory Society
  | 'ADA'   // American Diabetes Association
  | 'ACC'   // American College of Cardiology
  | 'AHA'   // American Heart Association
  | 'ATS'   // American Thoracic Society
  | 'KDIGO' // Kidney Disease Improving Global Outcomes
  | 'GINA'  // Global Initiative for Asthma
  | 'GOLD'  // Global Initiative for COPD
  | 'WHO'   // World Health Organization
  | 'NICE'  // National Institute for Health and Care Excellence
  | 'JNC'   // Joint National Committee (hipertensão)
  | 'EASD'  // European Association for the Study of Diabetes
  | 'EAS'   // European Atherosclerosis Society;

export type EstiloPrescricao =
  | 'conservador'      // prioriza moléculas mais antigas com maior histórico
  | 'baseado_evidencia'// segue estritamente o que as diretrizes preferenciais recomendam
  | 'inovador'         // prioriza moléculas novas com evidência emergente
  | 'custo_efetivo'    // prioriza genéricos e custo para o paciente
  | 'guideline_first'; // sempre exibe a recomendação da diretriz antes de marcas

export type AmbienteAtuacao =
  | 'ambulatorio'
  | 'hospital_geral'
  | 'uti'
  | 'pronto_socorro'
  | 'consultorio_particular'
  | 'unidade_basica'
  | 'plano_saude'
  | 'telemedicina'
  | 'multiplo';

// ─── Protocolo favorito ──────────────────────────────────────

export interface ProtocoloFavorito {
  id: string;
  nome: string;
  diagnostico: string;
  cid10: string;
  notas?: string;
  adicionado_em: string;
}

// ─── Prescrição favorita ─────────────────────────────────────

export interface PrescricaoFavorita {
  id: string;
  nome: string;       // apelido dado pelo médico
  diagnostico: string;
  molecula: string;
  posologia: string;
  observacao?: string;
  adicionado_em: string;
  vezes_usada: number;
}

// ─── Perfil completo ─────────────────────────────────────────

export interface PhysicianProfile {
  // Identificação
  nome: string;
  crm: string;
  uf_crm: string;
  rqe?: string;         // Registro de Qualificação de Especialista
  titulo_academico?: 'Especialista' | 'Mestre' | 'Doutor' | 'Livre-Docente' | 'Professor';
  instituicao?: string;
  email?: string;
  telefone?: string;
  endereco_consultorio?: string;

  // Especialização
  especialidade: EspecialidadeMedica;
  subespecialidade: SubespecialidadeMedica;
  ambiente_atuacao: AmbienteAtuacao;
  anos_formado?: number;

  // Preferências científicas
  sociedades_preferidas: SociedadeDiretriz[];
  estilo_prescricao: EstiloPrescricao;
  exibir_nivel_evidencia: boolean;
  exibir_nnt_nnh: boolean;
  exibir_estudos_chave: boolean;
  exibir_alternativas: boolean;
  alertar_atualizacao_diretriz: boolean;

  // Preferências de laboratório (exibição)
  laboratorios_preferidos: string[];   // IDs de labs do showcase
  exibir_marca_preferida_primeiro: boolean;

  // Favoritos
  protocolos_favoritos: ProtocoloFavorito[];
  prescricoes_favoritas: PrescricaoFavorita[];

  // Metadados
  criado_em: string;
  atualizado_em: string;
  versao_perfil: number;
}

// ─── Seed default ────────────────────────────────────────────

function defaultProfile(): PhysicianProfile {
  const now = new Date().toISOString();
  return {
    nome: 'Dr. João Silva',
    crm: '123456',
    uf_crm: 'SP',
    titulo_academico: undefined,
    especialidade: 'clinica_medica',
    subespecialidade: null,
    ambiente_atuacao: 'ambulatorio',
    sociedades_preferidas: ['SBC', 'ADA', 'ESC'],
    estilo_prescricao: 'baseado_evidencia',
    exibir_nivel_evidencia: true,
    exibir_nnt_nnh: true,
    exibir_estudos_chave: true,
    exibir_alternativas: true,
    alertar_atualizacao_diretriz: true,
    laboratorios_preferidos: ['eurofarma'],
    exibir_marca_preferida_primeiro: true,
    protocolos_favoritos: [],
    prescricoes_favoritas: [
      {
        id: 'pf-1',
        nome: 'HAS Estágio 1 — Enalapril',
        diagnostico: 'Hipertensão Arterial Sistêmica',
        molecula: 'Enalapril 10 mg',
        posologia: '1 comprimido 12/12h',
        adicionado_em: now,
        vezes_usada: 12,
      },
      {
        id: 'pf-2',
        nome: 'DM2 — Metformina 1ª linha',
        diagnostico: 'Diabetes Mellitus tipo 2',
        molecula: 'Metformina XR 500 mg',
        posologia: '1 comprimido ao jantar (semana 1), aumentar conforme tolerância',
        adicionado_em: now,
        vezes_usada: 27,
      },
    ],
    criado_em: now,
    atualizado_em: now,
    versao_perfil: 1,
  };
}

// ─── Hook ────────────────────────────────────────────────────

const STORAGE_KEY = 'prescreve_ai_physician_profile_v1';

export function usePhysicianProfile() {
  const [profile, setProfileState] = useState<PhysicianProfile>(() => {
    if (typeof window === 'undefined') return defaultProfile();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaultProfile(), ...JSON.parse(raw) } as PhysicianProfile;
    } catch { /* ignore */ }
    return defaultProfile();
  });

  const persist = useCallback((p: PhysicianProfile) => {
    setProfileState(p);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
  }, []);

  const updateProfile = useCallback((patch: Partial<PhysicianProfile>) => {
    setProfileState(prev => {
      const next: PhysicianProfile = {
        ...prev,
        ...patch,
        atualizado_em: new Date().toISOString(),
        versao_perfil: prev.versao_perfil + 1,
      };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const toggleSociedade = useCallback((s: SociedadeDiretriz) => {
    setProfileState(prev => {
      const next = prev.sociedades_preferidas.includes(s)
        ? prev.sociedades_preferidas.filter(x => x !== s)
        : [...prev.sociedades_preferidas, s];
      const updated = { ...prev, sociedades_preferidas: next, atualizado_em: new Date().toISOString() };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const toggleLab = useCallback((labId: string) => {
    setProfileState(prev => {
      const next = prev.laboratorios_preferidos.includes(labId)
        ? prev.laboratorios_preferidos.filter(x => x !== labId)
        : [...prev.laboratorios_preferidos, labId];
      const updated = { ...prev, laboratorios_preferidos: next, atualizado_em: new Date().toISOString() };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const addPrescricaoFavorita = useCallback((p: Omit<PrescricaoFavorita, 'id' | 'adicionado_em' | 'vezes_usada'>) => {
    const nova: PrescricaoFavorita = {
      ...p,
      id: `pf-${Date.now()}`,
      adicionado_em: new Date().toISOString(),
      vezes_usada: 0,
    };
    setProfileState(prev => {
      const updated = { ...prev, prescricoes_favoritas: [...prev.prescricoes_favoritas, nova], atualizado_em: new Date().toISOString() };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const removePrescricaoFavorita = useCallback((id: string) => {
    setProfileState(prev => {
      const updated = { ...prev, prescricoes_favoritas: prev.prescricoes_favoritas.filter(p => p.id !== id), atualizado_em: new Date().toISOString() };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  // SSR: re-sync after hydration
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PhysicianProfile;
        setProfileState(p => ({ ...p, ...parsed }));
      }
    } catch { /* ignore */ }
  }, []);

  return {
    profile,
    updateProfile,
    persist,
    toggleSociedade,
    toggleLab,
    addPrescricaoFavorita,
    removePrescricaoFavorita,
  };
}

// ─── Metadados de display ────────────────────────────────────

export const ESPECIALIDADE_LABEL: Record<EspecialidadeMedica, string> = {
  clinica_medica:    'Clínica Médica',
  cardiologia:       'Cardiologia',
  endocrinologia:    'Endocrinologia',
  pneumologia:       'Pneumologia',
  nefrologia:        'Nefrologia',
  neurologia:        'Neurologia',
  psiquiatria:       'Psiquiatria',
  oncologia:         'Oncologia',
  infectologia:      'Infectologia',
  gastroenterologia: 'Gastroenterologia',
  reumatologia:      'Reumatologia',
  hematologia:       'Hematologia',
  pediatria:         'Pediatria',
  ginecologia:       'Ginecologia e Obstetrícia',
  ortopedia:         'Ortopedia',
  cirurgia_geral:    'Cirurgia Geral',
  medicina_familia:  'Medicina de Família',
  geriatria:         'Geriatria',
  intensivismo:      'Medicina Intensiva',
  emergencia:        'Medicina de Emergência',
  outra:             'Outra',
};

export const SUBESP_LABEL: Record<NonNullable<SubespecialidadeMedica>, string> = {
  arritmologia:              'Arritmologia',
  cardiologia_intervencional:'Cardiologia Intervencionista',
  insuficiencia_cardiaca:    'Insuficiência Cardíaca',
  hipertensao_arterial:      'Hipertensão Arterial',
  diabetes_metabolismo:      'Diabetes e Metabolismo',
  tireoide:                  'Tireoide',
  obesidade:                 'Obesidade',
  dpoc_asma:                 'DPOC e Asma',
  pneumologia_sono:          'Distúrbios do Sono',
  nefrologia_transplante:    'Transplante Renal',
  dialise:                   'Diálise',
  neurologia_vascular:       'Neurologia Vascular',
  epilepsia:                 'Epilepsia',
  oncologia_clinica:         'Oncologia Clínica',
  hematologia_oncologica:    'Hematologia Oncológica',
  hepatologia:               'Hepatologia',
  inflamacao_autoimune:      'Inflamação e Autoimune',
  outra:                     'Outra',
};

export const AMBIENTE_LABEL: Record<AmbienteAtuacao, string> = {
  ambulatorio:            'Ambulatório',
  hospital_geral:         'Hospital Geral',
  uti:                    'UTI',
  pronto_socorro:         'Pronto-Socorro',
  consultorio_particular: 'Consultório Particular',
  unidade_basica:         'UBS / APS',
  plano_saude:            'Plano de Saúde',
  telemedicina:           'Telemedicina',
  multiplo:               'Múltiplos ambientes',
};

export const ESTILO_META: Record<EstiloPrescricao, { label: string; desc: string; icon: string }> = {
  baseado_evidencia:  { label: 'Baseado em evidência',   desc: 'Segue as diretrizes preferenciais selecionadas à risca',               icon: '📊' },
  conservador:        { label: 'Conservador',             desc: 'Prioriza moléculas com maior histórico de segurança',                   icon: '🛡️' },
  inovador:           { label: 'Inovador',                desc: 'Inclui moléculas emergentes com evidência crescente',                   icon: '🔬' },
  custo_efetivo:      { label: 'Custo-efetivo',           desc: 'Prioriza genéricos e menor custo sem perda de eficácia',               icon: '💰' },
  guideline_first:    { label: 'Guideline first',         desc: 'Exibe sempre a recomendação da diretriz antes de marcas comerciais',    icon: '📋' },
};

export const SOCIEDADE_META: Record<SociedadeDiretriz, { nome: string; pais: string; area: string }> = {
  SBC:    { nome: 'Sociedade Brasileira de Cardiologia',        pais: 'Brasil',  area: 'Cardiologia'     },
  SBD:    { nome: 'Sociedade Brasileira de Diabetes',           pais: 'Brasil',  area: 'Diabetes'        },
  SBPT:   { nome: 'Sociedade Brasileira de Pneumologia',        pais: 'Brasil',  area: 'Pneumologia'     },
  SBN:    { nome: 'Sociedade Brasileira de Nefrologia',         pais: 'Brasil',  area: 'Nefrologia'      },
  ABN:    { nome: 'Academia Brasileira de Neurologia',          pais: 'Brasil',  area: 'Neurologia'      },
  SBEM:   { nome: 'Soc. Brasileira de Endocrinologia',          pais: 'Brasil',  area: 'Endocrinologia'  },
  AMB:    { nome: 'Associação Médica Brasileira',               pais: 'Brasil',  area: 'Geral'           },
  CFM:    { nome: 'Conselho Federal de Medicina',               pais: 'Brasil',  area: 'Regulatório'     },
  ESC:    { nome: 'European Society of Cardiology',             pais: 'Europa',  area: 'Cardiologia'     },
  ESH:    { nome: 'European Society of Hypertension',           pais: 'Europa',  area: 'Hipertensão'     },
  ERS:    { nome: 'European Respiratory Society',               pais: 'Europa',  area: 'Pneumologia'     },
  ADA:    { nome: 'American Diabetes Association',              pais: 'EUA',     area: 'Diabetes'        },
  ACC:    { nome: 'American College of Cardiology',             pais: 'EUA',     area: 'Cardiologia'     },
  AHA:    { nome: 'American Heart Association',                 pais: 'EUA',     area: 'Cardiologia'     },
  ATS:    { nome: 'American Thoracic Society',                  pais: 'EUA',     area: 'Pneumologia'     },
  KDIGO:  { nome: 'Kidney Disease: Improving Global Outcomes',  pais: 'Global',  area: 'Nefrologia'      },
  GINA:   { nome: 'Global Initiative for Asthma',               pais: 'Global',  area: 'Asma'            },
  GOLD:   { nome: 'Global Initiative for Chronic Lung Disease', pais: 'Global',  area: 'DPOC'            },
  WHO:    { nome: 'World Health Organization',                  pais: 'Global',  area: 'Geral'           },
  NICE:   { nome: 'Nat. Institute for Health and Care Exc.',    pais: 'UK',      area: 'Geral'           },
  JNC:    { nome: 'Joint National Committee',                   pais: 'EUA',     area: 'Hipertensão'     },
  EASD:   { nome: 'European Assoc. for the Study of Diabetes',  pais: 'Europa',  area: 'Diabetes'        },
  EAS:    { nome: 'European Atherosclerosis Society',           pais: 'Europa',  area: 'Lipídios'        },
};

export const PAIS_FLAG: Record<string, string> = {
  Brasil: '🇧🇷',
  Europa: '🇪🇺',
  EUA:    '🇺🇸',
  UK:     '🇬🇧',
  Global: '🌐',
};

export const ALL_SOCIEDADES = Object.keys(SOCIEDADE_META) as SociedadeDiretriz[];
