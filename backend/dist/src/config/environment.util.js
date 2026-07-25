"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAppEnv = resolveAppEnv;
exports.parseCsvEnv = parseCsvEnv;
const VALID_ENVS = new Set([
    'development',
    'staging',
    'production',
]);
function resolveAppEnv(config) {
    const raw = (config.get('APP_ENV') ??
        config.get('NODE_ENV') ??
        'development')
        .trim()
        .toLowerCase();
    if (VALID_ENVS.has(raw))
        return raw;
    return 'production';
}
function parseCsvEnv(value) {
    if (!value)
        return [];
    return value
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}
//# sourceMappingURL=environment.util.js.map