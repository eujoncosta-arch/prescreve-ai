#!/usr/bin/env node
// ============================================================
// RM-68 — Gerador de carga reproduzível (sem dependências novas)
//
// Usa `fetch` nativo do Node (>=18) com um pool de workers de concorrência
// controlada — sem instalar k6/autocannon. Mede o que está realmente
// acontecendo em CADA requisição (latência real, status HTTP real), nunca
// simula ou estima números.
//
// Uso:
//   node scripts/rm68-load-test.mjs <cenario> <baseUrl>
//   <cenario> = baixa | moderada | alta (ver docs/RM-68-PERFORMANCE-BASELINE.md)
//
// Pré-requisito: o servidor já está rodando em <baseUrl> e o banco já foi
// semeado com scripts/rm68-seed-synthetic.mjs na MESMA escala.
// ============================================================

import { performance } from 'node:perf_hooks';

const cenario = process.argv[2] ?? 'baixa';
const BASE = process.argv[3] ?? 'http://localhost:51950';
const PREFIX = '/api/backend';

const CENARIOS = {
  // Calibração: concorrência 1, N pequeno, deliberadamente ABAIXO do teto
  // do ThrottlerGuard global (60 req/60s por IP, `app.module.ts`) — isola
  // a latência "pura" de cada endpoint, sem o ruído do rate limit nem de
  // concorrência real. n=15 é pequeno demais para p95/p99 confiáveis
  // (reportado como tal no relatório) — serve para comparar a ORDEM DE
  // GRANDEZA de cada endpoint entre si, não para SLA.
  sequencial: { concorrencia: 1, requisicoesPorEndpoint: 15 },
  // Concorrência = requisições EM VOO simultaneamente (não usuários
  // totais cadastrados). Hipótese documentada em
  // docs/RM-68-PERFORMANCE-BASELINE.md — NÃO existe projeção real de
  // produto (RM-58/RM-60 confirmaram ausência de telemetria de uso).
  baixa: { concorrencia: 2, requisicoesPorEndpoint: 60 },
  moderada: { concorrencia: 10, requisicoesPorEndpoint: 300 },
  // "alta" aqui é um teto de DESCOBERTA (até onde esta máquina/banco local
  // aguenta antes de degradar), não uma meta de negócio — não existe
  // projeção de usuários reais para justificar um número de produção.
  alta: { concorrencia: 30, requisicoesPorEndpoint: 900 },
};
if (!CENARIOS[cenario]) {
  console.error(`Cenário inválido: "${cenario}". Use: ${Object.keys(CENARIOS).join(' | ')}`);
  process.exit(1);
}
const { concorrencia, requisicoesPorEndpoint } = CENARIOS[cenario];

function percentil(arr, p) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

async function pool(tasks, concorrenciaMax) {
  const resultados = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      resultados[idx] = await tasks[idx]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concorrenciaMax, tasks.length) }, worker));
  return resultados;
}

async function medir(nome, fabricaRequisicao, n, conc) {
  const tarefas = Array.from({ length: n }, () => async () => {
    const t0 = performance.now();
    try {
      const res = await fabricaRequisicao();
      const dt = performance.now() - t0;
      let corpoErro;
      if (!res.ok) {
        try { corpoErro = (await res.clone().text()).slice(0, 300); } catch { /* ignore */ }
      }
      return { ok: res.ok, status: res.status, dt, erro: corpoErro };
    } catch (e) {
      const dt = performance.now() - t0;
      return { ok: false, status: 0, dt, erro: String(e?.message ?? e) };
    }
  });
  const t0total = performance.now();
  const resultados = await pool(tarefas, conc);
  const dtTotal = (performance.now() - t0total) / 1000;

  const latencias = resultados.map((r) => r.dt);
  const erros = resultados.filter((r) => !r.ok);
  const throughput = n / dtTotal;

  return {
    nome,
    n,
    concorrencia: conc,
    duracao_s: Number(dtTotal.toFixed(2)),
    throughput_req_s: Number(throughput.toFixed(2)),
    taxa_erro: Number((erros.length / n).toFixed(4)),
    erros_amostra: erros.slice(0, 3).map((e) => ({ status: e.status, erro: e.erro })),
    latencia_ms: {
      p50: Number(percentil(latencias, 50).toFixed(1)),
      p95: Number(percentil(latencias, 95).toFixed(1)),
      p99: Number(percentil(latencias, 99).toFixed(1)),
      min: Number(Math.min(...latencias).toFixed(1)),
      max: Number(Math.max(...latencias).toFixed(1)),
    },
  };
}

async function main() {
  console.log(`[rm68-load] cenário="${cenario}" concorrência=${concorrencia} baseUrl=${BASE}`);
  const resultadosGerais = [];

  // ── Preparação: autenticar um usuário dedicado ao benchmark ──────────
  const email = `rm68-synth+bench-${cenario}-${Date.now()}@example.invalid`;
  const senha = 'Benchmark#12345';
  let token;

  const regRes = await fetch(`${BASE}${PREFIX}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha, crm: String(Math.floor(rndInt(100000, 999999))), uf: 'SP', especialidade: 'clinica_medica' }),
  });
  if (!regRes.ok) throw new Error(`Falha ao registrar usuário de benchmark: ${regRes.status} ${await regRes.text()}`);
  const regBody = await regRes.json();
  token = regBody.access_token;

  function rndInt(min, max) { return Math.floor(min + Math.random() * (max - min)); }
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // ── T0: health (sem DB) — baseline de overhead puro do framework ────
  resultadosGerais.push(
    await medir('GET /health (sem DB)', () => fetch(`${BASE}${PREFIX}/health`), requisicoesPorEndpoint, concorrencia),
  );

  // ── T1: login (bcrypt custo 12 — CPU-bound, não DB-bound) ────────────
  resultadosGerais.push(
    await medir(
      'POST /auth/login',
      () =>
        fetch(`${BASE}${PREFIX}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, senha }),
        }),
      // Login é deliberadamente caro (bcrypt) — reduzir N para não fazer a
      // suíte inteira demorar minutos só nesta etapa; ainda estatisticamente
      // suficiente para p50/p95 com concorrência baixa/moderada.
      Math.min(requisicoesPorEndpoint, 60),
      concorrencia,
    ),
  );

  // ── T2: criação de consulta (write + hash + transação + auditoria) ──
  const idsConsultasCriadas = [];
  resultadosGerais.push(
    await medir(
      'POST /api/consulta (criação)',
      async () => {
        const res = await fetch(`${BASE}${PREFIX}/api/consulta`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ anamnese: { queixa_principal: 'Carga RM-68', comorbidades: ['Hipertensão Arterial Sistêmica'] } }),
        });
        if (res.ok) {
          const body = await res.json();
          idsConsultasCriadas.push(body.id);
        }
        return res;
      },
      requisicoesPorEndpoint,
      concorrencia,
    ),
  );

  // ── T3: criação de diagnóstico (nas consultas recém-criadas) ─────────
  const idsDiagnosticosCriados = [];
  if (idsConsultasCriadas.length > 0) {
    resultadosGerais.push(
      await medir(
        'POST /api/diagnostico (criação)',
        async () => {
          const consultaId = idsConsultasCriadas[Math.floor(Math.random() * idsConsultasCriadas.length)];
          const res = await fetch(`${BASE}${PREFIX}/api/diagnostico`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ consulta_id: consultaId, cid: 'I10', descricao: 'HAS (carga RM-68)', confianca: 0.8, selecionado: true }),
          });
          if (res.ok) {
            const body = await res.json();
            idsDiagnosticosCriados.push({ diagnosticoId: body.id, consultaId });
          }
          return res;
        },
        idsConsultasCriadas.length,
        concorrencia,
      ),
    );
  }

  // ── T4: criação de prescrição ─────────────────────────────────────────
  if (idsDiagnosticosCriados.length > 0) {
    resultadosGerais.push(
      await medir(
        'POST /api/prescricao (criação)',
        () => {
          const alvo = idsDiagnosticosCriados[Math.floor(Math.random() * idsDiagnosticosCriados.length)];
          return fetch(`${BASE}${PREFIX}/api/prescricao`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              consulta_id: alvo.consultaId,
              diagnostico_id: alvo.diagnosticoId,
              medicamentos: [
                {
                  molecula: 'Enalapril',
                  dose: { valor: 10, unidade: 'mg', frequencia: '2x/dia', via: 'Oral' },
                  duracao: 'Contínuo',
                },
              ],
            }),
          });
        },
        idsDiagnosticosCriados.length,
        concorrencia,
      ),
    );
  }

  // ── T5: leitura de histórico (listagem paginada — depende do volume semeado) ──
  resultadosGerais.push(
    await medir(
      'GET /api/consultas (histórico paginado)',
      () => fetch(`${BASE}${PREFIX}/api/consultas?pagina=1&limite=20`, { headers: authHeaders }),
      requisicoesPorEndpoint,
      concorrencia,
    ),
  );

  // ── T6: leitura de detalhe de consulta ────────────────────────────────
  if (idsConsultasCriadas.length > 0) {
    resultadosGerais.push(
      await medir(
        'GET /api/consulta/:id (detalhe)',
        () => {
          const id = idsConsultasCriadas[Math.floor(Math.random() * idsConsultasCriadas.length)];
          return fetch(`${BASE}${PREFIX}/api/consulta/${id}`, { headers: authHeaders });
        },
        requisicoesPorEndpoint,
        concorrencia,
      ),
    );
  }

  // ── T7: timeline ───────────────────────────────────────────────────────
  resultadosGerais.push(
    await medir('GET /api/timeline', () => fetch(`${BASE}${PREFIX}/api/timeline`, { headers: authHeaders }), requisicoesPorEndpoint, concorrencia),
  );

  console.log('\n=== RESULTADOS — cenário: ' + cenario + ' ===\n');
  for (const r of resultadosGerais) {
    console.log(
      `${r.nome.padEnd(38)} n=${String(r.n).padEnd(5)} conc=${r.concorrencia} ` +
      `p50=${r.latencia_ms.p50}ms p95=${r.latencia_ms.p95}ms p99=${r.latencia_ms.p99}ms ` +
      `throughput=${r.throughput_req_s}req/s erro=${(r.taxa_erro * 100).toFixed(1)}%`,
    );
    if (r.erros_amostra.length) console.log('  ↳ amostra de erros:', JSON.stringify(r.erros_amostra));
  }

  const saida = { cenario, concorrencia, requisicoesPorEndpoint, timestamp: new Date().toISOString(), resultados: resultadosGerais };
  console.log('\n[rm68-load] JSON completo:');
  console.log(JSON.stringify(saida, null, 2));
}

main().catch((e) => {
  console.error('[rm68-load] falhou:', e);
  process.exit(1);
});
