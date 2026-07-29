'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/store';
import { ClientDate } from '@/components/ui/client-date';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Printer, Download, FilePlus2, Clock, RotateCw } from 'lucide-react';
import Link from 'next/link';
import type { Consultation, DoseEstruturada } from '@/lib/types';

/** Formata a dose ESTRUTURADA real para exibição — nunca inventa um texto de posologia que o backend não armazenou. */
function formatarDose(dose: DoseEstruturada): string {
  const partes = [`${dose.valor} ${dose.unidade}`, dose.frequencia === 'outro' || dose.frequencia === 'nao_diaria' ? (dose.frequencia_detalhe ?? dose.frequencia) : dose.frequencia, dose.via];
  return partes.filter(Boolean).join(' · ');
}

/**
 * RM-43: bloco de uma consulta histórica cuja prescrição real existe no
 * backend (`temPrescricaoNoBackend`) mas cujo conteúdo ainda depende de
 * carregamento sob demanda. Mostra sempre um estado explícito — nunca
 * fabrica "0 medicamentos" enquanto o detalhe não foi buscado.
 */
function PrescricaoRecuperadaCard({ c }: { c: Consultation }) {
  const { state, carregarDetalheConsulta } = useApp();
  const backendId = c.sync?.consulta?.backend_id;
  const status = backendId ? (state.consultationDetailStatus[backendId] ?? 'idle') : 'idle';

  return (
    <Card className="hover:shadow-sm transition-shadow">
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
            </div>
          </div>

          {status === 'idle' && (
            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => void carregarDetalheConsulta(c.id)}>
              Carregar detalhes
            </Button>
          )}
          {status === 'loading' && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <RotateCw className="w-3 h-3 animate-spin" /> Carregando…
            </span>
          )}
          {status === 'failed' && (
            <Button variant="outline" size="sm" className="gap-1 text-xs text-red-600 border-red-200" onClick={() => void carregarDetalheConsulta(c.id)}>
              <RotateCw className="w-3 h-3" /> Falhou — tentar novamente
            </Button>
          )}
        </div>

        {status === 'idle' && (
          <p className="text-xs text-slate-500 mt-3">Prescrição registrada no servidor — detalhes da prescrição ainda não carregados.</p>
        )}
        {status === 'failed' && (
          <p className="text-xs text-red-500 mt-3">Não foi possível carregar os detalhes desta prescrição.</p>
        )}
        {status === 'loaded' && (
          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            {(c.prescricoesRecuperadas ?? []).flatMap((p) => p.medicamentos).map((m, i) => (
              <div key={i} className="text-xs text-slate-600">
                <span className="font-medium text-slate-800">{m.molecula}</span> — {formatarDose(m.dose)} · {m.duracao}
                {m.observacoes && <span className="text-slate-400"> ({m.observacoes})</span>}
              </div>
            ))}
            {(c.prescricoesRecuperadas ?? []).flatMap((p) => p.medicamentos).length === 0 && (
              <p className="text-xs text-slate-400">Nenhum medicamento registrado nesta prescrição.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Prescricoes() {
  const { state } = useApp();
  // RM-43: inclui tanto prescrições criadas NESTA sessão (`c.prescricao`,
  // objeto completo) quanto consultas históricas cujo backend confirma
  // uma prescrição real (`temPrescricaoNoBackend`) — mesmo antes do
  // detalhe ter sido carregado. Nunca inclui uma consulta sem nenhum dos
  // dois sinais (isso seria assumir prescrição onde não há confirmação).
  const comPrescricao = state.consultations.filter(c => c.prescricao || c.temPrescricaoNoBackend);

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
          {comPrescricao.map(c => c.prescricao ? (
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
          ) : (
            <PrescricaoRecuperadaCard key={c.id} c={c} />
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
