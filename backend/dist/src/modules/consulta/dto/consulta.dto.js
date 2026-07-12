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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CriarPrescricaoDto = exports.CriarDiagnosticoDto = exports.CriarConsultaDto = void 0;
const class_validator_1 = require("class-validator");
class CriarConsultaDto {
    paciente_hash;
    anamnese;
}
exports.CriarConsultaDto = CriarConsultaDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CriarConsultaDto.prototype, "paciente_hash", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CriarConsultaDto.prototype, "anamnese", void 0);
class CriarDiagnosticoDto {
    consulta_id;
    cid;
    descricao;
    confianca;
    selecionado;
}
exports.CriarDiagnosticoDto = CriarDiagnosticoDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CriarDiagnosticoDto.prototype, "consulta_id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CriarDiagnosticoDto.prototype, "cid", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CriarDiagnosticoDto.prototype, "descricao", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CriarDiagnosticoDto.prototype, "confianca", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CriarDiagnosticoDto.prototype, "selecionado", void 0);
class CriarPrescricaoDto {
    consulta_id;
    diagnostico_id;
    medicamentos;
    orientacoes;
    validade_dias;
}
exports.CriarPrescricaoDto = CriarPrescricaoDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CriarPrescricaoDto.prototype, "consulta_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CriarPrescricaoDto.prototype, "diagnostico_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CriarPrescricaoDto.prototype, "orientacoes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CriarPrescricaoDto.prototype, "validade_dias", void 0);
//# sourceMappingURL=consulta.dto.js.map