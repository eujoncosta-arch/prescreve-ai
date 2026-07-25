import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RefreshDto,
  RegisterDto,
  CriarUsuarioPrivilegiadoDto,
} from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Perfil } from '@prisma/client';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  /**
   * Cadastro público — SEMPRE cria perfil MEDICO. `RegisterDto` não possui
   * campo `perfil`; com `forbidNonWhitelisted: true` (main.ts), enviar
   * `perfil` no corpo da requisição é REJEITADO com 400 antes de chegar aqui.
   */
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  /**
   * Fluxo administrativo seguro para criação de usuários com perfil
   * privilegiado (ADMIN, AUDITOR, HOSPITAL, LABORATORIO ou MEDICO).
   * Acessível SOMENTE por um usuário já autenticado com perfil ADMIN —
   * nunca pelo cadastro público. O primeiro ADMIN do sistema deve ser
   * provisionado fora da API pública (seed/console administrativo do banco).
   */
  @Post('admin/usuarios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Perfil.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  criarUsuarioPrivilegiado(
    @Body() dto: CriarUsuarioPrivilegiadoDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.auth.criarUsuarioPrivilegiado(dto, user.id);
  }

  // Rate limit próprio (mais restritivo que os 60/min globais) — mitiga
  // força bruta de senha e/ou código MFA diretamente no endpoint de login.
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip ?? req.headers['x-forwarded-for']?.toString();
    return this.auth.login(dto, ip);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refresh_token);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: { id: string }) {
    return this.auth.logout(user.id);
  }
}
