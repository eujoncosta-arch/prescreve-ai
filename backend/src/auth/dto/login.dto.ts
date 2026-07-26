import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';
import { Perfil } from '@prisma/client';

/**
 * TOTP (6 dígitos) OU código de recuperação de uso único no formato REAL
 * emitido pelo servidor: "XXXXX-XXXXX" (5 hex + traço + 5 hex — ver
 * MfaService.gerarCodigosRecuperacaoTexto()).
 *
 * BUG REAL CORRIGIDO (auditoria de segurança final): este padrão exigia
 * 10 caracteres hex SEM traço, mas o código de recuperação gerado e
 * hasheado no banco SEMPRE inclui o traço no meio (11 caracteres). Um
 * usuário digitando o código exatamente como recebido era sempre
 * rejeitado com 400 antes de chegar ao MfaService — a rota de
 * recuperação (perda do dispositivo TOTP) estava inutilizável via API
 * pública, mesmo para usuários legítimos.
 */
const MFA_CODE_PATTERN = /^[0-9A-Fa-f]{6}$|^[0-9A-Fa-f]{5}-[0-9A-Fa-f]{5}$/;

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  // bcrypt trunca/ignora além de 72 bytes — limitar aqui evita hashing
  // desnecessário de strings gigantes enviadas de propósito.
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  senha: string;

  @IsOptional()
  @IsString()
  @Matches(MFA_CODE_PATTERN, {
    message:
      'mfa_code deve ser um TOTP de 6 dígitos ou um código de recuperação no formato XXXXX-XXXXX',
  })
  mfa_code?: string;
}

export class RefreshDto {
  @IsString()
  @MaxLength(2000)
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
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  senha: string;

  // Médico (único perfil elegível via cadastro público)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  crm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  especialidade?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{2}$/, {
    message: 'uf deve ser a sigla de 2 letras do estado',
  })
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
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  senha: string;

  @IsEnum(Perfil, {
    message: 'perfil deve ser um dos valores válidos do enum Perfil',
  })
  perfil: Perfil;

  // Médico
  @IsOptional()
  @IsString()
  @MaxLength(20)
  crm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  especialidade?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{2}$/, {
    message: 'uf deve ser a sigla de 2 letras do estado',
  })
  uf?: string;
}
