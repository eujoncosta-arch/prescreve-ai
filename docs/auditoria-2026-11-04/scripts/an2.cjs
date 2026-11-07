const fs = require('fs');
const M = JSON.parse(fs.readFileSync(__dirname + '/matrix.json', 'utf8'));
const out = []; const P = (...a) => out.push(a.join(' '));
const POPS = ['neonato', 'lactente', 'pediatrico', 'adolescente', 'adulto', 'geriatrico'];
const meds = [...new Set(M.map(r => r.med))];

P('## Matriz de dosagem:', M.length, 'cenários |', meds.length, 'medicamentos');
P('ok=true:', M.filter(r => r.ok).length, ' ok=false:', M.filter(r => r.ok === false).length, ' null:', M.filter(r => r.ok == null).length);

// 1. cobertura por população (medicamento × população com regra)
P('\n### Cobertura (✓ regra calculável / ✗ sem posologia / ⛔ contraindicado ou bloqueado)');
P('med'.padEnd(28), POPS.map(p => p.slice(0, 5).padEnd(6)).join(''));
for (const m of meds) {
  const row = POPS.map(p => {
    const rs = M.filter(r => r.med === m && r.pop === p);
    const oks = rs.filter(r => r.ok).length;
    if (oks === rs.length) return '✓'.padEnd(6);
    if (oks === 0) { const e = rs[0].erro || ''; return (/CONTRAINDICADO/.test(e) ? '⛔' : '✗').padEnd(6); }
    return '~'.padEnd(6);
  });
  P(m.padEnd(28), row.join(''));
}

// 2. consistência interna dpd×n=dia
const incons = M.filter(r => r.ok && Math.abs(r.dpd * r.n - r.dia) > 0.5 && !(r.formula || '').includes('limitad') && !(r.formula || '').includes('elevada'));
P('\n### Inconsistência dose×tomadas ≠ total/dia (sem clamp explicado):', incons.length);
incons.slice(0, 10).forEach(r => P(' ', r.med, r.pop, r.peso + 'kg', 'dpd', r.dpd?.toFixed(1), 'n', r.n, 'dia', r.dia?.toFixed(1), '|', (r.formula || '').slice(0, 90)));

// 3. flags de excesso
const exc = M.filter(r => r.ok && (r.exD || r.exDia));
P('\n### Cenários com excede_dose_maxima_* = true:', exc.length);
exc.slice(0, 40).forEach(r => P(' ', r.med.padEnd(26), r.pop.padEnd(11), (r.peso + 'kg').padEnd(7), 'dpd', r.dpd?.toFixed(0).padEnd(5), 'dia', r.dia?.toFixed(0).padEnd(6), 'maxDose', r.maxDose ?? '-', 'maxDia', r.maxDia ?? '-', r.exD ? '[excede dose]' : '', r.exDia ? '[excede dia]' : ''));

// 4. fracionamento de comprimidos/cápsulas
const frac = M.filter(r => r.ok && r.comp != null && ((r.comp * 4) % 1 > 1e-6) && r.comp > 0);
P('\n### Comprimidos/cápsulas com fração que não é múltipla de 1/4:', frac.length);
const byMed = {}; frac.forEach(r => { (byMed[r.med + '/' + r.form] = byMed[r.med + '/' + r.form] || []).push(+r.comp.toFixed(2)); });
Object.entries(byMed).forEach(([k, v]) => P(' ', k.padEnd(40), [...new Set(v)].slice(0, 6).join(', ')));
const lt = M.filter(r => r.ok && r.comp != null && r.comp < 0.25);
P('Comprimidos < 1/4 de unidade:', lt.length, [...new Set(lt.map(r => r.med + '/' + r.form + ':' + r.comp.toFixed(2)))].slice(0, 12).join('; '));

// 5. volumes extremos
const vol = M.filter(r => r.ok && r.mL != null && (r.mL < 0.2 || r.mL > 30));
P('\n### Volumes por dose < 0,2 mL ou > 30 mL:', vol.length);
vol.slice(0, 15).forEach(r => P(' ', r.med, r.form, r.pop, r.peso + 'kg', r.mL.toFixed(2) + ' mL'));
const gt = M.filter(r => r.ok && r.gotas != null);
P('Cenários em gotas:', gt.length, ' faixa gotas:', Math.min(...gt.map(r => r.gotas)), '–', Math.max(...gt.map(r => r.gotas)));

// 6. erros: por tipo
const err = {}; M.filter(r => r.ok === false).forEach(r => { const k = (r.erro || '').replace(/\d+/g, 'N').slice(0, 90); err[k] = (err[k] || 0) + 1; });
P('\n### Mensagens de bloqueio:'); Object.entries(err).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => P(' ', n, k));

// 7. posologia pediátrica em mg/kg/dia (para revisão — hipótese a conferir contra fonte)
P('\n### Pediatria/neonato/lactente: mg/kg/dia e mg/kg/dose (referência para revisão; NÃO é veredito)');
const seen = new Set();
M.filter(r => r.ok && ['neonato', 'lactente', 'pediatrico'].includes(r.pop)).forEach(r => {
  const k = r.med + r.pop + r.peso; if (seen.has(k)) return; seen.add(k);
  P(' ', r.med.padEnd(26), r.pop.padEnd(11), (r.peso + 'kg').padEnd(7), 'freq', ('q' + r.freq + 'h').padEnd(5), 'dose', (r.dpd / r.peso).toFixed(1).padStart(6), 'mg/kg/dose', (r.dia / r.peso).toFixed(1).padStart(6), 'mg/kg/dia', '| regra', r.regraDose, r.regraUn, r.maxDia ? '| máx dia ' + r.maxDia + ' mg' : '');
});

fs.writeFileSync(__dirname + '/an2.txt', out.join('\n'));
console.log(out.join('\n'));
