'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/store';
import { ClientDate } from '@/components/ui/client-date';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Printer, Download, FilePlus2, Clock } from 'lucide-react';
import Link from 'next/link';

export default function Prescricoes() {
  const { state } = useApp();
  const comPrescricao = state.consultations.filter(c => c.prescricao);

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-purple-600" />
              Prescrições Emitidas
            </h1>
            <p className="text-slate-500 text-sm mt-1">{comPrescricao.length} prescrições emitidas</p>
          </div>
          <Link href="/consulta/nova">
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <FilePlus2 className="w-4 h-4" />
              Nova Consulta
            </Button>
          </Link>
        </div>

        <div className="space-y-3">
          {comPrescricao.map(c => (
            <Card key={c.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{c.paciente_nome}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <ClientDate date={c.data} />
                      </div>
                      {c.prescricao && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {c.prescricao.itens.length} medicamento(s) •{' '}
                          {c.prescricao.tipo.replace('_', ' ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1 text-xs">
                      <Printer className="w-3 h-3" /> Imprimir
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1 text-xs">
                      <Download className="w-3 h-3" /> PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {comPrescricao.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma prescrição emitida ainda</p>
              <Link href="/consulta/nova">
                <Button variant="outline" className="mt-4 gap-2">
                  <FilePlus2 className="w-4 h-4" />
                  Iniciar Nova Consulta
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
