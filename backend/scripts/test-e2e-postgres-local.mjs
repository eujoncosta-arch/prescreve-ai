#!/usr/bin/env node
// ============================================================
// RM-53 (RM41-026) — E2E real contra Postgres, sem Docker
//
// `postgres-real.e2e-spec.ts` sempre foi pulado neste tipo de ambiente por
// falta de Docker/Postgres local. Este script usa `prisma dev` (servidor
// Postgres real, protocolo de rede real, execução via PGlite/WASM sob o
// capô — não é um mock em memória) para tornar a suíte executável em
// qualquer máquina com Node, sem exigir Docker Desktop nem um Postgres
// instalado no sistema.
//
// Uso: node scripts/test-e2e-postgres-local.mjs
// (ou: npm run test:e2e:postgres:local)
//
// Este script é só uma alternativa LOCAL/reproduzível — o CI
// (.github/workflows/ci.yml) já provisiona um Postgres real via serviço
// Docker do próprio runner do GitHub Actions, que continua sendo o gate
// oficial e bloqueante.
// ============================================================

import { spawnSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import net from 'node:net';
import crypto from 'node:crypto';

const SERVER_NAME = `rm53-local-${process.pid}`;
const MAIN_PORT = 51500 + (process.pid % 1000);
const DB_PORT = MAIN_PORT + 1;
const DATABASE_URL = `postgres://postgres:postgres@localhost:${DB_PORT}/template1?sslmode=disable&connection_limit=10&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0`;

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  if (r.status !== 0) throw new Error(`Comando falhou: ${cmd} ${args.join(' ')}`);
}

async function aguardarPorta(port, tentativas = 30) {
  for (let i = 0; i < tentativas; i++) {
    const aberta = await new Promise((resolve) => {
      const socket = net.createConnection({ port, host: '127.0.0.1' }, () => {
        socket.end();
        resolve(true);
      });
      socket.on('error', () => resolve(false));
    });
    if (aberta) return true;
    await sleep(1000);
  }
  return false;
}

async function main() {
  console.log(`[rm53] Subindo servidor Postgres local via "prisma dev" (${SERVER_NAME}, porta ${DB_PORT})...`);
  const prismaDev = spawn(
    'npx',
    ['prisma', 'dev', '--port', String(MAIN_PORT), '--db-port', String(DB_PORT), '-n', SERVER_NAME],
    { shell: true, stdio: 'inherit' },
  );

  let saiu = false;
  prismaDev.on('exit', () => { saiu = true; });

  try {
    const subiu = await aguardarPorta(DB_PORT);
    if (!subiu || saiu) throw new Error('O servidor Postgres local (prisma dev) não subiu a tempo.');

    console.log('[rm53] Aplicando migrations reais no Postgres local...');
    run('npx', ['prisma', 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL } });

    console.log('[rm53] Rodando a suíte e2e completa contra Postgres real (0 suítes puladas)...');
    run('npx', ['jest', '--config', './test/jest-e2e.json'], {
      env: {
        ...process.env,
        DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET ?? crypto.randomBytes(48).toString('base64'),
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? crypto.randomBytes(48).toString('base64'),
        MFA_ENCRYPTION_KEY: process.env.MFA_ENCRYPTION_KEY ?? crypto.randomBytes(32).toString('hex'),
        IDENTIFIER_HMAC_KEY: process.env.IDENTIFIER_HMAC_KEY ?? crypto.randomBytes(32).toString('hex'),
        APP_ENV: 'test',
      },
    });

    console.log('[rm53] ✅ Suíte e2e completa passou contra Postgres real (local, sem Docker).');
  } finally {
    console.log('[rm53] Encerrando o servidor Postgres local...');
    spawnSync('npx', ['prisma', 'dev', 'stop', SERVER_NAME], { shell: true, stdio: 'inherit' });
    spawnSync('npx', ['prisma', 'dev', 'rm', SERVER_NAME], { shell: true, stdio: 'inherit' });
    if (!prismaDev.killed) prismaDev.kill();
  }
}

main().catch((err) => {
  console.error('[rm53] Falhou:', err.message);
  process.exitCode = 1;
});
