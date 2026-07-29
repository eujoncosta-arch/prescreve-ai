'use client';

import { useState, useRef } from 'react';
import { useApp } from '@/lib/store';
import type { Prescription, PrescriptionItem } from '@/lib/types';
import { mapFrequenciaParaContrato, mapUnidadeParaContrato } from '@/lib/dose-calculator';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Printer,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  CloudOff,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

interface PrescriptionPanelProps {
  onComplete: () => void;
}

/**
 * Estado REAL de persistência da prescrição no backend — nunca inferido do
 * estado local. Enquanto não houver confirmação do servidor, a prescrição
 * NÃO deve ser tratada pelo médico como "emitida"/persistida.
 */
function PrescriptionSyncBadge() {
  const { state, auth, retrySync } = useApp();
  const consultaId = state.activeConsultation?.id;
  const sync = state.activeConsultation?.sync?.prescricao;

  if (!auth.backendMode) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <CloudOff className="w-3.5 h-3.5" />
        {auth.demoMode
          ? 'MODO DEMONSTRAÇÃO — esta prescrição é simulada e nunca é enviada a um servidor real'
          : 'Modo local — backend não configurado; prescrição salva apenas neste dispositivo'}
      </div>
    );
  }
  if (!sync || sync.status === 'local') return null;

  if (sync.status === 'syncing') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-600">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Sincronizando com o servidor{sync.attempts > 1 ? ` (tentativa ${sync.attempts})` : ''}...
      </div>
    );
  }
  if (sync.status === 'synced') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600">
        <Cloud className="w-3.5 h-3.5" />
        Prescrição confirmada no servidor
      </div>
    );
  }
  // failed — NUNCA sugerir que foi salva no servidor.
  return (
    <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span>
        Falha ao sincronizar com o servidor — a prescrição existe SÓ neste
        dispositivo até a sincronização ter sucesso.
        {sync.error ? ` (${sync.error})` : ''}
      </span>
      <button
        type="button"
        onClick={() => consultaId && void retrySync(consultaId)}
        className="ml-auto shrink-0 flex items-center gap-1 font-medium underline hover:no-underline"
      >
        <RefreshCw className="w-3 h-3" /> Tentar novamente
      </button>
    </div>
  );
}

export function PrescriptionPanel({ onComplete }: PrescriptionPanelProps) {
  const { state, dispatch } = useApp();
  const plano = state.activeConsultation?.plano_terapeutico;
  const printRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [, setPrinted] = useState(false);

  const [prescricao, setPrescricao] = useState<Prescription>(() => {
    const itens: PrescriptionItem[] = (plano?.farmacologico ?? []).map(m => {
      // RM-36: deriva a dose ESTRUTURADA (fonte de verdade para
      // persistência) a partir da recomendação, quando o valor/unidade
      // forem inequívocos. `dose.dose_padrao`/`dose.unidade` do motor de
      // recomendação ainda são texto livre em alguns casos (ex.:
      // "mg/kg/min" descrevendo um regime de infusão, não uma unidade
      // simples) — nesses casos `mapUnidadeParaContrato` retorna `null`
      // deliberadamente, e a dose estruturada fica indefinida em vez de
      // adivinhada; o item precisa de confirmação manual do médico antes
      // de poder ser sincronizado (ver `store.tsx`).
      const valorNumerico = parseFloat(m.dose.dose_padrao.replace(',', '.'));
      const unidadeEstruturada = mapUnidadeParaContrato(m.dose.unidade);
      const doseEstruturada = Number.isFinite(valorNumerico) && valorNumerico > 0 && unidadeEstruturada
        ? {
            valor: valorNumerico,
            unidade: unidadeEstruturada,
            via: m.dose.via,
            ...mapFrequenciaParaContrato(m.dose.frequencia),
          }
        : undefined;

      return {
        id: m.id,
        medicamento: m.molecula,
        concentracao: `${m.dose.dose_padrao} ${m.dose.unidade}`,
        forma_farmaceutica: 'Comprimido',
        quantidade: '30 comprimidos',
        posologia: m.posologia_completa,
        via: m.dose.via,
        duracao: m.dose.duracao ?? 'Uso contínuo',
        uso_continuo: m.dose.duracao === 'Contínuo',
        dose_estruturada: doseEstruturada,
      };
    });

    return {
      tipo: 'simples',
      paciente: { nome: state.activeConsultation?.paciente_nome ?? '' },
      medico: { nome: 'Dr. João Silva', crm: 'CRM-SP 123456', especialidade: 'Clínica Médica' },
      itens,
      orientacoes_gerais:
        'Retornar ao consultório conforme agendado. Em caso de reação adversa, suspender o medicamento e procurar atendimento médico.',
      retorno: '4 semanas',
      data_emissao: new Date().toISOString(),
      diagnostico: plano?.diagnostico_selecionado,
    };
  });

  const updateItem = (id: string, field: string, value: string | boolean | null) => {
    if (value === null) return;
    setPrescricao(prev => ({
      ...prev,
      itens: prev.itens.map(item => item.id === id ? { ...item, [field]: value } : item),
    }));
  };

  const addItem = () => {
    setPrescricao(prev => ({
      ...prev,
      itens: [
        ...prev.itens,
        {
          id: Date.now().toString(),
          medicamento: '',
          concentracao: '',
          forma_farmaceutica: 'Comprimido',
          quantidade: '',
          posologia: '',
          via: 'Oral',
          duracao: '',
          uso_continuo: false,
        },
      ],
    }));
  };

  const removeItem = (id: string) => {
    setPrescricao(prev => ({ ...prev, itens: prev.itens.filter(i => i.id !== id) }));
  };

  const handlePrint = () => {
    window.print();
    setPrinted(true);
  };

  const handleFinalize = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    dispatch({ type: 'UPDATE_PRESCRIPTION', payload: { ...prescricao, id: Date.now().toString() } });
    setLoading(false);
    // Honesto quanto ao estado real: o dado só está confirmado localmente
    // neste momento. A sincronização com o backend acontece em seguida
    // (ver AppProvider.sincronizarConsulta) — o resultado real (sucesso ou
    // falha) é refletido pelo <PrescriptionSyncBadge> acima, nunca por este
    // toast, que não pode prometer persistência no servidor.
    toast.success('Prescrição registrada. Sincronizando com o servidor...');
    onComplete();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-semibold text-slate-900">Prescrição Digital</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 text-xs">
            <Printer className="w-3 h-3" /> Imprimir
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-xs">
            <Download className="w-3 h-3" /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* Tipo de receita */}
      <div className="flex gap-2">
        {[
          { value: 'simples', label: 'Receita Simples', color: 'bg-blue-100 text-blue-700' },
          { value: 'especial_branca', label: 'Especial Branca', color: 'bg-slate-100 text-slate-700' },
          { value: 'especial_amarela', label: 'Especial Amarela', color: 'bg-yellow-100 text-yellow-700' },
          { value: 'especial_azul', label: 'Especial Azul', color: 'bg-blue-50 text-blue-600' },
        ].map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => setPrescricao(prev => ({ ...prev, tipo: t.value as Prescription['tipo'] }))}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
              prescricao.tipo === t.value
                ? `${t.color} border-current ring-2 ring-offset-1 ring-blue-400`
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Preview / Edição da receita */}
      <div ref={printRef}>
        <Card className="border-2 border-slate-200">
          <CardContent className="pt-6 space-y-6">
            {/* Cabeçalho da receita */}
            <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
              <div>
                <p className="font-bold text-lg text-slate-900">{prescricao.medico.nome}</p>
                <p className="text-sm text-slate-600">{prescricao.medico.especialidade}</p>
                <p className="text-sm text-slate-600">{prescricao.medico.crm}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700">PRESCRIÇÃO MÉDICA</p>
                {prescricao.tipo !== 'simples' && (
                  <Badge variant="outline" className="text-xs mt-1">
                    {prescricao.tipo.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}
                <p className="text-xs text-slate-500 mt-1">{formatDate(prescricao.data_emissao)}</p>
              </div>
            </div>

            {/* Dados do paciente */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-500">Paciente</Label>
                <Input
                  className="mt-1"
                  value={prescricao.paciente.nome}
                  onChange={e => setPrescricao(prev => ({
                    ...prev,
                    paciente: { ...prev.paciente, nome: e.target.value },
                  }))}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Data de Nascimento</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={prescricao.paciente.data_nascimento ?? ''}
                  onChange={e => setPrescricao(prev => ({
                    ...prev,
                    paciente: { ...prev.paciente, data_nascimento: e.target.value },
                  }))}
                />
              </div>
            </div>

            {/* Diagnóstico */}
            {prescricao.diagnostico && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Diagnóstico (opcional)</p>
                <p className="text-sm text-slate-700">{prescricao.diagnostico}</p>
              </div>
            )}

            {/* Itens da prescrição */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-700">Medicamentos Prescritos</p>
                <Button variant="outline" size="sm" onClick={addItem} className="gap-1 text-xs">
                  <Plus className="w-3 h-3" /> Adicionar Item
                </Button>
              </div>

              <div className="space-y-4">
                {prescricao.itens.map((item, index) => (
                  <div key={item.id} className="p-4 border border-slate-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">ITEM {index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-600 h-6 w-6 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <Label className="text-xs text-slate-500">Medicamento (genérico)</Label>
                        <Input
                          className="mt-1 font-medium"
                          value={item.medicamento}
                          onChange={e => updateItem(item.id, 'medicamento', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Concentração</Label>
                        <Input
                          className="mt-1"
                          value={item.concentracao}
                          onChange={e => updateItem(item.id, 'concentracao', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-slate-500">Forma Farmacêutica</Label>
                        <Select
                          value={item.forma_farmaceutica}
                          onValueChange={v => updateItem(item.id, 'forma_farmaceutica', v)}
                        >
                          <SelectTrigger className="mt-1 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['Comprimido', 'Cápsula', 'Solução oral', 'Suspensão', 'Gotas', 'Injetável', 'Creme', 'Pomada', 'Inalatório', 'Colírio'].map(f => (
                              <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Quantidade</Label>
                        <Input
                          className="mt-1"
                          value={item.quantidade}
                          onChange={e => updateItem(item.id, 'quantidade', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Via</Label>
                        <Input
                          className="mt-1"
                          value={item.via}
                          onChange={e => updateItem(item.id, 'via', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Posologia completa</Label>
                      <Textarea
                        className="mt-1 text-sm"
                        rows={2}
                        value={item.posologia}
                        onChange={e => updateItem(item.id, 'posologia', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <Label className="text-xs text-slate-500">Duração</Label>
                        <Input
                          className="mt-1 w-32"
                          value={item.duracao}
                          onChange={e => updateItem(item.id, 'duracao', e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-5">
                        <Switch
                          checked={item.uso_continuo}
                          onCheckedChange={v => updateItem(item.id, 'uso_continuo', v)}
                        />
                        <Label className="text-xs text-slate-600">Uso contínuo</Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Orientações gerais */}
            <div>
              <Label className="text-xs text-slate-500">Orientações ao Paciente</Label>
              <Textarea
                className="mt-1"
                rows={3}
                value={prescricao.orientacoes_gerais ?? ''}
                onChange={e => setPrescricao(prev => ({ ...prev, orientacoes_gerais: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-500">Retorno em</Label>
                <Input
                  className="mt-1"
                  value={prescricao.retorno ?? ''}
                  placeholder="Ex: 4 semanas"
                  onChange={e => setPrescricao(prev => ({ ...prev, retorno: e.target.value }))}
                />
              </div>
            </div>

            {/* Assinatura */}
            <div className="border-t border-slate-200 pt-4 flex justify-end">
              <div className="text-center">
                <div className="w-48 border-t border-slate-400 pt-1">
                  <p className="text-xs text-slate-600">{prescricao.medico.nome}</p>
                  <p className="text-xs text-slate-400">{prescricao.medico.crm}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estado real de persistência no backend — nunca inferido do estado local */}
      <PrescriptionSyncBadge />

      {/* Finalizar */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2 text-xs text-amber-600">
          <AlertTriangle className="w-3 h-3" />
          Revise todos os itens antes de finalizar. A prescrição é de sua responsabilidade.
        </div>
        <Button
          onClick={handleFinalize}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Finalizando...</>
          ) : (
            <><CheckCircle2 className="w-4 h-4" /> Finalizar e Emitir Prescrição</>
          )}
        </Button>
      </div>
    </div>
  );
}
