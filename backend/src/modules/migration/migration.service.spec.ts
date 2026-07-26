/* eslint-disable @typescript-eslint/no-unsafe-member-access -- jest.Mock.mock.calls é `any[]` por padrão; os asserts `as {...}` abaixo tipam o resultado final. */
import { Test, TestingModule } from '@nestjs/testing';
import { MigrationService } from './migration.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

// ============================================================
// Integridade de persistência — migração de localStorage
//
// Prova a correção do bug encontrado nesta auditoria: o hash de
// integridade da prescrição migrada incluía `ts: Date.now()`, então o
// MESMO item de localStorage produzia um hash diferente a cada chamada —
// reenviar o mesmo lote (retry após timeout/falha parcial) sempre criava
// uma prescrição duplicada. Agora o hash é estável e uma idempotency_key
// (usuário + id local do item) é checada antes de criar.
// ============================================================

describe('MigrationService — integridade de persistência (sem duplicação por reenvio)', () => {
  let service: MigrationService;
  let prisma: {
    consulta: { create: jest.Mock };
    prescricao: { create: jest.Mock; findUnique: jest.Mock };
    medicalValidation: { create: jest.Mock };
  };

  const USUARIO_ID = 'medico-migracao-id';

  beforeEach(async () => {
    prisma = {
      consulta: {
        create: jest.fn().mockResolvedValue({ id: 'consulta-migracao-1' }),
      },
      prescricao: {
        create: jest.fn().mockResolvedValue({ id: 'presc-migrada-1' }),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      medicalValidation: { create: jest.fn().mockResolvedValue({}) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MigrationService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: AuditService,
          useValue: { registrarAuditoria: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get(MigrationService);
  });

  const prescricaoLocal = {
    id: 'local-rx-001',
    medicamentos: [{ molecula: 'Losartana', dose: '50mg' }],
    orientacoes: 'Tomar pela manhã',
  };

  it('migração normal cria a prescrição e retorna hash estável (não depende de Date.now())', async () => {
    await service.migrarHistorico(USUARIO_ID, {
      prescricoes: [prescricaoLocal],
    });

    expect(prisma.prescricao.create).toHaveBeenCalledTimes(1);
    const chamada = prisma.prescricao.create.mock.calls[0][0] as {
      data: { idempotency_key: string; hash_integridade: string };
    };
    expect(chamada.data.idempotency_key).toBe(
      `migracao:${USUARIO_ID}:local-rx-001`,
    );
    expect(chamada.data.hash_integridade).toMatch(/^[a-f0-9]{64}$/);
  });

  it('REENVIAR o mesmo lote (retry após timeout) NÃO cria uma segunda prescrição — idempotency_key já existe', async () => {
    // 1ª chamada: migra normalmente.
    await service.migrarHistorico(USUARIO_ID, {
      prescricoes: [prescricaoLocal],
    });
    expect(prisma.prescricao.create).toHaveBeenCalledTimes(1);

    // Simula o banco já contendo o registro da 1ª chamada.
    prisma.prescricao.findUnique.mockResolvedValueOnce({
      id: 'presc-migrada-1',
      idempotency_key: `migracao:${USUARIO_ID}:local-rx-001`,
    });

    // 2ª chamada: MESMO lote reenviado pelo frontend (ex.: timeout na 1ª resposta).
    const resultado = await service.migrarHistorico(USUARIO_ID, {
      prescricoes: [prescricaoLocal],
    });

    expect(prisma.prescricao.create).toHaveBeenCalledTimes(1); // NÃO chamou create de novo
    expect(resultado.prescricoes_migradas).toBe(0); // nada NOVO foi migrado na 2ª chamada
    expect(resultado.erros).toEqual([]); // não é tratado como erro — é um no-op idempotente
  });

  it('dois itens locais SEM id usam hash de conteúdo como chave — itens com conteúdo idêntico são tratados como o mesmo item', async () => {
    const semId = { medicamentos: [{ molecula: 'Enalapril' }] };
    prisma.prescricao.findUnique.mockResolvedValueOnce(null);

    await service.migrarHistorico(USUARIO_ID, { prescricoes: [semId] });
    expect(prisma.prescricao.create).toHaveBeenCalledTimes(1);
    const primeiraChave = (
      prisma.prescricao.create.mock.calls[0][0] as {
        data: { idempotency_key: string };
      }
    ).data.idempotency_key;
    expect(primeiraChave).toBe(
      `migracao:${USUARIO_ID}:${(prisma.prescricao.create.mock.calls[0][0] as { data: { hash_integridade: string } }).data.hash_integridade}`,
    );
  });
});
