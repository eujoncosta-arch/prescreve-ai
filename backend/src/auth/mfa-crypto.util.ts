import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

// ============================================================
// PRESCREVE-AI — Criptografia do segredo MFA em repouso
//
// O segredo TOTP NÃO PODE ser hasheado como uma senha (bcrypt/SHA) porque
// precisa ser recuperado em texto puro a cada verificação de login para
// gerar o código esperado (RFC 6238) — hashing unidirecional destruiria
// essa capacidade. A estratégia adequada aqui é criptografia simétrica
// autenticada (AES-256-GCM) com uma chave mantida fora do banco de dados
// (variável de ambiente MFA_ENCRYPTION_KEY), análogo ao tratamento de
// JWT_SECRET (ver jwt-secrets.util.ts): nunca um valor padrão hardcoded,
// sempre fail-fast se a variável de ambiente não estiver configurada.
// ============================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // recomendado para GCM

function getEncryptionKey(config: ConfigService): Buffer {
  const raw = config.get<string>('MFA_ENCRYPTION_KEY');
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      'Variável de ambiente MFA_ENCRYPTION_KEY não configurada — obrigatória para criptografar/descriptografar segredos MFA em repouso. ' +
        "Gere uma chave com: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) {
    throw new Error(
      'MFA_ENCRYPTION_KEY deve ter exatamente 32 bytes (64 caracteres hexadecimais) para uso com AES-256-GCM.',
    );
  }
  return key;
}

/**
 * Valida MFA_ENCRYPTION_KEY no startup (fail-fast), mesmo padrão já usado
 * para JWT_SECRET/JWT_REFRESH_SECRET em main.ts. Corrige gap encontrado na
 * auditoria de segurança final (SECRET-01): sem esta chamada, a chave só
 * era lida lazily no primeiro uso real (setup de MFA), permitindo que o
 * app subisse e passasse health checks em produção sem a variável
 * configurada, falhando só quando um usuário real tentasse ativar MFA.
 */
export function validarChaveMfaConfigurada(config: ConfigService): void {
  getEncryptionKey(config);
}

/** Criptografa o segredo TOTP em texto puro. Formato armazenado: `iv.ciphertext.authTag` (todos base64). */
export function encryptMfaSecret(
  config: ConfigService,
  plainSecret: string,
): string {
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

/** Descriptografa o segredo TOTP para uso momentâneo na verificação — nunca deve ser logado nem retornado em resposta de API. */
export function decryptMfaSecret(
  config: ConfigService,
  encryptedValue: string,
): string {
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
