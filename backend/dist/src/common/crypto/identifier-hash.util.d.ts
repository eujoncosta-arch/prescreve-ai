import { ConfigService } from '@nestjs/config';
export type IdentifierDomain = 'cpf' | 'crm' | 'cnpj' | 'ip';
export declare function hmacIdentifier(config: ConfigService, domain: IdentifierDomain, value: string): string;
