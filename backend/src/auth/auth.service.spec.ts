/* eslint-disable @typescript-eslint/no-unsafe-member-access -- jest.Mock.mock.calls é `any[]` por padrão; os casts `as CreateUsuarioCallArg`/`as CreateAuditoriaCallArg` abaixo tipam o resultado final. */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, CriarUsuarioPrivilegiadoDto } from './dto/login.dto';

interface CreateUsuarioCallArg {
  data: {
    email: string;
    perfil: string;
    medico?: {
      create: { especialidade: string; uf: string; crm_hash: string };
    };
  };
}

interface CreateAuditoriaCallArg {
  data: {
    usuario_id: string;
    tipo: string;
    acao: string;
  };
}

describe('AuthService — autorização e escalada de privilégio', () => {
  let service: AuthService;
  let prisma: {
    usuario: { findUnique: jest.Mock; create: jest.Mock };
    refreshToken: { create: jest.Mock };
    auditoria: { create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      usuario: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }: CreateUsuarioCallArg) =>
          Promise.resolve({
            id: 'user-1',
            email: data.email,
            perfil: data.perfil,
          }),
        ),
      },
      refreshToken: { create: jest.fn().mockResolvedValue({}) },
      auditoria: { create: jest.fn().mockResolvedValue({}) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('fake.jwt.token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') return 'test-secret';
              if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
              return undefined;
            }),
          },
        },
        {
          provide: MfaService,
          useValue: {
            verificarCodigoLogin: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register() — cadastro público', () => {
    it('SEMPRE cria o usuário com perfil MEDICO, mesmo que o DTO (via cast malicioso, simulando um payload manipulado) contenha um campo perfil diferente', async () => {
      const dto = {
        email: 'medico@x.com',
        senha: 'senhaforte123',
      } as RegisterDto;
      // Simula um atacante que, contornando o TypeScript, injeta `perfil` no
      // objeto antes de chamar o service (o que o DTO real do NestJS jamais
      // permitiria chegar aqui, pois RegisterDto não declara esse campo e a
      // ValidationPipe global rejeitaria com 400 antes do controller).
      (dto as unknown as { perfil: string }).perfil = 'ADMIN';

      await service.register(dto);

      expect(prisma.usuario.create).toHaveBeenCalledTimes(1);
      const created = prisma.usuario.create.mock
        .calls[0][0] as CreateUsuarioCallArg;
      expect(created.data.perfil).toBe('MEDICO');
    });

    it('rejeita cadastro com e-mail já existente (ConflictException)', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce({ id: 'existing' });
      const dto = { email: 'dup@x.com', senha: 'senhaforte123' } as RegisterDto;
      await expect(service.register(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.usuario.create).not.toHaveBeenCalled();
    });

    it('cria o sub-registro de Médico apenas quando crm é informado, sem exigir nem aceitar perfil do payload', async () => {
      const dto = {
        email: 'medico2@x.com',
        senha: 'senhaforte123',
        crm: '123456',
        especialidade: 'cardiologia',
        uf: 'RJ',
      } as RegisterDto;
      await service.register(dto);
      const created = prisma.usuario.create.mock
        .calls[0][0] as CreateUsuarioCallArg;
      expect(created.data.perfil).toBe('MEDICO');
      expect(created.data.medico?.create.especialidade).toBe('cardiologia');
    });
  });

  describe('criarUsuarioPrivilegiado() — fluxo administrativo', () => {
    it('cria um usuário com o perfil informado no DTO (ADMIN, AUDITOR, HOSPITAL ou LABORATORIO) quando chamado pelo fluxo administrativo', async () => {
      const dto: CriarUsuarioPrivilegiadoDto = {
        email: 'novo-admin@x.com',
        senha: 'senhaforte123',
        perfil: 'ADMIN',
      };
      const resultado = await service.criarUsuarioPrivilegiado(
        dto,
        'admin-criador-id',
      );

      expect(resultado.perfil).toBe('ADMIN');
      const created = prisma.usuario.create.mock
        .calls[0][0] as CreateUsuarioCallArg;
      expect(created.data.perfil).toBe('ADMIN');
    });

    it('registra auditoria com o tipo correto (criacao_usuario_privilegiado) e o id de quem criou — nunca "login" (bug de tipagem corrigido)', async () => {
      const dto: CriarUsuarioPrivilegiadoDto = {
        email: 'auditor@x.com',
        senha: 'senhaforte123',
        perfil: 'AUDITOR',
      };
      await service.criarUsuarioPrivilegiado(dto, 'admin-id-123');

      expect(prisma.auditoria.create).toHaveBeenCalledTimes(1);
      const auditData = (
        prisma.auditoria.create.mock.calls[0][0] as CreateAuditoriaCallArg
      ).data;
      expect(auditData.tipo).toBe('criacao_usuario_privilegiado');
      expect(auditData.usuario_id).toBe('admin-id-123');
      expect(auditData.acao).toContain('admin-id-123');
    });

    it('rejeita e-mail duplicado também no fluxo administrativo', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce({ id: 'existing' });
      const dto: CriarUsuarioPrivilegiadoDto = {
        email: 'dup2@x.com',
        senha: 'senhaforte123',
        perfil: 'HOSPITAL',
      };
      await expect(
        service.criarUsuarioPrivilegiado(dto, 'admin-id'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('não retorna dados sensíveis (senha_hash) no resultado', async () => {
      const dto: CriarUsuarioPrivilegiadoDto = {
        email: 'lab@x.com',
        senha: 'senhaforte123',
        perfil: 'LABORATORIO',
      };
      const resultado = await service.criarUsuarioPrivilegiado(dto, 'admin-id');
      expect(resultado).not.toHaveProperty('senha_hash');
      expect(Object.keys(resultado).sort()).toEqual(['email', 'id', 'perfil']);
    });
  });
});
