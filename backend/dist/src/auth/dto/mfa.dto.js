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
exports.DesativarMfaDto = exports.AtivarMfaDto = void 0;
const class_validator_1 = require("class-validator");
class AtivarMfaDto {
    code;
}
exports.AtivarMfaDto = AtivarMfaDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6, { message: 'code deve ter exatamente 6 dígitos (código TOTP)' }),
    __metadata("design:type", String)
], AtivarMfaDto.prototype, "code", void 0);
class DesativarMfaDto {
    senha;
    code;
}
exports.DesativarMfaDto = DesativarMfaDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DesativarMfaDto.prototype, "senha", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DesativarMfaDto.prototype, "code", void 0);
//# sourceMappingURL=mfa.dto.js.map