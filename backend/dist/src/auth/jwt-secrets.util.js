"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequiredSecret = getRequiredSecret;
exports.validarSegredosDistintos = validarSegredosDistintos;
const MIN_SECRET_LENGTH = 32;
const MIN_DISTINCT_CHARS = 12;
const KNOWN_WEAK_VALUES = new Set([
    'changeme',
    'change-me',
    'secret',
    'password',
    'prescreve-ai-secret-change-in-prod',
    'prescreve-ai-refresh-secret',
    'troque-por-string-aleatoria-de-64-chars-minimo',
    'troque-por-string-aleatoria-diferente-de-64-chars-minimo',
].map((s) => s.toLowerCase()));
function validarForcaDoSegredo(key, value) {
    if (value.length < MIN_SECRET_LENGTH) {
        throw new Error(`${key} tem apenas ${value.length} caracteres — mínimo exigido: ${MIN_SECRET_LENGTH}. ` +
            "Gere um valor forte com: node -e \"console.log(require('crypto').randomBytes(48).toString('base64'))\"");
    }
    if (KNOWN_WEAK_VALUES.has(value.toLowerCase())) {
        throw new Error(`${key} está definido como um valor de exemplo/placeholder conhecido — isso nunca é seguro em nenhum ambiente.`);
    }
    const distinctChars = new Set(value).size;
    if (distinctChars < MIN_DISTINCT_CHARS) {
        throw new Error(`${key} tem baixa entropia (apenas ${distinctChars} caracteres distintos, mínimo ${MIN_DISTINCT_CHARS}) — ` +
            'parece um valor repetitivo ou trivial, não um segredo gerado aleatoriamente.');
    }
}
function getRequiredSecret(config, key) {
    const value = config.get(key);
    if (!value || value.trim().length === 0) {
        throw new Error(`Variável de ambiente ${key} não configurada — obrigatória para assinar/verificar tokens JWT. ` +
            'Nunca use um valor padrão fixo no código-fonte para segredos de autenticação.');
    }
    validarForcaDoSegredo(key, value);
    return value;
}
function validarSegredosDistintos(config) {
    const jwtSecret = getRequiredSecret(config, 'JWT_SECRET');
    const refreshSecret = getRequiredSecret(config, 'JWT_REFRESH_SECRET');
    if (jwtSecret === refreshSecret) {
        throw new Error('JWT_SECRET e JWT_REFRESH_SECRET não podem ter o mesmo valor — use segredos independentes para cada finalidade.');
    }
}
//# sourceMappingURL=jwt-secrets.util.js.map