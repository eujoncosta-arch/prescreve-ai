import { ConfigService } from '@nestjs/config';

// ============================================================
// PRESCREVE-AI — Hardening de infraestrutura: segredos JWT
//
// Regras (auditoria de hardening):
//   1. NUNCA um fallback hardcoded — ausência de variável de ambiente é
//      erro fatal, lançado durante a construção dos providers que dependem
//      do segredo (JwtStrategy, JwtModule.registerAsync), ou seja, ANTES de
//      `app.listen()` — a aplicação falha no startup, não numa requisição.
//   2. Comprimento mínimo de 32 caracteres (≥ 256 bits quando o valor é
//      hex/base64 — padrão de mercado para segredos HMAC-SHA).
//   3. Entropia mínima heurística: pelo menos 12 caracteres distintos e
//      ausência de padrões triviais (repetição de um único caractere,
//      sequências numéricas simples). Isto não é uma medida formal de
//      entropia (bits de Shannon) — é uma barreira contra os erros mais
//      comuns (placeholder copiado sem editar, string repetida, etc.).
//   4. JWT_SECRET e JWT_REFRESH_SECRET NUNCA podem ser iguais entre si —
//      caso contrário um refresh token forjado poderia ser aceito como
//      access token (e vice-versa) caso algum código verifique com o
//      segredo errado por engano.
// ============================================================

const MIN_SECRET_LENGTH = 32;
const MIN_DISTINCT_CHARS = 12;

/** Placeholders/valores triviais conhecidos — nunca aceitos, mesmo que passem no comprimento mínimo. */
const KNOWN_WEAK_VALUES = new Set(
  [
    'changeme',
    'change-me',
    'secret',
    'password',
    'prescreve-ai-secret-change-in-prod',
    'prescreve-ai-refresh-secret',
    'troque-por-string-aleatoria-de-64-chars-minimo',
    'troque-por-string-aleatoria-diferente-de-64-chars-minimo',
  ].map((s) => s.toLowerCase()),
);

function validarForcaDoSegredo(key: string, value: string): void {
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `${key} tem apenas ${value.length} caracteres — mínimo exigido: ${MIN_SECRET_LENGTH}. ` +
        "Gere um valor forte com: node -e \"console.log(require('crypto').randomBytes(48).toString('base64'))\"",
    );
  }

  if (KNOWN_WEAK_VALUES.has(value.toLowerCase())) {
    throw new Error(
      `${key} está definido como um valor de exemplo/placeholder conhecido — isso nunca é seguro em nenhum ambiente.`,
    );
  }

  const distinctChars = new Set(value).size;
  if (distinctChars < MIN_DISTINCT_CHARS) {
    throw new Error(
      `${key} tem baixa entropia (apenas ${distinctChars} caracteres distintos, mínimo ${MIN_DISTINCT_CHARS}) — ` +
        'parece um valor repetitivo ou trivial, não um segredo gerado aleatoriamente.',
    );
  }
}

/**
 * Lê um segredo JWT obrigatório do ambiente e falha ALTO (erro no bootstrap/
 * primeira chamada) se ausente — nunca cai silenciosamente para um valor
 * padrão hardcoded no código-fonte. Um fallback fixo (ex.: "troque-em-prod")
 * permitiria forjar tokens válidos (bypass total de autenticação) em
 * qualquer ambiente onde a variável de ambiente não tenha sido configurada.
 *
 * Também valida comprimento mínimo e entropia heurística mínima — nunca
 * grava o valor do segredo em nenhuma mensagem de erro/log (as mensagens
 * citam apenas o NOME da variável, nunca seu conteúdo).
 */
export function getRequiredSecret(
  config: ConfigService,
  key: 'JWT_SECRET' | 'JWT_REFRESH_SECRET',
): string {
  const value = config.get<string>(key);
  if (!value || value.trim().length === 0) {
    throw new Error(
      `Variável de ambiente ${key} não configurada — obrigatória para assinar/verificar tokens JWT. ` +
        'Nunca use um valor padrão fixo no código-fonte para segredos de autenticação.',
    );
  }

  validarForcaDoSegredo(key, value);

  return value;
}

/**
 * Validação cruzada adicional: JWT_SECRET e JWT_REFRESH_SECRET nunca podem
 * ser o mesmo valor. Chamada uma vez no bootstrap (ver `main.ts`).
 */
export function validarSegredosDistintos(config: ConfigService): void {
  const jwtSecret = getRequiredSecret(config, 'JWT_SECRET');
  const refreshSecret = getRequiredSecret(config, 'JWT_REFRESH_SECRET');
  if (jwtSecret === refreshSecret) {
    throw new Error(
      'JWT_SECRET e JWT_REFRESH_SECRET não podem ter o mesmo valor — use segredos independentes para cada finalidade.',
    );
  }
}
