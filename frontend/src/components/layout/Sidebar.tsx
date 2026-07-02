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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navGroups = [
  {
    label: 'Clínico',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard, badge: null },
      { href: '/consulta/nova', label: 'Nova Consulta', icon: FilePlus2, badge: null },
      { href: '/prescricao-rapida', label: 'Prescrição Rápida', icon: Zap, badge: 'NOVO' },
      { href: '/calculadoras', label: 'Calculadoras Clínicas', icon: Calculator, badge: 'NOVO' },
      { href: '/protocolos', label: 'Protocolos Clínicos', icon: ClipboardList, badge: 'NOVO' },
      { href: '/demo', label: 'Casos Demo', icon: Sparkles, badge: 'DEMO' },
      { href: '/historico', label: 'Histórico', icon: History, badge: null },
      { href: '/prescricoes', label: 'Prescrições', icon: FileText, badge: null },
    ],
  },
  {
    label: 'Científico',
    items: [
      { href: '/repositorio', label: 'Repositório Científico', icon: BookMarked, badge: null },
      { href: '/biblioteca', label: 'Biblioteca Farmacológica', icon: Library, badge: 'EURO' },
      { href: '/evidencias', label: 'Base de Evidências', icon: BookOpen, badge: null },
      { href: '/governanca', label: 'Governança', icon: ShieldCheck, badge: null },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/configuracoes', label: 'Configurações', icon: Settings, badge: null },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-slate-100 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm leading-none tracking-tight">PRESCREVE-AI</p>
            <p className="text-xs text-slate-400 mt-0.5">Apoio Clínico</p>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navGroups.map(group => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
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
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group',
                      active
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-4 h-4 flex-shrink-0',
                        active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                      )}
                    />
                    <span className="flex-1 truncate">{label}</span>
                    {badge && (
                      <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">
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
      <div className="p-4 border-t border-slate-100">
        <Link href="/configuracoes" className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors group">
          <div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-700">Dr. João Silva</p>
            <p className="text-xs text-slate-400">CRM-SP 123456</p>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-blue-400 flex-shrink-0" />
        </Link>
        <p className="text-center text-xs text-slate-300 mt-2">v2.0 · MVP Enterprise</p>
      </div>
    </aside>
  );
}
