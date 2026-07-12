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
exports.ConsultaController = void 0;
const common_1 = require("@nestjs/common");
const consulta_service_1 = require("./consulta.service");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorators/current-user.decorator");
const consulta_dto_1 = require("./dto/consulta.dto");
let ConsultaController = class ConsultaController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    criarConsulta(dto, user) {
        return this.svc.criarConsulta(dto, user.id);
    }
    listarConsultas(user, pagina, limite) {
        return this.svc.listarConsultas(user.id, Number(pagina ?? 1), Number(limite ?? 20));
    }
    buscarConsulta(id, user) {
        return this.svc.buscarConsulta(id, user.id);
    }
    timeline(user) {
        return this.svc.buscarTimeline(user.id);
    }
    criarDiagnostico(dto, user) {
        return this.svc.criarDiagnostico(dto, user.id);
    }
    criarPrescricao(dto, user) {
        return this.svc.criarPrescricao(dto, user.id);
    }
    salvarRisco(body, user) {
        return this.svc.salvarRiskScore(body.consulta_id, body.score, user.id);
    }
    buscarEvidencias(cid) {
        return this.svc.buscarEvidencias(cid);
    }
    buscarRWE(cid) {
        return this.svc.buscarRWE(cid);
    }
};
exports.ConsultaController = ConsultaController;
__decorate([
    (0, common_1.Post)('consulta'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [consulta_dto_1.CriarConsultaDto, Object]),
    __metadata("design:returntype", void 0)
], ConsultaController.prototype, "criarConsulta", null);
__decorate([
    (0, common_1.Get)('consultas'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('pagina')),
    __param(2, (0, common_1.Query)('limite')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ConsultaController.prototype, "listarConsultas", null);
__decorate([
    (0, common_1.Get)('consulta/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ConsultaController.prototype, "buscarConsulta", null);
__decorate([
    (0, common_1.Get)('timeline'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConsultaController.prototype, "timeline", null);
__decorate([
    (0, common_1.Post)('diagnostico'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [consulta_dto_1.CriarDiagnosticoDto, Object]),
    __metadata("design:returntype", void 0)
], ConsultaController.prototype, "criarDiagnostico", null);
__decorate([
    (0, common_1.Post)('prescricao'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [consulta_dto_1.CriarPrescricaoDto, Object]),
    __metadata("design:returntype", void 0)
], ConsultaController.prototype, "criarPrescricao", null);
__decorate([
    (0, common_1.Post)('risco'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ConsultaController.prototype, "salvarRisco", null);
__decorate([
    (0, common_1.Get)('evidence/:cid'),
    __param(0, (0, common_1.Param)('cid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConsultaController.prototype, "buscarEvidencias", null);
__decorate([
    (0, common_1.Get)('rwe/:cid'),
    __param(0, (0, common_1.Param)('cid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConsultaController.prototype, "buscarRWE", null);
exports.ConsultaController = ConsultaController = __decorate([
    (0, common_1.Controller)('api'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [consulta_service_1.ConsultaService])
], ConsultaController);
//# sourceMappingURL=consulta.controller.js.map