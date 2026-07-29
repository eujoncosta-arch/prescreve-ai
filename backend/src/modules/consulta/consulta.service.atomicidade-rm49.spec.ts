/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- `criarFakePrismaService` retorna `any` deliberadamente (ver test/support/fake-prisma.ts); este arquivo testa comportamento em runtime, não contrato de tipo. */
import { ConsultaService } from './consulta.service';
import {
  criarFakePrismaService,
  FakeDb,
} from '../../../test/support/fake-prisma';

// ============================================================
// RM-49 (RM41-016/RM41-017) — prova de atomicidade real
//
// Usa o FakeDb (test/support/fake-prisma.ts), que implementa rollback real
// em memória para `$transaction`, em vez do jest.fn() de passagem usado em
// consulta.service.spec.ts — aqui provamos de verdade que uma falha em
// QUALQUER ponto da transação (escrita clínica OU auditoria) desfaz a
// escrita clínica por completo, nunca deixando um registro sem trilha.
// ============================================================

describe('ConsultaService — atomicidade escrita clínica + auditoria (RM-49)', () => {
  let db: FakeDb;
  let service: ConsultaService;
  let auditFn: jest.Mock;

  beforeEach(() => {
    db = new FakeDb();
    const prisma = criarFakePrismaService(db);
    auditFn = jest.fn().mockResolvedValue({ id: 'aud-1' });

    service = new ConsultaService(
      prisma,

      { key: jest.fn(), getOrSet: jest.fn() } as any,

      { registrarAuditoria: auditFn } as any,

      { get: () => 'x'.repeat(64) } as any,
    );
  });

  it('sucesso completo: consulta E auditoria persistem juntas', async () => {
    const consulta = await service.criarConsulta({}, 'user-1');

    expect(db.consultas).toHaveLength(1);
    expect(db.consultas[0].id).toBe(consulta.id);
    expect(auditFn).toHaveBeenCalledTimes(1);
  });

  it('falha na escrita clínica: nada persiste (nem consulta, nem auditoria)', async () => {
    const dto = { consulta_id: 'x', cid: 'I10', descricao: 'HAS' };
    // Ownership precisa passar para chegar até a escrita real.
    db.consultas.push({ id: 'x', usuario_id: 'user-1', deletado_em: null });

    // Sobrescreve diagnostico.create no MESMO prisma usado pelo service para
    // simular uma falha real de escrita (ex.: constraint de banco inesperada).
    const prismaUsado = (
      service as unknown as {
        prisma: { diagnostico: { create: () => unknown } };
      }
    ).prisma;
    prismaUsado.diagnostico.create = () => {
      throw new Error('Falha simulada de escrita');
    };

    await expect(service.criarDiagnostico(dto, 'user-1')).rejects.toThrow(
      'Falha simulada de escrita',
    );

    expect(db.diagnosticos).toHaveLength(0);
    expect(auditFn).not.toHaveBeenCalled();
  });

  it('falha SÓ na auditoria (escrita clínica já havia sido feita dentro da mesma tx): rollback desfaz também a escrita clínica — prova real de atomicidade', async () => {
    auditFn.mockRejectedValueOnce(new Error('Falha simulada na auditoria'));

    await expect(service.criarConsulta({}, 'user-1')).rejects.toThrow(
      'Falha simulada na auditoria',
    );

    // Ponto central do RM41-017: sem atomicidade, a consulta ficaria
    // persistida (o create já havia sido executado) SEM nenhuma auditoria
    // correspondente — um gap de rastreabilidade permanente. Com a
    // transação real, o rollback desfaz a escrita clínica também.
    expect(db.consultas).toHaveLength(0);
  });

  it('retry idempotente após rollback: nova tentativa com a mesma idempotency_key cria normalmente (não fica bloqueada por uma falha anterior)', async () => {
    auditFn.mockRejectedValueOnce(new Error('Falha transitória'));

    await expect(
      service.criarConsulta({ idempotency_key: 'k-1' }, 'user-1'),
    ).rejects.toThrow('Falha transitória');
    expect(db.consultas).toHaveLength(0);

    // 2ª tentativa (retry do cliente, mesma idempotency_key): sucesso normal.
    const consulta = await service.criarConsulta(
      { idempotency_key: 'k-1' },
      'user-1',
    );
    expect(db.consultas).toHaveLength(1);
    expect(consulta.id).toBe(db.consultas[0].id);
    expect(auditFn).toHaveBeenCalledTimes(2); // 1 falha + 1 sucesso
  });

  it('salvarRiskScore(): RM41-016 fechado — toda gravação de risk score agora chama registrarAuditoria', async () => {
    db.consultas.push({ id: 'c-1', usuario_id: 'user-1', deletado_em: null });

    await service.salvarRiskScore(
      'c-1',
      { risco_global: 'alto', score_global: 90 },
      'user-1',
    );

    expect(db.riskScores).toHaveLength(1);
    expect(auditFn).toHaveBeenCalledTimes(1);
    const chamada = auditFn.mock.calls[0][0] as { tipo: string };
    expect(chamada.tipo).toBe('risk_score_calculado');
  });

  it('salvarRiskScore(): falha na auditoria desfaz também a gravação do risk score', async () => {
    db.consultas.push({ id: 'c-2', usuario_id: 'user-1', deletado_em: null });
    auditFn.mockRejectedValueOnce(new Error('Falha simulada na auditoria'));

    await expect(
      service.salvarRiskScore(
        'c-2',
        { risco_global: 'alto', score_global: 90 },
        'user-1',
      ),
    ).rejects.toThrow('Falha simulada na auditoria');

    expect(db.riskScores).toHaveLength(0);
  });
});
