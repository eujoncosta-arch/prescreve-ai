// ============================================================
// PRESCREVE-AI — RM-49: validador de integridade textual (mojibake)
//
// Detecta corrupção de encoding do tipo "UTF-8 lido como Windows-1252"
// (ex.: "Ã£" no lugar de "ã", "â€”" no lugar de "—") em todo `src/lib`.
// Origem: RM41-011 — 884 ocorrências encontradas e corrigidas em
// `pharma-database-neuro-b.ts`. Este script impede recorrência.
//
// Executado via `prebuild` (bloqueia o build) e em CI.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, '../src');

// Bytes 0x80–0x9F indefinidos em Windows-1252 sobrevivem como caracteres de
// controle C1 literais (U+0081, U+008D, U+008F, U+0090, U+009D) quando o
// mojibake ocorre — por isso entram no conjunto de "bytes de continuação".
const WIN1252_UPPER_TO_UNICODE = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…',
  0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰', 0x8A: 'Š',
  0x8B: '‹', 0x8C: 'Œ', 0x8E: 'Ž',
  0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•',
  0x96: '–', 0x97: '—', 0x98: '˜', 0x99: '™', 0x9A: 'š',
  0x9B: '›', 0x9C: 'œ', 0x9E: 'ž', 0x9F: 'Ÿ',
};
const UNDEFINED_WIN1252 = new Set([0x81, 0x8d, 0x8f, 0x90, 0x9d]);

const charToByte = new Map();
for (let b = 0; b < 256; b++) {
  if (b >= 0x80 && b <= 0x9f) {
    const ch = UNDEFINED_WIN1252.has(b) ? String.fromCodePoint(b) : WIN1252_UPPER_TO_UNICODE[b];
    if (ch !== undefined && !charToByte.has(ch)) charToByte.set(ch, b);
  } else {
    const ch = String.fromCodePoint(b);
    if (!charToByte.has(ch)) charToByte.set(ch, b);
  }
}

function byteOf(ch) {
  return charToByte.has(ch) ? charToByte.get(ch) : null;
}
function isLead(ch) {
  const b = byteOf(ch);
  return b !== null && b >= 0xc0 && b <= 0xff;
}
function isCont(ch) {
  const b = byteOf(ch);
  return b !== null && b >= 0x80 && b <= 0xbf;
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
}

// Exceção documentada: dose-calculator.ts contém, intencionalmente, o texto
// literal "1Ã—/dia" em comentário/teste — exemplo do mojibake histórico que
// o parser de frequência (RM-36) precisa tolerar em dados de terceiros.
// Não é corrupção do próprio arquivo; ver comentário em torno da linha 466.
const ALLOWLIST = new Set([
  path.resolve(SRC_DIR, 'lib/dose-calculator.ts'),
  path.resolve(SRC_DIR, 'tests/dose-calculator-frequencia-parser.test.ts'),
  // contém os próprios padrões de mojibake como fixtures de teste (RM-49),
  // não corrupção real do arquivo.
  path.resolve(SRC_DIR, 'tests/text-integrity-rm49.test.ts'),
]);

const files = [];
walk(SRC_DIR, files);

const findings = [];
for (const file of files) {
  if (ALLOWLIST.has(path.resolve(file))) continue;
  const txt = fs.readFileSync(file, 'utf8');
  const chars = [...txt];
  for (let i = 0; i < chars.length; i++) {
    if (isLead(chars[i]) && isCont(chars[i + 1] || '')) {
      let j = i + 1;
      while (j < chars.length && isCont(chars[j])) j++;
      findings.push({ file, cluster: chars.slice(i, j).join(''), index: i });
      i = j - 1;
    }
  }
}

if (findings.length > 0) {
  console.error(`[RM-49] ❌ ${findings.length} sequência(s) suspeita(s) de mojibake encontrada(s):`);
  for (const f of findings.slice(0, 30)) {
    console.error(`  ${path.relative(SRC_DIR, f.file)} — ${JSON.stringify(f.cluster)}`);
  }
  if (findings.length > 30) console.error(`  ... e mais ${findings.length - 30}`);
  console.error('[RM-49] BUILD BLOQUEADO — corrigir encoding ou adicionar exceção documentada em ALLOWLIST.');
  process.exit(1);
}

console.log(`[RM-49] ✅ integridade textual OK — ${files.length} arquivos verificados, 0 sequências suspeitas.`);
