const fs = require('fs'), path = require('path');
const ROOT = 'C:/Users/Jonathan Costa/Desktop/Prescreve-AI/frontend/src';
function walk(d, o = []) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p, o); else if (/\.(ts|tsx)$/.test(f.name)) o.push(p.split('\\').join('/')); } return o; }
const files = walk(ROOT);
const set = new Set(files);
function resolve(from, spec) {
  let base;
  if (spec.startsWith('@/')) base = ROOT + '/' + spec.slice(2);
  else if (spec.startsWith('.')) base = path.posix.join(path.posix.dirname(from), spec);
  else return null;
  for (const c of [base, base + '.ts', base + '.tsx', base + '/index.ts', base + '/index.tsx']) if (set.has(c)) return c;
  return null;
}
const g = new Map();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const deps = new Set();
  for (const m of s.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g)) {
    const r = resolve(f, m[1] || m[2] || m[3]); if (r && r !== f) deps.add(r);
  }
  g.set(f, [...deps]);
}
const rel = f => f.replace(ROOT + '/', '');
// SCC (Tarjan) para ciclos, só em lib/ e components
let idx = 0; const st = [], on = new Set(), ind = new Map(), low = new Map(), sccs = [];
function sc(v) { ind.set(v, idx); low.set(v, idx); idx++; st.push(v); on.add(v); for (const w of g.get(v) || []) { if (!ind.has(w)) { sc(w); low.set(v, Math.min(low.get(v), low.get(w))); } else if (on.has(w)) low.set(v, Math.min(low.get(v), ind.get(w))); } if (low.get(v) === ind.get(v)) { const c = []; let w; do { w = st.pop(); on.delete(w); c.push(w); } while (w !== v); if (c.length > 1) sccs.push(c); } }
for (const f of files) if (!ind.has(f)) sc(f);
console.log('arquivos:', files.length, '| arestas:', [...g.values()].reduce((n, a) => n + a.length, 0));
console.log('componentes fortemente conexos (ciclos):', sccs.length);
sccs.forEach(c => console.log('  ciclo de', c.length, ':', c.map(rel).join(' ↔ ').slice(0, 260)));
// alcançabilidade a partir das telas (app/**, components/**, hooks/**)
const entries = files.filter(f => /\/src\/(app|components|hooks)\//.test(f) && !/\/tests\//.test(f));
const seen = new Set(entries); const q = [...entries];
while (q.length) { const v = q.pop(); for (const w of g.get(v) || []) if (!seen.has(w)) { seen.add(w); q.push(w); } }
const libs = files.filter(f => /\/src\/lib\//.test(f));
const orphan = libs.filter(f => !seen.has(f));
console.log('\nlib/ total:', libs.length, '| alcançáveis a partir de app/components/hooks:', libs.filter(f => seen.has(f)).length, '| NÃO alcançáveis:', orphan.length);
const importedBy = new Map(); for (const [f, ds] of g) for (const d of ds) (importedBy.get(d) || importedBy.set(d, []).get(d)).push(f);
orphan.forEach(f => { const by = (importedBy.get(f) || []).map(x => rel(x)).slice(0, 3); const lines = fs.readFileSync(f, 'utf8').split('\n').length; console.log('  ', rel(f).padEnd(44), String(lines).padStart(5), 'linhas | importado por:', by.join(', ') || '(ninguém)'); });
// validation/ e clinical-tests/
for (const dir of ['validation', 'clinical-tests']) { const fs2 = files.filter(f => f.includes('/src/' + dir + '/')); console.log('\n' + dir + ':', fs2.length, 'arquivos | alcançáveis do app:', fs2.filter(f => seen.has(f)).length); }
// quantos módulos do app importam lib que importa 'use client'
