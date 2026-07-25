"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequiredSecret = getRequiredSecret;
function getRequiredSecret(config, key) {
    const value = config.get(key);
    if (!value || value.trim().length === 0) {
        throw new Error(`Variável de ambiente ${key} não configurada — obrigatória para assinar/verificar tokens JWT. ` +
            'Nunca use um valor padrão fixo no código-fonte para segredos de autenticação.');
    }
    return value;
}
//# sourceMappingURL=jwt-secrets.util.js.map