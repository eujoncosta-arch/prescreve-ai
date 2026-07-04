import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// TTL constants (seconds)
export const TTL = {
  GUIDELINES:   3600 * 24,    // 24h — diretrizes mudam raramente
  EVIDENCE:     3600 * 12,    // 12h
  PHARMA_DB:    3600 * 6,     // 6h
  CALCULATIONS: 300,           // 5min — cálculos personalizados
  TRUST_SCORE:  600,           // 10min
  RISK_SCORE:   600,
  RWE:          3600 * 4,
};

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly client: Redis | null;
  private readonly logger = new Logger(CacheService.name);
  private readonly enabled: boolean;

  constructor(private config: ConfigService) {
    const url = config.get<string>('REDIS_URL');
    if (url) {
      this.client = new Redis(url, { lazyConnect: true, enableOfflineQueue: false });
      this.client.on('error', (e) => this.logger.warn(`Redis: ${e.message}`));
      this.enabled = true;
    } else {
      this.client = null;
      this.enabled = false;
      this.logger.warn('REDIS_URL não configurado — cache desativado');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.client) return null;
    try {
      const val = await this.client.get(key);
      return val ? (JSON.parse(val) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttl: number): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (e) {
      this.logger.warn(`Cache set error: ${(e as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.enabled || !this.client) return;
    try { await this.client.del(key); } catch {}
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length) await this.client.del(...keys);
    } catch {}
  }

  async onModuleDestroy() {
    if (this.client) await this.client.quit();
  }

  // ── Helpers de domínio ─────────────────────────────────────

  key(...parts: string[]) {
    return `prescreve:${parts.join(':')}`;
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await factory();
    await this.set(key, fresh, ttl);
    return fresh;
  }
}
