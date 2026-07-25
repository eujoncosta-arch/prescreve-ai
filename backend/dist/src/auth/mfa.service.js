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
exports.MfaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const otplib_1 = require("otplib");
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../modules/audit/audit.service");
const mfa_crypto_util_1 = require("./mfa-crypto.util");
const TOTP_EPOCH_TOLERANCE_SEGUNDOS = 30;
const MFA_MAX_FALHAS = 5;
const MFA_BLOQUEIO_MINUTOS = 15;
const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_BCRYPT_ROUNDS = 12;
let MfaService = class MfaService {
    prisma;
    config;
    audit;
    constructor(prisma, config, audit) {
        this.prisma = prisma;
        this.config = config;
        this.audit = audit;
    }
    async iniciarAtivacao(usuarioId) {
        const usuario = await this.prisma.usuario.findUnique({
            where: { id: usuarioId },
        });
        if (!usuario)
            throw new common_1.UnauthorizedException();
        if (usuario.mfa_ativo) {
            throw new common_1.ConflictException('MFA já está ativo para este usuário — desative antes de reconfigurar.');
        }
        const secret = (0, otplib_1.generateSecret)();
        const otpauth_url = (0, otplib_1.generateURI)({
            issuer: 'Prescreve-AI',
            label: usuario.email,
            secret,
        });
        const encrypted = (0, mfa_crypto_util_1.encryptMfaSecret)(this.config, secret);
        await this.prisma.usuario.update({
            where: { id: usuarioId },
            data: { mfa_secret: encrypted, mfa_ativo: false },
        });
        return { otpauth_url, secret_base32: secret };
    }
    async confirmarAtivacao(usuarioId, code) {
        const usuario = await this.prisma.usuario.findUnique({
            where: { id: usuarioId },
        });
        if (!usuario)
            throw new common_1.UnauthorizedException();
        if (usuario.mfa_ativo) {
            throw new common_1.ConflictException('MFA já está ativo para este usuário.');
        }
        if (!usuario.mfa_secret) {
            throw new common_1.BadRequestException('Nenhum enrollment de MFA pendente — chame /auth/mfa/setup primeiro.');
        }
        const secret = (0, mfa_crypto_util_1.decryptMfaSecret)(this.config, usuario.mfa_secret);
        const resultado = await (0, otplib_1.verify)({
            secret,
            token: code,
            epochTolerance: TOTP_EPOCH_TOLERANCE_SEGUNDOS,
        });
        if (!resultado.valid) {
            await this.audit.registrarAuditoria({
                usuario_id: usuarioId,
                tipo: 'mfa_verificacao_falha',
                acao: 'Confirmação de ativação de MFA com código TOTP inválido',
            });
            throw new common_1.UnauthorizedException('Código MFA inválido — verifique o aplicativo autenticador e tente novamente.');
        }
        const recoveryCodesPlain = this.gerarCodigosRecuperacaoTexto();
        const hashes = await Promise.all(recoveryCodesPlain.map((c) => bcrypt.hash(c, RECOVERY_CODE_BCRYPT_ROUNDS)));
        await this.prisma.$transaction([
            this.prisma.usuario.update({
                where: { id: usuarioId },
                data: {
                    mfa_ativo: true,
                    mfa_falhas_consecutivas: 0,
                    mfa_bloqueado_ate: null,
                },
            }),
            this.prisma.mfaRecoveryCode.createMany({
                data: hashes.map((code_hash) => ({ usuario_id: usuarioId, code_hash })),
            }),
        ]);
        await this.audit.registrarAuditoria({
            usuario_id: usuarioId,
            tipo: 'mfa_ativado',
            acao: 'MFA (TOTP) ativado com sucesso',
        });
        return { recovery_codes: recoveryCodesPlain };
    }
    async verificarCodigoLogin(usuario, code) {
        if (!code || code.trim().length === 0) {
            throw new common_1.UnauthorizedException('Código MFA obrigatório');
        }
        if (!usuario.mfa_secret) {
            throw new common_1.UnauthorizedException('Configuração de MFA inconsistente — contate o suporte.');
        }
        if (usuario.mfa_bloqueado_ate && usuario.mfa_bloqueado_ate > new Date()) {
            throw new common_1.UnauthorizedException('Muitas tentativas de MFA inválidas — tente novamente mais tarde.');
        }
        const secret = (0, mfa_crypto_util_1.decryptMfaSecret)(this.config, usuario.mfa_secret);
        const totpValido = await (0, otplib_1.verify)({
            secret,
            token: code,
            epochTolerance: TOTP_EPOCH_TOLERANCE_SEGUNDOS,
        })
            .then((r) => r.valid)
            .catch(() => false);
        if (totpValido) {
            await this.resetarFalhas(usuario.id);
            return;
        }
        if (await this.tentarConsumirCodigoRecuperacao(usuario.id, code)) {
            await this.resetarFalhas(usuario.id);
            await this.audit.registrarAuditoria({
                usuario_id: usuario.id,
                tipo: 'mfa_recovery_usado',
                acao: 'Login realizado com código de recuperação MFA (uso único consumido)',
            });
            return;
        }
        await this.registrarFalha(usuario.id);
        throw new common_1.UnauthorizedException('Código MFA inválido');
    }
    async desativar(usuarioId, senhaAtual, code) {
        const usuario = await this.prisma.usuario.findUnique({
            where: { id: usuarioId },
        });
        if (!usuario)
            throw new common_1.UnauthorizedException();
        if (!usuario.mfa_ativo) {
            throw new common_1.BadRequestException('MFA não está ativo para este usuário.');
        }
        const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha_hash);
        if (!senhaValida) {
            throw new common_1.UnauthorizedException('Senha atual incorreta.');
        }
        await this.verificarCodigoLogin(usuario, code);
        await this.prisma.$transaction([
            this.prisma.usuario.update({
                where: { id: usuarioId },
                data: {
                    mfa_ativo: false,
                    mfa_secret: null,
                    mfa_falhas_consecutivas: 0,
                    mfa_bloqueado_ate: null,
                },
            }),
            this.prisma.mfaRecoveryCode.deleteMany({
                where: { usuario_id: usuarioId },
            }),
        ]);
        await this.audit.registrarAuditoria({
            usuario_id: usuarioId,
            tipo: 'mfa_desativado',
            acao: 'MFA desativado após reautenticação (senha + código MFA)',
        });
    }
    gerarCodigosRecuperacaoTexto() {
        return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
            const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
            return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
        });
    }
    async tentarConsumirCodigoRecuperacao(usuarioId, code) {
        const candidatos = await this.prisma.mfaRecoveryCode.findMany({
            where: { usuario_id: usuarioId, usado: false },
        });
        for (const candidato of candidatos) {
            const confere = await bcrypt.compare(code, candidato.code_hash);
            if (confere) {
                const atualizado = await this.prisma.mfaRecoveryCode.updateMany({
                    where: { id: candidato.id, usado: false },
                    data: { usado: true, usado_em: new Date() },
                });
                if (atualizado.count === 1)
                    return true;
            }
        }
        return false;
    }
    async resetarFalhas(usuarioId) {
        await this.prisma.usuario.update({
            where: { id: usuarioId },
            data: { mfa_falhas_consecutivas: 0, mfa_bloqueado_ate: null },
        });
    }
    async registrarFalha(usuarioId) {
        const usuario = await this.prisma.usuario.update({
            where: { id: usuarioId },
            data: { mfa_falhas_consecutivas: { increment: 1 } },
        });
        await this.audit.registrarAuditoria({
            usuario_id: usuarioId,
            tipo: 'mfa_verificacao_falha',
            acao: `Código MFA inválido (falha ${usuario.mfa_falhas_consecutivas}/${MFA_MAX_FALHAS})`,
        });
        if (usuario.mfa_falhas_consecutivas >= MFA_MAX_FALHAS) {
            const bloqueado_ate = new Date(Date.now() + MFA_BLOQUEIO_MINUTOS * 60_000);
            await this.prisma.usuario.update({
                where: { id: usuarioId },
                data: { mfa_bloqueado_ate: bloqueado_ate },
            });
            await this.audit.registrarAuditoria({
                usuario_id: usuarioId,
                tipo: 'mfa_bloqueado',
                acao: `MFA bloqueado por ${MFA_BLOQUEIO_MINUTOS} minutos após ${MFA_MAX_FALHAS} falhas consecutivas`,
            });
        }
    }
};
exports.MfaService = MfaService;
exports.MfaService = MfaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        audit_service_1.AuditService])
], MfaService);
//# sourceMappingURL=mfa.service.js.map