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
  ValidateIf,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  MaxLength,
  MinLength,
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
// PRESCREVE-AI — Integridade de persistência (idempotência)
//
// `idempotency_key` é gerada pelo CLIENTE (UUID v4) e reaproveitada em
// todo retry da mesma operação (timeout, falha de rede, fila de
// sincronização). O service faz upsert-por-chave: se um registro com a
// mesma chave já existe, retorna o registro existente em vez de criar
// um duplicado — nunca confia em "o cliente promete não reenviar".
// ============================================================
function IsIdempotencyKey() {
  return function (target: object, propertyKey: string) {
    IsOptional()(target, propertyKey);
    IsString()(target, propertyKey);
    MinLength(8, {
      message: 'idempotency_key deve ter ao menos 8 caracteres',
    })(target, propertyKey);
    MaxLength(100)(target, propertyKey);
  };
}

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
  /**
   * CPF em texto puro (só dígitos ou com pontuação — normalizado no
   * service). Auditoria de privacidade: o cliente NUNCA deve calcular esse
   * hash sozinho — um hash calculado no frontend usaria necessariamente um
   * algoritmo sem segredo (o segredo não pode viver em código público de
   * navegador), reduzindo a proteção a um SHA-256 simples de um valor de
   * baixa entropia (rainbow table trivial). O CPF é recebido em texto puro
   * aqui (só em memória, nunca persistido nem logado em texto puro — ver
   * `ConsultaService.criarConsulta`) e pseudonimizado no SERVIDOR com
   * HMAC-SHA256 e uma chave que nunca sai do backend
   * (`common/crypto/identifier-hash.util.ts`).
   */
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: 'paciente_cpf deve ter 11 dígitos (com ou sem pontuação)',
  })
  paciente_cpf?: string;

  @IsOptional()
  @IsObject()
  @MaxJsonSize(50_000, {
    message: 'anamnese excede o tamanho máximo permitido (50KB serializado)',
  })
  anamnese?: Record<string, unknown>;

  @IsIdempotencyKey()
  idempotency_key?: string;
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

  @IsIdempotencyKey()
  idempotency_key?: string;
}

// ============================================================
// PRESCREVE-AI — Contrato estruturado de dose (auditoria RM-36)
//
// PROBLEMA: `ItemMedicamentoDto.dose` era texto livre (`string`) — o
// backend aceitava "500 mg", "500 mL", "20 gotas", "500 mg/kg/dia" ou
// QUALQUER string arbitrária sem nenhuma validação semântica. A proteção
// de unidade existia principalmente no frontend (parser de exibição), não
// no contrato persistido — permitindo gravar uma dose semanticamente
// inválida (unidade desconhecida, valor negativo/zero/absurdo, frequência
// não reconhecida) que nenhum consumidor posterior (auditoria, relatório,
// segunda opinião) consegue reconstituir com confiança.
//
// CORREÇÃO: `dose` passa a ser um objeto ESTRUTURADO
// (`DoseEstruturadaDto`) com valor/unidade/frequência/via tipados e
// validados, mais `dose_por_kg_dia`/`dose_por_tomada` opcionais quando a
// dose foi calculada por peso. Texto livre nunca é mais a ÚNICA
// representação da dose — sobrevive apenas como `observacoes` no item
// (instrução/orientação adicional) e como `frequencia_detalhe` (só
// quando `frequencia` é 'outro'/'nao_diaria', nunca substituindo os
// campos estruturados).
// ============================================================

/** Unidades de dose aceitas — nunca uma string livre. */
export enum UnidadeDose {
  MG = 'mg',
  MCG = 'mcg',
  G = 'g',
  ML = 'mL',
  GOTAS = 'gotas',
  UI = 'UI',
  COMPRIMIDO = 'comprimido',
  CAPSULA = 'capsula',
  SACHE = 'sache',
  AMPOLA = 'ampola',
  JATO = 'jato',
  APLICACAO = 'aplicacao',
}

/**
 * Unidades cuja grandeza é uma massa/volume/atividade contínua —
 * compatíveis com cálculo por peso (`dose_por_kg_dia`/`dose_por_tomada`).
 * Formas farmacêuticas discretas (comprimido, cápsula, sachê, ampola,
 * jato, aplicação) não são combináveis com mg/kg: "1 comprimido/kg" não é
 * uma grandeza farmacológica válida — ver `CoerenciaDoseKgConstraint`.
 */
const UNIDADES_PONDERAVEIS = new Set<UnidadeDose>([
  UnidadeDose.MG,
  UnidadeDose.MCG,
  UnidadeDose.G,
  UnidadeDose.ML,
  UnidadeDose.GOTAS,
  UnidadeDose.UI,
]);

/** Frequências de administração aceitas — nunca uma string livre. */
export enum FrequenciaDose {
  UMA_X_DIA = '1x/dia',
  DUAS_X_DIA = '2x/dia',
  TRES_X_DIA = '3x/dia',
  QUATRO_X_DIA = '4x/dia',
  A_CADA_4H = 'a_cada_4h',
  A_CADA_6H = 'a_cada_6h',
  A_CADA_8H = 'a_cada_8h',
  A_CADA_12H = 'a_cada_12h',
  DOSE_UNICA = 'dose_unica',
  USO_CONTINUO = 'uso_continuo',
  SOS = 'sos',
  /** Periodicidade não diária (semanal/mensal/a cada N dias) — detalhar em `frequencia_detalhe`. */
  NAO_DIARIA = 'nao_diaria',
  /** Esquema que não cabe nas opções acima — SEMPRE exige `frequencia_detalhe`; nunca um escape para dose inteira em texto livre. */
  OUTRO = 'outro',
}

const FREQUENCIAS_QUE_EXIGEM_DETALHE = new Set<FrequenciaDose>([
  FrequenciaDose.NAO_DIARIA,
  FrequenciaDose.OUTRO,
]);

@ValidatorConstraint({ name: 'coerenciaDoseKg', async: false })
class CoerenciaDoseKgConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as DoseEstruturadaDto;
    return UNIDADES_PONDERAVEIS.has(obj.unidade);
  }
  defaultMessage(): string {
    return 'dose_por_kg_dia/dose_por_tomada exigem uma unidade ponderável (mg, mcg, g, mL, gotas, UI) — incompatível com formas farmacêuticas discretas (comprimido, cápsula, sachê, ampola, jato, aplicação)';
  }
}

export class DoseEstruturadaDto {
  /** Valor numérico da dose — sempre positivo; teto evita erro de digitação/unidade grosseiro (ex.: "500000"). */
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'valor deve ser um número' })
  @Min(0.0001, {
    message:
      'valor deve ser positivo (dado ausente/zero nunca deve ser representado como 0 — omita o item em vez disso)',
  })
  @Max(100000, { message: 'valor excede o limite plausível para uma dose' })
  valor: number;

  @IsEnum(UnidadeDose, {
    message: `unidade deve ser uma das: ${Object.values(UnidadeDose).join(', ')}`,
  })
  unidade: UnidadeDose;

  @IsEnum(FrequenciaDose, {
    message: `frequencia deve ser uma das: ${Object.values(FrequenciaDose).join(', ')}`,
  })
  frequencia: FrequenciaDose;

  /** Obrigatório apenas quando `frequencia` é 'nao_diaria' ou 'outro' — nunca substitui os campos estruturados, apenas os complementa. */
  @ValidateIf((o: DoseEstruturadaDto) =>
    FREQUENCIAS_QUE_EXIGEM_DETALHE.has(o.frequencia),
  )
  @IsString()
  @IsNotEmpty({
    message:
      'frequencia_detalhe é obrigatório quando frequencia é "nao_diaria" ou "outro"',
  })
  @MaxLength(200)
  frequencia_detalhe?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  via: string;

  /** Dose por kg de peso corporal AO DIA — só quando a dose foi calculada por peso. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001, { message: 'dose_por_kg_dia deve ser positiva' })
  @Max(10000, { message: 'dose_por_kg_dia excede o limite plausível' })
  @Validate(CoerenciaDoseKgConstraint)
  dose_por_kg_dia?: number;

  /** Dose por kg de peso corporal POR TOMADA — só quando a dose foi calculada por peso. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001, { message: 'dose_por_tomada deve ser positiva' })
  @Max(10000, { message: 'dose_por_tomada excede o limite plausível' })
  @Validate(CoerenciaDoseKgConstraint)
  dose_por_tomada?: number;
}

export class ItemMedicamentoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  molecula: string;

  @IsObject()
  @ValidateNested()
  @Type(() => DoseEstruturadaDto)
  dose: DoseEstruturadaDto;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  duracao: string;

  /** Texto livre — SOMENTE instrução/orientação adicional, nunca a única representação da dose. */
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

  @IsIdempotencyKey()
  idempotency_key?: string;
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

  @IsIdempotencyKey()
  idempotency_key?: string;
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
