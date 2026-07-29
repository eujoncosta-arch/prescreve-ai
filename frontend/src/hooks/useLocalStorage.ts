'use client';

import { useCallback, useSyncExternalStore } from 'react';

// RM-52 (RM41-036/react-hooks/set-state-in-effect): a versão anterior lia
// `localStorage` num `useEffect` e chamava `setState` diretamente no corpo
// do efeito — o antipadrão que a regra aponta (mesma correção já aplicada
// em `lib/timeline.ts`, RM-51). `localStorage` é exatamente o tipo de
// "sistema externo" para o qual `useSyncExternalStore` existe. Como esta é
// uma factory genérica reutilizável por chave (`key` varia por chamador),
// o cache/listeners são indexados por chave — cada chave tem seu próprio
// snapshot e seu próprio conjunto de assinantes.

const cache = new Map<string, unknown>();
const listenersByKey = new Map<string, Set<() => void>>();

function readFromStorage<T>(key: string, initialValue: T): T {
  if (typeof window === 'undefined') return initialValue;
  try {
    const item = window.localStorage.getItem(key);
    return item !== null ? (JSON.parse(item) as T) : initialValue;
  } catch {
    return initialValue;
  }
}

function subscribe(key: string, onStoreChange: () => void): () => void {
  let set = listenersByKey.get(key);
  if (!set) {
    set = new Set();
    listenersByKey.set(key, set);
  }
  set.add(onStoreChange);
  return () => set!.delete(onStoreChange);
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const getSnapshot = useCallback(() => {
    if (!cache.has(key)) cache.set(key, readFromStorage(key, initialValue));
    return cache.get(key) as T;
    // `initialValue` deliberadamente fora das deps: só deve influenciar a
    // PRIMEIRA leitura (cache miss). Warning de exhaustive-deps aceito
    // conscientemente aqui (não suprimido) — incluir `initialValue` faria
    // o cache ser invalidado a cada render quando o chamador passa um
    // objeto/array literal como valor inicial (nova referência a cada vez).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const getServerSnapshot = useCallback(() => initialValue, [initialValue]);

  const storedValue = useSyncExternalStore(
    useCallback((onStoreChange: () => void) => subscribe(key, onStoreChange), [key]),
    getSnapshot,
    getServerSnapshot,
  );

  const setValue = useCallback((value: T) => {
    try {
      cache.set(key, value);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
      listenersByKey.get(key)?.forEach((l) => l());
    } catch {
      // localStorage indisponível (modo privado, quota excedida) — o valor
      // ainda é atualizado em memória (cache), só a persistência falha.
    }
  }, [key]);

  return [storedValue, setValue];
}
