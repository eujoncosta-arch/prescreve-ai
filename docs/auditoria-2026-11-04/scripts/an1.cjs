const fs = require('fs');
const D = JSON.parse(fs.readFileSync(__dirname + '/dump.json', 'utf8'));
const strip = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const SALT = /\b(sodica|sodico|potassica|potassico|cloridrato|dicloridrato|succinato|tartarato|maleato|besilato|fumarato|sulfato|acetato|hemifumarato|tri-hidratada|trihidratada|mesilato|bromidrato|calcica|magnesica)\b/g;
const norm = s => strip(s).replace(SALT, ' ').replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9+ ]/g, ' ').replace(/\s+/g, ' ').trim();
const out = [];
const P = (...a) => out.push(a.join(' '));

// ── A. identificadores
const all = D.ALL_DRUGS;
P('## A. ALL_DRUGS (getAllDrugs):', all.length, 'medicamentos');
const idCount = {}; all.forEach(d => idCount[d.id] = (idCount[d.id] || 0) + 1);
const dupIds = Object.entries(idCount).filter(([, n]) => n > 1);
P('ids duplicados:', dupIds.length, dupIds.slice(0, 10).map(x => x.join('x')).join(', '));
const molCount = {}; all.forEach(d => { const k = norm(d.molecula); (molCount[k] = molCount[k] || []).push(d.id); });
const dupMol = Object.entries(molCount).filter(([, v]) => v.length > 1);
P('moléculas (normalizadas) com >1 entrada:', dupMol.length);
dupMol.slice(0, 40).forEach(([k, v]) => P('  -', k, '=>', v.join(' | ')));

// campos obrigatórios ausentes
const miss = f => all.filter(d => d[f] == null || d[f] === '' || (Array.isArray(d[f]) && !d[f].length));
for (const f of ['atc_code', 'ajuste_renal', 'ajuste_hepatico', 'contraindicacoes_rapidas', 'interacoes_importantes', 'dose_adulto', 'guidelines_referencia', 'nivel_evidencia', 'uso_gestante', 'uso_lactante', 'marcas', 'doi_referencia'])
  P(`sem ${f}:`, miss(f).length, '/', all.length);
const dp = all.filter(d => d.dose_pediatrica).length;
P('com dose_pediatrica:', dp);

// ── B. cobertura de moléculas entre bases
const setOf = (arr, f) => new Set(arr.map(x => norm(f(x))).filter(Boolean));
const S = {
  ALL: setOf(all, d => d.molecula),
  DOSAGEM: setOf(D.MEDICAMENTOS_DOSAGEM, d => d.nome_generico),
  PEDIATRIC: setOf(D.PEDIATRIC_DOSES, d => d.drugName),
  COMPARADOR: setOf(D.MOLECULES_DB, d => d.molecula),
  EUROFARMA: setOf(D.EUROFARMA_CATALOG, d => d.molecula),
  BIBLIOTECA: setOf(D.BIBLIOTECA_FARMACEUTICA, d => d.molecula),
  DRUGDB_CID: setOf(D.DRUG_DATABASE_FLAT, d => d.molecula),
  PGX: setOf(D.FARMACOGENOMICA_DB, d => d.molecula),
};
P('\n## B. moléculas distintas por base:', Object.entries(S).map(([k, v]) => `${k}=${v.size}`).join(' '));
const allKeys = [...S.ALL];
const inAll = m => allKeys.some(k => k === m || k.startsWith(m + ' ') || m.startsWith(k + ' ') || k.includes(m) || m.includes(k));
for (const b of ['DOSAGEM', 'PEDIATRIC', 'COMPARADOR', 'EUROFARMA', 'BIBLIOTECA', 'DRUGDB_CID', 'PGX']) {
  const missing = [...S[b]].filter(m => !inAll(m));
  P(`- ${b}: ${missing.length} molécula(s) sem correspondente em ALL_DRUGS:`, missing.slice(0, 25).join('; '));
}
// DOSAGEM vs PEDIATRIC vs COMPARADOR (3 motores): sobreposição
const inter = (a, b) => [...S[a]].filter(x => [...S[b]].some(y => x === y || x.includes(y) || y.includes(x)));
P('\nDOSAGEM∩PEDIATRIC:', inter('DOSAGEM', 'PEDIATRIC').length, ' DOSAGEM∩COMPARADOR:', inter('DOSAGEM', 'COMPARADOR').length, ' PEDIATRIC∩COMPARADOR:', inter('PEDIATRIC', 'COMPARADOR').length);
P('DOSAGEM sem PEDIATRIC:', [...S.DOSAGEM].filter(x => !inter('DOSAGEM', 'PEDIATRIC').includes(x)).join('; '));

// ── C. catálogos comerciais: igualdade entre as três cópias
const E = D.EUROFARMA_CATALOG, B = D.BIBLIOTECA_FARMACEUTICA;
const ids = a => new Set(a.map(x => x.id));
const eIds = ids(E), bIds = ids(B);
P('\n## C. EUROFARMA_CATALOG', E.length, 'BIBLIOTECA', B.length, '| ids em comum:', [...eIds].filter(x => bIds.has(x)).length, '| só EUROFARMA:', [...eIds].filter(x => !bIds.has(x)).length, '| só BIBLIOTECA:', [...bIds].filter(x => !eIds.has(x)).length);
const reg = D.LAB_CATALOG_REGISTRY;
P('LAB_CATALOG_REGISTRY por lab:', Object.entries(reg).map(([k, v]) => `${k}=${v.length}`).join(' '));
const regIds = new Set(Object.values(reg).flat().map(x => x.id));
P('ids do REGISTRY em EUROFARMA_CATALOG:', [...regIds].filter(x => eIds.has(x)).length, '/', regIds.size);

// marcas de ALL_DRUGS vs catálogo por produto_id
const prodById = new Map(E.map(p => [p.id, p]));
for (const [, arr] of Object.entries(reg)) arr.forEach(p => { if (!prodById.has(p.id)) prodById.set(p.id, p); });
let brands = 0, withProd = 0, verif = 0, noProd = 0, concMismatch = [], molMismatch = [], semBula = 0;
for (const d of all) for (const m of d.marcas || []) {
  brands++;
  if (m.verificado) verif++;
  if (m.produto_id) {
    const p = prodById.get(m.produto_id);
    if (!p) { noProd++; continue; }
    withProd++;
    const cs = new Set((p.apresentacoes || []).map(a => strip(a.concentracao).replace(/\s+/g, '')));
    const ms = new Set((m.concentracoes || []).map(c => strip(c).replace(/\s+/g, '')));
    if ([...ms].some(c => !cs.has(c)) || [...cs].some(c => !ms.has(c))) concMismatch.push(`${d.id}/${m.nome}`);
    const mk = norm(p.molecula), dk = norm(d.molecula);
    if (!(mk === dk || mk.includes(dk) || dk.includes(mk))) molMismatch.push(`${d.id}(${d.molecula}) ← ${m.nome}(${p.molecula})`);
  }
  if (!m.bula_paciente && !m.bula_profissional) semBula++;
}
P('\nmarcas em ALL_DRUGS:', brands, '| verificado=true:', verif, '| com produto_id:', withProd, '| produto_id sem produto no catálogo:', noProd, '| sem link de bula:', semBula);
P('marca↔catálogo com concentrações divergentes:', concMismatch.length, concMismatch.slice(0, 12).join('; '));
P('marca↔catálogo com MOLÉCULA divergente:', molMismatch.length, molMismatch.slice(0, 15).join('; '));
// marcas sem verificação
const nonVerif = []; for (const d of all) for (const m of d.marcas || []) if (!m.verificado) nonVerif.push(`${d.id}/${m.nome}`);
P('marcas verificado!=true:', nonVerif.length, nonVerif.slice(0, 15).join('; '));
// mesma marca em >1 molécula
const brandMol = {}; for (const d of all) for (const m of d.marcas || []) (brandMol[strip(m.nome)] = brandMol[strip(m.nome)] || new Set()).add(d.id);
const multi = Object.entries(brandMol).filter(([, s]) => s.size > 1);
P('marcas associadas a >1 entrada de molécula:', multi.length, multi.slice(0, 12).map(([k, s]) => `${k}:[${[...s].join(',')}]`).join('; '));

// ── D. canônica
const C = D.CANONICAL;
P('\n## D. CANONICAL:', C.length, '| legacyId distintos:', new Set(C.map(c => c.legacyId)).size, '| brands total:', C.reduce((n, c) => n + (c.brands || []).length, 0));

fs.writeFileSync(__dirname + '/an1.txt', out.join('\n'));
console.log(out.join('\n'));
