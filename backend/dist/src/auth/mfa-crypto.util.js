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
exports.encryptMfaSecret = encryptMfaSecret;
exports.decryptMfaSecret = decryptMfaSecret;
const crypto = __importStar(require("crypto"));
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
function getEncryptionKey(config) {
    const raw = config.get('MFA_ENCRYPTION_KEY');
    if (!raw || raw.trim().length === 0) {
        throw new Error('Variável de ambiente MFA_ENCRYPTION_KEY não configurada — obrigatória para criptografar/descriptografar segredos MFA em repouso. ' +
            "Gere uma chave com: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
    }
    const key = Buffer.from(raw, 'hex');
    if (key.length !== 32) {
        throw new Error('MFA_ENCRYPTION_KEY deve ter exatamente 32 bytes (64 caracteres hexadecimais) para uso com AES-256-GCM.');
    }
    return key;
}
function encryptMfaSecret(config, plainSecret) {
    const key = getEncryptionKey(config);
    const iv = crypto.randomBytes(IV_LENGTH_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plainSecret, 'utf8'),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
        iv.toString('base64'),
        encrypted.toString('base64'),
        authTag.toString('base64'),
    ].join('.');
}
function decryptMfaSecret(config, encryptedValue) {
    const key = getEncryptionKey(config);
    const parts = encryptedValue.split('.');
    if (parts.length !== 3) {
        throw new Error('Formato de segredo MFA criptografado inválido.');
    }
    const [ivB64, dataB64, tagB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
}
//# sourceMappingURL=mfa-crypto.util.js.map