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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
function hashSHA256(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}
function djb2Hash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) + h) + s.charCodeAt(i);
        h |= 0;
    }
    return `H${Math.abs(h).toString(36).toUpperCase().padStart(8, '0')}`;
}
let AuthService = class AuthService {
    prisma;
    jwt;
    config;
    constructor(prisma, jwt, config) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
    }
    async register(dto) {
        const existing = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
        if (existing)
            throw new common_1.ConflictException('E-mail já cadastrado');
        const perfil = dto.perfil;
        const validPerfis = ['MEDICO', 'ADMIN', 'LABORATORIO', 'HOSPITAL', 'AUDITOR'];
        if (!validPerfis.includes(perfil))
            throw new common_1.BadRequestException('Perfil inválido');
        const senha_hash = await bcrypt.hash(dto.senha, 12);
        const usuario = await this.prisma.usuario.create({
            data: {
                email: dto.email,
                senha_hash,
                perfil,
                ...(perfil === 'MEDICO' && dto.crm && {
                    medico: {
                        create: {
                            crm_hash: djb2Hash(dto.crm),
                            especialidade: dto.especialidade ?? 'clinica_medica',
                            uf: dto.uf ?? 'SP',
                        },
                    },
                }),
            },
            include: { medico: true },
        });
        return this.gerarTokens(usuario.id, usuario.email, usuario.perfil);
    }
    async login(dto, ip) {
        const usuario = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
        if (!usuario || !usuario.ativo)
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        const senhaValida = await bcrypt.compare(dto.senha, usuario.senha_hash);
        if (!senhaValida) {
            await this.registrarAuditoria(usuario.id, 'login', 'FALHA — senha incorreta', ip);
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        }
        if (usuario.mfa_ativo && !dto.mfa_code) {
            throw new common_1.UnauthorizedException('Código MFA obrigatório');
        }
        await this.registrarAuditoria(usuario.id, 'login', 'SUCESSO', ip);
        return this.gerarTokens(usuario.id, usuario.email, usuario.perfil);
    }
    async refresh(token) {
        const hash = hashSHA256(token);
        const rt = await this.prisma.refreshToken.findUnique({
            where: { token_hash: hash },
            include: { usuario: true },
        });
        if (!rt || rt.revogado || rt.expira_em < new Date()) {
            throw new common_1.UnauthorizedException('Refresh token inválido ou expirado');
        }
        await this.prisma.refreshToken.update({ where: { id: rt.id }, data: { revogado: true } });
        return this.gerarTokens(rt.usuario.id, rt.usuario.email, rt.usuario.perfil);
    }
    async logout(userId) {
        await this.prisma.refreshToken.updateMany({
            where: { usuario_id: userId, revogado: false },
            data: { revogado: true },
        });
        return { message: 'Logout realizado com sucesso' };
    }
    async gerarTokens(userId, email, perfil) {
        const payload = { sub: userId, email, perfil };
        const secret = this.config.get('JWT_SECRET', 'prescreve-ai-secret-change-in-prod');
        const refreshSecret = this.config.get('JWT_REFRESH_SECRET', 'prescreve-ai-refresh-secret');
        const [access_token, refresh_token] = await Promise.all([
            this.jwt.signAsync(payload, { secret, expiresIn: '15m' }),
            this.jwt.signAsync(payload, { secret: refreshSecret, expiresIn: '7d' }),
        ]);
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 7);
        await this.prisma.refreshToken.create({
            data: {
                token_hash: hashSHA256(refresh_token),
                usuario_id: userId,
                expira_em: expiry,
            },
        });
        return { access_token, refresh_token, perfil };
    }
    async registrarAuditoria(userId, tipo, acao, ip) {
        const dados = JSON.stringify({ userId, tipo, acao });
        const hash = hashSHA256(dados + Date.now().toString());
        await this.prisma.auditoria.create({
            data: {
                usuario_id: userId,
                tipo: 'login',
                acao,
                ip_hash: ip ? hashSHA256(ip) : null,
                hash_integridade: hash,
            },
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map