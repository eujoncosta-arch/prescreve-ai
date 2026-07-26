import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

// ============================================================
// PRESCREVE-AI — Hardening de validação de entrada
//
// Alguns campos clínicos (ex.: `anamnese`) são deliberadamente objetos
// livres (`Record<string, unknown>`) — a forma exata varia por fluxo
// clínico e não há um schema fixo a validar campo a campo sem redesenhar
// a anamnese inteira (fora do escopo desta auditoria). Isso não pode,
// porém, significar "sem limite nenhum": este decorator impõe um teto no
// tamanho serializado do valor, impedindo payloads-bomba (objetos
// profundamente aninhados ou strings gigantes disfarçadas de JSON) mesmo
// quando a FORMA do objeto não é validada campo a campo.
// ============================================================

export function MaxJsonSize(
  maxBytes: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'maxJsonSize',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [maxBytes],
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (value === undefined || value === null) return true;
          const [max] = args.constraints as [number];
          try {
            return Buffer.byteLength(JSON.stringify(value), 'utf8') <= max;
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          const [max] = args.constraints as [number];
          return `${args.property} excede o tamanho máximo permitido (${max} bytes serializado em JSON)`;
        },
      },
    });
  };
}
