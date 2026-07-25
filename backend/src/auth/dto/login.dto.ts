import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Perfil } from '@prisma/client';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  senha: string;

  @IsOptional()
  @IsString()
  mfa_code?: string;
}

export class RefreshDto {
  @IsString()
  refresh_token: string;
}

/**
 * Cadastro público — SEMPRE cria perfil MEDICO (AuthService.register() força
 * isso no server, ignorando qualquer valor de `perfil` enviado pelo cliente).
 * Este DTO deliberadamente NÃO declara um campo `perfil`: com
 * `forbidNonWhitelisted: true` (main.ts), qualquer tentativa de enviar
 * `perfil` no payload é REJEITADA com 400 pela ValidationPipe global, antes
 * mesmo de chegar ao controller/service — não apenas ignorada.
 */
export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  senha: string;

  // Médico (único perfil elegível via cadastro público)
  @IsOptional()
  @IsString()
  crm?: string;

  @IsOptional()
  @IsString()
  especialidade?: string;

  @IsOptional()
  @IsString()
  uf?: string;
}

/**
 * Criação de usuário com perfil PRIVILEGIADO (ADMIN, AUDITOR, HOSPITAL,
 * LABORATORIO ou MEDICO) — usado exclusivamente pelo endpoint administrativo
 * `POST /auth/admin/usuarios`, protegido por JwtAuthGuard + RolesGuard +
 * @Roles(Perfil.ADMIN). Nunca exposto ao cadastro público.
 */
export class CriarUsuarioPrivilegiadoDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  senha: string;

  @IsEnum(Perfil, {
    message: 'perfil deve ser um dos valores válidos do enum Perfil',
  })
  perfil: Perfil;

  // Médico
  @IsOptional()
  @IsString()
  crm?: string;

  @IsOptional()
  @IsString()
  especialidade?: string;

  @IsOptional()
  @IsString()
  uf?: string;
}
