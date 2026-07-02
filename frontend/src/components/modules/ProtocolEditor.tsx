'use client';

import { useState, useEffect } from 'react';
import type { SmartProtocol, ProtocolCategoria, ProtocolDrug } from '@/lib/protocols';
import { CATEGORIA_LABEL } from '@/lib/protocols';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIAS: ProtocolCategoria[] = ['cardiovascular', 'cronica', 'aguda', 'psiquiatrica', 'respiratoria', 'outro'];

const EMPTY_DRUG: ProtocolDrug = { molecula: '', dose: '', via: 'VO', frequencia: '', duracao: '', notas: '' };

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: SmartProtocol | null;
  onSave: (data: Omit<SmartProtocol, 'id' | 'criado_em' | 'atualizado_em' | 'versao'>) => void;
}

export function ProtocolEditor({ open, onClose, initial, onSave }: Props) {
  const [nome, setNome] = useState('');
  const [condicao, setCondicao] = useState('');
  const [categoria, setCategoria] = useState<ProtocolCategoria>('cronica');
  const [drugs, setDrugs] = useState<ProtocolDrug[]>([{ ...EMPTY_DRUG }]);
  const [naoFarm, setNaoFarm] = useState('');
  const [seguimento, setSeguimento] = useState('');
  const [monitorizacao, setMonitorizacao] = useState('');
  const [notas, setNotas] = useState('');
  const [tags, setTags] = useState('');
  const [favorito, setFavorito] = useState(false);

  useEffect(() => {
    if (initial) {
      setNome(initial.nome);
      setCondicao(initial.condicao);
      setCategoria(initial.categoria);
      setDrugs(initial.farmacologico.length > 0 ? initial.farmacologico.map(d => ({ ...d })) : [{ ...EMPTY_DRUG }]);
      setNaoFarm(initial.nao_farmacologico.join('\n'));
      setSeguimento(initial.seguimento);
      setMonitorizacao(initial.monitorizacao.join('\n'));
      setNotas(initial.notas ?? '');
      setTags(initial.tags.join(', '));
      setFavorito(initial.favorito);
    } else {
      setNome(''); setCondicao(''); setCategoria('cronica');
      setDrugs([{ ...EMPTY_DRUG }]);
      setNaoFarm(''); setSeguimento(''); setMonitorizacao('');
      setNotas(''); setTags(''); setFavorito(false);
    }
  }, [initial, open]);

  const updateDrug = (i: number, field: keyof ProtocolDrug, value: string) => {
    setDrugs(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d));
  };

  const addDrug = () => setDrugs(prev => [...prev, { ...EMPTY_DRUG }]);
  const removeDrug = (i: number) => setDrugs(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!nome.trim() || !condicao.trim()) return;
    onSave({
      nome: nome.trim(),
      condicao: condicao.trim(),
      categoria,
      farmacologico: drugs.filter(d => d.molecula.trim()),
      nao_farmacologico: naoFarm.split('\n').map(s => s.trim()).filter(Boolean),
      seguimento: seguimento.trim(),
      monitorizacao: monitorizacao.split('\n').map(s => s.trim()).filter(Boolean),
      notas: notas.trim() || undefined,
      tags: tags.split(',').map(s => s.trim()).filter(Boolean),
      favorito,
      autor: 'Dr. João Silva',
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar Protocolo' : 'Novo Protocolo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Identificação */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome do protocolo *</Label>
              <Input
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: HAS — 1ª Linha"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Condição clínica *</Label>
              <Input
                value={condicao}
                onChange={e => setCondicao(e.target.value)}
                placeholder="Ex: Hipertensão Arterial Sistêmica"
                className="text-sm"
              />
            </div>
          </div>

          {/* Categoria */}
          <div className="space-y-1">
            <Label className="text-xs">Categoria</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoria(cat)}
                  className={cn(
                    'text-xs px-3 py-1 rounded-full border transition-all',
                    categoria === cat
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                  )}
                >
                  {CATEGORIA_LABEL[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Fármacos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Medicamentos</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addDrug} className="text-xs h-7">
                <Plus className="w-3 h-3 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="space-y-3">
              {drugs.map((d, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1 mb-1">
                    <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-xs font-semibold text-slate-600">Medicamento {i + 1}</span>
                    {drugs.length > 1 && (
                      <button type="button" onClick={() => removeDrug(i)} className="ml-auto text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-slate-500">Molécula</Label>
                      <Input value={d.molecula} onChange={e => updateDrug(i, 'molecula', e.target.value)} placeholder="Ex: Enalapril" className="text-xs h-8" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500">Dose</Label>
                      <Input value={d.dose} onChange={e => updateDrug(i, 'dose', e.target.value)} placeholder="Ex: 10 mg" className="text-xs h-8" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500">Via</Label>
                      <Input value={d.via} onChange={e => updateDrug(i, 'via', e.target.value)} placeholder="VO / IM / SC" className="text-xs h-8" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500">Frequência</Label>
                      <Input value={d.frequencia} onChange={e => updateDrug(i, 'frequencia', e.target.value)} placeholder="Ex: 1x/dia" className="text-xs h-8" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500">Duração</Label>
                      <Input value={d.duracao ?? ''} onChange={e => updateDrug(i, 'duracao', e.target.value)} placeholder="Ex: 7 dias / contínuo" className="text-xs h-8" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500">Notas</Label>
                      <Input value={d.notas ?? ''} onChange={e => updateDrug(i, 'notas', e.target.value)} placeholder="Observações" className="text-xs h-8" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Não farmacológico */}
          <div className="space-y-1">
            <Label className="text-xs">Medidas não farmacológicas (uma por linha)</Label>
            <Textarea
              value={naoFarm}
              onChange={e => setNaoFarm(e.target.value)}
              placeholder="Ex: Redução de sódio < 2g/dia&#10;Atividade física 150 min/semana"
              rows={3}
              className="text-xs"
            />
          </div>

          {/* Seguimento */}
          <div className="space-y-1">
            <Label className="text-xs">Seguimento</Label>
            <Textarea
              value={seguimento}
              onChange={e => setSeguimento(e.target.value)}
              placeholder="Ex: Retorno em 30 dias com PA aferida. Meta < 130/80 mmHg."
              rows={2}
              className="text-xs"
            />
          </div>

          {/* Monitorização */}
          <div className="space-y-1">
            <Label className="text-xs">Monitorização (uma por linha)</Label>
            <Textarea
              value={monitorizacao}
              onChange={e => setMonitorizacao(e.target.value)}
              placeholder="Ex: PA semanal&#10;Creatinina em 2 semanas"
              rows={2}
              className="text-xs"
            />
          </div>

          {/* Tags e extras */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tags (separadas por vírgula)</Label>
              <Input
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="HAS, cardiovascular, IECA"
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notas internas</Label>
              <Input
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Observações pessoais"
                className="text-xs"
              />
            </div>
          </div>

          {/* Favorito */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFavorito(f => !f)}
              className={cn(
                'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-all',
                favorito ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-white text-slate-500 border-slate-200'
              )}
            >
              <span>{favorito ? '★' : '☆'}</span> Favorito
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-xs">Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={!nome.trim() || !condicao.trim()}
            className="text-xs"
          >
            {initial ? 'Salvar alterações' : 'Criar protocolo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
