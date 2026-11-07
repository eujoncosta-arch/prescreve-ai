const fs = require('fs'), path = require('path');
process.chdir('C:/Users/Jonathan Costa/Desktop/Prescreve-AI/frontend/src');
const demoMods = ['hospital-quality', 'interoperability-engine', 'pharma-analytics', 'physician-learning-network', 'rwe-engine', 'mock-data', 'demo-cases', 'comite', 'regulatory', 'medical-audit', 'physician-validation-engine', 'sync-engine', 'timeline', 'protocols', 'recommendation-registry'];
function walk(d, o = []) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p, o); else if (f.name === 'page.tsx') o.push(p); } return o; }
const pages = walk('app');
const rows = [];
for (const p of pages) {
  const s = fs.readFileSync(p, 'utf8');
  const used = demoMods.filter(m => new RegExp('from [\'"][^\'"]*/' + m + '[\'"]').test(s));
  const notice = /DemoDataNotice|DemoModeBanner|dados demonstrativ|modo demo|simula[cç]|demonstra/i.test(s);
  const route = p.replace(/\\/g, '/').replace('app', '').replace('/page.tsx', '') || '/';
  const btns = (s.match(/<button\b/g) || []).length;
  const withClick = (s.match(/<button\b[^>]*onClick/g) || []).length;
  const lines = s.split('\n').length;
  rows.push({ route, used, notice, btns, withClick, lines });
}
console.log('páginas:', rows.length);
console.log('\n== rotas que consomem módulos demo/simulados');
rows.filter(r => r.used.length).forEach(r => console.log(r.route.padEnd(28), (r.notice ? '[sinaliza demo]' : '[SEM sinalização]').padEnd(18), r.used.join(',')));
console.log('\n== rotas com <button> sem onClick na mesma tag (heurística, pode ser type=submit/asChild)');
rows.filter(r => r.btns > r.withClick).forEach(r => console.log(r.route.padEnd(28), 'buttons', r.btns, 'com onClick', r.withClick));
console.log('\n== tamanho das páginas (linhas) — top 8');
rows.sort((a, b) => b.lines - a.lines).slice(0, 8).forEach(r => console.log(r.route.padEnd(28), r.lines));
console.log('\n== todas as rotas'); console.log(rows.map(r => r.route).sort().join(' '));
