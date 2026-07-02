'use client';

import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/theme';
import { CommandPalette } from '@/components/ui/command-palette';
import { Sun, Moon, Bell, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const ROUTE_LABELS: Record<string, string> = {
  '/':                    'Dashboard',
  '/consulta/nova':       'Nova Consulta',
  '/prescricao-rapida':   'Prescrição Rápida',
  '/calculadoras':        'Calculadoras Clínicas',
  '/protocolos':          'Protocolos',
  '/timeline':            'Timeline Clínica',
  '/demo':                'Casos Demo',
  '/historico':           'Histórico',
  '/prescricoes':         'Prescrições',
  '/repositorio':         'Repositório Científico',
  '/biblioteca':          'Biblioteca Farmacológica',
  '/evidencias':          'Base de Evidências',
  '/evidence':            'Evidence Engine',
  '/governanca':          'Governança',
  '/comite':              'Comitê Científico',
  '/atualizacoes':        'Guideline Updates',
  '/showcase':            'Laboratory Showcase',
  '/perfil':              'Meu Perfil',
  '/configuracoes':       'Configurações',
};

export function TopBar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  const label = ROUTE_LABELS[pathname] ?? 'PRESCREVE-AI';
  const isHome = pathname === '/';

  return (
    <header className="h-14 flex-shrink-0 flex items-center justify-between px-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30 backdrop-blur-sm bg-white/95 dark:bg-slate-900/95">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        {!isHome && (
          <>
            <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Dashboard</Link>
            <ChevronRight className="w-3 h-3 text-slate-300" />
          </>
        )}
        <span className="font-semibold text-slate-800 dark:text-slate-200">{label}</span>
      </div>

      {/* Right: command palette + theme toggle + notifications */}
      <div className="flex items-center gap-2">
        <CommandPalette />

        {/* Notifications dot */}
        <button className="relative p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className={cn(
            'p-2 rounded-lg transition-all',
            theme === 'dark'
              ? 'bg-slate-800 text-amber-400 hover:bg-slate-700'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {theme === 'dark'
            ? <Sun className="w-4 h-4" />
            : <Moon className="w-4 h-4" />
          }
        </button>
      </div>
    </header>
  );
}
