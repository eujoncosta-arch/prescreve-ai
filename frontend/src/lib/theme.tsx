'use client';
import { createContext, useContext, useEffect, useState, useCallback, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';
interface ThemeContextValue { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void; }
const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', toggle: () => {}, setTheme: () => {} });

// RM-52 (react-hooks/set-state-in-effect): o tema inicial vem de um
// "sistema externo" (localStorage + matchMedia) — useSyncExternalStore em
// vez de useEffect+setState no mount, mesmo padrão de useLocalStorage.ts.
function readInitialTheme(): Theme {
  const stored = localStorage.getItem('prescreve_theme') as Theme | null;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return stored ?? (prefersDark ? 'dark' : 'light');
}
function subscribeThemeMedia(onStoreChange: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const initialTheme = useSyncExternalStore(subscribeThemeMedia, readInitialTheme, () => 'light' as Theme);
  // `override` é null até o usuário escolher explicitamente um tema (setTheme/toggle);
  // até lá, `theme` acompanha o valor externo (storage/matchMedia) sem precisar de efeito.
  const [override, setOverride] = useState<Theme | null>(null);
  const theme = override ?? initialTheme;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setOverride(t);
    localStorage.setItem('prescreve_theme', t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  return <ThemeContext.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }
