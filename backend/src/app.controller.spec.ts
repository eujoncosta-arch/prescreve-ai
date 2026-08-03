import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('GET /health — liveness (nunca depende do banco)', () => {
    it('sempre retorna status ok, mesmo sem checar o Postgres', () => {
      const resultado = appController.getHealth() as { status: string };
      expect(resultado.status).toBe('ok');
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('GET /health/ready — readiness (checagem real de conectividade, gap de prontidão de produção fechado nesta RM)', () => {
    it('Postgres acessível (SELECT 1 resolve) → status ok, database up', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      const resultado = await appController.getReadiness();
      expect(resultado.status).toBe('ok');
      expect(resultado.database).toBe('up');
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('Postgres inacessível (SELECT 1 rejeita) → lança HttpException 503, NUNCA propaga o erro do driver (endereço/credenciais) na resposta', async () => {
      prisma.$queryRaw.mockRejectedValue(
        new Error('connect ECONNREFUSED 10.0.0.5:5432 user=prod_admin'),
      );

      await expect(appController.getReadiness()).rejects.toBeInstanceOf(
        HttpException,
      );

      try {
        await appController.getReadiness();
        fail('deveria ter lançado');
      } catch (e) {
        const err = e as HttpException;
        expect(err.getStatus()).toBe(503);
        const body = err.getResponse() as { status: string; database: string };
        expect(body.database).toBe('down');
        // Nunca deve conter o endereço/porta/usuário do erro real do driver.
        expect(JSON.stringify(body)).not.toContain('ECONNREFUSED');
        expect(JSON.stringify(body)).not.toContain('prod_admin');
      }
    });
  });
});
