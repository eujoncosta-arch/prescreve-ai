import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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

export class ItemMedicamentoDto {
  @IsString()
  molecula: string;

  @IsString()
  dose: string;

  @IsString()
  via: string;

  @IsString()
  frequencia: string;

  @IsString()
  duracao: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class CriarPrescricaoDto {
  @IsString()
  consulta_id: string;

  @IsOptional()
  @IsString()
  diagnostico_id?: string;

  /**
   * Sem @IsArray()/@ValidateNested() esta propriedade não tem NENHUM
   * decorator de class-validator — com `whitelist: true` (main.ts), o
   * ValidationPipe global trata propriedades sem metadata de validação
   * como desconhecidas e as remove/rejeita, quebrando o endpoint inteiro
   * para qualquer uso legítimo (bug encontrado ao escrever o teste e2e
   * real de ownership desta auditoria — não relacionado a IDOR).
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemMedicamentoDto)
  medicamentos: ItemMedicamentoDto[];

  @IsOptional()
  @IsString()
  orientacoes?: string;

  @IsOptional()
  @IsInt()
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
