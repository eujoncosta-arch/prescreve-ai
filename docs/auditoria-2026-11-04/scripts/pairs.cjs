const fs = require('fs');
process.chdir('C:/Users/Jonathan Costa/Desktop/Prescreve-AI/frontend/src');
const groups = {
  'evidências': ['evidence', 'evidencias', 'evidence-timeline', 'atualizacoes', 'atualizacoes-cientificas', 'repositorio'],
  'explicabilidade': ['explicabilidade', 'explicar', 'segunda-opiniao'],
  'catálogo de medicamentos': ['biblioteca', 'farmalib', 'eurofarma', 'comparador'],
  'prescrição': ['prescricao-rapida', 'prescricoes', 'consulta/nova'],
  'validação': ['validacao-clinica', 'validacao-real', 'maturity-report'],
  'demo/vitrine': ['demo', 'showcase'],
};
for (const [g, routes] of Object.entries(groups)) {
  console.log('\n## ' + g);
  for (const r of routes) {
    const f = `app/${r}/page.tsx`;
    if (!fs.existsSync(f)) { console.log(' ', r.padEnd(26), '(inexistente)'); continue; }
    const s = fs.readFileSync(f, 'utf8');
    const imps = [...s.matchAll(/from ['"]((?:@\/lib|\.\.\/.*lib)\/[^'"]+)['"]/g)].map(m => m[1].split('/').pop());
    console.log(' ', r.padEnd(26), String(s.split('\n').length).padStart(5), 'linhas | lib:', [...new Set(imps)].join(', ') || '(nenhum import de lib)');
  }
}
