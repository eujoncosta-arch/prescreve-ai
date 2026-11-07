// Auditoria de DOIs: extrai de frontend/src (exceto tests) e confere cada um no Crossref (existência + título).
import fs from 'node:fs'; import path from 'node:path';
const ROOT = 'C:/Users/Jonathan Costa/Desktop/Prescreve-AI/frontend/src';
function walk(d, o = []) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (f.name === 'tests') continue; walk(p, o); } else if (/\.(ts|tsx)$/.test(f.name)) o.push(p); } return o; }
const files = walk(ROOT);
const rx = /\b(10\.\d{4,9}\/[^\s'"`<>\]},;]+)/g;
function trimDoi(d) { d = d.replace(/[.:]+$/, ''); while (d.endsWith(')') && (d.match(/\(/g) || []).length < (d.match(/\)/g) || []).length) d = d.slice(0, -1); return d.replace(/[.:]+$/, ''); }
const found = new Map();
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  lines.forEach((l, i) => { for (const m of l.matchAll(rx)) { let d = trimDoi(m[1]); if (!found.has(d)) found.set(d, []); found.get(d).push(path.relative(ROOT, f).replace(/\\/g, '/') + ':' + (i + 1)); } });
}
const dois = [...found.keys()];
console.log('DOIs únicos:', dois.length, '| ocorrências:', [...found.values()].reduce((n, a) => n + a.length, 0));
const results = []; let idx = 0;
async function worker() {
  while (idx < dois.length) {
    const d = dois[idx++];
    let status = 0, title = '', err = '';
    for (let t = 0; t < 3; t++) {
      try {
        const r = await fetch('https://api.crossref.org/works/' + encodeURIComponent(d), { headers: { 'User-Agent': 'prescreve-ai-audit (mailto:audit@example.invalid)' } });
        status = r.status;
        if (r.status === 200) { const j = await r.json(); title = (j.message.title?.[0] ?? '').slice(0, 110) + ' | ' + (j.message['container-title']?.[0] ?? '').slice(0, 40) + ' | ' + (j.message.issued?.['date-parts']?.[0]?.[0] ?? ''); }
        if (r.status !== 429 && r.status < 500) break;
      } catch (e) { err = String(e.message); }
      await new Promise(r => setTimeout(r, 800 * (t + 1)));
    }
    results.push({ doi: d, status, title, err, where: found.get(d).slice(0, 3) });
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
fs.writeFileSync(process.cwd() + '/doi-results.json', JSON.stringify(results, null, 1));
const ok = results.filter(r => r.status === 200), bad = results.filter(r => r.status !== 200);
console.log('Crossref 200:', ok.length, '| não resolvidos:', bad.length);
bad.forEach(r => console.log('  ✗', r.status, r.err, r.doi, '←', r.where.join(', ')));
