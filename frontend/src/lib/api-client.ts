// ============================================================
// PRESCREVE-AI — API Client (Phase 13)
// Camada de compatibilidade: backend NestJS com fallback localStorage
// ============================================================

'use client';

// ══════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ══════════════════════════════════════════════════════════════

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
const BACKEND_AVAILABLE = !!API_BASE;

// ── Token storage ─────────────────────────────────────────────
// These keys are written only when NEXT_PUBLIC_API_URL is set (backend mode).
// In frontend-only mode (BACKEND_AVAILABLE = false) they remain empty.
// Keys are orphan in the localStorage map when running without a backend.
const KEY_ACCESS  = 'prescreve_ai_access_token';
const KEY_REFRESH = 'prescreve_ai_refresh_token';
const KEY_USER    = 'prescreve_ai_current_user';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  perfil: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  perfil: string;
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY_ACCESS);
}

function setTokens(tokens: AuthTokens): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_ACCESS, tokens.access_token);
  localStorage.setItem(KEY_REFRESH, tokens.refresh_token);
}

function clearTokens(): void {
  if (typeof window === 'undefined') return;
  [KEY_ACCESS, KEY_REFRESH, KEY_USER].forEach(k => localStorage.removeItem(k));
}

// ══════════════════════════════════════════════════════════════
// HTTP BASE
// ══════════════════════════════════════════════════════════════

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && path !== '/auth/login') {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${getAccessToken()}` };
      const retry = await fetch(`${API_BASE}${path}`, { ...options, headers: retryHeaders });
      if (!retry.ok) throw new ApiError(retry.status, await retry.text());
      return retry.json();
    }
    clearTokens();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new ApiError(401, 'Sessão expirada');
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, msg);
  }

  return res.json();
}

async function tryRefresh(): Promise<boolean> {
  try {
    const rt = typeof window !== 'undefined' ? localStorage.getItem(KEY_REFRESH) : null;
    if (!rt) return false;
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt }),
    });
    if (!res.ok) return false;
    const tokens = await res.json() as AuthTokens;
    setTokens(tokens);
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ══════════════════════════════════════════════════════════════
// AUTH API
// ══════════════════════════════════════════════════════════════

export const authApi = {
  async login(email: string, senha: string, mfa_code?: string): Promise<AuthTokens> {
    if (!BACKEND_AVAILABLE) {
      // Modo offline — simula login
      const tokens: AuthTokens = {
        access_token: `offline-${Date.now()}`,
        refresh_token: `offline-refresh-${Date.now()}`,
        perfil: 'MEDICO',
      };
      setTokens(tokens);
      return tokens;
    }
    const tokens = await apiFetch<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha, mfa_code }),
    });
    setTokens(tokens);
    return tokens;
  },

  async register(dados: {
    email: string; senha: string; perfil: string; crm?: string; especialidade?: string; uf?: string;
  }): Promise<AuthTokens> {
    const tokens = await apiFetch<AuthTokens>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
    setTokens(tokens);
    return tokens;
  },

  async logout(): Promise<void> {
    if (BACKEND_AVAILABLE) {
      await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    }
    clearTokens();
  },

  isAuthenticated(): boolean {
    return !!getAccessToken();
  },

  getToken(): string | null {
    return getAccessToken();
  },

  currentUser(): CurrentUser | null {
    return getCurrentUser();
  },
};

/** Decodifica o usuário atual a partir do JWT armazenado (sem chamada de rede). */
export function getCurrentUser(): CurrentUser | null {
  const token = getAccessToken();
  if (!token) return null;
  if (token.startsWith('offline-')) return { id: 'offline', email: 'demo@local', perfil: 'MEDICO' };
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { sub: string; email: string; perfil: string };
    return { id: payload.sub, email: payload.email, perfil: payload.perfil };
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
// CONSULTA API
// ══════════════════════════════════════════════════════════════

export const consultaApi = {
  async criar(dados: { paciente_hash?: string; anamnese?: object }) {
    if (!BACKEND_AVAILABLE) return { id: `local-${Date.now()}`, status: 'em_andamento' };
    return apiFetch('/api/consulta', { method: 'POST', body: JSON.stringify(dados) });
  },

  async listar(pagina = 1, limite = 20) {
    if (!BACKEND_AVAILABLE) return { total: 0, consultas: [], pagina, limite };
    return apiFetch(`/api/consultas?pagina=${pagina}&limite=${limite}`);
  },

  async buscar(id: string) {
    if (!BACKEND_AVAILABLE) return null;
    return apiFetch(`/api/consulta/${id}`);
  },

  async timeline() {
    if (!BACKEND_AVAILABLE) return [];
    return apiFetch('/api/timeline');
  },

  async criarDiagnostico(dados: { consulta_id: string; cid: string; descricao: string; confianca?: number; selecionado?: boolean }) {
    if (!BACKEND_AVAILABLE) return { id: `local-diag-${Date.now()}`, ...dados };
    return apiFetch('/api/diagnostico', { method: 'POST', body: JSON.stringify(dados) });
  },

  async criarPrescricao(dados: { consulta_id: string; diagnostico_id?: string; medicamentos: object[]; orientacoes?: string }) {
    if (!BACKEND_AVAILABLE) return { id: `local-rx-${Date.now()}`, ...dados };
    return apiFetch('/api/prescricao', { method: 'POST', body: JSON.stringify(dados) });
  },

  async salvarRisco(consulta_id: string, score: object) {
    if (!BACKEND_AVAILABLE) return { id: `local-risk-${Date.now()}` };
    return apiFetch('/api/risco', { method: 'POST', body: JSON.stringify({ consulta_id, score }) });
  },

  async buscarEvidencias(cid: string) {
    if (!BACKEND_AVAILABLE) return [];
    return apiFetch(`/api/evidence/${cid}`);
  },

  async buscarRWE(cid: string) {
    if (!BACKEND_AVAILABLE) return [];
    return apiFetch(`/api/rwe/${cid}`);
  },
};

// ══════════════════════════════════════════════════════════════
// MIGRAÇÃO API
// ══════════════════════════════════════════════════════════════

export const migracaoApi = {
  async verificarStatus() {
    if (!BACKEND_AVAILABLE) return { migrado: false, prescricoes: 0, validacoes: 0 };
    return apiFetch<{ migrado: boolean; prescricoes: number; validacoes: number }>('/api/migration/status');
  },

  async migrarLocalStorage(): Promise<{
    prescricoes_migradas: number;
    validacoes_migradas: number;
    erros: string[];
    duracao_ms: number;
  }> {
    if (!BACKEND_AVAILABLE) return { prescricoes_migradas: 0, validacoes_migradas: 0, erros: ['Backend não disponível'], duracao_ms: 0 };

    // Coleta dados do localStorage
    const prescricoes = coletarPrescricoesLocalStorage();
    const validacoes  = coletarValidacoesLocalStorage();
    const consultas   = coletarConsultasLocalStorage();

    return apiFetch('/api/migration', {
      method: 'POST',
      body: JSON.stringify({ prescricoes, validacoes, consultas }),
    });
  },
};

// ── Helpers de coleta localStorage ────────────────────────────

function coletarPrescricoesLocalStorage(): object[] {
  if (typeof window === 'undefined') return [];
  const keys = ['prescreve_ai_recommendation_registry_v1', 'prescreve_ai_prescricoes'];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return [];
}

function coletarValidacoesLocalStorage(): object[] {
  if (typeof window === 'undefined') return [];
  const keys = ['prescreve_ai_physician_reviews_v1', 'prescreve_ai_validation_board_v1'];
  const result: object[] = [];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) result.push(...(JSON.parse(raw) as object[]));
    } catch {}
  }
  return result;
}

function coletarConsultasLocalStorage(): object[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('prescreve_ai_historico');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ══════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════

export const isBackendAvailable = BACKEND_AVAILABLE;
