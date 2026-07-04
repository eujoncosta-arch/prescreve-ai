'use client';

import { useState } from 'react';
import {
  type TimelineEvidencias,
  gerarTimeline, ordenarPorImpacto,
  TIPO_EVIDENCIA_META, IMPACTO_META, CIDS_TIMELINE,
} from '@/lib/evidence-timeline';

export default function EvidenceTimelinePage() {
  const [cid, setCid] = useState('I10');
  const [ordenacao, setOrdenacao] = useState<'cronologica' | 'impacto'>('cronologica');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');

  const timeline: TimelineEvidencias = gerarTimeline(cid);

  let marcos = timeline.marcos;
  if (filtroTipo !== 'todos') marcos = marcos.filter(m => m.tipo === filtroTipo);
  if (ordenacao === 'impacto') marcos = ordenarPorImpacto(marcos);

  const tiposPresentes = [...new Set(timeline.marcos.map(m => m.tipo))];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Timeline de Evidências</h1>
        <p className="text-sm text-slate-500 mt-1">
          Evolução histórica do conhecimento científico por condição clínica
        </p>
      </div>

      {/* Seletor CID */}
      <div className="flex flex-wrap gap-2">
        {CIDS_TIMELINE.map(c => (
          <button
            key={c.cid}
            onClick={() => setCid(c.cid)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              cid === c.cid
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Score de maturidade */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Marcos históricos', val: timeline.total },
          { label: 'Período', val: timeline.total ? `${timeline.periodo.inicio}–${timeline.periodo.fim}` : '--' },
          { label: 'Maturidade evidência', val: `${timeline.score_maturidade_evidencia}/100` },
          { label: 'Última atualização', val: timeline.periodo.fim || '--' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{k.val}</p>
          </div>
        ))}
      </div>

      {/* Tendência atual */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        {timeline.tendencia_atual}
        {timeline.moleculas_emergentes.length > 0 && (
          <span className="ml-2 text-amber-600">
            · Emergentes: {timeline.moleculas_emergentes.join(', ')}
          </span>
        )}
      </div>

      {/* Controles */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(['cronologica', 'impacto'] as const).map(o => (
            <button
              key={o}
              onClick={() => setOrdenacao(o)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                ordenacao === o ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {o === 'cronologica' ? 'Cronológica' : 'Por impacto'}
            </button>
          ))}
        </div>

        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
        >
          <option value="todos">Todos os tipos</option>
          {tiposPresentes.map(t => (
            <option key={t} value={t}>{TIPO_EVIDENCIA_META[t as keyof typeof TIPO_EVIDENCIA_META]?.label ?? t}</option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Linha vertical */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200" />

        <div className="space-y-4">
          {marcos.map(marco => {
            const tipoMeta = TIPO_EVIDENCIA_META[marco.tipo];
            const impactoMeta = IMPACTO_META[marco.impacto];
            return (
              <div key={marco.id} className="flex gap-4">
                {/* Ícone no eixo */}
                <div className="relative z-10 flex-shrink-0">
                  <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center text-center border-2 ${
                    marco.impacto === 'landmark'
                      ? 'bg-yellow-50 border-yellow-400'
                      : 'bg-white border-slate-200'
                  }`}>
                    <span className="text-lg">{tipoMeta.icon}</span>
                    <span className="text-xs font-bold text-slate-700">{marco.ano}</span>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className={`flex-1 bg-white border rounded-xl p-4 ${
                  marco.impacto === 'landmark' ? 'border-yellow-300 shadow-sm' : 'border-slate-200'
                }`}>
                  <div className="flex flex-wrap items-start gap-2 mb-2">
                    <h3 className="font-semibold text-slate-800 flex-1">{marco.titulo}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${tipoMeta.cls}`}>
                      {tipoMeta.label}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-full border ${impactoMeta.cls}`}>
                      {impactoMeta.label}
                    </span>
                    <span className={`px-1.5 py-0.5 text-xs rounded font-mono font-bold ${
                      marco.nivel_evidencia === 'A' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      Nível {marco.nivel_evidencia}
                    </span>
                  </div>

                  {marco.molecula && (
                    <p className="text-xs text-blue-700 font-medium mb-1">💊 {marco.molecula}</p>
                  )}
                  <p className="text-sm text-slate-600">{marco.descricao}</p>
                  <div className="mt-2 bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-700">
                    <span className="font-medium">Conclusão: </span>{marco.conclusao_principal}
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span>{marco.fonte}</span>
                    {marco.mudou_pratica && (
                      <span className="text-green-600 font-medium">✓ Mudou prática clínica</span>
                    )}
                    <span>Peso histórico: {marco.peso_historico}/100</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {marcos.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">📋</p>
          <p>Nenhum marco encontrado com este filtro.</p>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center border-t border-slate-100 pt-4">
        Base histórica de evidências para suporte educacional — não substitui revisão bibliográfica especializada
      </p>
    </div>
  );
}
