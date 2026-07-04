'use client';

import { useEffect, useState } from 'react';
import {
  type PerformanceHospital,
  listarHospitais, gerarRanking, gerarBenchmark,
  seedHospitalQualityDemo,
  STATUS_INDICADOR_META, CLASSIFICACAO_META, BENCHMARK_DB,
} from '@/lib/hospital-quality';

export default function QualidadeHospitalPage() {
  const [hospitais, setHospitais] = useState<PerformanceHospital[]>([]);
  const [selecionado, setSelecionado] = useState<PerformanceHospital | null>(null);
  const [aba, setAba] = useState<'ranking' | 'indicadores' | 'benchmark'>('ranking');

  useEffect(() => {
    seedHospitalQualityDemo();
    const ranking = gerarRanking();
    setHospitais(ranking);
    if (ranking.length > 0) setSelecionado(ranking[0]);
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Qualidade Hospitalar</h1>
        <p className="text-sm text-slate-500 mt-1">Indicadores de qualidade, metas e benchmarking setorial</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { key: 'ranking', label: 'Ranking' },
          { key: 'indicadores', label: 'Indicadores' },
          { key: 'benchmark', label: 'Benchmark Nacional' },
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

      {/* RANKING */}
      {aba === 'ranking' && (
        <div className="space-y-4">
          {hospitais.map((h, idx) => {
            const cls = CLASSIFICACAO_META[h.classificacao];
            return (
              <div
                key={h.hospital_id}
                onClick={() => { setSelecionado(h); setAba('indicadores'); }}
                className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border-2 ${cls.cls}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800">{h.hospital_id}</p>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-bold border ${cls.cls}`}>
                        {cls.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 capitalize">{h.tipo} · {h.porte} · {h.periodo}</p>
                    <p className="text-xs text-slate-400">{cls.desc}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-slate-900">{h.score_global}</p>
                    <p className="text-xs text-slate-400">score</p>
                  </div>
                </div>

                {/* Mini barra de score */}
                <div className="mt-3 h-1.5 bg-slate-100 rounded-full">
                  <div
                    className={`h-1.5 rounded-full ${h.score_global >= 85 ? 'bg-green-500' : h.score_global >= 70 ? 'bg-blue-500' : h.score_global >= 55 ? 'bg-yellow-400' : 'bg-red-500'}`}
                    style={{ width: `${h.score_global}%` }}
                  />
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {h.especialidades.map(e => (
                    <span key={e} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full capitalize">{e.replace('_', ' ')}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* INDICADORES */}
      {aba === 'indicadores' && selecionado && (
        <div className="space-y-4">
          {/* Seletor hospital */}
          <div className="flex gap-2 flex-wrap">
            {hospitais.map(h => (
              <button
                key={h.hospital_id}
                onClick={() => setSelecionado(h)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selecionado.hospital_id === h.hospital_id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {h.hospital_id} ({CLASSIFICACAO_META[h.classificacao].label})
              </button>
            ))}
          </div>

          {/* Pontos fortes / melhoria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-green-800 mb-2">Pontos fortes</h3>
              {selecionado.pontos_fortes.length > 0
                ? selecionado.pontos_fortes.map((p, i) => (
                    <p key={i} className="text-xs text-green-700 flex gap-2"><span>✓</span>{p}</p>
                  ))
                : <p className="text-xs text-green-600">Nenhuma meta atingida ainda.</p>
              }
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-orange-800 mb-2">Oportunidades de melhora</h3>
              {selecionado.oportunidades_melhora.length > 0
                ? selecionado.oportunidades_melhora.map((p, i) => (
                    <p key={i} className="text-xs text-orange-700 flex gap-2"><span>→</span>{p}</p>
                  ))
                : <p className="text-xs text-orange-600">Todas as metas atingidas.</p>
              }
            </div>
          </div>

          {/* Tabela indicadores */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Indicador', 'Valor atual', 'Meta', 'Benchmark', 'Status', 'Tendência'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selecionado.indicadores.map(ind => {
                  const sm = STATUS_INDICADOR_META[ind.status];
                  return (
                    <tr key={ind.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{ind.nome}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{ind.valor_atual}{ind.unidade}</td>
                      <td className="px-4 py-3 text-slate-500">{ind.meta}{ind.unidade}</td>
                      <td className="px-4 py-3 text-slate-400">{ind.benchmark_nacional}{ind.unidade}</td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${sm.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                          {sm.label}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-xs font-medium ${
                        ind.tendencia === 'melhora' ? 'text-green-600' :
                        ind.tendencia === 'piora' ? 'text-red-600' : 'text-slate-400'
                      }`}>
                        {ind.tendencia === 'melhora' ? '↑' : ind.tendencia === 'piora' ? '↓' : '→'} {Math.abs(ind.delta_pct)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BENCHMARK */}
      {aba === 'benchmark' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Distribuição nacional por indicador — percentis 10/25/50/75/90</p>
          {BENCHMARK_DB.map(b => (
            <div key={b.indicador} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">{b.nome}</h3>
                <span className="text-xs text-slate-400">{b.unidade} · {b.menor_melhor ? 'menor = melhor' : 'maior = melhor'}</span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center">
                {[
                  { label: 'P10', val: b.p10, cls: b.menor_melhor ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' },
                  { label: 'P25', val: b.p25, cls: 'bg-blue-50 text-blue-700' },
                  { label: 'P50 Mediana', val: b.p50, cls: 'bg-slate-100 text-slate-700 font-bold' },
                  { label: 'P75', val: b.p75, cls: 'bg-orange-50 text-orange-600' },
                  { label: 'P90', val: b.p90, cls: b.menor_melhor ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700' },
                ].map(p => (
                  <div key={p.label} className={`rounded-lg px-2 py-2 ${p.cls}`}>
                    <p className="text-lg font-bold">{p.val}</p>
                    <p className="text-xs">{p.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 text-center border-t border-slate-100 pt-4">
        Indicadores para uso institucional — comparação anônima para melhoria contínua da qualidade
      </p>
    </div>
  );
}
