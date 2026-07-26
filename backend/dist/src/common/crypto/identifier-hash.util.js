"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validarChaveHmacConfigurada = validarChaveHmacConfigurada;
exports.hmacIdentifier = hmacIdentifier;
const crypto = __importStar(require("crypto"));
function getHmacKey(config) {
    const raw = config.get('IDENTIFIER_HMAC_KEY');
    if (!raw || raw.trim().length === 0) {
        throw new Error('Variável de ambiente IDENTIFIER_HMAC_KEY não configurada — obrigatória para pseudonimizar CPF/CRM/IP com segurança. ' +
            "Gere uma chave com: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
    }
    const key = Buffer.from(raw, 'hex');
    if (key.length !== 32) {
        throw new Error('IDENTIFIER_HMAC_KEY deve ter exatamente 32 bytes (64 caracteres hexadecimais).');
    }
    return key;
}
function normalize(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}
function validarChaveHmacConfigurada(config) {
    getHmacKey(config);
}
function hmacIdentifier(config, domain, value) {
    const key = getHmacKey(config);
    const normalized = normalize(value);
    return crypto
        .createHmac('sha256', key)
        .update(`${domain}:${normalized}`)
        .digest('hex');
}
//# sourceMappingURL=identifier-hash.util.js.map