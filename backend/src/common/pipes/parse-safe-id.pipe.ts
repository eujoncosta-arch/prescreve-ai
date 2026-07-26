import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

// ============================================================
// PRESCREVE-AI — Hardening de validação de entrada
//
// IDs de recurso (Prisma `cuid()`) e códigos CID (ex.: "E11.9") chegam
// como `@Param()` de rota — fora do alcance da ValidationPipe baseada em
// DTO. Sem este pipe, um cliente podia enviar uma string arbitrariamente
// longa/com caracteres de controle nesses parâmetros, chegando direto ao
// Prisma sem qualquer checagem de forma. Não valida formato exato de cuid
// (evita quebrar IDs legítimos por um regex frágil demais) — apenas
// impõe um alfabeto seguro e um teto de comprimento.
// ============================================================

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_.-]{1,64}$/;

@Injectable()
export class ParseSafeIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !SAFE_ID_PATTERN.test(value)) {
      throw new BadRequestException('Identificador inválido');
    }
    return value;
  }
}
