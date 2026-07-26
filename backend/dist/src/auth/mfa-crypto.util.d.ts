import { ConfigService } from '@nestjs/config';
export declare function validarChaveMfaConfigurada(config: ConfigService): void;
export declare function encryptMfaSecret(config: ConfigService, plainSecret: string): string;
export declare function decryptMfaSecret(config: ConfigService, encryptedValue: string): string;
