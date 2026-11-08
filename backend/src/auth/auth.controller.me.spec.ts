import { AuthController } from './auth.controller';
import { Perfil } from '@prisma/client';

// RM-107.1.1-E2.8.1 — GET /auth/me devolve só {id, email, perfil} do usuário já autenticado pelo guard (a validação do token é do JwtAuthGuard/JwtStrategy).
describe('AuthController.me', () => {
  it('devolve exatamente id, email e perfil — nenhum outro campo do usuário autenticado', () => {
    const ctrl = new AuthController({} as never);
    const user = {
      id: 'u1',
      email: 'a@x.com',
      perfil: Perfil.MEDICO,
      senha_hash: 'NAO-VAZAR',
      ativo: true,
    };
    expect(ctrl.me(user as never)).toEqual({
      id: 'u1',
      email: 'a@x.com',
      perfil: 'MEDICO',
    });
  });
});
