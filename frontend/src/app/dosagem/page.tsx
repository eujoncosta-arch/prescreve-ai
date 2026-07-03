'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  MEDICAMENTOS_DOSAGEM,
  buscarMedicamento,
  calcularDosagem,
  detectarPopulacao,
  idadeDias,
  labelPopulacao,
  corPopulacao,
  labelFrequencia,
  formatarDose,
  formatarVolume,
  type MedicamentoDosagem,
  type FormulacaoMedicamento,
  type ResultadoDosagem,
} from '@/lib/dosing-engine';
import {
  Search, Pill, User, Weight, Ruler, Calculator, ChevronDown,
  ChevronUp, CheckCircle2, AlertTriangle, XCircle, BookOpen,
  FlaskConical, Info, Shield, RotateCcw, Baby, Activity,
  Beaker, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── helpers ─────────────────────────────────────────────────────────────────

function r(n: number, dec = 1) {
  return parseFloat(n.toFixed(dec));
}

function labelVia(via: string) {
  const M: Record<string, string> = {
    oral: 'Via oral', iv: 'Intravenoso', im: 'Intramuscular',
    sc: 'Subcutâneo', inalatorio: 'Inalatório', topico: 'Tópico', retal: 'Retal',
  };
  return M[via] ?? via;
}

function frequenciaLabel(h: number) {
  const M: Record<number, string> = {
    4: '4/4h', 6: '6/6h', 8: '8/8h', 12: '12/12h', 24: '1×/dia', 48: '1×/48h',
  };
  return M[h] ?? `${h}h/h`;
}

// ─── Paciente form ────────────────────────────────────────────────────────────

interface Paciente {
  anos: string;
  meses: string;
  dias_idade: string;
  peso: string;
  altura: string;
}

function PacienteStep({
  paciente, onChange,
}: {
  paciente: Paciente;
  onChange: (p: Paciente) => void;
}) {
  function set(k: keyof Paciente, v: string) { onChange({ ...paciente, [k]: v }); }

  const populacao = useMemo(() => {
    const a = parseInt(paciente.anos) || 0;
    const m = parseInt(paciente.meses) || 0;
    const d = parseInt(paciente.dias_idade) || 0;
    if (!a && !m && !d) return null;
    return detectarPopulacao(idadeDias(a, m, d));
  }, [paciente]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <User size={12} /> Idade do paciente
        </p>
        <div className="grid grid-cols-3 gap-2">
          {([['anos', 'Anos'], ['meses', 'Meses (0–11)'], ['dias_idade', 'Dias']] as const).map(([k, label]) => (
            <div key={k}>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{label}</label>
              <input
                type="number" min="0"
                value={paciente[k]}
                onChange={e => set(k, e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
              />
            </div>
          ))}
        </div>
        {populacao && (
          <div className={cn('mt-2 text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1', corPopulacao(populacao))}>
            <Baby size={11} /> {labelPopulacao(populacao)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-2">
            <Weight size={12} /> Peso (kg)
          </label>
          <input
            type="number" min="0" step="0.1"
            value={paciente.peso}
            onChange={e => set('peso', e.target.value)}
            placeholder="Ex: 20.0"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-2">
            <Ruler size={12} /> Altura (cm) <span className="text-[10px] font-normal normal-case">(opcional)</span>
          </label>
          <input
            type="number" min="0"
            value={paciente.altura}
            onChange={e => set('altura', e.target.value)}
            placeholder="Ex: 110"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Drug selector ─────────────────────────────────────────────────────────────

function DrugSelector({
  selected, formulacaoId,
  onSelectDrug, onSelectFormulacao,
}: {
  selected: MedicamentoDosagem | null;
  formulacaoId: string;
  onSelectDrug: (m: MedicamentoDosagem) => void;
  onSelectFormulacao: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(!selected);

  const resultados = useMemo(() => buscarMedicamento(query), [query]);

  function pick(m: MedicamentoDosagem) {
    onSelectDrug(m);
    onSelectFormulacao(m.formulacoes[0]?.id ?? '');
    setOpen(false);
    setQuery('');
  }

  return (
    <div className="space-y-3">
      {/* selected drug header */}
      {selected && !open && (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 hover:border-indigo-400 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Pill size={16} className="text-indigo-600 dark:text-indigo-400" />
            <div className="text-left">
              <p className="font-semibold text-sm text-indigo-800 dark:text-indigo-200">{selected.nome_generico}</p>
              <p className="text-[11px] text-indigo-500 dark:text-indigo-400">{selected.classe}</p>
            </div>
          </div>
          <ChevronDown size={14} className="text-indigo-400" />
        </button>
      )}

      {/* drug search */}
      {(!selected || open) && (
        <div>
          <div className="relative mb-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="text" value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar medicamento... (ex: amoxicilina, dipirona, montelucaste)"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
            {resultados.map(m => (
              <button key={m.id} onClick={() => pick(m)}
                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{m.nome_generico}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{m.classe}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* formulacao selector */}
      {selected && (
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Beaker size={12} /> Forma farmacêutica
          </p>
          <div className="grid grid-cols-1 gap-2">
            {selected.formulacoes.map(f => (
              <button
                key={f.id}
                onClick={() => onSelectFormulacao(f.id)}
                className={cn(
                  'text-left px-3 py-2.5 rounded-xl border text-sm transition-all',
                  formulacaoId === f.id
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 font-medium'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-300',
                )}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide mr-2 text-slate-400">
                  {labelVia(f.via)}
                </span>
                {f.descricao}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultadoCard({ resultado, medicamento }: { resultado: ResultadoDosagem; medicamento: MedicamentoDosagem }) {
  const [showDetails, setShowDetails] = useState(false);

  if (!resultado.ok) {
    return (
      <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-5">
        <div className="flex items-start gap-3">
          <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700 dark:text-red-300 mb-1">Cálculo indisponível</p>
            <p className="text-sm text-red-600 dark:text-red-400">{resultado.erro}</p>
          </div>
        </div>
      </div>
    );
  }

  const { populacao, formulacao, regra } = resultado;
  const temVolume = resultado.volume_por_dose_mL !== undefined;
  const temGotas = resultado.gotas_por_dose !== undefined;
  const temComp = resultado.comprimidos_por_dose !== undefined;

  // primary display value
  let valorPrimario = '';
  let unidadePrimaria = '';
  let valorSecundario = '';

  if (temGotas) {
    valorPrimario = `${resultado.gotas_por_dose}`;
    unidadePrimaria = 'gotas';
    valorSecundario = `≈ ${formatarVolume(resultado.volume_por_dose_mL!)}`;
  } else if (temVolume) {
    valorPrimario = formatarVolume(resultado.volume_por_dose_mL!);
    unidadePrimaria = 'por dose';
  } else if (temComp) {
    const comp = resultado.comprimidos_por_dose!;
    valorPrimario = comp % 1 === 0 ? comp.toFixed(0) : comp.toFixed(1);
    unidadePrimaria = resultado.unidade_resultado;
    if (comp % 1 !== 0) {
      valorSecundario = comp === 0.5 ? '½ comprimido' : comp < 1 ? 'fracionar comprimido' : '';
    }
  }

  const frequenciaTexto = labelFrequencia(regra.frequencia_horas);

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
      {/* population banner */}
      <div className={cn('px-4 py-2 flex items-center gap-2', corPopulacao(populacao))}>
        <Baby size={13} />
        <span className="text-[12px] font-bold uppercase tracking-wide">{labelPopulacao(populacao)}</span>
        <span className="ml-auto text-[11px]">{formulacao.descricao}</span>
      </div>

      <div className="p-5">
        {/* big primary result */}
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-xl p-4 mb-4 border border-indigo-100 dark:border-indigo-800">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide mb-0.5">Administrar por dose</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-indigo-700 dark:text-indigo-300">{valorPrimario}</span>
                <span className="text-lg font-semibold text-indigo-500 dark:text-indigo-400">{unidadePrimaria}</span>
              </div>
              {valorSecundario && (
                <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">{valorSecundario}</p>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <Clock size={13} className="text-indigo-400" />
                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{frequenciaTexto}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{resultado.doses_por_dia}x ao dia</p>
            </div>
          </div>
        </div>

        {/* result rows */}
        <div className="space-y-2 mb-4">
          <ResultRow
            icon={<Activity size={14} className="text-emerald-500" />}
            label="Dose por tomada"
            value={formatarDose(resultado.dose_por_dose_mg)}
            ok={!resultado.excede_dose_maxima_dose}
          />
          <ResultRow
            icon={<Calculator size={14} className="text-blue-500" />}
            label="Dose total/dia"
            value={formatarDose(resultado.dose_total_dia_mg)}
            ok={!resultado.excede_dose_maxima_dia}
          />
          {resultado.dose_maxima_por_dose_mg && (
            <ResultRow
              icon={<Shield size={14} className="text-amber-500" />}
              label="Dose máxima/tomada"
              value={formatarDose(resultado.dose_maxima_por_dose_mg)}
              neutral
            />
          )}
          {resultado.dose_maxima_por_dia_mg && (
            <ResultRow
              icon={<Shield size={14} className="text-amber-500" />}
              label="Dose máxima/dia"
              value={formatarDose(resultado.dose_maxima_por_dia_mg)}
              neutral
            />
          )}
          {resultado.bsa && (
            <ResultRow
              icon={<Ruler size={14} className="text-violet-500" />}
              label="BSA calculada (Mosteller)"
              value={`${resultado.bsa.toFixed(2)} m²`}
              neutral
            />
          )}
        </div>

        {/* validation badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <ValidationBadge ok={!resultado.excede_dose_maxima_dose} label="Dose/tomada validada" />
          <ValidationBadge ok={!resultado.excede_dose_maxima_dia} label="Dose diária validada" />
          {regra.ajuste_renal && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <AlertTriangle size={11} /> Ajustar em DRC
            </span>
          )}
          {regra.ajuste_hepatico && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
              <AlertTriangle size={11} /> Ajustar em hepatopatia
            </span>
          )}
        </div>

        {/* formula */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 mb-4 border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Fórmula utilizada</p>
          <p className="text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed">{resultado.formula_texto}</p>
        </div>

        {/* observacoes */}
        {regra.observacao && (
          <div className="flex gap-2 mb-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Info size={13} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300">{regra.observacao}</p>
          </div>
        )}

        {medicamento.alerta_especial && (
          <div className="flex gap-2 mb-3 p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-300 font-medium">{medicamento.alerta_especial}</p>
          </div>
        )}

        {/* expandable details */}
        <button
          onClick={() => setShowDetails(v => !v)}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
        >
          <span className="text-xs font-semibold flex items-center gap-1.5">
            <BookOpen size={13} /> Bula · Diretriz · Evidência
          </span>
          {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {showDetails && (
          <div className="mt-2 space-y-2">
            {medicamento.diretriz && (
              <div className="flex gap-2 p-2.5 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                <BookOpen size={13} className="text-violet-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wide">Diretriz</p>
                  <p className="text-xs text-violet-700 dark:text-violet-300">{medicamento.diretriz}</p>
                </div>
              </div>
            )}
            {medicamento.evidencia && (
              <div className="flex gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <FlaskConical size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">Evidência</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">{medicamento.evidencia}</p>
                </div>
              </div>
            )}
            {medicamento.observacao_geral && (
              <div className="flex gap-2 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <Info size={13} className="text-slate-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 dark:text-slate-400">{medicamento.observacao_geral}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <Shield size={11} />
          <span><strong>Suporte à decisão clínica.</strong> Verificar dose e formulação. Responsabilidade clínica do médico prescritor.</span>
        </div>
      </div>
    </div>
  );
}

function ResultRow({ icon, label, value, ok, neutral }: {
  icon: React.ReactNode; label: string; value: string;
  ok?: boolean; neutral?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{value}</span>
        {!neutral && (
          ok
            ? <CheckCircle2 size={13} className="text-emerald-500" />
            : <AlertTriangle size={13} className="text-amber-500" />
        )}
      </div>
    </div>
  );
}

function ValidationBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full',
      ok
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    )}>
      {ok ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
      {label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DosagemPage() {
  const [paciente, setPaciente] = useState<Paciente>({
    anos: '', meses: '', dias_idade: '', peso: '', altura: '',
  });
  const [medicamento, setMedicamento] = useState<MedicamentoDosagem | null>(null);
  const [formulacaoId, setFormulacaoId] = useState('');

  const resultado = useMemo<ResultadoDosagem | null>(() => {
    if (!medicamento || !formulacaoId) return null;
    const peso = parseFloat(paciente.peso);
    const anos = parseInt(paciente.anos) || 0;
    const meses = parseInt(paciente.meses) || 0;
    const dias_extra = parseInt(paciente.dias_idade) || 0;
    if (!peso || peso <= 0) return null;
    if (!anos && !meses && !dias_extra) return null;
    const alt = parseFloat(paciente.altura) || undefined;
    return calcularDosagem(peso, alt, idadeDias(anos, meses, dias_extra), medicamento, formulacaoId);
  }, [paciente, medicamento, formulacaoId]);

  const pronto = !!(
    (parseInt(paciente.anos) || parseInt(paciente.meses) || parseInt(paciente.dias_idade)) &&
    parseFloat(paciente.peso) > 0 &&
    medicamento && formulacaoId
  );

  function reset() {
    setPaciente({ anos: '', meses: '', dias_idade: '', peso: '', altura: '' });
    setMedicamento(null);
    setFormulacaoId('');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calculator size={20} className="text-indigo-500" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Calculadora de Dosagem</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Posologia por faixa etária • mg/kg • mg/m² • Validação de dose máxima
            </p>
          </div>
          {(medicamento || pronto) && (
            <button onClick={reset} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              <RotateCcw size={13} /> Limpar
            </button>
          )}
        </div>

        {/* population legend */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {(['neonato', 'lactente', 'pediatrico', 'adolescente', 'adulto', 'geriatrico'] as const).map(p => (
            <span key={p} className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', corPopulacao(p))}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </span>
          ))}
        </div>

        {/* step 1 – paciente */}
        <Section step="1" title="Dados do paciente" icon={<User size={15} />}>
          <PacienteStep paciente={paciente} onChange={setPaciente} />
        </Section>

        {/* step 2 – medicamento */}
        <Section step="2" title="Medicamento e forma farmacêutica" icon={<Pill size={15} />}>
          <DrugSelector
            selected={medicamento}
            formulacaoId={formulacaoId}
            onSelectDrug={setMedicamento}
            onSelectFormulacao={setFormulacaoId}
          />
        </Section>

        {/* result */}
        {pronto && resultado && (
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-indigo-400 to-violet-400" />
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Resultado</span>
              <div className="h-px flex-1 bg-gradient-to-l from-indigo-400 to-violet-400" />
            </div>
            <ResultadoCard resultado={resultado} medicamento={medicamento!} />
          </div>
        )}

        {pronto && !resultado && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex gap-2">
            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-300">Não foi possível calcular. Verifique os dados ou selecione outra forma farmacêutica.</p>
          </div>
        )}

        {!pronto && !medicamento && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2">
            <p className="col-span-full text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Pill size={11} /> Medicamentos disponíveis
            </p>
            {MEDICAMENTOS_DOSAGEM.map(m => (
              <button
                key={m.id}
                onClick={() => { setMedicamento(m); setFormulacaoId(m.formulacoes[0]?.id ?? ''); }}
                className="text-left p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow transition-all"
              >
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{m.nome_generico}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{m.classe.split(' — ')[0]}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ step, title, icon, children }: {
  step: string; title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-[11px] font-black">
          {step}
        </div>
        <div className="text-indigo-500 dark:text-indigo-400">{icon}</div>
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </div>
  );
}
