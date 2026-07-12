"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const http_logging_interceptor_1 = require("./common/interceptors/http-logging.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalInterceptors(new http_logging_interceptor_1.HttpLoggingInterceptor());
    app.enableCors({
        origin: [
            process.env.FRONTEND_URL ?? 'http://localhost:3001',
            /\.vercel\.app$/,
        ],
        credentials: true,
    });
    app.setGlobalPrefix('api/backend');
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`PRESCREVE-AI Backend running on port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map