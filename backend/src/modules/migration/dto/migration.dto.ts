import {
  IsOptional,
  IsString,
  IsArray,
  MaxLength,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================
// PRESCREVE-AI — Hardening de validação de entrada
//
// Antes desta auditoria, `POST /api/migration` recebia um tipo inline
// (`{ prescricoes?: unknown[]; validacoes?: unknown[]; consultas?:
// unknown[] }`) — não uma classe decorada por class-validator. A
// ValidationPipe global (whitelist/forbidNonWhitelisted) NÃO tem efeito
// nenhum sobre um tipo que só existe em tempo de compilação: qualquer
// campo desconhecido, array de tamanho arbitrário ou string sem limite
// passava direto para o service. Corrigido com DTOs reais.
//
// `dados` de cada item de prescrição/validação legada (localStorage do
// frontend) permanece parcialmente livre em forma — é dado histórico de
// formato variável, não um novo recurso clínico — mas ganha teto de
// comprimento em toda string e de tamanho em todo array, o que hoje não
// existia de forma nenhuma.
// ============================================================

export class LocalPrescricaoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  id?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  medicamentos?: unknown[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  orientacoes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  diagnostico?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  criado_em?: string;
}

export class LocalValidacaoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  crm_hash?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  especialidade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  veredicto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  justificativa?: string;
}

export class MigrarHistoricoDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200, {
    message: 'prescricoes não pode exceder 200 itens por lote de migração',
  })
  @ValidateNested({ each: true })
  @Type(() => LocalPrescricaoDto)
  prescricoes?: LocalPrescricaoDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200, {
    message: 'validacoes não pode exceder 200 itens por lote de migração',
  })
  @ValidateNested({ each: true })
  @Type(() => LocalValidacaoDto)
  validacoes?: LocalValidacaoDto[];

  /** Blob histórico de anamneses migradas — forma livre (dado legado), teto só de quantidade. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  consultas?: unknown[];
}
