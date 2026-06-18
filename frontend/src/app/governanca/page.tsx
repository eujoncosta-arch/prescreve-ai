'use client';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  BookOpen,
  RefreshCw,
  History,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import type { GuidelineVersion } from '@/lib/types';

const DIRETRIZES: GuidelineVersion[] = [
  {
    id: '1',
    diretriz: '7ª Diretriz Brasileira de Hipertensão Arterial',
    sociedade: 'Sociedade Brasileira de Cardiologia (SBC)',
    versao: '7.0',
    ano: 2020,
    data_atualizacao: '2021-03-01',
    data_proxima_revisao: '2025-01-01',
    status: 'ativo',
    resumo_mudancas: 'Nova meta pressórica < 130/80 mmHg para maioria dos pacientes. Inclusão de escore de risco cardiovascular. Atualização das indicações de terapia combinada.',
    responsavel: 'Comitê de Cardiologia — PRESCREVE-AI',
  },
  {
    id: '2',
    diretriz: 'Standards of Medical Care in Diabetes 2024',
    sociedade: 'American Diabetes Association (ADA)',
    versao: '2024',
    ano: 2024,
    data_atualizacao: '2024-01-01',
    data_proxima_revisao: '2025-01-01',
    status: 'ativo',
    resumo_mudancas: 'Expansão das indicações de SGLT-2 e GLP-1. Novas metas de HbA1c por perfil de risco. Atualização do manejo de DRC em DM2.',
    responsavel: 'Comitê de Endocrinologia — PRESCREVE-AI',
  },
  {
    id: '3',
    diretriz: 'Diretrizes SBD 2023-2024',
    sociedade: 'Sociedade Brasileira de Diabetes (SBD)',
    versao: '2023',
    ano: 2023,
    data_atualizacao: '2023-09-15',
    data_proxima_revisao: '2025-09-01',
    status: 'ativo',
    resumo_mudancas: 'Alinhamento com ADA 2023. Novas recomendações nacionais para SGLT-2 e GLP-1.',
    responsavel: 'Comitê de Endocrinologia — PRESCREVE-AI',
  },
  {
    id: '4',
    diretriz: 'ESC Guidelines for the Diagnosis and Treatment of Acute and Chronic Heart Failure 2021',
    sociedade: 'European Society of Cardiology (ESC)',
    versao: '2021',
    ano: 2021,
    data_atualizacao: '2021-08-27',
    data_proxima_revisao: '2026-01-01',
    status: 'ativo',
    resumo_mudancas: 'ARNI (sacubitril/valsartana) como recomendação Classe I. SGLT-2 incluídos no quarteto terapêutico. Nova fenomenologia de IC.',
    responsavel: 'Comitê de Cardiologia — PRESCREVE-AI',
  },
  {
    id: '5',
    diretriz: 'Diretrizes para Manejo da Asma — GINA 2023',
    sociedade: 'Global Initiative for Asthma (GINA)',
    versao: '2023',
    ano: 2023,
    data_atualizacao: '2023-05-01',
    data_proxima_revisao: '2024-05-01',
    status: 'em_revisao',
    resumo_mudancas: 'ICS-formoterol como terapia de alívio preferencial. Redeprescição de SABA como monoterapia.',
    responsavel: 'Comitê de Pneumologia — PRESCREVE-AI',
  },
  {
    id: '6',
    diretriz: 'V Diretriz Brasileira de Dislipidemias e Prevenção da Aterosclerose',
    sociedade: 'Sociedade Brasileira de Cardiologia (SBC)',
    versao: '5.0',
    ano: 2013,
    data_atualizacao: '2013-01-01',
    data_proxima_revisao: '2024-01-01',
    status: 'desatualizado',
    resumo_mudancas: 'Aguardando atualização — VI Diretriz em elaboração.',
    responsavel: 'Comitê de Cardiologia — PRESCREVE-AI',
  },
];

const STATUS_CONFIG = {
  ativo: { label: 'Ativo', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  em_revisao: { label: 'Em Revisão', color: 'bg-yellow-100 text-yellow-700', icon: RefreshCw },
  desatualizado: { label: 'Desatualizado', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

const AUDIT_LOG = [
  { data: '2024-01-15', acao: 'Atualização', diretriz: 'ADA 2024', responsavel: 'Equipe Científica', tipo: 'update' },
  { data: '2023-09-20', acao: 'Inserção', diretriz: 'SBD 2023', responsavel: 'Equipe Científica', tipo: 'insert' },
  { data: '2023-05-05', acao: 'Revisão', diretriz: 'GINA 2023', responsavel: 'Comitê Pneumologia', tipo: 'review' },
  { data: '2021-09-01', acao: 'Inserção', diretriz: 'ESC HF 2021', responsavel: 'Comitê Cardiologia', tipo: 'insert' },
  { data: '2021-03-15', acao: 'Inserção', diretriz: 'SBC HAS 7ª', responsavel: 'Comitê Cardiologia', tipo: 'insert' },
];

export default function Governanca() {
  const ativos = DIRETRIZES.filter(d => d.status === 'ativo').length;
  const emRevisao = DIRETRIZES.filter(d => d.status === 'em_revisao').length;
  const desatualizados = DIRETRIZES.filter(d => d.status === 'desatualizado').length;

  return (
    <AppShell>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-green-600" />
            Governança Científica
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Rastreabilidade completa das diretrizes e evidências que fundamentam o PRESCREVE-AI
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-800">{ativos}</p>
                  <p className="text-xs text-green-600">Diretrizes ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-8 h-8 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold text-yellow-800">{emRevisao}</p>
                  <p className="text-xs text-yellow-600">Em revisão</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-red-800">{desatualizados}</p>
                  <p className="text-xs text-red-600">Desatualizadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Diretrizes */}
          <div className="col-span-2 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Diretrizes Integradas
            </h2>
            {DIRETRIZES.map(d => {
              const cfg = STATUS_CONFIG[d.status];
              const StatusIcon = cfg.icon;
              return (
                <Card key={d.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-slate-900">{d.diretriz}</p>
                        </div>
                        <p className="text-xs text-slate-500">{d.sociedade}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            v{d.versao}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {d.ano}
                          </span>
                          {d.data_proxima_revisao && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Revisão: {new Date(d.data_proxima_revisao).getFullYear()}
                            </span>
                          )}
                        </div>
                        {d.resumo_mudancas && (
                          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                            {d.resumo_mudancas}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0 ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Audit log */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
              <History className="w-4 h-4" /> Histórico de Alterações
            </h2>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="space-y-3">
                  {AUDIT_LOG.map((log, i) => (
                    <div key={i} className="flex items-start gap-2 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        log.tipo === 'update' ? 'bg-blue-500' :
                        log.tipo === 'insert' ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                      <div>
                        <p className="text-xs font-medium text-slate-800">
                          {log.acao} — {log.diretriz}
                        </p>
                        <p className="text-xs text-slate-400">{log.responsavel}</p>
                        <p className="text-xs text-slate-400">{new Date(log.data).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4 border-green-200 bg-green-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-green-800 mb-1">Princípios de Governança</p>
                    <ul className="space-y-1 text-xs text-green-700">
                      <li>• Independência comercial total</li>
                      <li>• Revisão por médicos especialistas</li>
                      <li>• Versionamento rastreável</li>
                      <li>• Fonte sempre visível</li>
                      <li>• Auditoria completa</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
