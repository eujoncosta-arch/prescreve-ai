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
exports.ConsultaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const cache_service_1 = require("../cache/cache.service");
const audit_service_1 = require("../audit/audit.service");
const crypto = __importStar(require("crypto"));
function hashIntegridade(obj) {
    return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}
let ConsultaService = class ConsultaService {
    prisma;
    cache;
    audit;
    constructor(prisma, cache, audit) {
        this.prisma = prisma;
        this.cache = cache;
        this.audit = audit;
    }
    async criarConsulta(dto, usuarioId) {
        let pacienteId;
        if (dto.paciente_hash) {
            const paciente = await this.prisma.paciente.upsert({
                where: { hash_identidade: dto.paciente_hash },
                create: {
                    hash_identidade: dto.paciente_hash,
                    idade: dto.anamnese?.idade ?? 0,
                    sexo: dto.anamnese?.sexo ?? 'M',
                    comorbidades: dto.anamnese?.comorbidades ?? [],
                },
                update: {},
            });
            pacienteId = paciente.id;
        }
        const consulta = await this.prisma.consulta.create({
            data: {
                usuario_id: usuarioId,
                paciente_id: pacienteId,
                anamnese: dto.anamnese,
            },
        });
        await this.audit.registrarAuditoria({
            usuario_id: usuarioId,
            tipo: 'consulta_criada',
            acao: `Consulta ${consulta.id} criada`,
            recurso: `consulta:${consulta.id}`,
        });
        return consulta;
    }
    async listarConsultas(usuarioId, pagina = 1, limite = 20) {
        const skip = (pagina - 1) * limite;
        const [total, consultas] = await Promise.all([
            this.prisma.consulta.count({ where: { usuario_id: usuarioId, deletado_em: null } }),
            this.prisma.consulta.findMany({
                where: { usuario_id: usuarioId, deletado_em: null },
                orderBy: { criado_em: 'desc' },
                skip, take: limite,
                include: {
                    diagnosticos: { where: { selecionado: true }, take: 1 },
                    prescricoes: { take: 1, select: { id: true, status: true } },
                },
            }),
        ]);
        return { total, pagina, limite, consultas };
    }
    async buscarConsulta(id, usuarioId) {
        const consulta = await this.prisma.consulta.findFirst({
            where: { id, usuario_id: usuarioId, deletado_em: null },
            include: {
                diagnosticos: true,
                prescricoes: { include: { registros: true } },
                risco_scores: { take: 1, orderBy: { criado_em: 'desc' } },
                trust_scores: true,
            },
        });
        if (!consulta)
            throw new common_1.NotFoundException('Consulta não encontrada');
        return consulta;
    }
    async criarDiagnostico(dto, usuarioId) {
        const consulta = await this.prisma.consulta.findFirst({
            where: { id: dto.consulta_id, usuario_id: usuarioId },
        });
        if (!consulta)
            throw new common_1.ForbiddenException('Consulta não pertence a este usuário');
        const diagnostico = await this.prisma.diagnostico.create({
            data: {
                consulta_id: dto.consulta_id,
                cid: dto.cid,
                descricao: dto.descricao,
                confianca: dto.confianca ?? 1.0,
                selecionado: dto.selecionado ?? false,
            },
        });
        await this.audit.registrarAuditoria({
            usuario_id: usuarioId,
            tipo: 'diagnostico_selecionado',
            acao: `Diagnóstico ${dto.cid} registrado`,
            recurso: `diagnostico:${diagnostico.id}`,
            dados_entrada: { cid: dto.cid },
        });
        return diagnostico;
    }
    async criarPrescricao(dto, usuarioId) {
        const consulta = await this.prisma.consulta.findFirst({
            where: { id: dto.consulta_id, usuario_id: usuarioId },
        });
        if (!consulta)
            throw new common_1.ForbiddenException();
        const hash = hashIntegridade({ ...dto, usuario_id: usuarioId, ts: Date.now() });
        const prescricao = await this.prisma.prescricao.create({
            data: {
                consulta_id: dto.consulta_id,
                diagnostico_id: dto.diagnostico_id,
                medicamentos: dto.medicamentos,
                orientacoes: dto.orientacoes,
                validade_dias: dto.validade_dias ?? 30,
                hash_integridade: hash,
            },
        });
        await this.audit.registrarAuditoria({
            usuario_id: usuarioId,
            tipo: 'prescricao_gerada',
            acao: `Prescrição ${prescricao.id} gerada`,
            recurso: `prescricao:${prescricao.id}`,
            dados_entrada: { moleculas: dto.medicamentos.map(m => m.molecula) },
        });
        return prescricao;
    }
    async salvarRiskScore(consultaId, score, usuarioId) {
        return this.prisma.riskScore.create({
            data: {
                consulta_id: consultaId,
                risco_global: score.risco_global,
                score_global: Number(score.score_global ?? 0),
                alerta_vermelho: Boolean(score.alerta_vermelho),
                risco_cardiovascular: (score.risco_cardiovascular ?? {}),
                risco_renal: (score.risco_renal ?? {}),
                risco_hemorragico: (score.risco_hemorragico ?? {}),
                risco_farmacologico: (score.risco_farmacologico ?? {}),
                risco_interacao: (score.risco_interacao ?? {}),
                risco_terapeutico: (score.risco_terapeutico ?? {}),
                recomendacoes: score.recomendacoes_prioritarias ?? [],
            },
        });
    }
    async buscarEvidencias(cid) {
        const key = this.cache.key('evidence', cid);
        return this.cache.getOrSet(key, () => this.prisma.evidencia.findMany({
            where: { cid },
            orderBy: [{ nivel_evidencia: 'asc' }, { ano: 'desc' }],
        }), cache_service_1.TTL.EVIDENCE);
    }
    async buscarRWE(cid) {
        const key = this.cache.key('rwe', cid);
        return this.cache.getOrSet(key, () => this.prisma.rWE.findMany({ where: { cid }, orderBy: { criado_em: 'desc' } }), cache_service_1.TTL.RWE);
    }
    async buscarTimeline(usuarioId) {
        return this.prisma.consulta.findMany({
            where: { usuario_id: usuarioId, deletado_em: null },
            orderBy: { criado_em: 'desc' },
            take: 50,
            select: {
                id: true, status: true, criado_em: true,
                diagnosticos: { where: { selecionado: true }, select: { cid: true, descricao: true } },
            },
        });
    }
};
exports.ConsultaService = ConsultaService;
exports.ConsultaService = ConsultaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService,
        audit_service_1.AuditService])
], ConsultaService);
//# sourceMappingURL=consulta.service.js.map