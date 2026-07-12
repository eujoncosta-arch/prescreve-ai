import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare const TTL: {
    GUIDELINES: number;
    EVIDENCE: number;
    PHARMA_DB: number;
    CALCULATIONS: number;
    TRUST_SCORE: number;
    RISK_SCORE: number;
    RWE: number;
};
export declare class CacheService implements OnModuleDestroy {
    private config;
    private readonly client;
    private readonly logger;
    private readonly enabled;
    constructor(config: ConfigService);
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: unknown, ttl: number): Promise<void>;
    del(key: string): Promise<void>;
    delPattern(pattern: string): Promise<void>;
    onModuleDestroy(): Promise<void>;
    key(...parts: string[]): string;
    getOrSet<T>(key: string, factory: () => Promise<T>, ttl: number): Promise<T>;
}
