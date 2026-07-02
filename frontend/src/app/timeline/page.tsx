'use client';

import { useState, useMemo } from 'react';
import {
  useTimeline,
  TIPO_META,
  TIPO_ORDER,
  STATUS_META,
  type TimelineEvent,
  type TimelineEventType,
  type TimelineStatus,
} from '@/lib/timeline';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Badge } from '@/components/ui/badge';
import {
  Stethoscope,
  FlaskConical,
  Brain,
  ClipboardList,
  Pill,
  CalendarCheck,
  Settings2,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  Tag,
  Shield,
  CheckCircle2,
  Circle,
  XCircle,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Ícones por tipo ─────────────────────────────────────────

const TIPO_ICON: Record<TimelineEventType, React.ReactNode> = {
  consulta:    <Stethoscope  className="w-4 h-4" />,
  exame:       <FlaskConical className="w-4 h-4" />,
  diagnostico: <Brain        className="w-4 h-4" />,
  conduta:     <ClipboardList className="w-4 h-4" />,
  prescricao:  <Pill         className="w-4 h-4" />,
  retorno:     <CalendarCheck className="w-4 h-4" />,
  ajuste:      <Settings2    className="w-4 h-4" />,
};

const STATUS_ICON: Record<TimelineStatus, React.ReactNode> = {
  concluido: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
  pendente:  <Circle       className="w-3.5 h-3.5 text-amber-400" />,
  cancelado: <XCircle      className="w-3.5 h-3.5 text-slate-400" />,
};

// ─── Helper date ──────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function isUpcoming(iso: string) {
  return new Date(iso) > new Date();
}

// ─── Page ────────────────────────────────────────────────────

export default function TimelinePage() {
  const { events, loaded, addEvent, updateEvent, removeEvent, patients } = useTimeline();

  const [pacienteFilter, setPacienteFilter] = useState<string>('todos');
  const [tipoFilter, setTipoFilter]         = useState<TimelineEventType | 'todos'>('todos');
  const [statusFilter, setStatusFilter]     = useState<TimelineStatus | 'todos'>('todos');
  const [editorOpen, setEditorOpen]         = useState(false);
  const [editing, setEditing]               = useState<TimelineEvent | null>(null);
  const [deleteId, setDeleteId]             = useState<string | null>(null);
  const [expandedId, setExpandedId]         = useState<string | null>(null);

  const sorted = useMemo(() => {
    let list = [...events];
    if (pacienteFilter !== 'todos') list = list.filter(e => e.paciente === pacienteFilter);
    if (tipoFilter     !== 'todos') list = list.filter(e => e.tipo     === tipoFilter);
    if (statusFilter   !== 'todos') list = list.filter(e => e.status   === statusFilter);
    return list.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [events, pacienteFilter, tipoFilter, statusFilter]);

  // Group by patient for multi-patient view
  const grouped = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const ev of sorted) {
      if (!map.has(ev.paciente)) map.set(ev.paciente, []);
      map.get(ev.paciente)!.push(ev);
    }
    return map;
  }, [sorted]);

  if (!loaded) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
      Carregando timeline…
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Timeline Clínica</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Evolução clínica visual · {events.length} eventos · {patients.length} paciente(s)
          </p>
        </div>
        <Button
          size="sm"
          className="text-xs gap-1"
          onClick={() => { setEditing(null); setEditorOpen(true); }}
        >
          <Plus className="w-3.5 h-3.5" /> Novo evento
        </Button>
      </div>

      {/* Flow banner */}
      <FlowBanner />

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />

        {/* Paciente */}
        <select
          value={pacienteFilter}
          onChange={e => setPacienteFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="todos">Todos os pacientes</option>
          {patients.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Tipo */}
        <div className="flex flex-wrap gap-1">
          {(['todos', ...TIPO_ORDER] as (TimelineEventType | 'todos')[]).map(tipo => {
            const meta = tipo === 'todos' ? null : TIPO_META[tipo];
            return (
              <button
                key={tipo}
                onClick={() => setTipoFilter(tipo)}
                className={cn(
                  'text-[10px] px-2 py-1 rounded-full border transition-all whitespace-nowrap',
                  tipoFilter === tipo
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                )}
              >
                {tipo === 'todos' ? 'Todos' : meta?.label}
              </button>
            );
          })}
        </div>

        {/* Status */}
        <div className="flex gap-1">
          {(['todos', 'concluido', 'pendente', 'cancelado'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                'text-[10px] px-2 py-1 rounded-full border transition-all',
                statusFilter === st
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              )}
            >
              {st === 'todos' ? 'Status: todos' : STATUS_META[st].label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline(s) */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          Nenhum evento encontrado para este filtro.
        </div>
      ) : pacienteFilter !== 'todos' ? (
        // Single patient view
        <TimelineView
          events={sorted}
          paciente={pacienteFilter}
          expandedId={expandedId}
          onToggle={id => setExpandedId(prev => prev === id ? null : id)}
          onEdit={ev => { setEditing(ev); setEditorOpen(true); }}
          onDelete={id => setDeleteId(id)}
          onStatusChange={(id, st) => { updateEvent(id, { status: st }); toast.success('Status atualizado.'); }}
        />
      ) : (
        // Multi patient: one section per patient
        <div className="space-y-8">
          {[...grouped.entries()].map(([paciente, evs]) => (
            <div key={paciente}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">{paciente}</h2>
                <span className="text-xs text-slate-400">{evs.length} eventos</span>
              </div>
              <TimelineView
                events={evs}
                paciente={paciente}
                expandedId={expandedId}
                onToggle={id => setExpandedId(prev => prev === id ? null : id)}
                onEdit={ev => { setEditing(ev); setEditorOpen(true); }}
                onDelete={id => setDeleteId(id)}
                onStatusChange={(id, st) => { updateEvent(id, { status: st }); toast.success('Status atualizado.'); }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      <EventEditor
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditing(null); }}
        initial={editing}
        patients={patients}
        onSave={data => {
          if (editing) {
            updateEvent(editing.id, data);
            toast.success('Evento atualizado!');
          } else {
            addEvent(data);
            toast.success('Evento adicionado!');
          }
        }}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(v: boolean) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { if (deleteId) { removeEvent(deleteId); setDeleteId(null); toast.success('Evento excluído.'); } }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disclaimer */}
      <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
        <Shield className="w-3.5 h-3.5 flex-shrink-0" />
        Ferramenta de apoio à decisão clínica · Registro de evolução · Dados armazenados localmente
      </div>
    </div>
  );
}

// ─── Flow Banner ─────────────────────────────────────────────

function FlowBanner() {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {TIPO_ORDER.map((tipo, i) => {
        const meta = TIPO_META[tipo];
        return (
          <div key={tipo} className="flex items-center gap-0 flex-shrink-0">
            <div className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-lg border text-center min-w-[80px]',
              meta.bgCard, meta.border
            )}>
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white', meta.dotColor)}>
                {TIPO_ICON[tipo]}
              </div>
              <span className="text-[10px] font-semibold text-slate-700 leading-none">{meta.label}</span>
            </div>
            {i < TIPO_ORDER.length - 1 && (
              <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0 mx-0.5" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Timeline View ────────────────────────────────────────────

interface TimelineViewProps {
  events: TimelineEvent[];
  paciente: string;
  expandedId: string | null;
  onToggle: (id: string) => void;
  onEdit: (ev: TimelineEvent) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TimelineStatus) => void;
}

function TimelineView({ events, expandedId, onToggle, onEdit, onDelete, onStatusChange }: TimelineViewProps) {
  return (
    <div className="relative">
      {/* Vertical connector line */}
      <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-slate-100" />

      <div className="space-y-3">
        {events.map((ev, idx) => {
          const meta    = TIPO_META[ev.tipo];
          const isLast  = idx === events.length - 1;
          const expanded = expandedId === ev.id;
          const future   = isUpcoming(ev.data);

          return (
            <div key={ev.id} className="flex gap-4">
              {/* Left: dot + connector */}
              <div className="flex flex-col items-center flex-shrink-0 w-14">
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm z-10 ring-2 ring-white',
                  future ? 'opacity-60' : '',
                  meta.dotColor
                )}>
                  {TIPO_ICON[ev.tipo]}
                </div>
                {!isLast && <div className="flex-1 w-0.5 bg-slate-100 my-1" />}
              </div>

              {/* Right: card */}
              <div className={cn(
                'flex-1 rounded-xl border shadow-sm mb-2 transition-all',
                meta.bgCard, meta.border,
                future && 'opacity-70 border-dashed',
              )}>
                {/* Card header (always visible) */}
                <div
                  className="flex items-start gap-3 p-3 cursor-pointer"
                  onClick={() => onToggle(ev.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-1.5 mb-1">
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                        `bg-${meta.color}-100 text-${meta.color}-700 border-${meta.color}-200`
                      )}>
                        {meta.label}
                      </span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1', STATUS_META[ev.status].class)}>
                        {STATUS_ICON[ev.status]} {STATUS_META[ev.status].label}
                      </span>
                      {future && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full font-semibold">
                          Agendado
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-900 leading-snug">{ev.titulo}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {fmtDate(ev.data)} · {fmtTime(ev.data)}
                      </span>
                      {ev.medico && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {ev.medico}
                        </span>
                      )}
                    </div>
                  </div>
                  {expanded
                    ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  }
                </div>

                {/* Expanded content */}
                {expanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-slate-100 pt-3">
                    {ev.descricao && (
                      <p className="text-xs text-slate-700 leading-relaxed">{ev.descricao}</p>
                    )}

                    {/* Dados estruturados */}
                    {ev.dados && Object.keys(ev.dados).length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(ev.dados).map(([k, v]) => (
                          <div key={k} className="bg-white/70 rounded-lg px-2.5 py-2 border border-white">
                            <p className="text-[10px] text-slate-400 capitalize">{k.replace(/_/g, ' ')}</p>
                            <p className="text-xs font-semibold text-slate-800 truncate">{String(v)}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tags */}
                    {ev.tags && ev.tags.length > 0 && (
                      <div className="flex items-center flex-wrap gap-1">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {ev.tags.map(t => (
                          <span key={t} className="text-[10px] bg-white/70 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      {/* Status quick toggle */}
                      {ev.status !== 'concluido' && (
                        <button
                          onClick={() => onStatusChange(ev.id, 'concluido')}
                          className="text-[10px] flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200 border border-green-200 transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Marcar concluído
                        </button>
                      )}
                      {ev.status !== 'cancelado' && ev.status !== 'concluido' && (
                        <button
                          onClick={() => onStatusChange(ev.id, 'cancelado')}
                          className="text-[10px] flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors"
                        >
                          <XCircle className="w-3 h-3" /> Cancelar
                        </button>
                      )}
                      <div className="ml-auto flex gap-1">
                        <button
                          onClick={() => onEdit(ev)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(ev.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Event Editor ─────────────────────────────────────────────

interface EditorProps {
  open: boolean;
  onClose: () => void;
  initial: TimelineEvent | null;
  patients: string[];
  onSave: (data: Omit<TimelineEvent, 'id'>) => void;
}

function EventEditor({ open, onClose, initial, patients, onSave }: EditorProps) {
  const [tipo,       setTipo]       = useState<TimelineEventType>('consulta');
  const [titulo,     setTitulo]     = useState('');
  const [descricao,  setDescricao]  = useState('');
  const [data,       setData]       = useState('');
  const [paciente,   setPaciente]   = useState('');
  const [medico,     setMedico]     = useState('Dr. João Silva');
  const [status,     setStatus]     = useState<TimelineStatus>('concluido');
  const [tags,       setTags]       = useState('');

  useMemo(() => {
    if (!open) return;
    if (initial) {
      setTipo(initial.tipo);
      setTitulo(initial.titulo);
      setDescricao(initial.descricao ?? '');
      setData(initial.data.slice(0, 16));
      setPaciente(initial.paciente);
      setMedico(initial.medico ?? 'Dr. João Silva');
      setStatus(initial.status);
      setTags((initial.tags ?? []).join(', '));
    } else {
      setTipo('consulta');
      setTitulo('');
      setDescricao('');
      setData(new Date().toISOString().slice(0, 16));
      setPaciente(patients[0] ?? '');
      setMedico('Dr. João Silva');
      setStatus('concluido');
      setTags('');
    }
  }, [open, initial, patients]);

  const handleSave = () => {
    if (!titulo.trim() || !paciente.trim() || !data) return;
    onSave({
      tipo,
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      data: new Date(data).toISOString(),
      paciente: paciente.trim(),
      medico: medico.trim() || undefined,
      status,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar evento' : 'Novo evento clínico'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tipo */}
          <div className="space-y-1">
            <Label className="text-xs">Tipo de evento</Label>
            <div className="flex flex-wrap gap-1.5">
              {TIPO_ORDER.map(t => {
                const meta = TIPO_META[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={cn(
                      'flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all',
                      tipo === t
                        ? `${meta.dotColor} text-white border-transparent`
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    )}
                  >
                    {TIPO_ICON[t]}
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título */}
          <div className="space-y-1">
            <Label className="text-xs">Título *</Label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Descreva brevemente o evento" className="text-sm" />
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <Label className="text-xs">Descrição / Evolução</Label>
            <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={4} placeholder="Detalhes clínicos, achados, decisões…" className="text-xs" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Data */}
            <div className="space-y-1">
              <Label className="text-xs">Data e hora *</Label>
              <Input type="datetime-local" value={data} onChange={e => setData(e.target.value)} className="text-xs" />
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <div className="flex flex-col gap-1">
                {(['concluido', 'pendente', 'cancelado'] as TimelineStatus[]).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={cn(
                      'flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-all',
                      status === st
                        ? STATUS_META[st].class + ' font-semibold'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                    )}
                  >
                    {STATUS_ICON[st]} {STATUS_META[st].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Paciente */}
            <div className="space-y-1">
              <Label className="text-xs">Paciente *</Label>
              {patients.length > 0 ? (
                <div className="space-y-1">
                  <select
                    value={paciente}
                    onChange={e => setPaciente(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  >
                    {patients.map(p => <option key={p} value={p}>{p}</option>)}
                    <option value="__novo__">+ Novo paciente</option>
                  </select>
                  {paciente === '__novo__' && (
                    <Input value="" onChange={e => setPaciente(e.target.value)} placeholder="Nome do paciente" className="text-xs" />
                  )}
                </div>
              ) : (
                <Input value={paciente} onChange={e => setPaciente(e.target.value)} placeholder="Nome do paciente" className="text-xs" />
              )}
            </div>

            {/* Médico */}
            <div className="space-y-1">
              <Label className="text-xs">Médico</Label>
              <Input value={medico} onChange={e => setMedico(e.target.value)} placeholder="Dr. Nome" className="text-xs" />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <Label className="text-xs">Tags (separadas por vírgula)</Label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="HAS, retorno, ajuste…" className="text-xs" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-xs">Cancelar</Button>
          <Button onClick={handleSave} disabled={!titulo.trim() || !paciente.trim() || !data} className="text-xs">
            {initial ? 'Salvar' : 'Adicionar evento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
