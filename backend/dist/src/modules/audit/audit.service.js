"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const crypto = __importStar(require("crypto"));
let AuditService = class AuditService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async registrarAuditoria(input) {
        const { ip, ...rest } = input;
        const ip_hash = ip ? crypto.createHash('sha256').update(ip).digest('hex') : undefined;
        const payload = JSON.stringify({ ...rest, ip_hash, timestamp: Date.now() });
        const hash_integridade = crypto.createHash('sha256').update(payload).digest('hex');
        return this.prisma.auditoria.create({
            data: {
                usuario_id: input.usuario_id,
                crm_hash: input.crm_hash,
                tipo: input.tipo,
                acao: input.acao,
                recurso: input.recurso,
                dados_entrada: input.dados_entrada,
                dados_saida: input.dados_saida,
                ip_hash,
                guideline_ref: input.guideline_ref,
                evidencia_ref: input.evidencia_ref,
                hash_integridade,
            },
        });
    }
    async buscarAuditoria(filtros) {
        const { pagina = 1, limite = 50, ...where } = filtros;
        const skip = (pagina - 1) * limite;
        const [total, registros] = await Promise.all([
            this.prisma.auditoria.count({ where }),
            this.prisma.auditoria.findMany({
                where,
                orderBy: { timestamp: 'desc' },
                skip,
                take: limite,
                select: {
                    id: true, tipo: true, acao: true, recurso: true,
                    ip_hash: true, hash_integridade: true, timestamp: true,
                    crm_hash: true, guideline_ref: true, evidencia_ref: true,
                },
            }),
        ]);
        return { total, pagina, limite, registros };
    }
    async exportarAuditoria(usuario_id, formato = 'json') {
        const registros = await this.prisma.auditoria.findMany({
            where: { usuario_id },
            orderBy: { timestamp: 'desc' },
            take: 10000,
        });
        if (formato === 'json')
            return JSON.stringify(registros, null, 2);
        const header = 'id,tipo,acao,recurso,hash_integridade,timestamp';
        const rows = registros.map(r => `${r.id},${r.tipo},${r.acao},${r.recurso ?? ''},${r.hash_integridade},${r.timestamp.toISOString()}`);
        return [header, ...rows].join('\n');
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map