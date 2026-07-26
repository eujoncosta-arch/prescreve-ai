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
exports.PaginacaoQueryDto = exports.SalvarRiscoDto = exports.RiskScorePayloadDto = exports.CriarPrescricaoDto = exports.ItemMedicamentoDto = exports.CriarDiagnosticoDto = exports.CriarConsultaDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
const max_json_size_validator_1 = require("../../../common/validators/max-json-size.validator");
function IsIdempotencyKey() {
    return function (target, propertyKey) {
        (0, class_validator_1.IsOptional)()(target, propertyKey);
        (0, class_validator_1.IsString)()(target, propertyKey);
        (0, class_validator_1.MinLength)(8, {
            message: 'idempotency_key deve ter ao menos 8 caracteres',
        })(target, propertyKey);
        (0, class_validator_1.MaxLength)(100)(target, propertyKey);
    };
}
class CriarConsultaDto {
    paciente_hash;
    anamnese;
    idempotency_key;
}
exports.CriarConsultaDto = CriarConsultaDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[a-fA-F0-9]{64}$/, {
        message: 'paciente_hash deve ser um hash SHA-256 em hexadecimal (64 caracteres)',
    }),
    __metadata("design:type", String)
], CriarConsultaDto.prototype, "paciente_hash", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    (0, max_json_size_validator_1.MaxJsonSize)(50_000, {
        message: 'anamnese excede o tamanho máximo permitido (50KB serializado)',
    }),
    __metadata("design:type", Object)
], CriarConsultaDto.prototype, "anamnese", void 0);
__decorate([
    IsIdempotencyKey(),
    __metadata("design:type", String)
], CriarConsultaDto.prototype, "idempotency_key", void 0);
class CriarDiagnosticoDto {
    consulta_id;
    cid;
    descricao;
    confianca;
    selecionado;
    idempotency_key;
}
exports.CriarDiagnosticoDto = CriarDiagnosticoDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CriarDiagnosticoDto.prototype, "consulta_id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(10),
    __metadata("design:type", String)
], CriarDiagnosticoDto.prototype, "cid", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CriarDiagnosticoDto.prototype, "descricao", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(1),
    __metadata("design:type", Number)
], CriarDiagnosticoDto.prototype, "confianca", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CriarDiagnosticoDto.prototype, "selecionado", void 0);
__decorate([
    IsIdempotencyKey(),
    __metadata("design:type", String)
], CriarDiagnosticoDto.prototype, "idempotency_key", void 0);
class ItemMedicamentoDto {
    molecula;
    dose;
    via;
    frequencia;
    duracao;
    observacoes;
}
exports.ItemMedicamentoDto = ItemMedicamentoDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], ItemMedicamentoDto.prototype, "molecula", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], ItemMedicamentoDto.prototype, "dose", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], ItemMedicamentoDto.prototype, "via", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], ItemMedicamentoDto.prototype, "frequencia", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], ItemMedicamentoDto.prototype, "duracao", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], ItemMedicamentoDto.prototype, "observacoes", void 0);
class CriarPrescricaoDto {
    consulta_id;
    diagnostico_id;
    medicamentos;
    orientacoes;
    validade_dias;
    idempotency_key;
}
exports.CriarPrescricaoDto = CriarPrescricaoDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CriarPrescricaoDto.prototype, "consulta_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CriarPrescricaoDto.prototype, "diagnostico_id", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'medicamentos deve conter ao menos 1 item' }),
    (0, class_validator_1.ArrayMaxSize)(50, { message: 'medicamentos não pode exceder 50 itens' }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ItemMedicamentoDto),
    __metadata("design:type", Array)
], CriarPrescricaoDto.prototype, "medicamentos", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], CriarPrescricaoDto.prototype, "orientacoes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(365),
    __metadata("design:type", Number)
], CriarPrescricaoDto.prototype, "validade_dias", void 0);
__decorate([
    IsIdempotencyKey(),
    __metadata("design:type", String)
], CriarPrescricaoDto.prototype, "idempotency_key", void 0);
class RiskScorePayloadDto {
    risco_global;
    score_global;
    alerta_vermelho;
    risco_cardiovascular;
    risco_renal;
    risco_hemorragico;
    risco_farmacologico;
    risco_interacao;
    risco_terapeutico;
    recomendacoes_prioritarias;
}
exports.RiskScorePayloadDto = RiskScorePayloadDto;
__decorate([
    (0, class_validator_1.IsEnum)(client_1.NivelRisco, {
        message: `risco_global deve ser um dos valores: ${Object.values(client_1.NivelRisco).join(', ')}`,
    }),
    __metadata("design:type", String)
], RiskScorePayloadDto.prototype, "risco_global", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], RiskScorePayloadDto.prototype, "score_global", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], RiskScorePayloadDto.prototype, "alerta_vermelho", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    (0, max_json_size_validator_1.MaxJsonSize)(5_000),
    __metadata("design:type", Object)
], RiskScorePayloadDto.prototype, "risco_cardiovascular", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    (0, max_json_size_validator_1.MaxJsonSize)(5_000),
    __metadata("design:type", Object)
], RiskScorePayloadDto.prototype, "risco_renal", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    (0, max_json_size_validator_1.MaxJsonSize)(5_000),
    __metadata("design:type", Object)
], RiskScorePayloadDto.prototype, "risco_hemorragico", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    (0, max_json_size_validator_1.MaxJsonSize)(5_000),
    __metadata("design:type", Object)
], RiskScorePayloadDto.prototype, "risco_farmacologico", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    (0, max_json_size_validator_1.MaxJsonSize)(5_000),
    __metadata("design:type", Object)
], RiskScorePayloadDto.prototype, "risco_interacao", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    (0, max_json_size_validator_1.MaxJsonSize)(5_000),
    __metadata("design:type", Object)
], RiskScorePayloadDto.prototype, "risco_terapeutico", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(20),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], RiskScorePayloadDto.prototype, "recomendacoes_prioritarias", void 0);
class SalvarRiscoDto {
    consulta_id;
    score;
    idempotency_key;
}
exports.SalvarRiscoDto = SalvarRiscoDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], SalvarRiscoDto.prototype, "consulta_id", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => RiskScorePayloadDto),
    __metadata("design:type", RiskScorePayloadDto)
], SalvarRiscoDto.prototype, "score", void 0);
__decorate([
    IsIdempotencyKey(),
    __metadata("design:type", String)
], SalvarRiscoDto.prototype, "idempotency_key", void 0);
class PaginacaoQueryDto {
    pagina = 1;
    limite = 20;
}
exports.PaginacaoQueryDto = PaginacaoQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], PaginacaoQueryDto.prototype, "pagina", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], PaginacaoQueryDto.prototype, "limite", void 0);
//# sourceMappingURL=consulta.dto.js.map