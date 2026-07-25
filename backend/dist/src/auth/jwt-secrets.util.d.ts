import { ConfigService } from '@nestjs/config';
export declare function getRequiredSecret(config: ConfigService, key: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string;
