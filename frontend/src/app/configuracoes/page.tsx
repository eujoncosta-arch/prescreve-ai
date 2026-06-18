'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/store';
import { LABORATORIOS } from '@/lib/utils';
import type { LaboratoryPreference } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Settings,
  Building2,
  User,
  Bell,
  Palette,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function Configuracoes() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({ ...state.settings });

  const save = () => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: form });
    toast.success('Configurações salvas com sucesso');
  };

  const labOptions = Object.entries(LABORATORIOS);

  return (
    <AppShell>
      <div className="p-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-600" />
            Configurações
          </h1>
          <p className="text-slate-500 text-sm mt-1">Personalize o PRESCREVE-AI para seu consultório</p>
        </div>

        <div className="space-y-6">
          {/* Dados do médico */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Dados do Médico
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-600">Nome completo</Label>
                <Input
                  className="mt-1"
                  value={form.medico.nome}
                  onChange={e => setForm(p => ({ ...p, medico: { ...p.medico, nome: e.target.value } }))}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">CRM</Label>
                <Input
                  className="mt-1"
                  value={form.medico.crm}
                  onChange={e => setForm(p => ({ ...p, medico: { ...p.medico, crm: e.target.value } }))}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Especialidade</Label>
                <Input
                  className="mt-1"
                  value={form.medico.especialidade}
                  onChange={e => setForm(p => ({ ...p, medico: { ...p.medico, especialidade: e.target.value } }))}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Telefone</Label>
                <Input
                  className="mt-1"
                  placeholder="(11) 99999-9999"
                  value={form.medico.telefone ?? ''}
                  onChange={e => setForm(p => ({ ...p, medico: { ...p.medico, telefone: e.target.value } }))}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-slate-600">Endereço do consultório</Label>
                <Input
                  className="mt-1"
                  placeholder="Rua, número, cidade - UF"
                  value={form.medico.endereco ?? ''}
                  onChange={e => setForm(p => ({ ...p, medico: { ...p.medico, endereco: e.target.value } }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preferência de laboratório */}
          <Card className="border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Preferência de Laboratório
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                O sistema recomendará a molécula e exibirá marcas deste laboratório quando disponíveis.
                A preferência comercial nunca altera a recomendação científica.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-slate-600 block mb-2">Laboratório preferido</Label>
                <Select
                  value={form.preferencia_laboratorio}
                  onValueChange={v => {
                    const val = v as LaboratoryPreference;
                    setForm(p => ({ ...p, preferencia_laboratorio: val }));
                  }}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {labOptions.map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Grid visual de laboratórios */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Ou selecione clicando:</p>
                <div className="flex flex-wrap gap-2">
                  {labOptions.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, preferencia_laboratorio: value as LaboratoryPreference }))}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                        form.preferencia_laboratorio === value
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                      }`}
                    >
                      {value === form.preferencia_laboratorio && (
                        <CheckCircle2 className="w-3 h-3 inline mr-1" />
                      )}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alertas e Notificações */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-orange-500" />
                Alertas e Exibição
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  key: 'alertas_interacao' as const,
                  label: 'Alertas de Interação Medicamentosa',
                  desc: 'Exibir avisos em tempo real ao adicionar medicamentos',
                },
                {
                  key: 'mostrar_evidencias_painel' as const,
                  label: 'Painel de Evidências',
                  desc: 'Mostrar origem científica em todas as recomendações',
                },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                  <Switch
                    checked={form[key]}
                    onCheckedChange={v => setForm(p => ({ ...p, [key]: v }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Aparência */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-500" />
                Aparência
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {(['light', 'dark', 'system'] as const).map(tema => (
                  <button
                    key={tema}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, tema }))}
                    className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium capitalize transition-all ${
                      form.tema === tema
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {tema === 'light' ? '☀️ Claro' : tema === 'dark' ? '🌙 Escuro' : '⚙️ Sistema'}
                  </button>
                ))}
              </div>
              {form.tema === 'dark' && (
                <p className="text-xs text-slate-400 mt-2">Dark mode em desenvolvimento — disponível em breve.</p>
              )}
            </CardContent>
          </Card>

          {/* Compliance */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Conformidade CFM e LGPD</p>
                  <p className="text-xs text-green-700 mt-1">
                    O PRESCREVE-AI opera em conformidade com as resoluções do Conselho Federal de Medicina (CFM)
                    e com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018). Nenhum dado clínico é
                    enviado a terceiros sem consentimento explícito.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save button */}
          <div className="flex justify-end pt-2">
            <Button onClick={save} className="bg-blue-600 hover:bg-blue-700 gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Salvar Configurações
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
