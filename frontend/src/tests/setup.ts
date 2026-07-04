// Vitest global setup — Prescreve-AI Clinical Validation Suite
import { vi } from 'vitest';

// Mock localStorage para ambiente jsdom
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Silenciar console.warn em testes unitários
globalThis.console.warn = vi.fn();
