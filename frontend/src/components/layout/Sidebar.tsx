'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/lib/store';
import { ChevronRight, Stethoscope, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_GROUPS as navGroups } from '@/lib/clinical-nav-registry';

export function Sidebar() {
  const pathname = usePathname();
  const { state, auth } = useApp();

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
                        badge === 'P12' ? 'bg-violet-600 text-white' :
                        badge === 'P14' ? 'bg-fuchsia-600 text-white' :
                        badge === 'P15' ? 'bg-cyan-600 text-white' :
                        badge === 'P16' ? 'bg-teal-600 text-white' :
                        badge === 'P17' ? 'bg-sky-600 text-white' :
                        badge === 'P18' ? 'bg-violet-600 text-white' :
                        badge === 'P19' ? 'bg-indigo-600 text-white' :
                        badge === 'P20' ? 'bg-cyan-600 text-white' :
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

      {/* Footer médico + sessão */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800">
        <Link href="/configuracoes" className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
          <div className="w-7 h-7 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center flex-shrink-0">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-700 dark:group-hover:text-blue-400">
              {auth.currentUser?.email ?? state.settings.medico.nome}
            </p>
            <p className="text-[10px] text-slate-400">
              {auth.currentUser ? auth.currentUser.perfil : state.settings.medico.crm}
            </p>
          </div>
        </Link>
        {auth.isAuthenticated ? (
          <button
            onClick={() => { void auth.logout(); }}
            className="mt-1 w-full text-center text-[10px] text-slate-400 hover:text-red-500 transition-colors"
          >
            Sair da sessão
          </button>
        ) : (
          <Link href="/login" className="mt-1 block text-center text-[10px] text-blue-500 hover:underline">
            {auth.backendMode
              ? 'Entrar / Conectar ao servidor'
              : auth.demoMode
                ? 'Entrar (modo demonstração)'
                : 'Entrar (backend não configurado)'}
          </Link>
        )}
        <p className="text-center text-[9px] text-slate-300 dark:text-slate-700 mt-1.5">v6.0 · Enterprise Platform P20</p>
      </div>
    </aside>
  );
}
