#!/usr/bin/env node
// ============================================================
// RM-107.1.1-E2.5.1 — Suítes e2e contra PostgreSQL CONVENCIONAL (servidor `postgres` multiprocesso real), sem PGlite e sem Docker.
//
// Pré-requisito: um diretório de binários PostgreSQL (initdb, pg_ctl, postgres) em PG_BIN_DIR — por exemplo os binários oficiais do pacote npm
// `embedded-postgres` instalado FORA do repositório (…/node_modules/@embedded-postgres/windows-x64/native/bin), ou uma instalação do sistema.
// O script: initdb em diretório temporário → sobe o servidor em porta local → cria o banco → `prisma migrate deploy` (migrações reais) → executa o
// jest e2e (spec(s) em PG_CONV_JEST_ARGS; padrão: idempotencia-fingerprint-postgres-convencional) → encerra e remove tudo.
// O spec recebe PG_CONVENCIONAL=1, PG_CTL, PGDATA, PG_PORT e DATABASE_URL e controla REINÍCIOS REAIS do servidor via pg_ctl.
// Uso: PG_BIN_DIR=<dir> node scripts/test-e2e-postgres-convencional.mjs
// Sem PG_BIN_DIR o script NÃO roda nada e NÃO declara aprovação (o CI usa o serviço postgres:16 do workflow).
// ============================================================

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const exe = process.platform === 'win32' ? '.exe' : '';
const BIN = process.env.PG_BIN_DIR;
if (!BIN || !fs.existsSync(path.join(BIN, `pg_ctl${exe}`))) {
  console.error('[pg-conv] PG_BIN_DIR ausente ou sem pg_ctl — nada foi executado (idempotência em PostgreSQL convencional NÃO comprovada).');
  process.exit(2);
}
const INITDB = path.join(BIN, `initdb${exe}`);
const PG_CTL = path.join(BIN, `pg_ctl${exe}`);
const PORT = Number(process.env.PG_PORT ?? 54000 + (process.pid % 900));
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-conv-data-'));
const LOG = path.join(os.tmpdir(), `pg-conv-${process.pid}.log`);
const DB = 'prescreve_ai_e251';
const DATABASE_URL = `postgresql://postgres@127.0.0.1:${PORT}/${DB}?schema=public`;

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) throw new Error(`Comando falhou (${r.status}): ${cmd} ${args.join(' ')}`);
};

const relatorio = path.join(os.tmpdir(), `pg-conv-jest-${process.pid}.json`);

async function main() {
  console.log(`[pg-conv] initdb em ${DATA} …`);
  run(INITDB, ['-D', DATA, '-U', 'postgres', '--auth=trust', '--encoding=UTF8', '--locale=C']);
  console.log(`[pg-conv] iniciando servidor PostgreSQL convencional (porta ${PORT}) …`);
  run(PG_CTL, ['-D', DATA, '-o', `-p ${PORT} -c max_connections=200 -c listen_addresses=127.0.0.1`, '-l', LOG, '-w', 'start']);
  try {
    const { Client } = require('pg');
    const c = new Client({ connectionString: `postgresql://postgres@127.0.0.1:${PORT}/postgres` });
    await c.connect();
    await c.query(`CREATE DATABASE ${DB}`);
    const v = await c.query('select version() as v, current_setting(\'server_version\') as sv');
    console.log(`[pg-conv] BANCO: ${v.rows[0].v}`);
    await c.end();
    console.log('[pg-conv] aplicando migrações reais (prisma migrate deploy) …');
    run('npx', ['prisma', 'migrate', 'deploy'], { shell: true, env: { ...process.env, DATABASE_URL } });
    const args = (process.env.PG_CONV_JEST_ARGS ?? 'idempotencia-fingerprint-postgres-convencional').split(' ').filter(Boolean);
    console.log(`[pg-conv] jest e2e: ${args.join(' ')}`);
        run('npx', ['jest', '--config', './test/jest-e2e.json', '--runInBand', '--verbose', '--forceExit', '--json', `--outputFile=${relatorio}`, ...args], {
      shell: true, timeout: Number(process.env.PG_CONV_TIMEOUT_MS ?? 1_500_000),
      env: {
        ...process.env, DATABASE_URL, PG_CONVENCIONAL: '1', PG_CTL, PGDATA: DATA, PG_PORT: String(PORT), PG_LOG: LOG,
        JWT_SECRET: process.env.JWT_SECRET ?? crypto.randomBytes(48).toString('base64'),
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? crypto.randomBytes(48).toString('base64'),
        MFA_ENCRYPTION_KEY: process.env.MFA_ENCRYPTION_KEY ?? crypto.randomBytes(32).toString('hex'),
        IDENTIFIER_HMAC_KEY: process.env.IDENTIFIER_HMAC_KEY ?? crypto.randomBytes(32).toString('hex'),
        APP_ENV: 'test',
      },
    });
    console.log('[pg-conv] ✅ suíte(s) passaram contra PostgreSQL convencional.');

  } finally {
    try {
      const rel = JSON.parse(fs.readFileSync(relatorio, 'utf8'));
      for (const f of rel.testResults) for (const t of f.assertionResults) console.log(`[pg-conv] ${t.status === 'passed' ? 'PASSOU' : t.status.toUpperCase()} — ${t.fullName} (${t.duration ?? 0} ms)`);
    } catch { console.log('[pg-conv] (sem relatório JSON do jest — execução interrompida)'); }
    spawnSync(PG_CTL, ['-D', DATA, '-m', 'immediate', '-w', 'stop'], { stdio: 'inherit' });
    try { fs.rmSync(DATA, { recursive: true, force: true }); } catch { /* melhor esforço */ }
  }
}
main().catch((e) => { console.error('[pg-conv] Falhou:', e.message); process.exitCode = 1; });
