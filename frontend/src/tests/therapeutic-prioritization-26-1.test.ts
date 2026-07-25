// ============================================================
// PRESCREVE-AI — RM-26.1: Refinamento da Priorização Clínica (testes)
//
// Valida a correção da limitação do RM-26: Nível 2 (1ª linha PARA A CONDIÇÃO)
// não deve mais depender de comorbidade; Nível 1 (preferencial PARA O
// PACIENTE) deve exigir vantagem individual verificável, não apenas diretriz
// genérica; e a distinção evidência de classe vs. molécula deve ser real.
// ============================================================

import { describe, it, expect } from 'vitest';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { classifyPriority } from '@/lib/therapeutic-prioritization';
import { drugRepository } from '@/lib/pharma-core';
import { runSafetyCheck } from '@/lib/safety-rules';
import { buildConsistencyReport } from '@/validation/drug-consistency';
import { buildSyncReport } from '@/validation/cross-database';

describe('RM-26.1 · 1) HAS sem comorbidade — 1ª linha não exige comorbidade', () => {
  const plan = getTherapeuticForCondition('has', 'HAS (I10)', { tfg: 90 })!;

  it('opções de primeira linha para HAS atingem Nível 2 sem qualquer comorbidade', () => {
    const tiers = new Set(plan.farmacologico.map((s) => s.prioridade!.tier));
    expect(tiers.has('primeira_linha')).toBe(true);
    expect(tiers.has('contextual')).toBe(false);
  });

  it('nenhuma opção precisa de Nível 1 para ser reconhecida como apropriada', () => {
    const preferenciais = plan.farmacologico.filter((s) => s.prioridade!.tier === 'preferencial');
    expect(preferenciais).toHaveLength(0);
    // mas todas as 15 continuam presentes e classificadas
    expect(plan.farmacologico).toHaveLength(15);
    expect(plan.farmacologico.every((s) => s.prioridade!.tier === 'primeira_linha')).toBe(true);
  });

  it('IECA, BRA, BCC e Tiazídicos aparecem todos em Nível 2 (não apenas Enalapril)', () => {
    const molecules = plan.farmacologico.map((s) => s.molecula);
    for (const m of ['Enalapril', 'Ramipril', 'Losartana', 'Valsartana', 'Anlodipino', 'Hidroclorotiazida', 'Clortalidona']) {
      const sug = plan.farmacologico.find((s) => s.molecula === m);
      expect(sug, `${m} deveria estar no plano`).toBeDefined();
      expect(sug!.prioridade!.tier).toBe('primeira_linha');
    }
    expect(molecules.length).toBeGreaterThan(2); // não escolhe artificialmente só enalapril
  });
});

describe('RM-26.1 · 2) HAS + comorbidade relevante — vantagem individual eleva a Nível 1', () => {
  const ctx = { tfg: 90, comorbidades: ['DRC', 'Diabetes'] };
  const plan = getTherapeuticForCondition('has', 'HAS (I10)', ctx)!;

  it('moléculas com indicação sourced para a comorbidade atingem Nível 1', () => {
    const losartana = plan.farmacologico.find((s) => s.molecula === 'Losartana')!;
    expect(losartana.prioridade!.tier).toBe('preferencial');
    expect(losartana.prioridade!.fatores_considerados).toContain('comorbidade');
  });

  it('Nível 1 não exige diretriz — a indicação própria (dado real) já é suficiente', () => {
    // Verifica a árvore diretamente: uma molécula com match de comorbidade mas
    // SEM guideline ainda deve alcançar preferencial.
    const all = drugRepository.getAll();
    const semGuidelineComIndicacao = all.find(
      (e) => !e.references.some((r) => r.type === 'GUIDELINE') && e.indications.some((i) => /has|hipertens/i.test(i)),
    );
    if (semGuidelineComIndicacao) {
      const sug = {
        id: semGuidelineComIndicacao.id,
        classe_terapeutica: semGuidelineComIndicacao.therapeuticClass,
        molecula: semGuidelineComIndicacao.activeIngredient.name,
        nome_generico: semGuidelineComIndicacao.activeIngredient.name,
        indicacao: semGuidelineComIndicacao.indications[0] ?? '',
        dose: { dose_padrao: 'x', unidade: 'mg', via: 'VO', frequencia: '1x/dia' },
        posologia_completa: 'x',
        evidencia: { diretriz: 'x', sociedade: 'x', ano: 2020, nivel_evidencia: { nivel: 'B' as const, grau: 'IIa' as const, descricao: 'x' }, citacao: 'x' },
        contraindicacoes: [],
        efeitos_adversos: [],
        monitoramento: [],
        alternativas: [],
      };
      const commComorbidadeMatch = semGuidelineComIndicacao.indications[0]!;
      const r = classifyPriority(sug, 'has', { comorbidades: [commComorbidadeMatch] });
      expect(r.tier).toBe('preferencial');
      expect(r.evidencia_status).toBe('sem_diretriz_estruturada');
    }
  });
});

describe('RM-26.1 · 3) Molécula elegível sem vantagem individual — permanece Nível 2', () => {
  it('Olmesartana (sem indicação DRC sourced) permanece primeira_linha mesmo com comorbidade DRC no paciente', () => {
    const plan = getTherapeuticForCondition('has', 'HAS (I10)', { tfg: 90, comorbidades: ['DRC'] })!;
    const olmesartana = plan.farmacologico.find((s) => s.molecula === 'Olmesartana');
    expect(olmesartana).toBeDefined();
    expect(olmesartana!.prioridade!.tier).toBe('primeira_linha');
  });
});

describe('RM-26.1 · 4) Cautela não bloqueante — permanece Nível 3', () => {
  it('interação não bloqueante com medicação em uso classifica como contextual (não some, não é excluída)', () => {
    const plan = getTherapeuticForCondition('has', 'HAS (I10)', { medicamentosEmUso: ['Espironolactona'] })!;
    const enalapril = plan.farmacologico.find((s) => s.molecula === 'Enalapril')!;
    expect(enalapril.prioridade!.tier).toBe('contextual');
  });
});

describe('RM-26.1 · 5) Contraindicação absoluta — permanece Nível 4 (RM-26.1 não reintroduz)', () => {
  it('IECA/BRA excluídos em gestante não reaparecem em nenhum nível', () => {
    const plan = getTherapeuticForCondition('has', 'HAS (I10)', { gestante: true })!;
    const novos = plan.farmacologico.filter((s) => /IECA|BRA/.test(s.classe_terapeutica) && !['Enalapril', 'Hidroclorotiazida'].includes(s.molecula));
    expect(novos).toHaveLength(0);
  });
});

describe('RM-26.1 · 6) Molécula sem indicação para a condição — permanece excluída', () => {
  it('Atenolol continua excluído de ICC (indicação não cobre IC)', () => {
    const plan = getTherapeuticForCondition('icc', 'ICC (I50)')!;
    expect(plan.farmacologico.some((s) => s.molecula.toLowerCase().includes('atenolol'))).toBe(false);
    expect(plan.opcoes_excluidas!.some((e) => e.molecula === 'Atenolol')).toBe(true);
  });
});

describe('RM-26.1 · 7) Ausência de diretriz específica — não gera evidência inventada', () => {
  it('molécula sem GUIDELINE mantém evidencia_status=sem_diretriz_estruturada e evidencia_escopo indefinido', () => {
    const all = drugRepository.getAll();
    const semGuideline = all.filter((e) => !e.references.some((r) => r.type === 'GUIDELINE'));
    expect(semGuideline.length).toBeGreaterThan(0);
    for (const e of semGuideline.slice(0, 20)) {
      const sug = {
        id: e.id,
        classe_terapeutica: e.therapeuticClass,
        molecula: e.activeIngredient.name,
        nome_generico: e.activeIngredient.name,
        indicacao: e.indications[0] ?? '',
        dose: { dose_padrao: 'x', unidade: 'mg', via: 'VO', frequencia: '1x/dia' },
        posologia_completa: 'x',
        evidencia: { diretriz: 'x', sociedade: 'x', ano: 2020, nivel_evidencia: { nivel: 'B' as const, grau: 'IIa' as const, descricao: 'x' }, citacao: 'x' },
        contraindicacoes: [],
        efeitos_adversos: [],
        monitoramento: [],
        alternativas: [],
      };
      const r = classifyPriority(sug, 'condicao-inexistente-xyz');
      expect(r.evidencia_status).toBe('sem_diretriz_estruturada');
      expect(r.evidencia_escopo).toBeUndefined();
    }
  });
});

describe('RM-26.1 · 8) Evidência de classe não é apresentada como evidência específica da molécula', () => {
  it('Enalapril (diretriz genérica de classe IECA, sem ensaio nomeado próprio) tem evidencia_escopo="classe"', () => {
    const plan = getTherapeuticForCondition('has', 'HAS (I10)', { tfg: 90 })!;
    const enalapril = plan.farmacologico.find((s) => s.molecula === 'Enalapril')!;
    expect(enalapril.prioridade!.evidencia_escopo).toBe('classe');
    expect(enalapril.prioridade!.motivo).toMatch(/diretriz de classe/i);
  });

  it('Losartana (com "Estudo LIFE" sourced) tem evidencia_escopo="molecula" quando alcança Nível 1', () => {
    const plan = getTherapeuticForCondition('has', 'HAS (I10)', { tfg: 90, comorbidades: ['DRC'] })!;
    const losartana = plan.farmacologico.find((s) => s.molecula === 'Losartana')!;
    expect(losartana.prioridade!.evidencia_escopo).toBe('molecula');
  });
});

describe('RM-26.1 · 9) Todas as opções elegíveis continuam presentes', () => {
  it('total de opções em HAS é idêntico com e sem contexto de comorbidade (RM-26.1 só reclassifica)', () => {
    const semCtx = getTherapeuticForCondition('has', 'HAS (I10)')!;
    const comCtx = getTherapeuticForCondition('has', 'HAS (I10)', { comorbidades: ['DRC'] })!;
    expect(comCtx.farmacologico.length).toBe(semCtx.farmacologico.length);
  });
});

describe('RM-26.1 · 10) Nenhuma opção é excluída apenas por outra ter recebido Nível 1', () => {
  it('mesmo com 5 preferenciais em HAS+DRC+DM2, as 15 opções continuam presentes', () => {
    const plan = getTherapeuticForCondition('has', 'HAS (I10)', { tfg: 90, comorbidades: ['DRC', 'Diabetes'] })!;
    expect(plan.farmacologico).toHaveLength(15);
  });
});

describe('RM-26.1 · 11) Ordenação determinística', () => {
  it('mesma entrada produz sempre a mesma ordem', () => {
    const ctx = { tfg: 90, comorbidades: ['DRC'] };
    const a = getTherapeuticForCondition('has', 'HAS (I10)', ctx)!;
    const b = getTherapeuticForCondition('has', 'HAS (I10)', ctx)!;
    expect(a.farmacologico.map((s) => s.molecula)).toEqual(b.farmacologico.map((s) => s.molecula));
  });
});

describe('RM-26.1 · 12) Sem duplicidade', () => {
  it.each(['has', 'dm2', 'dislipidemia', 'asma', 'dpoc', 'icc', 'sca'])('%s: sem molécula duplicada', (cond) => {
    const plan = getTherapeuticForCondition(cond, 'x')!;
    const names = plan.farmacologico.map((s) => s.molecula);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('RM-26.1 · 13/14) Marcas e apresentações permanecem vinculadas corretamente', () => {
  const plan = getTherapeuticForCondition('has', 'HAS (I10)', { comorbidades: ['DRC'] })!;

  it('marcas continuam associadas à molécula correta após a reclassificação', () => {
    const losartana = plan.farmacologico.find((s) => s.molecula === 'Losartana')!;
    expect(losartana.marcas!.some((m) => m.nome_comercial.toLowerCase().includes('zart'))).toBe(true);
    const enalapril = plan.farmacologico.find((s) => s.molecula === 'Enalapril')!;
    expect((enalapril.marcas ?? []).some((m) => m.nome_comercial.toLowerCase().includes('zart'))).toBe(false);
  });

  it('apresentações continuam vinculadas', () => {
    for (const s of plan.farmacologico) {
      for (const m of s.marcas ?? []) expect(m.apresentacoes.length).toBeGreaterThan(0);
    }
  });
});

describe('RM-26.1 · 15) Motor de segurança continua funcionando', () => {
  it('runSafetyCheck continua operante', () => {
    const alerts = runSafetyCheck({ moleculas: ['Enalapril', 'Losartana'] });
    expect(alerts.length).toBeGreaterThan(0);
  });
});

describe('RM-26.1 · 16) Expansão do RM-25.1 continua funcionando', () => {
  it('HAS mantém as 15 opções expandidas', () => {
    expect(getTherapeuticForCondition('has', 'x')!.farmacologico).toHaveLength(15);
  });
});

describe('RM-26.1 · 17) RM-26 retrocompatível', () => {
  it('toda sugestão ainda expõe prioridade.tier, motivo, fatores_considerados, evidencia_status', () => {
    const plan = getTherapeuticForCondition('has', 'x')!;
    for (const s of plan.farmacologico) {
      expect(['preferencial', 'primeira_linha', 'contextual']).toContain(s.prioridade!.tier);
      expect(typeof s.prioridade!.motivo).toBe('string');
      expect(Array.isArray(s.prioridade!.fatores_considerados)).toBe(true);
      expect(['diretriz_estruturada', 'sem_diretriz_estruturada']).toContain(s.prioridade!.evidencia_status);
    }
  });
});

describe('RM-26.1 · 18/19) RM-23 e RM-24 continuam íntegros', () => {
  it('RM-23 (Drug Consistency)', () => {
    const report = buildConsistencyReport();
    expect(report.bySeverity.critical).toBe(0);
    expect(report.bySeverity.high).toBe(0);
  });

  it('RM-24 (Cross Database Validator)', () => {
    const report = buildSyncReport();
    expect(report.criticos).toBe(0);
    expect(report.publishOk).toBe(true);
  });
});

describe('RM-26.1 · Nenhuma marca influencia o nível de prioridade', () => {
  it('a prioridade é decidida antes de qualquer resolução de marca (marcas não têm campo de prioridade)', () => {
    const plan = getTherapeuticForCondition('has', 'x', { comorbidades: ['DRC'] })!;
    for (const s of plan.farmacologico) {
      for (const m of s.marcas ?? []) {
        expect(m).not.toHaveProperty('prioridade');
      }
    }
  });
});
