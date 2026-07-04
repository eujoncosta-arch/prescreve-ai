'use client';

import { useEffect, useState } from 'react';
import {
  type DigitalTwin, type EstrategiaTratamento, type ComparacaoEstrategias,
  criarTwin, listarTwins, compararEstrategias,
  seedDigitalTwinDemo, ATIVIDADE_META,
} from '@/lib/patient-digital-twin';

const ESTRATEGIAS_HAS: EstrategiaTratamento[] = [
  { nome: 'IECA + Tiazídico (SUS)', moleculas: ['Enalapril', 'Clortalidona'],
    doses: ['20mg 1x/dia', '12,5mg 1x/dia'], duracao_meses: 6, custo_mes_brl: 28, disponivel_sus: true },
  { nome: 'BRA + BCC (SUS)', moleculas: ['Losartana', 'Anlodipina'],
    doses: ['100mg 1x/dia', '10mg 1x/dia'], duracao_meses: 6, custo_mes_brl: 42, disponivel_sus: true },
  { nome: 'ARNI + BCC', moleculas: ['Sacubitril/Valsartana', 'Anlodipina'],
    doses: ['100/200mg 2x/dia', '10mg 1x/dia'], duracao_meses: 6, custo_mes_brl: 340, disponivel_sus: false },
];

export default function DigitalTwinPage() {
  const [twins, setTwins] = useState<DigitalTwin[]>([]);
  const [selecionado, setSelecionado] = useState<DigitalTwin | null>(null);
  const [comparacao, setComparacao] = useState<ComparacaoEstrategias | null>(null);
  const [view, setView] = useState<'lista' | 'detalhe'>('lista');

  useEffect(() => {
    seedDigitalTwinDemo();
    setTwins(listarTwins());
  }, []);

  function abrirTwin(twin: DigitalTwin) {
    setSelecionado(twin);
    const comp = compararEstrategias(twin, ESTRATEGIAS_HAS);
    setComparacao(comp);
    setView('detalhe');
  }

  function criarDemo() {
    const t = criarTwin(`demo-${Date.now()}`, {
      idade: 62, sexo: 'F', peso_kg: 74, altura_cm: 162,
      comorbidades: ['Hipertensão Arterial', 'Diabetes Mellitus tipo 2'],
      medicamentos_atuais: ['Metformina 1g', 'Losartana 50mg'],
      pa_sistolica: 152, pa_diastolica: 96, hba1c: 7.8, ldl: 102, hdl: 46,
      creatinina: 0.9, tfg: 82, fumante: false,
      atividade_fisica: 'irregular', adesao_estimada: 68,
    }, 'Hipertensão Arterial + DM2');
    setTwins(listarTwins());
    abrirTwin(t);
  }

  if (view === 'detalhe' && selecionado && comparacao) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('lista')} className="text-sm text-blue-600 hover:underline">← Voltar</button>
          <h1 className="text-xl font-bold text-slate-900">Twin: {selecionado.diagnostico_principal}</h1>
        </div>

        {/* Perfil */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Perfil do Paciente (anonimizado)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              { label: 'Idade', v: `${selecionado.perfil.idade} anos` },
              { label: 'Sexo', v: selecionado.perfil.sexo === 'M' ? 'Masculino' : 'Feminino' },
              { label: 'IMC', v: `${selecionado.perfil.imc} kg/m²` },
              { label: 'PA', v: selecionado.perfil.pa_sistolica ? `${selecionado.perfil.pa_sistolica}/${selecionado.perfil.pa_diastolica} mmHg` : '--' },
              { label: 'HbA1c', v: selecionado.perfil.hba1c ? `${selecionado.perfil.hba1c}%` : '--' },
              { label: 'LDL', v: selecionado.perfil.ldl ? `${selecionado.perfil.ldl} mg/dL` : '--' },
              { label: 'TFG', v: selecionado.perfil.tfg ? `${selecionado.perfil.tfg} mL/min` : '--' },
              { label: 'Atividade', v: ATIVIDADE_META[selecionado.perfil.atividade_fisica] },
            ].map(r => (
              <div key={r.label}>
                <p className="text-xs text-slate-500">{r.label}</p>
                <p className="font-medium text-slate-800">{r.v}</p>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <p className="text-xs text-slate-500 mb-1">Comorbidades</p>
            <div className="flex flex-wrap gap-1">
              {selecionado.perfil.comorbidades.map(c => (
                <span key={c} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full">{c}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Melhor estratégia */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">Estratégia Recomendada</p>
          <p className="text-lg font-bold text-green-900 mt-1">{comparacao.melhor_estrategia}</p>
          <p className="text-sm text-green-700 mt-1">{comparacao.justificativa_escolha}</p>
        </div>

        {/* Comparação de estratégias */}
        <div className="space-y-4">
          {comparacao.estrategias.map(sim => (
            <div
              key={sim.estrategia.nome}
              className={`bg-white border rounded-xl p-4 ${
                sim.recomendado ? 'border-green-300 ring-1 ring-green-200' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-800">{sim.estrategia.nome}</h4>
                    {sim.recomendado && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Recomendado</span>
                    )}
                    {sim.estrategia.disponivel_sus && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">SUS</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {sim.estrategia.moleculas.join(' + ')} · {sim.estrategia.duracao_meses} meses
                    {sim.estrategia.custo_mes_brl ? ` · R$ ${sim.estrategia.custo_mes_brl}/mês` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{sim.score_beneficio_risco}</p>
                  <p className="text-xs text-slate-500">score benefício-risco</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                {[
                  { label: 'Sucesso', val: `${sim.probabilidade_sucesso}%`, cls: 'text-green-700' },
                  { label: 'Evento adverso', val: `${sim.probabilidade_ea}%`, cls: 'text-orange-600' },
                  { label: 'Abandono', val: `${sim.probabilidade_abandono}%`, cls: 'text-red-600' },
                ].map(m => (
                  <div key={m.label} className="text-center">
                    <p className={`text-lg font-bold ${m.cls}`}>{m.val}</p>
                    <p className="text-xs text-slate-500">{m.label}</p>
                  </div>
                ))}
              </div>
              {(sim.vantagens.length > 0 || sim.alertas.length > 0) && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1">
                  {sim.vantagens.map((v, i) => (
                    <p key={i} className="text-green-700">✓ {v}</p>
                  ))}
                  {sim.alertas.map((a, i) => (
                    <p key={i} className="text-orange-600">⚠ {a}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 text-center border-t border-slate-100 pt-4">
          Simulações de suporte à decisão clínica — a conduta final é sempre responsabilidade do médico
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gêmeo Digital do Paciente</h1>
          <p className="text-sm text-slate-500 mt-1">Simulação de estratégias de tratamento baseada no perfil clínico</p>
        </div>
        <button
          onClick={criarDemo}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Novo Twin Demo
        </button>
      </div>

      {twins.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">🧬</p>
          <p>Nenhum twin criado ainda.</p>
          <button onClick={criarDemo} className="mt-3 text-blue-600 text-sm hover:underline">Criar demonstração</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {twins.map(twin => (
            <button
              key={twin.id}
              onClick={() => abrirTwin(twin)}
              className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🧬</span>
                <div>
                  <p className="font-semibold text-slate-800">{twin.diagnostico_principal}</p>
                  <p className="text-xs text-slate-500">
                    {twin.perfil.idade} anos · IMC {twin.perfil.imc}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {twin.perfil.comorbidades.slice(0, 3).map(c => (
                  <span key={c} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">{c}</span>
                ))}
              </div>
              <p className="text-xs text-blue-600 mt-3 hover:underline">Simular tratamentos →</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
