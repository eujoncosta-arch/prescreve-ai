// RM-105.2.1 — (1) análise por página do texto do PDF real; (2) estouro lateral em mídia de impressão (largura útil A4).
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DIR = process.argv[2];
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TITULOS = ['Identificação da avaliação', 'Situação geral da avaliação', 'Medicamentos e moléculas identificados', 'Medicamentos ou moléculas não identificados', 'Combinações não avaliadas', 'Alertas encontrados', 'Contextos clínicos', 'Situação da avaliação de alergias', 'Limitações relevantes'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

// (1) por página
const saida = [];
for (const f of fs.readdirSync(DIR).filter(x => x.endsWith('.pdf')).sort()) {
  const pdf = path.join(DIR, f);
  const total = fs.readFileSync(pdf.replace(/\.pdf$/, '.txt'), 'utf8').split('\f').length - 1;
  const achados = []; const paginas = [];
  for (let n = 1; n <= total; n++) {
    const t = execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', '-f', String(n), '-l', String(n), pdf, '-'], { encoding: 'utf8' }).split('\n').map(s => s.replace(/\s+$/, '')).filter(s => s.trim());
    const prim = t[0] ?? '', ult = t[t.length - 1] ?? '';
    paginas.push({ pagina: n, linhas: t.length, primeira: prim.trim().slice(0, 70), ultima: ult.trim().slice(0, 70) });
    if (!t.length) achados.push(`p${n}: página vazia`);
    if (n < total && TITULOS.some(x => ult.trim().startsWith(x))) achados.push(`p${n}: TÍTULO ÓRFÃO ao fim da página: "${ult.trim()}"`);
    if (n > 1 && /^[a-zà-ú]/.test(prim.trim())) achados.push(`p${n}: possível item DIVIDIDO (começa em minúscula): "${prim.trim().slice(0, 60)}"`);
    if (n > 1 && !TITULOS.some(x => prim.trim().startsWith(x)) && !/^\s*\[|^\s*(Gestação|Lactação|Idade|Função|Potássio|Alergias|Peso|Registro|Cruzamento|Cobertura|A avaliação|O cruzamento|Reatividade|Este anexo|Informações|Existem|Incoerência|Limitação)/.test(prim)) achados.push(`p${n}: primeira linha não é título nem início de item: "${prim.trim().slice(0, 60)}"`);
  }
  saida.push({ arquivo: f, paginas: total, achadosTexto: achados.length ? achados : ['sem título órfão nem item dividido'], paginasDetalhe: paginas });
}

// (2) estouro lateral em mídia de impressão (largura útil: A4 794px − 2×14mm ≈ 688px)
const PORT = 9444;
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-layout-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
let alvos; for (let i = 0; i < 60; i++) { try { alvos = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (alvos.some(t => t.type === 'page')) break; } catch {} await sleep(500); }
const ws = new WebSocket(alvos.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setEmulatedMedia', { media: 'print' });
await send('Emulation.setDeviceMetricsOverride', { width: 688, height: 1017, deviceScaleFactor: 1, mobile: false });
const estouro = [];
for (const f of fs.readdirSync(path.join(DIR, '_snapshots')).filter(x => x.endsWith('.html')).sort()) {
  await send('Page.navigate', { url: 'file:///' + path.join(DIR, '_snapshots', f).split(path.sep).join('/') });
  await sleep(2500);
  const r = await send('Runtime.evaluate', { returnByValue: true, expression: `(()=>{ const W = window.innerWidth; const vis = [...document.querySelectorAll('#print-root *')].filter(e => { const s = getComputedStyle(e); return s.display !== 'none' && e.getBoundingClientRect().width > 0; });
      const fora = vis.filter(e => e.getBoundingClientRect().right > W + 1).map(e => e.tagName + ':' + (e.textContent || '').trim().slice(0, 40));
      const root = document.getElementById('print-root');
      return { largura: W, scrollW: document.documentElement.scrollWidth, foraDaLargura: fora.slice(0, 5), nForaDaLargura: fora.length, modo: root && root.dataset.printMode, partes: { receita: !![...document.querySelectorAll('[data-print-part=receita]')].find(e => getComputedStyle(e).display !== 'none'), anexo: !![...document.querySelectorAll('[data-print-part=anexo]')].find(e => getComputedStyle(e).display !== 'none') }, outrosVisiveisNoBody: [...document.body.children].filter(e => e.id !== 'print-root' && getComputedStyle(e).display !== 'none').length }; })()` });
  estouro.push({ snapshot: f, ...r.result.result.value });
}
ws.close(); proc.kill(); try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
fs.writeFileSync(path.join(DIR, 'geometria.json'), JSON.stringify({ porPDF: saida, estouroLateral: estouro }, null, 1));
for (const s of saida) { console.log(`\n${s.arquivo} — ${s.paginas} pág.`); s.achadosTexto.forEach(a => console.log('  • ' + a)); s.paginasDetalhe.forEach(p => console.log(`     p${p.pagina}: ${p.linhas} linhas | 1ª "${p.primeira}" | últ. "${p.ultima}"`)); }
console.log('\n=== estouro lateral (mídia print, 688px) ===');
for (const e of estouro) console.log(`${e.snapshot}: modo=${e.modo} receita=${e.partes.receita} anexo=${e.partes.anexo} foraDaLargura=${e.nForaDaLargura} scrollW=${e.scrollW}/${e.largura} outrosVisiveis=${e.outrosVisiveisNoBody}${e.nForaDaLargura ? ' ' + JSON.stringify(e.foraDaLargura) : ''}`);
process.exit(0);
