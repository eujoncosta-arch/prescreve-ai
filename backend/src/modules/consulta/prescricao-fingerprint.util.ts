import * as crypto from 'crypto';

// ============================================================
// RM-107.1.1-E2.5 — Fingerprint canônico do CONTEÚDO de uma operação de criação de prescrição.
//
// Objetivo: a mesma `idempotency_key` com o mesmo conteúdo devolve o registro original; com conteúdo DIFERENTE é conflito explícito (HTTP 409).
// Nunca serve para identificar pessoas (não inclui CPF/identificadores do paciente; só o conteúdo da prescrição).
//
// ALGORITMO (versão "v1"):
//   1. Entrada = exatamente os campos que a operação persiste: consulta_id, diagnostico_id, medicamentos, orientacoes, validade_dias.
//      (`idempotency_key`, `usuario_id`, timestamps e `hash_integridade` NÃO entram: não alteram o conteúdo da prescrição.)
//   2. `medicamentos` é tomado pelo mesmo round-trip JSON que o service persiste (`JSON.parse(JSON.stringify(...))`) e canonicalizado
//      RECURSIVAMENTE, sem lista branca: qualquer propriedade que seria persistida entra no fingerprint.
//   3. Canonicalização: chaves de objeto em ordem lexicográfica (code unit); propriedades `undefined`/`null` são omitidas (ausente ≡ nulo ≡ omitido);
//      ARRAYS MANTÊM A ORDEM (a ordem dos medicamentos é parte do conteúdo persistido: trocar a ordem ⇒ conteúdo diferente ⇒ conflito);
//      strings EXATAS (sem trim/normalização Unicode/caixa); números como `JSON.stringify` (mesmo valor ⇒ mesma representação; 500 ≡ 500.0;
//      NENHUM arredondamento, conversão de unidade ou recálculo); booleanos literais.
//   4. Defaults: `validade_dias` ausente/nulo ≡ 30 (o valor efetivamente persistido); `diagnostico_id`/`orientacoes` ausente ≡ nulo.
//      `orientacoes: ""` NÃO é equivalente a ausente (são valores persistidos diferentes).
//   5. fingerprint = sha256_hex("v1\n" + JSON_canônico).
// ============================================================

export const FINGERPRINT_VERSAO = 'v1';
export const VALIDADE_DIAS_PADRAO = 30;

/** JSON canônico determinístico. Valores não finitos (NaN/Infinity) não são serializáveis em JSON e são rejeitados (nunca "arredondados"). */
export function canonicalizar(valor: unknown): string {
  if (valor === null) return 'null';
  switch (typeof valor) {
    case 'string':
    case 'boolean':
      return JSON.stringify(valor);
    case 'number':
      if (!Number.isFinite(valor)) {
        throw new TypeError('valor numérico não finito não é canonicalizável');
      }
      return JSON.stringify(valor);
    case 'object': {
      if (Array.isArray(valor)) {
        // Elementos nulos/indefinidos de ARRAY são preservados como null (a posição faz parte do conteúdo).
        return `[${valor.map((v) => (v === undefined ? 'null' : canonicalizar(v))).join(',')}]`;
      }
      const o = valor as Record<string, unknown>;
      const chaves = Object.keys(o)
        .filter((k) => o[k] !== undefined && o[k] !== null)
        .sort();
      return `{${chaves.map((k) => `${JSON.stringify(k)}:${canonicalizar(o[k])}`).join(',')}}`;
    }
    default:
      throw new TypeError(`tipo não canonicalizável: ${typeof valor}`);
  }
}

export interface ConteudoPrescricao {
  consulta_id: string;
  diagnostico_id?: string | null;
  medicamentos: unknown;
  orientacoes?: string | null;
  validade_dias?: number | null;
}

export function fingerprintPrescricao(c: ConteudoPrescricao): string {
  // Mesmo round-trip que o service aplica antes de gravar (instâncias de DTO ⇒ objetos planos).
  const medicamentos = JSON.parse(
    JSON.stringify(c.medicamentos ?? null),
  ) as unknown;
  const canonico = canonicalizar({
    consulta_id: c.consulta_id,
    diagnostico_id: c.diagnostico_id ?? null,
    medicamentos,
    orientacoes: c.orientacoes ?? null,
    validade_dias: c.validade_dias ?? VALIDADE_DIAS_PADRAO,
  });
  return crypto
    .createHash('sha256')
    .update(`${FINGERPRINT_VERSAO}\n${canonico}`)
    .digest('hex');
}

/**
 * Fingerprint derivado do registro PERSISTIDO (estratégia para registros legados com coluna NULL).
 * Retorna `null` quando o registro não tem conteúdo comparável (ex.: `medicamentos` ausente/não-array) — nesse caso o chamador mantém o
 * comportamento anterior (devolve o registro existente), nunca inventa uma divergência.
 */
export function fingerprintDeRegistroPersistido(r: {
  consulta_id?: string;
  diagnostico_id?: string | null;
  medicamentos?: unknown;
  orientacoes?: string | null;
  validade_dias?: number | null;
}): string | null {
  if (typeof r.consulta_id !== 'string' || !Array.isArray(r.medicamentos))
    return null;
  return fingerprintPrescricao({
    consulta_id: r.consulta_id,
    diagnostico_id: r.diagnostico_id,
    medicamentos: r.medicamentos,
    orientacoes: r.orientacoes,
    validade_dias: r.validade_dias,
  });
}
