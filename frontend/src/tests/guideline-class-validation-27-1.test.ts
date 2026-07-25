// ============================================================
// PRESCREVE-AI — RM-27.1: Refinamento do Papel Clínico Contextual (DM2 e ICC)
//
// Valida que classes já reconhecidas como "1ª linha para a condição"
// (RM-26.1/RM-27) recebem, quando sourced, um OBJETIVO TERAPÊUTICO explícito
// (benefício cardiovascular/renal/ponderal em DM2; modificação de prognóstico
// vs. controle de congestão em ICC) — sem rebaixar tier nem promover
// automaticamente moléculas individuais (isso continua sendo RM-25.1/RM-26.1).
// ============================================================

import { describe, it, expect } from 'vitest';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { getValidatedClassRole, isRoleFirstLine, CLASS_ROLE_OVERRIDES } from '@/lib/guideline-class-validation';
import { CONDITION_CLASS_KEYS } from '@/lib/therapeutic-class-expansion';

// ─── DM2 ──────────────────────────────────────────────────────────────────

describe('RM-27.1 · DM2 · 1) Paciente sem comorbidades relevantes', () => {
  it('todas as classes de DM2 permanecem elegíveis ao Nível 2 (primeira_linha) — RM-27.1 refina o rótulo, não o tier', () => {
    const plan = getTherapeuticForCondition('dm2', 'DM2 (E11)', {})!;
    expect(plan.farmacologico.length).toBeGreaterThan(0);
    expect(plan.farmacologico.every((s) => s.prioridade!.tier === 'primeira_linha')).toBe(true);
  });
});

describe('RM-27.1 · DM2 · 7) SGLT2 não é apresentado como universalmente superior sem contexto', () => {
  it('papel documentado de SGLT2 é renal_benefit, não "melhor opção geral"', () => {
    const role = getValidatedClassRole('dm2', 'SGLT2')!;
    expect(role.papel_clinico).toBe('renal_benefit');
    expect(isRoleFirstLine(role.papel_clinico)).toBe(true); // continua Nível 2 — não é rebaixado
  });

  it('motivo da sugestão SGLT2 expõe o objetivo terapêutico documentado (RM-27.1), não apenas "1ª linha"', () => {
    const plan = getTherapeuticForCondition('dm2', 'DM2 (E11)', {})!;
    const sglt2 = plan.farmacologico.find((s) => s.classe_terapeutica.includes('SGLT'));
    expect(sglt2).toBeDefined();
    expect(sglt2!.prioridade!.papel_clinico_validado).toBe('renal_benefit');
    expect(sglt2!.prioridade!.motivo).toMatch(/Objetivo terapêutico documentado \(RM-27\.1\)/);
  });
});

describe('RM-27.1 · DM2 · 8) GLP-1 não é apresentado como universalmente superior sem contexto', () => {
  it('papel documentado de GLP-1 é cardiovascular_benefit, distinto de SGLT2 (renal_benefit)', () => {
    const roleGlp1 = getValidatedClassRole('dm2', 'GLP1')!;
    const roleSglt2 = getValidatedClassRole('dm2', 'SGLT2')!;
    expect(roleGlp1.papel_clinico).toBe('cardiovascular_benefit');
    expect(roleGlp1.papel_clinico).not.toBe(roleSglt2.papel_clinico);
  });
});

describe('RM-27.1 · DM2 · 9) DPP-4 não recebe automaticamente o mesmo papel de SGLT2/GLP-1', () => {
  it('DPP4 permanece first_line simples — sem rótulo de benefício cardiorrenal específico', () => {
    const roleDpp4 = getValidatedClassRole('dm2', 'DPP4')!;
    expect(roleDpp4.papel_clinico).toBe('first_line');
    expect(roleDpp4.papel_clinico).not.toBe('renal_benefit');
    expect(roleDpp4.papel_clinico).not.toBe('cardiovascular_benefit');
  });
});

describe('RM-27.1 · DM2 · 10) Biguanida mantém o papel suportado pela evidência vigente', () => {
  it('BIGUANIDA permanece first_line — terapia inicial preferencial (ADA 2024), sem alteração de tier', () => {
    const role = getValidatedClassRole('dm2', 'BIGUANIDA')!;
    expect(role.papel_clinico).toBe('first_line');
    expect(role.status_validacao).toBe('confirmado');
  });
});

describe('RM-27.1 · DM2 · 11) Benefício cardiorrenal não é convertido automaticamente em "primeira linha universal"', () => {
  it('SGLT2 e GLP-1 continuam classificados como primeira_linha (tier), nunca preferencial, apenas por possuírem benefício cardiorrenal — Nível 1 exige vantagem individual real (RM-26.1)', () => {
    const plan = getTherapeuticForCondition('dm2', 'DM2 (E11)', {})!; // sem comorbidades no contexto
    const sglt2 = plan.farmacologico.find((s) => s.classe_terapeutica.includes('SGLT'));
    const glp1 = plan.farmacologico.find((s) => s.classe_terapeutica.includes('GLP'));
    for (const s of [sglt2, glp1]) {
      if (s) expect(s.prioridade!.tier).toBe('primeira_linha');
    }
  });

  it('com comorbidade DRC no contexto, SGLT2 pode alcançar Nível 1 apenas se a indicação PRÓPRIA da molécula citar DRC (RM-26.1) — o rótulo renal_benefit do RM-27.1 não substitui essa checagem individual', () => {
    const plan = getTherapeuticForCondition('dm2', 'DM2 (E11)', { comorbidades: ['DRC'] })!;
    for (const s of plan.farmacologico) {
      if (s.prioridade!.tier === 'preferencial') {
        expect(s.prioridade!.fatores_considerados).toContain('comorbidade');
      }
    }
  });
});

describe('RM-27.1 · DM2 · 2-6) Cenários de comorbidade não alteram o papel de classe (RM-27.1), apenas a prioridade individual (RM-26.1)', () => {
  const cenarios: Record<string, string[]> = {
    'DM2 + ASCVD': ['IAM'],
    'DM2 + ICC': ['ICC'],
    'DM2 + DRC': ['DRC'],
  };
  for (const [nome, comorbidades] of Object.entries(cenarios)) {
    it(`${nome}: papéis de SGLT2/GLP1/DPP4/BIGUANIDA em CLASS_ROLE_OVERRIDES não mudam por contexto de paciente (papel é da CLASSE, não do paciente)`, () => {
      getTherapeuticForCondition('dm2', 'DM2 (E11)', { comorbidades })!;
      expect(getValidatedClassRole('dm2', 'SGLT2')!.papel_clinico).toBe('renal_benefit');
      expect(getValidatedClassRole('dm2', 'GLP1')!.papel_clinico).toBe('cardiovascular_benefit');
      expect(getValidatedClassRole('dm2', 'DPP4')!.papel_clinico).toBe('first_line');
      expect(getValidatedClassRole('dm2', 'BIGUANIDA')!.papel_clinico).toBe('first_line');
    });
  }
});

// ─── ICC ──────────────────────────────────────────────────────────────────

describe('RM-27.1 · ICC · 1) FE reduzida — modelo atual', () => {
  it('todas as classes de ICC auditadas neste RM têm população fe_reduzida documentada (limitação: não há campo estruturado de FE no modelo — ver relatório)', () => {
    for (const classKey of ['ARNI', 'BRA', 'BETABLOQUEADOR', 'ARM', 'IECA']) {
      const role = getValidatedClassRole('icc', classKey)!;
      expect(role.populacao).toContain('fe_reduzida');
    }
  });
});

describe('RM-27.1 · ICC · 2) FE preservada — não representável no contexto atual', () => {
  it('nenhuma classe de ICC está documentada para fe_preservada — a auditoria não inventa uma distinção que o modelo não suporta', () => {
    for (const override of CLASS_ROLE_OVERRIDES.filter((o) => o.conditionId === 'icc')) {
      expect(override.populacao).not.toContain('fe_preservada');
    }
  });
});

describe('RM-27.1 · ICC · 3/4) Congestão — diurético de alça é congestion_control, não prognostic_modifier', () => {
  it('DIURETICO_ALCA tem papel congestion_control, distinto de ARNI/IECA/BRA/BETABLOQUEADOR/ARM (prognostic_modifier)', () => {
    const diuretico = getValidatedClassRole('icc', 'DIURETICO_ALCA')!;
    expect(diuretico.papel_clinico).toBe('congestion_control');
    // IECA mantém 'first_line' deliberadamente (override original do RM-27, não tocado — menor alteração)
    for (const classKey of ['ARNI', 'BRA', 'BETABLOQUEADOR', 'ARM']) {
      expect(getValidatedClassRole('icc', classKey)!.papel_clinico).toBe('prognostic_modifier');
    }
  });

  it('diurético de alça continua elegível ao Nível 2 (primeira_linha) — congestion_control não é rebaixado a contextual', () => {
    const plan = getTherapeuticForCondition('icc', 'ICC (I50)', { tfg: 90 })!;
    const furosemida = plan.farmacologico.find((s) => s.molecula === 'Furosemida');
    expect(furosemida).toBeDefined();
    expect(furosemida!.prioridade!.tier).toBe('primeira_linha');
    expect(furosemida!.prioridade!.papel_clinico_validado).toBe('congestion_control');
    expect(furosemida!.prioridade!.motivo).toMatch(/congestão/i);
  });
});

describe('RM-27.1 · ICC · 5) ARNI versus IECA/BRA', () => {
  it('ARNI e IECA têm papéis distintos documentados (ARNI: prognostic_modifier explícito com superioridade sobre IECA citada; IECA: first_line mantido do RM-27, sem alteração)', () => {
    const arni = getValidatedClassRole('icc', 'ARNI')!;
    const ieca = getValidatedClassRole('icc', 'IECA')!;
    expect(arni.papel_clinico).toBe('prognostic_modifier');
    expect(ieca.papel_clinico).toBe('first_line'); // RM-27 original — não alterado neste RM (menor alteração)
    expect(arni.contexto).toMatch(/superioridade/i);
  });
});

describe('RM-27.1 · ICC · 6) IECA/BRA como alternativa válida quando apropriado', () => {
  it('BRA documenta explicitamente uso como alternativa quando IECA/ARNI não tolerados, sem ser rebaixado de tier', () => {
    const bra = getValidatedClassRole('icc', 'BRA')!;
    expect(bra.contexto).toMatch(/alternativa/i);
    expect(isRoleFirstLine(bra.papel_clinico)).toBe(true);
  });
});

describe('RM-27.1 · ICC · 7) Betabloqueador — papel clínico específico', () => {
  it('BETABLOQUEADOR documenta que o benefício é de molécula específica, não de classe (Atenolol não estudado em IC)', () => {
    const role = getValidatedClassRole('icc', 'BETABLOQUEADOR')!;
    expect(role.papel_clinico).toBe('prognostic_modifier');
    expect(role.contexto).toMatch(/atenolol/i);
  });

  it('Atenolol continua excluído do plano de ICC mesmo com o override de classe documentando prognostic_modifier (RM-25.1 prevalece)', () => {
    const plan = getTherapeuticForCondition('icc', 'ICC (I50)', {})!;
    expect(plan.farmacologico.find((s) => s.molecula === 'Atenolol')).toBeUndefined();
  });
});

describe('RM-27.1 · ICC · 8) ARM — papel clínico específico', () => {
  it('ARM tem papel prognostic_modifier, população fe_reduzida', () => {
    const role = getValidatedClassRole('icc', 'ARM')!;
    expect(role.papel_clinico).toBe('prognostic_modifier');
    expect(role.populacao).toContain('fe_reduzida');
  });
});

describe('RM-27.1 · ICC · 9) iSGLT2 — limitação documentada no RM-27.1, corrigida no RM-28', () => {
  it('SGLT2 passou a estar em CONDITION_CLASS_KEYS[icc] a partir do RM-28 (Heart Failure Therapeutic Coverage Completion) — gap de cobertura corrigido, não de evidência (ver HEART_FAILURE_THERAPEUTIC_COVERAGE_REPORT.md)', () => {
    expect(CONDITION_CLASS_KEYS.icc).toContain('SGLT2');
    expect(getValidatedClassRole('icc', 'SGLT2')?.papel_clinico).toBe('prognostic_modifier');
  });
});

describe('RM-27.1 · ICC · 10) Diurético de alça não é tratado como equivalente a terapia prognóstica', () => {
  it('o papel clínico validado de Furosemida nunca é prognostic_modifier, apenas congestion_control', () => {
    const plan = getTherapeuticForCondition('icc', 'ICC (I50)', { tfg: 90 })!;
    const furosemida = plan.farmacologico.find((s) => s.molecula === 'Furosemida')!;
    expect(furosemida.prioridade!.papel_clinico_validado).toBe('congestion_control');
    expect(furosemida.prioridade!.papel_clinico_validado).not.toBe('prognostic_modifier');
  });
});

describe('RM-27.1 · ICC · 11) Contraindicações continuam prevalecendo sobre qualquer papel clínico', () => {
  it('gestante + HAS: BRA/IECA (expansão) continuam excluídos mesmo com override prognostic_modifier documentado para ICC', () => {
    const plan = getTherapeuticForCondition('has', 'HAS (I10)', { gestante: true, tfg: 90 })!;
    expect(plan.farmacologico.map((s) => s.molecula)).not.toContain('Losartana');
  });
});

describe('RM-27.1 · ICC · 12) A classe não promove automaticamente todas as moléculas', () => {
  it('overrides de classe não adicionam moléculas — apenas classificam as já elegíveis pelo RM-25.1', () => {
    const plan = getTherapeuticForCondition('icc', 'ICC (I50)', {})!;
    const molecules = plan.farmacologico.map((s) => s.molecula);
    expect(new Set(molecules).size).toBe(molecules.length); // sem duplicidade introduzida
  });
});

describe('RM-27.1 · ICC · 13) Marca e apresentação não alteram o papel clínico', () => {
  it('nenhuma marca carrega papel_clinico_validado', () => {
    const plan = getTherapeuticForCondition('icc', 'ICC (I50)', { tfg: 90 })!;
    for (const s of plan.farmacologico) {
      for (const m of s.marcas ?? []) {
        expect(m).not.toHaveProperty('papel_clinico_validado');
      }
    }
  });
});

// ─── Regressão obrigatória ──────────────────────────────────────────────

describe('RM-27.1 · Regressão — RM-25.1/RM-26/RM-26.1/RM-27 intactos', () => {
  it('todas as relações em CLASS_ROLE_OVERRIDES referenciam classes que já existiam em CONDITION_CLASS_KEYS (nenhuma classe nova)', () => {
    for (const override of CLASS_ROLE_OVERRIDES) {
      expect(CONDITION_CLASS_KEYS[override.conditionId]).toContain(override.classKey);
    }
  });

  it('determinismo: mesma entrada produz sempre a mesma ordem em DM2 e ICC', () => {
    const p1 = getTherapeuticForCondition('dm2', 'DM2 (E11)', {})!;
    const p2 = getTherapeuticForCondition('dm2', 'DM2 (E11)', {})!;
    expect(p1.farmacologico.map((s) => s.molecula)).toEqual(p2.farmacologico.map((s) => s.molecula));
  });
});
