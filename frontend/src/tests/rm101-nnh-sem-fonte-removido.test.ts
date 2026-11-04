// ============================================================
// RM-101 — NNH (number needed to harm) sem fonte removido.
// Os valores anteriores (500, 400, 200, 50, 10000, 80) não tinham fonte nem
// desfecho de dano definido, e os resumos dos ensaios pivotais no PubMed não
// trazem taxas de eventos adversos para computá-los. NNT segue intocado.
// Teste offline.
// ============================================================

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const FONTE = fs.readFileSync(path.resolve(__dirname, '../lib/explainable-ai-v2.ts'), 'utf8');

describe('RM-101 — explainable-ai-v2.ts não carrega NNH numérico inventado', () => {
  it('nenhum `nnh: <número>` em EVIDENCIA_DB nem em WHATIF_DB', () => {
    expect(FONTE).not.toMatch(/\bnnh:\s*\d/);
  });

  it('o campo continua opcional nas duas interfaces (pode voltar quando houver fonte)', () => {
    expect(FONTE.match(/^\s*nnh\?: number;/gm)?.length).toBe(2);
  });

  it('o NNT das entradas curadas não foi tocado', () => {
    for (const trecho of ['nnt: 39,', 'nnt: 21,', 'nnt: 14,', 'nnt: 50,']) {
      expect(FONTE).toContain(trecho);
    }
  });

  it('o comentário registra o motivo e pede o desfecho de dano junto do número', () => {
    expect(FONTE).toContain('RM-101');
    expect(FONTE).toContain('desfecho de dano');
  });
});

describe('RM-101 — a tela só exibe o cartão NNH quando o valor existe', () => {
  it('explicabilidade/page.tsx condiciona o cartão a why.beneficio_risco.nnh', () => {
    const page = fs.readFileSync(path.resolve(__dirname, '../app/explicabilidade/page.tsx'), 'utf8');
    expect(page).toMatch(/why\.beneficio_risco\.nnh\s*&&/);
  });
});
