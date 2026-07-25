"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAllowedOrigins = resolveAllowedOrigins;
exports.buildCorsOriginHandler = buildCorsOriginHandler;
const environment_util_1 = require("./environment.util");
const PRODUCTION_DEFAULT_ORIGINS = [
    'https://frontend-eujoncosta.vercel.app',
    'https://frontend-git-main-eujoncosta.vercel.app',
    'https://frontend-sand-theta-f0vu1100lu.vercel.app',
];
const DEVELOPMENT_DEFAULT_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
];
function resolveAllowedOrigins(config) {
    const env = (0, environment_util_1.resolveAppEnv)(config);
    const extra = (0, environment_util_1.parseCsvEnv)(config.get('CORS_ALLOWED_ORIGINS'));
    const frontendUrl = config.get('FRONTEND_URL');
    if (env === 'production') {
        const origins = new Set([...PRODUCTION_DEFAULT_ORIGINS, ...extra]);
        if (frontendUrl)
            origins.add(frontendUrl);
        return [...origins];
    }
    if (env === 'staging') {
        const origins = new Set(extra);
        if (frontendUrl)
            origins.add(frontendUrl);
        return [...origins];
    }
    const origins = new Set([...DEVELOPMENT_DEFAULT_ORIGINS, ...extra]);
    if (frontendUrl)
        origins.add(frontendUrl);
    return [...origins];
}
function buildCorsOriginHandler(allowedOrigins) {
    const allowedSet = new Set(allowedOrigins);
    return (origin, callback) => {
        if (!origin) {
            callback(null, true);
            return;
        }
        if (allowedSet.has(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error(`Origem não autorizada pelo CORS: ${origin}`), false);
    };
}
//# sourceMappingURL=cors.util.js.map