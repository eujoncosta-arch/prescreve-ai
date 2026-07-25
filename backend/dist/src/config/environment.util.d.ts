import { ConfigService } from '@nestjs/config';
export type AppEnv = 'development' | 'staging' | 'production';
export declare function resolveAppEnv(config: ConfigService): AppEnv;
export declare function parseCsvEnv(value: string | undefined): string[];
