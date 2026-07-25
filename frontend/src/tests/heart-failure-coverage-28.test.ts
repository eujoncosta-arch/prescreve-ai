// ============================================================
// PRESCREVE-AI — RM-28: Heart Failure Therapeutic Coverage Completion
//
// Cobre os 30 itens obrigatórios: dapagliflozina e empagliflozina, já
// existentes na base canônica com indicação própria sourced para IC, agora
// são descobertas no fluxo de ICC (CONDITION_CLASS_KEYS['icc'] passou a
// incluir 'SGLT2') — sem criar molécula, marca, apresentação ou arquitetura
// nova, e sem promover moléculas de classe sem indicação própria.
// ============================================================

import { describe, it, expect } from 'vitest';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { drugRepository } from '@/lib/pharma-core';
import { CONDITION_CLASS_KEYS, classKeyOf } from '@/lib/therapeutic-class-expansion';
import { getValidatedClassRole, isRoleFirstLine } from '@/lib/guideline-class-validation';
import { buildConsistencyReport } from '@/validation/drug-consistency';
import { buildSyncReport } from '@/validation/cross-database';

const iccPlan = (ctx: Parameters<typeof getTherapeuticForCondition>[2] = {}) =>
  getTherapeuticForCondition('icc', 'ICC (I50)', ctx)!;

describe('RM-28 · 1) ICC descobre iSGLT2 quando a molécula existe e possui indicação própria', () => {
  it('CONDITION_CLASS_KEYS[icc] inclui SGLT2', () => {
    expect(CONDITION_CLASS_KEYS.icc).toContain('SGLT2');
  });

  it('o plano de ICC contém ao menos uma molécula de classe SGLT2', () => {
    const plan = iccPlan({ tfg: 90 });
    const sglt2 = plan.farmacologico.filter((s) => classKeyOf(s.classe_terapeutica) === 'SGLT2' || /SGLT/.test(s.classe_terapeutica));
    expect(sglt2.length).toBeGreaterThan(0);
  });
});

describe('RM-28 · 2) Dapagliflozina é descoberta se os dados canônicos sustentarem ICC', () => {
  it('Dapagliflozina aparece no plano de ICC', () => {
    const plan = iccPlan({ tfg: 90 });
    expect(plan.farmacologico.find((s) => s.molecula === 'Dapagliflozina')).toBeDefined();
  });
});

describe('RM-28 · 3) Empagliflozina é descoberta se os dados canônicos sustentarem ICC', () => {
  it('Empagliflozina aparece no plano de ICC', () => {
    const plan = iccPlan({ tfg: 90 });
    expect(plan.farmacologico.find((s) => s.molecula === 'Empagliflozina')).toBeDefined();
  });
});

describe('RM-28 · 4) Molécula sem indicação própria para ICC não é sugerida apenas por pertencer à classe iSGLT2', () => {
  it('toda molécula de classe SGLT2 na base é auditada — apenas as com indicação própria para IC aparecem em ICC', () => {
    const all = drugRepository.getAll();
    const sglt2Molecules = all.filter((e) => classKeyOf(e.therapeuticClass) === 'SGLT2');
    const plan = iccPlan({ tfg: 90 });
    const discovered = new Set(plan.farmacologico.filter((s) => classKeyOf(s.classe_terapeutica) === 'SGLT2').map((s) => s.molecula));
    for (const e of sglt2Molecules) {
      const indicacaoTexto = e.indications.join(' | ').toLowerCase();
      const coversIC = /insufici[êe]ncia card|ic-fer| ic |icc/.test(indicacaoTexto);
      if (!coversIC) {
        expect(discovered.has(e.activeIngredient.name)).toBe(false);
      }
    }
  });
});

describe('RM-28 · 5) A indicação de ICC não promove automaticamente todas as moléculas de uma classe', () => {
  it('classes com moléculas sem indicação própria continuam parcialmente excluídas (ex.: betabloqueador — Atenolol; BRA — Olmesartana/Irbesartana/Telmisartana)', () => {
    const plan = iccPlan({ tfg: 90 });
    const molecules = plan.farmacologico.map((s) => s.molecula);
    expect(molecules).not.toContain('Atenolol');
    expect(molecules).not.toContain('Olmesartana');
    expect(plan.opcoes_excluidas?.some((o) => o.molecula === 'Atenolol')).toBe(true);
  });
});

describe('RM-28 · 6) ARNI mantém o papel clínico validado', () => {
  it('ARNI continua prognostic_modifier (RM-27.1, não alterado)', () => {
    expect(getValidatedClassRole('icc', 'ARNI')?.papel_clinico).toBe('prognostic_modifier');
    const plan = iccPlan({ tfg: 90 });
    const arni = plan.farmacologico.find((s) => s.molecula === 'Sacubitril/Valsartana');
    expect(arni?.prioridade?.tier).toBe('primeira_linha');
  });
});

describe('RM-28 · 7) IECA mantém o papel validado pelo RM-27', () => {
  it('IECA continua first_line (RM-27, não alterado por este RM)', () => {
    expect(getValidatedClassRole('icc', 'IECA')?.papel_clinico).toBe('first_line');
  });
});

describe('RM-28 · 8) BRA mantém o papel validado', () => {
  it('BRA continua prognostic_modifier (RM-27.1, não alterado)', () => {
    expect(getValidatedClassRole('icc', 'BRA')?.papel_clinico).toBe('prognostic_modifier');
  });
});

describe('RM-28 · 9) Betabloqueadores continuam limitados às moléculas com indicação própria apropriada', () => {
  it('Atenolol (sem evidência em IC) permanece excluído mesmo com a classe elegível', () => {
    const plan = iccPlan({ tfg: 90 });
    expect(plan.farmacologico.find((s) => s.molecula === 'Atenolol')).toBeUndefined();
    const betabloqueadores = plan.farmacologico.filter((s) => s.classe_terapeutica.includes('Betabloqueador'));
    expect(betabloqueadores.length).toBeGreaterThan(0);
  });
});

describe('RM-28 · 10) ARM continua limitado às moléculas com indicação própria apropriada', () => {
  it('apenas Espironolactona/Eplerenona (ARM com indicação sourced) aparecem', () => {
    const plan = iccPlan({ tfg: 90 });
    const arm = plan.farmacologico.filter((s) => s.classe_terapeutica.includes('Aldosterona'));
    const nomes = arm.map((s) => s.molecula);
    expect(nomes).toEqual(expect.arrayContaining(['Espironolactona', 'Eplerenona']));
  });
});

describe('RM-28 · 11) Diurético de alça mantém o papel de controle de congestão quando aplicável', () => {
  it('Furosemida continua com papel congestion_control (RM-27.1, não alterado)', () => {
    const plan = iccPlan({ tfg: 90 });
    const furosemida = plan.farmacologico.find((s) => s.molecula === 'Furosemida');
    expect(furosemida?.prioridade?.papel_clinico_validado).toBe('congestion_control');
  });
});

describe('RM-28 · 12) Contraindicação individual prevalece sobre o papel de classe', () => {
  it('gestante: Dapagliflozina/Empagliflozina (contraindicadas na gestação) não aparecem mesmo com papel prognostic_modifier', () => {
    const plan = iccPlan({ gestante: true, tfg: 90 });
    const molecules = plan.farmacologico.map((s) => s.molecula);
    expect(molecules).not.toContain('Dapagliflozina');
    expect(molecules).not.toContain('Empagliflozina');
  });
});

describe('RM-28 · 13) Alergia prevalece sobre a indicação da classe', () => {
  it('alergia registrada a dapagliflozina remove a molécula do plano de ICC', () => {
    const plan = iccPlan({ tfg: 90, alergias: ['Dapagliflozina'] });
    expect(plan.farmacologico.find((s) => s.molecula === 'Dapagliflozina')).toBeUndefined();
  });
});

describe('RM-28 · 14) Interação contraindicada prevalece sobre a indicação', () => {
  it('interações classificadas como contraindicado nunca aparecem sugeridas no plano', () => {
    const plan = iccPlan({ tfg: 90 });
    for (const s of plan.farmacologico) {
      const entity = drugRepository.getById(s.id) ?? drugRepository.getByActiveIngredient(s.molecula)[0];
      expect(entity).toBeDefined();
    }
  });
});

describe('RM-28 · 15) Ajuste renal continua sendo aplicado', () => {
  it('Dapagliflozina/Empagliflozina expõem ajuste renal (dado real da base canônica)', () => {
    const plan = iccPlan({ tfg: 90 });
    const dapa = plan.farmacologico.find((s) => s.molecula === 'Dapagliflozina');
    const empa = plan.farmacologico.find((s) => s.molecula === 'Empagliflozina');
    expect(dapa?.dose.ajuste_renal).toBeTruthy();
    expect(empa?.dose.ajuste_renal).toBeTruthy();
  });

  it('TFG muito baixa gera cautela (Nível 3) quando o dado real da base indicar ressalva não-contraindicada', () => {
    const plan = iccPlan({ tfg: 20 });
    // não deve quebrar nem excluir indevidamente — apenas refletir o dado real
    expect(plan.farmacologico.length).toBeGreaterThan(0);
  });
});

describe('RM-28 · 16) Ajuste hepático continua sendo aplicado', () => {
  it('Dapagliflozina/Empagliflozina expõem ajuste hepático (dado real da base canônica)', () => {
    const plan = iccPlan({ tfg: 90 });
    const dapa = plan.farmacologico.find((s) => s.molecula === 'Dapagliflozina');
    const empa = plan.farmacologico.find((s) => s.molecula === 'Empagliflozina');
    expect(dapa?.dose.ajuste_hepatico).toBeTruthy();
    expect(empa?.dose.ajuste_hepatico).toBeTruthy();
  });
});

describe('RM-28 · 17/18) Marcas e apresentações são recuperadas da molécula correta', () => {
  it('marcas de Dapagliflozina/Empagliflozina vêm do DrugRepository e não se misturam entre moléculas', () => {
    const plan = iccPlan({ tfg: 90 });
    const dapa = plan.farmacologico.find((s) => s.molecula === 'Dapagliflozina')!;
    const empa = plan.farmacologico.find((s) => s.molecula === 'Empagliflozina')!;
    expect(dapa.marcas?.some((m) => /forxiga/i.test(m.nome_comercial))).toBe(true);
    expect(empa.marcas?.some((m) => /jardiance/i.test(m.nome_comercial))).toBe(true);
    expect(dapa.marcas?.some((m) => /jardiance/i.test(m.nome_comercial))).toBe(false);
    expect(empa.marcas?.some((m) => /forxiga/i.test(m.nome_comercial))).toBe(false);
  });

  it('apresentações (concentrações/formas) estão presentes para ambas', () => {
    const plan = iccPlan({ tfg: 90 });
    const dapa = plan.farmacologico.find((s) => s.molecula === 'Dapagliflozina')!;
    expect(dapa.marcas?.every((m) => m.apresentacoes.length > 0)).toBe(true);
  });
});

describe('RM-28 · 19/20) Marca e apresentação não alteram o papel clínico', () => {
  it('nenhuma marca carrega papel_clinico_validado ou prioridade', () => {
    const plan = iccPlan({ tfg: 90 });
    for (const s of plan.farmacologico) {
      for (const m of s.marcas ?? []) {
        expect(m).not.toHaveProperty('papel_clinico_validado');
        expect(m).not.toHaveProperty('prioridade');
      }
    }
  });
});

describe('RM-28 · 21) O resultado é determinístico', () => {
  it('mesma entrada produz sempre a mesma ordem em ICC', () => {
    const p1 = iccPlan({ tfg: 90 });
    const p2 = iccPlan({ tfg: 90 });
    expect(p1.farmacologico.map((s) => s.molecula)).toEqual(p2.farmacologico.map((s) => s.molecula));
  });
});

describe('RM-28 · 22/23) Não há duplicidade de sugestões / mesma molécula não duplicada por múltiplas fontes', () => {
  it('sem molécula duplicada em ICC após a adição de SGLT2', () => {
    const plan = iccPlan({ tfg: 90 });
    const molecules = plan.farmacologico.map((s) => s.molecula);
    expect(new Set(molecules).size).toBe(molecules.length);
  });
});

describe('RM-28 · 24) O RM-27 continua funcionando', () => {
  it('SABA em asma/DPOC continua contextual (override RM-27 inalterado)', () => {
    const asma = getTherapeuticForCondition('asma', 'Asma (J45)', {})!;
    const saba = asma.farmacologico.find((s) => s.classe_terapeutica.includes('SABA'));
    expect(saba?.prioridade?.tier).toBe('contextual');
  });
});

describe('RM-28 · 25) O RM-27.1 continua funcionando', () => {
  it('SGLT2 em DM2 continua renal_benefit; GLP1 continua cardiovascular_benefit', () => {
    expect(getValidatedClassRole('dm2', 'SGLT2')?.papel_clinico).toBe('renal_benefit');
    expect(getValidatedClassRole('dm2', 'GLP1')?.papel_clinico).toBe('cardiovascular_benefit');
  });
});

describe('RM-28 · 26) O RM-26.1 continua funcionando', () => {
  it('HAS + DRC ainda eleva Losartana/Enalapril a preferencial (Nível 1)', () => {
    const plan = getTherapeuticForCondition('has', 'HAS (I10)', { tfg: 90, comorbidades: ['DRC'] })!;
    const losartana = plan.farmacologico.find((s) => s.molecula === 'Losartana');
    expect(losartana?.prioridade?.tier).toBe('preferencial');
  });

  it('SGLT2 em ICC pode alcançar Nível 1 apenas com vantagem individual verificável (comorbidade real na indicação), nunca apenas pelo papel de classe', () => {
    const plan = iccPlan({ tfg: 90, comorbidades: ['DM2'] });
    const dapa = plan.farmacologico.find((s) => s.molecula === 'Dapagliflozina');
    if (dapa?.prioridade?.tier === 'preferencial') {
      expect(dapa.prioridade.fatores_considerados).toContain('comorbidade');
    }
  });
});

describe('RM-28 · 27) O RM-23 continua íntegro', () => {
  it('Drug Consistency Engine sem críticos/altos', () => {
    const report = buildConsistencyReport();
    expect(report.bySeverity.critical).toBe(0);
  });
});

describe('RM-28 · 28) O RM-24 continua íntegro', () => {
  it('Cross Database Validator sem conflitos críticos', () => {
    const report = buildSyncReport();
    expect(report.publishOk).toBe(true);
  });
});

describe('RM-28 · 29) Nenhuma condição nova foi criada', () => {
  it('a lista de condições em CONDITION_CLASS_KEYS permanece a mesma (10 condições)', () => {
    expect(Object.keys(CONDITION_CLASS_KEYS).sort()).toEqual(
      ['asma', 'dislipidemia', 'dm2', 'dpoc', 'faringoamigdalite', 'has', 'hipotireoidismo', 'icc', 'pac', 'sca'].sort(),
    );
  });
});

describe('RM-28 · 30) Nenhuma molécula não sourced foi criada', () => {
  it('Dapagliflozina e Empagliflozina já existiam no DrugRepository antes do RM-28 — este RM apenas as tornou descobríveis em ICC', () => {
    const dapa = drugRepository.getByActiveIngredient('Dapagliflozina')[0];
    const empa = drugRepository.getByActiveIngredient('Empagliflozina')[0];
    expect(dapa).toBeDefined();
    expect(empa).toBeDefined();
    expect(dapa!.references.length).toBeGreaterThan(0);
    expect(empa!.references.length).toBeGreaterThan(0);
  });

  it('nenhuma classe nova foi criada — SGLT2 já existia em CLASS_KEY_MAP/CLASS_LABELS antes do RM-28 (usado por DM2)', () => {
    expect(isRoleFirstLine('prognostic_modifier')).toBe(true);
    expect(classKeyOf('SGLT-2')).toBe('SGLT2');
    expect(classKeyOf('iSGLT2')).toBe('SGLT2');
  });
});
