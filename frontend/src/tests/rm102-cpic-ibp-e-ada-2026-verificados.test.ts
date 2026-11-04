// ============================================================
// RM-102 — (a) omeprazol/CYP2C19 alinhado à diretriz CPIC dos IBPs
// (Lima 2021, doi 10.1002/cpt.2015) e (b) afirmações atribuídas à ADA 2026
// conferidas contra o Summary of Revisions (doi 10.2337/dc26-SREV).
// Teste offline.
// ============================================================

import { describe, it, expect } from 'vitest';
import { FARMACOGENOMICA_DB } from '@/lib/precision-medicine';
import { GUIDELINE_UPDATES } from '@/lib/guideline-updates';
import { CONFLITOS_DIRETRIZES } from '@/lib/guideline-conflict-engine';

const omeprazol = FARMACOGENOMICA_DB.find(e => e.molecula === 'omeprazol')!;
const metoprolol = FARMACOGENOMICA_DB.find(e => e.molecula === 'metoprolol')!;

describe('RM-102 — omeprazol / CYP2C19 segue a CPIC dos IBPs', () => {
  it('doi_referencia é o da diretriz CPIC (Lima 2021)', () => {
    expect(omeprazol.doi_referencia).toBe('10.1002/cpt.2015');
  });

  it('ultrarrápido: aumenta a dose em 100% e NÃO manda trocar de IBP (pantoprazol também é CYP2C19)', () => {
    const u = omeprazol.impacto_por_fenotipo.ultrarapid;
    expect(u.recomendacao).toContain('100%');
    expect(u.recomendacao).toContain('não recomenda trocar de IBP');
    expect(u.alternativa).toBeUndefined();
  });

  it('rápido e normal: dose padrão, com aumento de 50–100% só em H. pylori e esofagite erosiva', () => {
    for (const f of ['rapid', 'normal'] as const) {
      expect(omeprazol.impacto_por_fenotipo[f].recomendacao).toContain('50–100%');
      expect(omeprazol.impacto_por_fenotipo[f].recomendacao).toContain('H. pylori');
    }
    expect(omeprazol.impacto_por_fenotipo.rapid.recomendacao).not.toMatch(/preferir pantoprazol/i);
  });

  it('intermediário e lento: dose padrão; redução de 50% só em terapia crônica (> 12 semanas) com eficácia alcançada', () => {
    for (const f of ['intermediate', 'poor'] as const) {
      const r = omeprazol.impacto_por_fenotipo[f].recomendacao;
      expect(r).toContain('> 12 semanas');
      expect(r).toContain('50%');
    }
  });

  it('sem o "10× maior" que não tinha fonte', () => {
    expect(JSON.stringify(omeprazol)).not.toContain('10×');
  });
});

describe('RM-102 — metoprolol / CYP2D6 segue a CPIC de betabloqueadores (Duarte 2024)', () => {
  const f = metoprolol.impacto_por_fenotipo;

  it('doi_referencia é o da diretriz CPIC (Duarte 2024)', () => {
    expect(metoprolol.doi_referencia).toBe('10.1002/cpt.3351');
  });

  it('lento: menor dose inicial recomendada, titulação cuidadosa, monitorar bradicardia; AUC quase 5× (com fonte)', () => {
    expect(f.poor.recomendacao).toContain('menor dose inicial recomendada');
    expect(f.poor.recomendacao).toContain('bradicardia');
    expect(f.poor.descricao).toContain('quase 5×');
    expect(f.poor.ajuste_dose).not.toMatch(/\d+(,\d+)?\s*mg/);
  });

  it('intermediário e normal: dose padrão (sem o antigo "iniciar 25 mg")', () => {
    expect(f.intermediate.recomendacao).toContain('dose padrão');
    expect(f.intermediate.ajuste_dose).toBeUndefined();
    expect(f.normal.recomendacao).toContain('dose padrão');
  });

  it('ultrarrápido: sem recomendação por evidência insuficiente (não manda aumentar a dose)', () => {
    expect(f.ultrarapid.recomendacao).toContain('evidência insuficiente');
    expect(f.ultrarapid.recomendacao).not.toMatch(/Aumentar/);
  });
});

describe('RM-102 — ADA 2026: nada além do que o Summary of Revisions registra', () => {
  const ada = GUIDELINE_UPDATES.find(u => u.id === 'ada-2026')!;
  const textoAda = JSON.stringify(ada);

  it('cita o Summary of Revisions (doi 10.2337/dc26-SREV)', () => {
    expect(textoAda).toContain('10.2337/dc26-SREV');
  });

  it('não diz mais que GLP-1 RA é 1ª linha independente da HbA1c, nem "Classe I"', () => {
    for (const m of ada.mudancas) {
      expect(m.novo).not.toMatch(/Classe I\b/);
      expect(m.novo).not.toMatch(/primeira linha.*independente/i);
    }
    expect(ada.resumo_executivo).not.toMatch(/consolida GLP-1 RA como terapia de primeira linha/);
  });

  it('não atribui à ADA 2026 metas de HbA1c de 6,5–7% / 7–8% nem "MCG para todos em insulina (Classe I)"', () => {
    const metas = ada.mudancas.find(m => m.id === 'ada26-3')!;
    expect(metas.novo).toContain('não registra alteração dos alvos de HbA1c');
    expect(metas.novo).not.toContain('6,5–7%');
    const mcg = ada.mudancas.find(m => m.id === 'ada26-2')!;
    expect(mcg.novo).toContain('Rec. 9.25');
    expect(mcg.novo).toContain('desde o início do diabetes');
  });

  it('as evidências verificadas na RM-96 continuam presentes (contexto, não base atribuída à ADA)', () => {
    const dois = ada.mudancas.flatMap(m => m.evidencias).map(e => e.doi);
    for (const doi of ['10.1056/NEJMoa2505928', '10.1016/S0140-6736(23)01200-X', '10.1007/s00125-024-06107-6', '10.1001/jama.2021.7444']) {
      expect(dois).toContain(doi);
    }
  });

  it('motor de conflito: as posições da ADA 2026 não carregam as metas/“mandatório” sem fonte', () => {
    const posicoesAda = CONFLITOS_DIRETRIZES.flatMap(c => c.diretrizes).filter(d => d.sigla === 'ADA 2026').map(d => d.posicao).join(' | ');
    expect(posicoesAda).not.toContain('8–8,5%');
    expect(posicoesAda).not.toMatch(/mandatório/i);
    expect(posicoesAda).not.toContain('TFG 20–45');
    expect(posicoesAda).toContain('Rec. 11.9');
  });
});
