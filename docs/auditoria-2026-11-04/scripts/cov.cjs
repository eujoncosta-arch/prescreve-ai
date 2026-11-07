const fs = require('fs');
const j = JSON.parse(fs.readFileSync(__dirname + '/cov/coverage-summary.json', 'utf8'));
const rows = Object.entries(j).filter(([k]) => k !== 'total').map(([k, v]) => ({ f: k.split('\\').join('/').split('/src/')[1], s: v.statements.pct, b: v.branches.pct, fn: v.functions.pct, l: v.lines.pct, n: v.statements.total }));
console.log('arquivos medidos:', rows.length);
const crit = ['lib/dosing-engine.ts', 'lib/dose-calculator.ts', 'lib/pediatric-engine.ts', 'lib/safety-rules.ts', 'lib/clinical-decision-support.ts', 'lib/clinical-risk-engine.ts', 'lib/icu-engine.ts', 'lib/clinical-therapeutics.ts', 'lib/drug-comparator.ts', 'lib/second-opinion.ts', 'lib/explainable-ai-v2.ts', 'lib/precision-medicine.ts', 'lib/pharma-database.ts', 'lib/clinical-reasoning.ts', 'lib/therapeutic-class-expansion.ts', 'lib/evidence-engine.ts', 'lib/obstetric-engine.ts', 'lib/palliative-engine.ts', 'lib/oncology-engine.ts', 'lib/clinical-calculators.ts'];
console.log('módulo'.padEnd(40), 'stmts  branch  func   lines  (stmts totais)');
for (const c of crit) { const r = rows.find(x => x.f === c); console.log(c.padEnd(40), r ? [r.s, r.b, r.fn, r.l].map(x => String(x).padStart(5)).join('  ') + '  (' + r.n + ')' : '(não medido)'); }
const zero = rows.filter(r => r.s === 0);
console.log('\nmódulos com 0% de instruções cobertas:', zero.length, '/', rows.length);
console.log(zero.map(r => r.f.replace('lib/', '') + '(' + r.n + ')').join(', ').slice(0, 1800));
const low = rows.filter(r => r.s > 0 && r.s < 30 && r.n > 150).sort((a, b) => b.n - a.n).slice(0, 12);
console.log('\nmódulos grandes (>150 stmts) com <30%:'); low.forEach(r => console.log(' ', r.f.padEnd(40), r.s + '%', r.n));
