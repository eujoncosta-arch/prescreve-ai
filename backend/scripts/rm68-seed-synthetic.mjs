#!/usr/bin/env node
// ============================================================
// RM-68 — Geração de dados sintéticos para baseline de performance
//
// NENHUM dado real ou identificável é usado. Todos os nomes, hashes de
// identidade (CPF/e-mail) e conteúdos clínicos são fabricados
// deterministicamente por um gerador pseudoaleatório com seed fixa (para
// reprodutibilidade entre execuções). `hash_identidade`/`crm_hash` são
// strings hex aleatórias no MESMO formato de um HMAC-SHA256 real, mas não
// derivadas de nenhum CPF/CRM real.
//
// Uso: DATABASE_URL=... node scripts/rm68-seed-synthetic.mjs <escala>
//   <escala> = baixa | moderada | alta   (ver docs/RM-68-PERFORMANCE-BASELINE.md
//   seção "Cenários" para a justificativa de cada volume)
//
// Idempotente por escala: limpa as tabelas de dados sintéticos (marcadas
// por um prefixo reconhecível no e-mail/nome) antes de semear de novo —
// pode ser executado repetidamente sem acumular lixo entre rodadas.
// ============================================================

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import crypto from 'node:crypto';

const ESCALAS = {
  baixa: { usuarios: 5, pacientes: 50, consultas: 100 },
  moderada: { usuarios: 50, pacientes: 500, consultas: 1000 },
  alta: { usuarios: 200, pacientes: 3000, consultas: 5000 },
};

const escala = process.argv[2] ?? 'baixa';
if (!ESCALAS[escala]) {
  console.error(`Escala inválida: "${escala}". Use: ${Object.keys(ESCALAS).join(' | ')}`);
  process.exit(1);
}
const { usuarios: N_USUARIOS, pacientes: N_PACIENTES, consultas: N_CONSULTAS } = ESCALAS[escala];

const PREFIXO = 'rm68-synth';

// PRNG determinística (mulberry32) — reprodutível entre execuções, sem
// depender de Math.random() (evita variação de corrida entre rodadas).
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260802);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const fakeHex = (bytes) => crypto.randomBytes(bytes).toString('hex'); // formato de HMAC, nunca derivado de dado real
const cuidLike = (prefix, i) => `${prefix}_${i.toString(36).padStart(8, '0')}_${fakeHex(4)}`;

const ESPECIALIDADES = ['clinica_medica', 'cardiologia', 'endocrinologia', 'pediatria', 'geriatria'];
const CIDS = ['I10', 'E11', 'I50', 'J45', 'E78', 'N18'];
const COMORBIDADES = ['Hipertensão Arterial Sistêmica', 'Diabetes Mellitus Tipo 2', 'Dislipidemia', 'Obesidade', 'DPOC'];
const MOLECULAS = ['Enalapril', 'Losartana', 'Metformina', 'Atorvastatina', 'Empagliflozina', 'Carvedilol'];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[rm68-seed] DATABASE_URL não definida.');
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const t0 = Date.now();
  console.log(`[rm68-seed] escala="${escala}" — usuarios=${N_USUARIOS} pacientes=${N_PACIENTES} consultas=${N_CONSULTAS}`);

  console.log('[rm68-seed] limpando dados sintéticos de rodadas anteriores...');
  // Ordem respeita as FKs (Restrict) — filhos antes dos pais.
  await prisma.recommendationRegistry.deleteMany({ where: { molecula: { startsWith: PREFIXO } } });
  await prisma.medicalTrust.deleteMany({ where: { molecula: { startsWith: PREFIXO } } });
  await prisma.riskScore.deleteMany({ where: { consulta: { usuario: { email: { contains: PREFIXO } } } } });
  await prisma.prescricao.deleteMany({ where: { consulta: { usuario: { email: { contains: PREFIXO } } } } });
  await prisma.diagnostico.deleteMany({ where: { consulta: { usuario: { email: { contains: PREFIXO } } } } });
  await prisma.auditoria.deleteMany({ where: { usuario: { email: { contains: PREFIXO } } } });
  await prisma.consulta.deleteMany({ where: { usuario: { email: { contains: PREFIXO } } } });
  await prisma.paciente.deleteMany({ where: { hash_identidade: { startsWith: PREFIXO } } });
  await prisma.medico.deleteMany({ where: { usuario: { email: { contains: PREFIXO } } } });
  await prisma.usuario.deleteMany({ where: { email: { contains: PREFIXO } } });

  // ── Usuários (médicos) ────────────────────────────────────
  // Senha placeholder barata (NUNCA usada para autenticar via bcrypt.compare
  // real) — o cenário de login usa 1 usuário fixo dedicado, criado à parte
  // (ver scripts/rm68-load-test.mjs), porque este seed precisa ser rápido
  // para milhares de linhas e bcrypt(custo 12) é deliberadamente lento.
  const usuarios = Array.from({ length: N_USUARIOS }, (_, i) => ({
    id: cuidLike('usr', i),
    email: `${PREFIXO}+medico${i}@example.invalid`,
    senha_hash: `placeholder-nao-verificavel-${fakeHex(8)}`,
    perfil: 'MEDICO',
  }));
  await prisma.usuario.createMany({ data: usuarios });
  const medicos = usuarios.map((u, i) => ({
    id: cuidLike('med', i),
    usuario_id: u.id,
    crm_hash: fakeHex(32),
    especialidade: pick(ESPECIALIDADES),
    uf: pick(['SP', 'RJ', 'MG', 'RS', 'BA']),
  }));
  await prisma.medico.createMany({ data: medicos });
  console.log(`[rm68-seed] ${usuarios.length} usuários/médicos criados`);

  // ── Pacientes ──────────────────────────────────────────────
  const pacientes = Array.from({ length: N_PACIENTES }, (_, i) => ({
    id: cuidLike('pac', i),
    hash_identidade: `${PREFIXO}-${fakeHex(28)}`, // formato de HMAC, dado 100% fabricado
    idade: 18 + Math.floor(rnd() * 70),
    sexo: pick(['M', 'F']),
    peso_kg: 50 + rnd() * 60,
    altura_cm: 150 + rnd() * 40,
    comorbidades: rnd() > 0.5 ? [pick(COMORBIDADES)] : [],
  }));
  await prisma.paciente.createMany({ data: pacientes });
  console.log(`[rm68-seed] ${pacientes.length} pacientes criados`);

  // ── Consultas + diagnósticos + prescrições + risk scores ──
  const consultas = [];
  const diagnosticos = [];
  const prescricoes = [];
  const riscos = [];
  const auditorias = [];

  for (let i = 0; i < N_CONSULTAS; i++) {
    const usuario = pick(usuarios);
    const paciente = rnd() > 0.1 ? pick(pacientes) : null; // 10% sem paciente vinculado (fluxo real permite)
    const consultaId = cuidLike('con', i);
    const criadoEm = new Date(Date.now() - Math.floor(rnd() * 1000 * 60 * 60 * 24 * 180)); // até 180 dias atrás

    consultas.push({
      id: consultaId,
      usuario_id: usuario.id,
      paciente_id: paciente?.id,
      status: pick(['em_andamento', 'concluida', 'concluida', 'concluida']),
      anamnese: { queixa_principal: 'Anamnese sintética RM-68', comorbidades: paciente?.comorbidades ?? [] },
      criado_em: criadoEm,
    });

    const cid = pick(CIDS);
    const diagnosticoId = cuidLike('dia', i);
    diagnosticos.push({
      id: diagnosticoId,
      consulta_id: consultaId,
      cid,
      descricao: `Hipótese sintética para ${cid}`,
      confianca: 0.5 + rnd() * 0.5,
      selecionado: true,
      criado_em: criadoEm,
    });

    if (rnd() > 0.2) {
      prescricoes.push({
        id: cuidLike('pre', i),
        consulta_id: consultaId,
        diagnostico_id: diagnosticoId,
        status: 'finalizada',
        medicamentos: [{ molecula: pick(MOLECULAS), dose: '1x/dia' }],
        hash_integridade: fakeHex(32),
        criado_em: criadoEm,
      });
    }

    if (rnd() > 0.3) {
      riscos.push({
        id: cuidLike('rsk', i),
        consulta_id: consultaId,
        risco_global: pick(['baixo', 'intermediario', 'alto']),
        score_global: rnd() * 100,
        risco_cardiovascular: { nivel: pick(['baixo', 'alto']), score: rnd() * 100 },
        risco_renal: { nivel: 'baixo', score: rnd() * 30 },
        risco_hemorragico: { nivel: 'baixo', score: rnd() * 30 },
        risco_farmacologico: { nivel: 'baixo', score: rnd() * 30 },
        risco_interacao: { nivel: 'baixo', score: rnd() * 30 },
        risco_terapeutico: { nivel: 'baixo', score: rnd() * 30 },
        criado_em: criadoEm,
      });
    }

    auditorias.push({
      id: cuidLike('aud', i),
      usuario_id: usuario.id,
      tipo: 'consulta_criada',
      acao: `Consulta ${consultaId} criada (sintética)`,
      recurso: `consulta:${consultaId}`,
      hash_integridade: fakeHex(32),
      timestamp: criadoEm,
    });
  }

  // Lotes de 1000 — createMany com dezenas de milhares de linhas de uma vez
  // pode estourar o limite de parâmetros do driver; batching é o padrão
  // recomendado pela própria documentação do Prisma para volume alto.
  async function emLotes(model, dados, tamanho = 1000) {
    for (let i = 0; i < dados.length; i += tamanho) {
      await model.createMany({ data: dados.slice(i, i + tamanho) });
    }
  }
  await emLotes(prisma.consulta, consultas);
  await emLotes(prisma.diagnostico, diagnosticos);
  await emLotes(prisma.prescricao, prescricoes);
  await emLotes(prisma.riskScore, riscos);
  await emLotes(prisma.auditoria, auditorias);

  console.log(
    `[rm68-seed] ${consultas.length} consultas, ${diagnosticos.length} diagnósticos, ` +
    `${prescricoes.length} prescrições, ${riscos.length} risk scores, ${auditorias.length} auditorias criados`,
  );

  const dt = Date.now() - t0;
  console.log(`[rm68-seed] concluído em ${dt} ms (${(dt / 1000).toFixed(1)} s)`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('[rm68-seed] falhou:', e);
  process.exit(1);
});
