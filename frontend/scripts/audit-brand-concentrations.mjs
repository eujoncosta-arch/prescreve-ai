// RM-58 — Detecta marcas de laboratórios DIFERENTES com arrays de
// `concentracoes` byte-idênticos — forte indício de dado copiado sem
// verificação por marca (o padrão exato do bug real relatado: Sinot Clav
// exibindo as 4 concentrações do Clavulin, incluindo 2 que a Eurofarma
// nunca vendeu sob essa marca).
import { getAllDrugs } from '../src/lib/pharma-database.ts';

const drugs = getAllDrugs();
const suspeitos = [];
let totalMarcas = 0;
let naoVerificadas = 0;

for (const d of drugs) {
  totalMarcas += d.marcas.length;
  const porAssinatura = new Map();
  for (const m of d.marcas) {
    if (m.verificado === false) naoVerificadas++;
    const chave = JSON.stringify([...m.concentracoes].sort());
    if (!porAssinatura.has(chave)) porAssinatura.set(chave, []);
    porAssinatura.get(chave).push(m);
  }
  for (const [chave, marcas] of porAssinatura) {
    const labs = new Set(marcas.map((m) => m.laboratorio));
    if (labs.size >= 2 && marcas.length >= 2) {
      suspeitos.push({
        molecula: d.molecula,
        concentracoes: JSON.parse(chave),
        marcas: marcas.map((m) => `${m.nome} (${m.laboratorio}, verificado=${m.verificado !== false})`),
      });
    }
  }
}

console.log(`Total de marcas no sistema: ${totalMarcas}`);
console.log(`Marcas explicitamente marcadas verificado:false: ${naoVerificadas}`);
console.log(`Grupos suspeitos (concentrações idênticas entre labs diferentes): ${suspeitos.length}\n`);

for (const s of suspeitos) {
  console.log(`[${s.molecula}] concentrações: ${s.concentracoes.join(' | ')}`);
  for (const m of s.marcas) console.log(`   - ${m}`);
  console.log('');
}
