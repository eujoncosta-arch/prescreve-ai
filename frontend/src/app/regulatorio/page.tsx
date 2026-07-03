'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  avaliarCompliance,
  getVersionManifest,
  getMatrizRastreabilidade,
  getRiscosSaMD,
  getControlesISO27001,
  listarConsentimentos,
  listarLogs,
  verificarIntegridadeLogs,
  testarCriptografia,
  registrarConsentimento,
  revogarConsentimento,
  seedLogsDemo,
  VERSAO_SISTEMA,
  BUILD_DATE,
  IEC62304_CLASSE,
  SAMD_CLASSE_ANVISA,
  type ComplianceReport,
  type RegulatoryLog,
  type ConsentRecord,
  type RequisitoRastreabilidade,
  type RiscoSaMD,
  type ControleSeguranca,
  type StatusControle,
  type FinalidadeLGPD,
} from '@/lib/regulatory';
import {
  ShieldCheck, Lock, FileText, GitBranch, Microscope, ScrollText,
  AlertTriangle, CheckCircle2, Clock, XCircle, ChevronRight,
  Download, RefreshCw, Eye, EyeOff, Info, Building2, Scale,
  Activity, Database, Key, Globe, Fingerprint, ClipboardList,
  BookOpen, BarChart3, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── helpers ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<StatusControle, { label: string; color: string; icon: React.ElementType }> = {
  implementado:  { label: 'Implementado',   color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle2 },
  parcial:       { label: 'Parcial',        color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',         icon: Clock },
  planejado:     { label: 'Planejado',      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',             icon: GitBranch },
  nao_aplicavel: { label: 'N/A',            color: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',            icon: XCircle },
};

const COR_SCORE: Record<string, string> = {
  emerald: 'bg-emerald-500', blue: 'bg-blue-500', violet: 'bg-violet-500',
  amber:   'bg-amber-500',   rose:  'bg-rose-500', orange: 'bg-orange-500',
};

const NORMA_ICONE: Record<string, React.ElementType> = {
  'LGPD': ShieldCheck, 'CFM': Microscope, 'ANVISA': Building2,
  'ISO 27001': Lock, 'IEC 62304': GitBranch, 'ISO 13485': Scale,
};

function StatusBadge({ status }: { status: StatusControle }) {
  const m = STATUS_META[status];
  const Icon = m.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full', m.color)}>
      <Icon className="w-2.5 h-2.5" />
      {m.label}
    </span>
  );
}

function RiscoNivel({ p, s }: { p: number; s: number }) {
  const score = p * s;
  const cor = score >= 15 ? 'bg-red-500' : score >= 8 ? 'bg-amber-500' : 'bg-emerald-500';
  const label = score >= 15 ? 'Alto' : score >= 8 ? 'Moderado' : 'Baixo';
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('w-2 h-2 rounded-full', cor)} />
      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{label} ({score})</span>
    </div>
  );
}

function ScoreBar({ pct, cor }: { pct: number; cor: string }) {
  const bg = COR_SCORE[cor] ?? 'bg-blue-500';
  return (
    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full transition-all duration-700', bg)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function LogRow({ log }: { log: RegulatoryLog }) {
  const cor = log.resultado === 'sucesso' ? 'text-emerald-600' : log.resultado === 'aviso' ? 'text-amber-600' : 'text-red-600';
  const icone = log.resultado === 'sucesso' ? '●' : log.resultado === 'aviso' ? '▲' : '✕';
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0 text-xs">
      <span className={cn('mt-0.5 flex-shrink-0 text-[11px]', cor)}>{icone}</span>
      <div className="flex-1 min-w-0">
        <p className="text-slate-700 dark:text-slate-300 font-medium truncate">{log.descricao}</p>
        <p className="text-slate-400 text-[10px] mt-0.5">{log.tipo} · {new Date(log.timestamp).toLocaleString('pt-BR')}</p>
      </div>
      <span className="text-[9px] font-mono text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5">{log.hash_integridade.slice(0, 8)}</span>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'lgpd' | 'seguranca' | 'ciclovida' | 'samd' | 'rastreabilidade' | 'logs';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',         label: 'Overview',          icon: BarChart3     },
  { id: 'lgpd',             label: 'LGPD',              icon: ShieldCheck   },
  { id: 'seguranca',        label: 'Segurança',         icon: Lock          },
  { id: 'ciclovida',        label: 'Ciclo de Vida',     icon: GitBranch     },
  { id: 'samd',             label: 'SaMD / ANVISA',     icon: Building2     },
  { id: 'rastreabilidade',  label: 'Rastreabilidade',   icon: ClipboardList },
  { id: 'logs',             label: 'Logs',              icon: ScrollText    },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegulatorioPage() {
  const [tab, setTab]                 = useState<Tab>('overview');
  const [report, setReport]           = useState<ComplianceReport | null>(null);
  const [logs, setLogs]               = useState<RegulatoryLog[]>([]);
  const [consentimentos, setConsentimentos] = useState<ConsentRecord[]>([]);
  const [integridade, setIntegridade] = useState<{ total: number; corrompidos: number } | null>(null);
  const [cryptoOk, setCryptoOk]       = useState<boolean | null>(null);
  const [loading, setLoading]         = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    seedLogsDemo();
    setReport(avaliarCompliance());
    setLogs(listarLogs({ limit: 100 }));
    setConsentimentos(listarConsentimentos());
    setIntegridade(verificarIntegridadeLogs());
    setCryptoOk(await testarCriptografia());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const manifest    = getVersionManifest();
  const matriz      = getMatrizRastreabilidade();
  const riscos      = getRiscosSaMD();
  const iso27       = getControlesISO27001();

  if (loading || !report) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Avaliando compliance…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white">Regulatory Readiness</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">LGPD · CFM · ANVISA · ISO 27001 · ISO 13485 · IEC 62304 · SaMD</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Score global */}
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Compliance Global</p>
                <p className={cn('text-3xl font-black', report.score_global >= 70 ? 'text-emerald-600' : report.score_global >= 50 ? 'text-amber-600' : 'text-red-600')}>
                  {report.score_global}%
                </p>
              </div>
              <button onClick={refresh} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <RefreshCw className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* KPIs rápidos */}
          <div className="grid grid-cols-5 gap-3 mt-4">
            {[
              { label: 'Versão', value: `v${VERSAO_SISTEMA}`, icon: GitBranch, color: 'text-blue-600' },
              { label: 'Classe IEC 62304', value: `Classe ${IEC62304_CLASSE}`, icon: Microscope, color: 'text-violet-600' },
              { label: 'SaMD ANVISA', value: `Classe ${SAMD_CLASSE_ANVISA}`, icon: Building2, color: 'text-amber-600' },
              { label: 'Integridade Logs', value: integridade?.corrompidos === 0 ? 'OK' : `${integridade?.corrompidos} alertas`, icon: Lock, color: integridade?.corrompidos === 0 ? 'text-emerald-600' : 'text-red-600' },
              { label: 'Criptografia', value: cryptoOk ? 'AES-GCM 256 ✓' : 'Falha', icon: Key, color: cryptoOk ? 'text-emerald-600' : 'text-red-600' },
            ].map(kpi => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={cn('w-3.5 h-3.5', kpi.color)} />
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{kpi.label}</p>
                  </div>
                  <p className={cn('text-sm font-bold', kpi.color)}>{kpi.value}</p>
                </div>
              );
            })}
          </div>

          {/* Alertas */}
          {report.alertas.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {report.alertas.map((a, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">{a}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6">
        <div className="max-w-6xl mx-auto flex gap-0 overflow-x-auto scrollbar-none">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap',
                  tab === t.id
                    ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* ── Overview ─────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Scores por norma */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {report.scores.map(score => {
                const Icon = NORMA_ICONE[score.sigla] ?? Shield;
                return (
                  <div key={score.sigla} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-bold text-slate-500 uppercase">{score.sigla}</span>
                      </div>
                      <span className={cn(
                        'text-2xl font-black',
                        score.score_pct >= 70 ? 'text-emerald-600' : score.score_pct >= 50 ? 'text-amber-600' : 'text-red-600',
                      )}>{score.score_pct}%</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-snug">{score.norma}</p>
                    <ScoreBar pct={score.score_pct} cor={score.cor} />
                    <div className="flex justify-between mt-2 text-[10px] text-slate-400">
                      <span className="text-emerald-600">{score.implementados} implementado(s)</span>
                      <span className="text-amber-600">{score.parciais} parcial(is)</span>
                      <span className="text-blue-600">{score.planejados} planejado(s)</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Próximas ações */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-blue-500" />
                Próximas Ações Regulatórias
              </h3>
              <div className="space-y-2">
                {report.proximas_acoes.map((acao, i) => (
                  <div key={i} className="flex gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{acao}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Normas — sumário textual */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { sigla: 'LGPD', titulo: 'Lei 13.709/2018', texto: 'Tratamento de dados pessoais de saúde com base jurídica no Art.9 IV (tutela da saúde). Consentimento registrado, logs de tratamento e exportação de dados implementados. Pendente: DPIA formal e designação de DPO.' },
                { sigla: 'CFM', titulo: 'Resoluções CFM 2228/2019, 2314/2022', texto: 'Software posicionado como suporte à decisão clínica — não substitui julgamento médico. Rastreabilidade de condutas e prescrições via Medical Audit Engine. Prontuário eletrônico com hash de integridade (CFM 1821/2007).' },
                { sigla: 'ANVISA', titulo: 'RDC 657/2022 — SaMD Classe II', texto: 'Classificado como Software as a Medical Device de risco moderado-baixo (Classe II ANVISA / Classe II IMDRF N41). Funciona como Decision Support para profissionais de saúde. Registro ANVISA planejado para Q4/2026.' },
                { sigla: 'IEC 62304', titulo: 'Software Médico Classe B', texto: 'Ciclo de vida de software médico com risco moderado (Classe B — sem risco de suporte de vida direto). Controle de versão via Git (IEC 62304 §6), changelog estruturado. Plano formal de desenvolvimento planejado.' },
                { sigla: 'ISO 27001', titulo: 'Segurança da Informação', texto: 'Criptografia AES-GCM 256 via Web Crypto API (A.10). Logs de eventos com integridade (A.12.4). HTTPS enforced + headers de segurança via Vercel (A.13). Política formal de SI e controle de acesso planejados.' },
                { sigla: 'ISO 13485', titulo: 'Gestão da Qualidade', texto: 'Estrutura de qualidade em elaboração. Comitê científico operacional para revisão de evidências. Governança de diretrizes com versionamento. SGQ formal (manual, procedimentos, rastreabilidade de mudanças) planejado.' },
              ].map(n => (
                <div key={n.sigla} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black bg-slate-700 dark:bg-slate-600 text-white px-2 py-0.5 rounded">{n.sigla}</span>
                    <span className="text-[11px] text-slate-400">{n.titulo}</span>
                  </div>
                  <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">{n.texto}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LGPD ─────────────────────────────────────────────────────── */}
        {tab === 'lgpd' && (
          <div className="space-y-5">
            {/* DPIA Summary */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-violet-500" />
                DPIA — Avaliação de Impacto à Proteção de Dados
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {[
                  { label: 'Controlador', value: 'Eurofarma Laboratórios S.A.' },
                  { label: 'DPO',         value: 'A designar — Q3/2026' },
                  { label: 'Natureza dos dados', value: 'Dados de saúde (Art.9 LGPD)' },
                  { label: 'Base jurídica', value: 'Art.9 IV — Tutela da saúde' },
                  { label: 'Retenção', value: 'Prontuário: 20 anos (CFM). Logs: 5 anos.' },
                  { label: 'Versão da política', value: 'v1.1 — 2026-07-02' },
                ].map(item => (
                  <div key={item.label} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{item.label}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex gap-2">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-blue-700 dark:text-blue-300">DPIA formal deve ser elaborada antes do registro ANVISA e do lançamento comercial. Inclui mapeamento de fluxos de dados, análise de risco de privacidade e medidas de mitigação documentadas.</p>
              </div>
            </div>

            {/* Finalidades de tratamento */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-500" />
                Finalidades de Tratamento de Dados
              </h3>
              <div className="space-y-2">
                {([
                  { id: 'assistencia_medica',     label: 'Assistência Médica',          base: 'Art.9 IV', descricao: 'Suporte à prescrição e conduta clínica do médico', essencial: true },
                  { id: 'prescricao',             label: 'Geração de Prescrição',       base: 'Art.9 IV', descricao: 'Criação de prescrições médicas digitais', essencial: true },
                  { id: 'auditoria_interna',      label: 'Auditoria Clínica',           base: 'Art.9 IV', descricao: 'Rastreabilidade de condutas para segurança jurídica do médico', essencial: true },
                  { id: 'melhoria_sistema',       label: 'Melhoria do Sistema',         base: 'Art.7 VI', descricao: 'Análise técnica anonimizada para melhoria de funcionalidades', essencial: false },
                  { id: 'analytics_anonimizado',  label: 'Analytics Coletivo',          base: 'Art.7 VI', descricao: 'Clinical Insights anonimizados com k-anonimidade ≥3', essencial: false },
                ] as const).map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{f.label}</p>
                        {f.essencial && <span className="text-[9px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">Essencial</span>}
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-mono">{f.base}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{f.descricao}</p>
                    </div>
                    <button
                      onClick={() => {
                        registrarConsentimento([f.id as FinalidadeLGPD]);
                        setConsentimentos(listarConsentimentos());
                      }}
                      className="text-[10px] font-bold px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex-shrink-0"
                    >
                      Registrar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Histórico de consentimentos */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-slate-500" />
                Registros de Consentimento
                <span className="ml-auto text-[10px] font-bold text-slate-400">{consentimentos.length} registros</span>
              </h3>
              {consentimentos.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Nenhum consentimento registrado nesta sessão.</p>
              ) : (
                <div className="space-y-2">
                  {consentimentos.slice(0, 10).map(c => (
                    <div key={c.id} className={cn(
                      'p-3 rounded-xl border text-xs',
                      c.revogado
                        ? 'border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10'
                        : 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/10',
                    )}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-700 dark:text-slate-300">
                            {c.revogado ? '🔴 Revogado' : '🟢 Ativo'} · Política v{c.versao_politica}
                          </p>
                          <p className="text-slate-400 mt-0.5">{c.finalidades.join(', ')} · {new Date(c.timestamp).toLocaleString('pt-BR')}</p>
                        </div>
                        {!c.revogado && (
                          <button
                            onClick={() => { revogarConsentimento(c.finalidades[0]); setConsentimentos(listarConsentimentos()); }}
                            className="text-[10px] font-bold px-2 py-1 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                          >
                            Revogar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Direitos do titular */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-500" />
                Direitos do Titular (Art.18 LGPD)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { direito: 'Confirmação de tratamento', status: 'implementado', nota: 'Módulo LGPD desta tela' },
                  { direito: 'Acesso aos dados', status: 'implementado', nota: 'Exportação JSON disponível' },
                  { direito: 'Correção de dados', status: 'parcial', nota: 'Edição de perfil disponível' },
                  { direito: 'Portabilidade', status: 'implementado', nota: 'Exportação CSV/JSON' },
                  { direito: 'Exclusão', status: 'parcial', nota: 'Requer backend — planejado' },
                  { direito: 'Revogação de consentimento', status: 'implementado', nota: 'Botão "Revogar" nesta tela' },
                  { direito: 'Oposição ao tratamento', status: 'planejado', nota: 'Q3/2026' },
                  { direito: 'Informação sobre compartilhamento', status: 'implementado', nota: 'DPIA documenta parceiros' },
                  { direito: 'Revisão de decisão automatizada', status: 'implementado', nota: 'Sem decisão autônoma — médico valida tudo' },
                ].map(item => (
                  <div key={item.direito} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">{item.direito}</p>
                    <StatusBadge status={item.status as StatusControle} />
                    <p className="text-[10px] text-slate-400 mt-1">{item.nota}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Segurança ────────────────────────────────────────────────── */}
        {tab === 'seguranca' && (
          <div className="space-y-5">
            {/* Criptografia */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" />
                Status de Criptografia
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Algoritmo',        value: 'AES-GCM',     detail: '256-bit' },
                  { label: 'Derivação de chave', value: 'PBKDF2',   detail: '100.000 iterações' },
                  { label: 'Hash de integridade', value: 'DJB2',    detail: 'Por registro de auditoria' },
                  { label: 'Transporte',        value: 'TLS 1.3',    detail: 'HTTPS enforced (Vercel)' },
                  { label: 'Teste runtime',     value: cryptoOk ? 'PASSOU' : 'FALHOU', detail: 'Web Crypto API nativa', status: cryptoOk },
                  { label: 'Integridade logs',  value: `${integridade?.corrompidos === 0 ? 'OK' : integridade?.corrompidos + ' erros'}`, detail: `${integridade?.total} logs verificados`, status: integridade?.corrompidos === 0 },
                  { label: 'CSP',              value: 'Configurado', detail: 'Content-Security-Policy header' },
                  { label: 'HSTS',             value: 'Ativo',       detail: 'Strict-Transport-Security' },
                ].map(item => (
                  <div key={item.label} className={cn(
                    'p-3 rounded-xl border',
                    'status' in item
                      ? item.status ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/10' : 'border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10'
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50',
                  )}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">{item.value}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ISO 27001 Controls */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-500" />
                Controles ISO 27001:2022
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 pr-3 text-[10px] font-bold text-slate-400 uppercase w-16">Código</th>
                      <th className="text-left py-2 pr-3 text-[10px] font-bold text-slate-400 uppercase">Controle</th>
                      <th className="text-left py-2 pr-3 text-[10px] font-bold text-slate-400 uppercase w-28">Status</th>
                      <th className="text-left py-2 text-[10px] font-bold text-slate-400 uppercase">Evidência / Prazo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {iso27.map(c => (
                      <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 pr-3 font-mono text-slate-500 text-[11px]">{c.codigo}</td>
                        <td className="py-2.5 pr-3">
                          <p className="font-semibold text-slate-700 dark:text-slate-300">{c.titulo}</p>
                          <p className="text-slate-400 mt-0.5 text-[11px]">{c.descricao}</p>
                        </td>
                        <td className="py-2.5 pr-3"><StatusBadge status={c.status} /></td>
                        <td className="py-2.5 text-[11px] text-slate-400">{c.evidencia ?? c.prazo ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Headers de segurança */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-500" />
                HTTP Security Headers
              </h3>
              <div className="space-y-2">
                {[
                  { header: 'Content-Security-Policy', valor: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'", status: 'implementado' },
                  { header: 'Strict-Transport-Security', valor: 'max-age=63072000; includeSubDomains; preload', status: 'implementado' },
                  { header: 'X-Content-Type-Options', valor: 'nosniff', status: 'implementado' },
                  { header: 'X-Frame-Options', valor: 'DENY', status: 'implementado' },
                  { header: 'Referrer-Policy', valor: 'strict-origin-when-cross-origin', status: 'implementado' },
                  { header: 'Permissions-Policy', valor: 'camera=(), microphone=(), geolocation=()', status: 'implementado' },
                ].map(h => (
                  <div key={h.header} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <StatusBadge status={h.status as StatusControle} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{h.header}</p>
                      <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{h.valor}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Ciclo de Vida ─────────────────────────────────────────────── */}
        {tab === 'ciclovida' && (
          <div className="space-y-5">
            {/* Fase atual */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-violet-500" />
                Fase IEC 62304 Atual
              </h3>
              <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
                {(['desenvolvimento', 'verificacao', 'validacao', 'liberacao', 'manutencao'] as const).map((fase, i) => {
                  const ativa = fase === manifest.fase_iec62304;
                  const passada = i < (['desenvolvimento', 'verificacao', 'validacao', 'liberacao', 'manutencao'] as const).indexOf(manifest.fase_iec62304);
                  return (
                    <div key={fase} className="flex items-center gap-1 flex-shrink-0">
                      <div className={cn(
                        'px-3 py-2 rounded-lg text-[11px] font-semibold capitalize whitespace-nowrap',
                        ativa ? 'bg-violet-600 text-white shadow-md' : passada ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400',
                      )}>
                        {ativa ? '▶ ' : passada ? '✓ ' : ''}{fase}
                      </div>
                      {i < 4 && <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Versão</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">v{manifest.versao}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Build Date</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{manifest.build_date}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Classe IEC 62304</p>
                  <p className="text-sm font-bold text-violet-600">Classe {manifest.classe_iec62304}</p>
                  <p className="text-[10px] text-slate-400">Risco moderado — sem suporte de vida</p>
                </div>
              </div>
            </div>

            {/* Changelog */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                Changelog — Controle de Versão (IEC 62304 §6)
              </h3>
              <div className="space-y-2">
                {manifest.changelog.map((c, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="flex-shrink-0 text-right w-14">
                      <p className="text-[11px] font-black text-slate-700 dark:text-slate-300">v{c.versao}</p>
                      <p className="text-[9px] text-slate-400">{c.data}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={cn(
                          'text-[9px] font-black px-1.5 py-0.5 rounded uppercase',
                          c.tipo === 'major' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          c.tipo === 'minor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          c.tipo === 'security' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                        )}>{c.tipo}</span>
                        {c.commit && <span className="text-[9px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{c.commit}</span>}
                      </div>
                      <p className="text-[12px] text-slate-600 dark:text-slate-400">{c.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Componentes de software */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-500" />
                Inventário de Componentes de Software (IEC 62304 §8)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      {['Componente', 'Versão', 'Licença', 'Crítico', 'CVE Verificado'].map(h => (
                        <th key={h} className="text-left py-2 pr-4 text-[10px] font-bold text-slate-400 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {manifest.componentes.map(c => (
                      <tr key={c.nome} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 pr-4 font-semibold text-slate-700 dark:text-slate-300">{c.nome}</td>
                        <td className="py-2 pr-4 font-mono text-slate-500">{c.versao}</td>
                        <td className="py-2 pr-4 text-slate-500">{c.licenca}</td>
                        <td className="py-2 pr-4">{c.critico ? <span className="text-amber-600 font-bold">Sim</span> : <span className="text-slate-400">Não</span>}</td>
                        <td className="py-2">{c.cve_verificado ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── SaMD / ANVISA ─────────────────────────────────────────────── */}
        {tab === 'samd' && (
          <div className="space-y-5">
            {/* Classificação */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-500" />
                Classificação SaMD — ANVISA / IMDRF
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Classificação ANVISA', value: 'Classe II', detail: 'RDC 657/2022', color: 'text-amber-600' },
                  { label: 'Classificação IMDRF', value: 'Classe II', detail: 'IMDRF N41 Framework', color: 'text-amber-600' },
                  { label: 'Tipo SaMD', value: 'Decision Support', detail: 'Não substitui julgamento clínico', color: 'text-blue-600' },
                  { label: 'Estado do registro', value: 'Planejado', detail: 'Q4/2026', color: 'text-slate-500' },
                ].map(item => (
                  <div key={item.label} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{item.label}</p>
                    <p className={cn('text-base font-black', item.color)}>{item.value}</p>
                    <p className="text-[10px] text-slate-400">{item.detail}</p>
                  </div>
                ))}
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 mb-1">Critério de classificação IMDRF N41</p>
                  <p className="text-[12px] text-amber-800 dark:text-amber-200">
                    Software destinado a informar decisão clínica (treat or diagnose) + paciente não em estado crítico imediato + médico valida toda conduta = <strong>Classe II</strong>. Não realiza diagnóstico autônomo, não controla dispositivo de suporte de vida.
                  </p>
                </div>
              </div>
            </div>

            {/* Registro de riscos */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Registro de Riscos — ISO 14971 (Gestão de Riscos para Dispositivos Médicos)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 pr-3 text-[10px] font-bold text-slate-400 uppercase w-10">ID</th>
                      <th className="text-left py-2 pr-3 text-[10px] font-bold text-slate-400 uppercase">Risco</th>
                      <th className="text-left py-2 pr-3 text-[10px] font-bold text-slate-400 uppercase w-24">Categoria</th>
                      <th className="text-left py-2 pr-3 text-[10px] font-bold text-slate-400 uppercase w-24">Nível</th>
                      <th className="text-left py-2 pr-3 text-[10px] font-bold text-slate-400 uppercase">Mitigação</th>
                      <th className="text-left py-2 text-[10px] font-bold text-slate-400 uppercase w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riscos.map(r => (
                      <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-400">{r.id}</td>
                        <td className="py-2.5 pr-3 text-slate-700 dark:text-slate-300 text-[11px] leading-snug">{r.descricao}</td>
                        <td className="py-2.5 pr-3 text-[10px]">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                            {r.categoria.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3"><RiscoNivel p={r.probabilidade} s={r.severidade} /></td>
                        <td className="py-2.5 pr-3 text-[11px] text-slate-500 leading-snug">{r.mitigacao}</td>
                        <td className="py-2.5"><StatusBadge status={r.status_mitigacao} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CFM */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Microscope className="w-4 h-4 text-blue-500" />
                Resoluções CFM Aplicáveis
              </h3>
              <div className="space-y-3">
                {[
                  { res: 'CFM 2228/2019', titulo: 'Telemedicina', descricao: 'Regulamenta o uso de tecnologias para atendimento médico. Exige identificação do médico, rastreabilidade e consentimento do paciente. Compliance: Medical Audit Engine registra médico, CRM, timestamp e conduta.', status: 'implementado' as StatusControle },
                  { res: 'CFM 2314/2022', titulo: 'Nova Resolução de Telemedicina', descricao: 'Consolida e atualiza normas de telemedicina. Consentimento informado obrigatório, prescrição eletrônica válida com assinatura digital, sigilo médico preservado. Compliance: consentimento LGPD + módulo de prescrição.', status: 'parcial' as StatusControle },
                  { res: 'CFM 1821/2007', titulo: 'Prontuário Eletrônico', descricao: 'Autoriza o uso do prontuário eletrônico e define requisitos de integridade, autenticidade e sigilo. Exige sistema que impeça alteração posterior sem registro. Compliance: hash de integridade DJB2 por registro de auditoria.', status: 'implementado' as StatusControle },
                  { res: 'CFM 2217/2018', titulo: 'Código de Ética Médica', descricao: 'Software de suporte à decisão não pode substituir o julgamento clínico do médico. Toda conduta é de responsabilidade do profissional. Compliance: disclaimer em todas as telas clínicas; sistema não faz diagnóstico autônomo.', status: 'implementado' as StatusControle },
                ].map(item => (
                  <div key={item.res} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-black bg-blue-700 text-white px-2 py-0.5 rounded">{item.res}</span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.titulo}</span>
                      <div className="ml-auto"><StatusBadge status={item.status} /></div>
                    </div>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">{item.descricao}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Rastreabilidade ───────────────────────────────────────────── */}
        {tab === 'rastreabilidade' && (
          <div className="space-y-5">
            {/* Sumário */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { tipo: 'requisito',       label: 'Requisitos',       cor: 'text-blue-600' },
                { tipo: 'funcionalidade',  label: 'Funcionalidades',  cor: 'text-emerald-600' },
                { tipo: 'teste',           label: 'Testes',           cor: 'text-violet-600' },
                { tipo: 'risco',           label: 'Riscos',           cor: 'text-amber-600' },
              ].map(item => {
                const total  = matriz.filter(r => r.tipo === item.tipo).length;
                const ok     = matriz.filter(r => r.tipo === item.tipo && r.status === 'atendido').length;
                return (
                  <div key={item.tipo} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center">
                    <p className={cn('text-2xl font-black', item.cor)}>{total}</p>
                    <p className="text-[11px] text-slate-500 font-medium">{item.label}</p>
                    <p className="text-[10px] text-emerald-600 mt-1">{ok} atendido(s)</p>
                  </div>
                );
              })}
            </div>

            {/* Matriz completa */}
            {(['requisito', 'funcionalidade'] as const).map(tipo => (
              <div key={tipo} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 capitalize flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-slate-500" />
                  {tipo === 'requisito' ? 'Requisitos Normativos' : 'Funcionalidades Implementadas'}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 pr-3 text-[10px] font-bold text-slate-400 uppercase w-24">Código</th>
                        <th className="text-left py-2 pr-3 text-[10px] font-bold text-slate-400 uppercase">Descrição</th>
                        {tipo === 'requisito' && <th className="text-left py-2 pr-3 text-[10px] font-bold text-slate-400 uppercase w-20">Norma</th>}
                        <th className="text-left py-2 pr-3 text-[10px] font-bold text-slate-400 uppercase w-28">Vínculos</th>
                        <th className="text-left py-2 text-[10px] font-bold text-slate-400 uppercase w-24">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matriz.filter(r => r.tipo === tipo).map(r => (
                        <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-500">{r.codigo}</td>
                          <td className="py-2.5 pr-3 text-slate-700 dark:text-slate-300 text-[11px]">{r.descricao}</td>
                          {tipo === 'requisito' && <td className="py-2.5 pr-3"><span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">{r.norma_origem}</span></td>}
                          <td className="py-2.5 pr-3">
                            <div className="flex flex-wrap gap-1">
                              {r.vinculados.slice(0, 3).map(v => (
                                <span key={v} className="text-[9px] font-mono bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded">{v}</span>
                              ))}
                              {r.vinculados.length > 3 && <span className="text-[9px] text-slate-400">+{r.vinculados.length - 3}</span>}
                            </div>
                          </td>
                          <td className="py-2.5">
                            <StatusBadge status={
                              r.status === 'atendido' ? 'implementado' : r.status === 'pendente' ? 'planejado' : 'parcial'
                            } />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Logs ──────────────────────────────────────────────────────── */}
        {tab === 'logs' && (
          <div className="space-y-5">
            {/* Status de integridade */}
            <div className={cn(
              'rounded-2xl p-4 border flex items-start gap-3',
              integridade?.corrompidos === 0
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
            )}>
              {integridade?.corrompidos === 0
                ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                : <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              }
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Integridade dos logs: {integridade?.corrompidos === 0 ? '✓ Todos íntegros' : `⚠ ${integridade?.corrompidos} log(s) corrompido(s)`}
                </p>
                <p className="text-[12px] text-slate-500 mt-0.5">{integridade?.total} logs verificados · Hash DJB2 por registro · conforme CFM 1821/2007 e ISO 27001 A.12.4</p>
              </div>
            </div>

            {/* KPIs dos logs */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total',     valor: logs.length,                                              cor: 'text-slate-700 dark:text-slate-300' },
                { label: 'Sucesso',   valor: logs.filter(l => l.resultado === 'sucesso').length,       cor: 'text-emerald-600' },
                { label: 'Falha',     valor: logs.filter(l => l.resultado === 'falha').length,         cor: 'text-red-600' },
                { label: 'Aviso',     valor: logs.filter(l => l.resultado === 'aviso').length,         cor: 'text-amber-600' },
              ].map(k => (
                <div key={k.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center">
                  <p className={cn('text-2xl font-black', k.cor)}>{k.valor}</p>
                  <p className="text-[11px] text-slate-500">{k.label}</p>
                </div>
              ))}
            </div>

            {/* Lista de logs */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-slate-500" />
                  Eventos Regulatórios Recentes
                </h3>
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
                    const url  = URL.createObjectURL(blob);
                    const a    = document.createElement('a');
                    a.href = url; a.download = `regulatory_logs_${Date.now()}.json`; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
                >
                  <Download className="w-3 h-3" />
                  Exportar JSON
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[560px] overflow-y-auto">
                {logs.map(log => <LogRow key={log.id} log={log} />)}
                {logs.length === 0 && <p className="text-sm text-slate-400 text-center py-8">Nenhum log encontrado.</p>}
              </div>
            </div>

            {/* Nota legal */}
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4 flex gap-2">
              <FileText className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Logs regulatórios são mantidos com <strong>hash de integridade DJB2</strong> por registro, conforme CFM 1821/2007 (prontuário eletrônico) e ISO 27001:2022 A.12.4. Retenção mínima recomendada: <strong>5 anos</strong> para logs de sistema e <strong>20 anos</strong> para registros clínicos (resolução CFM). Em produção, logs devem ser espelhados em backend imutável (append-only log store).
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
