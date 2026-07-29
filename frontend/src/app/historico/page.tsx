'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/store';
import { ClientDate } from '@/components/ui/client-date';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, FilePlus2, Clock, CheckCircle2, Activity, FileText, RotateCw } from 'lucide-react';
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
  const { state, auth, carregarMaisConsultas, carregarPrimeiraPagina } = useApp();
  const [search, setSearch] = useState('');

  const filtered = state.consultations.filter(c =>
    c.paciente_nome.toLowerCase().includes(search.toLowerCase())
  );

  // RM-44: a paginação só é relevante quando há backend real por trás da
  // lista — em modo demo/sem backend configurado, `consultationsPagination`
  // nunca é atualizada (fica no estado inicial), e a lista inteira já
  // está disponível localmente (MOCK_CONSULTATIONS ou consultas da sessão).
  const paginacaoAtiva = auth.backendMode && !auth.demoMode;
  const { isLoading, isLoadingMore, error, loadMoreError, hasNextPage, currentPage, total } = state.consultationsPagination;

  // Carregamento inicial: nenhuma página bem-sucedida ainda E uma
  // requisição está em andamento — mostra um estado de carregamento
  // explícito, NUNCA "Nenhuma consulta encontrada" (que afirmaria uma
  // conclusão sobre o histórico que ainda não foi verificada).
  const carregandoPrimeiraVez = paginacaoAtiva && isLoading && currentPage === 0;
  // Falha na carga inicial: idem — nunca confundida com "histórico vazio".
  const falhouCargaInicial = paginacaoAtiva && !!error && currentPage === 0;

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Histórico de Consultas</h1>
            <p className="text-slate-500 text-sm mt-1">
              {paginacaoAtiva && total !== null
                ? `${total} consulta${total === 1 ? '' : 's'} registrada${total === 1 ? '' : 's'} no total`
                : `${state.consultations.length} consultas registradas`}
            </p>
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

        {/* Carregamento inicial */}
        {carregandoPrimeiraVez && (
          <div className="text-center py-16 text-slate-400">
            <RotateCw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
            <p className="text-sm">Carregando histórico de consultas…</p>
          </div>
        )}

        {/* Falha ao carregar a primeira página */}
        {falhouCargaInicial && (
          <div className="text-center py-16">
            <p className="text-sm text-red-500 mb-4">Não foi possível carregar o histórico de consultas.</p>
            <Button variant="outline" className="gap-2" onClick={() => void carregarPrimeiraPagina()}>
              <RotateCw className="w-4 h-4" /> Tentar novamente
            </Button>
          </div>
        )}

        {/* List */}
        {!carregandoPrimeiraVez && !falhouCargaInicial && (
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

            {/* Histórico vazio — só quando confirmado (nunca durante loading/erro, já excluídos acima) */}
            {filtered.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {search
                    ? 'Nenhuma consulta encontrada para esta busca'
                    : 'Nenhuma consulta encontrada'}
                </p>
              </div>
            )}

            {/* Paginação: carregar mais / carregando mais / fim do histórico / falha ao carregar mais */}
            {paginacaoAtiva && !search && state.consultations.length > 0 && (
              <div className="pt-4 text-center">
                {isLoadingMore && (
                  <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                    <RotateCw className="w-3 h-3 animate-spin" /> Carregando mais…
                  </p>
                )}
                {!isLoadingMore && loadMoreError && (
                  <div>
                    <p className="text-xs text-red-500 mb-2">Não foi possível carregar mais consultas.</p>
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => void carregarMaisConsultas()}>
                      <RotateCw className="w-3 h-3" /> Tentar novamente
                    </Button>
                  </div>
                )}
                {!isLoadingMore && !loadMoreError && hasNextPage && (
                  <Button variant="outline" size="sm" onClick={() => void carregarMaisConsultas()}>
                    Carregar mais
                  </Button>
                )}
                {!isLoadingMore && !loadMoreError && !hasNextPage && currentPage > 0 && (
                  <p className="text-xs text-slate-400">Fim do histórico.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
