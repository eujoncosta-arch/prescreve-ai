import { IsString, Length } from 'class-validator';

export class AtivarMfaDto {
  @IsString()
  @Length(6, 6, { message: 'code deve ter exatamente 6 dígitos (código TOTP)' })
  code: string;
}

export class DesativarMfaDto {
  @IsString()
  senha: string;

  @IsString()
  code: string;
}
