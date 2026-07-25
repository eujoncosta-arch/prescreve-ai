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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MfaController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const mfa_service_1 = require("./mfa.service");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
const mfa_dto_1 = require("./dto/mfa.dto");
const MFA_THROTTLE = { default: { limit: 5, ttl: 60_000 } };
let MfaController = class MfaController {
    mfa;
    constructor(mfa) {
        this.mfa = mfa;
    }
    iniciarAtivacao(user) {
        return this.mfa.iniciarAtivacao(user.id);
    }
    confirmarAtivacao(dto, user) {
        return this.mfa.confirmarAtivacao(user.id, dto.code);
    }
    async desativar(dto, user) {
        await this.mfa.desativar(user.id, dto.senha, dto.code);
        return { message: 'MFA desativado com sucesso' };
    }
};
exports.MfaController = MfaController;
__decorate([
    (0, common_1.Post)('setup'),
    (0, throttler_1.Throttle)(MFA_THROTTLE),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MfaController.prototype, "iniciarAtivacao", null);
__decorate([
    (0, common_1.Post)('ativar'),
    (0, throttler_1.Throttle)(MFA_THROTTLE),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [mfa_dto_1.AtivarMfaDto, Object]),
    __metadata("design:returntype", void 0)
], MfaController.prototype, "confirmarAtivacao", null);
__decorate([
    (0, common_1.Post)('desativar'),
    (0, throttler_1.Throttle)(MFA_THROTTLE),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [mfa_dto_1.DesativarMfaDto, Object]),
    __metadata("design:returntype", Promise)
], MfaController.prototype, "desativar", null);
exports.MfaController = MfaController = __decorate([
    (0, common_1.Controller)('auth/mfa'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [mfa_service_1.MfaService])
], MfaController);
//# sourceMappingURL=mfa.controller.js.map