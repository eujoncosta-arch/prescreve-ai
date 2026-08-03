// Vitest global setup — Prescreve-AI Clinical Validation Suite
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// CJ-009 (RM-64): React 19 exige este flag explícito para reconhecer o
// ambiente de teste do Vitest como um "act environment" — sem ele, updates
// de estado disparados por microtasks (padrão usado em vários componentes
// deste projeto, ex.: `prescricao-rapida/page.tsx`) emitem o aviso "not
// wrapped in act(...)" mesmo quando `@testing-library/react` já aguarda
// corretamente por eles.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// CJ-009 (RM-64): polyfills exigidos pelo jsdom para montar componentes Radix
// UI (Select/Tabs) usados por `prescricao-rapida/page.tsx` — jsdom não
// implementa ResizeObserver nem a API de Pointer Capture, e sem eles o
// Radix lança em tempo de render, mesmo sem qualquer interação real do
// teste com esses elementos.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (typeof Element !== 'undefined') {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
}

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
