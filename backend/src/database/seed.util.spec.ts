import {
  deveBloquearSeed,
  runSeed,
  SEED_USUARIO_EMAIL,
  SEED_CRM_HASH,
} from './seed.util';

// ============================================================
// RM-37 — Seed idempotente e bloqueio em produção
//
// Cobre exatamente os cenários exigidos pela auditoria: banco vazio
// (1ª execução — cria), banco existente (2ª execução — não duplica nem
// sobrescreve), e o bloqueio de produção (nunca roda em produção sem
// opt-in explícito).
// ============================================================

describe('deveBloquearSeed() — nunca roda em produção sem opt-in explícito', () => {
  it('produção SEM flag de permissão → bloqueado', () => {
    expect(deveBloquearSeed('production', false)).toBe(true);
  });

  it('produção COM flag de permissão explícita → permitido', () => {
    expect(deveBloquearSeed('production', true)).toBe(false);
  });

  it('desenvolvimento → sempre permitido, independente da flag', () => {
    expect(deveBloquearSeed('development', false)).toBe(false);
    expect(deveBloquearSeed('development', true)).toBe(false);
  });

  it('staging → sempre permitido, independente da flag', () => {
    expect(deveBloquearSeed('staging', false)).toBe(false);
  });
});

describe('runSeed() — idempotente por construção (upsert, nunca create puro)', () => {
  function mockPrisma() {
    return {
      usuario: {
        upsert: jest.fn().mockResolvedValue({ id: 'usuario-seed-id' }),
      },
      medico: {
        upsert: jest.fn().mockResolvedValue({ id: 'medico-seed-id' }),
      },
    };
  }

  it('BANCO VAZIO (1ª execução): cria o usuário e o médico de demonstração via upsert', async () => {
    const prisma = mockPrisma();
    await runSeed(prisma as never);

    expect(prisma.usuario.upsert).toHaveBeenCalledTimes(1);
    const chamadaUsuario = prisma.usuario.upsert.mock.calls.at(-1) as
      | [
          {
            where: { email: string };
            update: Record<string, unknown>;
            create: { email: string; perfil: string };
          },
        ]
      | undefined;
    expect(chamadaUsuario?.[0].where).toEqual({ email: SEED_USUARIO_EMAIL });
    expect(chamadaUsuario?.[0].create.email).toBe(SEED_USUARIO_EMAIL);
    expect(chamadaUsuario?.[0].create.perfil).toBe('MEDICO');
    // `update: {}` — mesmo na 1ª execução, o upsert NUNCA sobrescreveria
    // um registro pré-existente (não há nada a sobrescrever aqui, mas a
    // garantia estrutural é a mesma independentemente do estado do banco).
    expect(chamadaUsuario?.[0].update).toEqual({});

    expect(prisma.medico.upsert).toHaveBeenCalledTimes(1);
    const chamadaMedico = prisma.medico.upsert.mock.calls.at(-1) as
      | [
          {
            where: { usuario_id: string };
            update: Record<string, unknown>;
            create: { usuario_id: string; crm_hash: string };
          },
        ]
      | undefined;
    expect(chamadaMedico?.[0].where).toEqual({ usuario_id: 'usuario-seed-id' });
    expect(chamadaMedico?.[0].create.crm_hash).toBe(SEED_CRM_HASH);
    expect(chamadaMedico?.[0].update).toEqual({});
  });

  it('BANCO EXISTENTE / SEGUNDA EXECUÇÃO: chamar runSeed() de novo usa o MESMO upsert chaveado — nunca gera uma segunda chamada de criação nem duplica', async () => {
    const prisma = mockPrisma();

    await runSeed(prisma as never);
    await runSeed(prisma as never);

    // Duas execuções → duas CHAMADAS de upsert (idempotentes por
    // natureza — é o Postgres, via ON CONFLICT, quem garante que a
    // segunda vira update-sem-efeito em vez de duplicata; aqui provamos
    // que o CÓDIGO nunca usa `.create()` puro, que duplicaria).
    expect(prisma.usuario.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.medico.upsert).toHaveBeenCalledTimes(2);

    // Ambas as chamadas usam EXATAMENTE a mesma chave de idempotência —
    // nunca um e-mail gerado dinamicamente (ex.: com timestamp) que
    // criaria um novo usuário a cada execução.
    const [primeiraChamada, segundaChamada] = prisma.usuario.upsert.mock
      .calls as Array<[{ where: { email: string } }]>;
    expect(primeiraChamada[0].where.email).toBe(segundaChamada[0].where.email);
  });

  it('nunca chama `.create()` diretamente em usuario/medico (só upsert) — create puro falharia com violação de unique constraint na 2ª execução', async () => {
    const prisma: Record<string, unknown> = mockPrisma();
    // Sentinelas: se o código algum dia regredir para usar `.create()`
    // diretamente, este teste falha porque o mock não tem esse método.
    await runSeed(prisma as never);
    expect((prisma.usuario as { create?: unknown }).create).toBeUndefined();
    expect((prisma.medico as { create?: unknown }).create).toBeUndefined();
  });
});
