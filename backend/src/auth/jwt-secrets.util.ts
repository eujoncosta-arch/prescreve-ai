import { ConfigService } from '@nestjs/config';

/**
 * Lê um segredo JWT obrigatório do ambiente e falha ALTO (erro no bootstrap/
 * primeira chamada) se ausente — nunca cai silenciosamente para um valor
 * padrão hardcoded no código-fonte. Um fallback fixo (ex.: "troque-em-prod")
 * permitiria forjar tokens válidos (bypass total de autenticação) em
 * qualquer ambiente onde a variável de ambiente não tenha sido configurada.
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
  return value;
}
