// ============================================================
// PRESCREVE-AI — RM-22: Clinical Regression Suite (framework)
//
// Garante que alterações futuras não causem regressões clínicas.
// Cada caso simula um cenário real e verifica, contra os motores reais
// (safety-rules → pharma-core, pediatric-engine, dose-calculator,
// drugRepository), que o resultado esperado continua sendo produzido.
//
// Cada caso expõe: Caso clínico · Entrada · Resultado esperado ·
// Resultado obtido · Status. Executado automaticamente pelo Vitest.
// ============================================================

import { runSafetyCheck, type QuickSafetyAlert, type SafetyCheckInput } from '@/lib/safety-rules';

export type ClinicalCategory =
  | 'pediatria'
  | 'idosos'
  | 'gestantes'
  | 'renal'
  | 'interacoes'
  | 'contraindicacoes'
  | 'dose'
  | 'controlados';

export type CaseStatus = 'PASS' | 'FAIL';

/** Definição de um caso de regressão clínica. */
export interface ClinicalCase {
  id: string;
  category: ClinicalCategory;
  /** Descrição do caso clínico (paciente + contexto). */
  caso: string;
  /** Entrada legível (o que é submetido ao motor). */
  entrada: string;
  /** Resultado esperado legível. */
  esperado: string;
  /** Executa o motor real e devolve o observado + veredito. */
  assert: () => { obtido: string; status: CaseStatus };
}

export interface CaseResult {
  id: string;
  category: ClinicalCategory;
  caso: string;
  entrada: string;
  esperado: string;
  obtido: string;
  status: CaseStatus;
}

export interface SuiteResult {
  results: CaseResult[];
  total: number;
  passed: number;
  failed: number;
  byCategory: Record<string, { total: number; passed: number }>;
}

export function runCase(c: ClinicalCase): CaseResult {
  let obtido: string;
  let status: CaseStatus;
  try {
    const r = c.assert();
    obtido = r.obtido;
    status = r.status;
  } catch (e) {
    obtido = `ERRO: ${(e as Error).message}`;
    status = 'FAIL';
  }
  return {
    id: c.id,
    category: c.category,
    caso: c.caso,
    entrada: c.entrada,
    esperado: c.esperado,
    obtido,
    status,
  };
}

export function runSuite(cases: ClinicalCase[]): SuiteResult {
  const results = cases.map(runCase);
  const byCategory: SuiteResult['byCategory'] = {};
  for (const r of results) {
    const b = (byCategory[r.category] ??= { total: 0, passed: 0 });
    b.total++;
    if (r.status === 'PASS') b.passed++;
  }
  return {
    results,
    total: results.length,
    passed: results.filter((r) => r.status === 'PASS').length,
    failed: results.filter((r) => r.status === 'FAIL').length,
    byCategory,
  };
}

// ── Helpers de asserção sobre alertas do safety engine ───────────────────────

export function safety(input: SafetyCheckInput): QuickSafetyAlert[] {
  return runSafetyCheck(input);
}

export interface AlertMatcher {
  tipo?: QuickSafetyAlert['tipo'];
  severidade?: QuickSafetyAlert['severidade'];
  /** substring (case-insensitive) em título ou descrição */
  match?: string;
}

export function findAlert(alerts: QuickSafetyAlert[], m: AlertMatcher): QuickSafetyAlert | undefined {
  const q = m.match?.toLowerCase();
  return alerts.find(
    (a) =>
      (!m.tipo || a.tipo === m.tipo) &&
      (!m.severidade || a.severidade === m.severidade) &&
      (!q || a.titulo.toLowerCase().includes(q) || a.descricao.toLowerCase().includes(q)),
  );
}

/** PASS se existe um alerta que casa com o matcher. */
export function expectAlert(alerts: QuickSafetyAlert[], m: AlertMatcher): { obtido: string; status: CaseStatus } {
  const hit = findAlert(alerts, m);
  const resumo = alerts.length
    ? alerts.map((a) => `[${a.severidade}] ${a.titulo}`).join(' · ')
    : '(nenhum alerta)';
  return { obtido: resumo, status: hit ? 'PASS' : 'FAIL' };
}

/** PASS se NENHUM alerta casa com o matcher (ausência esperada). */
export function expectNoAlert(alerts: QuickSafetyAlert[], m: AlertMatcher): { obtido: string; status: CaseStatus } {
  const hit = findAlert(alerts, m);
  const resumo = alerts.length
    ? alerts.map((a) => `[${a.severidade}] ${a.titulo}`).join(' · ')
    : '(nenhum alerta)';
  return { obtido: resumo, status: hit ? 'FAIL' : 'PASS' };
}

/** PASS/FAIL a partir de uma condição booleana com descrição do observado. */
export function expectTrue(condition: boolean, obtido: string): { obtido: string; status: CaseStatus } {
  return { obtido, status: condition ? 'PASS' : 'FAIL' };
}

// ── Relatório Markdown (Caso/Entrada/Esperado/Obtido/Status) ─────────────────

export function formatReportMarkdown(suite: SuiteResult): string {
  const L: string[] = [];
  L.push('# RM22_CLINICAL_REGRESSION_REPORT');
  L.push('');
  L.push(`**Gerado:** ${new Date().toISOString()} · **Total:** ${suite.total} · **PASS:** ${suite.passed} · **FAIL:** ${suite.failed}`);
  L.push('');
  L.push('| Categoria | PASS/Total |');
  L.push('|---|---|');
  for (const [cat, b] of Object.entries(suite.byCategory)) L.push(`| ${cat} | ${b.passed}/${b.total} |`);
  L.push('');
  for (const r of suite.results) {
    L.push(`### ${r.status === 'PASS' ? '✅' : '❌'} ${r.id} · ${r.category}`);
    L.push(`- **Caso clínico:** ${r.caso}`);
    L.push(`- **Entrada:** ${r.entrada}`);
    L.push(`- **Resultado esperado:** ${r.esperado}`);
    L.push(`- **Resultado obtido:** ${r.obtido}`);
    L.push(`- **Status:** ${r.status}`);
    L.push('');
  }
  return L.join('\n');
}
