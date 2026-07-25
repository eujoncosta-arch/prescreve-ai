// ============================================================
// PRESCREVE-AI — Cobertura da Recomendação Clínica (testes de regressão)
//
// Valida que a expansão de classe terapêutica (therapeutic-class-expansion.ts)
// AMPLIA a cobertura sem quebrar as sugestões curadas, sem ignorar
// contraindicações/interações, e sem afetar RM-23/RM-24/motor de segurança.
// ============================================================

import { describe, it, expect } from 'vitest';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { isEligible } from '@/lib/therapeutic-class-expansion';
import { drugRepository } from '@/lib/pharma-core';
import { runSafetyCheck } from '@/lib/safety-rules';
import { buildConsistencyReport } from '@/validation/drug-consistency';
import { buildSyncReport } from '@/validation/cross-database';

describe('Cobertura da recomendação clínica — HAS', () => {
  const plan = getTherapeuticForCondition('has', 'HAS (I10)')!;
  const molecules = plan.farmacologico.map((s) => s.molecula);

  it('1) Enalapril continua sendo sugerido (âncora preservada)', () => {
    expect(molecules).toContain('Enalapril');
  });

  it('2) outras moléculas elegíveis da mesma classe passam a ser consideradas (BRA/BCC/Tiazídico)', () => {
    expect(molecules).toContain('Losartana');
    expect(molecules).toContain('Valsartana');
    expect(molecules).toContain('Anlodipino');
    expect(molecules).toContain('Clortalidona');
  });

  it('3) um BRA não é excluído apenas porque a regra priorizava um IECA', () => {
    const bra = plan.farmacologico.find((s) => s.molecula === 'Losartana');
    expect(bra).toBeDefined();
    expect(bra!.classe_terapeutica).toMatch(/BRA/);
  });

  it('6) as marcas correspondentes são recuperadas da base canônica', () => {
    const bra = plan.farmacologico.find((s) => s.molecula === 'Losartana')!;
    expect(bra.marcas && bra.marcas.length).toBeGreaterThan(0);
    expect(bra.marcas!.some((m) => m.nome_comercial.toLowerCase().includes('zart'))).toBe(true);
  });

  it('7) as apresentações correspondentes são recuperadas corretamente', () => {
    const bra = plan.farmacologico.find((s) => s.molecula === 'Losartana')!;
    expect(bra.marcas!.every((m) => m.apresentacoes.length > 0)).toBe(true);
  });

  it('8) a marca não pode ser associada a uma molécula errada (Zart pertence à losartana, não à enalapril)', () => {
    const enalapril = plan.farmacologico.find((s) => s.molecula === 'Enalapril')!;
    const losartana = plan.farmacologico.find((s) => s.molecula === 'Losartana')!;
    const zartNoEnalapril = (enalapril.marcas ?? []).some((m) => m.nome_comercial.toLowerCase().includes('zart'));
    const zartNaLosartana = (losartana.marcas ?? []).some((m) => m.nome_comercial.toLowerCase().includes('zart'));
    expect(zartNoEnalapril).toBe(false);
    expect(zartNaLosartana).toBe(true);
  });

  it('não duplica moléculas (dedup por molecule_id canônico salt-agnóstico)', () => {
    const unique = new Set(molecules);
    expect(unique.size).toBe(molecules.length);
  });

  it('gestante: IECA/BRA contraindicados não são sugeridos como NOVAS opções (expansão respeita gestação)', () => {
    const gestPlan = getTherapeuticForCondition('has', 'HAS (I10)', { gestante: true })!;
    // Nenhuma sugestão EXPANDIDA (além das âncoras curadas) deve ser um BRA/IECA em gestante,
    // pois pregnancy === 'contraindicado' deve excluí-las do candidate pool.
    const novasIecaBra = gestPlan.farmacologico.filter(
      (s) => /IECA|BRA/.test(s.classe_terapeutica) && !['Enalapril', 'Hidroclorotiazida'].includes(s.molecula),
    );
    expect(novasIecaBra).toHaveLength(0);
  });
});

describe('Cobertura da recomendação clínica — ICC (filtro de indicação própria)', () => {
  const plan = getTherapeuticForCondition('icc', 'ICC (I50)')!;
  const molecules = plan.farmacologico.map((s) => s.molecula);

  it('5) molécula de classe diferente pode ser apresentada quando clinicamente apropriado (BRA/ARNI em ICC)', () => {
    expect(molecules).toContain('Losartana');
    expect(molecules).toContain('Sacubitril/Valsartana');
  });

  it('4) uma molécula sem indicação própria para a condição NÃO aparece como opção elegível (atenolol não é sugerido em ICC)', () => {
    expect(molecules.some((m) => m.toLowerCase().includes('atenolol'))).toBe(false);
  });

  it('Carvedilol (âncora) continua sendo sugerido', () => {
    expect(molecules).toContain('Carvedilol');
  });
});

describe('isEligible() — elegibilidade clínica individual', () => {
  it('4) molécula contraindicada não aparece como elegível (gestante + IECA)', () => {
    const enalapril = drugRepository.getById('enalapril')!;
    const r = isEligible(enalapril, { gestante: true });
    expect(r.eligible).toBe(false);
  });

  it('sem contexto, considera elegível por padrão (filtragem ocorre em outra camada)', () => {
    const enalapril = drugRepository.getById('enalapril')!;
    expect(isEligible(enalapril).eligible).toBe(true);
  });

  it('renal grave exclui molécula com contraindicação explícita em TFG < 15', () => {
    const codeina = drugRepository.getById('codeina');
    if (codeina) {
      const r = isEligible(codeina, { tfg: 10 });
      expect(r.eligible).toBe(false);
    }
  });
});

describe('Motor de segurança e gates — não regressão', () => {
  it('9) o motor de segurança (runSafetyCheck) continua sendo executado normalmente', () => {
    const alerts = runSafetyCheck({ moleculas: ['Enalapril', 'Losartana'] });
    expect(alerts.some((a) => a.tipo === 'duplicidade' || a.tipo === 'interacao')).toBe(true);
  });

  it('10) RM-23 (Drug Consistency) continua íntegro', () => {
    const report = buildConsistencyReport();
    expect(report.bySeverity.critical).toBe(0);
    expect(report.bySeverity.high).toBe(0);
  });

  it('11) RM-24 (Cross Database Validator) continua íntegro', () => {
    const report = buildSyncReport();
    expect(report.criticos).toBe(0);
    expect(report.publishOk).toBe(true);
  });
});

describe('Cobertura por condição — não indiscriminada', () => {
  it('condições sem protocolo curado não geram sugestões (nada é inventado)', () => {
    expect(getTherapeuticForCondition('condicao-inexistente', 'x')).toBeNull();
  });

  it('faringoamigdalite não expande para classes de antibiótico diferentes (escopo conservador)', () => {
    const plan = getTherapeuticForCondition('faringoamigdalite', 'Faringoamigdalite')!;
    const molecules = plan.farmacologico.map((s) => s.molecula);
    expect(molecules).toContain('Amoxicilina');
    expect(molecules).not.toContain('Azitromicina');
  });

  it('dislipidemia expande estatina + hipolipemiante, sem trazer classes não citadas', () => {
    const plan = getTherapeuticForCondition('dislipidemia', 'Dislipidemia')!;
    const classes = new Set(plan.farmacologico.map((s) => s.classe_terapeutica));
    expect([...classes].every((c) => /Estatina|Hipolipemiante/.test(c))).toBe(true);
  });
});
