import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { AppEnv } from '../config/environment.util';

// ============================================================
// PRESCREVE-AI — Seed idempotente (auditoria RM-37)
//
// Lógica real do seed (`runSeed`) e sua checagem de bloqueio em produção
// (`deveBloquearSeed`) vivem em `src/` — não em `prisma/seed.ts` — para
// serem testáveis com o mesmo runner Jest usado por todo o resto do
// backend (o `rootDir` do Jest é `src/`; `prisma/seed.ts` é apenas o
// entrypoint de CLI fino que a Prisma CLI invoca).
//
// Este seed é EXCLUSIVAMENTE para desenvolvimento local e ambientes de
// teste/CI — cria um único usuário de DEMONSTRAÇÃO (e-mail fixo,
// claramente identificado) para permitir login imediato após clonar o
// repositório e rodar as migrations. NUNCA cria dados clínicos reais:
// nenhum Paciente, Consulta, Diagnostico, Prescricao, RiskScore ou
// qualquer outro registro que represente um atendimento real é tocado
// por este script.
//
// IDEMPOTENTE por construção: usa `upsert` chaveado pelo e-mail ÚNICO do
// usuário de demonstração (`usuarios.email` já é `@unique` no schema) —
// rodar este script qualquer número de vezes NUNCA cria um segundo
// registro nem duplica dados. `update: {}` garante que um usuário já
// existente NUNCA tem seus dados sobrescritos (nunca reseta senha, nunca
// troca perfil de um usuário real que por acaso reuse o mesmo e-mail —
// na prática, `dev-seed@prescreve.local` nunca seria um e-mail real de
// médico).
// ============================================================

export const SEED_USUARIO_EMAIL = 'dev-seed@prescreve.local';
export const SEED_CRM_HASH = 'seed-dev-crm-hash-nao-usar-em-producao';

/**
 * Decisão pura de bloqueio em produção — separada do I/O do script CLI
 * para ser testável sem processo real. Nunca roda em produção por
 * padrão (incluindo ambiente desconhecido/ausente, tratado como
 * produção por `resolveAppEnvFromEnv`) a menos que
 * `ALLOW_SEED_IN_PRODUCTION=true` seja definido explicitamente.
 */
export function deveBloquearSeed(
  appEnv: AppEnv,
  permitidoEmProducao: boolean,
): boolean {
  return appEnv === 'production' && !permitidoEmProducao;
}

/**
 * Cria (ou confirma a existência de) o usuário de demonstração. Usa
 * `upsert` — nunca `create` puro — para ser seguro rodar qualquer
 * número de vezes: banco vazio (1ª execução, cria) ou banco já semeado
 * (execuções seguintes, confirma sem duplicar nem sobrescrever).
 */
export async function runSeed(prisma: PrismaClient): Promise<void> {
  const senhaHash = await bcrypt.hash('trocar-no-primeiro-login', 12);

  const usuario = await prisma.usuario.upsert({
    where: { email: SEED_USUARIO_EMAIL },
    update: {},
    create: {
      email: SEED_USUARIO_EMAIL,
      senha_hash: senhaHash,
      perfil: 'MEDICO',
    },
  });

  await prisma.medico.upsert({
    where: { usuario_id: usuario.id },
    update: {},
    create: {
      usuario_id: usuario.id,
      crm_hash: SEED_CRM_HASH,
      especialidade: 'Clínica Médica (seed de desenvolvimento)',
      uf: 'SP',
    },
  });
}
