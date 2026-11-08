/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- mocks do jest e respostas do supertest são `any`; o que importa aqui são as asserções. */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConsultaService } from './consulta.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { UnidadeDose, FrequenciaDose } from './dto/consulta.dto';
import { fingerprintPrescricao } from './prescricao-fingerprint.util';

// ============================================================
// RM-107.1.1-E2.5 — lógica de conflito por fingerprint no serviço. PRISMA MOCKADO: prova a LÓGICA (ramos), NÃO o comportamento do banco.
// O comportamento contra PostgreSQL real está em test/idempotencia-fingerprint-postgres-real.e2e-spec.ts.
// ============================================================

describe('ConsultaService.criarPrescricao — fingerprint de conteúdo (Prisma mockado)', () => {
  let service: ConsultaService;
  let prisma: any;
  const U = 'usuario-1';
  const C = 'consulta-1';
  const meds = (valor = 50) => [
    {
      molecula: 'Losartana',
      dose: {
        valor,
        unidade: UnidadeDose.MG,
        frequencia: FrequenciaDose.UMA_X_DIA,
        via: 'VO',
      },
      duracao: '30d',
    },
  ];
  const dto = (valor = 50) => ({
    consulta_id: C,
    medicamentos: meds(valor),
    idempotency_key: 'chave-fp-12345678',
  });

  beforeEach(async () => {
    prisma = {
      consulta: {
        findFirst: jest.fn().mockResolvedValue({ id: C, usuario_id: U }),
      },
      diagnostico: { findFirst: jest.fn() },
      prescricao: {
        create: jest.fn().mockResolvedValue({ id: 'presc-1' }),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    const mod: TestingModule = await Test.createTestingModule({
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
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();
    service = mod.get(ConsultaService);
  });

  const p2002 = () =>
    new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7',
    });

  it('grava o fingerprint canônico junto da chave; sem chave não grava', async () => {
    await service.criarPrescricao(dto(), U);
    expect(
      prisma.prescricao.create.mock.calls[0][0].data.idempotency_fingerprint,
    ).toBe(fingerprintPrescricao({ consulta_id: C, medicamentos: meds() }));
    await service.criarPrescricao({ consulta_id: C, medicamentos: meds() }, U);
    expect(
      prisma.prescricao.create.mock.calls[1][0].data.idempotency_fingerprint,
    ).toBeUndefined();
  });

  it('mesma chave + mesmo conteúdo ⇒ devolve o registro existente (sem create)', async () => {
    const fp = fingerprintPrescricao({ consulta_id: C, medicamentos: meds() });
    prisma.prescricao.findUnique.mockResolvedValueOnce({
      id: 'existente',
      consulta_id: C,
      idempotency_fingerprint: fp,
    });
    const r = await service.criarPrescricao(dto(), U);
    expect(r.id).toBe('existente');
    expect(prisma.prescricao.create).not.toHaveBeenCalled();
  });

  it('mesma chave + conteúdo DIFERENTE ⇒ ConflictException (409), sem create', async () => {
    const fp = fingerprintPrescricao({
      consulta_id: C,
      medicamentos: meds(50),
    });
    prisma.prescricao.findUnique.mockResolvedValueOnce({
      id: 'existente',
      consulta_id: C,
      idempotency_fingerprint: fp,
    });
    await expect(service.criarPrescricao(dto(51), U)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.prescricao.create).not.toHaveBeenCalled();
  });

  it('a mensagem de conflito não ecoa o conteúdo da prescrição', async () => {
    prisma.prescricao.findUnique.mockResolvedValueOnce({
      id: 'e',
      consulta_id: C,
      idempotency_fingerprint: 'outro',
    });
    const erro = await service.criarPrescricao(dto(), U).catch((e: Error) => e);
    expect(erro).toBeInstanceOf(ConflictException);
    expect((erro as Error).message).not.toMatch(/Losartana|50/);
  });

  it('registro LEGADO (sem fingerprint): deriva do conteúdo persistido — igual ⇒ devolve; diferente ⇒ 409', async () => {
    const legado = {
      id: 'legado',
      consulta_id: C,
      diagnostico_id: null,
      medicamentos: meds(50),
      orientacoes: null,
      validade_dias: 30,
      idempotency_fingerprint: null,
    };
    prisma.prescricao.findUnique.mockResolvedValueOnce(legado);
    expect((await service.criarPrescricao(dto(50), U)).id).toBe('legado');
    prisma.prescricao.findUnique.mockResolvedValueOnce(legado);
    await expect(service.criarPrescricao(dto(60), U)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('registro existente SEM conteúdo comparável (ex.: coluna medicamentos ilegível): comportamento anterior — devolve o existente, nunca inventa divergência', async () => {
    prisma.prescricao.findUnique.mockResolvedValueOnce({
      id: 'sem-conteudo',
      consulta_id: C,
    });
    expect((await service.criarPrescricao(dto(), U)).id).toBe('sem-conteudo');
  });

  it('chave de OUTRA consulta ⇒ 403 (escopo), antes de qualquer comparação de conteúdo', async () => {
    prisma.prescricao.findUnique.mockResolvedValueOnce({
      id: 'x',
      consulta_id: 'outra-consulta',
      idempotency_fingerprint: 'qualquer',
    });
    await expect(service.criarPrescricao(dto(), U)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('corrida (P2002): a vencedora com o MESMO conteúdo ⇒ devolve; com conteúdo DIFERENTE ⇒ 409 (a corrida não contorna o fingerprint)', async () => {
    const fp = fingerprintPrescricao({
      consulta_id: C,
      medicamentos: meds(50),
    });
    prisma.prescricao.create.mockRejectedValue(p2002());
    prisma.prescricao.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'vencedora',
        consulta_id: C,
        idempotency_fingerprint: fp,
      });
    expect((await service.criarPrescricao(dto(50), U)).id).toBe('vencedora');
    prisma.prescricao.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'vencedora',
        consulta_id: C,
        idempotency_fingerprint: fp,
      });
    await expect(service.criarPrescricao(dto(99), U)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
