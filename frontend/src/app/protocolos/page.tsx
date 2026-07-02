'use client';

import { useState, useMemo, useRef } from 'react';
import {
  useProtocols,
  CATEGORIA_LABEL,
  CATEGORIA_COLOR,
  type SmartProtocol,
  type ProtocolCategoria,
} from '@/lib/protocols';
import { ProtocolEditor } from '@/components/modules/ProtocolEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Plus,
  Search,
  Star,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Download,
  Upload,
  Share2,
  FileDown,
  Pill,
  Activity,
  Clock,
  Tag,
  BookOpen,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ALL_CATS: ProtocolCategoria[] = ['cardiovascular', 'cronica', 'aguda', 'psiquiatrica', 'respiratoria', 'outro'];

export default function ProtocolosPage() {
  const {
    protocols, loaded,
    create, update, remove, toggleFavorito, duplicate,
    exportAll, exportOne, importFromJson, copyShareText,
  } = useProtocols();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<ProtocolCategoria | 'todos' | 'favoritos'>('todos');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<SmartProtocol | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [shareText, setShareText] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let list = protocols;
    if (catFilter === 'favoritos') list = list.filter(p => p.favorito);
    else if (catFilter !== 'todos') list = list.filter(p => p.categoria === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.nome.toLowerCase().includes(q) ||
        p.condicao.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [protocols, catFilter, search]);

  const favCount = protocols.filter(p => p.favorito).length;

  const handleCreate = (data: Parameters<typeof create>[0]) => {
    create(data);
    toast.success('Protocolo criado!');
  };

  const handleUpdate = (data: Parameters<typeof create>[0]) => {
    if (!editing) return;
    update(editing.id, data);
    setEditing(null);
    toast.success('Protocolo atualizado!');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = importFromJson(ev.target?.result as string);
      if (result.ok) toast.success(`${result.count} protocolo(s) importado(s)!`);
      else toast.error(`Erro ao importar: ${result.error}`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleShare = (id: string) => {
    const text = copyShareText(id);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => toast.success('JSON copiado para o clipboard!'));
    } else {
      setShareText(text);
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-sm">Carregando protocolos…</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Protocolos Clínicos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {protocols.length} protocolos · {favCount} favoritos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          <Button variant="outline" size="sm" onClick={() => importRef.current?.click()} className="text-xs gap-1">
            <Upload className="w-3.5 h-3.5" /> Importar
          </Button>
          <Button variant="outline" size="sm" onClick={exportAll} className="text-xs gap-1">
            <FileDown className="w-3.5 h-3.5" /> Exportar todos
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setEditorOpen(true); }} className="text-xs gap-1">
            <Plus className="w-3.5 h-3.5" /> Novo protocolo
          </Button>
        </div>
      </div>

      {/* Filtros + busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, condição ou tag…"
            className="pl-9 text-sm h-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([
            ['todos', 'Todos', protocols.length],
            ['favoritos', '★ Favoritos', favCount],
            ...ALL_CATS.map(c => [c, CATEGORIA_LABEL[c], protocols.filter(p => p.categoria === c).length] as [string, string, number]),
          ] as [string, string, number][]).map(([val, label, count]) => (
            <button
              key={val}
              onClick={() => setCatFilter(val as typeof catFilter)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition-all whitespace-nowrap',
                catFilter === val
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
              )}
            >
              {label} <span className="opacity-60">({count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          {search ? 'Nenhum protocolo encontrado.' : 'Nenhum protocolo nesta categoria.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(p => (
            <ProtocolCard
              key={p.id}
              protocol={p}
              onEdit={() => { setEditing(p); setEditorOpen(true); }}
              onDelete={() => setDeleteId(p.id)}
              onDuplicate={() => { duplicate(p.id); toast.success('Protocolo duplicado!'); }}
              onToggleFavorito={() => toggleFavorito(p.id)}
              onExport={() => exportOne(p.id)}
              onShare={() => handleShare(p.id)}
            />
          ))}
        </div>
      )}

      {/* Editor */}
      <ProtocolEditor
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditing(null); }}
        initial={editing}
        onSave={editing ? handleUpdate : handleCreate}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(v: boolean) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir protocolo?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { if (deleteId) { remove(deleteId); setDeleteId(null); toast.success('Protocolo excluído.'); } }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share text fallback */}
      {shareText && (
        <AlertDialog open onOpenChange={() => setShareText(null)}>
          <AlertDialogContent className="max-w-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Compartilhar protocolo (JSON)</AlertDialogTitle>
              <AlertDialogDescription className="text-xs font-mono bg-slate-50 rounded p-3 max-h-64 overflow-auto whitespace-pre">
                {shareText}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShareText(null)}>Fechar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
        <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>Protocolos são salvo localmente no navegador. Use <strong>Exportar</strong> para criar backup. <strong>Importar</strong> aceita arquivos JSON exportados pelo Prescreve-AI.</span>
      </div>
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────

interface CardProps {
  protocol: SmartProtocol;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleFavorito: () => void;
  onExport: () => void;
  onShare: () => void;
}

function ProtocolCard({ protocol: p, onEdit, onDelete, onDuplicate, onToggleFavorito, onExport, onShare }: CardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', CATEGORIA_COLOR[p.categoria])}>
                {CATEGORIA_LABEL[p.categoria]}
              </span>
              {p.favorito && (
                <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                  ★ Favorito
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-1.5 leading-tight">{p.nome}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{p.condicao}</p>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onToggleFavorito}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                p.favorito ? 'text-amber-500 hover:text-amber-600' : 'text-slate-300 hover:text-amber-400'
              )}
            >
              <Star className="w-4 h-4" fill={p.favorito ? 'currentColor' : 'none'} />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger>
                <span className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors inline-flex">
                  <MoreVertical className="w-4 h-4" />
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                <DropdownMenuItem onClick={onEdit} className="gap-2">
                  <Edit2 className="w-3.5 h-3.5" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate} className="gap-2">
                  <Copy className="w-3.5 h-3.5" /> Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onShare} className="gap-2">
                  <Share2 className="w-3.5 h-3.5" /> Compartilhar (JSON)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExport} className="gap-2">
                  <Download className="w-3.5 h-3.5" /> Exportar arquivo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="gap-2 text-red-600 focus:text-red-700">
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Drug list preview */}
        {p.farmacologico.length > 0 && (
          <div className="mt-3 space-y-1">
            {p.farmacologico.slice(0, expanded ? undefined : 2).map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <Pill className="w-3 h-3 text-blue-400 flex-shrink-0" />
                <span className="font-medium text-slate-800">{d.molecula}</span>
                <span className="text-slate-400">{d.dose} · {d.via} · {d.frequencia}</span>
                {d.duracao && <span className="text-slate-400">· {d.duracao}</span>}
              </div>
            ))}
            {!expanded && p.farmacologico.length > 2 && (
              <p className="text-[10px] text-slate-400">+{p.farmacologico.length - 2} medicamento(s)…</p>
            )}
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 text-[10px] text-blue-600 hover:underline"
        >
          {expanded ? 'Ver menos' : 'Ver detalhes'}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
          {p.nao_farmacologico.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
                <Activity className="w-3 h-3" /> Não farmacológico
              </p>
              <ul className="space-y-0.5">
                {p.nao_farmacologico.map((item, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                    <span className="text-green-400">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.seguimento && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Seguimento
              </p>
              <p className="text-xs text-slate-600">{p.seguimento}</p>
            </div>
          )}

          {p.monitorizacao.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> Monitorização
              </p>
              <ul className="space-y-0.5">
                {p.monitorizacao.map((item, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                    <span className="text-blue-400">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.notas && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Notas</p>
              <p className="text-xs text-slate-500 italic">{p.notas}</p>
            </div>
          )}

          {p.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              <Tag className="w-3 h-3 text-slate-400 mt-0.5" />
              {p.tags.map(t => (
                <span key={t} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
            <span>v{p.versao} · {p.autor ?? 'Sem autor'}</span>
            <span>{new Date(p.atualizado_em).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
