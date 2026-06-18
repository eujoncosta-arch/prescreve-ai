'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/store';
import { ClientDate } from '@/components/ui/client-date';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  FilePlus2,
  Users,
  FileText,
  AlertTriangle,
  BookOpen,
  Clock,
  CheckCircle2,
  Activity,
  ChevronRight,
  Stethoscope,
  TrendingUp,
  Shield,
  Sparkles,
  Building2,
  Award,
} from 'lucide-react';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
  anamnese: 'Anamnese',
  diagnostico: 'Diagnóstico',
  terapeutico: 'Terapêutico',
  prescricao: 'Prescrição',
  concluida: 'Concluída',
};

const STATUS_COLORS: Record<string, string> = {
  anamnese: 'bg-yellow-100 text-yellow-700',
  diagnostico: 'bg-blue-100 text-blue-700',
  terapeutico: 'bg-purple-100 text-purple-700',
  prescricao: 'bg-orange-100 text-orange-700',
  concluida: 'bg-green-100 text-green-700',
};

// Estatísticas executivas simuladas
const EXEC_STATS = {
  especialidades: 12,
  diretrizes: 6,
  moleculas: 24,
  tempoMedio: '4,2 min',
  economiaMedia: '8,5 min/consulta',
  seguranca: '100%',
};

export default function Dashboard() {
  const { state } = useApp();
  const [now, setNow] = useState('');
  useEffect(() => {
    setNow(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }));
  }, []);

  const total = state.consultations.length;
  const concluidas = state.consultations.filter(c => c.status === 'concluida').length;
  const emAndamento = total - concluidas;
  const prescricoes = state.consultations.filter(c => c.prescricao).length;

  return (
    <AppShell>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">
              Bom dia, {state.settings.medico.nome} — {now}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/demo">
              <Button variant="outline" className="gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-blue-500" />
                Casos Demo
              </Button>
            </Link>
            <Link href="/consulta/nova">
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                <FilePlus2 className="w-4 h-4" />
                Nova Consulta
              </Button>
            </Link>
          </div>
        </div>

        {/* KPIs principais */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total consultas', value: total, icon: Users, color: 'blue', sub: 'registradas' },
            { label: 'Concluídas', value: concluidas, icon: CheckCircle2, color: 'green', sub: `${total > 0 ? Math.round((concluidas/total)*100) : 0}% do total` },
            { label: 'Em andamento', value: emAndamento, icon: Activity, color: 'yellow', sub: 'aguardando' },
            { label: 'Prescrições', value: prescricoes, icon: FileText, color: 'purple', sub: 'emitidas' },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <Card key={label} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 bg-${color}-50 rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 text-${color}-600`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                    <p className="text-xs font-medium text-slate-600">{label}</p>
                    <p className="text-xs text-slate-400">{sub}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Consultas recentes */}
          <div className="col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold">Consultas Recentes</CardTitle>
                <Link href="/historico" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  Ver todas <ChevronRight className="w-3 h-3" />
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {state.consultations.slice(0, 5).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                          <span className="text-xs font-bold text-white">
                            {c.paciente_nome.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{c.paciente_nome}</p>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="w-3 h-3" />
                            <ClientDate date={c.data} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.diagnostico_selecionado && (
                          <span className="text-xs text-slate-400 max-w-32 truncate hidden lg:block">
                            {c.diagnostico_selecionado.split(' ')[0]}...
                          </span>
                        )}
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status]}`}>
                          {STATUS_LABELS[c.status]}
                        </span>
                      </div>
                    </div>
                  ))}
                  {state.consultations.length === 0 && (
                    <div className="text-center py-8">
                      <Stethoscope className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">Nenhuma consulta ainda</p>
                      <Link href="/consulta/nova">
                        <Button variant="outline" size="sm" className="mt-3 gap-1">
                          <FilePlus2 className="w-3 h-3" /> Iniciar primeira consulta
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Dashboard Executivo */}
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  Métricas Executivas — PRESCREVE-AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: Stethoscope, label: 'Especialidades', value: EXEC_STATS.especialidades, sub: 'suportadas', color: 'text-blue-400' },
                    { icon: BookOpen, label: 'Diretrizes', value: EXEC_STATS.diretrizes, sub: 'integradas', color: 'text-green-400' },
                    { icon: Building2, label: 'Moléculas', value: EXEC_STATS.moleculas, sub: 'no banco', color: 'text-purple-400' },
                  ].map(({ icon: Icon, label, value, sub, color }) => (
                    <div key={label} className="text-center">
                      <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                      <p className="text-2xl font-bold text-white">{value}</p>
                      <p className="text-xs text-slate-300">{label}</p>
                      <p className="text-xs text-slate-500">{sub}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-sm font-bold text-emerald-400">{EXEC_STATS.tempoMedio}</p>
                    <p className="text-xs text-slate-400">Tempo médio/consulta</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-400">{EXEC_STATS.economiaMedia}</p>
                    <p className="text-xs text-slate-400">Economia de tempo</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-green-400">{EXEC_STATS.seguranca}</p>
                    <p className="text-xs text-slate-400">Validação segurança</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna lateral */}
          <div className="space-y-4">
            {/* Ações rápidas */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { href: '/consulta/nova', icon: FilePlus2, label: 'Nova Consulta', color: 'text-blue-500' },
                  { href: '/demo', icon: Sparkles, label: 'Casos Demo', color: 'text-indigo-500' },
                  { href: '/prescricoes', icon: FileText, label: 'Prescrições', color: 'text-purple-500' },
                  { href: '/evidencias', icon: BookOpen, label: 'Evidências', color: 'text-green-500' },
                  { href: '/governanca', icon: Shield, label: 'Governança', color: 'text-emerald-500' },
                  { href: '/configuracoes', icon: Award, label: 'Configurações', color: 'text-slate-500' },
                ].map(({ href, icon: Icon, label, color }) => (
                  <Link key={href} href={href}>
                    <Button variant="outline" className="w-full justify-start gap-2 text-sm h-9">
                      <Icon className={`w-4 h-4 ${color}`} />
                      {label}
                    </Button>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Aviso PRESCREVE-AI */}
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Apoio à Decisão Clínica</p>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                      O sistema NÃO substitui o médico. O diagnóstico e a prescrição são de responsabilidade
                      exclusiva do profissional habilitado.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prefêrencia lab */}
            <Card className="border-blue-200">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Lab. Preferido
                  </p>
                  <Link href="/configuracoes" className="text-xs text-blue-600 hover:underline">
                    Alterar
                  </Link>
                </div>
                <p className="text-sm font-semibold text-slate-900 capitalize">
                  {state.settings.preferencia_laboratorio === 'sem_preferencia'
                    ? 'Sem preferência'
                    : state.settings.preferencia_laboratorio.charAt(0).toUpperCase() + state.settings.preferencia_laboratorio.slice(1)}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
