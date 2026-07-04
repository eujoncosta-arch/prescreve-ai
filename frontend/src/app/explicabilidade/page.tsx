'use client';

// ============================================================
// PRESCREVE-AI — Explainable AI 2.0 (Phase 14)
// Painel: WHY · WHY NOT · WHAT IF · ALTERNATIVAS · EVIDÊNCIAS · CONFIANÇA
// CDSS — Suporte à decisão. Decisão médica soberana.
// ============================================================

import { useState, useMemo } from 'react';
import {
  Brain, ShieldAlert, GitCompareArrows, ListChecks,
  BookOpen, BarChart3, ChevronRight, Info,
  CheckCircle2, XCircle, AlertTriangle, TrendingDown,
  FlaskConical, Package, DollarSign, Star
} from 'lucide-react';
import {
  gerarExplainableAIv2,
  type ExplainableAIv2Result,
  type CenarioClinco,
  type AlternativaClinica,
  type ComponenteScore,
} from '@/lib/explainable-ai-v2';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { Anamnesis } from '@/lib/types';

// ══════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════

type Aba = 'why' | 'whynot' | 'whatif' | 'alternativas' | 'evidencias' | 'confianca';

const ABAS: { id: Aba; label: string; icon: React.ReactNode; cor: string }[] = [
  { id: 'why',          label: 'WHY',          icon: <Brain size={15} />,           cor: 'blue' },
  { id: 'whynot',       label: 'WHY NOT',      icon: <ShieldAlert size={15} />,     cor: 'red' },
  { id: 'whatif',       label: 'WHAT IF',      icon: <GitCompareArrows size={15} />, cor: 'purple' },
  { id: 'alternativas', label: 'ALTERNATIVAS', icon: <ListChecks size={15} />,      cor: 'emerald' },
  { id: 'evidencias',   label: 'EVIDÊNCIAS',   icon: <BookOpen size={15} />,        cor: 'amber' },
  { id: 'confianca',    label: 'CONFIANÇA',    icon: <BarChart3 size={15} />,       cor: 'violet' },
];

// ══════════════════════════════════════════════════════════════
// DEMO DATA
// ══════════════════════════════════════════════════════════════

const DEMO_ANAMNESE: Anamnesis = {
  queixa_principal: 'Controle de PA + DM2',
  hda: 'HAS + DM2 em acompanhamento ambulatorial',
  hpp: 'Hipertensão há 5 anos, DM2 há 3 anos, IC diagnosticada 1 ano',
  historia_familiar: 'Pai com IAM aos 60 anos',
  exame_fisico: 'PA 162/98, FC 78, SpO2 97%. Edema maleolar +/4+.',
  sinais_vitais: { pa_sistolica: 162, pa_diastolica: 98, fc: 78, temperatura: 36.5 },
  comorbidades: ['Hipertensão Arterial Sistêmica', 'Diabetes Mellitus Tipo 2', 'Insuficiência Cardíaca'],
  funcao_renal: { creatinina: 1.1, tfg: 62 },
  funcao_hepatica: {},
  laboratorio: { hba1c: '8.2', ldl: '145' },
  habitos_vida: { tabagismo: 'nunca', atividade_fisica: 'leve' },
  medicamentos_em_uso: [],
  alergias: [],
  gestante: false,
  lactante: false,
  imagem: '',
};

// ══════════════════════════════════════════════════════════════
// HELPERS UI
// ══════════════════════════════════════════════════════════════

const COR_MAP: Record<string, string> = {
  blue: 'border-blue-500 bg-blue-50 text-blue-700',
  red: 'border-red-500 bg-red-50 text-red-700',
  purple: 'border-purple-500 bg-purple-50 text-purple-700',
  emerald: 'border-emerald-500 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-500 bg-amber-50 text-amber-700',
  violet: 'border-violet-500 bg-violet-50 text-violet-700',
};

const GRAVIDADE_COR: Record<string, string> = {
  absoluta: 'bg-red-100 text-red-800 border-red-200',
  grave: 'bg-orange-100 text-orange-800 border-orange-200',
  moderada: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  leve: 'bg-blue-100 text-blue-800 border-blue-200',
};

const LINHA_COR: Record<string, string> = {
  '1a_linha': 'bg-emerald-100 text-emerald-800',
  '2a_linha': 'bg-blue-100 text-blue-800',
  '3a_linha': 'bg-amber-100 text-amber-800',
  resgate: 'bg-orange-100 text-orange-800',
  off_label: 'bg-gray-100 text-gray-800',
};

const NIVEL_COR: Record<string, string> = {
  A: 'bg-emerald-600 text-white',
  B: 'bg-blue-600 text-white',
  C: 'bg-amber-500 text-white',
  D: 'bg-gray-500 text-white',
};

function ScoreBadge({ valor, max = 100, cor }: { valor: number; max?: number; cor?: string }) {
  const pct = (valor / max) * 100;
  const bg = cor
    ? `bg-${cor}-500`
    : pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : pct >= 20 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${bg}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-10 text-right">{valor}/{max}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ABA WHY
// ══════════════════════════════════════════════════════════════

function AbaWHY({ result }: { result: ExplainableAIv2Result }) {
  const { why } = result;
  return (
    <div className="space-y-5">
      {/* Indicação principal */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-500 uppercase mb-1">Indicação Principal</p>
        <p className="text-sm text-gray-800">{why.indicacao_principal}</p>
      </div>

      {/* Mecanismo de ação */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Mecanismo de Ação</p>
        <p className="text-sm text-gray-700">{why.mecanismo_acao}</p>
      </div>

      {/* Por que esta classe / molécula */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-500 uppercase mb-2">Por que esta Classe?</p>
          <p className="text-sm text-gray-700">{why.por_que_esta_classe}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-emerald-600 uppercase mb-2">Por que esta Molécula?</p>
          <p className="text-sm text-gray-700">{why.por_que_esta_molecula}</p>
        </div>
      </div>

      {/* Benefício/Risco */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Benefício / Risco Absoluto</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center bg-emerald-50 rounded-lg p-3">
            <p className="text-xs text-emerald-600 font-semibold mb-1">NNT</p>
            <p className="text-2xl font-bold text-emerald-700">{why.beneficio_risco.nnt}</p>
            <p className="text-xs text-gray-500">{why.beneficio_risco.horizonte_tempo}</p>
          </div>
          {why.beneficio_risco.nnh && (
            <div className="text-center bg-amber-50 rounded-lg p-3">
              <p className="text-xs text-amber-600 font-semibold mb-1">NNH</p>
              <p className="text-2xl font-bold text-amber-700">{why.beneficio_risco.nnh}</p>
              <p className="text-xs text-gray-500">{why.beneficio_risco.horizonte_tempo}</p>
            </div>
          )}
          <div className="text-center bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600 font-semibold mb-1">Força Evidência</p>
            <p className="text-2xl font-bold text-blue-700">{why.beneficio_risco.forca_evidencia}</p>
            <p className="text-xs text-gray-500">Nível</p>
          </div>
          <div className="text-center bg-violet-50 rounded-lg p-3">
            <p className="text-xs text-violet-600 font-semibold mb-1">Score Evidência</p>
            <p className="text-2xl font-bold text-violet-700">{why.score_evidencia}</p>
            <p className="text-xs text-gray-500">/100</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 mt-3 bg-gray-50 rounded-lg p-3">{why.beneficio_risco.beneficio_absoluto}</p>
      </div>

      {/* Diretrizes */}
      {why.justificativas_diretriz.map((j, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-semibold text-gray-800">{j.diretriz}</p>
              <p className="text-xs text-gray-500">{j.sociedade} · {j.ano}</p>
            </div>
            <div className="flex gap-2">
              <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-800">Classe {j.classe_recomendacao}</span>
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${NIVEL_COR[j.nivel_evidencia] ?? 'bg-gray-100 text-gray-800'}`}>Nível {j.nivel_evidencia}</span>
            </div>
          </div>
          <p className="text-sm text-gray-700">{j.resumo_recomendacao}</p>
          {j.doi && <p className="text-xs text-blue-500 mt-1">DOI: {j.doi}</p>}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ABA WHY NOT
// ══════════════════════════════════════════════════════════════

function AbaWHYNOT({ result }: { result: ExplainableAIv2Result }) {
  const { why_not } = result;
  return (
    <div className="space-y-5">
      {/* Resumo */}
      <div className={`border rounded-xl p-4 ${why_not.tem_contraindicacao_absoluta ? 'bg-red-50 border-red-300' : why_not.score_seguranca >= 70 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-2 mb-1">
          {why_not.tem_contraindicacao_absoluta ? <XCircle size={18} className="text-red-600" /> : why_not.score_seguranca >= 70 ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertTriangle size={18} className="text-amber-600" />}
          <p className="text-sm font-semibold text-gray-800">{why_not.resumo}</p>
        </div>
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-1">Score de Segurança</p>
          <ScoreBadge valor={why_not.score_seguranca} />
        </div>
      </div>

      {/* Restrições */}
      {why_not.restricoes.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
          <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-emerald-700">Nenhuma contraindicação ou restrição ativa identificada</p>
          <p className="text-xs text-gray-500 mt-1">Baseado nos dados clínicos disponíveis</p>
        </div>
      ) : (
        <div className="space-y-3">
          {why_not.restricoes.map((r, i) => (
            <div key={i} className={`border rounded-xl p-4 ${GRAVIDADE_COR[r.gravidade]}`}>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <span className="text-xs font-bold uppercase opacity-70">{r.tipo.replace(/_/g, ' ')}</span>
                  <p className="text-sm font-semibold mt-0.5">{r.descricao}</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white bg-opacity-60 capitalize">{r.gravidade}</span>
              </div>
              <p className="text-xs opacity-80 mb-1">Critério ativado: <strong>{r.criterio_ativado}</strong></p>
              <p className="text-xs opacity-70 mb-2">Fonte: {r.fonte}</p>
              <div className="bg-white bg-opacity-50 rounded-lg p-2">
                <p className="text-xs font-semibold">Ação: {r.acao_recomendada}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {why_not.alternativa_sugerida && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
          <Info size={14} className="inline mr-1" /> {why_not.alternativa_sugerida}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ABA WHAT IF
// ══════════════════════════════════════════════════════════════

function AbaWHATIF({ result }: { result: ExplainableAIv2Result }) {
  const { what_if } = result;

  if (what_if.cenarios.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
        <GitCompareArrows size={32} className="text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Comparação de cenários não disponível para este CID.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-purple-800">{what_if.pergunta}</p>
        <p className="text-xs text-gray-600 mt-1">{what_if.recomendacao_analise}</p>
      </div>

      {/* Destaques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <TrendingDown size={18} className="text-emerald-600 mx-auto mb-1" />
          <p className="text-xs text-emerald-600 font-semibold">Melhor Evidência (NNT)</p>
          <p className="text-sm font-bold text-emerald-700">{what_if.melhor_evidencia}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <DollarSign size={18} className="text-blue-600 mx-auto mb-1" />
          <p className="text-xs text-blue-600 font-semibold">Melhor Custo-Efetividade</p>
          <p className="text-sm font-bold text-blue-700">{what_if.melhor_custo_efetividade}</p>
        </div>
        {what_if.melhor_perfil_paciente && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-center">
            <Star size={18} className="text-violet-600 mx-auto mb-1" />
            <p className="text-xs text-violet-600 font-semibold">Melhor p/ este Paciente</p>
            <p className="text-sm font-bold text-violet-700">{what_if.melhor_perfil_paciente}</p>
          </div>
        )}
      </div>

      {/* Cenários */}
      <div className="space-y-3">
        {what_if.cenarios.map((c: CenarioClinco, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-gray-800">{c.nome}</p>
                <p className="text-xs text-gray-500">{c.classe}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`px-2 py-0.5 text-xs font-bold rounded ${NIVEL_COR[c.forca_evidencia] ?? 'bg-gray-100 text-gray-800'}`}>Nível {c.forca_evidencia}</span>
                {c.disponivel_sus && <span className="px-2 py-0.5 text-xs font-bold rounded bg-green-100 text-green-700">SUS ✓</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              <div className="text-center bg-gray-50 rounded-lg p-2">
                <p className="text-xs text-gray-500">Efeito</p>
                <p className="text-xs font-bold text-gray-700">{c.mortalidade_relativa}</p>
              </div>
              <div className="text-center bg-emerald-50 rounded-lg p-2">
                <p className="text-xs text-emerald-600">NNT</p>
                <p className="text-sm font-bold text-emerald-700">{c.nnt}</p>
              </div>
              <div className="text-center bg-blue-50 rounded-lg p-2">
                <p className="text-xs text-blue-600">Custo/mês</p>
                <p className="text-sm font-bold text-blue-700">R$ {c.custo_mensal_brl}</p>
              </div>
              <div className="text-center bg-violet-50 rounded-lg p-2">
                <p className="text-xs text-violet-600">Trust</p>
                <p className="text-sm font-bold text-violet-700">{c.trust_score}/100</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-emerald-600 font-semibold mb-1">Vantagens</p>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  {c.vantagens.map((v, vi) => <li key={vi}><ChevronRight size={10} className="inline text-emerald-500" /> {v}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-xs text-amber-600 font-semibold mb-1">Desvantagens</p>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  {c.desvantagens.map((d, di) => <li key={di}><ChevronRight size={10} className="inline text-amber-500" /> {d}</li>)}
                </ul>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded p-1.5"><strong>Perfil ideal:</strong> {c.perfil_ideal}</p>
            <p className="text-xs text-gray-400 mt-1">Estudos: {c.estudos.join(', ')}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 italic border-t pt-3">{what_if.disclaimer}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ABA ALTERNATIVAS
// ══════════════════════════════════════════════════════════════

function AbaALTERNATIVAS({ result }: { result: ExplainableAIv2Result }) {
  const { alternatives } = result;

  if (alternatives.alternativas.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
        <ListChecks size={32} className="text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Alternativas não disponíveis para {alternatives.cid}.</p>
        <p className="text-xs text-gray-400 mt-1">{alternatives.nota_clinica}</p>
      </div>
    );
  }

  const linhas: { id: string; label: string }[] = [
    { id: '1a_linha', label: '1ª Linha' },
    { id: '2a_linha', label: '2ª Linha' },
    { id: '3a_linha', label: '3ª Linha' },
    { id: 'resgate',  label: 'Resgate' },
    { id: 'off_label', label: 'Off-Label' },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <p className="text-sm font-bold text-emerald-800 mb-1">{alternatives.condicao}</p>
        <p className="text-xs text-gray-600">{alternatives.nota_clinica}</p>
      </div>

      {linhas.map(({ id, label }) => {
        const items = alternatives.alternativas.filter(a => a.linha === id);
        if (items.length === 0) return null;
        return (
          <div key={id}>
            <p className="text-xs font-bold uppercase text-gray-400 mb-2">{label}</p>
            <div className="space-y-2">
              {items.map((alt: AlternativaClinica, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded ${LINHA_COR[alt.linha] ?? 'bg-gray-100 text-gray-800'}`}>{label}</span>
                        <span className={`px-2 py-0.5 text-xs font-bold rounded ${NIVEL_COR[alt.forca_evidencia] ?? 'bg-gray-100'}`}>Nível {alt.forca_evidencia}</span>
                        {alt.disponivel_sus && <span className="px-2 py-0.5 text-xs font-bold rounded bg-green-100 text-green-700">SUS</span>}
                      </div>
                      <p className="text-sm font-bold text-gray-800">{alt.molecula}</p>
                      <p className="text-xs text-gray-500">{alt.classe}</p>
                    </div>
                    {alt.nnt && (
                      <div className="text-center bg-emerald-50 rounded-lg px-3 py-1.5">
                        <p className="text-xs text-emerald-600">NNT</p>
                        <p className="text-lg font-bold text-emerald-700">{alt.nnt}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-700 mb-2">{alt.indicacao}</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="text-xs bg-emerald-50 rounded p-1.5 text-emerald-700">✓ {alt.vantagem_principal}</div>
                    <div className="text-xs bg-amber-50 rounded p-1.5 text-amber-700">⚠ {alt.desvantagem_principal}</div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>R$ {alt.custo_estimado_mes}/mês</span>
                    <span className="italic">{alt.diretriz}</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1.5 bg-blue-50 rounded p-1.5"><strong>Quando preferir:</strong> {alt.quando_preferir}</p>
                  {alt.contraindicacoes_principais.length > 0 && (
                    <p className="text-xs text-red-600 mt-1"><strong>CI:</strong> {alt.contraindicacoes_principais.join(' · ')}</p>
                  )}
                  {alt.marca_preferencial && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                      <Package size={10} /> <span>Marca ref.: {alt.marca_preferencial}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-gray-400 italic border-t pt-3">{alternatives.disclaimer}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ABA EVIDÊNCIAS
// ══════════════════════════════════════════════════════════════

function AbaEVIDENCIAS({ result }: { result: ExplainableAIv2Result }) {
  const estudos = result.why.estudos_pivotais;
  if (estudos.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
        <FlaskConical size={32} className="text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Nenhum estudo pivotal indexado para este medicamento.</p>
        <p className="text-xs text-gray-400 mt-1">Consulte as diretrizes da especialidade.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {estudos.map((e, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-bold text-gray-800">{e.nome}</p>
            <span className="text-xs text-blue-500 font-mono">{e.doi ?? ''}</span>
          </div>
          <p className="text-xs text-gray-500 mb-2">n = {e.n_pacientes.toLocaleString('pt-BR')} pacientes</p>
          <div className="bg-blue-50 rounded-lg p-2 mb-2">
            <p className="text-xs font-semibold text-blue-700">Desfecho primário</p>
            <p className="text-xs text-blue-600">{e.desfecho_primario}</p>
          </div>
          <p className="text-sm text-gray-700 mb-3">{e.resultado}</p>
          <div className="grid grid-cols-3 gap-2">
            {e.nnt !== undefined && (
              <div className="text-center bg-emerald-50 rounded-lg p-2">
                <p className="text-xs text-emerald-600 font-semibold">NNT</p>
                <p className="text-xl font-bold text-emerald-700">{e.nnt}</p>
              </div>
            )}
            {e.rrr !== undefined && (
              <div className="text-center bg-blue-50 rounded-lg p-2">
                <p className="text-xs text-blue-600 font-semibold">RRR</p>
                <p className="text-xl font-bold text-blue-700">{e.rrr}%</p>
              </div>
            )}
            {e.rar !== undefined && (
              <div className="text-center bg-violet-50 rounded-lg p-2">
                <p className="text-xs text-violet-600 font-semibold">RAR</p>
                <p className="text-xl font-bold text-violet-700">{e.rar}%</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ABA CONFIANÇA
// ══════════════════════════════════════════════════════════════

function AbaCONFIANCA({ result }: { result: ExplainableAIv2Result }) {
  const { explainability_score: es } = result;

  const scoreBg: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-400 to-yellow-500',
    orange: 'from-orange-400 to-orange-500',
    red: 'from-red-500 to-red-600',
  };

  return (
    <div className="space-y-5">
      {/* Score principal */}
      <div className={`rounded-xl p-6 text-white text-center bg-gradient-to-br ${scoreBg[es.cor] ?? 'from-gray-500 to-gray-600'}`}>
        <p className="text-xs font-bold uppercase opacity-80 mb-1">Explainability Score</p>
        <p className="text-6xl font-black mb-2">{es.score_total}</p>
        <p className="text-sm font-semibold capitalize opacity-90">{es.nivel.replace('_', ' ')}</p>
        <p className="text-xs opacity-75 mt-2 max-w-xs mx-auto">{es.interpretacao}</p>
        <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full ${es.confiavel_para_prescricao ? 'bg-white bg-opacity-20' : 'bg-red-700 bg-opacity-50'}`}>
          {es.confiavel_para_prescricao ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          <span className="text-xs font-bold">{es.confiavel_para_prescricao ? 'Confiável para suporte à prescrição' : 'Revisar antes de prescrever'}</span>
        </div>
      </div>

      {/* Componentes */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-4">Componentes do Score</p>
        <div className="space-y-4">
          {es.componentes.map((c: ComponenteScore, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-sm font-semibold text-gray-700">{c.nome}</span>
                  <span className="text-xs text-gray-400 ml-2">(peso {c.peso}%)</span>
                </div>
                <span className="text-xs text-gray-500">{c.valor}/100</span>
              </div>
              <ScoreBadge valor={c.valor} />
              <p className="text-xs text-gray-400 mt-1">{c.descricao}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs text-gray-500 leading-relaxed">{result.disclaimer}</p>
        <p className="text-xs text-gray-400 mt-1">Gerado em: {new Date(result.gerado_em).toLocaleString('pt-BR')}</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════

export default function ExplicabilidadePage() {
  const [abaAtiva, setAbaAtiva] = useState<Aba>('why');
  const [anamnese] = useLocalStorage<Anamnesis | null>('prescreve_ai_anamnese', null);
  const [cidSelecionado, setCidSelecionado] = useState('I10');

  // Usa anamnese real do localStorage se disponível, senão usa demo
  const anamneseUsada = anamnese ?? DEMO_ANAMNESE;

  const result = useMemo<ExplainableAIv2Result | null>(() => {
    try {
      const CID_CONDITION_MAP: Record<string, string> = {
        I10: 'has', E11: 'dm2', I50: 'ic', J45: 'asma',
        I25: 'dac', J44: 'dpoc', E03: 'hipotireoidismo', E78: 'dislipidemia',
      };
      const condId = CID_CONDITION_MAP[cidSelecionado] ?? cidSelecionado.toLowerCase();
      const plano = getTherapeuticForCondition(condId, cidSelecionado);
      if (!plano) return null;

      const med = plano.farmacologico[0];
      if (!med) return null;

      return gerarExplainableAIv2(med, cidSelecionado, anamneseUsada);
    } catch {
      return null;
    }
  }, [anamneseUsada, cidSelecionado]);

  const CIDs_DISPONIVEIS = [
    { cid: 'I10', label: 'I10 — Hipertensão' },
    { cid: 'E11', label: 'E11 — Diabetes Mellitus 2' },
    { cid: 'I50', label: 'I50 — Insuficiência Cardíaca' },
    { cid: 'J45', label: 'J45 — Asma' },
  ];

  if (!result) {
    return (
      <div className="p-8 text-center">
        <Brain size={48} className="text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Nenhuma recomendação disponível.</p>
        <p className="text-xs text-gray-400 mt-1">Preencha a anamnese na aba Consulta ou selecione um CID de demonstração.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Brain size={20} className="text-violet-600" />
              <h1 className="text-lg font-bold text-gray-900">Explainable AI 2.0</h1>
              <span className="px-2 py-0.5 text-xs font-bold bg-violet-100 text-violet-700 rounded">Phase 14</span>
            </div>
            <select
              value={cidSelecionado}
              onChange={e => setCidSelecionado(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {CIDs_DISPONIVEIS.map(c => (
                <option key={c.cid} value={c.cid}>{c.label}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-500">Transparência clínica total — WHY · WHY NOT · WHAT IF · ALTERNATIVAS · EVIDÊNCIAS · CONFIANÇA</p>
          {!anamnese && (
            <p className="text-xs text-amber-600 mt-1 bg-amber-50 px-2 py-1 rounded inline-block">Modo demonstração — dados simulados</p>
          )}
        </div>
      </div>

      {/* Score rápido no topo */}
      <div className="bg-white border-b border-gray-200 px-6 py-2">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Explainability Score:</span>
            <span className={`text-sm font-bold ${result.explainability_score.score_total >= 70 ? 'text-emerald-600' : result.explainability_score.score_total >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {result.explainability_score.score_total}/100
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Segurança:</span>
            <span className={`text-sm font-bold ${result.why_not.score_seguranca >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {result.why_not.score_seguranca}/100
            </span>
          </div>
          {result.why_not.tem_contraindicacao_absoluta && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">⛔ CI Absoluta</span>
          )}
        </div>
      </div>

      {/* Abas */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex flex-wrap gap-1.5 mb-6">
          {ABAS.map(aba => {
            const active = abaAtiva === aba.id;
            return (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                  active
                    ? `${COR_MAP[aba.cor]} border-current`
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {aba.icon}
                {aba.label}
              </button>
            );
          })}
        </div>

        {/* Conteúdo */}
        <div>
          {abaAtiva === 'why'          && <AbaWHY result={result} />}
          {abaAtiva === 'whynot'       && <AbaWHYNOT result={result} />}
          {abaAtiva === 'whatif'       && <AbaWHATIF result={result} />}
          {abaAtiva === 'alternativas' && <AbaALTERNATIVAS result={result} />}
          {abaAtiva === 'evidencias'   && <AbaEVIDENCIAS result={result} />}
          {abaAtiva === 'confianca'    && <AbaCONFIANCA result={result} />}
        </div>

        {/* Footer disclaimer */}
        <div className="mt-8 pb-8 text-center">
          <p className="text-xs text-gray-400">{result.disclaimer}</p>
        </div>
      </div>
    </div>
  );
}
