'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, FilePlus2, History, FileText, BookOpen, ShieldCheck,
  Calculator, ClipboardList, GitBranch, TrendingUp, Sparkles, Zap,
  Library, BookMarked, Settings, Stethoscope, Search, ArrowRight,
  Pill, FlaskConical, Brain, Users, Microscope, Building2, UserCircle, Scale, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon: React.ElementType;
  group: string;
  keywords?: string[];
}

const COMMANDS: CommandItem[] = [
  // Clínico
  { id: 'dashboard',      label: 'Dashboard',             href: '/',                    icon: LayoutDashboard, group: 'Clínico',     keywords: ['inicio','home'] },
  { id: 'nova-consulta',  label: 'Nova Consulta',         href: '/consulta/nova',       icon: FilePlus2,       group: 'Clínico',     keywords: ['nova','atendimento','paciente'] },
  { id: 'presc-rapida',   label: 'Prescrição Rápida',     href: '/prescricao-rapida',   icon: Zap,             group: 'Clínico',     keywords: ['rapida','prescricao','medicamento'] },
  { id: 'calculadoras',   label: 'Calculadoras Clínicas', href: '/calculadoras',        icon: Calculator,      group: 'Clínico',     keywords: ['score','curb65','cha2ds2','wells','imc','ckd'] },
  { id: 'protocolos',     label: 'Protocolos Clínicos',   href: '/protocolos',          icon: ClipboardList,   group: 'Clínico',     keywords: ['protocolo','favorito','has','dm2'] },
  { id: 'timeline',       label: 'Timeline Clínica',      href: '/timeline',            icon: GitBranch,       group: 'Clínico',     keywords: ['evolucao','historico','timeline'] },
  { id: 'demo',           label: 'Casos Demo',            href: '/demo',                icon: Sparkles,        group: 'Clínico',     keywords: ['demo','caso','exemplo'] },
  { id: 'historico',      label: 'Histórico',             href: '/historico',           icon: History,         group: 'Clínico',     keywords: ['consulta','historico'] },
  { id: 'prescricoes',    label: 'Prescrições',           href: '/prescricoes',         icon: FileText,        group: 'Clínico',     keywords: ['prescricao','receita','medicamento'] },
  // Científico
  { id: 'repositorio',    label: 'Repositório Científico',href: '/repositorio',         icon: BookMarked,      group: 'Científico',  keywords: ['artigo','publicacao'] },
  { id: 'biblioteca',     label: 'Biblioteca Farmacológica',href: '/biblioteca',        icon: Library,         group: 'Científico',  keywords: ['farmaco','medicamento','eurofarma'] },
  { id: 'evidencias',     label: 'Base de Evidências',    href: '/evidencias',          icon: BookOpen,        group: 'Científico',  keywords: ['evidencia','estudo','ecr'] },
  { id: 'governanca',     label: 'Governança Científica', href: '/governanca',          icon: ShieldCheck,     group: 'Científico',  keywords: ['governanca','diretriz','auditoria'] },
  { id: 'comite',         label: 'Comitê Científico',     href: '/comite',              icon: Users,           group: 'Científico',  keywords: ['comite','especialista','revisor','crm','validacao'] },
  { id: 'evidence',       label: 'Evidence Engine',       href: '/evidence',            icon: Microscope,      group: 'Científico',  keywords: ['evidence','rct','meta','estudo','sprint','ukpds','paradigm','dapa','empa','nnt','nnh'] },
  { id: 'comparador',     label: 'Comparador Farmacológico', href: '/comparador',        icon: Scale,           group: 'Científico',  keywords: ['comparador','comparar','molecula','zart','holmes','sglt2','glp1','estatina','bra','ieca','eficacia','custo','interacao'] },
  { id: 'atualizacoes',   label: 'Guideline Updates',     href: '/atualizacoes',        icon: TrendingUp,      group: 'Científico',  keywords: ['esc','ada','gold','kdigo','2025','2026'] },
  // Institucional
  { id: 'showcase',       label: 'Lab Showcase',          href: '/showcase',            icon: Building2,       group: 'Institucional', keywords: ['laboratorio','eurofarma','showcase','farmaceutica','marcas','moleculas','bulas'] },
  // Sistema
  { id: 'auditoria',      label: 'Medical Audit Engine',  href: '/auditoria',           icon: Shield,          group: 'Sistema',     keywords: ['auditoria', 'audit', 'rastreabilidade', 'juridico', 'seguranca', 'alerta', 'prescricao', 'historico', 'exportar', 'csv', 'json', 'integridade'] },
  { id: 'perfil',         label: 'Meu Perfil',            href: '/perfil',              icon: UserCircle,      group: 'Sistema',     keywords: ['perfil','especialidade','diretriz','favorito','prescricao','sbc','esc','ada','acc','kdigo','estilo'] },
  { id: 'configuracoes',  label: 'Configurações',         href: '/configuracoes',       icon: Settings,        group: 'Sistema',     keywords: ['config','laboratorio','preferencia'] },
];

const QUICK_ACTIONS = [
  { label: 'Nova Consulta',       href: '/consulta/nova',  icon: FilePlus2    },
  { label: 'Prescrição Rápida',   href: '/prescricao-rapida', icon: Zap       },
  { label: 'Calculadoras',        href: '/calculadoras',   icon: Calculator   },
  { label: 'Guideline Updates',   href: '/atualizacoes',   icon: TrendingUp   },
];

export function CommandPalette() {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const [sel, setSel]     = useState(0);
  const router            = useRouter();
  const inputRef          = useRef<HTMLInputElement>(null);

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery(''); setSel(0); }
  }, [open]);

  const filtered = query.trim()
    ? COMMANDS.filter(c => {
        const q = query.toLowerCase();
        return (
          c.label.toLowerCase().includes(q) ||
          c.group.toLowerCase().includes(q) ||
          c.keywords?.some(k => k.includes(q))
        );
      })
    : COMMANDS;

  // Group results
  const groups = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const flat = filtered; // for keyboard nav

  const go = useCallback((href: string) => {
    router.push(href);
    setOpen(false);
  }, [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, flat.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && flat[sel]) go(flat[sel].href);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, flat, sel, go]);

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 bg-white dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm"
    >
      <Search className="w-3.5 h-3.5" />
      <span>Buscar…</span>
      <kbd className="ml-2 text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-[20vh] z-50 w-full max-w-xl -translate-x-1/2">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">

          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setSel(0); }}
              placeholder="Buscar consultas, prescrições, calculadoras, diretrizes…"
              className="flex-1 text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none"
            />
            <kbd className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-mono flex-shrink-0">ESC</kbd>
          </div>

          {/* Quick actions (no query) */}
          {!query && (
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-semibold text-slate-400 uppercase px-1 mb-1.5">Ações rápidas</p>
              <div className="grid grid-cols-4 gap-1.5">
                {QUICK_ACTIONS.map(a => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.href}
                      onClick={() => go(a.href)}
                      className="flex flex-col items-center gap-1.5 px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-all text-center group"
                    >
                      <Icon className="w-4 h-4 text-slate-500 group-hover:text-blue-500" />
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 group-hover:text-blue-600 leading-tight">{a.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Results */}
          <div className="max-h-72 overflow-y-auto py-1">
            {Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <p className="text-[10px] font-semibold text-slate-400 uppercase px-4 py-1.5">{group}</p>
                {items.map(item => {
                  const Icon = item.icon;
                  const idx  = flat.indexOf(item);
                  const active = idx === sel;
                  return (
                    <button
                      key={item.id}
                      onClick={() => go(item.href)}
                      onMouseEnter={() => setSel(idx)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        active
                          ? 'bg-blue-50 dark:bg-blue-900/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      )}
                    >
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                        active ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'
                      )}>
                        <Icon className={cn('w-3.5 h-3.5', active ? 'text-white' : 'text-slate-500')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium truncate', active ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200')}>
                          {item.label}
                        </p>
                        {item.description && (
                          <p className="text-xs text-slate-400 truncate">{item.description}</p>
                        )}
                      </div>
                      {active && <ArrowRight className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                Nenhum resultado para "{query}"
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 text-[10px] text-slate-400">
            <span><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">↑↓</kbd> navegar</span>
            <span><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">↵</kbd> abrir</span>
            <span><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">ESC</kbd> fechar</span>
            <span className="ml-auto">{flat.length} resultado(s)</span>
          </div>
        </div>
      </div>
    </>
  );
}
