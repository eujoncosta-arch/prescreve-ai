// Vitest global setup — Prescreve-AI Clinical Validation Suite
import { vi } from 'vitest';

// Mock localStorage para ambiente jsdom.
//
// `key()`/`length` foram adicionados porque o mock anterior só implementava
// getItem/setItem/removeItem/clear — nunca a interface Storage completa. Isso
// mascarava silenciosamente qualquer código de produção que precisasse
// ENUMERAR chaves (ex.: limpar todos os dados do app no logout por prefixo),
// já que esse código funciona normalmente num navegador real mas falharia de
// forma invisível sob este mock incompleto.
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() { return Object.keys(store).length; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Silenciar console.warn em testes unitários
globalThis.console.warn = vi.fn();
