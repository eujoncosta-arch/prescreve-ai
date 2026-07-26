import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// ============================================================
// PRESCREVE-AI — Pseudonimização de identificadores de baixa entropia
// (CPF, CRM, IP) — auditoria de privacidade
//
// PROBLEMA CORRIGIDO: identificadores pessoais de baixa entropia (CPF —
// ~10^9 valores possíveis considerando os dígitos verificadores; CRM —
// poucos milhões de combinações plausíveis por UF; IPv4 — 2^32) eram
// "protegidos" com hash rápido e SEM segredo:
//   - CRM: `djb2Hash()` — hash NÃO CRIPTOGRÁFICO (soma ponderada de 32
//     bits), trivialmente reversível e com colisões frequentes — pior que
//     não ter proteção nenhuma, porque passa a falsa impressão de que há.
//   - IP: `crypto.createHash('sha256')` SEM segredo — criptograficamente
//     correto como PRIMITIVA, mas sem HMAC/pepper um atacante com acesso
//     ao banco (ou a um dump) pode gerar um rainbow table de TODOS os
//     ~4,3 bilhões de IPv4 (ou de todos os CPFs matematicamente válidos —
//     muito menos que 10^11 depois dos dígitos verificadores) em minutos
//     com hardware comum, e reidentificar cada registro.
//
// CORREÇÃO: HMAC-SHA256 com uma chave mantida exclusivamente no servidor
// (`IDENTIFIER_HMAC_KEY`, nunca no código-fonte, nunca no cliente —
// mesmo padrão fail-fast já usado para JWT_SECRET/MFA_ENCRYPTION_KEY).
// Sem a chave, um atacante não consegue reconstruir o rainbow table —
// precisa da chave E de força bruta, não só de força bruta. Prefixos de
// domínio (`cpf:`, `crm:`, `ip:`) evitam que o mesmo valor bruto usado em
// dois contextos diferentes produza o mesmo hash (separação de domínio).
// ============================================================

export type IdentifierDomain = 'cpf' | 'crm' | 'cnpj' | 'ip';

function getHmacKey(config: ConfigService): Buffer {
  const raw = config.get<string>('IDENTIFIER_HMAC_KEY');
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      'Variável de ambiente IDENTIFIER_HMAC_KEY não configurada — obrigatória para pseudonimizar CPF/CRM/IP com segurança. ' +
        "Gere uma chave com: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) {
    throw new Error(
      'IDENTIFIER_HMAC_KEY deve ter exatamente 32 bytes (64 caracteres hexadecimais).',
    );
  }
  return key;
}

/**
 * Normaliza um identificador antes do HMAC — remove tudo que não seja
 * dígito/letra e converte para minúsculas, para que variações de
 * formatação do mesmo valor (ex.: "123.456.789-09" vs "12345678909",
 * "CRM-SP 123456" vs "sp123456") produzam sempre o mesmo hash. Nunca
 * retornado ao cliente nem logado — apenas usado internamente antes do
 * HMAC.
 */
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * HMAC-SHA256 de um identificador de baixa entropia, com separação de
 * domínio e chave exclusivamente server-side. NUNCA loga `value` (a
 * assinatura só aceita a string bruta como parâmetro em memória — não há
 * nenhum `console.log`/`Logger` neste módulo).
 */
export function hmacIdentifier(
  config: ConfigService,
  domain: IdentifierDomain,
  value: string,
): string {
  const key = getHmacKey(config);
  const normalized = normalize(value);
  return crypto
    .createHmac('sha256', key)
    .update(`${domain}:${normalized}`)
    .digest('hex');
}
