/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- jest.Mock.mock.calls é `any[]` por padrão; os asserts de tipo abaixo tipam o resultado final. */
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConsultaService } from './consulta.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';

describe('ConsultaService — acesso horizontal (ownership) e IDOR', () => {
  let service: ConsultaService;
  let prisma: {
    consulta: {
      findFirst: jest.Mock;
      create: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
    diagnostico: { create: jest.Mock };
    prescricao: { create: jest.Mock };
    riskScore: { create: jest.Mock };
  };

  const OUTRO_USUARIO_ID = 'usuario-victima-id';
  const USUARIO_ATACANTE_ID = 'usuario-atacante-id';
  const CONSULTA_DA_VITIMA_ID = 'consulta-da-vitima-id';

  beforeEach(async () => {
    prisma = {
      consulta: {
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'nova-consulta' }),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      diagnostico: { create: jest.fn().mockResolvedValue({ id: 'diag-1' }) },
      prescricao: { create: jest.fn().mockResolvedValue({ id: 'presc-1' }) },
      riskScore: { create: jest.fn().mockResolvedValue({ id: 'risk-1' }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultaService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: CacheService,
          useValue: { key: jest.fn(), getOrSet: jest.fn() },
        },
        {
          provide: AuditService,
          useValue: { registrarAuditoria: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get(ConsultaService);
  });

  describe('buscarConsulta() — leitura', () => {
    it('NÃO retorna a consulta de outro usuário (findFirst filtra por usuario_id — cliente não pode ler recurso de terceiro só por conhecer o id)', async () => {
      // Simula o banco: a consulta existe, mas pertence a OUTRO_USUARIO_ID.
      // O service consulta com where: { id, usuario_id: usuarioId } — se o
      // atacante não é o dono, o findFirst (que já filtra por usuario_id)
      // retorna null.
      prisma.consulta.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.buscarConsulta(CONSULTA_DA_VITIMA_ID, USUARIO_ATACANTE_ID),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.consulta.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: CONSULTA_DA_VITIMA_ID,
            usuario_id: USUARIO_ATACANTE_ID,
          }),
        }),
      );
    });

    it('retorna a consulta quando o usuário autenticado é o dono', async () => {
      prisma.consulta.findFirst.mockResolvedValueOnce({
        id: CONSULTA_DA_VITIMA_ID,
        usuario_id: OUTRO_USUARIO_ID,
      });
      const resultado = await service.buscarConsulta(
        CONSULTA_DA_VITIMA_ID,
        OUTRO_USUARIO_ID,
      );
      expect(resultado.id).toBe(CONSULTA_DA_VITIMA_ID);
    });
  });

  describe('criarDiagnostico() — escrita vinculada a consulta de terceiro', () => {
    it('rejeita quando a consulta não pertence ao usuário autenticado (ForbiddenException)', async () => {
      prisma.consulta.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.criarDiagnostico(
          { consulta_id: CONSULTA_DA_VITIMA_ID, cid: 'I10', descricao: 'HAS' },
          USUARIO_ATACANTE_ID,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.diagnostico.create).not.toHaveBeenCalled();
    });
  });

  describe('criarPrescricao() — escrita vinculada a consulta de terceiro', () => {
    it('rejeita quando a consulta não pertence ao usuário autenticado (ForbiddenException)', async () => {
      prisma.consulta.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.criarPrescricao(
          {
            consulta_id: CONSULTA_DA_VITIMA_ID,
            medicamentos: [
              {
                molecula: 'Losartana',
                dose: '50mg',
                via: 'VO',
                frequencia: '1x/dia',
                duracao: '30d',
              },
            ],
          },
          USUARIO_ATACANTE_ID,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.prescricao.create).not.toHaveBeenCalled();
    });
  });

  describe('salvarRiskScore() — vulnerabilidade IDOR corrigida', () => {
    it('REJEITA gravação de risk score em consulta que não pertence ao usuário autenticado (correção da vulnerabilidade: antes gravava sem checar ownership)', async () => {
      prisma.consulta.findFirst.mockResolvedValueOnce(null); // consulta não encontrada para este usuário

      await expect(
        service.salvarRiskScore(
          CONSULTA_DA_VITIMA_ID,
          { risco_global: 'alto' },
          USUARIO_ATACANTE_ID,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.consulta.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: CONSULTA_DA_VITIMA_ID,
            usuario_id: USUARIO_ATACANTE_ID,
          }),
        }),
      );
      expect(prisma.riskScore.create).not.toHaveBeenCalled();
    });

    it('permite gravação quando a consulta pertence ao usuário autenticado', async () => {
      prisma.consulta.findFirst.mockResolvedValueOnce({
        id: CONSULTA_DA_VITIMA_ID,
        usuario_id: OUTRO_USUARIO_ID,
      });

      await service.salvarRiskScore(
        CONSULTA_DA_VITIMA_ID,
        { risco_global: 'alto', score_global: 80 },
        OUTRO_USUARIO_ID,
      );

      expect(prisma.riskScore.create).toHaveBeenCalledTimes(1);
      const callArg = prisma.riskScore.create.mock.calls[0][0] as {
        data: { consulta_id: string };
      };
      expect(callArg.data.consulta_id).toBe(CONSULTA_DA_VITIMA_ID);
    });
  });

  describe('listarConsultas() — nunca vaza dados de outro usuário', () => {
    it('sempre filtra por usuario_id do chamador, independentemente de qualquer parâmetro', async () => {
      prisma.consulta.count.mockResolvedValueOnce(0);
      prisma.consulta.findMany.mockResolvedValueOnce([]);
      await service.listarConsultas(USUARIO_ATACANTE_ID, 1, 20);
      expect(prisma.consulta.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ usuario_id: USUARIO_ATACANTE_ID }),
        }),
      );
    });
  });
});
