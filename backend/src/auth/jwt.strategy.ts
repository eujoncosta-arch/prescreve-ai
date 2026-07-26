import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { getRequiredSecret } from './jwt-secrets.util';

export interface JwtPayload {
  sub: string;
  email: string;
  perfil: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getRequiredSecret(config, 'JWT_SECRET'),
      // Defesa em profundidade (auditoria de segurança final, JWT-01):
      // fixa explicitamente o algoritmo de verificação em HS256. Sem isso,
      // a biblioteca já rejeita 'alg: none' e confusão RS/HS por padrão
      // quando secretOrKey é uma string — mas fixar aqui remove qualquer
      // dependência implícita desse comportamento padrão da lib.
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, perfil: true, ativo: true },
    });
    if (!user || !user.ativo)
      throw new UnauthorizedException('Usuário inativo ou não encontrado');
    return user;
  }
}
