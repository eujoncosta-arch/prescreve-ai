'use client';

import React, { useState, useMemo } from 'react';
import {
  Brain, FileText, MessageSquare, Users, BookOpen, Stethoscope,
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight,
  ClipboardList, Lightbulb, Activity, ShieldCheck, Eye,
} from 'lucide-react';
import {
  gerarSOAP, gerarResumoConsulta, gerarSegundaOpiniao,
  gerarHipotesesDiferenciais, gerarDiscussaoClinica, gerarEvolucao,
  gerarJustificativa,
  type ModoConsulta, type ContextoClinico,
} from '@/lib/medical-copilot';

type Aba = 'soap' | 'resumo' | 'diferenciais' | 'segunda_opiniao' | 'discussao' | 'evolucao';

const ABAS = [
  { id: 'soap' as Aba,           label: 'SOAP',           icon: <ClipboardList size={13} /> },
  { id: 'resumo' as Aba,         label: 'Resumo Clínico', icon: <FileText size={13} /> },
  { id: 'diferenciais' as Aba,   label: 'Diferenciais',  icon: <Activity size={13} /> },
  { id: 'segunda_opiniao' as Aba,label: '2ª Opinião',    icon: <Lightbulb size={13} /> },
  { id: 'discussao' as Aba,      label: 'Discussão',     icon: <BookOpen size={13} /> },
  { id: 'evolucao' as Aba,       label: 'Evolução',       icon: <MessageSquare size={13} /> },
];

const MODOS: { id: ModoConsulta; label: string; cor: string }[] = [
  { id: 'especialista',    label: 'Especialista',    cor: 'blue' },
  { id: 'residencia',      label: 'Residência',      cor: 'violet' },
  { id: 'auditoria',       label: 'Auditoria',       cor: 'amber' },
  { id: 'explicabilidade', label: 'Explicabilidade', cor: 'emerald' },
];

const DEMO_CTX: ContextoClinico = {
  queixa_principal: 'Cefaleia e tontura há 2 semanas, PA elevada em domicílio',
  historia_doenca_atual: 'Paciente hipertenso há 5 anos, relata PA > 160/100 mmHg em casa nos últimos 15 dias. Em uso irregular de enalapril 10mg/dia. Nega dor torácica ou dispneia.',
  antecedentes: ['Hipertensão arterial sistêmica', 'Diabetes mellitus tipo 2', 'Dislipidemia'],
  medicamentos_em_uso: ['enalapril', 'metformina', 'rosuvastatina', 'omeprazol'],
  alergias: ['sulfonamidas'],
  exame_fisico: { 'PA': '162/98 mmHg', 'FC': '78 bpm', 'Peso': '87 kg', 'Altura': '172 cm', 'IMC': '29,4', 'Ausculta': 'sem sopros' },
  exames_laboratoriais: { glicemia_jejum: 138, hba1c: 7.8, creatinina: 1.0, potassio: 4.2, ldl: 92, colesterol_total: 178 },
  cids_ativos: ['I10', 'E11', 'E78'],
  idade: 58,
  sexo: 'M',
  peso: 87,
};

const URGENCIA_COR: Record<string, string> = {
  eletivo: 'emerald', prioritario: 'amber', urgente: 'orange', emergencia: 'red',
};

export default function CopilotPage() {
  const [aba, setAba] = useState<Aba>('soap');
  const [modo, setModo] = useState<ModoConsulta>('especialista');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [respostaEvolucao, setRespostaEvolucao] = useState<'melhora' | 'estavel' | 'piora' | 'nao_avaliado'>('melhora');

  const soap = useMemo(() => gerarSOAP(DEMO_CTX, modo), [modo]);
  const resumo = useMemo(() => gerarResumoConsulta(DEMO_CTX), []);
  const diferenciais = useMemo(() => gerarHipotesesDiferenciais(DEMO_CTX), []);
  const segundaOpiniao = useMemo(() => gerarSegundaOpiniao(DEMO_CTX), []);
  const discussao = useMemo(() => gerarDiscussaoClinica(DEMO_CTX), []);
  const evolucao = useMemo(() => gerarEvolucao(DEMO_CTX, respostaEvolucao), [respostaEvolucao]);

  const urgenciaCor = URGENCIA_COR[resumo.nivel_urgencia] ?? 'gray';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain size={18} className="text-indigo-600" />
              <h1 className="text-lg font-bold text-gray-900">AI Medical Copilot</h1>
              <span className="px-2 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-700 rounded">Phase 19</span>
            </div>
            <p className="text-xs text-gray-500">SOAP · Resumo Clínico · Diferenciais · 2ª Opinião · Discussão · Evolução</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {MODOS.map(m => (
              <button key={m.id} onClick={() => setModo(m.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${modo === m.id ? `bg-${m.cor}-100 text-${m.cor}-700 border border-${m.cor}-300` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-5xl mx-auto flex gap-1 overflow-x-auto">
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${aba === a.id ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {a.icon}{a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* SOAP */}
        {aba === 'soap' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2">
              <Eye size={13} className="text-indigo-600" />
              <p className="text-xs text-indigo-700">{soap.aviso_cdss}</p>
            </div>
            {(['S','O','A','P'] as const).map(secao => (
              <div key={secao} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <button onClick={() => setExpandido(expandido === secao ? null : secao)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${secao === 'S' ? 'bg-blue-100 text-blue-700' : secao === 'O' ? 'bg-emerald-100 text-emerald-700' : secao === 'A' ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700'}`}>{secao}</div>
                    <p className="text-sm font-bold text-gray-800">
                      {secao === 'S' ? 'Subjetivo — Queixa e história' : secao === 'O' ? 'Objetivo — Exames e dados' : secao === 'A' ? 'Avaliação — Hipóteses diagnósticas' : 'Plano — Conduta e metas'}
                    </p>
                  </div>
                  {expandido === secao ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {expandido === secao && (
                  <div className="px-5 pb-5 space-y-3">
                    {secao === 'S' && <>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-bold text-gray-600 mb-1">Queixa principal</p>
                        <p className="text-xs text-gray-700">{soap.S.queixa_principal}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-bold text-gray-600 mb-1">HDA</p>
                        <p className="text-xs text-gray-700">{soap.S.hda}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-bold text-gray-600 mb-1">HPP</p>
                          {soap.S.hpp.map((h, i) => <p key={i} className="text-xs text-gray-700">• {h}</p>)}
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-bold text-gray-600 mb-1">Medicamentos</p>
                          {soap.S.medicamentos.map((m, i) => <p key={i} className="text-xs text-gray-700">• {m}</p>)}
                        </div>
                      </div>
                    </>}
                    {secao === 'O' && <>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-bold text-gray-600 mb-2">Sinais vitais</p>
                        <div className="grid grid-cols-3 gap-2">
                          {Object.entries(soap.O.sinais_vitais).map(([k, v]) => (
                            <div key={k} className="text-center">
                              <p className="text-xs font-bold text-gray-700">{String(v)}</p>
                              <p className="text-xs text-gray-400">{k}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-bold text-gray-600 mb-2">Exames complementares</p>
                        {soap.O.exames_complementares.map((e, i) => (
                          <div key={i} className="flex justify-between py-1 text-xs border-b border-gray-200 last:border-0">
                            <span className="text-gray-600">{e.exame}</span>
                            <span className="font-bold text-gray-800">{e.resultado}</span>
                            <span className="text-gray-500">{e.interpretacao}</span>
                          </div>
                        ))}
                      </div>
                    </>}
                    {secao === 'A' && <>
                      <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                        <p className="text-xs font-bold text-violet-700 mb-1">Hipótese principal</p>
                        <p className="text-xs text-violet-800 font-semibold">{soap.A.hipotese_principal}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-bold text-gray-600 mb-1">Diferenciais</p>
                        {soap.A.hipoteses_diferenciais.map((h, i) => <p key={i} className="text-xs text-gray-700">• {h}</p>)}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-bold text-gray-600 mb-1">Raciocínio clínico ({modo})</p>
                        <p className="text-xs text-gray-700">{soap.A.raciocinio_clinico}</p>
                      </div>
                    </>}
                    {secao === 'P' && <>
                      <div className="space-y-2">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                          <p className="text-xs font-bold text-blue-700 mb-1">Conduta imediata</p>
                          {soap.P.conduta_imediata.slice(0, 4).map((c, i) => <p key={i} className="text-xs text-blue-800">• {c}</p>)}
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                          <p className="text-xs font-bold text-amber-700 mb-1">Exames solicitados</p>
                          {soap.P.exames_solicitados.slice(0, 4).map((e, i) => <p key={i} className="text-xs text-amber-800">• {e}</p>)}
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                          <p className="text-xs font-bold text-emerald-700 mb-1">Metas terapêuticas</p>
                          {soap.P.metas_terapeuticas.map((m, i) => <p key={i} className="text-xs text-emerald-800">• {m}</p>)}
                        </div>
                        <div className="text-xs text-gray-500 font-semibold">Retorno: {soap.P.retorno}</div>
                      </div>
                    </>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* RESUMO */}
        {aba === 'resumo' && (
          <div className="space-y-4">
            <div className={`bg-${urgenciaCor}-50 border border-${urgenciaCor}-200 rounded-2xl p-4 flex items-center justify-between`}>
              <div>
                <p className={`text-sm font-black text-${urgenciaCor}-700`}>Urgência: {resumo.nivel_urgencia.toUpperCase()}</p>
                <p className={`text-xs text-${urgenciaCor}-600`}>Complexidade {resumo.score_complexidade}/100</p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-black text-${urgenciaCor}-700`}>{resumo.score_complexidade}</p>
                <p className="text-xs text-gray-400">complexidade</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Principais Achados</p>
                {resumo.principais_achados.map((a, i) => <p key={i} className="text-xs text-gray-700 py-1 border-b border-gray-100 last:border-0">• {a}</p>)}
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Hipóteses</p>
                {resumo.hipoteses.map((h, i) => (
                  <p key={i} className={`text-xs py-1 border-b border-gray-100 last:border-0 ${i === 0 ? 'font-bold text-gray-800' : 'text-gray-600'}`}>
                    {i === 0 ? '★ ' : '· '}{h}
                  </p>
                ))}
              </div>
            </div>

            {resumo.conflitos_detectados.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1.5"><AlertTriangle size={13} />Conflitos Detectados</p>
                {resumo.conflitos_detectados.map((c, i) => <p key={i} className="text-xs text-red-800">⚠ {c}</p>)}
              </div>
            )}

            {resumo.riscos_identificados.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-orange-700 mb-2">Riscos Identificados</p>
                {resumo.riscos_identificados.map((r, i) => <p key={i} className="text-xs text-orange-800">• {r}</p>)}
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Prognóstico</p>
              <p className="text-sm text-gray-700">{resumo.prognostico}</p>
              <p className="text-xs text-gray-400 mt-1">Diretriz: {resumo.diretriz_principal}</p>
            </div>
          </div>
        )}

        {/* DIFERENCIAIS */}
        {aba === 'diferenciais' && (
          <div className="space-y-3">
            {diferenciais.map((hip, i) => (
              <div key={i} className={`bg-white border-2 rounded-2xl p-5 ${hip.probabilidade === 'alta' ? 'border-violet-300' : hip.probabilidade === 'moderada' ? 'border-blue-200' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-gray-800">{hip.diagnostico}</p>
                      <span className={`text-xs px-2 py-0.5 rounded font-bold ${hip.probabilidade === 'alta' ? 'bg-violet-100 text-violet-700' : hip.probabilidade === 'moderada' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {hip.probabilidade.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono">{hip.cid}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-lg font-bold">Confirmar: {hip.exame_confirmatorio}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 rounded-lg p-2.5">
                    <p className="text-xs font-bold text-emerald-700 mb-1">A favor</p>
                    {hip.a_favor.map((a, j) => <p key={j} className="text-xs text-emerald-800">+ {a}</p>)}
                  </div>
                  <div className="bg-red-50 rounded-lg p-2.5">
                    <p className="text-xs font-bold text-red-700 mb-1">Contra</p>
                    {hip.contra.map((c, j) => <p key={j} className="text-xs text-red-800">- {c}</p>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2ª OPINIÃO */}
        {aba === 'segunda_opiniao' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
              <p className="text-xs text-amber-700">{segundaOpiniao.aviso}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-blue-700 mb-2">Opinião Principal</p>
                <p className="text-xs text-blue-800">{segundaOpiniao.opiniao_principal}</p>
              </div>
              <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-violet-700 mb-2">Opinião Alternativa</p>
                <p className="text-xs text-violet-800">{segundaOpiniao.opiniao_alternativa}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-700">Grau de Concordância</p>
                <p className="text-xl font-black text-emerald-600">{segundaOpiniao.grau_concordancia_pct}%</p>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${segundaOpiniao.grau_concordancia_pct}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Diretrizes</p>
                {segundaOpiniao.diretrizes_utilizadas.map((d, i) => <p key={i} className="text-xs text-gray-700">• {d}</p>)}
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Pontos Divergentes</p>
                {segundaOpiniao.pontos_divergentes.map((p, i) => <p key={i} className="text-xs text-gray-700">• {p}</p>)}
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-emerald-700 mb-1">Recomendação Final</p>
              <p className="text-xs text-emerald-800">{segundaOpiniao.recomendacao_final}</p>
            </div>
          </div>
        )}

        {/* DISCUSSÃO */}
        {aba === 'discussao' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="text-base font-black text-gray-800 mb-1">{discussao.titulo}</h2>
              <p className="text-xs text-gray-500">{discussao.contexto}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-3">Pontos-chave</p>
              {discussao.pontos_chave.map((p, i) => (
                <div key={i} className="flex gap-2 py-2 border-b border-gray-100 last:border-0">
                  <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-700">{p}</p>
                </div>
              ))}
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-3">Nível de Evidência</p>
              {discussao.evidencias.map((e, i) => (
                <div key={i} className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
                  <span className={`text-xs px-2 py-0.5 rounded font-black flex-shrink-0 ${e.grau === 'A' ? 'bg-emerald-100 text-emerald-700' : e.grau === 'B' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{e.grau}</span>
                  <p className="text-xs text-gray-700">{e.descricao}</p>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-amber-700 mb-2">Controvérsias</p>
              {discussao.controversias.map((c, i) => <p key={i} className="text-xs text-amber-800">• {c}</p>)}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-blue-700 mb-1">Recomendação Final</p>
              <p className="text-xs text-blue-800">{discussao.recomendacao_final}</p>
            </div>
          </div>
        )}

        {/* EVOLUÇÃO */}
        {aba === 'evolucao' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-3">Resposta ao Tratamento</p>
              <div className="flex gap-2">
                {(['melhora','estavel','piora','nao_avaliado'] as const).map(r => (
                  <button key={r} onClick={() => setRespostaEvolucao(r)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${respostaEvolucao === r ? (r === 'melhora' ? 'bg-emerald-100 text-emerald-700' : r === 'piora' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700') : 'bg-gray-100 text-gray-600'}`}>
                    {r.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList size={14} className="text-indigo-600" />
                <p className="text-sm font-bold text-gray-800">Nota de Evolução</p>
                <span className="text-xs text-gray-400">{new Date(evolucao.data).toLocaleString('pt-BR')}</span>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-xs text-gray-700 leading-relaxed">
                {evolucao.texto_evolucao}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-blue-700 mb-2">Problemas Abordados</p>
                {evolucao.problemas_abordados.map((p, i) => <p key={i} className="text-xs text-blue-800">• {p}</p>)}
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-emerald-700 mb-2">Próximos Passos</p>
                {evolucao.proximos_passos.map((p, i) => <p key={i} className="text-xs text-emerald-800">• {p}</p>)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
