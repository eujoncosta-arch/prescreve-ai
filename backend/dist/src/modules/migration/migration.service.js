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
var MigrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const crypto = __importStar(require("crypto"));
let MigrationService = MigrationService_1 = class MigrationService {
    prisma;
    audit;
    logger = new common_1.Logger(MigrationService_1.name);
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async migrarHistorico(usuarioId, dados) {
        const inicio = Date.now();
        const erros = [];
        let prescricoes_migradas = 0;
        let validacoes_migradas = 0;
        const consulta = await this.prisma.consulta.create({
            data: {
                usuario_id: usuarioId,
                status: 'concluida',
                anamnese: { origem: 'migracao_localStorage', dados: (dados.consultas ?? []) },
            },
        });
        for (const rx of dados.prescricoes ?? []) {
            try {
                const hash = crypto.createHash('sha256')
                    .update(JSON.stringify({ ...rx, ts: Date.now() }))
                    .digest('hex');
                await this.prisma.prescricao.create({
                    data: {
                        consulta_id: consulta.id,
                        medicamentos: rx.medicamentos ?? [],
                        orientacoes: rx.orientacoes,
                        hash_integridade: hash,
                        status: 'finalizada',
                    },
                });
                prescricoes_migradas++;
            }
            catch (e) {
                erros.push(`Prescrição ${rx.id ?? '?'}: ${e.message}`);
            }
        }
        for (const val of dados.validacoes ?? []) {
            try {
                await this.prisma.medicalValidation.create({
                    data: {
                        validador_id: usuarioId,
                        crm_hash: val.crm_hash ?? 'migracao',
                        especialidade: val.especialidade ?? 'clinica_medica',
                        veredicto: val.veredicto,
                        justificativa: val.justificativa,
                        status: 'aprovado',
                    },
                });
                validacoes_migradas++;
            }
            catch (e) {
                erros.push(`Validação ${val.id ?? '?'}: ${e.message}`);
            }
        }
        const duracao_ms = Date.now() - inicio;
        await this.audit.registrarAuditoria({
            usuario_id: usuarioId,
            tipo: 'migracao',
            acao: `Migração localStorage: ${prescricoes_migradas} prescrições, ${validacoes_migradas} validações`,
            dados_saida: { prescricoes_migradas, validacoes_migradas, erros },
        });
        this.logger.log(`Migração concluída: ${prescricoes_migradas}rx, ${validacoes_migradas}val, ${erros.length} erros — ${duracao_ms}ms`);
        return { prescricoes_migradas, validacoes_migradas, erros, duracao_ms };
    }
    async verificarStatusMigracao(usuarioId) {
        const [prescricoes, validacoes] = await Promise.all([
            this.prisma.prescricao.count({
                where: { consulta: { usuario_id: usuarioId } },
            }),
            this.prisma.medicalValidation.count({ where: { validador_id: usuarioId } }),
        ]);
        return { migrado: prescricoes > 0 || validacoes > 0, prescricoes, validacoes };
    }
};
exports.MigrationService = MigrationService;
exports.MigrationService = MigrationService = MigrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], MigrationService);
//# sourceMappingURL=migration.service.js.map