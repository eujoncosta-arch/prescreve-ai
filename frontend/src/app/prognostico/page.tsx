'use client';

import { useState } from 'react';
import {
  type HorizontePrognostico, type Prognostico, type PerfilPrognostico,
  gerarPrognostico, gerarCurvaRisco,
  HORIZONTE_LABEL, CLASSE_META, CONDICOES_PROGNOSE,
} from '@/lib/prognosis-engine';

const HORIZONTES: HorizontePrognostico[] = ['30d', '6m', '1a', '5a'];

const PERFIL_DEMO: Omit<PerfilPrognostico, 'cid'> = {
  idade: 65, sexo: 'M', comorbidades: ['Hipertensão Arterial', 'Dislipidemia'],
  pa_sistolica: 145, hba1c: undefined, creatinina: 1.2, internacoes_12m: 1,
};

export default function PrognosticoPage() {
  const [cid, setCid] = useState('I10');
  const [horizonte, setHorizonte] = useState<HorizontePrognostico>('1a');
  const [perfil, setPerfil] = useState<Omit<PerfilPrognostico, 'cid'>>(PERFIL_DEMO);
  const [resultado, setResultado] = useState<Prognostico | null>(null);
  const [curva, setCurva] = useState<ReturnType<typeof gerarCurvaRisco> | null>(null);
  const [calculando, setCalculando] = useState(false);

  function calcular() {
    setCalculando(true);
    setTimeout(() => {
      const p: PerfilPrognostico = { ...perfil, cid };
      setResultado(gerarPrognostico(p, horizonte));
      setCurva(gerarCurvaRisco(p, 60));
      setCalculando(false);
    }, 300);
  }

  const classeMeta = resultado ? CLASSE_META[resultado.classe_prognostico] : null;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Prognose Preditiva</h1>
        <p className="text-sm text-slate-500 mt-1">Predição de desfechos a 30d · 6m · 1a · 5a baseada no perfil clínico</p>
      </div>

      {/* Formulário de entrada */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Perfil Clínico</h3>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Condição principal</label>
            <select
              value={cid}
              onChange={e => setCid(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CONDICOES_PROGNOSE.map(c => (
                <option key={c.cid} value={c.cid}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Horizonte</label>
            <select
              value={horizonte}
              onChange={e => setHorizonte(e.target.value as HorizontePrognostico)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {HORIZONTES.map(h => (
                <option key={h} value={h}>{HORIZONTE_LABEL[h]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Idade</label>
            <input
              type="number" min={18} max={100}
              value={perfil.idade}
              onChange={e => setPerfil(p => ({ ...p, idade: +e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">PA Sistólica (mmHg)</label>
            <input
              type="number"
              value={perfil.pa_sistolica ?? ''}
              onChange={e => setPerfil(p => ({ ...p, pa_sistolica: e.target.value ? +e.target.value : undefined }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ex: 145"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">HbA1c (%)</label>
            <input
              type="number" step="0.1"
              value={perfil.hba1c ?? ''}
              onChange={e => setPerfil(p => ({ ...p, hba1c: e.target.value ? +e.target.value : undefined }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ex: 7.8"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Internações nos últimos 12m</label>
            <input
              type="number" min={0}
              value={perfil.internacoes_12m ?? 0}
              onChange={e => setPerfil(p => ({ ...p, internacoes_12m: +e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          onClick={calcular}
          disabled={calculando}
          className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {calculando ? 'Calculando...' : 'Gerar Prognose'}
        </button>
      </div>

      {resultado && classeMeta && (
        <>
          {/* Resultado global */}
          <div className={`rounded-xl p-5 border ${classeMeta.cls}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Prognóstico — {HORIZONTE_LABEL[horizonte]}</p>
                <p className="text-3xl font-bold mt-1">{classeMeta.label}</p>
                <p className="text-sm mt-1 opacity-80">{classeMeta.desc}</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold">{resultado.probabilidade_sobrevida}%</p>
                <p className="text-xs opacity-70">probabilidade de sobrevida</p>
              </div>
            </div>
          </div>

          {/* Eventos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {resultado.eventos.map(ev => (
              <div key={ev.evento} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-2">{ev.evento}</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-3xl font-bold text-slate-900">{ev.probabilidade_pct}%</p>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  IC: [{ev.intervalo_confianca[0]}–{ev.intervalo_confianca[1]}%]
                </p>
                <div className="h-1.5 bg-slate-100 rounded-full mt-2">
                  <div
                    className="h-1.5 rounded-full bg-slate-700"
                    style={{ width: `${ev.probabilidade_pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Fatores modificáveis */}
          {resultado.fatores_modificaveis.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-amber-800 mb-2">
                Fatores modificáveis — potencial de melhora: {resultado.potencial_melhora_pct}%
              </h3>
              <ul className="space-y-1">
                {resultado.fatores_modificaveis.map((f, i) => (
                  <li key={i} className="text-sm text-amber-700 flex gap-2">
                    <span>→</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Curva Kaplan-Meier simplificada */}
          {curva && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Curva de Sobrevida — 60 meses</h3>
              <div className="flex items-end gap-1 h-28">
                {curva.sobrevida_pct.filter((_, i) => i % 6 === 0).map((s, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-blue-500 rounded-t opacity-80"
                      style={{ height: `${s * 0.9}%` }}
                      title={`${i * 6}m: ${s}%`}
                    />
                    <span className="text-xs text-slate-400">{i * 6}m</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 text-center mt-1">Meses · Altura = probabilidade de sobrevida (%)</p>
            </div>
          )}

          {/* Alertas */}
          {resultado.alertas.map((a, i) => (
            <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700">
              ℹ {a}
            </div>
          ))}
        </>
      )}

      <p className="text-xs text-slate-400 text-center border-t border-slate-100 pt-4">
        Modelo preditivo para suporte à decisão clínica. Não substitui avaliação médica especializada.
      </p>
    </div>
  );
}
