/**
 * SSR-safe localStorage utilities — fonte única de verdade para acesso a storage.
 *
 * Todos os módulos de biblioteca devem usar estas funções em vez de chamar
 * localStorage diretamente. O guard `typeof window !== 'undefined'` é aplicado
 * uma única vez aqui — nunca duplicado nos consumidores.
 *
 * Seguro em:  Next.js App Router (SSR/RSC), Vercel Edge, Node.js, Jest
 */

export function isClient(): boolean {
  return typeof window !== 'undefined';
}

/** Lê uma string do storage. Retorna null em SSR ou se a chave não existir. */
export function lsGet(key: string): string | null {
  if (!isClient()) return null;
  try { return localStorage.getItem(key); } catch { return null; }
}

/** Grava uma string no storage. No-op em SSR. */
export function lsSet(key: string, value: string): void {
  if (!isClient()) return;
  try { localStorage.setItem(key, value); } catch {}
}

/** Remove uma chave do storage. No-op em SSR. */
export function lsRemove(key: string): void {
  if (!isClient()) return;
  try { localStorage.removeItem(key); } catch {}
}

/**
 * Lê e desserializa JSON do storage.
 * Retorna `fallback` em SSR, chave ausente ou erro de parse.
 */
export function lsGetJSON<T>(key: string, fallback: T): T {
  const raw = lsGet(key);
  if (raw === null) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

/** Serializa e grava um valor JSON no storage. No-op em SSR. */
export function lsSetJSON<T>(key: string, data: T): void {
  lsSet(key, JSON.stringify(data));
}
