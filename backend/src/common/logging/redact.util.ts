// ============================================================
// PRESCREVE-AI — Redação de logs (auditoria de privacidade)
//
// REGRA ABSOLUTA: nenhum log de aplicação (console/Logger — diferente da
// tabela `Auditoria`, que é um registro estruturado e controlado, não um
// log solto) pode conter CPF, senha, secrets ou dados clínicos em texto
// puro. `HttpLoggingInterceptor` (ver arquivo irmão) já não loga corpo de
// requisição/resposta — só método, rota, status e duração. Este utilitário
// existe para qualquer ponto FUTURO que precise logar um objeto
// estruturado (ex.: payload de erro de integração externa): passe por
// `redact()` antes de qualquer `Logger.log/warn/error/debug`.
// ============================================================

/**
 * Nomes de campo (case-insensitive, correspondência parcial) que NUNCA
 * podem aparecer em texto puro num log de aplicação.
 */
const CAMPOS_SENSIVEIS = [
  'senha',
  'password',
  'senha_hash',
  'cpf',
  'crm',
  'cnpj',
  'mfa_secret',
  'mfa_code',
  'code_hash',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'secret',
  'hmac',
  'jwt_secret',
  'idempotency_key',
  // Dados clínicos — nunca em log de aplicação, mesmo agregados.
  'anamnese',
  'medicamentos',
  'diagnostico',
  'descricao',
  'orientacoes',
  'justificativa',
  'comorbidades',
];

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return CAMPOS_SENSIVEIS.some((campo) => lower.includes(campo));
}

/**
 * Retorna uma cópia profunda de `value` com todo campo sensível (por nome,
 * não por tipo/valor) substituído por `[REDACTED]`. Nunca lança — em caso
 * de estrutura inesperada, prefere redigir de mais a arriscar vazar algo.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth >= MAX_DEPTH) return '[REDACTED: profundidade máxima]';
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? REDACTED : redact(val, depth + 1);
    }
    return out;
  }

  return value;
}
