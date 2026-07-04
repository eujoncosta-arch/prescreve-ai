import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';

export class CriarConsultaDto {
  @IsOptional()
  @IsString()
  paciente_hash?: string;

  @IsOptional()
  @IsObject()
  anamnese?: Record<string, unknown>;
}

export class CriarDiagnosticoDto {
  @IsString()
  consulta_id: string;

  @IsString()
  cid: string;

  @IsString()
  descricao: string;

  @IsOptional()
  confianca?: number;

  @IsOptional()
  selecionado?: boolean;
}

export class CriarPrescricaoDto {
  @IsString()
  consulta_id: string;

  @IsOptional()
  @IsString()
  diagnostico_id?: string;

  medicamentos: {
    molecula: string;
    dose: string;
    via: string;
    frequencia: string;
    duracao: string;
    observacoes?: string;
  }[];

  @IsOptional()
  @IsString()
  orientacoes?: string;

  @IsOptional()
  validade_dias?: number;
}
