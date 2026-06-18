'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/store';
import { ClientDate } from '@/components/ui/client-date';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, FilePlus2, Clock, CheckCircle2, Activity, FileText } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

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

const STATUS_ICONS: Record<string, React.ElementType> = {
  anamnese: Activity,
  diagnostico: Activity,
  terapeutico: Activity,
  prescricao: FileText,
  concluida: CheckCircle2,
};

export default function Historico() {
  const { state } = useApp();
  const [search, setSearch] = useState('');

  const filtered = state.consultations.filter(c =>
    c.paciente_nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Histórico de Consultas</h1>
            <p className="text-slate-500 text-sm mt-1">{state.consultations.length} consultas registradas</p>
          </div>
          <Link href="/consulta/nova">
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <FilePlus2 className="w-4 h-4" />
              Nova Consulta
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-10"
            placeholder="Buscar por nome do paciente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        <div className="space-y-3">
          {filtered.map(c => {
            const Icon = STATUS_ICONS[c.status] ?? Activity;
            return (
              <Card key={c.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="pt-0 pb-0">
                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-700">
                          {c.paciente_nome.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{c.paciente_nome}</p>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <ClientDate date={c.data} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {c.diagnostico_selecionado && (
                        <span className="text-xs text-slate-500 max-w-48 truncate">
                          {c.diagnostico_selecionado}
                        </span>
                      )}
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${STATUS_COLORS[c.status]}`}>
                        <Icon className="w-3 h-3" />
                        {STATUS_LABELS[c.status]}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma consulta encontrada</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
