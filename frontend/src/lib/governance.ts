// ============================================================
// PRESCREVE-AI — Scientific Governance Engine
// Versionamento · Auditoria · Revisão · Atualizações científicas
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Tipos ───────────────────────────────────────────────────

export type NivelEvidencia = 'A' | 'B' | 'C';
export type GrauRecomendacao = 'I' | 'IIa' | 'IIb' | 'III';
export type GuidelineStatus = 'vigente' | 'em_revisao' | 'obsoleta' | 'aguardando';
export type ReviewStatus = 'pendente' | 'aprovado' | 'rejeitado' | 'revisao_solicitada';
export type UpdateImpacto = 'baixo' | 'moderado' | 'alto' | 'critico';
export type AuditTipo =
  | 'guideline_criado'
  | 'guideline_atualizado'
  | 'versao_publicada'
  | 'revisao_aprovada'
  | 'revisao_rejeitada'
  | 'alerta_gerado'
  | 'atualizacao_importada';

// ── Alteração individual numa versão ─────────────────────────

export interface GuidelineChange {
  campo: string;
  anterior: string;
  novo: string;
  justificativa?: string;
}

// ── Versão específica de uma diretriz ────────────────────────

export interface GuidelineVersao {
  id: string;
  numero: string;           // "7.0", "2024", "2.1" …
  data_publicacao: string;
  data_insercao_sistema: string;
  resumo: string;
  alteracoes: GuidelineChange[];
  autor_insercao: string;
  revisores: string[];
  status_revisao: ReviewStatus;
  evidencias: EvidenciaVersao[];
}

// ── Evidência associada à versão ─────────────────────────────

export type StatusValidacao = 'validado' | 'pendente' | 'em_revisao' | 'obsoleto';

export interface EvidenciaVersao {
  tipo: 'ensaio_clinico' | 'meta_analise' | 'revisao_sistematica' | 'consenso' | 'diretriz';
  titulo: string;
  autores?: string;
  ano: number;
  revista?: string;
  doi?: string;
  pmid?: string;
  is_rct: boolean;
  is_meta_analise: boolean;
  n_pacientes?: number;
  duracao_seguimento?: string;
  desfecho_primario?: string;
  reducao_risco_relativo?: string;
  nnt?: number;
  nivel: NivelEvidencia;
  grau: GrauRecomendacao;
  resumo: string;
  // Recomendação clínica rastreável
  diagnostico?: string;
  conduta?: string;
  status_validacao: StatusValidacao;
  data_revisao?: string;
  versao_recomendacao?: string;
}

// ── Diretriz completa (cabeçalho + versões) ──────────────────

export interface Guideline {
  id: string;
  titulo: string;
  sigla?: string;
  sociedade: string;
  area: string;             // 'cardiologia', 'endocrinologia' …
  condicao: string;         // 'HAS', 'DM2' …
  status: GuidelineStatus;
  versao_atual: string;
  ano_publicacao?: number;
  url_oficial?: string;
  doi_referencia?: string;
  data_ultima_revisao?: string;
  data_proxima_revisao?: string;
  nivel_validacao?: 'validado' | 'em_revisao' | 'pendente' | 'desatualizado';
  responsavel_interno: string;
  versoes: GuidelineVersao[];
  tags: string[];
}

// ── Revisão por especialista ──────────────────────────────────

export interface ExpertReview {
  id: string;
  guideline_id: string;
  guideline_titulo: string;
  especialista: string;
  especialidade: string;
  crm?: string;
  status: ReviewStatus;
  parecer?: string;
  score_qualidade?: number;   // 0–10
  data_solicitacao: string;
  data_resposta?: string;
  pendencias?: string[];
}

// ── Atualização científica (feed) ─────────────────────────────

export interface ScientificUpdate {
  id: string;
  titulo: string;
  tipo: 'novo_estudo' | 'atualizacao_diretriz' | 'alerta_seguranca' | 'meta_analise' | 'consenso';
  data: string;
  resumo: string;
  impacto: UpdateImpacto;
  doi?: string;
  sociedade?: string;
  afeta_guidelines: string[];
  lida: boolean;
  acao_requerida: boolean;
}

// ── Entrada de auditoria ──────────────────────────────────────

export interface AuditEntry {
  id: string;
  tipo: AuditTipo;
  guideline_id?: string;
  guideline_titulo?: string;
  descricao: string;
  usuario: string;
  data: string;
  ip?: string;
  metadados?: Record<string, string>;
}

// ─── Dados seed ───────────────────────────────────────────────

const GUIDELINES_SEED: Guideline[] = [
  {
    id: 'g1',
    titulo: '7ª Diretriz Brasileira de Hipertensão Arterial',
    sigla: 'DBHA-7',
    sociedade: 'Sociedade Brasileira de Cardiologia (SBC)',
    area: 'cardiologia',
    condicao: 'HAS',
    status: 'vigente',
    versao_atual: '7.0',
    ano_publicacao: 2020,
    url_oficial: 'https://doi.org/10.36660/abc.20201238',
    doi_referencia: '10.36660/abc.20201238',
    data_ultima_revisao: '2024-03-01',
    data_proxima_revisao: '2026-01-01',
    nivel_validacao: 'validado',
    responsavel_interno: 'Comitê de Cardiologia',
    tags: ['HAS', 'hipertensão', 'anti-hipertensivo', 'meta pressórica'],
    versoes: [
      {
        id: 'g1v2',
        numero: '7.0',
        data_publicacao: '2020-09-01',
        data_insercao_sistema: '2021-03-01',
        resumo: 'Nova meta pressórica < 130/80 mmHg para a maioria dos pacientes. Inclusão de escore de risco cardiovascular global. Atualização das indicações de terapia combinada e de primeira linha.',
        alteracoes: [
          { campo: 'Meta pressórica', anterior: '< 140/90 mmHg', novo: '< 130/80 mmHg', justificativa: 'Benefício CV demonstrado em SPRINT (2015) e HOT trial' },
          { campo: 'IECA / BRA em DM2', anterior: 'Preferencial', novo: 'Obrigatório se microalbuminúria', justificativa: 'Evidência de nefroproteção Classe I-A' },
          { campo: 'Combinação dupla 1ª linha', anterior: 'Reservada para E2', novo: 'Considerar em PA > 20 mmHg da meta', justificativa: 'Meta mais agressiva exige combinação precoce' },
        ],
        autor_insercao: 'Equipe Científica PRESCREVE-AI',
        revisores: ['Dr. Carlos Pereira (Cardiologista)', 'Dr. Ana Souza (Nefrologista)'],
        status_revisao: 'aprovado',
        evidencias: [
          {
            tipo: 'ensaio_clinico', titulo: 'SPRINT Trial', autores: 'Wright JT Jr et al.', ano: 2015,
            revista: 'NEJM', doi: '10.1056/NEJMoa1511939', pmid: '26551272',
            is_rct: true, is_meta_analise: false,
            n_pacientes: 9361, duracao_seguimento: '3,3 anos',
            desfecho_primario: 'Morte CV, IAM, AVC, IC, SCA',
            reducao_risco_relativo: '25%', nnt: 61,
            nivel: 'A', grau: 'I',
            resumo: 'Meta sistólica < 120 mmHg reduziu eventos CV em 25% vs < 140 mmHg em pacientes de alto risco sem DM2',
            diagnostico: 'Hipertensão Arterial Sistêmica (HAS)',
            conduta: 'Meta pressórica < 130/80 mmHg em adultos de alto risco CV',
            status_validacao: 'validado', data_revisao: '2024-03-01', versao_recomendacao: 'v7.0',
          },
          {
            tipo: 'meta_analise', titulo: 'Blood pressure lowering and major cardiovascular events', autores: 'Ettehad D et al.', ano: 2016,
            revista: 'Lancet', doi: '10.1016/S0140-6736(15)01225-8', pmid: '26724178',
            is_rct: false, is_meta_analise: true,
            n_pacientes: 344716, duracao_seguimento: 'Pool de ECRs',
            desfecho_primario: 'Eventos cardiovasculares maiores',
            reducao_risco_relativo: '20% a cada 10 mmHg sistólica',
            nivel: 'A', grau: 'I',
            resumo: 'Cada 10 mmHg de redução sistólica reduz eventos CV em 20% e AVC em 27%',
            diagnostico: 'Hipertensão Arterial Sistêmica (HAS)',
            conduta: 'Tratamento anti-hipertensivo reduz morbimortalidade independente do agente',
            status_validacao: 'validado', data_revisao: '2024-03-01', versao_recomendacao: 'v7.0',
          },
        ],
      },
      {
        id: 'g1v1',
        numero: '6.0',
        data_publicacao: '2010-04-01',
        data_insercao_sistema: '2010-04-01',
        resumo: 'Meta pressórica < 140/90 mmHg. Classificação por estágio. Algoritmo de tratamento escalonado.',
        alteracoes: [],
        autor_insercao: 'Equipe Científica PRESCREVE-AI',
        revisores: [],
        status_revisao: 'aprovado',
        evidencias: [],
      },
    ],
  },
  {
    id: 'g2',
    titulo: 'Standards of Medical Care in Diabetes 2024',
    sigla: 'ADA 2024',
    sociedade: 'American Diabetes Association (ADA)',
    area: 'endocrinologia',
    condicao: 'DM2',
    status: 'vigente',
    versao_atual: '2024',
    ano_publicacao: 2024,
    url_oficial: 'https://doi.org/10.2337/dc24-SINT',
    doi_referencia: '10.2337/dc24-SINT',
    data_ultima_revisao: '2024-01-25',
    data_proxima_revisao: '2025-01-01',
    nivel_validacao: 'validado',
    responsavel_interno: 'Comitê de Endocrinologia',
    tags: ['DM2', 'diabetes', 'metformina', 'SGLT-2', 'GLP-1', 'HbA1c'],
    versoes: [
      {
        id: 'g2v3',
        numero: '2024',
        data_publicacao: '2024-01-01',
        data_insercao_sistema: '2024-01-15',
        resumo: 'Expansão das indicações de SGLT-2 e GLP-1 agonistas independente do controle glicêmico. Novas metas individualizadas de HbA1c. Atualização do manejo de DRC em DM2.',
        alteracoes: [
          { campo: 'SGLT-2 em IC', anterior: 'Indicado em DM2 + ICFEr', novo: 'Indicado em DM2 + qualquer IC (ICFEp incluída)', justificativa: 'Dados EMPEROR-Preserved e DELIVER' },
          { campo: 'GLP-1 em obesidade', anterior: 'Adjuvante ao controle glicêmico', novo: 'Indicação primária independente da HbA1c se IMC ≥ 30', justificativa: 'Dados SURMOUNT e SELECT trial' },
          { campo: 'Meta HbA1c individualizada', anterior: '< 7% para maioria', novo: 'Faixa 6,5–8% conforme fragilidade e comorbidades', justificativa: 'Evitar hipoglicemia em idosos e frágeis' },
        ],
        autor_insercao: 'Equipe Científica PRESCREVE-AI',
        revisores: ['Dra. Fernanda Lima (Endocrinologista)'],
        status_revisao: 'aprovado',
        evidencias: [
          {
            tipo: 'ensaio_clinico', titulo: 'UKPDS 34', autores: 'UK Prospective Diabetes Study Group', ano: 1998,
            revista: 'Lancet', doi: '10.1016/S0140-6736(98)07037-8', pmid: '9742977',
            is_rct: true, is_meta_analise: false,
            n_pacientes: 1704, duracao_seguimento: '10,7 anos',
            desfecho_primario: 'Qualquer desfecho relacionado ao DM2',
            reducao_risco_relativo: '32% em desfechos relacionados ao DM2', nnt: 14,
            nivel: 'A', grau: 'I',
            resumo: 'Metformina reduziu mortalidade geral (36%) e eventos CV em pacientes com DM2 e sobrepeso',
            diagnostico: 'Diabetes Mellitus tipo 2 (DM2)',
            conduta: 'Metformina como fármaco de 1ª linha em DM2 com sobrepeso/obesidade',
            status_validacao: 'validado', data_revisao: '2024-01-15', versao_recomendacao: 'v2024',
          },
          {
            tipo: 'meta_analise', titulo: 'SGLT-2 inhibitors in heart failure', autores: 'Zannad F et al.', ano: 2020,
            revista: 'Lancet', doi: '10.1016/S0140-6736(20)31824-9', pmid: '33186534',
            is_rct: false, is_meta_analise: true,
            n_pacientes: 21947, duracao_seguimento: 'Pool DAPA-HF + EMPEROR-Reduced',
            desfecho_primario: 'Morte CV + Hospitalização por IC',
            reducao_risco_relativo: '26%',
            nivel: 'A', grau: 'I',
            resumo: 'SGLT-2 reduziram hospitalização por IC e morte CV em 26% independente de DM2',
            diagnostico: 'Diabetes Mellitus tipo 2 (DM2) + Insuficiência Cardíaca',
            conduta: 'SGLT-2 indicado em DM2 com IC independente da FEVE',
            status_validacao: 'validado', data_revisao: '2024-01-15', versao_recomendacao: 'v2024',
          },
        ],
      },
    ],
  },
  {
    id: 'g3',
    titulo: 'Diretrizes para Manejo da Asma — GINA 2023',
    sigla: 'GINA 2023',
    sociedade: 'Global Initiative for Asthma (GINA)',
    area: 'pneumologia',
    condicao: 'Asma',
    status: 'em_revisao',
    versao_atual: '2023',
    ano_publicacao: 2023,
    url_oficial: 'https://ginasthma.org/reports/',
    data_ultima_revisao: '2023-11-15',
    data_proxima_revisao: '2024-05-01',
    nivel_validacao: 'em_revisao',
    responsavel_interno: 'Comitê de Pneumologia',
    tags: ['asma', 'ICS', 'formoterol', 'SMART', 'SABA', 'broncodilatador'],
    versoes: [
      {
        id: 'g3v1',
        numero: '2023',
        data_publicacao: '2023-05-01',
        data_insercao_sistema: '2023-06-01',
        resumo: 'ICS-formoterol como terapia de alívio e manutenção (SMART) em todos os estágios. Redeprescrição de SABA como monoterapia por risco de exacerbações.',
        alteracoes: [
          { campo: 'Terapia de resgate passo 1-2', anterior: 'SABA SOS', novo: 'ICS-formoterol SOS', justificativa: 'Estudos SYGMA 1 e 2 demonstraram superioridade' },
          { campo: 'SABA monoterapia', anterior: 'Aceita em asma leve', novo: 'Não recomendada (risco de exacerbações)', justificativa: 'Ausência de ICS aumenta risco de crise grave e morte' },
        ],
        autor_insercao: 'Equipe Científica PRESCREVE-AI',
        revisores: ['Dr. Roberto Nunes (Pneumologista)'],
        status_revisao: 'revisao_solicitada',
        evidencias: [
          {
            tipo: 'ensaio_clinico', titulo: 'SYGMA 1', autores: "O'Byrne PM et al.", ano: 2018,
            revista: 'NEJM', doi: '10.1056/NEJMoa1715222', pmid: '29768140',
            is_rct: true, is_meta_analise: false,
            n_pacientes: 3836, duracao_seguimento: '52 semanas',
            desfecho_primario: 'Semanas com controle da asma',
            reducao_risco_relativo: 'Não inferioridade vs. budesonida diária',
            nivel: 'A', grau: 'I',
            resumo: 'Budesonida-formoterol SOS não inferior à budesonida diária em asma leve (sem uso diário de ICS)',
            diagnostico: 'Asma leve (passos 1-2 GINA)',
            conduta: 'ICS-formoterol SOS substitui SABA como terapia de resgate na asma leve',
            status_validacao: 'em_revisao', data_revisao: '2024-06-01', versao_recomendacao: 'v2023',
          },
        ],
      },
    ],
  },
  {
    id: 'g4',
    titulo: 'ESC Guidelines for Heart Failure 2021',
    sigla: 'ESC-HF 2021',
    sociedade: 'European Society of Cardiology (ESC)',
    area: 'cardiologia',
    condicao: 'ICC',
    status: 'vigente',
    versao_atual: '2021',
    ano_publicacao: 2021,
    url_oficial: 'https://doi.org/10.1093/eurheartj/ehab368',
    doi_referencia: '10.1093/eurheartj/ehab368',
    data_ultima_revisao: '2024-01-01',
    data_proxima_revisao: '2026-01-01',
    nivel_validacao: 'validado',
    responsavel_interno: 'Comitê de Cardiologia',
    tags: ['ICC', 'IC', 'FEVE', 'betabloqueador', 'IECA', 'ARNI', 'SGLT-2'],
    versoes: [
      {
        id: 'g4v1',
        numero: '2021',
        data_publicacao: '2021-08-27',
        data_insercao_sistema: '2021-09-01',
        resumo: 'ARNI (sacubitril/valsartana) promovido a Classe I em ICFEr. SGLT-2 integrado ao quarteto terapêutico. Fenomenologia de IC atualizada (ICFEr, ICFEm, ICFEp).',
        alteracoes: [
          { campo: 'ARNI (sacubitril/valsartana)', anterior: 'Classe IIa', novo: 'Classe I — substitui IECA/BRA em ICFEr tolerante', justificativa: 'PARADIGM-HF: 20% redução de morte CV vs. enalapril' },
          { campo: 'SGLT-2 em ICFEr', anterior: 'Não recomendado', novo: 'Classe I — reduz hospitalização e morte CV', justificativa: 'DAPA-HF e EMPEROR-Reduced' },
        ],
        autor_insercao: 'Equipe Científica PRESCREVE-AI',
        revisores: ['Dr. Marcos Oliveira (Cardiologista IC)'],
        status_revisao: 'aprovado',
        evidencias: [
          {
            tipo: 'ensaio_clinico', titulo: 'PARADIGM-HF', autores: 'McMurray JJV et al.', ano: 2014,
            revista: 'NEJM', doi: '10.1056/NEJMoa1409077', pmid: '25176015',
            is_rct: true, is_meta_analise: false,
            n_pacientes: 8442, duracao_seguimento: '27 meses',
            desfecho_primario: 'Morte CV ou hospitalização por IC',
            reducao_risco_relativo: '20% vs. enalapril', nnt: 21,
            nivel: 'A', grau: 'I',
            resumo: 'Sacubitril/valsartana reduziu morte CV e hospitalização por IC em 20% vs. enalapril — interrompido precocemente por benefício',
            diagnostico: 'Insuficiência Cardíaca com FE reduzida (ICFEr)',
            conduta: 'ARNI (sacubitril/valsartana) substitui IECA/BRA em ICFEr sintomático (NYHA II-IV)',
            status_validacao: 'validado', data_revisao: '2024-01-01', versao_recomendacao: 'v2021',
          },
          {
            tipo: 'ensaio_clinico', titulo: 'DAPA-HF', autores: 'McMurray JJV et al.', ano: 2019,
            revista: 'NEJM', doi: '10.1056/NEJMoa1911303', pmid: '31535829',
            is_rct: true, is_meta_analise: false,
            n_pacientes: 4744, duracao_seguimento: '18,2 meses',
            desfecho_primario: 'Piora IC + Morte CV',
            reducao_risco_relativo: '26%', nnt: 21,
            nivel: 'A', grau: 'I',
            resumo: 'Dapagliflozina reduziu desfecho composto (piora IC + morte CV) em 26% em ICFEr, com e sem DM2',
            diagnostico: 'Insuficiência Cardíaca com FE reduzida (ICFEr)',
            conduta: 'Dapagliflozina 10 mg/dia como 4º pilar do quarteto terapêutico na ICFEr',
            status_validacao: 'validado', data_revisao: '2024-01-01', versao_recomendacao: 'v2021',
          },
        ],
      },
    ],
  },
  {
    id: 'g5',
    titulo: 'V Diretriz Brasileira de Dislipidemias',
    sigla: 'DBD-5',
    sociedade: 'Sociedade Brasileira de Cardiologia (SBC)',
    area: 'cardiologia',
    condicao: 'Dislipidemia',
    status: 'obsoleta',
    versao_atual: '5.0',
    ano_publicacao: 2013,
    data_ultima_revisao: '2013-04-01',
    data_proxima_revisao: '2024-06-01',
    nivel_validacao: 'desatualizado',
    responsavel_interno: 'Comitê de Cardiologia',
    tags: ['dislipidemia', 'LDL', 'estatina', 'colesterol'],
    versoes: [
      {
        id: 'g5v1',
        numero: '5.0',
        data_publicacao: '2013-04-01',
        data_insercao_sistema: '2013-04-01',
        resumo: 'Metas de LDL por categoria de risco cardiovascular. Indicação de estatinas de alta intensidade em alto risco. Primeira inclusão de ezetimiba.',
        alteracoes: [],
        autor_insercao: 'Equipe Científica PRESCREVE-AI',
        revisores: [],
        status_revisao: 'aprovado',
        evidencias: [],
      },
    ],
  },
];

const REVIEWS_SEED: ExpertReview[] = [
  {
    id: 'r1',
    guideline_id: 'g3',
    guideline_titulo: 'GINA 2023',
    especialista: 'Dr. Roberto Nunes',
    especialidade: 'Pneumologia',
    crm: 'CRM-SP 98765',
    status: 'revisao_solicitada',
    parecer: 'O protocolo SMART está correto, porém sugiro adicionar nota sobre pacientes com DPOC concomitante onde a estratégia pode diferir.',
    score_qualidade: 8,
    data_solicitacao: '2024-11-01',
    data_resposta: '2024-11-15',
    pendencias: ['Adicionar nota sobre DPOC+Asma overlap', 'Revisar dose máxima de formoterol em crianças'],
  },
  {
    id: 'r2',
    guideline_id: 'g2',
    guideline_titulo: 'ADA 2024',
    especialista: 'Dra. Fernanda Lima',
    especialidade: 'Endocrinologia',
    crm: 'CRM-RJ 54321',
    status: 'aprovado',
    parecer: 'Diretriz bem integrada. As indicações de SGLT-2 e GLP-1 estão alinhadas com a prática atual. Recomendo adicionar critérios de uso em TFG < 45.',
    score_qualidade: 9,
    data_solicitacao: '2024-01-10',
    data_resposta: '2024-01-25',
    pendencias: [],
  },
  {
    id: 'r3',
    guideline_id: 'g5',
    guideline_titulo: 'DBD-5 (Dislipidemias)',
    especialista: 'Dr. Paulo Mendes',
    especialidade: 'Cardiologia',
    crm: 'CRM-MG 11223',
    status: 'pendente',
    data_solicitacao: '2025-06-01',
    pendencias: ['Aguardando VI Diretriz SBC de Dislipidemias'],
  },
];

const UPDATES_SEED: ScientificUpdate[] = [
  {
    id: 'u1',
    titulo: 'SELECT Trial — Semaglutida reduz eventos CV em não-diabéticos com obesidade',
    tipo: 'novo_estudo',
    data: '2023-11-11',
    resumo: 'Semaglutida 2,4 mg SC semanal reduziu morte CV, IAM e AVC em 20% em pacientes com IMC ≥ 27 sem DM2, mas com doença cardiovascular estabelecida. N=17.604, seguimento 3,3 anos.',
    impacto: 'alto',
    doi: '10.1056/NEJMoa2307563',
    sociedade: 'ADA / ESC',
    afeta_guidelines: ['g2'],
    lida: false,
    acao_requerida: true,
  },
  {
    id: 'u2',
    titulo: 'FIDELIO-DKD e FIGARO-DKD — Finerenona em DRC + DM2',
    tipo: 'meta_analise',
    data: '2022-08-25',
    resumo: 'Meta-análise FIDELITY: finerenona (antagonista MR não esteroidе) reduziu eventos renais em 23% e CV em 14% em DRC + DM2, adicionado ao tratamento padrão com IECA/BRA.',
    impacto: 'moderado',
    doi: '10.1093/eurheartj/ehac244',
    sociedade: 'ESC / KDIGO',
    afeta_guidelines: ['g1', 'g2'],
    lida: true,
    acao_requerida: false,
  },
  {
    id: 'u3',
    titulo: 'GINA 2024 — Prévia: manutenção da estratégia SMART, novas metas em crianças',
    tipo: 'atualizacao_diretriz',
    data: '2024-05-10',
    resumo: 'A versão 2024 mantém ICS-formoterol como resgate em todos os estágios. Novidade: inclusão de critérios para monitorização de função pulmonar em crianças < 5 anos.',
    impacto: 'moderado',
    sociedade: 'GINA',
    afeta_guidelines: ['g3'],
    lida: false,
    acao_requerida: true,
  },
  {
    id: 'u4',
    titulo: 'EMPEROR-Preserved — Empagliflozina em ICFEp',
    tipo: 'novo_estudo',
    data: '2021-08-27',
    resumo: 'Empagliflozina reduziu hospitalização por IC em 29% em pacientes com ICFEp (FEVE > 40%), independente de DM2. Primeiro SGLT-2 aprovado para IC com fração de ejeção preservada.',
    impacto: 'critico',
    doi: '10.1056/NEJMoa2107522',
    sociedade: 'ESC',
    afeta_guidelines: ['g4'],
    lida: true,
    acao_requerida: false,
  },
];

const AUDIT_SEED: AuditEntry[] = [
  { id: 'a1', tipo: 'guideline_atualizado',  guideline_id: 'g2', guideline_titulo: 'ADA 2024', descricao: 'Versão 2024 importada e publicada', usuario: 'Equipe Científica', data: '2024-01-15', metadados: { versao: '2024', fonte: 'ADA Standards' } },
  { id: 'a2', tipo: 'revisao_aprovada',       guideline_id: 'g2', guideline_titulo: 'ADA 2024', descricao: 'Revisão aprovada por Dra. Fernanda Lima (Endocrinologia)', usuario: 'Dra. Fernanda Lima', data: '2024-01-25' },
  { id: 'a3', tipo: 'atualizacao_importada',  descricao: 'SELECT Trial adicionado ao feed científico (impacto ALTO)', usuario: 'Monitor Científico', data: '2023-11-12', metadados: { doi: '10.1056/NEJMoa2307563' } },
  { id: 'a4', tipo: 'guideline_criado',       guideline_id: 'g3', guideline_titulo: 'GINA 2023', descricao: 'Diretriz GINA 2023 inserida no sistema', usuario: 'Equipe Científica', data: '2023-06-01' },
  { id: 'a5', tipo: 'revisao_rejeitada',      guideline_id: 'g3', guideline_titulo: 'GINA 2023', descricao: 'Pendências identificadas por Dr. Roberto Nunes — aguardando correção', usuario: 'Dr. Roberto Nunes', data: '2023-11-15' },
  { id: 'a6', tipo: 'versao_publicada',       guideline_id: 'g4', guideline_titulo: 'ESC-HF 2021', descricao: 'Versão 2021 publicada após aprovação do comitê', usuario: 'Comitê de Cardiologia', data: '2021-09-01' },
  { id: 'a7', tipo: 'alerta_gerado',          descricao: 'GINA 2024 prévia identificada — revisão da diretriz GINA 2023 necessária', usuario: 'Monitor Científico', data: '2024-05-11', metadados: { impacto: 'moderado' } },
  { id: 'a8', tipo: 'guideline_criado',       guideline_id: 'g1', guideline_titulo: 'DBHA-7', descricao: '7ª Diretriz SBC de HAS inserida no sistema', usuario: 'Equipe Científica', data: '2021-03-01' },
];

// ─── Storage ──────────────────────────────────────────────────

const KEY_GL  = 'prescreve_ai_governance_guidelines_v1';
const KEY_REV = 'prescreve_ai_governance_reviews_v1';
const KEY_UPD = 'prescreve_ai_governance_updates_v1';
const KEY_AUD = 'prescreve_ai_governance_audit_v1';

function load<T>(key: string, seed: T[]): T[] {
  if (typeof window === 'undefined') return seed;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch {}
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

function save<T>(key: string, data: T[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

function newAudit(entry: Omit<AuditEntry, 'id'>): AuditEntry {
  return { ...entry, id: `aud_${Date.now()}` };
}

// ─── Hook ─────────────────────────────────────────────────────

export function useGovernance() {
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [reviews,    setReviews]    = useState<ExpertReview[]>([]);
  const [updates,    setUpdates]    = useState<ScientificUpdate[]>([]);
  const [audit,      setAudit]      = useState<AuditEntry[]>([]);
  const [loaded,     setLoaded]     = useState(false);

  useEffect(() => {
    setGuidelines(load(KEY_GL,  GUIDELINES_SEED));
    setReviews(   load(KEY_REV, REVIEWS_SEED));
    setUpdates(   load(KEY_UPD, UPDATES_SEED));
    setAudit(     load(KEY_AUD, AUDIT_SEED));
    setLoaded(true);
  }, []);

  const addAudit = useCallback((entry: Omit<AuditEntry, 'id'>, currentAudit: AuditEntry[]) => {
    const next = [newAudit(entry), ...currentAudit];
    setAudit(next);
    save(KEY_AUD, next);
  }, []);

  const markUpdateRead = useCallback((id: string) => {
    setUpdates(prev => {
      const next = prev.map(u => u.id === id ? { ...u, lida: true } : u);
      save(KEY_UPD, next);
      return next;
    });
  }, []);

  const updateReviewStatus = useCallback((id: string, status: ReviewStatus, parecer?: string) => {
    setReviews(prev => {
      const next = prev.map(r => r.id === id ? { ...r, status, parecer: parecer ?? r.parecer, data_resposta: new Date().toISOString() } : r);
      save(KEY_REV, next);
      return next;
    });
    setAudit(prev => {
      const rev = reviews.find(r => r.id === id);
      const entry = newAudit({
        tipo: status === 'aprovado' ? 'revisao_aprovada' : 'revisao_rejeitada',
        guideline_id: rev?.guideline_id,
        guideline_titulo: rev?.guideline_titulo,
        descricao: `Revisão ${status === 'aprovado' ? 'aprovada' : 'rejeitada'} por ${rev?.especialista}`,
        usuario: rev?.especialista ?? 'Especialista',
        data: new Date().toISOString(),
      });
      const next = [entry, ...prev];
      save(KEY_AUD, next);
      return next;
    });
  }, [reviews]);

  const updateGuidelineStatus = useCallback((id: string, status: GuidelineStatus) => {
    setGuidelines(prev => {
      const next = prev.map(g => g.id === id ? { ...g, status } : g);
      save(KEY_GL, next);
      return next;
    });
    addAudit({
      tipo: 'guideline_atualizado',
      guideline_id: id,
      guideline_titulo: guidelines.find(g => g.id === id)?.titulo,
      descricao: `Status alterado para "${status}"`,
      usuario: 'Equipe Científica',
      data: new Date().toISOString(),
    }, audit);
  }, [guidelines, audit, addAudit]);

  const unreadCount   = updates.filter(u => !u.lida).length;
  const pendingReviews = reviews.filter(r => r.status === 'pendente').length;

  return {
    guidelines, reviews, updates, audit, loaded,
    markUpdateRead, updateReviewStatus, updateGuidelineStatus,
    unreadCount, pendingReviews,
  };
}

// ─── Helpers visuais ──────────────────────────────────────────

export const STATUS_GUIDELINE: Record<GuidelineStatus, { label: string; cls: string; dot: string }> = {
  vigente:      { label: 'Vigente',           cls: 'bg-green-100  text-green-700  border-green-200',  dot: 'bg-green-500'  },
  em_revisao:   { label: 'Em revisão',        cls: 'bg-amber-100  text-amber-700  border-amber-200',  dot: 'bg-amber-400'  },
  obsoleta:     { label: 'Obsoleta',          cls: 'bg-red-100    text-red-600    border-red-200',    dot: 'bg-red-500'    },
  aguardando:   { label: 'Aguardando dados',  cls: 'bg-slate-100  text-slate-600  border-slate-200',  dot: 'bg-slate-400'  },
};

export const STATUS_REVIEW: Record<ReviewStatus, { label: string; cls: string }> = {
  pendente:           { label: 'Pendente',           cls: 'bg-amber-100  text-amber-700'  },
  aprovado:           { label: 'Aprovado',           cls: 'bg-green-100  text-green-700'  },
  rejeitado:          { label: 'Rejeitado',          cls: 'bg-red-100    text-red-700'    },
  revisao_solicitada: { label: 'Rev. solicitada',    cls: 'bg-purple-100 text-purple-700' },
};

export const IMPACTO_META: Record<UpdateImpacto, { label: string; cls: string; dot: string }> = {
  baixo:   { label: 'Baixo',   cls: 'bg-slate-100  text-slate-600',  dot: 'bg-slate-400'  },
  moderado:{ label: 'Moderado',cls: 'bg-blue-100   text-blue-700',   dot: 'bg-blue-500'   },
  alto:    { label: 'Alto',    cls: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  critico: { label: 'Crítico', cls: 'bg-red-100    text-red-700',    dot: 'bg-red-500'    },
};

export const AUDIT_META: Record<AuditTipo, { label: string; color: string }> = {
  guideline_criado:      { label: 'Diretriz criada',       color: 'bg-green-500'  },
  guideline_atualizado:  { label: 'Diretriz atualizada',   color: 'bg-blue-500'   },
  versao_publicada:      { label: 'Versão publicada',       color: 'bg-indigo-500' },
  revisao_aprovada:      { label: 'Revisão aprovada',       color: 'bg-emerald-500'},
  revisao_rejeitada:     { label: 'Revisão rejeitada',      color: 'bg-red-500'    },
  alerta_gerado:         { label: 'Alerta científico',      color: 'bg-amber-500'  },
  atualizacao_importada: { label: 'Atualização importada',  color: 'bg-purple-500' },
};

export const STATUS_VALIDACAO_META: Record<StatusValidacao, { label: string; cls: string; dot: string }> = {
  validado:    { label: 'Validado',    cls: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',  dot: 'bg-green-500'  },
  pendente:    { label: 'Pendente',    cls: 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',  dot: 'bg-amber-400'  },
  em_revisao:  { label: 'Em revisão', cls: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',   dot: 'bg-blue-500'   },
  obsoleto:    { label: 'Obsoleto',   cls: 'bg-red-100    text-red-600    dark:bg-red-900/30    dark:text-red-400',    dot: 'bg-red-500'    },
};

export const NIVEL_EVIDENCIA_LABEL: Record<NivelEvidencia, string> = {
  A: 'Múltiplos ECR ou meta-análises',
  B: 'ECR único ou estudos observacionais',
  C: 'Opinião de especialistas / consenso',
};

export const GRAU_RECOMENDACAO_LABEL: Record<GrauRecomendacao, string> = {
  I:   'Benefício >>> Risco — Recomendado',
  IIa: 'Benefício >> Risco — Razoável',
  IIb: 'Benefício ≥ Risco — Pode considerar',
  III: 'Sem benefício ou prejudicial',
};
