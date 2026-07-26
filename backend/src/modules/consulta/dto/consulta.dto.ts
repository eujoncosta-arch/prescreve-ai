import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsInt,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  ValidateNested,
  MaxLength,
  Min,
  Max,
  ArrayMaxSize,
  ArrayMinSize,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NivelRisco } from '@prisma/client';
import { MaxJsonSize } from '../../../common/validators/max-json-size.validator';

// ============================================================
// PRESCREVE-AI — Hardening de validação de entrada (auditoria dedicada)
//
// Toda string aceita um teto de comprimento; todo array um teto de
// tamanho; todo enum é validado contra o enum real do Prisma (nunca uma
// string solta assumida como válida); todo número tem um intervalo
// plausível. `anamnese`/campos Json continuam intencionalmente livres em
// FORMA (não há um schema clínico único a impor sem redesenhar a
// anamnese), mas ganham um teto de TAMANHO via @MaxJsonSize — nunca mais
// "sem limite nenhum".
// ============================================================

export class CriarConsultaDto {
  /** Hash SHA-256 (hex) do identificador do paciente — sempre 64 caracteres hex. */
  @IsOptional()
  @IsString()
  @Matches(/^[a-fA-F0-9]{64}$/, {
    message:
      'paciente_hash deve ser um hash SHA-256 em hexadecimal (64 caracteres)',
  })
  paciente_hash?: string;

  @IsOptional()
  @IsObject()
  @MaxJsonSize(50_000, {
    message: 'anamnese excede o tamanho máximo permitido (50KB serializado)',
  })
  anamnese?: Record<string, unknown>;
}

export class CriarDiagnosticoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  consulta_id: string;

  /** Código CID (ex.: "I10", "E11.9") — nunca uma string livre longa. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  cid: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  descricao: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confianca?: number;

  @IsOptional()
  @IsBoolean()
  selecionado?: boolean;
}

export class ItemMedicamentoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  molecula: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  dose: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  via: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  frequencia: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  duracao: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;
}

export class CriarPrescricaoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  consulta_id: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
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
  @ArrayMinSize(1, { message: 'medicamentos deve conter ao menos 1 item' })
  @ArrayMaxSize(50, { message: 'medicamentos não pode exceder 50 itens' })
  @ValidateNested({ each: true })
  @Type(() => ItemMedicamentoDto)
  medicamentos: ItemMedicamentoDto[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  orientacoes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  validade_dias?: number;
}

/**
 * Payload estruturado de risk score — substitui o antigo
 * `Record<string, unknown>` sem NENHUMA validação (nem de tipo, nem de
 * enum, nem de intervalo). `risco_global` é validado contra o enum real
 * do Prisma (`NivelRisco`) em vez de aceito como qualquer string e
 * apenas castado depois no service — antes, um valor inválido só falhava
 * tarde, no INSERT do Prisma (erro 500 de runtime em vez de 400 de
 * validação). Os blocos `risco_*` continuam Json livre (estrutura interna
 * de cada dimensão de risco não é fixa) mas ganham teto de tamanho.
 */
export class RiskScorePayloadDto {
  @IsEnum(NivelRisco, {
    message: `risco_global deve ser um dos valores: ${Object.values(NivelRisco).join(', ')}`,
  })
  risco_global: NivelRisco;

  @IsNumber()
  @Min(0)
  @Max(100)
  score_global: number;

  @IsOptional()
  @IsBoolean()
  alerta_vermelho?: boolean;

  @IsOptional()
  @IsObject()
  @MaxJsonSize(5_000)
  risco_cardiovascular?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  @MaxJsonSize(5_000)
  risco_renal?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  @MaxJsonSize(5_000)
  risco_hemorragico?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  @MaxJsonSize(5_000)
  risco_farmacologico?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  @MaxJsonSize(5_000)
  risco_interacao?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  @MaxJsonSize(5_000)
  risco_terapeutico?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  recomendacoes_prioritarias?: string[];
}

export class SalvarRiscoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  consulta_id: string;

  @IsObject()
  @ValidateNested()
  @Type(() => RiskScorePayloadDto)
  score: RiskScorePayloadDto;
}

/** Paginação de listagem — nunca confia em `limite` livre do cliente (teto explícito evita varredura de tabela sem limite). */
export class PaginacaoQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number = 20;
}
