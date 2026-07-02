'use client';

import { useState, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  SCORES,
  CATEGORIAS,
  getScoresByCategoria,
  type ScoreDefinition,
  type ScoreCategoria,
  type ScoreResultado,
} from '@/lib/prognostic-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calculator,
  Info,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FlaskConical,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Cores por risco ──────────────────────────────────────────

const RISCO_CONFIG = {
  baixo:      { label: 'Baixo',      bg: 'bg-green-50',  border: 'border-green-300',  text: 'text-green-800',  dot: 'bg-green-500' },
  moderado:   { label: 'Moderado',   bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  alto:       { label: 'Alto',       bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-800', dot: 'bg-orange-500' },
  muito_alto: { label: 'Muito Alto', bg: 'bg-red-50',    border: 'border-red-300',    text: 'text-red-800',    dot: 'bg-red-500' },
};

// ─── Calculadora individual ───────────────────────────────────

function ScoreCard({ score }: { score: ScoreDefinition }) {
  const [expanded, setExpanded]   = useState(false);
  const [inputs, setInputs]       = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<(ScoreResultado & { raw: number }) | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const handleInput = useCallback((id: string, val: string) => {
    setInputs(prev => ({ ...prev, [id]: val }));
    setResultado(null);
    setError(null);
  }, []);

  const calcular = () => {
    const numericVals: Record<string, number> = {};
    for (const v of score.variaveis) {
      const raw = inputs[v.id];
      if (raw === undefined || raw === '') {
        setError(`Preencha: "${v.label}"`);
        return;
      }
      const num = parseFloat(raw);
      if (isNaN(num)) {
        setError(`Valor inválido para "${v.label}"`);
        return;
      }
      numericVals[v.id] = num;
    }
    setError(null);
    const raw = score.calcular(numericVals);
    if (raw === null) {
      setError('Não foi possível calcular. Verifique os valores.');
      return;
    }
    const res = score.interpretar(raw, numericVals);
    setResultado({ ...res, raw });
  };

  const resetar = () => {
    setInputs({});
    setResultado(null);
    setError(null);
  };

  const rc = resultado ? RISCO_CONFIG[resultado.risco] : null;

  return (
    <Card className={cn(
      'border-2 transition-all',
      expanded ? 'border-blue-200 shadow-md' : 'border-transparent hover:border-slate-200'
    )}>
      {/* Header */}
      <CardHeader
        className="pb-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
              <Calculator className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm font-bold text-slate-900">{score.sigla}</CardTitle>
                <span className="text-xs text-slate-500">{score.nome}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{score.descricao}</p>
              {resultado && rc && (
                <div className={cn('inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold', rc.bg, rc.border, rc.text)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', rc.dot)} />
                  {resultado.interpretacao}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500">
              {CATEGORIAS[score.categoria]}
            </Badge>
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-5">
          <Tabs defaultValue="calcular">
            <TabsList className="grid grid-cols-3 text-xs">
              <TabsTrigger value="calcular">Calcular</TabsTrigger>
              <TabsTrigger value="formula">Fórmula</TabsTrigger>
              <TabsTrigger value="evidencia">Diretriz</TabsTrigger>
            </TabsList>

            {/* ── Aba: Calcular ── */}
            <TabsContent value="calcular" className="mt-4 space-y-4">
              {/* Inputs */}
              <div className="grid grid-cols-2 gap-3">
                {score.variaveis.map(variavel => (
                  <div key={variavel.id} className={cn(variavel.tipo === 'select' || variavel.tipo === 'boolean' ? 'col-span-2' : '')}>
                    <Label className="text-xs font-medium text-slate-700 mb-1 block">
                      {variavel.label}
                      {variavel.unidade && <span className="text-slate-400 ml-1">({variavel.unidade})</span>}
                    </Label>
                    {variavel.tipo === 'number' ? (
                      <Input
                        type="number"
                        min={variavel.min}
                        max={variavel.max}
                        step={variavel.step}
                        placeholder={variavel.placeholder ?? `${variavel.min ?? 0}–${variavel.max ?? 999}`}
                        value={inputs[variavel.id] ?? ''}
                        onChange={e => handleInput(variavel.id, e.target.value)}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {variavel.opcoes?.map(opt => (
                          <button
                            key={opt.valor}
                            onClick={() => handleInput(variavel.id, String(opt.valor))}
                            className={cn(
                              'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                              inputs[variavel.id] === String(opt.valor)
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:text-blue-700'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Error */}
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-xs text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              {/* Buttons */}
              <div className="flex gap-2">
                <Button onClick={calcular} size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5 flex-1">
                  <Calculator className="w-3.5 h-3.5" /> Calcular
                </Button>
                {resultado && (
                  <Button onClick={resetar} size="sm" variant="outline" className="gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" /> Limpar
                  </Button>
                )}
              </div>

              {/* Resultado */}
              {resultado && rc && (
                <div className={cn('rounded-xl border-2 p-4 space-y-3', rc.border, rc.bg)}>
                  {/* Score value */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">
                        Resultado
                      </p>
                      <p className={cn('text-2xl font-black', rc.text)}>
                        {typeof resultado.pontuacao === 'number' && !Number.isInteger(resultado.pontuacao)
                          ? resultado.pontuacao.toFixed(1)
                          : resultado.pontuacao}
                        {score.id === 'imc' && <span className="text-sm font-semibold ml-1">kg/m²</span>}
                        {(score.id === 'cg' || score.id === 'ckd_epi') && <span className="text-sm font-semibold ml-1">mL/min</span>}
                      </p>
                    </div>
                    <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-semibold text-xs', rc.border, rc.text)}>
                      <span className={cn('w-2 h-2 rounded-full', rc.dot)} />
                      {rc.label}
                    </div>
                  </div>

                  {/* Interpretation */}
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{resultado.interpretacao}</p>
                    {resultado.detalhe && (
                      <p className="text-xs text-slate-600 mt-0.5">{resultado.detalhe}</p>
                    )}
                  </div>

                  {/* Conduta */}
                  <div className="p-3 bg-white/70 rounded-lg border border-white/50">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Conduta recomendada
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed">{resultado.conduta}</p>
                  </div>

                  {/* Disclaimer */}
                  <div className="flex items-start gap-1.5 pt-1">
                    <Shield className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-slate-500 italic">
                      Ferramenta de apoio à decisão clínica. Não substitui o julgamento médico individualizado.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── Aba: Fórmula ── */}
            <TabsContent value="formula" className="mt-4 space-y-3">
              <div className="p-4 bg-slate-900 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Fórmula / Critérios
                </p>
                <pre className="text-xs text-emerald-300 whitespace-pre-wrap font-mono leading-relaxed">
                  {score.formula_desc}
                </pre>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Sobre este escore
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">{score.descricao}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">Variáveis ({score.variaveis.length}):</p>
                {score.variaveis.map(v => (
                  <div key={v.id} className="flex items-start gap-2 text-xs text-slate-600">
                    <FlaskConical className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span><strong>{v.label}</strong>{v.unidade && ` (${v.unidade})`}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ── Aba: Evidência/Diretriz ── */}
            <TabsContent value="evidencia" className="mt-4 space-y-3">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="flex items-start gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900">{score.diretriz}</p>
                    <p className="text-xs text-emerald-700 mt-0.5">{score.sociedade} · {score.ano}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-1">Evidência</p>
                <p className="text-xs text-slate-600">{score.evidencia}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Referência principal
                </p>
                <p className="text-xs text-slate-600 italic">{score.referencia}</p>
              </div>

              {score.id === 'frax' && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Calculadora oficial
                  </p>
                  <p className="text-xs text-blue-700">
                    Para resultado preciso com T-score de DXA: www.sheffield.ac.uk/FRAX (selecionar Brazil)
                  </p>
                </div>
              )}

              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <AlertDescription className="text-xs text-amber-700">
                  <strong>Ferramenta de apoio à decisão clínica.</strong> Os resultados devem ser
                  interpretados no contexto clínico individual. A conduta final é de responsabilidade
                  exclusiva do médico assistente.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Página principal ─────────────────────────────────────────

const ALL_CATS = Object.keys(CATEGORIAS) as ScoreCategoria[];

export default function CalculadorasPage() {
  const [cat, setCat] = useState<ScoreCategoria | 'todos'>('todos');

  const scoresFiltrados = cat === 'todos' ? SCORES : getScoresByCategoria(cat);

  return (
    <AppShell>
      <div className="p-8 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Calculadoras Clínicas</h1>
          </div>
          <p className="text-sm text-slate-500 ml-12">
            {SCORES.length} scores validados · Fórmulas, interpretação, evidência e diretriz
          </p>
        </div>

        {/* Disclaimer banner */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
          <Shield className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            <strong>Ferramenta de apoio à decisão clínica.</strong> Scores são baseados em dados populacionais.
            Nunca substituem a avaliação clínica individualizada do médico assistente.
          </p>
        </div>

        {/* Filtro por categoria */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCat('todos')}
            className={cn(
              'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
              cat === 'todos'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700'
            )}
          >
            Todos ({SCORES.length})
          </button>
          {ALL_CATS.map(c => {
            const count = getScoresByCategoria(c).length;
            if (count === 0) return null;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                  cat === c
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700'
                )}
              >
                {CATEGORIAS[c]} ({count})
              </button>
            );
          })}
        </div>

        {/* Scores */}
        <div className="space-y-3">
          {scoresFiltrados.map(s => (
            <ScoreCard key={s.id} score={s} />
          ))}
        </div>

        {/* Footer */}
        <div className="text-center py-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            PRESCREVE-AI · Calculadoras Clínicas v1.0 · Scores baseados em diretrizes internacionais e brasileiras
          </p>
        </div>
      </div>
    </AppShell>
  );
}
