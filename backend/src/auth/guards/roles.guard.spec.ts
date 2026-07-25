import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

function buildContext(user: { perfil?: string } | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('permite acesso quando o endpoint não declara @Roles() (sem metadata)', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const ctx = buildContext({ perfil: 'MEDICO' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('permite acesso quando o perfil do usuário autenticado está entre os exigidos', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const ctx = buildContext({ perfil: 'ADMIN' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('NEGA acesso quando o perfil do usuário autenticado não está entre os exigidos (MEDICO tentando endpoint ADMIN)', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const ctx = buildContext({ perfil: 'MEDICO' });
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('NEGA acesso quando não há usuário no request (não deveria ocorrer após JwtAuthGuard, mas o guard não deve confiar cegamente)', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const ctx = buildContext(undefined);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('permite quando o perfil do usuário bate com QUALQUER um dos múltiplos perfis exigidos', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN', 'AUDITOR']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(buildContext({ perfil: 'AUDITOR' }))).toBe(true);
    expect(guard.canActivate(buildContext({ perfil: 'HOSPITAL' }))).toBe(false);
  });

  it('a decisão depende exclusivamente de request.user.perfil (contexto server-side) — nunca de um campo enviado pelo cliente no body', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    // Mesmo que o "body" (não lido pelo guard) alegue ADMIN, só request.user importa.
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { perfil: 'MEDICO' },
          body: { perfil: 'ADMIN', role: 'ADMIN' },
        }),
      }),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
