"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
const http_logging_interceptor_1 = require("./common/interceptors/http-logging.interceptor");
const jwt_secrets_util_1 = require("./auth/jwt-secrets.util");
const cors_util_1 = require("./config/cors.util");
const environment_util_1 = require("./config/environment.util");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const config = app.get(config_1.ConfigService);
    (0, jwt_secrets_util_1.validarSegredosDistintos)(config);
    const appEnv = (0, environment_util_1.resolveAppEnv)(config);
    console.log(`PRESCREVE-AI Backend — ambiente: ${appEnv}`);
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalInterceptors(new http_logging_interceptor_1.HttpLoggingInterceptor());
    const allowedOrigins = (0, cors_util_1.resolveAllowedOrigins)(config);
    console.log(`CORS — origens permitidas (${appEnv}): ${allowedOrigins.join(', ') || '(nenhuma)'}`);
    app.enableCors({
        origin: (0, cors_util_1.buildCorsOriginHandler)(allowedOrigins),
        credentials: true,
    });
    app.setGlobalPrefix('api/backend');
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`PRESCREVE-AI Backend running on port ${port}`);
}
void bootstrap();
//# sourceMappingURL=main.js.map