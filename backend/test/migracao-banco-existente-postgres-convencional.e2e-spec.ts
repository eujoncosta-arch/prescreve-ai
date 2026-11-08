/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return -- linhas SQL são `any`. */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

// ============================================================
// RM-107.1.1-E2.7 — Compatibilidade da migração `add_prescricao_idempotency_fingerprint` com um banco JÁ EXISTENTE (dados reais anteriores).
// Aplica as 3 migrações anteriores em um banco NOVO, grava dados "legados" (com e sem chave, conteúdo atípico), aplica a migração nova e prova:
// linhas intactas, coluna nova NULL, nenhum índice/constraint novo, reversibilidade (DROP COLUMN) e reaplicação. PostgreSQL CONVENCIONAL apenas.
// ============================================================

jest.setTimeout(120_000);
const ATIVO = process.env.PG_CONVENCIONAL === '1' && !!process.env.PG_PORT;
const describeOuSkip = ATIVO ? describe : describe.skip;
if (!ATIVO)
  console.warn('[migracao-existente] PG_CONVENCIONAL ausente — suíte PULADA.');

const DIR = path.join(__dirname, '..', 'prisma', 'migrations');
const sql = (nome: string) =>
  fs.readFileSync(path.join(DIR, nome, 'migration.sql'), 'utf8');

describeOuSkip(
  'Migração do fingerprint sobre banco existente (PostgreSQL convencional)',
  () => {
    const nomeDb = `upgrade_${Date.now().toString(36)}`;
    let admin: pg.Client;
    let db: pg.Client;
    const indices = async () =>
      (
        await db.query(
          "select indexname, indexdef from pg_indexes where tablename = 'prescricoes' order by 1",
        )
      ).rows;
    const constraints = async () =>
      (
        await db.query(
          "select conname from pg_constraint where conrelid = 'prescricoes'::regclass order by 1",
        )
      ).rows;
    const linhas = async () =>
      (
        await db.query(
          'select id, consulta_id, medicamentos, orientacoes, validade_dias, hash_integridade, idempotency_key, versao from prescricoes order by id',
        )
      ).rows;

    beforeAll(async () => {
      admin = new pg.Client({
        connectionString: `postgresql://postgres@127.0.0.1:${process.env.PG_PORT}/postgres`,
      });
      await admin.connect();
      await admin.query(`CREATE DATABASE ${nomeDb}`);
      db = new pg.Client({
        connectionString: `postgresql://postgres@127.0.0.1:${process.env.PG_PORT}/${nomeDb}`,
      });
      await db.connect();
    });
    afterAll(async () => {
      await db?.end();
      await admin
        ?.query(`DROP DATABASE IF EXISTS ${nomeDb} WITH (FORCE)`)
        .catch(() => undefined);
      await admin?.end();
    });

    it('aplica as 3 migrações anteriores, grava dados legados, aplica a nova: dados intactos, coluna NULL, sem índice/constraint novo; reversível e reaplicável', async () => {
      for (const m of [
        '20260727000000_baseline_schema_atual',
        '20260728000000_add_risk_score_calculado_audit_type',
        '20260728010000_restrict_clinical_cascade_deletes',
      ])
        await db.query(sql(m));
      await db.query(
        "insert into usuarios (id, email, senha_hash, atualizado_em) values ('u1','legado@x.com','h', now())",
      );
      await db.query(
        "insert into consultas (id, usuario_id, atualizado_em) values ('c1','u1', now())",
      );
      const med = JSON.stringify([
        {
          molecula: 'Losartana',
          dose: { valor: 50, unidade: 'mg', frequencia: '1x/dia', via: 'VO' },
          duracao: '30d',
        },
      ]);
      await db.query(
        "insert into prescricoes (id, consulta_id, medicamentos, hash_integridade, idempotency_key, atualizado_em) values ('p-com-chave','c1',$1,'h1','chave-legada-1234', now())",
        [med],
      );
      await db.query(
        "insert into prescricoes (id, consulta_id, medicamentos, hash_integridade, atualizado_em) values ('p-sem-chave','c1',$1,'h2', now())",
        [med],
      );
      await db.query(
        "insert into prescricoes (id, consulta_id, medicamentos, orientacoes, validade_dias, hash_integridade, idempotency_key, atualizado_em) values ('p-atipica','c1','{\"nao\":\"array\"}','x',60,'h3','chave-legada-5678', now())",
      );
      const antes = await linhas();
      const idxAntes = await indices();
      const conAntes = await constraints();
      expect(antes).toHaveLength(3);

      await db.query(
        sql('20260808000000_add_prescricao_idempotency_fingerprint'),
      );

      expect(await linhas()).toEqual(antes); // nenhuma linha alterada
      const col = (
        await db.query(
          "select is_nullable, data_type from information_schema.columns where table_name = 'prescricoes' and column_name = 'idempotency_fingerprint'",
        )
      ).rows[0];
      expect(col).toEqual({ is_nullable: 'YES', data_type: 'text' });
      expect(
        Number(
          (
            await db.query(
              'select count(*)::int c from prescricoes where idempotency_fingerprint is null',
            )
          ).rows[0].c,
        ),
      ).toBe(3); // legado = NULL (sem backfill)
      expect(await indices()).toEqual(idxAntes);
      expect(await constraints()).toEqual(conAntes); // nenhum índice/constraint novo

      // cliente/versão antiga que não conhece a coluna continua inserindo normalmente (coluna opcional)
      await db.query(
        "insert into prescricoes (id, consulta_id, medicamentos, hash_integridade, atualizado_em) values ('p-cliente-antigo','c1',$1,'h4', now())",
        [med],
      );
      await db.query(
        "insert into prescricoes (id, consulta_id, medicamentos, hash_integridade, idempotency_key, idempotency_fingerprint, atualizado_em) values ('p-novo','c1',$1,'h5','chave-nova-9999','abc', now())",
        [med],
      );
      expect(
        Number(
          (await db.query('select count(*)::int c from prescricoes')).rows[0].c,
        ),
      ).toBe(5);

      // reversibilidade: DROP COLUMN preserva as demais colunas; reaplicar funciona
      await db.query(
        'ALTER TABLE "prescricoes" DROP COLUMN "idempotency_fingerprint"',
      );
      expect((await linhas()).map((l) => l.id)).toEqual([
        'p-atipica',
        'p-cliente-antigo',
        'p-com-chave',
        'p-novo',
        'p-sem-chave',
      ]);
      await db.query(
        sql('20260808000000_add_prescricao_idempotency_fingerprint'),
      );
      expect(
        Number(
          (
            await db.query(
              'select count(*)::int c from prescricoes where idempotency_fingerprint is null',
            )
          ).rows[0].c,
        ),
      ).toBe(5);
      console.warn(
        '[migracao-existente] 3 linhas legadas intactas; coluna nullable sem backfill; sem índice/constraint novo; reversível',
      );
    });
  },
);
