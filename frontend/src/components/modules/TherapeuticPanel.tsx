'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import { LABORATORIOS } from '@/lib/utils';
import { WhyThisRecommendation } from './WhyThisRecommendation';
import { EvidencePanel } from './EvidencePanel';
import { BrandComparator } from './BrandComparator';
import { PrognosisPanel } from './PrognosisPanel';
import { BulaViewer } from './BulaViewer';
import { PrescricaoPorMarca } from './PrescricaoPorMarca';
import { getPrognosisForDiagnosis } from '@/lib/drug-database';
import { getProductsByMolecule } from '@/lib/lab-catalog';
import type { LaboratoryPreference, TherapeuticSuggestion } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Pill,
  Activity,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  BookOpen,
  Layers,
  Award,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ALERT_COLORS = {
  info: 'border-blue-200 bg-blue-50',
  warning: 'border-yellow-200 bg-yellow-50',
  danger: 'border-orange-200 bg-orange-50',
  critical: 'border-red-200 bg-red-50',
};

const ALERT_ICONS = {
  info: 'text-blue-500',
  warning: 'text-yellow-500',
  danger: 'text-orange-500',
  critical: 'text-red-500',
};

interface TherapeuticPanelProps {
  onComplete: () => void;
}

export function TherapeuticPanel({ onComplete }: TherapeuticPanelProps) {
  const { state, dispatch } = useApp();
  const plano = state.activeConsultation?.plano_terapeutico;
  const seguranca = state.activeConsultation?.seguranca;
  const globalLabPref = state.settings.preferencia_laboratorio;
  const [labPref, setLabPref] = useState<LaboratoryPreference>(globalLabPref);
  const [expanded, setExpanded] = useState<string | null>(
    plano?.farmacologico[0]?.id ?? 'enalapril'
  );
  const [loading, setLoading] = useState(false);

  if (!plano) return null;

  // Motor de prognóstico — extrai CID-10 do diagnóstico selecionado
  const cid10Match = plano.diagnostico_selecionado?.match(/\(([A-Z]\d+[.\d]*)\)/);
  const cid10 = cid10Match?.[1] ?? '';
  const prognosisData = cid10 ? getPrognosisForDiagnosis(cid10) : null;

  const handleProceed = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    dispatch({ type: 'UPDATE_THERAPEUTIC', payload: { ...plano, preferencia_laboratorio: labPref } });
    setLoading(false);
    toast.success('Plano terapêutico validado! Gerando prescrição...');
    onComplete();
  };

  const getMarcasByLab = (marcas: typeof plano.farmacologico[0]['marcas']) => {
    if (!marcas || labPref === 'sem_preferencia') return marcas ?? [];
    return marcas.filter(m => m.laboratorio.toLowerCase() === LABORATORIOS[labPref]?.toLowerCase());
  };

  return (
    <div className="space-y-4">
      {/* Diagnóstico selecionado */}
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
        <div>
          <p className="text-xs text-green-700">Diagnóstico selecionado pelo médico:</p>
          <p className="text-sm font-semibold text-green-800">{plano.diagnostico_selecionado}</p>
        </div>
      </div>

      {/* Pipeline de raciocínio terapêutico */}
      {plano.farmacologico.length > 0 && (
        <TherapyPipeline
          diagnosis={plano.diagnostico_selecionado}
          med={plano.farmacologico[0]}
          totalMeds={plano.farmacologico.length}
        />
      )}

      {/* Alertas de segurança */}
      {seguranca && seguranca.alertas.length > 0 && (
        <div className="space-y-2">
          {seguranca.alertas.map(alert => (
            <div
              key={alert.id}
              className={`flex items-start gap-2 p-3 rounded-lg border ${ALERT_COLORS[alert.severidade]}`}
            >
              <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${ALERT_ICONS[alert.severidade]}`} />
              <div>
                <p className="text-xs font-semibold text-slate-800">{alert.titulo}</p>
                <p className="text-xs text-slate-600 mt-0.5">{alert.descricao}</p>
                <p className="text-xs font-medium text-slate-700 mt-1">
                  → {alert.recomendacao}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Motor de Prognóstico — Atualização 4 */}
      {prognosisData && (
        <PrognosisPanel data={prognosisData} />
      )}

      <Tabs defaultValue="farmacologico">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="farmacologico" className="text-xs">Farmacológico</TabsTrigger>
          <TabsTrigger value="nao_farmacologico" className="text-xs">Não Farmacológico</TabsTrigger>
          <TabsTrigger value="seguimento" className="text-xs">Seguimento</TabsTrigger>
          <TabsTrigger value="laboratorio_pref" className="text-xs">Preferência Lab.</TabsTrigger>
        </TabsList>

        {/* ABA — Tratamento Farmacológico */}
        <TabsContent value="farmacologico" className="space-y-4 mt-4">
          {plano.farmacologico.map(med => {
            const marcasFiltradas = getMarcasByLab(med.marcas);
            const isOpen = expanded === med.id;
            return (
              <Card key={med.id} className="border-2 border-slate-100">
                <CardHeader
                  className="pb-2 cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : med.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Pill className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{med.molecula}</p>
                        <p className="text-xs text-slate-500">{med.classe_terapeutica}</p>
                        <div className="mt-1"><WhyThisRecommendation med={med} /></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        Nível {med.evidencia.nivel_evidencia.nivel} • Grau {med.evidencia.nivel_evidencia.grau}
                      </span>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>
                </CardHeader>

                {isOpen && (
                  <CardContent className="space-y-4">
                    {/* Cadeia de raciocínio por molécula */}
                    <MoleculePipeline med={med} />

                    {/* Posologia */}
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs font-semibold text-blue-800 mb-1">Posologia</p>
                      <p className="text-sm font-medium text-blue-900">{med.posologia_completa}</p>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {[
                          { label: 'Dose', value: `${med.dose.dose_padrao} ${med.dose.unidade}` },
                          { label: 'Via', value: med.dose.via },
                          { label: 'Frequência', value: med.dose.frequencia },
                          { label: 'Duração', value: med.dose.duracao ?? 'Conforme resposta' },
                        ].map(({ label, value }) => (
                          <div key={label} className="text-center">
                            <p className="text-xs text-blue-600">{label}</p>
                            <p className="text-xs font-semibold text-blue-900">{value}</p>
                          </div>
                        ))}
                      </div>
                      {(med.dose.ajuste_renal || med.dose.ajuste_hepatico) && (
                        <div className="mt-2 pt-2 border-t border-blue-200 space-y-1">
                          {med.dose.ajuste_renal && (
                            <p className="text-xs text-blue-700">
                              <strong>Ajuste Renal:</strong> {med.dose.ajuste_renal}
                            </p>
                          )}
                          {med.dose.ajuste_hepatico && (
                            <p className="text-xs text-blue-700">
                              <strong>Ajuste Hepático:</strong> {med.dose.ajuste_hepatico}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Contraindicações */}
                      <div>
                        <p className="text-xs font-semibold text-red-700 mb-2">Contraindicações</p>
                        <ul className="space-y-1">
                          {med.contraindicacoes.map((c, i) => (
                            <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                              <span className="text-red-400">•</span> {c}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Efeitos adversos */}
                      <div>
                        <p className="text-xs font-semibold text-orange-700 mb-2">Efeitos Adversos</p>
                        <ul className="space-y-1">
                          {med.efeitos_adversos.map((e, i) => (
                            <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                              <span className="text-orange-400">•</span> {e}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Monitoramento */}
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                        <Activity className="w-3 h-3" /> Monitoramento
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {med.monitoramento.map((m, i) => (
                          <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Painel de Evidências — Atualização 1 */}
                    <EvidencePanel evidencia={med.evidencia} />

                    {/* Bula contextual — Atualização 11 */}
                    {(() => {
                      const euroProducts = getProductsByMolecule(med.molecula, 'eurofarma');
                      if (euroProducts.length === 0) return null;
                      return (
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                          <span className="text-xs text-slate-400">Bula Eurofarma:</span>
                          {euroProducts.map(p => (
                            <BulaViewer key={p.id} produtoId={p.id} trigger={p.nome_comercial} />
                          ))}
                        </div>
                      );
                    })()}

                    {/* Prescrição por marca — Atualização 12 */}
                    <PrescricaoPorMarca
                      med={{
                        molecula: med.molecula,
                        classe_terapeutica: med.classe_terapeutica,
                        evidencia: {
                          fonte: med.evidencia.diretriz ?? med.evidencia.sociedade,
                          nivel: med.evidencia.nivel_evidencia.nivel,
                          grau: med.evidencia.nivel_evidencia.grau,
                        },
                      }}
                      onChoice={() => {}}
                    />

                    {/* Comparador de marcas + preferência — Atualização 7 */}
                    {med.marcas && med.marcas.length > 0 && (
                      <div className="flex items-center justify-between pt-1">
                        <BrandComparator
                          molecula={med.molecula}
                          marcas={med.marcas}
                          preferencia={labPref}
                        />
                        {marcasFiltradas.length > 0 && labPref !== 'sem_preferencia' && (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span className="text-xs text-slate-600 font-medium">
                              {LABORATORIOS[labPref]}: {marcasFiltradas[0]?.nome_comercial}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </TabsContent>

        {/* ABA — Não farmacológico */}
        <TabsContent value="nao_farmacologico" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Medidas Não Farmacológicas</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plano.nao_farmacologico.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {m}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA — Seguimento */}
        <TabsContent value="seguimento" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Seguimento e Retorno</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700">{plano.seguimento}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Monitorização</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plano.monitorizacao.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <Activity className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    {m}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {plano.encaminhamento && (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="pt-4">
                <p className="text-xs font-semibold text-purple-800 mb-1">Encaminhamento</p>
                <p className="text-sm text-purple-700">{plano.encaminhamento}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ABA — Preferência de Laboratório */}
        <TabsContent value="laboratorio_pref" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Preferência de Laboratório
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription className="text-xs text-blue-700">
                  A recomendação científica é sempre pela <strong>molécula e classe terapêutica</strong>.
                  A preferência de laboratório é apenas uma informação comercial complementar e não altera
                  a indicação clínica.
                </AlertDescription>
              </Alert>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Selecione o laboratório de preferência:
                </label>
                <Select value={labPref} onValueChange={v => setLabPref(v as LaboratoryPreference)}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LABORATORIOS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {labPref !== 'sem_preferencia' && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">
                    As marcas do laboratório <strong>{LABORATORIOS[labPref]}</strong> serão exibidas
                    na aba "Farmacológico" para cada medicamento quando disponíveis.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Avançar */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleProceed}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Preparando prescrição...</>
          ) : (
            <><ArrowRight className="w-4 h-4" /> Avançar para Prescrição</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Pipeline geral — topo do painel ─────────────────────────

const PIPE_COLORS: Record<string, string> = {
  blue:    'bg-blue-50 border-blue-200 text-blue-700',
  green:   'bg-green-50 border-green-200 text-green-700',
  purple:  'bg-purple-50 border-purple-200 text-purple-700',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  amber:   'bg-amber-50 border-amber-200 text-amber-700',
  slate:   'bg-slate-50 border-slate-200 text-slate-500',
};

function PipeStep({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: keyof typeof PIPE_COLORS;
}) {
  return (
    <div className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs', PIPE_COLORS[color])}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-widest opacity-60 font-semibold leading-none">{label}</p>
        <p className="font-semibold truncate max-w-[120px] leading-tight mt-0.5" title={value}>{value}</p>
      </div>
    </div>
  );
}

function PipeSep() {
  return <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />;
}

function TherapyPipeline({
  diagnosis,
  med,
  totalMeds,
}: {
  diagnosis: string;
  med: TherapeuticSuggestion;
  totalMeds: number;
}) {
  const diagName = diagnosis?.replace(/\s*\([^)]*\)\s*$/, '') ?? '';

  return (
    <div className="rounded-lg border border-violet-100 bg-violet-50 p-3">
      <p className="text-[9px] font-bold text-violet-600 uppercase tracking-widest mb-2">
        Cadeia de Raciocínio Terapêutico
      </p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <PipeStep icon={Stethoscope} label="Diagnóstico"  value={diagName}                                            color="blue"    />
        <PipeSep />
        <PipeStep icon={BookOpen}    label="Diretriz"     value={`${med.evidencia.sociedade} ${med.evidencia.ano}`}  color="green"   />
        <PipeSep />
        <PipeStep icon={Layers}      label="Classe 1ª L." value={med.classe_terapeutica}                             color="purple"  />
        <PipeSep />
        <PipeStep icon={Pill}        label="Molécula"     value={totalMeds > 1 ? `${med.molecula} +${totalMeds - 1}` : med.molecula} color="emerald" />
        <PipeSep />
        <PipeStep icon={Award}       label="Evidência"    value={`Nível ${med.evidencia.nivel_evidencia.nivel} · Grau ${med.evidencia.nivel_evidencia.grau}`} color="amber" />
        <PipeSep />
        <PipeStep icon={Building2}   label="Marca"        value="Opcional"                                           color="slate"   />
      </div>
    </div>
  );
}

// ─── Pipeline por molécula — dentro do card expandido ────────

function MoleculePipeline({ med }: { med: TherapeuticSuggestion }) {
  return (
    <div className="flex items-center gap-1 flex-wrap p-2.5 bg-slate-50 rounded-lg border border-slate-100">
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mr-1 flex-shrink-0">
        Cadeia:
      </span>
      <ChainTag label={med.evidencia.diretriz} color="text-green-700 bg-green-50" />
      <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
      <ChainTag label={med.classe_terapeutica} color="text-purple-700 bg-purple-50" />
      <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
      <ChainTag label={med.molecula} color="text-blue-700 bg-blue-50 font-bold" />
      <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
      <ChainTag
        label={`Evidência ${med.evidencia.nivel_evidencia.nivel} / Grau ${med.evidencia.nivel_evidencia.grau}`}
        color="text-emerald-700 bg-emerald-50"
      />
    </div>
  );
}

function ChainTag({ label, color }: { label: string; color: string }) {
  return (
    <span className={cn('text-[10px] px-2 py-0.5 rounded-full', color)}>
      {label}
    </span>
  );
}
