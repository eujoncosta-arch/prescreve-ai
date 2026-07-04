'use client';

import { useEffect, useState } from 'react';
import {
  type DashboardLaboratorio,
  gerarDashboardLaboratorio, seedPharmaAnalyticsDemo,
  CLASSE_META,
} from '@/lib/pharma-analytics';

const CIDS = [
  { cid: 'I10', label: 'Hipertensão Arterial' },
  { cid: 'E11', label: 'Diabetes Mellitus tipo 2' },
];

export default function FarmaAnalyticsPage() {
  const [cid, setCid] = useState('I10');
  const [dash, setDash] = useState<DashboardLaboratorio | null>(null);

  useEffect(() => {
    seedPharmaAnalyticsDemo();
    setDash(gerarDashboardLaboratorio('I10'));
  }, []);

  function trocarCid(c: string) {
    setCid(c);
    setDash(gerarDashboardLaboratorio(c));
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics Farmacêutico</h1>
        <p className="text-sm text-slate-500 mt-1">
          Padrões de prescrição anônimos e agregados — sem dados individuais ou identificáveis
        </p>
      </div>

      {/* Privacidade */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-xs text-blue-700">
        🔒 Todos os dados são agregados, anonimizados e nunca vinculados a pacientes ou médicos individuais.
      </div>

      {/* Seletor */}
      <div className="flex gap-2">
        {CIDS.map(c => (
          <button
            key={c.cid}
            onClick={() => trocarCid(c.cid)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              cid === c.cid
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {dash && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total prescri­ções', val: dash.total_prescricoes.toLocaleString('pt-BR'), sub: 'período: ' + dash.periodo },
              { label: 'Adesão guideline', val: `${dash.adesao_guideline_pct}%`, sub: 'média do período' },
              { label: 'Moléculas ativas', val: dash.top_moleculas.length, sub: 'no ranking' },
              { label: 'Moléculas emergentes', val: dash.moleculas_emergentes.length, sub: 'crescimento acelerado' },
            ].map(k => (
              <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">{k.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{k.val}</p>
                <p className="text-xs text-slate-400">{k.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Market share */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Market share — Top moléculas</h3>
              <div className="space-y-3">
                {dash.top_moleculas.map(m => (
                  <div key={m.molecula}>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <div>
                        <span className="font-medium">{m.molecula}</span>
                        <span className="ml-2 text-slate-400">{CLASSE_META[m.classe]}</span>
                      </div>
                      <div className="flex gap-2">
                        <span>{m.pct_mercado}%</span>
                        <span className={`font-medium ${m.crescimento_mensal > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {m.crescimento_mensal > 0 ? '+' : ''}{m.crescimento_mensal}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div
                        className="h-2 bg-teal-500 rounded-full"
                        style={{ width: `${Math.min(100, m.pct_mercado * 2)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{m.pct_sus}% SUS · n={m.total.toLocaleString('pt-BR')}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Distribuição por classe */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Distribuição por classe terapêutica</h3>
              <div className="space-y-2">
                {dash.distribuicao_classe.map(d => (
                  <div key={d.classe}>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>{CLASSE_META[d.classe]}</span>
                      <span>{d.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full">
                      <div
                        className="h-1.5 bg-slate-600 rounded-full"
                        style={{ width: `${d.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tendência mensal */}
          {dash.tendencia_mensal.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Tendência mensal de prescrições</h3>
              <div className="flex items-end gap-1 h-20">
                {dash.tendencia_mensal.map(t => {
                  const max = Math.max(...dash.tendencia_mensal.map(x => x.total));
                  const h = max > 0 ? (t.total / max) * 100 : 0;
                  return (
                    <div key={t.mes} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-teal-400 rounded-t"
                        style={{ height: `${h}%` }}
                        title={`${t.mes}: ${t.total.toLocaleString('pt-BR')}`}
                      />
                      <span className="text-xs text-slate-400 truncate" style={{ fontSize: '0.6rem' }}>
                        {t.mes.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prescrição por especialidade */}
          {dash.prescricao_por_especialidade.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Prescrição por especialidade</h3>
              <div className="flex flex-wrap gap-2">
                {dash.prescricao_por_especialidade.map(e => (
                  <div key={e.especialidade} className="bg-slate-50 rounded-lg px-3 py-2 text-center">
                    <p className="text-lg font-bold text-slate-800">{e.pct}%</p>
                    <p className="text-xs text-slate-500 capitalize">{e.especialidade.replace('_', ' ')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergentes */}
          {dash.moleculas_emergentes.length > 0 && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-teal-700 mb-2">Moléculas com adoção acelerada</h3>
              <div className="flex flex-wrap gap-2">
                {dash.moleculas_emergentes.map(m => (
                  <span key={m} className="px-3 py-1 bg-teal-100 text-teal-800 text-sm rounded-full font-medium">
                    📈 {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-slate-400 text-center border-t border-slate-100 pt-4">
        Dados analíticos para apoio à gestão farmacêutica — uso institucional · LGPD compliant
      </p>
    </div>
  );
}
