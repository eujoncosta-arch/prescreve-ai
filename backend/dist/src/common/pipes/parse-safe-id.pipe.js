"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseSafeIdPipe = void 0;
const common_1 = require("@nestjs/common");
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_.-]{1,64}$/;
let ParseSafeIdPipe = class ParseSafeIdPipe {
    transform(value) {
        if (typeof value !== 'string' || !SAFE_ID_PATTERN.test(value)) {
            throw new common_1.BadRequestException('Identificador inválido');
        }
        return value;
    }
};
exports.ParseSafeIdPipe = ParseSafeIdPipe;
exports.ParseSafeIdPipe = ParseSafeIdPipe = __decorate([
    (0, common_1.Injectable)()
], ParseSafeIdPipe);
//# sourceMappingURL=parse-safe-id.pipe.js.map