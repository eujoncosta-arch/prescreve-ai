// ============================================================
// PRESCREVE-AI — RM-62: registro de exceções aceitas
//
// Uma exceção NUNCA é genérica: precisa de id estável, molécula +
// concentrações exatas às quais se aplica, justificativa, referência
// verificável e quem/qual processo decidiu. `validarExcecao()` roda no
// carregamento do módulo — uma exceção malformada quebra o build
// imediatamente, em vez de ser silenciosamente ignorada.
//
// Este arquivo NÃO deve virar uma allowlist de conveniência: cada entrada
// aqui representa um caso individualmente revisado, não uma categoria
// inteira de achados "aceitos por padrão". Ver RM-62-BRAND-INTEGRITY-CI-GATE.md
// para o racional de por que cada exceção existe.
// ============================================================

import type { BrandConcentrationException } from './types';

function validarExcecao(e: BrandConcentrationException): void {
  if (!e.id?.trim()) {
    throw new Error('RM-62: exceção sem `id` estável — toda exceção precisa de um identificador.');
  }
  if (!e.molecula?.trim()) {
    throw new Error(`RM-62: exceção "${e.id}" sem \`molecula\`.`);
  }
  if (!e.concentracoes?.length) {
    throw new Error(`RM-62: exceção "${e.id}" sem \`concentracoes\` declaradas.`);
  }
  if (!e.justificativa?.trim() || e.justificativa.trim().length < 20) {
    throw new Error(`RM-62: exceção "${e.id}" sem justificativa suficiente (mínimo 20 caracteres — não aceitar "ok"/"revisado").`);
  }
  if (!e.referencia?.trim()) {
    throw new Error(`RM-62: exceção "${e.id}" sem \`referencia\` verificável — exceções não documentadas não são aceitas.`);
  }
  if (!e.decididoPor?.trim()) {
    throw new Error(`RM-62: exceção "${e.id}" sem \`decididoPor\`.`);
  }
  if (!e.data?.trim() || Number.isNaN(Date.parse(e.data))) {
    throw new Error(`RM-62: exceção "${e.id}" com \`data\` ausente ou inválida.`);
  }
}

export const ACCEPTED_EXCEPTIONS: BrandConcentrationException[] = [
  {
    id: 'sinot-clav-augmentin-2026-07-rm58',
    molecula: 'Amoxicilina + Clavulanato',
    concentracoes: ['400/57 mg/5 mL', '875/125 mg'],
    justificativa:
      'Amoxicilina+clavulanato tem concentrações comerciais padronizadas ' +
      'regulatoriamente para suspensão oral e comprimido no mercado ' +
      'brasileiro. Sinot Clav® (Eurofarma) e Augmentin (GSK) foram ' +
      'verificados INDIVIDUALMENTE contra bula/registro de cada marca ' +
      'durante a RM-58 (que também corrigiu o próprio Sinot Clav® de um ' +
      'conjunto de 4 concentrações — 2 delas nunca vendidas pela Eurofarma ' +
      'sob essa marca — para as 2 concentrações reais). Concentrações ' +
      'idênticas entre as duas marcas refletem o mesmo par de ' +
      'apresentações aprovadas, não cópia de dado não verificado.',
    referencia: 'docs/RM-58-AUDITORIA-GERAL-E-CORRECOES.md (correção original do Sinot Clav®, com verificação de bula por marca)',
    decididoPor: 'auditoria-farmaceutica:RM-58',
    data: '2026-07-25',
  },
];

for (const excecao of ACCEPTED_EXCEPTIONS) validarExcecao(excecao);
