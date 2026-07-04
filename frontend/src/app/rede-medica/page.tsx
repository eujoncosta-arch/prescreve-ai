'use client';

import { useEffect, useState } from 'react';
import {
  type ConsensoRede, type MudancaPadrao,
  calcularConsenso, calcularVariabilidade, detectarMudancaDePadrao,
  seedPhysicianLearningNetworkDemo,
} from '@/lib/physician-learning-network';

const CIDS = [
  { cid: 'I10', label: 'Hipertensão Arterial' },
  { cid: 'E11', label: 'Diabetes Mellitus tipo 2' },
];

export default function RedeMedicaPage() {
  const [cid, setCid] = useState('I10');
  const [consenso, setConsenso] = useState<ConsensoRede | null>(null);
  const [variabilidade, setVariabilidade] = useState<ReturnType<typeof calcularVariabilidade> | null>(null);
  const [mudancas, setMudancas] = useState<MudancaPadrao[]>([]);

  useEffect(() => {
    seedPhysicianLearningNetworkDemo();
    carregar('I10');
  }, []);

  function carregar(c: string) {
    setCid(c);
    setConsenso(calcularConsenso(c));
    setVariabilidade(calcularVariabilidade(c));
    setMudancas(detectarMudancaDePadrao(c));
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rede de Aprendizado Médico</h1>
        <p className="text-sm text-slate-500 mt-1">Inteligência coletiva anônima — padrões de conduta e variabilidade da prática</p>
      </div>

      {/* Seletor */}
      <div className="flex gap-2">
        {CIDS.map(c => (
          <button
            key={c.cid}
            onClick={() => carregar(c.cid)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              cid === c.cid
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {consenso && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Condutas registradas', val: consenso.total_condutas, sub: 'casos coletados' },
              { label: 'Concordância diretriz', val: `${consenso.concordancia_guideline}%`, sub: 'guideline principal' },
              { label: 'Variabilidade', val: (consenso.variabilidade_indice * 100).toFixed(0) + '%', sub: 'índice 0–100%' },
              { label: 'Especialidades', val: consenso.especialidades_ativas.length, sub: 'ativas' },
            ].map(k => (
              <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">{k.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{k.val}</p>
                <p className="text-xs text-slate-400">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Variabilidade */}
          {variabilidade && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Análise de Variabilidade</h3>
              <p className="text-sm text-slate-600">{variabilidade.interpretacao}</p>
              <div className="mt-3">
                <div className="h-2 bg-slate-100 rounded-full">
                  <div
                    className="h-2 bg-violet-500 rounded-full transition-all"
                    style={{ width: `${variabilidade.indice * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Uniforme</span>
                  <span>Alta variabilidade</span>
                </div>
              </div>
              {variabilidade.top_moleculas.length > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  Principais moléculas: <span className="font-medium">{variabilidade.top_moleculas.join(', ')}</span>
                </p>
              )}
            </div>
          )}

          {/* Consenso de moléculas */}
          {consenso.moleculas_consenso.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Padrão de Prescrição — Consenso da Rede</h3>
              <div className="space-y-3">
                {consenso.moleculas_consenso.map(m => (
                  <div key={m.molecula}>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span className="font-medium">{m.molecula}</span>
                      <div className="flex gap-4">
                        <span>{m.pct}% dos casos</span>
                        {m.taxa_sucesso > 0 && (
                          <span className="text-green-700">{m.taxa_sucesso}% sucesso</span>
                        )}
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div className="h-2 bg-violet-500 rounded-full" style={{ width: `${m.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mudanças de padrão */}
          {mudancas.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Mudanças de Padrão Detectadas</h3>
              <div className="space-y-2">
                {mudancas.map((m, i) => (
                  <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                    <p className="font-medium text-amber-800">{m.descricao}</p>
                    <div className="flex gap-3 text-xs text-amber-600 mt-1">
                      <span>Confiança: {m.confianca}%</span>
                      <span>Magnitude: {m.magnitude}</span>
                      <span>Detectado: {m.periodo_deteccao}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Especialidades ativas */}
          {consenso.especialidades_ativas.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Especialidades contribuindo</h3>
              <div className="flex flex-wrap gap-2">
                {consenso.especialidades_ativas.map(e => (
                  <span key={e} className="px-3 py-1 bg-violet-50 text-violet-700 text-xs rounded-full border border-violet-200">
                    {e.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-slate-400 text-center border-t border-slate-100 pt-4">
        Todos os dados são anônimos e agregados. Nenhuma informação individual ou identificável é registrada.
      </p>
    </div>
  );
}
