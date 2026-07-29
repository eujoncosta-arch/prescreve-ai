// ============================================================
// PRESCREVE-AI — RM-40: Validador de Integridade de Dados Clínicos (público)
// ============================================================

export type { AchadoIntegridade, RelatorioIntegridade, IntegridadeNivel } from './types';
export {
  validarIntegridadeGlobal,
  checarBaseCanonica,
  checarPediatricDoses,
  checarDoseAdultoLegado,
  extrairNumeroSimples,
  textoComparavel,
} from './engine';

import { validarIntegridadeGlobal } from './engine';

/** Formata o relatório de integridade em Markdown. */
export function formatIntegridadeMarkdown(report = validarIntegridadeGlobal()): string {
  const L: string[] = [];
  L.push('# RM40_DATA_INTEGRITY_REPORT');
  L.push('');
  L.push(
    `**Gerado:** ${report.timestamp} · **Entidades analisadas:** ${report.totalEntidadesAnalisadas} · **Build:** ${report.buildOk ? '✅ OK' : '❌ BLOQUEADO (erro)'}`,
  );
  L.push('');
  L.push('| Nível | Qtde |');
  L.push('|---|---|');
  for (const [nivel, n] of Object.entries(report.resumo)) L.push(`| ${nivel} | ${n} |`);
  L.push('');
  L.push('| Regra | Qtde |');
  L.push('|---|---|');
  for (const [regra, n] of Object.entries(report.porRegra)) L.push(`| ${regra} | ${n} |`);
  L.push('');
  if (report.achados.length === 0) {
    L.push('✅ Nenhuma inconsistência detectada em molécula/marca/classe/ATC/dose/unidade/frequência/indicação/população/idade/peso/dose máxima/fonte/proveniência/nível de evidência.');
  } else {
    L.push('## Achados');
    L.push('');
    L.push('| Nível | Regra | Entidade | Mensagem | Correção sugerida |');
    L.push('|---|---|---|---|---|');
    for (const a of report.achados) {
      L.push(`| ${a.nivel} | ${a.regra} | ${a.entidade} | ${a.mensagem.replace(/\|/g, '/')} | ${(a.correcaoSugerida ?? '').replace(/\|/g, '/')} |`);
    }
  }
  L.push('');
  L.push('---');
  L.push('');
  L.push('*RM-40 Data Integrity Validator · compõe RM-23 (drug-consistency) + checagens próprias de dose/unidade/faixa etária/ATC/fonte/população.*');
  return L.join('\n');
}
