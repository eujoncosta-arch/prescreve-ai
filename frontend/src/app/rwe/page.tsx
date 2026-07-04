'use client';

import { useEffect, useState } from 'react';
import {
  type PainelRWE, type RealWorldEvidence,
  gerarPainelRWE, listarRWE, seedRWEDemo,
  ORIGEM_META, TENDENCIA_META,
} from '@/lib/rwe-engine';

const CIDS = [
  { cid: 'I10', label: 'Hipertensão Arterial (I10)' },
  { cid: 'E11', label: 'Diabetes Mellitus tipo 2 (E11)' },
  { cid: 'I50', label: 'Insuficiência Cardíaca (I50)' },
  { cid: 'J45', label: 'Asma (J45)' },
];

export default function RWEPage() {
  const [cidSelecionado, setCidSelecionado] = useState('I10');
  const [painel, setPainel] = useState<PainelRWE | null>(null);
  const [evidencias, setEvidencias] = useState<RealWorldEvidence[]>([]);

  useEffect(() => {
    seedRWEDemo();
    atualizar('I10');
  }, []);

  function atualizar(cid: string) {
    setCidSelecionado(cid);
    setPainel(gerarPainelRWE(cid));
    setEvidencias(listarRWE({ cid }));
  }

  const tend = painel ? TENDENCIA_META[painel.tendencia] : null;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Real World Evidence</h1>
        <p className="text-sm text-slate-500 mt-1">Efetividade e segurança de tratamentos na prática clínica real</p>
      </div>

      {/* Seletor de CID */}
      <div className="flex flex-wrap gap-2">
        {CIDS.map(c => (
          <button
            key={c.cid}
            onClick={() => atualizar(c.cid)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              cidSelecionado === c.cid
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {painel && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total de casos', value: painel.n_total.toLocaleString('pt-BR'), sub: 'pacientes do mundo real' },
              { label: 'Taxa de sucesso', value: `${painel.taxa_sucesso_media}%`, sub: 'controle/cura/remissão' },
              { label: 'Mortalidade', value: `${painel.taxa_mortalidade_media}%`, sub: '30 dias' },
              { label: 'Score evidência', value: painel.score_global, sub: '/100' },
            ].map(k => (
              <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">{k.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{k.value}</p>
                <p className="text-xs text-slate-400">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Tendência + alertas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Tendência</h3>
              {tend && (
                <p className={`text-lg font-bold ${tend.cls}`}>
                  {tend.icon} {tend.label}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                Adesão às diretrizes: {painel.comparacao_guideline.concordancia_pct}%
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Alertas clínicos</h3>
              <ul className="space-y-1">
                {painel.alertas.map((a, i) => (
                  <li key={i} className="text-xs text-slate-600 flex gap-2">
                    <span className="text-amber-500 shrink-0">•</span>{a}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Medicamentos mais efetivos */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Medicamentos com melhor efetividade no mundo real</h3>
            <div className="space-y-3">
              {painel.medicamentos_mais_efetivos.map(m => (
                <div key={m.molecula}>
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span className="font-medium">{m.molecula}</span>
                    <span>{m.taxa_sucesso}% sucesso ({m.n} estudos)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full">
                    <div
                      className="h-2 bg-blue-500 rounded-full"
                      style={{ width: `${m.taxa_sucesso}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fontes de evidência */}
          {evidencias.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Fontes de evidência</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {evidencias.map(e => (
                  <div key={e.id} className="px-4 py-3 flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {e.instituicao ?? e.origem}
                      </p>
                      <p className="text-xs text-slate-500">{e.populacao} · {e.periodo}</p>
                    </div>
                    <div className="flex gap-3 text-xs text-slate-600 shrink-0">
                      <span>n={e.total_casos.toLocaleString('pt-BR')}</span>
                      <span className="text-green-700 font-medium">{e.taxa_sucesso}% sucesso</span>
                      <span className={ORIGEM_META[e.origem].cls + ' px-2 py-0.5 rounded-full'}>
                        {ORIGEM_META[e.origem].label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Nota CDS */}
      <p className="text-xs text-slate-400 text-center border-t border-slate-100 pt-4">
        Dados de suporte à decisão clínica — não substituem avaliação médica individualizada
      </p>
    </div>
  );
}
