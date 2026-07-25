import { ConfigService } from '@nestjs/config';
export declare function resolveAllowedOrigins(config: ConfigService): string[];
export declare function buildCorsOriginHandler(allowedOrigins: string[]): (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void;
