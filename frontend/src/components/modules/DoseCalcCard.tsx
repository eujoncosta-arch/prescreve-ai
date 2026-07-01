'use client';

// ============================================================
// DoseCalcCard — Card visual de cálculo de dose automático
// Exibe cálculo transparente + posologia sugerida
// ============================================================

import { useMemo } from 'react';
import {
  calcFullDose, classifyPopulation, parseConcentration,
  type FullDoseInput, type FullDoseResult,
} from '@/lib/dose-calculator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calculator, User, Pill, CheckCircle2, AlertTriangle,
  ArrowRight, Beaker, Zap,
} from 'lucide-react';

interface DoseCalcCardProps {
  drug: FullDoseInput;
  concentracaoSelecionada: string;
  idadeAnos: number;
  pesoKg: number;
  crcl?: number;
  childPugh?: 'A' | 'B' | 'C' | '';
  gestante?: boolean;
  lactante?: boolean;
  onApply: (result: FullDoseResult) => void;
}

const POPULATION_COLORS: Record<string, string> = {
  neonato:     'bg-purple-100 text-purple-700 border-purple-200',
  lactente:    'bg-blue-100 text-blue-700 border-blue-200',
  pre_escolar: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  escolar:     'bg-teal-100 text-teal-700 border-teal-200',
  adolescente: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  adulto:      'bg-slate-100 text-slate-700 border-slate-200',
  geriatrico:  'bg-orange-100 text-orange-700 border-orange-200',
};

const FONTE_LABELS: Record<string, string> = {
  pediatrica_mg_kg: 'Cálculo mg/kg — Bula profissional',
  adulto_fixo:      'Dose adulto — Bula profissional',
  adulto_mg_kg:     'Dose mg/kg adulto',
  bsa:              'Dose por superfície corporal (m²)',
};

export function DoseCalcCard({
  drug,
  concentracaoSelecionada,
  idadeAnos,
  pesoKg,
  crcl,
  childPugh,
  gestante,
  lactante,
  onApply,
}: DoseCalcCardProps) {

  const result = useMemo(() => calcFullDose(
    drug, idadeAnos, pesoKg, concentracaoSelecionada,
    crcl, childPugh, gestante, lactante,
  ), [drug, idadeAnos, pesoKg, concentracaoSelecionada, crcl, childPugh, gestante, lactante]);

  const conc = useMemo(() => parseConcentration(concentracaoSelecionada), [concentracaoSelecionada]);

  const hasCritical = result.alertas.some(a => a.startsWith('🚨'));
  const hasWarning  = result.alertas.some(a => a.startsWith('⚠'));

  const popColor = POPULATION_COLORS[result.population.population] ?? POPULATION_COLORS['adulto'];

  return (
    <div className={`rounded-xl border-2 overflow-hidden ${hasCritical ? 'border-red-200' : hasWarning ? 'border-amber-200' : 'border-emerald-200'}`}>

      {/* Header */}
      <div className={`px-4 py-2.5 flex items-center justify-between ${hasCritical ? 'bg-red-50' : hasWarning ? 'bg-amber-50' : 'bg-emerald-50'}`}>
        <div className="flex items-center gap-2">
          <Calculator className={`w-4 h-4 ${hasCritical ? 'text-red-600' : hasWarning ? 'text-amber-600' : 'text-emerald-600'}`} />
          <span className={`text-sm font-bold ${hasCritical ? 'text-red-800' : hasWarning ? 'text-amber-800' : 'text-emerald-800'}`}>
            Cálculo de Dose Automático
          </span>
        </div>
        <Badge variant="outline" className={`text-[10px] font-medium border ${popColor}`}>
          {result.population.label}
        </Badge>
      </div>

      <div className="bg-white p-4 space-y-3">

        {/* Linha paciente + medicamento */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <User className="w-3.5 h-3.5 text-slate-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Paciente</p>
              <p className="text-xs font-semibold text-slate-800">{idadeAnos < 1 ? `${Math.round(idadeAnos * 12)} meses` : `${idadeAnos} anos`} — {pesoKg} kg</p>
              {crcl !== undefined && (
                <p className={`text-[10px] font-medium ${crcl >= 60 ? 'text-green-600' : crcl >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                  CrCl: {crcl} mL/min
                </p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Pill className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Medicamento</p>
              <p className="text-xs font-semibold text-slate-800">{drug.molecula}</p>
              <p className="text-[10px] text-slate-500">{concentracaoSelecionada}</p>
            </div>
          </div>
        </div>

        {/* Separador */}
        <div className="border-t border-dashed border-slate-100" />

        {/* Cálculo passo a passo */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Beaker className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Cálculo</p>
          </div>
          <div className="bg-slate-50 rounded-lg px-3 py-2 space-y-0.5 font-mono">
            {result.passo_a_passo.map((step, i) => (
              <p
                key={i}
                className={`text-[11px] leading-relaxed ${
                  step.startsWith('→') ? 'text-emerald-700 font-semibold text-xs' :
                  step.startsWith('⚠') ? 'text-amber-700' :
                  step.startsWith('✓') ? 'text-emerald-600' :
                  'text-slate-600'
                }`}
              >
                {step}
              </p>
            ))}
          </div>
        </div>

        {/* Resultado visual */}
        <div className={`rounded-lg p-3 border ${hasCritical ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            {hasCritical
              ? <AlertTriangle className="w-4 h-4 text-red-500" />
              : <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            }
            <p className="text-xs font-bold text-slate-800">Prescrição Sugerida</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
              <p className="text-sm font-bold text-slate-900">{result.posologia_sugerida}</p>
            </div>
            {result.volume_por_tomada !== undefined && (
              <div className="flex items-center gap-2 pl-5">
                <p className="text-xs text-slate-600">
                  {result.volume_por_tomada} mL por dose × {result.tomadas_dia}x/dia = {Math.round(result.volume_por_tomada * result.tomadas_dia * 10) / 10} mL/dia
                </p>
              </div>
            )}
            <div className="flex items-center gap-2 pl-5 mt-1">
              <p className="text-[11px] text-slate-500">
                Total diário: <strong>{result.dose_total_dia} {result.dose_unidade}</strong>
                {result.limitado_por_dose_max && <span className="text-amber-600 ml-1">(limitado ao máximo)</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Ajustes renal/hepático */}
        {(result.ajuste_renal_texto || result.ajuste_hepatico_texto) && (
          <div className="grid grid-cols-1 gap-1.5">
            {result.ajuste_renal_texto && (
              <div className={`text-[11px] px-2.5 py-1.5 rounded-md border ${crcl !== undefined && crcl < 60 ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                🫁 <strong>Renal:</strong> {result.ajuste_renal_texto}
              </div>
            )}
            {result.ajuste_hepatico_texto && (
              <div className="text-[11px] px-2.5 py-1.5 rounded-md bg-orange-50 border border-orange-200 text-orange-800">
                🫀 <strong>Hepático:</strong> {result.ajuste_hepatico_texto}
              </div>
            )}
          </div>
        )}

        {/* Alertas */}
        {result.alertas.length > 0 && (
          <div className="space-y-1">
            {result.alertas.map((alerta, i) => (
              <div
                key={i}
                className={`text-[11px] px-2.5 py-1.5 rounded-md border ${
                  alerta.startsWith('🚨')
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {alerta}
              </div>
            ))}
          </div>
        )}

        {/* Fonte */}
        <p className="text-[10px] text-slate-400 text-right">
          Fonte: {FONTE_LABELS[result.fonte]}
          {conc.tipo === 'liquido' && ` | Concentração: ${conc.mg_por_mL} mg/mL`}
        </p>

        {/* Botão aplicar */}
        <Button
          onClick={() => onApply(result)}
          className={`w-full gap-2 h-9 text-sm font-semibold ${hasCritical ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          disabled={hasCritical}
        >
          <Zap className="w-4 h-4" />
          {hasCritical ? 'Contraindicado — verifique alertas' : 'Aplicar esta posologia'}
        </Button>
      </div>
    </div>
  );
}
