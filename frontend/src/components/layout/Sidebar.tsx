'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FilePlus2,
  History,
  FileText,
  BookOpen,
  Shield,
  ChevronRight,
  Stethoscope,
  Sparkles,
  Settings,
  ShieldCheck,
  Library,
  BookMarked,
  Zap,
  Calculator,
  ClipboardList,
  GitBranch,
  TrendingUp,
  Users,
  Microscope,
  Building2,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navGroups = [
  {
    label: 'Clínico',
    items: [
      { href: '/',                  label: 'Dashboard',             icon: LayoutDashboard, badge: null },
      { href: '/consulta/nova',     label: 'Nova Consulta',         icon: FilePlus2,       badge: null },
      { href: '/prescricao-rapida', label: 'Prescrição Rápida',     icon: Zap,             badge: 'NOVO' },
      { href: '/calculadoras',      label: 'Calculadoras',          icon: Calculator,      badge: 'NOVO' },
      { href: '/protocolos',        label: 'Protocolos',            icon: ClipboardList,   badge: 'NOVO' },
      { href: '/timeline',          label: 'Timeline Clínica',      icon: GitBranch,       badge: 'NOVO' },
      { href: '/demo',              label: 'Casos Demo',            icon: Sparkles,        badge: 'DEMO' },
      { href: '/historico',         label: 'Histórico',             icon: History,         badge: null },
      { href: '/prescricoes',       label: 'Prescrições',           icon: FileText,        badge: null },
    ],
  },
  {
    label: 'Científico',
    items: [
      { href: '/repositorio',   label: 'Repositório',         icon: BookMarked,  badge: null },
      { href: '/biblioteca',    label: 'Farmacológica',       icon: Library,     badge: 'EURO' },
      { href: '/evidencias',    label: 'Evidências',          icon: BookOpen,    badge: null },
      { href: '/evidence',      label: 'Evidence Engine',     icon: Microscope,  badge: 'NOVO' },
      { href: '/governanca',    label: 'Governança',          icon: ShieldCheck, badge: null },
      { href: '/comite',        label: 'Comitê Científico',   icon: Users,       badge: 'NOVO' },
      { href: '/atualizacoes',  label: 'Guideline Updates',   icon: TrendingUp,  badge: '2025' },
    ],
  },
  {
    label: 'Institucional',
    items: [
      { href: '/showcase',      label: 'Lab Showcase',  icon: Building2,  badge: 'NOVO' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/perfil',        label: 'Meu Perfil',    icon: UserCircle, badge: 'NOVO' },
      { href: '/configuracoes', label: 'Configurações', icon: Settings,   badge: null },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-slate-100 dark:border-slate-800">
        <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
          <Stethoscope className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <p className="font-black text-slate-900 dark:text-white text-xs leading-none tracking-tight">PRESCREVE-AI</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Apoio Clínico</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto scrollbar-none">
        {navGroups.map(group => (
          <div key={group.label}>
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest px-2 mb-1">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, badge }) => {
                const active = pathname === href || (href !== '/' && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group',
                      active
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                    )}
                  >
                    <Icon className={cn(
                      'w-3.5 h-3.5 flex-shrink-0',
                      active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400'
                    )} />
                    <span className="flex-1 truncate">{label}</span>
                    {badge && (
                      <span className={cn(
                        'text-[8px] font-bold px-1.5 py-0.5 rounded flex-shrink-0',
                        badge === 'NOVO' || badge === '2025' ? 'bg-blue-600 text-white' :
                        badge === 'DEMO' ? 'bg-indigo-500 text-white' :
                        badge === 'EURO' ? 'bg-emerald-600 text-white' :
                        'bg-slate-200 text-slate-600'
                      )}>
                        {badge}
                      </span>
                    )}
                    {active && !badge && <ChevronRight className="w-3 h-3 text-blue-400 flex-shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer médico */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800">
        <Link href="/configuracoes" className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
          <div className="w-7 h-7 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center flex-shrink-0">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-700 dark:group-hover:text-blue-400">Dr. João Silva</p>
            <p className="text-[10px] text-slate-400">CRM-SP 123456</p>
          </div>
        </Link>
        <p className="text-center text-[9px] text-slate-300 dark:text-slate-700 mt-1.5">v2.1 · MVP Enterprise</p>
      </div>
    </aside>
  );
}
