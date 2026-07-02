// ============================================================
// PRESCREVE-AI — Scientific Committee Engine
// ============================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import type { NivelEvidencia, GrauRecomendacao } from "./governance";

// ─── Tipos ───────────────────────────────────────────────────

export type Titulacao =
  | "Especialista"
  | "Mestre"
  | "Doutor"
  | "Doutora"
  | "Livre-Docente"
  | "Professor Titular"
  | "Pos-Doutor";

export type StatusValidacaoComite = "pendente" | "em_revisao" | "aprovado" | "rejeitado" | "revisao_solicitada";

export interface Especialista {
  id: string;
  nome: string;
  especialidade: string;
  sub_especialidade?: string;
  crm: string;
  uf_crm: string;
  titulacao: Titulacao;
  instituicao: string;
  departamento?: string;
  area_atuacao: string[];
  orcid?: string;
  lattes_url?: string;
  email_institucional?: string;
  publicacoes_indexadas?: number;
  membro_desde: string;
  ativo: boolean;
  initials: string;
  cor_avatar: string;
}

export interface RevisorParticipacao {
  especialista_id: string;
  data_revisao: string;
  parecer: string;
  score: number;
  aprovado: boolean;
  pendencias: string[];
}

export interface HistoricoVersaoValidacao {
  versao: string;
  data: string;
  status: StatusValidacaoComite;
  responsavel: string;
  descricao: string;
}

export interface ValidacaoRecomendacao {
  id: string;
  guideline_id: string;
  guideline_sigla: string;
  guideline_titulo: string;
  versao: string;
  condicao: string;
  area: string;
  recomendacao_titulo: string;
  recomendacao_descricao: string;
  nivel_evidencia: NivelEvidencia;
  grau_recomendacao: GrauRecomendacao;
  revisores: RevisorParticipacao[];
  status: StatusValidacaoComite;
  parecer_coletivo?: string;
  data_abertura: string;
  data_conclusao?: string;
  proxima_revisao?: string;
  versao_recomendacao: string;
  historico_versoes: HistoricoVersaoValidacao[];
}

// ─── Seeds ───────────────────────────────────────────────────

const ESPECIALISTAS_SEED: Especialista[] = [
  { id: "e1", nome: "Dr. Carlos Eduardo Pereira", especialidade: "Cardiologia", sub_especialidade: "Insuficiencia Cardiaca", crm: "123456", uf_crm: "SP", titulacao: "Doutor", instituicao: "InCor - Instituto do Coracao FMUSP", departamento: "Unidade de IC e Transplante", area_atuacao: ["Insuficiencia Cardiaca", "HAS", "Dislipidemia", "Cardiologia Preventiva"], orcid: "0000-0002-1234-5678", publicacoes_indexadas: 87, membro_desde: "2022-01-01", ativo: true, initials: "CE", cor_avatar: "bg-blue-600" },
  { id: "e2", nome: "Dra. Ana Paula Souza", especialidade: "Nefrologia", sub_especialidade: "Doenca Renal Cronica", crm: "234567", uf_crm: "SP", titulacao: "Doutora", instituicao: "Hospital das Clinicas FMUSP", departamento: "Divisao de Nefrologia", area_atuacao: ["DRC", "HAS renovascular", "Nefropatia diabetica"], orcid: "0000-0003-2345-6789", publicacoes_indexadas: 54, membro_desde: "2022-01-01", ativo: true, initials: "AP", cor_avatar: "bg-teal-600" },
  { id: "e3", nome: "Dra. Fernanda Lima", especialidade: "Endocrinologia", sub_especialidade: "Diabetes e Obesidade", crm: "345678", uf_crm: "RJ", titulacao: "Livre-Docente", instituicao: "UERJ - Universidade do Estado do Rio de Janeiro", departamento: "Departamento de Medicina Interna", area_atuacao: ["DM2", "Obesidade", "Sindrome Metabolica", "Tireoide"], orcid: "0000-0001-3456-7890", publicacoes_indexadas: 112, membro_desde: "2021-06-01", ativo: true, initials: "FL", cor_avatar: "bg-purple-600" },
  { id: "e4", nome: "Dr. Roberto Nunes", especialidade: "Pneumologia", sub_especialidade: "Asma e DPOC", crm: "456789", uf_crm: "SP", titulacao: "Doutor", instituicao: "Universidade Federal de Sao Paulo (UNIFESP)", departamento: "Disciplina de Pneumologia", area_atuacao: ["Asma", "DPOC", "Tabagismo", "Sono e Respiracao"], publicacoes_indexadas: 63, membro_desde: "2022-03-01", ativo: true, initials: "RN", cor_avatar: "bg-sky-600" },
  { id: "e5", nome: "Dr. Paulo Mendes", especialidade: "Cardiologia", sub_especialidade: "Aterosclerose e Lipides", crm: "567890", uf_crm: "MG", titulacao: "Professor Titular", instituicao: "UFMG - Universidade Federal de Minas Gerais", departamento: "Departamento de Clinica Medica", area_atuacao: ["Dislipidemia", "Risco Cardiovascular", "Prevencao Primaria e Secundaria"], orcid: "0000-0004-5678-9012", publicacoes_indexadas: 145, membro_desde: "2021-01-01", ativo: true, initials: "PM", cor_avatar: "bg-rose-600" },
  { id: "e6", nome: "Dra. Mariana Costa", especialidade: "Farmacologia Clinica", crm: "678901", uf_crm: "SP", titulacao: "Doutora", instituicao: "Anvisa - Consultora Tecnica", departamento: "Farmacovigilancia", area_atuacao: ["Seguranca de medicamentos", "Interacoes farmacologicas", "Farmacovigilancia"], publicacoes_indexadas: 38, membro_desde: "2023-01-01", ativo: true, initials: "MC", cor_avatar: "bg-emerald-600" },
];

const VALIDACOES_SEED: ValidacaoRecomendacao[] = [
  { id: "v1", guideline_id: "g1", guideline_sigla: "DBHA-7", guideline_titulo: "7a Diretriz Brasileira de Hipertensao Arterial", versao: "7.0", condicao: "HAS", area: "cardiologia", recomendacao_titulo: "Meta pressorica < 130/80 mmHg", recomendacao_descricao: "Reducao da pressao arterial para < 130/80 mmHg na maioria dos pacientes hipertensos adultos para reducao de eventos cardiovasculares maiores.", nivel_evidencia: "A", grau_recomendacao: "I", status: "aprovado", parecer_coletivo: "Recomendacao aprovada por unanimidade. Meta baseada em evidencias solidas do SPRINT e meta-analises de grande porte. Aplicar com cautela em idosos frageis e pacientes com hipotensao postural.", data_abertura: "2024-01-10", data_conclusao: "2024-02-05", proxima_revisao: "2026-01-01", versao_recomendacao: "v7.0-r1", revisores: [{ especialista_id: "e1", data_revisao: "2024-01-25", parecer: "Concordo com a meta. Ressalvo que em idosos > 80 anos a meta pode ser < 140/90 mmHg para evitar hipotensao.", score: 9, aprovado: true, pendencias: [] }, { especialista_id: "e2", data_revisao: "2024-02-01", parecer: "Do ponto de vista renal, endosso a meta. Monitorar creatinina e eletrolitos nas primeiras semanas apos intensificacao.", score: 9, aprovado: true, pendencias: ["Adicionar nota sobre monitorizacao renal"] }, { especialista_id: "e5", data_revisao: "2024-02-03", parecer: "Meta adequada. A combinacao terapeutica precoce aumenta aderencia e eficacia.", score: 10, aprovado: true, pendencias: [] }], historico_versoes: [{ versao: "v7.0-r1", data: "2024-02-05", status: "aprovado", responsavel: "Comite Cientifico", descricao: "Aprovacao apos revisao por 3 especialistas (unanimidade)" }, { versao: "v6.0-r1", data: "2021-03-01", status: "aprovado", responsavel: "Comite Cientifico", descricao: "Meta anterior < 140/90 mmHg - substituida por evidencias SPRINT" }] },
  { id: "v2", guideline_id: "g2", guideline_sigla: "ADA 2024", guideline_titulo: "Standards of Medical Care in Diabetes 2024", versao: "2024", condicao: "DM2", area: "endocrinologia", recomendacao_titulo: "Metformina como 1a linha em DM2", recomendacao_descricao: "Metformina permanece como farmaco de primeira linha no DM2 sem contraindicacoes, com beneficio cardiovascular e renal demonstrado.", nivel_evidencia: "A", grau_recomendacao: "I", status: "aprovado", parecer_coletivo: "Consenso unanime. Metformina mantem sua posicao central no manejo do DM2. Contraindicar em TFG < 30.", data_abertura: "2024-01-05", data_conclusao: "2024-01-30", proxima_revisao: "2025-06-01", versao_recomendacao: "v2024-r1", revisores: [{ especialista_id: "e3", data_revisao: "2024-01-20", parecer: "Recomendacao solida baseada em UKPDS. Adicionar que metformina XR melhora tolerancia GI.", score: 10, aprovado: true, pendencias: ["Mencionar formulacao XR como alternativa"] }, { especialista_id: "e6", data_revisao: "2024-01-28", parecer: "Do ponto de vista farmacologico, endosso. Alertar sobre interacao com contraste iodado.", score: 9, aprovado: true, pendencias: ["Incluir alerta de contraste iodado"] }], historico_versoes: [{ versao: "v2024-r1", data: "2024-01-30", status: "aprovado", responsavel: "Comite Cientifico", descricao: "Reafirmacao da 1a linha com atualizacoes de seguranca" }] },
  { id: "v3", guideline_id: "g2", guideline_sigla: "ADA 2024", guideline_titulo: "Standards of Medical Care in Diabetes 2024", versao: "2024", condicao: "DM2", area: "endocrinologia", recomendacao_titulo: "SGLT-2 em DM2 + ICC / DRC", recomendacao_descricao: "Inibidores SGLT-2 indicados em DM2 com IC ou DRC, independentemente do controle glicemico, pelos beneficios cardiovasculares e renais documentados.", nivel_evidencia: "A", grau_recomendacao: "I", status: "em_revisao", data_abertura: "2024-06-01", proxima_revisao: "2024-09-01", versao_recomendacao: "v2024-r2", revisores: [{ especialista_id: "e3", data_revisao: "2024-06-20", parecer: "Endosso a indicacao. Ressalvo a necessidade de ajuste de dose em TFG < 45.", score: 9, aprovado: true, pendencias: ["Esclarecer dose em TFG 30-45"] }, { especialista_id: "e2", data_revisao: "2024-07-01", parecer: "Do ponto nefroprotector, SGLT-2 e obrigatorio em DRC + DM2 com TFG >= 20. Precisamos definir limiar de TFG para inicio.", score: 8, aprovado: false, pendencias: ["Definir TFG minimo para inicio", "Detalhar monitorizacao renal apos inicio"] }], historico_versoes: [{ versao: "v2024-r2", data: "2024-06-01", status: "em_revisao", responsavel: "Comite Cientifico", descricao: "Em revisao - pendencias de dois especialistas" }] },
  { id: "v4", guideline_id: "g4", guideline_sigla: "ESC-HF 2021", guideline_titulo: "ESC Guidelines for Heart Failure 2021", versao: "2021", condicao: "ICC", area: "cardiologia", recomendacao_titulo: "Quarteto terapeutico na ICFEr", recomendacao_descricao: "Uso de IECA/ARNI + betabloqueador + ARM + SGLT-2 em todos os pacientes com ICFEr sintomatica (NYHA II-IV) e FEVE <= 40%.", nivel_evidencia: "A", grau_recomendacao: "I", status: "aprovado", parecer_coletivo: "Aprovado com recomendacao de titulacao sequencial monitorada. O quarteto reduz mortalidade de forma aditiva.", data_abertura: "2023-09-01", data_conclusao: "2023-10-15", proxima_revisao: "2025-09-01", versao_recomendacao: "v2021-r2", revisores: [{ especialista_id: "e1", data_revisao: "2023-09-20", parecer: "Recomendacao fundamental. Enfatizar a importancia da titulacao sequencial e monitorizacao de K+ com ARM.", score: 10, aprovado: true, pendencias: [] }, { especialista_id: "e2", data_revisao: "2023-10-01", parecer: "Atencao renal ao combinar IECA/BRA + ARM + SGLT-2. Monitorar TFG e K+ a cada 2-4 semanas no inicio.", score: 9, aprovado: true, pendencias: ["Protocolo de monitorizacao renal e eletrolitica"] }, { especialista_id: "e6", data_revisao: "2023-10-10", parecer: "Interacoes farmacologicas relevantes. Evitar AINEs neste contexto.", score: 9, aprovado: true, pendencias: [] }], historico_versoes: [{ versao: "v2021-r2", data: "2023-10-15", status: "aprovado", responsavel: "Comite Cientifico", descricao: "Atualizacao para incluir SGLT-2 como 4o pilar" }, { versao: "v2021-r1", data: "2021-09-01", status: "aprovado", responsavel: "Comite Cientifico", descricao: "Versao inicial com tripla terapia (sem SGLT-2)" }] },
  { id: "v5", guideline_id: "g3", guideline_sigla: "GINA 2023", guideline_titulo: "Diretrizes para Manejo da Asma - GINA 2023", versao: "2023", condicao: "Asma", area: "pneumologia", recomendacao_titulo: "ICS-formoterol SOS em asma leve", recomendacao_descricao: "Substituicao do SABA isolado por ICS-formoterol como terapia de alivio preferencial em passos 1 e 2 da GINA.", nivel_evidencia: "A", grau_recomendacao: "I", status: "revisao_solicitada", data_abertura: "2023-07-01", versao_recomendacao: "v2023-r1", revisores: [{ especialista_id: "e4", data_revisao: "2023-08-15", parecer: "Recomendacao correta, mas aplicar com cautela em pacientes com sobreposicao DPOC-Asma (ACO). Necessario criterio de diferenciacao.", score: 8, aprovado: false, pendencias: ["Criterio para exclusao em ACO", "Dose maxima de formoterol por dia"] }], historico_versoes: [{ versao: "v2023-r1", data: "2023-07-01", status: "revisao_solicitada", responsavel: "Dr. Roberto Nunes", descricao: "Pendencias identificadas - revisao necessaria antes de aprovacao" }] },
];

// ─── Storage ──────────────────────────────────────────────────

const KEY_ESP = "prescreve_ai_comite_especialistas_v1";
const KEY_VAL = "prescreve_ai_comite_validacoes_v1";

function load<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch {}
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

function save<T>(key: string, data: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Hook ─────────────────────────────────────────────────────

export function useComite() {
  const [especialistas, setEspecialistas] = useState<Especialista[]>([]);
  const [validacoes,    setValidacoes]    = useState<ValidacaoRecomendacao[]>([]);
  const [loaded,        setLoaded]        = useState(false);

  useEffect(() => {
    setEspecialistas(load(KEY_ESP, ESPECIALISTAS_SEED));
    setValidacoes(   load(KEY_VAL, VALIDACOES_SEED));
    setLoaded(true);
  }, []);

  const aprovarValidacao = useCallback((id: string) => {
    setValidacoes(prev => {
      const next = prev.map(v => v.id !== id ? v : {
        ...v, status: "aprovado" as StatusValidacaoComite, data_conclusao: new Date().toISOString(),
        historico_versoes: [{ versao: v.versao_recomendacao, data: new Date().toISOString(), status: "aprovado" as StatusValidacaoComite, responsavel: "Comite Cientifico", descricao: "Aprovado pelo comite" }, ...v.historico_versoes],
      });
      save(KEY_VAL, next);
      return next;
    });
  }, []);

  const rejeitarValidacao = useCallback((id: string, motivo: string) => {
    setValidacoes(prev => {
      const next = prev.map(v => v.id !== id ? v : {
        ...v, status: "rejeitado" as StatusValidacaoComite, parecer_coletivo: motivo,
        historico_versoes: [{ versao: v.versao_recomendacao, data: new Date().toISOString(), status: "rejeitado" as StatusValidacaoComite, responsavel: "Comite Cientifico", descricao: motivo }, ...v.historico_versoes],
      });
      save(KEY_VAL, next);
      return next;
    });
  }, []);

  const solicitarRevisao = useCallback((id: string, pendencias: string[]) => {
    setValidacoes(prev => {
      const next = prev.map(v => v.id !== id ? v : {
        ...v, status: "revisao_solicitada" as StatusValidacaoComite,
        historico_versoes: [{ versao: v.versao_recomendacao, data: new Date().toISOString(), status: "revisao_solicitada" as StatusValidacaoComite, responsavel: "Comite Cientifico", descricao: `Revisao solicitada: ${pendencias.join("; ")}` }, ...v.historico_versoes],
      });
      save(KEY_VAL, next);
      return next;
    });
  }, []);

  const aprovadas  = validacoes.filter(v => v.status === "aprovado").length;
  const pendentes  = validacoes.filter(v => v.status === "pendente" || v.status === "em_revisao").length;
  const rejeitadas = validacoes.filter(v => v.status === "rejeitado").length;

  return { especialistas, validacoes, loaded, aprovarValidacao, rejeitarValidacao, solicitarRevisao, aprovadas, pendentes, rejeitadas };
}

// ─── Helpers visuais ──────────────────────────────────────────

export const STATUS_VAL_META: Record<StatusValidacaoComite, { label: string; cls: string; dot: string }> = {
  pendente:           { label: "Pendente",        cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",        dot: "bg-slate-400"  },
  em_revisao:         { label: "Em revisao",      cls: "bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400",       dot: "bg-blue-500"   },
  aprovado:           { label: "Aprovado",        cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",      dot: "bg-green-500"  },
  rejeitado:          { label: "Rejeitado",       cls: "bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400",        dot: "bg-red-500"    },
  revisao_solicitada: { label: "Rev. solicitada", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",      dot: "bg-amber-400"  },
};

export const AREA_BADGE: Record<string, string> = {
  cardiologia:    "bg-rose-100   text-rose-700   dark:bg-rose-900/30   dark:text-rose-400",
  endocrinologia: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  pneumologia:    "bg-sky-100    text-sky-700    dark:bg-sky-900/30    dark:text-sky-400",
  nefrologia:     "bg-teal-100   text-teal-700   dark:bg-teal-900/30   dark:text-teal-400",
};

export const NIVEL_COLOR_COMITE: Record<string, string> = {
  A: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  B: "bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400",
  C: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export const GRAU_COLOR_COMITE: Record<string, string> = {
  I:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  IIa: "bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400",
  IIb: "bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400",
  III: "bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400",
};
