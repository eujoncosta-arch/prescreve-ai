"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var CacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = exports.TTL = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
exports.TTL = {
    GUIDELINES: 3600 * 24,
    EVIDENCE: 3600 * 12,
    PHARMA_DB: 3600 * 6,
    CALCULATIONS: 300,
    TRUST_SCORE: 600,
    RISK_SCORE: 600,
    RWE: 3600 * 4,
};
let CacheService = CacheService_1 = class CacheService {
    config;
    client;
    logger = new common_1.Logger(CacheService_1.name);
    enabled;
    constructor(config) {
        this.config = config;
        const url = config.get('REDIS_URL');
        if (url) {
            this.client = new ioredis_1.default(url, { lazyConnect: true, enableOfflineQueue: false });
            this.client.on('error', (e) => this.logger.warn(`Redis: ${e.message}`));
            this.enabled = true;
        }
        else {
            this.client = null;
            this.enabled = false;
            this.logger.warn('REDIS_URL não configurado — cache desativado');
        }
    }
    async get(key) {
        if (!this.enabled || !this.client)
            return null;
        try {
            const val = await this.client.get(key);
            return val ? JSON.parse(val) : null;
        }
        catch {
            return null;
        }
    }
    async set(key, value, ttl) {
        if (!this.enabled || !this.client)
            return;
        try {
            await this.client.set(key, JSON.stringify(value), 'EX', ttl);
        }
        catch (e) {
            this.logger.warn(`Cache set error: ${e.message}`);
        }
    }
    async del(key) {
        if (!this.enabled || !this.client)
            return;
        try {
            await this.client.del(key);
        }
        catch { }
    }
    async delPattern(pattern) {
        if (!this.enabled || !this.client)
            return;
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length)
                await this.client.del(...keys);
        }
        catch { }
    }
    async onModuleDestroy() {
        if (this.client)
            await this.client.quit();
    }
    key(...parts) {
        return `prescreve:${parts.join(':')}`;
    }
    async getOrSet(key, factory, ttl) {
        const cached = await this.get(key);
        if (cached !== null)
            return cached;
        const fresh = await factory();
        await this.set(key, fresh, ttl);
        return fresh;
    }
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = CacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CacheService);
//# sourceMappingURL=cache.service.js.map