import { IsString, IsOptional, IsObject } from 'class-validator';

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

/**
 * Correção de vulnerabilidade: o endpoint POST /risco recebia um tipo
 * inline (`{ consulta_id: string; score: Record<string, unknown> }`) sem
 * classe decorada por class-validator — a ValidationPipe global
 * (whitelist/forbidNonWhitelisted) não consegue aplicar suas proteções a um
 * tipo que não é uma classe reconhecida em tempo de execução. Isso não
 * habilitava escalada de privilégio por si só, mas enfraquecia a validação
 * de entrada nesse endpoint em relação aos demais. Corrigido com um DTO
 * real.
 */
export class SalvarRiscoDto {
  @IsString()
  consulta_id: string;

  @IsObject()
  score: Record<string, unknown>;
}
