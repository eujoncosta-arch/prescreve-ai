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
      findUnique: jest.Mock;
      create: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
    diagnostico: { create: jest.Mock; findUnique: jest.Mock };
    prescricao: { create: jest.Mock; findUnique: jest.Mock };
    riskScore: { create: jest.Mock; findUnique: jest.Mock };
  };

  const OUTRO_USUARIO_ID = 'usuario-victima-id';
  const USUARIO_ATACANTE_ID = 'usuario-atacante-id';
  const CONSULTA_DA_VITIMA_ID = 'consulta-da-vitima-id';

  beforeEach(async () => {
    prisma = {
      consulta: {
        findFirst: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'nova-consulta' }),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      diagnostico: {
        create: jest.fn().mockResolvedValue({ id: 'diag-1' }),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      prescricao: {
        create: jest.fn().mockResolvedValue({ id: 'presc-1' }),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      riskScore: {
        create: jest.fn().mockResolvedValue({ id: 'risk-1' }),
        findUnique: jest.fn().mockResolvedValue(null),
      },
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
          { risco_global: 'alto', score_global: 90 },
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

  describe('Integridade de persistência — idempotência (nunca duplica por reenvio)', () => {
    it('criarConsulta(): mesma idempotency_key retorna o registro já criado, sem chamar create de novo', async () => {
      const registroExistente = {
        id: 'consulta-ja-criada',
        usuario_id: OUTRO_USUARIO_ID,
        idempotency_key: 'chave-fixa-123',
      };
      prisma.consulta.findUnique.mockResolvedValueOnce(registroExistente);

      const resultado = await service.criarConsulta(
        { idempotency_key: 'chave-fixa-123' },
        OUTRO_USUARIO_ID,
      );

      expect(resultado).toBe(registroExistente);
      expect(prisma.consulta.create).not.toHaveBeenCalled();
    });

    it('criarConsulta(): idempotency_key pertencente a outro usuário é rejeitada (nunca retorna o registro de outro dono)', async () => {
      prisma.consulta.findUnique.mockResolvedValueOnce({
        id: 'consulta-de-outro',
        usuario_id: OUTRO_USUARIO_ID,
        idempotency_key: 'chave-roubada',
      });

      await expect(
        service.criarConsulta(
          { idempotency_key: 'chave-roubada' },
          USUARIO_ATACANTE_ID,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.consulta.create).not.toHaveBeenCalled();
    });

    it('criarPrescricao(): reenvio com a mesma idempotency_key NUNCA cria uma segunda prescrição (retry seguro)', async () => {
      prisma.consulta.findFirst.mockResolvedValue({
        id: CONSULTA_DA_VITIMA_ID,
        usuario_id: OUTRO_USUARIO_ID,
      });
      const dto = {
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
        idempotency_key: 'rx-idem-key-abc',
      };

      // 1ª tentativa: cria normalmente.
      const primeira = await service.criarPrescricao(dto, OUTRO_USUARIO_ID);
      expect(prisma.prescricao.create).toHaveBeenCalledTimes(1);

      // Simula o banco já tendo o registro (o que a 1ª chamada real teria persistido).
      prisma.prescricao.findUnique.mockResolvedValueOnce({
        id: 'presc-1',
        consulta_id: CONSULTA_DA_VITIMA_ID,
        idempotency_key: 'rx-idem-key-abc',
      });

      // 2ª tentativa (retry — timeout/falha de rede na 1ª resposta): mesma chave.
      const segunda = await service.criarPrescricao(dto, OUTRO_USUARIO_ID);

      expect(prisma.prescricao.create).toHaveBeenCalledTimes(1); // NÃO chamou create de novo
      expect(segunda.id).toBe(primeira.id);
    });

    it('criarDiagnostico(): reenvio com a mesma idempotency_key não duplica', async () => {
      prisma.consulta.findFirst.mockResolvedValueOnce({
        id: CONSULTA_DA_VITIMA_ID,
        usuario_id: OUTRO_USUARIO_ID,
      });
      prisma.diagnostico.findUnique.mockResolvedValueOnce({
        id: 'diag-existente',
        consulta_id: CONSULTA_DA_VITIMA_ID,
        idempotency_key: 'diag-idem-key',
      });

      const resultado = await service.criarDiagnostico(
        {
          consulta_id: CONSULTA_DA_VITIMA_ID,
          cid: 'I10',
          descricao: 'HAS',
          idempotency_key: 'diag-idem-key',
        },
        OUTRO_USUARIO_ID,
      );

      expect(resultado.id).toBe('diag-existente');
      expect(prisma.diagnostico.create).not.toHaveBeenCalled();
    });

    it('salvarRiskScore(): reenvio com a mesma idempotency_key não duplica', async () => {
      prisma.consulta.findFirst.mockResolvedValueOnce({
        id: CONSULTA_DA_VITIMA_ID,
        usuario_id: OUTRO_USUARIO_ID,
      });
      prisma.riskScore.findUnique.mockResolvedValueOnce({
        id: 'risk-existente',
        consulta_id: CONSULTA_DA_VITIMA_ID,
        idempotency_key: 'risk-idem-key',
      });

      const resultado = await service.salvarRiskScore(
        CONSULTA_DA_VITIMA_ID,
        { risco_global: 'alto', score_global: 80 },
        OUTRO_USUARIO_ID,
        'risk-idem-key',
      );

      expect(resultado.id).toBe('risk-existente');
      expect(prisma.riskScore.create).not.toHaveBeenCalled();
    });

    it('sem idempotency_key nenhuma (campo ausente): comportamento normal, sem checagem de duplicata', async () => {
      prisma.consulta.findFirst.mockResolvedValueOnce({
        id: CONSULTA_DA_VITIMA_ID,
        usuario_id: OUTRO_USUARIO_ID,
      });

      await service.criarDiagnostico(
        { consulta_id: CONSULTA_DA_VITIMA_ID, cid: 'I10', descricao: 'HAS' },
        OUTRO_USUARIO_ID,
      );

      expect(prisma.diagnostico.findUnique).not.toHaveBeenCalled();
      expect(prisma.diagnostico.create).toHaveBeenCalledTimes(1);
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
