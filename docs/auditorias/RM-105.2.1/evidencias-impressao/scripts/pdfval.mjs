// RM-105.2.1 — Validação REAL de impressão: Edge headless (CDP) + Page.printToPDF (aplica @media print e @page).
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const EDGE = process.env.BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9333;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.argv[2];
const URL = 'http://localhost:3000/prescreve-ai/prescricao-rapida/';
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-rm10521-'));
const proc = spawn(EDGE, [process.env.HL || '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, '--no-first-run', '--disable-gpu', '--window-size=1366,900', 'about:blank'], { stdio: 'ignore' });

let targets;
for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.some(t => t.type === 'page')) break; } catch {} await sleep(500); }
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.error) throw new Error(JSON.stringify(r.error));
  if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  return r.result.result.value;
};
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });

async function abrir() {
  await send('Page.navigate', { url: URL });
  await sleep(4000);
  await ev(`(async()=>{ for (let i=0;i<40;i++){ if (document.querySelector('input[placeholder^="Buscar molécula"]')) return true; await new Promise(r=>setTimeout(r,500)); } return false; })()`);
}
async function mouse(selExpr) {
  const rect = await ev(`(()=>{const e=${selExpr}; e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x, y: rect.y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
  await sleep(300);
}

const item = (molecula, entidade_id, i) => ({ id: 'p' + i, molecula, ...(entidade_id ? { entidade_id } : {}), nome_comercial: molecula, laboratorio: '', concentracao: '10 mg', forma_farmaceutica: 'Comprimido', dose: '1 comprimido', via: 'VO', frequencia: '1x/dia', duracao: '30 dias', instrucoes: '', uso_continuo: false, tipo_receita: 'simples' });

async function carregarProtocolo(itens, nome = 'Cenario') {
  await abrir();
  await ev(`localStorage.setItem('prescreve-ai-favoritos', JSON.stringify([{id:'f1',nome:${JSON.stringify(nome)},descricao:'',criado_em:'2026-11-07T10:00:00.000Z',itens:${JSON.stringify(itens)}}]))`);
  await abrir();
  await ev(`[...document.querySelectorAll('[role=tab]')].find(t=>t.textContent.includes('Favoritos')).click()`); await sleep(500);
  await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Carregar')).click()`); await sleep(800);
}
async function dadosPaciente(nome = 'Maria da Silva (teste)') {
  await ev(`(()=>{const set=(el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));};
    set(document.querySelector('input[placeholder="Nome completo"]'),${JSON.stringify(nome)}); set(document.querySelector('input[placeholder="anos"]'),'45'); return true;})()`);
  await sleep(300);
}
async function abrirReceita() {
  await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Gerar receita').click()`); await sleep(800);
  // intercepta window.print para registrar o estado no instante do comando (a impressão real é feita por printToPDF)
  await ev(`window.__printLog = []; window.print = () => { const r = document.getElementById('print-root'); window.__printLog.push({ modo: r.dataset.printMode, anexo: !!document.querySelector('[data-print-part="anexo"]'), receita: !!document.querySelector('[data-print-part="receita"]') }); };`);
}
async function pdf(nome) {
  // Instantâneo do DOM REAL da aplicação (estado montado pela interface), com <base> para carregar o CSS do servidor.
  const html = await ev(`(async()=>{ const c=document.documentElement.cloneNode(true); c.querySelectorAll('script,noscript').forEach(n=>n.remove());
    for (const l of [...c.querySelectorAll('link[rel=stylesheet]')]) { const t = await (await fetch(l.getAttribute('href'))).text(); const st = document.createElement('style'); st.textContent = t; l.replaceWith(st); }
    const b=document.createElement('base'); b.href=location.origin+'/prescreve-ai/'; c.querySelector('head').prepend(b); return '<!doctype html>'+c.outerHTML; })()`);
  const snap = path.join(OUT, '_snapshots'); fs.mkdirSync(snap, { recursive: true });
  const htmlFile = path.join(snap, nome + '.html'); fs.writeFileSync(htmlFile, html);
  const file = path.join(OUT, nome + '.pdf');
  const profCli = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-cli-'));
  try {
    execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--user-data-dir=' + profCli, '--no-pdf-header-footer', '--virtual-time-budget=8000', '--print-to-pdf=' + file, 'file:///' + htmlFile.split(path.sep).join('/')], { stdio: 'ignore', timeout: 60000 });
  } catch (e) { /* o Chrome pode retornar código != 0 mesmo gerando o arquivo */ }
  const bytes = fs.readFileSync(file).toString('latin1');
  const paginas = (bytes.match(new RegExp('/Type\\s*/Page[^s]', 'g')) || []).length;
  const box = (bytes.match(new RegExp('/MediaBox\\s*\\[\\s*([\\d.\\s]+)\\]')) || [])[1];
  let texto = '';
  try { texto = execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' }); } catch (e) { texto = '(pdftotext falhou: ' + e.message + ')'; }
  fs.writeFileSync(path.join(OUT, nome + '.txt'), texto);
  try { fs.rmSync(profCli, { recursive: true, force: true }); } catch {}
  return { file, paginas, mediabox: box && box.trim(), tamanho: fs.statSync(file).size, texto };
}
const resumo = [];
async function cenario(nome, fn) {
  try { const r = await fn(); resumo.push({ nome, ...r, texto: undefined, trecho: undefined }); return r; }
  catch (e) { resumo.push({ nome, erro: String(e).slice(0, 300) }); }
}

// ── S1/S2: receita (padrão) e anexo, Varfarina + Ibuprofeno, com alergia ao ibuprofeno informada pela interface
await cenario('S1-S2 receita padrao / anexo / isolamento', async () => {
  await carregarProtocolo([item('Varfarina', 'varfarina', 1), item('ibuprofeno', 'ibuprofeno', 2)], 'Varfarina+AINE');
  await dadosPaciente();
  // alergia ao ibuprofeno via UI (mouse real)
  await mouse(`document.querySelector('[data-testid="alergias-status"]')`);
  await mouse(`[...document.querySelectorAll('[role=option]')].find(o=>o.textContent.includes('Alergias informadas'))`);
  await mouse(`document.querySelector('[data-testid="alergia-adicionar"]')`);
  await ev(`(()=>{const l=document.querySelector('[data-testid="alergia-linha"]'); const i=l.querySelector('input[placeholder^="Subst"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'Ibuprofeno'); i.dispatchEvent(new Event('input',{bubbles:true})); return true;})()`);
  await sleep(500);
  await abrirReceita();
  // S1: padrão — "Imprimir receita do paciente"
  await ev(`document.querySelector('[data-testid="print-receita"]').click()`); await sleep(300);
  const s1 = await pdf('S1-receita-padrao');
  // S1b: anexo ABERTO na tela + imprimir receita => receita sem anexo
  await ev(`document.querySelector('[data-testid="toggle-annex"]').click()`); await sleep(300);
  await ev(`document.querySelector('[data-testid="print-receita"]').click()`); await sleep(300);
  const s1b = await pdf('S1b-receita-com-anexo-aberto-na-tela');
  // S2: imprimir o anexo (trabalho próprio)
  await ev(`document.querySelector('[data-testid="print-anexo"]').click()`); await sleep(300);
  const s2 = await pdf('S2-anexo-varfarina-aine-alergia');
  const log = await ev(`window.__printLog`);
  return { log, s1: { paginas: s1.paginas, mediabox: s1.mediabox, temAnexo: /ANEXO T[ÉE]CNICO/.test(s1.texto), temReceita: /RECEITA M[ÉE]DICA/.test(s1.texto), vazamento: ['cobertura', 'Alerta', 'Alergia', 'RM-105', 'parcial'].filter(t => s1.texto.includes(t)) },
    s1b: { paginas: s1b.paginas, temAnexo: /ANEXO T[ÉE]CNICO/.test(s1b.texto), temReceita: /RECEITA M[ÉE]DICA/.test(s1b.texto) },
    s2: { paginas: s2.paginas, mediabox: s2.mediabox, temAnexo: /ANEXO T[ÉE]CNICO/.test(s2.texto), temReceita: /RECEITA M[ÉE]DICA/.test(s2.texto), alergia: /Alergia registrada/.test(s2.texto) } };
});

// ── S3: muitos alertas
await cenario('S3 anexo muitos alertas', async () => {
  const lista = [['Varfarina', 'varfarina'], ['ibuprofeno', 'ibuprofeno'], ['Enalapril', 'enalapril'], ['Losartana', 'losartana'], ['Espironolactona', 'espironolactona'], ['Sertralina', 'sertralina'], ['Tramadol', 'tramadol'], ['Azitromicina', 'azitromicina'], ['Amiodarona', 'amiodarona'], ['Carbonato de Lítio', 'litio'], ['Hidroclorotiazida', 'hctz'], ['Tadalafila', 'tadalafila'], ['Nitroglicerina', 'nitroglicerina'], ['Tranilcipromina', 'tranilcipromina'], ['Sacubitril/Valsartana', 'sacubitril_valsartana'], ['Haloperidol', 'haloperidol'], ['Hidroxicloroquina', 'hidroxicloroquina'], ['Moxifloxacino', 'moxifloxacino']].map(([n, i], k) => item(n, i, k));
  await carregarProtocolo(lista, 'Muitos alertas');
  await dadosPaciente();
  await abrirReceita();
  await ev(`document.querySelector('[data-testid="print-anexo"]').click()`); await sleep(300);
  const a = await pdf('S3-anexo-muitos-alertas');
  await ev(`document.querySelector('[data-testid="print-receita"]').click()`); await sleep(300);
  const r = await pdf('S3b-receita-18-itens');
  const nAlertas = (a.texto.match(/\[(Crítico|Alerta|Atenção|Info)\]/g) || []).length;
  return { alertasNoAnexo: nAlertas, anexo: { paginas: a.paginas, temReceita: /RECEITA M[ÉE]DICA/.test(a.texto) }, receita: { paginas: r.paginas, temAnexo: /ANEXO T[ÉE]CNICO/.test(r.texto) } };
});

// ── S4: várias moléculas não identificadas
await cenario('S4 anexo varias nao identificadas', async () => {
  const lista = [item('Varfarina', 'varfarina', 1), ...['Xyzcilina', 'Abcdopril', 'Medicamento Inventado 1', 'Medicamento Inventado 2', 'Fármaco Teste 3', 'Substância Z', 'Composto Q-7', 'Remédio Sem Cadastro'].map((n, k) => item(n, undefined, k + 2))];
  await carregarProtocolo(lista, 'Nao identificadas');
  await dadosPaciente();
  await abrirReceita();
  await ev(`document.querySelector('[data-testid="print-anexo"]').click()`); await sleep(300);
  const a = await pdf('S4-anexo-varias-nao-identificadas');
  return { paginas: a.paginas, naoIdentificadas: (a.texto.match(/não reconhecido/g) || []).length, situacao: /cobertura parcial|Nenhuma molécula/.test(a.texto) };
});

// ── S5: avaliação parcial (identidade ambígua + não identificada)
await cenario('S5 anexo avaliacao parcial', async () => {
  const lista = [item('Midazolam', undefined, 1), item('Sertralina', undefined, 2), item('Xyzcilina', undefined, 3), item('Tramadol', 'tramadol', 4)];
  await carregarProtocolo(lista, 'Parcial');
  await dadosPaciente();
  await abrirReceita();
  await ev(`document.querySelector('[data-testid="print-anexo"]').click()`); await sleep(300);
  const a = await pdf('S5-anexo-avaliacao-parcial');
  return { paginas: a.paginas, parcial: /cobertura parcial/.test(a.texto), combinacoes: /Combinações não avaliadas/.test(a.texto) };
});

// ── S6: erro de avaliação (falha real simulada: getter que lança, lido pelo motor)
await cenario('S6 anexo erro de avaliacao', async () => {
  await abrir();
  await ev(`localStorage.setItem('prescreve-ai-favoritos', JSON.stringify([{id:'f1',nome:'Erro',descricao:'',criado_em:'2026-11-07T10:00:00.000Z',itens:${JSON.stringify([item('Varfarina', 'varfarina', 1), item('Sertralina', 'sertralina', 2)])}}]))`);
  await abrir();
  // injeta a falha ANTES de carregar o protocolo: o motor lê `potassiumLevel` (ausente no objeto) e cai no getter
  await ev(`Object.defineProperty(Object.prototype, 'potassiumLevel', { get() { throw new Error('falha simulada para validação de impressão'); }, configurable: true }); true`);
  await ev(`[...document.querySelectorAll('[role=tab]')].find(t=>t.textContent.includes('Favoritos')).click()`); await sleep(500);
  await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Carregar')).click()`); await sleep(900);
  const status = await ev(`(()=>{ [...document.querySelectorAll('[role=tab]')].find(t=>t.textContent.includes('Segurança')).click(); return new Promise(r=>setTimeout(()=>r(document.querySelector('[data-testid=safety-coverage]')?.getAttribute('data-coverage-status')),500)); })()`);
  await dadosPaciente();
  await abrirReceita();
  await ev(`document.querySelector('[data-testid="print-anexo"]').click()`); await sleep(300);
  const a = await pdf('S6-anexo-erro-de-avaliacao');
  await ev(`delete Object.prototype.potassiumLevel; true`);
  return { statusMotor: status, paginas: a.paginas, erro: /Erro de avaliação/.test(a.texto), semAlertas: !/Não foram identificados alertas/.test(a.texto), indisponiveis: /Alertas indisponíveis/.test(a.texto) };
});

fs.writeFileSync(path.join(OUT, 'resumo.json'), JSON.stringify(resumo, null, 1));
console.log(JSON.stringify(resumo, null, 1));
ws.close(); proc.kill();
try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
process.exit(0);
