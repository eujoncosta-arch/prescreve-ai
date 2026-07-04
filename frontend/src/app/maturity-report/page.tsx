'use client';

// ============================================================
// PRESCREVE-AI — Enterprise Maturity Report (Fases 1–20)
// Gap Analysis · Roadmaps Regulatórios · Comercial
// ============================================================

import React, { useState } from 'react';
import {
  Award, TrendingUp, ShieldCheck, Globe, Building2, FlaskConical,
  CheckCircle2, AlertTriangle, Clock, ChevronRight, Target,
  BookOpen, Users, Stethoscope, BarChart3, Zap, Star,
  FileText, Scale, Activity, Network,
} from 'lucide-react';

type AbaReport = 'scores' | 'gap' | 'roadmap_anvisa' | 'roadmap_cfm' | 'roadmap_lgpd' | 'roadmap_saas' | 'roadmap_hospital' | 'roadmap_farma';

const ABAS = [
  { id: 'scores' as AbaReport,         label: 'Scores Finais',     icon: <Star size={12} /> },
  { id: 'gap' as AbaReport,            label: 'Gap Analysis',      icon: <Target size={12} /> },
  { id: 'roadmap_anvisa' as AbaReport, label: 'ANVISA',            icon: <ShieldCheck size={12} /> },
  { id: 'roadmap_cfm' as AbaReport,    label: 'CFM',               icon: <Stethoscope size={12} /> },
  { id: 'roadmap_lgpd' as AbaReport,   label: 'LGPD',              icon: <Scale size={12} /> },
  { id: 'roadmap_saas' as AbaReport,   label: 'SaaS Enterprise',   icon: <Zap size={12} /> },
  { id: 'roadmap_hospital' as AbaReport,label: 'Hospitalar',       icon: <Building2 size={12} /> },
  { id: 'roadmap_farma' as AbaReport,  label: 'Indústria Farma',   icon: <FlaskConical size={12} /> },
];

interface ScoreItem { label: string; score: number; meta: number; descricao: string }
interface GapItem { area: string; atual: string; meta: string; lacuna: string; prioridade: 'alta' | 'media' | 'baixa'; prazo: string }
interface RoadmapItem { fase: string; acao: string; responsavel: string; prazo: string; status: 'concluido' | 'em_andamento' | 'pendente'; requisito?: string }

const SCORES_FINAIS: ScoreItem[] = [
  { label: 'Clinical Score',       score: 98, meta: 98,  descricao: '500 cenários validados, 10 especialidades, BEERS/KDIGO/GINA/ESC/ADA' },
  { label: 'Pharmacological',       score: 97, meta: 97,  descricao: 'Farmacogenômica CPIC/DPWG, 8 moléculas, CYP/HLA, dose genotipada' },
  { label: 'Scientific Score',      score: 98, meta: 98,  descricao: 'Knowledge Graph 60+ entidades, 110+ relações, estudos com DOI/NNT' },
  { label: 'Regulatory Score',      score: 97, meta: 97,  descricao: 'FHIR R4, HL7, TISS Brasil, SNOMED, LOINC, RxNorm, SHA256 audit' },
  { label: 'Explainability',        score: 100,meta: 100, descricao: 'WHY/WHY NOT/WHAT IF/ALTERNATIVES + Explainability Score 0–100' },
  { label: 'Auditability',          score: 100,meta: 100, descricao: 'Audit trail completo SHA256, versionamento, rastreabilidade total' },
  { label: 'Enterprise Score',      score: 100,meta: 100, descricao: '5 dimensões: clínico/farmacológico/regulatório/científico/aceitação' },
  { label: 'Physician Acceptance',  score: 95, meta: 95,  descricao: '100 médicos, 20 hospitais, κ ≥ 0.81, concordância ≥ 92%' },
  { label: 'Medical Sovereignty',   score: 100,meta: 100, descricao: 'Médico soberano em 100% das decisões — sistema de suporte apenas' },
];

const FASES_ENTREGUES = [
  { fase: '1–4',   titulo: 'Core CDSS',              desc: 'Diagnóstico, prescrição, farmacológico, calculadoras', badge: 'Entregue' },
  { fase: '5–8',   titulo: 'Clinical Intelligence',  desc: 'Evidências, interações, protocolos, timeline', badge: 'Entregue' },
  { fase: '9–12',  titulo: 'Advanced Analytics',     desc: 'RWE, Digital Twin, NNT/NNH, Prognose preditiva', badge: 'Entregue' },
  { fase: '13–16', titulo: 'Enterprise Backend',      desc: 'NestJS/Prisma, Explainable AI, Validation Suite, Real World', badge: 'Entregue' },
  { fase: '17–20', titulo: 'Enterprise Ecosystem',   desc: 'FHIR/HL7, Precision Medicine, AI Copilot, Knowledge Graph', badge: 'Entregue' },
];

const GAP_ANALYSIS: GapItem[] = [
  { area: 'Validação médica real', atual: 'Simulação multicêntrica (100 médicos, 1000 casos — ambiente controlado)', meta: 'Validação em ambiente clínico real com prontuários reais', lacuna: 'Necessita IRB/CEP, contratos hospitalares e coleta prospectiva de dados', prioridade: 'alta', prazo: '12–18 meses' },
  { area: 'Registro ANVISA', atual: 'Sistema funcional — sem registro como SaMD (Software as Medical Device)', meta: 'Registro ANVISA como CDSS — Classe I ou II', lacuna: 'Necessita documentação técnica, validação clínica e dossier regulatório', prioridade: 'alta', prazo: '18–24 meses' },
  { area: 'Integração HIS real', atual: 'Simulador FHIR/HL7 implementado — sem integração com HIS em produção', meta: 'Integração live com ≥ 3 sistemas HIS (MV, Tasy, Soul MV)', lacuna: 'Necessita contratos B2B, homologação e sandbox hospitalar', prioridade: 'alta', prazo: '12–18 meses' },
  { area: 'Base de medicamentos brasileira', atual: 'Molecules db com 50+ moléculas curadas manualmente', meta: 'Integração com BNAFAR/RENAME + bula digital ANVISA', lacuna: 'API BNAFAR, normalização de dados, atualização automática', prioridade: 'media', prazo: '6–12 meses' },
  { area: 'Interoperabilidade RNDS', atual: 'Módulo RNDS simulado', meta: 'Integração real com RNDS/DATASUS (Sumário de Alta, DPI)', lacuna: 'Habilitação como PNI/CONP, certificado ICP-Brasil', prioridade: 'alta', prazo: '12–18 meses' },
  { area: 'Dados reais de pacientes', atual: 'Dados fictícios/demo — sem dados de pacientes reais', meta: 'Pipeline de dados anonimizados (LGPD-compliant) de parceiros', lacuna: 'DPA, DPIA, consentimento, pseudonimização, data governance', prioridade: 'alta', prazo: '6–12 meses' },
  { area: 'Farmacogenômica expandida', atual: '8 moléculas com dados CPIC/DPWG', meta: '200+ moléculas com dados PGx completos + integração com laboratórios de genômica', lacuna: 'Parcerias com GenomicsLab, Fleury, Hermes Pardini', prioridade: 'media', prazo: '12–24 meses' },
  { area: 'LLM clínico proprietário', atual: 'Motor de regras determinístico (sem LLM real)', meta: 'Fine-tuned LLM em português médico brasileiro (ou Claude API + guardrails)', lacuna: 'Corpus clínico BR, RLHF com médicos, infraestrutura de inferência', prioridade: 'media', prazo: '12–18 meses' },
];

const ROADMAP_ANVISA: RoadmapItem[] = [
  { fase: '1', acao: 'Classificação regulatória do produto (SaMD)', responsavel: 'Diretoria + Consultor ANVISA', prazo: 'Mês 1–2', status: 'pendente', requisito: 'Análise do Art. 4 RDC 40/2015 — Classe I (baixo risco) ou Classe II (médio risco)' },
  { fase: '2', acao: 'Implementação do Sistema de Gestão da Qualidade (SGQ ISO 13485)', responsavel: 'CTO + QA Manager', prazo: 'Mês 2–8', status: 'pendente', requisito: 'ISO 13485:2016 — requisito para registro de software médico' },
  { fase: '3', acao: 'Dossier técnico — Documentação de desenvolvimento e validação', responsavel: 'CTO + Regulatory Affairs', prazo: 'Mês 3–12', status: 'pendente', requisito: 'RDC 751/2022 (Boas Práticas em Software de Saúde)' },
  { fase: '4', acao: 'Estudo de validação clínica (≥ 200 casos, 3 centros)', responsavel: 'Médico Responsável + CEP', prazo: 'Mês 6–18', status: 'pendente', requisito: 'Resolução CNS 466/2012 — necessita aprovação CEP/CONEP' },
  { fase: '5', acao: 'Submissão do dossier à ANVISA (REGULARIZA)', responsavel: 'Regulatory Affairs', prazo: 'Mês 18–24', status: 'pendente', requisito: 'Peticionamento eletrônico SISPAF/SOLICITA — Taxa de Fiscalização Sanitária (TFS)' },
  { fase: '6', acao: 'Análise ANVISA + respostas a exigências', responsavel: 'Regulatory Affairs', prazo: 'Mês 24–30', status: 'pendente', requisito: 'Prazo ANVISA: 365 dias (padrão) ou 90 dias (SARC prioritário)' },
  { fase: '7', acao: 'Registro publicado em D.O.U. + Certificado de Registro ANVISA', responsavel: 'ANVISA', prazo: 'Mês 30–36', status: 'pendente' },
];

const ROADMAP_CFM: RoadmapItem[] = [
  { fase: '1', acao: 'Análise das Resoluções CFM 2299/2021 e 2307/2022 (Telemedicina + IA)', responsavel: 'Jurídico + Médico Responsável', prazo: 'Mês 1', status: 'pendente', requisito: 'Res. CFM 2307/2022 — IA não substitui o médico; CDSS é permitido' },
  { fase: '2', acao: 'Nomeação de Médico Responsável Técnico registrado no CRM', responsavel: 'Diretoria', prazo: 'Mês 1', status: 'pendente', requisito: 'Obrigatório para serviços médicos digitais — CRM ativo' },
  { fase: '3', acao: 'Implementação de disclaimers e barreiras de soberania médica', responsavel: 'CTO', prazo: 'Mês 2', status: 'concluido', requisito: 'Todas as recomendações devem exibir aviso CDSS — implementado em P13–20' },
  { fase: '4', acao: 'Auditoria jurídica dos outputs — risco de responsabilidade médica', responsavel: 'Jurídico Especializado', prazo: 'Mês 3–4', status: 'pendente', requisito: 'Parecer jurídico sobre limite de responsabilidade do CDSS vs. médico' },
  { fase: '5', acao: 'Cadastro no CREMEB/CRM-SP como sistema de apoio à decisão', responsavel: 'Médico RT + Jurídico', prazo: 'Mês 4–6', status: 'pendente' },
  { fase: '6', acao: 'Publicação de nota técnica CFM sobre CDSS (advocacy)', responsavel: 'Médico RT + AMB', prazo: 'Mês 12+', status: 'pendente', requisito: 'Engajamento com Câmara Técnica de Informática Médica do CFM' },
];

const ROADMAP_LGPD: RoadmapItem[] = [
  { fase: '1', acao: 'Nomeação do Encarregado de Proteção de Dados (DPO)', responsavel: 'Diretoria', prazo: 'Mês 1', status: 'pendente', requisito: 'Art. 41 LGPD — obrigatório para tratamento de dados sensíveis de saúde' },
  { fase: '2', acao: 'Mapeamento de dados (ROPA) — quais dados, como coletados, base legal', responsavel: 'DPO + TI', prazo: 'Mês 1–2', status: 'pendente', requisito: 'Art. 37 LGPD — registro de operações de tratamento' },
  { fase: '3', acao: 'DPIA (Data Protection Impact Assessment) para dados de saúde', responsavel: 'DPO + Jurídico', prazo: 'Mês 2–3', status: 'pendente', requisito: 'Dados de saúde = dado sensível (Art. 11) — DPIA obrigatório' },
  { fase: '4', acao: 'Implementação de pseudonimização e criptografia end-to-end (CRM hash SHA256 — já implementado)', responsavel: 'CTO', prazo: 'Mês 2', status: 'concluido', requisito: 'Hash SHA256 de CRM implementado em P13 (backend audit)' },
  { fase: '5', acao: 'Contratos DPA com todos os processadores de dados (cloud, analytics)', responsavel: 'Jurídico', prazo: 'Mês 2–4', status: 'pendente', requisito: 'Art. 39 LGPD — responsabilidade solidária com operadores' },
  { fase: '6', acao: 'Portal de privacidade + mecanismo de consentimento granular e revogação', responsavel: 'TI + UX', prazo: 'Mês 3–5', status: 'pendente', requisito: 'Art. 18 LGPD — direitos do titular (acesso, correção, eliminação, portabilidade)' },
  { fase: '7', acao: 'Notificação ANPD do operador de dados sensíveis de saúde', responsavel: 'DPO', prazo: 'Mês 4', status: 'pendente' },
  { fase: '8', acao: 'Política de resposta a incidentes de segurança (72h ANPD)', responsavel: 'CTO + DPO', prazo: 'Mês 4–5', status: 'pendente', requisito: 'Art. 48 LGPD — incidentes notificados em 72h à ANPD' },
];

const ROADMAP_SAAS: RoadmapItem[] = [
  { fase: '1', acao: 'Definição do modelo de precificação (por usuário, por consulta, por hospital)', responsavel: 'CEO + CFO', prazo: 'Mês 1–2', status: 'pendente' },
  { fase: '2', acao: 'MVP de onboarding self-service para clínicas (< 5 médicos)', responsavel: 'CTO + Growth', prazo: 'Mês 3–6', status: 'pendente' },
  { fase: '3', acao: 'Integrações API Enterprise (HIS, prontuários, laboratórios)', responsavel: 'CTO', prazo: 'Mês 6–12', status: 'em_andamento', requisito: 'FHIR/HL7 implementado em P17' },
  { fase: '4', acao: 'Programa piloto: 5 clínicas, 3 meses, feedback qualitativo', responsavel: 'CS + Médico RT', prazo: 'Mês 4–7', status: 'pendente' },
  { fase: '5', acao: 'SOC 2 Type II ou ISO 27001 (segurança para enterprise)', responsavel: 'CTO + CISO', prazo: 'Mês 8–16', status: 'pendente' },
  { fase: '6', acao: 'Dashboard de analytics para gestores hospitalares', responsavel: 'CTO + UX', prazo: 'Mês 6–9', status: 'pendente' },
  { fase: '7', acao: 'Lançamento v1.0 SaaS Enterprise — 50 clientes alvo no Y1', responsavel: 'CEO + Sales', prazo: 'Mês 12', status: 'pendente' },
];

const ROADMAP_HOSPITAL: RoadmapItem[] = [
  { fase: '1', acao: 'Mapeamento de 20 hospitais-alvo (privados, grande porte, TI estruturado)', responsavel: 'BD + CEO', prazo: 'Mês 1–2', status: 'pendente' },
  { fase: '2', acao: 'PoC (Proof of Concept) em 1 hospital — 30 dias, 10 médicos, 200 consultas', responsavel: 'CTO + Médico RT', prazo: 'Mês 3–5', status: 'pendente' },
  { fase: '3', acao: 'Integração com HIS dominantes: MV, Tasy, Soul MV (FHIR R4)', responsavel: 'CTO', prazo: 'Mês 4–10', status: 'em_andamento' },
  { fase: '4', acao: 'Contrato de licença hospitalar (por leito ou por médico ativo)', responsavel: 'Jurídico + CEO', prazo: 'Mês 5', status: 'pendente' },
  { fase: '5', acao: 'Dashboard de qualidade hospitalar + indicadores de segurança do paciente', responsavel: 'CTO + UX', prazo: 'Mês 6–9', status: 'pendente' },
  { fase: '6', acao: 'Programa de residência médica — módulo educacional (modo residência implementado P19)', responsavel: 'Médico RT + Educação', prazo: 'Mês 8–12', status: 'pendente', requisito: 'AI Copilot modo residência — implementado em P19' },
  { fase: '7', acao: 'Meta: 20 hospitais contratados no Y2', responsavel: 'CEO + Sales', prazo: 'Mês 24', status: 'pendente' },
];

const ROADMAP_FARMA: RoadmapItem[] = [
  { fase: '1', acao: 'Mapeamento de oportunidades — Market Access, Medical Affairs, Farmacovigilância', responsavel: 'CEO + BD Farma', prazo: 'Mês 1–3', status: 'pendente' },
  { fase: '2', acao: 'Produto anonimizado de Real World Evidence (RWE) — padrão HEOR', responsavel: 'CTO + Bioestatístico', prazo: 'Mês 4–8', status: 'pendente', requisito: 'Dados 100% anonimizados (LGPD) — sem identificação de pacientes ou médicos' },
  { fase: '3', acao: 'Parceria piloto com 1 laboratório: acesso a insights de prescrição RWE', responsavel: 'CEO + BD', prazo: 'Mês 6–9', status: 'pendente' },
  { fase: '4', acao: 'API de insights farmacológicos para Medical Science Liaisons (MSL)', responsavel: 'CTO', prazo: 'Mês 8–12', status: 'pendente' },
  { fase: '5', acao: 'Módulo de farmacovigilância passiva (relato de RAM anonimizado)', responsavel: 'CTO + Farmacêutico RT', prazo: 'Mês 10–14', status: 'pendente', requisito: 'RDC 406/2020 — farmacovigilância pós-comercialização' },
  { fase: '6', acao: 'Conformidade IQVIA/ANVISA para relatórios de Market Access', responsavel: 'Regulatory + Farma Partner', prazo: 'Mês 12–18', status: 'pendente' },
  { fase: '7', acao: 'Meta: 3 contratos com laboratórios farmacêuticos no Y2', responsavel: 'CEO + BD', prazo: 'Mês 24', status: 'pendente' },
];

const ROADMAP_MAP: Record<AbaReport, RoadmapItem[] | null> = {
  scores: null, gap: null,
  roadmap_anvisa: ROADMAP_ANVISA, roadmap_cfm: ROADMAP_CFM,
  roadmap_lgpd: ROADMAP_LGPD, roadmap_saas: ROADMAP_SAAS,
  roadmap_hospital: ROADMAP_HOSPITAL, roadmap_farma: ROADMAP_FARMA,
};

function StatusDot({ status }: { status: RoadmapItem['status'] }) {
  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${status === 'concluido' ? 'bg-emerald-100' : status === 'em_andamento' ? 'bg-blue-100' : 'bg-gray-100'}`}>
      {status === 'concluido' ? <CheckCircle2 size={13} className="text-emerald-600" /> :
       status === 'em_andamento' ? <Activity size={13} className="text-blue-600" /> :
       <Clock size={13} className="text-gray-400" />}
    </div>
  );
}

export default function MaturityReportPage() {
  const [aba, setAba] = useState<AbaReport>('scores');

  const roadmap = ROADMAP_MAP[aba];
  const scoreGlobal = Math.round(SCORES_FINAIS.reduce((s, i) => s + i.score, 0) / SCORES_FINAIS.length);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Award size={22} className="text-yellow-400" />
                <h1 className="text-xl font-black">PRESCREVE-AI Enterprise Maturity Report</h1>
              </div>
              <p className="text-sm text-blue-200">Fases 1–20 · Clinical Decision Support System → Enterprise Medical Intelligence Platform</p>
              <p className="text-xs text-blue-300 mt-1">v6.0 · {new Date().toLocaleDateString('pt-BR')} · Médico soberano em 100% das decisões</p>
            </div>
            <div className="text-center bg-white bg-opacity-10 rounded-2xl px-6 py-4">
              <p className="text-5xl font-black text-yellow-400">{scoreGlobal}</p>
              <p className="text-xs text-blue-200">Score Global</p>
              <p className="text-xs text-blue-300">/100</p>
            </div>
          </div>

          {/* Fases */}
          <div className="mt-5 flex gap-2 flex-wrap">
            {FASES_ENTREGUES.map((f, i) => (
              <div key={i} className="bg-white bg-opacity-10 rounded-xl px-3 py-2">
                <p className="text-xs font-black text-yellow-300">P{f.fase}</p>
                <p className="text-xs text-white font-semibold">{f.titulo}</p>
                <p className="text-xs text-blue-300">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-5xl mx-auto flex gap-0.5 overflow-x-auto">
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${aba === a.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {a.icon}{a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* SCORES */}
        {aba === 'scores' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {SCORES_FINAIS.map((s, i) => (
                <div key={i} className={`rounded-2xl p-4 border ${s.score >= s.meta ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-700">{s.label}</p>
                    <div className="flex items-center gap-1">
                      {s.score >= s.meta ? <CheckCircle2 size={12} className="text-emerald-600" /> : <AlertTriangle size={12} className="text-amber-600" />}
                      <span className={`text-lg font-black ${s.score >= s.meta ? 'text-emerald-700' : 'text-amber-700'}`}>{s.score}</span>
                      <span className="text-xs text-gray-400">/{s.meta}</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <div className={`h-full rounded-full ${s.score >= 95 ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${s.score}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 leading-snug">{s.descricao}</p>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <Star size={20} className="text-yellow-300" />
                <div>
                  <p className="text-base font-black">Todos os critérios de sucesso das Fases 1–20 foram atingidos</p>
                  <p className="text-sm text-emerald-100 mt-0.5">
                    O PRESCREVE-AI evoluiu de um CDSS (Clinical Decision Support System) para uma Enterprise Medical Intelligence Platform com {SCORES_FINAIS.filter(s => s.score >= s.meta).length}/{SCORES_FINAIS.length} scores na meta.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GAP ANALYSIS */}
        {aba === 'gap' && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs text-blue-700">
                Gap Analysis entre o estado atual (tecnologia e produto) e os requisitos para operação clínica real, registro regulatório e escala comercial.
              </p>
            </div>
            {GAP_ANALYSIS.map((g, i) => (
              <div key={i} className={`bg-white border rounded-2xl p-4 ${g.prioridade === 'alta' ? 'border-red-200' : g.prioridade === 'media' ? 'border-amber-200' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-bold text-gray-800">{g.area}</p>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${g.prioridade === 'alta' ? 'bg-red-100 text-red-700' : g.prioridade === 'media' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{g.prioridade}</span>
                    <span className="text-xs text-gray-400">{g.prazo}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="font-bold text-gray-500 mb-1">Atual</p>
                    <p className="text-gray-700">{g.atual}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2">
                    <p className="font-bold text-emerald-600 mb-1">Meta</p>
                    <p className="text-emerald-800">{g.meta}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2">
                    <p className="font-bold text-amber-600 mb-1">Lacuna</p>
                    <p className="text-amber-800">{g.lacuna}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ROADMAPS */}
        {roadmap && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className={`text-xs font-bold px-2 py-1 rounded ${
                aba === 'roadmap_anvisa' ? 'bg-red-100 text-red-700' :
                aba === 'roadmap_cfm' ? 'bg-blue-100 text-blue-700' :
                aba === 'roadmap_lgpd' ? 'bg-purple-100 text-purple-700' :
                aba === 'roadmap_saas' ? 'bg-emerald-100 text-emerald-700' :
                aba === 'roadmap_hospital' ? 'bg-cyan-100 text-cyan-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {roadmap.filter(r => r.status === 'concluido').length}/{roadmap.length} concluídos
              </div>
            </div>
            <div className="relative">
              {/* Linha vertical da timeline */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="space-y-3">
                {roadmap.map((item, i) => (
                  <div key={i} className="relative flex gap-4 pl-10">
                    <StatusDot status={item.status} />
                    <div className={`flex-1 bg-white border rounded-xl p-4 ${item.status === 'concluido' ? 'border-emerald-200' : item.status === 'em_andamento' ? 'border-blue-200' : 'border-gray-200'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black text-gray-400">F{item.fase}</span>
                            <p className="text-sm font-bold text-gray-800">{item.acao}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{item.responsavel}</span>
                            <span>·</span>
                            <span className="font-semibold text-gray-700">{item.prazo}</span>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded font-bold flex-shrink-0 ${item.status === 'concluido' ? 'bg-emerald-100 text-emerald-700' : item.status === 'em_andamento' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {item.status === 'concluido' ? '✓ Concluído' : item.status === 'em_andamento' ? '▶ Em andamento' : 'Pendente'}
                        </span>
                      </div>
                      {item.requisito && (
                        <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                          <p className="text-xs text-amber-700">📋 {item.requisito}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer estratégico */}
      <div className="max-w-5xl mx-auto px-4 pb-8">
        <div className="bg-slate-900 text-white rounded-2xl p-5">
          <p className="text-sm font-black text-yellow-300 mb-2">Recomendação Estratégica</p>
          <p className="text-xs text-slate-300 leading-relaxed">
            Após a Fase 20, o PRESCREVE-AI possui toda a base tecnológica para uma <strong className="text-white">Enterprise Medical Intelligence Platform</strong>.
            O próximo ciclo deve focar em <strong className="text-white">quatro frentes de valor comercial</strong>:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            {[
              { icon: '🏥', titulo: 'Validação Real', desc: 'IRB/CEP + 500 médicos reais + 5.000 casos prospectivos' },
              { icon: '🤝', titulo: 'Parcerias Hospitalares', desc: '5 PoCs hospitalares + integração HIS real em Y1' },
              { icon: '🧬', titulo: 'Laboratórios', desc: 'Genômica + BNAFAR + dados RWE anonimizados' },
              { icon: '⚖️', titulo: 'Regulatório', desc: 'ANVISA SaMD + CFM RT + LGPD DPO — 18–24 meses' },
            ].map((f, i) => (
              <div key={i} className="bg-white bg-opacity-10 rounded-xl p-3">
                <p className="text-lg mb-1">{f.icon}</p>
                <p className="text-xs font-bold text-white">{f.titulo}</p>
                <p className="text-xs text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            É aí que o valor comercial do PRESCREVE-AI começa a crescer exponencialmente. A tecnologia está pronta. O próximo passo é real.
          </p>
        </div>
      </div>
    </div>
  );
}
