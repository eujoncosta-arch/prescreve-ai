"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redact = redact;
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
function isSensitiveKey(key) {
    const lower = key.toLowerCase();
    return CAMPOS_SENSIVEIS.some((campo) => lower.includes(campo));
}
function redact(value, depth = 0) {
    if (depth >= MAX_DEPTH)
        return '[REDACTED: profundidade máxima]';
    if (value === null || value === undefined)
        return value;
    if (Array.isArray(value)) {
        return value.map((item) => redact(item, depth + 1));
    }
    if (typeof value === 'object') {
        const out = {};
        for (const [key, val] of Object.entries(value)) {
            out[key] = isSensitiveKey(key) ? REDACTED : redact(val, depth + 1);
        }
        return out;
    }
    return value;
}
//# sourceMappingURL=redact.util.js.map