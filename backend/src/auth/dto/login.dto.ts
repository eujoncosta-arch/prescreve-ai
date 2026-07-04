import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

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

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  senha: string;

  @IsString()
  perfil: string;

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
