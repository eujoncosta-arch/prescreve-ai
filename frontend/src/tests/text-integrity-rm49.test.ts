// ============================================================
// PRESCREVE-AI — RM-49: regressão do reparo de mojibake (RM41-011)
// e do validador `scripts/check-text-integrity.mjs`.
// ============================================================
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { PHARMA_DB_NEURO_B } from '@/lib/pharma-database-neuro-b';

const FRONTEND_ROOT = path.resolve(__dirname, '../..');

describe('RM-49-mojibake — validador de integridade textual', () => {
  it('scripts/check-text-integrity.mjs passa com exit code 0 sobre o src atual', () => {
    expect(() =>
      execFileSync('node', ['scripts/check-text-integrity.mjs'], { cwd: FRONTEND_ROOT, stdio: 'pipe' }),
    ).not.toThrow();
  });

  it('pharma-database-neuro-b.ts não contém mais sequências de mojibake conhecidas (Ã£, â€”, etc.)', () => {
    const txt = fs.readFileSync(
      path.resolve(FRONTEND_ROOT, 'src/lib/pharma-database-neuro-b.ts'),
      'utf8',
    );
    const padroesCorrompidos = ['Ã£', 'Ã§', 'Ã­', 'Ã¡', 'Ã³', 'Ã©', 'Ãª', 'Ãµ', 'Ã º', 'â€”', 'â€“', 'â†’'];
    for (const p of padroesCorrompidos) {
      expect(txt.includes(p), `padrão corrompido ainda presente: ${JSON.stringify(p)}`).toBe(false);
    }
  });

  it('conteúdo clínico dos textos corrigidos preserva o significado (amostra: fenitoína, valproato)', () => {
    const fenitoina = PHARMA_DB_NEURO_B.find((d) => d.id === 'fenitoina');
    expect(fenitoina?.molecula).toBe('Fenitoína');
    expect(fenitoina?.contraindicacoes_rapidas).toContain('Bradicardia sinusal');
    expect(fenitoina?.alertas_especiais?.some((a) => a.includes('FARMACOCINÉTICA NÃO-LINEAR'))).toBe(true);

    const valproico = PHARMA_DB_NEURO_B.find((d) => d.id === 'acido-valproico');
    expect(valproico?.uso_gestante).toBe('contraindicado');
    expect(valproico?.alertas_especiais?.some((a) => a.includes('TERATOGENICIDADE'))).toBe(true);
  });

  it('todas as ~35 entidades de PHARMA_DB_NEURO_B têm molecula/nome_generico como string não-vazia (sem replacement char)', () => {
    for (const d of PHARMA_DB_NEURO_B) {
      expect(d.molecula).toBeTruthy();
      expect(d.molecula).not.toContain('�');
      expect(d.nome_generico).not.toContain('�');
    }
  });
});
