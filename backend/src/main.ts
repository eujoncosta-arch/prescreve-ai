import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validação global de DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Logging HTTP global
  app.useGlobalInterceptors(new HttpLoggingInterceptor());

  // CORS — frontend Next.js
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL ?? 'http://localhost:3001',
      /\.vercel\.app$/,
    ],
    credentials: true,
  });

  // Versioning
  app.setGlobalPrefix('');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`PRESCREVE-AI Backend running on port ${port}`);
}
bootstrap();
