const fs = require('fs');
const D = JSON.parse(fs.readFileSync(__dirname + '/dump.json', 'utf8'));
const strip = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const key = s => { const k = strip(s); return k.replace(/clavulanato.*/, 'clav').replace(/sulfametoxazol.*|smztmp|cotrimoxazol/, 'smxtmp').replace(/hidroclorotiazida/, 'hctz'); };

// dosing-engine: mg/kg/dia pediátrico (pediatrico), dose adulto por tomada × tomadas
const rowsDE = {};
for (const m of D.MEDICAMENTOS_DOSAGEM) {
  const k = key(m.nome_generico);
  const ped = m.regras.filter(r => r.populacoes.includes('pediatrico') || r.populacoes.includes('lactente'));
  const ad = m.regras.filter(r => r.populacoes.includes('adulto'));
  rowsDE[k] = { id: m.id, ped: ped.map(r => `${r.dose} ${r.unidade} q${r.frequencia_horas}h${r.dose_maxima_por_dia_mg ? ' (máx ' + r.dose_maxima_por_dia_mg + ')' : ''}`), ad: ad.map(r => `${r.dose} ${r.unidade} q${r.frequencia_horas}h${r.formulacao_ids ? ' [' + r.formulacao_ids.join('|') + ']' : ''}`) };
}
// PEDIATRIC_DOSES
const rowsPE = {};
for (const e of D.PEDIATRIC_DOSES) {
  rowsPE[key(e.drugName)] = e.indicacoes.map(i => `${i.nome.slice(0, 38)}: ${i.doseMgKgDia ?? ''}${i.doseMgKgDia ? ' mg/kg/dia' : ''}${i.doseMgKg ? i.doseMgKg + ' mg/kg/dose' : ''}${i.doseFixa ? ' fixa' : ''} ${i.frequencia ?? ''}${i.maxDoseMgKgDia ? ' máx ' + i.maxDoseMgKgDia + ' mg/kg/dia' : ''}`);
}
// QuickDrug dose_pediatrica
const rowsQD = {};
for (const d of D.ALL_DRUGS) if (d.dose_pediatrica) rowsQD[key(d.molecula)] = `${d.dose_pediatrica.dose_por_kg} ${d.dose_pediatrica.unidade} (${d.dose_pediatrica.calculo}) ÷${d.dose_pediatrica.frequencia_divisoes} máx ${d.dose_pediatrica.max_dose_dia}${d.dose_pediatrica.max_dose_dia_unidade}`;
// QuickDrug adulto
const rowsQA = {};
for (const d of D.ALL_DRUGS) rowsQA[key(d.molecula)] = `${d.dose_adulto.habitual} ${d.dose_adulto.unidade} ${d.dose_adulto.frequencias?.[0] ?? ''} (máx ${d.dose_adulto.max})`;

const keys = [...new Set([...Object.keys(rowsDE), ...Object.keys(rowsPE)])].sort();
const out = [];
out.push('## Comparação de posologia entre os 3 motores/bases (mesma molécula)');
let nShared = 0;
for (const k of keys) {
  const inDE = rowsDE[k], inPE = rowsPE[k], inQD = rowsQD[k], inQA = rowsQA[k];
  const n = [inDE, inPE, inQD].filter(Boolean).length;
  if (n < 2) continue; nShared++;
  out.push(`\n### ${k}`);
  if (inDE) out.push('  dosing-engine  ped: ' + (inDE.ped.join(' ; ') || '—') + '   | adulto: ' + (inDE.ad.join(' ; ') || '—'));
  if (inPE) out.push('  pediatric-eng  : ' + inPE.join(' ; '));
  if (inQD) out.push('  PHARMA QuickDrug ped: ' + inQD);
  if (inQA) out.push('  PHARMA QuickDrug adulto: ' + inQA);
}
out.push('\nmoléculas presentes em ≥2 das 3 fontes pediátricas:', nShared);
fs.writeFileSync(__dirname + '/an3.txt', out.join('\n'));
console.log(out.join('\n'));
