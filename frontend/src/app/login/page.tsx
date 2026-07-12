'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';

export default function LoginPage() {
  const { auth } = useApp();
  const router = useRouter();
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState('MEDICO');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      if (modo === 'login') {
        await auth.login(email, senha);
      } else {
        await auth.register({ email, senha, perfil });
      }
      router.push('/');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha na autenticação');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {modo === 'login' ? 'Entrar' : 'Criar conta'}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {auth.backendMode
            ? 'Conecte-se ao servidor PRESCREVE-AI para salvar suas consultas.'
            : 'Modo demonstração (sem servidor) — os dados ficam apenas na sessão.'}
        </p>

        <form onSubmit={submeter} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">E-mail</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
              placeholder="voce@exemplo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
            <input
              type="password" required minLength={8} value={senha} onChange={e => setSenha(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
              placeholder="mínimo 8 caracteres"
            />
          </div>
          {modo === 'registro' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Perfil</label>
              <select
                value={perfil} onChange={e => setPerfil(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="MEDICO">Médico</option>
                <option value="ADMIN">Administrador</option>
                <option value="LABORATORIO">Laboratório</option>
                <option value="HOSPITAL">Hospital</option>
                <option value="AUDITOR">Auditor</option>
              </select>
            </div>
          )}

          {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}

          <button
            type="submit" disabled={carregando}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {carregando ? 'Aguarde…' : modo === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <button
          onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setErro(null); }}
          className="mt-4 w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {modo === 'login' ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  );
}
