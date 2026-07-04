'use client';

import { useEffect, useState } from 'react';
import {
  type AlertaAtualizacao, type VersaoDiretriz,
  listarAlertas, marcarLido, detectarNovaDiretriz,
  getEstadoMonitoramento, seedScientificUpdateDemo,
  URGENCIA_META, TIPO_ALTERACAO_META, SOCIEDADE_META,
  DIRETRIZES_ATUAIS,
} from '@/lib/scientific-update-engine';

const URGENCIA_ORDEM = { imediata: 0, alta: 1, moderada: 2, informativa: 3 };

export default function AtualizacoesCientificasPage() {
  const [alertas, setAlertas] = useState<AlertaAtualizacao[]>([]);
  const [diretrizes, setDiretrizes] = useState<VersaoDiretriz[]>([]);
  const [aba, setAba] = useState<'alertas' | 'diretrizes'>('alertas');
  const [filtroUrgencia, setFiltroUrgencia] = useState<string>('todos');
  const [estado, setEstado] = useState<ReturnType<typeof getEstadoMonitoramento> | null>(null);

  useEffect(() => {
    seedScientificUpdateDemo();
    carregar();
  }, []);

  function carregar() {
    setAlertas(listarAlertas().sort((a, b) =>
      URGENCIA_ORDEM[a.urgencia] - URGENCIA_ORDEM[b.urgencia]
    ));
    setDiretrizes(DIRETRIZES_ATUAIS);
    setEstado(getEstadoMonitoramento());
  }

  function lerAlerta(id: string) {
    marcarLido(id);
    carregar();
  }

  const alertasFiltrados = filtroUrgencia === 'todos'
    ? alertas
    : alertas.filter(a => a.urgencia === filtroUrgencia);

  const pendentes = alertas.filter(a => !a.lido).length;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Atualizações Científicas</h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitoramento contínuo de {estado?.sociedades_monitoradas.length ?? 15} sociedades médicas — alertas de mudanças clínicas relevantes
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Alertas pendentes', val: pendentes, cls: pendentes > 0 ? 'text-red-700' : 'text-green-700' },
          { label: 'Alertas lidos', val: estado?.total_alertas_lidos ?? 0, cls: 'text-slate-700' },
          { label: 'Sociedades monitoradas', val: estado?.sociedades_monitoradas.length ?? 0, cls: 'text-blue-700' },
          { label: 'Diretrizes ativas', val: DIRETRIZES_ATUAIS.length, cls: 'text-slate-700' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.cls}`}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { key: 'alertas', label: `Alertas${pendentes > 0 ? ` (${pendentes})` : ''}` },
          { key: 'diretrizes', label: 'Diretrizes ativas' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setAba(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              aba === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ALERTAS */}
      {aba === 'alertas' && (
        <>
          {/* Filtro urgência */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'todos', label: 'Todos' },
              { key: 'imediata', label: 'Imediata' },
              { key: 'alta', label: 'Alta' },
              { key: 'moderada', label: 'Moderada' },
              { key: 'informativa', label: 'Informativa' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFiltroUrgencia(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  filtroUrgencia === f.key
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {alertasFiltrados.map(a => {
              const um = URGENCIA_META[a.urgencia];
              return (
                <div
                  key={a.id}
                  className={`bg-white border rounded-xl p-4 ${a.lido ? 'opacity-60' : ''} ${
                    a.urgencia === 'imediata' ? 'border-red-300' :
                    a.urgencia === 'alta' ? 'border-orange-300' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border font-medium ${um.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${um.dot}`} />
                          {um.label}
                        </span>
                        {!a.lido && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">Novo</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-800 text-sm">{a.titulo}</h3>
                      <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{a.corpo}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {a.cids_afetados.map(c => (
                          <span key={c} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">{c}</span>
                        ))}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{new Date(a.gerado_em).toLocaleDateString('pt-BR')}</p>
                    </div>
                    {!a.lido && (
                      <button
                        onClick={() => lerAlerta(a.id)}
                        className="shrink-0 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
                      >
                        Marcar lido
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {alertasFiltrados.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <p className="text-3xl mb-2">✓</p>
                <p>Nenhum alerta pendente.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* DIRETRIZES */}
      {aba === 'diretrizes' && (
        <div className="space-y-4">
          {diretrizes.map(d => {
            const soc = SOCIEDADE_META[d.sociedade];
            return (
              <div key={d.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full font-medium">
                        {soc.pais}
                      </span>
                      <span className="text-xs text-slate-500">{soc.label}</span>
                    </div>
                    <h3 className="font-semibold text-slate-800 mt-1">{d.titulo}</h3>
                    <p className="text-xs text-blue-600">{d.versao} · {d.ano}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {d.cids_cobertos.map(c => (
                      <span key={c} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-slate-600">{d.resumo}</p>
                {d.principais_mudancas.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500 font-medium mb-1">Principais mudanças:</p>
                    {d.principais_mudancas.map((m, i) => (
                      <p key={i} className="text-xs text-slate-600 flex gap-2"><span>•</span>{m}</p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-400 text-center border-t border-slate-100 pt-4">
        Monitoramento para atualização profissional — verificar fontes originais antes de aplicação clínica
      </p>
    </div>
  );
}
