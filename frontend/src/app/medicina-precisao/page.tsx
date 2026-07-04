'use client';

import React, { useState, useMemo } from 'react';
import {
  Dna, AlertTriangle, CheckCircle2, Info, TrendingUp,
  FlaskConical, ShieldCheck, BookOpen, ChevronDown, ChevronRight,
  Target, Zap, Activity,
} from 'lucide-react';
import {
  avaliarFarmacogenomica, avaliarMetabolizador, avaliarRiscoRAM,
  calcularDoseGenotipada, calcularScoreFarmacogenomico, avaliarRespostaEsperada,
  FARMACOGENOMICA_DB,
  type Gene, type FenotipoMetabolizador, type GenotipoPaciente,
  type AvaliacaoFarmacogenomica,
} from '@/lib/precision-medicine';

type Aba = 'genotipo' | 'avaliacao' | 'score' | 'cpic' | 'dose';

const ABAS = [
  { id: 'genotipo' as Aba,  label: 'Genótipo',       icon: <Dna size={13} /> },
  { id: 'avaliacao' as Aba, label: 'Avaliação',       icon: <Activity size={13} /> },
  { id: 'score' as Aba,     label: 'Score Farmacoq.', icon: <TrendingUp size={13} /> },
  { id: 'cpic' as Aba,      label: 'CPIC / DPWG',     icon: <BookOpen size={13} /> },
  { id: 'dose' as Aba,      label: 'Dose Genotipada', icon: <Target size={13} /> },
];

const GENES_DISPONIVEIS: Gene[] = ['CYP2D6','CYP2C19','CYP2C9','CYP3A4','CYP2B6','VKORC1','SLCO1B1','HLA-B*57:01','HLA-B*15:02'];
const FENOTIPOS: FenotipoMetabolizador[] = ['poor','intermediate','normal','rapid','ultrarapid'];
const FENOTIPOS_LABEL: Record<FenotipoMetabolizador, string> = {
  poor: 'Metabolizador Lento (PM)', intermediate: 'Metabolizador Intermediário (IM)',
  normal: 'Metabolizador Normal (NM)', rapid: 'Metabolizador Rápido (RM)', ultrarapid: 'Ultrarrápido (UM)',
};

const MEDICAMENTOS_DEMO = ['clopidogrel','varfarina','codeina','sinvastatina','carbamazepina','abacavir','metoprolol','omeprazol'];

const IMPACTO_COR: Record<string, string> = {
  critico: 'red', maior: 'orange', moderado: 'amber', menor: 'yellow', sem_impacto: 'emerald',
};

function ImpactoBadge({ impacto }: { impacto: string }) {
  const cor = IMPACTO_COR[impacto] ?? 'gray';
  const labels: Record<string, string> = { critico: '🔴 CRÍTICO', maior: '🟠 MAIOR', moderado: '🟡 MODERADO', menor: '🟢 MENOR', sem_impacto: '✓ SEM IMPACTO' };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-bold bg-${cor}-100 text-${cor}-800`}>
      {labels[impacto] ?? impacto}
    </span>
  );
}

function EvidenciaBadge({ nivel }: { nivel: string }) {
  const cor = nivel === 'A' ? 'emerald' : nivel === 'B' ? 'blue' : nivel === 'C' ? 'amber' : 'gray';
  return <span className={`text-xs px-2 py-0.5 rounded font-bold bg-${cor}-100 text-${cor}-700`}>CPIC {nivel}</span>;
}

export default function MedicinaPresicaoPage() {
  const [aba, setAba] = useState<Aba>('genotipo');
  const [genotipos, setGenotipos] = useState<GenotipoPaciente[]>([
    { gene: 'CYP2C19', alelo1: '*2', alelo2: '*2', fenotipo: 'poor' },
    { gene: 'VKORC1',  alelo1: 'A',  alelo2: 'A',  fenotipo: 'poor' },
    { gene: 'CYP2D6',  alelo1: '*1', alelo2: '*1',  fenotipo: 'normal' },
    { gene: 'SLCO1B1', alelo1: '*1', alelo2: '*1',  fenotipo: 'normal' },
    { gene: 'HLA-B*57:01', alelo1: 'negativo', alelo2: 'negativo', fenotipo: 'normal' },
    { gene: 'HLA-B*15:02', alelo1: 'negativo', alelo2: 'negativo', fenotipo: 'normal' },
  ]);
  const [medSelecionado, setMedSelecionado] = useState('clopidogrel');
  const [expandido, setExpandido] = useState<string | null>(null);

  const avaliacoes = useMemo(() => avaliarFarmacogenomica(medSelecionado, genotipos), [medSelecionado, genotipos]);
  const score = useMemo(() => calcularScoreFarmacogenomico(MEDICAMENTOS_DEMO, genotipos), [genotipos]);
  const resposta = useMemo(() => avaliarRespostaEsperada(medSelecionado, genotipos), [medSelecionado, genotipos]);
  const dose = useMemo(() => calcularDoseGenotipada(medSelecionado, '75mg 1x/dia', genotipos), [medSelecionado, genotipos]);
  const risco = useMemo(() => avaliarRiscoRAM(medSelecionado, genotipos), [medSelecionado, genotipos]);

  const updateGenotipo = (idx: number, field: keyof GenotipoPaciente, value: string) => {
    setGenotipos(prev => {
      const next = [...prev];
      if (field === 'fenotipo') {
        next[idx] = { ...next[idx], fenotipo: value as FenotipoMetabolizador };
      } else {
        next[idx] = { ...next[idx], [field]: value };
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Dna size={18} className="text-violet-600" />
              <h1 className="text-lg font-bold text-gray-900">Precision Medicine Engine</h1>
              <span className="px-2 py-0.5 text-xs font-bold bg-violet-100 text-violet-700 rounded">Phase 18</span>
            </div>
            <p className="text-xs text-gray-500">Farmacogenômica · CYP450 · HLA · CPIC · DPWG · Score de Risco Genômico</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${score.nivel_risco === 'critico' ? 'bg-red-50' : score.nivel_risco === 'alto' ? 'bg-orange-50' : score.nivel_risco === 'moderado' ? 'bg-amber-50' : 'bg-emerald-50'}`}>
            <ShieldCheck size={14} className={score.nivel_risco === 'baixo' ? 'text-emerald-600' : 'text-red-600'} />
            <div>
              <p className={`text-sm font-black ${score.nivel_risco === 'baixo' ? 'text-emerald-700' : 'text-red-700'}`}>{score.score_geral}/100</p>
              <p className="text-xs text-gray-500">Score Farmacogenômico</p>
            </div>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-5xl mx-auto flex gap-1">
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${aba === a.id ? 'border-violet-500 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {a.icon}{a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* GENÓTIPO */}
        {aba === 'genotipo' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-sm font-bold text-gray-700 mb-4">Perfil Farmacogenômico do Paciente</p>
              <div className="space-y-3">
                {genotipos.map((g, i) => (
                  <div key={i} className="grid grid-cols-4 gap-3 items-center p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Gene</p>
                      <p className="text-xs font-black text-violet-700">{g.gene}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Alelo 1</p>
                      <input value={g.alelo1} onChange={e => updateGenotipo(i, 'alelo1', e.target.value)}
                        className="w-full text-xs font-mono border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Alelo 2</p>
                      <input value={g.alelo2} onChange={e => updateGenotipo(i, 'alelo2', e.target.value)}
                        className="w-full text-xs font-mono border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Fenótipo</p>
                      <select value={g.fenotipo ?? 'normal'} onChange={e => updateGenotipo(i, 'fenotipo', e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white">
                        {FENOTIPOS.map(f => <option key={f} value={f}>{FENOTIPOS_LABEL[f]}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                ⚕️ O perfil farmacogenômico é uma ferramenta de suporte — o médico decide a conduta com base no quadro clínico completo.
              </p>
            </div>
          </div>
        )}

        {/* AVALIAÇÃO */}
        {aba === 'avaliacao' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-600">Medicamento</label>
              <select value={medSelecionado} onChange={e => setMedSelecionado(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                {MEDICAMENTOS_DEMO.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {avaliacoes.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                <CheckCircle2 size={24} className="text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-emerald-700">Sem interações farmacogenômicas conhecidas para {medSelecionado}</p>
                <p className="text-xs text-emerald-600 mt-1">Não há dados CPIC/DPWG para este medicamento no perfil genômico atual</p>
              </div>
            ) : (
              avaliacoes.map((aval, i) => (
                <div key={i} className={`bg-white border-2 rounded-2xl overflow-hidden ${aval.impacto === 'critico' ? 'border-red-300' : aval.impacto === 'maior' ? 'border-orange-300' : 'border-gray-200'}`}>
                  <div className="px-5 py-4 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-black text-gray-800">{aval.molecula} — {aval.gene}</p>
                        <ImpactoBadge impacto={aval.impacto} />
                        <EvidenciaBadge nivel={aval.evidencia_cpic} />
                      </div>
                      <p className="text-xs text-gray-500 mb-1">Fenótipo: <strong>{FENOTIPOS_LABEL[aval.fenotipo]}</strong></p>
                      <p className="text-xs text-gray-600">{aval.descricao}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className={`text-2xl font-black ${aval.score_risco >= 70 ? 'text-red-600' : aval.score_risco >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>{aval.score_risco}</p>
                      <p className="text-xs text-gray-400">risco</p>
                    </div>
                  </div>
                  <div className="px-5 pb-4 space-y-2">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <p className="text-xs font-bold text-blue-700 mb-1">Recomendação CPIC / DPWG</p>
                      <p className="text-xs text-blue-800">{aval.recomendacao}</p>
                    </div>
                    {aval.ajuste_dose && (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                        <p className="text-xs font-bold text-amber-700">Ajuste de dose: <span className="font-normal">{aval.ajuste_dose}</span></p>
                      </div>
                    )}
                    {aval.alternativa && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
                        <p className="text-xs font-bold text-emerald-700">Alternativa sugerida: <span className="font-normal">{aval.alternativa}</span></p>
                      </div>
                    )}
                    {aval.aviso_hla && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
                        <p className="text-xs font-bold text-red-700">⚠ HLA — {aval.aviso_hla}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Resposta esperada */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-3">Resposta Esperada — {medSelecionado}</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className={`text-2xl font-black ${resposta.eficacia_estimada_pct >= 80 ? 'text-emerald-600' : resposta.eficacia_estimada_pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{resposta.eficacia_estimada_pct}%</p>
                  <p className="text-xs text-gray-500">Eficácia estimada</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-700">{resposta.variabilidade}</p>
                  <p className="text-xs text-gray-500">Variabilidade</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-700">{resposta.tempo_resposta_esperado}</p>
                  <p className="text-xs text-gray-500">Tempo de resposta</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs font-bold text-gray-500 mb-1">Monitoramento sugerido</p>
                {resposta.monitoramento_sugerido.map((m, i) => (
                  <p key={i} className="text-xs text-gray-600 flex gap-1"><span className="text-blue-500">·</span>{m}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SCORE */}
        {aba === 'score' && (
          <div className="space-y-4">
            <div className={`rounded-2xl p-6 text-white ${score.nivel_risco === 'critico' ? 'bg-red-600' : score.nivel_risco === 'alto' ? 'bg-orange-500' : score.nivel_risco === 'moderado' ? 'bg-amber-500' : 'bg-emerald-500'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold opacity-90">Score Farmacogenômico Global</p>
                  <p className="text-xs opacity-75">{MEDICAMENTOS_DEMO.length} medicamentos avaliados · {score.genes_testados.length} genes testados</p>
                </div>
                <div className="text-right">
                  <p className="text-5xl font-black">{score.score_geral}</p>
                  <p className="text-xs opacity-90">/100</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="bg-white bg-opacity-20 rounded-lg p-2">
                  <p className="text-lg font-black">{score.interacoes_criticas}</p>
                  <p className="text-xs opacity-90">Críticas</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-2">
                  <p className="text-lg font-black">{score.interacoes_maiores}</p>
                  <p className="text-xs opacity-90">Maiores</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-2">
                  <p className="text-lg font-black">{score.interacoes_moderadas}</p>
                  <p className="text-xs opacity-90">Moderadas</p>
                </div>
              </div>
            </div>

            {score.recomendacoes_prioritarias.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-red-700 mb-2">Ações Prioritárias</p>
                {score.recomendacoes_prioritarias.map((r, i) => (
                  <p key={i} className="text-xs text-red-800 flex gap-1.5 mb-1"><AlertTriangle size={11} className="mt-0.5 flex-shrink-0" />{r}</p>
                ))}
              </div>
            )}

            {score.alternativas_sugeridas.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-emerald-700 mb-2">Alternativas Sugeridas</p>
                {score.alternativas_sugeridas.map((a, i) => (
                  <p key={i} className="text-xs text-emerald-800">• {a.molecula} → {a.alternativa}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CPIC */}
        {aba === 'cpic' && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs text-blue-700">
                <strong>CPIC</strong> (Clinical Pharmacogenomics Implementation Consortium) e <strong>DPWG</strong> (Dutch Pharmacogenomics Working Group) — diretrizes de implementação clínica de farmacogenômica. Nível A = evidência forte de RCTs ou estudos funcionais.
              </p>
            </div>
            {FARMACOGENOMICA_DB.map((entrada, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <button onClick={() => setExpandido(expandido === entrada.molecula ? null : entrada.molecula)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-800">{entrada.molecula}</p>
                      <span className="text-xs text-gray-400">↔</span>
                      <p className="text-xs font-bold text-violet-700">{entrada.gene}</p>
                    </div>
                    <EvidenciaBadge nivel={entrada.evidencia_cpic} />
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${entrada.classe_cpic === 'Strong' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{entrada.classe_cpic}</span>
                  </div>
                  {expandido === entrada.molecula ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {expandido === entrada.molecula && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-gray-600 mb-3">{entrada.mecanismo}</p>
                    <div className="space-y-2">
                      {FENOTIPOS.map(f => {
                        const imp = entrada.impacto_por_fenotipo[f];
                        return (
                          <div key={f} className={`p-2.5 rounded-lg border ${imp.impacto === 'critico' ? 'bg-red-50 border-red-200' : imp.impacto === 'maior' ? 'bg-orange-50 border-orange-200' : imp.impacto === 'sem_impacto' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-bold text-gray-700">{FENOTIPOS_LABEL[f]}</p>
                              <ImpactoBadge impacto={imp.impacto} />
                            </div>
                            <p className="text-xs text-gray-600">{imp.recomendacao}</p>
                          </div>
                        );
                      })}
                    </div>
                    {entrada.doi_referencia && (
                      <p className="text-xs text-gray-400 mt-2">DOI: {entrada.doi_referencia}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* DOSE GENOTIPADA */}
        {aba === 'dose' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-600">Medicamento</label>
              <select value={medSelecionado} onChange={e => setMedSelecionado(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                {MEDICAMENTOS_DEMO.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Dose Padrão (populacional)</p>
                  <p className="text-2xl font-black text-gray-700">{dose.dose_padrao}</p>
                  <p className="text-xs text-gray-400 mt-1">Sem ajuste genômico</p>
                </div>
                <div className={`rounded-xl p-4 ${dose.dose_genotipada !== dose.dose_padrao ? 'bg-violet-50 border border-violet-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                  <p className="text-xs text-gray-500 mb-1">Dose Genotipada (CPIC)</p>
                  <p className={`text-2xl font-black ${dose.dose_genotipada !== dose.dose_padrao ? 'text-violet-700' : 'text-emerald-700'}`}>{dose.dose_genotipada}</p>
                  <p className="text-xs text-gray-400 mt-1">{dose.dose_genotipada !== dose.dose_padrao ? '↑ Ajuste necessário' : '✓ Sem ajuste'}</p>
                </div>
              </div>
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs font-bold text-blue-700 mb-1">Racional</p>
                <p className="text-xs text-blue-800">{dose.racional}</p>
              </div>
              <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg p-3">
                <p className="text-xs font-bold text-amber-700 mb-1">Monitoramento</p>
                <p className="text-xs text-amber-800">{dose.monitoramento}</p>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                ⚕️ A dose genotipada é uma sugestão baseada em CPIC/DPWG. A prescrição final é responsabilidade exclusiva do médico.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
