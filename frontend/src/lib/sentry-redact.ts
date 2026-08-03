// ============================================================
// PRESCREVE-AI — Redação de eventos Sentry (observabilidade)
//
// REGRA ABSOLUTA (mesma do backend, ver
// backend/src/common/logging/redact.util.ts): nenhum evento enviado a um
// serviço de terceiros (Sentry) pode conter CPF, senha, secrets ou dado
// clínico em texto puro — mesmo que o campo apareça só em `extra`/
// `contexts`/breadcrumb, nunca na mensagem de erro em si. Aplicado via
// `beforeSend`/`beforeBreadcrumb` em `instrumentation-client.ts` e
// `instrumentation.ts` (servidor).
//
// Este módulo é standalone (sem import de Node/Sentry) para poder rodar
// tanto no client bundle quanto no runtime de servidor sem trazer
// dependência extra.
// ============================================================

const CAMPOS_SENSIVEIS = [
  'senha',
  'password',
  'cpf',
  'crm',
  'cnpj',
  'mfa_secret',
  'mfa_code',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'secret',
  'hmac',
  'dsn',
  // Dados clínicos — nunca em telemetria de erro, mesmo agregados.
  'anamnese',
  'medicamentos',
  'diagnostico',
  'descricao',
  'orientacoes',
  'justificativa',
  'comorbidades',
  'paciente',
  'paciente_nome',
  'queixa_principal',
];

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return CAMPOS_SENSIVEIS.some((campo) => lower.includes(campo));
}

/**
 * Retorna uma cópia de `value` com todo campo sensível (por nome, não por
 * tipo/valor) substituído por `[REDACTED]`. Nunca lança — em caso de
 * estrutura inesperada, prefere redigir de mais a arriscar vazar algo.
 */
export function redactForSentry(value: unknown, depth = 0): unknown {
  if (depth >= MAX_DEPTH) return '[REDACTED: profundidade máxima]';
  if (value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => redactForSentry(item, depth + 1));
  }

  const resultado: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    resultado[key] = isSensitiveKey(key) ? REDACTED : redactForSentry(val, depth + 1);
  }
  return resultado;
}
