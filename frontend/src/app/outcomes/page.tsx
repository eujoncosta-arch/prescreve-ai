'use client';

import { useState } from 'react';
import {
  type OutcomeCalculado,
  calcularOutcome, gerarPainelOutcome,
  OUTCOME_DB, BENEFICIO_META, HORIZONTE_LABEL,
} from '@/lib/outcome-engine';

const CIDS = [
  { cid: 'I10', label: 'Hipertensão Arterial' },
  { cid: 'E11', label: 'Diabetes Mellitus tipo 2' },
  { cid: 'I50', label: 'Insuficiência Cardíaca' },
  { cid: 'J45', label: 'Asma' },
];

export default function OutcomesPage() {
  const [cidSelecionado, setCidSelecionado] = useState('I10');

  const dados_cid = OUTCOME_DB.filter(d => d.cid === cidSelecionado);
  const outcomes: OutcomeCalculado[] = dados_cid.map(d => calcularOutcome(d));
  const painel = gerarPainelOutcome(cidSelecionado, outcomes);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Desfechos Terapêuticos</h1>
        <p className="text-sm text-slate-500 mt-1">NNT · NNH · ARR · RRR — métricas de efetividade baseadas em evidências</p>
      </div>

      {/* Seletor */}
      <div className="flex flex-wrap gap-2">
        {CIDS.map(c => (
          <button
            key={c.cid}
            onClick={() => setCidSelecionado(c.cid)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              cidSelecionado === c.cid
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Melhor NNT */}
      {painel.melhor_nnt && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">Menor NNT para esta condição</p>
          <div className="flex items-baseline gap-3 mt-1">
            <p className="text-4xl font-bold text-green-800">NNT = {painel.melhor_nnt.nnt}</p>
            <p className="text-sm text-green-700">{painel.melhor_nnt.molecula}</p>
          </div>
          <p className="text-xs text-green-600 mt-1">
            {painel.melhor_nnt.indicacao} · {HORIZONTE_LABEL[painel.melhor_nnt.horizonte]} · {painel.melhor_nnt.fonte}
          </p>
        </div>
      )}

      {/* Cards por molécula */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {outcomes.map(o => {
          const meta = BENEFICIO_META[o.classificacao_beneficio];
          return (
            <div key={o.molecula + o.fonte} className={`bg-white border rounded-xl p-4 ${meta.cls.includes('green') ? 'border-green-200' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-800">{o.molecula}</h3>
                  <p className="text-xs text-slate-500">{o.indicacao}</p>
                  <p className="text-xs text-slate-400">{o.fonte} · {HORIZONTE_LABEL[o.horizonte]}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-lg border font-medium ${meta.cls}`}>
                  {meta.icon} {meta.label}
                </span>
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-xl font-bold text-slate-900">{o.nnt}</p>
                  <p className="text-xs text-slate-500">NNT</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-xl font-bold text-blue-700">{o.rrr}%</p>
                  <p className="text-xs text-slate-500">RRR</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-xl font-bold text-teal-700">{(o.arr * 100).toFixed(1)}%</p>
                  <p className="text-xs text-slate-500">ARR</p>
                </div>
              </div>

              {/* Mortalidade */}
              {o.nnt_mortalidade && (
                <div className="mt-2 flex items-center gap-2 text-xs text-violet-700 bg-violet-50 rounded-lg px-3 py-1.5">
                  <span>Mortalidade: NNT = {o.nnt_mortalidade}</span>
                  {o.arr_mortalidade !== undefined && <span>· ARR = {(o.arr_mortalidade * 100).toFixed(1)}%</span>}
                </div>
              )}

              {/* Custo por desfecho */}
              {o.custo_por_desfecho_evitado !== undefined && (
                <div className="mt-2 text-xs text-slate-500">
                  Custo por desfecho evitado: R$ {o.custo_por_desfecho_evitado.toLocaleString('pt-BR')}
                </div>
              )}

              <p className="text-xs text-slate-500 mt-3 italic">{o.interpretacao}</p>

              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                  o.nivel_evidencia === 'A' ? 'bg-green-100 text-green-700' :
                  o.nivel_evidencia === 'B' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-slate-100 text-slate-600'
                }`}>Nível {o.nivel_evidencia}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparativo */}
      {painel.comparativo.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Comparativo direto</h3>
          <div className="space-y-2">
            {painel.comparativo.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                <span className="text-slate-600">{c.molecula_a} vs {c.molecula_b}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-green-700">{c.winner}</span>
                  <span className="text-xs text-slate-400">ΔNNT = {c.delta_nnt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Glossário */}
      <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-600">
        {[
          { term: 'NNT', def: 'Número necessário para tratar 1 paciente e evitar 1 evento' },
          { term: 'ARR', def: 'Redução absoluta do risco (% no grupo controle − % no grupo tratado)' },
          { term: 'RRR', def: 'Redução relativa do risco (ARR / risco controle × 100)' },
          { term: 'NNH', def: 'Número necessário para causar 1 evento adverso' },
        ].map(g => (
          <div key={g.term}>
            <p className="font-bold text-slate-700">{g.term}</p>
            <p>{g.def}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 text-center border-t border-slate-100 pt-4">
        Métricas calculadas com base em ensaios clínicos publicados — aplicação clínica depende do contexto individual
      </p>
    </div>
  );
}
