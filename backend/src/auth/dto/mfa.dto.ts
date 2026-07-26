import { IsString, Length, MaxLength, Matches } from 'class-validator';

export class AtivarMfaDto {
  @IsString()
  @Length(6, 6, { message: 'code deve ter exatamente 6 dígitos (código TOTP)' })
  @Matches(/^\d{6}$/, { message: 'code deve conter apenas dígitos' })
  code: string;
}

/** TOTP (6 dígitos) OU código de recuperação de uso único (10 caracteres hex). */
const MFA_CODE_PATTERN = /^[0-9A-Fa-f]{6}$|^[0-9A-Fa-f]{10}$/;

export class DesativarMfaDto {
  @IsString()
  @MaxLength(72)
  senha: string;

  @IsString()
  @Matches(MFA_CODE_PATTERN, {
    message:
      'code deve ser um TOTP de 6 dígitos ou um código de recuperação de 10 caracteres',
  })
  code: string;
}
