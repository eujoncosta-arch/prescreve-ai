'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import { calcIMC, classifyIMC } from '@/lib/utils';
import type { Anamnesis } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { analyzeClinical } from '@/lib/clinical-decision-support';

const COMORBIDADES_COMUNS = [
  'Hipertensão Arterial', 'Diabetes Mellitus Tipo 2', 'Dislipidemia', 'Obesidade',
  'Insuficiência Cardíaca', 'Doença Arterial Coronariana', 'DPOC', 'Asma',
  'Hipotireoidismo', 'Doença Renal Crônica', 'Hepatopatia',
];

interface AnamneseFormProps {
  consultationId: string;
  onComplete: () => void;
}

export function AnamneseForm({ consultationId, onComplete }: AnamneseFormProps) {
  const { dispatch } = useApp();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('queixa');

  const [form, setForm] = useState<Anamnesis>({
    queixa_principal: '',
    hda: '',
    hpp: '',
    historia_familiar: '',
    habitos_vida: {},
    exame_fisico: '',
    sinais_vitais: {},
    laboratorio: {},
    imagem: '',
    comorbidades: [],
    medicamentos_em_uso: [],
    alergias: [],
    gestante: false,
    lactante: false,
    funcao_renal: {},
    funcao_hepatica: {},
  });

  const imc = form.peso && form.altura ? calcIMC(form.peso, form.altura) : null;

  const set = (field: keyof Anamnesis, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const setVital = (field: string, value: string) =>
    setForm(prev => ({
      ...prev,
      sinais_vitais: { ...prev.sinais_vitais, [field]: value ? Number(value) : undefined },
    }));

  const setLab = (field: string, value: string) =>
    setForm(prev => ({ ...prev, laboratorio: { ...prev.laboratorio, [field]: value } }));

  const setRenal = (field: string, value: string) =>
    setForm(prev => ({
      ...prev,
      funcao_renal: { ...prev.funcao_renal, [field]: value ? Number(value) : undefined },
    }));

  const setHepatica = (field: string, value: string) =>
    setForm(prev => ({
      ...prev,
      funcao_hepatica: { ...prev.funcao_hepatica, [field]: value ? Number(value) : undefined },
    }));

  const toggleComorbidade = (c: string) => {
    setForm(prev => ({
      ...prev,
      comorbidades: prev.comorbidades.includes(c)
        ? prev.comorbidades.filter(x => x !== c)
        : [...prev.comorbidades, c],
    }));
  };

  const addMedicamento = () => {
    setForm(prev => ({
      ...prev,
      medicamentos_em_uso: [
        ...prev.medicamentos_em_uso,
        { id: Date.now().toString(), nome: '', em_uso: true },
      ],
    }));
  };

  const updateMedicamento = (id: string, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      medicamentos_em_uso: prev.medicamentos_em_uso.map(m =>
        m.id === id ? { ...m, [field]: value } : m
      ),
    }));
  };

  const removeMedicamento = (id: string) => {
    setForm(prev => ({
      ...prev,
      medicamentos_em_uso: prev.medicamentos_em_uso.filter(m => m.id !== id),
    }));
  };

  const addAlergia = () => {
    setForm(prev => ({
      ...prev,
      alergias: [
        ...prev.alergias,
        { id: Date.now().toString(), substancia: '', tipo: 'medicamento' as const },
      ],
    }));
  };

  const removeAlergia = (id: string) => {
    setForm(prev => ({ ...prev, alergias: prev.alergias.filter(a => a.id !== id) }));
  };

  const updateAlergia = (id: string, field: string, value: string | null) => {
    if (value === null) return;
    setForm(prev => ({
      ...prev,
      alergias: prev.alergias.map(a => (a.id === id ? { ...a, [field]: value } : a)),
    }));
  };

  const handleSubmit = async () => {
    if (!form.queixa_principal.trim()) {
      toast.error('Queixa principal é obrigatória');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500)); // Simula processamento IA

    const anamnese: Anamnesis = {
      ...form,
      imc: imc ?? undefined,
      created_at: new Date().toISOString(),
    };

    dispatch({ type: 'UPDATE_ANAMNESIS', payload: anamnese });
    if (typeof window !== 'undefined') {
      localStorage.setItem('prescreve_ai_anamnese', JSON.stringify(anamnese));
    }
    const apoioClinico = analyzeClinical(anamnese);
    dispatch({ type: 'UPDATE_DIAGNOSTIC', payload: apoioClinico });
    setLoading(false);
    toast.success('Anamnese registrada! IA analisando dados clínicos...');
    onComplete();
  };

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="queixa" className="text-xs">Queixa</TabsTrigger>
          <TabsTrigger value="vitais" className="text-xs">Sinais Vitais</TabsTrigger>
          <TabsTrigger value="laboratorio" className="text-xs">Laboratório</TabsTrigger>
          <TabsTrigger value="antecedentes" className="text-xs">Antecedentes</TabsTrigger>
          <TabsTrigger value="medicamentos" className="text-xs">Medicamentos</TabsTrigger>
          <TabsTrigger value="alergias" className="text-xs">Alergias</TabsTrigger>
        </TabsList>

        {/* ABA 1 — Queixa & HDA */}
        <TabsContent value="queixa" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Queixa Principal e HDA</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-slate-700">Queixa Principal *</Label>
                <Input
                  className="mt-1"
                  placeholder="Ex: Cefaleia há 3 dias, PA elevada..."
                  value={form.queixa_principal}
                  onChange={e => set('queixa_principal', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700">História da Doença Atual (HDA)</Label>
                <Textarea
                  className="mt-1 min-h-[100px]"
                  placeholder="Descreva o início, duração, características, fatores de melhora e piora..."
                  value={form.hda}
                  onChange={e => set('hda', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700">Exame Físico</Label>
                <Textarea
                  className="mt-1 min-h-[80px]"
                  placeholder="Descreva o exame físico geral e específico..."
                  value={form.exame_fisico}
                  onChange={e => set('exame_fisico', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700">Exames de Imagem</Label>
                <Textarea
                  className="mt-1"
                  placeholder="Resultados de Rx, TC, RNM, ECO..."
                  value={form.imagem}
                  onChange={e => set('imagem', e.target.value)}
                />
              </div>

              {/* Gestação / Lactação */}
              <div className="flex gap-8 pt-2">
                <div className="flex items-center gap-2">
                  <Switch checked={form.gestante} onCheckedChange={v => set('gestante', v)} />
                  <Label className="text-sm">Gestante</Label>
                  {form.gestante && (
                    <Badge variant="destructive" className="text-xs ml-1">GESTANTE</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.lactante} onCheckedChange={v => set('lactante', v)} />
                  <Label className="text-sm">Lactante</Label>
                  {form.lactante && (
                    <Badge variant="destructive" className="text-xs ml-1">LACTANTE</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 2 — Sinais Vitais & Antropometria */}
        <TabsContent value="vitais" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Sinais Vitais</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-4 gap-4">
              {[
                { label: 'PA Sistólica (mmHg)', key: 'pa_sistolica', placeholder: '120' },
                { label: 'PA Diastólica (mmHg)', key: 'pa_diastolica', placeholder: '80' },
                { label: 'FC (bpm)', key: 'fc', placeholder: '72' },
                { label: 'FR (irpm)', key: 'fr', placeholder: '16' },
                { label: 'Temperatura (°C)', key: 'temperatura', placeholder: '36.5' },
                { label: 'SpO2 (%)', key: 'spo2', placeholder: '98' },
                { label: 'Glasgow', key: 'glasgow', placeholder: '15' },
                { label: 'Dor (0-10)', key: 'dor', placeholder: '0' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <Label className="text-xs text-slate-600">{label}</Label>
                  <Input
                    type="number"
                    className="mt-1"
                    placeholder={placeholder}
                    value={(form.sinais_vitais as Record<string, number>)[key] ?? ''}
                    onChange={e => setVital(key, e.target.value)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Antropometria</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-slate-600">Peso (kg)</Label>
                <Input
                  type="number"
                  className="mt-1"
                  placeholder="70"
                  value={form.peso ?? ''}
                  onChange={e => set('peso', e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Altura (m)</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="mt-1"
                  placeholder="1.70"
                  value={form.altura ?? ''}
                  onChange={e => set('altura', e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">IMC (calculado)</Label>
                <div className="mt-1 h-9 px-3 border rounded-md bg-slate-50 flex items-center text-sm text-slate-700">
                  {imc ? `${imc} kg/m²` : '—'}
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-600">Classificação IMC</Label>
                <div className="mt-1 h-9 px-3 border rounded-md bg-slate-50 flex items-center text-xs text-slate-600">
                  {imc ? classifyIMC(imc) : '—'}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 3 — Laboratório */}
        <TabsContent value="laboratorio" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Exames Laboratoriais</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-4 gap-4">
              {[
                { label: 'Glicemia Jejum (mg/dL)', key: 'glicemia' },
                { label: 'HbA1c (%)', key: 'hba1c' },
                { label: 'Colesterol Total (mg/dL)', key: 'col_total' },
                { label: 'LDL (mg/dL)', key: 'ldl' },
                { label: 'HDL (mg/dL)', key: 'hdl' },
                { label: 'Triglicerídeos (mg/dL)', key: 'tg' },
                { label: 'Hemoglobina (g/dL)', key: 'hb' },
                { label: 'Leucócitos (mil/mm³)', key: 'leuco' },
                { label: 'Plaquetas (mil/mm³)', key: 'plaquetas' },
                { label: 'PCR (mg/L)', key: 'pcr' },
                { label: 'TSH (mUI/L)', key: 'tsh' },
                { label: 'T4 Livre (ng/dL)', key: 't4l' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <Label className="text-xs text-slate-600">{label}</Label>
                  <Input
                    className="mt-1"
                    placeholder="—"
                    value={form.laboratorio[key] ?? ''}
                    onChange={e => setLab(key, e.target.value)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Função Renal</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-4 gap-4">
              {[
                { label: 'Creatinina (mg/dL)', key: 'creatinina' },
                { label: 'Ureia (mg/dL)', key: 'ureia' },
                { label: 'TFG (mL/min/1,73m²)', key: 'tfg' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <Label className="text-xs text-slate-600">{label}</Label>
                  <Input
                    type="number"
                    className="mt-1"
                    placeholder="—"
                    value={(form.funcao_renal as Record<string, number>)[key] ?? ''}
                    onChange={e => setRenal(key, e.target.value)}
                  />
                </div>
              ))}
              <div>
                <Label className="text-xs text-slate-600">Estágio DRC</Label>
                <Select
                  value={form.funcao_renal.ckd_stage ?? ''}
                  onValueChange={v => setForm(prev => ({ ...prev, funcao_renal: { ...prev.funcao_renal, ckd_stage: v as never } }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {['G1', 'G2', 'G3a', 'G3b', 'G4', 'G5'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Função Hepática</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-4 gap-4">
              {[
                { label: 'TGO / AST (U/L)', key: 'tgo' },
                { label: 'TGP / ALT (U/L)', key: 'tgp' },
                { label: 'Bilirrubina Total (mg/dL)', key: 'bilirrubina_total' },
                { label: 'Albumina (g/dL)', key: 'albumina' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <Label className="text-xs text-slate-600">{label}</Label>
                  <Input
                    type="number"
                    className="mt-1"
                    placeholder="—"
                    value={(form.funcao_hepatica as Record<string, number>)[key] ?? ''}
                    onChange={e => setHepatica(key, e.target.value)}
                  />
                </div>
              ))}
              <div>
                <Label className="text-xs text-slate-600">Child-Pugh</Label>
                <Select
                  value={form.funcao_hepatica.child_pugh ?? ''}
                  onValueChange={v => setForm(prev => ({ ...prev, funcao_hepatica: { ...prev.funcao_hepatica, child_pugh: v as never } }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {['A', 'B', 'C'].map(s => (
                      <SelectItem key={s} value={s}>Child-Pugh {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 4 — Antecedentes */}
        <TabsContent value="antecedentes" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">História Patológica Pregressa</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-slate-700">HPP</Label>
                <Textarea
                  className="mt-1"
                  placeholder="Cirurgias, internações, doenças pregressas..."
                  value={form.hpp}
                  onChange={e => set('hpp', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700">História Familiar</Label>
                <Textarea
                  className="mt-1"
                  placeholder="HAS, DM, doenças cardíacas, câncer em familiares de 1º grau..."
                  value={form.historia_familiar}
                  onChange={e => set('historia_familiar', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700 mb-2 block">Comorbidades</Label>
                <div className="flex flex-wrap gap-2">
                  {COMORBIDADES_COMUNS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleComorbidade(c)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        form.comorbidades.includes(c)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Hábitos de Vida</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-600">Tabagismo</Label>
                <Select
                  value={form.habitos_vida.tabagismo ?? ''}
                  onValueChange={v => setForm(prev => ({ ...prev, habitos_vida: { ...prev.habitos_vida, tabagismo: v as never } }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nunca">Nunca fumou</SelectItem>
                    <SelectItem value="ex">Ex-tabagista</SelectItem>
                    <SelectItem value="sim">Tabagista ativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-600">Etilismo</Label>
                <Select
                  value={form.habitos_vida.etilismo ?? ''}
                  onValueChange={v => setForm(prev => ({ ...prev, habitos_vida: { ...prev.habitos_vida, etilismo: v as never } }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao">Não etilista</SelectItem>
                    <SelectItem value="social">Uso social</SelectItem>
                    <SelectItem value="abusivo">Uso abusivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-600">Atividade Física</Label>
                <Select
                  value={form.habitos_vida.atividade_fisica ?? ''}
                  onValueChange={v => setForm(prev => ({ ...prev, habitos_vida: { ...prev.habitos_vida, atividade_fisica: v as never } }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentario">Sedentário</SelectItem>
                    <SelectItem value="leve">Leve (1-2x/semana)</SelectItem>
                    <SelectItem value="moderado">Moderado (3-5x/semana)</SelectItem>
                    <SelectItem value="intenso">Intenso (6-7x/semana)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 5 — Medicamentos */}
        <TabsContent value="medicamentos" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Medicamentos em Uso</CardTitle>
              <Button variant="outline" size="sm" onClick={addMedicamento} className="gap-1 text-xs">
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.medicamentos_em_uso.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Nenhum medicamento cadastrado</p>
              )}
              {form.medicamentos_em_uso.map(med => (
                <div key={med.id} className="grid grid-cols-5 gap-2 items-center">
                  <Input
                    placeholder="Medicamento"
                    value={med.nome}
                    onChange={e => updateMedicamento(med.id, 'nome', e.target.value)}
                    className="col-span-2 text-xs"
                  />
                  <Input
                    placeholder="Dose"
                    value={med.dose ?? ''}
                    onChange={e => updateMedicamento(med.id, 'dose', e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    placeholder="Frequência"
                    value={med.frequencia ?? ''}
                    onChange={e => updateMedicamento(med.id, 'frequencia', e.target.value)}
                    className="text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMedicamento(med.id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 6 — Alergias */}
        <TabsContent value="alergias" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Alergias e Reações Adversas</CardTitle>
              <Button variant="outline" size="sm" onClick={addAlergia} className="gap-1 text-xs">
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.alergias.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Nenhuma alergia registrada</p>
              )}
              {form.alergias.map(al => (
                <div key={al.id} className="grid grid-cols-5 gap-2 items-center">
                  <Input
                    placeholder="Substância / Medicamento"
                    value={al.substancia}
                    onChange={e => updateAlergia(al.id, 'substancia', e.target.value)}
                    className="col-span-2 text-xs"
                  />
                  <Select
                    value={al.tipo}
                    onValueChange={v => updateAlergia(al.id, 'tipo', v)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="medicamento">Medicamento</SelectItem>
                      <SelectItem value="alimento">Alimento</SelectItem>
                      <SelectItem value="ambiental">Ambiental</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={al.gravidade ?? ''}
                    onValueChange={v => updateAlergia(al.id, 'gravidade', v)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Gravidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leve">Leve</SelectItem>
                      <SelectItem value="moderada">Moderada</SelectItem>
                      <SelectItem value="grave">Grave</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAlergia(al.id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}

              {form.gestante && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg mt-4">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <p className="text-xs text-red-700 font-medium">
                    Paciente GESTANTE — Todas as prescrições serão validadas quanto à segurança na gravidez
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Submit */}
      <div className="flex justify-between items-center pt-2">
        <p className="text-xs text-slate-400">
          * Os campos marcados são obrigatórios. Os dados serão processados pela IA clínica.
        </p>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Processando IA...</>
          ) : (
            <><CheckCircle className="w-4 h-4" /> Concluir Anamnese</>
          )}
        </Button>
      </div>
    </div>
  );
}
