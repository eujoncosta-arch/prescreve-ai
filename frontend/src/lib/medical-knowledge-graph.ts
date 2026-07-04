// ============================================================
// PRESCREVE-AI — Medical Knowledge Graph (Phase 20)
// Grafo médico · Relacionamentos · Centralidade · Lacunas
// Suporte à decisão clínica — não substitui o médico
// ============================================================

// ══════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════

export type TipoEntidade =
  | 'sintoma' | 'sinal' | 'diagnostico' | 'cid' | 'medicamento' | 'marca'
  | 'laboratorio' | 'mecanismo' | 'estudo' | 'guideline' | 'especialidade'
  | 'exame' | 'biomarcador' | 'prognostico' | 'evento_adverso';

export type TipoRelacao =
  | 'DIAGNOSTICO_DIRETRIZ'
  | 'DIAGNOSTICO_EVIDENCIA'
  | 'DIAGNOSTICO_MEDICAMENTO'
  | 'MEDICAMENTO_MECANISMO'
  | 'MEDICAMENTO_MARCA'
  | 'MEDICAMENTO_ESTUDO'
  | 'ESTUDO_DOI'
  | 'ESTUDO_NNT'
  | 'ESTUDO_GUIDELINE'
  | 'PACIENTE_RISCO'
  | 'PACIENTE_PROGNOSTICO'
  | 'MEDICAMENTO_EVENTO_ADVERSO'
  | 'SINTOMA_DIAGNOSTICO'
  | 'EXAME_DIAGNOSTICO'
  | 'BIOMARCADOR_DIAGNOSTICO';

export type PesoRelacao = 1 | 2 | 3 | 4 | 5;  // 5 = muito forte

export interface NoGrafo {
  id: string;
  tipo: TipoEntidade;
  label: string;
  descricao?: string;
  metadados?: Record<string, string | number | boolean>;
}

export interface ArestaGrafo {
  id: string;
  origem: string;   // id do nó
  destino: string;  // id do nó
  tipo: TipoRelacao;
  peso: PesoRelacao;
  evidencia?: string;
  doi?: string;
  nnt?: number;
}

export interface MedicalKnowledgeGraph {
  nos: NoGrafo[];
  arestas: ArestaGrafo[];
  versao: string;
  gerado_em: string;
  total_nos: number;
  total_arestas: number;
}

// ══════════════════════════════════════════════════════════════
// DADOS DO GRAFO
// ══════════════════════════════════════════════════════════════

const NOS_BASE: NoGrafo[] = [
  // Diagnósticos / CIDs
  { id: 'I10',  tipo: 'diagnostico', label: 'Hipertensão Arterial Sistêmica', metadados: { cid: 'I10', prevalencia_br_pct: 36 } },
  { id: 'E11',  tipo: 'diagnostico', label: 'Diabetes Mellitus Tipo 2', metadados: { cid: 'E11', prevalencia_br_pct: 10 } },
  { id: 'I50',  tipo: 'diagnostico', label: 'Insuficiência Cardíaca', metadados: { cid: 'I50', mortalidade_1ano_pct: 30 } },
  { id: 'J45',  tipo: 'diagnostico', label: 'Asma Brônquica', metadados: { cid: 'J45', prevalencia_br_pct: 12 } },
  { id: 'J44',  tipo: 'diagnostico', label: 'DPOC', metadados: { cid: 'J44', mortalidade_5anos_pct: 50 } },
  { id: 'N18',  tipo: 'diagnostico', label: 'Doença Renal Crônica', metadados: { cid: 'N18' } },
  { id: 'F32',  tipo: 'diagnostico', label: 'Transtorno Depressivo', metadados: { cid: 'F32' } },
  { id: 'E78',  tipo: 'diagnostico', label: 'Dislipidemia', metadados: { cid: 'E78' } },
  { id: 'I21',  tipo: 'diagnostico', label: 'Infarto Agudo do Miocárdio', metadados: { cid: 'I21' } },
  { id: 'K74',  tipo: 'diagnostico', label: 'Cirrose Hepática', metadados: { cid: 'K74' } },

  // Medicamentos (moléculas)
  { id: 'enalapril',       tipo: 'medicamento', label: 'Enalapril',       metadados: { classe: 'IECA', atc: 'C09AA02' } },
  { id: 'ramipril',        tipo: 'medicamento', label: 'Ramipril',        metadados: { classe: 'IECA', atc: 'C09AA05' } },
  { id: 'losartana',       tipo: 'medicamento', label: 'Losartana',       metadados: { classe: 'BRA', atc: 'C09CA01' } },
  { id: 'amlodipina',      tipo: 'medicamento', label: 'Amlodipina',      metadados: { classe: 'BCC', atc: 'C08CA01' } },
  { id: 'metformina',      tipo: 'medicamento', label: 'Metformina',      metadados: { classe: 'Biguanida', atc: 'A10BA02' } },
  { id: 'empagliflozina',  tipo: 'medicamento', label: 'Empagliflozina',  metadados: { classe: 'SGLT2i', atc: 'A10BK03' } },
  { id: 'dapagliflozina',  tipo: 'medicamento', label: 'Dapagliflozina',  metadados: { classe: 'SGLT2i', atc: 'A10BK01' } },
  { id: 'carvedilol',      tipo: 'medicamento', label: 'Carvedilol',      metadados: { classe: 'BB', atc: 'C07AG02' } },
  { id: 'sacubitril_val',  tipo: 'medicamento', label: 'Sacubitril/Valsartana', metadados: { classe: 'ARNI', atc: 'C09DX04' } },
  { id: 'espironolactona', tipo: 'medicamento', label: 'Espironolactona', metadados: { classe: 'ARM', atc: 'C03DA01' } },
  { id: 'rosuvastatina',   tipo: 'medicamento', label: 'Rosuvastatina',   metadados: { classe: 'Estatina', atc: 'C10AA07' } },
  { id: 'budesonida_form', tipo: 'medicamento', label: 'Budesonida/Formoterol', metadados: { classe: 'ICS+LABA', atc: 'R03AK07' } },
  { id: 'clopidogrel',     tipo: 'medicamento', label: 'Clopidogrel',     metadados: { classe: 'Antiagregante', atc: 'B01AC04' } },
  { id: 'varfarina',       tipo: 'medicamento', label: 'Varfarina',       metadados: { classe: 'Anticoagulante', atc: 'B01AA03' } },

  // Mecanismos
  { id: 'mec_ieca',   tipo: 'mecanismo', label: 'Inibição da ECA — redução de angiotensina II e bradicinina' },
  { id: 'mec_sglt2',  tipo: 'mecanismo', label: 'Inibição cotransportador SGLT2 — glicosúria + natriurese' },
  { id: 'mec_arni',   tipo: 'mecanismo', label: 'Inibição neprilisina + BRA — efeito vasodilatador e diurético' },
  { id: 'mec_bb',     tipo: 'mecanismo', label: 'Bloqueio beta-adrenérgico — redução FC e pós-carga' },
  { id: 'mec_arm',    tipo: 'mecanismo', label: 'Antagonismo receptor mineralocorticoide — antialdosterona' },
  { id: 'mec_ics',    tipo: 'mecanismo', label: 'Corticoide inalatório — supressão inflamação eosinofílica brônquica' },
  { id: 'mec_estatina', tipo: 'mecanismo', label: 'Inibição HMG-CoA redutase — redução síntese colesterol hepático' },

  // Estudos
  { id: 'empa_reg',   tipo: 'estudo', label: 'EMPA-REG OUTCOME', metadados: { doi: '10.1056/NEJMoa1504720', nnt: 39, rrr_cv: 0.38 } },
  { id: 'dapa_hf',    tipo: 'estudo', label: 'DAPA-HF',          metadados: { doi: '10.1056/NEJMoa1911303', nnt: 21, rrr_ic: 0.26 } },
  { id: 'paradigm',   tipo: 'estudo', label: 'PARADIGM-HF',      metadados: { doi: '10.1056/NEJMoa1409077', nnt: 18 } },
  { id: 'hope_study', tipo: 'estudo', label: 'HOPE Study',       metadados: { doi: '10.1056/NEJM200001203420301', nnt: 26 } },
  { id: 'mars_study', tipo: 'estudo', label: 'MARS (Asma MART)', metadados: { nnt: 15, rrr_exacerbacao: 0.44 } },
  { id: 'ukpds',      tipo: 'estudo', label: 'UKPDS',            metadados: { doi: '10.1016/S0140-6736(98)07019-6', nnt: 12 } },
  { id: 'accord',     tipo: 'estudo', label: 'ACCORD',           metadados: { doi: '10.1056/NEJMoa0802743' } },

  // Guidelines
  { id: 'gline_esc23',  tipo: 'guideline', label: 'ESC/ESH Hypertension 2023' },
  { id: 'gline_esc_ic', tipo: 'guideline', label: 'ESC Heart Failure 2023' },
  { id: 'gline_ada25',  tipo: 'guideline', label: 'ADA Standards of Care 2025' },
  { id: 'gline_gina25', tipo: 'guideline', label: 'GINA 2025' },
  { id: 'gline_gold25', tipo: 'guideline', label: 'GOLD 2025' },
  { id: 'gline_kdigo',  tipo: 'guideline', label: 'KDIGO 2024' },
  { id: 'gline_sbd',    tipo: 'guideline', label: 'SBD 2024' },

  // Especialidades
  { id: 'cardio',   tipo: 'especialidade', label: 'Cardiologia' },
  { id: 'endocrino',tipo: 'especialidade', label: 'Endocrinologia' },
  { id: 'pneumo',   tipo: 'especialidade', label: 'Pneumologia' },
  { id: 'nefro',    tipo: 'especialidade', label: 'Nefrologia' },
  { id: 'clinica',  tipo: 'especialidade', label: 'Clínica Médica' },

  // Exames
  { id: 'ex_hba1c',   tipo: 'exame', label: 'HbA1c', metadados: { loinc: '4548-4' } },
  { id: 'ex_echo',    tipo: 'exame', label: 'Ecocardiograma', metadados: { tipo: 'imagem' } },
  { id: 'ex_creat',   tipo: 'exame', label: 'Creatinina + TFG-e', metadados: { loinc: '2160-0' } },
  { id: 'ex_bnp',     tipo: 'exame', label: 'NT-proBNP', metadados: { loinc: '33762-6' } },
  { id: 'ex_espiro',  tipo: 'exame', label: 'Espirometria', metadados: { tipo: 'funcional' } },

  // Biomarcadores
  { id: 'bm_bnp',    tipo: 'biomarcador', label: 'NT-proBNP / BNP', metadados: { corte_ic: 125 } },
  { id: 'bm_hba1c',  tipo: 'biomarcador', label: 'HbA1c', metadados: { alvo_dm2: 7.0 } },
  { id: 'bm_ldl',    tipo: 'biomarcador', label: 'LDL-c', metadados: { alvo_alto_risco: 70 } },
  { id: 'bm_feno',   tipo: 'biomarcador', label: 'FeNO (Óxido nítrico exalado)', metadados: { corte_inflamacao: 25 } },
  { id: 'bm_crp',    tipo: 'biomarcador', label: 'Proteína C-Reativa', metadados: { tipo: 'inflamatorio' } },

  // Sintomas
  { id: 'sint_dispneia', tipo: 'sintoma', label: 'Dispneia' },
  { id: 'sint_edema',    tipo: 'sintoma', label: 'Edema de membros inferiores' },
  { id: 'sint_cefaleia', tipo: 'sintoma', label: 'Cefaleia' },
  { id: 'sint_poliuria', tipo: 'sintoma', label: 'Poliúria / polidipsia' },
  { id: 'sint_tosse',    tipo: 'sintoma', label: 'Tosse seca (IECA)' },

  // Eventos adversos
  { id: 'ea_tosse_ieca',  tipo: 'evento_adverso', label: 'Tosse seca por IECA', metadados: { incidencia_pct: 15 } },
  { id: 'ea_hipok',       tipo: 'evento_adverso', label: 'Hipocalemia (diuréticos)', metadados: { risco: 'moderado' } },
  { id: 'ea_hipercalemia',tipo: 'evento_adverso', label: 'Hipercalemia (IECA+ARM)', metadados: { risco: 'alto' } },
  { id: 'ea_itu',         tipo: 'evento_adverso', label: 'ITU/candidíase (SGLT2i)', metadados: { incidencia_pct: 8 } },
  { id: 'ea_miopatia',    tipo: 'evento_adverso', label: 'Miopatia (Estatinas)', metadados: { incidencia_pct: 3 } },

  // Prognósticos
  { id: 'prog_has_cv',  tipo: 'prognostico', label: 'Risco cardiovascular HAS — RCV 10 anos' },
  { id: 'prog_dm2_dn',  tipo: 'prognostico', label: 'Nefropatia diabética — TFG declínio' },
  { id: 'prog_ic_mort', tipo: 'prognostico', label: 'Mortalidade IC — sobrevida 5 anos ~50%' },

  // Marcas comerciais
  { id: 'marca_jardiance', tipo: 'marca', label: 'Jardiance® (empagliflozina)', metadados: { lab: 'Boehringer Ingelheim' } },
  { id: 'marca_forxiga',   tipo: 'marca', label: 'Forxiga® (dapagliflozina)', metadados: { lab: 'AstraZeneca' } },
  { id: 'marca_entresto',  tipo: 'marca', label: 'Entresto® (sacubitril/valsartana)', metadados: { lab: 'Novartis' } },
  { id: 'marca_symbicort', tipo: 'marca', label: 'Symbicort® (budesonida/formoterol)', metadados: { lab: 'AstraZeneca' } },
];

const ARESTAS_BASE: ArestaGrafo[] = [
  // Diagnóstico → Diretriz
  { id: 'e1',  origem: 'I10',  destino: 'gline_esc23',  tipo: 'DIAGNOSTICO_DIRETRIZ', peso: 5 },
  { id: 'e2',  origem: 'I50',  destino: 'gline_esc_ic', tipo: 'DIAGNOSTICO_DIRETRIZ', peso: 5 },
  { id: 'e3',  origem: 'E11',  destino: 'gline_ada25',  tipo: 'DIAGNOSTICO_DIRETRIZ', peso: 5 },
  { id: 'e4',  origem: 'E11',  destino: 'gline_sbd',    tipo: 'DIAGNOSTICO_DIRETRIZ', peso: 4 },
  { id: 'e5',  origem: 'J45',  destino: 'gline_gina25', tipo: 'DIAGNOSTICO_DIRETRIZ', peso: 5 },
  { id: 'e6',  origem: 'J44',  destino: 'gline_gold25', tipo: 'DIAGNOSTICO_DIRETRIZ', peso: 5 },
  { id: 'e7',  origem: 'N18',  destino: 'gline_kdigo',  tipo: 'DIAGNOSTICO_DIRETRIZ', peso: 5 },

  // Diagnóstico → Medicamento
  { id: 'e10', origem: 'I10',  destino: 'enalapril',      tipo: 'DIAGNOSTICO_MEDICAMENTO', peso: 5, evidencia: 'A' },
  { id: 'e11', origem: 'I10',  destino: 'losartana',      tipo: 'DIAGNOSTICO_MEDICAMENTO', peso: 5, evidencia: 'A' },
  { id: 'e12', origem: 'I10',  destino: 'amlodipina',     tipo: 'DIAGNOSTICO_MEDICAMENTO', peso: 4, evidencia: 'A' },
  { id: 'e13', origem: 'E11',  destino: 'metformina',     tipo: 'DIAGNOSTICO_MEDICAMENTO', peso: 5, evidencia: 'A' },
  { id: 'e14', origem: 'E11',  destino: 'empagliflozina', tipo: 'DIAGNOSTICO_MEDICAMENTO', peso: 5, evidencia: 'A' },
  { id: 'e15', origem: 'E11',  destino: 'dapagliflozina', tipo: 'DIAGNOSTICO_MEDICAMENTO', peso: 4, evidencia: 'A' },
  { id: 'e16', origem: 'I50',  destino: 'carvedilol',     tipo: 'DIAGNOSTICO_MEDICAMENTO', peso: 5, evidencia: 'A' },
  { id: 'e17', origem: 'I50',  destino: 'sacubitril_val', tipo: 'DIAGNOSTICO_MEDICAMENTO', peso: 5, evidencia: 'A' },
  { id: 'e18', origem: 'I50',  destino: 'espironolactona',tipo: 'DIAGNOSTICO_MEDICAMENTO', peso: 5, evidencia: 'A' },
  { id: 'e19', origem: 'I50',  destino: 'dapagliflozina', tipo: 'DIAGNOSTICO_MEDICAMENTO', peso: 5, evidencia: 'A' },
  { id: 'e20', origem: 'I50',  destino: 'empagliflozina', tipo: 'DIAGNOSTICO_MEDICAMENTO', peso: 5, evidencia: 'A' },
  { id: 'e21', origem: 'J45',  destino: 'budesonida_form',tipo: 'DIAGNOSTICO_MEDICAMENTO', peso: 5, evidencia: 'A' },
  { id: 'e22', origem: 'E78',  destino: 'rosuvastatina',  tipo: 'DIAGNOSTICO_MEDICAMENTO', peso: 5, evidencia: 'A' },
  { id: 'e23', origem: 'I21',  destino: 'clopidogrel',    tipo: 'DIAGNOSTICO_MEDICAMENTO', peso: 5, evidencia: 'A' },
  { id: 'e24', origem: 'I21',  destino: 'rosuvastatina',  tipo: 'DIAGNOSTICO_MEDICAMENTO', peso: 5, evidencia: 'A' },

  // Medicamento → Mecanismo
  { id: 'e30', origem: 'enalapril',       destino: 'mec_ieca',    tipo: 'MEDICAMENTO_MECANISMO', peso: 5 },
  { id: 'e31', origem: 'ramipril',        destino: 'mec_ieca',    tipo: 'MEDICAMENTO_MECANISMO', peso: 5 },
  { id: 'e32', origem: 'empagliflozina',  destino: 'mec_sglt2',   tipo: 'MEDICAMENTO_MECANISMO', peso: 5 },
  { id: 'e33', origem: 'dapagliflozina',  destino: 'mec_sglt2',   tipo: 'MEDICAMENTO_MECANISMO', peso: 5 },
  { id: 'e34', origem: 'sacubitril_val',  destino: 'mec_arni',    tipo: 'MEDICAMENTO_MECANISMO', peso: 5 },
  { id: 'e35', origem: 'carvedilol',      destino: 'mec_bb',      tipo: 'MEDICAMENTO_MECANISMO', peso: 5 },
  { id: 'e36', origem: 'espironolactona', destino: 'mec_arm',     tipo: 'MEDICAMENTO_MECANISMO', peso: 5 },
  { id: 'e37', origem: 'budesonida_form', destino: 'mec_ics',     tipo: 'MEDICAMENTO_MECANISMO', peso: 5 },
  { id: 'e38', origem: 'rosuvastatina',   destino: 'mec_estatina',tipo: 'MEDICAMENTO_MECANISMO', peso: 5 },

  // Medicamento → Estudo
  { id: 'e40', origem: 'empagliflozina',  destino: 'empa_reg',   tipo: 'MEDICAMENTO_ESTUDO', peso: 5, doi: '10.1056/NEJMoa1504720', nnt: 39 },
  { id: 'e41', origem: 'dapagliflozina',  destino: 'dapa_hf',    tipo: 'MEDICAMENTO_ESTUDO', peso: 5, doi: '10.1056/NEJMoa1911303', nnt: 21 },
  { id: 'e42', origem: 'sacubitril_val',  destino: 'paradigm',   tipo: 'MEDICAMENTO_ESTUDO', peso: 5, doi: '10.1056/NEJMoa1409077', nnt: 18 },
  { id: 'e43', origem: 'ramipril',        destino: 'hope_study', tipo: 'MEDICAMENTO_ESTUDO', peso: 4, doi: '10.1056/NEJM200001203420301', nnt: 26 },
  { id: 'e44', origem: 'budesonida_form', destino: 'mars_study', tipo: 'MEDICAMENTO_ESTUDO', peso: 4, nnt: 15 },
  { id: 'e45', origem: 'metformina',      destino: 'ukpds',      tipo: 'MEDICAMENTO_ESTUDO', peso: 5, doi: '10.1016/S0140-6736(98)07019-6', nnt: 12 },

  // Estudo → Guideline
  { id: 'e50', origem: 'empa_reg',    destino: 'gline_ada25',  tipo: 'ESTUDO_GUIDELINE', peso: 5 },
  { id: 'e51', origem: 'dapa_hf',     destino: 'gline_esc_ic', tipo: 'ESTUDO_GUIDELINE', peso: 5 },
  { id: 'e52', origem: 'paradigm',    destino: 'gline_esc_ic', tipo: 'ESTUDO_GUIDELINE', peso: 5 },
  { id: 'e53', origem: 'mars_study',  destino: 'gline_gina25', tipo: 'ESTUDO_GUIDELINE', peso: 4 },
  { id: 'e54', origem: 'ukpds',       destino: 'gline_ada25',  tipo: 'ESTUDO_GUIDELINE', peso: 5 },

  // Medicamento → Marca (ordem não influencia recomendação clínica)
  { id: 'e60', origem: 'empagliflozina',  destino: 'marca_jardiance', tipo: 'MEDICAMENTO_MARCA', peso: 3 },
  { id: 'e61', origem: 'dapagliflozina',  destino: 'marca_forxiga',   tipo: 'MEDICAMENTO_MARCA', peso: 3 },
  { id: 'e62', origem: 'sacubitril_val',  destino: 'marca_entresto',  tipo: 'MEDICAMENTO_MARCA', peso: 3 },
  { id: 'e63', origem: 'budesonida_form', destino: 'marca_symbicort', tipo: 'MEDICAMENTO_MARCA', peso: 3 },

  // Medicamento → Evento adverso
  { id: 'e70', origem: 'enalapril',       destino: 'ea_tosse_ieca',  tipo: 'MEDICAMENTO_EVENTO_ADVERSO', peso: 4 },
  { id: 'e71', origem: 'espironolactona', destino: 'ea_hipercalemia',tipo: 'MEDICAMENTO_EVENTO_ADVERSO', peso: 4 },
  { id: 'e72', origem: 'empagliflozina',  destino: 'ea_itu',         tipo: 'MEDICAMENTO_EVENTO_ADVERSO', peso: 3 },
  { id: 'e73', origem: 'rosuvastatina',   destino: 'ea_miopatia',    tipo: 'MEDICAMENTO_EVENTO_ADVERSO', peso: 2 },

  // Sintoma → Diagnóstico
  { id: 'e80', origem: 'sint_dispneia', destino: 'I50',  tipo: 'SINTOMA_DIAGNOSTICO', peso: 5 },
  { id: 'e81', origem: 'sint_edema',    destino: 'I50',  tipo: 'SINTOMA_DIAGNOSTICO', peso: 4 },
  { id: 'e82', origem: 'sint_cefaleia', destino: 'I10',  tipo: 'SINTOMA_DIAGNOSTICO', peso: 3 },
  { id: 'e83', origem: 'sint_poliuria', destino: 'E11',  tipo: 'SINTOMA_DIAGNOSTICO', peso: 5 },
  { id: 'e84', origem: 'sint_tosse',    destino: 'J44',  tipo: 'SINTOMA_DIAGNOSTICO', peso: 4 },

  // Biomarcador → Diagnóstico
  { id: 'e90', origem: 'bm_bnp',   destino: 'I50', tipo: 'BIOMARCADOR_DIAGNOSTICO', peso: 5 },
  { id: 'e91', origem: 'bm_hba1c', destino: 'E11', tipo: 'BIOMARCADOR_DIAGNOSTICO', peso: 5 },
  { id: 'e92', origem: 'bm_ldl',   destino: 'E78', tipo: 'BIOMARCADOR_DIAGNOSTICO', peso: 4 },
  { id: 'e93', origem: 'bm_feno',  destino: 'J45', tipo: 'BIOMARCADOR_DIAGNOSTICO', peso: 4 },

  // Exame → Diagnóstico
  { id: 'e100', origem: 'ex_hba1c',  destino: 'E11', tipo: 'EXAME_DIAGNOSTICO', peso: 5 },
  { id: 'e101', origem: 'ex_echo',   destino: 'I50', tipo: 'EXAME_DIAGNOSTICO', peso: 5 },
  { id: 'e102', origem: 'ex_bnp',    destino: 'I50', tipo: 'EXAME_DIAGNOSTICO', peso: 5 },
  { id: 'e103', origem: 'ex_espiro', destino: 'J45', tipo: 'EXAME_DIAGNOSTICO', peso: 5 },
  { id: 'e104', origem: 'ex_espiro', destino: 'J44', tipo: 'EXAME_DIAGNOSTICO', peso: 5 },
  { id: 'e105', origem: 'ex_creat',  destino: 'N18', tipo: 'EXAME_DIAGNOSTICO', peso: 5 },

  // Prognóstico
  { id: 'e110', origem: 'I10',  destino: 'prog_has_cv',  tipo: 'PACIENTE_PROGNOSTICO', peso: 4 },
  { id: 'e111', origem: 'E11',  destino: 'prog_dm2_dn',  tipo: 'PACIENTE_PROGNOSTICO', peso: 4 },
  { id: 'e112', origem: 'I50',  destino: 'prog_ic_mort', tipo: 'PACIENTE_PROGNOSTICO', peso: 5 },
];

// ══════════════════════════════════════════════════════════════
// CONSTRUTOR DO GRAFO
// ══════════════════════════════════════════════════════════════

let _grafo: MedicalKnowledgeGraph | null = null;

export function gerarMapaConhecimento(): MedicalKnowledgeGraph {
  if (_grafo) return _grafo;
  _grafo = {
    nos: NOS_BASE,
    arestas: ARESTAS_BASE,
    versao: '1.0.0-Phase20',
    gerado_em: new Date().toISOString(),
    total_nos: NOS_BASE.length,
    total_arestas: ARESTAS_BASE.length,
  };
  return _grafo;
}

// ══════════════════════════════════════════════════════════════
// BUSCA DE RELACIONAMENTOS
// ══════════════════════════════════════════════════════════════

export interface RelacionamentoResultado {
  no_origem: NoGrafo;
  no_destino: NoGrafo;
  aresta: ArestaGrafo;
}

export function buscarRelacionamentos(
  id: string,
  tipo_relacao?: TipoRelacao,
  profundidade: 1 | 2 | 3 = 1,
): RelacionamentoResultado[] {
  const grafo = gerarMapaConhecimento();
  const nosMap = new Map(grafo.nos.map(n => [n.id, n]));
  const visitados = new Set<string>();

  function buscar(noId: string, depth: number): RelacionamentoResultado[] {
    if (depth > profundidade || visitados.has(noId)) return [];
    visitados.add(noId);

    const arestas = grafo.arestas.filter(a =>
      (a.origem === noId || a.destino === noId) &&
      (!tipo_relacao || a.tipo === tipo_relacao),
    );

    const resultados: RelacionamentoResultado[] = arestas.map(a => ({
      no_origem: nosMap.get(a.origem)!,
      no_destino: nosMap.get(a.destino)!,
      aresta: a,
    })).filter(r => r.no_origem && r.no_destino);

    if (depth < profundidade) {
      const vizinhos = arestas.map(a => a.origem === noId ? a.destino : a.origem);
      vizinhos.forEach(v => resultados.push(...buscar(v, depth + 1)));
    }

    return resultados;
  }

  return buscar(id, 1);
}

// ══════════════════════════════════════════════════════════════
// CENTRALIDADE DOS NÓS
// ══════════════════════════════════════════════════════════════

export interface CentralidadeResultado {
  no: NoGrafo;
  grau: number;
  peso_total: number;
  centralidade_normalizada: number;
  rank: number;
}

export function calcularCentralidade(topN = 10): CentralidadeResultado[] {
  const grafo = gerarMapaConhecimento();
  const nosMap = new Map(grafo.nos.map(n => [n.id, n]));
  const grauMap = new Map<string, { grau: number; peso: number }>();

  grafo.nos.forEach(n => grauMap.set(n.id, { grau: 0, peso: 0 }));
  grafo.arestas.forEach(a => {
    const o = grauMap.get(a.origem); if (o) { o.grau++; o.peso += a.peso; }
    const d = grauMap.get(a.destino); if (d) { d.grau++; d.peso += a.peso; }
  });

  const maxGrau = Math.max(...Array.from(grauMap.values()).map(v => v.grau));
  const resultados: CentralidadeResultado[] = grafo.nos.map(no => {
    const vals = grauMap.get(no.id) ?? { grau: 0, peso: 0 };
    return {
      no,
      grau: vals.grau,
      peso_total: vals.peso,
      centralidade_normalizada: maxGrau > 0 ? Math.round((vals.grau / maxGrau) * 100) : 0,
      rank: 0,
    };
  });

  resultados.sort((a, b) => b.centralidade_normalizada - a.centralidade_normalizada);
  resultados.forEach((r, i) => { r.rank = i + 1; });

  return resultados.slice(0, topN);
}

// ══════════════════════════════════════════════════════════════
// LACUNAS DE CONHECIMENTO
// ══════════════════════════════════════════════════════════════

export interface LacunaConhecimento {
  tipo: string;
  descricao: string;
  nos_afetados: string[];
  prioridade: 'alta' | 'media' | 'baixa';
  sugestao: string;
}

export function encontrarLacunas(): LacunaConhecimento[] {
  const grafo = gerarMapaConhecimento();
  const lacunas: LacunaConhecimento[] = [];
  const nosMap = new Map(grafo.nos.map(n => [n.id, n]));
  const nosComArestas = new Set([
    ...grafo.arestas.map(a => a.origem),
    ...grafo.arestas.map(a => a.destino),
  ]);

  // Nós isolados
  const nosIsolados = grafo.nos.filter(n => !nosComArestas.has(n.id));
  if (nosIsolados.length) {
    lacunas.push({
      tipo: 'nos_isolados',
      descricao: 'Entidades sem relacionamentos mapeados no grafo',
      nos_afetados: nosIsolados.map(n => n.label),
      prioridade: 'alta',
      sugestao: 'Mapear relacionamentos para entidades isoladas — podem representar dados clínicos não conectados',
    });
  }

  // Diagnósticos sem guideline
  const diagnosticos = grafo.nos.filter(n => n.tipo === 'diagnostico');
  const diagComGuide = new Set(
    grafo.arestas.filter(a => a.tipo === 'DIAGNOSTICO_DIRETRIZ').map(a => a.origem),
  );
  const diagSemGuide = diagnosticos.filter(d => !diagComGuide.has(d.id));
  if (diagSemGuide.length) {
    lacunas.push({
      tipo: 'diagnostico_sem_diretriz',
      descricao: 'Diagnósticos sem diretriz mapeada',
      nos_afetados: diagSemGuide.map(n => n.label),
      prioridade: 'alta',
      sugestao: 'Mapear diretrizes internacionais para cada CID ativo no sistema',
    });
  }

  // Medicamentos sem estudos
  const meds = grafo.nos.filter(n => n.tipo === 'medicamento');
  const medsComEstudo = new Set(grafo.arestas.filter(a => a.tipo === 'MEDICAMENTO_ESTUDO').map(a => a.origem));
  const medsSemEstudo = meds.filter(m => !medsComEstudo.has(m.id));
  if (medsSemEstudo.length) {
    lacunas.push({
      tipo: 'medicamento_sem_estudo',
      descricao: 'Medicamentos sem estudos clínicos referenciados',
      nos_afetados: medsSemEstudo.map(n => n.label),
      prioridade: 'media',
      sugestao: 'Adicionar referências de RCTs de fase III ou meta-análises para cada molécula',
    });
  }

  // Eventos adversos sem incidência
  const eas = grafo.nos.filter(n => n.tipo === 'evento_adverso' && !n.metadados?.['incidencia_pct']);
  if (eas.length) {
    lacunas.push({
      tipo: 'evento_adverso_sem_incidencia',
      descricao: 'Eventos adversos sem dados de incidência quantificados',
      nos_afetados: eas.map(n => n.label),
      prioridade: 'baixa',
      sugestao: 'Enriquecer metadados com taxa de incidência baseada em RCTs',
    });
  }

  return lacunas;
}

// ══════════════════════════════════════════════════════════════
// DETECÇÃO DE CONFLITOS
// ══════════════════════════════════════════════════════════════

export interface ConflitoGrafo {
  tipo: string;
  nos_envolvidos: string[];
  descricao: string;
  severidade: 'critica' | 'moderada' | 'informativa';
  resolucao: string;
}

export function detectarConflitos(nosIds: string[]): ConflitoGrafo[] {
  const conflitos: ConflitoGrafo[] = [];
  const grafo = gerarMapaConhecimento();

  // Conflito IECA + BRA simultâneos
  const temIECA = nosIds.includes('enalapril') || nosIds.includes('ramipril');
  const temBRA  = nosIds.includes('losartana');
  if (temIECA && temBRA) {
    conflitos.push({
      tipo: 'duplo_bloqueio_sraa',
      nos_envolvidos: ['enalapril', 'losartana'],
      descricao: 'Duplo bloqueio do SRAA — IECA + BRA não recomendado (AHA/ACC)',
      severidade: 'critica',
      resolucao: 'Escolher IECA ou BRA, não ambos. ARNI (sacubitril/valsartana) é alternativa para IC-FEr.',
    });
  }

  // Estatina + Eventos adversos miopatia
  const temEstatina = nosIds.includes('rosuvastatina');
  const temFibrato = false; // placeholder
  if (temEstatina && temFibrato) {
    conflitos.push({
      tipo: 'estatina_fibrato',
      nos_envolvidos: ['rosuvastatina'],
      descricao: 'Combinação estatina + fibrato — risco aumentado de miopatia',
      severidade: 'moderada',
      resolucao: 'Monitorar CPK mensalmente; reduzir dose de estatina; considerar monoterapia',
    });
  }

  // IECA + Hipercalemia (espironolactona)
  const temARM = nosIds.includes('espironolactona');
  if (temIECA && temARM) {
    conflitos.push({
      tipo: 'ieca_arm_hipercalemia',
      nos_envolvidos: ['enalapril', 'espironolactona'],
      descricao: 'IECA + ARM — monitorar potássio (risco de hipercalemia)',
      severidade: 'moderada',
      resolucao: 'Monitorar K+ a cada 1–2 semanas nas primeiras 4 semanas; manter K+ < 5,5 mEq/L',
    });
  }

  return conflitos;
}

// ══════════════════════════════════════════════════════════════
// DADOS PARA VISUALIZAÇÃO
// ══════════════════════════════════════════════════════════════

export interface DadosVisualizacao {
  nos: { id: string; label: string; tipo: TipoEntidade; centralidade: number; x?: number; y?: number }[];
  arestas: { origem: string; destino: string; tipo: TipoRelacao; peso: PesoRelacao }[];
  stats: {
    total_nos: number;
    total_arestas: number;
    por_tipo: Record<string, number>;
    densidade: number;
  };
}

export function prepararVisualizacao(filtro_tipo?: TipoEntidade[]): DadosVisualizacao {
  const grafo = gerarMapaConhecimento();
  const centralidades = calcularCentralidade(100);
  const centralMap = new Map(centralidades.map(c => [c.no.id, c.centralidade_normalizada]));

  const nosFiltrados = filtro_tipo
    ? grafo.nos.filter(n => filtro_tipo.includes(n.tipo))
    : grafo.nos;

  const idsNosFiltrados = new Set(nosFiltrados.map(n => n.id));
  const arestasFiltradas = grafo.arestas.filter(
    a => idsNosFiltrados.has(a.origem) && idsNosFiltrados.has(a.destino),
  );

  const porTipo: Record<string, number> = {};
  nosFiltrados.forEach(n => { porTipo[n.tipo] = (porTipo[n.tipo] ?? 0) + 1; });

  const nMax = nosFiltrados.length;
  const densidade = nMax > 1 ? Math.round((arestasFiltradas.length / (nMax * (nMax - 1))) * 1000) / 10 : 0;

  // Layout circular por tipo
  const tiposPosicao: Record<string, { cx: number; cy: number; r: number }> = {
    diagnostico:     { cx: 400, cy: 300, r: 180 },
    medicamento:     { cx: 400, cy: 300, r: 320 },
    guideline:       { cx: 400, cy: 300, r: 440 },
    mecanismo:       { cx: 400, cy: 300, r: 260 },
    estudo:          { cx: 400, cy: 300, r: 380 },
    biomarcador:     { cx: 400, cy: 300, r: 480 },
    sintoma:         { cx: 400, cy: 300, r: 500 },
    exame:           { cx: 400, cy: 300, r: 520 },
    especialidade:   { cx: 400, cy: 300, r: 540 },
    evento_adverso:  { cx: 400, cy: 300, r: 460 },
    prognostico:     { cx: 400, cy: 300, r: 420 },
    marca:           { cx: 400, cy: 300, r: 360 },
    cid:             { cx: 400, cy: 300, r: 200 },
    laboratorio:     { cx: 400, cy: 300, r: 480 },
  };

  const tipoContagem: Record<string, number> = {};
  const nosComPosicao = nosFiltrados.map(no => {
    const pos = tiposPosicao[no.tipo] ?? { cx: 400, cy: 300, r: 300 };
    const count = tipoContagem[no.tipo] ?? 0;
    const total = porTipo[no.tipo] ?? 1;
    const angulo = (count / total) * 2 * Math.PI - Math.PI / 2;
    tipoContagem[no.tipo] = count + 1;
    return {
      id: no.id,
      label: no.label,
      tipo: no.tipo,
      centralidade: centralMap.get(no.id) ?? 0,
      x: Math.round(pos.cx + pos.r * Math.cos(angulo)),
      y: Math.round(pos.cy + pos.r * Math.sin(angulo)),
    };
  });

  return {
    nos: nosComPosicao,
    arestas: arestasFiltradas.map(a => ({ origem: a.origem, destino: a.destino, tipo: a.tipo, peso: a.peso })),
    stats: { total_nos: nosFiltrados.length, total_arestas: arestasFiltradas.length, por_tipo: porTipo, densidade },
  };
}
