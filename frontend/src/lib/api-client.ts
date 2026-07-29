// ============================================================
// PRESCREVE-AI — API Client (Phase 13)
// Camada de compatibilidade: backend NestJS com fallback localStorage
// ============================================================

'use client';

import { IS_DEMO_MODE, IS_PRODUCTION_MODE, APP_MODE } from './app-mode';
import { NonRetryableError } from './sync-engine';
import type { MedicamentoPrescrito } from './types';

// ============================================================
// RM-43 — Formato real de `GET /api/consulta/:id`
//
// Espelha `ConsultaDetalheResponse` do backend
// (`backend/src/modules/consulta/consulta.service.ts::mapConsultaDetalhe`)
// — só os campos que o servidor de fato retorna. `medicamentos` de cada
// prescrição é o array real de `MedicamentoPrescrito` originalmente
// enviado a `POST /api/prescricao`; nunca reconstituído de outra fonte.
// ============================================================
export interface ConsultaDetalheResponse {
  id: string;
  status: string;
  anamnese: unknown;
  criado_em: string;
  atualizado_em: string;
  diagnosticos: {
    id: string;
    cid: string;
    descricao: string;
    confianca: number;
    selecionado: boolean;
    criado_em: string;
  }[];
  prescricoes: {
    id: string;
    status: string;
    medicamentos: MedicamentoPrescrito[];
    orientacoes: string | null;
    validade_dias: number;
    diagnostico_id: string | null;
    criado_em: string;
  }[];
  /** RM-53 (RM41-023): risk scores reais persistidos para esta consulta. */
  risco_scores: {
    id: string;
    risco_global: string;
    score_global: number;
    alerta_vermelho: boolean;
    recomendacoes: string[];
    criado_em: string;
  }[];
}

// ══════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ══════════════════════════════════════════════════════════════

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
const API_URL_CONFIGURED = !!API_BASE;

// ============================================================
// PRESCREVE-AI — Auditoria de modo offline/demo (integridade de autenticação)
//
// PROBLEMA CORRIGIDO: antes, `BACKEND_AVAILABLE = !!NEXT_PUBLIC_API_URL`
// controlava SOZINHO se `authApi.login()` fabricava uma sessão falsa
// (`offline-${Date.now()}`) sem NENHUMA verificação de credenciais. Isso
// significava que qualquer build sem a env var configurada — inclusive uma
// implantação de produção mal configurada por engano — criava uma
// identidade autenticada do nada (fail-open). Não havia distinção entre
// "modo demo intencional" e "produção quebrada".
//
// CORREÇÃO: `USE_REAL_BACKEND` decide se o backend real é usado. Nunca é
// verdadeiro em modo demo (isolamento garantido — modo demo NUNCA toca o
// backend real, mesmo que a URL esteja configurada por engano nesse
// ambiente). Login simulado só existe quando `IS_DEMO_MODE` é
// explicitamente verdadeiro (nunca inferido da ausência de configuração).
// Em produção ou desenvolvimento real, backend ausente/indisponível NUNCA
// cria uma sessão — sempre lança um erro claro (`AuthConfigError`/`ApiError`).
// ============================================================

/** Verdadeiro apenas quando o backend real deve ser usado — nunca em modo demo. */
const USE_REAL_BACKEND = !IS_DEMO_MODE && API_URL_CONFIGURED;

// ── Token storage ─────────────────────────────────────────────
const KEY_ACCESS  = 'prescreve_ai_access_token';
const KEY_REFRESH = 'prescreve_ai_refresh_token';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  perfil: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  perfil: string;
  /** Verdadeiro apenas para a sessão simulada do modo demo — nunca para uma sessão autenticada de verdade. */
  demo?: boolean;
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

/**
 * Correção de bug real (auditoria de segurança final, FE-03): antes,
 * clearTokens() removia só as 3 chaves de autenticação — dados clínicos
 * (anamnese, histórico, favoritos de protocolo, timeline, RWE) ficavam em
 * localStorage mesmo depois do logout, legíveis por qualquer script de
 * mesma origem (ou pela próxima pessoa a abrir o navegador, em uma
 * estação de trabalho compartilhada de clínica). Agora remove TODAS as
 * chaves com o prefixo do app (`prescreve_ai_`/`prescreve-ai-`), exceto a
 * preferência de tema (não é dado clínico nem de sessão).
 */
function clearTokens(): void {
  if (typeof window === 'undefined') return;
  const prefixos = ['prescreve_ai_', 'prescreve-ai-'];
  const chaves: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const chave = localStorage.key(i);
    if (chave && prefixos.some((p) => chave.startsWith(p))) {
      chaves.push(chave);
    }
  }
  chaves.forEach((k) => localStorage.removeItem(k));
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

/**
 * Lançado quando o backend é obrigatório (produção/desenvolvimento real)
 * mas não está configurado/disponível — NUNCA silenciado em uma sessão
 * falsa nem em um retorno de sucesso fabricado (RM-38). Estende
 * `NonRetryableError`: reenviar a mesma chamada sem mudar a configuração
 * nunca vai ter sucesso — não faz sentido o motor de sincronização
 * retentar 3× algo que só uma mudança de configuração resolve.
 */
export class AuthConfigError extends NonRetryableError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthConfigError';
  }
}

/**
 * Mensagem padrão de bloqueio quando o backend real é obrigatório mas
 * não está configurado — usada por TODOS os métodos de `consultaApi`/
 * `migracaoApi` que antes retornavam dados fictícios (`demo-${Date.now()}`,
 * arrays vazios) silenciosamente nesse cenário (RM-38). Nunca dispara em
 * modo demo (ver `requireRealBackend` abaixo) — só quando a implantação
 * deveria estar usando um backend real e ele está ausente/mal configurado.
 */
function backendObrigatorioMsg(acao: string): string {
  return IS_PRODUCTION_MODE
    ? `Backend não configurado nesta implantação de produção. ${acao} bloqueado(a) por segurança — nenhum dado é simulado.`
    : `Backend não configurado (NEXT_PUBLIC_API_URL ausente). ${acao} bloqueado(a). Configure um backend real ou ative NEXT_PUBLIC_DEMO_MODE=true explicitamente para usar o modo demonstração.`;
}

/**
 * Checagem usada por todo método de `consultaApi`/`migracaoApi` que tem
 * um caminho de demonstração. Resolução do risco RM-38: a versão
 * anterior usava um único flag (`USE_REAL_BACKEND = !IS_DEMO_MODE &&
 * API_URL_CONFIGURED`) para decidir "usar backend real vs. retornar dado
 * fictício" — isso significava que "produção mal configurada" (não é
 * demo, mas API_URL ausente) caía no MESMO ramo que "modo demo
 * intencional", retornando silenciosamente `{ id: 'demo-...' }` como se
 * uma consulta/prescrição real tivesse sido persistida. Um médico
 * autenticado com uma sessão válida antiga (JWT decodificado por
 * `getCurrentUser()`, que não verifica configuração de backend) nunca
 * saberia que nada foi salvo de verdade.
 *
 * Cada método agora distingue explicitamente os dois casos: `IS_DEMO_MODE`
 * (explícito, nunca em produção — ver app-mode.ts) retorna o valor de
 * demonstração rotulado; qualquer outra ausência de configuração de
 * backend lança `AuthConfigError` via esta função — nunca um sucesso
 * fabricado.
 */
function throwBackendObrigatorio(acao: string): never {
  throw new AuthConfigError(backendObrigatorioMsg(acao));
}

// ══════════════════════════════════════════════════════════════
// AUTH API
// ══════════════════════════════════════════════════════════════

export const authApi = {
  async login(email: string, senha: string, mfa_code?: string): Promise<AuthTokens> {
    if (IS_DEMO_MODE) {
      // Login simulado — SÓ existe quando o modo demo foi ligado
      // explicitamente (NEXT_PUBLIC_DEMO_MODE=true) e o ambiente resolvido
      // não é produção (app-mode.ts nunca honra a flag em produção). Nunca
      // acontece por ausência de configuração.
      const tokens: AuthTokens = {
        access_token: `demo-${Date.now()}`,
        refresh_token: `demo-refresh-${Date.now()}`,
        perfil: 'MEDICO',
      };
      setTokens(tokens);
      return tokens;
    }
    if (!API_URL_CONFIGURED) {
      // Produção ou desenvolvimento real sem backend configurado: NUNCA
      // cria uma sessão. Erro explícito, capturado pela UI (login/page.tsx)
      // e mostrado ao usuário — nunca um catch silencioso.
      throw new AuthConfigError(
        IS_PRODUCTION_MODE
          ? 'Backend não configurado nesta implantação de produção. Login bloqueado por segurança — contate o suporte técnico.'
          : 'Backend não configurado (NEXT_PUBLIC_API_URL ausente). Configure um backend real ou ative NEXT_PUBLIC_DEMO_MODE=true explicitamente para usar o modo demonstração.',
      );
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
    if (IS_DEMO_MODE) {
      throw new AuthConfigError('Cadastro de novo usuário não está disponível em modo demonstração.');
    }
    if (!API_URL_CONFIGURED) {
      throw new AuthConfigError(
        IS_PRODUCTION_MODE
          ? 'Backend não configurado nesta implantação de produção. Cadastro bloqueado por segurança.'
          : 'Backend não configurado (NEXT_PUBLIC_API_URL ausente).',
      );
    }
    const tokens = await apiFetch<AuthTokens>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
    setTokens(tokens);
    return tokens;
  },

  async logout(): Promise<void> {
    if (USE_REAL_BACKEND) {
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
  if (token.startsWith('demo-')) {
    // Um token demo NUNCA é aceito fora do modo demo — proteção contra uma
    // sessão demo antiga sobrevivendo em localStorage após uma troca de
    // build/ambiente (ex.: mesmo navegador usado antes em modo demo e agora
    // apontando para produção). Tratado como não autenticado.
    if (!IS_DEMO_MODE) return null;
    return { id: 'demo-user', email: 'demo@prescreve-ai.local', perfil: 'MEDICO', demo: true };
  }
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
  // Auditoria de privacidade: o CPF NUNCA deve ser hasheado no cliente — um
  // segredo HMAC não pode viver em código de navegador. `paciente_cpf` (se
  // usado) é enviado em texto puro por HTTPS e transformado em
  // HMAC-SHA256 server-side (ver backend/src/common/crypto/identifier-hash.util.ts).
  async criar(dados: { paciente_cpf?: string; anamnese?: object; idempotency_key?: string }) {
    if (IS_DEMO_MODE) return { id: `demo-${Date.now()}`, status: 'em_andamento' };
    if (!API_URL_CONFIGURED) throwBackendObrigatorio('Criação de consulta');
    return apiFetch('/api/consulta', { method: 'POST', body: JSON.stringify(dados) });
  },

  async listar(pagina = 1, limite = 20) {
    if (IS_DEMO_MODE) return { total: 0, consultas: [], pagina, limite };
    if (!API_URL_CONFIGURED) throwBackendObrigatorio('Listagem de consultas');
    return apiFetch(`/api/consultas?pagina=${pagina}&limite=${limite}`);
  },

  /**
   * Busca o detalhe completo de UMA consulta (RM-43) — usada para
   * carregamento SOB DEMANDA (nunca em lote para toda a lista
   * hidratada), quando a UI precisa efetivamente da prescrição real de
   * uma consulta histórica. `null` em modo demo (nunca uma consulta real
   * fictícia) — fora dele, qualquer falha (rede, 404 de ownership)
   * propaga como exceção, nunca um objeto vazio fabricado.
   */
  async buscar(id: string): Promise<ConsultaDetalheResponse | null> {
    if (IS_DEMO_MODE) return null;
    if (!API_URL_CONFIGURED) throwBackendObrigatorio('Busca de consulta');
    return apiFetch<ConsultaDetalheResponse>(`/api/consulta/${id}`);
  },

  async timeline() {
    if (IS_DEMO_MODE) return [];
    if (!API_URL_CONFIGURED) throwBackendObrigatorio('Busca de timeline');
    return apiFetch('/api/timeline');
  },

  async criarDiagnostico(dados: { consulta_id: string; cid: string; descricao: string; confianca?: number; selecionado?: boolean; idempotency_key?: string }) {
    if (IS_DEMO_MODE) return { id: `demo-diag-${Date.now()}`, ...dados };
    if (!API_URL_CONFIGURED) throwBackendObrigatorio('Criação de diagnóstico');
    return apiFetch('/api/diagnostico', { method: 'POST', body: JSON.stringify(dados) });
  },

  async criarPrescricao(dados: { consulta_id: string; diagnostico_id?: string; medicamentos: MedicamentoPrescrito[]; orientacoes?: string; idempotency_key?: string }) {
    if (IS_DEMO_MODE) return { id: `demo-rx-${Date.now()}`, ...dados };
    if (!API_URL_CONFIGURED) throwBackendObrigatorio('Criação de prescrição');
    return apiFetch('/api/prescricao', { method: 'POST', body: JSON.stringify(dados) });
  },

  async salvarRisco(consulta_id: string, score: object, idempotency_key?: string) {
    if (IS_DEMO_MODE) return { id: `demo-risk-${Date.now()}` };
    if (!API_URL_CONFIGURED) throwBackendObrigatorio('Cálculo/gravação de risco');
    return apiFetch('/api/risco', { method: 'POST', body: JSON.stringify({ consulta_id, score, idempotency_key }) });
  },

  async buscarEvidencias(cid: string) {
    if (IS_DEMO_MODE) return [];
    if (!API_URL_CONFIGURED) throwBackendObrigatorio('Busca de evidências');
    return apiFetch(`/api/evidence/${cid}`);
  },

  async buscarRWE(cid: string) {
    if (IS_DEMO_MODE) return [];
    if (!API_URL_CONFIGURED) throwBackendObrigatorio('Busca de RWE');
    return apiFetch(`/api/rwe/${cid}`);
  },
};

// ══════════════════════════════════════════════════════════════
// MIGRAÇÃO API
// ══════════════════════════════════════════════════════════════

export const migracaoApi = {
  async verificarStatus() {
    if (IS_DEMO_MODE) return { migrado: false, prescricoes: 0, validacoes: 0 };
    if (!API_URL_CONFIGURED) throwBackendObrigatorio('Verificação de status de migração');
    return apiFetch<{ migrado: boolean; prescricoes: number; validacoes: number }>('/api/migration/status');
  },

  async migrarLocalStorage(): Promise<{
    prescricoes_migradas: number;
    validacoes_migradas: number;
    erros: string[];
    duracao_ms: number;
  }> {
    // Diferente dos demais métodos: aqui um retorno "soft" (contagem 0 +
    // motivo explícito em `erros`) é apropriado mesmo fora do modo demo,
    // porque a operação em si é informativa por natureza — nenhuma
    // consulta/prescrição/dado clínico é fabricado ou marcado como
    // migrado com sucesso; o não-migrado permanece visivelmente
    // não-migrado, nunca mascarado como concluído.
    if (IS_DEMO_MODE) {
      return {
        prescricoes_migradas: 0,
        validacoes_migradas: 0,
        erros: ['Migração desabilitada em modo demonstração — dados demo nunca são enviados a um backend real.'],
        duracao_ms: 0,
      };
    }
    if (!API_URL_CONFIGURED) {
      return {
        prescricoes_migradas: 0,
        validacoes_migradas: 0,
        erros: [backendObrigatorioMsg('Migração de dados locais')],
        duracao_ms: 0,
      };
    }

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

/** Verdadeiro quando NEXT_PUBLIC_API_URL está configurado (sinal bruto — não considera modo demo). */
export const isApiUrlConfigured = API_URL_CONFIGURED;
/** Verdadeiro apenas quando chamadas ao backend real de fato acontecem (nunca em modo demo). */
export const useRealBackend = USE_REAL_BACKEND;
/** @deprecated use `useRealBackend` — mantido para compatibilidade de import; mesmo valor. */
export const isBackendAvailable = USE_REAL_BACKEND;
export const appMode = APP_MODE;
export const isDemoMode = IS_DEMO_MODE;
export const isProductionMode = IS_PRODUCTION_MODE;
