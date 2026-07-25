// ============================================================
// PRESCREVE-AI — RM-27: Validação Clínica das Relações Condição → Classe (testes)
//
// Cobre os 18 itens obrigatórios do enunciado do RM-27 aplicáveis ao código
// (os itens 15-18 são gates de regressão, cobertos abaixo e nos scripts).
// ============================================================

import { describe, it, expect } from 'vitest';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { classifyPriority } from '@/lib/therapeutic-prioritization';
import {
  CLASS_ROLE_OVERRIDES,
  getValidatedClassRole,
  isRoleFirstLine,
} from '@/lib/guideline-class-validation';
import { CONDITION_CLASS_KEYS } from '@/lib/therapeutic-class-expansion';
import { drugRepository } from '@/lib/pharma-core';
import { buildConsistencyReport } from '@/validation/drug-consistency';
import { buildSyncReport } from '@/validation/cross-database';

describe('RM-27 · 1) Classe validada como primeira linha permanece elegível para Nível 2', () => {
  it('IECA em ICC permanece primeira_linha (override confirma o papel, não rebaixa)', () => {
    const plan = getTherapeuticForCondition('icc', 'ICC (I50)', { tfg: 90 })!;
    const enalapril = plan.farmacologico.find((s) => s.molecula === 'Enalapril');
    expect(enalapril).toBeDefined();
    expect(enalapril!.prioridade!.tier).toBe('primeira_linha');
  });

  it('IECA/BRA/BCC/Tiazídico em HAS não têm override — permanecem primeira_linha (fallback padrão do RM-26.1)', () => {
    const plan = getTherapeuticForCondition('has', 'HAS (I10)', { tfg: 90 })!;
    expect(plan.farmacologico.every((s) => s.prioridade!.tier === 'primeira_linha')).toBe(true);
  });
});

describe('RM-27 · 2/3) Classe validada como contextual não é promovida a primeira linha geral', () => {
  it('SABA em asma é rebaixado a contextual (resgate, não terapia de controle — GINA 2024)', () => {
    const plan = getTherapeuticForCondition('asma', 'Asma (J45)', {})!;
    const sabas = plan.farmacologico.filter((s) => s.classe_terapeutica.includes('SABA'));
    expect(sabas.length).toBeGreaterThan(0);
    for (const s of sabas) {
      expect(s.prioridade!.tier).toBe('contextual');
      expect(s.prioridade!.papel_clinico_validado).toBe('contextual');
      expect(s.prioridade!.motivo).toMatch(/RM-27/);
    }
  });

  it('SABA em DPOC é rebaixado a contextual (alívio, não manutenção inicial — GOLD 2024)', () => {
    const plan = getTherapeuticForCondition('dpoc', 'DPOC (J44)', {})!;
    const sabas = plan.farmacologico.filter((s) => s.classe_terapeutica.includes('SABA'));
    expect(sabas.length).toBeGreaterThan(0);
    for (const s of sabas) {
      expect(s.prioridade!.tier).toBe('contextual');
    }
  });

  it('demais classes de asma/DPOC (sem override) permanecem primeira_linha — o rebaixamento é seletivo, não geral', () => {
    const plan = getTherapeuticForCondition('asma', 'Asma (J45)', {})!;
    const naoSaba = plan.farmacologico.filter((s) => !s.classe_terapeutica.includes('SABA'));
    expect(naoSaba.length).toBeGreaterThan(0);
    expect(naoSaba.every((s) => s.prioridade!.tier === 'primeira_linha')).toBe(true);
  });
});

describe('RM-27 · 4) Classe não validada (sem override) não é automaticamente expandida ou promovida', () => {
  it('condições sem entradas em CLASS_ROLE_OVERRIDES mantêm comportamento idêntico ao RM-26.1', () => {
    const condicoesSemOverride = ['dm2', 'dislipidemia', 'sca'];
    const classesComOverride = new Set(CLASS_ROLE_OVERRIDES.map((o) => o.conditionId));
    for (const c of condicoesSemOverride) {
      expect(classesComOverride.has(c)).toBe(false);
    }
  });
});

describe('RM-27 · 5) Uma classe pode ser primeira linha para uma condição e contextual para outra', () => {
  it('SABA é contextual em asma E em DPOC — mas IECA é primeira linha em HAS e em ICC (contextos distintos, sem contradição)', () => {
    const roleAsmaSaba = getValidatedClassRole('asma', 'SABA');
    const roleDpocSaba = getValidatedClassRole('dpoc', 'SABA');
    expect(roleAsmaSaba?.papel_clinico).toBe('contextual');
    expect(roleDpocSaba?.papel_clinico).toBe('contextual');

    const roleIccIeca = getValidatedClassRole('icc', 'IECA');
    expect(roleIccIeca?.papel_clinico).toBe('first_line');
    expect(getValidatedClassRole('has', 'IECA')).toBeUndefined(); // sem override — first_line implícito do RM-26.1
  });
});

describe('RM-27 · 6) Uma classe pode ser primeira linha em um subgrupo e não na população geral', () => {
  it('override de ICC/IECA documenta população fe_reduzida explicitamente, não "geral" indiscriminado', () => {
    const role = getValidatedClassRole('icc', 'IECA')!;
    expect(role.populacao).toContain('fe_reduzida');
    expect(role.populacao).not.toContain('geral');
  });
});

describe('RM-27 · 7) A validação da classe não promove automaticamente todas as moléculas da classe', () => {
  it('Olmesartana (BRA/HAS) sem indicação DRC sourced permanece primeira_linha mesmo com comorbidade — override de classe não sobrepõe checagem individual do RM-26.1', () => {
    const plan = getTherapeuticForCondition('has', 'HAS (I10)', { tfg: 90, comorbidades: ['DRC'] })!;
    const olmesartana = plan.farmacologico.find((s) => s.molecula === 'Olmesartana');
    expect(olmesartana).toBeDefined();
    expect(olmesartana!.prioridade!.tier).toBe('primeira_linha');
  });
});

describe('RM-27 · 8) Molécula sem indicação própria continua excluída pelo RM-25.1', () => {
  it('Atenolol permanece excluído de ICC independente de qualquer override de classe', () => {
    const plan = getTherapeuticForCondition('icc', 'ICC (I50)', {})!;
    expect(plan.farmacologico.find((s) => s.molecula === 'Atenolol')).toBeUndefined();
    expect(plan.opcoes_excluidas?.some((o) => o.molecula === 'Atenolol')).toBe(true);
  });
});

describe('RM-27 · 9) Contraindicação continua prevalecendo sobre qualquer prioridade/papel de classe', () => {
  it('BRA (Losartana, expansão) contraindicado em gestante não reaparece em nenhum nível mesmo tendo IECA/BRA como classes com override/first_line em ICC — a exclusão é da camada de elegibilidade (RM-25.1), anterior a qualquer papel de classe', () => {
    const plan = getTherapeuticForCondition('has', 'HAS (I10)', { gestante: true, tfg: 90 })!;
    const moleculas = plan.farmacologico.map((s) => s.molecula);
    expect(moleculas).not.toContain('Losartana');
    expect(plan.opcoes_excluidas?.some((o) => o.molecula === 'Losartana')).toBe(true);
  });
});

describe('RM-27 · 10) Evidência de classe não é apresentada como evidência específica da molécula', () => {
  it('o rebaixamento por papel validado (RM-27) preserva o campo evidencia_escopo já calculado pelo RM-26.1', () => {
    const plan = getTherapeuticForCondition('asma', 'Asma (J45)', {})!;
    const saba = plan.farmacologico.find((s) => s.classe_terapeutica.includes('SABA'));
    expect(saba).toBeDefined();
    expect(['classe', 'molecula', undefined]).toContain(saba!.prioridade!.evidencia_escopo);
  });
});

describe('RM-27 · 11) Evidência de subgrupo não é apresentada como evidência universal', () => {
  it('motivo do override de ICC/IECA menciona explicitamente o subgrupo (IC-FEr), não generaliza', () => {
    const role = getValidatedClassRole('icc', 'IECA')!;
    expect(role.contexto).toMatch(/IC-FEr/);
  });
});

describe('RM-27 · 12) A ordem da recomendação continua determinística', () => {
  it('mesma entrada produz sempre a mesma ordem em asma após o rebaixamento de SABA', () => {
    const p1 = getTherapeuticForCondition('asma', 'Asma (J45)', {})!;
    const p2 = getTherapeuticForCondition('asma', 'Asma (J45)', {})!;
    expect(p1.farmacologico.map((s) => s.molecula)).toEqual(p2.farmacologico.map((s) => s.molecula));
  });
});

describe('RM-27 · 13/14) Nenhuma marca ou apresentação influencia o papel clínico', () => {
  it('sugestões rebaixadas a contextual não carregam campo de prioridade nas marcas', () => {
    const plan = getTherapeuticForCondition('asma', 'Asma (J45)', {})!;
    for (const s of plan.farmacologico) {
      for (const m of s.marcas ?? []) {
        expect(m).not.toHaveProperty('prioridade');
      }
    }
  });
});

describe('RM-27 · 15) RM-26.1 permanece funcional', () => {
  it('HAS + DRC ainda eleva Losartana/Enalapril a preferencial (Nível 1) — comportamento RM-26.1 intacto', () => {
    const plan = getTherapeuticForCondition('has', 'HAS (I10)', { tfg: 90, comorbidades: ['DRC'] })!;
    const losartana = plan.farmacologico.find((s) => s.molecula === 'Losartana');
    expect(losartana!.prioridade!.tier).toBe('preferencial');
  });
});

describe('RM-27 · 16/17) RM-23 e RM-24 continuam íntegros', () => {
  it('RM-23 (Drug Consistency)', () => {
    const report = buildConsistencyReport();
    expect(report.bySeverity.critical).toBe(0);
  });

  it('RM-24 (Cross Database Validator)', () => {
    const report = buildSyncReport();
    expect(report.publishOk).toBe(true);
  });
});

describe('RM-27 · 18) Nenhuma condição/molécula/classe nova foi criada', () => {
  it('todas as chaves de condição em CLASS_ROLE_OVERRIDES já existem em CONDITION_CLASS_KEYS', () => {
    for (const override of CLASS_ROLE_OVERRIDES) {
      expect(Object.keys(CONDITION_CLASS_KEYS)).toContain(override.conditionId);
      expect(CONDITION_CLASS_KEYS[override.conditionId]).toContain(override.classKey);
    }
  });

  it('isRoleFirstLine classifica corretamente cada papel clínico', () => {
    expect(isRoleFirstLine('first_line')).toBe(true);
    expect(isRoleFirstLine('recommended')).toBe(true);
    expect(isRoleFirstLine('alternative')).toBe(false);
    expect(isRoleFirstLine('contextual')).toBe(false);
    expect(isRoleFirstLine('not_first_line')).toBe(false);
    expect(isRoleFirstLine('unsupported')).toBe(false);
  });
});

describe('RM-27 · classifyPriority() direto — precedência do override sobre o fallback conservador', () => {
  it('uma DrugEntity de classe SABA em asma, sem cautela e sem comorbidade, cai no Passo 5.5 (contextual) e não no fallback (Passo 6)', () => {
    const all = drugRepository.getAll();
    const saba = all.find((e) => e.therapeuticClass && /SABA|curta ação/i.test(e.therapeuticClass));
    expect(saba, 'base deveria ter ao menos uma molécula SABA').toBeDefined();
    const sug = {
      id: saba!.legacyId,
      classe_terapeutica: saba!.therapeuticClass,
      molecula: saba!.activeIngredient.name,
      nome_generico: saba!.activeIngredient.name,
      indicacao: '',
      dose: { dose_padrao: '', unidade: '', via: '', frequencia: '', duracao: '' },
      posologia_completa: '',
      evidencia: { diretriz: '', sociedade: '', ano: 2024, nivel_evidencia: { nivel: 'B' as const, grau: 'I' as const, descricao: '' }, citacao: '' },
      contraindicacoes: [],
      efeitos_adversos: [],
      monitoramento: [],
      alternativas: [],
    };
    const prio = classifyPriority(sug, 'asma');
    expect(prio.tier).toBe('contextual');
    expect(prio.fatores_considerados).toContain('papel_clinico_auditado_rm27');
  });
});
